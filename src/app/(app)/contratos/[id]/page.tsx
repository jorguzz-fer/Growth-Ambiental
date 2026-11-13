import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import { dateBR } from "@/lib/utils";
import { despesasCandidatas, detalheDoContrato, planejamentoDosProjetos } from "@/lib/contratos-queries";
import { opcoesDoFormulario } from "@/lib/contratos-opcoes";
import { aditivoEficaz, contratoEmExecucao, contratoEmPreparo, hojeMDY, ROTULO_TIPO_CONTRATO, ROTULO_VINCULO, statusDoAditivoEditavel, type TipoContrato, type VinculoValor } from "@/lib/contrato-regras";
import { Kpi, Secao, StatusBadge, brl } from "@/components/app/contratos/visual";
import { ContratoForm } from "@/components/app/contratos/contrato-form";
import {
  AcoesDeSituacao,
  AditivosPainel,
  ApropriarDespesas,
  CronogramaPainel,
  DocumentosPainel,
  FaturamentoPainel,
  ItensPainel,
  MedicoesPainel,
  ProjetosEditor,
  ReembolsosPainel,
} from "@/components/app/contratos/abas";

export const dynamic = "force-dynamic";

const ABAS = [
  ["visao", "Visão geral"],
  ["escopo", "Escopo e itens"],
  ["projetos", "Projetos"],
  ["aditivos", "Aditivos"],
  ["medicoes", "Medições"],
  ["financeiro", "Faturamento e recebimentos"],
  ["resultado", "Custos e resultados"],
  ["documentos", "Documentos"],
  ["historico", "Histórico"],
] as const;
type Aba = (typeof ABAS)[number][0];
const FINANCEIRAS: readonly Aba[] = ["financeiro", "resultado"];

const ACAO: Record<string, string> = {
  "contrato.create": "Contrato criado",
  "contrato.update": "Cadastro alterado",
  "contrato.status": "Situação alterada",
  "contrato.projetos": "Projetos alterados",
  "contrato.item.create": "Item incluído",
  "contrato.item.update": "Item alterado",
  "contrato.item.cancel": "Item cancelado",
  "contrato.aditivo.create": "Aditivo registrado",
  "contrato.aditivo.update": "Aditivo alterado",
  "contrato.aditivo.status": "Situação do aditivo",
  "contrato.marco.create": "Marco incluído",
  "contrato.marco.update": "Marco alterado",
  "contrato.medicao.create": "Medição lançada",
  "contrato.medicao.update": "Medição alterada",
  "contrato.medicao.status": "Situação da medição",
  "contrato.fatura.create": "Fatura registrada",
  "contrato.reembolso.create": "Despesa reembolsável",
  "contrato.reembolso.status": "Situação do reembolso",
  "contrato.reembolso.cancel": "Reembolso cancelado",
  "contrato.doc.upload": "Documento anexado",
  "contrato.custo.apropriar": "Custo apropriado",
};

/** Resumo legível do `meta` da auditoria (sem dado pessoal; os campos são do contrato). */
function resumo(action: string, meta: unknown): string {
  const m = (meta ?? {}) as Record<string, unknown>;
  const partes: string[] = [];
  if (typeof m.de === "string" && typeof m.para === "string") partes.push(`${m.de} → ${m.para}`);
  if (m.motivo) partes.push(`motivo: ${m.motivo}`);
  if (m.valorOriginal != null && action === "contrato.create") partes.push(`valor ${brl(m.valorOriginal as number)}`);
  if (m.valor != null && action !== "contrato.create") partes.push(`valor ${brl(m.valor as number)}`);
  if (m.valorDelta != null) partes.push(`variação ${brl(m.valorDelta as string)}`);
  if (m.mudou && typeof m.mudou === "object") partes.push(`campos: ${Object.keys(m.mudou as object).join(", ")}`);
  if (m.codigo && action.startsWith("contrato.item")) partes.push(`item ${m.codigo}`);
  if (m.aditivo) partes.push(String(m.aditivo));
  if (m.filename) partes.push(String(m.filename));
  if (m.justificativa) partes.push(`justificativa: ${m.justificativa}`);
  return partes.join(" · ");
}

export default async function ContratoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string; editar?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contratos", "ver")) return <AccessDenied />;
  const { id } = await params;
  const sp = await searchParams;
  const hoje = hojeMDY();
  const d = await detalheDoContrato(ctx.tenant.id, id, hoje);
  if (!d) notFound();
  const veFinanceiro = can(ctx.perms, "contratosfinanceiro", "ver");
  const abas = ABAS.filter(([k]) => veFinanceiro || !FINANCEIRAS.includes(k));
  const aba: Aba = (abas.find(([k]) => k === sp.aba)?.[0] ?? "visao") as Aba;
  const c = d.contrato;
  const s = d.saldo;
  const podeEditar = can(ctx.perms, "contratos", "editar");
  const emExecucao = contratoEmExecucao(c.status);
  const r2 = isR2Configured();
  const projetosDoContrato = d.projetos.map((p) => ({ id: p.projectId, nome: p.nome }));

  if (sp.editar && podeEditar) {
    const opcoes = await opcoesDoFormulario(ctx);
    const inicial = Object.fromEntries(
      Object.entries(c).map(([k, v]) => [k, v == null ? "" : typeof v === "number" ? String(v) : v instanceof Date ? v.toISOString() : v]),
    ) as Record<string, string>;
    return (
      <>
        <PageHeader eyebrow={`Contratos · ${c.codigo}`} title={`Editar ${c.titulo}`} />
        <div className="max-w-[1100px]">
          <ContratoForm opcoes={opcoes} inicial={{ ...inicial, id: c.id, versao: c.versao }} podeEditarValor={contratoEmPreparo(c.status)} />
        </div>
      </>
    );
  }

  const candidatas = veFinanceiro && (aba === "resultado" || aba === "financeiro") ? await despesasCandidatas(ctx.tenant.id, c.id) : [];
  const planejamento = veFinanceiro && aba === "resultado" && can(ctx.perms, "dre", "ver") ? await planejamentoDosProjetos(ctx.tenant.id, d.projetos) : null;
  const docs =
    aba === "documentos"
      ? await Promise.all(
          d.documentos.map(async (doc) => ({
            id: doc.id,
            filename: doc.filename,
            tipo: doc.tipo,
            versao: doc.versao,
            uploadedBy: doc.uploadedBy,
            uploadedAt: doc.uploadedAt.toISOString(),
            url: r2 ? await readUrl(doc.storageKey).catch(() => null) : null,
            aditivo: doc.contratoAditivoId ? d.aditivos.find((a) => a.id === doc.contratoAditivoId)?.codigo ?? null : null,
          })),
        )
      : [];
  const evolucaoPorAditivo = new Map(d.evolucao.map((e, i) => [e.aditivoId, { antes: i > 0 ? d.evolucao[i - 1].acumulado : null, depois: e.acumulado }]));

  return (
    <>
      <PageHeader
        eyebrow={`Contratos · ${c.codigo}${c.numeroCliente ? ` · nº cliente ${c.numeroCliente}` : ""}`}
        title={c.titulo}
        subtitle={[d.cliente?.nome, d.modalidade?.nome, ROTULO_TIPO_CONTRATO[c.tipo as TipoContrato], d.principal ? `de ${d.principal.codigo}` : null].filter(Boolean).join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} tipo="contrato" />
            {podeEditar && c.status !== "cancelado" && c.status !== "encerrado" && (
              <Link href={`/contratos/${c.id}?editar=1`} className="rounded-[8px] border border-[var(--color-accent2)]/20 px-3 py-1.5 text-[12.5px] hover:bg-[var(--color-surface3)]">
                Editar cadastro
              </Link>
            )}
          </div>
        }
      />
      <CrisDaTela
        titulo={`Contrato ${c.codigo} — ${c.titulo}`}
        dados={{
          codigo: c.codigo,
          situacao: c.status,
          cliente: d.cliente?.nome ?? null,
          inicio: c.dataInicio,
          termino: s.terminoAtualizado,
          valorOriginal: s.original,
          valorAtualizado: s.atualizado,
          aditivosPendentesDeEficacia: s.aditivosPendentes,
          medidoAprovado: s.medidoAprovado,
          saldoAMedir: s.saldoAMedir,
          ...(veFinanceiro ? { faturado: s.faturado, recebido: s.recebido, medidoNaoFaturado: s.medidoNaoFaturado, faturadoNaoRecebido: s.faturadoNaoRecebido, custoRealizado: d.resultado.custoRealizado } : {}),
          itens: d.itens.map((i) => ({ codigo: i.codigo, descricao: i.descricao, limite: i.limite, medido: i.medido, saldo: i.saldo })),
          aditivos: d.aditivos.map((a) => ({ codigo: a.codigo, situacao: a.status, variacao: Number(a.valorDelta), novoTermino: a.novoTermino })),
          regrasReembolso: c.regrasReembolso,
          condicaoPagamento: c.condicaoPagamento,
        }}
        sugestoes={["Resuma a situação deste contrato", "Quanto ainda posso medir em cada item?", "Quais aditivos ainda não têm efeito?", "O que falta faturar e receber?"]}
      />
      {c.motivoStatus && (c.status === "suspenso" || c.status === "cancelado" || c.status === "encerrado") && (
        <p className="mb-3 rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface2)] px-3 py-2 text-[12.5px]">Motivo da situação: {c.motivoStatus}</p>
      )}

      <nav className="mb-5 flex flex-wrap gap-1 border-b border-[var(--color-line)] print:hidden" aria-label="Abas do contrato">
        {abas.map(([k, rot]) => (
          <Link
            key={k}
            href={`/contratos/${c.id}?aba=${k}`}
            aria-current={aba === k ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] ${aba === k ? "border-[var(--color-brand-segmento)] font-semibold text-[var(--color-ink)]" : "border-transparent text-[var(--color-ink3)] hover:text-[var(--color-ink)]"}`}
          >
            {rot}
            {k === "aditivos" && d.aditivos.length ? ` (${d.aditivos.length})` : ""}
            {k === "medicoes" && d.medicoes.length ? ` (${d.medicoes.length})` : ""}
          </Link>
        ))}
      </nav>

      {aba === "visao" && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi rotulo="Valor original" valor={brl(s.original)} />
            <Kpi rotulo="Valor atualizado" valor={brl(s.atualizado)} detalhe={`+${brl(s.acrescimos)} / −${brl(s.reducoes)} em aditivos eficazes`} />
            <Kpi rotulo="Medido aprovado" valor={brl(s.medidoAprovado)} detalhe={`${s.pctMedido.toLocaleString("pt-BR")}% do contrato · ${brl(s.medidoEmAprovacao)} em aprovação`} />
            <Kpi rotulo="Saldo a medir" valor={brl(s.saldoAMedir)} tom={s.saldoAMedir < 0 ? "perigo" : undefined} />
            {veFinanceiro && (
              <>
                <Kpi rotulo="Faturado" valor={brl(s.faturado)} detalhe={s.retido ? `retenção estimada ${brl(s.retido)}` : undefined} />
                <Kpi rotulo="Recebido" valor={brl(s.recebido)} />
                <Kpi rotulo="Medido não faturado" valor={brl(s.medidoNaoFaturado)} tom={s.medidoNaoFaturado < 0 ? "alerta" : undefined} detalhe={s.medidoNaoFaturado < 0 ? "faturamento à frente da medição" : undefined} />
                <Kpi rotulo="Faturado não recebido" valor={brl(s.faturadoNaoRecebido)} />
              </>
            )}
          </div>
          {s.aditivosPendentes > 0 && (
            <p className="mb-4 rounded-[10px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] text-[#92400e]">
              {s.aditivosPendentes} aditivo(s) aprovado(s) ou com vigência futura somam {brl(s.pendente)} e ainda não contam no valor nem no limite de medição.
            </p>
          )}
          {(d.derivados.length > 0 || d.consolidado) && (
            <Secao titulo="Contrato guarda-chuva" descricao="Derivados que consomem o limite já estão dentro do valor do principal; só o valor adicional soma.">
              <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi rotulo="Comprometido em derivados/OS" valor={brl(s.comprometido)} />
                <Kpi rotulo="Saldo não comprometido" valor={brl(s.saldoNaoComprometido)} tom={s.saldoNaoComprometido < 0 ? "perigo" : undefined} />
                {d.consolidado && <Kpi rotulo="Total consolidado" valor={brl(d.consolidado.valorTotal)} detalhe={`medido ${brl(d.consolidado.medido)}`} />}
                {d.consolidado && <Kpi rotulo="Saldo consolidado a medir" valor={brl(d.consolidado.saldoAMedir)} />}
              </div>
              <table className="w-full text-[12.5px]">
                <tbody>
                  {d.derivados.map((x) => (
                    <tr key={x.id} className="border-t border-[var(--color-line)]">
                      <td className="py-1.5 pr-2">
                        <Link href={`/contratos/${x.id}`} className="text-[var(--color-accent)] hover:underline">
                          {x.codigo}
                        </Link>{" "}
                        {x.titulo}
                      </td>
                      <td className="py-1.5 pr-2">{ROTULO_TIPO_CONTRATO[x.tipo as TipoContrato]}</td>
                      <td className="py-1.5 pr-2">{x.vinculo ? ROTULO_VINCULO[x.vinculo as VinculoValor] : ""}</td>
                      <td className="py-1.5 pr-2 text-right font-[family-name:var(--font-mono)]">{brl(x.saldo.atualizado)}</td>
                      <td className="py-1.5 pr-2 text-right font-[family-name:var(--font-mono)]">medido {brl(x.saldo.medidoAprovado)}</td>
                      <td className="py-1.5">
                        <StatusBadge status={x.status} tipo="contrato" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Secao>
          )}
          <Secao titulo="Dados do contrato" acao={<AcoesDeSituacao id={c.id} status={c.status} podeEditar={podeEditar} />}>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Objeto", c.objeto],
                ["Escopo", c.escopo],
                ["Gestor", c.gestor],
                ["Coordenador técnico", c.coordenadorTecnico],
                ["Responsável comercial", c.responsavelComercial],
                ["Responsável financeiro", c.responsavelFinanceiro],
                ["Assinatura", dateBR(c.dataAssinatura)],
                ["Início", dateBR(c.dataInicio)],
                ["Término previsto (original)", dateBR(c.dataTerminoPrevista)],
                ["Término atualizado", dateBR(s.terminoAtualizado)],
                ["Encerramento efetivo", dateBR(c.dataEncerramento)],
                ["Data-base de reajuste", dateBR(c.dataBaseReajuste)],
                ["Índice de reajuste", c.indiceReajuste],
                ["Forma de faturamento", c.formaFaturamento],
                ["Condição de pagamento", c.condicaoPagamento],
                ["Prazo de pagamento", c.prazoPagamentoDias != null ? `${c.prazoPagamentoDias} dias` : null],
                ["Periodicidade de medição", c.periodicidadeMedicao],
                ["Retenção", c.retencaoPct ? `${Number(c.retencaoPct).toLocaleString("pt-BR")}%` : null],
                ["Regras de reembolso", c.regrasReembolso],
                ["Moeda", c.moeda],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">{k}</dt>
                  <dd className="text-[var(--color-ink)]">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </Secao>
          <Secao titulo="Evolução do valor" descricao="O valor original nunca é reescrito: cada aditivo assinado entra como variação.">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1">Evento</th>
                  <th className="py-1 text-right">Variação</th>
                  <th className="py-1 text-right">Valor acumulado</th>
                  <th className="py-1">Término</th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {d.evolucao.map((e) => (
                  <tr key={e.evento} className="border-t border-[var(--color-line)]">
                    <td className="py-1.5">{e.evento}</td>
                    <td className="py-1.5 text-right font-[family-name:var(--font-mono)]">{brl(e.variacao)}</td>
                    <td className="py-1.5 text-right font-[family-name:var(--font-mono)]">{brl(e.acumulado)}</td>
                    <td className="py-1.5">{dateBR(e.termino)}</td>
                    <td className="py-1.5 text-[11px] text-[#b45309]">{e.eficaz ? "" : "vigência futura: ainda sem efeito"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Secao>
        </>
      )}

      {aba === "escopo" && (
        <>
          <Secao titulo="Itens contratuais" descricao="Cada item tem o seu critério de medição. O valor vigente inclui as variações dos aditivos eficazes.">
            <ItensPainel
              contratoId={c.id}
              itens={d.itens.map((i) => ({ ...i, quantidade: String(i.quantidade), valorUnitario: String(i.valorUnitario), valorTotal: String(i.valorTotal) }))}
              projetos={projetosDoContrato}
              emPreparo={contratoEmPreparo(c.status)}
              podeEditar={podeEditar}
              aditivosEditaveis={d.aditivos.filter((a) => statusDoAditivoEditavel(a.status)).map((a) => ({ id: a.id, codigo: a.codigo }))}
            />
          </Secao>
          <Secao titulo="Cronograma físico-financeiro" descricao="Etapas e marcos com valor previsto; o medido vem das medições aprovadas ligadas ao marco.">
            <CronogramaPainel
              contratoId={c.id}
              marcos={d.marcos.map((m) => ({ ...m, valorPrevisto: String(m.valorPrevisto) }))}
              itens={d.itens.map((i) => ({ id: i.id, codigo: i.codigo }))}
              valorContrato={s.atualizado}
              podeEditar={podeEditar}
              faturadoTotal={veFinanceiro ? s.faturado : 0}
            />
          </Secao>
        </>
      )}

      {aba === "projetos" && (
        <Secao titulo="Projetos vinculados" descricao={`Um contrato pode atender vários projetos, e um projeto pode ter vários contratos. Alocado: ${brl(s.alocadoProjetos)} de ${brl(s.atualizado)}.`}>
          <ProjetosEditor contratoId={c.id} atuais={d.projetos.map((p) => ({ projectId: p.projectId, nome: p.nome, valorAlocado: p.valorAlocado }))} opcoes={ctx.projects.map((p) => ({ id: p.id, nome: p.name }))} podeEditar={podeEditar} />
        </Secao>
      )}

      {aba === "aditivos" && (
        <Secao titulo="Aditivos" descricao="Aditivo só muda valor, prazo e limites quando é assinado e a vigência começa. Formalizado não se edita nem se apaga.">
          <AditivosPainel
            contratoId={c.id}
            aditivos={d.aditivos.map((a) => ({
              ...a,
              tipos: a.tipos ?? [],
              valorDelta: String(a.valorDelta),
              eficaz: aditivoEficaz(a, hoje),
              valorAnterior: evolucaoPorAditivo.get(a.id)?.antes ?? null,
              valorDepois: evolucaoPorAditivo.get(a.id)?.depois ?? null,
            }))}
            itens={d.itens.filter((i) => !i.cancelado).map((i) => ({ id: i.id, codigo: i.codigo, descricao: i.descricao }))}
            podeRegistrar={can(ctx.perms, "contratosaditivos", "criar")}
            podeAprovar={can(ctx.perms, "contratosaprovar", "editar")}
            contratoAceita={emExecucao || c.status === "suspenso"}
          />
        </Secao>
      )}

      {aba === "medicoes" && (
        <Secao titulo="Medições" descricao={`Aprovado ${brl(s.medidoAprovado)} · em aprovação ${brl(s.medidoEmAprovacao)} · saldo a medir ${brl(s.saldoAMedir)}. A aprovação confere o limite do item e do contrato.`}>
          <MedicoesPainel
            contratoId={c.id}
            medicoes={d.medicoes.map((m) => ({ ...m, valor: String(m.valor), quantidade: m.quantidade == null ? null : String(m.quantidade), percentual: m.percentual == null ? null : String(m.percentual) }))}
            itens={d.itens.map((i) => ({ id: i.id, codigo: i.codigo, descricao: i.descricao, criterioMedicao: i.criterioMedicao, limite: i.limite, saldo: i.saldo, vigente: i.vigente }))}
            projetos={projetosDoContrato}
            marcos={d.marcos.filter((m) => !m.cancelado).map((m) => ({ id: m.id, etapa: m.etapa }))}
            podeLancar={can(ctx.perms, "contratosmedicao", "criar")}
            podeAprovar={can(ctx.perms, "contratosaprovar", "editar")}
            contratoAceita={emExecucao}
          />
        </Secao>
      )}

      {aba === "financeiro" && veFinanceiro && (
        <>
          <Secao titulo="Faturamento e recebimentos" descricao={`Faturado ${brl(s.faturado)} · recebido ${brl(s.recebido)} · a receber ${brl(s.faturadoNaoRecebido)}`}>
            <FaturamentoPainel contratoId={c.id} faturas={d.faturas} projetos={projetosDoContrato} podeFaturar={can(ctx.perms, "contratosfinanceiro", "criar") && can(ctx.perms, "contasreceber", "criar")} contratoAceita={emExecucao || c.status === "encerrado"} sugestao={Math.max(0, s.medidoNaoFaturado)} />
          </Secao>
          <Secao titulo="Despesas reembolsáveis" descricao="A despesa é a mesma lançada em Despesas (valor, fornecedor, categoria e comprovante vêm dela). Não confundir com Ressarcimentos (a empresa devolvendo a terceiros).">
            <ReembolsosPainel contratoId={c.id} reembolsos={d.reembolsos.map((r) => ({ ...r, valorSolicitado: String(r.valorSolicitado), valorAprovado: r.valorAprovado == null ? null : String(r.valorAprovado), despesa: r.despesa ? { ...r.despesa, valor: String(r.despesa.valor) } : null }))} candidatas={candidatas.map((x) => ({ ...x, valor: String(x.valor) }))} faturas={d.faturas} podeEditar={can(ctx.perms, "contratosfinanceiro", "editar")} />
            <p className="mt-2 text-[12px]">
              <Link href={`/contratos/reembolsos?contrato=${c.id}`} className="text-[var(--color-accent)] hover:underline">
                Relatório de reembolsos deste contrato (PDF e XLSX) →
              </Link>
            </p>
          </Secao>
        </>
      )}

      {aba === "resultado" && veFinanceiro && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi rotulo="Medido aprovado" valor={brl(s.medidoAprovado)} />
            <Kpi rotulo="Faturado" valor={brl(s.faturado)} />
            <Kpi rotulo="Custo apropriado" valor={brl(d.resultado.custoRealizado)} />
            <Kpi rotulo="Margem sobre o medido" valor={brl(d.resultado.margemSobreMedido)} tom={d.resultado.margemSobreMedido < 0 ? "perigo" : "ok"} detalhe={s.medidoAprovado > 0 ? `${((d.resultado.margemSobreMedido / s.medidoAprovado) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · gerencial, não é DRE` : "gerencial, não é DRE"} />
          </div>
          <Secao titulo="Custos apropriados ao contrato" descricao="Despesas lançadas nos projetos do contrato e apropriadas a ele. Apropriar não muda valor, conta, categoria nem a DRE do projeto.">
            <ApropriarDespesas contratoId={c.id} candidatas={candidatas.map((x) => ({ ...x, valor: String(x.valor) }))} apropriadas={d.despesas.map((x) => ({ ...x, valor: String(x.valor), contratoId: c.id }))} podeEditar={can(ctx.perms, "contratosfinanceiro", "editar")} />
          </Secao>
          {planejamento && (
            <Secao titulo="Orçamento × Previsão × Realizado dos projetos do contrato" descricao="Por projeto, pelo mesmo cálculo da DRE (receita e custos operacionais). O projeto pode ter outros contratos: os números são do projeto inteiro.">
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
                      <th className="py-1 pr-2">Projeto</th>
                      <th className="py-1 pr-2">Versão</th>
                      <th className="py-1 pr-2 text-right">Receita</th>
                      <th className="py-1 pr-2 text-right">Custos</th>
                      <th className="py-1 pr-2 text-right">Margem</th>
                      <th className="py-1 text-right">Desvio do custo × orçamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planejamento.flatMap((p) =>
                      ([["Orçamento", p.orcamento], ["Previsão", p.previsao], ["Realizado", p.realizado]] as const).map(([rot, v], i) => (
                        <tr key={p.projectId + rot} className={i === 0 ? "border-t border-[var(--color-line)]" : ""}>
                          <td className="py-1 pr-2">{i === 0 ? p.nome : ""}</td>
                          <td className="py-1 pr-2">{rot}</td>
                          <td className="py-1 pr-2 text-right font-[family-name:var(--font-mono)]">{v ? brl(v.receita) : "—"}</td>
                          <td className="py-1 pr-2 text-right font-[family-name:var(--font-mono)]">{v ? brl(v.custos) : "—"}</td>
                          <td className={`py-1 pr-2 text-right font-[family-name:var(--font-mono)] ${v && v.margem < 0 ? "text-[var(--color-danger)]" : ""}`}>{v ? brl(v.margem) : "—"}</td>
                          <td className="py-1 text-right font-[family-name:var(--font-mono)]">{rot !== "Orçamento" && v && p.orcamento ? brl(v.custos - p.orcamento.custos) : ""}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </Secao>
          )}
          <p className="text-[12px] text-[var(--color-ink3)]">
            Orçamento, Previsão e DRE continuam por projeto (Planejamento e Business Intelligence). Ver{" "}
            {d.projetos.map((p, i) => (
              <span key={p.projectId}>
                {i > 0 ? ", " : ""}
                <Link href={`/dre?proj=${p.projectId}`} className="text-[var(--color-accent)] hover:underline">
                  DRE de {p.nome}
                </Link>
              </span>
            ))}
            .
          </p>
        </>
      )}

      {aba === "documentos" && (
        <Secao titulo="Documentos" descricao="Contrato assinado, propostas, plano de trabalho, aditivos, ordens de serviço, termos de aceite e correspondências. Cada tipo guarda as versões.">
          <DocumentosPainel contratoId={c.id} documentos={docs} aditivos={d.aditivos.map((a) => ({ id: a.id, codigo: a.codigo }))} podeEditar={podeEditar} r2={r2} />
        </Secao>
      )}

      {aba === "historico" && (
        <Secao titulo="Histórico" descricao="Toda alteração do contrato, dos itens, aditivos, medições, faturas e reembolsos, com quem e quando.">
          <ol className="space-y-2 text-[12.5px]">
            {d.historico.length === 0 && <li className="text-[var(--color-ink3)]">Sem registros.</li>}
            {d.historico.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-3 border-b border-[var(--color-line)] pb-1.5">
                <span className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{h.createdAt.toLocaleString("pt-BR")}</span>
                <span className="font-medium text-[var(--color-ink)]">{ACAO[h.action] ?? h.action}</span>
                <span className="text-[var(--color-ink2)]">{resumo(h.action, h.meta)}</span>
                <span className="text-[var(--color-ink3)]">{h.nome ?? h.email ?? ((h.meta as { por?: string })?.por || "sistema")}</span>
              </li>
            ))}
          </ol>
        </Secao>
      )}
    </>
  );
}

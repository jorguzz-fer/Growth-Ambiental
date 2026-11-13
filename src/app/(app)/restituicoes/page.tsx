import { getProjectVersions, getTenantContext } from "@/lib/context";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { PedirProjeto } from "@/components/app/pedir-projeto";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto } from "@/components/app/projeto-da-aba";
import { can } from "@/lib/permissions";
import { getBankAccounts, getStakeholders, getUsoDosStakeholders } from "@/lib/queries";
import { opcoesDeSelecao, pagadoresPorTerceiro, PAPEL_PAGADOR_TERCEIRO } from "@/lib/stakeholder-regras";
import { mascararDocumento } from "@/lib/clientes-sensivel";
import { situacaoDosDias } from "@/lib/calc/restituicao";
import { hojeISO } from "@/lib/despesa-status";
import { PagadoresTerceiros } from "@/components/app/pagadores-terceiros";
import Link from "next/link";
import { getCompensacoes, getContaCorrenteTerceiros, getDespesaTerceiros, getPreviaSaidaPorObra, type CompensacaoView, type PreviaSaidaPorObra } from "@/lib/actions/restituicoes";
import { chaveLigada } from "@/lib/chaves-tenant";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { ContaCorrenteTerceiros } from "@/components/app/conta-corrente-terceiros";
import { RestituicaoLote } from "@/components/app/restituicao-lote";
import { getSaldosConsolidadosTerceiros } from "@/lib/actions/recebimento-terceiro";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { RestituicoesManager } from "@/components/app/restituicoes-manager";
import { analisarRessarcimentos } from "@/lib/ressarcimento-analise";
import { AssistenteRessarcimentos } from "@/components/app/assistente-ressarcimentos";

export const dynamic = "force-dynamic";


export default async function RestituicoesPage({
  searchParams,
}: {
  searchParams: Promise<{ proj?: string; project?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "restituicoes", "ver")) return <AccessDenied />;

  // A obra vem da URL desta tela (Prompt A); sem ela, a aba reabre a última
  // escolhida ou a tela pede a escolha — nunca a obra do cookie. A obra decide
  // a lista de lançamentos e onde caem a despesa nova e a saída de caixa; a
  // conta corrente por terceiro continua sendo da empresa inteira.
  const sp = await searchParams;
  const selecao = lerSelecaoDeProjeto(ctx.projects, sp);
  const escolhido =
    selecao.tipo === "projeto" ? await getProjectVersions(ctx.tenant.id, selecao.projeto.id) : null;
  if (!escolhido?.trabalho) {
    return (
      <PedirProjeto
        titulo="Ressarcimentos — pago por terceiro"
        projetos={ctx.projects}
        oQue="ver e registrar os ressarcimentos"
      />
    );
  }
  const { project, trabalho: version } = escolhido;

  const [stakeholders, bancos, lista, contasCorrentes] = await Promise.all([
    getStakeholders(ctx.tenant.id),
    getBankAccounts(ctx.tenant.id),
    // Prompt T, 6 — lista da EMPRESA (mesmo escopo da conta corrente); o filtro
    // por obra é da tela.
    getDespesaTerceiros(ctx.tenant.id),
    // Conta corrente por terceiro (§13) — escopo TENANT: a dívida com um sócio
    // é da empresa e não muda porque o usuário trocou o projeto ativo.
    getContaCorrenteTerceiros(ctx.tenant.id),
  ]);
  // Saldos dos DOIS lados por terceiro — base do encontro de contas (RG-05).
  const saldosConsolidados = await getSaldosConsolidadosTerceiros(ctx.tenant.id);
  // §21 — prévia da chave "saída segue a despesa": só quem administra chaves.
  const podeVerPrevia = can(ctx.perms, "chaves", "ver");
  const [segueDespesa, previa] = await Promise.all([
    chaveLigada(ctx.tenant.id, "restituicao_segue_despesa"),
    podeVerPrevia ? getPreviaSaidaPorObra(ctx.tenant.id) : Promise.resolve([]),
  ]);
  // Prompt T, 8 — a coluna Dias distingue atraso, a vencer, hoje e sem data;
  // 4.5 do Prompt R: hoje vem do servidor.
  const hoje = hojeISO();
  const rows = lista.map((r) => ({
    ...r,
    dias: situacaoDosDias(r.dataPrevistaRestituicao ?? r.dataPagamentoOriginal, hoje),
  }));
  // Prompt T, 1 — pagadores: quem tem o papel, com obrigações e saldo; os
  // candidatos são os cadastros ativos sem o papel.
  const [uso, compensacoes] = await Promise.all([getUsoDosStakeholders(ctx.tenant.id), getCompensacoes(ctx.tenant.id)]);
  const usoPorId = new Map(uso.map((u) => [u.id, u]));
  const saldoPorTerceiro = new Map(contasCorrentes.map((c) => [c.pagadorId, c.saldoDevido]));
  const pagadores = stakeholders
    .filter((s) => (s.papeis ?? []).includes(PAPEL_PAGADOR_TERCEIRO))
    .map((s) => ({ id: s.id, nome: s.nome, docMascarado: mascararDocumento(s.doc), ativo: s.ativo, obrigacoes: usoPorId.get(s.id)?.obrigacoes ?? 0, saldoDevido: saldoPorTerceiro.get(s.id) ?? 0 }));
  const candidatos = stakeholders.filter((s) => s.ativo && !(s.papeis ?? []).includes(PAPEL_PAGADOR_TERCEIRO)).map((s) => ({ id: s.id, nome: s.nome, papeis: s.papeis ?? [] }));
  // Prompt T, 10 — assistente somente leitura, em código puro, sobre o que a
  // página carregou. Recebe só nome, valores e datas: nenhum dado bancário
  // ou PIX entra na análise (12d).
  const analise = analisarRessarcimentos(
    lista.map((r) => ({ id: r.id, numDoc: r.numDoc, pagador: r.pagador, projectName: r.projectName, valorTotal: r.valorTotal, valorRestituido: r.valorRestituido, saldoPendente: r.saldoPendente, dataPagamentoOriginal: r.dataPagamentoOriginal, dataPrevistaRestituicao: r.dataPrevistaRestituicao, status: r.status })),
    saldosConsolidados.map((s) => ({ terceiro: s.terceiro, saldoARestituir: s.saldoARestituir, saldoARepassar: s.saldoARepassar })),
    hoje,
  );

  return (
    <>
      <PageHeader
        eyebrow={`${project.name} · ${version.label}`}
        title="Ressarcimentos — pago por terceiro"
        subtitle="Ressarcir a quem pagou fornecedores pela empresa. A despesa é lançada em Despesas e reconhecida 1× na DRE; a saída de caixa ocorre só no ressarcimento."
        actions={
          <ProjectPicker
            projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
            selected={project.id}
          />
        }
      />
      <LembrarProjeto projectId={project.id} />

      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (Prompt E, 6.2). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {/* Conta corrente por terceiro: saldo devido e o extrato dos movimentos
          que o formam. NÃO é saldo bancário disponível — é obrigação. */}
      <PagadoresTerceiros pagadores={pagadores} candidatos={candidatos} canEditar={can(ctx.perms, "restituicoes", "editar")} />

      <ContaCorrenteTerceiros contas={contasCorrentes} projectId={project.id} podeCancelar={can(ctx.perms, "restituicoes", "excluir")} />

      {/* Item 4.1 — o cliente não restitui item a item: fecha o combo e paga um
          valor único, distribuído entre os PEDs em aberto por FIFO. */}
      <RestituicaoLote
        // Prompt W, 4.2 — só ativos, mantendo quem tem saldo nos dois lados.
        terceiros={opcoesDeSelecao(stakeholders, saldosConsolidados.map((s) => s.terceiroId))}
        bancos={bancos.map((b) => ({ id: b.id, nome: `${b.banco}${b.cc ? " · " + b.cc : ""}` }))}
        saldos={saldosConsolidados}
        canEditar={can(ctx.perms, "restituicoes", "editar")}
        projectId={project.id}
      />

      <RestituicoesManager
        rows={rows}
        // Prompt W, 1.5 — "Quem desembolsou" só oferece quem tem o papel de
        // Pagador por Terceiro (ativo); o beneficiário original, só ativos.
        pagadores={pagadoresPorTerceiro(stakeholders)}
        projetos={ctx.projects.map((p) => ({ id: p.id, nome: p.name }))}
        obraDaTela={project.id}
        bancos={bancos.map((b) => ({ id: b.id, banco: b.banco, tipo: b.tipo }))}
        canCriar={can(ctx.perms, "restituicoes", "criar")}
        projectId={project.id}
        canEditar={can(ctx.perms, "restituicoes", "editar")}
      />
      {/* Prompt T, 7 — a compensação existe, tem número e guarda os saldos de antes; agora é visível. */}
      <Compensacoes linhas={compensacoes} />
      {podeVerPrevia && <PreviaSaidaSegueDespesa linhas={previa} ligada={segueDespesa} obraDaTela={project.name} />}
      </div>
      <AssistenteRessarcimentos usuario={ctx.userEmail ?? "anon"} analise={analise} />
      </div>
    </>
  );
}

/**
 * §21 (B11) — prévia da chave `restituicao_segue_despesa`: em que obra cairão
 * as próximas saídas de restituição. Desligada, tudo cai na obra aberta na
 * tela; ligada, cada saída cai na obra da despesa restituída.
 */
function PreviaSaidaSegueDespesa({ linhas, ligada, obraDaTela }: { linhas: PreviaSaidaPorObra[]; ligada: boolean; obraDaTela: string }) {
  const total = linhas.reduce((a, l) => a + l.saldo, 0);
  return (
    <Card id="previa" className="mt-6">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">
          Prévia da chave “Saída da restituição segue a despesa” — {ligada ? "ligada" : "desligada"}
        </h2>
        <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
          {linhas.length === 0
            ? "Não há obrigação pendente com terceiros. Ligar a chave não muda nenhum número hoje."
            : ligada
              ? `As próximas restituições avulsas (${brl0(total)} pendentes) caem no projeto de cada despesa, como abaixo. Nada já lançado muda.`
              : `Hoje toda saída de restituição cai no projeto aberto na tela (${obraDaTela}). Com a chave ligada, as próximas restituições avulsas (${brl0(total)} pendentes) caem no projeto de cada despesa, como abaixo. Nada já lançado muda; o lote continua no projeto da tela.`}{" "}
          <Link href="/chaves" className="text-[var(--color-accent2)] hover:underline">
            Chaves de mudança
          </Link>
        </p>
        {linhas.length > 0 && (
          <table className="mt-3 w-full max-w-xl border-collapse text-[13px]">
            <thead>
              <tr className="text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                <th className="px-2 py-1">Projeto da despesa</th>
                <th className="px-2 py-1 text-right">Obrigações</th>
                <th className="px-2 py-1 text-right">Saldo a restituir</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.projectId} className="border-t border-[var(--color-accent2)]/8">
                  <td className="px-2 py-1">{l.projectName}</td>
                  <td className="px-2 py-1 text-right font-[family-name:var(--font-mono)]">{l.obrigacoes}</td>
                  <td className="px-2 py-1 text-right font-[family-name:var(--font-mono)]">{brl0(l.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

/** Prompt T, 7 — compensações registradas (encontro de contas), lidas de volta. Só leitura. */
function Compensacoes({ linhas }: { linhas: CompensacaoView[] }) {
  if (linhas.length === 0) return null;
  return (
    <Card className="mt-6">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">Compensações registradas</h2>
        <p className="mt-1 text-[11.5px] text-[var(--color-ink3)]">
          Encontro de contas entre o que a empresa devia ao terceiro e o que ele devia à empresa. Não movimenta caixa; o número vem da sequência de PED.
        </p>
        <Table wrapperClassName="mt-3" className="min-w-[760px]">
          <THead>
            <tr>
              <TH>Documento</TH>
              <TH>Data</TH>
              <TH>Terceiro</TH>
              <TH className="text-right">Valor compensado</TH>
              <TH className="text-right">A ressarcir (antes)</TH>
              <TH className="text-right">A repassar (antes)</TH>
              <TH>Obs.</TH>
            </tr>
          </THead>
          <tbody>
            {linhas.map((k) => (
              <TR key={k.id}>
                <TD className="font-[family-name:var(--font-mono)]">{k.numDoc ?? "—"}</TD>
                <TD className="font-[family-name:var(--font-mono)]">{k.data ? dateBR(k.data) : "—"}</TD>
                <TD>{k.terceiro ?? "—"}</TD>
                <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(k.valor)}</TD>
                <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{brl0(k.saldoRestituirAntes)}</TD>
                <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{brl0(k.saldoRepassarAntes)}</TD>
                <TD className="text-[var(--color-ink3)]">{k.obs ?? "—"}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import type { TenantContext } from "@/lib/context";
import { isContaDaEmpresa, saldoDisponivel } from "@/lib/contas-saldo";
import { cadeiaDeSaldo, diasDesdeAtualizacao } from "@/lib/calc/cadeia-caixa";
import { CadeiaDias } from "@/components/app/cadeia-dias";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { previstoPorDia, saldosProjetados } from "@/lib/calc/previsto-caixa";
import { aReceberDaFaixaDaEmpresa } from "@/lib/recebimento-parcela";
import { SaldosCaixa } from "@/components/app/saldos-caixa";
import { hojeISO as hojeDoServidor } from "@/lib/despesa-status";
import { getBankAccounts, getBaixadoSemConciliar, getConciliacaoData, getContasPagar, getContasReceber, getReceivables, getAutoresDosAjustes } from "@/lib/queries";
import { isPluggyConfigured } from "@/lib/openfinance/pluggy";
import { openFinanceDaEmpresa } from "@/lib/openfinance/situacao";
import { isAiConfigured } from "@/lib/ai/despesa-extract";
import { can } from "@/lib/permissions";
import { brl0, dateInRange } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { Card, CardContent } from "@/components/ui/card";
import { ImportExtratoButton } from "@/components/app/import-extrato";
import { AjustesCaixa, type AjusteLinha } from "@/components/app/ajustes-caixa";
import { cadeiaDaEmpresa } from "@/lib/cadeia-da-empresa";
import { analisarCaixa } from "@/lib/caixa-analise";
import { AssistenteCaixa } from "@/components/app/assistente-caixa";
import { Conciliacao } from "@/components/app/caixa-conciliacao";
import { saldosDosCartoes } from "@/lib/caixa-cartoes";
import { CartaoNaConciliacao } from "@/components/app/cartao-conciliacao";
import { urlDoCaixa, type ParamsDoCaixa } from "@/lib/caixa-url";

/**
 * Prompt AT §4 (Revisão 4) — o Caixa como tela de CONCILIAÇÃO DA EMPRESA,
 * conta a conta. Só com a chave "caixa_conciliacao_por_conta" ligada; com ela
 * desligada, `page.tsx` mostra a tela de antes, sem nenhuma mudança.
 *
 * O LAYOUT FICA (4.0): filtro de período → resumo do dia → saldos por conta →
 * faixa de dias → dias fechados → abas Conciliação e Ajustes → Assistente à
 * direita. O que muda:
 *
 * - 4.1 · sem seletor de obra, sem seletor de versão, sem modo comparação: a
 *   tela lê a versão Atual de todas as obras e os movimentos sem obra;
 * - 4.2 · os cartões entram no bloco de saldos, depois das contas;
 * - 4.3 · cada conta ou cartão filtra a tela (`?conta=`), com "Todas as
 *   contas" para voltar ao consolidado;
 * - 4.4 · importar extrato vem com a conta escolhida e sem obra;
 * - 4.5 · cartão escolhido: a aba Conciliação mostra o extrato da fatura e as
 *   compras lançadas no cartão (§6);
 * - 4.6 · a faixa de dias segue a conta escolhida, ou o consolidado;
 * - 4.7 · `?proj=` e `?vs=` de links antigos são ignorados.
 */
type Tab = "conciliacao" | "ajustes";
const TABS: { key: Tab; label: string }[] = [
  { key: "conciliacao", label: "Conciliação" },
  { key: "ajustes", label: "Ajustes" },
];

export async function CaixaPorConta({ ctx, sp, avisoRemovida, diasFechados }: { ctx: TenantContext; sp: ParamsDoCaixa; avisoRemovida: React.ReactNode; diasFechados: React.ReactNode }) {
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "conciliacao";
  const de = sp.de ?? "";
  const ate = sp.ate ?? "";
  const hoje = hojeDoServidor();
  const aiConfigured = isAiConfigured();

  const [contas, cartoes, empresa, conciliacaoDaEmpresa, baixado, contasPagarDoTenant, contasReceberAbertas, recebiveisDasVendas, of] = await Promise.all([
    getBankAccounts(ctx.tenant.id),
    saldosDosCartoes(ctx.tenant.id, hoje),
    cadeiaDaEmpresa(ctx.tenant.id, { hojeISO: hoje }),
    getConciliacaoData(ctx.tenant.id, {}),
    getBaixadoSemConciliar(ctx.tenant.id),
    getContasPagar(ctx.tenant.id),
    getContasReceber(ctx.tenant.id),
    getReceivables(ctx.tenant.id),
    openFinanceDaEmpresa(ctx.tenant.id),
  ]);
  // 4.3 — a conta (ou o cartão) escolhida; um id que não é da empresa é ignorado.
  const contaSel = contas.find((c) => c.id === sp.conta) ?? null;
  const cartaoSel = contaSel ? null : cartoes.find((k) => k.id === sp.conta) ?? null;
  const filtroId = contaSel?.id ?? cartaoSel?.id ?? "";
  const params: ParamsDoCaixa = { tab, de, ate, conta: filtroId };

  const contaDe = new Map(empresa.cash.map((c) => [c.id, c.bankAccountId]));
  const daConta = <T extends { cashEntryId: string }>(xs: T[]) => (contaSel ? xs.filter((x) => contaDe.get(x.cashEntryId) === contaSel.id) : xs);
  const conciliacaoData = {
    pendentes: daConta(conciliacaoDaEmpresa.pendentes),
    pendentesEntrada: daConta(conciliacaoDaEmpresa.pendentesEntrada),
    conciliados: daConta(conciliacaoDaEmpresa.conciliados),
  };
  // 8.1 — pendências por conta (para o selo de cada linha do bloco de saldos).
  const pendentesPorConta = new Map<string, number>();
  for (const m of [...conciliacaoDaEmpresa.pendentes, ...conciliacaoDaEmpresa.pendentesEntrada]) {
    const k = contaDe.get(m.cashEntryId);
    if (k) pendentesPorConta.set(k, (pendentesPorConta.get(k) ?? 0) + 1);
  }

  const { cadeia: cadeiaEmpresa, fechamentos, movimentos } = empresa;
  const saldoTotal = saldoDisponivel(contas);
  const contasDaEmpresa = contas.filter((c) => isContaDaEmpresa(c));
  const saldosPorConta = contasDaEmpresa.map((c) => {
    const propria = cadeiaDeSaldo({ movimentos: movimentos.filter((m) => m.bankAccountId === c.id), saldoEmContaAtual: Number(c.saldo), fechamentos: [], hojeISO: hoje });
    const atualizadoEm = c.lastSync ? c.lastSync.toISOString() : null;
    return {
      id: c.id,
      nome: `${c.banco}${c.cc ? " · " + c.cc : ""}`,
      emConta: Number(c.saldo),
      conciliado: propria.dias.find((d) => d.dia === hoje)?.conciliado.final ?? Number(c.saldo),
      origem: (c.saldoSource === "auto" ? "auto" : "manual") as "auto" | "manual",
      atualizadoEm,
      diasDesde: diasDesdeAtualizacao(atualizadoEm, hoje),
      conectada: of.porConta.get(c.id)?.situacao === "conectado",
      pendentes: pendentesPorConta.get(c.id) ?? 0,
    };
  });

  // 4.6 — a faixa de dias segue a conta escolhida; sem conta, o consolidado (com os fechamentos da empresa).
  const cadeia = contaSel
    ? cadeiaDeSaldo({ movimentos: movimentos.filter((m) => m.bankAccountId === contaSel.id), saldoEmContaAtual: Number(contaSel.saldo), fechamentos: [], hojeISO: hoje })
    : cadeiaEmpresa;
  const hojeNaCadeia = cadeia.dias.find((d) => d.dia === hoje);
  const movHoje = hojeNaCadeia ?? { entradas: 0, saidas: 0 };
  const saldoHoje = movHoje.entradas - movHoje.saidas;

  const todosAjustes = empresa.cash.filter((c) => c.cat === "ajuste");
  const totalAjustes = { valor: Math.round(todosAjustes.reduce((a, c) => a + Number(c.valor), 0) * 100) / 100, n: todosAjustes.length };
  const baixadoComDias = { ...baixado, dias: baixado.maisAntigoISO ? Math.max(0, Math.round((Date.parse(hoje) - Date.parse(baixado.maisAntigoISO)) / 86_400_000)) : null };
  const abertasTodas = contasPagarDoTenant.filter((c) => c.versionKind === "atual" && c.saldo > 0.005 && c.status !== "Pago" && c.status !== "Cancelada");
  const abertas = contasPagarDoTenant
    .filter((c) => c.versionKind === "atual" && (c.origem ?? "despesa") === "despesa" && !c.parcela && c.saldo > 0.005 && c.status !== "Pago" && c.status !== "Cancelada")
    .map((c) => ({ despesaId: c.despesaId ?? c.id, numDoc: c.numDoc, fornecedor: c.fornecedorNome, saldo: c.saldo, vencimento: c.vencimento }));
  // Prompt AT §5.3: com a chave "parcela_recebida_situacao", pelo saldo e com as vencidas nos atrasados.
  const aReceberEmAberto = await aReceberDaFaixaDaEmpresa(ctx.tenant.id, contasReceberAbertas, recebiveisDasVendas, hoje);
  const { porDia: previstoPorDiaDaFaixa, atrasados } = previstoPorDia(
    cadeia.dias.map((d) => d.dia),
    hoje,
    aReceberEmAberto,
    abertasTodas.map((c) => ({ vencimento: c.vencimento, saldo: c.saldo })),
  );
  // O previsto (a pagar e a receber) é da empresa: só entra na faixa consolidada.
  const previstoDaFaixa = contaSel ? undefined : { porDia: previstoPorDiaDaFaixa, saldo: saldosProjetados(cadeia.dias, hoje, previstoPorDiaDaFaixa), atrasados };
  const analise = analisarCaixa({
    pendentes: conciliacaoData.pendentes,
    abertas,
    cadeia,
    conciliadosSemVinculo: conciliacaoData.conciliados.filter((c) => c.semVinculo).map((c) => ({ data: c.data, valor: c.valor })),
    baixado: baixadoComDias,
    contas: saldosPorConta.filter((c) => !contaSel || c.id === contaSel.id).map((c) => ({ id: c.id, nome: c.nome, diasDesde: c.diasDesde })),
    movimentos: contaSel ? movimentos.filter((m) => m.bankAccountId === contaSel.id) : movimentos,
    descricoes: new Map(empresa.cash.map((c) => [c.id, c.descricao])),
    hojeISO: hoje,
  });

  const cashDaTela = empresa.cash.filter((c) => (!contaSel || c.bankAccountId === contaSel.id) && (!de && !ate ? true : dateInRange(c.data, de, ate)));
  const conciliados = cashDaTela.filter((c) => c.rec).length;
  const nomeDaObra = new Map(ctx.projects.map((p) => [p.id, p.name]));
  const projetos = ctx.projects.map((p) => ({ id: p.id, nome: p.name }));

  const ajustesFiltrados = todosAjustes.filter((c) => (!de && !ate ? true : dateInRange(c.data, de, ate))).filter((c) => !contaSel || c.bankAccountId === contaSel.id);
  const autores = tab === "ajustes" ? await getAutoresDosAjustes(ctx.tenant.id, ajustesFiltrados.map((c) => c.id)) : new Map<string, { autor: string | null; quando: string | null }>();
  const diasDoAjusteMaisAntigo = ajustesFiltrados.reduce((max, c) => {
    const iso = c.data ? `${c.data.slice(6)}-${c.data.slice(0, 2)}-${c.data.slice(3, 5)}` : null;
    const d = iso ? Math.round((Date.parse(hoje) - Date.parse(iso)) / 86_400_000) : 0;
    return Math.max(max, d);
  }, 0);
  const cadeiaLonga = tab === "ajustes" && ajustesFiltrados.length > 0 ? cadeiaDeSaldo({ movimentos, saldoEmContaAtual: saldoTotal, fechamentos, hojeISO: hoje, diasPassados: Math.min(diasDoAjusteMaisAntigo, 3660), diasFuturos: 0 }) : null;
  const ajustesLinhas: AjusteLinha[] = ajustesFiltrados.map((c) => {
    const iso = c.data ? `${c.data.slice(6)}-${c.data.slice(0, 2)}-${c.data.slice(3, 5)}` : null;
    const dia = iso ? cadeiaLonga?.dias.find((d) => d.dia === iso) : undefined;
    const conta = contas.find((k) => k.id === c.bankAccountId);
    return {
      id: c.id,
      data: c.data,
      obra: c.projectId ? nomeDaObra.get(c.projectId) ?? null : "Empresa (sem obra)",
      conta: conta ? `${conta.banco}${conta.cc ? " · " + conta.cc : ""}` : null,
      valor: Number(c.valor),
      motivo: c.descricao,
      autor: autores.get(c.id)?.autor ?? null,
      quando: autores.get(c.id)?.quando ?? null,
      saldoAntes: dia ? Math.round((dia.conciliado.final - dia.ajustes) * 100) / 100 : null,
      saldoDepois: dia ? dia.conciliado.final : null,
    };
  });

  const importar = (
    <ImportExtratoButton contas={contas.map((c) => ({ id: c.id, banco: c.banco, cc: c.cc }))} aiConfigured={aiConfigured} projetos={projetos} contaInicial={contaSel?.id ?? ""} />
  );

  return (
    <>
      <PageHeader title="Conciliação de Caixa" subtitle="Suba o extrato, conecte pelo Open Finance ou concilie com a Cris. Nada é gravado sem a sua confirmação." />
      {avisoRemovida}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <DateRangeFilter de={de} ate={ate} />
        {filtroId && (
          <p className="text-[12.5px] text-[var(--color-ink2)]" data-filtro-conta>
            Mostrando só <strong>{contaSel ? `${contaSel.banco}${contaSel.cc ? " · " + contaSel.cc : ""}` : cartaoSel?.nome}</strong> ·{" "}
            <Link href={urlDoCaixa({ ...params, conta: "" })} className="text-[var(--color-accent2)] hover:underline">
              Todas as contas
            </Link>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">Entradas do dia</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-success)]">{brl0(movHoje.entradas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">Saídas do dia</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">{brl0(movHoje.saidas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">Saldo do dia</p>
                <p className={`mt-1 text-xl font-semibold ${saldoHoje < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-accent)]"}`}>{brl0(saldoHoje)}</p>
              </CardContent>
            </Card>
          </div>

          <SaldosCaixa
            contas={saldosPorConta}
            cartoes={cartoes}
            total={{ emConta: saldoTotal, conciliado: cadeiaEmpresa.dias.find((d) => d.dia === hoje)?.conciliado.final ?? saldoTotal }}
            importar={importar}
            openFinance={{ configurado: isPluggyConfigured(), podeConfigurar: can(ctx.perms, "contas", "editar"), contasConectadas: of.contasConectadas }}
            totalAjustes={totalAjustes}
            baixadoSemConciliar={baixadoComDias}
            filtro={{ selecionada: filtroId, href: (id) => urlDoCaixa({ ...params, conta: id }), todas: urlDoCaixa({ ...params, conta: "" }) }}
          />

          {/* 7.4 — a Cris recebe o resumo da conta escolhida, ou o consolidado. */}
          <CrisDaTela
            titulo="Conciliação de Caixa"
            dados={{
              escopo: contaSel ? `conta ${contaSel.banco}${contaSel.cc ? " · " + contaSel.cc : ""}` : cartaoSel ? `cartão ${cartaoSel.nome}` : "todas as contas da empresa",
              saldoTotalEmConta: saldoTotal,
              contas: saldosPorConta
                .filter((c) => !contaSel || c.id === contaSel.id)
                .map((c) => ({ conta: c.nome, emConta: c.emConta, conciliado: c.conciliado, diasDesdeAtualizacao: c.diasDesde, conectada: c.conectada, aConciliar: c.pendentes })),
              cartoes: cartoes.filter((k) => !cartaoSel || k.id === cartaoSel.id).map((k) => ({ cartao: k.nome, faturaAberta: k.faturaAberta, conciliado: k.conciliado, aConciliar: k.pendentes, ultimoExtrato: k.ultimoExtrato })),
              dias: cadeia.dias.map((d) => ({ dia: d.dia, rotulo: d.rotulo, entradas: d.entradas, saidas: d.saidas, conciliadoFinal: d.conciliado.final, emContaFinal: d.emConta?.final ?? null, diferenca: d.diferenca, fechado: d.fechado, venceReceber: previstoDaFaixa?.porDia[d.dia]?.aReceber ?? null, vencePagar: previstoDaFaixa?.porDia[d.dia]?.aPagar ?? null, saldoProjetado: previstoDaFaixa?.saldo[d.dia] ?? null })),
              atrasados: previstoDaFaixa?.atrasados ?? null,
              pendentesDeConciliar: conciliacaoData.pendentes.length + conciliacaoData.pendentesEntrada.length,
              ajustes: totalAjustes,
            }}
            sugestoes={["Quais pendências conciliar primeiro?", "Por que o conciliado não bate com o extrato?", "Como fica o saldo nos próximos 7 dias?", "Como conecto a conta pelo Open Finance?"]}
          />
          <CadeiaDias cadeia={cadeia} canFechar={!contaSel && can(ctx.perms, "fechamento", "criar")} canReabrir={!contaSel && can(ctx.perms, "conciliacao", "excluir")} previsto={previstoDaFaixa} />

          {diasFechados}

          <div className="mb-5 flex gap-1 rounded-[8px] bg-[var(--color-surface3)] p-1">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={urlDoCaixa({ ...params, tab: t.key })}
                className={`rounded-[6px] px-3 py-1.5 text-xs transition-colors ${t.key === tab ? "bg-white text-[var(--color-ink)] shadow-sm" : "text-[var(--color-ink3)] hover:text-[var(--color-ink)]"}`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {tab === "conciliacao" &&
            (cartaoSel ? (
              <CartaoNaConciliacao tenantId={ctx.tenant.id} cartaoId={cartaoSel.id} hojeISO={hoje} canConciliar={can(ctx.perms, "caixa", "editar")} canLancar={can(ctx.perms, "despesas", "criar")} />
            ) : (
              <Conciliacao
                cash={cashDaTela}
                conciliados={conciliados}
                conciliacaoData={conciliacaoData}
                canDesfazer={can(ctx.perms, "conciliacao", "excluir")}
                projetos={projetos}
                obraDe={(c) => {
                  const projectId = "projectId" in c ? (c as { projectId: string | null }).projectId : null;
                  return projectId ? nomeDaObra.get(projectId) ?? "—" : "sem obra (da conta)";
                }}
              />
            ))}
          {tab === "ajustes" && (
            <AjustesCaixa
              ajustes={ajustesLinhas}
              contas={contas.map((c) => ({ id: c.id, banco: c.banco, cc: c.cc }))}
              contaFiltro={contaSel?.id ?? ""}
              projetos={projetos}
              canAjustar={can(ctx.perms, "conciliacao", "criar")}
              de={de}
              ate={ate}
            />
          )}
        </div>
        <AssistenteCaixa usuario={ctx.userEmail ?? "anon"} projectId="" analise={analise} canConciliar={can(ctx.perms, "caixa", "editar")} />
      </div>
    </>
  );
}

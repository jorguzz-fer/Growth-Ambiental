import Link from "next/link";
import { getProjectVersions, getTenantContext } from "@/lib/context";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto, RecuperarProjeto } from "@/components/app/projeto-da-aba";
import { isContaDaEmpresa, saldoDisponivel } from "@/lib/contas-saldo";
import { cadeiaDeSaldo, diasDesdeAtualizacao } from "@/lib/calc/cadeia-caixa";
import { CadeiaDias } from "@/components/app/cadeia-dias";
import { BalancoDiaTable } from "@/components/app/balanco-dia-table";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { AvisoTelaRemovida } from "@/components/app/aviso-tela-removida";
import { aReceberDaFaixa, previstoPorDia, saldosProjetados } from "@/lib/calc/previsto-caixa";
import { SaldosCaixa } from "@/components/app/saldos-caixa";
import { hojeISO } from "@/lib/despesa-status";
import {
  getBankAccounts,
  getBaixadoSemConciliar,
  getCash,
  getConciliacaoData,
  getContasPagar,
  getContasReceber,
  getReceivables,
  getDailyClosings,
  getAutoresDosAjustes,
} from "@/lib/queries";
import { isPluggyConfigured as pluggyCfg } from "@/lib/openfinance/pluggy";
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
import { VersionMultiSelect } from "@/components/app/version-multiselect";
import {
  VersionCompareTable,
  type CompareRow,
} from "@/components/app/version-compare";
import { resolveCompareVersions } from "@/lib/report-versions";
import { AccessDenied } from "@/components/app/access-denied";
import { Conciliacao } from "@/components/app/caixa-conciliacao";
import { chaveLigada } from "@/lib/chaves-tenant";
import { CaixaPorConta } from "./caixa-por-conta";

/** "dd/mm/aaaa hh:mm" de um fechamento. */
function dataHoraBR(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const dynamic = "force-dynamic";

// Prompt L, 3-A.4 — duas abas: Conciliação (com a tabela de movimentos) e
// Ajustes (o único lançamento desta tela). "Lançamentos" e "Previstas" saíram:
// receita e despesa são lançadas nas telas delas; o previsto está em Contas a
// Pagar e Contas a Receber.
type Tab = "conciliacao" | "ajustes";
const TABS: { key: Tab; label: string }[] = [
  { key: "conciliacao", label: "Conciliação" },
  { key: "ajustes", label: "Ajustes" },
];

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    de?: string;
    ate?: string;
    vs?: string;
    proj?: string;
    project?: string;
    conta?: string;
    saiu?: string;
  }>;
}) {
  // Só a empresa: a obra vem da URL desta tela, nunca de um "projeto ativo"
  // global (Prompt A). Sem obra na URL, a aba reabre a última ou pede a escolha.
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "caixa", "ver")) return <AccessDenied />;

  const sp = await searchParams;
  const aiConfigured = isAiConfigured();
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "conciliacao";
  const de = sp.de ?? "";
  const ate = sp.ate ?? "";

  // Prompt L2/AB2 — o histórico dos dias fechados é da empresa, não da obra:
  // aparece no Caixa com ou sem projeto escolhido (o Balanço do Dia saiu).
  const verDiasFechados = can(ctx.perms, "balancodia", "ver");
  const fechamentosHistorico = (verDiasFechados ? await getDailyClosings(ctx.tenant.id) : []).map((c) => ({
    id: c.id,
    dia: c.dia,
    saldoInicial: Number(c.saldoInicial),
    totalEntradas: Number(c.totalEntradas),
    totalSaidas: Number(c.totalSaidas),
    saldoFinal: Number(c.saldoFinal),
    divergencias: Number(c.divergencias),
    responsavelNome: c.responsavelNome,
    projectName: c.projectName,
    clienteNome: c.clienteNome,
    fechadoEm: dataHoraBR(c.closedAt),
    saldoEmConta: c.saldoEmConta == null ? null : Number(c.saldoEmConta),
    reabertoEm: c.reabertoEm ? dataHoraBR(c.reabertoEm) : null,
    reabertoPor: c.reabertoPor,
    motivoReabertura: c.motivoReabertura,
  }));
  const diasFechados = verDiasFechados ? (
    <details className="mb-6" data-dias-fechados open={sp.saiu === "balancodia" || undefined}>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">Dias fechados ({fechamentosHistorico.length})</summary>
      <div className="mt-3">
        <BalancoDiaTable rows={fechamentosHistorico} />
      </div>
    </details>
  ) : null;
  const avisoRemovida = <AvisoTelaRemovida de={sp.saiu} />;

  // Prompt AT §4 — chave "caixa_conciliacao_por_conta": a conciliação da
  // empresa, conta a conta, sem seletor de obra nem de versão. `?proj=` e
  // `?vs=` de links antigos são ignorados (4.7). Desligada, tudo abaixo segue
  // exatamente como antes.
  if (await chaveLigada(ctx.tenant.id, "caixa_conciliacao_por_conta")) {
    return <CaixaPorConta ctx={ctx} sp={{ tab: sp.tab, de: sp.de, ate: sp.ate, conta: sp.conta }} avisoRemovida={avisoRemovida} diasFechados={diasFechados} />;
  }

  const pickerProjetos = ctx.projects.map((p) => ({ id: p.id, label: p.name }));
  const selecao = lerSelecaoDeProjeto(ctx.projects, sp);
  const escolhido =
    selecao.tipo === "projeto" ? await getProjectVersions(ctx.tenant.id, selecao.projeto.id) : null;
  if (!escolhido || !escolhido.trabalho) {
    return (
      <>
        <PageHeader
          title="Controle de Caixa"
          actions={
            <ProjectPicker projects={pickerProjetos} selected={escolhido?.project.id ?? ""} />
          }
        />
        {avisoRemovida}
        {escolhido ? (
          // Projeto sem nenhuma versão: nada a mostrar, e nada é gravado em
          // versão de outra obra (antes caía na obra do cookie).
          <Card>
            <CardContent className="p-8 text-center text-[var(--color-ink3)]">
              {escolhido.project.name} não possui versões. Crie a versão Atual em Versões.
            </CardContent>
          </Card>
        ) : (
          <RecuperarProjeto idsPermitidos={ctx.projects.map((p) => p.id)}>
            <Card>
              <CardContent className="p-8 text-center text-[var(--color-ink3)]">
                {ctx.projects.length === 0
                  ? "Nenhum projeto cadastrado. Cadastre a obra em Projetos."
                  : "Selecione um projeto para ver e lançar o caixa."}
              </CardContent>
            </Card>
          </RecuperarProjeto>
        )}
        <div className="mt-6">{diasFechados}</div>
      </>
    );
  }
  const { project, versions: versoesDoProjeto, trabalho } = escolhido;
  const projectPicker = <ProjectPicker projects={pickerProjetos} selected={project.id} />;

  // Versões para comparar: só as DESTE projeto (um `vs` com versão de outra
  // obra, que sobrou na URL ao trocar de obra, é descartado).
  const compareVersions = resolveCompareVersions(sp.vs, versoesDoProjeto, trabalho);
  const multi = compareVersions.length > 1;
  const versionSelect = (
    <VersionMultiSelect
      versions={versoesDoProjeto.map((v) => ({ id: v.id, label: v.label, color: v.color }))}
      selected={compareVersions.map((v) => v.id)}
    />
  );

  // ─────────────────────── Modo comparação (2–3 versões) ───────────────────
  if (multi) {
    const perVersion = await Promise.all(
      compareVersions.map(async (v) => {
        const rows = await getCash(v.id);
        const filtered = de || ate ? rows.filter((c) => dateInRange(c.data, de, ate)) : rows;
        let entradas = 0;
        let saidas = 0;
        for (const c of filtered) {
          const val = Number(c.valor);
          if (val >= 0) entradas += val;
          else saidas += -val;
        }
        return { entradas, saidas };
      }),
    );
    const rows: CompareRow[] = [
      { label: "Entradas (caixa)", values: perVersion.map((p) => p.entradas) },
      { label: "(−) Saídas (caixa)", values: perVersion.map((p) => p.saidas) },
      {
        label: "= Saldo líquido do período",
        emphasis: "final",
        values: perVersion.map((p) => p.entradas - p.saidas),
      },
    ];
    return (
      <>
        <PageHeader
          title="Controle de Caixa"
          subtitle="Comparativo de versões · movimentação real de caixa no período"
          actions={projectPicker}
        />
        {avisoRemovida}
        {/* Filtros numa linha própria: no cabeçalho, os três juntos espremiam o título. */}
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <DateRangeFilter de={de} ate={ate} />
          {versionSelect}
        </div>
        <LembrarProjeto projectId={project.id} />
        <VersionCompareTable
          firstColLabel="Indicador"
          columns={compareVersions.map((v) => ({ label: v.label, color: v.color }))}
          rows={rows}
        />
      </>
    );
  }

  // ─────────────────────── Modo detalhado (1 versão) ───────────────────────
  const version = compareVersions[0];
  const [cashAll, contas, conciliacaoData] = await Promise.all([
    getCash(version.id),
    getBankAccounts(ctx.tenant.id),
    getConciliacaoData(ctx.tenant.id, version.id),
  ]);
  // Prompt L, 5.1 — permissão PRÓPRIA de desfazer, distinta de editar o caixa.
  const canDesfazerConc = can(ctx.perms, "conciliacao", "excluir");
  // Filtro de período (item 3): entradas/saídas dentro do intervalo.
  const cash = de || ate ? cashAll.filter((c) => dateInRange(c.data, de, ate)) : cashAll;

  // Exclui contas do tipo "Terceiros" e inativas: não são caixa da empresa.
  const saldoTotal = saldoDisponivel(contas);
  const conciliados = cash.filter((c) => c.rec).length;

  // Prompt L, Parte 1 — a cadeia de saldo: dois saldos por dia (em conta e
  // conciliado), encadeados, partindo do fechamento gravado do dia anterior
  // à janela ou do saldo em conta calculado. A faixa (2 realizados, hoje, 7
  // à frente) é independente do filtro de período da tabela (1.5) — e diz.
  // Parte 9 (9.9): a cadeia é DA EMPRESA — todas as obras, porque o saldo em
  // conta é das contas (do tenant). A tabela abaixo continua por obra.
  const hoje = hojeISO();
  const empresa = await cadeiaDaEmpresa(ctx.tenant.id, { hojeISO: hoje });
  const { cadeia, fechamentos, movimentos } = empresa;
  const hojeNaCadeia = cadeia.dias.find((d) => d.dia === hoje);
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
      conectada: !!c.openFinanceId,
    };
  });

  // Resumo do dia (hoje): entradas, saídas e saldo do dia.
  const movHoje = hojeNaCadeia ?? { entradas: 0, saidas: 0 };
  const saldoHoje = movHoje.entradas - movHoje.saidas;

  // Prompt L, 4.2.4 — ajustes (o único lançamento desta tela), com o total
  // sempre à vista; 6.4 — o baixado sem conciliar, com idade.
  const todosAjustes = empresa.cash.filter((c) => c.cat === "ajuste");
  const totalAjustes = { valor: Math.round(todosAjustes.reduce((a, c) => a + Number(c.valor), 0) * 100) / 100, n: todosAjustes.length };
  const baixado = await getBaixadoSemConciliar(ctx.tenant.id);
  const baixadoComDias = { ...baixado, dias: baixado.maisAntigoISO ? Math.max(0, Math.round((Date.parse(hoje) - Date.parse(baixado.maisAntigoISO)) / 86_400_000)) : null };
  // Parte 8-A — o assistente: puro, sobre o que a página carregou. Propõe; a
  // pessoa confirma (pela mesma conciliarMovimento do revisor). Sem ajuste.
  const contasPagarDoTenant = await getContasPagar(ctx.tenant.id);
  // Prompt L2 — tudo o que vai sair (despesa, parcela e restituição), da Atual.
  const abertasTodas = contasPagarDoTenant.filter((c) => c.versionKind === "atual" && c.saldo > 0.005 && c.status !== "Pago" && c.status !== "Cancelada");
  const abertas = contasPagarDoTenant
    .filter((c) => c.versionKind === "atual" && (c.origem ?? "despesa") === "despesa" && !c.parcela && c.saldo > 0.005 && c.status !== "Pago" && c.status !== "Cancelada")
    .map((c) => ({ despesaId: c.despesaId ?? c.id, numDoc: c.numDoc, fornecedor: c.fornecedorNome, saldo: c.saldo, vencimento: c.vencimento }));
  // Prompt L2 — o que vence na faixa (a pagar em aberto, a receber em aberto)
  // e o saldo projetado. Só a versão Atual entra, como no Contas a Pagar.
  const [contasReceberAbertas, recebiveisDasVendas] = await Promise.all([getContasReceber(ctx.tenant.id), getReceivables(ctx.tenant.id)]);
  // Contas lançadas e parcelas dos planos de venda, sem a permuta (Prompt AT §2.1).
  const aReceberEmAberto = aReceberDaFaixa(contasReceberAbertas, recebiveisDasVendas, hoje);
  const { porDia: previstoPorDiaDaFaixa, atrasados } = previstoPorDia(
    cadeia.dias.map((d) => d.dia),
    hoje,
    aReceberEmAberto,
    abertasTodas.map((c) => ({ vencimento: c.vencimento, saldo: c.saldo })),
  );
  const previstoDaFaixa = { porDia: previstoPorDiaDaFaixa, saldo: saldosProjetados(cadeia.dias, hoje, previstoPorDiaDaFaixa), atrasados };
  const analise = analisarCaixa({
    pendentes: conciliacaoData.pendentes,
    abertas,
    cadeia,
    conciliadosSemVinculo: conciliacaoData.conciliados.filter((c) => c.semVinculo).map((c) => ({ data: c.data, valor: c.valor })),
    baixado: baixadoComDias,
    contas: saldosPorConta.map((c) => ({ id: c.id, nome: c.nome, diasDesde: c.diasDesde })),
    movimentos,
    descricoes: new Map(empresa.cash.map((c) => [c.id, c.descricao])),
    hojeISO: hoje,
  });
  const contaFiltro = sp.conta ?? "";
  const ajustesFiltrados = todosAjustes.filter((c) => (!de && !ate ? true : dateInRange(c.data, de, ate))).filter((c) => !contaFiltro || c.bankAccountId === contaFiltro);
  const autores = tab === "ajustes" ? await getAutoresDosAjustes(ctx.tenant.id, ajustesFiltrados.map((c) => c.id)) : new Map<string, { autor: string | null; quando: string | null }>();
  // Saldo conciliado antes/depois: cadeia estendida até o ajuste mais antigo do filtro.
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
      obra: ctx.projects.find((p) => p.id === c.projectId)?.name ?? null,
      conta: conta ? `${conta.banco}${conta.cc ? " · " + conta.cc : ""}` : null,
      valor: Number(c.valor),
      motivo: c.descricao,
      autor: autores.get(c.id)?.autor ?? null,
      quando: autores.get(c.id)?.quando ?? null,
      saldoAntes: dia ? Math.round((dia.conciliado.final - dia.ajustes) * 100) / 100 : null,
      saldoDepois: dia ? dia.conciliado.final : null,
    };
  });

  return (
    <>
      <PageHeader
        title="Controle de Caixa"
        subtitle="Conciliação do extrato com os lançamentos · role a faixa para ver até uma semana à frente"
        actions={projectPicker}
      />
      {avisoRemovida}
      {/* Filtros numa linha própria: no cabeçalho, os três juntos espremiam o título. */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <DateRangeFilter de={de} ate={ate} />
        {versionSelect}
      </div>
      <LembrarProjeto projectId={project.id} />
      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (Prompt E, 6.2). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">

      {/* Resumo do dia (hoje) */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
              Entradas do dia
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-success)]">
              {brl0(movHoje.entradas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
              Saídas do dia
            </p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">
              {brl0(movHoje.saidas)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
              Saldo do dia
            </p>
            <p
              className={`mt-1 text-xl font-semibold ${
                saldoHoje < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-accent)]"
              }`}
            >
              {brl0(saldoHoje)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prompt L, 1.0/1.2 — os dois saldos por conta e no total; importar e Open Finance no topo. */}
      <SaldosCaixa
        contas={saldosPorConta}
        total={{ emConta: saldoTotal, conciliado: hojeNaCadeia?.conciliado.final ?? saldoTotal }}
        importar={
          <ImportExtratoButton
            contas={contas.map((c) => ({ id: c.id, banco: c.banco, cc: c.cc }))}
            aiConfigured={aiConfigured}
            projetos={ctx.projects.map((p) => ({ id: p.id, nome: p.name }))}
            projectId={project.id}
          />
        }
        openFinance={{ configurado: pluggyCfg(), podeConfigurar: can(ctx.perms, "contas", "editar") }}
        totalAjustes={totalAjustes}
        baixadoSemConciliar={baixadoComDias}
      />

      {/* Prompt L, 1.4-A — cadeia de saldo com inicial e final, em conta e conciliado. */}
      {/* Prompt E2/L2 — o que a Cris recebe desta tela: saldos e projeção, agregados. */}
      <CrisDaTela
        titulo="Caixa e conciliação"
        dados={{
          saldoTotalEmConta: saldoTotal,
          contas: saldosPorConta.map((c) => ({ conta: c.nome, emConta: c.emConta, conciliado: c.conciliado, diasDesdeAtualizacao: c.diasDesde, conectada: c.conectada })),
          dias: cadeia.dias.map((d) => ({ dia: d.dia, rotulo: d.rotulo, entradas: d.entradas, saidas: d.saidas, conciliadoFinal: d.conciliado.final, emContaFinal: d.emConta?.final ?? null, diferenca: d.diferenca, fechado: d.fechado, venceReceber: previstoDaFaixa.porDia[d.dia]?.aReceber ?? null, vencePagar: previstoDaFaixa.porDia[d.dia]?.aPagar ?? null, saldoProjetado: previstoDaFaixa.saldo[d.dia] ?? null })),
          atrasados: previstoDaFaixa.atrasados,
          pendentesDeConciliar: conciliacaoData.pendentes.length,
          ajustes: totalAjustes,
        }}
        sugestoes={["Por que o conciliado não bate com o extrato?", "Como fica o saldo nos próximos 7 dias?", "Quais pendências conciliar primeiro?", "Como conecto a conta pelo Open Finance?"]}
      />
      <CadeiaDias cadeia={cadeia} canFechar={can(ctx.perms, "fechamento", "criar")} canReabrir={can(ctx.perms, "conciliacao", "excluir")} previsto={previstoDaFaixa} />

      {/* Prompt L2 — o histórico dos dias fechados mora aqui (o Balanço do Dia sai, AB2). */}
      {diasFechados}

      {/* Abas */}
      <div className="mb-5 flex gap-1 rounded-[8px] bg-[var(--color-surface3)] p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            // A obra (?proj=) sobrevive à troca de aba.
            href={`/caixa?tab=${t.key}&proj=${project.id}`}
            className={`rounded-[6px] px-3 py-1.5 text-xs transition-colors ${
              t.key === tab
                ? "bg-white text-[var(--color-ink)] shadow-sm"
                : "text-[var(--color-ink3)] hover:text-[var(--color-ink)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "conciliacao" && (
        <Conciliacao
          cash={cash}
          conciliados={conciliados}
          conciliacaoData={conciliacaoData}
          canDesfazer={canDesfazerConc}
          projectId={project.id}
        />
      )}
      {tab === "ajustes" && (
        <AjustesCaixa ajustes={ajustesLinhas} contas={contas.map((c) => ({ id: c.id, banco: c.banco, cc: c.cc }))} contaFiltro={contaFiltro} projectId={project.id} canAjustar={can(ctx.perms, "conciliacao", "criar")} de={de} ate={ate} />
      )}
      </div>
      <AssistenteCaixa usuario={ctx.userEmail ?? "anon"} projectId={project.id} analise={analise} canConciliar={can(ctx.perms, "caixa", "editar")} />
      </div>
    </>
  );
}

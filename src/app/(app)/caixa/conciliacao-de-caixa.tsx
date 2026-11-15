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
import { AssistenteCartoes } from "@/components/app/assistente-cartoes";
import { Conciliacao } from "@/components/app/caixa-conciliacao";
import { saldosDosCartoes } from "@/lib/caixa-cartoes";
import { dadosDaAbaCartoes } from "@/lib/caixa-aba-cartoes";
import { AbaCartoes } from "@/components/app/aba-cartoes";
import { SeletorDeConta, type OpcaoDoSeletor } from "@/components/app/seletor-de-conta";
import { ABAS_DO_CAIXA, abaDoCaixa, urlDaAba, urlDoCaixa, type ParamsDoCaixa } from "@/lib/caixa-url";
import { FaixaDeConciliacao, VazioDaConciliacao, type EstadoDoOpenFinance } from "@/components/app/faixa-conciliacao";

/**
 * GA-11 — a Conciliação de Caixa: a tela ÚNICA do Caixa, para toda empresa
 * (a tela antiga por projeto e versão saiu, com a chave que separava as duas).
 *
 * Só dinheiro real: a versão Atual de todos os projetos e os movimentos sem
 * projeto. Sem seletor de projeto, de versão nem comparação; `?proj=` e `?vs=`
 * de links antigos são ignorados.
 *
 * Estrutura (§3): cabeçalho → barra de filtros (período e seletor de conta) →
 * cartões do dia → faixa dos três caminhos → abas Contas correntes · Cartões
 * de crédito · Ajustes → cadeia de saldo e Dias fechados; o Assistente à
 * direita. O seletor (`?conta=`) escolhe UMA conta (ou cartão) ou todas, e
 * tudo na tela segue a escolha; trocar de aba volta para "Todas".
 */
const SUGESTOES: Record<string, string[]> = {
  contas: ["Quais pendências conciliar primeiro?", "Por que o conciliado não bate com o extrato?", "Como fica o saldo nos próximos 7 dias?", "Como conecto a conta pelo Open Finance?"],
  cartoes: ["O que está na fatura e não foi lançado?", "Quanto vence na próxima fatura?", "Como subo a fatura em PDF?", "Como lanço um estorno?"],
  ajustes: ["Por que há ajustes neste mês?"],
};

const nomeDaConta = (c: { banco: string; cc: string | null }) => `${c.banco}${c.cc ? " · " + c.cc : ""}`;
/** "MM/DD/YYYY" → "YYYY-MM-DD". */
const isoDe = (d: string | null) => (d && /^\d{2}\/\d{2}\/\d{4}$/.test(d) ? `${d.slice(6)}-${d.slice(0, 2)}-${d.slice(3, 5)}` : null);

export async function ConciliacaoDeCaixa({ ctx, sp, avisoRemovida, diasFechados }: { ctx: TenantContext; sp: ParamsDoCaixa; avisoRemovida: React.ReactNode; diasFechados: React.ReactNode }) {
  const aba = abaDoCaixa(sp.tab);
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

  // §3.1 — o que o seletor oferece em cada aba; um id que não é da aba é ignorado.
  const contasAtivas = contas.filter((c) => c.ativo);
  const contaSel = aba !== "cartoes" ? contas.find((c) => c.id === sp.conta) ?? null : null;
  const cartaoSel = aba !== "contas" && !contaSel ? cartoes.find((k) => k.id === sp.conta) ?? null : null;
  const filtroId = contaSel?.id ?? cartaoSel?.id ?? "";
  const params: ParamsDoCaixa = { tab: aba, de, ate, conta: filtroId };
  const opcoes: OpcaoDoSeletor[] =
    aba === "contas"
      ? contasAtivas.map((c) => ({ id: c.id, nome: nomeDaConta(c) }))
      : aba === "cartoes"
        ? cartoes.map((k) => ({ id: k.id, nome: k.nome }))
        : [...contasAtivas.map((c) => ({ id: c.id, nome: nomeDaConta(c), grupo: "Contas correntes" })), ...cartoes.map((k) => ({ id: k.id, nome: k.nome, grupo: "Cartões de crédito" }))];
  const hrefs = Object.fromEntries([["", urlDoCaixa({ ...params, conta: "" })], ...opcoes.map((o) => [o.id, urlDoCaixa({ ...params, conta: o.id })])]);
  const escolhido = contaSel ? nomeDaConta(contaSel) : cartaoSel ? cartaoSel.nome : null;

  // Movimentos: conta de cada um (coluna Conta em "Todas") e o filtro da conta escolhida.
  const contaDe = new Map(empresa.cash.map((c) => [c.id, c.bankAccountId]));
  const nomeDe = new Map(contas.map((c) => [c.id, nomeDaConta(c)]));
  const daConta = <T extends { cashEntryId: string }>(xs: T[]) => (contaSel ? xs.filter((x) => contaDe.get(x.cashEntryId) === contaSel.id) : xs);
  const conciliacaoData = {
    pendentes: daConta(conciliacaoDaEmpresa.pendentes),
    pendentesEntrada: daConta(conciliacaoDaEmpresa.pendentesEntrada),
    conciliados: daConta(conciliacaoDaEmpresa.conciliados),
  };
  const contaDoMovimento = contaSel ? undefined : Object.fromEntries(empresa.cash.map((c) => [c.id, c.bankAccountId ? nomeDe.get(c.bankAccountId) ?? "sem conta" : "sem conta"]));
  const pendentesPorConta = new Map<string, number>();
  for (const m of [...conciliacaoDaEmpresa.pendentes, ...conciliacaoDaEmpresa.pendentesEntrada]) {
    const k = contaDe.get(m.cashEntryId);
    if (k) pendentesPorConta.set(k, (pendentesPorConta.get(k) ?? 0) + 1);
  }

  const { cadeia: cadeiaEmpresa, fechamentos, movimentos } = empresa;
  const saldoTotal = saldoDisponivel(contas);
  const saldosPorConta = contas
    .filter((c) => isContaDaEmpresa(c))
    .map((c) => {
      const propria = cadeiaDeSaldo({ movimentos: movimentos.filter((m) => m.bankAccountId === c.id), saldoEmContaAtual: Number(c.saldo), fechamentos: [], hojeISO: hoje });
      const atualizadoEm = c.lastSync ? c.lastSync.toISOString() : null;
      return {
        id: c.id,
        nome: nomeDaConta(c),
        emConta: Number(c.saldo),
        conciliado: propria.dias.find((d) => d.dia === hoje)?.conciliado.final ?? Number(c.saldo),
        origem: (c.saldoSource === "auto" ? "auto" : "manual") as "auto" | "manual",
        atualizadoEm,
        diasDesde: diasDesdeAtualizacao(atualizadoEm, hoje),
        conectada: of.porConta.get(c.id)?.situacao === "conectado",
        pendentes: pendentesPorConta.get(c.id) ?? 0,
      };
    });
  const saldosDaTela = contaSel ? saldosPorConta.filter((c) => c.id === contaSel.id) : saldosPorConta;

  // §3.6 — a cadeia segue a conta escolhida; sem conta (ou na aba Cartões), a da empresa.
  const cadeia = contaSel
    ? cadeiaDeSaldo({ movimentos: movimentos.filter((m) => m.bankAccountId === contaSel.id), saldoEmContaAtual: Number(contaSel.saldo), fechamentos: [], hojeISO: hoje })
    : cadeiaEmpresa;

  const todosAjustes = empresa.cash.filter((c) => c.cat === "ajuste");
  const totalAjustes = { valor: Math.round(todosAjustes.reduce((a, c) => a + Number(c.valor), 0) * 100) / 100, n: todosAjustes.length };
  const baixadoComDias = { ...baixado, dias: baixado.maisAntigoISO ? Math.max(0, Math.round((Date.parse(hoje) - Date.parse(baixado.maisAntigoISO)) / 86_400_000)) : null };
  const abertasTodas = contasPagarDoTenant.filter((c) => c.versionKind === "atual" && c.saldo > 0.005 && c.status !== "Pago" && c.status !== "Cancelada");
  const abertas = contasPagarDoTenant
    .filter((c) => c.versionKind === "atual" && (c.origem ?? "despesa") === "despesa" && !c.parcela && c.saldo > 0.005 && c.status !== "Pago" && c.status !== "Cancelada")
    .map((c) => ({ despesaId: c.despesaId ?? c.id, numDoc: c.numDoc, fornecedor: c.fornecedorNome, saldo: c.saldo, vencimento: c.vencimento }));
  const aReceberEmAberto = await aReceberDaFaixaDaEmpresa(ctx.tenant.id, contasReceberAbertas, recebiveisDasVendas, hoje);
  const { porDia: previstoPorDiaDaFaixa, atrasados } = previstoPorDia(
    cadeia.dias.map((d) => d.dia),
    hoje,
    aReceberEmAberto,
    abertasTodas.map((c) => ({ vencimento: c.vencimento, saldo: c.saldo })),
  );
  // O previsto (a pagar e a receber) é da empresa: só entra na faixa consolidada.
  const previstoDaFaixa = contaSel ? undefined : { porDia: previstoPorDiaDaFaixa, saldo: saldosProjetados(cadeia.dias, hoje, previstoPorDiaDaFaixa), atrasados };

  // Aba Cartões: carrega só nela (quadro, conciliação linha a linha e conferência).
  const abaCartoes = aba === "cartoes" ? await dadosDaAbaCartoes(ctx.tenant.id, hoje, cartoes, cartaoSel?.id ?? null) : null;

  // Cartões do dia: contas → a cadeia (da conta ou da empresa); cartões → linhas da fatura de hoje (crédito entra, compra sai).
  const hojeNaCadeia = cadeia.dias.find((d) => d.dia === hoje);
  const doDia = abaCartoes
    ? (() => {
        const linhas = abaCartoes.cartoes.flatMap((c) => c.faturas.flatMap((f) => f.linhas)).filter((l) => isoDe(l.data) === hoje);
        return { entradas: linhas.filter((l) => l.valor < 0).reduce((a, l) => a - l.valor, 0), saidas: linhas.filter((l) => l.valor > 0).reduce((a, l) => a + l.valor, 0) };
      })()
    : { entradas: hojeNaCadeia?.entradas ?? 0, saidas: hojeNaCadeia?.saidas ?? 0 };
  const saldoHoje = doDia.entradas - doDia.saidas;

  const analise = analisarCaixa({
    pendentes: conciliacaoData.pendentes,
    abertas,
    cadeia,
    conciliadosSemVinculo: conciliacaoData.conciliados.filter((c) => c.semVinculo).map((c) => ({ data: c.data, valor: c.valor })),
    baixado: baixadoComDias,
    contas: saldosDaTela.map((c) => ({ id: c.id, nome: c.nome, diasDesde: c.diasDesde })),
    movimentos: contaSel ? movimentos.filter((m) => m.bankAccountId === contaSel.id) : movimentos,
    descricoes: new Map(empresa.cash.map((c) => [c.id, c.descricao])),
    hojeISO: hoje,
  });

  const cashDaTela = empresa.cash.filter((c) => (!contaSel || c.bankAccountId === contaSel.id) && (!de && !ate ? true : dateInRange(c.data, de, ate)));
  const conciliados = cashDaTela.filter((c) => c.rec).length;
  const nomeDaObra = new Map(ctx.projects.map((p) => [p.id, p.name]));
  const projetos = ctx.projects.map((p) => ({ id: p.id, nome: p.name }));

  // §3.4 — ajustes: da conta escolhida; cartão não tem ajuste de caixa.
  const ajustesFiltrados = cartaoSel ? [] : todosAjustes.filter((c) => (!de && !ate ? true : dateInRange(c.data, de, ate))).filter((c) => !contaSel || c.bankAccountId === contaSel.id);
  const autores = aba === "ajustes" ? await getAutoresDosAjustes(ctx.tenant.id, ajustesFiltrados.map((c) => c.id)) : new Map<string, { autor: string | null; quando: string | null }>();
  const diasDoAjusteMaisAntigo = ajustesFiltrados.reduce((max, c) => {
    const iso = isoDe(c.data);
    return Math.max(max, iso ? Math.round((Date.parse(hoje) - Date.parse(iso)) / 86_400_000) : 0);
  }, 0);
  const cadeiaLonga = aba === "ajustes" && ajustesFiltrados.length > 0 ? cadeiaDeSaldo({ movimentos, saldoEmContaAtual: saldoTotal, fechamentos, hojeISO: hoje, diasPassados: Math.min(diasDoAjusteMaisAntigo, 3660), diasFuturos: 0 }) : null;
  const ajustesLinhas: AjusteLinha[] = ajustesFiltrados.map((c) => {
    const iso = isoDe(c.data);
    const dia = iso ? cadeiaLonga?.dias.find((d) => d.dia === iso) : undefined;
    return {
      id: c.id,
      data: c.data,
      obra: c.projectId ? nomeDaObra.get(c.projectId) ?? null : "Empresa (sem projeto)",
      conta: c.bankAccountId ? nomeDe.get(c.bankAccountId) ?? null : null,
      valor: Number(c.valor),
      motivo: c.descricao,
      autor: autores.get(c.id)?.autor ?? null,
      quando: autores.get(c.id)?.quando ?? null,
      saldoAntes: dia ? Math.round((dia.conciliado.final - dia.ajustes) * 100) / 100 : null,
      saldoDepois: dia ? dia.conciliado.final : null,
    };
  });

  // Faixa dos três caminhos: o contador é da aba (movimentos das contas, ou linhas das faturas).
  const todosPendentes = daConta([...conciliacaoDaEmpresa.pendentes, ...conciliacaoDaEmpresa.pendentesEntrada]);
  const contasComPendencia = new Set(todosPendentes.map((m) => contaDe.get(m.cashEntryId) ?? "sem conta")).size;
  const maisAntigo = todosPendentes.map((m) => isoDe(m.data)).filter((x): x is string => !!x).sort()[0];
  const cartoesDaTela = cartoes.filter((k) => !cartaoSel || k.id === cartaoSel.id);
  const pendentesDosCartoes = cartoesDaTela.reduce((a, k) => a + k.pendentes, 0);
  const conectada = of.conexoes.find((c) => c.situacao === "conectado");
  const estadoOF: EstadoDoOpenFinance = conectada
    ? { tipo: "conectado", ultima: conectada.ultimaAtualizacao }
    : !of.configurado
      ? { tipo: "indisponivel", motivo: "o Open Finance não está configurado neste servidor (credenciais da Pluggy)." }
      : can(ctx.perms, "contas", "editar")
        ? { tipo: "conectar" }
        : { tipo: "indisponivel", motivo: "conectar o banco exige a permissão Contas/editar." };
  const opcoesContas = contasAtivas.map((c) => ({ id: c.id, nome: nomeDaConta(c) }));
  const opcoesCartoes = cartoes.map((k) => ({ id: k.id, nome: k.nome }));
  const faixa = (
    <FaixaDeConciliacao
      pendentes={aba === "cartoes" ? pendentesDosCartoes : todosPendentes.length}
      contasComPendencia={aba === "cartoes" ? cartoesDaTela.filter((k) => k.pendentes > 0).length : contasComPendencia}
      maisAntigoDias={aba === "cartoes" ? null : maisAntigo ? Math.max(0, Math.round((Date.parse(hoje) - Date.parse(maisAntigo)) / 86_400_000)) : null}
      hrefConciliacao={urlDoCaixa(params)}
      openFinance={estadoOF}
      contas={opcoesContas}
      cartoes={opcoesCartoes}
      aba={aba}
      escolhido={escolhido}
      aiConfigured={aiConfigured}
    />
  );
  const importar = <ImportExtratoButton contas={contas.map((c) => ({ id: c.id, banco: c.banco, cc: c.cc }))} aiConfigured={aiConfigured} projetos={projetos} contaInicial={contaSel?.id ?? ""} />;

  // §4.1 — o que a Cris recebe: a aba, o que está escolhido (ou "todas"), o período, os saldos e as pendências.
  const dadosDaCris = {
    tela: "Conciliação de Caixa",
    aba: ABAS_DO_CAIXA.find((a) => a.key === aba)!.label,
    escopo: contaSel ? `conta ${escolhido}` : cartaoSel ? `cartão ${escolhido}` : aba === "cartoes" ? "todos os cartões" : aba === "ajustes" ? "todas as contas" : "todas as contas correntes",
    periodo: de || ate ? { de: de || null, ate: ate || null } : "sem filtro de período",
    saldoTotalEmConta: saldoTotal,
    contas: saldosDaTela.map((c) => ({ conta: c.nome, emConta: c.emConta, conciliado: c.conciliado, diasDesdeAtualizacao: c.diasDesde, conectada: c.conectada, aConciliar: c.pendentes })),
    cartoes: (abaCartoes?.quadro ?? cartoesDaTela.map((k) => ({ nome: k.nome, pendentes: k.pendentes, lancado: k.faturaDoCiclo?.lancado ?? 0, extrato: null, diferenca: null, situacao: null, limite: k.limite, fatura: k.faturaDoCiclo })))
      .filter((q) => !cartaoSel || q.nome === cartaoSel.nome)
      .map((q) => ({ cartao: q.nome, limite: q.limite, fatura: q.fatura, faturaImportada: q.extrato, lancado: q.lancado, diferenca: q.diferenca, situacao: q.situacao, aConciliar: q.pendentes })),
    dias: cadeia.dias.map((d) => ({ dia: d.dia, rotulo: d.rotulo, entradas: d.entradas, saidas: d.saidas, conciliadoFinal: d.conciliado.final, emContaFinal: d.emConta?.final ?? null, diferenca: d.diferenca, fechado: d.fechado, venceReceber: previstoDaFaixa?.porDia[d.dia]?.aReceber ?? null, vencePagar: previstoDaFaixa?.porDia[d.dia]?.aPagar ?? null, saldoProjetado: previstoDaFaixa?.saldo[d.dia] ?? null })),
    atrasados: previstoDaFaixa?.atrasados ?? null,
    pendentesDeConciliar: aba === "cartoes" ? pendentesDosCartoes : conciliacaoData.pendentes.length + conciliacaoData.pendentesEntrada.length,
    ajustes: aba === "ajustes" ? { noFiltro: ajustesFiltrados.length, valorNoFiltro: Math.round(ajustesFiltrados.reduce((a, c) => a + Number(c.valor), 0) * 100) / 100 } : totalAjustes,
    conferenciaDaFatura: abaCartoes?.cartoes.map((c) => ({ cartao: c.nome, conferem: c.conferencia.casados.length, naFaturaSemLancamento: c.conferencia.semLancamento.map((i) => ({ data: i.data, descricao: i.descricao, valor: i.valor })), lancadoSemFatura: c.conferencia.semExtrato.length, divergentes: c.conferencia.divergentes.length, creditos: c.conferencia.creditos.length })) ?? null,
  };

  const rotuloDoSeletor = aba === "contas" ? ["Conta corrente", "Todas as contas correntes"] : aba === "cartoes" ? ["Cartão", "Todos os cartões"] : ["Conta ou cartão", "Todas as contas"];

  return (
    <>
      <PageHeader title="Conciliação de Caixa" subtitle="Suba o extrato, conecte pelo Open Finance ou concilie com a Cris. Nada é gravado sem a sua confirmação." />
      {avisoRemovida}
      <div className="mb-5 flex flex-wrap items-end gap-3" data-barra-de-filtros>
        <DateRangeFilter de={de} ate={ate} />
        {opcoes.length > 0 ? (
          <SeletorDeConta rotulo={rotuloDoSeletor[0]} rotuloTodas={rotuloDoSeletor[1]} opcoes={opcoes} selecionada={filtroId} hrefs={hrefs} />
        ) : (
          <p className="text-[12.5px] text-[var(--color-ink3)]" data-sem-conta>
            {aba === "cartoes" ? (
              <>
                Cadastre um cartão em <Link href="/cartoes" className="text-[var(--color-accent2)] hover:underline">Cartões de Crédito</Link>.
              </>
            ) : (
              <>
                Cadastre uma conta corrente em <Link href="/contas" className="text-[var(--color-accent2)] hover:underline">Contas Correntes</Link> para importar o extrato.
              </>
            )}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3" data-cartoes-do-dia>
            <Card>
              <CardContent className="p-4">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">{aba === "cartoes" ? "Créditos do dia" : "Entradas do dia"}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-success)]">{brl0(doDia.entradas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">{aba === "cartoes" ? "Compras do dia" : "Saídas do dia"}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-danger)]">{brl0(doDia.saidas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">Saldo do dia</p>
                <p className={`mt-1 text-xl font-semibold ${saldoHoje < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-accent)]"}`}>{brl0(saldoHoje)}</p>
              </CardContent>
            </Card>
          </div>

          {faixa}

          <div className="mb-5 flex gap-1 rounded-[8px] bg-[var(--color-surface3)] p-1" role="tablist" data-abas-do-caixa>
            {ABAS_DO_CAIXA.map((t) => (
              <Link
                key={t.key}
                href={urlDaAba(params, t.key)}
                role="tab"
                aria-selected={t.key === aba}
                data-aba={t.key}
                className={`rounded-[6px] px-3 py-1.5 text-xs transition-colors ${t.key === aba ? "bg-white text-[var(--color-ink)] shadow-sm" : "text-[var(--color-ink3)] hover:text-[var(--color-ink)]"}`}
              >
                {t.label}
              </Link>
            ))}
          </div>

          <CrisDaTela titulo={`Conciliação de Caixa · ${dadosDaCris.aba}`} dados={dadosDaCris} sugestoes={SUGESTOES[aba]} />

          {aba === "contas" &&
            (contasAtivas.length === 0 ? (
              <Card className="mb-6">
                <CardContent className="p-8 text-center text-[13px] text-[var(--color-ink3)]" data-vazio-contas>
                  Cadastre uma conta corrente em{" "}
                  <Link href="/contas" className="text-[var(--color-accent2)] hover:underline">
                    Contas Correntes
                  </Link>{" "}
                  para importar o extrato e conciliar.
                </CardContent>
              </Card>
            ) : (
              <>
                <SaldosCaixa
                  contas={saldosDaTela}
                  total={contaSel ? { emConta: saldosDaTela[0]?.emConta ?? 0, conciliado: saldosDaTela[0]?.conciliado ?? 0 } : { emConta: saldoTotal, conciliado: cadeiaEmpresa.dias.find((d) => d.dia === hoje)?.conciliado.final ?? saldoTotal }}
                  importar={importar}
                  openFinance={{ configurado: isPluggyConfigured(), podeConfigurar: can(ctx.perms, "contas", "editar"), contasConectadas: of.contasConectadas }}
                  totalAjustes={totalAjustes}
                  baixadoSemConciliar={baixadoComDias}
                  filtro={{ selecionada: filtroId, href: (id) => urlDoCaixa({ ...params, conta: id }), todas: urlDoCaixa({ ...params, conta: "" }) }}
                />
                <Conciliacao
                  cash={cashDaTela}
                  conciliados={conciliados}
                  conciliacaoData={conciliacaoData}
                  canDesfazer={can(ctx.perms, "conciliacao", "excluir")}
                  projetos={projetos}
                  contaDe={contaDoMovimento}
                  vazio={<VazioDaConciliacao openFinance={estadoOF} contas={opcoesContas} cartoes={opcoesCartoes} aiConfigured={aiConfigured} escolhido={escolhido} />}
                  obraDe={(c) => {
                    const projectId = "projectId" in c ? (c as { projectId: string | null }).projectId : null;
                    return projectId ? nomeDaObra.get(projectId) ?? "—" : "sem projeto (da conta)";
                  }}
                />
              </>
            ))}
          {aba === "cartoes" && abaCartoes && (
            <AbaCartoes
              quadro={abaCartoes.quadro}
              cartoes={abaCartoes.cartoes}
              selecionado={cartaoSel?.id ?? ""}
              hrefDoCartao={(id) => urlDoCaixa({ ...params, conta: id })}
              canConciliar={can(ctx.perms, "caixa", "editar")}
              canLancar={can(ctx.perms, "despesas", "criar")}
              canEditarCartao={can(ctx.perms, "cartoes", "editar")}
              aiConfigured={aiConfigured}
            />
          )}
          {aba === "ajustes" && (
            <AjustesCaixa
              ajustes={ajustesLinhas}
              contas={contas.map((c) => ({ id: c.id, banco: c.banco, cc: c.cc }))}
              contaFiltro={contaSel?.id ?? ""}
              projetos={projetos}
              canAjustar={can(ctx.perms, "conciliacao", "criar")}
              aviso={cartaoSel ? `Cartão não tem ajuste de caixa: o ajuste é lançado numa conta corrente. Escolha uma conta ou "Todas as contas".` : null}
            />
          )}

          <div className="mt-6">
            {aba === "cartoes" && <p className="mb-2 text-[11.5px] text-[var(--color-ink3)]">A cadeia de saldo é das contas correntes: o cartão entra nela pelo pagamento da fatura.</p>}
            <CadeiaDias cadeia={cadeia} canFechar={!contaSel && can(ctx.perms, "fechamento", "criar")} canReabrir={!contaSel && can(ctx.perms, "conciliacao", "excluir")} previsto={previstoDaFaixa} />
            {diasFechados}
          </div>
        </div>
        {aba === "cartoes" && abaCartoes ? (
          <AssistenteCartoes usuario={ctx.userEmail ?? "anon"} analise={abaCartoes.analise} />
        ) : (
          <AssistenteCaixa usuario={ctx.userEmail ?? "anon"} projectId="" analise={analise} canConciliar={can(ctx.perms, "caixa", "editar")} />
        )}
      </div>
    </>
  );
}

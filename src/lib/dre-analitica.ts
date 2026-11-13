/**
 * Prompt AC3 (Fase 3 · revisão V5): DRE Analítica — a mesma DRE, aberta em
 * categoria → grupo do plano de contas → conta, com análise vertical (% da
 * receita). Módulo PURO.
 *
 * Os totais são os da cascata (`waterfall`): a analítica só detalha. A
 * categoria de cada despesa é a que a DRE usa — a gravada, ou a da conta com
 * a chave "despesa_categoria_do_plano" ligada (Prompt DP), porque a leitura
 * vem de `getExpenseRows`. BAC3-1 em aberto: o drill-down para na conta.
 */
import { waterfall, type Inputs } from "@/lib/calc/dre-cascata";

export interface LancamentoAnalitico {
  categoria: string;
  conta: string | null;
  valor: number;
}

/** O que entra num mês (ou num período, depois de somado). */
export interface EntradaAnalitica {
  /** Receita das unidades e liberações (a mesma de `getMonthlyRevenue`). */
  receitaVendas: number;
  /** Revenda de bens de permuta. */
  receitaPermuta: number;
  lancamentos: LancamentoAnalitico[];
  /** Encargos de pagamento (juros, multa, outros − desconto). */
  encargos: number;
}

export interface ContaAnalitica {
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
}

export type TipoLinha = "categoria" | "grupo" | "conta" | "detalhe" | "sub" | "final";

export interface LinhaAnalitica {
  id: string;
  /** Linha de que esta é detalhe; null no primeiro nível. */
  pai: string | null;
  nivel: number;
  tipo: TipoLinha;
  label: string;
  valor: number;
  /** % da receita do período; null sem receita. */
  pct: number | null;
}

export const entradaVazia = (): EntradaAnalitica => ({ receitaVendas: 0, receitaPermuta: 0, lancamentos: [], encargos: 0 });

/** Soma os meses do período (null = todos). */
export function somarPeriodo(porMes: Record<string, EntradaAnalitica>, meses: Set<string> | null): EntradaAnalitica {
  const out = entradaVazia();
  for (const [mm, e] of Object.entries(porMes)) {
    if (meses && !meses.has(mm)) continue;
    out.receitaVendas += e.receitaVendas;
    out.receitaPermuta += e.receitaPermuta;
    out.encargos += e.encargos;
    out.lancamentos.push(...e.lancamentos);
  }
  return out;
}

/** A mesma entrada, no formato da cascata (para conferir os totais). */
export function paraInputs(e: EntradaAnalitica): Inputs {
  const inp: Inputs = { receita: e.receitaVendas + e.receitaPermuta, custoVar: 0, byCat: {} };
  for (const l of e.lancamentos) {
    inp.byCat[l.categoria] = (inp.byCat[l.categoria] || 0) + l.valor;
    if (l.categoria === "Receita") inp.receita += l.valor;
    if (l.categoria === "Custo Variável") inp.custoVar += l.valor;
  }
  if (e.encargos) inp.byCat["Despesas Financeiras"] = (inp.byCat["Despesas Financeiras"] || 0) + e.encargos;
  return inp;
}

/** As linhas de custo da cascata, na ordem dela, com o rótulo dela. */
const CATEGORIAS: { categoria: string; label: string }[] = [
  { categoria: "Custo Variável", label: "(−) Custo Variável" },
  { categoria: "Despesa Variável", label: "(−) Despesa Variável" },
  { categoria: "Custo Fixo", label: "(−) Custo Fixo" },
  { categoria: "Despesa Fixa", label: "(−) Despesa Fixa" },
  { categoria: "Retiradas", label: "(−) Retiradas" },
  { categoria: "Investimento", label: "(−) Investimentos" },
  { categoria: "Empréstimos", label: "(−) Empréstimos" },
  { categoria: "Despesas Financeiras", label: "(−) Despesas Financeiras (juros/multas)" },
];
const SUBTOTAL_DEPOIS: Record<string, string> = {
  "Despesa Variável": "= Margem de Contribuição",
  Retiradas: "= EBITDA",
};

const r2 = (v: number) => Math.round(v * 100) / 100;
const porCodigo = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/**
 * Monta as linhas. Cada categoria abre nos grupos do plano de contas e cada
 * grupo nas contas; despesa sem conta (ou com conta fora do plano) vai para
 * "Sem conta do plano". Os subtotais são os da cascata.
 */
export function linhasDaDreAnalitica(e: EntradaAnalitica, contas: readonly ContaAnalitica[]): LinhaAnalitica[] {
  const cascata = waterfall([paraInputs(e)]);
  const R = cascata.R;
  const pct = (v: number) => (R > 0 ? (v / R) * 100 : null);
  const valorDa = (label: string) => cascata.rows.find((x) => x.label === label)!.value;
  const daConta = new Map(contas.map((c) => [c.code, c]));
  // No Orçamento e na Previsão a linha é o GRUPO (budget_line.row_key).
  const doGrupo = new Map(contas.map((c) => [c.groupCode, c.groupName]));
  const out: LinhaAnalitica[] = [];
  const push = (l: Omit<LinhaAnalitica, "pct" | "valor"> & { valor: number }) => out.push({ ...l, valor: r2(l.valor), pct: pct(l.valor) });

  // Receita, com o que a compõe.
  push({ id: "receita", pai: null, nivel: 0, tipo: "categoria", label: "Receita", valor: R });
  const lancadoComoReceita = e.lancamentos.filter((l) => l.categoria === "Receita").reduce((a, l) => a + l.valor, 0);
  if (e.receitaVendas) push({ id: "receita:vendas", pai: "receita", nivel: 1, tipo: "detalhe", label: "Receitas (faturas, contas a receber e, nos dados antigos, vendas e liberações)", valor: e.receitaVendas });
  if (e.receitaPermuta) push({ id: "receita:permuta", pai: "receita", nivel: 1, tipo: "detalhe", label: "Revenda de bens de permuta", valor: e.receitaPermuta });
  if (lancadoComoReceita) push({ id: "receita:despesa", pai: "receita", nivel: 1, tipo: "detalhe", label: "Lançado como despesa na categoria Receita", valor: lancadoComoReceita });

  for (const { categoria, label } of CATEGORIAS) {
    const total = valorDa(label);
    const idCat = `cat:${categoria}`;
    push({ id: idCat, pai: null, nivel: 0, tipo: "categoria", label, valor: total });
    // Grupo → conta → valor.
    const grupos = new Map<string, { nome: string; contas: Map<string, { nome: string; valor: number }> }>();
    for (const l of e.lancamentos) {
      if (l.categoria !== categoria) continue;
      const c = l.conta ? daConta.get(l.conta) : undefined;
      const grupoPlanejado = !c && l.conta && doGrupo.has(l.conta) ? l.conta : null;
      const gCode = c?.groupCode ?? grupoPlanejado ?? "—";
      const g =
        grupos.get(gCode) ??
        { nome: c ? `${c.groupCode} · ${c.groupName}` : grupoPlanejado ? `${grupoPlanejado} · ${doGrupo.get(grupoPlanejado)}` : "Sem conta do plano", contas: new Map() };
      const cCode = c?.code ?? (grupoPlanejado ? `${grupoPlanejado}:grupo` : l.conta || "—");
      const conta =
        g.contas.get(cCode) ??
        { nome: c ? `${c.code} · ${c.name}` : grupoPlanejado ? "Planejado no grupo" : l.conta ? `${l.conta} (fora do plano)` : "Sem conta", valor: 0 };
      conta.valor += l.valor;
      g.contas.set(cCode, conta);
      grupos.set(gCode, g);
    }
    for (const gCode of [...grupos.keys()].sort((a, b) => (a === "—" ? 1 : b === "—" ? -1 : porCodigo(a, b)))) {
      const g = grupos.get(gCode)!;
      const idGrupo = `${idCat}:g:${gCode}`;
      const totalGrupo = [...g.contas.values()].reduce((a, c) => a + c.valor, 0);
      push({ id: idGrupo, pai: idCat, nivel: 1, tipo: "grupo", label: g.nome, valor: totalGrupo });
      for (const cCode of [...g.contas.keys()].sort(porCodigo)) {
        const c = g.contas.get(cCode)!;
        push({ id: `${idGrupo}:c:${cCode}`, pai: idGrupo, nivel: 2, tipo: "conta", label: c.nome, valor: c.valor });
      }
    }
    if (categoria === "Despesas Financeiras" && e.encargos)
      push({ id: `${idCat}:encargos`, pai: idCat, nivel: 1, tipo: "detalhe", label: "Encargos de pagamentos (juros, multas − descontos)", valor: e.encargos });
    const sub = SUBTOTAL_DEPOIS[categoria];
    if (sub) push({ id: `sub:${sub}`, pai: null, nivel: 0, tipo: "sub", label: sub, valor: valorDa(sub) });
  }
  push({ id: "final", pai: null, nivel: 0, tipo: "final", label: "= Resultado Final", valor: valorDa("= Resultado Final") });
  return out;
}

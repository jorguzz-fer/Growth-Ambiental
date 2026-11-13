/**
 * Prompt AD3 (Fase 3 · revisão V5): Fluxo de Caixa Analítico — o previsto do
 * Fluxo de Caixa (pelo vencimento) aberto em bloco (obra/CEF ou
 * complementar) → grupo → conta do plano de contas, com a análise vertical
 * (% das entradas). Módulo PURO.
 *
 * As saídas vêm de `saidasDoFluxo`, a mesma lista que o Fluxo de Caixa soma
 * por mês: os totais batem por construção. BAD3-1 em aberto: o drill-down
 * para na conta.
 */
import type { LinhaAnalitica } from "@/lib/dre-analitica";

export interface ContaDoFluxo {
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
  kind: string;
}

export interface SaidaAnalitica {
  conta: string | null;
  origem: "planejamento" | "parcela" | "despesa" | "ressarcimento";
  valor: number;
}

export interface EntradaDoFluxoAnalitico {
  vendas: number;
  permuta: number;
  saidas: SaidaAnalitica[];
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const porCodigo = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

const BLOCOS = [
  { id: "cef", label: "Custos diretos dos serviços" },
  { id: "complementar", label: "Complementares" },
  { id: "ressarcimento", label: "Ressarcimentos a terceiros" },
  { id: "sem", label: "Sem conta do plano" },
] as const;
type Bloco = (typeof BLOCOS)[number]["id"];

/** Monta as linhas: Entradas, Saídas (bloco → grupo → conta) e o saldo. */
export function linhasDoFluxoAnalitico(e: EntradaDoFluxoAnalitico, contas: readonly ContaDoFluxo[]): LinhaAnalitica[] {
  const entradas = e.vendas + e.permuta;
  const totalSaidas = e.saidas.reduce((a, s) => a + s.valor, 0);
  const pct = (v: number) => (entradas > 0 ? (v / entradas) * 100 : null);
  const out: LinhaAnalitica[] = [];
  const push = (l: Omit<LinhaAnalitica, "pct">) => out.push({ ...l, valor: r2(l.valor), pct: pct(l.valor) });
  const daConta = new Map(contas.map((c) => [c.code, c]));
  // No Orçamento e na Previsão a linha é o grupo (budget_line.row_key).
  const doGrupo = new Map(contas.map((c) => [c.groupCode, { nome: c.groupName, kind: c.kind }]));

  push({ id: "entradas", pai: null, nivel: 0, tipo: "categoria", label: "Entradas", valor: entradas });
  if (e.vendas) push({ id: "entradas:vendas", pai: "entradas", nivel: 1, tipo: "detalhe", label: "Receitas (faturas, contas a receber e, nos dados antigos, vendas e liberações)", valor: e.vendas });
  if (e.permuta) push({ id: "entradas:permuta", pai: "entradas", nivel: 1, tipo: "detalhe", label: "Revenda de bens de permuta", valor: e.permuta });

  push({ id: "saidas", pai: null, nivel: 0, tipo: "categoria", label: "(−) Saídas", valor: totalSaidas });
  // bloco → grupo → conta → valor
  const arvore = new Map<Bloco, Map<string, { nome: string; contas: Map<string, { nome: string; valor: number }> }>>();
  for (const s of e.saidas) {
    const c = s.conta ? daConta.get(s.conta) : undefined;
    const g = !c && s.conta ? doGrupo.get(s.conta) : undefined;
    const bloco: Bloco =
      s.origem === "ressarcimento" ? "ressarcimento" : c ? (c.kind === "cef" ? "cef" : "complementar") : g ? (g.kind === "cef" ? "cef" : "complementar") : "sem";
    const gCode = c?.groupCode ?? (g ? s.conta! : s.origem === "ressarcimento" ? "rest" : "—");
    const gNome = c ? `${c.groupCode} · ${c.groupName}` : g ? `${s.conta} · ${g.nome}` : s.origem === "ressarcimento" ? "A pagar a quem desembolsou pela empresa" : "Sem conta";
    const cCode = c?.code ?? (g ? `${s.conta}:grupo` : s.conta || "—");
    const cNome = c ? `${c.code} · ${c.name}` : g ? "Planejado no grupo" : s.conta ? `${s.conta} (fora do plano)` : s.origem === "ressarcimento" ? "Ressarcimentos previstos" : "Sem conta";
    const grupos = arvore.get(bloco) ?? new Map();
    const grupo = grupos.get(gCode) ?? { nome: gNome, contas: new Map() };
    const conta = grupo.contas.get(cCode) ?? { nome: cNome, valor: 0 };
    conta.valor += s.valor;
    grupo.contas.set(cCode, conta);
    grupos.set(gCode, grupo);
    arvore.set(bloco, grupos);
  }
  for (const b of BLOCOS) {
    const grupos = arvore.get(b.id);
    if (!grupos) continue;
    const idBloco = `saidas:${b.id}`;
    const totalBloco = [...grupos.values()].reduce((a, g) => a + [...g.contas.values()].reduce((x, c) => x + c.valor, 0), 0);
    push({ id: idBloco, pai: "saidas", nivel: 1, tipo: "grupo", label: b.label, valor: totalBloco });
    for (const gCode of [...grupos.keys()].sort(porCodigo)) {
      const g = grupos.get(gCode)!;
      const idGrupo = `${idBloco}:g:${gCode}`;
      push({ id: idGrupo, pai: idBloco, nivel: 2, tipo: "grupo", label: g.nome, valor: [...g.contas.values()].reduce((a, c) => a + c.valor, 0) });
      for (const cCode of [...g.contas.keys()].sort(porCodigo)) {
        const c = g.contas.get(cCode)!;
        push({ id: `${idGrupo}:c:${cCode}`, pai: idGrupo, nivel: 3, tipo: "conta", label: c.nome, valor: c.valor });
      }
    }
  }
  push({ id: "saldo", pai: null, nivel: 0, tipo: "final", label: "= Saldo do período (entradas − saídas)", valor: entradas - totalSaidas });
  return out;
}

/**
 * Prévia da chave "dre_receita_rateio" (Prompt AR, Fase 2 · Revisão 4, parte
 * 5c), por obra, na versão Atual. SOMENTE LEITURA, pelas mesmas funções da DRE
 * (`versionInputsByMonth` com a chave desligada e ligada).
 *
 * Mostra também o que precisa de atenção antes de ligar:
 *  - unidades que o rateio não consegue reconhecer (obra sem início/fim, ou
 *    contrato sem nenhuma seção com a caixinha marcada);
 *  - contas a receber ligadas a uma unidade, que podem repetir a venda que o
 *    rateio já reconhece (Prompt I, §54.7: não são excluídas, só mostradas).
 */
import { versionInputsByMonth } from "@/lib/dre-inputs";
import { getReceitaDaDrePorRateio, getVersionsDoProjeto } from "@/lib/queries";
import { monthIndex } from "@/lib/dre";
import type { PendenciaDoRateio } from "@/lib/calc/receita-rateio";

export interface PreviaRateioObra {
  projeto: string;
  temAtual: boolean;
  hoje: number;
  rateio: number;
  /** Receita dos meses já encerrados (antes do mês corrente), hoje × rateio. */
  passadoHoje: number;
  passadoRateio: number;
  pendencias: PendenciaDoRateio[];
  contasComUnidade: { qtd: number; valor: number };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export async function previaRateioDaReceita(tenantId: string, projetos: readonly { id: string; name: string }[], hoje: Date = new Date()): Promise<PreviaRateioObra[]> {
  const mesCorrente = monthIndex(`${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`) ?? 0;
  const out: PreviaRateioObra[] = [];
  for (const p of projetos) {
    const atual = (await getVersionsDoProjeto(tenantId, p.id)).find((v) => v.kind === "atual");
    if (!atual) {
      out.push({ projeto: p.name, temAtual: false, hoje: 0, rateio: 0, passadoHoje: 0, passadoRateio: 0, pendencias: [], contasComUnidade: { qtd: 0, valor: 0 } });
      continue;
    }
    const [antes, depois, detalhe] = await Promise.all([
      versionInputsByMonth(tenantId, atual.id, p.id, { receitaRateio: false }),
      versionInputsByMonth(tenantId, atual.id, p.id, { receitaRateio: true }),
      getReceitaDaDrePorRateio(tenantId, atual.id, p.id),
    ]);
    const somar = (m: Record<string, { receita: number }>, soPassado: boolean) =>
      r2(Object.entries(m).reduce((a, [mm, x]) => (soPassado && !((monthIndex(mm) ?? Infinity) < mesCorrente) ? a : a + x.receita), 0));
    out.push({
      projeto: p.name,
      temAtual: true,
      hoje: somar(antes, false),
      rateio: somar(depois, false),
      passadoHoje: somar(antes, true),
      passadoRateio: somar(depois, true),
      pendencias: detalhe.pendencias,
      contasComUnidade: detalhe.contasComUnidade,
    });
  }
  return out;
}

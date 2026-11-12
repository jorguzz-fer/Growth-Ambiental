/**
 * Prévia da chave "plano_definicao_nova" (Prompt AR, Fase 2 · Revisão 4), por
 * obra, na versão Atual. SOMENTE LEITURA, pelas mesmas funções das telas
 * (`expandUnitReceivables` com a chave desligada e ligada).
 *
 * Traz também a LISTA DE CONFERÊNCIA da BAR-1: unidades vendidas com seção do
 * plano preenchida (com valor e data) e a caixinha "Usar" desmarcada. Com a
 * chave ligada, essas parcelas saem dos recebíveis até a caixinha ser marcada
 * na tela de Unidades. Nada é marcado automaticamente.
 *
 * Só obra, código da unidade e seção: nenhum dado de comprador.
 */
import { expandUnitReceivables } from "@/lib/calc/receivables";
import { lerPlano, type OrigemDaParcela } from "@/lib/calc/plano";
import { getUnits, getVersionsDoProjeto } from "@/lib/queries";

const NOME_DA_SECAO: Record<OrigemDaParcela, string> = {
  AS: "Ato",
  S1: "Sinal 1",
  S2: "Sinal 2",
  S3: "Sinal 3",
  Mensais: "Mensais",
  Semestrais: "Semestrais",
  Anuais: "Anuais",
  FGTS: "FGTS",
  Subsidio: "Subsídio",
  Permuta: "Permuta",
  Banco: "Financiamento",
};

export interface UnidadeAConferir {
  unidade: string;
  /** Seções com valor e data, mas com a caixinha "Usar" desmarcada. */
  secoes: string[];
  /** Quanto essas seções somam nos recebíveis hoje. */
  valor: number;
}

export interface PreviaPlanoObra {
  projeto: string;
  temAtual: boolean;
  /** Total dos recebíveis das vendas, hoje e pela definição nova. */
  hoje: number;
  nova: number;
  /** De onde vem a diferença. */
  saiFinanciamento: number;
  saiPermuta: number;
  saiCaixinha: number;
  aConferir: UnidadeAConferir[];
}

/** Regras puras da prévia, para uma lista de unidades (testável sem banco). */
export function previaDasUnidades(unidades: readonly { code: string; status: string; paymentPlan: unknown }[]): Omit<PreviaPlanoObra, "projeto" | "temAtual"> {
  let hoje = 0;
  let nova = 0;
  let saiFinanciamento = 0;
  let saiPermuta = 0;
  let saiCaixinha = 0;
  const aConferir: UnidadeAConferir[] = [];
  for (const u of unidades) {
    const plano = u.paymentPlan as Parameters<typeof expandUnitReceivables>[0];
    const status = u.status as Parameters<typeof expandUnitReceivables>[1];
    const antes = expandUnitReceivables(plano, status);
    hoje += antes.reduce((a, r) => a + r.valor, 0);
    nova += expandUnitReceivables(plano, status, { definicaoNova: true }).reduce((a, r) => a + r.valor, 0);
    for (const r of antes) {
      if (r.secao === "Banco") saiFinanciamento += r.valor;
      else if (r.secao === "Permuta") saiPermuta += r.valor;
    }
    const desligadas = lerPlano(plano, status).filter((p) => !p.ligada && p.data && p.valorBase > 0 && p.origem !== "Banco" && p.origem !== "Permuta");
    if (desligadas.length) {
      const valor = desligadas.reduce((a, p) => a + p.valorBase, 0);
      saiCaixinha += valor;
      aConferir.push({ unidade: u.code, secoes: [...new Set(desligadas.map((p) => NOME_DA_SECAO[p.origem]))], valor });
    }
  }
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return { hoje: r2(hoje), nova: r2(nova), saiFinanciamento: r2(saiFinanciamento), saiPermuta: r2(saiPermuta), saiCaixinha: r2(saiCaixinha), aConferir };
}

export async function previaPlanoDefinicaoNova(tenantId: string, projetos: readonly { id: string; name: string }[]): Promise<PreviaPlanoObra[]> {
  const out: PreviaPlanoObra[] = [];
  for (const p of projetos) {
    const atual = (await getVersionsDoProjeto(tenantId, p.id)).find((v) => v.kind === "atual");
    if (!atual) {
      out.push({ projeto: p.name, temAtual: false, hoje: 0, nova: 0, saiFinanciamento: 0, saiPermuta: 0, saiCaixinha: 0, aConferir: [] });
      continue;
    }
    const unidades = await getUnits(tenantId, atual.id);
    out.push({ projeto: p.name, temAtual: true, ...previaDasUnidades(unidades) });
  }
  return out;
}

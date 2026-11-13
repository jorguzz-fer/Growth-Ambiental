import "server-only";
import type { Project } from "@/lib/context";
import { getUnits, getVersionsDoProjeto } from "@/lib/queries";
import { custoOrcadoRealizado } from "@/lib/custo-orcado";
import type { DadosDaObra } from "@/lib/indicadores-negocio";
import { listarContratos } from "@/lib/contratos-queries";
import { resumoDosContratos } from "@/lib/valor-contratado";

/** Um mês distante: o Orçamento "no horizonte todo". */
const HORIZONTE = "12/2099";

/**
 * Prompt AE2 — os dados de cada obra para os indicadores de negócio: as
 * unidades da versão Atual (VGV, vendidas, m²) e, para quem vê o custo, o
 * mesmo custo orçado × realizado do comparativo do Resumo.
 */
export async function dadosDasObras(
  tenantId: string,
  obras: readonly Project[],
  opts: { verCusto: boolean; rascunhoFora: boolean; hoje?: Date },
): Promise<DadosDaObra[]> {
  const d = opts.hoje ?? new Date();
  const mesAtual = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const contratos = await listarContratos(tenantId);
  return Promise.all(
    obras.map(async (p) => {
      const atual = (await getVersionsDoProjeto(tenantId, p.id)).find((v) => v.kind === "atual");
      const unidades = atual ? await getUnits(tenantId, atual.id) : [];
      const vendidas = unidades.filter((u) => u.status === "Vendido");
      const m2 = (us: typeof unidades) => us.reduce((a, u) => a + (u.m2 == null ? 0 : Number(u.m2)), 0);
      const valor = (us: typeof unidades) => us.reduce((a, u) => a + Number(u.valor), 0);
      // Para o preço por m², valor e área só das unidades que têm m².
      const comM2 = (us: typeof unidades) => us.filter((u) => u.m2 != null && Number(u.m2) > 0);
      const [ateHoje, total] =
        opts.verCusto && atual
          ? await Promise.all([custoOrcadoRealizado(tenantId, p.id, mesAtual, opts.rascunhoFora), custoOrcadoRealizado(tenantId, p.id, HORIZONTE, opts.rascunhoFora)])
          : [null, null];
      const metragem = p.metragem == null ? null : Number(p.metragem);
      const s = resumoDosContratos(contratos, new Set([p.id]));
      return {
        obra: p.name,
        servicos: { contratado: s.contratado, medido: s.medido, faturado: s.faturado, recebido: s.recebido, aReceber: s.aReceber },
        vgv: valor(unidades),
        vgvVendido: valor(vendidas),
        unidades: unidades.length,
        vendidas: vendidas.length,
        m2Unidades: m2(unidades),
        m2Vendidas: m2(vendidas),
        vgvComM2: valor(comM2(unidades)),
        vgvVendidoComM2: valor(comM2(vendidas)),
        metragem: metragem && metragem > 0 ? metragem : null,
        custoRealizado: ateHoje ? ateHoje.realizado : null,
        custoOrcadoAteHoje: ateHoje?.orcado ?? null,
        custoOrcadoTotal: total?.orcado ?? null,
      };
    }),
  );
}

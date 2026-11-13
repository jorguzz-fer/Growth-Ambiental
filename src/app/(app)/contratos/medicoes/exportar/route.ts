import * as XLSX from "xlsx";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { listarContratos, relatorioDeMedicoes } from "@/lib/contratos-queries";
import { ROTULO_STATUS_MEDICAO, type StatusMedicao } from "@/lib/contrato-regras";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Exporta o relatório de medições em .xlsx (mesmo filtro da tela). */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "contratos", "ver")) return new Response("Não autorizado", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const pedido = sp.get("contrato");
  const contratoId = pedido && (await listarContratos(ctx.tenant.id)).some((c) => c.id === pedido) ? pedido : null;
  const { linhas, totais, contrato } = await relatorioDeMedicoes(ctx.tenant.id, { contratoId, status: sp.get("status"), de: sp.get("de"), ate: sp.get("ate") });
  const rows: (string | number)[][] = [["Nº", "Competência", "Início do período", "Fim do período", "Contrato", "Título", "Item", "Projeto", "Quantidade", "Percentual", "Valor", "Responsável", "Situação", "Aprovado por"]];
  for (const { m, codigoContrato, tituloContrato, item, itemDescricao, projeto } of linhas)
    rows.push([
      m.numero ?? "",
      m.competencia,
      m.periodoInicio ?? "",
      m.periodoFim ?? "",
      codigoContrato,
      tituloContrato,
      item ? `${item} · ${itemDescricao ?? ""}` : "",
      projeto ?? "",
      m.quantidade == null ? "" : Number(m.quantidade),
      m.percentual == null ? "" : Number(m.percentual),
      Number(m.valor),
      m.responsavel ?? m.createdBy ?? "",
      ROTULO_STATUS_MEDICAO[m.status as StatusMedicao] ?? m.status,
      m.aprovadoPor ?? "",
    ]);
  rows.push([]);
  rows.push(["Aprovado no filtro", totais.aprovado], ["Em aprovação", totais.emAprovacao], ["Rascunho", totais.rascunho]);
  if (contrato) rows.push(["Contrato", contrato.codigo], ["Valor original", contrato.original], ["Aditivos eficazes", contrato.aditivos], ["Valor atualizado", contrato.atualizado], ["Medido aprovado (acumulado)", contrato.medidoAprovado], ["Saldo a medir", contrato.saldoAMedir]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Medições");
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "contrato.medicao.exportar", entity: "contrato", entityId: contratoId, meta: { linhas: linhas.length } });
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Medicoes_contratos.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

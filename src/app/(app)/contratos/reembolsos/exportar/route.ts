import * as XLSX from "xlsx";
import { and, eq } from "drizzle-orm";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { db, schema } from "@/lib/db";
import { relatorioDeReembolsos } from "@/lib/contratos-queries";
import { ROTULO_STATUS_REEMBOLSO, type StatusReembolso } from "@/lib/contrato-regras";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Exporta o relatório de reembolsos em .xlsx (mesmo filtro da tela). */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "contratos", "ver") || !can(ctx.perms, "contratosfinanceiro", "ver")) return new Response("Não autorizado", { status: 403 });
  const sp = new URL(req.url).searchParams;
  let contratoId = sp.get("contrato");
  if (contratoId) {
    const [c] = await db.select({ id: schema.contratos.id }).from(schema.contratos).where(and(eq(schema.contratos.id, contratoId), eq(schema.contratos.tenantId, ctx.tenant.id))).limit(1);
    if (!c) contratoId = null;
  }
  const linhas = await relatorioDeReembolsos(ctx.tenant.id, { contratoId, de: sp.get("de"), ate: sp.get("ate") });
  const rows: (string | number)[][] = [["Contrato", "Título", "Despesa", "Data", "Competência", "Descrição", "Fornecedor", "Categoria DRE", "Conta", "Solicitado", "Aprovado", "Glosa", "Recebido", "Pendente", "Situação", "Comprovantes"]];
  for (const l of linhas)
    rows.push([l.contrato, l.tituloContrato, l.numDoc ?? "", l.data ?? "", l.competencia ?? "", l.descricao ?? "", l.fornecedor ?? "", l.categoria ?? "", l.conta ?? "", l.solicitado, l.aprovado ?? "", l.glosa, l.recebido, l.pendente, ROTULO_STATUS_REEMBOLSO[l.status as StatusReembolso] ?? l.status, l.comprovantes.join("; ")]);
  const tot = (k: "solicitado" | "recebido" | "pendente") => linhas.reduce((s, l) => s + l[k], 0);
  rows.push(["Total", "", "", "", "", "", "", "", "", tot("solicitado"), linhas.reduce((s, l) => s + (l.aprovado ?? 0), 0), linhas.reduce((s, l) => s + l.glosa, 0), tot("recebido"), tot("pendente"), "", ""]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Reembolsos");
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "contrato.reembolso.exportar", entity: "contrato", entityId: contratoId, meta: { linhas: linhas.length, de: sp.get("de"), ate: sp.get("ate") } });
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Reembolsos_contratos.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { linhasDeExportacao } from "@/lib/planocontas-regras";
import { categoriaDaConta } from "@/lib/categoria-do-plano";

export const dynamic = "force-dynamic";

/**
 * Exporta o Plano de Contas da empresa (XLSX ou CSV). As colunas são as que a
 * importação lê, para ida e volta: Código, Nome, Grupo, Natureza, Categoria DRE,
 * Descrição — mais grupo de 1º nível, classe gerencial, custo e situação.
 */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "planocontas", "ver")) return new Response("Não autorizado", { status: 403 });
  const formato = new URL(req.url).searchParams.get("formato") === "csv" ? "csv" : "xlsx";
  const [grupos, contas] = await Promise.all([
    db.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, ctx.tenant.id)),
    db.select().from(schema.chartAccounts).where(eq(schema.chartAccounts.tenantId, ctx.tenant.id)),
  ]);
  const linhas = linhasDeExportacao(grupos, contas, (c) => categoriaDaConta(c as (typeof contas)[number]));
  const ws = XLSX.utils.json_to_sheet(linhas);
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "chart.exportar", entity: "chart_account", meta: { formato, contas: linhas.length } });
  if (formato === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ";" });
    return new Response("﻿" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="plano-de-contas.csv"' } });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plano de Contas");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="plano-de-contas.xlsx"' },
  });
}

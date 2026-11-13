"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { recusaDeLimites } from "@/lib/ia-uso-regras";

/** 0083 — limites de consumo da IA da empresa (quem configura a IA: `diagnosticoia:editar`). */
export async function salvarLimitesDeIa(input: { pessoaHora?: string | number | null; empresaHora?: string | number | null; orcamentoMensalUsd?: string | number | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!can(ctx.perms, "diagnosticoia", "editar")) return { ok: false, error: "Sem permissão para configurar a IA." };
  const n = (v: unknown) => (v == null || String(v).trim() === "" ? null : Number(String(v).replace(",", ".")));
  const cfg = { conversasPessoaHora: n(input.pessoaHora), conversasEmpresaHora: n(input.empresaHora), orcamentoMensalUsd: n(input.orcamentoMensalUsd) };
  const recusa = recusaDeLimites(cfg);
  if (recusa) return { ok: false, error: recusa };
  const valores = { conversasPessoaHora: cfg.conversasPessoaHora, conversasEmpresaHora: cfg.conversasEmpresaHora, orcamentoMensalUsd: cfg.orcamentoMensalUsd == null ? null : String(cfg.orcamentoMensalUsd), updatedBy: ctx.userEmail ?? null, updatedAt: new Date() };
  await db.insert(schema.iaLimites).values({ tenantId: ctx.tenant.id, ...valores }).onConflictDoUpdate({ target: schema.iaLimites.tenantId, set: valores });
  await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "ia.limites", entity: "ia_limite", entityId: ctx.tenant.id, meta: cfg });
  revalidatePath("/diagnosticoia");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import type { PlanoDeConversao } from "@/lib/planocontas-conversao";
import { aplicarConversao, desfazerConversao, previaDaConversao, ultimaConversao } from "@/lib/planocontas-conversao-servidor";

/**
 * Conversão do Plano de Contas da empresa ATUAL para o plano de consultoria
 * ambiental. Reescreve códigos de referência (arquiva os antigos) e inativa o
 * plano anterior: por isso exige a permissão sensível de reclassificação
 * (owner/admin por padrão), além de editar o plano. Prévia antes, sempre.
 */
async function sessao() {
  const ctx = await getTenantContext();
  if (!ctx) return { error: "Sessão expirada. Entre de novo." } as const;
  if (!can(ctx.perms, "planocontas", "editar") || !can(ctx.perms, "planocontasreclass", "editar"))
    return { error: "Sem permissão para converter o Plano de Contas (owner ou administrador)." } as const;
  return { ctx } as const;
}

export async function previaDaConversaoDoPlano(): Promise<{ ok: true; plano: PlanoDeConversao; podeDesfazer: boolean } | { ok: false; error: string }> {
  const s = await sessao();
  if ("error" in s) return { ok: false, error: s.error! };
  const [plano, ultima] = await Promise.all([previaDaConversao(s.ctx.tenant.id), ultimaConversao(s.ctx.tenant.id)]);
  return { ok: true, plano, podeDesfazer: !!ultima };
}

export async function converterPlanoDaEmpresa(input: { confirmar: boolean; versao: string }): Promise<{ ok: true; aviso: string } | { ok: false; error: string }> {
  const s = await sessao();
  if ("error" in s) return { ok: false, error: s.error! };
  if (!input.confirmar) return { ok: false, error: "Confira a prévia e confirme a conversão." };
  const previa = await previaDaConversao(s.ctx.tenant.id);
  if (previa.versao !== input.versao) return { ok: false, error: "O plano padrão mudou desde a prévia. Abra a prévia de novo." };
  const r = await aplicarConversao(s.ctx.tenant.id, s.ctx.userId, s.ctx.userEmail ?? "usuário");
  revalidatePath("/planocontas");
  revalidatePath("/despesas");
  if (!r.aplicada) return { ok: true, aviso: "O plano já está no padrão de consultoria ambiental. Nada mudou." };
  const p = r.plano;
  return {
    ok: true,
    aviso: `Plano convertido: ${r.criadosGrupos} grupo(s) e ${r.criadasContas} conta(s) ambientais criados, ${p.resumo.contasAntigasAtivas} conta(s) antigas inativadas (histórico preservado), ${p.renomear.length} código(s) arquivados ou ajustados. Nenhum lançamento mudou de valor ou de categoria.`,
  };
}

export async function desfazerConversaoDoPlano(): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await sessao();
  if ("error" in s) return { ok: false, error: s.error! };
  const r = await desfazerConversao(s.ctx.tenant.id, s.ctx.userId);
  revalidatePath("/planocontas");
  return r;
}

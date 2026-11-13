import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { DEFAULT_INCC } from "@/lib/calc/constants";
import { instalarPlanoPadrao } from "@/lib/planocontas-padrao";
import { garantirModalidades } from "@/lib/contrato-modalidades";
import { garantirBiblioteca } from "@/lib/plano-biblioteca";
import { hashPassword } from "@/lib/password";

/**
 * Provisionamento de uma nova conta (tenant) com a estrutura padrão, para o
 * onboarding pelo super-admin da plataforma. Cria, de forma atômica:
 *  - o tenant;
 *  - o usuário responsável (owner) com senha inicial (reaproveita o usuário se
 *    o e-mail já existir — permite o mesmo dono em várias contas);
 *  - o vínculo owner;
 *  - 1 projeto com as 3 versões (Budget / Forecast / Atual);
 *  - o plano de contas (CEF + complementar);
 *  - a tabela INCC padrão.
 *
 * Não popula dados de movimento (unidades, despesas, etc.) — a conta nasce
 * utilizável e vazia, pronta para o cliente preencher.
 */
export interface ProvisionInput {
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  projectName: string;
}

export interface ProvisionResult {
  ok: boolean;
  error?: string;
  tenantId?: string;
  /** o e-mail do owner já existia e foi reaproveitado (senha preservada). */
  reusedUser?: boolean;
}

const VERSIONS_SEED = [
  { key: "budget", kind: "budget" as const, label: "Orçamento", color: "#6366f1", isDefault: false },
  { key: "forecast", kind: "forecast" as const, label: "Previsão Atualizada", color: "#10b981", isDefault: true },
  { key: "atual", kind: "atual" as const, label: "Atual — caixa real", color: "#f59e0b", isDefault: false },
];

export async function provisionTenant(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const tenantName = input.tenantName.trim();
  const ownerEmail = input.ownerEmail.trim().toLowerCase();
  const ownerName = input.ownerName.trim() || null;
  const projectName = input.projectName.trim() || "Projeto 1";

  if (!tenantName) return { ok: false, error: "Informe o nome da empresa." };
  if (!ownerEmail || !ownerEmail.includes("@"))
    return { ok: false, error: "Informe um e-mail válido para o responsável." };
  if (input.ownerPassword.length < 8)
    return {
      ok: false,
      error: "A senha do responsável precisa de no mínimo 8 caracteres.",
    };

  try {
    return await db.transaction(async (tx) => {
      // Owner: reaproveita se o e-mail já existir; senão cria com a senha.
      const [existing] = await tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, ownerEmail))
        .limit(1);

      let ownerId: string;
      let reusedUser = false;
      if (existing) {
        ownerId = existing.id;
        reusedUser = true;
        // Nunca sobrescreve senha existente; só define se ainda não houver.
        if (!existing.passwordHash) {
          await tx
            .update(schema.users)
            .set({
              passwordHash: hashPassword(input.ownerPassword),
              name: existing.name ?? ownerName,
            })
            .where(eq(schema.users.id, ownerId));
        }
      } else {
        const [u] = await tx
          .insert(schema.users)
          .values({
            email: ownerEmail,
            name: ownerName,
            passwordHash: hashPassword(input.ownerPassword),
          })
          .returning();
        ownerId = u.id;
      }

      const [tenant] = await tx
        .insert(schema.tenants)
        .values({ name: tenantName })
        .returning();

      await tx
        .insert(schema.memberships)
        .values({ userId: ownerId, tenantId: tenant.id, role: "owner" })
        .onConflictDoNothing();

      // Projeto + 3 versões.
      const [project] = await tx
        .insert(schema.projects)
        .values({
          tenantId: tenant.id,
          name: projectName,
          kind: "proj",
          status: "Em andamento",
          situacao: "Ativo",
          durationMonths: 24,
        })
        .returning();

      await tx.insert(schema.versions).values(
        VERSIONS_SEED.map((v) => ({
          ...v,
          projectId: project.id,
          tenantId: tenant.id,
        })),
      );

      // Plano de contas padrão (consultoria ambiental).
      // Grupos → subgrupos → contas, com categoria, classe gerencial e custo
      // direto/indireto explícitos; liga as chaves do plano (empresa nova).
      await instalarPlanoPadrao(tenant.id, tx);

      // Modalidades de serviço iniciais do módulo de Contratos (configuráveis).
      await garantirModalidades(tenant.id, tx);
      // Biblioteca padrão de fases e atividades (sugestões; configurável).
      await garantirBiblioteca(tenant.id, tx);

      // Tabela INCC padrão.
      await tx.insert(schema.inccRates).values(
        DEFAULT_INCC.map((r, i) => ({
          projectId: project.id,
          tenantId: tenant.id,
          mes: r.m,
          monthly: r.mo.toString(),
          accumulated: r.ac.toString(),
          ordem: i,
        })),
      );

      return { ok: true, tenantId: tenant.id, reusedUser };
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Falha ao provisionar a conta.",
    };
  }
}

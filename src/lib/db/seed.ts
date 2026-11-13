/**
 * Seed do banco — popula um tenant de demonstração (RMV / SIGNATURE SUARÃO).
 *
 * Uso: `node seed.mjs` (no container) ou `npm run db:seed` (local).
 * É IDEMPOTENTE e AUTO-CORRETIVO:
 *  - garante os usuários (owner + admins) com senha inicial, mesmo se o tenant
 *    já existir (corrige contas sem senha);
 *  - só insere os dados de demonstração (projeto/versões/contas/INCC/unidades)
 *    se ainda não existirem.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import {
  PAPEIS_STAKEHOLDER,
  DEFAULT_INCC,
} from "@/lib/calc/constants";
import { bla401, emptyUnit } from "@/lib/calc/__fixtures__";
import { hashPassword } from "@/lib/password";
import { PLANO_CONTAS_PADRAO, linhasDoPlano } from "@/lib/calc/plano-ambiental";
import { garantirModalidades } from "@/lib/contrato-modalidades";
import type { CalcUnit } from "@/lib/calc/types";

/** Senha inicial dos usuários semeados — TROCAR no primeiro acesso. */
const SENHA_INICIAL = "Trocar@2026";

type SeedRole = "owner" | "admin";

function planOf(u: CalcUnit) {
  const { code: _c, status: _s, valor: _v, ...plan } = u;
  void _c;
  void _s;
  void _v;
  return plan;
}

/** Garante o usuário (com senha se faltar) e o vínculo com o tenant. */
async function ensureUser(
  name: string,
  email: string,
  role: SeedRole,
  tenantId: string,
) {
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  let userId: string;
  if (existing) {
    userId = existing.id;
    if (!existing.passwordHash) {
      await db
        .update(schema.users)
        .set({ passwordHash: hashPassword(SENHA_INICIAL) })
        .where(eq(schema.users.id, userId));
      console.log(`  senha inicial definida para ${email}`);
    } else {
      console.log(`  ${email} já tem senha (mantida)`);
    }
  } else {
    const [u] = await db
      .insert(schema.users)
      .values({ name, email, passwordHash: hashPassword(SENHA_INICIAL) })
      .returning();
    userId = u.id;
    console.log(`  usuário criado: ${email}`);
  }

  await db
    .insert(schema.memberships)
    .values({ userId, tenantId, role })
    .onConflictDoNothing();
  return userId;
}

async function main() {
  // Tenant: encontra ou cria.
  let [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.name, "RMV Empreendimentos"))
    .limit(1);
  if (!tenant) {
    [tenant] = await db
      .insert(schema.tenants)
      .values({ name: "RMV Empreendimentos" })
      .returning();
    console.log("Tenant criado.");
  } else {
    console.log("Tenant já existe — garantindo usuários e dados.");
  }

  // Usuários SEMPRE garantidos (corrige contas sem senha).
  console.log("Garantindo usuários...");
  await ensureUser("RMV Admin", "admin@rmv.com.br", "owner", tenant.id);
  await ensureUser("Fernando Jorge", "fer.jorge@gmail.com", "admin", tenant.id);
  await ensureUser("Thiago Liberman", "thiago.liberman@gmail.com", "admin", tenant.id);

  // Dados de demonstração só se ainda não houver projeto.
  const [existingProject] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.tenantId, tenant.id))
    .limit(1);

  if (existingProject) {
    console.log("Dados de demonstração já existem — pulando.");
  } else {
    await seedDemoData(tenant.id);
  }

  console.log("\n✓ Seed concluído.");
  console.log(`Logins (senha inicial: ${SENHA_INICIAL} — troque no 1º acesso):`);
  console.log("  admin@rmv.com.br (owner)");
  console.log("  fer.jorge@gmail.com (admin)");
  console.log("  thiago.liberman@gmail.com (admin)");
}

async function seedDemoData(tenantId: string) {
  console.log("Criando projeto e versões...");
  const [project] = await db
    .insert(schema.projects)
    .values({
      tenantId,
      name: "SIGNATURE SUARÃO",
      kind: "proj",
      status: "Em andamento",
      durationMonths: 24,
    })
    .returning();

  const versionsSeed = [
    { key: "budget", kind: "budget" as const, label: "Orçamento", color: "#6366f1", isDefault: false },
    { key: "forecast", kind: "forecast" as const, label: "Previsão Atualizada", color: "#10b981", isDefault: true },
    { key: "atual", kind: "atual" as const, label: "Atual — caixa real", color: "#f59e0b", isDefault: false },
  ];
  const insertedVersions = await db
    .insert(schema.versions)
    .values(versionsSeed.map((v) => ({ ...v, projectId: project.id, tenantId })))
    .returning();
  const forecast = insertedVersions.find((v) => v.key === "forecast")!;

  console.log("Plano de contas (consultoria ambiental)...");
  const chartRows = linhasDoPlano(PLANO_CONTAS_PADRAO, tenantId);
  await db.insert(schema.chartAccounts).values(chartRows);
  await garantirModalidades(tenantId);
  console.log(`  ${chartRows.length} subitens.`);

  console.log("Tabela INCC (48 meses)...");
  await db.insert(schema.inccRates).values(
    DEFAULT_INCC.map((r, i) => ({
      projectId: project.id,
      tenantId,
      mes: r.m,
      monthly: r.mo.toString(),
      accumulated: r.ac.toString(),
      ordem: i,
    })),
  );

  console.log("Stakeholders e contas bancárias...");
  await db.insert(schema.stakeholders).values([
    { tenantId, nome: "Brasil Mix Concreto Ltda", tipo: "PJ", doc: "20.957.509/0001-34", papeis: ["Fornecedor de Material"] },
    { tenantId, nome: "Inácio de Sousa", tipo: "PF", doc: "332.641.358-09", papeis: ["Mão de Obra RPA"] },
    { tenantId, nome: "BMV Construções Ltda", tipo: "PJ", doc: "", papeis: ["Construtora"] },
  ]);
  void PAPEIS_STAKEHOLDER;

  await db.insert(schema.bankAccounts).values([
    { tenantId, banco: "Itaú", ag: "0039", cc: "99155-9", tipo: "Imobiliária" },
    { tenantId, banco: "Caixa", ag: "0742", op: "1292", cc: "579179671-0", tipo: "Construtora" },
    { tenantId, banco: "Inter", ag: "0001", cc: "28519646-4", tipo: "Imobiliária" },
    { tenantId, banco: "Caixa", ag: "0742", op: "1292", cc: "575733196-4", tipo: "Imobiliária" },
  ]);

  console.log("Unidades de amostra (versão forecast)...");
  const u401 = bla401();
  const u402 = emptyUnit("BLA 402", 539580);
  await db.insert(schema.units).values([
    {
      versionId: forecast.id,
      tenantId,
      code: u401.code,
      bloco: "A",
      tipo: "3D T1",
      m2: "77.83",
      andar: 4,
      valor: u401.valor.toString(),
      status: "Vendido",
      mesVenda: "01/27/2026",
      paymentPlan: planOf(u401),
    },
    {
      versionId: forecast.id,
      tenantId,
      code: u402.code,
      bloco: "A",
      tipo: "3D T2",
      m2: "78.20",
      andar: 4,
      valor: u402.valor.toString(),
      status: "Disponivel",
      paymentPlan: planOf(u402),
    },
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falha no seed:", err);
    process.exit(1);
  });

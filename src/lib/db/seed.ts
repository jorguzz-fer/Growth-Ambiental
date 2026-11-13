/**
 * Seed de DEMONSTRAÇÃO — opcional, nunca automático.
 *
 * O banco do Growth Ambiental funciona vazio: as migrações criam só a
 * estrutura, e empresas reais nascem pelo console da plataforma
 * (`/plataforma`, provisionamento). Este script cria UMA empresa de exemplo,
 * com dados inteiramente fictícios e marcados como tal, para avaliação local.
 *
 * Uso (local):
 *   SEED_ADMIN_EMAIL=voce@exemplo.com npm run db:seed
 * Em produção (NODE_ENV=production) ele se recusa a rodar, a menos que
 * SEED_DEMO_EM_PRODUCAO=sim seja definido de propósito.
 *
 * Sem e-mail ou senha fixos no código: o administrador vem de
 * SEED_ADMIN_EMAIL; a senha vem de SEED_ADMIN_PASSWORD ou é gerada
 * aleatoriamente e mostrada uma vez, e a troca é exigida no primeiro acesso.
 * Idempotente: rodar de novo não duplica a empresa nem os dados.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { DEFAULT_INCC } from "@/lib/calc/constants";
import { hashPassword } from "@/lib/password";
import { PLANO_CONTAS_PADRAO, linhasDoPlano } from "@/lib/calc/plano-ambiental";
import { garantirModalidades } from "@/lib/contrato-modalidades";

/** Nome da empresa de demonstração — fictícia e identificada como tal. */
export const EMPRESA_DEMO = "Consultoria Ambiental Exemplo (DEMONSTRAÇÃO)";

function senhaAleatoria(): string {
  // 16 caracteres, com maiúscula, minúscula, dígito e símbolo (passa na política).
  return `Demo-${randomBytes(9).toString("base64url")}9a`;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_EM_PRODUCAO !== "sim") {
    console.error("Recusado: NODE_ENV=production. O seed é só de demonstração. Para rodar mesmo assim, defina SEED_DEMO_EM_PRODUCAO=sim.");
    process.exit(1);
  }
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Defina SEED_ADMIN_EMAIL com o e-mail do administrador da empresa de demonstração.");
    process.exit(1);
  }

  let [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.name, EMPRESA_DEMO)).limit(1);
  if (!tenant) {
    [tenant] = await db.insert(schema.tenants).values({ name: EMPRESA_DEMO }).returning();
    console.log("Empresa de demonstração criada.");
  } else {
    console.log("Empresa de demonstração já existe — garantindo administrador e dados.");
  }

  const [existente] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  let senhaMostrada: string | null = null;
  let userId: string;
  if (existente) {
    userId = existente.id;
    console.log(`Administrador ${email} já existe (senha mantida).`);
  } else {
    const senha = process.env.SEED_ADMIN_PASSWORD?.trim() || senhaAleatoria();
    if (!process.env.SEED_ADMIN_PASSWORD) senhaMostrada = senha;
    const [u] = await db
      .insert(schema.users)
      .values({ name: "Administrador (demonstração)", email, passwordHash: hashPassword(senha), mustChangePassword: true })
      .returning();
    userId = u.id;
    console.log(`Administrador criado: ${email}`);
  }
  await db.insert(schema.memberships).values({ userId, tenantId: tenant.id, role: "owner" }).onConflictDoNothing();

  const [projeto] = await db.select({ id: schema.projects.id }).from(schema.projects).where(eq(schema.projects.tenantId, tenant.id)).limit(1);
  if (projeto) console.log("Dados de demonstração já existem — pulando.");
  else await seedDemoData(tenant.id);

  console.log("\n✓ Seed de demonstração concluído.");
  if (senhaMostrada) console.log(`Senha inicial (mostrada só agora; troca obrigatória no 1º acesso): ${senhaMostrada}`);
}

/**
 * Dados FICTÍCIOS: nomes com "Exemplo", documentos sintéticos (dígitos
 * verificadores válidos, raiz 000.000.00x), banco e conta de exemplo.
 */
async function seedDemoData(tenantId: string) {
  console.log("Projeto e versões...");
  const [project] = await db
    .insert(schema.projects)
    .values({ tenantId, name: "Projeto Exemplo — Monitoramento Ambiental", kind: "proj", status: "Em andamento", durationMonths: 12 })
    .returning();
  await db.insert(schema.versions).values(
    [
      { key: "budget", kind: "budget" as const, label: "Orçamento", color: "#6366f1", isDefault: false },
      { key: "forecast", kind: "forecast" as const, label: "Previsão Atualizada", color: "#10b981", isDefault: true },
      { key: "atual", kind: "atual" as const, label: "Atual — caixa real", color: "#f59e0b", isDefault: false },
    ].map((v) => ({ ...v, projectId: project.id, tenantId })),
  );

  console.log("Plano de contas (consultoria ambiental) e modalidades...");
  const chartRows = linhasDoPlano(PLANO_CONTAS_PADRAO, tenantId);
  await db.insert(schema.chartAccounts).values(chartRows);
  await garantirModalidades(tenantId);
  console.log(`  ${chartRows.length} contas.`);

  console.log("Índice de reajuste (série padrão)...");
  await db.insert(schema.inccRates).values(
    DEFAULT_INCC.map((r, i) => ({ projectId: project.id, tenantId, mes: r.m, monthly: r.mo.toString(), accumulated: r.ac.toString(), ordem: i })),
  );

  console.log("Cadastros fictícios...");
  await db.insert(schema.clientes).values({ tenantId, nomeCompleto: "Cliente Exemplo S.A. (fictício)", cpfCnpj: "00.000.004/0001-70" });
  await db.insert(schema.stakeholders).values([
    { tenantId, nome: "Laboratório Exemplo Ltda (fictício)", tipo: "PJ", doc: "00.000.001/0001-36", papeis: ["Prestador de Serviço"] },
    { tenantId, nome: "Consultor Exemplo (fictício)", tipo: "PF", doc: "000.000.001-91", papeis: ["Consultor/Assessor"] },
  ]);
  await db.insert(schema.bankAccounts).values({ tenantId, banco: "Banco Exemplo", ag: "0001", cc: "00000-0", tipo: "Construtora" });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falha no seed:", err);
    process.exit(1);
  });

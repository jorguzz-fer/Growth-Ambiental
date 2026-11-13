-- 0079 — Growth Ambiental: plano de contas hierárquico para consultorias.
--
-- ADITIVA. Uma tabela nova (grupos e subgrupos: os nós SINTÉTICOS do plano)
-- e colunas novas, nulas ou com padrão, em chart_account e despesa. Nenhuma
-- conta, código, categoria ou lançamento existente muda de valor.
--
-- Os lançamentos continuam apontando a conta pelo CÓDIGO (despesa.conta_cef)
-- e o Orçamento pelo código do grupo (row_key): por isso o código de conta
-- usada não muda e a hierarquia nova só organiza, sem trocar referências.
--
-- Empresas existentes: cada grupo atual (group_code) vira um nó de nível 1,
-- com o mesmo código e nome. O plano ambiental padrão NÃO é aplicado a elas
-- (só às novas, no provisionamento); a tela oferece a adoção, com prévia.

CREATE TABLE IF NOT EXISTS "chart_group" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "descricao" text,
  "parent_id" uuid REFERENCES "chart_group"("id") ON DELETE RESTRICT,
  "kind" "account_kind" DEFAULT 'complementar' NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chart_group_tenant_code_uq" UNIQUE ("tenant_id", "code"),
  CONSTRAINT "chart_group_sem_auto_pai" CHECK ("parent_id" IS NULL OR "parent_id" <> "id")
);
CREATE INDEX IF NOT EXISTS "chart_group_tenant_idx" ON "chart_group" ("tenant_id");
CREATE INDEX IF NOT EXISTS "chart_group_parent_idx" ON "chart_group" ("parent_id");

ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "descricao" text;
ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "ordem" integer DEFAULT 0 NOT NULL;
-- Classe gerencial (linha da DRE gerencial). Nula = derivada da categoria da DRE.
ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "classe_gerencial" text;
-- Custo direto/indireto PADRÃO da conta (o lançamento pode tratar diferente). Nula = não se aplica.
ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "tipo_custo" text;
-- Papel técnico usado por regra do sistema (ex.: juros_mora do acerto). Um por empresa.
ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "papel" text;
-- Controle de concorrência otimista da edição.
ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "versao" integer DEFAULT 1 NOT NULL;
ALTER TABLE "chart_account" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "chart_account_papel_uq" ON "chart_account" ("tenant_id", "papel") WHERE "papel" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "chart_account_tenant_group_idx" ON "chart_account" ("tenant_id", "group_code");

-- Tratamento específico do lançamento (direto/indireto); nula = o padrão da conta.
ALTER TABLE "despesa" ADD COLUMN IF NOT EXISTS "tipo_custo" text;
CREATE INDEX IF NOT EXISTS "despesa_tenant_conta_idx" ON "despesa" ("tenant_id", "conta_cef");

-- Grupos atuais viram nós de nível 1 (mesmo código e nome).
INSERT INTO "chart_group" ("tenant_id", "code", "name", "kind", "ordem")
SELECT a."tenant_id", a."group_code", max(a."group_name"), min(a."kind"::text)::"account_kind", 0
FROM "chart_account" a
GROUP BY a."tenant_id", a."group_code"
ON CONFLICT ("tenant_id", "code") DO NOTHING;

-- Papéis técnicos das contas que o acerto já usa pelo código histórico.
UPDATE "chart_account" a SET "papel" = 'juros_mora'
WHERE a."code" = 'F.6' AND a."papel" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "chart_account" b WHERE b."tenant_id" = a."tenant_id" AND b."papel" = 'juros_mora');
UPDATE "chart_account" a SET "papel" = 'descontos_obtidos'
WHERE a."code" = 'F.7' AND a."papel" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "chart_account" b WHERE b."tenant_id" = a."tenant_id" AND b."papel" = 'descontos_obtidos');

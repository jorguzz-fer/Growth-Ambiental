-- 0083 — Cris avançada e implantação (onboarding). ADITIVA.
--  · contrato.idempotency_key: o mesmo contrato (ex.: proposto pela Cris e
--    confirmado duas vezes) entra uma vez só;
--  · ia_limite: limites de consumo da IA configuráveis por empresa (nulo =
--    o padrão do sistema) e orçamento mensal estimado opcional;
--  · implantacao_etapa / implantacao_treinamento: acompanhamento da
--    implantação de cada empresa (etapas, responsáveis, datas, situação,
--    dependências, evidências) e dos treinamentos por perfil.
ALTER TABLE "contrato" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contrato_idem_uq" ON "contrato" ("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ia_limite" (
  "tenant_id" uuid PRIMARY KEY NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "conversas_pessoa_hora" integer,
  "conversas_empresa_hora" integer,
  "orcamento_mensal_usd" numeric(12, 2),
  "updated_by" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implantacao_etapa" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "grupo" text NOT NULL,
  "codigo" text NOT NULL,
  "titulo" text NOT NULL,
  "descricao" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "responsavel" text,
  "previsto" text,
  "realizado" text,
  "status" text DEFAULT 'nao_iniciada' NOT NULL,
  "depende_de" text,
  "observacoes" text,
  "evidencia" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "implantacao_etapa_codigo_uq" UNIQUE ("tenant_id", "codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implantacao_treinamento" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "perfil" text NOT NULL,
  "tema" text NOT NULL,
  "participante" text,
  "data" text,
  "status" text DEFAULT 'planejado' NOT NULL,
  "pendencias" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "implantacao_treinamento_tenant_idx" ON "implantacao_treinamento" ("tenant_id");

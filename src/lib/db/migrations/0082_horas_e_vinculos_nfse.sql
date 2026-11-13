-- 0082 — Integração operacional: apontamento de horas e vínculos da NFS-e.
--
-- ADITIVA. Nada existente muda de valor.
--  · apontamento_hora: horas PLANEJADAS ou REALIZADAS de um profissional
--    (funcionário OU cadastro de pessoa/prestador) num projeto — ou em
--    atividade interna (administrativo) —, com contrato, fase e atividade
--    opcionais. Custo-hora é um retrato gravado (gerencial): apontar horas
--    NÃO gera despesa nem lançamento financeiro.
--  · equipe_projeto.custo_hora: base opcional do custo gerencial da alocação.
--  · nota_servico: cliente, contrato e medição de contrato (opcionais).
CREATE TABLE IF NOT EXISTS "apontamento_hora" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "tipo" text NOT NULL DEFAULT 'realizado',
  "funcionario_id" uuid REFERENCES "funcionario"("id") ON DELETE RESTRICT,
  "stakeholder_id" uuid REFERENCES "stakeholder"("id") ON DELETE RESTRICT,
  "project_id" uuid REFERENCES "project"("id") ON DELETE CASCADE,
  "atividade_interna" text,
  "contrato_id" uuid REFERENCES "contrato"("id") ON DELETE SET NULL,
  "projeto_fase_id" uuid REFERENCES "projeto_fase"("id") ON DELETE SET NULL,
  "projeto_atividade_id" uuid REFERENCES "projeto_atividade"("id") ON DELETE SET NULL,
  "data" text NOT NULL,
  "competencia" text NOT NULL,
  "horas" numeric(8, 2) NOT NULL,
  "custo_hora" numeric(15, 2),
  "descricao" text,
  "idempotency_key" text,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "apontamento_hora_um_profissional" CHECK (("funcionario_id" IS NULL) <> ("stakeholder_id" IS NULL)),
  CONSTRAINT "apontamento_hora_destino" CHECK (("project_id" IS NOT NULL) OR ("atividade_interna" IS NOT NULL)),
  CONSTRAINT "apontamento_hora_horas" CHECK ("horas" > 0 AND ("tipo" = 'planejado' OR "horas" <= 24) AND "horas" <= 744)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "apontamento_hora_tenant_comp_idx" ON "apontamento_hora" ("tenant_id", "competencia");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "apontamento_hora_project_idx" ON "apontamento_hora" ("project_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "apontamento_hora_idem_uq" ON "apontamento_hora" ("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "equipe_projeto" ADD COLUMN IF NOT EXISTS "custo_hora" numeric(15, 2);
--> statement-breakpoint
ALTER TABLE "nota_servico" ADD COLUMN IF NOT EXISTS "cliente_id" uuid REFERENCES "cliente"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "nota_servico" ADD COLUMN IF NOT EXISTS "contrato_id" uuid REFERENCES "contrato"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "nota_servico" ADD COLUMN IF NOT EXISTS "contrato_medicao_id" uuid REFERENCES "contrato_medicao"("id") ON DELETE SET NULL;

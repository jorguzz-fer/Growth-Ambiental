-- 0077 — Growth Ambiental: módulo de Contratos e Aditivos.
--
-- ADITIVA: oito tabelas novas, vazias, e seis colunas novas, nulas. Nenhuma
-- linha existente é alterada ou removida; nenhum número de tela muda (a DRE e
-- o Fluxo leem conta_receber e despesa como sempre — a coluna contrato_id só
-- diz a que contrato a linha pertence).
--
-- * contrato_modalidade: modalidades de serviço por empresa (semeadas abaixo).
-- * contrato / contrato_projeto: o contrato e seus projetos (N:N).
-- * contrato_item / contrato_marco: itens contratuais e cronograma.
-- * contrato_aditivo / contrato_aditivo_item: aditivos guardam a VARIAÇÃO; o
--   valor original do contrato nunca é reescrito.
-- * contrato_medicao: medição por contrato e item, com aprovação e chave de
--   idempotência.
-- * contrato_reembolso: despesa reembolsável pelo contratante (vínculo com a
--   despesa existente; uma despesa ativa em um reembolso só).
-- * conta_receber.contrato_id / idempotency_key, despesa.contrato_id,
--   document.contrato_id / contrato_aditivo_id / contrato_medicao_id.

CREATE TABLE IF NOT EXISTS "contrato_modalidade" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "nome" text NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "contrato_modalidade_tenant_nome_uq" UNIQUE ("tenant_id", "nome")
);

CREATE TABLE IF NOT EXISTS "contrato" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "codigo" text NOT NULL,
  "numero_cliente" text,
  "titulo" text NOT NULL,
  "cliente_id" uuid REFERENCES "cliente"("id") ON DELETE SET NULL,
  "objeto" text,
  "escopo" text,
  "modalidade_id" uuid REFERENCES "contrato_modalidade"("id") ON DELETE SET NULL,
  "contrato_principal_id" uuid REFERENCES "contrato"("id") ON DELETE RESTRICT,
  "tipo" text DEFAULT 'contrato' NOT NULL,
  "vinculo_valor" text,
  "gestor" text,
  "coordenador_tecnico" text,
  "responsavel_comercial" text,
  "responsavel_financeiro" text,
  "data_assinatura" text,
  "data_inicio" text,
  "data_termino_prevista" text,
  "data_encerramento" text,
  "data_base_reajuste" text,
  "valor_original" numeric(15, 2) DEFAULT '0' NOT NULL,
  "moeda" text DEFAULT 'BRL' NOT NULL,
  "forma_faturamento" text,
  "condicao_pagamento" text,
  "periodicidade_medicao" text,
  "prazo_pagamento_dias" integer,
  "indice_reajuste" text,
  "retencao_pct" numeric(8, 4),
  "regras_reembolso" text,
  "status" text DEFAULT 'rascunho' NOT NULL,
  "motivo_status" text,
  "versao" integer DEFAULT 1 NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "contrato_tenant_codigo_uq" UNIQUE ("tenant_id", "codigo")
);
CREATE INDEX IF NOT EXISTS "contrato_tenant_idx" ON "contrato" ("tenant_id");
CREATE INDEX IF NOT EXISTS "contrato_principal_idx" ON "contrato" ("contrato_principal_id");
CREATE INDEX IF NOT EXISTS "contrato_cliente_idx" ON "contrato" ("cliente_id");

CREATE TABLE IF NOT EXISTS "contrato_projeto" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "contrato_id" uuid NOT NULL REFERENCES "contrato"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "valor_alocado" numeric(15, 2),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "contrato_projeto_uq" UNIQUE ("contrato_id", "project_id")
);
CREATE INDEX IF NOT EXISTS "contrato_projeto_project_idx" ON "contrato_projeto" ("project_id");

CREATE TABLE IF NOT EXISTS "contrato_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "contrato_id" uuid NOT NULL REFERENCES "contrato"("id") ON DELETE CASCADE,
  "codigo" text NOT NULL,
  "descricao" text NOT NULL,
  "unidade" text,
  "quantidade" numeric(15, 4) DEFAULT '1' NOT NULL,
  "valor_unitario" numeric(15, 2) DEFAULT '0' NOT NULL,
  "valor_total" numeric(15, 2) DEFAULT '0' NOT NULL,
  "project_id" uuid REFERENCES "project"("id") ON DELETE SET NULL,
  "etapa" text,
  "inicio_previsto" text,
  "conclusao_prevista" text,
  "criterio_medicao" text DEFAULT 'percentual' NOT NULL,
  "condicao_faturamento" text,
  "responsavel" text,
  "status" text DEFAULT 'ativo' NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  "origem_aditivo_id" uuid,
  "cancelado" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "contrato_item_codigo_uq" UNIQUE ("contrato_id", "codigo")
);
CREATE INDEX IF NOT EXISTS "contrato_item_contrato_idx" ON "contrato_item" ("contrato_id");

CREATE TABLE IF NOT EXISTS "contrato_aditivo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "contrato_id" uuid NOT NULL REFERENCES "contrato"("id") ON DELETE CASCADE,
  "numero" integer NOT NULL,
  "codigo" text NOT NULL,
  "tipos" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "descricao" text,
  "justificativa" text,
  "valor_delta" numeric(15, 2) DEFAULT '0' NOT NULL,
  "novo_termino" text,
  "data_solicitacao" text,
  "data_aprovacao" text,
  "data_assinatura" text,
  "inicio_vigencia" text,
  "responsavel" text,
  "status" text DEFAULT 'rascunho' NOT NULL,
  "motivo_status" text,
  "aprovado_por" text,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "contrato_aditivo_numero_uq" UNIQUE ("contrato_id", "numero")
);
CREATE INDEX IF NOT EXISTS "contrato_aditivo_contrato_idx" ON "contrato_aditivo" ("contrato_id");

DO $$ BEGIN
  ALTER TABLE "contrato_item" ADD CONSTRAINT "contrato_item_origem_aditivo_fk"
    FOREIGN KEY ("origem_aditivo_id") REFERENCES "contrato_aditivo"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "contrato_aditivo_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "aditivo_id" uuid NOT NULL REFERENCES "contrato_aditivo"("id") ON DELETE CASCADE,
  "item_id" uuid NOT NULL REFERENCES "contrato_item"("id") ON DELETE CASCADE,
  "delta_quantidade" numeric(15, 4) DEFAULT '0' NOT NULL,
  "delta_valor" numeric(15, 2) DEFAULT '0' NOT NULL,
  CONSTRAINT "contrato_aditivo_item_uq" UNIQUE ("aditivo_id", "item_id")
);

CREATE TABLE IF NOT EXISTS "contrato_marco" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "contrato_id" uuid NOT NULL REFERENCES "contrato"("id") ON DELETE CASCADE,
  "item_id" uuid REFERENCES "contrato_item"("id") ON DELETE SET NULL,
  "etapa" text NOT NULL,
  "descricao" text,
  "data_planejada" text,
  "data_realizada" text,
  "valor_previsto" numeric(15, 2) DEFAULT '0' NOT NULL,
  "responsavel" text,
  "status" text DEFAULT 'previsto' NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  "cancelado" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "contrato_marco_contrato_idx" ON "contrato_marco" ("contrato_id");

CREATE TABLE IF NOT EXISTS "contrato_medicao" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "contrato_id" uuid NOT NULL REFERENCES "contrato"("id") ON DELETE CASCADE,
  "item_id" uuid REFERENCES "contrato_item"("id") ON DELETE RESTRICT,
  "project_id" uuid REFERENCES "project"("id") ON DELETE SET NULL,
  "marco_id" uuid REFERENCES "contrato_marco"("id") ON DELETE SET NULL,
  "etapa" text,
  "competencia" text NOT NULL,
  "quantidade" numeric(15, 4),
  "percentual" numeric(8, 4),
  "valor" numeric(15, 2) DEFAULT '0' NOT NULL,
  "responsavel" text,
  "data_medicao" text,
  "status" text DEFAULT 'rascunho' NOT NULL,
  "motivo_status" text,
  "obs" text,
  "aprovado_por" text,
  "aprovado_em" timestamp,
  "idempotency_key" text,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "contrato_medicao_contrato_idx" ON "contrato_medicao" ("contrato_id");
CREATE UNIQUE INDEX IF NOT EXISTS "contrato_medicao_idem_uq" ON "contrato_medicao" ("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "contrato_reembolso" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "contrato_id" uuid NOT NULL REFERENCES "contrato"("id") ON DELETE CASCADE,
  "despesa_id" uuid NOT NULL REFERENCES "despesa"("id") ON DELETE RESTRICT,
  "valor_solicitado" numeric(15, 2) DEFAULT '0' NOT NULL,
  "valor_aprovado" numeric(15, 2),
  "status" text DEFAULT 'pendente' NOT NULL,
  "condicao" text,
  "obs" text,
  "conta_receber_id" uuid REFERENCES "conta_receber"("id") ON DELETE SET NULL,
  "cancelado" boolean DEFAULT false NOT NULL,
  "motivo_cancelamento" text,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "contrato_reembolso_contrato_idx" ON "contrato_reembolso" ("contrato_id");
CREATE UNIQUE INDEX IF NOT EXISTS "contrato_reembolso_despesa_ativa_uq" ON "contrato_reembolso" ("despesa_id") WHERE "cancelado" = false;

ALTER TABLE "conta_receber" ADD COLUMN IF NOT EXISTS "contrato_id" uuid REFERENCES "contrato"("id") ON DELETE SET NULL;
ALTER TABLE "conta_receber" ADD COLUMN IF NOT EXISTS "idempotency_key" text;
CREATE INDEX IF NOT EXISTS "conta_receber_contrato_idx" ON "conta_receber" ("contrato_id");
CREATE UNIQUE INDEX IF NOT EXISTS "conta_receber_idem_uq" ON "conta_receber" ("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;

ALTER TABLE "despesa" ADD COLUMN IF NOT EXISTS "contrato_id" uuid REFERENCES "contrato"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "despesa_contrato_idx" ON "despesa" ("contrato_id");

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "contrato_id" uuid REFERENCES "contrato"("id") ON DELETE SET NULL;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "contrato_aditivo_id" uuid REFERENCES "contrato_aditivo"("id") ON DELETE SET NULL;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "contrato_medicao_id" uuid REFERENCES "contrato_medicao"("id") ON DELETE SET NULL;

-- Modalidades iniciais para as empresas que já existem (configuráveis depois;
-- empresa nova recebe as mesmas no provisionamento). Só insere; não altera.
INSERT INTO "contrato_modalidade" ("tenant_id", "nome", "ordem")
SELECT t."id", m."nome", m."ordem"
FROM "tenant" t
CROSS JOIN (VALUES
  ('Consultoria e estudos ambientais', 1),
  ('Licenciamento ambiental', 2),
  ('Monitoramento ambiental', 3),
  ('Arqueologia e patrimônio cultural', 4),
  ('Prospecção arqueológica', 5),
  ('Resgate e salvamento arqueológico', 6),
  ('Monitoramento de fauna', 7),
  ('Resgate de fauna', 8),
  ('Inventário e manejo de flora', 9),
  ('Educação ambiental e patrimonial', 10),
  ('Geoprocessamento e cartografia', 11),
  ('Consultoria técnica especializada', 12),
  ('Outros serviços', 13)
) AS m("nome", "ordem")
ON CONFLICT ("tenant_id", "nome") DO NOTHING;

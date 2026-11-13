-- 0078 — Growth Ambiental: planejamento de projetos (biblioteca de fases e
-- atividades, modelos por modalidade e plano de trabalho por projeto).
--
-- ADITIVA: oito tabelas novas e cinco colunas novas, nulas. Nenhum projeto,
-- despesa ou documento existente é alterado. A biblioteca padrão (7 fases
-- genéricas, SUGESTÕES — nenhuma obrigatória) é semeada para as empresas que
-- já existem; empresa nova a recebe no provisionamento.
--
-- Biblioteca/modelos e plano do projeto são INDEPENDENTES: o plano guarda uma
-- cópia do texto e, no máximo, a origem com ON DELETE SET NULL — apagar ou
-- mudar um modelo nunca altera projeto existente.

CREATE TABLE IF NOT EXISTS "plano_modelo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "nome" text NOT NULL,
  "descricao" text,
  "biblioteca" boolean DEFAULT false NOT NULL,
  "modalidade_id" uuid REFERENCES "contrato_modalidade"("id") ON DELETE SET NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "ordem" integer DEFAULT 0 NOT NULL,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "plano_modelo_tenant_idx" ON "plano_modelo" ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "plano_modelo_biblioteca_uq" ON "plano_modelo" ("tenant_id") WHERE "biblioteca" = true;

CREATE TABLE IF NOT EXISTS "plano_modelo_fase" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "modelo_id" uuid NOT NULL REFERENCES "plano_modelo"("id") ON DELETE CASCADE,
  "nome" text NOT NULL,
  "descricao" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "sugerida" boolean DEFAULT true NOT NULL
);
CREATE INDEX IF NOT EXISTS "plano_modelo_fase_modelo_idx" ON "plano_modelo_fase" ("modelo_id");

CREATE TABLE IF NOT EXISTS "plano_modelo_atividade" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "fase_id" uuid NOT NULL REFERENCES "plano_modelo_fase"("id") ON DELETE CASCADE,
  "parent_id" uuid REFERENCES "plano_modelo_atividade"("id") ON DELETE CASCADE,
  "tipo" text DEFAULT 'atividade' NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "ativo" boolean DEFAULT true NOT NULL,
  "sugerida" boolean DEFAULT true NOT NULL
);
CREATE INDEX IF NOT EXISTS "plano_modelo_atividade_fase_idx" ON "plano_modelo_atividade" ("fase_id");

CREATE TABLE IF NOT EXISTS "projeto_fase" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "codigo" text,
  "nome" text NOT NULL,
  "descricao" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "responsavel" text,
  "inicio_previsto" text,
  "termino_previsto" text,
  "inicio_original" text,
  "termino_original" text,
  "inicio_real" text,
  "termino_real" text,
  "status" text DEFAULT 'planejada' NOT NULL,
  "percentual" numeric(5, 2),
  "peso" numeric(8, 2),
  "obs" text,
  "origem_modelo_fase_id" uuid REFERENCES "plano_modelo_fase"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "projeto_fase_project_idx" ON "projeto_fase" ("project_id");

CREATE TABLE IF NOT EXISTS "projeto_atividade" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "fase_id" uuid NOT NULL REFERENCES "projeto_fase"("id") ON DELETE CASCADE,
  "parent_id" uuid REFERENCES "projeto_atividade"("id") ON DELETE CASCADE,
  "codigo" text,
  "nome" text NOT NULL,
  "descricao" text,
  "ordem" integer DEFAULT 0 NOT NULL,
  "responsavel" text,
  "funcionario_id" uuid REFERENCES "funcionario"("id") ON DELETE SET NULL,
  "funcao_id" uuid REFERENCES "funcao_equipe"("id") ON DELETE SET NULL,
  "inicio_previsto" text,
  "termino_previsto" text,
  "inicio_original" text,
  "termino_original" text,
  "inicio_real" text,
  "termino_real" text,
  "status" text DEFAULT 'planejada' NOT NULL,
  "percentual" numeric(5, 2),
  "peso" numeric(8, 2),
  "horas_previstas" numeric(10, 2),
  "horas_realizadas" numeric(10, 2),
  "contrato_item_id" uuid REFERENCES "contrato_item"("id") ON DELETE SET NULL,
  "obs" text,
  "origem_modelo_atividade_id" uuid REFERENCES "plano_modelo_atividade"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "projeto_atividade_fase_idx" ON "projeto_atividade" ("fase_id");
CREATE INDEX IF NOT EXISTS "projeto_atividade_project_idx" ON "projeto_atividade" ("project_id");

CREATE TABLE IF NOT EXISTS "projeto_entrega" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "fase_id" uuid REFERENCES "projeto_fase"("id") ON DELETE SET NULL,
  "atividade_id" uuid REFERENCES "projeto_atividade"("id") ON DELETE SET NULL,
  "tipo" text DEFAULT 'entrega' NOT NULL,
  "nome" text NOT NULL,
  "descricao" text,
  "responsavel" text,
  "data_prevista" text,
  "data_original" text,
  "data_efetiva" text,
  "status" text DEFAULT 'prevista' NOT NULL,
  "contrato_id" uuid REFERENCES "contrato"("id") ON DELETE SET NULL,
  "contrato_item_id" uuid REFERENCES "contrato_item"("id") ON DELETE SET NULL,
  "valor" numeric(15, 2),
  "ordem" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "projeto_entrega_project_idx" ON "projeto_entrega" ("project_id");

CREATE TABLE IF NOT EXISTS "projeto_plano_importacao" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "project_id" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "chave" text NOT NULL,
  "origem" text NOT NULL,
  "resumo" jsonb,
  "created_by" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "projeto_plano_importacao_chave_uq" UNIQUE ("tenant_id", "chave")
);

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "projeto_fase_id" uuid REFERENCES "projeto_fase"("id") ON DELETE SET NULL;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "projeto_atividade_id" uuid REFERENCES "projeto_atividade"("id") ON DELETE SET NULL;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "projeto_entrega_id" uuid REFERENCES "projeto_entrega"("id") ON DELETE SET NULL;
ALTER TABLE "despesa" ADD COLUMN IF NOT EXISTS "projeto_fase_id" uuid REFERENCES "projeto_fase"("id") ON DELETE SET NULL;
ALTER TABLE "despesa" ADD COLUMN IF NOT EXISTS "projeto_atividade_id" uuid REFERENCES "projeto_atividade"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "despesa_projeto_fase_idx" ON "despesa" ("projeto_fase_id");

-- Biblioteca padrão das empresas existentes (sugestões; só insere, idempotente).
INSERT INTO "plano_modelo" ("tenant_id", "nome", "descricao", "biblioteca", "ordem")
SELECT t."id", 'Biblioteca padrão', 'Sugestões genéricas da empresa. Nenhuma fase é obrigatória.', true, 0
FROM "tenant" t
ON CONFLICT ("tenant_id") WHERE "biblioteca" = true DO NOTHING;

INSERT INTO "plano_modelo_fase" ("tenant_id", "modelo_id", "nome", "ordem")
SELECT m."tenant_id", m."id", f."nome", f."ordem"
FROM "plano_modelo" m
CROSS JOIN (VALUES
  ('Planejamento e mobilização', 1),
  ('Diagnóstico e levantamentos preliminares', 2),
  ('Execução dos serviços técnicos', 3),
  ('Monitoramento e acompanhamento', 4),
  ('Análise e consolidação', 5),
  ('Relatórios e entregas', 6),
  ('Encerramento', 7)
) AS f("nome", "ordem")
WHERE m."biblioteca" = true
  AND NOT EXISTS (SELECT 1 FROM "plano_modelo_fase" x WHERE x."modelo_id" = m."id");

INSERT INTO "plano_modelo_atividade" ("tenant_id", "fase_id", "nome", "ordem")
SELECT f."tenant_id", f."id", a."nome", a."ordem"
FROM "plano_modelo_fase" f
JOIN "plano_modelo" m ON m."id" = f."modelo_id" AND m."biblioteca" = true
JOIN (VALUES
  ('Planejamento e mobilização', 'Análise documental', 1),
  ('Planejamento e mobilização', 'Planejamento das atividades', 2),
  ('Planejamento e mobilização', 'Mobilização de equipe', 3),
  ('Planejamento e mobilização', 'Preparação logística', 4),
  ('Diagnóstico e levantamentos preliminares', 'Levantamento bibliográfico', 1),
  ('Diagnóstico e levantamentos preliminares', 'Levantamento de campo', 2),
  ('Diagnóstico e levantamentos preliminares', 'Diagnóstico técnico', 3),
  ('Diagnóstico e levantamentos preliminares', 'Consolidação dos resultados preliminares', 4),
  ('Execução dos serviços técnicos', 'Execução das atividades de campo', 1),
  ('Execução dos serviços técnicos', 'Registro de ocorrências', 2),
  ('Execução dos serviços técnicos', 'Coleta e tratamento de dados', 3),
  ('Execução dos serviços técnicos', 'Supervisão técnica', 4),
  ('Monitoramento e acompanhamento', 'Campanhas de monitoramento', 1),
  ('Monitoramento e acompanhamento', 'Acompanhamento de atividades', 2),
  ('Monitoramento e acompanhamento', 'Registro e análise dos resultados', 3),
  ('Análise e consolidação', 'Tratamento dos dados', 1),
  ('Análise e consolidação', 'Análises técnicas', 2),
  ('Análise e consolidação', 'Consolidação de informações', 3),
  ('Relatórios e entregas', 'Elaboração de relatórios', 1),
  ('Relatórios e entregas', 'Revisão técnica', 2),
  ('Relatórios e entregas', 'Entrega de produtos', 3),
  ('Relatórios e entregas', 'Protocolo e apresentação ao cliente', 4),
  ('Encerramento', 'Validação das entregas', 1),
  ('Encerramento', 'Desmobilização', 2),
  ('Encerramento', 'Encerramento administrativo', 3),
  ('Encerramento', 'Encerramento financeiro', 4)
) AS a("fase", "nome", "ordem") ON a."fase" = f."nome"
WHERE NOT EXISTS (SELECT 1 FROM "plano_modelo_atividade" x WHERE x."fase_id" = f."id");

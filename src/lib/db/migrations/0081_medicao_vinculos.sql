-- 0081 — Medição de serviço: número, período e vínculos com o plano de trabalho.
--
-- ADITIVA. Colunas novas, nulas, em contrato_medicao:
--  · numero: sequencial por contrato (1, 2, 3…), atribuído na criação; as
--    medições já existentes recebem o número pela ordem de criação;
--  · periodo_inicio / periodo_fim: período executado (MM/DD/YYYY), além da
--    competência (MM/YYYY) que já existia;
--  · aditivo_id: o aditivo que autorizou o serviço medido, quando houver;
--  · projeto_fase_id / projeto_atividade_id / projeto_entrega_id: o que foi
--    executado, no plano de trabalho do projeto.
-- Nenhum valor, status ou limite existente muda.
ALTER TABLE "contrato_medicao" ADD COLUMN IF NOT EXISTS "numero" integer;
--> statement-breakpoint
ALTER TABLE "contrato_medicao" ADD COLUMN IF NOT EXISTS "periodo_inicio" text;
--> statement-breakpoint
ALTER TABLE "contrato_medicao" ADD COLUMN IF NOT EXISTS "periodo_fim" text;
--> statement-breakpoint
ALTER TABLE "contrato_medicao" ADD COLUMN IF NOT EXISTS "aditivo_id" uuid REFERENCES "contrato_aditivo"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "contrato_medicao" ADD COLUMN IF NOT EXISTS "projeto_fase_id" uuid REFERENCES "projeto_fase"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "contrato_medicao" ADD COLUMN IF NOT EXISTS "projeto_atividade_id" uuid REFERENCES "projeto_atividade"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "contrato_medicao" ADD COLUMN IF NOT EXISTS "projeto_entrega_id" uuid REFERENCES "projeto_entrega"("id") ON DELETE SET NULL;
--> statement-breakpoint
UPDATE "contrato_medicao" m SET "numero" = o.n
FROM (SELECT "id", row_number() OVER (PARTITION BY "contrato_id" ORDER BY "created_at", "id") AS n FROM "contrato_medicao") o
WHERE m."id" = o."id" AND m."numero" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contrato_medicao_numero_uq" ON "contrato_medicao" ("contrato_id", "numero") WHERE "numero" IS NOT NULL;

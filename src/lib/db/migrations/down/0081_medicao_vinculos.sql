-- Desfaz a 0081 (só colunas novas e o índice; nenhum dado anterior foi alterado).
DROP INDEX IF EXISTS "contrato_medicao_numero_uq";
ALTER TABLE "contrato_medicao" DROP COLUMN IF EXISTS "projeto_entrega_id";
ALTER TABLE "contrato_medicao" DROP COLUMN IF EXISTS "projeto_atividade_id";
ALTER TABLE "contrato_medicao" DROP COLUMN IF EXISTS "projeto_fase_id";
ALTER TABLE "contrato_medicao" DROP COLUMN IF EXISTS "aditivo_id";
ALTER TABLE "contrato_medicao" DROP COLUMN IF EXISTS "periodo_fim";
ALTER TABLE "contrato_medicao" DROP COLUMN IF EXISTS "periodo_inicio";
ALTER TABLE "contrato_medicao" DROP COLUMN IF EXISTS "numero";

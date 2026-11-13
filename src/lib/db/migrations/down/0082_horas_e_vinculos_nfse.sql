-- Desfaz a 0082 (tabela e colunas novas; nenhum dado anterior foi alterado).
ALTER TABLE "nota_servico" DROP COLUMN IF EXISTS "contrato_medicao_id";
ALTER TABLE "nota_servico" DROP COLUMN IF EXISTS "contrato_id";
ALTER TABLE "nota_servico" DROP COLUMN IF EXISTS "cliente_id";
ALTER TABLE "equipe_projeto" DROP COLUMN IF EXISTS "custo_hora";
DROP TABLE IF EXISTS "apontamento_hora";

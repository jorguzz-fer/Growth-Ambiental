-- Desfaz a 0083 (tabelas e coluna novas; nenhum dado anterior foi alterado).
DROP TABLE IF EXISTS "implantacao_treinamento";
DROP TABLE IF EXISTS "implantacao_etapa";
DROP TABLE IF EXISTS "ia_limite";
DROP INDEX IF EXISTS "contrato_idem_uq";
ALTER TABLE "contrato" DROP COLUMN IF EXISTS "idempotency_key";

-- ROLLBACK da 0077 (ver docs/ROLLBACK.md). Remove o módulo de Contratos.
-- Atenção: contratos, itens, aditivos, marcos, medições de contrato,
-- reembolsos e modalidades se perdem. As contas a receber, despesas e
-- documentos continuam (só perdem o vínculo com o contrato).
ALTER TABLE "document" DROP COLUMN IF EXISTS "contrato_medicao_id";
ALTER TABLE "document" DROP COLUMN IF EXISTS "contrato_aditivo_id";
ALTER TABLE "document" DROP COLUMN IF EXISTS "contrato_id";
DROP INDEX IF EXISTS "despesa_contrato_idx";
ALTER TABLE "despesa" DROP COLUMN IF EXISTS "contrato_id";
DROP INDEX IF EXISTS "conta_receber_idem_uq";
DROP INDEX IF EXISTS "conta_receber_contrato_idx";
ALTER TABLE "conta_receber" DROP COLUMN IF EXISTS "idempotency_key";
ALTER TABLE "conta_receber" DROP COLUMN IF EXISTS "contrato_id";
DROP TABLE IF EXISTS "contrato_reembolso";
DROP TABLE IF EXISTS "contrato_medicao";
DROP TABLE IF EXISTS "contrato_marco";
DROP TABLE IF EXISTS "contrato_aditivo_item";
ALTER TABLE IF EXISTS "contrato_item" DROP CONSTRAINT IF EXISTS "contrato_item_origem_aditivo_fk";
DROP TABLE IF EXISTS "contrato_aditivo";
DROP TABLE IF EXISTS "contrato_item";
DROP TABLE IF EXISTS "contrato_projeto";
DROP TABLE IF EXISTS "contrato";
DROP TABLE IF EXISTS "contrato_modalidade";

-- A linha da 0077 precisa sair do journal do drizzle para que a migração seja
-- reaplicada no próximo boot.
DELETE FROM drizzle.__drizzle_migrations
 WHERE hash IN (
   SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
 );

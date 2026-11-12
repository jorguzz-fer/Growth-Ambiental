-- ROLLBACK da 0074 (ver docs/ROLLBACK.md). Remove as colunas e o índice.
-- Atenção: as conciliações de linha do extrato do cartão com a compra, e os ids
-- do Open Finance dos cartões, se perdem (as linhas e as despesas continuam).
DROP INDEX IF EXISTS "extrato_cartao_externo_uq";
ALTER TABLE "extrato_cartao" DROP COLUMN IF EXISTS "despesa_id";
ALTER TABLE "extrato_cartao" DROP COLUMN IF EXISTS "conciliado_por";
ALTER TABLE "extrato_cartao" DROP COLUMN IF EXISTS "conciliado_em";
ALTER TABLE "extrato_cartao" DROP COLUMN IF EXISTS "external_id";
ALTER TABLE "cartao_credito" DROP COLUMN IF EXISTS "open_finance_id";

-- A linha da 0074 precisa sair do journal do drizzle para que a migração seja
-- reaplicada no próximo boot.
DELETE FROM drizzle.__drizzle_migrations
 WHERE hash IN (
   SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
 );

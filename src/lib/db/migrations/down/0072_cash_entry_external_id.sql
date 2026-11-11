-- ROLLBACK da 0072 (ver docs/ROLLBACK.md). Remove o índice e a coluna
-- `external_id`. Atenção: se o Open Finance já tiver sido ligado, o id das
-- transações sincronizadas se perde (os movimentos continuam).
DROP INDEX IF EXISTS "cash_entry_conta_externo_uq";
ALTER TABLE "cash_entry" DROP COLUMN IF EXISTS "external_id";

-- A linha da 0072 precisa sair do journal do drizzle para que a migração seja
-- reaplicada no próximo boot.
DELETE FROM drizzle.__drizzle_migrations
 WHERE hash IN (
   SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
 );

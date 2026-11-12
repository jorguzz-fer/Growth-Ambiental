-- ROLLBACK da 0076 (ver docs/ROLLBACK.md). Remove as tabelas e as colunas do
-- Open Finance. Atenção: as conexões, as associações de conta, os avisos
-- recebidos e a lista de possíveis duplicados se perdem; os movimentos que o
-- Open Finance trouxe continuam (só perdem a marca de revisão). Desconecte os
-- bancos na Pluggy antes, ou eles continuam mandando avisos.
DROP TABLE IF EXISTS "openfinance_possivel_duplicado";
DROP TABLE IF EXISTS "openfinance_evento";
DROP TABLE IF EXISTS "openfinance_conta";
DROP TABLE IF EXISTS "openfinance_item";
ALTER TABLE "cash_entry" DROP COLUMN IF EXISTS "revisao_banco";
ALTER TABLE "extrato_cartao" DROP COLUMN IF EXISTS "revisao_banco";

-- A linha da 0076 precisa sair do journal do drizzle para que a migração seja
-- reaplicada no próximo boot.
DELETE FROM drizzle.__drizzle_migrations
 WHERE hash IN (
   SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
 );

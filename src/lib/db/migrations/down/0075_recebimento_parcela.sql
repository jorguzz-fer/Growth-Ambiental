-- ROLLBACK da 0075 (ver docs/ROLLBACK.md). Remove a tabela.
-- Atenção: os recebimentos de parcela conciliados se perdem. Antes de rodar,
-- exporte a tabela (SELECT * FROM recebimento_parcela) e desfaça a marcação
-- de conciliado dos movimentos que só estavam ligados a parcelas.
DROP TABLE IF EXISTS "recebimento_parcela";

-- A linha da 0075 precisa sair do journal do drizzle para que a migração seja
-- reaplicada no próximo boot.
DELETE FROM drizzle.__drizzle_migrations
 WHERE hash IN (
   SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
 );

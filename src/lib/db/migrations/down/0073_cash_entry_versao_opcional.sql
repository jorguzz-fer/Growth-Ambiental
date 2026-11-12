-- ROLLBACK da 0073 (ver docs/ROLLBACK.md). Volta a exigir a obra no movimento.
-- Atenção: FALHA se já existir movimento sem obra (a chave
-- "caixa_conciliacao_por_conta" foi ligada e houve importação). Nesse caso,
-- não apague nada: desligue a chave e decida antes a obra desses movimentos.
ALTER TABLE "cash_entry" ALTER COLUMN "version_id" SET NOT NULL;

-- A linha da 0073 precisa sair do journal do drizzle para que a migração seja
-- reaplicada no próximo boot.
DELETE FROM drizzle.__drizzle_migrations
 WHERE hash IN (
   SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
 );

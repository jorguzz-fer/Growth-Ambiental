-- ROLLBACK da 0084 (ver docs/ROLLBACK.md). Remove o vínculo das empresas com o
-- cadastro na Focus NFe. Atenção: as empresas continuam cadastradas na Focus
-- (o rollback não mexe lá), mas o app deixa de saber qual é qual: para voltar a
-- emitir, cada empresa ativa a emissão de novo em Configurações → Empresa, ou o
-- servidor volta ao modo antigo (NFSE_TENANT_ID + FOCUS_NFE_TOKEN_*). As notas
-- já emitidas não são tocadas.
DROP TABLE IF EXISTS "nfse_emissor";

-- A linha da 0084 precisa sair do journal do drizzle para que a migração seja
-- reaplicada no próximo boot.
DELETE FROM drizzle.__drizzle_migrations
 WHERE hash IN (
   SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
 );

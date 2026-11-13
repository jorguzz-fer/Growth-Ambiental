-- ROLLBACK da 0078 (ver docs/ROLLBACK.md). Remove o planejamento de projetos:
-- biblioteca, modelos e planos de trabalho (fases, atividades, entregas) se
-- perdem. Projetos, despesas e documentos continuam (só perdem o vínculo).
DROP INDEX IF EXISTS "despesa_projeto_fase_idx";
ALTER TABLE "despesa" DROP COLUMN IF EXISTS "projeto_atividade_id";
ALTER TABLE "despesa" DROP COLUMN IF EXISTS "projeto_fase_id";
ALTER TABLE "document" DROP COLUMN IF EXISTS "projeto_entrega_id";
ALTER TABLE "document" DROP COLUMN IF EXISTS "projeto_atividade_id";
ALTER TABLE "document" DROP COLUMN IF EXISTS "projeto_fase_id";
DROP TABLE IF EXISTS "projeto_plano_importacao";
DROP TABLE IF EXISTS "projeto_entrega";
DROP TABLE IF EXISTS "projeto_atividade";
DROP TABLE IF EXISTS "projeto_fase";
DROP TABLE IF EXISTS "plano_modelo_atividade";
DROP TABLE IF EXISTS "plano_modelo_fase";
DROP TABLE IF EXISTS "plano_modelo";

-- A linha da 0078 precisa sair do journal do drizzle para que a migração seja
-- reaplicada no próximo boot.
DELETE FROM drizzle.__drizzle_migrations
 WHERE hash IN (
   SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1
 );

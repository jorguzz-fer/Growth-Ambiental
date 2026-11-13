-- Desfaz a 0079 (só estrutura nova; nenhum dado anterior foi alterado além do papel, que some com a coluna).
DROP INDEX IF EXISTS "despesa_tenant_conta_idx";
ALTER TABLE "despesa" DROP COLUMN IF EXISTS "tipo_custo";
DROP INDEX IF EXISTS "chart_account_tenant_group_idx";
DROP INDEX IF EXISTS "chart_account_papel_uq";
ALTER TABLE "chart_account" DROP COLUMN IF EXISTS "updated_at";
ALTER TABLE "chart_account" DROP COLUMN IF EXISTS "versao";
ALTER TABLE "chart_account" DROP COLUMN IF EXISTS "papel";
ALTER TABLE "chart_account" DROP COLUMN IF EXISTS "tipo_custo";
ALTER TABLE "chart_account" DROP COLUMN IF EXISTS "classe_gerencial";
ALTER TABLE "chart_account" DROP COLUMN IF EXISTS "ordem";
ALTER TABLE "chart_account" DROP COLUMN IF EXISTS "descricao";
DROP TABLE IF EXISTS "chart_group";

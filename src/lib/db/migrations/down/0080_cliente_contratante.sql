-- Desfaz a 0080 (só colunas novas; nenhum dado anterior foi alterado).
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_financeiro_telefone";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_financeiro_email";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_financeiro_nome";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_tecnico_telefone";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_tecnico_email";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_tecnico_nome";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_adm_telefone";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_adm_email";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "contato_adm_nome";
ALTER TABLE "cliente" DROP COLUMN IF EXISTS "nome_fantasia";

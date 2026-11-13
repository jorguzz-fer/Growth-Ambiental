-- 0080 — Growth Ambiental: o cliente é o CONTRATANTE dos serviços.
--
-- ADITIVA. Colunas novas, todas nulas, em "cliente": nome fantasia e os três
-- contatos de um contratante pessoa jurídica (administrativo, técnico e
-- financeiro). A razão social continua em nome_completo e o CNPJ em
-- cpf_cnpj. Os campos de comprador de imóvel (unidade, renda, FGTS, score…)
-- NÃO são removidos: saem da tela, e o que já está gravado fica no banco.
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "nome_fantasia" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_adm_nome" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_adm_email" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_adm_telefone" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_tecnico_nome" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_tecnico_email" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_tecnico_telefone" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_financeiro_nome" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_financeiro_email" text;
--> statement-breakpoint
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "contato_financeiro_telefone" text;

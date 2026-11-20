-- 0084 — Emissor de NFS-e por empresa, ativado pela própria empresa na tela
-- (Configurações → Empresa). Ver docs/EMISSAO-NF.md, seção 7.
--
-- ADITIVA E REVERSÍVEL. Só cria uma tabela nova. Nenhuma tabela existente é
-- alterada; nenhum registro é apagado ou reclassificado.
--
-- O que guarda: o vínculo da empresa com o cadastro dela na Focus NFe (o id da
-- empresa lá), o CNPJ ativado e a validade do certificado. O que NÃO guarda,
-- de propósito: o certificado A1, a senha dele, a senha da prefeitura e os
-- tokens de emissão. O certificado e as senhas vão direto para a Focus no
-- momento da ativação; os tokens são lidos da Focus, com o token da conta da
-- plataforma, na hora de emitir.
CREATE TABLE IF NOT EXISTS "nfse_emissor" (
  "tenant_id" uuid PRIMARY KEY REFERENCES "tenant"("id") ON DELETE CASCADE,
  "provedor" text NOT NULL DEFAULT 'focus',
  "empresa_id_provedor" text NOT NULL,
  "cnpj" text NOT NULL,
  "certificado_valido_de" timestamp,
  "certificado_valido_ate" timestamp,
  "certificado_cnpj" text,
  "municipio_status" text,
  "ativado_por" text REFERENCES "user"("id") ON DELETE SET NULL,
  "ativado_em" timestamp NOT NULL DEFAULT now(),
  "atualizado_por" text REFERENCES "user"("id") ON DELETE SET NULL,
  "atualizado_em" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
-- Uma empresa da Focus serve a um tenant só.
CREATE UNIQUE INDEX IF NOT EXISTS "nfse_emissor_empresa_provedor_uk"
  ON "nfse_emissor" ("provedor", "empresa_id_provedor");

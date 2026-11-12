-- 0076 — Prompt AT §1-B (Revisão 4, 11/2026). O caminho para o cliente
-- conectar o Open Finance (Pluggy) pela tela.
--
-- ADITIVA: quatro tabelas novas, vazias, e duas colunas novas, nulas. Nenhuma
-- linha existente é lida, alterada ou removida; nenhum número de tela muda
-- (o Open Finance não está ligado em nenhuma empresa, BAT-0).
--
-- * openfinance_item: a conexão (um banco autorizado pelo cliente), com a
--   situação (conectado, atualizando, precisa de ação, erro, desconectado).
-- * openfinance_conta: cada conta ou cartão do banco conectado e com o que ela
--   foi associada no app (conta corrente, cartão ou ignorada).
-- * openfinance_evento: os avisos recebidos pelo webhook, únicos pelo eventId
--   (o mesmo aviso duas vezes é processado uma vez).
-- * openfinance_possivel_duplicado: na primeira sincronização, a transação do
--   banco igual a um movimento já importado não entra; espera a decisão.
-- * cash_entry.revisao_banco / extrato_cartao.revisao_banco: o banco alterou ou
--   removeu a transação depois de ela entrar (nunca se apaga; vai para revisão).
CREATE TABLE IF NOT EXISTS "openfinance_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "item_id" text NOT NULL,
  "banco" text,
  "situacao" text DEFAULT 'atualizando' NOT NULL,
  "ultima_atualizacao" timestamp,
  "ultimo_erro" text,
  "consentimento_expira_em" timestamp,
  "conectado_por" text,
  "conectado_em" timestamp DEFAULT now() NOT NULL,
  "desconectado_em" timestamp,
  "desconectado_por" text,
  "primeira_sincronizacao_em" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "openfinance_item_item_uq" ON "openfinance_item" ("item_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "openfinance_conta" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "item_id" text NOT NULL,
  "pluggy_account_id" text NOT NULL,
  "tipo" text NOT NULL,
  "nome" text,
  "numero" text,
  "bank_account_id" uuid REFERENCES "bank_account"("id") ON DELETE SET NULL,
  "cartao_id" uuid REFERENCES "cartao_credito"("id") ON DELETE SET NULL,
  "ignorada" boolean DEFAULT false NOT NULL,
  "associada_por" text,
  "associada_em" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "openfinance_conta_pluggy_uq" ON "openfinance_conta" ("pluggy_account_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "openfinance_evento" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" text NOT NULL,
  "evento" text NOT NULL,
  "item_id" text,
  "tenant_id" uuid REFERENCES "tenant"("id") ON DELETE CASCADE,
  "payload" jsonb,
  "recebido_em" timestamp DEFAULT now() NOT NULL,
  "processado_em" timestamp,
  "erro" text
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "openfinance_evento_event_uq" ON "openfinance_evento" ("event_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "openfinance_possivel_duplicado" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "bank_account_id" uuid REFERENCES "bank_account"("id") ON DELETE CASCADE,
  "external_id" text NOT NULL,
  "data" text,
  "descricao" text,
  "valor" numeric(15, 2) NOT NULL,
  "existente_id" uuid REFERENCES "cash_entry"("id") ON DELETE SET NULL,
  "criado_em" timestamp DEFAULT now() NOT NULL,
  "decisao" text,
  "decidido_por" text,
  "decidido_em" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "openfinance_dup_conta_externo_uq" ON "openfinance_possivel_duplicado" ("bank_account_id", "external_id");--> statement-breakpoint
ALTER TABLE "cash_entry" ADD COLUMN IF NOT EXISTS "revisao_banco" text;--> statement-breakpoint
ALTER TABLE "extrato_cartao" ADD COLUMN IF NOT EXISTS "revisao_banco" text;

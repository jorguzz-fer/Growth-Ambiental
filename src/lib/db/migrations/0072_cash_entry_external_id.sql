-- 0072 — Prompt AT §1.1 (Revisão 4, 11/2026). Id da transação no Open Finance.
-- O worker do Open Finance deduplicava por descrição + data, sem o valor: dois
-- "PIX RECEBIDO" no mesmo dia, de valores diferentes, viravam um só. Agora a
-- deduplicação é pelo id que a Pluggy dá à transação, por conta.
--
-- ADITIVA E REVERSÍVEL: coluna nova, que nasce nula em todas as linhas, e um
-- índice único só sobre as linhas que a preenchem (nenhuma, hoje). Nenhuma
-- linha existente é lida, alterada ou removida; os números de nenhuma tela mudam.
ALTER TABLE "cash_entry" ADD COLUMN IF NOT EXISTS "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cash_entry_conta_externo_uq" ON "cash_entry" ("bank_account_id", "external_id") WHERE "external_id" IS NOT NULL;

-- 0074 — Prompt AT §6 e §1-B.4/1-B.6 (Revisão 4, 11/2026). Cartões de crédito
-- na conciliação.
--
-- ADITIVA: só colunas novas, todas nulas, e um índice único só sobre as linhas
-- que preenchem o id externo (nenhuma, hoje). Nenhuma linha existente é lida,
-- alterada ou removida; nenhum número de tela muda.
--
-- * extrato_cartao.despesa_id / conciliado_por / conciliado_em: a linha do
--   extrato da fatura conciliada com a compra lançada no cartão (§6.1).
-- * extrato_cartao.external_id: id da transação no Open Finance, único por
--   cartão (§1-B.6).
-- * cartao_credito.open_finance_id: id da conta de cartão na Pluggy (§1-B.4).
ALTER TABLE "extrato_cartao" ADD COLUMN IF NOT EXISTS "despesa_id" uuid REFERENCES "despesa"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "extrato_cartao" ADD COLUMN IF NOT EXISTS "conciliado_por" text;--> statement-breakpoint
ALTER TABLE "extrato_cartao" ADD COLUMN IF NOT EXISTS "conciliado_em" timestamp;--> statement-breakpoint
ALTER TABLE "extrato_cartao" ADD COLUMN IF NOT EXISTS "external_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "extrato_cartao_externo_uq" ON "extrato_cartao" ("cartao_id", "external_id") WHERE "external_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "cartao_credito" ADD COLUMN IF NOT EXISTS "open_finance_id" text;

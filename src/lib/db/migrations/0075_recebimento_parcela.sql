-- 0075 — Prompt AT §5.1 (Revisão 4, 11/2026). Recebimento da parcela do
-- comprador, conciliado com a entrada do extrato.
--
-- ADITIVA: tabela nova, vazia. Nenhuma linha existente é lida, alterada ou
-- removida; nenhum número de tela muda até alguém conciliar uma parcela.
--
-- A parcela é identificada pela CHAVE ESTÁVEL "origem#número" do plano de
-- pagamento (ex.: "Mensais#12", "S1#2", "FGTS#1"), nunca pela posição na lista
-- de recebíveis, que muda quando o plano é editado. Se o plano for editado e a
-- chave deixar de existir, o recebimento continua gravado e aparece como
-- "recebimento sem parcela" para revisão (BAT-5).
CREATE TABLE IF NOT EXISTS "recebimento_parcela" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "unit_id" uuid NOT NULL REFERENCES "unit"("id") ON DELETE CASCADE,
  "chave" text NOT NULL,
  "valor" numeric(15, 2) NOT NULL,
  "data" text,
  "cash_entry_id" uuid REFERENCES "cash_entry"("id") ON DELETE SET NULL,
  "criado_por" text,
  "criado_em" timestamp DEFAULT now() NOT NULL,
  "estornado" boolean DEFAULT false NOT NULL,
  "estornado_em" timestamp,
  "estornado_por" text,
  "motivo_estorno" text
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recebimento_parcela_unidade_idx" ON "recebimento_parcela" ("tenant_id", "unit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recebimento_parcela_mov_idx" ON "recebimento_parcela" ("cash_entry_id");

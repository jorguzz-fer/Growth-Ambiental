-- 0073 — Prompt AT §3.1 (Revisão 4, 11/2026). O movimento do extrato pertence
-- à CONTA, não à obra: `cash_entry.version_id` passa a aceitar nulo.
--
-- ADITIVA: só tira a restrição NOT NULL. Nenhuma linha é lida, alterada ou
-- removida; todo movimento que existe continua com a obra que tem (§3.2). Só
-- nasce movimento sem obra quando a chave "caixa_conciliacao_por_conta" for
-- ligada numa empresa, e só pela importação de extrato e pelo Open Finance.
ALTER TABLE "cash_entry" ALTER COLUMN "version_id" DROP NOT NULL;

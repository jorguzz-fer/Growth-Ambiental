-- Prompt U · Cartões de Crédito — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- 0 · nada de cartão existe ainda: tabelas esperadas pelo Prompt U (deve devolver 0 linhas antes da migração)
SELECT table_name FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name IN ('cartao_credito','fatura_cartao','fatura_pagamento','extrato_cartao','estorno_cartao');

-- 1 · despesas já gravadas com forma de pagamento "Cartão de crédito" (NÃO serão vinculadas a fatura retroativamente — decisão humana, seção 9)
SELECT coalesce(forma_pagamento,'(sem forma)') AS forma, status, count(*), sum(valor)
  FROM despesa WHERE NOT cancelado GROUP BY 1, 2 ORDER BY 3 DESC;

-- 1b · parcelas cuja forma é cartão
SELECT p.forma_pagamento, p.status, count(*), sum(p.valor_original)
  FROM despesa_parcela p GROUP BY 1, 2 ORDER BY 3 DESC;

-- 2 · contas bancárias que poderão debitar fatura
SELECT id, banco, ag, cc, tipo FROM bank_account ORDER BY banco;

-- 3 · categoria para o juro do rotativo (3.4): "Despesas Financeiras" é valor do enum dre_category da despesa
SELECT enum_range(NULL::dre_category);

-- 4 · lançamentos de caixa que parecem pagamento de fatura (conferência futura; só leitura)
SELECT data, descricao, valor FROM cash_entry WHERE descricao ILIKE '%cart%' OR descricao ILIKE '%fatura%' ORDER BY data DESC LIMIT 50;

-- 19 · ANTES/DEPOIS — rodar antes e depois de cada PR do Prompt U; nada pode mudar
SELECT 'despesa' AS t, count(*), coalesce(sum(valor),0) FROM despesa
UNION ALL SELECT 'despesa_parcela', count(*), coalesce(sum(valor_original),0) FROM despesa_parcela
UNION ALL SELECT 'pagamento', count(*), coalesce(sum(valor_total_pago),0) FROM pagamento
UNION ALL SELECT 'cash_entry', count(*), coalesce(sum(valor),0) FROM cash_entry;

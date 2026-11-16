-- Prompt I, seção 43 — diagnóstico da base existente. SOMENTE LEITURA:
-- só SELECT, nenhum registro é alterado. Cada bloco devolve uma contagem por
-- empresa; se algum vier com número, rode o "detalhe" comentado logo abaixo.
-- Rode no Postgres de produção e cole o resultado na conversa.
--
-- Itens L, M, T, U e W dependem de regras de cálculo do app (saldo de lote,
-- janela de competências, plano de contas ativo, soma do plano de pagamento);
-- saem num script próprio, lido pelo código, e não aqui.

-- A · despesas em versões que não são a Atual
SELECT 'A despesas fora da Atual' AS item, t.name AS empresa, v.kind::text AS versao, count(*) AS qtd, sum(d.valor) AS valor
FROM despesa d JOIN version v ON v.id = d.version_id JOIN tenant t ON t.id = d.tenant_id
WHERE v.kind <> 'atual' GROUP BY 1, 2, 3 ORDER BY 2, 3;

-- B · movimentos de caixa ligados a Orçamento (budget) ou Previsão (forecast)
SELECT 'B caixa em budget/forecast' AS item, t.name AS empresa, v.kind::text AS versao, count(*) AS qtd, sum(c.valor) AS valor
FROM cash_entry c JOIN version v ON v.id = c.version_id JOIN tenant t ON t.id = c.tenant_id
WHERE v.kind IN ('budget', 'forecast') GROUP BY 1, 2, 3 ORDER BY 2, 3;

-- C · medições fora da Atual
SELECT 'C medições fora da Atual' AS item, t.name AS empresa, v.kind::text AS versao, count(*) AS qtd, sum(m.valor) AS valor
FROM medicao m JOIN version v ON v.id = m.version_id JOIN tenant t ON t.id = m.tenant_id
WHERE v.kind <> 'atual' GROUP BY 1, 2, 3 ORDER BY 2, 3;

-- D · pagamento cuja parcela é de outra despesa, ou de outra empresa
SELECT 'D pagamento x parcela incompatíveis' AS item, t.name AS empresa, count(*) AS qtd
FROM pagamento pg
JOIN despesa_parcela dp ON dp.id = pg.parcela_id
JOIN tenant t ON t.id = pg.tenant_id
WHERE pg.despesa_id IS DISTINCT FROM dp.despesa_id OR pg.tenant_id <> dp.tenant_id
GROUP BY 1, 2;

-- E · parcelas (contas a pagar) de despesas fora da Atual
SELECT 'E parcelas fora da Atual' AS item, t.name AS empresa, v.kind::text AS versao, count(*) AS qtd, sum(dp.valor_original) AS valor
FROM despesa_parcela dp
JOIN despesa d ON d.id = dp.despesa_id JOIN version v ON v.id = d.version_id JOIN tenant t ON t.id = dp.tenant_id
WHERE v.kind <> 'atual' GROUP BY 1, 2, 3 ORDER BY 2, 3;

-- F · despesas "Pago" sem pagamento, sem parcela paga e sem caixa conciliado
SELECT 'F Pago sem pagamento/caixa' AS item, t.name AS empresa, count(*) AS qtd, sum(d.valor) AS valor
FROM despesa d JOIN tenant t ON t.id = d.tenant_id
WHERE d.status = 'Pago' AND NOT d.cancelado AND NOT d.pago_por_terceiro
  AND NOT EXISTS (SELECT 1 FROM pagamento pg WHERE pg.despesa_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM despesa_parcela dp WHERE dp.despesa_id = d.id AND dp.valor_pago > 0)
  AND NOT EXISTS (SELECT 1 FROM cash_entry c WHERE c.conciliado_despesa_id = d.id)
GROUP BY 1, 2;
-- detalhe: troque o SELECT acima por
--   SELECT t.name, d.num_doc, d.valor, d.competencia, d.data_caixa ... ORDER BY 1, 2

-- G · despesas parcialmente pagas com saldo incoerente (pago >= valor, ou nada pago)
SELECT 'G parcial incoerente' AS item, t.name AS empresa, count(*) AS qtd
FROM despesa d JOIN tenant t ON t.id = d.tenant_id
JOIN LATERAL (SELECT coalesce(sum(dp.valor_pago), 0) AS pago FROM despesa_parcela dp WHERE dp.despesa_id = d.id) s ON true
WHERE d.status ILIKE '%parcial%' AND NOT d.cancelado AND (s.pago <= 0 OR s.pago + 0.01 >= d.valor)
GROUP BY 1, 2;

-- H · despesa ainda aberta com todas as parcelas quitadas
SELECT 'H parcelas quitadas, despesa aberta' AS item, t.name AS empresa, count(*) AS qtd
FROM despesa d JOIN tenant t ON t.id = d.tenant_id
WHERE coalesce(d.status, '') <> 'Pago' AND NOT d.cancelado
  AND EXISTS (SELECT 1 FROM despesa_parcela dp WHERE dp.despesa_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM despesa_parcela dp WHERE dp.despesa_id = d.id AND dp.status <> 'Pago')
GROUP BY 1, 2;

-- I · soma das parcelas diferente do valor do PED (tolerância de 1 centavo)
SELECT 'I soma das parcelas ≠ PED' AS item, t.name AS empresa, count(*) AS qtd
FROM despesa d JOIN tenant t ON t.id = d.tenant_id
JOIN (SELECT despesa_id, sum(valor_original) AS soma FROM despesa_parcela GROUP BY 1) s ON s.despesa_id = d.id
WHERE NOT d.cancelado AND abs(s.soma - d.valor) > 0.01
GROUP BY 1, 2;

-- J · "pago por terceiro" sem o registro de terceiro
SELECT 'J pago por terceiro sem registro' AS item, t.name AS empresa, count(*) AS qtd, sum(d.valor) AS valor
FROM despesa d JOIN tenant t ON t.id = d.tenant_id
WHERE d.pago_por_terceiro AND NOT EXISTS (SELECT 1 FROM despesa_terceiro dt WHERE dt.despesa_id = d.id)
GROUP BY 1, 2;

-- K · registro de terceiro cuja despesa segue em aberto com o fornecedor
SELECT 'K terceiro com despesa ainda a pagar' AS item, t.name AS empresa, count(*) AS qtd
FROM despesa_terceiro dt JOIN despesa d ON d.id = dt.despesa_id JOIN tenant t ON t.id = dt.tenant_id
WHERE coalesce(d.status, '') NOT IN ('Pago') AND NOT d.cancelado
GROUP BY 1, 2;

-- N · caixa conciliado com despesa de OUTRA obra (ou de versão não Atual)
SELECT 'N caixa x despesa de outra obra' AS item, t.name AS empresa, count(*) AS qtd
FROM cash_entry c
JOIN despesa d ON d.id = c.conciliado_despesa_id
JOIN version vc ON vc.id = c.version_id
JOIN version vd ON vd.id = d.version_id
JOIN tenant t ON t.id = c.tenant_id
WHERE vc.project_id <> vd.project_id OR vd.kind <> 'atual'
GROUP BY 1, 2;

-- O, P, Q · obras sem Orçamento, sem Previsão, sem Atual
SELECT 'O/P/Q versões faltando' AS item, t.name AS empresa, p.name AS obra,
       bool_or(v.kind = 'budget') AS tem_budget,
       bool_or(v.kind = 'forecast') AS tem_forecast,
       bool_or(v.kind = 'atual') AS tem_atual
FROM project p JOIN tenant t ON t.id = p.tenant_id LEFT JOIN version v ON v.project_id = p.id
GROUP BY 1, 2, 3
HAVING NOT coalesce(bool_or(v.kind = 'budget'), false)
    OR NOT coalesce(bool_or(v.kind = 'forecast'), false)
    OR NOT coalesce(bool_or(v.kind = 'atual'), false)
ORDER BY 2, 3;

-- R · obras com mais de uma versão do mesmo tipo (fora "custom")
SELECT 'R versões repetidas' AS item, t.name AS empresa, p.name AS obra, v.kind::text AS versao, count(*) AS qtd
FROM version v JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = v.tenant_id
WHERE v.kind <> 'custom' GROUP BY 1, 2, 3, 4 HAVING count(*) > 1 ORDER BY 2, 3;

-- S · unidades com o mesmo código na mesma versão
SELECT 'S unidade repetida' AS item, t.name AS empresa, p.name AS obra, v.kind::text AS versao, u.code, count(*) AS qtd
FROM unit u JOIN version v ON v.id = u.version_id JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = u.tenant_id
GROUP BY 1, 2, 3, 4, 5 HAVING count(*) > 1 ORDER BY 2, 3, 5;

-- V · unidades vendidas sem data de venda ou com valor zero (Atual)
SELECT 'V vendida sem data ou valor' AS item, t.name AS empresa, count(*) AS qtd
FROM unit u JOIN version v ON v.id = u.version_id JOIN tenant t ON t.id = u.tenant_id
WHERE v.kind = 'atual' AND u.status::text ILIKE 'vendid%'
  AND (coalesce(trim(u.mes_venda), '') = '' OR u.valor = 0)
GROUP BY 1, 2;

-- X · obras sem data de início ou de fim (sem janela, não há rateio)
SELECT 'X obra sem janela' AS item, t.name AS empresa, p.name AS obra, p.start_date, p.end_date
FROM project p JOIN tenant t ON t.id = p.tenant_id
WHERE p.kind = 'proj' AND (coalesce(p.start_date, '') = '' OR coalesce(p.end_date, '') = '')
ORDER BY 2, 3;

-- Y · contas a receber lançadas à mão com unidade (candidatas a dupla contagem)
SELECT 'Y conta a receber com unidade' AS item, t.name AS empresa, count(*) AS qtd, sum(cr.valor) AS valor
FROM conta_receber cr JOIN tenant t ON t.id = cr.tenant_id
WHERE coalesce(trim(cr.unit_code), '') <> '' AND NOT cr.cancelado
GROUP BY 1, 2;

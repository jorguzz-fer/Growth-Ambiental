-- Prompt P (Permuta) · diagnóstico SOMENTE LEITURA para rodar no Postgres
-- de produção antes e depois das PRs. Nenhum comando aqui grava nada.

-- ---------------------------------------------------------------------------
-- 1. Antes/depois (Prompt P, teste 22): contagem de `permuta` e soma de
--    `estimado` e `valor_venda` por versão. Rodar antes da primeira PR e
--    depois da última; as duas saídas têm de ser idênticas.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, v.kind AS versao, v.label,
       count(pm.id) AS ativos,
       coalesce(sum(pm.estimado), 0) AS soma_estimado,
       coalesce(sum(pm.valor_venda), 0) AS soma_valor_venda
FROM version v
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = p.tenant_id
LEFT JOIN permuta pm ON pm.version_id = v.id
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4;

-- ---------------------------------------------------------------------------
-- 2. Seção 1.5 / §57.8-AA: duplicidade efetiva entre a linha "Permuta" do plano
--    de pagamento e a tabela `permuta`, projeto a projeto, com os dois valores
--    lado a lado. Casamento por (versão, código da unidade). Só reportar.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, v.kind AS versao, u.code AS unidade,
       (u.payment_plan->'Permuta'->>'val')::numeric AS permuta_no_plano,
       pm.id AS permuta_id, pm.tipo, pm.descricao, pm.estimado AS permuta_na_tabela,
       pm.status, pm.valor_venda
FROM unit u
JOIN version v ON v.id = u.version_id
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = u.tenant_id
JOIN permuta pm ON pm.version_id = u.version_id AND pm.unit_code = u.code
WHERE coalesce((u.payment_plan->'Permuta'->>'val')::numeric, 0) > 0
ORDER BY 1, 2, 3, 4;

-- ---------------------------------------------------------------------------
-- 3. BP-1 (reconferência): bens de permuta que já entraram no Estoque.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, count(*) AS movimentos, count(DISTINCT sm.permuta_id) AS permutas
FROM stock_movement sm JOIN tenant t ON t.id = sm.tenant_id
WHERE sm.permuta_id IS NOT NULL
GROUP BY 1 ORDER BY 1;

-- ---------------------------------------------------------------------------
-- 4. BP-2 (reconferência) e relatório final, item 4: ativos que geram receita
--    hoje com status diferente de "Vendido" — valor e data de venda
--    preenchidos governam a receita, não o status.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra,
       coalesce(nullif(trim(pm.status), ''), '(em branco)') AS status,
       pm.forma_venda, count(*) AS ativos, sum(pm.valor_venda) AS valor_venda_total
FROM permuta pm
JOIN version v ON v.id = pm.version_id
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = pm.tenant_id
WHERE coalesce(pm.valor_venda, 0) > 0 AND coalesce(pm.data_venda, '') <> ''
  AND coalesce(pm.status, '') <> 'Vendido'
GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3, 4;

-- ---------------------------------------------------------------------------
-- 5. Seção 3.6: clientes gravados por nome na permuta que casam (ou não) com
--    o cadastro. Nenhum registro é convertido; a coluna nova fica vazia para
--    o histórico, e a tela segue mostrando o nome gravado.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, pm.cliente, count(*) AS ativos,
       count(c.id) FILTER (WHERE c.id IS NOT NULL) > 0 AS existe_no_cadastro
FROM permuta pm
JOIN tenant t ON t.id = pm.tenant_id
LEFT JOIN cliente c ON c.tenant_id = pm.tenant_id AND c.nome_completo = pm.cliente
WHERE coalesce(trim(pm.cliente), '') <> ''
GROUP BY 1, 2 ORDER BY 1, 2;

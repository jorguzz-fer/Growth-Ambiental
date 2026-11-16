-- Prompt AN · Conferência de lançamentos e de planos.
-- Diagnóstico SOMENTE LEITURA (nada aqui altera dado). Rodar em produção
-- antes do deploy. Em vez de :tenant_id, agrupa por empresa.

-- BAN-1 · contagem por condição. `so_sem_competencia` é o que a tela NÃO
-- mostra hoje e passará a mostrar (quarta condição).
-- Categoria credora = as categorias que natureza-dre.ts chama de credoras
-- (hoje só 'Receita').
SELECT t.name AS empresa,
  COUNT(*) FILTER (WHERE d.categoria_dre = 'Receita')                        AS categoria_credora,
  COUNT(*) FILTER (WHERE d.categoria_dre IS NULL)                            AS sem_categoria,
  COUNT(*) FILTER (WHERE d.valor = 0)                                        AS valor_zero,
  COUNT(*) FILTER (WHERE d.competencia IS NULL OR btrim(d.competencia) = '') AS sem_competencia,
  COUNT(*) FILTER (WHERE (d.competencia IS NULL OR btrim(d.competencia) = '')
                     AND d.categoria_dre IS NOT NULL
                     AND d.categoria_dre <> 'Receita'
                     AND d.valor <> 0
                     AND NOT d.cancelado)                                    AS so_sem_competencia,
  COUNT(*) FILTER (WHERE d.cancelado)                                        AS canceladas,
  COUNT(*)                                                                   AS total
  FROM despesa d
  JOIN tenant t ON t.id = d.tenant_id
 GROUP BY t.name
 ORDER BY t.name;

-- BAN-1 · por tipo de versão (a tela lista despesas de TODAS as versões:
-- Atual, Orçamento e Previsão).
SELECT t.name AS empresa, v.kind AS versao,
  COUNT(*) FILTER (WHERE (d.competencia IS NULL OR btrim(d.competencia) = '')
                     AND d.categoria_dre IS NOT NULL AND d.categoria_dre <> 'Receita'
                     AND d.valor <> 0 AND NOT d.cancelado)                   AS so_sem_competencia
  FROM despesa d
  JOIN tenant t ON t.id = d.tenant_id
  JOIN version v ON v.id = d.version_id
 GROUP BY t.name, v.kind
 ORDER BY 1, 2;

-- BAN-1 · detalhamento dos que só têm o problema da competência.
SELECT t.name AS empresa, p.name AS projeto, v.kind AS versao, d.num_doc, d.categoria_dre, d.valor,
       d.vencimento, d.status, d.created_at
  FROM despesa d
  JOIN tenant t ON t.id = d.tenant_id
  JOIN version v ON v.id = d.version_id
  JOIN project p ON p.id = v.project_id
 WHERE (d.competencia IS NULL OR btrim(d.competencia) = '')
   AND d.categoria_dre IS NOT NULL
   AND d.categoria_dre <> 'Receita'
   AND d.valor <> 0
   AND NOT d.cancelado
 ORDER BY t.name, d.valor DESC;

-- BAN-2 · quantos fornecedores distintos há entre as pendências de hoje
-- (as três condições antigas), por empresa — mede o risco do lote único.
SELECT t.name AS empresa,
       COUNT(*) AS pendencias,
       COUNT(DISTINCT d.fornecedor_id) AS fornecedores_distintos,
       COUNT(DISTINCT d.conta_cef) AS contas_cef_distintas
  FROM despesa d
  JOIN tenant t ON t.id = d.tenant_id
 WHERE NOT d.cancelado
   AND (d.categoria_dre = 'Receita' OR d.categoria_dre IS NULL OR d.valor = 0)
 GROUP BY t.name
 ORDER BY t.name;

-- 6.4 · planos vendidos (versão Atual) com dia de vencimento acima de 28 nas
-- séries periódicas. A lista é ENTREGUE ao cliente, não corrigida.
-- Datas no formato interno MM/DD/YYYY: o dia é a 2ª parte.
SELECT t.name AS empresa, p.name AS projeto, u.code AS unidade,
       u.payment_plan -> 'Mensais'    ->> 'venc' AS mensais,
       u.payment_plan -> 'Semestrais' ->> 'venc' AS semestrais,
       u.payment_plan -> 'Anuais'     ->> 'venc' AS anuais
  FROM unit u
  JOIN tenant t ON t.id = u.tenant_id
  JOIN version v ON v.id = u.version_id
  JOIN project p ON p.id = v.project_id
 WHERE v.kind = 'atual' AND u.status = 'Vendido'
   AND u.payment_plan IS NOT NULL
   AND (   split_part(u.payment_plan -> 'Mensais'    ->> 'venc', '/', 2) ~ '^(29|30|31)$'
        OR split_part(u.payment_plan -> 'Semestrais' ->> 'venc', '/', 2) ~ '^(29|30|31)$'
        OR split_part(u.payment_plan -> 'Anuais'     ->> 'venc', '/', 2) ~ '^(29|30|31)$')
 ORDER BY t.name, p.name, u.code;

-- 6.6 · unidades cujo código é igual ao nome do projeto (achado para o Prompt J).
SELECT t.name AS empresa, p.name AS projeto, u.code AS unidade, u.status
  FROM unit u
  JOIN tenant t ON t.id = u.tenant_id
  JOIN version v ON v.id = u.version_id
  JOIN project p ON p.id = v.project_id
 WHERE v.kind = 'atual' AND upper(btrim(u.code)) = upper(btrim(p.name))
 ORDER BY 1, 2;

-- 6.7 · unidades vendidas que a Conferência de planos nunca alcançou: sem
-- entrada (Ato/Sinais com vencimento e valor) ou sem mensais.
SELECT t.name AS empresa, p.name AS projeto, u.code AS unidade,
       NOT (coalesce((u.payment_plan->'AS'->>'val')::numeric, 0) > 0 AND coalesce(u.payment_plan->'AS'->>'venc','') <> ''
         OR coalesce((u.payment_plan->'S1'->>'val')::numeric, 0) > 0 AND coalesce(u.payment_plan->'S1'->>'venc','') <> ''
         OR coalesce((u.payment_plan->'S2'->>'val')::numeric, 0) > 0 AND coalesce(u.payment_plan->'S2'->>'venc','') <> ''
         OR coalesce((u.payment_plan->'S3'->>'val')::numeric, 0) > 0 AND coalesce(u.payment_plan->'S3'->>'venc','') <> '') AS sem_entrada,
       NOT (coalesce((u.payment_plan->'Mensais'->>'val')::numeric, 0) > 0 AND coalesce(u.payment_plan->'Mensais'->>'venc','') <> '') AS sem_mensais
  FROM unit u
  JOIN tenant t ON t.id = u.tenant_id
  JOIN version v ON v.id = u.version_id
  JOIN project p ON p.id = v.project_id
 WHERE v.kind = 'atual' AND u.status = 'Vendido' AND u.payment_plan IS NOT NULL
 ORDER BY 1, 2, 3;

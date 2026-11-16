-- Prompt AE · Resumo Executivo. Diagnóstico SOMENTE LEITURA. Rodar em produção.

-- 1 · BAE-3 · VSO: unidade vendida sem data de venda torna o VSO incalculável.
SELECT count(*) AS unidades,
       count(mes_venda) FILTER (WHERE mes_venda <> '') AS com_data,
       count(*) FILTER (WHERE status = 'Vendido') AS vendidas,
       count(*) FILTER (WHERE status = 'Vendido' AND (mes_venda IS NULL OR mes_venda = '')) AS vendidas_sem_data
  FROM unit;

-- 2 · 2.3 · unidades por status e versão (o card conta 3 dos 4; "Permutado" some).
SELECT p.name, v.kind, u.status, count(*), sum(u.valor)
  FROM unit u JOIN version v ON v.id = u.version_id JOIN project p ON p.id = v.project_id
 GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- 3 · 2.4 · sinais com n > 1 (S1/S2/S3 entram pelo valor unitário em calcTotals,
-- mas a Projeção multiplica por n). A diferença é o que o Resumo mostra a menos.
SELECT p.name, u.code, u.status,
       (u.payment_plan->'S1'->>'n') AS s1_n, (u.payment_plan->'S2'->>'n') AS s2_n, (u.payment_plan->'S3'->>'n') AS s3_n
  FROM unit u JOIN version v ON v.id = u.version_id JOIN project p ON p.id = v.project_id
 WHERE coalesce((u.payment_plan->'S1'->>'n')::numeric, 1) > 1
    OR coalesce((u.payment_plan->'S2'->>'n')::numeric, 1) > 1
    OR coalesce((u.payment_plan->'S3'->>'n')::numeric, 1) > 1;

-- 4 · 2.6 · tipos de permuta gravados (a tela busca "material" e "servi" por substring).
SELECT coalesce(tipo_permuta, '(vazio)') AS tipo, count(*), sum(estimado) FROM permuta GROUP BY 1 ORDER BY 2 DESC;

-- 5 · 2.7 · permuta e liberação por status (hoje somam sem olhar o status).
SELECT 'permuta' AS t, coalesce(status, '(vazio)') AS status, count(*), sum(estimado) FROM permuta GROUP BY 2
UNION ALL
SELECT 'reembolso', coalesce(status, '(vazio)'), count(*), sum(valor) FROM reembolso GROUP BY 2
ORDER BY 1, 2;

-- 6 · 3.5 · obras sem versão Atual (a tela abre em outra versão sem avisar).
SELECT p.name, string_agg(v.kind || ':' || v.label, ', ') AS versoes
  FROM project p LEFT JOIN version v ON v.project_id = p.id
 GROUP BY p.id, p.name
HAVING count(*) FILTER (WHERE v.kind = 'atual') = 0;

-- 7 · item 23 · fotografia de antes e depois.
SELECT 'unit' t, count(*), sum(valor) FROM unit
UNION ALL SELECT 'permuta', count(*), sum(estimado) FROM permuta
UNION ALL SELECT 'reembolso', count(*), sum(valor) FROM reembolso
UNION ALL SELECT 'version', count(*), NULL FROM version;

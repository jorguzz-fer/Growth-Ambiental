-- Fase 3 · Armazenamento: quanto o banco e os documentos cresceram, e a
-- projeção de um ano. SOMENTE LEITURA. Pedido do Thiago na reunião V5.
-- Rodar na produção; os três resultados vão para o relatório.

-- 1. Tamanho de cada tabela (dados + índices), da maior para a menor.
SELECT c.relname AS tabela,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
  pg_total_relation_size(c.oid) AS bytes,
  c.reltuples::bigint AS linhas_estimadas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC;

-- 2. Banco inteiro.
SELECT pg_size_pretty(pg_database_size(current_database())) AS banco,
  pg_database_size(current_database()) AS bytes;

-- 3. Documentos (R2) por mês e por empresa: quantidade e bytes somados.
-- `size` é gravado no upload; linhas sem `size` contam só na quantidade.
SELECT t.name AS empresa,
  to_char(d.uploaded_at, 'YYYY-MM') AS mes,
  count(*) AS documentos,
  count(d.size) AS com_tamanho,
  coalesce(sum(d.size), 0) AS bytes,
  pg_size_pretty(coalesce(sum(d.size), 0)::bigint) AS total
FROM document d
JOIN tenant t ON t.id = d.tenant_id
GROUP BY t.name, to_char(d.uploaded_at, 'YYYY-MM')
ORDER BY t.name, mes;

-- 4. Ritmo: bytes de documento por mês, todas as empresas, para a projeção.
-- Projeção de um ano = média dos últimos 3 meses completos × 12, somada ao
-- acumulado. O cálculo fica no relatório, não aqui.
SELECT to_char(d.uploaded_at, 'YYYY-MM') AS mes,
  count(*) AS documentos,
  coalesce(sum(d.size), 0) AS bytes
FROM document d
GROUP BY to_char(d.uploaded_at, 'YYYY-MM')
ORDER BY mes;

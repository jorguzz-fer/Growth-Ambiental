-- Prompt Y · Estoque — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- Estado da tela: itens, movimentos, documentos vinculados a movimento (coluna chega na 0060)
SELECT 'stock_item' AS tabela, count(*) FROM stock_item
UNION ALL SELECT 'stock_movement', count(*) FROM stock_movement
UNION ALL SELECT 'document', count(*) FROM document;

-- 1 · Saldo por item como a tela calcula (entrada soma, saída subtrai) — para conferir o sinal
SELECT i.id, i.nome, i.unidade,
       coalesce(sum(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE -m.quantidade END), 0) AS saldo,
       count(m.id) AS movimentos
  FROM stock_item i LEFT JOIN stock_movement m ON m.item_id = i.id
 GROUP BY 1, 2, 3 ORDER BY 2;

-- 3 · Entradas sem origem (nem despesa nem permuta) e com as duas — vindas de antes desta tarefa (7.3 "entrada sem origem")
SELECT count(*) FILTER (WHERE despesa_id IS NULL AND permuta_id IS NULL) AS sem_origem,
       count(*) FILTER (WHERE despesa_id IS NOT NULL AND permuta_id IS NOT NULL) AS com_as_duas,
       count(*) AS entradas
  FROM stock_movement WHERE tipo = 'entrada';

-- 4 · Saídas sem projeto (passam a ser recusadas; as antigas ficam como estão)
SELECT count(*) FILTER (WHERE project_id IS NULL) AS sem_projeto, count(*) AS saidas FROM stock_movement WHERE tipo = 'saida';

-- BY-2 · despesas de material por projeto (heurística por nome do fornecedor / histórico; ajuste as palavras à sua operação)
SELECT p.name AS projeto,
       count(*) FILTER (WHERE s.nome ~* 'material|cimento|areia|tijolo|aço|aco|ferro|madeira|hidraul|eletric|tinta|argamassa|brita|constru') AS parecem_material,
       sum(d.valor) FILTER (WHERE s.nome ~* 'material|cimento|areia|tijolo|aço|aco|ferro|madeira|hidraul|eletric|tinta|argamassa|brita|constru') AS valor_material,
       count(*) AS despesas
  FROM despesa d
  JOIN version v ON v.id = d.version_id
  JOIN project p ON p.id = v.project_id
  LEFT JOIN stakeholder s ON s.id = d.fornecedor_id
 WHERE NOT d.cancelado
 GROUP BY 1 ORDER BY 1;

-- BY-2 · as mesmas despesas no projeto "guarda-chuva" de despesas gerais (candidatas a compra para estoque sem destino)
SELECT p.name, d.num_doc, s.nome AS fornecedor, d.competencia, d.valor, d.obs
  FROM despesa d
  JOIN version v ON v.id = d.version_id
  JOIN project p ON p.id = v.project_id
  LEFT JOIN stakeholder s ON s.id = d.fornecedor_id
 WHERE NOT d.cancelado AND p.name ~* 'escrit|geral|central|admin'
   AND s.nome ~* 'material|cimento|areia|tijolo|aço|aco|ferro|madeira|hidraul|eletric|tinta|argamassa|brita|constru'
 ORDER BY d.competencia, d.num_doc;

-- 3.5 · soma das entradas por despesa × valor da despesa (aviso, não bloqueio)
SELECT d.num_doc, d.valor AS valor_despesa, sum(m.quantidade * m.custo_unit) AS soma_entradas, count(m.id) AS entradas
  FROM stock_movement m JOIN despesa d ON d.id = m.despesa_id
 WHERE m.tipo = 'entrada'
 GROUP BY 1, 2 HAVING sum(m.quantidade * m.custo_unit) > d.valor ORDER BY 1;

-- 10 · Não regressão: nada fora da tela lê stock_* (conferido no código; no banco, nenhuma view/função referencia)
SELECT viewname FROM pg_views WHERE definition ~* 'stock_(item|movement)';

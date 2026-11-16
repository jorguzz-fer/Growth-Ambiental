-- Prompt AA · Dashboard. Diagnóstico SOMENTE LEITURA. Rodar em produção.
-- Nenhuma consulta abaixo altera dado.

-- 1 · BAA-1 · serviços e medição por serviço por obra (os 16 cartões leem daqui).
SELECT p.name,
       (SELECT count(*) FROM servico s WHERE s.project_id = p.id) AS servicos,
       (SELECT count(*) FROM medicao_servico m
          JOIN servico s2 ON s2.id = m.servico_id
         WHERE s2.project_id = p.id) AS medicoes,
       p.financiamento_construcao, p.financiamento_terreno,
       p.cub, p.metragem, p.pct_bdi
  FROM project p
 ORDER BY p.name;

-- 2 · BAA-2 · inventário das versões, com cópia (source_version_id) e movimento.
-- Produz inventário, NUNCA DELETE.
SELECT v.project_id, p.name AS projeto, v.id, v.kind, v.label, v.status,
       v.locked, v.created_at, v.source_version_id,
       (SELECT count(*) FROM despesa      d  WHERE d.version_id  = v.id) AS despesas,
       (SELECT count(*) FROM unit         u  WHERE u.version_id  = v.id) AS unidades,
       (SELECT count(*) FROM cash_entry   c  WHERE c.version_id  = v.id) AS caixa,
       (SELECT count(*) FROM budget_line  b  WHERE b.version_id  = v.id) AS linhas_orcamento
  FROM version v JOIN project p ON p.id = v.project_id
 ORDER BY p.name, v.created_at;

-- 3 · BAA-3 (a) · caixa fora da versão Atual. O total POSITIVO é o que
-- "Recebido" mostra a mais hoje, por obra.
SELECT p.name, v.kind, v.label, count(*) AS lancamentos, sum(c.valor) AS total,
       sum(c.valor) FILTER (WHERE c.valor > 0) AS recebido_a_mais
  FROM cash_entry c
  JOIN version v ON v.id = c.version_id
  JOIN project p ON p.id = v.project_id
 WHERE v.kind <> 'atual'
 GROUP BY p.name, v.kind, v.label
 ORDER BY p.name;

-- 4 · BAA-3 (b) · obras com mais de um Orçamento: o denominador de "% executado"
-- soma todos.
SELECT p.name, count(*) AS versoes_budget,
       sum((SELECT coalesce(sum(b.valor),0) FROM budget_line b
             WHERE b.version_id = v.id AND b.kind = 'despesa')) AS despesa_prevista_somada,
       max((SELECT coalesce(sum(b.valor),0) FROM budget_line b
             WHERE b.version_id = v.id AND b.kind = 'despesa')) AS maior_orcamento
  FROM version v JOIN project p ON p.id = v.project_id
 WHERE v.kind = 'budget'
 GROUP BY p.name
HAVING count(*) > 1;

-- 5 · BAA-4 · o que compõe "Recebido" hoje: entradas da Atual por categoria.
SELECT p.name, coalesce(c.cat, '(sem categoria)') AS cat, count(*), sum(c.valor)
  FROM cash_entry c
  JOIN version v ON v.id = c.version_id AND v.kind = 'atual'
  JOIN project p ON p.id = v.project_id
 WHERE c.valor > 0
 GROUP BY 1, 2
 ORDER BY 1, 4 DESC;

-- 6 · BAA-5 · base dos percentuais: cadastro × soma das unidades vendidas da Atual.
SELECT p.name,
       coalesce(p.valor_construcao,0) + coalesce(p.valor_terreno,0) AS receita_do_cadastro,
       (SELECT coalesce(sum(u.valor),0) FROM unit u JOIN version v ON v.id = u.version_id
         WHERE v.project_id = p.id AND v.kind = 'atual' AND u.status = 'Vendido') AS unidades_vendidas_atual
  FROM project p
 ORDER BY p.name;

-- 7 · 4.5 · unidades fora da Atual (o VGV de Orçamento/Previsão vem daqui).
SELECT p.name, v.kind, v.label, count(*) AS unidades, sum(u.valor) AS vgv
  FROM unit u JOIN version v ON v.id = u.version_id JOIN project p ON p.id = v.project_id
 GROUP BY 1, 2, 3
 ORDER BY 1, 2;

-- 8 · 4.4 · caixa da Atual conciliado × não conciliado (entradas).
SELECT p.name, c.rec AS conciliado, count(*), sum(c.valor)
  FROM cash_entry c
  JOIN version v ON v.id = c.version_id AND v.kind = 'atual'
  JOIN project p ON p.id = v.project_id
 WHERE c.valor > 0
 GROUP BY 1, 2
 ORDER BY 1, 2;

-- 9 · item 43 · fotografia de antes e depois.
SELECT 'cash_entry' t, count(*), sum(valor) FROM cash_entry
UNION ALL SELECT 'despesa', count(*), sum(valor) FROM despesa
UNION ALL SELECT 'unit', count(*), sum(valor) FROM unit
UNION ALL SELECT 'budget_line', count(*), sum(valor) FROM budget_line
UNION ALL SELECT 'version', count(*), NULL FROM version;

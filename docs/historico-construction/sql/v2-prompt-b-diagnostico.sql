-- Prompt B · Projetos — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- A · os projetos e o que a tela vai mostrar (status antigo, situação, datas, duração, cliente)
SELECT p.name, p.kind, p.status AS fase_legado, p.situacao, p.duration_months,
       p.start_date, p.end_date, p.mes_inicial, p.mes_final, c.nome_completo AS cliente,
       p.valor_construcao, p.valor_terreno, p.custo_construcao, p.custo_terreno,
       p.financiamento_construcao, p.financiamento_terreno, p.recursos_proprios,
       p.endereco, p.municipio_obra, p.uf_obra, p.codigo_municipio_obra, p.latitude, p.longitude
  FROM project p LEFT JOIN cliente c ON c.id = p.cliente_id
 ORDER BY p.tenant_id, p.kind, p.name;

-- B · duração gravada × competências entre as datas (Prompt I, 55.6 / seção 9) — informativo, nada é corrigido
WITH d AS (
  SELECT id, name, duration_months,
         to_date(start_date, 'MM/DD/YYYY') AS ini, to_date(end_date, 'MM/DD/YYYY') AS fim
    FROM project WHERE kind = 'proj' AND start_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' AND end_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
)
SELECT name, duration_months,
       (extract(year FROM fim) - extract(year FROM ini)) * 12 + (extract(month FROM fim) - extract(month FROM ini)) + 1 AS competencias,
       fim < ini AS fim_antes_do_inicio
  FROM d ORDER BY name;

-- C · funding que não alcança o valor global (seção 12) — aviso na tela, nada muda
SELECT name,
       coalesce(valor_construcao,0) + coalesce(valor_terreno,0) AS valor_global,
       coalesce(financiamento_construcao,0) + coalesce(financiamento_terreno,0) + coalesce(recursos_proprios,0) AS funding,
       financiamento_construcao IS NULL AND financiamento_terreno IS NULL AND recursos_proprios IS NULL AS funding_nunca_preenchido
  FROM project WHERE kind = 'proj' ORDER BY name;

-- D · município sem código IBGE (efeito fiscal, seção 17)
SELECT name, municipio_obra, uf_obra, codigo_municipio_obra
  FROM project WHERE kind = 'proj' AND (coalesce(municipio_obra,'') <> '' OR coalesce(uf_obra,'') <> '')
   AND (codigo_municipio_obra IS NULL OR codigo_municipio_obra !~ '^[0-9]{7}$');

-- E · Orçado x Realizado: o que cada projeto tem para alimentar o card (seção 20)
SELECT p.name,
       (SELECT count(*) FROM version v JOIN budget_line b ON b.version_id = v.id WHERE v.project_id = p.id AND v.kind = 'budget') AS linhas_budget,
       (SELECT count(*) FROM version v JOIN despesa d ON d.version_id = v.id WHERE v.project_id = p.id AND v.kind = 'atual' AND coalesce(d.cancelado,false) = false) AS despesas_atual,
       (SELECT count(*) FROM version v JOIN unit u ON u.version_id = v.id WHERE v.project_id = p.id AND v.kind = 'atual' AND u.status IN ('Vendido','Permutado')) AS unidades_vendidas_atual,
       (SELECT count(*) FROM conta_receber cr WHERE cr.project_id = p.id) AS contas_receber_sem_competencia
  FROM project p WHERE p.kind = 'proj' ORDER BY p.name;

-- F · documentos por projeto (seção 13) e registros vinculados que o diálogo de exclusão vai listar (seção 37)
SELECT p.name,
       (SELECT count(*) FROM document d WHERE d.project_id = p.id) AS documentos,
       (SELECT count(*) FROM version v JOIN unit u ON u.version_id = v.id WHERE v.project_id = p.id) AS unidades,
       (SELECT count(*) FROM version v JOIN despesa d ON d.version_id = v.id WHERE v.project_id = p.id) AS despesas,
       (SELECT count(*) FROM version v JOIN cash_entry c ON c.version_id = v.id WHERE v.project_id = p.id) AS lancamentos_caixa,
       (SELECT count(*) FROM version v JOIN medicao m ON m.version_id = v.id WHERE v.project_id = p.id) AS medicoes,
       (SELECT count(*) FROM time_entry t WHERE t.project_id = p.id) AS registros_de_ponto
  FROM project p ORDER BY p.name;

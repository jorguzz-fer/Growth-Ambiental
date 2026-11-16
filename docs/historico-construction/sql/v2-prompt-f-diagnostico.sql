-- Prompt F · Previsão Atualizada — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- A · previsões por projeto: nome, origem, data, situação, trava (2.1–2.2, 7)
SELECT t.name AS tenant, p.name AS projeto, v.label AS nome, v.status, v.locked, v.created_at,
       o.label AS base_de_origem, o.kind AS kind_da_origem
  FROM version v JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = v.tenant_id
  LEFT JOIN version o ON o.id = v.source_version_id
 WHERE v.kind = 'forecast' ORDER BY 1,2, v.created_at DESC;

-- B · previsões sem nome próprio ("Forecast") e sem origem (FC-07)
SELECT p.name AS projeto, v.label, v.source_version_id IS NULL AS sem_origem
  FROM version v JOIN project p ON p.id = v.project_id
 WHERE v.kind = 'forecast' AND (v.label = 'Forecast' OR v.source_version_id IS NULL);

-- C · linha de base do teste 11.14: contagens e somas por versão (ANTES; rodar de novo DEPOIS)
SELECT p.name AS projeto, v.kind, v.label,
       (SELECT count(*) FROM budget_account a WHERE a.version_id = v.id) AS contas,
       (SELECT coalesce(sum(a.total),0) FROM budget_account a WHERE a.version_id = v.id) AS soma_totais,
       (SELECT count(*) FROM budget_line l WHERE l.version_id = v.id) AS linhas,
       (SELECT coalesce(sum(l.valor),0) FROM budget_line l WHERE l.version_id = v.id) AS soma_valores
  FROM version v JOIN project p ON p.id = v.project_id
 WHERE v.kind IN ('budget','forecast') ORDER BY 1,2,3;
SELECT count(*) AS versoes_total FROM version;

-- D · BF-1 / 6.2: total herdado na previsão × total atual do Orçamento de origem, por conta
SELECT p.name AS projeto, f.label AS previsao, a.kind AS bloco, a.row_key, a.total AS total_previsao, b.total AS total_orcamento_hoje
  FROM budget_account a
  JOIN version f ON f.id = a.version_id AND f.kind = 'forecast'
  JOIN project p ON p.id = f.project_id
  LEFT JOIN budget_account b ON b.version_id = f.source_version_id AND b.kind = a.kind AND b.row_key = a.row_key
 WHERE a.total IS DISTINCT FROM b.total
 ORDER BY 1,2,3,4;

-- E · quantas previsões cada projeto tem (limite 12)
SELECT p.name AS projeto, count(v.id) AS previsoes
  FROM project p LEFT JOIN version v ON v.project_id = p.id AND v.kind = 'forecast'
 GROUP BY 1 HAVING count(v.id) >= 10 ORDER BY 2 DESC;

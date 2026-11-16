-- Prompt AP · A tela de Configuração da Versão sai.
-- Diagnóstico SOMENTE LEITURA (nada aqui altera dado). Rodar em produção
-- ANTES do deploy e DEPOIS; os relatórios 5 e 6 têm de sair IDÊNTICOS.

-- 1 · (f) versões travadas hoje.
SELECT t.name AS empresa, p.name AS projeto, v.kind, v.label, v.locked
  FROM version v
  JOIN project p ON p.id = v.project_id
  JOIN tenant t ON t.id = v.tenant_id
 WHERE v.locked
 ORDER BY 1, 2, 3;

-- 2 · (g) versões marcadas como padrão, por projeto, e projetos com mais de
-- um Orçamento (onde o is_default escolhe qual Orçamento o card Orçado x
-- Realizado usa).
SELECT t.name AS empresa, p.name AS projeto,
       string_agg(v.kind || ':' || v.label, ', ') FILTER (WHERE v.is_default) AS padrao,
       count(*) FILTER (WHERE v.kind = 'budget') AS orcamentos
  FROM version v
  JOIN project p ON p.id = v.project_id
  JOIN tenant t ON t.id = v.tenant_id
 GROUP BY t.name, p.name
 ORDER BY 1, 2;

-- 3 · (i) projetos com versão faltando (sem atual, sem budget ou sem forecast).
SELECT t.name AS empresa, p.name AS projeto, p.kind,
       bool_or(v.kind = 'atual')    AS tem_atual,
       bool_or(v.kind = 'budget')   AS tem_budget,
       bool_or(v.kind = 'forecast') AS tem_forecast
  FROM project p
  JOIN tenant t ON t.id = p.tenant_id
  LEFT JOIN version v ON v.project_id = p.id
 GROUP BY t.name, p.name, p.kind
HAVING NOT (bool_or(v.kind = 'atual') AND bool_or(v.kind = 'budget') AND bool_or(v.kind = 'forecast'))
     OR bool_or(v.kind = 'atual') IS NULL
 ORDER BY 1, 2;

-- 4 · (j) cópias (source_version_id preenchido ou kind = custom) e o movimento
-- vinculado a cada uma.
SELECT t.name AS empresa, p.name AS projeto, v.kind, v.label,
       v.source_version_id IS NOT NULL AS tem_origem,
       (SELECT count(*) FROM budget_line b WHERE b.version_id = v.id) AS budget_line,
       (SELECT count(*) FROM unit u        WHERE u.version_id = v.id) AS unit,
       (SELECT count(*) FROM despesa d     WHERE d.version_id = v.id) AS despesa,
       (SELECT count(*) FROM cash_entry c  WHERE c.version_id = v.id) AS cash_entry
  FROM version v
  JOIN project p ON p.id = v.project_id
  JOIN tenant t ON t.id = v.tenant_id
 WHERE v.source_version_id IS NOT NULL OR v.kind = 'custom'
 ORDER BY 1, 2, 4;

-- 5 · (testes 4 e 9) fotografia de version: por projeto e kind, com locked e
-- is_default. Antes e depois: idênticos.
SELECT t.name AS empresa, p.name AS projeto, v.kind, v.key, v.locked, v.is_default, v.status
  FROM version v
  JOIN project p ON p.id = v.project_id
  JOIN tenant t ON t.id = v.tenant_id
 ORDER BY 1, 2, 3, 4;

-- 6 · (teste 5) contagem de budget_line, unit, despesa e cash_entry por versão.
SELECT t.name AS empresa, p.name AS projeto, v.key,
       (SELECT count(*) FROM budget_line b WHERE b.version_id = v.id) AS budget_line,
       (SELECT count(*) FROM unit u        WHERE u.version_id = v.id) AS unit,
       (SELECT count(*) FROM despesa d     WHERE d.version_id = v.id) AS despesa,
       (SELECT count(*) FROM cash_entry c  WHERE c.version_id = v.id) AS cash_entry
  FROM version v
  JOIN project p ON p.id = v.project_id
  JOIN tenant t ON t.id = v.tenant_id
 ORDER BY 1, 2, 3;

-- 7 · overrides gravados com a chave "versao" (ficam no banco, inertes).
SELECT t.name AS empresa, u.email, m.role, m.permissions::jsonb->'versao' AS override_versao
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id
 WHERE m.permissions::jsonb ? 'versao'
 ORDER BY 1, 2;

-- Prompt D · Orçamentos — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- A · grupos do Plano de Contas por natureza (BD-5 / seção 5): quem é receita hoje
SELECT t.name AS tenant, c.group_code, c.group_name, c.kind,
       bool_or(c.natureza = 'receita') AS grupo_e_receita,
       string_agg(c.code || ' ' || c.name, ' | ') FILTER (WHERE c.natureza = 'receita') AS subitens_receita,
       bool_or(c.ativo) AS ativo
  FROM chart_account c JOIN tenant t ON t.id = c.tenant_id
 GROUP BY 1,2,3,4 ORDER BY 1,2;

-- B · existe grupo "Outras Receitas" / "Receitas do Projeto" no plano? (BD-5)
SELECT t.name AS tenant, c.group_code, c.group_name, c.natureza, c.ativo
  FROM chart_account c JOIN tenant t ON t.id = c.tenant_id
 WHERE lower(c.group_name) LIKE '%outras receitas%' OR lower(c.group_name) LIKE '%receitas do projeto%';

-- C · linha de base do teste 8.9: contagens e somas por versão (ANTES; rodar de novo DEPOIS)
SELECT t.name AS tenant, p.name AS projeto, v.kind, v.label, v.status, v.locked,
       (SELECT count(*) FROM budget_account a WHERE a.version_id = v.id) AS contas,
       (SELECT coalesce(sum(a.total),0) FROM budget_account a WHERE a.version_id = v.id) AS soma_totais,
       (SELECT count(*) FROM budget_line l WHERE l.version_id = v.id) AS linhas,
       (SELECT coalesce(sum(l.valor),0) FROM budget_line l WHERE l.version_id = v.id) AS soma_valores
  FROM version v JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = v.tenant_id
 WHERE v.kind IN ('budget','forecast')
 ORDER BY 1,2,3,4;

-- D · linhas legadas (BD-2): chave sem grupo ativo correspondente, por versão — inclui "Receita" e "Outras Receitas" antigas
SELECT t.name AS tenant, p.name AS projeto, v.kind, v.label, a.kind AS bloco, a.row_key, a.total,
       (SELECT count(*) FROM budget_line l WHERE l.version_id = v.id AND l.kind = a.kind AND l.row_key = a.row_key) AS competencias
  FROM budget_account a
  JOIN version v ON v.id = a.version_id JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = v.tenant_id
 WHERE NOT EXISTS (SELECT 1 FROM chart_account c WHERE c.tenant_id = a.tenant_id AND c.group_code = a.row_key AND c.ativo)
 ORDER BY 1,2,3,5,6;

-- E · BD-1: o que a célula somente-leitura vai mostrar por obra (entrada financeira) × linha legada "Receita"
SELECT p.name AS projeto, p.valor_construcao, p.valor_terreno, p.terreno_fora_caixa,
       CASE WHEN p.terreno_fora_caixa THEN coalesce(p.valor_construcao,0) ELSE coalesce(p.valor_construcao,0) + coalesce(p.valor_terreno,0) END AS entrada_financeira,
       (SELECT sum(a.total) FROM budget_account a JOIN version v ON v.id = a.version_id WHERE v.project_id = p.id AND v.kind = 'budget' AND a.kind = 'receita' AND a.row_key = 'Receita') AS total_linha_legada_receita
  FROM project p WHERE p.kind = 'proj' ORDER BY p.name;

-- F · contas zeradas que a gravação atual descarta (BD-6): nenhuma, por construção — conferência
SELECT count(*) AS contas_zeradas FROM budget_account a
 WHERE a.total = 0 AND NOT EXISTS (SELECT 1 FROM budget_line l WHERE l.version_id = a.version_id AND l.kind = a.kind AND l.row_key = a.row_key);

-- G · replicações registradas (2.6): data da última por versão
SELECT entity_id AS version_id, max(created_at) AS ultima_replicacao, count(*) AS vezes
  FROM audit_log WHERE action = 'budget.replicateFromAtual' GROUP BY 1 ORDER BY 2 DESC;

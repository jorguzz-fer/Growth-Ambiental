-- Prompt H · Rascunho não entra em relatório — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- BH-1 · versões por tipo e situação, em todos os tenants e projetos (antes de qualquer código)
SELECT t.name AS tenant, v.kind, v.status, count(*) AS versoes
  FROM version v JOIN tenant t ON t.id = v.tenant_id
 GROUP BY 1,2,3 ORDER BY 1,2,3;

-- 5.3 · lista de conferência: versões de PLANEJAMENTO (budget/forecast) que não estão Aprovadas,
--       com projeto, nome, situação e o que sairia dos relatórios (totais de receitas e despesas)
SELECT t.name AS tenant, p.name AS projeto, v.kind, v.label AS nome, v.status, v.locked,
       coalesce((SELECT sum(a.total) FROM budget_account a WHERE a.version_id = v.id AND a.kind = 'receita'), 0) AS total_receitas,
       coalesce((SELECT sum(a.total) FROM budget_account a WHERE a.version_id = v.id AND a.kind = 'despesa'), 0) AS total_despesas,
       (SELECT count(*) FROM budget_line l WHERE l.version_id = v.id) AS linhas
  FROM version v JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = v.tenant_id
 WHERE v.kind IN ('budget','forecast') AND v.status <> 'Aprovado'
 ORDER BY 1,2,3,4;

-- BH-2 · a versão Atual também tem situação (default Rascunho): nunca filtrada — conferência
SELECT status, count(*) FROM version WHERE kind = 'atual' GROUP BY 1;

-- 8.10 · linha de base dos relatórios com a chave desligada: receita e despesa orçadas por versão
SELECT p.name AS projeto, v.kind, v.label, v.status,
       coalesce((SELECT sum(l.valor) FROM budget_line l WHERE l.version_id = v.id AND l.kind = 'receita'), 0) AS receita_orcada,
       coalesce((SELECT sum(l.valor) FROM budget_line l WHERE l.version_id = v.id AND l.kind = 'despesa'), 0) AS despesa_orcada
  FROM version v JOIN project p ON p.id = v.project_id
 WHERE v.kind IN ('budget','forecast') ORDER BY 1,2,3;

-- Estado da chave por tenant (B4)
SELECT t.name AS tenant, f.chave, f.ligada, f.alterada_por, f.alterada_em
  FROM tenant_flag f JOIN tenant t ON t.id = f.tenant_id WHERE f.chave = 'rascunho_fora_dos_relatorios';

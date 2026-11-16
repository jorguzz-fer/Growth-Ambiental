-- Decisões de 01/10/2026. Diagnóstico SOMENTE LEITURA. Rodar em produção.

-- 1 · Item 6 · versões travadas. Se der zero, a coluna `locked` pode ser
-- descontinuada (decisão do dono).
SELECT p.name AS projeto, v.kind, v.label, v.status, v.locked
  FROM version v JOIN project p ON p.id = v.project_id
 WHERE v.locked
 ORDER BY p.name, v.created_at;
SELECT count(*) FILTER (WHERE locked) AS travadas, count(*) AS versoes FROM version;

-- 2 · Item 4 · a "receita do projeto" em três telas:
--   Orçamentos (BD-1): entrada financeira = construção (+ terreno só quando
--     terreno_fora_caixa = false);
--   Dashboard "% recebido": construção + terreno, sempre;
--   Resumo "VGV": soma de unit.valor da versão (não usa o cadastro).
SELECT p.name,
       coalesce(p.valor_construcao,0) AS construcao,
       coalesce(p.valor_terreno,0)    AS terreno,
       p.terreno_fora_caixa,
       CASE WHEN p.terreno_fora_caixa = false
            THEN coalesce(p.valor_construcao,0) + coalesce(p.valor_terreno,0)
            ELSE coalesce(p.valor_construcao,0) END        AS orcamentos_entrada_financeira,
       coalesce(p.valor_construcao,0) + coalesce(p.valor_terreno,0) AS dashboard_pct_recebido,
       (SELECT coalesce(sum(u.valor),0) FROM unit u JOIN version v ON v.id = u.version_id
         WHERE v.project_id = p.id AND v.kind = 'atual')    AS resumo_vgv_atual
  FROM project p
 ORDER BY p.name;

-- 3 · Item 10 · lista de conferência antes de ligar "Rascunho fora dos
-- relatórios": as versões de planejamento fora de Aprovado, com os totais.
SELECT p.name AS projeto, v.kind, v.label, v.status,
       (SELECT coalesce(sum(a.total),0) FROM budget_account a WHERE a.version_id = v.id AND a.kind = 'receita') AS receitas,
       (SELECT coalesce(sum(a.total),0) FROM budget_account a WHERE a.version_id = v.id AND a.kind = 'despesa') AS despesas
  FROM version v JOIN project p ON p.id = v.project_id
 WHERE v.kind IN ('budget','forecast') AND v.status <> 'Aprovado'
 ORDER BY p.name, v.kind, v.created_at;

-- Diagnóstico do Plano de Contas por empresa — SOMENTE LEITURA.
-- Uso: psql "$DATABASE_URL" -f scripts/diagnostico-plano-contas.sql
-- Não altera nada: só SELECT, dentro de uma transação somente leitura.
BEGIN READ ONLY;

\echo '== 1. Empresas, quantidade de contas e qual plano cada uma tem =='
SELECT t.id, t.name, t.created_at::date AS criada_em,
       count(a.*)                                   AS contas,
       count(a.*) FILTER (WHERE a.ativo)            AS ativas,
       CASE
         WHEN bool_or(a.group_name IN ('Fundações e Contenções','Supraestrutura','Pós-obra','Paredes e Painéis')) THEN 'OBRA (construção)'
         WHEN bool_or(a.code ~ '^[0-9]+\.[0-9]+\.[0-9]+$') THEN 'AMBIENTAL (padrão novo, 3 níveis)'
         WHEN bool_or(a.group_code IN ('IMP','J','R')) THEN 'AMBIENTAL anterior (v1)'
         ELSE 'outro / vazio'
       END AS plano
FROM tenant t LEFT JOIN chart_account a ON a.tenant_id = t.id
GROUP BY t.id ORDER BY t.created_at;

\echo '== 2. Grupos gravados por empresa =='
SELECT t.name, a.group_code, a.group_name, a.kind, count(*) AS contas
FROM chart_account a JOIN tenant t ON t.id = a.tenant_id
GROUP BY 1,2,3,4 ORDER BY 1, a.group_code;

\echo '== 3. Uso das contas: despesas por conta (todas as versões) =='
SELECT t.name, d.conta_cef, a.name AS conta, v.kind AS versao, v.locked AS congelada,
       count(*) AS despesas, sum(d.valor) AS valor
FROM despesa d
JOIN tenant t ON t.id = d.tenant_id
JOIN version v ON v.id = d.version_id
LEFT JOIN chart_account a ON a.tenant_id = d.tenant_id AND a.code = d.conta_cef
GROUP BY 1,2,3,4,5 ORDER BY 1,2;

\echo '== 4. Orçamento/Previsão por grupo (chave da linha) =='
SELECT t.name, b.kind, b.row_key, v.kind AS versao, count(*) AS linhas, sum(b.valor) AS valor
FROM budget_line b JOIN tenant t ON t.id = b.tenant_id JOIN version v ON v.id = b.version_id
GROUP BY 1,2,3,4 ORDER BY 1,2,3;

\echo '== 5. Medições por grupo =='
SELECT t.name, m.grupo_code, m.grupo_name, count(*) AS medicoes, sum(m.valor) AS valor
FROM medicao m JOIN tenant t ON t.id = m.tenant_id
GROUP BY 1,2,3 ORDER BY 1,2;

\echo '== 6. Versões congeladas (não podem ser reclassificadas) =='
SELECT t.name, p.name AS projeto, v.kind, v.label
FROM version v JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = v.tenant_id
WHERE v.locked ORDER BY 1,2;

\echo '== 7. Usuários e a empresa que cada um abre (primeiro vínculo) =='
SELECT DISTINCT ON (u.email) u.email, t.name AS empresa_aberta, m.role
FROM membership m JOIN "user" u ON u.id = m.user_id JOIN tenant t ON t.id = m.tenant_id
ORDER BY u.email, m.created_at;

ROLLBACK;

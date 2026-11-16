-- Prompt O (Liberações de Obra) · diagnóstico SOMENTE LEITURA para rodar no
-- Postgres de produção antes e depois das PRs. Nenhum comando aqui grava nada.

-- ---------------------------------------------------------------------------
-- 1. Antes/depois (Prompt O, teste 13): contagem de `reembolso` e soma de
--    `valor` por versão, em todos os projetos. Rodar antes da primeira PR e
--    depois da última; as duas saídas têm de ser idênticas.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, v.kind AS versao, v.label,
       count(r.id) AS liberacoes, coalesce(sum(r.valor), 0) AS soma_valor
FROM version v
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = p.tenant_id
LEFT JOIN reembolso r ON r.version_id = v.id
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4;

-- ---------------------------------------------------------------------------
-- 2. BO-2 (reconferência): lançamentos com "%" preenchido e com quais valores.
--    Decisão de 30/09: o campo saiu da tela; a coluna fica, o valor não muda.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, r.data, r.origem, r.valor, r.pct
FROM reembolso r
JOIN version v ON v.id = r.version_id
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = r.tenant_id
WHERE coalesce(trim(r.pct), '') <> ''
ORDER BY 1, 2, 3;

-- ---------------------------------------------------------------------------
-- 3. Seção 5 (status): quais valores existem hoje. "received" vem da
--    importação de planilha, "Recebido" da tela. Nenhum é migrado.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, coalesce(nullif(trim(r.status), ''), '(em branco)') AS status, count(*) AS liberacoes
FROM reembolso r JOIN tenant t ON t.id = r.tenant_id
GROUP BY 1, 2 ORDER BY 1, 2;

-- ---------------------------------------------------------------------------
-- 4. Seção 3.1 (o que já nasceu inválido): valor zero ou negativo, data em
--    branco ou fora do formato gravado, origem em branco. Só reportar.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, r.id, r.data, r.origem, r.valor, r.serial,
       CASE WHEN coalesce(r.valor, 0) <= 0 THEN 'valor <= 0 ' ELSE '' END ||
       CASE WHEN coalesce(trim(r.data), '') = '' OR r.data !~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN 'data inválida ' ELSE '' END ||
       CASE WHEN coalesce(trim(r.origem), '') = '' THEN 'sem origem' ELSE '' END AS problema
FROM reembolso r
JOIN version v ON v.id = r.version_id
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = r.tenant_id
WHERE coalesce(r.valor, 0) <= 0
   OR coalesce(trim(r.data), '') = '' OR r.data !~ '^\d{1,2}/\d{1,2}/\d{4}$'
   OR coalesce(trim(r.origem), '') = ''
ORDER BY 1, 2, 4;

-- ---------------------------------------------------------------------------
-- 5. Seção 6.2 (duplicidade aparente): mesmo valor, mesma data e mesma origem
--    lançados mais de uma vez na mesma versão. Só reportar.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, v.kind AS versao, r.data, r.origem, r.valor, count(*) AS vezes
FROM reembolso r
JOIN version v ON v.id = r.version_id
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = r.tenant_id
GROUP BY 1, 2, 3, 4, 5, 6
HAVING count(*) > 1
ORDER BY 1, 2, 3, 4;

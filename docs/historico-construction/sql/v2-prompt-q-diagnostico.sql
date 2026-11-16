-- Prompt Q (Parâmetros / INCC) · diagnóstico SOMENTE LEITURA para rodar no
-- Postgres de produção antes e depois das PRs. Nenhum comando aqui grava nada.

-- ---------------------------------------------------------------------------
-- 1. Antes/depois (Prompt Q, teste 13): conteúdo integral de `incc_rate`,
--    por projeto. Rodar antes da primeira PR e depois da última; sem ação do
--    usuário, as duas saídas têm de ser idênticas.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, i.ordem, i.mes, i.monthly, i.accumulated, i.projected
FROM incc_rate i
JOIN project p ON p.id = i.project_id
JOIN tenant t ON t.id = i.tenant_id
ORDER BY 1, 2, 3;

-- ---------------------------------------------------------------------------
-- 2. Resumo por projeto: quantos meses, quantos projetados, primeiro e último.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, count(*) AS meses,
       count(*) FILTER (WHERE i.projected) AS projetados,
       min(i.mes) AS primeiro, max(i.mes) AS ultimo
FROM incc_rate i
JOIN project p ON p.id = i.project_id
JOIN tenant t ON t.id = i.tenant_id
GROUP BY 1, 2 ORDER BY 1, 2;

-- ---------------------------------------------------------------------------
-- 3. Seção 2 / relatório final, item 4: meses OFICIAIS estritamente futuros
--    (depois do mês corrente) — os que o botão de reprojetar apagaria hoje.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, i.mes, i.monthly, i.accumulated
FROM incc_rate i
JOIN project p ON p.id = i.project_id
JOIN tenant t ON t.id = i.tenant_id
WHERE NOT i.projected
  AND (split_part(i.mes, '/', 2)::int * 12 + split_part(i.mes, '/', 1)::int - 1)
      > (extract(year from current_date)::int * 12 + extract(month from current_date)::int - 1)
ORDER BY 1, 2, 3;

-- ---------------------------------------------------------------------------
-- 4. Seção 4.3: índices fora da faixa plausível (abaixo de -5% ou acima de
--    +5% ao mês) — provável erro de digitação. Só reportar.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, i.mes, i.monthly, i.projected
FROM incc_rate i
JOIN project p ON p.id = i.project_id
JOIN tenant t ON t.id = i.tenant_id
WHERE i.monthly < -5 OR i.monthly > 5
ORDER BY 1, 2, 3;

-- ---------------------------------------------------------------------------
-- 5. Seção 6.3 (cobertura): meses da janela de competências de cada obra que
--    NÃO têm linha na tabela — recebível com vencimento ali é corrigido por
--    zero, silenciosamente. Só reportar.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra,
       min(i.mes) AS incc_primeiro, max(i.mes) AS incc_ultimo,
       p.start_date, p.end_date
FROM project p
JOIN tenant t ON t.id = p.tenant_id
LEFT JOIN incc_rate i ON i.project_id = p.id
GROUP BY 1, 2, 5, 6
ORDER BY 1, 2;

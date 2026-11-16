-- Bloco 2 (a receita) — levantamentos que os prompts pedem ANTES de qualquer
-- código. Somente leitura: só SELECT, nada é alterado.
-- Rode no Postgres de produção e cole o resultado de cada bloco na conversa.

-- ───────────────────────────────────────────────────────────────────────────
-- 1 · BJ-2 — unidades com o mesmo código na mesma versão (Prompt J)
--     Se houver, a trava de código único não pode ser criada antes de você
--     decidir, caso a caso, qual registro fica.
-- ───────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa, p.name AS obra, v.label AS versao, u.code AS unidade,
       count(*) AS ocorrencias,
       string_agg(u.valor::text || ' / ' || u.status::text, ' | ' ORDER BY u.created_at) AS valor_e_status
FROM unit u
JOIN version v ON v.id = u.version_id
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = u.tenant_id
GROUP BY t.name, p.name, v.label, u.code
HAVING count(*) > 1
ORDER BY 1, 2, 3, 4;

-- ───────────────────────────────────────────────────────────────────────────
-- 2 · BK-4 — contas a receber marcadas "Recebido" sem movimento de caixa
--     (Prompt K). Nada será corrigido sozinho: viram "recebida, não conciliada".
-- ───────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa, count(*) AS contas, sum(cr.valor) AS valor_total,
       min(cr.data_recebimento) AS primeira, max(cr.data_recebimento) AS ultima
FROM conta_receber cr
JOIN tenant t ON t.id = cr.tenant_id
WHERE cr.status ILIKE 'recebid%' AND cr.origem_cash_entry_id IS NULL AND NOT cr.cancelado
GROUP BY t.name
ORDER BY 1;

-- 2b · os status de conta a receber em uso (o campo é livre)
SELECT t.name AS empresa, cr.status, count(*) AS contas
FROM conta_receber cr JOIN tenant t ON t.id = cr.tenant_id
GROUP BY 1, 2 ORDER BY 1, 3 DESC;

-- ───────────────────────────────────────────────────────────────────────────
-- 3 · BP-1 — bens de permuta que já entraram no Estoque (Prompt P)
--     Hoje, uma entrada de estoque com origem "Permuta" grava o vínculo.
-- ───────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa, count(*) AS movimentos, count(DISTINCT sm.permuta_id) AS permutas
FROM stock_movement sm JOIN tenant t ON t.id = sm.tenant_id
WHERE sm.permuta_id IS NOT NULL
GROUP BY 1 ORDER BY 1;

-- ───────────────────────────────────────────────────────────────────────────
-- 4 · BP-2 — permutas que já geram receita sem estar vendidas (Prompt P)
--     Hoje a receita sai de valor/data de venda preenchidos, não do status.
-- ───────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa, coalesce(nullif(trim(pm.status), ''), '(em branco)') AS status,
       count(*) AS permutas, sum(pm.valor_venda) AS valor_venda_total
FROM permuta pm JOIN tenant t ON t.id = pm.tenant_id
WHERE pm.valor_venda IS NOT NULL AND coalesce(pm.data_venda, '') <> ''
GROUP BY 1, 2 ORDER BY 1, 2;

-- ───────────────────────────────────────────────────────────────────────────
-- 5 · BO-2 — o campo "%" das Liberações de Obra é usado? (Prompt O)
-- ───────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       count(*) AS liberacoes,
       count(*) FILTER (WHERE coalesce(trim(r.pct), '') <> '') AS com_pct,
       string_agg(DISTINCT trim(r.pct), ', ') FILTER (WHERE coalesce(trim(r.pct), '') <> '') AS valores
FROM reembolso r JOIN tenant t ON t.id = r.tenant_id
GROUP BY 1 ORDER BY 1;

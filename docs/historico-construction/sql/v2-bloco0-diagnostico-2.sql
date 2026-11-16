-- V2 · BLOCO 0 · DIAGNÓSTICO 2 — SOMENTE LEITURA (termina em ROLLBACK)
-- Complementa o primeiro: explica os números estranhos da numeração de despesas.
\pset pager off
BEGIN TRANSACTION READ ONLY;

-- 1. Formatos do número da despesa (cada dígito vira 9)
SELECT t.name AS empresa,
       regexp_replace(d.num_doc, '\d', '9', 'g') AS formato,
       count(*) AS qtd,
       min(d.num_doc) AS exemplo
  FROM despesa d JOIN tenant t ON t.id = d.tenant_id
 GROUP BY 1, 2
 ORDER BY 1, 3 DESC;

-- 2. Números iguais ou acima do contador (o próximo número pode colidir com eles)
SELECT t.name AS empresa, ns.next_number AS contador, d.num_doc, d.created_at::date AS criada_em
  FROM despesa d
  JOIN tenant t ON t.id = d.tenant_id
  JOIN number_sequence ns ON ns.tenant_id = d.tenant_id AND ns.entity = 'despesa'
 WHERE substring(d.num_doc FROM '(\d{1,18})\s*$')::bigint >= ns.next_number
 ORDER BY substring(d.num_doc FROM '(\d{1,18})\s*$')::bigint
 LIMIT 60;

-- 3. Mesmo número final escrito de jeitos diferentes (ex.: PED-000123 e 123)
SELECT t.name AS empresa,
       substring(d.num_doc FROM '(\d{1,18})\s*$')::bigint AS numero,
       array_agg(d.num_doc ORDER BY d.num_doc) AS como_aparece
  FROM despesa d JOIN tenant t ON t.id = d.tenant_id
 WHERE substring(d.num_doc FROM '(\d{1,18})\s*$') IS NOT NULL
 GROUP BY 1, 2
HAVING count(*) > 1
 ORDER BY 1, 2;

-- 4. Telas sem permissão personalizada (caem no padrão do papel)
SELECT t.name AS empresa, u.name, m.role,
       array_agg(s ORDER BY s) AS telas_no_padrao
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id
  CROSS JOIN unnest(ARRAY[
   'dashboard','projecao','consolidado','caixa','fechamento','balancodia','dre',
   'fluxocaixa','medicao','resumo','unidades','budget','forecast','clientes',
   'contasreceber','medicaolanc','simulador','reembolso','permuta','parametros',
   'despesas','contaspagar','restituicoes','fornecedores','planocontas','contas',
   'estoque','ponto','backup','usuarios','acessos','acoes','contabilidade',
   'empresa','projeto','numeracao','versao','diagnosticoia']) s
 WHERE jsonb_typeof(m.permissions) = 'object'
   AND m.permissions -> s IS NULL
 GROUP BY 1, 2, 3
 ORDER BY 1, 2;

ROLLBACK;

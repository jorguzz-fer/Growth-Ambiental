-- Prompt AC · DRE. Diagnóstico SOMENTE LEITURA, por empresa e projeto (em vez
-- de :proj e :ver, agrupa). Rodar em produção antes do deploy.

-- BAC-1 · 1) as origens de receita lado a lado, por projeto (versão Atual).
SELECT t.name AS empresa, p.name AS projeto,
  (SELECT coalesce(sum(c.valor),0) FROM conta_receber c WHERE c.project_id = p.id AND NOT c.cancelado) AS conta_receber,
  (SELECT coalesce(sum(r.valor),0) FROM reembolso r JOIN version v ON v.id = r.version_id WHERE v.project_id = p.id AND v.kind = 'atual') AS reembolso,
  coalesce(p.valor_construcao,0) + coalesce(p.valor_terreno,0) AS valor_global,
  (SELECT count(*) FROM unit u JOIN version v ON v.id = u.version_id WHERE v.project_id = p.id AND v.kind = 'atual') AS unidades
  FROM project p JOIN tenant t ON t.id = p.tenant_id
 ORDER BY 1, 2;

-- BAC-1 · 2) a linha Banco — o financiamento inteiro num mês só.
SELECT t.name AS empresa, p.name AS projeto, u.code, u.status,
       u.payment_plan->'Banco'->>'valFinanc'    AS val_financ,
       u.payment_plan->'Banco'->>'dataPrimParc' AS data_prim_parc,
       u.payment_plan->'Banco'->>'statusFinanc' AS status_financ
  FROM unit u JOIN version v ON v.id = u.version_id JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = u.tenant_id
 WHERE v.kind = 'atual' AND u.status = 'Vendido'
 ORDER BY 1, 2, 3;

-- BAC-1 · 3) despesas por categoria e status, por projeto e tipo de versão.
SELECT t.name AS empresa, p.name AS projeto, v.kind,
       coalesce(d.categoria_dre::text,'(sem categoria)') AS categoria,
       coalesce(d.status,'(sem status)') AS status,
       count(*) AS qtd, sum(d.valor) AS total
  FROM despesa d JOIN version v ON v.id = d.version_id JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = d.tenant_id
 WHERE NOT d.cancelado
 GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5;

-- BAC-1 · 4) o que a DRE descarta ou esconde: sem categoria (fora de tudo) e
-- sem competência (só no Acumulado).
SELECT t.name AS empresa, p.name AS projeto, v.kind, d.num_doc, d.valor, d.categoria_dre, d.competencia, d.status
  FROM despesa d JOIN version v ON v.id = d.version_id JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = d.tenant_id
 WHERE NOT d.cancelado
   AND (d.categoria_dre IS NULL OR d.competencia IS NULL OR btrim(d.competencia) = '')
 ORDER BY 1, 2, d.valor DESC;

-- BAC-2 · versões por projeto e tipo, e cópias.
SELECT t.name AS empresa, p.name AS projeto, v.kind, count(*) AS versoes,
       sum(CASE WHEN v.source_version_id IS NOT NULL THEN 1 ELSE 0 END) AS copias
  FROM version v JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = v.tenant_id
 GROUP BY 1,2,3 ORDER BY 1,2,3;

-- BAC-4 · a "quinta origem": despesa com categoria Receita (soma na receita da DRE).
SELECT t.name AS empresa, p.name AS projeto, v.kind, count(*) AS qtd, sum(d.valor) AS total
  FROM despesa d JOIN version v ON v.id = d.version_id JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = d.tenant_id
 WHERE NOT d.cancelado AND d.categoria_dre = 'Receita'
 GROUP BY 1,2,3 ORDER BY 1,2,3;

-- 3.1 · encargos (multa + juros + outros − desconto) cujo mês de pagamento é
-- diferente da competência da despesa — o que muda de mês com a regra nova.
SELECT t.name AS empresa, p.name AS projeto, d.num_doc, d.competencia,
       pg.data_pagamento,
       (coalesce(pg.multa,0) + coalesce(pg.juros,0) + coalesce(pg.outros_acrescimos,0) - coalesce(pg.desconto,0)) AS encargo
  FROM pagamento pg JOIN despesa d ON d.id = pg.despesa_id JOIN version v ON v.id = d.version_id
  JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = d.tenant_id
 WHERE (coalesce(pg.multa,0) + coalesce(pg.juros,0) + coalesce(pg.outros_acrescimos,0) - coalesce(pg.desconto,0)) <> 0
   AND d.competencia IS DISTINCT FROM (split_part(pg.data_pagamento,'/',1) || '/' || split_part(pg.data_pagamento,'/',3))
 ORDER BY 1, 2;

-- 25 · fotografia de antes e depois (contagem e soma).
SELECT t.name AS empresa,
  (SELECT count(*) || ' / ' || coalesce(sum(valor),0) FROM despesa x WHERE x.tenant_id = t.id) AS despesa,
  (SELECT count(*) || ' / ' || coalesce(sum(valor),0) FROM conta_receber x WHERE x.tenant_id = t.id) AS conta_receber,
  (SELECT count(*) || ' / ' || coalesce(sum(valor),0) FROM reembolso x WHERE x.tenant_id = t.id) AS reembolso,
  (SELECT count(*) FROM permuta x WHERE x.tenant_id = t.id) AS permuta,
  (SELECT count(*) FROM unit x WHERE x.tenant_id = t.id) AS unit,
  (SELECT count(*) FROM version x WHERE x.tenant_id = t.id) AS version
  FROM tenant t ORDER BY 1;

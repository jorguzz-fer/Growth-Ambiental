-- Prompt AB · Remoção de três telas (Projeção, Consolidado, Balanço do Dia).
-- Diagnóstico SOMENTE LEITURA. Fotografia para o teste 4 (antes e depois da
-- remoção, quando ela acontecer): contagem por tabela e por empresa.
SELECT t.name AS empresa,
  (SELECT count(*) FROM daily_closing x WHERE x.tenant_id = t.id) AS daily_closing,
  (SELECT count(*) FROM carry_over    x WHERE x.tenant_id = t.id) AS carry_over,
  (SELECT count(*) FROM permuta       x WHERE x.tenant_id = t.id) AS permuta,
  (SELECT count(*) FROM reembolso     x WHERE x.tenant_id = t.id) AS reembolso,
  (SELECT count(*) FROM unit          x WHERE x.tenant_id = t.id) AS unit,
  (SELECT count(*) FROM conta_receber x WHERE x.tenant_id = t.id) AS conta_receber,
  (SELECT count(*) FROM budget_line   x WHERE x.tenant_id = t.id) AS budget_line,
  (SELECT count(*) FROM cash_entry    x WHERE x.tenant_id = t.id) AS cash_entry
  FROM tenant t
 ORDER BY t.name;

-- BAB-2 · dias fechados hoje (o Balanço do Dia é o único leitor).
SELECT t.name AS empresa, count(*) AS fechamentos, min(d.dia) AS primeiro, max(d.dia) AS ultimo
  FROM daily_closing d
  JOIN tenant t ON t.id = d.tenant_id
 GROUP BY t.name
 ORDER BY t.name;

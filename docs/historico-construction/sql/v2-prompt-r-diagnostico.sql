-- Prompt R · Contas a Pagar — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- BR-1 · sequência de PED × maior número usado, e números repetidos
SELECT ns.tenant_id, ns.prefix, ns.digits, ns.next_number,
       (SELECT max((regexp_match(num_doc, '(\d+)\s*$'))[1]::bigint) FROM despesa d WHERE d.tenant_id = ns.tenant_id) AS maior_usado
  FROM number_sequence ns WHERE ns.entity = 'despesa';
SELECT tenant_id, num_doc, count(*) FROM despesa WHERE num_doc IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1;

-- BR-2 · o projeto guarda-chuva
SELECT id, name, kind, status, cliente_id, start_date, end_date FROM project WHERE name ILIKE '%DESPESAS GERAIS%';

-- 3.3 · despesas em versões que não são Atual (hoje regidas pela chave contas_pagar_so_atual)
SELECT p.name, v.kind, v.label, count(*) AS qtd, sum(d.valor) AS total
  FROM despesa d JOIN version v ON v.id = d.version_id JOIN project p ON p.id = v.project_id
 WHERE v.kind <> 'atual' AND NOT d.cancelado GROUP BY 1, 2, 3 ORDER BY 5 DESC;

-- 2.5 · pendente hoje (saldo por despesa) × pendente pela regra nova (por obrigação que vence: parcela em aberto)
WITH saldo_despesa AS (
  SELECT d.id, d.version_id, d.valor::numeric
         - coalesce((SELECT sum(g.valor_total_pago - coalesce(g.desconto,0) - coalesce(g.multa,0) - coalesce(g.juros,0) - coalesce(g.outros_acrescimos,0)) FROM pagamento g WHERE g.despesa_id = d.id), 0)
         - coalesce((SELECT sum(i.valor_abatido) FROM acerto_item i JOIN acerto a ON a.id = i.acerto_id WHERE i.despesa_id = d.id AND NOT a.estornado), 0) AS saldo
    FROM despesa d WHERE NOT d.cancelado AND d.status <> 'Pago'
)
SELECT p.name AS projeto,
       sum(greatest(s.saldo, 0)) AS pendente_hoje,
       sum(CASE WHEN EXISTS (SELECT 1 FROM despesa_parcela x WHERE x.despesa_id = s.id)
                THEN (SELECT sum(greatest(x.valor_original - coalesce(x.valor_pago,0), 0)) FROM despesa_parcela x WHERE x.despesa_id = s.id AND x.status <> 'Pago')
                ELSE greatest(s.saldo, 0) END) AS pendente_por_obrigacao
  FROM saldo_despesa s JOIN version v ON v.id = s.version_id JOIN project p ON p.id = v.project_id
 WHERE v.kind = 'atual' GROUP BY 1 ORDER BY 1;

-- 1 · despesas parceladas e parcelas em aberto (o que passa a ser uma linha cada)
SELECT count(DISTINCT despesa_id) AS despesas_parceladas, count(*) FILTER (WHERE status <> 'Pago') AS parcelas_em_aberto,
       count(*) FILTER (WHERE numero_cheque IS NOT NULL) AS com_cheque
  FROM despesa_parcela;

-- 4.6 · parcialmente pagas com vencimento passado (viram "Vencida" pela recomendação)
SELECT count(*), coalesce(sum(valor), 0) FROM despesa
 WHERE status = 'Parcialmente paga' AND NOT cancelado
   AND to_date(vencimento, 'MM/DD/YYYY') < current_date;

-- 20 · antes/depois: nenhuma escrita
SELECT 'despesa' AS t, count(*), md5(string_agg(d::text, '|' ORDER BY id)) FROM despesa d
UNION ALL SELECT 'despesa_parcela', count(*), md5(coalesce(string_agg(x::text, '|' ORDER BY id), '')) FROM despesa_parcela x
UNION ALL SELECT 'pagamento', count(*), md5(coalesce(string_agg(g::text, '|' ORDER BY id), '')) FROM pagamento g;

-- Prompt AD · Fluxo de Caixa. Diagnóstico SOMENTE LEITURA. Rodar em produção.

-- BAD-1 · o saldo inicial de hoje e do que ele é feito. A tela soma as contas
-- ATIVAS que não são do tipo "Terceiros" (saldoDisponivel), do tenant inteiro.
-- Conferir se SOCIO A, SOCIO B e CHEQUE TERCEIRO (Prompt X)
-- entram: entram se o tipo não for "Terceiros" e a conta estiver ativa.
SELECT t.name AS empresa, b.banco, b.tipo, b.ag, b.cc, b.saldo, b.saldo_source, b.ativo,
       (b.tipo <> 'Terceiros' AND b.ativo IS NOT FALSE) AS entra_no_saldo_inicial
  FROM bank_account b JOIN tenant t ON t.id = b.tenant_id
 ORDER BY t.name, b.tipo, b.banco;

-- BAD-2 · previsto da Atual, por situação da parcela (o que já foi liquidado
-- continua no previsto do mês do vencimento).
SELECT t.name AS empresa, to_char(now(),'MM/YYYY') AS hoje,
       p.status, count(*) AS parcelas, sum(p.valor_original) AS total
  FROM despesa_parcela p
  JOIN despesa d ON d.id = p.despesa_id
  JOIN version v ON v.id = d.version_id
  JOIN tenant t ON t.id = d.tenant_id
 WHERE v.kind = 'atual' AND NOT d.cancelado
 GROUP BY 1, 2, 3 ORDER BY 1, 3;

-- 1.1 · caixa gravado em versão que NÃO é a Atual (aparece como "realizado"
-- se essa versão for marcada primeiro no seletor).
SELECT t.name AS empresa, p.name AS projeto, v.kind, v.label, count(*) AS lancamentos, sum(c.valor) AS soma
  FROM cash_entry c JOIN version v ON v.id = c.version_id JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = c.tenant_id
 WHERE v.kind <> 'atual'
 GROUP BY 1, 2, 3, 4 ORDER BY 1, 2;

-- 1.2 · permutas gravadas em versão de planejamento (somam na coluna de Orçamento/Previsão).
SELECT t.name AS empresa, p.name AS projeto, v.kind, count(*) AS permutas, sum(pe.valor_venda) AS valor_venda
  FROM permuta pe JOIN version v ON v.id = pe.version_id JOIN project p ON p.id = v.project_id JOIN tenant t ON t.id = pe.tenant_id
 WHERE v.kind IN ('budget','forecast')
 GROUP BY 1, 2, 3 ORDER BY 1, 2;

-- 3.3 · caixa sem data (descartado da tela hoje).
SELECT t.name AS empresa, count(*) AS sem_data, sum(c.valor) AS soma
  FROM cash_entry c JOIN tenant t ON t.id = c.tenant_id
 WHERE c.data IS NULL OR btrim(c.data) = ''
 GROUP BY 1;

-- 1.4 · caixa conciliado × não conciliado (o realizado hoje conta os dois).
SELECT t.name AS empresa, c.rec, count(*) AS lancamentos, sum(c.valor) AS soma
  FROM cash_entry c JOIN tenant t ON t.id = c.tenant_id
 GROUP BY 1, 2 ORDER BY 1, 2;

-- 25 · fotografia de antes e depois.
SELECT t.name AS empresa,
  (SELECT count(*) || ' / ' || coalesce(sum(valor),0) FROM cash_entry x WHERE x.tenant_id = t.id) AS cash_entry,
  (SELECT count(*) || ' / ' || coalesce(sum(valor),0) FROM despesa x WHERE x.tenant_id = t.id) AS despesa,
  (SELECT count(*) FROM despesa_parcela x JOIN despesa d ON d.id = x.despesa_id WHERE d.tenant_id = t.id) AS despesa_parcela,
  (SELECT count(*) || ' / ' || coalesce(sum(valor),0) FROM conta_receber x WHERE x.tenant_id = t.id) AS conta_receber,
  (SELECT count(*) || ' / ' || coalesce(sum(saldo),0) FROM bank_account x WHERE x.tenant_id = t.id) AS bank_account
  FROM tenant t ORDER BY 1;

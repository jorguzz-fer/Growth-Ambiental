-- ---------------------------------------------------------------------------
-- MEDIÇÃO do Open Finance (Prompt AT §1.3, Revisão 4) — SOMENTE LEITURA.
--
-- Roda dentro de uma transação READ ONLY e termina em ROLLBACK: não grava nada.
-- Só contagens por empresa e conta; nenhum valor de movimento, nenhuma
-- descrição de extrato, nenhum dado de pessoa.
--
-- Funciona antes e depois da migração 0072 (não usa a coluna external_id).
--
--   psql "$DATABASE_URL" -f scripts/medicao-openfinance.sql > medicao-openfinance.txt
-- ---------------------------------------------------------------------------
BEGIN TRANSACTION READ ONLY;

\echo '=== (1) BAT-0: movimentos com cat = openfinance (o padrão do worker) ==='
-- Esperado: 0. O worker grava `cat = 'openfinance'` quando a Pluggy não manda categoria.
SELECT count(*) AS movimentos_cat_openfinance FROM cash_entry WHERE cat = 'openfinance';

\echo ''
\echo '=== (2) Contas ligadas ao Open Finance ==='
-- Esperado: 0 com open_finance_id e 0 já sincronizadas (last_sync).
-- Esta é a medição que vale: com categoria da Pluggy, o movimento não leva
-- `cat = openfinance`, mas a conta sempre tem open_finance_id.
SELECT count(*) FILTER (WHERE open_finance_id IS NOT NULL) AS contas_com_open_finance,
       count(*) FILTER (WHERE last_sync IS NOT NULL)       AS contas_ja_sincronizadas
FROM bank_account;

\echo ''
\echo '=== (3) Movimentos em contas ligadas ao Open Finance, por empresa e conta ==='
-- Esperado: nenhuma linha.
SELECT t.name AS empresa, b.banco, b.id AS conta,
       count(c.id)                    AS movimentos,
       count(DISTINCT c.version_id)   AS versoes,
       count(*) FILTER (WHERE c.rec)  AS conciliados
FROM bank_account b
JOIN tenant t ON t.id = b.tenant_id
LEFT JOIN cash_entry c ON c.bank_account_id = b.id
WHERE b.open_finance_id IS NOT NULL
GROUP BY t.name, b.banco, b.id
ORDER BY t.name, b.banco;

\echo ''
\echo '=== (4) Duplicados: o mesmo movimento (conta, data, valor, descrição) em mais de uma versão ==='
-- Só contas ligadas ao Open Finance (o worker antigo gravava uma cópia por versão Atual).
-- Esperado: nenhuma linha. BAT-1: nada é apagado antes da decisão do dono.
SELECT t.name AS empresa, b.banco, b.id AS conta,
       count(*)                  AS grupos_duplicados,
       sum(g.copias)             AS movimentos_nos_grupos,
       sum(g.conciliados)        AS conciliados_nos_grupos
FROM (
  SELECT c.tenant_id, c.bank_account_id,
         count(*)                       AS copias,
         count(*) FILTER (WHERE c.rec)  AS conciliados
  FROM cash_entry c
  JOIN bank_account b ON b.id = c.bank_account_id AND b.open_finance_id IS NOT NULL
  GROUP BY c.tenant_id, c.bank_account_id, c.data, c.valor, c.descricao
  HAVING count(DISTINCT c.version_id) > 1
) g
JOIN tenant t ON t.id = g.tenant_id
JOIN bank_account b ON b.id = g.bank_account_id
GROUP BY t.name, b.banco, b.id
ORDER BY t.name, b.banco;

ROLLBACK;

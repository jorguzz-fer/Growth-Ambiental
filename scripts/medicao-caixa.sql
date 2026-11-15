-- ---------------------------------------------------------------------------
-- MEDIÇÃO do Caixa (GA-11, §0) — SOMENTE LEITURA.
--
-- Roda numa transação READ ONLY e termina em ROLLBACK: não grava nada.
-- Só contagens por empresa; nenhum valor, descrição ou dado de pessoa.
--
-- Por quê: a Conciliação de Caixa (visão da empresa, getCashDaEmpresa) mostra
-- os movimentos da versão Atual de todos os projetos e os movimentos sem
-- versão. Movimento gravado numa versão de Orçamento, Previsão ou cenário
-- deixaria de aparecer quando a tela antiga (por projeto e versão) sair.
--
-- Como rodar (terminal do Postgres da produção):
--   psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f medicao-caixa.sql
--
-- BLOQUEIO BCX-1: empresa com movimentos em `versao` diferente de "atual" e de
-- "sem versao (da empresa)" → parar e aguardar o dono. Movimentos sem conta
-- não bloqueiam (entram só no total da empresa), mas são informados.
-- ---------------------------------------------------------------------------
BEGIN READ ONLY;

\echo '=== (1) Movimentos de caixa por empresa e tipo de versão ==='
SELECT t.name AS empresa,
  coalesce(v.kind::text,'sem versao (da empresa)') AS versao,
  count(c.*) AS movimentos,
  count(c.*) FILTER (WHERE c.bank_account_id IS NULL) AS sem_conta,
  count(c.*) FILTER (WHERE c.conciliado_em IS NOT NULL OR c.conciliado_despesa_id IS NOT NULL OR c.conciliado_conta_receber_id IS NOT NULL) AS conciliados
FROM cash_entry c JOIN tenant t ON t.id=c.tenant_id LEFT JOIN version v ON v.id=c.version_id
GROUP BY 1,2 ORDER BY 1,2;

\echo ''
\echo '=== (2) Chave caixa_conciliacao_por_conta por empresa (vazio = desligada, tela antiga) ==='
SELECT t.name AS empresa, f.chave, f.ligada FROM tenant t LEFT JOIN tenant_flag f ON f.tenant_id=t.id AND f.chave='caixa_conciliacao_por_conta' ORDER BY 1;

ROLLBACK;

-- Prompt L · Caixa e Conciliação — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- BL-2 · rec = true SEM vínculo (nem despesa nem conta a receber), por tenant e mês
SELECT tenant_id, substr(data,7,4)||'-'||substr(data,1,2) AS mes,
       count(*) FILTER (WHERE rec AND conciliado_despesa_id IS NULL AND conciliado_conta_receber_id IS NULL) AS rec_sem_vinculo,
       count(*) FILTER (WHERE rec) AS rec_total, count(*) AS total,
       sum(valor) FILTER (WHERE rec AND conciliado_despesa_id IS NULL AND conciliado_conta_receber_id IS NULL) AS valor_sem_vinculo
  FROM cash_entry GROUP BY 1, 2 ORDER BY 1, 2;

-- BL-2 · por caminho de origem (categoria): ajuste nasce conciliado; "extrato" com rec veio da conciliação automática da importação ou do toggle
SELECT coalesce(cat,'(null)') AS cat, rec,
       count(*) AS n, count(*) FILTER (WHERE conciliado_despesa_id IS NULL AND conciliado_conta_receber_id IS NULL) AS sem_vinculo, sum(valor)
  FROM cash_entry GROUP BY 1, 2 ORDER BY 1, 2;

-- BL-1 · contas que entram no saldo mas não são da empresa (sem agência/número, tipo diferente de Terceiros)
SELECT id, banco, tipo, saldo, ativo FROM bank_account WHERE coalesce(ag,'')='' AND coalesce(cc,'')='' ORDER BY banco;
-- efeito no saldo total se forem reclassificadas como Terceiros (prévia, nada muda)
SELECT coalesce(sum(saldo),0) AS saldo_hoje FROM bank_account WHERE tipo <> 'Terceiros' AND ativo;
SELECT coalesce(sum(saldo),0) AS saldo_depois FROM bank_account WHERE tipo <> 'Terceiros' AND ativo AND NOT (coalesce(ag,'')='' AND coalesce(cc,'')='');

-- 9.5 / 9d · dias com mais de um fechamento (a constraint única não pode nascer com duplicata; decisão humana)
SELECT tenant_id, dia, count(*) FROM daily_closing GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY 2;
SELECT count(*) AS fechamentos, count(DISTINCT (tenant_id, dia)) AS dias_distintos, min(dia), max(dia) FROM daily_closing;

-- 9.7 / 9e · carry_over: quantas linhas existem (a tabela fica; parou de receber linha nova)
SELECT count(*) AS carry_overs, min(from_dia), max(from_dia) FROM carry_over;

-- 2.3 / 5-A · acertos contábeis existentes (a conciliação substitui o mecanismo; nenhum acerto é apagado)
SELECT count(*) AS acertos, count(*) FILTER (WHERE estornado) AS estornados FROM acerto;

-- 22 · ANTES/DEPOIS — rodar antes e depois de cada PR; nada pode mudar
SELECT 'cash_entry' AS t, count(*), coalesce(sum(valor),0), count(*) FILTER (WHERE rec) AS rec FROM cash_entry
UNION ALL SELECT 'bank_account', count(*), coalesce(sum(saldo),0), count(*) FILTER (WHERE ativo) FROM bank_account
UNION ALL SELECT 'despesa', count(*), coalesce(sum(valor),0), count(*) FILTER (WHERE status = 'Pago') FROM despesa
UNION ALL SELECT 'daily_closing', count(*), coalesce(sum(saldo_final),0), 0 FROM daily_closing
UNION ALL SELECT 'carry_over', count(*), 0, 0 FROM carry_over
UNION ALL SELECT 'acerto', count(*), 0, 0 FROM acerto;

-- 23 · números das telas dependentes (Contas a Pagar / Dashboard / Fechamento): pendente = saldo das despesas não pagas
SELECT count(*) FILTER (WHERE status <> 'Pago' AND NOT cancelado) AS despesas_em_aberto, coalesce(sum(valor) FILTER (WHERE status <> 'Pago' AND NOT cancelado),0) AS valor_em_aberto FROM despesa;

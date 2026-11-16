-- Prompt X · Contas Correntes — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- 12 · ANTES/DEPOIS — conteúdo de cada conta (rodar antes e depois de cada PR; a única diferença permitida é a da seção 3)
SELECT id, banco, ag, op, cc, tipo, saldo, saldo_source, open_finance_id, last_sync FROM bank_account ORDER BY banco, cc;

-- 3.1 · as três linhas que não são conta bancária (sem agência, sem número)
SELECT id, banco, tipo, saldo, saldo_source FROM bank_account WHERE coalesce(ag,'') = '' AND coalesce(cc,'') = '' ORDER BY banco;

-- BX-2 · inventário de vínculos por conta — DEZ tabelas apontam para bank_account hoje
-- (as oito do prompt + cartao_credito e fatura_pagamento, criadas no Prompt U). Todas com SET NULL.
SELECT b.banco, b.id,
  (SELECT count(*) FROM despesa d WHERE d.banco_id = b.id)                      AS despesas,
  (SELECT coalesce(sum(valor),0) FROM despesa d WHERE d.banco_id = b.id)       AS despesas_valor,
  (SELECT count(*) FROM despesa_parcela p WHERE p.bank_account_id = b.id)       AS parcelas,
  (SELECT coalesce(sum(valor_original),0) FROM despesa_parcela p WHERE p.bank_account_id = b.id) AS parcelas_valor,
  (SELECT count(*) FROM pagamento p WHERE p.bank_account_id = b.id)             AS pagamentos,
  (SELECT coalesce(sum(valor_total_pago),0) FROM pagamento p WHERE p.bank_account_id = b.id) AS pagamentos_valor,
  (SELECT count(*) FROM restituicao r WHERE r.bank_account_id = b.id)           AS restituicoes,
  (SELECT coalesce(sum(valor),0) FROM restituicao r WHERE r.bank_account_id = b.id) AS restituicoes_valor,
  (SELECT count(*) FROM acerto a WHERE a.bank_account_id = b.id)                AS acertos,
  (SELECT count(*) FROM repasse r WHERE r.bank_account_id = b.id)               AS repasses,
  (SELECT coalesce(sum(valor),0) FROM repasse r WHERE r.bank_account_id = b.id) AS repasses_valor,
  (SELECT count(*) FROM cash_entry c WHERE c.bank_account_id = b.id)            AS caixa,
  (SELECT coalesce(sum(valor),0) FROM cash_entry c WHERE c.bank_account_id = b.id) AS caixa_valor,
  (SELECT count(*) FROM conta_receber c WHERE c.banco_id = b.id)                AS contas_receber,
  (SELECT count(*) FROM cartao_credito c WHERE c.bank_account_id = b.id)        AS cartoes,
  (SELECT count(*) FROM fatura_pagamento f WHERE f.bank_account_id = b.id)      AS pagamentos_fatura
FROM bank_account b ORDER BY b.banco;

-- 3.3 · despesas vinculadas às contas de sócio: situação de pagamento, caixa correspondente e ressarcimento (SEM reclassificar nada)
SELECT b.banco AS conta, d.num_doc, d.competencia, d.vencimento, d.valor, d.status, d.pago_por_terceiro,
       (SELECT count(*) FROM pagamento p WHERE p.despesa_id = d.id)                                   AS pagamentos,
       (SELECT count(*) FROM cash_entry c WHERE c.conciliado_despesa_id = d.id)                       AS caixa_conciliado,
       (SELECT count(*) FROM despesa_terceiro t WHERE t.despesa_id = d.id)                            AS obrigacao_terceiro,
       (SELECT count(*) FROM restituicao r JOIN despesa_terceiro t ON t.id = r.despesa_terceiro_id WHERE t.despesa_id = d.id AND NOT r.cancelada) AS ressarcimentos
  FROM despesa d JOIN bank_account b ON b.id = d.banco_id
 WHERE coalesce(b.ag,'') = '' AND coalesce(b.cc,'') = '' AND NOT d.cancelado
 ORDER BY b.banco, d.competencia, d.num_doc;

-- BX-3 · "Automático" sem conexão: contas auto sem open_finance_id
SELECT banco, cc, saldo_source, open_finance_id, last_sync FROM bank_account WHERE saldo_source = 'auto' ORDER BY banco;

-- 7 · contas sem movimento e saldo parado (última alteração)
SELECT b.banco, b.cc, b.saldo, b.last_sync,
       (SELECT max(data) FROM cash_entry c WHERE c.bank_account_id = b.id) AS ultimo_lancamento,
       (SELECT count(*) FROM cash_entry c WHERE c.bank_account_id = b.id) AS lancamentos
  FROM bank_account b ORDER BY b.banco;

-- 13 · números das telas dependentes (rodar antes e depois): saldo disponível = contas que não são "Terceiros"
SELECT coalesce(sum(saldo),0) AS saldo_disponivel FROM bank_account WHERE tipo <> 'Terceiros';
SELECT coalesce(sum(saldo),0) AS saldo_total_tela_contas FROM bank_account;

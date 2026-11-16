-- Prompt S · Despesas — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- BS-4 · despesas com categoria de natureza credora, por projeto e versão
SELECT p.name AS projeto, v.kind, v.label, d.categoria_dre, d.cancelado,
       COUNT(*) AS qtd, SUM(d.valor) AS total
  FROM despesa d JOIN version v ON v.id = d.version_id JOIN project p ON p.id = v.project_id
 WHERE d.categoria_dre = 'Receita'
 GROUP BY 1,2,3,4,5 ORDER BY 7 DESC;

-- BS-4 · as linhas, uma a uma, para a conferência item a item (/diagnostico/categorias-invertidas)
SELECT d.num_doc, p.name AS projeto, d.competencia, d.valor, d.conta_cef, d.status, d.cancelado, d.obs
  FROM despesa d JOIN version v ON v.id = d.version_id JOIN project p ON p.id = v.project_id
 WHERE d.categoria_dre = 'Receita' ORDER BY d.valor DESC;

-- BS-4 · despesas SEM categoria (a DRE as descarta em silêncio)
SELECT p.name AS projeto, v.kind, COUNT(*) AS qtd, SUM(d.valor) AS total
  FROM despesa d JOIN version v ON v.id = d.version_id JOIN project p ON p.id = v.project_id
 WHERE d.categoria_dre IS NULL AND NOT d.cancelado GROUP BY 1,2 ORDER BY 4 DESC;

-- BS-4 · o mesmo defeito no planejamento
SELECT p.name, v.kind, v.label, b.row_key, b.mes, b.valor
  FROM budget_line b JOIN version v ON v.id = b.version_id JOIN project p ON p.id = v.project_id
 WHERE b.kind = 'despesa' AND b.dre_category = 'Receita' ORDER BY b.valor DESC;

-- BS-3 · despesas com mais de um documento fiscal (multiplicam a linha do Repositório)
SELECT despesa_id, COUNT(*) FROM documento_fiscal GROUP BY 1 HAVING COUNT(*) > 1;

-- BS-2 · pagas e sem número de NF (o que a validação ao pagar — hoje sem chamador — deixaria passar)
SELECT d.num_doc, d.status, d.valor, f.tipo, f.numero
  FROM despesa d LEFT JOIN documento_fiscal f ON f.despesa_id = d.id
 WHERE d.status = 'Pago' AND NOT d.cancelado AND (f.numero IS NULL OR btrim(f.numero) = '');

-- 3.2 · "Pago" sem registro de pagamento: a operação usa o status como atalho?
SELECT COUNT(*) FILTER (WHERE d.status = 'Pago') AS pagas,
       COUNT(*) FILTER (WHERE d.status = 'Pago' AND NOT EXISTS (SELECT 1 FROM pagamento g WHERE g.despesa_id = d.id)) AS pagas_sem_pagamento
  FROM despesa d WHERE NOT d.cancelado;

-- 2.6 · exclusões já ocorridas × movimentos de caixa sem vínculo
SELECT COUNT(*) AS exclusoes FROM audit_log WHERE action = 'despesa.delete';
SELECT created_at, meta FROM audit_log WHERE action = 'despesa.delete' ORDER BY created_at DESC LIMIT 50;
SELECT COUNT(*) AS saidas_sem_vinculo, SUM(valor) AS total
  FROM cash_entry c
 WHERE c.conciliado_despesa_id IS NULL AND c.conciliado_conta_receber_id IS NULL
   AND COALESCE(c.cat, '') NOT IN ('ajuste', 'acerto') AND c.valor < 0;

-- 5-A.6 · rateio_obra × valor transferido, e acertos sem rateio (nunca lido até hoje)
SELECT a.id, a.num_doc, a.valor_transferido,
       COALESCE((SELECT SUM(r.valor) FROM rateio_obra r WHERE r.acerto_id = a.id), 0) AS rateio,
       (SELECT COUNT(*) FROM rateio_obra r WHERE r.acerto_id = a.id) AS linhas
  FROM acerto a ORDER BY a.data_pagamento DESC;

-- 9 · rateio escrito à mão na observação (hábito ou caso isolado?)
SELECT num_doc, valor, obs FROM despesa WHERE obs ~* 'obra\s*[0-9]+.*obra\s*[0-9]+';

-- 16 · antes/depois: contagens por versão
SELECT v.label, COUNT(DISTINCT d.id) AS despesas,
       (SELECT COUNT(*) FROM despesa_parcela x JOIN despesa y ON y.id = x.despesa_id WHERE y.version_id = v.id) AS parcelas,
       (SELECT COUNT(*) FROM pagamento x JOIN despesa y ON y.id = x.despesa_id WHERE y.version_id = v.id) AS pagamentos,
       (SELECT COUNT(*) FROM documento_fiscal x JOIN despesa y ON y.id = x.despesa_id WHERE y.version_id = v.id) AS docs_fiscais,
       (SELECT COUNT(*) FROM document x JOIN despesa y ON y.id = x.despesa_id WHERE y.version_id = v.id) AS anexos
  FROM version v LEFT JOIN despesa d ON d.version_id = v.id GROUP BY v.id, v.label ORDER BY v.label;

-- 15o · antes/depois do legado
SELECT COUNT(*), COALESCE(SUM(valor), 0) FROM despesa WHERE categoria_dre = 'Receita';

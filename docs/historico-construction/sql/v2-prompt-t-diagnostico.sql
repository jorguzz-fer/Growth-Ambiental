-- Prompt T · Ressarcimentos — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- BT-1 · formato e valores de stakeholder.papeis
SELECT pg_typeof(papeis) AS tipo FROM stakeholder LIMIT 1;
SELECT p AS papel, count(*) FROM stakeholder, unnest(papeis) AS p GROUP BY 1 ORDER BY 2 DESC;

-- 1.6 (W) / BT-1 · quem já tem obrigação lançada e ainda não tem o papel (concessão humana, item a item)
SELECT s.id, s.nome, s.ativo, s.papeis, count(t.id) AS obrigacoes, sum(t.valor_total - t.valor_restituido) AS saldo
  FROM stakeholder s JOIN despesa_terceiro t ON t.pagador_terceiro_id = s.id
 WHERE NOT ('Pagador por Terceiro' = ANY(s.papeis)) GROUP BY s.id ORDER BY saldo DESC;

-- 4.3 · restituições canceladas com mais de um item (o estorno antigo devolvia tudo à âncora)
SELECT r.id, r.valor, r.cancelada_em, count(i.id) AS itens
  FROM restituicao r JOIN restituicao_item i ON i.restituicao_id = r.id
 WHERE r.cancelada GROUP BY r.id HAVING count(i.id) > 1;

-- 4.3 · obrigações cujo valor_restituido não bate com a soma dos itens das restituições ativas
SELECT t.id, t.valor_total, t.valor_restituido,
       coalesce((SELECT sum(i.valor_abatido) FROM restituicao_item i JOIN restituicao r ON r.id = i.restituicao_id WHERE i.despesa_terceiro_id = t.id AND NOT r.cancelada), 0)
       + coalesce((SELECT sum(r.valor) FROM restituicao r WHERE r.despesa_terceiro_id = t.id AND NOT r.cancelada AND NOT EXISTS (SELECT 1 FROM restituicao_item i WHERE i.restituicao_id = r.id)), 0) AS soma_itens
  FROM despesa_terceiro t
 WHERE abs(t.valor_restituido - (
       coalesce((SELECT sum(i.valor_abatido) FROM restituicao_item i JOIN restituicao r ON r.id = i.restituicao_id WHERE i.despesa_terceiro_id = t.id AND NOT r.cancelada), 0)
       + coalesce((SELECT sum(r.valor) FROM restituicao r WHERE r.despesa_terceiro_id = t.id AND NOT r.cancelada AND NOT EXISTS (SELECT 1 FROM restituicao_item i WHERE i.restituicao_id = r.id)), 0))) > 0.01;

-- 6.3 · obrigações fora da versão Atual de cada obra (a lista era por versão da tela; passa a ser da empresa)
SELECT p.name, v.kind, v.label, count(*) AS obrigacoes, sum(t.valor_total - t.valor_restituido) AS saldo
  FROM despesa_terceiro t JOIN despesa d ON d.id = t.despesa_id JOIN version v ON v.id = d.version_id JOIN project p ON p.id = v.project_id
 GROUP BY 1, 2, 3 ORDER BY 1, 2;

-- 7.3 · PEDs consumidos por compensações (sem despesa)
SELECT count(*) AS compensacoes, string_agg(num_doc, ', ' ORDER BY created_at) AS peds FROM compensacao;

-- 9 · cancelamentos já feitos
SELECT count(*) FILTER (WHERE cancelada) AS canceladas, count(*) AS total FROM restituicao;

-- 16 · antes/depois
SELECT 'despesa_terceiro' AS t, count(*), md5(coalesce(string_agg(x::text, '|' ORDER BY id), '')) FROM despesa_terceiro x
UNION ALL SELECT 'restituicao', count(*), md5(coalesce(string_agg(x::text, '|' ORDER BY id), '')) FROM restituicao x
UNION ALL SELECT 'restituicao_item', count(*), md5(coalesce(string_agg(x::text, '|' ORDER BY id), '')) FROM restituicao_item x
UNION ALL SELECT 'compensacao', count(*), md5(coalesce(string_agg(x::text, '|' ORDER BY id), '')) FROM compensacao x;

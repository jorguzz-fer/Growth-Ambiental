-- Prompt W · Fornecedores e Stakeholders — diagnóstico SOMENTE LEITURA.
-- Rodar em produção antes de implementar (BW-1, BW-2, 3-A.5, 4.4).
-- Nenhuma linha é alterada por este arquivo.

-- 1 · BW-1 — documentos repetidos (por tenant)
SELECT tenant_id, doc, count(*) AS cadastros, string_agg(nome, ' | ' ORDER BY nome) AS nomes
  FROM stakeholder
 WHERE doc IS NOT NULL AND btrim(doc) <> ''
 GROUP BY tenant_id, doc HAVING count(*) > 1;

-- 1b · BW-1 — documentos repetidos olhando só os dígitos (pega "12.345" × "12345")
SELECT tenant_id, regexp_replace(doc, '\D', '', 'g') AS digitos, count(*) AS cadastros, string_agg(nome || ' [' || doc || ']', ' | ') AS nomes
  FROM stakeholder
 WHERE doc IS NOT NULL AND btrim(doc) <> ''
 GROUP BY tenant_id, regexp_replace(doc, '\D', '', 'g') HAVING count(*) > 1;

-- 2 · BW-1 — tipo × quantidade de dígitos (PJ com 11, PF com 14, nem um nem outro)
SELECT id, nome, tipo, doc, length(regexp_replace(doc, '\D', '', 'g')) AS digitos,
       CASE
         WHEN tipo = 'PJ' AND length(regexp_replace(doc, '\D', '', 'g')) = 11 THEN 'PJ com CPF'
         WHEN tipo = 'PF' AND length(regexp_replace(doc, '\D', '', 'g')) = 14 THEN 'PF com CNPJ'
         WHEN length(regexp_replace(doc, '\D', '', 'g')) NOT IN (11, 14) THEN 'fora do padrão'
         ELSE 'coerente'
       END AS situacao
  FROM stakeholder
 WHERE doc IS NOT NULL AND btrim(doc) <> ''
 ORDER BY situacao, nome;

-- 3 · BW-1 — cadastros sem documento
SELECT count(*) AS sem_documento FROM stakeholder WHERE doc IS NULL OR btrim(doc) = '';

-- 4 · BW-2 — papéis fora da lista dos 19
SELECT DISTINCT p AS papel_fora_da_lista
  FROM stakeholder, unnest(papeis) AS p
 WHERE p NOT IN (
   'Fornecedor de Material','Prestador de Serviço','Mão de Obra CLT','Mão de Obra RPA',
   'Banco/Financiador','Comprador de Unidade','Sócio/Quotista','Responsável Técnico (RT)',
   'Imobiliária Parceira','Corretor Autônomo','Incorporador','Construtora','Escritório Contábil',
   'Escritório Jurídico','Agência de Marketing','Empresa de Tecnologia','Órgão Público',
   'Consultor/Assessor','Seguradora');

-- 4b · BW-2 — elementos com vírgula (importação que gravou "a, b" num só elemento)
SELECT id, nome, papeis FROM stakeholder, unnest(papeis) AS p WHERE p LIKE '%,%';

-- 5 · 3-A.5 — PF com papel de serviço ou mão de obra e sem endereço
SELECT count(*) AS pf_servico_sem_endereco
  FROM stakeholder
 WHERE tipo = 'PF'
   AND papeis && ARRAY['Prestador de Serviço','Mão de Obra RPA','Mão de Obra CLT']
   AND (endereco IS NULL OR btrim(endereco) = '');

-- 6 · 4.4 — inativos, e quantos deles aparecem em seletor hoje (todos: nenhum seletor filtra)
SELECT count(*) FILTER (WHERE NOT ativo) AS inativos, count(*) AS total FROM stakeholder;

-- 7 · 2.1 — vínculos por cadastro nas seis tabelas (quem a exclusão zeraria em silêncio)
SELECT s.id, s.nome, s.ativo,
       (SELECT count(*) FROM despesa d WHERE d.fornecedor_id = s.id)                       AS despesas,
       (SELECT count(*) FROM despesa_terceiro t WHERE t.pagador_terceiro_id = s.id)        AS obrigacoes_terceiro,
       (SELECT count(*) FROM recebimento_terceiro r WHERE r.recebedor_terceiro_id = s.id) AS recebimentos_terceiro,
       (SELECT count(*) FROM acerto a WHERE a.favorecido_id = s.id)                        AS acertos,
       (SELECT count(*) FROM compensacao c WHERE c.terceiro_id = s.id)                     AS compensacoes,
       (SELECT count(*) FROM document o WHERE o.stakeholder_id = s.id)                     AS documentos
  FROM stakeholder s
 ORDER BY s.nome;

-- 8 · 1.6 — quem já tem obrigação de terceiro lançada (candidatos ao papel "Pagador por Terceiro", decisão humana)
SELECT s.id, s.nome, s.ativo, s.papeis, count(t.id) AS obrigacoes
  FROM stakeholder s JOIN despesa_terceiro t ON t.pagador_terceiro_id = s.id
 GROUP BY s.id ORDER BY obrigacoes DESC;

-- 9 · inativos ainda em uso (lançamento dos últimos 90 dias)
SELECT s.id, s.nome, count(d.id) AS despesas_recentes
  FROM stakeholder s JOIN despesa d ON d.fornecedor_id = s.id
 WHERE NOT s.ativo AND d.created_at >= now() - interval '90 days'
 GROUP BY s.id ORDER BY 3 DESC;

-- 10 · antes/depois (teste 20): hash do conteúdo integral de cada linha
SELECT count(*) AS linhas, md5(string_agg(s::text, '|' ORDER BY id)) AS hash FROM stakeholder s;

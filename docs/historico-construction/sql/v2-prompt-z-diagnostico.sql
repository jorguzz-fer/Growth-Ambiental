-- Prompt Z · Módulo Pessoas — diagnóstico SOMENTE LEITURA. Nenhuma linha é alterada.

-- BZ-4 / relatório 2 · registros de ponto por tenant (a tabela fica em qualquer cenário)
SELECT t.name AS tenant, count(e.id) AS registros, min(e.data), max(e.data),
       count(*) FILTER (WHERE e.despesa_id IS NOT NULL) AS com_despesa_gerada
  FROM tenant t LEFT JOIN time_entry e ON e.tenant_id = t.id
 GROUP BY 1 ORDER BY 1;

-- relatório 3 · despesas geradas pela apuração antiga do ponto (ação "ponto.gerar_conta" ou vínculo em time_entry)
SELECT d.id, d.num_doc, d.valor, d.competencia, d.obs
  FROM despesa d
 WHERE d.id IN (SELECT despesa_id FROM time_entry WHERE despesa_id IS NOT NULL)
    OR d.obs LIKE 'Mão de obra (ponto)%'
 ORDER BY d.competencia;
SELECT count(*) AS audit_ponto_gerar_conta FROM audit_log WHERE action = 'ponto.gerar_conta';

-- Quem pode ser alocado numa equipe hoje (3.3): autônomos e sócios no cadastro de stakeholders
SELECT s.id, s.nome, s.tipo, s.papeis, s.ativo,
       (coalesce(s.endereco,'') = '' AND s.tipo = 'PF') AS pf_sem_endereco
  FROM stakeholder s
 WHERE s.papeis && ARRAY['Prestador de Serviço','Mão de Obra CLT','Mão de Obra RPA','Sócio/Quotista','Responsável Técnico (RT)']
 ORDER BY s.nome;

-- 6.1 · CPF entre fornecedores (base para "CPF duplicado entre funcionário e fornecedor" quando a tabela funcionario existir)
SELECT regexp_replace(doc, '\D', '', 'g') AS cpf, count(*), string_agg(nome, ' | ')
  FROM stakeholder WHERE tipo = 'PF' AND doc IS NOT NULL
 GROUP BY 1 HAVING count(*) > 1;

-- Geolocalização de obra (fica; o módulo novo não usa)
SELECT count(*) FILTER (WHERE latitude IS NOT NULL OR longitude IS NOT NULL) AS obras_com_coordenada, count(*) AS obras FROM project;

-- Preservação (19) — fotos antes/depois
SELECT 'stakeholder' AS tabela, count(*), md5(string_agg(id::text || coalesce(nome,'') || coalesce(doc,''), ',' ORDER BY id)) AS assinatura FROM stakeholder
UNION ALL SELECT 'despesa', count(*), md5(string_agg(id::text || valor::text || coalesce(status,''), ',' ORDER BY id)) FROM despesa
UNION ALL SELECT 'time_entry', count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')) FROM time_entry;

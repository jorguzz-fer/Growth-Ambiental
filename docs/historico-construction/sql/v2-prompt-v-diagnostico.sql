-- Prompt V · Medição de Obra — diagnóstico SOMENTE LEITURA (nada aqui altera dado).
-- Rodar em produção antes do deploy das PRs V-1..V-4 e de novo depois (relatórios 17 e 17n).

-- BV-2 · medições gravadas em versão que NÃO é a Atual (sintoma da 1.1), por projeto.
-- Nenhum registro é movido: a correção é humana, item a item.
SELECT p.name AS projeto, v.label AS versao, v.kind, m.competencia, m.grupo_code, m.valor, m.created_at
  FROM medicao m
  JOIN version v ON v.id = m.version_id
  JOIN project p ON p.id = v.project_id
 WHERE v.kind <> 'atual'
 ORDER BY p.name, m.competencia, m.grupo_code;

-- BV-3 · quantas medições existem e o que o log de auditoria sabe sobre a autoria delas.
SELECT count(*) AS medicoes FROM medicao;

SELECT a.entity, a.action, count(*) AS eventos,
       count(DISTINCT a.entity_id) AS registros,
       count(DISTINCT a.user_id)   AS usuarios,
       min(a.created_at) AS primeiro
  FROM audit_log a
 WHERE a.entity ILIKE '%medic%'
 GROUP BY 1,2;

-- BV-3 · medições sem autor (coluna created_by entra na migração 0064; antes dela, todas).
-- Depois do deploy: deve bater com a contagem ANTES do deploy (17n: ninguém recebe autor por script).
SELECT count(*) FILTER (WHERE created_by IS NULL) AS sem_autor,
       count(*) FILTER (WHERE created_by IS NOT NULL) AS com_autor
  FROM medicao;

-- BV-1 · o modelo por serviço nunca recebeu dado?
SELECT (SELECT count(*) FROM servico) AS servicos,
       (SELECT count(*) FROM medicao_servico) AS medicoes_por_servico;

-- 17 · antes/depois: conteúdo de `medicao` (hash por linha; a lista inteira deve ser idêntica).
SELECT m.id, m.version_id, m.competencia, m.grupo_code, m.grupo_name, m.valor, m.obs, m.created_at
  FROM medicao m
 ORDER BY m.created_at, m.id;

-- 4.6 · duplicidades aparentes (mesmo grupo e competência na mesma versão) — só aviso, nunca bloqueio.
SELECT version_id, competencia, grupo_code, count(*) AS lancamentos, sum(valor) AS total
  FROM medicao
 GROUP BY 1,2,3
HAVING count(*) > 1
 ORDER BY 1,2,3;

-- 3.7 / 3.8 · obras sem versão Budget e obras com mais de um Budget (qual o relatório usava: o primeiro do `find`).
SELECT p.name AS projeto,
       count(v.id) FILTER (WHERE v.kind = 'budget') AS budgets,
       string_agg(v.label, ' | ' ORDER BY v.created_at) FILTER (WHERE v.kind = 'budget') AS rotulos
  FROM project p
  LEFT JOIN version v ON v.project_id = p.id
 WHERE p.kind = 'proj'
 GROUP BY p.name
 ORDER BY p.name;

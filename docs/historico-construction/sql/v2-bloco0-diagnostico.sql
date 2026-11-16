-- ============================================================================
-- V2 · BLOCO 0 · DIAGNÓSTICO SOMENTE-LEITURA
-- ============================================================================
--
-- Responde os bloqueios BAJ-1, BAI-3 e BAF-1 dos prompts AJ, AI e AF.
-- Acompanha docs/historico-construction/V2-BLOCO0-BLOQUEIOS.md, que explica como ler cada resultado.
--
-- SEGURANÇA
--   * Tudo roda dentro de uma transação READ ONLY: o Postgres recusa qualquer
--     escrita, mesmo que alguém edite uma consulta por engano.
--   * Termina em ROLLBACK. Nada é gravado, nada é alterado.
--   * A saída traz dado de TODAS as empresas (e-mails de usuários de cada
--     tenant). Não repassar o resultado bruto a cliente. Para restringir a uma
--     empresa, descomente as linhas "AND t.name = ..." indicadas.
--
-- COMO RODAR
--   psql "$DATABASE_URL" -f docs/historico-construction/sql/v2-bloco0-diagnostico.sql > bloco0.txt
--
-- DIFERENÇAS EM RELAÇÃO AO SQL DOS PROMPTS — todas documentadas no .md:
--   1. Todas as consultas ganharam a coluna `empresa` (o prompt AJ misturava
--      tenants sem identificá-los).
--   2. `jsonb_object_keys` protegido contra `permissions` que não seja objeto:
--      uma única linha fora do formato abortaria a consulta inteira.
--   3. BAI-3 usa `-> ... IS NOT NULL` em vez do operador `?`, que vários
--      clientes SQL (DBeaver, drivers JDBC, node-postgres) tratam como
--      parâmetro e quebram a consulta.
--   4. BAF-1 lê os dígitos FINAIS do num_doc, como o próprio app faz
--      (`/(\d+)\s*$/` em numeracao.ts e numbering.ts). O prompt concatenava
--      todos os dígitos: "PED-2026-000123" virava 2026000123 em vez de 123.
--   5. BAF-1 limita a 18 dígitos antes do cast para bigint — um num_doc com
--      mais dígitos estourava o tipo e abortava a consulta.
-- ============================================================================

BEGIN TRANSACTION READ ONLY;


-- ────────────────────────────────────────────────────────────────────────────
-- BAJ-1 · Consulta 1 — papel e override de cada membro
--         ENTREGA OBRIGATÓRIA do bloqueio (Prompt AJ).
-- ────────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       u.name,
       u.email,
       m.role,
       (m.permissions IS NOT NULL) AS tem_override,
       CASE WHEN jsonb_typeof(m.permissions) = 'object'
            THEN (SELECT count(*) FROM jsonb_object_keys(m.permissions))
       END AS chaves,
       m.permissions -> 'dre'      AS dre,
       m.permissions -> 'despesas' AS despesas,
       m.permissions -> 'usuarios' AS usuarios,
       m.permissions -> 'acessos'  AS acessos
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id
 -- WHERE t.name = 'NOME DA EMPRESA'
 ORDER BY t.name, m.role, u.name;


-- ────────────────────────────────────────────────────────────────────────────
-- BAJ-1 · Consulta 2 — overrides que concedem tela de Config a quem não é
--         owner/admin
-- ────────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       u.email,
       m.role,
       k AS tela,
       m.permissions -> k AS perm
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id,
       LATERAL jsonb_object_keys(
         CASE WHEN jsonb_typeof(m.permissions) = 'object'
              THEN m.permissions ELSE '{}'::jsonb END
       ) k
 WHERE m.role NOT IN ('owner', 'admin')
   AND k IN ('usuarios', 'acessos', 'empresa', 'numeracao', 'versao',
             'backup', 'acoes')
 -- AND t.name = 'NOME DA EMPRESA'
 ORDER BY t.name, u.email, k;


-- ────────────────────────────────────────────────────────────────────────────
-- BAJ-1 · Consulta 3 — chaves gravadas que não existem em SCREENS
--         (overrides órfãos). Lista conferida contra src/lib/permissions.ts
--         em 23/09/2026: as 38 telas batem uma a uma.
-- ────────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       u.email,
       k AS chave_orfa
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id,
       LATERAL jsonb_object_keys(
         CASE WHEN jsonb_typeof(m.permissions) = 'object'
              THEN m.permissions ELSE '{}'::jsonb END
       ) k
 WHERE k NOT IN (
   'dashboard', 'projecao', 'consolidado', 'caixa', 'fechamento',
   'balancodia', 'dre', 'fluxocaixa', 'medicao', 'resumo', 'unidades',
   'budget', 'forecast', 'clientes', 'contasreceber', 'medicaolanc',
   'simulador', 'reembolso', 'permuta', 'parametros', 'despesas',
   'contaspagar', 'restituicoes', 'fornecedores', 'planocontas', 'contas',
   'estoque', 'ponto', 'backup', 'usuarios', 'acessos', 'acoes',
   'contabilidade', 'empresa', 'projeto', 'numeracao', 'versao',
   'diagnosticoia')
 ORDER BY t.name, u.email, k;


-- ────────────────────────────────────────────────────────────────────────────
-- BAI-3 · Quem tem override em telas que passarão a ser restritas por papel
--         (Prompt AI, Parte 0). Quem aparecer aqui PERDE o acesso a
--         /usuarios e /acessos quando a Parte 0 entrar — avisar antes.
-- ────────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       u.name,
       u.email,
       m.role,
       m.permissions -> 'usuarios' AS override_usuarios,
       m.permissions -> 'acessos'  AS override_acessos
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id
 WHERE m.role NOT IN ('owner', 'admin')
   AND (m.permissions -> 'usuarios' IS NOT NULL
        OR m.permissions -> 'acessos' IS NOT NULL)
 ORDER BY t.name, u.name;


-- ────────────────────────────────────────────────────────────────────────────
-- BAF-1 · Consulta 1 — números de PED repetidos, por empresa
--         Se devolver linhas, o UNIQUE da Parte 1 do Prompt AF NÃO entra
--         antes de decisão humana, item a item.
-- ────────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       d.num_doc,
       count(*) AS vezes,
       array_agg(d.id) AS ids
  FROM despesa d
  JOIN tenant t ON t.id = d.tenant_id
 WHERE d.num_doc IS NOT NULL AND d.num_doc <> ''
 GROUP BY t.name, d.num_doc
HAVING count(*) > 1
 ORDER BY 3 DESC;


-- ────────────────────────────────────────────────────────────────────────────
-- BAF-1 · Consulta 2 — o contador contra a realidade
--         `maior_sufixo_emitido` usa os dígitos FINAIS, como o app.
-- ────────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       ns.entity,
       ns.prefix,
       ns.use_prefix,
       ns.next_number,
       ns.digits,
       ns.active,
       (SELECT count(*) FROM despesa d
         WHERE d.tenant_id = ns.tenant_id
           AND d.num_doc IS NOT NULL AND d.num_doc <> '') AS despesas_com_numero,
       (SELECT max(substring(d.num_doc FROM '(\d{1,18})\s*$')::bigint)
          FROM despesa d
         WHERE d.tenant_id = ns.tenant_id) AS maior_sufixo_emitido
  FROM number_sequence ns
  JOIN tenant t ON t.id = ns.tenant_id
 ORDER BY t.name;


-- ────────────────────────────────────────────────────────────────────────────
-- BAF-1 · Consulta 3 — despesas sem número
-- ────────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       count(*) AS sem_numero
  FROM despesa d
  JOIN tenant t ON t.id = d.tenant_id
 WHERE d.num_doc IS NULL OR d.num_doc = ''
 GROUP BY t.name
 ORDER BY t.name;


-- ────────────────────────────────────────────────────────────────────────────
-- BAF-1 · Consulta 4 — buracos na sequência (o custo do RC-N1)
--         `numeros_consumidos_sem_uso` é a conta que o prompt pede para fazer
--         à mão ("a diferença entre emitidos e faixa"), já feita — e com
--         count(DISTINCT), para que número duplicado não esconda buraco.
-- ────────────────────────────────────────────────────────────────────────────
SELECT t.name AS empresa,
       count(*)                        AS emitidos,
       count(DISTINCT x.n)             AS numeros_distintos,
       max(x.n) - min(x.n) + 1         AS faixa,
       (max(x.n) - min(x.n) + 1)
         - count(DISTINCT x.n)         AS numeros_consumidos_sem_uso
  FROM (SELECT tenant_id,
               substring(num_doc FROM '(\d{1,18})\s*$')::bigint AS n
          FROM despesa) x
  JOIN tenant t ON t.id = x.tenant_id
 WHERE x.n IS NOT NULL
 GROUP BY t.name
 ORDER BY t.name;


ROLLBACK;

-- Prompt AL · Acesso Contabilidade sai; o contador vira configurável.
-- Diagnóstico SOMENTE LEITURA (nada aqui altera dado). Rodar em produção
-- antes do deploy e de novo depois. Os resultados devem ser IGUAIS: a tarefa
-- não toca em vínculo, papel nem override (regra global 1).

-- 1 · Todos os contadores, por empresa, com o override gravado (se houver).
SELECT t.name AS empresa, u.email, u.name, m.role, m.permissions
  FROM membership m
  JOIN "user" u  ON u.id = m.user_id
  JOIN tenant t  ON t.id = m.tenant_id
 WHERE m.role = 'contador'
 ORDER BY t.name, u.email;

-- 2 · Parte 3 (teto de leitura) · células que o teto vai NEGAR: override de
-- contador com criar, editar ou excluir ligado. É a única diferença aceitável
-- entre antes e depois (4.4). Lista vazia = o teto não muda nada para ninguém.
SELECT t.name AS empresa, u.email, kv.key AS tela,
       kv.value->>'criar' AS criar, kv.value->>'editar' AS editar, kv.value->>'excluir' AS excluir
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id
  CROSS JOIN LATERAL jsonb_each(m.permissions::jsonb) kv
 WHERE m.role = 'contador'
   AND (coalesce((kv.value->>'criar')::boolean, false)
     OR coalesce((kv.value->>'editar')::boolean, false)
     OR coalesce((kv.value->>'excluir')::boolean, false))
 ORDER BY 1, 2, 3;

-- 3 · Parte 4.3 · contadores com override que concede tela FORA das oito do
-- padrão. Continuam valendo (só leitura).
SELECT t.name AS empresa, u.email, kv.key AS tela, kv.value AS permissao
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id
  CROSS JOIN LATERAL jsonb_each(m.permissions::jsonb) kv
 WHERE m.role = 'contador'
   AND coalesce((kv.value->>'ver')::boolean, false)
   AND kv.key NOT IN ('dre','fluxocaixa','medicao','resumo','consolidado','planocontas','despesas','acoes')
 ORDER BY 1, 2, 3;

-- 4 · 1.5 / 7.2 · overrides gravados para a tela "contabilidade" (qualquer
-- papel). Ficam no banco, inertes, depois da remoção. Rodar antes e depois:
-- a contagem não pode mudar.
SELECT t.name AS empresa, u.email, m.role, m.permissions::jsonb->'contabilidade' AS override_contabilidade
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id
 WHERE m.permissions::jsonb ? 'contabilidade'
 ORDER BY 1, 2;

-- 5 · BAL-1 · quantos convites de contador já foram registrados (pela tela
-- antiga ou por Usuários — o log não distingue, é a mesma action).
SELECT t.name AS empresa, count(*) AS convites_contador, max(a.created_at) AS ultimo
  FROM audit_log a
  JOIN tenant t ON t.id = a.tenant_id
 WHERE a.action = 'membership.invite'
   AND a.meta->>'role' = 'contador'
 GROUP BY t.name
 ORDER BY t.name;

-- 6 · 8.1 · fotografia de todos os vínculos (papel + override), para comparar
-- antes e depois. Guardar a saída de antes; a de depois tem de ser idêntica.
SELECT t.name AS empresa, u.email, m.role, md5(coalesce(m.permissions::text, '')) AS hash_override
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
  JOIN tenant t ON t.id = m.tenant_id
 ORDER BY 1, 2;

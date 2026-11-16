-- Prompt J (Unidades) · diagnóstico SOMENTE LEITURA para rodar no Postgres
-- de produção antes e depois das PRs. Nenhum comando aqui grava nada.

-- ---------------------------------------------------------------------------
-- 1. Antes/depois (Prompt J, teste 19): contagem e soma de valor por versão.
--    Rodar antes da primeira PR e depois da última; as duas saídas têm de ser
--    idênticas.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, v.kind AS versao, v.label,
       count(u.id) AS unidades, coalesce(sum(u.valor), 0) AS soma_valor
FROM version v
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = p.tenant_id
LEFT JOIN unit u ON u.version_id = v.id
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4;

-- ---------------------------------------------------------------------------
-- 2. BJ-2 (reconferência): unidades com o mesmo código na mesma versão.
--    Tem de vir vazio para a trava única de (version_id, code) da seção 4.1
--    poder ser criada. Se vier algo, a migração falha e para — ninguém apaga.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, p.name AS obra, v.kind AS versao, u.code,
       count(*) AS ocorrencias,
       string_agg(u.id::text || ' · ' || u.valor::text || ' · ' || u.status::text, ' | ' ORDER BY u.created_at) AS registros
FROM unit u
JOIN version v ON v.id = u.version_id
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = u.tenant_id
GROUP BY 1, 2, 3, 4
HAVING count(*) > 1
ORDER BY 1, 2, 3, 4;

-- ---------------------------------------------------------------------------
-- 3. Seção 3.4: quantas unidades vendidas mudam de sinalização quando a
--    tolerância do saldo passa de R$ 1,00 para R$ 0,01.
--    Reproduz `calcUnitTotal` (src/lib/calc/projection.ts) em SQL sobre o
--    jsonb do plano: AS/S1/S2/S3 = val × (n ou 1); Mensais/Semestrais/Anuais
--    = val × n; FGTS, Subsídio, Permuta e Banco.valFinanc entram inteiros.
--    Só unidades "Vendido" (as outras não têm total).
-- ---------------------------------------------------------------------------
WITH plano AS (
  SELECT u.id, u.code, u.valor, u.tenant_id, u.version_id,
         coalesce(u.payment_plan, '{}'::jsonb) AS pp
  FROM unit u
  WHERE u.status = 'Vendido'
), total AS (
  SELECT id, code, valor, tenant_id, version_id,
    coalesce(nullif(pp->'AS'->>'val', '')::numeric, 0) * coalesce(nullif(nullif(pp->'AS'->>'n', '')::numeric, 0), 1)
  + coalesce(nullif(pp->'S1'->>'val', '')::numeric, 0) * coalesce(nullif(nullif(pp->'S1'->>'n', '')::numeric, 0), 1)
  + coalesce(nullif(pp->'S2'->>'val', '')::numeric, 0) * coalesce(nullif(nullif(pp->'S2'->>'n', '')::numeric, 0), 1)
  + coalesce(nullif(pp->'S3'->>'val', '')::numeric, 0) * coalesce(nullif(nullif(pp->'S3'->>'n', '')::numeric, 0), 1)
  + coalesce(nullif(pp->'Mensais'->>'val', '')::numeric, 0) * coalesce(nullif(pp->'Mensais'->>'n', '')::numeric, 0)
  + coalesce(nullif(pp->'Semestrais'->>'val', '')::numeric, 0) * coalesce(nullif(pp->'Semestrais'->>'n', '')::numeric, 0)
  + coalesce(nullif(pp->'Anuais'->>'val', '')::numeric, 0) * coalesce(nullif(pp->'Anuais'->>'n', '')::numeric, 0)
  + coalesce(nullif(pp->'FGTS'->>'val', '')::numeric, 0)
  + coalesce(nullif(pp->'Subsidio'->>'val', '')::numeric, 0)
  + coalesce(nullif(pp->'Permuta'->>'val', '')::numeric, 0)
  + coalesce(nullif(pp->'Banco'->>'valFinanc', '')::numeric, 0) AS total_fontes
  FROM plano
)
SELECT t.name AS empresa, p.name AS obra, v.kind AS versao, x.code,
       x.valor, x.total_fontes, x.total_fontes - x.valor AS saldo,
       CASE
         WHEN abs(x.total_fontes - x.valor) < 0.01 THEN 'fechada (hoje e depois)'
         WHEN abs(x.total_fontes - x.valor) < 1    THEN 'MUDA: fechada hoje, divergente depois'
         ELSE 'divergente (hoje e depois)'
       END AS sinalizacao
FROM total x
JOIN version v ON v.id = x.version_id
JOIN project p ON p.id = v.project_id
JOIN tenant t ON t.id = x.tenant_id
ORDER BY sinalizacao, 1, 2, 4;

-- ---------------------------------------------------------------------------
-- 4. BJ-1: formato gravado em unit.mes_venda. Tudo tem de ser MM/DD/YYYY
--    (como o DateField grava). Uma linha fora do padrão aparece aqui.
-- ---------------------------------------------------------------------------
SELECT t.name AS empresa, u.code, u.mes_venda,
       CASE WHEN u.mes_venda ~ '^\d{2}/\d{2}/\d{4}$' THEN 'MM/DD/YYYY' ELSE 'FORA DO PADRÃO' END AS formato
FROM unit u JOIN tenant t ON t.id = u.tenant_id
WHERE coalesce(trim(u.mes_venda), '') <> ''
ORDER BY formato DESC, 1, 2;

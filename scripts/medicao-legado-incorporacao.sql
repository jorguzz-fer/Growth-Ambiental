-- ---------------------------------------------------------------------------
-- MEDIÇÃO do legado de incorporação (GA-9, Fase 1) — SOMENTE LEITURA.
--
-- Roda dentro de uma transação READ ONLY e termina em ROLLBACK: não grava nada.
-- Devolve só CONTAGENS por empresa: nenhum valor, nome de pessoa, documento ou
-- descrição de lançamento.
--
-- Como rodar (na produção do Growth Ambiental):
--   psql "$DATABASE_URL" -f scripts/medicao-legado-incorporacao.sql > medicao-legado.txt
--
-- Como ler:
--   (1) Resumo: uma linha por empresa, com quantos itens de legado ela tem.
--   (2) Detalhe: só as contagens maiores que zero, empresa por empresa.
--   A demonstração aparece marcada pelo nome do seed ("Consultoria Ambiental"
--   ou o nome anterior). Confira se não há empresa real com esse nome.
--
--   natureza = apagar    → dado que deixa de existir na Fase 4.
--   natureza = renomear  → só troca de rótulo ("Construtora" → "Empresa").
--                          "Construtora" era o valor padrão da conta corrente:
--                          espera-se > 0 em toda empresa. Nada se perde.
--   natureza = avaliar   → campo que também serve a consultoria; o dono decide
--                          se fica ou sai antes da Fase 3.
--
-- BLOQUEIO BGA9-1: qualquer contagem > 0 em empresa que não seja a
-- demonstração para o GA-9 até o dono decidir.
--
-- Não existe campo de venda na tabela `despesa`; o "campo de venda" (unidade)
-- é medido onde ele existe: conta a receber, movimento de caixa, recebimento
-- de terceiro e documento.
-- ---------------------------------------------------------------------------
BEGIN TRANSACTION READ ONLY;

\pset footer off

\echo '=== Medição do legado de incorporação (somente leitura) ==='
\echo ''
\echo '=== (1) Resumo por empresa ==='

WITH
-- Série INCC padrão (DEFAULT_INCC em src/lib/calc/constants.ts), 48 meses.
incc_padrao(mes, mo, ac) AS (VALUES
    ('05/2025', 0.26, 0.26),
    ('06/2025', 0.96, 1.222),
    ('07/2025', 0.91, 2.144),
    ('08/2025', 0.7, 2.859),
    ('09/2025', 0.21, 3.075),
    ('10/2025', 0.21, 3.291),
    ('11/2025', 0.28, 3.58),
    ('12/2025', 0.21, 3.798),
    ('01/2026', 0.63, 4.452),
    ('02/2026', 0.34, 4.807),
    ('03/2026', 0.36, 5.184),
    ('04/2026', 1.04, 6.278),
    ('05/2026', 0.51, 6.82),
    ('06/2026', 0.53, 7.386),
    ('07/2026', 0.49, 7.912),
    ('08/2026', 0.46, 8.409),
    ('09/2026', 0.44, 8.886),
    ('10/2026', 0.46, 9.387),
    ('11/2026', 0.48, 9.912),
    ('12/2026', 0.5, 10.461),
    ('01/2027', 0.52, 11.036),
    ('02/2027', 0.51, 11.602),
    ('03/2027', 0.52, 12.182),
    ('04/2027', 0.54, 12.788),
    ('05/2027', 0.5, 13.352),
    ('06/2027', 0.5, 13.919),
    ('07/2027', 0.49, 14.477),
    ('08/2027', 0.49, 15.038),
    ('09/2027', 0.5, 15.613),
    ('10/2027', 0.5, 16.191),
    ('11/2027', 0.5, 16.772),
    ('12/2027', 0.51, 17.368),
    ('01/2028', 0.51, 17.966),
    ('02/2028', 0.51, 18.568),
    ('03/2028', 0.5, 19.161),
    ('04/2028', 0.5, 19.757),
    ('05/2028', 0.5, 20.355),
    ('06/2028', 0.5, 20.957),
    ('07/2028', 0.5, 21.562),
    ('08/2028', 0.5, 22.17),
    ('09/2028', 0.5, 22.781),
    ('10/2028', 0.5, 23.394),
    ('11/2028', 0.5, 24.011),
    ('12/2028', 0.5, 24.632),
    ('01/2029', 0.5, 25.255),
    ('02/2029', 0.5, 25.881),
    ('03/2029', 0.5, 26.51),
    ('04/2029', 0.5, 27.143)
),
m(tenant_id, ordem, natureza, item, n) AS (
  -- ── Tabelas de incorporação ───────────────────────────────────────────────
  SELECT tenant_id, 1, 'apagar', 'unit (unidades)', count(*) FROM unit GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 2, 'apagar', 'permuta', count(*) FROM permuta GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 3, 'apagar', 'reembolso (liberações)', count(*) FROM reembolso GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 4, 'apagar', 'recebimento_parcela (recebimentos de parcela de unidade)', count(*) FROM recebimento_parcela GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 5, 'apagar', 'stock_movement com permuta_id', count(*) FROM stock_movement WHERE permuta_id IS NOT NULL GROUP BY tenant_id
  -- ── INCC ──────────────────────────────────────────────────────────────────
  UNION ALL
  SELECT r.tenant_id, 6, 'apagar', 'incc_rate diferente da série padrão (editada à mão)', count(*)
  FROM incc_rate r LEFT JOIN incc_padrao p ON p.mes = r.mes
  WHERE p.mes IS NULL
     OR r.monthly <> p.mo::numeric
     OR r.accumulated <> p.ac::numeric
     OR r.projected
     OR nullif(trim(r.variante), '') IS NOT NULL
     OR nullif(trim(r.fonte), '') IS NOT NULL
     OR nullif(trim(r.informado_por), '') IS NOT NULL
  GROUP BY r.tenant_id
  UNION ALL
  SELECT tenant_id, 7, 'apagar', 'incc_rate da empresa (project_id nulo)', count(*) FROM incc_rate WHERE project_id IS NULL GROUP BY tenant_id
  -- ── Projeto: terreno, financiamento, recursos próprios, área, CNO/CEI ─────
  UNION ALL
  SELECT tenant_id, 8, 'apagar', 'projetos com terreno (custo, valor, forma de pagamento ou proprietário)', count(*) FROM project
  WHERE coalesce(custo_terreno, 0) <> 0 OR coalesce(valor_terreno, 0) <> 0
     OR nullif(trim(forma_pagamento_terreno), '') IS NOT NULL OR nullif(trim(proprietario_terreno), '') IS NOT NULL
  GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 9, 'apagar', 'projetos com financiamento (construção ou terreno)', count(*) FROM project
  WHERE coalesce(financiamento_construcao, 0) <> 0 OR coalesce(financiamento_terreno, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 10, 'apagar', 'projetos com recursos próprios', count(*) FROM project WHERE coalesce(recursos_proprios, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 11, 'apagar', 'projetos com área construída (metragem) ou CUB', count(*) FROM project
  WHERE coalesce(metragem, 0) <> 0 OR coalesce(cub, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 12, 'apagar', 'projetos com CNO/CEI (codigo_obra)', count(*) FROM project WHERE nullif(trim(codigo_obra), '') IS NOT NULL GROUP BY tenant_id
  -- ── Cliente: campos de comprador ──────────────────────────────────────────
  UNION ALL
  SELECT tenant_id, 13, 'apagar', 'clientes com unidade (unit_code)', count(*) FROM cliente WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 14, 'apagar', 'clientes com status de venda (Reservado/Distrato, ou status junto com unidade)', count(*) FROM cliente
  WHERE lower(trim(status_contrato)) IN ('reservado', 'distratado', 'distrato')
     OR (nullif(trim(status_contrato), '') IS NOT NULL AND nullif(trim(unit_code), '') IS NOT NULL)
  GROUP BY tenant_id
  UNION ALL
  -- "Ativo", "Assinado", "Em análise" e "Cancelado" sem unidade também servem a
  -- cliente de consultoria (o seed da demonstração grava "Ativo"): o dono avalia.
  SELECT tenant_id, 14, 'avaliar', 'clientes com status do contrato genérico, sem unidade (Ativo, Assinado, Em análise, Cancelado)', count(*) FROM cliente
  WHERE nullif(trim(status_contrato), '') IS NOT NULL AND nullif(trim(unit_code), '') IS NULL
    AND lower(trim(status_contrato)) NOT IN ('reservado', 'distratado', 'distrato')
  GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 15, 'apagar', 'clientes com renda (bruta, líquida ou comprometimento)', count(*) FROM cliente
  WHERE coalesce(renda_bruta, 0) <> 0 OR coalesce(renda_liquida, 0) <> 0 OR nullif(trim(comprometimento), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 16, 'apagar', 'clientes com FGTS (possui ou saldo)', count(*) FROM cliente
  WHERE nullif(trim(possui_fgts), '') IS NOT NULL OR coalesce(saldo_fgts, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 17, 'apagar', 'clientes com score de crédito', count(*) FROM cliente WHERE coalesce(score_credito, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 18, 'apagar', 'clientes com interesse (nota de compra)', count(*) FROM cliente WHERE coalesce(interesse, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 19, 'apagar', 'clientes com outros campos de comprador (banco do financiamento, restrições, morar/investir, possui imóvel, motivação)', count(*) FROM cliente
  WHERE nullif(trim(banco_financ), '') IS NOT NULL OR nullif(trim(restricoes), '') IS NOT NULL
     OR nullif(trim(morar_ou_investir), '') IS NOT NULL OR nullif(trim(possui_imovel), '') IS NOT NULL
     OR nullif(trim(motivacao_compra), '') IS NOT NULL
  GROUP BY tenant_id
  -- ── Fornecedores com papéis de incorporação (PAPEIS_STAKEHOLDER_ANTIGOS) ──
  UNION ALL
  SELECT tenant_id, 20, 'apagar', 'fornecedores com papel de incorporação (Comprador de Unidade, Imobiliária Parceira, Corretor Autônomo, Incorporador, Construtora)', count(*)
  FROM stakeholder
  WHERE papeis && ARRAY['Comprador de Unidade', 'Imobiliária Parceira', 'Corretor Autônomo', 'Corretor', 'Incorporador', 'Construtora']::text[]
  GROUP BY tenant_id
  -- ── Contratos com reajuste INCC ───────────────────────────────────────────
  UNION ALL
  SELECT tenant_id, 21, 'apagar', 'contratos com reajuste INCC', count(*) FROM contrato WHERE indice_reajuste ILIKE 'INCC%' GROUP BY tenant_id
  -- ── Contas correntes "Construtora" ────────────────────────────────────────
  UNION ALL
  SELECT tenant_id, 22, 'renomear', 'contas correntes do tipo "Construtora" (vira "Empresa")', count(*) FROM bank_account WHERE tipo::text = 'Construtora' GROUP BY tenant_id
  -- ── Tipo ou campo de venda ────────────────────────────────────────────────
  UNION ALL
  SELECT tenant_id, 23, 'apagar', 'contas a receber do tipo "Sinal" ou "Parcela mensal"', count(*) FROM conta_receber WHERE tipo IN ('Sinal', 'Parcela mensal') GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 24, 'apagar', 'contas a receber com unidade (unit_code)', count(*) FROM conta_receber WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 25, 'apagar', 'movimentos de caixa com unidade (unit_code)', count(*) FROM cash_entry WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 26, 'apagar', 'recebimentos de terceiro com unidade (unit_code)', count(*) FROM recebimento_terceiro WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 27, 'apagar', 'documentos com unidade (unit_code)', count(*) FROM document WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  -- ── Chaves de incorporação ligadas (CHAVES_INCORPORACAO) ──────────────────
  UNION ALL
  SELECT tenant_id, 28, 'apagar', 'chaves de incorporação ligadas (incc_por_empresa, plano_definicao_nova, dre_receita_rateio, parcela_recebida_situacao)', count(*)
  FROM tenant_flag
  WHERE ligada AND chave IN ('incc_por_empresa', 'plano_definicao_nova', 'dre_receita_rateio', 'parcela_recebida_situacao')
  GROUP BY tenant_id
),
empresa AS (
  SELECT id, name,
         name IN ('Consultoria Ambiental', 'Veredas Consultoria Ambiental') AS demonstracao
  FROM tenant
),
resumo AS (
  SELECT e.name AS empresa,
         CASE WHEN e.demonstracao THEN 'sim' ELSE 'não' END AS demonstracao,
         count(m.item) FILTER (WHERE m.n > 0 AND m.natureza = 'apagar')   AS itens_a_apagar,
         coalesce(sum(m.n) FILTER (WHERE m.natureza = 'apagar'), 0)        AS linhas_a_apagar,
         count(m.item) FILTER (WHERE m.n > 0 AND m.natureza = 'renomear') AS itens_a_renomear,
         coalesce(sum(m.n) FILTER (WHERE m.natureza = 'renomear'), 0)      AS linhas_a_renomear,
         count(m.item) FILTER (WHERE m.n > 0 AND m.natureza = 'avaliar')  AS itens_a_avaliar,
         coalesce(sum(m.n) FILTER (WHERE m.natureza = 'avaliar'), 0)       AS linhas_a_avaliar,
         e.demonstracao AS eh_demo
  FROM empresa e LEFT JOIN m ON m.tenant_id = e.id
  GROUP BY e.id, e.name, e.demonstracao
)
SELECT empresa, demonstracao, itens_a_apagar, linhas_a_apagar, itens_a_renomear, linhas_a_renomear,
       itens_a_avaliar, linhas_a_avaliar,
       CASE
         WHEN eh_demo THEN 'demonstração (não bloqueia)'
         WHEN linhas_a_apagar + linhas_a_renomear + linhas_a_avaliar = 0 THEN 'zerada'
         ELSE 'BLOQUEIO BGA9-1'
       END AS situacao
FROM resumo
ORDER BY eh_demo, empresa;

\echo ''
\echo '=== (2) Detalhe: contagens maiores que zero, por empresa ==='

WITH
-- Série INCC padrão (DEFAULT_INCC em src/lib/calc/constants.ts), 48 meses.
incc_padrao(mes, mo, ac) AS (VALUES
    ('05/2025', 0.26, 0.26),
    ('06/2025', 0.96, 1.222),
    ('07/2025', 0.91, 2.144),
    ('08/2025', 0.7, 2.859),
    ('09/2025', 0.21, 3.075),
    ('10/2025', 0.21, 3.291),
    ('11/2025', 0.28, 3.58),
    ('12/2025', 0.21, 3.798),
    ('01/2026', 0.63, 4.452),
    ('02/2026', 0.34, 4.807),
    ('03/2026', 0.36, 5.184),
    ('04/2026', 1.04, 6.278),
    ('05/2026', 0.51, 6.82),
    ('06/2026', 0.53, 7.386),
    ('07/2026', 0.49, 7.912),
    ('08/2026', 0.46, 8.409),
    ('09/2026', 0.44, 8.886),
    ('10/2026', 0.46, 9.387),
    ('11/2026', 0.48, 9.912),
    ('12/2026', 0.5, 10.461),
    ('01/2027', 0.52, 11.036),
    ('02/2027', 0.51, 11.602),
    ('03/2027', 0.52, 12.182),
    ('04/2027', 0.54, 12.788),
    ('05/2027', 0.5, 13.352),
    ('06/2027', 0.5, 13.919),
    ('07/2027', 0.49, 14.477),
    ('08/2027', 0.49, 15.038),
    ('09/2027', 0.5, 15.613),
    ('10/2027', 0.5, 16.191),
    ('11/2027', 0.5, 16.772),
    ('12/2027', 0.51, 17.368),
    ('01/2028', 0.51, 17.966),
    ('02/2028', 0.51, 18.568),
    ('03/2028', 0.5, 19.161),
    ('04/2028', 0.5, 19.757),
    ('05/2028', 0.5, 20.355),
    ('06/2028', 0.5, 20.957),
    ('07/2028', 0.5, 21.562),
    ('08/2028', 0.5, 22.17),
    ('09/2028', 0.5, 22.781),
    ('10/2028', 0.5, 23.394),
    ('11/2028', 0.5, 24.011),
    ('12/2028', 0.5, 24.632),
    ('01/2029', 0.5, 25.255),
    ('02/2029', 0.5, 25.881),
    ('03/2029', 0.5, 26.51),
    ('04/2029', 0.5, 27.143)
),
m(tenant_id, ordem, natureza, item, n) AS (
  -- ── Tabelas de incorporação ───────────────────────────────────────────────
  SELECT tenant_id, 1, 'apagar', 'unit (unidades)', count(*) FROM unit GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 2, 'apagar', 'permuta', count(*) FROM permuta GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 3, 'apagar', 'reembolso (liberações)', count(*) FROM reembolso GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 4, 'apagar', 'recebimento_parcela (recebimentos de parcela de unidade)', count(*) FROM recebimento_parcela GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 5, 'apagar', 'stock_movement com permuta_id', count(*) FROM stock_movement WHERE permuta_id IS NOT NULL GROUP BY tenant_id
  -- ── INCC ──────────────────────────────────────────────────────────────────
  UNION ALL
  SELECT r.tenant_id, 6, 'apagar', 'incc_rate diferente da série padrão (editada à mão)', count(*)
  FROM incc_rate r LEFT JOIN incc_padrao p ON p.mes = r.mes
  WHERE p.mes IS NULL
     OR r.monthly <> p.mo::numeric
     OR r.accumulated <> p.ac::numeric
     OR r.projected
     OR nullif(trim(r.variante), '') IS NOT NULL
     OR nullif(trim(r.fonte), '') IS NOT NULL
     OR nullif(trim(r.informado_por), '') IS NOT NULL
  GROUP BY r.tenant_id
  UNION ALL
  SELECT tenant_id, 7, 'apagar', 'incc_rate da empresa (project_id nulo)', count(*) FROM incc_rate WHERE project_id IS NULL GROUP BY tenant_id
  -- ── Projeto: terreno, financiamento, recursos próprios, área, CNO/CEI ─────
  UNION ALL
  SELECT tenant_id, 8, 'apagar', 'projetos com terreno (custo, valor, forma de pagamento ou proprietário)', count(*) FROM project
  WHERE coalesce(custo_terreno, 0) <> 0 OR coalesce(valor_terreno, 0) <> 0
     OR nullif(trim(forma_pagamento_terreno), '') IS NOT NULL OR nullif(trim(proprietario_terreno), '') IS NOT NULL
  GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 9, 'apagar', 'projetos com financiamento (construção ou terreno)', count(*) FROM project
  WHERE coalesce(financiamento_construcao, 0) <> 0 OR coalesce(financiamento_terreno, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 10, 'apagar', 'projetos com recursos próprios', count(*) FROM project WHERE coalesce(recursos_proprios, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 11, 'apagar', 'projetos com área construída (metragem) ou CUB', count(*) FROM project
  WHERE coalesce(metragem, 0) <> 0 OR coalesce(cub, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 12, 'apagar', 'projetos com CNO/CEI (codigo_obra)', count(*) FROM project WHERE nullif(trim(codigo_obra), '') IS NOT NULL GROUP BY tenant_id
  -- ── Cliente: campos de comprador ──────────────────────────────────────────
  UNION ALL
  SELECT tenant_id, 13, 'apagar', 'clientes com unidade (unit_code)', count(*) FROM cliente WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 14, 'apagar', 'clientes com status de venda (Reservado/Distrato, ou status junto com unidade)', count(*) FROM cliente
  WHERE lower(trim(status_contrato)) IN ('reservado', 'distratado', 'distrato')
     OR (nullif(trim(status_contrato), '') IS NOT NULL AND nullif(trim(unit_code), '') IS NOT NULL)
  GROUP BY tenant_id
  UNION ALL
  -- "Ativo", "Assinado", "Em análise" e "Cancelado" sem unidade também servem a
  -- cliente de consultoria (o seed da demonstração grava "Ativo"): o dono avalia.
  SELECT tenant_id, 14, 'avaliar', 'clientes com status do contrato genérico, sem unidade (Ativo, Assinado, Em análise, Cancelado)', count(*) FROM cliente
  WHERE nullif(trim(status_contrato), '') IS NOT NULL AND nullif(trim(unit_code), '') IS NULL
    AND lower(trim(status_contrato)) NOT IN ('reservado', 'distratado', 'distrato')
  GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 15, 'apagar', 'clientes com renda (bruta, líquida ou comprometimento)', count(*) FROM cliente
  WHERE coalesce(renda_bruta, 0) <> 0 OR coalesce(renda_liquida, 0) <> 0 OR nullif(trim(comprometimento), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 16, 'apagar', 'clientes com FGTS (possui ou saldo)', count(*) FROM cliente
  WHERE nullif(trim(possui_fgts), '') IS NOT NULL OR coalesce(saldo_fgts, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 17, 'apagar', 'clientes com score de crédito', count(*) FROM cliente WHERE coalesce(score_credito, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 18, 'apagar', 'clientes com interesse (nota de compra)', count(*) FROM cliente WHERE coalesce(interesse, 0) <> 0 GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 19, 'apagar', 'clientes com outros campos de comprador (banco do financiamento, restrições, morar/investir, possui imóvel, motivação)', count(*) FROM cliente
  WHERE nullif(trim(banco_financ), '') IS NOT NULL OR nullif(trim(restricoes), '') IS NOT NULL
     OR nullif(trim(morar_ou_investir), '') IS NOT NULL OR nullif(trim(possui_imovel), '') IS NOT NULL
     OR nullif(trim(motivacao_compra), '') IS NOT NULL
  GROUP BY tenant_id
  -- ── Fornecedores com papéis de incorporação (PAPEIS_STAKEHOLDER_ANTIGOS) ──
  UNION ALL
  SELECT tenant_id, 20, 'apagar', 'fornecedores com papel de incorporação (Comprador de Unidade, Imobiliária Parceira, Corretor Autônomo, Incorporador, Construtora)', count(*)
  FROM stakeholder
  WHERE papeis && ARRAY['Comprador de Unidade', 'Imobiliária Parceira', 'Corretor Autônomo', 'Corretor', 'Incorporador', 'Construtora']::text[]
  GROUP BY tenant_id
  -- ── Contratos com reajuste INCC ───────────────────────────────────────────
  UNION ALL
  SELECT tenant_id, 21, 'apagar', 'contratos com reajuste INCC', count(*) FROM contrato WHERE indice_reajuste ILIKE 'INCC%' GROUP BY tenant_id
  -- ── Contas correntes "Construtora" ────────────────────────────────────────
  UNION ALL
  SELECT tenant_id, 22, 'renomear', 'contas correntes do tipo "Construtora" (vira "Empresa")', count(*) FROM bank_account WHERE tipo::text = 'Construtora' GROUP BY tenant_id
  -- ── Tipo ou campo de venda ────────────────────────────────────────────────
  UNION ALL
  SELECT tenant_id, 23, 'apagar', 'contas a receber do tipo "Sinal" ou "Parcela mensal"', count(*) FROM conta_receber WHERE tipo IN ('Sinal', 'Parcela mensal') GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 24, 'apagar', 'contas a receber com unidade (unit_code)', count(*) FROM conta_receber WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 25, 'apagar', 'movimentos de caixa com unidade (unit_code)', count(*) FROM cash_entry WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 26, 'apagar', 'recebimentos de terceiro com unidade (unit_code)', count(*) FROM recebimento_terceiro WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  UNION ALL
  SELECT tenant_id, 27, 'apagar', 'documentos com unidade (unit_code)', count(*) FROM document WHERE nullif(trim(unit_code), '') IS NOT NULL GROUP BY tenant_id
  -- ── Chaves de incorporação ligadas (CHAVES_INCORPORACAO) ──────────────────
  UNION ALL
  SELECT tenant_id, 28, 'apagar', 'chaves de incorporação ligadas (incc_por_empresa, plano_definicao_nova, dre_receita_rateio, parcela_recebida_situacao)', count(*)
  FROM tenant_flag
  WHERE ligada AND chave IN ('incc_por_empresa', 'plano_definicao_nova', 'dre_receita_rateio', 'parcela_recebida_situacao')
  GROUP BY tenant_id
),
empresa AS (
  SELECT id, name,
         name IN ('Consultoria Ambiental', 'Veredas Consultoria Ambiental') AS demonstracao
  FROM tenant
)
SELECT e.name AS empresa,
       CASE WHEN e.demonstracao THEN 'sim' ELSE 'não' END AS demonstracao,
       m.natureza, m.item, m.n AS quantidade
FROM m JOIN empresa e ON e.id = m.tenant_id
WHERE m.n > 0
ORDER BY e.demonstracao, e.name, m.ordem;

\echo ''
\echo '=== (3) Quantas empresas há no banco ==='
SELECT count(*) AS empresas,
       count(*) FILTER (WHERE name IN ('Consultoria Ambiental', 'Veredas Consultoria Ambiental')) AS demonstracoes
FROM tenant;

ROLLBACK;

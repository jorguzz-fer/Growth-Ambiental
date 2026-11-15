-- GA-2 §4 — Medição das datas digitadas nos campos que pediam MM/DD (somente leitura).
--
-- Antes do GA-2, as telas de Horas, Implantação (etapa e treinamento) e a
-- medição de contrato pediam a data no formato interno americano (MM/DD/AAAA).
-- Quem digitou "03/10/2027" querendo 3 de outubro gravou 10 de março.
--
-- "ambiguas" = datas com dia e mês ambos até 12: podem estar invertidas, e não
-- dá para saber pelo banco (03/10 pode ser as duas coisas). Este script só
-- conta; não altera nada (BEGIN READ ONLY ... ROLLBACK). Se uma empresa real
-- tiver ambíguas, as linhas são revistas com o cliente, à mão.
--
-- Rodar no terminal do Postgres da produção:  psql -f scripts/medicao-datas.sql
BEGIN READ ONLY;
SELECT t.name AS empresa, x.onde, x.preenchidas, x.ambiguas FROM tenant t CROSS JOIN LATERAL (VALUES
 ('horas: data', (SELECT count(*) FROM apontamento_hora a WHERE a.tenant_id=t.id AND nullif(trim(a.data),'') IS NOT NULL),
                 (SELECT count(*) FROM apontamento_hora a WHERE a.tenant_id=t.id AND a.data ~ '^(0[1-9]|1[0-2])/(0[1-9]|1[0-2])/')),
 ('implantacao: previsto/realizado', (SELECT count(*) FROM implantacao_etapa a WHERE a.tenant_id=t.id AND (nullif(trim(a.previsto),'') IS NOT NULL OR nullif(trim(a.realizado),'') IS NOT NULL)),
                 (SELECT count(*) FROM implantacao_etapa a WHERE a.tenant_id=t.id AND (a.previsto ~ '^(0[1-9]|1[0-2])/(0[1-9]|1[0-2])/' OR a.realizado ~ '^(0[1-9]|1[0-2])/(0[1-9]|1[0-2])/'))),
 ('treinamento: data', (SELECT count(*) FROM implantacao_treinamento a WHERE a.tenant_id=t.id AND nullif(trim(a.data),'') IS NOT NULL),
                 (SELECT count(*) FROM implantacao_treinamento a WHERE a.tenant_id=t.id AND a.data ~ '^(0[1-9]|1[0-2])/(0[1-9]|1[0-2])/')),
 ('medicao de contrato: periodo', (SELECT count(*) FROM contrato_medicao a WHERE a.tenant_id=t.id AND (nullif(trim(a.periodo_inicio),'') IS NOT NULL OR nullif(trim(a.periodo_fim),'') IS NOT NULL)),
                 (SELECT count(*) FROM contrato_medicao a WHERE a.tenant_id=t.id AND (a.periodo_inicio ~ '^(0[1-9]|1[0-2])/(0[1-9]|1[0-2])/' OR a.periodo_fim ~ '^(0[1-9]|1[0-2])/(0[1-9]|1[0-2])/')))
) AS x(onde, preenchidas, ambiguas) ORDER BY 1,2;
ROLLBACK;

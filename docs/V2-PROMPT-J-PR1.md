# Prompt J · PR J-1 — exibição: cabeçalho, data da venda, VGV, plural, tolerância, tenant

Primeira PR de código do Prompt J, conforme
[`V2-PROMPT-J-FASE1.md`](./V2-PROMPT-J-FASE1.md). Seções 2.5, 3.1–3.4 e 5.3.
**Nenhum registro gravado é alterado. Sem migração.**

## O que muda

| | Antes | Agora |
|---|---|---|
| **3.1 · cabeçalho** | `PageHeader` recebia `eyebrow` e `subtitle` e não mostrava nenhum dos dois (ocultos desde o commit `0601609`, "visual mais clean"). Em Unidades, "OBRA · Atual" e "N unidades · VGV" nunca apareciam | volta a exibir os dois: eyebrow em mono maiúsculo acima do título, subtítulo abaixo. **Vale para todas as telas** que já passavam esses textos (30 com eyebrow, 40 com subtítulo). Só apresentação; os textos foram lidos e são os da obra · versão |
| **2.5 · nome** | "Unidades do Empreendimento" | **"Unidades"**, como o menu (Prompt C) e o mockup |
| **3.2 · data da venda** (BJ-1) | `mesVenda` cru na lista: `01/27/2026` (mês/dia), rótulo "Mês venda" | `dateBR` → `27/01/2026`, rótulo **"Data da venda"**. O formulário já usava `DateField`. Nenhum valor gravado muda |
| **3.3 · VGV** | sempre em milhões: R$ 375.000 → "R$ 0,38M" | `vgvFormatado`: valor cheio abaixo de um milhão ("R$ 375.000"), abreviado a partir dele ("R$ 40,19 mi") |
| **3.4 · plural** | "1 unidades" | `contagemDeUnidades`: "1 unidade" |
| **3.4 · tolerância** | `Math.abs(saldo) < 1` na lista **e** no formulário (duas cópias) | `saldoFecha`: **R$ 0,01** (RG-08), num helper só; a coluna Saldo e o selo do formulário passam a mostrar centavos, senão "R$ 0" em vermelho não explicaria nada |
| **5.3 · tenant** | `getUnits(versionId)` só por versão | `getUnits(tenantId, versionId)`; os 13 chamadores passam a empresa (das telas, `ctx.tenant.id` ou `version.tenantId`; nas leituras internas de relatório, `versaoKindETenant` lê tipo e empresa da versão de uma vez). Sem efeito observável |

## Muda número?

Não. Muda **sinalização**: unidades vendidas com diferença entre R$ 0,01 e
R$ 0,99 saem de verde para vermelho. Quantas em produção: consulta 3 de
`docs/sql/v2-prompt-j-diagnostico.sql`, a rodar pelo dono. Na base local, zero.

## Arquivos

- novo: `src/lib/unidade-exibicao.ts` (+ teste puro);
- `src/components/app/page-header.tsx`;
- `src/app/(app)/unidades/page.tsx`, `src/components/app/unit-form.tsx`;
- `src/lib/queries.ts` (`getUnits`, `versaoKindETenant`, `getMonthlyRevenue`,
  `getRevenueBySource`) e os chamadores: dashboard, caixa, projeção, resumo,
  exportação da versão, permuta, `budget.ts`, `caixa.ts`,
  `scripts/varredura-reports.ts`.

## Verificação

- `unidade-exibicao.test.ts`: tolerância 0,01 (0,99 não fecha mais; ponto
  flutuante não engana), VGV por ordem de grandeza, plural, centavos no saldo.
- **Teste do dia 25 (BJ-1), na base local:** unidade `TESTE-J1-DIA25` criada
  pelo formulário com venda em 25/09/2026; a lista mostrou **25/09/2026**
  (antes mostraria 09/25/2026). Removida ao fim; `unit` voltou a 2 registros e
  [valor removido], os mesmos de antes.
- Navegador: Unidades com eyebrow "EMPREENDIMENTO PILOTO · ATUAL", título, "1
  unidade · VGV R$ 100.000", coluna "Data da venda"; Resumo Executivo com
  eyebrow e subtítulo de volta.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

## Observação

A exclusão pela lista de uma unidade **Disponível com data de venda** é
recusada ("vendida ou permutada"): é a regra da PR I-3 (`unidadeVendida` olha
status **ou** data). Comportamento esperado, não defeito desta PR.

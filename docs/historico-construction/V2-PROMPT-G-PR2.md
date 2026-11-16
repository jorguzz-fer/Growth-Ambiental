# Prompt G · PR G-2 — Parte 2, assistente do Plano de Contas (somente leitura)

Seção 8 do Prompt G, depois da Parte 1 e separada dela. **Nada é gravado;
sem migração; `chart_account` intocado.** Esta tela fica **fora da escrita
assistida permanentemente** (8.2.1).

## As quatro ações (8.3), em `src/lib/planocontas-analise.ts` (puro)

| Ação | O que mostra |
|---|---|
| **Contas sem uso** | contas ativas sem lançamento no período; separa "nunca receberam" (conta criada e esquecida, ou etapa que ainda não começou — a lista não distingue, a pessoa sim) de "último lançamento em …" |
| **Uso divergente da natureza** | categoria DRE usada no período que não costuma combinar com o grupo: conta de receita → Receita; CEF/Obra → Custo Variável/Fixo; complementar → o restante. Mostra a contagem da divergente e, para contraste, as que combinam. **Não diz que está errado, não sugere categoria** |
| **Contas parecidas** | pares no mesmo tipo de grupo com o mesmo nome, um nome contido no outro, ou ≥ 2 palavras em comum (Jaccard ≥ 0,5). Observação; **não propõe fusão** |
| **Onde cada conta aparece** | seletor de conta (Despesas, Restituições, Acerto, Medição, Exportação — os leitores de `getChartAccounts`), obras com linha de Orçamento/Previsão (`budget_account.row_key`), e as categorias DRE pelas quais os lançamentos entram no relatório — "por que esse gasto não está na DRE" sem abrir a DRE. Busca por código ou nome |

## Declarações (8.4) e isolamento (8.5)
- **Período:** os últimos 12 meses até o mês corrente, por competência do lançamento (sem ela, o mês da criação) — escrito em cada ação.
- **Obras:** as que o usuário vê (`ctx.projects`), listadas em cada ação.
- **Ausência de achado não é atestado:** dito no texto da divergência e no rodapé.
- **Consultas** (`getUsoDoPlanoDeContas`): duas, ambas com `tenant_id = ctx.tenant.id` explícito e `project_id IN (obras do usuário)`: (1) `despesa` agrupada por (conta, categoria DRE, competência) com contagem e data da última criação — **nunca valor**; (2) `budget_account` distinta por (conta, kind, categoria, obra). A página **só chama** se o usuário vê Despesas ou Orçamentos; sem `despesas:ver` não há contagem de lançamento, nem agregada (as ações dizem isso); sem `budget:ver` não há linha de orçamento.

## Interface (8.6)
Painel acima da coluna "Categorias DRE", que **permanece** com as 8 linhas e o
rodapé ⓘ. Selo "Somente leitura"; rodapé: classificação é decisão contábil.
Recolher/expandir persiste por usuário (`localStorage`).

## O que não antecipa (8.7)
Natureza dos grupos, destino de "Financeiro / Contábil", grupo de "Outras
Receitas", linha legada "Receita": o painel mostra uso; não opina.

## Testes (seção 9)
`planocontas-analise.test.ts` (8 casos: período declarado; `combina`; sem uso
com "nunca" × "fora do período"; divergência com contraste; parecidas; sem
`despesas:ver` não há contagem). Suíte (1222), `tsc`, `eslint`, `next build`
verdes. Navegador: painel acima das categorias, selo, as quatro ações com
período e obras declarados, busca "1.1", coluna DRE com 8 linhas e rodapé.
Hash de `chart_account` antes = depois.

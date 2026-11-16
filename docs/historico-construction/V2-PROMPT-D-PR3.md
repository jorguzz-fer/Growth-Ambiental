# Prompt D · PR D-3 — Assistente de IA (somente leitura)

Seção 6, decisão BD-3 (opção 1). O painel não grava nada, em nenhum caminho:
não importa action, só recebe o resultado de uma análise pura feita no
servidor sobre a versão que a página já carregou.

## O que faz (6.3 e 6.4)
- **Revisar orçamento**: cadastro sem valor de receita; contas cuja soma de
  percentuais fecha **abaixo** de 100% (o salvamento só bloqueia acima);
  total sem distribuição; dado em meses **fora** do período do projeto (não
  aparece na grade); total de receitas diferente do valor do cadastro (com
  as legadas somadas, sem alterar nada); despesas vazias com receita lançada
  (o card "Resultado" mostra receita sem custo).
- **Analisar distribuição**: competências do período sem nenhuma
  distribuição, por bloco; concentração acima de metade num mês.
- **Comparar Orçamento × Previsão**: resultado dos dois cenários e as cinco
  maiores variações por conta (ou "crie uma Previsão a partir deste
  Orçamento"). Em Orçamentos, compara com a Previsão que nasceu desta
  versão; em Previsão Atualizada, com o Orçamento de origem.
- **Explicar desvios**: contas só de um lado, totais iguais com meses
  diferentes (reprogramação de cronograma), variações acima de 20%.

## Isolamento e permissão (6.5–6.6)
Projeto e versão vêm da página, já validados contra o tenant
(`lerSelecaoDeProjeto` + `getBudgetPlanning` com `tenant_id`;
`getForecastComparison` com `tenant_id`). Nenhum id do cliente entra na
análise. Sem `ver` na tela não há página, logo não há assistente.

## Arquivos
`src/lib/orcamento-analise.ts` (puro) + teste (5), `assistente-orcamento.tsx`,
`budget/page.tsx` e `forecast/page.tsx` (layout com o painel à direita; some
abaixo de 1180px para baixo do conteúdo).

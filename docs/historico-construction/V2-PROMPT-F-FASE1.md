# Prompt F · Previsão Atualizada — Fase 1, inventário antes de escrever código

Prompt F (27 de 42). `/forecast`, mesmo componente de Orçamentos
(`budget-planning-screen.tsx`, `kind = "forecast"`). **Só leitura; nada foi
alterado.** SQL em [`sql/v2-prompt-f-diagnostico.sql`](./sql/v2-prompt-f-diagnostico.sql).

## O que o Prompt D já entregou e vale aqui
Rótulos "Previsão Atualizada", alternador, badge, linha fixa "Receitas do
Projeto" (total do cadastro, nas duas telas), seleção de linhas **herdada**
(BD-7 = BF-4), gravação não destrutiva (BG-11), assistente somente leitura
com "Comparar Orçamento × Previsão" e "Explicar desvios".

## O que existe hoje (confirmado no código)
- **Seletor de versão**: mostra `version.label`, que **é** o nome digitado na
  criação (`createForecastFromBudget` grava `label = nome || "Forecast"`); o
  problema é previsão criada **sem nome** (vira "Forecast"). Ordem: mais
  antiga primeiro. Base de origem (`source_version_id`) e `created_at` não
  aparecem. `duplicateForecast` copia o `sourceVersionId` da origem (BG-20,
  fora de escopo): a segunda geração aponta para o Orçamento, não para a
  Previsão duplicada.
- **Criar/duplicar**: contam o limite (12) **antes** da transação (FC-10);
  `throw` em erro (a tela captura `e.message`, que em produção o Next
  mascara); nome opcional.
- **Totais**: `totalReadOnly = kind === "forecast"` só na interface; a
  **importação de planilha grava `total`** sem olhar `totalReadOnly` (BF-3).
  Nada declara de onde o total vem nem aponta divergência com o Orçamento.
- **Situação**: `setVersionStatus` aceita Rascunho/Concluído/Aprovado; a
  tela oferece as três; **nenhuma consulta filtra por status**; `locked` só
  muda em `/versao` (`toggleVersionLock`). Aprovar não trava. A troca falha
  em silêncio (BG-13, fora de escopo).
- **Comparação** (`getForecastComparison` + `budget-forecast-compare.tsx`):
  lê `budget_account`/`budget_line` das duas versões via `getBudgetPlanning`
  (nenhum lado passa por `calcProjectionBySource` — os dois são retrato; o
  INCC recalculado só existe no Atual/DRE); **escolhe `budgets[0]`** quando a
  previsão não tem origem (FC-07); `merge` compara só totais e **descarta**
  `budgetByMonth`/`forecastByMonth` já calculados (FC-09); `tone` pinta
  despesa acima do orçado de **verde** (FC-08); `?cmp=1` faz `return`
  antecipado sem cabeçalho/seletores (FC-11); conta ausente de um lado vira
  **0** (5.3).
- **Base local**: 1 previsão ("Forecast", padrão, **sem origem**, Rascunho,
  não travada) em EMPREENDIMENTO PILOTO; 0 `budget_account`. Produção: rodar o
  SQL (relatórios A–E; o C é a linha de base do teste 11.14).

## Bloqueios — decisões adotadas
| | Decisão |
|---|---|
| **BF-1** | **Opção 1**: "Receitas do Projeto" lê o **cadastro** nas duas telas (já é assim desde a D-1, pela mesma função). Os **demais** totais seguem herdados do Orçamento na criação (retrato), somente-leitura, com a origem **declarada** na célula ("herdado do Orçamento em DD/MM/AAAA") e **divergência** com o total atual do Orçamento exibida, não bloqueante (6.2). Previsões existentes não são recalculadas. |
| **BF-2** | **Opção 2**: situação **documental**; a tela diz que não bloqueia a edição e mostra a trava (`locked`) como indicador somente-leitura, com link para onde ela é feita. Nenhum travamento novo. **"Concluído"** = etapa intermediária (revisão fechada pelo autor, ainda não aprovada) — registrado para o Prompt H. |
| **BF-3** | **Opção 1**: a importação **ignora a coluna Total** na Previsão (e na linha fixa, nas duas telas), atualiza só percentuais e informa "total ignorado: é herdado". |
| **BF-4** | = BD-7: herdada, não editável. |
| **3.4 / BG-12** | Só `createForecastFromBudget` e `duplicateForecast` passam a devolver `{ ok, error, id }` — é o que a 3.4 exige para o limite ser legível. As demais (salvar, situação) ficam como estão (seção 9). |
| **FC-07** | Sem origem registrada, a comparação **não escolhe**: a tela diz que a previsão não tem Orçamento de origem e oferece a escolha explícita (`?base=<id>`), rotulada como "comparando com … (escolhido por você)". |
| **BG-20** | Fora de escopo: a base exibida para uma previsão **duplicada** é o Orçamento (copiado), não a previsão de que foi duplicada — **informado**, não contornado. |
| **8.1** (limite 12) | Sem aumento. Criar avisa quando restam ≤ 2 vagas. |

## Plano de PRs
| PR | Conteúdo |
|---|---|
| Fase 1 (este) | inventário + SQL |
| F-1 | actions (nome obrigatório, limite dentro da transação com trava da linha do projeto, `{ ok, error, id }` em criar/duplicar); seletor com nome · base · data, ordem decrescente; totais com origem declarada e divergência; importação sem total (BF-3); situação documental + trava visível; comparação: cor por bloco, sem fallback (escolha explícita), tabela mensal, moldura mantida, ausente ≠ zero, declaração do regime e do retrato; testes |
| F-2 | assistente: verificações da seção 8 e **reprojeção proposta** (partir do Orçamento / partir do realizado) que **cria uma revisão nova** pelo caminho existente, mostrada como comparação antes/depois, com estouro de 100% sinalizado (8.4); selo "Propõe, você confirma" (8.5); relatório final (seção 12) |

## O que não muda (seções 9 e 10)
BG-10, 11 (já feita na D), 12 (exceto as duas actions acima), 13–18, 20,
FC-13. Rotas, chaves, limite de 12, regras de valor mensal e de soma,
indicadores, exportar.

## Perguntas ao usuário (não bloqueiam)
1. **BF-2**: situação documental, sem travar (adotado). Se quiser que
   "Aprovado" trave, é uma decisão própria (permissão de reabrir + log).
2. **"Concluído"** = etapa intermediária. Confirma, para o Prompt H?
3. **Limite de 12 previsões**: mantido; só aviso perto do teto. Quer subir?

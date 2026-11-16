# Prompt F · PR F-1 — identificação, criação, totais herdados e comparação

Nenhuma `version`, `budget_account` ou `budget_line` existente é alterada;
previsões antigas mantêm seus valores.

## Identificação (seção 2)
- Seletor da Previsão ordenado **da mais recente para a mais antiga**; mostra
  o nome dado na criação (que já era o `label`).
- Ao lado: **"Base: Orçamento “X” · criada em DD/MM/AAAA"** (de
  `source_version_id` e `created_at`), ou "Sem Orçamento de origem
  registrado". BG-20 (fora de escopo) fica **informado**: previsão duplicada
  mostra o Orçamento como base, não a previsão de que foi duplicada.

## Criar e duplicar (seção 3)
- **Nome obrigatório** (3.2): botão desabilitado sem nome e recusa no
  servidor.
- **FC-10**: o limite (12) é conferido **dentro da transação**, com a linha do
  projeto travada (`SELECT … FOR UPDATE`).
- **3.4**: `createForecastFromBudget` e `duplicateForecast` devolvem
  `{ ok, error, id, aviso }` — o limite chega legível; aviso quando restam
  2 vagas ou menos. As demais actions ficam como estão (BG-12, seção 9).
- Cópia da estrutura, dos totais e da seleção preservada (3.3).

## Totais herdados (seção 6, BF-1, BF-3)
- "Receitas do Projeto" lê o **cadastro** nas duas telas (já desde a D-1).
- Os demais totais seguem somente-leitura com a **origem declarada** na célula
  ("herdado em DD/MM/AAAA", com o Orçamento no título) e a **divergência**
  com o total atual do Orçamento de origem exibida em amarelo, sem bloquear
  (6.2) — `getBudgetPlanning` devolve `totaisDaOrigem`.
- **BF-3**: a importação de planilha **ignora a coluna Total** na Previsão e
  na linha fixa, atualiza só percentuais e informa quantos totais ignorou.

## Situação (seção 7, BF-2)
As três situações continuam; ao lado, o selo **"travada" / "não travada"**
(`locked`, somente-leitura) e a nota "situação não bloqueia a edição" (a
trava é feita em Configuração da Versão). Nenhum travamento novo.

## Comparação (seção 5)
- **FC-08**: cor pelo significado do bloco — despesa acima do orçado em
  vermelho; receita acima em verde; mês a mês pelo resultado.
- **FC-07**: sem origem registrada a comparação **não escolhe**: a tela diz
  que a previsão não tem Orçamento de origem e oferece a escolha (`?base=`),
  validada na consulta contra o projeto e o tenant; o cabeçalho marca
  "escolhido por você — não é a origem registrada".
- **FC-09**: tabela **mês a mês** (resultado por competência) com os
  `budgetByMonth`/`forecastByMonth` que já eram calculados.
- **FC-11**: a comparação abre **dentro da moldura** (título, alternador,
  seletores, barra da Previsão), com "← Voltar à grade".
- **5.2 / 5.0.4**: declara as duas versões, a data da previsão, o regime
  (competência, nunca caixa) e que os dois lados são retrato de
  `budget_line`, com a data da replicação de cada lado quando houver.
- **5.3**: conta de um lado só aparece como **"ausente"** (badge "só na
  Previsão" / "só no Orçamento"), nunca como zero; variação "—".

## Testes
`previsao-regras.test.ts` (6, puro) e `actions/previsao-f.test.ts` (5, com
banco: nome obrigatório e `{ ok, id }`; seletor em ordem com origem, data e
totais da origem; divergência sem recálculo; comparação sem fallback, base
explícita, base de outro tenant recusada, ausente = null e zero = zero;
limite de 12 dentro da transação com mensagem legível e aviso; sem
permissão). Suíte 162 arquivos / 1524 testes; `tsc`, `eslint`, `next build`.
Navegador com obra de teste (criada e excluída): botão travado sem nome,
origem e data ao lado do seletor, selo da trava, célula "herdado em…",
divergência após mudar o Orçamento, comparação na moldura com tabela
mensal e cores por bloco. Logs de teste removidos.

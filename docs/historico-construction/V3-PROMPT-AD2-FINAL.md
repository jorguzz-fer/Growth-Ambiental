# Prompt AD2 · Fluxo de Caixa semanal — relatório final

Fase 3, Bloco 2. Executado em 18/10/2026. Fonte: revisão V5, Caixa ("nos
relatórios também acho que seria legal ter uma visão semanal do fluxo de
caixa").

## O que mudou

- **Visão semanal** no Fluxo de Caixa, abaixo da tabela mensal: 13 semanas,
  de segunda a domingo, começando quatro semanas antes da atual. Colunas:
  entradas, saídas e saldo da semana (previsto), realizado de entrada e de
  saída, saldo acumulado. A semana corrente vem marcada. "← Anteriores",
  "Hoje" e "Próximas →" deslocam a janela (`?sem=` com a segunda-feira).
- **Mesmas funções, outro balde.** `flowMaps`, `flowMapsRealizado`,
  `getMonthlyRevenue` e `getRestituicoesPendentesByVersion` ganharam um
  parâmetro opcional de balde de tempo. Sem ele, o caminho é o de sempre:
  nenhum número mensal muda (a suíte inteira com banco passa igual).
- **`src/lib/calc/semana-caixa.ts`** (puro, testado): chave da semana,
  janela, rótulo e as linhas com acumulado.
- O título da tela passou de "Fluxo de Caixa Mensal" para "Fluxo de Caixa".

## BAD2-1 (decidido no prompt)

- A semana começa na **segunda-feira**.
- O que tem data cai na semana da data: vencimento da parcela e da despesa,
  data da liquidação no realizado, data prevista da restituição.
- O que só tem competência ("MM/YYYY") — linha de Orçamento ou Previsão,
  revenda de permuta parcelada — cai na **semana do dia 1º** do mês.
- O acumulado parte do mesmo saldo inicial da tabela mensal e soma o
  **previsto** de todas as semanas anteriores à janela. Com a chave do Fluxo
  ligada, a tabela mensal troca o previsto pelo realizado nos meses
  fechados; a semanal não faz essa troca e diz no rodapé que corre pelo
  previsto.

## Testes

- `semana-caixa.test.ts` (6 casos): segunda-feira, domingo, virada de ano,
  competência sem dia, datas inválidas, acumulado com semanas anteriores.
- `fluxo-semanal.test.ts` (banco, 4 casos): cada valor na semana da sua data;
  o total do horizonte e o do mês batem entre mensal e semanal; realizado
  pela liquidação; competência na semana do dia 1º.
- Suíte com banco: 215 de 216 arquivos; a falha é o teste de fatura com data
  fixa, já registrado no relatório do AC2.
- `scripts/e2e/v3-telas.mjs`: 16 de 16, com a visão semanal e a navegação.

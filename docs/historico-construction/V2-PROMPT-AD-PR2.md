# Prompt AD · AD-2 — a chave do Fluxo de Caixa

Partes 1.1, 1.2, 1.3, 2.1, 3.2 e BAD-1, todas atrás da chave por empresa
**`fluxo_definicao_nova`**, que nasce **desligada**. Desligada, a tela devolve
os mesmos números de antes. No navegador, o total e o acumulado ficaram
iguais aos do AD-1.

## O que a chave liga

- **1.1 · o realizado é sempre da Atual**, qualquer que seja a ordem da
  seleção. O texto da base diz isso.
- **1.2 · a permuta sai das colunas de Orçamento e Previsão.**
  - `flowMaps` ganhou a opção `definicaoNova`. Por padrão, faz o de antes.
  - Com ela ligada, o planejamento fica só com `budget_line`.
- **1.3 · sem Atual, sem substituta.**
  - O projeto sem Atual mostra a ausência e esconde realizado, desvio e
    acumulado.
  - No consolidado, projeto sem Atual não entra com outra versão.
- **2.1 · o acumulado segue o realizado nos meses fechados**, antes do mês
  corrente, e o previsto do mês corrente em diante. Uma linha na tabela
  marca a **fronteira**: "acima: meses fechados · abaixo: projeção".
- **3.2 · mês fechado.** O previsto aparece esmaecido, como referência, e o
  realizado em destaque.
- **BAD-1 · ponto de partida.**
  - Com **uma obra**, o acumulado parte do caixa realizado da Atual antes do
    primeiro mês: o fluxo da obra.
  - Na **Empresa toda**, continua pelo saldo das contas.
  - A origem é declarada nos dois casos.

## A prévia

`/chaves#previa-fluxo` mostra, por obra:
- a partida e o acumulado final de hoje e pela definição nova;
- a permuta que sai do planejamento;
- o caixa gravado fora da Atual;
- as obras sem Atual.

Ela usa as mesmas funções da tela (`flowMaps`, `flowMapsRealizado` e
`fluxo-tela`).

## Testes

- `fluxo-tela.test.ts`:
  - mês fechado pelo realizado e futuro pelo previsto;
  - sem a opção, tudo pelo previsto, como antes;
  - a partida da obra.
- `fluxo-chave.test.ts`, com banco:
  - a permuta gravada no Orçamento soma com a chave desligada e sai com
    ela ligada;
  - o realizado da Atual não leva o caixa gravado no Orçamento;
  - a prévia mostra os dois.
- Navegador:
  - com a chave desligada, o mesmo do AD-1;
  - com ela ligada, ligada só no banco local durante o teste e depois
    apagada: a fronteira aparece, a base muda o texto e o acumulado termina
    em −R$ 4.188, igual à prévia.

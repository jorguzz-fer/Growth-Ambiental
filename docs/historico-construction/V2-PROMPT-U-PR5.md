# Prompt U — PR 5: assistente de Cartões (somente leitura)

Último passo do Prompt U. Entrega a seção 7 (assistente de IA, Prompt E).

## O que mudou
- `src/lib/cartao-analise.ts` (puro, sem modelo, sem gravação):
  - **Extrato × lançamentos** — lê o resultado da conferência do cartão
    escolhido (sem lançamento e valor, sem extrato, divergências, créditos
    sem estorno). A proposta de lançamento é a do card (BU-2); quem lança é
    o usuário, em Despesas.
  - **Projeção do ciclo** — o que já caiu (compras, parcelas, rotativo), o
    que ainda cai (parcelas futuras) e o total esperado; juro só com taxa,
    como estimativa, fora de Contas a Pagar.
  - **Compras sem obra** — compras no cartão sem projeto vinculado (hoje
    toda despesa nasce com projeto, então a lista tende a ser vazia; a
    verificação existe para o caso de a obra ser removida).
  - **Limite** — comprometido pelo ciclo aberto (inclusive faturas fechadas
    em aberto) e pelas parcelas futuras; a fatura paga parcialmente não
    conta pelo próprio saldo (ele mora na seguinte como rotativo). Alerta a
    partir de 80%.
- `src/components/app/assistente-cartoes.tsx`: painel ao lado do conteúdo
  em /cartoes, no mesmo molde dos outros assistentes (recolhível por usuário,
  selo "Somente leitura"). Nenhum número de cartão entra: só apelido e
  quatro últimos.

## Nunca
Lançar despesa, pagar fatura, registrar estorno, projetar juro sem taxa.
O painel não chama nenhuma action.

## Testes
- `src/lib/cartao-analise.test.ts`: projeção (já caiu / ainda cai / total;
  juro nulo sem taxa), limite (sem dobrar a parcial), compras sem obra,
  análise completa com conferência; nenhum número de 16 dígitos na saída.
- Suíte completa: 128 arquivos, 1321 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Com um cartão temporário: painel "Cartões · 1 ativo"; Limite mostra
"comprometido R$ 0 … disponível R$ 15.000"; Projeção com estimativa de
juro (taxa cadastrada); Extrato pede para escolher o cartão; recolher/abrir
funciona. Sem erros de página. Cartão de teste removido.

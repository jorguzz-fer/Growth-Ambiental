# Prompt AD3 · Fluxo de Caixa Analítico — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Depende do DP (a conta do plano
como eixo) e usa a mesma tabela do AC3.

## O que mudou

- **Tela nova, Fluxo de Caixa Analítico**, em Business Intelligence, logo
  abaixo do Fluxo de Caixa. É o previsto do Fluxo (pelo mês do vencimento) de
  um cenário, com as saídas abertas em bloco → grupo → conta e a análise
  vertical (% das entradas).
- **Blocos das saídas:** Obra (grupos CEF), Complementares, Ressarcimentos a
  terceiros e Sem conta do plano. As entradas abrem em unidades e liberações e
  em revenda de permuta. No fim, o saldo do período.
- **Os totais são os do Fluxo de Caixa, por construção.** As saídas do Fluxo
  passaram a sair de uma lista única, com a conta de cada saída: o Fluxo soma
  essa lista por mês, e a analítica a abre por conta. As regras não mudaram:
  parcela em vez da despesa parcelada, cancelada fora, paga por terceiro no
  ressarcimento.
- **Seletores:** obra ou escopo, período (De/Até) e cenário. Um cenário de
  cada vez. Sem a chave do Fluxo, obra sem o cenário pedido usa a primeira
  versão, a regra de hoje; com a chave, fica fora e é contada.
- **A Cris sabe a tela.** O menu marca só o item mais específico, como no
  AC3.

## Premissas

- **BAD3-1** (drill-down até o lançamento?) segue sem resposta. A tela para
  na conta.
- É só o previsto. O realizado, pela data de liquidação, não tem conta em
  todos os lançamentos de caixa e continua no Fluxo de Caixa.
- "Grupo CEF, subgrupo e plano de contas" foi lido como bloco (obra ou
  complementar), grupo e conta, os três níveis que o plano tem.

## Acesso

A tela mora sob `/fluxocaixa`, então a permissão é a do Fluxo. Nenhuma chave
nova e nada ampliado.

## Dados

Só leitura. Nada gravado.

## Testes

- `src/lib/fluxo-analitico.test.ts` (novo): entradas, saídas e saldo; blocos;
  planejamento por grupo; fora do plano; os filhos somam o pai; % sobre as
  entradas.
- `src/lib/fluxo-analitico-db.test.ts` (novo, com banco): a lista de saídas
  soma, mês a mês, o que o Fluxo mostra, com parcelas e cancelada; a
  analítica fecha com o total.
- Os testes do Fluxo existentes (mensal, semanal, chave) passam sem mudança
  depois da troca para a lista única.
- e2e: o item no menu, os blocos, o saldo e um só item marcado.

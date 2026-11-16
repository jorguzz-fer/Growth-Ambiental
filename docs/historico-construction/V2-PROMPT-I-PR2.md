# Prompt I · PR I-2 — pagamentos com transação, proteção contra clique duplo e status pelo acumulado

Segunda PR de código do Prompt I, conforme
[`V2-PROMPT-I-FASE1.md`](./V2-PROMPT-I-FASE1.md). Seções 13 e 14.
**Não muda número de relatório. Nenhum pagamento já gravado é alterado.**
Migração aditiva: coluna `pagamento.idempotency_key` (anulável) e índice
parcial; as linhas antigas não são tocadas.

## O que muda

| | Antes | Agora |
|---|---|---|
| **Transação** | pagar uma despesa gravava três coisas separadas (pagamento, despesa, caixa); pagar uma parcela, quatro. Falha no meio deixava pagamento sem caixa, ou caixa sem pagamento | tudo numa **transação**: ou entra inteiro, ou nada entra |
| **Clique duplo / reenvio** | dois pagamentos, duas saídas de caixa | a tela manda uma **chave** por abertura do diálogo; o servidor grava uma vez e, no reenvio, devolve o que já existe. Dois envios simultâneos colidem no índice e o segundo também devolve o existente |
| **Status da despesa (§13)** | decidido pelo pagamento isolado: 100 pagos como 60 + 40 ficava "Parcialmente paga" | pelo **principal acumulado** de todos os pagamentos: 60 + 40 = "Pago". Encargos (multa, juros) não abatem; desconto abate |
| **Status da parcela e da despesa-mãe (§14)** | a parcela recalculava; a despesa-mãe **não** | a parcela recalcula pelo acumulado e a despesa-mãe pelas parcelas: todas quitadas = Pago; parte = Parcialmente paga; nada = A pagar |
| **Valor original da parcela** | vinha do navegador e era gravado no pagamento | o servidor usa o valor **persistido** da parcela; o navegador só manda encargos |
| **Só na Atual** | pagamento passava em despesa de Orçamento/Previsão | recusado com mensagem. Hoje não há parcela fora da Atual em produção (diagnóstico E) |
| **Concorrência** | dois pagamentos ao mesmo tempo liam o mesmo acumulado | a parcela (ou a despesa) é travada (`FOR UPDATE`) dentro da transação |
| **Retorno** | `registrarPagamento` lançava erro (sem mensagem em produção) | `{ ok, error }`; a tela mostra |

## O que não muda

- `pagamento.valorOriginal` não alimenta nenhum relatório (`fluxo-caixa.ts`
  lê o da **parcela**); gravar o valor persistido em vez do enviado não altera
  número.
- A saída de caixa continua indo para a versão da própria despesa, na data
  informada, como desde o Prompt A.
- `despesa.dataCaixa` passa a receber a data do pagamento também no pagamento
  de parcela (antes, só no de despesa inteira). É a mesma informação que a
  tela de Contas a Pagar já mostrava a partir da parcela.

## Arquivos

- novos: `src/lib/pagamento-regras.ts` (regras puras),
  `src/lib/db/migrations/0044_pagamento_idempotencia.sql` (+ `down/`);
- `src/lib/actions/pagamentos.ts` (reescrita de `registrarPagamento`),
  `src/lib/actions/despesas.ts` (`pagarDespesa`), `src/lib/db/schema.ts`;
- `src/components/app/parcelas-list.tsx`, `despesas-table.tsx` (chave por
  abertura do diálogo; nova chave depois de gravar).

## Verificação

- `pagamento-regras.test.ts` (puro): principal, §47.7, parcela, §47.10, recusas.
- `pagamentos-integridade.test.ts` (Postgres):
  - §47.7 — 60 + 40 = Pago, caixa −100 em dois lançamentos, na Atual;
  - §47.8 — dois envios simultâneos e um reenvio: um único pagamento;
  - juros não abatem, desconto abate;
  - falha no meio (conta bancária inexistente) não deixa nada;
  - valor zero, data ausente e versão de planejamento recusados;
  - §14 — o navegador manda 999 e o servidor grava 60; duplo submit da
    parcela 2 gera um pagamento; a despesa-mãe vai a "Parcialmente paga" e
    depois a "Pago" (§47.10).
- `despesas-projeto-explicito.test.ts` adaptado ao novo retorno.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

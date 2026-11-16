# Prompt U — PR 3: pagamento da fatura, rotativo, juro cobrado e projeção

Terceiro passo do Prompt U. Entrega as seções 3 (pagamento) e 4 (projeção
da próxima fatura). Nenhuma despesa, parcela, pagamento ou caixa existente
muda; tudo que este PR grava nasce de ação explícita do usuário.

## O que mudou

### Migração 0055 `fatura_pagamento` (aditiva, `IF NOT EXISTS`, com `down/`)
- Tabela `fatura_pagamento`: um registro por pagamento (valor, data, conta,
  obra, `cash_entry_id`, chave de idempotência com índice único parcial).
- `fatura_cartao.juros_despesa_id` (anulável): a despesa financeira criada
  quando o juro veio cobrado.

### Pagamento (3.1–3.6) — `actions/faturas.ts`, no padrão do lote (BU-1)
- `previewPagamentoFatura` (3.6): total em aberto até esta fatura, conta que
  debita (a do cartão por padrão), quais parcelas são abatidas e o saldo que
  restará.
- `pagarFatura`: `FOR UPDATE` na fatura e nas parcelas; chave de idempotência
  (duplo clique = um pagamento, 3.5); **uma** saída de caixa (`cash_entry`)
  pelo valor pago, na data, na conta do cartão, na obra escolhida (3.1);
  **não cria despesa** (3.2); abate as parcelas em aberto do cartão até esta
  fatura, FIFO (fatura mais antiga, PED, parcela), gravando `pagamento` por
  parcela — é o que o saldo real da despesa (§15) lê — sem caixa por parcela;
  status da parcela e da despesa recalculados. Fatura aberta não aceita
  pagamento. Valor acima do saldo é recusado.
- **Rotativo (3.3):** pagamento parcial deixa saldo; a fatura seguinte é
  criada na hora (vazia, se preciso) para o saldo ter onde aparecer. Na
  lista e em Contas a Pagar a fatura parcial fica com saldo 0 ("levado à
  fatura seguinte") e a seguinte traz o rotativo no total — o mesmo dinheiro
  nunca aparece duas vezes. Pagar a seguinte quita primeiro o rotativo
  (FIFO).
- **Juro cobrado (3.4):** `informarJurosDaFatura` cria uma despesa
  "Despesas Financeiras" na competência da data da cobrança, vinculada ao
  cartão com uma parcela nesta fatura (o valor da fatura passa a incluí-la e
  o pagamento a quita). Só em fatura fechada; uma por fatura; nunca a partir
  da projeção.

### Regras puras — `calc/fatura.ts`
- `totalDaFatura` / `saldoDaFatura` / `estadoDaFatura` passam a considerar o
  rotativo que a fatura traz; `comRotativo` calcula, por cartão e em ordem,
  o rotativo recebido; `rotativoParaOCiclo`; `distribuirPagamento` (FIFO,
  centavos exatos); `projecaoDoCiclo`.
- Fatura paga parcialmente não fica "Vencida": o saldo está na seguinte,
  que tem o próprio vencimento.

### Projeção (4.1–4.3) — card "Próxima fatura — ciclo em curso"
Por cartão ativo: compras lançadas no ciclo, parcelas de compras
anteriores, rotativo da fatura anterior, **total previsto (o que Contas a
Pagar mostra)**; com taxa cadastrada, o juro aparece como **ESTIMATIVA** e o
"total projetado com a estimativa" vem separado, com a frase de que a
estimativa não entra em Contas a Pagar nem gera lançamento (4.3). Sem taxa,
"não projeta juro" (BU-3).

### Tela de faturas
Colunas Rotativo, Total, Pago, Saldo; pagamentos feitos sob o estado;
"com juro cobrado"; botões Pagar (prévia → confirmar) e Juros cobrados só
em fatura fechada com saldo.

## Testes
- `calc/fatura.test.ts`: distribuição FIFO, 9 (rotativo acumulado, parcial
  com saldo zero na lista), 10/16a/4.3 (juro fora do total previsto), estado
  com rotativo.
- `actions/fatura-pagamento.test.ts` (integração): 8 e 12 (uma saída de
  caixa, nenhuma despesa, idempotência), 9 (parcial cria a seguinte com o
  rotativo; FIFO ao pagar a seguinte), 11 (juro vira despesa financeira na
  competência da cobrança; fatura passa a incluí-lo), fatura aberta recusa
  pagamento e juro.
- Suíte completa: 125 arquivos, 1308 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Fatura fechada de R$ 1.200: "Pagar" → prévia ("restará R$ 500 como
rotativo") → confirmar → "1 parcela abatida, R$ 500 no rotativo"; uma
`cash_entry` de −700 na conta do cartão; a fatura fica "Parcialmente paga"
com "R$ 700 em 20/08/2026"; Contas a Pagar mostra a fatura seguinte
(10/09) com R$ 500 "Vencida" e a parcial com saldo 0; a projeção do ciclo
aberto mostra rotativo 0 (o saldo está na de setembro). Dados de teste
removidos.

## Dados (teste 19)
`despesa` 75 / 43.701,75 · `despesa_parcela` 0 · `pagamento` 0 ·
`cash_entry` 46 / 1.793,14 — iguais antes e depois.

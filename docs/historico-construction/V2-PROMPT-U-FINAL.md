# Prompt U — Cartões de Crédito · Relatório final

PRs: #172 (Fase 1), #173 (U-1), #174 (U-2), #175 (U-3), #176 (U-4), U-5
(assistente). Docs: V2-PROMPT-U-FASE1.md, -PR1 a -PR5; SQL em
`docs/historico-construction/sql/v2-prompt-u-diagnostico.sql`.

## 1. Decisões dos bloqueios
- **BU-1 — estrutura própria** (opção 2): `cartao_credito`, `fatura_cartao`,
  `fatura_pagamento`. O **padrão** da restituição em lote foi copiado:
  prévia antes de gravar, chave de idempotência e `FOR UPDATE`. A tabela de
  obrigação com terceiro não foi reaproveitada.
- **BU-2 — propõe** (opção 2): a conferência do extrato lista as compras
  sem lançamento com link para /despesas já preenchido (forma, cartão, data,
  valor, descrição, competência). O usuário confirma lá. Nenhum caminho da
  tela de Cartões grava despesa a partir do extrato.
- **BU-3 — taxa cadastrada por cartão, opcional.** Sem taxa, nenhuma
  projeção de juro ("sem taxa — não projeta juro"). Nenhuma taxa inventada.
  **Pergunta aberta:** confirma que a taxa é do cartão (contrato) e não
  informada fatura a fatura?

## 2. Estrutura criada
| Tabela / coluna | Para quê |
|---|---|
| `cartao_credito` | apelido, bandeira, **só 4 últimos dígitos**, titular, limite, dia de fechamento, dia de vencimento, conta que debita, taxa de rotativo (opcional), ativo |
| `fatura_cartao` | uma por cartão + fechamento (índice único); vencimento; `juros_despesa_id`. Valor e estado são derivados |
| `despesa.cartao_id` | a compra foi no cartão |
| `despesa_parcela.fatura_id` | em que fatura a parcela cai |
| `fatura_pagamento` | um por pagamento: valor, data, conta, obra, `cash_entry_id`, idempotência |
| `extrato_cartao` | itens do extrato subido, com `import_hash` único |
| `estorno_cartao` | lançamento próprio do estorno: compra, fatura do crédito, origem, item do extrato reconhecido, aplicado em que pagamento |

## 3. A fatura de uma compra (2.1–2.3)
`calc/cartao-ciclo.ts`: compra até o dia de fechamento cai na fatura que
fecha naquele mês; depois, na seguinte. Vencimento vem do dia de vencimento;
quando é **menor ou igual** ao de fechamento (fecha 28, vence 5), a fatura
vence no **mês seguinte** — testado. Dia 31 em mês curto cai no último dia.
Parcelada: a 1ª segue a regra; as demais, uma por ciclo seguinte; centavos
exatos (a última absorve). A competência é única (a informada).

## 4. Fatura em Contas a Pagar (2.6–2.9; R 1.6/1.7)
`calc/fatura.ts` / `linhasComFaturas`: compra com `cartao_id` **sai** da
lista (e as parcelas dela); a fatura **entra**, uma linha, pelo acumulado do
ciclo + rotativo, **sem** estimativa de juros. Aberta = "Prevista" (selo
azul, com explicação); fechada = "A pagar"/"Vencida"; paga = "Pago". Mesma
linha (mesmo id) antes e depois do fechamento — não nasce uma segunda. Link
"Fatura" vai para /cartoes. `getContasPagar` só ganhou `cartaoId`; Dashboard
e Fechamento continuam contando a compra (uma vez), não a fatura.

## 5. Pagamento parcial e rotativo (3.3)
O pagamento abate as parcelas em aberto do cartão até a fatura paga, FIFO
(fatura mais antiga, PED, parcela), gravando `pagamento` por parcela (saldo
real §15) e **uma** saída de caixa. O que sobra vira rotativo: a fatura
seguinte é criada na hora (vazia, se preciso) e o traz; na lista e em Contas
a Pagar a parcial fica com saldo 0 ("levado à fatura seguinte") e a seguinte
mostra o total com rotativo — nunca duas vezes. Estado e saldo consideram o
rotativo. Juro cobrado (3.4): despesa "Despesas Financeiras" na competência
da cobrança, vinculada à fatura, só por ação explícita.

## 6. Deduplicação do extrato (5.3)
Assinatura `cartão | data | centavos | descrição` em `import_hash` com índice
único parcial — mesmo padrão de `cash_entry`. Subir o mesmo arquivo duas
vezes: "0 registrados, N já estavam". A importação não grava despesa (5.4).

## 7. Estorno antecipado × do extrato (6.3)
Ambos são linhas de `estorno_cartao`. Na importação, crédito do extrato que
casa (mesmo valor, cartão) com um antecipado sem vínculo recebe o vínculo
(`extrato_item_id`) — sem segundo estorno. Um item do extrato aceita um só
estorno. A conferência mostra o par ("estorno antecipado · PED"). Botão
manual "Reconhecer como o antecipado" para o caso que o automático não casou.
O crédito reduz a fatura e entra **antes do dinheiro** no pagamento, marcado
como aplicado.

## 8. A tela não grava despesa
Confirmado: a única despesa criada a partir de /cartoes é a de **juro
cobrado** (3.4), por ação explícita, e ela nasce como compra no cartão
(vinculada à fatura). Importação, conferência, estorno e assistente não
criam despesa; a proposta abre /despesas.

## 9. Nenhum dado existente foi alterado
`despesa`, `despesa_parcela`, `pagamento`, `cash_entry` (contagem e soma)
iguais antes e depois de cada PR na base local (75 / 43.701,75 · 0 · 0 ·
46 / 1.793,14). Nenhuma parcela ou despesa existente foi vinculada a cartão
ou fatura; `forma_pagamento` existente não foi reclassificada.

## 10. Migrações (todas aditivas, `IF NOT EXISTS`, com `down/`)
0053 `cartao_credito` · 0054 `fatura_cartao` + `despesa.cartao_id` +
`despesa_parcela.fatura_id` · 0055 `fatura_pagamento` +
`fatura_cartao.juros_despesa_id` · 0056 `extrato_cartao` + `estorno_cartao`.

## 11. Limitações e perguntas
- **DRE no estorno (6.2):** o prompt pede reverter a despesa original "por
  lançamento próprio"; o sistema recusa despesa negativa e a DRE soma
  `despesa`. O estorno reduz a fatura e fica visível; **a DRE não foi
  tocada**. Decidir: (a) despesa negativa só para estorno de cartão, ou (b)
  DRE subtraindo `estorno_cartao` por competência.
- Compra no cartão não pode ser recorrente (cada compra tem a sua data).
- Crédito de estorno maior que o devido fica como crédito não aplicado na
  fatura (não vira saldo negativo).
- Despesas gravadas antes com forma "Cartão de crédito" seguem sem fatura
  (vínculo retroativo é decisão humana — consulta 1 do SQL lista).
- Conferência casa por fatura e valor (a data da compra não é gravada na
  despesa; vive no audit). Divergência de valor: até 5% na mesma fatura.
- "Compras sem obra" tende a vazio: toda despesa nasce com projeto.
- Produção: confirmar que as migrações 0046–0056 subiram.

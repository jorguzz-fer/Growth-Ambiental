# Prompt U — PR 2: a fatura, a compra no cartão e Contas a Pagar

Segundo passo do Prompt U. Entrega a seção 2 (fatura), o 3-B.4/3-B.6 do
Prompt S (cartão no lançamento) e o 1.6/1.7 do Prompt R (fatura em Contas a
Pagar). Nenhuma despesa, parcela, pagamento ou caixa existente muda.

## O que mudou

### Migração 0054 `fatura_cartao` (aditiva, `IF NOT EXISTS`, com `down/`)
- Tabela `fatura_cartao`: uma por cartão e data de fechamento (índice único),
  com `fechamento` e `vencimento`. **O valor não é gravado**: é a soma das
  parcelas vinculadas; o estado é derivado.
- `despesa.cartao_id` (anulável) e `despesa_parcela.fatura_id` (anulável).
  **Nenhuma linha existente foi vinculada** (seção 9).

### Compra no cartão, em Despesas (S 3-B.4 / 3-B.6)
- Forma "Cartão de crédito" abre o bloco: cartão (só ativos), data da compra,
  nº de parcelas (1 a 48) e a prévia "cai na fatura que fecha X e vence Y".
  Condição/painel de parcelas somem nesse modo.
- `addDespesa`: valida cartão da empresa e ativo; grava `cartaoId`; a
  despesa nasce **"A pagar"** (3-B.5), sem conta da empresa, com
  `formaPagamento` "Cartão de crédito"; vencimento = o da primeira fatura;
  **competência = a informada** (2.4). Uma parcela por fatura (1x = uma),
  valores em centavos exatos, cada uma com `faturaId`; a fatura do ciclo é
  criada sob demanda **na mesma transação** (índice único cobre corrida).
  Audit `despesa.cartao` com cartão, data, nº de parcelas e fechamentos.
- Recusas: cartão + pago por terceiro; recorrente; parcelas manuais; sem data;
  cartão inativo.
- Edição: com `cartaoId`, valor, vencimento, forma e status **não mudam**
  (seguem a fatura); competência continua livre. Aviso no formulário.

### Fatura (2.5–2.9) — `src/lib/calc/fatura.ts`, puro
- `estadoDaFatura`: aberta (hoje ≤ fechamento), fechada, paga, paga
  parcialmente — derivado de datas e pagamentos, nunca gravado: a mesma linha
  muda de prevista para firme (2.9).
- `statusDaFatura`: Prevista / A pagar / Vencida / Parcialmente paga / Pago.
- `linhasComFaturas`: compra com cartão **sai** de Contas a Pagar (e as
  parcelas dela); a fatura **entra**, uma linha (fornecedor "Fatura · cartão",
  forma "Cartão de crédito", projeto "Cartão · apelido"); fatura vazia não
  aparece.

### Contas a Pagar (R 1.6 / 1.7)
- Página: consulta própria `getFaturasCartao` (soma das parcelas de despesas
  não canceladas + pago); `getContasPagar` **não muda** (ganhou só o campo
  `cartaoId`, aditivo). Sem permissão de ver cartões, as compras continuam
  fora (o mesmo dinheiro nunca aparece duas vezes) e a fatura não entra.
- Tabela: selo "Prevista" (azul) na fatura aberta, com explicação no título;
  link "Fatura" leva a /cartoes, não a /despesas.

### Tela de Cartões
- "Usado no ciclo" = acumulado da fatura aberta de cada cartão.
- Card "Faturas": uma linha por ciclo com estado, compras, valor, pago e
  saldo; clicar lista as compras (PED → lançamento raiz).
- Excluir cartão só sem fatura nem compra (1.4); com vínculo, inativar.

## Decisões / limites
- Dashboard e Fechamento continuam lendo `getContasPagar`: contam a compra
  (uma vez) e não a fatura. Documentado na Fase 1, item 3.
- Pagamento da fatura, rotativo e juro: PR 3. Extrato e estorno: PR 4.
- Compra no cartão não pode ser recorrente (cada compra tem a sua data).

## Testes
- `calc/fatura.test.ts`: estados, 16/16c (mesma linha antes e depois do
  fechamento), 7 (fatura em vez das compras), 16a/16b.
- `actions/cartao-compra.test.ts` (integração): 1, 2, 3, 5, 6, 7, 16b, trava
  de edição, recusas, 19 (nenhum pagamento nem caixa).
- Suíte completa: 124 arquivos, 1299 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Forma "Cartão de crédito" mostra o bloco e esconde o painel de parcelas;
prévia "1ª parcela na fatura que fecha 28/03/2026 e vence 05/04/2026; última
na que vence 05/06/2026"; lançamento em 3x cria três faturas (todas já
vencidas, porque a compra foi datada em março); card Faturas lista as três e
as compras da primeira (PED → lançamento); Contas a Pagar mostra as três
faturas com link "Fatura" e **não** mostra a compra. Dados de teste
(despesa, parcelas, faturas, cartão, audit) removidos e sequência de PED
restaurada.

## Dados (teste 19)
`despesa` 75 / 43.701,75 · `despesa_parcela` 0 · `pagamento` 0 ·
`cash_entry` 46 / 1.793,14 — iguais antes e depois.

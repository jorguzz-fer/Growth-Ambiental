# Prompt U · Cartões de Crédito — Fase 1, inventário antes de escrever código

Prompt U (20 de 42), tela nova `/cartoes`, par do Prompt S (3-B.4 e 3-B.6) e
do Prompt R (1.6 e 1.7). **Só leitura; nada foi alterado.** SQL em
[`sql/v2-prompt-u-diagnostico.sql`](./sql/v2-prompt-u-diagnostico.sql).

## O que existe hoje

- **Nada de cartão.** Não há tabela, action, tela nem permissão de cartão. As
  únicas menções são o rótulo "Cartão de crédito" em `FORMAS_PAGAMENTO`
  (`calc/parcelas.ts`) e o mapa de rótulos do leitor de documentos.
- `despesa.forma_pagamento` já existe (texto livre, com "Cartão de crédito"
  entre as opções). Local: 75 despesas, todas sem forma de pagamento. Em
  produção pode haver despesas gravadas como "Cartão de crédito" sem fatura:
  **nenhuma será vinculada retroativamente** (seção 9) — consulta 1 do SQL
  lista o que existe.
- `despesa_parcela` suporta parcelamento (número, vencimento, valor, forma,
  banco, status, cheque). Não tem vínculo com fatura: entra coluna aditiva.
- `cash_entry.import_hash` com `importSignature(conta|data|centavos|doc)` é o
  padrão de deduplicação (5.3). O extrato do caixa é XLSX/CSV lido no
  cliente (`import-extrato.tsx` → `parseSheet`); o servidor recebe linhas.
- `restituicao-lote.ts` é o padrão a copiar (BU-1): `preview…` puro +
  `confirmar…` com `idempotencyKey`, `FOR UPDATE` e colisão tratada como
  sucesso.
- Contas a Pagar (`/contaspagar`) monta `linhasPorObrigacao(despesas,
  parcelas)` + obrigações de terceiro com `origem: "obrigacao"`. `getContasPagar`
  também alimenta Dashboard, Fechamento e conciliação — **não muda** (R, 9).
- DRE lê `despesa` por competência e categoria, sem olhar status nem forma de
  pagamento: a compra no cartão entra na DRE pela competência sem código novo
  (teste 2). `recusaDeValor` rejeita valor ≤ 0: **não existe despesa negativa**.
- `dre_category` tem "Despesas Financeiras" (juro do rotativo, 3.4).
- Datas internas são texto `MM/DD/YYYY` (como `vencimento`, `data_pagamento`).

## Bloqueios

| | Decisão adotada (não destrutiva) |
|---|---|
| **BU-1** | **Estrutura própria** (opção 2): `cartao_credito`, `fatura_cartao`, `fatura_pagamento`. O **padrão** do lote (preview, idempotência, `FOR UPDATE`) é copiado; a tabela de obrigação de terceiro não é reaproveitada |
| **BU-2** | **Propõe** (opção 2): a conferência do extrato mostra as compras sem lançamento com um link para `/despesas` já preenchido (valor, data, descrição, cartão); o usuário confirma lá. **Nenhum caminho desta tela grava despesa** |
| **BU-3** | **Taxa cadastrada por cartão, opcional.** Sem taxa, a tela não projeta juro (mostra só o saldo rotativo). Nenhuma taxa é inventada. **Pergunta:** confirma que a taxa é do cartão (contrato da operadora) e não informada fatura a fatura? |

## Decisões de modelagem (para o usuário conferir)

1. **Estado da fatura é derivado**, não gravado: aberta enquanto hoje ≤
   fechamento; fechada depois; paga / paga parcialmente pelos pagamentos. Assim
   a mesma linha muda de prevista para firme (2.9) sem rotina noturna.
2. **Compra no cartão nasce "A pagar"** (3-B.5: não nasce paga) com
   `cartao_id`; suas parcelas (1 por ciclo, 1x = 1 parcela) nascem "Pendente"
   com `fatura_id`. A fatura do ciclo é criada sob demanda, na mesma transação
   do lançamento.
3. **Contas a Pagar:** a tela troca as parcelas vinculadas a fatura pela linha
   da fatura (prevista/firme), via consulta própria — `getContasPagar` não muda.
   Efeito colateral documentado: Dashboard e Fechamento continuam contando a
   compra (uma vez) e não a fatura; o total é o mesmo dinheiro, uma vez só.
4. **Pagamento parcial:** `fatura_pagamento` registra cada pagamento (saída
   de caixa na conta do cartão). O saldo não pago vira **rotativo** e entra como
   linha da fatura seguinte (`saldo_rotativo_anterior`, calculado). O **juro
   cobrado** é informado ao fechar a fatura e vira despesa "Despesas
   Financeiras" na competência da cobrança — única despesa criada por esta
   tela, e só por ação explícita do usuário (3.4).
5. **Estorno (6):** tabela `estorno_cartao` (antecipado ou do extrato) que
   reduz a fatura. **Conflito:** o prompt pede "reverter a despesa original por
   lançamento próprio", mas o sistema recusa despesa de valor negativo e a DRE
   soma `despesa` por categoria. Caminho adotado: o estorno reduz a fatura e
   fica visível na compra; **a DRE não é tocada até decisão**. **Pergunta:**
   (a) permitir despesa negativa só para estorno de cartão, ou (b) a DRE
   passar a subtrair `estorno_cartao` por competência? Nenhuma das duas altera
   dado existente; a (b) muda a leitura da DRE.
6. **Número do cartão:** só `ultimos4` (4 dígitos, validado); nenhum campo
   para o número completo (teste 17).

## Plano de PRs

| PR | Entrega |
|---|---|
| U-1 | migração 0053 (`cartao_credito`), regras puras do ciclo (`calc/cartao-ciclo.ts`: fatura de uma compra, vencimento com a borda 2.2, parcelas por ciclo), actions, tela `/cartoes` com lista (limite, usado, disponível), permissão `cartoes`, menu |
| U-2 | migração 0054 (`fatura_cartao`, `despesa.cartao_id`, `despesa_parcela.fatura_id`), select de cartão em Despesas (S 3-B.4/3-B.6), vínculo na transação do lançamento, fatura em Contas a Pagar (R 1.6/1.7) |
| U-3 | migração 0055 (`fatura_pagamento`), pagamento com preview, idempotência e `FOR UPDATE`, parcial/rotativo, juro cobrado, projeção da próxima fatura |
| U-4 | migração 0056 (`extrato_cartao`, `estorno_cartao`), importação com `import_hash`, conferência, estorno antecipado × do extrato |
| U-5 | assistente somente leitura, relatório final |

## Antes/depois (base local, consulta 19)

| tabela | linhas | soma |
|---|---|---|
| despesa | 75 | 43.701,75 |
| despesa_parcela | 0 | 0 |
| pagamento | 0 | 0 |
| cash_entry | 46 | 1.793,14 |

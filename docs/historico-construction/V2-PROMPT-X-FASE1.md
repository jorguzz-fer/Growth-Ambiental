# Prompt X · Contas Correntes — Fase 1, inventário antes de escrever código

Prompt X (21 de 42), `/contas`. **Só leitura; nada foi alterado.** SQL em
[`sql/v2-prompt-x-diagnostico.sql`](./sql/v2-prompt-x-diagnostico.sql).

## O que existe hoje

- **Tela** `/contas`: já verifica `can(..., "ver")` com `AccessDenied` (5.1
  ✔). Texto fixo fala de Open Finance e atualização manual (1.2). Cadastro
  (banco, agência, operação, conta, tipo, saldo, atualização, ID Open
  Finance); tabela com saldo editável, "Manual/Automático" e Excluir.
- **Actions** (`actions/contas.ts`): `addConta` lança exceção sem permissão
  e aceita banco vazio (vira "Banco") e saldo vazio (vira "0") — 5.2 ✘;
  `updateConta` audita só o valor novo (`meta: set`), sem o anterior — 4.3
  ✘; `deleteConta` apaga sem olhar vínculo (as FKs zeram em silêncio) — 5.4
  ✘; nenhuma devolve `{ ok, error }` — 5.3 ✘.
- **`bank_account`**: sem coluna `ativo` → inativar (3.2, 6 do teste) precisa
  de migração aditiva.
- **Tipo** (`bank_account_type`): Construtora, Imobiliária, Terceiros. Governa
  duas coisas: o selo na tabela e **`saldoDisponivel`** (`contas-saldo.ts`),
  que exclui "Terceiros" do saldo da empresa. Nenhuma tela mostra total por
  tipo (5.5).
- **Quem lê `bank_account.saldo`** (2.3): `/contas` (total = todas as
  contas); `/caixa` (card "Saldo das contas correntes", `saldoDisponivel`);
  `/fechamento` (`saldoContas = saldoDisponivel`); `/fluxocaixa` (saldo
  inicial = `saldoDisponivel`). Dashboard e Balanço do Dia **não** leem.
  A seleção de conta aparece ainda em Despesas, Ressarcimentos, Acerto,
  Contas a Receber e Cartões (lista, não saldo).
- **BX-3 — "Automático"**: `saldo_source = "auto"` **não dispara nada**. O
  que existe: (a) `src/workers/sync-openfinance.ts`, que só roda se
  `PLUGGY_CLIENT_ID/SECRET` estiverem configurados e só para contas com
  `open_finance_id` (importa transações como lançamentos de caixa — não
  atualiza o saldo); (b) o upload de extrato no Caixa, que, quando informa
  saldo final, grava `saldo`, `saldo_source = "auto"` e `last_sync`. Ou seja,
  "auto" significa "o último saldo veio de um extrato subido", não "atualiza
  sozinho". Local: nenhuma conta auto; cabeçalho diz "Open Finance não
  configurado".
- **Vínculos (BX-2)**: hoje **dez** tabelas apontam para `bank_account`, não
  oito — as do prompt (`despesa.banco_id`, `despesa_parcela`, `pagamento`,
  `restituicao`, `acerto`, `repasse`, `cash_entry`, `conta_receber.banco_id`)
  mais `cartao_credito` e `fatura_pagamento` (Prompt U). Todas `SET NULL`.
- **Módulo (6)**: no menu (Prompt C) a tela já está no grupo Caixa; na
  matriz de permissões (`SCREENS`) ainda consta em "Despesas".
- Existe também `addBankAccount` em `actions/despesas.ts` (cadastro rápido
  pela tela de Fornecedores), sem validação — recebe a mesma regra.

## Base local × produção

A base local tem **4 contas**, todas com agência e número, saldo 0, manual.
**As três linhas da seção 3 (SOCIO A, SOCIO B, CHEQUE
TERCEIRO) não existem aqui** — são de produção. Logo:

- O inventário BX-2 e o das despesas (3.3) ficam como **consultas prontas**
  no SQL, para rodar em produção. Nada é removido por código.
- A decisão item a item (excluir sem vínculo / inativar com vínculo) passa a
  ser possível pela própria tela: excluir verifica as dez tabelas e diz qual
  vínculo impede; inativar preserva e tira do total.

## Bloqueios

| | Situação |
|---|---|
| **BX-1** | **Pergunta ao usuário:** o que é "CHEQUE TERCEIRO"? Se for cheque recebido de cliente (valor a receber), o sistema não tem cheque recebido — só emitido em `despesa_parcela`. Caminho adotado: **não remover**; a conta pode ser inativada pela tela quando houver destino. O inventário BX-2 mostra o que ela carrega |
| **BX-2** | Consulta pronta (dez tabelas, contagem e valores). Local: as três contas não existem |
| **BX-3** | Respondido acima: "auto" só reflete o último extrato subido; sem Pluggy configurada o worker não roda. Rótulo passa a "Automático (quando conectado)" + selo "não conectada" quando não há `open_finance_id`; o campo fica (Prompt L) |

## Conflitos e decisões

1. **Seção 3 é operação em produção**, não código: este prompt entrega
   inventário, orientação e as portas (excluir com verificação, inativar).
   A reclassificação das despesas de sócio (3.3) é decisão humana, item a
   item, pelo vínculo por PED em Ressarcimentos — já existente (T-2).
2. **2.2 — total só de contas ativas** entra em `saldoDisponivel` (usada por
   Caixa, Fechamento e Fluxo) com `ativo` opcional (ausente = ativa): hoje
   nenhuma conta está inativa, então **nenhum número muda** até alguém
   inativar uma conta — e aí muda nas quatro telas, de propósito.
3. **5.5** — o total por tipo passa a aparecer na tela (Construtora /
   Imobiliária / Terceiros), sem mudar o enum.
4. **Dez tabelas, não oito**: a verificação de exclusão cobre as dez.

## Plano de PRs

| PR | Entrega |
|---|---|
| X-1 | migração 0057 `bank_account.ativo`; actions com `{ ok, error }`, validação (5.2), auditoria anterior/novo do saldo (4.3), exclusão com inventário das dez tabelas (5.4), inativar/reativar; tela: orientação (1.1), aviso sem agência/conta (1.3), total só de ativas + por tipo (2.2/5.5), rótulo "Automático (quando conectado)" (4.1); módulo na matriz (6) |
| X-2 | assistente somente leitura (7) e relatório final |

## Antes/depois (base local, consulta 12)

4 contas: Caixa 0001/00000001-0 (Construtora), Caixa 0001/00000002-0
(Imobiliária), Inter 0001/00000003-0 (Imobiliária), Itaú 0039/12345-6
(Imobiliária) — todas saldo 0, manual, sem Open Finance.
`saldo_disponivel` = 0; `saldo_total` = 0.

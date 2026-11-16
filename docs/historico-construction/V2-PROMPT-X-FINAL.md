# Prompt X — Contas Correntes · Relatório final

PRs: #178 (Fase 1), #179 (X-1), X-2 (assistente). Docs: V2-PROMPT-X-FASE1.md,
-PR1, -PR2; SQL em `docs/historico-construction/sql/v2-prompt-x-diagnostico.sql`.

## 1. BX-1 — "CHEQUE TERCEIRO"
**Pergunta aberta ao usuário.** A conta não existe na base local (é de
produção). Se for cheque recebido de cliente, é valor a receber — e o
sistema só tem cheque **emitido** (`despesa_parcela`). Destino adotado: a
conta **não foi removida nem inativada**; quando houver resposta, a própria
tela permite inativar (com histórico) ou excluir (sem vínculo), com o
inventário à vista.

## 2. BX-2 — inventário das três contas
Consulta pronta no SQL (bloco BX-2): para cada conta, contagem e valores em
**dez** tabelas — `despesa`, `despesa_parcela`, `pagamento`, `restituicao`,
`acerto`, `repasse`, `cash_entry`, `conta_receber` (as oito do prompt) mais
`cartao_credito` e `fatura_pagamento` (Prompt U). Na base local as três
contas não existem; em produção, rodar antes de qualquer decisão.

## 3. BX-3 — o que o "Automático" faz
`saldo_source = "auto"` **não dispara nada**. O que existe: o worker
`src/workers/sync-openfinance.ts` (só roda com `PLUGGY_CLIENT_ID/SECRET` e
para contas com `open_finance_id`; importa transações como lançamentos de
caixa, não atualiza o saldo) e o upload de extrato no Caixa, que grava
`saldo`, `saldo_source = "auto"` e `last_sync` quando informa saldo final.
Logo "auto" significa "o último saldo veio de um extrato subido". O rótulo
passou a "Automático (quando conectado)" com "não conectada" quando não há
`open_finance_id`; o campo fica (Prompt L).

## 4. Quem lê `bank_account.saldo`
`/contas` (total: agora só ativas, declarado), `/caixa` (card "Saldo das
contas correntes" via `saldoDisponivel`), `/fechamento` (`saldoContas`) e
`/fluxocaixa` (saldo inicial). Todas passam a ignorar conta inativa — como
nenhuma conta está inativa, **nenhum número mudou**. Dashboard e Balanço do
Dia não leem.

## 5. As três contas
**Nenhuma excluída nem inativada por este prompt**: não existem na base
local e a seção 3 é decisão humana, item a item, em produção, com o
inventário (BX-2) e o das despesas (3.3) à vista. As portas existem:
excluir só sem vínculo (a tela mostra o inventário antes); inativar
preserva o registro e tira do total.

## 6. Despesas vinculadas às contas de sócio (3.3)
Consulta pronta (bloco 3.3): por despesa, status, pagamentos, caixa
conciliado, obrigação com terceiro e ressarcimentos ativos. **Nenhuma
despesa foi reclassificada.** A reclassificação é pelo vínculo por PED em
Ressarcimentos (Prompt T), uma a uma, depois de conceder o papel (Prompt W).

## 7. Exclusão verifica as dez tabelas
`vinculosDaConta` conta os registros em cada tabela; `deleteConta` recusa
com a lista ("3 lançamento(s) de caixa, 1 cartão(ões) de crédito…"); a
tela mostra o inventário antes de pedir confirmação. Antes, as FKs zeravam
em silêncio.

## 8. O enum de tipo
`bank_account_type` (Construtora, Imobiliária, Terceiros) governa o selo na
tabela e `saldoDisponivel` (Terceiros fica fora do caixa da empresa). A tela
passou a mostrar o total por tipo (5.5), sem mudar o enum.

## 9. Assistente
Puro (`contas-analise.ts`), somente leitura, sobre o que a página carregou:
não parecem conta, sem movimento (180 dias), saldo parado (90 dias, com a
data), automáticas sem conexão. Não chama nenhuma action — não cadastra,
não altera saldo, não inativa nem exclui.

## 10. Antes/depois
`bank_account`: 4 contas, mesmo conteúdo linha a linha (hash igual) antes e
depois de cada PR; `saldo_disponivel` = 0 e `saldo_total` = 0 antes e
depois. Caixa, Fechamento e Fluxo devolvem os mesmos números.

## 11. Migrações
0057 `bank_account_ativo` (aditiva, `IF NOT EXISTS`, padrão true, com
`down/`).

## 12. Limitações
- Seção 3 fica para produção (decisão humana com os inventários).
- `addBankAccount` (cadastro rápido em Fornecedores) não foi tocado.
- 4.2: o saldo manual continua sendo o único; quando a conciliação (Prompt
  L) entrar com os dois saldos, ele passa a ser ponto de partida ou
  referência do extrato — dependência registrada, não implementada.
- Produção: confirmar que as migrações 0046–0057 subiram.

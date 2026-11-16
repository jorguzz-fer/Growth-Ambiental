# Prompt S · PR S-3 — trava de conciliação: a mensagem diz qual movimento e qual permissão

Seção 1 do Prompt S. **Nenhuma despesa alterada; nenhum vínculo de conciliação
desfeito; sem migração.**

A trava em si (1.1 e 1.4) já existia desde o Prompt I (`recusaDeEdicao`:
valor, status, datas e forma não mudam com pagamento, parcela paga, acerto,
restituição, terceiro ou caixa conciliado; descrição, fornecedor, conta CEF e
categoria seguem editáveis). O que faltava:

| | Agora |
|---|---|
| **1.2** qual movimento | com caixa conciliado, `updateDespesa` lê os movimentos (`movimentosConciliados`, só leitura) e a recusa lista **data · valor · descrição** do extrato (até 3, "e mais N") e diz que desfazer a conciliação, no Caixa, vem antes |
| **1.3** permissão própria | desfazer é `caixa:excluir` (`desfazerConciliacao`, Prompt L), não `despesas:editar`. Quem pode editar e não pode desfazer lê, com todas as letras: "Desfazer a conciliação exige a permissão de excluir no Caixa, que o seu usuário não tem — peça a quem administra os acessos" |

Tudo em `despesa-regras.ts` (`detalheDaConciliacao`, puro) e na action; a
tela já exibe `error` da action. `desfazerConciliacao` não foi tocada.

## Testes
Puros (4) em `despesa-regras.test.ts`; integração (3) em
`trava-conciliacao.test.ts`: despesa com `cash_entry.conciliado_despesa_id`
recusa valor/vencimento/competência com o movimento identificado, aceita
descrição/fornecedor/conta/categoria, e sem `caixa:excluir` explica a
permissão. Suíte (1242), `tsc`, `eslint`, `next build` verdes.

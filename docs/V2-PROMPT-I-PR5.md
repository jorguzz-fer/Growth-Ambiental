# Prompt I · PR I-5 — Contas a Pagar: só Atual (atrás de chave), saldo real, "Vencida" única

Quinta PR de código do Prompt I, conforme
[`V2-PROMPT-I-FASE1.md`](./V2-PROMPT-I-FASE1.md). Seções 10, 15 e 16.
**Nenhum registro gravado é alterado. Sem migração.**

## O que muda

| | Antes | Agora |
|---|---|---|
| **§10 · versões de planejamento** (`getContasPagar`) | lia despesas de qualquer versão: Orçamento, Previsão e cópias contavam como obrigação em Contas a Pagar, Dashboard, Fechamento e conciliação | **atrás da chave `contas_pagar_so_atual`** (desligada = exatamente como hoje). Ligada, só a versão Atual. A tela de Contas a Pagar ganha a **prévia**: as linhas de planejamento que somem, com PED, obra, versão, vencimento, status e valor, e o total. Visível a quem administra chaves |
| **§15 · pendente** | somado pelo **valor original** de toda despesa não paga, em Contas a Pagar (`totalPend`), Dashboard (`aPagar`) e Fechamento (`totalPagar`). Despesa de 100 com 80 pagos aparecia como 100 | **saldo a pagar** = valor − principal pago − abatimentos de acertos ativos, por **uma lógica só** (`saldosReaisDasDespesas`, a mesma do acerto contábil). `ContaPagarRow.saldo`, coluna **Saldo** na tabela, `pendenteDaConta`/`totalPendente` nos três lugares e na conciliação do extrato (que passa a casar pelo que faltava pagar) |
| **§16 · "Vencida"** | derivada da data em **duas funções separadas** (Contas a Pagar e Despesas); o filtro de status usava o status gravado (não tinha "Vencida") | `statusExibido` em `src/lib/despesa-status.ts`: exibição, cor, filtro, opções do filtro, ordenação e contadores usam a mesma função. Continua derivada, sem persistir |

## Muda número?

- **§10:** só com a chave ligada. Em produção há despesas na Previsão
  ([dado de produção removido]). A prévia mostra exatamente
  essas linhas antes de ligar.
- **§15:** o "Pendente" (Contas a Pagar, Dashboard, Fechamento) passa a
  descontar o que já foi pago ou abatido. Só muda para despesa com pagamento
  parcial ou acerto — que era o defeito. Não é relatório contábil; é o total
  operacional do que falta sair do caixa.
- **§16:** ordem e filtro; nenhum total.

## O que fica para outra PR

- **Listagem por parcela** (§10 acréscimo, §15 acréscimo): uma linha por parcela
  em aberto, com o vencimento e o saldo de cada uma. É do **Prompt R**.
- **`fluxo-caixa.ts`** soma parcelas pelo `valorOriginal` sem descontar o pago:
  relatório, camada analítica — **PR I-8**.

## Arquivos

- novos: `src/lib/despesa-status.ts`, `src/lib/contas-pagar-regras.ts` (puros);
- `src/lib/chaves.ts` (chave nova), `src/lib/queries.ts` (`getContasPagar`,
  `getContasPagarEmPlanejamento`, `ContaPagarRow.saldo/versionKind/versionLabel`);
- `src/app/(app)/contaspagar/page.tsx` (prévia), `dashboard/page.tsx`,
  `src/components/app/contas-pagar-table.tsx`, `despesas-table.tsx`,
  `fechamento-panel.tsx`, `src/lib/actions/caixa.ts`,
  `src/app/api/agent/contas-pagar/route.ts` (campo `saldo`).

## Verificação

- `despesa-status.test.ts` (puro): vencida só antes de hoje; hoje não vence;
  pago/parcial/cancelada têm prioridade; data inválida não vence; cores.
- `contas-pagar-regras.test.ts` (puro): 100 com 80 pagos deve 20; paga = 0;
  centavos exatos.
- `contas-pagar-integridade.test.ts` (Postgres): chave desligada lista a
  despesa de Previsão (como hoje); a prévia é exatamente ela; chave ligada
  lista só a Atual e desligar volta; nada apagado; saldo 100 → 20 após
  pagamento de 80 → 0 após acerto de 20, com status Pago.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

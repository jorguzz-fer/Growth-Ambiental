# Prompt I · PR I-3 — exclusões: só sem vínculo; restituição cancelada em vez de apagada

Terceira PR de código do Prompt I, conforme
[`V2-PROMPT-I-FASE1.md`](./V2-PROMPT-I-FASE1.md). Seções 12 e 24.
**Não muda número de relatório. Nenhum registro gravado é alterado.**
Migração aditiva 0045: quatro colunas de cancelamento em `restituicao`, com
`cancelada = false` para tudo que já existe.

## O que muda

| | Antes | Agora |
|---|---|---|
| **`deleteDespesa`** | `DELETE` com cascata, sem olhar pagamentos, parcelas pagas, acerto, restituição, terceiro, caixa conciliado, nota fiscal ou anexo | recusa com qualquer um desses vínculos, dizendo quais, e aponta para "Cancelar despesa". Só registro sem dependência é apagado |
| **`deleteUnit`** | `window.confirm` e `DELETE`; auditoria guardava só o id; o plano de pagamento ia junto | exige **digitar o código** da unidade; recusa com cliente de contrato ativo, unidade vendida ou permutada, contas a receber, documentos ou permutas; versão congelada bloqueia; auditoria com código, valor, status e obra |
| **`deleteChartItem` / `deleteChartGroup`** | `DELETE` físico; `budget_account.row_key` e `budget_line.row_key` são texto, então os valores ficavam órfãos ("legado") | apagam **só se nenhum Orçamento ou Previsão usa** o código (ou o grupo). Com uso, recusam e apontam para "Inativar", que já existe |
| **`cancelarRestituicao`** | `DELETE` físico da restituição (§24). Sem caller na interface | a linha **fica**, marcada como cancelada, com quem, quando e por quê; o saldo da obrigação volta; o caixa recebe o estorno (ou só a conciliação é desfeita, se a saída veio do extrato). A conta corrente de terceiros e as travas de edição/exclusão da despesa ignoram restituições canceladas |
| **Retorno** | `return` mudo ou erro lançado | `{ ok, error }` nas cinco actions; as três telas mostram a mensagem |

## Detalhes que valem registro

- **`cancelarRestituicao` não tem botão na tela** hoje; a correção vale para
  quem a chamar. A tela de cancelamento é escopo do Prompt T.
- **Restituição cancelada e o estorno em lote (§23):** o lote continua sem
  estorno próprio (não existe hoje). Quando entrar (I-7), lê `cancelada`.
- **Plano de contas:** o "×" continua sendo "excluir", mas só passa quando não
  há uso. O botão "Inativar" segue sendo o caminho normal.

## Arquivos

- novos: `src/lib/unidade-regras.ts`, `src/lib/db/migrations/0045_restituicao_cancelada.sql` (+ `down/`);
- `src/lib/despesa-regras.ts` (`bloqueiosDeExclusaoDespesa`), `src/lib/despesa-vinculos.ts` (nota, anexos; restituição cancelada não conta);
- `src/lib/actions/despesas.ts`, `units.ts`, `planocontas.ts`, `restituicoes.ts`, `src/lib/db/schema.ts`;
- `src/components/app/unit-actions.tsx`, `unit-form.tsx`, `planocontas-manager.tsx`.

## Verificação

- `unidade-regras.test.ts` (puro): motivos de bloqueio, confirmação pelo
  código, "vendida" por status ou data.
- `exclusoes-integridade.test.ts` (Postgres):
  - despesa sem vínculo apaga; com pagamento, recusa e a despesa fica;
  - nota fiscal também trava;
  - unidade: código errado recusa; cliente com contrato ativo recusa;
    distratado libera; auditoria com código, valor e obra;
  - unidade vendida, com conta a receber, com documento, ou em versão
    congelada: recusa;
  - conta do plano usada no Orçamento não é apagada; o grupo dela também não;
    conta livre é;
  - restituição cancelada: marcada, saldo volta, estorno no caixa, some da
    conta corrente, cancelar de novo é recusado.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

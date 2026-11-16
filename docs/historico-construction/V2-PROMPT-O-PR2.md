# Prompt O · PR O-2 — integridade do lançamento e formulário

Segunda PR de código do Prompt O, conforme
[`V2-PROMPT-O-FASE1.md`](./V2-PROMPT-O-FASE1.md). Seções 3 e 3-A. **Sem
migração. Nenhum registro gravado é alterado. Nenhum número muda** (o filtro
de empresa é explícito onde o contexto já garantia).

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **3.1 · validação** | valor > 0, data válida, origem obrigatória; mensagem legível | `motivoDeRecusaDaLiberacao()` em `src/lib/liberacao-regras.ts` (puro): data no formato gravado, origem, valor finito e > 0 (vírgula decimal lida certo; vazio nunca vira `"0"`) |
| **3.2 · retorno legível** | `{ ok, error }` na tela | `addReembolso` devolve `{ ok: true, id } \| { ok: false, error }`: sessão, permissão, obra, versão congelada e lançamento inválido viram mensagem. Formulário cliente (`liberacao-form.tsx`) com `MoneyInput` e `role="status"` |
| **3.3 · auditoria** | com valor, data e origem | `reembolso.create` ganha `origem` (já tinha projeto, versão, valor, data) |
| **3.4 · permissão de ver** | — | já feito (Prompt M) |
| **3.5 · filtro de tenant** | explícito em `getReembolsos` | `getReembolsos(tenantId, versionId)`, ordenado pela data real; dez chamadores passam a empresa (lista, exportação, Resumo ×2, Caixa, Projeção, `budget.ts`, `getMonthlyRevenue`, `getMonthlyRevenueBySource`). Sem efeito observável |
| **3-A.1** · obrigatórios marcados | Data, Origem, Valor | asteriscos + `required` (a validação de verdade é a do servidor) |
| **3-A.2** · placeholder da origem | exemplo real | "Ex.: CEF · medição 03/2026" |
| **3-A.3** · para que serve a data | uma linha abaixo | "Data em que o recurso entrou na conta. É a data que o Fluxo de Caixa usa." |
| **3-A.4** · o que a liberação é | nota no rodapé | "entrada de caixa, não receita: a receita da obra é reconhecida pela venda da unidade" — escrita mesmo antes da §56 em produção, como o prompt pede |
| **3-A.5** · "%" fora | — | já estava fora (BO-2); `pct: null` continua |
| **3-A.6** · retorno no sucesso | confirmação visível | a lista abre com "Liberação lançada." |
| **2.2** · serial íntegro | continua gravado, exportado e reimportado | `excelSerial(data)` continua em `addReembolso`; teste confere `serial = INT(data)` |

## Arquivos

- `src/lib/liberacao-regras.ts` (+ teste, 3 casos) — `motivoDeRecusaDaLiberacao`, `lerValorDaLiberacao`, `statusDaLiberacao`.
- `src/lib/actions/receitas.ts` — `addReembolso`, `ResultadoLiberacao`.
- `src/components/app/liberacao-form.tsx` (novo); `reembolso/novo/page.tsx`; `reembolso/page.tsx` (aviso "Liberação lançada.").
- `src/lib/queries.ts` — `getReembolsos(tenantId, versionId)` e os dez chamadores.
- Testes ajustados: `receitas-projeto-explicito.test.ts`, `ak-parte1.test.ts`. Novo: `src/lib/actions/liberacao.test.ts` (4 casos com banco).

## Verificação

- Testes: recusas com mensagem e nada gravado (testes 4, 4a); sem permissão mensagem, não silêncio (teste 5); gravação com vírgula decimal, serial íntegro (teste 3), status "Recebido", `pct` nulo e auditoria com valor, data e origem (teste 7); filtro de empresa.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): submeter vazio mostra a mensagem do servidor; preenchido grava e a lista abre com "Liberação lançada." (teste 4b). Linha de teste apagada; antes/depois de `reembolso` local 1 / R$ 4.321,00 → idem.

## Fica para depois

- O-3 editar/cancelar (migração 0050); O-4 assistente somente leitura.

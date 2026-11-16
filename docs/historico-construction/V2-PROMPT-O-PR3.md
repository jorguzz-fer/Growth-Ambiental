# Prompt O · PR O-3 — editar e cancelar (estorno, não exclusão)

Terceira PR de código do Prompt O, conforme
[`V2-PROMPT-O-FASE1.md`](./V2-PROMPT-O-FASE1.md). Seção 4. Migração **0050**,
aditiva: quatro colunas com default que preserva o comportamento de hoje.
**Nenhum registro gravado é alterado:** toda liberação existente nasce não
cancelada e continua somando onde somava. Tem `down`.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **4.2 · estorno, não exclusão** | cancelamento lógico no padrão da `despesa`: flag, data, autor, motivo; registro legível; auditoria | `cancelarReembolso(id, motivo)`: motivo obrigatório; grava `cancelado`, `cancelado_em`, `cancelado_por`, `motivo_cancelamento`; recusa já cancelada e versão congelada; auditoria `reembolso.cancel` com valor, data e origem. Permissão **excluir** da tela. Na lista a liberação fica riscada com selo "Cancelada" (data, autor e motivo no título), fora do total e sem ações |
| **4.3 · edição com trava** | valor, data, origem e observações, enquanto não cancelada; valor anterior e novo | `updateReembolso(formData)`: mesma validação do lançamento, recusa cancelada e versão congelada; `serial` acompanha a data (continua indo à planilha); `reembolso.update` com `changes` campo a campo (`diffAudit`), sem linha quando nada muda. Tela `/reembolso/[id]` reaproveita o `LiberacaoForm` em modo edição |
| **4.4 · consultas filtram o cancelado** | `getReembolsos`, `reembursementsByMonth`, `calcTotals` | `getReembolsos` exclui canceladas por padrão — é ela que alimenta Projeção, Consolidado, Resumo, Caixa, exportação, `getMonthlyRevenue` e o orçamento; os dois cálculos deixam de vê-las sem mudar. A lista pede `incluirCanceladas` |
| **Seção 9 · não regressão** | enquanto ninguém cancelar, todos os totais idênticos | teste: antes do primeiro cancelamento, `reembursementsByMonth`, `calcTotals.reemb` e `getMonthlyRevenue` devolvem o de hoje; depois, só a cancelada some |
| **5.3 · status** | sem migrar `"received"` | o status gravado não é tocado pela edição nem pelo cancelamento |

## Migração 0050

`0050_reembolso_cancelamento.sql`: `reembolso.cancelado boolean NOT NULL
DEFAULT false`, `cancelado_em`, `cancelado_por`, `motivo_cancelamento`, tudo
`IF NOT EXISTS`. `down/0050_…sql` remove só as quatro colunas.

## Arquivos

- `src/lib/db/migrations/0050_…sql`, `down/0050_…sql`, `meta/_journal.json`, `schema.ts`.
- `src/lib/queries.ts` — `getReembolsos(tenantId, versionId, { incluirCanceladas })`, `getReembolsoDoTenant`.
- `src/lib/actions/receitas.ts` — `updateReembolso`, `cancelarReembolso`.
- `src/components/app/liberacao-form.tsx` (modo edição), `liberacao-actions.tsx` (novo), `reembolso/[id]/page.tsx` (novo), `reembolso/page.tsx` (coluna Ações, canceladas, contagem).
- `src/lib/actions/liberacao-edicao.test.ts` (novo, 3 casos com banco).

## Verificação

- Testes: edição valida, grava e registra `de`/`para` (teste 8), serial acompanha a data; não regressão dos totais antes do primeiro cancelamento (teste 14); cancelar exige motivo, preserva o registro com autor e motivo (teste 9), tira a liberação de `getReembolsos`, `reembursementsByMonth`, `calcTotals` e da receita mensal (teste 10); status legado intocado (teste 11); versão congelada recusa.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): Editar abre o formulário preenchido e salva com "Liberação lançada."; Cancelar com motivo risca a linha, mostra "Cancelada" e o total cai. Linhas de teste apagadas; antes/depois de `reembolso` local 1 / R$ 4.321,00 → idem.

**Deploy:** a migração 0050 roda no boot do container; é só `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.

## Fica para depois

- O-4 assistente somente leitura (ignora canceladas nas análises).

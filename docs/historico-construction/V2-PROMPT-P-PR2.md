# Prompt P · PR P-2 — editar, cancelar, cliente por id e vínculo de documento

Segunda PR de código do Prompt P, conforme
[`V2-PROMPT-P-FASE1.md`](./V2-PROMPT-P-FASE1.md). Seções 2.1–2.4, 3.3, 3.6 e
6.1 (só a coluna). Migração **0049**, aditiva: colunas anuláveis ou com default
que preserva o comportamento de hoje. **Nenhum registro gravado é alterado:**
todo ativo existente nasce não cancelado; o cliente gravado por nome continua
na coluna de nome; nenhum documento é revinculado. Tem `down`.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **2.2 · edição** | todos os campos, enquanto não cancelado; valor anterior e novo na auditoria | `updatePermuta(formData)`: mesma validação do cadastro (`motivoDeRecusaDoAtivo`), recusa ativo cancelado e versão congelada; `permuta.update` com `changes` campo a campo (`diffAudit`), sem linha quando nada mudou. Tela `/permuta/[id]` reaproveita o `PermutaForm` em modo edição |
| **2.3 · cancelamento lógico** | flag, data, autor, motivo; registro legível | `cancelarPermuta(id, motivo)`: motivo obrigatório; grava `cancelado`, `cancelado_em`, `cancelado_por`, `motivo_cancelamento`; recusa já cancelado e versão congelada; auditoria `permuta.cancel` com o que o ativo tinha. Permissão **excluir** da tela. Na lista o ativo fica riscado, com selo "Cancelado" (data, autor e motivo no título) e sem ações |
| **2.4 · consultas ignoram cancelados** | `getPermutas`, `permutaRevenueByMonth`, `permutaCashByMonth`, `calcTotals` | `getPermutas` exclui cancelados por padrão — é ela que alimenta Resumo, Caixa, Fluxo, DRE e exportação, logo os três cálculos deixam de vê-los sem mudar. A lista da tela usa `getPermutasDaTela` (com cancelados, cliente do cadastro e o selo "no Estoque" de BP-1) |
| **3.3 · auditoria** | nas três actions | `permuta.create` (já havia), `permuta.update`, `permuta.cancel` |
| **3.6 · cliente por id** | gravar o id mantendo a coluna de nome; registros antigos seguem exibindo o nome | coluna `permuta.cliente_id` (FK `cliente`, `SET NULL`). O select manda o id; o servidor confere que o cliente é da empresa e grava **id e nome do cadastro**. Registro só com nome: a tela mostra o nome gravado e o formulário o oferece como "(gravado por nome)" até alguém escolher do cadastro. **Nenhum registro é convertido** |
| **6.1 · coluna** | `document.permuta_id`, anulável, `SET NULL` | criada aqui (com índice); o upload e a lista entram na P-5 |

## Migração 0049

`0049_permuta_cancelamento_cliente_documento.sql`: `permuta.cancelado boolean
NOT NULL DEFAULT false`, `cancelado_em`, `cancelado_por`, `motivo_cancelamento`,
`cliente_id uuid REFERENCES cliente ON DELETE SET NULL` (+ índice);
`document.permuta_id uuid REFERENCES permuta ON DELETE SET NULL` (+ índice).
Tudo `IF NOT EXISTS`. `down/0049_…sql` remove só as colunas novas.

## Arquivos

- `src/lib/db/migrations/0049_…sql`, `down/0049_…sql`, `meta/_journal.json`, `schema.ts`.
- `src/lib/queries.ts` — `getPermutas(tenantId, versionId, { incluirCancelados })`, `getPermutasDaTela`, `getPermutaDoTenant`.
- `src/lib/actions/receitas.ts` — `lerCamposDoAtivo`, `resolverCliente`, `valoresDoAtivo`, `addPermuta` (cliente por id), `updatePermuta`, `cancelarPermuta`.
- `src/components/app/permuta-form.tsx` (modo edição), `permuta-actions.tsx` (novo), `permuta/[id]/page.tsx` (novo), `permuta/page.tsx` (coluna Ações, cancelados, "no Estoque").
- `src/lib/actions/permuta-edicao.test.ts` (novo, 4 casos com banco).

## Verificação

- Testes: cliente por id grava id e nome, id de outra empresa recusado, registro só com nome continua exibindo o nome; edição valida, grava e registra `de`/`para` só do que mudou (sem linha quando nada muda; sem permissão recusa); cancelar exige motivo, preserva valores, grava quem/quando/por quê e tira o ativo de `getPermutas`, de `permutaRevenueByMonth`, `permutaCashByMonth` e `calcTotals.permVend`; versão congelada recusa editar e cancelar.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): editar um ativo e salvar volta à lista com "Ativo gravado."; Cancelar com motivo risca a linha, mostra "Cancelado" e os totais caem. Linhas de teste apagadas depois; antes/depois de `permuta` local 0 → 0.

## Fica para depois

- P-3 ganho da revenda (puro + prévia na tela); P-4 inventário; P-5 documentos (usa a coluna criada aqui); P-6 assistente.

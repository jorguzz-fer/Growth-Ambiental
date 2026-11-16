# Prompt Y · Estoque — Fase 1, inventário antes de escrever código

Prompt Y (23 de 42), `/estoque`. **Só leitura; nada foi alterado.** SQL em
[`sql/v2-prompt-y-diagnostico.sql`](./sql/v2-prompt-y-diagnostico.sql).

## O que o prompt descreve × o que o código tem hoje

O prompt foi escrito sobre uma versão mais antiga da tela. Vários itens já
foram resolvidos por prompts anteriores (AK, M). Confirmado no código:

| Item do prompt | Situação hoje |
|---|---|
| 1 — saldo invertido, `Math.max(0, …)` | **Já corrigido**: `estoque/page.tsx` faz `tipo === "saida" ? -q : q` e não há `Math.max`. Saldo negativo apareceria. Os cards usam o mesmo cálculo |
| 2.1 — nenhuma action insere em `stock_movement` | **Existe** `addStockMovement` (insere, audita `estoque.mov.create`) e o formulário na aba "Entradas & Saídas" (tipo, item, origem/motivo, quantidade, custo, obra, data, doc, despesa/permuta, obs) |
| 2.3 — material vem do cadastro | **Sim**, o select lista os itens com saldo |
| 2.4 — valor a custo | **Parcial**: o custo é **digitado no formulário** (`custoUnit` do form), não lido do cadastro no momento. Precisa gravar o custo do cadastro |
| 2.5 — saída maior que o saldo | **Sem aviso** |
| 2.6 — editar e estornar | **Não existe** (nem `updateStockItem`, nem estorno) |
| 3.2 — vínculo obrigatório na entrada | **Opcional**: `despesaId`/`permutaId` só são enviados quando origem = "Compra"/"Permuta"; o servidor aceita entrada sem nenhum |
| 3.3 — exibir dados da despesa | **Não**: o select mostra só `PED · fornecedor` |
| 3.5 — aviso soma > despesa | **Não** |
| 4.1 — saída exige projeto | **Não**: `projectId` é opcional nos dois tipos (coluna já existe, anulável — **não precisa de migração**) |
| 4.4 / 4.6 — consumo por obra e confronto | **Não existem** |
| 4-A — documentos do movimento | **Não existe** `document.stock_movement_id`; o padrão de anexo com versão por tipo está pronto em `permuta-docs.tsx` / `addPermutaDocs` (Prompt P) |
| 5.1 — validação do cadastro | `addStockItem` **já exige nome**; custo com texto vira 0 e aceita negativo; `unidade` é texto livre com default "un" |
| 5.2 — exclusão apaga movimentos | **Confirmado**: física, cascata, sem confirmação; **já audita** (`estoque.item.delete`, Prompt AK) |
| 5.3 — retorno legível | `addStockItem`/`addStockMovement` lançam `throw`; `deleteStockItem` faz `return` silencioso sem permissão |
| 5.4 — auditoria | Cadastrar, movimentar e excluir auditam; editar/estornar não existem |
| 5.5 — `can(ver)` | **Já tem** (`AccessDenied`) |
| 5.6 — desempenho | Tudo em memória, sem paginação |
| 6 — módulo Obra | **Já está** no módulo Obra do menu; a chave de permissão continua no módulo "Despesas" da matriz (só rótulo) |
| 7 — assistente | **Não existe** |
| 10 — ilha | **Confirmado**: `stock_item`/`stock_movement` só aparecem em `actions/estoque.ts`, `queries.ts`, `schema.ts` e um teste. Nem DRE, Dashboard, relatório ou backup |

## Base local
`stock_item` 0 · `stock_movement` 0 · `document` 0. Como em produção: nada a
preservar na tela; as tabelas referenciadas (`despesa`, `permuta`, `project`,
`document`) têm dado e **não são tocadas**.

## Bloqueios
| | Decisão adotada |
|---|---|
| **BY-1** | Resolvido no prompt: a saída **não realoca custo** — nenhuma despesa, DRE ou lançamento é tocado. A tela passa a dizer isso. O confronto compra × consumo é leitura (4.6) |
| **BY-2** | **Só leitura**: a base local tem 75 despesas sintéticas (nenhum fornecedor ou histórico cita material); a consulta por projeto e a lista de candidatas no projeto "guarda-chuva" estão no SQL para rodar em produção. Não muda a implementação |
| 2.4 (menor) | **Gravar** o custo do cadastro no movimento, no momento do lançamento. Alterar o cadastro depois não reescreve movimentos |
| 4-A.5 (menor) | Limite real: `LIMITE_UPLOAD_MB = 10` por arquivo e `bodySizeLimit = 12mb` por envio (Server Action). Foto de celular passa disso e várias fotos de uma vez estouram o envio. **Decisão: comprimir imagens no navegador antes de enviar** (canvas, lado maior 2000 px, JPEG) — PDF e outros arquivos seguem sem mudança |

## Decisões de modelagem
1. **Vínculo obrigatório na entrada, no servidor**: exatamente um de
   `despesaId` / `permutaId` (regra pura, testada). Saída: `projectId`
   obrigatório. Nenhuma coluna nova para isso.
2. **Custo gravado**: `addStockMovement` lê `custo_unit` do cadastro e grava
   em `stock_movement.custo_unit` (coluna já existe). O campo some do
   formulário.
3. **Estorno = lançamento inverso**: coluna nova `stock_movement.estorno_de_id`
   (aditiva, anulável, `set null`) apontando o movimento original; o original
   fica, marcado na tela; documentos ficam nele (4-A.9).
4. **Inativar item**: coluna nova `stock_item.ativo` (default true).
   `deleteStockItem` recusa item com movimento e oferece inativar; exige
   confirmação; audita nome, SKU e saldo.
5. **Documentos**: `document.stock_movement_id` (aditiva, `set null`), tipos
   "Nota do fornecedor · Romaneio ou canhoto de entrega · Foto do recebimento
   · Requisição de saída · Outros", versão por tipo (como permuta), várias
   imagens por vez com miniatura; remover desfaz vínculo e audita nome/chave.
6. **Unidades**: lista fixa (un, kg, g, t, m, m², m³, L, sc, cx, pç, rolo,
   lata, galão, barra, par, jg) — valores antigos fora da lista continuam
   válidos na leitura.
7. **Saldo na consulta**: `getStockSaldos` (SQL agregando por item) e
   movimentos paginados (50 por página, com filtros); a tela deixa de somar em
   memória.
8. **Assistente (7)**: "propõe, você confirma". 7.1 lê a nota anexada à
   despesa (documentos em `document` com `despesa_id`, lidos do R2) com a
   mesma leitura por IA da despesa, pedindo os **itens** — e propõe uma
   entrada por item; 7.2 item sem cadastro vira proposta de cadastro; 7.3 as
   seis análises em código puro. Nunca grava sem clique.

## Plano de PRs
| PR | Entrega |
|---|---|
| Y-1 | Migração 0060 (`stock_item.ativo`, `stock_movement.estorno_de_id`, `document.stock_movement_id`); regras puras; actions `{ ok, error }` com vínculo obrigatório, projeto na saída, custo do cadastro, avisos (saldo negativo com confirmação, soma > despesa), estorno, editar/inativar item, exclusão segura; saldo e paginação na consulta; formulário atualizado com dados da despesa e aviso "sem efeito contábil" |
| Y-2 | Documentos do movimento (4-A) com compressão de imagem e miniaturas; consumo por obra e confronto compra × consumo (4.4 / 4.6) |
| Y-3 | Assistente (7) e relatório final |

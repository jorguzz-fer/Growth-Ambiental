# Prompt V · PR V-1 — integridade da medição, autoria e fim da promessa da DRE

Seções 1, 2, 4 e a base da 0.5 (autoria). Migração **0064** aditiva com
`down`. Nenhuma medição existente é alterada, movida ou recebe autor.

## O que entrou
1. **Migração 0064** (`medicao_autoria_docs`): `medicao.created_by` (text →
   `user.id`, `ON DELETE set null`) e `document.medicao_id` (uuid → `medicao`,
   `set null`). **Sem backfill** (BV-3): medição anterior fica sem autor.
2. **Versão sempre a Atual (1.2)**: `addMedicao` usa `getAtualVersion` do
   projeto informado — sem fallback para o cookie nem para a versão padrão.
   Projeto sem Atual bloqueia e informa. **1.3**: `updateMedicao` e
   `deleteMedicao` conferem a versão do registro (tenant + projeto da
   empresa) além do id.
3. **Texto da DRE sai (2)**: subtítulo de `/medicaolanc`, docstrings de
   `actions/medicao.ts` e de `schema.ts` (2 lugares). `revalidatePath("/dre")`
   removido das três actions (2.3); elas revalidam `/medicaolanc` e `/medicao`.
   Subtítulo novo: "alimenta o Relatório CEF (orçado × medido); não entra na DRE".
4. **Integridade (4)**: `getMedicoes(tenantId, versionId, { autor? })` filtra
   por tenant (4.2) e traz o autor (join em `user`); as três actions devolvem
   `{ ok, error, aviso }` (4.4) e o formulário (`medicao-form.tsx`) mostra os
   três; `valor > 0` e competência `MM/AAAA` (4.5, puro em
   `medicao-regras.ts`); **duplicidade avisa, não bloqueia** (4.6), no
   lançamento e ao mudar a competência; **excluir exige confirmação** (4.3):
   `window.confirm` na tela e `confirmado = true` na action — sem ele a action
   recusa; auditoria com competência, grupo, nome, valor, obs, versão e autor.
5. **Autoria (0.5)**: `created_by` preenchido dali em diante; o engenheiro
   recebe **da consulta** só as próprias + as sem autor (0.5.2/0.5.3:
   `or(isNull, eq)`); editar/excluir de outro autor é recusado **na action**
   (0.5.5); lista com coluna "Quem lançou" (nome, e-mail ou "autor não
   registrado"), marca de duplicidade (0.4.4) e estado vazio que diz o motivo
   (0.4.5). Sem coluna de orçado (0.5.6). O Relatório CEF lê **sem** recorte
   (0.5.4).

## Verificações
Testes: `medicao-regras.test.ts` (puro) e `actions/medicao-v1.test.ts`
(banco, tenant próprio apagado ao fim):
| # | Caso | |
|---|---|---|
| 11.1 | cookie/padrão em Budget → medição na **Atual**, com `created_by` | ✔ |
| 11.2 | projeto sem Atual bloqueia com mensagem | ✔ |
| 11.3 | editar/excluir: medição de outra empresa ou de projeto fora do contexto → "não encontrada" | ✔ |
| 11.4 / 11.5 | nenhum texto afirma que alimenta a DRE; nenhuma action revalida `/dre` (grep) | ✔ |
| 11.12 | valor 0, negativo, vazio, texto e competência fora do formato recusados | ✔ |
| 11.13 | segunda medição do mesmo grupo/competência grava **com aviso** | ✔ |
| 11.14 | excluir sem confirmação recusa; com, apaga e registra competência, grupo, valor, versão e autor | ✔ |
| 17d/17e | engenheiro recebe da consulta só as próprias + sem autor; admin recebe todas | ✔ |
| 17f | engenheiro não edita/exclui de outro autor (action direta); a sem autor, sim | ✔ |
| 17g/17n | medição sem autor continua visível e **não recebe autor** ao ser editada | ✔ |

Testes antigos ajustados à nova assinatura (`despesas-integridade`,
`planejamento-projeto-explicito`, `ordem-data`). Suíte: 168 arquivos / 1559.
Navegador (local, admin): valor 0 recusado com mensagem; duas medições iguais
→ 2 marcas "duplicidade aparente"; coluna "Quem lançou" = Cliente Piloto Admin; Excluir
cancelado mantém a linha, aceito remove; `/medicao` abre. Medições do teste
apagadas e auditoria limpa; `medicao` local segue com 0 linhas.

## Arquivos
`migrations/0064_medicao_autoria_docs.sql` (+down, journal), `schema.ts`,
`lib/medicao-regras.ts` (+test), `actions/medicao.ts` (+`medicao-v1.test.ts`),
`queries.ts` (`getMedicoes`), `components/app/medicao-form.tsx` (novo),
`medicao-manager.tsx`, páginas `medicaolanc`, `medicao`, `reembolso`,
`reembolso/novo`.

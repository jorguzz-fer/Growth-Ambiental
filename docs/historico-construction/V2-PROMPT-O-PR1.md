# Prompt O · PR O-1 — Parte 1: nomes e limpeza de vestígios de planilha

Primeira PR de código do Prompt O, conforme
[`V2-PROMPT-O-FASE1.md`](./V2-PROMPT-O-FASE1.md). Seções 1, 2 e 5 (opção 1).
**Só apresentação: sem migração, sem efeito em dado nem em cálculo.** Nenhuma
chave, mapa ou fórmula mudou.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **1.1 · nomes** | "Liberações de Obra", "Nova liberação", "Nova liberação de obra", "Salvar liberação" | título da lista "Liberações de Obra"; botão "+ Nova liberação"; cadastro "Nova liberação de obra" (o botão já era "Salvar liberação"); `PedirProjeto` idem; rótulo da permissão "Liberações de Obra" (o `id` `reembolso` continua, de propósito); mensagem de sem permissão fala em liberações |
| **1.3 · rótulos de exibição** | Projeção, Consolidado, Resumo e Caixa acompanham como texto | Resumo: "Reembolso (aba própria)" → "Liberações de Obra" (2×); Consolidado: linha "Reembolso" → "Liberações de Obra" (2×) e subtítulo "Liberações de Obra incluídas no TOTAL"; Projeção: 4 rótulos; Versão: contagem "Liberações de Obra". **Intocados:** rota `/reembolso`, tabela, `addReembolso`, `calcTotals.reemb`, `rowKey "Reembolso"` das `budget_line` (chave gravada), a aba "Reembolso" da planilha de exportação/importação, `permissions.id`. O menu já dizia "Liberações de Obra" (Prompt C) |
| **2.1 · aviso SUMIFS** | sai | a faixa "A data deve ser uma DATA REAL… SUMIFS…" saiu da lista |
| **2.2 · coluna Serial** | sai da listagem; `serial` fica no banco e no trânsito da planilha | coluna removida. `excelSerial` continua gravando em `addReembolso`; exportação (`versao/export`, `growth-template`) e importação (`version-io`) não foram tocadas |
| **2.3 · subtítulos** | vocabulário de planilha sai; descrever a tela | lista: "Parcelas do financiamento da obra liberadas pela instituição financeira após a medição. Entrada de caixa, não receita."; cadastro: "Parcela do financiamento liberada após a medição. Entrada de caixa, não receita." |
| **2.4 · exibir subtítulo e eyebrow** | — | já feito (J-1); por isso o subtítulo antigo estava aparecendo |
| **5.2 · status (opção 1)** | coluna sai da listagem; coluna do banco fica | coluna "Status" removida (era sempre "✓ Recebido", inclusive nulo). O normalizador de `"received"` foi para `src/lib/liberacao-regras.ts` (`statusDaLiberacao`), sem migrar nada |

## Arquivos

- `src/app/(app)/reembolso/page.tsx`, `src/app/(app)/reembolso/novo/page.tsx`.
- `src/lib/permissions.ts` (só o `label`), `src/app/(app)/resumo/page.tsx`, `consolidado/page.tsx`, `projecao/page.tsx`, `versao/page.tsx` (só texto).
- `src/lib/liberacao-regras.ts` (novo; cresce na O-2).

## Verificação

- Suíte completa, `tsc`, `eslint`, `next build`: verdes. Nenhum teste muda (nenhum testava os rótulos).
- No navegador (local): lista com título "Liberações de Obra", sem a faixa SUMIFS, sem as colunas Serial e Status; cadastro "Nova liberação de obra".
- Antes/depois de `reembolso`: nada gravado por esta PR (local: 1 lançamento, R$ 4.321,00, antes e depois).

## Fica para depois

- O-2 integridade (validação, `{ ok, error }`, tenant em `getReembolsos`, formulário 3-A); O-3 editar/cancelar (migração 0050); O-4 assistente somente leitura.

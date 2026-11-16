# Prompt H · Rascunho não entra em relatório — Fase 1, inventário

Prompt H (28 de 42). Regra que atravessa as telas de relatório. **Muda número
em produção** quando ligada — por isso nasce atrás de uma chave por empresa,
desligada. **Só leitura nesta fase; nada foi alterado.** SQL em
[`sql/v2-prompt-h-diagnostico.sql`](./sql/v2-prompt-h-diagnostico.sql).

## BH-1 · versões por tipo e situação (antes de qualquer código)
Base local: `budget` Rascunho 1 · `forecast` Rascunho 1 · `atual` Rascunho 3.
**Nenhuma versão Aprovada.** Produção: rodar o primeiro relatório do SQL —
a expectativa é a mesma (o default é "Rascunho" e ninguém precisou aprovar).
Conclusão: a regra **não pode** nascer ligada (seção 5).

## O que existe hoje (confirmado no código)
- **Chave por empresa**: mecanismo pronto (B4): catálogo em `src/lib/chaves.ts`,
  leitura `chaveLigada(tenantId, id)` (uma consulta por requisição), tela
  **Configurações → Chaves de mudança** (`/chaves`) com prévia obrigatória
  para ligar e auditoria `chave.ligar/desligar`. Sem linha = desligada.
- **Situação**: `version.status` (`Rascunho` default, `Concluído`,
  `Aprovado`); **nenhuma consulta filtra por ela**; `locked` é outra coluna,
  mudada só em `/versao`. A troca de situação na tela de Orçamentos/Previsão
  engole erro (BG-13, fora de escopo).
- **Quem lê `budget_line` (4.1)** e quem chama:
  | Função (`queries.ts`) | Chamadores |
  |---|---|
  | `getMonthlyRevenue(versionId, projectId)` | `/resumo`, `/contabilidade`, `/projecao`, `/dashboard`, `dre-inputs.ts` (DRE e o card Orçado x Realizado de Projetos), `fluxo-caixa.ts` (`/fluxocaixa`) |
  | `getExpenseRows(versionId)` | `dre-inputs.ts`, `fluxo-caixa.ts` |
  | `getRevenueBySource(versionId, projectId)` | `/consolidado`, `/projecao` |
  | `getBudgetLines(versionId)` | `/medicao` (orçado do CEF), `/lancamento/export` (exportação da própria versão — **não é relatório**), `dre-inputs.ts` (card de Projetos: "tem orçamento?") |
  | `getBudgetPlanning`, `getForecastComparison`, `getReceitaByProject`, `getDespesaLinhas` | telas de edição (`/budget`, `/forecast`, `/lancamento`) — **não filtram** |
  | `getInventarioDoProjeto`, `getStatusProjeto`, `getStockMovements` | contagens/outros — sem valor de relatório |
  Nas quatro primeiras o ramo de `budget`/`forecast` já é separado do ramo
  `atual` por `kind` — o filtro entra **só nesse ramo**, de forma explícita.
- **Seletor de versões** (`VersionMultiSelect`): Caixa, Consolidado,
  Dashboard, DRE, Fluxo de Caixa, Projeção e Resumo. Caixa não está na lista
  de telas que filtram (lê movimento).
- **Telas que filtram** (seção 2): `/dre`, `/fluxocaixa`, `/dashboard`,
  `/consolidado`, `/projecao`, `/resumo`, `/medicao`, `/contabilidade` — todas
  chegam ao orçado pelas quatro funções acima. **Não filtram**: `/budget`,
  `/forecast`, e tudo que lê movimento.

## Bloqueios — decisões adotadas
| | Decisão |
|---|---|
| **BH-1** | Contagem acima; **a chave nasce desligada** e nenhuma versão muda de situação (5.4). |
| **BH-2** | **Confirmado por escrito**: o filtro vale **só** para `kind` `budget` e `forecast`. A versão `atual` **nunca** é filtrada, em nenhuma tela — garantido no código porque o filtro vive dentro do ramo `if (kind === "budget" \|\| kind === "forecast")` das quatro funções, e o ramo `atual` não o vê; teste com banco cobre "atual em Rascunho continua inteira". |
| **BH-3** | **Opção 2**: a versão em Rascunho continua no seletor, marcada **"Rascunho — não entra nos totais"** (selo), selecionável com aviso. Com a chave desligada nada muda no seletor. |
| **BH-4** | Sem permissão nova nesta entrega: aprovar/voltar a Rascunho continua pela permissão `editar` da tela, como hoje; com a chave ligada a tela diz o efeito ("aprovar faz entrar nos relatórios; voltar a Rascunho tira") e cada troca já vai à Auditoria (`version.status`). Voltar é permitido. Permissão própria fica como pergunta ao usuário. |
| **"Concluído"** (BF-2) | Etapa intermediária: **não entra** nos relatórios (só `Aprovado` entra). |

## Como vai ser feito (uma PR de código)
1. **Chave** `rascunho_fora_dos_relatorios` no catálogo, com prévia na
   própria tela de Chaves: a **lista de conferência (5.3)** — toda versão de
   planejamento não Aprovada, com projeto, nome, tipo, situação, total de
   receitas e de despesas (o que sairia dos relatórios).
2. **Filtro explícito** (4.2): uma função nomeada
   `planejamentoForaDosRelatorios(versionId)` (kind + status + chave do
   tenant), chamada **no ramo budget/forecast** de `getMonthlyRevenue`,
   `getExpenseRows`, `getRevenueBySource` e, por **parâmetro explícito**
   `{ respeitarSituacao }`, em `getBudgetLines` (ligado só em `/medicao`;
   `/lancamento/export` e a leitura do card de Projetos passam `false`,
   pois exportar e "existe orçamento?" não são relatório) — nada é duplicado
   (4.3). Nenhuma consulta de movimento é tocada (4.4).
3. **Seletor** (BH-3) com o selo; **telas de Orçamentos e Previsão** (5.2)
   avisam nas versões não Aprovadas: chave desligada → "quando a regra for
   ligada, esta versão deixará de aparecer nos relatórios"; ligada → "esta
   versão não entra nos relatórios até ser Aprovada".
4. **Testes** (seção 8): chave desligada = mesmos números; ligada: orçado some
   e volta ao aprovar; `atual` em Rascunho inalterada; movimento inalterado;
   nenhuma versão muda de situação.
5. Sem migração: a chave usa `tenant_flag` (0043) que já existe.

## Perguntas ao usuário (não bloqueiam)
1. **BH-4**: quer permissão própria para aprovar? Hoje é `editar` da tela.
2. Ligar a chave é decisão sua, por empresa, depois de conferir a lista (5.5).

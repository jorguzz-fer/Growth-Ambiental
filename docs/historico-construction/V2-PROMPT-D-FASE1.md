# Prompt D · Orçamentos — Fase 1, inventário antes de escrever código

Prompt D (26 de 42). `/budget` (Orçamentos) e `/forecast` (Previsão
Atualizada), que compartilham `budget-planning-screen.tsx`. **Só leitura; nada
foi alterado.** SQL em [`sql/v2-prompt-d-diagnostico.sql`](./sql/v2-prompt-d-diagnostico.sql).

## O que existe hoje (confirmado no código)
- **Grade** (`getBudgetPlanning`): as linhas são os **grupos ativos** do Plano
  de Contas, separados por natureza (grupo é receita se **um** subitem for
  receita). **Se nenhum grupo for receita, todos os grupos ativos viram linhas
  de receita** (fallback) — é por isso que "Financeiro / Contábil" (e todos os
  outros) aparecem no bloco de receitas. Linhas com dado em `budget_account`
  sem grupo ativo correspondente aparecem com o selo **legado** (ex.: a chave
  `"Receita"` do lançamento simplificado antigo).
- **Gravação** (`saveBudgetPlanning`): **apaga e reinsere** todo o bloco da
  versão; descarta conta zerada; log `{ bloco, contas: N }` sem valores. É a
  pré-condição do prompt (BG-11). Também: `throw` em vez de `{ ok, error }`
  (BG-12, fora de escopo), total do Forecast somente-leitura
  (`totalReadOnly = kind === "forecast"`), barra do Forecast própria (criar a
  partir do Budget, duplicar, comparar), importação/exportação de planilha
  por bloco (atualiza só linhas existentes na grade).
- **Período**: `start_date`/`end_date` → `projectPeriodMonths` (função
  compartilhada de `planning.ts`; escritório = ano atual + 5). Badge diz
  "N meses". Estado vazio manda preencher "Mês inicial/Mês final" (BG-16, fora
  de escopo — fica como está e vai no relatório).
- **Textos** literais em `budget-planning-screen.tsx`: "Lançamento Budget" /
  "Lançamento Forecast", "Novo Forecast a partir do Budget", "Nome do
  Forecast", "Comparar com Budget". O **menu já diz** "Orçamentos" e "Previsão
  Atualizada" (Prompt C) — a tela está atrasada em relação ao menu (2.2).
- **Indicadores** do topo: Receitas, Despesas, Resultado (soma dos totais por
  conta) e Recursos próprios (`project.recursos_proprios`). Ficam (7.1).
- **Replicação** (`replicateFromAtual`): grava `budget_line` já corrigido pelo
  INCC e registra `budget.replicateFromAtual` no log — a data existe no
  `audit_log`, dá para exibir (2.6) sem gravar nada novo.
- **`BudgetMatrix`** (`budget-matrix.tsx`) não é usado por nenhuma página —
  componente morto; não é tocado (fora de escopo).
- **Base local**: 19 grupos (10 CEF, 9 complementares), **nenhum** subitem de
  natureza receita, **0** `budget_account`, **0** `budget_line`; 1 versão
  budget e 1 forecast (EMPREENDIMENTO PILOTO). Produção (várias obras, linha legada
  "Receita" com valores): rodar o SQL — relatórios A–F dão a linha de base
  do teste 8.9 (contagens e somas por versão).

## Pré-condição e bloqueios — decisões adotadas
| | Decisão |
|---|---|
| **Pré-condição (BG-11)** | **Saída 1: salvamento não destrutivo.** `saveBudgetPlanning` passa a apagar/reinserir **só as chaves que vieram no formulário**; chave ausente fica intacta. Remover linha vira **ação explícita** (4-A.3), com confirmação e log do que saiu. Nenhuma outra via. |
| **BD-1** | **Opção 1**: o total de "Receitas do Projeto" = **entrada financeira da construtora** (regra que a tela de Projetos já mostra): `valor_construcao` quando `terreno_fora_caixa` está marcado; `valor_construcao + valor_terreno` quando o terreno passa pelo caixa. Fiel ao caixa; o Fluxo previsto não herda receita que não entra. |
| **BD-2** | **Opção 1**: a linha legada "Receita" **continua visível**, com selo, ao lado da nova, até decisão humana obra a obra. Com BG-11, salvar o bloco não a apaga. Migração automática: proibida, não feita. |
| **BD-3** | **Opção 1**: assistente **somente leitura** (revisar, analisar distribuição, comparar Orçamento × Previsão, explicar desvios). "Construir por texto ou voz" fica fora. |
| **BD-4** | **Opção 1**: duas rotas; alternador `Orçamentos | Previsão Atualizada` que navega preservando `?proj=`. |
| **BD-5** | **"Receitas do Projeto" é linha fixa do sistema** (chave própria em código, `dreCategory` "Receita"): o total vem do cadastro, ninguém lança despesa nela, não é conta do Plano de Contas — e por isso o bloco de receitas nunca fica vazio, o que permite **remover o fallback** "todos os grupos viram receita". **"Outras Receitas" é grupo do Plano de Contas** (natureza receita) e **não existe** na base local; em produção o SQL (relatório D) diz. Enquanto não existir, a grade mostra a linha fixa + legadas e um aviso com link para o Plano de Contas. Criá-lo é cadastro, não código. |
| **BD-6** | **Opção 2**: tabela nova **`budget_selecao`** (`version_id`, `kind`, `row_key`, ordem), aditiva (migração 0063, com `down`). Sem linha para (versão, bloco) = **padrão** (grupos ativos da natureza + legadas com dado), exatamente como hoje. A primeira inclusão/exclusão materializa o padrão daquele momento e aplica a mudança. Linha incluída entra na seleção, zerada, sem gravar `budget_account`. |
| **BD-7** | **Opção 1**: a Previsão **herda** a seleção do Orçamento de origem (copiada na criação/duplicação, como os totais) e não a edita; a tela diz isso. Previsão sem seleção gravada = padrão. |
| **Seção 5** | É **cadastro**: desmarcar a subconta de receita de "Financeiro / Contábil" e colocá-la em "Outras Receitas" no Plano de Contas (produção). Com a linha fixa, a ordem deixa de ser arriscada: o bloco de receitas nunca fica vazio. Na base local nada é receita. |

## Plano de PRs
| PR | Conteúdo |
|---|---|
| Fase 1 (este) | inventário + SQL |
| D-1 | migração 0063 (`budget_selecao`); `saveBudgetPlanning` não destrutivo (BG-11) e gravando o total de "Receitas do Projeto" derivado do cadastro; linha fixa `RECEITAS_PROJETO_KEY` em `budget/config.ts`; fim do fallback; seleção na leitura (`getBudgetPlanning`); actions `incluirLinhaDoOrcamento`/`removerLinhaDoOrcamento` (`{ ok, error }`, permissão da tela, log com conta/total/competências); cópia da seleção ao criar/duplicar Previsão; regras puras + testes |
| D-2 | tela: títulos e textos (2.1–2.5), badge "competências", alternador, célula somente-leitura com link para o cadastro e estado "falta preencher" (3.3–3.5), nota do valor replicado (2.6), incluir/excluir linha com confirmação (4-A), Previsão com nota de herança |
| D-3 | assistente somente leitura (6.1–6.6) + relatório final (seção 11) |

## O que não muda (seções 9 e 10)
BG-10, 12–21 não são tocados. Rotas, chaves (`budget`, `forecast`, `Receita`),
`budget_line`/`budget_account` existentes, regras de valor mensal e soma de
percentuais, indicadores, exportar/importar, DRE, Fluxo, Consolidado.

## Perguntas ao usuário (não bloqueiam; adotada a opção não destrutiva)
1. **BD-1**: adotei "entrada financeira" (construção, mais terreno só quando
   passa pelo caixa). Se preferir o valor global sempre, é uma linha de código.
2. **BD-5**: "Receitas do Projeto" como linha fixa (não é grupo do plano) e
   "Outras Receitas" como grupo a cadastrar. Concorda?
3. **Seção 5** (produção): quando criar "Outras Receitas" e mover a subconta
   de "Financeiro / Contábil", me avise para eu conferir com o SQL.

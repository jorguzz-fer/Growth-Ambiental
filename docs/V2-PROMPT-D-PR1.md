# Prompt D · PR D-1 — gravação não destrutiva, linha fixa, seleção de linhas

Base de dados e regras da grade de Orçamentos. Nenhum `budget_account` ou
`budget_line` existente é alterado por esta PR; o que muda é o que a gravação
e a leitura fazem daqui para a frente.

## Pré-condição BG-11 — salvamento não destrutivo
`saveBudgetPlanning` passa a substituir **só as chaves que vieram no
formulário** (delete + insert por chave, na transação). Linha ausente — a
legada "Receita", um grupo fora da seleção — fica intacta. Conta enviada
zerada é apagada (o usuário a zerou). O log ganha `chaves: [...]`. Teste: salvar
receitas sem mandar a legada mantém o valor dela intacto (cenário do prompt).

## BD-1 / 3.1 — "Receitas do Projeto"
Linha **fixa** (`RECEITAS_PROJETO_KEY`, chave própria, diferente da legada
"Receita"), sempre a primeira do bloco de receitas. O total é calculado **no
servidor** a partir do cadastro (`totalReceitasDoProjeto` = entrada
financeira da construtora: `valor_construcao`, mais `valor_terreno` só quando
o terreno passa pelo caixa) e gravado em `budget_account.total`; o que o
cliente mandar nessa linha é ignorado. Cadastro sem valor → `null`
(`semTotalNoCadastro`), nunca R$ 0,00 na tela (D-2). A distribuição mensal
continua do usuário.

## BD-5 — fim do fallback
Como o bloco de receitas nunca fica vazio, o fallback "sem grupo de receita,
todos os grupos viram receita" **saiu**. Receitas = fixa + grupos de natureza
receita (ex.: "Outras Receitas", quando cadastrado) + legadas. Nenhum grupo
aparece nos dois blocos.

## BD-6 — seleção de linhas (`budget_selecao`, migração 0063)
Tabela aditiva (`version_id`, `kind`, `row_key`, `ordem`), com `down`. Sem
registro = **padrão** (todos os grupos ativos da natureza), igual a hoje. A
primeira inclusão/exclusão materializa o padrão e aplica a mudança. Linha
com dado gravado **sempre aparece** (legada ou fora da seleção), com selo.
- `incluirLinhaDoOrcamento(versionId, bloco, rowKey)`: grupo ativo, da
  natureza, ausente da grade; entra zerado (nada em `budget_account`); log
  `budget.linha.incluir`. Não cria grupo.
- `removerLinhaDoOrcamento(versionId, bloco, rowKey, confirmado)`: recusa a
  fixa e as legadas (4-A.4); com valor exige `confirmado`; apaga a seleção, o
  `budget_account` e as `budget_line` da chave; log `budget.linha.remover`
  com conta, total, competências e meses.
- Ambas: permissão `budget:editar` no servidor, versão não congelada,
  `{ ok, error }`.

## BD-7 — Previsão herda
`copyPlanningData` copia também `budget_selecao` ao criar/duplicar uma
Previsão; incluir/remover numa Previsão é recusado com a explicação.

## Arquivos
`0063_budget_selecao.sql` (+down), `schema.ts` (`budgetSelecoes`),
`budget/config.ts` (chave fixa), `planning.ts` (tipos `fixa`,
`semTotalNoCadastro`, `receitaDoCadastro`, `selecao`), `orcamento-regras.ts`
(puro: total do cadastro, linhas do bloco, lista de inclusão, recusas, resumo
da remoção), `queries.ts` (`getBudgetPlanning` usa o módulo puro e lê a
seleção), `actions/planning.ts`.

## Testes
`orcamento-regras.test.ts` (11) e `actions/orcamento-linhas.test.ts` (8, com
banco: grade padrão, BG-11, total da fixa do cadastro, zerada apagada e
ausente mantida, remoção com confirmação e log, inclusão e recusas, Previsão
herda e recusa, sem permissão). Suíte 159 / 1508; `tsc`, `eslint`, `next
build`.

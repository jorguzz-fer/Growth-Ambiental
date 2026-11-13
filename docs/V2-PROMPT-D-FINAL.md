# Prompt D · Orçamentos — relatório final (seção 11)

Entregue em 4 PRs: Fase 1 (#201), D-1 (#202), D-2 (#203), D-3. Linha de base
do teste 8.9 em `docs/sql/v2-prompt-d-diagnostico.sql` (relatório C).

1. **Arquivos e componentes**: `budget-planning-screen.tsx` (títulos,
   alternador, badge, célula fixa, incluir/remover, nota de replicação),
   `budget-forecast-compare.tsx` (rótulos), `budget/page.tsx`,
   `forecast/page.tsx`, `actions/planning.ts` (gravação não destrutiva,
   total da fixa, incluir/remover, cópia da seleção), `queries.ts`
   (`getBudgetPlanning`), `planning.ts` (tipos), `budget/config.ts` (chave
   fixa), `schema.ts` (`budgetSelecoes`); novos `orcamento-regras.ts`,
   `orcamento-analise.ts`, `assistente-orcamento.tsx`, migração 0063, testes e
   docs (`V2-PROMPT-D-FASE1/PR1/PR2/PR3/FINAL.md`, SQL).
2. **Total de "Receitas do Projeto"**: calculado no servidor por
   `totalReceitasDoProjeto` = entrada financeira da construtora:
   `valor_construcao` quando `terreno_fora_caixa` está marcado;
   `valor_construcao + valor_terreno` quando o terreno passa pelo caixa.
   Cadastro sem valor → `null` → célula "falta preencher o cadastro".
   Continua gravado em `budget_account.total` ao salvar.
3. **"Outras Receitas"**: é um **grupo do Plano de Contas** de natureza
   receita; a grade o mostra quando existe. **Não existia** na base local
   (nem como `budget_account`); em produção, conferir com o relatório B/D do
   SQL antes de criá-lo na tela de Plano de Contas. Nenhuma chave fixa em
   código para ele.
4. **"Financeiro / Contábil"**: sai do bloco de receitas por **cadastro**
   (desmarcar a subconta de receita no Plano de Contas e colocá-la em
   "Outras Receitas"). Com a linha fixa, o bloco de receitas nunca fica
   vazio, então a ordem deixou de ser arriscada; o fallback "todos os grupos
   viram receita" foi removido do código. Na base local nenhum grupo é
   receita.
5. **Linha legada "Receita"**: **continua visível** com o selo "legado"
   (BD-2, opção 1), não removível pela ação, intacta no banco. Teste com
   banco: salvar o bloco de receitas sem mandar a legada mantém o
   valor dela intacto. Nenhum valor apagado.
6. **BG-11**: **implementada**. `saveBudgetPlanning` apaga/reinsere só as
   chaves enviadas (`inArray`), por bloco, na transação; o log traz as chaves.
7. **Assistente**: somente leitura (BD-3), 4 funções, análise pura no
   servidor, sem action — confirmado por construção e pelo teste.
8. **Antes/depois de `budget_account` e `budget_line`**: na base local, 0 e 0
   antes e depois (as PRs não tocam dados; o único teste com dados criou e
   apagou seu próprio tenant). Em produção: rodar o relatório C do SQL antes
   e depois do deploy; a única diferença esperada é zero — a linha fixa só
   ganha `budget_account` quando o usuário salvar receitas.
9. **BD-1 a BD-7**: BD-1 opção 1 (entrada financeira); BD-2 opção 1 (legada
   visível); BD-3 opção 1 (somente leitura); BD-4 opção 1 (duas rotas,
   alternador navega); BD-5 linha fixa + grupo "Outras Receitas" a cadastrar;
   BD-6 opção 2 (`budget_selecao`); BD-7 opção 1 (herdada, copiada na
   criação/duplicação, não editável na Previsão).
10. **Seleção de linhas**: `budget_selecao` (`version_id`, `kind`, `row_key`,
    `ordem`). Projeto/versão **sem seleção** continua mostrando os grupos
    padrão (ativos da natureza) — idêntico ao comportamento anterior, exceto
    pelo fim do fallback de receita (item 4). A primeira inclusão/exclusão
    materializa o padrão. Linha com dado sempre aparece.
11. **Seção 9**: BG-10, 12–21 **não foram tocados**. Observação: o estado
    vazio de período ainda diz "Mês inicial/Mês final" (BG-16), como manda a
    lista; e as actions antigas de salvar/criar/duplicar seguem com `throw`
    (BG-12) — só as duas actions novas devolvem `{ ok, error }`.
12. **Migrações**: `0063_budget_selecao.sql` com `down/0063_budget_selecao.sql`.
13. **Limitações**: "Outras Receitas" só aparece depois de cadastrada;
    produção com linha legada "Receita" verá três linhas de receita até a
    decisão obra a obra; o assistente não lê o Atual (só Orçamento ×
    Previsão); replicação do Atual continua gravando a chave legada
    "Receita" (não foi alterada — fora do escopo), e a data da última
    replicação é exibida.

## Perguntas em aberto (não bloqueiam)
1. BD-1: entrada financeira (adotado) ou valor global sempre?
2. Quando criar "Outras Receitas" e mover a subconta de "Financeiro /
   Contábil" em produção, avise para conferir com o SQL.

## Produção
Aplicar as migrações pendentes em ordem (0046 → 0063). Rodar o relatório C
do SQL antes e depois.

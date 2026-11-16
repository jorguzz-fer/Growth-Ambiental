# Prompt F · Previsão Atualizada — relatório final (seção 12)

Entregue em 3 PRs: Fase 1 (#205), F-1 (#206), F-2. Linha de base do teste
11.14 em `docs/historico-construction/sql/v2-prompt-f-diagnostico.sql` (relatório C).

1. **Arquivos e componentes**: `budget-planning-screen.tsx` (seletor com
   origem e data, barra da Previsão com nome obrigatório e resultados,
   célula herdada com origem e divergência, importação sem total, selo da
   trava, comparação na moldura), `budget-forecast-compare.tsx` (reescrito),
   `assistente-orcamento.tsx` (reprojeção), `forecast/page.tsx`,
   `actions/planning.ts` (criar/duplicar), `queries.ts` (`getBudgetPlanning`
   e `getForecastComparison`), `planning.ts` (tipos), `orcamento-analise.ts`;
   novos `previsao-regras.ts`, `previsao-reprojecao.ts`,
   `actions/previsao-assistente.ts`, testes e docs.
2. **Divergências entre o código lido e o prompt**: nenhuma de fato — os três
   fatos (nada filtra por `status`, aprovar não trava, três situações) e os
   quatro achados da comparação foram confirmados. Um detalhe: o mês a mês
   que a consulta calculava somava receitas **e** despesas; passou a ser o
   resultado (receitas − despesas), que é o que faz sentido comparar.
3. **BF-1** opção 1 ("Receitas do Projeto" pelo cadastro nas duas telas;
   demais totais herdados com origem declarada e divergência visível);
   **BF-2** opção 2 (situação documental, trava como indicador, "Concluído"
   = etapa intermediária); **BF-3** opção 1 (importação ignora o total);
   **BF-4** = BD-7 (herdada).
4. **Total de receitas da previsão**: a linha fixa lê `project.valor_construcao`
   (+ `valor_terreno` quando o terreno passa pelo caixa) no servidor; os
   outros totais são o retrato copiado na criação, com "herdado em
   DD/MM/AAAA" na célula e "Orçamento hoje: R$ X" quando diverge.
5. **`version.locked`**: continua gravado **só** por `toggleVersionLock`
   (`/versao`). "Aprovado" **não passou a travar**: é situação documental,
   dita na tela ("situação não bloqueia a edição"), com o selo "travada /
   não travada" ao lado.
6. **Identificação**: nome dado na criação (obrigatório daqui em diante),
   ordem da mais recente, "Base: Orçamento “X” · criada em DD/MM/AAAA" via
   `source_version_id` + `created_at`. **Cadeia de origem**: pôde ser exibida
   na primeira geração; para previsão **duplicada** a base exibida é o
   Orçamento (BG-20, fora de escopo) — informado, não contornado.
7. **Comparação**: lê `budget_account.total` e `budget_line.pct/valor` das
   duas versões via `getBudgetPlanning` (tenant filtrado); regime
   **competência**, declarado no cabeçalho; sem fallback de origem; ausente
   ≠ zero; mês a mês do resultado; cor por bloco.
8. **Assistente**: análises puras no servidor; em Previsão **propõe** a
   reprojeção e **não grava** — a revisão nova nasce só com o clique do
   usuário, pelo `duplicateForecast` + `saveBudgetPlanning`, com log de
   origem "assistente". Teste com banco confirma que propor não escreve.
9. **Antes/depois de `version`, `budget_account` e `budget_line`**: na base
   local, nenhuma diferença (as PRs não tocam dados; os testes criam e
   apagam seus tenants; as obras de teste do navegador foram excluídas).
   Em produção: rodar o relatório C do SQL antes e depois.
10. **Seção 9**: BG-10, 11, 13–18, 20 e FC-13 **não tocados**. BG-12 só nas
    duas actions de criar/duplicar (exigido pela 3.4); salvar e situação
    seguem com `throw` / silêncio.
11. **Migrações**: nenhuma nesta frente.
12. **Limitações**: a reprojeção "partir do realizado" só reprojeta
    **despesas** (receita realizada não vem de despesa); com estouro de 100%
    a revisão não é criada (o total é herdado — ajuste no Orçamento); o
    limite de 12 permanece (só aviso perto do teto); a base de uma previsão
    duplicada aparece como o Orçamento (BG-20).

## Perguntas em aberto (não bloqueiam)
1. "Aprovado" deve passar a travar? (hoje não; decisão própria.)
2. "Concluído" = etapa intermediária — confirma para o Prompt H?
3. Subir o limite de 12 previsões?

## Produção
Nenhuma migração nova; as pendentes (0046 → 0063) continuam.

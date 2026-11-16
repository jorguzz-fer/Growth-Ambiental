# Prompt AE2 · Resumo Executivo: indicadores selecionáveis — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Revisão de 14/10: "Resumo
Executivo mantido, com indicadores de negócio selecionáveis (custo/m², VGV
vendido)".

## O que mudou

- **Painel "Indicadores de negócio"** no topo do Resumo, na obra e no
  consolidado. A pessoa marca o que quer ver entre onze indicadores, cada um
  com a definição escrita na linha:
  - VGV, VGV vendido, % do VGV vendido e unidades vendidas;
  - preço médio vendido por m² e VGV por m²;
  - custo realizado, custo realizado por m², custo orçado por m², desvio de
    custo e margem orçada.
- **A escolha fica no endereço** (`?ind=`). O link e o PDF levam os mesmos
  indicadores. Sem escolha, abrem VGV, VGV vendido, % vendido e custo por m².
- **No consolidado**, há uma coluna por obra e o Total.
- **Sem dado, o motivo em vez de zero:** "sem área construída no cadastro",
  "sem Orçamento", "nenhuma vendida", "unidades sem m²".
- **Exportar PDF** no Resumo, com a faixa da empresa.

## Premissas

- **BAE2-1** (área construída no cadastro?): o banco já tinha a coluna de
  metragem, usada no custo referencial (CUB × metragem), mas nenhuma tela a
  editava. O cadastro do projeto ganhou o campo **Área construída (m²)**, em
  "Custos do projeto". O custo por m² usa esse campo. Nenhuma migração.
- Os indicadores são da versão Atual, a do contratado.
- O custo é o mesmo do comparativo do Resumo: Custo Variável + Custo Fixo
  da DRE. O realizado e o desvio vão até o mês corrente. O custo orçado por
  m² e a margem usam o Orçamento no horizonte todo.
- No Total, o custo por m² divide só o custo das obras que têm área
  construída, para não dividir o custo de uma obra pela área de outra.
- O preço por m² usa só as unidades com m², no valor e na área.

## Acesso

- Os indicadores de custo só aparecem para quem vê Despesas, a mesma regra
  do comparativo de custo do Resumo.
- Nada ampliado. A escolha não é gravada no banco.

## Testes

- `src/lib/actions/projetos-b.test.ts`: a área construída grava, vazia volta
  a "não informada", e zero é recusado.
- `src/lib/indicadores-negocio.test.ts` (novo): cada indicador, o motivo sem
  dado, o Total com o custo por m² só das obras com área, e a escolha sem
  acesso ao custo.
- e2e: o painel no Resumo consolidado, os quatro padrão, marcar um indicador
  levando-o à tabela e ao link, e o PDF.

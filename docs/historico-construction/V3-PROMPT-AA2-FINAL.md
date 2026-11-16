# Prompt AA2 · Dashboard: gráficos e PDF — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Usa o Exportar PDF do prompt
PDF.

## O que mudou

- **Fluxo de caixa em linhas.** Entradas e saídas previstas por mês, pelo
  vencimento, da versão Atual das obras da tela. Os números são os do Fluxo
  de Caixa, pela mesma função e a mesma chave.
- **DRE em barras empilhadas.** Em cada mês, uma barra com Custo Variável,
  Despesa Variável, Custo Fixo, Despesa Fixa, os demais itens (retiradas,
  investimentos, empréstimos e despesas financeiras) e o Resultado. As partes
  somam a receita do mês. Com prejuízo, o Resultado fica abaixo do zero. Os
  números são os da DRE, pela mesma cascata e a mesma chave.
- **Por projeto ou empresa:** os gráficos seguem o seletor de obra ou escopo
  e o período. Sem período, mostram os cinco meses anteriores, o atual e os
  seis seguintes. Com período, os meses dele, até 36. Uma linha embaixo diz
  os meses e quantas obras sem Atual ficaram fora.
- **Exportar PDF** no Dashboard, com a faixa da empresa.
- Sem nenhum valor nos meses, o cartão diz isso em vez de um gráfico vazio.

## Premissas

- Os gráficos usam só a versão Atual. Os cartões de cima continuam
  comparando versões; comparar versões nos gráficos é um passo a mais.
- "Lucro" foi lido como o Resultado Final da DRE. Para a barra fechar com a
  receita, retiradas, investimentos, empréstimos e despesas financeiras
  entram juntos em "Demais itens".
- **BAA-1** (Prompt I, §54–57) e o critério de conciliação seguem em aberto
  e não mudam nada aqui. Os cartões de cima e as chaves do Dashboard ficam
  como estão.

## Acesso e dados

Nada muda. Só leitura, com o acesso de quem vê o Dashboard.

## Testes

- `src/lib/dashboard-graficos.test.ts` (novo): a janela de meses (sem
  período, com datas, com competência, um lado só, teto), a soma das obras no
  fluxo, as partes da barra somando a receita com lucro e com prejuízo, e o
  "nada a desenhar".
- e2e: os dois gráficos aparecem no Dashboard da empresa e o botão de PDF
  existe.

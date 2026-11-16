# Prompt F2 · Previsão Atualizada: meses passados pela Atual — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Pedido de 17/10: "o chat traz o
realizado e substitui os meses passados pelo Atual; o usuário ajusta os
meses futuros à mão, por voz ou por texto. Orçamento fica fixo; Previsão
muda mês a mês." A reprojeção já existia (Prompt F), só para as despesas.

## O que mudou

- **"Partir do realizado" inclui a receita.** Nos meses passados, a linha
  Receitas do Projeto passa a ter a receita da versão Atual, a mesma da DRE
  por competência. O resto do total vai por igual nos meses futuros, como já
  acontecia nas despesas. As outras linhas de receita não mudam.
- O resultado segue o caminho do Prompt F: uma revisão nova, e a aberta fica
  intacta.
- **A Cris ajusta só os meses futuros na Previsão.** Os meses passados ficam
  como estão.
  - Um intervalo ("de 11/2026 a 03/2027") reparte o que sobra de 100%.
  - Uma lista de "mês=%" que inclua mês passado, ou que passe de 100%, é
    recusada no campo.
  - O título do formulário diz quais meses são editáveis.

## Premissas

- **BF2-1** (o ajuste mês a mês substitui a reprojeção ou é mais um botão?)
  segue sem resposta. Os dois convivem: a reprojeção cria a revisão com os
  meses passados pela Atual, e a Cris, na revisão aberta, ajusta os futuros.
- A grade não trava os meses passados para a edição à mão. A pessoa ainda
  pode corrigir um mês passado na célula; só a Cris não mexe neles.
- "Atual" na receita é a receita da DRE por competência, não o dinheiro
  recebido (que fica no Fluxo).

## Acesso e dados

Nada muda. Criar a revisão continua exigindo "criar" em Previsão, e nada é
gravado sem o botão.

## Testes

- `src/lib/previsao-reprojecao.test.ts`: a linha Receitas do Projeto com os
  meses passados pela receita da Atual, as outras linhas paradas e o resumo
  falando em receita e despesas.
- `src/lib/actions/previsao-assistente.test.ts`: o estouro passa a ser lido
  na conta de despesa, porque a receita agora entra na proposta.
- `src/lib/orcamento-cris.test.ts`: na Previsão, o intervalo reparte o
  resto; mês passado e soma acima de 100% recusados; aplicar usa o % atual
  dos meses fixos.

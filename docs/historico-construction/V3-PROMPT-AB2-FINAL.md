# Prompt AB2 · Consolidado e Balanço do Dia saem — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Decisão BAB-1 de 18/10: o
Consolidado sai sem esperar os Relatórios Customizados. O Balanço do Dia sai
depois de o Caixa listar os dias fechados (Prompt L2).

## O que mudou

- **Consolidado sai.** O endereço `/consolidado` leva à **Projeção de
  Receitas**, com um aviso de uma linha. A Projeção já mostra a receita da
  obra por fonte quando se comparam duas ou três versões, que era o que o
  Consolidado fazia. Pergunta livre vai para a Cris.
- **Balanço do Dia sai.** O endereço `/balancodia` leva ao **Caixa**, com um
  aviso de uma linha. A seção "Dias fechados" do Caixa tem a mesma tabela,
  filtro, impressão e exportação. Ela aparece também antes de escolher o
  projeto, porque o histórico é da empresa, e abre já expandida quando se
  chega pelo endereço antigo.
- **Os dois itens saem do menu.** As páginas foram apagadas (os
  redirecionamentos rodam antes delas), junto com os controles que só o
  Consolidado usava.
- **O aviso vai em `?saiu=`**, não em `?de=` como nas telas que saíram antes.
  A Projeção e o Caixa usam `?de=` como data inicial do filtro.
- A base de conhecimento da Cris, o texto da chave de Rascunho e a mensagem de
  reabertura do dia deixaram de citar as duas telas.

## Acesso

- **`consolidado` sai da lista de telas.** Override gravado para ela fica
  inerte, como nas telas que saíram antes. O contador deixa de ter essa tela
  no padrão porque ela não existe mais. A Projeção **não** foi aberta para o
  contador: se ele precisar da receita por fonte, owner ou admin dão "ver" na
  Gestão de Acessos.
- **`balancodia` fica** e passa a se chamar "Dias fechados (no Caixa)" na
  Gestão de Acessos. Governa a seção do Caixa. Quem via a tela continua vendo
  o histórico, e quem não via continua sem ver.

## Dados

Nada apagado. Os fechamentos do dia seguem na mesma tabela.

## Testes

- `src/lib/telas-removidas.test.ts`: as páginas não existem, os
  redirecionamentos estão no `next.config.ts`, os avisos, o menu, a chave do
  Consolidado inerte, a do Balanço do Dia no Caixa e nenhuma rota citada nas
  actions.
- Menu e permissões: as duas rotas entram na lista das que saíram, e o padrão
  do contador perde o Consolidado.
- e2e: o menu sem as duas, `/consolidado` na Projeção com o aviso e
  `/balancodia` no Caixa com o aviso e os dias fechados.

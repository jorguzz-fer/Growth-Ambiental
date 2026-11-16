# Prompt D2 · Orçamentos: escrita assistida e aviso ao sair — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Estreia da Etapa 3 (escrita
assistida), autorizada em 15/10. Regra de 18/10: toda escrita da IA é
proposta; quem grava é o botão da tela.

## O que mudou

- **As ações de Orçamento devolvem `{ ok, error }`.** Em produção, o Next
  esconde a mensagem de erro lançada por uma Server Action, e a pessoa via
  "An error occurred". Agora a recusa escrita chega à tela.
  - Mudaram o salvamento da grade e as ações de planilha, importação e
    réplica.
  - Um auxiliar comum (`lib/resultado.ts`) deixa passar a recusa escrita e
    troca erro de banco por uma mensagem genérica, sem o conteúdo no log.
- **A Cris preenche a grade.** Por texto, ditado ou documento anexado, ela
  propõe, por linha, o total e a distribuição nos meses: igual num intervalo
  ("03/2026 a 08/2026") ou com o % de cada mês.
  - A proposta só preenche a grade. Uma faixa diz o que foi preenchido, o que
    não deu e o que conferir, e quem grava é Salvar receitas ou Salvar
    despesas.
  - Na Previsão Atualizada, que herda os totais, ela só mexe na
    distribuição. A linha Receitas do Projeto, cujo total vem do cadastro,
    também.
- **Aviso ao sair sem salvar.** Com alteração pendente, a grade mostra
  "Alterações não salvas". Sair por um link do app pede confirmação, e
  fechar ou recarregar a aba usa o aviso do navegador.
- **Vários formulários na mesma tela.** Receitas e Despesas aparecem juntas
  para a Cris, com os campos de cada uma, e a proposta volta repartida. O
  servidor não mudou.

## Premissas

- **BD2-1** (uma linha por vez ou um bloco inteiro?) segue sem resposta. A
  proposta vem em bloco, várias linhas de uma vez, e a pessoa confere linha a
  linha antes de salvar.
- **4.1.3** (o que a escrita assistida pode tocar): só os campos da grade.
  Situação, trava e inclusão ou remoção de linhas continuam com os botões da
  tela.
- Linhas fora da tela (inativas, sem lançamento) não são oferecidas.

## Acesso e dados

- O formulário só é oferecido a quem pode editar a versão. O servidor já
  confere a permissão ao salvar.
- Nada é gravado sem o clique em Salvar.

## Testes

- `src/lib/resultado.test.ts` (novo): sucesso, recusa escrita, erro de banco
  com mensagem genérica e log sem conteúdo, e `dadosOuErro` no cliente.
- `src/lib/actions/orcamento-linhas.test.ts`: o salvamento devolve a recusa
  como `{ ok: false, error }`.
- `src/lib/orcamento-cris.test.ts` (novo): os campos do formulário, a
  distribuição (intervalo que fecha 100%, lista, fora da grade), aplicar sem
  mexer no total fixo, a validação da proposta, e unir e repartir dois
  formulários.
- e2e: a grade abre sem pendência, a Cris vê Receitas e Despesas, editar
  marca "não salvas", sair pelo menu pede confirmação, cancelar fica e
  confirmar sai. Para o e2e, o projeto do seed recebeu datas de início e fim
  no banco local.

**Não verificado:** a proposta contra o modelo real (sem chave da API) e o
aviso do navegador ao fechar a aba (o e2e cobre o link do app).

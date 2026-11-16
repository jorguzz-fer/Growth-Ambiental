# Prompt K2 · Contas a Receber e Liberações: a Cris lança — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Pedido: "chat lança"; a edição
por linha já existia.

## O que mudou

- **Nova conta a receber com a Cris.** Por texto, ditado ou documento, ela
  preenche projeto, tipo, valor, vencimento, descrição, unidade e banco.
  Quem grava é Adicionar.
  - O formulário passou a guardar vencimento, descrição, unidade e banco no
    estado da tela, para poder ser preenchido; antes eram campos soltos.
  - A tela avisa que a Cris preencheu e pede para conferir.
- **Liberação de obra com a Cris**, em Nova liberação e na edição. Ela
  preenche data, origem, valor e observações a partir do ofício ou do
  extrato, e quem grava é Salvar.
- Um teste novo acompanha as telas de lançamento que se oferecem à Cris.
  Cada prompt seguinte entra nele.

## Premissas

- **O cliente fica de fora.** O nome do comprador não vai ao modelo (regra
  BE-2), então a pessoa escolhe o cliente na lista.
- Receber uma conta (dar baixa) e estornar continuam pelos botões da linha.
  A Cris não dá baixa.

## Acesso e dados

Nada muda. A Cris só preenche, e as ações conferem a permissão ao gravar.

## Testes

- `src/lib/cris-formularios-telas.test.ts` (novo): as telas de lançamento
  registram o formulário, e Contas a Receber não oferece o cliente.
- e2e: em Contas a Receber e em Nova liberação, a Cris abre com o
  formulário da tela.

**Não verificado:** o preenchimento contra o modelo real (sem chave da API).

# Prompt B2 · Projetos: mudar por comando — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Pedido: "chat que lê documento
e preenche o cadastro, e aceita alterações por comando (ex.: mudar o projeto
28)". A leitura de documento já existia (Prompt B).

## O que mudou

- **O projeto aberto se oferece à Cris.** Com `?proj=` na tela Projetos, a
  pessoa diz, dita ou anexa o que mudar. A Cris preenche os campos do cartão:
  - datas, valores, custos, área construída, financiamentos, recursos
    próprios e os dados do terreno;
  - localização e dados fiscais.
- **Só preenche.** A faixa já existente ("Proposta do assistente no
  formulário") mostra os campos preenchidos. Quem grava é o Salvar do
  cartão, e o log marca `origem: assistente`, como na leitura de documento.
- **Aviso ao sair sem salvar** no cartão, como no Orçamento.
- Na lista de todos os projetos, a Cris não preenche. Cada cartão somaria
  campos demais, então ela indica o link do projeto para abrir.

## Premissas

- **BB2-1** (que campos o comando muda?) segue sem resposta. Valem os campos
  do cadastro da obra, menos:
  - o cliente, porque o nome do cliente não vai ao modelo;
  - a situação e a trava, que têm botão próprio.
- **BB2-2** (o pré-preenchimento de Orçamentos cria versão nova ou preenche a
  vazia?) segue sem resposta. A parte do Orçamento não entrou aqui; o D2 já
  deixa a Cris preencher a grade do Orçamento aberto.

## Acesso e dados

- O formulário só é oferecido a quem pode editar o projeto, e o servidor
  confere de novo ao salvar.
- Nada é gravado sem o Salvar.

## Testes

- `src/lib/projeto-cris.test.ts` (novo): os campos do formulário (sem
  cliente, situação e trava; localização só no projeto aberto), a validação
  da proposta e a conversão para o cartão.
- e2e: no projeto aberto, a Cris abre com o cadastro do projeto.

**Não verificado:** o comando contra o modelo real (sem chave da API).

# Prompt S3 · Despesas: a Cris lança, recorrência e "paga por terceiro" — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Pedido: chat por voz, texto e
documento; recorrência; e o bug do "paga por terceiro" com a lista vazia,
investigado antes.

## O bug da lista vazia

- **O que acontecia.** Desde o Prompt T, "Quem desembolsou" mostra só quem
  tem o papel "Pagador por Terceiro", dado em Ressarcimentos. Antes, a lista
  era a dos sócios.
- Quem pagou pela empresa naquela época, e tem obrigação registrada, ficava
  de fora até alguém lhe dar o papel. Numa empresa sem ninguém com o papel, a
  lista vinha vazia.
- **O que mudou.** Quem já pagou antes aparece também, marcado "já pagou
  antes, sem o papel". O aviso que manda dar o papel em Ressarcimentos
  continua quando não há ninguém.
- **Achado na investigação:** o servidor aceitava qualquer id como "quem
  desembolsou", inclusive de outra empresa. Agora ele recusa antes de gravar
  se o cadastro não é desta empresa ou está inativo.

## A Cris na despesa

- **A Cris preenche a despesa**, nova ou em edição, a partir de texto, ditado
  ou documento (nota, boleto, recibo). Ela preenche:
  - fornecedor, conta, categoria (quando não está travada pelo DP),
    competência, vencimento, valor, status, descrição e forma de pagamento;
  - na despesa nova, a recorrência (quantos meses) e o "paga por terceiro"
    (quem pagou, quando e se será reembolsado).
- **Quem grava é Salvar.** A tela diz quantos campos a Cris preencheu e que
  nada foi gravado.
- A leitura de documento que já existia ("Preencher formulário") continua
  igual.

## Premissas

- **BS3-1** (quem aparece em "paga por terceiro": quem tem o papel, ou todo
  cadastro de Ressarcimentos?) segue sem resposta. Aparecem quem tem o papel
  e quem já pagou antes, não todo cadastro.
- O fornecedor vai ao modelo como já ia na leitura de nota: é a empresa do
  documento. Comprador e funcionário continuam fora.

## Acesso e dados

- Nada ampliado.
- A validação nova do pagador fecha um caminho que aceitava cadastro de outra
  empresa.

## Testes

- `src/lib/stakeholder-regras.test.ts`: quem tem o papel e quem já pagou
  aparecem; o inativo só se for o da edição.
- `src/lib/actions/despesas-integridade.test.ts`: o pagador de outra empresa,
  o inativo e o id inválido são recusados antes de gravar. O teste 11.2, que
  usava o pagador inexistente para forçar a falha no meio da transação, passou
  a conferir a recusa antes de gravar.
- `src/lib/cris-formularios-telas.test.ts`: a despesa se oferece à Cris.
- e2e: em Despesas, a Cris abre com o formulário Nova despesa.

**Não verificado:** o preenchimento contra o modelo real (sem chave da API).

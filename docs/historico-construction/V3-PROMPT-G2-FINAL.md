# Prompt G2 · Plano de Contas: o chat insere contas — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Confirmado em 18/10 ("o chat
do Plano de Contas insere planos"); revoga o 8.2.1 do Prompt G, que deixava
o assistente da tela só em leitura.

## O que mudou

- **A Cris propõe contas novas.** Por texto, ditado ou documento, ela monta
  até 10 contas por vez: grupo, código, nome, natureza e, se quiser, a
  categoria da DRE.
- **Conferência na tela.** A proposta aparece numa lista acima do plano, com
  a categoria que cada conta vai ter ("(padrão)" quando segue a boa
  prática do DP) e o motivo de qualquer recusa: código repetido, código fora
  do grupo, grupo que não existe ou categoria que não serve à natureza. As
  contas válidas vêm marcadas.
- **Quem cria é o botão "Criar as contas marcadas".** O servidor valida cada
  conta de novo, cria as boas e devolve o motivo das outras. O log marca
  `origem: assistente`.
- "Descartar a proposta" limpa a lista sem criar nada.

## Premissas

- **BG2-1** (o chat cria grupo, conta e subconta, ou só conta?) segue sem
  resposta. A Cris só propõe **conta em grupo que já existe**. Criar grupo,
  inativar, excluir e reordenar continuam vedados ao chat e seguem nos botões
  da tela.
- O código precisa começar pelo código do grupo e um ponto ("1.11",
  "A.6"), o padrão do plano.

## Acesso e dados

- A proposta só é oferecida a quem pode criar no Plano de Contas, e o
  servidor confere a permissão de novo.
- Nada é criado sem o botão.

## Testes

- `src/lib/planocontas-cris.test.ts` (novo): o formulário cabe no teto da
  Cris, a proposta vira a lista (grupo inventado e conta incompleta caem), a
  categoria padrão e as recusas.
- `src/lib/actions/planocontas-cris.test.ts` (novo, com banco): cria a válida
  com o grupo, o tipo e a categoria, recusa a repetida e a de grupo
  inexistente, registra a origem no log, e sem permissão nada acontece.
- e2e: no Plano de Contas, a Cris abre com o formulário de contas novas.

**Não verificado:** a proposta contra o modelo real (sem chave da API).

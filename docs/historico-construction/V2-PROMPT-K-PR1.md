# Prompt K · PR K-1 — correções da revisão (CR-04 a CR-09)

Primeira PR de código do Prompt K, conforme
[`V2-PROMPT-K-FASE1.md`](./V2-PROMPT-K-FASE1.md). Seção 7 inteira, menos a
7.1 (feita na I-6). **Nenhum registro gravado é alterado. Sem migração.**
Não depende de nenhuma decisão em aberto.

## O que muda

| | Antes | Agora |
|---|---|---|
| **7.2 · CR-04 valor** | criação recusava só zero (negativo passava); edição não validava nada | `valorDeContaValido` (finito e > 0) nas duas; valor recebido entre zero e o valor da conta (R$ 5.000 numa conta de R$ 324 recusa) |
| **7.3 · CR-05 domínio** | `tipo` e `status` eram texto livre no servidor; o schema dizia `Cancelado`, o código gravava `Cancelada`, o Caixa comparava com `Cancelado` | lista fechada em `conta-receber-regras.ts`, conferida no servidor: tipos Sinal / Parcela mensal / Outros / Outras Receitas; status editáveis A receber / Parcialmente recebido / Recebido; **Cancelada** só pelo cancelamento. Comentário do schema e a comparação do Caixa alinhados. **Divergências gravadas: nenhuma** (tabela vazia em produção em 30/09) |
| **7.4 · CR-06 carga** | a página trazia todas as contas e todos os recebíveis da empresa, filtrava a obra em memória e mandava a lista inteira para a busca | `getContasReceber(tenant, obra?)` e `getReceivables(tenant, obra?)` filtram **na consulta**; a busca recebe só a obra escolhida. Os outros chamadores (dashboard, fechamento, caixa, backup, rota do agente) continuam sem o filtro, iguais |
| **7.5 · CR-07 unidade** | o seletor oferecia os códigos da empresa inteira | `getUnidadesAtuaisPorObra`: só as unidades da **versão Atual** da obra escolhida no próprio formulário. `getUnitCodesByTenant` fica como está para as telas que já a usam (seção 9) |
| **7.6 · CR-08 identificador** | o `refId` (unidade:índice da parcela) era descartado; a `key` era o índice da linha | `refId` chega à tabela e é a chave da linha. É o par que a materialização (K-5) usará como origem |
| **7.7 · CR-09 retorno** | as três actions lançavam erro (digest em produção); editar e cancelar sem `id` faziam `return` mudo | `{ ok, error }` nas três, com a mensagem na tela; sucesso visível ("Conta a receber lançada."); cancelar pede confirmação e recusa a segunda vez com texto |

## Arquivos

- novo: `src/lib/conta-receber-regras.ts` (+ teste puro);
- `src/lib/actions/contas-receber.ts`; `src/lib/queries.ts`
  (`getContasReceber`, `getReceivables`, `getUnidadesAtuaisPorObra`);
- `src/app/(app)/contasreceber/page.tsx`,
  `src/components/app/contas-receber-manager.tsx`;
- `src/lib/actions/caixa.ts` (comparação de status), `src/lib/db/schema.ts`
  (comentário).

## Verificação

- `conta-receber-regras.test.ts` (puro): zero/negativo/NaN recusam; tipo
  fora da lista; "Outras Receitas" sem descrição; status editável; valor em
  texto BR/US; recebido acima da conta.
- `contas-receber-actions.test.ts` (Postgres): criação recusa zero, negativo,
  lixo, tipo inválido, descrição faltando e obra alheia **sem gravar**;
  edição valida igual, status fora da lista recusa, recebido acima recusa,
  edição boa grava; cancelar grava "Cancelada", repetir ou editar cancelada
  devolve erro legível; filtro por obra nas duas consultas; unidades por obra
  só da Atual; `refId` = unidade:0.
- Antes/depois de `conta_receber`: vazia em produção; local, só as linhas do
  teste, removidas ao fim.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

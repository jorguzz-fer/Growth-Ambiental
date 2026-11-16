# Prompt I · PR I-7b — saída da restituição segue a despesa (chave) e conta corrente única

Sétima PR de código do Prompt I (parte **b**), conforme
[`V2-PROMPT-I-PR7A.md`](./V2-PROMPT-I-PR7A.md) (inventário). Seções 21 e 26.
**Nenhum registro gravado é alterado. Sem migração.**

## O que muda

| | Antes | Agora |
|---|---|---|
| **§21 · obra da saída** (B11, opção 2) | a saída de caixa da restituição avulsa, o estorno dela e a entrada do repasse caíam na **obra aberta na tela**, mesmo quando a despesa era de outra obra. O Fluxo por obra mostrava a saída numa obra e a despesa em outra | **atrás da chave `restituicao_segue_despesa`** (desligada = exatamente como hoje). Ligada: a saída avulsa e o estorno caem na **versão da despesa restituída**; o repasse, na Atual da **obra do recebimento** (sem obra no registro, obra da tela). Versão congelada bloqueia. Só daqui em diante |
| **prévia** | — | na tela de Restituições, para quem administra chaves: obrigações pendentes agrupadas pela **obra da despesa** (onde as próximas saídas cairão), com saldo |
| **lote** | obra da tela | **continua na obra da tela** até a resposta da pergunta B11 (dividir por obra × saída única com alocação). Ver PR7A |
| **§26 · conta corrente** | `getContaCorrenteTerceiros` reconstruía o saldo só por desembolsos e restituições; **ignorava compensações**, não mostrava recebimento, repasse nem estorno. Divergia de `valorTotal − valorRestituido` (que já inclui compensação) sempre que havia encontro de contas | **uma função só**, pura: `montarContaCorrente` em `src/lib/calc/conta-corrente.ts`, com desembolso (+), restituição (−), estorno de restituição cancelada (+, par com a saída), compensação (− nos dois lados), recebimento pelo terceiro (+ a repassar) e repasse (−). Dois saldos por terceiro, acumulados linha a linha. O saldo a restituir **bate** com a visão por obrigação; o a repassar, com a visão por recebimento |
| **tela** | duas colunas de totais | + "Compensado" e "A repassar"; extrato com os seis tipos de movimento e as duas colunas de saldo |

## Arquivos

- novo: `src/lib/calc/conta-corrente.ts` (+ teste puro);
- `src/lib/chaves.ts` (chave nova);
- `src/lib/actions/restituicoes.ts` (`registrarRestituicao`, `cancelarRestituicao`, `getContaCorrenteTerceiros`, `getPreviaSaidaPorObra`);
- `src/lib/actions/recebimento-terceiro.ts` (`registrarRepasse`);
- `src/components/app/conta-corrente-terceiros.tsx`, `src/app/(app)/restituicoes/page.tsx` (prévia).

## Verificação

- `conta-corrente.test.ts` (puro): 150 − 30 − 40 = 80 a restituir e 80 − 20 − 40
  = 20 a repassar, ordem dos movimentos; cancelada vira par com efeito zero;
  cancelados e compensação sem terceiro ficam fora; ordem por data com virada
  de ano; centavos.
- `terceiros-conta-corrente.test.ts` (Postgres): chave desligada → saída na
  obra da tela; ligada → na obra da despesa, estorno idem, prévia mostra a
  obra e o saldo, versão congelada bloqueia; repasse desligada/ligada; após
  compensação de 20, a conta corrente traz os seis tipos, saldo a restituir
  40 e a repassar 0, iguais aos saldos por obrigação/recebimento.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

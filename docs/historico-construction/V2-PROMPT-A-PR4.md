# Prompt A · PR 4 — Caixa sem "projeto ativo"

Segundo módulo. Mesmo padrão de Despesas (PR 3): a obra vem da URL (`?proj=`),
e cada aba lembra a última obra escolhida (B-A2).

## Tela `/caixa`

| | Antes | Agora |
|---|---|---|
| Qual obra | a do cookie, ou a primeira cadastrada. **Não havia seletor na tela**: trocava-se em Projetos → "Selecionar" | seletor na própria tela; sem escolha, a aba reabre a última obra ou pede a escolha |
| Versões para comparar | as da obra do cookie | as da obra da tela; um `vs` que sobrou de outra obra é descartado |
| Troca de aba (Lançamentos / Conciliação / Previstas) | — | mantém a obra |
| Obra sem nenhuma versão | quebrava | aviso; nada é lido de outra obra |

A **versão de trabalho** segue exatamente a regra de antes, agora aplicada à
obra da tela: Atual; sem ela, a padrão; sem nenhuma das duas, a mais antiga.
A regra saiu de `getActiveContext` para `versaoDeTrabalho` (`lib/context.ts`),
e os dois usam a mesma função.

## Gravações

Todas passam a receber a obra da tela e a validá-la na empresa:

| Action | Antes | Agora |
|---|---|---|
| `addCash` | versão do cookie | versão de trabalho da obra da tela |
| `importCash` (e a conciliação automática da importação) | versão do cookie | idem |
| `pairMovimento` | versão do cookie | idem |
| `criarLancamentoDoExtrato` | movimento de caixa na versão do cookie; obra da despesa / conta a receber escolhida no modal, **com a primeira obra da lista pré-marcada** | caixa na obra da tela; o modal já vem com **a obra da tela** |

Sem obra, ou com obra de outra empresa, a gravação é recusada. O bloqueio de
versão congelada passa a olhar a versão da obra da tela.

As demais actions de `caixa.ts` (conciliar, desfazer, criar conta a partir do
extrato, candidatos) não usavam obra nem versão; só trocaram para
`getTenantContext`.

## Correção de passagem (seção 38)

`criarLancamentoDoExtrato`, no ramo de **entrada**, gravava a conta a receber
com o `projectId` recebido **sem conferir a empresa**. Uma obra de outra
empresa ficaria vinculada a uma conta a receber desta. O ramo de saída já
estava protegido: `getAtualVersion` filtra o tenant. Agora os dois ramos
conferem, e o teste falha sem a correção.

## Verificação

- `caixa-projeto-explicito.test.ts` (Postgres, com `getActiveContext` proibido
  no mock):
  - regra da versão de trabalho;
  - `addCash` na obra informada, que não é a primeira da lista;
  - obra sem Atual cai na padrão, como antes;
  - sem obra, ou com obra de outra empresa, nada é gravado;
  - `importCash` na obra informada e recusado com obra alheia;
  - versão congelada bloqueia;
  - `pairMovimento` recusa obra alheia;
  - conta a receber em obra de outra empresa é recusada;
  - conta a receber vai na obra escolhida e o caixa na obra da tela.
- Suíte inteira: 833 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador (build de produção, duas obras):
  1. aba nova pede a escolha;
  2. seletor em ordem;
  3. um ajuste lançado pela tela na OBRA 7 (a segunda cadastrada) foi gravado na
     versão Atual dela, conferido no banco;
  4. a troca de aba mantém a obra;
  5. Despesas, na mesma aba, abre a obra lembrada;
  6. uma segunda aba em outra obra não interfere.

## Próxima

Receitas: unidades, contas a receber, permuta, liberações de obra e
ressarcimentos.

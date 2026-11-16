# Prompt A · PR 6 — Receitas (parte 2): Ressarcimentos

Fecha o módulo Receitas. Mesmo padrão das PRs 3 a 5: a obra vem da URL
(`?proj=`), e cada aba lembra a última obra escolhida (B-A2).

## Tela `/restituicoes`

| | Antes | Agora |
|---|---|---|
| Qual obra | a do cookie; sem seletor | seletor na tela + memória por aba; sem escolha, pede |
| Lista de lançamentos pagos por terceiro | versão do cookie | versão de trabalho da obra da tela |
| Conta corrente por terceiro e saldos | da empresa inteira | **igual**, da empresa inteira |

## Gravações

Todas recebem a obra da tela, validada na empresa:

| Action | Antes | Agora |
|---|---|---|
| `criarDespesaTerceiro` | despesa nova na versão do cookie; "empresa responsável" gravada **sem conferir a empresa**, e vazia virava a obra do cookie | despesa na obra da tela; empresa responsável conferida, e vazia vira a obra da tela |
| `registrarRestituicao` | saída de caixa na versão do cookie | na obra da tela (exigida só quando há saída a criar) |
| `confirmarRestituicaoLote` | idem | idem |
| `cancelarRestituicao` | estorno na versão do cookie | recebe a obra (hoje nenhuma tela chama esta action) |
| `registrarRecebimentoTerceiro` | obra do formulário **sem conferir**; sem ela, a do cookie | obra obrigatória e conferida (hoje nenhuma tela chama) |
| `registrarRepasse` | entrada de caixa na versão do cookie | na obra informada (hoje nenhuma tela chama) |

A **versão congelada** continua sendo checada só onde já era
(`criarDespesaTerceiro`), agora na versão da obra da tela.

**Contas a Receber** já era explícita, multiprojeto, com "Todos" como padrão.
Só passou a usar `getTenantContext`.

## Pergunta aberta — B11

A saída de caixa de uma restituição cai na obra da tela, como antes caía na
do cookie. Mas a despesa restituída pode ser de outra obra. Detalhe e opções em
`V2-BLOQUEIOS.md`, B11. Esta PR **não** muda a regra.

## Verificação

- `ressarcimentos-projeto-explicito.test.ts` (Postgres, com
  `getActiveContext` proibido):
  - sem obra, ou com obra alheia, nada é gravado;
  - empresa responsável de outra empresa é recusada;
  - a despesa vai para a obra da tela;
  - a empresa responsável vazia vira a obra da tela;
  - a restituição lança a saída de caixa na obra da tela;
  - o lote recusa obra alheia;
  - o recebimento recusa sem obra ou com obra alheia;
  - o repasse exige a obra.
- Suíte inteira: 846 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador (build de produção):
  1. aba nova pede a escolha;
  2. escolher a obra abre a tela completa, com seletor, lote e cadastro;
  3. o Caixa, na mesma aba, abre a mesma obra;
  4. nenhum erro de JavaScript.

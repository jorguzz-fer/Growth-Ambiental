# Prompt L — PR 3 (Partes 3-A, 4 e 6): a tela só concilia, ajuste com motivo, três estados

Resumo em português simples do que esta PR muda. Nada é apagado, nenhuma migração
nova, nenhum dado existente é alterado.

## O que mudou

### Parte 3-A — a tela de Caixa não lança mais receita nem despesa
- A tela ficou com **duas abas**: **Conciliação** (a tabela de movimentos e o
  revisor) e **Ajustes** (o único lançamento desta tela).
- Saíram as abas **Lançamentos** e **Previstas**. O previsto já mora em Contas
  a Pagar e Contas a Receber; o formulário de lançamento genérico de caixa não
  é mais exibido (a ação `addCash` fica no código, sem botão, para não quebrar
  nada que a chame).
- **Encaminhar com dados** (3-A.2 / 7.2): no revisor, um movimento sem conta
  compatível ganha o link **"Lançar em Despesas com estes dados →"** (saída)
  ou **"Lançar em Contas a Receber com estes dados →"** (entrada). O link já
  leva valor, data, histórico do extrato e o id do movimento. A regra de
  montar o link está em `src/lib/caixa-encaminhamento.ts` (puro, testado).
- Em **Despesas**, o formulário abre com o aviso "Veio do extrato…" e, ao
  gravar, **vincula a despesa ao movimento reservado** (pelo mesmo
  `gravarVinculos` da PR 2, origem `manual`, valor = o menor entre o movimento
  e a despesa). Se o vínculo não puder ser gravado, a despesa é gravada mesmo
  assim e o aviso explica.
- Em **Contas a Receber**, o formulário abre com valor, vencimento e descrição
  preenchidos (`pf_valor`, `pf_venc`, `pf_desc`).

### Parte 4 — ajuste de caixa com motivo, permissão própria, aviso e histórico
- `addAjuste` (em `src/lib/actions/caixa.ts`): exige **motivo**, **data** e
  **valor > 0**; exige a permissão **"Conciliação — ajustar e desfazer: criar"**
  (tela `conciliacao`), não a de despesa; grava `cash_entry` com `cat = "ajuste"`
  já conciliado; auditoria `cash.adjust` com motivo, valor, conta, data e autor.
- O ajuste compõe só o **saldo conciliado**; o **saldo em conta** (extrato)
  não muda (teste cobre). Continua fora da DRE (teste cobre).
- Aba **Ajustes**: formulário com o **aviso de boa prática** (encontrar a
  diferença em vez de ajustar; não bloqueia) e o **histórico completo**: data,
  conta, valor, motivo, autor (do audit_log) e **saldo conciliado antes e
  depois** daquele dia (vem da cadeia da PR 1). Filtro por período (o da tela)
  e por conta.
- O **total de ajustes** fica sempre à vista no bloco "Os dois saldos"
  (acumulado da obra, com a quantidade).

### Parte 6 — três estados e o número que denuncia extrato não importado
- Os três estados da despesa (Em aberto / Baixada / Baixada e conciliada /
  Cancelada) já estão em `estadoDaDespesa` (PR 2). A baixa manual continua
  gravando `pagamento`; o estado "Baixada" é derivado, sem campo novo.
- **6.4 — "Baixado sem conciliar"**: no bloco "Os dois saldos" aparece o total
  pago sem vínculo com extrato, em quantas despesas, e há quantos dias está
  o mais antigo (`getBaixadoSemConciliar`). Quando cresce, é extrato que não
  foi importado.
- **6.1 — DRE não lê o caixa**: teste `src/lib/dre-sem-caixa.test.ts` trava
  que a página da DRE e o cálculo de natureza não citam `cash_entry`.

### Pequenos acertos na mesma tela (encontrados no teste de navegador)
- O cabeçalho "Controle de Caixa" ficava espremido numa coluna estreita
  porque os três filtros estavam dentro do cabeçalho. Os filtros de período e
  versão foram para uma linha própria; o seletor de obra ficou no cabeçalho.
- Na tabela dos dois saldos, a coluna "Última atualização" encostava na
  "Diferença"; ganhou espaço.
- A expressão SQL que extrai a data mais antiga/mais recente (em
  `getBaixadoSemConciliar` e em `getUsoDasContas`, da PR X-2) usava `\d`
  dentro de template string, que vira `d` e nunca casava; trocado por
  `[0-9]`. Efeito: o "último lançamento" das contas (assistente de Contas)
  passa a aparecer de fato.

## Permissão
- Ajustar exige `conciliacao: criar`. Quem não tem vê a mensagem na aba
  Ajustes e a ação recusa com o mesmo texto. Desfazer continua
  `conciliacao: excluir` (PR 2). A definição final do modelo de permissão fica
  para o Prompt M (pergunta aberta na Fase 1).

## Testes
- `src/lib/caixa-encaminhamento.test.ts` — monta o link de saída/entrada.
- `src/lib/actions/ajuste-caixa.test.ts` — sem motivo não grava; sem a
  permissão própria não grava; grava `cat ajuste` conciliado com autor na
  auditoria e **não mexe no saldo da conta**; `getBaixadoSemConciliar` conta
  só o pago sem vínculo e a data mais antiga.
- `src/lib/dre-sem-caixa.test.ts` — DRE não lê o caixa.
- Suíte completa: 137 arquivos, 1365 testes, todos verdes. `tsc`, `eslint` e
  `next build` limpos.

## Teste de navegador (local, admin)
- `/caixa` mostra as abas Conciliação e Ajustes; o topo mostra "Ajustes
  acumulados" e "Baixado sem conciliar".
- Revisor: 8 entradas pendentes com o link "Lançar em Contas a Receber com
  estes dados →"; a página de Contas a Receber abre com descrição, vencimento
  e valor preenchidos.
- Aba Ajustes: sem motivo recusa com a mensagem; com motivo grava, aparece no
  histórico com autor, saldo conciliado antes (R$ 0) e depois (−R$ 12,50) e
  o total do topo passa a −R$ 13 (1). O lançamento de teste e o seu registro
  de auditoria foram apagados depois.

## Antes e depois (banco local)
| tabela | antes | depois |
|---|---|---|
| cash_entry | 46 · R$ 1.793,14 · 22 conciliados | 46 · R$ 1.793,14 · 22 |
| bank_account | 4 · saldo 0 · 4 ativas | 4 · 0 · 4 |
| despesa | 75 · R$ 43.701,75 · 24 pagas | 75 · R$ 43.701,75 · 24 |
| conciliacao_despesa | 0 | 0 |
| pagamento | 0 | 0 |

## O que fica para as próximas PRs do Prompt L
- **L-4** — Parte 9: fechar o dia no cartão, reabrir, cadeia por
  `daily_closing`, `/fechamento` absorvido.
- **L-5** — Parte 8-A: assistente da tela (propõe, você confirma) e o relatório
  final do Prompt L.

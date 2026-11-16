# Prompt L — PR 4 (Parte 9): o fechamento do dia vem para o cartão do Caixa

Resumo em português simples. Migração **0059** (aditiva, reversível, com
`down/`). Nenhuma linha existente é alterada ou apagada.

## O que mudou

### 9.1 — a rota `/fechamento` foi absorvida
- Fechar o dia é **ação no cartão** da cadeia de saldo (faixa "2 dias
  realizados, hoje e 7 à frente"). O item "Fechamento de Caixa" saiu do menu
  e a rota responde 404. O histórico continua no **Balanço do Dia** (9.8 —
  a Fase 1 confirmou que aquela tela já é o histórico de `daily_closing`).
- A chave de permissão `fechamento` **fica** (ninguém perde nem ganha acesso):
  `fechamento: criar` é o que fecha o dia; o rótulo passou a "Fechar o dia
  (no Caixa)".

### 9.2 / 9.4 — tudo calculado no servidor
- A action `fecharDia({ dia })` recebe só o dia. Saldo inicial, entradas,
  saídas, ajustes, saldo final, saldo em conta e **divergência** (em conta −
  conciliado, classificada nas quatro naturezas) vêm da **mesma cadeia que a
  tela mostra** (`src/lib/cadeia-da-empresa.ts`). O campo livre de divergência
  sumiu: diferença sem explicação só se resolve com o ajuste da Parte 4.
- O saldo inicial de um dia é o final gravado do dia anterior quando ele está
  fechado (já era assim desde a PR 1); fechar um dia retroativo grava os
  números **daquele dia**, não os de hoje.

### 9.3 — o cartão fechado
- Mostra o gravado (final, em conta, divergência), quem fechou e quando, com o
  selo "fechado". Dia realizado aberto **antes** de um dia fechado ganha o
  aviso "aberto antes de um fechado" (buraco na cadeia).

### 9.5 — fechar duas vezes é impedido; reabrir é operação própria
- Verificação na action e **índice único parcial** `(tenant_id, dia)` para
  fechamentos ativos (`reaberto_em IS NULL`). A migração **só cria o índice se
  não houver dia com mais de um fechamento ativo**; havendo, avisa
  (`RAISE NOTICE`) e segue sem criar — nenhuma linha é apagada, a decisão é
  humana. Localmente e no diagnóstico da Fase 1 não há duplicata
  (`daily_closing` tem 0 linhas).
- `reabrirDia({ id, motivo })`: exige `conciliacao: excluir` e motivo; a linha
  **fica**, marcada com `reaberto_em / reaberto_por / motivo_reabertura`;
  auditoria `caixa.reabertura`. Depois de reaberto, o dia pode ser fechado de
  novo (nova linha; a antiga permanece no Balanço do Dia como "reaberto em…").

### 9.6 — fechar não trava
- Comportamento mantido: dia fechado continua aceitando lançamento, edição e
  conciliação. A tela diz isso (na faixa e na confirmação). Se um lançamento
  posterior mudar o conciliado, o cartão mostra "Lançado depois do fechamento:
  o recalculado difere do gravado". **Nenhuma trava foi introduzida** (bloqueio
  menor: decisão de negócio).

### 9.7 — `carry_over` parou de ser gravado
- A action não insere mais em `carry_over`. A tabela fica no banco com o que
  tiver (localmente, 0 linhas). O que ela registraria já está em Contas a
  Pagar e Contas a Receber.

### 9.9 — tenant inteiro, auditoria pelo id
- O fechamento é sempre da empresa (`project_id` nulo); o parâmetro de obra
  saiu da action. A auditoria `caixa.fechamento` aponta o **id da linha**
  (antes era o dia).

### Decisão desta PR — a cadeia de saldo é da empresa
- O saldo em conta é a soma das contas, que são do tenant. Até a PR 3 a cadeia
  somava só os lançamentos da obra selecionada e comparava com as contas da
  empresa inteira — com mais de uma obra com caixa (é o caso em produção),
  a diferença saía errada. Agora a cadeia, os saldos por conta, o total de
  ajustes e a aba Ajustes somam **todas as obras** (a aba ganhou a coluna
  Obra). A **tabela de movimentos** continua por obra. É a leitura coerente
  com 9.9 (fechamento do tenant inteiro); fica registrada aqui para o seu
  aval.

## Migração 0059 (`0059_daily_closing_no_caixa.sql`)
- `daily_closing` ganha `saldo_em_conta`, `ajustes`, `naturezas` (jsonb),
  `reaberto_em`, `reaberto_por`, `motivo_reabertura` — todas opcionais ou com
  default.
- Índice único parcial `daily_closing_tenant_dia_aberto_uq`, criado só sem
  duplicata (bloco `DO`).
- `down/0059_...sql` remove índice e colunas e tira a linha do journal.

## Testes
- `src/lib/calc/cadeia-caixa.test.ts` (+3): cartão fechado/buraco, divergência
  com o gravado, resumo calculado e recusas (futuro, fora da cadeia, já
  fechado).
- `src/lib/actions/fechamento.test.ts` (novo, 4): números calculados no
  servidor, `carry_over` zerado, auditoria pelo id; fechar duas vezes recusado
  na action **e** no banco; dia futuro recusado; fechar não trava e o cartão
  diverge do gravado; reabrir exige motivo e permissão, e permite fechar de
  novo mantendo a linha antiga.
- `nav-menu.test.ts`: menu antigo passa a 39 telas (40 menos `/fechamento`).
- Suíte completa: 138 arquivos, 1374 testes verdes; `tsc`, `eslint`,
  `next build` limpos.

## Teste de navegador (local, admin)
- Menu sem "Fechamento de Caixa"; `/fechamento` → 404; Balanço do Dia segue.
- Cartão de ontem: "Fechar o dia" → confirmação com os números e o aviso de
  que não trava → selo "fechado", bloco "Gravado: … por Cliente Piloto Admin em …";
  anteontem ganha "aberto antes de um fechado".
- "Reabrir" com motivo → o botão "Fechar o dia" volta; Balanço do Dia mostra
  a linha com "reaberto em … · motivo". `carry_over` continua 0.
- Os registros de teste (1 fechamento, 2 auditorias) foram apagados.

## Antes e depois (banco local)
| tabela | antes | depois |
|---|---|---|
| daily_closing | 0 | 0 |
| carry_over | 0 | 0 |
| cash_entry | 46 | 46 |
| bank_account | 4 | 4 |

## Pergunta aberta (não bloqueia)
- A cadeia virar "da empresa" (acima) está certo para a sua operação? Se a
  intenção for conciliar obra por obra, a conta corrente precisaria ser por
  obra também — isso é modelagem, e fica para você decidir.

## Próxima
- **L-5** — Parte 8-A: assistente da tela (propõe, você confirma) e o relatório
  final do Prompt L.

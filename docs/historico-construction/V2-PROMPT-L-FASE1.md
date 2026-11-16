# Prompt L · Caixa e Conciliação — Fase 1, inventário antes de escrever código

Prompt L (22 de 42), `/caixa` (+ `/fechamento`, `/balancodia`). É o maior
prompt do conjunto. **Só leitura; nada foi alterado.** SQL em
[`sql/v2-prompt-l-diagnostico.sql`](./sql/v2-prompt-l-diagnostico.sql).

## O que já existe (e não se reconstrói)

- **Importação de extrato** (`importCash`, `import-extrato.tsx`): XLSX/CSV/PDF,
  prévia, dedup por `import_hash`, PDF guardado, leitura por IA. **Intacta.**
- **`bank_account.saldo` é o saldo do extrato**, com `saldo_source = "auto"`
  e `last_sync` quando o arquivo traz saldo final (Prompt X confirmou).
- **Ajuste** é o terceiro tipo de `addCash` (`cat = "ajuste"`, nasce `rec`,
  audit `cash.adjust`). **A DRE não lê `cash_entry`** (confirmado: nenhum
  arquivo de `src/app/(app)/dre` nem de `src/lib/calc` toca a tabela).
- **`saldoDisponivel`** exclui "Terceiros" e, desde o Prompt X, inativas.
- **`conciliarDespesa`**: marca a despesa "Pago" inteira, copia `dataCaixa`
  e `bancoId`, grava `rec` + `conciliado_despesa_id/por/em`; recusa movimento
  já conciliado. Sem comparar valores (BL-3). **`conciliarContaReceber`** já
  grava recebimento com valor pelo módulo do Prompt K.
- **`desfazerConciliacao`**: preserva o movimento; usa `can(caixa, excluir)`;
  audita.
- **Prompt K** já tem o modelo de vínculo com valor do lado do recebível:
  `conta_receber_recebimento (conta_receber_id, cash_entry_id, valor, …)`,
  com `FOR UPDATE`, soma dos vínculos ativos ≤ valor do movimento, estado
  derivado (`estadoDaConta`: A receber / Recebida / Recebida e conciliada).
  **É o molde para o lado da despesa.**

## O que está errado ou falta (confirmado no código)

| Item | Situação |
|---|---|
| 1.4 acumulado | `acumulado = saldoDisponivel(contas)` e soma os deltas dos 2 dias passados — conta duas vezes. Confirmado em `caixa/page.tsx` |
| 1.4-A | Não há saldo inicial/final por dia; só "Saldo do dia" e "Saldo acumulado" |
| 1.5 | `cashByDay` usa `cashAll` (sem o filtro `de/ate`); a tabela usa `cash` filtrado |
| 1.6 | Rótulo Realizado/Hoje/Projeção é só data |
| 1.0 | A tela mostra `(auto|manual)` por conta, sem data; importar fica dentro da aba Lançamentos; "Open Finance não configurado" é só rótulo |
| 2.1 | `toggleConciliado`: valida tenant (corrigido no AK), **não** verifica versão congelada, **audita** (`conciliacao.flag`, acrescentado no AK) — falta a versão e o vínculo |
| 2.7 | `importCash` marca `rec = true` por valor+mês sem guardar com o quê casou |
| 2.9 | `pairMovimento` audita (`extrato.pair`) e chama `conciliarDespesa` (que audita) — ok; o que falta é valor |
| 3-A | `CaixaEntryForm` tem receita / despesa / ajuste; `addCash` só é chamado por ele (e por um teste com `tipo: "ajuste"`) |
| 4.2 | Ajuste: descrição livre e opcional; permissão `caixa:criar`; não entra em saldo nenhum |
| 9 | `closeDia` recebe tudo do cliente (saldo inicial = `saldoDisponivel` de hoje, divergência digitada), insere sem verificar duplicata, grava `carry_over` (ninguém lê), `projectId` sempre nulo, `entityId` = o dia |
| 9.8 | **Balanço do Dia** (`/balancodia`) lista `daily_closing` (dia, obra, cliente, saldo inicial, entradas, saídas, saldo final, divergência, responsável, fechado em), com filtro e exportação: **já é o histórico de fechamentos** — `/fechamento` pode ser absorvida sem perder consulta |

## Base local

- `cash_entry`: 46 linhas (24 "extrato" pendentes, 21 "extrato" `rec` sem
  vínculo, 1 ajuste). **BL-2 local: 22 `rec = true` sem vínculo** (21 da
  conciliação automática da importação + 1 ajuste, que nasce conciliado), em
  8 meses de 2026 e 1 sem data. Nenhum é alterado.
- `daily_closing`: 0 · `carry_over`: 0 · `acerto`: 0 · nenhuma conta sem
  agência/número (BL-1 só em produção).

## Bloqueios

| | Decisão adotada |
|---|---|
| **BL-1** | **Confirmar com o usuário, conta a conta.** A troca de tipo para "Terceiros" é alteração de dado da empresa: a prévia do efeito está no SQL (`saldo_hoje` × `saldo_depois`). Nada é trocado por código. A tela de Contas já permite editar o tipo e mostra o total por tipo |
| **BL-2** | Consulta pronta (por tenant/mês e por caminho). Esses movimentos passam a exibir **estado próprio** "conciliado sem vínculo" e vão para a lista de conferência; nenhum `rec` é limpo |
| **BL-3** | **Sim: status derivado.** `Pago` só quando a soma dos vínculos (e dos pagamentos por parcela) cobre o valor; parte → "Parcialmente paga"; nada → o status atual. É mudança de comportamento em tela diária: fica documentada e com teste (10) |

## Decisões de modelagem (para o usuário conferir)

1. **Vínculo com valor (2.2):** tabela nova `conciliacao_despesa
   (cash_entry_id, despesa_id, valor, criado_por/em, desfeito_em/por/motivo)`,
   N:N com valor, no molde de `conta_receber_recebimento`. As quatro colunas
   antigas continuam sendo gravadas (a primeira despesa vinculada) e **nenhum
   vínculo existente é convertido** (2.8). O lado do recebível continua no
   módulo do Prompt K.
2. **Cadeia de saldo (1.4-A / 9.2):** por conta e no total. Saldo **em
   conta** do dia D = saldo atual do extrato − movimentos posteriores a D
   (calculado para trás); saldo **conciliado** do dia = conciliado anterior
   + entradas conciliadas − saídas conciliadas + ajustes, encadeado. O ponto
   de partida da janela é o `saldo_final` gravado no fechamento do dia
   anterior quando existe; senão, o saldo em conta calculado daquele dia.
   Teste automatizado da identidade inicial(D) = final(D−1).
3. **Permissões próprias (4.2.2 / 5.1):** `PermAction` é fixo
   (ver/criar/editar/excluir), então entra uma tela nova na matriz:
   `conciliacao` ("Conciliação — desfazer e ajustar", módulo Conciliação de
   Caixa): **ajuste = `conciliacao:criar`**, **desfazer = `conciliacao:excluir`**.
   Owner/admin nascem com tudo; membro restrito nasce negado (é o bloqueio
   intencional de 5.2). **Pergunta:** o Prompt M prevê outra forma? Se sim,
   troca-se o id, não o mecanismo.
4. **Fechar o dia (9):** vira ação no cartão; valores calculados no servidor
   (nunca do cliente); saldo inicial = `saldo_final` do fechamento anterior;
   divergência calculada; **constraint única `(tenant_id, dia)` criada por
   migração que só a cria se não houver duplicata** (um `DO` que verifica e,
   havendo duplicata, avisa e não cria — a decisão é humana); verificação na
   action sempre. Reabrir = operação própria (`conciliacao:excluir`), com
   auditoria. `carry_over` para de ser gravado; a tabela fica. `/fechamento`
   sai do menu e da rota **porque o Balanço do Dia já é o histórico** (9.8);
   o teste do menu passa a declarar 39 telas antigas.
5. **3-A:** os formulários de receita e despesa saem da tela (o `addCash`
   fica, com os três tipos); movimento sem contraparte **encaminha** para
   /despesas (saída) ou /contasreceber (entrada) com data, valor e histórico
   na URL (o mesmo `prefill` do Prompt U). Abas: **Conciliação** e
   **Ajustes**. A aba Previstas sai (duplica Contas a Pagar/Receber).
6. **Três estados da despesa (6.2):** derivados: Em aberto (nada pago),
   Baixado (pagamento por parcela sem vínculo com extrato) e Baixado e
   conciliado (vínculo com valor). Indicador permanente do baixado sem
   conciliar, com idade.
7. **Assistente (8-A):** puro, "propõe, você confirma": pares com grau e
   motivo (reaproveita a lógica de `getConciliacaoData`, exposta como função
   pura), agrupamento (subconjunto de despesas do mesmo fornecedor cuja soma
   fecha com o movimento), explicação da diferença do dia pelas quatro
   naturezas, encaminhamento, e as seis análises. Nenhum caminho concilia
   sem confirmação; o painel não tem botão de ajuste.

## Plano de PRs

| PR | Entrega |
|---|---|
| L-1 | Parte 1: `calc/cadeia-caixa.ts` (dois saldos por dia, encadeados; quatro naturezas; correção do acumulado), topo da tela com os dois saldos por conta e total, última atualização e alerta, importar e Open Finance no topo, cartões com inicial/final em conta e conciliado, rótulo realizado conciliado/pendente, faixa de dias declarada independente do filtro |
| L-2 | Parte 2: migração `conciliacao_despesa` + `conciliacao` na matriz; `conciliarDespesa` com itens e valor (soma ≤ movimento, `FOR UPDATE`, status derivado, pagamento por despesa), `toggleConciliado` corrigido, `importCash` grava vínculo inequívoco e propõe o resto, desfazer com permissão própria, estado "conciliado sem vínculo" |
| L-3 | Partes 3-A, 4, 6: só ajuste na tela (motivo, permissão, aviso, aba Ajustes com saldo antes/depois), encaminhamento com dados, três estados e indicador do baixado sem conciliar |
| L-4 | Parte 9: fechar o dia no cartão, cadeia por `daily_closing`, constraint condicional, reabrir, `carry_over` parado, `/fechamento` absorvida |
| L-5 | Assistente 8-A e relatório final |

## Antes/depois (base local, consulta 22)

| tabela | linhas | soma | marca |
|---|---|---|---|
| cash_entry | 46 | 1.793,14 | 22 rec |
| bank_account | 4 | 0 | 4 ativas |
| despesa | 75 | 43.701,75 | 24 "Pago" |
| daily_closing | 0 | — | — |
| carry_over | 0 | — | — |
| acerto | 0 | — | — |

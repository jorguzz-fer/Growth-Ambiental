# Etapa 6 · Prompt AT, seções 3, 4 e 6 — relatório

**Data:** 12/11/2026 · **Spec:** `docs/revisao/SPEC-REVISAO-2026-11.md`, Anexo A

Esta parte entrega a §3 (o movimento é da conta), a §4 (a tela por conta) e a
§6 (cartões na conciliação). As seções 1-B, 5, 7 e 8 vêm nos próximos PRs.

## Chave nova: "caixa_conciliacao_por_conta"

Nasce **desligada**. Desligada, o Caixa é exatamente o de antes (por obra, com
seletor de obra e de versão), e o extrato importado continua nascendo na obra
da tela. Ligada:

- o Caixa vira **Conciliação de Caixa**: sem seletor de obra, sem seletor de
  versão, sem modo comparação; mostra a versão Atual de todas as obras;
- os **cartões** entram no bloco de saldos, depois das contas;
- **cada conta ou cartão é clicável** e filtra a tela (`?conta=`); "Todas as
  contas" volta ao consolidado; cada linha mostra quantos movimentos faltam
  conciliar;
- o extrato importado (e o do Open Finance) **nasce só com a conta**; a obra
  vem do vínculo;
- o ajuste de caixa tem obra **opcional** (BAT-3, ver abaixo).

A prévia está em Chaves, no cartão "Prévia · Caixa: conciliação por conta":
movimentos, pendentes e sem obra por conta, e o realizado de cada obra pelas
duas leituras (tem de ser igual).

## Decisões adotadas sem resposta do dono (provisórias, a confirmar)

| Bloqueio | O que foi feito | Por quê |
| --- | --- | --- |
| BAT-2 | Movimento sem vínculo entra no saldo da **empresa** e no realizado de **nenhuma obra** ("não atribuído a obra") | É a proposta do revisor |
| BAT-3 | Com a chave ligada, o ajuste de caixa tem **obra opcional**: com obra, vai para ela; sem obra, é da empresa | Sem seletor de obra na tela, exigir obra obrigaria um campo novo; com ele opcional, nada se perde |

## §3 · O movimento pertence à conta

- **Migração 0073** (aditiva, com `down/`): `cash_entry.version_id` passa a
  aceitar nulo. Nenhuma linha é alterada.
- **Regra da obra** (`src/lib/movimento-obra.ts`): a obra de um movimento sem
  obra é a do item com que foi conciliado — despesa (vínculo com valor ou o
  1:1 antigo), conta a receber (recebimento ou o 1:1 antigo), pagamento de
  fatura (§6.4). Movimento dividido entre obras tem várias obras, cada uma com
  a parte do vínculo. O resto é "não atribuído".
- **Os movimentos que já existem não mudam de obra** (§3.2): continuam na
  versão que têm, mesmo que vinculados a despesa de outra obra (AT-T6).

### Os pontos que liam `cash_entry` por versão, e como ficaram

| Ponto | Arquivo | Como ficou |
| --- | --- | --- |
| Fluxo de Caixa, realizado | `src/lib/fluxo-caixa.ts` (`flowMapsRealizado`) | Gravados na versão + a parte dos sem obra atribuída a ela (`realizadoDaVersao`) |
| Dashboard, realizado | `src/app/(app)/dashboard/page.tsx` | Idem |
| Status do projeto (Dashboard, Projetos) | `src/lib/queries.ts` (`getStatusProjeto`) | Idem, para todas as versões consultadas |
| Cadeia de saldo da empresa e fechamento do dia | `src/lib/queries.ts` (`getCashDaEmpresa`) → `cadeia-da-empresa.ts`, `actions/fechamento.ts` | Passam a incluir os movimentos sem obra (são da conta e do saldo da empresa) |
| Backup (planilha do semestre) | `src/lib/queries.ts` (`getCashByTenant`) → `backup.ts` | Inclui os movimentos sem obra |
| Entradas disponíveis para conta a receber | `src/lib/queries.ts` (`getEntradasDisponiveis`) | A entrada sem obra serve a qualquer obra |
| Conciliação (tela) | `src/lib/queries.ts` (`getConciliacaoData`) | Por versão (tela de antes) ou da empresa, opcionalmente de uma conta (tela por conta) |
| Trava de versão congelada ao conciliar | `src/lib/actions/caixa.ts` (`toggleConciliado`, `conciliarMovimento`) | Movimento sem obra não tem versão a congelar |
| Converter movimento em conta | `src/lib/actions/caixa.ts` (`criarContaFromExtrato`) | Movimento sem obra pede a obra da conta criada |
| Importação do extrato, pareamento e lançamento da triagem | `src/lib/actions/caixa.ts` | Chave ligada: nasce sem obra; a conciliação automática procura em todas as obras, e continua exigindo candidata única |
| Open Finance | `src/workers/sync-openfinance.ts` | Chave ligada: nasce sem obra |
| Prévia do Dashboard (versões que não são a Atual) | `src/lib/dashboard-previa.ts` | Sem mudança: movimento sem obra nunca é de uma versão que não é a Atual |
| Inventário antes de excluir projeto | `src/lib/queries.ts` (`getInventarioDoProjeto`) | Sem mudança: conta só o que está gravado na obra |
| Relatórios Customizados | `src/lib/relatorio-custom-dados.ts` | Sem mudança: lê o previsto (`flowMaps`), não o extrato |
| Métrica "saldo" da Cris | `src/lib/chat-metricas.ts` | Sem mudança: lê o saldo das contas, não o extrato |

## §4 · A tela por conta

Arquivo novo `src/app/(app)/caixa/caixa-por-conta.tsx`; a tela de antes ficou
intacta em `page.tsx` (só a tabela de movimentos mudou de arquivo, para as duas
usarem). O layout e a ordem dos blocos não mudaram (prints abaixo).

- 4.4 · o diálogo de importar vem com a conta escolhida; sem campo de obra.
- 4.6 · a faixa de dias segue a conta escolhida; o fechamento do dia só existe
  no consolidado (é da empresa).
- 4.7 · `?proj=` e `?vs=` de links antigos são ignorados.
- Os atalhos "lançar em Despesas / Contas a Receber" abrem com "Todos os
  projetos": a obra é escolhida no próprio formulário.

## §6 · Cartões na conciliação

- **Migração 0074** (aditiva, com `down/`): `extrato_cartao.despesa_id`,
  `conciliado_por`, `conciliado_em`, `external_id` (único por cartão) e
  `cartao_credito.open_finance_id` (para a §1-B).
- **6.1** · cartão escolhido: as linhas do extrato por fatura, com sugestões
  (mesma fatura e mesmo valor = alta; fatura vizinha ou valor próximo = média,
  pela conferência do Prompt U). Conciliar só com candidata do servidor.
- **6.2** · "Lançar despesa a partir desta linha" abre Despesas preenchida
  (cartão, data, valor, descrição); ao salvar, a linha é conciliada com a
  compra. A importação continua sem criar despesa.
- **6.3** · crédito ou estorno não concilia com compra: segue o estorno.
- **6.4** · a saída do pagamento da fatura na conta corrente concilia com o
  pagamento da fatura (sugestão própria na lista de saídas). Como na
  conciliação de despesas, **a linha do extrato passa a ser a saída**: o
  pagamento aponta para ela e a saída que o app tinha gerado no pagamento sai,
  para a mesma saída não contar duas vezes. A linha removida fica inteira na
  auditoria (`cartao.fatura.conciliar`). Só com o clique da pessoa.
- **6.5** · cada fatura mostra total do extrato, total conciliado e diferença.

## Testes

| Teste | Arquivo |
| --- | --- |
| AT-T5 (R$ 1.000 dividido entre duas obras) | `src/lib/movimento-obra.test.ts` |
| AT-T6 (movimento antigo continua na obra; realizado igual ao de antes) | `src/lib/movimento-obra.test.ts` |
| BAT-2, BAT-3, importação com a chave ligada e desligada | `src/lib/movimento-obra.test.ts` |
| AT-T10 (5 linhas, 4 compras, lançar a partir da linha, diferença zero) | `src/lib/cartao-conciliacao.test.ts` |
| AT-T11 (pagamento da fatura sem saída nova) | `src/lib/cartao-conciliacao.test.ts` |
| Candidata de fora recusada; desfazer com motivo; crédito pelo estorno | `src/lib/cartao-conciliacao.test.ts` |
| AT-T12 (sem seletores; `?proj=` e `?vs=` ignorados) | `src/lib/caixa-por-conta.test.ts` |
| AT-T13 (filtro por conta) | `src/lib/caixa-por-conta.test.ts` |
| AT-T14 (print antes × depois) | prints no pacote do revisor |

Suíte completa com banco: 278 arquivos, 2.234 testes, nenhum pulado. Build ok.

## Para ligar numa empresa

1. Abrir a prévia em Chaves e conferir que o realizado de cada obra é igual
   nas duas colunas.
2. Ligar a chave. Desligar volta à tela de antes; os movimentos que nasceram
   sem obra continuam no saldo da empresa (a migração de volta da 0073 só roda
   depois de decidir a obra deles).

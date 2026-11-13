# Prompt L — Caixa e Conciliação · Relatório final

PRs: #181 (Fase 1), #182 (L-1), #183 (L-2), #184 (L-3), #185 (L-4), L-5
(assistente). Docs: `V2-PROMPT-L-FASE1.md`, `-PR1` a `-PR5`; SQL em
`docs/sql/v2-prompt-l-diagnostico.sql`. Em português simples, item a item do
relatório obrigatório.

## 1. BL-2 — `rec = true` sem vínculo (nenhum alterado)
Base local, tenant Cliente Piloto (incorporadora): **21 movimentos, R$ −12.465,60**, por
mês: 01/2026 (3, −1.921,20), 03/2026 (6, −3.561,60), 05/2026 (3, −1.640,40),
07/2026 (3, −1.710,60), 09/2026 (3, −1.780,80), 11/2026 (3, −1.851,00). A
consulta está no SQL (bloco BL-2) para rodar em produção. **Nenhum `rec` foi
limpo**: eles aparecem como estado próprio ("sem vínculo") na tabela e no
assistente.

## 2. BL-1 e BL-3
- **BL-1** (contas de terceiro): decisão humana; a tela de Contas Correntes
  (Prompt X) permite reclassificar/inativar com inventário. Nada removido.
- **BL-3** (conciliação parcial altera o status): **sim** — o status passou a
  ser **derivado** da soma dos vínculos ("Parcialmente paga" / "Pago"), e só
  quando a soma fecha o movimento fica `rec`.

## 3. Modelo de vínculo
Tabela nova `conciliacao_despesa` (migração 0058): N:N com **valor** por
vínculo, `pagamento_id` do registro de pagamento que gerou, `origem`
(manual/importacao), e estorno lógico (`desfeito`, com motivo). As quatro
colunas antigas de `cash_entry` (`conciliado_despesa_id/conta_receber/por/em`)
**ficam e continuam gravadas**; nenhum vínculo antigo foi convertido.

## 4. Saldo conciliado e encadeamento
`src/lib/calc/cadeia-caixa.ts`: conciliado(D) = conciliado(D−1) + entradas
conciliadas − saídas conciliadas + ajustes. O início da janela é o
`saldo_final` do fechamento gravado do dia anterior, se existir; senão, o saldo
em conta calculado daquele dia. Desde a PR 4 a cadeia é **da empresa** (todas
as obras), porque as contas são do tenant.

## 5. Correção do acumulado
O saldo em conta de um dia é calculado **para trás**: saldo atual da conta −
movimentos importados posteriores ao dia. Nunca soma movimento já refletido no
saldo. Efeito: cada cartão mostra inicial e final (em conta e conciliado), o
inicial de cada dia é exatamente o final do anterior (teste
`quebrasDaCadeia`), dia futuro só projeção.

## 6. As quatro naturezas
Por movimento do dia: importado e não conciliado → **extrato sem lançamento**;
não importado, conciliado e não ajuste → **lançamento sem extrato**; mesma
linha num dia como extrato e noutro (até 3 dias) como lançamento, mesmo valor
→ **data trocada** (pareamento); divergência de valor dentro de um vínculo →
**valor divergente**.

## 7. `toggleConciliado` e `importCash`
- `toggleConciliado`: valida tenant e versão congelada, exige a contraparte
  (não marca `rec` sem vínculo) e registra auditoria.
- `importCash`: continua importando igual; **passou a gravar vínculo** (via
  `gravarVinculos`, origem `importacao`) só quando a correspondência é
  inequívoca, e nunca marca `rec` automaticamente; o resto vira proposta.
- **7a.** `addCash` só era chamado por `caixa-entry-form.tsx`, que nenhuma tela
  renderava desde a PR 3; o componente foi removido na PR 5. A ação fica.
- **7b.** Encaminhamento: `linkParaLancar` monta a URL com `pf_valor`,
  `pf_venc`, `pf_comp`/`pf_desc`, `pf_obs` e `pf_cash`; Despesas e Contas a
  Receber abrem preenchidos e, ao gravar a despesa, o movimento reservado é
  vinculado.

## 8. Status derivado
`estadoDaDespesa` (Em aberto / Baixada / Baixada e conciliada / Cancelada) +
`statusGravado` derivado da soma dos vínculos/pagamentos. Contas a Pagar,
Dashboard e (ex-)Fechamento leem o status gravado — como não há vínculo com
valor na base local (0 em `conciliacao_despesa`), **nenhum número mudou**.
Onde um vínculo parcial for gravado, a despesa passa a "Parcialmente paga" e
o Pendente diminui pelo valor vinculado — explicado na tela.

## 9. Permissão de desfazer
Tela `conciliacao` na matriz ("Conciliação — ajustar e desfazer"): **desfazer
= excluir**, **ajuste = criar**, **reabrir o dia = excluir**. Owner/admin
nascem com tudo; membro restrito nasce negado. Pergunta ao Prompt M fica
aberta (troca-se o id, não o mecanismo).

## 9a. Cadeia inicial/final
Ver 4 e 5. Testes `cadeia-caixa.test.ts` (4 / 4a / 4b / 4c / 4e / 5i / 9.3 /
9.6) e `quebrasDaCadeia` em cada cenário.

## 9b. Assistente
Puro (`caixa-analise.ts`): pares pela candidata da conciliação com grau
(alta/média/baixa, pelos mesmos critérios de valor exato/aproximado, data
próxima e nome do fornecedor) e motivo calculado dos dados; inequívoco só com
candidata alta única e exclusiva; agrupamento por subconjunto do mesmo
fornecedor; explicação pelas linhas; encaminhamento; seis análises. **Não há
caminho sem confirmação humana**: o único gravador é `conciliarMovimento`,
por clique; teste de arquivo trava a ausência de ajuste/baixa/alteração.

## 9c. Balanço do Dia
Lista `daily_closing` (dia, obra, cliente, saldo inicial, entradas, saídas,
saldo final, divergência, responsável, fechado em) e agora a **situação**
(fechado / reaberto em … por … · motivo). O histórico continua consultável.

## 9d. Dias com mais de um fechamento
Base local: `daily_closing` tem 0 linhas. Em produção, a migração 0059
**só cria o índice único se não houver duplicata**; havendo, avisa e segue.
Consulta no SQL (bloco 9.5). **Nenhuma linha é apagada.**

## 9e. `carry_over`
A action não grava mais; a tabela fica (0 linhas localmente); nenhuma linha
apagada. Teste cobre.

## 10. DRE
Continua sem ler `cash_entry` — teste `dre-sem-caixa.test.ts` trava.

## 11. Importação de extrato
O parser e a importação não mudaram; o que mudou foi só o que acontece
**depois** de importar (vínculo inequívoco com rastro, sem `rec` automático).

## 12. Antes e depois (base local)
| tabela | antes | depois |
|---|---|---|
| cash_entry | 46 · R$ 1.793,14 · 22 rec | 46 · R$ 1.793,14 · 22 |
| bank_account | 4 · saldo 0 · 4 ativas | 4 · 0 · 4 |
| despesa | 75 · R$ 43.701,75 · 24 pagas | 75 · R$ 43.701,75 · 24 |
| daily_closing / carry_over / conciliacao_despesa / pagamento / acerto | 0 | 0 |
Dashboard, Contas a Pagar e Balanço do Dia: mesmos números (nenhum status
derivado mudou porque não há vínculo com valor).

## 13. Migrações
- **0058** `conciliacao_despesa` (+ `down/`).
- **0059** `daily_closing` (6 colunas + índice único parcial condicional)
  (+ `down/`).
Ambas aditivas, `IF NOT EXISTS`, aplicadas localmente. **Produção:** aplicar
na ordem, conferindo o `NOTICE` da 0059.

## 14. Limitações e perguntas
- A cadeia virou **da empresa** (PR 4): conciliar obra por obra exigiria conta
  corrente por obra — decisão de modelagem sua.
- Permissão via tela `conciliacao`: confirmar no Prompt M.
- Fechar o dia **não trava** (bloqueio menor do 9.6): travar é decisão de
  negócio; não implementado.
- O assistente não usa modelo de linguagem: as propostas são determinísticas
  sobre os dados carregados (histórico, valor, data, fornecedor).
- Agrupamento limitado a 12 contas por fornecedor e 6 por grupo (custo).

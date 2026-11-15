# GA-11 · §1 — Inventário das funções de conciliação

Levantado no código de 15/11/2026, antes de qualquer mudança.

**Regra:** nenhuma função de conciliação se perde. Só podem ser **removidos** o seletor de projeto, o seletor de versões e a comparação entre versões.

## Onde a conciliação mora hoje

| Lugar | Arquivo | Quando aparece |
|---|---|---|
| Tela antiga ("Controle de Caixa") | `caixa/page.tsx`, depois do `if (chaveLigada("caixa_conciliacao_por_conta"))` | empresa com a chave desligada (criada antes do GA-1) |
| Tela nova ("Conciliação de Caixa") | `caixa/caixa-por-conta.tsx` | empresa com a chave ligada (nova, demo) |
| Conferência do cartão | `cartoes/page.tsx` → `extrato-cartao.tsx` (conferência e estorno), `faturas-cartao.tsx` (faturas e pagamento), `projecao-cartao.tsx` | sempre, em `/cartoes` |
| Conciliação do cartão no Caixa | `cartao-conciliacao.tsx` → `cartao-conciliacao-lista.tsx` | tela nova, cartão clicado no quadro de saldos |

As duas telas de Caixa usam os **mesmos componentes** de conciliação (`Conciliacao`/`ConciliacaoReview`, `AssistenteCaixa`, `CadeiaDias`, `SaldosCaixa`, `AjustesCaixa`, `ImportExtratoButton`). A diferença é de onde vêm os dados (uma versão de uma obra × a empresa) e o que só uma delas tem.

## Tabela

**Destino:**

- **Contas** = aba Contas correntes;
- **Cartões** = aba Cartões de crédito;
- **Ajustes** = aba Ajustes;
- **Topo** = cabeçalho, barra de filtros, cartões do dia, faixa dos caminhos ou cadeia de saldo (comuns às abas).

**Teste:** o que já existe hoje, mais o que entra no GA-11 (§7, marcado com *novo*).

### Filtros, resumo e saldos

| Função | Onde está hoje | Onde fica depois | Teste |
|---|---|---|---|
| Período (De/Até) e "Confirmar período" (`DateRangeFilter`) | antiga e nova | Topo, barra de filtros | *novo* checklist §3.5 |
| Seletor de projeto (`ProjectPicker`, `lerSelecaoDeProjeto`, `LembrarProjeto`, `RecuperarProjeto`) | antiga | **removido** (decisão 2) | *novo* teste 1 e 2 (`?proj=` ignorado) |
| Seletor de versões (`VersionMultiSelect`, `resolveCompareVersions`) | antiga | **removido** (decisão 2) | *novo* teste 1 e 2 (`?vs=` ignorado) |
| Comparação entre versões (`VersionCompareTable`, entradas/saídas/saldo por versão) | antiga | **removida** (decisão 2) | *novo* teste 1 |
| Estados "Selecione um projeto", "Projeto sem versões" | antiga | **removidos**: a tela não depende de obra. Ficam os vazios de conta e de cartão | *novo* checklist (estados vazios) |
| Filtro de conta por clique no quadro (`?conta=`) e link "Todas as contas" | nova | Topo: **seletor visível** (§3.1); o clique no quadro continua escolhendo | *novo* teste 3 |
| Cartões do dia (entradas, saídas, saldo) | antiga (empresa) e nova (segue a conta) | Topo, segue o seletor | *novo* teste 3 |
| Quadro "Os dois saldos" por conta: em conta, conciliado, diferença, atualização, selo de pendências, total das ativas (`SaldosCaixa`) | antiga (sem selo) e nova | Contas (só contas correntes) | `caixa-cartoes`/`saldos` existentes + *novo* |
| Cartões no quadro de saldos (`SaldosCaixa cartoes=`) | nova | **Cartões**: quadro próprio por cartão (§3.3) | *novo* teste 4 |
| Total de ajustes e "baixado sem conciliar" com idade | antiga e nova | Contas (no quadro) | existente (`getBaixadoSemConciliar`) |

### Os três caminhos

| Função | Onde está hoje | Onde fica depois | Teste |
|---|---|---|---|
| Faixa dos três caminhos, com contador de pendências (`FaixaDeConciliacao`) | nova | Topo; na aba Cartões, "Subir extrato" vira "Subir fatura" | *novo* checklist |
| Subir extrato da conta: XLSX/CSV, PDF com texto e PDF/imagem por IA; prévia; casar com candidatos; lançar o que falta (`ImportExtratoButton`: `importCash`, `extractExtratoPdf`, `matchCandidatosMovimento`, `pairMovimento`, `criarLancamentoDoExtrato`) | antiga (extrato com obra) e nova (com a conta, sem obra) | Contas e Topo. Comportamento da nova: extrato nasce na conta, sem projeto (BAT-2) | existentes (`import-extrato`) + *novo* teste 5 |
| Open Finance: situação, conectar, sincronizar, possível duplicado (`open-finance.tsx`: `sincronizarAgora`, `decidirPossivelDuplicado`) | antiga e nova | Topo (caminho) | existentes (`openfinance.test`) + *novo* teste 6 (grava sem versão) |
| Conciliar com a Cris (botão `data-conciliar-com-cris`) | nova | Topo, nas duas abas, com a conta ou o cartão escolhido | *novo* §4 |

### Conciliação de conta corrente

| Função | Onde está hoje | Onde fica depois | Teste |
|---|---|---|---|
| Pendentes de saída × contas a pagar, com grau de compatibilidade; um movimento para várias despesas, com valor por vínculo (`ConciliacaoReview` → `conciliarMovimento`) | antiga e nova | Contas | existentes (`conciliacao*.test`) + *novo* teste 5 |
| Pendentes de entrada × contas a receber; um depósito para várias parcelas (`conciliarContaReceber`) | antiga e nova | Contas | existentes |
| Recebimento de parcela de venda (`conciliarParcelaDeVenda`) | antiga e nova (só com dados de incorporação) | Contas, sem mudança. Sai com o GA-9 Fase 3 | existente |
| Pagamento de fatura de cartão na conta corrente (`conciliarPagamentoDeFatura`, `data-sugestao-fatura`) | antiga e nova | Contas | existente (`cartao-conciliacao.test`) + *novo* teste 5 |
| "Falta cadastrar": criar conta a pagar/receber a partir do extrato (`criarContaAPartirDoExtrato`) | antiga (obra da tela) e nova (escolhe a obra) | Contas (escolhe a obra, opcional) | existente |
| Conciliados, com desfazer e motivo para a auditoria (`desfazerConciliacao`; permissão `conciliacao:excluir`) | antiga e nova | Contas | existentes |
| Tabela "Todos os lançamentos de caixa", com marcar/desmarcar (`CashTable` + `ConciliarToggle` → `toggleConciliado`), selos "divergência" e "sem vínculo" | antiga e nova (com coluna Projeto) | Contas, com a coluna **Conta** em "Todas" | *novo* teste 3 |
| Perguntar à Cris sobre um pendente (`data-perguntar-cris`) | antiga e nova | Contas | existente |

### Cartão de crédito

| Função | Onde está hoje | Onde fica depois | Teste |
|---|---|---|---|
| Conciliação linha a linha: linha da fatura × compra lançada, com sugestões e grau (`CartaoConciliacaoLista` → `conciliarLinhaDoCartao`) | nova (cartão clicado) | **Cartões** | existente (`cartao-conciliacao.test`) + *novo* teste 4 |
| Desfazer a conciliação da linha, com motivo (`desfazerLinhaDoCartao`) | nova | Cartões | existente + *novo* |
| Totais por fatura: extrato, conciliado, diferença | nova | Cartões (quadro por cartão e por fatura) | *novo* |
| Lançar despesa a partir da linha (link para Despesas preenchido; nada nasce sozinho) | nova e `/cartoes` ("Lançar em Despesas →") | Cartões, como **proposta** | *novo* teste 4 |
| Subir fatura: XLSX/CSV (data, descrição, valor) e PDF/imagem por IA com prévia, "Registrar" sem duplicar e sem lançar despesa (`lerFaturaCartaoPdf`, `importarExtratoCartao`) | `/cartoes` | **Cartões** ("Subir fatura") | existentes (`cartao-extrato.test`) + *novo* |
| Conferência em blocos: no extrato sem lançamento, lançado sem extrato, divergências de valor ou data, créditos (`conferirExtrato`) | `/cartoes` | **Cartões** | existentes (`cartao-conferencia.test`) |
| Crédito do extrato: registrar estorno ou reconhecer o estorno antecipado (`registrarEstorno`, `vincularCreditoAoEstorno`), só por ação do usuário | `/cartoes` | **Cartões** | existentes |
| Estorno antecipado (formulário: compra, valor, data) | `/cartoes` | **Cartões** | existente |
| Faturas, compras da fatura, pagamento da fatura, projeção, cadastro | `/cartoes` | **Ficam em `/cartoes`** (fora da conciliação), com o link "Conciliar na Conciliação de Caixa → aba Cartões" | existentes |
| Assistente dos cartões (`AssistenteCartoes`) e Cris de `/cartoes` | `/cartoes` | Ficam em `/cartoes`; a leitura da conferência vai para a Cris da aba Cartões | existente + *novo* §4 |

### Ajustes, cadeia de saldo e fechamento

| Função | Onde está hoje | Onde fica depois | Teste |
|---|---|---|---|
| Lista de ajustes com obra, conta, autor, data, saldo antes/depois e cadeia longa (`AjustesCaixa`, `getAutoresDosAjustes`) | antiga (obra da tela) e nova (obra opcional) | Ajustes, com o seletor (contas e cartões) | existentes + *novo* teste 6 |
| Lançar ajuste (`AjusteCaixaForm` → `addAjuste`; projeto opcional, BAT-3) | antiga e nova | Ajustes | existentes + *novo* teste 6 |
| Cadeia de saldo: 2 dias realizados, hoje, 7 à frente, em conta e conciliado, previsto a pagar/receber, atrasados (`CadeiaDias`) | antiga (empresa) e nova (segue a conta) | Topo, segue o seletor | existentes (`cadeia-caixa.test`) |
| Fechar e reabrir o dia (`fecharDia`, `reabrirDia`) | antiga e nova (só no consolidado) | Topo (só em "Todas", como hoje) | existentes (`fechamento.test`) |
| Dias fechados (histórico) | antiga e nova | Topo | existente |

### Assistente e Cris

| Função | Onde está hoje | Onde fica depois | Teste |
|---|---|---|---|
| Assistente IA: pares propostos, agrupamentos, diferença do dia, falta cadastrar, análises; confirmar par (`AssistenteCaixa` → `conciliarMovimento`) | antiga e nova | Painel à direita, segue o seletor | existentes (`caixa-analise.test`) |
| Cris da tela (`CrisDaTela`): conta escolhida, saldos, faixa, pendências | antiga (empresa) e nova (só a conta) | Todas as abas, com aba, conta/cartão, período, saldos e pendências | *novo* §4.1 |
| Cris: `pendentes_de_conciliacao`, `candidatos_de_conciliacao`, `propor_conciliacoes` (lote, gravado pelo botão `confirmarConciliacoes`), `ler_extrato` (anexo no chat) | chat (conta corrente) | Igual, respeitando conta e "todas" | existentes (`conciliacao-cris*.test`) + *novo* §4.1 |
| Cris no cartão | **não existe** | *novo* §4.2: `pendentes_do_cartao`, `candidatos_do_cartao`, `propor_conciliacoes_cartao`, `ler_fatura` | *novo* teste 9 |

## Resultado

- **A tela antiga não tem função de conciliação que a nova não tenha.** O que é só dela é exatamente o que a decisão 2 remove: seletor de projeto, seletor de versões, comparação entre versões e os estados "selecione um projeto"/"sem versões".
  - As diferenças de comportamento ficam com a nova, já confirmada pelo dono em 14/11: extrato nasce na conta e sem obra (BAT-2), ajuste com obra opcional (BAT-3).
  - Nada precisa ser trazido da antiga.
- **A conciliação do cartão está em dois lugares que se completam.**
  - O Caixa tem a conciliação linha a linha.
  - `/cartoes` tem subir fatura, a conferência em blocos e o estorno.
  - A aba Cartões junta as duas. `/cartoes` fica com cadastro, faturas, pagamento e projeção, e com o link para a aba.
- **Falta a Cris no cartão:** as quatro ferramentas da §4.2.

### Código que sai (previsto; o relatório final confirma)

- **`caixa/page.tsx`:** o ramo sem a chave inteiro.
- **`caixa-conciliacao.tsx`:** o modo por obra (`projectId`).
- **A chave `caixa_conciliacao_por_conta`:**
  - catálogo e `CHAVES_EMPRESA_NOVA`;
  - `caixa-conta-previa.ts` e a prévia em `/chaves`;
  - os ramos "desligada" em `actions/caixa.ts`, `actions/openfinance.ts`, `openfinance/sincronizar.ts` e `queries.ts` (`getConciliacaoData` por versão, se não tiver outro uso).
- **`extrato-cartao.tsx`:** sai de `/cartoes`. O conteúdo vai para a aba Cartões.

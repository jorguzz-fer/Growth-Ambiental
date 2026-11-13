# Prompt K · Fase 1 — inventário antes de escrever código

Prompt K (Contas a Receber, 10 de 42): materialização das parcelas, status
derivado, baixa e conciliação com valor por vínculo, edição no padrão de
Despesas, documentos e assistente. Este é o inventário: o que o código mostra
hoje, o que já foi feito por prompts anteriores, o que está bloqueado e como o
trabalho se divide. **Só leitura; nada foi alterado.**

## O fato que muda tudo: a tabela está vazia em produção

O diagnóstico de 30/09 (diagnóstico de produção do cliente anterior, removido; consultas 2 e 2b)
encontrou **zero linhas** em `conta_receber`, em todas as empresas. Ninguém lançou
conta a receber à mão; toda a receita de venda vive no plano de pagamento das
unidades e é expandida na hora. Consequências:

- **BK-4** respondido: nenhuma conta "Recebido" sem lastro; nada a conferir.
- **BK-3** sem legado: a tolerância de centavos nasce com a regra, sem caso
  antigo para decidir.
- **7.3** (domínio de `tipo` e `status`): nenhuma divergência gravada para
  reportar; o domínio pode ser fixado sem conversão.
- As migrações aditivas do prompt (origem da parcela, `conta_receber_id` em
  `document`, tabela de vínculo) não encontram dado para preservar — mas
  continuam com `IF NOT EXISTS` e `down`, por convenção.

## Bloqueios — situação

| | Situação | Fonte |
|---|---|---|
| **BK-0** · materialização só depois das §54/56/57 do Prompt I | **Em vigor.** Decisão: "(1) por enquanto" (BI-2); as seções 54, 56 e 57 são as PRs I-8/I-9, que esperam a variante do INCC (BQ-1) e as datas das obras sem início e fim. **A seção 2 deste prompt não entra** até lá. O código confirma o risco: `getMonthlyRevenue` soma `expandUnitReceivables` **e** `conta_receber` do projeto (não canceladas, pelo mês do vencimento) — materializar hoje dobraria a receita de cada venda | `queries.ts` (`getMonthlyRevenue`), `V2-BLOCO2-DECISOES.md` |
| **BK-1** · modelo de vínculo com o Caixa | **Lido** (abaixo). Decidido: valor por linha; `origem_cash_entry_id` preservada | `caixa.ts` |
| **BK-2** · INCC | **Decidido:** gravar nominal, corrigir na leitura (como a Projeção) | decisões 30/09 |
| **BK-3** · centavos | **Decidido:** mesmo conceito do Acerto Contábil (tolerância declarada, resíduo registrado) | decisões 30/09 |
| **BK-4** · recebidas à mão | **Nenhuma** (tabela vazia) | diagnóstico |

## O que o Caixa já tem (BK-1, leitura feita)

| Mecanismo | Onde | O que faz |
|---|---|---|
| `cash_entry.rec` | `toggleConciliado(id, rec)` | marca/desmarca o movimento como conciliado, **sem** dizer com quê. Auditoria `conciliacao.flag` |
| `cash_entry.import_hash` | importação do extrato | assinatura (conta, data, valor, doc) para não importar duas vezes |
| `pairMovimento` (entrada) | `caixa.ts` | **cria** uma `conta_receber` já "Recebido" (valor e data do movimento, `origem_cash_entry_id = mov.id`) e grava no movimento `conciliado_conta_receber_id`, `conciliado_por`, `conciliado_em`, `rec = true`. Vínculo **1 para 1, sem valor próprio**: o valor é o do movimento |
| `conciliarDespesa` | `caixa.ts` | o espelho do lado da despesa: marca a despesa paga e liga o movimento |
| `conta_receber.origem_cash_entry_id` | schema | rastreabilidade do item do extrato que originou a conta |

**Encaixe proposto (K-2):** uma tabela `conta_receber_recebimento` — uma
linha por recebimento, com `valor`, `data`, `forma` (extrato, espécie, repasse
de terceiro, outro), `cash_entry_id` **opcional** (presente = conciliado),
`justificativa` (obrigatória quando não há extrato, 3.4), `estornado_em/por/
motivo` (4.3, lógico). É o formato de `acerto_item`/`restituicao_item`, como o
BK-1 pede. O status da conta passa a ser **derivado** dessa tabela (3.2):
`A receber` sem linhas; `Recebida` com linhas sem `cash_entry_id`; `Recebida e
conciliada` quando o recebido conciliado cobre o valor (tolerância de
centavos, BK-3). A soma dos vínculos de um movimento não excede o valor dele
(4.2). `pairMovimento` passa a gravar **também** uma linha nesta tabela;
`origem_cash_entry_id`, `conciliado_conta_receber_id` e `rec` continuam
gravados como hoje (4.5): descontinuados como mecanismo, nunca removidos.

## O que já está feito por prompts anteriores

| Seção | Situação |
|---|---|
| 7.1 · CR-02 ordenação por vencimento | **Feito** na PR I-6: `getContasReceber` ordena por `chaveDataBR(vencimento)`, `createdAt`, `id` |
| 1.1.1 · o alerta de que mexer na conta muda a DRE | **Confirmado no código** (acima). Vale como regra para todas as PRs: nada aqui cria, cancela ou muda vencimento de conta por conta própria |
| Verificação de "ver" na página | **Feito** (Prompt M) |
| Fallback de projeto | **Feito** (Prompt A): o seletor tem "Todos os projetos" explícito |

## O que o código mostra, seção a seção

### 7.2 · CR-04 — valor

`createContaReceber` recusa só `valorCR === 0`; **negativo passa**.
`updateContaReceber` **não valida nada** (`normValor` devolve "0" para
inválido e grava). Correção pura: um helper `valorDeContaValido` usado nas duas.

### 7.3 · CR-05 — domínio

`tipo` e `status` são `text` sem lista no servidor. Em uso no código:
`tipo` ∈ {Sinal, Parcela mensal, Outros, Outras Receitas} (lista da tela);
`status` gravado por três caminhos: `"A receber"` (criação), o `<select>` da
edição (A receber / Parcialmente recebido / Recebido), `"Recebido"`
(`pairMovimento`) e `"Cancelada"` (cancelamento) — o comentário do schema diz
`Cancelado`. Sem dado em produção, o domínio é fixado no servidor **daqui em
diante**; a K-2 tira o `<select>` de status (3.2) e o campo deixa de ser
digitado em qualquer lugar.

### 7.4 · CR-06 — carga em memória

`contasreceber/page.tsx` chama `getContasReceber(tenant)` e
`getReceivables(tenant)` (todas as obras), filtra pelo projeto em memória e
monta uma terceira lista (`receitasBuscaveis`) inteira para o navegador. Passa
a filtrar na consulta (`projectId` opcional nas duas) e a busca recebe só o
projeto escolhido.

### 7.5 · CR-07 — unidade de outro projeto

`getUnitCodesByTenant` alimenta o `<select>` com os códigos da empresa
inteira. Com o projeto escolhido, só as unidades da Atual dele; com "Todos",
o select exige escolher o projeto antes (o formulário já exige `projectId`).

### 7.6 · CR-08 — identificador do recebível

`getReceivables` produz `refId = unitId:índice`; a página descarta ao mapear
`unitReceb`, e a tabela usa `key={i}`. Passar `refId` até o componente. É o
mesmo par (unidade, índice da parcela) que a seção 2.2 usará como chave de
origem da materialização — definir agora evita dois identificadores.

### 7.7 · CR-09 — retorno legível

As três actions lançam erro (`createContaReceber`, `updateContaReceber`,
`cancelarContaReceber`); `update`/`cancelar` ainda fazem `return` mudo sem
`id`. Convertem para `{ ok, error }` com mensagem na tela — pré-condição do
assistente (8), como em J-2.

### 3 · estados e baixa

Hoje: `status`, `valorRecebido` e `dataRecebimento` são campos **digitados**
no formulário de edição (CR-01: dá para marcar "Recebido" com zero recebido, ou
receber R$ 5.000 numa conta de R$ 324). Não existe baixa como operação, não
existe "forma de recebimento", não existe o indicador "recebido sem
conciliar". Tudo isso é a K-2 (modelo acima).

### 4 · conciliação

Não existe conciliação de conta a receber com linha de extrato **com valor**:
só o `pairMovimento` (cria a conta a partir do movimento, 1:1) e o `rec`
(flag). Não há estorno de vínculo (4.3) — o `rec` só alterna. O Fluxo de Caixa
realizado (4.4) lê `cash_entry`, não `conta_receber`; "recebido não
conciliado" hoje nem existe para ser somado. Dono do Fluxo: Prompt AD; do
modelo no Caixa: Prompt L. A K-2 entrega o vínculo e o indicador na tela; o
Fluxo passa a ler "conciliado × não conciliado" na AD.

### 5 · edição no padrão de Despesas

A edição é inline, numa linha da tabela (`ContaRow`), com projeto, tipo,
valor, vencimento, descrição, status, valor recebido, unidade, cliente e
banco. Falta: trava por dependência (conta com vínculo não muda valor nem
vencimento sem estorno, 5.1), que depende da tabela de vínculo da K-2. Não
espelha parcelas, recorrência nem PED (5.2) — confirmado que nada disso
existe aqui, e não deve.

### 6 · documentos

`document` tem `despesa_id`, `cliente_id`, `stakeholder_id`, `project_id`;
**não tem `conta_receber_id`**. Migração aditiva (coluna anulável, `ON DELETE
SET NULL`, com `down`) e o mesmo fluxo de upload da despesa. A exclusão do
vínculo não apaga no R2 hoje (6.3): mantém, com nome e chave na auditoria.

### 8 · assistente

Mesma base da J-4/J-5 (`AssistenteUnidades` como molde, `src/lib/ai/*`).
Análises (8.3) em código puro: vencidas por idade, recebidas sem conciliar,
sem unidade/cliente, valor fora do padrão do plano; "divergência plano ×
parcelas" só depois da materialização. Leitura de boleto/comprovante (8.1) e
sugestão de conciliação (8.2) **propõem**; o vínculo só existe após
confirmação. Nunca dá baixa, concilia, altera conta conciliada ou cancela
(8.4). Selo: "Propõe, você confirma" (8.5). A leitura de documento manda
boleto/comprovante ao provedor de IA — é a **mesma pergunta** da J-5 (A/B/C),
que continua aberta.

### 2 · materialização — fora até BK-0

Tudo o que a seção 2 pede (colunas de origem, geração obra a obra com prévia,
convivência dos dois modos, divergência plano × parcelas) fica **fora deste
ciclo**. Quando I-8/I-9 estiverem em produção com a chave ligada, vira
tarefa própria (K-5), como o prompt prevê ("não há terceira via").

## Plano de PRs

| PR | Conteúdo | Muda dado? | Depende de |
|---|---|---|---|
| **K-1** · correções | 7.2 valor (zero e negativo nas duas), 7.3 domínio no servidor, 7.4 filtro na consulta, 7.5 unidades do projeto, 7.6 `refId` até a tabela, 7.7 `{ ok, error }` nas três actions com mensagem na tela | Não | — |
| **K-2** · estados, baixa e vínculo | migração aditiva `conta_receber_recebimento` (+ `forma`, `justificativa`, estorno lógico); status **derivado** (o `<select>` sai); baixa manual com valor, data e forma → "recebida, não conciliada"; conciliação com linha de extrato e valor por vínculo, soma ≤ movimento; estorno do vínculo com quem/quando/por quê; indicador permanente "recebido sem conciliar, há N dias"; trava 5.1; `pairMovimento` passa a gravar o vínculo também; BK-3 com a tolerância do Acerto | Só tabela nova (produção vazia) | K-1 |
| **K-3** · documentos | `document.conta_receber_id` (migração aditiva + `down`), upload no fluxo da despesa, auditoria com nome e chave | Coluna nova | K-1 |
| **K-4** · assistente | painel com as análises puras; leitura de boleto/comprovante e sugestão de conciliação **só após a resposta A/B/C**; selo "Propõe, você confirma" | Não | K-2, resposta A/B/C |
| **K-5** · materialização | seção 2 inteira | Cria linhas, por decisão humana | **BK-0**: I-8/I-9 em produção com a chave ligada |

Cada PR: testes puros + integração, suíte inteira, typecheck, lint, build,
conferência no navegador, e antes/depois de `conta_receber` (contagem, soma
de `valor` e `valor_recebido` por empresa — consulta 2b do
`docs/sql/v2-bloco2-diagnostico.sql` serve de base).

## Perguntas (nenhuma trava a K-1)

1. **Forma de recebimento (3.3):** lista fechada proposta — Extrato bancário,
   Espécie, Repasse de terceiro (RG-04), Outro (com justificativa). Confirmar
   ou ajustar.
2. **Boleto/comprovante para a IA (8.1):** a mesma A/B/C da J-5.
3. **Sequência:** começo a K-1 assim que a fila de PRs (I-7b, J-1 a J-5)
   estiver andando, ou espero as perguntas do Prompt I (INCC, datas das obras) para
   não abrir mais uma frente? Recomendo começar a K-1: é pequena, sem
   migração e não depende de nada.

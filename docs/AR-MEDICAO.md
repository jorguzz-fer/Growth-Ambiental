# Medição do Prompt AR, Fase 1 — leitura do plano de pagamento (Revisão 4, Etapa 4)

**Data:** 11/11/2026 · **Natureza:** somente leitura · **Spec:** `docs/revisao/SPEC-REVISAO-2026-11.md`, Anexo C

Nada foi alterado no código das telas nem no banco. Esta etapa entrega:

- o script de medição;
- a conferência dele;
- as respostas que vêm do código (itens 3 e 4).

Os números da produção saem quando o script rodar lá.

## Como medir na produção

```
DATABASE_URL=postgres://... npx tsx scripts/medicao-ar.ts > medicao-ar-producao.md
```

**Somente leitura de verdade.** O script abre a conexão com
`default_transaction_read_only = on` e põe essa conexão no lugar do cliente do
app antes de carregar qualquer código dele. Assim, até as funções do app que o
script usa (o INCC da obra, as chaves da empresa) leem por ela. O Postgres
recusa qualquer gravação nessa conexão:

- testado: um `INSERT` deu "cannot execute INSERT in a read-only transaction";
- o script confere o modo no começo e para se não estiver em leitura.

**O que sai:**

- só nome da empresa, nome da obra, contagens e somas;
- nenhum dado de comprador;
- nenhum código de unidade.

**As três leituras são as funções do próprio app, não uma cópia:**

- `expandUnitReceivables`;
- `calcProjectionBySource`, com o INCC da obra, como a tela usa;
- `calcTotals`, nas duas definições.

Os números saem iguais aos que as telas mostram.

## Conferência do script (banco local)

Rodei o script num banco local com uma empresa de teste e as quatro variações
da unidade `bla401()` que a spec usa:

- **A:** plano completo;
- **B:** `usarS2` desligado;
- **C:** subsídio pendente;
- **D:** Sinal 1 em 3 parcelas.

A unidade A também tem a permuta registrada e revendida. Resultado:

| Medida | Esperado (spec) | Script |
| --- | ---: | ---: |
| Recebíveis | 555 + 555 + 555 + 565 = 2.230.000 | R$ 2.230.000,00 |
| Projeção | 530 + 525 + 520 + 540 = 2.115.000 | R$ 2.115.000,00 |
| Totais, definição nova | 465 × 3 + 475 = 1.870.000 | R$ 1.870.000,00 |
| Totais, definição antiga | 465 × 4 = 1.860.000 | R$ 1.860.000,00 |
| Seção com chave desligada · subsídio pendente · financiamento · permuta do plano · sinal parcelado | 1 · 1 · 4 · 4 · 1 | 1 · 1 · 4 · 4 · 1 |
| BAR-7: com permuta no plano · delas, registradas na tabela | 4 · 1 | 4 · 1 |

A empresa de teste foi apagada depois.

## 1 e 2 · Por empresa e obra (produção)

**Falta rodar.** Esta sessão não tem acesso ao banco de produção. O script
gera as duas tabelas pedidas e a do BAR-7:

- **Tabela 1:** por obra, quantas unidades vendidas têm:
  - uma seção com valor e a chave `usar*` dela desligada;
  - subsídio não recebido;
  - financiamento;
  - permuta no plano;
  - S1, S2 ou S3 parcelado.
- **Tabela 2:** por obra, o total pelas três leituras e a diferença em R$.
  - Diz também qual definição o Resumo usa naquela empresa (chave
    `resumo_definicao_nova`).
- **BAR-7:** unidades com permuta no plano que também estão na tabela de
  permutas. Mostra o valor do plano e o valor da revenda registrada.

## 3 · Onde cada leitura aparece hoje, e com qual rótulo

Levantado no código em 11/11/2026. Os caminhos são relativos a `src/`.

**O mapa da spec mudou.** A tabela do Anexo C diz que a Projeção usa
`calcProjectionBySource`. Hoje só o modo de **comparação** usa essa leitura.
A Projeção de **uma versão** usa os recebíveis (`expandUnitReceivables`).
A mesma tela mostra números de duas leituras, conforme o modo.

### Leitura 1 · `expandUnitReceivables` (recebíveis)

| Tela | Rótulo exato | Onde |
| --- | --- | --- |
| Contas a Receber | "Recebíveis das vendas (Unidades) · R$ …"; colunas "Previsto" e "Valor"; selo "Venda" na busca | `components/app/contas-receber-manager.tsx:566, 577–578`; `receita-search.tsx:133` |
| Caixa (faixa de 7 dias, já sem a permuta: Etapa 2) | "Vence a receber", "Saldo projetado", "Em atraso, fora da projeção: … a receber" | `components/app/cadeia-dias.tsx:124, 132, 42–43` |
| Dashboard, coluna **Atual** | card "A receber" ("Atual: recebíveis em aberto das unidades, pela data.") | `app/(app)/dashboard/page.tsx:272`; `lib/dashboard-tela.ts:72` |
| Projeção, **uma versão** | série "Unidades vendidas"; linha "TOTAL (todas as unidades)"; "Detalhe por unidade" | `app/(app)/projecao/page.tsx:283, 321, 333` |
| Parâmetros / INCC | nenhum número: só os meses de vencimento, para conferir a cobertura do INCC | `app/(app)/parametros/page.tsx:55` |
| API do agente | JSON `contas-receber` (`natureza: "previsao"`) | `app/api/agent/contas-receber/route.ts:24` |

Também alimenta `getMonthlyRevenue` na versão Atual (tabela do item 4).

### Leitura 2 · `calcProjectionBySource` (projeção por fonte)

| Tela | Rótulo exato | Onde |
| --- | --- | --- |
| Projeção, **comparando 2 ou 3 versões** | "Projeção de Receitas", "Comparativo de versões · receita total projetada por fonte"; linhas "AS/Sinais", "Mensais", "Semestrais", "Anuais", "FGTS", "Subsídio", "Permuta", "Liberações de Obra", "TOTAL" | `lib/calc/projection.ts:145–153`; `app/(app)/projecao/page.tsx:118–149` |
| Nenhuma tela (`actions/budget.ts:563`) | Gravaria linhas "Receita" do Orçamento ("Replicar da Atual"). O botão está em `components/app/budget-matrix.tsx`, que **nenhum arquivo importa**: o caminho não é alcançável pela interface hoje. | `lib/actions/budget.ts:563–580` |

### Leitura 3 · `calcTotals` (totais do Resumo)

| Tela | Rótulo exato | Onde |
| --- | --- | --- |
| Resumo Executivo, uma versão | tabela "Indicadores Gerais": "AS + S1 + S2 + S3 (Sinais)", "Mensais (nominal, sem INCC)", "Semestrais (nominal, sem INCC)", "Anuais (nominal, sem INCC)", "FGTS", "Subsídio estimado", "Permuta Recebido (estimado)", "Permuta Vendidos (rec. projetada)", "Liberações de Obra"; cartão "Financiamento Banco" ("Total financiado") | `lib/resumo-tela.ts:57–70`; `app/(app)/resumo/page.tsx:360, 380, 408–441` |
| Resumo, com a chave `resumo_definicao_nova` ligada | bloco "Exposição": "Financiamento aprovado", "Financiamento liberado" | `app/(app)/resumo/page.tsx:639–640` |
| Resumo, comparando versões | os mesmos indicadores; coluna "Indicador" | `app/(app)/resumo/page.tsx:94, 209` |
| Resumo consolidado (Todos, Ativos, Finalizados) | os mesmos indicadores, mais "Financiamento aprovado (não entra nos totais)" | `app/(app)/resumo/page.tsx:862–889` |
| Chaves (`lib/resumo-previa.ts:37`) | "Prévia · Resumo Executivo pela definição nova" | `app/(app)/chaves/page.tsx:376, 408` |

## 4 · `getMonthlyRevenue`: onde é "receita" e onde é "recebimento"

Na versão Atual, ela soma três coisas, pelo **vencimento**:

- os recebíveis da leitura 1, com a permuta e o financiamento do plano;
- as liberações de obra;
- as contas a receber lançadas.

Em Orçamento e Previsão, ela lê as linhas de receita do planejamento.

| Quem chama | Tela | Como a tela chama | Rótulo exato · onde |
| --- | --- | --- | --- |
| `lib/dre-inputs.ts:72` | DRE | **receita** | linha "Receita" · `lib/calc/dre-cascata.ts:67` |
| idem | Dashboard, gráfico "DRE por mês" | **receita** | "Cada barra é a receita do mês…" · `components/app/graficos-dashboard.tsx:49` |
| idem | Projetos, cartão "Orçado x Realizado · competência" | **receita** | linha "Receita"; dica "receita pelos recebíveis das vendas, como na DRE" · `lib/orcado-realizado.ts:71`; `components/app/orcado-realizado.tsx:28` |
| `lib/dre-inputs.ts:122` | DRE Analítica e Relatórios Customizados | **receita** | "Receita" › "Unidades vendidas e liberações de obra" · `lib/dre-analitica.ts:114, 116` |
| `lib/queries.ts:3876` (`getStatusProjeto`) | Dashboard, "Margem e produtividade" | **receita** | "Margem de contribuição" ("receita da Atual (vencimento, todo o horizonte) − …"), "Receita por m²" · `components/app/indicadores-obra.tsx:246–276` |
| `app/(app)/projecao/page.tsx:191` | Projeção, uma versão de Orçamento ou Previsão | **receita** (título "Projeção de Receitas") | entra na série "Unidades vendidas" · `projecao/page.tsx:283, 321` |
| `lib/actions/previsao-assistente.ts:66` | Assistente da Previsão, "Partir do realizado" | **receita** | "Receita (Receitas do Projeto)…" · `components/app/assistente-orcamento.tsx:134` (vira %, não aparece em R$) |
| `lib/fluxo-caixa.ts:74` | Fluxo de Caixa (mensal e semanal) | **entradas** | coluna "Entradas" · `app/(app)/fluxocaixa/page.tsx:561, 745` |
| idem | Fluxo de Caixa Analítico | **entradas** | "Entradas" › "Unidades vendidas e liberações de obra" · `lib/fluxo-analitico.ts:55–56` |
| idem | Dashboard, gráfico "Fluxo de caixa" | **entradas** | série "Entradas"; "Entradas e saídas previstas por mês, pelo vencimento" · `components/app/graficos-dashboard.tsx:26, 34` |
| `app/(app)/resumo/page.tsx:238 e 719` | Resumo, com período escolhido | **recebimento** | "Recebimentos previstos no período" ("receita das unidades + reembolso + revenda de permuta") · `resumo/page.tsx:336, 340, 853` |
| `app/(app)/dashboard/page.tsx:76` | Dashboard, colunas Orçamento e Previsão | **a receber** | "A receber" = planejado − realizado ("é saldo a realizar, não recebível") · `lib/dashboard-tela.ts:73` |
| `lib/dashboard-previa.ts:58` | Chaves, "Prévia · Dashboard pela definição nova" | **a receber** | "A receber · …" · `lib/dashboard-previa.ts:67` |

**Resumo do item 4.** A mesma série mensal da Atual tem quatro nomes:

- **"Receita"** na DRE, na DRE Analítica, no cartão de Projetos, na margem do
  Dashboard e na Projeção;
- **"Entradas"** no Fluxo de Caixa e no gráfico de fluxo do Dashboard;
- **"Recebimentos previstos"** no Resumo;
- **"A receber"** nas colunas de planejamento do Dashboard. Na coluna Atual
  desse mesmo card, o "A receber" vem direto da leitura 1.

Isto é o C11 e o ponto do BAR-6.

## Bloqueios que esperam o dono (Parte 5 da spec)

A medição de produção acima serve para responder a estes:

| Bloqueio | Pergunta | Proposta do revisor |
| --- | --- | --- |
| BAR-1 | Seção preenchida com a chave `usar*` desligada conta? | — |
| BAR-2 | Subsídio pendente entra na projeção? | — |
| BAR-3 | O financiamento entra em todas as leituras? | — |
| BAR-4 | `Permuta.val` sai de toda leitura de receita? | Sim (permuta é ativo) |
| BAR-5 | O INCC fica só na Projeção, ou entra também nos recebíveis? | — |
| BAR-6 | Separar `getMonthlyRevenue` em recebimentos (Fluxo, Dashboard) e receita (DRE)? Liberações saem da receita da DRE? | Sim |
| BAR-7 | O mesmo bem de permuta entra duas vezes (no plano e na revenda)? | Ver a tabela BAR-7 da medição |

A Fase 2 (Etapa 5) só começa depois dessas respostas.

## Decisões do dono (11/11/2026)

| Bloqueio | Decisão | O que muda na Fase 2 |
| --- | --- | --- |
| **BAR-1** | **Só conta a seção com a caixinha "Usar …" marcada.** A caixinha diz que aquele sinal ou módulo de pagamento será usado. | As três leituras passam a respeitar a chave `usar*` da seção, como a Projeção já faz. Seção preenchida com a caixinha desmarcada sai de Contas a Receber, da DRE e do Fluxo. |
| **BAR-2** | **Subsídio ainda não conciliado entra como previsto.** | O subsídio conta na data prevista, como os outros recebíveis. Depois de recebido e conciliado, sai do previsto e vai para o realizado. A Projeção deixa de esperar o status "Recebido". |
| **BAR-3** | **O financiado pelo banco não entra no caixa como recebível**, porque o dinheiro chega como **liberação de obra**. | `Banco.valFinanc` sai dos recebíveis (Contas a Receber, DRE e Fluxo) e dos totais do Resumo. O dinheiro do banco entra pela liberação de obra, que já é lançada. Isso também evita contar o mesmo dinheiro duas vezes, no plano e na liberação. O cartão "Financiamento Banco" do Resumo continua como informação, fora dos totais. |
| **BAR-4** | **A permuta entra como ativo; só vira receita quando é vendida.** Corrigido pelo dono no mesmo dia: o valor da permuta já está na receita, pelo rateio do contrato da unidade (ver "A permuta já está na receita da venda"). | `Permuta.val` do plano sai de toda leitura de receita e de recebimento (DRE, Fluxo, Projeção e Contas a Receber). A receita da permuta é só a revenda registrada na tabela de Permutas. |
| BAR-7 | Respondido pela BAR-4: fica só a revenda. | Com a permuta do plano fora, a dupla contagem acaba. |
| **BAR-5** | **Por enquanto, o INCC incide só nas projeções.** O dono ainda tem dúvida; pode rever depois. | Fica como hoje: só a tela Projeção corrige pelo INCC. Contas a Receber e Fluxo mostram o valor nominal do contrato. |
| **BAR-6** | **Separar, e a liberação de obra sai da receita da DRE.** No caixa ela entra normalmente. A DRE passa a ter outro conceito: a receita é a **venda da unidade (ou da obra), rateada pelos meses de duração do projeto**. Exemplo: unidade vendida por R$ 500 mil é dividida pelos meses da obra. | É o Prompt I, §54/§56/§57: a receita da DRE (Atual) passa a ser só (1) a venda rateada pela janela do projeto e (2) as contas a receber avulsas. O plano de pagamento e a liberação ficam só no caixa: Fluxo, Contas a Receber e Caixa. Atrás de chave por empresa, nascendo desligada. |

### Venda no meio da obra: revisar os meses passados (decidido em 11/11/2026)

O dono decidiu que a venda é **espalhada pela janela inteira da obra**,
inclusive pelos meses que já passaram. A DRE desses meses é revisada.

Motivo, nas palavras dele: assim a receita da DRE fica mais pareada com a
execução do projeto. No caixa a lógica é outra, e continua sendo a dos
vencimentos e das entradas.

Exemplo, unidade de R$ 500 mil vendida no mês 4 de uma obra de 10 meses:

| | Meses 1 a 3 | Mês 4 | Meses 5 a 10 |
| --- | ---: | ---: | ---: |
| **Decidido: revisar o passado** | R$ 50 mil cada (a DRE já vista muda) | R$ 50 mil | R$ 50 mil cada |
| Antes (BI-1.2 A, de 30/09): tudo no mês da venda | não mudavam | R$ 200 mil | R$ 50 mil cada |

**Isto substitui a decisão BI-1.2 de 30/09/2026** (`docs/V2-BLOCO2-DECISOES.md`).
O BI-1.3 não muda: obra além do prazo segue reconhecendo só daqui para frente.

**Consequências que a Fase 2 precisa tratar:**

- **A DRE de meses passados muda a cada venda nova.** Isso está decidido, mas
  quem exportou ou apresentou uma DRE de meses anteriores vai ver outro número
  depois de uma venda. A tela deve dizer isso. Proposta: um aviso "receita
  revisada pela venda de … em …" no mês afetado.
- **Distrato:** pela mesma regra, a unidade que sai de Vendido tira a receita
  de todos os meses da janela, inclusive os passados. É o mesmo princípio, só
  que ao contrário; fica registrado aqui para não surpreender.
- **Nada é gravado:** o reconhecimento é calculado na leitura (§54.3).

### Qual valor é rateado (decidido em 11/11/2026)

O valor dividido pelos meses da obra é o **total do contrato**: a soma do plano
de pagamento da unidade, incluindo a permuta e o financiamento. É o preço
efetivamente vendido.

O campo "Valor" da unidade é o preço de tabela, que entra no VGV, e **não** é o
valor rateado. Na unidade de teste da spec, o contrato soma R$ 555.000 e o
preço de tabela é R$ 537.027.

Isto ajusta o §54.2 do Prompt I, que dizia "valor da unidade".

**Cuidado com a BAR-1.** O total do contrato soma só as seções com a caixinha
"Usar" marcada. Uma venda com as caixinhas desmarcadas teria contrato zero e
não apareceria na DRE. Por isso a lista de conferência da BAR-1 vale também
para a DRE, e a regra entra atrás da chave.

### A permuta já está na receita da venda (decidido em 11/11/2026)

Correção do dono à BAR-4: "na venda do imóvel, mesmo que haja permuta, o valor
da receita já é considerado na receita, pois ocorre o rateio".

O valor do bem recebido em permuta faz parte do total do contrato. Esse total é
rateado pelos meses da obra, então a permuta já está na receita da DRE.

Na Fase 2:

- **No plano:** `Permuta.val` não entra como receita própria (já está no
  contrato rateado) nem como recebível de caixa, porque não é dinheiro.
- **Na revenda do bem:** a DRE **não soma o valor cheio** da revenda.
  Somar contaria o mesmo valor duas vezes. Hoje `permutaRevenueByMonth`
  soma o valor cheio; isso sai, atrás da chave.
- **A diferença entre a revenda e o valor de entrada** (ganho ou perda) pode
  aparecer numa linha própria, fora da receita de vendas, como no §57.4.3 do
  Prompt I. É a proposta; a ser confirmada com o contador.
- **No caixa:** o dinheiro da revenda continua entrando normalmente.

### Atenção na BAR-1 (risco de sumir parcela de venda real)

O próprio código avisa que as vendas lançadas **normalmente não marcam as
caixinhas**. O comentário em `src/app/(app)/projecao/page.tsx:168–172` diz que,
por isso, a Projeção já saiu zerada uma vez, e foi trocada para ler os
recebíveis.

O formulário de unidade tem as caixinhas, mas há vendas que entram por
importação ou por versões antigas. Se a regra da BAR-1 for ligada direto,
parcelas de vendas reais podem sumir de Contas a Receber, da DRE e do Fluxo.

Como fica na Fase 2:

1. A regra entra atrás de uma chave por empresa, nascendo **desligada**, como
   as outras mudanças de número.
2. Antes de ligar, a coluna "Seção > 0 com a chave `usar*` desligada" da
   medição de produção diz quantas unidades seriam afetadas, por obra.
3. A Fase 2 entrega uma lista dessas unidades (obra, unidade e seção, sem dado
   do comprador). Com ela, as caixinhas são conferidas e marcadas na tela de
   Unidades antes de ligar a chave.

Nada é marcado automaticamente no banco.

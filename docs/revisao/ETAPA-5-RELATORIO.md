# Revisão 4 · Etapa 5 · Prompt AR, Fase 2 — relatório

**Spec:** `docs/revisao/SPEC-REVISAO-2026-11.md`, Anexo C ·
**Decisões:** `docs/AR-MEDICAO.md`, "Decisões do dono"

A etapa sai em três partes:

| Parte | O que faz | Muda número? |
| --- | --- | --- |
| **5a** | Leitura única do plano (`lerPlano`) | **Não** |
| 5b | Regras das BAR-1 a BAR-5 nas leituras de caixa | Só com a chave da empresa ligada |
| 5c | Receita da DRE pelo rateio do contrato (BAR-6) | Só com a chave da empresa ligada |

## 5a · Leitura única do plano de pagamento

### O que mudou

- **Arquivo novo `src/lib/calc/plano.ts`.** A função pura `lerPlano(plano,
  status, opts)` devolve a lista de parcelas do plano. Cada parcela tem:
  - origem, número e total de parcelas da seção;
  - data e mês;
  - valor nominal;
  - se a caixinha "Usar" está marcada;
  - situação (subsídio e financiamento);
  - se é periódica, e o rótulo.

  É o único lugar que abre o JSON do plano para calcular.
- **As leituras passaram a usar `lerPlano`:**
  - os recebíveis (`expandUnitReceivables`): Contas a Receber, DRE, Fluxo e
    Caixa;
  - a projeção (`calcProjectionBySource` e `calcProjection`);
  - o total contratado (`calcUnitTotal`): Unidades, formulário e leitura por
    IA;
  - os totais do Resumo (`calcTotals`);
  - os valores esperados na importação de extrato (`importCash`).
- **As diferenças antigas entre as leituras continuam**, agora explícitas e
  documentadas em `OpcoesDeLeitura`:
  - `periodicaMinimaUm`: nos recebíveis, uma seção periódica com quantidade
    zero gerava uma parcela;
  - `sinaisUmaVez`: no Resumo pela definição antiga, S1 a S3 contavam uma vez;
  - `qualquerStatus`: a importação de extrato olhava todas as unidades,
    vendidas ou não.

  As regras próprias de cada leitura (caixinhas, subsídio, financiamento,
  permuta, INCC) também ficaram como estavam. Quem muda isso é a parte 5b,
  atrás de chave.

### Arquivos que deixaram de ler o plano diretamente (item 3 do relatório final)

- `src/lib/calc/receivables.ts`
- `src/lib/calc/projection.ts`: `calcProjection`, `calcProjectionBySource`,
  `calcUnitTotal` e `calcTotals`
- `src/lib/actions/caixa.ts`: `importCash`

Continuam lendo o plano, porque **editam ou copiam** o plano sem calcular
(lista fixa no teste AR-T2):

- o formulário da unidade;
- a planilha de importação e exportação;
- a leitura de documento por IA;
- os tipos e o plano vazio.

### Prova de que nenhum número mudou

Teste `src/lib/calc/plano-equivalencia.test.ts`:

- **Como funciona:** as funções antigas foram copiadas sem alteração para o
  teste e comparadas com as novas em **5.000 planos gerados ao acaso**, com
  semente fixa para o resultado se repetir.
- **Casos de borda no sorteio:**
  - seção ausente;
  - quantidade zero;
  - data vazia, inválida ou no dia 31;
  - caixinhas aleatórias;
  - subsídio pendente;
  - valor negativo;
  - unidade não vendida.
- **Resultado:** idêntico nas cinco leituras, na mesma ordem.
  - recebíveis;
  - projeção por fonte com INCC, e projeção total;
  - total contratado;
  - totais do Resumo, nas duas definições;
  - valores da importação de extrato (3.000 planos).
- **A unidade de teste da spec** continua dando R$ 555 mil / 530 mil /
  465 mil.

**Fora do sorteio, de propósito:**

- **Valor gravado como texto.** A leitura antiga às vezes juntava o texto
  (por exemplo, "0" + "5000" virava "05000"); a nova converte para número.
- **Quantidade negativa ou fracionária de parcelas.**

O formulário, a planilha e a leitura por IA gravam números inteiros, então
esses casos não devem existir. Se existirem, a leitura nova corrige um número
que hoje sai errado.

### Testes novos

| Teste | O que prova |
| --- | --- |
| AR-T1 / AR-T3 · `plano-equivalencia.test.ts` | As cinco leituras dão o mesmo resultado de antes, em 5.000 planos ao acaso; a unidade da spec continua 555/530/465 |
| AR-T2 · `plano-arquitetura.test.ts` | Nenhum arquivo fora da lista de editores lê as seções do plano direto; as leituras de cálculo usam `lerPlano` |

Os 17 testes de paridade com o protótipo continuam passando sem mudança.

### Validação

- `npm run test:all` (typecheck + lint + suíte com banco): **270 arquivos,
  2.188 testes, todos passaram, 0 pulados.**
- `next build`: ok.

## 5b · Regras novas nas leituras de caixa (chave `plano_definicao_nova`)

Chave nova por empresa, **nascendo desligada**: "Plano de pagamento pela
definição nova (caixa)". Com ela desligada, todas as telas mostram o mesmo de
antes, e o teste de equivalência da 5a continua valendo.

### O que muda quando a chave é ligada

| Decisão | Recebíveis (Contas a Receber, Fluxo, Caixa, "A receber" do Dashboard, Projeção de uma versão) | Projeção por fonte (Projeção, comparando versões) |
| --- | --- | --- |
| **BAR-1** · só conta a seção com a caixinha "Usar" marcada | passa a respeitar a caixinha (antes, ignorava) | já respeitava |
| **BAR-2** · subsídio não conciliado entra como previsto | já entrava | passa a entrar (antes, só "Recebido") |
| **BAR-3** · o financiamento chega como liberação de obra | sai | já não entrava |
| **BAR-4** · a permuta do plano não é dinheiro | sai | sai |
| **BAR-5** · INCC só nas projeções | continua sem INCC | continua com INCC |

Também pela definição nova, uma seção periódica com quantidade zero deixa de
gerar uma parcela. Era a herança `periodicaMinimaUm`, e agora todas as
leituras seguem a mesma regra.

**Resultado (AR-T1):** pela definição nova, recebíveis e projeção dão o mesmo
total. A unidade da spec dá R$ 440 mil nas duas leituras: o contrato de
555 mil menos a permuta (90 mil) e o financiamento (25 mil). Os cenários B, C
e D dão 435, 440 e 450 mil, também iguais nas duas leituras. A única diferença
que sobra é o INCC, só na projeção, como decidido.

**O que fica de fora:**

- **Resumo:** não muda. O financiamento já aparece lá como informação, fora
  dos totais; a permuta vem da tabela de permutas.
- **Geração de Orçamento ("Replicar da Atual"):** continua na regra antiga.
  O botão está num componente que nenhuma tela usa hoje.
- **DRE:** com só esta chave ligada, a DRE (que hoje lê os recebíveis pelo
  vencimento) também perde o financiamento e a permuta do plano. Isso segue
  as BAR-3 e BAR-4. A troca da DRE para o rateio do contrato é a parte 5c,
  com chave própria.

### Prévia e lista de conferência (tela Chaves, `#previa-plano`)

Por obra, na versão Atual:

- os recebíveis hoje e pela definição nova;
- quanto sai por financiamento, por permuta e por caixinha desmarcada.

Abaixo, a **lista das unidades a conferir**: obra, código da unidade, as seções
com valor e data e a caixinha desmarcada, e quanto somam. Sem nenhum dado do
comprador. Conferido no navegador: o cartão aparece na tela de Chaves para o
operador da plataforma, sem erro.

### Testes novos

| Teste | O que prova |
| --- | --- |
| `src/lib/calc/plano-definicao-nova.test.ts` | Os quatro cenários da spec pela definição nova (recebíveis = projeção); cada BAR isolada; unidade não vendida; a prévia separa o que sai por financiamento, permuta e caixinha e lista as unidades |
| `src/lib/plano-chave.test.ts` (com banco) | AR-T4: desligada, Contas a Receber, a receita mensal e a Projeção por fonte dão os números de sempre (555 e 525 mil); ligada, 435 mil nas três |

### Validação

- `npm run test:all` (typecheck + lint + suíte com banco): **272 arquivos,
  2.197 testes, todos passaram, 0 pulados.**
- `next build`: ok.

## 5c · Receita da DRE pelo rateio do contrato (chave `dre_receita_rateio`)

Chave nova por empresa, **nascendo desligada**: "Receita da DRE pelo rateio do
contrato". Com ela desligada, a DRE é exatamente a de antes.

### O que muda quando a chave é ligada (só a versão Atual; Orçamento e Previsão não mudam)

A receita da DRE passa a ter **duas fontes, e só elas** (Prompt I, §57.3):

1. **Venda de unidade:**
   - O valor é o **total do contrato**: a soma do plano de pagamento, com
     permuta e financiamento, contando só as seções com a caixinha "Usar"
     marcada. Não é o preço de tabela.
   - Ele é dividido **igualmente pelos meses da obra** (início e fim do
     cadastro do projeto), **inclusive os meses que já passaram**. Uma venda
     nova, ou um distrato, revisa a DRE dos meses anteriores.
   - O resíduo de centavos vai para o último mês, para a soma fechar com o
     contrato.
2. **Contas a receber lançadas** do projeto, pelo mês do vencimento, como
   sempre.

**Saem da receita da DRE**, e continuam no caixa (Fluxo, Contas a Receber,
Caixa):

- as parcelas do plano pelo vencimento;
- as liberações de obra;
- a revenda da permuta pelo valor cheio (o bem já está no contrato rateado).

**Onde aparece:**

- DRE e DRE Analítica;
- gráfico "DRE por mês" do Dashboard;
- card "Orçado x Realizado" de Projetos;
- a margem de contribuição do Dashboard (`getStatusProjeto`);
- as métricas de receita da Cris.

Todos leem a mesma função. A DRE mostra um aviso quando a chave está ligada:
"…uma venda nova (ou um distrato) revisa a receita dos meses anteriores".

### O que ficou de fora, de propósito

- **Ganho ou perda na revenda da permuta, em linha própria:** é proposta do
  §57.4.3, a confirmar com o contador. Exige uma linha nova na cascata da DRE
  e em todas as telas que a leem. Com esta chave, a revenda simplesmente deixa
  de somar na receita.
- **Contas a receber ligadas a uma unidade** podem repetir a venda que o
  rateio já reconhece (§54.7). **Não são excluídas:** a prévia conta quantas
  são e quanto somam, para decisão.

### Prévia (tela Chaves, `#previa-rateio`)

Por obra, na versão Atual:

- a receita da DRE hoje e pelo rateio;
- a receita dos **meses já encerrados**, hoje e pelo rateio (quanto o passado
  muda).

Abaixo, as pendências:

- unidades que o rateio não reconhece, com o motivo (obra sem início ou fim,
  ou contrato sem caixinha marcada);
- contas a receber ligadas a unidade.

Conferido no navegador, com uma venda de teste no banco local (depois apagada):

- a obra mostra R$ 580 mil hoje (parcelas de 555 mil + liberação de 25 mil);
- pelo rateio, R$ 555 mil;
- a DRE com a chave ligada mostra a receita de 555 mil e o aviso.

### Testes novos

| Teste | O que prova |
| --- | --- |
| `src/lib/calc/receita-rateio.test.ts` | Total do contrato (555 mil, não os 537 mil da tabela); só caixinha marcada; R$ 500 mil em 10 meses = 50 mil por mês, inclusive meses anteriores à venda; o resíduo fecha; unidade não vendida não conta; obra sem janela e contrato sem caixinha viram pendência, nunca zero calado |
| `src/lib/dre-rateio-chave.test.ts` (com banco) | Desligada: a receita de sempre (676 mil). Ligada: 556 mil (contrato rateado + avulsa), 55,5 mil já em janeiro, sem liberação e sem revenda; DRE Analítica igual; Orçamento intacto; a prévia; pendência de obra sem janela; conta a receber ligada à unidade contada |

### Validação

- `npm run test:all` (typecheck + lint + suíte com banco): **274 arquivos,
  2.207 testes, todos passaram, 0 pulados.**
- `next build`: ok.
- Conferido no navegador: DRE com a chave ligada e as duas prévias novas na
  tela de Chaves, sem erro na página.

## Antes de ligar as chaves numa empresa

1. Rodar `scripts/medicao-ar.ts` na produção (somente leitura).
2. Na tela Chaves, conferir a prévia `#previa-plano` e a lista de unidades com
   caixinha desmarcada. Marcar as caixinhas que forem venda de verdade, na
   tela de Unidades.
3. Conferir a prévia `#previa-rateio`: obras sem início e fim cadastrados e
   contas a receber ligadas a unidade.
4. Ligar `plano_definicao_nova` (caixa) e `dre_receita_rateio` (DRE). Elas
   são independentes.

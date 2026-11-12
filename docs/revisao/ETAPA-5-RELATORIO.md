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

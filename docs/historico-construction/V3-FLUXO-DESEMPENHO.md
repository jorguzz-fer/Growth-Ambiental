# Fluxo de Caixa — desempenho, parte 1 (Revisão 4)

**Data:** 12/11/2026 · Combinado na Revisão 4 para depois da Etapa 5.

## O problema

No Fluxo de Caixa da "Empresa toda", para cada obra, a mesma conta da versão
Atual era feita **até quatro vezes** na mesma carga da página:

- uma vez na tabela principal;
- uma vez no assistente do Orçamento;
- uma vez no assistente da Previsão;
- e o realizado de novo.

Cada vez, as despesas, as unidades, as liberações, as parcelas e as contas a
receber eram lidas do banco outra vez. As versões de cada obra eram lidas
**seis vezes**.

## O que mudou

**Nenhum cálculo mudou.** Três funções passaram a ser lembradas durante a
requisição, com `cache` do React, como foi feito na DRE em 27/10:

| Função | Chave | Onde |
| --- | --- | --- |
| `flowMaps` | conteúdo da versão, obra, chave da empresa e balde de tempo | `src/lib/fluxo-caixa.ts` |
| `flowMapsRealizado` | versão e balde de tempo | idem |
| `getVersionsDoProjeto` | empresa e obra | `src/lib/queries.ts` |

- **Cópias:** cada chamador recebe uma **cópia** do resultado (`structuredClone`
  ou cópia das linhas). Quem somar em cima não estraga o resultado do outro.
- **Actions:** nenhuma action usa `getVersionsDoProjeto`, então uma action que
  cria uma versão não corre o risco de reler a lista antiga na mesma
  requisição.

## Medição (banco local, 12 obras com Atual, Orçamento e Previsão, 9.600 despesas, 480 unidades vendidas)

Fluxo de Caixa "Empresa toda", segunda carga (aquecida):

| | Antes | Depois |
| --- | ---: | ---: |
| Consultas ao banco | 1.944 | **1.086** (−44%) |
| Tempo de banco | 315 ms | **199 ms** (−37%) |
| Tempo da página | 1,32 s | 1,13 s |

**Conferência:** o texto das telas foi capturado antes e depois, e saiu
**idêntico**:

- Fluxo da Empresa toda, mensal;
- Fluxo de uma obra;
- Fluxo da Empresa toda, semanal;
- DRE da Empresa toda;
- Dashboard.

## O que falta (parte 2, se quiser)

**A segunda leitura que sobrou.** Ainda lê a Atual de cada obra duas vezes,
porque monta o fluxo mensal e também o semanal (baldes de tempo diferentes).
Tirar essa segunda leitura exige memorizar as leituras básicas (despesas,
unidades, liberações, parcelas), que muitas outras telas usam. Com isso, o
risco é maior.

**O resto do tempo da página não é banco.** É o cálculo dos recebíveis e a
montagem das tabelas. Isso pede outra medição antes de mexer.

## Validação

- `npm run test:all` (typecheck + lint + suíte com banco): **275 arquivos,
  2.211 testes, todos passaram, 0 pulados.**
- `next build`: ok.
- Os dados de medição foram apagados do banco local depois.

# Prompt AE · Relatório final — Resumo Executivo

Prompt AE (38 de 42). Quatro PRs:
- **Fase 1:** [PR #242](https://github.com/jorguzz-fer/growth-construction/pull/242)
- **AE-1:** [PR #243](https://github.com/jorguzz-fer/growth-construction/pull/243)
- **AE-2:** [PR #244](https://github.com/jorguzz-fer/growth-construction/pull/244)
- **AE-3:** o assistente e este relatório.

Detalhes em [`FASE1`](./V2-PROMPT-AE-FASE1.md), [`PR1`](./V2-PROMPT-AE-PR1.md),
[`PR2`](./V2-PROMPT-AE-PR2.md) e [`PR3`](./V2-PROMPT-AE-PR3.md).

## 1. BAE-1, BAE-2 e BAE-3

- **BAE-1 (tolerâncias): sem resposta.** O bloco Atenção só tem exceções
  categóricas. **Pergunta:** desvio de custo acima de quantos %? Recebível
  vencido há quantos dias? Por obra ou único para a empresa?
- **BAE-2 (exposição máxima):** **não implementada**, porque depende do
  BAD-1 (chave do Fluxo desligada). O bloco Caixa mostra o motivo.
- **BAE-3 (VSO):** na base local há 2 unidades, 1 vendida, com data.
  Nenhuma vendida sem data.
  - O VSO é calculado com período: vendidas no período ÷ oferta no início.
  - Sem período, ou com vendida sem data, ele não é calculado, e a ausência
    vira linha de Atenção.
  - Em produção, rodar o relatório 1 do
    [SQL](./sql/v2-prompt-ae-diagnostico.sql).

## 2. Blocos

| Bloco | Situação | O que a tela mostra |
|---|---|---|
| Vendas | **entra** (com a chave) | VGV total, VGV vendido, VSO, as 4 situações, total |
| Exposição | **entra** (com a chave) | a receber e a pagar em aberto (saldo), financiamento aprovado × liberado, permuta em estoque |
| Atenção | **entra**, só categóricas | obra sem Atual, vendida sem plano, vendida sem data, despesa sem categoria ou competência |
| Resultado | pendente | "depende da correção da receita no Prompt I (seções 54 a 58)…" |
| Caixa | pendente | "o saldo de hoje e a exposição máxima dependem do BAD-1…" |
| Comparativo | pendente | "aparece quando a tela somar mais de um projeto…" |
| Execução | fora da tela | "fica fora até a decisão da medição por serviço (BV-1)" |

## 3. VGV total × vendido

- **Sem chave:** a linha declara "todas as unidades", e a nota diz que o
  resto conta só as vendidas.
- **Com a chave:** o bloco Vendas traz as duas linhas, com o critério de
  cada uma.

## 4. INCC (2.2)

**Opção 2:** o rótulo passou a "nominal, sem INCC". **Nenhum valor
mudou.** Aplicar o índice fica para a seção 58 do Prompt I.

## 5. `S1.n` (2.4)

**Existe** (`SignalSource.n`), e `expandUnitReceivables` multiplica por
`max(1, n)`. O errado era o `calcTotals`. Com a chave, S1, S2 e S3
multiplicam por `n || 1`. Na base local nenhum sinal tem `n > 1`.

## 6. `calcTotals`

**Usada só pelo Resumo:** os dois usos estão em `resumo/page.tsx`. A
correção entrou por **parâmetro explícito** (`{ definicaoNova }`), sem
função duplicada.

## 7. Percentual consolidado

O Resumo segue com **uma obra por vez**, então não há consolidação de
percentuais nesta tela. O único percentual novo, o VSO, é uma razão de
contagens:
`(noPeriodo / oferta) * 100` em `src/lib/resumo-blocos.ts`, `vso()`. A
regra de recalcular nunca somar já vale no Dashboard
(`getStatusProjeto`, `razao`).

## 8. Cobertura de cenário

O Resumo mostra a versão escolhida da obra. Fora da Atual, um aviso diz que
são valores de planejamento; sem Atual, diz que a obra não tem. A
contagem "2 de 3 projetos" depende da seleção de vários projetos (Parte 3),
que segue como pergunta.

## 9. Versão

`versaoDeTrabalho` (Prompt A): a Atual; sem ela, a padrão ou a primeira.
**A tela não abre mais no planejamento sem avisar**: o aviso aparece sempre
que a versão mostrada não é a Atual. As versões vêm de `getProjectVersions`,
com o tenant.

## 10. Consultas novas, com o tenant no SQL

- `getContasReceber(tenantId, projectId)` e `getContasPagar(tenantId)`,
  filtrada pela obra e pela Atual. Só para quem vê essas telas.
- Contagem de despesas sem classificação: `tenant_id`, `version_id`,
  `cancelado = false`. Só para quem vê Despesas.
- `getUnits`, `getPermutas`, `getReembolsos` e `getVersionsDoProjeto`, com
  o tenant (já existiam).
- A prévia usa as mesmas.

## 11. Funções compartilhadas

`getMonthlyRevenue`, `expandUnitReceivables`, `calcProjection` e
`calcProjectionBySource` **não foram alteradas**. Mudou só `calcTotals`,
que é usada só pelo Resumo, por parâmetro opcional. O tipo `CalcReembolso`
ganhou o campo opcional `status`, lido só por ela.

## 12. A chave

- **`resumo_definicao_nova`**, por empresa, nasce desligada. Liga em
  `/chaves`.
- A prévia `/chaves#previa-resumo` mostra, por obra, cada indicador hoje ×
  nova × diferença.

## 13. Migrações

**Nenhuma.**

## 14. Limitações e perguntas

- **Achado (2.6):** a busca antiga por "material" não encontra
  "Materiais", o valor do cadastro. Hoje "Permuta por Materiais" ignora a
  permuta cadastrada como Materiais.
  - Com a chave, isso é corrigido. Desligada, o número de hoje fica.
- **2.7:** no app, permuta e liberação não têm status de cancelada. A regra
  cobre o que vier de importação.
- **Parte 3 (vários projetos):**
  - **Pergunta:** o Resumo deve somar vários projetos, com os escopos
    Todos, Ativos e Finalizados, como o Dashboard?
  - Sem isso, o Comparativo e a cobertura "2 de 3" não aparecem.
- **Exposição × versão:** a receber e a pagar são as contas da obra
  (Atual), qualquer que seja a versão escolhida. O bloco diz isso.
- **"O que mudou desde o mês passado"** depende do navegador do usuário
  (`localStorage`). Em outro computador, começa do zero.

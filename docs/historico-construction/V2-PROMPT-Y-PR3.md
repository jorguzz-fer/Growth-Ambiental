# Prompt Y — PR 3: o assistente do Estoque (seção 7)

Sem migração. Nenhum dado existente alterado.

## O que mudou
- **Painel "Assistente IA"** na tela de Estoque, com o selo **"Propõe, você
  confirma"**. Sete seções: ler a nota e propor as entradas, e as seis análises.

### 7.1 — ler a nota e propor as entradas
- `proporEntradasDaNota(despesaId)` (action): lê os PDF/imagens **já
  anexados à despesa** (mesmo caminho e mesmo cliente da leitura de despesa;
  `src/lib/ai/estoque-itens.ts` pede os **itens** da nota: descrição,
  quantidade, unidade, custo, e o nome do material do cadastro que
  corresponde, com confiança) e devolve **propostas** — uma por item —
  casadas com o cadastro (`casarItensComCadastro`: nome dado pela IA, SKU,
  nome contido, ou sobreposição de palavras ≥ 60%). **Nada é gravado** pela
  leitura (só uma auditoria `estoque.ia.proposta` dizendo que a leitura
  aconteceu, com os arquivos lidos).
- Cada proposta tem botão **"Confirmar entrada"**: chama a mesma
  `addStockMovement` da tela (vínculo com a despesa, custo do cadastro,
  validação no servidor). Quando o custo da nota difere mais de 10% do
  cadastro, o painel avisa que a entrada usa o custo do cadastro.
- Sem `ANTHROPIC_API_KEY` ou sem R2, o painel diz o que falta; as análises
  seguem.

### 7.2 — material não cadastrado
- Item sem par vira **proposta de cadastro** (nome da nota, unidade
  convertida para a lista — M2 → m², PC → pç — e custo da nota). O botão
  **"Cadastrar com estes dados"** chama `addStockItem` com o clique da pessoa;
  depois, a entrada ainda é outro clique.

### 7.3 — as seis análises (`src/lib/estoque-analise.ts`, puro)
- **Abaixo do mínimo** — com o que falta e o consumo médio mensal (saídas de
  consumo dos últimos 90 dias, estorno devolve).
- **Sem movimento** — ativos sem movimento há mais de 180 dias ou nunca.
- **Consumo por obra** — reaproveita o cálculo da PR 2.
- **Entrada sem origem** — entradas sem despesa nem permuta (de antes desta
  regra; na base local não há).
- **Divergência de valor** — despesas cuja soma das entradas difere do valor
  lançado além de 2% (ou R$ 1).
- **Entrada sem comprovação** — entradas sem nenhum documento ou foto, por mês
  (`getContagemDocsPorMovimento`).

### 7.4 — nunca
- O painel não importa `deleteStockItem`, `estornarMovimento`,
  `setStockItemAtivo`, `updateStockItem` nem `deleteStockMovementDoc`; o
  módulo de análise não importa ações nem banco. Teste de arquivo trava.

## Testes
- `estoque-analise.test.ts` (3): casamento e proposta de cadastro (7.1/7.2),
  as seis análises (7.3), o "nunca" (17 / 7.4).
- Suíte: 144 arquivos, 1409 testes; `tsc`, `eslint`, `next build`.

## Teste de navegador (local, admin)
Painel presente com o selo; as sete seções abrem; sem IA local a primeira
diz o que falta; **nenhum** botão de excluir, estornar ou inativar no painel.

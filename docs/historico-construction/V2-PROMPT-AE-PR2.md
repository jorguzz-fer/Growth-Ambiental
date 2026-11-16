# Prompt AE · AE-2 — a chave do Resumo Executivo

Partes 1, 2.3, 2.4, 2.6, 2.7 e 4.1, atrás da chave por empresa
**`resumo_definicao_nova`**, que nasce **desligada** (seção 6). **Desligada,
o Resumo é idêntico ao do AE-1.** Isso foi conferido no navegador na
EMPREENDIMENTO PILOTO, com a Atual, a Previsão e as três versões comparadas.

## Em `calcTotals`, por parâmetro (8.3: só o Resumo usa)

- **2.4 · sinais:** com a chave, S1, S2 e S3 multiplicam pela quantidade
  (`n || 1`), como o AS e como `expandUnitReceivables`. **`n` existe** no
  plano (`SignalSource.n`); o errado era o `calcTotals`.
- **2.7 · canceladas:** permuta e liberação com status de cancelada ficam
  fora. No app, a permuta só tem Disponivel e Vendido, e a liberação não tem
  "cancelada"; a regra cobre o que vier de importação.
- **Desligada, exatamente o de antes.** Há teste dos dois modos.

## Permuta por tipo (2.6) — achado

A busca antiga por `includes("material")` **não encontra "Materiais"**, o
valor do próprio cadastro: em "materiais" não há "material". Hoje a linha
"Permuta por Materiais" só soma tipos digitados à mão. "Serviços" é
encontrado.

Com a chave, o tipo é comparado com o valor do cadastro, e a linha nova
**"Permuta de outros tipos"** recebe o resto. A soma sempre fecha com
"Permuta Recebido".

## Os blocos por pergunta (Parte 1), com a chave

Na versão única, os blocos **substituem a tabela de 12** (4.1). O detalhe
por fonte segue em Unidades. A comparação de versões continua com a tabela,
já com as correções.

- **Vendas** (valores contratados):
  - VGV total (todas as unidades) e VGV vendido (só as Vendidas).
  - **As quatro situações** e o total, que é a **contagem de unidades**
    (2.3).
  - **VSO do período** (BAE-3) = vendidas no período ÷ oferta no início.
    Sem período, ou com vendida sem data, **não calcula** e diz por quê.
- **Exposição** (saldos, não valor cheio):
  - A receber e a pagar em aberto da obra, cada um com o vencido à parte.
  - Financiamento aprovado × liberado.
  - Permuta em estoque.
  - Sem permissão de Contas a Receber ou a Pagar, a linha fica "—" com o
    motivo (5.4).
- **Atenção** (só categóricas; BAE-1 sem resposta), cada linha com link
  para resolver:
  - obra sem Atual;
  - unidade vendida sem plano de pagamento;
  - unidade vendida sem data de venda;
  - despesa da Atual sem categoria ou competência.
- **Pendentes, com o motivo escrito:**
  - Resultado (Prompt I, §54–58);
  - Caixa (BAD-1);
  - Comparativo (o Resumo é de uma obra por vez).

  Execução fica fora (BV-1).

## A prévia (6.2)

`/chaves#previa-resumo` mostra, por obra (Atual), cada indicador **hoje ×
definição nova × diferença**, e o total de unidades. Usa as mesmas funções
da tela. Na base local tudo fica igual: não há sinal com `n > 1`, permuta
nem cancelada.

## Testes

- `resumo-blocos.test.ts`:
  - `calcTotals` desligada e ligada (S1 × n, canceladas);
  - a permuta por tipo, que fecha a soma e registra o achado de "Materiais";
  - as quatro situações e o total;
  - VSO (ok, sem período, sem data);
  - Exposição sem permissão;
  - Atenção com link;
  - plano de pagamento.
- Suíte inteira passando. tsc, eslint e build limpos.
- **Navegador:** ligada só no banco local durante o teste, e o registro foi
  apagado depois.
  - os blocos;
  - VSO de 50% no ano;
  - "A pagar em aberto" R$ 9.757, o mesmo do Dashboard;
  - a prévia por obra.

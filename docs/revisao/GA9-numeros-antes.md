# GA-9 · Fase 0 — foto dos números da demonstração

Antes de tirar o legado de incorporação, a demonstração foi fotografada **tela por tela**. Toda fase seguinte do GA-9 refaz a foto e compara: os números de consultoria não podem mudar.

## Arquivos

| Arquivo | O que é |
|---|---|
| `GA9-numeros-antes.txt` | Saída de `scripts/conferir-demo.ts` (o id da empresa é retirado, porque muda a cada recriação). |
| `GA9-numeros-antes.json` | O que cada tela mostra, lido do app no navegador. |

### O que está no JSON

- **Por projeto** (os cinco, a sede e "todos"):
  - DRE (período inteiro e por cenário: Atual, Orçamento, Previsão);
  - DRE analítica e Fluxo analítico (por cenário);
  - Fluxo de Caixa, Dashboard, Resumo e Contas a Receber.
- **Mês a mês**, em cada mês da janela do projeto (do início ao fim do cadastro e dos meses lançados; "todos" = 12/2025 a 02/2028):
  - DRE;
  - DRE analítica e Fluxo analítico, nos três cenários.
- **Caixa:** conciliação, ajustes e cada conta corrente.
- **Exportação** do Orçamento e da Previsão de cada projeto e da sede: as duas abas da planilha, célula por célula.

De cada tela ficam as tabelas (cabeçalho e linhas) e as linhas de texto com número (indicadores, cartões, seletores de ano). Nas leituras mês a mês ficam só as linhas com valor diferente de zero. Ao todo são 977 telas e 12 planilhas, todas lidas com resposta 200 e sem erro de página.

## Por que a data é fixa

O seed da demonstração e várias telas dependem do dia de hoje: mês corrente, fração do mês, vencidos, projeção ao término. Para que a foto possa ser refeita em outro dia, tudo roda com **`DATA_FIXA=2026-11-15`** e fuso UTC:

- o seed e a conferência rodam com `node --import scripts/data-fixa.mjs`;
- o servidor sobe com `NODE_OPTIONS=--import …/data-fixa.mjs`;
- o navegador usa o relógio fixo do Playwright.

Sem `DATA_FIXA`, `scripts/data-fixa.mjs` não faz nada.

## O que não conta como mudança

Recriando a demonstração duas vezes com a mesma data, duas coisas variam sem que nenhum número mude:

- **zero com sinal:** "+R$ 0" ou "R$ 0", resto de arredondamento que depende da ordem da soma;
- **ordem das linhas de mesma data** nas listas do Caixa: o banco devolve empates em qualquer ordem, e nenhuma coluna depende da ordem.

Por isso a foto guarda as células com o zero sem sinal e as linhas de cada tabela em ordem fixa, e a comparação faz o mesmo. Com isso, duas recriações independentes deram **fotos idênticas**: 977 telas e 12 planilhas.

## Como refazer e comparar

Só em ambiente local, com o banco de teste de `.env.local`. O script recusa banco que não seja local.

```bash
npm run build
bash scripts/ga9-foto.sh comparar
```

O script:

1. recria `growth_demo_seed` com o seed (`SEED_DEMO_RECRIAR=sim`);
2. roda a conferência e compara com o `.txt`;
3. sobe o app na data fixa;
4. lê as mesmas telas e lista cada diferença contra o `.json`.

Sai com código 1 se algo mudar. Para regravar a foto, use `gravar` no lugar de `comparar`, mas só com decisão registrada, porque a foto é a referência do GA-9.

## Base

- Código: `main` depois do GA-1 (#15) e da Fase 1 do GA-9 (#16).
- GA-2, GA-3 e GA-5 ainda não estão no `main`. Se o GA-5 mudar o seed, a foto precisa ser regravada antes da fase seguinte.

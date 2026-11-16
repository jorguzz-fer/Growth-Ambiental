# Prompt AC · AC-1 — comparação na DRE (Partes 1 e 8)

## O que mudou

- **Módulo puro `src/lib/dre.ts` (Parte 8).** Saíram da página:
  - `monthIndex`, `enumMonths` e o recorte de período, sem mudar a lógica;
  - a seleção de versões e a resolução de cenário por projeto;
  - a cobertura e os rótulos.

  A cascata e os inputs já estavam fora, desde o Prompt B.
- **Projeto (1.1 e 1.4).**
  - As versões são as do projeto escolhido, como no Prompt A.
  - O `?vs=` é validado contra elas.
  - **Todas as versões são selecionáveis**, até 12 colunas. Acima disso a
    tela avisa e não descarta nada.
  - A seleção padrão é **Atual + o Orçamento e a Previsão mais recentes,
    sem cópia**. Cópia continua selecionável, marcada "· cópia".
- **Empresa toda (1.2).**
  - Passa a comparar **cenários** lado a lado (Orçamento, Previsão
    Atualizada, Realizado), pelo parâmetro `cen`. O antigo `vkind` continua
    aceito.
  - Cada coluna soma, por projeto, a versão daquele cenário **naquele
    projeto**.
- **Os fallbacks (1.3) continuam, mas declarados.** Sem a chave da DRE, que
  entra no AC-3, o projeto sem o cenário entra como antes: Realizado, senão
  a padrão, senão a primeira. Por isso **nenhum número muda**. A tela agora
  diz: "Orçamento: 1 de 3 projeto(s) têm; 2 sem Orçamento entram com outra
  versão…".
- **Mensal × comparação (1.5).**
  - Matriz com cabeçalho de dois níveis: o mês em cima e as versões
    embaixo, mais o grupo Total.
  - Primeira coluna fixa e rolagem horizontal.
  - Acima de 72 colunas, a tela avisa, propõe reduzir e mostra só o total de
    cada coluna. Nenhuma é descartada.
- **"% Receita" por coluna (1.7)**, cada uma sobre a própria receita.
  Receita zero ou negativa mostra "—" com explicação, em vez de "0,0%".
  - No mensal, o percentual não aparece, como antes.
- **O cabeçalho declara o recorte (1.8):** quantos projetos, quais versões
  ou cenários e qual período.
  - O título da coluna vem do **tipo** da versão: Orçamento, Previsão
    Atualizada ou Realizado.
  - O nome digitado, como "Atual — caixa real", vai como complemento.
- Os seletores de versão e de cenário saíram do cabeçalho e foram para uma
  linha logo abaixo, porque espremiam o título.

## Mesmos números (12.1 e 12.2)

- Cada coluna de versão é exatamente `aggregateInputs(versionInputsByMonth)`,
  a mesma conta de antes.
- `dre-equivalencia.test.ts` compara, com banco, o caminho antigo
  (`projectInputs` por tipo) e o novo na Empresa toda. Ele cobre os três
  cenários, no acumulado e com período, e com um projeto **sem**
  Orçamento. O resultado é idêntico linha a linha.
- No navegador, a Empresa toda só com Realizado deu -R$ 39.381, o mesmo do
  "Consolidado" de antes.

## Testes

- `dre.test.ts`:
  - os quatro modos de período;
  - a seleção padrão sem cópia;
  - o `?vs=` estranho descartado;
  - o rótulo pelo tipo;
  - o cenário por projeto, com e sem fallback;
  - o fallback igual ao de `versionIdOfKind`;
  - o `cen`/`vkind`;
  - o % com receita zero.
- `dre-equivalencia.test.ts`: mesmos totais.
- Navegador:
  - o projeto abre com as três versões e o % em cada uma;
  - a Empresa toda mostra três cenários com a cobertura declarada;
  - o mensal mostra a matriz de dois níveis.

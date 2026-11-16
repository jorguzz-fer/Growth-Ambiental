# Prompt AC2 · DRE anual com a mensal abaixo — relatório final

Fase 3, Bloco 2. Executado em 18/10/2026. Fonte: revisão V5, DRE ("ter uma
outra visualização aqui embaixo, na mesma sessão, que favorecesse a
visualização mês"; "caixinha de seleção").

## O que mudou

- **As duas visões juntas.** A tabela do período (anual, com "% Receita")
  fica em cima; a **Visão mensal**, com as mesmas colunas e uma coluna por
  mês mais o total, fica logo abaixo, num cartão próprio. O seletor
  "Consolidado / Mensal" saiu; `?view=mensal` antigo é ignorado.
- Os dois blocos usam a mesma função de tabela (`tabelaDre`), com os mesmos
  seletores de escopo, período, versões e cenários. Nenhum número muda.
- **Caixas de seleção** no lugar das pílulas, nos seletores de versões e de
  cenários. Os dois componentes são compartilhados: o Dashboard, o Fluxo de
  Caixa, o Resumo, o Caixa e o Consolidado ganham as caixas também.
- Com muitas colunas (acima do teto), a visão mensal avisa e não desenha a
  matriz; os totais continuam na visão anual.
- Base de conhecimento do assistente atualizada.

## BAC2-2

Respondido no prompt: a mensal mostra os meses do **mesmo período**
escolhido em cima (um ano, o acumulado ou De/Até).

## "Caiu numa versão que não é a da empresa"

Na gravação, o Thiago estava num tenant de demonstração e trocou para o da
empresa em seguida. O padrão de versões (Atual + Orçamento e Previsão mais
recentes, sem cópia) não mudou.

## Testes

- `npm run typecheck`, `npm run lint`: sem erro.
- `npm test` **com banco local** (Postgres 16, migrações aplicadas): 212 de
  214 arquivos passando. Uma falha que não é deste trabalho: o teste de
  fatura de cartão usa a data fixa "10/2026" como ciclo "aberto", e o ciclo
  fechou em 10/10/2026 (`fatura-pagamento.test.ts`, linha 117).
- `scripts/e2e/v3-telas.mjs` (novo): 12 verificações em navegador, com o
  owner do cliente e com o operador da plataforma, cobrindo REN, PLAT e AC2.

Os fixtures de cinco testes com banco passaram a declarar o operador da
plataforma onde ligam chave ou baixam backup (efeito do Prompt PLAT), e
`chaves.test.ts` ganhou o caso do owner que não é operador.

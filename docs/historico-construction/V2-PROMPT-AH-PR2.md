# Prompt AH · PR AH-2 — assistente somente leitura da tela Empresa

Parte 6. Sem migração; nada grava; nenhum dado de `tenant` alterado.

- **Análise pura** `lib/empresa-analise.ts`: `oQueFaltaParaEmitir` (bloqueios
  do checklist em ordem de esforço: 1 = está no cartão CNPJ, 2 = tabela/
  contabilidade, 3 = prefeitura/lei; com o que cada um destrava),
  `ONDE_ENCONTRAR` (a **fonte** de cada dado — nunca o valor),
  `conferirPreenchido` (município sem IBGE válido; alíquota < 2% fora do
  Simples; CNAE fora da divisão de construção com item 7.x e o contrário —
  sempre "confira com a contabilidade"), `analisarEmpresa` (inclui os avisos
  complementares e o histórico).
- **Histórico** `getHistoricoFiscal`: `tenant.fiscal` e `tenant.rename` com
  quando, quem e **nomes** dos campos alterados; valores de/para não saem da
  consulta (8.2 fica com o módulo de auditoria).
- **Painel** `assistente-empresa.tsx`: selo "Somente leitura", quatro ações
  (o que falta, onde encontrar, conferir, histórico). Não importa action, não
  tem campo de entrada, não lê variável de ambiente; nada vai a modelo de IA
  (cálculo local). Rodapé: "sem pendência aberta não é o mesmo que cadastro
  correto" e a lista do que ele nunca sugere.

Testes `empresa-analise.test.ts` (5): ordem por esforço; **18** nenhuma fonte
traz número de CNPJ/IBGE/CNAE/item/alíquota; divergências; 6.2; **19/20/21**
painel e análise sem action, sem `process.env`, sem campo. Suíte: 176 arquivos
/ 1597. Navegador: painel com selo; "O que falta" começa por CNPJ, endereço e
CEP (esforço 1); histórico vazio na base local.

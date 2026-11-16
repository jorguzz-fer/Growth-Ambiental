# Prompt AC · Relatório final — DRE

Prompt AC (35 de 42). Quatro PRs, todos mergeados: Fase 1, AC-1, AC-2 e
AC-3. Esta última traz a chave e este relatório. Detalhes em
[`V2-PROMPT-AC-FASE1.md`](./V2-PROMPT-AC-FASE1.md),
[`PR1`](./V2-PROMPT-AC-PR1.md) e [`PR2`](./V2-PROMPT-AC-PR2.md).

## 1. BAC-1

Na base local:
- Só há despesas com categoria e competência.
- Não há unidade vendida nem conta a receber.
- Há uma liberação de R$ 4.321, na OBRA 7 TESTE.
- A receita exibida vem de `getMonthlyRevenue`, permutas e despesas
  "Receita".
- Nenhum lançamento descartado.

Em produção, rodar os relatórios 1 a 4 de
[`sql/v2-prompt-ac-diagnostico.sql`](./sql/v2-prompt-ac-diagnostico.sql).

## 2. BAC-2: teto de colunas

Base local: no máximo três versões por projeto. Os tetos adotados são:
- **12 versões** por comparação;
- **72 colunas** na matriz mensal.

Acima disso, a tela avisa e não descarta nada.

## 3. BAC-3: a cascata

**Não mudou.** Retiradas, Investimentos e Empréstimos continuam onde
estavam. Uma nota abaixo da tabela diz que as três estão incluídas e que a
classificação aguarda decisão. **Pergunta ao cliente (6.2):** resultado
contábil, com as três num bloco patrimonial, ou visão gerencial de sobra de
caixa, com outros rótulos?

## 4. BAC-4: a "quinta origem"

A trava do lançamento novo já existe (Prompt S, 3-C). A despesa "Receita"
antiga sai da soma **só com a chave ligada**. Ela aparece listada no rodapé
e na prévia. Base local: 0 lançamentos. Produção: relatório 6 do SQL.

## 5. Versões por projeto

- As versões vêm de `getProjectVersions(tenant, projeto escolhido)` desde o
  Prompt A.
- O `?vs=` é validado contra elas.
- `ctx.versions` não é fonte nesta tela.

## 6. Empresa toda

Cada cenário é resolvido **por projeto** com `resolverCenario`, sobre
`getVersionsDoProjeto`, que tem tenant no `where`. A cobertura é declarada
na tela, por exemplo: "Orçamento: 1 de 3 projeto(s) têm; …".

## 7. Os fallbacks

- **Chave desligada:** continuam, exatamente como em `versionIdOfKind`, para
  o número não mudar. Agora são **declarados**.
- **Chave ligada:** saem. O projeto sem o cenário fica fora da coluna e é
  contado.

A Fase 1 registra o conflito com o prompt, que pedia a Parte 1 sem chave.

## 8. A matriz mês × versão

- Cabeçalho de dois níveis: o mês em cima e as versões embaixo, mais o
  grupo Total.
- Primeira coluna fixa e rolagem horizontal.
- Acima de 72 colunas, a tela avisa e mostra só o total de cada coluna.

## 9. Decisão de 3.1

Com a chave ligada, o encargo vai para a **competência da despesa** que o
gerou. A data de pagamento continua no lançamento. A função nova é
`getEncargosPorCompetencia`; `getEncargosByVersion` não mudou. A nota de
regime da tela muda junto.

## 10. O rodapé

O rodapé fica por coluna e fora da cascata. Ele lista:
- lançamentos sem categoria;
- lançamentos sem competência, dizendo se estão somados ou não no modo
  escolhido;
- categoria fora da lista, com a grafia encontrada;
- com a chave ligada, a despesa "Receita".

A conta é feita sobre `getExpenseRows`, as mesmas linhas da DRE.

## 11. A janela de competências

O eixo mostrado é a janela `start_date`–`end_date` de cada projeto unida às
competências com lançamento. A tabela INCC só sobrou no período
personalizado com limite aberto, quando a chave está desligada, para não
mudar total.

## 12. Arquivos da Parte 8 e o antes × depois

- **`src/lib/dre.ts`**, módulo puro: período, seleção, cenário, cobertura,
  rótulos, rodapé, eixo e presença.
- **`dre-inputs.ts`** ganhou:
  - a opção `definicaoNova`;
  - `getEncargosPorCompetencia`;
  - `foraDaCascataDaVersao`;
  - `previaDreDefinicaoNova`.
- **Antes × depois:** `dre-equivalencia.test.ts` dá o mesmo resultado nos
  três cenários e nos dois modos de período, inclusive com um projeto sem
  Orçamento. `dre-chave.test.ts` confirma que, com a chave desligada, o
  cálculo é o de antes.

## 13. A chave

- **`dre_definicao_nova`**, em Configurações › Chaves de mudança. Nasce
  desligada.
- **Liga, de uma vez:**
  - a Parte 2, receita sem a despesa "Receita";
  - a Parte 3.1, encargo na competência;
  - a Parte 1.3, sem fallback;
  - o eixo novo no período com limite aberto.
- O **card Orçado x Realizado** da tela Projetos segue a mesma chave, porque
  usa a mesma conta.
- **A prévia (`/chaves#previa-dre`)** mostra, por projeto, o Resultado Final
  de hoje e o novo, a diferença, as competências que mudam, os lançamentos
  que saem da receita e os cenários que faltam.

## 14. Funções compartilhadas

`getMonthlyRevenue`, `getExpenseRows`, `getDespesas`,
`expandUnitReceivables`, `permutaRevenueByMonth` e `getEncargosByVersion`
**não foram alteradas**. `versionInputsByMonth` ganhou uma opção que, por
padrão, faz exatamente o de antes.

## 15. Nenhum dado alterado

A DRE continua somente leitura. O teste confirma que as despesas ficam como
estavam.

## 16. Migrações

Nenhuma. A chave usa a tabela `tenant_flag`, que já existe.

## 17. Limitações

- **% Receita no mensal.** A matriz mensal não mostra o percentual, como
  antes. Ele aparece em cada coluna da comparação.
- **Prévia.** Ela olha só a versão Atual de cada projeto, que é onde vivem
  os lançamentos e os pagamentos.
- **O rodapé do Prompt AN.** A Conferência mostra no badge o total do
  conjunto. A DRE mostra no rodapé o mesmo recorte, por coluna. Na base
  local os dois dão zero.
- **9.2.** `brl0` arredonda para inteiro: −R$ 0,40 aparece "R$ 0". A função
  não foi alterada.
- **Parte 6.** A cascata espera a decisão do cliente.

## Perguntas para o dono

1. **Cascata (6.2):** resultado contábil ou visão gerencial de sobra de
   caixa?
2. **Chave da DRE:** depois de ver a prévia, liga? Ela tira a despesa
   "Receita" da receita, move os encargos para a competência e deixa de usar
   o Realizado no lugar de cenário ausente.

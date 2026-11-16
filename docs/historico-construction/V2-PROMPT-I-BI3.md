# Prompt I · BI-3 — versão não nasce mais por cópia, e a importação não apaga

## Decisões (30/09/2026)

| Pergunta | Resposta |
|---|---|
| A importação de planilha (tela Versão) apagava a categoria inteira e regravava, **inclusive na Atual**. Apagar despesa leva junto parcelas, pagamentos e terceiros. O BI-3 só pedia recusar fora da Atual. | **Só grava em categoria vazia.** Se a versão já tem registros daquele tipo, recusa inteira e nada é gravado. Fora da Atual, recusa sempre |
| O botão "Duplicar atual" da Previsão Atualizada (`duplicateForecast`) sai junto? | **Fica.** Ele copia só números de planejamento, nenhum lançamento real. O problema do BI-3 é copiar lançamento |
| Construir o mecanismo de chave por empresa (B4)? | **Sim, agora**, em PR própria |

## O que muda

| | Antes | Agora |
|---|---|---|
| `duplicateVersion` | ação existente, sem botão na tela. Copiava unidades, permutas, liberações, caixa e despesas para uma versão nova | **removida**. As versões já criadas por ela ficam como estão |
| Importação em versão que não é a Atual | apagava e regravava unidades, despesas, permutas e liberações | **recusada** se a planilha traz qualquer lançamento. O INCC continua atualizando |
| Importação na Atual | **apagava** a categoria inteira (e, pela cascata, parcelas, pagamentos e terceiros) e regravava | grava **só onde a versão não tem nenhum registro daquele tipo**. Se tiver, recusa a importação inteira. **Nenhum `DELETE`** |
| Retorno | lançava erro (em produção, sem mensagem) | `{ ok, error }`, mostrado na tela |
| Texto da tela | "Os dados existentes serão substituídos" | diz que nada é apagado nem substituído e quando a importação é recusada |

A checagem de "categoria vazia" e a gravação ficam na mesma transação, com a
versão travada (`FOR UPDATE`). Assim, duas importações ao mesmo tempo não
passam as duas.

## Verificação

- `versao-importacao.test.ts` (regra pura):
  - planilha só com INCC passa;
  - lançamento fora da Atual é recusado;
  - categoria vazia passa;
  - categoria ocupada recusa;
  - registro em categoria que a planilha não traz não atrapalha.
- `actions/versao-importacao.test.ts` (Postgres):
  - Orçamento recusa e nada é gravado;
  - Atual vazia grava;
  - Atual com despesa e parcela lançadas recusa, e a despesa, a parcela e a
    unidade continuam lá;
  - arquivo que não é planilha não grava nada.
- `versoes-projeto-explicito.test.ts`: `duplicateVersion` não é mais exportada.

## Atualização — Prompt AP (01/10/2026)

- Com `/versao` fora, **não há mais caminho de exclusão de versão pela
  interface.** `deleteVersion` saiu junto. Remover uma versão passa a ser
  operação de banco, com backup antes.
- A importação desta regra (`importVersionData`, que não apaga nada) não
  mudou. Ela agora mora no cartão "Planilha da versão Atual", na tela
  Projetos, e exige `projeto:editar`.

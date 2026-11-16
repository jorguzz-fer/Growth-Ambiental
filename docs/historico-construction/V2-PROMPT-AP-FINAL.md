# Prompt AP · Relatório final — a tela de Configuração da Versão sai

Prompt AP (33 de 42). Três PRs, todos mergeados: Fase 1, AP-1 e AP-2.
Detalhes em [`V2-PROMPT-AP-FASE1.md`](./V2-PROMPT-AP-FASE1.md) e
[`V2-PROMPT-AP-PR1.md`](./V2-PROMPT-AP-PR1.md).

## 1. A coleta da Etapa 1

Está na íntegra em [`TELA-VERSAO.md`](./TELA-VERSAO.md): a página, os
componentes, as actions, `version-io.ts`, a tabela com os ON DELETE, quem
cria versão, quem lê `locked` e `isDefault`, e as respostas de (a) a (l).

## 2. BAP-1: quem cria as versões

`createProject` grava `budget`, `forecast` e `atual` na mesma transação do
projeto. `/versao` não criava versão nenhuma. **Projeto novo continua
nascendo com as três**, e o teste de `projetos-b.test.ts` confere.

## 3. BAP-2: a trava mudou de lugar

- Base local: **0** versões travadas. Produção: relatório 1 do SQL.
- A trava é checada por cerca de 20 actions, então foi adotada a opção 2.
- Ela tem permissão própria, `versaotrava`, só owner e admin pelo padrão.
- Fica na barra de Orçamentos e de Previsão, e no cartão "Versões do
  projeto" da tela Projetos, para todas as versões, inclusive a Atual.
- Nenhuma versão fica travada sem saída.

## 4. BAP-3: a importação ficou, em outro lugar

`importVersionData` **não apaga nada** desde 30/09/2026. Ela cobre um caso
que nenhuma outra tela cobre: lançamentos e INCC da Atual em massa. A tela
de Orçamentos importa só a grade de planejamento, no navegador.
`importBudgetXlsx` é código morto. Por isso a planilha não saiu: modelo,
exportação e importação foram para a tela Projetos, sob `projeto:editar`.

## 5. BAP-4: a versão padrão

`setDefaultVersion` saiu. **Ninguém vê nada diferente**, porque os valores
gravados não mudaram.
- O contexto escolhe a Atual primeiro, e todo projeto local tem Atual.
  Produção: relatório 3.
- `is_default` ainda escolhe **qual Orçamento** o card Orçado x Realizado
  usa quando o projeto tem mais de um. Produção: relatório 2.
- Quem tiver dois Orçamentos não troca mais esse padrão pela tela.

## 6. Arquivos removidos

- `src/app/(app)/versao/page.tsx`
- `src/app/(app)/versao/export/route.ts`, copiado antes para
  `/projeto/planilha/exportar`.
- `src/app/(app)/versao/template/route.ts`, copiado antes para
  `/projeto/planilha/modelo`.
- `src/components/app/version-identity.tsx`
- `src/components/app/version-config.tsx`, que já era código morto.
- `src/lib/actions/versions.ts`, com `updateVersion`, `toggleVersionLock`,
  `setDefaultVersion` e `deleteVersion`.
- O id `versao` em `SCREENS`.

Ficaram:
- `ImportVersion`, agora usado pela tela Projetos.
- `version-io.ts` e `versao-importacao.ts`.
- `budget-matrix.tsx`, que é morto mas não é desta tela.

## 7. A rota

| Rota antiga | Destino |
|---|---|
| `/versao` e subcaminhos | `/projeto?de=versao`, com aviso de uma linha |
| `/versao/export?v=` | `/projeto/planilha/exportar?v=` |
| `/versao/template?v=` | `/projeto/planilha/modelo?v=` |

Todos são 307, então o navegador não grava o desvio. Não sobrou rota sem
enforcement.

## 8. Antes e depois (testes 4 e 5)

Os relatórios 5 e 6 do SQL rodaram na base local antes de qualquer código
do AP e depois do AP-2. **A saída foi idêntica**, conferida com `diff`:
- `version` por projeto e tipo, com `locked`, `is_default` e situação;
- contagem de `budget_line`, `unit`, `despesa` e `cash_entry` por versão.

Em produção, rodar o mesmo SQL antes e depois do deploy.

## 9. Nenhuma versão apagada, alterada ou destravada

Nenhum `DELETE` e nenhum `UPDATE` em `version` por esta tarefa. O único
`UPDATE` novo é o da trava, por ação do usuário. No teste de navegador a
Atual foi travada e destravada, e voltou ao estado de antes.

## 10. Nenhuma migração

Só comentários novos no schema, em `is_default` e `locked`, dizendo quem
escreve agora.

## 11. Documentos atualizados (seção 8)

| Prompt cita | Atualizado em |
|---|---|
| `PROMPT-H`, item 1.4 | `V2-PROMPT-H-FINAL.md` |
| `PROMPT-I`, BI-3 | `V2-PROMPT-I-BI3.md` |
| `PROMPT-AA`, BAA-2 | o Prompt AA ainda não rodou; a nota abaixo vale para ele |
| `PROMPT-AJ` | `V2-AJ.md` (37 telas) |
| `PROMPT-C` | `V2-PROMPT-C.md` |
| `ROTEIRO-EXECUCAO.md` | não existe no repositório |

**Nota para o Prompt AA:**
- As versões copiadas continuam no banco, e a resolução é conviver com
  elas, não apagá-las.
- Esta remoção **não corrige** o RC-1 nem o RC-2: o Dashboard ainda soma o
  caixa de todas as versões.

## 12. Limitações

- **Renomear e mudar a cor de versão** saiu sem destino. Os nomes ficam
  como estão.
- **A versão padrão** não se troca mais pela tela (item 5).
- **Testes antigos.** Os testes de `updateVersion`, `setDefaultVersion` e
  `deleteVersion` testavam ações que saíram. Eles foram trocados por testes
  que confirmam que essas ações não existem mais. O teste do contexto de
  versão ficou como era.
- **Override com a chave `versao`.** Quem tinha esse override, sem `projeto`
  ou `versaotrava`, perde a planilha e a trava. Pelo padrão ninguém fora de
  owner e admin tinha. Produção: relatório 7 do SQL.

## Perguntas para o dono

1. **BAP-2:** confirma a trava nas telas de Orçamentos, Previsão e Projetos,
   com a permissão própria "Travar e destravar versão"?
2. **Renomear versão:** precisa de um lugar para isso, ou os nomes atuais
   bastam?
3. **Orçamento padrão:** algum projeto tem dois Orçamentos? Se tiver, onde
   prefere escolher qual vale no card Orçado x Realizado?

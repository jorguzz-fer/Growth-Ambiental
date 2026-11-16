# Prompt AP · Configuração da Versão sai — Fase 1, coleta e bloqueios

Prompt AP (33 de 42). **Só leitura nesta fase; nada foi alterado.**

- Coleta da Etapa 1, com o código na íntegra e as respostas de (a) a (l):
  [`TELA-VERSAO.md`](./TELA-VERSAO.md).
- SQL só de leitura:
  [`sql/v2-prompt-ap-diagnostico.sql`](./sql/v2-prompt-ap-diagnostico.sql).
  Os relatórios 5 e 6 são a fotografia de antes e depois.

## Bloqueios

| | O que a coleta mostra | Decisão adotada |
|---|---|---|
| **BAP-1** | `createProject` grava as três versões na mesma transação do projeto. `/versao` **não cria versão nenhuma**. | A tela sai sem perda. Projeto novo continua nascendo com as três. |
| **BAP-2** | `version.locked` é checada por cerca de 20 actions, de despesas, unidades, caixa, planejamento e medição. **Só `/versao` escreve a coluna.** Base local: 0 travadas. Produção: relatório 1. | **Opção 2: a trava muda de lugar**, com permissão própria (ver abaixo). Serve qualquer que seja a contagem de produção: nenhuma versão fica travada para sempre. |
| **BAP-3** | `importVersionData` **já não apaga nada** desde 30/09/2026. Ela é o único caminho em massa para unidades, liberações, permutas, despesas e INCC da Atual. `importBudgetXlsx` é outra coisa, linhas de planejamento, e **nenhuma tela a chama**. | **A planilha muda de lugar**: modelo, exportação e importação vão para a tela **Projetos**. O caso não tem outro destino, e a regra global 2 impede perdê-lo. |
| **BAP-4** | `isDefault` é lido pelo contexto (depois da Atual) e por `dre-inputs.ts`, que **escolhe qual Orçamento** o card Orçado x Realizado usa quando há mais de um. Base local: todo projeto tem `atual`. | `setDefaultVersion` sai. Os valores gravados **não mudam**, então ninguém vê nada diferente. Limitação: quem tiver dois Orçamentos não troca mais o padrão pela tela. Pergunta registrada. |

## Para onde vai cada coisa

| Capacidade | Destino |
|---|---|
| Travar e destravar | Botão na barra de Orçamentos e de Previsão, para a versão aberta. Para a Atual e as cópias, botão na lista de versões de cada projeto, na tela **Projetos**. |
| Permissão da trava | Nova tela `versaotrava`, "Travar e destravar versão". Pelo padrão, só owner e admin, como `versao` hoje. Pode ser dada por override. |
| Planilha modelo, exportar e importar | Cartão "Planilha da versão Atual" na tela **Projetos**, por projeto. As rotas de download passam a morar em `/projeto/planilha/…`. Exige `projeto:editar`, que pelo padrão é só owner e admin, como hoje. |
| Renomear e mudar a cor da versão | **Sai sem destino.** Os nomes gravados ficam. Pergunta registrada. |
| Versão padrão | Sai (BAP-4). |
| Excluir versão customizada | Sai, como o prompt pede. Exclusão vira operação de banco, com backup antes (4.3). |
| A rota `/versao` | Redireciona para `/projeto` com aviso de uma linha (seção 3). As rotas antigas de download redirecionam para as novas. |

## Achados

- **`version-config.tsx`** e **`budget-matrix.tsx`** não são importados em
  lugar nenhum. Com eles, `importBudgetXlsx` também é código morto. Ficam
  registrados e não são apagados nesta tarefa.
- **Base local:** ESCRITÓRIO CENTRAL e OBRA 7 TESTE só têm a versão Atual.
  Não foi `/versao` que as deixou assim, porque a tela não cria nem apaga
  versão fixa. O relatório 3 mostra se isso existe em produção.
- **A contagem de `SCREENS`** fica em 37: sai `versao`, entra `versaotrava`.
  O prompt previa 36, sem contar a `conferencia` do Prompt AN e a trava.

## Plano de PRs

1. **AP-1:** a trava e a planilha mudam de lugar. Nada sai ainda.
2. **AP-2:** `/versao` sai, com redirecionamento, documentos e relatório
   final.

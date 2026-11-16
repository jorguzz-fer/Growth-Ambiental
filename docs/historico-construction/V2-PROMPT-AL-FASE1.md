# Prompt AL · Acesso Contabilidade sai — Fase 1, inventário

Prompt AL (31 de 42). A tela `/contabilidade` sai, e o que o contador vê
passa a ser ajustável em Gestão de Acessos, com teto de leitura. **Só
leitura nesta fase; nada foi alterado.**

- Coleta do BAL-1, com o código na íntegra:
  [`TELA-CONTABILIDADE.md`](./TELA-CONTABILIDADE.md).
- SQL de diagnóstico (só leitura):
  [`sql/v2-prompt-al-diagnostico.sql`](./sql/v2-prompt-al-diagnostico.sql).

## Bloqueios

| | O que o código mostra | Decisão adotada |
|---|---|---|
| **BAL-1** | O convite da tela é a mesma função `invite` da tela Usuários, com o papel fixo em `contador`. Usuários faz o mesmo escolhendo o papel no seletor. Os três números existem na DRE. | **Nada é exclusivo da tela.** Nada migra. A tela sai sem perda de função. |
| **BAL-2** | O padrão do contador já é só `ver` em oito telas. Hoje um override gravado pode dar `criar`, `editar` ou `excluir` a ele. | **Opção 1, teto de leitura** (recomendada). Só reduz acesso. Pergunta registrada para o dono. |
| **BAL-3** | Usuário com a URL no favorito chegaria numa página inexistente. | **Redirecionar para `/usuarios` com aviso de uma linha** (recomendada). |

## Achados

- **Quem alcança a tela hoje.** O id `contabilidade` está no módulo Config.
  Pelo padrão de hoje, só owner e admin o veem. O contador **não** tem a
  tela na lista dele. Por isso o redirecionamento para Usuários serve a
  todos que a usavam.
- **A linha do contador já é editável em `/acessos`.** O Prompt AJ deixou a
  matriz editável para todo papel fora owner e admin. O que falta é a tela
  dizer qual é o padrão do papel (2.5) e respeitar o teto (3.3).
- **Convite sem senha.** O formulário da tela não tem campo de senha. O
  contador convidado por ela nasce sem senha e não entra até alguém definir
  uma em Usuários. Usuários tem o campo de senha inicial.
- **Convite troca papel de quem já existe.** Se o e-mail já tem vínculo na
  empresa, `invite` troca o papel dele. Vale para as duas telas. Fica como
  limitação no relatório. Não é desta tarefa.
- **Base local:** só owner e admins, nenhum contador e nenhum override. O
  SQL roda limpo e devolve zero linhas nos itens 1 a 5.

## Divergência entre Contabilidade e DRE (1.7) — registrar, não corrigir

As duas contas, lado a lado:

| Tela | Conta |
|---|---|
| Acesso Contabilidade | `receita = soma de getMonthlyRevenue(versão Atual, projeto)` · `despesas = soma de valor de getDespesas(versão Atual)` · `resultado = receita − despesas` |
| DRE | `waterfall`: `RF = Receita − Custo Variável − Despesa Variável − Custo Fixo − Despesa Fixa − Retiradas − Investimentos − Empréstimos − Despesas Financeiras`, com os insumos de `versionInputsByMonth` |

O prompt supõe que a diferença é a linha Empréstimos, subtraída só na DRE.
**O sinal não bate com essa hipótese.** O resultado da Contabilidade é o
menor dos dois, ou seja, ela subtrai **mais** que a DRE. A causa mais
provável é a soma crua de todas as despesas da versão, inclusive de
categorias que a DRE não leva para a cascata. A tela sai e a divergência é
encaminhada ao **Prompt AC, RC-D5**, como prova de que duas telas calculavam
resultado por caminhos diferentes.

## Plano de PRs

1. **AL-1 · a tela sai (Parte 1).**
   - Redirecionamento de `/contabilidade` para `/usuarios`, com aviso de uma
     linha lá.
   - Removidos a página, o item de menu, o id `contabilidade` de `SCREENS`,
     a action `inviteContador` (só esta tela a usava) e o `revalidatePath`.
     A função `invite` fica.
   - Override gravado para `contabilidade` fica no banco, inerte.
   - Varredura de menções e documentos da seção 5.
2. **AL-2 · contador configurável com teto (Partes 2, 3 e 4).**
   - Teto de leitura no último passo de `effectivePermissions`, depois do
     merge dos overrides.
   - A action de salvar recusa escrita para contador, com o motivo.
   - A matriz mostra só a coluna Ver na linha do contador, com traço nas
     outras, e declara o padrão do papel.
   - Teste antes e depois, célula a célula, de cada papel.
   - Relatório final.

## Documentos da seção 5

Os nomes citados pelo prompt não existem com esse nome no repositório. Os
equivalentes atualizados serão:

| Prompt cita | No repositório |
|---|---|
| `PROMPT-C-SIDEBAR.md` | `V2-PROMPT-C.md` |
| `PROMPT-M-PERMISSOES-CLIENTES.md` | `V2-M-PARTE2.md` |
| `PROMPT-AJ-GESTAO-DE-ACESSOS.md` | `V2-AJ.md` |
| `PROMPT-AK-LOG-DE-AUDITORIA.md` | `V2-AK-AI.md` |
| `CONTINUAR-REVISAO.md`, `ROTEIRO-REVISAO.md` | não existem; nada a atualizar |

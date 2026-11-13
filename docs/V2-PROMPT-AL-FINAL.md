# Prompt AL · Relatório final — Acesso Contabilidade sai; o contador vira configurável

Prompt AL (31 de 42). Três PRs, todos mergeados:

| PR | O quê |
|---|---|
| Fase 1 | coleta do BAL-1, inventário e SQL |
| AL-1 | a tela sai |
| AL-2 | contador configurável, com teto de leitura |

Detalhes em [`V2-PROMPT-AL-FASE1.md`](./V2-PROMPT-AL-FASE1.md),
[`V2-PROMPT-AL-PR1.md`](./V2-PROMPT-AL-PR1.md) e
[`V2-PROMPT-AL-PR2.md`](./V2-PROMPT-AL-PR2.md).

## 1. Coleta do BAL-1

Está em [`TELA-CONTABILIDADE.md`](./TELA-CONTABILIDADE.md). O convite da tela
era a mesma função `invite` da tela Usuários, com o papel fixo em
`contador`. **Nada era exclusivo da tela, e nada precisou migrar.**

## 2. BAL-2: teto de leitura

Adotada a opção 1, a recomendada. Ela só reduz acesso. **Pergunta para o
dono:** confirma que o contador nunca lança nada? Se um dia alguém de fora
precisar lançar, a proposta é criar outro papel, com outro nome.

## 3. BAL-3: redirecionamento

`/contabilidade` vai para `/usuarios` com aviso de uma linha. É um 307,
então o navegador não grava o desvio.

## 4. Arquivos removidos

- `src/app/(app)/contabilidade/page.tsx`.
- A action `inviteContador`.
- O item de menu e o id em `SCREENS`.

Componentes compartilhados encontrados e mantidos: `ProjectPicker`,
`LembrarProjeto`, `RecuperarProjeto`, `FormComResultado`, `PageHeader`,
`AccessDenied` e os de `ui/`.

## 5. Varredura (1.6)

Não sobrou nenhuma menção à rota nem ao id no código. O teste
`telas-removidas.test.ts` confere isso. As outras ocorrências da palavra
"contabilidade" são texto de negócio, como "confirme com a contabilidade".

## 6. Divergência entre Contabilidade e DRE, para o Prompt AC (RC-D5)

| Tela | Conta |
|---|---|
| Acesso Contabilidade (saiu) | `receita` = soma de `getMonthlyRevenue` · `despesas` = soma crua de `getDespesas` da versão Atual · `resultado = receita − despesas` |
| DRE | `Resultado Final = Receita − Custo Variável − Despesa Variável − Custo Fixo − Despesa Fixa − Retiradas − Investimentos − Empréstimos − Despesas Financeiras` |

**O sinal não bate com a hipótese do prompt.** O resultado da Contabilidade
([valor removido]) é o **menor**. Se a diferença fosse Empréstimos subtraído só na
DRE, a Contabilidade daria o maior. A causa mais provável é a soma crua de
todas as despesas da versão, inclusive de categorias que a DRE não leva para
a cascata. Nada foi corrigido aqui. A base local não tem esses lançamentos,
então o número não pôde ser reproduzido.

## 7. `CONTADOR_VE` como ponto de partida

A lista de oito telas não mudou. Ela é o padrão do papel. Owner ou admin
ajustam por membro em Gestão de Acessos, e a tela mostra a lista como
"Padrão do papel".

## 8. O teto

Ele é a última instrução de `effectivePermissions`, no mesmo laço do clamp
do Prompt AJ, **depois** do merge dos overrides. Um teste prova que um
override com escrita vira só Ver. A action de gravação recusa o mesmo, com o
motivo.

## 9. Antes e depois, célula a célula

- **Base local:** não há contador nenhum. A comparação foi feita em teste,
  com 400 combinações de override por papel, com a chave do membro ligada e
  desligada.
- **Owner, admin, membro e engenheiro:** nenhuma célula mudou.
- **Contador:** `ver` igual em todas as telas. A única diferença é a escrita
  negada.
- **Produção:** o item 2 do SQL lista exatamente as células de escrita que o
  teto vai negar.

## 10. Vínculos, papéis e overrides

Nenhum foi alterado. O item 6 do SQL tira uma fotografia, com hash do
override, para comparar antes e depois do deploy. Na base local a
fotografia ficou idêntica. O override com a chave `contabilidade` fica
inerte no banco.

## 11. Documentos atualizados (seção 5)

| Prompt cita | Atualizado em |
|---|---|
| `PROMPT-C-SIDEBAR.md` | `V2-PROMPT-C.md` |
| `PROMPT-M-PERMISSOES-CLIENTES.md` (seção 4) | `V2-M-PARTE1.md`, onde a seção 4 está. A Fase 1 apontava `V2-M-PARTE2.md` por engano. |
| `PROMPT-AJ-GESTAO-DE-ACESSOS.md` | `V2-AJ.md`, inclusive 38 para 37 telas |
| `PROMPT-AK-LOG-DE-AUDITORIA.md` | `V2-AK-AI.md` |
| `CONTINUAR-REVISAO.md`, `ROTEIRO-REVISAO.md` | não existem no repositório |

## 12. Limitações

- **O convite troca o papel de quem já existe.** Se o e-mail já tem vínculo
  na empresa, `invite` troca o papel. Era assim nas duas telas e continua
  assim em Usuários. Fica para quem cuidar de Usuários.
- **Salvar a linha do contador limpa a escrita antiga.** Override antigo de
  escrita, que o teto já anula, deixa de ser gravado quando owner ou admin
  salva a linha. O efetivo não muda. Ver o PR2.
- **Só o contador mostra o padrão do papel.** A matriz declara o padrão só
  na linha dele. Para membro e engenheiro a declaração não foi pedida.
- **Contador entra numa tela negada.** Depois do login ele cai em
  `/dashboard`, que não está no padrão dele, e vê "Acesso negado". Isso é
  anterior a esta tarefa.

## Perguntas para o dono

1. **BAL-2:** confirma o teto de leitura? O contador nunca lança?
2. Depois do login, o contador deveria cair na primeira tela que ele vê, em
   vez do Dashboard?

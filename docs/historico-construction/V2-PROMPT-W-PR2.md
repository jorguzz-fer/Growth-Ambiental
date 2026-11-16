# Prompt W · PR W-2 — exclusão cobre as seis tabelas

Seção 2 do Prompt W. **Nenhum registro existente é alterado; sem migração.**

## O que muda

| | Antes | Agora |
|---|---|---|
| **2.1 / 2.4** checagem | 1 de 6 (`despesa.fornecedor_id`); as outras cinco (`SET NULL`) deixavam a exclusão passar apagando o nome em silêncio, e `document` (`CASCADE`) apagava o registro do arquivo | `vinculosDoStakeholder` conta as **seis** dentro da transação (`FOR UPDATE` no cadastro) e `bloqueiosDeExclusaoDoStakeholder` (puro) devolve **qual vínculo e quantos**: "Não é possível excluir "X": 2 obrigação(ões) como pagador por terceiro; 1 documento(s) anexado(s). Inative o cadastro…" |
| **2.5** confirmação | `window.confirm` | Nome digitado na própria linha (`confirmacaoConfere`, a mesma de Clientes: sem diferenciar caixa e acento); botão desabilitado até digitar |
| **2.6** auditoria | só o id | nome, tipo, **documento mascarado**, papéis, ativo e a contagem de cada um dos seis vínculos |
| **2.7** | — | cadastro sem vínculo continua excluível (teste 3) |

`deleteStakeholder` passou a receber `FormData` (`id`, `confirmacao`), como
`deleteCliente`. Único chamador: a tabela de Fornecedores.

## Testes

`actions/stakeholders.test.ts` ganhou os itens 1 a 5 do prompt (6 casos; cada
uma das seis tabelas é semeada e a recusa nomeia o vínculo) e o caso sem
permissão. Suíte (1205), `tsc`, `eslint`, `next build` verdes. Navegador:
"Excluir" pede o nome; nome errado é recusado com a mensagem; nome certo em
caixa baixa exclui; log com o inventário. Hash de `stakeholder` antes = depois.

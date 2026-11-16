# Prompt X — PR 2: assistente de Contas Correntes (somente leitura)

Último passo do Prompt X. Entrega a seção 7 (assistente de IA, Prompt E).

## O que mudou
- `src/lib/contas-analise.ts` (puro, sem modelo, sem gravação):
  - **Não parecem conta bancária** — sem agência ou sem número (a varredura
    que originou a tarefa, disponível de forma contínua), com o saldo e a
    orientação (Ressarcimentos; inativar com histórico).
  - **Contas sem movimento** — sem lançamento de caixa vinculado nos últimos
    180 dias (ou nenhum).
  - **Saldo parado** — saldo não atualizado há mais de 90 dias (ou nunca),
    com a data da última alteração (`last_sync`, gravado no saldo manual e
    no extrato subido).
  - **Automáticas sem conexão** — o caso do BX-3.
- `getUsoDasContas` (queries): lançamentos de caixa por conta e data do
  último, só leitura.
- `src/components/app/assistente-contas.tsx`: painel ao lado do conteúdo em
  /contas, recolhível por usuário, selo "Somente leitura".

## Nunca (7.2)
Cadastrar, alterar saldo, inativar ou excluir conta. O painel não chama
nenhuma action.

## Testes
- `src/lib/contas-analise.test.ts`: as quatro varreduras (inativa fora de
  tudo; nunca atualizado conta como parado).
- Suíte completa: 131 arquivos, 1335 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Painel "Contas Correntes · 4 ativa(s)"; Saldo parado lista as quatro contas
("última alteração: nunca"); Contas sem movimento lista as quatro (sem
lançamento vinculado); Não parecem conta: "Toda conta ativa tem agência e
número"; recolher/abrir funciona. Sem erros de página. Hash de
`bank_account` igual.

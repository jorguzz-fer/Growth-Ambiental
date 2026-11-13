# Prompt T — PR 3: dados para ressarcimento, aging compartilhado e compensações

Terceiro passo do Prompt T (Ressarcimentos). Entrega as seções 2-A (aging num
só lugar), BT-2 (dados bancários / PIX do pagador) e 11 (compensações
visíveis na tela). Nenhum dado existente foi alterado.

## O que mudou

### 1. Dados para ressarcimento no cadastro do pagador (BT-2)
- Migração `0052_stakeholder_dados_bancarios`: sete colunas novas e opcionais
  em `stakeholder` (`banco_nome`, `banco_agencia`, `banco_conta`,
  `banco_tipo_conta`, `banco_titular`, `pix_tipo`, `pix_chave`). Só
  `ADD COLUMN IF NOT EXISTS`, com arquivo `down/` e entrada no journal.
- Formulário de novo stakeholder: bloco recolhido "Dados para ressarcimento
  (banco / PIX) — opcional". Edição inline na tabela: mesmos campos.
- O `updateStakeholder` só grava os campos de recebimento quando eles vêm no
  formulário, então um salvamento antigo (sem os campos) não apaga nada.
- **Auditoria protegida:** o `audit_log` registra que `pixChave` ou
  `bancoConta` mudaram, mas o valor aparece como `[protegido]` (de/para). A
  criação registra apenas `comDadosDeRecebimento: true/false`.
  Regra pura: `changesSemValorDeRecebimento` em `stakeholder-regras.ts`.

### 2. Aging num só lugar (2-A)
- Novo módulo puro `src/lib/calc/aging.ts`: `dataBaseDoAging` (previsão de
  ressarcimento, senão data do desembolso), `diasEmAberto` (nunca negativo),
  `agingDasObrigacoes` (faixas até 30 / 31–60 / 61–90 / +90 pelo saldo) e
  `somarAging`.
- A prévia do lote (`restituicao-lote.ts`) passou a usar o módulo; o
  `diasDesde` local foi removido.
- A conta corrente por terceiro (`getContaCorrenteTerceiros`) devolve o aging
  de cada pagador (obrigações canceladas não entram). A tela mostra a coluna
  "Em aberto há" por terceiro e o total por faixa no rodapé.

### 3. Compensações na tela (11)
- `getCompensacoes(tenantId)` lê a tabela `compensacao` (PED, terceiro,
  valor, data, saldos antes, obs).
- Card "Compensações (encontros de contas)" em /restituicoes, oculto quando
  não há nenhuma. Nada novo é criado por esse card: ele só mostra o que já
  existe.

## Testes
- `src/lib/calc/aging.test.ts`: base de cálculo, dias nunca negativos,
  distribuição por faixa e soma (12a, 12b).
- `src/lib/actions/dados-recebimento.test.ts` (integração): PIX e conta ficam
  gravados; o `audit_log` nunca contém o valor, só `[protegido]` (12c);
  `getCompensacoes` lê o que está gravado (11).
- Suíte completa: 119 arquivos, 1267 testes passando. `tsc`, `eslint` e
  `next build` limpos.

## Verificação no navegador (local)
- /fornecedores: bloco "Dados para ressarcimento" presente no cadastro; campos
  de PIX e conta aparecem na edição inline.
- /restituicoes: abre sem erros de página; card de compensações oculto (base
  local tem 0 compensações) e aging sem obrigações em aberto (0 registros).

## Dados
- Hash de `stakeholder` igual antes e depois (tenant Cliente Piloto). As tabelas
  `despesa_terceiro`, `restituicao` e `compensacao` continuam com 0 linhas na
  base local.
- A migração 0052 precisa subir em produção junto com as 0046–0051 ainda não
  confirmadas (ver V2-PROMPT-T-FASE1.md).

## Limites deste PR
- O aging por terceiro só aparece quando existem obrigações em aberto; com a
  base local vazia a verificação visual ficou restrita à estrutura da tela e
  aos testes puros.
- Os dados bancários nunca são enviados ao assistente (seção 10, próximo PR).

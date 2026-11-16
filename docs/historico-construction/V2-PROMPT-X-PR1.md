# Prompt X — PR 1: contas correntes com retorno legível, inativar, exclusão verificada e orientação

Primeiro passo do Prompt X. Entrega as seções 1, 2, 4, 5 e 6 e as portas
que a seção 3 precisa (inativar; excluir com inventário). **Nenhuma conta
foi alterada, inativada ou removida**; nenhum saldo recalculado.

## O que mudou

### Migração 0057 `bank_account.ativo` (aditiva, `IF NOT EXISTS`, com `down/`)
Padrão `true`: toda conta existente continua ativa. Inativa fica no cadastro
e sai do saldo total (3.2).

### Actions — `actions/contas.ts` (5.3: todas devolvem `{ ok, error }`)
- `addConta`: banco obrigatório; saldo numérico (negativo aceito; texto e
  vazio recusados — 5.2); sem agência e conta **avisa** no retorno e no
  log, sem bloquear (1.3).
- `updateConta`: mesma validação; auditoria **campo a campo com valor
  anterior e novo** (`diffAudit`) — antes só gravava o valor novo (4.3).
- `setContaAtiva`: inativar/reativar com audit.
- `inventarioDaConta` (só leitura) e `deleteConta`: verifica as **dez**
  tabelas com FK (`despesa`, `despesa_parcela`, `pagamento`, `restituicao`,
  `acerto`, `repasse`, `cash_entry`, `conta_receber`, `cartao_credito`,
  `fatura_pagamento`) e recusa dizendo **qual** vínculo impede (5.4). Sem
  vínculo, exclui e grava o inventário no log.
- Regras puras em `src/lib/contas-regras.ts`; contagem em
  `src/lib/conta-vinculos.ts`.

### Saldo (2.2 / 5.5)
`saldoDisponivel` e `saldoDevidoTerceiros` (`contas-saldo.ts`) ignoram
contas inativas (`ativo` ausente = ativa). Caixa, Fechamento e Fluxo usam
essas funções: **nenhum número muda** até alguém inativar uma conta. A tela
mostra "Saldo total — soma apenas as N conta(s) ativa(s)" e os totais por
tipo (Construtora / Imobiliária / Terceiros).

### Tela
- Texto fixo (1.1) com o que entra e o que não entra, preservando a
  explicação de Open Finance/manual (1.2) e dizendo que "Automático" sem
  conexão só reflete o último extrato subido (BX-3).
- Formulário (cliente) com aviso ao vivo sem agência/conta e mensagens de
  erro; opção "Automático (quando conectado)" (4.1).
- Tabela: coluna Situação (ativa/inativa), Inativar/Reativar, Excluir que
  mostra o inventário antes e só confirma sem vínculo; rótulo "não
  conectada: só atualiza pelo extrato subido no Caixa" quando auto sem
  `openFinanceId`.
- Matriz de permissões: `contas` passa do módulo Despesas para
  "Conciliação de Caixa" (6) — o id da tela não muda, nenhuma permissão
  gravada se perde. No menu já estava em Caixa (Prompt C).

### Fora
`addBankAccount` (cadastro rápido em Fornecedores) não foi tocado —
registrado na Fase 1.

## Testes
- `contas-regras.test.ts`: 9/5.2, 2/1.3, 7/4.1, 3/6 (total só ativas e
  por tipo; `saldoDisponivel` sem inativa), 4/5 (bloqueios nomeiam o
  vínculo). `contas-saldo.test.ts`: inativa fora do saldo.
- `actions/contas.test.ts` (integração): 2, 9 (negativo aceito; vazio e
  texto recusados), 8 (anterior e novo no log), 4 (recusa diz "1
  lançamento(s) de caixa, 1 cartão(ões) de crédito"), 6 (inativar preserva
  e tira do total), 5 (sem vínculo exclui).
- Suíte completa: 130 arquivos, 1333 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Orientação no topo; total "soma apenas as 4 conta(s) ativa(s)" e totais por
tipo; cadastro "SOCIO TESTE" sem agência/conta avisa e cadastra; saldo
−100 salvo e refletido no total; inativar tira do total (volta a R$ 0) e
marca "inativa"; "Automático" sem conexão mostra "não conectada: só
atualiza pelo extrato"; excluir sem vínculo pede confirmação e exclui.
Hash de `bank_account` igual antes e depois (teste 12); saldo disponível
igual (teste 13).

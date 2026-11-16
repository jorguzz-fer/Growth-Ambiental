# Prompt I · Fase 1 — inventário antes de escrever código

O próprio Prompt I manda parar ao fim da Fase 1 e entregar o inventário: "o
tamanho encontrado decide se isto é uma PR ou seis" (§50). Este é o inventário.
**Só leitura; nada foi alterado.**

## O que já está feito por prompts anteriores

| Seção | Situação |
|---|---|
| §6 · fim do projeto ativo global | **Feito** no Prompt A (PRs #88–#98) |
| §7 · helpers centrais de versão | **Parcial**: `getProjectVersion`, `getVersionContext`, `getWorkingVersion`, `getAtualVersion`, todos com `tenantId` obrigatório. Falta só o nome `requireAtualVersion` (o mesmo que `getAtualVersion` + recusa) |
| §9 · auditoria de gravações | **Feito** no inventário do Prompt A (`V2-PROMPT-A-INVENTARIO.md`) |
| §22 · id externo sem tenant (`updateProject`, `deleteProject`) | **Feito** no Prompt A: as duas gravam com `tenantId` na cláusula |
| BI-3 · versão por cópia e importação | **Feito** (PR #102) |
| §43 · diagnóstico | **Feito** para A–K, N–S, V, X, Y (diagnóstico de produção do cliente anterior, removido). Faltam L, M, T, U, W |
| B4 · chave por empresa | **Feito** (PR #103) |
| Idempotência em terceiro, restituição, lote, compensação, acerto, repasse | **Feito** nos Prompts anteriores (`idempotency_key` + índice) |

## O que o código mostra, seção a seção

### §10 · Contas a Pagar lê versões de planejamento

`getContasPagar` (`queries.ts`) filtra por empresa e `cancelado = false`, **sem
`version.kind = 'atual'`**. Alimenta Contas a Pagar, Dashboard, Fechamento e a
conciliação do extrato (`caixa.ts`).

**Muda número:** em produção há despesas na Previsão, em mais de uma empresa
([dado de produção removido]). Hoje elas aparecem como obrigação. Entra
**atrás de chave**, com a prévia mostrando exatamente essas linhas.

### §11 · Despesas — o que falta

| Item | Hoje |
|---|---|
| 11.1 valor | `addDespesa` barra zero, `NaN` e infinito, **não barra negativo**. `updateDespesa` não valida nada (`patch.valor || "0"`) |
| 11.2 criação atômica | **Não há transação**: despesa, parcelas, documento fiscal, anexos, obrigação com terceiro e réplicas recorrentes são inserts separados. Falha no meio deixa despesa pela metade |
| 11.3 soma das parcelas | Parcelas vindas do painel são gravadas **sem conferir** com o valor quando os dois vêm preenchidos. Produção tem casos ([dado de produção removido]) |
| 11.4 status da parcela | `txt(p.status) ?? "Pendente"` — vem do formulário **sem lista fechada** no servidor; `STATUS_PARCELA` existe em `calc/parcelas.ts` e não é usada aqui |
| 11.5 recorrência | As réplicas copiam o `core` inteiro: **status e `pagoPorTerceiro` vão junto**. Confirmar no código da PR e não copiar |
| 11.6 edição com dependência | `updateDespesa` aceita mudar valor, status e competência **mesmo com parcelas, pagamentos ou acerto** vinculados. Só recusa despesa cancelada |
| 11.7 lock no servidor | Verificado em `addDespesa`, `registrarPagamento`, `saveUnit`, importações de Orçamento e Previsão. **Não verificado** em `updateDespesa`, `deleteDespesa`, `cancelarDespesa`, `pagarDespesa`, `updateMedicao`, `deleteMedicao`, `deleteUnit`, `importUnits` |
| 11.8 / 11.9 retorno | `return` mudo sem permissão: `addDespesa`, `updateDespesa`, `deleteDespesa`, `deleteUnit`, `deleteChartItem`, `deleteChartGroup`, `updateMedicao`, `deleteMedicao`. O resto lança erro, que em produção chega sem mensagem |
| 11.10 lock em massa | `importUnits` **não** verifica; `importVersionData` e as planilhas de Orçamento e Previsão verificam |

### §12 · Exclusões físicas

| Action | Hoje | Correção |
|---|---|---|
| `deleteDespesa` | `DELETE` com cascata, **sem olhar** pagamentos, parcelas pagas, caixa conciliado, acerto, restituição ou documento fiscal. Convive com `cancelarDespesa` | recusar com dependência; sem dependência, só registro recém-criado |
| `deleteUnit` | `DELETE` sem confirmação; auditoria guarda só o id; leva o plano de pagamento | confirmação, travas (cliente vinculado, venda) e auditoria com código, valor e status |
| `deleteChartItem` / `deleteChartGroup` | `DELETE` físico; `budget_account.row_key` é texto, então os valores ficam órfãos ("legado") | `setChartAccountAtivo` já existe: inativar em vez de apagar |
| `cancelarRestituicao` | `DELETE` físico da restituição (§24) | `restituicao` **não tem coluna de status**: migração aditiva (cancelada, quando, por quem, motivo) |

### §13 · `pagarDespesa`

Três gravações fora de transação (pagamento, despesa, caixa). **Sem
idempotência**. Status decidido pelo pagamento isolado, não pelo acumulado
(100 pagos como 60 + 40 fica "Parcialmente paga"). Não verifica lock nem
`kind = 'atual'`.

### §14 · `registrarPagamento`

Versão sai da própria parcela (Prompt A). Mas: **grava `input.valorOriginal` do
navegador** na tabela de pagamentos (o status usa o valor persistido, o que é
certo); sem transação; sem idempotência; **não recalcula a despesa-mãe**; não
confere `kind = 'atual'`.

### §15 · saldo a pagar

Não existe helper. O "Pendente" de Contas a Pagar é somado no componente
(`contas-pagar-table.tsx`, `totalPend`) pelo valor original; `fluxo-caixa.ts`
soma parcelas pelo `valorOriginal`, sem descontar o pago.

### §16 · "Vencida"

Derivada da data em **dois componentes separados** (`contas-pagar-table.tsx` e
`despesas-table.tsx`), no cliente. Unificar num helper único.

### §17 · Acerto Contábil

`concluirAcerto` tem transação e idempotência, mas usa **`Number(d.valor)`
como saldo disponível** — exatamente o que a seção proíbe —, sem `FOR UPDATE` e
sem descontar abatimentos anteriores. Dois acertos sobre o mesmo PED passam.

### §19 · Medições

`addMedicao` já exige obra e vai para a Atual (Prompt A). `updateMedicao` e
`deleteMedicao` validam só a empresa: **sem lock, sem verificar a versão**.

### §20–21, 23, 26 · Terceiros, restituições, lote, compensação

`restituicoes.ts` (947 linhas), `restituicao-lote.ts` (520) e
`recebimento-terceiro.ts` (492) já receberam transação e idempotência em prompts
anteriores. A conferência de saldos (§26, "uma lógica só para a conta corrente")
e o estorno em lote (§23) precisam de **inventário próprio**, na Fase 4.

### §37 · SQL sobre data em texto

Nenhuma cláusula `WHERE` de período em SQL sobre coluna de texto (bom). Seis
**ordenações** em SQL sobre texto, todas lexicográficas — erram na virada do
ano:

| Onde | Coluna | Formato |
|---|---|---|
| `pagamentos.ts:144` | `pagamento.data_pagamento` | MM/DD/YYYY |
| `queries.ts:243` (`getDespesas`) | `despesa.competencia` | MM/YYYY |
| `queries.ts:310` | `despesa.competencia` | MM/YYYY |
| `queries.ts:1066` (`getCash`) | `cash_entry.data` | MM/DD/YYYY |
| `queries.ts:1198` (`getMedicoes`) | `medicao.competencia` | MM/YYYY |
| `queries.ts:1923` | `conta_receber.vencimento` | MM/DD/YYYY |
| `ponto.ts:190` | `time_entry.data` | MM/DD/YYYY |

Afetam **ordem de exibição** e qualquer FIFO (§25), não somas.

### §46 · auditoria

`addPermuta`, `addReembolso` e `saveIncc` gravam sem `logAudit` (mais dez sem
efeito contábil, pelo mapa). `updateProject` já registra de → para (Prompt AK).

## Plano de PRs — cada uma sobe e volta sozinha

| # | PR | Seções | Muda número? | Migração |
|---|---|---|---|---|
| **I-1** | Despesas: valor, parcelas conferidas, status fechado, recorrência limpa, edição com trava, lock em tudo, transação, `{ ok, error }` | 11.1–11.10, 19 | Não | Não |
| **I-2** | Pagamentos: transação, idempotência, status acumulado, despesa-mãe, valor do servidor | 13, 14 | Não | `pagamento.idempotency_key` (aditiva) |
| **I-3** | Exclusões: travas em `deleteDespesa` e `deleteUnit`, plano de contas inativa em vez de apagar, restituição cancelada em vez de apagada | 12, 24 | Não | `restituicao.cancelada…` (aditiva) |
| **I-4** | Acerto: saldo real com abatimentos anteriores e `FOR UPDATE`; conferência do rateio | 17, 18 | Não | Não |
| **I-5** | Contas a Pagar: só Atual **atrás de chave**; helper de saldo a pagar; "Vencida" única | 10, 15, 16 | **Sim** ([valor removido]), só com a chave ligada | Não |
| **I-6** | Datas em texto: as 7 ordenações normalizadas | 25, 37 | Não (ordem) | Não |
| **I-7** | Terceiros, restituições e compensação: inventário próprio e correções | 20, 21, 23, 26 | a definir | a definir |
| **I-8** | Camada analítica e relatórios | 28–41 | Sim | — |
| **I-9** | Receita por rateio e fontes da DRE | 54–57 | Sim | a definir |

**I-1 a I-6 não dependem de nenhuma decisão pendente** e não alteram dado
gravado. **I-8 e I-9 esperam** BI-1, BI-2, BQ-2 (o valor nominal ou corrigido)
e as obras sem início e fim com datas preenchidas.

Ordem: I-1 → I-2 → I-3 → I-4 → I-5 → I-6. Depois, o Prompt J (Unidades), que
já está destravado.

## Diagnóstico: o que ainda falta (§43 L, M, T, U, W)

- **U** dá em SQL, abaixo.
- **T** (competência fora da janela) só faz sentido depois das obras terem
  início e fim — hoje 19 não têm.
- **L, M, W** dependem das regras de cálculo do app (saldo de lote, conta
  corrente, soma do plano de pagamento). Saem como script `tsx` na PR I-7 (L,
  M) e na I-9 (W).

```sql
-- U · contas do Orçamento/Previsão cujo código não existe mais no plano de contas ativo
SELECT t.name AS empresa, ba.kind, ba.row_key, count(*) AS linhas, sum(ba.total) AS total
FROM budget_account ba JOIN tenant t ON t.id = ba.tenant_id
WHERE NOT EXISTS (
  SELECT 1 FROM chart_account ca
  WHERE ca.tenant_id = ba.tenant_id AND ca.ativo AND (ca.code = ba.row_key OR ca.group_code = ba.row_key)
)
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
```

# Prompt T · Ressarcimentos e pagadores terceiros — Fase 1, inventário antes de escrever código

Prompt T (19 de 42), par do Prompt S (3-B) e do Prompt W (papel). **Só
leitura; nada foi alterado.** SQL em [`sql/v2-prompt-t-diagnostico.sql`](./sql/v2-prompt-t-diagnostico.sql).

## Bloqueios

| | Situação |
|---|---|
| **BT-1** | Resolvido no Prompt W: papel **"Pagador por Terceiro"** em `PAPEIS_STAKEHOLDER`; `papeis` é `text[]` nativo (confirmado no banco local: `text[]`). Local: 0 cadastros com o papel, 0 obrigações. Quem já tem obrigação recebe o papel por decisão humana (consulta BT-1 do SQL lista os candidatos; o assistente de Fornecedores também) |
| **BT-2** | Decidido: colunas **aditivas** em `stakeholder` (banco, agência, conta, tipo de conta, titular, tipo e chave PIX) — migração 0052 com `down`. Dado sensível: só na tela, **nunca no assistente** (todos os assistentes são puros e não recebem esses campos) e **nunca em claro no `audit_log`** (`changes` registra que mudou, sem valor) |

## O que o Prompt I já fez (e não se toca)

| Seção do T | Situação |
|---|---|
| **3** estorno preservando o documento | **Feito (I §24):** `cancelarRestituicao` marca `cancelada`, `cancelada_em`, `cancelada_por`, `motivo_cancelamento`; a linha fica; caixa: desfaz conciliação se veio do extrato, senão estorno "ajuste" |
| **4** estorno em lote lê `restituicao_item` | **Feito (I §23):** devolve a cada obrigação o `valorAbatido` dela e recalcula o status; só a avulsa devolve tudo à âncora. 4.3: diagnóstico no SQL (local: 0 restituições) |
| **9** retorno legível | **Feito:** `cancelarRestituicao` devolve `{ ok, error }`. **Porta de interface: não existe** — nenhum componente a chama (código sem porta). Entra na T-1 um botão "Cancelar" no extrato do terceiro |
| **0** menu | o menu já diz "Ressarcimentos" (Prompt C, `nav-menu.ts`); faltam o título da página, os rótulos da tela e o rótulo da permissão |
| **1.4** select de pagador | **Feito (W-3):** "Quem desembolsou" só com o papel, ativo |
| Idempotência, `FOR UPDATE`, conciliação sem duplicar caixa, vínculo por PED sem sobrescrever, `rotuloStatusObrigacao`, compensação com saldos brutos | ✔ intactos |

## O que o código mostra, seção a seção

- **2 / S 3-B.3 — a obrigação já nasce no lançamento:** `addDespesa` **já cria** `despesa_terceiro` na mesma transação quando a despesa vem "paga por sócio" (`pagoPorSocioId`, `socioDataPagamento`, `socioReembolsavel`), com `pagoPorTerceiro: true` e status "Pago". Só o seletor é restrito a "Sócio/Quotista" (`getSocios`). **Mover, não reimplementar:** o bloco vira "Origem do pagamento: conta da empresa / pago por terceiro" e o seletor passa a oferecer os pagadores (papel), com a mesma action — o modo "despesa nova" de `criarDespesaTerceiro` sai, e o modo por PED fica como único desta tela ("Vincular lançamento existente a um pagador"). **3-B.5 (bloqueio menor):** a despesa paga por terceiro **continua "Pago"** — o fornecedor foi pago; o que a empresa deve é a obrigação, que já aparece em Contas a Pagar. Se a despesa não nascesse paga, Contas a Pagar contaria a mesma saída duas vezes (despesa + obrigação). Decisão registrada; reversível em uma linha.
- **2-A aging:** `calcularAging` existe em `restituicao-lote.ts` (0–30, 31–60, 61–90, 90+) e só aparece no preview do lote. Vai para função pura compartilhada (`calc/aging.ts`), usada pelo preview, pela conta corrente por terceiro e pelo total do topo; data-base = previsão de restituição, senão data do desembolso (mesma da coluna Dias).
- **5 busca por PED:** `buscarDespesasPorPed` faz `ilike(numDoc) OR ilike(obs)` — confirmado. Passa a só `numDoc`, normalizando o sufixo numérico ("123" = "000123" = "PED-000123").
- **6 escopo:** `getDespesaTerceiros(tenantId, versionId)` filtra pela versão da tela; a conta corrente é da empresa. A lista passa a ser da empresa com filtro por obra. Local: 0 obrigações (consulta 6.3 para produção).
- **7 compensações:** gravadas em `compensacao` (com `num_doc` da sequência de despesas) e **nunca lidas de volta** fora da conta corrente. Entra a lista (data, terceiro, valor, saldos de antes, documento). 7.3 local: 0 PEDs consumidos.
- **8 coluna Dias:** `diasEmAberto` usa `Math.max(0, …)`: zero significa sem data, futuro ou hoje. Passa a distinguir atraso / a vencer / sem previsão.
- **10 assistente:** não existe; entra somente leitura, puro.

## Plano de PRs

| PR | Conteúdo | Muda dado? |
|---|---|---|
| **T-1** · tela | 0 rótulos; 1 bloco de pagadores (lista, conceder a cadastro existente, retirar com bloqueio por obrigação, auditoria com nome e doc mascarado; cadastro novo vai por Fornecedores); 5 busca só por PED normalizado; 6 lista da empresa com filtro por obra; 8 Dias; 9 porta para cancelar restituição | Não |
| **T-2** · porta única e aging | 2 formulário de despesa nova sai daqui (fica o vínculo por PED); Despesas ganha "Origem do pagamento" com pagadores (S 3-B.3), reusando `addDespesa`; 2-A aging compartilhado na conta corrente e no topo; 7 lista de compensações; BT-2 migração 0052 + campos + máscara no log | Não (migração aditiva) |
| **T-3** · assistente | 10 (aging por terceiro, encontro de contas, conferir obrigações, concentração), puro | Não |

## Perguntas (nenhuma trava)
1. **3-B.5:** manter a despesa paga por terceiro como "Pago" (evita contar duas vezes em Contas a Pagar). Confirma?
2. **7.3:** compensação continua consumindo PED da sequência de despesas; sequência própria é decisão sua (conversa com o BR-1).

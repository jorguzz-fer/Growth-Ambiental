# Prompt K · PR K-2 — estados da conta, baixa e vínculo com o extrato

Terceira PR de código do Prompt K, conforme
[`V2-PROMPT-K-FASE1.md`](./V2-PROMPT-K-FASE1.md). Seções 3, 4 e 5.1, e o
bloqueio BK-1 (valor por vínculo) e BK-3 (centavos). Migração **0048**,
aditiva: **uma tabela nova** (`conta_receber_recebimento`) e nada mais —
nenhuma coluna existente muda, nenhum registro gravado é alterado. Tem `down`.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **3.1 · quatro estados** | A receber · Recebida (não conciliada) · Recebida e conciliada · Cancelada | `estadoDaConta()` em `conta-receber-estado.ts`: derivado dos recebimentos ativos (não estornados). "Recebida" quando a soma quita a conta mas algum recebimento não tem linha de extrato; "Recebida e conciliada" quando tudo está no extrato. Com recebimento parcial continua "A receber" com o saldo mostrado |
| **3.2 · estado nunca digitado** | o status muda só pelo que se registra | o formulário de edição **não tem mais** Status / Valor recebido / Data do recebimento. Se um cliente antigo mandar esses campos, a action ignora. A coluna `status` continua gravada como **cache** (`A receber` / `Parcialmente recebido` / `Recebido` / `Cancelada`) porque Fechamento, Caixa e os CSVs a leem; ela é recalculada a cada recebimento/estorno, nunca escrita à mão |
| **3.3 · baixa manual** | valor, data, forma | "Receber" na linha abre o painel: valor (padrão = o que falta), data, forma (`Extrato bancário`, `Espécie`, `Repasse de terceiro`, `Outro`). Grava `conta_receber_recebimento` |
| **3.4 · justificativa** | obrigatória fora do banco | qualquer forma ≠ Extrato bancário exige justificativa; a action recusa sem ela |
| **3.5 · indicador** | "Recebido sem conciliar: R$ X em N contas, o mais antigo há D dias" | faixa no topo da tela, sempre visível, âmbar quando há algo pendente |
| **4.1 · conciliar exige extrato** | só com linha do extrato (cash_entry) | forma Extrato bancário abre a lista de **entradas do extrato da obra com valor livre**; sem escolher, a action recusa. Quem concilia pelo Caixa (`conciliarContaReceber`) cai no mesmo caminho |
| **4.2 · valor por vínculo (BK-1)** | um depósito quita três parcelas; uma parcela em dois depósitos | cada recebimento tem o seu `valor` e o seu `cash_entry_id`. A soma dos vínculos ativos de um movimento não passa do valor do movimento (`disponivelNoMovimento`, verificado dentro da transação com `FOR UPDATE`) |
| **4.3 · estorno** | quem, quando, por quê; nada é apagado | "Estornar" pede o motivo; marca `estornado`, `estornado_em/por`, `motivo_estorno`; recalcula a conta; o movimento volta a `rec = false` quando não sobra vínculo ativo. Auditoria `contaReceber.estornoRecebimento` |
| **4.5 · campos antigos** | `cash_entry.conciliado_conta_receber_id` segue válido | continua gravado (primeiro vínculo ativo) e limpo no estorno, para a tela do Caixa e relatórios antigos |
| **5.1 · trava por dependência** | conta conciliada não muda valor nem vencimento | `updateContaReceber` recusa com "estorne o vínculo antes". Descrição, unidade, cliente e banco podem mudar. Valor nunca desce abaixo do já recebido. Cancelar com recebimento ativo é recusado |
| **BK-3 · centavos** | R$ 323,97 numa conta de R$ 324,00 | fecha ("quitada") com resíduo até **R$ 0,05**, e o resíduo fica na auditoria (`residuo`). **Tolerância a confirmar com o dono** |
| **idempotência** | — | cada gravação leva `idempotency_key` (índice único parcial); clique duplo não grava duas vezes |

## Arquivos

- `src/lib/conta-receber-estado.ts` (+ teste) — regras puras: estado, saldo, formas, recusas, indicador.
- `src/lib/conta-receber-recebimento.ts` — `gravarRecebimento` e `estornarRecebimentoDb` (transação, lock, recálculo do cache, espelho no `cash_entry`, auditoria).
- `src/lib/actions/contas-receber.ts` — `registrarRecebimento`, `estornarRecebimento`; edição sem status; trava 5.1; cancelamento guardado.
- `src/lib/actions/caixa.ts` — `conciliarContaReceber` passa a gravar um recebimento (valor = mín(livre no movimento, saldo da conta)).
- `src/lib/queries.ts` — `getRecebimentosDasContas`, `getEntradasDisponiveis`.
- `src/components/app/conta-receber-recebimentos.tsx` (novo) e `contas-receber-manager.tsx`, `contasreceber/page.tsx`.
- `src/lib/db/migrations/0048_conta_receber_recebimento.sql` (+ `down/`, journal, schema).

## Verificação

- `conta-receber-estado.test.ts` (5) e `contas-receber-recebimentos.test.ts` (7, com banco): validações da baixa, idempotência, um depósito em três parcelas, uma parcela em dois depósitos, soma dos vínculos ≤ movimento, estorno com rastro e liberação do movimento, trava 5.1, cancelamento recusado, BK-3, caminho do Caixa.
- `contas-receber-actions.test.ts` ajustado: edição ignora status/recebido.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): criar conta de R$ 324 → Receber → Espécie sem justificativa recusado → com justificativa grava "Recebida · falta R$ 224" e a faixa "Recebido sem conciliar: R$ 100,00 em 1 conta(s)" → Estornar com motivo volta a "A receber" e o recebimento fica riscado com o motivo.

## Fica para depois

- K-4 (assistente de leitura de boleto/contrato) e K-5 (materialização das parcelas da venda), esta última presa ao BK-0.
- Lista de formas de recebimento e a tolerância de R$ 0,05: confirmar com o dono; mudam em uma linha.

# Prompt U — PR 4: extrato do cartão (conferência) e estorno

Quarto passo do Prompt U. Entrega as seções 5 (extrato) e 6 (estorno).
Nenhuma despesa, parcela, pagamento ou caixa existente muda. A importação
grava só o registro do extrato; o estorno é lançamento próprio.

## O que mudou

### Migração 0056 `extrato_estorno_cartao` (aditiva, `IF NOT EXISTS`, com `down/`)
- `extrato_cartao`: itens do extrato subido (data, descrição, valor:
  positivo compra, negativo crédito), com `import_hash` e índice único
  parcial (5.3, mesmo padrão de `cash_entry`).
- `estorno_cartao`: o lançamento próprio do estorno (compra original,
  fatura em que o crédito cai, valor, data, origem antecipado/extrato, item
  do extrato reconhecido, aplicado em que pagamento).

### Leitor de extrato compartilhado
As funções puras de leitura (`parseMoney`, `parseSheet`, `toInternalDate`…)
saíram de `import-extrato.tsx` para `src/lib/extrato-parse.ts` **sem
alteração**; o Caixa passa a importá-las de lá.

### Importação (5.3/5.4) — `actions/cartao-extrato.ts`
`importarExtratoCartao`: arquivo lido no navegador (mesmo leitor do Caixa),
servidor grava os itens novos e ignora os já importados (assinatura cartão
+ data + centavos + descrição). **Não grava despesa.** Crédito que casa com
um estorno antecipado sem vínculo é reconhecido na hora (6.3).

### Conferência (5.2) — `calc/conferencia-cartao.ts`, puro
Por fatura (a data decide, 2.1) e valor: casados; **no extrato sem
lançamento** (link "Lançar em Despesas →" já preenchido — BU-2: o
lançamento é lá); **lançado sem correspondência** (só das faturas cobertas
pelo extrato); **divergências** de data (mesmo valor na fatura vizinha) ou
de valor (até 5% na mesma fatura); **créditos e estornos** com o par
reconhecido.

### Estorno (6.1–6.3)
- `registrarEstorno`: antecipado (o usuário sabe da devolução) ou a partir
  do crédito do extrato. Valor limitado ao da compra menos o já estornado.
  O crédito cai na fatura da compra se ela ainda não foi paga; senão, na do
  ciclo aberto. **A compra não é apagada nem editada** (teste 15).
- O crédito reduz o saldo da fatura (coluna "Créditos" e saldo) e entra
  **antes do dinheiro** no pagamento: `pagarFatura` aplica os créditos das
  faturas até a paga, grava a parte coberta como "Estorno aplicado" (sem
  banco) e marca o estorno como aplicado — nunca conta duas vezes.
- Um crédito do extrato aceita um só estorno; antecipado + crédito do
  extrato viram **par**, não dois estornos (teste 14). Botão "Reconhecer
  como o antecipado" para o caso que o automático não casou.

### Despesas — proposta preenchida
`PrefillDespesa` ganhou forma, cartão, data da compra e descrição; a página
lê `pf_forma`, `pf_cartao`, `pf_data`, `pf_obs`. Abre com o bloco do
cartão já preenchido; o usuário confirma e lança.

## Conflito documentado (Fase 1, item 5)
"Reverter a despesa original por lançamento próprio" na DRE: o sistema
recusa despesa negativa e a DRE soma `despesa`. O estorno reduz a fatura e
fica visível; **a DRE não foi tocada** — aguarda decisão (despesa negativa
só para estorno de cartão, ou DRE subtraindo `estorno_cartao`).

## Testes
- `calc/conferencia-cartao.test.ts`: casamento, sem lançamento, sem
  extrato, divergências, 14/6.3 (par), 13 (assinatura).
- `actions/cartao-extrato.test.ts` (integração): 13 (duas subidas, nada
  duplica; nenhuma despesa), 15 (compra intacta; crédito na fatura), 14
  (antecipado + crédito do extrato = um estorno), créditos aplicados no
  pagamento (caixa só com o dinheiro).
- Suíte completa: 127 arquivos, 1318 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
CSV com 3 linhas subido para o cartão de teste: "3 registrados; 0 já
estavam"; conferência mostra 1 sem lançamento (POSTO X, link preenchido
abre /despesas com forma, cartão, valor e a prévia da fatura), 1 casado, 1
crédito; "Registrar estorno" a partir do crédito → fatura passa a mostrar
"− R$ 50" em créditos e saldo R$ 250; o crédito aparece como "estorno
registrado · PED". Dados de teste removidos.

## Dados (teste 19)
`despesa` 75 / 43.701,75 · `despesa_parcela` 0 · `pagamento` 0 ·
`cash_entry` 46 / 1.793,14 — iguais antes e depois.

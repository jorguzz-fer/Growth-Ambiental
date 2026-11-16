# Prompt U — PR 1: cadastro de cartões e regras do ciclo

Primeiro passo do Prompt U (Cartões de Crédito): seção 1 e as regras puras
das seções 2.1–2.3. Nenhum dado existente foi alterado; esta tela não lança
despesa.

## O que mudou
- **Migração 0053 `cartao_credito`** (aditiva, `IF NOT EXISTS`, com `down/`):
  apelido, bandeira, `ultimos4`, titular, limite, dia de fechamento, dia de
  vencimento, conta que debita (`bank_account_id`), `taxa_rotativo` opcional
  (BU-3), ativo. **Não existe coluna para o número completo** (1.2, teste 17).
- **`src/lib/calc/cartao-ciclo.ts`** (puro): `faturaDaCompra` (compra até o
  fechamento cai na fatura que fecha; depois, na seguinte), vencimento com a
  borda 2.2 (vencimento ≤ fechamento → mês seguinte), dia 31 em mês curto cai
  no último dia, `faturasDasParcelas` (uma por ciclo), `cicloAberto`,
  `faturaSeguinte`, `disponivelDoLimite`, `somenteUltimos4` (mais de quatro
  dígitos é **recusado**, não truncado) e `recusaDoCartao`.
- **Actions `actions/cartoes.ts`**: `addCartao`, `updateCartao`,
  `setCartaoAtivo` (1.4: inativar em vez de excluir). Conta validada no
  tenant. Audit `cartao.create/update/inativar/reativar` só com apelido,
  bandeira, 4 últimos e dias.
- **Tela `/cartoes`**: cadastro, lista com limite, usado no ciclo (zero até o
  PR 2 vincular compras) e disponível, ciclo aberto calculado (fecha/vence),
  edição inline, inativar/reativar. Permissão nova `cartoes` (módulo
  Despesas; membro nasce sem acesso, como toda tela nova) e item no menu.

## Decisões
- Vencimento igual ao fechamento conta como "menor": vence no mês seguinte.
- Excluir cartão não existe neste PR: só inativar. A exclusão de cartão sem
  fatura nem compra entra no PR 2, junto com a verificação de vínculos.

## Testes
- `calc/cartao-ciclo.test.ts`: testes 3, 4 (fecha 28 / vence 5), 5 (6x = seis
  faturas consecutivas), borda de fevereiro, ciclo aberto, limite, 17 e
  recusas.
- `actions/cartoes.test.ts` (integração): número completo recusado; só os 4
  últimos gravados; audit sem o número; validações; editar/inativar/reativar.
- Suíte completa: 122 arquivos, 1287 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Menu "Cartões de Crédito"; cadastro de um cartão (fecha 28, vence 5) mostra
"aberta: fecha 28/10/2026, vence 05/11/2026", limite e disponível; edição
inline salva 4 últimos e taxa; inativar/reativar; o campo de 4 dígitos barra
número completo já no navegador (pattern) e o servidor recusa (teste). Cartão
de teste removido.

## Dados (teste 19)
`despesa` 75 / 43.701,75 · `despesa_parcela` 0 · `pagamento` 0 ·
`cash_entry` 46 / 1.793,14 — iguais antes e depois.

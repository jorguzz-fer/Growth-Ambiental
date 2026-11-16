# Prompt L — PR 1: os dois saldos e a cadeia de saldo (Parte 1)

Primeiro passo do Prompt L. Entrega a Parte 1 (1.0 a 1.6). Nenhum
`cash_entry`, `bank_account` ou `despesa` muda; nenhum saldo é recalculado
no banco — tudo é leitura e cálculo puro.

## O que mudou

### `src/lib/calc/cadeia-caixa.ts` (puro)
- **Dois saldos por dia (1.1):** *em conta* (extrato) = saldo atual da
  conta **menos** os movimentos importados do extrato com data posterior ao
  dia — calculado para trás, nunca somando movimento já refletido no saldo
  (corrige 1.4); *conciliado* = conciliado anterior + entradas conciliadas −
  saídas conciliadas + ajustes, encadeado (1.4-A).
- **Ponto de partida da janela (1.4-A.3 / 9.2):** o `saldo_final` gravado no
  fechamento do dia anterior à janela, quando existe (`daily_closing`, já
  lido); senão, o saldo em conta calculado daquele dia — nunca
  `saldoDisponivel(contas)` de hoje.
- **Quatro naturezas (1.3):** movimento no extrato sem lançamento (importado
  e não conciliado); lançamento sem movimento no extrato (criado pelo
  sistema, conciliado, sem `import_hash`); divergência de valor no vínculo
  (entra na Parte 2; vazio por ora); movimento em data trocada (a mesma linha
  num dia como extrato e noutro, até 3 dias, como lançamento — pareada).
- **Rótulo (1.6):** "Realizado · conciliado" / "Realizado · pendente" /
  "Hoje" / "Projeção" — olha a pendência, não só a data.
- **Dia futuro (1.4-A.5):** só projeção, partindo do último saldo conhecido;
  em conta nulo.
- `quebrasDaCadeia` confere a identidade inicial(D) = final(D−1) (1.4-A.6);
  `diasDesdeAtualizacao` para o alerta (1.0.2).

### Tela `/caixa`
- **Topo (`saldos-caixa.tsx`):** tabela "Os dois saldos" por conta e no
  total — em conta, conciliado, diferença — com a data e a origem da última
  atualização do saldo em conta (1.0.1: "extrato importado", "Open Finance /
  extrato" ou "lançado à mão") e alerta "há N dias — extrato
  desatualizado?" acima de 7 dias ou sem data (1.0.2). Importar extrato
  passa para o topo (1.0.3). "Open Finance" vira caminho para Contas
  Correntes para quem pode editar contas (1.0.4); para os demais, só a
  informação.
- **Cartões (`cadeia-dias.tsx`):** cada dia mostra saldo inicial e final em
  conta e conciliado, entradas/saídas (e as conciliadas), ajustes, a
  diferença e as naturezas que a explicam; selo "fechado" quando há
  fechamento gravado. A faixa (2 realizados, hoje, 7 à frente) declara ser
  independente do filtro de período da tabela (1.5).
- "Entradas/Saídas/Saldo do dia" passam a vir da cadeia (mesmo número).

### Fora deste PR
Vínculo com valor, status derivado, toggle, importação (Parte 2); abas e
ajuste (3-A/4); fechamento no cartão (9); assistente.

## Testes
- `calc/cadeia-caixa.test.ts`: 4 e 4c (cálculo para trás; primeiro cartão
  parte do dia anterior), 4a/4b/2 (inicial = final anterior; dia conciliado
  fecha), 3/6 (naturezas e dia pendente), 1/15 (ajuste só no conciliado),
  4e (projeção), 5i (fechamento como ponto de partida), data trocada, 5a/5b.
- Suíte completa: 132 arquivos, 1343 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Topo com "Os dois saldos" (4 contas, alerta "sem data — extrato
desatualizado?"), link "Open Finance … → configurar", 10 cartões com
rótulos (2 realizados conciliados, Hoje, 7 projeções), cartão de hoje com
inicial/final em conta e conciliado e "Os dois saldos coincidem", texto da
faixa independente do filtro; a aba Lançamentos não repete o botão de
importar. Sem erros de página.

## Dados (teste 22)
`cash_entry` 46 / 1.793,14 / 22 rec · `bank_account` 4 / 0 / 4 ativas ·
`despesa` 75 / 43.701,75 / 24 pagas — iguais antes e depois.

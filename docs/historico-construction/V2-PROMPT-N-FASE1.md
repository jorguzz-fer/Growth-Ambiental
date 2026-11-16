# Prompt N · Simulador — Fase 1, inventário antes de escrever código

Prompt N (Simulador de Unidade, 14 de 42) corrige os defeitos de cálculo de
uma **calculadora isolada** — nada grava, nada lê de cliente nem de plano;
só consulta a tabela INCC — e acrescenta o assistente. Número errado aqui vira
proposta comercial errada, que já saiu da empresa. Este é o inventário. **Só
leitura; nada foi alterado.**

## Bloqueios — situação

| | Situação | Fonte |
|---|---|---|
| **BN-1** · a simulação passa a ser gravada? | **Decidido (30/09): continua calculadora, sem gravar.** Só as correções de cálculo. Sem tabela nova, sem migração. Selo do assistente: "Somente leitura" | `V2-BLOCO2-DECISOES.md` |
| **BN-2** · taxa de juros | **Decidido (30/09): a taxa ao mês é editável pelo usuário**, pré-preenchida com o 1 % de hoje até haver outro padrão. Rótulo diz que é **mensal** e **premissa** (não taxa do contrato). Não se troca o fixo por outro fixo | idem |
| **BN-3** · renda do cadastro | **Decidido (30/09): vem do cadastro do cliente para quem tem `clientesdados:ver`**, validado no servidor; quem não tem, digita. O assistente **não recebe** a renda (5.2; BE-2) | idem; `permissions.ts:53` (`clientesdados`, tela sensível) |

## O que já está feito por prompts anteriores

| Seção | Situação |
|---|---|
| 3.1 · INCC do projeto global (cookie) | **Feito** (Prompt A): a obra vem da URL (`lerSelecaoDeProjeto`, `PedirProjeto`); falta só **declarar na tela** qual obra forneceu a tabela (teste 9) |
| 4.1 · exibir subtítulo e eyebrow | **Feito** (J-1): o subtítulo "SAC / PRICE / SBPE · fluxo de 36 meses…" **já aparece** — e ficará falso quando o fluxo acompanhar as parcelas (2.5); reescrever |
| Permissão de ver | **Feito** (Prompt M) |
| Filtro de tenant em `getInccRows` | **Feito** (Q-1) |

## O que o código mostra, seção a seção

### 1 · Restrições fixas

`src/lib/calc/simulator.ts` é pura (`simulate(input, incc)`), com 4 testes em
`simulator.test.ts` (entrada/saldo/renda; 36 meses; SAC 1ª parcela; PRICE
fixa). Continua pura; os testes existentes que mudarem de resultado são
declarados (teste 11). Nada toca `payment_plan`, `unit`, `conta_receber`,
`incc_rate`.

### 2 · Correções de cálculo (confirmadas no código)

- **2.1 SM-01** `dentroLimite: parcMensal <= maxParcela` (`simulator.ts:122`):
  compara a parcela base (saldo ÷ n), não a maior parcela do fluxo. Na
  simulação pré-carregada: parcela base abaixo do teto ("dentro"), com a 1ª
  parcela SAC acima dele [valores removidos]. Passa a comparar
  a **maior parcela** (sem os reforços) e a tela mostra as duas.
- **2.2 SM-02** `parcTotal = SAC ? parcSAC : PRICE ? parcPRICE : parcComIncc`:
  em SAC e PRICE a correção é calculada e descartada; a coluna INCC cresce e a
  parcela não. **Decisão adotada: opção 1 — aplicar a correção nos três tipos**
  (a parcela base de cada mês, SAC ou PRICE, é corrigida pelo acumulado do mês
  do vencimento a partir da 5ª parcela, como `calcProjection` faz com as
  mensais do plano). Valores exibidos mudam para SAC e PRICE; nada é gravado.
  Se o dono preferir a opção 2 (coluna só em SBPE), é uma linha.
- **2.3 SM-03** `TAXA_MENSAL = 0.01` fixa → campo `taxaMensal` no input,
  padrão 1 % (BN-2), rótulo "juros ao mês (premissa)".
- **2.4 SM-04** `totalEntrada` soma financiamento, FGTS, subsídio e os anuais
  (o Anual 2 cai no mês 24). Passa a três indicadores: **entrada efetiva**
  (entrada + sinais até o início do plano), **recursos futuros** (anuais, FGTS,
  subsídio, com o mês de cada um) e **financiamento**; `%` sobre a efetiva.
- **2.5 SM-05** `MESES_FLUXO = 36` fixo; com 90 mensais o fluxo para no 36º sem
  aviso. Passa a acompanhar `mensais` (teto declarado de 480 linhas), com
  rolagem e total ao final.
- **2.6 SM-06** SAC `saldoAtual = saldoMensal − amort × i` por 36 meses: com
  menos de 36 mensais o saldo fica negativo e a parcela também. Corrigido por
  2.5; e a amortização para quando o saldo zera.
- **2.7 SM-10** reforços em posição fixa (`i === 0,1,2,3,11,23`): cada reforço
  ganha o **mês informado** (padrões 1, 2, 3, 4, 12, 24); reforço além do
  número de parcelas é **recusado com mensagem**.
- **2.8 SM-11** `evolucao = (i+1) × 100/36`: premissa linear em 36 meses que
  parece medição. Passa a derivar da **janela da obra** (`start_date`,
  `end_date`, §55) quando cadastrada — linear entre início e fim — e, sem
  janela, fica **rotulada como premissa linear** na coluna e no rodapé.

### 3 · Contexto e entrada

- 3.1: a obra já é explícita; a tela passa a dizer "Tabela INCC da obra X (N
  meses, variante …)".
- 3.2 SM-07: `useState` com valores fixos (preço, ato, sinais, mensais,
  financiamento e uma data) [valores removidos] — a tela abre com uma simulação que parece de alguém. Passa a
  abrir **vazia** (zeros, data de hoje), sem seed nem default de banco.
- 3.3: campos aceitam negativo e `NaN` (`Number("")` = 0, `Number("abc")` =
  NaN). Validação pura: sem negativo, sem `NaN`, parcelas inteiras > 0.

### 4 · Interface

Subtítulo reescrito (o horizonte do fluxo passa a ser "n parcelas"); tabela com
rolagem vertical e cabeçalho fixo (padrão de Orçamentos/Previsão); resumo ao
final: total pago, total de juros, total de correção; `PADRAO-VISUAL.md`.

### 5 · Assistente

Somente leitura (BN-1). **Explicar a proposta** (texto para o cliente, em
código puro a partir do resultado — sem modelo, sem renda); **comparar
cenários** (SAC × PRICE × SBPE: total pago e maior parcela, pura);
**testar variações** (entrada ±, prazo ±, taxa ±: efeito no total e na maior
parcela, pura); **conferir a simulação** (maior parcela acima do limite,
reforço fora do plano, correção — com a opção 1, sempre aplicada —, parcelas
inválidas). Nunca afirma aprovação, nunca promete taxa, nunca apresenta a
evolução como avanço real. **Renda, score e restrições nunca entram em
contexto de modelo** — e, como tudo é puro, nada vai a modelo algum.

## Plano de PRs

| PR | Conteúdo | Muda dado? | Depende de |
|---|---|---|---|
| **N-1** · cálculo | 2.1–2.8 em `simulator.ts` (puro) com testes novos; os 4 existentes ajustados e justificados; 3.3 validação pura | Não (nada grava) | — |
| **N-2** · tela | 3.1 obra declarada; 3.2 abre vazia; taxa editável (BN-2); reforços com mês; indicadores separados; fluxo com rolagem, cabeçalho fixo e resumo; subtítulo; renda do cadastro com `clientesdados:ver` (BN-3) via seletor de cliente | Não | N-1 |
| **N-3** · assistente | 5.1–5.5 somente leitura, tudo puro | Não | N-1, N-2 |

Cada PR: testes puros, suíte inteira, typecheck, lint, build, conferência no
navegador. Antes/depois: nenhuma tabela é lida para gravação nem alterada.

## Perguntas (nenhuma trava a N-1)

1. **2.2:** adotei a opção 1 (correção nos três tipos). Confirma, ou prefere a
   2 (coluna só em SBPE)?
2. **BN-2:** a taxa vira campo com 1 % ao mês como padrão. Há um padrão melhor
   (faixa MCMV, por obra)?
3. **2.8:** evolução pela janela da obra quando cadastrada; sem janela,
   premissa linear rotulada. Confirma?

# Prompt N · PR N-1 — cálculo e tela do simulador

Primeira PR de código do Prompt N, conforme
[`V2-PROMPT-N-FASE1.md`](./V2-PROMPT-N-FASE1.md). Seções 1 a 4 (o cálculo e a
tela entram juntos: a tela consome a assinatura nova do cálculo, e uma PR só
de cálculo não compilaria). **Nada é gravado; nenhuma tabela é lida para
gravação nem alterada. Sem migração.**

## O que muda no cálculo (`src/lib/calc/simulator.ts`, puro)

| | Prompt | Aqui |
|---|---|---|
| **2.1 SM-01** | veredito pela maior parcela; tela mostra as duas | `maiorParcela` / `mesDaMaiorParcela` (parcela corrigida, sem reforços) × `maxParcela` (30 % da renda); a tela mostra os dois valores e o selo. No caso da simulação pré-carregada (1ª parcela SAC acima do teto) [valores removidos] o selo passa de "dentro" para **"acima"** |
| **2.2 SM-02** | decidir: aplicar nos três ou exibir só em SBPE | **Opção 1 — correção nos três tipos**, a partir da 5ª parcela, pelo acumulado do mês do vencimento (como as mensais do plano). Coluna "Correção" por mês; SAC e PRICE passam a exibir parcela corrigida |
| **2.3 SM-03 / BN-2** | taxa vira campo, 1 % como padrão, rótulo mensal/premissa | `taxaMensal` no input; campo "Juros ao mês % (premissa)" pré-preenchido com 1 |
| **2.4 SM-04** | entrada efetiva, recursos futuros (com mês), financiamento; % sobre a efetiva | três KPIs; `entradaEfetiva` = entrada + sinais até o início do plano; `recursosFuturos` lista nome/valor/mês; `pctEntrada` sobre a efetiva |
| **2.5 SM-05** | fluxo acompanha as parcelas; teto declarado | `meses.length === mensais` (teto `MAX_PARCELAS = 480`, declarado no rótulo); rolagem com cabeçalho e rodapé fixos; total ao final |
| **2.6 SM-06** | sem parcela negativa; SAC para ao zerar | saldo devedor acompanhado mês a mês; amortização limitada ao saldo; nunca negativo |
| **2.7 SM-10** | reforço com mês informado; fora do plano recusado | cada reforço é `{ valor, mes }` (padrões 2, 3, 4, 12, 24; FGTS/subsídio 1); `validarSimulacao` recusa mês além do plano com mensagem |
| **2.8 SM-11** | derivar da janela do projeto ou rotular como premissa | `janelaObra` (início/fim da obra, `start_date`/`end_date`) → evolução linear na janela, coluna "Obra % (janela da obra)"; sem janela, "Obra % (premissa)" e rodapé explicando que não é medição |
| **3.3** | sem negativo, sem `NaN`, parcelas inteiras > 0 | `validarSimulacao` (puro); a tela lista os erros e não calcula até corrigir |
| **4.3** | total pago, juros, correção | rodapé do fluxo |

## O que muda na tela

- **3.1:** "Tabela INCC da obra X (N meses, variante…)" visível no formulário; a obra já vinha da URL (Prompt A).
- **3.2:** abre **vazia** (campos em branco, data de hoje, taxa 1 %); nenhum valor do mockup virou seed ou default.
- **BN-3:** seletor de cliente (opcional). A renda do cadastro (`renda_liquida`, senão `renda_bruta`) **só sai do servidor** para quem tem `clientesdados:ver`; para os demais a lista vem sem renda e a tela diz que é preciso digitar.
- **4.1/4.2:** subtítulo reescrito (fluxo com tantas linhas quanto parcelas; calculadora); tabela com rolagem, cabeçalho e rodapé fixos.

## Testes de `simulator.test.ts` que mudaram (relatório, item 6)

Os 4 originais foram reescritos em 11: (a) `totalEntrada` deixou de existir — virou entrada efetiva + recursos futuros + financiamento (2.4); (b) "gera fluxo de 36 meses" virou "tantas linhas quanto parcelas" (2.5); (c) `dentroLimite` passou a usar a maior parcela: o caso pré-carregado que era "dentro" (parcela base abaixo do teto) agora é "acima" (1ª parcela SAC acima do teto) (2.1); (d) SAC e PRICE recebem a correção a partir da 5ª parcela (2.2); a 1ª parcela SAC e a fórmula PRICE continuam iguais antes da correção.

## Verificação

- 11 testes puros; suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): a tela abre vazia com a obra e a tabela INCC declaradas; preencher valor e parcelas mostra os três KPIs, a maior parcela × limite e o fluxo com rolagem e total; reforço com mês além do plano mostra a mensagem.
- Nenhuma tabela lida para gravação nem alterada.

## Fica para depois

- N-2 assistente (somente leitura, puro): explicar a proposta, comparar cenários, testar variações, conferir a simulação.

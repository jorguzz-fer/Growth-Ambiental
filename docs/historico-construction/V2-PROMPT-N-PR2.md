# Prompt N · PR N-2 — assistente do simulador (somente leitura)

Seção 5 do Prompt N, conforme [`V2-PROMPT-N-FASE1.md`](./V2-PROMPT-N-FASE1.md)
(era "N-3" no plano; N-1 juntou cálculo e tela). **Nada é gravado, nada vai a
modelo, sem migração.**

## O que entra

`src/lib/simulador-analise.ts` (puro, sobre o input e o resultado que a tela já
calculou) e `src/components/app/assistente-simulador.tsx` (painel à direita,
selo **"Somente leitura"**, mesmo padrão dos outros assistentes):

| Ação | Prompt | O que faz |
|---|---|---|
| **Explicar a proposta** | 5.1 | Texto para o cliente em código puro: imóvel e tipo; entrada efetiva (ato + sinais) e %; recursos futuros com mês; financiamento; saldo, nº de parcelas, 1ª e maior parcela; correção INCC a partir da 5ª; total pago e juros pela premissa. **Nunca cita renda, limite ou aprovação**; termina com "Simulação, não proposta". Botão "Copiar texto" |
| **Comparar cenários** | 5.2 | SAC × PRICE × SBPE com os mesmos dados: 1ª parcela, maior parcela, total pago (linha do tipo escolhido em negrito) |
| **Testar variações** | 5.3 | Entrada ±10 %, prazo ±12 parcelas, juros ±0,25 p.p.: diferença na maior parcela e no total. Variação inválida (prazo ≤ 0) é omitida |
| **Conferir a simulação** | 5.4 | Erros de validação; maior parcela × limite de 30 % (aviso quando passa; "não é aprovação" quando cabe; "sem renda" quando não informada); soma maior que o imóvel; financiamento acima de 80 %; parcelas fora da tabela INCC (corrigidas por zero) e parcelas com INCC projetado; sem correção; origem da coluna Obra % (janela ou premissa). Contador = erros + avisos |

**Renda (BE-2 / BN-3):** só entra na conferência do limite, já calculado pela
tela; nunca no texto para o cliente. Como tudo é puro, nenhum dado vai a modelo.
**Nunca:** afirma aprovação, promete taxa, chama a coluna Obra % de avanço real.

Tela em branco: as quatro ações mostram "Preencha a simulação"; a validação só
roda depois que o usuário começou a digitar.

## Verificação

- 6 testes puros em `simulador-analise.test.ts`; suíte (1176), `tsc`, `eslint`, `next build` verdes.
- Navegador (local): painel com o selo; em branco pede preenchimento; com os dados do teste a conferência aponta a maior parcela acima do limite, 5 parcelas fora da tabela INCC e a premissa da obra; a explicação não contém "renda"; a comparação lista os três tipos.
- Nenhuma tabela lida para gravação nem alterada.

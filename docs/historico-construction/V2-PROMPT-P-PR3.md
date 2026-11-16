# Prompt P · PR P-3 — resultado da revenda (ganho ou perda), prévia na tela

Terceira PR de código do Prompt P, conforme
[`V2-PROMPT-P-FASE1.md`](./V2-PROMPT-P-FASE1.md). Seção 4 (4.1, 4.2, 4.4) e
os bloqueios BP-2 e BP-3. **Sem migração. Nenhum registro é alterado. Nenhum
número de relatório muda:** a DRE, o Fluxo, o Caixa e o Resumo continuam
lendo exatamente o que liam (teste 23).

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **4.1 · ganho, não valor cheio** | o que entra no resultado é `valorVenda − estimado` | `src/lib/calc/permuta-ganho.ts` (puro): `resultadoDaRevenda`, `permutaGanhoByMonth` (competência da venda; perda negativa; escambo realiza o resultado sem caixa — BP-3), `previaDaRevenda` (valor cheio × resultado). Adapter `permToRevenda` em `queries.ts` |
| **4.2 · o caixa não muda** | `permutaCashByMonth` continua correta | intocada |
| **BP-2 · o status governa** | permuta "Disponível" com valor e data de venda não é revenda | `apenasVendidos()` — o filtro que a chave vai aplicar antes de qualquer cálculo de revenda. Produção (30/09): nenhum ativo nessa situação; hoje não muda número |
| **4.4 · onde entra na DRE** | §57.7: uma chave por empresa para o conjunto 54/56/57 | **a DRE fica como está até a I-9.** A chave única das três seções nasce lá, e ligar só a parte da permuta deixaria a receita errada de outra forma. Tudo o que a I-9 precisa (ganho por mês, filtro de status, testes) já está pronto aqui |
| **Prévia (§57.7)** | apresentar antes de ligar | a tela de Permuta mostra "Em inventário (estimado) · Revenda (caixa projetado) · Resultado das revendas" e, por ativo vendido, a coluna **Resultado** (+/−). O rótulo "Receita projetada" saiu (7.7: a revenda é caixa e ganho, não receita) |

## Testes (puros, 4 casos)

Entrou por 80.000 e saiu por 82.000 → resultado 2.000 (e a DRE de hoje lê
82.000); perda negativa; escambo realiza o resultado na data da troca e não
gera caixa; "Disponivel" com venda preenchida não conta (BP-2) enquanto o
caixa de hoje ainda conta; sem data não há competência; soma por mês com
centavos; prévia compara valor cheio × resultado.

## Verificação

- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- Antes/depois de `permuta`: nada gravado por esta PR.

## Fica para depois

- I-9: ligar `permutaGanhoByMonth` + `apenasVendidos` na DRE atrás da chave única 54/56/57, com a prévia de quatro colunas da §57.7.
- P-4 inventário; P-5 documentos; P-6 assistente.

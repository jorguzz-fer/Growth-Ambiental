# Prompt B · PR B-3 — Orçado x Realizado com a conta da DRE

Implementa a decisão B-2 da Fase 1. Quadro de leitura: nada grava, nenhum
dado muda.

## Uma conta só (seções 20–21)
- A montagem dos inputs da DRE saiu de `dre/page.tsx` para dois módulos, sem
  mudar o resultado: **`src/lib/calc/dre-cascata.ts`** (puro: `Inputs`,
  `aggregateInputs`, `waterfall`) e **`src/lib/dre-inputs.ts`** (banco:
  `versionInputsByMonth`, `projectInputs`, `versionInputs`…). A página da DRE
  importa deles. O teste `dre-sem-caixa` passa a cobrir os dois arquivos: a
  DRE continua sem ler o caixa.
- **`getOrcadoRealizado(tenantId, projectId)`** (em `dre-inputs.ts`): Orçado =
  versão `budget` do projeto (a padrão, senão a mais antiga — a mesma que
  `/budget` abre), só quando há `budget_line`; Realizado = versão `atual`
  pela mesma função da DRE, só quando há lançamento. Tenant em toda cláusula;
  outro tenant devolve nulos.
- **`src/lib/calc/orcado-realizado.ts`** (puro): Receita = linha "Receita" da
  DRE; **Custos e despesas** = tudo o que a DRE deduz (= Receita − Resultado
  Final); Resultado = Resultado Final. % de execução só com base; a **cor
  segue o significado**: custo acima de 100% é alerta, receita acima é bom,
  resultado negativo é alerta.

## O card (seções 18–19)
`orcado-realizado.tsx`, à direita da Localização na visão de um projeto
(lado a lado em telas largas, empilhado abaixo). Selo **"Realizado por
competência — a mesma regra da DRE"**. Estados: "Sem orçamento lançado" (link
para Orçamentos), "Sem lançamentos na versão Atual", "Sem receita
reconhecida" quando a versão tem despesas e nenhuma unidade vendida. Nota
fixa: contas a receber lançadas à mão não têm competência e ficam fora
(limitação da seção 20, informada, não contornada). Link para a DRE da obra.

## Fontes, por escrito (relatório final 9–12)
| Métrica | Origem |
|---|---|
| Receita orçada | `budget_line.valor`, `kind='receita'`, versão `budget` (todas as competências) |
| Custo orçado | `budget_line.valor`, `kind='despesa'`, versão `budget` |
| Receita realizada | versão `atual`: recebíveis das unidades (`unit.payment_plan`, por vencimento) + reembolsos + revenda de permuta + despesas categoria "Receita" (`despesa.competencia`) |
| Custo realizado | versão `atual`: `despesa.valor` não cancelada, categoria devedora, por `despesa.competencia` + encargos pagos por data de pagamento |

## Testes
- `calc/orcado-realizado.test.ts` (5): igualdade com a cascata, % de
  execução, cores por significado, ausência ≠ zero, card completo.
- `dre-inputs.test.ts` (3, com banco): orçado do `budget_line`, realizado sem
  a despesa cancelada, números iguais aos da DRE para as mesmas versões,
  projeto sem dados devolve nulo, outro tenant devolve nulo.
- Suíte 155 arquivos / 1478 testes; `tsc`, `eslint`, `next build`.
- Navegador: card ao lado da Localização na obra local (25 despesas =
  R$ 14.567,25, confere com o banco), "Sem orçamento lançado", resultado
  negativo em alerta; a DRE da obra continua abrindo com o Resultado Final.

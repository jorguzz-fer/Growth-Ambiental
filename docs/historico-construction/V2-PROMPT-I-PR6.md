# Prompt I · PR I-6 — datas em texto: as 7 ordenações em SQL, cronológicas

Sexta PR de código do Prompt I, conforme
[`V2-PROMPT-I-FASE1.md`](./V2-PROMPT-I-FASE1.md). Seções 25 e 37.
**Só ordem de exibição e de FIFO; nenhuma soma. Nenhum registro gravado é
alterado. Sem migração.**

## O problema

As datas de negócio são `text` em "MM/DD/YYYY" e "MM/YYYY". `ORDER BY` direto
sobre elas é lexicográfico: "12/31/2025" vinha **depois** de "01/01/2026", e
"2/5/2026" (sem zero à esquerda) caía fora do lugar. O inventário achou sete
ordenações assim; nenhuma cláusula `WHERE` de período em SQL (essas já são
feitas em JavaScript, depois de converter).

## O que muda

`src/lib/db/ordem-data.ts` — duas chaves em SQL, só leitura:

- `chaveDataBR(col)`: "MM/DD/YYYY" → "YYYYMMDD";
- `chaveCompetencia(col)`: "MM/YYYY" → "YYYYMM".

Valor nulo ou fora do formato vira `NULL` e vai para o **fim** (o `ASC` do
Postgres põe nulos por último). Todas as sete ordenações passam a usar a
chave, com desempate estável por `createdAt` e `id` (§25: FIFO determinístico;
onde a tabela não tem `createdAt`, só `id`):

| Onde | Coluna | Antes | Agora |
|---|---|---|---|
| `getDespesas` | `despesa.competencia` | texto | competência, `createdAt`, `id` |
| `getDespesasByTenant` | `despesa.competencia` | texto | idem |
| `getCash` | `cash_entry.data` | texto | data, `id` |
| `getCashByTenant` | `cash_entry.data` | texto | data, `id` |
| `getMedicoes` | `medicao.competencia` | texto, grupo | competência, grupo, `createdAt`, `id` |
| `getContasReceber` | `conta_receber.vencimento` | texto | vencimento, `createdAt`, `id` |
| `getEncargosByVersion` | `pagamento.data_pagamento` | texto | data, `createdAt`, `id` |
| `gerarContaDoPonto` | `time_entry.data` | texto | data, `id` |

## O que não muda

- Telas que reordenam em JavaScript (Contas a Pagar, Despesas com
  `despesas-ordering.ts`) continuam iguais; só a ordem que vinha do banco fica
  certa na virada do ano.
- A coluna "Mês venda" de `/unidades` (§37, acréscimo sobre exibição) é de
  outro prompt.

## Verificação

- `ordem-data.test.ts` (Postgres): seis datas com virada de ano, dia sem zero,
  inválida e nula — ordem cronológica e as duas ruins no fim, com chave nula;
  `getCash` na mesma ordem; competências "1/2025", "12/2025", "01/2026" em
  despesas e medições; contas a receber por vencimento real.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

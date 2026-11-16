# Prompt Q · PR Q-1 — Parte 1: integridade da tabela INCC

Primeira PR de código do Prompt Q, conforme
[`V2-PROMPT-Q-FASE1.md`](./V2-PROMPT-Q-FASE1.md). Seções 1 a 4. **Sem
migração. Nenhum índice existente é alterado, recalculado ou reclassificado
sem ação do usuário.** Nenhuma fórmula de correção muda (seção 9).

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **1.1/1.2 · projeção explícita** | nunca roda sozinha ao abrir | o `useEffect` que chamava `projectFutureIncc` saiu do editor. Se há meses futuros ainda oficiais, a tela **informa** (faixa com a lista) e **oferece** as ações; nada é executado sem clique e confirmação |
| **1.3 · auditoria da projeção** | quantos meses e valores anteriores | `incc.project` registra `mesesReescritos` e `mudancas` (mês, mensal de/para, acumulado de/para) |
| **2.1/2.2 · reprojeção preserva oficiais** | só meses sem índice oficial | `projectFutureIncc` recalcula **apenas** `projected = true`; mês oficial fica oficial, futuro ou não (teste 2). Se não há mês projetado, devolve mensagem em vez de agir |
| **2.3 · reprojetar um oficial** | ação explícita naquele mês, com confirmação | `marcarComoProjecao(projectId, meses)`: só meses **futuros** (mês corrente ou passado é recusado — índice divulgado não se apaga); a tela tem "Projetar" por linha e "Projetar os N futuros oficiais…" com a lista no `confirm`. Auditoria `incc.marcarProjecao` com os valores anteriores de cada mês convertido e as mudanças |
| **3.1/3.2 · rastro da edição** | mês editado de/para e lista dos reprojetados com os dois valores | `incc.update` registra `mensal { de, para }`, `eraProjetado`, `reprojetados` (cada mês com mensal e acumulado de/para) e `mesesReescritos`; `diffDeIncc` compara na escala da coluna (4 casas) |
| **4.1 · permissão de ver** | — | já feito (Prompt M) |
| **4.2 · filtro de tenant** | `getInccRows` só por projeto | `getInccRows(tenantId, projectId)`; 15 chamadores atualizados (Parâmetros, Caixa, Fluxo ×2, Consolidado, Projeção, Simulador, DRE, exportações ×3, orçamento, receita por fonte, actions). `persistir` também filtra pela empresa |
| **4.3 · faixa do índice** | avisar sem bloquear; negativo é aceito | `avisoDeFaixa` (−5 % a +5 % ao mês): fora da faixa, o `confirm` mostra o aviso e deixa salvar; só não finito é recusado (teste 6, 7) |
| **4.4 · retorno legível** | `{ ok, error }` | as três actions devolvem `{ ok: true, meses } \| { ok: false, error }`; a tela mostra em `role="status"` (teste 5) |
| **4.5 · `saveIncc`** | remover ou descontinuar | **removida** (nenhum chamador; ignorava `projected`). O teste de auditoria de/para migrou para `updateInccMonth` |
| **4.6 · janela da média** | dizer quantos meses entraram | mês projetado mostra "média de N meses" quando N < 12 (`mesesNaMedia`) (teste 8) |

## Arquivos

- `src/lib/incc-regras.ts` (+ teste, 5 casos): `FAIXA_PLAUSIVEL`, `avisoDeFaixa`, `mesesNaMedia`, `ordDoMes`, `ordDeHoje`, `mesesFuturosOficiais`, `mesesEncerradosSemOficial`, `diffDeIncc`.
- `src/lib/actions/incc.ts` — `updateInccMonth`, `projectFutureIncc`, `marcarComoProjecao` (`saveIncc` removida).
- `src/components/app/incc-editor.tsx` — sem `useEffect`; faixa de aviso; botões explícitos; "Projetar" por mês; "média de N meses"; mensagens.
- `src/lib/queries.ts` — `getInccRows(tenantId, projectId)` e os 15 chamadores.
- `src/lib/actions/ak-parte1.test.ts` (teste migrado); `src/lib/actions/incc-q1.test.ts` (novo, com banco).

## Verificação

- Testes com banco: reprojeção não altera mês oficial futuro (teste 2) e registra de/para; editar registra mês de/para e os reprojetados com os dois valores (teste 3); sem permissão/obra devolve mensagem (teste 5); não finito recusado, fora da faixa e negativo aceitos (6, 7); `marcarComoProjecao` recusa mês corrente/passado e converte só futuros, com auditoria; filtro de empresa.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): abrir a tela **não** grava nada (teste 1: `incc_rate` idêntica antes e depois de abrir); a faixa lista os futuros oficiais; editar um mês com valor fora da faixa mostra o aviso no `confirm`; os botões agem só com confirmação. Antes/depois de `incc_rate` local: 48 linhas idênticas sem ação do usuário.

## Fica para depois

- Q-2 (o que a tela declara; migração 0051 com variante, fonte, informado por/em); Q-3 (assistente).

# PROMPT NOM — NOMENCLATURA DAS VERSÕES

Growth Construction · Fase 3, Bloco 0, prompt 1 de 20. Ver
[`V3-PLANO.md`](./V3-PLANO.md).

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

Nenhum dado inputado pela empresa é alterado. Nenhuma mudança amplia acesso.
Nada vindo de mockup entra no código. Este prompt **não altera número**: só
rótulo.

---

# O QUE A REVISÃO PEDE

Revisão do Thiago, 14/10 ([`V3-REVISAO-1410.md`](./V3-REVISAO-1410.md)),
item transversal: *"Padronizar as versões como Orçamento, Previsão Atualizada
e Atual. Saem Budget, Previsto, Forecast e Caixa Real."*

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

- O menu (`nav-menu.ts`), as telas de Orçamentos e Previsão Atualizada, o
  Dashboard (`dashboard-tela.ts`), a trava de versão (`versao-trava.ts`), as
  Chaves de mudança e o chat já usam os três nomes.
- O `kind` no banco (`budget`, `forecast`, `atual`, `custom`) **não muda**: é
  identificador, como a rota (Prompt E, "Nomenclatura das telas").
- As rotas `/budget` e `/forecast` **não mudam** (Prompt C, seção 22: rótulo
  muda, URL não).
- O rótulo gravado das versões já existentes (`version.label`) **não muda**:
  é dado da empresa.
- "Previsto" e "Realizado" como **conceitos do Fluxo de Caixa** (o planejado
  por competência contra o caixa pela data) ficam: não são nomes de versão.

# BLOQUEIOS

## BNOM-1 · O cenário "Realizado" da DRE vira "Atual"?

A DRE da Empresa toda e o chat chamavam o terceiro cenário de "Realizado".
O pedido padroniza três nomes e "Realizado" não é um deles.

**Decisão deste prompt: vira "Atual".** O que o usuário vê na coluna da DRE,
no seletor de cenários, no chat e nas Chaves passa a ser o mesmo nome da
versão. Onde o texto precisa explicar o que a Atual é, diz "o movimento
real".

# PARTE 1 — O QUE MUDA

Só texto visível ao usuário e os rótulos padrão de versões **novas**.

| Onde | Antes | Depois |
|---|---|---|
| `dre.ts` · `ROTULO_CENARIO.atual` | Realizado | Atual |
| `dre-controls.tsx` · seletor de tipo de versão | Atual (real) / Forecast / Budget | Atual / Previsão Atualizada / Orçamento |
| `assistente-chat.ts` · `ROTULO_DO_CENARIO.atual` e a definição da receita | Realizado (Atual) | Atual |
| `actions/assistente-chat.ts` · frase de cenário omitido | "uso o Realizado" | "uso a Atual" |
| `chaves-previa.ts` e `chaves/page.tsx` · projeto sem cenário | Realizado | Atual |
| `permissions.ts` · rótulo das permissões `budget` e `forecast` | Lançamento Budget / Lançamento Forecast | Orçamentos / Previsão Atualizada |
| `budget-matrix.tsx` · botão e confirmação | Importar do Budget | Importar do Orçamento |
| `budget-planning-screen.tsx` · aviso de período ausente | habilitar o Budget e o Forecast | habilitar Orçamentos e Previsão Atualizada |
| `plataforma/(console)/page.tsx` · texto da nova conta | Budget / Forecast / Atual | Orçamento / Previsão Atualizada / Atual |
| `actions/budget.ts`, `actions/planning.ts`, `lancamento/export/route.ts` · mensagens de erro | Budget/Forecast | Orçamento e Previsão Atualizada |
| `lancamento-screen.tsx` · título | Lançamento Budget / Forecast | Orçamentos / Previsão Atualizada |
| `tenant/provision.ts`, `actions/projects.ts`, `db/seed.ts` · rótulo padrão das versões criadas para conta e projeto **novos** | Budget / Orçamento · Previsto / Forecast | Orçamento · Previsão Atualizada |
| `assistente-base/bi-planejamento-config.ts` · base de conhecimento | Realizado | Atual |

# PARTE 2 — O QUE NÃO MUDA, DE PROPÓSITO

- Comentários de código e nomes de função (`importFromBudget`,
  `isBudgetVersion`, `budget_line`): são identificadores.
- Rótulos de versão já gravados. A conta antiga continua vendo "Budget /
  Orçamento" como nome da versão dela até renomear na tela de Projetos.
- Os conceitos "previsto" e "realizado" do Fluxo de Caixa, do card Orçado x
  Realizado e da Medição (orçado × medido).
- "Caixa Real" não existe no código; nada a tirar.

# 3. NÃO REGRESSÃO

`npm run typecheck`, `npm run lint` e `npm test` passam. O único teste que
afirmava "Realizado" como título de coluna (`dre.test.ts`) passa a afirmar
"Atual".

# 4. RELATÓRIO FINAL OBRIGATÓRIO

Em [`V3-PROMPT-NOM-FINAL.md`](./V3-PROMPT-NOM-FINAL.md).

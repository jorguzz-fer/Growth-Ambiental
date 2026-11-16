# Prompt Q · Parâmetros / INCC — Fase 1, inventário antes de escrever código

Prompt Q (Parâmetros / INCC, 13 de 42) corrige a integridade da tela
`/parametros` (projeção que roda sozinha, reprojeção que apaga índice oficial,
auditoria sem rastro), faz a tela declarar o que governa, e acrescenta o
assistente. É a menor tela do sistema em superfície e uma das maiores em
alcance. Este é o inventário. **Só leitura; nada foi alterado.**

## Bloqueios — situação

| | Situação | Fonte |
|---|---|---|
| **BQ-1** · qual variante | **Pendente a variante exata.** PO (30/09): "o INCC de referência é o usado pela Caixa nas construções; falta confirmar DI, M ou 10". O código confirma que nada registra a variante (`incc_rate`: `mes`, `monthly`, `accumulated`, `ordem`, `projected`). Entra como coluna aditiva `variante` (anulável) + rótulo; **enquanto não houver resposta, a tela declara "variante a confirmar"** e o assistente não sugere índice. Se variar por contrato: reportar antes (tabela é por projeto) | `V2-BLOCO2-DECISOES.md`, `schema.ts:1358` |
| **BQ-2** · qual cálculo é o correto | **Decidido (30/09): a DRE reconhece pelo valor nominal, sem INCC; o INCC fica no financeiro e no caixa.** `calcProjection` (Caixa, Orçamento × Previsão, replicação) aplica INCC a partir da 5ª parcela e respeita `usar*`; `expandUnitReceivables` (Contas a Receber e tudo que passa por `getMonthlyRevenue`) não aplica nem respeita. Pela decisão, **o Caixa segue corrigido e a DRE nominal**; a unificação das duas implementações ("com e sem correção") é da §57 (I-9). Aqui, nada que dependa disso; a tela **declara** a regra (5.5) |
| **BQ-3** · carência contratual | **Decidido (30/09): mantém a correção a partir da 5ª parcela, por enquanto.** `INCC_FROM_INSTALLMENT = 4` em `calc/projection.ts:43` e `calc/simulator.ts:55`. Fica, documentada e declarada na tela |

## O que já está feito por prompts anteriores

| Seção | Situação |
|---|---|
| 4.1 · permissão de ver | **Feito** (Prompt M): `/parametros` verifica `ver` com `AccessDenied` |
| 5.4 · exibir subtítulo | **Feito** (J-1): o subtítulo "correção a partir da 5ª parcela" **já aparece**; falta dizer que usa o acumulado do mês do vencimento |
| Obra explícita (Prompt A) | **Feito**: `lerSelecaoDeProjeto` + `PedirProjeto` |
| Isolamento de projeto nas actions | **Feito** (AK/A): as três actions conferem `ctx.projects.some(...)` |
| Auditoria de `saveIncc` com de/para | **Feito** (AK Parte 1) — mas `saveIncc` é código morto (4.5) |

## O que o código mostra, seção a seção

### 1 · A projeção roda sozinha ao abrir

`incc-editor.tsx:33-47`: `useEffect` chama `projectFutureIncc` quando há mês
futuro com `projected = false` e o usuário pode editar — sem clique nem aviso.
Passa a ação explícita: a tela informa "há N meses futuros sem projeção" e
oferece o botão (1.2). `incc.project` grava só `{ projectId }` (1.3): passa a
registrar quantos meses e os valores anteriores e novos.

### 2 · O botão de reprojetar apaga índice oficial

`projectFutureIncc` marca `projected = ordOf(mes) > mêsCorrente` para **toda**
linha — inclusive mês futuro informado como oficial (a FGV divulga, e é normal
informar o mês corrente/próximo). Passa a reprojetar só `projected = true`
(mês oficial fica oficial, futuro ou não — 2.2); reprojetar um oficial vira
ação explícita naquele mês com confirmação (2.3). Produção: consulta 3 do SQL
diz quantos oficiais futuros existem hoje (relatório, item 4). Local: 48
meses (01/2026–12/2028), 0 projetados.

### 3 · Rastro da alteração

`updateInccMonth` edita o mês, marca oficial, reprojeta todos os projetados e
reencadeia o acumulado; grava `{ projectId, mes, mo }` — sem valor anterior e
sem a lista dos meses reescritos. Passa a registrar o mês editado (de/para) e
cada mês reprojetado (de/para de mensal e acumulado), no padrão `diffAudit`
(3.3). O mesmo para `incc.project`.

### 4 · Validação, permissão e código morto

- 4.2 `getInccRows(projectId)` filtra só por projeto — **15 chamadores**
  (parametros, caixa, fluxocaixa ×2, consolidado, projecao, simulador,
  versao/export, versao/template, lancamento/export, dre, budget.ts,
  queries.ts, incc.ts ×3). Passa a `(tenantId, projectId)`.
- 4.3 Faixa: o campo aceita qualquer número finito. Passa a **avisar sem
  bloquear** fora de −5 % a +5 % ao mês (negativo é aceito: deflação existe);
  recusa só o impossível (não finito).
- 4.4 As actions fazem `return` mudo sem permissão/obra. Passam a `{ ok, error }`.
- 4.5 `saveIncc`: existe, grava em lote, **nenhum chamador fora do teste**
  (`ak-parte1.test.ts`), e não toca em `projected`. **Decisão: remover**, com
  o teste correspondente movido para `updateInccMonth` (a auditoria de/para
  continua coberta).
- 4.6 Média móvel com menos de doze meses: `projectIncc` usa
  `slice(max(0, i−12), i)` sem sinalizar. Passa a devolver quantos meses
  entraram em cada projeção, exibido na tabela.

### 5 · O que a tela precisa declarar

Cabeçalho: variante (BQ-1, "a confirmar" até a resposta); **mês de referência**
(a tabela guarda `mes` como mês de referência: `getIncc(rows, "MM/YYYY")` é
lido pelo mês do vencimento da parcela — confirmado em `projection.ts:66`);
quem informou e quando, por mês oficial (5.3: colunas aditivas `informado_por`,
`informado_em`, `fonte`, preenchidas daqui para frente; histórico fica em
branco e a auditoria continua sendo a fonte); onde a correção incide (5ª
parcela, acumulado do mês do vencimento); **o que não alcança** (Contas a
Receber e DRE — nominal por decisão BQ-2); nada é gravado corrigido (5.6; a
exceção `replicateFromAtual` é do Prompt D).

### 6 · Assistente

Propõe e para (6.1), selo "Propõe, você confirma" (6.5). **Sem fonte externa
definida** (bloqueio menor da 6.2) e **sem variante confirmada** (BQ-1), o
assistente **apenas identifica os meses faltantes** (períodos encerrados sem
índice oficial) e pede que o usuário informe — não sugere valor, não inventa,
não usa a média móvel como oficial. Análises (6.3): meses faltantes; curva
projetada × histórico (distância da média móvel do comportamento recente e há
quantos meses a série é só projeção); efeito de uma alteração (prévia do
acumulado e dos meses reescritos, antes de confirmar); cobertura (janela de
competências do projeto × tabela — recebível fora da tabela é corrigido por
zero). Nunca grava, nunca marca oficial, nunca roda a reprojeção (6.4).

## Plano de PRs

| PR | Conteúdo | Muda dado? | Depende de |
|---|---|---|---|
| **Q-1** · integridade | 1.2 projeção explícita (sem `useEffect`); 1.3/3.2 auditoria de/para em `incc.update` e `incc.project`; 2.2 reprojeção preserva oficiais; 2.3 reprojetar um oficial é ação no mês com confirmação; 4.2 tenant (15 chamadores); 4.3 aviso de faixa; 4.4 `{ ok, error }`; 4.5 `saveIncc` removida; 4.6 meses na média; SQL | Só por ação do usuário | — |
| **Q-2** · o que a tela declara | migração **0051** aditiva (`variante`, `fonte`, `informado_por`, `informado_em` em `incc_rate`); cabeçalho com variante ("a confirmar"), mês de referência, 5ª parcela + acumulado, "não alcança Contas a Receber nem DRE"; quem/quando por mês oficial (daqui para frente) | Colunas novas, default preserva | Q-1 |
| **Q-3** · assistente | painel "Propõe, você confirma": meses faltantes (pede informar), curva × histórico, efeito de uma alteração (prévia), cobertura; sem sugestão de valor até haver fonte e variante | Não | Q-1, Q-2 |

Cada PR: testes puros + integração, suíte inteira, typecheck, lint, build,
conferência no navegador, e antes/depois de `incc_rate` (consulta 1 do SQL) e
dos números do Caixa.

## Perguntas (nenhuma trava a Q-1)

1. **BQ-1:** a variante exata (INCC-DI, INCC-M ou INCC-10) que os contratos
   usam. Até lá a tela diz "variante a confirmar" e o assistente não sugere
   índice.
2. **4.5:** confirmo a remoção de `saveIncc` (código morto; o teste de
   auditoria migra para `updateInccMonth`). Alternativa: marcar como
   descontinuada e manter.
3. **6.2 · fonte do índice:** qual fonte externa (se alguma) o assistente
   poderá consultar, e o comportamento quando indisponível. Sem resposta, só
   identifica os meses faltantes.

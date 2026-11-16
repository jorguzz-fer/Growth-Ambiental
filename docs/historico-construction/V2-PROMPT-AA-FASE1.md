# Prompt AA · Dashboard — Fase 1, inventário

Prompt AA (37 de 42). **Só leitura nesta fase; nada foi alterado.** SQL em
[`sql/v2-prompt-aa-diagnostico.sql`](./sql/v2-prompt-aa-diagnostico.sql).
A auditoria citada pelo prompt (`docs/AUDITORIA-DASHBOARD-FORMULAS.md`) não
está no repositório. O inventário compara o prompt com o código de hoje.

## O que já mudou desde o prompt

- **2.2 / 2.3.4 · o fallback do modo `all` já saiu** (Prompt A). O escopo
  vem de `lerEscopoDeRelatorio`. "Todos", "Ativos" e "Finalizados" somam,
  obra a obra, uma coluna por tipo de versão (`somarResumos`). Nunca o
  cookie.
- **1.3 · projeto sem versões não empresta as de outro.** `ctx.versions` já
  não é usado. Mas a tela não declara a ausência: ela mostra os cartões sem
  coluna.
- **4.3 · "A pagar" já usa o saldo da parcela** (Prompt R, §15:
  `totalPendente`). Continua sem filtro de versão, porque `getContasPagar`
  não filtra.
- **8.1 · a página já verifica `dashboard:ver`** antes de consultar.
- **`selecaoPadrao` já existe** em `src/lib/dre.ts` (Prompt AC): Atual mais
  o Orçamento e a Previsão mais recentes que não são cópia. A cópia é
  identificada por `source_version_id`.

## O que continua como o prompt descreve

| Item | Onde | Hoje |
|---|---|---|
| 1.2 · padrão = 3 mais antigas | `page.tsx`: `versoes.slice(0, 3)` | continua |
| 1.4 · a 4ª versão some em silêncio | `VersionMultiSelect` troca a primeira | continua |
| 1.6 · cabeçalho não declara o recorte; subtítulo "independente da versão ativa" | `page.tsx` | continua |
| 2.1 · 24 de 28 cartões ignoram versão e período | `getStatusProjeto`, `getIndicadoresObra` | continua; nada na tela diz |
| 3.1 · "Liberação acumulada" = financiamento do terreno; "Saldo" = da construção | `queries.ts` (`?? financiamentoTerreno`) | continua |
| 3.2 · "Serviços fora dos limites" 0 verde sem serviço | `indicadores-obra.tsx` | continua |
| 4.1 · a mesma coluna muda de definição na Atual | `page.tsx` | continua, sem declarar |
| 4.2 · `max(0, receita − realizado)` | `versionSummary` | continua |
| 4.4 · realizado e recebido ignoram `rec` | `versionSummary`, `getStatusProjeto` | continua |
| 4.5 · VGV soma unidade de qualquer versão | `versionSummary` | continua |
| 4.6 · `num = Number(v) \|\| 0` | `getStatusProjeto`, `getIndicadoresObra` | continua |
| 4-A · os dois gráficos | — | **não existem na tela** |
| 4-B.1 · Recebido soma caixa de todas as versões | `getStatusProjeto` | continua |
| 4-B.2 · Executado ÷ todos os Orçamentos | `getStatusProjeto` | continua |
| 4-B.3 · margem com três regimes | `getStatusProjeto` | continua |
| 4-B.5 · `budget_line` com `.catch(() => [])` | `getStatusProjeto` | continua |
| 8.2 · `cash_entry`, `despesa`, `project`, `version` e `medicao_servico` do tenant inteiro, filtrados em JS | `getStatusProjeto`, `getIndicadoresObra` | continua |
| 8.3 · consultas sem `tenant_id` no SQL | `servico`, `cash_entry` inline | continua |

## Base local

- **BAA-1:** nenhuma obra tem serviço nem medição por serviço. Nenhuma tem
  CUB, metragem, %BDI ou financiamento no cadastro. Os 16 cartões estão em
  zero ou "—".
- **BAA-2:** 5 versões, **nenhuma cópia** (`source_version_id` vazio).
  Inventário completo no relatório 2. Nenhuma versão será apagada.
- **BAA-3:** nenhum caixa fora da Atual e nenhuma obra com dois Orçamentos.
  Na base local, "Recebido" e "Executado" **não estão inflados**. Em
  produção, rodar os relatórios 3 e 4.
- **BAA-4:** as entradas da Atual são `extrato` (24) e um `ajuste`.
- **BAA-5:** a receita do cadastro é zero nas três obras. Não há unidade
  vendida na Atual.
- **4.5:** as 2 unidades da EMPREENDIMENTO PILOTO ([valor removido]) estão na **Previsão**,
  não na Atual. Hoje o VGV da coluna Previsão mostra esse valor, e o da
  Atual, zero.
- **4.4:** uma entrada conciliada (R$ 12,34), 24 não conciliadas.

## Dependências que não existem

- **Prompt I, seções 54 a 58 (PR I-9) e camada analítica §28 (PR I-8):**
  não foram executadas. O índice diz que "a seção 58 ainda não foi
  escrita". Por isso:
  - **Parte 4-A:** a linha de receita do gráfico de resultado não pode
    entrar (4-A.2, bloqueio explícito).
  - **Parte 7** (relatório customizado) e a ação **"Montar outra
    análise"** (6.3) dependem do catálogo e não começam (BAA-6).
- **Prompt V, BV-1:** **não decidido** (V-FINAL). O BAA-1 é a mesma decisão.
- **Prompt L, Parte 7 (critério de conciliação):** o Caixa já tem o saldo
  conciliado, mas o critério dos relatórios (4.4 e 4-A.3) não foi decidido.

## Bloqueios e decisões adotadas

| | Decisão adotada (não destrutiva) |
|---|---|
| **BAA-1** | **Sem decisão.** Os 16 cartões ficam. Os dois fallbacks de 3.1 saem **atrás da chave**. Com a chave desligada, o cartão declara que o valor é do cadastro, sem medição. Pergunta ao cliente: *têm a PLS de cada obra, e o engenheiro mede por % ou por valor?* |
| **BAA-2** | Só inventário. Cópia é identificada por `source_version_id`, sai do padrão e continua selecionável. |
| **BAA-3** | Os relatórios 3 e 4 são a prévia. A tela `/chaves` mostra o mesmo, por obra. |
| **BAA-4** | **Opção 1:** continua sendo toda entrada de caixa, e o rótulo passa a dizer "Entradas de caixa". Só muda texto, nenhum número. A opção 2 (recebimento de venda) fica como pergunta. |
| **BAA-5** | **Manter o cadastro e declarar a origem no cartão.** Nenhum número muda. |
| **BAA-6** | A camada analítica **não existe**. A Parte 7 vira infraestrutura (DRE, Consolidado, Projeção) e precisa de decisão explícita. **Não começa.** |

## Mudança de número: o que vai atrás da chave

Uma chave para o conjunto, **`dashboard_definicao_nova`**, nascida
desligada (10.2 e a regra geral do dono):
- **4-B.1:** "Entradas de caixa" só da Atual.
- **4-B.2:** "Executado" ÷ **um** Orçamento, o mais recente que não é cópia,
  declarado.
- **4-B.3:** margem com a mesma janela de competências nos dois lados.
- **4.5:** VGV da Atual.
- **4.2:** "A realizar" sem o `max(0, …)`.
- **3.1:** os dois fallbacks de financiamento saem.
- **2.3.2:** os painéis passam a aplicar o período.

**Sem chave, porque não muda número:**
- **Parte 1:** rótulos, seleção padrão, cópia identificada, a 4ª versão
  informada, cabeçalho com o recorte.
- **1.3:** a ausência declarada.
- **2.3.3 e 4-B.4:** cada painel e cartão declara cenário, base e regime.
- **3.2 e 3.5:** sem serviço, estado próprio em vez de 0 verde.
- **4.1:** cada coluna declara a sua definição, e o "—" de A pagar diz por
  quê.
- **4-B.5:** a falha de `budget_line` vira erro visível.
- **8.2, 8.3 e 8.5:** filtrar no SQL, `tenant_id` explícito e um helper de
  razão, com os mesmos resultados.

## Conflito anotado

- **O mais recente × o mais antigo.** O AA (1.2) pede, para cada cenário,
  a versão **mais recente**. A DRE e o Fluxo (AC e AD) usam a **mais
  antiga** quando a obra tem duas do mesmo cenário. O consolidado do
  Dashboard também usa a mais antiga hoje.
  - Na tela de uma obra, a seleção padrão segue o AA, e o usuário troca à
    vontade.
  - No consolidado, fica a mais antiga, para não mudar número sem chave.
  - **Pergunta:** qual regra vale para todas as telas?
- **"Orçamentos" × "Orçamento".** O rótulo da coluna segue o da DRE,
  "Orçamento", no singular, porque é uma versão. "Orçamentos" é o nome da
  tela `/budget`.

## Plano de PRs

1. **AA-1:** Partes 1, 2.3.3, 3.2, 3.5, 4.1, 4-B.4, 4-B.5, 1.3 e 8.2, 8.3,
   8.5. Mesmos números.
2. **AA-2:** a chave `dashboard_definicao_nova`, com 4-B.1, 4-B.2, 4-B.3,
   4.5, 4.2, 3.1 e 2.3.2, mais a prévia por obra, cartão a cartão, em
   `/chaves`.
3. **AA-3:** o assistente somente leitura (Parte 6) e o relatório final.
   "Montar outra análise" aparece desabilitada, com o motivo (BAA-6).

**Fora destes PRs, com o motivo:**
- **4-A** (gráficos): depende de I-9 e do critério de conciliação.
- **Parte 7:** depende de §28 e §58 e do BAA-6.
- **Parte 3 inteira:** depende do BAA-1.
- **1.5** (seleção livre de vários projetos): os escopos do Prompt A
  (Todos, Ativos, Finalizados) já cobrem o consolidado. A seleção livre
  mexe no seletor comum a várias telas e fica como pergunta.

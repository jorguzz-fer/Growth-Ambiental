# Prompt A · PR 9 — Relatórios (parte 1): DRE e Fluxo de Caixa

Primeiros relatórios, com as decisões do **B12** (`V2-BLOQUEIOS.md`).

## O que muda

| | Antes | Agora |
|---|---|---|
| Aberto pelo menu | DRE: **obra do cookie**; Fluxo: obra do cookie ou a primeira | obra lembrada pela aba; sem memória, **Todos** |
| Filtros | uma obra ou "Todos / Empresa toda" | uma obra, **Todos**, **Projetos ativos** ou **Projetos finalizados** |
| Ativos / Finalizados | — | só obras com a situação; escritórios fora; aviso com quantas obras sem status ficaram de fora; sem nenhuma obra, **estado vazio** (não uma DRE zerada) |
| DRE: comparar versões | só na obra do cookie | em **qualquer** obra escolhida |
| Fluxo em "Todos": eixo de meses | INCC da obra do cookie | união do INCC das obras do escopo; entram só meses sem movimento, e nenhum total muda |
| Fluxo: obra sem versões | caía nas versões da obra do cookie | aviso; nada é lido de outra obra |

"Todos" continua **exatamente** como antes: obras e escritórios, somados
pela versão Atual de cada um.

Escolher uma obra no relatório também a grava na memória da aba. Abrir
Despesas depois, na mesma aba, cai nela.

## Comparação de números — seção 29

Mesmo banco local (duas obras e um escritório, 75 despesas e 45 movimentos de
caixa). Cada cenário foi aberto com o código de `main` e com o desta PR, e
todas as células numéricas das tabelas e todos os cartões em R$ foram
comparados:

| Cenário | Resultado |
|---|---|
| DRE Todos, acumulado | **igual** |
| DRE Todos, mensal (588 células) | **igual** |
| DRE da obra do cookie | **igual** |
| DRE de **outra** obra (antes, coluna agregada; agora, comparação de versões) | **igual** |
| DRE de outra obra, mensal | **igual** |
| Fluxo Todos, Fluxo Todos 2026 | **igual** |
| Fluxo de cada obra | **igual** |

Filtros novos, com uma obra marcada Ativo: a DRE de "Ativos" é idêntica à DRE
dessa obra; "Finalizados" mostra o estado vazio.

## Verificação

- `projeto-selecao.test.ts`: escopo lido da URL; "Todos" traz obras e
  escritórios na mesma ordem; Ativos e Finalizados trazem só obras
  classificadas; escritório nunca entra, mesmo classificado.
- Suíte inteira: 862 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador:
  1. DRE em aba nova abre em "Todos";
  2. o aviso de obras sem status aparece;
  3. o Fluxo em "Ativos" diz quantas obras somou;
  4. a obra escolhida na DRE vale para Despesas na mesma aba;
  5. o Fluxo, em aba nova, abre em "Todos";
  6. nenhum erro de JavaScript.

## Próxima

- **Dashboard**, em PR própria. No modo "Todos" os 4 números do topo (VGV,
  Realizado, A receber, A pagar) saem **de uma obra só**: a do cookie ou a
  primeira. É o item 2.2 do Prompt AA. A correção dele consolida esses números,
  o que é cálculo novo.
- Consolidado, Resumo, Projeção, Contabilidade e Balanço do dia.

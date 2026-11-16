# Prompt A · PR 10 — Dashboard

Terceiro relatório. Mesmo escopo da PR 9 (decisões do B12), mais a decisão de
30/09: **em "Todos", os 4 KPIs do topo somam as obras**. É o item 2.2 do Prompt
AA. É também o único ponto de todo o Prompt A em que um número exibido muda,
por decisão explícita.

## O que muda

| | Antes | Agora |
|---|---|---|
| Aberto pelo menu | obra do cookie ou a primeira | obra lembrada pela aba; sem memória, **Todos** |
| Filtros | uma obra ou Todos | uma obra, **Todos**, **Projetos ativos**, **Projetos finalizados** |
| KPIs do topo em Todos (VGV, Realizado, A receber, A pagar) | **de uma obra só** (a do cookie ou a primeira), com as versões dela | **soma das obras do filtro**, uma coluna por tipo de versão (Budget, Forecast, Atual) |
| Painéis de status e indicadores em Todos | já consolidavam | iguais; em Ativos e Finalizados, só as obras do filtro |
| Seletor de versões | versões da obra (em Todos, as da obra do cookie) | versões da obra; em escopo, não aparece |

**Como a soma é feita:** para cada obra do filtro, pega a versão daquele tipo
(a mais antiga, como no resto do app) e faz **a mesma conta que o Dashboard já
fazia para uma obra**; depois soma (`somarResumos`, `lib/dashboard-resumo.ts`).
Uma obra sem versão de um tipo fica fora daquela coluna. "A pagar" e "A receber"
da coluna Atual já eram da empresa toda e continuam iguais. As versões
customizadas não entram nas colunas consolidadas.

## Comparação com `main` (mesmo banco local: 2 obras + 1 escritório)

| Tela | KPIs | Painéis |
|---|---|---|
| Dashboard da EMPREENDIMENTO PILOTO | **igual** | **igual** |
| Dashboard da OBRA 7 (não era a do cookie) | **igual** | **igual** |
| Dashboard da EMPREENDIMENTO PILOTO com período | **igual** | **igual** |
| Dashboard **Todos** | só a mudança decidida (abaixo) | **igual** |

Em "Todos", a única diferença:

| KPI | Antes (só a 1ª obra) | Agora (soma) | Conferência no banco |
|---|---|---|---|
| Realizado acum. · Atual | R$ 4,7 mil | **R$ 14,3 mil** | 4.761,14 + 4.748,80 + 4.748,80 = **14.258,74** |

Os demais KPIs coincidem nesse banco, porque só uma obra tem unidades, e "A
pagar" já era consolidado. O rótulo da coluna Atual passou de "Atual — caixa
real" para "Atual": a coluna usa o nome da versão da primeira obra do filtro.

## Verificação

- `dashboard-resumo.test.ts`: soma de cada KPI; meses juntados; uma obra só dá
  os números dela; sem obras, a coluna não aparece.
- Suíte inteira: 866 passando. `typecheck`, `lint` e `next build` limpos.

# Prompt G — Plano de Contas · relatório final

Prompt G (16 de 42) em 3 PRs, todas em `main`. **Sem migração; nenhum
registro de `chart_account` criado, alterado, reclassificado, inativado ou
removido.**

| PR | Conteúdo | Doc |
|---|---|---|
| Etapa 1 | inventário | [`V2-PROMPT-G-ETAPA1.md`](./V2-PROMPT-G-ETAPA1.md) |
| G-1 | Parte 1 — restyle, sem mudança funcional | [`V2-PROMPT-G-PR1.md`](./V2-PROMPT-G-PR1.md) |
| G-2 | Parte 2 — assistente somente leitura | [`V2-PROMPT-G-PR2.md`](./V2-PROMPT-G-PR2.md) |

## Relatório obrigatório (seção 7)
1. **Inventário** — Etapa 1.
2. **Arquivos alterados** — `planocontas-manager.tsx` e `planocontas/page.tsx` (G-1); `planocontas-analise.ts` + teste, `assistente-planocontas.tsx`, `getUsoDoPlanoDeContas` em `queries.ts`, `page.tsx` (G-2).
3. **Compartilhados** — `PageHeader`, `Card`, `Input`, `Select`, `Button`: **não alterados**; classes por `className` no ponto de uso. Nenhuma outra tela muda.
4. **Item a item** — inventário por DOM antes e depois: títulos, botões, rótulos, placeholders, selects, `title`s, textos: iguais (G-1).
5. **Nenhuma query, action, validação, permissão, rótulo ou campo mudou** na Parte 1. A Parte 2 **acrescenta** uma consulta de leitura.
6. **Nenhuma migração.**
7. **`chart_account`** — contagem e hash iguais antes e depois de cada PR (95 linhas no tenant local).
8. **Não decidido sozinho** — título 29px/700 (1.2) no `PageHeader` compartilhado: não aplicado; 1.6 (tabela fixa) não se aplica; `PADRAO-VISUAL.md` ausente, valores do próprio prompt.
9. **Limitações** — a comparação visual foi feita por capturas e inventário de DOM no ambiente local; perfis de permissão diferentes foram cobertos por teste puro (8.5), não por navegador.

**Parte 2:**
10. Consultas: `despesa` (conta, categoria, competência → contagem, última criação) e `budget_account` (conta, kind, categoria, obra), ambas com `tenant_id` explícito e `project_id IN (obras do usuário)`.
11. Período (12 meses por competência, senão mês da criação) e obras: escritos em cada ação do painel.
12. O painel não grava nada (contagem e hash iguais) e não sugere classificação, criação, fusão nem inativação.
13. Nenhuma das quatro decisões pendentes foi antecipada.

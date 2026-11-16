# Prompt A — Etapa 1: inventário do "projeto ativo" (B-A1)

O Prompt A manda **parar ao fim da Etapa 1** e entregar este inventário antes de
qualquer código: ele decide se a refatoração é uma PR ou várias. Levantamento
feito em 29/09/2026 sobre `main` + Bloco 0.

## Números

| O quê | Quantos |
|---|---|
| Arquivos que chamam `getActiveContext()` | **53** em páginas/rotas de `(app)` · **31** de actions · 1 da API |
| Arquivos que dependem do **projeto implícito** (`ctx.project`) | **28** (45 usos) |
| Arquivos que dependem da **versão implícita** (`ctx.version`) | **27** (51 usos) |
| Usos de `ctx.projects` / `ctx.versions` | 43 / 26 |
| Arquivos com `setActiveProject`, cookie de projeto/versão, `SelectActive` | **6** |

### Telas que leem o projeto/versão do cookie sem o usuário escolher

Orçamentos, Previsão, Caixa, Clientes (ficha e novo), Consolidado,
Contabilidade, Dashboard, Despesas, DRE, Fluxo de Caixa, Medição, Lançamento de
Medição, Parâmetros/INCC, Permuta (lista e nova), Projeção, Projetos, Liberações
de Obra (lista e nova), Ressarcimentos, Resumo Executivo, Simulador,
Configuração da Versão (tela, exportação e modelo) — **24 telas** — e o
próprio layout.

### Actions que gravam no projeto/versão implícitos

| Action (arquivo) | usos de projeto · versão |
|---|---|
| `caixa.ts` | 0 · **10** |
| `receitas.ts` | 2 · 4 |
| `restituicoes.ts` | 1 · 4 |
| `medicao.ts` | 2 · 2 |
| `pagamentos.ts` | 0 · 3 |
| `versions.ts` | 3 · 0 |
| `units.ts` | 2 · 0 |
| `recebimento-terceiro.ts`, `version-io.ts` | 1 · 1 |
| `despesas.ts`, `projects.ts`, `restituicao-lote.ts` | 1 cada |

**São essas as perigosas:** uma aba aberta na obra A e outra na B, e a gravação
cai na obra que estiver no cookie — não na que está na tela.

### O mecanismo a remover (última PR)

`lib/actions/context.ts` (5), `lib/actions/projects.ts` (6), `lib/context.ts`
(3), `components/app/project-switcher.tsx` (11), `components/app/project-manager.tsx`
(9), `app/(app)/projeto/page.tsx` (1).

## Conclusão: não é uma PR

É a maior mudança da base, com dado real em produção. **Recomendo o
fatiamento do próprio prompt**, cada PR deployável e reversível sozinha:

1. **PR 1** — coluna nova Ativo/Finalizado + auditoria da mudança de status
   (aditiva; seções 2 e 23–27).
2. **PR 2** — contexto só de tenant e resolução explícita de projeto/versão,
   com `getActiveContext()` mantido e marcado como depreciado (seções 10–12).
3. **PR 3…n** — um módulo por vez, na ordem em que o dinheiro anda: Despesas →
   Caixa → Receitas → Planejamento → relatórios (que só leem).
4. **PR final** — remover `setActiveProject`, o cookie e o código morto, **só
   depois** de zerar as dependências.

## O que falta decidir antes de começar — B-A2

Quando a pessoa abre uma tela sem ter escolhido projeto:

1. **Literal** — sempre pede a escolha. Mais seguro, mais atrito todo dia.
2. **Memória por aba** (recomendação do prompt) — a escolha vai na URL
   (`?project=…`) e cada aba lembra a última em `sessionStorage`. Não é
   global, não vaza entre abas, e a controladoria não precisa escolher a obra
   toda vez.

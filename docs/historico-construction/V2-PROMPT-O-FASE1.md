# Prompt O · Liberações de Obra — Fase 1, inventário antes de escrever código

Prompt O (Liberações de Obra, 12 de 42) renomeia a tela `/reembolso`, corrige
os defeitos da revisão e acrescenta o assistente — **sem mudar a estrutura da
tela** (mesma listagem, mesmos campos, mesmo fluxo). Este é o inventário: o
que o código mostra hoje, seção a seção, e como o trabalho se divide em PRs
curtas. **Só leitura; nada foi alterado.**

## Bloqueios — situação

| | Situação | Fonte |
|---|---|---|
| **BO-1** · soma em duplicidade | **Respondido; a correção é do Prompt I (§56/§57), não deste.** O código confirma: `getMonthlyRevenue` (Atual) soma `expandUnitReceivables` do plano **e** `reembursementsByMonth(getReembolsos)`; `getMonthlyRevenueBySource` idem (`reemb` separado); `calcTotals.reemb`; `budget.ts` (receita consolidada) soma unidades + reembolsos; Projeção, Consolidado e Resumo exibem a linha. Aqui a tela fica como está. **Consequência (6.4):** o assistente nunca trata a liberação como receita nem a soma a total de receita | `queries.ts:1457-1470, 1760-1770`, `budget.ts:552`, `projection.ts:410` |
| **BO-2** · o campo "%" | **Decidido (30/09): sai da tela.** Produção: havia lançamento com o campo preenchido [dado de produção removido]. Já cumprido: `addReembolso` grava `pct: null` e o formulário não tem o campo. A coluna fica; o valor gravado não muda. Consulta 2 do SQL reconfere | `V2-BLOCO2-DECISOES.md`, `receitas.ts:45-47` |

## O que já está feito por prompts anteriores

| Seção | Situação |
|---|---|
| 1.1 · rótulo no menu | **Feito** (Prompt C): `nav-menu.ts` → "Liberações de Obra" |
| 2.4 · exibir subtítulo e eyebrow | **Feito** (Prompt J, J-1): `PageHeader` renderiza os dois — por isso o subtítulo de planilha (2.3) **está aparecendo** em produção |
| 3.3 · auditoria em `addReembolso` | **Feito** (Prompt AK): `reembolso.create` com projeto, versão, valor e data. **Falta a origem** no `meta` |
| 3.4 · permissão de ver | **Feito** (Prompt M): `/reembolso` e `/reembolso/novo` verificam `ver` com `AccessDenied` |
| 3-A.5 · campo "%" sai do formulário | **Feito** (BO-2, 30/09) |
| Versão congelada bloqueia o lançamento | **Feito** (decisão de 30/09): `obraDoFormulario` |
| Obra explícita, sem fallback de cookie | **Feito** (Prompt A) |

## O que o código mostra, seção a seção

### 1 · Nomes

- Título da lista: "Liberação de Obra" (singular) → **"Liberações de Obra"**. Botão "+ Nova Liberação" → **"Nova liberação"**. Cadastro: "Nova Liberação de Obra" → **"Nova liberação de obra"**; o botão já é "Salvar liberação". `PedirProjeto` idem. Rótulo da permissão (`permissions.ts:60`, só texto): "Liberação de Obra" → "Liberações de Obra" (o `id` `reembolso` continua, de propósito).
- Rótulos "Reembolso" **só de exibição** em: Resumo ("Reembolso (aba própria)", 2×), Consolidado ("Reembolso", 2× e o subtítulo "Reembolso incluído no TOTAL"), Projeção ("Reembolso", 4×), Versão ("Reembolsos", contagem) e Versão/Importação (`versao-importacao.ts` já diz "liberações de obra"). **Não mudam:** rota `/reembolso`, tabela `reembolso`, `addReembolso`, `calcTotals.reemb`, `rowKey "Reembolso"` das `budget_line` (chave gravada; `getMonthlyRevenueBySource` a compara), a aba "Reembolso" da planilha de exportação (`growth-template.ts`, chave do arquivo que volta na importação), `permissions.id`.

### 2 · Vestígios de planilha

- Faixa "A data deve ser uma DATA REAL… SUMIFS…" em `reembolso/page.tsx:82-93`; subtítulo "Aba própria — Data REAL + SERIAL automático"; subtítulo do cadastro "…SERIAL é calculado automaticamente via INT(Data)". Nenhum cálculo lê o serial (`reembToCalc` descarta; `CalcReembolso` não o declara; `reembursementsByMonth` agrega pela data). Saem.
- Coluna "Serial (auto)" na listagem sai. **`serial` fica:** gravado por `excelSerial` em `addReembolso`, exportado (`versao/export/route.ts:57`, `growth-template.ts:167`) e reimportado (`version-io.ts:97`). Quatro pontos, nenhum tocado.

### 3 · Integridade do lançamento

- `addReembolso` grava `valor || "0"`, não valida data (grava `serial: null`), origem opcional; sem permissão faz `return` mudo; erros viram digest. Passa a `{ ok, error }` com formulário cliente (mesmo desenho da P-1), validação pura (`liberacao-regras.ts`: valor > 0, data no formato gravado, origem obrigatória), confirmação visível no sucesso (3-A.6) e `origem` no `meta` da auditoria.
- `getReembolsos(versionId)` filtra só por versão — **dez chamadores**: lista, exportação, Resumo (2×), Caixa, Projeção, `budget.ts`, `queries.ts` (`getMonthlyRevenue`, `getMonthlyRevenueBySource`). Passa a `(tenantId, versionId)`; nos dois de `queries.ts` o tenant vem da versão já carregada (`versao.tenantId`).

### 3-A · Formulário

Mesmos campos, mesma disposição. Entram: asteriscos em Data, Origem e Valor; placeholder real na origem ("CEF · medição 03/2026"); linha sob a data ("data em que o recurso entrou na conta — é a que o Fluxo de Caixa usa"); nota no rodapé ("entrada de caixa, não receita — a receita da obra é reconhecida pela venda da unidade", escrita mesmo antes da §56 estar em produção, como o prompt pede); `MoneyInput` no valor.

### 4 · Corrigir o que foi lançado errado

Não existe editar, cancelar nem estornar. A tabela não tem colunas de cancelamento. Entram, no padrão da `despesa` e da P-2: migração **0050** aditiva (`cancelado` default false, `cancelado_em`, `cancelado_por`, `motivo_cancelamento`), `updateReembolso` (valor, data, origem, obs; auditoria de/para; recusa cancelado e versão congelada), `cancelarReembolso` (motivo obrigatório), `getReembolsos` sem cancelados por padrão — com isso `reembursementsByMonth` e `calcTotals` deixam de vê-los sem mudar; a lista pede `incluirCancelados` e os mostra riscados. Enquanto ninguém cancelar, **todos os totais ficam idênticos** (teste de não regressão).

### 5 · Status

Gravado fixo: `"Recebido"` pela tela, `"received"` pela importação; nenhuma consulta o lê; o badge é sempre verde com ✓, inclusive nulo. **Decisão adotada: opção 1 (recomendada pelo prompt)** — a coluna sai da listagem; a coluna do banco fica, gravada como hoje; `statusLabel` (normalizador de `"received"`) fica onde está, sem migrar nada. Se o dono preferir a opção 2 (campo real previsto/recebido), é funcionalidade nova.

### 6 · Assistente

Somente leitura, selo "Somente leitura" (6.1). Análises puras (`liberacao-analise.ts`): conferir lançamentos (valor ≤ 0, data ausente/inválida, origem em branco; "%" fora de faixa só se a coluna tiver valor); comparar com a medição (`getMedicoes(versionId)`, competência "MM/YYYY" × mês da liberação: medição sem liberação e liberação sem medição); liberações por competência (mês a mês e acumulado) contra o previsto de financiamento das unidades vendidas (`calcProjectionBySource` → fonte "Banco", a mesma da Projeção); duplicidade aparente (mesmo valor, data e origem). No formulário: aviso de competência com medição e sem liberação, e de lançamento igual já existente — avisos, nunca preenchimento. **6.4:** nenhuma frase ou número do painel chama a liberação de receita nem a soma a receita, resultado ou margem.

## Plano de PRs

| PR | Conteúdo | Muda dado? | Depende de |
|---|---|---|---|
| **O-1** · Parte 1 | 1.1/1.3 nomes (tela, cadastro, permissão, rótulos de exibição em Resumo/Consolidado/Projeção/Versão); 2.1 faixa SUMIFS sai; 2.2 coluna Serial sai; 2.3 subtítulos reescritos; 5.2 coluna Status sai da listagem; SQL de diagnóstico | Não | — |
| **O-2** · integridade | 3.1 validação; 3.2 `{ ok, error }` + formulário cliente; 3.3 origem na auditoria; 3.5 tenant em `getReembolsos` (dez chamadores); 3-A.1–3-A.4, 3-A.6 | Não | O-1 |
| **O-3** · editar e cancelar | migração 0050; `updateReembolso`, `cancelarReembolso`; consultas sem cancelados; tela `/reembolso/[id]`; ações na lista; teste de não regressão dos totais | Colunas novas, default preserva | O-2 |
| **O-4** · assistente | 6.1–6.4: painel somente leitura com as quatro análises; avisos no formulário | Não | O-2 (os avisos do formulário), O-3 (ignorar cancelados nas análises) |

Cada PR: testes puros + integração, suíte inteira, typecheck, lint, build,
conferência no navegador, e antes/depois de `reembolso` (consulta 1 do SQL).

## Perguntas (nenhuma trava a O-1)

1. **5.2 · status:** adotei a opção 1 (coluna sai da listagem; nada no banco muda). Confirma, ou prefere a 2 (campo real previsto/recebido)?
2. **Rótulo nos relatórios:** "Liberações de Obra" na linha da Projeção, do Consolidado e do Resumo. Confirma o texto?

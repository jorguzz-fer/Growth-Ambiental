# Prompt H · Rascunho não entra em relatório — relatório final (seção 9)

Entregue em 2 PRs: Fase 1 (#208) e H-1 (código). Chave **desligada** em
todas as empresas: nada mudou em produção até alguém ligar.

1. **Contagem por `kind` e `status` antes de qualquer alteração** (BH-1, base
   local): `budget` Rascunho 1 · `forecast` Rascunho 1 · `atual` Rascunho 3 ·
   **Aprovado 0**. Produção: relatório BH-1 em
   `docs/sql/v2-prompt-h-diagnostico.sql`. Por isso a chave não podia
   nascer ligada.
2. **`atual` nunca é filtrada**: o filtro vive **dentro** do ramo
   `if (kind === "budget" || kind === "forecast")` das quatro funções; o ramo
   `atual` não o chama. `entraNosRelatorios` (puro) devolve `true` para
   qualquer `kind` que não seja planejamento, qualquer situação. Testes:
   puro ("atual NUNCA é filtrada") e com banco (despesa da Atual em
   Rascunho continua inteira).
3. **Funções alteradas e telas que as chamam**:
   `getMonthlyRevenue` (Resumo, Contabilidade, Projeção, Dashboard, DRE e
   card Orçado x Realizado de Projetos, Fluxo de Caixa) ·
   `getExpenseRows` (DRE, Fluxo de Caixa) · `getRevenueBySource`
   (Consolidado, Projeção) · `getBudgetLines` com `{ respeitarSituacao }`
   (**Medição** pede; exportação de lançamentos e card de Projetos não).
4. **Como o filtro foi expresso**: função nomeada
   `planejamentoForaDosRelatorios(versao)` em `queries.ts` (kind + status +
   chave da empresa), com comentário `FILTRO POR SITUAÇÃO (Prompt H)` em
   cada ponto; regra pura em `src/lib/situacao-versao.ts`. Nada duplicado.
5. **Chave**: `rascunho_fora_dos_relatorios` no catálogo B4; liga/desliga
   por empresa em Configurações → Chaves de mudança (prévia obrigatória,
   auditoria `chave.ligar/desligar`); lida por `chaveLigada` (uma consulta
   por requisição). Sem linha em `tenant_flag` = desligada.
6. **Lista de conferência (5.3)**: na própria tela `/chaves`
   (`#previa-rascunho`): projeto, versão (link), tipo, situação, receitas e
   despesas de cada versão de planejamento não Aprovada. Base local: as 2
   versões (Budget e Forecast da EMPREENDIMENTO PILOTO) com R$ 0,00.
7. **Antes/depois com a chave desligada**: na base local as versões de
   planejamento têm 0 `budget_line`, logo todos os relatórios são idênticos
   por construção; o teste 8.1 confirma leituras iguais com dados. Produção:
   relatório 8.10 do SQL antes e depois do deploy (chave desligada).
8. **Nenhuma versão mudou de situação**: nenhuma PR grava `version.status`;
   base local segue com todas em Rascunho (conferido por SQL ao fim).
9. **Decisões**: BH-1 chave nasce desligada; BH-2 só budget/forecast
   (confirmado por escrito e por teste); BH-3 opção 2 (selo "não entra nos
   totais", selecionável); BH-4 sem permissão nova (continua `editar` da
   tela), voltar permitido, efeito dito na tela, troca já auditada.
   "Concluído" não entra (etapa intermediária).
10. **Migrações**: nenhuma.
11. **Limitações**: a lista 5.3 soma `budget_account.total` (totais do
    cadastro da versão), não o que cada relatório mostraria mês a mês; o
    card Orçado x Realizado de Projetos e `/contabilidade` seguem o filtro
    por chamarem `getMonthlyRevenue`, mas não têm selo (não usam o seletor
    de versões); a troca de situação ainda engole erro (BG-13, fora de
    escopo).

## Perguntas em aberto (não bloqueiam)
1. **BH-4**: quer permissão própria para aprovar/desaprovar? Hoje é `editar`.
2. Ligar a chave é decisão sua, por empresa, depois de conferir a lista.

## Produção
Deploy sem efeito até ligar a chave. Antes de ligar: `/chaves` →
conferir a lista → marcar "Conferi a prévia" → Ligar. Desligar volta ao
comportamento anterior na hora.

## Atualização — Prompt AP (01/10/2026)

"Aprovar não trava a edição; trava é `version.locked`" continua valendo. O
que mudou é **onde** se trava. A tela `/versao` saiu, e a trava passou para:
- a barra de Orçamentos e de Previsão, para a versão aberta;
- o cartão "Versões do projeto", na tela Projetos, para todas as versões.

A permissão é a nova `versaotrava`, pelo padrão só owner e admin.

# Prompt A — PR 1: situação Ativo / Finalizado · relatório

Primeira fatia do Prompt A (seções 2, 4, 23–27), conforme o inventário da
Etapa 1 (`V2-PROMPT-A-INVENTARIO.md`). **Não mexe no "projeto ativo" global**
— isso é das PRs seguintes, com a memória por aba decidida em B-A2.

## O que muda

- **Migração `0042_projeto_situacao`** (aditiva, com `down`): coluna
  `project.situacao`, **anulável e sem default**, com `CHECK` que só aceita
  `Ativo` ou `Finalizado`.
  - **Bloqueio menor da seção 2 → recomendação do prompt:** nenhuma linha
    existente é escrita. Projeto antigo aparece como **"sem status"** até
    alguém classificá-lo — dizer que toda obra está ativa seria uma afirmação
    que ninguém verificou.
  - Testado: projetos criados antes da 0042 mantêm `status` e todos os campos;
    `situacao` fica nula. `down` + reaplicar funciona.
- **Projeto novo nasce `Ativo`** (24) — pela tela e pelo provisionamento de
  empresa nova.
- **`setProjectSituacao`** (25, 26) grava **somente** a situação, em transação
  com o log `project.status.change { from, to }` (27). Mesmo valor não gera
  evento. Exige `projeto:editar`; projeto de outra empresa é recusado.
- **Tela Projetos (23):** selo por projeto — Ativo (verde), Finalizado
  (neutro), sem status — e seletor que grava na hora. O campo antigo
  (Planejamento / Em andamento) passa a se chamar **"Fase da obra"**, com os
  mesmos valores.
- **A palavra "ativo" deixa de ter três sentidos (4):** o selo "Ativo" fixo no
  código do escritório saiu (não refletia nada), e o selo de seleção passa a
  dizer **"selecionado"**.

## O que NÃO muda

- `project.status` e seus valores (2).
- Nenhuma consulta passou a filtrar por situação (29): DRE, Fluxo, Consolidado
  e todos os relatórios leem exatamente o que liam — nenhum arquivo de consulta
  foi alterado.
- Finalizar não bloqueia lançamento, não esconde o projeto, não mexe em versão,
  data ou valor (5, 28).
- A seção 27 também pede `{ from, to }` em todos os campos de `updateProject`:
  **já está feito** desde a AK Parte 2 (PR #77, `diffAudit`).

## Verificação

- `projeto-situacao.test.ts` (Postgres): projeto antigo sem classificação;
  finalizar grava só a coluna (o resto do registro idêntico) e loga
  `{ from: null, to: "Finalizado" }`; reativar e repetir; valor fora do domínio
  recusado pela action **e pelo banco**; projeto de outro tenant recusado.
- Navegador (build de produção): seletor grava, persiste ao recarregar, log
  registrado; projetos antigos com "sem status".

# Prompt V · Medição de Obra — Fase 1, inventário

Prompt V (29 de 42). Funde `/medicaolanc` e `/medicao` numa tela com abas,
corrige a integridade do lançamento e o Relatório CEF, acrescenta autoria,
documentos e assistente. **Só leitura nesta fase; nada foi alterado.** SQL em
[`sql/v2-prompt-v-diagnostico.sql`](./sql/v2-prompt-v-diagnostico.sql).

## Bloqueios — o que a base e o código mostram
| | Situação (base local) | Decisão adotada |
|---|---|---|
| **BV-1** migrar para medição por serviço? | `medicao` 0 · `servico` 0 · `medicao_servico` 0. Confirmado no código: **ninguém grava** `servico`/`medicao_servico` (zero INSERT no repositório); `getIndicadoresObra` lê `medicao_servico` e alimenta os KPIs "Evolução física acumulada" e "Evolução do mês" do Dashboard, que mostram traço + "sem medição lançada" mesmo com medições em `medicao`. | **Não posso decidir** (depende de a Cliente Piloto ter a PLS de cada obra e de como o engenheiro mede). Caminho não destrutivo: **Parte 1 inteira; Parte 2 não executada; nada descontinuado nem apagado**. Enquanto isso, o selo dos dois KPIs deixa de enganar: passa a dizer que a medição por serviço não está em uso (texto, reversível). **Pergunta ao usuário** abaixo. |
| **BV-2** medição fora da Atual | 0 registros fora da Atual (0 medições). Produção: relatório BV-2 do SQL. | Nada é movido. A 1.2 impede novos casos. |
| **BV-3** autoria | `medicao` **não tem coluna de autor**; `audit_log` local sem evento de medição (produção: relatório BV-3 do SQL; `medicao.create` existe desde o Prompt AK, mas sem `entity_id` — não liga ao registro). | Coluna aditiva `created_by` (uuid → `user`, `ON DELETE set null`), preenchida por `addMedicao` dali em diante. **Nenhum backfill.** Medição sem autor é visível a todos, marcada "autor não registrado" (0.5.3). Preenchimento manual a partir do log = pergunta ao usuário. |
| **BV-4** o FRE é impresso daqui? | `PrintButton` só chama `window.print()`; não há `@media print` em nenhum arquivo (só `print:hidden` na barra lateral e no cabeçalho). CNPJ, contrato, CNO, RT, ART, município, período e assinaturas não são lidos. | **Não implementar layout de impressão** sem a resposta. A aba do Relatório **fica** (não destrutivo); o rodapé passa a dizer o que o botão faz. **Pergunta ao usuário** abaixo. |
| **3.5** `PCT_REF_CEF` | Dez números fixos do piloto (EMPREENDIMENTO PILOTO), indexados por posição; não somam 100 (ficam um pouco abaixo); o "100%" do Total está escrito à mão. Não existe cadastro de PLS. | **Opção 2: a coluna sai do relatório** enquanto não houver PLS por obra (opção 1 depende de BV-1). A constante fica no código. Pergunta ao usuário. |

## O que já está feito por prompts anteriores
| Item | Situação |
|---|---|
| 4.1 · `can(..., "ver")` com `AccessDenied` nas duas telas | **Feito** (Prompt M) |
| 1.1 · versão do cookie | **Parcial** (Prompt A): `addMedicao` usa `getWorkingVersion(projectId)` = Atual **ou, sem ela, a versão padrão** — ainda pode cair em Budget/Forecast. A 1.2 fecha isso: `getAtualVersion`, sem fallback. |
| 4.3 · auditoria da exclusão com competência, grupo e valor | **Feito** (Prompt AK). Falta a **confirmação**. |
| Versão congelada bloqueia lançar/editar/excluir | **Feito** (`medicaoDoTenant` lê `version.locked`) |
| Módulo Obra no menu com as duas entradas | **Feito** (Prompt C) — "Duas entradas até o Prompt V fundir" |
| Padrão do membro inclui `medicao` e `medicaolanc` (AJ) | **Feito**; a fusão não muda permissão (ids continuam) |

## O que o código mostra, seção a seção
- **0 · Fusão**: duas páginas (`medicao/page.tsx` 190 linhas, `medicaolanc/page.tsx` 150), uma tabela cliente (`medicao-manager.tsx`: editar inline, excluir **sem confirmação**, sem autor, sem filtro, estado vazio "Nenhuma medição lançada nesta versão"). Permissões: `medicao` (módulo Reports) e `medicaolanc` (Despesas) — os ids ficam (chave gravada em `membership.permissions`); só o `modulo` dos rótulos muda para Obra. Engenheiro: `medicaolanc` FULL, resto NONE; contador vê `medicao`.
- **1 · Versão**: `getWorkingVersion` → `versaoDeTrabalho` ("a Atual; sem ela, a marcada como padrão"). `updateMedicao`/`deleteMedicao` filtram por id + tenant e leem `locked`; não conferem `kind` nem projeto.
- **2 · DRE**: três textos ("alimenta o Custo Variável da DRE": subtítulo de `/medicaolanc`, docstring de `actions/medicao.ts`, docstring do schema) e `revalidatePath("/dre")` nas três actions. **Confirmado: a DRE não lê `medicao`** (`dre-inputs.ts`, `dre-cascata.ts`, `fluxo-caixa.ts` não importam `getMedicoes`). Quem lê `getMedicoes`: as duas páginas e `liberacao-analise` (Prompt O, comparação).
- **3 · Relatório CEF**: `% Físico` = `min(realizado/orcado, 100)`; grupo sem Budget → `0.0%`; Total sem `min` (pode passar de 100%); `PCT_REF_CEF[i]` por posição; sem Budget → zeros e rodapé que "explica de onde viria"; `versions.find(kind === "budget")` sem desempate; `hasRange` com um campo e recorte por mês com campo de dia; três tratamentos de ausência; rodapé promete "versão formatada (FRE)". Sem aviso de 95%.
- **4 · Integridade**: `getMedicoes(versionId)` sem tenant; `addMedicao` lança `throw` (formulário sem leitura de erro), aceita `valor` vazio/zero/negativo (`|| "0"`), competência só por presença; nada avisa duplicidade.
- **5 · Documentos**: `document` tem `despesa_id`, `cliente_id`, `stakeholder_id`, `project_id`, `conta_receber_id`, `permuta_id`, `stock_movement_id`, `funcionario_id`, `equipe_dia_id`, `folha_id` — **não tem `medicao_id`**. Versão por tipo já é regra nos documentos de funcionário (coluna `versao`). Limite unificado: `LIMITE_UPLOAD_MB` (10) em `clientes-regras.ts`.
- **6 · Assistente**: não existe; padrão dos outros (`assistente-liberacoes.tsx`, análises puras em `*-analise.ts`, extração de documento em `ai/*-extract.ts`). `liberacao-analise.ts` já compara liberação × medição por competência (o par do Prompt O).

## Como vai ser feito (PRs curtas, cada uma sobre `main`)
1. **V-1 · integridade e texto** (seções 1, 2, 4 + migração): `0064_medicao_autoria_docs` (aditiva: `medicao.created_by`, `document.medicao_id`, com `down`); `addMedicao` → `{ ok, error }` com formulário cliente, versão **sempre a Atual do projeto** (sem fallback; sem Atual bloqueia), `valor > 0`, competência `MM/YYYY`, `created_by`; `updateMedicao`/`deleteMedicao` conferem versão (tenant + projeto da empresa) e autoria (0.5.5); exclusão com confirmação; `getMedicoes(tenantId, versionId, { autor? })`; duplicidade como aviso (puro, `medicao-regras.ts`); textos da DRE e `revalidatePath("/dre")` fora.
2. **V-2 · Relatório CEF** (seção 3): módulo puro `medicao-cef.ts` (linhas com estados "sem orçado"/"sem medição", "% do orçado medido", total com excedente sinalizado, retenção 95%, escolha do Budget: `?orc=` ou padrão declarado = `isDefault`, senão o mais recente), acumulado por padrão com recorte **opcional e rotulado**, sem Budget declara a ausência, coluna `% Ref. CEF` sai (3.5, opção 2), rodapé sem promessa.
3. **V-3 · fusão** (seção 0): componente único com abas (`?aba=nova|lancadas|relatorio`), rota de origem define a aba inicial, **permissão por aba no servidor** (aba sem permissão não é renderizada; `/medicao` sem `medicao.ver` → `AccessDenied`; engenheiro não vê orçado), lista com filtros, autor, duplicidade marcada, estados vazios distintos; menu com **um** item "Medição de Obra".
4. **V-4 · documentos e assistente** (5 e 6): anexos por medição (tipos Laudo/Relatório fotográfico/PLS/ART-RRT/Outros, versão por tipo, remover desfaz o vínculo), assistente **somente leitura** (competências sem medição, avanço fora do previsto, comparar com liberações, ler o laudo e apontar divergência, proximidade dos 95%).
5. Selo dos KPIs do Dashboard (BV-1 provisório) entra na V-2 como texto.

## Perguntas ao usuário (não bloqueiam a Parte 1)
1. **BV-1**: a Cliente Piloto tem a PLS aprovada de cada obra? O engenheiro mede por % ou por R$? → opção 1 (migrar, Parte 2) ou 2 (descontinuar e tirar os dois KPIs). Até lá: nada apagado, KPIs com selo honesto.
2. **BV-4**: o FRE / Cronograma CEF é impresso daqui ou montado em planilha?
3. **3.5**: a coluna `% Ref. CEF` sai (adotado) — ou prefere cadastrar a PLS por obra (junto com BV-1)?
4. **BV-3**: preencher autor das medições antigas a mão, a partir do log? (Nunca por script.)

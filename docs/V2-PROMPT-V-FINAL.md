# Prompt V · Medição de Obra — relatório final (seção 12)

Entregue em 5 PRs: Fase 1 (#210), V-1 (#211), V-2 (#212), V-3 (#213), V-4.
SQL de diagnóstico em `docs/sql/v2-prompt-v-diagnostico.sql`.

1. **BV-1**: **não decidido** (depende de a Cliente Piloto ter a PLS de cada obra e de
   como o engenheiro mede). **Parte 2 não executada.** Caminho não
   destrutivo: nada descontinuado, nada apagado; o selo dos dois KPIs do
   Dashboard passou a dizer "medição por serviço não está em uso" (texto,
   reversível). Pergunta ao usuário abaixo.
2. **BV-2**: base local, 0 medições fora da Atual (0 medições). Produção:
   relatório BV-2 do SQL. **Nenhuma movida**; a 1.2 impede novos casos.
2a. **BV-3**: base local, 0 medições e nenhum evento de medição no
   `audit_log` (produção: relatório BV-3). Decisão: coluna aditiva
   `created_by` (0064), preenchida dali em diante, **sem backfill**; acervo
   sem autor visível a todos como "autor não registrado". Preenchimento
   manual a partir do log = pergunta ao usuário.
2b. **BV-4**: **sem resposta**. Nenhum layout de impressão foi feito; a aba
   do Relatório **ficou** (não destrutivo); o botão virou "Imprimir página" e
   o rodapé diz o que ele faz, sem prometer o FRE.
2c. **Fusão**: tela única `MedicaoDeObra` com abas Nova medição e Medições
   lançadas (`/medicaolanc?aba=`) e Relatório CEF (`/medicao`); `/medicao`
   abre no Relatório, `/medicaolanc` em Nova medição (ou Lançadas); menu com
   **um** item "Medição de Obra" (`permAlt`/`hrefAlt`/`tambem`); as duas
   rotas continuam.
2d. **Permissão por aba no servidor**: cada página verifica a rota
   (`can(ctx.perms, "medicao"|"medicaolanc", "ver")`), `abaInicial` nunca
   devolve aba sem permissão, e cada aba só renderiza com a sua:
   ```tsx
   {aba === "nova" && can(ctx.perms, TELA_LANCAMENTO, "criar") && <AbaNova …/>}
   {aba === "lancadas" && can(ctx.perms, TELA_LANCAMENTO, "ver") && <AbaLancadas …/>}
   {aba === "relatorio" && can(ctx.perms, "medicao", "ver") && <RelatorioCef …/>}
   ```
2e. **Autoria na consulta**: `getMedicoes(tenantId, versionId, { autor })`
   aplica `or(isNull(created_by), eq(created_by, autor))` no SQL; a página
   passa `autor` para quem vê só as próprias (engenheiro). Confirmado no
   navegador: a medição do admin **não está no HTML** do engenheiro (17e); e
   no teste com banco (17d).
2f. **Nenhuma medição existente recebeu autor por script**: nenhuma PR grava
   `created_by` fora de `addMedicao`; teste 17g/17n confirma que editar uma
   medição sem autor não lhe dá autor.
3. **Texto sobre a DRE removido** de: subtítulo de `/medicaolanc`, docstring
   de `actions/medicao.ts`, docstrings de `schema.ts` (`medicao` e
   `servico`); `revalidatePath("/dre")` fora das três actions.
4. **Resolução da versão**: `addMedicao` → `getAtualVersion(tenant, projeto)`
   sem fallback (sem Atual bloqueia); `updateMedicao`/`deleteMedicao` →
   `medicaoDoTenant` junta `version` e exige tenant + projeto da empresa,
   além de `locked` e da autoria.
5. **Relatório CEF devolve os mesmos números**: a agregação orçado × medido
   por grupo é a mesma (`montarRelatorioCef` reproduz o `Map` por prefixo do
   `rowKey` e por `grupo_code`); mudaram rótulos, estados vazios, avisos e a
   escolha explícita do Orçamento. Base local: 0 linhas antes e depois.
6. **`medicao_id`** em `document` (0064, aditiva, `ON DELETE set null`);
   versão por tipo = maior versão do mesmo tipo na mesma medição + 1.
7. **Assistente**: somente leitura; cinco ações puras no servidor + leitura
   do laudo que só compara. Teste 11.16: sem IA devolve erro e `medicao` fica
   idêntica; nenhuma action do assistente escreve.
8. **BV-1 opção 2**: não aplicada (sem decisão). `medicao_servico`,
   `servico` e `calc/medicao-bdi.ts` continuam; os dois KPIs continuam, com o
   selo honesto.
9. **Antes/depois de `medicao`** (base local): 0 → 0 linhas; nenhuma mudou de
   autor (0 com autor). Produção: relatórios 17 e 17n do SQL.
10. **Migrações**: **0064** `medicao_autoria_docs` (`medicao.created_by`,
    `document.medicao_id`), com `down/0064_medicao_autoria_docs.sql`.
11. **Limitações**: sem layout de impressão (BV-4); coluna `% Ref. CEF` saiu
    até existir PLS por obra (3.5); KPIs de evolução física seguem sem dado
    até BV-1; a leitura do laudo depende de `ANTHROPIC_API_KEY` e de R2;
    "avanço fora do previsto" usa tolerância fixa de ±50%; a troca de
    situação da versão continua fora deste prompt.

## Perguntas em aberto (não bloqueiam)
1. **BV-1**: PLS por obra existe? Medir por % ou R$? → migrar (Parte 2) ou
   descontinuar (tirar os KPIs).
2. **BV-4**: o FRE é impresso daqui ou montado em planilha?
3. **3.5**: manter a coluna fora, ou cadastrar a PLS por obra junto com BV-1?
4. **BV-3**: preencher autor das medições antigas a mão, pelo log?

## Produção
Deploy aplica a 0064 (aditiva). Nada muda para quem não liga nada: o menu
passa a ter um item de medição; o engenheiro cai direto na aba dele.

# Prompt V · PR V-4 — documentos da medição e assistente somente leitura

Seções 5 e 6. Sem migração nova (a coluna `document.medicao_id` entrou na
0064, V-1). Nenhuma medição é tocada; o assistente não grava.

## Documentos da medição (5)
1. **Tipos** (5.3): Laudo de medição · Relatório fotográfico · PLS · ART/RRT ·
   Outros (`medicao-docs-regras.ts`, puro).
2. **Versão por tipo dentro da medição** (5.4): `proximaVersao` = maior
   versão já gravada DESSE tipo NESTA medição + 1. Laudo depois de laudo v1
   vira laudo v2; PLS anexada depois não herda (v1). Não repete o defeito da
   tela de Clientes.
3. **Actions** `actions/medicao-docs.ts`: `uploadMedicaoDoc` (permissão
   `medicaolanc.editar` + regra de autoria 0.5.5, tipo válido, limite
   unificado `LIMITE_UPLOAD_MB`, grava `document` com `medicao_id` e
   `project_id`, auditoria `medicao.doc.upload` com nome, chave, tipo e
   versão); `unlinkMedicaoDoc` **desfaz o vínculo** (`medicao_id = null`) —
   registro e arquivo ficam; auditoria `medicao.doc.unlink` com nome e chave
   (5.5).
4. **Tela**: na aba Medições lançadas, cada linha tem "Documentos (n)" que
   abre o painel `MedicaoDocs` (tipo + arquivo + lista com "Abrir"/"Remover",
   confirmação ao remover; sem R2 avisa). Consulta
   `getDocumentosDasMedicoes(tenantId, versionId)`.

## Assistente (6) — somente leitura
Painel `assistente-medicao.tsx` na aba do Relatório (só quem tem
`medicao.ver`: as leituras usam o orçado, que o engenheiro não vê — 0.5.6),
selo "Somente leitura", análises puras em `medicao-analise.ts`:
- **Competências sem medição**: meses da janela do projeto já decorridos sem
  nada declarado.
- **Avanço fora do previsto**: por grupo e competência decorrida, medido
  > previsto × 1,5 ou < previsto × 0,5 contra o cronograma do Orçamento
  (`getBudgetPlanning`); sem Orçamento, diz que não há com o que comparar.
- **Comparar com as liberações**: reaproveita `compararComMedicao` do
  Prompt O (par da ação de lá).
- **Ler o laudo anexado**: `lerLaudoDaMedicao(medicaoId, documentId)`
  (`actions/medicao-assistente.ts`) lê o documento do tenant vinculado à
  medição, extrai competência, grupo, % e valor (`ai/medicao-extract.ts`) e
  **compara** com o lançado na competência (`ai/medicao-doc.ts`, puro):
  grupo no laudo sem lançamento, lançamento sem laudo, valor diferente, % do
  orçado diferente, competência diferente. **Não preenche** — o painel diz
  que quem corrige é o engenheiro.
- **Proximidade da retenção**: a partir de 85% avisa quanto falta para os
  95%; atingida, diz que as liberações cessam.
**6.3**: nenhum caminho do painel ou das actions lança, altera ou exclui
medição, nem afirma percentual não declarado.

## Verificações
`medicao-analise.test.ts` (puro, 6): competências sem medição; avanço ±50%
só nas decorridas; retenção 85/95; análise completa com liberações; laudo ×
lançado (4 tipos de divergência + competência); tipos e versão por tipo.
`actions/medicao-docs.test.ts` (banco, R2 e IA simulados, 4): **11.15**
laudo v1 → v2, PLS v1, tipo inválido recusa; **5.5** remover mantém registro
e chave, auditoria com nome e chave, próxima versão continua da maior que
ficou; **0.5.5** engenheiro só nas próprias; **11.16** ler o laudo sem IA
devolve erro e `medicao` fica idêntica; sem `medicao.ver` é recusado.
Suíte: 173 arquivos / 1580. Navegador (local, admin, uma medição
temporária): "Documentos (0)" abre o painel (sem R2, avisa); painel do
assistente com selo e as 5 ações respondendo (sem medição / avanço /
liberações: "08/2026 · medição R$ 500,00" sem liberação / laudo: nenhum
anexado / retenção: sem orçado). Linha temporária apagada; `medicao` em 0.

## Arquivos
`lib/medicao-docs-regras.ts`, `lib/medicao-analise.ts` (+test),
`lib/ai/medicao-doc.ts`, `lib/ai/medicao-extract.ts`,
`actions/medicao-docs.ts` (+test), `actions/medicao-assistente.ts`,
`queries.ts` (`getDocumentosDasMedicoes`), `components/app/medicao-docs.tsx`,
`assistente-medicao.tsx`, `medicao-manager.tsx`, `medicao-obra.tsx`.

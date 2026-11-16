# Prompt K · PR K-3 — documentos anexados à conta a receber

Segunda PR de código do Prompt K (a K-2, estados e vínculo, vem depois),
conforme [`V2-PROMPT-K-FASE1.md`](./V2-PROMPT-K-FASE1.md). Seção 6 inteira.
**Nenhum registro gravado é alterado.** Migração **0047**, aditiva (uma
coluna anulável e um índice), com `down`. Não depende de decisão em aberto.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **6.1 · coluna** | `document.conta_receber_id`, anulável, `ON DELETE SET NULL` | migração 0047 e o campo no schema. Apagar a conta (cascata do projeto) desvincula o documento, não o apaga |
| **6.2 · anexar** | boleto, comprovante ou contrato, no mesmo fluxo de upload da despesa | `addContaReceberDocs`: vários arquivos, até 10 MB cada, mesmo R2 e mesma chave de armazenamento; a conta precisa existir **nesta empresa**; a obra da conta vai junto no documento. Botão "Anexos (n)" na linha abre a área com lista, "Abrir" (link assinado) e "Remover". `{ ok, error }` com mensagem na tela |
| **6.3 · remover** | não apaga o objeto no R2; auditoria com nome e chave | `deleteContaReceberDoc` tira só o vínculo; só alcança documento ligado a uma conta a receber (os de projeto, despesa e cliente têm as suas próprias actions); auditoria `document.unlink` com `documentId`, `filename`, `storageKey` e `tipo` |
| **fora de escopo** | documento fiscal de saída e NFS-e; limpeza de órfãos no R2 | intocados |

## Arquivos

- novo: `src/lib/db/migrations/0047_document_conta_receber.sql` (+ `down`),
  `src/components/app/conta-receber-docs.tsx`;
- `src/lib/db/schema.ts`, `src/lib/queries.ts` (`getDocumentsByContasReceber`),
  `src/lib/actions/contas-receber.ts`, `src/app/(app)/contasreceber/page.tsx`,
  `src/components/app/contas-receber-manager.tsx`.

## Verificação

- `contas-receber-docs.test.ts` (Postgres, R2 substituído): conta alheia,
  sem arquivo e arquivo acima de 10 MB recusam; dois arquivos anexados com
  tipo, obra herdada e auditoria; remover tira só o vínculo, o objeto fica e
  a auditoria guarda nome e chave; documento de projeto não é alvo; sem
  permissão recusa.
- Navegador: botão "Anexos" na linha abre a área; sem R2 local, aviso de
  configuração em vez do formulário.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

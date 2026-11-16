# Prompt P · PR P-5 — documentos do ativo

Quinta PR de código do Prompt P, conforme
[`V2-PROMPT-P-FASE1.md`](./V2-PROMPT-P-FASE1.md). Seção 6 (6.2–6.7) sobre a
coluna `document.permuta_id` criada na P-2. **Sem migração. Nenhum documento
existente é alterado, revinculado ou removido.**

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **6.2 · onde fica** | bloco no formulário do ativo, entre a revenda e as observações | `PermutaDocs` entra no `PermutaForm` pelo `docsSlot`, exatamente ali. Como fica dentro do `<form>` do ativo, não é um formulário próprio: tipo e arquivos ficam fora do envio do ativo (sem `name`) e vão à action por um `FormData` montado no clique. No cadastro novo o bloco diz "salve o ativo para anexar" |
| **6.3 · tipos** | Matrícula ou documento do bem · Laudo de avaliação · Contrato de permuta · Recibo · Outros | `TIPOS_DOC_PERMUTA` em `permuta-regras.ts`; mesma coluna `document.tipo` e mesmo mecanismo de versão (`document.versao`) das telas de Clientes e Projetos |
| **6.4 · versão por tipo** | mesmo tipo cria versão nova e preserva a anterior; por `(permuta_id, tipo)` | `addPermutaDocs` lê a maior versão do **mesmo ativo e tipo** e grava a seguinte; tipo diferente começa em 1 (o defeito da tela de Clientes não se repete). Vários arquivos de uma vez viram versões consecutivas |
| **6.5 · remover** | desfaz o vínculo, não apaga o arquivo; a tela diz isso; auditoria com nome e chave | `deletePermutaDoc` apaga só a linha de `document`; `permuta.doc.unlink` guarda `documentId`, `filename`, `storageKey`, `tipo`, `versao`. A tela avisa antes e depois |
| **6.6 · validação** | tipo obrigatório, tamanho máximo na interface, mensagem legível | tipo da lista, até 10 MB por arquivo (limite escrito no rótulo), `{ ok, error }` com `role="status"` |
| **6.7 · permissão** | anexar e remover pela permissão de editar, no servidor; documento só visível a quem vê o ativo | `can(perms, "permuta", "editar")` nas duas actions; a lista de documentos é montada só na página de edição, que já exige `ver` (e `editar`); link assinado do R2 por documento |

## Arquivos

- `src/lib/permuta-regras.ts` — `TIPOS_DOC_PERMUTA`.
- `src/lib/queries.ts` — `getDocumentsByPermuta`.
- `src/lib/actions/receitas.ts` — `addPermutaDocs`, `deletePermutaDoc`.
- `src/components/app/permuta-docs.tsx` (novo); `permuta-form.tsx` (`docsSlot`); `permuta/[id]/page.tsx`.
- `src/lib/actions/permuta-docs.test.ts` (novo, 3 casos com banco, R2 substituído).

## Verificação

- Testes: tipo fora da lista, sem arquivo, 11 MB, ativo inexistente e sem permissão recusam sem gravar nem enviar; contrato v1 → v2, recibo v1, dois laudos v1/v2 (teste 16 e 17); obra e unidade vão no documento; remover tira só a linha, registra nome/chave/tipo/versão, não alcança documento de outra empresa, e a próxima versão continua de onde parou (teste 18).
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): sem R2 configurado a tela mostra o aviso das variáveis e a lista; o bloco aparece entre a revenda e as observações.

## Fica para depois

- P-6 assistente (7.3 lançar por descrição, 7.5 análises; 7.4 leitura de documento espera A/B/C).
- Limpeza de objetos órfãos no R2: tarefa própria, comum a todas as telas com anexo.

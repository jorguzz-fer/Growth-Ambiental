# Prompt J · PR J-2 — actions com retorno legível e auditoria completa

Segunda PR de código do Prompt J, conforme
[`V2-PROMPT-J-FASE1.md`](./V2-PROMPT-J-FASE1.md). Seções 5.1 e 5.2.
**Nenhum registro gravado é alterado. Sem migração.** Pré-condição da
seção 6 (assistente), pela condição 1 de BJ-3.

## O que muda

| | Antes | Agora |
|---|---|---|
| **5.1 · `saveUnit`** | lançava erro (em produção chega como digest sem texto) e terminava em `redirect` dentro da action; salvar sem retorno visível | devolve `{ ok: true, id, code }` ou `{ ok: false, error }`. A tela navega e a lista mostra **"Unidade X salva."** Novas recusas legíveis: valor negativo ou inválido; **edição de id inexistente ou de outra empresa** (antes "salvava" sem tocar em nada) |
| **5.1 · `importUnits`** | lançava erro; devolvia `{ inserted }` | `{ ok: true, inseridas }` ou `{ ok: false, error }`; a mensagem chega inteira à pré-visualização |
| **5.1 · exclusão** | já devolvia `{ ok, error }` (PR I-3); o sucesso na lista só sumia a linha | a lista mostra **"Unidade X excluída."** |
| **5.2 · auditoria da exclusão** | código, valor, status, obra, versão | **+ o plano de pagamento removido** — é o que se perde |
| **auditoria da gravação** | só código (criação) ou código e status (edição) | + `origem`: `formulario` hoje; `assistente` quando a proposta da IA for confirmada (J-5, regra 4.2.3 do Prompt E). A origem vem do formulário e é só rastro, não permissão |

## Arquivos

- `src/lib/actions/units.ts` (`saveUnit`, `importUnits`, `deleteUnit`);
- `src/components/app/unit-form.tsx`, `unit-actions.tsx`,
  `unidades-import-export.tsx`; `src/app/(app)/unidades/page.tsx` (aviso).

## Verificação

- `unidades-actions.test.ts` (Postgres): sem projeto, valor negativo, sem
  permissão e versão congelada devolvem erro e **nada é gravado**; gravação
  devolve id e código, com `origem` na auditoria; id inexistente devolve "não
  encontrada"; importação conta as inseridas e recusa congelada; exclusão
  guarda o plano na auditoria.
- Navegador: salvar pelo formulário leva à lista com "Unidade X salva.";
  excluir pela lista mostra "Unidade X excluída."; sem permissão, a mensagem
  aparece no formulário.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

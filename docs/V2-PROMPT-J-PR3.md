# Prompt J · PR J-3 — importação atualiza em vez de duplicar; código único por versão

Terceira PR de código do Prompt J, conforme
[`V2-PROMPT-J-FASE1.md`](./V2-PROMPT-J-FASE1.md). Seções 4.1–4.4 e BJ-2.
**Nenhum registro gravado é alterado.** Migração **0046**, aditiva (um índice),
com `down`.

## O que muda

| | Antes | Agora |
|---|---|---|
| **4.1 · duplicação** | `importUnits` só inseria; a única proteção era a pré-visualização no navegador marcar "já existe" como erro. A action aceitava qualquer lista e o banco não tinha trava | a action decide por **(versão, código)**: existe → **atualiza**; não existe → insere. Numa transação, com as unidades da versão travadas (`FOR UPDATE`). Índice único `unit (version_id, code)` (0046) |
| **4.2 · o que a atualização toca** | — (não atualizava) | só **bloco, tipo, m², andar, valor e status**, e só o que veio **preenchido**: célula vazia não apaga o gravado. **Nunca** `payment_plan` (a inserção grava `emptyPlan()`; a atualização não passa perto dele), nem `mes_venda`, nem `item_type` |
| **4.3 · versão bloqueada** | já recusava (PR I-3) | igual, com `{ ok, error }` |
| **4.4 · relatório** | só a contagem de inseridas | `{ inseridas, atualizadas, ignoradas: [{ code, motivo }] }`; a tela mostra o resumo e a lista das ignoradas. A auditoria `unit.import` guarda os códigos inseridos, e das atualizadas o **antes e depois** de cada campo tocado |
| **pré-visualização** | "já existe" era erro | mostra **Nova / Atualizar** por linha; avisa (sem impedir) quando muda o status de uma unidade **vendida**; recusa código que só difere na **caixa** de um existente ou de outra linha da planilha ("A" × "a"), porque a trava do banco os trata como dois; aceita `Permutado` (como o formulário) |
| **BJ-2 · migração 0046** | — | `DO` que **lista as repetidas e para** (`RAISE EXCEPTION`), sem apagar nada; só cria o índice quando não há nenhuma. Testada com uma repetição simulada em transação revertida: reportou `"UNID 401" × 2` e não criou o índice |

## Casamento do código

Exato depois de `trim`, como a trava do banco compara. Unidade gravada como
`"101 "` (com espaço) casa com `101` da planilha e é atualizada, não
duplicada. Maiúsculas diferentes são unidades diferentes para o banco; por
isso a pré-visualização barra.

## Conflito a decidir (com recomendação)

A regra "nada pode quebrar" e a 4.1 ("se a migração falhar por duplicidade,
ela reporta e para") se encontram no boot: `docker-entrypoint.sh` roda as
migrações com `set -e` antes de subir o servidor. Se em produção houver uma
unidade repetida na hora do deploy, **o container novo não sobe** (o log traz a
lista). Alternativa seria a migração só avisar e seguir sem o índice — mas o
migrator silencia avisos, e a trava ficaria faltando sem ninguém saber.

**Recomendo** manter como está (para e reporta), com a consulta 2 de
`docs/sql/v2-prompt-j-diagnostico.sql` rodada em produção **logo antes** de
mergear. Em 30/09 veio vazia, e desde a PR I-3 a pré-visualização já barra
repetição pela tela.

## Arquivos

- novo: `src/lib/unidade-importacao.ts` (regras puras + teste);
- `src/lib/actions/units.ts` (`importUnits`);
- `src/components/app/unidades-import-export.tsx`;
- `src/lib/db/schema.ts` (índice), `migrations/0046_unit_codigo_unico.sql`,
  `migrations/down/0046_unit_codigo_unico.sql`, `meta/_journal.json`.

## Verificação

- `unidade-importacao.test.ts` (puro): ignoradas com motivo (sem código,
  repetida na planilha, status/valor/m² inválidos); caixa exata; o patch só
  leva o preenchido e nunca plano ou data.
- `unidades-importacao.test.ts` (Postgres): reimportar a mesma planilha →
  0 inseridas, 2 atualizadas, contagem e soma iguais; unidade vendida pelo
  formulário e depois reimportada só com valor → plano, data da venda, status
  e tipo de cadastro intactos; congelada recusa sem gravar; o índice recusa o
  segundo `101` na versão e aceita em outra versão.
- **Antes/depois** local (consulta 1 do SQL): 2 unidades, [valor removido]
  antes e depois.
- Navegador (base local, linhas de teste removidas ao fim): planilha com uma
  unidade nova e uma existente (vendida, com plano) → pré-visualização "Nova /
  Atualizar", importa, mensagem "2 inserida(s), 1 atualizada(s)"; a existente
  ganhou o valor e o bloco da planilha e manteve status, tipo e plano.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

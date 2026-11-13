# Prompt AJ — Gestão de Acessos · relatório (Partes 1, 2 e 3)

Com a Parte 4 inteira (validação no servidor), porque a action foi reescrita de
qualquer jeito, e a 7.1 (log com `changes`). O restante (5, 6, 7.2, 8) fica para
o Bloco 5.

## §13 do prompt, item a item

**1. BAJ-1 — o que causou o relato.** Em produção, **nenhum membro estava
sem override**: todos já tinham salvado a matriz. O caminho é o **salvamento total**
(Parte 2), não o default sozinho. Havia membro com as 38 chaves, com Usuários e
Gestão de Acessos concedidos. Detalhe em `V2-BLOCO0-BLOQUEIOS.md` §5.

**2. BAJ-2:** opção 2 — o membro alcança **Despesas, Contas a Pagar,
Fornecedores, Caixa, Contas Correntes, Medição (relatório e lançamento),
Clientes, Unidades, Contas a Receber e Permuta**, com ver, criar e editar.
Excluir fica com owner e admin. `MEMBRO_TELAS` em `permissions.ts`.

**3. BAJ-3:** ajustar o `membro`, sem papel novo.

**4. A prévia (1.4)** — a tela Gestão de Acessos mostra, com a chave desligada,
o que cada membro perde ao ligar. Com os overrides de produção do cliente
anterior, o efeito foi pequeno (os membros listados perdiam só Backup e Ponto —
ver, criar, editar) [dado de produção removido], porque as demais telas de cada
um já estavam gravadas no override e continuam valendo. Membros novos, convidados depois, nascem no padrão novo.

**A chave** — o app não tem mecanismo de chave por tenant (B4). Até ter, é a
variável de ambiente `MEMBRO_PADRAO_RESTRITO`: ids de tenant separados por
vírgula, ou `*` para todos. **Ausente = desligada = comportamento de antes.**
Sem migração.

**5. O "Salvar" grava diff** — `overridesDivergentes(role, matriz, opts)`:
grava a tela só se ela **difere do padrão em vigor**. Enquanto convivem dois
padrões do membro, grava também **uma negação que o outro padrão concederia**
(senão, salvar "DRE negada" com a chave ligada e depois desligar devolveria a
DRE). Uma concessão igual ao padrão antigo **não** é gravada: ela some ao ligar
a chave, que é o efeito aprovado na prévia.

Um primeiro desenho gravava "tudo o que difere de qualquer dos dois padrões". O
teste no navegador mostrou que isso **congelava** o padrão antigo em quem salvasse
a matriz com a chave desligada, e a Parte 1 nunca o alcançaria. Corrigido antes
do PR, com teste que prova as duas direções.

**6. Membros com as 38 chaves:** nada foi apagado. A tela mostra, por membro,
quantas telas estão personalizadas e oferece **"Voltar ao padrão do papel"**,
por membro, com confirmação e log (`membership.permissions.reset`, com a matriz
descartada no `meta`). Chaves órfãs ficam.

**7. O clamp** — último passo de `effectivePermissions`, **depois** do merge:
owner e admin recebem `FULL` em tudo (mesmo com override restritivo gravado);
os demais papéis recebem `NONE` em Usuários e Gestão de Acessos (mesmo com
override). Na matriz, admin passa a aparecer como "acesso total" (como o owner),
e as duas telas aparecem desabilitadas com o motivo.

**8. Guarda de auto-edição** — `setMemberPermissions` e
`resetMemberPermissions` recusam `userId === ctx.userId`. A action também recusa
alvo owner/admin (não há o que configurar).

**9. Validações da Parte 4** (`validarMatriz`): tela fora de `SCREENS`, ação
desconhecida, valor não booleano, criar/editar/excluir sem ver, e concessão de
Usuários/Acessos por override → recusados. A action devolve `{ ok, error }`, e a
tela só mostra "Salvo." quando gravou.

**11. `/acerto` e `/diagnostico/*`** — Parte 6, Bloco 5. Continuam governados
por `despesas` e `unidades`; com a chave ligada, o membro os alcança por essas
telas.

**12. Antes e depois, célula a célula** — `permissions-aj.test.ts` tem a lógica
antiga como oráculo e confere, para os 5 papéis × 5 formatos de override
encontrados em produção × chave ligada/desligada: **nenhuma célula vai de negada
para permitida**. A única exceção é declarada: owner/admin com override
restritivo voltam ao total. Em produção **nenhum owner/admin tem override**, então
a exceção não alcança ninguém. Com a chave desligada, tudo é idêntico a antes,
exceto Usuários/Acessos para quem não é owner/admin.

**13. Nenhum override foi apagado.** Nenhuma migração, nenhum script sobre
`membership`. Um override só muda quando alguém salva a matriz ou clica em
"voltar ao padrão", e ambos ficam no log.

**14. Comentário de `sidebar.tsx:17`** — já tinha saído com o Prompt C (o menu
foi para `nav-menu.ts`, sem a afirmação errada).

**16. Limitações**
- Um membro da Construtora Piloto que hoje tem Usuários e Gestão de Acessos por
  override perde essas telas no deploy. Decisão: **promover a admin antes do
  merge** (tela Usuários, na Construtora Piloto).
- A matriz ainda desenha as 61 caixas mortas (Parte 5) e o log não está na mesma
  transação do update (7.2).
- O agente de WhatsApp (`/api/agent`) passa pelo mesmo `effectivePermissions`,
  então herda o clamp e a chave.

## Verificação

- `permissions-aj.test.ts` (82 testes): oráculo antigo × novo, padrão novo,
  diff, clamp e validação. Suíte inteira: 699 passando.
- Navegador, build de produção + Postgres local:
  - prévia listando o que cada membro perde;
  - admin como "acesso total";
  - Usuários/Acessos desabilitadas com o motivo;
  - salvar grava só as telas alteradas e preserva a chave órfã `rolling`;
  - "voltar ao padrão" descarta e registra no log;
  - com a chave ligada, o membro sem override vê só as telas decididas, e
    `/dre` e `/usuarios` negam acesso.

## Atualização — Prompt AL (01/10/2026)

- O contador **deixa de ser exceção**: é um papel configurável como os
  outros. O padrão do papel (as oito telas de `CONTADOR_VE`) é o ponto de
  partida, e owner ou admin ajustam por membro nesta tela.
- O contador tem **teto de leitura**: `criar`, `editar` e `excluir` são
  negados no último passo de `effectivePermissions`, depois do merge, como o
  clamp desta tarefa.
- A tela `contabilidade` saiu de `SCREENS`: a matriz passa de **38 para 37
  telas**. Override gravado com essa chave fica no banco, inerte.

## Atualização — Prompt AP (01/10/2026)

- A tela `versao` saiu de `SCREENS`.
- Entrou `versaotrava`, permissão de ação que nasce só com owner e admin.
- Com a `conferencia` do Prompt AN, a contagem fica em **37 telas**:

| Mudança | Contagem |
|---|---|
| Base do Prompt AJ | 38 |
| Prompt AL: sai `contabilidade` | 37 |
| Prompt AN: entra `conferencia` | 38 |
| Prompt AP: sai `versao`, entra `versaotrava` | 37 |

Overrides gravados com a chave `versao` ficam no banco, inertes.

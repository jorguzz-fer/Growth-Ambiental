# Prompt PLAT · Chaves e Backup só na plataforma — relatório final

Fase 3, Bloco 0. Executado em 18/10/2026. Fonte: revisão V5, Configurações
("deixar à vista só pra eu ou você"; "não deixaria o backup exposto pra
ninguém").

## O que mudou

- **`TELAS_SO_PLATAFORMA`** (`permissions.ts`): `chaves` e `backup`. O
  padrão de todo papel é negado, inclusive owner e admin, e o clamp final de
  `effectivePermissions` nega mesmo com override. Só quem é operador da
  plataforma (`isSuperAdmin` por e-mail, `tenant/superadmin.ts`) alcança, em
  qualquer empresa em que esteja como membro.
- **`getTenantContext`** passa `operadorDaPlataforma`. A API do agente não
  passa: quem entra por chave de API nunca alcança essas telas.
- **Gestão de Acessos:** as duas telas somem da matriz; `validarMatriz`
  recusa override nelas.
- **Aviso de backup semestral** saiu do topo do app. O componente
  `backup-reminder.tsx` foi apagado; `hasPendingSemesterBackup` continua em
  `backup.ts` (testado) para uso da plataforma.
- **Prévias das chaves** em Contas a Pagar e Ressarcimentos já dependiam de
  `chaves.ver`: passam a aparecer só para a plataforma.
- **Base de conhecimento do assistente:** "quem acessa" e "como ligar" agora
  dizem que é a plataforma.

## Acesso

Reduz acesso de owner e admin em duas telas; não amplia nada. Os testes que
afirmavam acesso total do owner a toda tela passaram a excluir essas duas,
com o motivo no comentário, e `permissions-plat.test.ts` cobre a regra nova.

## Pendente (BPLAT-1)

Como o dono pede o backup: hoje, por contato com a plataforma. Um operador
precisa estar como membro da empresa para abrir a tela de Backup dela. Se a
plataforma quiser operar sem ser membro, o console `/plataforma` ganha a
lista por empresa num prompt futuro.

## Testes

`npm run typecheck`, `npm run lint` e `npm test` sem falha (136 arquivos,
1434 testes; 78 arquivos pulados por exigirem banco).

## Revisão em 26/10/2026 (Prompt AO, BAO-2)

O dono decidiu **abrir o Backup para proprietário e administrador**. A
pergunta e a resposta estão em `V2-PROMPT-AO-PR3.md`.

- `backup` saiu de `TELAS_SO_PLATAFORMA` e entrou em `TELAS_SENSIVEIS`: nasce
  só com proprietário e administrador e pode ser concedido a outra pessoa na
  Gestão de Acessos.
- O operador da plataforma continua alcançando o Backup em qualquer papel
  (`OPERADOR_SEMPRE_ALCANCA`).
- **Chaves de mudança continuam só da plataforma.**
- O aviso de backup no topo do app **não voltou**.

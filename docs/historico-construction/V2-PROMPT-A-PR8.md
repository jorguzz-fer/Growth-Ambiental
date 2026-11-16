# Prompt A · PR 8 — Versões e Ponto

Fecha o Planejamento. Depois desta PR, **nenhuma tela de lançamento depende do
projeto ativo**. Faltam os relatórios, que só leem dados, e a PR final.

## Configuração da Versão (`/versao`) e downloads

| | Antes | Agora |
|---|---|---|
| Qual obra | a do cookie | `?proj=` ou memória da aba; com só `?v=`, a obra **da própria versão**; seletor na tela |
| `?v=` de outra obra | caía na versão do cookie (outra obra, sem aviso) | a versão, se for do tenant |
| Exportar dados (`/versao/export`) | `?v=` fora da obra do cookie → exportava a versão do cookie; INCC **da obra do cookie** | `?v=` obrigatório e validado; INCC da obra da versão |
| Planilha modelo (`/versao/template`) | idem | idem |

O link "crie a versão Atual em Versões" de Despesas passa a levar a obra.

## Ações de versão

Antes, todas exigiam que a versão fosse da **obra do cookie**. Editar pela tela
uma versão de outra obra falhava em silêncio. Agora a obra sai da própria
versão, validada no tenant (`getVersionContext`):

| Action | Mudança |
|---|---|
| `duplicateVersion` | a cópia nasce na obra da versão de origem; o limite de 6 e a cor contam as versões **dessa** obra |
| `updateVersion`, `toggleVersionLock` | qualquer versão do tenant |
| `setDefaultVersion` | desmarca as outras versões **da obra da versão** (e o `where` ganhou o tenant) |
| `deleteVersion` | qualquer versão customizada do tenant |
| `importVersionData` | versão obrigatória e validada; o **INCC importado vai para a obra da versão**. Antes ia para a obra do cookie, o que só era seguro porque a versão também precisava ser do cookie |

## Ponto

`/ponto` já era multiobra e não usava o projeto ativo. Ele e `ponto.ts` só
passaram a usar `getTenantContext`.

## Verificação

- `versoes-projeto-explicito.test.ts` (Postgres, com `getActiveContext`
  proibido):
  - a obra sai da versão;
  - versão de outro tenant retorna nulo;
  - é possível editar versão de outra obra do tenant;
  - não é possível editar versão de outro tenant;
  - o padrão só muda na obra da versão, e o log registra a obra certa;
  - a duplicata nasce na obra certa;
  - duplicar ou excluir versão de outro tenant é recusado.
- Suíte inteira: 857 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador (build de produção):
  1. `/versao` em aba nova pede a escolha;
  2. escolhida a obra, mostra a versão de trabalho dela;
  3. a exportação baixa o `.xlsx`;
  4. versão inexistente e modelo sem `?v=` → 404;
  5. `/ponto` abre;
  6. nenhum erro de JavaScript.

## O que falta

- **Relatórios** (Dashboard, DRE, Fluxo de Caixa, Consolidado, Resumo,
  Projeção, Contabilidade): só leem dados, mas usam o projeto ativo como
  padrão. Antes de migrá-los: decidir o escopo **Todos / Ativos / Finalizados
  / Obra**, e se os escritórios entram nos consolidados (seção 17).
- **PR final**:
  - trocar as chamadas restantes de `getActiveContext` que só usam empresa e
    permissões;
  - remover `setActiveProject`, `setActiveVersion`, os cookies e o botão
    "Selecionar" de Projetos.

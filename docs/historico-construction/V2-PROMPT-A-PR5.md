# Prompt A · PR 5 — Receitas (parte 1): Unidades, Permuta e Liberações de Obra

Terceiro módulo, dividido em duas PRs para ficar revisável. Esta PR cobre
Unidades, Permuta e Liberações de Obra (`/reembolso`). **Ressarcimentos**
(`restituicoes`, `restituicao-lote`, `recebimento-terceiro`) vem na próxima.

Mesmo padrão das PRs 3 e 4: a obra vem da URL (`?proj=`), e cada aba lembra a
última escolhida (B-A2). Sem obra, a aba reabre a lembrada ou a tela pede a
escolha. O pedido de escolha virou componente próprio, `PedirProjeto`.

## Telas

| Tela | Antes | Agora |
|---|---|---|
| Unidades | `?proj=` ou **primeira obra** | `?proj=` ou memória da aba; senão pede |
| Nova Unidade | obra do link ou **primeira obra** marcada | obra do link; sem ela, formulário **sem obra marcada** e exige a escolha |
| Editar Unidade | obra da unidade (fallback para a primeira) | obra da unidade (sem fallback) |
| Permuta, Liberações de Obra | **sem seletor**; obra do cookie | seletor na tela + memória por aba |
| Novo ativo / Nova liberação | versão do cookie | obra do link (`?proj=`), enviada no formulário |
| Clientes (ficha e novo) | subtítulo com o nome da **obra do cookie** | nome da empresa (cliente é da empresa, não de uma obra) |

## Gravações

| Action | Antes | Agora |
|---|---|---|
| `saveUnit` | sem obra no formulário, caía na obra do cookie. **Na edição, isso movia a unidade para aquela obra** | obra obrigatória; volta para a lista da obra |
| `importUnits` | sem obra, a do cookie | obra obrigatória |
| `addReembolso`, `addPermuta` | versão do cookie | versão de trabalho da obra do formulário, validada na empresa; volta para a lista da obra |

**O que ficou igual de propósito:** `addReembolso` e `addPermuta` nunca
checaram versão congelada, e continuam sem checar. Isso é regra de negócio e
não entra nesta refatoração. Fica registrado como pendência.

## Verificação

- `receitas-projeto-explicito.test.ts` (Postgres, com `getActiveContext`
  proibido):
  - unidade gravada na obra escolhida;
  - sem obra, recusa;
  - **na edição sem obra, a unidade não se move**;
  - obra de outra empresa recusada;
  - importação exige obra;
  - liberação e permuta gravadas na obra do formulário, e recusadas sem obra
    ou com obra alheia.
- `ak-parte1.test.ts` ajustado: os formulários de liberação e permuta agora
  levam a obra.
- Suíte inteira: 839 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador (build de produção):
  1. as três telas, em aba nova, pedem a escolha;
  2. depois de escolher a OBRA 7 em Unidades, Permuta e Liberações abrem nela;
  3. uma liberação salva pela tela foi gravada na OBRA 7 (conferido no banco),
     e a tela voltou à lista da OBRA 7 mostrando o lançamento;
  4. a ficha de cliente mostra a empresa.

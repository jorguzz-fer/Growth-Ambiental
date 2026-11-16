# Prompt M, Parte 1 — permissões aplicadas em toda página · relatório

## O furo, confirmado em produção-igual (build + Postgres local)

Logado como **contador** (sem acesso a Clientes na matriz):

| Caminho | Antes | Depois |
|---|---|---|
| URL direta `/clientes` | tela "Acesso negado", **mas o nome do comprador ia no HTML** | negado, nada no HTML |
| Navegação dentro do app até `/clientes` | **ficha inteira na tela, com nome e CPF** | negado |

**Causa.** No App Router, o layout renderiza **em paralelo** com a página (o
dado da página já tinha sido consultado e serializado) e **não roda de novo** na
navegação dentro do app. A guarda central do layout (`screenIdOfPath`) só
escondia a página; não impedia a consulta nem o envio.

## A correção (2.2 e 2.3)

A varredura de todas as páginas de `(app)` achou **31 sem verificação própria**
(o prompt conhecia 3). Todas passam a fazer, logo depois de obter o contexto e
**antes de qualquer consulta**:

```ts
if (!can(ctx.perms, "<tela>", "ver")) return <AccessDenied />;
```

Só nega o que a matriz já nega: nenhuma permissão mudou. Conferido no navegador
— admin continua vendo tudo; contador vê DRE, Fluxo, Auditoria e Despesas e é
negado em Clientes e Unidades, exatamente como a matriz.

A guarda do layout fica (é o que mostra "Acesso negado" no menu/URL), mas deixou
de ser a única barreira.

**Teste de regressão** — `paginas-permissao.test.ts` varre toda `page.tsx` de
`(app)` e falha se alguma não verificar "ver" (ou "editar") da sua tela, ou se
consultar dado antes da verificação. Provado removendo a guarda de `/clientes`:
o teste quebra.

Rotas de download (`backup/download`, `lancamento/export`, `versao/export`,
`versao/template`) e a API do agente (`requireScreen`) já verificavam.

## BM-1 — `acerto` e `diagnostico`

Verificado: **nem bloqueadas para todos, nem abertas.** As páginas checam a
permissão de outra tela — Acerto exige `despesas:editar` + `caixa:ver`; as
conferências, `despesas:ver` e `unidades:ver`. Ficam fora de `SCREENS` por ora:
incluí-las muda o padrão de todo mundo (nota do BM-1) e é a Parte 6 do AJ. O
teste declara esse mapeamento em `PERMISSAO_DE`.

Detalhe notado: o menu mostra "Acerto Contábil" a quem tem `despesas:ver`, mas a
página exige `editar` — o contador vê o item e recebe "Acesso negado". Não é
vazamento; fica para o prompt da tela.

## BM-2 — engenheiro

Sem mudança: a matriz dá a ele só `medicaolanc`, que é o que o prompt diz ser o
caso "nada muda". Se ele também deve ver o relatório `/medicao`, é decisão sua.

## Seção 4 — `/contabilidade`

A tela passa a dizer de qual **projeto** e **versão** são os três números ("não é
o consolidado da empresa"). A troca por seleção explícita é do Prompt A.

**Nota — o log para o contador:** o `/acoes` mostra metadado e o `de → para` dos
campos; os campos pessoais de comprador já saem mascarados para quem não é
owner/admin (decisão 3.8, `audit-mask.ts`).

## Atualização — Prompt AL (01/10/2026)

A seção 4 perdeu o objeto: a tela `/contabilidade` saiu do sistema. O defeito
de contexto global que ela tinha saiu junto com ela. Os três números existem
na DRE.

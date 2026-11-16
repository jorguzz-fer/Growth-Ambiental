# Prompt A · PR 2 — contexto só de empresa e resolução explícita

Seções 10 a 14 e 38. **Nenhuma tela muda de comportamento nesta PR.** Ela cria
as peças que as próximas (uma por módulo) vão usar. `getActiveContext()` segue
funcionando, idêntico, marcado como depreciado.

## O que entra

| Peça | Onde | O que faz |
|---|---|---|
| `getTenantContext()` | `lib/context.ts` | usuário, tenant, papel, permissões e a lista de projetos. **Não escolhe projeto**, não lê cookie e, ao contrário do antigo, não exige que o tenant tenha projeto |
| `getProjectContext(tenantId, projectId)` | `lib/context.ts` | o projeto, **só** se for do tenant. Tenant obrigatório na assinatura (seção 11): esquecê-lo é erro de compilação |
| `getProjectVersion(tenantId, projectId, { id } \| { kind })` | `lib/context.ts` | a versão, validando tenant → projeto → versão (seção 13). Nunca cai em outra versão nem em outro tipo |
| `ordenarProjetos` | `lib/projeto-selecao.ts` | obras pelo número do nome ("OBRA 3" antes de "OBRA 28"), depois alfabética; **escritórios/filiais em grupo próprio, no fim** (seção 10) |
| `lerSelecaoDeProjeto` | `lib/projeto-selecao.ts` | lê `?proj=` (ou `?project=`). Sem escolha ou com id que não é do tenant: **"nenhum" — nunca o primeiro projeto** (seção 12) |

As permissões vêm do mesmo código que já alimentava `getActiveContext` (a
resolução de sessão foi extraída, não reescrita). O teste confere que as duas
funções devolvem a mesma matriz para owner e contador (seção 39).

## Decisões desta etapa

- **Parâmetro `?proj=`** (seção 22) — já é o nome usado em cinco telas; `?project=`
  vale como sinônimo. Registrado em `V2-BLOQUEIOS.md`, B10.
- **`getActiveContext` mantém a ordem de criação.** A ordem nova só chega a cada
  tela quando ela migrar. Reordenar aqui mudaria, sem aviso, a obra que as telas
  ainda não migradas abrem por padrão (`projects[0]`).

## Achado — cookie de versão (seção 14)

A pergunta do prompt era se um cookie de versão apontando para versão de outro
projeto produz tela incoerente. **Não produz: ninguém lê esse cookie.** Desde
que a versão de trabalho passou a ser sempre a "Atual", `getActiveContext` ignora
`gtc_version`, e `setActiveVersion` não tem nenhuma chamada. Os dois ficam
marcados como depreciados e saem na PR final, com o cookie de projeto. Não há o
que diagnosticar em produção.

## Correção de passagem — seção 38

`updateProject`, `deleteProject` e `updateObraLocation` (Ponto) gravavam em
`project` só pelo id. Não vazavam, porque há guarda em memória antes, mas eram
as únicas exceções ao padrão. Agora o `where` também filtra o tenant; a guarda
continua. O teste simula a guarda falhando e confirma que o projeto de outra
empresa não é alterado (e falha sem a correção).

## Verificação

- `projeto-selecao.test.ts` (11) e `contexto-tenant.test.ts` (13, Postgres):
  ordem com escritórios agrupados; sem escolha, nenhum projeto; id de outro
  tenant recusado (teste 21 do prompt); versão de outro projeto recusada (teste
  20); tipo ausente não cai em outro; cookie não influi no contexto novo;
  permissões idênticas; `getActiveContext` idêntico ao de antes, inclusive
  ignorando cookie com projeto de outra empresa.
- Suíte inteira: 818 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador (build de produção): Despesas, Projetos, Dashboard, Caixa, DRE,
  Fluxo, Unidades e Budget abrem como antes.

## O que falta (próximas PRs)

1. **Despesas** — tela e gravação com obra explícita, sem `projects[0]` nem
   `ctx.project`, e a memória por aba (B-A2).
2. Caixa → Receitas → Planejamento → relatórios, um por PR. O escopo
   `todos / ativos / finalizados / específico` (seção 17) entra com os
   relatórios. Antes disso, levantar como cada consolidado trata hoje os
   escritórios e pedir a decisão: entram ou não nos consolidados (seção 17).
3. PR final — remover `setActiveProject`, `setActiveVersion`, os dois cookies,
   `SelectActive` e `getActiveContext`.

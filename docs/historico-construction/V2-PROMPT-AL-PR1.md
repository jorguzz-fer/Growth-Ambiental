# Prompt AL · AL-1 — a tela Acesso Contabilidade sai

Parte 1 do Prompt AL. Decisão BAL-3 adotada: **redirecionar para `/usuarios`
com aviso de uma linha.**

## O que mudou

- **Redirecionamento.** `/contabilidade` e qualquer subcaminho vão para
  `/usuarios?de=contabilidade`, em `next.config.ts`. É um 307: o navegador não
  grava o desvio, e dá para voltar atrás sem cache preso.
- **Aviso.** A tela Usuários mostra uma linha quando chega por esse caminho:
  "A tela Acesso Contabilidade saiu. Convide o contador aqui, com o papel
  “contador”; o que ele vê se ajusta em Gestão de Acessos." O texto mora em
  `src/lib/telas-removidas.ts`, que o Prompt AB pode reaproveitar.
- **Arquivos removidos:**
  - `src/app/(app)/contabilidade/page.tsx`, a página inteira.
  - A action `inviteContador` em `src/lib/actions/users.ts`. Só essa tela a
    usava. A função `invite`, que Usuários usa, **não foi tocada**.
  - O `revalidatePath("/contabilidade")` dentro de `invite`.
  - O item "Acesso do contador" do menu.
  - O id `contabilidade` de `SCREENS`. A matriz passa de 38 para 37 telas.
- **Componentes compartilhados encontrados:** `ProjectPicker`,
  `LembrarProjeto`, `RecuperarProjeto`, `FormComResultado`, `PageHeader`,
  `AccessDenied` e os de `ui/`. Todos ficam.

## Por que a rota não fica sem enforcement

Sem o id em `SCREENS`, `screenIdOfPath("/contabilidade")` devolve `null`. Isso
só seria furo se a página continuasse existindo. Ela não existe mais. O
redirecionamento acontece antes de qualquer página, e o destino `/usuarios`
tem a própria guarda. Antes da remoção só owner e admin abriam a tela, e os
dois abrem Usuários.

## Varredura (1.6)

Busca por `/contabilidade`, `"contabilidade"` e `inviteContador` em `src/`:

| Onde | O que era | Hoje |
|---|---|---|
| `nav-menu.ts` | item de menu | removido |
| `permissions.ts` | id em `SCREENS` | removido, com comentário |
| `actions/users.ts` | `revalidatePath` e `inviteContador` | removidos |
| `nav-menu.test.ts` | referência do menu antigo | mantida como histórico; a tela sai do esperado |
| `CONTADOR_VE` | não tinha a tela | nada a mudar |

As demais ocorrências da palavra "contabilidade" no código são texto de
negócio, como "confirme com a contabilidade", e não apontam para a tela.

## Dados

- Nenhum usuário, vínculo, papel ou override foi alterado.
- Override gravado com a chave `contabilidade` fica no banco, inerte. O
  teste confirma que ele não muda nenhuma célula efetiva.
- Nenhuma migração.

## Documentos atualizados (seção 5)

`V2-PROMPT-C.md`, `V2-M-PARTE1.md`, `V2-AJ.md` e `V2-AK-AI.md` ganharam uma
nota "Atualização — Prompt AL". `CONTINUAR-REVISAO.md` e `ROTEIRO-REVISAO.md`
não existem no repositório.

## Testes

`src/lib/telas-removidas.test.ts` cobre os testes 1 a 5 da seção 9 e o 8.2.
`nav-menu.test.ts` passou a esperar o menu sem a tela.

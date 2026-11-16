# Prompt A · PR 12 (final) — o projeto ativo global deixa de existir

Última PR da sequência (B-A1). **Remove** o mecanismo, que já estava sem uso
funcional desde a PR 11.

## O que sai

| Item | Onde estava |
|---|---|
| `getActiveContext()` e o tipo `ActiveContext` | `lib/context.ts`. As 39 chamadas que restavam só usavam empresa, papel e permissões, e passaram para `getTenantContext()` |
| `setActiveProject`, `setActiveVersion` | `lib/actions/context.ts` (arquivo removido) |
| `ACTIVE_PROJECT_COOKIE` (`gtc_project`), `ACTIVE_VERSION_COOKIE` (`gtc_version`) | `lib/context.ts`, `actions/projects.ts` |
| Criar projeto gravava o cookie | `createProject` — seção 9 |
| Excluir projeto limpava o cookie | `deleteProject` — seção 34 |
| Botão "Selecionar", selo "selecionado", `SelectActive`, `activeId` | tela Projetos (`project-manager.tsx`, `projeto/page.tsx`) — seção 8 |
| `ProjectSwitcher` (sem uso) | `components/app/project-switcher.tsx` (arquivo removido) |
| Contadores do menu lateral (Unidades, Liberações, Permuta) | eram contados **na obra do cookie**; saem com o seu cálculo (`layout.tsx`, `sidebar.tsx`, `nav-menu.ts`) |

Cookie que ainda exista no navegador de alguém **não tem mais leitor**, e o
teste confirma isso.

## Critério de aceite arquitetural (seção 47)

A busca no código não encontra nenhum `getActiveContext`, `gtc_project`,
`gtc_version`, `setActiveProject`, `SelectActive` ou `activeId`, nem o fallback
`projects[0]`. Sobrou só um comentário, que diz que ele não é usado. O projeto
passa a ser um parâmetro explícito, um filtro explícito ou a seleção local da
tela.

## Resumo da sequência (seção 50)

| PR | Conteúdo |
|---|---|
| 1 (#87) | coluna `situacao` Ativo/Finalizado (anulável), `project.status.change {from,to}` |
| 2 (#88) | `getTenantContext`, `getProjectContext`, `getProjectVersion`; ordem estável; tenant no `where` |
| 3 (#89) | Despesas + memória por aba (B-A2); pagamento de parcela na versão da parcela |
| 4 (#90) | Caixa; `versaoDeTrabalho`; conta a receber do extrato validada na empresa |
| 5 (#91) | Unidades, Permuta, Liberações; edição de unidade sem obra deixa de movê-la |
| 6 (#92) | Ressarcimentos; empresa responsável validada; B11 aberto |
| 7 (#93) | Orçamentos, Previsão, Medição, INCC, Simulador |
| 8 (#94) | Versões, exportação e modelo pela obra da própria versão; Ponto |
| 9 (#95) | DRE e Fluxo: Todos/Ativos/Finalizados/obra (B12); números idênticos a `main` |
| 10 (#96) | Dashboard: KPIs de "Todos" somam as obras (decisão de 30/09) |
| 11 (#97) | Consolidado, Resumo, Projeção, Contabilidade, Balanço do dia; números idênticos |
| 12 | remoção do mecanismo (esta) |

**Dados:**
- nenhuma migração além da 0042 (aditiva, com `down`);
- nenhum `UPDATE` em dado de negócio;
- nenhum registro apagado;
- nenhum `projectId` ou `versionId` alterado.

O único número exibido que mudou por decisão foi o topo do Dashboard em
"Todos".

**Pendências registradas:**
- **B11:** em que obra cai a saída de caixa de uma restituição;
- **versão congelada** em Liberações e Permuta (regra de negócio);
- a pergunta da seção 14, sobre o cookie de versão, **não se aplicava**: ele
  nunca teve leitor.

## Verificação

- Suíte inteira: 866 passando (os mocks deixaram de citar
  `getActiveContext`). O teste de contexto confirma que ele e o cookie não
  existem mais. `typecheck`, `lint` e `next build` limpos.
- Navegador (build de produção):
  1. com o cookie antigo `gtc_project` no navegador, Despesas, em aba nova,
     **pede a escolha**: o cookie é ignorado (teste 22);
  2. as 38 telas do app abriram sem erro;
  3. Projetos não tem mais "Selecionar" nem "selecionado";
  4. nenhum erro de JavaScript.

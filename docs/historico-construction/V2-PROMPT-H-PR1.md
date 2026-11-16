# Prompt H · PR H-1 — chave, filtro explícito, selo e avisos

Entrega única de código do Prompt H, como planejado na Fase 1 (#208).
**Sem migração**: a chave usa `tenant_flag` (0043). Nasce **desligada**:
nenhum número muda em nenhuma empresa até alguém ligar em
Configurações → Chaves de mudança, depois de conferir a lista.

## O que entrou
1. **Chave** `rascunho_fora_dos_relatorios` em `src/lib/chaves.ts`. Prévia =
   **lista de conferência (5.3)** na própria tela `/chaves`
   (`#previa-rascunho`): toda versão de Orçamento/Previsão não Aprovada da
   empresa, com projeto, nome (link para a tela dela), tipo, situação e
   totais de receitas e despesas (`budget_account`). Só leitura
   (`getPlanejamentoNaoAprovado`).
2. **Filtro explícito (4.2)** em `src/lib/queries.ts`:
   `planejamentoForaDosRelatorios(versao)` = `kind` budget/forecast **e**
   `status !== "Aprovado"` **e** chave ligada na empresa. Chamado **dentro do
   ramo `budget/forecast`** de `getMonthlyRevenue`, `getExpenseRows` e
   `getRevenueBySource` (devolvem vazio); `getBudgetLines(versionId,
   { respeitarSituacao })` só filtra quando pedido — **`/medicao` pede**;
   `/lancamento/export` e o card de Projetos (`dre-inputs.ts`) não pedem
   (exportar e "existe orçamento?" não são relatório). O ramo `atual` não vê
   o filtro (BH-2). Nenhuma consulta de movimento foi tocada (4.4).
   A regra em si é pura: `src/lib/situacao-versao.ts`
   (`entraNosRelatorios`, `avisoNoSeletor`, `avisoNaEdicao`,
   `efeitoDaTrocaDeSituacao`).
3. **Seletor (BH-3, opção 2)**: `VersionOpt.aviso` em
   `version-multiselect.tsx`; as 6 telas (`/dre`, `/fluxocaixa`,
   `/dashboard`, `/consolidado`, `/projecao`, `/resumo`) leem a chave uma vez
   e marcam **"Rascunho — não entra nos totais"** (ou "Concluído — …") na
   versão. Chave desligada: seletor igual ao de hoje.
4. **Telas de Orçamentos e Previsão (5.2)**: aviso `data-aviso-situacao` na
   versão não Aprovada — desligada: "quando a regra for ligada… deixará de
   aparecer"; ligada: "esta versão não entra nos relatórios até ser
   Aprovada. Nada foi apagado". O seletor de situação ganha, com a chave
   ligada, o texto de BH-4 ("aprovar faz entrar; voltar tira; fica na
   Auditoria") — permissão continua a `editar` da tela.

## Verificações (seção 8)
Teste com banco `src/lib/rascunho-relatorios.test.ts` (tenant próprio,
apagado ao fim) + puro `situacao-versao.test.ts`:
| # | Caso | Resultado |
|---|---|---|
| 8.1 | chave desligada: Rascunho e Concluído entram como antes | ✔ |
| 8.2 | chave ligada: Rascunho/Concluído somem das 4 leituras de relatório | ✔ |
| 8.3 | aprovar → o orçado volta com o mesmo valor | ✔ |
| 8.4 | `atual` em Rascunho: despesa continua inteira (`getExpenseRows`) | ✔ |
| 8.5 | movimento: a despesa real da Atual não muda | ✔ |
| 8.6 | edição continua lendo tudo (`getBudgetLines` sem o parâmetro = 2 linhas; nada apagado em `budget_line`) | ✔ |
| 8.7 | selo no seletor (puro + navegador: 0 selos com chave desligada, selos no DRE e Dashboard com ela ligada) | ✔ |
| 8.8 | voltar de Aprovado a Rascunho tira o número | ✔ |
| 8.9 | nenhuma versão mudou de situação (base local: budget/forecast/atual seguem Rascunho) | ✔ |
| 8.10 | antes/depois com a chave desligada: base local tem **0** `budget_line` em planejamento, totais idênticos por construção; em produção rodar o relatório 8.10 do SQL antes e depois | ✔ |

Navegador (local, admin): ligar pela tela (`viPrevia` + Ligar) → badge
"Ligada", 2 selos em `/dre` e `/dashboard`, aviso âmbar em `/budget`, texto
BH-4 no título do seletor, `/medicao` abre; Desligar → 0 selos. A linha de
`tenant_flag` e os 2 registros `chave.ligar/desligar` do teste foram apagados.

## Arquivos
`src/lib/chaves.ts`, `src/lib/situacao-versao.ts` (+test),
`src/lib/queries.ts`, `src/lib/rascunho-relatorios.test.ts`,
`src/components/app/version-multiselect.tsx`,
`src/components/app/budget-planning-screen.tsx`, páginas `chaves`, `budget`,
`forecast`, `dre`, `fluxocaixa`, `dashboard`, `consolidado`, `projecao`,
`resumo`, `medicao`.

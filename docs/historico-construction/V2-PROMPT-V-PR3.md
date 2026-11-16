# Prompt V · PR V-3 — as duas telas viram uma, com abas

Seção 0 inteira. Sem migração. Nenhuma rota removida, nenhuma action muda de
assinatura, nenhum registro de `medicao` tocado, cálculo do Relatório CEF
idêntico ao da V-2 (0.6).

## O que entrou
1. **Tela única** `MedicaoDeObra` (servidor, `components/app/medicao-obra.tsx`)
   com três abas: **Nova medição** e **Medições lançadas** em `/medicaolanc`
   (`?aba=nova|lancadas`) e **Relatório CEF** em `/medicao`
   (`medicao-relatorio.tsx`, o corpo da V-2). Regras puras em
   `lib/medicao-abas.ts`: `podeVerAba`, `abasPermitidas`, `abaInicial`,
   `hrefDaAba`, `filtrarMedicoes`, `ordenarPorCompetenciaDesc`.
2. **Rota de origem define a aba** (0.2): `/medicao` abre no Relatório;
   `/medicaolanc` em Nova medição (ou Lançadas se pedida, ou se o usuário vê
   mas não cria). As duas rotas continuam.
3. **Permissão por aba no servidor** (0.3): cada página mantém o
   `can(ctx.perms, "<tela>", "ver")` da rota; a aba inicial nunca é uma aba
   sem permissão (`abaInicial` devolve null → `AccessDenied`); e cada aba só
   é renderizada com a sua permissão: `nova` = `medicaolanc.ver + criar`,
   `lancadas` = `medicaolanc.ver`, `relatorio` = `medicao.ver`. A barra lista
   só as abas permitidas e some quando há uma. Nada é escondido com CSS.
   Trecho (medicao-obra.tsx):
   `{aba === "relatorio" && can(ctx.perms, "medicao", "ver") && <RelatorioCef …/>}`.
4. **Menu com um item** (0.2): `/medicao` "Medição de Obra" com
   `permAlt: "medicaolanc"` (aparece para quem tem qualquer das duas),
   `hrefAlt: "/medicaolanc"` (quem só tem a de lançamento — o engenheiro —
   vai direto à aba dele, porque a guarda central do layout nega `/medicao`)
   e `tambem: ["/medicaolanc"]` (as duas rotas destacam o item).
5. **Aba Lançadas** (0.4): uma linha por medição com competência, grupo,
   valor, observação, quem lançou e quando; **competência decrescente**;
   filtros por competência, grupo e — para quem vê todas — autor (inclui
   "autor não registrado"), num formulário GET servido pelo servidor;
   editar/excluir pelas mesmas actions da V-1 (confirmação + auditoria);
   duplicidade marcada; estado vazio distingue "nenhuma medição lançada",
   "nenhuma medição sua" e "nenhuma com os filtros".
6. **Engenheiro** (0.5): só as próprias + sem autor, recortado na consulta
   (V-1); sem a aba do Relatório, sem filtro de autor, sem coluna de orçado
   (0.5.6); `/medicao` direto = "Acesso negado"; `?aba=relatorio` em
   `/medicaolanc` cai em Nova medição.
7. Rótulos da matriz de permissões: "Medição de Obra — Relatório CEF" e
   "Medição de Obra — Lançar medição" (ids `medicao`/`medicaolanc` intactos:
   são a chave gravada em `membership.permissions`).

## Verificações
`medicao-abas.test.ts` (puro): 0.3 abas por papel; 17b/17c aba inicial por
rota, nunca sem permissão; href com projeto; 0.4.1/0.4.2 ordem e filtros.
`nav-menu.test.ts` ajustado: `/medicaolanc` saiu do menu; um item só de
medição; destaca `/medicaolanc`; engenheiro vê o item apontando para
`/medicaolanc`; admin para `/medicao`. `paginas-permissao` segue verde (as
duas páginas verificam "ver" antes de qualquer consulta). Suíte: 171
arquivos / 1570.

Navegador (local), **admin**: `/medicao` abre no Relatório com as 3 abas; um
item "Medição de Obra" no menu, destacado também em `/medicaolanc` (aba Nova
medição ativa); Lançadas com 2 linhas e filtro de autor [Todos, Cliente Piloto Admin,
autor não registrado]; `&autor=sem` → 1 linha e "Limpar filtros".
**Engenheiro** (usuário temporário local): item do menu aponta para
`/medicaolanc` e fica destacado; `/medicao` direto = "Acesso negado" e nenhum
relatório no DOM (17c); Lançadas mostra só a sem autor — a do admin **não
está no HTML** (17e); sem filtro de autor nem coluna Orçado (17i); lança uma
medição e a vê com o próprio nome; `?aba=relatorio` cai em Nova medição.
Admin depois vê as três autoras (Eng Teste, Cliente Piloto Admin, autor não registrado)
e o Relatório soma R$ 63 = todos os autores (17h). Usuário, membership,
medições e auditoria do teste apagados; `medicao` local segue com 0 linhas.

## Arquivos
`lib/medicao-abas.ts` (+test), `components/app/medicao-obra.tsx` (novo),
`medicao-relatorio.tsx` (novo), páginas `medicao` e `medicaolanc`
(reescritas), `lib/nav-menu.ts` (+test), `components/app/sidebar.tsx`,
`lib/permissions.ts` (rótulos).

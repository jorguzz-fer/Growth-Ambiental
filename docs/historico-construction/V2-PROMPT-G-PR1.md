# Prompt G · PR G-1 — Parte 1, restyle do Plano de Contas

Parte 1 do Prompt G (seções 1 a 7). **Nenhuma funcionalidade muda**: mesmos
campos, rótulos, botões, ações, validações, permissões, consulta e textos do
inventário ([`V2-PROMPT-G-ETAPA1.md`](./V2-PROMPT-G-ETAPA1.md)). **Sem
migração; nenhum registro de `chart_account` tocado.**

## O que mudou (só aparência, no ponto de uso)

| Item | Aplicado |
|---|---|
| 1.1 moldura | já vinha do Prompt C |
| 1.2 cabeçalho | `PageHeader` compartilhado **mantido** (ver "pontos", abaixo) |
| 1.3 cartões | cartão de grupo e "Novo grupo": branco, borda `--color-line` (#E4E9F2), raio 16px, sombra; blocos internos (editar grupo, novo subitem, campos do novo grupo) raio 13px, borda `#EDF1F7`, fundo `#FCFDFF`. Cartão "Categorias DRE": mesmas classes passadas ao `Card` por `className` — o componente não mudou |
| 1.4 cor semântica | ponto discreto na chip fechada e cor do texto do select Natureza: receita `#0F8A5F`, despesa `#C0334A`. Nunca fundo de linha |
| 1.5 campos e botões | 40px, raio 9px, borda `--color-line`, foco `#3B82F6` com halo; primário `--color-brand` (#2563EB); secundário branco com borda — tudo por `className` em `Input`/`Select`/`Button` |
| 1.6 tabela | não se aplica: a tela é de cartões |
| 1.7 hierarquia | grupo: indicador de expandir (chevron, gira ao abrir) + código + nome em peso forte + contagem de subitens; subcontas recuadas com guia à esquerda; `aria-expanded` no "Editar/Fechar" e no "+ Novo grupo" |
| 1.8 estados vazios | "Nenhum grupo ainda." / "Sem subitens." — mesmas palavras; nunca zero |
| 1.9 acessibilidade | `focus-visible` em todo botão e link; `aria-label` nos campos sem rótulo visível (a tela já era assim); `motion-reduce` no chevron e na transição do botão tracejado |

## Conferência item a item (seção 6, itens 1 e 6)
Inventário por DOM antes e depois, no navegador: **iguais** — títulos (4),
botões fechados (Editar ×19, + Novo grupo ×2), botões abertos (Fechar, Salvar,
Excluir grupo, Salvar/Inativar/× por subitem), rótulos (Código, Nome do grupo;
Código grupo, Nome do grupo, 1º subitem, Nome do subitem, Natureza),
placeholders (1.11, Novo subitem; 11, Instalações, 11.1, Descrição), 11 selects,
os três `title`, o rodapé ⓘ e o subtítulo. `window.confirm` da exclusão de
grupo com o mesmo texto. Única adição no DOM: o `title` "Receita/Despesa" do
ponto de cor (1.4).

## Componentes compartilhados (seção 5)
`PageHeader`, `Card`, `Input`, `Select`, `Button`: **não alterados**. Todas
as classes entram por `className` em `planocontas-manager.tsx` e `page.tsx`.
Nenhuma outra tela muda.

## Verificação
Suíte (1214), `tsc`, `eslint`, `next build` verdes. Contagem e hash de
`chart_account` do tenant: iguais antes e depois. Capturas `pc-antes*.png` /
`pc-depois*.png` guardadas no scratchpad da sessão.

## Pontos para você (item 8)
- Título 29px/700 (1.2): não apliquei — exigiria mudar o `PageHeader`
  compartilhado. Se quiser só aqui, é uma prop opcional.
- As quatro decisões pendentes da tela não foram antecipadas.

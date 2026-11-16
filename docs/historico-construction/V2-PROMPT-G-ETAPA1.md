# Prompt G · Plano de Contas — Etapa 1, inventário antes de qualquer código

Prompt G (16 de 42) tem **duas partes que não vão juntas**: Parte 1 é o restyle
de `/planocontas` (seções 1 a 7, **nenhuma funcionalidade muda**); Parte 2 é o
assistente (seção 8, somente leitura). Este é o inventário da Etapa 1 — a lista
de conferência do item 1 da seção 6: o que não está aqui não pode aparecer nem
desaparecer. **Só leitura; nada foi alterado.** Capturas "antes" guardadas
(`pc-antes.png`, `pc-antes-aberto.png`) para a comparação visual.

## 1 · Elementos da tela hoje

### Cabeçalho (`PageHeader`, compartilhado)
- Título **"Plano de Contas"**; subtítulo **"Dupla classificação: Grupo CEF/Obra + Categoria DRE"**. Sem eyebrow, sem ações.

### Coluna principal (`PlanoContasManager`, exclusivo) — grade `1fr | 340px`
Duas seções iguais em estrutura:
- **"Grupos CEF / Obra"** (`kind = cef`, 10 grupos na base local) e **"Grupos Complementares"** (`kind = complementar`, 9 grupos).
- Cada seção: título h2; lista de **cartões de grupo**; estado vazio **"Nenhum grupo ainda."**; botão tracejado **"+ Novo grupo"** (só com `criar`).

**Cartão de grupo (fechado):** selo com o código do grupo (mono, índigo claro) · nome do grupo (negrito) · botão **"Editar"** (só com criar, editar ou excluir) · chips dos subitens `código nome` (mono, fundo `surface3`) · estado vazio **"Sem subitens."**

**Cartão de grupo (aberto, botão vira "Fechar"):**
- Bloco **editar/excluir o grupo** (só com editar ou excluir): campo **"Código"** (largura 80px), campo **"Nome do grupo"**, botão **"Salvar"** (só editar), link vermelho **"Excluir grupo"** (só excluir) com `window.confirm` "Excluir o grupo "X Nome" e todos os seus subitens?".
- **Linha de subitem** (uma por conta, `opacity-55` quando inativa): campo código (mono, 80px) · campo nome · select **Natureza** (`Despesa` / `Receita`, title "Natureza da conta (bloco Receitas/Despesas no planejamento)") · selo **"inativa"** quando `ativo = false` · botão **"Salvar"** (outline, só editar, desabilitado sem mudança) · link **"Inativar"/"Reativar"** (só editar; title "Inativar (some de novos lançamentos)" / "Reativar") · botão **"×"** (só excluir; title "Excluir subitem") · mensagem de erro inline.
- **Novo subitem** (só criar): campo código (placeholder `1.11`) · campo nome (placeholder `Novo subitem`) · select Natureza · botão **"Adicionar"** (desabilitado sem código e nome) · erro inline.
- Erro do cartão (abaixo de tudo).

**Formulário "Novo grupo"** (só criar; abre no lugar do botão tracejado): h3 **"Novo grupo"**; campos **"Código grupo"** (placeholder `11`), **"Nome do grupo"** (`Instalações`), **"1º subitem"** (`11.1`), **"Nome do subitem"** (`Descrição`), select **"Natureza"**; botões **"Criar grupo"** (desabilitado até os 4 campos) e **"Cancelar"**; erro inline.

### Coluna lateral — **"Categorias DRE"** (cartão, exclusivo da página)
Oito linhas fixas, cada uma com ícone (emoji colorido), nome e descrição:
Receita · Custo Variável · Custo Fixo · Despesa Variável · Despesa Fixa · Retiradas · Investimento · Empréstimos. Rodapé: **"ⓘ As categorias DRE são fixas (estrutura do relatório) e não são editáveis. A edição de inserir/editar/excluir vale para os grupos e subitens CEF / complementares."** (texto que explica regra: **mantido**, 4.3).

### Modais, badges, indicadores
Nenhum modal próprio (só `window.confirm` na exclusão de grupo). Badges: código do grupo; "inativa". Sem filtros, sem busca, sem paginação, sem tabela.

## 2 · Hierarquia
```
PageHeader
grid (1fr | 340px)
├── PlanoContasManager
│   ├── GroupSection "Grupos CEF / Obra"
│   │   ├── GroupCard × N  (fechado: chips | aberto: bloco do grupo, ItemRow × n, NewItemRow)
│   │   └── NewGroupForm (botão "+ Novo grupo" → formulário)
│   └── GroupSection "Grupos Complementares" (idem)
└── aside: Card "Categorias DRE" (8 linhas + rodapé ⓘ)
```

## 3 · O que depende de permissão (`planocontas`)
| Elemento | Permissão |
|---|---|
| Tela inteira | `ver` (já verificado com `AccessDenied`, Prompt M) |
| "Editar/Fechar" do cartão | criar **ou** editar **ou** excluir |
| Bloco código/nome do grupo | editar ou excluir (campos desabilitados sem editar) |
| "Salvar" do grupo; "Salvar", "Inativar/Reativar" do subitem; campos do subitem habilitados | editar |
| "Excluir grupo", "×" do subitem | excluir |
| "Novo subitem", "+ Novo grupo" / formulário | criar |

## 4 · Ações e o que disparam (`actions/planocontas.ts`, inalteradas)
| Ação da tela | Action | Retorno hoje |
|---|---|---|
| Criar grupo | `addChartGroup({kind, groupCode, groupName, code, name, natureza})` | lança `Error` |
| Adicionar subitem | `addChartItem({kind, groupCode, groupName, code, name, natureza})` | lança `Error` |
| Salvar subitem | `updateChartItem(id, {code, name, natureza})` | `return` silencioso sem permissão; lança em código repetido |
| Inativar/Reativar | `setChartAccountAtivo(id, ativo)` | `return` silencioso sem permissão |
| × subitem | `deleteChartItem(id)` | `{ ok, error }` |
| Salvar grupo | `renameChartGroup({kind, groupCode, groupName, newGroupCode})` | `return` silencioso sem permissão |
| Excluir grupo | `deleteChartGroup({kind, groupCode})` | `{ ok, error }` |
A tela já trata os dois formatos (`run` captura `throw` e `{ ok:false }`). **Nada disso muda na Parte 1.** Consulta: `getChartAccounts(tenantId)` (única).

## 5 · Componentes
- **Compartilhados** (não se alteram, seção 5): `PageHeader`, `Card`/`CardContent`, `Input`, `Select`, `Button`, `AccessDenied`.
- **Exclusivos**: `planocontas-manager.tsx` (`PlanoContasManager`, `GroupSection`, `GroupCard`, `ItemRow`, `NewItemRow`, `NewGroupForm`) e a coluna "Categorias DRE" dentro de `page.tsx`.

## O que o Prompt C já fez
Moldura (barra lateral escura, "Plano de Contas" em Planejamento) e tokens
`--color-line`, `--color-brand`, `--color-v2-ink*` em `globals.css`. As telas
internas ficaram idênticas até o restyle de cada uma.

## Plano
| PR | Conteúdo | Muda dado? |
|---|---|---|
| **G-1** · Parte 1 | restyle no ponto de uso (cartões 16px/`--color-line`, blocos internos 13px/`#EDF1F7`/`#FCFDFF`, campos 40px/9px, botão primário `--color-brand`, hierarquia grupo/subconta com recuo + peso + `aria-expanded`, estados vazios, foco visível, `prefers-reduced-motion`). **Mesmos rótulos, botões, ações, permissões.** `PageHeader` e `Card` compartilhados não mudam: o cartão de grupo recebe as classes no ponto de uso | Não |
| **G-2** · Parte 2 | assistente somente leitura (8.3: contas sem uso, uso divergente da natureza, contas parecidas, onde cada conta aparece), período e projetos declarados, respeita permissão de Despesas | Não |

## Pontos que não decido sozinho (item 8 do relatório)
1. **1.2 — título em 29px/700.** O `PageHeader` é compartilhado por todas as
   telas (serif 24px). Mudá-lo vaza para telas não revisadas (seção 5). Na G-1
   o título fica como está; se quiser o 29px só aqui, é uma prop opcional no
   `PageHeader` sem efeito nas outras telas — me diga.
2. **1.6 — tabela com cabeçalho fixo.** A tela não tem tabela: são cartões.
   Não aplico.
3. `PADRAO-VISUAL.md` não está no repositório; uso os valores escritos no
   próprio prompt (1.3, 1.4, 1.5) e os tokens que o Prompt C já criou.
4. As quatro decisões pendentes (natureza dos grupos, "Financeiro / Contábil",
   "Outras Receitas", linha legada "Receita") **não são antecipadas**.

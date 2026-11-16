# Prompt C — moldura V2 (barra lateral + cabeçalho) · relatório

Implementação do Prompt C (`docs/historico-construction/v2/PROMPTS.md`, "PROMPT C") com as respostas
de 28/09/2026: **moldura primeiro**, **B-C1/B-C2/B-C3 conforme a
recomendação**, e **sem `PADRAO-VISUAL.md` — seguir o mockup**.

**Escopo:** só a moldura — barra lateral, cabeçalho e a casca do layout. Nenhuma
tela interna foi restilizada, nenhuma rota mudou, nenhuma permissão mudou,
nenhuma migração. Os tokens do mockup entraram em `globals.css` como tokens
**novos**; nenhum valor existente foi alterado (Prompt G §5).

## Arquivos

| Arquivo | O quê |
|---|---|
| `src/lib/nav-menu.ts` | **novo** — o menu (módulos → subitens), a filtragem por permissão, o casamento da rota ativa e o rótulo do papel. Lógica pura, testável |
| `src/lib/nav-menu.test.ts` | **novo** — 20 testes: nenhuma tela perdida, mesma chave de permissão, mesmo conjunto visível por papel, prefixos que não se confundem |
| `src/components/app/sidebar.tsx` | reescrito — barra lateral do mockup: módulos recolhíveis, destaque, modo recolhido, drawer no celular |
| `src/components/app/app-header.tsx` | **novo** — cabeçalho: empresa, logo, usuário da sessão, menu com Perfil e Sair |
| `src/components/app/app-shell.tsx` | **novo** — barra fixa + cabeçalho fixo; só o conteúdo rola |
| `src/app/(app)/layout.tsx` | usa o `AppShell`; o resto (consultas, guarda de "Ver", aviso de backup) igual |
| `src/app/globals.css` | tokens novos da moldura (`--color-nav*`, `--color-brand*`, `--color-line`, `--color-v2-ink*`) |
| `src/app/layout.tsx` | carrega a fonte **Inter** como variável (`--font-inter`), usada só pela moldura |

## Validação (§26)

**1–3. Telas da navegação antiga → onde ficaram. Nada se perdeu.** O teste
`nav-menu.test.ts` fixa as 40 rotas do menu antigo e exige que o novo tenha
exatamente as mesmas, sem duplicata.

| Rótulo novo | Rota | Permissão (`SCREENS`) | Módulo |
|---|---|---|---|
| Dashboard | `/dashboard` | `dashboard` | Business Intelligence |
| DRE | `/dre` | `dre` | Business Intelligence |
| Fluxo de Caixa | `/fluxocaixa` | `fluxocaixa` | Business Intelligence |
| Resumo Executivo | `/resumo` | `resumo` | Business Intelligence |
| Consolidado | `/consolidado` | `consolidado` | Business Intelligence |
| Diagnóstico de IA | `/diagnosticoia` | `diagnosticoia` | Business Intelligence |
| Projetos | `/projeto` | `projeto` | Planejamento |
| Orçamentos | `/budget` | `budget` | Planejamento |
| Previsão Atualizada | `/forecast` | `forecast` | Planejamento |
| Plano de Contas | `/planocontas` | `planocontas` | Planejamento |
| Clientes | `/clientes` | `clientes` | Receitas |
| Unidades | `/unidades` | `unidades` | Receitas |
| Simulador | `/simulador` | `simulador` | Receitas |
| Contas a Receber | `/contasreceber` | `contasreceber` | Receitas |
| Liberações de Obra | `/reembolso` | `reembolso` | Receitas |
| Permuta | `/permuta` | `permuta` | Receitas |
| Projeção de Receitas | `/projecao` | `projecao` | Receitas |
| Despesas / Lançamentos | `/despesas` | `despesas` | Despesas |
| Contas a Pagar | `/contaspagar` | `contaspagar` | Despesas |
| Ressarcimentos | `/restituicoes` | `restituicoes` | Despesas |
| Acerto Contábil | `/acerto` | `despesas` | Despesas |
| Fornecedores | `/fornecedores` | `fornecedores` | Despesas |
| Caixa | `/caixa` | `caixa` | Caixa |
| Contas Correntes | `/contas` | `contas` | Caixa |
| Fechamento de Caixa | `/fechamento` | `fechamento` | Caixa |
| Balanço do Dia | `/balancodia` | `balancodia` | Caixa |
| Medição de Obra | `/medicao` | `medicao` | Obra |
| Lançamento de Medição | `/medicaolanc` | `medicaolanc` | Obra |
| Estoque | `/estoque` | `estoque` | Obra |
| Ponto | `/ponto` | `ponto` | Obra |
| Parâmetros / INCC | `/parametros` | `parametros` | Obra |
| Empresa | `/empresa` | `empresa` | Configurações |
| Usuários | `/usuarios` | `usuarios` | Configurações |
| Gestão de Acessos | `/acessos` | `acessos` | Configurações |
| Auditoria | `/acoes` | `acoes` | Configurações |
| Numeração de despesas | `/numeracao` | `numeracao` | Configurações |
| Backup | `/backup` | `backup` | Configurações |
| ~~Acesso do contador~~ | ~~`/contabilidade`~~ | ~~`contabilidade`~~ | **saiu no Prompt AL** — ver nota no fim |
| Conferência de lançamentos | `/conferencia` (era `/diagnostico/categorias-invertidas`) | `conferencia`, acompanha `despesas` (Prompt AN) | Configurações |
| ~~Conferência de planos~~ | ~~`/diagnostico/planos-recebiveis`~~ | — | **saiu no Prompt AN**: a data impossível virou aviso no cadastro da unidade |

As chaves de permissão são **as mesmas do menu antigo**, item a item (inclusive
as três que não coincidem com a rota: Acerto e as duas conferências). O
`Diagnóstico de IA` continua governado por `diagnosticoia` — mudar de módulo não
o faz herdar a permissão de leitura dos demonstrativos (§3a).

**4–7. Abrir/fechar, navegação, rota ativa, recolher.** Conferido no navegador
(build de produção, banco local descartável):

- clique no módulo abre/fecha, sem navegar; o módulo da tela atual abre sozinho e
  os que o usuário abriu continuam abertos;
- destaque por prefixo **na fronteira de segmento**: `/clientes/novo`,
  `/unidades/nova`, `/unidades/[id]`, `/permuta/novo`, `/reembolso/novo` mantêm
  o pai ativo; `/contas` × `/contaspagar` × `/contasreceber` e `/medicao` ×
  `/medicaolanc` não se acendem mutuamente (teste cobre todos os pares do menu);
  `/perfil` não acende nada;
- "Recolher menu" reduz a barra a ícones com tooltip; clicar num ícone expande e
  abre o módulo. A preferência fica no `localStorage` do navegador
  (`growth.sidebar.collapsed`) e sobrevive ao recarregar — não toca tenant,
  projeto, versão nem cookie de contexto (§15).

**8. Permissões diferentes.** Testado com três papéis reais no navegador:

| Papel | Itens no menu | Igual ao menu antigo? |
|---|---|---|
| admin | 40 | sim |
| contador | 10 (DRE, Fluxo, Resumo, Consolidado, Plano de Contas, Despesas, Acerto, Medição, Auditoria, Conferência de lançamentos) | sim |
| engenheiro | 1 (Lançamento de Medição) — só o módulo Obra aparece | sim |

E o teste unitário compara o conjunto visível, papel a papel e com uma matriz
personalizada, contra o menu antigo: **idêntico**. Acesso por URL direta a tela
sem permissão continua negado (conferido: `/usuarios` como contador e
engenheiro).

**9. Scroll.** A barra rola por dentro, sem mover o conteúdo; a marca fica no
topo e "Recolher menu" no rodapé. O subitem ativo é trazido à vista quando está
no fim de uma lista longa.

**10. Desktop e viewport menor.** Desktop: barra fixa expandida. Abaixo de
1024px: drawer, aberto pelo botão ☰ do cabeçalho, fechado por clique fora, Esc
ou ao escolher uma tela. A estrutura módulos → subitens é a mesma.

**11. "Projeto ativo" global.** Não existe na moldura — nem seletor, nem badge. O
botão "Selecionar" da tela Projetos e os seletores por tela ficaram intactos (o
Prompt A é quem mexe nisso).

**12. Arquivos modificados** — tabela no topo.

**13. Tabela rótulo → rota → recurso** — acima.

**14. Sair e Perfil.** No **cabeçalho**, canto direito: clique no avatar →
"Meu perfil" / "Sair". Dois cliques, com a barra recolhida ou no celular
(o cabeçalho está sempre visível). O `signOut` é o mesmo de antes.

**15. Aviso de fechamento de semestre.** Continua no mesmo lugar — logo abaixo
do cabeçalho, acima do conteúdo —, com as mesmas regras (só para quem vê
Backup, dispensável por semestre). Código intocado.

**16. Destaque nas sub-rotas** — item 4–7 acima; pares de prefixo cobertos por
teste.

**17. B-C1, B-C2, B-C3.**
- **B-C1:** as duas conferências viraram itens diretos de Configurações; o
  Diagnóstico de IA foi para Business Intelligence (§3). Sem terceiro nível.
- **B-C2:** busca, notificações e ajuda **não** estão no cabeçalho.
- **B-C3:** a empresa aparece no cabeçalho **sem chevron** e sem trocar de
  tenant.

**18. Contador de Unidades.** **Mantido**, e também os de Liberações de Obra e
Permuta, que já existiam — discretos, só no subitem (a §11 proíbe contador no
módulo, e nenhum módulo tem). Tirar seria perder informação que alguém pôs ali
de propósito (§4). Ver C7.

**19. `/versao` no menu.** **Não entrou.** Nenhum papel passa a enxergá-la pelo
menu; o acesso por dentro do fluxo continua como era. Ver C6.

**20. Verificações `can()` de página.** Nenhuma removida. A guarda central do
layout (`screenIdOfPath` → `can(..., "ver")`) e o `AccessDenied` continuam
iguais; nenhum arquivo de página foi tocado.

## Conflitos

Pontos em que o texto do Prompt C e o mockup discordam, ou que o próprio prompt
deixou em aberto. **Todos são apresentação** — mudar qualquer um é editar a
lista em `src/lib/nav-menu.ts` ou uma classe de cor.

- **C1 · cor da barra.** O §18 pede barra *clara*, "sem fundo preto". O mockup
  desenha barra **azul-marinho** (`#0F1B2E`), e os prompts de restyle se referem
  a "barra lateral escura e cabeçalho conforme o Prompt C". Segui o mockup.
  O pedido de fundo do §18 fica atendido no espírito — sem as cores neon por
  módulo de antes, uma cor só, destaque em azul.
- **C2 · módulos.** O §2 lista 6 módulos (Financeiro, Administração); o §27 já
  cita "Pessoas (módulo novo)"; o mockup tem 8 (Despesas e Caixa separados,
  Configurações). Segui o mockup. **Pessoas** não aparece porque Funcionários e
  Equipes ainda não existem como tela — aparece sozinho quando existirem.
- **C3 · "Obra" × "Execução".** O §2 deixa em aberto e pede para não decidir na
  implementação. O mockup usa "Obra"; mantive "Obra", que é o nome de hoje.
- **C4 · Consolidado.** O §3 registra o conflito com o Prompt AB (que remove a
  tela). Enquanto o AB não roda, a tela existe — então fica no menu, em BI.
  Idem **Projeção de Receitas** (Receitas) e **Balanço do Dia** (Caixa).
- **C5 · Medição.** O §7 quer um item só, mas a fusão das duas telas em abas é
  do Prompt V. Até lá, dois itens — um item só esconderia uma das telas.
- **C6 · `/versao`.** Promover a tela de importação por planilha ao menu aumenta
  exposição (§10). Não promovi; é decisão sua.
- **C7 · contadores** — item 18.

Telas que o mockup desenha e **ainda não existem** — Relatórios customizados,
Assistente, Notas Fiscais, Cartões de Crédito, Funcionários, Equipes — não
entraram: o menu não cria tela. Entram com o prompt de cada uma.

## Observação à parte (não corrigida)

A fonte **Outfit**, que o app declara desde o MVP, **não está sendo aplicada**:
no navegador, o `<body>` resolve para a fonte do sistema (`ui-sans-serif,
system-ui…`) e `--font-sans` chega vazio no `:root` — o `body { font-family:
var(--font-sans) }` do `globals.css` não pega. Não corrigi porque mudaria a tipografia de todas as
telas de uma vez (o mesmo problema do B8). A moldura usa a Inter direto
(`var(--font-inter)`), que resolve. As telas passam para a Inter no restyle de
cada uma.

## Atualização — Prompt AL (01/10/2026)

A tela **Acesso do contador** (`/contabilidade`) **deixou de existir**. Ela
não administrava acesso: mostrava três números de um projeto e tinha um
formulário de convite igual ao da tela Usuários. Manter um segundo caminho de
concessão de acesso, fora da trava de owner e admin da Gestão de Acessos,
contrariava o Prompt AJ. A URL antiga redireciona para `/usuarios` com um
aviso de uma linha. O que o contador vê agora se ajusta em Gestão de Acessos.

## Atualização — Prompt AP (01/10/2026)

A tela `/versao` **deixou de existir**. Ela nunca teve item de menu, e os
itens 19 e C6 acima perdem o objeto. A URL antiga redireciona para Projetos
com aviso. A trava e a planilha da versão Atual moram no cartão "Versões do
projeto".

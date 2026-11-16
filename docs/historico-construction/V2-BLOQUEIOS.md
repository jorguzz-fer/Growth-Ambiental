# V2 — bloqueios e conflitos encontrados na leitura do pacote

Leitura de `SPEC-GROWTH-CONSTRUCTION.md`, `ROTEIRO-EXECUCAO.md` e
`mockup-growth_7.html` contra o código em produção, em 22/09/2026.

O pacote descreve 42 prompts em 50 etapas. **Sete coisas impedem executá-lo como
está.** Cinco são falta de insumo, duas são decisões de negócio. Este documento
existe para que nenhuma delas seja resolvida por adivinhação — e porque o
sistema está em produção, onde chute vira perda de dado ou número errado em
relatório.

---

## B1 · ~~Os 42 prompts não estão disponíveis~~ · **RESOLVIDO**

**Recebidos em 23/09/2026**, num arquivo único `PROMPTS.md` (24.623 linhas, os 42
na íntegra). A conferência contra o texto real corrigiu a AK Parte 2 já
entregue, e os bloqueios do Bloco 0 estão extraídos e prontos para responder em
[`V2-BLOCO0-BLOQUEIOS.md`](./V2-BLOCO0-BLOQUEIOS.md).

---

## B1-orig · texto original

A própria Spec define os papéis dos três artefatos:

> | **Os 42 prompts** `PROMPT-*.md` | a instrução de execução de cada tela, com
> bloqueios, testes e relatório obrigatório | quem implementa |

E logo abaixo: **"Nenhum prompt é executado sem responder os seus bloqueios.
Eles não são formalidade: cada um existe porque uma resposta errada ali produz
perda de dado ou número errado em relatório."**

Chegaram a Spec e o Roteiro — que são o **mapa** — e o mockup. Os arquivos
`PROMPT-*.md` não. Sem eles não existem: o escopo exato de cada tela, os
bloqueios `B*-n` citados o tempo todo (BAJ-2, BM-3, BV-1, BAG-1, BAD-1, BAP-1,
BS-1, BN-1, BAA-1, BAF-3, BAE-2, BAI-1, BAO-2, BAK-2), os testes de aceite e o
conteúdo do relatório obrigatório de cada tarefa.

Executar "AJ · Gestão de Acessos, Partes 1 e 2" tendo só a linha de resumo da
tabela significa inventar o que são as Partes 1 e 2. Numa tela de permissão, num
sistema em produção, isso é exatamente o que a regra 3.2 proíbe.

**O que destrava:** enviar os 42 arquivos.

---

## B2 · Três prompts não existem nem do lado de quem escreveu

Declarado nos dois documentos. Não é falta de envio — não foram escritos:

| O que falta | Trava |
|---|---|
| **Prompt I, seção 58** — unificar `expandUnitReceivables`, `calcProjectionBySource` e `calcTotals` | **AA, AC, AD, AE, AN** |
| **Prompt dos helpers de data** — `dateInRange` × `monthInRange`, e a data inválida | toda tela com filtro de período |
| **Prompt das rotas `/api/agent/*`** | AA, AG |

A seção 58 é a etapa **10** do roteiro, logo no começo do Bloco 2. O Bloco 6
inteiro (Leitura: DRE, Fluxo de Caixa, Dashboard, Resumo) depende dela.

---

## B3 · O Bloco 0 é "vai agora" e está travado por uma pergunta de negócio

O Roteiro abre o Bloco 0 com **"Vai agora. Há relato de produção, e há vazamento
entre tenants."** Mas a própria lista de perguntas diz:

> | **Que telas o `membro` precisa ver, e com qual ação?** | BAJ-2 — e com ele o
> Bloco 0 |

Das seis etapas do Bloco 0, cinco passam por AJ ou por AI e dependem dessa
resposta. **A sexta não** — e foi executada (ver "O que já foi feito").

**O que destrava:** a lista de telas × ação para o papel `membro`.

---

## B4 · ~~Não existe o mecanismo de chave por tenant que seis prompts exigem~~ · **RESOLVIDO (PR #103, 30/09/2026)**

A regra 3.3 é categórica:

> **Mudança que altera número em produção entra atrás de chave por tenant,
> desligada**, com prévia apresentada antes de ligar. Com a chave desligada, o
> sistema devolve exatamente os números de hoje.

O Roteiro nomeia quem depende disso: **H, AA, AC, AD, AE** e as chaves das seções
54, 56, 57 e 58 do **I**.

**No código não há nada disso.** Não existe tabela de flags por tenant, nem
helper de leitura, nem tela para ligar. E o roteiro não agenda a construção
desse mecanismo em etapa nenhuma — ele é pressuposto pronto a partir da etapa
12.

Isto é uma lacuna do plano, não uma decisão: sem a chave, ou se descumpre a
regra 3.3, ou se para na etapa 12. **Proposta:** construir o mecanismo como
etapa própria antes do Bloco 2 (tabela aditiva `tenant_flag`, helper de leitura,
padrão de "prévia" e a tela de ativação em Configurações).

---

## B5 · Seis telas em produção não têm destino declarado

A Spec §7 lista 8 telas que saem e 4 que entram. O menu do mockup tem 8 módulos
e 41 telas. Cruzando com as rotas que existem hoje, **sobram estas, que não
estão no mockup nem na lista de remoção**:

| Rota hoje | Tela | Situação |
|---|---|---|
| `/acerto` | Acerto Contábil | sem menção |
| `/reembolso` | Reembolso | sem menção — possivelmente virou "Liberações de Obra" |
| `/lancamento` | Lançamento Budget/Forecast simplificado | sem menção |
| `/diagnosticoia` | Diagnóstico de IA | sem menção |
| `/medicaolanc` | Lançamento de Medição | a fusão com `/medicao` é o Prompt V |
| `/diagnostico/*` | Categorias invertidas, planos de recebíveis | sem menção |

Sumir do menu não é o mesmo que sair do sistema, e a Spec exige que remoção
redirecione com aviso e preserve o registro. **Não vou remover nem esconder
nenhuma tela que o pacote não mande remover explicitamente.**

**O que destrava:** para cada uma — fica como está, sai (com redirecionamento),
ou foi renomeada para algo do mockup?

---

## B6 · ~~"Liberações de Obra" — tela nova ou renomeação de "Reembolso"?~~ · **RESPONDIDO**

**Resposta (23/09/2026): é renomeação.** "A antiga sessão reembolso irá se chamar
Liberação de Obra."

Executado apenas o que é **rótulo**. Três coisas mantiveram o nome antigo de
propósito, e nenhuma delas aparece para o usuário:

| O que | Por que não muda |
|---|---|
| `SCREENS.id = "reembolso"` | é a chave gravada em `membership.permissions`. Trocar o id órfãozaria **toda permissão já salva** |
| A rota `/reembolso` | o id da tela é, por convenção do arquivo, o primeiro segmento da rota — e link salvo pelo usuário continua abrindo |
| `rowKey === "Reembolso"` e a aba `Reembolso` do XLSX | são **valor de dado**: o rowKey está gravado em `budget_line`, e o nome da aba é o contrato com as planilhas que o cliente já tem. Renomear quebraria toda importação existente |

Fora do escopo por ora, para não conflitar com prompts que ainda vêm: os rótulos
em **Projeção** e **Consolidado** (telas que saem pelo Prompt AB) e em **Resumo
Executivo** (reorganizado pelo Prompt AE).

---

## B6-orig · texto original da pergunta

O mockup traz **Liberações de Obra** (`s10`, com a tela de cadastro `s15`) em
Receitas, e a Spec tem o **Prompt O · Liberações de Obra**, com a decisão
"liberação de obra é caixa, não receita".

Hoje existe `/reembolso`, com a tabela `reembolso`. Os dois podem ser a mesma
coisa com nome novo, ou coisas diferentes.

A diferença é material: se for renomeação, os dados existentes continuam e a
tela muda de rótulo; se for tela nova, `reembolso` precisa de destino próprio
(cai em B5). **Renomear a coisa errada é perder o vínculo de dado lançado.**

---

## B7 · O redesenho visual é transversal e não está no roteiro

O mockup não é ajuste de layout — é outra identidade visual:

| | Hoje | Mockup |
|---|---|---|
| Barra lateral | escura, quase preta (`--color-ink`, `#0d0d14`) | **azul-marinho** (`--nav:#0F1B2E`) |
| Cor de marca | `--color-accent` | **`--brand:#2563EB`** |
| Fundo da página | `--color-surface` | **`--page:#F4F6FA`** |
| Tokens | `--color-ink/ink2/ink3/ink4` | `--ink/--ink-2/--ink-3` + famílias green/red/blue/lilac com `bg`/`line`/`tile` |
| Módulos do menu | 9, começando em Planejamento | **8, começando em Business Intelligence** |

O menu do mockup, que é o Prompt C:

```
Business Intelligence · Planejamento · Receitas · Despesas
Caixa · Obra · Pessoas · Configurações
```

O roteiro trata disso só na etapa 8 (Prompt C, barra lateral) e não menciona a
troca de paleta em lugar nenhum — mas ela alcança **todas as 41 telas**.

**Ponto a favor:** essa é a única frente grande que **não depende de nenhuma
decisão de negócio nem dos 42 prompts**. Os tokens e a estrutura do menu estão
inteiramente no mockup. É o que dá para fazer enquanto as respostas não chegam.

> **Revisto em 28/09/2026 — ver B8.** Com os prompts em mãos, a ideia de trocar a
> paleta do app inteiro de uma vez contradiz o próprio pacote.

---

## B8 · ~~A troca visual global contradiz o pacote~~ · **RESPONDIDO**

> **Resposta (28/09/2026):** moldura primeiro; as três recomendações de B-C1,
> B-C2 e B-C3 aprovadas; sem `PADRAO-VISUAL.md` — seguir o mockup. A moldura foi
> implementada com tokens **aditivos**; o relatório e os conflitos novos que ela
> revelou estão em [`V2-PROMPT-C.md`](./V2-PROMPT-C.md) e em **B9** abaixo.

### B8 · texto original

Em 28/09/2026 foi aprovada uma "etapa 1": trocar os valores das cores-base
(`globals.css`) pela paleta do mockup, mudando as 41 telas de uma vez. **Parei
antes de alterar qualquer cor**, porque os prompts definem o contrário.

**O que o pacote diz.** A mudança visual é feita **tela a tela**, cada uma no
seu prompt, com inventário de cada botão e campo, e testes. E proíbe
explicitamente o atalho global — Prompt G, seção 5:

> Se algum componente for compartilhado com outra tela, **não alterá-lo**: criar
> variante ou aplicar o estilo no ponto de uso. Alterar componente compartilhado
> numa tarefa de restyle é como mudanças vazam para telas não revisadas.

`globals.css` é o mais compartilhado de todos. E o motivo está na seção 4:
*"restyle parece inofensivo e é onde funcionalidade some sem ninguém perceber"*.

**A ordem que o pacote define:**

1. **Prompt C — a moldura:** barra lateral, cabeçalho e o menu em 8 módulos.
   Todo restyle de tela se refere a ela ("barra lateral escura e cabeçalho
   conforme o Prompt C").
2. **Cada tela**, no seu prompt, seguindo `PADRAO-VISUAL.md`.

**Falta um documento.** `PADRAO-VISUAL.md` é citado 10 vezes nos prompts como o
padrão de paleta, tipografia, espaçamento, raios e sombra — e **não está no
pacote**. Só há fragmentos dele dentro dos prompts (cartão com borda `#E4E9F2` e
raio 16px, campo de 40px com raio 9px, botão primário `#2563EB`, foco
`#3B82F6`) e o próprio mockup. A tipografia também muda: o mockup usa **Inter**;
o app usa Outfit.

**Os três bloqueios do Prompt C**, com a recomendação do próprio prompt:

| | Pergunta | Recomendação |
|---|---|---|
| **B-C1** | As duas telas de "Diagnósticos" viram um terceiro nível de menu, ou itens diretos? | **itens diretos** ("Conferência de lançamentos", "Conferência de planos") — duas telas não justificam um nível inteiro |
| **B-C2** | Busca, notificações e ajuda aparecem no cabeçalho do mockup e **não existem no sistema**. Implementar? | **deixar de fora** — ícone que não faz nada ensina o usuário a ignorá-lo. Cada um vira prompt próprio |
| **B-C3** | O seletor de Empresa no cabeçalho troca de empresa? | **não, por ora** — trocar de empresa é a operação mais sensível do sistema (isolamento entre tenants) e vira prompt próprio. O chevron sai |

**Duas saídas compatíveis com o pacote:**

- **Tokens aditivos, sem efeito visível.** Acrescentar a paleta do mockup a
  `globals.css` como tokens **novos** (`--color-brand`, `--color-nav`, famílias
  verde/vermelho/azul…), sem alterar nenhum valor existente. Nenhuma tela muda;
  a moldura e cada restyle passam a usar os tokens novos no ponto de uso. É
  exatamente o "criar variante" da seção 5.
- **Prompt C em seguida** — a primeira mudança visível, e a que dá a cara nova
  ao app.

---

## B9 · Prompt C × mockup — onde os dois divergem · **CONFIRMADO (30/09/2026): fica o mockup**

Ao implementar a moldura, o texto do Prompt C e o mockup discordam em alguns
pontos. Como a instrução foi *"siga o mockup"*, segui o mockup — **tudo aqui é
apresentação, reversível em minutos, sem dado nem permissão envolvidos**. O
detalhe de cada um está em [`V2-PROMPT-C.md`](./V2-PROMPT-C.md#conflitos).

| | Prompt C diz | Mockup mostra | Fiz |
|---|---|---|---|
| **C1** | barra lateral **clara**, "sem fundo preto" (§18) | barra **azul-marinho** `#0F1B2E` | mockup (marinho) |
| **C2** | 6 módulos: BI, Planejamento, Receitas, Obra, **Financeiro**, **Administração** | 8: BI, Planejamento, Receitas, **Despesas**, **Caixa**, Obra, **Pessoas**, **Configurações** | mockup (Pessoas fica oculto: as telas dele não existem) |
| **C3** | "Obra" ou "Execução" — **em aberto** (§2) | "Obra" | "Obra" |
| **C4** | Consolidado: fica ou sai — **conflito com o Prompt AB** (§3) | não aparece | **fica**, em BI, até o AB decidir |
| **C5** | Medição vira **um item** com abas (§7, dono: Prompt V) | um item | **dois itens** até o Prompt V fundir as telas |
| **C6** | `/versao` pode entrar no menu (§10) | não aparece | **não entra** — decisão de exposição sua |
| **C7** | contador do subitem Unidades: decidir (§4) | sem contadores | **mantido** (e os de Liberações e Permuta), discreto |

---

## B10 · Bloco 1 — decisões · **RESPONDIDO (29/09/2026)**

| | Pergunta | Resposta |
|---|---|---|
| **B-A2** (Prompt A) | Sem projeto escolhido, o que a tela faz? | **Memória por aba** — a escolha vai na URL (`?project=…`) e cada aba lembra a última em `sessionStorage`. Nada global, nada compartilhado entre abas |
| **BM-3** (Prompt M) | Quais campos de cliente são sensíveis? | **Aprovada a proposta:** renda bruta e líquida, comprometimento, FGTS (possui e saldo), score, restrições, estado civil e todo o bloco de inteligência de mercado exigem permissão própria, dada por padrão **só a owner e admin** |
| **BM-2** (Prompt M) | O engenheiro vê o relatório de Medição? | **Não — fica como está:** só o Lançamento de Medição |

**Nome do parâmetro (Prompt A, 22):** fica **`?proj=`**, que o app já usa em
Despesas, Unidades, Fluxo de Caixa, Dashboard e Projetos — links e favoritos
existentes continuam valendo. `?project=`, o do texto do B-A2, é aceito como
sinônimo na leitura. Muda só o nome; a decisão (memória por aba) é a mesma.

O inventário do Prompt A (B-A1) está em [`V2-PROMPT-A-INVENTARIO.md`](./V2-PROMPT-A-INVENTARIO.md):
24 telas e 13 arquivos de ações dependem do projeto/versão implícitos — a
refatoração vai em várias PRs, uma por módulo.

---

## O que já foi feito nesta sessão

As três tarefas que **os dois documentos** marcam como livres de qualquer
decisão pendente (Spec §13, Roteiro "O QUE PODE IR SOZINHO, HOJE"):

| Item | O que era | Onde |
|---|---|---|
| **AI, Parte 4** | `updateMemberName` atualizava `user` só pelo id. `user` é tabela global: um admin que soubesse o id renomeava usuário de **outra empresa**. A permissão `usuarios.editar` não protegia — ela é do tenant de quem edita, não do alvo | `src/lib/actions/users.ts` |
| **AK, Parte 2** | `houveMudanca` existia e nenhuma action usava. Salvar sem alterar nada gravava evento no log | `actions/despesas.ts`, `actions/empresa.ts`, `actions/projects.ts` |
| **AO, Parte 6** | Download do backup — um semestre inteiro de dados da empresa saindo num arquivo — não deixava rastro | `app/(app)/backup/download/route.ts` |

Nenhuma delas altera dado lançado, amplia acesso, muda número de relatório ou
exige migração. `updateProject` passou a registrar `de → para` (`diffAudit`) em
vez do valor novo solto; linhas antigas do `audit_log` não foram tocadas — a
tela de auditoria já lê os dois formatos.

---

## Recomendação de sequência

1. **Enviar os 42 prompts** (B1) — sem isso, 39 das 50 etapas ficam paradas.
2. **Responder B3, B5 e B6** — destravam o Bloco 0 e definem o que não pode
   sumir.
3. **Enquanto isso:** o redesenho visual (B7) — tokens do mockup e o menu de 8
   módulos —, que não depende de nenhuma resposta.
4. **Antes do Bloco 2:** o mecanismo de chave por tenant (B4).

---

## B11 · Em que obra cai a saída de caixa de uma restituição? · **RESPONDIDO (30/09/2026): opção 2**

Levantada no Prompt A, PR 6. **Não bloqueia nada**: a PR manteve o
comportamento de antes, trocando só a origem da obra (do cookie para a tela).

Hoje, a saída de caixa de uma restituição cai **na obra que está aberta na tela
de Ressarcimentos**. Isso vale para a restituição avulsa, em lote, e para o
estorno. O mesmo acontece com a entrada de caixa de um repasse de terceiro. A
despesa que está sendo restituída pode ser de **outra** obra. Nesse caso, o
Fluxo de Caixa por obra mostra a saída numa obra e a despesa em outra.

| Opção | O que muda |
|---|---|
| **1. Fica como está** (obra da tela) | nada; quem lança escolhe a obra ao abrir a tela |
| **2. Segue a despesa** | restituição avulsa: a obra da despesa. Em lote, a saída única seria **dividida por obra**, conforme os PEDs abatidos. É regra de negócio e muda o Fluxo por obra daqui em diante (nada do que já foi lançado é mexido) |

Recomendação: **2**, num prompt próprio, com a contabilidade de acordo.

**Decisão (30/09/2026): opção 2.** A saída segue a despesa; em lote, dividida por
obra conforme os PEDs abatidos. Entra na PR **I-7** do Prompt I (terceiros e
restituições), atrás de chave, com prévia. Nada já lançado muda.

**Versão congelada em Liberações e Permuta (30/09/2026):** passa a bloquear,
como em todo lançamento (`addReembolso`, `addPermuta`).

**Pergunta aberta (PR I-7a, 30/09/2026) — o lote.** O texto da opção 2 diz
"dividida por obra"; o §21 do Prompt I diz "preserva a saída única e usa
relações de alocação" (como o acerto fez na I-4). Ver as duas opções em
[`V2-PROMPT-I-PR7A.md`](./V2-PROMPT-I-PR7A.md). Recomendação: **saída única +
alocação por `restituicao_item`**, com a leitura por obra na I-8. A avulsa e o
repasse seguem a despesa/recebimento sem ambiguidade (I-7b, atrás de chave).

---

## B12 · Relatórios: escopo, escritórios e padrão · **RESPONDIDO (29/09/2026)**

| Pergunta | Resposta |
|---|---|
| Nos filtros "Ativos" e "Finalizados", os escritórios entram? | **Não, só em "Todos".** "Todos" continua igual a hoje: obras e escritórios. "Ativos" e "Finalizados" mostram só obras |
| No filtro "Ativos", o que fazer com obra sem status? | **Fica fora, com aviso.** O relatório mostra "N obra(s) sem status ficaram fora — classifique-as em Projetos". "Todos" não muda |
| Relatório aberto pelo menu, sem nada na URL | **A obra lembrada pela aba; sem memória, "Todos".** O relatório não trava pedindo escolha |

O escopo vai no mesmo parâmetro das obras: `?proj=all`, `?proj=ativos` ou
`?proj=finalizados`.

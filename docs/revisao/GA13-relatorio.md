# GA-13 · Correção dos erros que ainda existem — relatório

**Base.** `main` em 4f24fb3, com o PR #23 (GA-2B) já no `main`. O GA-13 foi escrito sobre 7aaaf8c.
**Banco.** Só o local de teste e a demonstração local; nunca a produção.

**Regras do GA-13, todas seguidas:**
- nenhum dado apagado ou convertido, sem migração;
- para cada item, um teste que falha, a correção e o mesmo teste passando;
- nenhum `skip`, asserção afrouxada ou regra de lint desligada;
- um commit por lote, cada um com typecheck, lint e `test:db` verdes, com o banco em America/Sao_Paulo.

## 1. Tabela por item

| Item | Situação antes | Teste que prova | Antes | Correção | Depois | Arquivos |
|---|---|---|---|---|---|---|
| **J1** | Com o banco em America/Sao_Paulo, o app gravava a hora local e comparava com UTC (3 h). **5 testes** falharam em 5 arquivos (a auditoria viu 6; o "duplo clique" da NFS-e passou nas 3 rodadas daqui). | `src/lib/db/fuso.test.ts` e os 5 da auditoria (`ai/uso`, `notas-servico-envio`, `notas-servico-cancelamento`, `backup-dados`, `backup-geracao`) | **falhou**: sessão `America/Sao_Paulo`; linha gravada a 10.800.003 ms de `new Date()`; 6 `postgres(...)` sem UTC; os 5 testes da auditoria | `OPCOES_DE_CONEXAO`/`comConexaoUtc` com `TimeZone: "UTC"` em todo `postgres(...)`, incluindo `migrate.ts`, `medicao-*.ts` e `foto-numeros-demo.mjs`. `test-db.sh` põe o banco local de teste em `${TEST_DB_TZ:-America/Sao_Paulo}` e recusa banco remoto. Documentado em `docs/STACK.md`. Tipo de coluna não muda. | passou: 5/5 do `fuso.test`; 26/26 dos 5 arquivos | `src/lib/db/conexao.ts`, `db/index.ts`, `db/migrate.ts`, `scripts/medicao-ar.ts`, `medicao-au.ts`, `medicao-at-receita-dobrada.ts`, `foto-numeros-demo.mjs`, `test-db.sh`, `docs/STACK.md` |
| **G1** | `sanitizacao.test.ts` rodava `git ls-files`; sem `.git` (pacote de revisão, zip), o arquivo inteiro falhava. | `sanitizacao.test.ts` numa cópia via `git archive`; `src/lib/test-utils/listar-arquivos.test.ts` | **falhou**: `fatal: not a git repository` | Helper `scripts/lib/listar-arquivos.mjs`: `git ls-files` ou, sem git, o disco respeitando `.gitignore` e as pastas geradas. Usado pela sanitização e por `scripts/varredura-terminologia.mjs` (que deixou de depender do `rg`). | passou, com e sem `.git`; disco = git (1.430) + só arquivos novos | `scripts/lib/listar-arquivos.mjs`, `src/lib/test-utils/listar-arquivos.{ts,test.ts}`, `sanitizacao.test.ts`, `varredura-terminologia.mjs` |
| **G4** | 11 avisos de lint em 7 arquivos | `next lint --max-warnings 0` | **falhou** (exit 1, 11 avisos) | Imports e variáveis sem uso removidos. O padrão `const { a: _a, ...resto }` virou `omitir(obj, [...])`. **`npm run lint` agora é `next lint --max-warnings 0`.** Nenhuma regra desligada. | passou: 0 erros, 0 avisos | `cartao-conciliacao-lista.tsx`, 6 testes, `src/lib/test-utils/omitir.ts`, `package.json` |
| **K1** | Extrato CSV: "03/07/2026" virava 06/03/2026 (fuso do Brasil) ou 03/07 em UTC: dia e mês trocados. | `src/lib/extrato-csv.test.ts` (cada caso em UTC, America/Sao_Paulo e Asia/Tokyo) | **falhou**: `06/03/2026` (9 de 10 casos) | Leitor próprio de CSV (texto; separador `,`, `;` ou tab; aspas), data por `toInternalDate`. **Achado:** XLSX com a coluna em formato de data também saía errado (`02/07/2026` em SP). Agora usa o número de série da célula, sem `Date`. | passou 10/10 | `src/lib/extrato-planilha.ts` |
| **K6** | Fatura do cartão em CSV: mesma leitura com `cellDates` | mesmo arquivo, caso K6 | **falhou** (`06/03/2026`) | Leitura extraída para `src/lib/fatura-planilha.ts`, que usa o leitor do K1 (sem duplicar). | passou | `fatura-planilha.ts`, `extrato-cartao.tsx` |
| **K2** | CSV UTF-8 sem BOM perdia "Histórico" (descrição "—") | `extrato-csv.test.ts` (BOM, sem BOM, Latin-1) | **falhou** (descrição "—") | Detecção de codificação: BOM → UTF-8; UTF-8 válido → UTF-8; senão Windows-1252. | passou | `extrato-planilha.ts` |
| **K3** | A tela oferecia "Documentos do contratante" e o servidor só aceitava "Documentos do comprador" ("Escolha o tipo do documento.") | `src/lib/actions/clientes-doc-tipo.test.ts` (com banco) | **falhou**: anexo recusado; listas diferentes | `TIPOS_DOC_CLIENTE` único em `clientes-regras.ts` (tela e action). O tipo antigo não é oferecido; os registros antigos continuam listados. Sem migração. | passou 5/5; anexo gravado no navegador | `clientes-regras.ts`, `actions/clientes.ts`, `clientes/[id]/page.tsx` |
| **C1** | "Indisponível: depende do catálogo de métricas (BAA-6)…" no Dashboard e no Resumo | `textos-visiveis.test.ts` com o padrão do GA-13 | **falhou em 7aaaf8c** (aponta os dois textos); **passa no `main`** | **Já corrigido** pelo GA-2B (PR #23): o cartão foi **habilitado** e abre a Cris com o pedido e o recorte. Nenhum código mexido aqui. | passou | — |
| **C2** | "Margem fica de fora até a correção da receita (Prompt I)." | idem | **falhou em 7aaaf8c**; passa no `main` | **Já corrigido** (GA-2B): "A margem não entra neste total." | passou | — |
| **C3** | Sem trava contra texto interno | `src/lib/textos-visiveis.test.ts` | Existia desde o GA-2B (API do TypeScript; JSX, atributos visíveis, toast/aviso; comentários fora). **Em 7aaaf8c ela falha apontando os três textos.** | **Já corrigido.** Aqui ela passou a exigir também o padrão do GA-13 (`/\bPrompt [A-Z]{1,3}\d?\b\|\bBA[A-Z]?-\d+\|\bGA-\d+\b\|§\|\bPR\d+\b/`, com qualquer "§"), junto com o do GA-2B. | passou (os dois padrões) | `src/lib/codigos-internos.ts`, `textos-visiveis.test.ts` |
| **D2** | Ajuda fiscal: "Construção civil costuma ser 7.02 (obra)…", "Construção de edifícios… 4120-4/00" | `terminologia-ambiental.test.ts` (bloco GA-13 D2) | **falhou** | Item LC 116: "Item da LC 116/2003 do serviço que a empresa presta. Confirme com a contabilidade." CNAE: "CNAE principal do cartão CNPJ (grave só os dígitos). Confirme com a contabilidade." O teste antigo que exigia "7.02" na ajuda passou a exigir a regra nova. | passou | `empresa-regras.ts`, `empresa-regras.test.ts`, `terminologia-ambiental.test.ts` |
| **H1** | Até ~1440 px, o título ficava espremido (Dashboard com largura 0, DRE em 5 linhas) e os filtros vazavam | `scripts/verificar-cabecalho.cjs` (navegador, 1280/1440/1920) e `ga13-telas.test.ts` | **falhou**: 6 de 15 (Dashboard, DRE e Fluxo em 1280 e 1440) | `PageHeader` com `flex-wrap`: título com base de 22rem; filtros quebram para baixo e entre si, sem `shrink-0`. | passou 15/15 (1 linha de título, sem sobreposição) | `components/app/page-header.tsx` |
| **H2** | `/despesas` e `/equipes` abriam pedindo projeto | `ga13-telas.test.ts` e navegador (aba nova, sem parâmetro) | **falhou** | Ver a lista abaixo | passou: 7 telas abrem com dados | `despesas/page.tsx`, `equipes/page.tsx`, `pedir-projeto.tsx`, `resumo/page.tsx`, `projeto-selecao.ts` |
| **H3** | Sem `loading.tsx`; o Fluxo de Caixa ficava em branco | `ga13-telas.test.ts` e navegador (esqueleto visível com a rede atrasada) | **falhou** | **Desvio do pedido, ver §1.1.** `loading.tsx` foi feito e **descartado** porque travava navegações. O esqueleto entra no `RecuperarProjeto`, onde nasce o branco. | passou | `components/app/esqueleto-de-tela.tsx`, `projeto-da-aba.tsx`, 5 páginas (título do esqueleto) |
| **H4** | Dashboard mistura Orçamento e Atual | — | — | **Só proposta** (§5) | — | — |
| **G3** | 281 arquivos em `docs/`, 246 `V2-*`/`V3-*` | `src/lib/docs-referencias.test.ts` | **falhou**: sem `docs/README.md`; V2/V3 na raiz | `git mv` para `docs/historico-construction/` (ver §1.2). `docs/README.md` com uma linha por documento; referências atualizadas. | passou 4/4 | 290 arquivos movidos; README, STACK, `pacote-revisao.sh`, comentários em `schema.ts`, `audit*.ts`, `medicao-bdi.ts`, `types.ts` |

### 1.1 H3: por que não há `loading.tsx`

**O que aconteceu.** O `loading.tsx` foi criado no grupo `(app)` e nas cinco telas pesadas. O build os ligou às rotas. Mas, no navegador (build de produção, demonstração), **as navegações passaram a travar de forma intermitente**:
- trocar a aba da Conciliação de Caixa não completava;
- o redirecionamento da DRE para "Todos" não completava;
- em 4 rodadas, 9 navegações de 12 não completaram em 30 s.

**Como o defeito se mostrava:** a raiz do React ficava com `pendingLanes == suspendedLanes`.

**O que se testou:**
- **Sem os `loading.tsx`:** as mesmas 4 rodadas navegaram todas (160 a 730 ms).
- **Sem `useSearchParams` no `CrisProvider` do layout:** a hipótese não se confirmou, e o experimento foi desfeito.

É o mesmo tipo de travamento que o GA-11 corrigiu ao tirar um `<Suspense>` do layout.

**O que foi feito no lugar.** O branco do Fluxo de Caixa aparecia ao abrir a tela pelo menu, sem projeto na URL. O `RecuperarProjeto` não mostrava nada enquanto decidia o projeto e esperava a tela pesada. Agora ele mostra o **esqueleto da tela**, com título e blocos cinza: no Dashboard, DRE, DRE Analítica, Fluxo e Fluxo Analítico, e também em Despesas, Equipes e nas telas do `PedirProjeto`.

**Navegador:**
- o esqueleto aparece com a rede atrasada, como no print;
- a tela real o substitui;
- nenhuma navegação trava (4/4 rodadas).

**Trava.** O `ga13-telas.test.ts` exige que não haja `loading.tsx` nessas rotas, com o motivo no teste.

**Pendência.** Achar a causa raiz da combinação Suspense + navegação fica para outro prompt. Ela já apareceu duas vezes.

### 1.2 G3: o que foi para o histórico (decidido pelo conteúdo)

**Para `docs/historico-construction/`:**
- os 246 `V2-*`/`V3-*`;
- `SPEC.md` ("Growth Tools · Construction App");
- `regras-contabeis.md` ("Regras contábeis do Growth Construction");
- `BDI-PROVISIONAMENTO.md` (BDI);
- `AR-MEDICAO.md` (plano de pagamento das unidades);
- as coletas de código da época, que copiam código e não descrevem o Ambiental: `TELA-CONTABILIDADE.md` (tela removida), `TELA-VERSAO.md` e `EMISSOR-CALCULO.md`;
- as pastas `v2/` (prompts e mockup) e `sql/` (diagnósticos V2).

**Ficam na raiz** os 25 que descrevem o Ambiental, mais `revisao/`. O índice está em `docs/README.md`.

**Referências:**
- **Atualizadas** em README, STACK, `pacote-revisao.sh` (agora confere `docs/README.md`), comentários de código (`schema.ts`, `audit.ts`, `audit-mask.ts`, `medicao-bdi.ts`, `types.ts`) e documentos de revisão.
- **Exceções conscientes:**
  - as **migrações SQL já aplicadas** não são editadas, nem o comentário; duas citam o caminho antigo;
  - o próprio histórico cita documentos apagados em revisões anteriores, e isso não muda.
- **Na trava, duas exceções com motivo:**
  - um documento removido na sanitização, citado pela auditoria que registra a remoção;
  - o arquivo que `medicao-ar.ts` gera.

### H2 · O que cada tela faz agora (aba nova, sem parâmetro)

| Tela | Antes | Agora |
|---|---|---|
| Despesas | "Selecione um projeto — ou Todos…" | abre em **Todos** (562 lançamentos na demonstração) |
| Resumo Executivo | pedia o projeto | abre em **Todos** (consolidado) |
| Equipes | "Selecione um projeto." | **último projeto da aba ou o primeiro ativo**: a equipe é de um projeto só |
| Orçamentos, Previsão Atualizada, Plano de Trabalho, Ressarcimentos | pediam o projeto | último projeto da aba ou o primeiro ativo |
| Dashboard, DRE, DRE Analítica, Fluxo de Caixa, Fluxo Analítico, Contas a Receber | já abriam em Todos | igual (agora com o esqueleto enquanto carrega) |

Sem nenhum projeto cadastrado, a tela diz "Nenhum projeto cadastrado. Cadastre o projeto em Projetos.".

### Achados fora do escopo (registrados, não mexidos)

- **Despesas, placeholder da descrição:** "Objeto da compra (ex.: 20 sacos de cimento CP-II para a laje do 2º pav.)". É terminologia de construção que a trava de terminologia não pega ("cimento", "laje"). Fica para o **GA-9**.
- **`receita-projetos-matrix.tsx`, `despesa-linhas-editor.tsx` e as telas do Orçamento** (`budget-matrix.tsx`, `budget-planning-screen.tsx`) aceitam **só `.xlsx,.xls`**, conferido no `accept`. A action `budget.ts` não confere a extensão no servidor. Elas leem cabeçalhos de mês com `cellDates`: não é o defeito do K1 (não aceitam CSV), mas a leitura de data de célula pode ter o mesmo problema de fuso do XLSX do K1. Sugiro passá-las ao leitor do K1 num prompt próprio.
- **`scripts/varredura-terminologia.mjs`:** a área "regras" antes contava também os arquivos da Cris (`ai/`, `agent/`, `assistente-base/`). Os filtros do `rg` não pegavam esses caminhos; reproduzindo a regra antiga, o contador novo dá 0 diferenças. Agora ela os exclui, como o nome da área diz (17 contagens menores nessa área).

## 2. Suíte

| Conferência | Resultado |
|---|---|
| `npm run typecheck` | 0 erros |
| `npm run lint` (agora `--max-warnings 0`) | 0 erros, **0 avisos** |
| `npm run test:db`, banco em **America/Sao_Paulo** (o `test-db.sh` aplica) | **288 arquivos, 2516 testes, 0 pulados** |
| A mesma suíte numa **cópia sem `.git`** (`git archive HEAD`): typecheck, lint e `test:db` | **288 arquivos, 2516 testes, 0 pulados** |

## 3. `conferir-demo`

Base da demonstração recriada do zero com o código novo: migrações pelo `migrate.ts` com UTC, seed na data fixa e `conferir-demo`.

Resultado: **"✓ Todas as conferências passaram."**
- Consolidado: contratado R$ 4.330.000,00; medido R$ 2.026.000,00; recebido R$ 1.778.500,00.
- 562 despesas.

## 4. Prints (enviados na conversa)

- **H1:** Dashboard, DRE, Fluxo, Resumo e Contas a Receber em 1280, 1440 e 1920 px, antes e depois.
- **H2:** Despesas e Equipes abrindo com dados.
- **H3:** o esqueleto do Fluxo de Caixa enquanto carrega.
- **K3:** anexo gravado com o tipo "Documentos do contratante".
- **Importação de extrato CSV** (UTF-8 sem BOM, cabeçalho "Histórico"): a prévia mostra **03/07/2026 · DIA 3 JULHO · −R$ 20,00** e 25/07/2026 · DIA 25 JULHO.

## 5. H4 · Proposta para o Dashboard (não implementada)

**Medido na demonstração** (Todos os projetos, todo o período; o mesmo da base recriada):

| Cartão | Orçamento | Previsão Atualizada | Atual |
|---|---|---|---|
| Valor contratado | R$ 4,3 mi | R$ 4,3 mi | R$ 4,3 mi |
| Realizado acum. | **R$ 0** | **R$ 0** | R$ 2,7 mi (entradas de caixa) |
| A receber | **R$ 4,2 mi** (receita planejada − realizado) | **R$ 4,3 mi** | R$ 247,5 mil (recebíveis em aberto) |
| A pagar | — | — | R$ 210,3 mil (contas em aberto) |

**O problema:**
- **"Realizado acum." = R$ 0 nas versões de plano** é verdade técnica (plano não tem caixa), mas parece erro.
- **"A receber" põe lado a lado duas naturezas.** No plano é saldo a realizar (R$ 4,2 mi); no Atual são títulos em aberto (R$ 247,5 mil). A diferença de 17 vezes não significa nada.

**Proposta (para decisão do dono):**
1. **Os cartões de caixa** (Realizado, A receber, A pagar) **ficam só na coluna Atual.** Nas colunas de plano, uma linha discreta: "não se aplica a versão de plano".
2. **Um bloco novo "Planejado × realizado"** só compara grandezas da mesma natureza:

   | | Orçamento | Previsão | Atual |
   |---|---|---|---|
   | Receita | R$ 4,21 mi | R$ 4,33 mi | medido R$ 2,03 mi |
   | Custo | R$ 3,07 mi | R$ 3,30 mi | apropriado R$ 1,80 mi |

   Cada coluna leva a % de execução.
3. **Se preferir manter o layout:** só renomear por coluna. No Atual, "A receber (em aberto)"; no plano, "Saldo a realizar". O "Realizado acum." do plano vira "—" com a dica acima.

## 6. Como o dono confere o fuso do banco na produção

No Coolify, abra o serviço **GA-postgres**, aba **Terminal**, e rode:

```bash
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SHOW timezone;"
```

- `UTC` ou `Etc/UTC`: o banco já estava em UTC e o J1 não mudava nada na produção.
- Qualquer outro fuso (ex.: `America/Sao_Paulo`): os horários gravados até o deploy do GA-13 estão no fuso do banco. Os comparados com "agora" eram os afetados: limite da Cris por hora, reenvio da NFS-e, "o que mudou desde o último backup".

A correção vale nos dois casos: a conexão do app fixa a sessão em UTC. Nada é convertido.

## 7. Pacote

`scripts/pacote-revisao.sh 4f24fb3` gera `pacote-revisao/Growth-Ambiental-<hash>.zip`. O script agora confere `docs/README.md` no lugar do antigo SPEC da raiz. O pacote foi enviado na conversa.

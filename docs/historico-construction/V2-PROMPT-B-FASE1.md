# Prompt B · Projetos — Fase 1, inventário antes de escrever código

Prompt B (25 de 42). Redesenho de `/projeto` (lista + detalhe na mesma rota,
`?proj=<id>`). **Só leitura; nada foi alterado.** SQL em
[`sql/v2-prompt-b-diagnostico.sql`](./sql/v2-prompt-b-diagnostico.sql).

## Dependência do Prompt A — confirmada no código
| Assunto (dono: A) | Onde está hoje |
|---|---|
| Coluna `situacao` Ativo/Finalizado (anulável) | `project.situacao` (migração 0042, PR #87); `setProjectSituacao` grava só ela e loga `project.status.change {from,to}` |
| Fim do projeto ativo global nesta tela | `page.tsx` e `project-manager.tsx` não usam `SelectActive`, `activeId` nem `setActiveProject`; o seletor é o `ProjectPicker` com `?proj=` (e memória por aba) |
| Assinatura explícita das actions | `updateProject(projectId, patch)`, `deleteProject(projectId)`, `createProject(name, duration, opts)` |
| Ordenação da lista | `getTenantContext()` já devolve `ordenarProjetos(...)` (obras por número do nome, depois alfabética; escritórios no fim) — a origem, como a seção 3 pede |
| Badge fixo "Ativo" do `OfficeRow` | já saiu; o escritório usa o `SituacaoControl` |

Resta ao B o que a tabela de responsabilidade lhe dá: layout, blocos, cores,
IA, Orçado x Realizado, retorno `{ ok, error }` das actions e a proteção do
Excluir. **Atenção (produção):** o código do A está no `main`; o que "estar em
produção" exige do usuário é aplicar as migrações pendentes (0046 em diante)
no deploy. Nenhuma migração do B depende de outra fora da ordem.

## O que existe hoje (confirmado no código)
- **Página** (`projeto/page.tsx`, 89 linhas): `getDocuments(tenantId)` traz
  **todos** os documentos da empresa e filtra `projectId` em memória; assina a
  URL do R2 **em série** dentro de um `for`. `PageHeader` **já renderiza**
  eyebrow e subtítulo (voltou no Prompt J) — a NOTA da seção 7 está resolvida.
- **Formulário** (`project-manager.tsx`, 851 linhas): um `Card` por projeto com
  Nome, Duração (editável), Datas, Status (`SituacaoControl`, grava na hora),
  "Fase da obra" (enum antigo, **editável**), Cliente, bloco único "Terreno &
  valor global" (custos, valores, funding, proprietário, forma de pagamento,
  checkbox fora do caixa, indicadores), bloco "Dados fiscais — NFS-e"
  (município, IBGE, UF, CNO, ART, `ObraIncidencia`), Documentos, Salvar e
  **Excluir ao lado**, com `window.confirm`. A frase falsa "A Data de início e
  a Data de fim determinam as colunas mensais do Budget…" aparece **duas vezes**
  (formulário novo e card). Latitude/longitude **não têm campo** em nenhuma
  tela (só o schema).
- **Actions** (`actions/projects.ts`): `createProject` e `uploadProjetoDoc`
  fazem `throw`; `updateProject` e `deleteProject` fazem `return` silencioso;
  `deleteProjetoDoc` não grava `filename`/`storageKey` no log. O `where` **já
  tem** `tenantId` em update e delete (feito no A, seção 38). `createProject`
  provisiona as três versões e a tabela INCC (fica). `durationMonths` ainda é
  gravado quando enviado. Nenhum chamador envia `mesInicial`/`mesFinal`.
- **Schema `project`**: `status` (enum Planejamento/Em andamento), `situacao`,
  `duration_months`, `start_date`/`end_date` ("MM/DD/YYYY"), `mes_inicial`/
  `mes_final` (nulos em toda obra), custos/valores/funding (`numeric`),
  `endereco`, `latitude`, `longitude`, `codigo_municipio_obra`,
  `municipio_obra`, `uf_obra`, `codigo_obra`, `art`, `ponto_raio_metros`.
  **Não existe CEP.**
- **Janela de competências** (Prompt I, 55): já existe a função única
  `projectPeriodMonthsFromDates(start, end)` em `src/lib/planning.ts`, usada
  pelo Budget/Forecast. É dela que a Duração derivada sai (seção 9).
- **Base local**: 3 projetos (1 obra com datas vazias e duração 24, 1 obra
  teste, 1 escritório), 0 documentos de projeto, 0 `budget_line`, 0
  `time_entry`, 2 unidades na versão forecast. Produção: rodar o
  SQL (relatórios A–F).

## Bloqueios — decisões adotadas
| | Decisão |
|---|---|
| **B-1** | Resolvido pelo A (tabela acima). A tela nasce sem seleção global. |
| **B-2** | **Opção 1: Orçado = `budget_line` da versão `budget`** (fonte oficial; o card bate com a tela de Orçamentos). **Regime do Realizado: competência**, o mesmo da DRE — escrito no card ("Realizado por competência, a mesma regra da DRE"). Mapeamento das quatro métricas abaixo. Os números do mockup não entram. |
| **B-3** | Resolvido pelo A: `situacao` separada; a tela mostra o enum antigo como **"Fase (legado)", somente-leitura** (hoje é editável — deixa de ser, sem apagar nada), e "—" quando `situacao` é nula. |
| **CEP** (seção 17) | **Criar** `project.cep` (texto, anulável) na migração **0062**, aditiva, com `down`. Sem ele o bloco Localização fica incompleto e o custo é zero. |
| **Menu `[...]`** (seção 8) | Contém **"Abrir projeto"** (vai para `?proj=<id>`, só na visão Todos), **"Copiar link"** e **"Excluir projeto…"** (abre o diálogo da seção 37). O Excluir sai de perto do Salvar. |
| **Título** (nomenclatura × seção 7) | A tabela de nomenclatura (revisão mais recente) manda **"Projetos"**; o menu já diz "Projetos". Título **"Projetos"**, subtítulo "Projetos — empreendimentos imobiliários · unidades e escritórios". |

## Mapeamento Orçado x Realizado (seção 20) — entregue antes do código
Todas as consultas filtram `tenant_id`; o projeto é validado contra o tenant.
"Custo" no card quer dizer **custos e despesas** (toda categoria devedora da
DRE), para que Resultado = Receita − Custo seja o **Resultado Final da DRE**
(seção 21: regra existente, preservada).

| Métrica | Tabela / coluna | Data | Como |
|---|---|---|---|
| Receita orçada | `budget_line.valor`, `kind = 'receita'`, `version.kind = 'budget'` do projeto (versão padrão, senão a mais antiga — a mesma que `/budget` abre) | `budget_line.mes` (todas) | soma |
| Custo orçado | `budget_line.valor`, `kind = 'despesa'`, mesma versão | `budget_line.mes` (todas) | soma |
| Receita realizada | **a mesma função da DRE** para a versão `atual`: recebíveis das unidades vendidas (`unit.payment_plan`, por mês do vencimento), reembolsos (`reembolso`), revenda de permuta e despesas com categoria "Receita" (`despesa.competencia`) | vencimento / competência | soma |
| Custo realizado | `despesa.valor` da versão `atual`, não canceladas, categoria devedora, mais encargos pagos (`despesa_parcela`, por data de pagamento) — **a mesma função da DRE** | `despesa.competencia` | soma |

Para não nascer uma segunda regra, a montagem dos inputs da DRE
(`versionInputsByMonth` + cascata) sai de `dre/page.tsx` para um módulo
compartilhado, **sem mudar o resultado** (teste compara). A DRE continua sem
ler o caixa (teste `dre-sem-caixa` passa a cobrir o módulo).

**Limitações informadas (seção 20), não contornadas:**
- `conta_receber` não tem competência; recebível lançado à mão **não entra**
  na receita por competência (nem entra na DRE hoje). Fica dito no card.
- Projeto sem unidade vendida não tem receita por competência: o card mostra
  "Sem receita reconhecida", nunca zero.
- Projeto sem `budget_line`: "Sem orçamento lançado". Versão `atual` sem
  despesa e sem unidade: "Sem lançamentos".
- Receita por **caixa** (recebimento efetivo) existe em `conta_receber` e no
  extrato; não entra neste card (regime único por coluna, RG-01).

## Decisões de interface (resumo do que será feito)
1. **Visão Todos**: cards empilhados, cada um com cabeçalho compacto (nome,
   badge Ativo/Finalizado/—, cliente, valor global, duração derivada, datas,
   `[...]`), seguido do formulário em blocos coloridos: Dados · Receitas
   (verde) · Custos (rosa) · Estrutura financeira (azul) · Documentos. Campo de
   **busca** que filtra os cards; seletor com escritórios em grupo próprio.
2. **Visão específica**: "Projeto NOME", Voltar, Dados, **Localização à
   esquerda e Orçado x Realizado à direita**, depois Receitas, Custos,
   Estrutura, Documentos. Sem abas.
3. **Duração**: somente-leitura, contagem de competências das datas; aviso
   quando difere do `duration_months` gravado. Nenhum valor é alterado.
4. **Datas**: fim < início recusado no servidor **só para gravação nova**
   (criação, ou edição que mexe nas datas). Cadastro antigo continua íntegro.
5. **Vazio não é zero**: campos monetários nulos ficam em branco; alerta de
   funding (soma < valor global) informativo.
6. **Localização**: endereço, município, UF, CEP (novo), IBGE (visível, com
   aviso de efeito fiscal), latitude/longitude (aviso quando a obra tem ponto
   registrado — a tabela `time_entry` continua existindo).
7. **Excluir**: diálogo com nome digitado e inventário (unidades, despesas,
   lançamentos de caixa, medições, contas a receber, documentos, linhas de
   orçamento); o servidor confere o nome e grava o inventário no log. A
   exclusão em si **não muda** (física, em cascata).
8. **Actions** passam a devolver `{ ok, error }` (e `id` na criação); a tela
   mostra sucesso e erro.
9. **Documentos**: consulta própria `getDocumentsByProjects` (só
   `project_id IS NOT NULL`), URLs em paralelo; `deleteProjetoDoc` loga
   `filename` e `storageKey`. `getDocuments` **não muda**.
10. **Assistente** (coluna à direita): "Dica da IA" na visão Todos; Completar
    cadastro, Revisar inconsistências, Analisar funding (análises no servidor,
    somente leitura); **Extrair dados de documentos** (propõe, você confirma:
    o documento é validado no banco por tenant e projeto; a proposta entra no
    formulário e o Salvar do usuário grava com `origem: "assistente"` no log);
    **Comparar orçado x realizado** (leitura do card, só na visão específica).
    Sem `editar`, nenhuma proposta pode ser aplicada — a checagem é na action.
11. `mes_inicial`/`mes_final`: **pendência registrada** (seção 48); o
    assistente apenas aponta. Nenhum formulário passa a gravá-los.

## Plano de PRs
| PR | Conteúdo |
|---|---|
| Fase 1 (este) | inventário + SQL |
| B-1 | regras puras (`projeto-regras.ts`: duração derivada, recusas de data e de nome digitado, aviso de funding, inventário), actions `{ ok, error }`, migração 0062 (`cep`), consulta de documentos por projeto, log da exclusão de documento, testes |
| B-2 | tela: cabeçalho, seletor agrupado, busca, blocos coloridos, Localização, diálogo de exclusão, Fase (legado), vazio≠zero, avisos |
| B-3 | módulo compartilhado da DRE + `getOrcadoRealizado` + card Orçado x Realizado + testes de igualdade com a DRE |
| B-4 | assistente (análises, extração de documento, comparação) + relatório final (46 itens) |

## O que não muda (seção 49)
Nenhum valor de `budget_line`, `budget_account`, `despesa`, `cash_entry`,
`conta_receber`, `unit`, `medicao`, `incc_rate`, `payment_plan`; `getDocuments`;
`setActiveProject`/`setActiveVersion` (ficam no código); provisionamento de
versões e INCC; regras de "Valor global" e "Entrada financeira"; regras de
exclusão; `duration_months`/`start_date`/`end_date`/`mes_*`/`status` de
qualquer projeto; `audit_log` gravado.

## Perguntas ao usuário (não bloqueiam; a opção adotada é a não destrutiva)
1. **B-2**: adotei Orçado = Budget oficial e Realizado por competência (igual
   à DRE). Se preferir o comparativo por **caixa** (recebido/pago), é um
   segundo card, não a troca deste.
2. **Título**: "Projetos" (tabela de nomenclatura) em vez de "Projetos &
   Unidades" (seção 7). Se quiser o antigo, é só o rótulo.
3. **Menu `[...]`**: Abrir · Copiar link · Excluir. Quer mais alguma ação lá?

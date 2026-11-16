# Prompt B · Projetos — relatório final (seção 46)

Entregue em 5 PRs: Fase 1 (#196), B-1 (#197), B-2 (#198), B-3 (#199), B-4.
Nenhum dado existente foi alterado, recalculado ou desvinculado.

1. **Arquivos alterados**: `src/app/(app)/projeto/page.tsx`,
   `src/lib/actions/projects.ts`, `src/lib/queries.ts`, `src/lib/db/schema.ts`,
   `src/components/app/project-manager.tsx`, `project-picker.tsx`,
   `projeto-docs.tsx`, `src/app/(app)/dre/page.tsx` (só importa dos módulos
   extraídos), `src/lib/dre-sem-caixa.test.ts`.
   **Novos**: `projeto-regras.ts`, `projeto-analise.ts`, `dre-inputs.ts`,
   `calc/dre-cascata.ts`, `calc/orcado-realizado.ts`, `ai/projeto-doc.ts`,
   `ai/projeto-extract.ts`, `actions/projetos-assistente.ts`,
   `excluir-projeto.tsx`, `orcado-realizado.tsx`, `assistente-projetos.tsx`,
   migração `0062_project_cep.sql` (+ `down/`), testes e docs
   (`V2-PROMPT-B-FASE1/PR1/PR2/PR3/PR4/FINAL.md`, `sql/v2-prompt-b-diagnostico.sql`).
2. **Componentes alterados**: `ProjectManager` (reescrito: cards com cabeçalho,
   blocos, Localização, menu `[...]`), `ProjectPicker` (grupos opcionais),
   `ProjetoDocs` (mensagens de resultado), `PageHeader` (já renderizava).
3. **Campos adicionados**: `project.cep` (texto, anulável). Só esse. Latitude,
   longitude e endereço já existiam e ganharam campo na tela.
4. **Layout**: visão Todos com busca, contador, "Novo projeto"/"Nova unidade"
   sob demanda, cards empilhados editáveis com cabeçalho compacto; blocos
   Dados (branco) · Receitas (verde suave) · Custos (rosa suave) · Estrutura
   financeira (azul suave) · Documentos; visão do projeto com "← Projetos",
   Localização à esquerda e Orçado x Realizado à direita; assistente à direita
   (lilás suave), recolhível; sem abas.
5. **Status Ativo/Finalizado**: coluna `situacao` do Prompt A; dropdown no bloco
   Dados que grava na hora só esse campo (`setProjectSituacao`); badge verde
   suave (Ativo), cinza (Finalizado), "—" quando nulo. Só classificação
   cadastral.
6. **Status antigo preservado**: `status` (Planejamento/Em andamento) não é
   escrito pela tela (deixou de ser editável) e aparece como "Fase (legado)"
   somente-leitura. Nenhum valor mudou.
7. **`SelectActive` removido desta tela**: já não existia (Prompt A); confirmado
   — nenhum uso de `SelectActive`, `activeId`, `setActiveProject` ou cookie.
8. **Seletor apenas local**: `?proj=<id>` desta página (e memória por aba do
   Prompt A); nenhum cookie, nenhum padrão global, nenhuma outra tela muda.
9. **Receita orçada**: `budget_line.valor`, `kind='receita'`, versão `budget`
   do projeto (padrão, senão a mais antiga), todas as competências.
10. **Receita realizada**: versão `atual`, a mesma função da DRE: recebíveis
    das unidades vendidas (`unit.payment_plan`, por mês do vencimento) +
    reembolsos + revenda de permuta + despesas de categoria "Receita"
    (`despesa.competencia`).
11. **Custo orçado**: `budget_line.valor`, `kind='despesa'`, mesma versão.
12. **Custo realizado**: `despesa.valor` da versão `atual`, não cancelada,
    categoria devedora, por `despesa.competencia`, mais encargos pagos
    (por data de pagamento) — tudo o que a DRE deduz.
13. **Assistente**: Todos = somente leitura (dica + 5 análises no servidor);
    projeto = propõe, você confirma (análises, comparar orçado x realizado,
    extrair dados de documento → proposta → formulário → Salvar do usuário com
    `origem: "assistente"`). Permissão conferida na action; documento validado
    no banco por tenant e projeto.
14. **Permissões preservadas**: `projeto: ver/criar/editar/excluir` como antes;
    sem `editar` os campos ficam desabilitados, o Salvar some e a IA não aplica;
    sem `excluir` o item do menu some e a action recusa.
15. **Testes**: puros `projeto-regras` (17), `calc/orcado-realizado` (5),
    `projeto-analise` (5); com banco `actions/projetos-b` (7), `dre-inputs`
    (3), `actions/projetos-assistente` (3); `dre-sem-caixa` cobre os módulos
    extraídos; suíte 157 arquivos / 1486 testes; `tsc`, `eslint`, `next
    build`; navegador em cada PR (listas, criação com dia 25, salvar,
    excluir, card, assistente).
16. **Nenhum dado existente alterado**: migração só adiciona `cep`; actions só
    escrevem o que o usuário salva; o assistente não grava.
17. **Nenhum valor recalculado**: `duration_months` deixou de ser lido e não
    foi tocado; valor global e entrada financeira seguem a regra anterior.
18. **Nenhum documento perdido**: `getDocuments` intacto; a consulta nova só
    filtra; remoção continua desfazendo só o registro (objeto no R2 fica).
19. **Nenhum vínculo alterado**: `projectId`, `storageKey`, `clienteId`,
    versões e unidades intactos.
20. **Limitações**: `conta_receber` sem competência fica fora do Realizado;
    projeto sem unidade vendida não tem receita por competência ("Sem receita
    reconhecida"); recebimento efetivo (caixa) não entra neste card;
    `mes_inicial`/`mes_final` continuam sem tela (seção 48); a exclusão segue
    física (a inativação é tarefa própria, seção 37).
21. **Regime do Realizado**: competência — o da DRE, para o card bater com o
    relatório que o usuário já usa (RG-01: um regime por coluna; escrito no
    card). Caixa seria um segundo card, não a troca deste.
22. **Migrações**: `0062_project_cep.sql` com `down/0062_project_cep.sql`.
23. **`setActiveProject` continua existindo** no código (`actions/context`),
    sem uso nesta tela.
24. **Consultas novas e o filtro de tenant**: `getDocumentsByProjects(tenantId)`
    (`tenant_id = ? AND project_id IS NOT NULL`); `getInventarioDoProjeto
    (tenantId, projectId)` (toda contagem com `tenant_id`, versões do projeto
    por `tenant_id + project_id`); `contarPontoDoProjeto(tenantId, projectId)`;
    `getOrcadoRealizado(tenantId, projectId)` (versões por `tenant_id +
    project_id`; linhas via `versionInputsByMonth`, que lê versão por id já
    filtrada); documento do assistente: `id + tenant_id + project_id`.
25. **Bloqueios**: B-1 resolvido pelo A (tela nasce sem seleção global); B-2
    opção 1 (Orçado = Budget oficial) com Realizado por competência, mapeado
    por escrito na Fase 1 antes do código; B-3 resolvido pelo A, com "Fase
    (legado)" visível e "—" para situação nula.

## Perguntas em aberto para o usuário (não bloqueiam)
1. Prefere também um comparativo por **caixa** (recebido/pago)? Seria um
   segundo card.
2. Título "Projetos" (tabela de nomenclatura) ou "Projetos & Unidades"
   (seção 7)? Só o rótulo.
3. Menu `[...]` com Abrir · Copiar link · Excluir — quer mais alguma ação?

## Produção
Aplicar as migrações pendentes em ordem (0046 → 0062). A 0062 é só uma coluna.

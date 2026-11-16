# Prompt AA · Relatório final — Dashboard

Prompt AA (37 de 42). Quatro PRs:
- **Fase 1:** [PR #238](https://github.com/jorguzz-fer/growth-construction/pull/238)
- **AA-1:** [PR #239](https://github.com/jorguzz-fer/growth-construction/pull/239)
- **AA-2:** [PR #240](https://github.com/jorguzz-fer/growth-construction/pull/240)
- **AA-3:** o assistente e este relatório.

Detalhes em [`FASE1`](./V2-PROMPT-AA-FASE1.md), [`PR1`](./V2-PROMPT-AA-PR1.md),
[`PR2`](./V2-PROMPT-AA-PR2.md) e [`PR3`](./V2-PROMPT-AA-PR3.md).

## 1. BAA-1 e os dezesseis cartões

**Sem decisão**, porque é a mesma do BV-1, que segue aberta. O painel ficou.
- **Sem serviço ou cadastro:** "—", com o que falta (3.2, 3.5).
- **Os dois cartões que afirmavam fato falso (3.1):**
  - com a chave **desligada**, mantêm o número e passam a dizer que é valor
    do cadastro;
  - com a chave **ligada**, mostram "—".
- **Pergunta ao cliente:** vocês têm a PLS de cada obra, e o engenheiro mede
  por % ou por valor?

## 2. BAA-2: inventário

Na base local há 5 versões e **nenhuma cópia** (`source_version_id` vazio).
Em produção, rodar o relatório 2 de
[`sql/v2-prompt-aa-diagnostico.sql`](./sql/v2-prompt-aa-diagnostico.sql).
**Nenhuma versão foi apagada.**

## 3. BAA-3: quanto estava a mais

Na base local, **R$ 0** nos dois: não há caixa fora da Atual nem obra com
dois Orçamentos. Em produção:
- os relatórios 3 e 4 do SQL;
- a prévia em `/chaves#previa-dashboard`, por obra e cartão.

## 4. BAA-4

**Opção 1.** "Recebido" passou a se chamar **"Entradas de caixa"**, com o
mesmo número, e o texto diz que soma toda entrada, não só venda.
- **Pergunta:** passar a recebimento de venda (opção 2)? Isso iria em outra
  chave.

## 5. BAA-5

**Fica a receita do cadastro, agora declarada** em cada percentual.
- **Pergunta:** trocar pela soma das unidades vendidas?

## 6. BAA-6: catálogo

A camada analítica da seção 28 do Prompt I **não existe**, e a seção 58
"ainda não foi escrita". Por isso a Parte 7 seria infraestrutura (DRE,
Consolidado e Projeção) e **não começou**. Não há catálogo nem métricas de
estreia, e "Montar outra análise" aparece desabilitada com esse motivo.
- **Pergunta:** quem cria a camada analítica, e quando?

## 7. Os seletores e os 28 cartões

- **Os 4 de cima** já seguiam a versão e o período.
- **Status e margem:**
  - Com a chave **ligada**, seguem o período. O caixa vai pela data; as
    despesas e o Orçamento, pela competência. A receita do cadastro não tem
    data e é declarada como total.
  - Com a chave **desligada**, declaram que não seguem.
- **Os 16 da obra:** cadastro e medição; declaram que não seguem.
- **Projetos:** os três painéis recebem a lista de projetos do escopo.
- **As novas assinaturas:**
  - `getStatusProjeto(tenantId, projectIds, { definicaoNova, de, ate })`
  - `getIndicadoresObra(tenantId, projectId, { definicaoNova })`
  - `getIndicadoresObraConsolidado(tenantId, projectIds, { definicaoNova })`

## 8. O modo `all`

O fallback para o cookie **já tinha saído** no Prompt A
(`lerEscopoDeRelatorio`). "Todos" soma, obra a obra, em todos os cartões.

## 9. Rótulos e versões

**Nenhum `version.label` foi reescrito e nenhuma versão foi apagada.** A
natureza da versão é só rótulo de tela.

## 10. A chave

- **`dashboard_definicao_nova`**, uma só para o conjunto, nasce desligada.
- Liga e desliga em `/chaves`. A prévia mostra hoje × nova × diferença, por
  obra e cartão.
- Liga: 4-B.1, 4-B.2, 4-B.3, 4.5, 4.2, 3.1 e 2.3.2.

## 11. As correções herdadas (Parte 5)

Nenhuma entrou ainda: Prompt I §54–58, os helpers de data, o Prompt R já
entregue, o Prompt L e o BV-1.
- **O que já chega aqui:** o saldo da parcela em "A pagar" (Prompt R, §15)
  já estava antes deste prompt.
- **Os números de hoje:** estão no relatório 9 do SQL e na prévia. São a
  base para medir cada correção quando ela entrar.

## 12. Parte 7

**Nada foi criado.** Não há tabela nova (ver 6).

## 13. Consultas novas, todas com o tenant no SQL

- `getStatusProjeto`: `project`, `version`, `cash_entry`, `despesa` e
  `budget_line`, filtrados no SQL por `tenant_id` e pelos
  projetos/versões. Antes vinha a tabela inteira do tenant.
- `getIndicadoresObra`: `servico` com `tenant_id`; `medicao_servico` com
  `tenant_id` e `servico_id IN (…)`.
- Caixa dos KPIs (`versionSummary`): `tenant_id` e `version_id`.
- `previaDashboardDefinicaoNova`: as mesmas funções da tela, mais o caixa
  por `tenant_id` e `version_id`.

## 14. Sem escrita

**A tela e o assistente não gravam nada.** A prévia é só leitura (há teste
de contagem). O assistente guarda no navegador do usuário só a preferência
de recolher e os números da última visita.

## 15. Funções que não foram alteradas

`getMonthlyRevenue`, `getReceivables` e `getContasPagar`.

## 16. Migrações

**Nenhuma.** A chave usa a tabela `tenant_flag`, que já existe.

## 17. Limitações e perguntas

- **Parte 4-A, os gráficos:**
  - A linha de receita está bloqueada pelo Prompt I §54–57.
  - O gráfico de caixa depende do critério de conciliação (4.4 e Prompt L,
    Parte 7).
  - **Não foram feitos. Pergunta:** fazer já o gráfico de caixa, declarando
    "conciliado ou não", ou esperar a decisão de conciliação?
- **1.5, seleção livre de vários projetos:** os escopos Todos, Ativos e
  Finalizados cobrem o consolidado.
  - **Pergunta:** precisa marcar um conjunto livre? Isso muda o seletor
    comum a várias telas.
- **O mais recente × o mais antigo:**
  - A seleção padrão e o Orçamento do "Executado" (com a chave) usam a
    versão **mais recente**, como pede o AA.
  - A DRE, o Fluxo e o consolidado do Dashboard usam a **mais antiga**.
  - **Pergunta:** qual regra vale em todas as telas?
- **Na base local,** nenhuma obra tem datas de início e fim. A margem nova
  usa "todas as competências" e diz isso.
- **"Obras que merecem atenção":**
  - Não aponta medição recente, porque não há medição por serviço.
  - Não aponta caixa projetado, porque o Dashboard não calcula esse número.
  - O painel diz os dois motivos.

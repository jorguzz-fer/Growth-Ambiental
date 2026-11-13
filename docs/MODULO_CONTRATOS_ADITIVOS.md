# Growth Ambiental · Módulo de Contratos e Aditivos

Gestão contratual para consultoria ambiental, arqueologia, patrimônio cultural e
serviços técnicos. Genérico e configurável por empresa (a o primeiro cliente é o primeiro
cliente, mas nada é específico dela).

## 1. Arquitetura — uma camada sobre o que já existe

O módulo **não cria um segundo motor financeiro**. Ele organiza, por contrato,
registros que o sistema já tinha:

| O que o contrato precisa | O que o módulo usa | Consequência |
|---|---|---|
| Faturamento | `conta_receber` com a coluna nova `contrato_id` | Baixa, conciliação e cancelamento continuam em **Contas a Receber**; a DRE e o Fluxo de Caixa (versão Atual) já leem a conta pelo vencimento — **sem duplicar**. |
| Recebimentos | `conta_receber_recebimento` (não estornados) | O recebido do contrato é a soma dos recebimentos das faturas dele. |
| Custos | `despesa` com a coluna nova `contrato_id` | Apropriar não muda valor, conta, categoria nem a DRE do projeto. |
| Despesas reembolsáveis | `contrato_reembolso` → `despesa` | Valor, fornecedor, categoria e comprovante vêm da despesa (sem cópia). |
| Documentos | `document` com `contrato_id`, `contrato_aditivo_id`, `contrato_medicao_id` | Mesmo R2, mesmas permissões, mesma versão por tipo. |
| Cliente contratante | `cliente` | O cadastro de Clientes já existente. |
| Código do contrato | `number_sequence` (entidade `contrato`, prefixo `CT`) | Numeração atômica, sem repetição sob concorrência. |
| Histórico | `audit_log` | Toda ação grava quem, quando e o antes/depois. |
| Orçamento × Previsão × Realizado | `versionInputsByMonth` (o motor da DRE) | Mesmas chaves (`dre_definicao_nova`, rateio) da tela DRE. |

A medição de contrato ganhou tabela própria (`contrato_medicao`) porque a
`medicao` existente é outra coisa: valor por grupo CEF, informativo, sem item,
sem limite e sem aprovação. O padrão dela foi reaproveitado (competência,
documentos, autor, auditoria).

### Arquivos

| Camada | Arquivo |
|---|---|
| Regras puras (status, eficácia, valor, limites, saldo, guarda-chuva) | `src/lib/contrato-regras.ts` (+ `.test.ts`) |
| Ações do servidor | `src/lib/actions/contratos.ts` (+ `.test.ts`, integração) |
| Leituras (lista, detalhe, painel, relatórios, planejamento) | `src/lib/contratos-queries.ts` |
| Formulário da Cris (extração de contrato) | `src/lib/contrato-cris.ts` (+ `.test.ts`) |
| Ferramenta de leitura da Cris | `src/lib/cris-dados.ts` / `cris-dados-ferramentas.ts` (`contratos_e_saldos`) |
| Base de conhecimento da Cris | `src/lib/assistente-base/contratos.ts` |
| Modalidades iniciais | `src/lib/contrato-modalidades.ts` (provisionamento e seed) |
| Opções do formulário | `src/lib/contratos-opcoes.ts` |
| Telas | `src/app/(app)/contratos/**`, `src/components/app/contratos/**` |
| Permissões e menu | `src/lib/permissions.ts`, `src/lib/nav-menu.ts`, `src/components/app/sidebar.tsx` |
| Backup | `src/lib/backup-catalogo.ts` (as 9 tabelas novas decididas) |
| Numeração | `src/lib/db/numbering.ts` (`reservarNumero`) |

## 2. Modelo de dados (migração `0077_contratos.sql`, aditiva)

Tabelas novas, todas com `tenant_id` obrigatório e chave estrangeira para `tenant`:

- `contrato_modalidade` — nome único por empresa, `ativo`, `ordem`. Semeada com as 13 modalidades iniciais para as empresas existentes (na migração) e para as novas (no provisionamento).
- `contrato` — identificação, responsáveis, datas, condições financeiras, `status`, `versao` (concorrência otimista), `tipo` (`contrato` | `derivado` | `ordem_servico`), `contrato_principal_id` e `vinculo_valor` (`consome_limite` | `adicional`). Código único por empresa.
- `contrato_projeto` — N:N contrato × projeto, com `valor_alocado` opcional. Único por par.
- `contrato_item` — código único por contrato, quantidade, unitário, total, critério de medição, projeto, etapa, datas, responsável, `origem_aditivo_id` (item incluído por aditivo), cancelamento lógico.
- `contrato_aditivo` — número sequencial por contrato (único), tipos combináveis (`jsonb`), **variação** de valor (`valor_delta`), novo término, datas de solicitação, aprovação, assinatura e vigência, situação, motivo, aprovador.
- `contrato_aditivo_item` — variação de quantidade e valor de um item existente trazida pelo aditivo.
- `contrato_marco` — cronograma: etapa, datas planejada e realizada, valor previsto, situação.
- `contrato_medicao` — contrato, item, projeto, marco, período (`MM/YYYY`), quantidade ou percentual, valor, situação, aprovador, **chave de idempotência única**.
- `contrato_reembolso` — vínculo despesa × contrato, solicitado, aprovado, situação, conta a receber que cobrou; **uma despesa ativa em um reembolso só** (índice único parcial).

Colunas novas, todas nulas: `conta_receber.contrato_id`, `conta_receber.idempotency_key` (único parcial por empresa), `despesa.contrato_id`, `document.contrato_id`, `document.contrato_aditivo_id`, `document.contrato_medicao_id`.

Nenhuma linha existente é alterada; nenhum número de tela muda. Rollback em `migrations/down/0077_contratos.sql`.

## 3. Regras de negócio

### Valor e aditivos
- **O valor original não é reescrito.** Depois de o contrato valer (ativo em diante), valor e término originais só mudam por aditivo; a edição do cadastro recusa.
- **Valor atualizado = original + aditivos eficazes.** Eficaz = **assinado**, não cancelado, com vigência iniciada (a vigência, ou, sem ela, a data de assinatura).
- Aditivo **aprovado** e ainda não assinado, ou assinado com vigência futura, aparece como "pendente de eficácia": não muda valor, prazo nem limite.
- Transições: rascunho ⇄ negociação → aguardando aprovação → aprovado → assinado. **Aprovar, rejeitar e cancelar um aditivo aprovado ou assinado** exigem a permissão `contratosaprovar`. Assinar exige a data.
- **Formalizado não se edita nem se apaga.** Correção = cancelamento motivado (fica no histórico) ou novo aditivo.
- Assinar uma redução (ou cancelar um acréscimo assinado) é recusado se deixar o contrato ou algum item **abaixo do já medido e aprovado**.
- A evolução histórica (original → AD01 → AD02 …) fica na Visão geral; o exemplo do pedido (500 → 580 → 615 → 600 mil) está nos testes.

### Itens e medição
- Critérios por item: quantidade executada, percentual de avanço, entrega concluída, marco contratual, valor fixo periódico. O valor da medição sai do critério (quantidade × unitário, ou % do valor vigente); nos demais, é o valor informado.
- **Limite do item** = valor original + variações dos aditivos eficazes. Item incluído por aditivo só vale quando o aditivo vale.
- Com o contrato valendo, item novo entra **por aditivo** e quantidade/valor de item existente mudam **por variação de aditivo**.
- **Só medição aprovada conta.** A aprovação trava o contrato (`SELECT … FOR UPDATE`) e confere o acumulado aprovado do item e do contrato: aprovações simultâneas acontecem em fila e nunca ultrapassam o limite (teste com 4 aprovações paralelas).
- A mesma medição enviada duas vezes (mesma chave) entra uma vez.
- **Medição não é faturamento, recebimento nem receita.**

### Guarda-chuva
- Derivado ou OS que **consome o limite**: a soma deles não passa do valor atualizado do principal (recusado na criação, na edição e na assinatura de aditivo do derivado).
- Derivado **adicional**: valor juridicamente novo, soma no consolidado.
- Consolidação do principal **sem dupla contagem**: total = principal + adicionais; medido, faturado e recebido somam todos (são registros distintos). O exemplo do pedido (2 mi; 650 + 480 + 370; 500 mil livres) está nos testes.

### Saldo (todos derivados, nunca digitados)
Valor original · acréscimos e reduções eficazes · valor atualizado · comprometido em derivados · alocado aos projetos · medido aprovado · em aprovação · faturado · recebido · **saldo a medir** · **medido não faturado** (negativo = faturamento à frente da medição, permitido com aviso) · **faturado não recebido** · saldo não comprometido · retenção estimada (informativa). Contas em centavos inteiros.

### Faturamento e recebimento
- Faturar exige `contratosfinanceiro: criar` **e** `contasreceber: criar` (a fatura é uma conta a receber) e um projeto vinculado ao contrato. Idempotente pela chave da tela.
- A fatura usa o tipo "Outros" da conta a receber (lista fechada intacta), com a descrição citando o contrato.

### Reembolso
- Pendente → solicitado → aprovado (valor aprovado ≤ solicitado) → faturado (vinculado a uma conta a receber **do mesmo contrato**) → recebido. Rejeitado pode reabrir. Cancelamento lógico com motivo; faturado não se cancela sem antes desfazer.
- O reembolso não cria receita sozinho (ver §5).

## 4. Permissões

| Chave | O que libera | Padrão |
|---|---|---|
| `contratos` | ver, criar, editar e cancelar itens; cronograma; projetos; documentos; modalidades (editar) | owner/admin total; membro no padrão antigo: ver/criar/editar |
| `contratosaditivos` | registrar e encaminhar aditivos | idem |
| `contratosmedicao` | lançar e enviar medições | idem |
| `contratosaprovar` | aprovar/rejeitar aditivos e medições; cancelar aditivo formalizado e medição aprovada | **sensível**: só owner/admin; concede-se por membro na Gestão de Acessos |
| `contratosfinanceiro` | abas Faturamento e Custos, faturar, apropriar custos, reembolsos, relatório e exportação | owner/admin total; membro (padrão antigo) ver/criar/editar |

O contador não recebe nenhuma por padrão (pode receber "ver" por override; o teto de leitura impede o resto). Todas as ações conferem a empresa no servidor: id de outra empresa responde "não encontrado" (teste de isolamento com 10 ações).

## 5. Integração contábil — política proposta (AGUARDA VALIDAÇÃO)

Nada abaixo foi implementado como regra nova: o módulo segue o comportamento que
o sistema **já tinha** (a receita da DRE Atual vem das contas a receber, pelo
vencimento). Os pontos que dependem de decisão:

1. **Reconhecimento da receita de serviço.** Hoje: fatura → conta a receber → receita na DRE no mês do **vencimento**. Proposta (CPC 47): reconhecer pela **competência da medição aprovada** (obrigação de desempenho satisfeita ao longo do tempo, medida pelo avanço), com a fatura e o recebimento apenas como eventos de caixa e de recebível. Implementação sugerida: chave de mudança `contratos_receita_por_medicao` (nasce desligada, com prévia), que faria a DRE ler a medição aprovada no lugar das faturas de contrato — sem duplicar, porque as faturas de contrato sairiam da receita quando a chave estiver ligada. **Decisão:** manter vencimento, ou adotar medição, ou por contrato (campo "política de reconhecimento")?
2. **Reembolso de despesas.** Hoje, se faturado como conta a receber, entra como receita (regra atual). Alternativas: (a) receita bruta + custo (como hoje); (b) **recuperação de custo** (a fatura de reembolso abate a despesa, fora da receita); (c) depende da cláusula contratual. **Decisão necessária** antes de criar o botão "faturar reembolsos selecionados".
3. **Retenção contratual.** Hoje é informativa (sobre o faturado). Decidir se a fatura passa a ter valor bruto e líquido e onde a retenção a liberar aparece (contas a receber de longo prazo?).
4. **Reajuste por índice.** O contrato guarda índice e data-base; o cálculo do reajuste anual (aniversário) sobre o saldo a medir ainda não existe — é a próxima etapa de "Índices de Reajuste".
5. **Orçamento por contrato.** O Planejamento do sistema é por projeto (versões Budget/Forecast). O módulo mostra Orçamento × Previsão × Realizado **dos projetos** do contrato. Orçamento próprio do contrato e "proposta de revisão orçamentária a partir do aditivo" dependem de decidir se o contrato vira dimensão do Planejamento (linha de orçamento com `contrato_id`) ou se contrato e projeto devem ser 1:1 para orçar.

## 6. Interface

- **Contratos → Contratos**: lista com busca e filtros (cliente, projeto, tipo, gestor, situação, período), totais sem dupla contagem.
- **Novo contrato**: formulário completo, projetos com valor alocado, itens; preenchimento proposto pela Cris a partir do PDF.
- **Página do contrato** (9 abas): Visão geral (KPIs, guarda-chuva, dados, evolução do valor, ações de situação) · Escopo e itens (itens com limite, medido, saldo; cronograma físico-financeiro) · Projetos · Aditivos (fluxo completo, variação por item) · Medições (lançar, enviar, aprovar, rejeitar, cancelar) · Faturamento e recebimentos (faturar, recebido, despesas reembolsáveis) · Custos e resultados (custo apropriado, margem gerencial, Orçamento × Previsão × Realizado dos projetos) · Documentos (upload por tipo e aditivo, versão) · Histórico (auditoria do contrato e de tudo que é dele).
- **Painel de Contratos**: ativos, contratado, disponível para medição, medições e aditivos pendentes, vencendo em 60 dias, margem por contrato, rentabilidade por cliente; exportável em PDF.
- **Aditivos** e **Medições de Contrato**: listas consolidadas com filtro de situação.
- **Despesas Reembolsáveis**: relatório por contrato e período, totais solicitado/aprovado/recebido/pendente, comprovantes; **PDF** (impressão) e **XLSX**.
- **Modalidades de Serviço**: criar, renomear, desativar, reativar.

## 7. Cris

- **Leitura** (`contratos_e_saldos`): resumo, aditivos, medições, financeiro e prazos; filtros por código/título e "vigentes"/"vencendo em 60 dias". Confere `contratos: ver`; faturado, recebido e custos só com `contratosfinanceiro: ver`. Cliente pessoa física não vai ao modelo (só aparece o nome de CNPJ). Máximo de 30 contratos por resposta.
- **Extração assistida**: na tela "Novo contrato", a Cris recebe o contrato em PDF (ou texto) e propõe cliente, objeto, valor, datas, condições, regras de medição e reembolso e até 10 itens. Tudo vai para o formulário, com os campos duvidosos marcados para conferir; **nada é gravado sem o botão**. O conteúdo do documento é dado: os valores passam pelas mesmas validações do servidor.
- **Base de conhecimento** com as regras e os caminhos do módulo.

## 8. Testes

| Arquivo | Cobre |
|---|---|
| `contrato-regras.test.ts` (18) | exemplo 500→600 mil; eficácia; prorrogação; transições; saldo 600/350/300/250; centavos; limites por item; medição acima do limite e após aditivo; critérios; guarda-chuva 2 mi sem dupla contagem; comprometimento |
| `contrato-cris.test.ts` (2) | campos do formulário de extração; itens propostos |
| `actions/contratos.test.ts` (13, banco) | 1–3 criação, cliente, projetos, vários contratos por projeto · 4 guarda-chuva · 5–8 aditivos de acréscimo, redução, prazo, histórico, formalizado imutável · 9–11 medições parciais, acima do limite, após aditivo, redução abaixo do medido · 21 concorrência (4 aprovações paralelas) e idempotência · 12–13, 17–18 fatura idempotente lida uma vez pela receita da DRE, recebimento parcial e estornado · 14 reembolsos e relatório · 15–18 Orçamento/Previsão/Realizado pelo motor da DRE, apropriação sem mudar a DRE · 19 permissões · 20 isolamento entre empresas · 22 cancelamentos, correções e concorrência otimista · Cris (permissão, financeiro, pessoa física, empresa) · modalidades |
| `nav-menu.test.ts`, `backup-catalogo.test.ts` | menu e catálogo de backup com as telas e tabelas novas declaradas |
| `migrations-seguras.test.ts` | 0077 aditiva, idempotente, com rollback |

**Portão de qualidade (`test:all` + build):** typecheck ✓ · lint ✓ · `test:db` 286 arquivos, 2.329 testes, **0 pulados** · `next build` ✓.

Validação de interface: as 17 telas e abas abertas no navegador sem erro; fluxo de ponta a ponta pela tela (criar → ativar → aditivo → aprovar → assinar → medição 40% → aprovar → faturar).

## 9. Limitações e pendências

- Decisões contábeis do §5 (reconhecimento de receita, reembolso, retenção, reajuste, orçamento por contrato).
- **Word (.docx)**: a Cris lê PDF e imagem; contrato em Word precisa ser salvo em PDF (ou colado como texto) até a extração de .docx entrar.
- A fatura do contrato é por contrato (não por medição): "medido não faturado" é no total do contrato, não por item.
- Despesa reembolsável e apropriação de custo escolhem despesas da versão Atual dos projetos do contrato; não há ainda o campo "contrato" no lançamento de despesa (a apropriação é feita pela tela do contrato).
- Responsáveis (gestor, coordenador…) são texto livre, não vínculo com usuário; o filtro por gestor usa o texto.
- Alocação de equipes por contrato (custos de pessoal por contrato) não foi feita: as equipes continuam por projeto.
- Documentos dependem do R2 configurado (como o resto do app).

## 10. Migrations

- `src/lib/db/migrations/0077_contratos.sql` (+ entrada no `meta/_journal.json`)
- `src/lib/db/migrations/down/0077_contratos.sql`

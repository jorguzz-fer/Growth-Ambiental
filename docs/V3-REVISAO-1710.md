# Revisão V5 — reuniões de revisão com o Thiago (transcritos v4 e v5)

Instruções extraídas dos dois transcritos recebidos em 18/10/2026: a primeira
reunião percorre Business Intelligence, Planejamento e Receitas; a segunda,
Despesas, Caixa, Obra, Pessoas e Configurações. Só o que é instrução entrou
aqui; a conversa em si não foi guardada. Substitui, onde conflita, a revisão
de 14/10 ([`V3-REVISAO-1410.md`](./V3-REVISAO-1410.md)). As decisões que
isto fecha ou reabre estão em [`V3-DECISOES-1810.md`](./V3-DECISOES-1810.md).

A coluna "No código" é o que o `main` faz em 18/10, verificado.

## Transversal

| Instrução | No código |
|---|---|
| **Chat flutuante em todas as telas**, ciente da tela em que está, capaz de cruzar dados de outras telas ("essas despesas, cruza com as vendas de tal unidade"). O Thiago testa também a versão por tela; a preferência dele é flutuante. | Chat flutuante existe (Etapa 2), só responde ao catálogo de 4 métricas. |
| **Nas telas de relatório** (BI): o chat faz análises sobre a tela, outras consultas e simulações sobre os números ("como se fosse o ChatGPT aberto sobre os dados"). | Nada. Painéis somente leitura. |
| **Nas telas de cadastro e lançamento:** o chat lança por voz ou texto, lê documento subido e preenche parte ou a totalidade dos campos. **A confirmação pelo botão da tela continua obrigatória em todas**, por auditoria. | Leitura de documento existe em 9 telas, sempre como proposta. Voz não existe. |
| **O chat explica o sistema** ("o que é", "como funciona", "o que fazer primeiro"): resolve a falta de instrução nas telas. | É a função da tela Assistente (`/diagnosticoia`), que sai. |
| **Nome do chat:** um nome próprio (como "Jarvis"); antes era "Cris". O Thiago batiza. | Rótulo "Assistente". |
| **Entrada por WhatsApp e app no celular** para o gestor em campo lançar despesa com foto da nota. | Nada. Futuro, não desta fase. |
| **Mapa de calor de cliques** para usabilidade. | Futuro, depois de 5 a 10 clientes. |

## Business Intelligence

| Tela | Instrução | No código |
|---|---|---|
| Dashboard | Visão padrão com dois gráficos centrais: **fluxo de caixa em linhas** (entradas, saídas) e **DRE em barras empilhadas** (receita, custo variável, despesa variável, custo fixo, despesa fixa, lucro numa barra). Por projeto ou empresa. | Sem gráficos (Prompt AA, 4-A). `charts.tsx` existe. |
| Dashboard | O chat monta qualquer relatório a pedido ("uma tabela com a DRE e análise vertical do projeto X"). O padrão é a visão geral; o chat é o relatório livre. | Nada. Substitui a tela Relatórios Customizados? Ver decisões. |
| DRE | Manter a anual e **acrescentar a visão mensal abaixo, na mesma tela**, com os mesmos seletores. Trocar os botões de cenário por **caixas de seleção**. | Mensal existe como modo (`?view=mensal`), não abaixo da anual. Botões, não caixas. |
| DRE | Ao abrir, caiu numa versão que não é a que a empresa usa. | Verificar o padrão de versão. |
| Consolidado | **Sai.** | Tela ativa. |
| Assistente | **Sai** (o chat em cada tela absorve). | Tela ativa. |
| Projeção de Receitas | **Fica**, e **muda do módulo Receitas para Business Intelligence**. É relatório, não lançamento. | Tela ativa em Receitas. Reverte o cancelamento da Etapa 2. |
| Resumo Executivo | Mantido. | — |

## Planejamento

| Tela | Instrução | No código |
|---|---|---|
| Projetos | Chat lança novo projeto por voz ou texto; sobe o contrato e o chat extrai e preenche o cadastro. Demanda real do cliente. O cadastro alimenta Orçamentos, Previsão e Unidades. | Leitura de documento existe (Prompt B). Voz e comando não. |
| Orçamentos | Chat lança por voz/texto e lê arquivo para preencher. Importar planilha funciona. **Avisar antes de sair sem salvar** (susto com dado "perdido"). | Painel somente leitura. Sem aviso de saída. |
| Previsão Atualizada | Mesma tela de Orçamentos. O chat traz o realizado e **substitui os meses passados pelo Atual**; o usuário ajusta os meses futuros à mão, por voz ou por texto. Orçamento fica fixo; Previsão muda mês a mês. | Reprojeção proposta existe (Prompt F). |
| Plano de Contas | Chat lê o que existe e **insere novos planos de contas**. O plano é todo de construção; muda por segmento (consultoria ambiental etc.). | Vedado pela regra 8.2.1 do Prompt G. Decisão 2 de 15/10 pendente. |
| Plano de Contas · de-para | **Cada plano de contas tem exatamente uma categoria da DRE**, editável no cadastro do plano. O sistema já traz o de-para padrão por boa prática (gasto de obra = custo variável, nunca despesa). As categorias da DRE são fixas: Receita, Custo Variável, Despesa Variável, Custo Fixo, Despesa Fixa, Margem de Contribuição, EBITDA, Resultado. O Thiago faz a associação para o cliente. | `chartAccounts` não tem categoria da DRE; a despesa escolhe a categoria livremente. |
| Despesas · categoria | No lançamento, a categoria da DRE **aparece travada**, definida pelo plano de contas escolhido; o usuário não edita. | Campo livre, validado só contra a lista. **Muda número da DRE.** |

## Receitas

| Tela | Instrução | No código |
|---|---|---|
| Clientes | Chat cadastra cliente a partir de foto do documento. Chat traça **perfil dos clientes** da base (relatório, mapa de localização). | Leitura de documento não existe para cliente. |
| Unidades | Ok. | — |
| Simulador | "Descaracterizou": não é mais o que o cliente pediu. É simulador de parcelamento, vindo da planilha deles. Chat gera um relatório para o cliente final. | Prompt N reconstruiu da planilha e manteve calculadora (BN-1). Precisa ser mostrado ao Thiago. |
| Contas a Receber | Chat ajuda a lançar. **Editar valor por linha** e anexar documento. | Edição por linha existe (`canEditar`). Verificar o que falta. |
| Liberações de Obra | Chat explica e ajuda a lançar. | Painel somente leitura. |
| Permuta | **Subir documentos e foto do ativo** (não existe). Chat ajuda a lançar. Ativo vendido entra na programação de recebimento; não vendido transita entre estoque e gestão de ativos. | Sem upload de documento do ativo. |
| Emissão de NF-e | **Entra como última seção do módulo Receitas.** Nota sempre atrelada a uma receita lançada. O Thiago diz que a seção está pronta e vai trazê-la. | Só `docs/EMISSAO-NF.md` e `EMISSOR-CALCULO.md`. Nenhuma tela neste repositório. |

## Despesas

| Tela | Instrução | No código |
|---|---|---|
| Despesas | Tela fica como está. Chat preenche por voz, texto e documento; em despesa recorrente, ajuda a dizer por quanto tempo repete. | Leitura de documento existe; voz não. |
| Despesas · aba "A Pagar" | **Sai**: redundante com a tela Contas a Pagar. | Aba `apagar` existe. |
| Despesas · "Paga por terceiro" | **Bug relatado pelo cliente:** a lista de quem desembolsou vem vazia. Deve listar quem está em Ressarcimentos e acumular saldo lá automaticamente. | A lista é de quem tem o papel "Pagador por Terceiro", concedido em Ressarcimentos (Prompt T). Sem o papel, vazia. Verificar se é falta de papel ou defeito. |
| Despesas · Pendente de NF, Parcelas, Repositório | Ok. Monitorar o tamanho do armazenamento. | — |
| Contas a Pagar | Ok; editar abre a despesa certa. Chat aqui é para **achar e filtrar** despesas, por voz. | — |
| Ressarcimentos | Chat ajuda a cadastrar quem será ressarcido e a controlar saldo. | Painel somente leitura. |
| Acerto Contábil | **Fica como tela** (pagamento único quitando várias despesas, de obras diferentes). Chat seleciona por voz ("todas as despesas da filial X") e marca como pagas. | Tela ativa. Reverte a decisão da Etapa 1 (aba "Acertos"). |
| Fornecedores | Chat lê arquivo e preenche o cadastro; confirmação obrigatória. **Renomear "Fornecedores & Stakeholders" para "Fornecedores e Parceiros"**: nada em inglês. | Rótulo em `permissions.ts`; o vocabulário "stakeholder" está em funções e componentes. |
| Cartões de Crédito | **Muda do módulo Despesas para o módulo Caixa.** Ver Caixa. | Item em Despesas. |

## Caixa

| Tela | Instrução | No código |
|---|---|---|
| Caixa | Tela central: conciliação bancária. **Open Finance** como caminho preferido; senão, upload de extrato e o chat ajuda a conciliar. Não é por projeto: são as contas da empresa. Fechamento por conta; mostrar saldo por conta e somado. **Contas de sócio não entram** (ficam em Ressarcimentos). Onboarding começa aqui: cadastrar contas, puxar saldo, primeira conciliação. | Pluggy (`src/lib/openfinance`) e worker de sincronização existem. Terceiros já excluídos (`caixa/page.tsx`, 192). |
| Caixa · projeção | Entradas e saídas com data futura devem aparecer na cadeia dos próximos dias ("quanto eu prevejo fechar"). | Cadeia de dias tem rótulo "Projeção". Verificar se lê contas a pagar e a receber. |
| Caixa · ajuste | Ok, desde que auditável. | — |
| Contas Correntes | Ok. | — |
| Cartões de Crédito | Tela parecida com o Caixa, dentro do módulo Caixa: cadastro do cartão com vencimento; despesa paga no cartão vai para a próxima fatura; Contas a Pagar lê o total da fatura no vencimento; detalhe da fatura dentro da tela; pagamento parcial deixa resto para o próximo período; juros lançados como despesa; **upload do extrato do cartão e conciliação**, oferecendo lançar o que não foi lançado; Open Finance do cartão se possível. | Cartões existe (Prompt U) com fatura e projeção. Sem extrato nem conciliação. |
| Balanço do Dia | **Sai**: redundante com o fechamento do dia no Caixa. | Tela ativa; único leitor de `daily_closing`. |

## Obra

| Tela | Instrução | No código |
|---|---|---|
| Medição de Obra | **Renomear para "Medição de Projeto"** (nome genérico para outros segmentos). Chat lança por voz para o engenheiro. A tela não alimenta relatório; a DRE segue a competência. | Rótulo em `nav-menu.ts` e `permissions.ts`. |
| Estoque | Entrada ok; **falta dar baixa (saída/consumo)**. Manter as perguntas prontas do painel, mas com a caixa de conversa embaixo. | Saída existe (`estoque-manager.tsx`, `SAIDA_MOTIVOS`). Verificar por que não foi vista. |
| Parâmetros / INCC | **Tirar o seletor de projeto**: o INCC é um só por empresa. Chat explica e projeta. Buscar o índice oficial quando o mês fecha (futuro). Onde incide poderia ser decisão da empresa (futuro). | INCC é **por projeto** no banco (`incc_project_mes_uq`). Mudar é modelo de dados. |

## Pessoas

| Tela | Instrução | No código |
|---|---|---|
| Funcionários | Só CLT; prestador vai em Fornecedores e Parceiros. Chat ajuda a cadastrar. Folha: futuro. | — |
| Equipes de Projetos | Deve listar funcionários **e** parceiros/prestadores de Fornecedores. | Já lista os dois (`alocaveis` com `stakeholderId` e `funcionarioId`). |

## Configurações

| Tela | Instrução | No código |
|---|---|---|
| Empresa | Chat ajuda a preencher. Logo ok. | — |
| Usuários | Chat ajuda a cadastrar; ao escolher papel (ex.: contador) **sugerir as telas**, editável. **Verificar** a restrição de telas por papel: o cliente disse que não funcionava. | Matriz de acessos existe (Prompts AJ/AI). |
| Auditoria | Ok. Chat filtra ("só o que fulano lançou"). | — |
| Numeração | Ok. Chat sugere. | — |
| Chaves de mudança | **Esconder do cliente.** Só a plataforma (Jorge e Thiago) vê. | `TELAS_SO_ADMIN`: owner e admin do cliente veem. |
| Backup | **Tirar o aviso** da tela. **Não expor o download completo ao cliente**: só a plataforma; o dono pede. Risco de segurança. | Tela do tenant, módulo "Backup". |
| Conferência de lançamentos | Dúvida se é redundante com editar em Contas a Pagar e a Receber. Ficou. | — |

## Bugs relatados pela usuária do cliente

- "Pago pelo sócio" não mostra ninguém (ver Despesas acima).
- Leitura de documento falha em recibos escritos à mão. O Thiago manda as
  imagens para teste. Extrato de banco em PDF lê bem.

## Pedido ao assistente (esta sessão)

Medir quanto o banco e o armazenamento de documentos cresceram desde o
início e **projetar um ano** para saber se a estrutura aguenta e quando
precisaria de upgrade. A consulta está em
[`sql/v3-armazenamento.sql`](./sql/v3-armazenamento.sql); precisa rodar na
produção.

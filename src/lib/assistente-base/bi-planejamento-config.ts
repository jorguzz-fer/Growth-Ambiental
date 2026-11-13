/** Base de conhecimento da Cris — Business Intelligence, Planejamento e Configurações. Descreve o sistema de HOJE. */
export const TEXTO = `# Base de conhecimento — Business Intelligence, Planejamento e Configurações

Regras gerais:

- **Obra na URL.** Cada tela guarda a obra escolhida no endereço. Sem obra, a aba reabre a última usada nela; sem memória, os relatórios consolidáveis abrem em "Todos" e as demais telas pedem a escolha. Nunca se escolhe "a primeira obra".
- **Todos / Ativos / Finalizados** seguem o Status do projeto (em Projetos). A obra sem status fica fora desses filtros, e a tela avisa.
- **Versões:** Atual (movimento real), Orçamento e Previsão Atualizada. O projeto novo nasce com uma de cada.
- **Permissões padrão:**
  - Owner e admin têm tudo, sempre.
  - O membro, com a chave "Padrão novo do membro" desligada, vê, cria e edita toda tela fora do grupo Config, mas não exclui. Com a chave ligada, fica só com lançamento e receita.
  - O contador é só leitura. Por padrão, vê DRE, Fluxo, Medição, Resumo, Plano de Contas, Despesas/Conferência e Auditoria.
  - O engenheiro só lança medição.
  - Ajustes por pessoa são feitos em Gestão de Acessos.
- **Assistente:** várias telas têm um painel à direita que só lê os números da tela. As exceções estão indicadas abaixo.

---

## Dashboard (/dashboard) — módulo Business Intelligence

**Para que serve:** visão geral de uma obra ou de várias somadas.

**O que se faz:**
- Seletor de projeto (com Todos, Ativos e Finalizados) e período De/Até.
- Com uma obra, até 3 versões. O padrão é a Atual + o Orçamento e a Previsão mais recentes que não sejam cópia. Ao tentar marcar a quarta, a tela avisa e não troca.
- **Dois gráficos**, da versão Atual das obras da tela: o **fluxo de caixa em linhas** (entradas e saídas previstas por mês, pelo vencimento, como no Fluxo de Caixa) e a **DRE em barras empilhadas** (em cada mês, a receita dividida em Custo Variável, Despesa Variável, Custo Fixo, Despesa Fixa, demais itens e Resultado; prejuízo fica abaixo do zero). Sem período, mostram os cinco meses anteriores, o atual e os seis seguintes; com período, os meses dele.
- **Exportar PDF**: o Dashboard sai em PDF pela impressão do navegador, com a faixa da empresa e a data.
- Com várias obras, uma coluna por tipo de versão ("soma de N obra(s)").
- Quatro cartões no topo: VGV total, Realizado acum., A receber e A pagar. Abaixo: Status atual, Margem e produtividade e Indicadores da obra (financiamento, BDI, custo referencial).
- Assistente: explicar indicador, o que mudou desde a última visita, divergências e obras que merecem atenção.

**O que confunde:**
- Só os **quatro de cima** seguem a versão e o período. Status e margem somam do começo da obra até hoje. Os Indicadores da obra vêm do cadastro.
- **A receber** no planejamento é receita planejada − realizado, nunca negativo. É saldo a realizar, não recebível.
- **A pagar** só existe na Atual: é o saldo das contas em aberto de todas as versões da obra.
- **Entradas de caixa** somam toda entrada, de todas as versões.
- **% executado** = despesas da Atual ÷ **soma de todos** os Orçamentos.
- Os percentuais de entradas e de margem usam a receita do cadastro (construção + terreno).
- Evolução física e liberação por medição estão desligadas até a PLS de cada obra ser cadastrada.

**Não faz:** não calcula o caixa projetado (isso fica no Fluxo de Caixa) e não edita nada.

**Chaves:**
- "Dashboard pela definição nova" ligada: entradas só da Atual, Executado dividido por um único Orçamento, VGV da Atual em toda coluna, "A receber" pode ficar negativo e Status/margem passam a seguir o período.
- "Contas a Pagar só com a Atual" ligada: o planejamento sai de A pagar.
- "Rascunho fora dos relatórios" ligada: planejamento não Aprovado sai.

**Quem acessa:** owner e admin. O membro, com a chave do membro desligada. O contador não.

---

## DRE (/dre) — módulo Business Intelligence

**Para que serve:** resultado em cascata, de Receita até Resultado Final, de uma obra, de um escritório ou da empresa.

**O que se faz:**
- Escopo: projeto (inclusive Matriz/Filial), Empresa toda, Ativos ou Finalizados.
- Período: Acumulado, um ano ou Personalizado, o mesmo para todas as colunas.
- Duas visões na mesma tela: a anual (o período escolhido, com "% Receita") em cima e a mensal (uma coluna por mês) logo abaixo.
- Com um projeto, compara **versões**. Com vários, compara **cenários** (Orçamento, Previsão Atualizada, Atual). Marque nas caixas de seleção o que entra.

**O que confunde:**
- "—" significa nenhum lançamento. "R$ 0" é uma soma que deu zero.
- Regime de cada bloco:
  - despesas pela competência;
  - receita de venda e contas a receber pelo vencimento;
  - liberações e permutas pela liquidação;
  - multa e juros pelo pagamento.
- O **rodapé amarelo** conta o que ficou fora da cascata (sem categoria, sem competência, categoria fora da lista) e traz um link para a Conferência. Lançamento sem competência só aparece no Acumulado.
- Retiradas, Investimentos e Empréstimos estão na cascata. A tela diz que a classificação delas aguarda decisão. Para uma leitura contábil formal, confirme com a sua contabilidade.
- Na Empresa toda, o projeto sem o cenário entra com outra versão (Atual, senão a padrão), e a linha de cobertura declara isso.

**Não faz:** não grava, não reclassifica e não exporta.

**Chaves:**
- "DRE pela definição nova" ligada: despesa classificada como "Receita" sai da receita, encargos vão para a competência da despesa de origem e o projeto sem o cenário fica fora da coluna.
- Rascunho ligada: planejamento não Aprovado sai.

**Quem acessa:** owner e admin, o membro (chave desligada) e o contador (leitura).

---

## DRE Analítica (/dre/analitica) — módulo Business Intelligence

**Para que serve:** a mesma DRE de um cenário, aberta em **categoria → grupo do plano de contas → conta**, com a análise vertical (% da receita).

**O que se faz:**
- Escolher a obra ou a empresa toda, o período e o cenário (Atual, Previsão Atualizada ou Orçamento), um de cada vez.
- Clicar numa categoria para abrir os grupos, e num grupo para abrir as contas. "Abrir até a conta" abre tudo.
- A Receita abre no que a compõe: unidades e liberações, revenda de permuta e o que foi lançado como despesa na categoria Receita.
- As Despesas Financeiras mostram à parte os encargos dos pagamentos (juros e multas, menos descontos).

**O que confunde:**
- Os totais são os da DRE no mesmo cenário e período; a analítica só detalha.
- Cada despesa entra pela categoria escolhida no lançamento. Com a chave "Despesa herda a categoria" ligada, entra pela categoria da conta no Plano de Contas.
- Despesa sem conta aparece em "Sem conta do plano". No Orçamento e na Previsão, a linha é o grupo: aparece como "Planejado no grupo".

**Não faz:** não mostra o lançamento individual (para na conta) nem compara cenários lado a lado (isso fica na DRE).

**Quem acessa:** quem vê a DRE.

---

## Fluxo de Caixa (/fluxocaixa) — módulo Business Intelligence

**Para que serve:** entradas e saídas por mês, com saldo acumulado. O previsto vem pelo vencimento e o realizado pela liquidação.

**O que se faz:**
- Projeto (com Todos, Ativos e Finalizados), período e ano. O período tem prioridade sobre o ano. O ano padrão é o atual, se tiver movimento; senão, o primeiro que tiver.
- Com uma obra, até 3 versões. A primeira é a referência, e o padrão é a Atual. Com várias obras, aparece uma coluna "Atual" somada.
- Tabela: entradas, saídas, saldo do mês, Realizado ↑/↓, Desvio, Desvio % e Saldo acumulado.

**O que confunde:**
- **Saldo do período** não inclui o saldo inicial.
- **Saldo acumulado** parte do saldo das **contas correntes da empresa** (todas as obras), não do caixa da obra, e corre pelo previsto.
- **Realizado** é o da **primeira versão selecionada**.
- **Desvio** só aparece nos meses com os dois lados.
- Despesa paga por terceiro só sai na restituição.

**Não faz:** não lança nem concilia (isso é no Caixa) e não mostra a competência (isso é na DRE).

**Chaves:**
- "Fluxo pela definição nova" ligada: realizado sempre da Atual, permuta fora do planejamento e saldo partindo do caixa da obra, pelo realizado nos meses fechados.
- Rascunho ligada: planejamento não Aprovado sai.

**Quem acessa:** owner e admin, o membro (chave desligada) e o contador (leitura).

---

## Fluxo de Caixa Analítico (/fluxocaixa/analitico) — módulo Business Intelligence

**Para que serve:** o previsto do Fluxo de Caixa (pelo mês do vencimento) de um cenário, com as saídas abertas em **bloco → grupo → conta** do plano de contas e a análise vertical (% das entradas).

**O que se faz:**
- Escolher a obra ou a empresa toda, o período e o cenário (Atual, Previsão Atualizada ou Orçamento) e clicar em "Aplicar".
- As saídas abrem em Obra (grupos CEF), Complementares, Ressarcimentos a terceiros e Sem conta do plano. Clique para abrir os grupos e as contas.
- As entradas abrem em unidades e liberações, e revenda de permuta. No fim, o saldo do período.

**O que confunde:**
- São as mesmas parcelas, despesas e ressarcimentos do Fluxo de Caixa: a despesa parcelada entra pelas parcelas, e a paga por terceiro sai no ressarcimento.
- É o previsto. O realizado (o que passou pela conta) continua no Fluxo de Caixa.
- No Orçamento e na Previsão, a linha é o grupo: aparece como "Planejado no grupo".

**Não faz:** não mostra o lançamento individual (para na conta) nem o realizado.

**Quem acessa:** quem vê o Fluxo de Caixa.

---

## Relatórios Customizados (/relatorios) — módulo Business Intelligence

**Para que serve:** montar um relatório da DRE ou do Fluxo de Caixa do jeito que a pessoa pedir, com chat próprio.

**O que se faz:**
- No chat ao lado, descrever o relatório ("DRE da obra X com análise vertical, mês a mês neste ano"). O chat monta e a tela mostra a tabela. Também dá para ditar.
- Ou escolher nos campos: fonte (DRE, DRE por categoria e grupo, ou Fluxo de Caixa previsto), colunas (por cenário, mês a mês ou por obra), cenários, obra, período De/Até e análise vertical. Clicar em Montar.
- Baixar CSV ou exportar PDF.
- O endereço da página guarda o relatório: copiar o link abre o mesmo relatório de novo.

**O que confunde:**
- Os números são os da DRE e do Fluxo de Caixa, com as mesmas regras e chaves.
- Por mês ou por obra vale um cenário só (o primeiro marcado); por cenário, até três lado a lado.
- Mês a mês sem período mostra os cinco meses anteriores, o atual e os seis seguintes; até 24 colunas.
- Quem abre o link vê só o que o acesso dele permite: sem acesso à DRE, um relatório de DRE não abre.

**Não faz:** não grava o relatório com nome (o link é o jeito de guardar) e não lista lançamentos.

**Quem acessa:** owner e admin por padrão; os outros papéis, se receberem acesso na Gestão de Acessos. Cada relatório exige também ver a DRE ou o Fluxo de Caixa.

---

## Resumo Executivo (/resumo) — módulo Business Intelligence

**Para que serve:** indicadores de vendas e fontes de recurso: VGV, sinais, parcelas, FGTS, subsídio, permuta e liberações.

**O que se faz:**
- **Uma obra**: tabela Indicadores Gerais e os cartões Unidades (Disponíveis/Reservadas/Vendidas/Total) e Financiamento Banco. Com um período informado, aparece também "Recebimentos previstos no período".
- **2–3 versões**: tabela comparativa, sem o filtro de período.
- **Todos/Ativos/Finalizados**: uma coluna por tipo de versão, com a cobertura. Com mais de uma obra, aparece o comparativo entre projetos. Custo realizado × orçado só para quem vê Despesas.
- **Indicadores de negócio**, no topo: marque os que quer ver, entre VGV, VGV vendido, % vendido, unidades vendidas, preço médio vendido por m², VGV por m², custo realizado, custo realizado por m², custo orçado por m², desvio de custo e margem orçada. A escolha fica no endereço da página, então o link e o PDF levam os mesmos. Com várias obras, há uma coluna por obra e o Total. Os de custo só aparecem para quem vê Despesas.
- O custo por m² usa a **área construída** do cadastro do projeto (campo "Área construída (m²)", em Projetos → Custos do projeto). Sem ela, o indicador diz "sem área construída no cadastro". O preço por m² usa o m² de cada unidade.
- **Exportar PDF** do Resumo.

**O que confunde:**
- Os indicadores são **acumulados da versão**. O período só afeta o cartão de recebimentos.
- O VGV conta todas as unidades. Sinais e parcelas contam só as **Vendidas**.
- Os valores são nominais, sem INCC. O Financiamento Banco não entra nos totais.
- Se a versão não é a Atual, a tela avisa que aquilo é planejamento, não o contratado.

**Não faz:** não edita unidades nem planos de pagamento (isso fica em Receitas → Unidades).

**Chaves:**
- "Resumo pela definição nova" ligada: sinais × quantidade, permuta e liberação canceladas fora dos totais, linha "Permuta de outros tipos" e os blocos Vendas, Exposição e Atenção. Os limites do bloco Atenção ficam em Configurações → Empresa.
- Rascunho ligada: planejamento não Aprovado fica fora no consolidado.

**Quem acessa:** owner e admin, o membro (chave desligada) e o contador (leitura).

---

## Consolidado — saiu

A tela Consolidado saiu. O endereço /consolidado leva à **Projeção de Receitas**, que mostra a receita da obra por fonte: escolha duas ou três versões para ver os totais por fonte (AS/Sinais, Mensais, Semestrais, Anuais, FGTS, Subsídio, Permuta, Liberações de Obra). Pergunta livre sobre os números vai para a Cris.

---

## Cadastro de Projetos (/projeto) — módulo Projetos

**Para que serve:** cadastro das obras e das unidades/escritórios, que alimenta datas, valores, financiamento e metragem dos relatórios.

**O que se faz:**
- **Todos**: cards, busca, Novo projeto e Nova unidade / escritório. O menu "…" tem Abrir e Copiar link.
- **Um projeto**: o cadastro completo e mais quatro blocos:
  - dados: nome, datas, Status, cliente, endereço/IBGE, CNO/CEI, ART/RRT;
  - valores: Receitas, Custos e Estrutura financeira;
  - documentos;
  - o cartão **Orçado x Realizado · competência**;
  - versões, com o botão de travar e destravar;
  - planilha da Atual (modelo, exportar, importar).
- O Status grava na hora. Projeto novo nasce Ativo.
- **Excluir** fica numa zona separada e exige digitar o nome. A exclusão apaga junto versões, unidades, despesas, caixa, medições, orçamentos e recebíveis, sem como desfazer.
- Assistente: cadastro incompleto, inconsistências, funding e documentos. Com IA configurada, ele lê um documento e **propõe** o preenchimento, sem gravar.
- **Mudar por comando com a Cris**: com o projeto aberto, diga ou dite o que mudar ("a obra termina em 31/12/2027", "valor da construção 2,5 milhões") ou anexe um documento. A Cris preenche os campos do cadastro e a tela mostra quais; nada é gravado até clicar em Salvar, e o log marca que veio do assistente. O cliente, a situação e a trava continuam nos campos e botões da tela.
- **Alterações não salvas**: com algo mudado no cartão e não salvo, sair por um link ou fechar a aba pede confirmação.

**O que confunde:**
- As **datas de início e fim** definem o período de Orçamentos e Previsão.
- A importação da planilha só grava na Atual, em tipos ainda vazios. Se houver conflito, é recusada inteira.
- **Trava** impede editar. A **situação** (Rascunho/Concluído/Aprovado) não trava.
- O bloco de município mostra onde o sistema entende que a NFS-e seria tributada. Confirme com a sua contabilidade.

**Não faz:** não lança orçamento e não cria versões.

**Quem acessa:** owner e admin. Membro e contador não, salvo concessão em Gestão de Acessos. Travar exige a permissão "Travar e destravar versão".

---

## Orçamentos (/budget) — módulo Planejamento

**Para que serve:** planejar receitas e despesas do projeto mês a mês, dentro do período do cadastro.

**O que se faz:**
- No topo:
  - seletores de projeto (inclui Matriz/Filial) e de versão;
  - período e número de competências;
  - Situação e trava;
  - cartões Receitas, Despesas, Resultado e Recursos próprios.
- **Receitas**: o total vem do cadastro. Só a distribuição mensal se edita.
- **Despesas**: total da linha + % por mês. O valor mensal é calculado, e a soma não pode passar de 100%.
- **Preencher com a Cris**: diga, dite ou anexe o que planejar (ex.: "fundação 500 mil de 03/2026 a 08/2026"). A Cris preenche o total e a distribuição das linhas — igual entre os meses de um intervalo, ou com o % de cada mês — e a tela mostra o que ela preencheu. Nada é gravado: confira e clique em Salvar receitas ou Salvar despesas. Na Previsão Atualizada, ela só mexe na distribuição.
- **Alterações não salvas**: com algo mudado e não salvo, a tela mostra o aviso, e sair por um link ou fechar a aba pede confirmação.
- Ações:
  - incluir linha do Plano de Contas;
  - remover linha (pede confirmação se tiver valor);
  - exportar e importar planilha;
  - Salvar, que é separado por bloco.
- Matriz/Filial usa o ano atual + 5 anos.

**O que confunde:**
- **Aprovar** só a partir de Concluído e exige "Aprovar e desaprovar versão". Sair de Aprovado pede confirmação.
- Com a chave de Rascunho desligada, a situação não muda número de relatório.

**Não faz:** não lança despesa real (isso fica em Despesas) e não cria outra versão de Orçamento. Sem as datas, a tela leva ao cadastro do projeto.

**Chaves:** com "Rascunho fora dos relatórios" ligada, a versão não Aprovada some dos relatórios, e a tela avisa.

**Quem acessa:** owner e admin, e o membro com a chave desligada (sem excluir). O contador não. Aprovar e travar: só owner e admin, salvo concessão.

---

## Previsão Atualizada (/forecast) — módulo Planejamento

**Para que serve:** redistribuir mês a mês o que foi orçado, sem mudar os totais.

**O que se faz:**
- **Criar Previsão**: escolha o Orçamento base e dê um nome (obrigatório).
- **Duplicar atual** e **Comparar com o Orçamento**.
- Limite: 12 previsões por projeto.
- A grade é igual à de Orçamentos, mas os totais e as linhas são **herdados** do Orçamento. Só os % mensais se editam.
- Assistente: analisa a distribuição e os desvios. "Reprojetar em uma revisão nova" cria **outra** previsão.
- **Partir do realizado** substitui os meses passados pelo que a versão Atual teve: as despesas por grupo do plano de contas e a receita da linha Receitas do Projeto (a mesma da DRE). O restante do total vai por igual nos meses futuros, numa revisão nova.
- **Ajustar os meses futuros com a Cris**: por texto, ditado ou documento ("distribui o resto de 11/2026 a 03/2027"). Os meses passados ficam como estão; o intervalo reparte o que sobra de 100%. Nada é gravado até Salvar.

**Não faz:** não muda totais, não inclui linhas (isso se faz no Orçamento) e não tem botão de excluir previsão.

**Quem acessa:** igual a Orçamentos. Criar e duplicar exigem "criar" em Previsão.

---

## Plano de Contas (/planocontas) — módulo Planejamento

**Para que serve:** dizer a NATUREZA econômica de cada lançamento (salário, hospedagem, taxa de órgão ambiental, receita de monitoramento…). Projeto, contrato, fase, atividade e modalidade (arqueologia, fauna, flora…) são **dimensões do lançamento**, não contas: a mesma conta "Hospedagens" serve a qualquer projeto.

**Estrutura:** Grupo → Subgrupo → Conta (até 3 níveis de grupos). Só a CONTA recebe lançamento; grupo não. O plano padrão para consultorias ambientais tem 6 grupos: 1 Receitas operacionais (prestação de serviços, outras receitas, deduções), 2 Custos diretos dos serviços (pessoal técnico, terceirizados, mobilização e logística, equipamentos e materiais, saúde e segurança ocupacional, taxas técnicas, infraestrutura operacional de projetos, outros), 3 Despesas operacionais e administrativas (administração, RH, TI, serviços profissionais, comercial, despesas indiretas e compartilhadas, registros e seguros), 4 Resultado financeiro, 5 Tributos e encargos (sobre o faturamento, sobre o lucro, encargos de pessoal, outros) e 6 Outras classificações (outras receitas e despesas, imobilizado, empréstimos, retiradas). Empresa nova recebe esse plano; cada uma personaliza o seu.

**Empresa criada antes (plano de obra ou plano ambiental anterior):** a tela mostra um aviso "Esta empresa ainda usa o plano de contas anterior" com "Ver prévia detalhada" e "Converter para o plano ambiental" (owner/admin). A conversão cria o plano ambiental, deixa as contas antigas INATIVAS (seção "Plano anterior", com a conta ambiental equivalente sugerida) e arquiva com o prefixo "ANT-" os códigos antigos que ocupavam códigos do plano novo — despesas, Orçamento e medições acompanham. Nenhum lançamento é apagado nem muda de valor ou categoria. Pode ser desfeita enquanto as contas novas não tiverem uso. Trazer os lançamentos antigos para as contas novas é a "Reclassificação", conta a conta, com prévia.

**Cada conta tem:** código, nome, descrição, grupo, natureza (receita/despesa), **categoria da DRE** (alimenta a DRE de sempre: Margem de Contribuição → EBITDA → Resultado Final), **classe gerencial** (alimenta a "Estrutura gerencial" da DRE Analítica: Receita bruta → Deduções → Receita líquida → Custos dos serviços → Resultado bruto → Despesas operacionais → Resultado operacional → Resultado financeiro → Tributos sobre o lucro → Resultado líquido) e **custo padrão direto ou indireto** — o lançamento pode tratar diferente (campo "Custo direto ou indireto" na despesa).

**O que se faz:**
- Buscar por código/nome/descrição; filtrar por natureza, categoria DRE e situação (ativas, inativas, todas); expandir e recolher os grupos.
- Criar grupo (1º nível), subgrupo ("+ Novo subgrupo", código sugerido) e conta ("Editar" no subgrupo: nome, natureza, categoria da DRE já sugerida, descrição; o código vem sugerido); editar; mover a conta para outro subgrupo ou o subgrupo para outro grupo; inativar; excluir conta sem uso. Ao escolher a categoria, a tela diz onde a conta aparece na DRE.
- Ao criar, o sistema avisa se já existe conta parecida ("Hospedagem em viagem" ≈ "Hospedagens"); não impede.
- "Onde a conta é usada": lançamentos, Orçamento, medições e, por botão, valores por projeto, contrato, fase e custo direto/indireto.
- Exportar XLSX/CSV; Importar planilha (Código, Nome, Grupo, Natureza, Categoria DRE, Descrição) com prévia: novas, alteradas, duplicidades, erros e impacto na DRE — nada grava antes de confirmar.
- "Reclassificar lançamentos" (permissão própria, só owner/admin por padrão): move as despesas de uma conta para outra com prévia de quantidade, valor e versões; versões congeladas não mudam; fica na auditoria.

**Regras que confundem:**
- O CÓDIGO é a referência dos lançamentos e do Orçamento: conta usada não muda de código nem de natureza; renomeie só o nome. Grupo com Orçamento/Medição não muda de código.
- Mudar categoria, classe, custo padrão ou grupo de conta USADA mostra o impacto (lançamentos, valor, versões congeladas) e só grava com "Confirmo a mudança".
- Conta inativa some do lançamento novo; o histórico fica. Lançar em conta inativa, inexistente, de outra empresa ou num grupo é recusado.
- Excluir só conta sem nenhum uso (nem despesa cancelada, nem Orçamento). Com uso, inative.
- O Orçamento planeja por subgrupo (uma linha por grupo do plano). Com a chave "Orçamento usa a categoria da DRE do Plano de Contas", a linha nova nasce com a categoria das contas do grupo.
- Tributos: ISS/PIS/COFINS/Simples (5.1) são deduções na visão gerencial; IRPJ/CSLL (5.2), tributos sobre o lucro; INSS/FGTS (5.3) só quando a empresa não separa os encargos por função (quem separa usa 2.1.02 e 3.2.02 — a mesma guia nunca vai nos dois). Nenhuma conta gera apuração ou lançamento de imposto automático.
- Despesa só usa conta de natureza despesa; conta de receita é recusada no lançamento de despesa.
- Reembolso de despesa ao cliente não é receita operacional: a despesa mantém a conta original (Contratos → Reembolsos, com resumo por conta).
- Não há contas patrimoniais nem depreciação: o plano é gerencial de receitas e despesas.

**Com a Cris:** "qual conta uso para…?" (ela consulta as contas DESTA empresa e propõe uma; quem confirma é você no formulário), "há contas duplicadas?", "explique a conta 2.3.04", "quais despesas estão sem conta?", "quais contas têm pouco uso?", "quanto gastamos com hospedagem neste mês?", "maiores despesas de logística", "quais contas concentram os custos?", "hospedagem por projeto". Contas novas: diga ou anexe a lista; a Cris propõe até 10 em grupos existentes e você marca o que criar.

**Quem acessa:** owner e admin; o membro conforme a Gestão de Acessos; o contador só lê.

---

## Empresa (/empresa) — módulo Configurações

**Para que serve:** identidade da empresa e cadastro do emitente fiscal.

**O que se faz:**
- Nome e logo. O upload só funciona com armazenamento configurado.
- **Dados fiscais**: CNPJ, inscrições, regime, item de serviço, CNAE, alíquota de ISS, ambiente (Homologação/Produção), endereço e código IBGE. Um checklist mostra o que "falta" e o que é para "confira".
- **Alertas do Resumo Executivo**: % e valor de desvio de custo (só alerta quando passa dos dois) e dias de recebível vencido.
- **Com a Cris**: anexe o cartão CNPJ na conversa (ou dite os dados) e peça para preencher os dados fiscais. O ambiente de emissão é escolhido à mão. Quem grava é o botão dos dados fiscais.

**O que confunde:** os alertas só aparecem com a chave do Resumo ligada. Confira os dados fiscais com a sua contabilidade.

**Não faz:** não emite nota e não configura o provedor de emissão, que fica no servidor.

**Quem acessa:** owner e admin, salvo concessão.

---

## Usuários (/usuarios) — módulo Configurações

**Para que serve:** adicionar pessoas e definir o papel de cada uma.

**O que se faz:**
- Novo usuário: nome, e-mail, papel (admin, membro, contador, engenheiro) e senha opcional. Sem senha, o acesso fica pendente. A senha definida aqui é provisória.
- **Telas sugeridas**: ao escolher o papel, a tela marca as telas que ele alcança por padrão. Dá para desmarcar ou marcar outras antes de adicionar. Tela marcada a mais entra com ver (o contador é só leitura) ou com ver, criar e editar (os outros papéis). Excluir e as telas de dado sensível ficam na Gestão de Acessos. Owner e admin têm acesso total.
- **Com a Cris**: ela escolhe o papel e as telas a incluir ou tirar; nome e e-mail são digitados na tela. Quem adiciona é o botão "Adicionar".
- Na tabela: trocar o papel, Editar, Senha e Remover.
- Promover a owner pede confirmação.
- Quem tem telas personalizadas, ao trocar de papel, escolhe entre manter as personalizações ou voltar ao padrão.
- Ninguém remove a si mesmo.

**Não faz:** não ajusta ação por ação (isso é na Gestão de Acessos) e não cria owner direto.

**Restrição que "não funciona":** com a chave do padrão novo do membro desligada, o papel "membro" alcança tudo fora de Configurações. Para restringir um membro, desmarque as telas aqui ao criar, ou use a Gestão de Acessos.

**Quem acessa:** só owner e admin, sem concessão possível.

---

## Gestão de Acessos (/acessos) — módulo Configurações

**Para que serve:** definir Ver/Criar/Editar/Excluir por tela, para cada pessoa.

**O que se faz:**
- Matriz por membro, com Salvar e "Voltar ao padrão do papel".
- Marcar uma ação liga o Ver, e tirar o Ver tira o resto.
- Com a chave do membro desligada, há uma prévia do que cada membro perderia se ela fosse ligada.

**O que confunde:**
- A matriz de owner e admin não se edita ("acesso total"), e ninguém edita a própria.
- O contador só recebe "Ver".
- A Conferência acompanha Despesas.
- Usuários, Gestão de Acessos e Chaves nunca são concedidas. Chaves nem aparece: é operada pela plataforma.
- Backup nasce só com proprietário e administrador e pode ser concedido a outra pessoa, porque o pacote completo leva dado pessoal.
- Os grupos da matriz (Reports, Config…) não são os módulos do menu.

**Não faz:** não troca o papel da pessoa (isso é em Usuários).

**Quem acessa:** só owner e admin.

---

## Auditoria (/acoes) — módulo Configurações

**Para que serve:** ver quem alterou o quê.

**O que mostra:** os **200 eventos mais recentes** (ou os 200 mais recentes do filtro), com data, usuário, ação, entidade e "de → para".

**Filtro:** usuário (ou "sistema"), entidade, trecho da ação e período. **Com a Cris**: peça, por exemplo, "só o que o Messias lançou este mês"; ela preenche o filtro, e quem filtra é o botão "Filtrar".

**O que confunde:** quem não é owner nem admin vê os dados pessoais de compradores apenas como "alterado".

**Não faz:** não busca no texto dos detalhes, não exporta e não mostra eventos além dos 200.

**Quem acessa:** owner e admin, e o contador. O membro só por concessão.

---

## Numeração de despesas (/numeracao) — módulo Configurações

**Para que serve:** configurar o número automático (PED) das despesas: prefixo, próximo número e dígitos.

**O que confunde:**
- A tela recusa um número já usado.
- Para salvar abaixo do maior emitido, é preciso digitar CONFIRMO.
- Número de despesa excluída não volta a ser usado.

**Com a Cris**: ela vê a numeração atual e o maior número emitido, sugere e preenche prefixo, próximo número e dígitos. Quem grava é o botão Salvar, e o recuo continua pedindo CONFIRMO.

**Não faz:** não renumera despesas antigas.

**Quem acessa:** owner e admin, salvo concessão.

---

## Chaves de mudança (/chaves) — módulo Configurações

**Para que serve:** ligar, para a empresa, regras novas que mudam número de relatório ou acesso. Todas nascem **desligadas**, e desligada nada muda.

**O que se faz:**
- Um cartão por chave, com efeito, estado, última troca e link da prévia. As chaves são:
  - membro
  - Contas a Pagar só Atual
  - restituição
  - Rascunho
  - Dashboard
  - Fluxo
  - Resumo
  - DRE
- **Para ligar:** marque "Conferi a prévia" e clique em Ligar. Nas chaves com prévia nesta tela (Rascunho, Dashboard, Fluxo, Resumo, DRE), exporte antes a prévia (.xlsx). A exportação vale por 7 dias.
- A ordem Dashboard → Fluxo → Resumo → DRE, com alguns dias entre elas, é só **aviso**: não bloqueia.
- Desligar volta ao comportamento anterior. Tudo vai para a Auditoria.

**Não faz:** não apaga nem regrava dados.

**Quem acessa:** só os operadores da plataforma (Growth Tools). Owner e admin da empresa não veem a tela; quem precisar de uma mudança pede à plataforma.

---

## Backup de dados (/backup) — módulo Configurações

**Para que serve:** guardar uma cópia dos dados lançados, por semestre. Há dois arquivos:
- **Baixar ZIP** (simples): a planilha de Despesas, Contas a Receber e Caixa mais os documentos do período.
- **Pacote completo**: além da planilha, todas as tabelas de lançamento em arquivos com todas as colunas e chaves, o manifesto (linhas e somas de controle) e os documentos. É gerado em segundo plano; a tela mostra o progresso e o histórico, e o pacote fica disponível para baixar.

**O que se faz:**
- Lista de semestres com as contagens, a coluna "Último backup" (quando e quem baixou), o botão "Baixar ZIP" e o botão "Gerar pacote completo".
- Cada download vai para a Auditoria, com o que o pacote continha.

**Campos que confundem:** "Encerrado" é só calendário. Semestre encerrado continua recebendo lançamento; um backup baixado e depois alterado fica desatualizado.

**Não faz:** não apaga, não arquiva e **não restaura**. O backup do banco de dados e dos arquivos é outro, feito pela infraestrutura.

**Dado pessoal:** o pacote completo leva CPF, endereço e telefone de clientes, fornecedores e funcionários. Os dados sensíveis ficam fora (renda, FGTS, score e estado civil do comprador; salário, endereço e banco do funcionário; ASO). O leia-me dentro do pacote diz isso e que a guarda é de quem baixou.

**Quem acessa:** proprietário e administrador; outra pessoa só se receber a permissão "Backup de dados" na Gestão de Acessos. Para analisar dados em outro lugar, use as exportações das telas de relatório.

---

## Conferência de lançamentos (/conferencia) — módulo Configurações

**Para que serve:** listar despesas com categoria de receita, sem categoria, com valor zero ou sem competência.

**O que se faz:**
- Filtros por projeto, competência e fornecedor.
- Nova categoria linha a linha, ou em lote, quando os marcados são do mesmo fornecedor ou da mesma conta CEF.
- Prévia "Conferir antes de aplicar".
- **Só a categoria muda**: valor, competência, vencimento, status e PED ficam.

**O que confunde:** a lista vazia não garante que está tudo certo. Despesas canceladas não podem ser selecionadas.

**Não faz:** não corrige sozinha e não preenche a competência (isso se faz abrindo a despesa).

**Quem acessa:** quem vê Despesas, ou seja, owner, admin e o membro (em qualquer posição da chave). O contador só vê. Reclassificar exige "editar" em Despesas.

---

## Diferenças entre telas parecidas

- **Orçamentos × Previsão Atualizada:** o Orçamento define linhas e totais. A Previsão nasce dele, herda tudo e só redistribui os % mensais (até 12 por projeto).
- **DRE × Fluxo de Caixa:** a DRE é resultado (competência e vencimento) até o Resultado Final. O Fluxo é dinheiro: previsto pelo vencimento, realizado pela liquidação e saldo a partir das contas correntes.
- **Dashboard × Resumo Executivo × Projeção de Receitas:**
  - o Dashboard é o painel geral (VGV, realizado, a receber, a pagar, margem);
  - o Resumo detalha vendas e fontes de recurso e as unidades por status;
  - a Projeção é a receita de **uma** obra mês a mês e, comparando versões, por fonte.
- **Usuários × Gestão de Acessos:** papel × ajuste fino por tela.
- **Situação × Trava:** a situação documenta a etapa e, com a chave de Rascunho, decide se a versão entra nos relatórios. A trava impede editar.
- **Rodapé da DRE × Conferência:** o rodapé conta o que ficou fora. A Conferência lista e corrige a categoria.

## Caminhos comuns

- Para cadastrar uma obra, vá em **Planejamento → Projetos → Novo projeto**.
- Para habilitar o Orçamento de uma obra, vá em **Planejamento → Projetos**, abra a obra e preencha as datas de início e fim.
- Para criar uma revisão, vá em **Planejamento → Previsão Atualizada**, escolha a base, dê um nome e clique em Criar Previsão.
- Para aprovar uma versão, vá em **Planejamento → Orçamentos** (ou Previsão) e mude a Situação para Concluído e depois Aprovado.
- Para comparar orçado e real, vá em **Business Intelligence → DRE** e marque as versões. Também dá para usar o cartão Orçado x Realizado em Projetos.
- Para corrigir despesas sem categoria, vá em **Configurações → Conferência de lançamentos**.
- Para dar acesso a uma tela, vá em **Configurações → Gestão de Acessos**, escolha a pessoa, marque a tela e clique em Salvar.
- Para trocar o papel ou a senha de alguém, vá em **Configurações → Usuários**.
- Para ligar uma regra nova, peça à plataforma (Growth Tools): ela confere a prévia com a empresa e liga a chave.
- Para baixar a cópia de um semestre, vá em **Configurações → Backup → Baixar ZIP**.
`;

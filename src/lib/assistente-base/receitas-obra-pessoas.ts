/** Base de conhecimento da Cris — Receitas, Obra e Pessoas. Descreve o sistema de HOJE. */
export const TEXTO = `# Base de conhecimento: Receitas, Obra e Pessoas

## Quem acessa (padrão por papel)

Padrões de cada papel; o proprietário ou um administrador pode ajustá-los por membro em Configurações → Gestão de Acessos.

- **Proprietário e Administrador**: acesso total.
- **Membro**: pode ver, criar e editar em todas as telas desta parte, mas não pode excluir nem cancelar. Se a chave "Padrão novo do papel membro" estiver ligada para a empresa (a plataforma liga a pedido), o membro passa a ver só Clientes, Unidades, Contas a Receber, Permuta e Medição de Projeto.
- **Contador**: só leitura. Desta parte, vê apenas o Relatório CEF da Medição de Projeto.
- **Engenheiro**: vê apenas o lançamento de medição.
- **Dados sensíveis** (dados financeiros e de perfil do cliente, dados pessoais e salariais do funcionário, ASO): permissões à parte que, por padrão, só o proprietário e o administrador têm. Podem ser concedidas na Gestão de Acessos.

Quase toda tela pede a obra no seletor do topo; com a versão de trabalho congelada, gravar, editar e cancelar ficam bloqueados.

---

## Clientes (/clientes) — módulo Receitas

**Para que serve:** guarda o cadastro dos compradores e liga cada comprador à unidade que comprou.

**O que se faz nela:**
- Buscar por nome ou unidade e filtrar por status do contrato.
- Cadastrar e editar a ficha do cliente, com os blocos Vínculo e contrato, Dados cadastrais, Dados financeiros e Inteligência de mercado.
- Anexar documentos de venda, como contrato, proposta, termo aditivo e distrato, até 10 MB cada. Um novo arquivo do mesmo tipo vira a versão seguinte, e a anterior continua guardada.
- Excluir o cliente, digitando o nome dele para confirmar.
- **Perfil da base** (no topo, recolhível): quantos clientes por situação do contrato, finalidade (morar ou investir), faixa etária, cidade e como conheceu, e quantos têm unidade. São só contagens; grupo com menos de 3 clientes entra em "Outros". Renda, FGTS, score, documento e contato não entram. A Cris analisa esse perfil.
- A Cris **não** preenche a ficha do cliente. O anexo do chat (📎) funciona em qualquer tela, inclusive aqui: se alguém anexar um documento do cliente, o modelo lê o documento inteiro, com nome e CPF. Os documentos de venda ficam no bloco de documentos da ficha, não na Cris.

**Campos que confundem:**
- **Status do contrato** (Ativo, Assinado, Em análise, Reservado, Distratado ou Cancelado): enquanto o status estiver em branco ou for qualquer um que não seja Distratado ou Cancelado, a unidade fica presa a este cliente. Nesse caso, o sistema recusa vincular a mesma unidade a outro comprador.
- **CPF/CNPJ**: aparece mascarado na lista. Na ficha, aparece completo só para quem tem a permissão de dados do cliente.
- **Dados financeiros e Inteligência de mercado** (renda, FGTS, score, restrições, estado civil, interesse de 1 a 5): sem a permissão de dados do cliente, esses blocos não aparecem.

**O que ela NÃO faz:** não cria a venda nem o plano de pagamento, que ficam em Unidades. Não registra pagamentos, que ficam em Contas a Receber. A exclusão é bloqueada se houver unidade com contrato ativo, contas a receber, documentos ou recebimento por terceiro vinculados.

---

## Unidades (/unidades) — módulo Receitas

**Para que serve:** é o cadastro das unidades da obra, com o valor (VGV), o status e o plano de pagamento de cada venda. Os recebíveis que aparecem em Contas a Receber e na Projeção vêm daqui.

**O que se faz nela:**
- Listar as unidades da versão **Atual** nas abas Todas, Disponíveis, Reservadas e Vendidas. Para as vendidas, a lista também mostra Total fontes e Saldo.
- Criar, editar e excluir unidades. Para excluir, é preciso digitar o código, e a exclusão é recusada se a unidade tiver cliente, venda, contas a receber, documento ou permuta.
- Exportar, baixar o modelo e importar planilha com Código, Bloco, Tipo, m², Andar, Valor e Status. Código existente é atualizado e código novo é inserido, com prévia antes de confirmar. A planilha **não traz o plano de pagamento**.
- Usar o assistente, que tem duas funções:
  - Análises: apontam venda sem data, valor zerado, código repetido e vendida sem plano.
  - Lançamento assistido: você descreve a venda em texto ou por voz, a IA **propõe** os campos no formulário, e a pessoa confere e grava.

**Campos que confundem:**
- **Status** (Disponivel, Reservado, Vendido ou Permutado): **só "Vendido" gera recebíveis e projeção.** Unidades Permutadas aparecem só na aba Todas.
- **Total contratado e Saldo vs VGV**: o total contratado é a soma das fontes do plano. Numa unidade vendida, o saldo (total menos VGV) deve fechar em zero, com tolerância de R$ 0,01. Se não fechar, aparece em vermelho.
- **Fontes do plano**:
  - **Ato (AS)**: o pagamento na assinatura.
  - **Sinais S1, S2 e S3**: o primeiro, o segundo e o terceiro sinal. Cada um tem valor, vencimento e número de parcelas.
  - **Mensais, Semestrais e Anuais**: valor da parcela, 1º vencimento e quantidade de parcelas.
  - **FGTS**: entrada única, com data prevista, usando recursos do FGTS do comprador.
  - **Subsídio**: valor, data e status (Aguardando Caixa ou Recebido).
  - **Permuta**: bem dado pelo comprador como parte do pagamento.
  - **Financiamento Bancário**: valor financiado, data de entrada e data da 1ª parcela.
- **Caixas "ativo" e "Usar …"**: encadeiam as fontes umas nas outras.
  - Contas a Receber e a Projeção detalhada ignoram essas caixas e listam toda fonte preenchida.
  - O modo comparação da Projeção só conta as fontes com a cadeia ligada. Também só conta o Subsídio "Recebido" e não conta o Financiamento.
- **"vencimento a conferir"**: aviso de que o dia de vencimento não existe em algum mês da série, como o dia 31.

**O que ela NÃO faz:** não registra recebimentos, que ficam em Contas a Receber. Não liga o comprador à unidade: isso se faz em Clientes.

---

## Simulador (/simulador) — módulo Receitas

**Para que serve:** é o simulador de **parcelamento** que o vendedor usa antes de vender, como a planilha da empresa: ato de assinatura, sinais, anuais, mensais corrigidas pelo INCC da obra, FGTS, subsídio e o financiamento bancário nas chaves. Monta o fluxo SAC, PRICE ou SBPE. **Nada é gravado.**

**O que se faz nela:**
- Escolher a **unidade** disponível (opcional), que traz o valor do imóvel, ou digitar o valor.
- Informar tipo, data de início, renda familiar, ato, sinais e anuais (cada um com o mês), número de mensais (até 480), financiamento, FGTS e subsídio. Juros ao mês só no SAC e no PRICE.
- Escolher um cliente, o que é opcional. A renda do cadastro só é puxada para quem tem a permissão de dados do cliente.
- Ver os cinco números (valor do imóvel, ato e sinais, anuais/FGTS/subsídio, financiamento, saldo em mensais), o **comprometimento de renda em %** e o fluxo mês a mês. "Detalhar" mostra a parcela base, a correção e os juros.
- **Proposta ao cliente:** abaixo do fluxo, a proposta de pagamento com o plano (o que paga e quando), a mensagem e a validade. "Gerar PDF da proposta" imprime **só a proposta**, sem renda nem limite, que são internos.
- **Com a Cris:** o vendedor dita a simulação ("simule 90 mensais com ato de 30 mil") e ela preenche os campos. Ela também escreve o texto da proposta ao cliente. A Cris **não recebe a renda nem o nome do cliente**.

**Campos que confundem:**
- **Juros ao mês**: é uma premissa (padrão de 1%), não a taxa de um contrato. No SBPE, a parcela é o saldo dividido pelo número de mensais, sem juros.
- **Comprometimento de renda**: a **maior** mensal dividida pela renda, com limite de 30%. É uma referência de cálculo, não uma aprovação de crédito.
- **Evolução da obra**: é linear, calculada pela janela de início e fim da obra, ou uma premissa linear se a obra não tiver essas datas. **Não é medição.**
- **INCC**: corrige as mensais a partir da 5ª, pelo acumulado do mês do vencimento.

**O que ela NÃO faz:** não cria venda, não reserva a unidade e não salva simulações. A venda é cadastrada em Unidades.

---

## Contas a Receber (/contasreceber) — módulo Receitas

**Para que serve:** reúne o que a empresa tem a receber em duas listas:
- **Contas lançadas à mão**, com recebimento e conciliação.
- **Recebíveis das vendas**, gerados pelo plano das unidades vendidas.

**O que se faz nela:**
- Filtrar por obra ou "Todos os projetos" e buscar em tudo.
- Criar uma conta com projeto, tipo, valor, vencimento, descrição e, se quiser, unidade, cliente e banco. Uma entrada do extrato encaminhada pelo Caixa abre o formulário já preenchido.
- **Receber**: informar valor, data e forma (Extrato bancário, Espécie, Repasse de terceiro ou Outro).
  - "Extrato bancário" exige escolher a linha do extrato, o que concilia o recebimento.
  - As outras formas exigem justificativa.
  - São aceitos recebimentos parciais.
- Anexar arquivos, editar e cancelar. A conta cancelada sai das listas e relatórios, mas fica no histórico.
- Usar o assistente, que **propõe** pares conta ↔ linha do extrato. Só concilia quando a pessoa clica em "Conciliar".
- **Lançar com a Cris**: diga, dite ou anexe o que receber (ex.: "sinal de 20 mil da unidade A101 vencendo dia 10"). A Cris preenche o formulário Nova conta a receber (projeto, tipo, valor, vencimento, descrição, unidade e banco) e quem grava é Adicionar. A Cris não preenche o cliente; ele é escolhido à mão. Se o documento anexado tiver o nome, o modelo lê o documento, mas o nome não vai para o formulário.

**Campos que confundem:**
- **Tipo** (Sinal, Parcela mensal, Outros ou Outras Receitas): "Outras Receitas" exige descrição.
- **Estado**: é calculado pelo sistema, não digitado.
  - "A receber": nada recebido.
  - "Recebida": parcial (mostra "falta R$ …") ou quitada com parte recebida fora do extrato.
  - "Recebida e conciliada": quitada e tudo ligado ao extrato.
  - "Cancelada".
  - Uma diferença de até R$ 0,05 fecha a conta.
- **Recebíveis das vendas**: uma linha por vencimento (Ato, Sinal, Mensal #n, FGTS, Subsídio, Permuta, Financiamento), em **valor nominal, sem INCC**.

**O que ela NÃO faz:** os recebíveis das vendas são **só consulta**: não há baixa neles aqui, e para mudá-los é preciso editar o plano em Unidades. A tela não importa extrato, o que se faz no Caixa.

---

## Liberações de Obra (/reembolso) — módulo Receitas

**Para que serve:** registra as parcelas do **financiamento da obra** que a instituição financeira libera depois da medição. A tela trata isso como **entrada de caixa, não receita**: neste sistema, a receita vem da venda das unidades.

**O que se faz nela:**
- Lançar data, origem, valor e observações.
  - A data é aquela em que o recurso entrou na conta, e é a que o Fluxo de Caixa usa.
  - A origem identifica o banco e a referência da medição.
- Editar enquanto a liberação não estiver cancelada. Cancelar exige um motivo, e a linha fica riscada, fora dos totais.
- As liberações também aparecem no Fluxo de Caixa, no Caixa, na Projeção e no Resumo.
- Usar o assistente para comparar liberações com medições e com o financiamento previsto nas vendas. Ele só lê.
- **Lançar com a Cris**: em Nova liberação, diga, dite ou anexe o ofício ou o extrato. A Cris preenche data, origem, valor e observações, e quem grava é Salvar liberação.

**O que ela NÃO faz:** não confere valores com o banco nem cria receita na DRE; não é o financiamento do comprador (que fica no plano da unidade).

---

## Permuta (/permuta) — módulo Receitas

**Para que serve:** é o inventário dos **ativos recebidos como permuta** e o registro da revenda deles.

**O que se faz nela:**
- Ver os totais: estimado em inventário, caixa projetado da revenda e **resultado das revendas** (venda menos valor de entrada).
- Cadastrar o ativo com unidade de origem, cliente, data de recebimento, tipo, descrição, valor estimado, status e dados da revenda.
- Anexar documentos (matrícula, laudo, contrato, recibo) depois de salvar.
- Importar e exportar planilha.
- Cancelar com motivo. O ativo fica na lista, fora dos totais.
- Usar o assistente, que analisa as permutas e oferece lançamento por descrição: a IA **propõe** os campos, e a pessoa confere e grava.
- **Fotos do ativo**: em Documentos e fotos do ativo, o tipo "Foto do ativo" guarda a foto do bem, que aparece em miniatura na lista.
- **Lançar com a Cris**: no ativo novo ou na edição, diga, dite ou anexe o laudo, o contrato ou a foto. A Cris preenche unidade, data, tipo, descrição, valor estimado e os dados da revenda; quem grava é Salvar. A Cris não preenche o cliente; ele é escolhido à mão. Se o documento anexado tiver o nome, o modelo lê o documento, mas o nome não vai para o formulário.

**Campos que confundem:**
- **Status**: "Disponivel" (em estoque) ou "Vendido". Quando é Vendido, data, valor e forma da revenda são obrigatórios.
- **Forma da revenda**:
  - À vista: um recebimento.
  - Parcelada: com parcelas, periodicidade e 1º vencimento.
  - Escambo: troca **sem entrada de caixa**.
- **"no Estoque"**: indica que o ativo originou uma entrada no Estoque.
- **Resultado × valor cheio**: a tela mostra a diferença entre a venda e a entrada. A DRE ainda usa o valor cheio. Confirme com a sua contabilidade qual tratamento adotar.

**O que ela NÃO faz:** não atualiza a fonte "Permuta" do plano da unidade, e vice-versa. Cuidado para não contar o mesmo bem duas vezes.

---

## Projeção de Receitas (/projecao) — módulo Business Intelligence

**Para que serve:** mostra, mês a mês, o que uma obra deve receber das unidades vendidas e das liberações de obra.

**O que mostra:**
- **Uma versão (modo detalhado)**: gráfico de unidades vendidas e liberações, quadro com o total e detalhe por unidade.
  - Tem filtro por ano ou por período e exportação em CSV.
  - Os valores das unidades são os mesmos recebíveis de Contas a Receber: todas as fontes preenchidas, em valor nominal.
  - Em Orçamento ou Previsão, a receita vem do planejamento lançado.
- **Duas ou três versões (modo comparação)**: tabela de totais por fonte (AS/Sinais, Mensais, Semestrais, Anuais, FGTS, Subsídio, Permuta, Liberações).
  - Esse modo aplica INCC a partir da 5ª parcela e respeita as caixas "Usar …" do plano.
  - Só conta o Subsídio "Recebido" e não conta o Financiamento. Por isso, os totais podem diferir do modo detalhado.

**Chave:** desligada (o padrão), todas as versões entram nos totais. Se a empresa ligar "Orçamento em Rascunho não entra em relatório", versões de Orçamento ou Previsão não Aprovadas aparecem vazias, com o aviso "não entra nos totais" no seletor.

**O que ela NÃO faz:** não mostra despesas nem saldo, que ficam no Fluxo de Caixa. Não junta várias obras. Não grava nada.

---

## Medição de Projeto (/medicao e /medicaolanc) — módulo Obra

**Para que serve:** registra o valor medido por grupo de obra (grupos CEF do Plano de Contas) em cada competência e compara com o orçado no Relatório CEF. É informação auxiliar: **não entra na DRE**.

**As três abas** (cada uma aparece só para quem tem permissão):
- **Nova medição** (/medicaolanc): competência (MM/AAAA), grupo CEF, valor medido e observação. O lançamento vai para a versão Atual. Se já houver uma medição do mesmo grupo na mesma competência, o sistema **avisa** (pode ser complementar), mas não bloqueia.
- **Medições lançadas**: filtros por competência, grupo e autor. Aqui se edita, exclui e anexa documentos (laudo, relatório fotográfico, PLS, ART/RRT), com versão por tipo. As medições duplicadas aparecem marcadas.
- **Relatório CEF** (/medicao): Orçado, Realizado (medições de todos os autores) e "% do orçado medido", por grupo. Tem recorte por competência, escolha do Orçamento e "Imprimir página".

**Campos que confundem:**
- **Competência**: é o mês a que a medição se refere, não a data em que foi lançada.
- **% do orçado medido**: é o valor medido dividido pelo valor orçado, uma razão financeira. **Não é o percentual físico do laudo.** O sinal "—" indica que falta orçado ou medição, e nunca significa 0%.
- **Avisos do relatório**: "Retenção final" (o medido passou do limite de liberação), "acima do orçado" (o total não é cortado em 100%) e obra sem Orçamento.
- **Engenheiro**: vê e altera só as medições que ele lançou e as que não têm autor.

**Chave:** desligada, qualquer Orçamento alimenta a coluna Orçado. Se a empresa ligar "Orçamento em Rascunho não entra em relatório", um Orçamento não Aprovado deixa a coluna vazia.

**O que ela NÃO faz:**
- Não gera o formulário oficial da Caixa (PLS/RAE). A impressão serve para conferência.
- Não lança a liberação do banco, que fica em Liberações de Obra.
- O assistente pode ler o laudo anexado com IA e apontar divergências, mas **não lança nada**. Na aba Nova medição, a Cris **preenche** o formulário com o que o engenheiro diz ou dita pelo microfone do chat (competência, grupo, valor e observação, uma medição por vez). Quem lança é o botão "Lançar medição", depois da conferência.

**Quem acessa:**
- Proprietário e administrador: as três abas.
- Membro: as três abas, sem excluir.
- Engenheiro: Nova medição e Medições lançadas.
- Contador: só o Relatório CEF.

---

## Estoque (/estoque) — módulo Obra

**Para que serve:** é o controle **físico** do almoxarifado: o que entrou, de onde veio e para qual obra saiu. **Não tem efeito contábil**, porque o custo já está na despesa de compra.

**O que se faz nela:**
- **Itens e Saldo**: cadastrar material (nome, SKU, unidade, categoria, custo unitário, mínimo). A aba mostra o saldo, o valor em estoque e os alertas de abaixo do mínimo e saldo negativo. Também permite inativar e reativar materiais.
- **Movimentos**:
  - **Dar entrada**: a origem pode ser Compra, Permuta, Devolução, Ajuste de inventário ou Transferência. A entrada precisa apontar **uma despesa de compra ou uma permuta**.
  - **Dar baixa**: exige motivo e **obra de destino**. Se o saldo ficar negativo, o sistema pede confirmação.
  - **Estornar**: cria um movimento inverso, e o original fica no histórico.
  - Anexar nota, romaneio ou foto.
  - Ver o consumo por obra e o comparativo compra × consumo.
- Usar o assistente, que pode ler a nota de uma despesa e **propor** as entradas item a item. Cada entrada só é criada com o clique da pessoa.
- **Atalhos no topo**: "↓ Dar entrada" e "↑ Dar baixa (saída para obra)" abrem a aba Entradas & Saídas já no tipo certo.
- **Com a Cris**: na aba Entradas & Saídas, ela preenche a entrada ou a baixa a partir do que a pessoa diz ou dita (material, quantidade, motivo, obra, despesa, data, documento). Quem registra é o botão "Registrar entrada" ou "Registrar baixa". O painel lateral tem, embaixo das perguntas prontas, uma caixa para conversar com a Cris.

**Campos que confundem:**
- **Custo unitário**: é o do cadastro no momento do movimento, e fica gravado no movimento.
- **Entradas acima do valor da despesa**: o sistema só avisa, porque pode ser frete ou desconto.

**O que ela NÃO faz:** não cria despesa, não altera a DRE e não transfere custo entre obras.

---

## Parâmetros / INCC (/parametros) — módulo Obra

**Para que serve:** guarda a tabela do INCC, com a variação mensal e o acumulado. Essa tabela é usada para corrigir as parcelas a partir da 5ª.

**INCC da empresa (uma série só):** o INCC vai ser um por empresa. Hoje cada obra ainda tem a própria tabela. Na tela, o proprietário ou um administrador **adota a série de uma obra como a da empresa** (as tabelas das obras ficam guardadas). A série da empresa só passa a valer quando a plataforma liga a chave "INCC da empresa": aí todas as obras leem a mesma série, o seletor de obra sai da tela e a edição vale para a empresa. Desligar volta às tabelas de cada obra.

**O que se faz nela:**
- Escolher a variante (DI, M ou 10) e informar a fonte do índice.
- Editar a variação de um mês na tabela. A edição pede confirmação, marca o mês como **Oficial** e recalcula só os meses projetados. Pode ser negativa, e um valor fora da faixa usual gera aviso, mas pode ser salvo.
- **Recalcular projeção**: preenche os meses "Projeção" com a média móvel. Meses oficiais nunca são sobrescritos.
- **Projetar**: devolve à projeção um mês futuro que foi marcado como oficial por engano.
- Usar o assistente, que aponta meses sem índice oficial e a cobertura dos vencimentos. **Ele não sugere índice oficial.**
- **Com a Cris**: ela recebe a tabela e explica a correção. Pode **projetar** os meses à frente pela média de 12 meses, como conta na conversa. Nada é gravado: o botão "Recalcular projeção" é que grava.

**Campos que confundem:**
- **Mês**: é o mês de referência do índice, normalmente divulgado no mês seguinte.
- **Onde a correção incide**: Caixa, modo comparação da Projeção e Simulador.
- **Onde não incide**: Contas a Receber, Projeção detalhada e receita da DRE, que usam valor nominal. A correção é aplicada na leitura, e nada é gravado corrigido.

**O que ela NÃO faz:** não busca índice externo. Não tem como acrescentar meses: a tabela nasce com a obra, a partir de uma tabela padrão.

---

## Funcionários (/funcionarios) — módulo Pessoas

**Para que serve:** ficha de registro dos funcionários **CLT** (autônomos e sócios ficam em Fornecedores).

**O que se faz nela:**
- Listar os funcionários, com opção de mostrar os desligados.
- Cadastrar e abrir a ficha, com identificação, números de documentos, endereço, contrato, dados bancários, observações e dependentes (IR e salário-família).
- Anexar documentos. O ASO só aparece para quem tem a permissão de ASO, e cada acesso a ele fica registrado.
- **Com a Cris**: ela preenche só o **vínculo de trabalho** (cargo, setor, obra, tipo e prazo do contrato, admissão e observação) e abre o formulário de novo funcionário. Nome, documentos, nascimento, filiação, endereço, jornada, salário e dados bancários são preenchidos à mão: a Cris não preenche dado pessoal do funcionário. Se o documento anexado (CTPS, contrato) tiver esses dados, o modelo lê o documento, mas eles não vão para o formulário. Quem cadastra é o botão "Cadastrar".
- **Desligar** com data: o funcionário sai das alocações, e o histórico fica. É possível **Reativar**. **Excluir** só é possível sem nenhuma alocação em equipe, digitando o nome.
- **Folha de pagamento e encargos** (/funcionarios/folha), para quem tem permissão de dados do funcionário: arquivo mensal com folha, holerites, guias e comprovantes.
  - Cada folha pode ser vinculada à despesa que a pagou.
  - Há uma conferência que aponta folha sem despesa e despesa que parece folha sem registro.

**Campos que confundem:** endereço, salário, jornada, banco e dependentes só aparecem com a permissão de dados do funcionário.

**O que ela NÃO faz:** **não calcula folha**, nem INSS, FGTS, IRRF, férias ou rescisão. O pagamento é lançado em Despesas. Para obrigações trabalhistas, confirme com a sua contabilidade.

---

## Equipes de Projetos (/equipes) — módulo Pessoas

**Para que serve:** mostra quem trabalha em cada obra e em qual função, e controla as **diárias executadas**.

**O que se faz nela:**
- **Alocar** pessoas na obra. Elas vêm de Funcionários (CLT) ou de Fornecedores (autônomo e sócio). Cada alocação tem função, diária (para autônomos) e data de entrada. A lista de funções pode ser editada ali mesmo.
- **Registrar o dia**: marcar quem trabalhou (ou "Marcar todos"), a data e uma observação. Não há geolocalização: é uma declaração de quem coordena a obra.
- Anexar documentos do dia (folha de ponto assinada, foto, recibo). Valem para a equipe inteira.
- **Acumulado por membro** (De/Até), com o que está "Sem lançamento"; para autônomos, "Lançar em Despesas →" abre o lançamento preenchido.
- Usar o assistente, que **propõe** a lista do dia e pode ler a folha de ponto anexada. A gravação só acontece com o clique da pessoa.

**Campos que confundem:**
- **Função**: é o que a pessoa faz naquela obra, não o papel dela no cadastro.
- **Diária**: o valor é da alocação e fica gravado em cada registro. Mudar o valor vale para os próximos registros. Só os autônomos têm valor; para CLT e sócio, o registro é só de presença.

**O que ela NÃO faz:** **a diária não gera despesa**. O lançamento acontece em Despesas.

---

## Diferenças entre telas parecidas

- **Liberações de Obra × Ressarcimentos (/restituicoes, Despesas)**:
  - A Liberação é dinheiro que **entra**: a parcela do financiamento da obra liberada pelo banco.
  - O Ressarcimento é dinheiro que **sai**: a devolução a quem pagou um fornecedor em nome da empresa. A despesa fica em Despesas, e a saída de caixa acontece no ressarcimento.
- **Relatório CEF × Nova medição e Medições lançadas**:
  - São abas da mesma tela.
  - Nova medição e Medições lançadas servem para lançar e gerenciar. O engenheiro usa essas.
  - O Relatório CEF só lê e compara orçado × medido. O contador vê esse.
- **Medição × Liberação**: a medição é o executado; a liberação é o dinheiro que o banco depositou. São lançadas separadamente.
- **Contas a Receber × Unidades**: os recebíveis das vendas nascem do plano em Unidades e só aparecem em Contas a Receber para consulta. A baixa e a conciliação valem só para contas lançadas em Contas a Receber.
- **Projeção × Fluxo de Caixa**: a Projeção mostra só as entradas previstas de uma obra. O Fluxo de Caixa mostra entradas e saídas, previsto e realizado, e o saldo acumulado.
- **Permuta × fonte "Permuta" do plano**: a fonte do plano é parte do pagamento da unidade. A tela Permuta é o inventário e a revenda do bem. Uma não atualiza a outra.
- **Estoque × Despesas**: Despesas tem o custo; o Estoque, a quantidade e o destino.
- **Funcionários × Fornecedores × Equipes**: Funcionários guarda os CLT. Fornecedores guarda autônomos e sócios. Equipes aloca os dois nas obras e registra as diárias.

## Caminhos comuns

- Para **cadastrar uma venda**, vá em Receitas → Unidades → abra a unidade → status "Vendido", data da venda e plano → confira se o Saldo vs VGV fecha em zero → Salvar.
- Para **ligar o comprador à unidade**, vá em Receitas → Clientes → Novo ou Editar → Unidade comprada e Status do contrato.
- Para **registrar um recebimento avulso**, vá em Receitas → Contas a Receber → crie a conta → Receber → "Extrato bancário" (para conciliar) ou outra forma, com justificativa.
- Para **lançar a liberação do banco**, vá em Receitas → Liberações de Obra → "+ Nova liberação".
- Para **lançar uma medição**, vá em Obra → Medição de Projeto → Nova medição. O laudo é anexado em Medições lançadas.
- Para **ver orçado × medido**, vá em Obra → Medição de Projeto → Relatório CEF → Imprimir página.
- Para **atualizar o INCC do mês**, vá em Obra → Parâmetros / INCC → edite o mês na tabela → confirme.
- Para **dar entrada de material comprado**, vá em Obra → Estoque → Movimentos → Dar entrada → vincule a despesa de compra.
- Para **lançar as diárias de um autônomo**, vá em Pessoas → Equipes de Projetos → Acumulado por membro → "Lançar em Despesas →".
- Para **simular uma proposta**, vá em Receitas → Simulador → escolha a obra → preencha os valores → confira a maior parcela contra o limite de renda.
`;

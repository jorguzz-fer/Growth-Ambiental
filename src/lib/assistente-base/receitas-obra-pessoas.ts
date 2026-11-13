/** Base de conhecimento da Cris — Receitas, Projetos e Pessoas. Descreve o sistema de HOJE. */
export const TEXTO = `# Base de conhecimento: Receitas, Projetos e Pessoas

## Quem acessa (padrão por papel)

Padrões de cada papel; o proprietário ou um administrador pode ajustá-los por membro em Configurações → Gestão de Acessos.

- **Proprietário e Administrador**: acesso total.
- **Membro**: pode ver, criar e editar em todas as telas desta parte, mas não pode excluir nem cancelar. Se a chave "Padrão novo do papel membro" estiver ligada para a empresa (a plataforma liga a pedido), o membro passa a ver, desta parte, só Clientes e Contas a Receber.
- **Contador**: só leitura. Desta parte, por padrão não vê nenhuma tela; pode receber "ver" na Gestão de Acessos.
- **Engenheiro / técnico de campo**: lança a **medição de serviço** no contrato (Contratos → Medições) e vê os contratos para escolher o item. Não aprova e não vê o financeiro do contrato.
- **Dados sensíveis** (dados financeiros e de perfil do cliente, dados pessoais e salariais do funcionário, ASO): permissões à parte que, por padrão, só o proprietário e o administrador têm. Podem ser concedidas na Gestão de Acessos.

Quase toda tela pede o projeto no seletor do topo; com a versão de trabalho congelada, gravar, editar e cancelar ficam bloqueados.

---

## Clientes (/clientes) — módulo Receitas

**Para que serve:** o cadastro dos **clientes contratantes** da consultoria (empresas, concessionárias, órgãos públicos, pessoas físicas). O cliente é escolhido no contrato, no projeto e nas contas a receber.

**O que se faz nela:**
- Buscar por nome e filtrar a lista.
- Cadastrar e editar a ficha do cliente.
- Anexar documentos do cliente (proposta, contrato, termo aditivo), até 10 MB cada. Um novo arquivo do mesmo tipo vira a versão seguinte, e a anterior continua guardada.
- Excluir o cliente, digitando o nome dele para confirmar.
- A Cris **não** preenche a ficha do cliente. O anexo do chat (📎) funciona em qualquer tela, inclusive aqui: se alguém anexar um documento do cliente, o modelo lê o documento inteiro, com nome e CPF ou CNPJ. Os documentos do cliente ficam no bloco de documentos da ficha, não na Cris.

**Campos que confundem:**
- **CPF/CNPJ**: aparece mascarado na lista. Na ficha, aparece completo só para quem tem a permissão de dados do cliente.
- **Dados financeiros e de perfil**: sem a permissão de dados do cliente, esses blocos não aparecem.

**O que ela NÃO faz:** não cria contrato (isso é em Contratos) e não registra pagamentos, que ficam em Contas a Receber. A exclusão é bloqueada se houver contas a receber, documentos, projetos em que ele é o cliente ou recebimento por terceiro vinculados.

---

## Contas a Receber (/contasreceber) — módulo Receitas

**Para que serve:** reúne o que a empresa tem a receber: as **faturas dos contratos** (criadas pelo botão "Faturar" no contrato) e as contas a receber lançadas à mão, com recebimento e conciliação.

**O que se faz nela:**
- Filtrar por projeto ou "Todos os projetos" e buscar em tudo.
- Criar uma conta com projeto, tipo, valor, vencimento, descrição e, se quiser, cliente e banco. Uma entrada do extrato encaminhada pelo Caixa abre o formulário já preenchido.
- **Receber**: informar valor, data e forma (Extrato bancário, Espécie, Repasse de terceiro ou Outro).
  - "Extrato bancário" exige escolher a linha do extrato, o que concilia o recebimento.
  - As outras formas exigem justificativa.
  - São aceitos recebimentos parciais.
- Anexar arquivos, editar e cancelar. A conta cancelada sai das listas e relatórios, mas fica no histórico.
- Usar o assistente, que **propõe** pares conta ↔ linha do extrato. Só concilia quando a pessoa clica em "Conciliar".
- **Lançar com a Cris**: diga, dite ou anexe o que receber (ex.: "segunda parcela do monitoramento arqueológico vencendo dia 10"). A Cris preenche o formulário Nova conta a receber (projeto, tipo, valor, vencimento, descrição e banco) e quem grava é Adicionar. A Cris não preenche o cliente; ele é escolhido à mão. Se o documento anexado tiver o nome, o modelo lê o documento, mas o nome não vai para o formulário.

**Campos que confundem:**
- **Tipo**: a lista é a da tela; "Outras Receitas" exige descrição.
- **Estado**: é calculado pelo sistema, não digitado.
  - "A receber": nada recebido.
  - "Recebida": parcial (mostra "falta R$ …") ou quitada com parte recebida fora do extrato.
  - "Recebida e conciliada": quitada e tudo ligado ao extrato.
  - "Cancelada".
  - Uma diferença de até R$ 0,05 fecha a conta.
- **Fatura do contrato**: nasce aqui como qualquer conta a receber. A baixa, a conciliação e o cancelamento são feitos aqui; o contrato mostra o faturado e o recebido.

**O que ela NÃO faz:** não fatura medição (isso é no contrato, aba Faturamento e recebimentos) e não importa extrato, o que se faz no Caixa.

---

## Telas que saíram (módulos de construção e incorporação)

O Growth Ambiental veio de um sistema para construtoras. As telas exclusivas de venda de imóveis e de obra saíram; os dados gravados antes continuam guardados e os relatórios históricos continuam a lê-los. Quem abre o endereço antigo cai na tela que assumiu a função, com um aviso:
- **Unidades** (/unidades, cadastro de unidades imobiliárias e planos de pagamento): saiu. A receita vem dos contratos de serviço (medições e faturamento) e é acompanhada em Contas a Receber.
- **Simulador de financiamento** (/simulador, SAC/PRICE): saiu. Condições de pagamento e reajuste ficam no cadastro de cada contrato.
- **Permuta** (/permuta): saiu. Receitas e recebíveis ficam em Contas a Receber.
- **Índices de Reajuste / INCC** (/parametros): saiu. O reajuste é do contrato: índice (IPCA, IGP-M, INPC) e data-base ficam no cadastro de cada contrato.
- **Medição por grupo de obra e Relatório CEF** (/medicao e /medicaolanc): saíram. A medição é do **serviço**, no contrato (Contratos → Medições).
- **Liberações de Obra** (/reembolso, financiamento imobiliário): saiu. Despesas reembolsáveis pelo cliente ficam em Contratos → Despesas Reembolsáveis.
- **Projeção de Receitas** (/projecao, por unidade): saiu. A receita dos serviços (contratado, medido, faturado, recebido e a receber) está no Painel de Contratos; a comparação entre versões fica na DRE.
- **Conferência de planos de venda**: saiu. Os vencimentos ficam em Contas a Receber.

---

## Materiais e Equipamentos (/estoque) — módulo Projetos

**Para que serve:** é o controle **físico** dos materiais e equipamentos de campo: o que entrou, de onde veio e para qual projeto saiu. **Não tem efeito contábil**, porque o custo já está na despesa de compra.

**O que se faz nela:**
- **Itens e Saldo**: cadastrar material ou equipamento (nome, SKU, unidade de medida, categoria, custo unitário, mínimo). A aba mostra o saldo, o valor em estoque e os alertas de abaixo do mínimo e saldo negativo. Também permite inativar e reativar itens.
- **Movimentos**:
  - **Dar entrada**: a origem pode ser Compra, Devolução, Ajuste de inventário ou Transferência. A entrada de compra aponta a **despesa de compra**.
  - **Dar baixa**: exige motivo e **projeto de destino**. Se o saldo ficar negativo, o sistema pede confirmação.
  - **Estornar**: cria um movimento inverso, e o original fica no histórico.
  - Anexar nota, romaneio ou foto.
  - Ver o consumo por projeto e o comparativo compra × consumo.
- Usar o assistente, que pode ler a nota de uma despesa e **propor** as entradas item a item. Cada entrada só é criada com o clique da pessoa.
- **Atalhos no topo**: "↓ Dar entrada" e "↑ Dar baixa" abrem a aba Entradas & Saídas já no tipo certo.
- **Com a Cris**: na aba Entradas & Saídas, ela preenche a entrada ou a baixa a partir do que a pessoa diz ou dita (material, quantidade, motivo, projeto, despesa, data, documento). Quem registra é o botão "Registrar entrada" ou "Registrar baixa". O painel lateral tem, embaixo das perguntas prontas, uma caixa para conversar com a Cris.

**Campos que confundem:**
- **Custo unitário**: é o do cadastro no momento do movimento, e fica gravado no movimento.
- **Entradas acima do valor da despesa**: o sistema só avisa, porque pode ser frete ou desconto.

**O que ela NÃO faz:** não cria despesa, não altera a DRE e não transfere custo entre projetos.

---

## Funcionários (/funcionarios) — módulo Pessoas

**Para que serve:** ficha de registro dos funcionários **CLT** (autônomos e sócios ficam em Fornecedores).

**O que se faz nela:**
- Listar os funcionários, com opção de mostrar os desligados.
- Cadastrar e abrir a ficha, com identificação, números de documentos, endereço, contrato, dados bancários, observações e dependentes (IR e salário-família).
- Anexar documentos. O ASO só aparece para quem tem a permissão de ASO, e cada acesso a ele fica registrado.
- **Com a Cris**: ela preenche só o **vínculo de trabalho** (cargo, setor, projeto, tipo e prazo do contrato, admissão e observação) e abre o formulário de novo funcionário. Nome, documentos, nascimento, filiação, endereço, jornada, salário e dados bancários são preenchidos à mão: a Cris não preenche dado pessoal do funcionário. Se o documento anexado (CTPS, contrato) tiver esses dados, o modelo lê o documento, mas eles não vão para o formulário. Quem cadastra é o botão "Cadastrar".
- **Desligar** com data: o funcionário sai das alocações, e o histórico fica. É possível **Reativar**. **Excluir** só é possível sem nenhuma alocação em equipe, digitando o nome.
- **Folha de pagamento e encargos** (/funcionarios/folha), para quem tem permissão de dados do funcionário: arquivo mensal com folha, holerites, guias e comprovantes.
  - Cada folha pode ser vinculada à despesa que a pagou.
  - Há uma conferência que aponta folha sem despesa e despesa que parece folha sem registro.

**Campos que confundem:** endereço, salário, jornada, banco e dependentes só aparecem com a permissão de dados do funcionário.

**O que ela NÃO faz:** **não calcula folha**, nem INSS, FGTS, IRRF, férias ou rescisão. O pagamento é lançado em Despesas. Para obrigações trabalhistas, confirme com a sua contabilidade.

---

## Equipes e Presença de Campo (/equipes) — módulo Pessoas

**Para que serve:** mostra quem trabalha em cada projeto e em qual função (arqueólogo, biólogo, técnico de campo, auxiliar…) e controla as **diárias executadas** em campo.

**O que se faz nela:**
- **Alocar** pessoas no projeto. Elas vêm de Funcionários (CLT) ou de Fornecedores (autônomo e sócio). Cada alocação tem função, diária (para autônomos) e data de entrada. A lista de funções pode ser editada ali mesmo.
- **Registrar o dia**: marcar quem trabalhou (ou "Marcar todos"), a data e uma observação. Não há geolocalização: é uma declaração de quem coordena a equipe em campo.
- Anexar documentos do dia (folha de ponto assinada, foto, recibo). Valem para a equipe inteira.
- **Acumulado por membro** (De/Até), com o que está "Sem lançamento"; para autônomos, "Lançar em Despesas →" abre o lançamento preenchido.
- Usar o assistente, que **propõe** a lista do dia e pode ler a folha de ponto anexada. A gravação só acontece com o clique da pessoa.

**Campos que confundem:**
- **Função**: é o que a pessoa faz naquele projeto, não o papel dela no cadastro.
- **Diária**: o valor é da alocação e fica gravado em cada registro. Mudar o valor vale para os próximos registros. Só os autônomos têm valor; para CLT e sócio, o registro é só de presença.

**O que ela NÃO faz:** **a diária não gera despesa**. O lançamento acontece em Despesas.

---

## Diferenças entre telas parecidas

- **Medição × Faturamento × Recebimento**: a medição (Contratos → Medições) registra o serviço executado e, aprovada, consome o saldo do contrato; o faturamento ("Faturar", no contrato) cria a conta a receber; o recebimento é a baixa dessa conta em Contas a Receber. Medição não é receita.
- **Despesas Reembolsáveis × Ressarcimentos (/restituicoes, Despesas)**:
  - A despesa reembolsável é a despesa já lançada que o **cliente contratante** vai devolver à empresa (hospedagem da equipe técnica, análises laboratoriais, taxas), marcada no contrato.
  - O Ressarcimento é dinheiro que **sai**: a devolução a quem pagou um fornecedor em nome da empresa. A despesa fica em Despesas, e a saída de caixa acontece no ressarcimento.
- **Contratos × Contas a Receber**: o contrato guarda o valor, os aditivos, as medições e o saldo; a conta a receber é a fatura com vencimento, que a DRE e o Fluxo de Caixa leem.
- **Painel de Contratos × Fluxo de Caixa**: o Painel mostra contratado, medido, faturado e a receber por contrato e cliente. O Fluxo de Caixa mostra entradas e saídas, previsto e realizado, e o saldo acumulado.
- **Materiais e Equipamentos × Despesas**: Despesas tem o custo; Materiais e Equipamentos, a quantidade e o destino.
- **Funcionários × Fornecedores × Equipes**: Funcionários guarda os CLT. Fornecedores guarda autônomos e sócios. Equipes aloca os dois nos projetos e registra as diárias.

## Caminhos comuns

- Para **lançar uma medição de serviço**, vá em Contratos → Contratos → abra o contrato → aba Medições → escolha o item e o período → "Salvar e enviar".
- Para **faturar uma medição aprovada**, abra o contrato → aba Faturamento e recebimentos → escolha o projeto, o valor e o vencimento → "Faturar". A fatura aparece em Contas a Receber.
- Para **registrar um recebimento**, vá em Receitas → Contas a Receber → Receber → "Extrato bancário" (para conciliar) ou outra forma, com justificativa.
- Para **registrar uma despesa reembolsável pelo cliente**, lance a despesa em Despesas no projeto do contrato; depois, abra o contrato → aba Faturamento e recebimentos → escolha a despesa → "Marcar como reembolsável". O relatório fica em Contratos → Despesas Reembolsáveis.
- Para **dar entrada de material ou equipamento comprado**, vá em Projetos → Materiais e Equipamentos → Movimentos → Dar entrada → vincule a despesa de compra.
- Para **lançar as diárias de um autônomo**, vá em Pessoas → Equipes e Presença de Campo → Acumulado por membro → "Lançar em Despesas →".
`;

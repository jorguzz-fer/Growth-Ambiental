/** Base de conhecimento da Cris — Conceitos do produto, Despesas e Caixa. Descreve o sistema de HOJE. */
export const TEXTO = `# Base de conhecimento C — Conceitos, Despesas e Caixa

## Conceitos do produto

### Projeto, obra e escritório
- **Projeto** é a unidade de tudo. Há dois tipos: **obra/empreendimento** e **escritório/filial**, que aparece num grupo próprio, no fim dos seletores.
- O projeto tem uma **situação cadastral** (Ativo ou Finalizado), definida em Projetos. Ela não é a fase da obra.
- **Não há "projeto ativo" global.** Cada tela guarda a obra no próprio endereço e lembra a última escolhida na aba. Sem escolha, a tela pede uma; nunca abre "a primeira obra" sozinha.
- Algumas telas oferecem **"Todos os projetos / filiais"**. Em Despesas, essa opção mostra a consulta consolidada, com a coluna Origem; ao lançar, a obra é escolhida no formulário.
- Relatórios (Dashboard, DRE, Fluxo de Caixa, Resumo Executivo) aceitam os escopos **Todos**, **Ativos** e **Finalizados**. "Todos" inclui obras e escritórios. "Ativos" e "Finalizados" incluem só obras. Obra sem situação fica fora desses dois, com aviso.

### Versões e cenários
Cada projeto tem versões (cenários):
- **Atual**: o realizado. Recebe despesas, pagamentos e caixa do dia a dia. Pagamento só é aceito em despesa da Atual.
- **Orçamento** (budget): o planejado.
- **Previsão Atualizada** (forecast): uma reprojeção. Pode nascer de um Orçamento como cópia independente, que não acompanha as mudanças feitas nele depois.
- **Cópias**: versões duplicadas ou personalizadas, marcadas como "cópia" nos relatórios. Por padrão, os relatórios mostram a Atual e o Orçamento e a Previsão mais recentes que não são cópia.
- **Situação** (Orçamento e Previsão): Rascunho → Concluído → Aprovado. Só se aprova a partir de Concluído, e sair de Aprovado pede confirmação. Entrar ou sair de Aprovado exige a permissão "Aprovar e desaprovar versão" (por padrão, owner e admin). Toda troca vai para a Auditoria.
- Com a chave "Orçamento em Rascunho não entra em relatório" desligada, o planejamento entra nos relatórios em qualquer situação. Se ela for ligada, só o Aprovado entra; a Atual nunca é filtrada.
- **Trava (versão congelada):** bloqueia lançar, editar, pagar, cancelar e excluir naquela versão. É independente da situação: aprovar não trava. Exige a permissão "Travar e destravar versão" (por padrão, owner e admin) e fica nas telas de Projetos, Orçamentos e Previsão.

### Competência, vencimento e data de pagamento
Cada despesa tem três datas, e confundi-las é o erro mais caro do sistema:
- **Competência** (mês/ano): o mês a que o custo pertence. A **DRE soma despesas por competência**.
- **Vencimento**: quando a conta deve ser paga. **Contas a Pagar** filtra e ordena por ele, e "Vencida" vem dele. O **previsto do Fluxo de Caixa** também usa o vencimento (o da parcela, quando houver; sem vencimento, a competência).
- **Data de pagamento (caixa)**: quando o dinheiro saiu, registrada no pagamento, na conciliação ou no ressarcimento. O **realizado do Fluxo de Caixa** e o **Caixa** usam essa data.
- Exemplo: competência 03, vencimento 10/04, paga em 12/04. Aparece na DRE em março, em Contas a Pagar vencendo em 10/04 e no realizado do Fluxo em abril.
- Na DRE, multa e juros entram pela data de pagamento com a chave "DRE pela definição nova" desligada. Se ela for ligada, entram na competência da despesa que os gerou.
- No cartão, a competência é a informada, o vencimento é o da fatura e o caixa sai no pagamento da fatura.

### Categoria DRE e plano de contas
- Toda despesa tem duas classificações:
  - **Conta do Plano de Contas**: a natureza do gasto (ex.: Hospedagens, Combustíveis). Só conta ATIVA do plano da empresa; projeto, contrato e fase vão nos campos próprios. Grupos e contas se editam em Planejamento → Plano de Contas.
  - **Custo direto ou indireto**: vazio = o padrão da conta; marque quando este lançamento for tratado diferente (ex.: combustível da administração).
  - **Categoria DRE**: a lista é fixa: Receita, Custo Variável, Custo Fixo, Despesa Variável, Despesa Fixa, Retiradas, Investimento, Empréstimos e Despesas Financeiras.
- **Cada conta do Plano de Contas tem uma categoria da DRE.** O sistema traz um padrão de boa prática (gasto de obra é Custo Variável; comissão e marketing, Despesa Variável; escritório, TI e contabilidade, Despesa Fixa; tarifa, juro e multa, Despesas Financeiras). A categoria de cada conta se troca em Planejamento → Plano de Contas.
- Com a chave "Despesa herda a categoria da DRE do Plano de Contas" ligada, a categoria da despesa vem da conta e aparece travada no lançamento, e os relatórios contam as despesas já lançadas pela categoria da conta. Desligada, a pessoa escolhe a categoria em cada despesa, como antes.
- Uma despesa não aceita a categoria "Receita". Lançamento antigo com categoria inválida precisa ser trocado antes de salvar.
- Se tiver dúvida sobre qual conta ou categoria usar, confirme com a sua contabilidade. O sistema só aplica a classificação escolhida.

### Chaves de mudança
- São regras novas que mudam números de relatório ou acessos. **Todas nascem desligadas**; desligadas, o sistema funciona exatamente como antes.
- São ligadas **por empresa**, pela plataforma (Growth Tools), depois de conferida a prévia. A empresa pede a mudança; não há tela de chaves para o cliente.
- Chaves existentes: padrão novo do membro; Contas a Pagar só com a Atual; saída do ressarcimento segue a despesa; Rascunho fora dos relatórios; definição nova da DRE, do Fluxo de Caixa, do Dashboard e do Resumo Executivo; despesa herda a categoria do Plano de Contas; e Orçamento usa a categoria do Plano de Contas.
- Algumas telas mostram, só para quem administra chaves, um bloco **"Prévia da chave"**.

### Papéis e Gestão de Acessos
- **owner** (Proprietário) e **admin** (Administrador): acesso total, sempre.
- **membro**: com a chave "padrão novo do membro" desligada, pode ver, criar e editar em todas as telas fora de Configurações, mas **não exclui nem cancela**. Se a chave for ligada, passa a alcançar só as telas de lançamento e receita: Despesas, Contas a Pagar, Fornecedores, Caixa, Contas Correntes, Medição, Clientes, Unidades, Contas a Receber e Permuta.
- **contador**: somente leitura. Por padrão vê DRE, Fluxo de Caixa, Medição, Resumo, Plano de Contas, Despesas e Auditoria. Pode receber "ver" em outras telas, mas nunca criar, editar ou excluir.
- **engenheiro**: só o lançamento de Medição.
- **Gestão de Acessos** (Configurações): owner e admin ajustam, membro a membro, a matriz Ver/Criar/Editar/Excluir de cada tela. Usuários, Gestão de Acessos e Chaves de mudança não podem ser concedidas a outros papéis.
- Algumas permissões são **ações**, não telas: "Fechar o dia (no Caixa)"; "Conciliação — ajustar e desfazer" (criar = lançar ajuste; excluir = desfazer conciliação e reabrir dia); "Travar e destravar versão"; "Aprovar e desaprovar versão".

### O assistente
- **Painel por tela**: várias telas (Caixa, Cartões, Ressarcimentos, Fornecedores, Contas Correntes e outras) têm um painel lateral recolhível, com análises calculadas sobre o que a página carregou, sem enviar nada a modelo de IA. É **somente leitura**. No Caixa, ele **propõe** pares extrato × despesa, e a conciliação só acontece quando a pessoa confirma.
- **A Cris (chat no canto inferior direito, em qualquer tela)**:
  - **O que ela faz:** explica como o sistema funciona; analisa os números da tela em que a pessoa está; busca em outras telas as quatro métricas do catálogo (**receita**, **custo**, **desvio de custo** e **saldo** das contas da empresa), sempre com o acesso da pessoa; **analisa os dados de qualquer módulo** pelas ferramentas de leitura; e, nas telas de lançamento, **propõe** o preenchimento do formulário. Quem grava é o botão da tela, depois que a pessoa confere.
  - **Análise de dados (ferramentas de leitura):** em qualquer tela, a Cris pode pedir ao servidor: custos e despesas da DRE por obra, categoria e mês (os mesmos números da DRE, versão Atual); despesas por fornecedor, conta ou situação; recebíveis e inadimplência por obra, unidade ou mês; caixa e conciliação; orçado × realizado; unidades e vendas; medição, estoque e equipes. O **servidor calcula e agrega** (no máximo 30 grupos por resposta, com o percentual de cada um); a Cris escolhe a ferramenta e os filtros e escreve o texto. Ela não escreve consulta ao banco e não recebe linhas em massa. Cada ferramenta confere se a pessoa pode ver aquele módulo e só usa as obras que ela vê. Ex.: "quais obras têm custo variável e qual o percentual de cada uma no total?". Para exportar, ela monta o relatório em **Relatórios Customizados**, que gera CSV e PDF, e entrega o link.
  - **O que vai ao modelo de IA:** a pergunta e o histórico da conversa nesta aba (até 12 falas); o **resumo dos números da tela** que a pessoa está vendo, com o nome da obra e os valores; o **resultado das buscas e das ferramentas de dados**: totais agregados com nome da obra, categoria, mês, conta e valores, **nome de fornecedor** quando o agrupamento é por fornecedor (como na tela de Despesas), e **código da unidade**; e o **documento anexado, inteiro** (PDF ou imagem). As ferramentas de dados nunca mandam nome de comprador, nome ou salário de membro de equipe, CPF, CNPJ de pessoa física, renda, dados bancários nem saúde. Na conciliação do Caixa, os candidatos de cada movimento levam o que a tela de conciliação já mostra (fornecedor da despesa, descrição da conta a receber, comprador da parcela).
  - **O que não vai:** o que a tela não mostra; o cadastro completo de clientes, funcionários ou fornecedores; o histórico de outras conversas; e, do resumo da tela, os campos com dado pessoal, que o sistema descarta antes de enviar (CPF, CNPJ, RG e documentos, e-mail, telefone, endereço e CEP, renda, salário, FGTS, score e restrições, nascimento, saúde, Pix, conta e agência bancária, senhas).
  - **A exceção é o anexo:** o documento vai inteiro ao modelo, com tudo o que estiver escrito nele, inclusive nome, CPF ou endereço de uma pessoa. A Cris não usa nome de cliente nem de funcionário para preencher o formulário, mas o modelo lê o documento. Só anexe o que precisa ser lido.
  - **A conversa não é gravada.** O sistema registra só o consumo (quantas perguntas e quantos tokens, por empresa e pessoa), nunca o conteúdo.
  - Sem a permissão de ver a tela de origem, ela diz que não tem acesso.
  - **Como mandar:** digite (Enter envia; Shift+Enter quebra a linha) ou cole. Texto colado com várias linhas, como uma tabela do Excel, chega como está. Um print ou arquivo colado, arrastado sobre o painel ou escolhido no 📎 vira o anexo da mensagem: PDF ou imagem (PNG, JPG, WEBP), até 4 MB; na tela do Caixa, também a planilha do extrato (XLSX ou CSV), que é lida no servidor e não vai ao modelo. Um anexo novo troca o anterior, com aviso. A mensagem vai até 6.000 caracteres; o que passar disso fica de fora, e a tela avisa quantos.
  - **Ditado (🎤):** o ditado é do navegador. No Chrome, no Edge e no Safari, o reconhecimento roda no serviço de fala do fabricante do navegador; o áudio não passa pelo servidor do Growth Ambiental e não vai ao modelo da Cris. O texto ditado entra no campo para a pessoa conferir e enviar. Se der erro, a mensagem aparece abaixo do campo (por exemplo, "Não ouvi nada" ou "O serviço de voz do navegador não respondeu"). No Firefox, o botão não aparece.
- **Leitura de documentos por IA** (Despesas, Fornecedores, extrato em PDF escaneado): a IA **propõe** o preenchimento e marca com alerta o que faltou ou ficou em dúvida. **Nada é gravado** antes de a pessoa conferir e confirmar. Sem a chave de IA, os campos são preenchidos à mão e o anexo funciona normalmente.

---

## Despesas / Lançamentos (/despesas) — módulo Despesas

**Para que serve:** lançar e manter as despesas (cada uma é um "PED") de uma obra ou escritório. É a origem da despesa na DRE, em Contas a Pagar e no Fluxo de Caixa.

**O que se faz nela:**
- Escolher a obra no seletor, ou "Todos os projetos / filiais" para consultar tudo.
- Abas:
  - **Lançamentos**: formulário e lista, com o último lançamento criado no topo (editar não muda a ordem).
  - **Pendente de NF**: lançamentos sem documento fiscal.
  - **Parcelas**: só com uma obra escolhida; paga parcela por parcela.
  - **Repositório**: documentos, com ou sem vínculo.
- Subir documentos e usar **"Preencher formulário"** (IA), que lê junto vários arquivos da mesma compra.
- **Recorrente**: repete por 2 a 60 meses, avançando competência e vencimento. Cada réplica tem PED próprio e nasce "A pagar".
- **Parcelamento**: À vista, 30, 30/60, 30/60/90 ou Personalizado. No painel de parcelas, cada linha tem vencimento, forma, banco e cheque próprios. As parcelas precisam fechar com o total. Recorrente e parcelado não se combinam.
- **Pagar** (na linha): registra data, valor, conta, juros, multa e desconto, e lança a saída no Caixa. Pagamentos parciais acumulam.
- **Cancelar despesa**: cancelamento lógico. A despesa sai de relatórios, Contas a Pagar e caixa, mas o histórico fica.
- **Excluir**: só sem vínculos (pagamento, parcela paga, acerto, ressarcimento, conciliação, nota ou anexo), digitando o PED.
- **Lançar com a Cris**: diga, dite ou anexe a nota, o boleto ou o recibo. A Cris preenche fornecedor, conta, categoria, competência, vencimento, valor, status, descrição e forma de pagamento, e também a recorrência (quantos meses) e o "paga por terceiro" (quem pagou, quando e se será reembolsado). Quem grava é Salvar.
- **Paga por terceiro — quem aparece**: quem tem o papel "Pagador por Terceiro" (dado em Ressarcimentos) e quem já pagou pela empresa antes, marcado "já pagou antes, sem o papel". Se ninguém aparece, dê o papel em Ressarcimentos.

**Campos que confundem:**
- **Status no formulário** (A pagar / Pago): marcar "Pago" ali **só muda o status**. Não registra pagamento nem saída no Caixa; para isso, use **Pagar** ou concilie o extrato.
- **Status exibido**: Cancelada, Pago, Parcialmente paga, **Vencida** ou A pagar. "Vencida" não é gravada: é calculada a partir do vencimento, com a data do servidor.
- **PED (Nº do pedido)**: numeração interna, gerada ao salvar e **imutável**; número não é reaproveitado. O número da nota tem campo próprio, em Documento Fiscal. O formato da numeração fica em Configurações → Numeração de despesas.
- **Parcela × cabeçalho**: quem chega de uma parcela vinda de Contas a Pagar edita o **cabeçalho** da despesa, não a parcela.
- **Travas**: com pagamento, parcela paga, acerto, ressarcimento ou conciliação, valor, status, competência, vencimento e forma não mudam. O caminho é cancelar e relançar, ou desfazer a conciliação. Em despesa parcelada, o total não se altera. Em compra no cartão, só a competência muda.
- **Documento duplicado** (mesmo documento e mesmo fornecedor): o sistema avisa e pede confirmação.

**O que NÃO faz:** não paga fatura de cartão (isso é feito em Cartões), não ressarce terceiro (em Ressarcimentos), não paga várias despesas num único pagamento (em Acerto Contábil ou na conciliação do Caixa) e não lança em Orçamento nem Previsão (em Orçamentos e Previsão Atualizada). Sem versão Atual na obra, a tela avisa e não lança.

**Quem acessa por padrão:**
- owner e admin: tudo;
- membro: ver, criar, editar e pagar, mas não cancela nem exclui;
- contador: só ver.

## Contas a Pagar (/contaspagar) — módulo Despesas

**Para que serve:** a lista da empresa inteira, com uma linha por obrigação que vence: despesa sem parcelas, cada parcela, cada fatura de cartão e cada saldo a ressarcir a terceiro.

**O que se faz nela:**
- Filtrar por intervalo de **vencimento**, fornecedor, cliente, projeto, categoria e status (seleção múltipla) e ordenar clicando no cabeçalho.
- Totais:
  - **Total lançado no filtro**: pagas ou não;
  - **Pendente**: o saldo que falta pagar;
  - **Vencidas**: quantidade e valor;
  - **A ressarcir**.
- Ações por linha: **Editar** leva à despesa em Despesas, **Fatura** leva a Cartões e **Ressarcir** leva a Ressarcimentos.

**Campos que confundem:**
- **Saldo** = valor − principal pago − abatido em acertos. Uma despesa paga em parte mostra como saldo só o que falta pagar.
- Compras no cartão **não aparecem uma a uma**. Aparece a **fatura**, "prevista" enquanto o ciclo está aberto e firme depois de fechada.
- A linha de ressarcimento **não é despesa nova**: a despesa original já está listada.
- Ordem padrão: vencidas, depois a vencer e, por fim, as pagas, pela data de pagamento.
- Com a chave "Contas a Pagar só com a versão Atual" desligada, entram também despesas gravadas em Orçamento, Previsão ou cópias. Se ela for ligada, só a Atual conta (aqui, no Dashboard e na conciliação).

**O que NÃO faz:** não lança nem paga. Pagamento é feito em Despesas (Pagar ou aba Parcelas), Cartões, Acerto Contábil ou na conciliação do Caixa.

**Quem acessa por padrão:** owner e admin; membro (o link Editar depende de poder editar Despesas). O contador não acessa por padrão.

## Ressarcimentos (/restituicoes) — módulo Despesas

**Para que serve:** controlar o que a empresa deve a quem pagou fornecedores por ela, como um sócio ou outro pagador, e registrar o ressarcimento.

**O que se faz nela:**
- **Pagadores terceiros**: conceder ou retirar o papel "Pagador por Terceiro". Só quem o tem aparece em "Quem desembolsou".
- **Conta corrente de terceiros**: por pessoa, desembolsado, restituído, **saldo devido** e há quanto tempo está em aberto. É **obrigação**, não caixa.
- **Ressarcimento em lote**: um valor único distribuído entre os PEDs em aberto do terceiro, do mais antigo para o mais novo, com prévia obrigatória.
- **Registrar ressarcimento** por item (valor, conta, comprovante), o que gera a saída de caixa.
- **Vincular lançamento existente**: marca um PED antigo como pago por terceiro, sem alterar o PED.
- **Compensação**: com saldo nos dois lados (a empresa deve ao terceiro e ele deve repassar valores à empresa), faz o encontro de contas, sem caixa e sem DRE.

**Campos que confundem:**
- A despesa entra **uma vez** na DRE, pela competência. **Não há saída de caixa no lançamento**, só no ressarcimento, e a data dele não muda a competência.
- No lançamento, "Será reembolsada pela empresa" cria a obrigação (Pendente). Sem essa marca, a obrigação nasce quitada e sem caixa, porque o terceiro arcou com o valor.
- Status: Pendente, Parcialmente restituído, Restituído, Cancelado.
- **Obra da saída**: com a chave "Saída do ressarcimento segue a despesa" desligada, cai na obra aberta na tela. Se ela for ligada, o ressarcimento avulso cai na obra da despesa, e o lote continua na obra da tela.
- **Não confundir** com "Liberações de Obra" (rota /reembolso, módulo Receitas).

- **Com a Cris**: com a janela "Registrar ressarcimento" aberta, a Cris preenche valor, data, conta e comprovante a partir do que a pessoa diz ou dita. Quem registra é o botão **Confirmar**.

**O que NÃO faz:** não lança a despesa nova paga por terceiro. Isso é feito em Despesas, marcando "Paga por terceiro".

**Quem acessa por padrão:**
- owner e admin;
- membro, com a chave do membro desligada: ver, criar e editar, mas cancelar ressarcimento exige excluir;
- contador: não acessa.

## Cartões de Crédito (/cartoes) — módulo Caixa

**Para que serve:** cadastrar cartões, acompanhar faturas, pagar a fatura e conferir o extrato do cartão.

**O que se faz nela:**
- **Cadastro**: apelido, 4 últimos dígitos, limite, dias de fechamento e vencimento, conta que debita e taxa do rotativo (opcional). Também ativar e inativar.
- Ver **Usado no ciclo** e **Disponível**.
- **Próxima fatura**: o total previsto, que é o que Contas a Pagar mostra. Com taxa cadastrada, aparece uma estimativa de juros que não entra em Contas a Pagar.
- **Faturas**:
  - **Pagar**: só fatura fechada; informa valor, data, conta e obra do lançamento. Pagamento parcial é aceito.
  - **Juros cobrados**: vira uma despesa "Despesas Financeiras".
- **Extrato do cartão**: subir XLSX ou CSV, ou o **PDF (ou foto) da fatura**, para conferir o que não foi lançado, o que não apareceu no extrato e as divergências. O PDF é lido por IA e aparece numa **prévia**: só com "Registrar" o extrato é guardado, e nenhuma despesa é lançada. Também se registra **estorno**.
- **Lançar o que faltou**: cada item "No extrato, sem lançamento" tem "Lançar em Despesas →", que abre a despesa já preenchida com valor, cartão, data e descrição. A pessoa confere e salva lá.

**Campos que confundem:**
- A **compra** é lançada em **Despesas**, com a forma "Cartão de crédito": cartão, data da compra e número de parcelas (1 a 48). Ela nasce "A pagar", **sem saída de caixa**, e cada parcela cai na fatura do ciclo correspondente.
- Fatura **prevista** (ciclo aberto) é diferente de **fechada** (valor firme).
- Compra no cartão não pode ser recorrente nem paga por terceiro.

**O que NÃO faz:** não lança compra. "Lançar em Despesas →" leva ao formulário já preenchido.

**Quem acessa por padrão:**
- owner e admin;
- membro, com a chave do membro desligada;
- contador: não acessa.

## Acerto Contábil (/acerto) — módulo Despesas

**Para que serve:** registrar **um pagamento único que quita várias despesas**, inclusive de obras diferentes, com **uma só saída de caixa**.

**O que se faz nela:**
- Aba **Vincular despesas**: informar data, conta, valor transferido, forma e favorecido; marcar os PEDs em aberto de qualquer obra, com o valor a abater de cada um (pode ser parcial); concluir.
- **Diferença** entre o transferido e o vinculado: o sistema a lança como despesa financeira (pago a mais) ou receita financeira (pago a menos), na competência do pagamento, sem ratear no custo das obras. Sobre a classificação contábil, confirme com a sua contabilidade.
- Aba **Rateio entre obras**: o pagamento a um prestador de várias obras gera **um PED por obra** e uma só saída de caixa, com a base do rateio gravada.
- Aba **Acertos do período**: histórico, com **estorno**.
- **Com a Cris** (aba Vincular despesas): ela preenche o cabeçalho do pagamento e **marca** as despesas pelos números dos PEDs (aceita o final do número) ou, em lote, todas as de um fornecedor. Número que não acha ou que bate com mais de um é avisado, e nada é marcado por ele. Quem grava é o botão **Concluir acerto**, depois da conferência.

**Quem acessa por padrão:** quem pode **editar Despesas e ver o Caixa**, ou seja, owner, admin e membro. O estorno exige excluir em Despesas (owner e admin). O contador não acessa.

## Fornecedores e Parceiros (/fornecedores) — módulo Despesas

**Para que serve:** o cadastro único da empresa (não é por obra) de fornecedores, prestadores, sócios, bancos e demais pessoas.

**O que se faz nela:**
- Cadastrar PF ou PJ (com leitura opcional do cartão CNPJ ou contrato por IA), com endereço e dados para ressarcimento (banco e PIX).
- Marcar **papéis**; uma pessoa pode ter vários (Fornecedor de Material, Prestador de Serviço, Sócio/Quotista etc.).
- Buscar, filtrar por papel, inativar e excluir (digitando o nome para confirmar).
- **Com a Cris**: anexe na conversa o cartão CNPJ, o contrato ou a nota (ou dite os dados) e peça para preencher. Ela preenche nome, tipo, documento, contato, endereço e papéis, com os mesmos alertas da leitura por upload. Banco, conta e PIX são preenchidos à mão. Quem cadastra é o botão da tela.

**Campos que confundem:**
- **Inativo** não aparece nos seletores de lançamentos novos, mas continua aparecendo nos lançamentos antigos.
- Cadastro **sem papel** não aparece em seletores filtrados por papel.
- O papel **Pagador por Terceiro** é concedido em **Ressarcimentos**.
- A tela mostra alertas de documento fora do padrão de CPF/CNPJ e de PF de serviço ou mão de obra sem endereço.

**Quem acessa por padrão:**
- owner e admin;
- membro: ver, criar e editar;
- contador: não acessa.

## Caixa (/caixa) — módulo Caixa

**Para que serve:** o "Controle de Caixa". Mostra o dinheiro real, **concilia o extrato bancário** com os lançamentos e registra ajustes e o fechamento do dia.

**O que se faz nela:**
- Escolher a obra. A tabela de movimentos é da obra, mas os saldos, a cadeia de dias e o fechamento são da **empresa inteira**.
- **Entradas, saídas e saldo do dia**.
- **Os dois saldos**, por conta e no total:
  - **Em conta**: o do extrato, ou seja, o fato do banco;
  - **Conciliado**: o que os lançamentos sustentam.
  - Num dia todo conciliado, os dois coincidem.
- **Cadeia de saldo**: 2 dias realizados, hoje e 7 dias à frente. O botão **Fechar o dia** grava saldo inicial, entradas, saídas, saldo final e divergência. Fechar não trava lançamentos, e reabrir exige um motivo.
- **O que vence nos próximos dias**: de hoje em diante, o cartão de cada dia mostra "Vence a receber", "Vence a pagar" e o "Saldo projetado". A pagar é o saldo em aberto das contas a pagar da versão Atual; a receber é o que falta receber das contas lançadas e as parcelas dos planos de venda. O que venceu e segue em aberto aparece num aviso à parte, sem entrar em nenhum dia. Título sem data de vencimento não entra.
- **Dias fechados**: a seção recolhível abaixo da cadeia lista o histórico dos fechamentos (ver "Dias fechados (no Caixa)").
- **Importar extrato**:
  - escolha a conta e, opcionalmente, o saldo final (que atualiza a conta);
  - envie XLSX, CSV ou PDF (PDF escaneado ou imagem só com IA);
  - na pré-visualização, para cada linha: cadastrar a despesa **já paga** ou a conta a receber **já recebida**, parear com um lançamento existente, ignorar, ou importar o restante como movimentos;
  - linhas já importadas (mesma conta, data, valor e documento) são ignoradas;
  - a conciliação automática só ocorre com **uma única** despesa em aberto de mesmo valor no mesmo mês. Com várias candidatas, a linha fica pendente, com sugestões.
- Aba **Conciliação**:
  - saídas pendentes com contas a pagar sugeridas; é possível vincular **várias despesas a um movimento**, desde que os vínculos somem o valor dele;
  - entradas com contas a receber sugeridas;
  - "Nova despesa a partir do extrato" abre Despesas já preenchida.
- **Desfazer conciliação**: preserva o movimento do extrato e desfaz só o vínculo.
- Aba **Ajustes**: o único lançamento direto desta tela. Exige motivo, para mais ou para menos, e afeta só o saldo conciliado. É o último recurso.
- Comparar 2 ou 3 versões (entradas, saídas e saldo líquido).

**Com a chave "Caixa: conciliação por conta" ligada** (o Caixa vira "Conciliação de Caixa"):
- Não há seletor de obra nem de versão, nem comparação de versões: a tela mostra a versão Atual de todas as obras.
- Os **cartões de crédito** aparecem no bloco de saldos, depois das contas: fatura aberta, conciliado, pendentes e o último extrato.
- **Cada conta ou cartão é clicável** e filtra a tela; "Todas as contas" volta ao consolidado. Cada linha mostra quantos movimentos faltam conciliar.
- O extrato importado nasce **só com a conta**: a obra de cada movimento é a do item com que ele foi conciliado (despesa, conta a receber, parcela de venda ou pagamento de fatura). Movimento sem vínculo é da empresa e não entra no realizado de nenhuma obra.
- No topo do bloco de saldos, os **três caminhos**: **Subir extrato** (o diálogo de importação), **Conciliar com a Cris** e **Open Finance** (conectado, conectar ou indisponível, com o motivo). Ao lado, o contador "N movimentos a conciliar em M contas · mais antigo há X dias".
- **Cartão escolhido**: a aba Conciliação mostra as linhas do extrato da fatura, cada uma com a compra lançada no cartão sugerida; "Lançar despesa a partir desta linha" abre Despesas preenchida e, ao salvar, a linha fica conciliada. Cada fatura mostra total do extrato, conciliado e diferença. Crédito ou estorno segue o fluxo de estorno de Cartões.
- **Pagamento da fatura**: a saída da conta corrente concilia com o pagamento da fatura (sugestão própria), sem saída nova.

**Entrada do comprador (parcela de venda):** as entradas pendentes sugerem também as **parcelas de venda** em aberto (valor, data e o primeiro nome do comprador na descrição). "Conciliar com a parcela" grava o recebimento; parcial é permitido; não cria conta a receber e não muda a receita da DRE. Criar conta a receber a partir de uma entrada que parece parcela exige confirmar que não é a parcela, para a receita não contar duas vezes. Com a chave "Parcela do comprador: situação, atrasados e previsto do Fluxo" ligada, Contas a Receber mostra a situação de cada parcela (a vencer, recebida, parcial, vencida), a faixa do Caixa conta as vencidas não recebidas nos atrasados e o Fluxo tira do previsto a parte recebida.

**Conciliar com a Cris (só nesta tela):**
- Anexe o extrato na conversa (PDF, imagem, XLSX ou CSV). A Cris lê com o **mesmo leitor da importação**, no servidor, e oferece abrir o diálogo de importação já preenchido; ela pergunta a conta quando não reconhece. Quem importa é o botão do diálogo. PDF ou imagem vai inteiro ao modelo de IA, com os nomes de quem pagou e recebeu; planilha não vai.
- Para os pendentes, em rodadas de até 20 (do mais antigo para o mais novo), a Cris consulta os **candidatos que o servidor calcula** (despesas, contas a receber, parcelas de venda, pagamentos de fatura) e propõe os pares; com mais de um candidato, faz uma pergunta de cada vez. A proposta vem como lista com o botão **"Confirmar N conciliações"**; cada vínculo é gravado por si, com auditoria, e o resultado diz qual não foi.
- Ela não procura candidatos por conta própria, não concilia sozinha e não amplia a conciliação automática. Proposta com um item que não é candidato daquele movimento é recusada no servidor.
- Sem par, ela diz o que falta lançar e o caminho (Despesas ou Contas a Receber, já preenchidos com os dados do extrato; ao salvar, o movimento fica conciliado, sem segunda saída).
- Permissões: importar exige Caixa/criar; conciliar, Caixa/editar; lançar despesa, Despesas/criar. Sem Caixa/editar, a Cris não tem as ferramentas de conciliação e explica por quê.
- "Perguntar à Cris", em cada movimento pendente, abre a conversa já com aquele movimento.

**Open Finance:** o cliente conecta o banco em Contas Correntes (ou Cartões), no botão "Conectar banco": um aviso diz o que é lido, para quê, por quanto tempo e como desconectar; a senha do banco é digitada no banco, na janela da Pluggy, e não passa pelo app. Depois, cada conta do banco é associada a uma conta corrente, a um cartão, a uma conta nova, ou ignorada. Os movimentos chegam pendentes. Movimento alterado pelo banco depois de conciliado não muda (vai para revisão); removido nunca é apagado. Na primeira busca, o que for igual a um extrato já importado espera a decisão em "Possíveis duplicados".

**Campos que confundem:**
- **Conciliar** uma saída com uma despesa registra o pagamento na data do extrato, sem criar uma segunda saída. Já o botão **Pagar**, em Despesas, cria a saída por conta própria. Quem importa extrato evita saída em dobro conciliando a linha do extrato com a despesa em aberto, em vez de pagar pelo botão.
- **Baixado sem conciliar**: pagamentos registrados sem vínculo com o extrato. Se esse número cresce, normalmente falta importar extrato.
- **"sem vínculo"**: movimento marcado como conciliado sem registro do que casou. Regularize vinculando uma despesa ou desfazendo.

**O que NÃO faz:** não lança despesa nem receita (isso é feito em Despesas e Contas a Receber) e não cadastra conta bancária (em Contas Correntes).

**Quem acessa por padrão:**
- owner e admin;
- membro: ver, importar e conciliar. Com a chave do membro desligada, também lança ajuste e fecha o dia;
- desfazer conciliação e reabrir o dia exigem a permissão "Conciliação — ajustar e desfazer: excluir": por padrão, só owner e admin;
- contador: não acessa.

## Contas Correntes (/contas) — módulo Caixa

**Para que serve:** cadastrar as contas bancárias que formam o saldo de caixa da empresa.

**O que se faz nela:**
- Cadastrar banco, agência, operação, conta, tipo e saldo.
- Definir a atualização do saldo: **manual** ou **automática** (por Open Finance, quando conectado, ou pelo último extrato com saldo final subido no Caixa).
- Ativar, inativar, editar e excluir, e ver o total por tipo.

**Campos que confundem:**
- O **saldo total soma só contas ativas**.
- Conta do tipo **Terceiros** não entra no saldo disponível, porque representa obrigação, não dinheiro da empresa. O que se deve a sócios e terceiros é acompanhado em **Ressarcimentos**.
- Em conta "Automático" sem conexão, o saldo só reflete o último extrato subido.

**Quem acessa por padrão:**
- owner e admin;
- membro: ver, criar e editar;
- contador: não acessa.

## Dias fechados (no Caixa) — antes, tela Balanço do Dia

**Para que serve:** o **histórico dos fechamentos do dia**: saldo inicial, entradas, saídas, saldo final, saldo em conta, divergências, responsável, data do fechamento e reaberturas com motivo.

**Onde fica:** na tela **Caixa**, na seção recolhível "Dias fechados", abaixo da cadeia de saldo. Aparece com ou sem projeto escolhido, porque o histórico é da empresa. A antiga tela Balanço do Dia saiu; o endereço /balancodia leva ao Caixa.

**O que se faz nela:** filtrar por período, imprimir e exportar CSV.

**Quem vê:** quem tem "ver" em "Dias fechados (no Caixa)" na Gestão de Acessos (a antiga chave do Balanço do Dia):
- owner e admin;
- membro, com a chave do membro desligada;
- contador: não vê.

---

## Diferenças entre telas parecidas

- **Despesas × Contas a Pagar**: em Despesas se **lança, edita, paga e cancela**, por obra, com uma linha por PED. Contas a Pagar é **só consulta**, da empresa inteira, por **vencimento**, com uma linha por parcela, fatura ou saldo a ressarcir. A despesa parcelada aparece em várias linhas ali e em uma só em Despesas.
- **Ressarcimentos × Acerto Contábil**: Ressarcimentos devolve o dinheiro a **um terceiro que pagou pela empresa**. No Acerto Contábil, a **própria empresa** paga várias despesas a fornecedores numa transferência só, e a diferença vira encargo ou desconto financeiro.
- **Caixa × Contas Correntes**: Contas Correntes é o **cadastro** das contas e do saldo; Caixa é o **dia a dia** (extrato, conciliação, ajustes, fechar o dia) e guarda o **histórico** dos dias fechados.
- **Cartões × Despesas**: a compra é lançada em **Despesas** (forma "Cartão de crédito") e entra na DRE pela competência. **Cartões** cuida da **fatura**: acompanhar, pagar (a saída de caixa), juros, estorno e conferência do extrato do cartão.

## Caminhos comuns

1. **Despesa paga por sócio ou outra pessoa:**
   - Conceda o papel "Pagador por Terceiro" em Ressarcimentos, se a pessoa ainda não tiver.
   - Em Despesas, marque "Paga por terceiro", escolha quem desembolsou e a data. Marque "Será reembolsada" se a empresa vai devolver.
   - Ao devolver, registre em Ressarcimentos (item a item ou em lote).
2. **Conciliar o extrato:**
   - Em Caixa → Importar extrato, escolha a conta e o arquivo e revise a pré-visualização.
   - Na aba Conciliação, vincule as saídas às despesas sugeridas; para o que não tem despesa, use "Nova despesa a partir do extrato".
   - Confira se "Em conta" e "Conciliado" batem e feche o dia.
3. **Pagar várias despesas de uma vez:**
   - Se foi uma transferência única: Acerto Contábil → Vincular despesas, informando o valor transferido.
   - Se o extrato já mostra a saída: em Caixa → Conciliação, vincule várias despesas ao mesmo movimento.
4. **Pagar uma parcela:** em Despesas, escolha a obra e use a aba Parcelas → Pagar, informando data, conta e encargos.
5. **Compra no cartão e pagamento da fatura:**
   - Em Despesas, use a forma "Cartão de crédito" e informe cartão, data da compra e parcelas.
   - Depois de a fatura fechar, vá em Cartões → Faturas → Pagar.
6. **Lançar sem nota e completar depois:** lance normalmente. A despesa aparece em "Pendente de NF"; quando a nota chegar, abra o lançamento e preencha o Documento Fiscal.
7. **Corrigir uma despesa já paga ou conciliada:**
   - O valor e as datas estão travados.
   - Se o erro está na conciliação, desfaça-a no Caixa (exige a permissão de desfazer).
   - Se não, cancele a despesa e lance de novo. Cancelar exige a permissão de excluir.
8. **Custo de mão de obra de várias obras num só pagamento:** Acerto Contábil → Rateio entre obras.
9. **Diferença pequena e inexplicada no caixa:** procure primeiro o lançamento que falta. Só depois use Caixa → Ajustes, com motivo.
`;

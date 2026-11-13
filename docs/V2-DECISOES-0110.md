# Decisões do dono — 01/10/2026

As respostas de 01/10 às perguntas em aberto dos Prompts B, D, F, H, V, AH,
E (BE-2), AE (BAE-1) e às quatro chaves. Cada item diz o que foi feito e em
qual PR. Nada aqui altera dado gravado.

## Medição e os indicadores da obra (BV-1, BV-3, BV-4, 3.5)

- **BV-1 · PLS existe; medição por percentual de cada serviço.** Não migra
  agora. A estrutura fica (`servico`, `medicao_servico`,
  `calc/medicao-bdi`) e os **indicadores de evolução física foram
  desligados** no Dashboard: evolução acumulada e do mês, liberação do mês,
  custo estimado e geração de caixa do mês. No lugar, uma nota diz que
  voltam com o cadastro da PLS por obra.
- **"Liberação acumulada" e "Saldo de financiamento" saíram de vez**, sem
  depender de chave: sem medição, mostravam o financiamento do cadastro como
  se já tivesse acontecido. Saíram também da prévia da chave do Dashboard e
  do texto dela.
- Ficam: financiamento (construção, terreno, total), custo e BDI dos
  serviços, custo referencial e serviços fora dos limites — todos de
  cadastro, com "—" quando falta.
- **BV-4 · sem layout de impressão.** O rodapé do relatório de medição
  passou a dizer que o documento oficial é o formulário da Caixa (PLS /
  RAE), assinado pelo responsável técnico, e que o sistema fornece os
  números.
- **3.5 · a coluna fica fora.** Nada a fazer.
- **BV-3 · sem preencher autor pelo log.** Já está assim desde o Prompt V:
  medição sem autor aparece para todos, marcada "autor não registrado".

## Projetos (Prompt B)

- **1 · comparativo por caixa: não.** O cartão continua por competência e o
  título passou a dizer isso: "Orçado x Realizado · competência". Caixa por
  projeto fica no Fluxo de Caixa e no Resumo.
- **2 · título "Projetos".** Já estava assim em todo o app (cabeçalho, menu,
  permissões); não sobrou "Projetos & Unidades" em tela.
- **3 · Excluir saiu do menu `[...]`**, que ficou com Abrir e Copiar link. A
  exclusão mora dentro da tela do projeto, numa faixa própria no fim do
  cadastro, e o botão "Excluir definitivamente" só libera depois de digitar
  o nome do projeto (a mesma confirmação de antes, que o servidor também
  confere). Vale para obras e para matriz/filial.

## Versões (Prompts F e H)

- **6 · trava × situação: não trava ao aprovar.** Contagem de versões com
  `locked = true`: **na base local, 0 de 5**. Em produção, rodar o relatório 1
  de [`sql/decisoes-0110.sql`](./sql/decisoes-0110.sql) e mandar o resultado;
  se der zero, a coluna pode ser descontinuada (decisão sua).
- **7 · a ordem é Rascunho → Concluído → Aprovado.**
  - Aprovar só a partir de Concluído; de Rascunho direto é recusado, com o
    motivo.
  - Sair de Aprovado (para Concluído ou Rascunho) é permitido, mas o
    seletor **pede confirmação** e diz o efeito: com a regra "Rascunho fora
    dos relatórios" ligada, "ela sai dos relatórios agora e os números
    mudam"; desligada, "hoje não muda, mas mudará quando a regra for
    ligada".
  - Erro na troca agora aparece na tela (antes era ignorado em silêncio).
- **8 · teto de 12 previsões:** fica. Nada a fazer.
- **9 · permissão própria `versaoaprova`** ("Aprovar e desaprovar versão",
  módulo Planejamento). Nasce só com owner e admin e aparece na Gestão de
  Acessos como as outras.
  - Entrar ou sair de Aprovado exige essa permissão.
  - Rascunho ↔ Concluído segue o `editar` da tela.
  - A Auditoria registra de → para.
  - **Efeito em produção:** quem aprova hoje só com o `editar` de
    Orçamentos/Previsão (membro com override) deixa de conseguir; precisa
    receber `versaoaprova` na Gestão de Acessos.
- **10 · lista de conferência do Rascunho:** a prévia em `/chaves` já lista
  todas as versões fora de Aprovado com projeto, nome, total de receitas e
  total de despesas. Ela ganha exportação no PR das chaves; o relatório 3
  do SQL é a mesma lista direto do banco.

## Orçamentos (Prompt D)

- **4 · entrada financeira — DIVERGE. Não fechei; preciso da sua decisão.**
  As três telas usam três valores diferentes:

  | Tela | Valor |
  |---|---|
  | Orçamentos, "Receitas do Projeto" (BD-1) | **construção**; soma o terreno **só** quando "terreno fora do caixa" está desmarcado |
  | Dashboard, "% entradas de caixa" e "% margem" | **construção + terreno, sempre** |
  | Resumo, "VGV" | **soma das unidades** da versão — não usa o cadastro |

  Com terreno fora do caixa (o padrão, e o caso das 3 obras locais), o
  Orçamento usa só a construção e o Dashboard soma o terreno. O Resumo é
  outra base. O relatório 2 do SQL mostra, por obra, os três números.
  **Nada foi mudado.** Pergunta: qual vale nas três? (Sugestão: a entrada
  financeira nas duas primeiras, que é o dinheiro que passa pela
  construtora; e o VGV do Resumo continua sendo o das unidades, com o nome
  "VGV" e não "receita do projeto".)
- **5 · "Outras Receitas": não cria.** Nada a fazer.

## Empresa (Prompt AH)

- **15 · os dois avisos entram no checklist.** "Código tributário do
  município" e "Município" (vazio, ou nome sem código IBGE) agora saem de
  `checarProntidaoFiscal`, junto com os outros, como **aviso**. Nenhum
  bloqueio mudou e `emitentePronto` dá o mesmo resultado (teste). A tela e o
  assistente deixaram de concatenar à parte.
- **16 · dado inválido já gravado.**
  - **Resultado na base local:** a única empresa (Cliente Piloto) tem todos os campos
    fiscais vazios — **nenhum valor preenchido e inválido**. Em produção,
    rodar o 2º relatório de
    [`sql/v2-prompt-ah-diagnostico.sql`](./sql/v2-prompt-ah-diagnostico.sql)
    e me mandar.
  - **Não trava mais a edição.** Antes, o formulário reenviava o valor antigo
    inválido (CEP com 6 dígitos, por exemplo) e o servidor recusava o
    salvamento inteiro — não dava para mudar nem o nome fantasia. Agora o
    campo que volta **igual ao gravado** é mantido exatamente como está no
    banco (sem normalizar) e não é validado; ele segue aparecendo como
    pendência no checklist. Só o campo que o usuário **mudou** é validado.
    Vale para CNPJ, alíquota, CEP, código IBGE e UF.

## Privacidade da leitura por IA (BE-2)

Regra do dono: **vai ao modelo só o documento**. Nada do banco entra no prompt
— nem cadastro de cliente, nem renda, nem histórico — e o conteúdo do prompt
nunca entra em log nem em auditoria.

- **O que saiu do prompt.**
  - **Despesa (nota/boleto/recibo):** saíram a empresa (razão social e CNPJ),
    a lista de fornecedores (nome e CPF/CNPJ) e a lista de obras. O modelo só
    copia o que está no papel (quem paga, quem recebe, CNPJ, valores, datas);
    o sistema compara com o cadastro **depois, localmente**. Se a leitura
    trouxer o CNPJ da **própria empresa** como fornecedor, o sistema não vincula
    e avisa na tela.
  - **Folha de ponto:** saiu a lista de nomes da equipe alocada. O modelo
    devolve os nomes como estão escritos e o casamento com a equipe continua
    local (`casarNomesComEquipe`), como já era.
- **O que já era só o documento:** fornecedor (cartão CNPJ), projeto, extrato,
  venda de unidade e ativo de permuta (texto digitado pela pessoa).
- **Log e auditoria.** Conferido: as auditorias das leituras guardam só
  contagens e nomes de arquivo; os `console.error` gravam só o erro da chamada,
  nunca o pedido nem a resposta.
- **Testes:** o prompt da despesa não contém nome, CPF/CNPJ de fornecedor,
  empresa nem obra; a folha de ponto não recebe a equipe.

### Provedor, retenção e contrato

- **Provedor:** Anthropic (API), com a chave do servidor (`ANTHROPIC_API_KEY`).
  Todas as empresas usam a mesma conta.
- **Treino:** pela política comercial do provedor, o conteúdo enviado pela API
  **não é usado para treinar modelos**.
- **Retenção:** o provedor **guarda o que recebe por até 30 dias** e depois
  apaga. É possível pedir **retenção zero (ZDR)** para a organização da
  chave.
- **Com o dono:**
  - conferir que a chave é da organização comercial e pedir o ZDR;
  - cuidar do contrato da Cliente Piloto (controlador, operador e suboperador).
- **No sistema:** nenhum conteúdo de pergunta, documento ou resposta é
  guardado. Só o consumo em números (tabela `ia_uso`, Prompt AM).

### Pergunta em aberto — listas que não são dado pessoal

Para manter a qualidade da classificação, **continuam** indo ao modelo listas
de **catálogo**, que não identificam pessoa nem empresa:

| Leitura | Lista que vai junto |
| --- | --- |
| Despesa | plano de contas, categorias de despesa, tipos de documento fiscal |
| Nota de materiais (estoque) | nomes dos materiais cadastrados (nome, unidade, SKU) |
| Laudo de medição | grupos do orçamento CEF (código e nome) |
| Ativo de permuta | tipos de bem aceitos |

Pela regra literal ("nada do banco"), essas listas também deveriam sair — a
classificação passaria a ser feita só localmente, com menos acerto. **Mantive
(caminho que não piora nada para o usuário) e pergunto:** podem continuar?

## As quatro chaves — prévia guardada, ordem e registro

Decisão: pode ligar, **uma de cada vez**, com alguns dias entre elas, na ordem
Dashboard → Fluxo de Caixa → Resumo Executivo → DRE; guardar a prévia
(antes × depois) antes de cada uma; registrar quem ligou e quando.

- **Exportar prévia (.xlsx)** em cada chave que tem prévia em `/chaves`
  (as quatro definições novas e o Rascunho fora dos relatórios). A planilha leva
  cabeçalho com empresa, situação da chave, quem exportou e quando, e a mesma
  tabela da tela, calculada pelas mesmas funções. Para o Rascunho, é o
  checklist pedido (projeto, versão, situação, total de receitas e de despesas).
- **Sem exportação recente, não liga.** Ligar uma dessas chaves exige uma
  exportação da prévia **dela** nos últimos 7 dias. A tela mostra a última
  exportação (quem e quando). Imprimir continua livre (Ctrl+P na tela), mas a
  trava conta só a exportação, porque é a única que o sistema consegue ver.
- **Registro.** A exportação entra na Auditoria (`chave.previa.exportar`). O
  ligar já gravava quem e quando (na chave e na Auditoria) e agora leva junto
  a exportação usada (`previaExportadaEm`, `previaExportadaPor`).
- **Ordem.** Só **avisa**, não trava: mostra a chave anterior da ordem que
  ainda está desligada, e avisa se outra das quatro foi ligada há menos de 3
  dias.
- **Quem liga em produção é você** (owner ou admin) em `/chaves`. Eu não ligo
  nenhuma chave.

## Alertas do Resumo Executivo (BAE-1)

Decisão: desvio de custo acima de **10% E acima de R$ 5.000** (os dois juntos);
recebível vencido há **mais de 15 dias**; um valor só para a empresa toda; os
números em parâmetro, não em código.

- **Parâmetro.** Migração **0065** (aditiva, com `down/`): três colunas no
  tenant com o padrão 10 / 5000 / 15. As empresas existentes recebem o padrão;
  nenhum outro dado é tocado. Editável na tela **Empresa → Alertas do Resumo
  Executivo** (quem edita a Empresa), com de → para na Auditoria
  (`tenant.alertas`).
- **Onde aparece.** No bloco **Atenção** do Resumo, que só existe com a chave
  `resumo_definicao_nova` ligada. O título do bloco declara os limites em uso.
- **Desvio de custo.** Compara o **Realizado** (versão Atual) com o
  **Orçamento**, somando nas **mesmas competências, até o mês corrente**.
  - **Custo** é o das categorias de custo da cascata da DRE (Custo Variável +
    Custo Fixo), pela mesma leitura da DRE, que segue a chave da DRE.
  - **Orçamento** é o mesmo do cartão Orçado x Realizado da tela Projetos. Com
    a chave do rascunho ligada, só conta se estiver Aprovado.
  - Só alerta **acima** do orçado. Sem Orçamento lançado (ou com ele fora dos
    relatórios), a linha diz que o desvio não é calculado, e não mostra zero.
  - Exige permissão de ver Despesas: quem não vê Despesas não vê custo.
- **Recebível vencido.** Contas a receber da obra com saldo em aberto e
  vencimento há mais de N dias: quantidade e soma. Não mostra nome de cliente.
  Exige permissão de ver Contas a Receber.
- **Conferido na base local:** o EMPREENDIMENTO PILOTO não tem Orçamento lançado e a linha
  diz isso. Com uma linha de orçamento temporária e o limite baixado para
  R$ 1.000, o alerta apareceu com valor, mês e diferença. Tudo foi desfeito
  depois, e o limite voltou a R$ 5.000.

## Resumo Executivo com várias obras

Decisão: seletor de projetos igual ao do Dashboard, com os atalhos Todos /
Ativos / Finalizados; valores somam; percentuais se recalculam (nunca média);
cobertura declarada; obra sem o cenário sai da coluna e não entra como zero;
comparativo só com mais de uma obra.

- **Seletor.** O Resumo usa o mesmo seletor do Dashboard: uma obra, ou Todos /
  Ativos / Finalizados, com a mesma regra de escopo (obra sem status fica fora
  de Ativos/Finalizados, com aviso). Com **uma obra**, a tela é exatamente a de
  antes, com a comparação de versões e os blocos.
- **Consolidado.** Uma coluna por tipo de versão (Atual, Orçamento, Previsão
  Atualizada). Cada coluna soma a versão daquele tipo de cada obra, a mais
  antiga do tipo, como no Dashboard. Os números são calculados pelas mesmas
  funções da tela de uma obra e seguem a chave do Resumo.
  - **Cobertura** escrita acima da tabela ("Previsão Atualizada: 1 de 3
    projetos") e no cabeçalho de cada coluna ("soma de 1 de 3").
  - Obra sem o tipo fica **fora** da coluna. Indicador sem registro em nenhuma
    obra mostra "—", não R$ 0. Coluna sem nenhuma obra não aparece.
  - Com a chave do rascunho ligada, versão de planejamento não Aprovada fica
    fora e a cobertura diz quantas.
  - Com período, a primeira linha é "Recebimentos previstos no período",
    somada por coluna.
- **Comparativo** (só com mais de uma obra), da versão Atual de cada obra:
  VGV total, VGV vendido, vendidas, % vendidas e, para quem vê Despesas, custo
  realizado × orçado (até o mês corrente), desvio e % de desvio.
  - A linha **Total** soma os valores e **recalcula** os percentuais a partir
    das somas.
  - O desvio total soma só as obras **com** Orçamento, os dois lados nas mesmas
    obras.
  - Margem fica de fora até a correção da receita (Prompt I), e a tela diz.
- **Fica por obra:** os blocos Vendas, Exposição e Atenção (chave ligada) e o
  assistente. No consolidado a tela avisa para escolher uma obra.
- **Conferido na base local:**
  - A coluna Previsão (1 de 3) bate com a tela do EMPREENDIMENTO PILOTO na Previsão.
  - Os recebimentos do período na Atual (R$ 4.321) são a soma das três obras
    (0 + 4.321 + 0).
  - Ativos/Finalizados mostram o aviso das 2 obras sem status.

## Chat do assistente (Prompt E, Etapa 2)

Decisão: o chat pode entrar e responde sobre **métricas do catálogo**
(receita, custo, saldo, desvio), sem dado pessoal. Métrica futura que precise
de nome de comprador para e pergunta antes.

- **Onde.** Botão no canto inferior direito, em toda tela. O painel abre por
  cima, sem navegar, e mostra o contexto: a obra da tela, ou "todas as obras
  que você vê".
- **O que vai ao modelo:** **só a pergunta digitada** e o catálogo (texto
  fixo, igual para toda empresa). O modelo **só classifica** a pergunta
  (métrica, cenário, obra citada, período). Ele **não recebe número, nome de
  obra, cadastro nem histórico**, e não escreve a resposta.
- **O que fica no sistema:** o casamento da obra citada com o cadastro (só
  entre as obras que o usuário vê), o cálculo e o texto da resposta. Os
  números saem das mesmas funções da DRE e do Orçado x Realizado.
- **Sem a chave de IA** (ou se a chamada falhar), uma leitura local por
  palavras-chave faz a classificação. Nada vai a lugar nenhum.
- **Catálogo:**
  - **Receita**, da DRE, por cenário;
  - **Custo**, Custo Variável + Custo Fixo da DRE, por cenário;
  - **Desvio de custo**, Atual × Orçamento nas mesmas competências (sem
    período, até o mês corrente);
  - **Saldo**, nas contas da empresa (não é por obra).
- **Regras do relatório:**
  - Obra sem o cenário fica fora da soma e é nomeada, nunca entra como zero.
  - Sem lançamento no recorte, o chat diz que não há, como o "—" da DRE.
  - Com a chave do rascunho, planejamento não Aprovado fica fora.
- **Permissão:**
  - receita exige ver a DRE;
  - custo e desvio exigem ver a DRE **e** Despesas;
  - saldo exige ver o Controle de Caixa.
  - Sem permissão, o chat diz que não tem acesso e não mostra número.
- **Privacidade:**
  - A pergunta **não é gravada** em log nem em auditoria. Em erro, o log
    guarda só o tipo do erro.
  - A conversa fica só na memória da aba. Nada é gravado no banco.
- **Pergunta fora do catálogo** (por exemplo, o telefone de um cliente): o chat
  diz que ainda não responde e lista o que sabe responder.
- **Conferido no navegador na base local:**
  - "quanto gastamos nesta obra?" no EMPREENDIMENTO PILOTO deu R$ 5.826,90, igual à DRE
    (3.285 + 2.542).
  - O desvio sem Orçamento diz que não calcula.
  - O telefone de cliente é recusado.

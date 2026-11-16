# Prompt AO · PR 2 — o que entra no pacote completo, e a leitura dos dados

Segundo PR do backup completo. Este PR define **o que entra** e **lê os dados**
do jeito certo. **A tela ainda não muda.** O download continua igual até o
PR 3, que gera o pacote em segundo plano e o entrega pela tela.

## Decisões do dono (26/10/2026)

| Pergunta | Decisão |
|---|---|
| **BAO-1** Quais tabelas | **Todas as de lançamento.** São as 35 da proposta mais as que nasceram depois: funcionários, equipes, cartões, notas fiscais emitidas, recebimentos, conciliação e seleção de orçamento. |
| **BAO-1** Log de auditoria | **Entra.** Os dados pessoais do log já são mascarados desde o BAK-2. |
| **BAO-2** Quem baixa | **Permissão própria**, que nasce só com proprietário e administrador. Entra no PR 3, junto com o novo download. |
| **BAO-2** Campos sensíveis | **Ficam fora**, e a omissão é declarada no `_leia-me.txt`. |
| **BAO-2** Aviso de LGPD | **Sim**, no `_leia-me.txt`. |
| **BAO-3** Nome | "Backup de dados" (já aplicado no PR 1). |

## A lista final (`src/lib/backup-catalogo.ts`)

**56 tabelas entram**, cada uma no seu arquivo `dados/<tabela>.json`, com todas
as colunas e todas as chaves.

| Família | Tabelas | Recorte |
|---|---|---|
| Estrutura | tenant, project, version, chart_account, budget_line, budget_account, budget_selecao, incc_rate | cadastro (inteiro) |
| Receita | unit, cliente, permuta, reembolso | cadastro |
| | conta_receber, conta_receber_recebimento, recebimento_terceiro, repasse | pela data |
| Despesa | stakeholder | cadastro |
| | despesa | pela competência |
| | despesa_parcela, restituicao_item, acerto_item | acompanham o pai |
| | pagamento, despesa_terceiro, restituicao, compensacao, acerto | pela data |
| | rateio_obra | pelo instante de criação |
| Caixa e cartões | bank_account, cartao_credito | cadastro |
| | cash_entry, daily_closing, carry_over, fatura_cartao, fatura_pagamento, extrato_cartao, estorno_cartao | pela data |
| | conciliacao_despesa | pelo instante |
| Operação | servico, stock_item | cadastro |
| | medicao, medicao_servico | pela competência |
| | stock_movement, time_entry | pela data |
| | document | pelo instante do envio |
| Pessoas | funcionario, funcionario_dependente, funcao_equipe, equipe_projeto | cadastro |
| | equipe_dia | pela data |
| | diaria | acompanha equipe_dia |
| | folha_competencia | pela competência |
| | aso_acesso | pelo instante |
| Fiscal | documento_fiscal | pela data de emissão |
| | nota_servico | pelo instante de criação |
| | nota_servico_evento | acompanha a nota |
| Registro | audit_log | pelo instante |

**Ficam fora, com o motivo escrito no leia-me:**
- `user`, `account`, `session`, `verificationToken`: autenticação. Senha e MFA
  nunca saem do sistema.
- `membership`: configuração de permissão.
- `number_sequence`: vai como **informação** no leia-me (prefixo, próximo
  número e dígitos), para não reemitir número já usado.
- `tenant_flag`: chaves de mudança, que são configuração.
- `ia_uso`: consumo do assistente de IA.

Há um teste que **falha se alguma tabela do banco não tiver decisão**. Toda
tabela nova vai ter que ser decidida aqui.

**Colunas que ficam fora (BAO-2):**
- `cliente`: os 24 campos sensíveis do BM-3. São renda, comprometimento, FGTS,
  score, restrições, estado civil e inteligência de mercado. O CPF, o endereço
  e o telefone entram.
- `funcionario`: endereço, salário, jornada, banco e PIX. Essa é a mesma lista
  que a tela de Funcionários já protege.
- `document`: as linhas e os arquivos de **ASO**, que é dado de saúde. O leia-me
  informa quantos ficaram fora.

## Como os dados são lidos (`src/lib/backup-dados.ts`)

- **Só leitura.** O teste conta as linhas de todas as tabelas do pacote antes e
  depois, e a contagem é a mesma.
- **O recorte é feito no SQL (4.2).** Nenhuma tabela é carregada inteira para ser
  filtrada em memória.
- **Cadastro vem inteiro; movimento vem pelo semestre (2.2).** O leia-me
  declara as duas datas.
- **Linha de movimento sem data reconhecível** entra em todo pacote e é contada
  à parte. Sem isso ela não cairia em semestre nenhum.
- **Tabela filha acompanha o pai.** A parcela vai junto da despesa, o item do
  acerto junto do acerto, e assim por diante.
- **Referência para fora do recorte (2.5).** É o caso, por exemplo, do
  pagamento de agosto de uma despesa de março. Essas referências são
  encontradas pelas chaves estrangeiras do banco e listadas com a quantidade,
  sem nada ser resolvido em silêncio.
- **Consulta que falha** é declarada no manifesto e no leia-me (4.5). O pacote
  sai mesmo assim.
- **A soma de controle** de cada coluna numérica é exata, sem erro de
  arredondamento.

## O manifesto e o leia-me (`src/lib/backup-pacote-texto.ts`)

O manifesto (`_manifesto.json`, formato `growth-backup/1`) tem uma entrada por
tabela, com arquivo, camada, recorte, linhas, linhas sem data, colunas omitidas
e somas de controle. Também traz os documentos, as referências fora do recorte,
a numeração e o que ficou fora.

O leia-me traz:
- as duas datas;
- o conteúdo, tabela a tabela;
- o que falhou;
- as referências fora do recorte;
- o que ficou fora e por quê;
- a numeração;
- o **aviso de LGPD** (o que o pacote contém e que a guarda é de quem baixou);
- "este pacote não restaura nada";
- "Nenhum dado foi removido do sistema."

## Próximo (PR 3)

- Geração **em segundo plano**, com o pacote guardado no R2 e link temporário.
- Progresso e histórico na tela.
- Documentos baixados com concorrência limitada.
- **Permissão própria** para baixar.
- A planilha antiga continua dentro do pacote, idêntica.

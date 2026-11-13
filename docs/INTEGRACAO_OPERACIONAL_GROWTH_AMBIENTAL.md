# Integração operacional — Growth Ambiental

Esta etapa integra clientes, projetos, contratos, equipes, horas, custos, notas fiscais, dashboard, relatórios e documentos. Tudo reaproveita os módulos existentes. Migração **0082**, apenas aditiva.

## 1. Clientes, projetos e contratos

- **Relacionamentos que já existiam (0077):**
  - um cliente com vários projetos e contratos;
  - um projeto com vários contratos;
  - um contrato com vários projetos (`contrato_projeto`, com valor alocado opcional);
  - guarda-chuva com derivados e ordens de serviço (que consomem ou somam ao limite), aditivos, itens e marcos.
- **Consolidação sem dupla contagem.** Contrato ligado a vários projetos entra **pela parte de cada projeto**:
  - pelo valor alocado, quando informado;
  - senão, dividido igualmente.

  Regra: `valor-contratado.ts` (`fatorDoContrato`). A soma por projeto é igual ao total. No guarda-chuva, o derivado que consome o limite não soma de novo (painel de contratos).
- **Níveis de análise:**
  - um contrato: aba do contrato;
  - contratos de um projeto ou projetos de um cliente: Dashboard, com filtro de cliente e contrato;
  - a empresa toda: `/dre/contratos` e o relatório gerencial.

## 2. Equipes, profissionais e horas

- **Cadastros reaproveitados:**
  - funcionários (CLT);
  - pessoas e prestadores (autônomo, PJ, sócio, consultor);
  - alocação por projeto (`equipe_projeto`, que agora tem `custo_hora` opcional);
  - diárias e presença de campo.

  Não há segundo cadastro nem segunda folha.
- **Apontamento de horas** (`apontamento_hora`, tela `/equipes/horas`, permissão `equipes`):
  - **Tipo:** planejado ou realizado.
  - **Profissional:** funcionário **ou** prestador (*check* no banco).
  - **Destino:** projeto ou atividade interna, como Administrativo (*check* no banco).
  - **Vínculos opcionais:** contrato (precisa estar vinculado ao projeto), fase e atividade (precisam ser do plano do projeto).
  - **Limites:** data e horas; o realizado vai até 24 h/dia; o planejado, até 744 h por apontamento.
  - **Controle:** idempotência pela chave da tela e auditoria.
- **Três camadas distintas:**
  - **Apontamento operacional:** as horas.
  - **Apropriação gerencial:** horas × **custo-hora gravado no apontamento**, retirado da alocação ativa. Sem base, o custo fica "—", nunca zero inventado.
  - **Lançamento financeiro:** continua em Folha e Despesas. **Apontar horas não cria despesa**, o que está testado.
- **Tela:** formulário, distribuição profissional × destino (planejado, realizado, desvio, custo gerencial), lista do mês e base de custo-hora das alocações.

## 3. Rateios e custos compartilhados

- Reaproveita **Acertos e Rateios** (rateio entre projetos, com memória de cálculo, auditoria e validação de fechamento a 100% e ao centavo).
- **Novo: "Usar a base de horas apontadas".** Preenche os percentuais pelas horas **realizadas** da competência em cada projeto.
  - Atividades internas ficam fora.
  - O ajuste de arredondamento vai para o maior percentual.
  - O texto da base (projetos e horas) é gravado na memória do rateio.
  - Só sugere: a pessoa confere e grava.
- **Pendência:** rateio para **contrato** e **centro de custo**. Não há entidade de centro de custo no sistema, e o rateio continua entre projetos. A apropriação a contrato é explícita, na aba do contrato.

## 4. NFS-e

- **O que existia:** integração Focus NFe (homologação ou produção por empresa), rascunho → envio → autorização/rejeição → cancelamento, eventos e arquivos.
- **Novo (0082):** a nota pode ser ligada a:
  - **contrato**, que precisa estar vinculado ao projeto;
  - **medição aprovada** desse contrato;
  - **cliente**, que vem do contrato ou da conta a receber.
- **Regras:**
  - A conta a receber precisa ser do mesmo contrato.
  - **Uma conta a receber não recebe duas notas vivas** (não canceladas nem rejeitadas), o que impede faturar o mesmo recebível duas vezes.
  - A nota continua **não criando recebível**: a fatura é a conta a receber do contrato.
- **Testes:** usam a lógica com o provedor simulado. **Nenhuma emissão real foi feita.** A emissão depende das credenciais e da homologação do provedor, e o envio é restrito a uma empresa pela variável `NFSE_TENANT_ID`.
- **Pendências tributárias:**
  - itens da lista de serviço, retenções e município de incidência para consultoria ambiental: validar com a contabilidade;
  - emissão multiempresa: depende de configurar o provedor por empresa.

## 5. Dashboard executivo

- **Painel "Contratos e operação"** (só para quem vê Contratos **e** o financeiro dos contratos — ajuste da Etapa 3), com filtro de cliente e contrato:
  - projetos ativos e contratos ativos;
  - valor contratado, aditivos, medido e saldo a medir (com o número de contratos que têm saldo);
  - faturado, receita reconhecida (regra atual), recebido e a receber;
  - reembolsos pendentes;
  - horas realizadas e planejadas do mês, com custo de pessoal gerencial;
  - **projetos com desvio de custo**, pela projeção ao término (até 30 projetos em andamento).
- Mantém os quatro cartões por versão, os gráficos e o assistente.
- Cada número diz a fonte. Contrato de vários projetos entra pela parte do projeto em tela.
- **Margem por contrato e por cliente:** `/dre/contratos`.

## 6. Relatórios multidimensionais

- O **mesmo motor** de Relatórios Customizados ganhou a fonte **"Gerencial (tabela dinâmica)"**:
  - **Linhas (dimensão):** cliente, contrato, projeto, modalidade, fase do plano, profissional, competência ou conta do plano.
  - **Colunas (métricas):** contratado, aditivos e saldo a medir (posição atual); medido; faturado; receita reconhecida; recebido; a receber; custo apropriado; margem; reembolso solicitado e pendente; horas planejadas e realizadas; custo de pessoal.
  - **Filtros:** escopo de projetos e período por competência.
  - **Exportação:** CSV e PDF.
  - **Link:** a URL guarda o relatório, e quem abre vê só o que o próprio acesso permite.
- **Fatos** (`relatorio-gerencial-dados.ts`): cada número é um registro real, contado uma vez:
  - medição aprovada;
  - fatura;
  - despesa apropriada;
  - reembolso;
  - apontamento;
  - posição do contrato.
- **Reconciliação:**
  - a linha Total é a soma das linhas;
  - o total por cliente é igual ao total por contrato (testado);
  - fato sem o atributo da dimensão vai para "(não informado)".
- **Permissões:**
  - a fonte exige `contratos:ver`;
  - as métricas financeiras (faturado, receita reconhecida, recebido, a receber, custo apropriado, margem, reembolsos) exigem `contratosfinanceiro:ver` (ajuste da Etapa 3, `metricasPermitidas`);
  - as métricas de horas exigem `equipes:ver`;
  - só entram os projetos que a pessoa vê.
- **Pendências:** modelos salvos de relatório (hoje o modelo é o link) e exportação XLSX nessa tela (o CSV abre no Excel).

## 7. Documentos, materiais e campo

- **`/projeto/documentos`:** todos os documentos num lugar só, com filtro de origem, projeto, contrato, cliente e texto.
  - Projeto, contrato e cliente vêm do próprio vínculo ou do registro dono (despesa, conta a receber, contrato).
  - **Cada documento exige a permissão da tela de origem.**
  - Documento de funcionário exige `funcionariosdados`.
  - Armazenamento e referências não mudam.
- **Materiais e equipamentos:** a saída para projeto já existia. Ela não gera custo e segue a regra BY-1. Consumo de material e uso temporário de equipamento continuam distintos.
  - **Pendência:** um cadastro de equipamento como ativo, com alocação no tempo.
- **Atividades de campo:** presença e diárias (`/equipes`) e horas (`/equipes/horas`) por projeto. Não há segundo controle de ponto.

## 8. Testes

- `src/lib/horas-regras.test.ts`: validações, o exemplo 12 h + 20 h + 8 h administrativo, custo sem base, base de rateio fechando 100%.
- `src/lib/relatorio-gerencial.test.ts`: pivô, "(não informado)", ordem por competência, período × posição.
- `src/lib/documentos-busca.test.ts`: origem e permissão por papel.
- `src/lib/actions/integracao-operacional.test.ts` (Postgres):
  - cliente com dois projetos e consolidação sem duplicidade;
  - horas com custo-hora, administrativo, idempotência, validações e nenhuma despesa criada;
  - rateio por horas e isolamento;
  - NFS-e ligada a contrato e medição, com trava contra duas notas;
  - Dashboard por projeto e consolidado;
  - relatório gerencial reconciliável;
  - permissões (técnico sem Equipes) e outra empresa.

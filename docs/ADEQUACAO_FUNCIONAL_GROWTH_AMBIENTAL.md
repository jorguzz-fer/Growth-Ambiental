# Adequação funcional — Growth Ambiental

O sistema nasceu como ERP de construção e incorporação imobiliária. Esta etapa
tira dele o que só fazia sentido para incorporadora e adapta o restante para
uma **consultoria ambiental** (licenciamento, monitoramento, arqueologia, fauna,
flora e serviços técnicos de campo).

**Regra geral:** nenhum dado gravado é apagado ou convertido. As telas que
saíram viram redirecionamento, e os relatórios históricos (DRE, Fluxo de Caixa,
Caixa) continuam lendo o que já existe. Em empresa nova, esses dados não
existem, e os blocos que dependem deles não aparecem.

Veja também a [auditoria de terminologia](./AUDITORIA_TERMINOLOGIA_AMBIENTAL.md).

---

## 1. Módulos removidos

Cada tela removida está em `TELAS_REMOVIDAS` (`src/lib/telas-removidas.ts`).
A URL antiga, inclusive as sub-rotas, redireciona (307, reversível, regras em
`next.config.ts`) para a tela que assumiu a função. Ela chega com
`?saiu=<id>`, e o destino mostra um aviso de uma linha (`AvisoTelaRemovida`).
As chaves de permissão saíram de `SCREENS`, então não aparecem em Gestão de
Acessos. Um override que esteja gravado para elas fica sem efeito.

| Rota antiga | Destino | O que assume |
|---|---|---|
| `/unidades` (e `/nova`, `/[id]`), API `/api/agent/unidades` | `/contasreceber` | A receita vem dos contratos de serviço: medição → faturamento → recebimento |
| `/simulador` (SAC/PRICE/SBPE) | `/contratos` | Condição de pagamento e reajuste ficam no contrato |
| `/permuta` (e `/novo`, `/[id]`) | `/contasreceber` | Os registros antigos continuam no histórico dos relatórios |
| `/parametros` (tabela de INCC) | `/contratos` | O reajuste é do contrato (IPCA, IGP-M, INPC) |
| `/medicao` (por grupo de obra e Relatório CEF) | `/contratos/medicoes` | Medição de serviço por contrato, item, aditivo e período, com aprovação e documentos |
| `/medicaolanc` | `/contratos/medicoes` | idem |
| `/reembolso` (liberações de obra) | `/contratos/reembolsos` | Despesas reembolsáveis pelo cliente |
| `/projecao` (receita por unidade) | `/contratos/painel` | Contratado, medido, faturado, recebido e a receber |
| `/diagnostico/planos-recebiveis` | `/contasreceber` | Vencimentos em Contas a Receber |
| `/consolidado` (removido antes) | `/contratos/painel` | O destino foi atualizado |

Foram apagados as páginas, as actions, os componentes, as regras e os testes
exclusivos desses módulos: unidades, simulador, permuta, INCC (editor e
assistente), liberações, medição por grupo e Relatório CEF, perfil de
compradores e seletor de unidade por obra. São 114 arquivos.

## 2. Módulos adaptados

| Módulo | O que mudou |
|---|---|
| **Projetos** (`project-manager.tsx`) | **Saem do cadastro:** terreno (valor, custo, proprietário, forma de pagamento, "fora do caixa"), financiamento da construção e do terreno, recursos próprios, área construída, código CNO/CEI e o bloco "Estrutura financeira".<br>**Muda o texto:** "Valor da construção" vira **Receita prevista do projeto**; "Custo da construção" vira **Custo previsto do projeto**; "Unidades / Escritórios" vira **Sedes e filiais**. O texto sobre o ISS passa a valer para prestação de serviço (LC 116, art. 3º).<br>**Dados antigos:** os valores gravados continuam no banco e no Orçamento, e o cálculo não mudou. Um terreno antigo diferente de zero é avisado na ficha.<br>**Cris:** a leitura de documentos segue os mesmos campos (`projeto-cris.ts`, `ai/projeto-doc.ts`, `ai/projeto-extract.ts`). |
| **Clientes → contratantes** | **Migração aditiva 0080:** nome fantasia e os contatos administrativo, técnico e financeiro.<br>**Ficha:** razão social, fantasia, CNPJ/CPF, endereço, contatos e observações internas.<br>**Histórico:** contratos do cliente e documentos do contratante. A listagem mostra fantasia e a quantidade de contratos.<br>**Saem da tela:** unidade, status do contrato de venda, renda, FGTS, score, "morar ou investir" e o perfil de compradores.<br>**Dados antigos:** a action grava **só o que o formulário envia**, então salvar a ficha não apaga os campos antigos (testado). |
| **Receitas / Contas a Receber** | **Faturas:** a fatura do contrato entra como **Fatura de serviço**.<br>**Tipos oferecidos:** Fatura de serviço, Reembolso de despesas, Adiantamento, Outros, Outras Receitas. "Sinal" e "Parcela mensal" continuam válidos nos registros antigos, mas não são oferecidos.<br>**Unidade e parcelas de venda:** o campo Unidade e a seção de parcelas de venda só aparecem quando existem dados antigos.<br>**A receber:** o do Dashboard e o da API do agente passam a somar as **contas a receber em aberto** (antes só liam parcelas de unidades). |
| **Medições** | A medição é do contrato (`/contratos/medicoes`): item, fase/período, aprovação e documentos. É um item só no menu e o engenheiro/técnico de campo o vê. |
| **Reembolsos** | Ficam as despesas reembolsáveis pelo cliente, por contrato (`/contratos/reembolsos`). A lógica de liberação de financiamento saiu da tela. |
| **Dashboard** | **Cartão de cima:** "VGV total" (soma de unidades) vira **Valor contratado**. É o valor atualizado (original + aditivos eficazes) dos contratos de serviço dos projetos em tela, sem rascunho nem cancelado. Contrato que atende vários projetos entra pela parte alocada a cada um ou, sem alocação, em partes iguais (`src/lib/valor-contratado.ts`).<br>**Sai:** o painel de indicadores de obra (financiamento, BDI, CUB, PLS, custo e receita por m²). |
| **Resumo Executivo** | **Novo bloco "Contratos de serviço do projeto":** contratado, medido, a medir, medido não faturado, faturado, recebido e a receber.<br>**Dados antigos:** Vendas, VGV, unidades, financiamento e permuta só aparecem, marcados como **dados antigos**, quando a versão tem unidades, permutas ou liberações. No consolidado, o comparativo entre projetos mostra contratado, medido e a receber. |
| **Planilha da versão** | **Modelo:** só as abas `Parametros` (os 48 meses) e `Despesas`.<br>**Formato antigo:** continua sendo lido (aba `Despesas_CEF`, INCC) e é exportado só para versão com dados antigos.<br>**Importação:** recusa abas de unidades, liberações ou permutas com dados, sem gravar nada. |
| **Reajuste do contrato** | O contrato novo oferece IPCA, IGP-M e INPC. O INCC já gravado continua aceito e aparece na edição. |
| **Acertos e Rateios** | Aba "Rateio entre projetos", textos de projeto. A regra contábil não mudou. |
| **Plano de Contas** | Mantém o plano ambiental das etapas anteriores. O rótulo "Conta CEF" vira **Conta do plano** em todas as telas e mensagens. |
| **Materiais e Equipamentos** (ex-Estoque) | **Origens novas:** Compra, Devolução ao estoque, Retorno de campo, Ajuste, Transferência entre projetos.<br>**Motivos novos:** Uso no projeto, Envio para campo, Perda/Quebra/Extravio, Devolução, Transferência, Ajuste.<br>**Dados antigos:** "Permuta", "Consumo na obra" e "Transferência entre obras" ficam só nos movimentos antigos (o campo é texto e não é convertido). O vínculo com permuta só aparece quando há permutas antigas. |
| **Equipes e Presença de Campo** (ex-Ponto/Equipes) | **Funções padrão de empresa nova:** Técnico de campo, Coordenador de campo, Arqueólogo(a), Biólogo(a), Engenheiro(a) ambiental, Auxiliar de campo, Comercial e Gestor Administrativo.<br>**Documentos do dia:** "Foto da equipe em campo" e "Relatório de atividades de campo".<br>**Empresa existente:** mantém a lista de funções que tem. |
| **Fornecedores** | **Papéis novos:** Laboratório de Análises, Locadora de Veículos e Equipamentos, Hospedagem e Alimentação.<br>**Papéis de incorporação** (Comprador de Unidade, Imobiliária Parceira, Corretor, Incorporador, Construtora): continuam válidos e são preservados na edição, mas não são oferecidos. |
| **Contas correntes** | O valor gravado "Construtora" (enum no banco) aparece como **Empresa (conta própria)**. Não houve migração. |
| **Cris** | A base de conhecimento foi reescrita: a seção "Telas que saíram", clientes contratantes, Materiais e Equipamentos, Equipes e Presença de Campo e Acertos e Rateios. Os prompts de despesa, estoque, folha de ponto e projeto ficaram no vocabulário do setor. A ferramenta `unidades_e_vendas` saiu; recebíveis e medição leem contas a receber e medições de contrato. |
| **Papéis** | O engenheiro passa a ser "Engenheiro / técnico de campo": edita medições de contrato e vê contratos. **Decisão a validar com o dono.** |

## 3. Módulos preservados sem mudança de regra

Despesas, Contas a Pagar, Caixa e conciliação, Cartões, Ressarcimentos, Notas
fiscais (NFS-e), DRE e DRE analítica, Fluxo de Caixa, Orçamento e Previsão,
Contratos e Aditivos, Planejamento de Projetos, Funcionários e Folha, Usuários
e Acessos, Backup, Auditoria, Conferência e Chaves de comportamento. Nessas
telas só os textos visíveis mudaram (veja a auditoria).

## 4. Dependências preservadas de propósito

- A **DRE**, o **Fluxo de Caixa** e o **Caixa** continuam lendo unidades,
  permutas e liberações da versão (`dre.ts`, `fluxo-caixa.ts`,
  `calc/receivables.ts`). Para empresa ambiental esses conjuntos vêm vazios. Na
  empresa que tem dados antigos, os relatórios históricos não mudam de valor.
- O **INCC** continua sendo provisionado por projeto (`provision.ts`,
  replicação de versão). É resíduo interno, sem tela. Retirá-lo exige revisar
  a DRE e o Fluxo, que ainda corrigem receita de unidade antiga.
- Ficam **tabelas e colunas** sem tela, todas sem perda de dado: `unit`,
  `permuta`, `reembolso`, `incc_rate`, os campos de comprador em `cliente` e os
  de terreno e financiamento em `project`.
- **Identificadores internos** não foram renomeados (classe D): `obra`,
  `obras`, `porObra`, `contaCef`, `kind: "cef"`, `valorConstrucao`, `vgv` (o
  campo interno do Dashboard agora leva o valor contratado), e ids de
  permissão (`estoque`, `equipes`, `contratosmedicao`).

## 5. Testes

| # | O que é verificado | Onde |
|---|---|---|
| 1–6 | Cada tela removida redireciona com aviso; a página não existe; sub-rotas | `telas-removidas.test.ts` ("Growth Ambiental — módulos…") |
| 7 | `next.config.ts` tem exatamente as regras de `TELAS_REMOVIDAS` | `telas-removidas.test.ts` |
| 8 | As chaves saem de `SCREENS`; override gravado é inerte | `telas-removidas.test.ts`, `permissions-aj/al.test.ts` |
| 9 | Nenhum item de menu aponta para módulo removido | `nav-menu.test.ts` |
| 10 | As actions exclusivas saíram (nada as chama por acesso direto) | `telas-removidas.test.ts` |
| 11 | Medição: um item de menu só, visível ao engenheiro | `nav-menu.test.ts` |
| 12 | A Cris não oferece telas removidas; a permissão segue o menu | `cris-telas.test.ts`, `cris-permissao.test.ts` |
| 13 | A base da Cris não descreve as telas removidas como atuais | `assistente-base.test.ts` |
| 14 | Recebíveis e medição na Cris leem contas a receber e medições de contrato | `cris-dados.test.ts` |
| 15 | Projetos: a tela e a Cris não pedem terreno, financiamento, área construída nem código da obra | `adequacao-ambiental.test.ts`, `projeto-cris.test.ts` |
| 16 | Projetos: a leitura de documento propõe receita e custo previstos | `projeto-analise.test.ts` |
| 17 | Contratante: grava fantasia e os três contatos | `actions/cliente-contratante.test.ts` |
| 18 | Contratante: salvar a ficha nova **não apaga** unidade, renda, FGTS, score e interesse | `actions/cliente-contratante.test.ts` |
| 19 | Contratante: campo enviado vazio é limpo | `actions/cliente-contratante.test.ts` |
| 20 | A ficha do cliente não tem campos de comprador | `adequacao-ambiental.test.ts` |
| 21 | Listagem e busca de clientes; status antigo continua filtrável | `actions/clientes-listagem.test.ts` |
| 22 | A fatura do contrato entra como "Fatura de serviço" | `actions/contratos.test.ts` |
| 23 | Tipos de receita oferecidos × válidos (Sinal/Parcela mensal só antigos) | `adequacao-ambiental.test.ts` |
| 24 | Valor contratado: status fora, alocação, divisão igual, contrato sem projeto | `valor-contratado.test.ts` |
| 25 | Resumo: medido, faturado, recebido e saldos pela mesma regra | `valor-contratado.test.ts` |
| 26 | Dashboard: cartão "Valor contratado", sem VGV e sem painel de obra | `adequacao-ambiental.test.ts`, `dashboard-analise.test.ts` |
| 27 | Reajuste: IPCA/IGP-M/INPC oferecidos; INCC só quando já gravado | `adequacao-ambiental.test.ts`, `incc-regras.test.ts` |
| 28 | Planilha: o modelo tem só Parametros e Despesas | `xlsx/growth-template.test.ts` |
| 29 | Planilha: o modelo novo importa despesa e não toca no INCC | `xlsx/growth-template.test.ts` |
| 30 | Planilha: o formato antigo continua lido; exportação antiga só com dados antigos | `xlsx/growth-template.test.ts` |
| 31 | Importação recusa abas de incorporação com dados, sem gravar nada | `actions/versao-importacao.test.ts` |
| 32 | Materiais: origens e motivos novos sem permuta/obra; entrada exige despesa | `adequacao-ambiental.test.ts`, `estoque-cris.test.ts` |
| 33 | Equipes: funções padrão de campo; documento "em campo" | `adequacao-ambiental.test.ts`, `actions/equipes.test.ts` |
| 34 | Fornecedores: papéis de incorporação válidos e não oferecidos | `adequacao-ambiental.test.ts`, `actions/stakeholders.test.ts` |
| 35 | Conta corrente: "Construtora" exibida como conta da própria empresa | `adequacao-ambiental.test.ts` |
| 36 | "Conta do plano" nas mensagens da conferência | `conferencia-regras.test.ts`, `conferencia-analise.test.ts` |
| 37 | Texto visível sem termo de construção fora das exceções justificadas | `terminologia-ambiental.test.ts` |
| 38 | Exceção sem ocorrência sai da lista; toda exceção tem classe C/D/E | `terminologia-ambiental.test.ts` |
| 39 | Usos legítimos não disparam (monitoramento arqueológico de obras, licenciamento de empreendimento, mão de obra) | `terminologia-ambiental.test.ts` |
| 40 | Empresa nova nasce com o plano ambiental, sem nada de obra | `tenant/provision-plano.test.ts` |

## 6. Pendências e riscos

- **Dados antigos e regras ativas.** A DRE e o Fluxo ainda somam unidades,
  permutas e liberações, e o INCC ainda é provisionado. Retirar esses caminhos
  é uma decisão contábil, porque muda relatórios históricos de quem tem esses
  dados.
- **Ajudas fiscais de construção civil** no cadastro da empresa: LC 116 itens
  7.02/7.05 e CNAE 4120-4/00 (`empresa-regras.ts`, `calc/emitente-fiscal.ts`).
  Ficam até a contabilidade validar os códigos do setor.
- **Chaves de comportamento** (`/chaves`): descrevem o efeito histórico sobre
  VGV, permuta e parcelas de venda. Ficam enquanto as chaves existirem.
- **Engenheiro / técnico de campo** passou a editar medições de contrato. É
  decisão declarada e precisa de validação.
- O **campo interno `vgv`** do Dashboard leva o valor contratado. O nome ficou
  para não mexer no contrato com o assistente e com a análise.

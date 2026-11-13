# Plano de Contas para consultorias ambientais

> **A conta identifica a natureza do lançamento. Projeto, contrato, modalidade,
> fase e atividade identificam onde e por que o recurso foi usado.**
> Não se cria conta por projeto, contrato, especialidade ou atividade.

Plano padrão do Growth Ambiental para consultorias ambientais, arqueologia,
patrimônio cultural e serviços técnicos especializados. Versão do padrão:
`ambiental-2026.11` (`src/lib/calc/plano-ambiental.ts`). Substitui a proposta
anterior (`docs/AMBIENTAL-PLANO-CONTAS.md`, mantida como histórico).

## 1. Diagnóstico (o que existia e o que mudou)

| Ponto | Antes | Agora |
|---|---|---|
| Hierarquia | 2 níveis: grupo (texto repetido em cada conta) → conta | Grupo → subgrupo → conta (até 3 níveis de grupos), tabela `chart_group`; a conta continua apontando o grupo por `group_code` |
| Referência dos lançamentos | `despesa.conta_cef` = **código** (texto); Orçamento por **código do grupo** (`row_key`) | Igual (não se trocou a referência). Por isso **código usado não muda** |
| Mudar código usado | Permitido — deixava lançamentos e Orçamento órfãos | Recusado (conta e grupo com uso) |
| Excluir conta | Só checava Orçamento | Checa despesas (inclusive canceladas), Orçamento, Medição e papel técnico |
| Validação no lançamento | Nenhuma (código inexistente, inativo ou de outra empresa passava) | Despesa, edição, caixa e rateio: conta do plano da empresa, ativa, analítica (grupo não recebe lançamento) |
| Seletor de conta da despesa | Mostrava inativas | Só ativas (a da despesa em edição fica) |
| "Grupo = prefixo antes do 1º ponto" | Em 5 lugares (replicar Atual, reprojeção da Previsão, assistente e análise de Medição, relatório CEF) | Grupo pelo cadastro da conta (`grupoDaConta`/`grupoDaChave`); prefixo só para chave antiga. Relatório Medição CEF segue o plano de construção (módulo de obra, fora do escopo) |
| Contas do acerto (juros/descontos) | Códigos fixos F.6/F.7 | Papel técnico (`papel`), resolvido no plano da empresa; F.6/F.7 como reserva |
| Categoria DRE do Orçamento | Por tipo (custo direto = Custo Variável, resto = Despesa Fixa) | Chave nova: categoria comum das contas do grupo |
| DRE | Cascata MC → EBITDA → Resultado Final | Igual (motor intocado) + visão **Estrutura gerencial** na DRE Analítica |

Dependências mapeadas: `budget_line/budget_account/budget_selecao.row_key`,
`despesa.conta_cef`, `medicao.grupo_code`, `categoria-do-plano.ts` (padrão por
código/grupo do plano antigo), `CONTAS_CONTROLADORIA` (F.6–F.9; F.8/F.9 não
são usados por código), modelo de planilha (`growth-template.ts`, lê o plano
padrão), relatório Medição CEF (plano de construção fixo).

## 2. Estrutura e critérios de classificação

- **Grupo (nível 1) → Subgrupo (nível 2) → Conta analítica.** Só a conta recebe
  lançamento. Até 3 níveis de grupos (controlado; sem ciclo).
- **Código** único na empresa entre contas e grupos (o Orçamento usa o código
  do grupo como chave). Identificador estável = id; o código é a referência
  dos lançamentos e não muda depois de usado.
- **Cada conta grava** natureza, categoria da DRE, classe gerencial e custo
  padrão direto/indireto — nada é deduzido do prefixo do código.
- **Subgrupos homogêneos** em natureza e categoria da DRE (o Orçamento planeja
  uma linha por subgrupo, com uma categoria).
- **Custo direto/indireto** é o padrão da conta; o lançamento pode tratar
  diferente (`despesa.tipo_custo`), ex.: combustível de projeto × da
  administração.
- **Duplicidades evitadas no desenho:** EPI só em 2.4 (2.5 é segurança
  coletiva); diária de campo (verba ao profissional, 2.1) × diária de
  deslocamento (custeio, 2.3); encargos de pessoal ficam em 2.1 (técnico) e
  3.2 (administrativo), não num grupo de tributos; descontos obtidos ficam em
  4.2 como redutor (convenção do acerto).

## 3. Contas implementadas

150 contas em 33 grupos/subgrupos. Coluna "Categoria DRE" alimenta a cascata
(Margem de Contribuição → EBITDA → Resultado Final); "Classe gerencial", a
Estrutura gerencial (Receita bruta → Resultado líquido).

### 1 — Receitas operacionais

_Receitas da prestação de serviços e suas deduções. A especialidade (arqueologia, fauna, flora…) é dimensão do projeto/contrato, não conta._

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **1.1** | **Prestação de serviços** | | | | |
| 1.1.01 | Receita de consultoria técnica | Receita | Receita | Receita bruta | — |
| 1.1.02 | Receita de estudos e diagnósticos | Receita | Receita | Receita bruta | — |
| 1.1.03 | Receita de monitoramento | Receita | Receita | Receita bruta | — |
| 1.1.04 | Receita de serviços técnicos especializados | Receita | Receita | Receita bruta | — |
| 1.1.05 | Receita de gerenciamento de programas ambientais | Receita | Receita | Receita bruta | — |
| 1.1.06 | Outras receitas de serviços | Receita | Receita | Receita bruta | — |
| **1.2** | **Outras receitas operacionais** | | | | |
| 1.2.01 | Outras receitas operacionais | Receita | Receita | Receita bruta | — |
| 1.2.02 | Recuperações e ressarcimentos reconhecidos como receita | Receita | Receita | Receita bruta | — |
| **1.3** | **Deduções da receita** | | | | |
| 1.3.01 | Descontos comerciais concedidos | Despesa | Despesa Variável | Deduções da receita | — |
| 1.3.02 | Cancelamentos e abatimentos | Despesa | Despesa Variável | Deduções da receita | — |

### 2 — Custos diretos dos projetos (bloco de custo direto)

_Gasto que existe por causa do projeto. O padrão é custo direto; o lançamento pode tratar diferente._

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **2.1** | **Pessoal técnico** | | | | |
| 2.1.01 | Salários de profissionais técnicos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.1.02 | Encargos sociais sobre a folha técnica | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.1.03 | Benefícios de profissionais alocados | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.1.04 | Diárias de campo | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.1.05 | Horas extras | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.1.06 | Adicionais (campo, periculosidade, insalubridade) | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.1.07 | Outros custos de pessoal técnico | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| **2.2** | **Serviços técnicos terceirizados** | | | | |
| 2.2.01 | Consultores especializados | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.2.02 | Arqueólogos terceirizados | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.2.03 | Biólogos e profissionais ambientais | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.2.04 | Serviços laboratoriais | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.2.05 | Serviços de topografia | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.2.06 | Geoprocessamento terceirizado | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.2.07 | Análises técnicas especializadas | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.2.08 | Serviços de campo contratados | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.2.09 | Outros serviços técnicos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| **2.3** | **Mobilização e logística** | | | | |
| 2.3.01 | Transporte de equipes | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.02 | Passagens | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.03 | Hospedagens | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.04 | Alimentação em campo | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.05 | Diárias de deslocamento | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.06 | Combustíveis | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.07 | Pedágios | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.08 | Locação de veículos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.09 | Fretes | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.10 | Transporte de equipamentos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.3.11 | Desmobilização | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| **2.4** | **Equipamentos e materiais** | | | | |
| 2.4.01 | Locação de equipamentos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.4.02 | Manutenção de equipamentos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.4.03 | Materiais de campo | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.4.04 | Materiais técnicos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.4.05 | Insumos de coleta e análise | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.4.06 | Ferramentas e acessórios | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.4.07 | Equipamentos de proteção individual (EPI) | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.4.08 | Outros materiais de execução | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| **2.5** | **Saúde e segurança ocupacional** | | | | |
| 2.5.01 | Exames ocupacionais | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.5.02 | ASO e demais documentos médicos ocupacionais | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.5.03 | Treinamentos obrigatórios | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.5.04 | Serviços especializados de segurança | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.5.05 | Equipamentos e materiais de segurança coletiva | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.5.06 | Outros custos de saúde e segurança | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| **2.6** | **Taxas e despesas técnicas** | | | | |
| 2.6.01 | Taxas de protocolos e requerimentos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.6.02 | Taxas de órgãos ambientais | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.6.03 | Taxas relacionadas ao patrimônio cultural | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.6.04 | Registros e responsabilidades técnicas | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.6.05 | Despesas com autorizações | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.6.06 | Emolumentos e serviços administrativos da execução | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.6.07 | Publicações legais (diário oficial e jornais) | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.6.08 | Outras taxas diretamente relacionadas aos projetos | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| **2.7** | **Outros custos de execução** | | | | |
| 2.7.01 | Infraestrutura temporária de campo | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.7.02 | Comunicações operacionais | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.7.03 | Materiais de apoio | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.7.04 | Serviços operacionais complementares | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.7.05 | Impressão e reprodução de estudos e relatórios | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.7.06 | Bases cartográficas e imagens | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.7.07 | Insumos de programas ambientais (mudas, materiais educativos) | Despesa | Custo Variável | Custos dos serviços prestados | direto |
| 2.7.08 | Outros custos diretos | Despesa | Custo Variável | Custos dos serviços prestados | direto |

### 3 — Despesas administrativas e indiretas

_Estrutura da empresa e custos compartilhados entre projetos (rateáveis)._

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **3.1** | **Administração e infraestrutura** | | | | |
| 3.1.01 | Aluguel | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.02 | Condomínio | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.03 | Energia elétrica | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.04 | Água | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.05 | Telefonia | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.06 | Internet | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.07 | Material de escritório | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.08 | Limpeza e conservação | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.09 | Manutenção predial | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.1.10 | Serviços administrativos | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| **3.2** | **Recursos humanos e departamento pessoal** | | | | |
| 3.2.01 | Salários administrativos | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.2.02 | Encargos sobre a folha administrativa | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.2.03 | Benefícios | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.2.04 | Recrutamento e seleção | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.2.05 | Treinamentos internos | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.2.06 | Serviços de departamento pessoal | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.2.07 | Medicina ocupacional administrativa | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.2.08 | Outros gastos de pessoal | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| **3.3** | **Tecnologia** | | | | |
| 3.3.01 | Licenças de software | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.3.02 | Sistemas SaaS | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.3.03 | Armazenamento em nuvem | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.3.04 | Infraestrutura de TI | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.3.05 | Equipamentos de informática de pequeno valor | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.3.06 | Manutenção e suporte | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.3.07 | Serviços de tecnologia | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.3.08 | Assinaturas digitais e certificados | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| **3.4** | **Serviços profissionais** | | | | |
| 3.4.01 | Contabilidade | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.4.02 | Assessoria jurídica | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.4.03 | Auditoria | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.4.04 | Consultoria administrativa | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.4.05 | Serviços financeiros terceirizados | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.4.06 | Outros serviços profissionais | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| **3.5** | **Comercial e marketing** | | | | |
| 3.5.01 | Publicidade | Despesa | Despesa Variável | Despesas operacionais | indireto |
| 3.5.02 | Marketing digital | Despesa | Despesa Variável | Despesas operacionais | indireto |
| 3.5.03 | Desenvolvimento comercial | Despesa | Despesa Variável | Despesas operacionais | indireto |
| 3.5.04 | Participação em eventos | Despesa | Despesa Variável | Despesas operacionais | indireto |
| 3.5.05 | Materiais promocionais | Despesa | Despesa Variável | Despesas operacionais | indireto |
| 3.5.06 | Despesas de prospecção e propostas | Despesa | Despesa Variável | Despesas operacionais | indireto |
| 3.5.07 | Comissões comerciais | Despesa | Despesa Variável | Despesas operacionais | indireto |
| **3.6** | **Despesas indiretas de projetos** | | | | |
| 3.6.01 | Coordenação técnica compartilhada | Despesa | Custo Fixo | Custos dos serviços prestados | indireto |
| 3.6.02 | Supervisão geral | Despesa | Custo Fixo | Custos dos serviços prestados | indireto |
| 3.6.03 | Estrutura operacional compartilhada | Despesa | Custo Fixo | Custos dos serviços prestados | indireto |
| 3.6.04 | Equipamentos compartilhados | Despesa | Custo Fixo | Custos dos serviços prestados | indireto |
| 3.6.05 | Logística compartilhada | Despesa | Custo Fixo | Custos dos serviços prestados | indireto |
| 3.6.06 | Outros custos indiretos atribuíveis a projetos | Despesa | Custo Fixo | Custos dos serviços prestados | indireto |
| **3.7** | **Registros, conselhos e seguros da empresa** | | | | |
| 3.7.01 | Anuidades de conselhos profissionais | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.7.02 | Cadastros técnicos e certificações da empresa | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.7.03 | Seguros | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 3.7.04 | Cartório e registros da empresa | Despesa | Despesa Fixa | Despesas operacionais | indireto |

### 4 — Resultado financeiro

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **4.1** | **Receitas financeiras** | | | | |
| 4.1.01 | Rendimentos de aplicações | Receita | Receita | Resultado financeiro | — |
| 4.1.02 | Juros ativos | Receita | Receita | Resultado financeiro | — |
| 4.1.03 | Outras receitas financeiras | Receita | Receita | Resultado financeiro | — |
| **4.2** | **Despesas financeiras** | | | | |
| 4.2.01 | Tarifas bancárias | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.02 | Juros e multas de mora _(papel: juros_mora)_ | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.03 | Multas financeiras | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.04 | Encargos de financiamento | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.05 | IOF | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.06 | Outras despesas financeiras | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.07 | Descontos financeiros obtidos (redutor) _(papel: descontos_obtidos)_ | Despesa | Despesas Financeiras | Resultado financeiro | — |

### 5 — Tributos e obrigações

_Separa tributos sobre o faturamento, sobre o resultado e da empresa. Encargos de pessoal ficam em 2.1 e 3.2. Nenhuma conta gera apuração ou lançamento automático._

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **5.1** | **Tributos sobre o faturamento** | | | | |
| 5.1.01 | ISS | Despesa | Despesa Variável | Deduções da receita | — |
| 5.1.02 | PIS | Despesa | Despesa Variável | Deduções da receita | — |
| 5.1.03 | COFINS | Despesa | Despesa Variável | Deduções da receita | — |
| 5.1.04 | Simples Nacional (DAS) | Despesa | Despesa Variável | Deduções da receita | — |
| 5.1.05 | Outros tributos sobre o faturamento | Despesa | Despesa Variável | Deduções da receita | — |
| **5.2** | **Tributos sobre o resultado** | | | | |
| 5.2.01 | IRPJ | Despesa | Despesa Variável | Tributos sobre o lucro | — |
| 5.2.02 | CSLL | Despesa | Despesa Variável | Tributos sobre o lucro | — |
| **5.3** | **Tributos e taxas da empresa** | | | | |
| 5.3.01 | IPTU | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 5.3.02 | IPVA | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 5.3.03 | Alvarás e taxas municipais | Despesa | Despesa Fixa | Despesas operacionais | indireto |
| 5.3.04 | Outros tributos e encargos | Despesa | Despesa Fixa | Despesas operacionais | indireto |

### 6 — Outras contas e classificações

_Fora da operação: não operacional, investimentos, empréstimos e retiradas. O sistema não tem contas patrimoniais nem depreciação._

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **6.1** | **Outras receitas não operacionais** | | | | |
| 6.1.01 | Ganho na venda de bens | Receita | Receita | Outras receitas e despesas não operacionais | — |
| 6.1.02 | Outras receitas não operacionais | Receita | Receita | Outras receitas e despesas não operacionais | — |
| **6.2** | **Outras despesas não operacionais** | | | | |
| 6.2.01 | Perdas e baixas | Despesa | Despesa Fixa | Outras receitas e despesas não operacionais | — |
| 6.2.02 | Outras despesas não operacionais | Despesa | Despesa Fixa | Outras receitas e despesas não operacionais | — |
| **6.3** | **Investimentos** | | | | |
| 6.3.01 | Equipamentos técnicos e de campo | Despesa | Investimento | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| 6.3.02 | Veículos | Despesa | Investimento | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| 6.3.03 | Equipamentos de informática | Despesa | Investimento | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| 6.3.04 | Benfeitorias e instalações | Despesa | Investimento | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| 6.3.05 | Outros investimentos | Despesa | Investimento | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| **6.4** | **Empréstimos e financiamentos** | | | | |
| 6.4.01 | Amortização de empréstimos e financiamentos | Despesa | Empréstimos | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| 6.4.02 | Parcelamentos (principal) | Despesa | Empréstimos | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| **6.5** | **Retiradas dos sócios** | | | | |
| 6.5.01 | Pró-labore | Despesa | Retiradas | Despesas operacionais | — |
| 6.5.02 | Distribuição de lucros | Despesa | Retiradas | Fora do resultado (investimentos, empréstimos, distribuição) | — |
## 4. Personalização por empresa

- Cada empresa tem a sua cópia (grupos e contas com o `tenant_id` dela). Mudar
  o padrão no código **não** altera empresas existentes.
- Tela **Planejamento → Plano de Contas**: busca (código, nome, descrição);
  filtros por grupo, natureza, categoria DRE, classe gerencial e situação;
  expandir/recolher; criar grupo, subgrupo e conta (formulário simples; classe
  e custo em "Opções avançadas", com o efeito na DRE explicado); editar;
  reordenar; mover conta ou grupo; duplicar subgrupo com contas; inativar;
  excluir (só sem uso); "Onde a conta é usada" (lançamentos, Orçamento,
  Medição; por botão, valores por projeto, contrato, fase e direto/indireto).
- Aviso de conta parecida ao criar ("Hospedagem em viagem" ≈ "Hospedagens"),
  sem bloquear.
- **Exportar** XLSX/CSV (`/planocontas/exportar`) e **importar** planilha com
  prévia (novas, alteradas, iguais, duplicidades, erros, impacto na DRE);
  código nunca muda por importação; conta usada não muda de grupo nem de
  natureza por importação; categoria de conta usada exige confirmar o impacto.
- Concorrência: trava por empresa (`pg_advisory_xact_lock`) nas mudanças de
  estrutura e versão otimista (`versao`) na edição da conta.

## 5. Mudança com impacto em relatórios

Mudar **categoria, classe, custo padrão ou grupo de conta usada** devolve a
prévia (lançamentos, valor na Atual, linhas de Orçamento, versões
congeladas e o efeito: com a chave de categoria ligada, a DRE dos lançamentos
já feitos muda, inclusive em versão congelada) e só grava com
"Confirmo a mudança". Natureza de conta com lançamentos não muda.

**Reclassificar lançamentos** (permissão própria `planocontasreclass`, sensível:
nasce só com owner/admin): move despesas de uma conta para outra nos
projetos que a pessoa vê, **exceto em versões congeladas**; com a chave de
categoria ligada, a categoria gravada acompanha a conta nova. Prévia por tipo
de versão, confirmação explícita e auditoria (`chart.reclassificar`, com ids).

## 6. DRE

- **Motor intocado.** A cascata continua: Receita − Custo Variável − Despesa
  Variável = Margem de Contribuição − Custo Fixo − Despesa Fixa − Retiradas =
  EBITDA − Investimentos − Empréstimos − Despesas Financeiras = Resultado Final.
- **Estrutura gerencial** (DRE Analítica, abaixo da tabela): os MESMOS
  lançamentos reagrupados pela classe gerencial: Receita bruta → (−) Deduções →
  Receita líquida → (−) Custos dos serviços → Resultado bruto → (−) Despesas
  operacionais → Resultado operacional → (±) Resultado financeiro → (±) Outras
  não operacionais → Resultado antes dos tributos sobre o lucro → (−) Tributos
  sobre o lucro → Resultado líquido. Investimentos, empréstimos e distribuição
  ficam "fora do resultado" e entram na linha de conferência, que **bate com o
  Resultado Final da cascata** (sem dupla contagem; mostrado na tela).
- Receita sem conta (contratos/vendas), encargos de pagamento e contas fora do
  plano entram pela categoria. Orçamento lançado por grupo usa a classe comum
  das contas do grupo.
- **Contas sem mapeamento válido** e **despesas sem conta ou com conta fora do
  plano** aparecem num aviso na tela do Plano de Contas.

## 7. Orçamento e Previsão

Sem mudar versões nem a grade: o Orçamento continua **por subgrupo** do plano
(uma linha por grupo, consolidando as contas). Com a chave
`orcamento_categoria_do_plano` (empresa nova já nasce ligada), linha NOVA
nasce com a categoria comum das contas do grupo (prévia em
`/planocontas#previa-orcamento`). "Replicar a Atual" e a reprojeção da
Previsão agrupam o realizado pelo grupo cadastrado da conta. Orçado ×
realizado por conta analítica: pela DRE Analítica.

## 8. Projetos, contratos, fases, modalidades e rateios

- A conta é a mesma em qualquer projeto; o projeto vem da versão da despesa, o
  contrato de `despesa.contrato_id`, a fase/atividade de
  `despesa.projeto_fase_id/projeto_atividade_id` e a modalidade do contrato.
- "Onde a conta é usada" cruza a conta com projeto, contrato, fase e
  direto/indireto (Atual, sem canceladas, só projetos que a pessoa vê).
- Rateio entre projetos (`ratearEntreObras`) mantém a conta em cada despesa e
  agora valida a conta. O rateio de receita não usa contas (sem mudança).

## 9. Reembolsos

A despesa reembolsável mantém a conta original; o reembolso é atributo do
vínculo com o contrato (Contratos → reembolsos), não conta nova nem receita
operacional. O relatório de reembolsos ganhou o resumo **por conta**
(solicitado, aprovado, recebido).

## 10. Cris

- Despesa: o formulário oferece à Cris só as contas ativas da empresa; a leitura
  de documento só propõe conta ativa; o servidor recusa conta inexistente,
  inativa, de outra empresa ou grupo. Quem grava é o botão.
- Ferramenta `plano_de_contas`: **sugerir** (candidatas pela descrição, só
  ativas), **explicar** (finalidade, categoria, classe, custo), **estrutura**,
  **duplicidades** e **sem_classificacao** — sempre com as contas da empresa.
- Contas novas pela Cris: proposta → conferência → "Criar as contas marcadas"
  (revalidado no servidor). Nada é alterado em massa sem revisão.
- Base de conhecimento atualizada (`assistente-base/bi-planejamento-config.ts`).

## 11. Migração e empresas existentes

- `0079_plano_contas_ambiental` (aditiva, idempotente; rollback em
  `migrations/down/`): tabela `chart_group`; colunas `descricao`, `ordem`,
  `classe_gerencial`, `tipo_custo`, `papel`, `versao`, `updated_at` em
  `chart_account`; `tipo_custo` em `despesa`; índices. Cada grupo atual vira
  nó de nível 1; F.6/F.7 ganham o papel técnico. Nenhum código, nome,
  categoria ou lançamento muda.
- **Empresas novas** recebem o plano padrão no provisionamento
  (`instalarPlanoPadrao`) com as chaves `despesa_categoria_do_plano` e
  `orcamento_categoria_do_plano` ligadas.
- **Empresas existentes** não mudam. Transição sugerida, com prévia em cada
  passo: (1) "Plano padrão ambiental" acrescenta grupos e contas que faltam
  (aditivo; grupo com código ocupado entra como `PA-…`; conta com código
  ocupado não entra); (2) "Reclassificar lançamentos" move o histórico da conta
  antiga para a nova, fora das versões congeladas; (3) inativar as contas
  antigas sem uso futuro; (4) ligar as chaves na tela de Chaves, depois da
  prévia.

## 12. Permissões e auditoria

| Ação | Permissão |
|---|---|
| Ver plano, exportar | `planocontas` ver |
| Criar grupo/conta, importar (+ editar), adotar padrão | `planocontas` criar |
| Editar, mover, reordenar, inativar, mudar categoria/classe | `planocontas` editar |
| Excluir (sem uso) | `planocontas` excluir |
| Reclassificar lançamentos | `planocontasreclass` editar (sensível) |

Auditoria: `chart.group.create/update/delete/duplicate`,
`chart.item.create/update/activate/deactivate/delete` (com de/para e impacto),
`chart.padrao.adotar`, `chart.importar`, `chart.exportar`,
`chart.reclassificar`. Toda leitura e escrita filtra a empresa da sessão.

## 13. Testes

- `src/lib/calc/plano-ambiental.test.ts` — estrutura, códigos únicos entre
  grupos e contas, atributos coerentes, subgrupos homogêneos, papéis,
  ausência de dado real.
- `src/lib/planocontas-regras.test.ts` — hierarquia/ciclo/níveis, grupo pelo
  cadastro, duplicidade e sugestão, validação do lançamento, prévia de
  importação, DRE gerencial (subtotais e conferência com a cascata),
  exportação.
- `src/lib/actions/planocontas-ambiental.test.ts` — integração (itens 1–37):
  provisionamento, CRUD, conta inativa/inexistente/de outra empresa/grupo,
  exclusão bloqueada, isolamento, categoria herdada, Orçamento por grupo,
  replicação da Atual, DRE analítica/consolidada/gerencial, rateio,
  reclassificação, impacto confirmado, Cris, reembolso, adoção do padrão,
  importação, migração e permissões.

## 14. Decisões que dependem de validação contábil

1. **Pessoal técnico como Custo Variável** (custo direto dos projetos). A
   proposta anterior usava Custo Fixo. Afeta a Margem de Contribuição.
2. **Tributos sobre o faturamento (ISS, PIS, COFINS, DAS) como Despesa
   Variável** na cascata e **Deduções** na visão gerencial; **IRPJ/CSLL** como
   Despesa Variável na cascata e tributos sobre o lucro na gerencial. O Simples
   (DAS) mistura os dois: a classe é decisão da empresa com o contador.
3. **Despesas indiretas de projetos (3.6)** como custo dos serviços (Custo
   Fixo); alternativa: despesa administrativa.
4. **Receitas financeiras** (natureza receita) entram na linha Receita da
   cascata — o motor não tem linha de receita financeira; na gerencial,
   ficam no Resultado financeiro. Descontos obtidos seguem a convenção do
   acerto (redutor negativo em Despesas Financeiras).
5. **Pró-labore**: Retiradas na cascata, despesa operacional na gerencial.
6. **Retiradas, Investimentos e Empréstimos** reduzem o Resultado Final da
   cascata (regra atual); na gerencial ficam fora do resultado. Adotar a
   gerencial como DRE principal é decisão de política.
7. **Recuperações e ressarcimentos (1.2.02)** só quando a política reconhecer
   como receita.
8. **Reclassificar com a chave ligada** muda a DRE dos lançamentos movidos (e,
   ao mudar categoria de conta, também em versões congeladas): a tela mostra e
   exige confirmação.

## 15. Limitações e pendências

- Orçamento por **conta analítica** (hoje por subgrupo) e por contrato/fase.
- Receita realizada (contratos, contas a receber) ainda **não** é lançada por
  conta do plano: entra como "Receita de contratos e vendas (sem conta)".
- Sem contas patrimoniais, depreciação e amortização (o sistema não faz
  partidas dobradas).
- Relatório Medição CEF continua no plano de construção (módulo de obra).
- Código de conta usada não muda (seria preciso migrar as referências em
  despesas e Orçamento); o caminho é criar a conta nova e reclassificar.
- Modelo de planilha de lançamentos (`growth-template`) casa nomes com o plano
  padrão, não com o plano da empresa.
- Empresa sem nenhuma conta cadastrada não tem a validação de conta no
  lançamento (não há plano a seguir).

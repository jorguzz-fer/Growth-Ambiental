# Plano de Contas para consultorias ambientais

> **A conta identifica a natureza do lançamento. Projeto, contrato, modalidade,
> fase e atividade identificam onde e por que o recurso foi usado.**
> Não se cria conta por projeto, contrato, especialidade ou atividade.

Plano padrão do Growth Ambiental para consultorias ambientais, arqueologia,
patrimônio cultural e serviços técnicos especializados. Versão do padrão:
`ambiental-2026.11b` (`src/lib/calc/plano-ambiental.ts`). Substitui a proposta
anterior (`docs/AMBIENTAL-PLANO-CONTAS.md`, mantida como histórico).

## 0. Por que a tela continuava mostrando o plano de obra

Diagnóstico com evidência (consultas ao banco e reprodução no app):

1. **Plano no código:** o plano de consultoria ambiental (`plano-ambiental.ts`);
   o plano de obra (`PLANO_CONTAS` em `constants.ts`) saiu do código.
2. **Plano gravado no banco:** cada empresa tem as SUAS linhas em
   `chart_account`/`chart_group`. Até 15/10/2026 o provisionamento
   (`src/lib/tenant/provision.ts`, histórico do Git) gravava o plano de obra
   (Serviços Preliminares, Fundações, Supraestrutura, Pós-obra, T/C/M/RH/TR…).
   Nenhuma migração substitui essas linhas — a 0079 só criou os grupos na
   tabela nova a partir delas.
3. **Empresa consultada pela tela:** a do primeiro vínculo (`membership`, por
   `created_at`) do usuário logado (`getTenantContext`).
4. **Consulta da tela:** `getChartAccounts(tenantId)` — todas as contas
   gravadas daquela empresa, sem filtro e sem cache (`dynamic = "force-dynamic"`;
   as ações chamam `revalidatePath`).
5. **Só empresas novas** recebiam o plano novo (provisionamento e seed).
6. **Sim:** empresas criadas antes continuam com as contas antigas gravadas —
   reproduzido num banco isolado: empresa criada com o plano de obra, aberta na
   versão atual do app, mostra "Fundações", "Supraestrutura", "Pós-obra".
7. **Códigos fixos em regra:** só reservas de compatibilidade (F.6/F.7 para o
   acerto quando não há papel; padrões de categoria por código do plano
   ambiental anterior; leitura de grupo pelo prefixo para chave antiga). Nenhum
   explica a tela.
8. **Cache:** não há.
9. **Lançamentos:** dependem da empresa — `scripts/diagnostico-plano-contas.sql`
   (somente leitura) mostra, por empresa, o plano gravado e o uso de cada conta
   em despesas, Orçamento e medições.
10. **Correção:** converter o plano gravado da empresa (seção 11), com prévia,
    preservação do histórico e reversão — além do código e do provisionamento.

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
- **Duplicidades evitadas no desenho:** EPI e materiais de segurança só em
  2.4 (2.5 é exames, programas e serviços); diária de campo é verba ao
  profissional (2.1), e a viagem (passagens, hospedagem, alimentação) fica em
  2.3; impostos sobre o faturamento só em 5.1 (aparecem como Deduções na DRE
  gerencial; 1.3 tem só abatimentos, descontos e cancelamentos); encargos de
  pessoal: por função em 2.1.02 e 3.2.02 **ou** em 5.3 (INSS/FGTS) para quem
  não separa — a mesma guia nunca vai nos dois; descontos financeiros obtidos
  ficam em 4.2.07 como redutor (convenção do acerto de contas; o resultado
  financeiro líquido é o mesmo); infraestrutura compartilhada de EXECUÇÃO em
  2.7.05 × administrativa em 3.6.03.
- **Fora do plano, de propósito:** ajustes gerenciais, contas transitórias e
  de controle, depreciação e amortização. O sistema é gerencial de receitas e
  despesas (sem partidas dobradas nem balanço) e toda conta precisa de uma
  categoria da DRE de caixa; criar essas contas exigiria uma categoria "fora
  da DRE" — decisão de política (seção 14). Imobilizado entra como
  desembolso de investimento (6.3).

## 3. Contas implementadas

162 contas em 6 grupos e 29 subgrupos. "Categoria DRE" alimenta a cascata
(Margem de Contribuição → EBITDA → Resultado Final); "Classe gerencial", a
Estrutura gerencial (Receita bruta → Resultado líquido). Gerada do código
(`src/lib/calc/plano-ambiental.ts`).

### 1 — Receitas operacionais

Receitas da prestação de serviços e suas deduções. A especialidade (arqueologia, fauna, flora…) é dimensão do projeto/contrato, não conta.

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **1.1** | **Receita de prestação de serviços** | | | | |
| 1.1.01 | Receita de consultoria técnica | Receita | Receita | Receita bruta | — |
| 1.1.02 | Receita de estudos e diagnósticos ambientais | Receita | Receita | Receita bruta | — |
| 1.1.03 | Receita de monitoramento ambiental | Receita | Receita | Receita bruta | — |
| 1.1.04 | Receita de serviços técnicos especializados | Receita | Receita | Receita bruta | — |
| 1.1.05 | Receita de gestão de programas ambientais | Receita | Receita | Receita bruta | — |
| 1.1.06 | Receita de projetos e estudos complementares | Receita | Receita | Receita bruta | — |
| 1.1.07 | Outras receitas de prestação de serviços | Receita | Receita | Receita bruta | — |
| **1.2** | **Outras receitas operacionais** | | | | |
| 1.2.01 | Outras receitas operacionais | Receita | Receita | Receita bruta | — |
| 1.2.02 | Recuperações de despesas classificadas como receita | Receita | Receita | Receita bruta | — |
| 1.2.03 | Outras receitas relacionadas à atividade empresarial | Receita | Receita | Receita bruta | — |
| **1.3** | **Deduções da receita** | | | | |
| 1.3.01 | Abatimentos concedidos | Despesa | Despesa Variável | Deduções da receita | — |
| 1.3.02 | Descontos comerciais | Despesa | Despesa Variável | Deduções da receita | — |
| 1.3.03 | Cancelamentos de faturamento | Despesa | Despesa Variável | Deduções da receita | — |

### 2 — Custos diretos dos serviços (bloco de custo direto)

Gasto que existe por causa do projeto. O padrão é custo direto; o lançamento pode tratar diferente (ex.: combustível da sede).

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **2.1** | **Pessoal técnico** | | | | |
| 2.1.01 | Salários de profissionais técnicos | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.1.02 | Encargos sociais de pessoal técnico | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.1.03 | Benefícios de equipes técnicas | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.1.04 | Horas extras | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.1.05 | Adicionais aplicáveis | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.1.06 | Diárias de campo | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.1.07 | Outros custos diretos de pessoal | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| **2.2** | **Serviços técnicos terceirizados** | | | | |
| 2.2.01 | Consultores especializados | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.2.02 | Serviços de arqueologia | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.2.03 | Serviços de biologia e meio ambiente | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.2.04 | Serviços de topografia | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.2.05 | Serviços de geoprocessamento | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.2.06 | Serviços laboratoriais | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.2.07 | Análises técnicas especializadas | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.2.08 | Serviços operacionais de campo | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.2.09 | Outros serviços técnicos terceirizados | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| **2.3** | **Mobilização e logística** | | | | |
| 2.3.01 | Transporte de equipes | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.02 | Passagens aéreas | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.03 | Passagens terrestres | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.04 | Hospedagens | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.05 | Alimentação em campo | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.06 | Combustíveis | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.07 | Pedágios | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.08 | Locação de veículos | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.09 | Fretes | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.10 | Transporte de equipamentos | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.11 | Mobilização operacional | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.3.12 | Desmobilização operacional | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| **2.4** | **Equipamentos e materiais** | | | | |
| 2.4.01 | Locação de equipamentos técnicos | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.4.02 | Manutenção de equipamentos | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.4.03 | Materiais de campo | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.4.04 | Materiais de coleta e análise | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.4.05 | Ferramentas | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.4.06 | Insumos técnicos | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.4.07 | Equipamentos de proteção individual (EPI) | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.4.08 | Materiais de segurança | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.4.09 | Outros materiais utilizados na execução | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| **2.5** | **Saúde e segurança ocupacional** | | | | |
| 2.5.01 | Exames médicos ocupacionais | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.5.02 | ASO | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.5.03 | Treinamentos de segurança | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.5.04 | Serviços especializados de segurança ocupacional | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.5.05 | Programas de saúde e segurança | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.5.06 | Outros custos de saúde e segurança | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| **2.6** | **Taxas e despesas técnicas** | | | | |
| 2.6.01 | Taxas de órgãos ambientais | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.6.02 | Taxas de protocolos | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.6.03 | Taxas relacionadas ao patrimônio cultural | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.6.04 | Registros profissionais | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.6.05 | Emissão de documentos de responsabilidade técnica | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.6.06 | Despesas com autorizações | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.6.07 | Emolumentos | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.6.08 | Publicações legais (diário oficial e jornais) | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.6.09 | Outras taxas diretamente vinculadas aos serviços | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| **2.7** | **Infraestrutura operacional de projetos** | | | | |
| 2.7.01 | Instalações temporárias | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.7.02 | Estruturas de apoio de campo | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.7.03 | Comunicação operacional | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.7.04 | Serviços de apoio | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.7.05 | Infraestrutura compartilhada de execução | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.7.06 | Outros custos operacionais | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| **2.8** | **Outros custos diretos** | | | | |
| 2.8.01 | Impressão e reprodução de estudos e relatórios | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.8.02 | Bases cartográficas e imagens | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.8.03 | Insumos de programas ambientais (mudas, materiais educativos) | Despesa | Custo Variável | Custos dos serviços prestados | Direto |
| 2.8.04 | Outros custos identificáveis diretamente com os serviços | Despesa | Custo Variável | Custos dos serviços prestados | Direto |

### 3 — Despesas operacionais e administrativas

Estrutura da empresa e gastos compartilhados (rateáveis entre projetos quando a empresa quiser).

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **3.1** | **Administração e infraestrutura** | | | | |
| 3.1.01 | Aluguel | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.02 | Condomínio | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.03 | Energia elétrica | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.04 | Água | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.05 | Telefonia | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.06 | Internet | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.07 | Material de escritório | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.08 | Limpeza e conservação | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.09 | Manutenção predial | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.1.10 | Despesas administrativas diversas | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| **3.2** | **Recursos humanos e departamento pessoal** | | | | |
| 3.2.01 | Salários administrativos | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.2.02 | Encargos sociais administrativos | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.2.03 | Benefícios | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.2.04 | Recrutamento e seleção | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.2.05 | Treinamentos internos | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.2.06 | Serviços de departamento pessoal | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.2.07 | Medicina ocupacional administrativa | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.2.08 | Outras despesas de pessoal | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| **3.3** | **Tecnologia da informação** | | | | |
| 3.3.01 | Licenças de software | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.3.02 | Sistemas SaaS | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.3.03 | Armazenamento em nuvem | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.3.04 | Infraestrutura de TI | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.3.05 | Equipamentos de informática | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.3.06 | Suporte técnico | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.3.07 | Manutenção de sistemas | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.3.08 | Assinaturas digitais | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.3.09 | Outros serviços de tecnologia | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| **3.4** | **Serviços profissionais** | | | | |
| 3.4.01 | Contabilidade | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.4.02 | Assessoria jurídica | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.4.03 | Consultoria administrativa | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.4.04 | Auditoria | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.4.05 | Serviços de gestão financeira | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.4.06 | Serviços profissionais diversos | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| **3.5** | **Comercial e marketing** | | | | |
| 3.5.01 | Publicidade | Despesa | Despesa Variável | Despesas operacionais | Indireto |
| 3.5.02 | Marketing digital | Despesa | Despesa Variável | Despesas operacionais | Indireto |
| 3.5.03 | Eventos comerciais | Despesa | Despesa Variável | Despesas operacionais | Indireto |
| 3.5.04 | Prospecção de clientes | Despesa | Despesa Variável | Despesas operacionais | Indireto |
| 3.5.05 | Materiais promocionais | Despesa | Despesa Variável | Despesas operacionais | Indireto |
| 3.5.06 | Comissões comerciais | Despesa | Despesa Variável | Despesas operacionais | Indireto |
| 3.5.07 | Outras despesas comerciais | Despesa | Despesa Variável | Despesas operacionais | Indireto |
| **3.6** | **Despesas indiretas e compartilhadas** | | | | |
| 3.6.01 | Coordenação administrativa | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.6.02 | Supervisão geral | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.6.03 | Infraestrutura compartilhada | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.6.04 | Equipamentos compartilhados | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.6.05 | Logística administrativa | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.6.06 | Outros gastos indiretos | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| **3.7** | **Registros, conselhos e seguros da empresa** | | | | |
| 3.7.01 | Anuidades de conselhos profissionais | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.7.02 | Cadastros técnicos e certificações da empresa | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.7.03 | Seguros | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 3.7.04 | Cartório e registros da empresa | Despesa | Despesa Fixa | Despesas operacionais | Indireto |

### 4 — Resultado financeiro

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **4.1** | **Receitas financeiras** | | | | |
| 4.1.01 | Rendimentos de aplicações financeiras | Receita | Receita | Resultado financeiro | — |
| 4.1.02 | Juros ativos | Receita | Receita | Resultado financeiro | — |
| 4.1.03 | Outras receitas financeiras | Receita | Receita | Resultado financeiro | — |
| **4.2** | **Despesas financeiras** | | | | |
| 4.2.01 | Tarifas bancárias | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.02 | Juros passivos | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.03 | Multas financeiras | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.04 | Encargos de financiamentos | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.05 | IOF | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.06 | Outras despesas financeiras | Despesa | Despesas Financeiras | Resultado financeiro | — |
| 4.2.07 | Descontos financeiros obtidos (redutor) | Despesa | Despesas Financeiras | Resultado financeiro | — |

### 5 — Tributos e encargos

Separa tributos sobre o faturamento, sobre o lucro e encargos de pessoal. Nenhuma conta gera apuração ou lançamento automático.

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **5.1** | **Tributos sobre o faturamento** | | | | |
| 5.1.01 | ISS | Despesa | Despesa Variável | Deduções da receita | — |
| 5.1.02 | PIS | Despesa | Despesa Variável | Deduções da receita | — |
| 5.1.03 | COFINS | Despesa | Despesa Variável | Deduções da receita | — |
| 5.1.04 | Simples Nacional (DAS) | Despesa | Despesa Variável | Deduções da receita | — |
| 5.1.05 | Outros tributos sobre o faturamento | Despesa | Despesa Variável | Deduções da receita | — |
| **5.2** | **Tributos sobre o lucro** | | | | |
| 5.2.01 | IRPJ | Despesa | Despesa Variável | Tributos sobre o lucro | — |
| 5.2.02 | CSLL | Despesa | Despesa Variável | Tributos sobre o lucro | — |
| **5.3** | **Encargos de pessoal** | | | | |
| 5.3.01 | INSS | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 5.3.02 | FGTS | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 5.3.03 | Outros encargos de pessoal | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| **5.4** | **Outros tributos e taxas da empresa** | | | | |
| 5.4.01 | IPTU | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 5.4.02 | IPVA | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 5.4.03 | Alvarás e taxas municipais | Despesa | Despesa Fixa | Despesas operacionais | Indireto |
| 5.4.04 | Outros tributos | Despesa | Despesa Fixa | Despesas operacionais | Indireto |

### 6 — Outras classificações

Fora da operação: outras receitas e despesas, imobilizado, empréstimos e retiradas. O sistema é gerencial: não tem contas patrimoniais, depreciação nem contas transitórias.

| Código | Conta | Natureza | Categoria DRE | Classe gerencial | Custo padrão |
|---|---|---|---|---|---|
| **6.1** | **Outras receitas** | | | | |
| 6.1.01 | Ganho na venda de bens | Receita | Receita | Outras receitas e despesas não operacionais | — |
| 6.1.02 | Outras receitas não operacionais | Receita | Receita | Outras receitas e despesas não operacionais | — |
| **6.2** | **Outras despesas** | | | | |
| 6.2.01 | Perdas e baixas | Despesa | Despesa Fixa | Outras receitas e despesas não operacionais | — |
| 6.2.02 | Outras despesas não operacionais | Despesa | Despesa Fixa | Outras receitas e despesas não operacionais | — |
| **6.3** | **Imobilizado (investimentos)** | | | | |
| 6.3.01 | Equipamentos técnicos e de campo | Despesa | Investimento | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| 6.3.02 | Veículos | Despesa | Investimento | Fora do resultado (investimentos, empréstimos, distribuição) | — |
| 6.3.03 | Computadores e equipamentos de informática (imobilizado) | Despesa | Investimento | Fora do resultado (investimentos, empréstimos, distribuição) | — |
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
- Tela **Planejamento → Plano de Contas**, no layout de cartões: os grupos de
  1º nível (Receitas operacionais, Custos diretos dos serviços…) abrem e
  fecham; dentro, um cartão por subgrupo com as contas e a categoria da DRE de
  cada uma. Busca por código, nome ou descrição; filtros por natureza,
  categoria da DRE e situação (ativas, inativas, todas); expandir/recolher
  tudo. Em "Editar" no subgrupo: renomear, mover para outro grupo, excluir
  (sem uso); em cada conta, nome, natureza, categoria, **mover para outro
  subgrupo**, descrição, inativar/reativar, excluir (sem uso). Código de conta
  usada não muda.
- **Criar:** grupo (1º nível), subgrupo ("+ Novo subgrupo", código sugerido) e
  conta (nome, natureza, categoria da DRE — sugerida pela das outras contas do
  subgrupo —, descrição opcional; código sugerido). Ao escolher a categoria, a
  tela diz onde a conta aparece na DRE.
- Mudar natureza, categoria ou subgrupo de uma conta já usada mostra quantos
  lançamentos e linhas de Orçamento são afetados e só grava com a confirmação.
- Grupos inativos (o plano anterior arquivado pela conversão, ou desativados
  pela empresa) ficam numa seção própria, "Plano anterior e grupos inativos",
  com o uso de cada conta, a conta ambiental equivalente sugerida e o botão
  "Reclassificar lançamentos" (com prévia).
- Na lateral: assistente (somente leitura), Categorias DRE, ferramentas
  (exportar, importar, reclassificar lançamentos) e a prévia da chave de
  categoria do Orçamento.
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
  **duplicidades**, **sem_classificacao** e **pouco_uso** — sempre com as
  contas da empresa.
- Ferramenta `despesas_por_fornecedor_ou_situacao` agrupa também por conta
  (código e nome), subgrupo do plano, grupo superior e obra × conta: "quanto
  gastamos com hospedagem", "maiores despesas de logística", "quais contas
  concentram os custos", "hospedagem por projeto". Desvio por projeto:
  `orcado_x_realizado`.
- Despesa só usa conta de natureza despesa (servidor e formulário).
- Contas novas pela Cris: proposta → conferência → "Criar as contas marcadas"
  (revalidado no servidor). Nada é alterado em massa sem revisão.
- Base de conhecimento atualizada (`assistente-base/bi-planejamento-config.ts`).

## 11. Migração e empresas existentes

- `0079_plano_contas_ambiental` (aditiva, idempotente; rollback em
  `migrations/down/`): tabela `chart_group`; colunas `descricao`, `ordem`,
  `classe_gerencial`, `tipo_custo`, `papel`, `versao`, `updated_at` em
  `chart_account`; `tipo_custo` em `despesa`; índices. Não troca o plano de
  ninguém.
- **Empresas novas** recebem o plano ambiental no provisionamento
  (`instalarPlanoPadrao`), com as chaves `despesa_categoria_do_plano` e
  `orcamento_categoria_do_plano` ligadas. Não recebem cliente, fornecedor,
  lançamento nem dado operacional (o projeto inicial é o que o operador da
  plataforma nomeia no formulário). Teste: `src/lib/tenant/provision-plano.test.ts`.

### Conversão de empresa existente (plano de obra ou ambiental anterior)

Módulos: `src/lib/planocontas-conversao.ts` (planejamento, puro),
`src/lib/planocontas-conversao-servidor.ts` (aplicar e desfazer, em
transação com trava por empresa), `src/lib/actions/planocontas-conversao.ts`
(tela) e `src/lib/planocontas-conversao-cli.ts` (linha de comando).

**O que a conversão faz, numa transação:**
1. Arquiva com o prefixo `ANT-` os códigos antigos que ocupam códigos do plano
   ambiental (ex.: grupo de obra `1` → `ANT-1`, conta `1.1` → `ANT-1.1`) e
   troca o código em TODAS as referências da empresa: `despesa.conta_cef`,
   `budget_line/budget_account/budget_selecao.row_key`, `medicao.grupo_code`,
   `chart_account.group_code`. Valores e categorias não mudam — inclusive em
   versão congelada, onde só o texto do código muda (sem isso, o histórico de
   obra apareceria com o nome de um grupo ambiental).
2. Grupos do plano ambiental que entraram como `PA-…` (adoção aditiva antiga)
   voltam ao código oficial.
3. Inativa as contas e os grupos antigos (nada é apagado).
4. Cria os grupos, subgrupos e contas do plano ambiental que faltam; conta
   ambiental que já existia (inclusive personalizada) fica como está.
5. Passa os papéis técnicos do acerto (juros, descontos) para 4.2.02/4.2.07.
6. Registra tudo na auditoria (`chart.converter`), com a lista do que mudou.

**Não faz:** apagar lançamento, mudar valor ou categoria, reclassificar
histórico (é a "Reclassificação", explícita, conta a conta, com prévia),
mexer na seleção de linhas de versões de Orçamento já salvas (os subgrupos
ambientais aparecem como "disponíveis" para acrescentar; versão sem seleção
salva já mostra as linhas ambientais), ligar chaves que mudam a DRE.

**Idempotente:** converter de novo não muda nada. **Reversível:** "Desfazer
conversão" volta códigos, reativa o anterior e remove só o que a conversão
criou — enquanto nenhuma conta criada por ela tiver lançamento, Orçamento ou
medição (senão recusa e diz quais). Depois disso, a reversão é o backup.

### Procedimento para a empresa em uso (produção)

1. **Backup** do banco (`pg_dump -Fc "$DATABASE_URL" > antes-plano.dump`).
2. **Diagnóstico** (só leitura): `psql "$DATABASE_URL" -f
   scripts/diagnostico-plano-contas.sql` — plano de cada empresa e uso das contas.
3. **Prévia**: na tela Plano de Contas, "Ver prévia detalhada"; ou no
   container: `node converter-plano.mjs --listar` e
   `node converter-plano.mjs --empresa <id>`.
4. **Aplicar** (owner/admin): botão "Converter para o plano ambiental"; ou
   `node converter-plano.mjs --empresa <id> --aplicar --confirmar <id>`.
5. **Conferir**: a tela mostra só o plano ambiental ativo; a seção "Plano
   anterior" lista as contas antigas com o uso e a sugestão de equivalente.
6. **Opcional**: reclassificar os lançamentos das contas antigas usadas;
   ligar as chaves de categoria na tela de Chaves, depois da prévia.
7. **Reverter**: "Desfazer conversão" (tela) ou
   `node converter-plano.mjs --empresa <id> --desfazer --confirmar <id>`;
   com contas novas já usadas, restaurar o backup (`pg_restore`).

Validado num banco isolado com uma empresa criada pelo plano de obra, com
despesas (inclusive em versão congelada), Orçamento, seleção de linhas,
medição e as contas do acerto: `src/lib/actions/planocontas-conversao.test.ts`
e verificação no navegador.

## 12. Permissões e auditoria

| Ação | Permissão |
|---|---|
| Ver plano, exportar | `planocontas` ver |
| Criar grupo/conta, importar (+ editar) | `planocontas` criar |
| Editar, mover, reordenar, inativar, mudar categoria/classe | `planocontas` editar |
| Excluir (sem uso) | `planocontas` excluir |
| Reclassificar lançamentos | `planocontasreclass` editar (sensível) |
| Converter o plano / desfazer a conversão | `planocontas` editar **e** `planocontasreclass` editar |

Auditoria: `chart.group.create/update/delete/duplicate`,
`chart.item.create/update/activate/deactivate/delete` (com de/para e impacto),
`chart.padrao.adotar`, `chart.importar`, `chart.exportar`,
`chart.reclassificar`, `chart.converter` (com tudo que mudou) e
`chart.converter.desfazer`. Toda leitura e escrita filtra a empresa da sessão.

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
- `src/lib/actions/planocontas-conversao.test.ts` — conversão de empresa
  existente (itens 11–17, 38–42): diagnóstico pela consulta da tela, prévia só
  de leitura, permissão, conversão com lançamentos em versão aberta e
  congelada, Orçamento, seleção e medição preservados, papéis do acerto,
  auditoria, idempotência, despesa nova na conta ambiental e recusa da
  antiga, desfazer (recusa com uso), plano anterior com "PA-", empresa já
  personalizada intacta, integrações (Orçamento, Previsão, DRE analítica e
  gerencial, Cris) e isolamento.
- `src/lib/tenant/provision-plano.test.ts` — empresa nova pelo caminho da
  plataforma: plano completo e hierárquico, sem obra, chaves ligadas, sem
  lançamento nem cadastro operacional, planos independentes.
- `src/lib/medicao-cef.test.ts` — Relatório CEF pelos grupos da empresa,
  grupo inativo com dado em linha própria.

### Planilha de lançamentos da versão

O modelo, a exportação e a importação da planilha (tela Projetos) usam o
plano DA EMPRESA: contas ativas de despesa, por grupo, com a coluna `Codigo`.
A importação casa pelo código; planilha antiga, sem a coluna, casa por grupo
+ nome e, por fim, pelo nome quando ele é único no plano. Linha com valor que
não casa com conta ativa **recusa a importação inteira** (antes era descartada
em silêncio). Com a chave `despesa_categoria_do_plano` ligada, a despesa
importada herda a categoria da conta; desligada, segue Custo Variável como
antes. A exportação deixa de levar despesas canceladas e mantém, numa linha
"Fora do plano ativo", a despesa de conta que saiu do plano.

### Plano de construção removido

O plano de contas de construção (grupos de obra, `PLANO_CONTAS` em
`constants.ts`) saiu do código. O Relatório CEF usava esse plano fixo; agora
usa os grupos de custo direto ATIVOS do plano da empresa; orçado ou medido em
grupo inativo (plano anterior arquivado) aparece em linha própria, com o nome
dele, e entra no total. As categorias padrão (só
para conta sem categoria gravada) vêm do plano ambiental e das regras do plano
ambiental anterior; as regras dos grupos de obra (`T`, `P`, `TR`) saíram.

## 14. Decisões que dependem de validação contábil

1. **Pessoal técnico como Custo Variável** (custo direto dos projetos). A
   proposta anterior usava Custo Fixo. Afeta a Margem de Contribuição.
2. **Tributos sobre o faturamento (ISS, PIS, COFINS, DAS) como Despesa
   Variável** na cascata e **Deduções** na visão gerencial; **IRPJ/CSLL** como
   Despesa Variável na cascata e tributos sobre o lucro na gerencial. O Simples
   (DAS) mistura os dois: a classe é decisão da empresa com o contador.
3. **Despesas indiretas e compartilhadas (3.6)** agora como despesa
   operacional (Despesa Fixa), seguindo a especificação; o gasto de execução
   compartilhado entre projetos fica em 2.7 (custo dos serviços). Alternativa:
   tratar parte de 3.6 como custo dos serviços.
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
9. **Encargos de pessoal (5.3 INSS/FGTS) como Despesa Fixa**, para quem não
   separa por função; quem separa usa 2.1.02 (custo dos serviços) e 3.2.02.
10. **Descontos financeiros obtidos em 4.2.07 (redutor)**, não em 4.1 como na
    especificação: o acerto de contas lança a diferença como despesa negativa;
    o resultado financeiro líquido é o mesmo. Mudar exige alterar o acerto.
11. **Contas transitórias, de controle, ajustes gerenciais, depreciação e
    amortização** não foram criadas: precisariam de uma categoria "fora da
    DRE" (o motor atual exige uma das 9 categorias de caixa).

## 15. Limitações e pendências

- Orçamento por **conta analítica** (hoje por subgrupo) e por contrato/fase.
- Receita realizada (contratos, contas a receber) ainda **não** é lançada por
  conta do plano: entra como "Receita de contratos e vendas (sem conta)".
- Sem contas patrimoniais, depreciação e amortização (o sistema não faz
  partidas dobradas).
- O módulo de Medição (aba Relatório CEF) já lista os grupos de custo direto
  do plano da empresa, mas os textos ainda falam em obra, engenheiro e
  liberação da Caixa (conceito de financiamento imobiliário).
- Seleção de linhas de versões de Orçamento salvas antes da conversão: os
  subgrupos ambientais precisam ser acrescentados na grade ("Incluir linha").
- Contas a receber e faturas ainda não têm conta do plano (receita entra como
  "Receita de contratos e vendas"): classificar receita por conta depende da
  decisão sobre reconhecimento de receita (seção 14).
- Código de conta usada não muda (seria preciso migrar as referências em
  despesas e Orçamento); o caminho é criar a conta nova e reclassificar.
- Empresa sem nenhuma conta cadastrada não tem a validação de conta no
  lançamento (não há plano a seguir).

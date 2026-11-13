# Growth Ambiental · Plano de Contas padrão (proposta para revisão)

Plano que toda conta nova recebe (`src/lib/calc/plano-ambiental.ts`), voltado a
**consultoria ambiental**. Substitui o plano CEF de construção no
provisionamento e no seed. Cada conta tem uma categoria da DRE **padrão** que o
cliente pode trocar no cadastro (Prompt DP); a coluna "DRE" abaixo é esse padrão.

## Custos diretos dos projetos — Custo Variável

Gasto que só existe porque o projeto existe. Gravado com `kind = "cef"`.

| Código | Conta |
|---|---|
| **1** | **Serviços técnicos de terceiros** |
| 1.1 | Consultores e especialistas terceirizados (PJ) |
| 1.2 | Análises laboratoriais (água, solo, ar, efluentes) |
| 1.3 | Levantamentos de campo (topografia, sondagem, geofísica) |
| 1.4 | Inventários de fauna e flora |
| 1.5 | Geoprocessamento, drone e aerolevantamento |
| 1.6 | Modelagem e estudos especializados (dispersão, hidrologia, ruído) |
| **2** | **Campo e logística** |
| 2.1 | Combustível, pedágio e estacionamento |
| 2.2 | Hospedagem e alimentação em campo |
| 2.3 | Locação de veículos e embarcações |
| 2.4 | Locação de equipamentos de campo |
| 2.5 | Materiais e insumos de coleta (frascos, reagentes, gelo) |
| 2.6 | Frete e envio de amostras |
| 2.7 | Passagens e deslocamentos |
| **3** | **Órgãos ambientais e responsabilidade técnica** |
| 3.1 | Taxas de licenciamento e de análise (órgão ambiental) |
| 3.2 | ART / AFT / responsabilidade técnica do projeto |
| 3.3 | Publicações legais (Diário Oficial, jornal) |
| 3.4 | Certidões, cartório e registros do projeto |
| 3.5 | Audiências e consultas públicas |
| **4** | **Produtos e entregáveis** |
| 4.1 | Impressão, plotagem e encadernação de estudos |
| 4.2 | Bases cartográficas e imagens de satélite |
| 4.3 | Software e licenças específicos do projeto |
| 4.4 | Tradução e revisão técnica |
| **5** | **Execução de programas ambientais** |
| 5.1 | Monitoramento ambiental (fauna, flora, qualidade) |
| 5.2 | Educação ambiental e comunicação social |
| 5.3 | Recuperação de áreas (mudas, insumos, plantio) |
| 5.4 | Gestão de resíduos do projeto |
| 5.5 | Subcontratação de execução de programas |

## Receitas, impostos e estrutura

| Código | Conta | DRE padrão |
|---|---|---|
| **R** | **Receitas de serviços** (natureza receita) | Receita |
| R.1 | Licenciamento ambiental | Receita |
| R.2 | Estudos ambientais (EIA/RIMA, RCA/PCA, RAS) | Receita |
| R.3 | Monitoramento e programas ambientais | Receita |
| R.4 | Gestão de condicionantes e compliance | Receita |
| R.5 | Consultoria, auditoria e due diligence | Receita |
| R.6 | Treinamentos e outros serviços | Receita |
| **IMP** | **Impostos sobre o faturamento** | Despesa Variável |
| IMP.1 | ISS | Despesa Variável |
| IMP.2 | PIS/COFINS | Despesa Variável |
| IMP.3 | Simples Nacional (DAS) | Despesa Variável |
| IMP.4 | IRPJ/CSLL | Despesa Variável |
| **C** | **Comercial / Propostas** | Despesa Variável |
| C.1 | Comissões e parcerias comerciais | Despesa Variável |
| C.2 | Elaboração de propostas e licitações | Despesa Variável |
| C.3 | Eventos, feiras e congressos | Despesa Variável |
| C.4 | CRM/plataforma comercial | Despesa Variável |
| **M** | **Marketing / Comunicação** | Despesa Variável |
| M.1 | Agência de marketing | Despesa Variável |
| M.2 | Mídia paga (Meta/Google/LinkedIn) | Despesa Variável |
| M.3 | Site e redes sociais | Despesa Variável |
| M.4 | Material institucional | Despesa Variável |
| **RH** | **Pessoas** | Custo Fixo |
| RH.1 | Folha de pagamento CLT | Custo Fixo |
| RH.2 | Pagamento RPA | Custo Fixo |
| RH.3 | Medicina e segurança do trabalho | Custo Fixo |
| RH.4 | EPI/uniformes de campo | **Custo Variável** |
| RH.5 | Seguro de vida | Custo Fixo |
| RH.6 | Benefícios (VR, VT, plano de saúde) | Custo Fixo |
| RH.7 | Estágio | Custo Fixo |
| RH.8 | Treinamento e capacitação técnica | Custo Fixo |
| **TI** | **Tecnologia** | Despesa Fixa |
| TI.1 | Software/SaaS | Despesa Fixa |
| TI.2 | Hospedagem/cloud | Despesa Fixa |
| TI.3 | Licenças GIS/CAD (ArcGIS, AutoCAD) | Despesa Fixa |
| TI.4 | TI/suporte | Despesa Fixa |
| TI.5 | Hardware/equipamentos | Despesa Fixa |
| **A** | **Administrativo / Escritório** | Despesa Fixa |
| A.1 | Aluguel escritório | Despesa Fixa |
| A.2 | Água/luz/internet | Despesa Fixa |
| A.3 | Telefonia | Despesa Fixa |
| A.4 | Material de escritório | Despesa Fixa |
| A.5 | Serviços de limpeza/segurança | Despesa Fixa |
| A.6 | Manutenção de equipamentos de campo próprios | Despesa Fixa |
| **J** | **Jurídico e registros da empresa** | Despesa Fixa |
| J.1 | Assessoria jurídica | Despesa Fixa |
| J.2 | Anuidades de conselhos (CREA, CRBio, CRQ) | Despesa Fixa |
| J.3 | Cadastros técnicos (CTF/IBAMA) e certificações | Despesa Fixa |
| J.4 | Alvará e taxas municipais da empresa | Despesa Fixa |
| **F** | **Financeiro / Contábil** (idêntico ao plano de construção) | Despesa Fixa |
| F.1 | Honorários contábeis | Despesa Fixa |
| F.2 | Tarifas bancárias | Despesas Financeiras |
| F.3 | Seguros (inclui RC profissional) | Despesa Fixa |
| F.4 | IOF/juros/multas | Despesas Financeiras |
| F.5 | Cartório/reconhecimento de firma | Despesa Fixa |
| F.6 | Despesas financeiras — juros e multas de mora | Despesas Financeiras |
| F.7 | Receitas financeiras — descontos obtidos | Despesas Financeiras |
| F.8 | Terceiros a restituir (passivo) | Despesa Fixa |
| F.9 | Valores a receber de terceiros (ativo) | Despesa Fixa |

## Decisões e pontos para o Thiago confirmar

1. **Equipe técnica própria como Custo Fixo (RH).** Consultor CLT recebe com
   ou sem projeto; por isso fica fora do custo variável. Se o cliente rateia
   horas por projeto e quer margem de contribuição por projeto já com a equipe,
   a alternativa é um grupo direto "Equipe técnica alocada".
2. **Impostos sobre o faturamento como Despesa Variável** (grupo IMP), no
   mesmo critério do IRPJ/CSLL do plano de construção (TR.3). O grupo TR de
   construção (INSS de obra, ITBI) saiu.
3. **Grupo R de receita por linha de serviço.** Permite orçar e ver a DRE por
   linha (licenciamento, estudos, monitoramento…). As telas de receita de
   hoje (Unidades, Contas a Receber) ainda não lançam por conta do plano.
   Ligar a receita do contrato a uma conta R é etapa seguinte.
4. **Grupo F intocado.** F.6–F.9 carregam regras contábeis (RG-03, RG-04,
   RG-07) e o de-para fixo de Despesas Financeiras.
5. **Códigos novos (R, IMP, J) não existem no plano de construção**, então o
   de-para por grupo acrescentado em `categoria-do-plano.ts` não muda a DRE de
   nenhum tenant que use o plano antigo.

## O que NÃO mudou nesta etapa

- Tenants já criados mantêm o plano que têm; o padrão vale para conta nova.
- Módulos de construção (Unidades, Simulador, Permuta, Liberações de Obra,
  Parâmetros/INCC, Medição CEF) seguem no menu, por decisão do dono, até a
  avaliação de cada um. A Medição CEF ainda usa os grupos de obra do plano
  antigo (`PLANO_CONTAS` em constants.ts).
- O seed de demonstração continua com o projeto da Cliente Piloto (construção); só o
  plano de contas dele passou a ser o ambiental.

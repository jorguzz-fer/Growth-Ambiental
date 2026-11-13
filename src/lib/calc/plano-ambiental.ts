import type { ChartGroup } from "./constants";

/**
 * Plano de Contas padrão da Growth Ambiental (consultoria ambiental).
 *
 * Mesma forma do plano de construção (`PLANO_CONTAS` em constants.ts) para
 * não mexer no schema: `obra` são os grupos de CUSTO DIRETO DOS PROJETOS
 * (gravados com `kind = "cef"`, que o sistema trata como custo variável) e
 * `complementar` é a estrutura da empresa. Proposta para revisão — ver
 * docs/AMBIENTAL-PLANO-CONTAS.md, que traz o de-para da DRE conta a conta.
 *
 * Regras de compatibilidade (não renumere sem ler):
 * - O grupo F é o MESMO do plano de construção: F.6–F.9 carregam regras
 *   contábeis (RG-03, RG-04, RG-07) e F.2/F.4/F.6/F.7 têm de-para fixo em
 *   Despesas Financeiras (categoria-do-plano.ts).
 * - RH.4 (EPI) continua custo variável, como no plano de construção.
 * - Grupos novos usam códigos que o plano de construção NÃO usa (R, J, IMP),
 *   para que o de-para por grupo não mude a DRE de quem já usa aquele plano.
 * - O grupo T (Técnicos/Projetos), C de imobiliária e P (Pós-obra) saem: o
 *   que era deles e vale para consultoria foi para os grupos 3 e 4.
 */
export const PLANO_CONTAS_AMBIENTAL: { obra: ChartGroup[]; complementar: ChartGroup[] } = {
  obra: [
    {
      id: "1",
      nome: "Serviços técnicos de terceiros",
      sub: [
        { id: "1.1", nome: "Consultores e especialistas terceirizados (PJ)" },
        { id: "1.2", nome: "Análises laboratoriais (água, solo, ar, efluentes)" },
        { id: "1.3", nome: "Levantamentos de campo (topografia, sondagem, geofísica)" },
        { id: "1.4", nome: "Inventários de fauna e flora" },
        { id: "1.5", nome: "Geoprocessamento, drone e aerolevantamento" },
        { id: "1.6", nome: "Modelagem e estudos especializados (dispersão, hidrologia, ruído)" },
      ],
    },
    {
      id: "2",
      nome: "Campo e logística",
      sub: [
        { id: "2.1", nome: "Combustível, pedágio e estacionamento" },
        { id: "2.2", nome: "Hospedagem e alimentação em campo" },
        { id: "2.3", nome: "Locação de veículos e embarcações" },
        { id: "2.4", nome: "Locação de equipamentos de campo" },
        { id: "2.5", nome: "Materiais e insumos de coleta (frascos, reagentes, gelo)" },
        { id: "2.6", nome: "Frete e envio de amostras" },
        { id: "2.7", nome: "Passagens e deslocamentos" },
      ],
    },
    {
      id: "3",
      nome: "Órgãos ambientais e responsabilidade técnica",
      sub: [
        { id: "3.1", nome: "Taxas de licenciamento e de análise (órgão ambiental)" },
        { id: "3.2", nome: "ART / AFT / responsabilidade técnica do projeto" },
        { id: "3.3", nome: "Publicações legais (Diário Oficial, jornal)" },
        { id: "3.4", nome: "Certidões, cartório e registros do projeto" },
        { id: "3.5", nome: "Audiências e consultas públicas" },
      ],
    },
    {
      id: "4",
      nome: "Produtos e entregáveis",
      sub: [
        { id: "4.1", nome: "Impressão, plotagem e encadernação de estudos" },
        { id: "4.2", nome: "Bases cartográficas e imagens de satélite" },
        { id: "4.3", nome: "Software e licenças específicos do projeto" },
        { id: "4.4", nome: "Tradução e revisão técnica" },
      ],
    },
    {
      id: "5",
      nome: "Execução de programas ambientais",
      sub: [
        { id: "5.1", nome: "Monitoramento ambiental (fauna, flora, qualidade)" },
        { id: "5.2", nome: "Educação ambiental e comunicação social" },
        { id: "5.3", nome: "Recuperação de áreas (mudas, insumos, plantio)" },
        { id: "5.4", nome: "Gestão de resíduos do projeto" },
        { id: "5.5", nome: "Subcontratação de execução de programas" },
      ],
    },
  ],
  complementar: [
    {
      id: "R",
      nome: "Receitas de serviços",
      natureza: "receita",
      sub: [
        { id: "R.1", nome: "Licenciamento ambiental" },
        { id: "R.2", nome: "Estudos ambientais (EIA/RIMA, RCA/PCA, RAS)" },
        { id: "R.3", nome: "Monitoramento e programas ambientais" },
        { id: "R.4", nome: "Gestão de condicionantes e compliance" },
        { id: "R.5", nome: "Consultoria, auditoria e due diligence" },
        { id: "R.6", nome: "Treinamentos e outros serviços" },
      ],
    },
    {
      id: "IMP",
      nome: "Impostos sobre o faturamento",
      sub: [
        { id: "IMP.1", nome: "ISS" },
        { id: "IMP.2", nome: "PIS/COFINS" },
        { id: "IMP.3", nome: "Simples Nacional (DAS)" },
        { id: "IMP.4", nome: "IRPJ/CSLL" },
      ],
    },
    {
      id: "C",
      nome: "Comercial / Propostas",
      sub: [
        { id: "C.1", nome: "Comissões e parcerias comerciais" },
        { id: "C.2", nome: "Elaboração de propostas e licitações" },
        { id: "C.3", nome: "Eventos, feiras e congressos" },
        { id: "C.4", nome: "CRM/plataforma comercial" },
      ],
    },
    {
      id: "M",
      nome: "Marketing / Comunicação",
      sub: [
        { id: "M.1", nome: "Agência de marketing" },
        { id: "M.2", nome: "Mídia paga (Meta/Google/LinkedIn)" },
        { id: "M.3", nome: "Site e redes sociais" },
        { id: "M.4", nome: "Material institucional" },
      ],
    },
    {
      id: "RH",
      nome: "Pessoas",
      sub: [
        { id: "RH.1", nome: "Folha de pagamento CLT" },
        { id: "RH.2", nome: "Pagamento RPA" },
        { id: "RH.3", nome: "Medicina e segurança do trabalho" },
        { id: "RH.4", nome: "EPI/uniformes de campo" },
        { id: "RH.5", nome: "Seguro de vida" },
        { id: "RH.6", nome: "Benefícios (VR, VT, plano de saúde)" },
        { id: "RH.7", nome: "Estágio" },
        { id: "RH.8", nome: "Treinamento e capacitação técnica" },
      ],
    },
    {
      id: "TI",
      nome: "Tecnologia",
      sub: [
        { id: "TI.1", nome: "Software/SaaS" },
        { id: "TI.2", nome: "Hospedagem/cloud" },
        { id: "TI.3", nome: "Licenças GIS/CAD (ArcGIS, AutoCAD)" },
        { id: "TI.4", nome: "TI/suporte" },
        { id: "TI.5", nome: "Hardware/equipamentos" },
      ],
    },
    {
      id: "A",
      nome: "Administrativo / Escritório",
      sub: [
        { id: "A.1", nome: "Aluguel escritório" },
        { id: "A.2", nome: "Água/luz/internet" },
        { id: "A.3", nome: "Telefonia" },
        { id: "A.4", nome: "Material de escritório" },
        { id: "A.5", nome: "Serviços de limpeza/segurança" },
        { id: "A.6", nome: "Manutenção de equipamentos de campo próprios" },
      ],
    },
    {
      id: "J",
      nome: "Jurídico e registros da empresa",
      sub: [
        { id: "J.1", nome: "Assessoria jurídica" },
        { id: "J.2", nome: "Anuidades de conselhos (CREA, CRBio, CRQ)" },
        { id: "J.3", nome: "Cadastros técnicos (CTF/IBAMA) e certificações" },
        { id: "J.4", nome: "Alvará e taxas municipais da empresa" },
      ],
    },
    {
      id: "F",
      nome: "Financeiro / Contábil",
      sub: [
        { id: "F.1", nome: "Honorários contábeis" },
        { id: "F.2", nome: "Tarifas bancárias" },
        { id: "F.3", nome: "Seguros (inclui RC profissional)" },
        { id: "F.4", nome: "IOF/juros/multas" },
        { id: "F.5", nome: "Cartório/reconhecimento de firma" },
        { id: "F.6", nome: "Despesas financeiras — juros e multas de mora" },
        { id: "F.7", nome: "Receitas financeiras — descontos obtidos" },
        { id: "F.8", nome: "Terceiros a restituir (passivo)" },
        { id: "F.9", nome: "Valores a receber de terceiros (ativo)" },
      ],
    },
  ],
};

/** O plano que conta nova (provisionamento e seed) recebe. */
export const PLANO_CONTAS_PADRAO = PLANO_CONTAS_AMBIENTAL;

/** Linhas de `chart_account` do plano, para um tenant. */
export function linhasDoPlano(
  plano: { obra: ChartGroup[]; complementar: ChartGroup[] },
  tenantId: string,
) {
  const linhas = (grupos: ChartGroup[], kind: "cef" | "complementar") =>
    grupos.flatMap((g) =>
      g.sub.map((s) => ({
        tenantId,
        code: s.id,
        name: s.nome,
        groupCode: g.id,
        groupName: g.nome,
        kind,
        natureza: g.natureza ?? "despesa",
      })),
    );
  return [...linhas(plano.obra, "cef"), ...linhas(plano.complementar, "complementar")];
}

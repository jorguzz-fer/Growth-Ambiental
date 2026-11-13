import type { CategoriaDRE, ChartGroup } from "./constants";
import type { ClasseGerencial, PapelDaConta, TipoCusto } from "@/lib/planocontas-regras";

/**
 * Plano de Contas padrão do Growth Ambiental — consultorias ambientais,
 * arqueologia, patrimônio cultural e serviços técnicos especializados.
 * Ver docs/PLANO_CONTAS_AMBIENTAL.md (tabela completa e decisões).
 *
 * Estrutura: GRUPO (nível 1) → SUBGRUPO (nível 2) → CONTA analítica. Só a
 * conta recebe lançamento. O Orçamento/Previsão planeja por subgrupo (o
 * `group_code` da conta), como sempre.
 *
 * Regras de desenho:
 * - Cada conta traz natureza, categoria da DRE, classe gerencial e custo
 *   direto/indireto PADRÃO gravados — nada depende do prefixo do código.
 * - Cada subgrupo é homogêneo em natureza e categoria da DRE, porque o
 *   Orçamento planeja uma linha por subgrupo com UMA categoria.
 * - Especialidade técnica (arqueologia, fauna, flora…), projeto, contrato,
 *   fase e atividade NÃO viram contas: são dimensões do lançamento.
 * - Sem contas patrimoniais nem depreciação: o sistema é um plano gerencial
 *   de receitas e despesas, não faz partidas dobradas (ver pendências).
 * - É ponto de partida: a empresa renomeia, desativa, cria e reorganiza.
 *   Mudar este arquivo NÃO altera empresas já criadas.
 */
export const VERSAO_PLANO_PADRAO = "ambiental-2026.11";

export interface ContaPadrao {
  code: string;
  nome: string;
  descricao?: string;
  papel?: PapelDaConta;
  /** sobrepõe o padrão do subgrupo (raro: ver regra de homogeneidade). */
  classe?: ClasseGerencial;
  tipoCusto?: TipoCusto | null;
}
export interface SubgrupoPadrao {
  code: string;
  nome: string;
  descricao?: string;
  natureza: "receita" | "despesa";
  categoria: CategoriaDRE;
  classe: ClasseGerencial;
  tipoCusto: TipoCusto | null;
  contas: ContaPadrao[];
}
export interface GrupoPadrao {
  code: string;
  nome: string;
  descricao?: string;
  /** "cef" = custos diretos dos projetos (bloco de custo do Orçamento e da Medição). */
  kind: "cef" | "complementar";
  subgrupos: SubgrupoPadrao[];
}

type Atributos = Omit<SubgrupoPadrao, "code" | "nome" | "contas" | "descricao">;
const RECEITA: Atributos = { natureza: "receita", categoria: "Receita", classe: "receita_bruta", tipoCusto: null };
const DIRETO: Atributos = { natureza: "despesa", categoria: "Custo Variável", classe: "custo_servico", tipoCusto: "direto" };
const ADM: Atributos = { natureza: "despesa", categoria: "Despesa Fixa", classe: "despesa_operacional", tipoCusto: "indireto" };

/** Monta as contas de um subgrupo: "2.3" + ["Passagens", …] → 2.3.01, 2.3.02… */
function contas(sub: string, nomes: (string | [string, Partial<ContaPadrao>])[]): ContaPadrao[] {
  return nomes.map((n, i) => {
    const [nome, extra] = typeof n === "string" ? [n, {}] : n;
    return { code: `${sub}.${String(i + 1).padStart(2, "0")}`, nome, ...extra };
  });
}
const sub = (code: string, nome: string, a: Atributos, lista: (string | [string, Partial<ContaPadrao>])[], descricao?: string): SubgrupoPadrao => ({ code, nome, descricao, ...a, contas: contas(code, lista) });

export const PLANO_AMBIENTAL: GrupoPadrao[] = [
  {
    code: "1",
    nome: "Receitas operacionais",
    kind: "complementar",
    descricao: "Receitas da prestação de serviços e suas deduções. A especialidade (arqueologia, fauna, flora…) é dimensão do projeto/contrato, não conta.",
    subgrupos: [
      sub("1.1", "Prestação de serviços", RECEITA, [
        "Receita de consultoria técnica",
        "Receita de estudos e diagnósticos",
        "Receita de monitoramento",
        "Receita de serviços técnicos especializados",
        "Receita de gerenciamento de programas ambientais",
        "Outras receitas de serviços",
      ]),
      sub("1.2", "Outras receitas operacionais", RECEITA, [
        "Outras receitas operacionais",
        ["Recuperações e ressarcimentos reconhecidos como receita", { descricao: "Só quando a política contábil reconhecer como receita. Reembolso de despesa cobrado do cliente NÃO entra aqui: a despesa mantém a conta original (Contratos → Reembolsos)." }],
      ]),
      sub(
        "1.3",
        "Deduções da receita",
        { natureza: "despesa", categoria: "Despesa Variável", classe: "deducao", tipoCusto: null },
        ["Descontos comerciais concedidos", "Cancelamentos e abatimentos"],
        "Redutores da receita bruta. Os tributos sobre o faturamento ficam no grupo 5 (também deduções na DRE gerencial).",
      ),
    ],
  },
  {
    code: "2",
    nome: "Custos diretos dos projetos",
    kind: "cef",
    descricao: "Gasto que existe por causa do projeto. O padrão é custo direto; o lançamento pode tratar diferente.",
    subgrupos: [
      sub("2.1", "Pessoal técnico", DIRETO, [
        "Salários de profissionais técnicos",
        ["Encargos sociais sobre a folha técnica", { descricao: "INSS patronal, FGTS, RAT e terceiros da equipe técnica." }],
        "Benefícios de profissionais alocados",
        ["Diárias de campo", { descricao: "Verba paga ao profissional pelo trabalho em campo. Diária de deslocamento (custeio de viagem) fica em 2.3." }],
        "Horas extras",
        "Adicionais (campo, periculosidade, insalubridade)",
        "Outros custos de pessoal técnico",
      ]),
      sub("2.2", "Serviços técnicos terceirizados", DIRETO, [
        "Consultores especializados",
        "Arqueólogos terceirizados",
        "Biólogos e profissionais ambientais",
        "Serviços laboratoriais",
        "Serviços de topografia",
        "Geoprocessamento terceirizado",
        "Análises técnicas especializadas",
        "Serviços de campo contratados",
        "Outros serviços técnicos",
      ]),
      sub("2.3", "Mobilização e logística", DIRETO, [
        "Transporte de equipes",
        "Passagens",
        "Hospedagens",
        "Alimentação em campo",
        ["Diárias de deslocamento", { descricao: "Custeio de viagem (ajuda de custo). A diária paga como verba ao profissional fica em 2.1." }],
        "Combustíveis",
        "Pedágios",
        "Locação de veículos",
        "Fretes",
        "Transporte de equipamentos",
        "Desmobilização",
      ]),
      sub("2.4", "Equipamentos e materiais", DIRETO, [
        "Locação de equipamentos",
        "Manutenção de equipamentos",
        "Materiais de campo",
        "Materiais técnicos",
        "Insumos de coleta e análise",
        "Ferramentas e acessórios",
        ["Equipamentos de proteção individual (EPI)", { descricao: "EPI fica aqui (não em 2.5) para não duplicar." }],
        "Outros materiais de execução",
      ]),
      sub("2.5", "Saúde e segurança ocupacional", DIRETO, [
        "Exames ocupacionais",
        "ASO e demais documentos médicos ocupacionais",
        "Treinamentos obrigatórios",
        "Serviços especializados de segurança",
        ["Equipamentos e materiais de segurança coletiva", { descricao: "Sinalização, kits de primeiros socorros, proteção coletiva. EPI fica em 2.4." }],
        "Outros custos de saúde e segurança",
      ]),
      sub("2.6", "Taxas e despesas técnicas", DIRETO, [
        "Taxas de protocolos e requerimentos",
        "Taxas de órgãos ambientais",
        "Taxas relacionadas ao patrimônio cultural",
        ["Registros e responsabilidades técnicas", { descricao: "ART, RRT, AFT e equivalentes do projeto." }],
        "Despesas com autorizações",
        "Emolumentos e serviços administrativos da execução",
        "Publicações legais (diário oficial e jornais)",
        "Outras taxas diretamente relacionadas aos projetos",
      ]),
      sub("2.7", "Outros custos de execução", DIRETO, [
        "Infraestrutura temporária de campo",
        "Comunicações operacionais",
        "Materiais de apoio",
        "Serviços operacionais complementares",
        "Impressão e reprodução de estudos e relatórios",
        "Bases cartográficas e imagens",
        "Insumos de programas ambientais (mudas, materiais educativos)",
        "Outros custos diretos",
      ]),
    ],
  },
  {
    code: "3",
    nome: "Despesas administrativas e indiretas",
    kind: "complementar",
    descricao: "Estrutura da empresa e custos compartilhados entre projetos (rateáveis).",
    subgrupos: [
      sub("3.1", "Administração e infraestrutura", ADM, [
        "Aluguel",
        "Condomínio",
        "Energia elétrica",
        "Água",
        "Telefonia",
        "Internet",
        "Material de escritório",
        "Limpeza e conservação",
        "Manutenção predial",
        "Serviços administrativos",
      ]),
      sub("3.2", "Recursos humanos e departamento pessoal", ADM, [
        "Salários administrativos",
        ["Encargos sobre a folha administrativa", { descricao: "INSS patronal, FGTS, RAT e terceiros da equipe administrativa." }],
        "Benefícios",
        "Recrutamento e seleção",
        "Treinamentos internos",
        "Serviços de departamento pessoal",
        "Medicina ocupacional administrativa",
        "Outros gastos de pessoal",
      ]),
      sub("3.3", "Tecnologia", ADM, [
        "Licenças de software",
        "Sistemas SaaS",
        "Armazenamento em nuvem",
        "Infraestrutura de TI",
        ["Equipamentos de informática de pequeno valor", { descricao: "Compra que vira imobilizado vai em 6.3 (investimento)." }],
        "Manutenção e suporte",
        "Serviços de tecnologia",
        "Assinaturas digitais e certificados",
      ]),
      sub("3.4", "Serviços profissionais", ADM, [
        "Contabilidade",
        "Assessoria jurídica",
        "Auditoria",
        "Consultoria administrativa",
        "Serviços financeiros terceirizados",
        "Outros serviços profissionais",
      ]),
      sub("3.5", "Comercial e marketing", { ...ADM, categoria: "Despesa Variável" }, [
        "Publicidade",
        "Marketing digital",
        "Desenvolvimento comercial",
        "Participação em eventos",
        "Materiais promocionais",
        "Despesas de prospecção e propostas",
        "Comissões comerciais",
      ]),
      sub(
        "3.6",
        "Despesas indiretas de projetos",
        { natureza: "despesa", categoria: "Custo Fixo", classe: "custo_servico", tipoCusto: "indireto" },
        [
          "Coordenação técnica compartilhada",
          "Supervisão geral",
          "Estrutura operacional compartilhada",
          "Equipamentos compartilhados",
          "Logística compartilhada",
          "Outros custos indiretos atribuíveis a projetos",
        ],
        "Estrutura que serve a vários projetos. Padrão: custo dos serviços (indireto, rateável). A empresa pode tratar como despesa administrativa — decisão de política contábil.",
      ),
      sub("3.7", "Registros, conselhos e seguros da empresa", ADM, [
        "Anuidades de conselhos profissionais",
        ["Cadastros técnicos e certificações da empresa", { descricao: "CTF/IBAMA, certificações e cadastros em órgãos." }],
        ["Seguros", { descricao: "Inclui responsabilidade civil profissional." }],
        "Cartório e registros da empresa",
      ]),
    ],
  },
  {
    code: "4",
    nome: "Resultado financeiro",
    kind: "complementar",
    subgrupos: [
      sub(
        "4.1",
        "Receitas financeiras",
        { natureza: "receita", categoria: "Receita", classe: "resultado_financeiro", tipoCusto: null },
        ["Rendimentos de aplicações", "Juros ativos", "Outras receitas financeiras"],
        "Na cascata atual, receita de natureza receita entra na linha Receita (limitação do motor); na DRE gerencial, entra no Resultado financeiro.",
      ),
      sub("4.2", "Despesas financeiras", { natureza: "despesa", categoria: "Despesas Financeiras", classe: "resultado_financeiro", tipoCusto: null }, [
        "Tarifas bancárias",
        ["Juros e multas de mora", { papel: "juros_mora", descricao: "Usada pelo acerto de contas para a diferença a maior." }],
        "Multas financeiras",
        "Encargos de financiamento",
        "IOF",
        "Outras despesas financeiras",
        ["Descontos financeiros obtidos (redutor)", { papel: "descontos_obtidos", descricao: "Receita financeira lançada como valor negativo nesta linha (mesma convenção do acerto de contas)." }],
      ]),
    ],
  },
  {
    code: "5",
    nome: "Tributos e obrigações",
    kind: "complementar",
    descricao: "Separa tributos sobre o faturamento, sobre o resultado e da empresa. Encargos de pessoal ficam em 2.1 e 3.2. Nenhuma conta gera apuração ou lançamento automático.",
    subgrupos: [
      sub("5.1", "Tributos sobre o faturamento", { natureza: "despesa", categoria: "Despesa Variável", classe: "deducao", tipoCusto: null }, [
        "ISS",
        "PIS",
        "COFINS",
        ["Simples Nacional (DAS)", { descricao: "Para optantes. O DAS reúne tributos sobre faturamento e resultado: a empresa decide a classe com o contador." }],
        "Outros tributos sobre o faturamento",
      ]),
      sub("5.2", "Tributos sobre o resultado", { natureza: "despesa", categoria: "Despesa Variável", classe: "tributo_lucro", tipoCusto: null }, ["IRPJ", "CSLL"]),
      sub("5.3", "Tributos e taxas da empresa", ADM, ["IPTU", "IPVA", "Alvarás e taxas municipais", "Outros tributos e encargos"]),
    ],
  },
  {
    code: "6",
    nome: "Outras contas e classificações",
    kind: "complementar",
    descricao: "Fora da operação: não operacional, investimentos, empréstimos e retiradas. O sistema não tem contas patrimoniais nem depreciação.",
    subgrupos: [
      sub("6.1", "Outras receitas não operacionais", { natureza: "receita", categoria: "Receita", classe: "outros_resultados", tipoCusto: null }, ["Ganho na venda de bens", "Outras receitas não operacionais"]),
      sub("6.2", "Outras despesas não operacionais", { natureza: "despesa", categoria: "Despesa Fixa", classe: "outros_resultados", tipoCusto: null }, ["Perdas e baixas", "Outras despesas não operacionais"]),
      sub("6.3", "Investimentos", { natureza: "despesa", categoria: "Investimento", classe: "fora_do_resultado", tipoCusto: null }, [
        "Equipamentos técnicos e de campo",
        "Veículos",
        "Equipamentos de informática",
        "Benfeitorias e instalações",
        "Outros investimentos",
      ]),
      sub("6.4", "Empréstimos e financiamentos", { natureza: "despesa", categoria: "Empréstimos", classe: "fora_do_resultado", tipoCusto: null }, [
        "Amortização de empréstimos e financiamentos",
        "Parcelamentos (principal)",
      ]),
      sub("6.5", "Retiradas dos sócios", { natureza: "despesa", categoria: "Retiradas", classe: "fora_do_resultado", tipoCusto: null }, [
        ["Pró-labore", { classe: "despesa_operacional", descricao: "Remuneração dos administradores: despesa operacional na DRE gerencial; Retiradas na cascata." }],
        "Distribuição de lucros",
      ]),
    ],
  },
];

/** Linhas de `chart_group` (grupos e subgrupos) do plano, na ordem. `parentCode` liga ao pai. */
export function gruposDoPlano(tenantId: string, plano: readonly GrupoPadrao[] = PLANO_AMBIENTAL) {
  return plano.flatMap((g, i) => [
    { tenantId, code: g.code, name: g.nome, descricao: g.descricao ?? null, kind: g.kind, parentCode: null as string | null, ordem: i + 1 },
    ...g.subgrupos.map((s, j) => ({ tenantId, code: s.code, name: s.nome, descricao: s.descricao ?? null, kind: g.kind, parentCode: g.code as string | null, ordem: j + 1 })),
  ]);
}

/** Linhas de `chart_account` do plano, para um tenant (atributos explícitos, nada por prefixo). */
export function linhasDoPlano(tenantId: string, plano: readonly GrupoPadrao[] = PLANO_AMBIENTAL) {
  return plano.flatMap((g) =>
    g.subgrupos.flatMap((s) =>
      s.contas.map((c, k) => ({
        tenantId,
        code: c.code,
        name: c.nome,
        descricao: c.descricao ?? null,
        groupCode: s.code,
        groupName: s.nome,
        kind: g.kind,
        natureza: s.natureza,
        dreCategory: s.categoria,
        classeGerencial: c.classe ?? s.classe,
        tipoCusto: c.tipoCusto === undefined ? s.tipoCusto : c.tipoCusto,
        papel: c.papel ?? null,
        ordem: k + 1,
      })),
    ),
  );
}

/**
 * O plano no formato antigo (grupos de custo direto × complementares), para
 * quem ainda lê assim — o modelo de planilha de lançamentos, por exemplo.
 * Os "grupos" aqui são os SUBGRUPOS (a chave do Orçamento).
 */
export const PLANO_CONTAS_PADRAO: { obra: ChartGroup[]; complementar: ChartGroup[] } = {
  obra: PLANO_AMBIENTAL.filter((g) => g.kind === "cef").flatMap((g) => g.subgrupos.map((s) => ({ id: s.code, nome: s.nome, natureza: s.natureza, sub: s.contas.map((c) => ({ id: c.code, nome: c.nome })) }))),
  complementar: PLANO_AMBIENTAL.filter((g) => g.kind !== "cef").flatMap((g) => g.subgrupos.map((s) => ({ id: s.code, nome: s.nome, natureza: s.natureza, sub: s.contas.map((c) => ({ id: c.code, nome: c.nome })) }))),
};
/** Compatibilidade: nome antigo. */
export const PLANO_CONTAS_AMBIENTAL = PLANO_CONTAS_PADRAO;

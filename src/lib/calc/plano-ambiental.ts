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
export const VERSAO_PLANO_PADRAO = "ambiental-2026.11b";

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
      sub("1.1", "Receita de prestação de serviços", RECEITA, [
        "Receita de consultoria técnica",
        "Receita de estudos e diagnósticos ambientais",
        "Receita de monitoramento ambiental",
        "Receita de serviços técnicos especializados",
        "Receita de gestão de programas ambientais",
        "Receita de projetos e estudos complementares",
        "Outras receitas de prestação de serviços",
      ], "A empresa pode consolidar ou detalhar. Não é preciso uma conta de receita por especialidade."),
      sub("1.2", "Outras receitas operacionais", RECEITA, [
        "Outras receitas operacionais",
        ["Recuperações de despesas classificadas como receita", { descricao: "Só quando a política contábil reconhecer como receita. Reembolso de despesa cobrado do cliente NÃO entra aqui: a despesa mantém a conta original (Contratos → Reembolsos)." }],
        "Outras receitas relacionadas à atividade empresarial",
      ]),
      sub(
        "1.3",
        "Deduções da receita",
        { natureza: "despesa", categoria: "Despesa Variável", classe: "deducao", tipoCusto: null },
        ["Abatimentos concedidos", "Descontos comerciais", "Cancelamentos de faturamento"],
        "Redutores da receita bruta. Os impostos incidentes sobre o faturamento ficam em 5.1 (uma conta só, sem duplicar) e também aparecem como Deduções na DRE gerencial.",
      ),
    ],
  },
  {
    code: "2",
    nome: "Custos diretos dos serviços",
    kind: "cef",
    descricao: "Gasto que existe por causa do projeto. O padrão é custo direto; o lançamento pode tratar diferente (ex.: combustível da sede).",
    subgrupos: [
      sub("2.1", "Pessoal técnico", DIRETO, [
        "Salários de profissionais técnicos",
        ["Encargos sociais de pessoal técnico", { descricao: "INSS patronal, FGTS, RAT e terceiros da equipe técnica, quando a empresa separa os encargos por função (não lance a mesma guia em 5.3)." }],
        "Benefícios de equipes técnicas",
        "Horas extras",
        ["Adicionais aplicáveis", { descricao: "Campo, periculosidade, insalubridade e outros adicionais." }],
        ["Diárias de campo", { descricao: "Verba paga ao profissional pelo trabalho em campo. Hospedagem, alimentação e passagens da viagem ficam em 2.3." }],
        "Outros custos diretos de pessoal",
      ]),
      sub("2.2", "Serviços técnicos terceirizados", DIRETO, [
        "Consultores especializados",
        "Serviços de arqueologia",
        "Serviços de biologia e meio ambiente",
        "Serviços de topografia",
        "Serviços de geoprocessamento",
        "Serviços laboratoriais",
        "Análises técnicas especializadas",
        "Serviços operacionais de campo",
        "Outros serviços técnicos terceirizados",
      ], "Personalizável por empresa: renomeie, consolide ou detalhe conforme os serviços que contrata."),
      sub("2.3", "Mobilização e logística", DIRETO, [
        "Transporte de equipes",
        "Passagens aéreas",
        "Passagens terrestres",
        "Hospedagens",
        "Alimentação em campo",
        "Combustíveis",
        "Pedágios",
        "Locação de veículos",
        "Fretes",
        "Transporte de equipamentos",
        "Mobilização operacional",
        "Desmobilização operacional",
      ]),
      sub("2.4", "Equipamentos e materiais", DIRETO, [
        "Locação de equipamentos técnicos",
        "Manutenção de equipamentos",
        "Materiais de campo",
        "Materiais de coleta e análise",
        "Ferramentas",
        "Insumos técnicos",
        ["Equipamentos de proteção individual (EPI)", { descricao: "EPI fica aqui (não em 2.5) para não duplicar." }],
        ["Materiais de segurança", { descricao: "Sinalização, kits de primeiros socorros, proteção coletiva." }],
        "Outros materiais utilizados na execução",
      ]),
      sub("2.5", "Saúde e segurança ocupacional", DIRETO, [
        "Exames médicos ocupacionais",
        "ASO",
        "Treinamentos de segurança",
        "Serviços especializados de segurança ocupacional",
        "Programas de saúde e segurança",
        "Outros custos de saúde e segurança",
      ], "Exames, programas e serviços. EPI e materiais de segurança ficam em 2.4; salários e encargos, em 2.1."),
      sub("2.6", "Taxas e despesas técnicas", DIRETO, [
        "Taxas de órgãos ambientais",
        "Taxas de protocolos",
        "Taxas relacionadas ao patrimônio cultural",
        "Registros profissionais",
        ["Emissão de documentos de responsabilidade técnica", { descricao: "ART, RRT, AFT e equivalentes do projeto." }],
        "Despesas com autorizações",
        "Emolumentos",
        "Publicações legais (diário oficial e jornais)",
        "Outras taxas diretamente vinculadas aos serviços",
      ]),
      sub("2.7", "Infraestrutura operacional de projetos", DIRETO, [
        "Instalações temporárias",
        "Estruturas de apoio de campo",
        "Comunicação operacional",
        "Serviços de apoio",
        ["Infraestrutura compartilhada de execução", { descricao: "Estrutura de execução usada por mais de um projeto, apropriada por rateio. A infraestrutura administrativa compartilhada fica em 3.6." }],
        "Outros custos operacionais",
      ]),
      sub("2.8", "Outros custos diretos", DIRETO, [
        "Impressão e reprodução de estudos e relatórios",
        "Bases cartográficas e imagens",
        "Insumos de programas ambientais (mudas, materiais educativos)",
        "Outros custos identificáveis diretamente com os serviços",
      ]),
    ],
  },
  {
    code: "3",
    nome: "Despesas operacionais e administrativas",
    kind: "complementar",
    descricao: "Estrutura da empresa e gastos compartilhados (rateáveis entre projetos quando a empresa quiser).",
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
        "Despesas administrativas diversas",
      ]),
      sub("3.2", "Recursos humanos e departamento pessoal", ADM, [
        "Salários administrativos",
        ["Encargos sociais administrativos", { descricao: "INSS patronal, FGTS, RAT e terceiros da equipe administrativa, quando a empresa separa os encargos por função (não lance a mesma guia em 5.3)." }],
        "Benefícios",
        "Recrutamento e seleção",
        "Treinamentos internos",
        "Serviços de departamento pessoal",
        "Medicina ocupacional administrativa",
        "Outras despesas de pessoal",
      ]),
      sub("3.3", "Tecnologia da informação", ADM, [
        "Licenças de software",
        "Sistemas SaaS",
        "Armazenamento em nuvem",
        "Infraestrutura de TI",
        ["Equipamentos de informática", { descricao: "Itens de pequeno valor. Compra que vira imobilizado vai em 6.3 (investimento)." }],
        "Suporte técnico",
        "Manutenção de sistemas",
        "Assinaturas digitais",
        "Outros serviços de tecnologia",
      ]),
      sub("3.4", "Serviços profissionais", ADM, [
        "Contabilidade",
        "Assessoria jurídica",
        "Consultoria administrativa",
        "Auditoria",
        "Serviços de gestão financeira",
        "Serviços profissionais diversos",
      ]),
      sub("3.5", "Comercial e marketing", { ...ADM, categoria: "Despesa Variável" }, [
        "Publicidade",
        "Marketing digital",
        "Eventos comerciais",
        ["Prospecção de clientes", { descricao: "Inclui elaboração de propostas e documentação de licitações." }],
        "Materiais promocionais",
        "Comissões comerciais",
        "Outras despesas comerciais",
      ]),
      sub(
        "3.6",
        "Despesas indiretas e compartilhadas",
        ADM,
        ["Coordenação administrativa", "Supervisão geral", "Infraestrutura compartilhada", "Equipamentos compartilhados", "Logística administrativa", "Outros gastos indiretos"],
        "Estrutura que serve à empresa e a vários projetos (despesa operacional, rateável). Gasto de execução compartilhado entre projetos vai em 2.7.",
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
        ["Rendimentos de aplicações financeiras", "Juros ativos", "Outras receitas financeiras"],
        "Na DRE gerencial, entram no Resultado financeiro. Descontos financeiros obtidos ficam em 4.2.07 como redutor (convenção do acerto de contas).",
      ),
      sub("4.2", "Despesas financeiras", { natureza: "despesa", categoria: "Despesas Financeiras", classe: "resultado_financeiro", tipoCusto: null }, [
        "Tarifas bancárias",
        ["Juros passivos", { papel: "juros_mora", descricao: "Inclui juros de mora. Usada pelo acerto de contas para a diferença a maior." }],
        "Multas financeiras",
        "Encargos de financiamentos",
        "IOF",
        "Outras despesas financeiras",
        ["Descontos financeiros obtidos (redutor)", { papel: "descontos_obtidos", descricao: "Receita financeira lançada como valor negativo nesta linha (mesma convenção do acerto de contas): o resultado financeiro líquido fica certo." }],
      ]),
    ],
  },
  {
    code: "5",
    nome: "Tributos e encargos",
    kind: "complementar",
    descricao: "Separa tributos sobre o faturamento, sobre o lucro e encargos de pessoal. Nenhuma conta gera apuração ou lançamento automático.",
    subgrupos: [
      sub("5.1", "Tributos sobre o faturamento", { natureza: "despesa", categoria: "Despesa Variável", classe: "deducao", tipoCusto: null }, [
        "ISS",
        "PIS",
        "COFINS",
        ["Simples Nacional (DAS)", { descricao: "Para optantes. O DAS reúne tributos sobre faturamento e lucro: a empresa decide a classe com o contador." }],
        "Outros tributos sobre o faturamento",
      ]),
      sub("5.2", "Tributos sobre o lucro", { natureza: "despesa", categoria: "Despesa Variável", classe: "tributo_lucro", tipoCusto: null }, ["IRPJ", "CSLL"]),
      sub(
        "5.3",
        "Encargos de pessoal",
        ADM,
        ["INSS", "FGTS", "Outros encargos de pessoal"],
        "Guias de INSS e FGTS quando a empresa NÃO separa os encargos por função. Quem separa usa 2.1.02 (técnico) e 3.2.02 (administrativo): a mesma guia nunca vai nos dois lugares.",
      ),
      sub("5.4", "Outros tributos e taxas da empresa", ADM, ["IPTU", "IPVA", "Alvarás e taxas municipais", "Outros tributos"]),
    ],
  },
  {
    code: "6",
    nome: "Outras classificações",
    kind: "complementar",
    descricao: "Fora da operação: outras receitas e despesas, imobilizado, empréstimos e retiradas. O sistema é gerencial: não tem contas patrimoniais, depreciação nem contas transitórias.",
    subgrupos: [
      sub("6.1", "Outras receitas", { natureza: "receita", categoria: "Receita", classe: "outros_resultados", tipoCusto: null }, ["Ganho na venda de bens", "Outras receitas não operacionais"]),
      sub("6.2", "Outras despesas", { natureza: "despesa", categoria: "Despesa Fixa", classe: "outros_resultados", tipoCusto: null }, ["Perdas e baixas", "Outras despesas não operacionais"]),
      sub("6.3", "Imobilizado (investimentos)", { natureza: "despesa", categoria: "Investimento", classe: "fora_do_resultado", tipoCusto: null }, [
        "Equipamentos técnicos e de campo",
        "Veículos",
        "Computadores e equipamentos de informática (imobilizado)",
        "Benfeitorias e instalações",
        "Outros investimentos",
      ], "Desembolso na compra do bem (linha Investimentos da DRE de caixa). Depreciação e amortização não são calculadas pelo sistema."),
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

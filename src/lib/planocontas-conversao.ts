/**
 * Conversão controlada do Plano de Contas de uma empresa EXISTENTE para o
 * plano padrão de consultoria ambiental. Módulo PURO: recebe o cadastro atual
 * (grupos, contas e o uso de cada código) e devolve o PLANO da conversão —
 * nada é gravado aqui. A ação do servidor aplica o plano numa transação.
 *
 * Por que existe: o provisionamento e o seed só valem para empresas NOVAS. A
 * empresa criada antes (plano de obra, ou o plano ambiental anterior) continua
 * com as contas antigas gravadas em `chart_account`, e a tela mostra o que está
 * gravado. Atualizar o arquivo do plano padrão não muda registro nenhum.
 *
 * Regras (nada destrutivo, nada silencioso):
 * - Nenhuma linha é apagada, nenhum lançamento muda de valor nem de categoria.
 * - Conta e grupo antigos ficam INATIVOS (somem de lançamentos novos, ficam no
 *   histórico). A equivalência com a conta ambiental é só SUGESTÃO: mover os
 *   lançamentos é a "Reclassificação", explícita, com prévia e permissão.
 * - Código antigo que ocupa um código do plano padrão (ex.: grupo "1" de obra ×
 *   grupo "1" de Receitas) é ARQUIVADO com o prefixo "ANT-", e TODAS as
 *   referências a ele (despesas, Orçamento/Previsão, seleção de linhas,
 *   medições) recebem o código novo na mesma transação. Sem isso o histórico de
 *   obra apareceria com o nome de um grupo ambiental. Valores e categorias não
 *   mudam — inclusive em versão congelada, onde só o texto do código muda.
 * - Grupo do plano ambiental que entrou como "PA-<código>" (adoção aditiva
 *   anterior) volta ao código oficial quando ele fica livre.
 * - Conta do plano ambiental já existente é mantida como está (personalização
 *   da empresa preservada); só o que falta é criado.
 * - Repetir a conversão não muda nada (idempotente).
 */
import { gruposDoPlano, linhasDoPlano, VERSAO_PLANO_PADRAO } from "@/lib/calc/plano-ambiental";
import { normalizar, sugerirContas } from "@/lib/planocontas-regras";

export const PREFIXO_ARQUIVO = "ANT-";
export const PREFIXO_ADOCAO = "PA-";

export interface GrupoAtual {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  ativo: boolean;
}
export interface ContaAtual {
  id: string;
  code: string;
  name: string;
  groupCode: string;
  natureza: string;
  ativo: boolean;
  papel: string | null;
}
export interface UsoResumido {
  despesas: number;
  orcamento: number;
  medicoes: number;
  versoesCongeladas: number;
}
const semUso: UsoResumido = { despesas: 0, orcamento: 0, medicoes: 0, versoesCongeladas: 0 };
const usado = (u: UsoResumido) => u.despesas + u.orcamento + u.medicoes > 0;

export interface Renomeacao {
  tipo: "grupo" | "conta";
  id: string;
  de: string;
  para: string;
  nome: string;
  motivo: "conflito" | "adocao";
  uso: UsoResumido;
}
export interface Inativacao {
  tipo: "grupo" | "conta";
  id: string;
  /** código depois da conversão (o arquivado, se foi renomeado). */
  code: string;
  nome: string;
  uso: UsoResumido;
  /** conta ambiental sugerida para reclassificar os lançamentos (só para contas). */
  equivalente: { code: string; nome: string } | null;
}
export interface PapelMovido {
  papel: string;
  deId: string;
  deCode: string;
  para: string;
}
export interface PlanoDeConversao {
  versao: string;
  renomear: Renomeacao[];
  inativar: Inativacao[];
  criarGrupos: { code: string; name: string; parentCode: string | null }[];
  criarContas: { code: string; name: string; groupCode: string }[];
  papeis: PapelMovido[];
  /** contas do plano ambiental que já existiam e ficam como estão. */
  mantidas: number;
  /** resumo para a tela. */
  resumo: {
    contasAntigasAtivas: number;
    contasAntigasUsadas: number;
    lancamentosPreservados: number;
    referenciasRenomeadas: number;
    emVersaoCongelada: number;
  };
  nadaAFazer: boolean;
}

/**
 * Equivalências conhecidas dos planos anteriores (de obra e o ambiental v1),
 * pelo NOME normalizado da conta antiga → NOME da conta ambiental. Pelo nome,
 * e não pelo código, porque os dois planos antigos reaproveitam os mesmos
 * códigos ("1.1", "A.1"…) com sentidos diferentes. O que não está aqui cai na
 * sugestão por semelhança de nome; conta de obra (fundação, alvenaria…) fica
 * sem equivalente — de propósito.
 */
const EQUIVALENTES: Record<string, string> = {
  // plano de obra (complementares genéricos)
  "jurídico": "Assessoria jurídica",
  "cartório/ri": "Cartório e registros da empresa",
  "responsável técnico (rt)": "Emissão de documentos de responsabilidade técnica",
  "licenças e alvarás": "Despesas com autorizações",
  "comissão imobiliária": "Comissões comerciais",
  "crm/plataforma de vendas": "Sistemas SaaS",
  "material de vendas": "Materiais promocionais",
  "foto/vídeo": "Marketing digital",
  "redes sociais": "Marketing digital",
  "gráfica/impressão": "Materiais promocionais",
  "outdoor/mídia física": "Publicidade",
  "assinatura digital": "Assinaturas digitais",
  "medicina do trabalho": "Exames médicos ocupacionais",
  "epi/uniformes": "Equipamentos de proteção individual (EPI)",
  "inss obra": "INSS",
  "iss": "ISS",
  "irpj/csll": "IRPJ",
  "alvará/taxas municipais": "Alvarás e taxas municipais",
  "itbi": "Outros tributos",
  "cnd/certidões": "Cartório e registros da empresa",
  // ambos (complementares com o mesmo nome)
  "software/saas": "Sistemas SaaS",
  "hospedagem/cloud": "Armazenamento em nuvem",
  "ti/suporte": "Suporte técnico",
  "hardware/equipamentos": "Computadores e equipamentos de informática (imobilizado)",
  "aluguel escritório": "Aluguel",
  "água/luz/internet": "Energia elétrica",
  "telefonia": "Telefonia",
  "material de escritório": "Material de escritório",
  "serviços de limpeza/segurança": "Limpeza e conservação",
  "honorários contábeis": "Contabilidade",
  "tarifas bancárias": "Tarifas bancárias",
  "seguros": "Seguros",
  "seguros (inclui rc profissional)": "Seguros",
  "iof/juros/multas": "Outras despesas financeiras",
  "cartório/reconhecimento de firma": "Cartório e registros da empresa",
  "despesas financeiras — juros e multas de mora": "Juros passivos",
  "receitas financeiras — descontos obtidos": "Descontos financeiros obtidos (redutor)",
  "folha de pagamento clt": "Salários administrativos",
  "pagamento rpa": "Outros custos diretos de pessoal",
  "seguro de vida": "Benefícios",
  "agência de marketing": "Marketing digital",
  // plano ambiental anterior (v1)
  "consultores e especialistas terceirizados (pj)": "Consultores especializados",
  "análises laboratoriais (água, solo, ar, efluentes)": "Serviços laboratoriais",
  "levantamentos de campo (topografia, sondagem, geofísica)": "Serviços de topografia",
  "inventários de fauna e flora": "Serviços de biologia e meio ambiente",
  "geoprocessamento, drone e aerolevantamento": "Serviços de geoprocessamento",
  "modelagem e estudos especializados (dispersão, hidrologia, ruído)": "Análises técnicas especializadas",
  "combustível, pedágio e estacionamento": "Combustíveis",
  "hospedagem e alimentação em campo": "Hospedagens",
  "locação de veículos e embarcações": "Locação de veículos",
  "locação de equipamentos de campo": "Locação de equipamentos técnicos",
  "materiais e insumos de coleta (frascos, reagentes, gelo)": "Materiais de coleta e análise",
  "frete e envio de amostras": "Fretes",
  "passagens e deslocamentos": "Passagens aéreas",
  "taxas de licenciamento e de análise (órgão ambiental)": "Taxas de órgãos ambientais",
  "art / aft / responsabilidade técnica do projeto": "Emissão de documentos de responsabilidade técnica",
  "publicações legais (diário oficial, jornal)": "Publicações legais (diário oficial e jornais)",
  "certidões, cartório e registros do projeto": "Emolumentos",
  "audiências e consultas públicas": "Serviços de apoio",
  "impressão, plotagem e encadernação de estudos": "Impressão e reprodução de estudos e relatórios",
  "bases cartográficas e imagens de satélite": "Bases cartográficas e imagens",
  "software e licenças específicos do projeto": "Outros custos identificáveis diretamente com os serviços",
  "tradução e revisão técnica": "Outros serviços técnicos terceirizados",
  "monitoramento ambiental (fauna, flora, qualidade)": "Serviços operacionais de campo",
  "educação ambiental e comunicação social": "Insumos de programas ambientais (mudas, materiais educativos)",
  "recuperação de áreas (mudas, insumos, plantio)": "Insumos de programas ambientais (mudas, materiais educativos)",
  "gestão de resíduos do projeto": "Outros custos operacionais",
  "subcontratação de execução de programas": "Outros serviços técnicos terceirizados",
  "licenciamento ambiental": "Receita de consultoria técnica",
  "estudos ambientais (eia/rima, rca/pca, ras)": "Receita de estudos e diagnósticos ambientais",
  "monitoramento e programas ambientais": "Receita de monitoramento ambiental",
  "gestão de condicionantes e compliance": "Receita de gestão de programas ambientais",
  "consultoria, auditoria e due diligence": "Receita de consultoria técnica",
  "treinamentos e outros serviços": "Outras receitas de prestação de serviços",
  "pis/cofins": "PIS",
  "simples nacional (das)": "Simples Nacional (DAS)",
  "comissões e parcerias comerciais": "Comissões comerciais",
  "elaboração de propostas e licitações": "Prospecção de clientes",
  "eventos, feiras e congressos": "Eventos comerciais",
  "crm/plataforma comercial": "Sistemas SaaS",
  "mídia paga (meta/google/linkedin)": "Publicidade",
  "mídia paga (meta/google)": "Publicidade",
  "site e redes sociais": "Marketing digital",
  "material institucional": "Materiais promocionais",
  "medicina e segurança do trabalho": "Exames médicos ocupacionais",
  "epi/uniformes de campo": "Equipamentos de proteção individual (EPI)",
  "benefícios (vr, vt, plano de saúde)": "Benefícios",
  "estágio": "Outras despesas de pessoal",
  "treinamento e capacitação técnica": "Treinamentos internos",
  "licenças gis/cad (arcgis, autocad)": "Licenças de software",
  "manutenção de equipamentos de campo próprios": "Manutenção de equipamentos",
  "assessoria jurídica": "Assessoria jurídica",
  "anuidades de conselhos (crea, crbio, crq)": "Anuidades de conselhos profissionais",
  "cadastros técnicos (ctf/ibama) e certificações": "Cadastros técnicos e certificações da empresa",
  "alvará e taxas municipais da empresa": "Alvarás e taxas municipais",
};

const PADRAO_CONTAS = linhasDoPlano("_");
const NOME_PADRAO_PARA_CODIGO = new Map(PADRAO_CONTAS.map((c) => [normalizar(c.name), c.code]));
const NOME_DO_CODIGO = new Map(PADRAO_CONTAS.map((c) => [c.code, c.name]));
const COMPARAVEIS = PADRAO_CONTAS.map((c) => ({ code: c.code, name: c.name, natureza: c.natureza, ativo: true }));

/**
 * Conta do plano ambiental que equivale a uma conta antiga — SUGESTÃO para a
 * reclassificação (nunca aplicada sozinha). Primeiro a tabela de equivalências
 * conhecidas; depois, semelhança de nome (≥ 50%) na mesma natureza.
 */
export function equivalenteSugerido(c: { name: string; natureza: string }): { code: string; nome: string } | null {
  const curado = EQUIVALENTES[c.name.trim().toLowerCase()];
  const porCurado = curado ? NOME_PADRAO_PARA_CODIGO.get(normalizar(curado)) : undefined;
  if (porCurado) return { code: porCurado, nome: NOME_DO_CODIGO.get(porCurado)! };
  const [s] = sugerirContas(c.name, COMPARAVEIS, c.natureza === "receita" ? "receita" : "despesa", 1);
  return s && s.semelhanca >= 0.5 ? { code: s.code, nome: s.name } : null;
}

/** Código livre "ANT-<código>" (com sufixo se já houver um arquivado igual). */
function codigoDeArquivo(code: string, ocupados: Set<string>): string {
  let alvo = `${PREFIXO_ARQUIVO}${code}`;
  for (let i = 2; ocupados.has(alvo); i++) alvo = `${PREFIXO_ARQUIVO}${code}-${i}`;
  return alvo;
}

export function planejarConversao(atual: { grupos: readonly GrupoAtual[]; contas: readonly ContaAtual[]; uso: ReadonlyMap<string, UsoResumido> }): PlanoDeConversao {
  const padraoGrupos = gruposDoPlano("_");
  const padraoContas = linhasDoPlano("_");
  const codGrupoPadrao = new Set(padraoGrupos.map((g) => g.code));
  const codContaPadrao = new Set(padraoContas.map((c) => c.code));
  const paiPadrao = new Map(padraoGrupos.map((g) => [g.code, g.parentCode]));
  const usoDe = (code: string) => atual.uso.get(code) ?? semUso;

  const grupoPorId = new Map(atual.grupos.map((g) => [g.id, g]));
  const temFilhos = new Set(atual.grupos.filter((g) => g.parentId).map((g) => g.parentId!));
  /** o grupo com este código É o do plano ambiental (estrutura certa), não um antigo que só ocupa o código. */
  const ehGrupoAmbiental = (g: GrupoAtual): boolean => {
    const codigo = g.code.startsWith(PREFIXO_ADOCAO) ? g.code.slice(PREFIXO_ADOCAO.length) : g.code;
    if (!codGrupoPadrao.has(codigo)) return false;
    const pai = paiPadrao.get(codigo) ?? null;
    if (pai === null) return temFilhos.has(g.id); // grupo de 1º nível ambiental tem subgrupos
    const p = g.parentId ? grupoPorId.get(g.parentId) : null;
    if (!p) return false;
    const codPai = p.code.startsWith(PREFIXO_ADOCAO) ? p.code.slice(PREFIXO_ADOCAO.length) : p.code;
    return codPai === pai;
  };

  const ocupados = new Set<string>([...atual.grupos.map((g) => g.code), ...atual.contas.map((c) => c.code)]);
  const renomear: Renomeacao[] = [];

  // 1) Antigos que ocupam códigos do plano ambiental → arquivados ("ANT-").
  for (const g of atual.grupos) {
    if (codGrupoPadrao.has(g.code) && !ehGrupoAmbiental(g)) {
      const para = codigoDeArquivo(g.code, ocupados);
      ocupados.add(para);
      renomear.push({ tipo: "grupo", id: g.id, de: g.code, para, nome: g.name, motivo: "conflito", uso: usoDe(g.code) });
    }
  }
  for (const c of atual.contas) {
    if (codGrupoPadrao.has(c.code)) {
      const para = codigoDeArquivo(c.code, ocupados);
      ocupados.add(para);
      renomear.push({ tipo: "conta", id: c.id, de: c.code, para, nome: c.name, motivo: "conflito", uso: usoDe(c.code) });
    }
  }
  const liberados = new Set(renomear.map((r) => r.de));
  // 2) Grupos ambientais que entraram como "PA-…" voltam ao código oficial.
  for (const g of atual.grupos) {
    if (!g.code.startsWith(PREFIXO_ADOCAO) || !ehGrupoAmbiental(g)) continue;
    const oficial = g.code.slice(PREFIXO_ADOCAO.length);
    const livre = liberados.has(oficial) || !ocupados.has(oficial);
    if (!livre) continue;
    renomear.push({ tipo: "grupo", id: g.id, de: g.code, para: oficial, nome: g.name, motivo: "adocao", uso: usoDe(g.code) });
    ocupados.add(oficial);
  }
  const codigoFinal = new Map<string, string>(renomear.map((r) => [`${r.tipo}:${r.id}`, r.para]));
  const finalGrupo = (g: GrupoAtual) => codigoFinal.get(`grupo:${g.id}`) ?? g.code;
  const finalConta = (c: ContaAtual) => codigoFinal.get(`conta:${c.id}`) ?? c.code;
  const grupoRenomeado = new Map(renomear.filter((r) => r.tipo === "grupo").map((r) => [r.de, r.para]));

  // 3) O que é do plano ambiental depois das renomeações.
  const gruposAmbientais = new Set(atual.grupos.filter((g) => ehGrupoAmbiental(g)).map((g) => finalGrupo(g)));
  // contas cujo grupo (após renomear) é um subgrupo ambiental, ou cujo código é do padrão
  const contaAmbiental = (c: ContaAtual) => {
    const g = grupoRenomeado.get(c.groupCode) ?? c.groupCode;
    return codContaPadrao.has(c.code) || gruposAmbientais.has(g);
  };

  // 4) Antigos que ficam inativos (com sugestão de equivalente).
  const equivalente = (c: ContaAtual) => equivalenteSugerido(c);
  const inativar: Inativacao[] = [];
  for (const c of atual.contas) {
    if (contaAmbiental(c) || !c.ativo) continue; // já inativa: nada a fazer (o conflito de código é tratado acima)
    inativar.push({ tipo: "conta", id: c.id, code: finalConta(c), nome: c.name, uso: usoDe(c.code), equivalente: equivalente(c) });
  }
  for (const g of atual.grupos) {
    if (ehGrupoAmbiental(g) || !g.ativo) continue;
    // grupo criado pela empresa sob um grupo ambiental (personalização) fica como está
    const sobAmbiental = g.parentId ? (() => { const p = grupoPorId.get(g.parentId!); return p ? ehGrupoAmbiental(p) : false; })() : false;
    if (sobAmbiental) continue;
    inativar.push({ tipo: "grupo", id: g.id, code: finalGrupo(g), nome: g.name, uso: usoDe(g.code), equivalente: null });
  }

  // 5) O que falta do plano ambiental.
  const existentesDepois = new Set<string>([
    ...atual.grupos.map((g) => finalGrupo(g)),
    ...atual.contas.map((c) => finalConta(c)),
  ]);
  const criarGrupos = padraoGrupos.filter((g) => !existentesDepois.has(g.code)).map((g) => ({ code: g.code, name: g.name, parentCode: g.parentCode }));
  const criarContas = padraoContas.filter((c) => !existentesDepois.has(c.code)).map((c) => ({ code: c.code, name: c.name, groupCode: c.groupCode }));
  const mantidas = padraoContas.length - criarContas.length;

  // 6) Papéis técnicos (acerto de contas) passam da conta antiga para a ambiental.
  const papeis: PapelMovido[] = [];
  for (const c of atual.contas) {
    if (!c.papel || contaAmbiental(c)) continue;
    const alvo = padraoContas.find((p) => p.papel === c.papel);
    if (alvo) papeis.push({ papel: c.papel, deId: c.id, deCode: finalConta(c), para: alvo.code });
  }

  const contasAntigasAtivas = inativar.filter((i) => i.tipo === "conta");
  const comUso = contasAntigasAtivas.filter((i) => usado(i.uso));
  const refs = renomear.reduce((a, r) => a + r.uso.despesas + r.uso.orcamento + r.uso.medicoes, 0);
  return {
    versao: VERSAO_PLANO_PADRAO,
    renomear,
    inativar,
    criarGrupos,
    criarContas,
    papeis,
    mantidas,
    resumo: {
      contasAntigasAtivas: contasAntigasAtivas.length,
      contasAntigasUsadas: comUso.length,
      lancamentosPreservados: comUso.reduce((a, i) => a + i.uso.despesas, 0),
      referenciasRenomeadas: refs,
      emVersaoCongelada: renomear.reduce((a, r) => a + r.uso.versoesCongeladas, 0),
    },
    nadaAFazer: renomear.length + inativar.length + criarGrupos.length + criarContas.length + papeis.length === 0,
  };
}

/** A empresa ainda está num plano anterior (há conta ativa fora do plano ambiental, ou falta estrutura dele)? */
export function precisaConverter(p: PlanoDeConversao): boolean {
  return !p.nadaAFazer;
}

/**
 * Documento → lançamento de despesa: o contrato da leitura e a regra de
 * preenchimento.
 *
 * Este módulo é PURO (sem rede, sem `server-only`, sem React) de propósito: é
 * aqui que mora a decisão de o que preencher, o que deduzir e o que marcar com
 * alerta — e isso precisa ser testável sem chamar a API da IA.
 *
 * Divisão de trabalho:
 *   - `despesa-extract.ts` (servidor) conversa com a IA e devolve `ExtractedDespesa`;
 *   - `montarPreenchimentoDespesa` (aqui) traduz isso para os valores do
 *     formulário + os alertas de cada campo;
 *   - `despesa-form.tsx` (cliente) só aplica o resultado e desenha.
 *
 * Os documentos reais que chegam do campo e que este módulo precisa dar conta:
 *   - DANFE de NF-e (tudo preenchido, inclusive chave de acesso);
 *   - cupom "SEM VALOR FISCAL" de loja ou posto (tem valor e item, não tem NF);
 *   - comprovante de Pix/TED (paga um serviço, CPF mascarado, sem nota);
 *   - boleto (vencimento sim, competência não);
 *   - orçamento/pedido (não é despesa ainda — vira alerta em quase tudo).
 */

import {
  avaliarCampo,
  competenciaDeDataInterna,
  docCompleto,
  isoParaCompetenciaInterna,
  isoParaDataInterna,
  normalizarNome,
  somenteDigitos,
  vazio,
  type Alerta,
  type CampoLido,
} from "@/lib/ai/campos";

/**
 * Natureza do arquivo enviado. Não é o mesmo que o tipo de documento fiscal:
 * um comprovante de Pix é um documento legítimo de despesa e NÃO gera nota —
 * o lançamento nasce "pendente de NF", que é situação normal aqui.
 */
export const NATUREZAS_ARQUIVO = [
  "NOTA_FISCAL",
  "CUPOM",
  "BOLETO",
  "COMPROVANTE",
  "RECIBO",
  "ORCAMENTO",
  "CONTRATO",
  "OUTRO",
] as const;
export type NaturezaArquivo = (typeof NATUREZAS_ARQUIVO)[number];

export const ROTULO_NATUREZA: Record<NaturezaArquivo, string> = {
  NOTA_FISCAL: "Nota fiscal",
  CUPOM: "Cupom / recibo de loja",
  BOLETO: "Boleto",
  COMPROVANTE: "Comprovante de pagamento",
  RECIBO: "Recibo",
  ORCAMENTO: "Orçamento / pedido",
  CONTRATO: "Contrato",
  OUTRO: "Documento",
};

/** O que a IA devolve depois de ler um ou mais arquivos da MESMA despesa. */
export interface ExtractedDespesa {
  natureza: NaturezaArquivo;
  /** Uma linha dizendo o que é o documento — aparece no resumo da leitura. */
  resumo: string;
  /** Ressalvas gerais (documento cortado, valor rasurado, foto ilegível...). */
  observacoes: string[];

  fornecedorNome: CampoLido;
  fornecedorDoc: CampoLido;
  valor: CampoLido<number>;
  /** ISO "YYYY-MM". */
  competencia: CampoLido;
  /** ISO "YYYY-MM-DD". */
  vencimento: CampoLido;
  descricao: CampoLido;
  categoriaDre: CampoLido;
  contaCef: CampoLido;
  projetoNome: CampoLido;

  /** Bloco documento fiscal — id de TIPOS_DOCUMENTO. */
  docFiscalTipo: CampoLido;
  numDoc: CampoLido;
  serie: CampoLido;
  chaveAcesso: CampoLido;
  /** ISO "YYYY-MM-DD". */
  dataEmissao: CampoLido;

  /** Pagamento. */
  formaPagamento: CampoLido;
  pago: CampoLido<boolean>;
  /** ISO "YYYY-MM-DD". */
  dataPagamento: CampoLido;
}

/** Campos do formulário de despesa que a leitura por IA pode tocar. */
export type CampoDespesa =
  | "projeto"
  | "fornecedor"
  | "docFiscalTipo"
  | "docFiscalNumero"
  | "docFiscalSerie"
  | "docFiscalEmissao"
  | "docFiscalChave"
  | "contaCef"
  | "categoriaDre"
  | "competencia"
  | "vencimento"
  | "valor"
  | "status"
  | "obs"
  | "formaPagamento";

export const ROTULO_CAMPO: Record<CampoDespesa, string> = {
  projeto: "Projeto",
  fornecedor: "Fornecedor",
  docFiscalTipo: "Tipo de documento",
  docFiscalNumero: "Nº do documento",
  docFiscalSerie: "Série",
  docFiscalEmissao: "Emissão",
  docFiscalChave: "Chave de acesso",
  contaCef: "Conta / plano de contas",
  categoriaDre: "Categoria DRE",
  competencia: "Competência",
  vencimento: "Vencimento",
  valor: "Valor",
  status: "Status",
  obs: "Descrição da compra",
  formaPagamento: "Forma de pagamento",
};

/** Valores prontos para o estado do formulário (formato interno das telas). */
export interface ValoresDespesa {
  projetoId?: string;
  fornecedorId?: string;
  contaCef?: string;
  categoriaDre?: string;
  /** "MM/YYYY". */
  competencia?: string;
  /** "MM/DD/YYYY". */
  vencimento?: string;
  /** Valor canônico em reais, com ponto decimal ("1234.56"). */
  valor?: string;
  status?: "Pago" | "A pagar";
  obs?: string;
  formaPagamento?: string;
  docFiscal?: {
    tipo: string;
    numero: string;
    serie: string;
    chaveAcesso: string;
    /** "MM/DD/YYYY". */
    dataEmissao: string;
  };
  /** "MM/DD/YYYY" — usado quando o documento comprova pagamento já feito. */
  dataPagamento?: string;
}

export interface PreenchimentoDespesa {
  valores: ValoresDespesa;
  /** Campo → alerta. Campo ausente = preenchido com confiança, sem alerta. */
  alertas: Partial<Record<CampoDespesa, Alerta>>;
  /** Rótulos dos campos efetivamente preenchidos (para o resumo da leitura). */
  preenchidos: string[];
  natureza: NaturezaArquivo;
  resumo: string;
  observacoes: string[];
}

export interface ContextoDespesa {
  fornecedores: { id: string; nome: string; doc: string | null }[];
  /** Códigos existentes no plano de contas do tenant. */
  contas: string[];
  /** Categorias DRE ACEITAS para despesa (natureza devedora). */
  categorias: readonly string[];
  projetos: { id: string; nome: string }[];
  formasPagamento: readonly string[];
  /** Ids válidos de TIPOS_DOCUMENTO. */
  tiposDocumento: readonly string[];
  /**
   * CNPJ da própria empresa (decisão de 01/10/2026: ele não vai mais ao
   * modelo). Se a leitura devolver a pagadora como fornecedor, o casamento é
   * recusado aqui e a tela pede conferência.
   */
  empresaDoc?: string | null;
}

/** Resultado do casamento de um texto lido com um cadastro existente. */
interface Match {
  id: string | null;
  /** Casou por um critério fraco (nome parecido) e merece conferência. */
  fraco: boolean;
}

function acharFornecedor(
  nome: string,
  doc: string,
  lista: ContextoDespesa["fornecedores"],
): Match {
  // 1) CNPJ/CPF é identificador — mas só quando veio completo. Comprovante de
  //    Pix mascara o CPF, e casar por dígito parcial vincularia a despesa ao
  //    fornecedor errado sem ninguém perceber.
  if (docCompleto(doc)) {
    const d = somenteDigitos(doc);
    const byDoc = lista.find((f) => f.doc && somenteDigitos(f.doc) === d);
    if (byDoc) return { id: byDoc.id, fraco: false };
  }
  const n = normalizarNome(nome);
  if (!n) return { id: null, fraco: false };
  const exato = lista.find((f) => normalizarNome(f.nome) === n);
  if (exato) return { id: exato.id, fraco: false };
  // 2) "DEPOSITO LITORAL COM MAT CONSTR LTDA" no cupom x "Depósito Litoral"
  //    no cadastro: casa, mas é palpite — o usuário confirma.
  const parcial = lista.find((f) => {
    const fn = normalizarNome(f.nome);
    return fn.length >= 4 && (fn.includes(n) || n.includes(fn));
  });
  return parcial ? { id: parcial.id, fraco: true } : { id: null, fraco: false };
}

function acharProjeto(nome: string, lista: ContextoDespesa["projetos"]): Match {
  const n = normalizarNome(nome);
  if (!n) return { id: null, fraco: false };
  const exato = lista.find((p) => normalizarNome(p.nome) === n);
  if (exato) return { id: exato.id, fraco: false };
  // O projeto costuma vir embutido no nome do destinatário ("CONSULTORIA EXEMPLO
  // LTDA (PROJETO 25)") ou carimbado no cupom ("PROJETO 28").
  const parcial = lista.find((p) => {
    const pn = normalizarNome(p.nome);
    return pn.length >= 3 && (n.includes(pn) || pn.includes(n));
  });
  return parcial ? { id: parcial.id, fraco: true } : { id: null, fraco: false };
}

/** Casa a forma de pagamento lida com a lista fechada do sistema. */
function acharForma(lido: string, formas: readonly string[]): string | null {
  const n = normalizarNome(lido);
  if (!n) return null;
  const direto = formas.find((f) => normalizarNome(f) === n);
  if (direto) return direto;
  const sinonimos: Record<string, string> = {
    pix: "PIX",
    ted: "Transferência bancária",
    doc: "Transferência bancária",
    transferencia: "Transferência bancária",
    "transferencia bancaria": "Transferência bancária",
    deposito: "Transferência bancária",
    boleto: "Boleto",
    "boleto bancario": "Boleto",
    dinheiro: "Dinheiro",
    especie: "Dinheiro",
    "a vista": "Dinheiro",
    cheque: "Cheque",
    "cartao de credito": "Cartão de crédito",
    credito: "Cartão de crédito",
    "cartao de debito": "Cartão de débito",
    debito: "Cartão de débito",
    "debito automatico": "Débito automático",
  };
  const alvo = sinonimos[n];
  return alvo && formas.includes(alvo) ? alvo : null;
}

/**
 * Traduz a leitura da IA nos valores do formulário + nos alertas por campo.
 *
 * Duas ideias guiam tudo o que está aqui:
 *
 * 1. **Deduzir é permitido, esconder não.** Quando o documento não traz o
 *    campo mas ele pode ser derivado com segurança razoável (competência a
 *    partir da emissão, vencimento de um comprovante já pago), o campo é
 *    preenchido E marcado com alerta "conferir". O usuário vê de onde veio.
 * 2. **O que não dá para aplicar vira alerta, não silêncio.** Fornecedor que
 *    não está cadastrado, conta que não existe no plano, categoria de receita
 *    sugerida para uma despesa: nada disso é aplicado, e o motivo aparece no
 *    campo.
 */
export function montarPreenchimentoDespesa(
  x: ExtractedDespesa,
  ctx: ContextoDespesa,
): PreenchimentoDespesa {
  const valores: ValoresDespesa = {};
  const alertas: Partial<Record<CampoDespesa, Alerta>> = {};
  const preenchidos: string[] = [];

  const marcar = (campo: CampoDespesa, a: Alerta | null) => {
    if (a) alertas[campo] = a;
  };
  const preencheu = (campo: CampoDespesa) => preenchidos.push(ROTULO_CAMPO[campo]);

  // ── Projeto ───────────────────────────────────────────────────────────
  // Lançar no projeto errado é o erro mais caro desta tela (contamina DRE, fluxo
  // e margem do contrato). Por isso o projeto NUNCA passa sem sinal: ou a IA
  // identificou o projeto no documento, ou o campo pede confirmação.
  const proj = acharProjeto(x.projetoNome.valor, ctx.projetos);
  if (proj.id) {
    valores.projetoId = proj.id;
    preencheu("projeto");
    marcar(
      "projeto",
      proj.fraco
        ? {
            nivel: "conferir",
            motivo: `Projeto identificado por semelhança com "${x.projetoNome.valor}" no documento — confirme.`,
          }
        : avaliarCampo(x.projetoNome, { aplicadoVazio: false }),
    );
  } else if (!vazio(x.projetoNome)) {
    marcar("projeto", {
      nivel: "conferir",
      motivo: `O documento cita "${x.projetoNome.valor}", que não corresponde a nenhum projeto cadastrado — confirme o projeto.`,
    });
  } else {
    marcar("projeto", {
      nivel: "conferir",
      motivo: "O documento não identifica o projeto — confirme se o projeto selecionado é o correto.",
    });
  }

  // ── Fornecedor ────────────────────────────────────────────────────────
  const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");
  const ehAPropriaEmpresa = !!ctx.empresaDoc && soDigitos(ctx.empresaDoc).length > 0 && soDigitos(x.fornecedorDoc.valor) === soDigitos(ctx.empresaDoc);
  const forn = ehAPropriaEmpresa ? { id: null, fraco: false } : acharFornecedor(x.fornecedorNome.valor, x.fornecedorDoc.valor, ctx.fornecedores);
  if (ehAPropriaEmpresa) {
    marcar("fornecedor", {
      nivel: "conferir",
      motivo: "A leitura trouxe o CNPJ da própria empresa como fornecedor (ela é a pagadora) — escolha o fornecedor correto.",
    });
  } else if (forn.id) {
    valores.fornecedorId = forn.id;
    preencheu("fornecedor");
    marcar(
      "fornecedor",
      forn.fraco
        ? {
            nivel: "conferir",
            motivo: `Vinculado por semelhança de nome com "${x.fornecedorNome.valor}" — confirme se é o mesmo fornecedor.`,
          }
        : avaliarCampo(x.fornecedorNome, { aplicadoVazio: false }),
    );
  } else if (!vazio(x.fornecedorNome)) {
    const docTxt = docCompleto(x.fornecedorDoc.valor)
      ? ` (${x.fornecedorDoc.valor})`
      : x.fornecedorDoc.valor.trim()
        ? ` (documento incompleto no arquivo: ${x.fornecedorDoc.valor})`
        : "";
    marcar("fornecedor", {
      nivel: "conferir",
      motivo: `"${x.fornecedorNome.valor}"${docTxt} não está cadastrado — cadastre o fornecedor ou escolha o equivalente.`,
    });
  } else {
    marcar("fornecedor", avaliarCampo(x.fornecedorNome, { aplicadoVazio: true, essencial: true }));
  }

  // ── Valor ─────────────────────────────────────────────────────────────
  if (x.valor.valor > 0) {
    valores.valor = String(x.valor.valor);
    preencheu("valor");
    marcar("valor", avaliarCampo(x.valor, { aplicadoVazio: false }));
  } else {
    marcar("valor", avaliarCampo(x.valor, { aplicadoVazio: true, essencial: true }));
  }

  // ── Documento fiscal ──────────────────────────────────────────────────
  const tipoLido = x.docFiscalTipo.valor.trim().toUpperCase();
  const tipo = ctx.tiposDocumento.includes(tipoLido) ? tipoLido : "SEM_DOC";
  const emissaoInterna = isoParaDataInterna(x.dataEmissao.valor);
  const chaveDigitos = somenteDigitos(x.chaveAcesso.valor);
  valores.docFiscal = {
    tipo,
    numero: x.numDoc.valor,
    serie: x.serie.valor,
    chaveAcesso: chaveDigitos,
    dataEmissao: emissaoInterna,
  };
  if (tipo !== "SEM_DOC") {
    preencheu("docFiscalTipo");
    marcar("docFiscalTipo", avaliarCampo(x.docFiscalTipo, { aplicadoVazio: false }));
  } else if (!vazio(x.docFiscalTipo) && tipoLido !== "SEM_DOC") {
    marcar("docFiscalTipo", {
      nivel: "conferir",
      motivo: `Tipo "${x.docFiscalTipo.valor}" não é um tipo aceito — escolha manualmente.`,
    });
  }

  // O número/série/chave só viram pendência quando existe nota: comprovante de
  // Pix e cupom sem valor fiscal não têm número de documento a cobrar.
  const temNota = tipo !== "SEM_DOC";
  if (x.numDoc.valor) preencheu("docFiscalNumero");
  marcar(
    "docFiscalNumero",
    avaliarCampo(x.numDoc, { aplicadoVazio: !x.numDoc.valor, essencial: temNota }),
  );
  if (x.serie.valor) {
    preencheu("docFiscalSerie");
    marcar("docFiscalSerie", avaliarCampo(x.serie, { aplicadoVazio: false }));
  }
  if (emissaoInterna) {
    preencheu("docFiscalEmissao");
    marcar("docFiscalEmissao", avaliarCampo(x.dataEmissao, { aplicadoVazio: false }));
  } else if (!vazio(x.dataEmissao)) {
    marcar("docFiscalEmissao", {
      nivel: "conferir",
      motivo: `Data de emissão ilegível no documento ("${x.dataEmissao.valor}") — informe manualmente.`,
    });
  } else if (temNota) {
    marcar("docFiscalEmissao", avaliarCampo(x.dataEmissao, { aplicadoVazio: true, essencial: true }));
  }
  if (chaveDigitos) {
    preencheu("docFiscalChave");
    marcar(
      "docFiscalChave",
      chaveDigitos.length !== 44
        ? {
            nivel: "conferir",
            motivo: `Chave lida com ${chaveDigitos.length} dígitos (a NF-e tem 44) — confira no documento.`,
          }
        : avaliarCampo(x.chaveAcesso, { aplicadoVazio: false }),
    );
  }

  // ── Datas ─────────────────────────────────────────────────────────────
  const vencIso = isoParaDataInterna(x.vencimento.valor);
  const pagIso = isoParaDataInterna(x.dataPagamento.valor);
  if (pagIso) valores.dataPagamento = pagIso;

  if (vencIso) {
    valores.vencimento = vencIso;
    preencheu("vencimento");
    marcar("vencimento", avaliarCampo(x.vencimento, { aplicadoVazio: false }));
  } else if (pagIso) {
    // Comprovante de pagamento: a despesa venceu, no mais tardar, no dia em
    // que foi paga. Preenche para o lançamento não nascer sem data, e avisa.
    valores.vencimento = pagIso;
    preencheu("vencimento");
    marcar("vencimento", {
      nivel: "conferir",
      motivo: "Documento comprova pagamento e não traz vencimento — assumido o dia do pagamento.",
    });
  } else if (emissaoInterna) {
    valores.vencimento = emissaoInterna;
    preencheu("vencimento");
    marcar("vencimento", {
      nivel: "conferir",
      motivo: "Vencimento não consta no documento — assumida a data de emissão. Ajuste se houver prazo.",
    });
  } else {
    marcar("vencimento", avaliarCampo(x.vencimento, { aplicadoVazio: true, essencial: true }));
  }

  const compIso = isoParaCompetenciaInterna(x.competencia.valor);
  if (compIso) {
    valores.competencia = compIso;
    preencheu("competencia");
    marcar("competencia", avaliarCampo(x.competencia, { aplicadoVazio: false }));
  } else {
    // Competência é regime de COMPETÊNCIA (RG-01): o mês do fato gerador —
    // emissão da nota / entrega — e não o mês do pagamento. Por isso a ordem
    // de dedução começa pela emissão.
    const base = emissaoInterna || valores.vencimento || pagIso || "";
    const derivada = competenciaDeDataInterna(base);
    if (derivada) {
      valores.competencia = derivada;
      preencheu("competencia");
      marcar("competencia", {
        nivel: "conferir",
        motivo: emissaoInterna
          ? "Competência deduzida do mês de emissão do documento — ajuste se o custo for de outro mês."
          : "Competência deduzida da data do documento — ajuste se o custo for de outro mês.",
      });
    } else {
      marcar("competencia", avaliarCampo(x.competencia, { aplicadoVazio: true, essencial: true }));
    }
  }

  // ── Classificação contábil ────────────────────────────────────────────
  if (x.contaCef.valor && ctx.contas.includes(x.contaCef.valor)) {
    valores.contaCef = x.contaCef.valor;
    preencheu("contaCef");
    marcar("contaCef", avaliarCampo(x.contaCef, { aplicadoVazio: false }));
  } else if (x.contaCef.valor) {
    marcar("contaCef", {
      nivel: "conferir",
      motivo: `A IA sugeriu a conta "${x.contaCef.valor}", que não existe no plano de contas — escolha a conta.`,
    });
  } else {
    marcar("contaCef", avaliarCampo(x.contaCef, { aplicadoVazio: true, essencial: true }));
  }

  // A IA nunca pode classificar uma despesa em categoria de RECEITA (RG-01):
  // `ctx.categorias` já chega filtrada por natureza devedora.
  if (x.categoriaDre.valor && ctx.categorias.includes(x.categoriaDre.valor)) {
    valores.categoriaDre = x.categoriaDre.valor;
    preencheu("categoriaDre");
    marcar("categoriaDre", avaliarCampo(x.categoriaDre, { aplicadoVazio: false }));
  } else if (x.categoriaDre.valor) {
    marcar("categoriaDre", {
      nivel: "conferir",
      motivo: `"${x.categoriaDre.valor}" não é uma categoria de despesa válida — escolha a categoria.`,
    });
  } else {
    marcar("categoriaDre", avaliarCampo(x.categoriaDre, { aplicadoVazio: true, essencial: true }));
  }

  // ── Descrição ─────────────────────────────────────────────────────────
  if (x.descricao.valor) {
    valores.obs = x.descricao.valor;
    preencheu("obs");
    marcar("obs", avaliarCampo(x.descricao, { aplicadoVazio: false }));
  } else {
    marcar("obs", avaliarCampo(x.descricao, { aplicadoVazio: true, essencial: true }));
  }

  // ── Pagamento ─────────────────────────────────────────────────────────
  if (x.pago.valor) {
    valores.status = "Pago";
    preencheu("status");
    marcar(
      "status",
      avaliarCampo(x.pago, {
        aplicadoVazio: false,
        naoAplicado:
          x.pago.confianca === "alta"
            ? undefined
            : "Status deduzido do documento — confirme se a despesa já foi paga.",
      }),
    );
  }
  const forma = acharForma(x.formaPagamento.valor, ctx.formasPagamento);
  if (forma) {
    valores.formaPagamento = forma;
    preencheu("formaPagamento");
    marcar("formaPagamento", avaliarCampo(x.formaPagamento, { aplicadoVazio: false }));
  } else if (!vazio(x.formaPagamento)) {
    marcar("formaPagamento", {
      nivel: "conferir",
      motivo: `Forma "${x.formaPagamento.valor}" não corresponde às opções do sistema — escolha manualmente.`,
    });
  } else if (x.pago.valor) {
    marcar("formaPagamento", {
      nivel: "faltando",
      motivo: "O documento comprova pagamento, mas não diz por qual meio — informe.",
    });
  }

  return {
    valores,
    alertas,
    preenchidos,
    natureza: NATUREZAS_ARQUIVO.includes(x.natureza) ? x.natureza : "OUTRO",
    resumo: x.resumo,
    observacoes: x.observacoes ?? [],
  };
}

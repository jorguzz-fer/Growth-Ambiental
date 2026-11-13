/**
 * Leitura de documentos por IA — vocabulário comum de "campo lido".
 *
 * Toda tela que aceita subir um documento (NF, boleto, cupom, comprovante,
 * foto) e pré-preencher um formulário usa estes tipos. A regra de negócio que
 * eles carregam é uma só, e vale para qualquer tela:
 *
 *   o que a IA preencheu com certeza fica limpo; o que ela NÃO conseguiu
 *   preencher, ou preencheu sem confiança, fica marcado com ALERTA para o
 *   usuário conferir antes de gravar.
 *
 * Nada aqui bloqueia o lançamento — alerta é sinal, não trava. O documento
 * que chega do campo é foto amassada, cupom sem valor fiscal e comprovante com
 * CPF mascarado; exigir certeza impediria o uso real.
 *
 * Módulo PURO (sem `server-only`, sem React): é importado tanto pelo servidor
 * — que fala com a API da IA — quanto pelo cliente, que desenha os alertas.
 */

/**
 * Formatos que a IA consegue LER. Outros arquivos (XML da nota, planilha,
 * e-mail) continuam podendo ser anexados à despesa — só não são lidos. Fica
 * neste módulo puro porque a tela também precisa da lista, para saber se vale
 * disparar a leitura do que o usuário acabou de escolher.
 */
export const AI_ACCEPTED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

/** O arquivo escolhido é legível pela IA? */
export function legivelPelaIa(mime: string): boolean {
  return (AI_ACCEPTED_MIME as readonly string[]).includes(mime || "");
}

/**
 * Quantos arquivos vão juntos numa leitura. Passa de longe o caso real (nota +
 * comprovante + foto do cupom) e evita que alguém selecione a pasta inteira e
 * mande 40 páginas para a IA de uma vez.
 */
export const AI_MAX_DOCS = 4;

/** Quanta certeza a IA tem do que leu naquele campo específico. */
export type Confianca = "alta" | "media" | "baixa";

/**
 * Um campo lido do documento. `nota` é o que a IA quer dizer ao usuário sobre
 * aquele campo — de onde tirou o dado, ou por que está em dúvida. É essa nota
 * que vira o texto do alerta na tela.
 */
export interface CampoLido<T = string> {
  valor: T;
  confianca: Confianca;
  nota: string;
}

/**
 * `faltando` — o documento não traz a informação (ou ela não existe nele).
 * `conferir` — há um valor, mas ele pode estar errado: leitura duvidosa,
 * dado inferido/deduzido, ou algo que a IA trouxe e a tela não pôde aplicar
 * (fornecedor não cadastrado, categoria inexistente...).
 */
export type NivelAlerta = "faltando" | "conferir";

export interface Alerta {
  nivel: NivelAlerta;
  motivo: string;
}

/** Campo lido vazio (string em branco, número zero, booleano falso ausente). */
export function vazio<T>(campo: CampoLido<T> | null | undefined): boolean {
  if (!campo) return true;
  const v = campo.valor;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return !v;
  return v === null || v === undefined;
}

/** Normaliza um campo vindo da API (que pode chegar parcial ou fora do tipo). */
export function normalizarCampo(bruto: unknown, padrao = ""): CampoLido {
  const o = (bruto ?? {}) as Partial<CampoLido>;
  const conf: Confianca =
    o.confianca === "alta" || o.confianca === "media" || o.confianca === "baixa"
      ? o.confianca
      : "baixa";
  return {
    valor: typeof o.valor === "string" ? o.valor.trim() : padrao,
    confianca: conf,
    nota: typeof o.nota === "string" ? o.nota.trim() : "",
  };
}

/** Idem, para campos numéricos (valor da despesa). */
export function normalizarCampoNumero(bruto: unknown): CampoLido<number> {
  const c = normalizarCampo(bruto);
  const o = (bruto ?? {}) as { valor?: unknown };
  const n = typeof o.valor === "number" ? o.valor : Number(o.valor);
  return { ...c, valor: Number.isFinite(n) ? n : 0 };
}

/** Idem, para campos booleanos (ex.: "o documento comprova pagamento?"). */
export function normalizarCampoBool(bruto: unknown): CampoLido<boolean> {
  const c = normalizarCampo(bruto);
  const o = (bruto ?? {}) as { valor?: unknown };
  return { ...c, valor: o.valor === true || o.valor === "true" };
}

/**
 * Decide o alerta de um campo depois que a tela tentou aplicá-lo.
 *
 * A ordem importa:
 *  1. a IA trouxe algo que a tela NÃO conseguiu usar → sempre "conferir"
 *     (ex.: leu "Depósito Litoral" e não existe esse fornecedor cadastrado);
 *  2. ficou vazio e o campo é essencial ao lançamento → "faltando";
 *  3. preencheu, mas sem confiança alta → "conferir".
 *
 * Campo opcional que ficou vazio não vira alerta: marcar tudo que o documento
 * não tem transformaria a tela num muro amarelo e o alerta perderia o sentido.
 */
export function avaliarCampo<T>(
  campo: CampoLido<T> | null | undefined,
  opts: {
    /** O valor efetivamente aplicado no formulário ficou vazio? */
    aplicadoVazio: boolean;
    /** O campo é essencial para um lançamento correto? */
    essencial?: boolean;
    /** Motivo de a tela não ter conseguido aplicar o que a IA leu. */
    naoAplicado?: string;
  },
): Alerta | null {
  if (opts.naoAplicado) {
    return { nivel: "conferir", motivo: opts.naoAplicado };
  }
  if (opts.aplicadoVazio) {
    if (!opts.essencial) return null;
    return {
      nivel: "faltando",
      motivo:
        campo?.nota?.trim() ||
        "O documento não traz esta informação — preencha manualmente.",
    };
  }
  if (campo && campo.confianca !== "alta") {
    return {
      nivel: "conferir",
      motivo:
        campo.nota.trim() ||
        (campo.confianca === "baixa"
          ? "Leitura de baixa confiança — confira no documento."
          : "Valor deduzido do documento — confira antes de lançar."),
    };
  }
  return null;
}

/** Quantos alertas de cada nível — alimenta o resumo no topo do formulário. */
export function contarAlertas(alertas: Record<string, Alerta>): {
  faltando: number;
  conferir: number;
  total: number;
} {
  const vals = Object.values(alertas);
  const faltando = vals.filter((a) => a.nivel === "faltando").length;
  const conferir = vals.filter((a) => a.nivel === "conferir").length;
  return { faltando, conferir, total: vals.length };
}

// ── Conversões de data ────────────────────────────────────────────────────
//
// A IA responde SEMPRE em ISO (YYYY-MM-DD / YYYY-MM): é o único formato sem
// ambiguidade entre 03/04 (3 de abril) e 03/04 (4 de março) — e o documento
// brasileiro escreve DD/MM enquanto o formato interno das telas é MM/DD/YYYY.
// A tradução acontece aqui, uma vez, com validação de calendário.

/** "2026-07-20" → "07/20/2026" (formato interno). Vazio se inválido. */
export function isoParaDataInterna(iso: string): string {
  const m = (iso || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || ano < 1900 || ano > 2200) return "";
  // Rejeita data inexistente (31/02) — a IA às vezes "completa" um dia ilegível.
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return "";
  return `${m[2]}/${m[3]}/${m[1]}`;
}

/** "2026-07" → "07/2026" (competência interna). Vazio se inválido. */
export function isoParaCompetenciaInterna(iso: string): string {
  const m = (iso || "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return "";
  return `${m[2]}/${m[1]}`;
}

/** "07/20/2026" → "07/2026": competência derivada de uma data interna. */
export function competenciaDeDataInterna(interna: string): string {
  const p = (interna || "").split("/");
  return p.length === 3 ? `${p[0]}/${p[2]}` : "";
}

// ── Normalizações de texto/documento ──────────────────────────────────────

const MARCAS_ACENTO = new RegExp("[\\u0300-\\u036f]", "g");

/** Compara nomes ignorando acento, caixa e pontuação. */
export function normalizarNome(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(MARCAS_ACENTO, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function somenteDigitos(s: string): string {
  return (s || "").replace(/\D+/g, "");
}

/**
 * CPF/CNPJ legível por completo? Comprovante de Pix mascara o CPF
 * ("***.123.456-**") e cupom às vezes borra o CNPJ — nesses casos o documento
 * existe, mas o dado NÃO serve para identificar o fornecedor com segurança.
 */
export function docCompleto(doc: string): boolean {
  const d = somenteDigitos(doc);
  return d.length === 11 || d.length === 14;
}

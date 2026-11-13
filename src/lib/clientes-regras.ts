/**
 * Regras do cadastro de clientes (Prompt M, 6) — puras, testáveis e usadas
 * pelo servidor. Nada aqui altera valor já gravado.
 */

/** Status de contrato que liberam a unidade para outro comprador. */
export const STATUS_LIBERA = ["Distratado", "Distrato", "Cancelado", "Cancelada"];

const normalizar = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/**
 * O status LIBERA a unidade? Comparação sem diferenciar maiúsculas, acentos
 * e espaços (6.2): "distratado" libera como "Distratado". Status em branco
 * NÃO libera — a unidade segue reservada ao comprador (a tela avisa).
 */
export function statusLiberaUnidade(status: string | null | undefined): boolean {
  const s = normalizar(status);
  return !!s && STATUS_LIBERA.some((x) => normalizar(x) === s);
}

/**
 * Lista fechada de "Status do contrato" (6.2; decisão de 30/09/2026). Só
 * Distratado e Cancelado liberam a unidade — os outros a mantêm reservada.
 * Nenhum status já gravado é convertido: "ATIVO" continua valendo como
 * "Ativo" (a comparação ignora maiúsculas e acentos) e um valor fora da lista
 * continua legível, sinalizado, até alguém o corrigir.
 */
export const STATUS_CONTRATO = ["Ativo", "Assinado", "Em análise", "Reservado", "Distratado", "Cancelado"];

/** A entrada da lista que corresponde ao valor gravado ("ATIVO" → "Ativo"), ou null. */
export function statusContratoCanonico(v: string | null | undefined): string | null {
  const s = normalizar(v);
  return (s && STATUS_CONTRATO.find((x) => normalizar(x) === s)) || null;
}

export function statusContratoNaLista(v: string | null | undefined): boolean {
  return statusContratoCanonico(v) !== null;
}

/**
 * O status enviado pode ser gravado? Vazio sempre pode; da lista, também.
 * Fora da lista, só se for o MESMO já gravado (salvar a ficha sem mexer não é
 * barrado). Retorna a mensagem de recusa, ou null.
 */
export function recusaDeStatusContrato(
  novo: string | null | undefined,
  anterior: string | null | undefined = null,
): string | null {
  if (!normalizar(novo) || statusContratoNaLista(novo) || normalizar(novo) === normalizar(anterior)) return null;
  return `Status do contrato deve ser um destes: ${STATUS_CONTRATO.join(", ")}.`;
}

/** Limite real de upload (6.9.4): o corpo da Server Action é 12 MB; o arquivo fica em 10 MB. */
export const LIMITE_UPLOAD_MB = 10;
export const LIMITE_UPLOAD_BYTES = LIMITE_UPLOAD_MB * 1024 * 1024;

/** A confirmação digitada corresponde ao nome do cliente (6.1)? */
export function confirmacaoConfere(digitado: string | null | undefined, nome: string): boolean {
  return normalizar(digitado) !== "" && normalizar(digitado) === normalizar(nome);
}

export interface VinculosDoCliente {
  unidadeComContratoAtivo: string | null;
  contasReceber: number;
  documentos: number;
  obrasComoCliente: number;
  recebimentosTerceiros: number;
}

/**
 * Motivos que BLOQUEIAM a exclusão (6.1). Lista vazia = pode excluir. Os dois
 * últimos não estão no texto do prompt: a exclusão os desvincularia em
 * silêncio (FK `set null`), perdendo a relação — mesma natureza das travas
 * pedidas.
 */
export function bloqueiosDeExclusao(v: VinculosDoCliente): string[] {
  const m: string[] = [];
  if (v.unidadeComContratoAtivo)
    m.push(`unidade ${v.unidadeComContratoAtivo} com contrato ativo (distrate ou cancele antes)`);
  if (v.contasReceber > 0) m.push(`${v.contasReceber} conta(s) a receber`);
  if (v.documentos > 0) m.push(`${v.documentos} documento(s) anexado(s)`);
  if (v.obrasComoCliente > 0) m.push(`cliente de ${v.obrasComoCliente} obra(s) em Projetos`);
  if (v.recebimentosTerceiros > 0) m.push(`${v.recebimentosTerceiros} recebimento(s) por terceiro`);
  return m;
}

// ─────────────────────────── Interesse (6.7) ───────────────────────────

export const INTERESSE_MIN = 1;
export const INTERESSE_MAX = 5;

export function interesseNaFaixa(v: number | null | undefined): boolean {
  return v != null && Number.isInteger(v) && v >= INTERESSE_MIN && v <= INTERESSE_MAX;
}

/**
 * O interesse enviado pode ser gravado? Vazio sempre pode; 1 a 5 também. Fora
 * da faixa, só se for o MESMO valor já gravado — quem salva a ficha sem mexer
 * no campo não é barrado, e nada já gravado é convertido. Retorna a mensagem
 * de recusa, ou null.
 */
export function recusaDeInteresse(
  novo: number | null | undefined,
  anterior: number | null | undefined = null,
): string | null {
  if (novo == null || interesseNaFaixa(novo) || novo === anterior) return null;
  return `Interesse vai de ${INTERESSE_MIN} a ${INTERESSE_MAX}.`;
}

// ─────────────────────────── Listagem (6.8) ───────────────────────────

export const CLIENTES_POR_PAGINA = 50;
/** Valor do filtro de status para "sem status". */
export const STATUS_EM_BRANCO = "__vazio__";

export interface FiltrosClientes {
  q: string;
  status: string;
  pagina: number;
}

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function lerFiltrosClientes(params: Record<string, string | string[] | undefined>): FiltrosClientes {
  const pagina = Number.parseInt(primeiro(params.pagina), 10);
  return {
    q: primeiro(params.q).trim().slice(0, 100),
    status: primeiro(params.status).slice(0, 100),
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Termos da busca, normalizados (sem acento, minúsculos). */
export function termosDaBusca(q: string): string[] {
  return normalizar(q).split(/\s+/).filter(Boolean).slice(0, 8);
}

/** Link da listagem com os filtros atuais, mudando só o que for passado. */
export function linkDaListagem(f: FiltrosClientes, muda: Partial<FiltrosClientes> = {}): string {
  const x = { ...f, ...muda };
  const p = new URLSearchParams();
  if (x.q) p.set("q", x.q);
  if (x.status) p.set("status", x.status);
  if (x.pagina > 1) p.set("pagina", String(x.pagina));
  const s = p.toString();
  return s ? `/clientes?${s}` : "/clientes";
}

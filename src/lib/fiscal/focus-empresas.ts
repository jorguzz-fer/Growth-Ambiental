/**
 * Cliente da API de EMPRESAS da Focus NFe (v2), com o token MASTER da conta
 * da plataforma (docs/EMISSAO-NF.md, seção 7).
 *
 * O que a documentação define e este arquivo respeita:
 *  - A API de empresas só existe no host de produção
 *    (`https://api.focusnfe.com.br/v2`). A empresa criada lá vale para os dois
 *    ambientes de emissão e já devolve `token_homologacao` e `token_producao`.
 *  - Autenticação: HTTP Basic com o token como usuário e senha vazia.
 *  - `GET /empresas?cnpj=` acha empresa já cadastrada; `POST /empresas` cria;
 *    `PUT /empresas/{id}` atualiza (inclusive o certificado);
 *    `GET /empresas/{id}` devolve os dados e os tokens.
 *  - `GET /municipios/{codigo_ibge}` diz se a Focus emite NFS-e no município.
 *
 * Segredo nenhum sai daqui: o corpo enviado (com o certificado e as senhas)
 * nunca entra em log, em exceção ou em mensagem; os tokens lidos ficam só na
 * memória do processo, por poucos minutos.
 */
import type { AmbienteFiscal } from "./tipos";
import type { MunicipioFocus } from "./emissor-regras";

const BASE = "https://api.focusnfe.com.br/v2";
const TIMEOUT_MS = 20_000;

export function tokenMaster(): string | null {
  return process.env.FOCUS_NFE_TOKEN_MASTER?.trim() || null;
}

export function masterConfigurado(): boolean {
  return !!tokenMaster();
}

export interface EmpresaFocus {
  id: number | string;
  cnpj?: string | null;
  nome?: string | null;
  habilita_nfse?: boolean;
  certificado_valido_de?: string | null;
  certificado_valido_ate?: string | null;
  certificado_cnpj?: string | null;
  token_homologacao?: string | null;
  token_producao?: string | null;
}

export interface RespostaMaster<T> {
  ok: boolean;
  http: number;
  json: T | Record<string, unknown> | null;
}

async function chamarMaster<T>(metodo: "GET" | "POST" | "PUT", caminho: string, corpo?: unknown): Promise<RespostaMaster<T>> {
  const token = tokenMaster();
  if (!token) return { ok: false, http: 0, json: { mensagem: "Token master da Focus não configurado (FOCUS_NFE_TOKEN_MASTER)." } };
  let resp: Response;
  try {
    resp = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Basic ${Buffer.from(`${token}:`, "utf8").toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    // Mensagem fixa: a exceção do fetch pode carregar a requisição.
    return { ok: false, http: 0, json: { mensagem: "A Focus NFe não respondeu. Tente de novo em alguns minutos." } };
  }
  const bruto = await resp.text();
  let json: T | Record<string, unknown> | null = null;
  if (bruto) {
    try {
      json = JSON.parse(bruto) as T;
    } catch {
      json = { mensagem: resp.status === 401 ? "A Focus recusou o token master." : `Resposta inesperada da Focus (HTTP ${resp.status}).` };
    }
  }
  return { ok: resp.ok, http: resp.status, json };
}

/** Empresa já cadastrada na conta com este CNPJ (só números e letras). */
export async function buscarEmpresaPorCnpj(cnpj: string): Promise<RespostaMaster<EmpresaFocus[]> & { empresa: EmpresaFocus | null }> {
  const r = await chamarMaster<EmpresaFocus[]>("GET", `/empresas?cnpj=${encodeURIComponent(cnpj)}`);
  const lista = r.ok && Array.isArray(r.json) ? (r.json as EmpresaFocus[]) : [];
  return { ...r, empresa: lista.find((e) => (e.cnpj ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase() === cnpj.toUpperCase()) ?? null };
}

export function consultarEmpresa(id: string): Promise<RespostaMaster<EmpresaFocus>> {
  return chamarMaster<EmpresaFocus>("GET", `/empresas/${encodeURIComponent(id)}`);
}

/** Cria (sem id) ou atualiza (com id) a empresa. */
export function salvarEmpresa(id: string | null, corpo: Record<string, unknown>): Promise<RespostaMaster<EmpresaFocus>> {
  esquecerTokens(id);
  return id
    ? chamarMaster<EmpresaFocus>("PUT", `/empresas/${encodeURIComponent(id)}`, corpo)
    : chamarMaster<EmpresaFocus>("POST", "/empresas", corpo);
}

export function consultarMunicipio(codigoIbge: string): Promise<RespostaMaster<MunicipioFocus>> {
  return chamarMaster<MunicipioFocus>("GET", `/municipios/${encodeURIComponent(codigoIbge)}`);
}

// ── Tokens de emissão da empresa ──────────────────────────────────────────

/** 10 min: o bastante para uma sessão de emissão sem perguntar à Focus a cada clique. */
const VALIDADE_DO_CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { homologacao: string | null; producao: string | null; ate: number }>();

export function esquecerTokens(id: string | null | undefined) {
  if (id) cache.delete(String(id));
}

/**
 * O token de emissão da empresa no ambiente pedido, lido da Focus com o token
 * master. Nunca é gravado no banco.
 */
export async function tokenDaEmpresa(id: string, ambiente: AmbienteFiscal): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const agora = Date.now();
  let t = cache.get(id);
  if (!t || t.ate < agora) {
    const r = await consultarEmpresa(id);
    if (!r.ok || !r.json) {
      if (r.http === 404) return { ok: false, error: "A empresa não existe mais na Focus NFe. O proprietário precisa ativar a emissão de novo em Configurações → Empresa." };
      if (r.http === 401) return { ok: false, error: "A Focus recusou o token master da plataforma (FOCUS_NFE_TOKEN_MASTER)." };
      return { ok: false, error: "Não foi possível falar com a Focus NFe agora. Tente de novo em alguns minutos." };
    }
    const e = r.json as EmpresaFocus;
    t = { homologacao: e.token_homologacao?.trim() || null, producao: e.token_producao?.trim() || null, ate: agora + VALIDADE_DO_CACHE_MS };
    cache.set(id, t);
  }
  const token = ambiente === "producao" ? t.producao : t.homologacao;
  return token ? { ok: true, token } : { ok: false, error: `A Focus não devolveu o token de ${ambiente === "producao" ? "produção" : "homologação"} desta empresa.` };
}

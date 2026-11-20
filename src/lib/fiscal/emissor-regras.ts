/**
 * Regras PURAS da ativação do emissor de NFS-e pela própria empresa
 * (docs/EMISSAO-NF.md, seção 7). Nada aqui fala com a rede nem com o banco.
 *
 * A empresa preenche o cadastro fiscal, envia o certificado A1 com a senha e
 * clica em "Ativar emissão". O servidor cadastra (ou atualiza) a empresa na
 * conta da Focus NFe da plataforma, com o token master. O certificado e as
 * senhas vão direto para a Focus: o app não guarda nenhum deles.
 */
import { isSuperAdmin } from "@/lib/tenant/superadmin";
import { normalizarCep, normalizarCnpj, type EmitenteFiscal } from "@/lib/calc/emitente-fiscal";

// ── Quem ativa ─────────────────────────────────────────────────────────────

/**
 * Só o proprietário da empresa e os operadores da plataforma (decisão de
 * 19/11/2026): quem tem o certificado A1 assina pela empresa.
 */
export function podeAtivarEmissao(i: { role: string; email: string | null | undefined }): boolean {
  return i.role === "owner" || isSuperAdmin(i.email);
}

// ── Certificado ───────────────────────────────────────────────────────────

/** Um A1 tem poucos KB; 200 KB é folga de sobra e barra arquivo errado. */
export const TAMANHO_MAXIMO_CERTIFICADO = 200 * 1024;

/** Recusa (texto) do arquivo do certificado; null = aceito. */
export function recusaDoCertificado(nome: string, tamanho: number): string | null {
  if (!/\.(pfx|p12)$/i.test(nome.trim())) return "O certificado precisa ser o arquivo .pfx ou .p12 do certificado A1.";
  if (tamanho <= 0) return "O arquivo do certificado está vazio.";
  if (tamanho > TAMANHO_MAXIMO_CERTIFICADO) return "Arquivo grande demais para um certificado A1 (até 200 KB).";
  return null;
}

export interface AvisoDoCertificado {
  tom: "success" | "warning" | "danger" | "neutral";
  texto: string;
  /** dias até vencer (negativo = vencido); null = validade desconhecida. */
  dias: number | null;
}

const DIA = 24 * 60 * 60 * 1000;

/** O certificado vence em 30 dias ou menos: avisa; vencido: a emissão para. */
export function avisoDoCertificado(validoAte: Date | null | undefined, hoje: Date = new Date()): AvisoDoCertificado {
  if (!validoAte || Number.isNaN(validoAte.getTime())) return { tom: "neutral", texto: "Validade do certificado não informada pela Focus.", dias: null };
  const dias = Math.floor((validoAte.getTime() - hoje.getTime()) / DIA);
  const data = validoAte.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  if (dias < 0) return { tom: "danger", texto: `Certificado vencido em ${data}. Envie o certificado novo para voltar a emitir.`, dias };
  if (dias <= 30) return { tom: "warning", texto: `Certificado vence em ${dias} dia(s), em ${data}. Envie o novo antes disso.`, dias };
  return { tom: "success", texto: `Certificado válido até ${data}.`, dias };
}

// ── O que vai para a Focus ─────────────────────────────────────────────────

/** Nosso regime → código da Focus (1 Simples, 2 excesso de sublimite, 3 normal, 4 MEI). */
export function regimeDaFocus(regime: string | null | undefined): number | undefined {
  switch (regime) {
    case "SIMPLES":
      return 1;
    case "SIMPLES_EXCESSO":
      return 2;
    case "LUCRO_PRESUMIDO":
    case "LUCRO_REAL":
      return 3;
    case "MEI":
      return 4;
    default:
      return undefined;
  }
}

export interface ExtrasDoEmissor {
  certificadoBase64?: string;
  senhaCertificado?: string;
  loginPrefeitura?: string;
  senhaPrefeitura?: string;
  serieRps?: string;
  proximoNumeroRps?: string;
}

const apenasDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");
const texto = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t ? t : undefined;
};

/**
 * Corpo do POST/PUT `/v2/empresas`. Campo vazio fica FORA (não vai em branco):
 * num PUT, mandar vazio apagaria o que já está lá. A NFS-e municipal é a
 * habilitada (`habilita_nfse`); a NFS-e Nacional fica de fora por ora.
 */
export function corpoDaEmpresaFocus(e: EmitenteFiscal, x: ExtrasDoEmissor = {}): Record<string, unknown> {
  const corpo: Record<string, unknown> = {
    nome: texto(e.razaoSocial),
    nome_fantasia: texto(e.nomeFantasia),
    cnpj: normalizarCnpj(e.cnpj) ?? undefined,
    inscricao_municipal: apenasDigitos(e.inscricaoMunicipal) || undefined,
    inscricao_estadual: apenasDigitos(e.inscricaoEstadual) || undefined,
    regime_tributario: regimeDaFocus(e.regimeTributario),
    logradouro: texto(e.logradouro),
    numero: texto(e.numero),
    complemento: texto(e.complemento),
    bairro: texto(e.bairro),
    municipio: texto(e.municipio),
    uf: texto(e.uf)?.toUpperCase(),
    cep: normalizarCep(e.cep) ?? undefined,
    telefone: texto(e.telefone),
    email: texto(e.email),
    habilita_nfse: true,
    arquivo_certificado_base64: x.certificadoBase64 || undefined,
    senha_certificado: x.certificadoBase64 ? x.senhaCertificado : undefined,
    login_responsavel: texto(x.loginPrefeitura),
    senha_responsavel: x.senhaPrefeitura ? x.senhaPrefeitura : undefined,
    serie_nfse_producao: texto(x.serieRps),
    serie_nfse_homologacao: texto(x.serieRps),
    proximo_numero_nfse_producao: texto(x.proximoNumeroRps),
  };
  for (const k of Object.keys(corpo)) if (corpo[k] === undefined) delete corpo[k];
  return corpo;
}

/** Campos que nunca podem aparecer em log, auditoria ou mensagem. */
export const CAMPOS_SECRETOS = ["arquivo_certificado_base64", "senha_certificado", "senha_responsavel"] as const;

// ── O município ───────────────────────────────────────────────────────────

export interface MunicipioFocus {
  codigo_municipio?: string;
  nome_municipio?: string;
  sigla_uf?: string;
  nfse_habilitada?: boolean;
  requer_certificado_nfse?: boolean | null;
  possui_ambiente_homologacao_nfse?: boolean | null;
  possui_cancelamento_nfse?: boolean | null;
  provedor_nfse?: string | null;
  status_nfse?: string | null;
}

const STATUS_DO_MUNICIPIO: Record<string, string> = {
  ativo: "ativa",
  fora_do_ar: "fora do ar na prefeitura",
  pausado: "pausada pela Focus",
  em_implementacao: "em implantação na Focus",
  em_reimplementacao: "em reimplantação na Focus",
  inativo: "inativa",
  nao_implementado: "não implantada na Focus",
};

/**
 * O que o município permite. Bloqueia só quando a Focus diz que não emite lá;
 * situação passageira (fora do ar, pausado) vira aviso — a ativação vale, a
 * emissão espera a prefeitura voltar.
 */
export function avaliarMunicipio(m: MunicipioFocus): { bloqueio: string | null; avisos: string[] } {
  const nome = [m.nome_municipio, m.sigla_uf].filter(Boolean).join("/") || "O município";
  const status = (m.status_nfse ?? "").toLowerCase();
  if (m.nfse_habilitada === false || status === "inativo" || status === "nao_implementado")
    return { bloqueio: `${nome}: a Focus NFe não emite NFS-e neste município (${STATUS_DO_MUNICIPIO[status] ?? "não habilitado"}).`, avisos: [] };
  const avisos: string[] = [];
  if (status && status !== "ativo") avisos.push(`${nome}: emissão ${STATUS_DO_MUNICIPIO[status] ?? status} agora. A ativação vale, mas a nota só sai quando voltar.`);
  if (m.possui_ambiente_homologacao_nfse === false) avisos.push(`${nome} não tem ambiente de homologação: nota de teste pode não ser possível.`);
  if (m.possui_cancelamento_nfse === false) avisos.push(`${nome} não aceita cancelamento pela API: cancelar exige ir ao portal da prefeitura.`);
  return { bloqueio: null, avisos };
}

/**
 * O certificado é obrigatório na primeira ativação, exceto quando a Focus
 * diz que o município não usa certificado E a empresa informou o login e a
 * senha da prefeitura.
 */
export function faltaCertificado(i: {
  primeiraAtivacao: boolean;
  temCertificado: boolean;
  municipio: MunicipioFocus | null;
  temLoginPrefeitura: boolean;
}): string | null {
  if (!i.primeiraAtivacao || i.temCertificado) return null;
  if (i.municipio?.requer_certificado_nfse === false && i.temLoginPrefeitura) return null;
  return "Envie o certificado A1 (.pfx ou .p12) e a senha dele.";
}

// ── Erros da Focus em português de tela ───────────────────────────────────

const NOME_DO_CAMPO: Record<string, string> = {
  arquivo_certificado_base64: "Certificado",
  senha_certificado: "Senha do certificado",
  cnpj: "CNPJ",
  nome: "Razão social",
  inscricao_municipal: "Inscrição municipal",
  regime_tributario: "Regime tributário",
  cep: "CEP",
  municipio: "Município",
  login_responsavel: "Login da prefeitura",
  senha_responsavel: "Senha da prefeitura",
};

/**
 * Mensagem legível de uma recusa da Focus. Só usa `mensagem` e `campo` da
 * resposta — nunca o corpo enviado (que tem o certificado e as senhas).
 */
export function mensagemDaRecusa(json: unknown, http: number): string {
  const j = (json ?? {}) as { mensagem?: string; erros?: { mensagem?: string; campo?: string }[] };
  if (http === 401) return "A Focus recusou o token master da plataforma. Confira FOCUS_NFE_TOKEN_MASTER no servidor.";
  const erros = (j.erros ?? [])
    .map((e) => {
      const msg = (e.mensagem ?? "").trim();
      if (!msg) return null;
      const campo = e.campo ? NOME_DO_CAMPO[e.campo] : undefined;
      // A Focus repete o nome técnico do campo no começo da mensagem.
      const limpa = msg.replace(/^arquivo certificado base64\s*/i, "");
      return campo ? `${campo}: ${limpa}` : limpa;
    })
    .filter((m): m is string => !!m);
  if (erros.length) return erros.join(" · ");
  if (j.mensagem) return j.mensagem;
  return `A Focus não aceitou o cadastro (HTTP ${http}).`;
}

// ── Pode emitir? ──────────────────────────────────────────────────────────

export interface EmissorAtivo {
  empresaIdProvedor: string;
  cnpj: string;
  certificadoValidoAte: Date | null;
}

/**
 * Recusa (texto) da emissão para esta empresa; null = pode emitir.
 *
 * Dois caminhos: o emissor ativado pela tela (o normal) e, só para não
 * quebrar quem já estava configurado, o modo antigo de um CNPJ só
 * (`NFSE_TENANT_ID` + `FOCUS_NFE_TOKEN_*`).
 */
export function recusaDaEmissao(i: {
  tenantId: string;
  cnpjDoCadastro: string | null | undefined;
  emissor: EmissorAtivo | null;
  masterConfigurado: boolean;
  tenantLegado: string | null | undefined;
  hoje?: Date;
}): string | null {
  if (i.emissor) {
    if (!i.masterConfigurado) return "A conta da Focus NFe da plataforma não está configurada no servidor (FOCUS_NFE_TOKEN_MASTER).";
    if (normalizarCnpj(i.cnpjDoCadastro) !== i.emissor.cnpj)
      return "O CNPJ do cadastro fiscal mudou depois da ativação. O proprietário precisa ativar a emissão de novo em Configurações → Empresa.";
    const c = avisoDoCertificado(i.emissor.certificadoValidoAte, i.hoje);
    if (c.dias !== null && c.dias < 0) return `${c.texto} (Configurações → Empresa)`;
    return null;
  }
  if ((i.tenantLegado ?? "").trim() === i.tenantId) return null;
  return "A emissão de NFS-e ainda não foi ativada para esta empresa. O proprietário ativa em Configurações → Empresa.";
}

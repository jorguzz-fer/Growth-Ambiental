"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { logAudit } from "@/lib/audit";
import { emitenteDoTenant } from "@/lib/nota-servico";
import { checarProntidaoFiscal, normalizarCnpj } from "@/lib/calc/emitente-fiscal";
import {
  avaliarMunicipio,
  corpoDaEmpresaFocus,
  faltaCertificado,
  mensagemDaRecusa,
  podeAtivarEmissao,
  recusaDoCertificado,
  type MunicipioFocus,
} from "@/lib/fiscal/emissor-regras";
import { buscarEmpresaPorCnpj, consultarMunicipio, esquecerTokens, masterConfigurado, salvarEmpresa, type EmpresaFocus } from "@/lib/fiscal/focus-empresas";
import { emissorDoTenant } from "@/lib/fiscal/emissor";

export type ResultadoDoEmissor = { ok: true; avisos: string[] } | { ok: false; error: string };

const campo = (fd: FormData, nome: string) => {
  const v = fd.get(nome);
  return typeof v === "string" ? v.trim() : "";
};

const dataOuNull = (v: string | null | undefined) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Ativa (ou atualiza) a emissão de NFS-e da empresa (docs/EMISSAO-NF.md, 7).
 *
 * Cadastra a empresa na conta da Focus NFe da plataforma — ou atualiza a que
 * já existe com o mesmo CNPJ — com os dados do cadastro fiscal, o certificado
 * A1 e, quando o município pede, o login da prefeitura. O certificado e as
 * senhas vão direto para a Focus e não ficam no app, nem em log, nem na
 * auditoria. Só o proprietário e os operadores da plataforma ativam.
 */
export async function ativarEmissaoNfse(formData: FormData): Promise<ResultadoDoEmissor> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  if (!podeAtivarEmissao({ role: ctx.role, email: ctx.userEmail }))
    return { ok: false, error: "Só o proprietário da empresa ativa a emissão de nota fiscal." };
  if (!masterConfigurado()) return { ok: false, error: "A conta da Focus NFe da plataforma ainda não está configurada no servidor (FOCUS_NFE_TOKEN_MASTER)." };

  const tenantId = ctx.tenant.id;
  const emitente = emitenteDoTenant(ctx.tenant);
  const faltando = checarProntidaoFiscal(emitente).filter((p) => p.severidade === "bloqueio");
  if (faltando.length)
    return { ok: false, error: `Complete o cadastro fiscal antes de ativar: ${[...new Set(faltando.map((p) => p.label))].join(", ")}.` };
  const cnpj = normalizarCnpj(ctx.tenant.cnpj)!;

  // ── O formulário ──
  const arquivo = formData.get("certificado");
  const temCertificado = arquivo instanceof File && arquivo.size > 0;
  const senhaCertificado = typeof formData.get("senhaCertificado") === "string" ? String(formData.get("senhaCertificado")) : "";
  if (temCertificado) {
    const recusa = recusaDoCertificado(arquivo.name, arquivo.size);
    if (recusa) return { ok: false, error: recusa };
    if (!senhaCertificado) return { ok: false, error: "Informe a senha do certificado." };
  }
  const loginPrefeitura = campo(formData, "loginPrefeitura");
  const senhaPrefeitura = typeof formData.get("senhaPrefeitura") === "string" ? String(formData.get("senhaPrefeitura")) : "";
  if (senhaPrefeitura && !loginPrefeitura) return { ok: false, error: "Informe o login da prefeitura junto com a senha." };
  const serieRps = campo(formData, "serieRps");
  if (serieRps && !/^[0-9A-Za-z]{1,10}$/.test(serieRps)) return { ok: false, error: "Série do RPS: só letras e números, até 10." };
  const proximoNumeroRps = campo(formData, "proximoNumeroRps");
  if (proximoNumeroRps && !/^\d{1,15}$/.test(proximoNumeroRps)) return { ok: false, error: "Próximo número do RPS: só números." };

  const atual = await emissorDoTenant(tenantId);

  // ── O município ──
  const mun = await consultarMunicipio(emitente.codigoMunicipio!);
  if (!mun.ok) {
    if (mun.http === 404) return { ok: false, error: `A Focus NFe não conhece o município de código IBGE ${emitente.codigoMunicipio}. Confira o código no cadastro fiscal.` };
    return { ok: false, error: `Não foi possível consultar o município na Focus NFe. ${mensagemDaRecusa(mun.json, mun.http)}` };
  }
  const municipio = mun.json as MunicipioFocus;
  const avaliacao = avaliarMunicipio(municipio);
  if (avaliacao.bloqueio) return { ok: false, error: avaliacao.bloqueio };
  const falta = faltaCertificado({
    primeiraAtivacao: !atual || atual.cnpj !== cnpj,
    temCertificado,
    municipio,
    temLoginPrefeitura: !!loginPrefeitura && !!senhaPrefeitura,
  });
  if (falta) return { ok: false, error: falta };

  // ── A empresa na Focus: a do vínculo, ou a que já existe com este CNPJ ──
  let empresaId: string | null = atual && atual.cnpj === cnpj ? atual.empresaIdProvedor : null;
  if (!empresaId) {
    const busca = await buscarEmpresaPorCnpj(cnpj);
    if (!busca.ok && busca.http !== 404) return { ok: false, error: `Não foi possível consultar a Focus NFe. ${mensagemDaRecusa(busca.json, busca.http)}` };
    empresaId = busca.empresa ? String(busca.empresa.id) : null;
  }
  if (empresaId) {
    const [outro] = await db
      .select({ tenantId: schema.nfseEmissores.tenantId })
      .from(schema.nfseEmissores)
      .where(and(eq(schema.nfseEmissores.provedor, "focus"), eq(schema.nfseEmissores.empresaIdProvedor, empresaId), ne(schema.nfseEmissores.tenantId, tenantId)))
      .limit(1);
    if (outro) return { ok: false, error: "Este CNPJ já está com a emissão ativada para outra empresa do sistema." };
  }

  const certificadoBase64 = temCertificado ? Buffer.from(await arquivo.arrayBuffer()).toString("base64") : undefined;
  const corpo = corpoDaEmpresaFocus(emitente, {
    certificadoBase64,
    senhaCertificado: temCertificado ? senhaCertificado : undefined,
    loginPrefeitura,
    senhaPrefeitura,
    serieRps,
    proximoNumeroRps,
  });
  const r = await salvarEmpresa(empresaId, corpo);
  if (!r.ok || !r.json) return { ok: false, error: mensagemDaRecusa(r.json, r.http) };
  const e = r.json as EmpresaFocus;
  const idSalvo = e.id !== undefined && e.id !== null ? String(e.id) : empresaId;
  if (!idSalvo) return { ok: false, error: "A Focus NFe aceitou o cadastro mas não devolveu o identificador da empresa. Tente de novo." };
  esquecerTokens(idSalvo);

  const agora = new Date();
  const valores = {
    provedor: "focus",
    empresaIdProvedor: idSalvo,
    cnpj,
    certificadoValidoDe: dataOuNull(e.certificado_valido_de),
    certificadoValidoAte: dataOuNull(e.certificado_valido_ate),
    certificadoCnpj: e.certificado_cnpj ? normalizarCnpj(e.certificado_cnpj) : null,
    municipioStatus: municipio.status_nfse ?? null,
    atualizadoPor: ctx.userId,
    atualizadoEm: agora,
  };
  try {
    await db
      .insert(schema.nfseEmissores)
      .values({ tenantId, ...valores, ativadoPor: ctx.userId, ativadoEm: agora })
      .onConflictDoUpdate({
        target: schema.nfseEmissores.tenantId,
        // CNPJ novo é ativação nova; mesmo CNPJ é atualização.
        set: atual && atual.cnpj !== cnpj ? { ...valores, ativadoPor: ctx.userId, ativadoEm: agora } : valores,
      });
  } catch {
    return { ok: false, error: "Este CNPJ já está com a emissão ativada para outra empresa do sistema." };
  }

  // Auditoria SEM segredo: nem certificado, nem senha, nem login da prefeitura.
  await logAudit({
    tenantId,
    userId: ctx.userId,
    action: atual ? "nfse.emissor.atualizar" : "nfse.emissor.ativar",
    entity: "nfse_emissor",
    entityId: tenantId,
    meta: {
      cnpj,
      empresaIdProvedor: idSalvo,
      novaEmpresaNaFocus: !empresaId,
      certificadoEnviado: temCertificado,
      certificadoValidoAte: valores.certificadoValidoAte?.toISOString() ?? null,
      loginPrefeituraEnviado: !!loginPrefeitura,
      municipioStatus: valores.municipioStatus,
    },
  });
  revalidatePath("/empresa");
  revalidatePath("/notasfiscais");
  return { ok: true, avisos: avaliacao.avisos };
}

/**
 * Emissor de NFS-e da empresa (docs/EMISSAO-NF.md, seção 7): quem pode emitir
 * e com qual token. As telas usam `situacaoDaEmissao` (só banco, sem rede); o
 * envio, a consulta, o cancelamento e o download usam `credencialDaEmissao`,
 * que lê o token da Focus na hora.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { tokenFocus } from "./focus";
import { masterConfigurado, tokenDaEmpresa } from "./focus-empresas";
import { recusaDaEmissao } from "./emissor-regras";
import type { AmbienteFiscal } from "./tipos";

export type Emissor = typeof schema.nfseEmissores.$inferSelect;

export async function emissorDoTenant(tenantId: string): Promise<Emissor | null> {
  const [e] = await db.select().from(schema.nfseEmissores).where(eq(schema.nfseEmissores.tenantId, tenantId)).limit(1);
  return e ?? null;
}

export interface SituacaoDaEmissao {
  emissor: Emissor | null;
  /** "tela" = ativado pela empresa; "legado" = NFSE_TENANT_ID; null = não emite. */
  modo: "tela" | "legado" | null;
  /** texto do que impede a emissão; null = pode. */
  recusa: string | null;
  /** há credencial para este ambiente (sem consultar a rede). */
  configurado: (ambiente: AmbienteFiscal) => boolean;
}

export async function situacaoDaEmissao(tenant: { id: string; cnpj: string | null }): Promise<SituacaoDaEmissao> {
  const emissor = await emissorDoTenant(tenant.id);
  const master = masterConfigurado();
  const legado = process.env.NFSE_TENANT_ID;
  const recusa = recusaDaEmissao({
    tenantId: tenant.id,
    cnpjDoCadastro: tenant.cnpj,
    emissor: emissor && { empresaIdProvedor: emissor.empresaIdProvedor, cnpj: emissor.cnpj, certificadoValidoAte: emissor.certificadoValidoAte },
    masterConfigurado: master,
    tenantLegado: legado,
  });
  const modo = emissor ? "tela" : (legado ?? "").trim() === tenant.id ? "legado" : null;
  return {
    emissor,
    modo,
    recusa,
    configurado: (ambiente) => (modo === "tela" ? master : modo === "legado" ? !!tokenFocus(ambiente) : false),
  };
}

/** O token para falar com a Focus sobre as notas desta empresa, neste ambiente. */
export async function credencialDaEmissao(
  tenant: { id: string; cnpj: string | null },
  ambiente: AmbienteFiscal,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const s = await situacaoDaEmissao(tenant);
  if (s.recusa) return { ok: false, error: s.recusa };
  if (s.modo === "tela" && s.emissor) return tokenDaEmpresa(s.emissor.empresaIdProvedor, ambiente);
  const token = tokenFocus(ambiente);
  return token ? { ok: true, token } : { ok: false, error: "O token da Focus NFe deste ambiente não está configurado no servidor." };
}

/**
 * Para o download do PDF/XML de uma nota já emitida: vale mesmo se a emissão
 * nova estiver parada (certificado vencido, CNPJ trocado) — o arquivo da nota
 * antiga continua sendo da empresa.
 */
export async function credencialDeLeitura(tenantId: string, ambiente: AmbienteFiscal): Promise<string | null> {
  const emissor = await emissorDoTenant(tenantId);
  if (emissor && masterConfigurado()) {
    const r = await tokenDaEmpresa(emissor.empresaIdProvedor, ambiente);
    return r.ok ? r.token : null;
  }
  return (process.env.NFSE_TENANT_ID ?? "").trim() === tenantId ? tokenFocus(ambiente) : null;
}

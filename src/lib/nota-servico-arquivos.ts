import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { baixarArquivoDaNota, resolverAmbiente } from "@/lib/fiscal/focus";
import { credencialDeLeitura } from "@/lib/fiscal/emissor";
import { getObjectBytes, isR2Configured, putObject } from "@/lib/storage/r2";
import { nomeDoArquivoDaNota, urlSegura } from "@/lib/nota-servico";

/**
 * Prompt AG, 5.5 — o PDF e o XML da nota emitida.
 *
 * A cópia fica no NOSSO armazenamento (R2), numa chave própria por nota, com a
 * marca de homologação no nome. Depois de guardada, o download não depende da
 * Focus. Sem R2 configurado, o arquivo é entregue direto da Focus, sem cópia.
 */
export type TipoDeArquivo = "pdf" | "xml";

type Nota = typeof schema.notasServico.$inferSelect;

export const temArquivos = (status: string) => status === "autorizada" || status === "cancelada";

export function chaveDoArquivo(n: Pick<Nota, "tenantId" | "id" | "ambiente" | "numero">, tipo: TipoDeArquivo): string {
  return `nfse/${n.tenantId}/${n.id}/${nomeDoArquivoDaNota(n, tipo)}`;
}

/** De onde a Focus entrega o arquivo; null = ainda não há. */
export function origemNoProvedor(n: Pick<Nota, "urlDanfse" | "caminhoXml">, tipo: TipoDeArquivo): string | null {
  if (tipo === "pdf") return urlSegura(n.urlDanfse);
  const c = (n.caminhoXml ?? "").trim();
  return c.startsWith("/") && !c.startsWith("//") ? c : urlSegura(c);
}

const CONTENT_TYPE: Record<TipoDeArquivo, string> = { pdf: "application/pdf", xml: "application/xml" };

/**
 * Os bytes do arquivo: da cópia, se houver; senão da Focus — guardando a
 * cópia quando o R2 existe. A primeira cópia guardada vale (não sobrescreve).
 */
export async function arquivoDaNota(n: Nota, tipo: TipoDeArquivo): Promise<{ bytes: Uint8Array; contentType: string; nome: string } | null> {
  const nome = nomeDoArquivoDaNota(n, tipo);
  const chave = tipo === "pdf" ? n.pdfKey : n.xmlKey;
  const r2 = isR2Configured();
  if (chave && r2) return { bytes: await getObjectBytes(chave), contentType: CONTENT_TYPE[tipo], nome };
  const origem = origemNoProvedor(n, tipo);
  if (!origem) return null;
  const { bytes } = await baixarArquivoDaNota(resolverAmbiente(n.ambiente), origem, await tokenDoArquivo(n));
  if (r2) await guardar(n, tipo, bytes);
  return { bytes, contentType: CONTENT_TYPE[tipo], nome };
}

/**
 * O token da empresa DONA da nota. Sem ele, só o arquivo público (o PDF vem
 * por link aberto) pode ser baixado: o token de outra empresa nunca é usado.
 */
async function tokenDoArquivo(n: Pick<Nota, "tenantId" | "ambiente">): Promise<string | null> {
  return credencialDeLeitura(n.tenantId, resolverAmbiente(n.ambiente));
}

async function guardar(n: Nota, tipo: TipoDeArquivo, bytes: Uint8Array) {
  const chave = chaveDoArquivo(n, tipo);
  await putObject(chave, bytes, CONTENT_TYPE[tipo]);
  const coluna = tipo === "pdf" ? schema.notasServico.pdfKey : schema.notasServico.xmlKey;
  const gravou = await db
    .update(schema.notasServico)
    .set(tipo === "pdf" ? { pdfKey: chave } : { xmlKey: chave })
    .where(and(eq(schema.notasServico.id, n.id), eq(schema.notasServico.tenantId, n.tenantId), isNull(coluna)))
    .returning({ id: schema.notasServico.id });
  if (gravou.length)
    await db.insert(schema.notaServicoEventos).values({
      tenantId: n.tenantId,
      notaId: n.id,
      tipo: "arquivo_guardado",
      ref: n.ref,
      status: n.status,
      mensagem: `${tipo.toUpperCase()} guardado: ${nomeDoArquivoDaNota(n, tipo)}`,
    });
}

/**
 * Logo depois da autorização: tenta guardar o PDF e o XML. Melhor esforço —
 * falhar aqui não desfaz nada; o download tenta de novo depois.
 */
export async function guardarArquivosDaNota(tenantId: string, notaId: string): Promise<void> {
  if (!isR2Configured()) return;
  const [n] = await db
    .select()
    .from(schema.notasServico)
    .where(and(eq(schema.notasServico.id, notaId), eq(schema.notasServico.tenantId, tenantId)))
    .limit(1);
  if (!n || !temArquivos(n.status)) return;
  for (const tipo of ["pdf", "xml"] as const) {
    if ((tipo === "pdf" ? n.pdfKey : n.xmlKey) || !origemNoProvedor(n, tipo)) continue;
    try {
      const { bytes } = await baixarArquivoDaNota(resolverAmbiente(n.ambiente), origemNoProvedor(n, tipo)!, await tokenDoArquivo(n));
      await guardar(n, tipo, bytes);
    } catch {
      // segue: o download tenta de novo
    }
  }
}

import JSZip from "jszip";

/**
 * Texto de um DOCX (Word) para a Cris ler: só o corpo do documento
 * (`word/document.xml`), com parágrafos e células de tabela em linhas.
 * Sem macros, sem imagens, sem nada executável — e o texto é DADO, nunca
 * instrução. Recusa ZIP grande demais descompactado (bomba de compressão).
 */
export const TIPO_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const MAX_TEXTO_DOCX = 150_000;
const MAX_XML_BYTES = 20 * 1024 * 1024;

const entidades: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const desescapar = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : entidades[e.toLowerCase()],
  );

/** XML do corpo → texto: parágrafo e fim de célula viram quebra; tabulação vira " | ". */
export function textoDoXmlDoWord(xml: string): string {
  return desescapar(
    xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:tc>/g, " | ")
      .replace(/<\/w:p>|<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function textoDoDocx(bytes: Uint8Array): Promise<{ ok: true; texto: string; cortado: boolean } | { ok: false; erro: string }> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return { ok: false, erro: "Arquivo DOCX inválido." };
  }
  const doc = zip.file("word/document.xml");
  if (!doc) return { ok: false, erro: "DOCX sem corpo de documento." };
  const tamanho = (doc as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
  if (tamanho != null && tamanho > MAX_XML_BYTES) return { ok: false, erro: "Documento grande demais para leitura." };
  const xml = await doc.async("string");
  if (xml.length > MAX_XML_BYTES) return { ok: false, erro: "Documento grande demais para leitura." };
  const texto = textoDoXmlDoWord(xml);
  return { ok: true, texto: texto.slice(0, MAX_TEXTO_DOCX), cortado: texto.length > MAX_TEXTO_DOCX };
}

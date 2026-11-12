import "server-only";
import { isAiConfigured } from "@/lib/ai/despesa-extract";
import { extractExtratoFromDocument, extractExtratoFromText } from "@/lib/ai/extrato-extract";
import { comUsoDeIa } from "@/lib/ai/uso";
import { linhasDaPlanilha } from "@/lib/extrato-planilha";
import { ehPlanilha } from "@/lib/cris";

/**
 * Prompt AT §8.3.1 — a ferramenta `ler_extrato` da Cris roda no servidor o
 * MESMO leitor do diálogo de importação: planilha (XLSX/CSV) pelo
 * `linhasDaPlanilha`; PDF ou imagem pela leitura de extrato (IA, ou texto do
 * PDF sem IA), como `extractExtratoPdf`. As linhas vão para a TELA (o diálogo
 * de importação), não para a conversa: o limite de resposta do modelo não
 * corta extrato grande.
 */
export interface LinhaLida {
  data: string;
  descricao: string;
  doc: string;
  valor: number;
}

export async function lerExtratoDoAnexo(
  anexo: { tipo: string; base64: string; nome: string },
  quem: { tenantId: string; userId: string | null },
): Promise<{ linhas: LinhaLida[]; saldoFinal: number | null } | { erro: string }> {
  const bytes = Buffer.from(anexo.base64, "base64");
  if (ehPlanilha(anexo.tipo)) {
    const r = linhasDaPlanilha(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    if (r.rows.length === 0) return { erro: `nenhum lançamento com valor reconhecido (${r.ignorados} linhas ignoradas): confira as colunas de Data e Valor` };
    return { linhas: r.rows.map((x) => ({ data: x.data, descricao: x.descricao, doc: x.doc, valor: x.valor })), saldoFinal: null };
  }
  const u8 = new Uint8Array(bytes);
  let res;
  if (isAiConfigured()) res = await comUsoDeIa({ tenantId: quem.tenantId, userId: quem.userId, operacao: "extrato" }, () => extractExtratoFromDocument(u8, anexo.tipo));
  else if (anexo.tipo === "application/pdf") res = await comUsoDeIa({ tenantId: quem.tenantId, userId: quem.userId, operacao: "extrato" }, () => extractExtratoFromText(u8));
  else return { erro: "leitura de imagem exige a IA configurada" };
  if (res.movimentos.length === 0) return { erro: "não identifiquei movimentações no arquivo (pode ser escaneado sem texto)" };
  return { linhas: res.movimentos.map((m) => ({ data: m.data, descricao: m.descricao, doc: m.doc ?? "", valor: m.valor })), saldoFinal: res.saldoFinal };
}

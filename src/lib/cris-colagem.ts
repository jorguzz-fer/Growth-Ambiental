import { MAX_ANEXO_BYTES, MAX_MENSAGEM, TIPOS_DE_ANEXO } from "@/lib/cris";

/**
 * Prompt AQ §5 (Revisão 4) — colar e soltar no chat da Cris. Módulo PURO.
 *
 * Antes o campo era um `<input>` de uma linha: texto com várias linhas perdia
 * as quebras, imagem e arquivo colados não faziam nada, e o que passava de
 * 1.500 caracteres era cortado sem aviso.
 */

/** As mesmas mensagens do botão 📎 (um caminho, uma regra). */
export const ERRO_ANEXO_GRANDE = "Arquivo maior que 4 MB.";
export const ERRO_ANEXO_TIPO = "Envie PDF, imagem (PNG, JPG, WEBP) ou planilha de extrato (XLSX, CSV).";

/** Valida um arquivo para virar anexo, como o 📎: tipo aceito e até 4 MB. */
export function validarAnexo(arquivo: { type: string; size: number }): string | null {
  if (arquivo.size > MAX_ANEXO_BYTES) return ERRO_ANEXO_GRANDE;
  if (!(TIPOS_DE_ANEXO as readonly string[]).includes(arquivo.type)) return ERRO_ANEXO_TIPO;
  return null;
}

/** Um item da área de transferência (ou do arrastar e soltar), já lido. */
export interface ItemColado {
  /** "string" para texto, "file" para arquivo ou imagem. */
  kind: "string" | "file";
  /** Tipo MIME ("text/plain", "image/png", "application/pdf"…). */
  type: string;
  /** Só arquivo: tamanho em bytes. */
  size?: number;
}

export type Colagem =
  /** Texto: o navegador cola normalmente no campo. */
  | { tipo: "texto" }
  /** Arquivo aceito: vira o anexo da mensagem (o índice é o do item). */
  | { tipo: "anexo"; indice: number }
  /** Arquivo recusado, com a mesma mensagem do 📎. */
  | { tipo: "recusado"; motivo: string };

/**
 * Decide o que fazer com o que foi colado.
 *
 * - Sem arquivo: texto.
 * - Com arquivo E texto de várias linhas ou com tabulação: TEXTO. O Excel põe
 *   na área de transferência a tabela como texto e também uma imagem dela;
 *   quem cola uma tabela quer a tabela.
 * - Com arquivo (print, imagem copiada, arquivo copiado do explorador, que às
 *   vezes vem com o nome dele como texto de uma linha): o arquivo, se for de
 *   tipo aceito e até 4 MB; senão, recusa com o motivo.
 */
export function classificarColagem(itens: readonly ItemColado[], textoColado = ""): Colagem {
  const indice = itens.findIndex((i) => i.kind === "file");
  if (indice < 0) return { tipo: "texto" };
  if (/[\t\n]/.test(textoColado.replace(/\r?\n$/, ""))) return { tipo: "texto" };
  const erro = validarAnexo({ type: itens[indice].type, size: itens[indice].size ?? 0 });
  return erro ? { tipo: "recusado", motivo: erro } : { tipo: "anexo", indice };
}

/**
 * Prompt AQ §5.3 — limite da mensagem, com aviso. Corta no MESMO limite do
 * servidor (`historicoDaCris`) e diz quantos caracteres ficaram de fora.
 */
export function limitarMensagem(texto: string, max: number = MAX_MENSAGEM): { texto: string; foraDoLimite: number } {
  if (texto.length <= max) return { texto, foraDoLimite: 0 };
  return { texto: texto.slice(0, max), foraDoLimite: texto.length - max };
}

export function avisoDoLimite(foraDoLimite: number, max: number = MAX_MENSAGEM): string | null {
  if (foraDoLimite <= 0) return null;
  const n = foraDoLimite.toLocaleString("pt-BR");
  return `A mensagem passa do limite de ${max.toLocaleString("pt-BR")} caracteres: ${n} ${foraDoLimite === 1 ? "caractere ficou" : "caracteres ficaram"} de fora.`;
}

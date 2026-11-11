"use client";

import { useLayoutEffect, useRef } from "react";
import { avisoDoLimite, classificarColagem, limitarMensagem, type ItemColado } from "@/lib/cris-colagem";

/**
 * Prompt AQ §5 (Revisão 4) — o campo de mensagem da Cris (chat e caixa dos
 * painéis). Antes era um `<input>` de uma linha.
 *
 * - `<textarea>` que cresce de 1 a 6 linhas (rolagem dali em diante).
 *   Enter envia; Shift+Enter quebra a linha. Quebras e tabulações coladas
 *   ficam como estão.
 * - Colar imagem ou arquivo vira o anexo, com as validações do 📎
 *   (`classificarColagem`). Tabela do Excel colada continua texto.
 * - Passou do limite: corta no mesmo limite do servidor e AVISA quantos
 *   caracteres ficaram de fora (antes cortava calado).
 */
export type AvisoDoCampo = { texto: string; tom: "erro" | "info" } | null;

export function itensDaTransferencia(dt: DataTransfer): { itens: ItemColado[]; arquivos: (File | null)[] } {
  const itens: ItemColado[] = [];
  const arquivos: (File | null)[] = [];
  for (const it of Array.from(dt.items)) {
    const f = it.kind === "file" ? it.getAsFile() : null;
    itens.push({ kind: it.kind === "file" ? "file" : "string", type: it.type || f?.type || "", size: f?.size });
    arquivos.push(f);
  }
  // Arrastar do explorador às vezes não preenche `items`, só `files`.
  if (!itens.some((i) => i.kind === "file")) {
    for (const f of Array.from(dt.files)) {
      itens.push({ kind: "file", type: f.type, size: f.size });
      arquivos.push(f);
    }
  }
  return { itens, arquivos };
}

/** Arquivo colado ou solto → anexo (ou aviso), pela mesma regra. Devolve true se tratou. */
export function tratarTransferencia(dt: DataTransfer, onAnexo: (f: File) => void, onAviso: (a: AvisoDoCampo) => void): boolean {
  const { itens, arquivos } = itensDaTransferencia(dt);
  const c = classificarColagem(itens, dt.getData("text/plain"));
  if (c.tipo === "texto") return false;
  if (c.tipo === "recusado") onAviso({ texto: c.motivo, tom: "erro" });
  else {
    const f = arquivos[c.indice];
    if (f) onAnexo(f);
  }
  return true;
}

export function CampoDeMensagem({
  valor,
  onValor,
  onEnviar,
  onAnexo,
  onAviso,
  placeholder,
  rotulo,
  className,
}: {
  valor: string;
  onValor: (v: string) => void;
  onEnviar: () => void;
  onAnexo: (f: File) => void;
  onAviso: (a: AvisoDoCampo) => void;
  placeholder?: string;
  rotulo: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Altura automática: de 1 a 6 linhas; dali em diante, rolagem.
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    const linha = parseFloat(getComputedStyle(ta).lineHeight) || 18;
    const borda = ta.offsetHeight - ta.clientHeight;
    const vertical = parseFloat(getComputedStyle(ta).paddingTop) + parseFloat(getComputedStyle(ta).paddingBottom);
    const max = linha * 6 + vertical + borda;
    ta.style.height = `${Math.min(ta.scrollHeight + borda, max)}px`;
    ta.style.overflowY = ta.scrollHeight + borda > max ? "auto" : "hidden";
  }, [valor]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={valor}
      onChange={(e) => {
        const { texto, foraDoLimite } = limitarMensagem(e.target.value);
        onValor(texto);
        onAviso(foraDoLimite ? { texto: avisoDoLimite(foraDoLimite)!, tom: "erro" } : null);
      }}
      onPaste={(e) => {
        if (tratarTransferencia(e.clipboardData, onAnexo, onAviso)) e.preventDefault();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onEnviar();
        }
      }}
      placeholder={placeholder}
      aria-label={rotulo}
      data-cris-campo
      className={className ?? "min-w-0 flex-1 resize-none rounded-[8px] border border-[var(--color-line)] bg-transparent px-3 py-2 text-[13px] leading-[18px] outline-none focus:border-[var(--color-accent2)]"}
    />
  );
}

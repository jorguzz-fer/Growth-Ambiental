"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importVersionData, type ImportResult } from "@/lib/actions/version-io";

/** Dropzone para importar a planilha preenchida na versão indicada. */
export function ImportVersion({
  versionId,
  locked,
}: {
  versionId: string;
  locked: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  function handle(file: File) {
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("versionId", versionId);
    start(async () => {
      try {
        const r = await importVersionData(fd);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setResult(r.result);
        router.refresh();
      } catch {
        setError("Falha na importação. Nada foi gravado.");
      }
    });
  }

  if (locked) {
    return (
      <p className="text-sm text-[var(--color-warning)]">
        Versão congelada — descongele para importar dados.
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      <div
        onClick={() => !pending && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handle(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
          drag
            ? "border-[var(--color-accent2)] bg-[var(--color-accent4)]"
            : "border-[var(--color-accent2)]/25 bg-[var(--color-surface2)] hover:border-[var(--color-accent2)]/50"
        }`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-accent2)] text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        </div>
        <span className="text-sm font-medium text-[var(--color-accent)]">
          {pending ? "Importando…" : "Selecionar planilha preenchida"}
        </span>
        <span className="text-xs text-[var(--color-ink3)]">
          .xlsx ou .xls · modelo da planilha da versão (abas Parametros e Despesas)
        </span>
      </div>

      {result && (
        <p className="mt-3 rounded-[8px] bg-[#d1fae5] px-3 py-2 text-[13px] text-[#065f46]">
          Importado: {result.despesas} despesa(s).
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-[8px] bg-[#fee2e2] px-3 py-2 text-[13px] text-[#991b1b]">
          {error}
        </p>
      )}
    </div>
  );
}

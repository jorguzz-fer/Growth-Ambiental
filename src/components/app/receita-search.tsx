"use client";

import { useMemo, useRef, useState } from "react";
import { brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { registroCasa } from "@/lib/busca";

/** Uma receita pesquisável — serve tanto para conta a receber quanto recebível. */
export interface ReceitaBuscavel {
  id: string;
  /** "conta" = conta a receber lançada; "recebivel" = derivado do plano de venda. */
  origem: "conta" | "recebivel";
  descricao: string | null;
  clienteNome: string | null;
  projectName: string | null;
  unitCode: string | null;
  tipo: string | null;
  valor: number;
  /** vencimento/previsto "MM/DD/YYYY". */
  vencimento: string | null;
  status: string | null;
}

/**
 * Busca de receitas em Contas a Receber. Mesmo motor da busca de despesas:
 * casa por similaridade em vários campos (cliente, descrição, unidade, projeto,
 * tipo, status e valor), aceita vários termos em qualquer ordem e filtra a cada
 * caractere digitado.
 *
 * Cobre as DUAS origens da tela: as contas a receber lançadas e os recebíveis
 * derivados dos planos de pagamento das vendas.
 */
export function ReceitaSearch({ rows }: { rows: ReceitaBuscavel[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => {
    if (!q.trim()) return [];
    return rows
      .filter((r) =>
        registroCasa(
          q,
          [
            r.descricao,
            r.clienteNome,
            r.projectName,
            r.unitCode,
            r.tipo,
            r.status,
            r.vencimento,
          ],
          [r.valor],
        ),
      )
      .slice(0, 60);
  }, [q, rows]);

  const total = resultados.reduce((a, r) => a + r.valor, 0);
  const abrir = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };
  const fechar = () => {
    setOpen(false);
    setQ("");
  };

  return (
    <>
      <div className="relative w-full">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink3)]"
        >
          🔍
        </span>
        <input
          readOnly
          onFocus={abrir}
          onClick={abrir}
          placeholder="Buscar receita por cliente, contrato, descrição, projeto ou valor…"
          className="w-full cursor-pointer rounded-[8px] border border-[var(--color-accent2)]/25 bg-white py-2 pl-9 pr-3 text-[13px] text-[var(--color-ink2)] placeholder:text-[var(--color-ink4)] hover:bg-[var(--color-surface2)] focus:border-[var(--color-accent2)] focus:outline-none"
        />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[8vh]"
          onClick={fechar}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[12px] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-accent2)]/12 px-4 py-3">
              <span aria-hidden className="text-[var(--color-ink3)]">🔍</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && fechar()}
                placeholder="Cliente, unidade, descrição, projeto, tipo ou valor…"
                className="w-full bg-transparent text-[14px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink4)]"
              />
              <button
                onClick={fechar}
                className="text-[var(--color-ink3)] hover:text-[var(--color-ink)]"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto">
              {q.trim().length === 0 ? (
                <p className="px-4 py-8 text-center text-[12.5px] text-[var(--color-ink3)]">
                  Digite para buscar entre {rows.length} receitas (contas lançadas e
                  recebíveis das vendas).
                </p>
              ) : resultados.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12.5px] text-[var(--color-ink3)]">
                  Nenhuma receita encontrada para “{q}”.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-accent2)]/8">
                  {resultados.map((r) => (
                    <li
                      key={`${r.origem}-${r.id}`}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <Badge tone={r.origem === "conta" ? "accent" : "neutral"}>
                        {r.origem === "conta" ? "Conta" : "Venda"}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-ink)]">
                        {r.clienteNome ?? "—"}
                        {r.unitCode ? (
                          <span className="text-[var(--color-ink3)]"> · {r.unitCode}</span>
                        ) : null}
                        {r.descricao ? (
                          <span className="text-[var(--color-ink3)]"> · {r.descricao}</span>
                        ) : null}
                      </span>
                      {r.status && <Badge tone="neutral">{r.status}</Badge>}
                      <span className="w-24 shrink-0 text-right font-[family-name:var(--font-mono)] text-[12.5px] text-[var(--color-success)]">
                        {brl0(r.valor)}
                      </span>
                      <span className="w-20 shrink-0 text-right font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink4)]">
                        {r.vencimento ? dateBR(r.vencimento) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {resultados.length > 0 && (
              <div className="border-t border-[var(--color-accent2)]/12 px-4 py-2 text-[11px] text-[var(--color-ink3)]">
                {resultados.length} resultado(s) · total {brl0(total)}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

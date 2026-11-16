import * as React from "react";

/**
 * Cabeçalho de página: eyebrow (obra · versão), título e subtítulo.
 *
 * O eyebrow e o subtítulo ficaram ocultos por um tempo "para um visual mais
 * clean" — e as telas continuaram passando os dois. O Prompt J (3.1) e o
 * Prompt B mandam voltar a exibir: sem o eyebrow, o usuário não sabe que está
 * vendo a versão Atual. Só apresentação; quem não passa nada continua igual.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  /** Contexto acima do título, ex.: "OBRA 28 · Atual". */
  eyebrow?: string;
  title: string;
  /** Resumo abaixo do título, ex.: "12 unidades · VGV R$ 4.800.000". */
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    // GA-13 H1 — título e filtros lado a lado só quando cabem: o título tem
    // largura mínima (22rem) e os filtros quebram para a linha de baixo (e
    // quebram entre si) em vez de espremer o título palavra por palavra.
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3" data-page-header>
      <div className="min-w-0 flex-[1_1_22rem]">
        {eyebrow && (
          <p className="mb-1.5 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.1em] text-[var(--color-ink3)]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--color-ink)]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-[var(--color-ink2)]">{subtitle}</p>}
      </div>
      {/* Prompt PDF: os seletores não vão para o PDF; o título e o recorte, sim. */}
      {actions && <div className="flex min-w-0 max-w-full flex-[0_1_auto] flex-wrap items-center gap-2 print:hidden" data-page-header-acoes>{actions}</div>}
    </header>
  );
}

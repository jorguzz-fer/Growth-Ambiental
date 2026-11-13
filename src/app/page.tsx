import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink3)]">
        Tools for Growth · TFG
      </span>
      <h1 className="mt-3 font-[family-name:var(--font-serif)] text-4xl text-[var(--color-ink)] sm:text-5xl">
        Growth{" "}
        <span className="text-[var(--color-brand-segmento)]">Ambiental</span>
      </h1>
      <p className="mt-4 max-w-xl text-[var(--color-ink2)]">
        Gestão financeira, FP&amp;A e BI para consultorias ambientais. Receita
        por contrato e projeto, custos de campo e de laboratório, conciliação
        de caixa e relatórios gerenciais — em uma única ferramenta.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
          Abrir o app
        </Link>
      </div>
      <p className="mt-10 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink4)]">
        Fase 0 — Scaffold · Next.js 15 · Drizzle · Auth.js · Coolify
      </p>
    </main>
  );
}

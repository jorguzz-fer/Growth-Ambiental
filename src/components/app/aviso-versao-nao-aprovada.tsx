import Link from "next/link";

/** GA-1 §3 — uma linha: o que ficou fora dos números por não estar Aprovado, e onde aprovar. */
export function AvisoVersaoNaoAprovada({ aviso }: { aviso: { texto: string; href: string } | null }) {
  if (!aviso) return null;
  return (
    <p className="mb-3 rounded-[8px] border border-[#f59e0b]/40 bg-[#fffbeb] px-3 py-2 text-[12.5px] text-[#92400e]" data-aviso-nao-aprovada>
      {aviso.texto}{" "}
      <Link href={aviso.href} className="font-medium underline">
        Aprovar em Planejamento →
      </Link>
    </p>
  );
}

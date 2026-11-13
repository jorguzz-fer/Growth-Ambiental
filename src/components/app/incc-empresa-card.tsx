"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adotarSerieDaObraComoDaEmpresa } from "@/lib/actions/incc";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

/**
 * Prompt Q2 (BQ2-1) — escolher a série do INCC da empresa: adota a série de
 * uma obra. As séries das obras ficam guardadas. Com a chave desligada,
 * nenhum número muda; com ela ligada, todas as obras passam a ler esta série.
 */
export function InccEmpresaCard({
  projetos,
  projetoAtual,
  mesesDaEmpresa,
  emUso,
  podeAdotar,
}: {
  projetos: { id: string; nome: string }[];
  projetoAtual: string | null;
  mesesDaEmpresa: number;
  emUso: boolean;
  podeAdotar: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [obra, setObra] = useState(projetoAtual ?? projetos[0]?.id ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const nome = projetos.find((p) => p.id === obra)?.nome ?? "a obra";

  const adotar = () => {
    setMsg(null);
    const aviso =
      mesesDaEmpresa > 0
        ? `Substituir a série da empresa pela série de ${nome}?${emUso ? " Todas as obras passam a ler a série nova." : ""} As séries das obras não mudam.`
        : `Adotar a série de ${nome} como a série da empresa?${emUso ? " Todas as obras passam a ler esta série." : ""} As séries das obras não mudam.`;
    if (!window.confirm(aviso)) return;
    start(async () => {
      const r = await adotarSerieDaObraComoDaEmpresa(obra, mesesDaEmpresa > 0);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setMsg({ ok: true, texto: `Série da empresa ${r.substituiu ? "substituída" : "adotada"}: ${r.meses} mês(es), copiados de ${nome}.` });
      router.refresh();
    });
  };

  return (
    <div data-incc-empresa className="mb-4 rounded-[10px] border border-[var(--color-line)] bg-white px-4 py-3 text-[12.5px] text-[var(--color-ink2)]">
      <p>
        <strong className="text-[var(--color-ink)]">Índice da empresa.</strong>{" "}
        {emUso
          ? "Em uso: todas as obras leem esta série, e a tela edita a série da empresa. As séries de cada obra ficam guardadas."
          : mesesDaEmpresa > 0
            ? `Série da empresa adotada (${mesesDaEmpresa} meses). Ela passa a valer para todos os projetos quando a plataforma ligar a chave "INCC da empresa". Até lá, cada projeto usa a própria série.`
            : "O índice de reajuste pode ser um só por empresa. Escolha o projeto cuja série vira a da empresa; as séries dos projetos ficam guardadas. Nenhum número muda até a plataforma ligar a chave."}
      </p>
      {podeAdotar && projetos.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select value={obra} onChange={(e) => setObra(e.target.value)} aria-label="Obra cuja série vira a da empresa">
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" disabled={pending || !obra} onClick={adotar}>
            {pending ? "Adotando…" : mesesDaEmpresa > 0 ? "Substituir pela série deste projeto" : "Adotar a série deste projeto"}
          </Button>
        </div>
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}

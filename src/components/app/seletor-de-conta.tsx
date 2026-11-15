"use client";

import { useRouter } from "next/navigation";
import { Label, Select } from "@/components/ui/input";

/**
 * GA-11 §3.1 — o seletor de conta da Conciliação de Caixa, sempre visível na
 * barra de filtros. Escolhe UMA conta (ou cartão) ou todas. A escolha mora na
 * URL (`?conta=`), então recarregar ou compartilhar o link a mantém.
 */
export interface OpcaoDoSeletor {
  id: string;
  nome: string;
  grupo?: string;
}

export function SeletorDeConta({ rotulo, rotuloTodas, opcoes, selecionada, hrefs }: { rotulo: string; rotuloTodas: string; opcoes: OpcaoDoSeletor[]; selecionada: string; hrefs: Record<string, string> }) {
  const router = useRouter();
  const grupos = [...new Set(opcoes.map((o) => o.grupo ?? ""))];
  return (
    <div data-seletor-conta>
      <Label htmlFor="seletor-conta">{rotulo}</Label>
      <Select id="seletor-conta" aria-label={rotulo} value={selecionada} onChange={(e) => router.push(hrefs[e.target.value] ?? hrefs[""])} className="min-w-[240px]">
        <option value="">{rotuloTodas}</option>
        {grupos.length > 1
          ? grupos.map((g) => (
              <optgroup key={g} label={g}>
                {opcoes
                  .filter((o) => (o.grupo ?? "") === g)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
              </optgroup>
            ))
          : opcoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
      </Select>
    </div>
  );
}

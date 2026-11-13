"use client";

import { useState } from "react";
import { Label, Select } from "@/components/ui/input";
import { obrasDaUnidade, type UnidadeDaObra } from "@/lib/clientes-regras";

/**
 * Unidade do comprador escolhida dentro de uma obra (Prompt M, 6.6). A obra
 * só filtra a lista — não é gravada. A unidade já vinculada aparece sempre,
 * mesmo quando não é da obra escolhida, e a tela diz de onde ela é: a
 * divergência fica à vista em vez de ser corrigida em silêncio.
 */
export function UnidadePorObra({
  obras,
  unidades,
  vinculada,
  obraInicial,
  label,
}: {
  obras: { id: string; name: string }[];
  unidades: UnidadeDaObra[];
  vinculada: string | null;
  obraInicial: string;
  label: string;
}) {
  const [obra, setObra] = useState(obraInicial);
  const daObra = unidades.filter((u) => u.projectId === obra).map((u) => u.code);
  const foraDaObra = !!vinculada && !daObra.includes(vinculada);
  const ondeEsta = obrasDaUnidade(unidades, vinculada)
    .map((id) => obras.find((o) => o.id === id)?.name)
    .filter(Boolean);
  const aviso = !foraDaObra
    ? null
    : ondeEsta.length
      ? `A unidade vinculada (${vinculada}) é de ${ondeEsta.join(", ")}, não do projeto escolhido.`
      : `A unidade vinculada (${vinculada}) não existe em nenhum projeto cadastrado.`;

  return (
    <>
      <div>
        <Label>Projeto da unidade</Label>
        <Select value={obra} onChange={(e) => setObra(e.target.value)} aria-label="Projeto da unidade">
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>{label}</Label>
        {/* A chave remonta o select ao trocar a obra, sem perder a vinculada. */}
        <Select key={obra} name="unitCode" defaultValue={vinculada ?? ""}>
          <option value="">—</option>
          {foraDaObra && (
            <option value={vinculada!}>
              {vinculada} · vinculada, {ondeEsta.length ? "de outro projeto" : "sem projeto"}
            </option>
          )}
          {daObra.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {aviso && <p className="mt-1 text-[11.5px] leading-snug text-[var(--color-warning)]">{aviso}</p>}
      </div>
    </>
  );
}

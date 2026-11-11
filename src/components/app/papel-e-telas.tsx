"use client";

import { useMemo, useState } from "react";
import { Label, Select } from "@/components/ui/input";
import { useCrisFormulario } from "@/components/app/cris-contexto";
import type { TelaSugerida } from "@/lib/telas-sugeridas";

/**
 * Prompt AI2 — ao escolher o papel do usuário novo, a tela sugere as telas
 * que o papel alcança por padrão; a pessoa marca ou desmarca. Vai no
 * formulário como `role` e `telas` (ids marcados). As ações finas (criar,
 * editar, excluir) continuam na Gestão de Acessos.
 *
 * A Cris pode escolher o papel e as telas (sem nome nem e-mail); quem
 * adiciona é o botão da tela.
 */
export function PapelETelas({ papeis, sugestoes, padrao = "membro" }: { papeis: readonly string[]; sugestoes: Record<string, TelaSugerida[]>; padrao?: string }) {
  const [papel, setPapel] = useState(padrao);
  const sugeridasDe = (p: string) => new Set((sugestoes[p] ?? []).filter((t) => t.sugerida).map((t) => t.id));
  const [marcadas, setMarcadas] = useState<Set<string>>(() => sugeridasDe(padrao));
  const [crisMsg, setCrisMsg] = useState<string | null>(null);
  const telas = useMemo(() => sugestoes[papel] ?? [], [sugestoes, papel]);
  const porModulo = useMemo(() => {
    const m = new Map<string, TelaSugerida[]>();
    for (const t of telas) m.set(t.modulo, [...(m.get(t.modulo) ?? []), t]);
    return [...m.entries()];
  }, [telas]);

  const trocarPapel = (p: string) => {
    setPapel(p);
    setMarcadas(sugeridasDe(p));
  };
  const alternar = (id: string) =>
    setMarcadas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const todasAsTelas = useMemo(() => [...new Map(Object.values(sugestoes).flat().map((t) => [t.id, t])).values()], [sugestoes]);
  useCrisFormulario(
    {
      id: "usuario-novo",
      titulo: "Novo usuário: papel e telas (nome e e-mail são digitados na tela)",
      campos: [
        { nome: "papel", rotulo: "Papel", tipo: "opcao", opcoes: [...papeis] },
        { nome: "incluir", rotulo: "Telas a incluir além da sugestão do papel", tipo: "texto", dica: `nomes separados por vírgula, entre: ${todasAsTelas.map((t) => t.label).join(", ")}` },
        { nome: "tirar", rotulo: "Telas a tirar da sugestão do papel", tipo: "texto", dica: "nomes separados por vírgula" },
      ],
    },
    (p) => {
      const v = p.valores;
      const novoPapel = v.papel && papeis.includes(v.papel) ? v.papel : papel;
      const porNome = new Map((sugestoes[novoPapel] ?? []).map((t) => [t.label.toLowerCase(), t.id]));
      const ids = (s?: string) => (s ?? "").split(/[,;\n]/).map((x) => porNome.get(x.trim().toLowerCase())).filter((x): x is string => !!x);
      const base = novoPapel === papel ? new Set(marcadas) : sugeridasDe(novoPapel);
      for (const id of ids(v.incluir)) base.add(id);
      for (const id of ids(v.tirar)) base.delete(id);
      setPapel(novoPapel);
      setMarcadas(base);
      setCrisMsg("A Cris escolheu o papel e as telas. Digite nome e e-mail, confira as telas e clique em Adicionar.");
    },
  );

  return (
    <>
      <div>
        <Label>Papel</Label>
        <Select name="role" value={papel} onChange={(e) => trocarPapel(e.target.value)}>
          {papeis.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>
      <input type="hidden" name="telas" value={[...marcadas].join(",")} />
      <div data-telas-sugeridas className="col-span-2 rounded-[10px] border border-[var(--color-line)] p-3 sm:col-span-5">
        {crisMsg && (
          <p data-cris-preencheu role="status" className="mb-2 text-[12.5px] text-[var(--color-accent)]">
            {crisMsg}
          </p>
        )}
        {telas.length === 0 ? (
          <p className="text-[12px] text-[var(--color-ink3)]">Este papel tem acesso total: não há telas a escolher.</p>
        ) : (
          <>
            <p className="mb-2 text-[12px] text-[var(--color-ink2)]">
              <strong className="text-[var(--color-ink)]">Telas sugeridas para {papel}</strong> ({marcadas.size} marcadas). Marque ou desmarque. Tela marcada fora da sugestão entra com ver
              {papel === "contador" ? " (o contador é só leitura)" : ", criar e editar"}; excluir e as telas de dado sensível ficam na Gestão de Acessos.
            </p>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
              {porModulo.map(([modulo, lista]) => (
                <fieldset key={modulo}>
                  <legend className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-ink3)]">{modulo}</legend>
                  {lista.map((t) => (
                    <label key={t.id} className="flex items-center gap-1.5 text-[12px] text-[var(--color-ink2)]">
                      <input type="checkbox" checked={marcadas.has(t.id)} onChange={() => alternar(t.id)} data-tela={t.id} />
                      {t.label}
                      {t.sugerida && !marcadas.has(t.id) && <span className="text-[10.5px] text-[var(--color-ink3)]">(sugerida)</span>}
                      {!t.sugerida && marcadas.has(t.id) && <span className="text-[10.5px] text-[var(--color-accent2)]">(a mais)</span>}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

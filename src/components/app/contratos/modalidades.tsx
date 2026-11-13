"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarModalidade } from "@/lib/actions/contratos";
import { Mensagem, useAcao } from "./comum";

/** Modalidades de serviço da empresa: criar, renomear, desativar e reativar. */
export function ModalidadesEditor({ modalidades, podeEditar }: { modalidades: { id: string; nome: string; ativo: boolean; uso: number }[]; podeEditar: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  const [nova, setNova] = useState("");
  const [nomes, setNomes] = useState<Record<string, string>>(Object.fromEntries(modalidades.map((m) => [m.id, m.nome])));
  return (
    <div>
      <table className="w-full text-[13px]">
        <tbody>
          {modalidades.map((m) => (
            <tr key={m.id} className={`border-t border-[var(--color-line)] ${m.ativo ? "" : "opacity-60"}`}>
              <td className="py-1.5 pr-2">{podeEditar ? <Input value={nomes[m.id] ?? m.nome} onChange={(e) => setNomes({ ...nomes, [m.id]: e.target.value })} aria-label="Nome da modalidade" /> : m.nome}</td>
              <td className="py-1.5 pr-2 text-[12px] text-[var(--color-ink3)]">{m.uso} contrato(s)</td>
              <td className="py-1.5 pr-2 text-[12px]">{m.ativo ? "Ativa" : "Desativada"}</td>
              {podeEditar && (
                <td className="py-1.5">
                  <div className="flex gap-1">
                    {nomes[m.id] !== m.nome && (
                      <Button size="sm" disabled={pendente} onClick={() => rodar(() => salvarModalidade({ id: m.id, nome: nomes[m.id], ativo: m.ativo }), "Modalidade renomeada.")}>
                        Salvar nome
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={pendente} onClick={() => rodar(() => salvarModalidade({ id: m.id, nome: m.nome, ativo: !m.ativo }), m.ativo ? "Modalidade desativada." : "Modalidade reativada.")}>
                      {m.ativo ? "Desativar" : "Reativar"}
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {podeEditar && (
        <div className="mt-3 flex gap-2">
          <Input placeholder="Nova modalidade" value={nova} onChange={(e) => setNova(e.target.value)} aria-label="Nova modalidade" />
          <Button disabled={!nova.trim() || pendente} onClick={() => rodar(() => salvarModalidade({ nome: nova }), "Modalidade criada.", () => setNova(""))}>
            Criar
          </Button>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

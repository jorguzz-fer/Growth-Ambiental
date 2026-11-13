"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { aplicarModeloDeImplantacao, excluirEtapaDeImplantacao, planejarTreinamentosDoPerfil, salvarEtapaDeImplantacao, salvarTreinamento, type DadosDaEtapa } from "@/lib/actions/implantacao";
import { GRUPOS_DA_IMPLANTACAO, PERFIS_DE_TREINAMENTO, ROTULO_STATUS_ETAPA, ROTULO_STATUS_TREINAMENTO, STATUS_DA_ETAPA, STATUS_DO_TREINAMENTO, type StatusDaEtapa } from "@/lib/implantacao-regras";

export interface EtapaDaTela {
  id: string;
  grupo: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  responsavel: string | null;
  previsto: string | null;
  realizado: string | null;
  status: string;
  dependeDe: string | null;
  observacoes: string | null;
  evidencia: string | null;
}
export interface TreinamentoDaTela {
  id: string;
  perfil: string;
  tema: string;
  participante: string | null;
  data: string | null;
  status: string;
  pendencias: string | null;
}

const COR: Record<string, string> = {
  concluida: "bg-[#dcfce7] text-[#166534]",
  em_andamento: "bg-[#dbeafe] text-[#1e40af]",
  planejada: "bg-[#f1f5f9] text-[#334155]",
  aguardando_cliente: "bg-[#fef3c7] text-[#92400e]",
  bloqueada: "bg-[#fee2e2] text-[#991b1b]",
  nao_iniciada: "bg-[#f8fafc] text-[#64748b]",
};
const th = "px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink3)]";
const td = "px-2 py-1.5 align-top";

function useAcao() {
  const router = useRouter();
  const [pendente, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const rodar = (f: () => Promise<{ ok: true; aviso?: string } | { ok: false; error: string }>, sucesso: string, depois?: () => void) =>
    start(async () => {
      const r = await f();
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setMsg({ ok: true, texto: r.aviso ?? sucesso });
      depois?.();
      router.refresh();
    });
  return { pendente, msg, rodar };
}

const VAZIA: DadosDaEtapa = { grupo: "A", codigo: "", titulo: "", descricao: "", responsavel: "", previsto: "", realizado: "", status: "nao_iniciada", dependeDe: "", observacoes: "", evidencia: "" };

export function ImplantacaoManager({ etapas, treinamentos, podeEditar }: { etapas: EtapaDaTela[]; treinamentos: TreinamentoDaTela[]; podeEditar: boolean }) {
  const { pendente, msg, rodar } = useAcao();
  const [edit, setEdit] = useState<DadosDaEtapa | null>(null);
  const [trein, setTrein] = useState({ perfil: "financeiro", tema: "", participante: "", data: "", status: "planejado", pendencias: "" });
  const grupos = [...new Set([...Object.keys(GRUPOS_DA_IMPLANTACAO), ...etapas.map((e) => e.grupo)])];
  const set = (k: keyof DadosDaEtapa, v: string) => setEdit((x) => (x ? { ...x, [k]: v } : x));

  return (
    <div className="space-y-5">
      {msg && (
        <p role="status" className={`text-[12.5px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
          {msg.texto}
        </p>
      )}
      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={pendente} onClick={() => rodar(() => aplicarModeloDeImplantacao(), "Modelo aplicado.")}>
            Aplicar o modelo padrão (A a H)
          </Button>
          <Button size="sm" variant="outline" disabled={pendente} onClick={() => setEdit({ ...VAZIA })}>
            Nova etapa
          </Button>
        </div>
      )}

      {edit && (
        <div className="rounded-[10px] border border-dashed border-[var(--color-line)] p-3" data-form-etapa>
          <p className="mb-2 text-[12.5px] font-medium">{edit.id ? `Editar etapa ${edit.codigo}` : "Nova etapa"}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <div>
              <Label>Grupo</Label>
              <Select value={edit.grupo} onChange={(e) => set("grupo", e.target.value)} aria-label="Grupo">
                {grupos.map((g) => (
                  <option key={g} value={g}>
                    {GRUPOS_DA_IMPLANTACAO[g] ?? g}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Código</Label>
              <Input value={edit.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="ex.: C4" aria-label="Código" />
            </div>
            <div className="sm:col-span-2">
              <Label>Título</Label>
              <Input value={edit.titulo} onChange={(e) => set("titulo", e.target.value)} aria-label="Título" />
            </div>
            <div className="sm:col-span-4">
              <Label>Descrição</Label>
              <Input value={edit.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} aria-label="Descrição" />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={edit.responsavel ?? ""} onChange={(e) => set("responsavel", e.target.value)} aria-label="Responsável" />
            </div>
            <div>
              <Label>Previsto (MM/DD/AAAA)</Label>
              <Input value={edit.previsto ?? ""} onChange={(e) => set("previsto", e.target.value)} aria-label="Data prevista" />
            </div>
            <div>
              <Label>Realizado (MM/DD/AAAA)</Label>
              <Input value={edit.realizado ?? ""} onChange={(e) => set("realizado", e.target.value)} aria-label="Data realizada" />
            </div>
            <div>
              <Label>Situação</Label>
              <Select value={edit.status ?? "nao_iniciada"} onChange={(e) => set("status", e.target.value)} aria-label="Situação">
                {STATUS_DA_ETAPA.map((s) => (
                  <option key={s} value={s}>
                    {ROTULO_STATUS_ETAPA[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Depende de</Label>
              <Select value={edit.dependeDe ?? ""} onChange={(e) => set("dependeDe", e.target.value)} aria-label="Depende de">
                <option value="">— nenhuma —</option>
                {etapas
                  .filter((e) => e.codigo !== edit.codigo)
                  .map((e) => (
                    <option key={e.id} value={e.codigo}>
                      {e.codigo} · {e.titulo}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Label>Evidência (obrigatória para concluir)</Label>
              <Input value={edit.evidencia ?? ""} onChange={(e) => set("evidencia", e.target.value)} placeholder="documento, link ou relatório que comprova" aria-label="Evidência" />
            </div>
            <div className="sm:col-span-4">
              <Label>Observações (motivo, quando bloqueada ou aguardando cliente)</Label>
              <Input value={edit.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} aria-label="Observações" />
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={pendente} onClick={() => rodar(() => salvarEtapaDeImplantacao(edit), "Etapa salva.", () => setEdit(null))}>
              Salvar
            </Button>
            <Button size="sm" variant="outline" disabled={pendente} onClick={() => setEdit(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {etapas.length === 0 ? (
        <p className="text-[13px] text-[var(--color-ink3)]">Nenhuma etapa ainda. {podeEditar ? "Aplique o modelo padrão e ajuste à empresa." : ""}</p>
      ) : (
        grupos
          .filter((g) => etapas.some((e) => e.grupo === g))
          .map((g) => (
            <div key={g} data-grupo-implantacao={g}>
              <h3 className="mb-1 text-[13px] font-semibold">{GRUPOS_DA_IMPLANTACAO[g] ?? g}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr>
                      <th className={th}>Etapa</th>
                      <th className={th}>Responsável</th>
                      <th className={th}>Previsto</th>
                      <th className={th}>Realizado</th>
                      <th className={th}>Depende de</th>
                      <th className={th}>Situação</th>
                      <th className={th}>Evidência / observação</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody>
                    {etapas
                      .filter((e) => e.grupo === g)
                      .map((e) => (
                        <tr key={e.id} className="border-t border-[var(--color-line)]">
                          <td className={td}>
                            <span className="font-mono text-[11.5px]">{e.codigo}</span> {e.titulo}
                            {e.descricao && <p className="text-[11.5px] text-[var(--color-ink3)]">{e.descricao}</p>}
                          </td>
                          <td className={td}>{e.responsavel ?? "—"}</td>
                          <td className={td}>{e.previsto ?? "—"}</td>
                          <td className={td}>{e.realizado ?? "—"}</td>
                          <td className={td}>{e.dependeDe ?? "—"}</td>
                          <td className={td}>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${COR[e.status] ?? ""}`}>{ROTULO_STATUS_ETAPA[e.status as StatusDaEtapa] ?? e.status}</span>
                          </td>
                          <td className={`${td} max-w-[260px] break-words`}>{[e.evidencia, e.observacoes].filter(Boolean).join(" · ") || "—"}</td>
                          <td className={`${td} whitespace-nowrap`}>
                            {podeEditar && (
                              <>
                                <button type="button" className="text-[12px] text-[var(--color-accent2)] hover:underline" onClick={() => setEdit({ ...e })}>
                                  Editar
                                </button>{" "}
                                <button
                                  type="button"
                                  className="text-[12px] text-[var(--color-danger)] hover:underline"
                                  onClick={() => {
                                    if (confirm(`Excluir a etapa ${e.codigo}?`)) rodar(() => excluirEtapaDeImplantacao(e.id), "Etapa excluída.");
                                  }}
                                >
                                  Excluir
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
      )}

      <div data-treinamentos>
        <h3 className="mb-1 text-[14px] font-semibold">Treinamentos por perfil</h3>
        {Object.entries(PERFIS_DE_TREINAMENTO).map(([perfil, p]) => {
          const doPerfil = treinamentos.filter((t) => t.perfil === perfil);
          const feitos = doPerfil.filter((t) => t.status === "realizado").length;
          return (
            <div key={perfil} className="mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium">{p.rotulo}</span>
                <span className="text-[12px] text-[var(--color-ink3)]">
                  {feitos} de {doPerfil.length} realizado(s)
                </span>
                {podeEditar && (
                  <button type="button" className="text-[12px] text-[var(--color-accent2)] hover:underline" disabled={pendente} onClick={() => rodar(() => planejarTreinamentosDoPerfil(perfil), "Temas planejados.")}>
                    Planejar os temas padrão
                  </button>
                )}
              </div>
              {doPerfil.length > 0 && (
                <table className="mt-1 w-full text-[12.5px]">
                  <tbody>
                    {doPerfil.map((t) => (
                      <tr key={t.id} className="border-t border-[var(--color-line)]">
                        <td className={td}>{t.tema}</td>
                        <td className={td}>{t.participante ?? "—"}</td>
                        <td className={td}>{t.data ?? "—"}</td>
                        <td className={td}>
                          {podeEditar ? (
                            <Select
                              className="max-w-[160px]"
                              value={t.status}
                              aria-label={`Situação de ${t.tema}`}
                              onChange={(e) => rodar(() => salvarTreinamento({ ...t, status: e.target.value }), "Treinamento atualizado.")}
                            >
                              {STATUS_DO_TREINAMENTO.map((s) => (
                                <option key={s} value={s}>
                                  {ROTULO_STATUS_TREINAMENTO[s]}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            ROTULO_STATUS_TREINAMENTO[t.status as keyof typeof ROTULO_STATUS_TREINAMENTO] ?? t.status
                          )}
                        </td>
                        <td className={td}>{t.pendencias ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        {podeEditar && (
          <div className="mt-2 grid grid-cols-1 gap-2 rounded-[10px] border border-dashed border-[var(--color-line)] p-3 sm:grid-cols-6" data-form-treinamento>
            <Select value={trein.perfil} onChange={(e) => setTrein({ ...trein, perfil: e.target.value })} aria-label="Perfil">
              {Object.entries(PERFIS_DE_TREINAMENTO).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.rotulo}
                </option>
              ))}
            </Select>
            <Input value={trein.tema} onChange={(e) => setTrein({ ...trein, tema: e.target.value })} placeholder="Tema" aria-label="Tema" />
            <Input value={trein.participante} onChange={(e) => setTrein({ ...trein, participante: e.target.value })} placeholder="Participantes" aria-label="Participantes" />
            <Input value={trein.data} onChange={(e) => setTrein({ ...trein, data: e.target.value })} placeholder="Data (MM/DD/AAAA)" aria-label="Data do treinamento" />
            <Select value={trein.status} onChange={(e) => setTrein({ ...trein, status: e.target.value })} aria-label="Situação do treinamento">
              {STATUS_DO_TREINAMENTO.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_TREINAMENTO[s]}
                </option>
              ))}
            </Select>
            <Button size="sm" disabled={pendente} onClick={() => rodar(() => salvarTreinamento(trein), "Treinamento registrado.", () => setTrein({ ...trein, tema: "", participante: "", data: "", pendencias: "" }))}>
              Registrar treinamento
            </Button>
            <Input className="sm:col-span-6" value={trein.pendencias} onChange={(e) => setTrein({ ...trein, pendencias: e.target.value })} placeholder="Pendências (opcional)" aria-label="Pendências" />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirCustoHora, excluirApontamento, registrarHoras } from "@/lib/actions/horas";
import { ATIVIDADES_INTERNAS, type LinhaDeDistribuicao } from "@/lib/horas-regras";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { brl0 } from "@/lib/utils";

const th = "px-2 py-1.5 text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]";
const td = "px-2 py-1.5 border-t border-[var(--color-line)]";
const mono = "font-[family-name:var(--font-mono)]";
const novaChave = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()));

export function HorasManager(props: {
  competencia: string;
  projetoFiltro: string | null;
  projetos: { id: string; nome: string }[];
  profissionais: { valor: string; nome: string; origem: string }[];
  contratos: { projectId: string; contratoId: string; codigo: string; titulo: string }[];
  fases: { id: string; projectId: string; nome: string }[];
  atividades: { id: string; projectId: string; faseId: string | null; nome: string }[];
  apontamentos: { id: string; tipo: string; data: string; profissional: string; destino: string; horas: number; custoHora: number | null; descricao: string | null }[];
  distribuicao: { linhas: LinhaDeDistribuicao[]; total: Omit<LinhaDeDistribuicao, "profissional" | "destino"> };
  alocacoes: { id: string; projeto: string; nome: string; custoHora: number | null }[];
  podeApontar: boolean;
  podeExcluir: boolean;
  podeEditarBase: boolean;
}) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const vazio = { tipo: "realizado", profissional: "", projectId: props.projetoFiltro ?? "", atividadeInterna: "", contratoId: "", projetoFaseId: "", projetoAtividadeId: "", data: "", horas: "", descricao: "" };
  const [f, setF] = useState(vazio);
  const [chave, setChave] = useState(novaChave);
  const rodar = (fn: () => Promise<{ ok: boolean; error?: string; aviso?: string }>, sucesso: string, depois?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, texto: r.aviso ? `${sucesso} ${r.aviso}` : sucesso } : { ok: false, texto: r.error ?? "Falhou." });
      if (r.ok) {
        depois?.();
        router.refresh();
      }
    });
  const qs = (comp: string, proj: string) => `/equipes/horas?${new URLSearchParams({ comp, ...(proj ? { proj } : {}) })}`;
  return (
    <div className="space-y-5">
      <form className="flex flex-wrap items-end gap-2 text-[12.5px]" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); router.push(qs(String(fd.get("comp") ?? props.competencia), String(fd.get("proj") ?? ""))); }}>
        <label className="flex flex-col gap-1">Competência (MM/AAAA)<Input name="comp" defaultValue={props.competencia} className="w-28" /></label>
        <label className="flex flex-col gap-1">
          Projeto
          <Select name="proj" defaultValue={props.projetoFiltro ?? ""}>
            <option value="">Todos (e atividades internas)</option>
            {props.projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </label>
        <Button type="submit" size="sm" variant="outline">Filtrar</Button>
      </form>

      {props.podeApontar && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-[13px] font-semibold">Apontar horas</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <div><Label>Tipo</Label><Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} aria-label="Tipo"><option value="realizado">Realizado</option><option value="planejado">Planejado</option></Select></div>
              <div className="sm:col-span-2">
                <Label>Profissional *</Label>
                <Select value={f.profissional} onChange={(e) => setF({ ...f, profissional: e.target.value })} aria-label="Profissional">
                  <option value="">Selecione…</option>
                  {props.profissionais.map((p) => <option key={p.valor} value={p.valor}>{p.nome} ({p.origem === "clt" ? "CLT" : p.origem === "socio" ? "sócio" : "prestador"})</option>)}
                </Select>
              </div>
              <div><Label>Data * (MM/DD/AAAA)</Label><Input value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} placeholder="03/10/2027" aria-label="Data" /></div>
              <div className="sm:col-span-2">
                <Label>Projeto</Label>
                <Select value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value, contratoId: "", projetoFaseId: "", projetoAtividadeId: "" })} aria-label="Projeto">
                  <option value="">— atividade interna —</option>
                  {props.projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </Select>
              </div>
              {!f.projectId ? (
                <div className="sm:col-span-2">
                  <Label>Atividade interna *</Label>
                  <Input list="atividades-internas" value={f.atividadeInterna} onChange={(e) => setF({ ...f, atividadeInterna: e.target.value })} placeholder="Administrativo" aria-label="Atividade interna" />
                  <datalist id="atividades-internas">{ATIVIDADES_INTERNAS.map((a) => <option key={a} value={a} />)}</datalist>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Contrato</Label>
                    <Select value={f.contratoId} onChange={(e) => setF({ ...f, contratoId: e.target.value })} aria-label="Contrato">
                      <option value="">—</option>
                      {props.contratos.filter((c) => c.projectId === f.projectId).map((c) => <option key={c.contratoId} value={c.contratoId}>{c.codigo} · {c.titulo}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Fase</Label>
                    <Select value={f.projetoFaseId} onChange={(e) => setF({ ...f, projetoFaseId: e.target.value, projetoAtividadeId: "" })} aria-label="Fase">
                      <option value="">—</option>
                      {props.fases.filter((x) => x.projectId === f.projectId).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Atividade</Label>
                    <Select value={f.projetoAtividadeId} onChange={(e) => setF({ ...f, projetoAtividadeId: e.target.value })} aria-label="Atividade">
                      <option value="">—</option>
                      {props.atividades.filter((x) => x.projectId === f.projectId && (!f.projetoFaseId || x.faseId === f.projetoFaseId)).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </Select>
                  </div>
                </>
              )}
              <div><Label>Horas *</Label><Input value={f.horas} onChange={(e) => setF({ ...f, horas: e.target.value })} placeholder="8" aria-label="Horas" /></div>
              <div className="sm:col-span-3"><Label>Descrição</Label><Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} aria-label="Descrição" /></div>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={pend}
              onClick={() =>
                rodar(
                  () => registrarHoras({ ...f, projectId: f.projectId || null, atividadeInterna: f.atividadeInterna || null, contratoId: f.contratoId || null, projetoFaseId: f.projetoFaseId || null, projetoAtividadeId: f.projetoAtividadeId || null, idempotencyKey: chave }),
                  "Horas apontadas.",
                  () => { setF({ ...vazio, profissional: f.profissional, projectId: f.projectId, data: f.data }); setChave(novaChave()); },
                )
              }
            >
              {pend ? "Salvando…" : "Apontar"}
            </Button>
          </CardContent>
        </Card>
      )}
      {msg && <p role="status" className={`text-[12.5px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{msg.texto}</p>}

      <Card>
        <CardContent className="p-4">
          <p className="mb-2 text-[13px] font-semibold">Distribuição · previsto × realizado</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" data-distribuicao-horas>
              <thead><tr><th className={th}>Profissional</th><th className={th}>Destino</th><th className={`${th} text-right`}>Planejadas</th><th className={`${th} text-right`}>Realizadas</th><th className={`${th} text-right`}>Desvio</th><th className={`${th} text-right`}>Custo gerencial</th></tr></thead>
              <tbody>
                {props.distribuicao.linhas.map((l) => (
                  <tr key={`${l.profissional}|${l.destino}`}>
                    <td className={td}>{l.profissional}</td><td className={td}>{l.destino}</td>
                    <td className={`${td} text-right ${mono}`}>{l.planejadas}</td><td className={`${td} text-right ${mono}`}>{l.realizadas}</td>
                    <td className={`${td} text-right ${mono} ${l.desvio > 0 ? "text-[#b45309]" : ""}`}>{l.desvio > 0 ? `+${l.desvio}` : l.desvio}</td>
                    <td className={`${td} text-right ${mono}`} title={l.horasSemBase ? `${l.horasSemBase} h sem custo-hora na alocação` : undefined}>{l.custoGerencial == null ? "—" : brl0(l.custoGerencial)}</td>
                  </tr>
                ))}
                {props.distribuicao.linhas.length === 0 && <tr><td colSpan={6} className={`${td} text-center text-[var(--color-ink3)]`}>Nenhuma hora apontada nesta competência.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
            Total: {props.distribuicao.total.realizadas} h realizadas · {props.distribuicao.total.planejadas} h planejadas · custo gerencial {brl0(props.distribuicao.total.custoGerencial ?? 0)}
            {props.distribuicao.total.horasSemBase ? ` (${props.distribuicao.total.horasSemBase} h sem custo-hora, fora do custo)` : ""}. Custo gerencial = horas realizadas × custo-hora da alocação; não é lançamento financeiro.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="mb-2 text-[13px] font-semibold">Apontamentos da competência</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr><th className={th}>Data</th><th className={th}>Tipo</th><th className={th}>Profissional</th><th className={th}>Destino</th><th className={`${th} text-right`}>Horas</th><th className={th}>Descrição</th><th className={th} /></tr></thead>
              <tbody>
                {props.apontamentos.map((a) => (
                  <tr key={a.id}>
                    <td className={`${td} ${mono}`}>{a.data}</td><td className={td}>{a.tipo === "planejado" ? "Planejado" : "Realizado"}</td><td className={td}>{a.profissional}</td><td className={td}>{a.destino}</td>
                    <td className={`${td} text-right ${mono}`}>{a.horas}</td><td className={td}>{a.descricao ?? ""}</td>
                    <td className={td}>{props.podeExcluir && <button type="button" className="text-[12px] text-[var(--color-danger)] hover:underline" disabled={pend} onClick={() => window.confirm("Excluir este apontamento?") && rodar(() => excluirApontamento(a.id), "Apontamento excluído.")}>excluir</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {props.alocacoes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 text-[13px] font-semibold">Base de custo-hora das alocações ativas</p>
            <p className="mb-2 text-[11.5px] text-[var(--color-ink3)]">Base gerencial do custo das horas, por profissional e projeto. Vale para os próximos apontamentos (cada um grava o custo-hora do momento).</p>
            <table className="w-full text-[12.5px]">
              <tbody>
                {props.alocacoes.map((a) => (
                  <tr key={a.id}>
                    <td className={td}>{a.nome}</td><td className={td}>{a.projeto}</td>
                    <td className={`${td} text-right`}>
                      {props.podeEditarBase ? (
                        <form className="inline-flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("v") ?? ""); rodar(() => definirCustoHora(a.id, v || null), "Custo-hora atualizado."); }}>
                          <Input name="v" defaultValue={a.custoHora ?? ""} placeholder="R$/h" className="h-8 w-24" aria-label={`Custo-hora de ${a.nome}`} />
                          <Button type="submit" size="sm" variant="outline" disabled={pend}>ok</Button>
                        </form>
                      ) : a.custoHora == null ? "—" : brl0(a.custoHora)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDependente, deleteDependente, deleteFuncionario, desligarFuncionario, reativarFuncionario, updateFuncionario } from "@/lib/actions/funcionarios";
import { PARENTESCOS, situacaoDoFuncionario } from "@/lib/funcionario-regras";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { FuncionarioCampos } from "@/components/app/funcionario-campos";
import { VALORES_VAZIOS, fdDe, type ValoresFuncionario } from "@/lib/funcionario-form";

export interface FichaProps {
  id: string;
  valores: ValoresFuncionario;
  nome: string;
  desligamento: string | null;
  motivoDesligamento: string | null;
  dependentes: { id: string; nome: string; nascimento: string | null; parentesco: string | null; dependenteIr: boolean; salarioFamilia: boolean }[];
  projetos: { id: string; nome: string }[];
  canEditar: boolean;
  canExcluir: boolean;
  podeDados: boolean;
  podeEditarDados: boolean;
}

const dataBR = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

/** Ficha do funcionário (Prompt Z, Parte 2): edição, dependentes, desligamento (2.4) e exclusão com o nome digitado. */
export function FuncionarioFicha(p: FichaProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState<ValoresFuncionario>({ ...VALORES_VAZIOS, ...p.valores });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [dep, setDep] = useState({ nome: "", nascimento: "", parentesco: "", dependenteIr: false, salarioFamilia: false });
  const [desligarEm, setDesligarEm] = useState("");
  const [motivo, setMotivo] = useState("");
  const situacao = situacaoDoFuncionario({ desligamento: p.desligamento });

  const salvar = () =>
    start(async () => {
      const r = await updateFuncionario(p.id, fdDe(v));
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setMsg({ ok: true, texto: `${r.aviso ?? "Ficha atualizada."}` });
      setEditando(false);
      router.refresh();
    });
  const desligar = () => {
    if (!desligarEm) return setMsg({ ok: false, texto: "Informe a data do desligamento." });
    if (!window.confirm(`Desligar ${p.nome} em ${dataBR(desligarEm)}? Ele sai das listas de alocação; o histórico fica.`)) return;
    start(async () => {
      const r = await desligarFuncionario(p.id, desligarEm, motivo);
      setMsg(r.ok ? { ok: true, texto: "Funcionário desligado." } : { ok: false, texto: r.error });
      router.refresh();
    });
  };
  const reativar = () => start(async () => {
    const r = await reativarFuncionario(p.id);
    setMsg(r.ok ? { ok: true, texto: "Funcionário reativado." } : { ok: false, texto: r.error });
    router.refresh();
  });
  const excluir = () => {
    const digitado = window.prompt(`Excluir ${p.nome} definitivamente? Só é possível sem alocação em equipe. Digite o nome completo para confirmar:`);
    if (digitado == null) return;
    start(async () => {
      const r = await deleteFuncionario(p.id, digitado);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      router.push("/funcionarios");
      router.refresh();
    });
  };
  const addDep = () => start(async () => {
    const fd = new FormData();
    fd.set("nome", dep.nome);
    fd.set("nascimento", dep.nascimento);
    fd.set("parentesco", dep.parentesco);
    fd.set("dependenteIr", dep.dependenteIr ? "1" : "0");
    fd.set("salarioFamilia", dep.salarioFamilia ? "1" : "0");
    const r = await addDependente(p.id, fd);
    if (!r.ok) return setMsg({ ok: false, texto: r.error });
    setDep({ nome: "", nascimento: "", parentesco: "", dependenteIr: false, salarioFamilia: false });
    router.refresh();
  });

  return (
    <div className="space-y-4">
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[12.5px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{msg.texto}</p>}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Ficha de registro</h3>
              <Badge tone={situacao === "Ativo" ? "success" : "neutral"}>{situacao}{p.desligamento ? ` em ${dataBR(p.desligamento)}` : ""}</Badge>
            </div>
            {p.canEditar && !editando && <Button type="button" size="sm" variant="outline" onClick={() => setEditando(true)}>Editar</Button>}
          </div>
          {!p.podeDados && <p className="text-[12px] text-[var(--color-ink3)]">Endereço, salário, jornada, dados bancários e dependentes exigem a permissão &quot;Funcionários — endereço, salário…&quot;. Sem ela, o servidor não envia esses valores.</p>}
          {editando ? (
            <>
              <FuncionarioCampos v={v} onChange={(k, val) => setV({ ...v, [k]: val })} podeDados={p.podeEditarDados} projetos={p.projetos} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => { setEditando(false); setV({ ...VALORES_VAZIOS, ...p.valores }); }}>Cancelar</Button>
                <Button type="button" disabled={pending} onClick={salvar}>{pending ? "Salvando…" : "Salvar"}</Button>
              </div>
            </>
          ) : (
            <FuncionarioCampos v={v} onChange={() => {}} podeDados={p.podeDados} projetos={p.projetos} />
          )}
        </CardContent>
      </Card>

      {p.podeDados && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Dependentes <span className="font-normal text-[var(--color-ink3)]">({p.dependentes.length}) · IR e salário-família</span></h3>
            {p.dependentes.length === 0 ? <p className="text-[12px] text-[var(--color-ink4)]">Nenhum dependente.</p> : (
              <ul className="divide-y divide-[var(--color-line)] rounded-[8px] border border-[var(--color-line)]">
                {p.dependentes.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[12.5px]">
                    <span className="font-medium text-[var(--color-ink)]">{d.nome}</span>
                    <span className="text-[var(--color-ink3)]">{d.parentesco ?? "—"} · {dataBR(d.nascimento)}</span>
                    {d.dependenteIr && <Badge tone="neutral">IR</Badge>}
                    {d.salarioFamilia && <Badge tone="neutral">salário-família</Badge>}
                    {p.podeEditarDados && <button type="button" className="ml-auto text-[12px] text-[var(--color-danger)] hover:underline" disabled={pending} onClick={() => start(async () => { const r = await deleteDependente(d.id); if (!r.ok) setMsg({ ok: false, texto: r.error }); router.refresh(); })}>Remover</button>}
                  </li>
                ))}
              </ul>
            )}
            {p.podeEditarDados && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6 sm:items-end">
                <div className="sm:col-span-2"><Label>Nome</Label><Input value={dep.nome} onChange={(e) => setDep({ ...dep, nome: e.target.value })} aria-label="Nome do dependente" /></div>
                <div><Label>Nascimento</Label><DateField formato="iso" value={dep.nascimento} onChange={(v) => setDep({ ...dep, nascimento: v })} aria-label="Nascimento do dependente" /></div>
                <div><Label>Parentesco</Label><Select value={dep.parentesco} onChange={(e) => setDep({ ...dep, parentesco: e.target.value })}><option value="">—</option>{PARENTESCOS.map((x) => <option key={x} value={x}>{x}</option>)}</Select></div>
                <div className="flex flex-col gap-1 text-[12px]">
                  <label><input type="checkbox" checked={dep.dependenteIr} onChange={(e) => setDep({ ...dep, dependenteIr: e.target.checked })} /> dependente p/ IR</label>
                  <label><input type="checkbox" checked={dep.salarioFamilia} onChange={(e) => setDep({ ...dep, salarioFamilia: e.target.checked })} /> salário-família</label>
                </div>
                <div><Button type="button" size="sm" className="w-full" disabled={pending || !dep.nome} onClick={addDep}>Adicionar</Button></div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(p.canEditar || p.canExcluir) && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Desligamento e exclusão</h3>
            <p className="text-[12px] text-[var(--color-ink3)]">Funcionário desligado não some: fica com a data e sai das listas de alocação; o histórico de equipes permanece. Excluir só sem nenhuma alocação, digitando o nome.</p>
            {p.canEditar && situacao === "Ativo" && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:items-end">
                <div><Label>Data do desligamento</Label><DateField formato="iso" value={desligarEm} onChange={setDesligarEm} aria-label="Data do desligamento" /></div>
                <div className="sm:col-span-3"><Label>Motivo (opcional)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
                <div><Button type="button" size="sm" variant="outline" className="w-full" disabled={pending} onClick={desligar}>Desligar</Button></div>
              </div>
            )}
            {p.canEditar && situacao === "Desligado" && (
              <div className="flex items-center gap-3 text-[12.5px]">
                <span className="text-[var(--color-ink2)]">Desligado em {dataBR(p.desligamento)}{p.motivoDesligamento ? ` · ${p.motivoDesligamento}` : ""}.</span>
                <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={reativar}>Reativar</Button>
              </div>
            )}
            {p.canExcluir && <div><Button type="button" size="sm" variant="ghost" className="text-[var(--color-danger)]" disabled={pending} onClick={excluir}>Excluir definitivamente…</Button></div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

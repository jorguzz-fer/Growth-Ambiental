"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addFolha, addFolhaDocs, deleteFolhaDoc, vincularFolhaDespesa } from "@/lib/actions/funcionario-docs";
import { TIPO_HOLERITE, TIPOS_DOC_FOLHA, type DespesaDeFolhaCandidata } from "@/lib/funcionario-docs-regras";
import { LIMITE_UPLOAD_MB } from "@/lib/clientes-regras";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";

export interface FolhaView {
  id: string;
  competencia: string;
  obs: string | null;
  despesaId: string | null;
  despesaNumDoc: string | null;
  despesaValor: number | null;
  docs: { id: string; filename: string; tipo: string | null; versao: number; funcionarioNome: string | null; uploadedAt: string | null; url: string | null }[];
}

/**
 * Folha por competência (Prompt Z, 2.2-B): um registro por mês com os
 * documentos; o holerite individual é o único por funcionário; o pagamento
 * é despesa lançada em /despesas — aqui fica o documento e o vínculo.
 */
export function FolhaManager({ folhas, candidatas, funcionarios, conferencia, canEditar, r2 }: { folhas: FolhaView[]; candidatas: DespesaDeFolhaCandidata[]; funcionarios: { id: string; nome: string }[]; conferencia: { folhaSemDespesa: string[]; despesaSemFolha: DespesaDeFolhaCandidata[]; folhaSemDocumento: string[] }; canEditar: boolean; r2: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [competencia, setCompetencia] = useState("");
  const [despesaNova, setDespesaNova] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS_DOC_FOLHA[0]);
  const [funcionarioId, setFuncionarioId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const criar = () => start(async () => {
    const fd = new FormData();
    fd.set("competencia", competencia);
    fd.set("despesaId", despesaNova);
    const r = await addFolha(fd);
    if (!r.ok) return setMsg({ ok: false, texto: r.error });
    setMsg({ ok: true, texto: `Folha ${competencia} registrada.` });
    setCompetencia("");
    setDespesaNova("");
    router.refresh();
  });
  const anexar = (folhaId: string) => {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return setMsg({ ok: false, texto: "Selecione ao menos um arquivo." });
    start(async () => {
      const fd = new FormData();
      fd.set("folhaId", folhaId);
      fd.set("tipo", tipo);
      if (tipo === TIPO_HOLERITE) fd.set("funcionarioId", funcionarioId);
      for (const f of Array.from(files)) fd.append("file", f);
      const r = await addFolhaDocs(fd);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setMsg({ ok: true, texto: `${r.added} arquivo(s) anexado(s).` });
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  };
  const vincular = (folhaId: string, despesaId: string) => start(async () => {
    const r = await vincularFolhaDespesa(folhaId, despesaId || null);
    setMsg(r.ok ? { ok: true, texto: "Vínculo com a despesa atualizado." } : { ok: false, texto: r.error });
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <p className="rounded-[8px] bg-[var(--color-surface2)] px-3 py-2 text-[12.5px] text-[var(--color-ink2)]">
        A folha é documento da <strong>empresa</strong>, de um mês. <strong>O pagamento é despesa e se lança em Despesas</strong>, com competência, conta do plano e categoria — aqui fica o arquivo (folha, holerites, guias e comprovantes). Vincule o registro à despesa que pagou a folha: o comprovante não precisa ser anexado duas vezes.
      </p>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[12.5px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{msg.texto}</p>}

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Conferência</h3>
          <ul className="space-y-1 text-[12.5px] text-[var(--color-ink2)]" data-conferencia>
            <li><strong>Folha arquivada sem despesa vinculada:</strong> {conferencia.folhaSemDespesa.length ? conferencia.folhaSemDespesa.join(", ") : "nenhuma"}</li>
            <li><strong>Despesa que parece folha/encargo sem registro na competência:</strong> {conferencia.despesaSemFolha.length ? conferencia.despesaSemFolha.map((d) => `${d.numDoc ?? "s/ nº"} ${d.competencia ?? ""} ${brl0(d.valor)}`).join("; ") : "nenhuma"}</li>
            <li><strong>Folha registrada sem nenhum documento:</strong> {conferencia.folhaSemDocumento.length ? conferencia.folhaSemDocumento.join(", ") : "nenhuma"}</li>
          </ul>
        </CardContent>
      </Card>

      {canEditar && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5 sm:items-end">
            <div><Label>Competência (MM/AAAA) *</Label><Input value={competencia} onChange={(e) => setCompetencia(e.target.value)} placeholder="09/2026" aria-label="Competência da folha" /></div>
            <div className="sm:col-span-3">
              <Label>Despesa que pagou a folha (opcional)</Label>
              <Select value={despesaNova} onChange={(e) => setDespesaNova(e.target.value)} aria-label="Despesa da folha">
                <option value="">— vincular depois —</option>
                {candidatas.map((d) => <option key={d.id} value={d.id}>{d.numDoc ?? "s/ nº"} · {d.competencia ?? "—"} · {brl0(d.valor)} · {d.texto.slice(0, 50)}</option>)}
              </Select>
            </div>
            <div><Button type="button" size="sm" className="w-full" disabled={pending || !competencia} onClick={criar}>Registrar folha</Button></div>
          </CardContent>
        </Card>
      )}

      {folhas.length === 0 ? <p className="text-[12.5px] text-[var(--color-ink4)]">Nenhuma competência registrada.</p> : folhas.map((f) => (
        <Card key={f.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Folha {f.competencia}</h3>
              <Badge tone={f.docs.length ? "success" : "warning"}>{f.docs.length} documento(s)</Badge>
              {f.despesaId ? <Badge tone="success">despesa {f.despesaNumDoc ?? "s/ nº"} · {brl0(f.despesaValor ?? 0)}</Badge> : <Badge tone="warning">sem despesa vinculada</Badge>}
              <button type="button" className="ml-auto text-[12px] text-[var(--color-accent2)] hover:underline" onClick={() => setAberta(aberta === f.id ? null : f.id)}>{aberta === f.id ? "fechar" : "abrir"}</button>
            </div>
            {aberta === f.id && (
              <div className="space-y-2">
                {canEditar && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-end">
                    <div className="sm:col-span-3">
                      <Label>Despesa vinculada</Label>
                      <Select defaultValue={f.despesaId ?? ""} onChange={(e) => vincular(f.id, e.target.value)} aria-label="Despesa vinculada à folha">
                        <option value="">— nenhuma —</option>
                        {candidatas.map((d) => <option key={d.id} value={d.id}>{d.numDoc ?? "s/ nº"} · {d.competencia ?? "—"} · {brl0(d.valor)} · {d.texto.slice(0, 50)}</option>)}
                      </Select>
                    </div>
                  </div>
                )}
                {canEditar && r2 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:items-end">
                    <div>
                      <Label>Tipo *</Label>
                      <Select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo do documento da folha">{TIPOS_DOC_FOLHA.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
                    </div>
                    {tipo === TIPO_HOLERITE && (
                      <div>
                        <Label>Funcionário *</Label>
                        <Select value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)} aria-label="Funcionário do holerite"><option value="">—</option>{funcionarios.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</Select>
                      </div>
                    )}
                    <div className={tipo === TIPO_HOLERITE ? "sm:col-span-2" : "sm:col-span-3"}>
                      <Label>Arquivos (até {LIMITE_UPLOAD_MB} MB cada)</Label>
                      <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="text-xs" aria-label="Arquivos da folha" />
                    </div>
                    <div><Button type="button" size="sm" className="w-full" disabled={pending} onClick={() => anexar(f.id)}>Anexar</Button></div>
                  </div>
                )}
                {!r2 && <p className="text-[12px] text-[var(--color-warning)]">Configure as variáveis R2_* para habilitar o anexo.</p>}
                {f.docs.length === 0 ? <p className="text-[12px] text-[var(--color-ink4)]">Nenhum documento nesta competência.</p> : (
                  <ul className="divide-y divide-[var(--color-line)] rounded-[8px] border border-[var(--color-line)]">
                    {f.docs.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[12.5px]">
                        <span className="font-medium text-[var(--color-ink)]">{d.filename}</span>
                        <span className="rounded-full bg-[var(--color-surface3)] px-2 py-0.5 text-[10px] text-[var(--color-ink3)]">{d.tipo} · v{d.versao}</span>
                        {d.funcionarioNome && <Badge tone="neutral">{d.funcionarioNome}</Badge>}
                        {d.uploadedAt && <span className="text-[11px] text-[var(--color-ink4)]">{dateBR(d.uploadedAt)}</span>}
                        <span className="ml-auto flex items-center gap-3">
                          {d.url && <a href={d.url} target="_blank" rel="noopener" className="text-[12px] text-[var(--color-accent2)] hover:underline">Abrir</a>}
                          {canEditar && <button type="button" disabled={pending} onClick={() => { if (window.confirm(`Remover "${d.filename}"? O arquivo continua guardado; só o vínculo sai.`)) start(async () => { const r = await deleteFolhaDoc(d.id); if (!r.ok) setMsg({ ok: false, texto: r.error }); router.refresh(); }); }} className="text-[12px] text-[var(--color-danger)] hover:underline">Remover</button>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

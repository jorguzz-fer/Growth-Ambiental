"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abrirAso, addFuncionarioDocs, deleteFuncionarioDoc } from "@/lib/actions/funcionario-docs";
import { avisoDeValidade, checklistDeAdmissao, TIPOS_DOC_FUNCIONARIO, tipoEhAso } from "@/lib/funcionario-docs-regras";
import { LIMITE_UPLOAD_MB } from "@/lib/clientes-regras";
import { comprimirImagem } from "@/lib/imagem-compressao";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { dateBR } from "@/lib/utils";
import { isoParaBR } from "@/lib/datas-br";

export interface DocDoFuncionario {
  id: string;
  filename: string;
  tipo: string | null;
  versao: number;
  contentType: string | null;
  validade: string | null;
  uploadedAt: string | null;
  /** nulo para ASO: a URL só sai pela action que registra o acesso (7.3-A). */
  url: string | null;
}

/**
 * Documentos do funcionário (Prompt Z, 2.2-A): checklist de admissão (não
 * bloqueia), validade com aviso, versão por tipo, várias fotos com
 * miniatura. ASO só aparece a quem tem a permissão própria e abre pela
 * action que registra o acesso. Nada daqui vai ao assistente.
 */
export function FuncionarioDocs({ funcionarioId, docs, hojeISO, canEditar, podeAso, podeEditarAso, r2 }: { funcionarioId: string; docs: DocDoFuncionario[]; hojeISO: string; canEditar: boolean; podeAso: boolean; podeEditarAso: boolean; r2: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS_DOC_FUNCIONARIO[0].nome);
  const [validade, setValidade] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const tipoSel = TIPOS_DOC_FUNCIONARIO.find((t) => t.nome === tipo);
  const checklist = checklistDeAdmissao(docs.map((d) => d.tipo ?? ""));
  const tiposDisponiveis = TIPOS_DOC_FUNCIONARIO.filter((t) => !t.aso || podeEditarAso);

  const anexar = () => {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return setAviso({ ok: false, texto: "Selecione ao menos um arquivo." });
    setAviso(null);
    start(async () => {
      const fd = new FormData();
      fd.set("funcionarioId", funcionarioId);
      fd.set("tipo", tipo);
      if (validade) fd.set("validade", validade);
      for (const f of Array.from(files)) fd.append("file", await comprimirImagem(f));
      const r = await addFuncionarioDocs(fd);
      if (!r.ok) return setAviso({ ok: false, texto: r.error });
      setAviso({ ok: true, texto: `${r.added} arquivo(s) anexado(s).` });
      if (fileRef.current) fileRef.current.value = "";
      setValidade("");
      router.refresh();
    });
  };
  const remover = (d: DocDoFuncionario) => {
    if (!window.confirm(`Remover "${d.filename}"? O arquivo continua guardado; só o vínculo sai.`)) return;
    start(async () => {
      const r = await deleteFuncionarioDoc(d.id);
      if (!r.ok) setAviso({ ok: false, texto: r.error });
      else router.refresh();
    });
  };
  const abrir = (d: DocDoFuncionario) =>
    start(async () => {
      const r = await abrirAso(d.id);
      if (!r.ok) return setAviso({ ok: false, texto: r.error });
      window.open(r.url, "_blank", "noopener");
    });

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Documentos <span className="font-normal text-[var(--color-ink3)]">({docs.length}) · versão por tipo · guarda definida por tipo, nada é apagado automaticamente</span></h3>
        <div className={`rounded-[8px] px-3 py-2 text-[12px] ${checklist.completo ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[#fef3c7]/70 text-[#92400e]"}`} data-checklist>
          {checklist.completo ? "Checklist de admissão completo." : (
            <>
              <strong>Admissão — faltam:</strong> {checklist.faltantes.join(", ")}.
              {checklist.faltaAso && <span className="block font-semibold">O ASO admissional precisa existir ANTES do início das atividades (art. 168 da CLT / NR-7).</span>}
              <span className="block text-[11px]">Conferência, não bloqueio: o cadastro pode seguir incompleto; a pendência fica visível.</span>
            </>
          )}
        </div>
        {!podeAso && <p className="text-[11.5px] text-[var(--color-ink3)]">ASO é dado de saúde: aparece só para quem tem a permissão &quot;Funcionários — ASO&quot;.</p>}
        {canEditar && r2 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:items-end">
            <div className="sm:col-span-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo do documento">
                {tiposDisponiveis.map((t) => <option key={t.nome} value={t.nome}>{t.nome}{t.admissao ? " *" : ""}</option>)}
              </Select>
            </div>
            {tipoSel?.comValidade && <div><Label>Validade</Label><DateField formato="iso" value={validade} onChange={setValidade} aria-label="Validade do documento" /></div>}
            <div className={tipoSel?.comValidade ? "" : "sm:col-span-2"}>
              <Label>Arquivos ou fotos (até {LIMITE_UPLOAD_MB} MB; fotos comprimidas)</Label>
              <input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="text-xs" aria-label="Arquivos do funcionário" />
            </div>
            <div><Button type="button" size="sm" className="w-full" onClick={anexar} disabled={pending}>{pending ? "Enviando…" : "Anexar"}</Button></div>
          </div>
        )}
        {!r2 && <p className="text-[12px] text-[var(--color-warning)]">Configure as variáveis R2_* para habilitar o anexo de documentos.</p>}
        {aviso && <p role="status" className={`text-[12px] ${aviso.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{aviso.texto}</p>}
        {docs.length === 0 ? <p className="text-[12px] text-[var(--color-ink4)]">Nenhum documento anexado.</p> : (
          <ul className="divide-y divide-[var(--color-line)] rounded-[8px] border border-[var(--color-line)]">
            {docs.map((d) => {
              const val = avisoDeValidade(d.validade, hojeISO);
              const aso = tipoEhAso(d.tipo);
              const img = d.contentType?.startsWith("image/") && d.url;
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[12.5px]">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a href={d.url!} target="_blank" rel="noopener"><img src={d.url!} alt={d.filename} className="h-10 w-14 rounded-[6px] border border-[var(--color-line)] object-cover" /></a>
                  ) : null}
                  <span className="font-medium text-[var(--color-ink)]">{aso ? "ASO" : d.filename}</span>
                  <span className="rounded-full bg-[var(--color-surface3)] px-2 py-0.5 text-[10px] text-[var(--color-ink3)]">{d.tipo} · v{d.versao}</span>
                  {aso && <Badge tone="warning">dado de saúde · acesso registrado</Badge>}
                  {val && <Badge tone={val.estado === "vencido" ? "danger" : val.estado === "vencendo" ? "warning" : "neutral"}>{val.estado === "vencido" ? `vencido há ${-val.dias} dias` : val.estado === "vencendo" ? `vence em ${val.dias} dias` : `válido até ${isoParaBR(d.validade) || "—"}`}</Badge>}
                  {d.uploadedAt && <span className="text-[11px] text-[var(--color-ink4)]">{dateBR(d.uploadedAt)}</span>}
                  <span className="ml-auto flex items-center gap-3">
                    {aso ? (podeAso && <button type="button" disabled={pending} onClick={() => abrir(d)} className="text-[12px] text-[var(--color-accent2)] hover:underline">Abrir (registra o acesso)</button>) : d.url && <a href={d.url} target="_blank" rel="noopener" className="text-[12px] text-[var(--color-accent2)] hover:underline">Abrir</a>}
                    {canEditar && (!aso || podeEditarAso) && <button type="button" disabled={pending} onClick={() => remover(d)} className="text-[12px] text-[var(--color-danger)] hover:underline disabled:opacity-50">Remover</button>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

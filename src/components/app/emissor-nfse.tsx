"use client";

import { useRef, useState, useTransition } from "react";
import { ativarEmissaoNfse } from "@/lib/actions/nfse-emissor";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/**
 * Formulário de ativação da emissão de NFS-e (docs/EMISSAO-NF.md, 7). O
 * certificado e as senhas vão do navegador para o servidor e dele direto para
 * a Focus NFe; nada disso é guardado no app.
 */
export function FormularioDoEmissor({ ativo, bloqueado }: { ativo: boolean; bloqueado: string | null }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; avisos?: string[] } | null>(null);

  return (
    <form
      ref={ref}
      className="space-y-3"
      data-form-emissor
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        start(async () => {
          const r = await ativarEmissaoNfse(fd);
          if (!r.ok) {
            setMsg({ ok: false, texto: r.error });
            return;
          }
          ref.current?.reset();
          setMsg({ ok: true, texto: ativo ? "Cadastro atualizado na Focus NFe." : "Emissão ativada.", avisos: r.avisos });
          if (r.avisos.length === 0) window.location.reload();
        });
      }}
    >
      <fieldset disabled={pending || !!bloqueado} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Certificado digital A1 (.pfx ou .p12){ativo ? " — só se for trocar" : ""}</Label>
            <input type="file" name="certificado" accept=".pfx,.p12,application/x-pkcs12" className="mt-1 block w-full text-xs" />
          </div>
          <div>
            <Label>Senha do certificado</Label>
            <Input name="senhaCertificado" type="password" autoComplete="new-password" />
          </div>
        </div>
        <details className="rounded-[8px] border border-[var(--color-accent2)]/15 p-3 text-xs">
          <summary className="cursor-pointer text-[var(--color-ink2)]">Município que pede login e senha da prefeitura</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <Label>Login da prefeitura</Label>
              <Input name="loginPrefeitura" autoComplete="off" />
            </div>
            <div>
              <Label>Senha da prefeitura</Label>
              <Input name="senhaPrefeitura" type="password" autoComplete="new-password" />
            </div>
          </div>
        </details>
        <details className="rounded-[8px] border border-[var(--color-accent2)]/15 p-3 text-xs">
          <summary className="cursor-pointer text-[var(--color-ink2)]">Numeração do RPS (só se a empresa já emitia nota por outro sistema)</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <Label>Série do RPS</Label>
              <Input name="serieRps" placeholder="ex.: 1" />
            </div>
            <div>
              <Label>Próximo número do RPS em produção</Label>
              <Input name="proximoNumeroRps" inputMode="numeric" placeholder="o seguinte ao último emitido" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[var(--color-ink3)]">Em branco, a Focus começa a numeração do zero. Empresa que já emitia precisa continuar do último número, senão a prefeitura recusa por RPS repetido.</p>
        </details>
        <p className="text-[11px] text-[var(--color-ink3)]">
          O certificado e as senhas vão direto para a Focus NFe, o provedor de emissão. O sistema não guarda nenhum deles, nem em log nem na
          auditoria.
        </p>
        <Button type="submit">{pending ? "Enviando à Focus…" : ativo ? "Atualizar cadastro na Focus" : "Ativar emissão"}</Button>
      </fieldset>
      {bloqueado && <p className="text-xs text-[var(--color-ink3)]">{bloqueado}</p>}
      {msg && (
        <div role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
          <p>{msg.texto}</p>
          {msg.avisos && msg.avisos.length > 0 && (
            <>
              <ul className="mt-1 list-disc pl-5 text-xs text-[var(--color-ink2)]">
                {msg.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <button type="button" className="mt-2 text-xs underline" onClick={() => window.location.reload()}>
                Entendi
              </button>
            </>
          )}
        </div>
      )}
    </form>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { addConta } from "@/lib/actions/contas";
import { avisoDeCadastro, ROTULO_TIPO_DE_CONTA, TIPOS_DE_CONTA_OFERECIDOS } from "@/lib/contas-regras";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";

/**
 * Nova conta corrente (Prompt X). Só contas bancárias que compõem o saldo
 * de caixa da empresa. Sem agência e conta AVISA, não bloqueia (1.3): pode
 * ser conta em abertura.
 */
export function ContaForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ag, setAg] = useState("");
  const [cc, setCc] = useState("");
  const aviso = avisoDeCadastro({ ag, cc });

  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <form
          ref={ref}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setErro(null);
            setOk(null);
            start(async () => {
              const r = await addConta(fd);
              if (r.ok) {
                setOk(r.aviso ? `Conta cadastrada. ${r.aviso}` : "Conta cadastrada.");
                ref.current?.reset();
                setAg("");
                setCc("");
              } else setErro(r.error);
            });
          }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <div>
            <Label>Banco</Label>
            <Input name="banco" required />
          </div>
          <div>
            <Label>Agência</Label>
            <Input name="ag" value={ag} onChange={(e) => setAg(e.target.value)} />
          </div>
          <div>
            <Label>Operação</Label>
            <Input name="op" />
          </div>
          <div>
            <Label>Conta</Label>
            <Input name="cc" value={cc} onChange={(e) => setCc(e.target.value)} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select name="tipo" defaultValue="Construtora">
              {TIPOS_DE_CONTA_OFERECIDOS.map((t) => (
                <option key={t} value={t}>{ROTULO_TIPO_DE_CONTA[t]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Saldo atual</Label>
            <Input name="saldo" type="number" step="0.01" defaultValue="0" required />
          </div>
          <div>
            <Label>Atualização do saldo</Label>
            <Select name="saldoSource" defaultValue="manual">
              <option value="manual">Manual</option>
              <option value="auto">Automático (quando conectado)</option>
            </Select>
          </div>
          {/* Prompt AT §1-B: conectar não é mais digitar um ID — é o botão "Conectar banco", no topo desta tela. */}
          {aviso && (
            <p className="col-span-2 rounded-[8px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] text-[#92400e] sm:col-span-4" role="status">
              {aviso} Pode cadastrar mesmo assim (ex.: conta em abertura).
            </p>
          )}
          <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Cadastrar conta"}
            </Button>
            {erro && <p className="text-[12px] text-[var(--color-danger)]" role="alert">{erro}</p>}
            {ok && <p className="text-[12px] text-[var(--color-ink2)]" role="status">{ok}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

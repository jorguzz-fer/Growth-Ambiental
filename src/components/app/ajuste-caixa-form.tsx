"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAjuste } from "@/lib/actions/caixa";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";

/**
 * Ajuste de caixa (Prompt L, Parte 4) — o ÚNICO lançamento desta tela
 * (3-A.1 / 4.2.7). Motivo obrigatório (4.2.1), permissão própria (4.2.2),
 * aviso de boa prática antes de confirmar (4.2.6), que não bloqueia. O
 * ajuste compõe o saldo conciliado e nunca o saldo do extrato (4.2.3), e
 * continua fora da DRE (4.1).
 */
export function AjusteCaixaForm({
  contas,
  projectId = "",
  projetos,
  contaInicial = "",
}: {
  contas: { id: string; banco: string; cc: string | null }[];
  /** obra da tela (Caixa por obra, chave desligada). */
  projectId?: string;
  /**
   * Prompt AT §3 (BAT-3, provisório) — Caixa por conta: a obra do ajuste é
   * opcional; sem obra, o ajuste é da empresa.
   */
  projetos?: { id: string; nome: string }[];
  contaInicial?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [sinal, setSinal] = useState<"mais" | "menos">("menos");
  // Data já vem com hoje (interno MM/DD/YYYY); o usuário troca se o ajuste for de outro dia.
  const [data, setData] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  });
  const [motivo, setMotivo] = useState("");
  const [valor, setValor] = useState("");
  const [bankAccountId, setBankAccountId] = useState(contaInicial);
  const [obra, setObra] = useState(projectId);

  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Lançar ajuste de caixa</h3>
        <p className="mt-1 rounded-[8px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] leading-relaxed text-[#92400e]" role="note">
          A melhor prática é <strong>encontrar</strong> a diferença, não ajustá-la. Um débito no extrato sem lançamento, uma despesa não conciliada ou um valor divergente explicam quase toda diferença — e o assistente ajuda a localizar. Use o ajuste quando a origem não for recuperável.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <div>
            <Label>Data</Label>
            <DateField value={data} onChange={setData} />
          </div>
          <div>
            <Label>Sentido</Label>
            <Select value={sinal} onChange={(e) => setSinal(e.target.value as "mais" | "menos")} aria-label="Sentido do ajuste">
              <option value="menos">Para menos (−)</option>
              <option value="mais">Para mais (+)</option>
            </Select>
          </div>
          <div>
            <Label>Valor</Label>
            <Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0" aria-label="Valor do ajuste" />
          </div>
          <div>
            <Label>Conta</Label>
            <Select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} aria-label="Conta do ajuste">
              <option value="">—</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · {c.cc || "s/ conta"}
                </option>
              ))}
            </Select>
          </div>
          {projetos && (
            <div>
              <Label>Projeto (opcional)</Label>
              <Select value={obra} onChange={(e) => setObra(e.target.value)} aria-label="Projeto do ajuste">
                <option value="">Empresa (sem projeto)</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="col-span-2 sm:col-span-2">
            <Label>Motivo (obrigatório)</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: diferença de centavos do extrato de 09/2026 não localizada" aria-label="Motivo do ajuste" />
          </div>
          <div className="col-span-2 flex items-center gap-3 sm:col-span-6">
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                setErro(null);
                setOk(null);
                const fd = new FormData();
                fd.set("projectId", obra);
                fd.set("data", data);
                fd.set("motivo", motivo);
                fd.set("valor", valor);
                fd.set("sinal", sinal);
                fd.set("bankAccountId", bankAccountId);
                start(async () => {
                  const r = await addAjuste(fd);
                  if (r.ok) {
                    setOk("Ajuste lançado. Ele compõe o saldo conciliado; o saldo do extrato não muda.");
                    setData("");
                    setMotivo("");
                    setValor("");
                    router.refresh();
                  } else setErro(r.error);
                });
              }}
            >
              {pending ? "Lançando…" : "Lançar ajuste"}
            </Button>
            {erro && <p className="text-sm text-[var(--color-danger)]" role="alert">{erro}</p>}
            {ok && <p className="text-sm text-[var(--color-ink2)]" role="status">{ok}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

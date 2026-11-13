"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  compensarSaldos,
  confirmarRestituicaoLote,
  previewRestituicaoLote,
} from "@/lib/actions/restituicao-lote";
import type { SaldoConsolidadoTerceiro } from "@/lib/actions/recebimento-terceiro";
import { podeCompensar, valorCompensavel } from "@/lib/calc/recebimento-terceiro";
import { brl0 } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Badge } from "@/components/ui/badge";

interface Opt {
  id: string;
  nome: string;
}

function novaChave(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

type Preview = Awaited<ReturnType<typeof previewRestituicaoLote>>;

/**
 * Restituição em LOTE por terceiro — item 4.1.
 *
 * O cliente fecha o combo e paga um valor único; a tela distribui esse valor
 * entre os PEDs em aberto daquele terceiro, do mais antigo para o mais novo
 * (FIFO por competência), deixando o último parcialmente abatido.
 *
 * O preview é obrigatório: nada é gravado antes de o usuário ver exatamente
 * quais PEDs serão abatidos e em que valor.
 */
export function RestituicaoLote({
  terceiros,
  bancos,
  saldos,
  canEditar,
  projectId,
}: {
  /** obra da tela (Prompt A): a saída de caixa vai para a versão de trabalho dela. */
  projectId: string;
  terceiros: Opt[];
  bancos: Opt[];
  saldos: SaldoConsolidadoTerceiro[];
  canEditar: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const chave = useRef(novaChave());

  const [f, setF] = useState({
    terceiroId: "",
    valor: "",
    dataRestituicao: "",
    bankAccountId: "",
    comprovante: "",
    obs: "",
  });
  const [preview, setPreview] = useState<Preview | null>(null);

  const carregarPreview = () => {
    if (!f.terceiroId || !(Number(f.valor) > 0)) {
      setErro("Escolha o terceiro e informe o valor do ressarcimento.");
      return;
    }
    setErro(null);
    setMsg(null);
    start(async () => {
      const p = await previewRestituicaoLote(f.terceiroId, Number(f.valor));
      setPreview(p);
      if (p.linhas.length === 0) {
        setErro("Este terceiro não tem saldo em aberto para abater.");
      }
    });
  };

  const confirmar = () => {
    if (pending || !preview) return;
    setErro(null);
    start(async () => {
      const res = await confirmarRestituicaoLote({
        terceiroId: f.terceiroId,
        projectId,
        valor: Number(f.valor),
        dataRestituicao: f.dataRestituicao,
        bankAccountId: f.bankAccountId || null,
        comprovante: f.comprovante || null,
        obs: f.obs || null,
        idempotencyKey: chave.current,
      });
      if (!res.ok) {
        setErro(res.error ?? "Falha ao registrar o ressarcimento.");
        return;
      }
      chave.current = novaChave();
      setMsg(
        `Ressarcimento ${res.numDoc ?? ""} registrado — ${res.abatidos} PED(s) abatido(s). Uma única saída de caixa.`,
      );
      setPreview(null);
      setF({ ...f, valor: "", comprovante: "", obs: "" });
      router.refresh();
    });
  };

  const compensar = (s: SaldoConsolidadoTerceiro) => {
    if (!s.terceiroId) return;
    const v = valorCompensavel(s);
    if (
      !window.confirm(
        `Compensar ${brl0(v)} entre o que a empresa deve a ${s.terceiro} (${brl0(
          s.saldoARestituir,
        )}) e o que ele deve à empresa (${brl0(s.saldoARepassar)})?\n\n` +
          "A compensação não movimenta caixa nem altera a DRE.",
      )
    )
      return;
    setErro(null);
    start(async () => {
      const res = await compensarSaldos({
        terceiroId: s.terceiroId!,
        data: new Date().toISOString().slice(0, 10),
        obs: "Encontro de contas",
        idempotencyKey: novaChave(),
      });
      if (!res.ok) {
        setErro(res.error ?? "Falha ao compensar.");
        return;
      }
      setMsg(`Compensação ${res.numDoc ?? ""} registrada: ${brl0(res.valor ?? 0)}.`);
      router.refresh();
    });
  };

  const compensaveis = saldos.filter(podeCompensar);

  if (!canEditar) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">
            Ressarcimento em lote
          </h2>
          <p className="mb-4 text-[11.5px] leading-relaxed text-[var(--color-ink3)]">
            Pague um valor único e o sistema distribui entre os PEDs em aberto do
            terceiro, do mais antigo para o mais novo. O último PED da fila pode
            ficar parcialmente abatido. A restituição ganha documento próprio — é
            ele que vai para a contabilidade como comprovação da saída de caixa.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Label>Terceiro</Label>
              <Select
                value={f.terceiroId}
                onChange={(e) => {
                  setF({ ...f, terceiroId: e.target.value });
                  setPreview(null);
                }}
              >
                <option value="">Selecione...</option>
                {terceiros.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Valor do ressarcimento</Label>
              <Input
                type="number"
                step="0.01"
                value={f.valor}
                onChange={(e) => {
                  setF({ ...f, valor: e.target.value });
                  setPreview(null);
                }}
              />
            </div>
            <div>
              <Label>Data do pagamento</Label>
              <DateField
                value={f.dataRestituicao}
                onChange={(v) => setF({ ...f, dataRestituicao: v })}
              />
            </div>
            <div>
              <Label>Banco / conta</Label>
              <Select
                value={f.bankAccountId}
                onChange={(e) => setF({ ...f, bankAccountId: e.target.value })}
              >
                <option value="">—</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Comprovante / obs.</Label>
              <Input
                value={f.comprovante}
                onChange={(e) => setF({ ...f, comprovante: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={carregarPreview} disabled={pending}>
              {pending && !preview ? "Calculando…" : "Ver o que será abatido"}
            </Button>
            {preview && preview.linhas.length > 0 && (
              <Button onClick={confirmar} disabled={pending || !f.dataRestituicao}>
                {pending ? "Registrando…" : "Confirmar ressarcimento"}
              </Button>
            )}
          </div>
          {erro && <p className="mt-3 text-sm text-[var(--color-danger)]">{erro}</p>}
          {msg && <p className="mt-3 text-sm text-[var(--color-success)]">{msg}</p>}
        </CardContent>
      </Card>

      {/* Extrato + aging + preview do abatimento. */}
      {preview && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3 text-[13px]">
              <span className="text-[var(--color-ink3)]">
                Saldo em aberto{" "}
                <strong className="font-[family-name:var(--font-mono)] text-[var(--color-warning)]">
                  {brl0(preview.saldo)}
                </strong>
              </span>
              {preview.aging && (
                <>
                  <Badge tone="neutral">0–30: {brl0(preview.aging.ate30)}</Badge>
                  <Badge tone="neutral">31–60: {brl0(preview.aging.de31a60)}</Badge>
                  <Badge tone="warning">61–90: {brl0(preview.aging.de61a90)}</Badge>
                  <Badge tone="danger">90+: {brl0(preview.aging.acima90)}</Badge>
                </>
              )}
            </div>
            <p className="mb-2 text-[12.5px] text-[var(--color-ink2)]">
              Confira antes de confirmar — estes são os PEDs que serão abatidos e
              em que valor:
            </p>
            <div className="tbl-scroll overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-accent2)]/12 text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                    <th className="px-2 py-2">PED</th>
                    <th className="px-2 py-2">Projeto</th>
                    <th className="px-2 py-2">Competência</th>
                    <th className="px-2 py-2 text-right">A abater</th>
                    <th className="px-2 py-2 text-right">Sobra no PED</th>
                    <th className="px-2 py-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.linhas.map((l) => (
                    <tr key={l.id} className="border-b border-[var(--color-accent2)]/8">
                      <td className="px-2 py-2 font-[family-name:var(--font-mono)]">
                        {l.numDoc ?? "—"}
                      </td>
                      <td className="px-2 py-2">{l.projectName ?? "—"}</td>
                      <td className="px-2 py-2 font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                        {l.competencia ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-right font-[family-name:var(--font-mono)]">
                        {brl0(l.valorAbatido)}
                      </td>
                      <td className="px-2 py-2 text-right font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                        {l.saldoRestante > 0 ? brl0(l.saldoRestante) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <Badge tone={l.quitado ? "success" : "warning"}>
                          {l.quitado ? "Quitado" : "Parcial"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12.5px] text-[var(--color-ink3)]">
              Total a abater{" "}
              <strong className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">
                {brl0(preview.totalAbatido)}
              </strong>
              {preview.sobra > 0 && (
                <span className="text-[var(--color-danger)]">
                  {" "}
                  · sobra sem destino {brl0(preview.sobra)} — reduza o valor
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* RG-05 — encontro de contas, quando existem os DOIS saldos. */}
      {compensaveis.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">
              Encontro de contas
            </h3>
            <p className="mb-3 text-[11.5px] text-[var(--color-ink3)]">
              Estes terceiros têm saldo nos dois lados. A compensação não
              movimenta caixa nem altera a DRE — os saldos brutos continuam
              visíveis acima.
            </p>
            <div className="space-y-2">
              {compensaveis.map((s) => (
                <div
                  key={s.terceiroId ?? s.terceiro}
                  className="flex flex-wrap items-center gap-3 rounded-[8px] border border-[var(--color-accent2)]/15 p-2.5 text-[13px]"
                >
                  <strong className="text-[var(--color-ink)]">{s.terceiro}</strong>
                  <span className="text-[var(--color-ink3)]">
                    a ressarcir{" "}
                    <span className="font-[family-name:var(--font-mono)] text-[var(--color-warning)]">
                      {brl0(s.saldoARestituir)}
                    </span>
                  </span>
                  <span className="text-[var(--color-ink3)]">
                    a repassar{" "}
                    <span className="font-[family-name:var(--font-mono)] text-[var(--color-success)]">
                      {brl0(s.saldoARepassar)}
                    </span>
                  </span>
                  <span className="text-[var(--color-ink3)]">
                    compensável{" "}
                    <strong className="font-[family-name:var(--font-mono)] text-[var(--color-accent2)]">
                      {brl0(valorCompensavel(s))}
                    </strong>
                  </span>
                  <button
                    onClick={() => compensar(s)}
                    disabled={pending}
                    className="ml-auto text-[12px] text-[var(--color-accent2)] hover:underline"
                  >
                    Compensar saldos
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

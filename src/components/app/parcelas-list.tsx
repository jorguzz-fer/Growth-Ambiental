"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { registrarPagamento } from "@/lib/actions/pagamentos";
import { composePagamento, isAtrasado } from "@/lib/calc";
import { brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

function novaChave(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface ParcelaDTO {
  id: string;
  numeroParcela: number;
  despesaNumDoc: string | null;
  vencimento: string | null;
  valorOriginal: number;
  valorPago: number;
  status: string;
  /** Forma da parcela — pode diferir da forma do cabeçalho da despesa. */
  formaPagamento?: string | null;
  /** Nº do cheque desta parcela (item 2.5). */
  numeroCheque?: string | null;
  /** Data acordada de apresentação do cheque pré-datado. */
  dataBomPara?: string | null;
}

const statusTone = (s: string) =>
  s === "Pago" ? "success" : s === "Cancelado" ? "danger" : s === "Vencido" ? "warning" : "neutral";

export function ParcelasList({
  rows,
  bancos,
  canEditar,
}: {
  rows: ParcelaDTO[];
  bancos: { id: string; banco: string; tipo: string }[];
  canEditar: boolean;
}) {
  const [sel, setSel] = useState<ParcelaDTO | null>(null);
  return (
    <>
      <Table>
        <THead>
          <tr>
            <TH>Documento</TH>
            <TH>Parcela</TH>
            <TH>Vencimento</TH>
            <TH>Forma</TH>
            <TH>Cheque</TH>
            <TH className="text-right">Valor</TH>
            <TH className="text-right">Pago</TH>
            <TH>Status</TH>
            {canEditar && <TH className="text-right">Ação</TH>}
          </tr>
        </THead>
        <tbody>
          {rows.map((p) => (
            <TR key={p.id}>
              <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                {p.despesaNumDoc ?? "—"}
              </TD>
              <TD className="font-[family-name:var(--font-mono)]">#{p.numeroParcela}</TD>
              <TD className="font-[family-name:var(--font-mono)]">{dateBR(p.vencimento)}</TD>
              <TD className="whitespace-nowrap text-[var(--color-ink2)]">{p.formaPagamento ?? "—"}</TD>
              {/* Item 2.5 — o cheque é da PARCELA, não da compra. O "bom para"
                  fica no title porque é o que define quando o dinheiro sai. */}
              <TD
                className="whitespace-nowrap font-[family-name:var(--font-mono)]"
                title={p.dataBomPara ? `Bom para ${dateBR(p.dataBomPara)}` : undefined}
              >
                {p.numeroCheque ?? "—"}
              </TD>
              <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(p.valorOriginal)}</TD>
              <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-success)]">
                {p.valorPago > 0 ? brl0(p.valorPago) : "—"}
              </TD>
              <TD>
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
              </TD>
              {canEditar && (
                <TD className="text-right">
                  {p.status !== "Pago" && p.status !== "Cancelado" ? (
                    <button
                      onClick={() => setSel(p)}
                      className="text-sm text-[var(--color-accent2)] hover:underline"
                    >
                      Registrar pagamento
                    </button>
                  ) : null}
                </TD>
              )}
            </TR>
          ))}
          {rows.length === 0 && (
            <TR>
              <TD colSpan={canEditar ? 9 : 8} className="py-6 text-center text-[var(--color-ink3)]">
                Nenhuma parcela nesta versão.
              </TD>
            </TR>
          )}
        </tbody>
      </Table>

      {sel && (
        <PagamentoModal
          parcela={sel}
          bancos={bancos}
          onClose={() => setSel(null)}
        />
      )}
    </>
  );
}

function PagamentoModal({
  parcela,
  bancos,
  onClose,
}: {
  parcela: ParcelaDTO;
  bancos: { id: string; banco: string; tipo: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const restante = Math.max(0, parcela.valorOriginal - parcela.valorPago);
  const [f, setF] = useState({
    dataPagamento: "",
    valorOriginal: String(restante),
    desconto: "",
    multa: "",
    juros: "",
    outros: "",
    bankAccountId: "",
    obs: "",
  });

  const nums = {
    valorOriginal: Number(f.valorOriginal) || 0,
    desconto: Number(f.desconto) || 0,
    multa: Number(f.multa) || 0,
    juros: Number(f.juros) || 0,
    outrosAcrescimos: Number(f.outros) || 0,
  };
  const { valorTotalPago } = composePagamento(nums);
  const atrasado =
    parcela.vencimento && f.dataPagamento
      ? isAtrasado(parcela.vencimento, f.dataPagamento)
      : false;

  const chave = useRef(novaChave());
  const confirmar = () => {
    setError(null);
    start(async () => {
      try {
        const r = await registrarPagamento({
          idempotencyKey: chave.current,
          parcelaId: parcela.id,
          desconto: nums.desconto,
          multa: nums.multa,
          juros: nums.juros,
          outrosAcrescimos: nums.outrosAcrescimos,
          dataPagamento: f.dataPagamento,
          bankAccountId: f.bankAccountId || null,
          obs: f.obs,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao registrar pagamento.");
      }
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
    >
      <Card className="w-full max-w-lg" >
        <CardContent className="p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--color-ink)]">
            Registrar pagamento
          </h2>
          <p className="mb-4 text-[12px] text-[var(--color-ink3)]">
            {parcela.despesaNumDoc} · parcela #{parcela.numeroParcela} · vencimento{" "}
            {dateBR(parcela.vencimento)} · valor {brl0(parcela.valorOriginal)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data do pagamento</Label>
              <DateField value={f.dataPagamento} onChange={(v) => setF({ ...f, dataPagamento: v })} />
            </div>
            <div>
              <Label>Valor original</Label>
              <Input type="number" step="0.01" value={f.valorOriginal} onChange={(e) => setF({ ...f, valorOriginal: e.target.value })} />
            </div>
            <div>
              <Label>Desconto</Label>
              <Input type="number" step="0.01" value={f.desconto} onChange={(e) => setF({ ...f, desconto: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Multa</Label>
              <Input type="number" step="0.01" value={f.multa} onChange={(e) => setF({ ...f, multa: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Juros</Label>
              <Input type="number" step="0.01" value={f.juros} onChange={(e) => setF({ ...f, juros: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>Outros acréscimos</Label>
              <Input type="number" step="0.01" value={f.outros} onChange={(e) => setF({ ...f, outros: e.target.value })} placeholder="0" />
            </div>
            <div className="col-span-2">
              <Label>Conta bancária / caixa</Label>
              <Select value={f.bankAccountId} onChange={(e) => setF({ ...f, bankAccountId: e.target.value })}>
                <option value="">—</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.banco} · {b.tipo}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Observação</Label>
              <Input value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} />
            </div>
          </div>

          {atrasado && (
            <p className="mt-3 text-[12px] font-medium text-[var(--color-warning)]">
              ⚠ Pagamento em atraso — informe multa/juros se aplicável.
            </p>
          )}
          <div className="mt-3 flex items-center justify-between rounded-[10px] bg-[var(--color-surface2)] px-4 py-3">
            <span className="text-[12px] text-[var(--color-ink3)]">Valor total a pagar</span>
            <span className="font-[family-name:var(--font-mono)] text-lg font-semibold text-[var(--color-ink)]">
              {brl0(valorTotalPago)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-ink3)]">
            Original − desconto + multa + juros + outros. Encargos vão para
            “Despesas Financeiras” na DRE; a saída real entra na Conciliação de Caixa.
          </p>

          {error && <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
            <Button onClick={confirmar} disabled={pending || valorTotalPago <= 0}>
              {pending ? "Registrando…" : "Confirmar pagamento"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

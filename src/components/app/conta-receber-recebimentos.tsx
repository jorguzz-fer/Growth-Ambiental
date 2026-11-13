"use client";

import { useState, useTransition } from "react";
import { estornarRecebimento, registrarRecebimento } from "@/lib/actions/contas-receber";
import { FORMAS_DE_RECEBIMENTO, formaExigeJustificativa, type EstadoCalculado, type FormaDeRecebimento } from "@/lib/conta-receber-estado";
import type { EntradaDisponivel } from "@/lib/queries";
import { brl, dateBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { DateField } from "@/components/ui/date-field";
import { Badge } from "@/components/ui/badge";

export interface RecebimentoExibido {
  id: string;
  valor: number;
  data: string | null;
  forma: string;
  cashEntryId: string | null;
  justificativa: string | null;
  estornado: boolean;
  motivoEstorno: string | null;
}

/**
 * Baixa, conciliação e estorno de uma conta a receber (Prompt K, seções 3 e 4).
 * O status da conta nunca é digitado: ele aparece aqui, derivado, e muda só
 * pelo que se registra. Conciliar exige escolher uma linha do extrato (4.1);
 * fora do banco, a justificativa é obrigatória (3.4).
 */
export function ContaReceberRecebimentos({
  contaId,
  estado,
  recebimentos,
  entradas,
  canEdit,
}: {
  contaId: string;
  estado: EstadoCalculado;
  recebimentos: RecebimentoExibido[];
  entradas: EntradaDisponivel[];
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [valor, setValor] = useState(estado.saldo > 0 ? String(estado.saldo) : "");
  const [data, setData] = useState("");
  const [forma, setForma] = useState<FormaDeRecebimento>("Extrato bancário");
  const [justificativa, setJustificativa] = useState("");
  const [cashEntryId, setCashEntryId] = useState("");
  const [chave] = useState(() => `${contaId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`);

  const registrar = () => {
    setAviso(null);
    start(async () => {
      const r = await registrarRecebimento({
        contaReceberId: contaId,
        valor: Number(valor),
        data,
        forma,
        justificativa: justificativa || null,
        cashEntryId: forma === "Extrato bancário" ? cashEntryId || null : null,
        idempotencyKey: chave,
      });
      if (!r.ok) {
        setAviso({ ok: false, texto: r.error });
        return;
      }
      setAviso({ ok: true, texto: forma === "Extrato bancário" ? "Recebimento conciliado com o extrato." : "Recebimento registrado (sem conciliar)." });
    });
  };
  const estornar = (id: string) => {
    const motivo = window.prompt("Motivo do estorno deste recebimento:");
    if (motivo === null) return;
    setAviso(null);
    start(async () => {
      const r = await estornarRecebimento(id, motivo);
      if (!r.ok) setAviso({ ok: false, texto: r.error });
      else setAviso({ ok: true, texto: "Recebimento estornado." });
    });
  };

  return (
    <div className="rounded-[10px] border border-[var(--color-accent2)]/12 bg-[var(--color-surface2)] p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-ink2)]">
        <Badge tone={tomDoEstado(estado.estado)}>{estado.estado}</Badge>
        <span>
          recebido <strong className="font-[family-name:var(--font-mono)]">{brl(estado.recebido)}</strong>
          {estado.naoConciliado > 0 && <> · sem conciliar <strong className="font-[family-name:var(--font-mono)] text-[var(--color-warning)]">{brl(estado.naoConciliado)}</strong></>}
          {" · "}falta <strong className="font-[family-name:var(--font-mono)]">{brl(estado.saldo)}</strong>
          {estado.residuo !== 0 && <> · fechada com diferença de {brl(estado.residuo)}</>}
        </span>
      </div>

      {canEdit && !estado.quitada && estado.estado !== "Cancelada" && (
        <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-6 sm:items-end">
          <div>
            <Label>Valor recebido</Label>
            <MoneyInput value={valor} onChange={setValor} />
          </div>
          <div>
            <Label>Data</Label>
            <DateField value={data} onChange={setData} />
          </div>
          <div>
            <Label>Forma</Label>
            <Select value={forma} onChange={(e) => setForma(e.target.value as FormaDeRecebimento)}>
              {FORMAS_DE_RECEBIMENTO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
          {forma === "Extrato bancário" ? (
            <div className="sm:col-span-2">
              <Label>Linha do extrato (entrada)</Label>
              <Select value={cashEntryId} onChange={(e) => setCashEntryId(e.target.value)}>
                <option value="">— escolha o movimento —</option>
                {entradas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {dateBR(m.data)} · {m.descricao ?? "sem descrição"} · {brl(m.valor)}
                    {m.disponivel < m.valor ? ` (livre ${brl(m.disponivel)})` : ""}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <Label>Justificativa *</Label>
              <Input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder={formaExigeJustificativa(forma) ? "Por que não passou pelo banco" : ""} />
            </div>
          )}
          <div>
            <Button size="sm" className="w-full" onClick={registrar} disabled={pending}>
              {pending ? "Gravando…" : forma === "Extrato bancário" ? "Conciliar" : "Dar baixa"}
            </Button>
          </div>
        </div>
      )}
      {canEdit && forma === "Extrato bancário" && entradas.length === 0 && !estado.quitada && (
        <p className="mb-2 text-[11.5px] text-[var(--color-ink3)]">
          Nenhuma entrada do extrato com valor livre neste projeto. Importe o extrato no Caixa, ou registre a baixa por outra forma (fica &quot;recebida, não conciliada&quot;).
        </p>
      )}
      {aviso && (
        <p role="status" className={`mb-2 text-[12px] ${aviso.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
          {aviso.texto}
        </p>
      )}

      {recebimentos.length === 0 ? (
        <p className="text-[12px] text-[var(--color-ink4)]">Nenhum recebimento registrado.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-accent2)]/8 rounded-[8px] border border-[var(--color-accent2)]/12 bg-white">
          {recebimentos.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center gap-2 px-3 py-1.5 text-[12.5px] ${r.estornado ? "text-[var(--color-ink4)] line-through" : ""}`}>
              <span className="font-[family-name:var(--font-mono)]">{dateBR(r.data)}</span>
              <span className="font-[family-name:var(--font-mono)] font-medium">{brl(r.valor)}</span>
              <Badge tone={r.cashEntryId ? "success" : "warning"}>{r.cashEntryId ? "conciliado" : r.forma}</Badge>
              {r.justificativa && <span className="text-[var(--color-ink3)]">{r.justificativa}</span>}
              {r.estornado && <span className="text-[var(--color-danger)]">estornado{r.motivoEstorno ? `: ${r.motivoEstorno}` : ""}</span>}
              {canEdit && !r.estornado && (
                <button type="button" disabled={pending} onClick={() => estornar(r.id)} className="ml-auto text-[12px] text-[var(--color-danger)] hover:underline disabled:opacity-50">
                  Estornar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function tomDoEstado(e: EstadoCalculado["estado"]): "success" | "warning" | "neutral" | "info" {
  if (e === "Recebida e conciliada") return "success";
  if (e === "Recebida") return "warning";
  if (e === "Cancelada") return "neutral";
  return "info";
}

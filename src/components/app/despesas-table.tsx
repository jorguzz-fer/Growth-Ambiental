"use client";

import { useState, useTransition, useRef } from "react";
import { statusExibido, tomDoStatus } from "@/lib/despesa-status";
import { useRouter, useSearchParams } from "next/navigation";
import {
  cancelarDespesa,
  pagarDespesa,
} from "@/lib/actions/despesas";
import { brl0, dateBR } from "@/lib/utils";
import { ConfirmarExclusaoDespesa } from "@/components/app/confirmar-exclusao-despesa";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { Input, Label, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { DateField } from "@/components/ui/date-field";
import { Button } from "@/components/ui/button";

function novaChave(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface DespesaDTO {
  id: string;
  /** projeto ao qual a despesa pertence (necessário para abrir a edição). */
  projectId: string;
  numDoc: string | null;
  fornecedorId: string | null;
  bancoId: string | null;
  contaCef: string | null;
  /** 0079 — tratamento direto/indireto do lançamento (null = padrão da conta). */
  tipoCusto?: string | null;
  categoriaDre: string | null;
  competencia: string | null;
  vencimento: string | null;
  valor: string;
  status: string | null;
  formaPagamento?: string | null;
  obs?: string | null;
  cancelado?: boolean;
  /** rótulo de origem (obra/filial) — usado na consulta consolidada. */
  origem?: string | null;
  /** URL do anexo mais recente (clipe na linha); null se não houver/sem storage. */
  anexoUrl?: string | null;
  /** quantidade de documentos anexados à despesa. */
  anexoCount?: number;
  /** Sem documento fiscal registrado (item 1.2) — pendência, não impedimento. */
  semNf?: boolean;
  /** Prompt S, 4.1 — o que falta no documento fiscal (texto do selo). */
  pendenciaNf?: string | null;
}

/** §16 — status exibido pela mesma função de Contas a Pagar ("Vencida" derivada da data). */
const displayStatus = (d: DespesaDTO): string => statusExibido(d);
const statusTone = tomDoStatus;

interface Ref {
  fornecedores: { id: string; nome: string }[];
  bancos: { id: string; banco: string; tipo: string }[];
}

export function DespesasTable({
  rows,
  fornecedores,
  bancos,
  venc,
  showOrigem = false,
  latestId = null,
  canEditar,
  canExcluir,
}: {
  rows: DespesaDTO[];
  venc?: boolean;
  showOrigem?: boolean;
  /** id da última despesa lançada — recebe o destaque "Último lançamento". */
  latestId?: string | null;
  canEditar: boolean;
  canExcluir: boolean;
} & Ref) {
  const fornById = new Map(fornecedores.map((f) => [f.id, f.nome]));
  const showActions = canEditar || canExcluir;
  const cols = (showActions ? 8 : 7) + (showOrigem ? 1 : 0);

  // A ordem chega pronta de quem monta a lista (a tela de lançamentos ordena
  // por created_at DESC, id DESC). Aqui não se reordena — apenas se destaca a
  // linha do último lançamento.
  const ordered = rows;

  return (
    <Table>
      <THead>
        <tr>
          <TH>{venc ? "Vencimento" : "Competência"}</TH>
          {showOrigem && <TH>Origem</TH>}
          <TH>Nº Doc</TH>
          <TH>Fornecedor</TH>
          <TH>Conta CEF</TH>
          <TH>Cat. DRE</TH>
          <TH className="text-right">Valor</TH>
          <TH>Status</TH>
          {showActions && <TH className="text-right">Ações</TH>}
        </tr>
      </THead>
      <tbody>
        {ordered.map((d) => (
          <Row
            key={d.id}
            d={d}
            fornById={fornById}
            bancos={bancos}
            venc={venc}
            showOrigem={showOrigem}
            highlight={!!latestId && d.id === latestId}
            canEditar={canEditar}
            canExcluir={canExcluir}
          />
        ))}
        {rows.length === 0 && (
          <TR>
            <TD colSpan={cols} className="py-6 text-center text-[var(--color-ink3)]">
              Nada por aqui nesta versão.
            </TD>
          </TR>
        )}
      </tbody>
    </Table>
  );
}

function Row({
  d,
  fornById,
  bancos,
  venc,
  showOrigem = false,
  highlight = false,
  canEditar,
  canExcluir,
}: {
  d: DespesaDTO;
  fornById: Map<string, string>;
  bancos: Ref["bancos"];
  showOrigem?: boolean;
  venc?: boolean;
  /** Última despesa lançada — linha destacada no topo (conferência). */
  highlight?: boolean;
  canEditar: boolean;
  canExcluir: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paying, setPaying] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Abre a tela completa de edição (mesmo formulário do cadastro, já preenchido)
  // via deep link ?edit=. Preserva o projeto da despesa para carregar a versão
  // correta (importante na consulta consolidada).
  const abrirEdicao = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", "lancamentos");
    params.set("proj", d.projectId);
    params.set("edit", d.id);
    router.push(`/despesas?${params.toString()}`);
    // Mudança só de query (mesma página) não rola a tela: a tela completa de
    // edição abre no topo, então trazemos a visão para lá — igual ao fluxo
    // vindo de Contas a Pagar (navegação entre páginas já sobe ao topo).
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Formulário de pagamento (marcar como paga).
  const hojeInterno = (() => {
    const h = new Date();
    return `${String(h.getMonth() + 1).padStart(2, "0")}/${String(h.getDate()).padStart(2, "0")}/${h.getFullYear()}`;
  })();
  const [pg, setPg] = useState({
    data: hojeInterno,
    valor: d.valor,
    bancoId: d.bancoId ?? "",
    forma: d.formaPagamento ?? "",
    juros: "",
    multa: "",
    desconto: "",
    obs: "",
  });

  const cancelar = () => {
    const motivo = window.prompt("Motivo do cancelamento desta despesa:");
    if (motivo === null) return;
    setError(null);
    start(async () => {
      try {
        const r = await cancelarDespesa(d.id, motivo);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao cancelar.");
      }
    });
  };

  const chavePagamento = useRef(novaChave());
  const confirmarPagamento = () => {
    setError(null);
    start(async () => {
      try {
        const r = await pagarDespesa({
          idempotencyKey: chavePagamento.current,
          despesaId: d.id,
          dataPagamento: pg.data,
          valorPago: Number(pg.valor) || 0,
          bankAccountId: pg.bancoId || null,
          formaPagamento: pg.forma || null,
          juros: Number(pg.juros) || 0,
          multa: Number(pg.multa) || 0,
          desconto: Number(pg.desconto) || 0,
          obs: pg.obs || undefined,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        // Próximo pagamento desta linha é outro fato: chave nova.
        chavePagamento.current = novaChave();
        setPaying(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao registrar pagamento.");
      }
    });
  };

  const showActions = canEditar || canExcluir;
  const stDisplay = displayStatus(d);
  const isPago = d.status === "Pago";

  // Prompt S, seção 2 — exclusão informada: inventário e PED digitado no
  // painel; a action recusa com dependência e audita na mesma transação.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const remove = () => {
    setError(null);
    setConfirmandoExclusao(true);
  };

  if (confirmandoExclusao) {
    return (
      <TR>
        <TD colSpan={(showActions ? 8 : 7) + (showOrigem ? 1 : 0)}>
          <ConfirmarExclusaoDespesa despesaId={d.id} onCancelar={() => setConfirmandoExclusao(false)} onExcluida={() => { setConfirmandoExclusao(false); router.refresh(); }} />
        </TD>
      </TR>
    );
  }

  if (paying) {
    return (
      <TR>
        <TD colSpan={(showActions ? 8 : 7) + (showOrigem ? 1 : 0)}>
          <div className="rounded-[8px] border border-[var(--color-accent2)]/15 bg-[var(--color-surface2)] p-3">
            <div className="mb-2 text-[12px] font-semibold text-[var(--color-ink)]">
              Registrar pagamento — {d.numDoc ?? "despesa"} ({brl0(Number(d.valor))})
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div><Label>Data do pagamento</Label><DateField value={pg.data} onChange={(v) => setPg((s) => ({ ...s, data: v }))} className="h-8 text-xs" /></div>
              <div><Label>Valor pago</Label><MoneyInput value={pg.valor} onChange={(v) => setPg((s) => ({ ...s, valor: v }))} className="h-8 text-xs" /></div>
              <div>
                <Label>Conta bancária</Label>
                <Select value={pg.bancoId} onChange={(e) => setPg((s) => ({ ...s, bancoId: e.target.value }))} className="h-8 text-xs">
                  <option value="">—</option>
                  {bancos.map((b) => <option key={b.id} value={b.id}>{b.banco} · {b.tipo}</option>)}
                </Select>
              </div>
              <div><Label>Forma</Label><Input value={pg.forma} onChange={(e) => setPg((s) => ({ ...s, forma: e.target.value }))} className="h-8 text-xs" /></div>
              <div><Label>Juros</Label><MoneyInput value={pg.juros} onChange={(v) => setPg((s) => ({ ...s, juros: v }))} className="h-8 text-xs" /></div>
              <div><Label>Multa</Label><MoneyInput value={pg.multa} onChange={(v) => setPg((s) => ({ ...s, multa: v }))} className="h-8 text-xs" /></div>
              <div><Label>Desconto</Label><MoneyInput value={pg.desconto} onChange={(v) => setPg((s) => ({ ...s, desconto: v }))} className="h-8 text-xs" /></div>
              <div><Label>Observação</Label><Input value={pg.obs} onChange={(e) => setPg((s) => ({ ...s, obs: e.target.value }))} className="h-8 text-xs" /></div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              {error && <span className="text-[11px] text-[var(--color-danger)]">{error}</span>}
              <Button size="sm" disabled={pending} onClick={confirmarPagamento}>Confirmar pagamento</Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setPaying(false)}>Cancelar</Button>
            </div>
          </div>
        </TD>
      </TR>
    );
  }

  return (
    <TR
      className={[
        d.cancelado ? "opacity-60" : "",
        highlight
          ? "bg-[var(--color-accent4)] shadow-[inset_3px_0_0_0_var(--color-accent2)]"
          : "",
      ]
        .filter(Boolean)
        .join(" ") || undefined}
    >
      <TD className="font-[family-name:var(--font-mono)]">
        {highlight && (
          <span className="mb-0.5 block">
            <Badge tone="accent">Último lançamento</Badge>
          </span>
        )}
        {dateBR(venc ? d.vencimento : d.competencia)}
      </TD>
      {showOrigem && (
        <TD className="whitespace-nowrap text-[12px] text-[var(--color-ink2)]">
          {d.origem ?? "—"}
        </TD>
      )}
      <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
        <span className="inline-flex items-center gap-1.5">
          {d.numDoc ?? "—"}
          {d.anexoUrl && (
            <a
              href={d.anexoUrl}
              target="_blank"
              rel="noopener"
              // 4.3 — o clipe é o ARQUIVO anexado; a nota (registro fiscal) é o selo ao lado.
              title={`Abrir anexo${(d.anexoCount ?? 0) > 1 ? ` (${d.anexoCount} arquivos)` : ""} — arquivo anexado; não é o registro da nota fiscal`}
              className="text-[13px] text-[var(--color-accent2)] hover:opacity-70"
              onClick={(e) => e.stopPropagation()}
            >
              📎{(d.anexoCount ?? 0) > 1 ? <span className="ml-0.5 text-[10px]">{d.anexoCount}</span> : null}
            </a>
          )}
          {/* Item 1.2 — a nota chega depois; o selo só torna a pendência
              visível, sem impedir nada. */}
          {d.semNf && (
            <span
              // 4.2 / 4.3 — o selo é da NOTA (registro fiscal); o clipe ao lado é
              // do ARQUIVO. O título diz o que falta, não só que falta.
              title={d.pendenciaNf ?? "Pendente de documento fiscal — a nota ainda não foi informada"}
              className="text-[11px] text-[var(--color-warning)]"
            >
              ⚠ Sem NF
              {d.pendenciaNf && <span className="ml-1 text-[10px] text-[var(--color-ink3)]">· {d.pendenciaNf.split(":")[0]}</span>}
            </span>
          )}
        </span>
      </TD>
      <TD>{d.fornecedorId ? fornById.get(d.fornecedorId) ?? "—" : "—"}</TD>
      <TD>
        <Badge tone="warning">{d.contaCef ?? "—"}</Badge>
      </TD>
      <TD className="text-[var(--color-ink2)]">{d.categoriaDre ?? "—"}</TD>
      <TD className="text-right font-[family-name:var(--font-mono)]">
        {brl0(Number(d.valor))}
      </TD>
      <TD>
        <Badge tone={statusTone(stDisplay)}>{stDisplay}</Badge>
      </TD>
      {showActions && (
        <TD className="text-right">
          {d.cancelado ? (
            <span className="text-[11px] text-[var(--color-ink4)]">cancelada</span>
          ) : (
            <div className="flex flex-wrap justify-end gap-2">
              {canEditar && !isPago && (
                <button
                  onClick={() => setPaying(true)}
                  disabled={pending}
                  className="text-sm text-[var(--color-success)] hover:underline disabled:opacity-50"
                >
                  Pagar
                </button>
              )}
              {canEditar && (
                <button
                  onClick={abrirEdicao}
                  disabled={pending}
                  className="text-sm text-[var(--color-accent2)] hover:underline disabled:opacity-50"
                >
                  Editar
                </button>
              )}
              {canExcluir && (
                <button
                  onClick={cancelar}
                  disabled={pending}
                  className="text-sm text-[var(--color-warning)] hover:underline disabled:opacity-50"
                  title="Cancelamento lógico (mantém histórico)"
                >
                  Cancelar
                </button>
              )}
              {canExcluir && (
                <button
                  onClick={remove}
                  disabled={pending}
                  className="text-sm text-[var(--color-danger)] hover:underline disabled:opacity-50"
                  title="Exclusão física (irreversível)"
                >
                  Excluir
                </button>
              )}
            </div>
          )}
          {error && (
            <p className="mt-1 text-right text-[11px] text-[var(--color-danger)]">
              {error}
            </p>
          )}
        </TD>
      )}
    </TR>
  );
}

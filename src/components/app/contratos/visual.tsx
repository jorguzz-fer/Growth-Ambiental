import { Badge } from "@/components/ui/badge";
import {
  ROTULO_STATUS_ADITIVO,
  ROTULO_STATUS_CONTRATO,
  ROTULO_STATUS_MARCO,
  ROTULO_STATUS_MEDICAO,
  ROTULO_STATUS_REEMBOLSO,
  type StatusAditivo,
  type StatusContrato,
  type StatusMarco,
  type StatusMedicao,
  type StatusReembolso,
} from "@/lib/contrato-regras";

/*
 * Peças visuais SEM estado do módulo de Contratos: servem às páginas do
 * servidor e aos componentes do cliente (não é "use client").
 */

type Tom = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
const TOM: Record<string, Tom> = {
  rascunho: "neutral",
  aguardando_assinatura: "warning",
  ativo: "success",
  suspenso: "warning",
  concluido: "info",
  encerrado: "neutral",
  cancelado: "danger",
  negociacao: "accent",
  aguardando_aprovacao: "warning",
  aprovado: "info",
  assinado: "success",
  rejeitado: "danger",
  enviada: "accent",
  em_analise: "warning",
  aprovada: "success",
  rejeitada: "danger",
  cancelada: "danger",
  pendente: "neutral",
  solicitado: "warning",
  faturado: "info",
  recebido: "success",
  previsto: "neutral",
  em_andamento: "accent",
  atrasado: "danger",
};
const ROTULOS: Record<string, string> = { ...ROTULO_STATUS_MARCO, ...ROTULO_STATUS_REEMBOLSO, ...ROTULO_STATUS_MEDICAO, ...ROTULO_STATUS_ADITIVO, ...ROTULO_STATUS_CONTRATO };

export function StatusBadge({ status, tipo }: { status: string; tipo?: "contrato" | "aditivo" | "medicao" | "reembolso" | "marco" }) {
  const rot =
    tipo === "contrato"
      ? ROTULO_STATUS_CONTRATO[status as StatusContrato]
      : tipo === "aditivo"
        ? ROTULO_STATUS_ADITIVO[status as StatusAditivo]
        : tipo === "medicao"
          ? ROTULO_STATUS_MEDICAO[status as StatusMedicao]
          : tipo === "reembolso"
            ? ROTULO_STATUS_REEMBOLSO[status as StatusReembolso]
            : tipo === "marco"
              ? ROTULO_STATUS_MARCO[status as StatusMarco]
              : ROTULOS[status];
  return <Badge tone={TOM[status] ?? "neutral"}>{rot ?? status}</Badge>;
}

export const brl = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Indicador numérico no padrão dos cards do app. */
export function Kpi({ rotulo, valor, detalhe, tom }: { rotulo: string; valor: string; detalhe?: string; tom?: "ok" | "alerta" | "perigo" }) {
  const cor = tom === "perigo" ? "text-[var(--color-danger)]" : tom === "alerta" ? "text-[#b45309]" : tom === "ok" ? "text-[var(--color-success)]" : "text-[var(--color-ink)]";
  return (
    <div className="rounded-[12px] border border-[var(--color-line)] bg-white px-4 py-3">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-ink3)]">{rotulo}</div>
      <div className={`mt-1 font-[family-name:var(--font-mono)] text-[17px] font-semibold ${cor}`}>{valor}</div>
      {detalhe && <div className="mt-0.5 text-[11.5px] text-[var(--color-ink3)]">{detalhe}</div>}
    </div>
  );
}

/** Seção com título no padrão das telas. */
export function Secao({ titulo, acao, children, descricao }: { titulo: string; acao?: React.ReactNode; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-[14px] border border-[var(--color-line)] bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-[12.5px] text-[var(--color-ink3)]">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}


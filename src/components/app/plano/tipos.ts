import type { PlanoCompleto } from "@/lib/plano-queries";

/** O plano como a tela recebe: documentos já com o link de leitura (quando há storage). */
export type PlanoDaTela = Omit<PlanoCompleto, "documentos"> & {
  documentos: (PlanoCompleto["documentos"][number] & { url: string | null })[];
};

/**
 * Prompt Z2 (Fase 3 · revisão V5): "Funcionários: o chat ajuda a cadastrar".
 * Módulo PURO.
 *
 * Regra de privacidade (BE-2, mantida pelo E2): dado pessoal do funcionário
 * não vai ao modelo. Por isso o formulário que a tela oferece à Cris tem SÓ o
 * vínculo de trabalho — cargo, setor, projeto, tipo e prazo do contrato,
 * admissão e observação. Nome, documentos, nascimento, filiação, endereço,
 * jornada, salário e dados bancários são preenchidos à mão. Quem cadastra é o
 * botão "Cadastrar".
 */
import type { FormularioDaTela } from "@/lib/cris";
import { TIPOS_CONTRATO } from "@/lib/funcionario-regras";

/** Os campos que a Cris pode preencher (nenhum é dado pessoal). */
export const CAMPOS_DO_VINCULO = ["cargo", "setor", "obra", "tipoContrato", "prazoContrato", "admissao", "obs"] as const;

export function formularioDoFuncionario(obras: readonly { id: string; nome: string }[]): FormularioDaTela {
  return {
    id: "funcionario-novo",
    titulo: "Novo funcionário (CLT): só o vínculo de trabalho; nome, documentos, endereço, salário e banco são preenchidos à mão",
    campos: [
      { nome: "cargo", rotulo: "Cargo / função", tipo: "texto" },
      { nome: "setor", rotulo: "Setor", tipo: "texto" },
      { nome: "obra", rotulo: "Projeto", tipo: "opcao", opcoes: obras.map((o) => o.nome) },
      { nome: "tipoContrato", rotulo: "Tipo de contrato", tipo: "opcao", opcoes: [...TIPOS_CONTRATO] },
      { nome: "prazoContrato", rotulo: "Prazo (se determinado)", tipo: "texto" },
      { nome: "admissao", rotulo: "Admissão", tipo: "data", dica: "MM/DD/YYYY" },
      { nome: "obs", rotulo: "Observação (sem dado pessoal)", tipo: "texto" },
    ],
  };
}

/** Data da proposta ("MM/DD/YYYY" ou "AAAA-MM-DD") no formato do campo da ficha ("AAAA-MM-DD"). */
export function dataDaFicha(s: string): string | null {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [mes, dia] = [Number(m[1]), Number(m[2])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${m[3]}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function valoresDoFuncionario(
  valores: Record<string, string>,
  obras: readonly { id: string; nome: string }[],
): { valores: Record<string, string>; avisos: string[] } {
  const out: Record<string, string> = {};
  const avisos: string[] = [];
  for (const k of ["cargo", "setor", "prazoContrato", "obs"] as const) if (valores[k]) out[k] = valores[k].slice(0, 200);
  if (valores.tipoContrato) out.tipoContrato = valores.tipoContrato;
  if (valores.obra) {
    const o = obras.find((x) => x.nome === valores.obra);
    if (o) out.projectId = o.id;
  }
  if (valores.admissao) {
    const d = dataDaFicha(valores.admissao);
    if (d) out.admissao = d;
    else avisos.push(`Admissão "${valores.admissao}" não entendida.`);
  }
  return { valores: out, avisos };
}

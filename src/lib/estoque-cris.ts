/**
 * Prompt Y2 (Fase 3 · revisão V5): em Materiais e Equipamentos (/estoque), a
 * Cris preenche a entrada ou a baixa (saída) que a pessoa diz ou dita. Módulo
 * PURO. Ela só preenche; quem registra é o botão da tela, com as validações do
 * servidor (saldo, lastro da entrada, projeto de destino da baixa).
 */
import type { FormularioDaTela } from "@/lib/cris";
import { ENTRADA_ORIGENS, SAIDA_MOTIVOS } from "@/lib/estoque-regras";

export interface MaterialCris {
  id: string;
  nome: string;
  sku: string | null;
  unidade: string;
}
export interface OpcaoCris {
  id: string;
  rotulo: string;
}

/** Até 200 opções por campo (limite do formulário da Cris). */
const LIMITE = 200;
const rotuloDoMaterial = (m: MaterialCris) => `${m.nome}${m.sku ? ` (${m.sku})` : ""} · ${m.unidade}`;

export function formularioDoMovimento(materiais: readonly MaterialCris[], obras: readonly OpcaoCris[], despesas: readonly OpcaoCris[]): FormularioDaTela {
  return {
    id: "estoque-movimento",
    titulo: "Movimento de materiais e equipamentos: entrada ou baixa (saída), um item por vez",
    campos: [
      { nome: "tipo", rotulo: "Tipo", tipo: "opcao", opcoes: ["entrada", "baixa"] },
      { nome: "material", rotulo: "Material", tipo: "opcao", opcoes: materiais.slice(0, LIMITE).map(rotuloDoMaterial) },
      { nome: "quantidade", rotulo: "Quantidade (na unidade do material)", tipo: "numero" },
      { nome: "motivo", rotulo: "Origem da entrada ou motivo da baixa", tipo: "opcao", opcoes: [...new Set([...ENTRADA_ORIGENS, ...SAIDA_MOTIVOS])] },
      { nome: "obra", rotulo: "Projeto (destino da baixa; opcional na entrada)", tipo: "opcao", opcoes: obras.slice(0, LIMITE).map((o) => o.rotulo) },
      { nome: "despesa", rotulo: "Despesa de compra (só na entrada)", tipo: "opcao", opcoes: despesas.slice(0, LIMITE).map((d) => d.rotulo) },
      { nome: "data", rotulo: "Data", tipo: "data", dica: "MM/DD/YYYY" },
      { nome: "doc", rotulo: "Documento (NF / requisição)", tipo: "texto" },
      { nome: "obs", rotulo: "Observação", tipo: "texto" },
    ],
  };
}

export interface MovimentoProposto {
  tipo?: "entrada" | "saida";
  itemId?: string;
  quantidade?: string;
  origem?: string;
  projectId?: string;
  despesaId?: string;
  data?: string;
  doc?: string;
  obs?: string;
}

/** Os valores da proposta nos campos da tela. O que não casa fica de fora, com aviso. */
export function movimentoDaProposta(
  valores: Record<string, string>,
  materiais: readonly MaterialCris[],
  obras: readonly OpcaoCris[],
  despesas: readonly OpcaoCris[],
  tipoAtual: "entrada" | "saida",
): { mov: MovimentoProposto; avisos: string[] } {
  const mov: MovimentoProposto = {};
  const avisos: string[] = [];
  if (valores.tipo) mov.tipo = valores.tipo === "baixa" ? "saida" : "entrada";
  const tipo = mov.tipo ?? tipoAtual;
  if (valores.material) {
    const m = materiais.find((x) => rotuloDoMaterial(x) === valores.material);
    if (m) mov.itemId = m.id;
    else avisos.push(`Material "${valores.material}" não está cadastrado.`);
  }
  if (valores.quantidade != null && valores.quantidade !== "") {
    const n = Number(valores.quantidade);
    if (Number.isFinite(n) && n > 0) mov.quantidade = String(Math.round(n * 1000) / 1000);
    else avisos.push("Quantidade inválida.");
  }
  if (valores.motivo) {
    const lista: readonly string[] = tipo === "entrada" ? ENTRADA_ORIGENS : SAIDA_MOTIVOS;
    if (lista.includes(valores.motivo)) mov.origem = valores.motivo;
    else avisos.push(`"${valores.motivo}" não é ${tipo === "entrada" ? "origem de entrada" : "motivo de baixa"}.`);
  }
  if (valores.obra) {
    const o = obras.find((x) => x.rotulo === valores.obra);
    if (o) mov.projectId = o.id;
  }
  if (valores.despesa) {
    if (tipo === "saida") avisos.push("A baixa não aponta despesa; a despesa proposta ficou de fora.");
    else {
      const d = despesas.find((x) => x.rotulo === valores.despesa);
      if (d) mov.despesaId = d.id;
    }
  }
  if (valores.data) mov.data = valores.data;
  if (valores.doc) mov.doc = valores.doc.slice(0, 120);
  if (valores.obs) mov.obs = valores.obs.slice(0, 500);
  return { mov, avisos };
}

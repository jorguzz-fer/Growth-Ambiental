/**
 * Plano de Trabalho × Cris — o formulário que a Cris pode PROPOR preencher a
 * partir de uma proposta técnica, plano de trabalho, termo de referência,
 * contrato ou texto colado. Módulo PURO.
 *
 * A Cris só devolve a proposta; a tela mostra a árvore para conferência
 * (com a origem e o trecho de cada item) e quem grava é o botão "Criar plano
 * com os itens marcados". O conteúdo do documento é dado, nunca instrução.
 */
import type { FormularioDaTela } from "@/lib/cris";
import { MAX_FASES_CRIS } from "@/lib/plano-regras";

export const ID_FORM_PLANO = "plano-de-trabalho";

export function formularioDoPlanoDeTrabalho(biblioteca: readonly string[]): FormularioDaTela {
  const amostra = biblioteca.slice(0, 40).join("; ");
  const fases = Array.from({ length: MAX_FASES_CRIS }, (_, i) => {
    const k = i + 1;
    return [
      { nome: `fase${k}_nome`, rotulo: `Fase ${k}: nome`, tipo: "texto" as const, dica: k === 1 ? `use o nome da biblioteca quando a fase do documento corresponder a uma destas: ${amostra}` : undefined },
      { nome: `fase${k}_origem`, rotulo: `Fase ${k}: origem`, tipo: "opcao" as const, opcoes: ["documento", "biblioteca", "sugestão"] },
      { nome: `fase${k}_trecho`, rotulo: `Fase ${k}: trecho do documento que fundamenta`, tipo: "texto" as const, dica: "cópia curta; vazio se for sugestão" },
      { nome: `fase${k}_inicio`, rotulo: `Fase ${k}: início previsto`, tipo: "data" as const, dica: "MM/DD/YYYY; só se o documento trouxer" },
      { nome: `fase${k}_termino`, rotulo: `Fase ${k}: término previsto`, tipo: "data" as const, dica: "MM/DD/YYYY; só se o documento trouxer" },
      { nome: `fase${k}_atividades`, rotulo: `Fase ${k}: atividades`, tipo: "texto" as const, dica: 'uma por linha: "Nome | documento|biblioteca|sugestão | trecho"; subatividade começa com "-"' },
      { nome: `fase${k}_entregas`, rotulo: `Fase ${k}: entregas e marcos`, tipo: "texto" as const, dica: 'uma por linha: "Nome | MM/DD/YYYY | documento|sugestão"' },
    ];
  }).flat();
  return {
    id: ID_FORM_PLANO,
    titulo:
      "Plano de trabalho do projeto (fases, atividades e entregas extraídas do documento — o usuário confere e escolhe o que gravar). Não invente: use só o que o documento traz; marque como 'sugestão' o que vier de você. Não inclua fases da biblioteca que o documento não justifique.",
    campos: fases,
  };
}

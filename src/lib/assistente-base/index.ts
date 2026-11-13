/**
 * Base de conhecimento da Cris (Prompt E2; antes, do Assistente do produto, Prompt AM, Parte 2).
 *
 * Texto versionado no repositório, descrevendo o sistema DE HOJE (BAM-1). Fica
 * em módulos .ts porque o build de produção (standalone) não leva `docs/`.
 * Nada aqui é dado de empresa. Quem muda um comportamento visível atualiza o
 * trecho correspondente no MESMO PR (proposta de BAM-1, a confirmar).
 */
import { TEXTO as conceitos_despesas_caixa } from "./conceitos-despesas-caixa";
import { TEXTO as bi_planejamento_config } from "./bi-planejamento-config";
import { TEXTO as receitas_obra_pessoas } from "./receitas-obra-pessoas";
import { TEXTO as assistente } from "./assistente";
import { TEXTO as contratos } from "./contratos";
export const BASE_DE_CONHECIMENTO = [conceitos_despesas_caixa, bi_planejamento_config, receitas_obra_pessoas, contratos, assistente].join("\n\n---\n\n");

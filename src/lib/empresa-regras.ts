/**
 * Regras da tela Empresa (Prompt AH). Módulo PURO.
 *
 * Os dois avisos da Parte 4 passaram para dentro do checklist em
 * `calc/emitente-fiscal.ts` (decisão de 01/10/2026); `emitentePronto`
 * continua contando só bloqueios. A validação de gravação (Parte 2) chama os
 * validadores que já existem — nada é reescrito.
 */
import { cepValido, checarProntidaoFiscal, codigoMunicipioValido, ufValida, type PendenciaFiscal } from "@/lib/calc/emitente-fiscal";

export const TELA_EMPRESA = "empresa" as const;

/**
 * Parte 1 — ajuda dos campos: o placeholder nunca sugere um número que pareça
 * valor (1.3, opção 1) e o valor típico do setor vai em texto FORA do campo
 * (opção 2). Nenhum deles vira `defaultValue` (1.4).
 */
export const AJUDA_CAMPO = {
  codigoMunicipio: { placeholder: "7 dígitos, sem ponto", ajuda: "Código do município na tabela do IBGE. É ele, e não o nome, que a nota usa." },
  aliquotaIss: { placeholder: "0 a 5", ajuda: "Alíquota do município para o serviço, em %. Confirme com a contabilidade." },
  // GA-13 D2: ajuda neutra. Os códigos do setor ambiental entram no GA-7, quando a contabilidade validar.
  itemListaServico: { placeholder: "", ajuda: "Item da LC 116/2003 do serviço que a empresa presta. Confirme com a contabilidade." },
  cnae: { placeholder: "", ajuda: "CNAE principal do cartão CNPJ (grave só os dígitos). Confirme com a contabilidade." },
} as const;

/** Parte 4.2 — os cinco campos sem pendência, declarados opcionais na tela. */
export const CAMPOS_OPCIONAIS = ["nomeFantasia", "inscricaoEstadual", "regimeEspecial", "complemento", "telefone"] as const;

/**
 * Parte 2 — o que a action recusa ALÉM de CNPJ e alíquota: CEP, código IBGE
 * e UF preenchidos e inválidos. Vazio continua passando (gravação parcial,
 * 2.3). A mensagem diz o campo e o porquê (2.4). Primeira recusa encontrada.
 */
export function recusaDoCadastroFiscal(v: { cep: string | null; codigoMunicipio: string | null; uf: string | null }): string | null {
  if (v.cep && !cepValido(v.cep)) return "CEP: informe os 8 dígitos (a prefeitura recusa CEP incompleto). Deixe em branco para preencher depois.";
  if (v.codigoMunicipio && !codigoMunicipioValido(v.codigoMunicipio)) return "Código IBGE do município: são 7 dígitos (código errado emite a nota no município errado). Deixe em branco para preencher depois.";
  if (v.uf && !ufValida(v.uf)) return "UF: use a sigla de um dos 27 estados (ex.: SP). Deixe em branco para preencher depois.";
  return null;
}

/**
 * Parte 4.1 — os dois avisos (código tributário do município e município sem
 * IBGE). Desde 01/10/2026 vivem DENTRO de `checarProntidaoFiscal`; esta função
 * só os filtra de lá, para quem precisar deles à parte.
 */
export function avisosComplementares(e: { codigoTributarioMunicipio?: string | null; municipio?: string | null; codigoMunicipio?: string | null }): PendenciaFiscal[] {
  return checarProntidaoFiscal(e).filter((p) => p.campo === "codigoTributarioMunicipio" || p.campo === "municipio");
}

/**
 * Decisão de 01/10/2026: o campo voltou do formulário igual ao gravado? Então
 * é dado antigo — mantém-se como está (inválido inclusive) e não trava o
 * salvamento dos outros campos. Compara o texto aparado.
 */
export function campoInalterado(enviado: string | null | undefined, gravado: string | null | undefined): boolean {
  const n = (v: string | null | undefined) => (v === null || v === undefined || v.trim() === "" ? null : v.trim());
  return n(enviado) === n(gravado) && n(gravado) !== null;
}

/** Parte 5 — o selo do R2 diz o que mede: variáveis presentes ≠ conexão provada. */
export type EstadoDoSelo = "nao_configurado" | "configurado" | "testado_ok" | "testado_falhou";

export interface UltimoTesteR2 {
  ok: boolean;
  quando: Date;
  etapa?: string | null;
}

export function estadoDoSeloR2(configurado: boolean, ultimo: UltimoTesteR2 | null): EstadoDoSelo {
  if (!configurado) return "nao_configurado";
  if (!ultimo) return "configurado";
  return ultimo.ok ? "testado_ok" : "testado_falhou";
}

export function rotuloDoSeloR2(estado: EstadoDoSelo): { texto: string; tom: "success" | "neutral" | "warning" | "danger" } {
  switch (estado) {
    case "nao_configurado":
      return { texto: "R2 não configurado", tom: "neutral" };
    case "configurado":
      return { texto: "R2 configurado (sem teste)", tom: "warning" };
    case "testado_ok":
      return { texto: "R2 testado", tom: "success" };
    case "testado_falhou":
      return { texto: "R2 com falha no teste", tom: "danger" };
  }
}

/** Parte 3 — o nome vai no corpo da nota: a recusa diz por quê. */
export function recusaDoNome(nome: string): string | null {
  const n = nome.trim();
  if (!n) return "Informe o nome da empresa: a razão social vai no corpo da nota.";
  if (n.length > 200) return "Nome da empresa com mais de 200 caracteres.";
  return null;
}

/**
 * BAE-1 (decisão de 01/10/2026): os limites dos alertas do Resumo Executivo,
 * um valor só para a empresa. Aceita vírgula decimal. Devolve a recusa dita.
 */
export function lerLimitesDeAlerta(v: { desvioPct: unknown; desvioValor: unknown; vencidoDias: unknown }):
  | { ok: true; desvioPct: number; desvioValor: number; vencidoDias: number }
  | { ok: false; error: string } {
  // "5.000,00", "5000,5", "5000.5" e "5.000" — ponto só é milhar em grupos de três.
  const num = (x: unknown) => {
    if (typeof x !== "string" || !x.trim()) return NaN;
    const t = x.trim().replace(/^R\$\s*/, "");
    if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
    return /^\d{1,3}(\.\d{3})+$/.test(t) ? Number(t.replace(/\./g, "")) : Number(t);
  };
  const pct = num(v.desvioPct);
  const valor = num(v.desvioValor);
  const dias = typeof v.vencidoDias === "string" ? Number(v.vencidoDias.trim()) : NaN;
  if (!Number.isFinite(pct) || pct <= 0 || pct > 1000) return { ok: false, error: "Desvio de custo (%): informe um número maior que 0 e até 1000." };
  if (!Number.isFinite(valor) || valor < 0 || valor > 1e12) return { ok: false, error: "Desvio de custo (R$): informe um valor de 0 em diante." };
  if (!Number.isInteger(dias) || dias < 0 || dias > 3650) return { ok: false, error: "Recebível vencido (dias): informe um número inteiro de 0 a 3650." };
  return { ok: true, desvioPct: Math.round(pct * 100) / 100, desvioValor: Math.round(valor * 100) / 100, vencidoDias: dias };
}

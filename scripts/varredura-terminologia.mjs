// Varredura de terminologia setorial (construção civil / incorporação).
// Conta ocorrências por termo e por área do repositório. Uso:
//   node scripts/varredura-terminologia.mjs            → tabela
//   node scripts/varredura-terminologia.mjs --json     → JSON
// Não decide nada sozinho: a classificação (remover, substituir, preservar,
// referência interna) é contextual — ver docs/AUDITORIA_TERMINOLOGIA_AMBIENTAL.md.
import { execFileSync } from "node:child_process";

export const TERMOS = {
  "obra(s)": "\\bobras?\\b",
  "construção/construções": "constru[cç](ã|a)o|constru[cç](õ|o)es",
  "construtora(s)": "construtoras?",
  "construído": "constru[ií]d[oa]s?",
  "edificação": "edifica[cç]",
  "empreitada": "empreitada",
  "canteiro": "canteiro",
  "terreno(s)": "\\bterrenos?\\b",
  "lote/loteamento": "\\blotes?\\b|loteamento",
  "unidade imobiliária/habitacional": "unidades? (imobili|habitac)",
  "apartamento": "apartamentos?",
  "empreendimento": "empreendimentos?",
  "incorporação/incorporadora": "incorpora(ç|c)(ã|a)o|incorporadora",
  "comprador": "compradore?s?",
  "INCC": "\\bINCC",
  "CUB": "\\bCUB\\b",
  "BDI": "\\bBDI\\b",
  "VGV": "\\bVGV\\b",
  "SAC/PRICE/SBPE": "\\bSBPE\\b|\\bSAC\\b|\\bPRICE\\b",
  "FGTS": "\\bFGTS\\b",
  "subsídio": "subs[ií]dio",
  "permuta": "\\bpermutas?\\b",
  "repasse": "\\brepasses?\\b",
  "financiamento": "financiamentos?",
  "liberação de obra": "libera(ç|c)(ã|a)o de obra|libera(ç|c)(õ|o)es de obra",
  "CEF/Caixa Econômica": "\\bCEF\\b|Caixa Econ(ô|o)mica",
  "habite-se": "habite-se",
};
export const AREAS = {
  "interface (src/app)": ["src/app"],
  "componentes (src/components)": ["src/components"],
  "Cris (assistente-base, ai, cris*, agent)": ["src/lib/assistente-base", "src/lib/ai", "src/lib/agent", "src/lib/cris.ts", "src/lib/cris-dados.ts", "src/lib/cris-dados-ferramentas.ts", "src/lib/cris-colagem.ts"],
  "regras e consultas (src/lib, resto)": ["src/lib"],
  "testes (*.test.ts)": ["src"],
  "documentação (docs, README)": ["docs", "README.md"],
};

function contar(regex, caminhos, extra) {
  try {
    const out = execFileSync("rg", ["-i", "-o", "--no-filename", ...extra, "-e", regex, ...caminhos], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return out.split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}
const SEM_TESTE = ["-g", "!*.test.ts", "-g", "!*.test.tsx", "-g", "!**/migrations/**", "-g", "!**/__fixtures__/**"];
const SEM_CRIS = ["-g", "!assistente-base/**", "-g", "!ai/**", "-g", "!agent/**", "-g", "!cris.ts", "-g", "!cris-dados.ts", "-g", "!cris-dados-ferramentas.ts", "-g", "!cris-colagem.ts"];
const resultado = {};
for (const [termo, rx] of Object.entries(TERMOS)) {
  resultado[termo] = {};
  for (const [area, caminhos] of Object.entries(AREAS)) {
    const extra = area.startsWith("testes") ? ["-g", "*.test.ts", "-g", "*.test.tsx"] : area.startsWith("regras") ? [...SEM_TESTE, ...SEM_CRIS] : area.startsWith("documentação") ? [] : SEM_TESTE;
    resultado[termo][area] = contar(rx, caminhos, extra);
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify(resultado, null, 2));
else {
  const areas = Object.keys(AREAS);
  console.log(["termo", ...areas.map((a) => a.split(" ")[0])].join(" | "));
  for (const [t, v] of Object.entries(resultado)) console.log([t, ...areas.map((a) => v[a])].join(" | "));
}

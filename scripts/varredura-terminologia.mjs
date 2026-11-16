// Varredura de terminologia setorial (construção civil / incorporação).
// Conta ocorrências por termo e por área do repositório. Uso:
//   node scripts/varredura-terminologia.mjs            → tabela
//   node scripts/varredura-terminologia.mjs --json     → JSON
// Não decide nada sozinho: a classificação (remover, substituir, preservar,
// referência interna) é contextual — ver docs/AUDITORIA_TERMINOLOGIA_AMBIENTAL.md.
// GA-13 G1: lista os arquivos pelo helper compartilhado (funciona sem .git e
// sem o ripgrep instalado) e conta com a regex do próprio Node.
import { readFileSync } from "node:fs";
import { listarArquivosDoRepositorio } from "./lib/listar-arquivos.mjs";

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

const BINARIO = /\.(zip|gz|tgz|rar|7z|png|jpe?g|gif|webp|ico|pdf|xlsx?|docx?|woff2?)$/i;
const TODOS = listarArquivosDoRepositorio().filter((f) => !BINARIO.test(f));
const TEXTO = new Map();
const texto = (f) => {
  if (!TEXTO.has(f)) {
    try {
      TEXTO.set(f, readFileSync(f, "utf8"));
    } catch {
      TEXTO.set(f, "");
    }
  }
  return TEXTO.get(f);
};
const ehTeste = (f) => /\.test\.tsx?$/.test(f);
const SEM_TESTE = (f) => !ehTeste(f) && !/(^|\/)migrations\//.test(f) && !/(^|\/)__fixtures__\//.test(f);
const CRIS = /(^|\/)(assistente-base|ai|agent)\/|(^|\/)(cris|cris-dados|cris-dados-ferramentas|cris-colagem)\.ts$/;
const SEM_CRIS = (f) => !CRIS.test(f.replace(/^src\/lib\//, ""));
const dentro = (f, caminhos) => caminhos.some((c) => f === c || f.startsWith(`${c}/`));

function contar(regex, caminhos, filtro) {
  const rx = new RegExp(regex, "gi");
  let n = 0;
  for (const f of TODOS) if (dentro(f, caminhos) && filtro(f)) n += (texto(f).match(rx) ?? []).length;
  return n;
}
const resultado = {};
for (const [termo, rx] of Object.entries(TERMOS)) {
  resultado[termo] = {};
  for (const [area, caminhos] of Object.entries(AREAS)) {
    const filtro = area.startsWith("testes") ? ehTeste : area.startsWith("regras") ? (f) => SEM_TESTE(f) && SEM_CRIS(f) : area.startsWith("documentação") ? () => true : SEM_TESTE;
    resultado[termo][area] = contar(rx, caminhos, filtro);
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify(resultado, null, 2));
else {
  const areas = Object.keys(AREAS);
  console.log(["termo", ...areas.map((a) => a.split(" ")[0])].join(" | "));
  for (const [t, v] of Object.entries(resultado)) console.log([t, ...areas.map((a) => v[a])].join(" | "));
}

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Regressão de terminologia (Growth Ambiental). Varre o TEXTO VISÍVEL das
 * telas e componentes (literais de string com espaço e texto JSX; comentários,
 * identificadores e interpolações `${...}` ficam fora) atrás de termos de
 * construção civil e incorporação imobiliária.
 *
 * Nada é trocado às cegas: cada ocorrência que pode ficar está na lista
 * PERMITIDAS abaixo, com arquivo, termo e o motivo (classes C/D/E da
 * auditoria em docs/AUDITORIA_TERMINOLOGIA_AMBIENTAL.md). Ocorrência nova, ou
 * em arquivo novo, falha o teste: ou o texto é corrigido, ou a exceção é
 * justificada aqui.
 */

const RAIZES = ["src/app", "src/components"];

const TERMOS: [string, RegExp][] = [
  ["obra", /\bobras?\b/i],
  ["construtora", /construtora/i],
  ["incorporação", /incorpora(dor|ção|cao)/i],
  ["VGV", /\bVGV\b/],
  ["comprador", /comprador/i],
  ["canteiro", /canteiro/i],
  ["CUB", /\bCUB\b/],
  ["BDI", /\bBDI\b/],
  ["SBPE", /\bSBPE\b/],
  ["SAC/PRICE", /\b(SAC|PRICE)\b/],
  ["liberação de obra", /libera(ção|ções|cao|coes) de obra/i],
  ["Conta CEF", /conta CEF/i],
  ["Relatório CEF", /relat[óo]rio CEF/i],
  ["Acerto Contábil", /Acerto Cont[áa]bil/],
  ["Controle de Estoques", /Controle de Estoques/],
  ["unidade imobiliária", /unidades? (imobili|habitaciona)/i],
  ["empreendimento", /empreendimento/i],
  ["INCC", /\bINCC\b/],
  ["permuta", /permuta/i],
  ["terreno", /terreno/i],
  ["habite-se", /habite-se/i],
];

/** Usos legítimos em qualquer arquivo (classe C). */
const LEGITIMOS_GERAIS: RegExp[] = [
  /m[ãa]o de obra/gi, // trabalho, não o objeto gerido
  /monitoramento arqueol[óo]gico de obras?/gi,
  /licenciamento (ambiental )?de empreendimentos?/gi,
  /diagn[óo]stico ambiental de terrenos?/gi,
];

/**
 * Exceções por arquivo: [arquivo, termo, motivo]. O motivo diz a classe:
 * E = dado antigo ou regra financeira ainda em uso (só aparece com dados de
 * incorporação, ou descreve a chave/regra histórica).
 */
const PERMITIDAS: [string, string, string][] = [
  // Chaves de comportamento: descrevem o efeito histórico de cada chave nos dados antigos.
  ["src/app/(app)/chaves/page.tsx", "INCC", "E: prévia da chave do INCC da empresa (dados antigos)"],
  ["src/app/(app)/chaves/page.tsx", "VGV", "E: prévia da chave do Dashboard (dados antigos)"],
  ["src/app/(app)/chaves/page.tsx", "comprador", "E: chave 'parcela do comprador' (parcelas de venda antigas)"],
  ["src/app/(app)/chaves/page.tsx", "obra", "E: 'meses/janela de obra' do rateio da receita de venda (dados antigos)"],
  ["src/app/(app)/chaves/page.tsx", "permuta", "E: prévia das chaves de caixa e DRE com permuta (dados antigos)"],
  // DRE e Fluxo: composição da receita que ainda lê os dados antigos.
  ["src/app/(app)/dre/page.tsx", "obra", "E: rateio da receita de venda de unidade (chave histórica)"],
  ["src/app/(app)/dre/page.tsx", "permuta", "E: regime de permutas antigas pela liquidação"],
  ["src/app/(app)/fluxocaixa/page.tsx", "permuta", "E: revenda de permuta parcelada (dados antigos)"],
  // Resumo: blocos que só aparecem quando a versão tem dados de incorporação.
  ["src/app/(app)/resumo/page.tsx", "VGV", "E: bloco Vendas/Comparativo só com unidades antigas"],
  ["src/app/(app)/resumo/page.tsx", "permuta", "E: linhas de permuta só com dados antigos"],
  ["src/app/(app)/resumo/page.tsx", "incorporação", "E: aviso que marca os dados antigos de incorporação"],
  // Materiais: vínculo com permuta só quando existem permutas antigas.
  ["src/components/app/estoque-manager.tsx", "permuta", "E: campo de permuta só com dados antigos"],
  ["src/components/app/assistente-estoque.tsx", "permuta", "E: entrada antiga sem despesa nem permuta"],
  ["src/components/app/equipes-manager.tsx", "canteiro", "D: valor gravado antigo, filtrado da lista nova"],
  // INCC: o provisionamento e a replicação de versão ainda carregam a tabela (resíduo interno).
  ["src/app/plataforma/(console)/page.tsx", "INCC", "E: provisionamento ainda grava a tabela INCC padrão"],
  ["src/components/app/budget-planning-screen.tsx", "INCC", "E: replicação de versão ainda carrega o INCC"],
];

/** Fragmentos que são código (não texto visível) — o extrator é heurístico. */
const PARECE_CODIGO = /=>|\buse(State|Memo|Effect|Ref)\b|\bconst |;\s*$|\breturn\b|\(\)\s*[;{]/m;

function arquivos(): string[] {
  const out: string[] = [];
  const andar = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
    }
  };
  RAIZES.forEach(andar);
  return out;
}

function semComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

function textosVisiveis(src: string): string[] {
  const out: string[] = [];
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|>([^<>{}]*[A-Za-zÀ-ú][^<>{}]*)</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const t = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").replace(/\$\{[^}]*\}/g, " ");
    if (!/\s/.test(t.trim())) continue; // chave, id ou classe: sem espaço não é frase
    if (PARECE_CODIGO.test(t)) continue;
    out.push(t);
  }
  return out;
}

export function ocorrencias(): Map<string, string[]> {
  const achadas = new Map<string, string[]>();
  for (const f of arquivos()) {
    const rel = f.split(path.sep).join("/");
    for (const t0 of textosVisiveis(semComentarios(fs.readFileSync(f, "utf8")))) {
      let t = t0;
      for (const l of LEGITIMOS_GERAIS) t = t.replace(l, "");
      for (const [nome, re] of TERMOS) {
        if (!re.test(t)) continue;
        const k = `${rel} :: ${nome}`;
        achadas.set(k, [...(achadas.get(k) ?? []), t0.trim().slice(0, 100)]);
      }
    }
  }
  return achadas;
}

describe("Regressão de terminologia ambiental (texto visível de telas e componentes)", () => {
  const achadas = ocorrencias();
  const permitidas = new Set(PERMITIDAS.map(([a, t]) => `${a} :: ${t}`));

  it("nenhum termo de construção/incorporação fora da lista de exceções justificadas", () => {
    const novas = [...achadas.entries()].filter(([k]) => !permitidas.has(k)).map(([k, v]) => `${k} → "${v[0]}"`);
    expect(novas, `Termos novos no texto visível. Corrija o texto ou justifique em PERMITIDAS:\n${novas.join("\n")}`).toEqual([]);
  });

  it("a lista de exceções não guarda entrada sem ocorrência (texto já corrigido sai da lista)", () => {
    const sobrando = PERMITIDAS.map(([a, t]) => `${a} :: ${t}`).filter((k) => !achadas.has(k));
    expect(sobrando).toEqual([]);
  });

  it("toda exceção tem motivo com classe C, D ou E", () => {
    for (const [arquivo, termo, motivo] of PERMITIDAS) expect(motivo, `${arquivo} :: ${termo}`).toMatch(/^[CDE]: \S/);
  });

  it("usos legítimos não disparam (monitoramento arqueológico de obras, licenciamento de empreendimento, mão de obra)", () => {
    const amostra = "Monitoramento arqueológico de obras, licenciamento ambiental de empreendimento e mão de obra de campo";
    let t = amostra;
    for (const l of LEGITIMOS_GERAIS) t = t.replace(l, "");
    expect(TERMOS.filter(([, re]) => re.test(t)).map(([n]) => n)).toEqual([]);
  });

  it("o detector pega o termo proibido em texto novo", () => {
    expect(TERMOS.find(([n]) => n === "VGV")![1].test("VGV total da obra")).toBe(true);
    expect(TERMOS.find(([n]) => n === "obra")![1].test("Nome da obra")).toBe(true);
  });
});

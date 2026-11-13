import { describe, it, expect } from "vitest";
import {
  categoriaDoGrupo,
  classeDaConta,
  classePadrao,
  classesPermitidas,
  contaDoPapel,
  contasSemelhantes,
  dreGerencial,
  grupoDaChave,
  grupoDaConta,
  linhasDeExportacao,
  previaDaImportacao,
  recusaDaContaDoLancamento,
  recusaDeCodigo,
  recusaDeHierarquia,
  semelhanca,
  sugerirContas,
  tipoCustoDoLancamento,
  type ClasseGerencial,
} from "./planocontas-regras";
import { waterfall } from "@/lib/calc/dre-cascata";
import { paraInputs } from "@/lib/dre-analitica";
import { linhasDoPlano } from "@/lib/calc/plano-ambiental";

describe("Plano de Contas — estrutura (§5, §19)", () => {
  const g = [
    { id: "a", code: "2", parentId: null },
    { id: "b", code: "2.3", parentId: "a" },
    { id: "c", code: "2.3.A", parentId: "b" },
    { id: "d", code: "3", parentId: null },
  ];
  it("sem ciclo, sem auto-pai, até 3 níveis", () => {
    expect(recusaDeHierarquia(g, null, "b")).toBeNull();
    expect(recusaDeHierarquia(g, "a", "a")).toMatch(/si mesmo/);
    expect(recusaDeHierarquia(g, "a", "c")).toMatch(/ciclo/);
    expect(recusaDeHierarquia(g, null, "c")).toMatch(/3 níveis/);
    expect(recusaDeHierarquia(g, "d", "b")).toBeNull(); // d (sem filhos) sob b (nível 2) fica no nível 3: aceito
    expect(recusaDeHierarquia(g, "a", "d")).toMatch(/3 níveis/); // a tem 3 níveis embaixo: sob d passaria de 3
  });
  it("códigos: válidos e sem espaço", () => {
    expect(recusaDeCodigo("2.3.01")).toBeNull();
    expect(recusaDeCodigo("PA-2.3")).toBeNull();
    expect(recusaDeCodigo("2 3")).toMatch(/Código só/);
    expect(recusaDeCodigo("")).toMatch(/Informe/);
  });
  it("grupo pelo cadastro, nunca pelo prefixo (2.3.01 é do 2.3); prefixo só para legado", () => {
    const mapa = new Map([["2.3.01", "2.3"]]);
    expect(grupoDaConta(mapa, "2.3.01")).toBe("2.3");
    expect(grupoDaConta(mapa, "1.1")).toBe("1");
    expect(grupoDaChave("2.3", new Set(["2.3"]))).toBe("2.3");
    expect(grupoDaChave("2.3.01", new Set(["2.3"]), mapa)).toBe("2.3");
    expect(grupoDaChave("1.1", new Set(["1"]))).toBe("1");
  });
  it("categoria do grupo só quando as contas ativas concordam", () => {
    expect(categoriaDoGrupo([{ ativo: true, categoria: "Custo Variável" }, { ativo: false, categoria: "Custo Fixo" }])).toBe("Custo Variável");
    expect(categoriaDoGrupo([{ ativo: true, categoria: "Custo Variável" }, { ativo: true, categoria: "Custo Fixo" }])).toBeNull();
  });
  it("papel técnico resolve pela conta, com o código histórico como reserva", () => {
    expect(contaDoPapel([{ code: "4.2.02", papel: "juros_mora" }], "juros_mora")).toBe("4.2.02");
    expect(contaDoPapel([], "descontos_obtidos")).toBe("F.7");
  });
});

describe("Plano de Contas — classificação (§3, §8, §11)", () => {
  it("classe padrão pela categoria; classes coerentes com a natureza", () => {
    expect(classePadrao("Custo Fixo")).toBe("custo_servico");
    expect(classePadrao("Despesas Financeiras")).toBe("resultado_financeiro");
    expect(classePadrao("Investimento")).toBe("fora_do_resultado");
    expect(classeDaConta({ classeGerencial: "deducao" }, "Despesa Variável")).toBe("deducao");
    expect(classeDaConta({ classeGerencial: null }, "Receita")).toBe("receita_bruta");
    expect(classesPermitidas("receita")).not.toContain("custo_servico");
    expect(classesPermitidas("despesa")).not.toContain("receita_bruta");
  });
  it("direto/indireto: o lançamento manda; senão o padrão da conta", () => {
    expect(tipoCustoDoLancamento("indireto", "direto")).toBe("indireto");
    expect(tipoCustoDoLancamento(null, "direto")).toBe("direto");
    expect(tipoCustoDoLancamento(null, null)).toBeNull();
  });
  it("lançamento: conta do plano, ativa e analítica; manter a anterior é permitido", () => {
    const contas = new Map([
      ["2.3.03", { code: "2.3.03", ativo: true, natureza: "despesa" }],
      ["2.3.04", { code: "2.3.04", ativo: false, natureza: "despesa" }],
    ]);
    const grupos = new Set(["2.3"]);
    expect(recusaDaContaDoLancamento("2.3.03", contas, grupos)).toBeNull();
    expect(recusaDaContaDoLancamento("2.3.04", contas, grupos)).toMatch(/inativa/);
    expect(recusaDaContaDoLancamento("2.3.04", contas, grupos, { anterior: "2.3.04" })).toBeNull();
    expect(recusaDaContaDoLancamento("2.3", contas, grupos)).toMatch(/grupo/);
    expect(recusaDaContaDoLancamento("9.9", contas, grupos)).toMatch(/não existe/);
    expect(recusaDaContaDoLancamento("", contas, grupos)).toBeNull();
  });
});

describe("Plano de Contas — Cris: duplicidade e sugestão (§13)", () => {
  const contas = linhasDoPlano("t").map((c) => ({ code: c.code, name: c.name, ativo: true, natureza: c.natureza }));
  it("acha a conta existente para nome parecido; não acusa nomes diferentes", () => {
    expect(contasSemelhantes("Hospedagem em viagem", contas)[0].code).toBe("2.3.03");
    expect(semelhanca("Combustíveis", "Combustível")).toBe(1);
    expect(semelhanca("Aluguel", "Pedágios")).toBe(0);
  });
  it("sugere pela descrição do lançamento, só contas ativas da natureza", () => {
    expect(sugerirContas("Hospedagem de equipe durante campanha arqueológica", contas)[0].code).toBe("2.3.03");
    expect(sugerirContas("abastecimento combustível da caminhonete", contas)[0].name).toBe("Combustíveis");
    expect(sugerirContas("Hospedagens", contas.map((c) => (c.code === "2.3.03" ? { ...c, ativo: false } : c))).map((c) => c.code)).not.toContain("2.3.03");
    expect(sugerirContas("rendimentos de aplicações", contas, "receita")[0].name).toBe("Rendimentos de aplicações");
  });
});

describe("Plano de Contas — importação (§17)", () => {
  const existentes = [
    { id: "1", code: "2.3.03", name: "Hospedagens", descricao: null, groupCode: "2.3", natureza: "despesa", dreCategory: null, categoria: "Custo Variável", ativo: true, usada: true },
    { id: "2", code: "2.3.04", name: "Alimentação", descricao: null, groupCode: "2.3", natureza: "despesa", dreCategory: null, categoria: "Custo Variável", ativo: true, usada: false },
  ];
  const grupos = new Set(["2.3", "2.4"]);
  const l = (linha: number, code: string, name: string, grupo = "2.3", natureza = "Despesa", categoria = "") => ({ linha, code, name, grupo, natureza, categoria });
  it("separa novas, alteradas, iguais, duplicidades, erros e impacto na DRE", () => {
    const p = previaDaImportacao(
      [
        l(2, "2.3.20", "Pernoites"),
        l(3, "2.3.03", "Hospedagens", "2.3", "Despesa", "Custo Fixo"),
        l(4, "2.3.04", "Alimentação em campo", "2.4"),
        l(5, "2.3.20", "Repetida"),
        l(6, "2.3", "Grupo como conta"),
        l(7, "2.3.03", "Hosp", "2.4"),
        l(8, "2.3.21", "Hospedagens"),
        l(9, "2.3.22", "Sem grupo", "9.9"),
      ],
      existentes,
      grupos,
    );
    expect(p.novas.map((x) => x.code)).toEqual(["2.3.20", "2.3.21"]);
    expect(p.alteradas.map((x) => x.linha.code)).toEqual(["2.3.03", "2.3.04"]);
    expect(p.alteradas[1].mudancas.join()).toMatch(/grupo: 2.3 → 2.4/);
    expect(p.impactoDre).toEqual([{ code: "2.3.03", de: "Custo Variável", para: "Custo Fixo", usada: true }]);
    expect(p.duplicidades.map((d) => d.code).sort()).toEqual(["2.3.03", "2.3.20", "2.3.21"]);
    expect(p.erros.map((e) => e.code).sort()).toEqual(["2.3", "2.3.22"]);
  });
  it("conta usada não muda de grupo nem de natureza por importação", () => {
    const p = previaDaImportacao([l(2, "2.3.03", "Hospedagens", "2.4"), l(3, "2.3.03", "x")], existentes, grupos);
    expect(p.erros[0].motivo).toMatch(/não muda de grupo/);
  });
});

describe("Plano de Contas — DRE gerencial (§8)", () => {
  const contas = new Map<string, { name: string; classe: ClasseGerencial }>([
    ["1.1.01", { name: "Receita de consultoria", classe: "receita_bruta" }],
    ["5.1.01", { name: "ISS", classe: "deducao" }],
    ["2.3.03", { name: "Hospedagens", classe: "custo_servico" }],
    ["3.1.01", { name: "Aluguel", classe: "despesa_operacional" }],
    ["4.1.01", { name: "Rendimentos", classe: "resultado_financeiro" }],
    ["4.2.01", { name: "Tarifas", classe: "resultado_financeiro" }],
    ["5.2.01", { name: "IRPJ", classe: "tributo_lucro" }],
    ["6.3.01", { name: "Equipamentos", classe: "fora_do_resultado" }],
    ["6.5.01", { name: "Pró-labore", classe: "despesa_operacional" }],
  ]);
  const entrada = {
    receitaVendas: 10000,
    receitaPermuta: 0,
    encargos: 20,
    lancamentos: [
      { categoria: "Receita", conta: "1.1.01", valor: 5000 },
      { categoria: "Despesa Variável", conta: "5.1.01", valor: 750 },
      { categoria: "Custo Variável", conta: "2.3.03", valor: 2000 },
      { categoria: "Despesa Fixa", conta: "3.1.01", valor: 1000 },
      { categoria: "Receita", conta: "4.1.01", valor: 100 },
      { categoria: "Despesas Financeiras", conta: "4.2.01", valor: 30 },
      { categoria: "Despesa Variável", conta: "5.2.01", valor: 400 },
      { categoria: "Investimento", conta: "6.3.01", valor: 3000 },
      { categoria: "Retiradas", conta: "6.5.01", valor: 800 },
      { categoria: "Custo Fixo", conta: "ZZ", valor: 50 },
    ],
  };
  const g = dreGerencial({ receitaSemConta: 10000, encargos: 20, lancamentos: entrada.lancamentos }, contas);
  const v = (id: string) => g.linhas.find((l) => l.id === id)!.valor;
  it("estrutura Receita bruta → Resultado líquido com os subtotais certos", () => {
    expect(v("receita_bruta")).toBe(15000);
    expect(v("receita_liquida")).toBe(14250);
    expect(v("resultado_bruto")).toBe(12200); // − hospedagem 2000 − conta fora do plano 50 (custo fixo)
    expect(v("resultado_operacional")).toBe(10400); // − aluguel − pró-labore
    expect(v("resultado_financeiro")).toBe(50); // + rendimentos 100 − tarifas 30 − encargos 20
    expect(v("lair")).toBe(10450);
    expect(v("resultado_liquido")).toBe(10050);
    expect(g.semClasse).toEqual(["ZZ"]);
  });
  it("sem dupla contagem: com o 'fora do resultado', bate com o Resultado Final da cascata", () => {
    const cascata = waterfall([paraInputs(entrada)]).rows.at(-1)!.value;
    expect(g.resultadoDaCascata).toBeCloseTo(cascata, 2);
    expect(v("conciliacao")).toBeCloseTo(cascata, 2);
    // cada lançamento aparece em uma só linha de conta
    const contasListadas = g.linhas.filter((l) => l.tipo === "conta").map((l) => l.rotulo);
    expect(new Set(contasListadas).size).toBe(contasListadas.length);
  });
});

describe("Plano de Contas — exportação (§17)", () => {
  it("ordem da árvore, com as colunas que a importação lê", () => {
    const grupos = [
      { id: "g1", code: "1", name: "Receitas", parentId: null, ordem: 1 },
      { id: "g11", code: "1.1", name: "Serviços", parentId: "g1", ordem: 1 },
      { id: "g2", code: "2", name: "Custos", parentId: null, ordem: 2 },
      { id: "g21", code: "2.1", name: "Pessoal", parentId: "g2", ordem: 1 },
    ];
    const c = (code: string, groupCode: string, ordem: number, natureza = "despesa") => ({ code, name: code, groupCode, natureza, dreCategory: null, classeGerencial: null, tipoCusto: null, ativo: true, descricao: null, ordem, kind: "cef" });
    const l = linhasDeExportacao(grupos, [c("2.1.02", "2.1", 2), c("2.1.01", "2.1", 1), c("1.1.01", "1.1", 1, "receita"), c("L.1", "L", 1)], () => "Custo Variável");
    expect(l.map((x) => x["Código"])).toEqual(["1.1.01", "2.1.01", "2.1.02", "L.1"]);
    expect(l[0]).toMatchObject({ "Grupo (1º nível)": "1 — Receitas", Grupo: "1.1", Natureza: "Receita" });
  });
});

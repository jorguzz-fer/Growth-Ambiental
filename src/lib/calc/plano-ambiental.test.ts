import { describe, it, expect } from "vitest";
import { PLANO_AMBIENTAL, PLANO_CONTAS_PADRAO, gruposDoPlano, linhasDoPlano } from "./plano-ambiental";
import { categoriaDaConta } from "@/lib/categoria-do-plano";
import { categoriaDoGrupo, classesPermitidas, contasSemelhantes, PAPEIS, recusaDeCodigo } from "@/lib/planocontas-regras";
import { recusaDeCategoriaDaConta } from "@/lib/categoria-do-plano";

const contas = linhasDoPlano("t1");
const grupos = gruposDoPlano("t1");

describe("Plano de Contas padrão — consultorias ambientais (§4, §5, §15)", () => {
  it("grupo → subgrupo → conta, com os 6 grupos da estrutura", () => {
    expect(PLANO_AMBIENTAL.map((g) => g.nome)).toEqual([
      "Receitas operacionais",
      "Custos diretos dos projetos",
      "Despesas administrativas e indiretas",
      "Resultado financeiro",
      "Tributos e obrigações",
      "Outras contas e classificações",
    ]);
    for (const g of grupos.filter((x) => x.parentCode)) expect(grupos.some((p) => p.code === g.parentCode && !p.parentCode), g.code).toBe(true);
    for (const c of contas) expect(grupos.some((g) => g.code === c.groupCode && g.parentCode), c.code).toBe(true);
    expect(contas.length).toBeGreaterThan(120);
  });

  it("códigos válidos e únicos entre grupos E contas (o Orçamento usa o código do grupo)", () => {
    const codigos = [...grupos.map((g) => g.code), ...contas.map((c) => c.code)];
    expect(new Set(codigos).size).toBe(codigos.length);
    for (const c of codigos) expect(recusaDeCodigo(c), c).toBeNull();
  });

  it("cada conta traz natureza, categoria, classe e tipo de custo explícitos e coerentes", () => {
    for (const c of contas) {
      expect(recusaDeCategoriaDaConta(c.natureza, c.dreCategory), c.code).toBeNull();
      expect(classesPermitidas(c.natureza), c.code).toContain(c.classeGerencial);
      // nada pelo prefixo: a categoria efetiva é a gravada
      expect(categoriaDaConta(c), c.code).toBe(c.dreCategory);
    }
  });

  it("subgrupo homogêneo em natureza e categoria (uma linha de Orçamento = uma categoria)", () => {
    for (const g of grupos.filter((x) => x.parentCode)) {
      const doGrupo = contas.filter((c) => c.groupCode === g.code);
      expect(new Set(doGrupo.map((c) => c.natureza)).size, g.code).toBe(1);
      expect(categoriaDoGrupo(doGrupo.map((c) => ({ ativo: true, categoria: c.dreCategory }))), g.code).not.toBeNull();
    }
  });

  it("estrutura da DRE: deduções, custos dos serviços, tributos sobre faturamento × resultado", () => {
    const de = (nome: string) => contas.find((c) => c.name === nome)!;
    expect(de("ISS")).toMatchObject({ classeGerencial: "deducao", dreCategory: "Despesa Variável" });
    expect(de("IRPJ")).toMatchObject({ classeGerencial: "tributo_lucro" });
    expect(de("Hospedagens")).toMatchObject({ classeGerencial: "custo_servico", dreCategory: "Custo Variável", tipoCusto: "direto", kind: "cef" });
    expect(de("Aluguel")).toMatchObject({ classeGerencial: "despesa_operacional", dreCategory: "Despesa Fixa", tipoCusto: "indireto" });
    expect(de("Coordenação técnica compartilhada")).toMatchObject({ classeGerencial: "custo_servico", tipoCusto: "indireto" });
    expect(de("Rendimentos de aplicações")).toMatchObject({ natureza: "receita", classeGerencial: "resultado_financeiro" });
    expect(de("Distribuição de lucros")).toMatchObject({ dreCategory: "Retiradas", classeGerencial: "fora_do_resultado" });
    // custo direto dos projetos (bloco "cef") é sempre custo dos serviços
    for (const c of contas.filter((x) => x.kind === "cef")) expect(c.classeGerencial, c.code).toBe("custo_servico");
  });

  it("papéis técnicos do acerto presentes, um de cada", () => {
    for (const p of PAPEIS) expect(contas.filter((c) => c.papel === p), p).toHaveLength(1);
    expect(contas.find((c) => c.papel === "juros_mora")!.dreCategory).toBe("Despesas Financeiras");
  });

  it("sem conta por especialidade, projeto ou contrato; sem nomes duplicados", () => {
    expect(contas.some((c) => /monitoramento arqueol|projeto x|ct-\d/i.test(c.name))).toBe(false);
    const nomes = contas.map((c) => c.name.toLowerCase());
    expect(new Set(nomes).size).toBe(nomes.length);
    // duplicidades evitadas pelo desenho (EPI só em 2.4; diária de campo × de deslocamento descritas)
    expect(contas.filter((c) => /proteção individual/i.test(c.name))).toHaveLength(1);
    expect(contas.find((c) => c.name === "Diárias de campo")!.descricao).toMatch(/deslocamento/);
  });

  it("sem dado real: nenhum nome de cliente, CNPJ ou e-mail", () => {
    const texto = JSON.stringify(PLANO_AMBIENTAL);
    expect(texto).not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}|@/);
  });

  it("formato antigo (modelo de planilha) = subgrupos, custo direto separado", () => {
    expect(PLANO_CONTAS_PADRAO.obra.map((g) => g.id)).toEqual(["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"]);
    expect(PLANO_CONTAS_PADRAO.complementar.find((g) => g.id === "1.1")!.natureza).toBe("receita");
  });

  it("detector de duplicidade reconhece a conta existente", () => {
    expect(contasSemelhantes("Hospedagem em viagem", contas.map((c) => ({ code: c.code, name: c.name })))[0].code).toBe(contas.find((c) => c.name === "Hospedagens")!.code);
  });
});

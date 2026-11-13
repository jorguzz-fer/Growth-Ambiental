import { describe, it, expect } from "vitest";
import { analisarProjeto, analisarProjetos, camposFaltando, inconsistenciasDe, lerComparativo, type ProjetoParaAnalise } from "./projeto-analise";
import { montarCard } from "./calc/orcado-realizado";
import { montarPropostaDeProjeto, type DadosProjetoLidos } from "./ai/projeto-doc";

const base: ProjetoParaAnalise = {
  id: "a", name: "OBRA 28", kind: "proj", situacao: "Ativo", durationMonths: 13,
  startDate: "12/10/2025", endDate: "12/10/2026", mesInicial: "12/2025", mesFinal: "12/2026",
  valorConstrucao: "300000", valorTerreno: "75000", custoConstrucao: "213199.19", custoTerreno: null,
  financiamentoConstrucao: "300000", financiamentoTerreno: "75000", recursosProprios: null, terrenoForaCaixa: true,
  endereco: "Rua A", municipioObra: "Praia Grande", ufObra: "SP", codigoMunicipioObra: "3541000", documentos: 2,
};

describe("Prompt B · assistente de Projetos (24–29)", () => {
  it("obra completa e consistente: nada falta, nada diverge", () => {
    expect(camposFaltando(base)).toEqual([]);
    expect(inconsistenciasDe(base)).toEqual([]);
    const a = analisarProjetos([base, { ...base, id: "o", name: "Escritório", kind: "office", documentos: 0 }]);
    expect(a.cadastroIncompleto).toEqual([]);
    expect(a.semDocumentos).toEqual([]); // escritório não conta
    expect(a.dica).toMatch(/completos e consistentes/);
  });

  it("aponta cadastro incompleto e inconsistências da seção 25", () => {
    const p: ProjetoParaAnalise = { ...base, id: "b", name: "OBRA 32", situacao: null, durationMonths: 6, startDate: "07/06/2026", endDate: "02/10/2027", mesInicial: null, mesFinal: null, financiamentoConstrucao: "100000", financiamentoTerreno: null, codigoMunicipioObra: "", endereco: null, documentos: 0 };
    expect(camposFaltando(p)).toEqual(["endereço"]);
    const inc = inconsistenciasDe(p);
    expect(inc.some((t) => t.includes("6 meses") && t.includes("8 competências"))).toBe(true);
    // Growth Ambiental: funding não é mais inconsistência; o financiamento gravado (dado antigo) aparece à parte
    expect(inc.some((t) => t.startsWith("As fontes somam"))).toBe(false);
    expect(inc).toContain("município informado sem código ibge");
    expect(inc.some((t) => t.includes("período de planejamento"))).toBe(true);
    const a = analisarProjetos([p]);
    expect(a.semClassificacao).toEqual([{ id: "b", nome: "OBRA 32" }]);
    expect(a.semDocumentos).toEqual([{ id: "b", nome: "OBRA 32" }]);
    expect(a.funding[0].itens[0]).toMatch(/faltam/);
    expect(a.dica).toMatch(/sem Ativo\/Finalizado/);
  });

  it("fim antes do início e funding nunca informado", () => {
    const p = { ...base, startDate: "12/25/2026", endDate: "12/24/2026", financiamentoConstrucao: null, financiamentoTerreno: null };
    expect(inconsistenciasDe(p)).toContain("data de fim anterior à de início");
    // funding nunca informado não é inconsistência nem aviso: o cadastro ambiental não pede fontes de financiamento
    expect(inconsistenciasDe(p).some((t) => t.startsWith("As fontes"))).toBe(false);
    expect(analisarProjetos([p]).funding).toEqual([]);
  });

  it("lê o card orçado x realizado com a semântica da cor", () => {
    expect(lerComparativo(null)).toEqual([]);
    expect(lerComparativo(montarCard(null, null))[0]).toMatch(/não há o que comparar/);
    const card = montarCard({ receita: 1000, custoVar: 0, byCat: { "Custo Fixo": 400 } }, { receita: 850, custoVar: 0, byCat: { "Custo Fixo": 428 } });
    const frases = lerComparativo(card);
    expect(frases[0]).toBe("Receita em 85% do orçado.");
    expect(frases[1]).toMatch(/107%.*acima do previsto/);
    expect(frases[2]).toMatch(/Resultado em 70,3%/);
    const a = analisarProjeto(base, card);
    expect(a.comparativo.length).toBe(3);
    expect(a.semDocumentos).toBe(false);
  });

  it("proposta a partir do documento: só o que foi lido e difere do cadastro", () => {
    const lido: DadosProjetoLidos = { nome: "PROJETO 28", endereco: "Av. B, 10", cep: "11700000", municipio: "Praia Grande", uf: "sp", dataInicio: "2025-12-10", dataFim: "2026-12-25", valorConstrucao: 320000, custoConstrucao: 180000, baixaConfianca: ["custoConstrucao"], observacoes: ["o custo vem da proposta, não do contrato"] };
    const p = montarPropostaDeProjeto(lido, { name: "PROJETO 28", endereco: "Rua A", cep: null, municipioObra: "Praia Grande", ufObra: "SP", startDate: "12/10/2025", endDate: "12/10/2026", valorConstrucao: "300000", custoConstrucao: null });
    expect(p.campos.map((c) => `${c.campo}:${c.atual}→${c.proposto}${c.conferir ? "!" : ""}`)).toEqual([
      "endereco:Rua A→Av. B, 10",
      "cep:→11700-000",
      "endDate:12/10/2026→12/25/2026",
      "valorConstrucao:300000→320000",
      "custoConstrucao:→180000!",
    ]);
    expect(p.observacoes).toEqual(["o custo vem da proposta, não do contrato"]);
  });
});

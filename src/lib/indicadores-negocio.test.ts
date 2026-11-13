import { describe, it, expect } from "vitest";
import { INDICADORES_DE_NEGOCIO, SERVICOS_VAZIOS, indicadoresEscolhidos, painelDeIndicadores, somarObras, valorDoIndicador, type DadosDaObra } from "./indicadores-negocio";

const obra = (o: Partial<DadosDaObra>): DadosDaObra => ({
  obra: "A", servicos: SERVICOS_VAZIOS, vgv: 0, vgvVendido: 0, unidades: 0, vendidas: 0, m2Unidades: 0, m2Vendidas: 0, vgvComM2: 0, vgvVendidoComM2: 0,
  metragem: null, custoRealizado: null, custoOrcadoAteHoje: null, custoOrcadoTotal: null, ...o,
});

describe("Prompt AE2 — indicadores de negócio", () => {
  const a = obra({ obra: "A", vgv: 1000, vgvVendido: 400, unidades: 10, vendidas: 4, m2Unidades: 500, m2Vendidas: 200, vgvComM2: 1000, vgvVendidoComM2: 400, metragem: 800, custoRealizado: 200, custoOrcadoAteHoje: 160, custoOrcadoTotal: 600 });
  const b = obra({ obra: "B", vgv: 500, vgvVendido: 0, unidades: 5, vendidas: 0, custoRealizado: 100, custoOrcadoAteHoje: null, custoOrcadoTotal: null });

  it("cada indicador da obra, com a definição", () => {
    expect(valorDoIndicador("pct_vendido", a).valor).toBeCloseTo(40, 6);
    expect(valorDoIndicador("unidades_vendidas", a).texto).toBe("4 de 10");
    expect(valorDoIndicador("preco_m2_vendido", a).valor).toBe(2);
    expect(valorDoIndicador("custo_m2", a).valor).toBe(0.25);
    expect(valorDoIndicador("custo_orcado_m2", a).valor).toBe(0.75);
    expect(valorDoIndicador("desvio_custo", a).valor).toBeCloseTo(25, 6);
    expect(valorDoIndicador("margem_orcada", a).valor).toBeCloseTo(40, 6);
    for (const i of INDICADORES_DE_NEGOCIO) expect(i.definicao.length, i.id).toBeGreaterThan(10);
  });

  it("sem dado, o motivo em vez de zero", () => {
    expect(valorDoIndicador("custo_m2", b)).toEqual({ valor: null, motivo: "sem área construída no cadastro" });
    expect(valorDoIndicador("desvio_custo", b).motivo).toBe("sem Orçamento");
    expect(valorDoIndicador("preco_m2_vendido", b).motivo).toBe("nenhuma vendida");
    expect(valorDoIndicador("vgv_m2", b).motivo).toBe("unidades sem m²");
  });

  it("Total: soma; custo por m² só das obras com área construída", () => {
    const t = somarObras([a, b]);
    expect(t.vgv).toBe(1500);
    expect(t.custoRealizado).toBe(300);
    const p = painelDeIndicadores([a, b], true);
    expect(p.colunas).toEqual(["A", "B", "Total"]);
    // custo/m² do Total = custo de A (a única com área) ÷ área de A
    expect(p.valores.custo_m2[2].valor).toBe(0.25);
    expect(p.valores.vgv[2].valor).toBe(1500);
  });

  it("sem acesso ao custo, os de custo não aparecem nem são escolhidos", () => {
    const p = painelDeIndicadores([a], false);
    expect(p.disponiveis).not.toContain("custo_m2");
    expect(p.colunas).toEqual(["A"]);
    expect(indicadoresEscolhidos("custo_m2,vgv", false)).toEqual(["vgv"]);
    expect(indicadoresEscolhidos(undefined, true)).toEqual(["valor_contratado", "pct_medido", "a_receber", "desvio_custo"]);
    expect(indicadoresEscolhidos(undefined, false)).toEqual(["valor_contratado", "pct_medido", "a_receber"]);
    expect(indicadoresEscolhidos("margem_orcada,vgv,lixo", true)).toEqual(["vgv", "margem_orcada"]);
  });

  it("Growth Ambiental: indicadores de serviço; os de VGV e m² só aparecem com dados antigos", () => {
    const amb = obra({ obra: "P", servicos: { contratado: 1000, medido: 250, faturado: 200, recebido: 150, aReceber: 50 }, custoOrcadoTotal: 700, custoRealizado: 100, custoOrcadoAteHoje: 80 });
    expect(valorDoIndicador("valor_contratado", amb).valor).toBe(1000);
    expect(valorDoIndicador("pct_medido", amb).valor).toBeCloseTo(25, 6);
    expect(valorDoIndicador("a_receber", amb).valor).toBe(50);
    expect(valorDoIndicador("margem_contratada", amb).valor).toBeCloseTo(30, 6);
    expect(valorDoIndicador("pct_medido", obra({})).motivo).toBe("sem contrato");
    const p = painelDeIndicadores([amb], true);
    for (const id of ["vgv", "vgv_vendido", "custo_m2", "margem_orcada"]) expect(p.disponiveis, id).not.toContain(id);
    expect(p.disponiveis).toContain("margem_contratada");
    expect(painelDeIndicadores([amb, a], true).disponiveis).toContain("vgv"); // A tem unidades antigas
    expect(somarObras([amb, amb]).servicos.contratado).toBe(2000);
  });
});

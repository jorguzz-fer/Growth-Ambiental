import { describe, it, expect } from "vitest";
import {
  CATALOGO,
  competenciaValida,
  interpretarLocalmente,
  mesesDoPeriodo,
  metricasPermitidas,
  normalizarIntencao,
  resolverObra,
  textoDoPeriodo,
} from "./assistente-chat";

const hoje = new Date(2026, 9, 2);

describe("chat (Prompt E, Etapa 2) — catálogo e privacidade", () => {
  it("o catálogo é só receita, custo, desvio e saldo — nenhuma métrica de pessoa", () => {
    expect(CATALOGO.map((m) => m.id).sort()).toEqual(["custo", "desvio", "receita", "saldo"]);
    for (const m of CATALOGO) expect(m.definicao).not.toMatch(/cliente|comprador|CPF|telefone|endereço/i);
  });

  it("custo e desvio exigem ver DRE E Despesas; saldo exige Controle de Caixa", () => {
    const so = (telas: string[]) => metricasPermitidas((t) => telas.includes(t)).map((m) => m.id);
    expect(so(["dre"])).toEqual(["receita"]);
    expect(so(["dre", "despesas"])).toEqual(["receita", "custo", "desvio"]);
    expect(so(["caixa"])).toEqual(["saldo"]);
    expect(so([])).toEqual([]);
  });
});

describe("chat — intenção", () => {
  it("normaliza a saída do modelo; o que é estranho vira vazio", () => {
    expect(normalizarIntencao({ metrica: "custo", cenario: "budget", obra: " Litoral ", todas: false, de: "1/2026", ate: "12/2026" })).toEqual({
      metrica: "custo",
      cenario: "budget",
      obra: "Litoral",
      todas: false,
      de: "01/2026",
      ate: "12/2026",
    });
    expect(normalizarIntencao({ metrica: "nome_do_cliente", cenario: "x", de: "13/2026", ate: "2026-01" })).toMatchObject({ metrica: null, cenario: null, de: null, ate: null });
    expect(normalizarIntencao({ metrica: "receita", de: "12/2026", ate: "01/2026" })).toMatchObject({ de: "01/2026", ate: "12/2026" });
    expect(normalizarIntencao(null).metrica).toBeNull();
  });

  it("leitura local (sem IA) entende o básico", () => {
    expect(interpretarLocalmente("Quanto já gastamos nesta obra este ano?", hoje)).toMatchObject({ metrica: "custo", cenario: "atual", obra: null, de: "01/2026", ate: "12/2026" });
    expect(interpretarLocalmente("receita desta obra", hoje).obra).toBeNull();
    expect(interpretarLocalmente("custo do projeto Vila Nova", hoje).obra).toBe("Vila Nova");
    expect(interpretarLocalmente("Qual o desvio de custo contra o orçado?", hoje).metrica).toBe("desvio");
    expect(interpretarLocalmente("Qual a receita orçada de todas as obras?", hoje)).toMatchObject({ metrica: "receita", cenario: "budget", todas: true });
    expect(interpretarLocalmente("saldo das contas hoje", hoje).metrica).toBe("saldo");
    expect(interpretarLocalmente("custo da obra Litoral em março", hoje)).toMatchObject({ metrica: "custo", obra: "Litoral em março", de: "03/2026", ate: "03/2026" });
    expect(interpretarLocalmente("qual o telefone do cliente?", hoje).metrica).toBeNull();
  });

  it("competência válida", () => {
    expect(competenciaValida("3/2026")).toBe("03/2026");
    expect(competenciaValida("00/2026")).toBeNull();
    expect(competenciaValida(5)).toBeNull();
  });
});

describe("chat — obra citada (casamento local, só entre as que o usuário vê)", () => {
  const ps = [
    { id: "1", name: "MONITORAMENTO LITORAL" },
    { id: "2", name: "OBRA 7 TESTE" },
    { id: "3", name: "OBRA 8 TESTE" },
  ];
  it("exato, sem acento e sem caixa", () => {
    expect(resolverObra("monitoramento litoral", ps)).toMatchObject({ tipo: "uma", projeto: { id: "1" } });
  });
  it("por palavra", () => {
    expect(resolverObra("Litoral em março", ps)).toMatchObject({ tipo: "uma", projeto: { id: "1" } });
  });
  it("ambígua pede escolha; desconhecida diz que não achou", () => {
    expect(resolverObra("obra", ps)).toMatchObject({ tipo: "varias" });
    expect(resolverObra("Vila Nova", ps)).toEqual({ tipo: "nenhuma" });
  });
});

describe("chat — período", () => {
  it("sem período = acumulado", () => {
    expect(mesesDoPeriodo(null, null)).toBeNull();
    expect(textoDoPeriodo(null, null, "acumulado")).toBe("acumulado");
  });
  it("competências do intervalo", () => {
    expect([...mesesDoPeriodo("11/2025", "02/2026")!]).toEqual(["11/2025", "12/2025", "01/2026", "02/2026"]);
    expect(textoDoPeriodo("03/2026", "03/2026", "")).toBe("em 03/2026");
  });
});

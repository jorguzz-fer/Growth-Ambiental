import { describe, it, expect } from "vitest";
import { GRUPOS_DA_IMPLANTACAO, MODELO_DE_IMPLANTACAO, PERFIS_DE_TREINAMENTO, STATUS_DA_ETAPA, recusaDeDependencia, recusaDeSituacao, resumoDaImplantacao } from "./implantacao-regras";

describe("Implantação — modelo padrão", () => {
  it("tem os grupos A a H e as seis situações da especificação", () => {
    expect(Object.keys(GRUPOS_DA_IMPLANTACAO)).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(STATUS_DA_ETAPA).toEqual(["nao_iniciada", "planejada", "em_andamento", "aguardando_cliente", "bloqueada", "concluida"]);
    for (const g of Object.keys(GRUPOS_DA_IMPLANTACAO)) expect(MODELO_DE_IMPLANTACAO.some((e) => e.grupo === g)).toBe(true);
  });

  it("códigos únicos e toda dependência aponta para etapa do modelo, sem ciclo", () => {
    const codigos = MODELO_DE_IMPLANTACAO.map((e) => e.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
    const todas = MODELO_DE_IMPLANTACAO.map((e) => ({ codigo: e.codigo, status: "nao_iniciada", dependeDe: e.dependeDe ?? null }));
    for (const e of todas) expect(recusaDeDependencia(e.codigo, e.dependeDe, todas)).toBeNull();
  });

  it("não impõe prazos: o modelo não traz datas", () => {
    expect(MODELO_DE_IMPLANTACAO.every((e) => !("previsto" in e))).toBe(true);
  });

  it("treinamento por perfil com os temas da especificação", () => {
    expect(PERFIS_DE_TREINAMENTO.financeiro.temas).toEqual(["Despesas", "Pagamentos", "Recebimentos", "Reembolsos", "Conciliação"]);
    expect(PERFIS_DE_TREINAMENTO.gestores.temas).toContain("Orçamento e Forecast");
    expect(PERFIS_DE_TREINAMENTO.diretoria.temas).toContain("Cris");
    expect(PERFIS_DE_TREINAMENTO.administradores.temas).toContain("Auditoria");
  });
});

describe("Implantação — regras de situação e dependência", () => {
  const todas = [
    { codigo: "A1", status: "concluida", dependeDe: null },
    { codigo: "A2", status: "em_andamento", dependeDe: "A1" },
    { codigo: "A3", status: "nao_iniciada", dependeDe: "A2" },
  ];
  it("concluir exige evidência", () => {
    expect(recusaDeSituacao({ ...todas[1], para: "concluida", evidencia: "" }, todas)).toMatch(/evidência/);
    expect(recusaDeSituacao({ ...todas[1], para: "concluida", evidencia: "Ata de 10/03" }, todas)).toBeNull();
  });
  it("não inicia nem conclui com a dependência aberta; planejar pode", () => {
    expect(recusaDeSituacao({ ...todas[2], para: "em_andamento" }, todas)).toMatch(/A2 precisa estar concluída/);
    expect(recusaDeSituacao({ ...todas[2], para: "concluida", evidencia: "x" }, todas)).toMatch(/A2/);
    expect(recusaDeSituacao({ ...todas[2], para: "planejada" }, todas)).toBeNull();
  });
  it("bloqueada e aguardando cliente pedem o motivo", () => {
    expect(recusaDeSituacao({ ...todas[2], para: "bloqueada" }, todas)).toMatch(/motivo/);
    expect(recusaDeSituacao({ ...todas[2], para: "aguardando_cliente", observacoes: "Cliente enviar extratos" }, todas)).toBeNull();
    expect(recusaDeSituacao({ ...todas[2], para: "xyz" }, todas)).toMatch(/inválida/);
  });
  it("dependência: inexistente, ela mesma e ciclo são recusados", () => {
    expect(recusaDeDependencia("A3", "Z9", todas)).toMatch(/não existe/);
    expect(recusaDeDependencia("A3", "A3", todas)).toMatch(/si mesma/);
    expect(recusaDeDependencia("A1", "A3", todas)).toMatch(/ciclo/);
    expect(recusaDeDependencia("A3", null, todas)).toBeNull();
  });
  it("resumo: percentual, atrasadas e esperando dependência", () => {
    const r = resumoDaImplantacao(
      [
        { ...todas[0], previsto: "01/10/2026" },
        { ...todas[1], previsto: "01/20/2026" },
        { ...todas[2], previsto: "12/31/2030" },
      ],
      "02/01/2026",
    );
    expect(r).toMatchObject({ total: 3, concluidas: 1, percentual: 33, atrasadas: 1, esperandoDependencia: 1 });
    expect(r.porStatus.em_andamento).toBe(1);
  });
});

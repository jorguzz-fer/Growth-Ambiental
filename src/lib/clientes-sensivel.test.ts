import { describe, it, expect } from "vitest";
import {
  CAMPOS_SENSIVEIS_CLIENTE,
  changesSemValorSensivel,
  mascararDocumento,
} from "./clientes-sensivel";
import { can, defaultPermissions, effectivePermissions } from "./permissions";
import { ehAlteracaoProtegida } from "./audit-mask";

describe("permissão de dados do cliente (BM-3)", () => {
  it("por padrão só owner e admin", () => {
    expect(can(defaultPermissions("owner"), "clientesdados", "ver")).toBe(true);
    expect(can(defaultPermissions("admin"), "clientesdados", "editar")).toBe(true);
    for (const r of ["membro", "contador", "engenheiro"] as const) {
      expect(can(defaultPermissions(r), "clientesdados", "ver"), r).toBe(false);
      expect(can(defaultPermissions(r, { membroRestrito: true }), "clientesdados", "ver"), r).toBe(false);
    }
  });
  it("pode ser dada a alguém por override (não é tela só-admin)", () => {
    const ef = effectivePermissions("membro", {
      clientesdados: { ver: true, criar: false, editar: false, excluir: false },
    });
    expect(can(ef, "clientesdados", "ver")).toBe(true);
  });
  it("override antigo de 38 chaves não ganha a tela nova", () => {
    const ef = effectivePermissions("membro", { clientes: { ver: true, criar: true, editar: true, excluir: false } });
    expect(can(ef, "clientesdados", "ver")).toBe(false);
  });
});

describe("mascararDocumento (5.1)", () => {
  it("CPF mostra só os dígitos centrais", () => {
    expect(mascararDocumento("000.000.002-72")).toBe("•••.000.002-••");
    expect(mascararDocumento("00000000272")).toBe("•••.000.002-••");
  });
  it("CNPJ mostra só a raiz central", () => {
    expect(mascararDocumento("12.345.678/0001-90")).toBe("••.345.678/••••-••");
  });
  it("fora do padrão não vaza e não quebra", () => {
    expect(mascararDocumento("ABC-12345")).toBe("•••••2345");
    expect(mascararDocumento(null)).toBeNull();
    expect(mascararDocumento("12")).toBe("••••");
  });
});

describe("log de cliente sem valor sensível (7, nota)", () => {
  it("renda, score e CPF viram 'alterado'; o resto fica", () => {
    const m = changesSemValorSensivel({
      rendaBruta: { de: "SENS-1", para: "SENS-2" },
      cpfCnpj: { de: "SENS-3", para: "SENS-4" },
      interesse: { de: 1, para: 5 },
      celular: { de: "a", para: "b" },
    });
    expect(JSON.stringify(m)).not.toContain("SENS-");
    expect(ehAlteracaoProtegida(m.rendaBruta)).toBe(true);
    expect(ehAlteracaoProtegida(m.interesse)).toBe(true);
    expect(m.celular).toEqual({ de: "a", para: "b" });
  });
  it("a lista tem os blocos do BM-3", () => {
    for (const k of ["rendaBruta", "scoreCredito", "restricoes", "estadoCivil", "obsEstrategicas", "indicadoPor"]) {
      expect(CAMPOS_SENSIVEIS_CLIENTE as readonly string[]).toContain(k);
    }
  });
});

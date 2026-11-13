import { describe, it, expect } from "vitest";
import type { Role } from "@/lib/context";
import {
  CONTADOR_VE,
  HERDA_DE,
  SCREENS,
  TELAS_SO_ADMIN,
  defaultPermissions,
  effectivePermissions,
  overridesDivergentes,
  recusaDoTetoDeLeitura,
  temTetoDeLeitura,
  type PermAction,
  type PermMatrix, TELAS_SO_PLATAFORMA } from "./permissions";

const ACOES: PermAction[] = ["ver", "criar", "editar", "excluir"];
const FULL = { ver: true, criar: true, editar: true, excluir: true };

/**
 * ORÁCULO — `effectivePermissions` exatamente como estava antes do Prompt AL
 * (merge dos overrides e clamp do AJ, sem o teto do contador). É a régua da
 * condição 8.1: nenhuma célula pode ir de negada para permitida.
 */
function antesDoAL(role: Role, overrides: PermMatrix | null, membroRestrito = false): PermMatrix {
  const base = defaultPermissions(role, { membroRestrito });
  if (overrides) for (const s of SCREENS) if (overrides[s.id] && !HERDA_DE[s.id]) base[s.id] = { ...base[s.id], ...overrides[s.id] };
  // Prompt AN (posterior ao AL): `conferencia` acompanha Despesas.
  for (const [filha, mae] of Object.entries(HERDA_DE)) base[filha] = { ...base[mae] };
  const total = role === "owner" || role === "admin";
  for (const s of SCREENS) {
    if (total) base[s.id] = { ...FULL };
    else if (TELAS_SO_ADMIN.has(s.id)) base[s.id] = { ver: false, criar: false, editar: false, excluir: false };
  }
  return base;
}

/** Gerador determinístico de overrides (para varrer muitas combinações). */
function overridesAleatorios(seed: number): PermMatrix {
  let x = seed * 2654435761;
  const rnd = () => ((x = (x * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const out: PermMatrix = {};
  for (const s of SCREENS) {
    if (rnd() < 0.4) continue;
    const ver = rnd() < 0.6;
    out[s.id] = { ver, criar: ver && rnd() < 0.5, editar: ver && rnd() < 0.5, excluir: ver && rnd() < 0.5 };
  }
  return out;
}

describe("Prompt AL · Partes 2 a 4 — contador configurável com teto de leitura", () => {
  it("2.3 — o padrão do contador: as mesmas telas, só Ver (o Consolidado saiu no Prompt AB2; Notas Fiscais entrou no Prompt AG, 6.4; a Medição de obra saiu no Growth Ambiental)", () => {
    expect([...CONTADOR_VE].sort()).toEqual(["acoes", "despesas", "dre", "fluxocaixa", "notasfiscais", "planocontas", "resumo"]);
    const p = defaultPermissions("contador");
    for (const s of SCREENS) {
      expect(p[s.id], s.id).toEqual({ ver: CONTADOR_VE.has(HERDA_DE[s.id] ?? s.id), criar: false, editar: false, excluir: false });
    }
  });

  it("8 — conceder Ver numa tela fora do padrão funciona", () => {
    const e = effectivePermissions("contador", { caixa: { ver: true, criar: false, editar: false, excluir: false } });
    expect(e.caixa.ver).toBe(true);
  });

  it("9 — revogar Ver numa tela do padrão funciona", () => {
    const e = effectivePermissions("contador", { dre: { ver: false, criar: false, editar: false, excluir: false } });
    expect(e.dre.ver).toBe(false);
  });

  it("10 — trocar alguém para contador sem override aplica o padrão do papel, não matriz vazia", () => {
    const e = effectivePermissions("contador", null);
    expect(SCREENS.filter((s) => e[s.id].ver && !HERDA_DE[s.id]).map((s) => s.id).sort()).toEqual([...CONTADOR_VE].sort());
  });

  it("11/13 — o teto roda DEPOIS do merge: override com escrita vira só Ver", () => {
    const e = effectivePermissions("contador", { despesas: { ...FULL }, caixa: { ...FULL } });
    expect(e.despesas).toEqual({ ver: true, criar: false, editar: false, excluir: false });
    expect(e.caixa).toEqual({ ver: true, criar: false, editar: false, excluir: false });
    // e Usuários/Acessos seguem negadas (clamp do AJ intacto)
    const u = effectivePermissions("contador", { usuarios: { ...FULL }, acessos: { ...FULL } });
    expect(u.usuarios.ver).toBe(false);
    expect(u.acessos.ver).toBe(false);
  });

  it("3.2 — só o contador tem teto; a gravação recusa escrita com o motivo", () => {
    expect(temTetoDeLeitura("contador")).toBe(true);
    for (const r of ["owner", "admin", "membro", "engenheiro"]) expect(temTetoDeLeitura(r)).toBe(false);
    expect(recusaDoTetoDeLeitura("contador", { dre: { ver: true, criar: false, editar: true, excluir: false } })).toMatch(/somente leitura.*"DRE".*Ver/);
    expect(recusaDoTetoDeLeitura("contador", { dre: { ver: true, criar: false, editar: false, excluir: false } })).toBeNull();
    expect(recusaDoTetoDeLeitura("membro", { dre: { ...FULL } })).toBeNull();
  });

  it("2.2 — salvar a linha do contador grava só o que diverge do padrão dele", () => {
    const matriz = defaultPermissions("contador");
    matriz.caixa = { ver: true, criar: false, editar: false, excluir: false };
    matriz.acoes = { ver: false, criar: false, editar: false, excluir: false };
    expect(Object.keys(overridesDivergentes("contador", matriz)).sort()).toEqual(["acoes", "caixa"]);
  });

  it("8.1/15 — antes × depois, célula a célula, 400 combinações por papel: nenhuma célula ampliada", () => {
    for (const role of ["owner", "admin", "membro", "contador", "engenheiro"] as const) {
      for (const restrito of [false, true]) {
        for (let seed = 1; seed <= 400; seed++) {
          const o = seed === 1 ? null : overridesAleatorios(seed);
          const antes = antesDoAL(role, o, restrito);
          const depois = effectivePermissions(role, o, { membroRestrito: restrito });
          for (const s of SCREENS) {
            // Prompt PLAT: negadas a todo papel de propósito (permissions-plat.test.ts).
            if (TELAS_SO_PLATAFORMA.has(s.id)) continue;
            for (const a of ACOES) {
              if (depois[s.id][a]) expect(antes[s.id][a], `${role} ${s.id}.${a} seed ${seed}`).toBe(true);
              if (role !== "contador") expect(depois[s.id][a], `${role} ${s.id}.${a}`).toBe(antes[s.id][a]);
              // 4.4 — para o contador, a única diferença aceitável é negar escrita
              else if (a === "ver") expect(depois[s.id].ver, `contador ${s.id}.ver`).toBe(antes[s.id].ver);
            }
          }
        }
      }
    }
  });

  it("14 — o contador sem override continua vendo exatamente as oito telas", () => {
    const e = effectivePermissions("contador", null);
    expect(e).toEqual(antesDoAL("contador", null));
  });
});

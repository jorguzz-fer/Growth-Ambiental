import { describe, it, expect } from "vitest";
import {
  HERDA_DE,
  MEMBRO_TELAS,
  SCREENS,
  TELAS_SO_ADMIN,
  can,
  defaultPermissions,
  effectivePermissions,
  overridesDivergentes,
  validarMatriz,
  type PermAction,
  type PermMatrix,
  type ScreenPerm,
  TELAS_SENSIVEIS, TELAS_SO_PLATAFORMA } from "./permissions";
import type { Role } from "./context";

const ROLES: Role[] = ["owner", "admin", "membro", "contador", "engenheiro"];
const ACOES: PermAction[] = ["ver", "criar", "editar", "excluir"];
const NONE: ScreenPerm = { ver: false, criar: false, editar: false, excluir: false };
const VIEW: ScreenPerm = { ver: true, criar: false, editar: false, excluir: false };
const EDIT: ScreenPerm = { ver: true, criar: true, editar: true, excluir: false };
const FULL: ScreenPerm = { ver: true, criar: true, editar: true, excluir: true };

/**
 * ORÁCULO — a lógica de permissões exatamente como estava antes do Prompt AJ
 * (permissions.ts no commit anterior). Serve de régua para a condição de
 * aceite 11.1: nenhuma célula pode ir de negada para permitida.
 */
const CONTADOR_VE = new Set(["dre", "fluxocaixa", "medicao", "resumo", "consolidado", "planocontas", "despesas", "acoes"]);
function antigoDefault(role: Role): PermMatrix {
  const out: PermMatrix = {};
  for (const s of SCREENS) {
    if (role === "owner" || role === "admin") out[s.id] = { ...FULL };
    // Tela que não existia antes (Prompt M, 5.4): para quem não é admin, "antes"
    // é sem acesso.
    // Telas de permissão de CAMPO (BM-3): nascem negadas para quem não é owner/admin
    // — clientesdados (Prompt M) e, desde o Prompt Z, funcionariosdados e funcionariosaso.
    else if (TELAS_SENSIVEIS.has(s.id)) out[s.id] = { ...NONE };
    else if (role === "membro") out[s.id] = s.modulo === "Config" ? { ...NONE } : { ...EDIT };
    // Growth Ambiental: a medição por grupo de obra (medicaolanc) saiu; o
    // engenheiro / técnico de campo lança a medição do SERVIÇO no contrato.
    // Ampliação declarada, não acidental: ver contratos (sem o financeiro) e
    // lançar medição de contrato (sem aprovar).
    else if (role === "engenheiro") out[s.id] = s.id === "contratosmedicao" ? { ...EDIT } : s.id === "contratos" ? { ...VIEW } : { ...NONE };
    // Prompt AG, 6.4: "Notas Fiscais" é tela NOVA, que o prompt manda o
    // contador ver (e não emitir). Ampliação declarada, não acidental.
    else out[s.id] = CONTADOR_VE.has(s.id) || s.id === "notasfiscais" ? { ...VIEW } : { ...NONE };
  }
  return out;
}
function antigoEfetivo(role: Role, o?: PermMatrix | null): PermMatrix {
  const base = antigoDefault(role);
  if (o) for (const s of SCREENS) if (o[s.id]) base[s.id] = { ...base[s.id], ...o[s.id] };
  // Prompt AN, 5.4: antes do id `conferencia`, a tela era alcançada pela
  // permissão de Despesas — "antes" para ela é a célula de Despesas.
  for (const [filha, mae] of Object.entries(HERDA_DE)) base[filha] = { ...base[mae] };
  return base;
}

/** Overrides com o FORMATO dos encontrados em produção (valores sintéticos). */
const ro = (): PermMatrix =>
  Object.fromEntries(
    SCREENS.filter((s) => !["backup", "contasreceber", "diagnosticoia", "ponto"].includes(s.id)).map((s) => [
      s.id,
      s.modulo === "Config" ? { ...NONE } : { ...VIEW },
    ]),
  );
const OVERRIDES: Record<string, PermMatrix | null> = {
  semOverride: null,
  soLeituraSemTelasNovas: { ...ro(), rolling: { ...VIEW } } as PermMatrix, // Felipe/Roberto
  quaseAdmin: Object.fromEntries(SCREENS.map((s) => [s.id, { ...EDIT }])), // Islane
  restritivo: { dre: { ...NONE }, despesas: { ...NONE } },
  concedeUsuarios: { usuarios: { ...FULL }, acessos: { ...FULL } },
};

describe("11.1 — nenhuma célula vai de negada para permitida", () => {
  for (const role of ROLES) {
    for (const [nome, o] of Object.entries(OVERRIDES)) {
      for (const membroRestrito of [false, true]) {
        it(`${role} · ${nome} · chave ${membroRestrito ? "ligada" : "desligada"}`, () => {
          const antes = antigoEfetivo(role, o);
          const depois = effectivePermissions(role, o, { membroRestrito });
          const ampliadas: string[] = [];
          for (const s of SCREENS)
            for (const a of ACOES)
              if (!antes[s.id][a] && depois[s.id][a]) ampliadas.push(`${s.id}.${a}`);
          // Única exceção declarada (AJ 3.3): owner/admin com override
          // restritivo voltam ao acesso total que a matriz sempre prometeu.
          // Em produção nenhum owner/admin tem override (diagnóstico 29/09).
          if (role === "owner" || role === "admin") {
            for (const c of ampliadas) expect(o, c).not.toBeNull();
          } else {
            expect(ampliadas).toEqual([]);
          }
        });
      }
    }
  }
});

describe("11.2 — chave desligada: tudo igual a antes, fora o clamp", () => {
  for (const role of ["membro", "contador", "engenheiro"] as Role[]) {
    for (const [nome, o] of Object.entries(OVERRIDES)) {
      it(`${role} · ${nome}`, () => {
        const antes = antigoEfetivo(role, o);
        const depois = effectivePermissions(role, o, { membroRestrito: false });
        for (const s of SCREENS) {
          if (TELAS_SO_PLATAFORMA.has(s.id) || TELAS_SO_ADMIN.has(s.id)) expect(depois[s.id]).toEqual(NONE);
          // Prompt AL, Parte 3: o contador tem teto de leitura — a única
          // diferença aceitável é a escrita negada; "ver" segue igual.
          else if (role === "contador") expect(depois[s.id], s.id).toEqual({ ...NONE, ver: antes[s.id].ver });
          else expect(depois[s.id], s.id).toEqual(antes[s.id]);
        }
      });
    }
  }
});

describe("Parte 1 — padrão novo do membro", () => {
  const perms = defaultPermissions("membro", { membroRestrito: true });

  it("não alcança os resultados da empresa", () => {
    for (const id of ["dre", "fluxocaixa", "resumo", "dashboard", "consolidado", "projecao"]) {
      expect(can(perms, id, "ver"), id).toBe(false);
    }
  });

  it("alcança exatamente as telas decididas (7 depois que Medição de obra, Unidades e Permuta saíram), com ver/criar/editar e sem excluir", () => {
    for (const s of SCREENS) {
      // `conferencia` acompanha Despesas (Prompt AN, 5.4).
      const tela = HERDA_DE[s.id] ?? s.id;
      expect(perms[s.id], s.id).toEqual(MEMBRO_TELAS.has(tela) ? EDIT : NONE);
    }
    expect([...MEMBRO_TELAS].sort()).toEqual(["caixa", "clientes", "contas", "contaspagar", "contasreceber", "despesas", "fornecedores"]);
  });

  it("tela nova nasce negada (critério positivo)", () => {
    const fora = SCREENS.filter((s) => !MEMBRO_TELAS.has(s.id) && !HERDA_DE[s.id] && s.modulo !== "Config");
    expect(fora.length).toBeGreaterThan(0);
    for (const s of fora) expect(perms[s.id]).toEqual(NONE);
  });

  it("owner, admin, contador e engenheiro não mudam com a chave", () => {
    for (const role of ["owner", "admin", "contador", "engenheiro"] as Role[]) {
      expect(defaultPermissions(role, { membroRestrito: true })).toEqual(defaultPermissions(role));
    }
  });
});

describe("Parte 2 — salvar só o que diverge", () => {
  it("chave desligada: salvar sem mexer não grava nada", () => {
    const m = effectivePermissions("membro", null, { membroRestrito: false });
    expect(overridesDivergentes("membro", m, { membroRestrito: false })).toEqual({});
    expect(overridesDivergentes("contador", defaultPermissions("contador"))).toEqual({});
    expect(overridesDivergentes("engenheiro", defaultPermissions("engenheiro"))).toEqual({});
  });

  it("chave desligada: salvar não congela o padrão antigo — ligar a chave ainda alcança a pessoa", () => {
    const visto = effectivePermissions("membro", null, { membroRestrito: false });
    visto.estoque = { ...NONE }; // uma mudança qualquer
    const gravado = overridesDivergentes("membro", visto, { membroRestrito: false });
    expect(Object.keys(gravado)).toEqual(["estoque"]);
    const depois = effectivePermissions("membro", gravado, { membroRestrito: true });
    expect(depois.dashboard).toEqual(NONE); // Parte 1 alcança
  });

  it("alterar uma tela grava uma chave, não todas", () => {
    const m = defaultPermissions("contador");
    m.clientes = { ...VIEW };
    expect(Object.keys(overridesDivergentes("contador", m))).toEqual(["clientes"]);
  });

  it("negação que o admin viu vale com a chave em qualquer estado (nunca amplia)", () => {
    for (const salvoCom of [false, true]) {
      const visto = effectivePermissions("membro", null, { membroRestrito: salvoCom });
      visto.dre = { ...NONE };
      const gravado = overridesDivergentes("membro", visto, { membroRestrito: salvoCom });
      for (const vale of [false, true]) {
        const ef = effectivePermissions("membro", gravado, { membroRestrito: vale });
        expect(ef.dre, `salvo ${salvoCom} / vale ${vale}`).toEqual(NONE);
      }
    }
  });

  it("nenhum salvamento amplia, em qualquer combinação de chave", () => {
    for (const salvoCom of [false, true]) {
      for (const [nome, o] of Object.entries(OVERRIDES)) {
        const visto = effectivePermissions("membro", o, { membroRestrito: salvoCom });
        const gravado = overridesDivergentes("membro", visto, { membroRestrito: salvoCom });
        for (const vale of [false, true]) {
          const ef = effectivePermissions("membro", gravado, { membroRestrito: vale });
          // Com a mesma chave, o que vale é exatamente o que foi visto.
          if (vale === salvoCom) expect(ef, nome).toEqual(visto);
          // Chave invertida: só pode negar mais, nunca conceder além do visto.
          if (salvoCom !== vale) {
            for (const s of SCREENS)
              for (const a of ACOES) if (ef[s.id][a]) expect(visto[s.id][a], `${nome} ${s.id}.${a}`).toBe(true);
          }
        }
      }
    }
  });

  it("depois de salvar, trocar o papel volta a governar o resto", () => {
    const m = defaultPermissions("contador");
    m.unidades = { ...VIEW };
    const gravado = overridesDivergentes("contador", m);
    const comoMembro = effectivePermissions("membro", gravado, { membroRestrito: true });
    expect(comoMembro.despesas).toEqual(EDIT); // veio do papel, não do override
  });
});

describe("Parte 3 — clamp de papel", () => {
  it("membro com override de Usuários/Acessos não os alcança", () => {
    const ef = effectivePermissions("membro", OVERRIDES.concedeUsuarios);
    expect(can(ef, "usuarios", "ver")).toBe(false);
    expect(can(ef, "acessos", "ver")).toBe(false);
  });

  it("owner e admin com override restritivo continuam com acesso total", () => {
    for (const role of ["owner", "admin"] as Role[]) {
      const ef = effectivePermissions(role, OVERRIDES.restritivo);
      for (const s of SCREENS) expect(ef[s.id], `${role}.${s.id}`).toEqual(TELAS_SO_PLATAFORMA.has(s.id) ? NONE : FULL);
    }
  });
});

describe("Parte 4 — validação do payload", () => {
  it("aceita matriz válida", () => {
    expect(validarMatriz({ dre: { ...VIEW } })).toBeNull();
  });
  it("recusa tela fora de SCREENS", () => {
    expect(validarMatriz({ inventada: { ...VIEW } })).toMatch(/desconhecida/);
  });
  it("recusa valor não booleano", () => {
    expect(validarMatriz({ dre: { ver: "sim", criar: false, editar: false, excluir: false } })).toMatch(/booleano/);
  });
  it("recusa ação sem ver", () => {
    expect(validarMatriz({ despesas: { ver: false, criar: false, editar: false, excluir: true } })).toMatch(/exigem "ver"/);
  });
  it("recusa conceder Usuários/Acessos por override", () => {
    expect(validarMatriz({ usuarios: { ...VIEW } })).toMatch(/exclusiva/);
    expect(validarMatriz({ acessos: { ...NONE } })).toBeNull();
  });
});

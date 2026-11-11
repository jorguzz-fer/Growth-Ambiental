import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Prompt AQ §2 (Revisão 4) — a permissão da Cris vem do ITEM DO MENU da rota,
 * com as exigências dele, e falha fechada. Antes, /acerto (sem id de tela)
 * descartava o formulário e liberava os números sem conferir permissão.
 * Sem banco: o modelo e as métricas são simulados.
 */
const ctxRef: { current: unknown } = { current: null };
const chamadas: { tela: { formulario: unknown } | null; dadosPermitidos: boolean; anexo?: unknown }[] = [];
const simulado: { proposta: unknown } = { proposta: null };
vi.mock("server-only", () => ({}));
vi.mock("@/lib/context", () => ({ getTenantContext: async () => ctxRef.current }));
vi.mock("@/lib/ai/client", () => ({ isAiConfigured: () => true }));
vi.mock("@/lib/ai/uso", () => ({ comUsoDeIa: (_m: unknown, fn: () => unknown) => fn(), limiteDeConversa: async () => null }));
vi.mock("@/lib/chat-metricas", () => ({ responderMetrica: async () => ({ texto: "", detalhes: [] }) }));
vi.mock("@/lib/ai/cris", () => ({
  responderComoCris: async (e: { tela: { formulario: unknown } | null; dadosPermitidos: boolean; anexo: unknown }) => {
    chamadas.push({ tela: e.tela, dadosPermitidos: e.dadosPermitidos, anexo: e.anexo });
    return { texto: "ok", proposta: simulado.proposta };
  },
}));

const { ROTAS_CONHECIDAS } = await import("@/lib/cris");
const { permissaoDaRota } = await import("@/lib/nav-menu");
const { SCREEN_IDS, can, defaultPermissions, screenIdOfPath } = await import("@/lib/permissions");
const { perguntarACris } = await import("./cris");
type PermMatrix = ReturnType<typeof defaultPermissions>;

const PAPEIS: [string, PermMatrix][] = [
  ["owner", defaultPermissions("owner")],
  ["membro", defaultPermissions("membro")],
  ["membro (chave ligada)", defaultPermissions("membro", { membroRestrito: true })],
  ["contador", defaultPermissions("contador")],
  ["engenheiro", defaultPermissions("engenheiro")],
];

describe("permissaoDaRota (AQ §2)", () => {
  it("AQ-T1: toda rota do menu resolve para uma tela que existe; nenhuma cai em padrão permissivo", () => {
    for (const rota of ROTAS_CONHECIDAS) {
      const r = permissaoDaRota(rota, defaultPermissions("owner"));
      expect(r.tela, rota).not.toBeNull();
      expect(SCREEN_IDS, rota).toContain(r.tela);
    }
    // fora do menu: nada
    for (const p of PAPEIS) expect(permissaoDaRota("/rota-nova-sem-item", p[1])).toEqual({ tela: null, ver: false, lancar: false });
    expect(permissaoDaRota(null, defaultPermissions("owner"))).toEqual({ tela: null, ver: false, lancar: false });
  });

  it("só o Acerto muda em relação à regra antiga (primeiro segmento da URL), em todos os papéis", () => {
    const antiga = (rota: string, p: PermMatrix) => {
      const id = screenIdOfPath(rota);
      return { ver: id ? can(p, id, "ver") : true, lancar: !!id && (can(p, id, "criar") || can(p, id, "editar")) };
    };
    const mudou: string[] = [];
    for (const rota of ROTAS_CONHECIDAS) {
      for (const [nome, p] of PAPEIS) {
        const { ver, lancar } = permissaoDaRota(rota, p);
        const a = antiga(rota, p);
        if (a.ver !== ver || a.lancar !== lancar) mudou.push(`${rota} ${nome}`);
      }
    }
    expect(mudou.every((m) => m.startsWith("/acerto "))).toBe(true);
  });

  it("query e barra no fim não mudam a resposta; subrota herda o item (DRE Analítica = DRE)", () => {
    const p = defaultPermissions("contador");
    expect(permissaoDaRota("/despesas/?projeto=x", p)).toEqual(permissaoDaRota("/despesas", p));
    expect(permissaoDaRota("/dre/analitica", p)).toMatchObject({ tela: "dre", ver: true, lancar: false });
  });

  it("AQ-T3: Medição mantém o comportamento (permAlt: /medicaolanc usa a permissão de lançamento)", () => {
    const eng = defaultPermissions("engenheiro");
    expect(permissaoDaRota("/medicaolanc", eng)).toEqual({ tela: "medicaolanc", ver: true, lancar: true });
    expect(permissaoDaRota("/medicao", eng)).toEqual({ tela: "medicao", ver: false, lancar: false });
    const contador = defaultPermissions("contador");
    expect(permissaoDaRota("/medicao", contador)).toEqual({ tela: "medicao", ver: true, lancar: false });
  });
});

describe("perguntarACris usa a permissão do menu (AQ-T2)", () => {
  const formulario = { id: "acerto", titulo: "Acerto contábil", campos: [{ nome: "valor", rotulo: "Valor", tipo: "numero" }] };
  const pergunta = (rota: string) => perguntarACris({ conversa: [{ de: "usuario", texto: "preencha" }], tela: { rota, titulo: "Tela", dados: { total: 10 }, formulario } });
  const com = (perms: PermMatrix) => {
    ctxRef.current = { tenant: { id: "t" }, projects: [], userId: "u", userEmail: "x@x", role: "membro", perms };
  };
  beforeEach(() => {
    chamadas.length = 0;
  });

  it("/acerto com despesas/editar + caixa/ver: o formulário e os números vão ao modelo", async () => {
    com(defaultPermissions("owner"));
    expect(await pergunta("/acerto")).toMatchObject({ ok: true });
    expect(chamadas[0].dadosPermitidos).toBe(true);
    expect(chamadas[0].tela?.formulario).toMatchObject({ id: "acerto" });
  });

  it("/acerto sem caixa/ver: nem o formulário nem os números vão", async () => {
    const p = defaultPermissions("owner");
    p.caixa = { ver: false, criar: false, editar: false, excluir: false };
    com(p);
    expect(await pergunta("/acerto")).toMatchObject({ ok: true });
    expect(chamadas[0].dadosPermitidos).toBe(false);
    expect(chamadas[0].tela?.formulario).toBeNull();
  });

  it("/acerto para quem só lê (contador): nada, como o menu (antes, os números iam)", async () => {
    com(defaultPermissions("contador"));
    await pergunta("/acerto");
    expect(chamadas[0]).toMatchObject({ dadosPermitidos: false, tela: { formulario: null } });
  });

  it("tela comum: contador vê os números da DRE, sem formulário", async () => {
    com(defaultPermissions("contador"));
    await pergunta("/dre");
    expect(chamadas[0]).toMatchObject({ dadosPermitidos: true, tela: { formulario: null } });
  });
});

describe("AQ-T10 (C22): print colado na tela de Fornecedores", () => {
  it("o print vira anexo, chega ao modelo com o formulário do fornecedor e a proposta volta para a tela, sem gravar", async () => {
    const { classificarColagem } = await import("@/lib/cris-colagem");
    const { formularioDoFornecedor, lidosDaProposta } = await import("@/lib/fornecedor-cris");
    // 1) colar o print: é anexo (mesma regra do 📎)
    expect(classificarColagem([{ kind: "file", type: "image/png", size: 120_000 }])).toEqual({ tipo: "anexo", indice: 0 });
    // 2) a Cris recebe o anexo e o formulário; o modelo (simulado) propõe os campos
    const papeis = ["Fornecedor", "Prestador de Serviço"];
    ctxRef.current = { tenant: { id: "t" }, projects: [], userId: "u", userEmail: "x@x", role: "owner", perms: defaultPermissions("owner") };
    const proposta = { formulario: "fornecedor-novo", valores: { tipo: "PJ", nome: "Cimentos Exemplo Ltda", doc: "11.222.333/0001-81", endereco: "Rua das Obras", tel: "(11) 4000-0000", papeis: "Fornecedor" }, conferir: {}, observacao: null };
    chamadas.length = 0;
    simulado.proposta = proposta;
    try {
      const r = await perguntarACris({
        conversa: [{ de: "usuario", texto: "Preencha a tela com este documento." }],
        tela: { rota: "/fornecedores", titulo: "Fornecedores", formulario: formularioDoFornecedor(papeis) },
        anexo: { tipo: "image/png", base64: "iVBORw0KGgo=", nome: "image.png" },
      });
      expect(chamadas[0].anexo).toMatchObject({ tipo: "image/png", nome: "image.png" });
      expect(chamadas[0].tela?.formulario).toMatchObject({ id: "fornecedor-novo" });
      // 3) a proposta volta para a tela (quem grava é o Salvar do formulário; a Cris não grava: AQ-T6)
      expect(r).toMatchObject({ ok: true, proposta });
      expect(lidosDaProposta(proposta.valores, papeis)).toMatchObject({ tipo: "PJ", nome: "Cimentos Exemplo Ltda", doc: "11.222.333/0001-81", papeis: ["Fornecedor"] });
    } finally {
      simulado.proposta = null;
    }
  });
});

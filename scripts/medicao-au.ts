/**
 * MEDIÇÃO do Prompt AU, Fase 1 (Revisão 4) — custo real da IA. SOMENTE LEITURA.
 *
 * Lê `ia_uso` (empresa, pessoa, operação, modelo, tokens; nunca conteúdo) e
 * calcula o custo pela tabela de preços de `src/lib/ai/precos.ts`.
 *
 * SOMENTE LEITURA DE VERDADE: a conexão abre com
 * `default_transaction_read_only = on`; o script confere e para se não estiver.
 *
 * Saída: Markdown no stdout. Pessoas aparecem como "pessoa 1, 2…" por empresa:
 * nenhum nome ou e-mail.
 *
 *   DATABASE_URL=postgres://... CAMBIO_USD_BRL=5.40 npx tsx scripts/medicao-au.ts > medicao-au-producao.md
 *
 * CAMBIO_USD_BRL é o câmbio declarado do relatório (R$ por US$). Sem ele, o
 * custo sai só em US$.
 */
import postgres from "postgres";
import { custoDaChamadaUsd, DATA_DA_TABELA_DE_PRECOS, FONTE_DA_TABELA_DE_PRECOS, modeloBase } from "../src/lib/ai/precos";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definido.");
  process.exit(1);
}
const cambio = Number(process.env.CAMBIO_USD_BRL) || null;
const sql = postgres(url, { prepare: false, max: 2, connection: { default_transaction_read_only: "on" } as Record<string, string> });

const usd = (v: number) => `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const brl = (v: number) => (cambio ? `R$ ${(v * cambio).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—");
const int = (v: number) => v.toLocaleString("pt-BR");

function percentil(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1);
  return s[Math.max(0, i)];
}

async function main() {
  const [{ default_transaction_read_only: modo }] = await sql`show default_transaction_read_only`;
  if (modo !== "on") throw new Error("A conexão não está em modo somente leitura; nada foi lido.");

  const linhas = await sql<{ empresa: string; tenant_id: string; user_id: string | null; operacao: string; modelo: string | null; erro: boolean; entrada: number; saida: number; cache_criacao: number; cache_lida: number; quando: Date }[]>`
    select t.name as empresa, u.tenant_id, u.user_id, u.operacao, u.modelo, u.erro, u.entrada, u.saida, u.cache_criacao, u.cache_lida, u.created_at as quando
    from ia_uso u join tenant t on t.id = u.tenant_id
    order by t.name, u.created_at`;

  const mes = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const dia = (d: Date) => d.toISOString().slice(0, 10);

  type Agg = { chamadas: number; erros: number; entrada: number; saida: number; cacheCriacao: number; cacheLida: number; custo: number; semPreco: number };
  const vazio = (): Agg => ({ chamadas: 0, erros: 0, entrada: 0, saida: 0, cacheCriacao: 0, cacheLida: 0, custo: 0, semPreco: 0 });
  const porGrupo = new Map<string, Agg>();
  const porEmpresaMes = new Map<string, Agg>();
  const pessoas = new Map<string, { empresa: string; porDia: Map<string, number>; maisCara: number }>();
  const modelosSemPreco = new Set<string>();

  for (const l of linhas) {
    const custo = l.erro ? 0 : custoDaChamadaUsd({ modelo: l.modelo, entrada: l.entrada, saida: l.saida, cacheCriacao: l.cache_criacao, cacheLida: l.cache_lida });
    if (!l.erro && custo == null) modelosSemPreco.add(l.modelo ?? "(sem modelo)");
    const somar = (a: Agg) => {
      a.chamadas++;
      if (l.erro) a.erros++;
      a.entrada += l.entrada;
      a.saida += l.saida;
      a.cacheCriacao += l.cache_criacao;
      a.cacheLida += l.cache_lida;
      if (custo == null && !l.erro) a.semPreco++;
      else a.custo += custo ?? 0;
    };
    const k = [l.empresa, mes(l.quando), l.operacao, modeloBase(l.modelo) ?? "(falhou)"].join("\u0000");
    if (!porGrupo.has(k)) porGrupo.set(k, vazio());
    somar(porGrupo.get(k)!);
    const ke = [l.empresa, mes(l.quando)].join("\u0000");
    if (!porEmpresaMes.has(ke)) porEmpresaMes.set(ke, vazio());
    somar(porEmpresaMes.get(ke)!);
    if (l.user_id) {
      const kp = `${l.tenant_id}\u0000${l.user_id}`;
      if (!pessoas.has(kp)) pessoas.set(kp, { empresa: l.empresa, porDia: new Map(), maisCara: 0 });
      const p = pessoas.get(kp)!;
      p.porDia.set(dia(l.quando), (p.porDia.get(dia(l.quando)) ?? 0) + 1);
      if (custo != null && custo > p.maisCara) p.maisCara = custo;
    }
  }

  const out: string[] = [];
  out.push(`# Medição do Prompt AU, Fase 1 — custo real da IA (gerada em ${new Date().toLocaleString("pt-BR")})`, "");
  out.push(`Conexão somente leitura. Preços: ${FONTE_DA_TABELA_DE_PRECOS}, versão de ${DATA_DA_TABELA_DE_PRECOS}. Escrita de cache a 1,25× a entrada (cache de 5 minutos), leitura a 0,1× (ou o valor próprio do modelo).`);
  out.push(cambio ? `Câmbio declarado: R$ ${cambio.toLocaleString("pt-BR")} por US$ (CAMBIO_USD_BRL).` : "Câmbio não informado (CAMBIO_USD_BRL): custos só em US$.", "");
  out.push(`Registros em ia_uso: ${int(linhas.length)}.`);
  if (modelosSemPreco.size) out.push(`**Modelos sem preço na tabela (custo desconhecido, fora das somas):** ${[...modelosSemPreco].join(", ")}.`);
  out.push("");

  out.push("## 1 e 2 · Por empresa, mês, operação e modelo", "");
  out.push("| Empresa | Mês | Operação | Modelo | Chamadas | Erros | Entrada | Saída | Cache criado | Cache lido | Custo US$ | Custo R$ |");
  out.push("| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const [k, a] of porGrupo) {
    const [empresa, m, op, modelo] = k.split("\u0000");
    out.push(`| ${empresa} | ${m} | ${op} | ${modelo} | ${int(a.chamadas)} | ${int(a.erros)} | ${int(a.entrada)} | ${int(a.saida)} | ${int(a.cacheCriacao)} | ${int(a.cacheLida)} | ${usd(a.custo)}${a.semPreco ? " *" : ""} | ${brl(a.custo)} |`);
  }
  out.push("", "\\* parte das chamadas sem preço na tabela.", "");

  out.push("## Total por empresa e mês (para conferir com o gasto da reunião: cerca de US$ 6 a 7 no mês anterior)", "");
  out.push("| Empresa | Mês | Chamadas | Custo US$ | Custo R$ |", "| --- | --- | ---: | ---: | ---: |");
  const totalMes = new Map<string, number>();
  for (const [k, a] of porEmpresaMes) {
    const [empresa, m] = k.split("\u0000");
    out.push(`| ${empresa} | ${m} | ${int(a.chamadas)} | ${usd(a.custo)} | ${brl(a.custo)} |`);
    totalMes.set(m, (totalMes.get(m) ?? 0) + a.custo);
  }
  out.push("", "| Mês (todas as empresas) | Custo US$ | Custo R$ |", "| --- | ---: | ---: |");
  for (const [m, v] of totalMes) out.push(`| ${m} | ${usd(v)} | ${brl(v)} |`);
  out.push("");

  out.push("## 3 · Por pessoa (sem nome: numeradas por empresa)", "");
  out.push("| Empresa | Pessoa | Dias com uso | Chamadas por dia: mediana | Chamadas por dia: p90 | Pergunta mais cara |", "| --- | --- | ---: | ---: | ---: | ---: |");
  const contador = new Map<string, number>();
  for (const p of pessoas.values()) {
    const n = (contador.get(p.empresa) ?? 0) + 1;
    contador.set(p.empresa, n);
    const xs = [...p.porDia.values()];
    out.push(`| ${p.empresa} | pessoa ${n} | ${xs.length} | ${percentil(xs, 50)} | ${percentil(xs, 90)} | ${usd(p.maisCara)} |`);
  }
  out.push("");
  out.push("## 4 · Recusas do limite de 30/300 por hora", "");
  out.push("Não medível pelo banco: a recusa não grava nada em `ia_uso` (`limiteDeConversa` só conta). Para medir daqui em diante, seria preciso registrar a recusa, sem conteúdo.", "");
  console.log(out.join("\n"));
}

main()
  .then(() => sql.end())
  .catch(async (e) => {
    console.error("Falha na medição:", e instanceof Error ? e.message : e);
    await sql.end();
    process.exit(1);
  });

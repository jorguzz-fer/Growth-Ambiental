import { and, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/context";
import { db, schema } from "@/lib/db";
import { getChartAccounts, getUsoDoPlanoDeContas, type ChartAccountRow } from "@/lib/queries";
import { analisarPlano } from "@/lib/planocontas-analise";
import { categoriaDaConta, categoriaPadraoDaConta, recusaDeCategoriaDaConta } from "@/lib/categoria-do-plano";
import { chaveLigada } from "@/lib/chaves-tenant";
import { defaultDreCategory } from "@/lib/budget/config";
import { categoriaDoGrupo, semelhanca } from "@/lib/planocontas-regras";
import { AssistentePlanoContas } from "@/components/app/assistente-planocontas";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PlanoContasManager } from "@/components/app/planocontas-manager";
import { AccessDenied } from "@/components/app/access-denied";
import { PropostaDeContas } from "@/components/app/planocontas-cris";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { FerramentasDoPlano } from "@/components/app/planocontas/plano-ferramentas";

export const dynamic = "force-dynamic";

type Kind = "cef" | "complementar";
type Natureza = "receita" | "despesa";
interface Group {
  code: string;
  name: string;
  kind: Kind;
  items: { id: string; code: string; name: string; natureza: Natureza; ativo: boolean; categoria: string; categoriaPadrao: string; categoriaEscolhida: string | null }[];
}

function groupBy(rows: ChartAccountRow[], kind: Kind): Group[] {
  const map = new Map<string, Group>();
  for (const r of rows.filter((x) => x.kind === kind)) {
    if (!map.has(r.groupCode)) {
      map.set(r.groupCode, { code: r.groupCode, name: r.groupName, kind, items: [] });
    }
    map.get(r.groupCode)!.items.push({
      id: r.id,
      code: r.code,
      name: r.name,
      natureza: (r.natureza === "receita" ? "receita" : "despesa") as Natureza,
      ativo: r.ativo ?? true,
      // Prompt DP — a categoria da DRE da conta: a escolhida ou o padrão.
      categoria: categoriaDaConta(r),
      categoriaPadrao: categoriaPadraoDaConta(r),
      categoriaEscolhida: r.dreCategory ?? null,
    });
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.items.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }
  return groups.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

/** Categorias DRE — relatório fixo (não editável). */
const DRE_CATS = [
  { name: "Receita", desc: "Consultoria, estudos, monitoramento, licenciamento e outras receitas", icon: "📈", color: "var(--color-success)" },
  { name: "Custo Variável", desc: "Custos diretos dos projetos: equipe técnica, campo, terceiros, laboratório e taxas", icon: "📊", color: "var(--color-danger)" },
  { name: "Custo Fixo", desc: "Estrutura técnica compartilhada entre projetos", icon: "➖", color: "var(--color-ink3)" },
  { name: "Despesa Variável", desc: "Tributos sobre o faturamento, comissões, comercial e propostas", icon: "📉", color: "#f59e0b" },
  { name: "Despesa Fixa", desc: "Escritório, administrativo, tecnologia, contabilidade e jurídico", icon: "➖", color: "#f59e0b" },
  { name: "Despesas Financeiras", desc: "Tarifas bancárias, juros, multas e IOF", icon: "🏦", color: "#64748b" },
  { name: "Retiradas", desc: "Pró-labore e distribuição de lucros", icon: "💰", color: "var(--color-accent)" },
  { name: "Investimento", desc: "Equipamentos de campo, veículos, informática e laboratório próprio", icon: "🏢", color: "#3b82f6" },
  { name: "Empréstimos", desc: "Amortização de empréstimos e parcelamentos", icon: "🏦", color: "#0ea5e9" },
];

export default async function PlanoContasPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "planocontas", "ver")) return <AccessDenied />;
  const tenantId = ctx.tenant.id;
  const [rows, chaveDespesa, chaveOrcamento] = await Promise.all([
    getChartAccounts(tenantId),
    chaveLigada(tenantId, "despesa_categoria_do_plano"),
    chaveLigada(tenantId, "orcamento_categoria_do_plano"),
  ]);
  const cef = groupBy(rows, "cef");
  const comp = groupBy(rows, "complementar");
  const perms = {
    criar: can(ctx.perms, "planocontas", "criar"),
    editar: can(ctx.perms, "planocontas", "editar"),
    excluir: can(ctx.perms, "planocontas", "excluir"),
  };
  // Prompt G, Parte 2 — assistente somente leitura. 8.5: o uso vem das telas
  // de origem, e só para quem as vê — sem Despesas, nenhuma contagem de
  // lançamento, nem agregada; sem Orçamentos, nenhuma linha de orçamento.
  const comLancamentos = can(ctx.perms, "despesas", "ver");
  const comOrcamento = can(ctx.perms, "budget", "ver");
  const uso = comLancamentos || comOrcamento ? await getUsoDoPlanoDeContas(tenantId, ctx.projects.map((p) => p.id)) : null;
  const analise = analisarPlano(
    rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      kind: r.kind === "cef" ? "cef" : "complementar",
      natureza: r.natureza === "receita" ? "receita" : "despesa",
      ativo: r.ativo ?? true,
      groupCode: r.groupCode,
      groupName: r.groupName,
    })),
    uso,
    { projetos: ctx.projects.map((p) => p.name), comLancamentos, comOrcamento },
  );

  // Contas sem categoria válida para a DRE e despesas sem conta do plano.
  const semMapeamento = rows.filter((r) => recusaDeCategoriaDaConta(r.natureza, categoriaDaConta(r)));
  const codigos = rows.map((r) => r.code);
  const [foraDoPlano] = comLancamentos
    ? await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.despesas)
        .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
        .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.versions.kind, "atual"), eq(schema.despesas.cancelado, false), or(isNull(schema.despesas.contaCef), codigos.length ? notInArray(schema.despesas.contaCef, codigos) : sql`true`)))
    : [null];

  // Prévia da chave "orcamento_categoria_do_plano": grupos cuja linha NOVA de Orçamento muda de categoria.
  const previaOrcamento = [...new Set(rows.map((r) => r.groupCode))]
    .map((code) => {
      const doGrupo = rows.filter((r) => r.groupCode === code);
      const nat = doGrupo.some((r) => r.natureza === "receita") ? "receita" : "despesa";
      const hoje = nat === "receita" ? "Receita" : defaultDreCategory(doGrupo[0].kind === "cef" ? "cef" : "complementar");
      const comChave = nat === "receita" ? "Receita" : (categoriaDoGrupo(doGrupo.map((r) => ({ ativo: r.ativo ?? true, categoria: categoriaDaConta(r) }))) ?? hoje);
      return { code, nome: doGrupo[0].groupName, hoje, comChave };
    })
    .filter((x) => x.hoje !== x.comChave);

  // Possíveis duplicidades (mesma natureza, nomes muito parecidos) — para a Cris.
  const ativas = rows.filter((r) => r.ativo);
  const duplicidades: string[] = [];
  for (let i = 0; i < ativas.length && duplicidades.length < 15; i++)
    for (let j = i + 1; j < ativas.length && duplicidades.length < 15; j++)
      if (ativas[i].natureza === ativas[j].natureza && semelhanca(ativas[i].name, ativas[j].name) >= 0.85) duplicidades.push(`${ativas[i].code} ${ativas[i].name} ≈ ${ativas[j].code} ${ativas[j].name}`);

  return (
    <>
      <PageHeader title="Plano de Contas" subtitle="Dupla classificação: grupo do plano + Categoria DRE (uma por conta)" />
      <CrisDaTela
        titulo="Plano de Contas da empresa"
        dados={{
          regra: "Conta = natureza do lançamento. Projeto, contrato, fase, atividade e modalidade são dimensões, não contas. Use só contas ATIVAS desta lista; não invente conta.",
          contas: rows.filter((r) => r.ativo).map((r) => `${r.code} ${r.name} [${r.natureza === "receita" ? "R" : "D"}/${categoriaDaConta(r)}]`),
          grupos: [...cef, ...comp].map((g) => `${g.code} ${g.name}`),
          possiveisDuplicidades: duplicidades,
          contasSemMapeamento: semMapeamento.map((r) => r.code),
          lancamentosForaDoPlano: foraDoPlano ? { quantidade: foraDoPlano.n } : "sem acesso a Despesas",
        }}
        sugestoes={["Qual conta uso para hospedagem da equipe em campanha?", "Há contas duplicadas no plano?", "Sugira contas para um programa de educação ambiental"]}
      />

      {/* Prompt G2 — a Cris propõe contas novas; a pessoa confere e cria. */}
      <PropostaDeContas
        grupos={[...cef, ...comp].map((g) => ({ code: g.code, name: g.name, kind: g.kind }))}
        codigos={rows.map((r) => r.code)}
        podeCriar={perms.criar}
      />

      {(semMapeamento.length > 0 || (foraDoPlano && foraDoPlano.n > 0)) && (
        <div className="mb-3 rounded-[10px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] text-[#92400e]" data-testid="sem-mapeamento">
          {semMapeamento.length > 0 && <p>Contas sem categoria válida para a DRE: {semMapeamento.map((r) => r.code).join(", ")}. Abra o grupo em &ldquo;Editar&rdquo; e escolha a categoria.</p>}
          {foraDoPlano && foraDoPlano.n > 0 && <p>{foraDoPlano.n} despesa(s) da versão Atual sem conta ou com conta fora do plano — aparecem como &ldquo;Sem conta do plano&rdquo; na DRE Analítica.</p>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PlanoContasManager cef={cef} comp={comp} perms={perms} />

        <aside className="space-y-4">
          {/* 8.6 — o painel entra ACIMA da coluna de Categorias DRE, que permanece. */}
          <AssistentePlanoContas usuario={ctx.userEmail ?? "anon"} analise={analise} />
          <Card aria-label="Categorias DRE" className="rounded-[16px] border-[var(--color-line)] shadow-[0_1px_3px_rgba(22,35,59,.06)]">
            <CardContent className="p-5">
              <h2 className="mb-4 text-[15px] font-semibold text-[var(--color-v2-ink)]">Categorias DRE</h2>
              <div className="space-y-3">
                {DRE_CATS.map((c, i) => (
                  <div key={c.name} className={`flex items-start gap-3 ${i < DRE_CATS.length - 1 ? "border-b border-[#EDF1F7] pb-3" : ""}`}>
                    <span aria-hidden className="mt-0.5 text-[15px]" style={{ color: c.color }}>
                      {c.icon}
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--color-v2-ink)]">{c.name}</div>
                      <div className="text-[12px] leading-snug text-[var(--color-v2-ink2)]">{c.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-[13px] border border-[#EDF1F7] bg-[#FCFDFF] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-v2-ink2)]">
                ⓘ As categorias DRE são fixas (estrutura do relatório). Cada conta tem uma categoria, escolhida ao criar a conta e alterável em &ldquo;Editar&rdquo;, na
                própria conta: custo direto dos projetos é custo variável; a estrutura da empresa é despesa fixa.{" "}
                {chaveDespesa
                  ? "O lançamento de despesa usa a categoria da conta, travada (chave “Despesa herda a categoria” ligada)."
                  : "Cada despesa guarda a categoria escolhida no lançamento (chave “Despesa herda a categoria” desligada)."}
              </p>
            </CardContent>
          </Card>

          <Card aria-label="Ferramentas do plano" className="rounded-[16px] border-[var(--color-line)] shadow-[0_1px_3px_rgba(22,35,59,.06)]">
            <CardContent className="p-5">
              <h2 className="mb-3 text-[15px] font-semibold text-[var(--color-v2-ink)]">Ferramentas</h2>
              <FerramentasDoPlano
                perms={{ ...perms, reclassificar: can(ctx.perms, "planocontasreclass", "editar") }}
                contas={rows.map((r) => ({ code: r.code, name: r.name, ativo: r.ativo ?? true, natureza: r.natureza }))}
              />
            </CardContent>
          </Card>

          <section id="previa-orcamento" className="rounded-[16px] border border-[var(--color-line)] bg-white p-5 text-[12px]">
            <h2 className="mb-1 text-[14px] font-semibold">Categoria do Orçamento</h2>
            <p className="text-[var(--color-ink2)]">
              Chave &ldquo;Orçamento usa a categoria da DRE do Plano de Contas&rdquo;: <strong>{chaveOrcamento ? "ligada" : "desligada"}</strong>.{" "}
              {chaveOrcamento
                ? "Linhas novas de Orçamento e Previsão usam a categoria das contas do grupo."
                : previaOrcamento.length
                  ? "Com ela ligada, linhas NOVAS destes grupos mudam de categoria:"
                  : "Nenhum grupo muda de categoria com a chave."}
            </p>
            {!chaveOrcamento && previaOrcamento.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {previaOrcamento.slice(0, 40).map((g) => (
                  <li key={g.code}>
                    {g.code} {g.nome}: {g.hoje} → {g.comChave}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

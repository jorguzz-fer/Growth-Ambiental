import { getTenantContext } from "@/lib/context";
import { getChartAccounts, getUsoDoPlanoDeContas, type ChartAccountRow } from "@/lib/queries";
import { analisarPlano } from "@/lib/planocontas-analise";
import { categoriaDaConta, categoriaPadraoDaConta } from "@/lib/categoria-do-plano";
import { AssistentePlanoContas } from "@/components/app/assistente-planocontas";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PlanoContasManager } from "@/components/app/planocontas-manager";
import { AccessDenied } from "@/components/app/access-denied";
import { PropostaDeContas } from "@/components/app/planocontas-cris";

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
  return groups.sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true }),
  );
}

/** Categorias DRE — relatório fixo (não editável). */
const DRE_CATS = [
  { name: "Receita", desc: "Contratos de licenciamento, estudos, monitoramento e consultoria", icon: "📈", color: "var(--color-success)" },
  { name: "Custo Variável", desc: "Campo, laboratório, terceiros técnicos e taxas dos projetos", icon: "📊", color: "var(--color-danger)" },
  { name: "Custo Fixo", desc: "Equipe técnica própria (folha e encargos)", icon: "➖", color: "var(--color-ink3)" },
  { name: "Despesa Variável", desc: "Impostos sobre o faturamento, comissões, propostas", icon: "📉", color: "#f59e0b" },
  { name: "Despesa Fixa", desc: "Escritório, contabilidade, tecnologia", icon: "➖", color: "#f59e0b" },
  { name: "Retiradas", desc: "Pró-labore, distribuição de lucros", icon: "💰", color: "var(--color-accent)" },
  { name: "Investimento", desc: "Equipamentos de campo, veículos, laboratório próprio", icon: "🏢", color: "#3b82f6" },
  { name: "Empréstimos", desc: "Captação e amortização de empréstimos", icon: "🏦", color: "#0ea5e9" },
];

export default async function PlanoContasPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "planocontas", "ver")) return <AccessDenied />;
  const rows = await getChartAccounts(ctx.tenant.id);
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
  // Escopo: as obras que o usuário vê (declaradas no painel).
  const comLancamentos = can(ctx.perms, "despesas", "ver");
  const comOrcamento = can(ctx.perms, "budget", "ver");
  const uso = comLancamentos || comOrcamento ? await getUsoDoPlanoDeContas(ctx.tenant.id, ctx.projects.map((p) => p.id)) : null;
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

  return (
    <>
      <PageHeader
        title="Plano de Contas"
        subtitle="Dupla classificação: grupo do plano + Categoria DRE (uma por conta)"
      />

      {/* Prompt G, Parte 1 — restyle no ponto de uso (cartão 16px / `--color-line`);
          `Card` compartilhado não muda. Conteúdo, textos e ordem: idênticos. */}
      {/* Prompt G2 — a Cris propõe contas novas; a pessoa confere e cria. */}
      <PropostaDeContas
        grupos={[...cef, ...comp].map((g) => ({ code: g.code, name: g.name, kind: g.kind }))}
        codigos={rows.map((r) => r.code)}
        podeCriar={perms.criar}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PlanoContasManager cef={cef} comp={comp} perms={perms} />

        <aside>
          {/* 8.6 — o painel entra ACIMA da coluna de Categorias DRE, que permanece. */}
          <AssistentePlanoContas usuario={ctx.userEmail ?? "anon"} analise={analise} />
          <Card aria-label="Categorias DRE" className="rounded-[16px] border-[var(--color-line)] shadow-[0_1px_3px_rgba(22,35,59,.06)]">
            <CardContent className="p-5">
              <h2 className="mb-4 text-[15px] font-semibold text-[var(--color-v2-ink)]">
                Categorias DRE
              </h2>
              <div className="space-y-3">
                {DRE_CATS.map((c, i) => (
                  <div
                    key={c.name}
                    className={`flex items-start gap-3 ${
                      i < DRE_CATS.length - 1
                        ? "border-b border-[#EDF1F7] pb-3"
                        : ""
                    }`}
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 text-[15px]"
                      style={{ color: c.color }}
                    >
                      {c.icon}
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--color-v2-ink)]">
                        {c.name}
                      </div>
                      <div className="text-[12px] leading-snug text-[var(--color-v2-ink2)]">
                        {c.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-[13px] border border-[#EDF1F7] bg-[#FCFDFF] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-v2-ink2)]">
                ⓘ As categorias DRE são fixas (estrutura do relatório). Cada conta
                tem uma categoria: o sistema traz o padrão de boa prática (gasto de
                obra é custo variável) e você troca em &ldquo;Editar&rdquo;, na própria
                conta. Com a chave &ldquo;Despesa herda a categoria&rdquo; ligada, o
                lançamento de despesa usa a categoria da conta, travada.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

import { and, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/context";
import { db, schema } from "@/lib/db";
import { getChartAccounts, getUsoDoPlanoDeContas } from "@/lib/queries";
import { analisarPlano } from "@/lib/planocontas-analise";
import { categoriaDaConta, categoriaPadraoDaConta, recusaDeCategoriaDaConta } from "@/lib/categoria-do-plano";
import { chaveLigada } from "@/lib/chaves-tenant";
import { defaultDreCategory } from "@/lib/budget/config";
import { categoriaDoGrupo, classeDaConta, classesPermitidas, CLASSES_GERENCIAIS, ehClasse, ROTULO_CLASSE, semelhanca } from "@/lib/planocontas-regras";
import { usoDosCodigos } from "@/lib/planocontas-servidor";
import { AssistentePlanoContas } from "@/components/app/assistente-planocontas";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { PropostaDeContas } from "@/components/app/planocontas-cris";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { PlanoArvore, type ContaDaTela } from "@/components/app/planocontas/plano-arvore";

export const dynamic = "force-dynamic";

const DRE_CATS: { name: string; desc: string }[] = [
  { name: "Receita", desc: "Prestação de serviços e outras receitas" },
  { name: "Custo Variável", desc: "Custos diretos dos projetos (equipe, campo, terceiros, taxas)" },
  { name: "Despesa Variável", desc: "Tributos sobre faturamento, deduções, comercial" },
  { name: "Custo Fixo", desc: "Estrutura técnica compartilhada entre projetos" },
  { name: "Despesa Fixa", desc: "Administração, tecnologia, serviços profissionais" },
  { name: "Retiradas", desc: "Pró-labore e distribuição de lucros" },
  { name: "Investimento", desc: "Equipamentos, veículos, benfeitorias" },
  { name: "Empréstimos", desc: "Amortização de empréstimos e parcelamentos" },
  { name: "Despesas Financeiras", desc: "Tarifas, juros, multas, IOF" },
];

/**
 * Plano de Contas: a NATUREZA do lançamento. Projeto, contrato, fase,
 * atividade e modalidade são dimensões do lançamento, não contas.
 */
export default async function PlanoContasPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  if (!can(ctx.perms, "planocontas", "ver")) return <AccessDenied />;
  const tenantId = ctx.tenant.id;
  const [rows, grupos, chaveDespesa, chaveOrcamento] = await Promise.all([
    getChartAccounts(tenantId),
    db.select().from(schema.chartGroups).where(eq(schema.chartGroups.tenantId, tenantId)),
    chaveLigada(tenantId, "despesa_categoria_do_plano"),
    chaveLigada(tenantId, "orcamento_categoria_do_plano"),
  ]);
  const perms = {
    criar: can(ctx.perms, "planocontas", "criar"),
    editar: can(ctx.perms, "planocontas", "editar"),
    excluir: can(ctx.perms, "planocontas", "excluir"),
    reclassificar: can(ctx.perms, "planocontasreclass", "editar"),
  };
  // Uso das contas: só para quem vê a tela de origem (Prompt G, 8.5) — sem
  // Despesas, nenhuma contagem nem valor de lançamento.
  const comLancamentos = can(ctx.perms, "despesas", "ver");
  const comOrcamento = can(ctx.perms, "budget", "ver");
  const uso = comLancamentos || comOrcamento ? await usoDosCodigos(tenantId, rows.map((r) => r.code)) : null;
  const usoLegado = comLancamentos || comOrcamento ? await getUsoDoPlanoDeContas(tenantId, ctx.projects.map((p) => p.id)) : null;

  const contas: ContaDaTela[] = rows.map((r) => {
    const categoria = categoriaDaConta(r);
    const u = uso?.get(r.code);
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      descricao: r.descricao ?? null,
      groupCode: r.groupCode,
      natureza: r.natureza === "receita" ? "receita" : "despesa",
      ativo: r.ativo ?? true,
      categoria,
      categoriaEscolhida: r.dreCategory ?? null,
      categoriaPadrao: categoriaPadraoDaConta(r),
      classe: classeDaConta(r, categoria),
      classeEscolhida: r.classeGerencial ?? null,
      tipoCusto: r.tipoCusto ?? null,
      papel: r.papel ?? null,
      versao: r.versao ?? 1,
      ordem: r.ordem ?? 0,
      uso: u ? { despesas: comLancamentos ? u.despesas : 0, valorAtual: comLancamentos ? u.valorAtual : null, orcamento: comOrcamento ? u.orcamento : 0, medicoes: u.medicoes } : null,
    };
  });
  // Conta cujo grupo não está no cadastro de grupos (não deveria: a 0079 criou todos) vira grupo de 1º nível na tela.
  const codigosDeGrupo = new Set(grupos.map((g) => g.code));
  const gruposDaTela = [
    ...grupos.map((g) => ({ id: g.id, code: g.code, name: g.name, descricao: g.descricao, parentId: g.parentId, kind: g.kind, ordem: g.ordem })),
    ...[...new Map(rows.filter((r) => !codigosDeGrupo.has(r.groupCode)).map((r) => [r.groupCode, r])).values()].map((r) => ({ id: `legado:${r.groupCode}`, code: r.groupCode, name: r.groupName, descricao: null, parentId: null, kind: r.kind, ordem: 999 })),
  ];

  // §8.8 — contas sem mapeamento válido e lançamentos sem conta do plano.
  const semMapeamento = rows.filter((r) => recusaDeCategoriaDaConta(r.natureza, categoriaDaConta(r)) || (r.classeGerencial && (!ehClasse(r.classeGerencial) || !classesPermitidas(r.natureza).includes(r.classeGerencial))));
  const codigos = rows.map((r) => r.code);
  const [foraDoPlano] = comLancamentos
    ? await db
        .select({ n: sql<number>`count(*)::int`, valor: sql<string>`coalesce(sum(${schema.despesas.valor}),0)` })
        .from(schema.despesas)
        .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
        .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.versions.kind, "atual"), eq(schema.despesas.cancelado, false), or(isNull(schema.despesas.contaCef), codigos.length ? notInArray(schema.despesas.contaCef, codigos) : sql`true`)))
    : [null];

  // Prévia da chave "orcamento_categoria_do_plano": grupos cuja linha NOVA de Orçamento muda de categoria.
  const previaOrcamento = [...new Set(rows.map((r) => r.groupCode))]
    .map((code) => {
      const doGrupo = rows.filter((r) => r.groupCode === code);
      const nat = doGrupo.some((r) => r.natureza === "receita") ? "receita" : "despesa";
      const hoje = nat === "receita" ? "Receita" : defaultDreCategory(doGrupo[0].kind);
      const comChave = nat === "receita" ? "Receita" : (categoriaDoGrupo(doGrupo.map((r) => ({ ativo: r.ativo ?? true, categoria: categoriaDaConta(r) }))) ?? hoje);
      return { code, nome: doGrupo[0].groupName, hoje, comChave };
    })
    .filter((x) => x.hoje !== x.comChave);

  // Possíveis duplicidades (mesma natureza, nomes muito parecidos) — sugestão, não bloqueio.
  const ativas = rows.filter((r) => r.ativo);
  const duplicidades: string[] = [];
  for (let i = 0; i < ativas.length && duplicidades.length < 15; i++)
    for (let j = i + 1; j < ativas.length && duplicidades.length < 15; j++)
      if (ativas[i].natureza === ativas[j].natureza && semelhanca(ativas[i].name, ativas[j].name) >= 0.85) duplicidades.push(`${ativas[i].code} ${ativas[i].name} ≈ ${ativas[j].code} ${ativas[j].name}`);

  const analise = analisarPlano(
    rows.map((r) => ({ id: r.id, code: r.code, name: r.name, kind: r.kind === "cef" ? "cef" : "complementar", natureza: r.natureza === "receita" ? "receita" : "despesa", ativo: r.ativo ?? true, groupCode: r.groupCode, groupName: r.groupName })),
    usoLegado,
    { projetos: ctx.projects.map((p) => p.name), comLancamentos, comOrcamento },
  );

  return (
    <>
      <PageHeader
        title="Plano de Contas"
        subtitle="A natureza econômica de cada lançamento. Projeto, contrato, fase e modalidade são dimensões do lançamento — não viram contas."
      />
      <CrisDaTela
        titulo="Plano de Contas da empresa"
        dados={{
          regra: "Conta = natureza do lançamento. Projeto, contrato, fase, atividade e modalidade são dimensões, não contas. Use só contas ATIVAS desta lista; não invente conta.",
          contas: contas.filter((c) => c.ativo).map((c) => `${c.code} ${c.name} [${c.natureza === "receita" ? "R" : "D"}/${c.categoria}/${ROTULO_CLASSE[c.classe]}]`),
          grupos: gruposDaTela.map((g) => `${g.code} ${g.name}`),
          possiveisDuplicidades: duplicidades,
          contasSemMapeamento: semMapeamento.map((r) => r.code),
          lancamentosForaDoPlano: foraDoPlano ? { quantidade: foraDoPlano.n } : "sem acesso a Despesas",
        }}
        sugestoes={["Qual conta uso para hospedagem da equipe em campanha?", "Há contas duplicadas no plano?", "Explique a diferença entre custo direto e indireto aqui", "Sugira contas para um programa de educação ambiental"]}
      />
      <PropostaDeContas grupos={gruposDaTela.map((g) => ({ code: g.code, name: g.name, kind: g.kind === "cef" ? "cef" : "complementar" }))} codigos={[...rows.map((r) => r.code), ...gruposDaTela.map((g) => g.code)]} podeCriar={perms.criar} />

      {(semMapeamento.length > 0 || (foraDoPlano && foraDoPlano.n > 0)) && (
        <div className="mb-3 rounded-[10px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] text-[#92400e]" data-testid="sem-mapeamento">
          {semMapeamento.length > 0 && <p>Contas sem mapeamento válido para a DRE: {semMapeamento.map((r) => r.code).join(", ")}. Abra e escolha a categoria.</p>}
          {foraDoPlano && foraDoPlano.n > 0 && <p>{foraDoPlano.n} despesa(s) da versão Atual sem conta ou com conta fora do plano — aparecem como &ldquo;Sem conta do plano&rdquo; na DRE Analítica. Use &ldquo;Reclassificar lançamentos&rdquo; ou edite a despesa.</p>}
        </div>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <PlanoArvore grupos={gruposDaTela} contas={contas} perms={perms} comUso={!!uso} />
        <aside className="grid gap-4 md:grid-cols-2 2xl:block 2xl:space-y-4">
          <AssistentePlanoContas usuario={ctx.userEmail ?? "anon"} analise={analise} />
          <section aria-label="Categorias DRE" className="rounded-[14px] border border-[var(--color-line)] bg-white p-4 text-[12px]">
            <h2 className="mb-2 text-[14px] font-semibold">Categorias da DRE</h2>
            <ul className="space-y-1.5">
              {DRE_CATS.map((c) => (
                <li key={c.name}>
                  <strong>{c.name}</strong> — <span className="text-[var(--color-ink2)]">{c.desc}</span>
                </li>
              ))}
            </ul>
            <h3 className="mb-1 mt-3 text-[13px] font-semibold">Classes da DRE gerencial</h3>
            <ul className="space-y-0.5 text-[var(--color-ink2)]">
              {CLASSES_GERENCIAIS.map((c) => (
                <li key={c}>{ROTULO_CLASSE[c]}</li>
              ))}
            </ul>
            <p className="mt-3 rounded-[10px] bg-[var(--color-surface2)] px-2 py-1.5 text-[11px] text-[var(--color-ink2)]">
              A categoria alimenta a DRE de sempre (Margem de Contribuição → EBITDA → Resultado). A classe gerencial monta a visão Receita bruta → Resultado líquido, com os
              mesmos números. {chaveDespesa ? "Despesa herda a categoria da conta (chave ligada)." : "Cada despesa guarda a categoria escolhida no lançamento (chave desligada)."}
            </p>
          </section>
          <section id="previa-orcamento" className="rounded-[14px] border border-[var(--color-line)] bg-white p-4 text-[12px]">
            <h2 className="mb-1 text-[14px] font-semibold">Categoria do Orçamento</h2>
            <p className="text-[var(--color-ink2)]">
              Chave &ldquo;Orçamento usa a categoria da DRE do Plano de Contas&rdquo;: <strong>{chaveOrcamento ? "ligada" : "desligada"}</strong>.{" "}
              {previaOrcamento.length ? `Com ela ligada, linhas NOVAS destes grupos mudam de categoria:` : "Nenhum grupo muda de categoria com a chave."}
            </p>
            {previaOrcamento.length > 0 && (
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

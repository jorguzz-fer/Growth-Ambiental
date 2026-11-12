import { getTenantContext } from "@/lib/context";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { PedirProjeto } from "@/components/app/pedir-projeto";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto } from "@/components/app/projeto-da-aba";
import { getInccTabela, getAtualVersion, getUnits, getLinhasDaSerieIncc, inccDaEmpresaAtivo } from "@/lib/queries";
import { SERIE_DA_EMPRESA } from "@/lib/incc-empresa";
import { InccEmpresaCard } from "@/components/app/incc-empresa-card";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { expandUnitReceivables } from "@/lib/calc/receivables";
import { chaveLigada } from "@/lib/chaves-tenant";
import { analisarIncc, mesDaData } from "@/lib/incc-analise";
import { ordDeHoje } from "@/lib/incc-regras";
import { AssistenteIncc } from "@/components/app/assistente-incc";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { InccEditor } from "@/components/app/incc-editor";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

export default async function ParametrosPage({
  searchParams,
}: {
  searchParams: Promise<{ proj?: string; project?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "parametros", "ver")) return <AccessDenied />;
  // A obra vem da URL desta tela (Prompt A); sem ela, a aba reabre a última
  // escolhida ou a tela pede a escolha — nunca a do cookie.
  // Prompt Q2 — com a chave "incc_por_empresa" ligada e a série da empresa
  // adotada, a tela edita a série da empresa e o seletor de obra sai.
  const emUso = await inccDaEmpresaAtivo(ctx.tenant.id);
  const selecao = emUso ? null : lerSelecaoDeProjeto(ctx.projects, await searchParams);
  if (selecao && selecao.tipo !== "projeto") {
    return <PedirProjeto titulo="Parâmetros / INCC" projetos={ctx.projects} oQue="editar o INCC" />;
  }
  const project = selecao?.tipo === "projeto" ? selecao.projeto : null;
  const alvo = project?.id ?? SERIE_DA_EMPRESA;
  const { linhas, variante } = await getInccTabela(ctx.tenant.id, alvo);
  const mesesDaEmpresa = (await getLinhasDaSerieIncc(ctx.tenant.id, SERIE_DA_EMPRESA)).length;
  const canEdit = can(ctx.perms, "parametros", "editar");
  // Seção 6.3 — análises do assistente (puras): meses faltantes, curva,
  // cobertura (vencimentos das vendas da versão Atual e janela da obra).
  // Prompt Q2: na série da empresa, a cobertura junta todas as obras.
  const obras = project ? [project] : ctx.projects;
  const planoNovo = await chaveLigada(ctx.tenant.id, "plano_definicao_nova");
  const mesesComVencimento = (
    await Promise.all(
      obras.map(async (p) => {
        const atual = await getAtualVersion(ctx.tenant.id, p.id);
        const unidades = atual ? await getUnits(ctx.tenant.id, atual.id) : [];
        return unidades.flatMap((u) => expandUnitReceivables(u.paymentPlan, u.status, { definicaoNova: planoNovo }).map((r) => mesDaData(r.dia)));
      }),
    )
  )
    .flat()
    .filter((m): m is string => !!m);
  const janela = project
    ? { inicio: mesDaData(project.startDate), fim: mesDaData(project.endDate) }
    : janelaDasObras(ctx.projects.map((p) => ({ inicio: mesDaData(p.startDate), fim: mesDaData(p.endDate) })));
  const analise = analisarIncc(linhas, ordDeHoje(), mesesComVencimento, janela);

  return (
    <>
      <PageHeader
        eyebrow={project?.name ?? "Empresa · uma série para todas as obras"}
        title={`Parâmetros / INCC${variante ? ` · ${variante}` : ""}`}
        subtitle={`${variante ?? "Variante do INCC a confirmar (DI, M ou 10)"} · mês de referência · correção a partir da 5ª parcela, pelo acumulado do mês do vencimento`}
        actions={
          project ? (
            <ProjectPicker
              projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
              selected={project.id}
            />
          ) : undefined
        }
      />
      {project && <LembrarProjeto projectId={project.id} />}
      <CrisDaTela
        titulo={`Parâmetros / INCC — ${project ? `série da obra ${project.name}` : "série da empresa"}`}
        dados={{
          serie: project ? "da obra" : "da empresa",
          variante,
          meses: linhas.map((l) => ({ mes: l.m, mensal: l.mo, acumulado: l.ac, projetado: l.projected })),
          regra: "Correção a partir da 5ª parcela, pelo acumulado do mês do vencimento; aplicada no Caixa, na comparação entre cenários e na Projeção; não na DRE nem em Contas a Receber.",
          mesesFaltantes: analise.faltantes,
        }}
        sugestoes={["Explique como o INCC corrige as parcelas", "Projete o INCC dos próximos 6 meses pela média de 12 meses", "Quais meses ainda são projeção?", "O que muda com o INCC da empresa?"]}
      />
      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (Prompt E, 6.2). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {/* Prompt Q, seção 5 — o que a tela governa, declarado onde o usuário lê. */}
      <div className="mb-4 grid grid-cols-1 gap-2 text-[12.5px] text-[var(--color-ink2)] sm:grid-cols-2">
        <p className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface2)] px-3 py-2">
          <strong className="text-[var(--color-ink)]">Mês de referência.</strong> Cada linha é o mês a que o índice se refere (a FGV divulga no mês seguinte). A parcela
          que vence no mês usa o <strong>acumulado</strong> daquele mês, a partir da 5ª parcela.
        </p>
        <p className="rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface2)] px-3 py-2">
          <strong className="text-[var(--color-ink)]">Onde incide e onde não.</strong> A correção entra no Caixa, na comparação entre cenários e na Projeção.{" "}
          <strong>Não é aplicada</strong> nos recebíveis de Contas a Receber nem na receita da DRE (valor nominal, por decisão). Nada é gravado corrigido: a
          correção é aplicada na leitura.
        </p>
      </div>
      <InccEmpresaCard
        projetos={ctx.projects.map((p) => ({ id: p.id, nome: p.name }))}
        projetoAtual={project?.id ?? null}
        mesesDaEmpresa={mesesDaEmpresa}
        emUso={emUso}
        podeAdotar={canEdit && (ctx.role === "owner" || ctx.role === "admin")}
      />
      <InccEditor projectId={alvo} initial={linhas} variante={variante} canEdit={canEdit} />
      </div>
      <AssistenteIncc usuario={ctx.userEmail ?? "anon"} rows={linhas.map((l) => ({ m: l.m, mo: l.mo, ac: l.ac, projected: l.projected }))} variante={variante} analise={analise} />
      </div>
    </>
  );
}

/** Prompt Q2 — a janela de todas as obras: do primeiro início ao último fim. */
function janelaDasObras(janelas: { inicio: string | null; fim: string | null }[]): { inicio: string | null; fim: string | null } {
  const ord = (m: string) => {
    const [mm, yy] = m.split("/");
    return Number(yy) * 12 + Number(mm);
  };
  const inicios = janelas.map((j) => j.inicio).filter((m): m is string => !!m);
  const fins = janelas.map((j) => j.fim).filter((m): m is string => !!m);
  return {
    inicio: inicios.length ? inicios.reduce((a, b) => (ord(b) < ord(a) ? b : a)) : null,
    fim: fins.length ? fins.reduce((a, b) => (ord(b) > ord(a) ? b : a)) : null,
  };
}

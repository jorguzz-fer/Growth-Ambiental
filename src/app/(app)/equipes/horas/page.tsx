import { and, eq, inArray } from "drizzle-orm";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { getAlocaveis } from "@/lib/queries";
import { apontamentosDaEmpresa } from "@/lib/horas-queries";
import { distribuicaoDeHoras } from "@/lib/horas-regras";
import { planoDosProjetos } from "@/lib/contratos-queries";
import { HorasManager } from "@/components/app/horas/horas-manager";

export const dynamic = "force-dynamic";

/**
 * Apontamento de horas (0082): planejado × realizado por profissional e
 * destino (projeto, contrato, fase, atividade ou atividade interna), com o
 * custo gerencial quando a alocação tem custo-hora. Não gera despesa.
 */
export default async function HorasPage({ searchParams }: { searchParams: Promise<{ comp?: string; proj?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "equipes", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const hoje = new Date();
  const comp = /^\d{2}\/\d{4}$/.test(sp.comp ?? "") ? sp.comp! : `${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  const projetos = ctx.projects.filter((p) => p.kind !== "office");
  const projFiltro = projetos.some((p) => p.id === sp.proj) ? sp.proj! : null;
  const ids = projetos.map((p) => p.id);
  const [todos, alocaveis, contratosDosProjetos, plano, alocacoes] = await Promise.all([
    apontamentosDaEmpresa(ctx.tenant.id, [comp]),
    getAlocaveis(ctx.tenant.id),
    ids.length
      ? db
          .select({ projectId: schema.contratoProjetos.projectId, contratoId: schema.contratos.id, codigo: schema.contratos.codigo, titulo: schema.contratos.titulo })
          .from(schema.contratoProjetos)
          .innerJoin(schema.contratos, eq(schema.contratoProjetos.contratoId, schema.contratos.id))
          .where(and(eq(schema.contratoProjetos.tenantId, ctx.tenant.id), inArray(schema.contratoProjetos.projectId, ids)))
      : Promise.resolve([]),
    planoDosProjetos(ctx.tenant.id, ids),
    db
      .select({ id: schema.equipesProjeto.id, projectId: schema.equipesProjeto.projectId, funcionarioId: schema.equipesProjeto.funcionarioId, stakeholderId: schema.equipesProjeto.stakeholderId, custoHora: schema.equipesProjeto.custoHora, fNome: schema.funcionarios.nome, sNome: schema.stakeholders.nome })
      .from(schema.equipesProjeto)
      .leftJoin(schema.funcionarios, eq(schema.equipesProjeto.funcionarioId, schema.funcionarios.id))
      .leftJoin(schema.stakeholders, eq(schema.equipesProjeto.stakeholderId, schema.stakeholders.id))
      .where(and(eq(schema.equipesProjeto.tenantId, ctx.tenant.id), eq(schema.equipesProjeto.situacao, "ativa"))),
  ]);
  // Só o que é de projeto que a pessoa vê (ou atividade interna).
  const lista = todos.filter((x) => (x.a.projectId ? ids.includes(x.a.projectId) : true)).filter((x) => !projFiltro || x.a.projectId === projFiltro);
  const nomeProf = (x: (typeof lista)[number]) => x.funcionario ?? x.prestador ?? "—";
  const destino = (x: (typeof lista)[number]) => (x.a.projectId ? [x.projeto, x.contrato, x.fase, x.atividade].filter(Boolean).join(" › ") : `Interno: ${x.a.atividadeInterna}`);
  const dist = distribuicaoDeHoras(lista.map((x) => ({ tipo: x.a.tipo, profissional: nomeProf(x), destino: x.a.projectId ? x.projeto ?? "—" : `Interno: ${x.a.atividadeInterna}`, horas: Number(x.a.horas), custoHora: x.a.custoHora == null ? null : Number(x.a.custoHora) })));
  const nomes = new Map(projetos.map((p) => [p.id, p.name]));
  return (
    <>
      <CrisDaTela
        titulo="Apontamento de horas"
        dados={{ competencia: comp, total: dist.total, porProfissionalEDestino: dist.linhas.map((l) => ({ destino: l.destino, planejadas: l.planejadas, realizadas: l.realizadas, desvio: l.desvio })) }}
        sugestoes={["Quais projetos estouraram as horas planejadas?", "Quantas horas foram para atividades internas?"]}
      />
      <PageHeader
        eyebrow="Pessoas"
        title="Apontamento de Horas"
        subtitle={`${comp} · ${dist.total.realizadas} h realizadas de ${dist.total.planejadas} h planejadas · apontar horas não gera despesa (a remuneração fica em Folha e Despesas)`}
      />
      <HorasManager
        competencia={comp}
        projetoFiltro={projFiltro}
        projetos={projetos.map((p) => ({ id: p.id, nome: p.name }))}
        profissionais={alocaveis.map((a) => ({ valor: `${a.origem === "clt" ? "f" : "s"}:${a.id}`, nome: a.nome, origem: a.origem }))}
        contratos={contratosDosProjetos}
        fases={plano.fases.map((f) => ({ id: f.id, projectId: f.projectId, nome: f.nome }))}
        atividades={plano.atividades.map((a) => ({ id: a.id, projectId: a.projectId, faseId: a.faseId, nome: a.nome }))}
        apontamentos={lista.map((x) => ({ id: x.a.id, tipo: x.a.tipo, data: x.a.data, profissional: nomeProf(x), destino: destino(x), horas: Number(x.a.horas), custoHora: x.a.custoHora == null ? null : Number(x.a.custoHora), descricao: x.a.descricao }))}
        distribuicao={dist}
        alocacoes={alocacoes.filter((a) => ids.includes(a.projectId)).map((a) => ({ id: a.id, projeto: nomes.get(a.projectId) ?? "—", nome: a.fNome ?? a.sNome ?? "—", custoHora: a.custoHora == null ? null : Number(a.custoHora) }))}
        podeApontar={can(ctx.perms, "equipes", "criar")}
        podeExcluir={can(ctx.perms, "equipes", "excluir")}
        podeEditarBase={can(ctx.perms, "equipes", "editar")}
      />
    </>
  );
}

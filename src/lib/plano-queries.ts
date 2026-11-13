import "server-only";
import { and, asc, desc, eq, inArray, like, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { atrasado, desvioEmDias, progressoDaAtividade, progressoDaFase, consolidar, type Progresso } from "@/lib/plano-regras";
import { hojeMDY } from "@/lib/contrato-regras";
import { listarContratos, planejamentoDosProjetos } from "@/lib/contratos-queries";

/**
 * Planejamento de projetos — leituras do servidor, sempre pela empresa da
 * sessão. O financeiro é LIDO dos módulos que já existem (orçamento/previsão
 * pelo motor da DRE, contratos, despesas): nada é recalculado por fora.
 */

export async function carregarModelos(tenantId: string) {
  const [modelos, fases, atividades] = await Promise.all([
    db.select().from(schema.planoModelos).where(eq(schema.planoModelos.tenantId, tenantId)).orderBy(desc(schema.planoModelos.biblioteca), asc(schema.planoModelos.ordem)),
    db.select().from(schema.planoModeloFases).where(eq(schema.planoModeloFases.tenantId, tenantId)).orderBy(asc(schema.planoModeloFases.ordem)),
    db.select().from(schema.planoModeloAtividades).where(eq(schema.planoModeloAtividades.tenantId, tenantId)).orderBy(asc(schema.planoModeloAtividades.ordem)),
  ]);
  return modelos.map((m) => ({ ...m, fases: fases.filter((f) => f.modeloId === m.id).map((f) => ({ ...f, atividades: atividades.filter((a) => a.faseId === f.id) })) }));
}
export type ModeloCompleto = Awaited<ReturnType<typeof carregarModelos>>[number];

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function carregarPlano(tenantId: string, projectId: string, projectName: string, hoje = hojeMDY()) {
  const [fases, atividades, entregas, funcionarios, funcoes, contratosDoProjeto, docs, historico, despesas] = await Promise.all([
    db.select().from(schema.projetoFases).where(and(eq(schema.projetoFases.tenantId, tenantId), eq(schema.projetoFases.projectId, projectId))).orderBy(asc(schema.projetoFases.ordem)),
    db.select().from(schema.projetoAtividades).where(and(eq(schema.projetoAtividades.tenantId, tenantId), eq(schema.projetoAtividades.projectId, projectId))).orderBy(asc(schema.projetoAtividades.ordem)),
    db.select().from(schema.projetoEntregas).where(and(eq(schema.projetoEntregas.tenantId, tenantId), eq(schema.projetoEntregas.projectId, projectId))).orderBy(asc(schema.projetoEntregas.ordem)),
    db.select({ id: schema.funcionarios.id, nome: schema.funcionarios.nome }).from(schema.funcionarios).where(eq(schema.funcionarios.tenantId, tenantId)).orderBy(asc(schema.funcionarios.nome)),
    db.select({ id: schema.funcoesEquipe.id, nome: schema.funcoesEquipe.nome }).from(schema.funcoesEquipe).where(and(eq(schema.funcoesEquipe.tenantId, tenantId), eq(schema.funcoesEquipe.ativo, true))).orderBy(asc(schema.funcoesEquipe.ordem)),
    db
      .select({ id: schema.contratos.id, codigo: schema.contratos.codigo, titulo: schema.contratos.titulo })
      .from(schema.contratoProjetos)
      .innerJoin(schema.contratos, eq(schema.contratoProjetos.contratoId, schema.contratos.id))
      .where(and(eq(schema.contratoProjetos.tenantId, tenantId), eq(schema.contratoProjetos.projectId, projectId))),
    db
      .select({ id: schema.documents.id, filename: schema.documents.filename, storageKey: schema.documents.storageKey, faseId: schema.documents.projetoFaseId, atividadeId: schema.documents.projetoAtividadeId, entregaId: schema.documents.projetoEntregaId, uploadedAt: schema.documents.uploadedAt })
      .from(schema.documents)
      .where(and(eq(schema.documents.tenantId, tenantId), eq(schema.documents.projectId, projectId), sql`(${schema.documents.projetoFaseId} is not null or ${schema.documents.projetoAtividadeId} is not null or ${schema.documents.projetoEntregaId} is not null)`)),
    db
      .select({ id: schema.auditLog.id, action: schema.auditLog.action, entityId: schema.auditLog.entityId, meta: schema.auditLog.meta, createdAt: schema.auditLog.createdAt, nome: schema.users.name, email: schema.users.email })
      .from(schema.auditLog)
      .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
      .where(and(eq(schema.auditLog.tenantId, tenantId), like(schema.auditLog.action, "plano.%"), sql`${schema.auditLog.meta}->>'projectId' = ${projectId}`))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(300),
    db
      .select({ id: schema.despesas.id, numDoc: schema.despesas.numDoc, valor: schema.despesas.valor, competencia: schema.despesas.competencia, obs: schema.despesas.obs, faseId: schema.despesas.projetoFaseId, atividadeId: schema.despesas.projetoAtividadeId, fornecedor: schema.stakeholders.nome })
      .from(schema.despesas)
      .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
      .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
      .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.versions.projectId, projectId), eq(schema.versions.kind, "atual"))),
  ]);
  const contratoIds = contratosDoProjeto.map((c) => c.id);
  const [itens, aditivosDeEscopo] = await Promise.all([
    contratoIds.length ? db.select({ id: schema.contratoItens.id, contratoId: schema.contratoItens.contratoId, codigo: schema.contratoItens.codigo, descricao: schema.contratoItens.descricao }).from(schema.contratoItens).where(and(eq(schema.contratoItens.tenantId, tenantId), inArray(schema.contratoItens.contratoId, contratoIds), eq(schema.contratoItens.cancelado, false))) : Promise.resolve([]),
    contratoIds.length
      ? db.select({ id: schema.contratoAditivos.id, contratoId: schema.contratoAditivos.contratoId, codigo: schema.contratoAditivos.codigo, tipos: schema.contratoAditivos.tipos, descricao: schema.contratoAditivos.descricao, dataAssinatura: schema.contratoAditivos.dataAssinatura, status: schema.contratoAditivos.status }).from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.tenantId, tenantId), inArray(schema.contratoAditivos.contratoId, contratoIds), eq(schema.contratoAditivos.status, "assinado")))
      : Promise.resolve([]),
  ]);

  // Progresso físico (sem inventar: sem base, fica nulo e diz o motivo).
  const progAtividade = new Map<string, Progresso>();
  for (const a of atividades) progAtividade.set(a.id, progressoDaAtividade(a, atividades.filter((s) => s.parentId === a.id)));
  const fasesComp = fases.map((f) => {
    const daFase = atividades.filter((a) => a.faseId === f.id);
    const prog = progressoDaFase(f, daFase);
    return {
      ...f,
      progresso: prog,
      atrasada: atrasado(f, hoje),
      desvioDias: desvioEmDias(f.terminoOriginal, f.terminoPrevisto),
      horasPrevistas: r2(daFase.reduce((s, a) => s + Number(a.horasPrevistas ?? 0), 0)),
      horasRealizadas: r2(daFase.reduce((s, a) => s + Number(a.horasRealizadas ?? 0), 0)),
      custo: r2(despesas.filter((d) => d.faseId === f.id).reduce((s, d) => s + Number(d.valor), 0)),
    };
  });
  const atividadesComp = atividades.map((a) => ({
    ...a,
    progresso: progAtividade.get(a.id)!,
    atrasada: atrasado(a, hoje),
    desvioDias: desvioEmDias(a.terminoOriginal, a.terminoPrevisto),
    custo: r2(despesas.filter((d) => d.atividadeId === a.id).reduce((s, d) => s + Number(d.valor), 0)),
  }));
  const progressoProjeto = consolidar(fasesComp.map((f) => ({ id: f.id, status: f.status, percentual: f.progresso.percentual, peso: f.peso })));

  // Financeiro existente: orçamento/previsão/realizado (motor da DRE) e contratos.
  const [planejamento] = await planejamentoDosProjetos(tenantId, [{ projectId, nome: projectName }]);
  const linhas = (await listarContratos(tenantId, hoje)).filter((l) => l.projetos.some((p) => p.id === projectId) && l.status !== "cancelado");
  // Sem dupla contagem: derivado que consome o limite de um principal também vinculado não soma de novo.
  const codigos = new Set(linhas.map((l) => l.codigo));
  const contaveis = linhas.filter((l) => !(l.tipo !== "contrato" && l.principal && codigos.has(l.principal)));
  const soma = (f: (l: (typeof linhas)[number]) => number) => r2(contaveis.reduce((s, l) => s + f(l), 0));
  const contratos = {
    lista: linhas.map((l) => ({ id: l.id, codigo: l.codigo, titulo: l.titulo, atualizado: l.saldo.atualizado, medido: l.saldo.medidoAprovado, faturado: l.saldo.faturado, recebido: l.saldo.recebido })),
    valor: soma((l) => l.saldo.atualizado),
    medido: soma((l) => l.saldo.medidoAprovado),
    faturado: soma((l) => l.saldo.faturado),
    recebido: soma((l) => l.saldo.recebido),
  };
  const custoTotal = r2(despesas.reduce((s, d) => s + Number(d.valor), 0));
  const custoTransversal = r2(despesas.filter((d) => !d.faseId && !d.atividadeId).reduce((s, d) => s + Number(d.valor), 0));

  const contagem = {
    fases: fases.length,
    atividades: atividades.filter((a) => !a.parentId).length,
    subatividades: atividades.filter((a) => a.parentId).length,
    entregas: entregas.length,
    atrasadas: fasesComp.filter((f) => f.atrasada).length + atividadesComp.filter((a) => a.atrasada).length,
    entregasAtrasadas: entregas.filter((e) => !["entregue", "aceita", "cancelada"].includes(e.status) && atrasado({ terminoPrevisto: e.dataPrevista, terminoReal: e.dataEfetiva, status: e.status }, hoje)).length,
  };

  return {
    fases: fasesComp,
    atividades: atividadesComp,
    entregas: entregas.map((e) => ({ ...e, atrasada: !["entregue", "aceita", "cancelada"].includes(e.status) && atrasado({ terminoPrevisto: e.dataPrevista, terminoReal: e.dataEfetiva, status: e.status }, hoje), desvioDias: desvioEmDias(e.dataOriginal, e.dataPrevista) })),
    progressoProjeto,
    contagem,
    funcionarios,
    funcoes,
    contratos: { ...contratos, opcoes: contratosDoProjeto, itens },
    aditivosDeEscopo: aditivosDeEscopo.filter((a) => (a.tipos ?? []).some((t) => ["alteracao_escopo", "inclusao_servicos", "exclusao_servicos"].includes(t))),
    planejamento,
    custos: { total: custoTotal, transversal: custoTransversal, despesas },
    documentos: docs,
    historico,
  };
}
export type PlanoCompleto = Awaited<ReturnType<typeof carregarPlano>>;

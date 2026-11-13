import "server-only";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { versionInputsByMonth } from "@/lib/dre-inputs";
import { aggregateInputs, type Inputs } from "@/lib/calc/dre-cascata";
import { chaveLigada } from "@/lib/chaves-tenant";
import {
  consolidarGuardaChuva,
  evolucaoDoContrato,
  hojeMDY,
  limitesDosItens,
  saldoDoContrato,
  valorDoContrato,
  venceEm,
  type SaldoDoContrato,
} from "@/lib/contrato-regras";

/**
 * Contratos — leituras do servidor. Sempre por `tenantId` (o da sessão): um
 * id de outra empresa simplesmente não é encontrado. Saldo e indicadores saem
 * de `contrato-regras.ts`; faturado e recebido, das contas a receber do
 * contrato e dos recebimentos não estornados (o mesmo registro que a DRE e o
 * Fluxo leem).
 */

type Contrato = typeof schema.contratos.$inferSelect;

export interface FaturaDoContrato {
  id: string;
  projectId: string;
  descricao: string | null;
  valor: number;
  vencimento: string | null;
  status: string;
  cancelado: boolean;
  recebido: number;
  createdAt: Date;
}

/** Leitura em lote de tudo o que entra no saldo de um conjunto de contratos. */
async function baseFinanceira(tenantId: string, ids: string[]) {
  if (!ids.length) return { aditivos: [], medicoes: [], faturas: [] as FaturaDoContrato[] & { contratoId?: string }[], projetos: [] };
  const [aditivos, medicoes, contas, projetos] = await Promise.all([
    db.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.tenantId, tenantId), inArray(schema.contratoAditivos.contratoId, ids))),
    db.select().from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.tenantId, tenantId), inArray(schema.contratoMedicoes.contratoId, ids))),
    db.select().from(schema.contasReceber).where(and(eq(schema.contasReceber.tenantId, tenantId), inArray(schema.contasReceber.contratoId, ids))),
    db
      .select({ contratoId: schema.contratoProjetos.contratoId, projectId: schema.contratoProjetos.projectId, valorAlocado: schema.contratoProjetos.valorAlocado, nome: schema.projects.name })
      .from(schema.contratoProjetos)
      .innerJoin(schema.projects, eq(schema.contratoProjetos.projectId, schema.projects.id))
      .where(and(eq(schema.contratoProjetos.tenantId, tenantId), inArray(schema.contratoProjetos.contratoId, ids))),
  ]);
  const recs = contas.length
    ? await db
        .select({ contaReceberId: schema.contaReceberRecebimentos.contaReceberId, valor: schema.contaReceberRecebimentos.valor })
        .from(schema.contaReceberRecebimentos)
        .where(and(eq(schema.contaReceberRecebimentos.tenantId, tenantId), eq(schema.contaReceberRecebimentos.estornado, false), inArray(schema.contaReceberRecebimentos.contaReceberId, contas.map((c) => c.id))))
    : [];
  const recebidoPorConta = new Map<string, number>();
  for (const r of recs) recebidoPorConta.set(r.contaReceberId, (recebidoPorConta.get(r.contaReceberId) ?? 0) + Number(r.valor));
  const faturas = contas.map((c) => ({
    id: c.id,
    contratoId: c.contratoId!,
    projectId: c.projectId,
    descricao: c.descricao,
    valor: Number(c.valor),
    vencimento: c.vencimento,
    status: c.status,
    cancelado: c.cancelado,
    recebido: Math.round((recebidoPorConta.get(c.id) ?? 0) * 100) / 100,
    createdAt: c.createdAt,
  }));
  return { aditivos, medicoes, faturas, projetos };
}

function saldoDe(c: Contrato, base: Awaited<ReturnType<typeof baseFinanceira>>, todos: readonly Contrato[], hoje: string): SaldoDoContrato {
  const derivados = todos.filter((d) => d.contratoPrincipalId === c.id && d.vinculoValor === "consome_limite" && d.status !== "cancelado");
  return saldoDoContrato({
    contrato: c,
    aditivos: base.aditivos.filter((a) => a.contratoId === c.id),
    medicoes: base.medicoes.filter((m) => m.contratoId === c.id),
    faturas: base.faturas.filter((f) => (f as { contratoId?: string }).contratoId === c.id),
    derivadosQueConsomem: derivados.map((d) => ({ valorAtualizado: valorDoContrato(d, base.aditivos.filter((a) => a.contratoId === d.id), hoje).atualizado })),
    alocacoes: base.projetos.filter((p) => p.contratoId === c.id),
    hoje,
  });
}

export interface LinhaDeContrato {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  status: string;
  cliente: string | null;
  clienteId: string | null;
  modalidade: string | null;
  modalidadeId: string | null;
  gestor: string | null;
  principal: string | null;
  /** `valorAlocado`: a parte do contrato prevista para o projeto (nula = não informada). */
  projetos: { id: string; nome: string; valorAlocado: number | null }[];
  dataInicio: string | null;
  termino: string | null;
  saldo: SaldoDoContrato;
}

/** Todos os contratos da empresa, com o saldo de cada um. */
export async function listarContratos(tenantId: string, hoje = hojeMDY()): Promise<LinhaDeContrato[]> {
  const contratos = await db.select().from(schema.contratos).where(eq(schema.contratos.tenantId, tenantId)).orderBy(desc(schema.contratos.createdAt));
  const ids = contratos.map((c) => c.id);
  const [base, clientes, modalidades] = await Promise.all([
    baseFinanceira(tenantId, ids),
    db.select({ id: schema.clientes.id, nome: schema.clientes.nomeCompleto }).from(schema.clientes).where(eq(schema.clientes.tenantId, tenantId)),
    db.select().from(schema.contratoModalidades).where(eq(schema.contratoModalidades.tenantId, tenantId)),
  ]);
  const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]));
  const nomeModalidade = new Map(modalidades.map((m) => [m.id, m.nome]));
  const codigo = new Map(contratos.map((c) => [c.id, c.codigo]));
  return contratos.map((c) => {
    const saldo = saldoDe(c, base, contratos, hoje);
    return {
      id: c.id,
      codigo: c.codigo,
      titulo: c.titulo,
      tipo: c.tipo,
      status: c.status,
      cliente: c.clienteId ? nomeCliente.get(c.clienteId) ?? null : null,
      clienteId: c.clienteId,
      modalidade: c.modalidadeId ? nomeModalidade.get(c.modalidadeId) ?? null : null,
      modalidadeId: c.modalidadeId,
      gestor: c.gestor,
      principal: c.contratoPrincipalId ? codigo.get(c.contratoPrincipalId) ?? null : null,
      projetos: base.projetos.filter((p) => p.contratoId === c.id).map((p) => ({ id: p.projectId, nome: p.nome, valorAlocado: p.valorAlocado == null ? null : Number(p.valorAlocado) })),
      dataInicio: c.dataInicio,
      termino: saldo.terminoAtualizado,
      saldo,
    };
  });
}

/** Tudo o que a página do contrato mostra, em uma leitura. Null se não for da empresa. */
export async function detalheDoContrato(tenantId: string, id: string, hoje = hojeMDY()) {
  const [contrato] = await db.select().from(schema.contratos).where(and(eq(schema.contratos.id, id), eq(schema.contratos.tenantId, tenantId))).limit(1);
  if (!contrato) return null;
  const familia = await db
    .select()
    .from(schema.contratos)
    .where(and(eq(schema.contratos.tenantId, tenantId), or(eq(schema.contratos.contratoPrincipalId, contrato.id), contrato.contratoPrincipalId ? eq(schema.contratos.id, contrato.contratoPrincipalId) : eq(schema.contratos.id, contrato.id))));
  const todos = [contrato, ...familia.filter((f) => f.id !== contrato.id)];
  const base = await baseFinanceira(tenantId, todos.map((c) => c.id));
  const [itens, marcos, cliente, modalidade, despesas, reembolsos, documentos] = await Promise.all([
    db.select().from(schema.contratoItens).where(and(eq(schema.contratoItens.tenantId, tenantId), eq(schema.contratoItens.contratoId, id))).orderBy(schema.contratoItens.ordem),
    db.select().from(schema.contratoMarcos).where(and(eq(schema.contratoMarcos.tenantId, tenantId), eq(schema.contratoMarcos.contratoId, id))).orderBy(schema.contratoMarcos.ordem),
    contrato.clienteId ? db.select({ id: schema.clientes.id, nome: schema.clientes.nomeCompleto }).from(schema.clientes).where(and(eq(schema.clientes.id, contrato.clienteId), eq(schema.clientes.tenantId, tenantId))).limit(1) : Promise.resolve([]),
    contrato.modalidadeId ? db.select().from(schema.contratoModalidades).where(and(eq(schema.contratoModalidades.id, contrato.modalidadeId), eq(schema.contratoModalidades.tenantId, tenantId))).limit(1) : Promise.resolve([]),
    db
      .select({
        id: schema.despesas.id,
        numDoc: schema.despesas.numDoc,
        valor: schema.despesas.valor,
        competencia: schema.despesas.competencia,
        contaCef: schema.despesas.contaCef,
        categoriaDre: schema.despesas.categoriaDre,
        status: schema.despesas.status,
        obs: schema.despesas.obs,
        projectId: schema.versions.projectId,
        fornecedor: schema.stakeholders.nome,
      })
      .from(schema.despesas)
      .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
      .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
      .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.despesas.contratoId, id))),
    db.select().from(schema.contratoReembolsos).where(and(eq(schema.contratoReembolsos.tenantId, tenantId), eq(schema.contratoReembolsos.contratoId, id))),
    db.select().from(schema.documents).where(and(eq(schema.documents.tenantId, tenantId), eq(schema.documents.contratoId, id))).orderBy(desc(schema.documents.uploadedAt)),
  ]);
  const aditivos = base.aditivos.filter((a) => a.contratoId === id).sort((a, b) => a.numero - b.numero);
  const variacoes = aditivos.length
    ? await db.select().from(schema.contratoAditivoItens).where(and(eq(schema.contratoAditivoItens.tenantId, tenantId), inArray(schema.contratoAditivoItens.aditivoId, aditivos.map((a) => a.id))))
    : [];
  const medicoes = base.medicoes.filter((m) => m.contratoId === id).sort((a, b) => +b.createdAt - +a.createdAt);
  const faturas = base.faturas.filter((f) => (f as { contratoId?: string }).contratoId === id);
  const saldo = saldoDe(contrato, base, todos, hoje);
  const limites = limitesDosItens(itens, variacoes, aditivos, hoje);
  const itensComSaldo = itens.map((i) => {
    const l = limites.get(i.id)!;
    const medido = medicoes.filter((m) => m.itemId === i.id && m.status === "aprovada").reduce((s, m) => s + Number(m.valor), 0);
    return { ...i, limite: l.limite, quantidadeVigente: l.quantidade, vigente: l.vigente, medido: Math.round(medido * 100) / 100, saldo: Math.round((l.limite - medido) * 100) / 100 };
  });
  const marcosComValores = marcos.map((m) => ({
    ...m,
    medido: Math.round(medicoes.filter((x) => x.marcoId === m.id && x.status === "aprovada").reduce((s, x) => s + Number(x.valor), 0) * 100) / 100,
  }));
  const derivados = familia
    .filter((f) => f.contratoPrincipalId === contrato.id)
    .map((d) => ({ id: d.id, codigo: d.codigo, titulo: d.titulo, tipo: d.tipo, vinculo: d.vinculoValor, status: d.status, saldo: saldoDe(d, base, todos, hoje) }));
  const principal = contrato.contratoPrincipalId ? familia.find((f) => f.id === contrato.contratoPrincipalId) ?? null : null;
  const consolidado = derivados.length ? consolidarGuardaChuva(saldo, derivados.map((d) => ({ vinculo: d.vinculo, saldo: d.saldo }))) : null;

  // Despesas reembolsáveis: os dados da despesa vêm dela (sem duplicar).
  const despesaIds = [...new Set([...reembolsos.map((r) => r.despesaId)])];
  const despesasDosReembolsos = despesaIds.length
    ? await db
        .select({ id: schema.despesas.id, numDoc: schema.despesas.numDoc, valor: schema.despesas.valor, competencia: schema.despesas.competencia, contaCef: schema.despesas.contaCef, obs: schema.despesas.obs, fornecedor: schema.stakeholders.nome, dataEmissao: schema.despesas.dataEmissao })
        .from(schema.despesas)
        .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
        .where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.id, despesaIds)))
    : [];
  const despesaPorId = new Map(despesasDosReembolsos.map((d) => [d.id, d]));
  const docsPorDespesa = despesaIds.length
    ? await db.select({ despesaId: schema.documents.despesaId, n: schema.documents.id }).from(schema.documents).where(and(eq(schema.documents.tenantId, tenantId), inArray(schema.documents.despesaId, despesaIds)))
    : [];

  // Histórico: auditoria do contrato e de tudo que é dele.
  const entidades = [id, ...aditivos.map((a) => a.id), ...itens.map((i) => i.id), ...medicoes.map((m) => m.id), ...marcos.map((m) => m.id), ...reembolsos.map((r) => r.id), ...faturas.map((f) => f.id)];
  const historico = await db
    .select({ id: schema.auditLog.id, action: schema.auditLog.action, entity: schema.auditLog.entity, entityId: schema.auditLog.entityId, meta: schema.auditLog.meta, createdAt: schema.auditLog.createdAt, email: schema.users.email, nome: schema.users.name })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id))
    .where(and(eq(schema.auditLog.tenantId, tenantId), inArray(schema.auditLog.entityId, entidades)))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(300);

  const custoRealizado = Math.round(despesas.reduce((s, d) => s + Number(d.valor), 0) * 100) / 100;
  return {
    contrato,
    cliente: cliente[0] ?? null,
    modalidade: modalidade[0] ?? null,
    principal: principal ? { id: principal.id, codigo: principal.codigo, titulo: principal.titulo } : null,
    derivados,
    consolidado,
    projetos: base.projetos.filter((p) => p.contratoId === id),
    itens: itensComSaldo,
    variacoes,
    aditivos,
    evolucao: evolucaoDoContrato(contrato, aditivos, hoje),
    marcos: marcosComValores,
    medicoes,
    faturas,
    despesas,
    reembolsos: reembolsos.map((r) => ({ ...r, despesa: despesaPorId.get(r.despesaId) ?? null, comprovantes: docsPorDespesa.filter((d) => d.despesaId === r.despesaId).length })),
    documentos,
    historico,
    saldo,
    resultado: {
      custoRealizado,
      /** margem sobre o medido aprovado (gerencial; não é DRE). */
      margemSobreMedido: Math.round((saldo.medidoAprovado - custoRealizado) * 100) / 100,
      margemSobreFaturado: Math.round((saldo.faturado - custoRealizado) * 100) / 100,
    },
  };
}
export type DetalheDoContrato = NonNullable<Awaited<ReturnType<typeof detalheDoContrato>>>;

/** Indicadores do painel: totais, pendências, vencimentos e rentabilidade por cliente. */
export async function painelDeContratos(tenantId: string, hoje = hojeMDY()) {
  const linhas = await listarContratos(tenantId, hoje);
  const ids = linhas.map((l) => l.id);
  const [pendentesMedicao, pendentesAditivo, custos] = await Promise.all([
    ids.length ? db.select().from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.tenantId, tenantId), inArray(schema.contratoMedicoes.status, ["enviada", "em_analise"]))) : Promise.resolve([]),
    ids.length ? db.select().from(schema.contratoAditivos).where(and(eq(schema.contratoAditivos.tenantId, tenantId), inArray(schema.contratoAditivos.status, ["aguardando_aprovacao", "aprovado"]))) : Promise.resolve([]),
    ids.length ? db.select({ contratoId: schema.despesas.contratoId, valor: schema.despesas.valor }).from(schema.despesas).where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.contratoId, ids))) : Promise.resolve([]),
  ]);
  const custoPorContrato = new Map<string, number>();
  for (const c of custos) if (c.contratoId) custoPorContrato.set(c.contratoId, (custoPorContrato.get(c.contratoId) ?? 0) + Number(c.valor));
  // Total contratado sem dupla contagem: derivado que consome o limite já está no principal.
  const consomem = new Set(linhas.filter((l) => l.tipo !== "contrato" && l.principal).map((l) => l.id));
  const vinculo = new Map<string, string | null>();
  for (const l of linhas) vinculo.set(l.id, null);
  const contratos = await db.select({ id: schema.contratos.id, vinculo: schema.contratos.vinculoValor }).from(schema.contratos).where(eq(schema.contratos.tenantId, tenantId));
  for (const c of contratos) vinculo.set(c.id, c.vinculo);
  const vivas = linhas.filter((l) => l.status !== "cancelado" && l.status !== "rascunho");
  const somaSemDupla = (f: (l: LinhaDeContrato) => number) => Math.round(vivas.filter((l) => !(consomem.has(l.id) && vinculo.get(l.id) === "consome_limite")).reduce((s, l) => s + f(l), 0) * 100) / 100;
  const soma = (f: (l: LinhaDeContrato) => number) => Math.round(vivas.reduce((s, l) => s + f(l), 0) * 100) / 100;
  const porContrato = vivas.map((l) => {
    const custo = Math.round((custoPorContrato.get(l.id) ?? 0) * 100) / 100;
    return { id: l.id, codigo: l.codigo, titulo: l.titulo, cliente: l.cliente, medido: l.saldo.medidoAprovado, faturado: l.saldo.faturado, custo, margem: Math.round((l.saldo.medidoAprovado - custo) * 100) / 100, margemPct: l.saldo.medidoAprovado > 0 ? Math.round(((l.saldo.medidoAprovado - custo) / l.saldo.medidoAprovado) * 10000) / 100 : null };
  });
  const porCliente = new Map<string, { cliente: string; contratos: number; medido: number; faturado: number; custo: number }>();
  for (const c of porContrato) {
    const k = c.cliente ?? "Sem cliente";
    const g = porCliente.get(k) ?? { cliente: k, contratos: 0, medido: 0, faturado: 0, custo: 0 };
    g.contratos += 1;
    g.medido += c.medido;
    g.faturado += c.faturado;
    g.custo += c.custo;
    porCliente.set(k, g);
  }
  return {
    ativos: linhas.filter((l) => l.status === "ativo").length,
    contratado: somaSemDupla((l) => l.saldo.atualizado),
    disponivelParaMedicao: somaSemDupla((l) => Math.max(0, l.saldo.saldoAMedir)),
    medido: soma((l) => l.saldo.medidoAprovado),
    faturado: soma((l) => l.saldo.faturado),
    aReceber: soma((l) => l.saldo.faturadoNaoRecebido),
    medidoNaoFaturado: soma((l) => l.saldo.medidoNaoFaturado),
    medicoesPendentes: pendentesMedicao.length,
    valorMedicoesPendentes: Math.round(pendentesMedicao.reduce((s, m) => s + Number(m.valor), 0) * 100) / 100,
    aditivosPendentes: pendentesAditivo.length,
    vencendo: linhas.filter((l) => (l.status === "ativo" || l.status === "suspenso") && venceEm(l.termino, hoje, 60)).map((l) => ({ id: l.id, codigo: l.codigo, titulo: l.titulo, termino: l.termino })),
    porContrato: porContrato.sort((a, b) => b.medido - a.medido),
    porCliente: [...porCliente.values()].map((g) => ({ ...g, margem: Math.round((g.medido - g.custo) * 100) / 100 })).sort((a, b) => b.medido - a.medido),
    linhas,
  };
}

/** Aditivos de todos os contratos (listagem consolidada). */
export async function listarAditivos(tenantId: string) {
  return db
    .select({ a: schema.contratoAditivos, codigoContrato: schema.contratos.codigo, tituloContrato: schema.contratos.titulo })
    .from(schema.contratoAditivos)
    .innerJoin(schema.contratos, eq(schema.contratoAditivos.contratoId, schema.contratos.id))
    .where(and(eq(schema.contratoAditivos.tenantId, tenantId), eq(schema.contratos.tenantId, tenantId)))
    .orderBy(desc(schema.contratoAditivos.createdAt));
}

/** Medições de todos os contratos (listagem consolidada). */
export async function listarMedicoes(tenantId: string) {
  return db
    .select({ m: schema.contratoMedicoes, codigoContrato: schema.contratos.codigo, tituloContrato: schema.contratos.titulo, item: schema.contratoItens.codigo, itemDescricao: schema.contratoItens.descricao, projeto: schema.projects.name })
    .from(schema.contratoMedicoes)
    .innerJoin(schema.contratos, eq(schema.contratoMedicoes.contratoId, schema.contratos.id))
    .leftJoin(schema.contratoItens, eq(schema.contratoMedicoes.itemId, schema.contratoItens.id))
    .leftJoin(schema.projects, eq(schema.contratoMedicoes.projectId, schema.projects.id))
    .where(and(eq(schema.contratoMedicoes.tenantId, tenantId), eq(schema.contratos.tenantId, tenantId)))
    .orderBy(desc(schema.contratoMedicoes.createdAt));
}

/** Linhas do relatório de reembolsos, por contrato e período (competência da despesa). */
export async function relatorioDeReembolsos(tenantId: string, filtro: { contratoId?: string | null; de?: string | null; ate?: string | null } = {}) {
  const linhas = await db
    .select({
      r: schema.contratoReembolsos,
      codigoContrato: schema.contratos.codigo,
      tituloContrato: schema.contratos.titulo,
      numDoc: schema.despesas.numDoc,
      competencia: schema.despesas.competencia,
      dataEmissao: schema.despesas.dataEmissao,
      valorDespesa: schema.despesas.valor,
      contaCef: schema.despesas.contaCef,
      categoriaDre: schema.despesas.categoriaDre,
      descricao: schema.despesas.obs,
      fornecedor: schema.stakeholders.nome,
      recebidoConta: schema.contasReceber.valorRecebido,
      statusConta: schema.contasReceber.status,
    })
    .from(schema.contratoReembolsos)
    .innerJoin(schema.contratos, eq(schema.contratoReembolsos.contratoId, schema.contratos.id))
    .innerJoin(schema.despesas, eq(schema.contratoReembolsos.despesaId, schema.despesas.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .leftJoin(schema.contasReceber, eq(schema.contratoReembolsos.contaReceberId, schema.contasReceber.id))
    .where(and(eq(schema.contratoReembolsos.tenantId, tenantId), eq(schema.contratos.tenantId, tenantId), eq(schema.contratoReembolsos.cancelado, false), ...(filtro.contratoId ? [eq(schema.contratoReembolsos.contratoId, filtro.contratoId)] : [])))
    .orderBy(schema.contratos.codigo, schema.despesas.competencia);
  const ym = (s: string | null | undefined) => {
    const m = s ? /^(\d{2})\/(\d{4})$/.exec(s) : null;
    return m ? Number(m[2]) * 100 + Number(m[1]) : null;
  };
  const de = ym(filtro.de);
  const ate = ym(filtro.ate);
  const docs = linhas.length
    ? await db.select({ despesaId: schema.documents.despesaId, filename: schema.documents.filename }).from(schema.documents).where(and(eq(schema.documents.tenantId, tenantId), inArray(schema.documents.despesaId, linhas.map((l) => l.r.despesaId))))
    : [];
  return linhas
    .filter((l) => {
      const v = ym(l.competencia);
      return (de == null || (v != null && v >= de)) && (ate == null || (v != null && v <= ate));
    })
    .map((l) => {
      const solicitado = Number(l.r.valorSolicitado);
      const aprovado = l.r.valorAprovado == null ? null : Number(l.r.valorAprovado);
      const recebido = l.r.status === "recebido" ? aprovado ?? solicitado : 0;
      return {
        id: l.r.id,
        contrato: l.codigoContrato,
        tituloContrato: l.tituloContrato,
        numDoc: l.numDoc,
        competencia: l.competencia,
        data: l.dataEmissao,
        descricao: l.descricao,
        fornecedor: l.fornecedor,
        categoria: l.categoriaDre,
        conta: l.contaCef,
        status: l.r.status,
        solicitado,
        aprovado,
        recebido,
        pendente: Math.round(((l.r.status === "rejeitado" ? 0 : aprovado ?? solicitado) - recebido) * 100) / 100,
        comprovantes: docs.filter((d) => d.despesaId === l.r.despesaId).map((d) => d.filename),
      };
    });
}

/** Despesas dos projetos do contrato ainda não apropriadas a contrato algum (para apropriar ou marcar reembolso). */
export async function despesasCandidatas(tenantId: string, contratoId: string) {
  const projetos = await db.select({ projectId: schema.contratoProjetos.projectId }).from(schema.contratoProjetos).where(and(eq(schema.contratoProjetos.tenantId, tenantId), eq(schema.contratoProjetos.contratoId, contratoId)));
  if (!projetos.length) return [];
  return db
    .select({ id: schema.despesas.id, numDoc: schema.despesas.numDoc, valor: schema.despesas.valor, competencia: schema.despesas.competencia, contaCef: schema.despesas.contaCef, obs: schema.despesas.obs, contratoId: schema.despesas.contratoId, fornecedor: schema.stakeholders.nome, projeto: schema.projects.name })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
    .leftJoin(schema.stakeholders, eq(schema.despesas.fornecedorId, schema.stakeholders.id))
    .where(and(eq(schema.despesas.tenantId, tenantId), eq(schema.versions.kind, "atual"), inArray(schema.versions.projectId, projetos.map((p) => p.projectId))))
    .orderBy(desc(schema.despesas.competencia))
    .limit(500);
}

// ───────────────────── Orçamento × Previsão × Realizado ─────────────────────


const CATEGORIAS_DE_CUSTO = ["Custo Fixo", "Despesa Variável", "Despesa Fixa", "Despesas Financeiras"];
export interface ResultadoDaVersao {
  receita: number;
  custos: number;
  margem: number;
}
function resumoDosInputs(i: Inputs | null): ResultadoDaVersao | null {
  if (!i) return null;
  const custos = i.custoVar + CATEGORIAS_DE_CUSTO.reduce((s, c) => s + (i.byCat[c] ?? 0), 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { receita: r2(i.receita), custos: r2(custos), margem: r2(i.receita - custos) };
}

/**
 * Orçamento (versão budget padrão), Previsão (forecast) e Realizado (Atual)
 * de cada projeto do contrato — pelo MESMO motor e as mesmas chaves da DRE
 * (`versionInputsByMonth`). É leitura por PROJETO: o planejamento do sistema
 * é por projeto; o contrato não tem orçamento próprio (ver pendências).
 */
export async function planejamentoDosProjetos(tenantId: string, projetos: readonly { projectId: string; nome: string }[]) {
  const definicaoNova = await chaveLigada(tenantId, "dre_definicao_nova");
  return Promise.all(
    projetos.map(async (p) => {
      const versoes = await db
        .select({ id: schema.versions.id, kind: schema.versions.kind, isDefault: schema.versions.isDefault })
        .from(schema.versions)
        .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.projectId, p.projectId)))
        .orderBy(schema.versions.createdAt);
      const escolher = (kind: string) => {
        const vs = versoes.filter((v) => v.kind === kind);
        return vs.find((v) => v.isDefault) ?? vs[0] ?? null;
      };
      const ler = async (v: { id: string } | null) => {
        if (!v) return null;
        const porMes = await versionInputsByMonth(tenantId, v.id, p.projectId, { definicaoNova });
        return Object.keys(porMes).length ? resumoDosInputs(aggregateInputs(porMes, null)) : null;
      };
      const [orcamento, previsao, realizado] = await Promise.all([ler(escolher("budget")), ler(escolher("forecast")), ler(escolher("atual"))]);
      return { projectId: p.projectId, nome: p.nome, orcamento, previsao, realizado };
    }),
  );
}

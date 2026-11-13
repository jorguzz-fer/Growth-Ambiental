import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { listarContratos } from "@/lib/contratos-queries";
import { STATUS_FORA_DO_CONTRATADO, fatorDoContrato } from "@/lib/valor-contratado";
import { hojeMDY } from "@/lib/contrato-regras";
import { mesOrdenavel } from "@/lib/receita-servicos";
import type { Fato } from "@/lib/relatorio-gerencial";

/**
 * Os FATOS do relatório gerencial, da empresa e só dos projetos que a pessoa
 * vê. Cada um é um registro real, uma vez:
 *  · posição do contrato (contratado, aditivos, saldo a medir) — dividida
 *    entre os projetos do contrato pela regra do valor contratado;
 *  · medição aprovada (competência da medição);
 *  · fatura do contrato (mês do vencimento): faturado, receita reconhecida
 *    (vencimento até hoje — regra atual), recebido e a receber;
 *  · despesa apropriada ao contrato (competência): custo apropriado;
 *  · reembolso (competência da despesa): solicitado e pendente;
 *  · apontamento de horas (competência), quando `incluirHoras`.
 */
export async function fatosGerenciais(tenantId: string, projetos: readonly { id: string; name: string }[], opts: { incluirHoras: boolean }): Promise<Fato[]> {
  const visiveis = new Set(projetos.map((p) => p.id));
  const nomeProjeto = new Map(projetos.map((p) => [p.id, p.name]));
  const contratos = (await listarContratos(tenantId)).filter((c) => !STATUS_FORA_DO_CONTRATADO.has(c.status) && c.projetos.some((p) => visiveis.has(p.id)));
  const porId = new Map(contratos.map((c) => [c.id, c]));
  const ids = contratos.map((c) => c.id);
  const fatos: Fato[] = [];
  const base = (c: (typeof contratos)[number], projectId: string | null) => ({
    cliente: c.cliente,
    contrato: `${c.codigo} · ${c.titulo}`,
    modalidade: c.modalidade,
    projeto: projectId ? nomeProjeto.get(projectId) ?? null : null,
  });
  // posição do contrato, por projeto visível
  for (const c of contratos)
    for (const p of c.projetos.filter((x) => visiveis.has(x.id))) {
      const k = fatorDoContrato(c, new Set([p.id]));
      if (k <= 0) continue;
      fatos.push({ atributos: base(c, p.id), mes: null, valores: { contratado: c.saldo.atualizado * k, aditivos: (c.saldo.acrescimos - c.saldo.reducoes) * k, saldoAMedir: Math.max(0, c.saldo.saldoAMedir) * k } });
    }
  if (ids.length) {
    const [medicoes, faturas, despesas, fases] = await Promise.all([
      db.select().from(schema.contratoMedicoes).where(and(eq(schema.contratoMedicoes.tenantId, tenantId), inArray(schema.contratoMedicoes.contratoId, ids), eq(schema.contratoMedicoes.status, "aprovada"))),
      db.select().from(schema.contasReceber).where(and(eq(schema.contasReceber.tenantId, tenantId), inArray(schema.contasReceber.contratoId, ids), eq(schema.contasReceber.cancelado, false))),
      db
        .select({ contratoId: schema.despesas.contratoId, valor: schema.despesas.valor, competencia: schema.despesas.competencia, conta: schema.despesas.contaCef, projectId: schema.versions.projectId })
        .from(schema.despesas)
        .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
        .where(and(eq(schema.despesas.tenantId, tenantId), inArray(schema.despesas.contratoId, ids), eq(schema.despesas.cancelado, false))),
      db.select({ id: schema.projetoFases.id, nome: schema.projetoFases.nome }).from(schema.projetoFases).where(eq(schema.projetoFases.tenantId, tenantId)),
    ]);
    const nomeFase = new Map(fases.map((f) => [f.id, f.nome]));
    const recs = faturas.length
      ? await db
          .select({ contaReceberId: schema.contaReceberRecebimentos.contaReceberId, valor: schema.contaReceberRecebimentos.valor })
          .from(schema.contaReceberRecebimentos)
          .where(and(eq(schema.contaReceberRecebimentos.tenantId, tenantId), eq(schema.contaReceberRecebimentos.estornado, false), inArray(schema.contaReceberRecebimentos.contaReceberId, faturas.map((f) => f.id))))
      : [];
    const recebidoPor = new Map<string, number>();
    for (const r of recs) recebidoPor.set(r.contaReceberId, (recebidoPor.get(r.contaReceberId) ?? 0) + Number(r.valor));
    const limite = mesOrdenavel(hojeMDY())!;
    for (const m of medicoes) {
      const c = porId.get(m.contratoId)!;
      const proj = m.projectId ?? c.projetos[0]?.id ?? null;
      if (proj && !visiveis.has(proj)) continue;
      fatos.push({ atributos: { ...base(c, proj), competencia: m.competencia, fase: m.projetoFaseId ? nomeFase.get(m.projetoFaseId) ?? null : null }, mes: mesOrdenavel(m.competencia), valores: { medido: Number(m.valor) } });
    }
    for (const f of faturas) {
      if (!visiveis.has(f.projectId)) continue;
      const c = porId.get(f.contratoId!)!;
      const mes = mesOrdenavel(f.vencimento);
      const valor = Number(f.valor);
      const recebido = recebidoPor.get(f.id) ?? 0;
      fatos.push({
        atributos: { ...base(c, f.projectId), competencia: mes ? `${String(mes % 100).padStart(2, "0")}/${Math.floor(mes / 100)}` : null },
        mes,
        valores: { faturado: valor, receitaReconhecida: mes != null && mes <= limite ? valor : 0, recebido, aReceber: valor - recebido },
      });
    }
    for (const d of despesas) {
      if (!visiveis.has(d.projectId)) continue;
      const c = porId.get(d.contratoId!)!;
      fatos.push({ atributos: { ...base(c, d.projectId), competencia: d.competencia, conta: d.conta }, mes: mesOrdenavel(d.competencia), valores: { custoApropriado: Number(d.valor) } });
    }
  }
  // reembolsos
  if (ids.length) {
    const rs = await db
      .select({ r: schema.contratoReembolsos, competencia: schema.despesas.competencia, conta: schema.despesas.contaCef, projectId: schema.versions.projectId })
      .from(schema.contratoReembolsos)
      .innerJoin(schema.despesas, eq(schema.contratoReembolsos.despesaId, schema.despesas.id))
      .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
      .where(and(eq(schema.contratoReembolsos.tenantId, tenantId), inArray(schema.contratoReembolsos.contratoId, ids), eq(schema.contratoReembolsos.cancelado, false)));
    for (const x of rs) {
      if (!visiveis.has(x.projectId)) continue;
      const c = porId.get(x.r.contratoId)!;
      const solicitado = Number(x.r.valorSolicitado);
      const aprovado = x.r.valorAprovado == null ? null : Number(x.r.valorAprovado);
      const pendente = ["solicitado", "aprovado", "faturado"].includes(x.r.status) ? aprovado ?? solicitado : 0;
      fatos.push({ atributos: { ...base(c, x.projectId), competencia: x.competencia, conta: x.conta }, mes: mesOrdenavel(x.competencia), valores: { reembolsoSolicitado: x.r.status === "pendente" ? 0 : solicitado, reembolsoPendente: pendente } });
    }
  }
  if (opts.incluirHoras && visiveis.size) {
    const hs = await db
      .select({ h: schema.apontamentosHora, fNome: schema.funcionarios.nome, sNome: schema.stakeholders.nome, fase: schema.projetoFases.nome })
      .from(schema.apontamentosHora)
      .leftJoin(schema.funcionarios, eq(schema.apontamentosHora.funcionarioId, schema.funcionarios.id))
      .leftJoin(schema.stakeholders, eq(schema.apontamentosHora.stakeholderId, schema.stakeholders.id))
      .leftJoin(schema.projetoFases, eq(schema.apontamentosHora.projetoFaseId, schema.projetoFases.id))
      .where(and(eq(schema.apontamentosHora.tenantId, tenantId), inArray(schema.apontamentosHora.projectId, [...visiveis])));
    for (const { h, fNome, sNome, fase } of hs) {
      const c = h.contratoId ? porId.get(h.contratoId) : undefined;
      const horas = Number(h.horas);
      fatos.push({
        atributos: { ...(c ? base(c, h.projectId) : { projeto: h.projectId ? nomeProjeto.get(h.projectId) ?? null : null }), fase, profissional: fNome ?? sNome, competencia: h.competencia },
        mes: mesOrdenavel(h.competencia),
        valores: h.tipo === "planejado" ? { horasPlanejadas: horas } : { horasRealizadas: horas, custoPessoal: h.custoHora == null ? 0 : horas * Number(h.custoHora) },
      });
    }
  }
  return fatos;
}

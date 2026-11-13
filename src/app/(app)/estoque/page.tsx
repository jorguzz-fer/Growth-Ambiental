import { getTenantContext } from "@/lib/context";
import { getStockItems, getStockSaldos, getStockMovementsPage, getDespesasParaEstoque, getPermutaOptions, getDocumentsByStockMovements, getMovimentosParaObra, getContagemDocsPorMovimento } from "@/lib/queries";
import { isAiConfigured } from "@/lib/ai/despesa-extract";
import { analisarEstoque } from "@/lib/estoque-analise";
import { AssistenteEstoque } from "@/components/app/assistente-estoque";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { hojeISO } from "@/lib/despesa-status";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import { confrontoCompraConsumo, consumoPorObra } from "@/lib/calc/estoque-obra";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { EstoqueManager, type FiltrosDaTela } from "@/components/app/estoque-manager";

export const dynamic = "force-dynamic";

/**
 * Controle de Estoques (Prompt Y). Controle FÍSICO: a entrada aponta a
 * despesa ou a permuta de origem; a saída diz para qual obra o material foi.
 * Nada aqui gera custo — a despesa já é da obra dela (BY-1).
 */
export default async function EstoquePage({ searchParams }: { searchParams: Promise<{ lancar?: string; tab?: string; pagina?: string; f_item?: string; f_obra?: string; f_tipo?: string; de?: string; ate?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  if (!can(ctx.perms, "estoque", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const filtros: FiltrosDaTela = {
    tab: sp.tab === "mov" ? "mov" : "itens",
    pagina: Math.max(1, Number(sp.pagina) || 1),
    itemId: sp.f_item || null,
    projectId: sp.f_obra || null,
    tipo: sp.f_tipo === "entrada" || sp.f_tipo === "saida" ? sp.f_tipo : null,
    de: sp.de || null,
    ate: sp.ate || null,
  };

  const [items, saldos, movimentos, despesas, permutas] = await Promise.all([
    getStockItems(ctx.tenant.id),
    getStockSaldos(ctx.tenant.id),
    getStockMovementsPage(ctx.tenant.id, { pagina: filtros.pagina, itemId: filtros.itemId, projectId: filtros.projectId, tipo: filtros.tipo, de: filtros.de, ate: filtros.ate }),
    getDespesasParaEstoque(ctx.tenant.id),
    getPermutaOptions(ctx.tenant.id),
  ]);

  // 4-A — documentos da página de movimentos (miniatura/abrir por URL assinada); 4.4 / 4.6 — consumo e confronto no período da tela.
  const r2 = isR2Configured();
  const [docs, paraObra, todosMovimentos, docsPorMovimentoCount] = await Promise.all([
    getDocumentsByStockMovements(ctx.tenant.id, movimentos.rows.map((m) => m.id)),
    filtros.tab === "mov" ? getMovimentosParaObra(ctx.tenant.id, filtros.de, filtros.ate) : Promise.resolve([]),
    getMovimentosParaObra(ctx.tenant.id),
    getContagemDocsPorMovimento(ctx.tenant.id),
  ]);
  const docsPorMov: Record<string, { id: string; filename: string; tipo: string | null; versao: number; contentType: string | null; uploadedAt: string | null; url: string | null }[]> = {};
  for (const d of docs) {
    if (!d.stockMovementId) continue;
    (docsPorMov[d.stockMovementId] ??= []).push({ id: d.id, filename: d.filename, tipo: d.tipo, versao: d.versao, contentType: d.contentType, uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString() : null, url: r2 ? await readUrl(d.storageKey) : null });
  }
  const nomeDaObra = (id: string) => ctx.projects.find((p) => p.id === id)?.name ?? "projeto fora da lista";
  const consumo = consumoPorObra(paraObra).map((c) => ({ ...c, projectName: nomeDaObra(c.projectId) }));
  const confronto = confrontoCompraConsumo(paraObra).map((c) => ({ ...c, projectName: nomeDaObra(c.projectId) }));

  // Seção 7 — o assistente: puro, sobre o que a página carregou; propõe e para.
  const analise = analisarEstoque({
    materiais: items.map((i) => ({ id: i.id, nome: i.nome, sku: i.sku, unidade: i.unidade, custoUnit: Number(i.custoUnit), minimo: Number(i.minimo), saldo: saldos.get(i.id) ?? 0, ativo: i.ativo })),
    movimentos: todosMovimentos.map((m) => ({ ...m, docs: docsPorMovimentoCount.get(m.id) ?? 0 })),
    despesas: despesas.map((d) => ({ id: d.id, numDoc: d.numDoc, valor: d.valor, entradasSoma: d.entradasSoma })),
    hojeISO: hojeISO(),
  });
  const obras = Object.fromEntries(ctx.projects.map((p) => [p.id, p.name]));

  const itemViews = items.map((i) => {
    const s = saldos.get(i.id) ?? 0;
    return { id: i.id, sku: i.sku, nome: i.nome, unidade: i.unidade, categoria: i.categoria, custoUnit: Number(i.custoUnit), minimo: Number(i.minimo), obs: i.obs, ativo: i.ativo, saldo: s, valorEstoque: Math.round(s * Number(i.custoUnit) * 100) / 100 };
  });

  return (
    <>
      <PageHeader
        eyebrow={ctx.tenant.name}
        title="Materiais e Equipamentos"
        subtitle="Almoxarifado da empresa: a entrada aponta a compra (despesa); a saída diz para qual projeto o material foi. Sem efeito contábil — o custo já é da despesa."
      />
      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (Prompt E, 6.2). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      <CrisDaTela
        titulo="Materiais e Equipamentos"
        dados={{
          itens: itemViews.filter((i) => i.ativo).slice(0, 150).map((i) => ({ material: i.nome, unidade: i.unidade, saldo: i.saldo, minimo: i.minimo, custoUnit: i.custoUnit, valorEstoque: i.valorEstoque })),
          aba: filtros.tab === "mov" ? "Entradas & Saídas" : "Itens & Saldo",
        }}
        sugestoes={
          filtros.tab === "mov"
            ? ["Dar baixa de 10 frascos de coleta para o projeto", "Dar entrada da nota da última compra", "Quanto cada projeto consumiu?"]
            : ["Quais itens estão abaixo do mínimo?", "Como dou baixa de material para um projeto?", "Qual o valor em estoque?"]
        }
      />
      <EstoqueManager
        items={itemViews}
        movimentos={{ rows: movimentos.rows.map((m) => ({ id: m.id, itemId: m.itemId, itemNome: m.itemNome, unidade: m.unidade, tipo: m.tipo as "entrada" | "saida", origem: m.origem, quantidade: Number(m.quantidade), custoUnit: Number(m.custoUnit), valor: m.valor, data: m.data, doc: m.doc, obs: m.obs, projectName: m.projectName, responsavel: m.responsavel, despesaId: m.despesaId, despesaNumDoc: m.despesaNumDoc, permutaId: m.permutaId, permutaDescricao: m.permutaDescricao, estornoDeId: m.estornoDeId, estornado: m.estornado })), total: movimentos.total, pagina: movimentos.pagina, porPagina: movimentos.porPagina }}
        filtros={filtros}
        projetos={ctx.projects.map((p) => ({ id: p.id, nome: p.name }))}
        despesas={despesas}
        permutas={permutas.map((p) => ({ id: p.id, label: `${p.descricao ?? "Permuta"}${p.cliente ? ` · ${p.cliente}` : ""}` }))}
        docsPorMov={docsPorMov}
        r2={r2}
        consumo={consumo}
        confronto={confronto}
        canCriar={can(ctx.perms, "estoque", "criar")}
        canEditar={can(ctx.perms, "estoque", "editar")}
        canExcluir={can(ctx.perms, "estoque", "excluir")}
        tipoInicial={sp.lancar === "saida" ? "saida" : "entrada"}
      />
      </div>
      <AssistenteEstoque
        usuario={ctx.userEmail ?? "anon"}
        analise={analise}
        despesas={despesas.map((d) => ({ id: d.id, label: `${d.numDoc ?? "s/ nº"}${d.fornecedor ? ` · ${d.fornecedor}` : ""} · ${d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` }))}
        obras={obras}
        aiConfigurada={isAiConfigured()}
        canCriar={can(ctx.perms, "estoque", "criar")}
      />
      </div>
    </>
  );
}

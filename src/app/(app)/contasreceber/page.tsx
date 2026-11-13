import { getTenantContext } from "@/lib/context";
import { brl0, dateBR } from "@/lib/utils";
import { chaveLigada } from "@/lib/chaves-tenant";
import { recebidoPorParcela, recebimentosSemParcela, situacaoDaParcela } from "@/lib/recebimento-parcela";
import { hojeISO } from "@/lib/despesa-status";
import {
  getContasReceber,
  getReceivables,
  getClientes,
  getBankAccounts,
  getUnidadesAtuaisPorObra,
  getDocumentsByContasReceber,
  getRecebimentosDasContas,
  getEntradasDisponiveis,
} from "@/lib/queries";
import type { RecebimentoExibido } from "@/components/app/conta-receber-recebimentos";
import { analisarContasReceber } from "@/lib/conta-receber-analise";
import { AssistenteContasReceber } from "@/components/app/assistente-contas-receber";
import { isR2Configured, readUrl } from "@/lib/storage/r2";
import type { ContaReceberDoc } from "@/components/app/conta-receber-docs";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { ContasReceberManager } from "@/components/app/contas-receber-manager";
import { ReceitaSearch, type ReceitaBuscavel } from "@/components/app/receita-search";
import { ProjectPicker } from "@/components/app/project-picker";
import { AvisoTelaRemovida } from "@/components/app/aviso-tela-removida";

export const dynamic = "force-dynamic";

export default async function ContasReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ saiu?: string; proj?: string; pf_valor?: string; pf_venc?: string; pf_desc?: string; pf_cash?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "contasreceber", "ver")) return <AccessDenied />;

  const sp = await searchParams;

  // Filtro por projeto (?proj=): "all" mostra todos. CR-06 — a obra filtra na
  // consulta; a página não carrega a empresa inteira para descartar depois.
  const isAll = !sp.proj || sp.proj === "all";
  const projSel = isAll ? null : (ctx.projects.find((p) => p.id === sp.proj) ?? null);
  const filtroObra = projSel?.id;

  const [contas, receivables, clientes, bancos, unidadesPorObra, recebidoDasParcelas, semParcela] = await Promise.all([
    getContasReceber(ctx.tenant.id, filtroObra),
    getReceivables(ctx.tenant.id, filtroObra),
    getClientes(ctx.tenant.id),
    getBankAccounts(ctx.tenant.id),
    // CR-07 — o seletor de unidade só oferece as unidades da obra escolhida.
    getUnidadesAtuaisPorObra(ctx.tenant.id),
    recebidoPorParcela(ctx.tenant.id),
    recebimentosSemParcela(ctx.tenant.id),
  ]);
  const situacaoLigada = await chaveLigada(ctx.tenant.id, "parcela_recebida_situacao");

  // 6.2 — anexos das contas listadas, com link assinado para abrir.
  const r2 = isR2Configured();
  const docs = await getDocumentsByContasReceber(ctx.tenant.id, contas.map((c) => c.id));
  const docsPorConta: Record<string, ContaReceberDoc[]> = {};
  for (const d of docs) {
    if (!d.contaReceberId) continue;
    (docsPorConta[d.contaReceberId] ??= []).push({
      id: d.id,
      filename: d.filename,
      tipo: d.tipo,
      url: r2 ? await readUrl(d.storageKey) : null,
      uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString() : null,
    });
  }

  // Seções 3 e 4 — recebimentos de cada conta (estado derivado na tela) e
  // entradas do extrato com valor livre para conciliar.
  const [recebimentos, entradas] = await Promise.all([
    getRecebimentosDasContas(ctx.tenant.id, contas.map((c) => c.id)),
    getEntradasDisponiveis(ctx.tenant.id, filtroObra),
  ]);
  const recebimentosPorConta: Record<string, RecebimentoExibido[]> = {};
  for (const r of recebimentos) {
    (recebimentosPorConta[r.contaReceberId] ??= []).push({
      id: r.id,
      valor: Number(r.valor),
      data: r.data,
      forma: r.forma,
      cashEntryId: r.cashEntryId,
      justificativa: r.justificativa,
      estornado: r.estornado,
      motivoEstorno: r.motivoEstorno,
    });
  }

  // Seção 8 — análises do assistente, em código puro, sobre o que a página já
  // carregou. "Hoje" vem do servidor em São Paulo.
  const hoje = new Date();
  const hojeYmd = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(hoje)
      .replace(/-/g, ""),
  );
  const analise = analisarContasReceber(
    contas.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      tipo: c.tipo,
      descricao: c.descricao,
      valor: Number(c.valor),
      vencimento: c.vencimento,
      unitCode: c.unitCode,
      clienteId: c.clienteId,
      clienteNome: c.clienteNome,
      recebimentos: recebimentosPorConta[c.id] ?? [],
    })),
    entradas,
    hojeYmd,
  );

  // Lista unificada para a busca (contas lançadas + recebíveis das vendas),
  // já só da obra escolhida.
  const receitasBuscaveis: ReceitaBuscavel[] = [
    ...contas.map((c) => ({
      id: c.id,
      origem: "conta" as const,
      descricao: c.descricao,
      clienteNome: c.clienteNome,
      projectName: c.projectName,
      unitCode: c.unitCode,
      tipo: c.tipo,
      valor: Number(c.valor),
      vencimento: c.vencimento,
      status: c.status,
    })),
    ...receivables.map((r) => ({
      id: r.refId,
      origem: "recebivel" as const,
      descricao: r.descricao,
      clienteNome: r.clienteNome,
      projectName: r.projectName,
      unitCode: r.unitCode,
      tipo: null,
      valor: r.valor,
      vencimento: r.dia,
      status: r.status,
    })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={projSel ? `${projSel.name} · ${ctx.tenant.name}` : `Todos os projetos · ${ctx.tenant.name}`}
        title="Contas a Receber"
        actions={
          <ProjectPicker
            projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
            selected={projSel ? projSel.id : "all"}
            allOption
          />
        }
        subtitle="Recebíveis dos contratos de serviço (faturas) e contas a receber lançadas — vinculados a um projeto."
      />
      <AvisoTelaRemovida de={sp.saiu} />
      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (Prompt E, 6.2). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      <div className="mb-3">
        <ReceitaSearch rows={receitasBuscaveis} />
      </div>
      {/* Prompt AT §5 (BAT-5) — o plano foi editado depois do recebimento: o recebimento fica, para revisão. */}
      {semParcela.length > 0 && (
        <div className="mb-4 rounded-[8px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] text-[#92400e]" role="note" data-recebimento-sem-parcela>
          <strong>{semParcela.length} recebimento(s) sem parcela:</strong> o plano de pagamento da unidade foi editado depois do recebimento, e a parcela
          não existe mais. O recebimento não foi apagado; confira e, se for o caso, estorne no Caixa e concilie com a parcela certa.
          <ul className="mt-1 list-disc pl-5">
            {semParcela.map((r) => (
              <li key={r.id}>
                {r.unidade} · {r.chave} · {brl0(r.valor)}
                {r.data ? ` · ${dateBR(r.data)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ContasReceberManager
        // Prompt L, 3-A.2 — entrada do extrato encaminhada: valor, vencimento e histórico preenchidos.
        prefill={sp.pf_valor || sp.pf_venc || sp.pf_desc ? { valor: sp.pf_valor ?? null, vencimento: sp.pf_venc ?? null, descricao: sp.pf_desc ?? null } : null}
        projetos={ctx.projects.map((p) => ({ id: p.id, nome: p.name }))}
        projetoSelecionado={projSel?.id ?? null}
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nomeCompleto }))}
        bancos={bancos.map((b) => ({ id: b.id, nome: `${b.banco}${b.cc ? " · " + b.cc : ""}` }))}
        unidadesPorObra={unidadesPorObra}
        contas={contas}
        docsPorConta={docsPorConta}
        recebimentosPorConta={recebimentosPorConta}
        entradas={entradas}
        r2={r2}
        unitReceb={receivables.map((r) => ({
          // Prompt AT §5.3 — situação da parcela pelos recebimentos conciliados.
          // Só com a chave "parcela_recebida_situacao": sem ela, a coluna fica vazia.
          ...(situacaoLigada
            ? (() => {
                const recebido = recebidoDasParcelas.get(`${r.unitId}|${r.chave}`) ?? 0;
                return { recebido, situacao: situacaoDaParcela({ valor: r.valor, recebido, dia: r.dia, hojeISO: hojeISO() }).situacao };
              })()
            : {}),
          // CR-08 — o identificador do recebível (unidade:índice da parcela)
          // chega à tabela; é a chave de qualquer vínculo futuro.
          refId: r.refId,
          unitCode: r.unitCode,
          projectName: r.projectName,
          clienteNome: r.clienteNome,
          descricao: r.descricao,
          dia: r.dia,
          valor: r.valor,
        }))}
        canCriar={can(ctx.perms, "contasreceber", "criar")}
        canEditar={can(ctx.perms, "contasreceber", "editar")}
        canExcluir={can(ctx.perms, "contasreceber", "excluir")}
      />
      </div>
      <AssistenteContasReceber usuario={ctx.userEmail ?? "anon"} analise={analise} podeEditar={can(ctx.perms, "contasreceber", "editar")} />
      </div>
    </>
  );
}

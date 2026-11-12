import { getTenantContext } from "@/lib/context";
import { getBankAccounts, getCartoes, getComprasDaFatura, getComprasDoCartao, getComprasDosCartoes, getEstornosDoCartao, getExtratoCartao, getFaturasCartao, getVinculosDosCartoes } from "@/lib/queries";
import { analisarCartoes } from "@/lib/cartao-analise";
import { AssistenteCartoes } from "@/components/app/assistente-cartoes";
import { conferirExtrato } from "@/lib/calc/conferencia-cartao";
import { ExtratoCartao } from "@/components/app/extrato-cartao";
import { can } from "@/lib/permissions";
import { hojeISO } from "@/lib/despesa-status";
import { cicloAberto } from "@/lib/calc/cartao-ciclo";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { openFinanceDaEmpresa } from "@/lib/openfinance/situacao";
import { ConectarBanco } from "@/components/app/open-finance";
import { CartaoForm } from "@/components/app/cartao-form";
import { CartoesManager } from "@/components/app/cartoes-manager";
import { FaturasCartao } from "@/components/app/faturas-cartao";
import { ProjecaoCartao } from "@/components/app/projecao-cartao";
import { getPagamentosDaFatura } from "@/lib/actions/faturas";
import { AccessDenied } from "@/components/app/access-denied";
import { CrisDaTela } from "@/components/app/cris-contexto";
import { estadoDaFatura } from "@/lib/calc/fatura";

export const dynamic = "force-dynamic";

/**
 * Cartões de Crédito (Prompt U). Esta tela NÃO lança despesa: a compra é
 * lançada em /despesas com a forma "Cartão de crédito" e cai na fatura do
 * ciclo. Aqui: cadastro (seção 1) e faturas (seção 2); pagamento, projeção e
 * conferência nos PRs seguintes.
 */
export default async function CartoesPage({ searchParams }: { searchParams: Promise<{ fatura?: string; extrato?: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "cartoes", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const [cartoes, bancos, faturas, vinculos] = await Promise.all([getCartoes(ctx.tenant.id), getBankAccounts(ctx.tenant.id), getFaturasCartao(ctx.tenant.id), getVinculosDosCartoes(ctx.tenant.id)]);
  const contas = bancos.map((b) => ({ id: b.id, nome: `${b.banco}${b.cc ? " · " + b.cc : ""}` }));
  const of = await openFinanceDaEmpresa(ctx.tenant.id);
  const hoje = hojeISO();
  // 1.3 — "usado no ciclo": o acumulado da fatura ABERTA de cada cartão (as
  // compras e parcelas que caem no ciclo em curso).
  const usado: Record<string, number> = {};
  for (const c of cartoes) {
    const ciclo = cicloAberto(hoje, c);
    const f = ciclo ? faturas.find((x) => x.cartaoId === c.id && x.fechamento === ciclo.fechamento) : null;
    usado[c.id] = f ? Math.max(0, f.valorCompras - f.valorPago) : 0;
  }
  const faturaAberta = sp.fatura && faturas.some((f) => f.id === sp.fatura) ? sp.fatura : null;
  const [compras, pagamentos] = await Promise.all([faturaAberta ? getComprasDaFatura(ctx.tenant.id, faturaAberta) : Promise.resolve([]), getPagamentosDaFatura(ctx.tenant.id, faturas.map((f) => f.id))]);
  const projetos = ctx.projects.map((p) => ({ id: p.id, nome: p.name }));
  // Seções 5 e 6 — conferência do extrato do cartão escolhido, em código puro.
  const cartaoExtrato = cartoes.find((c) => c.id === sp.extrato) ?? null;
  const [itensExtrato, comprasCartao, estornos] = cartaoExtrato
    ? await Promise.all([getExtratoCartao(ctx.tenant.id, cartaoExtrato.id), getComprasDoCartao(ctx.tenant.id, cartaoExtrato.id), getEstornosDoCartao(ctx.tenant.id, cartaoExtrato.id)])
    : [[], [], []];
  const conferencia = cartaoExtrato ? conferirExtrato(itensExtrato, comprasCartao, estornos, cartaoExtrato) : null;
  // Seção 7 — assistente somente leitura, em código puro, sobre o que a
  // página carregou (apelido e quatro últimos; nenhum número de cartão).
  const analise = analisarCartoes(
    cartoes,
    faturas,
    await getComprasDosCartoes(ctx.tenant.id),
    cartaoExtrato && conferencia ? { cartao: `${cartaoExtrato.apelido}${cartaoExtrato.ultimos4 ? " •••• " + cartaoExtrato.ultimos4 : ""}`, resultado: conferencia } : null,
    hoje,
  );
  const contaDoCartao: Record<string, string | null> = Object.fromEntries(cartoes.map((c) => [c.id, c.bankAccountId]));

  return (
    <>
      <PageHeader
        title="Cartões de Crédito"
        subtitle={`${cartoes.filter((c) => c.ativo).length} ativo(s) · ${cartoes.length} cadastrado(s)`}
        actions={
          // Prompt AT §1-B.1 e 1-B.8 — conectar o banco do cartão; a situação de cada cartão conectado.
          of.configurado ? (
            <div className="flex flex-wrap items-center gap-2">
              {[...of.porCartao.entries()].map(([id, c]) => (
                <Badge key={id} tone={c.situacao === "conectado" ? "success" : c.situacao === "erro" ? "danger" : c.situacao === "precisa_acao" ? "warning" : "info"} data-situacao-cartao={c.situacao}>
                  {cartoes.find((k) => k.id === id)?.apelido ?? "cartão"}: {c.situacao === "precisa_acao" ? "precisa de ação" : c.situacao === "conectado" ? "conectado" : c.situacao}
                </Badge>
              ))}
              {can(ctx.perms, "contas", "editar") && <ConectarBanco contas={contas} cartoes={cartoes.filter((k) => k.ativo).map((k) => ({ id: k.id, nome: `${k.apelido}${k.ultimos4 ? " •••• " + k.ultimos4 : ""}` }))} rotulo="Conectar banco do cartão" />}
            </div>
          ) : null
        }
      />
      <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-[var(--color-accent2)]/12 bg-[var(--color-accent4)] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-ink2)]">
        <span aria-hidden className="mt-px">ⓘ</span>
        <p>
          A <strong>compra</strong> é despesa comum, lançada em <strong>Despesas</strong> com a forma &quot;Cartão de crédito&quot;, na competência informada. Nenhuma saída de caixa acontece na compra: ela fica vinculada à <strong>fatura</strong> do ciclo, e o caixa sai só no <strong>pagamento da fatura</strong>, pela conta cadastrada aqui.
        </p>
      </div>
      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (Prompt E, 6.2). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {/* Prompt U2 — a Cris sabe dos cartões, das faturas e da conferência do extrato. Só apelido e 4 últimos. */}
      <CrisDaTela
        titulo="Cartões de Crédito"
        dados={{
          cartoes: cartoes.map((c) => ({ cartao: `${c.apelido}${c.ultimos4 ? " •••• " + c.ultimos4 : ""}`, ativo: c.ativo, limite: c.limite == null ? null : Number(c.limite), usadoNoCiclo: usado[c.id] ?? 0, fechamentoDia: c.diaFechamento, vencimentoDia: c.diaVencimento })),
          faturas: faturas
            .filter((f) => f.qtdCompras > 0 || f.valorPago > 0)
            .slice(-24)
            .map((f) => ({ cartao: cartoes.find((c) => c.id === f.cartaoId)?.apelido ?? "—", fechamento: f.fechamento, vencimento: f.vencimento, estado: estadoDaFatura(f, hoje), compras: f.valorCompras, pago: f.valorPago, creditos: f.creditos })),
          conferenciaDoExtrato: cartaoExtrato && conferencia
            ? { cartao: cartaoExtrato.apelido, conferem: conferencia.casados.length, noExtratoSemLancamento: conferencia.semLancamento.map((i) => ({ data: i.data, descricao: i.descricao, valor: i.valor })), lancadoSemExtrato: conferencia.semExtrato.length, divergentes: conferencia.divergentes.length, creditos: conferencia.creditos.length }
            : null,
        }}
        sugestoes={["O que está no extrato e não foi lançado?", "Quanto vence na próxima fatura?", "Como subo a fatura em PDF?", "Como lanço um estorno?"]}
      />
      {can(ctx.perms, "cartoes", "criar") && <CartaoForm contas={contas} />}
      <CartoesManager cartoes={cartoes} contas={contas} usado={usado} vinculos={vinculos} hoje={hoje} canEditar={can(ctx.perms, "cartoes", "editar")} canExcluir={can(ctx.perms, "cartoes", "excluir")} />
      <ProjecaoCartao cartoes={cartoes} faturas={faturas} hoje={hoje} />
      <ExtratoCartao cartoes={cartoes.map((c) => ({ id: c.id, nome: `${c.apelido}${c.ultimos4 ? " •••• " + c.ultimos4 : ""}` }))} cartaoId={cartaoExtrato?.id ?? null} conferencia={conferencia} compras={comprasCartao} projetos={projetos} canEditar={can(ctx.perms, "cartoes", "editar")} />
      <FaturasCartao faturas={faturas} hoje={hoje} aberta={faturaAberta} compras={compras} pagamentos={pagamentos} contas={contas} projetos={projetos} contaDoCartao={contaDoCartao} canPagar={can(ctx.perms, "cartoes", "editar")} />
      </div>
      <AssistenteCartoes usuario={ctx.userEmail ?? "anon"} analise={analise} />
      </div>
    </>
  );
}

import { getTenantContext } from "@/lib/context";
import { getBankAccounts, getUsoDasContas } from "@/lib/queries";
import { analisarContas } from "@/lib/contas-analise";
import { AssistenteContas } from "@/components/app/assistente-contas";
import { hojeISO } from "@/lib/despesa-status";
import { can } from "@/lib/permissions";
import { isPluggyConfigured } from "@/lib/openfinance/pluggy";
import { openFinanceDaEmpresa } from "@/lib/openfinance/situacao";
import { ConectarBanco, ConexoesOpenFinance } from "@/components/app/open-finance";
import { getCartoes } from "@/lib/queries";
import { totaisPorTipo } from "@/lib/contas-regras";
import { brl0 } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContaForm } from "@/components/app/conta-form";
import { ContasManager } from "@/components/app/contas-manager";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

/**
 * Contas Correntes (Prompt X): só as contas bancárias que compõem o saldo
 * de caixa da empresa. Saldo com sócios e terceiros fica em Ressarcimentos.
 */
export default async function ContasPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  if (!can(ctx.perms, "contas", "ver")) return <AccessDenied />;

  const [contas, uso] = await Promise.all([getBankAccounts(ctx.tenant.id), getUsoDasContas(ctx.tenant.id)]);
  // Seção 7 — assistente somente leitura, em código puro, sobre o que a página carregou.
  const analise = analisarContas(
    contas.map((c) => ({ id: c.id, banco: c.banco, ag: c.ag, cc: c.cc, tipo: c.tipo, saldo: Number(c.saldo), saldoSource: c.saldoSource, openFinanceId: c.openFinanceId, lastSync: c.lastSync ? c.lastSync.toISOString() : null, ativo: c.ativo })),
    uso,
    hojeISO(),
  );
  const canCriar = can(ctx.perms, "contas", "criar");
  const canEditar = can(ctx.perms, "contas", "editar");
  const canExcluir = can(ctx.perms, "contas", "excluir");
  const ativas = contas.filter((c) => c.ativo);
  // 2.2 — o total soma apenas contas ATIVAS; 5.5 — e pode ser visto por tipo.
  const total = ativas.reduce((a, c) => a + Number(c.saldo), 0);
  const porTipo = totaisPorTipo(contas);
  const ofConfigured = isPluggyConfigured();
  // Prompt AT §1-B — conexões do Open Finance: o selo diz a verdade (1-B.9) e cada conta mostra a situação (1-B.8).
  const [of, cartoes] = await Promise.all([openFinanceDaEmpresa(ctx.tenant.id), getCartoes(ctx.tenant.id)]);
  const opcoesContas = contas.filter((c) => c.ativo).map((c) => ({ id: c.id, nome: `${c.banco}${c.cc ? " · " + c.cc : ""}` }));
  const opcoesCartoes = cartoes.filter((k) => k.ativo).map((k) => ({ id: k.id, nome: `${k.apelido}${k.ultimos4 ? " •••• " + k.ultimos4 : ""}` }));

  return (
    <>
      <PageHeader
        title="Contas Correntes"
        subtitle={`${ativas.length} conta(s) ativa(s)${contas.length !== ativas.length ? ` · ${contas.length - ativas.length} inativa(s)` : ""} · saldo total ${brl0(total)} (só ativas)`}
        actions={
          ofConfigured ? (
            <div className="flex items-center gap-2">
              {of.selo && <Badge tone={of.contasConectadas ? "success" : "neutral"} data-selo-openfinance>{of.selo}</Badge>}
              {canEditar && <ConectarBanco contas={opcoesContas} cartoes={opcoesCartoes} />}
            </div>
          ) : null
        }
      />
      <ConexoesOpenFinance
        conexoes={of.conexoes}
        contas={opcoesContas}
        cartoes={opcoesCartoes}
        podeEditar={canEditar}
        podeDecidir={can(ctx.perms, "caixa", "editar")}
        duplicados={of.possiveisDuplicados.map((d) => ({ id: d.id, conta: opcoesContas.find((c) => c.id === d.bankAccountId)?.nome ?? "conta", data: d.data, descricao: d.descricao, valor: d.valor }))}
      />

      {/* 1.1 — o que entra aqui; 1.2 — o texto antigo (Open Finance / manual) preservado. */}
      <div className="mb-5 space-y-2 rounded-[10px] border border-[var(--color-accent2)]/12 bg-[var(--color-accent4)] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-ink2)]">
        <p>
          <span aria-hidden className="mr-1">ⓘ</span>
          Cadastre aqui <strong>apenas as contas bancárias que compõem o saldo de caixa da empresa</strong>. O saldo total soma todas elas (só as ativas).
        </p>
        <p>
          Saldo com sócios e terceiros fica em <strong>Ressarcimentos</strong>, na conta corrente de terceiros — é obrigação da empresa, não caixa disponível.
        </p>
        <p>
          O saldo pode ser <strong>rastreado automaticamente</strong> (Open Finance, quando conectado, ou upload de extrato na tela <strong>Caixa</strong>) ou <strong>lançado manualmente</strong>. &quot;Automático&quot; sem conexão só reflete o último extrato subido.
        </p>
      </div>

      {porTipo.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2 text-[12.5px] text-[var(--color-ink2)]">
          {porTipo.map((t) => (
            <span key={t.tipo} className="rounded-[8px] border border-[var(--color-line)] bg-white px-3 py-1.5">
              {t.tipo}: <strong className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">{brl0(t.total)}</strong> · {t.contas} conta(s) ativa(s)
            </span>
          ))}
        </div>
      )}

      {/* Abaixo de 1180px o painel desce para baixo do conteúdo (Prompt E, 6.2). */}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {canCriar && <ContaForm />}

      <Card>
        <CardContent className="p-5">
          <ContasManager
            contas={contas.map((c) => ({
              id: c.id,
              banco: c.banco,
              ag: c.ag,
              op: c.op,
              cc: c.cc,
              tipo: c.tipo,
              saldo: Number(c.saldo),
              saldoSource: c.saldoSource,
              openFinanceId: c.openFinanceId,
              ativo: c.ativo,
              conexao: (() => {
                const x = of.porConta.get(c.id);
                return x ? { situacao: x.situacao, ultimaAtualizacao: x.ultimaAtualizacao, erro: x.ultimoErro } : null;
              })(),
            }))}
            canEditar={canEditar}
            canExcluir={canExcluir}
          />
        </CardContent>
      </Card>
      </div>
      <AssistenteContas usuario={ctx.userEmail ?? "anon"} analise={analise} />
      </div>
    </>
  );
}

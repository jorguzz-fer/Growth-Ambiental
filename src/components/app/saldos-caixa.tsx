import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl0 } from "@/lib/utils";
import { LIMITE_ATUALIZACAO_DIAS } from "@/lib/calc/cadeia-caixa";
import type { SaldoDoCartao } from "@/lib/caixa-cartoes";

export interface SaldoDaConta {
  id: string;
  nome: string;
  emConta: number;
  conciliado: number;
  origem: "auto" | "manual";
  atualizadoEm: string | null;
  diasDesde: number | null;
  conectada: boolean;
  /** Prompt AT §8.1 — movimentos a conciliar desta conta (Caixa por conta). */
  pendentes?: number;
}

/**
 * Prompt AT §4.3 — Caixa por conta: cada conta ou cartão é clicável e vira o
 * filtro da tela (`?conta=`). `href(id)` monta o link; `todas` volta ao
 * consolidado.
 */
export interface FiltroDeConta {
  selecionada: string;
  href: (id: string) => string;
  todas: string;
}

/**
 * Topo do Caixa (Prompt L, 1.0 e 1.2): os dois saldos lado a lado — EM
 * CONTA (extrato, fato do banco) e CONCILIADO (o que os lançamentos
 * sustentam) — por conta e no total, com a diferença; quando e por onde o
 * saldo em conta foi obtido (1.0.1), alerta quando está velho (1.0.2),
 * importar extrato em destaque (1.0.3) e o caminho do Open Finance (1.0.4).
 */
export function SaldosCaixa({ contas, total, importar, openFinance, totalAjustes, baixadoSemConciliar, cartoes, filtro, faixaDeAcao, ocultarAcoes }: { contas: SaldoDaConta[]; total: { emConta: number; conciliado: number }; importar: React.ReactNode; openFinance: { configurado: boolean; podeConfigurar: boolean }; totalAjustes?: { valor: number; n: number }; baixadoSemConciliar?: { total: number; despesas: number; dias: number | null }; /** Prompt AT §4.2 — cartões, depois das contas, no mesmo formato. */ cartoes?: SaldoDoCartao[]; filtro?: FiltroDeConta; /** Prompt AT §8.1 — a faixa de ação no topo do bloco (Caixa por conta). */ faixaDeAcao?: React.ReactNode; /** Com a faixa de ação, os botões de importar e Open Finance moram nela. */ ocultarAcoes?: boolean }) {
  const diferencaTotal = Math.round((total.emConta - total.conciliado) * 100) / 100;
  return (
    <Card className="mb-6">
      <CardContent className="p-5">
        {faixaDeAcao}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Os dois saldos</h2>
            <p className="text-[11.5px] text-[var(--color-ink3)]">
              <strong>Em conta</strong> é o do extrato (fato do banco). <strong>Conciliado</strong> é o que os lançamentos sustentam. Num dia inteiramente conciliado, os dois coincidem; a diferença é o que a tela existe para mostrar.
            </p>
          </div>
          {!ocultarAcoes && <div className="flex flex-wrap items-center gap-2">
            {importar}
            {openFinance.podeConfigurar ? (
              <Link href="/contas" className="text-[12px] text-[var(--color-accent2)] hover:underline" title="Informe o ID Open Finance da conta em Contas Correntes">
                Open Finance {openFinance.configurado ? "ativo" : "não configurado"} → configurar
              </Link>
            ) : (
              <Badge tone={openFinance.configurado ? "success" : "neutral"}>Open Finance {openFinance.configurado ? "ativo" : "não configurado"}</Badge>
            )}
          </div>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--color-ink4)]">
                <th className="py-1 font-normal">Conta</th>
                <th className="py-1 pl-3 text-right font-normal">Em conta (extrato)</th>
                <th className="py-1 pl-3 text-right font-normal">Conciliado</th>
                <th className="py-1 pl-3 text-right font-normal">Diferença</th>
                <th className="py-1 pl-4 font-normal">Última atualização do saldo em conta</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => {
                const dif = Math.round((c.emConta - c.conciliado) * 100) / 100;
                const velho = c.diasDesde == null || c.diasDesde > LIMITE_ATUALIZACAO_DIAS;
                const ativa = filtro?.selecionada === c.id;
                return (
                  <tr key={c.id} className={`border-t border-[var(--color-line)] ${ativa ? "bg-[var(--color-accent2)]/8" : ""}`} data-conta-saldo={c.id} aria-current={ativa ? "true" : undefined}>
                    <td className="py-1.5 font-medium text-[var(--color-ink)]">
                      {filtro ? (
                        <Link href={filtro.href(c.id)} className="hover:underline" title="Filtrar a tela por esta conta">
                          {c.nome}
                        </Link>
                      ) : (
                        c.nome
                      )}
                      {filtro && (c.pendentes ?? 0) > 0 && (
                        <Link href={filtro.href(c.id)} className="ml-1.5" data-pendentes-da-conta={c.pendentes} title="Movimentos desta conta a conciliar">
                          <Badge tone="warning">{c.pendentes} a conciliar</Badge>
                        </Link>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(c.emConta)}</td>
                    <td className="py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(c.conciliado)}</td>
                    <td className={`py-1.5 text-right font-[family-name:var(--font-mono)] ${Math.abs(dif) > 0.005 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{brl0(dif)}</td>
                    <td className="py-1.5 pl-4 text-[11.5px] text-[var(--color-ink2)]">
                      {c.atualizadoEm ? `${c.atualizadoEm.slice(0, 10).split("-").reverse().join("/")} · ${c.origem === "auto" ? (c.conectada ? "Open Finance / extrato" : "extrato importado") : "lançado à mão"}` : "nunca atualizado"}
                      {velho && <Badge tone="warning" className="ml-1.5">{c.diasDesde == null ? "sem data" : `há ${c.diasDesde} dias`} — extrato desatualizado?</Badge>}
                    </td>
                  </tr>
                );
              })}
              {(cartoes ?? []).map((k) => {
                const ativa = filtro?.selecionada === k.id;
                const velho = k.ultimoExtrato == null;
                return (
                  <tr key={k.id} className={`border-t border-[var(--color-line)] ${ativa ? "bg-[var(--color-accent2)]/8" : ""}`} data-cartao-saldo={k.id} aria-current={ativa ? "true" : undefined}>
                    <td className="py-1.5 font-medium text-[var(--color-ink)]">
                      <span className="mr-1 text-[10px] uppercase tracking-wide text-[var(--color-ink4)]">Cartão</span>
                      {filtro ? (
                        <Link href={filtro.href(k.id)} className="hover:underline" title="Filtrar a tela por este cartão">
                          {k.nome}
                        </Link>
                      ) : (
                        k.nome
                      )}
                      {filtro && k.pendentes > 0 && (
                        <Link href={filtro.href(k.id)} className="ml-1.5" data-pendentes-da-conta={k.pendentes} title="Linhas do extrato do cartão a conciliar">
                          <Badge tone="warning">{k.pendentes} a conciliar</Badge>
                        </Link>
                      )}
                    </td>
                    <td className="py-1.5 text-right font-[family-name:var(--font-mono)]" title="Fatura aberta: o que falta pagar do ciclo em curso">{brl0(k.faturaAberta)}</td>
                    <td className="py-1.5 text-right font-[family-name:var(--font-mono)]" title="Linhas do extrato do cartão já conciliadas com a compra lançada">{brl0(k.conciliado)}</td>
                    <td className="py-1.5 text-right text-[11.5px] text-[var(--color-ink3)]">fatura aberta · conciliado</td>
                    <td className="py-1.5 pl-4 text-[11.5px] text-[var(--color-ink2)]">
                      {k.ultimoExtrato ? `último extrato ${k.ultimoExtrato.split("-").reverse().join("/")}${k.conectado ? " · Open Finance" : ""}` : "nenhum extrato do cartão"}
                      {velho && <Badge tone="neutral" className="ml-1.5">suba a fatura</Badge>}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-[var(--color-line)] font-semibold text-[var(--color-ink)]">
                <td className="py-1.5">
                  Total (contas ativas da empresa)
                  {filtro && filtro.selecionada && (
                    <Link href={filtro.todas} className="ml-2 text-[11.5px] font-normal text-[var(--color-accent2)] hover:underline" data-todas-as-contas>
                      Todas as contas
                    </Link>
                  )}
                </td>
                <td className="py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(total.emConta)}</td>
                <td className="py-1.5 text-right font-[family-name:var(--font-mono)]">{brl0(total.conciliado)}</td>
                <td className={`py-1.5 text-right font-[family-name:var(--font-mono)] ${Math.abs(diferencaTotal) > 0.005 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}>{brl0(diferencaTotal)}</td>
                <td className="py-1.5 pl-4 text-[11px] font-normal text-[var(--color-ink3)]">{contas.length === 0 ? "Nenhuma conta ativa — cadastre em Contas Correntes." : "Lançamentos sem conta entram só no total."}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {(totalAjustes || baixadoSemConciliar) && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--color-ink2)]">
            {totalAjustes && (
              <span title="Ajustes de caixa acumulados (Parte 4). Se este total cresce, é lançamento que não está sendo feito.">
                Ajustes acumulados: <strong className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">{brl0(totalAjustes.valor)}</strong> ({totalAjustes.n})
              </span>
            )}
            {baixadoSemConciliar && (
              <span role="status" title="Pagamentos registrados sem vínculo com linha do extrato (6.4): o número que denuncia extrato não importado.">
                Baixado sem conciliar: <strong className={`font-[family-name:var(--font-mono)] ${baixadoSemConciliar.total > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-ink)]"}`}>{brl0(baixadoSemConciliar.total)}</strong> em {baixadoSemConciliar.despesas} despesa(s){baixadoSemConciliar.dias != null ? ` · há ${baixadoSemConciliar.dias} dias` : ""}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

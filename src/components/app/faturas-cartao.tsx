import Link from "next/link";
import type { CompraDaFatura, FaturaCartaoView } from "@/lib/queries";
import { comRotativo, estadoDaFatura, statusDaFatura, totalDaFatura } from "@/lib/calc/fatura";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { tomDoStatus } from "@/lib/despesa-status";
import { FaturaAcoes } from "@/components/app/fatura-acoes";

/**
 * Faturas de cartão (Prompt U, 2.5–2.8 e 3): uma linha por ciclo com estado
 * derivado (aberta / fechada / paga), compras, rotativo que ela traz, pago e
 * saldo. O valor da aberta é o acumulado do ciclo, SEM estimativa de juros
 * (2.8). Clicar numa fatura lista as compras dela; cada compra leva ao
 * lançamento raiz. Fatura fechada com saldo tem "Pagar" (prévia antes de
 * gravar) e "Juros cobrados".
 */
export function FaturasCartao({ faturas, hoje, aberta, compras, pagamentos, contas, projetos, contaDoCartao, canPagar }: { faturas: FaturaCartaoView[]; hoje: string; aberta: string | null; compras: CompraDaFatura[]; pagamentos: { faturaId: string; valor: number; data: string; conta: string | null }[]; contas: { id: string; nome: string }[]; projetos: { id: string; nome: string }[]; contaDoCartao: Record<string, string | null>; canPagar: boolean }) {
  const comMovimento = comRotativo(faturas, hoje).filter((f) => f.qtdCompras > 0 || f.valorPago > 0 || f.rotativoAnterior > 0);
  const escolhida = comMovimento.find((f) => f.id === aberta) ?? null;
  return (
    <Card className="mt-6">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">Faturas</h2>
        <p className="mt-1 text-[12.5px] text-[var(--color-ink2)]">
          A fatura <strong>aberta</strong> é obrigação prevista: o valor é o acumulado até agora e cresce com as compras. Ao fechar, a mesma fatura passa a firme. Pagamento parcial deixa <strong>rotativo</strong>, que a fatura seguinte traz. Em Contas a Pagar aparece a fatura, nunca as compras.
        </p>
        {comMovimento.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--color-ink4)]">Nenhuma compra no cartão ainda. Lance em Despesas com a forma &quot;Cartão de crédito&quot;.</p>
        ) : (
          <Table wrapperClassName="mt-3" className="min-w-[900px]">
            <THead>
              <tr>
                <TH>Cartão</TH>
                <TH>Fecha</TH>
                <TH>Vence</TH>
                <TH>Estado</TH>
                <TH className="text-right">Compras</TH>
                <TH className="text-right">Rotativo</TH>
                <TH className="text-right">Créditos</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Pago</TH>
                <TH className="text-right">Saldo</TH>
                {canPagar && <TH className="text-right">Ações</TH>}
              </tr>
            </THead>
            <tbody>
              {comMovimento.map((f) => {
                const estado = estadoDaFatura(f, hoje);
                const st = statusDaFatura(f, hoje);
                const total = totalDaFatura(f);
                const saldo = Math.max(0, Math.round((total - f.valorPago - f.creditos) * 100) / 100);
                const pags = pagamentos.filter((p) => p.faturaId === f.id);
                return (
                  <TR key={f.id} className={f.id === aberta ? "bg-[var(--color-surface2)]" : undefined}>
                    <TD className="font-medium text-[var(--color-ink)]">
                      <Link href={`/cartoes?fatura=${f.id}#faturas`} className="hover:underline">
                        {f.cartaoNome}
                      </Link>
                    </TD>
                    <TD className="font-[family-name:var(--font-mono)]">{dateBR(f.fechamento)}</TD>
                    <TD className="font-[family-name:var(--font-mono)]">{dateBR(f.vencimento)}</TD>
                    <TD>
                      <Badge tone={estado === "aberta" ? "info" : tomDoStatus(st)}>{estado === "aberta" ? "aberta · prevista" : st}</Badge>
                      {f.jurosDespesaId && <div className="text-[11px] text-[var(--color-ink3)]">com juro cobrado</div>}
                      {pags.length > 0 && <div className="text-[11px] text-[var(--color-ink3)]">{pags.map((p) => `${brl0(p.valor)} em ${dateBR(p.data)}`).join(" · ")}</div>}
                    </TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]" title={`${f.qtdCompras} compra(s)`}>{brl0(f.valorCompras)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{f.rotativoAnterior > 0 ? brl0(f.rotativoAnterior) : "—"}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]" title="Estornos ainda não aplicados num pagamento">{f.creditos > 0 ? `− ${brl0(f.creditos)}` : "—"}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(total)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(f.valorPago)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)] font-semibold">
                      {brl0(saldo)}
                      {estado === "paga parcialmente" && <div className="text-[10.5px] font-normal text-[var(--color-ink3)]">no rotativo da seguinte</div>}
                    </TD>
                    {canPagar && (
                      <TD className="text-right">
                        {estado !== "aberta" && estado !== "paga" ? (
                          <FaturaAcoes faturaId={f.id} saldo={saldo} contaPadrao={contaDoCartao[f.cartaoId] ?? null} temJuros={!!f.jurosDespesaId} contas={contas} projetos={projetos} />
                        ) : (
                          <span className="text-[11px] text-[var(--color-ink4)]">{estado === "aberta" ? "fecha antes de pagar" : "quitada"}</span>
                        )}
                      </TD>
                    )}
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
        {escolhida && (
          <div id="faturas" className="mt-4">
            <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
              Compras da fatura {escolhida.cartaoNome} · fecha {dateBR(escolhida.fechamento)}
            </h3>
            <Table wrapperClassName="mt-2" className="min-w-[700px]">
              <THead>
                <tr>
                  <TH>PED</TH>
                  <TH>Descrição</TH>
                  <TH>Fornecedor</TH>
                  <TH>Projeto</TH>
                  <TH>Competência</TH>
                  <TH>Parcela</TH>
                  <TH className="text-right">Valor</TH>
                  <TH className="text-right">Pago</TH>
                </tr>
              </THead>
              <tbody>
                {compras.map((c) => (
                  <TR key={c.parcelaId}>
                    <TD className="font-[family-name:var(--font-mono)]">
                      <Link href={`/despesas?proj=${c.projectId}&tab=lancamentos&edit=${c.despesaId}`} className="text-[var(--color-accent2)] hover:underline">
                        {c.numDoc ?? "—"}
                      </Link>
                    </TD>
                    <TD>{c.descricao ?? "—"}</TD>
                    <TD>{c.fornecedorNome ?? "—"}</TD>
                    <TD>{c.projectName}</TD>
                    <TD className="font-[family-name:var(--font-mono)]">{c.competencia ?? "—"}</TD>
                    <TD className="font-[family-name:var(--font-mono)]">{c.numero}/{c.total}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(c.valor)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(c.valorPago)}</TD>
                  </TR>
                ))}
                {compras.length === 0 && (
                  <TR>
                    <TD colSpan={8} className="py-4 text-center text-[var(--color-ink4)]">Sem compras nesta fatura.</TD>
                  </TR>
                )}
              </tbody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

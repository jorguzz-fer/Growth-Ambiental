"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ContaPagarRow } from "@/lib/queries";
import { brl0, cn, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { SortTH, useOrdenacaoTabela } from "@/components/app/sortable-th";
import type { ColunaOrdenavel } from "@/lib/tabela-ordenacao";
import { dataBRParaISO as toISO, statusExibido, STATUS_VENCIDA, tomDoStatus } from "@/lib/despesa-status";
import { CLIENTE_PROPRIO, filtrarContasPagar, pendenteDaConta, totalPendente } from "@/lib/contas-pagar-regras";
import { MultiSelect } from "@/components/ui/multi-select";

/**
 * §16 — um status só para exibir, filtrar, ordenar e contar. A obrigação de
 * restituição já vem no vocabulário da tela de Restituições e não passa por
 * "Vencida" (a data dela é previsão de restituição, não vencimento).
 */
function statusDaLinha(r: ContaPagarRow, hoje: string): string {
  if (r.origem === "obrigacao") return r.status ?? "—";
  // Prompt U — o status da fatura já vem derivado (prevista / a pagar / vencida / pago).
  if (r.origem === "fatura") return r.status ?? "—";
  return statusExibido(r, hoje);
}

export function ContasPagarTable({
  rows,
  canEditar = false,
  hoje,
}: {
  rows: ContaPagarRow[];
  canEditar?: boolean;
  /** Prompt R, 4.5 — a data de hoje vem do servidor (ISO), não do navegador. */
  hoje: string;
}) {
  const hojeISO = hoje;
  // Prompt R, seção 5 — seleção múltipla: "ou" dentro do filtro, "e" entre
  // filtros; nenhum marcado = todos. As datas continuam intervalo de vencimento.
  const [fornecedor, setFornecedor] = useState<string[]>([]);
  const [cliente, setCliente] = useState<string[]>([]);
  const [projeto, setProjeto] = useState<string[]>([]);
  const [categoria, setCategoria] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const opts = useMemo(() => {
    const uniq = (xs: (string | null | undefined)[]) =>
      [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) =>
        a.localeCompare(b),
      );
    // Projetos são identificados pelo ID REAL, nunca pelo nome: duas obras ou
    // filiais homônimas colapsariam num único filtro e vazariam dados entre si.
    const porId = new Map<string, string>();
    for (const r of rows) if (!porId.has(r.projectId)) porId.set(r.projectId, r.projectName);
    return {
      fornecedores: uniq(rows.map((r) => r.fornecedorNome)),
      clientes: uniq(rows.map((r) => r.clienteNome ?? CLIENTE_PROPRIO)),
      projetos: [...porId]
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome)),
      categorias: uniq(rows.map((r) => r.categoriaDre)),
      // §16 — as opções são os status EXIBIDOS (com "Vencida"), os mesmos do filtro.
      status: uniq(rows.map((r) => statusDaLinha(r, hojeISO))),
    };
  }, [rows, hojeISO]);

  const filtered = useMemo(() => {
    // Filtro por ID real do projeto (não pelo nome) — isola obras/filiais.
    const out = filtrarContasPagar(
      rows,
      { fornecedores: fornecedor, clientes: cliente, projetos: projeto, categorias: categoria, status, de: de || undefined, ate: ate || undefined },
      (r) => statusDaLinha(r, hojeISO),
      toISO,
    );
    // Ordenação por vencimento usando datas reais (ISO), não strings BR:
    //  1) vencidas (mais antiga → recente), 2) a vencer (mais próxima → distante),
    //  3) pagas (por data de pagamento). Sem data vão para o fim do grupo.
    const bucket = (r: ContaPagarRow): number => {
      if (r.status === "Pago") return 2;
      if (statusDaLinha(r, hojeISO) === "Vencida") return 0;
      return 1; // a vencer (ou sem vencimento)
    };
    const keyDate = (r: ContaPagarRow): string => {
      const base = r.status === "Pago" ? toISO(r.dataPagamento) : toISO(r.vencimento);
      return base || "9999-12-31";
    };
    return out.sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      return keyDate(a).localeCompare(keyDate(b));
    });
  }, [rows, fornecedor, cliente, projeto, categoria, status, de, ate, hojeISO]);

  // §5 — ordenação estilo planilha. Aplicada SOBRE o conjunto já filtrado, na
  // íntegra (não só sobre a parte visível). Sem clique de cabeçalho, vale a
  // ordenação padrão acima (vencidas → a vencer → pagas).
  const colunas = useMemo<ColunaOrdenavel<ContaPagarRow>[]>(
    () => [
      { key: "fornecedor", tipo: "texto", get: (r) => r.fornecedorNome },
      { key: "descricao", tipo: "texto", get: (r) => r.descricao },
      { key: "parcela", tipo: "valor", get: (r) => r.parcela?.numero ?? null },
      { key: "categoria", tipo: "texto", get: (r) => r.categoriaDre },
      { key: "projeto", tipo: "texto", get: (r) => r.projectName },
      { key: "cliente", tipo: "texto", get: (r) => r.clienteNome ?? "Próprio" },
      { key: "valor", tipo: "valor", get: (r) => r.valor },
      { key: "saldo", tipo: "valor", get: (r) => pendenteDaConta(r) },
      { key: "vencimento", tipo: "data", get: (r) => r.vencimento },
      { key: "pagamento", tipo: "data", get: (r) => r.dataPagamento },
      { key: "forma", tipo: "texto", get: (r) => r.formaPagamento },
      // Ordena pelo status EXIBIDO (inclui "Vencida", que é derivado da data).
      { key: "status", tipo: "texto", get: (r) => statusDaLinha(r, hojeISO) },
    ],
    [hojeISO],
  );
  const { rows: visiveis, estado, onSort } = useOrdenacaoTabela(
    filtered,
    colunas,
    (r) => r.id,
  );

  // Totais — uma obrigação de restituição NÃO é despesa nova: a despesa dela já
  // está listada (como "Pago", porque quem pagou o fornecedor foi o terceiro).
  // Por isso "Total" soma só as despesas, enquanto "Pendente" e "A restituir"
  // mostram o que de fato ainda vai sair do caixa da empresa. Somar as duas
  // coisas em "Total" contaria o mesmo fato duas vezes.
  // §15 — "Pendente" é o SALDO a pagar (valor − pago − abatido), não o valor
  // original: despesa de 100 com 80 pagos deve 20.
  const despesasFiltradas = filtered.filter((r) => r.origem !== "obrigacao");
  const obrigacoesFiltradas = filtered.filter((r) => r.origem === "obrigacao");
  const total = despesasFiltradas.reduce((a, r) => a + r.valor, 0);
  const totalPend = totalPendente(despesasFiltradas);
  // Prompt R, 4.4 — quantas estão vencidas e quanto somam (mesmo status da
  // lista: o contador confere com o filtro "Vencida").
  const vencidas = despesasFiltradas.filter((r) => statusDaLinha(r, hojeISO) === STATUS_VENCIDA);
  const totalVencido = totalPendente(vencidas);
  const totalRestituir = obrigacoesFiltradas.reduce((a, r) => a + r.valor, 0);

  const limpar = () => {
    setFornecedor([]); setCliente([]); setProjeto([]);
    setCategoria([]); setStatus([]); setDe(""); setAte("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-7">
          <div>
            <Label>De (vencimento)</Label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <MultiSelect label="Fornecedor" value={fornecedor} onChange={setFornecedor} options={opts.fornecedores.map((o) => ({ value: o, label: o }))} />
          <MultiSelect label="Cliente" value={cliente} onChange={setCliente} options={opts.clientes.map((o) => ({ value: o, label: o }))} />
          <MultiSelect label="Projeto" value={projeto} onChange={setProjeto} options={opts.projetos.map((p) => ({ value: p.id, label: p.nome }))} />
          <MultiSelect label="Categoria" value={categoria} onChange={setCategoria} options={opts.categorias.map((o) => ({ value: o, label: o }))} />
          <MultiSelect label="Status" value={status} onChange={setStatus} options={opts.status.map((o) => ({ value: o, label: o }))} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <Badge tone="neutral">{filtered.length} contas</Badge>
        <span className="text-[var(--color-ink3)]" title="Soma do valor de todas as despesas (e parcelas) no filtro, pagas ou não. Não é o que falta pagar: isso é o Pendente.">
          Total lançado no filtro <strong className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">{brl0(total)}</strong>
        </span>
        <span className="text-[var(--color-ink3)]">
          Pendente <strong className="font-[family-name:var(--font-mono)] text-[var(--color-warning)]">{brl0(totalPend)}</strong>
        </span>
        <span className="text-[var(--color-ink3)]" role="status" title="Contas com vencimento anterior a hoje (data do servidor) e saldo em aberto">
          Vencidas{" "}
          <strong className={`font-[family-name:var(--font-mono)] ${vencidas.length ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"}`}>
            {vencidas.length}
          </strong>
          {vencidas.length > 0 && (
            <>
              {" "}· <strong className="font-[family-name:var(--font-mono)] text-[var(--color-danger)]">{brl0(totalVencido)}</strong>
            </>
          )}
        </span>
        {obrigacoesFiltradas.length > 0 && (
          <span
            className="text-[var(--color-ink3)]"
            title="Saldo devido a terceiros que pagaram fornecedores pela empresa. Não é despesa nova — a despesa já está listada acima."
          >
            A ressarcir{" "}
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-accent2)]">
              {brl0(totalRestituir)}
            </strong>
          </span>
        )}
        <button onClick={limpar} className="ml-auto text-[12px] text-[var(--color-accent2)] hover:underline">
          Limpar filtros
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Altura limitada: a rolagem (horizontal e vertical) acontece dentro
              da tabela, então a barra horizontal fica visível de imediato — sem
              precisar descer até o fim da página. Cabeçalho fixo ao rolar. */}
          <Table
            wrapperClassName="max-h-[70vh] scroll-x-always"
            className="min-w-[1200px]"
          >
            <THead className="sticky top-0 z-10">
                <tr>
                  {/* 6.1 — identificação fixa à esquerda ao rolar horizontalmente */}
                  <SortTH coluna="fornecedor" estado={estado} onSort={onSort} className="sticky left-0 z-20 bg-[var(--color-surface2)]">Fornecedor</SortTH>
                  <SortTH coluna="descricao" estado={estado} onSort={onSort}>Descrição</SortTH>
                  <SortTH coluna="parcela" estado={estado} onSort={onSort}>Parcela</SortTH>
                  <SortTH coluna="categoria" estado={estado} onSort={onSort}>Categoria</SortTH>
                  <SortTH coluna="projeto" estado={estado} onSort={onSort}>Projeto</SortTH>
                  <SortTH coluna="cliente" estado={estado} onSort={onSort}>Cliente</SortTH>
                  <SortTH coluna="valor" estado={estado} onSort={onSort} className="text-right">Valor</SortTH>
                  <SortTH coluna="saldo" estado={estado} onSort={onSort} className="text-right">Saldo</SortTH>
                  <SortTH coluna="vencimento" estado={estado} onSort={onSort}>Vencimento</SortTH>
                  <SortTH coluna="pagamento" estado={estado} onSort={onSort}>Pagamento</SortTH>
                  <SortTH coluna="forma" estado={estado} onSort={onSort}>Forma</SortTH>
                  <SortTH coluna="status" estado={estado} onSort={onSort}>Status</SortTH>
                  {canEditar && <TH className="text-right">Ações</TH>}
                </tr>
              </THead>
              <tbody>
                {visiveis.map((r) => {
                  const vencida = r.origem !== "obrigacao" && statusDaLinha(r, hojeISO) === STATUS_VENCIDA;
                  return (
                  // 4.3 — linha vencida com evidência discreta (borda à esquerda e fundo leve)
                  <TR key={r.id} className={vencida ? "border-l-2 border-l-[var(--color-danger)] bg-[var(--color-danger)]/[0.04]" : undefined}>
                    <TD className={cn("sticky left-0 z-10 whitespace-nowrap font-medium text-[var(--color-ink)]", vencida ? "bg-[#fef5f5]" : "bg-white")}>
                      {r.fornecedorNome ?? "—"}
                    </TD>
                    {/* 6.2 — sem observação, estado vazio (o PED já está na linha) */}
                    <TD className="max-w-[240px] truncate">{r.descricao && r.descricao !== r.numDoc ? r.descricao : "—"}</TD>
                    <TD className="whitespace-nowrap font-[family-name:var(--font-mono)] text-[var(--color-ink2)]">
                      {r.parcela ? (
                        <>
                          {r.parcela.numero}/{r.parcela.total}
                          {/* 1.3 — cheque por parcela: número e "bom para" (migração 0038) */}
                          {r.parcela.chequeNumero && (
                            <span className="ml-1.5 text-[11px] text-[var(--color-ink3)]" title="Cheque desta parcela">
                              ch. {r.parcela.chequeNumero}
                              {r.parcela.bomPara ? ` · bom para ${dateBR(r.parcela.bomPara)}` : ""}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD>{r.categoriaDre ?? "—"}</TD>
                    <TD className="whitespace-nowrap">{r.projectName}</TD>
                    <TD className="whitespace-nowrap text-[var(--color-ink3)]">
                      {r.clienteNome ?? "Próprio"}
                    </TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(r.valor)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-ink2)]">
                      {brl0(pendenteDaConta(r))}
                    </TD>
                    <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink2)]">
                      {r.vencimento ? dateBR(r.vencimento) : "—"}
                    </TD>
                    <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                      {r.dataPagamento ? dateBR(r.dataPagamento) : "—"}
                    </TD>
                    <TD>{r.formaPagamento ?? "—"}</TD>
                    <TD>
                      {r.origem === "obrigacao" ? (
                        // Status da obrigação já vem no vocabulário da tela de
                        // Restituições; não passa por "Vencida" (a data aqui é
                        // uma previsão de restituição, não um vencimento).
                        <Badge tone="info">{r.status ?? "—"}</Badge>
                      ) : r.origem === "fatura" ? (
                        // Prompt U, 2.7 — fatura aberta é obrigação PREVISTA (o
                        // valor ainda cresce); fechada é firme.
                        <Badge tone={r.prevista ? "info" : tomDoStatus(r.status ?? "")} title={r.prevista ? "Fatura do ciclo aberto: ainda recebe compras; o valor é o acumulado até agora, sem estimativa de juros." : "Fatura fechada: obrigação firme, valor não muda mais."}>
                          {r.status === STATUS_VENCIDA && <span aria-hidden className="mr-1">⚠</span>}
                          {r.status}
                        </Badge>
                      ) : (
                        (() => {
                          const st = statusDaLinha(r, hojeISO);
                          // 4.3 — selo vermelho com ícone de alerta quando vencida
                          return (
                            <Badge tone={tomDoStatus(st)}>
                              {st === STATUS_VENCIDA && <span aria-hidden className="mr-1">⚠</span>}
                              {st}
                            </Badge>
                          );
                        })()
                      )}
                    </TD>
                    {canEditar && (
                      <TD className="text-right">
                        {r.origem === "obrigacao" ? (
                          <Link
                            href="/restituicoes"
                            className="text-sm text-[var(--color-accent2)] hover:underline"
                          >
                            Ressarcir
                          </Link>
                        ) : r.origem === "fatura" ? (
                          // Prompt R, 1.7 — a fatura não é despesa: o link vai para Cartões.
                          <Link href="/cartoes" className="text-sm text-[var(--color-accent2)] hover:underline">
                            Fatura
                          </Link>
                        ) : (
                          <Link
                            // 1.4 — leva à despesa RAIZ; a parcela de origem vai na URL para
                            // a tela de destino dizer de onde se veio.
                            href={`/despesas?proj=${r.projectId}&tab=lancamentos&edit=${r.despesaId ?? r.id}${r.parcela ? `&parcela=${r.parcela.numero}` : ""}`}
                            className="text-sm text-[var(--color-accent2)] hover:underline"
                          >
                            Editar
                          </Link>
                        )}
                      </TD>
                    )}
                  </TR>
                  );
                })}
                {visiveis.length === 0 && (
                  <TR>
                    <TD colSpan={canEditar ? 13 : 12} className="py-8 text-center text-[var(--color-ink4)]">
                      Nenhuma conta a pagar com os filtros aplicados.
                    </TD>
                  </TR>
                )}
              </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

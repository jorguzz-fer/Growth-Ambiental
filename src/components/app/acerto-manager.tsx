"use client";

import { useCrisFormulario } from "@/components/app/cris-contexto";
import { marcarDespesas } from "@/lib/acerto-cris";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  concluirAcerto,
  estornarAcerto,
  ratearEntreObras,
  type AcertoResumo,
  type DespesaAbativel,
} from "@/lib/actions/acerto";
import { calcularDiferenca, calcularRateio, validarRateio } from "@/lib/calc/acerto";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField, MonthField } from "@/components/ui/date-field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

interface Opt {
  id: string;
  nome: string;
}

/** Chave de idempotência por tentativa (§16 / CA-34). */
function novaChave(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

type Aba = "vincular" | "rateio" | "historico";

export function AcertoManager({
  despesas,
  acertos,
  bancos,
  favorecidos,
  projetos,
  categorias,
  contas,
  canEstornar,
}: {
  despesas: DespesaAbativel[];
  acertos: AcertoResumo[];
  bancos: Opt[];
  favorecidos: Opt[];
  projetos: Opt[];
  categorias: string[];
  contas: { code: string; name: string }[];
  canEstornar: boolean;
}) {
  const [aba, setAba] = useState<Aba>("vincular");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-[8px] bg-[var(--color-surface3)] p-1">
        {(
          [
            ["vincular", "Vincular despesas"],
            ["rateio", "Rateio entre projetos"],
            ["historico", "Acertos do período"],
          ] as [Aba, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`rounded-[6px] px-3 py-1.5 text-xs transition-colors ${
              aba === k
                ? "bg-white text-[var(--color-ink)] shadow-sm"
                : "text-[var(--color-ink3)] hover:text-[var(--color-ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === "vincular" && (
        <VincularDespesas
          despesas={despesas}
          bancos={bancos}
          favorecidos={favorecidos}
          categorias={categorias}
        />
      )}
      {aba === "rateio" && (
        <RateioObras
          projetos={projetos}
          bancos={bancos}
          favorecidos={favorecidos}
          categorias={categorias}
          contas={contas}
        />
      )}
      {aba === "historico" && <Historico acertos={acertos} canEstornar={canEstornar} />}
    </div>
  );
}

/** Item 5.1 — cabeçalho da saída + grade de vinculação + painel de fechamento. */
function VincularDespesas({
  despesas,
  bancos,
  favorecidos,
  categorias,
}: {
  despesas: DespesaAbativel[];
  bancos: Opt[];
  favorecidos: Opt[];
  categorias: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const chave = useRef(novaChave());

  const [cab, setCab] = useState({
    dataPagamento: "",
    bankAccountId: "",
    valorTransferido: "",
    formaPagamento: "",
    favorecidoId: "",
    obs: "",
    categoriaDiferenca: "Despesas Financeiras",
  });
  const [filtro, setFiltro] = useState({ fornecedor: "", obra: "", busca: "" });
  /** despesaId → valor a abater (editável, permite abatimento parcial). */
  const [sel, setSel] = useState<Record<string, number>>({});

  const opts = useMemo(() => {
    const forn = new Map<string, string>();
    const obras = new Map<string, string>();
    for (const d of despesas) {
      if (d.fornecedorId && d.fornecedorNome) forn.set(d.fornecedorId, d.fornecedorNome);
      obras.set(d.projectId, d.projectName);
    }
    return {
      fornecedores: [...forn].map(([id, nome]) => ({ id, nome })),
      obras: [...obras].map(([id, nome]) => ({ id, nome })),
    };
  }, [despesas]);

  const visiveis = useMemo(
    () =>
      despesas.filter((d) => {
        if (filtro.fornecedor && d.fornecedorId !== filtro.fornecedor) return false;
        if (filtro.obra && d.projectId !== filtro.obra) return false;
        if (filtro.busca.trim()) {
          const q = filtro.busca.trim().toLowerCase();
          const alvo = `${d.numDoc ?? ""} ${d.fornecedorNome ?? ""} ${d.projectName} ${d.competencia ?? ""}`.toLowerCase();
          if (!alvo.includes(q)) return false;
        }
        return true;
      }),
    [despesas, filtro],
  );

  const itens = Object.entries(sel)
    .filter(([, v]) => v > 0)
    .map(([despesaId, valor]) => ({ despesaId, valor }));
  const totalVinculado = Math.round(itens.reduce((a, i) => a + i.valor, 0) * 100) / 100;
  const transferido = Number(cab.valorTransferido) || 0;
  const diferenca = calcularDiferenca(transferido, totalVinculado);

  // Prompt T2 — a Cris preenche o cabeçalho e marca as despesas (por PED ou,
  // em lote, todas de um fornecedor). A confirmação é o Concluir da tela.
  const [crisMsg, setCrisMsg] = useState<string | null>(null);
  useCrisFormulario(
    {
      id: "acerto-vincular",
      titulo: "Acertos e Rateios: pagamento e despesas a quitar",
      campos: [
        { nome: "dataPagamento", rotulo: "Data do pagamento", tipo: "data", dica: "MM/DD/YYYY" },
        { nome: "banco", rotulo: "Banco / conta", tipo: "opcao", opcoes: bancos.map((b) => b.nome) },
        { nome: "valorTransferido", rotulo: "Valor transferido", tipo: "numero", dica: "em reais" },
        { nome: "formaPagamento", rotulo: "Forma", tipo: "opcao", opcoes: ["PIX", "Transferência bancária", "Boleto", "Cheque", "Dinheiro"] },
        { nome: "favorecido", rotulo: "Favorecido", tipo: "opcao", opcoes: favorecidos.map((f) => f.nome) },
        { nome: "obs", rotulo: "Observação", tipo: "texto" },
        { nome: "marcarPeds", rotulo: "Despesas a marcar (PEDs)", tipo: "texto", dica: "nº dos PEDs separados por vírgula" },
        { nome: "marcarFornecedor", rotulo: "Marcar todas as despesas deste fornecedor", tipo: "opcao", opcoes: opts.fornecedores.map((f) => f.nome) },
      ],
    },
    (p) => {
      const v = p.valores;
      const banco = v.banco ? bancos.find((b) => b.nome === v.banco) : undefined;
      const fav = v.favorecido ? favorecidos.find((f) => f.nome === v.favorecido) : undefined;
      setCab((c) => ({
        ...c,
        ...(v.dataPagamento ? { dataPagamento: v.dataPagamento } : {}),
        ...(banco ? { bankAccountId: banco.id } : {}),
        ...(v.valorTransferido ? { valorTransferido: v.valorTransferido } : {}),
        ...(v.formaPagamento ? { formaPagamento: v.formaPagamento } : {}),
        ...(fav ? { favorecidoId: fav.id } : {}),
        ...(v.obs ? { obs: v.obs } : {}),
      }));
      const r = marcarDespesas(despesas, { peds: v.marcarPeds, fornecedorNome: v.marcarFornecedor });
      if (r.ids.length) setSel((s) => ({ ...s, ...Object.fromEntries(r.ids.map((id) => [id, despesas.find((d) => d.id === id)!.saldo])) }));
      setCrisMsg(
        [r.ids.length ? `A Cris marcou ${r.ids.length} despesa(s).` : "", r.naoAchados.length ? `Não encontrei: ${r.naoAchados.join(", ")}.` : "", "Confira e clique em Concluir."].filter(Boolean).join(" "),
      );
    },
  );

  const alternar = (d: DespesaAbativel) =>
    setSel((s) => {
      const n = { ...s };
      if (n[d.id] != null) delete n[d.id];
      else n[d.id] = d.saldo;
      return n;
    });

  const confirmar = () => {
    if (pending) return;
    setErro(null);
    setMsg(null);
    start(async () => {
      const res = await concluirAcerto({
        dataPagamento: cab.dataPagamento,
        bankAccountId: cab.bankAccountId || null,
        valorTransferido: transferido,
        formaPagamento: cab.formaPagamento || null,
        favorecidoId: cab.favorecidoId || null,
        obs: cab.obs || null,
        itens,
        categoriaDiferenca: cab.categoriaDiferenca,
        idempotencyKey: chave.current,
      });
      if (!res.ok) {
        setErro(res.error ?? "Falha ao concluir o acerto.");
        return;
      }
      chave.current = novaChave();
      setMsg(`Acerto ${res.numDoc ?? ""} concluído. ${itens.length} despesa(s) quitada(s).`);
      setSel({});
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <Label>Data do pagamento</Label>
            <DateField
              value={cab.dataPagamento}
              onChange={(v) => setCab({ ...cab, dataPagamento: v })}
            />
          </div>
          <div>
            <Label>Banco / conta</Label>
            <Select
              value={cab.bankAccountId}
              onChange={(e) => setCab({ ...cab, bankAccountId: e.target.value })}
            >
              <option value="">—</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Valor transferido</Label>
            <Input
              type="number"
              step="0.01"
              value={cab.valorTransferido}
              onChange={(e) => setCab({ ...cab, valorTransferido: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label>Forma</Label>
            <Select
              value={cab.formaPagamento}
              onChange={(e) => setCab({ ...cab, formaPagamento: e.target.value })}
            >
              <option value="">—</option>
              {["PIX", "Transferência bancária", "Boleto", "Cheque", "Dinheiro"].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Favorecido</Label>
            <Select
              value={cab.favorecidoId}
              onChange={(e) => setCab({ ...cab, favorecidoId: e.target.value })}
            >
              <option value="">—</option>
              {favorecidos.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Observação</Label>
            <Input value={cab.obs} onChange={(e) => setCab({ ...cab, obs: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          <div>
            <Label>Buscar</Label>
            <Input
              value={filtro.busca}
              onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
              placeholder="PED, fornecedor, projeto"
            />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Select
              value={filtro.fornecedor}
              onChange={(e) => setFiltro({ ...filtro, fornecedor: e.target.value })}
            >
              <option value="">Todos</option>
              {opts.fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Projeto</Label>
            <Select
              value={filtro.obra}
              onChange={(e) => setFiltro({ ...filtro, obra: e.target.value })}
            >
              <option value="">Todos</option>
              {opts.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table wrapperClassName="max-h-[45vh] scroll-x-always" className="min-w-[1000px]">
            <THead className="sticky top-0 z-10">
              <tr>
                <TH className="w-8"></TH>
                <TH>PED</TH>
                <TH>Projeto</TH>
                <TH>Fornecedor</TH>
                <TH>Competência</TH>
                <TH>Vencimento</TH>
                <TH className="text-right">Em aberto</TH>
                <TH className="text-right">A abater</TH>
              </tr>
            </THead>
            <tbody>
              {visiveis.map((d) => (
                <TR key={d.id}>
                  <TD>
                    <input
                      type="checkbox"
                      checked={sel[d.id] != null}
                      onChange={() => alternar(d)}
                      aria-label={`Vincular ${d.numDoc ?? d.id}`}
                    />
                  </TD>
                  <TD className="whitespace-nowrap font-[family-name:var(--font-mono)]">
                    {d.numDoc ?? "—"}
                  </TD>
                  <TD className="whitespace-nowrap">{d.projectName}</TD>
                  <TD className="max-w-[180px] truncate">{d.fornecedorNome ?? "—"}</TD>
                  <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                    {d.competencia ?? "—"}
                  </TD>
                  <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                    {d.vencimento ? dateBR(d.vencimento) : "—"}
                  </TD>
                  <TD className="text-right font-[family-name:var(--font-mono)]">
                    {brl0(d.saldo)}
                  </TD>
                  <TD className="text-right">
                    {/* Abatimento PARCIAL é permitido: o pagamento pode cobrir
                        só parte de um PED. */}
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 w-28 text-right"
                      value={sel[d.id] ?? ""}
                      disabled={sel[d.id] == null}
                      onChange={(e) =>
                        setSel((s) => ({ ...s, [d.id]: Number(e.target.value) || 0 }))
                      }
                    />
                  </TD>
                </TR>
              ))}
              {visiveis.length === 0 && (
                <TR>
                  <TD colSpan={8} className="py-8 text-center text-[var(--color-ink4)]">
                    Nenhuma despesa em aberto com os filtros aplicados.
                  </TD>
                </TR>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Painel de fechamento — sempre visível (item 5.1). */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-2 font-[family-name:var(--font-mono)] text-[13px] sm:max-w-md">
            <Linha label="Valor transferido" valor={transferido} />
            <Linha label="Total vinculado" valor={totalVinculado} />
            <div className="border-t border-[var(--color-accent2)]/15 pt-2">
              <Linha
                label="Diferença"
                valor={diferenca.tipo === "DESCONTO" ? -diferenca.valor : diferenca.valor}
                destaque
              />
            </div>
          </div>
          {diferenca.tipo !== "NENHUMA" && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-[220px]">
                <Label>
                  Classificar como{" "}
                  {diferenca.tipo === "JUROS" ? "juros e multas" : "desconto obtido"}
                </Label>
                <Select
                  value={cab.categoriaDiferenca}
                  onChange={(e) => setCab({ ...cab, categoriaDiferenca: e.target.value })}
                >
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="max-w-lg text-[11.5px] leading-relaxed text-[var(--color-ink3)]">
                A diferença é lançada como{" "}
                {diferenca.tipo === "JUROS" ? "despesa" : "receita"} financeira do
                período, na competência do pagamento. <strong>Não é rateada no
                custo de nenhum projeto</strong> — juros de mora são perda
                operacional, não custo de obtenção de recursos (RG-07).
              </p>
            </div>
          )}
          {erro && <p className="mt-3 text-sm text-[var(--color-danger)]">{erro}</p>}
          {msg && <p className="mt-3 text-sm text-[var(--color-success)]">{msg}</p>}
          {crisMsg && (
            <p data-cris-preencheu className="mt-3 text-sm text-[var(--color-accent)]">
              {crisMsg}
            </p>
          )}
          <div className="mt-4">
            <Button
              onClick={confirmar}
              disabled={pending || itens.length === 0 || transferido <= 0 || !cab.dataPagamento}
            >
              {pending ? "Concluindo…" : `Concluir acerto (${itens.length} despesa(s))`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Linha({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[var(--color-ink3)]">{label}</span>
      <span
        className={
          destaque
            ? valor === 0
              ? "font-semibold text-[var(--color-ink3)]"
              : valor > 0
                ? "font-semibold text-[var(--color-danger)]"
                : "font-semibold text-[var(--color-success)]"
            : "text-[var(--color-ink)]"
        }
      >
        {brl0(valor)}
      </span>
    </div>
  );
}

/** Item 5.3 — um PIX, várias obras, um comprovante. */
function RateioObras({
  projetos,
  bancos,
  favorecidos,
  categorias,
  contas,
}: {
  projetos: Opt[];
  bancos: Opt[];
  favorecidos: Opt[];
  categorias: string[];
  contas: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const chave = useRef(novaChave());

  const [f, setF] = useState({
    prestadorId: "",
    valorTotal: "",
    dataPagamento: "",
    bankAccountId: "",
    competencia: "",
    categoriaDre: categorias[0] ?? "Custo Variável",
    contaCef: "",
    baseRateio: "",
    descricao: "",
  });
  const [linhas, setLinhas] = useState<{ projectId: string; percentual: string }[]>([
    { projectId: projetos[0]?.id ?? "", percentual: "" },
  ]);

  const valorTotal = Number(f.valorTotal) || 0;
  const rateio = calcularRateio(
    valorTotal,
    linhas
      .filter((l) => l.projectId)
      .map((l) => ({ projectId: l.projectId, percentual: Number(l.percentual) || 0 })),
  );
  const erroRateio = valorTotal > 0 ? validarRateio(valorTotal, rateio) : null;

  const confirmar = () => {
    if (pending) return;
    setErro(null);
    setMsg(null);
    start(async () => {
      const res = await ratearEntreObras({
        prestadorId: f.prestadorId || null,
        valorTotal,
        dataPagamento: f.dataPagamento,
        bankAccountId: f.bankAccountId || null,
        competencia: f.competencia || null,
        categoriaDre: f.categoriaDre,
        contaCef: f.contaCef || null,
        baseRateio: f.baseRateio || null,
        descricao: f.descricao || null,
        linhas: linhas
          .filter((l) => l.projectId)
          .map((l) => ({ projectId: l.projectId, percentual: Number(l.percentual) || 0 })),
        idempotencyKey: chave.current,
      });
      if (!res.ok) {
        setErro(res.error ?? "Falha ao ratear.");
        return;
      }
      chave.current = novaChave();
      setMsg(
        `Rateio ${res.numDoc ?? ""} concluído: ${rateio.length} PED(s) gerados, uma única saída de caixa.`,
      );
      router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">
          Rateio de mão de obra entre projetos
        </h2>
        <p className="mb-4 text-[11.5px] leading-relaxed text-[var(--color-ink3)]">
          Um pagamento único a um prestador que trabalhou em vários projetos. Gera{" "}
          <strong>um PED por projeto</strong> (custo correto por centro de custo) e{" "}
          <strong>uma única saída de caixa</strong>. A memória de cálculo fica
          gravada — é o documento que sustenta o custo por projeto perante a
          contabilidade.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Label>Prestador</Label>
            <Select
              value={f.prestadorId}
              onChange={(e) => setF({ ...f, prestadorId: e.target.value })}
            >
              <option value="">—</option>
              {favorecidos.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Valor total pago</Label>
            <Input
              type="number"
              step="0.01"
              value={f.valorTotal}
              onChange={(e) => setF({ ...f, valorTotal: e.target.value })}
            />
          </div>
          <div>
            <Label>Data do pagamento</Label>
            <DateField value={f.dataPagamento} onChange={(v) => setF({ ...f, dataPagamento: v })} />
          </div>
          <div>
            <Label>Competência</Label>
            <MonthField value={f.competencia} onChange={(v) => setF({ ...f, competencia: v })} />
          </div>
          <div>
            <Label>Banco / conta</Label>
            <Select
              value={f.bankAccountId}
              onChange={(e) => setF({ ...f, bankAccountId: e.target.value })}
            >
              <option value="">—</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Categoria DRE</Label>
            <Select
              value={f.categoriaDre}
              onChange={(e) => setF({ ...f, categoriaDre: e.target.value })}
            >
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Conta CEF</Label>
            <Select value={f.contaCef} onChange={(e) => setF({ ...f, contaCef: e.target.value })}>
              <option value="">—</option>
              {contas.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Base do rateio</Label>
            <Input
              value={f.baseRateio}
              onChange={(e) => setF({ ...f, baseRateio: e.target.value })}
              placeholder="ex.: dias trabalhados"
            />
          </div>
          <div className="sm:col-span-4">
            <Label>Descrição</Label>
            <Input
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
              placeholder="ex.: mão de obra semana 12"
            />
          </div>
        </div>

        <h3 className="mb-2 mt-5 text-[13px] font-semibold text-[var(--color-ink)]">
          Distribuição entre projetos
        </h3>
        <div className="space-y-2">
          {linhas.map((l, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <Label>Projeto</Label>
                <Select
                  value={l.projectId}
                  onChange={(e) =>
                    setLinhas((ls) =>
                      ls.map((x, j) => (j === i ? { ...x, projectId: e.target.value } : x)),
                    )
                  }
                >
                  <option value="">—</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-28">
                <Label>%</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={l.percentual}
                  onChange={(e) =>
                    setLinhas((ls) =>
                      ls.map((x, j) => (j === i ? { ...x, percentual: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <div className="w-32 pb-2 text-right font-[family-name:var(--font-mono)] text-[13px]">
                {brl0(rateio[i]?.valor ?? 0)}
              </div>
              {linhas.length > 1 && (
                <button
                  onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                  className="pb-2 text-[12px] text-[var(--color-danger)] hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setLinhas((ls) => [...ls, { projectId: "", percentual: "" }])}
          className="mt-2 text-[12px] text-[var(--color-accent2)] hover:underline"
        >
          + Adicionar projeto
        </button>

        {/* CA-27 — rateio que não fecha é bloqueado com mensagem clara. */}
        {erroRateio && (
          <p className="mt-3 rounded-[8px] bg-[var(--color-danger)]/10 p-2.5 text-[12.5px] text-[var(--color-danger)]">
            {erroRateio}
          </p>
        )}
        {erro && <p className="mt-3 text-sm text-[var(--color-danger)]">{erro}</p>}
        {msg && <p className="mt-3 text-sm text-[var(--color-success)]">{msg}</p>}

        <div className="mt-4">
          <Button
            onClick={confirmar}
            disabled={pending || !!erroRateio || valorTotal <= 0 || !f.dataPagamento}
          >
            {pending ? "Rateando…" : `Gerar ${rateio.length} PED(s) e a saída única`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Item 5.5 — relatório "Acertos do período", o pacote para a contabilidade. */
function Historico({
  acertos,
  canEstornar,
}: {
  acertos: AcertoResumo[];
  canEstornar: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const estornar = (a: AcertoResumo) => {
    const motivo = window.prompt(`Motivo do estorno do acerto ${a.numDoc ?? ""}:`);
    if (motivo === null) return;
    setErro(null);
    start(async () => {
      try {
        const r = await estornarAcerto(a.id, motivo);
        if (!r.ok) {
          setErro(r.error ?? "Falha ao estornar.");
          return;
        }
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao estornar.");
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-0">
        {erro && <p className="p-3 text-sm text-[var(--color-danger)]">{erro}</p>}
        <Table wrapperClassName="max-h-[70vh] scroll-x-always" className="min-w-[1100px]">
          <THead className="sticky top-0 z-10">
            <tr>
              <TH>Documento</TH>
              <TH>Data</TH>
              <TH>Favorecido</TH>
              <TH className="text-right">Transferido</TH>
              <TH className="text-right">Vinculado</TH>
              <TH className="text-right">Diferença</TH>
              <TH>Projetos</TH>
              <TH>Status</TH>
              {canEstornar && <TH className="text-right">Ação</TH>}
            </tr>
          </THead>
          <tbody>
            {acertos.map((a) => (
              <TR key={a.id}>
                <TD className="whitespace-nowrap font-[family-name:var(--font-mono)]">
                  {a.numDoc ?? "—"}
                </TD>
                <TD className="whitespace-nowrap font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                  {a.dataPagamento ? dateBR(a.dataPagamento) : "—"}
                </TD>
                <TD className="max-w-[180px] truncate">{a.favorecido ?? "—"}</TD>
                <TD className="text-right font-[family-name:var(--font-mono)]">
                  {brl0(a.valorTransferido)}
                </TD>
                <TD className="text-right font-[family-name:var(--font-mono)]">
                  {brl0(a.totalVinculado)}
                </TD>
                <TD className="text-right font-[family-name:var(--font-mono)]">
                  {a.diferencaTipo === "NENHUMA" ? (
                    "—"
                  ) : (
                    <span
                      className={
                        a.diferencaTipo === "JUROS"
                          ? "text-[var(--color-danger)]"
                          : "text-[var(--color-success)]"
                      }
                      title={
                        a.diferencaTipo === "JUROS"
                          ? "Juros e multas — despesa financeira do período"
                          : "Desconto obtido — receita financeira do período"
                      }
                    >
                      {brl0(a.diferencaValor)}
                    </span>
                  )}
                </TD>
                <TD className="max-w-[220px] truncate text-[var(--color-ink3)]">
                  {a.obras.join(", ") || "—"}
                </TD>
                <TD>
                  {a.estornado ? (
                    <Badge tone="neutral">Estornado</Badge>
                  ) : (
                    <Badge tone="success">Concluído</Badge>
                  )}
                </TD>
                {canEstornar && (
                  <TD className="text-right">
                    {!a.estornado && (
                      <button
                        onClick={() => estornar(a)}
                        disabled={pending}
                        className="text-sm text-[var(--color-danger)] hover:underline"
                      >
                        Estornar
                      </button>
                    )}
                  </TD>
                )}
              </TR>
            ))}
            {acertos.length === 0 && (
              <TR>
                <TD colSpan={canEstornar ? 9 : 8} className="py-8 text-center text-[var(--color-ink4)]">
                  Nenhum acerto registrado.
                </TD>
              </TR>
            )}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}

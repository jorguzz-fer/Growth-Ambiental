"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addStockItem, addStockMovement, deleteStockItem, estornarMovimento, setStockItemAtivo, updateStockItem } from "@/lib/actions/estoque";
import { ENTRADA_ORIGENS, SAIDA_MOTIVOS, UNIDADES } from "@/lib/estoque-regras";
import { useCrisFormulario } from "@/components/app/cris-contexto";
import { formularioDoMovimento, movimentoDaProposta } from "@/lib/estoque-cris";
import type { DespesaParaEstoque } from "@/lib/queries";
import type { ConfrontoDaObra, ConsumoDaObra } from "@/lib/calc/estoque-obra";
import { EstoqueDocs, type DocDoMovimento } from "@/components/app/estoque-docs";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface ItemView {
  id: string;
  sku: string | null;
  nome: string;
  unidade: string;
  categoria: string | null;
  custoUnit: number;
  minimo: number;
  obs: string | null;
  ativo: boolean;
  saldo: number;
  valorEstoque: number;
}
export interface MovView {
  id: string;
  itemId: string;
  itemNome: string;
  unidade: string;
  tipo: "entrada" | "saida";
  origem: string | null;
  quantidade: number;
  custoUnit: number;
  valor: number;
  data: string | null;
  doc: string | null;
  obs: string | null;
  projectName: string | null;
  responsavel: string | null;
  despesaId: string | null;
  despesaNumDoc: string | null;
  permutaId: string | null;
  permutaDescricao: string | null;
  estornoDeId: string | null;
  estornado: boolean;
}
export interface FiltrosDaTela {
  tab: "itens" | "mov";
  pagina: number;
  itemId: string | null;
  projectId: string | null;
  tipo: "entrada" | "saida" | null;
  de: string | null;
  ate: string | null;
}
interface Opt {
  id: string;
  nome?: string;
  label?: string;
}

function hojeInterno(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
const qtd = (n: number, u: string) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${u}`;

function urlDe(f: Partial<FiltrosDaTela> & { tab: "itens" | "mov" }): string {
  const q = new URLSearchParams();
  q.set("tab", f.tab);
  if (f.pagina && f.pagina > 1) q.set("pagina", String(f.pagina));
  if (f.itemId) q.set("f_item", f.itemId);
  if (f.projectId) q.set("f_obra", f.projectId);
  if (f.tipo) q.set("f_tipo", f.tipo);
  if (f.de) q.set("de", f.de);
  if (f.ate) q.set("ate", f.ate);
  return `/estoque?${q.toString()}`;
}

export type ConsumoView = ConsumoDaObra & { projectName: string };
export type ConfrontoView = ConfrontoDaObra & { projectName: string };

export function EstoqueManager({ items, movimentos, filtros, projetos, despesas, permutas, docsPorMov, r2, consumo, confronto, canCriar, canEditar, canExcluir, tipoInicial = "entrada" }: { tipoInicial?: "entrada" | "saida"; items: ItemView[]; movimentos: { rows: MovView[]; total: number; pagina: number; porPagina: number }; filtros: FiltrosDaTela; projetos: Opt[]; despesas: DespesaParaEstoque[]; permutas: Opt[]; docsPorMov: Record<string, DocDoMovimento[]>; r2: boolean; consumo: ConsumoView[]; confronto: ConfrontoView[]; canCriar: boolean; canEditar: boolean; canExcluir: boolean }) {
  const ativos = items.filter((i) => i.ativo);
  const valorTotal = Math.round(ativos.reduce((a, i) => a + i.valorEstoque, 0) * 100) / 100;
  const abaixoMin = ativos.filter((i) => i.minimo > 0 && i.saldo <= i.minimo).length;
  const negativos = ativos.filter((i) => i.saldo < 0).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Resumo label="Itens ativos" value={String(ativos.length)} />
        <Resumo label="Valor em estoque (a custo)" value={brl0(valorTotal)} tone="accent" />
        <Resumo label="Abaixo do mínimo" value={String(abaixoMin)} tone={abaixoMin > 0 ? "neg" : undefined} />
        <Resumo label="Saldo negativo" value={String(negativos)} tone={negativos > 0 ? "neg" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
      <div className="flex w-fit gap-1 rounded-[8px] bg-[var(--color-surface3)] p-1">
        {(["itens", "mov"] as const).map((t) => (
          <Link key={t} href={urlDe({ tab: t })} className={`rounded-[6px] px-3 py-1.5 text-xs transition-colors ${filtros.tab === t ? "bg-white text-[var(--color-ink)] shadow-sm" : "text-[var(--color-ink3)]"}`}>
            {t === "itens" ? "Itens & Saldo" : "Entradas & Saídas"}
          </Link>
        ))}
      </div>
      {/* Prompt Y2 — a baixa (saída) existia só dentro da segunda aba e não era vista. */}
      {canCriar && ativos.length > 0 && (
        <>
          <Link href="/estoque?tab=mov&lancar=entrada" className="rounded-[8px] border border-[var(--color-success)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--color-success)] hover:bg-[var(--color-success)]/10">↓ Dar entrada</Link>
          <Link href="/estoque?tab=mov&lancar=saida" data-atalho-baixa className="rounded-[8px] border border-[var(--color-danger)]/40 px-3 py-1.5 text-xs font-semibold text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">↑ Dar baixa (saída para projeto)</Link>
        </>
      )}
      </div>

      {filtros.tab === "itens" ? (
        <ItensTab items={items} canCriar={canCriar} canEditar={canEditar} canExcluir={canExcluir} />
      ) : (
        <MovTab key={tipoInicial} tipoInicial={tipoInicial} items={ativos} movimentos={movimentos} filtros={filtros} projetos={projetos} despesas={despesas} permutas={permutas} canCriar={canCriar} todosItens={items} docsPorMov={docsPorMov} r2={r2} consumo={consumo} confronto={confronto} />
      )}
    </div>
  );
}

function Resumo({ label, value, tone }: { label: string; value: string; tone?: "accent" | "neg" }) {
  const color = tone === "accent" ? "var(--color-accent)" : tone === "neg" ? "var(--color-danger)" : "var(--color-ink)";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">{label}</p>
        <p className="mt-1 text-xl font-semibold" style={{ color }}>{value}</p>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Itens ───────────────────────── */

function CamposDoItem({ v, onChange }: { v: Record<string, string>; onChange: (k: string, val: string) => void }) {
  return (
    <>
      <div className="sm:col-span-2"><Label>Nome *</Label><Input value={v.nome} onChange={(e) => onChange("nome", e.target.value)} aria-label="Nome do material" /></div>
      <div><Label>SKU / Código</Label><Input value={v.sku} onChange={(e) => onChange("sku", e.target.value)} /></div>
      <div>
        <Label>Unidade *</Label>
        <Select value={v.unidade} onChange={(e) => onChange("unidade", e.target.value)} aria-label="Unidade">
          {!UNIDADES.includes(v.unidade as (typeof UNIDADES)[number]) && v.unidade && <option value={v.unidade}>{v.unidade} (antiga)</option>}
          {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
      </div>
      <div><Label>Categoria</Label><Input value={v.categoria} onChange={(e) => onChange("categoria", e.target.value)} /></div>
      <div><Label>Custo unit. (R$)</Label><Input type="number" step="0.01" min="0" value={v.custoUnit} onChange={(e) => onChange("custoUnit", e.target.value)} aria-label="Custo unitário" /></div>
      <div><Label>Estoque mínimo</Label><Input type="number" step="0.001" min="0" value={v.minimo} onChange={(e) => onChange("minimo", e.target.value)} /></div>
      <div className="sm:col-span-3"><Label>Observação</Label><Input value={v.obs} onChange={(e) => onChange("obs", e.target.value)} /></div>
    </>
  );
}
const fdDe = (v: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, x] of Object.entries(v)) fd.set(k, x);
  return fd;
};
const VAZIO = { nome: "", sku: "", unidade: "un", categoria: "", custoUnit: "", minimo: "", obs: "" };

function ItensTab({ items, canCriar, canEditar, canExcluir }: { items: ItemView[]; canCriar: boolean; canEditar: boolean; canExcluir: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [novo, setNovo] = useState<Record<string, string>>(VAZIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<Record<string, string>>(VAZIO);

  const cadastrar = () =>
    start(async () => {
      const r = await addStockItem(fdDe(novo));
      setMsg(r.ok ? { ok: true, texto: "Material cadastrado." } : { ok: false, texto: r.error });
      if (r.ok) {
        setNovo(VAZIO);
        router.refresh();
      }
    });
  const abrirEdicao = (i: ItemView) => {
    setEditando(i.id);
    setEdicao({ nome: i.nome, sku: i.sku ?? "", unidade: i.unidade, categoria: i.categoria ?? "", custoUnit: String(i.custoUnit), minimo: String(i.minimo), obs: i.obs ?? "" });
  };
  const salvarEdicao = (id: string) =>
    start(async () => {
      const r = await updateStockItem(id, fdDe(edicao));
      setMsg(r.ok ? { ok: true, texto: r.aviso ?? "Cadastro atualizado. Movimentos já lançados mantêm o custo da época." } : { ok: false, texto: r.error });
      if (r.ok) {
        setEditando(null);
        router.refresh();
      }
    });
  const alternarAtivo = (i: ItemView) =>
    start(async () => {
      const r = await setStockItemAtivo(i.id, !i.ativo);
      setMsg(r.ok ? { ok: true, texto: i.ativo ? "Material inativado: some das opções; o histórico fica." : "Material reativado." } : { ok: false, texto: r.error });
      router.refresh();
    });
  const excluir = (i: ItemView) => {
    if (!window.confirm(`Excluir "${i.nome}"? Só é possível sem movimentos; com movimentos, o certo é inativar.`)) return;
    start(async () => {
      const r = await deleteStockItem(i.id);
      if (r.ok) {
        setMsg({ ok: true, texto: "Material excluído." });
        router.refresh();
        return;
      }
      if (r.podeInativar && window.confirm(`${r.error}\n\nInativar "${i.nome}" agora?`)) {
        const r2 = await setStockItemAtivo(i.id, false);
        setMsg(r2.ok ? { ok: true, texto: "Material inativado; o histórico fica." } : { ok: false, texto: r2.error });
        router.refresh();
      } else setMsg({ ok: false, texto: r.error });
    });
  };

  return (
    <div className="space-y-4">
      {canCriar && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Novo material</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <CamposDoItem v={novo} onChange={(k, val) => setNovo({ ...novo, [k]: val })} />
              <div className="flex items-end sm:col-span-1"><Button type="button" className="w-full" disabled={pending} onClick={cadastrar}>Cadastrar</Button></div>
            </div>
          </CardContent>
        </Card>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[12.5px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{msg.texto}</p>}
      <Card>
        <CardContent className="p-0">
          <div className="tbl-scroll overflow-x-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Material</TH>
                  <TH>SKU</TH>
                  <TH>Categoria</TH>
                  <TH className="text-right">Custo unit.</TH>
                  <TH className="text-right">Mínimo</TH>
                  <TH className="text-right">Saldo</TH>
                  <TH className="text-right">Valor em estoque</TH>
                  {(canEditar || canExcluir) && <TH></TH>}
                </tr>
              </THead>
              <tbody>
                {items.map((i) => {
                  const baixo = i.ativo && i.minimo > 0 && i.saldo <= i.minimo;
                  if (editando === i.id)
                    return (
                      <TR key={i.id}>
                        <TD colSpan={8}>
                          <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-6">
                            <CamposDoItem v={edicao} onChange={(k, val) => setEdicao({ ...edicao, [k]: val })} />
                            <div className="flex items-end gap-2 sm:col-span-1">
                              <Button type="button" size="sm" disabled={pending} onClick={() => salvarEdicao(i.id)}>Salvar</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
                            </div>
                          </div>
                        </TD>
                      </TR>
                    );
                  return (
                    <TR key={i.id} className={i.ativo ? "" : "opacity-60"}>
                      <TD className="font-medium text-[var(--color-ink)]">
                        {i.nome}
                        {!i.ativo && <Badge tone="neutral" className="ml-2">inativo</Badge>}
                        {baixo && <Badge tone="danger" className="ml-2">abaixo do mínimo</Badge>}
                        {i.saldo < 0 && <Badge tone="warning" className="ml-2">saldo negativo</Badge>}
                      </TD>
                      <TD className="text-[var(--color-ink3)]">{i.sku ?? "—"}</TD>
                      <TD>{i.categoria ?? "—"}</TD>
                      <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(i.custoUnit)}</TD>
                      <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{i.minimo > 0 ? qtd(i.minimo, i.unidade) : "—"}</TD>
                      <TD className={`text-right font-[family-name:var(--font-mono)] font-semibold ${i.saldo < 0 || baixo ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]"}`} data-saldo={i.saldo}>{qtd(i.saldo, i.unidade)}</TD>
                      <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-accent)]">{brl0(i.valorEstoque)}</TD>
                      {(canEditar || canExcluir) && (
                        <TD className="whitespace-nowrap text-right text-[12px]">
                          {canEditar && <button type="button" className="text-[var(--color-accent2)] hover:underline" onClick={() => abrirEdicao(i)}>Editar</button>}
                          {canEditar && <button type="button" className="ml-3 text-[var(--color-ink3)] hover:underline" disabled={pending} onClick={() => alternarAtivo(i)}>{i.ativo ? "Inativar" : "Reativar"}</button>}
                          {canExcluir && <button type="button" className="ml-3 text-[var(--color-danger)] hover:underline" disabled={pending} onClick={() => excluir(i)}>Excluir</button>}
                        </TD>
                      )}
                    </TR>
                  );
                })}
                {items.length === 0 && (
                  <TR><TD colSpan={8} className="py-8 text-center text-[var(--color-ink4)]">Nenhum material cadastrado.</TD></TR>
                )}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────────────────────── Movimentos ───────────────────────── */

function MovTab({ items, todosItens, movimentos, filtros, projetos, despesas, permutas, canCriar, docsPorMov, r2, consumo, confronto, tipoInicial }: { tipoInicial: "entrada" | "saida"; items: ItemView[]; todosItens: ItemView[]; movimentos: { rows: MovView[]; total: number; pagina: number; porPagina: number }; filtros: FiltrosDaTela; projetos: Opt[]; despesas: DespesaParaEstoque[]; permutas: Opt[]; canCriar: boolean; docsPorMov: Record<string, DocDoMovimento[]>; r2: boolean; consumo: ConsumoView[]; confronto: ConfrontoView[] }) {
  const router = useRouter();
  const [docsAbertos, setDocsAbertos] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [tipo, setTipo] = useState<"entrada" | "saida">(tipoInicial);
  const [itemId, setItemId] = useState("");
  const [origem, setOrigem] = useState<string>(tipoInicial === "entrada" ? ENTRADA_ORIGENS[0] : SAIDA_MOTIVOS[0]);
  const [quantidade, setQuantidade] = useState("");
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState(hojeInterno());
  const [doc, setDoc] = useState("");
  const [despesaId, setDespesaId] = useState("");
  const [permutaId, setPermutaId] = useState("");
  const [obs, setObs] = useState("");
  const item = items.find((i) => i.id === itemId) ?? null;
  const despesa = despesas.find((d) => d.id === despesaId) ?? null;

  const trocarTipo = (t: "entrada" | "saida") => {
    setTipo(t);
    setOrigem(t === "entrada" ? ENTRADA_ORIGENS[0] : SAIDA_MOTIVOS[0]);
    setDespesaId("");
    setPermutaId("");
  };
  const limpar = () => {
    setItemId("");
    setQuantidade("");
    setProjectId("");
    setDoc("");
    setDespesaId("");
    setPermutaId("");
    setObs("");
  };
  const registrar = (confirmar = false) => {
    setMsg(null);
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("tipo", tipo);
    fd.set("origem", origem);
    fd.set("quantidade", quantidade);
    fd.set("projectId", projectId);
    fd.set("data", data);
    fd.set("doc", doc);
    fd.set("despesaId", tipo === "entrada" ? despesaId : "");
    fd.set("permutaId", tipo === "entrada" ? permutaId : "");
    fd.set("obs", obs);
    if (confirmar) fd.set("confirmar", "1");
    start(async () => {
      const r = await addStockMovement(fd);
      if (!r.ok && r.precisaConfirmar) {
        if (window.confirm(r.error)) registrar(true);
        else setMsg({ ok: false, texto: "Saída não lançada." });
        return;
      }
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setMsg({ ok: true, texto: (tipo === "entrada" ? "Entrada registrada" : "Saída registrada") + (r.aviso ? ` — ${r.aviso}` : ".") });
      limpar();
      router.refresh();
    });
  };
  const estornar = (m: MovView) => {
    const motivo = window.prompt(`Estornar ${m.tipo} de ${qtd(m.quantidade, m.unidade)} de ${m.itemNome}? Um lançamento inverso é criado; o original fica no histórico. Motivo:`);
    if (motivo == null) return;
    start(async () => {
      const r = await estornarMovimento(m.id, motivo);
      setMsg(r.ok ? { ok: true, texto: "Estorno lançado." } : { ok: false, texto: r.error });
      router.refresh();
    });
  };
  // Prompt Y2 — a Cris preenche a entrada ou a baixa; quem registra é o botão.
  const materiaisCris = items.map((i) => ({ id: i.id, nome: i.nome, sku: i.sku, unidade: i.unidade }));
  const obrasCris = projetos.map((p) => ({ id: p.id, rotulo: p.nome ?? p.label ?? "" }));
  const despesasCris = despesas.map((d) => ({ id: d.id, rotulo: `${d.numDoc ?? "s/ nº"}${d.fornecedor ? ` · ${d.fornecedor}` : ""} · ${brl0(d.valor)}` }));
  useCrisFormulario(canCriar && items.length > 0 ? formularioDoMovimento(materiaisCris, obrasCris, despesasCris) : null, (p) => {
    const { mov, avisos } = movimentoDaProposta(p.valores, materiaisCris, obrasCris, despesasCris, tipo);
    if (mov.tipo && mov.tipo !== tipo) trocarTipo(mov.tipo);
    if (mov.itemId) setItemId(mov.itemId);
    if (mov.quantidade) setQuantidade(mov.quantidade);
    if (mov.origem) setOrigem(mov.origem);
    if (mov.projectId) setProjectId(mov.projectId);
    if (mov.despesaId) {
      setDespesaId(mov.despesaId);
      setPermutaId("");
    }
    if (mov.data) setData(mov.data);
    if (mov.doc) setDoc(mov.doc);
    if (mov.obs) setObs(mov.obs);
    setMsg({ ok: avisos.length === 0, texto: ["A Cris preencheu o movimento. Confira e clique em registrar.", ...avisos].join(" ") });
  });
  const origens = tipo === "entrada" ? ENTRADA_ORIGENS : SAIDA_MOTIVOS;
  const paginas = Math.max(1, Math.ceil(movimentos.total / movimentos.porPagina));

  return (
    <div className="space-y-4">
      {canCriar && items.length > 0 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex gap-2">
              <button type="button" onClick={() => trocarTipo("entrada")} className={`flex-1 rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition-colors ${tipo === "entrada" ? "border-[var(--color-success)] bg-[var(--color-success)]/12 text-[var(--color-success)]" : "border-[var(--color-accent2)]/20 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]"}`}>↓ Dar entrada</button>
              <button type="button" onClick={() => trocarTipo("saida")} className={`flex-1 rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition-colors ${tipo === "saida" ? "border-[var(--color-danger)] bg-[var(--color-danger)]/12 text-[var(--color-danger)]" : "border-[var(--color-accent2)]/20 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]"}`}>↑ Dar baixa</button>
            </div>
            <p className="rounded-[8px] bg-[var(--color-surface2)] px-3 py-2 text-[12px] text-[var(--color-ink2)]">
              {tipo === "entrada"
                ? "Toda entrada aponta a despesa (compra) ou a permuta que trouxe o material — é o lastro do valor. O custo é o do cadastro no momento e fica gravado no movimento."
                : "A saída registra para qual projeto o material foi. Sem efeito contábil: não cria despesa, não altera a DRE nem reclassifica custo — o custo já é da despesa de compra."}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Label>Material *</Label>
                <Select value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label="Material">
                  <option value="">Selecione…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.nome} (saldo {qtd(i.saldo, i.unidade)})</option>)}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>{tipo === "entrada" ? "Origem da entrada" : "Motivo da baixa"}</Label>
                <Select value={origem} onChange={(e) => setOrigem(e.target.value)}>{origens.map((o) => <option key={o} value={o}>{o}</option>)}</Select>
              </div>
              <div>
                <Label>Quantidade *{item ? ` (${item.unidade})` : ""}</Label>
                <Input type="number" step="0.001" min="0" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" aria-label="Quantidade" />
              </div>
              <div>
                <Label>Custo unit. (do cadastro)</Label>
                <Input value={item ? brl0(item.custoUnit) : "—"} readOnly aria-label="Custo unitário gravado" />
              </div>
              {tipo === "entrada" ? (
                <>
                  <div className="sm:col-span-3">
                    <Label>Despesa de compra {permutaId ? "" : "*"}</Label>
                    <Select value={despesaId} onChange={(e) => { setDespesaId(e.target.value); if (e.target.value) setPermutaId(""); }} aria-label="Despesa vinculada">
                      <option value="">— escolha a despesa —</option>
                      {despesas.map((d) => <option key={d.id} value={d.id}>{d.numDoc ?? "s/ nº"}{d.fornecedor ? ` · ${d.fornecedor}` : ""} · {brl0(d.valor)}</option>)}
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Label>ou Permuta {despesaId ? "" : "*"}</Label>
                    <Select value={permutaId} onChange={(e) => { setPermutaId(e.target.value); if (e.target.value) setDespesaId(""); }} aria-label="Permuta vinculada">
                      <option value="">— ou escolha a permuta —</option>
                      {permutas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </Select>
                  </div>
                  {despesa && (
                    <div className="rounded-[8px] border border-[var(--color-line)] bg-white px-3 py-2 text-[12px] text-[var(--color-ink2)] sm:col-span-6" data-despesa-resumo>
                      <strong className="text-[var(--color-ink)]">{despesa.numDoc ?? "Despesa"}</strong> · {despesa.fornecedor ?? "sem fornecedor"} · competência {despesa.competencia ?? "—"} · {brl0(despesa.valor)} · projeto {despesa.projectName ?? "—"}
                      {despesa.entradasSoma > 0 && <span> · já lançado em estoque: {brl0(despesa.entradasSoma)}</span>}
                      <span className="block text-[11px] text-[var(--color-ink3)]">Uma nota com vários itens vira várias entradas apontando a mesma despesa. A despesa não é alterada.</span>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Label>Projeto (opcional — vem da despesa)</Label>
                    <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                      <option value="">— almoxarifado —</option>
                      {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </Select>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <Label>Projeto de destino *</Label>
                  <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Projeto de destino">
                    <option value="">— escolha o projeto —</option>
                    {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </Select>
                </div>
              )}
              <div><Label>Data</Label><DateField value={data} onChange={setData} /></div>
              <div><Label>Documento (NF / requisição)</Label><Input value={doc} onChange={(e) => setDoc(e.target.value)} /></div>
              <div className="sm:col-span-4"><Label>Observação</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} /></div>
              <div className="flex items-end sm:col-span-2">
                <Button type="button" className="w-full" disabled={saving} onClick={() => registrar(false)}>{saving ? "Registrando…" : tipo === "entrada" ? "Registrar entrada" : "Registrar baixa"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {canCriar && items.length === 0 && <p className="text-[12.5px] text-[var(--color-ink3)]">Cadastre um material na aba Itens &amp; Saldo para lançar movimentos.</p>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[12.5px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{msg.texto}</p>}

      <Card>
        <CardContent className="p-4">
          <form method="get" action="/estoque" className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <input type="hidden" name="tab" value="mov" />
            <div><Label>De</Label><Input type="date" name="de" defaultValue={filtros.de ?? ""} /></div>
            <div><Label>Até</Label><Input type="date" name="ate" defaultValue={filtros.ate ?? ""} /></div>
            <div>
              <Label>Material</Label>
              <Select name="f_item" defaultValue={filtros.itemId ?? ""}><option value="">Todos</option>{todosItens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}</Select>
            </div>
            <div>
              <Label>Projeto</Label>
              <Select name="f_obra" defaultValue={filtros.projectId ?? ""}><option value="">Todos</option>{projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select name="f_tipo" defaultValue={filtros.tipo ?? ""}><option value="">Todos</option><option value="entrada">Entrada</option><option value="saida">Saída</option></Select>
            </div>
            <div className="flex items-end"><Button type="submit" variant="outline" className="w-full">Filtrar</Button></div>
          </form>
        </CardContent>
      </Card>

      {/* 4.4 / 4.6 — leitura de gestão: onde o material foi parar × onde foi comprado. Nunca correção. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Consumo por projeto <span className="font-normal text-[var(--color-ink3)]">{filtros.de || filtros.ate ? "no período filtrado" : "desde o início"}</span></h3>
            <p className="mb-2 text-[11.5px] text-[var(--color-ink3)]">Quanto cada projeto retirou, a custo. Sem efeito contábil: o consumo não vira custo do projeto — ele já é, pela despesa de compra.</p>
            {consumo.length === 0 ? <p className="text-[12px] text-[var(--color-ink4)]">Nenhuma saída de consumo.</p> : (
              <ul className="space-y-1.5" data-consumo>
                {consumo.map((c) => (
                  <li key={c.projectId} className="text-[12.5px]">
                    <span className="font-medium text-[var(--color-ink)]">{c.projectName}</span> · <span className="font-[family-name:var(--font-mono)]">{brl0(c.valor)}</span>
                    <span className="block text-[11px] text-[var(--color-ink3)]">{c.itens.slice(0, 5).map((i) => `${i.itemNome} ${qtd(i.quantidade, i.unidade)}`).join(" · ")}{c.itens.length > 5 ? " · …" : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Compra × consumo por projeto</h3>
            <p className="mb-2 text-[11.5px] text-[var(--color-ink3)]">Comprou = entradas cuja despesa é do projeto; consumiu = saídas com destino nele. Diferença positiva: comprou mais do que usou (foi para outro projeto ou está no almoxarifado). É leitura — nada é corrigido automaticamente.</p>
            {confronto.length === 0 ? <p className="text-[12px] text-[var(--color-ink4)]">Sem compras nem consumo no período.</p> : (
              <table className="w-full text-[12px]" data-confronto>
                <thead><tr className="text-[10px] uppercase tracking-wide text-[var(--color-ink4)]"><th className="text-left font-normal">Projeto</th><th className="text-right font-normal">Comprou</th><th className="text-right font-normal">Consumiu</th><th className="text-right font-normal">Diferença</th></tr></thead>
                <tbody className="font-[family-name:var(--font-mono)]">
                  {confronto.map((c) => (
                    <tr key={c.projectId} className="border-t border-[var(--color-line)]">
                      <td className="py-1 font-[family-name:var(--font-sans)] text-[var(--color-ink)]">{c.projectName}</td>
                      <td className="text-right">{brl0(c.comprou)}</td>
                      <td className="text-right">{brl0(c.consumiu)}</td>
                      <td className={`text-right ${Math.abs(c.diferenca) > 0.005 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}`}>{brl0(c.diferenca)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="tbl-scroll overflow-x-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Data</TH>
                  <TH>Material</TH>
                  <TH>Tipo</TH>
                  <TH>Origem / Motivo</TH>
                  <TH className="text-right">Qtd</TH>
                  <TH className="text-right">Custo unit.</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Projeto</TH>
                  <TH>Vínculo</TH>
                  <TH>Responsável</TH>
                  <TH>Docs</TH>
                  {canCriar && <TH></TH>}
                </tr>
              </THead>
              <tbody>
                {movimentos.rows.map((m) => (
                  <Fragment key={m.id}>
                  <TR className={m.estornado ? "opacity-60" : ""} data-mov={m.id}>
                    <TD className="whitespace-nowrap font-[family-name:var(--font-mono)] text-[var(--color-ink2)]">{m.data ? dateBR(m.data) : "—"}</TD>
                    <TD className="font-medium text-[var(--color-ink)]">{m.itemNome}</TD>
                    <TD>
                      <Badge tone={m.tipo === "entrada" ? "success" : "danger"}>{m.tipo === "entrada" ? "Entrada" : "Saída"}</Badge>
                      {m.estornoDeId && <Badge tone="neutral" className="ml-1">estorno</Badge>}
                      {m.estornado && <Badge tone="warning" className="ml-1">estornado</Badge>}
                    </TD>
                    <TD className="text-[var(--color-ink2)]">{m.origem ?? "—"}{m.obs ? <span className="block text-[11px] text-[var(--color-ink4)]">{m.obs}</span> : null}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{qtd(m.quantidade, m.unidade)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(m.custoUnit)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(m.valor)}</TD>
                    <TD className="text-[var(--color-ink2)]">{m.projectName ?? (m.tipo === "entrada" ? "almoxarifado" : "—")}</TD>
                    <TD className="text-[var(--color-ink3)]">{m.despesaId ? `Despesa ${m.despesaNumDoc ?? "s/ nº"}` : m.permutaId ? `Permuta · ${m.permutaDescricao ?? "s/ descrição"}` : m.doc ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-[var(--color-ink3)]">{m.responsavel ?? "—"}</TD>
                    <TD className="whitespace-nowrap text-[12px]">
                      <button type="button" className="text-[var(--color-accent2)] hover:underline" aria-expanded={docsAbertos === m.id} onClick={() => setDocsAbertos(docsAbertos === m.id ? null : m.id)}>
                        {(docsPorMov[m.id]?.length ?? 0) > 0 ? `${docsPorMov[m.id].length} doc(s)` : "anexar"}
                      </button>
                    </TD>
                    {canCriar && (
                      <TD className="text-right text-[12px]">
                        {!m.estornado && !m.estornoDeId && <button type="button" className="text-[var(--color-danger)] hover:underline" disabled={saving} onClick={() => estornar(m)}>Estornar</button>}
                      </TD>
                    )}
                  </TR>
                  {docsAbertos === m.id && (
                    <TR>
                      <TD colSpan={12} className="bg-[var(--color-surface2)]/40">
                        <EstoqueDocs movimentoId={m.id} tipoMovimento={m.tipo} docs={docsPorMov[m.id] ?? []} canEdit={canCriar} r2={r2} />
                      </TD>
                    </TR>
                  )}
                  </Fragment>
                ))}
                {movimentos.rows.length === 0 && (
                  <TR><TD colSpan={12} className="py-8 text-center text-[var(--color-ink4)]">Nenhuma movimentação.</TD></TR>
                )}
              </tbody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-[12px] text-[var(--color-ink3)]">
            <span>{movimentos.total} movimento(s) · página {movimentos.pagina} de {paginas}</span>
            <span className="flex gap-3">
              {movimentos.pagina > 1 && <Link className="text-[var(--color-accent2)] hover:underline" href={urlDe({ ...filtros, tab: "mov", pagina: movimentos.pagina - 1 })}>← anterior</Link>}
              {movimentos.pagina < paginas && <Link className="text-[var(--color-accent2)] hover:underline" href={urlDe({ ...filtros, tab: "mov", pagina: movimentos.pagina + 1 })}>próxima →</Link>}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

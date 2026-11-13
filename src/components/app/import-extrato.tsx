"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useCris } from "@/components/app/cris-contexto";
import { EVENTO_IMPORTAR_EXTRATO } from "@/components/app/cris-conciliacao";
import type { PropostaDeImportacao } from "@/lib/cris";
import { useRouter } from "next/navigation";
import {
  importCash,
  extractExtratoPdf,
  matchCandidatosMovimento,
  pairMovimento,
  criarLancamentoDoExtrato,
  type ImportCashRow,
  type CandidatoMatch,
} from "@/lib/actions/caixa";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { categoriasDeDespesa } from "@/lib/calc/natureza-dre";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dateBR } from "@/lib/utils";
import { parseMoney, type PreviewRow } from "@/lib/extrato-parse";
import { linhasDaPlanilha } from "@/lib/extrato-planilha";

interface Conta {
  id: string;
  banco: string;
  cc: string | null;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─────────────────────────── Componente ────────────────────────────────────

export function ImportExtratoButton({
  contas,
  aiConfigured = false,
  projetos = [],
  projectId = "",
  contaInicial = "",
}: {
  contas: Conta[];
  aiConfigured?: boolean;
  projetos?: { id: string; nome: string }[];
  /**
   * obra da tela (Prompt A): os movimentos de caixa vão para a versão de
   * trabalho dela. Vazia no Caixa por conta (Prompt AT §3 e §4.4): o
   * movimento nasce só com a conta.
   */
  projectId?: string;
  /** Prompt AT §4.4 — a conta escolhida na tela já vem preenchida. */
  contaInicial?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const cris = useCris();
  // Prompt AT §8.2 — terminou de importar: oferece conciliar os pendentes com a Cris.
  const [importou, setImportou] = useState(false);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reading, startReading] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [bankAccountId, setBankAccountId] = useState(contaInicial);
  const [saldoFinal, setSaldoFinal] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [resumo, setResumo] = useState<{ reconhecidos: number; ignorados: number } | null>(null);
  // Prompt AT §8.3.3 — a Cris leu o extrato (`ler_extrato`): o MESMO diálogo abre
  // já preenchido, com a conta proposta. Quem importa é o botão do diálogo.
  useEffect(() => {
    const abrir = (e: Event) => {
      const p = (e as CustomEvent<PropostaDeImportacao>).detail;
      if (!p?.linhas?.length) return;
      setErro(null);
      setMsg(null);
      setImportou(false);
      if (p.contaSugerida && contas.some((c) => c.id === p.contaSugerida)) setBankAccountId(p.contaSugerida);
      if (p.saldoFinal != null) setSaldoFinal(String(p.saldoFinal));
      setPreview(p.linhas.map((l) => ({ incluir: true, data: l.data, descricao: l.descricao, doc: l.doc, valor: l.valor, tipo: l.valor >= 0 ? "entrada" : "saida" })));
      setResumo({ reconhecidos: p.linhas.length, ignorados: 0 });
      setTimeout(() => caixaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    };
    window.addEventListener(EVENTO_IMPORTAR_EXTRATO, abrir);
    return () => window.removeEventListener(EVENTO_IMPORTAR_EXTRATO, abrir);
  }, [contas]);
  // Pareamento (modal): linha em conciliação, candidatos e estados de carga.
  const [matching, setMatching] = useState<PreviewRow | null>(null);
  const [cands, setCands] = useState<CandidatoMatch[] | null>(null);
  const [loadingCands, startCands] = useTransition();
  const [pairing, startPairing] = useTransition();
  const [modalErro, setModalErro] = useState<string | null>(null);
  // Busca manual dentro do modal de pareamento.
  const [buscaPar, setBuscaPar] = useState("");
  // Modal "Adicionar": cria o lançamento JÁ CONCILIADO (pago/recebido).
  const [adicionando, setAdicionando] = useState<PreviewRow | null>(null);
  const [addProjeto, setAddProjeto] = useState("");
  const [addObs, setAddObs] = useState("");
  // Prompt S, 3-C — a despesa criada do extrato precisa de categoria DRE (sem
  // ela a DRE a descarta em silêncio); só as de natureza devedora.
  const [addCategoria, setAddCategoria] = useState("");
  const [addErro, setAddErro] = useState<string | null>(null);
  const [addBusy, startAdd] = useTransition();

  const isPdfOrImage = (file: File) =>
    file.type === "application/pdf" || file.type.startsWith("image/");

  async function onFile(file: File) {
    setMsg(null);
    setErro(null);
    setPreview(null);
    // PDF/imagem: leitura por IA no servidor (mesma tela de conferência).
    if (isPdfOrImage(file)) {
      const fd = new FormData();
      fd.set("file", file);
      if (bankAccountId) fd.set("bankAccountId", bankAccountId);
      startReading(async () => {
        try {
          const res = await extractExtratoPdf(fd);
          if (res.error) {
            setErro(res.error);
            return;
          }
          const rows: PreviewRow[] = res.movimentos.map((m) => ({
            incluir: true,
            data: m.data,
            descricao: m.descricao,
            doc: m.doc,
            valor: m.valor,
            tipo: m.valor >= 0 ? "entrada" : "saida",
          }));
          if (rows.length === 0) {
            setErro(
              "Nenhuma movimentação foi reconhecida no PDF. Verifique se o extrato está legível (não protegido/escaneado sem texto).",
            );
            return;
          }
          setPreview(rows);
          setResumo({ reconhecidos: rows.length, ignorados: 0 });
          if (res.saldoFinal != null && !saldoFinal) setSaldoFinal(String(res.saldoFinal));
        } catch (e) {
          setErro(e instanceof Error ? e.message : "Falha ao ler o PDF do extrato.");
        }
      });
      return;
    }
    // XLSX/CSV: parsing local (comportamento existente, inalterado).
    try {
      // Prompt AT §8.3.1: a mesma leitura da ferramenta `ler_extrato` da Cris.
      const res = linhasDaPlanilha(await file.arrayBuffer());
      if (res.rows.length === 0) {
        setErro(
          `Nenhum lançamento com valor foi reconhecido (${res.ignorados} linhas ignoradas). Confira as colunas de Data e Valor do arquivo.`,
        );
        return;
      }
      setPreview(res.rows);
      setResumo({ reconhecidos: res.reconhecidos, ignorados: res.ignorados });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    }
  }

  const visiveis = preview ?? [];
  const totEntradas = visiveis
    .filter((r) => r.tipo === "entrada")
    .reduce((a, r) => a + r.valor, 0);
  const totSaidas = visiveis
    .filter((r) => r.tipo === "saida")
    .reduce((a, r) => a + Math.abs(r.valor), 0);

  // Remove uma linha da conferência por REFERÊNCIA (robusto a mudanças de índice
  // enquanto o modal de pareamento está aberto).
  const removeRow = (r: PreviewRow) =>
    setPreview((s) => {
      const next = s ? s.filter((x) => x !== r) : s;
      return next && next.length ? next : null;
    });

  function carregarCandidatos(r: PreviewRow, termo: string) {
    startCands(async () => {
      try {
        const res = await matchCandidatosMovimento(
          { data: r.data, descricao: r.descricao, valor: r.valor, doc: r.doc },
          termo,
        );
        setCands(res.candidatos);
      } catch {
        setModalErro("Falha ao buscar candidatos de conciliação.");
        setCands([]);
      }
    });
  }

  function abrirParear(r: PreviewRow) {
    setModalErro(null);
    setCands(null);
    setBuscaPar("");
    setMatching(r);
    carregarCandidatos(r, "");
  }

  /** Abre o cadastro rápido que cria o lançamento JÁ conciliado. */
  function abrirAdicionar(r: PreviewRow) {
    setAddErro(null);
    setAddObs(r.descricao);
    // A obra da tela, não a primeira da lista (Prompt A, 12).
    setAddProjeto(projectId);
    setAdicionando(r);
  }

  function confirmarAdicionar() {
    const r = adicionando;
    if (!r) return;
    if (!addProjeto) {
      setAddErro("Selecione o projeto.");
      return;
    }
    setAddErro(null);
    startAdd(async () => {
      const res = await criarLancamentoDoExtrato({
        mov: { data: r.data, descricao: r.descricao, valor: r.valor, doc: r.doc },
        bankAccountId: bankAccountId || null,
        projectId: addProjeto,
        caixaProjectId: projectId,
        obs: addObs || null,
        categoriaDre: r.tipo === "saida" ? addCategoria || null : null,
      });
      if (res.ok) {
        setAdicionando(null);
        removeRow(r);
        setMsg(
          r.tipo === "saida"
            ? "Despesa criada e já marcada como PAGA (conciliada com o extrato)."
            : "Conta a receber criada e já marcada como RECEBIDA (conciliada com o extrato).",
        );
        router.refresh();
      } else {
        setAddErro(res.error ?? "Falha ao criar o lançamento.");
      }
    });
  }

  function confirmarPar(c: CandidatoMatch) {
    const r = matching;
    if (!r) return;
    setModalErro(null);
    startPairing(async () => {
      const res = await pairMovimento({
        mov: { data: r.data, descricao: r.descricao, valor: r.valor, doc: r.doc },
        bankAccountId: bankAccountId || null,
        projectId,
        alvoId: c.id,
        alvoTipo: c.tipo,
      });
      if (res.ok) {
        setMatching(null);
        setCands(null);
        removeRow(r);
        setMsg(
          `Movimento conciliado com ${c.tipo === "despesa" ? "a despesa" : "a conta a receber"} de ${c.nome}.`,
        );
        router.refresh();
      } else {
        setModalErro(res.error ?? "Falha ao conciliar o movimento.");
      }
    });
  }

  /** Importa as linhas restantes como movimentos de caixa (concilia automático). */
  function importarRestantes() {
    if (!preview || preview.length === 0) return;
    setErro(null);
    const rows: ImportCashRow[] = preview.map((r) => ({
      data: r.data || undefined,
      descricao: r.descricao,
      valor: r.valor,
      doc: r.doc || undefined,
      cat: "extrato",
    }));
    const saldo = parseMoney(saldoFinal);
    start(async () => {
      try {
        const res = await importCash({
          rows,
          bankAccountId: bankAccountId || null,
          saldoFinal: saldo,
          projectId,
        });
        const parts = [`${res.inserted} lançamentos importados`];
        if (res.conciliated > 0) parts.push(`${res.conciliated} conciliados automaticamente`);
        if (res.skipped > 0) parts.push(`${res.skipped} ignorados (já importados)`);
        if (res.saldoUpdated && saldo != null) parts.push(`saldo atualizado para ${brl(saldo)}`);
        setMsg(parts.join(" · ") + ".");
        setImportou(res.inserted - res.conciliated > 0);
        setPreview(null);
        setResumo(null);
        setSaldoFinal("");
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha na importação.");
      }
    });
  }

  return (
    <div className="space-y-3" ref={caixaRef} data-importar-extrato>
      <div className="rounded-[10px] border border-[var(--color-accent2)]/12 bg-[var(--color-surface2)] p-4">
        <input
          ref={inputRef}
          type="file"
          accept={
            aiConfigured
              ? ".xlsx,.xls,.csv,application/pdf,image/png,image/jpeg,image/webp"
              : ".xlsx,.xls,.csv,application/pdf"
          }
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-56">
            <Label>Conta corrente do extrato</Label>
            <Select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
              <option value="">Selecione a conta…</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} · {c.cc || "s/ conta"}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <Label>Saldo final (opcional)</Label>
            <Input
              value={saldoFinal}
              onChange={(e) => setSaldoFinal(e.target.value)}
              placeholder="detecta do extrato"
            />
          </div>
          <Button
            variant="outline"
            disabled={pending || reading || !bankAccountId}
            onClick={() => inputRef.current?.click()}
          >
            {reading ? "Lendo PDF…" : "Selecionar arquivo (XLSX/CSV/PDF)"}
          </Button>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-ink3)]">
          Selecione a conta e o arquivo do extrato (XLSX, CSV ou <strong>PDF</strong>).
          O sistema lê Data, Histórico, Documento e Valor, mostra uma{" "}
          <strong>pré-visualização</strong> para você revisar e escolher o que
          importar, e concilia com as despesas/receitas previstas. Lançamentos já
          importados são ignorados. O PDF original fica armazenado para auditoria.
          {aiConfigured
            ? " Com IA ativa, também lê extratos em imagem e PDFs escaneados."
            : " (Só PDF com texto; escaneados/imagem exigem IA — peça a configuração da IA em Configurações → Diagnóstico de IA.)"}
        </p>
        {!bankAccountId && contas.length === 0 && (
          <p className="mt-1 text-[11.5px] text-[var(--color-warning)]">
            Cadastre uma conta corrente em Contas Correntes para importar o extrato.
          </p>
        )}
        {erro && <p className="mt-2 text-xs text-[var(--color-danger)]">{erro}</p>}
        {msg && <p className="mt-2 text-xs text-[var(--color-success)]">{msg}</p>}
        {importou && cris && (
          <button type="button" className="mt-1 text-xs text-[var(--color-accent2)] hover:underline" data-conciliar-com-cris onClick={() => cris.perguntar("Concilie comigo os movimentos pendentes que acabei de importar, em rodadas de até 20, do mais antigo para o mais novo.")}>
            Conciliar os pendentes com a Cris →
          </button>
        )}
      </div>

      {/* Pré-visualização / triagem: cada linha tem 3 ações (Adicionar / Parear /
          Ignorar). O que sobrar pode ser importado em lote como movimento. */}
      {preview && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                  Pré-visualização do extrato
                </h3>
                <Badge tone="neutral">{visiveis.length} pendentes</Badge>
                {resumo && resumo.ignorados > 0 && (
                  <Badge tone="warning">{resumo.ignorados} ignorados (saldo/total)</Badge>
                )}
              </div>
              <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink3)]">
                Adicionar = cadastra · Parear = concilia com projeção · Ignorar = descarta
              </p>
            </div>

            <div className="tbl-scroll max-h-[440px] overflow-auto rounded-[8px] border border-[var(--color-accent2)]/12">
              <table className="w-full border-collapse text-[12.5px]">
                <thead className="sticky top-0 z-10 bg-[var(--color-surface2)]">
                  <tr className="text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                    <th className="px-2 py-2">Data</th>
                    <th className="px-2 py-2">Descrição</th>
                    <th className="px-2 py-2">Documento</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((r, i) => (
                    <tr key={i} className="border-t border-[var(--color-accent2)]/8">
                      <td className="whitespace-nowrap px-2 py-1.5 font-[family-name:var(--font-mono)] text-[var(--color-ink2)]">
                        {r.data ? dateBR(r.data) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-[var(--color-ink)]">{r.descricao}</td>
                      <td className="px-2 py-1.5 font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                        {r.doc || "—"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-1.5 text-right font-[family-name:var(--font-mono)] ${
                          r.valor < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
                        }`}
                      >
                        {brl(r.valor)}
                      </td>
                      <td className="px-2 py-1.5">
                        <Badge tone={r.tipo === "entrada" ? "success" : "danger"}>
                          {r.tipo === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => abrirAdicionar(r)}
                            className="rounded-[6px] bg-[var(--color-accent2)] px-2 py-1 text-[11px] font-medium text-white hover:opacity-90"
                            title={
                              r.tipo === "saida"
                                ? "Cadastrar a despesa já PAGA (conciliada com o extrato)"
                                : "Cadastrar a conta a receber já RECEBIDA (conciliada com o extrato)"
                            }
                          >
                            Adicionar
                          </button>
                          <button
                            onClick={() => abrirParear(r)}
                            className="rounded-[6px] border border-[var(--color-accent2)]/40 px-2 py-1 text-[11px] font-medium text-[var(--color-accent2)] hover:bg-[var(--color-accent4)]"
                            title="Parear com uma despesa/receita já lançada"
                          >
                            Parear
                          </button>
                          <button
                            onClick={() => removeRow(r)}
                            className="rounded-[6px] border border-[var(--color-accent2)]/20 px-2 py-1 text-[11px] text-[var(--color-ink3)] hover:bg-[var(--color-surface2)]"
                            title="Ignorar esta linha"
                          >
                            Ignorar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visiveis.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-6 text-center text-[var(--color-ink4)]">
                        Todas as linhas foram tratadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-[var(--color-ink3)]">
                Entradas <strong className="text-[var(--color-success)]">{brl(totEntradas)}</strong> ·
                Saídas <strong className="text-[var(--color-danger)]">{brl(totSaidas)}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPreview(null)} disabled={pending}>
                  Fechar
                </Button>
                <Button
                  variant="outline"
                  onClick={importarRestantes}
                  disabled={pending || visiveis.length === 0}
                  title="Importa as linhas restantes como movimentos de caixa (concilia automaticamente por valor/mês)"
                >
                  {pending ? "Importando…" : `Importar ${visiveis.length} como movimento`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de pareamento (Parear): candidatos de conciliação. */}
      {matching && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!pairing) {
              setMatching(null);
              setCands(null);
            }
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-[12px] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                Parear movimento com{" "}
                {matching.tipo === "saida" ? "conta a pagar" : "conta a receber"}
              </h3>
              <button
                onClick={() => {
                  if (!pairing) {
                    setMatching(null);
                    setCands(null);
                  }
                }}
                className="text-[var(--color-ink3)] hover:text-[var(--color-ink)]"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-[12px] text-[var(--color-ink3)]">
              {matching.data ? dateBR(matching.data) : "—"} · {matching.descricao} ·{" "}
              <strong
                className={
                  matching.valor < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
                }
              >
                {brl(matching.valor)}
              </strong>
            </p>

            {/* Busca inteligente entre os lançamentos JÁ LANÇADOS: o usuário
                encontra qualquer despesa/receita, mesmo quando o valor do
                extrato não bate exatamente com o previsto. */}
            <div className="mb-3 flex items-center gap-2 rounded-[8px] border border-[var(--color-accent2)]/20 px-3 py-2">
              <span aria-hidden className="text-[var(--color-ink3)]">🔍</span>
              <input
                value={buscaPar}
                onChange={(e) => {
                  const v = e.target.value;
                  setBuscaPar(v);
                  if (matching) carregarCandidatos(matching, v);
                }}
                placeholder={
                  matching?.tipo === "saida"
                    ? "Buscar despesa lançada por fornecedor, nº do pedido, projeto ou valor…"
                    : "Buscar conta a receber por cliente, descrição, projeto ou valor…"
                }
                className="w-full bg-transparent text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink4)]"
              />
            </div>

            {loadingCands && (
              <p className="py-6 text-center text-[12px] text-[var(--color-ink3)]">
                Buscando candidatos…
              </p>
            )}

            {!loadingCands && cands && cands.length === 0 && (
              <div className="rounded-[8px] border border-[var(--color-accent2)]/12 bg-[var(--color-surface2)] p-4 text-center">
                <p className="text-[12.5px] text-[var(--color-ink2)]">
                  Nenhuma {matching.tipo === "saida" ? "despesa" : "receita"} lançada compatível
                  (mesmo valor aproximado) foi encontrada.
                </p>
                <p className="mt-1 text-[11.5px] text-[var(--color-ink3)]">
                  Use <strong>Adicionar</strong> para cadastrar, ou{" "}
                  <strong>Ignorar</strong> para descartar.
                </p>
              </div>
            )}

            {!loadingCands && cands && cands.length > 0 && (
              <div className="space-y-2">
                {cands.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--color-accent2)]/12 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={grauTone(c.grau)}>{grauLabel(c.grau)}</Badge>
                        <span className="truncate text-[13px] font-medium text-[var(--color-ink)]">
                          {c.nome}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-[var(--color-ink3)]">
                        {c.descricao}
                        {c.projectName ? ` · ${c.projectName}` : ""}
                        {c.vencimento ? ` · venc. ${dateBR(c.vencimento)}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <span className="font-[family-name:var(--font-mono)] text-[12.5px] text-[var(--color-ink2)]">
                        {brl(c.valor)}
                      </span>
                      <Button size="sm" onClick={() => confirmarPar(c)} disabled={pairing}>
                        {pairing ? "Conciliando…" : "Conciliar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {modalErro && (
              <p className="mt-3 text-xs text-[var(--color-danger)]">{modalErro}</p>
            )}
          </div>
        </div>
      )}
      {/* Modal ADICIONAR: cria a despesa/conta a receber com os dados do extrato
          e JÁ A DEIXA CONCILIADA (paga/recebida), pois o movimento já ocorreu
          no banco. */}
      {adicionando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !addBusy && setAdicionando(null)}
        >
          <div
            className="w-full max-w-lg rounded-[12px] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">
              {adicionando.tipo === "saida"
                ? "Nova despesa a partir do extrato"
                : "Nova conta a receber a partir do extrato"}
            </h3>
            <p className="mb-3 text-[12px] text-[var(--color-ink3)]">
              {adicionando.data ? dateBR(adicionando.data) : "—"} ·{" "}
              <strong
                className={
                  adicionando.valor < 0
                    ? "text-[var(--color-danger)]"
                    : "text-[var(--color-success)]"
                }
              >
                {brl(adicionando.valor)}
              </strong>
            </p>

            <div className="space-y-3">
              <div>
                <Label>Projeto</Label>
                <Select
                  value={addProjeto}
                  onChange={(e) => setAddProjeto(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </Select>
              </div>
              {adicionando.tipo === "saida" && (
                <div>
                  <Label>Categoria DRE</Label>
                  <Select value={addCategoria} onChange={(e) => setAddCategoria(e.target.value)} aria-label="Categoria DRE da despesa">
                    <option value="">Selecione…</option>
                    {categoriasDeDespesa().map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div>
                <Label>Descrição</Label>
                <Input value={addObs} onChange={(e) => setAddObs(e.target.value)} />
              </div>
            </div>

            <p className="mt-3 rounded-[8px] bg-[var(--color-surface2)] px-3 py-2 text-[11.5px] text-[var(--color-ink2)]">
              Como o lançamento foi identificado no extrato, ele será gravado já{" "}
              <strong>
                {adicionando.tipo === "saida" ? "PAGO" : "RECEBIDO"} e conciliado
              </strong>{" "}
              na data do movimento.
            </p>

            {addErro && (
              <p className="mt-2 text-xs text-[var(--color-danger)]">{addErro}</p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={addBusy}
                onClick={() => setAdicionando(null)}
              >
                Cancelar
              </Button>
              <Button disabled={addBusy} onClick={confirmarAdicionar}>
                {addBusy
                  ? "Criando…"
                  : adicionando.tipo === "saida"
                    ? "Criar despesa paga"
                    : "Criar receita recebida"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const grauTone = (g: "alta" | "media" | "baixa") =>
  g === "alta" ? "success" : g === "media" ? "warning" : "neutral";
const grauLabel = (g: "alta" | "media" | "baixa") =>
  g === "alta" ? "Alta compatibilidade" : g === "media" ? "Média" : "Baixa";

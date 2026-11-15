"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { importarExtratoCartao, lerFaturaCartaoPdf, registrarEstorno, vincularCreditoAoEstorno, type ItemImportado } from "@/lib/actions/cartao-extrato";
import { parseSheet } from "@/lib/extrato-parse";
import type { Conferencia, CompraParaConferir } from "@/lib/calc/conferencia-cartao";
import { linkParaLancarCompra } from "@/lib/cartao-links";
import { brl0, dateBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * GA-11 §3.3 — a conciliação do cartão na Conciliação de Caixa, aba Cartões
 * de crédito. Veio de /cartoes (Prompt U e U2), sem mudar a regra:
 *
 * - `SubirFatura`: XLSX/CSV (data, descrição, valor; positivo = compra,
 *   negativo = crédito) ou PDF/imagem lida por IA, em prévia até a pessoa
 *   confirmar. Registrar guarda só o extrato (sem duplicar); nenhuma despesa é
 *   lançada. A Cris abre a mesma prévia, já lida (`EVENTO_IMPORTAR_FATURA`).
 * - `ConferenciaDoCartao`: no extrato sem lançamento (proposta com link para
 *   Despesas), lançado sem extrato, divergências e créditos; o estorno só por
 *   ação da pessoa.
 */

/** Evento que a Cris dispara para abrir a prévia da fatura já lida (§4.2, `ler_fatura`). */
export const EVENTO_IMPORTAR_FATURA = "cris:importar-fatura";

export function SubirFatura({ cartoes, cartaoInicial, canEditar, aiConfigured }: { cartoes: { id: string; nome: string }[]; cartaoInicial: string; canEditar: boolean; aiConfigured: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [cartaoId, setCartaoId] = useState(cartaoInicial);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<{ nome: string; itens: ItemImportado[] } | null>(null);

  useEffect(() => setCartaoId(cartaoInicial), [cartaoInicial]);
  // A Cris leu a fatura no chat: a mesma prévia abre aqui, já preenchida.
  useEffect(() => {
    const abrir = (e: Event) => {
      const d = (e as CustomEvent<{ nome: string; itens: ItemImportado[]; cartaoSugerido: string | null }>).detail;
      if (!d) return;
      if (d.cartaoSugerido && cartoes.some((c) => c.id === d.cartaoSugerido)) setCartaoId(d.cartaoSugerido);
      setPrevia({ nome: d.nome, itens: d.itens });
      setMsg(null);
      setErro(null);
      document.querySelector<HTMLElement>("[data-subir-fatura]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener(EVENTO_IMPORTAR_FATURA, abrir);
    return () => window.removeEventListener(EVENTO_IMPORTAR_FATURA, abrir);
  }, [cartoes]);

  const registrar = (itens: ItemImportado[]) =>
    start(async () => {
      if (!cartaoId) return setErro("Escolha o cartão da fatura.");
      const r = await importarExtratoCartao({ cartaoId, itens });
      if (r.ok) {
        setPrevia(null);
        setMsg(`${r.inseridos} lançamento(s) registrado(s); ${r.ignorados} já estavam (não duplicados); ${r.vinculados} crédito(s) reconhecido(s) como estorno antecipado.`);
        router.refresh();
      } else setErro(r.error);
    });

  async function subir(file: File) {
    setErro(null);
    setMsg(null);
    setPrevia(null);
    if (!cartaoId) return setErro("Escolha o cartão antes de subir a fatura.");
    if (/\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
      if (!aiConfigured) return setErro("A leitura de PDF ou imagem da fatura usa IA, que não está configurada (Configurações → Diagnóstico de IA). Envie a fatura em XLSX ou CSV.");
      const fd = new FormData();
      fd.set("file", file);
      start(async () => {
        const r = await lerFaturaCartaoPdf(fd);
        if (r.ok) setPrevia({ nome: file.name, itens: r.itens });
        else setErro(r.error);
      });
      return;
    }
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: "", blankrows: false });
      const res = parseSheet(aoa);
      // No extrato do cartão, a convenção é a inversa do extrato bancário: a
      // compra aparece como débito. Mantemos: positivo = compra, negativo = crédito.
      setPrevia({ nome: file.name, itens: res.rows.map((r) => ({ data: r.data, descricao: r.descricao, valor: r.valor })) });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    }
  }

  if (cartoes.length === 0) return null;
  return (
    <Card className="mb-4" data-subir-fatura>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Subir fatura</h3>
        <p className="mt-1 text-[12px] text-[var(--color-ink2)]">
          XLSX ou CSV (data, descrição e valor; positivo = compra, negativo = crédito), ou o PDF ou a imagem da fatura, que a IA lê. Você confere a prévia antes de registrar. Registrar guarda só o extrato, sem duplicar: nenhuma despesa é lançada.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <Label>Cartão da fatura</Label>
            <Select value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} aria-label="Cartão da fatura">
              <option value="">— escolha o cartão —</option>
              {cartoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          {canEditar ? (
            <>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} />
              <Button type="button" variant="outline" disabled={pending} onClick={() => inputRef.current?.click()} data-botao-subir-fatura>
                {pending ? "Lendo…" : "Selecionar arquivo da fatura"}
              </Button>
            </>
          ) : (
            <p className="text-[12px] text-[var(--color-ink3)]">Subir fatura exige a permissão Cartões/editar.</p>
          )}
        </div>
        {msg && <p className="mt-2 text-[12px] text-[var(--color-ink2)]" role="status">{msg}</p>}
        {previa && (
          <div data-previa-fatura className="mt-3 rounded-[10px] border border-[var(--color-line)] p-3">
            <h4 className="text-[13px] font-semibold text-[var(--color-ink)]">Lido de {previa.nome}: confira antes de registrar</h4>
            <p className="text-[11.5px] text-[var(--color-ink3)]">
              {previa.itens.filter((i) => i.valor > 0).length} compra(s), {brl0(previa.itens.filter((i) => i.valor > 0).reduce((a, i) => a + i.valor, 0))} · {previa.itens.filter((i) => i.valor < 0).length} crédito(s), {brl0(previa.itens.filter((i) => i.valor < 0).reduce((a, i) => a + i.valor, 0))}. Registrar guarda só o extrato, para a conferência abaixo. Nenhuma despesa é lançada.
            </p>
            <ul className="mt-2 max-h-64 space-y-0.5 overflow-auto text-[12px] text-[var(--color-ink2)]">
              {previa.itens.map((i, k) => (
                <li key={k}>
                  {dateBR(i.data)} · {i.descricao} · <strong className={i.valor < 0 ? "text-[var(--color-success)]" : ""}>{brl0(i.valor)}</strong>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <Button size="sm" disabled={pending || !canEditar} onClick={() => registrar(previa.itens)} data-registrar-fatura>
                {pending ? "Registrando…" : `Registrar ${previa.itens.length} lançamento(s)`}
              </Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setPrevia(null)}>
                Descartar
              </Button>
            </div>
          </div>
        )}
        {erro && <p className="mt-2 text-[12px] text-[var(--color-danger)]" role="alert">{erro}</p>}
      </CardContent>
    </Card>
  );
}

export function ConferenciaDoCartao({ cartao, conferencia, compras, canEditar, canLancar }: { cartao: { id: string; nome: string }; conferencia: Conferencia; compras: CompraParaConferir[]; canEditar: boolean; canLancar: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [estornoDe, setEstornoDe] = useState<{ itemId: string | null; valor: string; despesaId: string; data: string } | null>(null);
  const cartaoId = cartao.id;

  return (
    <div className="mt-3" data-conferencia-cartao={cartao.nome}>
      {msg && <p className="mb-2 text-[12px] text-[var(--color-success)]" role="status">{msg}</p>}
      {erro && <p className="mb-2 text-[12px] text-[var(--color-danger)]" role="alert">{erro}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <Bloco titulo="Na fatura, sem lançamento" contador={conferencia.semLancamento.length} tom="danger" vazio="Tudo que o cartão cobrou está lançado.">
          {conferencia.semLancamento.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2" data-proposta-compra>
              <span>{dateBR(i.data)} · {i.descricao ?? "—"} · <strong>{brl0(i.valor)}</strong></span>
              {canLancar && <Link href={linkParaLancarCompra(cartaoId, { id: i.id, data: i.data, descricao: i.descricao, valor: i.valor })} className="text-[var(--color-accent2)] hover:underline">Lançar em Despesas →</Link>}
            </li>
          ))}
        </Bloco>
        <Bloco titulo="Lançado, sem correspondência na fatura" contador={conferencia.semExtrato.length} tom="warning" vazio="Todo lançamento das faturas cobertas apareceu na fatura.">
          {conferencia.semExtrato.map((c) => (
            <li key={c.parcelaId}>
              {c.numDoc ?? "sem PED"} · {c.descricao ?? "—"} · parcela {c.numero}/{c.total} · fatura {dateBR(c.faturaFechamento)} · <strong>{brl0(c.valor)}</strong>
            </li>
          ))}
        </Bloco>
        <Bloco titulo="Divergências de valor ou data" contador={conferencia.divergentes.length} tom="warning" vazio="Nenhum par com diferença.">
          {conferencia.divergentes.map((d) => (
            <li key={d.item.id}>
              <Badge tone="warning">{d.motivo}</Badge> fatura {dateBR(d.item.data)} {brl0(d.item.valor)} × {d.compra.numDoc ?? "sem PED"} parcela {d.compra.numero}/{d.compra.total} fatura {dateBR(d.compra.faturaFechamento)} {brl0(d.compra.valor)}
            </li>
          ))}
        </Bloco>
        <Bloco titulo="Créditos e estornos" contador={conferencia.creditos.length} tom="info" vazio="Nenhum crédito na fatura.">
          {conferencia.creditos.map((c) => (
            <li key={c.item.id} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{dateBR(c.item.data)} · {c.item.descricao ?? "—"} · <strong>{brl0(c.item.valor)}</strong></span>
                {c.estorno ? (
                  c.vinculado ? (
                    <Badge tone="success">estorno {c.estorno.origem === "antecipado" ? "antecipado" : "registrado"} · {c.estorno.numDoc ?? "sem PED"}</Badge>
                  ) : canEditar ? (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await vincularCreditoAoEstorno(c.estorno!.id, c.item.id); if (!r.ok) setErro(r.error); else router.refresh(); })}>
                      Reconhecer como o antecipado de {c.estorno.numDoc ?? "sem PED"}
                    </Button>
                  ) : null
                ) : canEditar ? (
                  <Button size="sm" variant="ghost" onClick={() => setEstornoDe({ itemId: c.item.id, valor: String(Math.abs(c.item.valor)), despesaId: "", data: c.item.data ?? "" })} data-registrar-estorno>
                    Registrar estorno
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </Bloco>
      </div>
      {conferencia.casados.length > 0 && (
        <p className="mt-3 text-[11.5px] text-[var(--color-ink3)]">{conferencia.casados.length} lançamento(s) conferem com a fatura (mesma fatura, mesmo valor). Faturas cobertas: {conferencia.faturasCobertas.map(dateBR).join(", ")}.</p>
      )}

      {canEditar && (
        <details className="mt-4 rounded-[10px] border border-[var(--color-line)] p-3" open={!!estornoDe?.itemId || undefined} data-estorno-cartao>
          <summary className="cursor-pointer text-[13px] font-semibold text-[var(--color-ink)]">Estorno {estornoDe?.itemId ? "do crédito da fatura" : "antecipado"}</summary>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink3)]">Quando você já sabe da devolução antes de a fatura chegar, registre aqui. O crédito reduz a fatura; a compra original não é apagada nem editada. Quando o crédito vier na fatura, ele é reconhecido como este estorno, sem contar duas vezes.</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="col-span-2">
              <Label>Compra</Label>
              <Select value={estornoDe?.despesaId ?? ""} onChange={(e) => setEstornoDe({ itemId: estornoDe?.itemId ?? null, valor: estornoDe?.valor ?? "", data: estornoDe?.data ?? "", despesaId: e.target.value })} aria-label="Compra estornada">
                <option value="">— escolha a compra —</option>
                {[...new Map(compras.map((c) => [c.despesaId, c])).values()].map((c) => (
                  <option key={c.despesaId} value={c.despesaId}>
                    {c.numDoc ?? "sem PED"} · {c.descricao ?? "—"} · {brl0(c.valor * (c.total || 1))}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" step="0.01" min="0.01" value={estornoDe?.valor ?? ""} onChange={(e) => setEstornoDe({ itemId: estornoDe?.itemId ?? null, despesaId: estornoDe?.despesaId ?? "", data: estornoDe?.data ?? "", valor: e.target.value })} aria-label="Valor do estorno" />
            </div>
            <div>
              <Label>Data</Label>
              <DateField value={estornoDe?.data ?? ""} onChange={(v) => setEstornoDe({ itemId: estornoDe?.itemId ?? null, despesaId: estornoDe?.despesaId ?? "", valor: estornoDe?.valor ?? "", data: v })} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              disabled={pending || !estornoDe?.despesaId}
              onClick={() => {
                if (!estornoDe) return;
                setErro(null);
                start(async () => {
                  const r = await registrarEstorno({ cartaoId, despesaId: estornoDe.despesaId, valor: Number(estornoDe.valor), data: estornoDe.data, extratoItemId: estornoDe.itemId });
                  if (r.ok) {
                    setMsg(`Estorno registrado na fatura que fecha ${dateBR(r.faturaFechamento)}.`);
                    setEstornoDe(null);
                    router.refresh();
                  } else setErro(r.error);
                });
              }}
            >
              Registrar estorno
            </Button>
            {estornoDe?.itemId && (
              <Button size="sm" variant="ghost" onClick={() => setEstornoDe(null)}>
                Cancelar
              </Button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function Bloco({ titulo, contador, tom, vazio, children }: { titulo: string; contador: number; tom: "danger" | "warning" | "info"; vazio: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[var(--color-line)] p-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)]">
        {titulo}
        {contador > 0 && <Badge tone={tom}>{contador}</Badge>}
      </div>
      {contador === 0 ? <p className="mt-1 text-[12px] text-[var(--color-ink4)]">{vazio}</p> : <ul className="mt-2 space-y-1.5 text-[12px] text-[var(--color-ink2)]">{children}</ul>}
    </div>
  );
}

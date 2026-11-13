"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  reclassificarItens,
  type PaginaConferencia,
} from "@/lib/actions/diagnostico";
import { avisoDaSelecao, homogeneidade, mensagemDoLote, selecionavel } from "@/lib/conferencia-regras";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

/**
 * Reclassificação ASSISTIDA de lançamentos históricos.
 *
 * O fluxo é deliberadamente lento: marcar → escolher a categoria → ver o
 * preview do que exatamente vai mudar → confirmar. Nenhum caminho aplica
 * correção sem que o usuário tenha visto a lista item a item. Valor,
 * competência, vencimento, status e número PED nunca são tocados.
 */
export function DiagnosticoCategorias({
  pagina,
  filtros,
  projetos,
  categorias,
  canEditar,
}: {
  pagina: PaginaConferencia;
  filtros: { projeto: string; competencia: string; fornecedor: string; cursor: string };
  projetos: { id: string; nome: string }[];
  categorias: string[];
  canEditar: boolean;
}) {
  const rows = pagina.rows;
  const filtrando = !!(filtros.projeto || filtros.competencia || filtros.fornecedor);
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  // AN, Parte 3 — destino por linha. O lote só preenche o destino das linhas
  // marcadas quando a seleção é de um fornecedor ou de uma conta do plano.
  const [destinos, setDestinos] = useState<Map<string, string>>(new Map());
  const [categoriaLote, setCategoriaLote] = useState("");
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Só lançamentos ainda ativos podem ser reclassificados; os cancelados ficam
  // visíveis para conferência, mas fora da seleção.
  const selecionaveis = useMemo(
    // AN 4.4 — o CÓDIGO do motivo governa a seleção, não o texto.
    () => rows.filter((r) => selecionavel(r.motivos)),
    [rows],
  );
  const marcadas = useMemo(
    () => selecionaveis.filter((r) => sel.has(r.id)),
    [selecionaveis, sel],
  );
  const homog = useMemo(() => homogeneidade(marcadas), [marcadas]);
  const aviso = avisoDaSelecao(homog, marcadas.length);
  // O que vai para o preview: toda linha ativa com destino escolhido.
  const aAplicar = useMemo(
    () => selecionaveis.filter((r) => destinos.has(r.id)).map((r) => ({ r, para: destinos.get(r.id)! })),
    [selecionaveis, destinos],
  );
  const fornecedoresNoPreview = useMemo(
    () => homogeneidade(aAplicar.map((x) => x.r)).fornecedores,
    [aAplicar],
  );

  const definirDestino = (id: string, categoria: string) =>
    setDestinos((m) => {
      const n = new Map(m);
      if (categoria) n.set(id, categoria);
      else n.delete(id);
      return n;
    });

  const aplicarLote = () => {
    if (!categoriaLote || !homog.homogenea) return;
    setDestinos((m) => {
      const n = new Map(m);
      for (const r of marcadas) n.set(r.id, categoriaLote);
      return n;
    });
  };

  const alternar = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const confirmar = () => {
    if (pending) return;
    setErro(null);
    setMsg(null);
    start(async () => {
      const res = await reclassificarItens(aAplicar.map(({ r, para }) => ({ id: r.id, categoriaDre: para })));
      if (!res.ok) {
        setErro(res.error ?? "Falha ao reclassificar.");
        return;
      }
      setMsg(mensagemDoLote({ selecionadas: res.selecionadas ?? 0, alteradas: res.alteradas ?? 0, puladas: res.puladas ?? [] }));
      setSel(new Set());
      setDestinos(new Map());
      setPreview(false);
      router.refresh();
    });
  };

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    const tudo = { projeto: filtros.projeto, competencia: filtros.competencia, fornecedor: filtros.fornecedor, ...extra };
    for (const [k, v] of Object.entries(tudo)) if (v) p.set(k, v);
    const t = p.toString();
    return t ? `?${t}` : "?";
  };

  const formFiltros = (
    <form method="get" className="flex flex-wrap items-end gap-3 text-[13px]">
      <div className="min-w-[200px]">
        <Label>Projeto</Label>
        <Select name="projeto" defaultValue={filtros.projeto}>
          <option value="">Todos</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-[130px]">
        <Label>Competência</Label>
        <Input name="competencia" defaultValue={filtros.competencia} placeholder="MM/AAAA" inputMode="numeric" />
      </div>
      <div className="min-w-[200px]">
        <Label>Fornecedor</Label>
        <Select name="fornecedor" defaultValue={filtros.fornecedor}>
          <option value="">Todos</option>
          {pagina.fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
      {filtrando && (
        <Link href="?" className="text-[12px] text-[var(--color-ink3)] hover:underline">
          Limpar filtros
        </Link>
      )}
    </form>
  );

  if (pagina.totalGeral === 0) {
    return (
      <>
      {msg && <p className="mb-3 text-sm text-[var(--color-success)]">{msg}</p>}
      <Card>
        <CardContent className="p-8 text-center text-[var(--color-ink3)]">
          Nenhum lançamento nas quatro condições desta conferência (categoria de
          receita, sem categoria, valor zero, sem competência). Isso não confirma
          que os lançamentos estão certos — só que nenhum caiu nessas condições.
        </CardContent>
      </Card>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 text-[13px] leading-relaxed text-[var(--color-ink2)]">
          Estes lançamentos foram gravados antes das validações novas e{" "}
          <strong>continuam íntegros, legíveis e editáveis</strong>. Eles não
          estão bloqueados nem foram alterados. Corrigir é opcional e sempre
          manual: marque os que quiser reclassificar, escolha a categoria,
          confira o preview e confirme. Valor, competência, vencimento, status e
          número PED não são tocados.
        </CardContent>
      </Card>

      {formFiltros}

      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        {/* AN 4.3 — o badge e a soma contam o conjunto inteiro, não a página. */}
        <Badge tone="warning">{pagina.totalGeral} a conferir</Badge>
        <span className="text-[var(--color-ink3)]">
          Total{" "}
          <strong className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">
            {brl0(pagina.somaGeral)}
          </strong>
        </span>
        {filtrando && (
          <span className="text-[var(--color-ink3)]">
            · no filtro: <strong className="text-[var(--color-ink)]">{pagina.total}</strong> lançamento(s),{" "}
            <strong className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">{brl0(pagina.soma)}</strong>
          </span>
        )}
        {sel.size > 0 && <Badge tone="info">{sel.size} selecionado(s)</Badge>}
      </div>

      {canEditar && selecionaveis.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-[12.5px] text-[var(--color-ink3)]">
              Escolha a nova categoria <strong className="text-[var(--color-ink2)]">linha a linha</strong>, na coluna
              “Nova categoria”. O lote abaixo só vale para lançamentos marcados de um mesmo
              fornecedor ou de uma mesma conta do plano.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px]">
                <Label>Lote: mesma categoria para os marcados</Label>
                <Select value={categoriaLote} onChange={(e) => setCategoriaLote(e.target.value)} disabled={!homog.homogenea}>
                  <option value="">Selecione...</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={marcadas.length === 0 || !categoriaLote || !homog.homogenea || pending}
                onClick={aplicarLote}
              >
                Aplicar aos {marcadas.length || ""} marcado(s)
              </Button>
              <Button
                type="button"
                disabled={aAplicar.length === 0 || pending}
                onClick={() => setPreview(true)}
              >
                Revisar {aAplicar.length > 0 ? `${aAplicar.length} alteração(ões)` : ""}
              </Button>
              <button
                type="button"
                onClick={() => setSel(new Set(selecionaveis.map((r) => r.id)))}
                className="text-[12px] text-[var(--color-accent2)] hover:underline"
              >
                Marcar todos
              </button>
              {(sel.size > 0 || destinos.size > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSel(new Set());
                    setDestinos(new Map());
                  }}
                  className="text-[12px] text-[var(--color-ink3)] hover:underline"
                >
                  Limpar seleção e destinos
                </button>
              )}
            </div>
            {marcadas.length > 0 && homog.homogenea && marcadas.length > 1 && (
              <p className="text-[12px] text-[var(--color-ink3)]">
                Seleção homogênea: {marcadas.length} lançamento(s) do mesmo {homog.criterio}.
              </p>
            )}
            {aviso && (
              <p role="status" className="rounded-[8px] bg-[var(--color-warning)]/10 px-3 py-2 text-[12.5px] text-[var(--color-ink2)]">
                {aviso}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {msg && <p className="text-sm text-[var(--color-success)]">{msg}</p>}
      {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

      <Card>
        <CardContent className="p-0">
          <Table wrapperClassName="max-h-[70vh] scroll-x-always" className="min-w-[1100px]">
            <THead className="sticky top-0 z-10">
              <tr>
                {canEditar && <TH className="w-8"></TH>}
                <TH>PED</TH>
                <TH>Projeto</TH>
                <TH>Fornecedor</TH>
                <TH>Categoria atual</TH>
                {canEditar && <TH>Nova categoria</TH>}
                <TH>Competência</TH>
                <TH className="text-right">Valor</TH>
                <TH>Motivo</TH>
                <TH className="text-right">Abrir</TH>
              </tr>
            </THead>
            <tbody>
              {rows.map((r) => {
                const cancelada = !selecionavel(r.motivos);
                return (
                  <TR key={r.id}>
                    {canEditar && (
                      <TD>
                        <input
                          type="checkbox"
                          checked={sel.has(r.id)}
                          disabled={cancelada}
                          onChange={() => alternar(r.id)}
                          aria-label={`Selecionar ${r.numDoc ?? r.id}`}
                        />
                      </TD>
                    )}
                    <TD className="whitespace-nowrap font-[family-name:var(--font-mono)] text-[var(--color-ink)]">
                      {r.numDoc ?? "—"}
                    </TD>
                    <TD className="whitespace-nowrap">{r.projectName}</TD>
                    <TD className="max-w-[200px] truncate">{r.fornecedorNome ?? "—"}</TD>
                    <TD>
                      {r.categoriaDre ? (
                        <Badge tone="danger">{r.categoriaDre}</Badge>
                      ) : (
                        <span className="text-[var(--color-ink4)]">—</span>
                      )}
                    </TD>
                    {canEditar && (
                      <TD>
                        {cancelada ? (
                          <span className="text-[12px] text-[var(--color-ink4)]">encerrada</span>
                        ) : (
                          <Select
                            aria-label={`Nova categoria de ${r.numDoc ?? r.id}`}
                            value={destinos.get(r.id) ?? ""}
                            onChange={(e) => definirDestino(r.id, e.target.value)}
                            className="h-8 min-w-[160px] text-[12.5px]"
                          >
                            <option value="">—</option>
                            {categorias.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Select>
                        )}
                      </TD>
                    )}
                    <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                      {r.competencia ?? "—"}
                    </TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">
                      {brl0(r.valor)}
                    </TD>
                    <TD className="text-[12px] text-[var(--color-ink3)]">
                      {r.motivos.map((m) => m.texto).join(" · ")}
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/despesas?proj=${r.projectId}&tab=lancamentos&edit=${r.id}`}
                        className="text-sm text-[var(--color-accent2)] hover:underline"
                      >
                        Abrir
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {rows.length === 0 && (
        <p className="text-center text-sm text-[var(--color-ink3)]">Nenhum lançamento com esses filtros.</p>
      )}
      {(filtros.cursor || pagina.proximoCursor) && (
        <div className="flex items-center justify-between text-[13px]">
          {filtros.cursor ? (
            <Link href={qs({})} className="text-[var(--color-accent2)] hover:underline">
              ← Voltar ao início
            </Link>
          ) : (
            <span />
          )}
          {pagina.proximoCursor && (
            <Link href={qs({ cursor: pagina.proximoCursor })} className="text-[var(--color-accent2)] hover:underline">
              Próxima página →
            </Link>
          )}
        </div>
      )}

      {preview && (
        <div
          onClick={() => setPreview(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
        >
          <Card className="w-full max-w-4xl">
            <CardContent className="p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-1 text-lg font-semibold text-[var(--color-ink)]">
                Conferir antes de aplicar
              </h2>
              <p className="mb-3 text-[12.5px] text-[var(--color-ink3)]">
                {aAplicar.length} lançamento(s) mudam de categoria, cada um para o destino da
                linha. Só a categoria muda — valor, competência, vencimento, status e número
                PED permanecem exatamente como estão.
                {fornecedoresNoPreview > 1 && (
                  <>
                    {" "}
                    <strong className="text-[var(--color-ink2)]">
                      São {fornecedoresNoPreview} fornecedores diferentes: confira cada linha.
                    </strong>
                  </>
                )}
              </p>
              <div className="max-h-[45vh] overflow-auto rounded-[8px] border border-[var(--color-accent2)]/15">
                <table className="w-full border-collapse text-[12.5px]">
                  <thead className="sticky top-0 bg-[var(--color-surface2)]">
                    <tr className="text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                      <th className="px-2 py-1.5">PED</th>
                      <th className="px-2 py-1.5">Projeto</th>
                      <th className="px-2 py-1.5">Fornecedor</th>
                      <th className="px-2 py-1.5">De</th>
                      <th className="px-2 py-1.5">Para</th>
                      <th className="px-2 py-1.5 text-right">Valor</th>
                      <th className="px-2 py-1.5">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aAplicar.map(({ r, para }) => (
                      <tr key={r.id} className="border-t border-[var(--color-accent2)]/8">
                        <td className="px-2 py-1.5 font-[family-name:var(--font-mono)]">
                          {r.numDoc ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">{r.projectName}</td>
                        <td className="max-w-[200px] truncate px-2 py-1.5">{r.fornecedorNome ?? "sem fornecedor"}</td>
                        <td className="px-2 py-1.5 text-[var(--color-danger)]">
                          {r.categoriaDre ?? "sem categoria"}
                        </td>
                        <td className="px-2 py-1.5 text-[var(--color-success)]">{para}</td>
                        <td className="px-2 py-1.5 text-right font-[family-name:var(--font-mono)]">
                          {brl0(r.valor)}
                        </td>
                        <td className="px-2 py-1.5 font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                          {r.vencimento ? dateBR(r.vencimento) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {erro && <p className="mt-2 text-sm text-[var(--color-danger)]">{erro}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPreview(false)} disabled={pending}>
                  Voltar
                </Button>
                <Button onClick={confirmar} disabled={pending || aAplicar.length === 0}>
                  {pending ? "Aplicando…" : `Confirmar ${aAplicar.length} alteração(ões)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

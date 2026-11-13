"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { MoneyInput } from "@/components/ui/money-input";
import { apropriarDespesaNoPlano, excluirDoPlano, salvarEntrega } from "@/lib/actions/plano";
import { ROTULO_STATUS_ENTREGA, ROTULO_STATUS_ITEM, STATUS_ENTREGA } from "@/lib/plano-regras";
import { Kpi, Mensagem, Secao, brl, useAcao } from "@/components/app/contratos/comum";
import { Campo, Documentos, dataBR, pct, type Permissoes } from "./plano-estrutura";
import type { PlanoDaTela } from "./tipos";

// ───────────────────────────── Cronograma (Gantt simples) ─────────────────────────────

const dia = (s: string | null | undefined) => (s && s.length === 10 ? Date.UTC(Number(s.slice(6)), Number(s.slice(0, 2)) - 1, Number(s.slice(3, 5))) / 86400000 : null);

/**
 * Gantt simples: barra cinza = linha de base (datas originais), barra
 * colorida = planejamento atual, traço escuro = execução real. Itens sem data
 * aparecem na lista, sem barra (nada é presumido).
 */
export function Cronograma({ plano, hoje }: { plano: PlanoDaTela; hoje: string }) {
  const linhas = plano.fases.flatMap((f) => [
    { id: f.id, nome: f.nome, nivel: 0, item: f },
    ...plano.atividades
      .filter((a) => a.faseId === f.id && !a.parentId)
      .flatMap((a) => [{ id: a.id, nome: a.nome, nivel: 1, item: a }, ...plano.atividades.filter((s) => s.parentId === a.id).map((s) => ({ id: s.id, nome: s.nome, nivel: 2, item: s }))]),
  ]);
  const marcos = plano.entregas.filter((e) => e.dataPrevista);
  const todas = [...linhas.flatMap((l) => [l.item.inicioPrevisto, l.item.terminoPrevisto, l.item.inicioOriginal, l.item.terminoOriginal, l.item.inicioReal, l.item.terminoReal]), ...marcos.map((m) => m.dataPrevista)].map(dia).filter((x): x is number => x != null);
  if (!todas.length) return <p className="rounded-[12px] border border-dashed border-[var(--color-line)] p-6 text-center text-[13px] text-[var(--color-ink3)]">Informe datas planejadas nas fases e atividades para ver o cronograma.</p>;
  const ini = Math.min(...todas) - 3;
  const fim = Math.max(...todas) + 3;
  const span = Math.max(fim - ini, 1);
  const x = (d: number) => `${((d - ini) / span) * 100}%`;
  const w = (a: number, b: number) => `${Math.max(((b - a) / span) * 100, 0.6)}%`;
  const meses: { rotulo: string; d: number }[] = [];
  const d0 = new Date(ini * 86400000);
  for (let m = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); m.getTime() / 86400000 <= fim; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1)))
    meses.push({ rotulo: m.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }), d: m.getTime() / 86400000 });
  const h = dia(hoje);
  const barra = (i: string | null, t: string | null, cls: string, titulo: string) => {
    const a = dia(i) ?? dia(t);
    const b = dia(t) ?? dia(i);
    return a != null && b != null ? <div className={`absolute rounded ${cls}`} style={{ left: x(a), width: w(a, b) }} title={titulo} /> : null;
  };
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white" data-testid="gantt">
      <div className="min-w-[860px]">
        <div className="flex border-b border-[var(--color-line)] text-[10.5px] text-[var(--color-ink3)]">
          <div className="w-[260px] shrink-0 px-2 py-1.5">Fase / atividade</div>
          <div className="relative h-7 flex-1">
            {meses.map((m) => (
              <span key={m.d} className="absolute top-1.5 border-l border-[var(--color-line)] pl-1" style={{ left: x(m.d) }}>
                {m.rotulo}
              </span>
            ))}
          </div>
        </div>
        {linhas.map((l) => (
          <div key={l.id} className={`flex border-b border-[var(--color-line)]/60 ${l.nivel === 0 ? "bg-[var(--color-surface2)]" : ""}`}>
            <div className="w-[260px] shrink-0 truncate px-2 py-1 text-[12px]" style={{ paddingLeft: 8 + l.nivel * 14 }} title={l.nome}>
              <span className={l.nivel === 0 ? "font-semibold" : ""}>{l.nome}</span>
            </div>
            <div className="relative h-7 flex-1">
              {h != null && h >= ini && h <= fim && <div className="absolute inset-y-0 w-px bg-[var(--color-danger)]/50" style={{ left: x(h) }} />}
              <div className="absolute inset-x-0 top-1 h-2">{barra(l.item.inicioOriginal, l.item.terminoOriginal, "h-2 bg-[var(--color-ink3)]/30", `Linha de base: ${dataBR(l.item.inicioOriginal)} a ${dataBR(l.item.terminoOriginal)}`)}</div>
              <div className="absolute inset-x-0 top-3 h-2.5">
                {barra(l.item.inicioPrevisto, l.item.terminoPrevisto, `h-2.5 ${l.item.atrasada ? "bg-[var(--color-danger)]/70" : l.nivel === 0 ? "bg-[var(--color-brand-segmento)]" : "bg-[var(--color-accent2)]/70"}`, `Planejado: ${dataBR(l.item.inicioPrevisto)} a ${dataBR(l.item.terminoPrevisto)} · ${ROTULO_STATUS_ITEM[l.item.status as keyof typeof ROTULO_STATUS_ITEM] ?? l.item.status} · ${pct(l.item.progresso)}`)}
              </div>
              <div className="absolute inset-x-0 top-[22px] h-1">{barra(l.item.inicioReal, l.item.terminoReal ?? (l.item.inicioReal ? hoje : null), "h-1 bg-[var(--color-ink)]", `Real: ${dataBR(l.item.inicioReal)} a ${dataBR(l.item.terminoReal)}`)}</div>
            </div>
          </div>
        ))}
        {marcos.length > 0 && (
          <div className="flex">
            <div className="w-[260px] shrink-0 px-2 py-1 text-[12px] font-semibold">Entregas e marcos</div>
            <div className="relative h-7 flex-1">
              {marcos.map((m) => (
                <span key={m.id} className={`absolute top-1 -ml-1.5 text-[13px] ${m.atrasada ? "text-[var(--color-danger)]" : "text-[var(--color-accent2)]"}`} style={{ left: x(dia(m.dataPrevista)!) }} title={`${m.nome} · ${dataBR(m.dataPrevista)}`}>
                  ◆
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="px-2 py-2 text-[11px] text-[var(--color-ink3)]">Cinza: linha de base · cor: planejamento atual (vermelho = atrasado) · traço escuro: execução real · linha vermelha: hoje.</p>
      </div>
    </div>
  );
}

// ───────────────────────────── Entregas e marcos ─────────────────────────────

type Entrega = PlanoDaTela["entregas"][number];

export function Entregas({ plano, projectId, pode }: { plano: PlanoDaTela; projectId: string; pode: Permissoes }) {
  const { rodar, pendente, msg } = useAcao();
  const [editando, setEditando] = useState<Entrega | "nova" | null>(null);
  const fase = (id: string | null) => plano.fases.find((f) => f.id === id)?.nome ?? "—";
  return (
    <div>
      <p className="mb-3 rounded-[10px] bg-[var(--color-surface2)] px-3 py-2 text-[12px] text-[var(--color-ink2)]">
        Entrega técnica, aceite do cliente, medição e faturamento são eventos diferentes. Marcar uma entrega como entregue ou aceita <strong>não gera medição nem fatura</strong>: registre a medição no módulo Contratos.
      </p>
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="text-left text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-ink3)]">
            <tr>
              <th className="px-2 py-2">Tipo</th>
              <th className="px-2 py-2">Entrega / marco</th>
              <th className="px-2 py-2">Fase</th>
              <th className="px-2 py-2">Prevista</th>
              <th className="px-2 py-2">Efetiva</th>
              <th className="px-2 py-2">Situação</th>
              <th className="px-2 py-2 text-right">Valor ref.</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {plano.entregas.map((e) => (
              <tr key={e.id} className="border-t border-[var(--color-line)]">
                <td className="px-2 py-1.5 text-[12px]">{e.tipo === "marco" ? "Marco" : "Entrega"}</td>
                <td className="px-2 py-1.5">
                  {e.nome}
                  {e.atrasada && <span className="ml-2 rounded bg-[#fee2e2] px-1.5 py-0.5 text-[10.5px] font-medium text-[#991b1b]">atrasada</span>}
                </td>
                <td className="px-2 py-1.5 text-[12.5px]">{fase(e.faseId)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-[12.5px]">
                  {dataBR(e.dataPrevista)}
                  {e.desvioDias ? <span className="ml-1 text-[10.5px] text-[var(--color-ink3)]">({e.desvioDias > 0 ? "+" : ""}{e.desvioDias} d)</span> : null}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-[12.5px]">{dataBR(e.dataEfetiva)}</td>
                <td className="px-2 py-1.5 text-[12.5px]">{ROTULO_STATUS_ENTREGA[e.status as keyof typeof ROTULO_STATUS_ENTREGA] ?? e.status}</td>
                <td className="px-2 py-1.5 text-right text-[12.5px]">{e.valor ? brl(e.valor) : "—"}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right">
                  {pode.editar && (
                    <button type="button" className="text-[11.5px] text-[var(--color-ink3)] hover:underline" onClick={() => setEditando(e)}>
                      editar
                    </button>
                  )}
                  {pode.excluir && (
                    <button type="button" className="ml-2 text-[11.5px] text-[var(--color-ink3)] hover:underline" disabled={pendente} onClick={() => window.confirm(`Excluir "${e.nome}"?`) && rodar(() => excluirDoPlano({ tipo: "entrega", id: e.id }), "Entrega excluída.")}>
                      excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!plano.entregas.length && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[13px] text-[var(--color-ink3)]">
                  Nenhuma entrega ou marco.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pode.criar && (
        <Button size="sm" variant="outline" className="mt-2" onClick={() => setEditando("nova")}>
          + Entrega ou marco
        </Button>
      )}
      <Mensagem msg={msg} />
      {editando && <EditorDeEntrega key={editando === "nova" ? "nova" : editando.id} e={editando === "nova" ? null : editando} plano={plano} projectId={projectId} fechar={() => setEditando(null)} />}
    </div>
  );
}

function EditorDeEntrega({ e, plano, projectId, fechar }: { e: Entrega | null; plano: PlanoDaTela; projectId: string; fechar: () => void }) {
  const { rodar, pendente, msg } = useAcao();
  const [f, setF] = useState({
    tipo: e?.tipo ?? "entrega",
    nome: e?.nome ?? "",
    descricao: e?.descricao ?? "",
    responsavel: e?.responsavel ?? "",
    faseId: e?.faseId ?? "",
    atividadeId: e?.atividadeId ?? "",
    dataPrevista: e?.dataPrevista ?? "",
    dataEfetiva: e?.dataEfetiva ?? "",
    status: e?.status ?? "prevista",
    contratoId: e?.contratoId ?? "",
    contratoItemId: e?.contratoItemId ?? "",
    valor: e?.valor ?? "",
    justificativa: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const reprogramando = !!e?.dataOriginal && f.dataPrevista !== (e.dataPrevista ?? "");
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" role="dialog" aria-label="Entrega ou marco" onClick={fechar}>
      <div className="h-full w-full max-w-[560px] overflow-y-auto bg-white p-5 shadow-xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{e ? "Editar entrega / marco" : "Nova entrega ou marco"}</h3>
          <Button size="sm" variant="ghost" onClick={fechar}>
            Fechar
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo rotulo="Tipo">
            <Select value={f.tipo} onChange={(ev) => set("tipo", ev.target.value)}>
              <option value="entrega">Entrega técnica</option>
              <option value="marco">Marco do projeto</option>
            </Select>
          </Campo>
          <Campo rotulo="Situação">
            <Select value={f.status} onChange={(ev) => set("status", ev.target.value)}>
              {STATUS_ENTREGA.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_ENTREGA[s]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Nome" span>
            <Input value={f.nome} onChange={(ev) => set("nome", ev.target.value)} />
          </Campo>
          <Campo rotulo="Fase">
            <Select value={f.faseId} onChange={(ev) => setF((x) => ({ ...x, faseId: ev.target.value, atividadeId: "" }))}>
              <option value="">—</option>
              {plano.fases.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Atividade">
            <Select value={f.atividadeId} onChange={(ev) => set("atividadeId", ev.target.value)}>
              <option value="">—</option>
              {plano.atividades
                .filter((a) => !f.faseId || a.faseId === f.faseId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.parentId ? "– " : ""}
                    {a.nome}
                  </option>
                ))}
            </Select>
          </Campo>
          <Campo rotulo={`Data prevista${e?.dataOriginal ? ` (base ${dataBR(e.dataOriginal)})` : ""}`}>
            <DateField value={f.dataPrevista} onChange={(v) => set("dataPrevista", v)} />
          </Campo>
          <Campo rotulo="Data efetiva">
            <DateField value={f.dataEfetiva} onChange={(v) => set("dataEfetiva", v)} />
          </Campo>
          {reprogramando && (
            <Campo rotulo="Justificativa da reprogramação" span>
              <Input value={f.justificativa} onChange={(ev) => set("justificativa", ev.target.value)} />
            </Campo>
          )}
          <Campo rotulo="Responsável">
            <Input value={f.responsavel} onChange={(ev) => set("responsavel", ev.target.value)} />
          </Campo>
          <Campo rotulo="Valor de referência (opcional)">
            <MoneyInput value={f.valor} onChange={(v) => set("valor", String(v ?? ""))} />
          </Campo>
          <Campo rotulo="Contrato (opcional)">
            <Select value={f.contratoId} onChange={(ev) => setF((x) => ({ ...x, contratoId: ev.target.value, contratoItemId: "" }))}>
              <option value="">—</option>
              {plano.contratos.opcoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.titulo}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Item contratual (opcional)">
            <Select value={f.contratoItemId} onChange={(ev) => set("contratoItemId", ev.target.value)}>
              <option value="">—</option>
              {plano.contratos.itens
                .filter((i) => !f.contratoId || i.contratoId === f.contratoId)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.codigo} {i.descricao}
                  </option>
                ))}
            </Select>
          </Campo>
          <Campo rotulo="Descrição" span>
            <Input value={f.descricao} onChange={(ev) => set("descricao", ev.target.value)} />
          </Campo>
        </div>
        <Button className="mt-4" disabled={pendente || !f.nome.trim()} onClick={() => rodar(() => salvarEntrega({ id: e?.id ?? null, projectId, ...f }), "Entrega salva.", () => !e && fechar())}>
          Salvar
        </Button>
        <Mensagem msg={msg} />
        {e && <Documentos alvo="entrega" id={e.id} docs={plano.documentos.filter((d) => d.entregaId === e.id)} />}
      </div>
    </div>
  );
}

// ───────────────────────────── Indicadores ─────────────────────────────

/** Físico e financeiro lado a lado, SEPARADOS: um não é derivado do outro. */
export function Indicadores({ plano }: { plano: PlanoDaTela }) {
  const p = plano.progressoProjeto;
  const c = plano.contagem;
  const hp = plano.fases.reduce((s, f) => s + f.horasPrevistas, 0);
  const hr = plano.fases.reduce((s, f) => s + f.horasRealizadas, 0);
  const pl = plano.planejamento;
  const linha = (rot: string, r: { receita: number; custos: number; margem: number } | null) => (
    <tr className="border-t border-[var(--color-line)]">
      <td className="px-2 py-1.5">{rot}</td>
      <td className="px-2 py-1.5 text-right">{r ? brl(r.receita) : "—"}</td>
      <td className="px-2 py-1.5 text-right">{r ? brl(r.custos) : "—"}</td>
      <td className="px-2 py-1.5 text-right">{r ? brl(r.margem) : "—"}</td>
    </tr>
  );
  return (
    <div className="space-y-5">
      <Secao titulo="Avanço físico" descricao="Pelo andamento informado nas fases e atividades. Sem peso ou horas definidos, o sistema não presume peso igual e não calcula percentual artificial.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi rotulo="Progresso físico" valor={pct(p)} detalhe={p.percentual == null ? p.motivo : `base: ${p.base}`} />
          <Kpi rotulo="Fases · atividades" valor={`${c.fases} · ${c.atividades}`} detalhe={`${c.subatividades} subatividade(s)`} />
          <Kpi rotulo="Itens atrasados" valor={String(c.atrasadas)} tom={c.atrasadas ? "perigo" : "ok"} />
          <Kpi rotulo="Entregas atrasadas" valor={`${c.entregasAtrasadas} de ${c.entregas}`} tom={c.entregasAtrasadas ? "alerta" : undefined} />
          <Kpi rotulo="Horas previstas" valor={hp.toLocaleString("pt-BR")} />
          <Kpi rotulo="Horas realizadas" valor={hr.toLocaleString("pt-BR")} tom={hp && hr > hp ? "alerta" : undefined} detalhe={hp ? `${Math.round((hr / hp) * 100)}% do previsto` : undefined} />
        </div>
      </Secao>
      <Secao titulo="Por fase">
        <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="text-left text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-ink3)]">
              <tr>
                <th className="px-2 py-2">Fase</th>
                <th className="px-2 py-2">Situação</th>
                <th className="px-2 py-2 text-right">Físico</th>
                <th className="px-2 py-2 text-right">Desvio de prazo</th>
                <th className="px-2 py-2 text-right">Horas (real / prev.)</th>
                <th className="px-2 py-2 text-right">Custo apropriado</th>
              </tr>
            </thead>
            <tbody>
              {plano.fases.map((f) => (
                <tr key={f.id} className="border-t border-[var(--color-line)]">
                  <td className="px-2 py-1.5">{f.nome}</td>
                  <td className="px-2 py-1.5 text-[12.5px]">{ROTULO_STATUS_ITEM[f.status as keyof typeof ROTULO_STATUS_ITEM] ?? f.status}{f.atrasada ? " · atrasada" : ""}</td>
                  <td className="px-2 py-1.5 text-right" title={f.progresso.motivo}>{pct(f.progresso)}</td>
                  <td className="px-2 py-1.5 text-right">{f.desvioDias == null ? "—" : `${f.desvioDias > 0 ? "+" : ""}${f.desvioDias} d`}</td>
                  <td className="px-2 py-1.5 text-right">{f.horasRealizadas.toLocaleString("pt-BR")} / {f.horasPrevistas.toLocaleString("pt-BR")}</td>
                  <td className="px-2 py-1.5 text-right">{brl(f.custo)}</td>
                </tr>
              ))}
              <tr className="border-t border-[var(--color-line)] text-[var(--color-ink2)]">
                <td className="px-2 py-1.5" colSpan={5}>Custos transversais (não apropriados a fase)</td>
                <td className="px-2 py-1.5 text-right">{brl(plano.custos.transversal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Secao>
      <Secao titulo="Financeiro do projeto" descricao="Lido dos módulos existentes (Orçamento, Previsão, Atual e Contratos), pelo mesmo cálculo da DRE. O plano não recalcula nem altera o resultado.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi rotulo="Contratado (atualizado)" valor={brl(plano.contratos.valor)} />
          <Kpi rotulo="Medido aprovado" valor={brl(plano.contratos.medido)} detalhe={plano.contratos.valor ? `${Math.round((plano.contratos.medido / plano.contratos.valor) * 100)}% do contratado` : undefined} />
          <Kpi rotulo="Faturado" valor={brl(plano.contratos.faturado)} />
          <Kpi rotulo="Recebido" valor={brl(plano.contratos.recebido)} />
        </div>
        <div className="mt-3 overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="text-left text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-ink3)]">
              <tr>
                <th className="px-2 py-2">Versão</th>
                <th className="px-2 py-2 text-right">Receita</th>
                <th className="px-2 py-2 text-right">Custos</th>
                <th className="px-2 py-2 text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {linha("Orçamento", pl?.orcamento ?? null)}
              {linha("Previsão", pl?.previsao ?? null)}
              {linha("Realizado (Atual)", pl?.realizado ?? null)}
            </tbody>
          </table>
        </div>
      </Secao>
    </div>
  );
}

// ───────────────────────────── Custos (apropriação opcional) ─────────────────────────────

export function Custos({ plano, pode }: { plano: PlanoDaTela; pode: Permissoes }) {
  const { rodar, pendente, msg } = useAcao();
  const valor = (d: PlanoDaTela["custos"]["despesas"][number]) => (d.atividadeId ? `a:${d.atividadeId}` : d.faseId ? `f:${d.faseId}` : "");
  return (
    <div>
      <p className="mb-3 rounded-[10px] bg-[var(--color-surface2)] px-3 py-2 text-[12px] text-[var(--color-ink2)]">
        Apropriar uma despesa a uma fase ou atividade é <strong>opcional</strong> e só serve à gestão do projeto: não muda valor, conta, categoria, DRE nem caixa. Despesas sem fase ficam como custo transversal do projeto.
      </p>
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="text-left text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-ink3)]">
            <tr>
              <th className="px-2 py-2">Documento</th>
              <th className="px-2 py-2">Fornecedor</th>
              <th className="px-2 py-2">Competência</th>
              <th className="px-2 py-2 text-right">Valor</th>
              <th className="px-2 py-2">Fase / atividade</th>
            </tr>
          </thead>
          <tbody>
            {plano.custos.despesas.map((d) => (
              <tr key={d.id} className="border-t border-[var(--color-line)]">
                <td className="px-2 py-1.5">{d.numDoc ?? "—"}</td>
                <td className="px-2 py-1.5">{d.fornecedor ?? "—"}</td>
                <td className="px-2 py-1.5">{d.competencia ?? "—"}</td>
                <td className="px-2 py-1.5 text-right">{brl(d.valor)}</td>
                <td className="px-2 py-1.5">
                  <Select
                    className="h-7 text-[12px]"
                    value={valor(d)}
                    disabled={!pode.editar || pendente}
                    onChange={(e) => {
                      const v = e.target.value;
                      rodar(() => apropriarDespesaNoPlano({ despesaId: d.id, faseId: v.startsWith("f:") ? v.slice(2) : null, atividadeId: v.startsWith("a:") ? v.slice(2) : null }), "Apropriação atualizada.");
                    }}
                    aria-label="Apropriar a"
                  >
                    <option value="">— transversal (só o projeto) —</option>
                    {plano.fases.map((f) => (
                      <optgroup key={f.id} label={f.nome}>
                        <option value={`f:${f.id}`}>{f.nome} (fase inteira)</option>
                        {plano.atividades
                          .filter((a) => a.faseId === f.id)
                          .map((a) => (
                            <option key={a.id} value={`a:${a.id}`}>
                              {a.parentId ? "   – " : "• "}
                              {a.nome}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
            {!plano.custos.despesas.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[13px] text-[var(--color-ink3)]">
                  Nenhuma despesa lançada na versão Atual deste projeto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Histórico ─────────────────────────────

const ROTULO_CAMPO: Record<string, string> = {
  nome: "Nome", codigo: "Código", descricao: "Descrição", responsavel: "Responsável", inicioPrevisto: "Início planejado", terminoPrevisto: "Término planejado",
  inicioOriginal: "Início (linha de base)", terminoOriginal: "Término (linha de base)", inicioReal: "Início real", terminoReal: "Conclusão real", status: "Situação",
  percentual: "Percentual", peso: "Peso", obs: "Observações", funcionarioId: "Profissional", funcaoId: "Função", horasPrevistas: "Horas previstas",
  horasRealizadas: "Horas realizadas", contratoItemId: "Item contratual", parentId: "Atividade superior", dataPrevista: "Data prevista", dataOriginal: "Data (linha de base)",
  dataEfetiva: "Data efetiva", valor: "Valor", contratoId: "Contrato", tipo: "Tipo", faseId: "Fase", atividadeId: "Atividade",
};
const ROTULO_ACAO: Record<string, string> = {
  criar: "plano montado", create: "inclusão", update: "alteração", reprogramar: "reprogramação", andamento: "andamento", delete: "exclusão",
  mover: "movida de fase", duplicar: "duplicação", apropriar: "apropriação de custo", upload: "documento anexado",
};

export function Historico({ plano }: { plano: PlanoDaTela }) {
  const [so, setSo] = useState(false);
  const linhas = plano.historico.filter((h) => !so || h.action.endsWith(".reprogramar"));
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[12.5px]">
        <input type="checkbox" checked={so} onChange={(e) => setSo(e.target.checked)} /> só reprogramações de prazo
      </label>
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full min-w-[820px] text-[12.5px]">
          <thead className="text-left text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-ink3)]">
            <tr>
              <th className="px-2 py-2">Quando</th>
              <th className="px-2 py-2">Quem</th>
              <th className="px-2 py-2">O quê</th>
              <th className="px-2 py-2">Campo: anterior → novo</th>
              <th className="px-2 py-2">Justificativa</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((h) => {
              const meta = (h.meta ?? {}) as { nome?: string; mudou?: Record<string, { de: unknown; para: unknown }>; justificativa?: string | null; origem?: string; fases?: number; atividades?: number };
              const partes = h.action.split(".");
              const acao = ROTULO_ACAO[partes[partes.length - 1]] ?? partes[partes.length - 1];
              const objeto = partes.length > 2 ? partes[1] : "";
              const mostra = (k: string, v: unknown) => (v == null || v === "" ? "—" : /^(inicio|termino|data)/.test(k) ? dataBR(String(v)) : k === "status" ? (ROTULO_STATUS_ITEM[v as keyof typeof ROTULO_STATUS_ITEM] ?? ROTULO_STATUS_ENTREGA[v as keyof typeof ROTULO_STATUS_ENTREGA] ?? String(v)) : String(v));
              return (
                <tr key={h.id} className="border-t border-[var(--color-line)] align-top">
                  <td className="whitespace-nowrap px-2 py-1.5">{new Date(h.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="px-2 py-1.5">{h.nome ?? h.email ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    {objeto && <span className="text-[var(--color-ink3)]">{objeto} · </span>}
                    {acao}
                    {meta.nome ? `: ${meta.nome}` : ""}
                    {h.action === "plano.criar" && ` (${meta.origem}; ${meta.fases ?? 0} fase(s), ${meta.atividades ?? 0} atividade(s))`}
                  </td>
                  <td className="px-2 py-1.5">
                    {meta.mudou
                      ? Object.entries(meta.mudou)
                          .filter(([k]) => !k.endsWith("Id") || k === "parentId")
                          .map(([k, v]) => (
                            <div key={k}>
                              {ROTULO_CAMPO[k] ?? k}: {mostra(k, v.de)} → {mostra(k, v.para)}
                            </div>
                          ))
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5">{meta.justificativa ?? "—"}</td>
                </tr>
              );
            })}
            {!linhas.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-ink3)]">
                  Sem registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { anexarDocumentoDoPlano, atualizarAndamento, duplicarAtividade, excluirDoPlano, moverNoPlano, salvarAtividade, salvarFase } from "@/lib/actions/plano";
import { ROTULO_STATUS_ITEM, STATUS_ITEM, codigoDeExibicao, type Progresso } from "@/lib/plano-regras";
import { Mensagem, useAcao } from "@/components/app/contratos/comum";
import type { PlanoDaTela } from "./tipos";

export const dataBR = (s: string | null | undefined) => (s && s.length === 10 ? `${s.slice(3, 5)}/${s.slice(0, 2)}/${s.slice(6)}` : "—");
export const pct = (p: Progresso) => (p.percentual == null ? "—" : `${p.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const mini = "rounded px-1.5 py-0.5 text-[11.5px] text-[var(--color-ink3)] hover:bg-[var(--color-surface3)] hover:text-[var(--color-ink)] disabled:opacity-40";

export interface Permissoes {
  criar: boolean;
  editar: boolean;
  excluir: boolean;
}
type Alvo = { tipo: "fase"; id?: string } | { tipo: "atividade"; id?: string; faseId: string; parentId?: string | null };

/**
 * Estrutura hierárquica do plano (fase → atividade → subatividade) com
 * atualização rápida de situação e percentual, e edição completa no painel.
 * Tudo aqui vale SÓ para este projeto: o modelo de origem não muda.
 */
export function PlanoEstrutura({ plano, projectId, pode }: { plano: PlanoDaTela; projectId: string; pode: Permissoes }) {
  const { rodar, pendente, msg } = useAcao();
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [recolhidas, setRecolhidas] = useState<string[]>([]);
  const principais = (faseId: string) => plano.atividades.filter((a) => a.faseId === faseId && !a.parentId);
  const subs = (id: string) => plano.atividades.filter((a) => a.parentId === id);

  const andamento = (tipo: "fase" | "atividade", id: string, patch: { status?: string; percentual?: string | null }) => rodar(() => atualizarAndamento({ tipo, id, ...patch }), "Andamento atualizado.");

  const linha = (tipo: "fase" | "atividade", item: PlanoDaTela["fases"][number] | PlanoDaTela["atividades"][number], codigo: string, nivel: 0 | 1 | 2, extras: React.ReactNode) => (
    <tr key={item.id} className={`border-t border-[var(--color-line)] ${nivel === 0 ? "bg-[var(--color-surface2)]" : ""}`} data-linha={item.nome}>
      <td className="px-2 py-1.5 font-[family-name:var(--font-mono)] text-[11.5px] text-[var(--color-ink3)]">{item.codigo || codigo}</td>
      <td className="px-2 py-1.5" style={{ paddingLeft: 8 + nivel * 18 }}>
        <span className={nivel === 0 ? "font-semibold" : nivel === 2 ? "text-[12.5px]" : ""}>{item.nome}</span>
        {item.atrasada && <span className="ml-2 rounded bg-[#fee2e2] px-1.5 py-0.5 text-[10.5px] font-medium text-[#991b1b]">atrasada</span>}
        {item.desvioDias != null && item.desvioDias !== 0 && (
          <span className="ml-2 text-[10.5px] text-[var(--color-ink3)]" title={`Linha de base: ${dataBR(item.terminoOriginal)}`}>
            {item.desvioDias > 0 ? `+${item.desvioDias}` : item.desvioDias} d
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-[12.5px]">{item.responsavel ?? "—"}</td>
      <td className="whitespace-nowrap px-2 py-1.5 text-[12.5px]">{dataBR(item.inicioPrevisto)}</td>
      <td className="whitespace-nowrap px-2 py-1.5 text-[12.5px]">{dataBR(item.terminoPrevisto)}</td>
      <td className="px-2 py-1.5">
        {pode.editar ? (
          <Select className="h-7 w-[130px] text-[12px]" value={item.status} disabled={pendente} onChange={(e) => andamento(tipo, item.id, { status: e.target.value })} aria-label={`Situação de ${item.nome}`}>
            {STATUS_ITEM.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS_ITEM[s]}
              </option>
            ))}
          </Select>
        ) : (
          <span className="text-[12.5px]">{ROTULO_STATUS_ITEM[item.status as keyof typeof ROTULO_STATUS_ITEM] ?? item.status}</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-right">
        {pode.editar ? (
          <Input
            key={`${item.id}:${item.percentual}`}
            className="h-7 w-[64px] text-right text-[12px]"
            defaultValue={item.percentual ?? ""}
            placeholder={item.progresso.percentual != null ? String(item.progresso.percentual) : "—"}
            title={item.percentual == null ? (item.progresso.motivo ?? `consolidado (${item.progresso.base})`) : "informado"}
            onBlur={(e) => {
              const v = e.target.value.trim().replace(",", ".");
              if (v !== String(item.percentual ?? "")) andamento(tipo, item.id, { percentual: v || null });
            }}
            aria-label={`Percentual de ${item.nome}`}
          />
        ) : (
          <span className="text-[12.5px]">{pct(item.progresso)}</span>
        )}
      </td>
      <td className="whitespace-nowrap px-1 py-1.5 text-right">
        {pode.editar && (
          <button type="button" className={mini} onClick={() => setAlvo(tipo === "fase" ? { tipo, id: item.id } : { tipo, id: item.id, faseId: (item as PlanoDaTela["atividades"][number]).faseId, parentId: (item as PlanoDaTela["atividades"][number]).parentId })}>
            editar
          </button>
        )}
        {extras}
        {pode.excluir && (
          <button type="button" className={mini} disabled={pendente} onClick={() => window.confirm(`Excluir "${item.nome}"${tipo === "fase" ? " e tudo o que estiver dentro" : ""} deste projeto? O modelo não muda.`) && rodar(() => excluirDoPlano({ tipo, id: item.id }), "Excluído do plano.")}>
            excluir
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full min-w-[920px] text-[13px]">
          <thead className="text-left text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-ink3)]">
            <tr>
              <th className="px-2 py-2">Cód.</th>
              <th className="px-2 py-2">Fase / atividade</th>
              <th className="px-2 py-2">Responsável</th>
              <th className="px-2 py-2">Início</th>
              <th className="px-2 py-2">Término</th>
              <th className="px-2 py-2">Situação</th>
              <th className="px-2 py-2 text-right">%</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {plano.fases.map((f, fi) => {
              const ats = principais(f.id);
              const fechada = recolhidas.includes(f.id);
              return (
                <Fragment key={f.id}>
                  {linha(
                    "fase",
                    f,
                    codigoDeExibicao(fi + 1),
                    0,
                    <>
                      <button type="button" className={mini} onClick={() => setRecolhidas(fechada ? recolhidas.filter((x) => x !== f.id) : [...recolhidas, f.id])} aria-label={fechada ? "Expandir" : "Recolher"}>
                        {fechada ? "▸" : "▾"}
                      </button>
                      {pode.editar && (
                        <>
                          <button type="button" className={mini} disabled={pendente || fi === 0} onClick={() => rodar(() => moverNoPlano({ tipo: "fase", id: f.id, direcao: "cima" }), "Reordenado.")} aria-label="Subir fase">↑</button>
                          <button type="button" className={mini} disabled={pendente || fi === plano.fases.length - 1} onClick={() => rodar(() => moverNoPlano({ tipo: "fase", id: f.id, direcao: "baixo" }), "Reordenado.")} aria-label="Descer fase">↓</button>
                        </>
                      )}
                      {pode.criar && (
                        <button type="button" className={mini} onClick={() => setAlvo({ tipo: "atividade", faseId: f.id })}>
                          + atividade
                        </button>
                      )}
                    </>,
                  )}
                  {!fechada &&
                    ats.map((a, ai) => (
                      <Fragment key={a.id}>
                        {linha(
                          "atividade",
                          a,
                          codigoDeExibicao(fi + 1, ai + 1),
                          1,
                          <>
                            {pode.editar && (
                              <>
                                <button type="button" className={mini} disabled={pendente || ai === 0} onClick={() => rodar(() => moverNoPlano({ tipo: "atividade", id: a.id, direcao: "cima" }), "Reordenado.")} aria-label="Subir">↑</button>
                                <button type="button" className={mini} disabled={pendente || ai === ats.length - 1} onClick={() => rodar(() => moverNoPlano({ tipo: "atividade", id: a.id, direcao: "baixo" }), "Reordenado.")} aria-label="Descer">↓</button>
                                {plano.fases.length > 1 && (
                                  <select
                                    className="ml-1 h-6 w-[78px] rounded border border-[var(--color-line)] bg-white text-[11px] text-[var(--color-ink3)]"
                                    value=""
                                    disabled={pendente}
                                    onChange={(e) => e.target.value && rodar(() => moverNoPlano({ tipo: "atividade", id: a.id, paraFaseId: e.target.value }), "Atividade movida de fase.")}
                                    aria-label={`Mover ${a.nome} para outra fase`}
                                  >
                                    <option value="">mover…</option>
                                    {plano.fases.filter((x) => x.id !== f.id).map((x) => (
                                      <option key={x.id} value={x.id}>
                                        {x.nome}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </>
                            )}
                            {pode.criar && (
                              <>
                                <button type="button" className={mini} onClick={() => setAlvo({ tipo: "atividade", faseId: f.id, parentId: a.id })}>
                                  + sub
                                </button>
                                <button type="button" className={mini} disabled={pendente} onClick={() => rodar(() => duplicarAtividade(a.id), "Atividade duplicada.")}>
                                  duplicar
                                </button>
                              </>
                            )}
                          </>,
                        )}
                        {subs(a.id).map((s, si) => linha("atividade", s, codigoDeExibicao(fi + 1, ai + 1, si + 1), 2, null))}
                      </Fragment>
                    ))}
                </Fragment>
              );
            })}
            {!plano.fases.length && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[13px] text-[var(--color-ink3)]">
                  Nenhuma fase ainda. Monte o plano acima ou inclua uma fase.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pode.criar && (
        <Button size="sm" variant="outline" className="mt-2" onClick={() => setAlvo({ tipo: "fase" })}>
          + Fase
        </Button>
      )}
      <Mensagem msg={msg} />
      {alvo && <EditorDeItem key={`${alvo.tipo}:${alvo.id ?? "novo"}:${"parentId" in alvo ? alvo.parentId : ""}`} alvo={alvo} plano={plano} projectId={projectId} fechar={() => setAlvo(null)} />}
    </div>
  );
}

/** Painel de edição completa (fase ou atividade/subatividade). */
function EditorDeItem({ alvo, plano, projectId, fechar }: { alvo: Alvo; plano: PlanoDaTela; projectId: string; fechar: () => void }) {
  const { rodar, pendente, msg } = useAcao();
  const fase = alvo.tipo === "fase" && alvo.id ? plano.fases.find((f) => f.id === alvo.id) : null;
  const ativ = alvo.tipo === "atividade" && alvo.id ? plano.atividades.find((a) => a.id === alvo.id) : null;
  const atual = fase ?? ativ;
  const parentId = alvo.tipo === "atividade" ? (alvo.parentId ?? null) : null;
  const [f, setF] = useState({
    codigo: atual?.codigo ?? "",
    nome: atual?.nome ?? "",
    descricao: atual?.descricao ?? "",
    responsavel: atual?.responsavel ?? "",
    inicioPrevisto: atual?.inicioPrevisto ?? "",
    terminoPrevisto: atual?.terminoPrevisto ?? "",
    inicioReal: atual?.inicioReal ?? "",
    terminoReal: atual?.terminoReal ?? "",
    status: atual?.status ?? "planejada",
    percentual: atual?.percentual ?? "",
    peso: atual?.peso ?? "",
    obs: atual?.obs ?? "",
    justificativa: "",
    funcionarioId: ativ?.funcionarioId ?? "",
    funcaoId: ativ?.funcaoId ?? "",
    horasPrevistas: ativ?.horasPrevistas ?? "",
    horasRealizadas: ativ?.horasRealizadas ?? "",
    contratoItemId: ativ?.contratoItemId ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const reprogramando = !!atual && ((!!atual.inicioOriginal && f.inicioPrevisto !== (atual.inicioPrevisto ?? "")) || (!!atual.terminoOriginal && f.terminoPrevisto !== (atual.terminoPrevisto ?? "")));
  const veioDeModelo = !!(fase?.origemModeloFaseId || ativ?.origemModeloAtividadeId);
  const docs = atual ? plano.documentos.filter((d) => (fase ? d.faseId === fase.id : d.atividadeId === ativ?.id)) : [];
  const titulo = alvo.tipo === "fase" ? (atual ? "Editar fase" : "Nova fase") : atual ? (atual && "parentId" in atual && atual.parentId ? "Editar subatividade" : "Editar atividade") : parentId ? "Nova subatividade" : "Nova atividade";

  const salvar = () =>
    rodar(
      () =>
        alvo.tipo === "fase"
          ? salvarFase({ id: alvo.id ?? null, projectId, ...f })
          : salvarAtividade({ id: alvo.id ?? null, faseId: alvo.faseId, parentId: ativ ? ativ.parentId : parentId, ...f }),
      "Salvo neste projeto.",
      () => !atual && fechar(),
    );

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" role="dialog" aria-label={titulo} onClick={fechar}>
      <div className="h-full w-full max-w-[560px] overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{titulo}</h3>
          <Button size="sm" variant="ghost" onClick={fechar}>
            Fechar
          </Button>
        </div>
        {veioDeModelo && (
          <p className="mb-3 rounded-[10px] bg-[var(--color-surface2)] px-3 py-2 text-[12px] text-[var(--color-ink2)]">
            Este item veio de um modelo. O que você mudar aqui vale <strong>somente neste projeto</strong>. Para mudar a sugestão de projetos futuros,{" "}
            <Link href="/modelos" className="text-[var(--color-accent2)] underline">
              edite o modelo padrão
            </Link>
            .
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo rotulo="Nome" span>
            <Input value={f.nome} onChange={(e) => set("nome", e.target.value)} />
          </Campo>
          <Campo rotulo="Código (opcional)">
            <Input value={f.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="automático" />
          </Campo>
          <Campo rotulo="Responsável">
            <Input value={f.responsavel} onChange={(e) => set("responsavel", e.target.value)} />
          </Campo>
          <Campo rotulo="Descrição" span>
            <Input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} />
          </Campo>
          <Campo rotulo={`Início planejado${atual?.inicioOriginal ? ` (base ${dataBR(atual.inicioOriginal)})` : ""}`}>
            <DateField value={f.inicioPrevisto} onChange={(v) => set("inicioPrevisto", v)} />
          </Campo>
          <Campo rotulo={`Término planejado${atual?.terminoOriginal ? ` (base ${dataBR(atual.terminoOriginal)})` : ""}`}>
            <DateField value={f.terminoPrevisto} onChange={(v) => set("terminoPrevisto", v)} />
          </Campo>
          {reprogramando && (
            <Campo rotulo="Justificativa da reprogramação" span>
              <Input value={f.justificativa} onChange={(e) => set("justificativa", e.target.value)} placeholder="ex.: atraso na emissão da licença pelo órgão" />
            </Campo>
          )}
          <Campo rotulo="Início real">
            <DateField value={f.inicioReal} onChange={(v) => set("inicioReal", v)} />
          </Campo>
          <Campo rotulo="Conclusão real">
            <DateField value={f.terminoReal} onChange={(v) => set("terminoReal", v)} />
          </Campo>
          <Campo rotulo="Situação">
            <Select value={f.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS_ITEM.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS_ITEM[s]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Percentual executado (0–100)">
            <Input value={f.percentual} onChange={(e) => set("percentual", e.target.value)} placeholder="vazio = consolidar" />
          </Campo>
          <Campo rotulo="Peso (para consolidar o progresso)">
            <Input value={f.peso} onChange={(e) => set("peso", e.target.value)} placeholder="opcional" />
          </Campo>
          {alvo.tipo === "atividade" && (
            <>
              <Campo rotulo="Profissional">
                <Select value={f.funcionarioId} onChange={(e) => set("funcionarioId", e.target.value)}>
                  <option value="">—</option>
                  {plano.funcionarios.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Função">
                <Select value={f.funcaoId} onChange={(e) => set("funcaoId", e.target.value)}>
                  <option value="">—</option>
                  {plano.funcoes.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo rotulo="Horas previstas">
                <Input value={f.horasPrevistas} onChange={(e) => set("horasPrevistas", e.target.value)} />
              </Campo>
              <Campo rotulo="Horas realizadas">
                <Input value={f.horasRealizadas} onChange={(e) => set("horasRealizadas", e.target.value)} />
              </Campo>
              <Campo rotulo="Item contratual (opcional)" span>
                <Select value={f.contratoItemId} onChange={(e) => set("contratoItemId", e.target.value)}>
                  <option value="">— sem vínculo —</option>
                  {plano.contratos.itens.map((i) => (
                    <option key={i.id} value={i.id}>
                      {plano.contratos.opcoes.find((c) => c.id === i.contratoId)?.codigo} · {i.codigo} {i.descricao}
                    </option>
                  ))}
                </Select>
              </Campo>
            </>
          )}
          <Campo rotulo="Observações" span>
            <Input value={f.obs} onChange={(e) => set("obs", e.target.value)} />
          </Campo>
        </div>
        <div className="mt-4 flex gap-2">
          <Button disabled={pendente || !f.nome.trim()} onClick={salvar}>
            {atual ? "Salvar somente neste projeto" : "Incluir"}
          </Button>
        </div>
        <Mensagem msg={msg} />
        {atual && <Documentos alvo={alvo.tipo} id={atual.id} docs={docs} />}
      </div>
    </div>
  );
}

export function Documentos({ alvo, id, docs }: { alvo: "fase" | "atividade" | "entrega"; id: string; docs: PlanoDaTela["documentos"] }) {
  const { rodar, pendente, msg } = useAcao();
  return (
    <div className="mt-5 border-t border-[var(--color-line)] pt-3">
      <h4 className="mb-2 text-[13px] font-semibold">Documentos</h4>
      <ul className="mb-2 space-y-1 text-[12.5px]">
        {docs.map((d) => (
          <li key={d.id}>
            {d.url ? (
              <a href={d.url} target="_blank" rel="noreferrer" className="text-[var(--color-accent2)] underline">
                {d.filename}
              </a>
            ) : (
              d.filename
            )}
          </li>
        ))}
        {!docs.length && <li className="text-[var(--color-ink3)]">Nenhum documento.</li>}
      </ul>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("alvo", alvo);
          fd.set("id", id);
          const form = e.currentTarget;
          rodar(() => anexarDocumentoDoPlano(fd), "Documento anexado.", () => form.reset());
        }}
      >
        <Input name="tipo" placeholder="Tipo (ex.: relatório, ART, laudo)" className="h-8 max-w-[220px]" />
        <input name="file" type="file" className="text-[12px]" aria-label="Arquivo" />
        <Button size="sm" variant="outline" disabled={pendente}>
          Anexar
        </Button>
      </form>
      <Mensagem msg={msg} />
    </div>
  );
}

export function Campo({ rotulo, span, children }: { rotulo: string; span?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-[12px] text-[var(--color-ink2)] ${span ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block">{rotulo}</span>
      {children}
    </label>
  );
}

"use client";

import { Fragment, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addEquipeDiaDocs, addFuncao, alocarMembro, deleteEquipeDiaDoc, encerrarAlocacao, reabrirAlocacao, registrarDiariasDoDia, removerDiaria, setFuncaoAtiva, updateAlocacao } from "@/lib/actions/equipes";
import { acumuladoPorMembro, competenciaDaData, linkParaLancarDiarias, QUANTIDADES_DIARIA, TIPOS_DOC_EQUIPE_DIA } from "@/lib/equipe-regras";
import type { Alocavel, DiaDaEquipe, MembroDaEquipe } from "@/lib/queries";
import { LIMITE_UPLOAD_MB } from "@/lib/clientes-regras";
import { comprimirImagem } from "@/lib/imagem-compressao";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface DocDoDia { id: string; filename: string; tipo: string | null; versao: number; contentType: string | null; url: string | null }
export interface FuncaoView { id: string; nome: string; ativo: boolean }

const ORIGEM: Record<MembroDaEquipe["origem"], { rotulo: string; tone: "success" | "neutral" | "warning" }> = { autonomo: { rotulo: "autônomo · Fornecedores", tone: "success" }, clt: { rotulo: "CLT · Funcionários", tone: "neutral" }, socio: { rotulo: "sócio · Fornecedores", tone: "warning" } };
const qtd = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const hojeInterno = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

/**
 * Equipes de Projetos (Prompt Z, Parte 3): alocação com origem única e
 * função por obra; diárias em lote com o valor da alocação gravado;
 * acumulado por membro; documentos e fotos por dia. A diária não gera
 * despesa (BZ-1): a tela PROPÕE o lançamento em Despesas, com o autônomo
 * como fornecedor. Sem geolocalização.
 */
export function EquipesManager({ projectId, projectName, equipe, alocaveis, funcoes, dias, docsPorDia, de, ate, canCriar, canEditar, canExcluir, r2 }: { projectId: string; projectName: string; equipe: MembroDaEquipe[]; alocaveis: Alocavel[]; funcoes: FuncaoView[]; dias: DiaDaEquipe[]; docsPorDia: Record<string, DocDoDia[]>; de: string; ate: string; canCriar: boolean; canEditar: boolean; canExcluir: boolean; r2: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const ok = (texto: string) => setMsg({ ok: true, texto });
  const erro = (texto: string) => setMsg({ ok: false, texto });
  const ativos = equipe.filter((m) => m.situacao === "ativa");

  // alocação
  const [alocavel, setAlocavel] = useState("");
  const [funcaoId, setFuncaoId] = useState("");
  const [valorDiaria, setValorDiaria] = useState("");
  const [entrada, setEntrada] = useState(hojeInterno());
  const sel = alocaveis.find((a) => `${a.origem}:${a.id}` === alocavel) ?? null;
  const alocar = () => start(async () => {
    if (!sel) return erro("Escolha quem entra na equipe.");
    const fd = new FormData();
    fd.set("projectId", projectId);
    fd.set(sel.origem === "clt" ? "funcionarioId" : "stakeholderId", sel.id);
    fd.set("funcaoId", funcaoId);
    if (sel.origem === "autonomo") fd.set("valorDiaria", valorDiaria);
    fd.set("entrada", entrada);
    const r = await alocarMembro(fd);
    if (!r.ok) return erro(r.error);
    ok(`${sel.nome} alocado(a).`);
    setAlocavel("");
    setValorDiaria("");
    router.refresh();
  });
  // edição inline de alocação
  const [editando, setEditando] = useState<string | null>(null);
  const [edFuncao, setEdFuncao] = useState("");
  const [edValor, setEdValor] = useState("");
  const salvarAlocacao = (m: MembroDaEquipe) => start(async () => {
    const fd = new FormData();
    fd.set("funcaoId", edFuncao);
    if (m.origem === "autonomo") fd.set("valorDiaria", edValor);
    const r = await updateAlocacao(m.id, fd);
    if (!r.ok) return erro(r.error);
    ok(r.aviso ?? "Alocação atualizada.");
    setEditando(null);
    router.refresh();
  });
  const encerrar = (m: MembroDaEquipe) => {
    const d = window.prompt(`Saída de ${m.nome} da equipe (DD/MM/AAAA):`, dateBR(hojeInterno()));
    if (!d) return;
    const p = d.split("/");
    const interno = p.length === 3 ? `${p[1].padStart(2, "0")}/${p[0].padStart(2, "0")}/${p[2]}` : d;
    start(async () => {
      const r = await encerrarAlocacao(m.id, interno);
      if (!r.ok) return erro(r.error);
      ok("Alocação encerrada; o histórico fica.");
      router.refresh();
    });
  };

  // funções (BZ-3)
  const [novaFuncao, setNovaFuncao] = useState("");
  const [mostrarFuncoes, setMostrarFuncoes] = useState(false);

  // diárias em lote (3.5.2)
  const [dataDia, setDataDia] = useState(hojeInterno());
  const [marcados, setMarcados] = useState<Record<string, number>>({});
  const [obsDia, setObsDia] = useState("");
  const registrar = () => start(async () => {
    const itens = Object.entries(marcados).filter(([, q]) => q > 0).map(([equipeProjetoId, quantidade]) => ({ equipeProjetoId, quantidade }));
    const r = await registrarDiariasDoDia({ projectId, data: dataDia, obs: obsDia, itens });
    if (!r.ok) return erro(r.error);
    ok(`${r.registradas} diária(s) registrada(s) em ${dateBR(dataDia)}. Nenhuma despesa foi gerada: o lançamento é proposto no acumulado.`);
    setMarcados({});
    setObsDia("");
    router.refresh();
  });
  const marcarTodos = () => setMarcados(Object.fromEntries(ativos.map((m) => [m.id, 1])));

  // acumulado (3.5.5) e proposta (BZ-1)
  const todasDiarias = dias.flatMap((d) => d.diarias.map((x) => ({ ...x, data: d.data })));
  const acumulado = acumuladoPorMembro(todasDiarias);
  const competencia = de ? `${de.slice(5, 7)}/${de.slice(0, 4)}` : competenciaDaData(hojeInterno());

  // documentos por dia
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [tipoDoc, setTipoDoc] = useState<string>(TIPOS_DOC_EQUIPE_DIA[0]);
  const fileRef = useRef<HTMLInputElement>(null);
  const anexar = (equipeDiaId: string) => {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return erro("Selecione ao menos um arquivo.");
    start(async () => {
      const fd = new FormData();
      fd.set("equipeDiaId", equipeDiaId);
      fd.set("tipo", tipoDoc);
      for (const f of Array.from(files)) fd.append("file", await comprimirImagem(f));
      const r = await addEquipeDiaDocs(fd);
      if (!r.ok) return erro(r.error);
      ok(`${r.added} arquivo(s) anexado(s) ao dia.`);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[12.5px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{msg.texto}</p>}

      {/* Equipe */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Equipe de {projectName} <span className="font-normal text-[var(--color-ink3)]">· {ativos.length} ativo(s)</span></h3>
            {canEditar && <button type="button" className="text-[12px] text-[var(--color-accent2)] hover:underline" onClick={() => setMostrarFuncoes(!mostrarFuncoes)}>{mostrarFuncoes ? "fechar funções" : "funções (lista fechada)"}</button>}
          </div>
          {mostrarFuncoes && canEditar && (
            <div className="rounded-[8px] border border-[var(--color-line)] p-3 text-[12.5px]" data-funcoes>
              <p className="mb-2 text-[11.5px] text-[var(--color-ink3)]">A função diz o que a pessoa faz naquele projeto (não confundir com o papel do cadastro). Lista fechada, editável aqui.</p>
              <ul className="mb-2 flex flex-wrap gap-2">
                {funcoes.map((f) => (
                  <li key={f.id} className={`flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-0.5 ${f.ativo ? "" : "opacity-50"}`}>
                    {f.nome}
                    <button type="button" className="text-[11px] text-[var(--color-ink3)] hover:underline" disabled={pending} onClick={() => start(async () => { const r = await setFuncaoAtiva(f.id, !f.ativo); if (!r.ok) erro(r.error); router.refresh(); })}>{f.ativo ? "inativar" : "reativar"}</button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input value={novaFuncao} onChange={(e) => setNovaFuncao(e.target.value)} placeholder="Nova função" aria-label="Nova função" />
                <Button type="button" size="sm" disabled={pending || !novaFuncao.trim()} onClick={() => start(async () => { const r = await addFuncao(novaFuncao); if (!r.ok) return erro(r.error); setNovaFuncao(""); router.refresh(); })}>Adicionar</Button>
              </div>
            </div>
          )}
          {canCriar && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 sm:items-end">
              <div className="sm:col-span-2">
                <Label>Quem entra * <span className="font-normal text-[var(--color-ink3)]">(com a origem do cadastro)</span></Label>
                <Select value={alocavel} onChange={(e) => setAlocavel(e.target.value)} aria-label="Quem entra na equipe">
                  <option value="">— escolha —</option>
                  {alocaveis.map((a) => <option key={`${a.origem}:${a.id}`} value={`${a.origem}:${a.id}`}>{a.nome} · {ORIGEM[a.origem].rotulo}{a.detalhe ? ` · ${a.detalhe}` : ""}</option>)}
                </Select>
              </div>
              <div>
                <Label>Função</Label>
                <Select value={funcaoId} onChange={(e) => setFuncaoId(e.target.value)} aria-label="Função"><option value="">—</option>{funcoes.filter((f) => f.ativo).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</Select>
              </div>
              <div>
                <Label>{sel?.origem === "autonomo" || !sel ? "Valor da diária (R$)" : "Diária"}</Label>
                {sel && sel.origem !== "autonomo" ? <Input value="— (folha / retirada)" readOnly /> : <Input value={valorDiaria} onChange={(e) => setValorDiaria(e.target.value)} inputMode="decimal" placeholder="0,00" aria-label="Valor da diária" />}
              </div>
              <div><Label>Entrada</Label><DateField value={entrada} onChange={setEntrada} /></div>
              <div><Button type="button" className="w-full" disabled={pending || !sel} onClick={alocar}>Alocar</Button></div>
            </div>
          )}
          <div className="tbl-scroll overflow-x-auto">
            <Table>
              <THead><tr><TH>Membro</TH><TH>Origem</TH><TH>Função</TH><TH className="text-right">Diária vigente</TH><TH>Entrada</TH><TH>Saída</TH><TH>Situação</TH>{canEditar && <TH></TH>}</tr></THead>
              <tbody>
                {equipe.map((m) => (
                  <TR key={m.id} className={m.situacao === "ativa" ? "" : "opacity-60"} data-membro={m.id}>
                    <TD className="font-medium text-[var(--color-ink)]">{m.nome}</TD>
                    <TD><Badge tone={ORIGEM[m.origem].tone}>{ORIGEM[m.origem].rotulo}</Badge></TD>
                    <TD>
                      {editando === m.id ? <Select value={edFuncao} onChange={(e) => setEdFuncao(e.target.value)} aria-label="Editar função"><option value="">—</option>{funcoes.filter((f) => f.ativo || f.id === m.funcaoId).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</Select> : m.funcaoNome ?? <span className="text-[var(--color-warning)]">sem função</span>}
                    </TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">
                      {editando === m.id && m.origem === "autonomo" ? <Input value={edValor} onChange={(e) => setEdValor(e.target.value)} inputMode="decimal" aria-label="Editar valor da diária" /> : m.origem === "autonomo" ? (m.valorDiaria == null ? <span className="text-[var(--color-warning)]">definir</span> : brl0(m.valorDiaria)) : "—"}
                    </TD>
                    <TD className="font-[family-name:var(--font-mono)]">{m.entrada ? dateBR(m.entrada) : "—"}</TD>
                    <TD className="font-[family-name:var(--font-mono)]">{m.saida ? dateBR(m.saida) : "—"}</TD>
                    <TD><Badge tone={m.situacao === "ativa" ? "success" : "neutral"}>{m.situacao}</Badge></TD>
                    {canEditar && (
                      <TD className="whitespace-nowrap text-right text-[12px]">
                        {editando === m.id ? (
                          <>
                            <button type="button" className="text-[var(--color-accent2)] hover:underline" disabled={pending} onClick={() => salvarAlocacao(m)}>Salvar</button>
                            <button type="button" className="ml-3 text-[var(--color-ink3)] hover:underline" onClick={() => setEditando(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="text-[var(--color-accent2)] hover:underline" onClick={() => { setEditando(m.id); setEdFuncao(m.funcaoId ?? ""); setEdValor(m.valorDiaria == null ? "" : String(m.valorDiaria)); }}>Editar</button>
                            {m.situacao === "ativa" ? <button type="button" className="ml-3 text-[var(--color-ink3)] hover:underline" disabled={pending} onClick={() => encerrar(m)}>Encerrar</button> : <button type="button" className="ml-3 text-[var(--color-ink3)] hover:underline" disabled={pending} onClick={() => start(async () => { const r = await reabrirAlocacao(m.id); if (!r.ok) erro(r.error); router.refresh(); })}>Reabrir</button>}
                          </>
                        )}
                      </TD>
                    )}
                  </TR>
                ))}
                {equipe.length === 0 && <TR><TD colSpan={8} className="py-6 text-center text-[var(--color-ink4)]">Ninguém alocado neste projeto.</TD></TR>}
              </tbody>
            </Table>
          </div>
          <p className="text-[11px] text-[var(--color-ink3)]">A equipe referencia o cadastro de origem (Fornecedores para autônomo e sócio; Funcionários para CLT) — nome e documento não são copiados. O valor da diária é desta alocação e fica gravado em cada registro: alterar vale para os próximos.</p>
        </CardContent>
      </Card>

      {/* Diárias em lote */}
      {canCriar && ativos.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Registrar o dia <span className="font-normal text-[var(--color-ink3)]">· marque quem trabalhou e confirme (sem geolocalização: é declaração de quem coordena o projeto)</span></h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 sm:items-end">
              <div><Label>Data</Label><DateField value={dataDia} onChange={setDataDia} /></div>
              <div className="sm:col-span-3"><Label>Observação do dia</Label><Input value={obsDia} onChange={(e) => setObsDia(e.target.value)} /></div>
              <div><Button type="button" variant="outline" size="sm" className="w-full" onClick={marcarTodos}>Marcar todos</Button></div>
              <div><Button type="button" className="w-full" disabled={pending || !Object.values(marcados).some((q) => q > 0)} onClick={registrar}>Registrar o dia</Button></div>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" data-lote>
              {ativos.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-[8px] border border-[var(--color-line)] px-3 py-2 text-[12.5px]">
                  <input type="checkbox" checked={(marcados[m.id] ?? 0) > 0} onChange={(e) => setMarcados({ ...marcados, [m.id]: e.target.checked ? 1 : 0 })} aria-label={`Trabalhou: ${m.nome}`} />
                  <span className="min-w-0 flex-1 truncate"><span className="font-medium text-[var(--color-ink)]">{m.nome}</span> <span className="text-[var(--color-ink3)]">{m.funcaoNome ?? ""}{m.origem === "autonomo" ? ` · ${m.valorDiaria == null ? "sem valor!" : brl0(m.valorDiaria) + "/dia"}` : " · presença"}</span></span>
                  <Select value={String(marcados[m.id] ?? 1)} onChange={(e) => setMarcados({ ...marcados, [m.id]: Number(e.target.value) })} aria-label={`Quantidade: ${m.nome}`} className="w-20">
                    {QUANTIDADES_DIARIA.map((q) => <option key={q} value={q}>{qtd(q)}</option>)}
                  </Select>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Acumulado e proposta */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Acumulado por membro <span className="font-normal text-[var(--color-ink3)]">{de || ate ? `· ${de ? dateBR(`${de.slice(5, 7)}/${de.slice(8, 10)}/${de.slice(0, 4)}`) : "…"} a ${ate ? dateBR(`${ate.slice(5, 7)}/${ate.slice(8, 10)}/${ate.slice(0, 4)}`) : "…"}` : "· todo o período"}</span></h3>
            <form method="get" action="/equipes" className="flex items-end gap-2 text-[12px]">
              <input type="hidden" name="proj" value={projectId} />
              <div><Label>De</Label><Input type="date" name="de" defaultValue={de} /></div>
              <div><Label>Até</Label><Input type="date" name="ate" defaultValue={ate} /></div>
              <Button type="submit" variant="outline" size="sm">Filtrar</Button>
            </form>
          </div>
          <p className="text-[12px] text-[var(--color-ink2)]">Total da equipe: <strong>{qtd(acumulado.total.quantidade)} diária(s)</strong> · <strong>{brl0(acumulado.total.valor)}</strong> (só autônomos; CLT e sócio são presença). <strong>A diária não gera despesa:</strong> o lançamento é proposto abaixo e acontece em Despesas, com o autônomo como fornecedor — ali nascem competência, categoria, conta CEF e documento.</p>
          <Table>
            <THead><tr><TH>Membro</TH><TH className="text-right">Diárias</TH><TH className="text-right">Valor</TH><TH className="text-right">Sem lançamento</TH><TH></TH></tr></THead>
            <tbody>
              {acumulado.membros.map((a) => {
                const m = equipe.find((x) => x.id === a.equipeProjetoId);
                if (!m) return null;
                return (
                  <TR key={a.equipeProjetoId}>
                    <TD className="font-medium text-[var(--color-ink)]">{m.nome}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{qtd(a.quantidade)}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{m.origem === "autonomo" ? brl0(a.valor) : "—"}</TD>
                    <TD className="text-right font-[family-name:var(--font-mono)]">{m.origem === "autonomo" ? `${qtd(a.semDespesa.quantidade)} · ${brl0(a.semDespesa.valor)}` : "—"}</TD>
                    <TD className="text-right text-[12px]">
                      {m.origem === "autonomo" && m.stakeholderId && a.semDespesa.valor > 0 && (
                        <Link href={linkParaLancarDiarias({ projectId, fornecedorId: m.stakeholderId, nome: m.nome, valor: a.semDespesa.valor, competencia, quantidade: a.semDespesa.quantidade, diariasIds: a.semDespesa.ids })} className="text-[var(--color-accent2)] hover:underline">Lançar em Despesas →</Link>
                      )}
                    </TD>
                  </TR>
                );
              })}
              {acumulado.membros.length === 0 && <TR><TD colSpan={5} className="py-6 text-center text-[var(--color-ink4)]">Nenhuma diária no período.</TD></TR>}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Dias registrados */}
      <Card>
        <CardContent className="p-0">
          <div className="tbl-scroll overflow-x-auto">
            <Table>
              <THead><tr><TH>Dia</TH><TH>Quem trabalhou</TH><TH className="text-right">Diárias</TH><TH className="text-right">Valor</TH><TH>Docs / fotos</TH></tr></THead>
              <tbody>
                {dias.map((d) => {
                  const total = d.diarias.reduce((s, x) => s + x.quantidade, 0);
                  const valor = d.diarias.reduce((s, x) => s + (x.valor ?? 0) * x.quantidade, 0);
                  return (
                    <Fragment key={d.id}>
                      <TR data-dia={d.data}>
                        <TD className="whitespace-nowrap font-[family-name:var(--font-mono)]">{dateBR(d.data)}{d.obs ? <span className="block text-[11px] text-[var(--color-ink4)]">{d.obs}</span> : null}</TD>
                        <TD className="text-[12px] text-[var(--color-ink2)]">
                          {d.diarias.map((x) => {
                            const m = equipe.find((e) => e.id === x.equipeProjetoId);
                            return (
                              <span key={x.id} className="mr-2 inline-flex items-center gap-1">
                                {m?.nome ?? "?"} <span className="text-[var(--color-ink4)]">{qtd(x.quantidade)}{x.valor != null ? ` × ${brl0(x.valor)}` : ""}</span>
                                {x.despesaId && <Badge tone="success">lançada</Badge>}
                                {canExcluir && !x.despesaId && <button type="button" className="text-[11px] text-[var(--color-danger)] hover:underline" disabled={pending} onClick={() => { if (window.confirm(`Remover a diária de ${m?.nome ?? "?"} em ${dateBR(d.data)}?`)) start(async () => { const r = await removerDiaria(x.id); if (!r.ok) erro(r.error); router.refresh(); }); }}>×</button>}
                              </span>
                            );
                          })}
                        </TD>
                        <TD className="text-right font-[family-name:var(--font-mono)]">{qtd(total)}</TD>
                        <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(valor)}</TD>
                        <TD className="text-[12px]"><button type="button" className="text-[var(--color-accent2)] hover:underline" aria-expanded={diaAberto === d.id} onClick={() => setDiaAberto(diaAberto === d.id ? null : d.id)}>{d.documentos > 0 ? `${d.documentos} doc(s)` : "anexar"}</button></TD>
                      </TR>
                      {diaAberto === d.id && (
                        <TR>
                          <TD colSpan={5} className="bg-[var(--color-surface2)]/40">
                            <div className="space-y-2 py-1" data-docs-dia={d.id}>
                              <p className="text-[12px] text-[var(--color-ink2)]"><strong>Documentos do dia</strong> · folha de ponto assinada, foto da equipe, recibo de diária. Por dia, não por membro: a folha e a foto cobrem a equipe inteira.</p>
                              {canCriar && r2 && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-end">
                                  <div><Label>Tipo *</Label><Select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} aria-label="Tipo do documento do dia">{TIPOS_DOC_EQUIPE_DIA.filter((t) => t !== "Foto da equipe no canteiro").map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
                                  <div className="sm:col-span-2"><Label>Arquivos ou fotos (até {LIMITE_UPLOAD_MB} MB; fotos comprimidas)</Label><input ref={fileRef} type="file" multiple accept="image/*,application/pdf" className="text-xs" aria-label="Arquivos do dia" /></div>
                                  <div><Button type="button" size="sm" className="w-full" disabled={pending} onClick={() => anexar(d.id)}>Anexar</Button></div>
                                </div>
                              )}
                              {!r2 && <p className="text-[12px] text-[var(--color-warning)]">Configure as variáveis R2_* para habilitar o anexo.</p>}
                              {(docsPorDia[d.id] ?? []).length === 0 ? <p className="text-[12px] text-[var(--color-ink4)]">Nenhum documento neste dia.</p> : (
                                <ul className="flex flex-wrap gap-2">
                                  {(docsPorDia[d.id] ?? []).map((x) => (
                                    <li key={x.id} className="w-32 text-[10.5px] text-[var(--color-ink3)]">
                                      {x.contentType?.startsWith("image/") && x.url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <a href={x.url} target="_blank" rel="noopener"><img src={x.url} alt={x.filename} className="h-20 w-32 rounded-[8px] border border-[var(--color-line)] object-cover" /></a>
                                      ) : x.url ? <a href={x.url} target="_blank" rel="noopener" className="text-[var(--color-accent2)] hover:underline">{x.filename}</a> : x.filename}
                                      <div className="truncate">{x.tipo} · v{x.versao}</div>
                                      {canCriar && <button type="button" disabled={pending} onClick={() => { if (window.confirm(`Remover "${x.filename}"? O arquivo continua guardado; só o vínculo sai.`)) start(async () => { const r = await deleteEquipeDiaDoc(x.id); if (!r.ok) erro(r.error); router.refresh(); }); }} className="text-[var(--color-danger)] hover:underline">Remover</button>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </TD>
                        </TR>
                      )}
                    </Fragment>
                  );
                })}
                {dias.length === 0 && <TR><TD colSpan={5} className="py-6 text-center text-[var(--color-ink4)]">Nenhum dia registrado.</TD></TR>}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { DateField, MonthField } from "@/components/ui/date-field";
import { dateBR } from "@/lib/utils";
import {
  anexarDocumentoContrato,
  apropriarDespesa,
  cancelarItem,
  faturarContrato,
  incluirReembolso,
  mudarStatusAditivo,
  mudarStatusContrato,
  mudarStatusMedicao,
  mudarStatusReembolso,
  salvarAditivo,
  salvarItem,
  salvarMarco,
  salvarMedicao,
  vincularProjetos,
} from "@/lib/actions/contratos";
import {
  CRITERIOS_MEDICAO,
  ROTULO_CRITERIO,
  ROTULO_STATUS_CONTRATO,
  ROTULO_STATUS_MARCO,
  ROTULO_TIPO_ADITIVO,
  STATUS_MARCO,
  TIPOS_ADITIVO,
  TIPOS_DOC_CONTRATO,
  lerNumero,
  recusaTransicaoContrato,
  totalDoItem,
  type StatusContrato,
} from "@/lib/contrato-regras";
import { brl, Mensagem, novaChave, pedirMotivo, StatusBadge, useAcao } from "./comum";

const hojeBR = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};
const th = "px-2 py-1.5 text-left text-[10.5px] font-medium uppercase tracking-wide text-[var(--color-ink3)]";
const td = "px-2 py-1.5 align-top";
const mono = "font-[family-name:var(--font-mono)]";

// ───────────────────────────── Situação do contrato ─────────────────────────────

export function AcoesDeSituacao({ id, status, podeEditar }: { id: string; status: string; podeEditar: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  if (!podeEditar) return null;
  const destinos = (["rascunho", "aguardando_assinatura", "ativo", "suspenso", "concluido", "encerrado", "cancelado"] as StatusContrato[]).filter((p) => p !== status && !recusaTransicaoContrato(status, p));
  const verbo: Record<StatusContrato, string> = {
    rascunho: "Voltar a rascunho",
    aguardando_assinatura: "Enviar para assinatura",
    ativo: status === "suspenso" ? "Retomar" : status === "concluido" ? "Reabrir" : "Ativar",
    suspenso: "Suspender",
    concluido: "Concluir",
    encerrado: "Encerrar",
    cancelado: "Cancelar contrato",
  };
  if (!destinos.length) return null;
  const ir = (para: StatusContrato) => {
    let motivo: string | null = null;
    if (["cancelado", "suspenso", "encerrado"].includes(para)) {
      motivo = pedirMotivo(`Motivo para "${ROTULO_STATUS_CONTRATO[para]}":`);
      if (!motivo) return;
    } else if (!window.confirm(`${verbo[para]}? A situação do contrato passa a "${ROTULO_STATUS_CONTRATO[para]}".`)) return;
    rodar(() => mudarStatusContrato({ id, para, motivo }), `Contrato: ${ROTULO_STATUS_CONTRATO[para]}.`);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {destinos.map((d) => (
        <Button key={d} type="button" size="sm" variant={d === "ativo" ? "default" : "outline"} disabled={pendente} onClick={() => ir(d)}>
          {verbo[d]}
        </Button>
      ))}
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Projetos ─────────────────────────────

export function ProjetosEditor({ contratoId, atuais, opcoes, podeEditar }: { contratoId: string; atuais: { projectId: string; nome: string; valorAlocado: string | null }[]; opcoes: { id: string; nome: string }[]; podeEditar: boolean }) {
  const [lista, setLista] = useState(atuais.map((a) => ({ projectId: a.projectId, valorAlocado: a.valorAlocado ?? "" })));
  const { rodar, pendente, msg } = useAcao();
  if (!podeEditar)
    return (
      <ul className="text-[13px]">
        {atuais.map((a) => (
          <li key={a.projectId}>
            {a.nome} {a.valorAlocado ? `· ${brl(a.valorAlocado)}` : ""}
          </li>
        ))}
      </ul>
    );
  return (
    <div>
      {lista.map((p, i) => (
        <div key={i} className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px_auto]">
          <Select value={p.projectId} onChange={(e) => setLista((l) => l.map((x, j) => (j === i ? { ...x, projectId: e.target.value } : x)))} aria-label="Projeto">
            <option value="">— projeto —</option>
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Select>
          <MoneyInput value={p.valorAlocado} onChange={(v) => setLista((l) => l.map((x, j) => (j === i ? { ...x, valorAlocado: v } : x)))} placeholder="valor alocado (opcional)" aria-label="Valor alocado" />
          <Button type="button" variant="ghost" size="sm" onClick={() => setLista((l) => l.filter((_, j) => j !== i))}>
            Remover
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setLista((l) => [...l, { projectId: "", valorAlocado: "" }])}>
          + Projeto
        </Button>
        <Button type="button" size="sm" disabled={pendente} onClick={() => rodar(() => vincularProjetos({ contratoId, projetos: lista.filter((p) => p.projectId) }), "Projetos salvos.")}>
          Salvar projetos
        </Button>
      </div>
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Itens ─────────────────────────────

export interface ItemDaTela {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
  criterioMedicao: string;
  projectId: string | null;
  etapa: string | null;
  responsavel: string | null;
  status: string;
  cancelado: boolean;
  origemAditivoId: string | null;
  limite: number;
  vigente: boolean;
  medido: number;
  saldo: number;
}

export function ItensPainel({ contratoId, itens, projetos, emPreparo, podeEditar, aditivosEditaveis }: { contratoId: string; itens: ItemDaTela[]; projetos: { id: string; nome: string }[]; emPreparo: boolean; podeEditar: boolean; aditivosEditaveis: { id: string; codigo: string }[] }) {
  const { rodar, pendente, msg } = useAcao();
  const vazio = { codigo: "", descricao: "", unidade: "", quantidade: "1", valorUnitario: "", criterioMedicao: "percentual", projectId: "", etapa: "", responsavel: "", origemAditivoId: "" };
  const [novo, setNovo] = useState(vazio);
  const podeIncluir = podeEditar && (emPreparo || aditivosEditaveis.length > 0);
  const total = itens.filter((i) => i.vigente).reduce((s, i) => s + i.limite, 0);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className={th}>Item</th>
              <th className={th}>Descrição</th>
              <th className={`${th} text-right`}>Qtd.</th>
              <th className={`${th} text-right`}>Unitário</th>
              <th className={`${th} text-right`}>Valor vigente</th>
              <th className={`${th} text-right`}>Medido</th>
              <th className={`${th} text-right`}>Saldo</th>
              <th className={th}>Critério</th>
              <th className={th}>Projeto · etapa</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id} className={`border-t border-[var(--color-line)] ${!i.vigente ? "opacity-60" : ""}`}>
                <td className={`${td} ${mono}`}>{i.codigo}</td>
                <td className={td}>
                  {i.descricao}
                  {i.origemAditivoId && <div className="text-[11px] text-[var(--color-ink3)]">incluído por aditivo{!i.vigente ? " (ainda sem eficácia)" : ""}</div>}
                  {i.cancelado && <div className="text-[11px] text-[var(--color-danger)]">cancelado</div>}
                </td>
                <td className={`${td} text-right ${mono}`}>
                  {Number(i.quantidade).toLocaleString("pt-BR")} {i.unidade ?? ""}
                </td>
                <td className={`${td} text-right ${mono}`}>{brl(i.valorUnitario)}</td>
                <td className={`${td} text-right ${mono}`}>
                  {brl(i.limite)}
                  {Math.abs(i.limite - Number(i.valorTotal)) > 0.005 && i.vigente && <div className="text-[11px] text-[var(--color-ink3)]">original {brl(i.valorTotal)}</div>}
                </td>
                <td className={`${td} text-right ${mono}`}>{brl(i.medido)}</td>
                <td className={`${td} text-right ${mono} ${i.saldo < 0 ? "text-[var(--color-danger)]" : ""}`}>{brl(i.saldo)}</td>
                <td className={td}>{ROTULO_CRITERIO[i.criterioMedicao as keyof typeof ROTULO_CRITERIO] ?? i.criterioMedicao}</td>
                <td className={td}>
                  {projetos.find((p) => p.id === i.projectId)?.nome ?? "—"}
                  {i.etapa ? ` · ${i.etapa}` : ""}
                </td>
                <td className={td}>
                  {podeEditar && !i.cancelado && (emPreparo || i.origemAditivoId) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pendente}
                      onClick={() => {
                        const motivo = pedirMotivo(`Motivo para cancelar o item ${i.codigo}:`);
                        if (motivo) rodar(() => cancelarItem({ id: i.id, motivo }), "Item cancelado.");
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            <tr className="border-t border-[var(--color-line)] font-semibold">
              <td className={td} colSpan={4}>
                Total dos itens vigentes
              </td>
              <td className={`${td} text-right ${mono}`}>{brl(total)}</td>
              <td colSpan={5} />
            </tr>
          </tbody>
        </table>
      </div>
      {podeIncluir && (
        <div className="mt-4 rounded-[10px] border border-dashed border-[var(--color-line)] p-3">
          <p className="mb-2 text-[12.5px] font-medium text-[var(--color-ink)]">{emPreparo ? "Novo item" : "Novo item por aditivo (inclusão de serviços)"}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <Input placeholder="Código" value={novo.codigo} onChange={(e) => setNovo({ ...novo, codigo: e.target.value })} aria-label="Código" />
            <Input className="col-span-2" placeholder="Descrição" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} aria-label="Descrição" />
            <Input placeholder="Unidade" value={novo.unidade} onChange={(e) => setNovo({ ...novo, unidade: e.target.value })} aria-label="Unidade" />
            <Input placeholder="Quantidade" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} aria-label="Quantidade" />
            <MoneyInput value={novo.valorUnitario} onChange={(v) => setNovo({ ...novo, valorUnitario: v })} placeholder="Unitário" aria-label="Valor unitário" />
            <Select value={novo.criterioMedicao} onChange={(e) => setNovo({ ...novo, criterioMedicao: e.target.value })} aria-label="Critério de medição">
              {CRITERIOS_MEDICAO.map((c) => (
                <option key={c} value={c}>
                  {ROTULO_CRITERIO[c]}
                </option>
              ))}
            </Select>
            <Select value={novo.projectId} onChange={(e) => setNovo({ ...novo, projectId: e.target.value })} aria-label="Projeto do item">
              <option value="">Projeto (opcional)</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
            <Input placeholder="Etapa" value={novo.etapa} onChange={(e) => setNovo({ ...novo, etapa: e.target.value })} aria-label="Etapa" />
            <Input placeholder="Responsável" value={novo.responsavel} onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })} aria-label="Responsável" />
            {!emPreparo && (
              <Select value={novo.origemAditivoId} onChange={(e) => setNovo({ ...novo, origemAditivoId: e.target.value })} aria-label="Aditivo">
                <option value="">Aditivo *</option>
                {aditivosEditaveis.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo}
                  </option>
                ))}
              </Select>
            )}
            <span className="self-center text-[12px] text-[var(--color-ink3)]">= {brl(totalDoItem(lerNumero(novo.quantidade) ?? 0, Number(novo.valorUnitario || 0)))}</span>
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={pendente}
            onClick={() =>
              rodar(
                () => salvarItem({ contratoId, ...novo, quantidade: lerNumero(novo.quantidade) ?? 0, valorUnitario: Number(novo.valorUnitario || 0), origemAditivoId: novo.origemAditivoId || null }),
                "Item incluído.",
                () => setNovo(vazio),
              )
            }
          >
            Incluir item
          </Button>
        </div>
      )}
      {!emPreparo && podeEditar && aditivosEditaveis.length === 0 && (
        <p className="mt-2 text-[12px] text-[var(--color-ink3)]">Contrato valendo: para incluir item, abra um aditivo de inclusão de serviços (aba Aditivos).</p>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Cronograma ─────────────────────────────

export interface MarcoDaTela {
  id: string;
  etapa: string;
  descricao: string | null;
  dataPlanejada: string | null;
  dataRealizada: string | null;
  valorPrevisto: string;
  responsavel: string | null;
  status: string;
  itemId: string | null;
  medido: number;
}

export function CronogramaPainel({ contratoId, marcos, itens, valorContrato, podeEditar, faturadoTotal }: { contratoId: string; marcos: MarcoDaTela[]; itens: { id: string; codigo: string }[]; valorContrato: number; podeEditar: boolean; faturadoTotal: number }) {
  const { rodar, pendente, msg } = useAcao();
  const vazio = { etapa: "", descricao: "", dataPlanejada: "", valorPrevisto: "", responsavel: "", itemId: "" };
  const [novo, setNovo] = useState(vazio);
  const previsto = marcos.reduce((s, m) => s + Number(m.valorPrevisto), 0);
  const medido = marcos.reduce((s, m) => s + m.medido, 0);
  const pct = (v: number) => (valorContrato > 0 ? Math.min(100, (v / valorContrato) * 100) : 0);
  const concluidos = marcos.filter((m) => m.status === "concluido").length;
  return (
    <div>
      <div className="mb-3 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3">
        {[
          ["Físico (marcos concluídos)", marcos.length ? (concluidos / marcos.length) * 100 : 0, `${concluidos} de ${marcos.length}`],
          ["Financeiro previsto no cronograma", pct(previsto), brl(previsto)],
          ["Medido nos marcos", pct(medido), brl(medido)],
        ].map(([r, p, t]) => (
          <div key={r as string}>
            <div className="mb-1 flex justify-between text-[var(--color-ink3)]">
              <span>{r}</span>
              <span>{t}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-surface3)]">
              <div className="h-2 rounded-full bg-[var(--color-brand-segmento)]" style={{ width: `${p}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mb-2 text-[11.5px] text-[var(--color-ink3)]">Faturado no contrato: {brl(faturadoTotal)} (a fatura é do contrato; o marco mostra o que foi medido nele).</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className={th}>Etapa / marco</th>
              <th className={th}>Planejada</th>
              <th className={th}>Realizada</th>
              <th className={`${th} text-right`}>Previsto</th>
              <th className={`${th} text-right`}>Medido</th>
              <th className={th}>Responsável</th>
              <th className={th}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {marcos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-[var(--color-ink3)]">
                  Nenhum marco no cronograma.
                </td>
              </tr>
            )}
            {marcos.map((m) => {
              const atrasado = m.status !== "concluido" && m.dataPlanejada && !m.dataRealizada && m.dataPlanejada.slice(6) + m.dataPlanejada.slice(0, 2) + m.dataPlanejada.slice(3, 5) < hojeBR().slice(6) + hojeBR().slice(0, 2) + hojeBR().slice(3, 5);
              return (
                <tr key={m.id} className="border-t border-[var(--color-line)]">
                  <td className={td}>
                    {m.etapa}
                    {m.descricao && <div className="text-[11px] text-[var(--color-ink3)]">{m.descricao}</div>}
                    {m.itemId && <div className="text-[11px] text-[var(--color-ink3)]">item {itens.find((i) => i.id === m.itemId)?.codigo}</div>}
                  </td>
                  <td className={`${td} ${atrasado ? "text-[var(--color-danger)]" : ""}`}>{dateBR(m.dataPlanejada)}</td>
                  <td className={td}>{dateBR(m.dataRealizada)}</td>
                  <td className={`${td} text-right ${mono}`}>{brl(m.valorPrevisto)}</td>
                  <td className={`${td} text-right ${mono}`}>{brl(m.medido)}</td>
                  <td className={td}>{m.responsavel ?? "—"}</td>
                  <td className={td}>
                    {podeEditar ? (
                      <Select
                        className="h-8"
                        value={m.status}
                        disabled={pendente}
                        onChange={(e) =>
                          rodar(
                            () => salvarMarco({ ...m, contratoId, status: e.target.value, dataRealizada: e.target.value === "concluido" ? m.dataRealizada ?? hojeBR() : m.dataRealizada }),
                            "Marco atualizado.",
                          )
                        }
                        aria-label="Situação do marco"
                      >
                        {STATUS_MARCO.map((s) => (
                          <option key={s} value={s}>
                            {ROTULO_STATUS_MARCO[s]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <StatusBadge status={m.status} tipo="marco" />
                    )}
                    {atrasado && <div className="text-[11px] text-[var(--color-danger)]">passou da data planejada</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {podeEditar && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <Input placeholder="Etapa ou marco *" value={novo.etapa} onChange={(e) => setNovo({ ...novo, etapa: e.target.value })} aria-label="Etapa" />
          <Input className="col-span-2" placeholder="Descrição" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} aria-label="Descrição do marco" />
          <DateField value={novo.dataPlanejada} onChange={(v) => setNovo({ ...novo, dataPlanejada: v })} />
          <MoneyInput value={novo.valorPrevisto} onChange={(v) => setNovo({ ...novo, valorPrevisto: v })} placeholder="Valor previsto" aria-label="Valor previsto" />
          <Select value={novo.itemId} onChange={(e) => setNovo({ ...novo, itemId: e.target.value })} aria-label="Item do marco">
            <option value="">Item (opcional)</option>
            {itens.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo}
              </option>
            ))}
          </Select>
          <Input placeholder="Responsável" value={novo.responsavel} onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })} aria-label="Responsável do marco" />
          <Button type="button" size="sm" disabled={pendente} onClick={() => rodar(() => salvarMarco({ contratoId, ...novo, valorPrevisto: Number(novo.valorPrevisto || 0) }), "Marco incluído.", () => setNovo(vazio))}>
            + Marco
          </Button>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Aditivos ─────────────────────────────

export interface AditivoDaTela {
  id: string;
  numero: number;
  codigo: string;
  tipos: string[];
  descricao: string | null;
  justificativa: string | null;
  valorDelta: string;
  novoTermino: string | null;
  dataSolicitacao: string | null;
  dataAprovacao: string | null;
  dataAssinatura: string | null;
  inicioVigencia: string | null;
  responsavel: string | null;
  status: string;
  motivoStatus: string | null;
  aprovadoPor: string | null;
  createdBy: string | null;
  eficaz: boolean;
  valorAnterior: number | null;
  valorDepois: number | null;
}

export function AditivosPainel({ contratoId, aditivos, itens, podeRegistrar, podeAprovar, contratoAceita }: { contratoId: string; aditivos: AditivoDaTela[]; itens: { id: string; codigo: string; descricao: string }[]; podeRegistrar: boolean; podeAprovar: boolean; contratoAceita: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  const vazio = { tipos: [] as string[], descricao: "", justificativa: "", valorDelta: "", novoTermino: "", dataSolicitacao: "", inicioVigencia: "", responsavel: "" };
  const [novo, setNovo] = useState(vazio);
  const [variacoes, setVariacoes] = useState<{ itemId: string; deltaQuantidade: string; deltaValor: string }[]>([]);
  const [aberto, setAberto] = useState(false);
  const reducao = novo.tipos.includes("reducao_valor") || novo.tipos.includes("exclusao_servicos");

  const mudar = (a: AditivoDaTela, para: string) => {
    let motivo: string | null = null;
    let dataAssinatura: string | null = null;
    if (para === "cancelado" || para === "rejeitado") {
      motivo = pedirMotivo(para === "cancelado" ? `Motivo para cancelar o ${a.codigo} (fica no histórico):` : `Motivo da rejeição do ${a.codigo}:`);
      if (!motivo) return;
    }
    if (para === "assinado") {
      const d = window.prompt("Data de assinatura (DD/MM/AAAA):", dateBR(hojeBR()));
      if (!d) return;
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d.trim());
      if (!m) return window.alert("Data inválida.");
      dataAssinatura = `${m[2]}/${m[1]}/${m[3]}`;
    }
    rodar(() => mudarStatusAditivo({ id: a.id, para, motivo, dataAssinatura }), "Aditivo atualizado.");
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className={th}>Aditivo</th>
              <th className={th}>Tipo e justificativa</th>
              <th className={`${th} text-right`}>Valor anterior</th>
              <th className={`${th} text-right`}>Variação</th>
              <th className={`${th} text-right`}>Valor atualizado</th>
              <th className={th}>Prazo</th>
              <th className={th}>Datas</th>
              <th className={th}>Situação</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {aditivos.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-4 text-center text-[var(--color-ink3)]">
                  Nenhum aditivo.
                </td>
              </tr>
            )}
            {aditivos.map((a) => {
              const d = Number(a.valorDelta);
              const acoes: [string, string][] = [];
              if (podeRegistrar && (a.status === "rascunho" || a.status === "negociacao")) acoes.push(["aguardando_aprovacao", "Enviar para aprovação"]);
              if (podeRegistrar && a.status === "rascunho") acoes.push(["negociacao", "Em negociação"]);
              if (podeAprovar && a.status === "aguardando_aprovacao") acoes.push(["aprovado", "Aprovar"], ["rejeitado", "Rejeitar"]);
              if ((podeRegistrar || podeAprovar) && a.status === "aprovado") acoes.push(["assinado", "Registrar assinatura"]);
              if (podeRegistrar && ["rascunho", "negociacao", "aguardando_aprovacao"].includes(a.status)) acoes.push(["cancelado", "Cancelar"]);
              if (podeAprovar && ["aprovado", "assinado"].includes(a.status)) acoes.push(["cancelado", "Cancelar (com motivo)"]);
              return (
                <tr key={a.id} className="border-t border-[var(--color-line)]">
                  <td className={`${td} ${mono}`}>{a.codigo}</td>
                  <td className={td}>
                    {a.tipos.map((t) => ROTULO_TIPO_ADITIVO[t as keyof typeof ROTULO_TIPO_ADITIVO] ?? t).join(" + ")}
                    {a.justificativa && <div className="text-[11.5px] text-[var(--color-ink3)]">{a.justificativa}</div>}
                    {a.motivoStatus && <div className="text-[11.5px] text-[var(--color-danger)]">Motivo: {a.motivoStatus}</div>}
                  </td>
                  <td className={`${td} text-right ${mono}`}>{a.valorAnterior == null ? "—" : brl(a.valorAnterior)}</td>
                  <td className={`${td} text-right ${mono} ${d < 0 ? "text-[var(--color-danger)]" : d > 0 ? "text-[var(--color-success)]" : ""}`}>{d === 0 ? "—" : `${d > 0 ? "+" : ""}${brl(d)}`}</td>
                  <td className={`${td} text-right ${mono}`}>{a.valorDepois == null ? "—" : brl(a.valorDepois)}</td>
                  <td className={td}>{a.novoTermino ? `até ${dateBR(a.novoTermino)}` : "—"}</td>
                  <td className={`${td} text-[11.5px]`}>
                    {a.dataSolicitacao && <div>Solic. {dateBR(a.dataSolicitacao)}</div>}
                    {a.dataAprovacao && <div>Aprov. {dateBR(a.dataAprovacao)}{a.aprovadoPor ? ` · ${a.aprovadoPor}` : ""}</div>}
                    {a.dataAssinatura && <div>Assin. {dateBR(a.dataAssinatura)}</div>}
                    {a.inicioVigencia && <div>Vigência {dateBR(a.inicioVigencia)}</div>}
                  </td>
                  <td className={td}>
                    <StatusBadge status={a.status} tipo="aditivo" />
                    {a.status === "assinado" && !a.eficaz && <div className="text-[11px] text-[#b45309]">vigência futura</div>}
                    {a.status === "aprovado" && <div className="text-[11px] text-[#b45309]">sem efeito até a assinatura</div>}
                  </td>
                  <td className={td}>
                    <div className="flex flex-col gap-1">
                      {acoes.map(([para, rot]) => (
                        <Button key={para + rot} type="button" size="sm" variant={para === "aprovado" || para === "assinado" ? "default" : "outline"} disabled={pendente} onClick={() => mudar(a, para)}>
                          {rot}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {podeRegistrar && contratoAceita && !aberto && (
        <Button type="button" size="sm" className="mt-3" onClick={() => setAberto(true)}>
          + Novo aditivo
        </Button>
      )}
      {podeRegistrar && !contratoAceita && <p className="mt-2 text-[12px] text-[var(--color-ink3)]">Aditivo só em contrato ativo, suspenso ou concluído.</p>}
      {aberto && (
        <div className="mt-3 rounded-[10px] border border-dashed border-[var(--color-line)] p-3">
          <p className="mb-2 text-[12.5px] font-medium">Novo aditivo (nasce em rascunho; só vale depois de aprovado e assinado)</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {TIPOS_ADITIVO.map((t) => (
              <label key={t} className="flex items-center gap-1 text-[12.5px]">
                <input type="checkbox" checked={novo.tipos.includes(t)} onChange={(e) => setNovo({ ...novo, tipos: e.target.checked ? [...novo.tipos, t] : novo.tipos.filter((x) => x !== t) })} />
                {ROTULO_TIPO_ADITIVO[t]}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <Label>Variação do valor global {reducao ? "(redução: digite o valor, entra negativo)" : ""}</Label>
              <MoneyInput value={novo.valorDelta} onChange={(v) => setNovo({ ...novo, valorDelta: v })} aria-label="Variação" />
            </div>
            <div>
              <Label>Novo término (prorrogação)</Label>
              <DateField value={novo.novoTermino} onChange={(v) => setNovo({ ...novo, novoTermino: v })} />
            </div>
            <div>
              <Label>Data da solicitação</Label>
              <DateField value={novo.dataSolicitacao} onChange={(v) => setNovo({ ...novo, dataSolicitacao: v })} />
            </div>
            <div>
              <Label>Início de vigência (vazio = na assinatura)</Label>
              <DateField value={novo.inicioVigencia} onChange={(v) => setNovo({ ...novo, inicioVigencia: v })} />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={novo.responsavel} onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <Label>Descrição</Label>
              <Input value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <Label>Justificativa *</Label>
              <Input value={novo.justificativa} onChange={(e) => setNovo({ ...novo, justificativa: e.target.value })} />
            </div>
          </div>
          {itens.length > 0 && (
            <div className="mt-3">
              <p className="text-[12px] font-medium">Variação por item (opcional; o limite de medição do item muda quando o aditivo valer)</p>
              {variacoes.map((v, i) => (
                <div key={i} className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_180px_auto]">
                  <Select value={v.itemId} onChange={(e) => setVariacoes((l) => l.map((x, j) => (j === i ? { ...x, itemId: e.target.value } : x)))} aria-label="Item">
                    <option value="">— item —</option>
                    {itens.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.codigo} · {it.descricao}
                      </option>
                    ))}
                  </Select>
                  <Input placeholder="± quantidade" value={v.deltaQuantidade} onChange={(e) => setVariacoes((l) => l.map((x, j) => (j === i ? { ...x, deltaQuantidade: e.target.value } : x)))} aria-label="Variação de quantidade" />
                  <Input placeholder="± valor (ex.: -15000)" value={v.deltaValor} onChange={(e) => setVariacoes((l) => l.map((x, j) => (j === i ? { ...x, deltaValor: e.target.value } : x)))} aria-label="Variação de valor" />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setVariacoes((l) => l.filter((_, j) => j !== i))}>
                    ×
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" className="mt-1" onClick={() => setVariacoes((l) => [...l, { itemId: "", deltaQuantidade: "", deltaValor: "" }])}>
                + Variação de item
              </Button>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pendente}
              onClick={() => {
                const bruto = Number(novo.valorDelta || 0);
                const valorDelta = reducao ? -Math.abs(bruto) : bruto;
                rodar(
                  () => salvarAditivo({ contratoId, ...novo, valorDelta, variacoes: variacoes.map((v) => ({ itemId: v.itemId, deltaQuantidade: lerNumero(v.deltaQuantidade), deltaValor: lerNumero(v.deltaValor) ?? 0 })) }),
                  "Aditivo registrado em rascunho.",
                  () => {
                    setNovo(vazio);
                    setVariacoes([]);
                    setAberto(false);
                  },
                );
              }}
            >
              Registrar aditivo
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Medições ─────────────────────────────

export interface MedicaoDaTela {
  id: string;
  itemId: string | null;
  projectId: string | null;
  marcoId: string | null;
  competencia: string;
  quantidade: string | null;
  percentual: string | null;
  valor: string;
  status: string;
  motivoStatus: string | null;
  responsavel: string | null;
  dataMedicao: string | null;
  aprovadoPor: string | null;
  createdBy: string | null;
  obs: string | null;
}

export function MedicoesPainel({ contratoId, medicoes, itens, projetos, marcos, podeLancar, podeAprovar, contratoAceita }: { contratoId: string; medicoes: MedicaoDaTela[]; itens: { id: string; codigo: string; descricao: string; criterioMedicao: string; limite: number; saldo: number; vigente: boolean }[]; projetos: { id: string; nome: string }[]; marcos: { id: string; etapa: string }[]; podeLancar: boolean; podeAprovar: boolean; contratoAceita: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  const vazio = { itemId: "", projectId: "", marcoId: "", competencia: "", quantidade: "", percentual: "", valor: "", responsavel: "", obs: "" };
  const [novo, setNovo] = useState(vazio);
  const [chave, setChave] = useState(novaChave);
  const item = itens.find((i) => i.id === novo.itemId);
  const crit = item?.criterioMedicao ?? "entrega";
  const mudar = (m: MedicaoDaTela, para: string) => {
    let motivo: string | null = null;
    if (para === "rejeitada" || para === "cancelada") {
      motivo = pedirMotivo("Motivo:");
      if (!motivo) return;
    }
    rodar(() => mudarStatusMedicao({ id: m.id, para, motivo }), "Medição atualizada.");
  };
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className={th}>Período</th>
              <th className={th}>Item</th>
              <th className={th}>Projeto · marco</th>
              <th className={`${th} text-right`}>Realizado</th>
              <th className={`${th} text-right`}>Valor</th>
              <th className={th}>Responsável</th>
              <th className={th}>Situação</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {medicoes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-4 text-center text-[var(--color-ink3)]">
                  Nenhuma medição.
                </td>
              </tr>
            )}
            {medicoes.map((m) => {
              const it = itens.find((i) => i.id === m.itemId);
              const acoes: [string, string][] = [];
              if (podeLancar && m.status === "rascunho") acoes.push(["enviada", "Enviar"]);
              if (podeAprovar && (m.status === "enviada" || m.status === "em_analise")) acoes.push(["aprovada", "Aprovar"], ["rejeitada", "Rejeitar"]);
              if (podeLancar && m.status === "enviada") acoes.push(["em_analise", "Em análise"]);
              if (podeLancar && (m.status === "rascunho" || m.status === "enviada")) acoes.push(["cancelada", "Cancelar"]);
              if (podeAprovar && m.status === "aprovada") acoes.push(["cancelada", "Cancelar (com motivo)"]);
              return (
                <tr key={m.id} className="border-t border-[var(--color-line)]">
                  <td className={`${td} ${mono}`}>{m.competencia}</td>
                  <td className={td}>{it ? `${it.codigo} · ${it.descricao}` : "—"}</td>
                  <td className={td}>
                    {projetos.find((p) => p.id === m.projectId)?.nome ?? "—"}
                    {m.marcoId ? ` · ${marcos.find((x) => x.id === m.marcoId)?.etapa ?? ""}` : ""}
                  </td>
                  <td className={`${td} text-right ${mono}`}>{m.percentual ? `${Number(m.percentual).toLocaleString("pt-BR")}%` : m.quantidade ? Number(m.quantidade).toLocaleString("pt-BR") : "—"}</td>
                  <td className={`${td} text-right ${mono}`}>{brl(m.valor)}</td>
                  <td className={td}>{m.responsavel ?? m.createdBy ?? "—"}</td>
                  <td className={td}>
                    <StatusBadge status={m.status} tipo="medicao" />
                    {m.aprovadoPor && m.status === "aprovada" && <div className="text-[11px] text-[var(--color-ink3)]">por {m.aprovadoPor}</div>}
                    {m.motivoStatus && <div className="text-[11px] text-[var(--color-danger)]">{m.motivoStatus}</div>}
                  </td>
                  <td className={td}>
                    <div className="flex flex-col gap-1">
                      {acoes.map(([para, rot]) => (
                        <Button key={para + rot} type="button" size="sm" variant={para === "aprovada" ? "default" : "outline"} disabled={pendente} onClick={() => mudar(m, para)}>
                          {rot}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {podeLancar && contratoAceita && (
        <div className="mt-3 rounded-[10px] border border-dashed border-[var(--color-line)] p-3">
          <p className="mb-2 text-[12.5px] font-medium">Nova medição (medição não é fatura nem receita: só a aprovação conta no saldo)</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <Select value={novo.itemId} onChange={(e) => setNovo({ ...novo, itemId: e.target.value })} aria-label="Item medido">
              <option value="">{itens.some((i) => i.vigente) ? "Item contratual *" : "Sem itens (medição do contrato)"}</option>
              {itens
                .filter((i) => i.vigente)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.codigo} · {i.descricao} (saldo {brl(i.saldo)})
                  </option>
                ))}
            </Select>
            <div>
              <MonthField value={novo.competencia} onChange={(v) => setNovo({ ...novo, competencia: v })} />
            </div>
            {crit === "quantidade" && <Input placeholder="Quantidade executada" value={novo.quantidade} onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })} aria-label="Quantidade" />}
            {crit === "percentual" && <Input placeholder="% do item neste período" value={novo.percentual} onChange={(e) => setNovo({ ...novo, percentual: e.target.value })} aria-label="Percentual" />}
            {!["quantidade", "percentual"].includes(crit) && <MoneyInput value={novo.valor} onChange={(v) => setNovo({ ...novo, valor: v })} placeholder="Valor medido" aria-label="Valor medido" />}
            <Select value={novo.projectId} onChange={(e) => setNovo({ ...novo, projectId: e.target.value })} aria-label="Projeto da medição">
              <option value="">Projeto (o do item)</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
            <Select value={novo.marcoId} onChange={(e) => setNovo({ ...novo, marcoId: e.target.value })} aria-label="Marco">
              <option value="">Marco (opcional)</option>
              {marcos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.etapa}
                </option>
              ))}
            </Select>
            <Input placeholder="Responsável" value={novo.responsavel} onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })} aria-label="Responsável" />
            <Input placeholder="Observação" value={novo.obs} onChange={(e) => setNovo({ ...novo, obs: e.target.value })} aria-label="Observação" />
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--color-ink3)]">Critério do item: {ROTULO_CRITERIO[crit as keyof typeof ROTULO_CRITERIO] ?? crit}. O valor é calculado pelo critério (quantidade × unitário ou % do valor vigente).</p>
          <div className="mt-2 flex gap-2">
            {[false, true].map((enviar) => (
              <Button
                key={String(enviar)}
                type="button"
                size="sm"
                variant={enviar ? "default" : "outline"}
                disabled={pendente}
                onClick={() =>
                  rodar(
                    () => salvarMedicao({ contratoId, ...novo, itemId: novo.itemId || null, quantidade: lerNumero(novo.quantidade), percentual: lerNumero(novo.percentual), valor: Number(novo.valor || 0) || null, enviar, idempotencyKey: chave }),
                    enviar ? "Medição enviada para aprovação." : "Medição salva em rascunho.",
                    () => {
                      setNovo(vazio);
                      setChave(novaChave());
                    },
                  )
                }
              >
                {enviar ? "Salvar e enviar" : "Salvar rascunho"}
              </Button>
            ))}
          </div>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Faturamento ─────────────────────────────

export interface FaturaDaTela {
  id: string;
  projectId: string;
  descricao: string | null;
  valor: number;
  vencimento: string | null;
  status: string;
  cancelado: boolean;
  recebido: number;
}

export function FaturamentoPainel({ contratoId, faturas, projetos, podeFaturar, contratoAceita, sugestao }: { contratoId: string; faturas: FaturaDaTela[]; projetos: { id: string; nome: string }[]; podeFaturar: boolean; contratoAceita: boolean; sugestao: number }) {
  const { rodar, pendente, msg } = useAcao();
  const [novo, setNovo] = useState({ projectId: projetos[0]?.id ?? "", valor: sugestao > 0 ? String(sugestao) : "", vencimento: "", descricao: "" });
  const [chave, setChave] = useState(novaChave);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className={th}>Fatura</th>
              <th className={th}>Projeto</th>
              <th className={th}>Vencimento</th>
              <th className={`${th} text-right`}>Valor</th>
              <th className={`${th} text-right`}>Recebido</th>
              <th className={`${th} text-right`}>A receber</th>
              <th className={th}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {faturas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-[var(--color-ink3)]">
                  Nenhuma fatura.
                </td>
              </tr>
            )}
            {faturas.map((f) => (
              <tr key={f.id} className={`border-t border-[var(--color-line)] ${f.cancelado ? "opacity-50 line-through" : ""}`}>
                <td className={td}>{f.descricao ?? "—"}</td>
                <td className={td}>{projetos.find((p) => p.id === f.projectId)?.nome ?? "—"}</td>
                <td className={td}>{dateBR(f.vencimento)}</td>
                <td className={`${td} text-right ${mono}`}>{brl(f.valor)}</td>
                <td className={`${td} text-right ${mono}`}>{brl(f.recebido)}</td>
                <td className={`${td} text-right ${mono}`}>{brl(f.cancelado ? 0 : f.valor - f.recebido)}</td>
                <td className={td}>
                  <span className="text-[12px]">{f.cancelado ? "Cancelada" : f.status}</span>
                  <div>
                    <a href={`/contasreceber?proj=${f.projectId}`} className="text-[11px] text-[var(--color-accent)] hover:underline">
                      receber / conciliar →
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
        A fatura do contrato é uma conta a receber: a baixa, a conciliação com o extrato e o cancelamento continuam em Receitas → Contas a Receber. A DRE e o Fluxo de
        Caixa já a leem pelo vencimento, como qualquer conta a receber.
      </p>
      {podeFaturar && contratoAceita && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-[10px] border border-dashed border-[var(--color-line)] p-3 sm:grid-cols-5">
          <Select value={novo.projectId} onChange={(e) => setNovo({ ...novo, projectId: e.target.value })} aria-label="Projeto da fatura">
            <option value="">Projeto *</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
          <MoneyInput value={novo.valor} onChange={(v) => setNovo({ ...novo, valor: v })} placeholder="Valor" aria-label="Valor da fatura" />
          <DateField value={novo.vencimento} onChange={(v) => setNovo({ ...novo, vencimento: v })} />
          <Input placeholder="Descrição (opcional)" value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} aria-label="Descrição da fatura" />
          <Button
            type="button"
            size="sm"
            disabled={pendente}
            onClick={() =>
              rodar(() => faturarContrato({ contratoId, ...novo, valor: Number(novo.valor || 0), idempotencyKey: chave }), "Fatura registrada em Contas a Receber.", () => {
                setNovo({ ...novo, valor: "", descricao: "" });
                setChave(novaChave());
              })
            }
          >
            Faturar
          </Button>
          {sugestao > 0 && <p className="text-[11.5px] text-[var(--color-ink3)] sm:col-span-5">Medido aprovado ainda não faturado: {brl(sugestao)}.</p>}
        </div>
      )}
      {projetos.length === 0 && <p className="mt-2 text-[12px] text-[#b45309]">Vincule um projeto ao contrato para faturar.</p>}
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Custos e reembolsos ─────────────────────────────

export interface DespesaCandidata {
  id: string;
  numDoc: string | null;
  valor: string;
  competencia: string | null;
  contaCef: string | null;
  obs: string | null;
  fornecedor: string | null;
  projeto?: string;
  contratoId: string | null;
}

export function ApropriarDespesas({ contratoId, candidatas, apropriadas, podeEditar }: { contratoId: string; candidatas: DespesaCandidata[]; apropriadas: DespesaCandidata[]; podeEditar: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  const [escolha, setEscolha] = useState("");
  const livres = candidatas.filter((c) => !c.contratoId);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className={th}>Despesa</th>
              <th className={th}>Fornecedor</th>
              <th className={th}>Competência</th>
              <th className={th}>Conta</th>
              <th className={`${th} text-right`}>Valor</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {apropriadas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-[var(--color-ink3)]">
                  Nenhuma despesa apropriada a este contrato.
                </td>
              </tr>
            )}
            {apropriadas.map((d) => (
              <tr key={d.id} className="border-t border-[var(--color-line)]">
                <td className={td}>
                  {d.numDoc ?? "—"}
                  {d.obs && <div className="text-[11px] text-[var(--color-ink3)]">{d.obs}</div>}
                </td>
                <td className={td}>{d.fornecedor ?? "—"}</td>
                <td className={td}>{d.competencia ?? "—"}</td>
                <td className={td}>{d.contaCef ?? "—"}</td>
                <td className={`${td} text-right ${mono}`}>{brl(d.valor)}</td>
                <td className={td}>
                  {podeEditar && (
                    <Button type="button" size="sm" variant="ghost" disabled={pendente} onClick={() => rodar(() => apropriarDespesa({ despesaId: d.id, contratoId: null }), "Despesa desapropriada.")}>
                      Tirar do contrato
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {podeEditar && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select className="min-w-[320px]" value={escolha} onChange={(e) => setEscolha(e.target.value)} aria-label="Despesa a apropriar">
            <option value="">Despesa dos projetos do contrato (versão Atual)…</option>
            {livres.map((d) => (
              <option key={d.id} value={d.id}>
                {d.numDoc ?? "s/nº"} · {d.fornecedor ?? "—"} · {d.competencia ?? ""} · {brl(d.valor)} {d.projeto ? `· ${d.projeto}` : ""}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" disabled={!escolha || pendente} onClick={() => rodar(() => apropriarDespesa({ despesaId: escolha, contratoId }), "Despesa apropriada ao contrato.", () => setEscolha(""))}>
            Apropriar ao contrato
          </Button>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

export interface ReembolsoDaTela {
  id: string;
  despesaId: string;
  status: string;
  valorSolicitado: string;
  valorAprovado: string | null;
  condicao: string | null;
  contaReceberId: string | null;
  cancelado: boolean;
  motivoCancelamento: string | null;
  comprovantes: number;
  despesa: { numDoc: string | null; valor: string; competencia: string | null; fornecedor: string | null; obs: string | null; contaCef: string | null } | null;
}

export function ReembolsosPainel({ contratoId, reembolsos, candidatas, faturas, podeEditar }: { contratoId: string; reembolsos: ReembolsoDaTela[]; candidatas: DespesaCandidata[]; faturas: FaturaDaTela[]; podeEditar: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  const [nova, setNova] = useState({ despesaId: "", condicao: "" });
  const emReembolso = new Set(reembolsos.filter((r) => !r.cancelado).map((r) => r.despesaId));
  const opcoes = candidatas.filter((c) => !emReembolso.has(c.id) && (!c.contratoId || c.contratoId === contratoId));
  const ativos = reembolsos.filter((r) => !r.cancelado);
  const soma = (f: (r: ReembolsoDaTela) => number) => ativos.reduce((s, r) => s + f(r), 0);
  const mudar = (r: ReembolsoDaTela, para: string) => {
    let valorAprovado: string | null = null;
    let contaReceberId: string | null = null;
    if (para === "aprovado" && r.status === "solicitado") {
      const v = window.prompt("Valor aprovado pelo contratante (R$):", Number(r.valorSolicitado).toLocaleString("pt-BR"));
      if (v == null) return;
      valorAprovado = String(lerNumero(v) ?? "");
    }
    if (para === "faturado") {
      const lista = faturas.filter((f) => !f.cancelado);
      if (!lista.length) return window.alert("Fature o reembolso na aba Faturamento (uma conta a receber do contrato) e volte aqui para vincular.");
      const escolha = window.prompt(`Número da fatura que cobrou o reembolso:\n${lista.map((f, i) => `${i + 1}. ${f.descricao ?? ""} · ${brl(f.valor)} · venc. ${dateBR(f.vencimento)}`).join("\n")}`);
      const idx = Number(escolha) - 1;
      if (!lista[idx]) return;
      contaReceberId = lista[idx].id;
    }
    rodar(() => mudarStatusReembolso({ id: r.id, para, valorAprovado, contaReceberId }), "Reembolso atualizado.");
  };
  return (
    <div>
      <div className="mb-2 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
        <div>Solicitado: <strong className={mono}>{brl(soma((r) => (r.status === "pendente" ? 0 : Number(r.valorSolicitado))))}</strong></div>
        <div>Aprovado: <strong className={mono}>{brl(soma((r) => (["aprovado", "faturado", "recebido"].includes(r.status) ? Number(r.valorAprovado ?? r.valorSolicitado) : 0)))}</strong></div>
        <div>Recebido: <strong className={mono}>{brl(soma((r) => (r.status === "recebido" ? Number(r.valorAprovado ?? r.valorSolicitado) : 0)))}</strong></div>
        <div>Pendente: <strong className={mono}>{brl(soma((r) => (["recebido", "rejeitado"].includes(r.status) ? 0 : Number(r.valorAprovado ?? r.valorSolicitado))))}</strong></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className={th}>Despesa</th>
              <th className={th}>Fornecedor · competência</th>
              <th className={`${th} text-right`}>Solicitado</th>
              <th className={`${th} text-right`}>Aprovado</th>
              <th className={th}>Comprovante</th>
              <th className={th}>Situação</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {reembolsos.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-[var(--color-ink3)]">
                  Nenhuma despesa reembolsável.
                </td>
              </tr>
            )}
            {reembolsos.map((r) => {
              const prox: Record<string, [string, string][]> = {
                pendente: [["solicitado", "Solicitar"]],
                solicitado: [["aprovado", "Aprovado pelo cliente"], ["rejeitado", "Rejeitado"]],
                aprovado: [["faturado", "Vincular fatura"]],
                faturado: [["recebido", "Recebido"]],
                rejeitado: [["pendente", "Reabrir"]],
                recebido: [],
              };
              return (
                <tr key={r.id} className={`border-t border-[var(--color-line)] ${r.cancelado ? "opacity-50" : ""}`}>
                  <td className={td}>
                    {r.despesa?.numDoc ?? "—"}
                    {r.despesa?.obs && <div className="text-[11px] text-[var(--color-ink3)]">{r.despesa.obs}</div>}
                    {r.condicao && <div className="text-[11px] text-[var(--color-ink3)]">Condição: {r.condicao}</div>}
                  </td>
                  <td className={td}>
                    {r.despesa?.fornecedor ?? "—"} · {r.despesa?.competencia ?? ""}
                  </td>
                  <td className={`${td} text-right ${mono}`}>{brl(r.valorSolicitado)}</td>
                  <td className={`${td} text-right ${mono}`}>{r.valorAprovado == null ? "—" : brl(r.valorAprovado)}</td>
                  <td className={td}>{r.comprovantes ? `${r.comprovantes} anexo(s)` : <span className="text-[#b45309]">sem comprovante</span>}</td>
                  <td className={td}>
                    {r.cancelado ? <span className="text-[12px]">Cancelado: {r.motivoCancelamento}</span> : <StatusBadge status={r.status} tipo="reembolso" />}
                  </td>
                  <td className={td}>
                    {podeEditar && !r.cancelado && (
                      <div className="flex flex-col gap-1">
                        {(prox[r.status] ?? []).map(([para, rot]) => (
                          <Button key={para} type="button" size="sm" variant="outline" disabled={pendente} onClick={() => mudar(r, para)}>
                            {rot}
                          </Button>
                        ))}
                        {!["faturado", "recebido"].includes(r.status) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={pendente}
                            onClick={() => {
                              const motivo = pedirMotivo("Motivo para cancelar o reembolso:");
                              if (motivo) rodar(() => mudarStatusReembolso({ id: r.id, cancelar: true, motivo }), "Reembolso cancelado.");
                            }}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {podeEditar && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select className="min-w-[320px]" value={nova.despesaId} onChange={(e) => setNova({ ...nova, despesaId: e.target.value })} aria-label="Despesa reembolsável">
            <option value="">Despesa reembolsável (dos projetos do contrato)…</option>
            {opcoes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.numDoc ?? "s/nº"} · {d.fornecedor ?? "—"} · {d.competencia ?? ""} · {brl(d.valor)}
              </option>
            ))}
          </Select>
          <Input className="max-w-[260px]" placeholder="Condição contratual (opcional)" value={nova.condicao} onChange={(e) => setNova({ ...nova, condicao: e.target.value })} aria-label="Condição" />
          <Button type="button" size="sm" disabled={!nova.despesaId || pendente} onClick={() => rodar(() => incluirReembolso({ contratoId, despesaId: nova.despesaId, condicao: nova.condicao }), "Despesa marcada como reembolsável.", () => setNova({ despesaId: "", condicao: "" }))}>
            Marcar como reembolsável
          </Button>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

// ───────────────────────────── Documentos ─────────────────────────────

export interface DocumentoDaTela {
  id: string;
  filename: string;
  tipo: string | null;
  versao: number;
  uploadedBy: string | null;
  uploadedAt: string;
  url: string | null;
  aditivo: string | null;
}

export function DocumentosPainel({ contratoId, documentos, aditivos, podeEditar, r2 }: { contratoId: string; documentos: DocumentoDaTela[]; aditivos: { id: string; codigo: string }[]; podeEditar: boolean; r2: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  const [tipo, setTipo] = useState<string>(TIPOS_DOC_CONTRATO[0]);
  const [aditivoId, setAditivoId] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr>
              <th className={th}>Documento</th>
              <th className={th}>Tipo</th>
              <th className={th}>Aditivo</th>
              <th className={th}>Versão</th>
              <th className={th}>Enviado por</th>
            </tr>
          </thead>
          <tbody>
            {documentos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-center text-[var(--color-ink3)]">
                  Nenhum documento.
                </td>
              </tr>
            )}
            {documentos.map((d) => (
              <tr key={d.id} className="border-t border-[var(--color-line)]">
                <td className={td}>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:underline">
                      {d.filename}
                    </a>
                  ) : (
                    d.filename
                  )}
                </td>
                <td className={td}>{d.tipo ?? "—"}</td>
                <td className={td}>{d.aditivo ?? "—"}</td>
                <td className={td}>v{d.versao}</td>
                <td className={td}>
                  {d.uploadedBy ?? "—"} · {new Date(d.uploadedAt).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {podeEditar && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo do documento">
            {TIPOS_DOC_CONTRATO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select value={aditivoId} onChange={(e) => setAditivoId(e.target.value)} aria-label="Aditivo do documento">
            <option value="">Do contrato</option>
            {aditivos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo}
              </option>
            ))}
          </Select>
          <input type="file" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="text-[12.5px]" aria-label="Arquivo" />
          <Button
            type="button"
            size="sm"
            disabled={!arquivo || pendente}
            onClick={() => {
              const fd = new FormData();
              fd.set("contratoId", contratoId);
              fd.set("tipo", tipo);
              if (aditivoId) fd.set("aditivoId", aditivoId);
              if (arquivo) fd.set("file", arquivo);
              rodar(() => anexarDocumentoContrato(fd), "Documento anexado.", () => setArquivo(null));
            }}
          >
            Anexar
          </Button>
          {!r2 && <span className="text-[12px] text-[#b45309]">Armazenamento (R2) não configurado neste ambiente: o envio vai falhar.</span>}
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

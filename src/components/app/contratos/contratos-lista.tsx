"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { ROTULO_STATUS_CONTRATO, ROTULO_TIPO_CONTRATO, STATUS_CONTRATO, TIPOS_CONTRATO, type TipoContrato } from "@/lib/contrato-regras";
import { ymd, dateBR } from "@/lib/utils";
import { brl, StatusBadge } from "./comum";

export interface LinhaDaLista {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  status: string;
  cliente: string | null;
  clienteId: string | null;
  modalidade: string | null;
  gestor: string | null;
  principal: string | null;
  projetos: { id: string; nome: string }[];
  dataInicio: string | null;
  termino: string | null;
  atualizado: number;
  medido: number;
  saldoAMedir: number;
  pendente: number;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Listagem de contratos com busca e filtros (cliente, projeto, tipo, gestor, situação e período). */
export function ContratosLista({ linhas, projetos }: { linhas: LinhaDaLista[]; projetos: { id: string; nome: string }[] }) {
  const [busca, setBusca] = useState("");
  const [cliente, setCliente] = useState("");
  const [projeto, setProjeto] = useState("");
  const [tipo, setTipo] = useState("");
  const [gestor, setGestor] = useState("");
  const [status, setStatus] = useState("vigentes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const clientes = useMemo(() => [...new Map(linhas.filter((l) => l.clienteId).map((l) => [l.clienteId!, l.cliente ?? ""])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [linhas]);
  const gestores = useMemo(() => [...new Set(linhas.map((l) => l.gestor).filter((g): g is string => !!g))].sort(), [linhas]);

  const filtradas = linhas.filter((l) => {
    if (busca && !norm(`${l.codigo} ${l.titulo} ${l.cliente ?? ""} ${l.modalidade ?? ""}`).includes(norm(busca))) return false;
    if (cliente && l.clienteId !== cliente) return false;
    if (projeto && !l.projetos.some((p) => p.id === projeto)) return false;
    if (tipo && l.tipo !== tipo) return false;
    if (gestor && l.gestor !== gestor) return false;
    if (status === "vigentes" && !["ativo", "suspenso", "aguardando_assinatura", "rascunho", "concluido"].includes(l.status)) return false;
    if (status && status !== "vigentes" && l.status !== status) return false;
    // período: contratos cuja vigência (início → término) cruza o intervalo
    const ini = ymd(l.dataInicio);
    const fim = ymd(l.termino);
    if (de && fim != null && fim < ymd(de)!) return false;
    if (ate && ini != null && ini > ymd(ate)!) return false;
    return true;
  });
  const total = (k: "atualizado" | "medido" | "saldoAMedir") => filtradas.filter((l) => !(l.tipo !== "contrato" && l.principal)).reduce((s, l) => s + l[k], 0);

  return (
    <div>
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input placeholder="Buscar código, título, cliente…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar contrato" />
        <Select value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Cliente">
          <option value="">Todos os clientes</option>
          {clientes.map(([id, nome]) => (
            <option key={id} value={id}>
              {nome}
            </option>
          ))}
        </Select>
        <Select value={projeto} onChange={(e) => setProjeto(e.target.value)} aria-label="Projeto">
          <option value="">Todos os projetos</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {TIPOS_CONTRATO.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO_CONTRATO[t]}
            </option>
          ))}
        </Select>
        <Select value={gestor} onChange={(e) => setGestor(e.target.value)} aria-label="Gestor">
          <option value="">Todos os gestores</option>
          {gestores.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          <option value="vigentes">Vigentes (sem encerrados e cancelados)</option>
          <option value="">Todas as situações</option>
          {STATUS_CONTRATO.map((s) => (
            <option key={s} value={s}>
              {ROTULO_STATUS_CONTRATO[s]}
            </option>
          ))}
        </Select>
        <DateField value={de} onChange={setDe} />
        <DateField value={ate} onChange={setAte} />
      </div>
      <p className="mb-2 text-[12px] text-[var(--color-ink3)]">
        {filtradas.length} contrato(s) · valor atualizado {brl(total("atualizado"))} · medido {brl(total("medido"))} · a medir {brl(total("saldoAMedir"))}
        <span className="ml-1">(ordens e derivados que consomem o limite não somam de novo)</span>
      </p>
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full text-[13px]" data-lista-contratos>
          <thead className="bg-[var(--color-surface2)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Contrato</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Projeto</th>
              <th className="px-3 py-2">Gestor</th>
              <th className="px-3 py-2 text-right">Valor atualizado</th>
              <th className="px-3 py-2 text-right">Medido</th>
              <th className="px-3 py-2 text-right">Saldo contratual</th>
              <th className="px-3 py-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-[var(--color-ink3)]">
                  Nenhum contrato com esses filtros.
                </td>
              </tr>
            )}
            {filtradas.map((l) => (
              <tr key={l.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-surface2)]">
                <td className="px-3 py-2 font-[family-name:var(--font-mono)] text-[12px]">
                  <Link href={`/contratos/${l.id}`} className="text-[var(--color-accent)] hover:underline">
                    {l.codigo}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/contratos/${l.id}`} className="font-medium text-[var(--color-ink)] hover:underline">
                    {l.titulo}
                  </Link>
                  <div className="text-[11.5px] text-[var(--color-ink3)]">
                    {ROTULO_TIPO_CONTRATO[l.tipo as TipoContrato] ?? l.tipo}
                    {l.principal ? ` de ${l.principal}` : ""}
                    {l.modalidade ? ` · ${l.modalidade}` : ""}
                    {l.termino ? ` · até ${dateBR(l.termino)}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2">{l.cliente ?? "—"}</td>
                <td className="px-3 py-2">{l.projetos.map((p) => p.nome).join(", ") || "—"}</td>
                <td className="px-3 py-2">{l.gestor ?? "—"}</td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                  {brl(l.atualizado)}
                  {l.pendente !== 0 && <div className="text-[11px] text-[#b45309]">{brl(l.pendente)} em aditivo pendente</div>}
                </td>
                <td className="px-3 py-2 text-right font-[family-name:var(--font-mono)]">{brl(l.medido)}</td>
                <td className={`px-3 py-2 text-right font-[family-name:var(--font-mono)] ${l.saldoAMedir < 0 ? "text-[var(--color-danger)]" : ""}`}>{brl(l.saldoAMedir)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={l.status} tipo="contrato" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

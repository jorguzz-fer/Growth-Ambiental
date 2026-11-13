"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RepositorioRow } from "@/lib/queries";
import { registroCasa } from "@/lib/busca";
import { brl0 } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface RepositorioItem extends RepositorioRow {
  /** URL assinada para abrir o arquivo; null sem storage configurado. */
  url: string | null;
}

/**
 * Repositório de documentos — Módulo 3.
 *
 * A listagem antiga mostrava "08/2026 · R$ 28" na coluna de despesa vinculada,
 * o que não permite conferir nada. Agora cada arquivo carrega o contexto
 * inteiro: PED, obra, fornecedor, nº da nota, competência e valor, com link
 * para o lançamento.
 *
 * A busca cobre simultaneamente nome do arquivo, nº do documento fiscal, PED e
 * fornecedor (item 3.3), reaproveitando o mesmo motor de busca inteligente das
 * telas de Despesas e Contas a Receber.
 */
export function RepositorioTable({ rows }: { rows: RepositorioItem[] }) {
  const [busca, setBusca] = useState("");
  const [obra, setObra] = useState("");
  const [tipo, setTipo] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [vinculo, setVinculo] = useState("");

  const opts = useMemo(() => {
    const uniq = (xs: (string | null | undefined)[]) =>
      [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b));
    const porId = new Map<string, string>();
    for (const r of rows) {
      if (r.projectId && !porId.has(r.projectId)) porId.set(r.projectId, r.projectName ?? "");
    }
    return {
      obras: [...porId].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      tipos: uniq(rows.map((r) => r.tipo)),
      competencias: uniq(rows.map((r) => r.competencia)).sort().reverse(),
    };
  }, [rows]);

  const filtrados = useMemo(() => {
    return rows.filter((r) => {
      if (obra && r.projectId !== obra) return false;
      if (tipo && r.tipo !== tipo) return false;
      if (competencia && r.competencia !== competencia) return false;
      if (vinculo === "vinculado" && !r.despesaId) return false;
      if (vinculo === "sem" && r.despesaId) return false;
      if (busca.trim()) {
        // Busca simultânea em arquivo, nº da nota, PED e fornecedor (item 3.3).
        const casa = registroCasa(busca, [
          r.filename,
          r.numeroDocumentoFiscal,
          r.numDoc,
          r.fornecedorNome,
          r.projectName,
          r.tipo,
        ]);
        if (!casa) return false;
      }
      return true;
    });
  }, [rows, busca, obra, tipo, competencia, vinculo]);

  const limpar = () => {
    setBusca("");
    setObra("");
    setTipo("");
    setCompetencia("");
    setVinculo("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <Label>Buscar</Label>
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="arquivo, NF, PED ou fornecedor"
            />
          </div>
          <div>
            <Label>Projeto</Label>
            <Select value={obra} onChange={(e) => setObra(e.target.value)}>
              <option value="">Todos</option>
              {opts.obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {opts.tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Competência</Label>
            <Select value={competencia} onChange={(e) => setCompetencia(e.target.value)}>
              <option value="">Todas</option>
              {opts.competencias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Vínculo</Label>
            <Select value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
              <option value="">Todos</option>
              <option value="vinculado">Vinculado a despesa</option>
              <option value="sem">Sem vínculo</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <Badge tone="neutral">{filtrados.length} arquivo(s)</Badge>
        <span className="text-[var(--color-ink3)]">
          {rows.filter((r) => !r.despesaId).length} sem vínculo
        </span>
        <button
          onClick={limpar}
          className="ml-auto text-[12px] text-[var(--color-accent2)] hover:underline"
        >
          Limpar filtros
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table wrapperClassName="max-h-[70vh] scroll-x-always" className="min-w-[1250px]">
            <THead className="sticky top-0 z-10">
              <tr>
                <TH>Arquivo</TH>
                <TH>Tipo</TH>
                <TH>Nº doc. fiscal</TH>
                <TH>PED</TH>
                <TH>Projeto</TH>
                <TH>Fornecedor</TH>
                <TH>Competência</TH>
                <TH className="text-right">Valor</TH>
                <TH>Enviado por</TH>
                <TH>Upload</TH>
                <TH></TH>
              </tr>
            </THead>
            <tbody>
              {filtrados.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[260px] truncate font-medium text-[var(--color-ink)]">
                    {r.filename}
                  </TD>
                  <TD className="whitespace-nowrap text-[var(--color-ink2)]">{r.tipo ?? "—"}</TD>
                  <TD className="whitespace-nowrap font-[family-name:var(--font-mono)]">
                    {r.numeroDocumentoFiscal ?? "—"}
                  </TD>
                  <TD className="whitespace-nowrap font-[family-name:var(--font-mono)]">
                    {r.despesaId && r.numDoc ? (
                      <Link
                        href={`/despesas?proj=${r.projectId}&tab=lancamentos&edit=${r.despesaId}`}
                        className="text-[var(--color-accent2)] hover:underline"
                      >
                        {r.numDoc}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-ink4)]">sem vínculo</span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">{r.projectName ?? "—"}</TD>
                  <TD className="max-w-[180px] truncate text-[var(--color-ink3)]">
                    {r.fornecedorNome ?? "—"}
                  </TD>
                  <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                    {r.competencia ?? "—"}
                  </TD>
                  <TD className="text-right font-[family-name:var(--font-mono)]">
                    {r.valor == null ? "—" : brl0(r.valor)}
                  </TD>
                  <TD className="max-w-[160px] truncate text-[var(--color-ink3)]">
                    {r.uploadedBy ?? "—"}
                  </TD>
                  <TD className="whitespace-nowrap font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                    {r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString("pt-BR") : "—"}
                  </TD>
                  <TD className="text-right">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener"
                        className="text-sm text-[var(--color-accent2)] hover:underline"
                      >
                        Abrir
                      </a>
                    ) : null}
                  </TD>
                </TR>
              ))}
              {filtrados.length === 0 && (
                <TR>
                  <TD colSpan={11} className="py-8 text-center text-[var(--color-ink4)]">
                    Nenhum documento com os filtros aplicados.
                  </TD>
                </TR>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

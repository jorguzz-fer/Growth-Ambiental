"use client";

import { useState, useTransition } from "react";
import { deleteConta, inventarioDaConta, setContaAtiva, updateConta } from "@/lib/actions/contas";
import { rotuloDaAtualizacao } from "@/lib/contas-regras";
import { brl0 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface ContaData {
  id: string;
  banco: string;
  ag: string | null;
  op: string | null;
  cc: string | null;
  tipo: string;
  saldo: number;
  saldoSource: string;
  openFinanceId: string | null;
  ativo: boolean;
  /** Prompt AT §1-B.8 — a situação da conexão do Open Finance desta conta. */
  conexao?: { situacao: "conectado" | "atualizando" | "precisa_acao" | "erro" | "desconectado"; ultimaAtualizacao: string | null; erro: string | null } | null;
}

const ROTULO_DA_CONEXAO = { conectado: "conectada", atualizando: "atualizando", precisa_acao: "precisa de ação", erro: "erro", desconectado: "desconectada" } as const;
const TOM_DA_CONEXAO = { conectado: "success", atualizando: "info", precisa_acao: "warning", erro: "danger", desconectado: "neutral" } as const;

/**
 * Lista das contas correntes (Prompt X). Saldo editável com Salvar por
 * linha (4.2); rótulo de atualização que diz a verdade (4.1); inativar em
 * vez de excluir quando há histórico (3.2); excluir verifica as dez tabelas
 * e diz qual vínculo impede (5.4). O total soma só contas ATIVAS (2.2).
 */
export function ContasManager({ contas, canEditar, canExcluir }: { contas: ContaData[]; canEditar: boolean; canExcluir: boolean }) {
  const ativas = contas.filter((c) => c.ativo);
  const total = ativas.reduce((a, c) => a + c.saldo, 0);
  const showActions = canEditar || canExcluir;

  return (
    <Table>
      <THead>
        <tr>
          <TH>Banco</TH>
          <TH>Agência / Conta</TH>
          <TH>Tipo</TH>
          <TH>Open Finance</TH>
          <TH className="text-right">Saldo atual</TH>
          <TH>Atualização</TH>
          <TH>Situação</TH>
          {showActions && <TH className="text-right">Ações</TH>}
        </tr>
      </THead>
      <tbody>
        {contas.length === 0 ? (
          <TR>
            <TD colSpan={showActions ? 8 : 7} className="py-8 text-center text-[var(--color-ink4)]">
              Nenhuma conta cadastrada.
            </TD>
          </TR>
        ) : (
          contas.map((c) => <Row key={c.id} conta={c} canEditar={canEditar} canExcluir={canExcluir} />)
        )}
        <TR>
          <TD colSpan={4} className="font-semibold text-[var(--color-ink)]">
            Saldo total <span className="text-[11.5px] font-normal text-[var(--color-ink3)]">— soma apenas as {ativas.length} conta(s) ativa(s)</span>
          </TD>
          <TD className="text-right font-[family-name:var(--font-mono)] font-semibold text-[var(--color-accent)]">{brl0(total)}</TD>
          <TD colSpan={showActions ? 3 : 2} />
        </TR>
      </tbody>
    </Table>
  );
}

function Row({ conta, canEditar, canExcluir }: { conta: ContaData; canEditar: boolean; canExcluir: boolean }) {
  const [saldo, setSaldo] = useState(String(conta.saldo));
  const [source, setSource] = useState(conta.saldoSource);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const dirty = saldo !== String(conta.saldo) || source !== conta.saldoSource;
  const atualizacao = rotuloDaAtualizacao({ saldoSource: conta.saldoSource, openFinanceId: conta.openFinanceId });

  const run = (fn: () => Promise<{ ok: true; aviso?: string | null } | { ok: false; error: string }>) => {
    setError(null);
    setInfo(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else if (r.aviso) setInfo(r.aviso);
    });
  };

  return (
    <TR className={!conta.ativo ? "opacity-60" : undefined}>
      <TD className="font-medium text-[var(--color-ink)]">{conta.banco}</TD>
      <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
        {conta.ag || "—"}
        {conta.op ? ` · op ${conta.op}` : ""} · {conta.cc || "—"}
      </TD>
      <TD>
        <Badge tone={conta.tipo === "Imobiliária" ? "info" : conta.tipo === "Terceiros" ? "warning" : "neutral"}>{conta.tipo}</Badge>
      </TD>
      <TD>
        {conta.conexao ? (
          <Badge tone={TOM_DA_CONEXAO[conta.conexao.situacao]} title={conta.conexao.erro ?? (conta.conexao.ultimaAtualizacao ? `atualizada em ${new Date(conta.conexao.ultimaAtualizacao).toLocaleString("pt-BR")}` : undefined)} data-situacao-conta={conta.conexao.situacao}>
            {ROTULO_DA_CONEXAO[conta.conexao.situacao]}
            {conta.conexao.situacao === "conectado" && conta.conexao.ultimaAtualizacao ? ` · ${new Date(conta.conexao.ultimaAtualizacao).toLocaleDateString("pt-BR")}` : ""}
          </Badge>
        ) : (
          <Badge tone="neutral">não conectada</Badge>
        )}
      </TD>
      <TD className="text-right">
        {canEditar ? (
          <Input type="number" step="0.01" value={saldo} onChange={(e) => setSaldo(e.target.value)} disabled={pending} aria-label={`Saldo de ${conta.banco}`} className="h-8 w-32 text-right font-[family-name:var(--font-mono)] text-xs" />
        ) : (
          <span className="font-[family-name:var(--font-mono)]">{brl0(conta.saldo)}</span>
        )}
      </TD>
      <TD>
        {canEditar ? (
          <Select value={source} onChange={(e) => setSource(e.target.value)} disabled={pending} aria-label={`Atualização de ${conta.banco}`} className="h-8 w-44 text-xs">
            <option value="manual">Manual</option>
            <option value="auto">Automático (quando conectado)</option>
          </Select>
        ) : (
          <Badge tone={atualizacao.conectada === false ? "warning" : atualizacao.conectada ? "info" : "neutral"}>{atualizacao.rotulo}</Badge>
        )}
        {/* 4.1 / BX-3 — "auto" sem conexão não atualiza sozinho: o último saldo veio de um extrato subido. */}
        {canEditar && atualizacao.conectada === false && <div className="text-[11px] text-[#92400e]">não conectada: só atualiza pelo extrato subido no Caixa</div>}
        {error && <div className="text-xs text-[var(--color-danger)]" role="alert">{error}</div>}
        {info && <div className="text-xs text-[var(--color-ink3)]" role="status">{info}</div>}
      </TD>
      <TD>
        <Badge tone={conta.ativo ? "success" : "neutral"}>{conta.ativo ? "ativa" : "inativa"}</Badge>
      </TD>
      {(canEditar || canExcluir) && (
        <TD className="text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canEditar && (
              <Button size="sm" variant="outline" disabled={pending || !dirty} onClick={() => run(() => updateConta(conta.id, { saldo, saldoSource: source }))}>
                Salvar
              </Button>
            )}
            {canEditar && (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setContaAtiva(conta.id, !conta.ativo))}>
                {conta.ativo ? "Inativar" : "Reativar"}
              </Button>
            )}
            {canExcluir && (
              <button
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    // 5.4 — o inventário aparece ANTES de confirmar; com vínculo, a própria action recusa dizendo qual.
                    const inv = await inventarioDaConta(conta.id);
                    if (!inv.ok) return inv;
                    if (inv.bloqueios.length > 0) return { ok: false, error: `Não pode ser excluída: ${inv.bloqueios.join(", ")} vinculado(s). Inative-a — o registro fica e sai do saldo total.` };
                    if (!window.confirm(`Excluir a conta "${conta.banco}${conta.cc ? " · " + conta.cc : ""}"? Ela não tem nenhum vínculo.`)) return { ok: true as const };
                    return deleteConta(conta.id);
                  })
                }
                className="text-sm text-[var(--color-danger)] hover:underline disabled:opacity-50"
              >
                Excluir
              </button>
            )}
          </div>
        </TD>
      )}
    </TR>
  );
}

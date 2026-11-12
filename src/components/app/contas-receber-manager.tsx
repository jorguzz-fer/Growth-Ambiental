"use client";

import { useCrisFormulario } from "@/components/app/cris-contexto";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  createContaReceber,
  updateContaReceber,
  cancelarContaReceber,
  type ResultadoContaReceber,
} from "@/lib/actions/contas-receber";
import { TIPOS_DE_RECEITA as TIPOS_RECEITA } from "@/lib/conta-receber-regras";
import { estadoDaConta, type EstadoCalculado } from "@/lib/conta-receber-estado";
import type { ContaReceberRow, EntradaDisponivel } from "@/lib/queries";
import { ContaReceberRecebimentos, tomDoEstado, type RecebimentoExibido } from "@/components/app/conta-receber-recebimentos";
import { brl, brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { DateField } from "@/components/ui/date-field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { SortTH, useOrdenacaoTabela } from "@/components/app/sortable-th";
import { ContaReceberDocs, type ContaReceberDoc } from "@/components/app/conta-receber-docs";
import type { ColunaOrdenavel } from "@/lib/tabela-ordenacao";

interface Opt {
  id: string;
  nome: string;
}
export interface UnitReceb {
  /** CR-08 — unidade:índice da parcela, produzido por `getReceivables`. */
  refId: string;
  unitCode: string;
  projectName: string;
  clienteNome: string | null;
  descricao: string;
  dia: string;
  valor: number;
}

/** Formulário de criação (client por causa do campo condicional "Outras Receitas"). */
export interface PrefillContaReceber {
  valor?: string | null;
  vencimento?: string | null;
  descricao?: string | null;
}

function NovaConta({
  projetos,
  projetoSelecionado,
  clientes,
  bancos,
  unidadesPorObra,
  prefill,
}: {
  projetos: Opt[];
  projetoSelecionado: string | null;
  clientes: Opt[];
  bancos: Opt[];
  unidadesPorObra: Record<string, string[]>;
  prefill?: PrefillContaReceber | null;
}) {
  // Prompt L, 3-A.2 — entrada do extrato encaminhada abre com os dados preenchidos.
  const [tipo, setTipo] = useState<string>(prefill?.descricao ? "Outras Receitas" : "Sinal");
  const [valor, setValor] = useState(prefill?.valor ?? "");
  const [projectId, setProjectId] = useState(projetoSelecionado ?? projetos[0]?.id ?? "");
  const [vencimento, setVencimento] = useState(prefill?.vencimento ?? "");
  const [descricao, setDescricao] = useState(prefill?.descricao ?? "");
  const [unitCode, setUnitCode] = useState("");
  const [bancoId, setBancoId] = useState("");
  const [pending, start] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // CR-07 — só as unidades da obra escolhida no próprio formulário.
  const unidades = unidadesPorObra[projectId] ?? [];
  // Prompt K2 — a Cris preenche (texto, ditado ou documento); quem grava é Adicionar.
  // O cliente fica de fora: o nome do comprador não vai ao modelo.
  useCrisFormulario(
    {
      id: "conta-receber-nova",
      titulo: "Nova conta a receber",
      campos: [
        { nome: "projeto", rotulo: "Projeto", tipo: "opcao", opcoes: projetos.map((p) => p.nome) },
        { nome: "tipo", rotulo: "Tipo", tipo: "opcao", opcoes: [...TIPOS_RECEITA] },
        { nome: "valor", rotulo: "Valor", tipo: "numero", dica: "em reais" },
        { nome: "vencimento", rotulo: "Vencimento", tipo: "data", dica: "MM/DD/YYYY" },
        { nome: "descricao", rotulo: "Descrição", tipo: "texto", dica: "obrigatória em Outras Receitas" },
        { nome: "unidade", rotulo: "Unidade", tipo: "opcao", opcoes: unidades },
        { nome: "banco", rotulo: "Banco", tipo: "opcao", opcoes: bancos.map((b) => b.nome) },
      ],
    },
    (p) => {
      const v = p.valores;
      const proj = v.projeto ? projetos.find((x) => x.nome === v.projeto) : undefined;
      if (proj) setProjectId(proj.id);
      if (v.tipo) setTipo(v.tipo);
      if (v.valor) setValor(v.valor);
      if (v.vencimento) setVencimento(v.vencimento);
      if (v.descricao) setDescricao(v.descricao);
      if (v.unidade) setUnitCode(v.unidade);
      const banco = v.banco ? bancos.find((b) => b.nome === v.banco) : undefined;
      if (banco) setBancoId(banco.id);
      setAviso({ ok: true, texto: "A Cris preencheu o formulário. Confira e clique em Adicionar." });
    },
  );
  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setAviso(null);
    start(async () => {
      const r = await createContaReceber(fd);
      // CR-09 — a action devolve { ok, error }; a mensagem chega inteira.
      if (!r.ok) {
        setAviso({ ok: false, texto: r.error });
        return;
      }
      setAviso({ ok: true, texto: "Conta a receber lançada." });
      formRef.current?.reset();
      setValor("");
      setTipo("Sinal");
      setVencimento("");
      setDescricao("");
      setUnitCode("");
      setBancoId("");
    });
  };
  return (
    <Card className="mb-5">
      <CardContent className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Nova conta a receber</h3>
        <form ref={formRef} onSubmit={enviar} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <Label>Projeto *</Label>
            <Select name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_RECEITA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Valor</Label>
            <MoneyInput name="valor" value={valor} onChange={setValor} />
          </div>
          <div>
            <Label>Vencimento</Label>
            <DateField name="vencimento" value={vencimento} onChange={setVencimento} />
          </div>
          {tipo === "Outras Receitas" && (
            <div className="sm:col-span-4">
              <Label>Descrição (obrigatória para Outras Receitas) *</Label>
              <Input name="descricao" required placeholder="Origem/natureza da receita" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          )}
          {tipo !== "Outras Receitas" && (
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Input name="descricao" placeholder="Opcional" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Unidade (opcional)</Label>
            <Select name="unitCode" value={unitCode} onChange={(e) => setUnitCode(e.target.value)}>
              <option value="">—</option>
              {unidades.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Cliente (opcional)</Label>
            <Select name="clienteId" defaultValue="">
              <option value="">—</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Banco (opcional)</Label>
            <Select name="bancoId" value={bancoId} onChange={(e) => setBancoId(e.target.value)}>
              <option value="">—</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Salvando…" : "Adicionar"}
            </Button>
          </div>
          {aviso && (
            <p role="status" className={`sm:col-span-4 text-sm ${aviso.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
              {aviso.texto}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/** Linha editável de uma conta a receber. */
function ContaRow({
  c,
  projetos,
  docs,
  recebimentos,
  entradas,
  r2,
  canEditar,
  canExcluir,
}: {
  c: ContaReceberRow;
  projetos: Opt[];
  docs: ContaReceberDoc[];
  recebimentos: RecebimentoExibido[];
  entradas: EntradaDisponivel[];
  r2: boolean;
  canEditar: boolean;
  canExcluir: boolean;
}) {
  const [edit, setEdit] = useState(false);
  const [anexos, setAnexos] = useState(false);
  const [receber, setReceber] = useState(false);
  const [tipo, setTipo] = useState(c.tipo);
  const [valor, setValor] = useState(String(c.valor));
  // 3.2 — o estado é derivado dos recebimentos, nunca digitado.
  const estado: EstadoCalculado = estadoDaConta({ valor: c.valor, cancelado: false, recebimentos });
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  // CR-09 — as actions devolvem { ok, error }; a mensagem aparece na linha.
  const executar = (fd: FormData, acao: (fd: FormData) => Promise<ResultadoContaReceber>, aoConcluir?: () => void) => {
    setErro(null);
    start(async () => {
      const r = await acao(fd);
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      aoConcluir?.();
    });
  };
  if (edit) {
    return (
      <TR id={`conta-${c.id}`}>
        <TD colSpan={7}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executar(new FormData(e.currentTarget), updateContaReceber, () => setEdit(false));
            }}
            className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-4"
          >
            <input type="hidden" name="id" value={c.id} />
            <div>
              <Label>Projeto</Label>
              <Select name="projectId" defaultValue={c.projectId}>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS_RECEITA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <MoneyInput name="valor" value={valor} onChange={setValor} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <DateField name="vencimento" defaultValue={c.vencimento ?? ""} />
            </div>
            <div className={tipo === "Outras Receitas" ? "sm:col-span-4" : "sm:col-span-2"}>
              <Label>Descrição{tipo === "Outras Receitas" ? " *" : ""}</Label>
              <Input name="descricao" defaultValue={c.descricao ?? ""} required={tipo === "Outras Receitas"} />
            </div>
            <input type="hidden" name="unitCode" value={c.unitCode ?? ""} />
            <input type="hidden" name="clienteId" value={c.clienteId ?? ""} />
            <input type="hidden" name="bancoId" value={c.bancoId ?? ""} />
            <div className="flex items-end gap-2 sm:col-span-4">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEdit(false)} disabled={pending}>
                Cancelar
              </Button>
              {erro && <span className="text-xs text-[var(--color-danger)]">{erro}</span>}
            </div>
          </form>
        </TD>
      </TR>
    );
  }
  return (
    <>
    <TR id={`conta-${c.id}`}>
      <TD className="whitespace-nowrap">{c.projectName}</TD>
      <TD>{c.tipo}</TD>
      <TD className="max-w-[220px] truncate">{c.descricao ?? c.unitCode ?? "—"}</TD>
      <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(c.valor)}</TD>
      <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink2)]">
        {c.vencimento ? dateBR(c.vencimento) : "—"}
      </TD>
      <TD>
        <Badge tone={tomDoEstado(estado.estado)}>{estado.estado}</Badge>
        {estado.recebido > 0 && estado.saldo > 0 && (
          <span className="ml-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink3)]">falta {brl(estado.saldo)}</span>
        )}
      </TD>
      <TD className="text-right">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="text-sm text-[var(--color-success)] hover:underline"
            aria-expanded={receber}
            onClick={() => setReceber((a) => !a)}
          >
            {estado.quitada ? "Recebimentos" : "Receber"}
          </button>
          <button
            type="button"
            className="text-sm text-[var(--color-ink2)] hover:underline"
            aria-expanded={anexos}
            onClick={() => setAnexos((a) => !a)}
          >
            Anexos{docs.length > 0 ? ` (${docs.length})` : ""}
          </button>
          {canEditar && (
            <button className="text-sm text-[var(--color-accent2)] hover:underline" onClick={() => setEdit(true)}>
              Editar
            </button>
          )}
          {canExcluir && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(`Cancelar a conta a receber de ${brl0(c.valor)}? Ela sai das listas e dos relatórios, mas fica no histórico.`)) return;
                const fd = new FormData();
                fd.set("id", c.id);
                executar(fd, cancelarContaReceber);
              }}
              className="text-sm text-[var(--color-danger)] hover:underline disabled:opacity-50"
            >
              {pending ? "…" : "Cancelar"}
            </button>
          )}
          {erro && <span className="text-xs text-[var(--color-danger)]">{erro}</span>}
        </div>
      </TD>
    </TR>
    {receber && (
      <TR>
        <TD colSpan={7} className="py-2">
          <ContaReceberRecebimentos key={`${estado.estado}:${estado.saldo}`} contaId={c.id} estado={estado} recebimentos={recebimentos} entradas={entradas.filter((m) => m.projectId === c.projectId || m.projectId == null)} canEdit={canEditar} />
        </TD>
      </TR>
    )}
    {anexos && (
      <TR>
        <TD colSpan={7} className="py-2">
          <ContaReceberDocs contaId={c.id} docs={docs} canEdit={canEditar} r2={r2} />
        </TD>
      </TR>
    )}
    </>
  );
}

export function ContasReceberManager({
  prefill = null,
  projetos,
  projetoSelecionado,
  clientes,
  bancos,
  unidadesPorObra,
  contas,
  docsPorConta,
  recebimentosPorConta,
  entradas,
  r2,
  unitReceb,
  canCriar,
  canEditar,
  canExcluir,
}: {
  prefill?: PrefillContaReceber | null;
  projetos: Opt[];
  projetoSelecionado: string | null;
  clientes: Opt[];
  bancos: Opt[];
  unidadesPorObra: Record<string, string[]>;
  contas: ContaReceberRow[];
  docsPorConta: Record<string, ContaReceberDoc[]>;
  recebimentosPorConta: Record<string, RecebimentoExibido[]>;
  entradas: EntradaDisponivel[];
  r2: boolean;
  unitReceb: UnitReceb[];
  canCriar: boolean;
  canEditar: boolean;
  canExcluir: boolean;
}) {
  const totalManual = contas.reduce((a, c) => a + c.valor, 0);
  // 3.5 — indicador permanente: recebido sem conciliar, e há quantos dias.
  const semConciliar = useMemo(() => {
    let valor = 0;
    let n = 0;
    let maisAntigo: number | null = null;
    const ymd = (d: string | null) => {
      const m = (d ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      return m ? Number(m[3]) * 10000 + Number(m[1]) * 100 + Number(m[2]) : null;
    };
    for (const c of contas) {
      const lista = (recebimentosPorConta[c.id] ?? []).filter((r) => !r.estornado && !r.cashEntryId);
      if (lista.length === 0) continue;
      n += 1;
      valor += lista.reduce((a, r) => a + r.valor, 0);
      for (const r of lista) {
        const d = ymd(r.data);
        if (d != null && (maisAntigo == null || d < maisAntigo)) maisAntigo = d;
      }
    }
    let dias: number | null = null;
    if (maisAntigo != null) {
      const a = new Date(Date.UTC(Math.floor(maisAntigo / 10000), Math.floor((maisAntigo % 10000) / 100) - 1, maisAntigo % 100));
      dias = Math.max(0, Math.round((Date.now() - a.getTime()) / 86400000));
    }
    return { valor, contas: n, dias };
  }, [contas, recebimentosPorConta]);
  const totalVendas = unitReceb.reduce((a, r) => a + r.valor, 0);

  // §5 — ordenação estilo planilha nas DUAS listagens desta tela. Sem clique de
  // cabeçalho, cada tabela mantém a ordem que já vinha do servidor.
  const colContas = useMemo<ColunaOrdenavel<ContaReceberRow>[]>(
    () => [
      { key: "projeto", tipo: "texto", get: (c) => c.projectName },
      { key: "tipo", tipo: "texto", get: (c) => c.tipo },
      { key: "descricao", tipo: "texto", get: (c) => c.descricao ?? c.unitCode },
      { key: "valor", tipo: "valor", get: (c) => c.valor },
      { key: "vencimento", tipo: "data", get: (c) => c.vencimento },
      { key: "status", tipo: "texto", get: (c) => c.status },
    ],
    [],
  );
  const contasOrd = useOrdenacaoTabela(contas, colContas, (c) => c.id);

  const colReceb = useMemo<ColunaOrdenavel<UnitReceb>[]>(
    () => [
      { key: "unidade", tipo: "texto", get: (r) => r.unitCode },
      { key: "projeto", tipo: "texto", get: (r) => r.projectName },
      { key: "cliente", tipo: "texto", get: (r) => r.clienteNome },
      { key: "descricao", tipo: "texto", get: (r) => r.descricao },
      { key: "previsto", tipo: "data", get: (r) => r.dia },
      { key: "valor", tipo: "valor", get: (r) => r.valor },
    ],
    [],
  );
  // CR-08 — o recebível tem identificador (unidade:índice da parcela).
  const recebOrd = useOrdenacaoTabela(unitReceb, colReceb, (r) => r.refId);

  return (
    <div>
      {canCriar && (
        <NovaConta
          prefill={prefill}
          projetos={projetos}
          projetoSelecionado={projetoSelecionado}
          clientes={clientes}
          bancos={bancos}
          unidadesPorObra={unidadesPorObra}
        />
      )}

      <div
        role="status"
        className={`mb-3 rounded-[10px] border px-4 py-2.5 text-[13px] ${semConciliar.contas > 0 ? "border-[var(--color-warning)]/40 bg-[#fef3c7]/60 text-[#92400e]" : "border-[var(--color-line)] bg-[var(--color-surface2)] text-[var(--color-ink2)]"}`}
      >
        {semConciliar.contas > 0 ? (
          <>
            Recebido sem conciliar: <strong className="font-[family-name:var(--font-mono)]">{brl(semConciliar.valor)}</strong> em {semConciliar.contas} conta(s)
            {semConciliar.dias != null && <> — o mais antigo há {semConciliar.dias} dia(s)</>}. Importe o extrato no Caixa e concilie.
          </>
        ) : (
          <>Nada recebido sem conciliar.</>
        )}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[13px]">
        <Badge tone="neutral">{contas.length} lançadas</Badge>
        <span className="text-[var(--color-ink3)]">
          Total lançado{" "}
          <strong className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">{brl0(totalManual)}</strong>
        </span>
      </div>
      <Card className="mb-8">
        <CardContent className="p-0">
          <Table wrapperClassName="scroll-x-always" className="min-w-[900px]">
              <THead>
                <tr>
                  <SortTH coluna="projeto" estado={contasOrd.estado} onSort={contasOrd.onSort}>Projeto</SortTH>
                  <SortTH coluna="tipo" estado={contasOrd.estado} onSort={contasOrd.onSort}>Tipo</SortTH>
                  <SortTH coluna="descricao" estado={contasOrd.estado} onSort={contasOrd.onSort}>Descrição</SortTH>
                  <SortTH coluna="valor" estado={contasOrd.estado} onSort={contasOrd.onSort} className="text-right">Valor</SortTH>
                  <SortTH coluna="vencimento" estado={contasOrd.estado} onSort={contasOrd.onSort}>Vencimento</SortTH>
                  <SortTH coluna="status" estado={contasOrd.estado} onSort={contasOrd.onSort}>Estado</SortTH>
                  <TH className="text-right">Ações</TH>
                </tr>
              </THead>
              <tbody>
                {contasOrd.rows.map((c) => (
                  <ContaRow
                    key={c.id}
                    c={c}
                    projetos={projetos}
                    docs={docsPorConta[c.id] ?? []}
                    recebimentos={recebimentosPorConta[c.id] ?? []}
                    entradas={entradas}
                    r2={r2}
                    canEditar={canEditar}
                    canExcluir={canExcluir}
                  />
                ))}
                {contasOrd.rows.length === 0 && (
                  <TR>
                    <TD colSpan={7} className="py-8 text-center text-[var(--color-ink4)]">
                      Nenhuma conta a receber lançada. Recebíveis das vendas aparecem abaixo.
                    </TD>
                  </TR>
                )}
              </tbody>
            </Table>
        </CardContent>
      </Card>

      {/* Recebíveis originados em Unidades / Vendas (derivados do plano de pagamento). */}
      <h2 className="mb-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
        Recebíveis das vendas (Unidades) · {brl0(totalVendas)}
      </h2>
      <Card>
        <CardContent className="p-0">
          <Table wrapperClassName="max-h-[420px] scroll-x-always" className="min-w-[900px]">
              <THead>
                <tr>
                  <SortTH coluna="unidade" estado={recebOrd.estado} onSort={recebOrd.onSort}>Unidade</SortTH>
                  <SortTH coluna="projeto" estado={recebOrd.estado} onSort={recebOrd.onSort}>Projeto</SortTH>
                  <SortTH coluna="cliente" estado={recebOrd.estado} onSort={recebOrd.onSort}>Cliente</SortTH>
                  <SortTH coluna="descricao" estado={recebOrd.estado} onSort={recebOrd.onSort}>Descrição</SortTH>
                  <SortTH coluna="previsto" estado={recebOrd.estado} onSort={recebOrd.onSort}>Previsto</SortTH>
                  <SortTH coluna="valor" estado={recebOrd.estado} onSort={recebOrd.onSort} className="text-right">Valor</SortTH>
                </tr>
              </THead>
              <tbody>
                {recebOrd.rows.map((r) => (
                  <TR key={r.refId}>
                    <TD className="font-medium">{r.unitCode}</TD>
                    <TD className="whitespace-nowrap">{r.projectName}</TD>
                    <TD className="text-[var(--color-ink3)]">{r.clienteNome ?? "—"}</TD>
                    <TD>{r.descricao}</TD>
                    <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink2)]">
                      {r.dia ? dateBR(r.dia) : "—"}
                    </TD>
                    <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-success)]">
                      {brl0(r.valor)}
                    </TD>
                  </TR>
                ))}
                {recebOrd.rows.length === 0 && (
                  <TR>
                    <TD colSpan={6} className="py-6 text-center text-[var(--color-ink4)]">
                      Sem recebíveis de vendas (unidades vendidas geram recebíveis pelo plano de pagamento).
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

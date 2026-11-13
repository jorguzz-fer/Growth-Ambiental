"use client";

import { useCrisFormulario } from "@/components/app/cris-contexto";
import Link from "next/link";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buscarDespesasPorPed,
  criarDespesaTerceiro,
  registrarRestituicao,
  type DespesaPorPed,
  type DespesaTerceiroView,
} from "@/lib/actions/restituicoes";
import { rotuloStatusObrigacao, textoDosDias, type SituacaoDosDias } from "@/lib/calc/restituicao";
import { brl0, dateBR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

interface Opt {
  id: string;
  nome: string;
}

const statusTone = (s: string) =>
  s === "Restituído"
    ? "success"
    : s === "Cancelado"
      ? "danger"
      : s === "Parcialmente restituído"
        ? "info"
        : "warning";

/**
 * Chave de idempotência de uma tentativa (§16): identifica o FATO que o usuário
 * está registrando. Enquanto a chave não for renovada, reenviar o formulário
 * (duplo clique, Enter repetido, refresh que reposta) devolve o registro já
 * criado em vez de criar um segundo.
 */
function novaChave(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function RestituicoesManager({
  rows,
  obraDaTela,
  pagadores,
  projetos,
  bancos,
  canCriar,
  canEditar,
  projectId,
}: {
  /** obra da tela (Prompt A): despesa nova e saída de caixa vão para a versão de trabalho dela. */
  projectId: string;
  rows: (DespesaTerceiroView & { dias: SituacaoDosDias })[];
  /** obra da tela: filtro inicial da lista (que é da empresa — Prompt T, 6). */
  obraDaTela: string;
  /** quem desembolsou: só quem tem o papel "Pagador por Terceiro" (Prompt W, 1.5). */
  pagadores: Opt[];
  projetos: Opt[];
  bancos: { id: string; banco: string; tipo: string }[];
  canCriar: boolean;
  canEditar: boolean;
}) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sel, setSel] = useState<DespesaTerceiroView | null>(null);
  const [filtro, setFiltro] = useState("");
  /** Lançamento existente escolhido pelo PED (§9) — obrigatório (Prompt T, 2.2). */
  const [ped, setPed] = useState<DespesaPorPed | null>(null);
  // Uma chave por tentativa. Só é renovada depois de um registro bem-sucedido —
  // assim o reenvio do MESMO preenchimento nunca vira dois registros.
  const chave = useRef(novaChave());

  const submit = (fd: FormData) => {
    if (saving) return; // trava de duplo clique antes mesmo de chamar o servidor
    setError(null);
    setAviso(null);
    fd.set("idempotencyKey", chave.current);
    fd.set("projectId", projectId);
    if (ped) fd.set("despesaId", ped.id);
    start(async () => {
      const res = await criarDespesaTerceiro(fd);
      if (!res.ok) {
        setError(res.error ?? "Falha ao registrar.");
        return;
      }
      chave.current = novaChave();
      if (res.jaExistia) {
        setAviso(
          "Este lançamento já tinha uma obrigação de restituição — ela está na lista abaixo. Nada foi duplicado.",
        );
      }
      setPed(null);
      router.refresh();
    });
  };

  // Prompt T, 6 — a lista é da empresa; a obra da tela é só o filtro inicial.
  const [obra, setObra] = useState<string>(obraDaTela);
  const filtrados = rows.filter((r) => (!filtro || r.status === filtro) && (!obra || r.projectId === obra));

  return (
    <div className="space-y-6">
      {canCriar && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">
              Vincular lançamento existente a um pagador
            </h2>
            <p className="mb-3 text-[11.5px] text-[var(--color-ink3)]">
              Despesa nova é lançada em <Link href="/despesas" className="underline">Despesas</Link>, com a origem &ldquo;paga por terceiro&rdquo; — a obrigação nasce lá.
              Este bloco serve para regularizar um lançamento antigo que foi pago por terceiro e não foi marcado como tal: localize-o pelo PED e informe quem desembolsou. Nada do lançamento é sobrescrito.
            </p>

            <BuscaPed selecionado={ped} onSelecionar={setPed} />

            <form action={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <input type="hidden" name="despesaId" value={ped?.id ?? ""} />
              <div>
                <Label>Quem desembolsou (terceiro)</Label>
                <Select name="pagadorTerceiroId" defaultValue="" required>
                  <option value="">—</option>
                  {pagadores.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </Select>
                {pagadores.length === 0 && (
                  <p className="mt-1 text-[11px] text-[var(--color-warning)]">
                    Nenhum cadastro ativo tem o papel &ldquo;Pagador por Terceiro&rdquo;. Conceda no bloco Pagadores terceiros, acima.
                  </p>
                )}
              </div>
              <div>
                <Label>Empresa responsável</Label>
                <Select name="empresaResponsavelId" defaultValue="">
                  <option value="">—</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Data do pagamento (terceiro)</Label>
                <DateField name="dataPagamentoOriginal" />
              </div>
              <div>
                <Label>Ressarcimento previsto para</Label>
                <DateField name="dataPrevistaRestituicao" />
              </div>
              <div className="sm:col-span-3">
                <Label>Observações</Label>
                <Input name="obs" />
              </div>
              <div className="col-span-2 flex items-end sm:col-span-4">
                <Button type="submit" disabled={saving || !ped}>
                  {saving ? "Registrando…" : ped ? `Registrar obrigação para ${ped.numDoc ?? "este PED"}` : "Escolha um PED acima"}
                </Button>
              </div>
            </form>
            <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
              A despesa continua na DRE 1× (competência/categoria originais); NÃO há saída de caixa agora. A saída ocorre só quando você registrar o ressarcimento — e a data dele não altera a competência da despesa.
            </p>
            {error && <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
            {aviso && <p className="mt-2 text-sm text-[var(--color-warning)]">{aviso}</p>}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Label className="mb-0">Projeto:</Label>
        <Select value={obra} onChange={(e) => setObra(e.target.value)} className="h-8 w-auto" aria-label="Filtrar por projeto">
          <option value="">Todos os projetos</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </Select>
        <Label className="mb-0 ml-2">Filtrar status:</Label>
        {/* O `value` é o status GRAVADO; o texto é o rótulo da tela. */}
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="h-8 w-auto">
          <option value="">Todos</option>
          <option value="Aguardando restituição">Pendente</option>
          <option value="Parcialmente restituído">Parcialmente restituído</option>
          <option value="Restituído">Restituído</option>
          <option value="Cancelado">Cancelado</option>
        </Select>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Documento</TH>
            <TH>Terceiro</TH>
            <TH>Projeto</TH>
            <TH className="text-right">Valor</TH>
            <TH className="text-right">Ressarcido</TH>
            <TH className="text-right">Saldo</TH>
            <TH>Prevista</TH>
            <TH className="text-right">Dias</TH>
            <TH>Status</TH>
            {canEditar && <TH className="text-right">Ação</TH>}
          </tr>
        </THead>
        <tbody>
          {filtrados.map((r) => (
            <TR key={r.id}>
              <TD className="font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">{r.numDoc ?? "—"}</TD>
              <TD>{r.pagador ?? "—"}</TD>
              <TD className="whitespace-nowrap text-[var(--color-ink3)]">{r.projectName}</TD>
              <TD className="text-right font-[family-name:var(--font-mono)]">{brl0(r.valorTotal)}</TD>
              <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-success)]">{brl0(r.valorRestituido)}</TD>
              <TD className="text-right font-[family-name:var(--font-mono)] text-[var(--color-warning)]">{brl0(r.saldoPendente)}</TD>
              <TD className="font-[family-name:var(--font-mono)]">{dateBR(r.dataPrevistaRestituicao)}</TD>
              {/* Prompt T, 8 — atraso, a vencer, hoje ou sem previsão; nunca um zero ambíguo. */}
              <TD className={`text-right font-[family-name:var(--font-mono)] ${r.dias.tipo === "atraso" && r.saldoPendente > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-ink3)]"}`}>
                {r.saldoPendente > 0 ? textoDosDias(r.dias) : "—"}
              </TD>
              {/* Rótulo "Pendente" para o status gravado "Aguardando
                  restituição": só o texto na tela muda; nenhum registro é
                  reclassificado no banco (§12). */}
              <TD><Badge tone={statusTone(r.status)}>{rotuloStatusObrigacao(r.status)}</Badge></TD>
              {canEditar && (
                <TD className="text-right">
                  {r.saldoPendente > 0 && r.status !== "Cancelado" ? (
                    <button onClick={() => setSel(r)} className="text-sm text-[var(--color-accent2)] hover:underline">
                      Registrar ressarcimento
                    </button>
                  ) : null}
                </TD>
              )}
            </TR>
          ))}
          {filtrados.length === 0 && (
            <TR>
              <TD colSpan={canEditar ? 10 : 9} className="py-6 text-center text-[var(--color-ink3)]">
                Nenhuma despesa paga por terceiro nesta empresa.
              </TD>
            </TR>
          )}
        </tbody>
      </Table>

      {sel && (
        <RestituicaoModal
          dt={sel}
          bancos={bancos}
          projectId={projectId}
          onClose={() => setSel(null)}
        />
      )}
    </div>
  );
}

/**
 * Localiza um lançamento já existente pelo número PED (§9).
 *
 * O que o usuário digita é o PED, mas o que amarra a obrigação é o **ID interno**
 * do lançamento — o número é só o rótulo humano. PED inexistente não seleciona
 * nada; lançamento cancelado, com valor zero ou que já tem obrigação ativa é
 * mostrado com o motivo e não pode ser escolhido para duplicar.
 */
function BuscaPed({
  selecionado,
  onSelecionar,
}: {
  selecionado: DespesaPorPed | null;
  onSelecionar: (d: DespesaPorPed | null) => void;
}) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<DespesaPorPed[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);

  useEffect(() => {
    const q = termo.trim();
    if (selecionado || q.length < 2) {
      setResultados([]);
      setBuscou(false);
      return;
    }
    let vivo = true;
    setBuscando(true);
    // Debounce: evita disparar uma consulta por tecla digitada.
    const t = setTimeout(async () => {
      const r = await buscarDespesasPorPed(q);
      if (!vivo) return;
      setResultados(r);
      setBuscou(true);
      setBuscando(false);
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
      setBuscando(false);
    };
  }, [termo, selecionado]);

  if (selecionado) {
    return (
      <div className="mb-3 rounded-[8px] border border-[var(--color-accent2)]/30 bg-[var(--color-surface2)] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-[13px]">
            <p className="font-medium text-[var(--color-ink)]">
              <span className="font-[family-name:var(--font-mono)]">
                {selecionado.numDoc ?? "sem número"}
              </span>{" "}
              · {brl0(selecionado.valor)}
            </p>
            <p className="text-[12px] text-[var(--color-ink3)]">
              {selecionado.projectName}
              {selecionado.fornecedorNome ? ` · ${selecionado.fornecedorNome}` : ""}
              {selecionado.competencia ? ` · competência ${selecionado.competencia}` : ""}
            </p>
            <p className="mt-1 text-[11.5px] text-[var(--color-ink4)]">
              Valor, competência, vencimento, categoria e número PED deste
              lançamento não serão alterados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelecionar(null);
              setTermo("");
            }}
            className="shrink-0 text-[12px] text-[var(--color-accent2)] hover:underline"
          >
            Trocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <Label>Vincular a um lançamento existente (nº PED) — opcional</Label>
      <Input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Digite o número do PED (ex.: 000070 ou PED-000070)"
      />
      {buscando && (
        <p className="mt-1 text-[11.5px] text-[var(--color-ink4)]">Procurando…</p>
      )}
      {buscou && resultados.length === 0 && (
        <p className="mt-1 text-[11.5px] text-[var(--color-danger)]">
          Nenhum lançamento com esse número. Confira o PED ou deixe em branco
          para criar uma despesa nova.
        </p>
      )}
      {resultados.length > 0 && (
        <ul className="mt-1 max-h-56 overflow-auto rounded-[8px] border border-[var(--color-accent2)]/15">
          {resultados.map((d) => {
            const impedimento = d.cancelado
              ? "lançamento cancelado"
              : d.valor <= 0
                ? "valor zero"
                : d.obrigacaoId
                  ? "já possui obrigação de restituição"
                  : null;
            return (
              <li key={d.id} className="border-b border-[var(--color-accent2)]/8 last:border-0">
                <button
                  type="button"
                  disabled={!!impedimento}
                  onClick={() => onSelecionar(d)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] ${
                    impedimento
                      ? "cursor-not-allowed opacity-55"
                      : "hover:bg-[var(--color-surface2)]"
                  }`}
                >
                  <span>
                    <span className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">
                      {d.numDoc ?? "sem número"}
                    </span>{" "}
                    <span className="text-[var(--color-ink3)]">
                      · {d.projectName}
                      {d.fornecedorNome ? ` · ${d.fornecedorNome}` : ""}
                    </span>
                    {impedimento && (
                      <span className="block text-[11px] text-[var(--color-warning)]">
                        {impedimento}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-[family-name:var(--font-mono)]">
                    {brl0(d.valor)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RestituicaoModal({
  dt,
  bancos,
  projectId,
  onClose,
}: {
  dt: DespesaTerceiroView;
  bancos: { id: string; banco: string; tipo: string }[];
  projectId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    valor: String(dt.saldoPendente),
    dataRestituicao: "",
    bankAccountId: "",
    comprovante: "",
    obs: "",
  });

  // Prompt T2 — a Cris preenche o ressarcimento; quem registra é o Confirmar.
  const [crisMsg, setCrisMsg] = useState(false);
  useCrisFormulario(
    {
      id: "ressarcimento",
      titulo: `Ressarcimento a ${dt.pagador} (saldo pendente ${brl0(dt.saldoPendente)})`,
      campos: [
        { nome: "valor", rotulo: "Valor a ressarcir", tipo: "numero", dica: `até ${dt.saldoPendente}` },
        { nome: "dataRestituicao", rotulo: "Data", tipo: "data", dica: "MM/DD/YYYY" },
        { nome: "banco", rotulo: "Conta bancária", tipo: "opcao", opcoes: bancos.map((b) => `${b.banco} · ${b.tipo}`) },
        { nome: "comprovante", rotulo: "Comprovante / observação", tipo: "texto" },
      ],
    },
    (p) => {
      const v = p.valores;
      const banco = v.banco ? bancos.find((b) => `${b.banco} · ${b.tipo}` === v.banco) : undefined;
      setF((x) => ({
        ...x,
        ...(v.valor ? { valor: v.valor } : {}),
        ...(v.dataRestituicao ? { dataRestituicao: v.dataRestituicao } : {}),
        ...(banco ? { bankAccountId: banco.id } : {}),
        ...(v.comprovante ? { comprovante: v.comprovante } : {}),
      }));
      setCrisMsg(true);
    },
  );

  // Uma chave por abertura do modal: confirmar duas vezes (duplo clique, Enter
  // repetido) registra UMA restituição — a segunda chamada devolve a primeira.
  const chave = useRef(novaChave());

  const confirmar = () => {
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await registrarRestituicao({
        despesaTerceiroId: dt.id,
        projectId,
        valor: Number(f.valor) || 0,
        dataRestituicao: f.dataRestituicao,
        bankAccountId: f.bankAccountId || null,
        comprovante: f.comprovante,
        obs: f.obs,
        idempotencyKey: chave.current,
      });
      if (!res.ok) {
        setError(res.error ?? "Falha ao registrar o ressarcimento.");
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6" onClick={(e) => e.stopPropagation()}>
          <h2 className="mb-1 text-lg font-semibold text-[var(--color-ink)]">Registrar ressarcimento</h2>
          <p className="mb-4 text-[12px] text-[var(--color-ink3)]">
            {dt.pagador} · saldo pendente {brl0(dt.saldoPendente)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor a ressarcir</Label>
              <Input type="number" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
            </div>
            <div>
              <Label>Data</Label>
              <DateField value={f.dataRestituicao} onChange={(v) => setF({ ...f, dataRestituicao: v })} />
            </div>
            <div className="col-span-2">
              <Label>Conta bancária</Label>
              <Select value={f.bankAccountId} onChange={(e) => setF({ ...f, bankAccountId: e.target.value })}>
                <option value="">—</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>{b.banco} · {b.tipo}</option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Comprovante / observação</Label>
              <Input value={f.comprovante} onChange={(e) => setF({ ...f, comprovante: e.target.value })} />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[var(--color-ink3)]">
            Gera a saída de caixa na data informada e liquida a obrigação. Não
            cria nova despesa na DRE.
          </p>
          {crisMsg && (
            <p data-cris-preencheu className="mt-2 text-sm text-[var(--color-accent)]">
              A Cris preencheu o ressarcimento. Confira e clique em Confirmar.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
            <Button onClick={confirmar} disabled={pending || (Number(f.valor) || 0) <= 0}>
              {pending ? "Registrando…" : "Confirmar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

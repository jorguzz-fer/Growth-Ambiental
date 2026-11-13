"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { DateField } from "@/components/ui/date-field";
import { useCrisFormulario } from "@/components/app/cris-contexto";
import { salvarContrato, salvarItem, type DadosDoContrato } from "@/lib/actions/contratos";
import { novaChave } from "./comum";
import { formularioDoContrato, itensDaProposta, type ItemProposto } from "@/lib/contrato-cris";
import { INDICES_DE_REAJUSTE, indicesOferecidosNoContrato } from "@/lib/incc-regras";
import { CRITERIOS_MEDICAO, ROTULO_CRITERIO, ROTULO_TIPO_CONTRATO, ROTULO_VINCULO, TIPOS_CONTRATO, VINCULOS_VALOR, lerNumero, totalDoItem } from "@/lib/contrato-regras";
import { brl, Mensagem } from "./comum";

export interface OpcoesDoForm {
  clientes: { id: string; nome: string }[];
  modalidades: { id: string; nome: string; ativo: boolean }[];
  projetos: { id: string; nome: string }[];
  principais: { id: string; codigo: string; titulo: string }[];
}

type Campos = Omit<DadosDoContrato, "valorOriginal" | "projetos"> & { valorOriginal: string };

const VAZIO: Campos = {
  titulo: "",
  numeroCliente: "",
  clienteId: "",
  objeto: "",
  escopo: "",
  modalidadeId: "",
  tipo: "contrato",
  contratoPrincipalId: "",
  vinculoValor: "",
  gestor: "",
  coordenadorTecnico: "",
  responsavelComercial: "",
  responsavelFinanceiro: "",
  dataAssinatura: "",
  dataInicio: "",
  dataTerminoPrevista: "",
  dataEncerramento: "",
  dataBaseReajuste: "",
  valorOriginal: "",
  moeda: "BRL",
  formaFaturamento: "",
  condicaoPagamento: "",
  periodicidadeMedicao: "",
  prazoPagamentoDias: "",
  indiceReajuste: "",
  retencaoPct: "",
  regrasReembolso: "",
};

/**
 * Cadastro e edição do contrato. Na criação, aceita itens (digitados ou
 * propostos pela Cris a partir do documento) — tudo fica na tela até o botão.
 * Na edição, valor e prazo originais travam depois de o contrato valer.
 */
export function ContratoForm({ opcoes, inicial, podeEditarValor = true, projetoInicial }: { opcoes: OpcoesDoForm; inicial?: (Partial<Campos> & { id: string; versao: number }) | null; podeEditarValor?: boolean; projetoInicial?: string | null }) {
  const router = useRouter();
  const [f, setF] = useState<Campos>({ ...VAZIO, ...(inicial ?? {}) } as Campos);
  const [projetos, setProjetos] = useState<{ projectId: string; valorAlocado: string }[]>(projetoInicial ? [{ projectId: projetoInicial, valorAlocado: "" }] : []);
  const [itens, setItens] = useState<ItemProposto[]>([]);
  const [conferir, setConferir] = useState<Record<string, string>>({});
  const [obsCris, setObsCris] = useState<string | null>(null);
  // Etapa 3 — a mesma tela envia a mesma chave: duplo clique ou nova tentativa criam um contrato só.
  const [chave] = useState(novaChave);
  const [viaCris, setViaCris] = useState(false);
  const [msg, setMsg] = useState<{ tom: "ok" | "erro" | "aviso"; texto: string } | null>(null);
  const [pendente, start] = useTransition();
  const set = (k: keyof Campos, v: string) => setF((x) => ({ ...x, [k]: v }));
  const editando = !!inicial?.id;

  const form = useMemo(() => formularioDoContrato({ clientes: opcoes.clientes.map((c) => c.nome), modalidades: opcoes.modalidades.filter((m) => m.ativo).map((m) => m.nome) }), [opcoes]);
  useCrisFormulario(editando ? null : form, (p) => {
    const v = p.valores;
    const cliente = opcoes.clientes.find((c) => c.nome === v.cliente);
    const modalidade = opcoes.modalidades.find((m) => m.nome === v.modalidade);
    setF((x) => ({
      ...x,
      ...Object.fromEntries(
        ["titulo", "numeroCliente", "objeto", "escopo", "dataAssinatura", "dataInicio", "dataTerminoPrevista", "dataBaseReajuste", "formaFaturamento", "condicaoPagamento", "periodicidadeMedicao", "regrasReembolso"]
          .filter((k) => v[k])
          .map((k) => [k, v[k]]),
      ),
      ...(v.regrasMedicao ? { periodicidadeMedicao: [v.periodicidadeMedicao, v.regrasMedicao].filter(Boolean).join(" — ") } : {}),
      ...(cliente ? { clienteId: cliente.id } : {}),
      ...(modalidade ? { modalidadeId: modalidade.id } : {}),
      ...(v.valorOriginal && lerNumero(v.valorOriginal) != null ? { valorOriginal: String(lerNumero(v.valorOriginal)) } : {}),
      ...(v.prazoPagamentoDias && lerNumero(v.prazoPagamentoDias) != null ? { prazoPagamentoDias: String(lerNumero(v.prazoPagamentoDias)) } : {}),
      ...(v.retencaoPct && lerNumero(v.retencaoPct) != null ? { retencaoPct: String(lerNumero(v.retencaoPct)) } : {}),
      ...((INDICES_DE_REAJUSTE as readonly string[]).includes(v.indiceReajuste) ? { indiceReajuste: v.indiceReajuste } : {}),
    }));
    const propostos = itensDaProposta(v);
    if (propostos.length) setItens(propostos);
    const conf = { ...p.conferir };
    if (v.clienteNoDocumento && !cliente) conf.cliente = `O documento cita "${v.clienteNoDocumento}", que não está na lista de clientes: cadastre em Receitas → Clientes ou escolha outro.`;
    setConferir(conf);
    setObsCris(p.observacao);
    setViaCris(true);
    setMsg({ tom: "aviso", texto: "A Cris preencheu o formulário a partir do documento. Confira cada campo antes de salvar: nada foi gravado." });
  });

  const totalItens = itens.reduce((s, i) => s + totalDoItem(i.quantidade, i.valorUnitario), 0);
  const valor = Number(f.valorOriginal || 0);

  const salvar = () => {
    setMsg(null);
    start(async () => {
      const r = await salvarContrato({
        ...f,
        id: inicial?.id,
        versao: inicial?.versao,
        valorOriginal: f.valorOriginal === "" ? NaN : Number(f.valorOriginal),
        projetos: editando ? undefined : projetos.map((p) => ({ projectId: p.projectId, valorAlocado: p.valorAlocado || null })),
        idempotencyKey: editando ? null : chave,
        origem: viaCris ? "cris" : "manual",
      });
      if (!r.ok) return setMsg({ tom: "erro", texto: r.error });
      const recusados: string[] = [];
      // Contrato que já existia (mesma chave): os itens já foram enviados na primeira vez.
      for (const i of r.aviso ? [] : itens) {
        const ri = await salvarItem({ contratoId: r.id!, codigo: i.codigo, descricao: i.descricao, unidade: i.unidade, quantidade: i.quantidade, valorUnitario: i.valorUnitario, criterioMedicao: i.criterio });
        if (!ri.ok) recusados.push(`${i.codigo}: ${ri.error}`);
      }
      if (recusados.length) {
        setMsg({ tom: "aviso", texto: `Contrato salvo, mas ${recusados.length} item(ns) não entraram: ${recusados.join("; ")}` });
        return;
      }
      router.push(`/contratos/${r.id}`);
      router.refresh();
    });
  };

  const campo = (k: keyof Campos, rotulo: string, extra?: { placeholder?: string; area?: boolean }) => (
    <div className={extra?.area ? "sm:col-span-2" : undefined}>
      <Label>
        {rotulo}
        {conferir[k] && <span className="ml-1 text-[11px] font-normal text-[#b45309]" title={conferir[k]}>⚠ conferir</span>}
      </Label>
      {extra?.area ? (
        <textarea value={(f[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} rows={3} placeholder={extra.placeholder} className="w-full rounded-[10px] border border-[var(--color-accent2)]/20 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-accent3)]" />
      ) : (
        <Input value={(f[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={extra?.placeholder} />
      )}
      {conferir[k] && <p className="mt-0.5 text-[11.5px] text-[#b45309]">{conferir[k]}</p>}
    </div>
  );
  const data = (k: keyof Campos, rotulo: string, travado = false) => (
    <div>
      <Label>
        {rotulo}
        {conferir[k] && <span className="ml-1 text-[11px] font-normal text-[#b45309]">⚠ conferir</span>}
      </Label>
      <DateField value={(f[k] as string) ?? ""} onChange={(v) => set(k, v)} disabled={travado} />
    </div>
  );

  return (
    <div className="space-y-6" data-contrato-form>
      {!editando && (
        <p className="rounded-[10px] border border-[#6D4BD1]/25 bg-[#6D4BD1]/5 px-3 py-2 text-[12.5px] text-[var(--color-ink2)]">
          <strong>Com a Cris:</strong> abra o chat, anexe o contrato em PDF (ou cole o texto) e peça para preencher. Ela propõe cliente, objeto, valor, datas, itens e
          condições; os campos que ela não tiver certeza aparecem com ⚠. Nada é gravado até você clicar em <strong>Salvar contrato</strong>.
        </p>
      )}
      {obsCris && <p className="text-[12.5px] text-[var(--color-ink3)]">Observação da Cris: {obsCris}</p>}

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Identificação</legend>
        {campo("titulo", "Título *")}
        {campo("numeroCliente", "Número do contrato no cliente")}
        <div>
          <Label>
            Cliente contratante{conferir.cliente && <span className="ml-1 text-[11px] font-normal text-[#b45309]">⚠ conferir</span>}
          </Label>
          <Select value={f.clienteId ?? ""} onChange={(e) => set("clienteId", e.target.value)}>
            <option value="">— selecione —</option>
            {opcoes.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
          {conferir.cliente && <p className="mt-0.5 text-[11.5px] text-[#b45309]">{conferir.cliente}</p>}
        </div>
        <div>
          <Label>Modalidade de serviço</Label>
          <Select value={f.modalidadeId ?? ""} onChange={(e) => set("modalidadeId", e.target.value)}>
            <option value="">— selecione —</option>
            {opcoes.modalidades
              .filter((m) => m.ativo || m.id === f.modalidadeId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={f.tipo ?? "contrato"} onChange={(e) => set("tipo", e.target.value)}>
            {TIPOS_CONTRATO.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_CONTRATO[t]}
              </option>
            ))}
          </Select>
        </div>
        {f.tipo !== "contrato" && (
          <>
            <div>
              <Label>Contrato principal *</Label>
              <Select value={f.contratoPrincipalId ?? ""} onChange={(e) => set("contratoPrincipalId", e.target.value)}>
                <option value="">— selecione —</option>
                {opcoes.principais
                  .filter((p) => p.id !== inicial?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} · {p.titulo}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Relação de valor com o principal *</Label>
              <Select value={f.vinculoValor ?? ""} onChange={(e) => set("vinculoValor", e.target.value)}>
                <option value="">— selecione —</option>
                {VINCULOS_VALOR.map((v) => (
                  <option key={v} value={v}>
                    {ROTULO_VINCULO[v]}
                  </option>
                ))}
              </Select>
              <p className="mt-0.5 text-[11.5px] text-[var(--color-ink3)]">
                &quot;Consome o limite&quot; gasta o saldo do principal (não soma no total). &quot;Valor adicional&quot; é contratação nova e soma.
              </p>
            </div>
          </>
        )}
        {campo("objeto", "Objeto contratual", { area: true })}
        {campo("escopo", "Descrição do escopo", { area: true })}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Responsáveis</legend>
        {campo("gestor", "Gestor do contrato")}
        {campo("coordenadorTecnico", "Coordenador técnico")}
        {campo("responsavelComercial", "Responsável comercial")}
        {campo("responsavelFinanceiro", "Responsável financeiro")}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Datas</legend>
        {data("dataAssinatura", "Assinatura")}
        {data("dataInicio", "Início")}
        {data("dataTerminoPrevista", "Término previsto", !podeEditarValor)}
        {data("dataBaseReajuste", "Data-base de reajuste")}
        {editando && data("dataEncerramento", "Encerramento efetivo")}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <legend className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Condições financeiras</legend>
        <div>
          <Label>
            Valor original *{conferir.valorOriginal && <span className="ml-1 text-[11px] font-normal text-[#b45309]">⚠ conferir</span>}
          </Label>
          <MoneyInput value={f.valorOriginal} onChange={(v) => set("valorOriginal", v)} disabled={!podeEditarValor} aria-label="Valor original" />
          {!podeEditarValor && <p className="mt-0.5 text-[11.5px] text-[var(--color-ink3)]">Contrato valendo: valor e prazo mudam por aditivo.</p>}
        </div>
        <div>
          <Label>Índice de reajuste</Label>
          <Select value={f.indiceReajuste ?? ""} onChange={(e) => set("indiceReajuste", e.target.value)}>
            <option value="">— sem reajuste —</option>
            {indicesOferecidosNoContrato(f.indiceReajuste).map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </div>
        {campo("retencaoPct", "Retenção contratual (%)", { placeholder: "ex.: 5" })}
        {campo("formaFaturamento", "Forma de faturamento", { placeholder: "ex.: por medição mensal" })}
        {campo("condicaoPagamento", "Condição de pagamento")}
        {campo("prazoPagamentoDias", "Prazo de pagamento (dias)", { placeholder: "ex.: 30" })}
        {campo("periodicidadeMedicao", "Periodicidade e regras de medição")}
        {campo("moeda", "Moeda")}
        {campo("regrasReembolso", "Regras de reembolso de despesas", { area: true })}
      </fieldset>

      {!editando && (
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Projetos vinculados</legend>
          {projetos.map((p, i) => (
            <div key={i} className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_200px_auto]">
              <Select value={p.projectId} onChange={(e) => setProjetos((l) => l.map((x, j) => (j === i ? { ...x, projectId: e.target.value } : x)))} aria-label="Projeto">
                <option value="">— projeto —</option>
                {opcoes.projetos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </Select>
              <MoneyInput value={p.valorAlocado} onChange={(v) => setProjetos((l) => l.map((x, j) => (j === i ? { ...x, valorAlocado: v } : x)))} placeholder="valor alocado (opcional)" aria-label="Valor alocado" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setProjetos((l) => l.filter((_, j) => j !== i))}>
                Remover
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setProjetos((l) => [...l, { projectId: "", valorAlocado: "" }])}>
            + Projeto
          </Button>
        </fieldset>
      )}

      {!editando && (
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Itens contratuais</legend>
          {itens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-wide text-[var(--color-ink3)]">
                    <th className="py-1 pr-2">Código</th>
                    <th className="py-1 pr-2">Descrição</th>
                    <th className="py-1 pr-2">Unid.</th>
                    <th className="py-1 pr-2 text-right">Qtd.</th>
                    <th className="py-1 pr-2 text-right">Unitário</th>
                    <th className="py-1 pr-2">Critério</th>
                    <th className="py-1 pr-2 text-right">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, i) => {
                    const up = (patch: Partial<ItemProposto>) => setItens((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <tr key={i} className="border-t border-[var(--color-line)]">
                        <td className="py-1 pr-2"><Input className="h-8 w-16" value={it.codigo} onChange={(e) => up({ codigo: e.target.value })} aria-label="Código do item" /></td>
                        <td className="py-1 pr-2"><Input className="h-8 min-w-[200px]" value={it.descricao} onChange={(e) => up({ descricao: e.target.value })} aria-label="Descrição do item" /></td>
                        <td className="py-1 pr-2"><Input className="h-8 w-20" value={it.unidade ?? ""} onChange={(e) => up({ unidade: e.target.value || null })} aria-label="Unidade" /></td>
                        <td className="py-1 pr-2"><Input className="h-8 w-20 text-right" value={String(it.quantidade)} onChange={(e) => up({ quantidade: lerNumero(e.target.value) ?? 0 })} aria-label="Quantidade" /></td>
                        <td className="py-1 pr-2"><MoneyInput className="h-8 w-32" value={String(it.valorUnitario)} onChange={(v) => up({ valorUnitario: Number(v || 0) })} aria-label="Valor unitário" /></td>
                        <td className="py-1 pr-2">
                          <Select className="h-8" value={it.criterio} onChange={(e) => up({ criterio: e.target.value as ItemProposto["criterio"] })} aria-label="Critério">
                            {CRITERIOS_MEDICAO.map((c) => (
                              <option key={c} value={c}>
                                {ROTULO_CRITERIO[c]}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="py-1 pr-2 text-right font-[family-name:var(--font-mono)]">{brl(totalDoItem(it.quantidade, it.valorUnitario))}</td>
                        <td className="py-1"><Button type="button" variant="ghost" size="sm" onClick={() => setItens((l) => l.filter((_, j) => j !== i))}>×</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setItens((l) => [...l, { codigo: String(l.length + 1).padStart(2, "0"), descricao: "", unidade: null, quantidade: 1, valorUnitario: 0, criterio: "percentual" }])}>
              + Item
            </Button>
            {itens.length > 0 && (
              <span className={`text-[12.5px] ${Math.abs(totalItens - valor) > 0.005 ? "text-[#b45309]" : "text-[var(--color-ink3)]"}`}>
                Soma dos itens {brl(totalItens)} {Math.abs(totalItens - valor) > 0.005 ? `· difere do valor do contrato (${brl(valor)})` : "· bate com o valor do contrato"}
              </span>
            )}
          </div>
        </fieldset>
      )}

      <Mensagem msg={msg} />
      <div className="flex gap-2">
        <Button type="button" onClick={salvar} disabled={pendente}>
          {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Salvar contrato"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pendente}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

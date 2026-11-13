"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarRascunhoDeNota } from "@/lib/actions/notas-servico";
import { calcularNfse, validarNfse } from "@/lib/calc/nfse";
import { RETENCOES_DA_NOTA, numeroBR } from "@/lib/nota-servico";
import { brl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

/**
 * Prompt AG, 5.3 — o rascunho da NFS-e. Os campos do emitente vêm do cadastro
 * (Configurações → Empresa) e não se editam aqui. O cálculo ao vivo usa as
 * MESMAS funções que montam a nota (`calc/nfse.ts`). Salvar não envia nada.
 */
export interface ValoresDoFormulario {
  id?: string;
  projectId: string;
  contaReceberId: string;
  /** 0082 */
  contratoId: string;
  contratoMedicaoId: string;
  competencia: string;
  discriminacao: string;
  itemListaServico: string;
  codigoTributarioMunicipio: string;
  valorServicos: string;
  valorDeducoes: string;
  descontoIncondicionado: string;
  descontoCondicionado: string;
  aliquotaIss: string;
  issRetido: boolean;
  retencoes: Record<string, { aliquota: string; base: string }>;
  outrasRetencoes: string;
  tomador: Record<string, string>;
}

const CAMPOS_DO_TOMADOR: { nome: string; rotulo: string; dica?: string; largo?: boolean }[] = [
  { nome: "tomadorCpfCnpj", rotulo: "CPF ou CNPJ *" },
  { nome: "tomadorNome", rotulo: "Nome ou razão social *", largo: true },
  { nome: "tomadorInscricaoMunicipal", rotulo: "Inscrição municipal" },
  { nome: "tomadorEmail", rotulo: "E-mail (recebe a nota)" },
  { nome: "tomadorTelefone", rotulo: "Telefone" },
  { nome: "tomadorLogradouro", rotulo: "Logradouro", largo: true },
  { nome: "tomadorNumero", rotulo: "Número" },
  { nome: "tomadorComplemento", rotulo: "Complemento" },
  { nome: "tomadorBairro", rotulo: "Bairro" },
  { nome: "tomadorCodigoMunicipio", rotulo: "Município (código IBGE)", dica: "7 dígitos" },
  { nome: "tomadorUf", rotulo: "UF" },
  { nome: "tomadorCep", rotulo: "CEP" },
];

export function NotaServicoForm({
  inicial,
  projetos,
  contasReceber,
  contratos,
  medicoes,
  emitente,
}: {
  inicial: ValoresDoFormulario;
  projetos: { id: string; name: string }[];
  contasReceber: { id: string; projectId: string; rotulo: string }[];
  /** 0082 — contratos por projeto e medições aprovadas por contrato (opcional). */
  contratos?: { id: string; projectId: string; rotulo: string }[];
  medicoes?: { id: string; contratoId: string; rotulo: string }[];
  emitente: { razaoSocial: string; cnpj: string; itemListaServico: string; municipio: string };
}) {
  const router = useRouter();
  const [v, setV] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const set = (k: keyof ValoresDoFormulario, x: unknown) => setV((o) => ({ ...o, [k]: x }));

  const calculo = useMemo(() => {
    const retencoes: Record<string, { aliquota: number; base?: number }> = {};
    for (const k of RETENCOES_DA_NOTA) {
      const a = numeroBR(v.retencoes[k]?.aliquota ?? "");
      if (a > 0) retencoes[k] = { aliquota: a, ...(v.retencoes[k]?.base.trim() ? { base: numeroBR(v.retencoes[k].base) } : {}) };
    }
    const e = {
      valorServicos: numeroBR(v.valorServicos),
      valorDeducoes: numeroBR(v.valorDeducoes),
      descontoIncondicionado: numeroBR(v.descontoIncondicionado),
      descontoCondicionado: numeroBR(v.descontoCondicionado),
      aliquotaIss: numeroBR(v.aliquotaIss),
      issRetido: v.issRetido,
      retencoes,
      outrasRetencoes: numeroBR(v.outrasRetencoes),
    };
    const recusa = validarNfse(e);
    return { recusa, r: recusa ? null : calcularNfse(e) };
  }, [v]);

  const contas = contasReceber.filter((c) => c.projectId === v.projectId);

  return (
    <form
      className="space-y-4"
      data-nota-form
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        setErro(null);
        start(async () => {
          const r = await salvarRascunhoDeNota(fd);
          if (!r.ok) setErro(r.error);
          else router.push(`/notasfiscais/${r.id}`);
        });
      }}
    >
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Serviço</h2>
          <p className="text-[12px] text-[var(--color-ink3)]">
            Emitente: {emitente.razaoSocial} · CNPJ {emitente.cnpj || "—"} · {emitente.municipio || "município não cadastrado"}. Os dados do
            emitente vêm de Configurações → Empresa e não se editam aqui.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Projeto / escritório *</Label>
              <Select name="projectId" value={v.projectId} onChange={(e) => (set("projectId", e.target.value), set("contaReceberId", ""))}>
                <option value="">Escolha…</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Competência</Label>
              <Input name="competencia" value={v.competencia} onChange={(e) => set("competencia", e.target.value)} placeholder="MM/AAAA" />
            </div>
            <div>
              <Label>Conta a receber (opcional)</Label>
              <Select name="contaReceberId" value={v.contaReceberId} onChange={(e) => set("contaReceberId", e.target.value)} disabled={!v.projectId}>
                <option value="">Nenhuma — serviço avulso</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.rotulo}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[11px] text-[var(--color-ink3)]">Só referência: a nota não cria nem altera a conta a receber.</p>
            </div>
            <div>
              <Label>Contrato (opcional)</Label>
              <Select name="contratoId" value={v.contratoId} onChange={(e) => (set("contratoId", e.target.value), set("contratoMedicaoId", ""))} disabled={!v.projectId}>
                <option value="">Nenhum</option>
                {(contratos ?? [])
                  .filter((c) => c.projectId === v.projectId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rotulo}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label>Medição aprovada (opcional)</Label>
              <Select name="contratoMedicaoId" value={v.contratoMedicaoId} onChange={(e) => set("contratoMedicaoId", e.target.value)} disabled={!v.contratoId}>
                <option value="">Nenhuma</option>
                {(medicoes ?? [])
                  .filter((m) => m.contratoId === v.contratoId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.rotulo}
                    </option>
                  ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Discriminação do serviço *</Label>
            <textarea
              name="discriminacao"
              value={v.discriminacao}
              onChange={(e) => set("discriminacao", e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-[8px] border border-[var(--color-line)] bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent2)]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Item da LC 116</Label>
              <Input name="itemListaServico" value={v.itemListaServico} onChange={(e) => set("itemListaServico", e.target.value)} placeholder={emitente.itemListaServico ? `do cadastro: ${emitente.itemListaServico}` : ""} />
              <p className="mt-1 text-[11px] text-[var(--color-ink3)]">Vazio = o do cadastro da empresa.</p>
            </div>
            <div>
              <Label>Código de tributação municipal</Label>
              <Input name="codigoTributarioMunicipio" value={v.codigoTributarioMunicipio} onChange={(e) => set("codigoTributarioMunicipio", e.target.value)} />
              <p className="mt-1 text-[11px] text-[var(--color-ink3)]">Vazio = o do cadastro da empresa.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Valores</h2>
          <p className="text-[12px] text-[var(--color-ink3)]">
            Nenhuma retenção é presumida: informe só as que o contrato e a sua contabilidade determinam. O sistema faz a conta; não decide
            o que incide.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["valorServicos", "Valor dos serviços (R$) *"],
                ["valorDeducoes", "Deduções (R$)"],
                ["descontoIncondicionado", "Desconto incondicionado (R$)"],
                ["descontoCondicionado", "Desconto condicionado (R$)"],
                ["aliquotaIss", "Alíquota do ISS (%) *"],
                ["outrasRetencoes", "Outras retenções (R$)"],
              ] as const
            ).map(([k, rotulo]) => (
              <div key={k}>
                <Label>{rotulo}</Label>
                <Input name={k} inputMode="decimal" value={v[k]} onChange={(e) => set(k, e.target.value)} />
              </div>
            ))}
            <label className="flex items-center gap-2 pt-6 text-[13px] text-[var(--color-ink2)]">
              <input type="checkbox" name="issRetido" checked={v.issRetido} onChange={(e) => set("issRetido", e.target.checked)} />
              ISS retido pelo tomador
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {RETENCOES_DA_NOTA.map((k) => (
              <div key={k} className="space-y-1">
                <Label>{k === "ir" ? "IRRF" : k.toUpperCase()} (%)</Label>
                <Input
                  name={`ret_${k}`}
                  inputMode="decimal"
                  value={v.retencoes[k]?.aliquota ?? ""}
                  onChange={(e) => set("retencoes", { ...v.retencoes, [k]: { aliquota: e.target.value, base: v.retencoes[k]?.base ?? "" } })}
                />
                <Input
                  name={`ret_${k}_base`}
                  inputMode="decimal"
                  placeholder="base própria (opcional)"
                  value={v.retencoes[k]?.base ?? ""}
                  onChange={(e) => set("retencoes", { ...v.retencoes, [k]: { aliquota: v.retencoes[k]?.aliquota ?? "", base: e.target.value } })}
                />
              </div>
            ))}
          </div>
          <div className="rounded-[8px] bg-[var(--color-surface2)] px-4 py-3 text-[13px]" data-calculo>
            {calculo.recusa ? (
              <p className="text-[var(--color-ink3)]">{calculo.recusa}</p>
            ) : (
              calculo.r && (
                <div className="grid gap-1 sm:grid-cols-2">
                  <span>Base de cálculo: {brl(calculo.r.baseCalculo)}</span>
                  <span>ISS: {brl(calculo.r.valorIss)}{calculo.r.valorIssRetido ? " (retido)" : ""}</span>
                  <span>Retenções federais: {brl(calculo.r.totalRetencoesFederais)}</span>
                  <span>Total retido: {brl(calculo.r.totalRetencoes)}</span>
                  <span className="font-semibold text-[var(--color-ink)]">Valor líquido a receber: {brl(calculo.r.valorLiquido)}</span>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Tomador</h2>
          <p className="text-[12px] text-[var(--color-ink3)]">Os dados ficam copiados na nota: se o cadastro do cliente mudar depois, a nota emitida não muda.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {CAMPOS_DO_TOMADOR.map((c) => (
              <div key={c.nome} className={c.largo ? "sm:col-span-2" : undefined}>
                <Label>{c.rotulo}</Label>
                <Input name={c.nome} value={v.tomador[c.nome] ?? ""} onChange={(e) => set("tomador", { ...v.tomador, [c.nome]: e.target.value })} placeholder={c.dica} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {erro && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {erro}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar rascunho"}
        </Button>
        <span className="self-center text-[12px] text-[var(--color-ink3)]">Salvar não envia nada à prefeitura.</span>
      </div>
    </form>
  );
}

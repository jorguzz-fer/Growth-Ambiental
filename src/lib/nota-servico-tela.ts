/**
 * Prompt AG — o que a tela de Notas Fiscais monta para o formulário. Puro.
 */
import type { ValoresDoFormulario } from "@/components/app/nota-servico-form";
import { RETENCOES_DA_NOTA } from "@/lib/nota-servico";
import { brl, dateBR } from "@/lib/utils";

type Linha = Record<string, unknown>;
const s = (x: unknown) => (x == null ? "" : String(x));
/** "10000.00" → "10000,00"; "0" → "" (campo vazio, não zero digitado). */
const num = (x: unknown) => {
  const n = Number(x ?? 0);
  return n ? String(n).replace(".", ",") : "";
};

export function valoresIniciais(n: Linha | null, padrao: { projectId?: string; aliquotaIss?: number | null }): ValoresDoFormulario {
  const ret = (n?.retencoes as Record<string, { aliquota: number; base?: number }> | null) ?? {};
  const tomador: Record<string, string> = {};
  for (const k of ["tomadorCpfCnpj", "tomadorNome", "tomadorInscricaoMunicipal", "tomadorEmail", "tomadorTelefone", "tomadorLogradouro", "tomadorNumero", "tomadorComplemento", "tomadorBairro", "tomadorCodigoMunicipio", "tomadorUf", "tomadorCep"])
    tomador[k] = s(n?.[k]);
  return {
    ...(n ? { id: s(n.id) } : {}),
    projectId: n ? s(n.projectId) : (padrao.projectId ?? ""),
    contaReceberId: s(n?.contaReceberId),
    contratoId: s(n?.contratoId),
    contratoMedicaoId: s(n?.contratoMedicaoId),
    competencia: s(n?.competencia),
    discriminacao: s(n?.discriminacao),
    itemListaServico: s(n?.itemListaServico),
    codigoTributarioMunicipio: s(n?.codigoTributarioMunicipio),
    valorServicos: num(n?.valorServicos),
    valorDeducoes: num(n?.valorDeducoes),
    descontoIncondicionado: num(n?.descontoIncondicionado),
    descontoCondicionado: num(n?.descontoCondicionado),
    // Rascunho novo já vem com a alíquota do cadastro; a pessoa confere.
    aliquotaIss: n ? num(n.aliquotaIss) : padrao.aliquotaIss ? String(padrao.aliquotaIss).replace(".", ",") : "",
    issRetido: !!n?.issRetido,
    retencoes: Object.fromEntries(RETENCOES_DA_NOTA.map((k) => [k, { aliquota: ret[k] ? num(ret[k].aliquota) : "", base: ret[k]?.base != null ? num(ret[k].base) : "" }])),
    outrasRetencoes: num(n?.outrasRetencoes),
    tomador,
  };
}

/** Rótulo da conta a receber no seletor — sem expor mais que a tela de Contas a Receber já mostra. */
export function rotuloDaConta(c: { descricao: string | null; unitCode: string | null; vencimento: string | null; valor: number; status: string }): string {
  return [c.unitCode ? `Unid. ${c.unitCode}` : null, c.descricao || "Conta a receber", c.vencimento ? `venc. ${dateBR(c.vencimento)}` : null, brl(c.valor), c.status]
    .filter(Boolean)
    .join(" · ");
}

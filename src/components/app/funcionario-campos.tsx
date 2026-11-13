"use client";

import { Input, Label, Select } from "@/components/ui/input";
import { ESTADOS_CIVIS, TIPOS_CONTA_BANCARIA, TIPOS_CONTRATO, TIPOS_PIX } from "@/lib/funcionario-regras";

import { type ValoresFuncionario } from "@/lib/funcionario-form";

function Secao({ titulo, children, nota }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[10px] border border-[var(--color-line)] p-3">
      <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink3)]">{titulo}</legend>
      {nota && <p className="mb-2 text-[11px] text-[var(--color-ink3)]">{nota}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </fieldset>
  );
}

/**
 * Campos da ficha (Prompt Z, 2.2 — art. 41 da CLT). Os blocos de endereço,
 * contrato (salário/jornada) e banco só aparecem com `podeDados`: quem não
 * tem a permissão nem recebe os valores do servidor (7.2) — não é só ocultar.
 */
export function FuncionarioCampos({ v, onChange, podeDados, projetos }: { v: ValoresFuncionario; onChange: (k: string, val: string) => void; podeDados: boolean; projetos: { id: string; nome: string }[] }) {
  const c = (k: string, label: string, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}, span = "") => (
    <div className={span}>
      <Label>{label}</Label>
      <Input value={v[k] ?? ""} onChange={(e) => onChange(k, e.target.value)} aria-label={label} {...extra} />
    </div>
  );
  const sel = (k: string, label: string, opts: readonly string[], span = "") => (
    <div className={span}>
      <Label>{label}</Label>
      <Select value={v[k] ?? ""} onChange={(e) => onChange(k, e.target.value)} aria-label={label}>
        <option value="">—</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
    </div>
  );
  return (
    <div className="space-y-3">
      <Secao titulo="Identificação">
        {c("nome", "Nome completo *", {}, "col-span-2")}
        {c("nascimento", "Nascimento", { type: "date" })}
        {c("nacionalidade", "Nacionalidade")}
        {sel("estadoCivil", "Estado civil", ESTADOS_CIVIS)}
        {c("nomeMae", "Nome da mãe", {}, "col-span-2 sm:col-span-3")}
      </Secao>
      <Secao titulo="Documentos" nota="Números para a ficha; os arquivos (RG, CTPS, ASO…) são anexados na aba Documentos.">
        {c("cpf", "CPF", { inputMode: "numeric", placeholder: "000.000.000-00" })}
        {c("rg", "RG")}
        {c("rgOrgao", "Órgão emissor")}
        {c("rgUf", "UF", { maxLength: 2 })}
        {c("ctpsNumero", "CTPS nº")}
        {c("ctpsSerie", "CTPS série")}
        {c("pis", "PIS/PASEP")}
        {c("tituloEleitor", "Título de eleitor")}
        {c("reservista", "Reservista (quando aplicável)")}
        {c("cnh", "CNH (se conduzir veículo)")}
        {c("cnhCategoria", "Categoria")}
        {c("cnhValidade", "Validade da CNH", { type: "date" })}
      </Secao>
      {podeDados && (
        <Secao titulo="Endereço residencial" nota="Dado pessoal: só quem tem a permissão de dados do funcionário vê e edita.">
          {c("endereco", "Logradouro", {}, "col-span-2")}
          {c("numero", "Número")}
          {c("complemento", "Complemento")}
          {c("bairro", "Bairro")}
          {c("cidade", "Cidade")}
          {c("estado", "UF", { maxLength: 2 })}
          {c("cep", "CEP")}
        </Secao>
      )}
      <Secao titulo="Contrato" nota="Registro, não folha: o sistema não calcula INSS, FGTS, IRRF, férias nem rescisão. O custo entra em Despesas.">
        {c("admissao", "Admissão", { type: "date" })}
        {c("cargo", "Cargo / função")}
        {c("setor", "Setor")}
        <div>
          <Label>Projeto</Label>
          <Select value={v.projectId ?? ""} onChange={(e) => onChange("projectId", e.target.value)} aria-label="Projeto">
            <option value="">—</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </div>
        {sel("tipoContrato", "Tipo de contrato", TIPOS_CONTRATO)}
        {c("prazoContrato", "Prazo (se determinado)")}
        {podeDados && c("jornada", "Jornada (ex.: 44h semanais)")}
        {podeDados && c("salario", "Salário (R$)", { inputMode: "decimal" })}
      </Secao>
      {podeDados && (
        <Secao titulo="Dados bancários para pagamento">
          {c("bancoNome", "Banco")}
          {c("bancoAgencia", "Agência")}
          {c("bancoConta", "Conta")}
          {sel("bancoTipoConta", "Tipo de conta", TIPOS_CONTA_BANCARIA)}
          {sel("pixTipo", "Tipo de chave PIX", TIPOS_PIX)}
          {c("pixChave", "Chave PIX", {}, "col-span-2 sm:col-span-3")}
        </Secao>
      )}
      <Secao titulo="Observações">{c("obs", "Observação", {}, "col-span-2 sm:col-span-4")}</Secao>
    </div>
  );
}


/**
 * Growth Ambiental — "Valor contratado" do Dashboard (substitui o VGV, que
 * era a soma das unidades imobiliárias). Módulo PURO.
 *
 * É a soma do valor ATUALIZADO (original + aditivos eficazes) dos contratos
 * de serviço ligados aos projetos em tela. Contrato em rascunho ou cancelado
 * não conta. É fato do contrato, não cenário: toda coluna (Atual, Orçamento,
 * Previsão) mostra o mesmo número.
 *
 * Contrato ligado a projetos que estão e que não estão em tela:
 *  - com valor alocado informado nos projetos, entra a soma alocada aos que
 *    estão em tela;
 *  - sem valor alocado, entra a parte proporcional ao número de projetos
 *    (divisão igual) — o cadastro não diz outra coisa.
 * Contrato sem projeto nenhum não tem como ser atribuído e fica fora.
 */
export interface ContratoParaValor {
  status: string;
  saldo: { atualizado: number };
  projetos: readonly { id: string; valorAlocado: number | null }[];
}

export const STATUS_FORA_DO_CONTRATADO = new Set(["rascunho", "cancelado"]);

const cents = (n: number) => Math.round(n * 100);

/**
 * Parte do contrato que pertence aos projetos em tela (0 a 1), pela regra
 * acima. 0 = o contrato não entra (status fora, ou nenhum projeto em tela).
 */
export function fatorDoContrato(c: ContratoParaValor, idsEmTela: ReadonlySet<string>): number {
  if (STATUS_FORA_DO_CONTRATADO.has(c.status)) return 0;
  const ligados = c.projetos;
  const emTela = ligados.filter((p) => idsEmTela.has(p.id));
  if (!emTela.length) return 0;
  if (emTela.length === ligados.length) return 1;
  if (ligados.some((p) => p.valorAlocado != null)) {
    const at = c.saldo.atualizado;
    return at > 0 ? Math.min(1, emTela.reduce((s, p) => s + (p.valorAlocado ?? 0), 0) / at) : 0;
  }
  return emTela.length / ligados.length;
}

export function valorContratadoDosProjetos(contratos: readonly ContratoParaValor[], idsEmTela: ReadonlySet<string>): number {
  let total = 0;
  for (const c of contratos) {
    if (STATUS_FORA_DO_CONTRATADO.has(c.status)) continue;
    const ligados = c.projetos;
    const emTela = ligados.filter((p) => idsEmTela.has(p.id));
    if (!emTela.length) continue;
    if (emTela.length === ligados.length) {
      total += cents(c.saldo.atualizado);
      continue;
    }
    const alocados = ligados.some((p) => p.valorAlocado != null);
    total += alocados
      ? emTela.reduce((s, p) => s + cents(p.valorAlocado ?? 0), 0)
      : Math.round((cents(c.saldo.atualizado) * emTela.length) / ligados.length);
  }
  return total / 100;
}

/** Os números de serviço do Resumo: contratos dos projetos em tela, pela mesma regra. */
export interface ContratoParaResumo extends ContratoParaValor {
  saldo: ContratoParaValor["saldo"] & {
    medidoAprovado: number;
    faturado: number;
    recebido: number;
    saldoAMedir: number;
    medidoNaoFaturado: number;
    faturadoNaoRecebido: number;
  };
}

export interface ResumoDosContratos {
  contratos: number;
  contratado: number;
  medido: number;
  faturado: number;
  recebido: number;
  aMedir: number;
  medidoNaoFaturado: number;
  aReceber: number;
}

export function resumoDosContratos(contratos: readonly ContratoParaResumo[], idsEmTela: ReadonlySet<string>): ResumoDosContratos {
  const r = { contratos: 0, contratado: 0, medido: 0, faturado: 0, recebido: 0, aMedir: 0, medidoNaoFaturado: 0, aReceber: 0 };
  for (const c of contratos) {
    const f = fatorDoContrato(c, idsEmTela);
    if (f <= 0) continue;
    const s = c.saldo;
    r.contratos += 1;
    r.medido += cents(s.medidoAprovado * f);
    r.faturado += cents(s.faturado * f);
    r.recebido += cents(s.recebido * f);
    r.aMedir += cents(s.saldoAMedir * f);
    r.medidoNaoFaturado += cents(s.medidoNaoFaturado * f);
    r.aReceber += cents(s.faturadoNaoRecebido * f);
  }
  return {
    contratos: r.contratos,
    contratado: valorContratadoDosProjetos(contratos, idsEmTela),
    medido: r.medido / 100,
    faturado: r.faturado / 100,
    recebido: r.recebido / 100,
    aMedir: r.aMedir / 100,
    medidoNaoFaturado: r.medidoNaoFaturado / 100,
    aReceber: r.aReceber / 100,
  };
}

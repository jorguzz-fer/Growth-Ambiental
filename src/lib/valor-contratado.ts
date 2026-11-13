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

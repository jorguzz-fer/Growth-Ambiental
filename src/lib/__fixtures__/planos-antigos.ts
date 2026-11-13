/**
 * Recortes dos planos de contas ANTERIORES (só para teste da conversão). Não é
 * plano padrão de nada: reproduz o que empresas criadas antes do plano de
 * consultoria ambiental têm gravado no banco — o plano de obra herdado e o
 * plano ambiental v1 (códigos "1.1", "A.1", "F.6"…).
 */
export interface LinhaAntiga {
  code: string;
  name: string;
  groupCode: string;
  groupName: string;
  kind: "cef" | "complementar";
  natureza?: "receita" | "despesa";
}

const g = (groupCode: string, groupName: string, kind: "cef" | "complementar", contas: [string, string][], natureza: "receita" | "despesa" = "despesa"): LinhaAntiga[] =>
  contas.map(([code, name]) => ({ code, name, groupCode, groupName, kind, natureza }));

/** Plano de obra (construção/incorporação) — recorte. */
export const PLANO_OBRA_ANTIGO: LinhaAntiga[] = [
  ...g("1", "Serviços Preliminares Gerais", "cef", [["1.1", "Serviços técnicos (projetos, sondagem, licenças)"], ["1.2", "Instalações e canteiros"]]),
  ...g("2", "Fundações e Contenções", "cef", [["2.1", "Fundações"], ["2.2", "Contenções/arrimos especiais"]]),
  ...g("3", "Supraestrutura", "cef", [["3.1", "Estrutura de concreto"]]),
  ...g("7", "Pavimentação", "cef", [["7.1", "Cerâmica"]]),
  ...g("P", "Pós-obra", "complementar", [["P.1", "Habite-se/AVCB"]]),
  ...g("A", "Administrativo / Escritório", "complementar", [["A.1", "Aluguel escritório"], ["A.3", "Telefonia"]]),
  ...g("F", "Financeiro / Contábil", "complementar", [["F.2", "Tarifas bancárias"], ["F.6", "Despesas financeiras — juros e multas de mora"], ["F.7", "Receitas financeiras — descontos obtidos"]]),
];

/** Plano ambiental anterior (v1) — recorte. */
export const PLANO_AMBIENTAL_V1: LinhaAntiga[] = [
  ...g("1", "Serviços técnicos de terceiros", "cef", [["1.1", "Consultores e especialistas terceirizados (PJ)"], ["1.2", "Análises laboratoriais (água, solo, ar, efluentes)"]]),
  ...g("2", "Campo e logística", "cef", [["2.2", "Hospedagem e alimentação em campo"]]),
  ...g("R", "Receitas de serviços", "complementar", [["R.2", "Estudos ambientais (EIA/RIMA, RCA/PCA, RAS)"]], "receita"),
  ...g("A", "Administrativo / Escritório", "complementar", [["A.1", "Aluguel escritório"]]),
];

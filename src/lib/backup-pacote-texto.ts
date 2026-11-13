/**
 * Prompt AO, Partes 2.3, 3.4, 5.2 e 5.3 — o manifesto e o `_leia-me.txt` do
 * pacote completo. Módulo PURO (sem banco, sem rede): recebe o que foi lido e
 * devolve texto. O leia-me diz o que entrou, o que ficou fora e por quê.
 */
import type { PgColumn } from "drizzle-orm/pg-core";
import type { SemesterInfo } from "@/lib/semester";
import { FORA_DO_PACOTE } from "@/lib/backup-catalogo";

/** Uma linha como vai para o arquivo: nome da coluna no banco → valor. */
export type Linha = Record<string, unknown>;

/** Formato do pacote — muda se a estrutura do manifesto mudar. */
export const FORMATO_DO_PACOTE = "growth-backup/1";

/** Limites do semestre nas chaves de data do SQL ("YYYYMMDD" e "YYYYMM"). */
export function limitesDoSemestre(info: Pick<SemesterInfo, "year" | "half">) {
  const m0 = info.half === 1 ? 1 : 7;
  const p = (m: number) => String(m).padStart(2, "0");
  return {
    diaInicio: `${info.year}${p(m0)}01`,
    diaFim: `${info.year}${p(m0 + 5)}31`,
    mesInicio: `${info.year}${p(m0)}`,
    mesFim: `${info.year}${p(m0 + 5)}`,
  };
}

/**
 * A linha do Drizzle (chaves em camelCase) com o NOME DA COLUNA do banco —
 * `tenant_id`, `version_id`… são o que permite recompor vínculo (3.2). As
 * colunas em `omitir` não saem. Data vira texto ISO.
 */
export function linhaParaArquivo(bruta: Record<string, unknown>, cols: Record<string, Pick<PgColumn, "name">>, omitir: readonly string[]): Linha {
  const out: Linha = {};
  for (const [k, c] of Object.entries(cols)) {
    if (omitir.includes(k)) continue;
    const v = bruta[k];
    out[c.name] = v instanceof Date ? v.toISOString() : v === undefined ? null : v;
  }
  return out;
}

const ESCALA = 8;

/** Soma exata de valores decimais em texto (numeric do Postgres), sem erro de ponto flutuante. */
export function somaDecimal(valores: readonly unknown[]): string {
  let total = 0n;
  for (const v of valores) {
    if (v === null || v === undefined || v === "") continue;
    const s = String(v).trim();
    const m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!m) continue;
    const frac = (m[3] ?? "").slice(0, ESCALA).padEnd(ESCALA, "0");
    const n = BigInt(m[2] + frac);
    total += m[1] ? -n : n;
  }
  const neg = total < 0n;
  const abs = (neg ? -total : total).toString().padStart(ESCALA + 1, "0");
  const inteiro = abs.slice(0, -ESCALA);
  const decimal = abs.slice(-ESCALA).replace(/0+$/, "");
  return `${neg ? "-" : ""}${inteiro}${decimal ? `.${decimal}` : ""}`;
}

/** 3.4 — a soma de controle de cada coluna numérica. */
export function somasDeControle(linhas: readonly Linha[], colunasNumericas: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of colunasNumericas) out[c] = somaDecimal(linhas.map((l) => l[c]));
  return out;
}

export interface TabelaParaTexto {
  tabela: string;
  familia: string;
  camada: "cadastro" | "movimento";
  recorte: string;
  linhas: number;
  semData: number;
  colunasOmitidas: string[];
  motivoOmissao?: string;
  somas: Record<string, string>;
  erro?: string;
}

export interface ResumoDoPacote {
  empresa: string;
  semestre: string;
  rotulo: string;
  geradoEm: Date;
  capturadoEm: Date;
  corte: { inicio: Date; fim: Date };
  tabelas: TabelaParaTexto[];
  referenciasFora: { tabela: string; coluna: string; aponta: string; quantas: number }[];
  sequencias: { entidade: string; prefixo: string; usaPrefixo: boolean; digitos: number; proximo: number }[];
  documentos: { noPeriodo: number; incluidos: number; falhos: string[]; asoOmitidos: number; semStorage: boolean };
  planilha: string;
}

/** 3.4 — o manifesto: uma entrada por tabela, com linhas, recorte e somas. */
export function montarManifesto(r: ResumoDoPacote) {
  return {
    formato: FORMATO_DO_PACOTE,
    empresa: r.empresa,
    semestre: r.semestre,
    geradoEm: r.geradoEm.toISOString(),
    cadastroCapturadoEm: r.capturadoEm.toISOString(),
    movimento: { de: r.corte.inicio.toISOString(), ate: r.corte.fim.toISOString() },
    restaura: false,
    tabelas: r.tabelas.map((t) => ({
      tabela: t.tabela,
      arquivo: `dados/${t.tabela}.json`,
      familia: t.familia,
      camada: t.camada,
      recorte: t.recorte,
      linhas: t.linhas,
      semDataReconhecivel: t.semData,
      colunasOmitidas: t.colunasOmitidas,
      somasDeControle: t.somas,
      ...(t.erro ? { erro: t.erro } : {}),
    })),
    documentos: r.documentos,
    referenciasForaDoRecorte: r.referenciasFora,
    numeracao: r.sequencias,
    foraDoPacote: FORA_DO_PACOTE,
  };
}

const quando = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const dia = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** O `_leia-me.txt` do pacote completo. */
export function montarLeiaMe(r: ResumoDoPacote): string {
  const L: string[] = [];
  const total = r.tabelas.reduce((s, t) => s + t.linhas, 0);
  L.push(`Backup de dados — ${r.empresa}`);
  L.push(`Semestre: ${r.rotulo}`);
  L.push(`Gerado em: ${quando(r.geradoEm)}`);
  L.push("");
  L.push("DUAS DATAS DIFERENTES");
  L.push(`- Movimento (despesas, caixa, recebimentos…): de ${dia(r.corte.inicio)} a ${dia(r.corte.fim)}.`);
  L.push(`- Cadastro (projetos, unidades, clientes, fornecedores, contas…): inteiro, como estava em ${quando(r.capturadoEm)}.`);
  L.push("  Cadastro não tem competência: vem inteiro para que todo lançamento encontre o registro a que aponta.");
  L.push("");
  L.push("O QUE TEM AQUI");
  L.push(`- ${r.planilha}: a mesma planilha de sempre (Despesas, Contas a Receber, Caixa), para abrir no Excel.`);
  L.push(`- dados/<tabela>.json: ${r.tabelas.length} tabelas, ${total} linhas, com TODAS as colunas e chaves (id, tenant_id, version_id…).`);
  L.push(`- documentos/: ${r.documentos.incluidos} de ${r.documentos.noPeriodo} arquivo(s) salvos no semestre.`);
  L.push("- _manifesto.json: linhas, recorte e soma de controle de cada tabela — para conferir o pacote sem abrir arquivo por arquivo.");
  L.push("");
  const familias = [...new Set(r.tabelas.map((t) => t.familia))];
  for (const f of familias) {
    L.push(`${f}:`);
    for (const t of r.tabelas.filter((x) => x.familia === f))
      L.push(`  - ${t.tabela}: ${t.linhas} linha(s) · ${t.recorte}${t.erro ? " · CONSULTA FALHOU" : ""}`);
  }
  const semData = r.tabelas.filter((t) => t.semData > 0);
  if (semData.length) {
    L.push("");
    L.push("LINHAS SEM DATA RECONHECÍVEL");
    L.push("Não cairiam em semestre nenhum; por isso entram em TODO pacote:");
    for (const t of semData) L.push(`  - ${t.tabela}: ${t.semData}`);
  }
  const falhas = r.tabelas.filter((t) => t.erro);
  if (falhas.length || r.documentos.falhos.length || r.documentos.semStorage) {
    L.push("");
    L.push("O QUE FALHOU (o pacote saiu incompleto)");
    for (const t of falhas) L.push(`  - tabela ${t.tabela}: ${t.erro}`);
    if (r.documentos.falhos.length) L.push(`  - documentos não baixados: ${r.documentos.falhos.join(", ")}`);
    if (r.documentos.semStorage) L.push("  - storage (R2) não configurado: documentos não incluídos.");
  }
  if (r.referenciasFora.length) {
    L.push("");
    L.push("REFERÊNCIAS PARA FORA DO RECORTE");
    L.push("Lançamentos deste semestre que apontam para movimento de outro semestre (ex.: despesa de junho paga em agosto).");
    L.push("O registro apontado NÃO está neste pacote — está no pacote do semestre dele:");
    for (const x of r.referenciasFora) L.push(`  - ${x.tabela}.${x.coluna} → ${x.aponta}: ${x.quantas}`);
  }
  L.push("");
  L.push("O QUE NÃO ESTÁ NESTE PACOTE, E POR QUÊ");
  for (const f of FORA_DO_PACOTE) L.push(`  - ${f.tabela} (${f.grupo}): ${f.motivo}`);
  for (const t of r.tabelas.filter((x) => x.colunasOmitidas.length))
    L.push(`  - colunas de ${t.tabela}: ${t.colunasOmitidas.join(", ")} — ${t.motivoOmissao ?? "omitidas"}`);
  if (r.documentos.asoOmitidos) L.push(`  - ${r.documentos.asoOmitidos} documento(s) de ASO (exame de saúde do funcionário) — dado de saúde, fora (BAO-2)`);
  if (r.sequencias.length) {
    L.push("");
    L.push("NUMERAÇÃO (para não reemitir número já usado)");
    for (const s of r.sequencias)
      L.push(`  - ${s.entidade}: prefixo "${s.prefixo}"${s.usaPrefixo ? "" : " (desligado)"}, ${s.digitos} dígitos, próximo número ${s.proximo}`);
  }
  L.push("");
  L.push("DADO PESSOAL — LGPD");
  L.push("Este pacote contém dados pessoais: nome, CPF/CNPJ, endereço, telefone e e-mail de clientes,");
  L.push("fornecedores, funcionários e dependentes, além dos documentos anexados.");
  L.push("A guarda deste arquivo é responsabilidade de quem o baixou: mantenha em local protegido,");
  L.push("não compartilhe por canais abertos e apague as cópias que não forem mais necessárias.");
  L.push("Ficaram FORA os dados sensíveis listados acima (renda, FGTS, score, restrições, estado civil e");
  L.push("inteligência de mercado do cliente; endereço, salário e banco do funcionário; ASO).");
  L.push("");
  L.push("RESTAURAÇÃO");
  L.push("Este pacote não restaura nada sozinho. O formato permite reconstruir os dados, mas a");
  L.push("restauração não existe no sistema. O backup do banco e do storage é outro, da infraestrutura.");
  L.push("");
  L.push("Observação: este backup é apenas uma cópia. Nenhum dado foi removido do sistema.");
  return L.join("\n");
}

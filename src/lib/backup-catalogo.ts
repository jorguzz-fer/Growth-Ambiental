/**
 * Prompt AO, Partes 1, 2 e 5 — o que entra no pacote completo de backup.
 *
 * Decisões do dono (26/10/2026):
 * - BAO-1: entram TODAS as tabelas de lançamento (as 35 da proposta e as que
 *   nasceram depois: funcionários, equipes, cartões, notas emitidas…). Ficam
 *   fora, com o motivo escrito, autenticação, acesso, chaves de mudança e uso
 *   de IA. O log de auditoria ENTRA (os dados pessoais dele já são mascarados).
 * - BAO-2: campo sensível fica FORA (BM-3 do cliente; endereço, salário e banco
 *   do funcionário; documento de ASO), e a omissão é declarada no leia-me.
 *
 * Módulo sem acesso a banco: só a lista e as regras. Quem lê é `backup-dados.ts`.
 * Toda tabela nova do schema precisa ser decidida aqui — um teste falha se
 * alguma ficar sem decisão (regra global 2: nada é omitido por esquecimento).
 */
import type { PgTable } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/schema";
import { CAMPOS_SENSIVEIS_CLIENTE } from "@/lib/clientes-sensivel";
import { CAMPOS_SENSIVEIS_FUNCIONARIO } from "@/lib/funcionario-regras";

/** Como a tabela é recortada pelo semestre (Parte 2). */
export type Recorte =
  /** cadastro: vem inteiro, na data de geração. */
  | { tipo: "cadastro" }
  /** data "MM/DD/YYYY" (a primeira coluna válida da lista vale). */
  | { tipo: "data"; colunas: readonly string[] }
  /** competência "MM/YYYY". */
  | { tipo: "competencia"; coluna: string }
  /** instante (timestamp). */
  | { tipo: "instante"; coluna: string }
  /** segue o registro pai: entra se o pai entrou. */
  | { tipo: "pai"; coluna: string; pai: string };

export type Familia = "Estrutura" | "Receita" | "Despesa" | "Caixa e cartões" | "Operação" | "Pessoas" | "Fiscal" | "Registro";

export interface TabelaDoPacote {
  /** nome da tabela no banco — também o nome do arquivo `dados/<tabela>.json`. */
  tabela: string;
  /** chave do objeto no schema (Drizzle). */
  chave: keyof typeof schema;
  familia: Familia;
  recorte: Recorte;
  /** colunas (chaves do Drizzle) que NÃO saem — decisão BAO-2. */
  omitir?: readonly string[];
  /** por que as colunas acima ficaram fora. */
  motivoOmissao?: string;
  /** só `document`: as linhas de ASO (dado de saúde) ficam fora, com o arquivo. */
  semAso?: boolean;
}

const BM3 = "dado sensível do cliente (BM-3, Prompt M) — fora até nova decisão (BAO-2)";
const FUNC = "endereço, salário, jornada e dados bancários do funcionário (Prompt Z) — fora (BAO-2)";

export const TABELAS_DO_PACOTE: readonly TabelaDoPacote[] = [
  // ── Estrutura ─────────────────────────────────────────────────────────────
  { tabela: "tenant", chave: "tenants", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  { tabela: "project", chave: "projects", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  { tabela: "version", chave: "versions", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  // 0079 — grupos e subgrupos do Plano de Contas (nós sintéticos da hierarquia).
  { tabela: "chart_group", chave: "chartGroups", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  { tabela: "chart_account", chave: "chartAccounts", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  { tabela: "budget_line", chave: "budgetLines", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  { tabela: "budget_account", chave: "budgetAccounts", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  { tabela: "budget_selecao", chave: "budgetSelecoes", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  { tabela: "incc_rate", chave: "inccRates", familia: "Estrutura", recorte: { tipo: "cadastro" } },
  // ── Receita ───────────────────────────────────────────────────────────────
  // `unit` inteira: o plano de pagamento (payment_plan) é de onde a receita é calculada (2.4).
  { tabela: "unit", chave: "units", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "cliente", chave: "clientes", familia: "Receita", recorte: { tipo: "cadastro" }, omitir: CAMPOS_SENSIVEIS_CLIENTE, motivoOmissao: BM3 },
  { tabela: "permuta", chave: "permutas", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "reembolso", chave: "reembolsos", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "conta_receber", chave: "contasReceber", familia: "Receita", recorte: { tipo: "data", colunas: ["vencimento", "dataRecebimento"] } },
  { tabela: "conta_receber_recebimento", chave: "contaReceberRecebimentos", familia: "Receita", recorte: { tipo: "data", colunas: ["data"] } },
  // Prompt AT §5 — recebimento da parcela do comprador, conciliado com a entrada do extrato.
  { tabela: "recebimento_parcela", chave: "recebimentosParcela", familia: "Receita", recorte: { tipo: "data", colunas: ["data"] } },
  { tabela: "recebimento_terceiro", chave: "recebimentosTerceiros", familia: "Receita", recorte: { tipo: "data", colunas: ["dataRecebimento"] } },
  { tabela: "repasse", chave: "repasses", familia: "Receita", recorte: { tipo: "data", colunas: ["dataRepasse"] } },
  // ── Despesa ───────────────────────────────────────────────────────────────
  { tabela: "stakeholder", chave: "stakeholders", familia: "Despesa", recorte: { tipo: "cadastro" } },
  { tabela: "despesa", chave: "despesas", familia: "Despesa", recorte: { tipo: "competencia", coluna: "competencia" } },
  { tabela: "despesa_parcela", chave: "despesaParcelas", familia: "Despesa", recorte: { tipo: "pai", coluna: "despesaId", pai: "despesa" } },
  { tabela: "pagamento", chave: "pagamentos", familia: "Despesa", recorte: { tipo: "data", colunas: ["dataPagamento"] } },
  { tabela: "despesa_terceiro", chave: "despesaTerceiros", familia: "Despesa", recorte: { tipo: "data", colunas: ["dataPagamentoOriginal"] } },
  { tabela: "restituicao", chave: "restituicoes", familia: "Despesa", recorte: { tipo: "data", colunas: ["dataRestituicao"] } },
  { tabela: "restituicao_item", chave: "restituicaoItens", familia: "Despesa", recorte: { tipo: "pai", coluna: "restituicaoId", pai: "restituicao" } },
  { tabela: "compensacao", chave: "compensacoes", familia: "Despesa", recorte: { tipo: "data", colunas: ["data"] } },
  { tabela: "acerto", chave: "acertos", familia: "Despesa", recorte: { tipo: "data", colunas: ["dataPagamento"] } },
  { tabela: "acerto_item", chave: "acertoItens", familia: "Despesa", recorte: { tipo: "pai", coluna: "acertoId", pai: "acerto" } },
  { tabela: "rateio_obra", chave: "rateiosObra", familia: "Despesa", recorte: { tipo: "instante", coluna: "createdAt" } },
  // ── Caixa e cartões ───────────────────────────────────────────────────────
  { tabela: "bank_account", chave: "bankAccounts", familia: "Caixa e cartões", recorte: { tipo: "cadastro" } },
  { tabela: "cash_entry", chave: "cashEntries", familia: "Caixa e cartões", recorte: { tipo: "data", colunas: ["data"] } },
  { tabela: "conciliacao_despesa", chave: "conciliacoesDespesa", familia: "Caixa e cartões", recorte: { tipo: "instante", coluna: "criadoEm" } },
  { tabela: "daily_closing", chave: "dailyClosings", familia: "Caixa e cartões", recorte: { tipo: "data", colunas: ["dia"] } },
  { tabela: "carry_over", chave: "carryOvers", familia: "Caixa e cartões", recorte: { tipo: "data", colunas: ["fromDia"] } },
  { tabela: "cartao_credito", chave: "cartoesCredito", familia: "Caixa e cartões", recorte: { tipo: "cadastro" } },
  { tabela: "fatura_cartao", chave: "faturasCartao", familia: "Caixa e cartões", recorte: { tipo: "data", colunas: ["vencimento"] } },
  { tabela: "fatura_pagamento", chave: "faturaPagamentos", familia: "Caixa e cartões", recorte: { tipo: "data", colunas: ["data"] } },
  { tabela: "extrato_cartao", chave: "extratoCartao", familia: "Caixa e cartões", recorte: { tipo: "data", colunas: ["data"] } },
  { tabela: "estorno_cartao", chave: "estornosCartao", familia: "Caixa e cartões", recorte: { tipo: "data", colunas: ["data"] } },
  // ── Operação ──────────────────────────────────────────────────────────────
  { tabela: "medicao", chave: "medicoes", familia: "Operação", recorte: { tipo: "competencia", coluna: "competencia" } },
  // Contratos e Aditivos (0077): o contrato e tudo que é dele vêm inteiros (são o
  // cadastro que dá sentido às faturas e medições); a medição, pela competência.
  { tabela: "contrato_modalidade", chave: "contratoModalidades", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "contrato", chave: "contratos", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "contrato_projeto", chave: "contratoProjetos", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "contrato_item", chave: "contratoItens", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "contrato_aditivo", chave: "contratoAditivos", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "contrato_aditivo_item", chave: "contratoAditivoItens", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "contrato_marco", chave: "contratoMarcos", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "contrato_medicao", chave: "contratoMedicoes", familia: "Receita", recorte: { tipo: "competencia", coluna: "competencia" } },
  { tabela: "contrato_reembolso", chave: "contratoReembolsos", familia: "Receita", recorte: { tipo: "cadastro" } },
  { tabela: "servico", chave: "servicos", familia: "Operação", recorte: { tipo: "cadastro" } },
  { tabela: "medicao_servico", chave: "medicaoServicos", familia: "Operação", recorte: { tipo: "competencia", coluna: "competencia" } },
  { tabela: "stock_item", chave: "stockItems", familia: "Operação", recorte: { tipo: "cadastro" } },
  { tabela: "stock_movement", chave: "stockMovements", familia: "Operação", recorte: { tipo: "data", colunas: ["data"] } },
  { tabela: "time_entry", chave: "timeEntries", familia: "Operação", recorte: { tipo: "data", colunas: ["data"] } },
  { tabela: "document", chave: "documents", familia: "Operação", recorte: { tipo: "instante", coluna: "uploadedAt" }, semAso: true },
  // ── Pessoas ───────────────────────────────────────────────────────────────
  { tabela: "funcionario", chave: "funcionarios", familia: "Pessoas", recorte: { tipo: "cadastro" }, omitir: CAMPOS_SENSIVEIS_FUNCIONARIO, motivoOmissao: FUNC },
  { tabela: "funcionario_dependente", chave: "funcionarioDependentes", familia: "Pessoas", recorte: { tipo: "cadastro" } },
  { tabela: "funcao_equipe", chave: "funcoesEquipe", familia: "Pessoas", recorte: { tipo: "cadastro" } },
  { tabela: "equipe_projeto", chave: "equipesProjeto", familia: "Pessoas", recorte: { tipo: "cadastro" } },
  { tabela: "equipe_dia", chave: "equipeDias", familia: "Pessoas", recorte: { tipo: "data", colunas: ["data"] } },
  { tabela: "diaria", chave: "diarias", familia: "Pessoas", recorte: { tipo: "pai", coluna: "equipeDiaId", pai: "equipe_dia" } },
  { tabela: "folha_competencia", chave: "folhasCompetencia", familia: "Pessoas", recorte: { tipo: "competencia", coluna: "competencia" } },
  { tabela: "aso_acesso", chave: "asoAcessos", familia: "Pessoas", recorte: { tipo: "instante", coluna: "acessadoEm" } },
  // Planejamento de projetos (0078): modelos da empresa e plano de cada projeto vêm inteiros (cadastro).
  { tabela: "plano_modelo", chave: "planoModelos", familia: "Operação", recorte: { tipo: "cadastro" } },
  { tabela: "plano_modelo_fase", chave: "planoModeloFases", familia: "Operação", recorte: { tipo: "cadastro" } },
  { tabela: "plano_modelo_atividade", chave: "planoModeloAtividades", familia: "Operação", recorte: { tipo: "cadastro" } },
  { tabela: "projeto_fase", chave: "projetoFases", familia: "Operação", recorte: { tipo: "cadastro" } },
  { tabela: "projeto_atividade", chave: "projetoAtividades", familia: "Operação", recorte: { tipo: "cadastro" } },
  { tabela: "projeto_entrega", chave: "projetoEntregas", familia: "Operação", recorte: { tipo: "cadastro" } },
  { tabela: "projeto_plano_importacao", chave: "projetoPlanoImportacoes", familia: "Operação", recorte: { tipo: "cadastro" } },
  // ── Fiscal ────────────────────────────────────────────────────────────────
  { tabela: "documento_fiscal", chave: "documentosFiscais", familia: "Fiscal", recorte: { tipo: "data", colunas: ["dataEmissao"] } },
  { tabela: "nota_servico", chave: "notasServico", familia: "Fiscal", recorte: { tipo: "instante", coluna: "createdAt" } },
  { tabela: "nota_servico_evento", chave: "notaServicoEventos", familia: "Fiscal", recorte: { tipo: "pai", coluna: "notaId", pai: "nota_servico" } },
  // ── Registro ──────────────────────────────────────────────────────────────
  // BAO-1: o log entra. O `meta` já sai mascarado desde o BAK-2 (Prompt AK).
  { tabela: "audit_log", chave: "auditLog", familia: "Registro", recorte: { tipo: "instante", coluna: "createdAt" } },
];

/** O que fica fora, com o motivo — vai escrito no `_leia-me.txt` (1.3). */
export const FORA_DO_PACOTE: readonly { tabela: string; grupo: string; motivo: string }[] = [
  { tabela: "user", grupo: "Autenticação", motivo: "credencial, não lançamento — senha e MFA nunca saem do sistema" },
  { tabela: "account", grupo: "Autenticação", motivo: "credencial de login" },
  { tabela: "session", grupo: "Autenticação", motivo: "sessão de login" },
  { tabela: "verificationToken", grupo: "Autenticação", motivo: "token de verificação de login" },
  { tabela: "membership", grupo: "Acesso", motivo: "configuração de permissão, não lançamento" },
  { tabela: "number_sequence", grupo: "Sequência", motivo: "estado do contador de PED — vai como informação neste leia-me (prefixo, próximo número, dígitos)" },
  { tabela: "tenant_flag", grupo: "Configuração", motivo: "chaves de mudança ligadas ou desligadas — configuração, não lançamento" },
  { tabela: "ia_uso", grupo: "Consumo", motivo: "registro de uso do assistente de IA — consumo, não lançamento" },
  { tabela: "backup_pacote", grupo: "Backup", motivo: "registro dos próprios pacotes gerados — não é lançamento" },
  { tabela: "openfinance_item", grupo: "Open Finance", motivo: "conexão com o banco pela Pluggy — configuração, não lançamento; os movimentos que ela trouxe vão em cash_entry e extrato_cartao" },
  { tabela: "openfinance_conta", grupo: "Open Finance", motivo: "associação das contas do banco conectado — configuração, não lançamento" },
  { tabela: "openfinance_evento", grupo: "Open Finance", motivo: "avisos técnicos recebidos da Pluggy — registro de integração, não lançamento" },
  { tabela: "openfinance_possivel_duplicado", grupo: "Open Finance", motivo: "fila de transações do banco aguardando decisão — ainda não é lançamento" },
];

export const ehMovimento = (t: TabelaDoPacote) => t.recorte.tipo !== "cadastro";

export function tabelaDoPacote(nome: string): TabelaDoPacote | undefined {
  return TABELAS_DO_PACOTE.find((t) => t.tabela === nome);
}

/** O objeto do Drizzle da tabela. */
export function tabelaDrizzle(t: TabelaDoPacote): PgTable {
  return schema[t.chave] as unknown as PgTable;
}

/** O recorte em palavras, para o manifesto e o leia-me. */
export function descreverRecorte(r: Recorte): string {
  switch (r.tipo) {
    case "cadastro":
      return "cadastro inteiro, na data de geração";
    case "data":
      return `pela data (${r.colunas.join(", senão ")})`;
    case "competencia":
      return `pela competência (${r.coluna})`;
    case "instante":
      return `pelo instante (${r.coluna})`;
    case "pai":
      return `acompanha ${r.pai} (${r.coluna})`;
  }
}

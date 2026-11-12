"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getProjectContext, getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { isR2Configured, putObject } from "@/lib/storage/r2";
import { logAudit } from "@/lib/audit";
import { confirmacaoConfere } from "@/lib/clientes-regras";
import { diffAudit, houveMudanca } from "@/lib/audit-diff";
import {
  bloqueiosDeExclusaoDespesa,
  coreDaReplica,
  recusaDeEdicao,
  recusaDeParcelas,
  recusaDeStatusDespesa,
  recusaDeStatusParcela,
  recusaDeValor,
} from "@/lib/despesa-regras";
import { inventarioDaDespesa, movimentosConciliados, vinculosDaDespesa, type InventarioDaDespesa } from "@/lib/despesa-vinculos";
import { principalDoPagamento, recusaDePagamento, statusDaDespesaPorAcumulado } from "@/lib/pagamento-regras";
import { mensagemColisaoNumDoc, reserveDespesaNumber } from "@/lib/db/numbering";
import { FORMAS_PAGAMENTO, gerarParcelas } from "@/lib/calc";
import { categoriasDeDespesa, validarCategoriaDespesa } from "@/lib/calc/natureza-dre";
import {
  TIPOS_DOCUMENTO,
  normalizarChaveAcesso,
  validarDocumentoFiscal,
} from "@/lib/calc/documento-fiscal";
import { CATEGORIAS_DRE, type CategoriaDRE } from "@/lib/calc/constants";
import { getChartAccounts, getStakeholders, getAtualVersion } from "@/lib/queries";
import { categoriaParaGravar } from "@/lib/categoria-do-plano-servidor";
import { faturasDasParcelas, valoresDasParcelas, type FaturaDoCiclo } from "@/lib/calc/cartao-ciclo";
import { gravarVinculos } from "@/lib/conciliacao-db";
import {
  AI_ACCEPTED_MIME,
  AI_MAX_DOCS,
  extractDespesaFromDocument,
  isAiConfigured,
} from "@/lib/ai/despesa-extract";
import {
  montarPreenchimentoDespesa,
  type PreenchimentoDespesa,
} from "@/lib/ai/despesa-doc";
import { comUsoDeIa } from "@/lib/ai/uso";

// As cinco actions de stakeholder (add/update/setAtivo/delete/extract) foram
// movidas para `actions/stakeholders.ts` no Prompt W (5.4) — só organização.

export async function addBankAccount(formData: FormData) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "fornecedores", "criar")) return;
  const [conta] = await db
    .insert(schema.bankAccounts)
    .values({
      tenantId: ctx.tenant.id,
      banco: (formData.get("banco") as string) || "Banco",
      ag: (formData.get("ag") as string) || null,
      op: (formData.get("op") as string) || null,
      cc: (formData.get("cc") as string) || null,
      tipo:
        (formData.get("tipo") as "Imobiliária" | "Construtora") || "Construtora",
    })
    .returning();
  // AK Parte 1 — sem transação aqui; não se cria uma nesta tarefa (1.3).
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "contaCorrente.create",
    entity: "bank_account",
    entityId: conta.id,
    meta: { banco: conta.banco, ag: conta.ag, cc: conta.cc, tipo: conta.tipo },
  });
  revalidatePath("/fornecedores");
}

/**
 * Parcelas enviadas pelo formulário (preview editável), já normalizadas.
 *
 * Base do modo bottom-up do item 1.4: quando o usuário monta parcelas de
 * valores livres e deixa o total vazio, o total do PED é a soma delas. Lê de
 * forma tolerante — JSON inválido devolve lista vazia e o fluxo cai na trava de
 * valor obrigatório, em vez de gravar lançamento sem valor.
 */
interface ParcelaRecebida {
  vencimento: string | null;
  valor: number;
  forma: string | null;
  bancoContaId: string | null;
  numeroCheque: string | null;
  emitenteCheque: string | null;
  dataEmissaoCheque: string | null;
  dataBomPara: string | null;
  status: string;
}

/**
 * Retorno legível (11.8): em produção o Next.js troca a mensagem de um erro
 * lançado por um texto genérico, então toda recusa volta em `{ ok, error }`.
 */
export type ResultadoDespesa = { ok: true; id: string; aviso?: string } | { ok: false; error: string };
type Resultado = { ok: true } | { ok: false; error: string };

/** Erro de regra: vira `{ ok: false, error }`. Qualquer outro erro sobe. */
class Recusa extends Error {}

/**
 * Prompt U, 2 — a fatura de um ciclo (cartão + data de fechamento), criada sob
 * demanda dentro da transação. O índice único (0054) garante uma por ciclo:
 * se outra transação criou primeiro, a inserção não faz nada e a leitura
 * seguinte devolve a existente.
 */
async function faturaDoCiclo(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
  cartaoId: string,
  ciclo: FaturaDoCiclo,
): Promise<typeof schema.faturasCartao.$inferSelect> {
  const achar = () =>
    tx
      .select()
      .from(schema.faturasCartao)
      .where(and(eq(schema.faturasCartao.cartaoId, cartaoId), eq(schema.faturasCartao.fechamento, ciclo.fechamento)))
      .then((r) => r[0]);
  const existente = await achar();
  if (existente) return existente;
  await tx.insert(schema.faturasCartao).values({ tenantId, cartaoId, fechamento: ciclo.fechamento, vencimento: ciclo.vencimento }).onConflictDoNothing();
  const criada = await achar();
  if (!criada) throw new Error("Não foi possível criar a fatura do ciclo.");
  return criada;
}

/** A despesa com a versão dela, no tenant — e se essa versão está congelada (11.7). */
async function despesaDoTenant(tenantId: string, id: string) {
  const [row] = await db
    .select({ d: schema.despesas, locked: schema.versions.locked, versionKind: schema.versions.kind })
    .from(schema.despesas)
    .innerJoin(schema.versions, eq(schema.despesas.versionId, schema.versions.id))
    .where(and(eq(schema.despesas.id, id), eq(schema.despesas.tenantId, tenantId), eq(schema.versions.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}

function lerParcelasManuais(formData: FormData): ParcelaRecebida[] {
  const raw = formData.get("parcelasJson");
  if (typeof raw !== "string" || !raw.trim()) return [];
  const txt = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  try {
    const arr = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((p) => ({
        vencimento: txt(p.vencimento),
        valor: Number(p.valor) || 0,
        forma: txt(p.forma),
        bancoContaId: txt(p.bancoContaId),
        numeroCheque: txt(p.numeroCheque),
        emitenteCheque: txt(p.emitenteCheque),
        dataEmissaoCheque: txt(p.dataEmissaoCheque),
        dataBomPara: txt(p.dataBomPara),
        // Status desconhecido cai em "Pendente": é o lado seguro — marcar uma
        // parcela como paga por engano esconderia uma conta em aberto.
        status: txt(p.status) ?? "Pendente",
      }))
      .filter((p) => p.valor > 0);
  } catch {
    return [];
  }
}

export async function addDespesa(formData: FormData): Promise<ResultadoDespesa> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "criar")) {
    return { ok: false, error: "Sem permissão para lançar despesas." };
  }
  try {
    return await lancarDespesa(ctx, formData);
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
}

/**
 * O lançamento em si. Tudo que é SQL — despesa, parcelas, documento fiscal,
 * obrigação com terceiro, réplicas recorrentes e auditoria — roda numa única
 * transação (11.2): ou entra inteiro, ou nada entra. Os anexos vão para o R2
 * depois, porque o R2 não participa da transação; anexo que falhar vira
 * aviso, não desfaz a despesa.
 */
async function lancarDespesa(
  ctx: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>,
  formData: FormData,
): Promise<ResultadoDespesa> {
  // Sem "projeto ativo" (Prompt A): a despesa vai para o projeto escolhido no
  // formulário — obrigatório, e só se for desta empresa — na versão Atual
  // dele. Sem projeto, recusa: nunca cai na obra do cookie.
  const projectId = (formData.get("projectId") as string) || "";
  const projeto = projectId ? await getProjectContext(ctx.tenant.id, projectId) : null;
  if (!projeto) throw new Recusa("Escolha o projeto da despesa.");
  const version = await getAtualVersion(ctx.tenant.id, projeto.id);
  if (!version) throw new Recusa("Projeto sem versão Atual.");
  if (version.locked) throw new Recusa("Versão congelada — lançamentos bloqueados.");

  // Item 1.3 / RG-01 — uma despesa não pode ser classificada em conta de
  // natureza credora. Validar só no formulário não protege nada: esta Server
  // Action é chamável diretamente.
  // Prompt DP — com a chave ligada, a categoria é a da conta no Plano de
  // Contas, qualquer que seja a enviada.
  const pelaConta = await categoriaParaGravar(ctx.tenant.id, formData.get("contaCef") as string, formData.get("categoriaDre") as string);
  if (!pelaConta.ok) throw new Recusa(pelaConta.error);
  const categoriaFinal = pelaConta.categoria;
  const erroCategoria = validarCategoriaDespesa(categoriaFinal);
  if (erroCategoria) throw new Recusa(erroCategoria);

  // 11.1 — valor maior que zero, finito. Exceção do item 1.4 (modo bottom-up):
  // com parcelas de valores livres o total do PED é a SOMA delas, e o campo de
  // valor chega vazio de propósito.
  const parcelasManuais = lerParcelasManuais(formData);
  const somaParcelas = parcelasManuais.reduce((a, p) => a + p.valor, 0);
  const valorInformado = Number((formData.get("valor") as string) || "0");
  const valorNum =
    somaParcelas > 0 && (!Number.isFinite(valorInformado) || valorInformado === 0)
      ? somaParcelas
      : valorInformado;
  const erroValor = recusaDeValor(valorNum);
  if (erroValor) {
    throw new Recusa(
      valorNum === 0
        ? "Informe um valor maior que zero — ou gere as parcelas, que o total é somado a partir delas."
        : erroValor,
    );
  }
  // 11.3 e 11.4 — as parcelas do painel precisam fechar com o total e trazer
  // status da lista. Não confiar no navegador.
  const erroParcelas = recusaDeParcelas(valorNum, parcelasManuais) ?? recusaDeStatusParcela(parcelasManuais);
  if (erroParcelas) throw new Recusa(erroParcelas);
  // Prompt S, 3.2 — o status da despesa também vem de uma lista fechada.
  const erroStatus = recusaDeStatusDespesa(formData.get("status") as string);
  if (erroStatus) throw new Recusa(erroStatus);

  const s = (k: string) => (formData.get(k) as string) || null;
  // Documento fiscal (item 1.2 / RG-06): validado ANTES de gravar qualquer coisa.
  const docTipo = ((formData.get("docTipo") as string) || "SEM_DOC").trim();
  const docNumero = ((formData.get("docNumero") as string) || "").trim();
  const docSerie = ((formData.get("docSerie") as string) || "").trim();
  const docChave = (formData.get("docChaveAcesso") as string) || "";
  const docEmissao = ((formData.get("docDataEmissao") as string) || "").trim();
  const temDocFiscal = docTipo !== "SEM_DOC" || !!docNumero;
  if (temDocFiscal) {
    const erroDoc = validarDocumentoFiscal({ tipo: docTipo, numero: docNumero, chaveAcesso: docChave });
    if (erroDoc) throw new Recusa(erroDoc);
  }

  // Despesa paga por sócio (Seção 3): a despesa é reconhecida normalmente na DRE
  // e no projeto, mas NÃO gera saída de caixa da empresa. A obrigação com o
  // sócio é registrada em despesa_terceiro; o caixa só se move no reembolso
  // (restituição). Se não houver reembolso, a obrigação já nasce quitada.
  const pagoPorSocioId = s("pagoPorSocioId");
  const socioReembolsavel = !!formData.get("socioReembolsavel");
  const socioDataPagamento = s("socioDataPagamento");
  // Prompt U / Prompt S, 3-B.4 — compra no cartão: a despesa é reconhecida na
  // competência informada; nenhuma saída de caixa agora; cada parcela cai numa
  // fatura do ciclo (2.1–2.3). O cartão precisa ser desta empresa e estar ativo.
  const cartaoId = s("cartaoId");
  const cartaoDataCompra = s("cartaoDataCompra") ?? "";
  const cartaoParcelas = Number(formData.get("cartaoParcelas") || 1);
  let cartao: typeof schema.cartoesCredito.$inferSelect | null = null;
  let faturasDoCartao: FaturaDoCiclo[] = [];
  if (cartaoId) {
    if (pagoPorSocioId) throw new Recusa("Uma compra é paga pelo cartão OU por terceiro — não pelos dois.");
    if (parcelasManuais.length > 0) throw new Recusa("No cartão, as parcelas seguem o ciclo da fatura: informe só o nº de parcelas, sem o painel de parcelas.");
    if (!Number.isInteger(cartaoParcelas) || cartaoParcelas < 1 || cartaoParcelas > 48) throw new Recusa("Nº de parcelas no cartão: de 1 a 48.");
    const [c] = await db.select().from(schema.cartoesCredito).where(and(eq(schema.cartoesCredito.id, cartaoId), eq(schema.cartoesCredito.tenantId, ctx.tenant.id)));
    if (!c) throw new Recusa("Cartão não encontrado.");
    if (!c.ativo) throw new Recusa(`O cartão "${c.apelido}" está inativo.`);
    faturasDoCartao = faturasDasParcelas(cartaoDataCompra, cartaoParcelas, c);
    if (faturasDoCartao.length === 0) throw new Recusa("Informe a data da compra no cartão.");
    cartao = c;
  }
  // Prompt S3 — quem desembolsou precisa ser um cadastro ATIVO desta empresa:
  // antes, qualquer id era aceito (inclusive de outra empresa).
  if (pagoPorSocioId) {
    if (!/^[0-9a-f-]{36}$/i.test(pagoPorSocioId)) throw new Recusa("Quem desembolsou não foi encontrado nesta empresa.");
    const [pagador] = await db
      .select({ ativo: schema.stakeholders.ativo })
      .from(schema.stakeholders)
      .where(and(eq(schema.stakeholders.id, pagoPorSocioId), eq(schema.stakeholders.tenantId, ctx.tenant.id)))
      .limit(1);
    if (!pagador) throw new Recusa("Quem desembolsou não foi encontrado nesta empresa.");
    if (!pagador.ativo) throw new Recusa("Quem desembolsou está inativo no cadastro.");
  }
  const core = {
    versionId: version.id,
    tenantId: ctx.tenant.id,
    fornecedorId: s("fornecedorId"),
    // Compra no cartão não tem conta da empresa: o caixa sai no pagamento da fatura.
    bancoId: cartao ? null : s("bancoId"),
    contaCef: s("contaCef"),
    categoriaDre: (categoriaFinal as CategoriaDRE) || null,
    competencia: s("competencia"),
    vencimento: cartao ? faturasDoCartao[0].vencimento : pagoPorSocioId ? socioDataPagamento : s("vencimento"),
    // Modo bottom-up: quando o total chega vazio e há parcelas, `valorNum` já é
    // a soma delas. O PED carrega SEMPRE o custo total da compra; o
    // fracionamento vive nas parcelas (item 2.3).
    valor: String(valorNum),
    // Descrição/observação da compra — campo PRÓPRIO, separado do nº do pedido
    // (numDoc). O objeto da compra não deve ser guardado no número do pedido.
    obs: s("obs"),
    // 3-B.5 — no cartão a despesa NÃO nasce paga: o caixa da empresa não saiu.
    status: cartao ? "A pagar" : pagoPorSocioId ? "Pago" : s("status") || "A pagar",
    // Não gera saída de caixa da empresa no momento do cadastro.
    pagoPorTerceiro: !!pagoPorSocioId,
    cartaoId: cartao?.id ?? null,
    // Fase 2 — forma/condição de pagamento
    formaPagamento: cartao ? "Cartão de crédito" : s("formaPagamento"),
    formaPagamentoDesc: s("formaPagamentoDesc"),
    condicaoPagamento: s("condicaoPagamento"),
    qtdParcelas: cartao ? cartaoParcelas : formData.get("qtdParcelas") ? Number(formData.get("qtdParcelas")) : null,
    dataEmissao: s("dataEmissao"),
    boletoLinhaDigitavel: s("boletoLinhaDigitavel"),
    boletoCodigoBarras: s("boletoCodigoBarras"),
    boletoBanco: s("boletoBanco"),
    chequeNumero: s("chequeNumero"),
    chequeBanco: s("chequeBanco"),
    chequeAg: s("chequeAg"),
    chequeConta: s("chequeConta"),
    chequeEmitente: s("chequeEmitente"),
    chequeDataEmissao: s("chequeDataEmissao"),
    chequeDataCompensacao: s("chequeDataCompensacao"),
    chequeStatus: s("chequeStatus"),
  };
  const recorrente = !!formData.get("recorrente");
  const mesesRecorrencia = recorrente
    ? Math.min(60, Math.max(2, Number(formData.get("recorrenciaMeses")) || 0))
    : 0;

  if (cartao && recorrente) throw new Recusa("Compra no cartão não pode ser recorrente: lance cada compra na data dela.");

  const row = await db.transaction(async (tx) => {
    // RG-06 — o PED é numeração interna: sempre reservado aqui, no servidor.
    // Nunca vem do formulário, nem para owner/admin. O número da nota tem campo
    // próprio (bloco Documento Fiscal). A reserva tem transação própria: se
    // esta gravação for desfeita, o número fica sem uso — nunca é reemitido.
    const numDoc = await reserveDespesaNumber(ctx.tenant.id);
    const [row] = await tx
      .insert(schema.despesas)
      .values({ ...core, numDoc })
      .returning()
      .catch((e: unknown) => {
        // Índice único (0040): número repetido vira mensagem, não erro de banco.
        const msg = mensagemColisaoNumDoc(e, numDoc);
        throw msg ? new Recusa(msg) : e;
      });

    // Parcelas (Fase 2): usa o preview enviado pelo formulário (editável) ou
    // gera pela condição. Sem forma/condição → sem parcelas (comporta como antes).
    const valorTotal = Number(row.valor);
    const condicao = row.condicaoPagamento;
    let parcelas: ParcelaRecebida[] = [];
    // Despesa paga por sócio já está quitada pelo sócio — não gera parcelas/contas
    // a pagar da empresa.
    if (pagoPorSocioId || cartao) {
      parcelas = [];
    } else if (parcelasManuais.length > 0) {
      // Vindas do painel auxiliar: cada linha traz forma, cheque, banco e status
      // próprios (itens 2.1 e 2.5).
      parcelas = parcelasManuais;
    } else if (condicao) {
      parcelas = gerarParcelas({
        valorTotal,
        condicao,
        dataBase: row.vencimento || row.dataEmissao || row.competencia || "",
        qtd: row.qtdParcelas ?? undefined,
      }).map((p) => ({
        vencimento: p.vencimento,
        valor: p.valor,
        forma: null,
        bancoContaId: null,
        numeroCheque: null,
        emitenteCheque: null,
        dataEmissaoCheque: null,
        dataBomPara: null,
        status: "Pendente",
      }));
    }
    if (parcelas.length > 0) {
      await tx.insert(schema.despesaParcelas).values(
        parcelas.map((p, i) => ({
          tenantId: ctx.tenant.id,
          despesaId: row.id,
          numeroParcela: i + 1,
          vencimento: p.vencimento,
          valorOriginal: String(p.valor),
          // A forma da parcela tem precedência sobre a do cabeçalho: numa mesma
          // compra pode haver cheque em umas e PIX em outras.
          formaPagamento: p.forma ?? row.formaPagamento,
          // Item 2.2 — o banco do cabeçalho é herdado quando a parcela não
          // informa outro.
          bankAccountId: p.bancoContaId ?? row.bancoId,
          numeroCheque: p.numeroCheque,
          emitenteCheque: p.emitenteCheque,
          dataEmissaoCheque: p.dataEmissaoCheque,
          dataBomPara: p.dataBomPara,
          status: p.status,
        })),
      );
    }

    // Prompt U, 2.1–2.3 / Prompt S, 3-B.6 — compra no cartão: uma parcela por
    // fatura (1x = uma parcela), cada uma vinculada à fatura do ciclo, criada
    // sob demanda NA MESMA transação. A competência é única (2.4): é a do
    // cabeçalho. Nenhuma saída de caixa: ela é do pagamento da fatura.
    if (cartao) {
      const valores = valoresDasParcelas(valorTotal, faturasDoCartao.length);
      const fechamentos: string[] = [];
      for (let i = 0; i < faturasDoCartao.length; i++) {
        const fatura = await faturaDoCiclo(tx, ctx.tenant.id, cartao.id, faturasDoCartao[i]);
        fechamentos.push(fatura.fechamento);
        await tx.insert(schema.despesaParcelas).values({
          tenantId: ctx.tenant.id,
          despesaId: row.id,
          numeroParcela: i + 1,
          vencimento: fatura.vencimento,
          valorOriginal: String(valores[i]),
          formaPagamento: "Cartão de crédito",
          bankAccountId: cartao.bankAccountId,
          status: "Pendente",
          faturaId: fatura.id,
        });
      }
      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "despesa.cartao",
          entity: "despesa",
          entityId: row.id,
          meta: { cartaoId: cartao.id, apelido: cartao.apelido, dataCompra: cartaoDataCompra, parcelas: faturasDoCartao.length, faturas: fechamentos },
        },
        tx,
      );
    }

    // Documento fiscal: a linha só nasce quando há algo a registrar — despesa
    // sem nota simplesmente não tem documento fiscal, e isso é um estado
    // válido: a nota chega depois.
    if (temDocFiscal) {
      await tx.insert(schema.documentosFiscais).values({
        tenantId: ctx.tenant.id,
        despesaId: row.id,
        tipo: docTipo,
        numero: docNumero || null,
        serie: docSerie || null,
        chaveAcesso: normalizarChaveAcesso(docChave),
        // Sem data de emissão informada, vale a competência — é o que a nota
        // costuma trazer e evita campo vazio na conferência.
        dataEmissao: docEmissao || row.competencia,
      });
    }

    await logAudit(
      {
        tenantId: ctx.tenant.id,
        userId: ctx.userId,
        action: "despesa.create",
        entity: "despesa",
        entityId: row.id,
        // Prompt S, 8.2 — origem do lançamento: assistente (leitura por IA,
        // conferida pelo usuário) ou manual.
        meta: { valor: row.valor, contaCef: row.contaCef, origem: formData.get("origemIa") === "1" ? "assistente" : "manual" },
      },
      tx,
    );

    // Despesa paga por sócio: registra a obrigação empresa↔sócio (reusa a infra de
    // "pago por terceiro"). Reembolsável → obrigação PENDENTE (o caixa só se move
    // no reembolso, feito na tela de Restituições). Sem reembolso → obrigação já
    // QUITADA (saldo 0), sem movimento de caixa e sem duplicar despesa na DRE.
    if (pagoPorSocioId) {
      await tx.insert(schema.despesaTerceiros).values({
        tenantId: ctx.tenant.id,
        despesaId: row.id,
        pagadorTerceiroId: pagoPorSocioId,
        empresaResponsavelId: projectId,
        valorTotal: row.valor,
        valorRestituido: socioReembolsavel ? "0" : row.valor,
        dataPagamentoOriginal: socioDataPagamento,
        status: socioReembolsavel ? "Aguardando restituição" : "Sem reembolso",
        obs: socioReembolsavel
          ? "Despesa paga por sócio — a reembolsar"
          : "Despesa paga por sócio — sem reembolso",
      });
      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "despesa.pagaPorSocio",
          entity: "despesa",
          entityId: row.id,
          meta: {
            socioId: pagoPorSocioId,
            valor: row.valor,
            reembolsavel: socioReembolsavel,
            dataPagamento: socioDataPagamento,
          },
        },
        tx,
      );
    }

    // Despesa recorrente: replica o lançamento nos próximos meses (competência e
    // vencimento avançam 1 mês a cada repetição). Cada réplica recebe seu próprio
    // número automático; parcelas/anexo ficam só no lançamento original. A
    // réplica é obrigação FUTURA (11.5): nasce "A pagar", sem pago por terceiro
    // e sem os dados de boleto/cheque de um pagamento específico.
    if (recorrente) {
      const replica = coreDaReplica(core);
      for (let i = 1; i < mesesRecorrencia; i++) {
        const numDocRec = await reserveDespesaNumber(ctx.tenant.id);
        await tx
          .insert(schema.despesas)
          .values({
            ...replica,
            numDoc: numDocRec,
            competencia: addMonthsCompetencia(core.competencia, i),
            vencimento: addMonthsDate(core.vencimento, i),
          })
          .catch((e: unknown) => {
            const msg = mensagemColisaoNumDoc(e, numDocRec);
            throw msg ? new Recusa(`Réplica ${i + 1} de ${mesesRecorrencia}: ${msg}`) : e;
          });
      }
      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "despesa.recorrente",
          entity: "despesa",
          entityId: row.id,
          meta: { meses: mesesRecorrencia, competencia: core.competencia },
        },
        tx,
      );
    }
    return row;
  });

  // Documentos anexados (opcional): VÁRIOS arquivos podem ser enviados já no
  // lançamento inicial (boleto, nota fiscal, comprovante, foto...). Cada um vira
  // uma linha em `document` vinculada à mesma despesa. Fora da transação: o R2
  // não participa dela. Falha aqui não desfaz a despesa — vira aviso.
  const files = formData
    .getAll("file")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const falhas: string[] = [];
  if (files.length > 0 && isR2Configured()) {
    for (const file of files) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const key = `tenants/${ctx.tenant.id}/docs/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}_${safe}`;
      try {
        await putObject(
          key,
          new Uint8Array(await file.arrayBuffer()),
          file.type || "application/octet-stream",
        );
        await db.insert(schema.documents).values({
          tenantId: ctx.tenant.id,
          despesaId: row.id,
          storageKey: key,
          filename: file.name,
          contentType: file.type || null,
          size: file.size,
          uploadedBy: ctx.userEmail || ctx.userId || null,
        });
      } catch {
        falhas.push(file.name);
      }
    }
  }

  // Prompt L, 3-A.2 — veio do extrato: o movimento reservado é conciliado com
  // este lançamento (vínculo com valor), sem saída de caixa nova. Falha aqui
  // não desfaz a despesa: vira aviso, e a conciliação fica para a tela do Caixa.
  // Prompt Z, BZ-1 — diárias da equipe que originaram esta despesa passam a apontar para ela (rastro; nada é gerado aqui).
  const diariasIds = ((formData.get("diariasIds") as string | null) || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (diariasIds.length > 0) {
    const { vincularDiariasADespesa } = await import("@/lib/actions/equipes");
    const n = await vincularDiariasADespesa(ctx.tenant.id, diariasIds, row.id);
    await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "equipe.diarias.lancadas", entity: "despesa", entityId: row.id, meta: { diarias: n, pedidas: diariasIds.length } });
  }
  const cashEntryId = (formData.get("cashEntryId") as string | null) || null;
  let avisoConciliacao: string | null = null;
  if (cashEntryId) {
    const [mov] = await db.select({ valor: schema.cashEntries.valor }).from(schema.cashEntries).where(and(eq(schema.cashEntries.id, cashEntryId), eq(schema.cashEntries.tenantId, ctx.tenant.id)));
    const valorVinculo = mov ? Math.min(Math.abs(Number(mov.valor)), Number(row.valor)) : 0;
    const r = mov ? await gravarVinculos({ tenantId: ctx.tenant.id, userId: ctx.userId, userEmail: ctx.userEmail }, { cashEntryId, itens: [{ despesaId: row.id, valor: valorVinculo }], origem: "manual" }) : { ok: false as const, error: "Movimento do extrato não encontrado." };
    avisoConciliacao = r.ok ? null : `Despesa lançada, mas o movimento do extrato não foi conciliado: ${r.error} Concilie na tela do Caixa.`;
    revalidatePath("/caixa");
  }
  // Prompt AT §6.2 — lançada a partir de uma linha do extrato do cartão: a
  // linha é conciliada com esta compra, pela mesma conferência do servidor.
  // Falha aqui não desfaz a despesa: vira aviso.
  const extratoCartaoId = (formData.get("extratoCartaoId") as string | null) || null;
  if (extratoCartaoId) {
    const { vincularLinhaDoCartao } = await import("@/lib/cartao-conciliacao");
    const r = await vincularLinhaDoCartao(ctx.tenant.id, extratoCartaoId, row.id, ctx.userEmail ?? ctx.userId ?? null);
    if (r.ok) await logAudit({ tenantId: ctx.tenant.id, userId: ctx.userId, action: "cartao.extrato.conciliar", entity: "extrato_cartao", entityId: extratoCartaoId, meta: { despesaId: row.id, origem: "lancada da linha" } });
    else avisoConciliacao = [avisoConciliacao, `Despesa lançada, mas a linha do extrato do cartão não foi conciliada: ${r.error} Concilie no Caixa.`].filter(Boolean).join(" ");
    revalidatePath("/caixa");
  }
  revalidatePath("/despesas");
  const avisos = [
    falhas.length ? `Despesa ${row.numDoc ?? ""} gravada, mas ${falhas.length} anexo(s) não subiram (${falhas.join(", ")}). Anexe de novo pela ficha.` : null,
    avisoConciliacao,
  ].filter((x): x is string => !!x);
  return {
    ok: true,
    id: row.id,
    aviso: avisos.length ? avisos.join(" ") : undefined,
  };
}

/** Avança `add` meses numa competência "MM/YYYY". */
function addMonthsCompetencia(mm: string | null, add: number): string | null {
  if (!mm) return mm;
  const m = mm.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return mm;
  const idx = Number(m[2]) * 12 + (Number(m[1]) - 1) + add;
  const y = Math.floor(idx / 12);
  const mo = (idx % 12) + 1;
  return `${String(mo).padStart(2, "0")}/${y}`;
}

/** Avança `add` meses numa data interna "MM/DD/YYYY", limitando o dia ao mês. */
function addMonthsDate(d: string | null, add: number): string | null {
  if (!d) return d;
  const m = d.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return d;
  const day = Number(m[2]);
  const idx = Number(m[3]) * 12 + (Number(m[1]) - 1) + add;
  const y = Math.floor(idx / 12);
  const mo = (idx % 12) + 1;
  const lastDay = new Date(y, mo, 0).getDate();
  const dd = Math.min(day, lastDay);
  return `${String(mo).padStart(2, "0")}/${String(dd).padStart(2, "0")}/${y}`;
}

/** Campos editáveis de uma despesa já lançada. */
export interface DespesaPatch {
  fornecedorId?: string | null;
  bancoId?: string | null;
  contaCef?: string | null;
  categoriaDre?: string | null;
  numDoc?: string | null;
  competencia?: string | null;
  vencimento?: string | null;
  valor?: string;
  status?: string | null;
  obs?: string | null;
  formaPagamento?: string | null;
}

/**
 * Edita uma despesa já lançada. Escopo por tenant: a despesa pode pertencer a
 * qualquer projeto do tenant. Recusa (11.6) mudança de valor, status, datas e
 * forma quando há fato financeiro vinculado — pagamento, parcela paga, acerto,
 * restituição, terceiro ou caixa conciliado —, e mudança de valor quando há
 * parcelas em aberto. Versão congelada bloqueia (11.7).
 */
export async function updateDespesa(id: string, patch: DespesaPatch): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "editar")) {
    return { ok: false, error: "Sem permissão para editar despesas." };
  }
  const alvo = await despesaDoTenant(ctx.tenant.id, id);
  if (!alvo) return { ok: false, error: "Despesa não encontrada." };
  const existing = alvo.d;
  if (existing.cancelado) return { ok: false, error: "Despesa cancelada não pode ser editada." };
  if (alvo.locked) return { ok: false, error: "Versão congelada — edição bloqueada." };

  const set: Partial<typeof schema.despesas.$inferInsert> = {};
  if (patch.fornecedorId !== undefined) set.fornecedorId = patch.fornecedorId || null;
  if (patch.bancoId !== undefined) set.bancoId = patch.bancoId || null;
  if (patch.contaCef !== undefined) set.contaCef = patch.contaCef || null;
  if (patch.categoriaDre !== undefined || patch.contaCef !== undefined) {
    // Prompt DP — com a chave ligada, a categoria segue a conta (a nova, se
    // mudou; senão a gravada), qualquer que seja a enviada.
    const conta = patch.contaCef !== undefined ? patch.contaCef || null : existing.contaCef;
    const pelaConta = await categoriaParaGravar(ctx.tenant.id, conta, patch.categoriaDre !== undefined ? patch.categoriaDre : existing.categoriaDre);
    if (!pelaConta.ok) return { ok: false, error: pelaConta.error };
    if (patch.categoriaDre !== undefined || pelaConta.herdada) {
      // Item 1.3 / RG-01 — nem na edição uma despesa pode passar para conta de
      // natureza credora.
      const erro = validarCategoriaDespesa(pelaConta.categoria);
      if (erro) return { ok: false, error: erro };
      set.categoriaDre = pelaConta.categoria as CategoriaDRE;
    }
  }
  // RG-06 — o PED é imutável depois de criado. Renumerar um documento já
  // emitido quebraria a conferência com a contabilidade e com os anexos que o
  // referenciam. Um número enviado igual ao atual é ignorado em silêncio (o
  // formulário pode reenviá-lo); diferente, é recusado.
  if (patch.numDoc !== undefined && (patch.numDoc?.trim() || null) !== existing.numDoc) {
    return {
      ok: false,
      error:
        "O nº do pedido (PED) é numeração interna e não pode ser alterado. Para corrigir o número da nota, use o campo de documento fiscal.",
    };
  }
  if (patch.competencia !== undefined) set.competencia = patch.competencia || null;
  if (patch.vencimento !== undefined) set.vencimento = patch.vencimento || null;
  if (patch.valor !== undefined) {
    // 11.1 — vale também na edição; antes qualquer texto virava "0".
    const n = Number(patch.valor.trim());
    const erro = recusaDeValor(n);
    if (erro) return { ok: false, error: erro };
    set.valor = String(n);
  }
  if (patch.status !== undefined) {
    // Prompt S, 3.2 — domínio fechado no servidor; a edição não inventa status.
    const erroStatus = recusaDeStatusDespesa(patch.status);
    if (erroStatus) return { ok: false, error: erroStatus };
    set.status = patch.status || null;
  }
  if (patch.obs !== undefined) set.obs = patch.obs || null;
  if (patch.formaPagamento !== undefined) set.formaPagamento = patch.formaPagamento || null;
  if (Object.keys(set).length === 0) return { ok: true };

  // Auditoria campo a campo (RG-09): valor anterior × novo. O helper normaliza
  // nulo/vazio e numeric-como-string, senão reeditar sem mudar nada registraria
  // "alterações" que não houve. O diff também diz QUAIS campos mudam de fato —
  // é sobre eles que a trava de 11.6 decide.
  const changes = diffAudit(
    existing as unknown as Record<string, unknown>,
    set as Record<string, unknown>,
  );
  const mudou = Object.keys(changes);
  if (mudou.length > 0) {
    const vinculos = await vinculosDaDespesa(db, ctx.tenant.id, id);
    // Prompt S, 1.2/1.3 — com caixa conciliado, a recusa diz QUAL movimento e
    // se o usuário pode desfazer a conciliação (permissão própria, no Caixa).
    const detalhes = vinculos.caixaConciliado
      ? { movimentos: await movimentosConciliados(db, ctx.tenant.id, id), podeDesfazerConciliacao: can(ctx.perms, "caixa", "excluir") }
      : undefined;
    const erroVinculo = recusaDeEdicao(vinculos, mudou, detalhes);
    if (erroVinculo) return { ok: false, error: erroVinculo };
  }
  await db.update(schema.despesas).set(set).where(and(eq(schema.despesas.id, id), eq(schema.despesas.tenantId, ctx.tenant.id)));

  // Diff vazio não gera linha de log (AK, Parte 2). O formulário manda as 10
  // chaves sempre, então `set` nunca fica vazio e a guarda acima não pega o
  // caso "reabriu e salvou sem mexer": o log registrava `{"changes":{}}`, um
  // evento que não existiu. O `update` continua rodando — suprimi-lo mudaria
  // comportamento de gravação; suprimir o log vazio não muda nada além do ruído.
  if (houveMudanca(changes)) {
    await logAudit({
      tenantId: ctx.tenant.id,
      userId: ctx.userId,
      action: "despesa.update",
      entity: "despesa",
      entityId: id,
      meta: { changes },
    });
  }
  revalidatePath("/despesas");
  return { ok: true };
}

/**
 * Prompt S, 2.2 — o que a exclusão removeria junto (ou o que a impede), para
 * a tela mostrar ANTES de pedir a confirmação. Só leitura.
 */
export async function inventarioDeExclusao(id: string): Promise<{ ok: true; numDoc: string | null; valor: string; inventario: InventarioDaDespesa; bloqueios: string[] } | { ok: false; error: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "excluir")) return { ok: false, error: "Sem permissão para excluir despesas." };
  const alvo = await despesaDoTenant(ctx.tenant.id, id);
  if (!alvo) return { ok: false, error: "Despesa não encontrada." };
  const inventario = await inventarioDaDespesa(db, ctx.tenant.id, id);
  return { ok: true, numDoc: alvo.d.numDoc, valor: String(alvo.d.valor), inventario, bloqueios: bloqueiosDeExclusaoDespesa(inventario) };
}

/**
 * Exclui uma despesa (§12 do Prompt I; seção 2 do Prompt S): só registro sem
 * dependência — com pagamento, parcela paga, acerto, restituição, terceiro,
 * caixa conciliado, nota fiscal ou anexo, a exclusão é recusada dizendo o
 * quê (o caminho é o cancelamento, que preserva o histórico). Exige o PED
 * digitado (2.3; sem PED, a palavra EXCLUIR). Apaga e audita na MESMA
 * transação (2.5): se o log falhar, nada é apagado. A auditoria guarda o
 * inventário completo (2.4). Versão congelada bloqueia (11.7).
 */
export async function deleteDespesa(id: string, confirmacao?: string | null): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "excluir")) {
    return { ok: false, error: "Sem permissão para excluir despesas." };
  }
  const alvo = await despesaDoTenant(ctx.tenant.id, id);
  if (!alvo) return { ok: false, error: "Despesa não encontrada." };
  if (alvo.locked) return { ok: false, error: "Versão congelada — exclusão bloqueada." };
  const existing = alvo.d;
  const esperado = existing.numDoc?.trim() || "EXCLUIR";
  if (!confirmacaoConfere(confirmacao, esperado)) {
    return { ok: false, error: existing.numDoc ? `Para excluir, digite o PED ${existing.numDoc} exatamente como está.` : "Para excluir, digite EXCLUIR." };
  }
  try {
    await db.transaction(async (tx) => {
      const inventario = await inventarioDaDespesa(tx, ctx.tenant.id, id);
      const bloqueios = bloqueiosDeExclusaoDespesa(inventario);
      if (bloqueios.length) throw new Recusa(`Não é possível excluir: ${bloqueios.join("; ")}. Use "Cancelar despesa".`);
      const [forn] = existing.fornecedorId
        ? await tx.select({ nome: schema.stakeholders.nome }).from(schema.stakeholders).where(eq(schema.stakeholders.id, existing.fornecedorId)).limit(1)
        : [];
      await tx.delete(schema.despesas).where(and(eq(schema.despesas.id, id), eq(schema.despesas.tenantId, ctx.tenant.id)));
      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "despesa.delete",
          entity: "despesa",
          entityId: id,
          meta: {
            numDoc: existing.numDoc,
            valor: existing.valor,
            fornecedor: forn?.nome ?? null,
            fornecedorId: existing.fornecedorId,
            competencia: existing.competencia,
            vencimento: existing.vencimento,
            contaCef: existing.contaCef,
            categoriaDre: existing.categoriaDre,
            status: existing.status,
            versionId: existing.versionId,
            vinculos: inventario,
          },
        },
        tx,
      );
    });
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath("/despesas");
  return { ok: true };
}

/**
 * Cancelamento lógico de uma despesa: preserva o histórico para auditoria, mas
 * a remove de saldos, relatórios, fluxo de caixa e contas a pagar. Preferível
 * à exclusão física. Versão congelada bloqueia (11.7).
 */
export async function cancelarDespesa(id: string, motivo: string): Promise<Resultado> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "excluir")) {
    return { ok: false, error: "Sem permissão para cancelar despesas." };
  }
  const alvo = await despesaDoTenant(ctx.tenant.id, id);
  if (!alvo) return { ok: false, error: "Despesa não encontrada." };
  const existing = alvo.d;
  if (existing.cancelado) return { ok: true };
  if (alvo.locked) return { ok: false, error: "Versão congelada — cancelamento bloqueado." };

  const hoje = new Date();
  const canceladoEm = `${String(hoje.getMonth() + 1).padStart(2, "0")}/${String(hoje.getDate()).padStart(2, "0")}/${hoje.getFullYear()}`;
  await db
    .update(schema.despesas)
    .set({
      cancelado: true,
      canceladoEm,
      canceladoPor: ctx.userEmail || ctx.userId || null,
      motivoCancelamento: motivo?.trim() || null,
      status: "Cancelada",
    })
    .where(and(eq(schema.despesas.id, id), eq(schema.despesas.tenantId, ctx.tenant.id)));
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "despesa.cancel",
    entity: "despesa",
    entityId: id,
    meta: { motivo: motivo?.trim() || null, valor: existing.valor, numDoc: existing.numDoc },
  });
  revalidatePath("/despesas");
  revalidatePath("/contaspagar");
  revalidatePath("/caixa");
  revalidatePath("/dre");
  revalidatePath("/fluxocaixa");
  return { ok: true };
}

export interface PagarDespesaInput {
  despesaId: string;
  dataPagamento: string; // "MM/DD/YYYY"
  valorPago: number;
  bankAccountId?: string | null;
  formaPagamento?: string | null;
  juros?: number;
  multa?: number;
  desconto?: number;
  obs?: string;
  /** Mesmo fato reenviado (duplo clique, retry, timeout) não vira dois pagamentos. */
  idempotencyKey?: string | null;
}

export type ResultadoPagarDespesa = { ok: true; pagamentoId: string; jaExistia?: boolean } | { ok: false; error: string };

/**
 * Paga uma despesa sem parcelamento (§13): registra o pagamento com encargos,
 * lança a saída real no Caixa (na data efetiva), atualiza status e conta
 * bancária — tudo numa transação, idempotente pela chave. O status sai do
 * PRINCIPAL ACUMULADO de todos os pagamentos da despesa: 100 pagos como
 * 60 + 40 é "Pago". Versão congelada bloqueia; só na Atual.
 */
export async function pagarDespesa(input: PagarDespesaInput): Promise<ResultadoPagarDespesa> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "editar")) {
    return { ok: false, error: "Sem permissão para registrar pagamentos." };
  }
  const idem = input.idempotencyKey?.trim() || null;
  const jaExiste = async () => {
    if (!idem) return null;
    const [e] = await db
      .select({ id: schema.pagamentos.id })
      .from(schema.pagamentos)
      .where(and(eq(schema.pagamentos.tenantId, ctx.tenant.id), eq(schema.pagamentos.idempotencyKey, idem)))
      .limit(1);
    return e?.id ?? null;
  };
  const existente = await jaExiste();
  if (existente) return { ok: true, pagamentoId: existente, jaExistia: true };

  const alvo = await despesaDoTenant(ctx.tenant.id, input.despesaId);
  if (!alvo) return { ok: false, error: "Despesa não encontrada." };
  const d = alvo.d;
  if (d.cancelado) return { ok: false, error: "Despesa cancelada não pode ser paga." };
  if (alvo.locked) return { ok: false, error: "Versão congelada — pagamento bloqueado." };
  if (alvo.versionKind !== "atual") {
    return { ok: false, error: "Esta despesa está numa versão de planejamento; pagamento só na versão Atual." };
  }

  const juros = input.juros || 0;
  const multa = input.multa || 0;
  const desconto = input.desconto || 0;
  const valorPago = input.valorPago > 0 ? input.valorPago : Number(d.valor) + juros + multa - desconto;
  const recusa = recusaDePagamento({ valorTotalPago: valorPago, dataPagamento: input.dataPagamento });
  if (recusa) return { ok: false, error: recusa };

  try {
    const pagamentoId = await db.transaction(async (tx) => {
      // Trava a despesa: dois pagamentos simultâneos não leem o mesmo acumulado.
      await tx.execute(sql`select 1 from ${schema.despesas} where ${schema.despesas.id} = ${d.id} for update`);
      const [pag] = await tx
        .insert(schema.pagamentos)
        .values({
          tenantId: ctx.tenant.id,
          despesaId: d.id,
          parcelaId: null,
          valorOriginal: String(d.valor),
          desconto: String(desconto),
          multa: String(multa),
          juros: String(juros),
          outrosAcrescimos: "0",
          valorTotalPago: String(valorPago),
          dataPagamento: input.dataPagamento,
          bankAccountId: input.bankAccountId || null,
          obs: input.obs || null,
          idempotencyKey: idem,
          usuarioId: ctx.userId,
        })
        .returning();

      // Status pelo principal ACUMULADO de todos os pagamentos desta despesa (§13).
      const todos = await tx
        .select({
          valorTotalPago: schema.pagamentos.valorTotalPago,
          desconto: schema.pagamentos.desconto,
          multa: schema.pagamentos.multa,
          juros: schema.pagamentos.juros,
          outros: schema.pagamentos.outrosAcrescimos,
        })
        .from(schema.pagamentos)
        .where(and(eq(schema.pagamentos.tenantId, ctx.tenant.id), eq(schema.pagamentos.despesaId, d.id)));
      const principal = todos.reduce(
        (a, p) =>
          a +
          principalDoPagamento({
            valorTotalPago: Number(p.valorTotalPago),
            desconto: Number(p.desconto),
            multa: Number(p.multa),
            juros: Number(p.juros),
            outrosAcrescimos: Number(p.outros),
          }),
        0,
      );
      await tx
        .update(schema.despesas)
        .set({
          status: statusDaDespesaPorAcumulado(Number(d.valor), principal),
          dataCaixa: input.dataPagamento,
          formaPagamento: input.formaPagamento || d.formaPagamento,
          bancoId: input.bankAccountId || d.bancoId,
        })
        .where(and(eq(schema.despesas.id, d.id), eq(schema.despesas.tenantId, ctx.tenant.id)));

      // Saída REAL no Controle de Caixa (valor efetivamente pago, na data real).
      await tx.insert(schema.cashEntries).values({
        versionId: d.versionId,
        tenantId: ctx.tenant.id,
        bankAccountId: input.bankAccountId || null,
        data: input.dataPagamento,
        descricao: `Pagamento ${d.numDoc ?? "despesa"}`,
        valor: String(-Math.abs(valorPago)),
        cat: "despesa",
        rec: true,
      });

      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "despesa.pay",
          entity: "despesa",
          entityId: d.id,
          meta: { valorPago, juros, multa, desconto, dataPagamento: input.dataPagamento, principalAcumulado: principal },
        },
        tx,
      );
      return pag.id;
    });
    revalidatePath("/despesas");
    revalidatePath("/contaspagar");
    revalidatePath("/caixa");
    revalidatePath("/dre");
    revalidatePath("/fluxocaixa");
    return { ok: true, pagamentoId };
  } catch (e) {
    // Colisão no índice de idempotência: o mesmo fato chegou duas vezes ao
    // mesmo tempo. Devolve o que já existe.
    if (idem && /pagamento_idem_uq|duplicate key/i.test(e instanceof Error ? e.message : String(e))) {
      const id = await jaExiste();
      if (id) return { ok: true, pagamentoId: id, jaExistia: true };
    }
    throw e;
  }
}

/**
 * Lê os documentos enviados (PDF/imagem) com IA e devolve os campos da despesa
 * já traduzidos para o formulário — com os ALERTAS de cada campo que a tela
 * precisa mostrar (o que faltou e o que merece conferência).
 *
 * Aceita VÁRIOS arquivos no mesmo `file`: a compra costuma chegar em partes
 * (a nota e o comprovante do Pix), e ler tudo junto é o que permite dizer
 * "esta despesa já está paga, por PIX, em 20/07".
 *
 * O casamento com os cadastros (fornecedor, conta, categoria, obra) acontece
 * aqui no servidor, onde as listas já estão carregadas — o cliente recebe
 * pronto o que aplicar e o que sinalizar.
 *
 * IMPORTANTE: em produção o Next.js redige (esconde) a mensagem de qualquer
 * erro LANÇADO por uma Server Action, substituindo por um texto genérico em
 * inglês ("An error occurred in the Server Components render…"). Por isso os
 * erros são RETORNADOS em `{ ok: false, error }` — é o único jeito de a
 * mensagem real ("a conta está sem créditos", "arquivo grande demais") chegar
 * ao usuário. Mesmo padrão de `extractExtratoPdf` e `addDespesaDocs`.
 */
export async function extractDespesaFromDoc(
  formData: FormData,
): Promise<
  { ok: true; data: PreenchimentoDespesa } | { ok: false; error: string }
> {
  const falha = (error: string) => ({ ok: false as const, error });
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "criar")) {
    return falha("Sem permissão para lançar despesas.");
  }
  if (!isAiConfigured()) {
    return falha("Leitura por IA não configurada (defina ANTHROPIC_API_KEY).");
  }
  const files = formData
    .getAll("file")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return falha("Selecione um arquivo.");

  // Só PDF/imagem vão para a IA. Os demais anexos (XML, planilha, e-mail)
  // continuam podendo ser anexados à despesa — só não são lidos.
  const legiveis = files.filter((f) =>
    (AI_ACCEPTED_MIME as readonly string[]).includes(f.type || ""),
  );
  if (legiveis.length === 0) {
    return falha(
      "Nenhum arquivo legível pela IA — envie PDF ou imagem (PNG, JPG, WebP ou GIF).",
    );
  }
  const selecionados = legiveis.slice(0, AI_MAX_DOCS);
  for (const f of selecionados) {
    if (f.size > 10 * 1024 * 1024) {
      return falha(`"${f.name}" tem mais de 10 MB — envie um arquivo menor.`);
    }
  }

  try {
    const [todosOsCadastros, contas] = await Promise.all([
      getStakeholders(ctx.tenant.id),
      getChartAccounts(ctx.tenant.id),
    ]);
    // Prompt W, 4.2 — a proposta de lançamento novo só casa com cadastro
    // ATIVO: o seletor do formulário não oferece inativo.
    const fornecedores = todosOsCadastros.filter((f) => f.ativo);
    const categorias = categoriasDeDespesa(CATEGORIAS_DRE);
    const projetos = ctx.projects.map((p) => ({ id: p.id, nome: p.name }));

    const docs = await Promise.all(
      selecionados.map(async (f) => ({
        bytes: new Uint8Array(await f.arrayBuffer()),
        mime: f.type,
        filename: f.name,
      })),
    );

    // Decisão de 01/10/2026 (BE-2): vai ao modelo só o documento. Fornecedores,
    // obras e a própria empresa NÃO entram no prompt — o casamento com o
    // cadastro é feito abaixo, no servidor (montarPreenchimentoDespesa).
    const extraido = await comUsoDeIa({ tenantId: ctx.tenant.id, userId: ctx.userId, operacao: "despesa" }, () =>
      extractDespesaFromDocument(docs, {
        contas: contas.map((c) => ({ code: c.code, name: c.name })),
        categorias,
        tiposDocumento: TIPOS_DOCUMENTO,
      }),
    );

    return {
      ok: true,
      data: montarPreenchimentoDespesa(extraido, {
        fornecedores: fornecedores.map((f) => ({ id: f.id, nome: f.nome, doc: f.doc })),
        contas: contas.map((c) => c.code),
        categorias,
        projetos,
        formasPagamento: FORMAS_PAGAMENTO,
        tiposDocumento: TIPOS_DOCUMENTO.map((t) => t.id),
        empresaDoc: ctx.tenant.cnpj,
      }),
    };
  } catch (e) {
    // O log fica no servidor (com stack); para a tela vai a mensagem já
    // traduzida por enrichAiError ("sem créditos", "chave inválida"...).
    console.error("[despesa] falha na leitura por IA:", e);
    return falha(e instanceof Error ? e.message : "Falha ao ler o documento.");
  }
}

/** Anexa um documento (NF/contrato) a uma despesa, no R2. */
export async function uploadDespesaDoc(formData: FormData) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "criar")) {
    throw new Error("Sem permissão.");
  }
  if (!isR2Configured()) {
    throw new Error("Storage (R2) não configurado — defina as variáveis R2_*.");
  }
  const despesaId = (formData.get("despesaId") as string) || null;
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Selecione um arquivo.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Arquivo deve ter até 10 MB.");

  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const key = `tenants/${ctx.tenant.id}/docs/${Date.now()}_${safe}`;
  await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");

  await db.insert(schema.documents).values({
    tenantId: ctx.tenant.id,
    despesaId,
    storageKey: key,
    filename: file.name,
    contentType: file.type || null,
    size: file.size,
    tipo: ((formData.get("tipo") as string) || "").trim() || null,
    // Item 3.2 — nº da nota no próprio arquivo, para localizá-lo pelo número
    // sem depender do nome. Vazio herda o documento fiscal da despesa na
    // listagem do repositório.
    numeroDocumentoFiscal:
      ((formData.get("numeroDocumentoFiscal") as string) || "").trim() || null,
    uploadedBy: ctx.userEmail || ctx.userId || null,
  });
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "document.upload",
    entity: "document",
    meta: { filename: file.name, despesaId, tipo: (formData.get("tipo") as string) || null },
  });
  revalidatePath("/despesas");
}

/**
 * Anexa VÁRIOS arquivos a uma despesa existente — funciona em qualquer momento
 * do ciclo de vida: na edição, antes ou depois da conciliação e depois de a
 * despesa estar paga. Nunca substitui nem remove os anexos já existentes.
 * Retorna o erro (em vez de lançar) para a mensagem chegar à tela em produção.
 */
export async function addDespesaDocs(
  formData: FormData,
): Promise<{ ok: boolean; added?: number; error?: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "editar")) {
    return { ok: false, error: "Sem permissão para anexar documentos." };
  }
  if (!isR2Configured()) {
    return { ok: false, error: "Storage (R2) não configurado — defina as variáveis R2_*." };
  }
  const despesaId = (formData.get("despesaId") as string) || "";
  if (!despesaId) return { ok: false, error: "Despesa não informada." };

  // A despesa precisa existir NO TENANT — não se checa status: anexar é
  // permitido inclusive depois de paga/conciliada.
  const [desp] = await db
    .select({ id: schema.despesas.id })
    .from(schema.despesas)
    .where(and(eq(schema.despesas.id, despesaId), eq(schema.despesas.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!desp) return { ok: false, error: "Despesa não encontrada." };

  const files = formData
    .getAll("file")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Selecione ao menos um arquivo." };
  for (const f of files) {
    if (f.size > 10 * 1024 * 1024) {
      return { ok: false, error: `"${f.name}" excede 10 MB.` };
    }
  }
  const tipo = ((formData.get("tipo") as string) || "").trim() || null;

  try {
    for (const file of files) {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const key = `tenants/${ctx.tenant.id}/docs/${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}_${safe}`;
      await putObject(
        key,
        new Uint8Array(await file.arrayBuffer()),
        file.type || "application/octet-stream",
      );
      await db.insert(schema.documents).values({
        tenantId: ctx.tenant.id,
        despesaId,
        storageKey: key,
        filename: file.name,
        contentType: file.type || null,
        size: file.size,
        tipo,
        uploadedBy: ctx.userEmail || ctx.userId || null,
      });
    }
  } catch (e) {
    console.error("[despesa] falha ao anexar documentos:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Falha ao enviar os arquivos.",
    };
  }

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "document.upload",
    entity: "despesa",
    entityId: despesaId,
    meta: { arquivos: files.map((f) => f.name), qtd: files.length, tipo },
  });
  revalidatePath("/despesas");
  revalidatePath("/contaspagar");
  return { ok: true, added: files.length };
}

/**
 * Desvincula UM anexo da despesa, sem afetar os demais.
 *
 * ZERO PERDA DE DADOS: remove-se apenas a linha de `document` (o vínculo). O
 * objeto NÃO é apagado do storage (R2), de modo que o arquivo continua
 * recuperável pela storageKey registrada na auditoria. Mesmo critério já
 * adotado na exclusão de documentos de projeto.
 */
export async function deleteDespesaDoc(
  documentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "despesas", "editar")) {
    return { ok: false, error: "Sem permissão para remover anexos." };
  }
  const [doc] = await db
    .select()
    .from(schema.documents)
    .where(and(eq(schema.documents.id, documentId), eq(schema.documents.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!doc) return { ok: false, error: "Anexo não encontrado." };

  await db.delete(schema.documents).where(eq(schema.documents.id, doc.id));

  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "document.unlink",
    entity: "despesa",
    entityId: doc.despesaId ?? "—",
    // storageKey fica registrada: o arquivo permanece no storage e pode ser
    // revinculado se a remoção tiver sido indevida.
    meta: { documentId: doc.id, filename: doc.filename, storageKey: doc.storageKey },
  });
  revalidatePath("/despesas");
  revalidatePath("/contaspagar");
  return { ok: true };
}

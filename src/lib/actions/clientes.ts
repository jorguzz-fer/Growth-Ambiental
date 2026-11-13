"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getProjectContext, getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { houveMudanca } from "@/lib/audit-diff";
import { isR2Configured, putObject } from "@/lib/storage/r2";
import {
  CAMPOS_SENSIVEIS_CLIENTE,
  TELA_DADOS_CLIENTE,
  changesSemValorSensivel,
  mascararDocumento,
} from "@/lib/clientes-sensivel";
import {
  LIMITE_UPLOAD_BYTES,
  LIMITE_UPLOAD_MB,
  bloqueiosDeExclusao,
  confirmacaoConfere,
  recusaDeInteresse,
  recusaDeStatusContrato,
  statusLiberaUnidade,
} from "@/lib/clientes-regras";
import { vinculosDoCliente } from "@/lib/clientes-vinculos";

/**
 * Retorno legível das actions de cliente (Prompt M, 6.10): exceção de Server
 * Action chega sem mensagem ao navegador em produção; `redirect` também não
 * serve a quem precisa ler o erro. A tela navega quando `ok`.
 */
export type ResultadoCliente = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Remove do que vai ser gravado os campos que quem salva não pode editar
 * (Prompt M, 5.4). Sem isto, o formulário de quem não vê os campos sensíveis
 * os mandaria vazios e o Salvar APAGARIA renda, FGTS e score do comprador.
 * O CPF segue a mesma regra, mas pode ser substituído: vazio = mantém.
 */
function soCamposPermitidos<T extends Record<string, unknown>>(
  dados: T,
  podeEditarSensivel: boolean,
): Partial<T> {
  if (podeEditarSensivel) return dados;
  const out: Record<string, unknown> = { ...dados };
  for (const k of CAMPOS_SENSIVEIS_CLIENTE) delete out[k];
  if (out.cpfCnpj == null) delete out.cpfCnpj;
  return out as Partial<T>;
}

const s = (fd: FormData, k: string) => {
  const v = (fd.get(k) as string) ?? "";
  return v.trim() ? v.trim() : null;
};
/** Máximo representável em numeric(15,2) — evita "numeric field overflow". */
const NUMERIC_15_2_MAX = 9999999999999.99;
/**
 * Interpreta um valor monetário do formulário como número, tolerando os dois
 * formatos que os campos podem enviar:
 *  - BR ("1.000.000,00"): pontos são milhares, vírgula é o decimal;
 *  - padrão de <input type="number"> ("1000000.00" / "1000000"): o ponto é o
 *    decimal — NÃO pode ser removido (senão o valor é multiplicado por 100 a
 *    cada save, chegando a estourar a coluna).
 * O resultado é limitado ao teto de numeric(15,2) para nunca quebrar o INSERT.
 */
const num = (fd: FormData, k: string) => {
  const v = s(fd, k);
  if (v == null) return null;
  let t = v.replace(/\s/g, "").replace(/r\$/gi, "");
  // Se há vírgula, é formato BR: pontos = milhares, vírgula = decimal.
  // Sem vírgula, o ponto já é o separador decimal (ou não há decimal).
  t = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(-NUMERIC_15_2_MAX, Math.min(NUMERIC_15_2_MAX, n));
  return String(clamped);
};
const int = (fd: FormData, k: string) => {
  const v = s(fd, k);
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

function readCliente(fd: FormData) {
  return soOsEnviados(fd, {
    unitCode: s(fd, "unitCode"),
    statusContrato: s(fd, "statusContrato"),
    // Sem nome: vazio — a action recusa (6.4). Antes virava "Sem nome".
    nomeCompleto: s(fd, "nomeCompleto"),
    cpfCnpj: s(fd, "cpfCnpj"),
    nascimento: s(fd, "nascimento"),
    nacionalidade: s(fd, "nacionalidade"),
    estadoCivil: s(fd, "estadoCivil"),
    endereco: s(fd, "endereco"),
    cidadeEstado: s(fd, "cidadeEstado"),
    cep: s(fd, "cep"),
    emailPrincipal: s(fd, "emailPrincipal"),
    emailSecundario: s(fd, "emailSecundario"),
    celular: s(fd, "celular"),
    telefone: s(fd, "telefone"),
    bancoFinanc: s(fd, "bancoFinanc"),
    rendaBruta: num(fd, "rendaBruta"),
    rendaLiquida: num(fd, "rendaLiquida"),
    comprometimento: s(fd, "comprometimento"),
    possuiFgts: s(fd, "possuiFgts"),
    saldoFgts: num(fd, "saldoFgts"),
    scoreCredito: int(fd, "scoreCredito"),
    restricoes: s(fd, "restricoes"),
    morarOuInvestir: s(fd, "morarOuInvestir"),
    ramoAtividade: s(fd, "ramoAtividade"),
    cargoFuncao: s(fd, "cargoFuncao"),
    areaAtuacao: s(fd, "areaAtuacao"),
    empresa: s(fd, "empresa"),
    regimeTrabalho: s(fd, "regimeTrabalho"),
    localTrabalho: s(fd, "localTrabalho"),
    tempoEmpresa: s(fd, "tempoEmpresa"),
    possuiImovel: s(fd, "possuiImovel"),
    motivacaoCompra: s(fd, "motivacaoCompra"),
    comoConheceu: s(fd, "comoConheceu"),
    indicadoPor: s(fd, "indicadoPor"),
    interesse: int(fd, "interesse"),
    obsEstrategicas: s(fd, "obsEstrategicas"),
    // 0080 — contratante
    nomeFantasia: s(fd, "nomeFantasia"),
    contatoAdmNome: s(fd, "contatoAdmNome"),
    contatoAdmEmail: s(fd, "contatoAdmEmail"),
    contatoAdmTelefone: s(fd, "contatoAdmTelefone"),
    contatoTecnicoNome: s(fd, "contatoTecnicoNome"),
    contatoTecnicoEmail: s(fd, "contatoTecnicoEmail"),
    contatoTecnicoTelefone: s(fd, "contatoTecnicoTelefone"),
    contatoFinanceiroNome: s(fd, "contatoFinanceiroNome"),
    contatoFinanceiroEmail: s(fd, "contatoFinanceiroEmail"),
    contatoFinanceiroTelefone: s(fd, "contatoFinanceiroTelefone"),
  });
}

/**
 * Growth Ambiental: o formulário do contratante não tem mais os campos de
 * comprador de imóvel (unidade, renda, FGTS, score…). Campo que NÃO veio no
 * formulário fica fora da gravação — o Salvar não apaga o que já estava
 * gravado. O nome (razão social) é sempre lido: vazio é recusado.
 */
function soOsEnviados<T extends Record<string, unknown>>(fd: FormData, dados: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dados)) if (k === "nomeCompleto" || fd.has(k)) out[k] = v;
  return out as T;
}

/**
 * Impede vincular uma unidade já vinculada a OUTRO cliente com contrato ativo
 * (uma unidade vendida não pode ser vendida de novo). Retorna o nome do cliente
 * conflitante, ou null se disponível. Roda DENTRO da transação da gravação,
 * depois de um lock pela unidade (6.3): dois cadastros simultâneos da mesma
 * unidade não passam os dois.
 */
async function unidadeEmConflito(
  tx: Tx,
  tenantId: string,
  unitCode: string | null | undefined,
  exceptId?: string,
): Promise<string | null> {
  if (!unitCode) return null;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`cliente-unidade:${tenantId}:${unitCode}`}))`);
  const rows = await tx
    .select({
      id: schema.clientes.id,
      nome: schema.clientes.nomeCompleto,
      status: schema.clientes.statusContrato,
    })
    .from(schema.clientes)
    .where(and(eq(schema.clientes.tenantId, tenantId), eq(schema.clientes.unitCode, unitCode)));
  const conflito = rows.find((r) => r.id !== exceptId && !statusLiberaUnidade(r.status));
  return conflito?.nome ?? null;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const msgConflito = (unit: string | null | undefined, nome: string) =>
  `A unidade ${unit} já está vinculada ao cliente "${nome}". Distrate o contrato atual antes de revincular.`;

/** Erro de regra lançado dentro da transação — vira `{ ok: false }`. */
class Recusa extends Error {}

export async function addCliente(formData: FormData): Promise<ResultadoCliente> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "clientes", "criar")) {
    return { ok: false, error: "Sem permissão para cadastrar clientes." };
  }
  const dados = soCamposPermitidos(
    readCliente(formData),
    can(ctx.perms, TELA_DADOS_CLIENTE, "editar"),
  );
  const nome = dados.nomeCompleto;
  if (!nome) return { ok: false, error: "Informe o nome do cliente." };
  const recusaInteresse = recusaDeInteresse(dados.interesse);
  if (recusaInteresse) return { ok: false, error: recusaInteresse };
  const recusaStatus = recusaDeStatusContrato(dados.statusContrato);
  if (recusaStatus) return { ok: false, error: recusaStatus };
  try {
    const row = await db.transaction(async (tx) => {
      const conflito = await unidadeEmConflito(tx, ctx.tenant.id, dados.unitCode);
      if (conflito) throw new Recusa(msgConflito(dados.unitCode, conflito));
      const [r] = await tx
        .insert(schema.clientes)
        .values({ tenantId: ctx.tenant.id, ...dados, nomeCompleto: nome })
        .returning();
      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "cliente.create",
          entity: "cliente",
          entityId: r.id,
          meta: { nome: r.nomeCompleto, unitCode: r.unitCode },
        },
        tx,
      );
      return r;
    });
    revalidatePath("/clientes");
    return { ok: true, id: row.id };
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
}

export async function updateCliente(formData: FormData): Promise<ResultadoCliente> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "clientes", "editar")) {
    return { ok: false, error: "Sem permissão para editar clientes." };
  }
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Cliente inválido." };
  const novo = soCamposPermitidos(
    readCliente(formData),
    can(ctx.perms, TELA_DADOS_CLIENTE, "editar"),
  );
  const nomeNovo = novo.nomeCompleto;
  if (!nomeNovo) return { ok: false, error: "Informe o nome do cliente." };
  try {
    await db.transaction(async (tx) => {
      const [antes] = await tx
        .select()
        .from(schema.clientes)
        .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenantId, ctx.tenant.id)))
        .limit(1);
      if (!antes) throw new Recusa("Cliente não encontrado.");
      // 6.7 — fora de 1 a 5 só passa se for o valor já gravado (não é convertido).
      const recusaInteresse = recusaDeInteresse(novo.interesse, antes.interesse);
      if (recusaInteresse) throw new Recusa(recusaInteresse);
      // 6.2 — fora da lista só passa se for o status já gravado (não é convertido).
      const recusaStatus = recusaDeStatusContrato(novo.statusContrato, antes.statusContrato);
      if (recusaStatus) throw new Recusa(recusaStatus);
      const conflito = await unidadeEmConflito(tx, ctx.tenant.id, novo.unitCode, id);
      if (conflito) throw new Recusa(msgConflito(novo.unitCode, conflito));
      await tx
        .update(schema.clientes)
        .set({ ...novo, nomeCompleto: nomeNovo })
        .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenantId, ctx.tenant.id)));
      // Auditoria campo a campo: valor anterior × novo.
      const changes: Record<string, { de: unknown; para: unknown }> = {};
      for (const k of Object.keys(novo)) {
        const de = (antes as Record<string, unknown>)[k];
        const para = (novo as Record<string, unknown>)[k];
        if (String(de ?? "") !== String(para ?? "")) changes[k] = { de: de ?? null, para: para ?? null };
      }
      // Diff vazio não gera linha de log (AK, Parte 2): o formulário manda
      // todos os campos a cada Salvar.
      if (houveMudanca(changes)) {
        await logAudit(
          {
            tenantId: ctx.tenant.id,
            userId: ctx.userId,
            action: "cliente.update",
            entity: "cliente",
            entityId: id,
            // Campos sensíveis e CPF entram só como "alterado", sem valor — o
            // contador lê este log (Prompt M, 7 · nota).
            meta: { changes: changesSemValorSensivel(changes) },
          },
          tx,
        );
      }
    });
    revalidatePath("/clientes");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
}

/**
 * Exclui um cliente (6.1). Exige confirmação pelo nome e recusa quando há
 * vínculo — unidade com contrato ativo, contas a receber, documentos (que a
 * FK apagaria junto), obra ou recebimento por terceiro. A exclusão continua
 * física; a inativação é do Prompt I, 12.
 */
export async function deleteCliente(formData: FormData): Promise<ResultadoCliente> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "clientes", "excluir")) {
    return { ok: false, error: "Sem permissão para excluir clientes." };
  }
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Cliente inválido." };
  try {
    await db.transaction(async (tx) => {
      const [cli] = await tx
        .select()
        .from(schema.clientes)
        .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenantId, ctx.tenant.id)))
        .for("update")
        .limit(1);
      if (!cli) throw new Recusa("Cliente não encontrado.");
      if (!confirmacaoConfere(formData.get("confirmacao") as string, cli.nomeCompleto)) {
        throw new Recusa("Para excluir, digite o nome do cliente exatamente como está no cadastro.");
      }
      const vinculos = await vinculosDoCliente(tx, ctx.tenant.id, cli);
      const bloqueios = bloqueiosDeExclusao(vinculos);
      if (bloqueios.length) throw new Recusa(`Não é possível excluir: ${bloqueios.join("; ")}.`);
      await tx
        .delete(schema.clientes)
        .where(and(eq(schema.clientes.id, id), eq(schema.clientes.tenantId, ctx.tenant.id)));
      await logAudit(
        {
          tenantId: ctx.tenant.id,
          userId: ctx.userId,
          action: "cliente.delete",
          entity: "cliente",
          entityId: id,
          meta: {
            nome: cli.nomeCompleto,
            cpf: mascararDocumento(cli.cpfCnpj),
            unitCode: cli.unitCode,
            documentos: vinculos.documentos,
          },
        },
        tx,
      );
    });
    revalidatePath("/clientes");
    return { ok: true };
  } catch (e) {
    if (e instanceof Recusa) return { ok: false, error: e.message };
    throw e;
  }
}

/** Tipos aceitos para documento de venda/contrato (6.9.1). */
const TIPOS_DOC_CLIENTE = [
  "Contrato assinado",
  "Proposta",
  "Documentos do comprador",
  "Comprovante",
  "Termo aditivo",
  "Distrato",
  "Outros",
];

/**
 * Anexa um documento de venda/contrato a um cliente (e, opcionalmente, à
 * unidade/projeto). Tipo obrigatório (6.9.1). A versão é POR TIPO (6.5):
 * outro arquivo do mesmo tipo vira a versão seguinte e preserva a anterior;
 * tipos diferentes têm numeração própria. Nenhuma versão já gravada muda.
 */
export async function uploadClienteDoc(formData: FormData): Promise<ResultadoCliente> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "clientes", "editar")) {
    return { ok: false, error: "Sem permissão para anexar documentos." };
  }
  if (!isR2Configured()) {
    return { ok: false, error: "Storage (R2) não configurado — defina as variáveis R2_*." };
  }
  const clienteId = (formData.get("clienteId") as string) || "";
  if (!clienteId) return { ok: false, error: "Cliente inválido." };
  const [cli] = await db
    .select({ id: schema.clientes.id, unitCode: schema.clientes.unitCode })
    .from(schema.clientes)
    .where(and(eq(schema.clientes.id, clienteId), eq(schema.clientes.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!cli) return { ok: false, error: "Cliente não encontrado." };

  const tipo = ((formData.get("tipo") as string) || "").trim();
  if (!TIPOS_DOC_CLIENTE.includes(tipo)) return { ok: false, error: "Escolha o tipo do documento." };
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Selecione um arquivo." };
  if (file.size > LIMITE_UPLOAD_BYTES) {
    return { ok: false, error: `Arquivo deve ter até ${LIMITE_UPLOAD_MB} MB.` };
  }
  // Projeto informado: só da empresa (Prompt A, 38) — antes era gravado sem conferir.
  const projectIdBruto = (formData.get("projectId") as string) || null;
  const projectId =
    projectIdBruto && (await getProjectContext(ctx.tenant.id, projectIdBruto)) ? projectIdBruto : null;

  // Versão: maior versão do mesmo cliente E TIPO, + 1 (6.5). Antes filtrava só
  // o cliente: um comprovante depois do contrato v1 virava "comprovante v2".
  const anteriores = await db
    .select({ versao: schema.documents.versao })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.clienteId, clienteId),
        eq(schema.documents.tenantId, ctx.tenant.id),
        eq(schema.documents.tipo, tipo),
      ),
    )
    .orderBy(desc(schema.documents.versao))
    .limit(1);
  const versao = (anteriores[0]?.versao ?? 0) + 1;

  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const key = `tenants/${ctx.tenant.id}/vendas/${Date.now()}_${safe}`;
  await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type || "application/octet-stream");

  await db.insert(schema.documents).values({
    tenantId: ctx.tenant.id,
    clienteId,
    unitCode: (formData.get("unitCode") as string) || cli.unitCode || null,
    projectId,
    storageKey: key,
    filename: file.name,
    contentType: file.type || null,
    size: file.size,
    tipo,
    versao,
    uploadedBy: ctx.userEmail || ctx.userId || null,
  });
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "cliente.doc.upload",
    entity: "document",
    entityId: clienteId,
    meta: { filename: file.name, tipo, versao, storageKey: key },
  });
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

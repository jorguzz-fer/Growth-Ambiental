import * as XLSX from "xlsx";
import JSZip from "jszip";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  getCashByTenant,
  getContasReceber,
  getDespesasByTenant,
  getDocuments,
} from "@/lib/queries";
import { isR2Configured, getObjectBytes } from "@/lib/storage/r2";
import { dateBR } from "@/lib/utils";
import {
  currentSemesterKey,
  lastClosedSemesterKey,
  semesterInfo,
  semesterOfMonthKey,
  semesterOrdinal,
  internalDateInSemester,
  type SemesterInfo,
} from "@/lib/semester";
import { semestrePendente, semestreSalvo, type BackupFeito } from "@/lib/backup-historico";

export interface SemesterSummary {
  key: string;
  label: string;
  despesas: number;
  contasReceber: number;
  caixa: number;
  documentos: number;
  total: number;
  /** Semestre já encerrado (anterior ao corrente). */
  closed: boolean;
  /** Último instante do semestre. */
  fim: Date;
  /** Prompt AO, 6.3: o último download deste semestre (pela Auditoria). */
  ultimoBackup: BackupFeito | null;
}

export interface SemesterListing {
  semesters: SemesterSummary[];
  currentKey: string;
  lastClosedKey: string;
  /** Chave do último semestre encerrado que possui dados (para o aviso). */
  pendingKey: string | null;
}

/** Semestre de uma data interna "MM/DD/YYYY". */
function semKeyOfInternalDate(d: string | null): string | null {
  if (!d) return null;
  const p = d.split("/");
  if (p.length !== 3) return null;
  const [mo, day, y] = p.map(Number);
  if (!y || !mo || !day) return null;
  return `${y}-H${mo <= 6 ? 1 : 2}`;
}

/** Semestre de uma data (Date). */
function semKeyOfDate(d: Date | null): string | null {
  if (!d) return null;
  return `${d.getFullYear()}-H${d.getMonth() < 6 ? 1 : 2}`;
}

/**
 * Prompt AO, Parte 6 — o último download de cada semestre, lido do registro
 * `backup.download` da Auditoria (quem e quando).
 */
export async function ultimosBackups(tenantId: string): Promise<Map<string, BackupFeito>> {
  const rows = await db
    .select({ chave: schema.auditLog.entityId, em: schema.auditLog.createdAt, email: schema.users.email, userId: schema.auditLog.userId })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLog.userId))
    .where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, "backup.download")))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(500);
  const out = new Map<string, BackupFeito>();
  for (const r of rows) if (r.chave && !out.has(r.chave)) out.set(r.chave, { em: r.em, por: r.email ?? r.userId ?? "—" });
  return out;
}

/**
 * Semestres do tenant que possuem dados (despesas, contas a receber, caixa ou
 * documentos), do mais recente para o mais antigo, com a contagem por tipo.
 */
export async function listSemesters(
  tenantId: string,
  today: Date = new Date(),
): Promise<SemesterListing> {
  const [despesas, receber, caixa, documentos, backups] = await Promise.all([
    getDespesasByTenant(tenantId),
    getContasReceber(tenantId),
    getCashByTenant(tenantId),
    getDocuments(tenantId),
    ultimosBackups(tenantId),
  ]);

  const acc = new Map<string, SemesterSummary>();
  type CountField = "despesas" | "contasReceber" | "caixa" | "documentos";
  const bump = (key: string | null, field: CountField) => {
    if (!key) return;
    const info = semesterInfo(key);
    if (!info) return;
    const s =
      acc.get(key) ??
      ({
        key,
        label: info.label,
        despesas: 0,
        contasReceber: 0,
        caixa: 0,
        documentos: 0,
        total: 0,
        closed: false,
        fim: info.end,
        ultimoBackup: backups.get(key) ?? null,
      } as SemesterSummary);
    s[field] += 1;
    s.total += 1;
    acc.set(key, s);
  };

  for (const d of despesas) bump(semesterOfMonthKey(d.competencia ?? ""), "despesas");
  for (const r of receber)
    bump(semKeyOfInternalDate(r.vencimento ?? r.dataRecebimento), "contasReceber");
  for (const c of caixa) bump(semKeyOfInternalDate(c.data), "caixa");
  for (const doc of documentos) bump(semKeyOfDate(doc.uploadedAt ?? null), "documentos");

  const currentKey = currentSemesterKey(today);
  const lastClosedKey = lastClosedSemesterKey(today);
  const lastClosedOrd = semesterOrdinal(lastClosedKey);

  const semesters = [...acc.values()]
    .map((s) => ({ ...s, closed: semesterOrdinal(s.key) <= lastClosedOrd }))
    .sort((a, b) => semesterOrdinal(b.key) - semesterOrdinal(a.key));

  // Aviso: último semestre ENCERRADO que tem dados e ainda não foi salvo
  // depois de encerrado (Prompt AO, 6.3 — antes reaparecia sempre).
  const pendingKey = semestrePendente(semesters, backups);

  return { semesters, currentKey, lastClosedKey, pendingKey };
}

/**
 * Verificação leve (para o aviso global no layout): o último semestre encerrado
 * tem dados? Usa contagens indexadas por tenant — barato para rodar por página.
 */
export async function hasPendingSemesterBackup(
  tenantId: string,
  today: Date = new Date(),
): Promise<{ key: string; label: string; has: boolean }> {
  const key = lastClosedSemesterKey(today);
  const info = semesterInfo(key);
  if (!info) return { key, label: key, has: false };
  // Prompt AO, 6.3: já baixado depois de encerrado → o aviso não volta.
  const [ultimo] = await db
    .select({ em: schema.auditLog.createdAt })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.tenantId, tenantId), eq(schema.auditLog.action, "backup.download"), eq(schema.auditLog.entityId, key)))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(1);
  if (ultimo && semestreSalvo(info.end, { em: ultimo.em, por: "" })) return { key, label: info.label, has: false };

  const [d] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.despesas)
    .where(
      and(
        eq(schema.despesas.tenantId, tenantId),
        inArray(schema.despesas.competencia, info.months),
      ),
    );
  let n = Number(d?.n ?? 0);
  if (n === 0) {
    const [doc] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.tenantId, tenantId),
          gte(schema.documents.uploadedAt, info.start),
          lte(schema.documents.uploadedAt, info.end),
        ),
      );
    n = Number(doc?.n ?? 0);
  }
  return { key, label: info.label, has: n > 0 };
}

/** Prompt AO, 6.2 — o que o pacote continha, para o registro do download. */
export interface ConteudoDoPacote {
  despesas: number;
  contasReceber: number;
  caixa: number;
  documentos: number;
  documentosNoPeriodo: number;
  documentosFalhos: number;
}

function sheetFromAoa(rows: (string | number)[][]) {
  return XLSX.utils.aoa_to_sheet(rows);
}

/**
 * A planilha legível de 3 abas (Despesas, Contas a Receber, Caixa). É a MESMA
 * do backup simples e do pacote completo (Prompt AO, 3.1 e 11.1): quem já usa
 * o arquivo não muda nada.
 */
export async function planilhaDoSemestre(tenantId: string, info: SemesterInfo) {
  const monthSet = new Set(info.months);
  const [despesas, receber, caixa] = await Promise.all([
    getDespesasByTenant(tenantId),
    getContasReceber(tenantId),
    getCashByTenant(tenantId),
  ]);

  const despRows = despesas.filter((d) => monthSet.has(d.competencia ?? ""));
  const recRows = receber.filter((r) =>
    internalDateInSemester(r.vencimento ?? r.dataRecebimento, info),
  );
  const cxRows = caixa.filter((c) => internalDateInSemester(c.data, info));

  // ── Planilha (XLSX) ────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromAoa([
      ["Competência", "Nº Doc", "Projeto", "Conta do plano", "Categoria DRE", "Vencimento", "Valor", "Status"],
      ...despRows.map((d) => [
        d.competencia ?? "",
        d.numDoc ?? "",
        d.projectName ?? "",
        d.contaCef ?? "",
        d.categoriaDre ?? "",
        d.vencimento ? dateBR(d.vencimento) : "",
        Number(d.valor),
        d.status ?? "",
      ]),
    ]),
    "Despesas",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromAoa([
      ["Projeto", "Unidade", "Cliente", "Descrição", "Tipo", "Vencimento", "Recebimento", "Valor", "Recebido", "Status"],
      ...recRows.map((r) => [
        r.projectName ?? "",
        r.unitCode ?? "",
        r.clienteNome ?? "",
        r.descricao ?? "",
        r.tipo ?? "",
        r.vencimento ? dateBR(r.vencimento) : "",
        r.dataRecebimento ? dateBR(r.dataRecebimento) : "",
        Number(r.valor),
        Number(r.valorRecebido),
        r.status ?? "",
      ]),
    ]),
    "Contas a Receber",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheetFromAoa([
      ["Data", "Descrição", "Categoria", "Valor", "Conciliado"],
      ...cxRows.map((c) => [
        c.data ? dateBR(c.data) : "",
        c.descricao ?? "",
        c.cat ?? "",
        Number(c.valor),
        c.rec ? "Sim" : "Não",
      ]),
    ]),
    "Caixa",
  );

  const xlsxBytes = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
  return { xlsxBytes, despRows, recRows, cxRows };
}

/**
 * Monta o ZIP de backup de um semestre: uma planilha com os dados do período
 * (Despesas, Contas a Receber, Caixa) e os documentos salvos no período.
 * NÃO remove nada do banco — é apenas uma cópia de segurança.
 */
export async function buildSemesterZip(
  tenantId: string,
  key: string,
  tenantName: string,
): Promise<{ filename: string; bytes: Uint8Array; conteudo: ConteudoDoPacote } | null> {
  const info = semesterInfo(key);
  if (!info) return null;

  const [{ xlsxBytes, despRows, recRows, cxRows }, documentos] = await Promise.all([planilhaDoSemestre(tenantId, info), getDocuments(tenantId)]);
  const docRows = documentos.filter(
    (doc) => semKeyOfDate(doc.uploadedAt ?? null) === key,
  );

  // ── ZIP (planilha + documentos) ────────────────────────────────────────────
  const zip = new JSZip();
  const slug = key.replace(/[^\w-]+/g, "");
  zip.file(`dados_${slug}.xlsx`, xlsxBytes);

  const docsFolder = zip.folder("documentos");
  let docsIncluidos = 0;
  const docsFalhos: string[] = [];
  if (docRows.length > 0 && isR2Configured() && docsFolder) {
    for (let i = 0; i < docRows.length; i++) {
      const doc = docRows[i];
      try {
        const bytes = await getObjectBytes(doc.storageKey);
        const safe = (doc.filename || `documento_${i + 1}`).replace(/[^\w.\-]+/g, "_");
        docsFolder.file(`${String(i + 1).padStart(3, "0")}_${safe}`, bytes);
        docsIncluidos++;
      } catch {
        docsFalhos.push(doc.filename || doc.storageKey);
      }
    }
  }

  const leiaMe = [
    `Backup — ${tenantName}`,
    `Semestre: ${info.label}`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "Conteúdo desta cópia de segurança:",
    `- Despesas: ${despRows.length}`,
    `- Contas a Receber: ${recRows.length}`,
    `- Lançamentos de Caixa: ${cxRows.length}`,
    `- Documentos: ${docsIncluidos}${docRows.length > docsIncluidos ? ` (de ${docRows.length})` : ""}`,
    docsFalhos.length ? `- Documentos não baixados: ${docsFalhos.join(", ")}` : "",
    !isR2Configured() && docRows.length
      ? "- Observação: storage (R2) não configurado — documentos não incluídos."
      : "",
    "",
    "Observação: este backup é apenas uma cópia. Nenhum dado foi removido do sistema.",
  ]
    .filter(Boolean)
    .join("\n");
  zip.file("_leia-me.txt", leiaMe);

  const bytes = await zip.generateAsync({ type: "uint8array" });
  const tenantSlug = (tenantName || "tenant").replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  return {
    filename: `Backup_${tenantSlug}_${slug}.zip`,
    bytes,
    conteudo: {
      despesas: despRows.length,
      contasReceber: recRows.length,
      caixa: cxRows.length,
      documentos: docsIncluidos,
      documentosNoPeriodo: docRows.length,
      documentosFalhos: docsFalhos.length,
    },
  };
}

export type { SemesterInfo };

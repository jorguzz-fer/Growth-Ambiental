import { getTenantContext, getVersionContext } from "@/lib/context";
import {
  getDespesas,
  getInccRows,
  getPermutas,
  getReembolsos,
  getUnits,
} from "@/lib/queries";
import { can } from "@/lib/permissions";
import { emptyPlan } from "@/lib/calc/plan";
import { buildExportBuffer, type ExportData } from "@/lib/xlsx/growth-template";
import { planilhaDaEmpresa } from "@/lib/planocontas-servidor";

export const dynamic = "force-dynamic";

// Prompt AP, BAP-3: a planilha da versão saiu de /versao e mora na tela
// Projetos. Exige `projeto:editar` — pelo padrão, owner e admin, como
// `versao` antes. A versão continua validada no tenant (?v=).

/**
 * Download dos dados JÁ PREENCHIDOS de uma versão, no MESMO formato da planilha
 * modelo (reimportável). ?v= indica a versão — obrigatório (Prompt A): a
 * obra, e o INCC exportado, saem da própria versão, validada no tenant.
 */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "projeto", "editar")) {
    return new Response("Não autorizado", { status: 403 });
  }

  const alvo = await getVersionContext(ctx.tenant.id, new URL(req.url).searchParams.get("v"));
  if (!alvo) return new Response("Versão não encontrada", { status: 404 });
  const { version, project } = alvo;

  const [unitRows, reembRows, permRows, despRows, incc, plano] = await Promise.all([
    getUnits(ctx.tenant.id, version.id),
    getReembolsos(ctx.tenant.id, version.id),
    getPermutas(ctx.tenant.id, version.id),
    getDespesas(version.id),
    getInccRows(ctx.tenant.id, project.id),
    planilhaDaEmpresa(ctx.tenant.id),
  ]);

  const data: ExportData = {
    incc,
    units: unitRows.map((u) => ({
      code: u.code,
      bloco: u.bloco,
      tipo: u.tipo,
      m2: u.m2 != null ? Number(u.m2) : null,
      andar: u.andar,
      valor: Number(u.valor),
      status: u.status,
      mesVenda: u.mesVenda,
      plan: u.paymentPlan ?? emptyPlan(),
    })),
    reembolsos: reembRows.map((r) => ({
      data: r.data ?? "",
      origem: r.origem ?? "",
      valor: Number(r.valor ?? 0),
      pct: r.pct ?? "",
      obs: r.obs ?? "",
      serial: r.serial ?? null,
    })),
    permutas: permRows.map((p) => ({
      unitCode: p.unitCode ?? "",
      cliente: p.cliente ?? "",
      dataRecebimento: p.dataRecebimento ?? "",
      tipo: p.tipo ?? "",
      descricao: p.descricao ?? "",
      estimado: Number(p.estimado ?? 0),
      status: p.status ?? "",
      dataVenda: p.dataVenda ?? "",
      valorVenda: Number(p.valorVenda ?? 0),
      tipoPermuta: p.tipoPermuta ?? "",
      obs: p.obs ?? "",
    })),
    despesas: despRows
      // Cancelada não vai para a planilha: reimportada, voltaria ativa.
      .filter((d) => d.contaCef && d.competencia && !d.cancelado)
      .map((d) => ({
        contaCef: d.contaCef as string,
        competencia: d.competencia as string,
        valor: Number(d.valor),
      })),
  };

  const buffer = buildExportBuffer(data, plano);
  const slug = version.label.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  const filename = `Growth_Tools_Dados_${slug || "versao"}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

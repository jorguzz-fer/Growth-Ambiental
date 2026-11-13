import { getTenantContext, getVersionContext } from "@/lib/context";
import { getInccRows } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { buildTemplateBuffer } from "@/lib/xlsx/growth-template";
import { planilhaDaEmpresa } from "@/lib/planocontas-servidor";

export const dynamic = "force-dynamic";

// Prompt AP, BAP-3: a planilha da versão saiu de /versao e mora na tela
// Projetos. Exige `projeto:editar` — pelo padrão, owner e admin, como
// `versao` antes. A versão continua validada no tenant (?v=).

/** Download da planilha modelo (.xlsx) no formato padrão Growth Tools. */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "projeto", "editar")) {
    return new Response("Não autorizado", { status: 403 });
  }

  // Versão indicada por ?v= (obrigatória, validada no tenant); o INCC é o da
  // obra DELA — não o da obra do cookie (Prompt A).
  const alvo = await getVersionContext(ctx.tenant.id, new URL(req.url).searchParams.get("v"));
  if (!alvo) return new Response("Versão não encontrada", { status: 404 });
  const { version, project } = alvo;

  const [incc, plano] = await Promise.all([getInccRows(ctx.tenant.id, project.id), planilhaDaEmpresa(ctx.tenant.id)]);
  const buffer = buildTemplateBuffer(incc, plano);
  const slug = version.label.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  const filename = `Growth_Tools_Modelo_${slug || "versao"}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

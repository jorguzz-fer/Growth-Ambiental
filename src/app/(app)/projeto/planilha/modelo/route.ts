import { getTenantContext, getVersionContext } from "@/lib/context";
import { calendarioDoProjeto } from "@/lib/calendario-projeto";
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

  // Versão indicada por ?v= (obrigatória, validada no tenant); os meses são os
  // da obra DELA — não o da obra do cookie (Prompt A).
  const alvo = await getVersionContext(ctx.tenant.id, new URL(req.url).searchParams.get("v"));
  if (!alvo) return new Response("Versão não encontrada", { status: 404 });
  const { version, project } = alvo;

  // GA-9 (Fase 2): a aba Parâmetros lista os meses do calendário do projeto
  // (antes, os da tabela INCC — os mesmos 48 meses padrão). Só os meses entram.
  const plano = await planilhaDaEmpresa(ctx.tenant.id);
  const meses = calendarioDoProjeto(project).map((m) => ({ m, mo: 0, ac: 0 }));
  const buffer = buildTemplateBuffer(meses, plano);
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

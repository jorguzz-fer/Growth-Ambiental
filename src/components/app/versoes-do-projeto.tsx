import type { Version } from "@/lib/context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BotaoTrava } from "@/components/app/botao-trava";
import { ImportVersion } from "@/components/app/import-version";
import { ROTULO_KIND, textoDaTrava } from "@/lib/versao-trava";

/**
 * Versões de um projeto na tela Projetos (Prompt AP, BAP-2 e BAP-3).
 *
 * O que morava em /versao e não tinha outro lugar: a TRAVA da versão Atual e
 * das cópias (Orçamento e Previsão também a têm na própria barra) e a
 * PLANILHA da versão Atual — modelo, exportação e importação. A importação só
 * grava lançamentos na Atual e só em categoria vazia: nunca apaga.
 */
export function VersoesDoProjeto({
  versions,
  podeTravar,
  podePlanilha,
}: {
  versions: Version[];
  podeTravar: boolean;
  podePlanilha: boolean;
}) {
  const atual = versions.find((v) => v.kind === "atual") ?? null;
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Versões do projeto</h3>
          <p className="mb-3 text-[12px] text-[var(--color-ink3)]">
            Cada versão é construída na própria tela. Versão travada recusa lançamentos e edições.
          </p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                <th className="py-1.5">Versão</th>
                <th className="py-1.5">Tipo</th>
                <th className="py-1.5">Situação</th>
                <th className="py-1.5">Trava</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t border-[var(--color-line)]">
                  <td className="py-2">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: v.color }} />
                    {v.label}
                  </td>
                  <td className="py-2 text-[var(--color-ink2)]">{ROTULO_KIND[v.kind] ?? v.kind}</td>
                  <td className="py-2 text-[var(--color-ink2)]">{v.status}</td>
                  <td className="py-2">
                    <span className="inline-flex items-center gap-2">
                      <Badge tone={v.locked ? "warning" : "neutral"}>{textoDaTrava(v.locked).selo}</Badge>
                      {podeTravar && <BotaoTrava versionId={v.id} rotulo={v.label} locked={v.locked} />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {podePlanilha && atual && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Planilha da versão Atual</h3>
            <p className="mb-3 text-[12.5px] leading-relaxed text-[var(--color-ink2)]">
              As despesas da planilha (contas do plano × meses) <strong>só entram na Atual, e só se ela ainda não tiver
              despesa lançada</strong> — a importação nunca apaga nem substitui o que já foi lançado.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              <a href={`/projeto/planilha/modelo?v=${atual.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                ⬇ Planilha modelo (em branco)
              </a>
              <a href={`/projeto/planilha/exportar?v=${atual.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                ⬇ Exportar dados da Atual (.xlsx)
              </a>
            </div>
            <ImportVersion versionId={atual.id} locked={atual.locked} />
            <p className="mt-3 rounded-[8px] bg-[var(--color-surface2)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--color-ink3)]">
              ⓘ Se a versão já tiver registros de um tipo que a planilha traz, a importação é recusada inteira e
              nada é gravado. Deixe essas abas vazias ou lance pela tela.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

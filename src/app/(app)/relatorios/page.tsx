import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { isAiConfigured } from "@/lib/ai/client";
import {
  CENARIOS_RC,
  COLUNAS,
  FONTES,
  ROTULO_CENARIO_RC,
  ROTULO_COLUNAS,
  ROTULO_FONTE,
  descricaoDaReceita,
  montarTabela,
  receitaValida,
  tabelaGerencial,
} from "@/lib/relatorio-custom";
import { DIMENSOES, METRICAS, METRICAS_DE_HORAS, METRICAS_DE_POSICAO, ROTULO_DIMENSAO, ROTULO_METRICA } from "@/lib/relatorio-gerencial";
import { fatosGerenciais } from "@/lib/relatorio-gerencial-dados";
import { projetosDoEscopo, rotuloDoEscopo } from "@/lib/projeto-selecao";
import { colunasDoRelatorio } from "@/lib/relatorio-custom-dados";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/app/access-denied";
import { RelatorioChat } from "@/components/app/relatorio-chat";
import { RelatorioTabela } from "@/components/app/relatorio-tabela";
import { ExportarPdf } from "@/components/app/pdf";
import { CabecalhoDeImpressao } from "@/components/app/cabecalho-impressao";
import { CrisDaTela } from "@/components/app/cris-contexto";

export const dynamic = "force-dynamic";

const CAMPO = "h-9 rounded-[8px] border border-[var(--color-line)] bg-white px-2 text-sm";
const ROTULO = "mb-1 block font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-wide text-[var(--color-ink3)]";

/**
 * Prompt RC (Fase 3 · revisão V5, decisão de 18/10): Relatórios Customizados,
 * tela própria com chat próprio. O relatório é a receita da URL; o chat e os
 * campos só mudam a receita. Cada fonte exige ver a tela de origem (DRE ou
 * Fluxo). Só leitura.
 */
export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "relatorios", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  const receita = receitaValida(sp, ctx.projects.map((p) => p.id));
  // Cada fonte exige a tela de origem; a gerencial, Contratos (e Equipes para as métricas de horas).
  const fontesPermitidas = FONTES.filter((f) => can(ctx.perms, f === "fluxo" ? "fluxocaixa" : f === "gerencial" ? "contratos" : "dre", "ver"));
  const podeFonte = fontesPermitidas.includes(receita.fonte);
  const temPedido = !!sp.fonte;
  const metricasPermitidas = METRICAS.filter((m) => !METRICAS_DE_HORAS.includes(m) || can(ctx.perms, "equipes", "ver"));
  const gerencial = receita.fonte === "gerencial";

  const dados = podeFonte && temPedido && !gerencial ? await colunasDoRelatorio(ctx.tenant.id, ctx.projects, receita) : null;
  const escopoGerencial = (() => {
    const unica = ctx.projects.find((p) => p.id === receita.proj);
    if (unica) return { projetos: [unica], rotulo: unica.name };
    if (receita.proj === "ativos" || receita.proj === "finalizados") return { projetos: projetosDoEscopo(ctx.projects, receita.proj).projetos, rotulo: rotuloDoEscopo(receita.proj) };
    return { projetos: [...ctx.projects], rotulo: "Empresa toda" };
  })();
  const fatos = podeFonte && temPedido && gerencial ? await fatosGerenciais(ctx.tenant.id, escopoGerencial.projetos, { incluirHoras: can(ctx.perms, "equipes", "ver") }) : null;
  const tabela = dados ? montarTabela(receita.fonte, dados.colunas, dados.contas, receita.av) : fatos ? tabelaGerencial(fatos, receita, metricasPermitidas) : null;
  const descricao = dados ? descricaoDaReceita(receita, dados.escopo) : fatos ? descricaoDaReceita(receita, escopoGerencial.rotulo) : "";
  const titulo = receita.titulo || (dados ? `${ROTULO_FONTE[receita.fonte]} ${ROTULO_COLUNAS[receita.colunas]}` : "Relatórios Customizados");

  return (
    <>
      <CabecalhoDeImpressao empresa={ctx.tenant.name} geradoPor={ctx.userEmail} />
      <PageHeader
        title={titulo}
        subtitle={descricao || "Monte um relatório da DRE ou do Fluxo de Caixa: pelo chat ou pelos campos."}
        actions={tabela ? <ExportarPdf arquivo={titulo} /> : undefined}
      />
      {tabela && (
        <CrisDaTela
          titulo={`Relatório: ${titulo}`}
          dados={{ relatorio: descricao, colunas: tabela.colunas, linhas: tabela.linhas.map((l) => ({ item: l.label, valores: l.valores, pcts: l.pcts })) }}
          sugestoes={["O que mais chama atenção neste relatório?", "Qual coluna tem o pior resultado?", "Explique a análise vertical."]}
        />
      )}
      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <Card className="print:hidden">
            <CardContent className="p-4">
              <form method="get" className="flex flex-wrap items-end gap-3" data-relatorio-campos>
                <label>
                  <span className={ROTULO}>Fonte</span>
                  <select name="fonte" defaultValue={receita.fonte} className={CAMPO}>
                    {fontesPermitidas.map((f) => (
                      <option key={f} value={f}>
                        {ROTULO_FONTE[f]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={ROTULO}>Colunas</span>
                  <select name="colunas" defaultValue={receita.colunas} className={CAMPO}>
                    {COLUNAS.map((c) => (
                      <option key={c} value={c}>
                        {ROTULO_COLUNAS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="flex items-center gap-2">
                  <legend className={ROTULO}>Cenários</legend>
                  {CENARIOS_RC.map((c) => (
                    <label key={c} className="flex items-center gap-1 text-[13px]">
                      <input type="checkbox" name="cenarios" value={c} defaultChecked={receita.cenarios.includes(c)} />
                      {ROTULO_CENARIO_RC[c]}
                    </label>
                  ))}
                </fieldset>
                <label>
                  <span className={ROTULO}>Projeto</span>
                  <select name="proj" defaultValue={receita.proj} className={CAMPO}>
                    <option value="all">Empresa toda</option>
                    <option value="ativos">Projetos ativos</option>
                    <option value="finalizados">Projetos finalizados</option>
                    {ctx.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={ROTULO}>De (MM/AAAA)</span>
                  <input name="de" defaultValue={receita.de} placeholder="01/2026" className={`${CAMPO} w-24`} />
                </label>
                <label>
                  <span className={ROTULO}>Até (MM/AAAA)</span>
                  <input name="ate" defaultValue={receita.ate} placeholder="12/2026" className={`${CAMPO} w-24`} />
                </label>
                <label className="flex items-center gap-1.5 pb-2 text-[13px]">
                  <input type="checkbox" name="av" value="1" defaultChecked={receita.av} />
                  Análise vertical
                </label>
                {fontesPermitidas.includes("gerencial") && (
                  <div className="w-full rounded-[8px] border border-dashed border-[var(--color-line)] p-2" data-campos-gerencial>
                    <span className={ROTULO}>Fonte gerencial (tabela dinâmica): dimensão nas linhas e métricas nas colunas</span>
                    <div className="flex flex-wrap items-end gap-3">
                      <label>
                        <span className={ROTULO}>Linhas</span>
                        <select name="dim" defaultValue={receita.dim ?? "contrato"} className={CAMPO}>
                          {DIMENSOES.map((d) => (
                            <option key={d} value={d}>
                              {ROTULO_DIMENSAO[d]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {metricasPermitidas.map((m) => (
                          <label key={m} className="flex items-center gap-1 text-[12.5px]">
                            <input type="checkbox" name="metricas" value={m} defaultChecked={(receita.metricas ?? []).includes(m)} />
                            {ROTULO_METRICA[m]}
                          </label>
                        ))}
                      </fieldset>
                    </div>
                  </div>
                )}
                <input type="hidden" name="titulo" value={receita.titulo} />
                <Button type="submit" size="sm">
                  Montar
                </Button>
              </form>
              <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
                O endereço desta página guarda o relatório: copie o link para abrir de novo ou mandar a alguém. Quem abre vê só o que o
                acesso dele permite.
              </p>
            </CardContent>
          </Card>

          {temPedido && !podeFonte && (
            <Card>
              <CardContent className="p-6 text-center text-[var(--color-ink3)]">Sem acesso à tela de origem deste relatório.</CardContent>
            </Card>
          )}
          {dados && dados.avisos.length > 0 && (
            <div className="space-y-1" data-relatorio-avisos>
              {dados.avisos.map((a) => (
                <p key={a} className="text-[12.5px] text-[var(--color-ink3)]">
                  {a}
                </p>
              ))}
            </div>
          )}
          {tabela && (
            <Card data-pdf-bloco>
              <CardContent className="p-5">
                <RelatorioTabela tabela={tabela} arquivo={titulo} />
                <p className="mt-3 text-[11.5px] text-[var(--color-ink3)]">
                  {gerencial
                    ? `Cada número vem de um registro real (medição aprovada, fatura, despesa apropriada, reembolso, apontamento de horas), uma vez só: a linha Total é a soma das linhas. Receita reconhecida pela regra atual (fatura pelo vencimento, até hoje). ${METRICAS_DE_POSICAO.map((m) => ROTULO_METRICA[m]).join(", ")} são a posição atual e não seguem o período.`
                    : `Os números são os da ${receita.fonte === "fluxo" ? "tela Fluxo de Caixa (previsto pelo vencimento)" : "DRE"}, com as mesmas regras e chaves.`}
                </p>
              </CardContent>
            </Card>
          )}
          {!temPedido && (
            <Card>
              <CardContent className="p-8 text-center text-[var(--color-ink3)]" data-relatorio-vazio>
                Descreva o relatório no chat ou escolha os campos e clique em Montar.
              </CardContent>
            </Card>
          )}
        </div>
        <aside className="w-full shrink-0 print:hidden min-[1180px]:sticky min-[1180px]:top-4 min-[1180px]:w-[340px]">
          <Card>
            <CardContent className="h-[480px] p-4">
              <RelatorioChat iaConfigurada={isAiConfigured()} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

import { Fragment } from "react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { CHAVES } from "@/lib/chaves";
import { getPlanejamentoNaoAprovado } from "@/lib/queries";
import { previaDreDefinicaoNova } from "@/lib/dre-inputs";
import { previaFluxoDefinicaoNova } from "@/lib/fluxo-caixa";
import { previaDashboardDefinicaoNova } from "@/lib/dashboard-previa";
import { previaResumoDefinicaoNova } from "@/lib/resumo-previa";
import { previaPlanoDefinicaoNova } from "@/lib/plano-previa";
import { previaRateioDaReceita } from "@/lib/rateio-previa";
import { previaCaixaPorConta } from "@/lib/caixa-conta-previa";
import { previaParcelaRecebida } from "@/lib/parcela-previa";
import { previaCategoriaDoPlano } from "@/lib/categoria-do-plano-servidor";
import { getLinhasDaSerieIncc, toInccRows } from "@/lib/queries";
import { SERIE_DA_EMPRESA, diferencaDaSerie, mudaAlgo } from "@/lib/incc-empresa";
import { getBankAccounts } from "@/lib/queries";
import { saldoDisponivel } from "@/lib/contas-saldo";
import { brl, pct1 } from "@/lib/utils";
import { membroRestritoPorAmbiente } from "@/lib/membro-padrao";
import { avisosDaOrdem, exportacaoValida, temPreviaExportavel, VALIDADE_DA_EXPORTACAO_DIAS } from "@/lib/chaves-previa";
import { ultimasExportacoes } from "@/lib/chaves-exportacao";
import { definirChave } from "@/lib/actions/chaves";
import { FormComResultado } from "@/components/app/form-com-resultado";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Chaves de mudança por empresa (V2-BLOQUEIOS B4). Cada mudança que altera
 * número ou acesso nasce desligada; aqui se confere a prévia e se liga.
 */
export default async function ChavesPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "chaves", "ver")) return <AccessDenied />;
  const podeEditar = can(ctx.perms, "chaves", "editar");

  const linhas = await db
    .select()
    .from(schema.tenantFlags)
    .where(eq(schema.tenantFlags.tenantId, ctx.tenant.id));
  const estado = new Map(linhas.map((l) => [l.chave, l]));
  // Prompt H, 5.3: prévia da chave "rascunho_fora_dos_relatorios" (só leitura).
  const naoAprovadas = await getPlanejamentoNaoAprovado(ctx.tenant.id);
  const rascunhoLigada = estado.get("rascunho_fora_dos_relatorios")?.ligada ?? false;
  // Prompt AC, 10.3: prévia da chave "dre_definicao_nova" (só leitura).
  const previaDre = await previaDreDefinicaoNova(ctx.tenant.id, ctx.projects);
  const dreLigada = estado.get("dre_definicao_nova")?.ligada ?? false;
  // Prompt AD, 8.1: prévia da chave "fluxo_definicao_nova" (só leitura).
  const previaFluxo = await previaFluxoDefinicaoNova(ctx.tenant.id, ctx.projects, saldoDisponivel(await getBankAccounts(ctx.tenant.id)));
  // Prompt AA, 10.3: prévia da chave "dashboard_definicao_nova" (só leitura).
  const previaDashboard = await previaDashboardDefinicaoNova(ctx.tenant.id, ctx.projects);
  // Prompt AE, 6.2: prévia da chave "resumo_definicao_nova" (só leitura).
  const previaResumo = await previaResumoDefinicaoNova(ctx.tenant.id, ctx.projects);
  const previaPlano = await previaPlanoDefinicaoNova(ctx.tenant.id, ctx.projects);
  const previaRateio = await previaRateioDaReceita(ctx.tenant.id, ctx.projects);
  // Prompt AT §3 e §4: prévia da chave "caixa_conciliacao_por_conta" (só leitura).
  const previaCaixa = await previaCaixaPorConta(ctx.tenant.id);
  // Prompt AT §5.3 e BAT-6: prévia da chave "parcela_recebida_situacao" (só leitura).
  const previaParcela = await previaParcelaRecebida(ctx.tenant.id);
  // Prompt DP (BDP-3): prévia da chave "despesa_categoria_do_plano" (só leitura).
  const previaCategoria = await previaCategoriaDoPlano(ctx.tenant.id);
  const totalQueMuda = previaCategoria.reduce((a, m) => a + m.despesas, 0);
  // Prompt Q2 — o que muda em cada obra se ela passar a ler a série do INCC da empresa.
  const inccEmpresa = toInccRows(await getLinhasDaSerieIncc(ctx.tenant.id, SERIE_DA_EMPRESA));
  const previaIncc = inccEmpresa.length
    ? await Promise.all(ctx.projects.map(async (p) => ({ obra: p.name, ...diferencaDaSerie(toInccRows(await getLinhasDaSerieIncc(ctx.tenant.id, p.id)), inccEmpresa) })))
    : [];
  // Decisão de 01/10/2026: a prévia é exportada (e guardada) antes de ligar.
  const exportacoes = await ultimasExportacoes(ctx.tenant.id);
  const agora = new Date();
  const titulos = Object.fromEntries(CHAVES.map((c) => [c.id, c.titulo]));
  // A chave do membro também liga pela variável de ambiente, de antes do B4.
  const peloAmbiente: Record<string, boolean> = {
    membro_padrao_restrito: membroRestritoPorAmbiente(ctx.tenant.id),
  };

  return (
    <>
      <PageHeader title="Chaves de mudança" />
      <p className="mb-5 max-w-3xl text-[13px] leading-relaxed text-[var(--color-ink2)]">
        Mudanças que alteram número de relatório ou acesso entram <strong>desligadas</strong>.
        Desligada, a empresa continua exatamente como antes. Confira a prévia de cada uma e
        ligue quando estiver de acordo. Desligar volta ao comportamento anterior. Toda troca
        fica na Auditoria.
      </p>
      <p className="mb-5 max-w-3xl text-[13px] leading-relaxed text-[var(--color-ink2)]" data-ordem-das-chaves>
        <strong>Combinado em 01/10:</strong> as quatro definições novas entram <strong>uma de cada vez</strong>, com alguns dias
        entre elas, nesta ordem: Dashboard, Fluxo de Caixa, Resumo Executivo e DRE. Antes de ligar, exporte a prévia (o
        &ldquo;antes × depois&rdquo;) e guarde a planilha — sem a exportação dos últimos {VALIDADE_DA_EXPORTACAO_DIAS} dias a
        chave não liga. Quem exportou, quem ligou e quando ficam na Auditoria.
      </p>
      <div className="space-y-4">
        {CHAVES.map((c) => {
          const l = estado.get(c.id);
          const ligadaAqui = l?.ligada ?? false;
          const ambiente = peloAmbiente[c.id] ?? false;
          const ligada = ligadaAqui || ambiente;
          const exportavel = temPreviaExportavel(c.id);
          const exportacao = exportacoes.get(c.id);
          const exportacaoOk = exportacaoValida(exportacao?.em, agora);
          const avisos = ligadaAqui ? [] : avisosDaOrdem(c.id, estado, titulos, agora);
          return (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-[var(--color-ink)]">{c.titulo}</h2>
                  <Badge tone={ligada ? "success" : "neutral"}>{ligada ? "Ligada" : "Desligada"}</Badge>
                  {ambiente && (
                    <span className="text-[12px] text-[var(--color-ink3)]">
                      · ligada pela configuração do servidor (MEMBRO_PADRAO_RESTRITO)
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">{c.efeito}</p>
                <p className="mt-1 text-[12px] text-[var(--color-ink3)]">
                  Origem: {c.origem}
                  {l && (
                    <>
                      {" "}· última troca por {l.alteradaPor ?? "—"} em{" "}
                      {l.alteradaEm.toLocaleString("pt-BR")}
                    </>
                  )}
                </p>
                <p className="mt-2 text-[13px]">
                  Prévia:{" "}
                  <Link href={c.previa.href} className="text-[var(--color-accent2)] hover:underline">
                    {c.previa.rotulo}
                  </Link>
                </p>
                {exportavel && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]" data-exportacao={c.id}>
                    <a href={`/chaves/previa?chave=${c.id}`} className="font-medium text-[var(--color-accent2)] hover:underline" download>
                      Exportar prévia (.xlsx)
                    </a>
                    <span className={exportacaoOk || ligadaAqui ? "text-[var(--color-ink3)]" : "text-[var(--color-warning)]"}>
                      {exportacao
                        ? `Última exportação por ${exportacao.por} em ${exportacao.em.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}${exportacaoOk || ligadaAqui ? "" : ` — mais de ${VALIDADE_DA_EXPORTACAO_DIAS} dias: exporte de novo antes de ligar`}`
                        : "Ainda não exportada — exporte antes de ligar."}
                    </span>
                  </p>
                )}
                {avisos.map((a) => (
                  <p key={a} className="mt-1 text-[12.5px] text-[var(--color-warning)]" data-aviso-ordem>
                    {a}
                  </p>
                ))}
                {podeEditar &&
                  (ligadaAqui ? (
                    <FormComResultado
                      action={definirChave}
                      aoConcluir="recarregar"
                      sucesso="Chave desligada."
                      className="mt-3 flex items-center gap-3"
                    >
                      <input type="hidden" name="chave" value={c.id} />
                      <input type="hidden" name="ligar" value="0" />
                      <Button type="submit" size="sm" variant="outline">
                        Desligar
                      </Button>
                    </FormComResultado>
                  ) : (
                    <FormComResultado
                      action={definirChave}
                      aoConcluir="recarregar"
                      sucesso="Chave ligada."
                      className="mt-3 flex flex-wrap items-center gap-3"
                    >
                      <input type="hidden" name="chave" value={c.id} />
                      <input type="hidden" name="ligar" value="1" />
                      <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink2)]">
                        <input type="checkbox" name="viPrevia" />
                        Conferi a prévia e concordo com o efeito
                      </label>
                      <Button type="submit" size="sm">
                        Ligar
                      </Button>
                    </FormComResultado>
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6" id="previa-rascunho">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">
            Prévia · Orçamento em Rascunho não entra em relatório
          </h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Versões de Orçamento e Previsão Atualizada que <strong>não estão Aprovadas</strong> nesta empresa.
            {rascunhoLigada
              ? " Com a chave ligada, os valores abaixo já NÃO entram em DRE, Fluxo de Caixa, Dashboard, Projeção, Resumo, Medição e Contabilidade."
              : " Ao ligar a chave, os valores abaixo deixam de entrar em DRE, Fluxo de Caixa, Dashboard, Projeção, Resumo, Medição e Contabilidade."}{" "}
            A versão Atual (movimento real) nunca é filtrada. Nada é apagado: cada versão continua inteira na tela dela, e basta Aprovar para voltar a contar.
          </p>
          {naoAprovadas.length === 0 ? (
            <p className="mt-3 text-[13px] text-[var(--color-ink3)]">Nenhuma versão de planejamento fora de Aprovado: ligar a chave não muda nenhum número hoje.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12.5px]" aria-label="Versões de planejamento não aprovadas">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                    <th className="py-1.5 pr-3">Projeto</th>
                    <th className="py-1.5 pr-3">Versão</th>
                    <th className="py-1.5 pr-3">Tipo</th>
                    <th className="py-1.5 pr-3">Situação</th>
                    <th className="py-1.5 pr-3 text-right">Receitas</th>
                    <th className="py-1.5 text-right">Despesas</th>
                  </tr>
                </thead>
                <tbody>
                  {naoAprovadas.map((v) => (
                    <tr key={v.versionId} className="border-b border-[var(--color-line)]/60">
                      <td className="py-1.5 pr-3">{v.projeto}</td>
                      <td className="py-1.5 pr-3">
                        <Link href={`/${v.kind}?p=${v.projectId}&v=${v.versionId}`} className="text-[var(--color-accent2)] hover:underline">
                          {v.nome}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3">{v.kind === "budget" ? "Orçamento" : "Previsão Atualizada"}</td>
                      <td className="py-1.5 pr-3">{v.status}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{brl(v.receitas)}</td>
                      <td className="py-1.5 text-right tabular-nums">{brl(v.despesas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-dre">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · DRE pela definição nova</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Resultado Final da versão Atual de cada projeto, {dreLigada ? "como estava antes da chave e como está agora" : "hoje e pela definição nova"}.
            Mudam: despesa classificada como “Receita” sai da receita; multa, juros e outros encargos vão para a
            competência da despesa. Na Empresa toda, projeto sem o cenário escolhido deixa de entrar com a Atual.
            Nada é gravado nem reclassificado.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Prévia da DRE pela definição nova">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Projeto</th>
                  <th className="py-1.5 pr-3 text-right">Resultado hoje</th>
                  <th className="py-1.5 pr-3 text-right">Definição nova</th>
                  <th className="py-1.5 pr-3 text-right">Diferença</th>
                  <th className="py-1.5">O que muda</th>
                </tr>
              </thead>
              <tbody>
                {previaDre.map((p) => (
                  <tr key={p.projeto} className="border-b border-[var(--color-line)]/60 align-top">
                    <td className="py-1.5 pr-3">{p.projeto}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(p.hoje)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(p.nova)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(p.nova - p.hoje)}</td>
                    <td className="py-1.5 text-[12px] text-[var(--color-ink2)]">
                      {p.meses.length === 0 && p.comoReceita.length === 0 && p.semCenario.length === 0 ? (
                        "nada"
                      ) : (
                        <ul className="space-y-0.5">
                          {p.meses.slice(0, 6).map((m) => (
                            <li key={m.mes}>
                              {m.mes}: {brl(m.hoje)} → {brl(m.nova)}
                            </li>
                          ))}
                          {p.meses.length > 6 && <li>e mais {p.meses.length - 6} competência(s)</li>}
                          {p.comoReceita.map((r, i) => (
                            <li key={`r-${i}`}>
                              Sai da receita: {r.numDoc ?? "sem PED"} · {r.competencia ?? "sem competência"} · {brl(r.valor)}
                            </li>
                          ))}
                          {p.semCenario.length > 0 && (
                            <li>
                              Sem {p.semCenario.map((k) => (k === "budget" ? "Orçamento" : k === "forecast" ? "Previsão Atualizada" : "Atual")).join(" e ")}:
                              na Empresa toda, fica fora dessa coluna.
                            </li>
                          )}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-fluxo">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · Fluxo de Caixa pela definição nova</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Por obra (versão Atual), de onde parte e onde termina o saldo acumulado hoje e pela definição nova. Hoje toda obra parte
            do saldo das contas da empresa; pela nova, parte do caixa da própria obra e corre pelo realizado nos meses fechados. Mostra
            também a permuta que sai das colunas de Orçamento e Previsão e o caixa gravado fora da Atual. Nada é gravado.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Prévia do Fluxo de Caixa pela definição nova">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Obra</th>
                  <th className="py-1.5 pr-3 text-right">Partida hoje</th>
                  <th className="py-1.5 pr-3 text-right">Partida nova</th>
                  <th className="py-1.5 pr-3 text-right">Acumulado hoje</th>
                  <th className="py-1.5 pr-3 text-right">Acumulado novo</th>
                  <th className="py-1.5 pr-3 text-right">Permuta no planejamento</th>
                  <th className="py-1.5 text-right">Caixa fora da Atual</th>
                </tr>
              </thead>
              <tbody>
                {previaFluxo.map((p) => (
                  <tr key={p.projeto} className="border-b border-[var(--color-line)]/60">
                    <td className="py-1.5 pr-3">{p.projeto}{!p.temAtual && <span className="ml-1 text-[11px] text-[var(--color-warning)]">sem Atual: sem realizado</span>}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(p.partidaHoje)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(p.partidaNova)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(p.acumuladoHoje)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(p.acumuladoNovo)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(p.permutaNoPlanejamento)}</td>
                    <td className="py-1.5 text-right tabular-nums">{brl(p.caixaForaDaAtual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-dashboard">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · Dashboard pela definição nova</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Por obra, cartão a cartão, sem filtro de período: o número exibido hoje, o pela definição nova e a diferença. Entradas de
            caixa passam a somar só a Atual; o Executado passa a ser dividido por um Orçamento só; a margem usa a mesma janela de
            competências nos dois lados; VGV vem da Atual; A receber do planejamento mostra o negativo. Nada é gravado.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Prévia do Dashboard pela definição nova">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Obra · cartão</th>
                  <th className="py-1.5 pr-3 text-right">Hoje</th>
                  <th className="py-1.5 pr-3 text-right">Definição nova</th>
                  <th className="py-1.5 text-right">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {previaDashboard.map((o) => (
                  <Fragment key={o.projeto}>
                    <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface2)]">
                      <td colSpan={4} className="py-1.5 pr-3 font-semibold text-[var(--color-ink)]">{o.projeto}</td>
                    </tr>
                    {o.linhas.map((l) => {
                      const f = (n: number | null) => (n == null ? "—" : l.tipo === "pct" ? pct1(n) : brl(n));
                      const dif = l.hoje != null && l.nova != null ? l.nova - l.hoje : null;
                      return (
                        <tr key={l.cartao} className="border-b border-[var(--color-line)]/60" data-previa-dashboard={l.cartao}>
                          <td className="py-1.5 pr-3 pl-3">{l.cartao}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{f(l.hoje)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{f(l.nova)}</td>
                          <td className={`py-1.5 text-right tabular-nums ${dif ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink4)]"}`}>
                            {dif == null ? (l.hoje == null && l.nova == null ? "—" : "vira “—”") : dif === 0 ? "igual" : `${dif > 0 ? "+" : "−"}${l.tipo === "pct" ? pct1(Math.abs(dif)) : brl(Math.abs(dif))}`}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-resumo">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · Resumo Executivo pela definição nova</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Por obra (versão Atual): cada indicador hoje e pela definição nova. Mudam os sinais (S1, S2 e S3 passam a multiplicar
            pela quantidade), a permuta e a liberação canceladas (saem), a permuta por tipo (compara com o cadastro e ganha &ldquo;outros
            tipos&rdquo;) e o total de unidades (passa a contar as Permutadas). Com a chave ligada, a tela troca a tabela pelos blocos
            Vendas, Exposição e Atenção. Nada é gravado.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Prévia do Resumo Executivo pela definição nova">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Obra · indicador</th>
                  <th className="py-1.5 pr-3 text-right">Hoje</th>
                  <th className="py-1.5 pr-3 text-right">Definição nova</th>
                  <th className="py-1.5 text-right">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {previaResumo.map((o) => (
                  <Fragment key={o.projeto}>
                    <tr className="border-b border-[var(--color-line)] bg-[var(--color-surface2)]">
                      <td colSpan={4} className="py-1.5 pr-3 font-semibold text-[var(--color-ink)]">
                        {o.projeto}
                        {!o.temAtual && <span className="ml-1 text-[11px] font-normal text-[var(--color-warning)]">sem versão Atual: nada a comparar</span>}
                      </td>
                    </tr>
                    {o.linhas.map((l) => {
                      const contagem = l.label.startsWith("Total de unidades");
                      const f = (n: number | null) => (n == null ? "—" : contagem ? String(n) : brl(n));
                      const dif = l.hoje != null && l.nova != null ? l.nova - l.hoje : null;
                      return (
                        <tr key={l.label} className="border-b border-[var(--color-line)]/60" data-previa-resumo={l.label}>
                          <td className="py-1.5 pr-3 pl-3">{l.label}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{f(l.hoje)}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums">{f(l.nova)}</td>
                          <td className={`py-1.5 text-right tabular-nums ${dif ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-ink4)]"}`}>
                            {dif == null ? (l.hoje == null && l.nova == null ? "—" : l.hoje == null ? "linha nova" : "vira “—”") : dif === 0 ? "igual" : `${dif > 0 ? "+" : "−"}${contagem ? Math.abs(dif) : brl(Math.abs(dif))}`}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-plano">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · Plano de pagamento pela definição nova (caixa)</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Por obra (versão Atual): o total dos recebíveis das vendas hoje e pela definição nova. Saem o financiamento do banco (o
            dinheiro chega como liberação de obra), a permuta do plano (não é dinheiro) e as seções com a caixinha &ldquo;Usar&rdquo;
            desmarcada. Nada é gravado e nenhuma caixinha é marcada sozinha.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Prévia do plano de pagamento pela definição nova">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Obra</th>
                  <th className="py-1.5 pr-3 text-right">Recebíveis hoje</th>
                  <th className="py-1.5 pr-3 text-right">Definição nova</th>
                  <th className="py-1.5 pr-3 text-right">Sai: financiamento</th>
                  <th className="py-1.5 pr-3 text-right">Sai: permuta</th>
                  <th className="py-1.5 text-right">Sai: caixinha desmarcada</th>
                </tr>
              </thead>
              <tbody>
                {previaPlano.map((o) => (
                  <tr key={o.projeto} className="border-b border-[var(--color-line)]/60" data-previa-plano={o.projeto}>
                    <td className="py-1.5 pr-3">
                      {o.projeto}
                      {!o.temAtual && <span className="ml-1 text-[11px] text-[var(--color-warning)]">sem versão Atual: nada a comparar</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(o.hoje)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(o.nova)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{o.saiFinanciamento ? brl(o.saiFinanciamento) : "—"}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{o.saiPermuta ? brl(o.saiPermuta) : "—"}</td>
                    <td className={`py-1.5 text-right tabular-nums ${o.saiCaixinha ? "font-semibold text-[var(--color-warning)]" : ""}`}>{o.saiCaixinha ? brl(o.saiCaixinha) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previaPlano.some((o) => o.aConferir.length) ? (
            <div className="mt-4" data-previa-plano-conferir>
              <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">Unidades a conferir antes de ligar</h3>
              <p className="mt-1 text-[12.5px] text-[var(--color-ink2)]">
                Seção do plano com valor e data, mas com a caixinha &ldquo;Usar&rdquo; desmarcada. Se a parcela foi mesmo vendida, marque a
                caixinha na tela de Unidades antes de ligar a chave; senão ela sai de Contas a Receber e do Fluxo.
              </p>
              <ul className="mt-2 space-y-0.5 text-[12.5px]">
                {previaPlano.flatMap((o) =>
                  o.aConferir.map((u) => (
                    <li key={`${o.projeto}-${u.unidade}`}>
                      <span className="font-medium">{o.projeto}</span> · unidade {u.unidade}: {u.secoes.join(", ")} ({brl(u.valor)})
                    </li>
                  )),
                )}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-[12.5px] text-[var(--color-ink3)]">Nenhuma unidade com seção preenchida e caixinha desmarcada.</p>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-rateio">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · Receita da DRE pelo rateio do contrato</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Por obra (versão Atual): a receita da DRE hoje (parcelas pelo vencimento, liberações, contas a receber e revenda de
            permuta) e pelo rateio (total do contrato de cada unidade vendida dividido pelos meses da obra, mais as contas a receber).
            A coluna &ldquo;meses passados&rdquo; mostra quanto a DRE dos meses já encerrados muda: com o rateio, cada venda nova
            revisa os meses anteriores. O caixa não muda. Nada é gravado.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Prévia da receita da DRE pelo rateio">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Obra</th>
                  <th className="py-1.5 pr-3 text-right">Receita hoje</th>
                  <th className="py-1.5 pr-3 text-right">Pelo rateio</th>
                  <th className="py-1.5 pr-3 text-right">Meses passados: hoje</th>
                  <th className="py-1.5 text-right">Meses passados: rateio</th>
                </tr>
              </thead>
              <tbody>
                {previaRateio.map((o) => (
                  <tr key={o.projeto} className="border-b border-[var(--color-line)]/60" data-previa-rateio={o.projeto}>
                    <td className="py-1.5 pr-3">
                      {o.projeto}
                      {!o.temAtual && <span className="ml-1 text-[11px] text-[var(--color-warning)]">sem versão Atual: nada a comparar</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(o.hoje)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(o.rateio)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(o.passadoHoje)}</td>
                    <td className="py-1.5 text-right tabular-nums">{brl(o.passadoRateio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previaRateio.some((o) => o.pendencias.length || o.contasComUnidade.qtd) ? (
            <ul className="mt-3 space-y-0.5 text-[12.5px]" data-previa-rateio-atencao>
              {previaRateio.flatMap((o) => [
                ...o.pendencias.map((pd) => (
                  <li key={`${o.projeto}-${pd.unidade}`} className="text-[var(--color-warning)]">
                    <span className="font-medium">{o.projeto}</span> · unidade {pd.unidade}: o rateio não reconhece, porque {pd.motivo}
                    {pd.valor ? ` (${brl(pd.valor)})` : ""}.
                  </li>
                )),
                ...(o.contasComUnidade.qtd
                  ? [
                      <li key={`${o.projeto}-cr`}>
                        <span className="font-medium">{o.projeto}</span> · {o.contasComUnidade.qtd} conta(s) a receber ligada(s) a unidade (
                        {brl(o.contasComUnidade.valor)}): continuam na receita e podem repetir a venda que o rateio já reconhece. Confira antes
                        de ligar.
                      </li>,
                    ]
                  : []),
              ])}
            </ul>
          ) : (
            <p className="mt-3 text-[12.5px] text-[var(--color-ink3)]">Nenhuma pendência: todas as vendas têm contrato e janela de obra.</p>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-caixa-conta">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · Caixa: conciliação por conta</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Com a chave ligada, o Caixa deixa de ter seletor de obra e de versão e mostra a conciliação da empresa, conta a conta (a
            versão Atual de todas as obras). O extrato importado depois de ligar nasce só com a conta; a obra de cada movimento passa a
            ser a do item com que ele for conciliado. Os movimentos que já existem ficam na obra que têm: a tabela de obras abaixo
            confere que o realizado de cada uma é o mesmo pelas duas leituras. Nada é gravado.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Prévia do Caixa por conta">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Conta</th>
                  <th className="py-1.5 pr-3 text-right">Movimentos</th>
                  <th className="py-1.5 pr-3 text-right">A conciliar</th>
                  <th className="py-1.5 text-right">Sem obra</th>
                </tr>
              </thead>
              <tbody>
                {previaCaixa.contas.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--color-line)]/60" data-previa-caixa-conta={c.nome}>
                    <td className="py-1.5 pr-3">
                      {c.nome}
                      {c.terceiros && <span className="ml-1 text-[11px] text-[var(--color-ink3)]">fora do total (terceiros ou inativa)</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{c.movimentos}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{c.pendentes}</td>
                    <td className="py-1.5 text-right tabular-nums">{c.semObra}</td>
                  </tr>
                ))}
                {previaCaixa.semConta.movimentos > 0 && (
                  <tr className="border-b border-[var(--color-line)]/60 text-[var(--color-warning)]" data-previa-caixa-sem-conta>
                    <td className="py-1.5 pr-3">Sem conta (lançados antes do cadastro da conta)</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{previaCaixa.semConta.movimentos}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{previaCaixa.semConta.pendentes}</td>
                    <td className="py-1.5 text-right">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Realizado por obra nas duas leituras">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Obra (versão Atual)</th>
                  <th className="py-1.5 pr-3 text-right">Realizado hoje</th>
                  <th className="py-1.5 text-right">Pelo vínculo</th>
                </tr>
              </thead>
              <tbody>
                {previaCaixa.obras.map((o) => (
                  <tr key={o.projeto} className="border-b border-[var(--color-line)]/60" data-previa-caixa-obra={o.projeto}>
                    <td className="py-1.5 pr-3">{o.projeto}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(o.hoje)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${Math.abs(o.hoje - o.peloVinculo) > 0.005 ? "text-[var(--color-warning)]" : ""}`}>{brl(o.peloVinculo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] text-[var(--color-ink3)]" data-previa-caixa-sem-obra>
            {previaCaixa.semObra.qtd === 0
              ? "Nenhum movimento sem obra ainda: eles só nascem depois de ligar a chave."
              : `${previaCaixa.semObra.qtd} movimento(s) sem obra; ${brl(previaCaixa.semObra.naoAtribuido)} ainda não atribuído(s) a obra (sem vínculo): entram no saldo da empresa e no realizado de nenhuma obra.`}
          </p>
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-parcela">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · Parcela do comprador: situação e atrasados</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Por obra (versão Atual): as parcelas de venda vencidas que ainda não têm recebimento conciliado no Caixa. Com a chave
            ligada, elas aparecem como &ldquo;vencida&rdquo; em Contas a Receber e entram nos atrasados da faixa do Caixa. Se forem
            parcelas já pagas, concilie a entrada do extrato com a parcela antes de ligar. O recebido pela conciliação sai do
            previsto do Fluxo de Caixa. Nada é gravado.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12.5px]" aria-label="Prévia da situação das parcelas">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                  <th className="py-1.5 pr-3">Obra</th>
                  <th className="py-1.5 pr-3 text-right">Vencidas sem recebimento</th>
                  <th className="py-1.5 pr-3 text-right">Valor vencido</th>
                  <th className="py-1.5 text-right">Recebido pela conciliação</th>
                </tr>
              </thead>
              <tbody>
                {previaParcela.map((o) => (
                  <tr key={o.projeto} className="border-b border-[var(--color-line)]/60" data-previa-parcela={o.projeto}>
                    <td className="py-1.5 pr-3">{o.projeto}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{o.vencidasSemRecebimento}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{brl(o.valorVencido)}</td>
                    <td className="py-1.5 text-right tabular-nums">{brl(o.recebidoConciliado)}</td>
                  </tr>
                ))}
                {previaParcela.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-[var(--color-ink3)]">
                      Nenhuma parcela de venda na versão Atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-categoria">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · Despesa herda a categoria do Plano de Contas</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Despesas da versão Atual, não canceladas, cuja categoria hoje é diferente da categoria da conta no Plano de Contas.
            Com a chave ligada, elas passam a contar na DRE pela categoria da conta. Nada é regravado. Antes de ligar, confira a
            categoria de cada conta em{" "}
            <Link href="/planocontas" className="text-[var(--color-accent2)] hover:underline">
              Plano de Contas
            </Link>
            . Despesa sem conta, ou com conta fora do plano, fica como está.
          </p>
          <p className="mt-2 text-[13px] font-medium text-[var(--color-ink)]" data-previa-categoria-total>
            {totalQueMuda === 0 ? "Nenhuma despesa muda de categoria." : `${totalQueMuda} despesa(s) mudam de categoria.`}
          </p>
          {previaCategoria.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12.5px]" aria-label="Despesas que mudam de categoria, por conta">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                    <th className="py-1.5 pr-3">Conta</th>
                    <th className="py-1.5 pr-3">Hoje</th>
                    <th className="py-1.5 pr-3">Pela conta</th>
                    <th className="py-1.5 pr-3 text-right">Despesas</th>
                    <th className="py-1.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {previaCategoria.map((m) => (
                    <tr key={`${m.conta}|${m.de}`} className="border-b border-[var(--color-line)]/60" data-previa-categoria={m.conta}>
                      <td className="py-1.5 pr-3 font-[family-name:var(--font-mono)]">{m.conta}</td>
                      <td className="py-1.5 pr-3">{m.de}</td>
                      <td className="py-1.5 pr-3 font-medium">{m.para}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{m.despesas}</td>
                      <td className="py-1.5 text-right tabular-nums">{brl(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6" id="previa-incc">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Prévia · INCC da empresa</h2>
          <p className="mt-1.5 text-[13px] text-[var(--color-ink2)]">
            Com a chave ligada, cada obra passa a ler a série do INCC da empresa no lugar da própria. As séries das obras ficam
            guardadas, e desligar volta a elas. A série da empresa é adotada em{" "}
            <Link href="/parametros" className="text-[var(--color-accent2)] hover:underline">
              Índices de Reajuste
            </Link>
            , a partir da série de uma obra.
          </p>
          <p className="mt-2 text-[13px] font-medium text-[var(--color-ink)]" data-previa-incc-total>
            {inccEmpresa.length === 0
              ? "A empresa ainda não adotou uma série: ligar a chave não muda nada."
              : previaIncc.filter(mudaAlgo).length === 0
                ? `Série da empresa com ${inccEmpresa.length} meses. Nenhuma obra muda.`
                : `Série da empresa com ${inccEmpresa.length} meses. ${previaIncc.filter(mudaAlgo).length} obra(s) mudam.`}
          </p>
          {previaIncc.some(mudaAlgo) && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12.5px]" aria-label="Obras cuja série do INCC difere da série da empresa">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">
                    <th className="py-1.5 pr-3">Obra</th>
                    <th className="py-1.5 pr-3 text-right">Meses com acumulado diferente</th>
                    <th className="py-1.5 pr-3 text-right">Meses sem índice na empresa</th>
                    <th className="py-1.5 text-right">Maior diferença do acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {previaIncc.filter(mudaAlgo).map((m) => (
                    <tr key={m.obra} className="border-b border-[var(--color-line)]/60" data-previa-incc={m.obra}>
                      <td className="py-1.5 pr-3">{m.obra}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{m.mesesDiferentes}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{m.mesesSemEmpresa}</td>
                      <td className="py-1.5 text-right tabular-nums">{m.mesDaMaior ? `${m.maiorDiferenca > 0 ? "+" : "−"}${Math.abs(m.maiorDiferenca).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} p.p. em ${m.mesDaMaior}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

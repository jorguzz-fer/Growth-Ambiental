import "server-only";
import type { TenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { chaveLigada } from "@/lib/chaves-tenant";
import { getBankAccounts, getVersionsDoProjeto } from "@/lib/queries";
import { isContaDaEmpresa, saldoDisponivel } from "@/lib/contas-saldo";
import { versionInputsByMonth } from "@/lib/dre-inputs";
import { aggregateInputs } from "@/lib/calc/dre-cascata";
import { resolverCenario } from "@/lib/dre";
import { entraNosRelatorios } from "@/lib/situacao-versao";
import { custoOrcadoRealizado } from "@/lib/custo-orcado";
import { brl, pct1 } from "@/lib/utils";
import {
  CATALOGO,
  ROTULO_DO_CENARIO,
  mesesDoPeriodo,
  metricasPermitidas,
  resolverObra,
  textoDoPeriodo,
  type IntencaoDoChat,
} from "@/lib/assistente-chat";

export interface RespostaDoChat {
  texto: string;
  detalhes: string[];
  link: { href: string; rotulo: string } | null;
  /** O que o assistente entendeu — para o usuário conferir. */
  entendido: string | null;
  /** Quem interpretou a pergunta: o modelo ou a leitura local. */
  via: "ia" | "local";
}

/**
 * O cálculo das métricas do catálogo (Prompt E, Etapa 2), separado da action
 * para a Cris (Prompt E2) usar as MESMAS contas como ferramenta. Não é action:
 * o contexto vem sempre de `getTenantContext()` de quem chama, no servidor —
 * nunca do cliente. Cada métrica exige o "ver" das telas de origem (3.4).
 */
export async function responderMetrica(
  ctx: TenantContext,
  intencao: IntencaoDoChat,
  projetoDaTela: string | null,
  via: RespostaDoChat["via"],
): Promise<RespostaDoChat> {
  const agora = new Date();
  const mesAtual = `${String(agora.getMonth() + 1).padStart(2, "0")}/${agora.getFullYear()}`;
  const permitidas = metricasPermitidas((tela) => can(ctx.perms, tela, "ver"));
  const resposta = (r: Omit<RespostaDoChat, "via">): RespostaDoChat => ({ ...r, via });

  if (!intencao.metrica) {
    return resposta({
      texto: "Ainda não sei responder isso. Respondo, por enquanto, sobre:",
      detalhes: permitidas.length
        ? permitidas.map((m) => `${m.nome} — ${m.definicao}`)
        : ["nenhuma métrica: seu acesso não inclui as telas de origem (DRE, Despesas, Controle de Caixa)."],
      link: null,
      entendido: null,
    });
  }
  const metrica = CATALOGO.find((m) => m.id === intencao.metrica)!;
  if (!permitidas.some((m) => m.id === metrica.id)) {
    return resposta({
      texto: `Você não tem acesso a ${metrica.nome.toLowerCase()}: o número vem de telas que seu acesso não inclui.`,
      detalhes: [],
      link: null,
      entendido: metrica.nome,
    });
  }

  // ── Saldo: da empresa, não de uma obra ─────────────────────────────────
  if (metrica.id === "saldo") {
    const contas = await getBankAccounts(ctx.tenant.id);
    const daEmpresa = contas.filter(isContaDaEmpresa);
    return resposta({
      texto: `Saldo disponível hoje nas contas da empresa: ${brl(saldoDisponivel(contas))}.`,
      detalhes: [
        `${daEmpresa.length} conta(s), sem as contas de terceiros.`,
        "É o saldo da empresa: as contas não são separadas por projeto.",
        ...(intencao.obra || intencao.de ? ["Projeto e período não se aplicam a este número."] : []),
      ],
      link: { href: metrica.href, rotulo: "Ver no Controle de Caixa" },
      entendido: metrica.nome,
    });
  }

  // ── Obras: a citada (casada aqui), a da tela, ou todas as que o usuário vê ──
  let obras = ctx.projects;
  let escopo = "todos os projetos que você vê";
  if (intencao.obra) {
    const r = resolverObra(intencao.obra, ctx.projects);
    if (r.tipo === "nenhuma") return resposta({ texto: `Não achei o projeto “${intencao.obra}” entre os que você vê.`, detalhes: [], link: null, entendido: metrica.nome });
    if (r.tipo === "varias")
      return resposta({ texto: `“${intencao.obra}” bate com mais de um projeto. Qual deles?`, detalhes: r.candidatos.map((p) => p.name), link: null, entendido: metrica.nome });
    obras = [r.projeto];
    escopo = r.projeto.name;
  } else if (!intencao.todas && projetoDaTela) {
    const daTela = ctx.projects.find((p) => p.id === projetoDaTela);
    if (daTela) {
      obras = [daTela];
      escopo = `${daTela.name} (projeto da tela)`;
    }
  }
  const umaObra = obras.length === 1 ? obras[0] : null;
  const meses = mesesDoPeriodo(intencao.de, intencao.ate);
  const rascunhoFora = await chaveLigada(ctx.tenant.id, "rascunho_fora_dos_relatorios");

  // ── Desvio: Atual × Orçamento, nas mesmas competências ─────────────────
  if (metrica.id === "desvio") {
    const porObra = await Promise.all(
      obras.map(async (p) => ({ p, c: await custoOrcadoRealizado(ctx.tenant.id, p.id, meses ? { meses } : { ate: mesAtual }, rascunhoFora) })),
    );
    const comparaveis = porObra.filter((x) => x.c && x.c.orcado != null);
    const fora = porObra.filter((x) => !x.c || x.c.orcado == null).map((x) => x.p.name);
    const periodo = textoDoPeriodo(intencao.de, intencao.ate, `até ${mesAtual}`);
    if (!comparaveis.length)
      return resposta({
        texto: `Sem Orçamento para comparar em ${escopo}: o desvio de custo não é calculado.`,
        detalhes: fora.length ? [`Sem Orçamento lançado (ou sem versão Atual): ${fora.join(", ")}.`] : [],
        link: umaObra ? { href: `/projeto?proj=${umaObra.id}`, rotulo: "Ver Orçado x Realizado" } : null,
        entendido: `${metrica.nome} · ${escopo} · ${periodo}`,
      });
    const real = comparaveis.reduce((a, x) => a + x.c!.realizado, 0);
    const orc = comparaveis.reduce((a, x) => a + x.c!.orcado!, 0);
    const dif = real - orc;
    return resposta({
      texto: `Desvio de custo em ${escopo}, ${periodo}: ${dif >= 0 ? "+" : "−"}${brl(Math.abs(dif))}${orc > 0 ? ` (${pct1((dif / orc) * 100)} ${dif >= 0 ? "acima" : "abaixo"} do orçado)` : ""}.`,
      detalhes: [
        `Realizado ${brl(real)} contra ${brl(orc)} orçados.`,
        metrica.definicao,
        ...(comparaveis.length > 1 ? [`Soma de ${comparaveis.length} projeto(s); o percentual é recalculado das somas.`] : []),
        ...(fora.length ? [`Fora da conta (sem Orçamento ou sem Atual): ${fora.join(", ")}.`] : []),
      ],
      link: umaObra ? { href: `/projeto?proj=${umaObra.id}`, rotulo: "Ver Orçado x Realizado" } : null,
      entendido: `${metrica.nome} · ${escopo} · ${periodo}`,
    });
  }

  // ── Receita e custo: cascata da DRE, por cenário ───────────────────────
  const cenario = intencao.cenario ?? "atual";
  const definicaoNova = await chaveLigada(ctx.tenant.id, "dre_definicao_nova");
  const comVersoes = await Promise.all(obras.map(async (p) => ({ id: p.id, name: p.name, versoes: await getVersionsDoProjeto(ctx.tenant.id, p.id) })));
  // Sem substituição: obra sem o cenário fica fora e é dita (não entra como zero).
  const resolvidas = resolverCenario(cenario, comVersoes, false).map((r) => ({
    ...r,
    versao: r.versao && entraNosRelatorios(r.versao, rascunhoFora) ? r.versao : null,
  }));
  const dentro = resolvidas.filter((r) => r.versao);
  const fora = resolvidas.filter((r) => !r.versao).map((r) => r.projetoNome);
  const valores = await Promise.all(
    dentro.map(async (r) => {
      const porMes = await versionInputsByMonth(ctx.tenant.id, r.versao!.id, r.projetoId, { definicaoNova });
      const valorDe = (inp: (typeof porMes)[string]) => (metrica.id === "receita" ? inp.receita : inp.custoVar + (inp.byCat["Custo Fixo"] || 0));
      // Ausência não é zero: só há número se algum mês do recorte tem lançamento.
      const tem = Object.entries(porMes).some(([mm, inp]) => (!meses || meses.has(mm)) && valorDe(inp) !== 0);
      return { valor: valorDe(aggregateInputs(porMes, meses)), tem };
    }),
  );
  const periodo = textoDoPeriodo(intencao.de, intencao.ate, "acumulado");
  const rotulo = ROTULO_DO_CENARIO[cenario];
  if (!dentro.length)
    return resposta({
      texto: `Nenhum projeto em ${escopo} tem ${rotulo}${rascunhoFora && cenario !== "atual" ? " que conte nos relatórios (Aprovado)" : ""}.`,
      detalhes: [],
      link: null,
      entendido: `${metrica.nome} · ${rotulo} · ${escopo} · ${periodo}`,
    });
  const total = valores.reduce((a, x) => a + x.valor, 0);
  if (!valores.some((x) => x.tem))
    return resposta({
      texto: `Não há ${metrica.nome.toLowerCase()} lançada — ${rotulo} — em ${escopo}, ${periodo} (a DRE mostra “—”, não zero).`,
      detalhes: fora.length ? [`Sem ${rotulo}: ${fora.join(", ")}.`] : [],
      link: { href: umaObra ? `/dre?proj=${umaObra.id}` : "/dre?proj=all", rotulo: "Ver na DRE" },
      entendido: `${metrica.nome} · ${rotulo} · ${escopo} · ${periodo}`,
    });
  return resposta({
    texto: `${metrica.nome} — ${rotulo} — ${escopo}, ${periodo}: ${brl(total)}.`,
    detalhes: [
      metrica.definicao,
      ...(dentro.length > 1 ? [`Soma de ${dentro.length} de ${resolvidas.length} projeto(s).`] : []),
      ...(fora.length ? [`Sem ${rotulo}${rascunhoFora && cenario !== "atual" ? " Aprovado" : ""}, fora da soma: ${fora.join(", ")}.`] : []),
      ...(intencao.cenario ? [] : ["Sem cenário na pergunta, uso a Atual. Pergunte “orçado” ou “previsão” para os outros."]),
    ],
    link: { href: umaObra ? `/dre?proj=${umaObra.id}` : "/dre?proj=all", rotulo: "Ver na DRE" },
    entendido: `${metrica.nome} · ${rotulo} · ${escopo} · ${periodo}`,
  });
}

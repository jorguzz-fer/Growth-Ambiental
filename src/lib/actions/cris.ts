"use server";

import { getTenantContext } from "@/lib/context";
import { permissaoDaRota } from "@/lib/nav-menu";
import { isAiConfigured } from "@/lib/ai/client";
import { comUsoDeIa, limiteDeConversa } from "@/lib/ai/uso";
import { responderComoCris } from "@/lib/ai/cris";
import { interpretarLocalmente, normalizarIntencao } from "@/lib/assistente-chat";
import { responderMetrica } from "@/lib/chat-metricas";
import { anexoValido, contextoValido, historicoDaCris, type PropostaDeConciliacao, type PropostaDeImportacao, type PropostaDePreenchimento, mensagemDeFalhaDaCris } from "@/lib/cris";
import { can } from "@/lib/permissions";
import { ferramentasDoCaixa } from "@/lib/conciliacao-cris-ferramentas";
import { executarFerramentaDeDados } from "@/lib/cris-dados";

export type ResultadoDaCris =
  | { ok: true; texto: string; proposta: PropostaDePreenchimento | null; via: "ia" | "local"; conciliacoes?: PropostaDeConciliacao | null; importacao?: PropostaDeImportacao | null }
  | { ok: false; error: string };

/** A tela do Caixa (com ou sem filtro de conta). */
function rotaDoCaixa(rota: string): boolean {
  return rota.split("?")[0] === "/caixa";
}
/** A conta escolhida na tela do Caixa (`?conta=`). */
function contaDaRota(rota: string): string | null {
  return new URLSearchParams(rota.split("?")[1] ?? "").get("conta");
}

/** Projeto citado na rota da tela (`?proj=`), só se a pessoa o vê. */
function projetoDaRota(rotaComQuery: unknown, projetos: readonly { id: string }[]): string | null {
  if (typeof rotaComQuery !== "string") return null;
  const q = rotaComQuery.split("?")[1] ?? "";
  const id = new URLSearchParams(q).get("proj") ?? new URLSearchParams(q).get("project");
  return id && projetos.some((p) => p.id === id) ? id : null;
}

/**
 * Prompt E2 — pergunta à Cris.
 *
 * - Sessão e tenant vêm do servidor; o contexto da tela vem do cliente e é
 *   validado (rota conhecida). Os NÚMEROS da tela só vão ao modelo se a pessoa
 *   pode ver aquela tela (`ver` da rota) — o resumo já é o que a tela mostra.
 * - `consultar_numero` roda aqui, com `responderMetrica` e o acesso da pessoa.
 * - Nada é gravado: a proposta de preenchimento volta para a tela, e quem
 *   grava é o botão da tela (regra 4.2.1, pedido do dono em 18/10).
 * - A conversa não é gravada; log só do tipo de erro. O consumo vai para
 *   `ia_uso` e conta no limite de conversas (operação "cris").
 * - Sem a chave de IA: responde o que dá sem modelo — os números do catálogo
 *   pela leitura local da pergunta, como o chat da Etapa 2.
 */
export async function perguntarACris(entrada: { conversa: unknown; tela: unknown; anexo?: unknown }): Promise<ResultadoDaCris> {
  const ctx = await getTenantContext();
  if (!ctx) return { ok: false, error: "Sessão expirada. Entre de novo." };
  const conversa = historicoDaCris(entrada?.conversa);
  if (!conversa) return { ok: false, error: "Escreva a pergunta." };
  const tela = contextoValido(entrada?.tela);
  const anexo = entrada?.anexo ? anexoValido(entrada.anexo) : null;
  if (entrada?.anexo && !anexo) return { ok: false, error: "Anexo não aceito: envie PDF, DOCX, imagem (PNG, JPG, WEBP) ou planilha (XLSX, CSV) de até 4 MB." };

  // Prompt AQ §2 — a permissão vem do item do menu da rota (com as exigências
  // dele, como as do Acerto), e falha fechada: rota sem item não libera nada.
  const permissao = tela ? permissaoDaRota(tela.rota, ctx.perms) : { ver: false, lancar: false };
  const dadosPermitidos = permissao.ver;
  // Formulário só para quem pode criar ou editar naquela tela.
  const podeLancar = permissao.lancar;
  const telaUsada = tela ? { ...tela, formulario: podeLancar ? tela.formulario : null } : null;
  const projetoDaTela = projetoDaRota((entrada?.tela as { rota?: unknown } | undefined)?.rota, ctx.projects);
  const pergunta = conversa[conversa.length - 1].texto;

  const semModelo = async (): Promise<ResultadoDaCris> => {
    const r = await responderMetrica(ctx, interpretarLocalmente(pergunta, new Date()), projetoDaTela, "local");
    return { ok: true, texto: [r.texto, ...r.detalhes].join("\n"), proposta: null, via: "local" };
  };

  if (!isAiConfigured()) return semModelo();
  const limite = await limiteDeConversa(ctx.tenant.id, ctx.userId);
  if (limite) return { ok: false, error: limite };

  try {
    const r = await comUsoDeIa({ tenantId: ctx.tenant.id, userId: ctx.userId, operacao: "cris" }, () =>
      responderComoCris({
        conversa,
        tela: telaUsada,
        dadosPermitidos,
        anexo,
        consultar: async (input) => {
          const resposta = await responderMetrica(ctx, normalizarIntencao(input), projetoDaTela, "ia");
          return [resposta.texto, ...resposta.detalhes].join("\n");
        },
        // Etapa 7 — o catálogo de leitura, em qualquer tela, com o acesso da pessoa (AC-T2).
        dados: (nome, e) => executarFerramentaDeDados(ctx, nome, e),
        // Prompt AT §8 — na tela do Caixa, as ferramentas de conciliação, pela permissão da pessoa (AT-T18).
        caixa: tela && rotaDoCaixa(tela.rota) && dadosPermitidos ? ferramentasDoCaixa(ctx, { podeConciliar: can(ctx.perms, "caixa", "editar"), podeImportar: can(ctx.perms, "caixa", "criar"), anexo, contaDaTela: contaDaRota(tela.rota) }) : undefined,
      }),
    );
    return { ok: true, texto: r.texto, proposta: r.proposta, via: "ia", conciliacoes: r.conciliacoes ?? null, importacao: r.importacao ?? null };
  } catch (e) {
    console.error("[cris] falha:", e instanceof Error ? e.name : "erro");
    // Nunca o texto cru do provedor de IA (pode trazer detalhes técnicos): mensagem própria.
    return { ok: false, error: mensagemDeFalhaDaCris(e) };
  }
}

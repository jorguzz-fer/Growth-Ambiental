import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { aiClient, createMessageWithFallback } from "@/lib/ai/client";
import { BASE_DE_CONHECIMENTO } from "@/lib/assistente-base";
import { CATALOGO } from "@/lib/assistente-chat";
import { FERRAMENTAS_DE_DADOS, NOMES_DAS_FERRAMENTAS_DE_DADOS } from "@/lib/cris-dados-ferramentas";
import {
  MAX_VOLTAS,
  blocoDaTela,
  propostaValida,
  regrasDaCris,
  ehPlanilha,
  type ContextoDeTela,
  type FalaDaCris,
  type PropostaDeConciliacao,
  type PropostaDeImportacao,
  type PropostaDePreenchimento,
  type TipoDeAnexo,
} from "@/lib/cris";

/**
 * Prompt E2 — uma resposta da Cris. Vai ao modelo:
 *  - no `system`, com cache: as regras e a base de conhecimento (texto fixo);
 *  - a conversa desta aba (nada é gravado);
 *  - na última fala: o bloco <tela> (resumo agregado que a tela montou, sem
 *    dado pessoal — `sanitizarDados`) e, se houver, o documento anexado;
 *  - o resultado das consultas que o modelo pedir por `consultar_numero`,
 *    calculadas no servidor com o acesso da pessoa.
 * NÃO vai: cadastro, histórico, dado pessoal, nada que a tela não mostre.
 */

export interface PedidoDaCris {
  conversa: readonly FalaDaCris[];
  tela: ContextoDeTela | null;
  /** A pessoa pode ver a tela do contexto? Sem isso, os números da tela não vão. */
  dadosPermitidos: boolean;
  anexo: { tipo: TipoDeAnexo; base64: string; nome: string } | null;
  /** Executa `consultar_numero` no servidor (o contexto vem de quem chama). */
  consultar: (entrada: unknown) => Promise<string>;
  /** Etapa 7 — executa uma ferramenta de dados do catálogo, com o acesso da pessoa. */
  dados?: (nome: string, entrada: unknown) => Promise<string>;
  /**
   * Prompt AT §8 — as ferramentas de conciliação, só na tela do Caixa e com a
   * permissão da pessoa. Todas só LEEM; a proposta volta para a tela.
   */
  caixa?: {
    semPermissao?: string;
    pendentes?: (conta: string) => Promise<string>;
    candidatos?: (movimento: string) => Promise<string>;
    propor?: (itens: unknown) => Promise<{ texto: string; proposta: PropostaDeConciliacao | null }>;
    lerExtrato?: (conta: string) => Promise<{ texto: string; proposta: PropostaDeImportacao | null }>;
  };
}

export interface RespostaDaCris {
  texto: string;
  proposta: PropostaDePreenchimento | null;
  consultas: number;
  conciliacoes?: PropostaDeConciliacao | null;
  importacao?: PropostaDeImportacao | null;
}

/** Prompt AT §8.3 — as ferramentas de conciliação (só leem). */
const FERRAMENTA_PENDENTES: Anthropic.Tool = {
  name: "pendentes_de_conciliacao",
  description: "Lista os movimentos do extrato a conciliar (até 20, do mais antigo para o mais novo), com o id de cada um. Use antes de conciliar em rodada.",
  input_schema: { type: "object", additionalProperties: false, properties: { conta: { type: "string", description: 'Nome da conta como a pessoa disse, ou "" para todas.' } }, required: ["conta"] },
};
const FERRAMENTA_CANDIDATOS: Anthropic.Tool = {
  name: "candidatos_de_conciliacao",
  description: "Os candidatos que o SERVIDOR calculou para um movimento (despesas, contas a receber, parcelas de venda, pagamentos de fatura), com o grau e a referência (ref). Só estes podem ser propostos.",
  input_schema: { type: "object", additionalProperties: false, properties: { movimento: { type: "string", description: "id do movimento" } }, required: ["movimento"] },
};
const FERRAMENTA_PROPOR: Anthropic.Tool = {
  name: "propor_conciliacoes",
  description: "Propõe à pessoa um lote de até 20 conciliações (movimento + ref de um candidato). Não grava: a tela mostra a lista e o botão de confirmar. Ref que não veio de candidatos_de_conciliacao é recusada.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      itens: {
        type: "array",
        maxItems: 20,
        items: { type: "object", additionalProperties: false, properties: { movimento: { type: "string" }, ref: { type: "string" }, valor: { type: "number", description: "valor do vínculo; omita para o que couber" } }, required: ["movimento", "ref"] },
      },
    },
    required: ["itens"],
  },
};
const FERRAMENTA_LER_EXTRATO: Anthropic.Tool = {
  name: "ler_extrato",
  description: "Lê no servidor o extrato anexado nesta mensagem (PDF, imagem, XLSX ou CSV), com o mesmo leitor da importação, e prepara o diálogo de importação na tela. Devolve um resumo e as contas cadastradas. Não transcreva as linhas.",
  input_schema: { type: "object", additionalProperties: false, properties: { conta: { type: "string", description: 'Conta do extrato como a pessoa disse ou como aparece no extrato; "" se não souber.' } }, required: ["conta"] },
};

const FERRAMENTA_CONSULTA: Anthropic.Tool = {
  name: "consultar_numero",
  description:
    "Calcula, com os dados da empresa e o acesso da pessoa, um número do catálogo: " +
    CATALOGO.map((m) => `${m.id} (${m.definicao})`).join("; ") +
    ". Use para números que não estão no bloco <tela> ou de outras obras e cenários.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      metrica: { type: "string", enum: CATALOGO.map((m) => m.id) },
      cenario: { type: "string", enum: ["", "atual", "budget", "forecast"], description: '"" = Atual (o movimento real).' },
      obra: { type: "string", description: 'Nome da obra como a pessoa escreveu; "" para a obra da tela ou todas.' },
      todas: { type: "boolean", description: "true para todas as obras / a empresa toda." },
      de: { type: "string", description: 'Competência inicial MM/AAAA, ou "".' },
      ate: { type: "string", description: 'Competência final MM/AAAA, ou "".' },
    },
    required: ["metrica", "cenario", "obra", "todas", "de", "ate"],
  },
};

function ferramentaDeProposta(tela: ContextoDeTela): Anthropic.Tool {
  const form = tela.formulario!;
  return {
    name: "propor_preenchimento",
    description:
      `Preenche o formulário "${form.titulo}" da tela para a pessoa conferir e salvar. Não grava nada. ` +
      "Use os nomes de campo do <formulario>. Em `conferir`, diga o que você deduziu ou não tem certeza, por campo.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        valores: {
          type: "object",
          description: "campo → valor (texto). Só campos do formulário.",
          additionalProperties: { type: "string" },
        },
        conferir: {
          type: "object",
          description: "campo → motivo da conferência.",
          additionalProperties: { type: "string" },
        },
        observacao: { type: "string", description: "Uma frase para a pessoa (ex.: o que faltou no documento)." },
      },
      required: ["valores"],
    },
  };
}

function textoDe(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function responderComoCris(p: PedidoDaCris): Promise<RespostaDaCris> {
  const tools: Anthropic.Tool[] = [FERRAMENTA_CONSULTA, ...(p.dados ? FERRAMENTAS_DE_DADOS : [])];
  if (p.tela?.formulario) tools.push(ferramentaDeProposta(p.tela));
  if (p.caixa?.pendentes) tools.push(FERRAMENTA_PENDENTES);
  if (p.caixa?.candidatos) tools.push(FERRAMENTA_CANDIDATOS);
  if (p.caixa?.propor) tools.push(FERRAMENTA_PROPOR);
  if (p.caixa?.lerExtrato && p.anexo) tools.push(FERRAMENTA_LER_EXTRATO);

  // Conversa: falas anteriores como texto; a última leva a tela e o anexo.
  const messages: Anthropic.MessageParam[] = p.conversa.slice(0, -1).map((f) => ({
    role: f.de === "usuario" ? "user" : "assistant",
    content: f.texto,
  }));
  const ultima = p.conversa[p.conversa.length - 1];
  const conteudo: Anthropic.ContentBlockParam[] = [];
  if (p.anexo && ehPlanilha(p.anexo.tipo)) {
    // Planilha não vai ao modelo: só `ler_extrato` a lê, no servidor.
    conteudo.push({ type: "text", text: tools.some((t) => t.name === "ler_extrato") ? `[A pessoa anexou a planilha "${p.anexo.nome}". Para ler as linhas, use a ferramenta ler_extrato; não peça para transcrever.]` : `[A pessoa anexou a planilha "${p.anexo.nome}". Planilha de extrato só é lida na tela do Caixa; diga isso.]` });
  } else if (p.anexo) {
    conteudo.push(
      p.anexo.tipo === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: p.anexo.base64 }, title: p.anexo.nome }
        : { type: "image", source: { type: "base64", media_type: p.anexo.tipo as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: p.anexo.base64 } },
    );
  }
  conteudo.push({ type: "text", text: blocoDaTela(p.tela, p.dadosPermitidos) });
  if (p.caixa?.semPermissao) conteudo.push({ type: "text", text: `[${p.caixa.semPermissao}]` });
  conteudo.push({ type: "text", text: ultima.texto });
  messages.push({ role: "user", content: conteudo });

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: `${regrasDaCris()}\n\n=== BASE DE CONHECIMENTO (sistema de hoje) ===\n\n${BASE_DE_CONHECIMENTO}`, cache_control: { type: "ephemeral" } },
  ];
  const client = aiClient();
  let proposta: PropostaDePreenchimento | null = null;
  let conciliacoes: PropostaDeConciliacao | null = null;
  let importacao: PropostaDeImportacao | null = null;
  let consultas = 0;
  const fim = (texto: string): RespostaDaCris => ({ texto, proposta, consultas, conciliacoes, importacao });

  // A rodada de conciliação (pendentes → candidatos → proposta) pede mais voltas.
  const voltas = p.caixa?.propor || p.dados ? MAX_VOLTAS + 2 : MAX_VOLTAS;
  for (let volta = 0; volta < voltas; volta++) {
    const msg = await createMessageWithFallback(client, { max_tokens: 2000, system, tools, messages });
    if (msg.stop_reason === "refusal") return fim("Não posso ajudar com esse pedido.");
    const usos = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (msg.stop_reason !== "tool_use" || usos.length === 0) {
      const texto = textoDe(msg.content);
      return fim(texto || (proposta ? "Preenchi a tela para você conferir." : conciliacoes ? "Preparei as conciliações para você conferir." : importacao ? "Li o extrato: confira na importação." : "Não consegui responder. Tente de novo."));
    }
    messages.push({ role: "assistant", content: msg.content });
    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const uso of usos) {
      if (uso.name === "consultar_numero") {
        consultas++;
        try {
          resultados.push({ type: "tool_result", tool_use_id: uso.id, content: await p.consultar(uso.input) });
        } catch (e) {
          resultados.push({ type: "tool_result", tool_use_id: uso.id, content: e instanceof Error ? e.message : "falha na consulta", is_error: true });
        }
      } else if (uso.name === "propor_preenchimento") {
        const v = propostaValida(uso.input, p.tela?.formulario);
        if (v) proposta = v;
        resultados.push({
          type: "tool_result",
          tool_use_id: uso.id,
          content: v
            ? `Proposta entregue à tela com ${Object.keys(v.valores).length} campo(s). A pessoa confere e salva. Responda em uma ou duas frases o que foi preenchido e o que conferir.`
            : "Nenhum campo válido: use os nomes e as opções do <formulario>.",
          is_error: !v,
        });
      } else if (p.dados && NOMES_DAS_FERRAMENTAS_DE_DADOS.has(uso.name)) {
        consultas++;
        try {
          resultados.push({ type: "tool_result", tool_use_id: uso.id, content: await p.dados(uso.name, uso.input) });
        } catch (e) {
          resultados.push({ type: "tool_result", tool_use_id: uso.id, content: e instanceof Error ? e.message : "falha na consulta", is_error: true });
        }
      } else if (uso.name === "pendentes_de_conciliacao" && p.caixa?.pendentes) {
        consultas++;
        resultados.push({ type: "tool_result", tool_use_id: uso.id, content: await p.caixa.pendentes(String((uso.input as { conta?: unknown }).conta ?? "")) });
      } else if (uso.name === "candidatos_de_conciliacao" && p.caixa?.candidatos) {
        consultas++;
        resultados.push({ type: "tool_result", tool_use_id: uso.id, content: await p.caixa.candidatos(String((uso.input as { movimento?: unknown }).movimento ?? "")) });
      } else if (uso.name === "propor_conciliacoes" && p.caixa?.propor) {
        const r = await p.caixa.propor((uso.input as { itens?: unknown }).itens);
        if (r.proposta) conciliacoes = r.proposta;
        resultados.push({ type: "tool_result", tool_use_id: uso.id, content: r.texto, is_error: !r.proposta });
      } else if (uso.name === "ler_extrato" && p.caixa?.lerExtrato) {
        const r = await p.caixa.lerExtrato(String((uso.input as { conta?: unknown }).conta ?? ""));
        if (r.proposta) importacao = r.proposta;
        resultados.push({ type: "tool_result", tool_use_id: uso.id, content: r.texto, is_error: !r.proposta });
      } else {
        resultados.push({ type: "tool_result", tool_use_id: uso.id, content: "Ferramenta desconhecida.", is_error: true });
      }
    }
    messages.push({ role: "user", content: resultados });
  }
  return fim(proposta ? "Preenchi a tela para você conferir." : conciliacoes ? "Preparei as conciliações para você conferir." : "A consulta ficou longa demais. Refaça a pergunta mais direta.");
}

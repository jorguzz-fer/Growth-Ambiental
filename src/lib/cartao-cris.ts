import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { conciliacaoDoCartao } from "@/lib/cartao-conciliacao";
import { linkParaLancarCompra } from "@/lib/cartao-links";
import { getCartoes } from "@/lib/queries";
import { ehPlanilha, type PropostaDeConciliacaoCartao, type PropostaDeFatura } from "@/lib/cris";
import { linhasDaPlanilha } from "@/lib/extrato-planilha";
import { isAiConfigured } from "@/lib/ai/client";
import { comUsoDeIa } from "@/lib/ai/uso";
import { extractExtratoFromDocument } from "@/lib/ai/extrato-extract";
import { ymd } from "@/lib/utils";

/**
 * GA-11 §4.2 — a Cris no cartão de crédito, no mesmo padrão das ferramentas
 * de conta corrente (`conciliacao-cris.ts`): ela LÊ e PROPÕE; quem grava é o
 * botão da tela (conciliar a linha, registrar a fatura). Nunca lança despesa
 * nem estorno: compra sem lançamento vira proposta com o link para Despesas.
 *
 * - pendentes: linhas da fatura sem compra conciliada (com o link de lançar
 *   para as que não têm candidata) e compras lançadas sem linha na fatura;
 * - candidatos: as compras que o SERVIDOR calculou para a linha (mesmo cartão,
 *   fatura da linha ou vizinha), com o grau;
 * - lote: até 20 itens; cada um é linha + compra candidata, ou linha sem par
 *   (vira proposta de lançamento). O servidor recusa compra que não é candidata.
 */
export const MAX_RODADA_CARTAO = 20;

export interface LinhaPendenteDoCartao {
  linha: string;
  cartao: string;
  cartaoId: string;
  data: string | null;
  descricao: string | null;
  valor: number;
  candidatas: number;
  /** link para lançar em Despesas, quando não há compra candidata. */
  lancar: string | null;
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

async function nomesDosCartoes(tenantId: string) {
  return (await getCartoes(tenantId)).filter((c) => c.ativo).map((c) => ({ id: c.id, nome: `${c.apelido}${c.ultimos4 ? " •••• " + c.ultimos4 : ""}`, apelido: c.apelido, ultimos4: c.ultimos4 ?? "" }));
}

/** Cartão pelo que a pessoa disse ("Nubank", "final 1234"); só com uma correspondência. */
export async function cartaoPeloNome(tenantId: string, nome: string): Promise<{ id: string; nome: string } | null> {
  const alvo = normalizar(nome);
  if (!alvo) return null;
  const achados = (await nomesDosCartoes(tenantId)).filter((c) => {
    const ap = normalizar(c.apelido);
    return (ap && (alvo.includes(ap) || ap.includes(alvo))) || (c.ultimos4.length === 4 && alvo.includes(c.ultimos4));
  });
  return achados.length === 1 ? { id: achados[0].id, nome: achados[0].nome } : null;
}

/** As linhas pendentes (até `limite`, das mais antigas) e as compras lançadas sem linha na fatura. */
export async function pendentesDoCartao(tenantId: string, cartaoId: string | null, limite = MAX_RODADA_CARTAO) {
  const cartoes = (await nomesDosCartoes(tenantId)).filter((c) => !cartaoId || c.id === cartaoId);
  const linhas: LinhaPendenteDoCartao[] = [];
  for (const c of cartoes) {
    for (const f of await conciliacaoDoCartao(tenantId, c.id)) {
      for (const l of f.linhas) {
        if (l.despesaId || l.credito) continue;
        linhas.push({ linha: l.id, cartao: c.nome, cartaoId: c.id, data: l.data, descricao: l.descricao, valor: l.valor, candidatas: l.sugestoes.length, lancar: l.sugestoes.length === 0 ? linkParaLancarCompra(c.id, l) : null });
      }
    }
  }
  linhas.sort((a, b) => (ymd(a.data) ?? 0) - (ymd(b.data) ?? 0));
  return { linhas: linhas.slice(0, limite), total: linhas.length, cartoes: cartoes.map((c) => c.nome) };
}

export function textoDosPendentesDoCartao(r: Awaited<ReturnType<typeof pendentesDoCartao>>): string {
  if (r.total === 0) return `Nenhuma linha de fatura a conciliar (${r.cartoes.join(", ") || "nenhum cartão ativo"}).`;
  return JSON.stringify({
    total: r.total,
    nestaRodada: r.linhas.length,
    linhas: r.linhas.map((l) => ({ linha: l.linha, cartao: l.cartao, data: l.data, descricao: l.descricao, valor: l.valor, compras_candidatas: l.candidatas, ...(l.lancar ? { sem_lancamento: true } : {}) })),
    aviso: "Linha com sem_lancamento não tem compra lançada: proponha-a em propor_conciliacoes_cartao sem 'despesa' (vira link para Despesas). Nunca diga que lançou.",
  });
}

/** As candidatas que o servidor calcula para uma linha (só estas podem ser propostas). */
export async function candidatosDoCartao(tenantId: string, linhaId: string) {
  const [l] = await db.select({ cartaoId: schema.extratoCartao.cartaoId }).from(schema.extratoCartao).where(and(eq(schema.extratoCartao.id, linhaId), eq(schema.extratoCartao.tenantId, tenantId))).limit(1);
  if (!l) return null;
  const linha = (await conciliacaoDoCartao(tenantId, l.cartaoId)).flatMap((f) => f.linhas).find((x) => x.id === linhaId);
  if (!linha || linha.despesaId || linha.credito) return null;
  return {
    cartaoId: l.cartaoId,
    linha,
    candidatos: linha.sugestoes.map((s) => ({ despesa: s.despesaId, rotulo: `${s.numDoc ?? "compra"} · ${s.descricao ?? ""} · ${brl(s.valor)} · ${s.parcela}`, grau: s.grau, motivo: s.motivo, valor: s.valor })),
  };
}

/** Confere o lote no servidor: compra só se for candidata da linha; linha sem par vira proposta de lançamento. */
export async function validarLoteDoCartao(tenantId: string, itens: { linha: string; despesa: string | null }[]): Promise<PropostaDeConciliacaoCartao> {
  const out: PropostaDeConciliacaoCartao = { itens: [], lancar: [], recusados: [] };
  const nomes = new Map((await nomesDosCartoes(tenantId)).map((c) => [c.id, c.nome]));
  const vistos = new Set<string>();
  for (const it of itens.slice(0, MAX_RODADA_CARTAO)) {
    if (vistos.has(it.linha)) {
      out.recusados.push({ linha: it.linha, motivo: "linha repetida no lote" });
      continue;
    }
    vistos.add(it.linha);
    const c = await candidatosDoCartao(tenantId, it.linha);
    if (!c) {
      out.recusados.push({ linha: it.linha, motivo: "linha não está pendente (ou não é desta empresa)" });
      continue;
    }
    const desc = `${c.linha.data ?? ""} · ${c.linha.descricao ?? ""} · ${brl(c.linha.valor)}`;
    const cartao = nomes.get(c.cartaoId) ?? "cartão";
    if (!it.despesa) {
      if (c.candidatos.length > 0) out.recusados.push({ linha: it.linha, motivo: "a linha tem compra candidata: proponha a conciliação, não o lançamento" });
      else out.lancar.push({ linha: it.linha, descricaoDaLinha: desc, cartao, valor: c.linha.valor, href: linkParaLancarCompra(c.cartaoId, c.linha) });
      continue;
    }
    const cand = c.candidatos.find((x) => x.despesa === it.despesa);
    if (!cand) {
      out.recusados.push({ linha: it.linha, motivo: "a compra não é candidata desta linha" });
      continue;
    }
    out.itens.push({ linha: it.linha, despesaId: cand.despesa, rotulo: cand.rotulo, descricaoDaLinha: desc, cartao, valor: c.linha.valor });
  }
  return out;
}

/** Lê a fatura anexada (planilha no servidor; PDF ou imagem com a IA). Não grava. */
export async function lerFaturaDoAnexo(anexo: { tipo: string; base64: string; nome: string }, quem: { tenantId: string; userId: string | null }): Promise<{ itens: PropostaDeFatura["itens"] } | { erro: string }> {
  const bytes = Buffer.from(anexo.base64, "base64");
  if (ehPlanilha(anexo.tipo)) {
    // Fatura do cartão: positivo = compra, negativo = crédito (como em "Subir fatura").
    const r = linhasDaPlanilha(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    const itens = r.rows.map((x) => ({ data: x.data, descricao: x.descricao, valor: x.valor })).filter((i) => i.valor !== 0 && ymd(i.data));
    return itens.length ? { itens } : { erro: "nenhum lançamento com data e valor reconhecido: confira as colunas de Data, Descrição e Valor" };
  }
  if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(anexo.tipo)) return { erro: "envie a fatura em PDF, imagem, XLSX ou CSV" };
  if (!isAiConfigured()) return { erro: "a leitura de PDF ou imagem da fatura exige a IA configurada" };
  const r = await comUsoDeIa({ tenantId: quem.tenantId, userId: quem.userId, operacao: "extrato" }, () => extractExtratoFromDocument(new Uint8Array(bytes), anexo.tipo, "cartao"));
  const itens = r.movimentos.map((m) => ({ data: m.data, descricao: m.descricao, valor: m.valor })).filter((i) => i.valor !== 0 && ymd(i.data));
  return itens.length ? { itens } : { erro: "não identifiquei lançamentos na fatura" };
}

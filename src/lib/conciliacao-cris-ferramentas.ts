import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { TenantContext } from "@/lib/context";
import type { PropostaDeConciliacao, PropostaDeImportacao } from "@/lib/cris";
import { candidatosDoMovimento, MAX_RODADA, pendentesDaRodada, textoDosPendentes, validarLote, type ItemDoLote } from "@/lib/conciliacao-cris";
import { lerExtratoDoAnexo } from "@/lib/extrato-leitura";
import type { PedidoDaCris } from "@/lib/ai/cris";

/**
 * Prompt AT §8 (Revisão 4) — as ferramentas da Cris na tela do Caixa, montadas
 * com a sessão e a permissão da pessoa. TODAS só leem (8.5):
 *
 * - `pendentes_de_conciliacao` e `candidatos_de_conciliacao`: Caixa/editar;
 * - `propor_conciliacoes`: Caixa/editar; o servidor recusa ref que não é
 *   candidata do movimento (AT-T16) e devolve a lista à tela;
 * - `ler_extrato`: Caixa/criar; as linhas vão para o diálogo de importação.
 *
 * Sem Caixa/editar, nenhuma ferramenta de conciliação: a Cris recebe o aviso
 * e explica por quê (AT-T18).
 */
const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

async function contaPeloNome(tenantId: string, nome: string): Promise<{ id: string; nome: string } | null> {
  const contas = await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.tenantId, tenantId));
  const alvo = normalizar(nome);
  if (!alvo) return null;
  const achadas = contas.filter((c) => {
    const n = normalizar(`${c.banco}${c.cc ?? ""}`);
    const cc = normalizar(c.cc ?? "");
    return n.includes(alvo) || alvo.includes(normalizar(c.banco)) || (cc.length >= 4 && alvo.includes(cc));
  });
  return achadas.length === 1 ? { id: achadas[0].id, nome: `${achadas[0].banco}${achadas[0].cc ? " · " + achadas[0].cc : ""}` } : null;
}

export function ferramentasDoCaixa(
  ctx: TenantContext,
  opts: { podeConciliar: boolean; podeImportar: boolean; anexo: { tipo: string; base64: string; nome: string } | null; contaDaTela: string | null },
): NonNullable<PedidoDaCris["caixa"]> {
  const tenantId = ctx.tenant.id;
  const out: NonNullable<PedidoDaCris["caixa"]> = {};
  if (!opts.podeConciliar) {
    out.semPermissao =
      "A pessoa NÃO tem a permissão Caixa/editar: você não tem as ferramentas de conciliação. Se ela pedir para conciliar, explique que conciliar exige essa permissão e que um administrador a concede em Gestão de Acessos.";
  } else {
    out.pendentes = async (conta) => {
      const c = conta ? await contaPeloNome(tenantId, conta) : null;
      return textoDosPendentes(await pendentesDaRodada(tenantId, c?.id ?? opts.contaDaTela));
    };
    out.candidatos = async (movimento) => {
      const r = await candidatosDoMovimento(tenantId, movimento);
      if (!r) return "Este movimento não está pendente (ou não é desta empresa).";
      if (r.candidatos.length === 0) return `Sem candidatos para este movimento (valor ${r.valor}). Ofereça lançar o que falta.`;
      return JSON.stringify({ valorDoMovimento: r.valor, candidatos: r.candidatos });
    };
    out.propor = async (itensBrutos) => {
      const itens: ItemDoLote[] = Array.isArray(itensBrutos)
        ? itensBrutos
            .slice(0, MAX_RODADA + 1)
            .filter((x): x is { movimento: string; ref: string; valor?: number } => !!x && typeof x === "object" && typeof (x as { movimento?: unknown }).movimento === "string" && typeof (x as { ref?: unknown }).ref === "string")
            .map((x) => ({ movimento: x.movimento, ref: x.ref, valor: typeof x.valor === "number" && x.valor > 0 ? x.valor : null }))
        : [];
      if (itens.length === 0) return { texto: "Nenhum item válido: cada item precisa de movimento e ref.", proposta: null };
      const { validos, recusados } = await validarLote(tenantId, itens);
      if (validos.length === 0) return { texto: `Nada a propor: ${recusados.map((r) => r.motivo).join("; ")}.`, proposta: null };
      const pendentes = await pendentesDaRodada(tenantId, null);
      const descricao = (mov: string) => {
        const p = pendentes.find((x) => x.movimento === mov);
        return p ? `${p.data ?? ""} · ${p.descricao ?? ""} · ${p.valor}` : mov;
      };
      const proposta: PropostaDeConciliacao = {
        itens: validos.map((v) => ({ movimento: v.movimento, ref: v.ref, rotulo: v.rotulo, tipo: v.tipo, descricaoDoMovimento: descricao(v.movimento), valor: v.valor ?? null })),
        recusados: recusados.map((r) => ({ movimento: r.item.movimento, ref: r.item.ref, motivo: r.motivo })),
      };
      return {
        texto: `Lista entregue à tela: ${validos.length} conciliação(ões) para a pessoa confirmar${recusados.length ? `; ${recusados.length} recusada(s) pelo servidor (${recusados.map((r) => r.motivo).join("; ")})` : ""}. Diga em uma frase o que propôs e que nada foi gravado.`,
        proposta,
      };
    };
  }
  if (opts.podeImportar && opts.anexo) {
    const anexo = opts.anexo;
    out.lerExtrato = async (conta) => {
      const r = await lerExtratoDoAnexo(anexo, { tenantId, userId: ctx.userId });
      if ("erro" in r) return { texto: `Não consegui ler o extrato: ${r.erro}.`, proposta: null };
      const sugerida = (conta ? await contaPeloNome(tenantId, conta) : null) ?? (opts.contaDaTela ? { id: opts.contaDaTela, nome: "a conta escolhida na tela" } : null);
      const contas = (await db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.tenantId, tenantId))).map((c) => `${c.banco}${c.cc ? " · " + c.cc : ""}`);
      const datas = r.linhas.map((l) => l.data).sort();
      const entradas = r.linhas.filter((l) => l.valor > 0).reduce((a, l) => a + l.valor, 0);
      const saidas = r.linhas.filter((l) => l.valor < 0).reduce((a, l) => a - l.valor, 0);
      const proposta: PropostaDeImportacao = { nome: anexo.nome, linhas: r.linhas, saldoFinal: r.saldoFinal, contaSugerida: sugerida?.id ?? null };
      return {
        texto:
          `Extrato lido no servidor: ${r.linhas.length} movimento(s), de ${datas[0]} a ${datas[datas.length - 1]}; entradas ${entradas.toFixed(2)}, saídas ${saidas.toFixed(2)}. ` +
          (sugerida ? `Conta proposta: ${sugerida.nome}; peça confirmação. ` : `Conta não identificada; pergunte qual destas: ${contas.join("; ")}. `) +
          "A tela mostra o botão para abrir a importação já preenchida; quem importa é o botão do diálogo. Não transcreva as linhas.",
        proposta,
      };
    };
  }
  return out;
}

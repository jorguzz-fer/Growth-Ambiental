import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isPluggyConfigured } from "@/lib/openfinance/pluggy";
import { seloDoOpenFinance } from "@/lib/openfinance/selo";

export { seloDoOpenFinance };

/**
 * Prompt AT §1-B.8 e 1-B.9 — o que a tela mostra do Open Finance. Só leitura.
 */
export interface ConexaoView {
  itemId: string;
  banco: string | null;
  situacao: "conectado" | "atualizando" | "precisa_acao" | "erro" | "desconectado";
  ultimaAtualizacao: string | null;
  ultimoErro: string | null;
  contas: { pluggyAccountId: string; tipo: string; nome: string | null; numero: string | null; bankAccountId: string | null; cartaoId: string | null; ignorada: boolean }[];
}

export interface PossivelDuplicadoView {
  id: string;
  bankAccountId: string | null;
  data: string | null;
  descricao: string | null;
  valor: number;
  existenteId: string | null;
}

export interface OpenFinanceDaEmpresa {
  configurado: boolean;
  conexoes: ConexaoView[];
  /** pluggy ↔ app: situação de cada conta corrente e cartão associado. */
  porConta: Map<string, ConexaoView>;
  porCartao: Map<string, ConexaoView>;
  contasConectadas: number;
  possiveisDuplicados: PossivelDuplicadoView[];
  /** 1-B.9 — o selo: diz a verdade. null = não mostrar nada. */
  selo: string | null;
}

export async function openFinanceDaEmpresa(tenantId: string): Promise<OpenFinanceDaEmpresa> {
  const configurado = isPluggyConfigured();
  const [itens, contas, dups] = await Promise.all([
    db.select().from(schema.openfinanceItens).where(and(eq(schema.openfinanceItens.tenantId, tenantId), ne(schema.openfinanceItens.situacao, "desconectado"))).orderBy(desc(schema.openfinanceItens.conectadoEm)),
    db.select().from(schema.openfinanceContas).where(eq(schema.openfinanceContas.tenantId, tenantId)),
    db.select().from(schema.openfinancePossiveisDuplicados).where(and(eq(schema.openfinancePossiveisDuplicados.tenantId, tenantId), isNull(schema.openfinancePossiveisDuplicados.decisao))),
  ]);
  const conexoes: ConexaoView[] = itens.map((i) => ({
    itemId: i.itemId,
    banco: i.banco,
    situacao: i.situacao as ConexaoView["situacao"],
    ultimaAtualizacao: i.ultimaAtualizacao ? i.ultimaAtualizacao.toISOString() : null,
    ultimoErro: i.ultimoErro,
    contas: contas.filter((c) => c.itemId === i.itemId).map((c) => ({ pluggyAccountId: c.pluggyAccountId, tipo: c.tipo, nome: c.nome, numero: c.numero, bankAccountId: c.bankAccountId, cartaoId: c.cartaoId, ignorada: c.ignorada })),
  }));
  const porConta = new Map<string, ConexaoView>();
  const porCartao = new Map<string, ConexaoView>();
  for (const c of conexoes)
    for (const k of c.contas) {
      if (k.bankAccountId) porConta.set(k.bankAccountId, c);
      if (k.cartaoId) porCartao.set(k.cartaoId, c);
    }
  const contasConectadas = porConta.size + porCartao.size;
  return {
    configurado,
    conexoes,
    porConta,
    porCartao,
    contasConectadas,
    possiveisDuplicados: dups.map((d) => ({ id: d.id, bankAccountId: d.bankAccountId, data: d.data, descricao: d.descricao, valor: Number(d.valor), existenteId: d.existenteId })),
    selo: seloDoOpenFinance(configurado, contasConectadas),
  };
}

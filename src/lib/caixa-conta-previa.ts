import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isContaDaEmpresa } from "@/lib/contas-saldo";
import { getCashDaEmpresa } from "@/lib/queries";
import { partesDosMovimentosSemObra, realizadoDaVersao } from "@/lib/movimento-obra";

/**
 * Prévia da chave "caixa_conciliacao_por_conta" (Prompt AT §3 e §4). SOMENTE
 * LEITURA. Mostra o que a tela de conciliação por conta vai mostrar (por conta:
 * movimentos, pendentes de conciliar, sem obra) e confere, por obra, que o
 * realizado de hoje e o realizado pelo vínculo são iguais para os movimentos
 * que já existem (AT-T6): a chave só muda o que nasce depois de ligada.
 */
export interface PreviaCaixaConta {
  contas: { id: string; nome: string; terceiros: boolean; movimentos: number; pendentes: number; semObra: number }[];
  semConta: { movimentos: number; pendentes: number };
  obras: { projeto: string; hoje: number; peloVinculo: number }[];
  semObra: { qtd: number; naoAtribuido: number };
}

export async function previaCaixaPorConta(tenantId: string): Promise<PreviaCaixaConta> {
  const [contas, cash, partes, atuais] = await Promise.all([
    db.select().from(schema.bankAccounts).where(eq(schema.bankAccounts.tenantId, tenantId)),
    getCashDaEmpresa(tenantId),
    partesDosMovimentosSemObra(tenantId),
    db
      .select({ id: schema.versions.id, projeto: schema.projects.name })
      .from(schema.versions)
      .innerJoin(schema.projects, eq(schema.versions.projectId, schema.projects.id))
      .where(and(eq(schema.versions.tenantId, tenantId), eq(schema.versions.kind, "atual"))),
  ]);
  const pendente = (c: (typeof cash)[number]) => !c.rec && c.cat !== "ajuste";
  const linhas = contas.map((k) => {
    const mov = cash.filter((c) => c.bankAccountId === k.id);
    return {
      id: k.id,
      nome: `${k.banco}${k.cc ? " · " + k.cc : ""}`,
      terceiros: !isContaDaEmpresa(k),
      movimentos: mov.length,
      pendentes: mov.filter(pendente).length,
      semObra: mov.filter((c) => !c.versionId).length,
    };
  });
  const semContaMov = cash.filter((c) => !c.bankAccountId);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const obras = await Promise.all(
    atuais.map(async (v) => {
      const proprios = cash.filter((c) => c.versionId === v.id).reduce((a, c) => a + Number(c.valor), 0);
      const pelo = (await realizadoDaVersao(v.id)).reduce((a, c) => a + c.valor, 0);
      return { projeto: v.projeto, hoje: r2(proprios), peloVinculo: r2(pelo) };
    }),
  );
  return {
    contas: linhas,
    semConta: { movimentos: semContaMov.length, pendentes: semContaMov.filter(pendente).length },
    obras: obras.sort((a, b) => a.projeto.localeCompare(b.projeto, "pt-BR")),
    semObra: { qtd: cash.filter((c) => !c.versionId).length, naoAtribuido: r2(partes.filter((p) => p.versionId == null).reduce((a, p) => a + p.valor, 0)) },
  };
}

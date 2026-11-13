/**
 * Conversão do Plano de Contas pela linha de comando — para o operador rodar
 * no container (Coolify) quando preferir não usar a tela. Empacotado por
 * `npm run build:seed` em `.migrate/converter-plano.mjs`.
 *
 *   node converter-plano.mjs --listar
 *       empresas e o plano que cada uma tem (só leitura)
 *   node converter-plano.mjs --empresa <id>
 *       PRÉVIA da conversão daquela empresa (só leitura, padrão)
 *   node converter-plano.mjs --empresa <id> --aplicar --confirmar <id>
 *       aplica (repita o id em --confirmar; faça o backup antes)
 *   node converter-plano.mjs --empresa <id> --desfazer --confirmar <id>
 *       desfaz a última conversão (só se nada criado por ela tiver uso)
 *
 * Nada aqui roda sem `--empresa`: a conversão é por empresa, nunca em todas.
 */
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { aplicarConversao, desfazerConversao, previaDaConversao } from "@/lib/planocontas-conversao-servidor";
import type { PlanoDeConversao } from "@/lib/planocontas-conversao";

function arg(nome: string): string | null {
  const i = process.argv.indexOf(nome);
  return i >= 0 ? (process.argv[i + 1] ?? "") : null;
}
const tem = (nome: string) => process.argv.includes(nome);

function imprimir(p: PlanoDeConversao) {
  const r = p.resumo;
  console.log(`Plano padrão: ${p.versao}`);
  if (p.nadaAFazer) return console.log("Nada a fazer: a empresa já está no plano de consultoria ambiental.");
  console.log(`Criar: ${p.criarGrupos.length} grupo(s)/subgrupo(s) e ${p.criarContas.length} conta(s) ambientais. Mantidas: ${p.mantidas}.`);
  console.log(`Inativar: ${r.contasAntigasAtivas} conta(s) antigas (${r.contasAntigasUsadas} com lançamentos: ${r.lancamentosPreservados} despesa(s) preservadas) e ${p.inativar.filter((i) => i.tipo === "grupo").length} grupo(s).`);
  console.log(`Arquivar/ajustar códigos: ${p.renomear.length} (referências reescritas: ${r.referenciasRenomeadas}; em versão congelada: ${r.emVersaoCongelada} — só o código muda).`);
  for (const x of p.renomear) console.log(`  ${x.tipo} ${x.de} → ${x.para}  ${x.nome}`);
  const usadas = p.inativar.filter((i) => i.tipo === "conta" && i.uso.despesas + i.uso.orcamento + i.uso.medicoes > 0);
  if (usadas.length) {
    console.log("Contas antigas com uso (ficam inativas; reclassificar é opcional, pela tela):");
    for (const i of usadas) console.log(`  ${i.code} ${i.nome} — ${i.uso.despesas} despesa(s), ${i.uso.orcamento} linha(s) de orçamento → sugestão: ${i.equivalente ? `${i.equivalente.code} ${i.equivalente.nome}` : "sem equivalente"}`);
  }
}

async function main() {
  if (tem("--listar")) {
    const linhas = await db.execute(sql`
      select t.id, t.name, count(a.*)::int as contas, count(a.*) filter (where a.ativo)::int as ativas
      from tenant t left join chart_account a on a.tenant_id = t.id group by t.id order by t.created_at`);
    for (const t of linhas as unknown as { id: string; name: string; contas: number; ativas: number }[]) {
      const p = await previaDaConversao(t.id);
      console.log(`${t.id}  ${t.name}  — ${t.ativas}/${t.contas} contas ativas — ${p.nadaAFazer ? "plano ambiental" : "PRECISA CONVERTER"}`);
    }
    return;
  }
  const empresa = arg("--empresa");
  if (!empresa) throw new Error("Informe --empresa <id> (ou --listar).");
  const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, empresa)).limit(1);
  if (!t) throw new Error("Empresa não encontrada.");
  console.log(`Empresa: ${t.name} (${t.id})`);
  if (tem("--aplicar") || tem("--desfazer")) {
    if (arg("--confirmar") !== t.id) throw new Error("Repita o id da empresa em --confirmar para gravar.");
    if (tem("--desfazer")) {
      const r = await desfazerConversao(t.id, null);
      console.log(r.ok ? "Conversão desfeita." : `Recusado: ${r.error}`);
      return;
    }
    const r = await aplicarConversao(t.id, null, "linha de comando");
    imprimir(r.plano);
    console.log(r.aplicada ? `APLICADO: ${r.criadosGrupos} grupo(s) e ${r.criadasContas} conta(s) criados.` : "Nada aplicado.");
    return;
  }
  console.log("PRÉVIA (nada é gravado). Para aplicar: --aplicar --confirmar <id>.");
  imprimir(await previaDaConversao(t.id));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });

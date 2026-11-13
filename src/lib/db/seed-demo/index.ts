/**
 * Seed de DEMONSTRAÇÃO completo — uma consultoria ambiental fictícia com
 * ~12 meses de histórico e ~12 meses de projeção, para apresentar o app.
 *
 * Diferente de um INSERT direto, os fluxos com regra de negócio passam pelas
 * AÇÕES REAIS do app (criar projeto, contrato, itens, medições, aditivo,
 * faturamento, despesas, pagamentos, recebimentos, orçamento, plano de
 * trabalho, estoque). Elas rodam com a "sessão" do administrador da demo —
 * ver `stubs/auth.ts` e `scripts/build-seed.mjs`. Assim os números
 * batem entre as telas (DRE, fluxo de caixa, contratos, contas a pagar e a
 * receber) exatamente como se tivessem sido lançados à mão.
 *
 * Uso:
 *   npm run build:seed                    # gera .migrate/seed.mjs
 *   SEED_ADMIN_EMAIL=demo@exemplo.com node .migrate/seed.mjs
 *
 * Variáveis:
 *   SEED_ADMIN_EMAIL       login da demonstração (obrigatório). Precisa ser um
 *                          e-mail SEM vínculo com outra empresa: o app abre a
 *                          primeira empresa do usuário.
 *   SEED_ADMIN_PASSWORD    senha inicial (opcional; sem ela, uma aleatória é
 *                          mostrada uma vez e a troca é exigida no 1º acesso).
 *   SEED_DEMO_EM_PRODUCAO  "sim" para rodar com NODE_ENV=production.
 *   SEED_DEMO_RECRIAR      "sim" apaga a empresa de demonstração e recria do zero.
 */
import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { linhasDoPlano } from "@/lib/calc/plano-ambiental";
import { instalarPlanoPadrao } from "@/lib/planocontas-padrao";
import { garantirModalidades } from "@/lib/contrato-modalidades";
import { garantirBiblioteca } from "@/lib/plano-biblioteca";
import { arvoreDoModelo } from "@/lib/plano-regras";
import { createProject, setProjectSituacao } from "@/lib/actions/projects";
import { addAjuste } from "@/lib/actions/caixa";
import { addDespesa, pagarDespesa } from "@/lib/actions/despesas";
import { registrarRecebimento } from "@/lib/actions/contas-receber";
import { saveBudgetPlanning } from "@/lib/actions/planning";
import { RECEITAS_PROJETO_KEY } from "@/lib/budget/config";
import { pagarFatura } from "@/lib/actions/faturas";
import { addStockItem, addStockMovement } from "@/lib/actions/estoque";
import { criarPlano, atualizarAndamento } from "@/lib/actions/plano";
import {
  salvarContrato,
  salvarItem,
  mudarStatusContrato,
  salvarMedicao,
  mudarStatusMedicao,
  faturarContrato,
  salvarAditivo,
  mudarStatusAditivo,
  salvarMarco,
} from "@/lib/actions/contratos";
import { sessaoDoSeed } from "./stubs/auth";
import {
  EMPRESA,
  NOMES_ANTERIORES,
  EMAILS_ANTERIORES,
  CLIENTES,
  FORNECEDORES,
  FUNCIONARIOS,
  EQUIPE_COM_ACESSO,
  ESTOQUE,
  PROJETOS,
  FIXAS_DA_SEDE,
  cnpj,
  type ProjetoDemo,
} from "./dados";

// ─────────────────────────────── utilidades ───────────────────────────────

/** Gerador pseudoaleatório com semente fixa: a demo sai igual a cada execução. */
function prng(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = prng(20251113);
const varia = (v: number, pct = 0) => Math.round(v * (1 + (rnd() * 2 - 1) * pct) * 100) / 100;
const r2 = (v: number) => Math.round(v * 100) / 100;

const HOJE = new Date();
HOJE.setHours(12, 0, 0, 0);
/** Mês 0 = 12 meses antes do mês corrente; o mês corrente é o 12. */
const MES_CORRENTE = 12;
function dataDoMes(m: number, dia: number): Date {
  const d = new Date(HOJE.getFullYear(), HOJE.getMonth() - MES_CORRENTE + m, 1, 12);
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimo));
  return d;
}
const mdy = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const comp = (m: number) => {
  const d = dataDoMes(m, 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const somaDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const passou = (d: Date) => d.getTime() < HOJE.getTime();

class FalhaDoSeed extends Error {}
function ok<T extends { ok: boolean }>(r: T | undefined | void, oQue: string): T & { ok: true } {
  if (!r || !r.ok) throw new FalhaDoSeed(`${oQue}: ${(r as { error?: string } | undefined)?.error ?? "sem resposta"}`);
  return r as T & { ok: true };
}
function fd(campos: Record<string, string | number | null | undefined>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) if (v != null && v !== "") f.set(k, String(v));
  return f;
}

/**
 * Categoria da DRE e grupo (subgrupo, a chave do Orçamento) pela conta do
 * plano padrão — o mesmo que a empresa recebe. Conta fora do plano é erro do
 * seed, não palpite pelo prefixo.
 */
const CONTAS_DO_PLANO = new Map(linhasDoPlano("seed").map((c) => [c.code, c]));
function contaDoPlano(conta: string) {
  const c = CONTAS_DO_PLANO.get(conta);
  if (!c) throw new FalhaDoSeed(`Conta ${conta} não existe no plano padrão.`);
  return c;
}
function categoriaDaConta(conta: string): string {
  return contaDoPlano(conta).dreCategory;
}
function grupoDaContaDoPlano(conta: string): string {
  return contaDoPlano(conta).groupCode;
}

// ─────────────────────────────── estado da execução ───────────────────────────────

interface Ctx {
  tenantId: string;
  bancoPrincipal: string;
  bancoSecundario: string;
  cartaoId: string;
  sedeId: string;
  clientes: Record<string, string>;
  fornecedores: Record<string, string>;
  projetos: Record<string, string>;
  /** faturamento emitido por mês (absoluto), para o DAS. */
  faturadoNoMes: Map<number, number>;
  /** despesas pagas de propósito em atraso / deixadas em aberto. */
  despesasEmAberto: number;
  contagem: Record<string, number>;
}
const conta = (c: Ctx, k: string, n = 1) => (c.contagem[k] = (c.contagem[k] ?? 0) + n);

async function versaoDoProjeto(projectId: string, kind: "budget" | "forecast" | "atual") {
  const [v] = await db.select().from(schema.versions).where(and(eq(schema.versions.projectId, projectId), eq(schema.versions.kind, kind))).limit(1);
  if (!v) throw new FalhaDoSeed(`Projeto sem versão ${kind}.`);
  return v;
}

// ─────────────────────────────── 1. empresa e cadastros ───────────────────────────────

async function criarEmpresa(email: string): Promise<{ tenantId: string; senha: string | null }> {
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: EMPRESA.nome,
      nomeFantasia: EMPRESA.nomeFantasia,
      cnpj: cnpj(10).replace(/\D/g, ""),
      inscricaoMunicipal: "0101234567",
      regimeTributario: "SIMPLES",
      cnae: EMPRESA.cnae,
      aliquotaIss: "3.00",
      logradouro: "Rua das Araucárias",
      numeroEndereco: "1450",
      complemento: "Sala 802",
      bairro: "Batel",
      municipio: EMPRESA.municipio,
      uf: EMPRESA.uf,
      codigoMunicipio: "4106902",
      cep: "80420-000",
      telefone: "(41) 3000-0000",
      emailFiscal: "financeiro@consultoria-ambiental.exemplo",
      fiscalAmbiente: "homologacao",
    })
    .returning();

  const [existente] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  let senha: string | null = null;
  let userId: string;
  if (existente) {
    const vinculos = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, existente.id));
    if (vinculos.length > 0) {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, tenant.id));
      throw new FalhaDoSeed(
        `O e-mail ${email} já pertence a outra empresa. O app abre a PRIMEIRA empresa do usuário, então a demonstração ficaria invisível para ele. Use um e-mail exclusivo para a demo em SEED_ADMIN_EMAIL.`,
      );
    }
  }
  // Usuário sem empresa (ex.: sobra de uma demonstração recriada): recebe a
  // senha desta execução, como um usuário novo.
  senha = process.env.SEED_ADMIN_PASSWORD?.trim() || `Demo-${randomBytes(9).toString("base64url")}9a`;
  const dadosDoLogin = { name: "Demonstração", passwordHash: hashPassword(senha), mustChangePassword: !process.env.SEED_ADMIN_PASSWORD, passwordChangedAt: null };
  if (existente) {
    await db.update(schema.users).set(dadosDoLogin).where(eq(schema.users.id, existente.id));
    userId = existente.id;
  } else {
    const [u] = await db.insert(schema.users).values({ email, ...dadosDoLogin }).returning();
    userId = u.id;
  }
  if (process.env.SEED_ADMIN_PASSWORD) senha = null;
  await db.insert(schema.memberships).values({ userId, tenantId: tenant.id, role: "owner" });

  // Equipe com acesso (sem senha: aparecem em Usuários, não entram).
  for (const p of EQUIPE_COM_ACESSO) {
    const [u] = await db.insert(schema.users).values({ name: p.nome, email: p.email }).onConflictDoNothing().returning();
    if (u) await db.insert(schema.memberships).values({ userId: u.id, tenantId: tenant.id, role: p.role });
  }

  await instalarPlanoPadrao(tenant.id, db, undefined, "seed");
  await garantirModalidades(tenant.id);
  await garantirBiblioteca(tenant.id);
  return { tenantId: tenant.id, senha };
}

async function criarCadastros(tenantId: string): Promise<Omit<Ctx, "sedeId" | "projetos" | "faturadoNoMes" | "despesasEmAberto" | "contagem">> {
  const [b1] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Banco do Brasil", ag: "3041-7", cc: "28.415-0", tipo: "Construtora", ativo: true }).returning();
  const [b2] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Sicredi", ag: "0720", cc: "61.903-2", tipo: "Construtora", ativo: true }).returning();
  const [cartao] = await db
    .insert(schema.cartoesCredito)
    .values({ tenantId, apelido: "Cartão corporativo", bandeira: "Visa", ultimos4: "4821", titular: "Helena M. Duarte", limite: "25000", diaFechamento: 3, diaVencimento: 10, bankAccountId: b1.id, ativo: true })
    .returning();

  const clientes: Record<string, string> = {};
  for (const c of CLIENTES) {
    const [row] = await db
      .insert(schema.clientes)
      .values({ tenantId, nomeCompleto: c.nome, cpfCnpj: c.doc, cidadeEstado: c.cidade, emailPrincipal: c.email, ramoAtividade: c.ramo, statusContrato: "Ativo" })
      .returning();
    clientes[c.chave] = row.id;
  }
  const fornecedores: Record<string, string> = {};
  for (const f of FORNECEDORES) {
    const [row] = await db
      .insert(schema.stakeholders)
      .values({ tenantId, nome: f.nome, tipo: f.tipo, doc: f.doc, papeis: [...f.papeis], cidade: f.cidade, estado: f.estado, ativo: true })
      .returning();
    fornecedores[f.chave] = row.id;
  }
  for (const [i, f] of FUNCIONARIOS.entries()) {
    await db.insert(schema.funcionarios).values({
      tenantId,
      nome: f.nome,
      cargo: f.cargo,
      setor: f.setor,
      salario: String(f.salario),
      admissao: ymd(dataDoMes(f.admissao, 3 + (i % 20))),
      tipoContrato: f.cargo.startsWith("Estagiário") ? "Estágio" : "CLT",
      jornada: "44h semanais",
      cidade: "Curitiba",
      estado: "PR",
    });
  }
  return { tenantId, bancoPrincipal: b1.id, bancoSecundario: b2.id, cartaoId: cartao.id, clientes, fornecedores };
}

// ─────────────────────────────── 2. despesas ───────────────────────────────

async function lancarDespesa(
  c: Ctx,
  d: { projectId: string; conta: string; fornecedor?: string; descricao: string; valor: number; mes: number; vencimento: Date; forma?: string; deixarEmAberto?: boolean; banco?: string },
): Promise<string> {
  const r = ok(
    await addDespesa(
      fd({
        projectId: d.projectId,
        contaCef: d.conta,
        categoriaDre: categoriaDaConta(d.conta),
        fornecedorId: d.fornecedor ? c.fornecedores[d.fornecedor] : null,
        valor: r2(d.valor),
        competencia: comp(d.mes),
        vencimento: mdy(d.vencimento),
        dataEmissao: mdy(dataDoMes(d.mes, 2)),
        bancoId: d.banco ?? c.bancoPrincipal,
        status: "A pagar",
        formaPagamento: d.forma ?? "Boleto",
        obs: d.descricao,
      }),
    ),
    `Despesa "${d.descricao}" (${comp(d.mes)})`,
  );
  const id = (r as unknown as { id: string }).id;
  conta(c, "despesas");
  if (passou(d.vencimento) && !d.deixarEmAberto) {
    ok(
      await pagarDespesa({
        despesaId: id,
        dataPagamento: mdy(d.vencimento),
        valorPago: r2(d.valor),
        bankAccountId: d.banco ?? c.bancoPrincipal,
        formaPagamento: d.forma ?? "Boleto",
        idempotencyKey: `seed-pg-${id}`,
      }),
      `Pagamento de "${d.descricao}"`,
    );
    conta(c, "pagamentos");
  } else if (passou(d.vencimento)) {
    c.despesasEmAberto++;
  }
  return id;
}

async function despesasDoProjeto(c: Ctx, p: ProjetoDemo, projectId: string) {
  for (const custo of p.custos) {
    // "todos" inclui os meses prorrogados por aditivo.
    const meses = custo.meses === "todos" ? Array.from({ length: p.duracao + (p.aditivo?.mesesExtras ?? 0) }, (_, i) => i) : custo.meses;
    for (const rel of meses) {
      const mes = p.inicio + rel;
      if (mes > MES_CORRENTE) continue; // futuro: só no orçamento/previsão
      const venc = dataDoMes(mes, 18 + Math.floor(rnd() * 10));
      // Duas despesas recentes ficam vencidas sem pagamento (alerta de atraso).
      const emAberto = mes === MES_CORRENTE - 1 && c.despesasEmAberto < 2 && rnd() < 0.35;
      await lancarDespesa(c, {
        projectId,
        conta: custo.conta,
        fornecedor: custo.fornecedor,
        descricao: custo.descricao,
        valor: varia(custo.valor, custo.variacao ?? 0),
        mes,
        vencimento: venc,
        forma: custo.conta === "2.3.06" ? "PIX" : "Boleto",
        deixarEmAberto: emAberto,
      });
    }
  }
}

async function despesasDaSede(c: Ctx) {
  for (let mes = 0; mes <= MES_CORRENTE; mes++) {
    for (const [contaCef, forn, desc, valor, v] of FIXAS_DA_SEDE) {
      const dia = contaCef === "3.1.01" ? 5 : contaCef === "3.2.03" ? 8 : 10 + Math.floor(rnd() * 12);
      await lancarDespesa(c, { projectId: c.sedeId, conta: contaCef, fornecedor: forn, descricao: desc, valor: varia(valor, v), mes, vencimento: dataDoMes(mes, dia), forma: contaCef === "3.1.01" ? "Boleto" : "PIX" });
    }
    // Folha (salários + FGTS) dos funcionários admitidos até o mês.
    const folha = FUNCIONARIOS.filter((f) => f.admissao <= mes).reduce((a, f) => a + f.salario, 0) * 1.08;
    await lancarDespesa(c, { projectId: c.sedeId, conta: "3.2.01", fornecedor: "folha", descricao: `Folha de pagamento e FGTS — ${comp(mes)}`, valor: folha, mes, vencimento: dataDoMes(mes + 1, 5), forma: "Transferência bancária", banco: c.bancoSecundario });
    await lancarDespesa(c, { projectId: c.sedeId, conta: "4.2.01", descricao: "Tarifas bancárias", valor: varia(189, 0.1), mes, vencimento: dataDoMes(mes, 28), forma: "Transferência bancária" });
    if (mes % 3 === 1) await lancarDespesa(c, { projectId: c.sedeId, conta: "3.2.07", fornecedor: "sst", descricao: "Exames ocupacionais e PCMSO", valor: varia(690, 0.2), mes, vencimento: dataDoMes(mes, 15) });
    if (mes === 3) await lancarDespesa(c, { projectId: c.sedeId, conta: "3.7.01", fornecedor: "conselho", descricao: "Anuidades CREA/CRBio da equipe técnica", valor: 4380, mes, vencimento: dataDoMes(mes, 30) });
    if (mes === 4 || mes === 10) await lancarDespesa(c, { projectId: c.sedeId, conta: "3.2.05", descricao: "Curso de capacitação técnica (licenciamento e GIS)", valor: varia(2600, 0.2), mes, vencimento: dataDoMes(mes, 20), forma: "PIX" });
    if (mes === 7) await lancarDespesa(c, { projectId: c.sedeId, conta: "3.5.06", fornecedor: "grafica", descricao: "Documentação e garantias para licitação (PMSB)", valor: 1840, mes, vencimento: dataDoMes(mes, 12) });
    if (mes === 6) await lancarDespesa(c, { projectId: c.sedeId, conta: "6.3.03", descricao: "Notebooks para a equipe de geoprocessamento (2 un.)", valor: 15980, mes, vencimento: dataDoMes(mes, 25), forma: "Transferência bancária" });
  }
}

/** DAS do Simples: ~9,8% do faturado no mês, pago no dia 20 do mês seguinte. */
async function impostos(c: Ctx) {
  for (let mes = 0; mes < MES_CORRENTE; mes++) {
    const fat = c.faturadoNoMes.get(mes) ?? 0;
    if (fat <= 0) continue;
    await lancarDespesa(c, { projectId: c.sedeId, conta: "5.1.04", fornecedor: "governo", descricao: `DAS — Simples Nacional (competência ${comp(mes)})`, valor: fat * 0.098, mes, vencimento: dataDoMes(mes + 1, 20), forma: "Boleto" });
  }
}

/** Compras no cartão corporativo (passagens) e pagamento das faturas vencidas. */
async function cartaoCorporativo(c: Ctx) {
  const mina = c.projetos.mina;
  for (const mes of [1, 4, 7, 10, 12]) {
    const dataCompra = dataDoMes(mes, 6);
    if (!passou(dataCompra)) continue;
    ok(
      await addDespesa(
        fd({
          projectId: mina,
          contaCef: "2.3.02",
          categoriaDre: categoriaDaConta("2.3.02"),
          valor: varia(2380, 0.15),
          competencia: comp(mes),
          cartaoId: c.cartaoId,
          cartaoDataCompra: mdy(dataCompra),
          cartaoParcelas: 1,
          obs: "Passagens aéreas — equipe de campo (Curitiba ⇄ Belo Horizonte)",
        }),
      ),
      "Compra no cartão",
    );
    conta(c, "comprasNoCartao");
  }
  const faturas = await db.select().from(schema.faturasCartao).where(eq(schema.faturasCartao.cartaoId, c.cartaoId));
  for (const f of faturas) {
    const [{ total }] = await db
      .select({ total: sql<string>`coalesce(sum(${schema.despesaParcelas.valorOriginal}), 0)` })
      .from(schema.despesaParcelas)
      .where(eq(schema.despesaParcelas.faturaId, f.id));
    // vencimento gravado como "MM/DD/YYYY" (ou "YYYY-MM-DD" em bases antigas).
    const [a, b, d] = f.vencimento.includes("/") ? f.vencimento.split("/").map(Number) : [0, 0, 0];
    const venc = f.vencimento.includes("/") ? new Date(d, a - 1, b, 12) : new Date(`${f.vencimento}T12:00:00`);
    if (Number(total) > 0 && !Number.isNaN(venc.getTime()) && passou(venc)) {
      ok(await pagarFatura({ faturaId: f.id, valor: Number(total), data: mdy(venc), bankAccountId: c.bancoPrincipal, projectId: mina, idempotencyKey: `seed-fatura-${f.id}` }), "Pagamento da fatura do cartão");
      conta(c, "faturasPagas");
    }
  }
}

// ─────────────────────────────── 3. projetos e contratos ───────────────────────────────

async function projetoEContrato(c: Ctx, p: ProjetoDemo) {
  const inicio = dataDoMes(p.inicio, 1);
  const fim = dataDoMes(p.inicio + p.duracao - 1 + (p.aditivo?.mesesExtras ?? 0), 28);
  const projectId = ok(
    await createProject(p.nome, p.duracao + (p.aditivo?.mesesExtras ?? 0), {
      kind: "proj",
      status: "Em andamento",
      startDate: mdy(inicio),
      endDate: mdy(fim),
      mesInicial: comp(p.inicio),
      mesFinal: comp(p.inicio + p.duracao - 1 + (p.aditivo?.mesesExtras ?? 0)),
      clienteId: c.clientes[p.cliente],
    }),
    `Projeto ${p.nome}`,
  ).id!;
  c.projetos[p.chave] = projectId;
  conta(c, "projetos");
  // Cadastro do projeto: valor (receita) e custo previstos, endereço e município.
  const custoPrevisto = p.custos.reduce((a, cu) => a + cu.valor * (cu.meses === "todos" ? p.duracao : cu.meses.length), 0);
  await db
    .update(schema.projects)
    .set({
      valorConstrucao: String(p.itens.reduce((a, i) => a + i.quantidade * i.valorUnitario, 0) + (p.aditivo?.valor ?? 0)),
      custoConstrucao: String(r2(custoPrevisto)),
      endereco: p.local.endereco,
      municipioObra: p.local.municipio,
      ufObra: p.local.uf,
      codigoMunicipioObra: p.local.codigoIbge,
    })
    .where(eq(schema.projects.id, projectId));

  const [modalidade] = await db
    .select({ id: schema.contratoModalidades.id })
    .from(schema.contratoModalidades)
    .where(and(eq(schema.contratoModalidades.tenantId, c.tenantId), eq(schema.contratoModalidades.nome, p.modalidade)))
    .limit(1);
  const valorOriginal = p.itens.reduce((a, i) => a + i.quantidade * i.valorUnitario, 0);
  const contratoId = ok(
    await salvarContrato({
      titulo: p.titulo,
      numeroCliente: p.numeroCliente,
      clienteId: c.clientes[p.cliente],
      objeto: p.objeto,
      modalidadeId: modalidade?.id ?? null,
      gestor: p.gestor,
      coordenadorTecnico: p.coordenador,
      responsavelComercial: "Helena Martins Duarte",
      responsavelFinanceiro: "Fernanda Lima Rocha",
      dataAssinatura: mdy(somaDias(inicio, -8)),
      dataInicio: mdy(inicio),
      dataTerminoPrevista: mdy(dataDoMes(p.inicio + p.duracao - 1, 28)),
      dataBaseReajuste: mdy(inicio),
      valorOriginal,
      formaFaturamento: "Por medição aprovada",
      condicaoPagamento: `${p.prazoPagamentoDias} dias após a aprovação da medição`,
      periodicidadeMedicao: "Mensal",
      prazoPagamentoDias: p.prazoPagamentoDias,
      indiceReajuste: "IPCA",
      projetos: [{ projectId, valorAlocado: valorOriginal }],
    }),
    `Contrato ${p.titulo}`,
  ).id!;
  conta(c, "contratos");

  const itens: Record<string, string> = {};
  for (const it of p.itens) {
    const ultimo = Math.max(...it.medicoes.map(([m]) => m));
    itens[it.codigo] = ok(
      await salvarItem({
        contratoId,
        codigo: it.codigo,
        descricao: it.descricao,
        unidade: it.unidade,
        quantidade: it.quantidade,
        valorUnitario: it.valorUnitario,
        projectId,
        etapa: it.etapa,
        inicioPrevisto: mdy(dataDoMes(Math.min(...it.medicoes.map(([m]) => m)), 1)),
        conclusaoPrevista: mdy(dataDoMes(ultimo, 28)),
        criterioMedicao: it.criterio,
        condicaoFaturamento: "Após aprovação da medição pelo cliente",
        responsavel: p.coordenador,
      }),
      `Item ${it.codigo} de ${p.titulo}`,
    ).id!;
    // Marco de entrega para itens por entrega.
    if (it.criterio === "entrega") {
      for (const [m] of it.medicoes) {
        await salvarMarco({
          contratoId,
          itemId: itens[it.codigo],
          etapa: it.descricao.slice(0, 80),
          dataPlanejada: mdy(dataDoMes(m, 25)),
          dataRealizada: m < MES_CORRENTE ? mdy(dataDoMes(m, 22)) : null,
          valorPrevisto: it.valorUnitario,
          responsavel: p.coordenador,
          status: m < MES_CORRENTE ? "concluido" : m === MES_CORRENTE ? "em_andamento" : "previsto",
        });
        conta(c, "marcos");
      }
    }
  }
  ok(await mudarStatusContrato({ id: contratoId, para: "ativo" }), `Ativar contrato ${p.titulo}`);

  // Medições mês a mês. Passadas: aprovadas e faturadas. Mês corrente: em análise.
  const meses = [...new Set(p.itens.flatMap((i) => i.medicoes.map(([m]) => m)))].sort((a, b) => a - b);
  for (const mes of meses) {
    if (p.aditivo && p.aditivo.mes <= mes && !("feito" in p.aditivo)) {
      await aditivo(c, p, contratoId, itens);
      Object.assign(p.aditivo, { feito: true });
    }
    if (mes > MES_CORRENTE) continue;
    let medidoNoMes = 0;
    for (const it of p.itens) {
      for (const [m, qtd] of it.medicoes) {
        if (m !== mes) continue;
        const base = { contratoId, itemId: itens[it.codigo], projectId, competencia: comp(mes), responsavel: p.coordenador, dataMedicao: mdy(dataDoMes(mes, 26)), enviar: true, idempotencyKey: `seed-med-${contratoId}-${it.codigo}-${mes}` };
        const medicaoId = ok(
          await salvarMedicao(
            it.criterio === "percentual"
              ? { ...base, percentual: qtd }
              : it.criterio === "quantidade"
                ? { ...base, quantidade: qtd }
                : { ...base, quantidade: qtd, valor: qtd * it.valorUnitario },
          ),
          `Medição ${it.codigo} ${comp(mes)} — ${p.titulo}`,
        ).id!;
        conta(c, "medicoes");
        if (mes < MES_CORRENTE) {
          ok(await mudarStatusMedicao({ id: medicaoId, para: "aprovada" }), `Aprovar medição ${comp(mes)}`);
          medidoNoMes += it.criterio === "percentual" ? (it.quantidade * it.valorUnitario * qtd) / 100 : qtd * it.valorUnitario;
        }
      }
    }
    if (mes >= MES_CORRENTE || medidoNoMes <= 0) continue;

    // Fatura (conta a receber) da medição aprovada.
    const valor = r2(medidoNoMes);
    const vencimento = somaDias(dataDoMes(mes + 1, 5), p.prazoPagamentoDias);
    const contaReceberId = ok(
      await faturarContrato({ contratoId, projectId, valor, vencimento: mdy(vencimento), descricao: `Medição ${comp(mes)} — ${p.titulo}`, idempotencyKey: `seed-fat-${contratoId}-${mes}` }),
      `Faturar ${comp(mes)} — ${p.titulo}`,
    ).id!;
    conta(c, "faturas");
    c.faturadoNoMes.set(mes, (c.faturadoNoMes.get(mes) ?? 0) + valor);

    // Recebimento: entra no extrato e é conciliado com a conta a receber.
    const emAtraso = p.faturasEmAtraso?.includes(mes);
    if (!passou(vencimento) || emAtraso) continue;
    const dataReceb = somaDias(vencimento, Math.floor(rnd() * 6) - 2);
    const quando = passou(dataReceb) ? dataReceb : somaDias(HOJE, -1);
    const banco = ["saneamento", "eolica", "prefeitura"].includes(p.cliente) ? c.bancoSecundario : c.bancoPrincipal;
    const atual = await versaoDoProjeto(projectId, "atual");
    const [linha] = await db
      .insert(schema.cashEntries)
      .values({
        tenantId: c.tenantId,
        versionId: atual.id,
        bankAccountId: banco,
        data: mdy(quando),
        descricao: `TED RECEBIDA ${CLIENTES.find((x) => x.chave === p.cliente)!.nome.toUpperCase().slice(0, 34)}`,
        valor: String(valor),
        cat: "receita_extrato",
        rec: false,
        importHash: `seed-${contaReceberId}`,
      })
      .returning();
    ok(
      await registrarRecebimento({ contaReceberId, valor, data: mdy(quando), forma: "Extrato bancário", cashEntryId: linha.id, idempotencyKey: `seed-rec-${contaReceberId}` }),
      `Receber ${comp(mes)} — ${p.titulo}`,
    );
    conta(c, "recebimentos");
  }

  if (p.concluido) {
    ok(await mudarStatusContrato({ id: contratoId, para: "concluido" }), `Concluir contrato ${p.titulo}`);
    ok(await setProjectSituacao(projectId, "Finalizado"), `Finalizar projeto ${p.nome}`);
  }
  return projectId;
}

async function aditivo(c: Ctx, p: ProjetoDemo, contratoId: string, itens: Record<string, string>) {
  const a = p.aditivo!;
  const it = p.itens.find((i) => i.codigo === a.item)!;
  const novoTermino = dataDoMes(p.inicio + p.duracao - 1 + a.mesesExtras, 28);
  const id = ok(
    await salvarAditivo({
      contratoId,
      tipos: a.tipos,
      descricao: `Aditivo de ${a.mesesExtras} campanhas adicionais`,
      justificativa: a.justificativa,
      valorDelta: a.valor,
      novoTermino: mdy(novoTermino),
      dataSolicitacao: mdy(dataDoMes(a.mes, 4)),
      inicioVigencia: mdy(dataDoMes(a.mes, 18)),
      responsavel: p.gestor,
      variacoes: [{ itemId: itens[a.item], deltaQuantidade: a.valor / it.valorUnitario, deltaValor: a.valor }],
    }),
    "Aditivo",
  ).id!;
  ok(await mudarStatusAditivo({ id, para: "aguardando_aprovacao" }), "Aditivo → aprovação");
  ok(await mudarStatusAditivo({ id, para: "aprovado", dataAprovacao: mdy(dataDoMes(a.mes, 12)) }), "Aditivo → aprovado");
  ok(await mudarStatusAditivo({ id, para: "assinado", dataAssinatura: mdy(dataDoMes(a.mes, 18)), inicioVigencia: mdy(dataDoMes(a.mes, 18)) }), "Aditivo → assinado");
  conta(c, "aditivos");
}

// ─────────────────────────────── 4. orçamento e previsão ───────────────────────────────

/**
 * Linhas no modelo da tela de Orçamentos: total por linha + % por mês
 * (`saveBudgetPlanning`). Recebe valores por mês e converte em percentuais.
 */
function emPercentuais(rowKey: string, dreCategory: string, porMes: Map<number, number>, total?: number) {
  const soma = [...porMes.values()].reduce((a, v) => a + v, 0);
  const base = total ?? soma;
  const meses = [...porMes.entries()].filter(([, v]) => v > 0).sort(([a], [b]) => a - b);
  let acumulado = 0;
  const months = meses.map(([m, v], i) => {
    // O último mês fecha a conta para a soma não passar de 100% por arredondamento.
    const pct = i === meses.length - 1 && total == null ? Math.round((100 - acumulado) * 10000) / 10000 : Math.floor((v / base) * 100 * 10000) / 10000;
    acumulado += pct;
    return { mes: comp(m), pct };
  });
  return { rowKey, dreCategory, total: r2(base), months };
}

/** Orçamento (como planejado na proposta) e Previsão (realizado + reprojeção). */
async function orcamentos(c: Ctx) {
  for (const p of PROJETOS) {
    const projectId = c.projetos[p.chave];
    const valorDoMes = (mes: number) =>
      p.itens.reduce((a, it) => a + it.medicoes.filter(([m]) => m === mes).reduce((s, [, q]) => s + (it.criterio === "percentual" ? (it.quantidade * it.valorUnitario * q) / 100 : q * it.valorUnitario), 0), 0);
    const meses = [...new Set(p.itens.flatMap((i) => i.medicoes.map(([m]) => m)))];
    const totalDoProjeto = p.itens.reduce((a, i) => a + i.quantidade * i.valorUnitario, 0) + (p.aditivo?.valor ?? 0);

    // Receita: Orçamento = cronograma da proposta (prazo original, sem o aditivo);
    // Previsão = cronograma atualizado, com os meses prorrogados.
    const fimOriginal = p.aditivo ? p.inicio + p.duracao : Infinity;
    const recOrc = new Map<number, number>();
    const recPrev = new Map<number, number>();
    for (const m of meses) {
      if (m < fimOriginal) recOrc.set(m, valorDoMes(m));
      recPrev.set(m, valorDoMes(m));
    }

    // Despesa por grupo do plano de contas.
    const despesas = (fator: number, comExtras: boolean) => {
      const porGrupo = new Map<string, { dre: string; mes: Map<number, number> }>();
      const total = p.duracao + (comExtras ? (p.aditivo?.mesesExtras ?? 0) : 0);
      for (const custo of p.custos) {
        const ms = custo.meses === "todos" ? Array.from({ length: total }, (_, i) => i) : custo.meses;
        const g = grupoDaContaDoPlano(custo.conta);
        const linha = porGrupo.get(g) ?? { dre: categoriaDaConta(custo.conta), mes: new Map<number, number>() };
        for (const rel of ms) linha.mes.set(p.inicio + rel, (linha.mes.get(p.inicio + rel) ?? 0) + custo.valor * fator);
        porGrupo.set(g, linha);
      }
      return [...porGrupo.entries()].map(([g, l]) => emPercentuais(g, l.dre, l.mes));
    };

    const orc = await versaoDoProjeto(projectId, "budget");
    const prev = await versaoDoProjeto(projectId, "forecast");
    ok(await saveBudgetPlanning(orc.id, "receita", [emPercentuais(RECEITAS_PROJETO_KEY, "Receita", recOrc, totalDoProjeto)]), `Orçamento (receita) — ${p.nome}`);
    ok(await saveBudgetPlanning(orc.id, "despesa", despesas(0.95, false)), `Orçamento (despesa) — ${p.nome}`);
    ok(await saveBudgetPlanning(prev.id, "receita", [emPercentuais(RECEITAS_PROJETO_KEY, "Receita", recPrev, totalDoProjeto)]), `Previsão (receita) — ${p.nome}`);
    ok(await saveBudgetPlanning(prev.id, "despesa", despesas(1.04, true)), `Previsão (despesa) — ${p.nome}`);
    conta(c, "orcamentos", 2);
  }

  // Sede: fixas, folha e impostos para 24 meses.
  const linhasDaSede = (fator: number) => {
    const porGrupo = new Map<string, { dre: string; mes: Map<number, number> }>();
    const soma = (contaCef: string, mes: number, valor: number) => {
      const g = grupoDaContaDoPlano(contaCef);
      const l = porGrupo.get(g) ?? { dre: categoriaDaConta(contaCef), mes: new Map<number, number>() };
      l.mes.set(mes, (l.mes.get(mes) ?? 0) + valor * fator);
      porGrupo.set(g, l);
    };
    for (let mes = 0; mes < 24; mes++) {
      for (const [contaCef, , , valor] of FIXAS_DA_SEDE) soma(contaCef, mes, valor);
      soma("3.2.01", mes, FUNCIONARIOS.filter((f) => f.admissao <= mes).reduce((a, f) => a + f.salario, 0) * 1.08);
      soma("5.1.04", mes, 290000 * 0.098);
    }
    return [...porGrupo.entries()].map(([g, l]) => emPercentuais(g, l.dre, l.mes));
  };
  ok(await saveBudgetPlanning((await versaoDoProjeto(c.sedeId, "budget")).id, "despesa", linhasDaSede(1)), "Orçamento da sede");
  ok(await saveBudgetPlanning((await versaoDoProjeto(c.sedeId, "forecast")).id, "despesa", linhasDaSede(1.03)), "Previsão da sede");
  conta(c, "orcamentos", 2);
}

// ─────────────────────────────── 5. plano de trabalho ───────────────────────────────

async function planosDeTrabalho(c: Ctx) {
  const [modelo] = await db.select().from(schema.planoModelos).where(eq(schema.planoModelos.tenantId, c.tenantId)).orderBy(asc(schema.planoModelos.ordem)).limit(1);
  if (!modelo) return;
  const fasesM = await db.select().from(schema.planoModeloFases).where(eq(schema.planoModeloFases.modeloId, modelo.id));
  const ativM = fasesM.length ? await db.select().from(schema.planoModeloAtividades).where(inArray(schema.planoModeloAtividades.faseId, fasesM.map((f) => f.id))) : [];
  for (const p of PROJETOS) {
    const projectId = c.projetos[p.chave];
    const arvore = arvoreDoModelo(fasesM, ativM).filter((f) => f.marcado);
    const n = arvore.length;
    const total = p.duracao + (p.aditivo?.mesesExtras ?? 0);
    const fases = arvore.map((f, i) => {
      const ini = p.inicio + Math.floor((i * total) / n);
      const fimM = p.inicio + Math.max(Math.floor(((i + 1) * total) / n) - 1, Math.floor((i * total) / n));
      return { ...f, responsavel: p.coordenador, inicio: mdy(dataDoMes(ini, 1)), termino: mdy(dataDoMes(fimM, 28)) };
    });
    ok(await criarPlano({ projectId, origem: "biblioteca", chave: `seed-plano-${projectId}`, fases }), `Plano de trabalho — ${p.nome}`);
    conta(c, "planos");

    // Andamento conforme o tempo decorrido de cada fase.
    const fasesDb = await db.select().from(schema.projetoFases).where(eq(schema.projetoFases.projectId, projectId)).orderBy(asc(schema.projetoFases.ordem));
    for (const [i, f] of fasesDb.entries()) {
      const ini = p.inicio + Math.floor((i * total) / n);
      const fimM = p.inicio + Math.max(Math.floor(((i + 1) * total) / n) - 1, ini);
      const frac = p.concluido ? 1 : Math.max(0, Math.min(1, (MES_CORRENTE - ini + 0.4) / (fimM - ini + 1)));
      const status = frac >= 1 ? "concluida" : frac > 0 ? "em_andamento" : "nao_iniciada";
      const atividades = await db.select().from(schema.projetoAtividades).where(eq(schema.projetoAtividades.faseId, f.id));
      for (const a of atividades) {
        const pa = frac >= 1 ? 100 : Math.round(Math.max(0, Math.min(100, frac * 100 + (rnd() * 30 - 15))));
        await atualizarAndamento({
          tipo: "atividade",
          id: a.id,
          status: pa >= 100 ? "concluida" : pa > 0 ? "em_andamento" : "nao_iniciada",
          percentual: pa,
          inicioReal: pa > 0 ? mdy(dataDoMes(ini, 3)) : null,
          terminoReal: pa >= 100 ? mdy(dataDoMes(fimM, 24)) : null,
        });
      }
      await atualizarAndamento({
        tipo: "fase",
        id: f.id,
        status,
        percentual: Math.round(frac * 100),
        inicioReal: frac > 0 ? mdy(dataDoMes(ini, 3)) : null,
        terminoReal: frac >= 1 ? mdy(dataDoMes(fimM, 24)) : null,
      });
    }
  }
}

// ─────────────────────────────── 6. estoque ───────────────────────────────

async function estoque(c: Ctx) {
  const itens: string[] = [];
  for (const e of ESTOQUE) {
    const r = ok(await addStockItem(fd({ nome: e.nome, unidade: e.unidade, categoria: e.categoria, custoUnit: e.custo, minimo: e.minimo })), `Material ${e.nome}`);
    itens.push((r as unknown as { id: string }).id);
    conta(c, "materiais");
  }
  const campo = [c.projetos.agua, c.projetos.mina, c.projetos.eolica, c.projetos.prad];
  const qtdEntrada = (minimo: number, mes: number) => Math.round(minimo * (mes === 0 ? 3 : 2.5));
  // Reposições (mês 0 e 6): uma compra por categoria, e as entradas vinculadas a ela.
  const compras = new Map<string, string>();
  for (const mesEntrada of [0, 6]) {
    for (const cat of [...new Set(ESTOQUE.map((e) => e.categoria))]) {
      const total = ESTOQUE.filter((e) => e.categoria === cat).reduce((a, e) => a + qtdEntrada(e.minimo, mesEntrada) * e.custo, 0);
      const ehEpi = cat === "EPI";
      const despesaId = await lancarDespesa(c, {
        projectId: ehEpi ? c.sedeId : c.projetos.agua,
        conta: ehEpi ? "2.4.07" : "2.4.05",
        fornecedor: "insumos",
        descricao: `Reposição de estoque — ${cat === "EPI" ? "EPIs de campo" : `materiais de ${cat.toLowerCase()}`}`,
        valor: total,
        mes: mesEntrada,
        vencimento: dataDoMes(mesEntrada, 20),
      });
      compras.set(`${mesEntrada}|${cat}`, despesaId);
    }
  }
  for (const [i, itemId] of itens.entries()) {
    const e = ESTOQUE[i];
    for (const mesEntrada of [0, 6]) {
      ok(
        await addStockMovement(fd({ tipo: "entrada", itemId, quantidade: qtdEntrada(e.minimo, mesEntrada), despesaId: compras.get(`${mesEntrada}|${e.categoria}`), data: mdy(dataDoMes(mesEntrada, 4)), doc: `NF ${4100 + mesEntrada * 3}`, origem: "Compra", obs: "Reposição de estoque", confirmar: "1" })),
        "Entrada de estoque",
      );
      conta(c, "movimentosDeEstoque");
    }
    for (let mes = 1; mes <= MES_CORRENTE; mes++) {
      const projectId = e.categoria === "Coleta" ? c.projetos.agua : campo[mes % campo.length];
      // Consumo médio ~1/3 do mínimo por mês; botas e fita gastam mais e
      // terminam abaixo do mínimo (alerta de reposição na demonstração).
      const ritmo = ["Bota de PVC cano longo", "Fita de marcação (rolo)"].includes(e.nome) ? 0.42 : 0.3;
      const qtd = Math.max(1, Math.round(e.minimo * ritmo * (0.75 + rnd() * 0.4)));
      ok(
        await addStockMovement(fd({ tipo: "saida", itemId, quantidade: qtd, projectId, data: mdy(dataDoMes(mes, 8)), obs: "Retirada para campanha de campo", confirmar: "1" })),
        "Saída de estoque",
      );
      conta(c, "movimentosDeEstoque");
    }
  }
}

// ─────────────────────────────── execução ───────────────────────────────

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_EM_PRODUCAO !== "sim") {
    console.error("Recusado: NODE_ENV=production. Para criar a demonstração em produção, defina SEED_DEMO_EM_PRODUCAO=sim.");
    process.exit(1);
  }
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    console.error("Defina SEED_ADMIN_EMAIL com o login da demonstração (um e-mail sem vínculo com outra empresa).");
    process.exit(1);
  }

  const existentes = await db.select().from(schema.tenants).where(inArray(schema.tenants.name, [EMPRESA.nome, ...NOMES_ANTERIORES]));
  if (existentes.length > 0) {
    if (process.env.SEED_DEMO_RECRIAR !== "sim") {
      console.log(`A empresa "${existentes[0].name}" já existe — nada a fazer. Para recriar do zero, rode com SEED_DEMO_RECRIAR=sim.`);
      return;
    }
    console.log("Apagando a demonstração anterior...");
    await db.delete(schema.tenants).where(inArray(schema.tenants.id, existentes.map((t) => t.id)));
    // Equipe fictícia de versões anteriores que ficou sem empresa.
    for (const e of EMAILS_ANTERIORES) {
      const [u] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, e)).limit(1);
      if (!u) continue;
      const vinculos = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, u.id));
      if (vinculos.length === 0) await db.delete(schema.users).where(eq(schema.users.id, u.id));
    }
  }

  console.log(`Criando "${EMPRESA.nome}" (mês 0 = ${comp(0)}, mês corrente = ${comp(MES_CORRENTE)})...`);
  const { tenantId, senha } = await criarEmpresa(email);
  sessaoDoSeed.email = email;
  const base = await criarCadastros(tenantId);
  const c: Ctx = { ...base, sedeId: "", projetos: {}, faturadoNoMes: new Map(), despesasEmAberto: 0, contagem: {} };

  c.sedeId = ok(await createProject("Sede administrativa — Curitiba", null, { kind: "office" }), "Sede").id!;
  ok(await addAjuste(fd({ projectId: c.sedeId, bankAccountId: c.bancoPrincipal, valor: 500000, sinal: "mais", data: mdy(dataDoMes(0, 1)), motivo: "Saldo de abertura da conta operacional" })), "Saldo de abertura");
  ok(await addAjuste(fd({ projectId: c.sedeId, bankAccountId: c.bancoSecundario, valor: 220000, sinal: "mais", data: mdy(dataDoMes(0, 1)), motivo: "Saldo de abertura da conta reserva" })), "Saldo de abertura");

  for (const p of PROJETOS) {
    console.log(`  • ${p.nome}`);
    const projectId = await projetoEContrato(c, p);
    await despesasDoProjeto(c, p, projectId);
  }
  console.log("  • Despesas da sede, folha e impostos");
  await despesasDaSede(c);
  await impostos(c);
  console.log("  • Cartão corporativo");
  await cartaoCorporativo(c);
  console.log("  • Orçamento e previsão");
  await orcamentos(c);
  console.log("  • Planos de trabalho");
  await planosDeTrabalho(c);
  console.log("  • Estoque");
  await estoque(c);

  // Saldo atual de cada conta = abertura + recebimentos − pagamentos lançados.
  for (const banco of [c.bancoPrincipal, c.bancoSecundario]) {
    const [{ saldo }] = await db.select({ saldo: sql<string>`coalesce(sum(${schema.cashEntries.valor}), 0)` }).from(schema.cashEntries).where(eq(schema.cashEntries.bankAccountId, banco));
    await db.update(schema.bankAccounts).set({ saldo: String(r2(Number(saldo))), saldoSource: "manual" }).where(eq(schema.bankAccounts.id, banco));
  }

  console.log("\n✓ Demonstração criada:");
  for (const [k, v] of Object.entries(c.contagem)) console.log(`    ${k.padEnd(20)} ${v}`);
  console.log(`\nLogin: ${email}`);
  if (senha) console.log(`Senha inicial (mostrada só agora; troca obrigatória no 1º acesso): ${senha}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof FalhaDoSeed ? `Falha no seed: ${err.message}` : err);
    process.exit(1);
  });

/**
 * Seed de DEMONSTRAÇÃO completo — uma consultoria ambiental fictícia com
 * EXATAMENTE cinco projetos, ~12 meses de histórico e a projeção até o fim de
 * cada contrato, para apresentar o app.
 *
 * Diferente de um INSERT direto, os fluxos com regra de negócio passam pelas
 * AÇÕES REAIS do app (projeto, contrato, itens, aditivo, medições, faturamento,
 * recebimentos, despesas, pagamentos, reembolsos, apropriação a contrato,
 * rateio, equipes, horas, plano de trabalho, orçamento, previsão, estoque).
 * Elas rodam com a "sessão" do administrador da demo — ver `stubs/auth.ts` e
 * `scripts/build-seed.mjs`. Assim os números batem entre as telas.
 *
 * Budget × Forecast (matriz da demonstração, em `dados.ts`):
 *  · Orçamento: o plano original por subgrupo do plano de contas e mês; o
 *    total de custo é exatamente o da matriz. A receita é a linha fixa
 *    "Receitas do Projeto" (total do cadastro = valor ORIGINAL do contrato),
 *    distribuída pelos vencimentos previstos. Depois de gravado, é aprovado.
 *  · Previsão: nos meses até o corrente, o REALIZADO lido do banco (despesas
 *    por competência e faturas por vencimento); depois, a reprojeção. O total
 *    de custo e de receita é exatamente o da matriz. O aditivo entra só na
 *    Previsão, numa linha de receita própria (1.1), sem tocar no Orçamento.
 *  · Pessoal CLT: as horas apontadas apropriam a folha aos projetos (despesas
 *    2.1 por projeto e mês); o restante da folha fica na sede. Horas não
 *    geram despesa por si — a despesa de folha é lançada uma vez só.
 *
 * Uso:
 *   npm run build:seed                    # gera .migrate/seed.mjs
 *   SEED_ADMIN_EMAIL=demo@exemplo.com node .migrate/seed.mjs
 *
 * Variáveis:
 *   SEED_ADMIN_EMAIL       login da demonstração (obrigatório). Precisa ser um
 *                          e-mail SEM vínculo com outra empresa.
 *   SEED_ADMIN_PASSWORD    senha inicial (opcional; sem ela, uma aleatória é
 *                          mostrada uma vez e a troca é exigida no 1º acesso).
 *   SEED_DEMO_EM_PRODUCAO  "sim" para rodar com NODE_ENV=production.
 *   SEED_DEMO_RECRIAR      "sim" para apagar a demonstração existente e recriar.
 *   SEED_DEMO_TENANT_ID    obrigatório com SEED_DEMO_RECRIAR: o id EXATO da
 *                          empresa de demonstração a apagar. O seed nunca apaga
 *                          por nome; sem o id (ou se a empresa tiver usuários
 *                          fora da demonstração), só mostra o escopo e para.
 */
import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { linhasDoPlano } from "@/lib/calc/plano-ambiental";
import { instalarPlanoPadrao } from "@/lib/planocontas-padrao";
import { garantirModalidades } from "@/lib/contrato-modalidades";
import { garantirBiblioteca } from "@/lib/plano-biblioteca";
import { createProject, setProjectSituacao } from "@/lib/actions/projects";
import { addAjuste } from "@/lib/actions/caixa";
import { addDespesa, pagarDespesa } from "@/lib/actions/despesas";
import { registrarRecebimento } from "@/lib/actions/contas-receber";
import { saveBudgetPlanning, setVersionStatus } from "@/lib/actions/planning";
import { RECEITAS_PROJETO_KEY } from "@/lib/budget/config";
import { pagarFatura } from "@/lib/actions/faturas";
import { addStockItem, addStockMovement } from "@/lib/actions/estoque";
import { criarPlano, atualizarAndamento, salvarEntrega } from "@/lib/actions/plano";
import { addFuncao, alocarMembro } from "@/lib/actions/equipes";
import { garantirFuncoesPadrao } from "@/lib/equipes-db";
import { definirCustoHora, registrarHoras } from "@/lib/actions/horas";
import { ratearEntreObras } from "@/lib/actions/acerto";
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
  apropriarDespesa,
  incluirReembolso,
  mudarStatusReembolso,
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
  COMPRAS_DE_ESTOQUE,
  PROJETOS,
  RATEIOS,
  FIXAS_DA_SEDE,
  ALIQUOTA_DAS,
  FATOR_ENCARGOS,
  FATOR_BENEFICIOS,
  HORAS_MES,
  custoHora,
  valorDaCompra,
  cnpj,
  type ProjetoDemo,
  type CustoDemo,
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
const rnd = prng(20261113);
const ruido = (pct = 0) => 1 + (rnd() * 2 - 1) * pct;
const r2 = (v: number) => Math.round(v * 100) / 100;
const soma = (xs: Iterable<number>) => r2([...xs].reduce((a, v) => a + v, 0));

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
/** Índice do mês de uma data (0 = mês 0 da demonstração). */
const mesDe = (d: Date) => (d.getFullYear() - HOJE.getFullYear()) * 12 + d.getMonth() - HOJE.getMonth() + MES_CORRENTE;
const mdy = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const comp = (m: number) => {
  const d = dataDoMes(m, 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
/** "MM/YYYY" → índice do mês da demonstração. */
const mesDaComp = (c: string) => {
  const [mm, yy] = c.split("/").map(Number);
  return (yy - HOJE.getFullYear()) * 12 + (mm - 1) - HOJE.getMonth() + MES_CORRENTE;
};
const somaDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const passou = (d: Date) => d.getTime() < HOJE.getTime();
/** Nunca uma data futura para um fato já ocorrido (emissão, compra, pagamento). */
const ateHoje = (d: Date) => (d.getTime() > HOJE.getTime() ? somaDias(HOJE, -1) : d);
/** Fração do mês corrente já decorrida (horas e folha do mês em curso). */
const FRACAO_DO_MES_CORRENTE = Math.min(1, (HOJE.getDate() - 1) / new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0).getDate());

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

/** Categoria da DRE e subgrupo (a chave do Orçamento) pela conta do plano padrão. */
const CONTAS_DO_PLANO = new Map(linhasDoPlano("seed").map((c) => [c.code, c]));
function contaDoPlano(conta: string) {
  const c = CONTAS_DO_PLANO.get(conta);
  if (!c) throw new FalhaDoSeed(`Conta ${conta} não existe no plano padrão.`);
  return c;
}
const categoriaDaConta = (conta: string) => contaDoPlano(conta).dreCategory;
const grupoDaConta = (conta: string) => contaDoPlano(conta).groupCode;

// ─────────────────────────────── estado da execução ───────────────────────────────

interface Ctx {
  tenantId: string;
  bancoPrincipal: string;
  bancoSecundario: string;
  cartaoId: string;
  sedeId: string;
  clientes: Record<string, string>;
  fornecedores: Record<string, string>;
  funcionarios: Record<string, string>;
  funcoes: Record<string, string>;
  projetos: Record<string, string>;
  contratos: Record<string, string>;
  /** horas realizadas por pessoa e mês (todas as alocações). */
  horasPessoaMes: Map<string, number>;
  /** folha apropriada por projeto e mês: [salários, encargos, benefícios]. */
  folhaDoProjeto: Map<string, [number, number, number]>;
  faturadoNoMes: Map<number, number>;
  despesasEmAberto: number;
  contagem: Record<string, number>;
}
const conta = (c: Ctx, k: string, n = 1) => (c.contagem[k] = (c.contagem[k] ?? 0) + n);

async function versaoDoProjeto(projectId: string, kind: "budget" | "forecast" | "atual") {
  const [v] = await db.select().from(schema.versions).where(and(eq(schema.versions.projectId, projectId), eq(schema.versions.kind, kind))).limit(1);
  if (!v) throw new FalhaDoSeed(`Projeto sem versão ${kind}.`);
  return v;
}

/** Valor do contrato (original) e meses de um projeto. */
const valorOriginal = (p: ProjetoDemo) => p.itens.reduce((a, i) => a + i.quantidade * i.valorUnitario, 0);
const fimDoProjeto = (p: ProjetoDemo) => p.inicio + p.duracao - 1;
const mesesDoCusto = (p: ProjetoDemo, cu: CustoDemo) => (cu.meses === "todos" ? Array.from({ length: p.duracao }, (_, i) => i) : cu.meses);
const fimDoRealizado = (p: ProjetoDemo) => Math.min(MES_CORRENTE, fimDoProjeto(p));

// ─────────────────────────────── 1. empresa e cadastros ───────────────────────────────

async function criarEmpresa(email: string): Promise<{ tenantId: string; senha: string | null }> {
  const [existente] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existente) {
    const vinculos = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, existente.id));
    if (vinculos.length > 0)
      throw new FalhaDoSeed(
        `O e-mail ${email} já pertence a outra empresa. O app abre a PRIMEIRA empresa do usuário, então a demonstração ficaria invisível para ele. Use um e-mail exclusivo para a demo em SEED_ADMIN_EMAIL.`,
      );
  }
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

  // Usuário sem empresa (ex.: sobra de uma demonstração recriada): recebe a senha desta execução.
  let senha: string | null = process.env.SEED_ADMIN_PASSWORD?.trim() || `Demo-${randomBytes(9).toString("base64url")}9a`;
  const dadosDoLogin = { name: "Demonstração", passwordHash: hashPassword(senha), mustChangePassword: !process.env.SEED_ADMIN_PASSWORD, passwordChangedAt: null };
  let userId: string;
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

async function criarCadastros(c: Ctx) {
  const tenantId = c.tenantId;
  const [b1] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Banco do Brasil", ag: "3041-7", cc: "28.415-0", tipo: "Construtora", ativo: true }).returning();
  const [b2] = await db.insert(schema.bankAccounts).values({ tenantId, banco: "Sicredi", ag: "0720", cc: "61.903-2", tipo: "Construtora", ativo: true }).returning();
  const [cartao] = await db
    .insert(schema.cartoesCredito)
    .values({ tenantId, apelido: "Cartão corporativo", bandeira: "Visa", ultimos4: "4821", titular: "Helena M. Duarte", limite: "25000", diaFechamento: 3, diaVencimento: 10, bankAccountId: b1.id, ativo: true })
    .returning();
  c.bancoPrincipal = b1.id;
  c.bancoSecundario = b2.id;
  c.cartaoId = cartao.id;

  for (const cl of CLIENTES) {
    const [row] = await db
      .insert(schema.clientes)
      .values({ tenantId, nomeCompleto: cl.nome, cpfCnpj: cl.doc, cidadeEstado: cl.cidade, emailPrincipal: cl.email, ramoAtividade: cl.ramo, statusContrato: "Ativo" })
      .returning();
    c.clientes[cl.chave] = row.id;
    conta(c, "clientes");
  }
  for (const f of FORNECEDORES) {
    const [row] = await db
      .insert(schema.stakeholders)
      .values({ tenantId, nome: f.nome, tipo: f.tipo, doc: f.doc, papeis: [...f.papeis], cidade: f.cidade, estado: f.estado, ativo: true })
      .returning();
    c.fornecedores[f.chave] = row.id;
    conta(c, "fornecedores");
    if (f.terceiro) conta(c, "terceiros");
  }
  for (const [i, f] of FUNCIONARIOS.entries()) {
    const [row] = await db
      .insert(schema.funcionarios)
      .values({
        tenantId,
        nome: f.nome,
        cargo: f.cargo,
        setor: f.setor,
        salario: String(f.salario),
        admissao: ymd(dataDoMes(f.admissao, 3 + (i % 20))),
        tipoContrato: "CLT",
        jornada: "44h semanais",
        cidade: "Curitiba",
        estado: "PR",
      })
      .returning();
    c.funcionarios[f.nome] = row.id;
    conta(c, "funcionariosClt");
  }
}

// ─────────────────────────────── 2. despesas ───────────────────────────────

async function lancarDespesa(
  c: Ctx,
  d: { projectId: string; conta: string; fornecedor?: string | null; descricao: string; valor: number; mes: number; vencimento: Date; forma?: string; deixarEmAberto?: boolean; banco?: string; contratoId?: string | null },
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
        dataEmissao: mdy(ateHoje(dataDoMes(d.mes, 2))),
        bancoId: d.banco ?? c.bancoPrincipal,
        status: "A pagar",
        formaPagamento: d.forma ?? "Boleto",
        obs: d.descricao,
      }),
    ),
    `Despesa "${d.descricao}" (${comp(d.mes)})`,
  );
  const id = r.id;
  conta(c, "despesas");
  if (d.contratoId) ok(await apropriarDespesa({ despesaId: id, contratoId: d.contratoId }), `Apropriar "${d.descricao}" ao contrato`);
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

// ─────────────────────────────── 3. orçamento-base de cada projeto ───────────────────────────────

/**
 * O plano de custos de um projeto, por subgrupo e mês ABSOLUTO.
 *  · pessoal (2.1): horas planejadas × custo-hora (salário + FGTS + benefícios);
 *  · linhas "despesa" e "cartão": valor do catálogo × fator, para o total do
 *    Orçamento fechar exatamente no valor da matriz;
 *  · estoque e rateio: valor fixo (o mesmo que será lançado).
 */
interface PlanoDeCustos {
  fator: number;
  pessoal: Map<number, number>;
  linhas: { custo: CustoDemo; grupo: string; mes: number; valor: number; ajustavel: boolean }[];
}
function valorFixoDaLinha(p: ProjetoDemo, cu: CustoDemo, mes: number): number {
  if (cu.via === "estoque") {
    return soma(COMPRAS_DE_ESTOQUE.filter((x) => x.projeto === p.chave && x.conta === cu.conta && x.mes === mes).map(valorDaCompra));
  }
  return cu.valor;
}
function pessoalPlanejado(p: ProjetoDemo): Map<number, number> {
  const out = new Map<number, number>();
  for (const m of p.clt) {
    const f = FUNCIONARIOS.find((x) => x.nome === m.nome)!;
    const [de, ate] = m.meses ?? [0, p.duracao - 1];
    for (let rel = de; rel <= ate; rel++) out.set(p.inicio + rel, r2((out.get(p.inicio + rel) ?? 0) + m.horasMes * custoHora(f.salario)));
  }
  return out;
}
function planoDoOrcamento(p: ProjetoDemo): PlanoDeCustos {
  const pessoal = pessoalPlanejado(p);
  const brutas = p.custos
    .filter((cu) => !cu.soPrevisao)
    .flatMap((cu) => mesesDoCusto(p, cu).map((rel) => ({ custo: cu, grupo: grupoDaConta(cu.conta), mes: p.inicio + rel, valor: valorFixoDaLinha(p, cu, p.inicio + rel), ajustavel: cu.via !== "estoque" && cu.via !== "rateio" })));
  const fixo = soma(brutas.filter((l) => !l.ajustavel).map((l) => l.valor)) + soma(pessoal.values());
  const ajustavelBruto = soma(brutas.filter((l) => l.ajustavel).map((l) => l.valor));
  const fator = (p.budget.custo - fixo) / ajustavelBruto;
  if (!(fator > 0.5 && fator < 2)) throw new FalhaDoSeed(`Orçamento de "${p.nome}": fator de ajuste ${fator.toFixed(3)} fora do razoável — revise o catálogo.`);
  const linhas = brutas.map((l) => ({ ...l, valor: l.ajustavel ? r2(l.valor * fator) : l.valor }));
  // Fecha o centavo na última linha ajustável.
  const diferenca = r2(p.budget.custo - soma(linhas.map((l) => l.valor)) - soma(pessoal.values()));
  const ultima = [...linhas].reverse().find((l) => l.ajustavel)!;
  ultima.valor = r2(ultima.valor + diferenca);
  return { fator, pessoal, linhas };
}

// ─────────────────────────────── 4. projetos e contratos ───────────────────────────────

/** Mês (índice) de vencimento da fatura de uma medição do mês `m`. */
const vencimentoDaFatura = (p: ProjetoDemo, m: number) => somaDias(dataDoMes(m + 1, 5), p.prazoPagamentoDias);

async function projetoEContrato(c: Ctx, p: ProjetoDemo) {
  const inicio = dataDoMes(p.inicio, 1);
  const fim = dataDoMes(fimDoProjeto(p), 28);
  const projectId = ok(
    await createProject(p.nome, p.duracao, {
      kind: "proj",
      status: "Em andamento",
      startDate: mdy(inicio),
      endDate: mdy(fim),
      mesInicial: comp(p.inicio),
      mesFinal: comp(fimDoProjeto(p)),
      clienteId: c.clientes[p.cliente],
    }),
    `Projeto ${p.nome}`,
  ).id!;
  c.projetos[p.chave] = projectId;
  conta(c, "projetos");
  // Cadastro: o valor do projeto é o do contrato ORIGINAL (base da receita do
  // Orçamento); o aditivo aparece no contrato e na Previsão.
  await db
    .update(schema.projects)
    .set({
      valorConstrucao: String(valorOriginal(p)),
      custoConstrucao: String(p.budget.custo),
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
      dataTerminoPrevista: mdy(fim),
      dataBaseReajuste: mdy(inicio),
      valorOriginal: valorOriginal(p),
      formaFaturamento: "Por medição aprovada",
      condicaoPagamento: `${p.prazoPagamentoDias} dias após a aprovação da medição`,
      periodicidadeMedicao: "Mensal",
      prazoPagamentoDias: p.prazoPagamentoDias,
      indiceReajuste: "IPCA",
      regrasReembolso: "Taxas de órgãos públicos pagas pela contratada são reembolsáveis mediante comprovante.",
      projetos: [{ projectId, valorAlocado: valorOriginal(p) }],
      idempotencyKey: `seed-contrato-${p.chave}`,
    }),
    `Contrato ${p.titulo}`,
  ).id!;
  c.contratos[p.chave] = contratoId;
  conta(c, "contratos");

  const itens: Record<string, string> = {};
  for (const it of p.itens) {
    const meses = it.medicoes.map(([m]) => m);
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
        inicioPrevisto: mdy(dataDoMes(Math.min(...meses), 1)),
        conclusaoPrevista: mdy(dataDoMes(Math.max(...meses), 28)),
        criterioMedicao: it.criterio,
        condicaoFaturamento: "Após aprovação da medição pelo cliente",
        responsavel: p.coordenador,
      }),
      `Item ${it.codigo} de ${p.titulo}`,
    ).id!;
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

  // Medições mês a mês. Passadas: aprovadas e faturadas. Mês corrente: enviada / em análise.
  const meses = [...new Set(p.itens.flatMap((i) => i.medicoes.map(([m]) => m)))].sort((a, b) => a - b);
  let aditivoFeito = false;
  for (const mes of meses) {
    if (mes > MES_CORRENTE) break;
    if (p.aditivo && !aditivoFeito && p.aditivo.mes <= mes) {
      await aditivo(c, p, contratoId, itens);
      aditivoFeito = true;
    }
    let medidoNoMes = 0;
    for (const it of p.itens) {
      for (const [m, qtd] of it.medicoes) {
        if (m !== mes) continue;
        const base = { contratoId, itemId: itens[it.codigo], projectId, competencia: comp(mes), responsavel: p.coordenador, dataMedicao: mdy(ateHoje(dataDoMes(mes, 26))), periodoInicio: mdy(dataDoMes(mes, 1)), periodoFim: mdy(ateHoje(dataDoMes(mes, 28))), enviar: true, idempotencyKey: `seed-med-${contratoId}-${it.codigo}-${mes}` };
        const medicaoId = ok(
          await salvarMedicao(
            it.criterio === "percentual" ? { ...base, percentual: qtd } : it.criterio === "quantidade" ? { ...base, quantidade: qtd } : { ...base, quantidade: qtd, valor: qtd * it.valorUnitario },
          ),
          `Medição ${it.codigo} ${comp(mes)} — ${p.titulo}`,
        ).id!;
        conta(c, "medicoes");
        if (mes < MES_CORRENTE) {
          ok(await mudarStatusMedicao({ id: medicaoId, para: "aprovada" }), `Aprovar medição ${comp(mes)}`);
          medidoNoMes += it.criterio === "percentual" ? (it.quantidade * it.valorUnitario * qtd) / 100 : qtd * it.valorUnitario;
        } else {
          if (p.medicaoCorrente === "em_analise") ok(await mudarStatusMedicao({ id: medicaoId, para: "em_analise" }), `Medição em análise ${comp(mes)}`);
          conta(c, "medicoesEmAnalise");
        }
      }
    }
    if (mes >= MES_CORRENTE || medidoNoMes <= 0) continue;

    // Fatura (conta a receber) da medição aprovada — sem NFS-e.
    const valor = r2(medidoNoMes);
    const vencimento = vencimentoDaFatura(p, mes);
    const contaReceberId = ok(
      await faturarContrato({ contratoId, projectId, valor, vencimento: mdy(vencimento), descricao: `Medição ${comp(mes)} — ${p.titulo}`, idempotencyKey: `seed-fat-${contratoId}-${mes}` }),
      `Faturar ${comp(mes)} — ${p.titulo}`,
    ).id!;
    conta(c, "faturas");
    c.faturadoNoMes.set(mes, (c.faturadoNoMes.get(mes) ?? 0) + valor);

    // Recebimento: entra no extrato e é conciliado com a conta a receber.
    if (!passou(vencimento) || p.faturasEmAtraso?.includes(mes)) continue;
    const fracao = p.recebimentoParcial?.[mes] ?? 1;
    const recebido = r2(valor * fracao);
    const quando = ateHoje(somaDias(vencimento, Math.floor(rnd() * 5) - 2));
    const banco = ["eolica", "incorporadora"].includes(p.cliente) ? c.bancoSecundario : c.bancoPrincipal;
    const atual = await versaoDoProjeto(projectId, "atual");
    const [linha] = await db
      .insert(schema.cashEntries)
      .values({
        tenantId: c.tenantId,
        versionId: atual.id,
        bankAccountId: banco,
        data: mdy(quando),
        descricao: `TED RECEBIDA ${CLIENTES.find((x) => x.chave === p.cliente)!.nome.toUpperCase().slice(0, 34)}`,
        valor: String(recebido),
        cat: "receita_extrato",
        rec: false,
        importHash: `seed-${contaReceberId}`,
      })
      .returning();
    ok(
      await registrarRecebimento({ contaReceberId, valor: recebido, data: mdy(quando), forma: "Extrato bancário", cashEntryId: linha.id, idempotencyKey: `seed-rec-${contaReceberId}` }),
      `Receber ${comp(mes)} — ${p.titulo}`,
    );
    conta(c, "recebimentos");
    if (fracao < 1) conta(c, "recebimentosParciais");
  }
  if (p.aditivo && !aditivoFeito && p.aditivo.mes <= MES_CORRENTE) await aditivo(c, p, contratoId, itens);
  return projectId;
}

async function aditivo(c: Ctx, p: ProjetoDemo, contratoId: string, itens: Record<string, string>) {
  const a = p.aditivo!;
  const id = ok(
    await salvarAditivo({
      contratoId,
      tipos: ["acrescimo_valor", "inclusao_servicos"],
      descricao: a.objeto,
      justificativa: a.justificativa,
      valorDelta: a.valor,
      dataSolicitacao: mdy(dataDoMes(a.mes, 4)),
      inicioVigencia: mdy(dataDoMes(a.mes, 18)),
      responsavel: p.gestor,
      variacoes: [{ itemId: itens[a.item], deltaQuantidade: a.quantidade, deltaValor: a.valor }],
    }),
    "Aditivo",
  ).id!;
  ok(await mudarStatusAditivo({ id, para: "aguardando_aprovacao" }), "Aditivo → aprovação");
  ok(await mudarStatusAditivo({ id, para: "aprovado", dataAprovacao: mdy(dataDoMes(a.mes, 12)) }), "Aditivo → aprovado");
  ok(await mudarStatusAditivo({ id, para: "assinado", dataAssinatura: mdy(dataDoMes(a.mes, 18)), inicioVigencia: mdy(dataDoMes(a.mes, 18)) }), "Aditivo → assinado");
  conta(c, "aditivos");
}

// ─────────────────────────────── 5. plano de trabalho ───────────────────────────────

async function planoDeTrabalho(c: Ctx, p: ProjetoDemo) {
  const projectId = c.projetos[p.chave];
  const fases = p.fases.map((f, i) => ({
    chave: `f${i}`,
    nome: f.nome,
    marcado: true,
    responsavel: f.responsavel,
    inicio: mdy(dataDoMes(p.inicio + f.meses[0], 1)),
    termino: mdy(dataDoMes(p.inicio + f.meses[1], 28)),
    atividades: f.atividades.map((a, j) => ({ chave: `f${i}a${j}`, nome: a.nome, marcado: true, responsavel: a.responsavel ?? f.responsavel, inicio: mdy(dataDoMes(p.inicio + f.meses[0], 1)), termino: mdy(dataDoMes(p.inicio + f.meses[1], 28)), subatividades: [] })),
    entregas: f.entregas.map((e, j) => ({ chave: `f${i}e${j}`, nome: e.nome, marcado: true, data: mdy(dataDoMes(p.inicio + e.mes, 25)) })),
  }));
  ok(await criarPlano({ projectId, origem: "branco", chave: `seed-plano-${p.chave}`, fases }), `Plano de trabalho — ${p.nome}`);
  conta(c, "planos");

  // Andamento pelo tempo decorrido de cada fase (concluído: tudo a 100%).
  const fasesDb = await db.select().from(schema.projetoFases).where(eq(schema.projetoFases.projectId, projectId));
  for (const f of p.fases) {
    const fdb = fasesDb.find((x) => x.nome === f.nome)!;
    const ini = p.inicio + f.meses[0];
    const fimF = p.inicio + f.meses[1];
    const frac = p.situacao === "concluido" ? 1 : Math.max(0, Math.min(1, (MES_CORRENTE - ini + FRACAO_DO_MES_CORRENTE) / (fimF - ini + 1)));
    const atividades = await db.select().from(schema.projetoAtividades).where(eq(schema.projetoAtividades.faseId, fdb.id));
    for (const a of atividades) {
      const pa = frac >= 1 ? 100 : Math.round(Math.max(0, Math.min(99, frac * 100 + (rnd() * 20 - 10))));
      ok(
        await atualizarAndamento({ tipo: "atividade", id: a.id, status: pa >= 100 ? "concluida" : pa > 0 ? "em_andamento" : "nao_iniciada", percentual: pa, inicioReal: pa > 0 ? mdy(dataDoMes(ini, 3)) : null, terminoReal: pa >= 100 ? mdy(ateHoje(dataDoMes(fimF, 24))) : null }),
        `Andamento — ${a.nome}`,
      );
      conta(c, "atividades");
    }
    ok(
      await atualizarAndamento({ tipo: "fase", id: fdb.id, status: frac >= 1 ? "concluida" : frac > 0 ? "em_andamento" : "nao_iniciada", percentual: Math.round(frac * 100), inicioReal: frac > 0 ? mdy(dataDoMes(ini, 3)) : null, terminoReal: frac >= 1 ? mdy(ateHoje(dataDoMes(fimF, 24))) : null }),
      `Andamento — ${f.nome}`,
    );
    conta(c, "fases");
    // Entregas já passadas: aceitas (as do mês corrente, entregues).
    const entregas = await db.select().from(schema.projetoEntregas).where(eq(schema.projetoEntregas.faseId, fdb.id));
    for (const e of entregas) {
      const doCatalogo = f.entregas.find((x) => x.nome === e.nome)!;
      const mesE = p.inicio + doCatalogo.mes;
      if (mesE > MES_CORRENTE) continue;
      ok(
        await salvarEntrega({ id: e.id, projectId, faseId: fdb.id, nome: e.nome, dataPrevista: e.dataPrevista, dataEfetiva: mdy(ateHoje(dataDoMes(mesE, 22))), status: mesE < MES_CORRENTE ? "aceita" : "entregue", responsavel: f.responsavel }),
        `Entrega ${e.nome}`,
      );
    }
  }
}

// ─────────────────────────────── 6. equipes e horas ───────────────────────────────

async function funcaoId(c: Ctx, nome: string): Promise<string> {
  if (c.funcoes[nome]) return c.funcoes[nome];
  // As funções padrão do app (Técnico de campo, Arqueólogo(a), Biólogo(a)…) e as já criadas.
  for (const f of await garantirFuncoesPadrao(c.tenantId)) c.funcoes[f.nome] = f.id;
  if (!c.funcoes[nome]) c.funcoes[nome] = ok(await addFuncao(nome), `Função ${nome}`).id;
  return c.funcoes[nome];
}

/** Dias úteis do mês (até ontem, no mês corrente). */
function diasUteis(m: number): Date[] {
  const out: Date[] = [];
  const ultimo = new Date(dataDoMes(m, 1).getFullYear(), dataDoMes(m, 1).getMonth() + 1, 0).getDate();
  for (let d = 1; d <= ultimo; d++) {
    const dt = dataDoMes(m, d);
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;
    if (!passou(dt)) break;
    out.push(dt);
  }
  return out;
}

async function equipeEHoras(c: Ctx, p: ProjetoDemo) {
  const projectId = c.projetos[p.chave];
  const contratoId = c.contratos[p.chave];
  const fasesDb = await db.select().from(schema.projetoFases).where(eq(schema.projetoFases.projectId, projectId));
  const faseDoMes = (preferida: string, mes: number) => {
    const rel = mes - p.inicio;
    const ativa = (f: (typeof p.fases)[number]) => rel >= f.meses[0] && rel <= f.meses[1];
    const f = p.fases.find((x) => x.nome === preferida && ativa(x)) ?? p.fases.find(ativa) ?? p.fases[p.fases.length - 1];
    return fasesDb.find((x) => x.nome === f.nome)?.id ?? null;
  };

  // CLT: alocação com custo-hora; horas planejadas (mês a mês) e realizadas (dia a dia).
  for (const m of p.clt) {
    const f = FUNCIONARIOS.find((x) => x.nome === m.nome)!;
    const alocId = ok(
      await alocarMembro(fd({ projectId, funcionarioId: c.funcionarios[m.nome], funcaoId: await funcaoId(c, m.funcao), entrada: ymd(dataDoMes(p.inicio + (m.meses?.[0] ?? 0), 1)), obs: `CLT — ${f.cargo}` })),
      `Alocar ${m.nome}`,
    ).id;
    ok(await definirCustoHora(alocId, custoHora(f.salario)), `Custo-hora de ${m.nome}`);
    conta(c, "alocacoesClt");
    const [de, ate] = m.meses ?? [0, p.duracao - 1];
    for (let rel = de; rel <= ate; rel++) {
      const mes = p.inicio + rel;
      ok(
        await registrarHoras({ tipo: "planejado", profissional: `f:${c.funcionarios[m.nome]}`, projectId, contratoId, projetoFaseId: faseDoMes(m.fase, mes), data: mdy(dataDoMes(mes, 1)), horas: m.horasMes, descricao: "Horas planejadas no mês", idempotencyKey: `seed-hp-${p.chave}-${m.nome}-${mes}` }),
        `Horas planejadas de ${m.nome}`,
      );
      conta(c, "apontamentosPlanejados");
      if (mes > MES_CORRENTE) continue;
      // Realizado: o planejado com variação; no mês corrente, proporcional ao que passou.
      const chave = `${m.nome}|${mes}`;
      const jaNoMes = c.horasPessoaMes.get(chave) ?? 0;
      const fracao = mes === MES_CORRENTE ? FRACAO_DO_MES_CORRENTE : 1;
      let horas = Math.round(m.horasMes * (p.pressaoHoras ?? 1) * ruido(0.06) * fracao);
      horas = Math.max(0, Math.min(horas, Math.floor(HORAS_MES * fracao) - jaNoMes));
      const dias = diasUteis(mes);
      if (horas <= 0 || dias.length === 0) continue;
      // Espalha em dias de até 8 h (a pessoa pode estar em outro projeto nos demais dias).
      const n = Math.min(dias.length, Math.ceil(horas / 8));
      const passo = dias.length / n;
      let resto = horas;
      for (let i = 0; i < n; i++) {
        const h = i === n - 1 ? resto : Math.min(8, resto);
        if (h <= 0) break;
        resto -= h;
        ok(
          await registrarHoras({ tipo: "realizado", profissional: `f:${c.funcionarios[m.nome]}`, projectId, contratoId, projetoFaseId: faseDoMes(m.fase, mes), data: mdy(dias[Math.floor(i * passo)]), horas: h, idempotencyKey: `seed-hr-${p.chave}-${m.nome}-${mes}-${i}` }),
          `Horas de ${m.nome}`,
        );
        conta(c, "apontamentosRealizados");
      }
      c.horasPessoaMes.set(chave, jaNoMes + horas);
      // Folha apropriada a este projeto: salário/168 por hora, mais FGTS e benefícios.
      const sal = (horas * f.salario) / HORAS_MES;
      const k = `${p.chave}|${mes}`;
      const [s0, e0, b0] = c.folhaDoProjeto.get(k) ?? [0, 0, 0];
      c.folhaDoProjeto.set(k, [s0 + sal, e0 + sal * FATOR_ENCARGOS, b0 + sal * FATOR_BENEFICIOS]);
    }
  }

  // Terceiros: alocação (o custo é o serviço contratado, lançado como despesa).
  for (const t of p.terceiros) {
    ok(
      await alocarMembro(fd({ projectId, stakeholderId: c.fornecedores[t.fornecedor], funcaoId: await funcaoId(c, t.funcao), valorDiaria: t.diaria ?? null, entrada: ymd(dataDoMes(p.inicio, 1)), obs: "Terceiro — serviço contratado" })),
      `Alocar terceiro ${t.fornecedor}`,
    );
    conta(c, "alocacoesTerceiros");
  }
}

// ─────────────────────────────── 7. despesas do projeto ───────────────────────────────

async function despesasDoProjeto(c: Ctx, p: ProjetoDemo, plano: PlanoDeCustos) {
  const projectId = c.projetos[p.chave];
  const contratoId = c.contratos[p.chave];
  const ultimo = fimDoRealizado(p);

  // Folha apropriada (2.1), mês a mês: paga no 5º dia do mês seguinte.
  const folha: { conta: string; descricao: string; valor: number; mes: number; vencimento: Date }[] = [];
  for (let mes = p.inicio; mes <= ultimo; mes++) {
    const f = c.folhaDoProjeto.get(`${p.chave}|${mes}`);
    if (!f) continue;
    const venc = dataDoMes(mes + 1, 5);
    folha.push({ conta: "2.1.01", descricao: `Folha apropriada pelas horas — salários da equipe técnica (${comp(mes)})`, valor: r2(f[0]), mes, vencimento: venc });
    folha.push({ conta: "2.1.02", descricao: `Folha apropriada pelas horas — FGTS (${comp(mes)})`, valor: r2(f[1]), mes, vencimento: venc });
    folha.push({ conta: "2.1.03", descricao: `Folha apropriada pelas horas — benefícios (${comp(mes)})`, valor: r2(f[2]), mes, vencimento: venc });
  }

  // Linhas "despesa" do catálogo: o orçado × pressão do Forecast × variação.
  type Linha = { custo: CustoDemo; mes: number; valor: number };
  const linhas: Linha[] = plano.linhas
    .filter((l) => l.mes <= ultimo && (l.custo.via ?? "despesa") === "despesa")
    .map((l) => ({ custo: l.custo, mes: l.mes, valor: r2(l.valor * (p.pressao[l.grupo] ?? 1) * ruido(l.custo.variacao ?? 0.03)) }));
  // Escopo do aditivo: não estava no Orçamento, mas acontece (só nos meses já ocorridos).
  for (const cu of p.custos.filter((x) => x.soPrevisao))
    for (const rel of mesesDoCusto(p, cu)) if (p.inicio + rel <= ultimo) linhas.push({ custo: cu, mes: p.inicio + rel, valor: r2(cu.valor * plano.fator * (p.pressao[grupoDaConta(cu.conta)] ?? 1)) });

  // Projeto concluído: o realizado fecha EXATAMENTE no Forecast final.
  if (p.situacao === "concluido") {
    const alvo = r2(p.forecast.custo - soma(folha.map((x) => x.valor)));
    const bruto = soma(linhas.map((l) => l.valor));
    for (const l of linhas) l.valor = r2((l.valor * alvo) / bruto);
    const dif = r2(alvo - soma(linhas.map((l) => l.valor)));
    linhas.sort((a, b) => a.mes - b.mes || b.valor - a.valor)[0].valor = r2(linhas[0].valor + dif);
  }

  for (const x of folha) await lancarDespesa(c, { projectId, conta: x.conta, descricao: x.descricao, valor: x.valor, mes: x.mes, vencimento: x.vencimento, forma: "Transferência bancária", banco: c.bancoSecundario, contratoId });
  conta(c, "despesasDeFolhaApropriada", folha.length);

  for (const l of linhas.sort((a, b) => a.mes - b.mes)) {
    const venc = dataDoMes(l.mes, 15 + Math.floor(rnd() * 12));
    // Duas despesas do mês anterior ficam vencidas sem pagamento (alerta de atraso).
    const emAberto = l.mes === MES_CORRENTE - 1 && c.despesasEmAberto < 2 && rnd() < 0.3 && !l.custo.reembolsavel;
    const id = await lancarDespesa(c, {
      projectId,
      conta: l.custo.conta,
      fornecedor: l.custo.fornecedor,
      descricao: l.custo.descricao,
      valor: l.valor,
      mes: l.mes,
      vencimento: venc,
      forma: l.custo.conta === "2.3.06" ? "PIX" : "Boleto",
      deixarEmAberto: emAberto,
      contratoId,
    });
    if (l.custo.fornecedor && FORNECEDORES.find((f) => f.chave === l.custo.fornecedor)?.terceiro) conta(c, "despesasDeTerceiros");
    if (l.custo.reembolsavel) {
      const rid = ok(await incluirReembolso({ contratoId, despesaId: id, obs: "Taxa paga em nome do cliente — reembolsável por contrato" }), "Incluir reembolso").id!;
      ok(await mudarStatusReembolso({ id: rid, para: "solicitado" }), "Reembolso solicitado");
      if (l.custo.reembolsavel === "aprovado" && l.mes < MES_CORRENTE - 1) {
        ok(await mudarStatusReembolso({ id: rid, para: "aprovado", valorAprovado: r2(l.valor * 0.95) }), "Reembolso aprovado (com glosa)");
      }
      conta(c, "reembolsos");
    }
  }

  // Passagens no cartão corporativo.
  for (const l of plano.linhas.filter((x) => x.custo.via === "cartao" && x.mes <= ultimo)) {
    const dataCompra = ateHoje(dataDoMes(l.mes, 6));
    const r = ok(
      await addDespesa(
        fd({
          projectId,
          contaCef: l.custo.conta,
          categoriaDre: categoriaDaConta(l.custo.conta),
          valor: r2(l.valor * (p.pressao[l.grupo] ?? 1) * ruido(0.1)),
          competencia: comp(l.mes),
          cartaoId: c.cartaoId,
          cartaoDataCompra: mdy(dataCompra),
          cartaoParcelas: 1,
          obs: l.custo.descricao,
        }),
      ),
      "Compra no cartão",
    );
    ok(await apropriarDespesa({ despesaId: r.id, contratoId }), "Apropriar compra no cartão");
    conta(c, "comprasNoCartao");
    conta(c, "despesas");
  }
}

/** Custo compartilhado: um pagamento por mês, rateado entre os projetos com memória de cálculo. */
async function rateios(c: Ctx) {
  for (const r of RATEIOS) {
    for (const mes of r.meses) {
      if (mes > MES_CORRENTE) continue;
      const data = ateHoje(dataDoMes(mes, 10));
      const res = await ratearEntreObras({
        prestadorId: null,
        valorTotal: r.valorMes,
        dataPagamento: mdy(data),
        bankAccountId: c.bancoPrincipal,
        competencia: comp(mes),
        categoriaDre: categoriaDaConta(r.conta),
        contaCef: r.conta,
        baseRateio: "Horas da equipe nas frentes atendidas (60% / 40%)",
        descricao: r.descricao,
        linhas: r.linhas.map((l) => ({ projectId: c.projetos[l.projeto], percentual: l.percentual })),
        idempotencyKey: `seed-rateio-${mes}`,
      });
      if (!res.ok) throw new FalhaDoSeed(`Rateio ${comp(mes)}: ${res.error}`);
      const partes = await db.select().from(schema.rateiosObra).where(eq(schema.rateiosObra.acertoId, res.acertoId!));
      for (const parte of partes) {
        const chave = Object.entries(c.projetos).find(([, id]) => id === parte.projectId)![0];
        ok(await apropriarDespesa({ despesaId: parte.despesaId!, contratoId: c.contratos[chave] }), "Apropriar parcela do rateio");
        conta(c, "despesas");
      }
      conta(c, "rateios");
    }
  }
}

// ─────────────────────────────── 8. sede, folha restante e impostos ───────────────────────────────

async function despesasDaSede(c: Ctx) {
  for (let mes = 1; mes <= MES_CORRENTE; mes++) {
    for (const [contaCef, forn, desc, valor, v] of FIXAS_DA_SEDE) {
      const dia = contaCef === "3.1.01" ? 5 : 10 + Math.floor(rnd() * 12);
      await lancarDespesa(c, { projectId: c.sedeId, conta: contaCef, fornecedor: forn, descricao: desc, valor: r2(valor * ruido(v)), mes, vencimento: dataDoMes(mes, dia), forma: contaCef === "3.1.01" ? "Boleto" : "PIX" });
    }
    // Folha que NÃO foi apropriada a projetos: administrativo e horas internas.
    const fracao = mes === MES_CORRENTE ? FRACAO_DO_MES_CORRENTE : 1;
    let salarios = 0;
    for (const f of FUNCIONARIOS) {
      if (f.admissao > mes) continue;
      const horas = c.horasPessoaMes.get(`${f.nome}|${mes}`) ?? 0;
      salarios += Math.max(0, f.salario * fracao - (horas * f.salario) / HORAS_MES);
    }
    const venc = dataDoMes(mes + 1, 5);
    await lancarDespesa(c, { projectId: c.sedeId, conta: "3.2.01", descricao: `Folha administrativa e horas internas — salários (${comp(mes)})`, valor: salarios, mes, vencimento: venc, forma: "Transferência bancária", banco: c.bancoSecundario });
    await lancarDespesa(c, { projectId: c.sedeId, conta: "3.2.02", descricao: `Folha administrativa e horas internas — FGTS (${comp(mes)})`, valor: salarios * FATOR_ENCARGOS, mes, vencimento: venc, forma: "Transferência bancária", banco: c.bancoSecundario });
    await lancarDespesa(c, { projectId: c.sedeId, conta: "3.2.03", fornecedor: "beneficios", descricao: `Benefícios — parcela não apropriada (${comp(mes)})`, valor: salarios * FATOR_BENEFICIOS, mes, vencimento: dataDoMes(mes, 8), forma: "Boleto" });
    await lancarDespesa(c, { projectId: c.sedeId, conta: "4.2.01", descricao: "Tarifas bancárias", valor: r2(189 * ruido(0.1)), mes, vencimento: dataDoMes(mes, 28), forma: "Transferência bancária" });
    if (mes === 3) await lancarDespesa(c, { projectId: c.sedeId, conta: "3.7.01", fornecedor: "conselho", descricao: "Anuidades CREA/CRBio da equipe técnica", valor: 4380, mes, vencimento: dataDoMes(mes, 28) });
    if (mes === 6) await lancarDespesa(c, { projectId: c.sedeId, conta: "6.3.03", descricao: "Notebooks para a equipe de geoprocessamento (2 un.)", valor: 15980, mes, vencimento: dataDoMes(mes, 25), forma: "Transferência bancária" });
  }
}

/** DAS do Simples: alíquota efetiva estimada sobre o faturado no mês, pago no dia 20 do mês seguinte. */
async function impostos(c: Ctx) {
  for (let mes = 0; mes < MES_CORRENTE; mes++) {
    const fat = c.faturadoNoMes.get(mes) ?? 0;
    if (fat <= 0) continue;
    await lancarDespesa(c, { projectId: c.sedeId, conta: "5.1.04", fornecedor: "governo", descricao: `DAS — Simples Nacional (competência ${comp(mes)})`, valor: fat * ALIQUOTA_DAS, mes, vencimento: dataDoMes(mes + 1, 20), forma: "Boleto" });
  }
}

/** Faturas do cartão já vencidas: pagas pelo app (o custo já está nas compras). */
async function pagarFaturasDoCartao(c: Ctx) {
  // O pagamento é FIFO (quita as parcelas em aberto até o fechamento): paga em ordem de vencimento.
  const dataDaFatura = (v: string) => (v.includes("/") ? v.replace(/^(\d\d)\/(\d\d)\/(\d{4})$/, "$3$1$2") : v.replace(/-/g, ""));
  const faturas = (await db.select().from(schema.faturasCartao).where(eq(schema.faturasCartao.cartaoId, c.cartaoId))).sort((a, b) => dataDaFatura(a.vencimento).localeCompare(dataDaFatura(b.vencimento)));
  for (const f of faturas) {
    const [{ total }] = await db
      .select({ total: sql<string>`coalesce(sum(${schema.despesaParcelas.valorOriginal}), 0)` })
      .from(schema.despesaParcelas)
      .where(eq(schema.despesaParcelas.faturaId, f.id));
    const [a, b, d] = f.vencimento.includes("/") ? f.vencimento.split("/").map(Number) : [0, 0, 0];
    const venc = f.vencimento.includes("/") ? new Date(d, a - 1, b, 12) : new Date(`${f.vencimento}T12:00:00`);
    if (Number(total) > 0 && !Number.isNaN(venc.getTime()) && passou(venc)) {
      ok(await pagarFatura({ faturaId: f.id, valor: Number(total), data: mdy(venc), bankAccountId: c.bancoPrincipal, projectId: c.sedeId, idempotencyKey: `seed-fatura-${f.id}` }), "Pagamento da fatura do cartão");
      conta(c, "faturasDoCartaoPagas");
    }
  }
}

// ─────────────────────────────── 9. estoque ───────────────────────────────

async function estoque(c: Ctx) {
  const itens: string[] = [];
  for (const e of ESTOQUE) {
    const r = ok(await addStockItem(fd({ nome: e.nome, unidade: e.unidade, categoria: e.categoria, custoUnit: e.custo, minimo: e.minimo })), `Material ${e.nome}`);
    itens.push((r as unknown as { id: string }).id);
    conta(c, "materiais");
  }
  // Compras: custo do projeto que recebe o lote; as entradas apontam para a despesa.
  for (const compra of COMPRAS_DE_ESTOQUE) {
    if (compra.mes > MES_CORRENTE) continue;
    const despesaId = await lancarDespesa(c, {
      projectId: c.projetos[compra.projeto],
      conta: compra.conta,
      fornecedor: "insumos",
      descricao: `Lote de estoque — ${compra.categoria === "EPI" ? "EPIs de campo" : `materiais de ${compra.categoria.toLowerCase()}`}`,
      valor: valorDaCompra(compra),
      mes: compra.mes,
      vencimento: dataDoMes(compra.mes, 20),
      contratoId: c.contratos[compra.projeto],
    });
    for (const [i, itemId] of itens.entries()) {
      const e = ESTOQUE[i];
      if (e.categoria !== compra.categoria) continue;
      ok(
        await addStockMovement(fd({ tipo: "entrada", itemId, quantidade: Math.round(e.minimo * compra.multiplo), despesaId, data: mdy(ateHoje(dataDoMes(compra.mes, 4))), doc: `NF ${4100 + compra.mes * 3}`, origem: "Compra", obs: "Lote de estoque", confirmar: "1" })),
        "Entrada de estoque",
      );
      conta(c, "movimentosDeEstoque");
    }
  }
  // Saídas para campo (não geram custo: só movimentam o estoque).
  const destinos: Record<string, string[]> = { Coleta: ["fauna", "flora"], EPI: ["arqueologia", "gestao", "fauna"], Campo: ["arqueologia", "gestao"] };
  for (const [i, itemId] of itens.entries()) {
    const e = ESTOQUE[i];
    const primeira = Math.min(...COMPRAS_DE_ESTOQUE.filter((x) => x.categoria === e.categoria).map((x) => x.mes));
    for (let mes = primeira + 1; mes <= MES_CORRENTE; mes++) {
      const chave = destinos[e.categoria][mes % destinos[e.categoria].length];
      const p = PROJETOS.find((x) => x.chave === chave)!;
      if (mes < p.inicio || mes > fimDoProjeto(p)) continue;
      const ritmo = ["Bota de PVC cano longo", "Fita zebrada de sinalização (rolo)"].includes(e.nome) ? 0.42 : 0.3;
      const qtd = Math.max(1, Math.round(e.minimo * ritmo * (0.75 + rnd() * 0.4)));
      const r = await addStockMovement(fd({ tipo: "saida", itemId, quantidade: qtd, projectId: c.projetos[chave], data: mdy(ateHoje(dataDoMes(mes, 8))), obs: "Retirada para campanha de campo", confirmar: "1" }));
      if (!r || !(r as { ok: boolean }).ok) continue; // sem saldo: a retirada não acontece
      conta(c, "movimentosDeEstoque");
    }
  }
}

// ─────────────────────────────── 10. orçamento e previsão ───────────────────────────────

/** Linha do Orçamento (modelo total + % por mês). O % é exato: o valor mensal gravado fecha no centavo. */
function linhaDoOrcamento(rowKey: string, dreCategory: string, porMes: Map<number, number>, total: number) {
  const meses = [...porMes.entries()].filter(([, v]) => Math.abs(v) > 0.004).sort(([a], [b]) => a - b);
  return { rowKey, dreCategory, total: r2(total), months: meses.map(([m, v]) => ({ mes: comp(m), pct: (v * 100) / total })) };
}
function porGrupo(cells: { grupo: string; mes: number; valor: number }[]) {
  const out = new Map<string, Map<number, number>>();
  for (const x of cells) {
    const g = out.get(x.grupo) ?? new Map<number, number>();
    g.set(x.mes, r2((g.get(x.mes) ?? 0) + x.valor));
    out.set(x.grupo, g);
  }
  return out;
}
function linhasDeDespesa(cells: { grupo: string; mes: number; valor: number }[]) {
  return [...porGrupo(cells).entries()].map(([g, meses]) => {
    const total = soma(meses.values());
    const conta = [...CONTAS_DO_PLANO.values()].find((x) => x.groupCode === g)!;
    return linhaDoOrcamento(g, conta.dreCategory, meses, total);
  });
}

/** Receita prevista: cada medição vira fatura no vencimento previsto. */
function receitaPrevista(p: ProjetoDemo, filtro: (m: number, itemCodigo: string) => boolean): Map<number, number> {
  const out = new Map<number, number>();
  for (const it of p.itens)
    for (const [m, q] of it.medicoes) {
      if (!filtro(m, it.codigo)) continue;
      const v = it.criterio === "percentual" ? (it.quantidade * it.valorUnitario * q) / 100 : q * it.valorUnitario;
      const mv = mesDe(vencimentoDaFatura(p, m));
      out.set(mv, r2((out.get(mv) ?? 0) + v));
    }
  return out;
}
/** Medições do aditivo (as unidades acrescidas): só entram na Previsão. */
const ehDoAditivo = (p: ProjetoDemo, m: number, item: string) => !!p.aditivo && p.aditivo.item === item && p.aditivo.meses.includes(m);

/** Realizado do banco: despesas da Atual por subgrupo e competência; receitas (faturas) por vencimento. */
async function realizadoDoBanco(projectId: string) {
  const atual = await versaoDoProjeto(projectId, "atual");
  const desp = await db
    .select({ conta: schema.despesas.contaCef, competencia: schema.despesas.competencia, valor: sql<string>`sum(${schema.despesas.valor})` })
    .from(schema.despesas)
    .where(and(eq(schema.despesas.versionId, atual.id), eq(schema.despesas.cancelado, false)))
    .groupBy(schema.despesas.contaCef, schema.despesas.competencia);
  const custos = desp
    .filter((d) => d.conta && d.competencia)
    .map((d) => ({ grupo: grupoDaConta(d.conta!), mes: mesDaComp(d.competencia!), valor: Number(d.valor) }))
    .filter((d) => d.mes <= MES_CORRENTE);
  const fat = await db.select({ valor: schema.contasReceber.valor, vencimento: schema.contasReceber.vencimento }).from(schema.contasReceber).where(and(eq(schema.contasReceber.projectId, projectId), eq(schema.contasReceber.cancelado, false)));
  const receitas = new Map<number, number>();
  for (const f of fat) {
    const [mm, , yy] = (f.vencimento ?? "").split("/").map(Number);
    const m = (yy - HOJE.getFullYear()) * 12 + (mm - 1) - HOJE.getMonth() + MES_CORRENTE;
    receitas.set(m, r2((receitas.get(m) ?? 0) + Number(f.valor)));
  }
  return { custos, receitas };
}

interface Conferencia {
  projeto: ProjetoDemo;
  orcamento: { receita: number; custo: number };
  previsao: { receita: number; custo: number };
  realizadoAteHoje: number;
  previstoParaConcluir: number;
  fator: number;
}

async function orcamentosEPrevisoes(c: Ctx, planos: Record<string, PlanoDeCustos>): Promise<Conferencia[]> {
  const conferencias: Conferencia[] = [];
  for (const p of PROJETOS) {
    const projectId = c.projetos[p.chave];
    const plano = planos[p.chave];
    const orc = await versaoDoProjeto(projectId, "budget");
    const prev = await versaoDoProjeto(projectId, "forecast");

    // ── Orçamento (original): receita = contrato original; custo = plano.
    const recOrc = receitaPrevista(p, (m, item) => !ehDoAditivo(p, m, item));
    const cellsOrc = [...plano.linhas.map((l) => ({ grupo: l.grupo, mes: l.mes, valor: l.valor })), ...[...plano.pessoal.entries()].map(([mes, valor]) => ({ grupo: "2.1", mes, valor }))];
    ok(await saveBudgetPlanning(orc.id, "receita", [linhaDoOrcamento(RECEITAS_PROJETO_KEY, "Receita", recOrc, valorOriginal(p))]), `Orçamento (receita) — ${p.nome}`);
    ok(await saveBudgetPlanning(orc.id, "despesa", linhasDeDespesa(cellsOrc)), `Orçamento (custo) — ${p.nome}`);
    ok(await setVersionStatus(orc.id, "Concluído"), "Orçamento concluído");
    ok(await setVersionStatus(orc.id, "Aprovado"), "Orçamento aprovado");

    // ── Previsão: realizado (banco) até o mês corrente + reprojeção depois.
    const real = await realizadoDoBanco(projectId);
    const realizadoCusto = soma(real.custos.map((x) => x.valor));
    const fim = fimDoProjeto(p);
    const futuroFixo: { grupo: string; mes: number; valor: number }[] = [];
    const futuroAjustavel: { grupo: string; mes: number; valor: number }[] = [];
    for (const m of p.clt) {
      const f = FUNCIONARIOS.find((x) => x.nome === m.nome)!;
      const [de, ate] = m.meses ?? [0, p.duracao - 1];
      for (let rel = de; rel <= ate; rel++) {
        const mes = p.inicio + rel;
        if (mes > MES_CORRENTE) futuroFixo.push({ grupo: "2.1", mes, valor: r2(m.horasMes * (p.pressaoHoras ?? 1) * custoHora(f.salario)) });
      }
    }
    for (const l of plano.linhas.filter((x) => x.mes > MES_CORRENTE)) (l.ajustavel ? futuroAjustavel : futuroFixo).push({ grupo: l.grupo, mes: l.mes, valor: r2(l.valor * (l.ajustavel ? (p.pressao[l.grupo] ?? 1) : 1)) });
    for (const cu of p.custos.filter((x) => x.soPrevisao))
      for (const rel of mesesDoCusto(p, cu)) if (p.inicio + rel > MES_CORRENTE) futuroAjustavel.push({ grupo: grupoDaConta(cu.conta), mes: p.inicio + rel, valor: r2(cu.valor * plano.fator * (p.pressao[grupoDaConta(cu.conta)] ?? 1)) });
    const restante = r2(p.forecast.custo - realizadoCusto - soma(futuroFixo.map((x) => x.valor)));
    const brutoAjustavel = soma(futuroAjustavel.map((x) => x.valor));
    let fator = 1;
    if (fim <= MES_CORRENTE || brutoAjustavel === 0) {
      if (Math.abs(restante) > 0.01) throw new FalhaDoSeed(`Previsão de "${p.nome}": o realizado (${realizadoCusto}) não fecha no Forecast final (${p.forecast.custo}).`);
    } else {
      fator = restante / brutoAjustavel;
      if (!(fator > 0.5 && fator < 1.8)) throw new FalhaDoSeed(`Previsão de "${p.nome}": fator da reprojeção ${fator.toFixed(3)} fora do razoável (realizado ${realizadoCusto}).`);
      for (const x of futuroAjustavel) x.valor = r2(x.valor * fator);
      const dif = r2(restante - soma(futuroAjustavel.map((x) => x.valor)));
      futuroAjustavel[futuroAjustavel.length - 1].valor = r2(futuroAjustavel[futuroAjustavel.length - 1].valor + dif);
    }
    const cellsPrev = [...real.custos, ...futuroFixo, ...futuroAjustavel];
    ok(await saveBudgetPlanning(prev.id, "despesa", linhasDeDespesa(cellsPrev)), `Previsão (custo) — ${p.nome}`);

    // Receita da Previsão: faturas do banco (realizado até o mês corrente e as já
    // emitidas que vencem depois) + medições ainda não faturadas no vencimento previsto.
    const faturadoTotal = soma(real.receitas.values());
    const recA = new Map<number, number>(); // contrato original (linha fixa)
    const recB = new Map<number, number>(); // aditivo (linha 1.1)
    for (const [m, v] of real.receitas) recA.set(m, v);
    const aFaturar = receitaPrevista(p, (m) => m >= MES_CORRENTE);
    const aditivoPrev = receitaPrevista(p, (m, item) => m >= MES_CORRENTE && ehDoAditivo(p, m, item));
    for (const [m, v] of aFaturar) {
      const doAditivo = aditivoPrev.get(m) ?? 0;
      if (v - doAditivo > 0) recA.set(m, r2((recA.get(m) ?? 0) + v - doAditivo));
      if (doAditivo > 0) recB.set(m, r2((recB.get(m) ?? 0) + doAditivo));
    }
    const totalA = soma(recA.values());
    const totalB = soma(recB.values());
    if (Math.abs(totalA - valorOriginal(p)) > 0.01) throw new FalhaDoSeed(`Previsão de receita de "${p.nome}": ${totalA} ≠ contrato original ${valorOriginal(p)} (faturado ${faturadoTotal}).`);
    const linhasReceita = [linhaDoOrcamento(RECEITAS_PROJETO_KEY, "Receita", recA, valorOriginal(p))];
    if (totalB > 0) linhasReceita.push(linhaDoOrcamento("1.1", "Receita", recB, totalB));
    ok(await saveBudgetPlanning(prev.id, "receita", linhasReceita), `Previsão (receita) — ${p.nome}`);
    if (Math.abs(totalA + totalB - p.forecast.receita) > 0.01) throw new FalhaDoSeed(`Previsão de receita de "${p.nome}": ${totalA + totalB} ≠ matriz ${p.forecast.receita}.`);
    ok(await setVersionStatus(prev.id, "Concluído"), "Previsão concluída");
    conta(c, "orcamentos");
    conta(c, "previsoes");

    conferencias.push({
      projeto: p,
      orcamento: { receita: soma(recOrc.values()), custo: soma(cellsOrc.map((x) => x.valor)) },
      previsao: { receita: totalA + totalB, custo: soma(cellsPrev.map((x) => x.valor)) },
      realizadoAteHoje: realizadoCusto,
      previstoParaConcluir: r2(soma(futuroFixo.map((x) => x.valor)) + soma(futuroAjustavel.map((x) => x.valor))),
      fator,
    });
  }

  // Sede: despesas fixas, folha não apropriada e impostos, para 24 meses.
  const sede = (fator: number) => {
    const cells: { grupo: string; mes: number; valor: number }[] = [];
    for (let mes = 1; mes <= 24; mes++) {
      for (const [contaCef, , , valor] of FIXAS_DA_SEDE) cells.push({ grupo: grupoDaConta(contaCef), mes, valor: valor * fator });
      cells.push({ grupo: "3.2", mes, valor: 26000 * fator });
      cells.push({ grupo: "5.1", mes, valor: 240000 * ALIQUOTA_DAS * fator });
    }
    return linhasDeDespesa(cells.map((x) => ({ ...x, valor: r2(x.valor) })));
  };
  ok(await saveBudgetPlanning((await versaoDoProjeto(c.sedeId, "budget")).id, "despesa", sede(1)), "Orçamento da sede");
  ok(await saveBudgetPlanning((await versaoDoProjeto(c.sedeId, "forecast")).id, "despesa", sede(1.03)), "Previsão da sede");
  return conferencias;
}

// ─────────────────────────────── 11. recriação segura ───────────────────────────────

/**
 * Se a demonstração já existe, mostra o ESCOPO (empresa, usuários, volume) e só
 * apaga com SEED_DEMO_RECRIAR=sim E SEED_DEMO_TENANT_ID igual ao id da empresa
 * identificada — e só se ela não tiver usuários fora da demonstração.
 * Devolve true quando pode seguir criando.
 */
async function tratarDemonstracaoExistente(email: string): Promise<boolean> {
  const candidatas = await db.select().from(schema.tenants).where(inArray(schema.tenants.name, [EMPRESA.nome, ...NOMES_ANTERIORES]));
  if (candidatas.length === 0) return true;
  const permitidos = new Set([email, ...EQUIPE_COM_ACESSO.map((x) => x.email), ...EMAILS_ANTERIORES]);
  const escopo = [];
  for (const t of candidatas) {
    const membros = await db.select({ email: schema.users.email, role: schema.memberships.role }).from(schema.memberships).innerJoin(schema.users, eq(schema.memberships.userId, schema.users.id)).where(eq(schema.memberships.tenantId, t.id));
    const [{ n: projetos }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.projects).where(eq(schema.projects.tenantId, t.id));
    const [{ n: despesas }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.despesas).where(eq(schema.despesas.tenantId, t.id));
    const estranhos = membros.filter((m) => !permitidos.has((m.email ?? "").toLowerCase()));
    const dono = membros.some((m) => (m.email ?? "").toLowerCase() === email && m.role === "owner");
    escopo.push({ t, membros, projetos, despesas, estranhos, dono });
    console.log(`Empresa encontrada: "${t.name}" (id ${t.id}) — ${membros.length} usuário(s), ${projetos} projeto(s)/unidade(s), ${despesas} despesa(s).`);
    console.log(`  usuários: ${membros.map((m) => `${m.email} (${m.role})`).join(", ") || "nenhum"}`);
    if (estranhos.length) console.log(`  ATENÇÃO: usuários fora da demonstração: ${estranhos.map((m) => m.email).join(", ")}`);
    if (!dono) console.log(`  ATENÇÃO: ${email} não é o proprietário desta empresa.`);
  }
  if (process.env.SEED_DEMO_RECRIAR !== "sim") {
    console.log("Demonstração não recriada: a empresa já existe. Para recriar, confira o escopo acima e rode com SEED_DEMO_RECRIAR=sim e SEED_DEMO_TENANT_ID=<id>.");
    return false;
  }
  const alvoId = (process.env.SEED_DEMO_TENANT_ID ?? "").trim();
  const alvo = escopo.find((e) => e.t.id === alvoId);
  if (!alvo) throw new FalhaDoSeed("SEED_DEMO_RECRIAR=sim exige SEED_DEMO_TENANT_ID com o id EXATO de uma das empresas listadas acima. Nada foi apagado.");
  if (alvo.estranhos.length) throw new FalhaDoSeed(`A empresa ${alvoId} tem usuários fora da demonstração (${alvo.estranhos.map((m) => m.email).join(", ")}). Nada foi apagado.`);
  if (!alvo.dono) throw new FalhaDoSeed(`${email} não é o proprietário da empresa ${alvoId}. Nada foi apagado.`);
  if (escopo.length > 1) console.log(`Outras empresas com o mesmo nome ficam intactas: ${escopo.filter((e) => e.t.id !== alvoId).map((e) => e.t.id).join(", ")}.`);
  console.log(`Apagando SOMENTE a empresa ${alvoId} (autorizada)...`);
  await db.delete(schema.tenants).where(eq(schema.tenants.id, alvoId));
  for (const e of EMAILS_ANTERIORES) {
    const [u] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, e)).limit(1);
    if (!u) continue;
    const vinculos = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, u.id));
    if (vinculos.length === 0) await db.delete(schema.users).where(eq(schema.users.id, u.id));
  }
  return true;
}

// ─────────────────────────────── execução ───────────────────────────────

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  if (PROJETOS.length !== 5) throw new FalhaDoSeed(`O catálogo precisa ter exatamente 5 projetos (tem ${PROJETOS.length}).`);
  for (const p of PROJETOS) {
    const total = valorOriginal(p);
    if (total !== p.budget.receita) throw new FalhaDoSeed(`"${p.nome}": itens somam ${total}, Budget de receita é ${p.budget.receita}.`);
    if (total + (p.aditivo?.valor ?? 0) !== p.forecast.receita) throw new FalhaDoSeed(`"${p.nome}": contrato atualizado ≠ Forecast de receita.`);
  }
  if (!(await tratarDemonstracaoExistente(email))) return;

  console.log(`Criando "${EMPRESA.nome}" (mês 0 = ${comp(0)}, mês corrente = ${comp(MES_CORRENTE)})...`);
  const { tenantId, senha } = await criarEmpresa(email);
  sessaoDoSeed.email = email;
  const c: Ctx = {
    tenantId,
    bancoPrincipal: "",
    bancoSecundario: "",
    cartaoId: "",
    sedeId: "",
    clientes: {},
    fornecedores: {},
    funcionarios: {},
    funcoes: {},
    projetos: {},
    contratos: {},
    horasPessoaMes: new Map(),
    folhaDoProjeto: new Map(),
    faturadoNoMes: new Map(),
    despesasEmAberto: 0,
    contagem: {},
  };
  await criarCadastros(c);

  c.sedeId = ok(await createProject("Sede administrativa — Curitiba", null, { kind: "office" }), "Sede").id!;
  ok(await addAjuste(fd({ projectId: c.sedeId, bankAccountId: c.bancoPrincipal, valor: 650000, sinal: "mais", data: mdy(dataDoMes(0, 1)), motivo: "Saldo de abertura da conta operacional" })), "Saldo de abertura");
  ok(await addAjuste(fd({ projectId: c.sedeId, bankAccountId: c.bancoSecundario, valor: 280000, sinal: "mais", data: mdy(dataDoMes(0, 1)), motivo: "Saldo de abertura da conta reserva" })), "Saldo de abertura");

  const planos: Record<string, PlanoDeCustos> = {};
  for (const p of PROJETOS) planos[p.chave] = planoDoOrcamento(p);
  // Ordem cronológica de início: as horas de quem atua em vários projetos são distribuídas sem passar de 168 h/mês.
  for (const p of [...PROJETOS].sort((a, b) => a.inicio - b.inicio || a.numero - b.numero)) {
    console.log(`  • Projeto ${p.numero} — ${p.nome}`);
    await projetoEContrato(c, p);
    await planoDeTrabalho(c, p);
    await equipeEHoras(c, p);
    await despesasDoProjeto(c, p, planos[p.chave]);
    if (p.situacao === "concluido") {
      ok(await mudarStatusContrato({ id: c.contratos[p.chave], para: "concluido" }), `Concluir contrato ${p.titulo}`);
      ok(await setProjectSituacao(c.projetos[p.chave], "Finalizado"), `Finalizar projeto ${p.nome}`);
    }
  }
  console.log("  • Custo compartilhado (rateio)");
  await rateios(c);
  console.log("  • Estoque");
  await estoque(c);
  console.log("  • Sede, folha não apropriada e impostos");
  await despesasDaSede(c);
  await impostos(c);
  await pagarFaturasDoCartao(c);
  console.log("  • Orçamento e previsão");
  const conferencias = await orcamentosEPrevisoes(c, planos);

  // Saldo atual de cada conta = abertura + recebimentos − pagamentos lançados.
  for (const banco of [c.bancoPrincipal, c.bancoSecundario]) {
    const [{ saldo }] = await db.select({ saldo: sql<string>`coalesce(sum(${schema.cashEntries.valor}), 0)` }).from(schema.cashEntries).where(eq(schema.cashEntries.bankAccountId, banco));
    await db.update(schema.bankAccounts).set({ saldo: String(r2(Number(saldo))), saldoSource: "manual" }).where(eq(schema.bankAccounts.id, banco));
  }

  console.log("\n✓ Demonstração criada:");
  for (const [k, v] of Object.entries(c.contagem)) console.log(`    ${k.padEnd(28)} ${v}`);
  console.log("\nConferência por projeto (custo = custos diretos do projeto; margem de referência = receita − custo, antes de sede e impostos):");
  for (const x of conferencias) {
    const p = x.projeto;
    console.log(`  ${p.numero}. ${p.nome} — ${p.porte}, ${p.duracao} meses (${comp(p.inicio)} a ${comp(fimDoProjeto(p))}), ${p.situacao.replace(/_/g, " ")}`);
    console.log(`     contrato ${brl(valorOriginal(p) + (p.aditivo?.valor ?? 0))}${p.aditivo ? ` (original ${brl(valorOriginal(p))} + aditivo ${brl(p.aditivo.valor)})` : ""}; equipe ${p.clt.length} CLT + ${p.terceiros.length} terceiros; ${p.fases.length} fases, ${p.fases.reduce((a, f) => a + f.atividades.length, 0)} atividades`);
    console.log(`     Budget: receita ${brl(x.orcamento.receita)}, custo ${brl(x.orcamento.custo)} · Forecast: receita ${brl(x.previsao.receita)}, custo ${brl(x.previsao.custo)} (realizado ${brl(x.realizadoAteHoje)} + a realizar ${brl(x.previstoParaConcluir)})`);
    console.log(`     desvio de custo ${brl(x.previsao.custo - x.orcamento.custo)} · margem projetada ${brl(x.previsao.receita - x.previsao.custo)} (${(((x.previsao.receita - x.previsao.custo) / x.previsao.receita) * 100).toFixed(1)}%)`);
  }
  const tot = (f: (x: Conferencia) => number) => soma(conferencias.map(f));
  console.log(`  TOTAL — Budget: receita ${brl(tot((x) => x.orcamento.receita))}, custo ${brl(tot((x) => x.orcamento.custo))} · Forecast: receita ${brl(tot((x) => x.previsao.receita))}, custo ${brl(tot((x) => x.previsao.custo))} · margem de referência ${brl(tot((x) => x.previsao.receita - x.previsao.custo))}`);
  console.log(`\nLogin: ${email}`);
  if (senha) console.log(`Senha inicial (mostrada só agora; troca obrigatória no 1º acesso): ${senha}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof FalhaDoSeed ? `Falha no seed: ${err.message}` : err);
    process.exit(1);
  });

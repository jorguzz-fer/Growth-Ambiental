import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  bigint,
  pgEnum,
  uuid,
  numeric,
  boolean,
  jsonb,
  unique,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";
import type { PaymentPlan } from "@/lib/calc/types";

/*
 * Schema da Fase 0 — Scaffold.
 *
 * Contém apenas as tabelas necessárias para Auth.js (NextAuth v5) com adapter
 * Drizzle, mais o esqueleto de multi-tenancy (tenants + memberships) para
 * ancorar o RBAC. O modelo de domínio completo (projetos, versões, unidades,
 * plano de pagamento, despesas, fornecedores, contas) entra na Fase 1.
 * Ver docs/SPEC.md §3 e docs/STACK.md §7.
 */

/** Papéis de acesso do tenant (ver docs/STACK.md §2 - Autenticação). */
export const roleEnum = pgEnum("role", [
  "owner",
  "admin",
  "membro",
  "contador", // somente leitura (acesso contabilidade)
  "engenheiro", // acesso apenas ao Lançamento de Medição
]);

// ───────────────────────────── Auth.js ──────────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  /** hash da senha (login por credenciais; scrypt). */
  passwordHash: text("password_hash"),
  /** segredo TOTP (base32) para MFA. */
  mfaSecret: text("mfa_secret"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  /** senha definida por outra pessoa: o dono troca antes de usar (AI 1.1). */
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  /** última troca/redefinição: sessões abertas antes deixam de valer (AI 1.3). */
  passwordChangedAt: timestamp("password_changed_at", { mode: "date" }),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ────────────────────────── Multi-tenancy ───────────────────────────

/**
 * Empresa cliente (incorporadora). Ver docs/SPEC.md §1.
 *
 * O bloco fiscal existe para a EMISSÃO de nota (ver docs/EMISSAO-NF.md): são os
 * dados do prestador que a prefeitura exige na NFS-e e que o provedor de
 * emissão exige no cadastro da empresa. Todos NULÁVEIS — tenant que não emite
 * nota segue funcionando sem preencher nada, e `checarProntidaoFiscal`
 * (src/lib/calc/emitente-fiscal.ts) é quem diz se já dá para emitir.
 *
 * O token do provedor NÃO mora aqui: credencial de emissão vale dinheiro e vai
 * em variável de ambiente/secret, não em coluna de banco lida por toda query de
 * tenant.
 */
export const tenants = pgTable("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** razão social — é o que vai no corpo da nota. */
  name: text("name").notNull(),
  /** chave do logo no storage R2. */
  logoKey: text("logo_key"),
  // ── Identificação fiscal do emitente ───────────────────────────────────
  nomeFantasia: text("nome_fantasia"),
  /** aceita CNPJ alfanumérico (IN RFB 2.229/2024). Gravado sem máscara. */
  cnpj: text("cnpj"),
  inscricaoMunicipal: text("inscricao_municipal"),
  inscricaoEstadual: text("inscricao_estadual"),
  /** SIMPLES | SIMPLES_EXCESSO | LUCRO_PRESUMIDO | LUCRO_REAL | MEI. */
  regimeTributario: text("regime_tributario"),
  /** regime especial da nota (1..6), quando o município exigir. */
  regimeEspecial: text("regime_especial"),
  /** item da lista da LC 116/2003 — 7.02 / 7.05 na construção civil. */
  itemListaServico: text("item_lista_servico"),
  codigoTributarioMunicipio: text("codigo_tributario_municipio"),
  cnae: text("cnae"),
  /** alíquota de ISS em % (até 4 casas: alguns municípios usam). */
  aliquotaIss: numeric("aliquota_iss", { precision: 8, scale: 4 }),
  // ── Endereço do prestador ──────────────────────────────────────────────
  logradouro: text("logradouro"),
  numeroEndereco: text("numero_endereco"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  /** código IBGE de 7 dígitos — é assim que a API identifica o município. */
  codigoMunicipio: text("codigo_municipio"),
  municipio: text("municipio"),
  uf: text("uf"),
  cep: text("cep"),
  telefone: text("telefone"),
  emailFiscal: text("email_fiscal"),
  /** ambiente de emissão: "homologacao" (padrão) | "producao". */
  fiscalAmbiente: text("fiscal_ambiente").notNull().default("homologacao"),
  // ── Alertas do Resumo Executivo (BAE-1, migração 0065) ─────────────────
  /** desvio de custo: alerta quando passa deste % E de `alertaDesvioValor`. */
  alertaDesvioPct: numeric("alerta_desvio_pct", { precision: 6, scale: 2 }).notNull().default("10"),
  alertaDesvioValor: numeric("alerta_desvio_valor", { precision: 15, scale: 2 }).notNull().default("5000"),
  /** recebível vencido há mais destes dias entra no bloco Atenção. */
  alertaVencidoDias: integer("alerta_vencido_dias").notNull().default(15),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Vínculo usuário ⇄ tenant com papel (RBAC). */
export const memberships = pgTable(
  "membership",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("membro"),
    /**
     * Permissões granulares (override do perfil/role): matriz tela → ações
     * {ver,criar,editar,excluir}. Null = usa os defaults do role.
     * Ver src/lib/permissions.ts.
     */
    permissions: jsonb("permissions").$type<
      Record<string, { ver: boolean; criar: boolean; editar: boolean; excluir: boolean }>
    >(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (m) => [primaryKey({ columns: [m.userId, m.tenantId] })],
);

// ─────────────────────────── Enums de domínio ───────────────────────────

/** Empreendimento (proj) ou escritório/filial (office). Ver docs/SPEC.md §3. */
export const projectKindEnum = pgEnum("project_kind", ["proj", "office"]);
export const projectStatusEnum = pgEnum("project_status", [
  "Em andamento",
  "Planejamento",
]);

/** Tipo de versão/cenário. Ver docs/SPEC.md §4. */
export const versionKindEnum = pgEnum("version_kind", [
  "budget",
  "forecast",
  "atual",
  "custom",
]);

export const unitStatusEnum = pgEnum("unit_status", [
  "Disponivel",
  "Reservado",
  "Vendido",
  "Permutado",
]);

/** Tipo do item comercializável: unidade individual ou condomínio inteiro. */
export const unitItemTypeEnum = pgEnum("unit_item_type", ["unidade", "condominio"]);

export const stakeholderTypeEnum = pgEnum("stakeholder_type", ["PJ", "PF"]);

export const bankAccountTypeEnum = pgEnum("bank_account_type", [
  "Imobiliária",
  "Construtora",
  // Conta de TERCEIRO (sócio, mestre de obra, funcionário): controla o valor
  // devido a essa pessoa. NÃO é saldo bancário disponível da empresa e por isso
  // é excluída do saldo consolidado do caixa.
  "Terceiros",
]);

/** Origem do subitem do plano de contas. Ver docs/SPEC.md §8.3. */
export const accountKindEnum = pgEnum("account_kind", ["cef", "complementar"]);

/** As 7 categorias da DRE. Ver docs/SPEC.md §8.3. */
export const dreCategoryEnum = pgEnum("dre_category", [
  "Receita",
  "Custo Variável",
  "Custo Fixo",
  "Despesa Variável",
  "Despesa Fixa",
  "Retiradas",
  "Investimento",
  "Empréstimos",
  "Despesas Financeiras",
]);

// ──────────────────────── Projetos & versões ────────────────────────

/** Empreendimento ou escritório do tenant. */
export const projects = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: projectKindEnum("kind").notNull().default("proj"),
  status: projectStatusEnum("status").notNull().default("Planejamento"),
  /**
   * Situação cadastral — "Ativo" | "Finalizado" (Prompt A, 2). Nula = ainda
   * não classificado. NÃO é seleção nem contexto, e nenhuma consulta filtra
   * por ela sem o usuário pedir. Independente de `status` (fase da obra).
   */
  situacao: text("situacao").$type<"Ativo" | "Finalizado">(),
  /** Duração planejada do empreendimento, em meses. */
  durationMonths: integer("duration_months"),
  /** Datas de início e fim da obra ("MM/DD/YYYY", como no restante do app). */
  startDate: text("start_date"),
  endDate: text("end_date"),
  /**
   * Período de planejamento (competências "MM/YYYY"). É a fonte OFICIAL das
   * colunas mensais do Budget e do Forecast — o período não é editável nessas
   * telas, vem daqui. Ver docs/SPEC (Planejamento §2).
   */
  mesInicial: text("mes_inicial"),
  mesFinal: text("mes_final"),
  /**
   * Cliente da obra (lista fechada). NULL = empreendimento próprio da
   * construtora/incorporadora (tenant), que comercializará as unidades.
   */
  clienteId: uuid("cliente_id").references((): AnyPgColumn => clientes.id, {
    onDelete: "set null",
  }),
  // ── Custo do terreno / valor global (visão econômica × financeira) ──────
  /** Custo de construção (obra) e custo de aquisição do terreno. */
  custoConstrucao: numeric("custo_construcao", { precision: 15, scale: 2 }),
  custoTerreno: numeric("custo_terreno", { precision: 15, scale: 2 }),
  /** Valor de venda da construção e do terreno (compõem o valor global). */
  valorConstrucao: numeric("valor_construcao", { precision: 15, scale: 2 }),
  valorTerreno: numeric("valor_terreno", { precision: 15, scale: 2 }),
  /** Forma de pagamento e proprietário do terreno. */
  formaPagamentoTerreno: text("forma_pagamento_terreno"),
  proprietarioTerreno: text("proprietario_terreno"),
  /**
   * Composição do funding da obra (indicador "Recursos próprios" do Budget).
   * Valores informados no cadastro (não é fórmula calculada).
   */
  financiamentoConstrucao: numeric("financiamento_construcao", { precision: 15, scale: 2 }),
  financiamentoTerreno: numeric("financiamento_terreno", { precision: 15, scale: 2 }),
  recursosProprios: numeric("recursos_proprios", { precision: 15, scale: 2 }),
  /**
   * Terreno pago direto ao proprietário (não passa pelo caixa da construtora).
   * Quando true, o valor do terreno compõe a visão econômica/global, mas NÃO é
   * lançado no caixa da construtora.
   */
  terrenoForaCaixa: boolean("terreno_fora_caixa").notNull().default(true),
  // ── Localização da obra (controle de ponto georreferenciado) ────────────
  endereco: text("endereco"),
  /** CEP da obra (Prompt B, 17) — só dígitos ou "00000-000"; apresentação. */
  cep: text("cep"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  // ── Dados fiscais da obra (emissão de NFS-e) ────────────────────────────
  // Na construção civil o ISS é devido no município da OBRA (LC 116/2003,
  // art. 3º, III), que nem sempre é o da sede. Por isso o município de
  // incidência sai do projeto e não do tenant. Opcionais: projeto que não
  // fatura serviço nunca precisa deles.
  /** código IBGE (7 dígitos) do município onde a obra é executada. */
  codigoMunicipioObra: text("codigo_municipio_obra"),
  municipioObra: text("municipio_obra"),
  ufObra: text("uf_obra"),
  /** matrícula CNO/CEI da obra — vai no campo `codigo_obra` da NFS-e. */
  codigoObra: text("codigo_obra"),
  /** número da ART/RRT do responsável técnico. */
  art: text("art"),
  /** raio permitido para registro de ponto, em metros (padrão 100). */
  pontoRaioMetros: integer("ponto_raio_metros").notNull().default(100),
  // ── Medição / BDI / provisionamento (ver docs/BDI-PROVISIONAMENTO.md) ───
  // Todos OPCIONAIS: projetos existentes seguem funcionando sem preenchê-los.
  /** CUB de referência (R$/m²) e metragem — custo referencial = CUB × metragem. */
  cub: numeric("cub", { precision: 15, scale: 2 }),
  metragem: numeric("metragem", { precision: 12, scale: 2 }),
  /** Parcela de referência do caixa (base do cálculo de E.V.O). */
  parcelaReferencia: numeric("parcela_referencia", { precision: 15, scale: 2 }),
  /**
   * Percentual de BDI do projeto. CONFIGURÁVEL — a alíquota varia conforme o
   * tipo de executor da obra e não é presumida pelo sistema. A planilha de
   * referência do cliente traz 6% para "Profissional Autônomo"; a regra para
   * construtora depende de confirmação e por isso não há valor padrão.
   */
  pctBdi: numeric("pct_bdi", { precision: 8, scale: 4 }),
  /** Executor da obra — "Profissional Autônomo" | "Construtora" (texto livre). */
  tipoExecutor: text("tipo_executor"),
  /** Percentual de taxas incidentes sobre a liberação (ex.: 1,5). */
  pctTaxaLiberacao: numeric("pct_taxa_liberacao", { precision: 8, scale: 4 }),
  /**
   * Tipo de obra: regras e nomenclaturas de construção individual e de
   * empreendimento não devem ser reaproveitadas automaticamente entre si.
   */
  tipoObra: text("tipo_obra"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Registro de ponto georreferenciado, vinculado à obra. Cada dia trabalhado
 * fica vinculado à obra correspondente (base da apuração → conta a pagar).
 */
export const timeEntries = pgTable("time_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  /** nome/e-mail do funcionário (snapshot). */
  funcionario: text("funcionario"),
  /** "entrada" | "saida" */
  tipo: text("tipo").notNull(),
  /** data ("MM/DD/YYYY") e hora ("HH:MM") pelo relógio do servidor. */
  data: text("data").notNull(),
  hora: text("hora").notNull(),
  serverAt: timestamp("server_at", { mode: "date" }).notNull().defaultNow(),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  /** precisão informada pelo dispositivo (m) e distância à obra (m). */
  precisaoMetros: integer("precisao_metros"),
  distanciaMetros: integer("distancia_metros"),
  dentroRaio: boolean("dentro_raio").notNull().default(false),
  dispositivo: text("dispositivo"),
  justificativa: text("justificativa"),
  /** despesa (conta a pagar) gerada a partir deste registro, se houver. */
  despesaId: uuid("despesa_id").references(() => despesas.id, {
    onDelete: "set null",
  }),
});

/**
 * Versão/cenário de planejamento de um projeto. Cada versão isola seus dados
 * de movimento (units, permutas, reembolsos, caixa, despesas). Limite de 6 por
 * projeto (3 fixas + 3 customizadas). Ver docs/SPEC.md §4.
 */
export const versions = pgTable(
  "version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** chave estável: "budget" | "forecast" | "atual" | slug da customizada */
    key: text("key").notNull(),
    kind: versionKindEnum("kind").notNull(),
    label: text("label").notNull(),
    color: text("color").notNull(),
    /**
     * Prompt AP: deixou de ser escrita pela interface (setDefaultVersion saiu
     * com /versao). Só nasce na criação do projeto. Continua LIDA: o contexto
     * (depois da Atual) e o Orçamento do card Orçado x Realizado
     * (dre-inputs.ts). Nenhum valor gravado foi alterado.
     */
    isDefault: boolean("is_default").notNull().default(false),
    /**
     * congelada: bloqueia lançamentos/edições. Prompt AP: escrita por
     * `travarVersao` (permissão `versaotrava`), nas telas de Orçamentos,
     * Previsão e Projetos — não mais em /versao.
     */
    locked: boolean("locked").notNull().default(false),
    /** status do workflow da versão: "Rascunho" | "Concluído" | "Aprovado". */
    status: text("status").notNull().default("Rascunho"),
    /**
     * Versão de Budget que originou este Forecast (rastreabilidade/comparação).
     * NULL para Budget/Atual ou Forecast sem origem. O Forecast é um snapshot
     * independente — esta referência NÃO o mantém sincronizado com o Budget.
     */
    sourceVersionId: uuid("source_version_id").references(
      (): AnyPgColumn => versions.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (v) => [unique("version_project_key_uq").on(v.projectId, v.key)],
);

// ─────────────────────────────── Unidades ───────────────────────────────

/**
 * Unidade (imóvel) de uma versão. O plano de pagamento em cascata é guardado
 * como JSONB (`payment_plan`) — agregado sempre lido/gravado por inteiro e
 * consumido 1:1 pela lógica de cálculo (src/lib/calc). Ver docs/SPEC.md §3 e §5.
 */
export const units = pgTable("unit", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => versions.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  bloco: text("bloco"),
  tipo: text("tipo"),
  m2: numeric("m2", { precision: 8, scale: 2 }),
  andar: integer("andar"),
  /** VGV da unidade. */
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  status: unitStatusEnum("status").notNull().default("Disponivel"),
  /** Item comercializável: unidade individual (default) ou condomínio inteiro. */
  itemType: unitItemTypeEnum("item_type").notNull().default("unidade"),
  /** "MM/DD/YYYY" como no protótipo. */
  mesVenda: text("mes_venda"),
  paymentPlan: jsonb("payment_plan").$type<PaymentPlan>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  /** Um código por versão (Prompt J, 4.1) — migração 0046. */
  uniqueIndex("unit_version_code_uq").on(t.versionId, t.code),
]);

/** Inventário de ativos recebidos em permuta. Ver docs/SPEC.md §3 e §7.4. */
export const permutas = pgTable("permuta", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => versions.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** código da unidade vinculada (ex.: "BLA 401"). */
  unitCode: text("unit_code"),
  cliente: text("cliente"),
  dataRecebimento: text("data_recebimento"),
  tipo: text("tipo"),
  descricao: text("descricao"),
  estimado: numeric("estimado", { precision: 15, scale: 2 }),
  status: text("status"),
  dataVenda: text("data_venda"),
  valorVenda: numeric("valor_venda", { precision: 15, scale: 2 }),
  tipoPermuta: text("tipo_permuta"),
  /** revenda do bem recebido: "avista" | "parcelada" | "escambo". */
  formaVenda: text("forma_venda"),
  /** nº de parcelas (revenda parcelada). */
  parcelas: integer("parcelas"),
  /** periodicidade das parcelas: "mensal" | "semestral" | "anual". */
  periodicidade: text("periodicidade"),
  /** vencimento da 1ª parcela "MM/DD/YYYY". */
  dataPrimParcela: text("data_prim_parcela"),
  obs: text("obs"),
  /**
   * Prompt P, 3.6: cliente por id (0049). A coluna "cliente" (nome) continua
   * preenchida; registros antigos só têm o nome e seguem exibindo o nome.
   */
  clienteId: uuid("cliente_id").references((): AnyPgColumn => clientes.id, {
    onDelete: "set null",
  }),
  /** Cancelamento lógico (Prompt P, 2.3): o ativo fica legível, sai dos totais, da receita e do caixa. */
  cancelado: boolean("cancelado").notNull().default(false),
  canceladoEm: text("cancelado_em"),
  canceladoPor: text("cancelado_por"),
  motivoCancelamento: text("motivo_cancelamento"),
}, (t) => [
  // Desempenho da DRE (27/10/2026, PR 2): a consulta por versionId lia a tabela inteira.
  index("permuta_version_idx").on(t.versionId),
]);

/** Reembolsos da versão. Ver docs/SPEC.md §3 e §7.3. */
export const reembolsos = pgTable("reembolso", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => versions.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** data REAL "MM/DD/YYYY". */
  data: text("data"),
  origem: text("origem"),
  valor: numeric("valor", { precision: 15, scale: 2 }),
  pct: text("pct"),
  obs: text("obs"),
  serial: integer("serial"),
  status: text("status"),
  /** Cancelamento lógico (Prompt O, 4.2): a liberação fica legível, sai dos totais, do caixa e da projeção. */
  cancelado: boolean("cancelado").notNull().default(false),
  canceladoEm: text("cancelado_em"),
  canceladoPor: text("cancelado_por"),
  motivoCancelamento: text("motivo_cancelamento"),
}, (t) => [
  // Desempenho da DRE (27/10/2026, PR 2): a consulta por versionId lia a tabela inteira.
  index("reembolso_version_idx").on(t.versionId),
]);

// ─────────────────── Fornecedores / contas / despesas ───────────────────

/** Stakeholder global do tenant (compartilhado entre versões). §3 e §8.2 */
export const stakeholders = pgTable("stakeholder", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: stakeholderTypeEnum("tipo").notNull().default("PJ"),
  doc: text("doc"),
  /** múltiplos papéis (ver PAPEIS_STAKEHOLDER em src/lib/calc/constants). */
  papeis: text("papeis").array().notNull().default([]),
  email: text("email"),
  tel: text("tel"),
  obs: text("obs"),
  // Dados complementares (cadastro inteligente por imagem/PDF). Todos opcionais
  // e retrocompatíveis; `nome` segue sendo a razão social / nome principal.
  nomeFantasia: text("nome_fantasia"),
  contato: text("contato"),
  whatsapp: text("whatsapp"),
  site: text("site"),
  endereco: text("endereco"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  // Prompt T, BT-2 — dados de recebimento do pagador terceiro (ressarcir é
  // transferir). Sensíveis: só na tela; nunca no assistente nem em claro no log.
  bancoNome: text("banco_nome"),
  bancoAgencia: text("banco_agencia"),
  bancoConta: text("banco_conta"),
  bancoTipoConta: text("banco_tipo_conta"),
  bancoTitular: text("banco_titular"),
  pixTipo: text("pix_tipo"),
  pixChave: text("pix_chave"),
  /** cadastro ativo? Inativação lógica preserva histórico e vínculos. */
  ativo: boolean("ativo").notNull().default(true),
});

/** Conta bancária do tenant, com campos preparados para Open Finance. §3 */
export const bankAccounts = pgTable("bank_account", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  banco: text("banco").notNull(),
  ag: text("ag"),
  op: text("op"),
  cc: text("cc"),
  tipo: bankAccountTypeEnum("tipo").notNull().default("Construtora"),
  /** saldo atual da conta — rastreado (Open Finance/extrato) ou manual. */
  saldo: numeric("saldo", { precision: 15, scale: 2 }).notNull().default("0"),
  /** como o saldo é atualizado: "manual" ou "auto" (Open Finance/extrato). */
  saldoSource: text("saldo_source").notNull().default("manual"),
  openFinanceId: text("open_finance_id"),
  lastSync: timestamp("last_sync", { mode: "date" }),
  /** Prompt X, 3.2 — inativa fica no cadastro e sai do saldo total. */
  ativo: boolean("ativo").notNull().default(true),
});

/**
 * Subitem do plano de contas (dupla classificação CEF/complementar). Registro
 * por tenant, derivado de PLANO_CONTAS. Ver docs/SPEC.md §8.3.
 */
export const chartAccounts = pgTable(
  "chart_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** código do subitem (ex.: "1.1", "T.3"). */
    code: text("code").notNull(),
    name: text("name").notNull(),
    /** código do grupo pai (ex.: "1", "T"). */
    groupCode: text("group_code").notNull(),
    groupName: text("group_name").notNull(),
    kind: accountKindEnum("kind").notNull(),
    /**
     * Natureza da conta no planejamento: "receita" ou "despesa". Define em qual
     * bloco (Receitas/Despesas) do Budget/Forecast a conta aparece. Padrão
     * "despesa" (o plano de contas existente é orientado a despesa).
     */
    natureza: text("natureza").notNull().default("despesa"),
    /** Conta ativa: inativas não aparecem em novos lançamentos, mas ficam no histórico. */
    ativo: boolean("ativo").notNull().default(true),
    /**
     * Prompt DP: a categoria da DRE escolhida para a conta. NULL = o padrão de
     * boa prática (`categoriaPadraoDaConta`): conta sem categoria não existe.
     */
    dreCategory: dreCategoryEnum("dre_category"),
  },
  (c) => [unique("chart_account_tenant_code_uq").on(c.tenantId, c.code)],
);

/** Lançamento de despesa por versão (competência + dupla classificação). §8.1 */
export const despesas = pgTable("despesa", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => versions.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** nº de documento interno (ex.: BMV-2026-001682). */
  numDoc: text("num_doc"),
  fornecedorId: uuid("fornecedor_id").references(() => stakeholders.id, {
    onDelete: "set null",
  }),
  bancoId: uuid("banco_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  /** subitem CEF/plano de contas (ex.: "1.1"). */
  contaCef: text("conta_cef"),
  categoriaDre: dreCategoryEnum("categoria_dre"),
  competencia: text("competencia"),
  vencimento: text("vencimento"),
  dataCaixa: text("data_caixa"),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status"),
  obs: text("obs"),
  // ── Fase 2: forma e condição de pagamento ──
  formaPagamento: text("forma_pagamento"),
  formaPagamentoDesc: text("forma_pagamento_desc"),
  condicaoPagamento: text("condicao_pagamento"),
  qtdParcelas: integer("qtd_parcelas"),
  dataEmissao: text("data_emissao"),
  // boleto
  boletoLinhaDigitavel: text("boleto_linha_digitavel"),
  boletoCodigoBarras: text("boleto_codigo_barras"),
  boletoBanco: text("boleto_banco"),
  // cheque
  chequeNumero: text("cheque_numero"),
  chequeBanco: text("cheque_banco"),
  chequeAg: text("cheque_ag"),
  chequeConta: text("cheque_conta"),
  chequeEmitente: text("cheque_emitente"),
  chequeDataEmissao: text("cheque_data_emissao"),
  chequeDataCompensacao: text("cheque_data_compensacao"),
  chequeStatus: text("cheque_status"),
  /** Fase 4: despesa paga por terceiro (não gera saída de caixa na competência). */
  pagoPorTerceiro: boolean("pago_por_terceiro").notNull().default(false),
  /** Prompt U — compra no cartão de crédito: a saída de caixa é da fatura, não da compra. */
  cartaoId: uuid("cartao_id").references(() => cartoesCredito.id, { onDelete: "set null" }),
  /** Cancelamento lógico: mantém histórico, sai de saldos/relatórios. */
  cancelado: boolean("cancelado").notNull().default(false),
  canceladoEm: text("cancelado_em"),
  canceladoPor: text("cancelado_por"),
  motivoCancelamento: text("motivo_cancelamento"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  // Desempenho da DRE (27/10/2026, PR 2): a consulta por versionId lia a tabela inteira.
  index("despesa_version_idx").on(t.versionId),
]);

/**
 * Despesa paga por terceiro com restituição posterior (Fase 4). A despesa é
 * reconhecida 1× na DRE (competência); esta tabela registra a OBRIGAÇÃO da
 * empresa com quem desembolsou. A saída de caixa ocorre só nas restituições.
 */
/**
 * Cartão de crédito da empresa (Prompt U, seção 1). Cadastro próprio:
 * bandeira, ciclo (dia de fechamento e de vencimento), limite, conta que
 * debita a fatura e taxa de rotativo opcional (BU-3). Guarda SOMENTE os
 * quatro últimos dígitos — não há coluna para o número completo.
 */
export const cartoesCredito = pgTable("cartao_credito", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  apelido: text("apelido").notNull(),
  bandeira: text("bandeira"),
  ultimos4: text("ultimos4"),
  titular: text("titular"),
  limite: numeric("limite", { precision: 15, scale: 2 }),
  diaFechamento: integer("dia_fechamento").notNull(),
  diaVencimento: integer("dia_vencimento").notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, { onDelete: "set null" }),
  /** % ao mês; nula = sem taxa definida, a tela não projeta juro (BU-3). */
  taxaRotativo: numeric("taxa_rotativo", { precision: 8, scale: 4 }),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  /** Prompt AT §1-B.4 — id da conta de cartão na Pluggy (Open Finance). */
  openFinanceId: text("open_finance_id"),
});

/**
 * Fatura de cartão (Prompt U, seção 2): uma por cartão e data de fechamento.
 * O valor NÃO é gravado: é a soma das parcelas vinculadas (2.8), e o estado
 * (aberta/fechada/paga) é derivado das datas e dos pagamentos — a mesma linha
 * muda de prevista para firme sem nascer uma segunda (2.9).
 */
export const faturasCartao = pgTable(
  "fatura_cartao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    cartaoId: uuid("cartao_id")
      .notNull()
      .references(() => cartoesCredito.id, { onDelete: "cascade" }),
    /** "MM/DD/YYYY" — dia em que o ciclo fecha. */
    fechamento: text("fechamento").notNull(),
    /** "MM/DD/YYYY" — dia em que a fatura vence. */
    vencimento: text("vencimento").notNull(),
    /** 3.4 — a despesa financeira criada quando o juro do rotativo veio cobrado nesta fatura. */
    jurosDespesaId: uuid("juros_despesa_id").references(() => despesas.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fatura_cartao_ciclo_uq").on(t.cartaoId, t.fechamento)],
);

/**
 * Pagamento de fatura de cartão (Prompt U, seção 3): UMA saída de caixa por
 * pagamento, na conta cadastrada no cartão; parcial deixa saldo rotativo.
 * Não cria despesa (3.2). Idempotente pela chave (3.5).
 */
export const faturaPagamentos = pgTable("fatura_pagamento", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  faturaId: uuid("fatura_id")
    .notNull()
    .references(() => faturasCartao.id, { onDelete: "cascade" }),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
  /** "MM/DD/YYYY" */
  data: text("data").notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  cashEntryId: uuid("cash_entry_id").references(() => cashEntries.id, { onDelete: "set null" }),
  idempotencyKey: text("idempotency_key"),
  usuarioId: text("usuario_id"),
  obs: text("obs"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Extrato do cartão (Prompt U, seção 5): só o registro do arquivo subido,
 * para conferência. `importHash` evita duplicar o mesmo extrato (5.3).
 * Valor positivo = compra; negativo = crédito/estorno. Nada aqui lança
 * despesa (5.4).
 */
export const extratoCartao = pgTable("extrato_cartao", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  cartaoId: uuid("cartao_id")
    .notNull()
    .references(() => cartoesCredito.id, { onDelete: "cascade" }),
  importHash: text("import_hash"),
  data: text("data"),
  descricao: text("descricao"),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  /** Prompt AT §6.1 — a compra lançada no cartão com que a linha foi conciliada. */
  despesaId: uuid("despesa_id").references(() => despesas.id, { onDelete: "set null" }),
  conciliadoPor: text("conciliado_por"),
  conciliadoEm: timestamp("conciliado_em"),
  /** Prompt AT §1-B.6 — id da transação no Open Finance; único por cartão. */
  externalId: text("external_id"),
}, (r) => [uniqueIndex("extrato_cartao_externo_uq").on(r.cartaoId, r.externalId).where(sql`${r.externalId} is not null`)]);

/**
 * Estorno de compra no cartão (Prompt U, seção 6): lançamento PRÓPRIO que
 * reduz a fatura; a compra original não é apagada nem editada (6.2). Nasce
 * "antecipado" (o usuário sabe da devolução) ou "extrato" (o crédito veio no
 * extrato). O crédito de um antecipado é reconhecido quando o extrato chega
 * (`extratoItemId`), sem segundo estorno (6.3). É aplicado no pagamento da
 * fatura (`aplicadoEm`).
 */
export const estornosCartao = pgTable("estorno_cartao", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  cartaoId: uuid("cartao_id")
    .notNull()
    .references(() => cartoesCredito.id, { onDelete: "cascade" }),
  despesaId: uuid("despesa_id").references(() => despesas.id, { onDelete: "set null" }),
  faturaId: uuid("fatura_id").references(() => faturasCartao.id, { onDelete: "set null" }),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
  data: text("data"),
  origem: text("origem").notNull().default("antecipado"),
  extratoItemId: uuid("extrato_item_id").references(() => extratoCartao.id, { onDelete: "set null" }),
  aplicadoEm: text("aplicado_em"),
  faturaPagamentoId: uuid("fatura_pagamento_id").references(() => faturaPagamentos.id, { onDelete: "set null" }),
  obs: text("obs"),
  usuarioId: text("usuario_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Vínculo com valor entre um movimento do extrato e uma despesa (Prompt L,
 * Parte 2). N:N: um movimento quita várias despesas; uma despesa recebe
 * vários movimentos. O `pagamentoId` é o registro de pagamento que o vínculo
 * gerou (saldo real §15). Desfazer é estorno lógico (`desfeito`). As quatro
 * colunas antigas de `cashEntries` continuam gravadas (2.8).
 */
export const conciliacoesDespesa = pgTable("conciliacao_despesa", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  cashEntryId: uuid("cash_entry_id")
    .notNull()
    .references(() => cashEntries.id, { onDelete: "cascade" }),
  despesaId: uuid("despesa_id")
    .notNull()
    .references(() => despesas.id, { onDelete: "cascade" }),
  pagamentoId: uuid("pagamento_id").references(() => pagamentos.id, { onDelete: "set null" }),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
  /** "manual" (tela), "importacao" (correspondência inequívoca, 2.7) ou "assistente" (proposta confirmada). */
  origem: text("origem").notNull().default("manual"),
  criadoPor: text("criado_por"),
  criadoEm: timestamp("criado_em").notNull().defaultNow(),
  desfeito: boolean("desfeito").notNull().default(false),
  desfeitoEm: text("desfeito_em"),
  desfeitoPor: text("desfeito_por"),
  motivoDesfazer: text("motivo_desfazer"),
});

export const despesaTerceiros = pgTable("despesa_terceiro", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  despesaId: uuid("despesa_id")
    .notNull()
    .references(() => despesas.id, { onDelete: "cascade" }),
  /** quem desembolsou o dinheiro (consultora/sócio/funcionário/empresa). */
  pagadorTerceiroId: uuid("pagador_terceiro_id").references(() => stakeholders.id, {
    onDelete: "set null",
  }),
  /** empresa/projeto responsável pela obrigação. */
  empresaResponsavelId: uuid("empresa_responsavel_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  valorTotal: numeric("valor_total", { precision: 15, scale: 2 }).notNull().default("0"),
  valorRestituido: numeric("valor_restituido", { precision: 15, scale: 2 }).notNull().default("0"),
  dataPagamentoOriginal: text("data_pagamento_original"),
  dataPrevistaRestituicao: text("data_prevista_restituicao"),
  /**
   * Aguardando restituição | Parcialmente restituído | Restituído | Cancelado
   *
   * "Aguardando restituição" é o valor histórico e continua sendo gravado —
   * nenhum registro antigo é reclassificado. Na interface ele é exibido como
   * "Pendente" (ver `rotuloStatusObrigacao`), que é o vocabulário pedido.
   */
  status: text("status").notNull().default("Aguardando restituição"),
  obs: text("obs"),
  /**
   * Chave de idempotência (§16): duas submissões do MESMO fato (duplo clique,
   * reenvio de formulário, refresh) colidem aqui em vez de criar duas
   * obrigações. Nulo nos registros anteriores à trava — por isso o índice é
   * parcial (WHERE NOT NULL).
   */
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Restituição (parcial ou integral) de uma despesa paga por terceiro. Fase 4. */
export const restituicoes = pgTable("restituicao", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  despesaTerceiroId: uuid("despesa_terceiro_id")
    .notNull()
    .references(() => despesaTerceiros.id, { onDelete: "cascade" }),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  dataRestituicao: text("data_restituicao"),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  comprovante: text("comprovante"),
  obs: text("obs"),
  /**
   * Item do extrato que pagou esta restituição (§14). A conciliação vincula o
   * pagamento ao lançamento do extrato SEM criar nova despesa: a despesa já foi
   * reconhecida na competência original.
   */
  cashEntryId: uuid("cash_entry_id").references((): AnyPgColumn => cashEntries.id, {
    onDelete: "set null",
  }),
  /** Chave de idempotência (§16) — ver `despesaTerceiros.idempotencyKey`. */
  idempotencyKey: text("idempotency_key"),
  usuarioId: text("usuario_id").references(() => users.id, { onDelete: "set null" }),
  /**
   * Cancelamento lógico (Prompt I, §24): a restituição cancelada sai dos
   * saldos e fica no histórico, com quem, quando e por quê. Antes era DELETE.
   */
  cancelada: boolean("cancelada").notNull().default(false),
  canceladaEm: text("cancelada_em"),
  canceladaPor: text("cancelada_por"),
  motivoCancelamento: text("motivo_cancelamento"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Documento fiscal de uma despesa — item 1.2 / RG-06.
 *
 * Separado da despesa de propósito: o PED é numeração INTERNA da empresa, e o
 * número da nota é do emitente. Os dois coexistem e nunca se substituem. A nota
 * costuma chegar depois do lançamento, então tudo aqui é opcional e a linha só
 * nasce quando há o que registrar — uma despesa sem documento simplesmente não
 * tem linha nesta tabela.
 *
 * É 1:N: uma compra pode ter mais de um documento (nota + recibo complementar).
 */
export const documentosFiscais = pgTable("documento_fiscal", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  despesaId: uuid("despesa_id")
    .notNull()
    .references(() => despesas.id, { onDelete: "cascade" }),
  /** NFE | NFSE | NFCE | RECIBO | CUPOM | CONTRATO | SEM_DOC */
  tipo: text("tipo").notNull().default("SEM_DOC"),
  numero: text("numero"),
  serie: text("serie"),
  /** chave de acesso da NF-e: 44 dígitos, validada quando preenchida. */
  chaveAcesso: text("chave_acesso"),
  dataEmissao: text("data_emissao"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Recebimento de um cliente feito POR UM TERCEIRO em nome da empresa — RG-02 e
 * RG-04.
 *
 * A receita já foi reconhecida na venda. Isto aqui é o trânsito do dinheiro: o
 * terceiro recebeu e ainda não repassou, então a empresa tem um ATIVO com ele
 * (`1.1.3 — Valores a Receber de Terceiros`). Nem o recebimento nem o repasse
 * tocam a DRE; reconhecer receita de novo aqui dobraria a receita da venda.
 *
 * Espelho de `despesaTerceiros`, do outro lado do balanço.
 */
export const recebimentosTerceiros = pgTable("recebimento_terceiro", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** quem recebeu o dinheiro do cliente em nome da empresa. */
  recebedorTerceiroId: uuid("recebedor_terceiro_id").references(() => stakeholders.id, {
    onDelete: "set null",
  }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  /** título de contas a receber que este recebimento baixa (quando houver). */
  contaReceberId: uuid("conta_receber_id").references((): AnyPgColumn => contasReceber.id, {
    onDelete: "set null",
  }),
  clienteId: uuid("cliente_id").references((): AnyPgColumn => clientes.id, {
    onDelete: "set null",
  }),
  unitCode: text("unit_code"),
  valorTotal: numeric("valor_total", { precision: 15, scale: 2 }).notNull().default("0"),
  valorRepassado: numeric("valor_repassado", { precision: 15, scale: 2 }).notNull().default("0"),
  dataRecebimento: text("data_recebimento"),
  dataPrevistaRepasse: text("data_prevista_repasse"),
  /** Aguardando repasse | Parcialmente repassado | Repassado | Cancelado */
  status: text("status").notNull().default("Aguardando repasse"),
  obs: text("obs"),
  /** Chave de idempotência: o mesmo fato reenviado não vira dois registros. */
  idempotencyKey: text("idempotency_key"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Repasse (parcial ou integral) de um recebimento feito por terceiro. RG-04. */
export const repasses = pgTable("repasse", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  recebimentoTerceiroId: uuid("recebimento_terceiro_id")
    .notNull()
    .references(() => recebimentosTerceiros.id, { onDelete: "cascade" }),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  dataRepasse: text("data_repasse"),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  /** item do extrato que trouxe o dinheiro (conciliação sem receita nova). */
  cashEntryId: uuid("cash_entry_id").references((): AnyPgColumn => cashEntries.id, {
    onDelete: "set null",
  }),
  comprovante: text("comprovante"),
  obs: text("obs"),
  idempotencyKey: text("idempotency_key"),
  usuarioId: text("usuario_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * ACERTO CONTÁBIL — Módulo 5.
 *
 * Um pagamento único que quita VÁRIAS despesas, possivelmente de obras
 * diferentes, com um único comprovante. É o caso real do cliente: pedidos
 * somando R$ 67.000 com o fornecedor, pagos com uma transferência de R$ 70.000
 * — a diferença sendo juros de atraso.
 *
 * A saída de caixa é UMA (RG-08). As despesas vinculadas viram "Pago". A
 * diferença vai para despesa/receita financeira do período, NUNCA rateada no
 * custo da obra (RG-07 / CPC 20).
 */
export const acertos = pgTable("acerto", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** PED próprio do acerto — é o documento entregue à contabilidade. */
  numDoc: text("num_doc"),
  dataPagamento: text("data_pagamento"),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  valorTransferido: numeric("valor_transferido", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  formaPagamento: text("forma_pagamento"),
  /** favorecido: fornecedor ou terceiro que recebeu a transferência. */
  favorecidoId: uuid("favorecido_id").references(() => stakeholders.id, {
    onDelete: "set null",
  }),
  /** comprovante ÚNICO, compartilhado por todos os PEDs vinculados. */
  comprovanteDocumentId: uuid("comprovante_document_id").references(
    (): AnyPgColumn => documents.id,
    { onDelete: "set null" },
  ),
  /** valor transferido − total vinculado. Positivo = juros; negativo = desconto. */
  diferencaValor: numeric("diferenca_valor", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  /** JUROS | DESCONTO | NENHUMA */
  diferencaTipo: text("diferenca_tipo").notNull().default("NENHUMA"),
  /** despesa gerada pela diferença financeira (quando houver). */
  diferencaDespesaId: uuid("diferenca_despesa_id").references(
    (): AnyPgColumn => despesas.id,
    { onDelete: "set null" },
  ),
  /** lançamento de caixa da saída única. */
  cashEntryId: uuid("cash_entry_id").references((): AnyPgColumn => cashEntries.id, {
    onDelete: "set null",
  }),
  obs: text("obs"),
  /** Estorno lógico: reabre as despesas e reverte caixa e diferença. */
  estornado: boolean("estornado").notNull().default(false),
  estornadoEm: text("estornado_em"),
  estornadoPor: text("estornado_por"),
  idempotencyKey: text("idempotency_key"),
  usuarioId: text("usuario_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Uma despesa abatida por um acerto, com o valor efetivamente abatido. */
export const acertoItens = pgTable("acerto_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  acertoId: uuid("acerto_id")
    .notNull()
    .references(() => acertos.id, { onDelete: "cascade" }),
  despesaId: uuid("despesa_id")
    .notNull()
    .references(() => despesas.id, { onDelete: "cascade" }),
  valorAbatido: numeric("valor_abatido", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  /** status da despesa ANTES do acerto — permite reabrir no estorno. */
  statusAnterior: text("status_anterior"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Rateio de um pagamento único entre obras — item 5.3.
 *
 * "Um PIX, várias obras, um comprovante": o pagamento gera um PED por obra
 * (custo correto por centro de custo) e a memória de cálculo fica anexada, que
 * é o documento que sustenta o custo por obra perante a contabilidade.
 */
export const rateiosObra = pgTable("rateio_obra", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** acerto que originou o rateio. */
  acertoId: uuid("acerto_id").references(() => acertos.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  /** despesa (PED) gerada para esta obra. */
  despesaId: uuid("despesa_id").references((): AnyPgColumn => despesas.id, {
    onDelete: "set null",
  }),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  percentual: numeric("percentual", { precision: 9, scale: 4 }).notNull().default("0"),
  /** base declarada do rateio (ex.: "dias trabalhados", "medição"). */
  baseRateio: text("base_rateio"),
  /** memória de cálculo, reimprimível. */
  memoriaCalculo: jsonb("memoria_calculo"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Vínculo N:N entre uma RESTITUIÇÃO e os PEDs que ela abate — item 4.2.
 *
 * O cliente não restitui item a item: ele fecha o combo (paga a fatura inteira
 * do cartão pessoal e é ressarcido em um único valor). Uma restituição abate
 * vários PEDs, e um PED pode ser abatido por mais de uma restituição (parciais).
 *
 * `valorAbatido` guarda quanto DESTA restituição foi para AQUELE PED — é o que
 * permite o abatimento parcial do último PED da fila FIFO.
 */
export const restituicaoItens = pgTable("restituicao_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  restituicaoId: uuid("restituicao_id")
    .notNull()
    .references(() => restituicoes.id, { onDelete: "cascade" }),
  /** obrigação (PED de origem) abatida por esta restituição. */
  despesaTerceiroId: uuid("despesa_terceiro_id")
    .notNull()
    .references(() => despesaTerceiros.id, { onDelete: "cascade" }),
  valorAbatido: numeric("valor_abatido", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Compensação (encontro de contas) entre o que a empresa deve a um terceiro e o
 * que ele deve a ela — RG-05.
 *
 * Não transita pela DRE: é baixa simultânea de um passivo e de um ativo. Os
 * dois saldos brutos continuam sendo exibidos antes da compensação.
 */
export const compensacoes = pgTable("compensacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** PED próprio da compensação. */
  numDoc: text("num_doc"),
  terceiroId: uuid("terceiro_id").references(() => stakeholders.id, {
    onDelete: "set null",
  }),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  data: text("data"),
  /** saldos BRUTOS no momento da compensação, para a trilha de conferência. */
  saldoRestituirAntes: numeric("saldo_restituir_antes", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  saldoRepassarAntes: numeric("saldo_repassar_antes", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  obs: text("obs"),
  idempotencyKey: text("idempotency_key"),
  usuarioId: text("usuario_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Parcela de uma despesa (conta a pagar). Fase 2. */
export const despesaParcelas = pgTable(
  "despesa_parcela",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    despesaId: uuid("despesa_id")
      .notNull()
      .references(() => despesas.id, { onDelete: "cascade" }),
    numeroParcela: integer("numero_parcela").notNull(),
    vencimento: text("vencimento"),
    valorOriginal: numeric("valor_original", { precision: 15, scale: 2 }).notNull().default("0"),
    valorPago: numeric("valor_pago", { precision: 15, scale: 2 }).notNull().default("0"),
    multa: numeric("multa", { precision: 15, scale: 2 }).notNull().default("0"),
    juros: numeric("juros", { precision: 15, scale: 2 }).notNull().default("0"),
    desconto: numeric("desconto", { precision: 15, scale: 2 }).notNull().default("0"),
    outrosAcrescimos: numeric("outros_acrescimos", { precision: 15, scale: 2 }).notNull().default("0"),
    dataPagamento: text("data_pagamento"),
    formaPagamento: text("forma_pagamento"),
    bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
      onDelete: "set null",
    }),
    /** Prompt U, 2.3 — em que fatura de cartão esta parcela cai (nula fora do cartão). */
    faturaId: uuid("fatura_id").references(() => faturasCartao.id, { onDelete: "set null" }),
    /** Pendente | Pago | Pago parcialmente | Vencido | Renegociado | Cancelado */
    /** Pendente | Pago | Pago parcialmente | Vencido | Renegociado | Cancelado.
     *  Para CHEQUE o ciclo é próprio: Pendente | Compensado | Devolvido |
     *  Cancelado — "Pago" esconderia a devolução, que é o evento que importa. */
    status: text("status").notNull().default("Pendente"),
    obs: text("obs"),
    // ── Cheque POR PARCELA (item 2.5) ──────────────────────────────────────
    // Antes os dados do cheque viviam no cabeçalho da despesa, ou seja, um
    // cheque para a compra inteira. Talão real tem numeração salteada e cada
    // parcela é um cheque diferente — por isso estes campos são da PARCELA.
    numeroCheque: text("numero_cheque"),
    emitenteCheque: text("emitente_cheque"),
    dataEmissaoCheque: text("data_emissao_cheque"),
    /** data acordada de apresentação do cheque pré-datado ("bom para"). */
    dataBomPara: text("data_bom_para"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("despesa_parcela_uq").on(t.despesaId, t.numeroParcela)],
);

/**
 * Registro de pagamento de uma parcela/despesa (Fase 3). Guarda a composição
 * (valor original, desconto, multa, juros, outros) e o total efetivamente pago.
 * Suporta pagamento parcial (vários registros por parcela).
 */
export const pagamentos = pgTable("pagamento", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  parcelaId: uuid("parcela_id").references(() => despesaParcelas.id, {
    onDelete: "cascade",
  }),
  despesaId: uuid("despesa_id").references(() => despesas.id, {
    onDelete: "cascade",
  }),
  valorOriginal: numeric("valor_original", { precision: 15, scale: 2 }).notNull().default("0"),
  desconto: numeric("desconto", { precision: 15, scale: 2 }).notNull().default("0"),
  multa: numeric("multa", { precision: 15, scale: 2 }).notNull().default("0"),
  juros: numeric("juros", { precision: 15, scale: 2 }).notNull().default("0"),
  outrosAcrescimos: numeric("outros_acrescimos", { precision: 15, scale: 2 }).notNull().default("0"),
  valorTotalPago: numeric("valor_total_pago", { precision: 15, scale: 2 }).notNull().default("0"),
  dataPagamento: text("data_pagamento"),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  /** categoria DRE dos encargos (juros/multa). */
  categoriaEncargos: text("categoria_encargos").notNull().default("Despesas Financeiras"),
  obs: text("obs"),
  /** Chave de idempotência (Prompt I, §13/§14): o mesmo pagamento reenviado não vira dois. */
  idempotencyKey: text("idempotency_key"),
  usuarioId: text("usuario_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  // Desempenho da DRE (27/10/2026, PR 2): a consulta por despesaId lia a tabela inteira.
  index("pagamento_despesa_idx").on(t.despesaId),
]);

/** Documento anexado (NF/contrato) — armazenado no Cloudflare R2. Fase 3. §11 */
export const documents = pgTable("document", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  despesaId: uuid("despesa_id").references(() => despesas.id, {
    onDelete: "cascade",
  }),
  /** Vínculos comerciais (documentos de venda/contrato). */
  clienteId: uuid("cliente_id").references((): AnyPgColumn => clientes.id, {
    onDelete: "cascade",
  }),
  /** Documento original do cadastro inteligente de fornecedor (Seção 1). */
  stakeholderId: uuid("stakeholder_id").references((): AnyPgColumn => stakeholders.id, {
    onDelete: "cascade",
  }),
  unitCode: text("unit_code"),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  /** Boleto, comprovante ou contrato de uma conta a receber (Prompt K, 6.1 — migração 0047). */
  contaReceberId: uuid("conta_receber_id").references((): AnyPgColumn => contasReceber.id, {
    onDelete: "set null",
  }),
  /** Prompt P, 6.1: documento do ativo de permuta (0049). */
  permutaId: uuid("permuta_id").references((): AnyPgColumn => permutas.id, {
    onDelete: "set null",
  }),
  /** Prompt Y, 4-A.2 (0060): nota, romaneio, foto ou requisição de um movimento de estoque. */
  stockMovementId: uuid("stock_movement_id").references((): AnyPgColumn => stockMovements.id, {
    onDelete: "set null",
  }),
  /** Prompt Z (0061): documentos do funcionário, do dia da equipe e da folha. */
  funcionarioId: uuid("funcionario_id").references((): AnyPgColumn => funcionarios.id, { onDelete: "set null" }),
  equipeDiaId: uuid("equipe_dia_id").references((): AnyPgColumn => equipeDias.id, { onDelete: "set null" }),
  folhaId: uuid("folha_id").references((): AnyPgColumn => folhasCompetencia.id, { onDelete: "set null" }),
  /** Prompt V, 5.2 (0064): laudo, relatório fotográfico, PLS ou ART/RRT de uma medição. */
  medicaoId: uuid("medicao_id").references((): AnyPgColumn => medicoes.id, { onDelete: "set null" }),
  /** Prompt Z, 2.2-A.7: validade do documento (ASO, CNH), ISO YYYY-MM-DD. */
  validade: text("validade"),
  /** chave do objeto no bucket R2. */
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type"),
  size: integer("size"),
  /** tipo do documento: Boleto, Nota Fiscal, Recibo, Contrato, Comprovante… */
  tipo: text("tipo"),
  /**
   * Nº do documento fiscal a que o arquivo se refere (item 3.2). Permite achar
   * o anexo pelo número da nota, sem depender do nome do arquivo.
   */
  numeroDocumentoFiscal: text("numero_documento_fiscal"),
  /** versão do documento quando substituído (mantém histórico). */
  versao: integer("versao").notNull().default(1),
  /** quem realizou o upload (e-mail/id). */
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Medição de obra lançada pelo engenheiro, por competência (MM/YYYY) e grupo
 * de obra (CEF). Informação AUXILIAR (Prompt V): alimenta o Relatório CEF
 * (orçado × medido por grupo); NÃO alimenta a DRE nem compõe custo.
 */
/**
 * Catálogo de SERVIÇOS do projeto (orçamento de obra). Cada serviço tem um
 * custo proposto; a incidência é derivada (custo ÷ custo total dos serviços) e
 * os limites mínimo/máximo permitem sinalizar quando a incidência está fora da
 * faixa aceitável. Ver docs/BDI-PROVISIONAMENTO.md §2.
 *
 * Tabela NOVA e independente: não altera nem substitui `medicao`, que continua
 * válida e em uso (alimenta o Relatório CEF; não a DRE — Prompt V).
 */
export const servicos = pgTable("servico", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  /** ordem de exibição (1..N), como na planilha de referência. */
  ordem: integer("ordem").notNull().default(0),
  nome: text("nome").notNull(),
  custoProposto: numeric("custo_proposto", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  /** faixa aceitável de incidência (%), opcional. */
  limiteMin: numeric("limite_min", { precision: 8, scale: 4 }),
  limiteMax: numeric("limite_max", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Medição de um serviço numa competência: o usuário informa APENAS o percentual
 * EXECUTADO ACUMULADO do serviço ao final do mês. A variação mensal e o valor
 * medido são derivados pelo sistema (nunca digitados) — ver
 * docs/BDI-PROVISIONAMENTO.md §4.
 */
export const medicaoServicos = pgTable("medicao_servico", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  servicoId: uuid("servico_id")
    .notNull()
    .references(() => servicos.id, { onDelete: "cascade" }),
  /** "MM/YYYY". */
  competencia: text("competencia").notNull(),
  /** % executado ACUMULADO do serviço até o fim desta competência (0..100). */
  pctExecutadoAcum: numeric("pct_executado_acum", { precision: 8, scale: 4 })
    .notNull()
    .default("0"),
  obs: text("obs"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const medicoes = pgTable("medicao", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => versions.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** "MM/YYYY". */
  competencia: text("competencia").notNull(),
  /** código do grupo CEF (ex.: "1", "3"). */
  grupoCode: text("grupo_code").notNull(),
  grupoName: text("grupo_name").notNull(),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  obs: text("obs"),
  /** Prompt V, 0.5.1 (0064): quem lançou; null nas medições anteriores à coluna (sem backfill). */
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Cliente comprador de uma unidade — cadastro comercial com dados cadastrais,
 * financeiros e de inteligência de mercado. Vinculado ao tenant e à unidade
 * comprada (por código). Ver pedido de "sessão de clientes (compradores)".
 */
export const clientes = pgTable("cliente", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** código da unidade comprada (ex.: "BLA 401"). */
  unitCode: text("unit_code"),
  statusContrato: text("status_contrato"),
  // ── Dados cadastrais ──
  nomeCompleto: text("nome_completo").notNull(),
  cpfCnpj: text("cpf_cnpj"),
  nascimento: text("nascimento"),
  nacionalidade: text("nacionalidade"),
  estadoCivil: text("estado_civil"),
  endereco: text("endereco"),
  cidadeEstado: text("cidade_estado"),
  cep: text("cep"),
  emailPrincipal: text("email_principal"),
  emailSecundario: text("email_secundario"),
  celular: text("celular"),
  telefone: text("telefone"),
  // ── Dados financeiros ──
  bancoFinanc: text("banco_financ"),
  rendaBruta: numeric("renda_bruta", { precision: 15, scale: 2 }),
  rendaLiquida: numeric("renda_liquida", { precision: 15, scale: 2 }),
  comprometimento: text("comprometimento"),
  possuiFgts: text("possui_fgts"),
  saldoFgts: numeric("saldo_fgts", { precision: 15, scale: 2 }),
  scoreCredito: integer("score_credito"),
  restricoes: text("restricoes"),
  // ── Inteligência de mercado ──
  morarOuInvestir: text("morar_ou_investir"),
  ramoAtividade: text("ramo_atividade"),
  cargoFuncao: text("cargo_funcao"),
  areaAtuacao: text("area_atuacao"),
  empresa: text("empresa"),
  regimeTrabalho: text("regime_trabalho"),
  localTrabalho: text("local_trabalho"),
  tempoEmpresa: text("tempo_empresa"),
  possuiImovel: text("possui_imovel"),
  motivacaoCompra: text("motivacao_compra"),
  comoConheceu: text("como_conheceu"),
  indicadoPor: text("indicado_por"),
  interesse: integer("interesse"),
  obsEstrategicas: text("obs_estrategicas"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ───────────────────────────── Caixa & INCC ─────────────────────────────

/** Lançamento de caixa (real) por versão, conciliável. Ver docs/SPEC.md §9.4. */
export const cashEntries = pgTable("cash_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * Prompt AT §3 — opcional desde a 0073: o movimento do extrato pertence à
   * conta; a obra vem do vínculo (`src/lib/movimento-obra.ts`). Os movimentos
   * antigos mantêm a obra que têm.
   */
  versionId: uuid("version_id")
    .references(() => versions.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "set null",
  }),
  data: text("data"),
  descricao: text("descricao"),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  cat: text("cat"),
  unitCode: text("unit_code"),
  /** nº do documento do extrato (quando importado). */
  doc: text("doc"),
  /** assinatura do lançamento importado (dedup do extrato). */
  importHash: text("import_hash"),
  /** conciliado com o extrato? */
  rec: boolean("rec").notNull().default(false),
  /** despesa conciliada a este movimento (para desfazer/histórico da conciliação). */
  conciliadoDespesaId: uuid("conciliado_despesa_id").references(() => despesas.id, {
    onDelete: "set null",
  }),
  /** conta a receber conciliada a este movimento (entradas). */
  conciliadoContaReceberId: uuid("conciliado_conta_receber_id"),
  /** usuário e data/hora da conciliação (auditoria). */
  conciliadoPor: text("conciliado_por"),
  conciliadoEm: text("conciliado_em"),
  /**
   * Prompt AT §1.1 — id da transação no Open Finance (Pluggy). Único por conta
   * quando preenchido: a mesma transação sincronizada de novo não entra duas vezes.
   */
  externalId: text("external_id"),
}, (r) => [uniqueIndex("cash_entry_conta_externo_uq").on(r.bankAccountId, r.externalId).where(sql`${r.externalId} is not null`)]);

/**
 * Conta a Receber (recebível) criada manualmente ou a partir do extrato. Os
 * recebíveis das unidades vendidas continuam sendo derivados do plano de
 * pagamento (não duplicados aqui); esta tabela guarda os recebíveis lançados à
 * mão e as receitas convertidas de itens do extrato. Vinculada a um projeto.
 */
export const contasReceber = pgTable("conta_receber", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  /** unidade/venda de origem (opcional). */
  unitCode: text("unit_code"),
  clienteId: uuid("cliente_id").references((): AnyPgColumn => clientes.id, {
    onDelete: "set null",
  }),
  descricao: text("descricao"),
  /** Sinal | Parcela mensal | Outros | Outras Receitas. */
  tipo: text("tipo").notNull().default("Outros"),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  /** data prevista "MM/DD/YYYY". */
  vencimento: text("vencimento"),
  dataRecebimento: text("data_recebimento"),
  valorRecebido: numeric("valor_recebido", { precision: 15, scale: 2 }).notNull().default("0"),
  /** A receber | Parcialmente recebido | Recebido | Cancelada (lista em `conta-receber-regras.ts`; K-2 deriva). */
  status: text("status").notNull().default("A receber"),
  bancoId: uuid("banco_id").references(() => bankAccounts.id, { onDelete: "set null" }),
  /** rastreabilidade: item do extrato que originou/conciliou esta conta. */
  origemCashEntryId: uuid("origem_cash_entry_id").references(() => cashEntries.id, {
    onDelete: "set null",
  }),
  cancelado: boolean("cancelado").notNull().default(false),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  // Desempenho da DRE (27/10/2026, PR 2): a consulta por projectId lia a tabela inteira.
  index("conta_receber_project_idx").on(t.projectId),
]);

/**
 * Recebimento de uma conta a receber (Prompt K, seções 3 e 4; migração 0048):
 * baixa manual (espécie, repasse, outro — com justificativa) ou conciliação
 * (com `cashEntryId`, valor por vínculo). O estado da conta é DERIVADO destas
 * linhas (`conta-receber-estado.ts`); `conta_receber.status`/`valor_recebido`
 * são só o cache dessa derivação. Estorno é lógico (4.3).
 */
/**
 * Prompt AT §5.1 (Revisão 4) — recebimento da parcela do COMPRADOR (plano de
 * pagamento da unidade), conciliado com a entrada do extrato. A parcela é a
 * chave estável "origem#número" do plano (ex.: "Mensais#12"), nunca a posição
 * na lista de recebíveis. Parcial é permitido. Estorno é lógico.
 */
export const recebimentosParcela = pgTable(
  "recebimento_parcela",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    chave: text("chave").notNull(),
    valor: numeric("valor", { precision: 15, scale: 2 }).notNull(),
    /** "MM/DD/YYYY" — a data da entrada. */
    data: text("data"),
    cashEntryId: uuid("cash_entry_id").references(() => cashEntries.id, { onDelete: "set null" }),
    criadoPor: text("criado_por"),
    criadoEm: timestamp("criado_em").notNull().defaultNow(),
    estornado: boolean("estornado").notNull().default(false),
    estornadoEm: timestamp("estornado_em"),
    estornadoPor: text("estornado_por"),
    motivoEstorno: text("motivo_estorno"),
  },
  (t) => [index("recebimento_parcela_unidade_idx").on(t.tenantId, t.unitId), index("recebimento_parcela_mov_idx").on(t.cashEntryId)],
);

export const contaReceberRecebimentos = pgTable("conta_receber_recebimento", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  contaReceberId: uuid("conta_receber_id")
    .notNull()
    .references(() => contasReceber.id, { onDelete: "cascade" }),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  /** "MM/DD/YYYY". */
  data: text("data"),
  /** Extrato bancário | Espécie | Repasse de terceiro | Outro. */
  forma: text("forma").notNull().default("Extrato bancário"),
  /** Linha do extrato conciliada (presente = conciliado). */
  cashEntryId: uuid("cash_entry_id").references(() => cashEntries.id, { onDelete: "set null" }),
  justificativa: text("justificativa"),
  estornado: boolean("estornado").notNull().default(false),
  estornadoEm: text("estornado_em"),
  estornadoPor: text("estornado_por"),
  motivoEstorno: text("motivo_estorno"),
  idempotencyKey: text("idempotency_key"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Tabela INCC por projeto (48 meses, editável). Ver docs/SPEC.md §6.
 * Prompt Q2 (0068): linha SEM projeto = a série da empresa (uma por mês),
 * lida no lugar da série da obra quando a chave "incc_por_empresa" está ligada.
 */
export const inccRates = pgTable(
  "incc_rate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** "MM/YYYY". */
    mes: text("mes").notNull(),
    /** variação mensal (%). */
    monthly: numeric("monthly", { precision: 8, scale: 4 }).notNull(),
    /** acumulado (%). */
    accumulated: numeric("accumulated", { precision: 8, scale: 4 }).notNull(),
    ordem: integer("ordem").notNull(),
    /** true = valor projetado (média móvel 12m); false = índice oficial. */
    projected: boolean("projected").notNull().default(false),
    /** Prompt Q, 5.1 (0051): INCC-DI, INCC-M ou INCC-10; nulo = a confirmar (BQ-1). Igual em todas as linhas da obra. */
    variante: text("variante"),
    /** Prompt Q, 5.3 (0051): de onde veio o índice oficial (ex.: "FGV, informado à mão"). */
    fonte: text("fonte"),
    /** Prompt Q, 5.3: quem informou o índice oficial (e-mail) e quando ("MM/DD/YYYY"). Histórico fica em branco. */
    informadoPor: text("informado_por"),
    informadoEm: text("informado_em"),
  },
  (r) => [unique("incc_project_mes_uq").on(r.projectId, r.mes), uniqueIndex("incc_empresa_mes_uq").on(r.tenantId, r.mes).where(sql`${r.projectId} is null`)],
);

// ─────────────────────────────── Auditoria ──────────────────────────────

/**
 * Log de auditoria: registra quem alterou o quê (ver docs/SPEC.md §12.7).
 * Append-only; preenchido pela camada de Server Actions.
 */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  /** ação executada, ex.: "despesa.create". */
  action: text("action").notNull(),
  /** entidade afetada, ex.: "despesa". */
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  /** detalhes (diff/resumo) em JSON. */
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─────────────────────── Numeração de documentos ─────────────────────────

/**
 * Sequência numérica configurável por tenant/entidade (ex.: numeração das
 * Despesas). O próximo número é reservado de forma atômica no banco
 * (UPDATE ... RETURNING dentro de transação), evitando duplicidade sob
 * concorrência. `nextNumber` é semeado a partir do maior número já existente.
 */
export const numberSequences = pgTable(
  "number_sequence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** entidade numerada, ex.: "despesa". */
    entity: text("entity").notNull().default("despesa"),
    prefix: text("prefix").notNull().default("PED"),
    usePrefix: boolean("use_prefix").notNull().default(true),
    digits: integer("digits").notNull().default(6),
    nextNumber: bigint("next_number", { mode: "number" }).notNull().default(1),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("number_sequence_tenant_entity_uq").on(t.tenantId, t.entity)],
);

/**
 * Chave de mudança por empresa (V2-BLOQUEIOS B4 · regra 3.3 do pacote V2):
 * mudança que altera número ou acesso em produção entra DESLIGADA e só vale
 * para a empresa depois de alguém ver a prévia e ligar. Sem linha = desligada
 * = comportamento de antes. O catálogo das chaves é código (`lib/chaves.ts`);
 * aqui fica só o estado de cada uma por empresa.
 */
export const tenantFlags = pgTable(
  "tenant_flag",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** id da chave no catálogo, ex.: "membro_padrao_restrito". */
    chave: text("chave").notNull(),
    ligada: boolean("ligada").notNull().default(false),
    alteradaPor: text("alterada_por"),
    alteradaEm: timestamp("alterada_em", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.chave] })],
);

// ───────────────── Lançamento simplificado (Budget/Forecast) ─────────────

/**
 * Lançamento simplificado mensal das versões Budget/Forecast. Uma linha por
 * (versão, tipo, chave da linha, mês). Receita: chave = fonte consolidada
 * (Mensais, Semestrais, …, Reembolso). Despesa: chave = grupo do plano de
 * contas (CEF), associado a uma categoria da DRE. A versão "atual" continua
 * usando o lançamento detalhado (unidades/despesas).
 */
export const budgetLines = pgTable(
  "budget_line",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    /** "receita" | "despesa" */
    kind: text("kind").notNull(),
    /** fonte de receita OU código do grupo CEF (despesa). */
    rowKey: text("row_key").notNull(),
    /** categoria DRE associada (para despesa; "Receita" para receita). */
    dreCategory: text("dre_category"),
    /** "MM/YYYY". */
    mes: text("mes").notNull(),
    valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
    /**
     * Percentual do mês sobre o total da conta (modelo total + %). O `valor` é
     * recalculado = total × pct / 100. NULL em lançamentos antigos que ainda não
     * migraram (a migração faz o backfill a partir do valor/total).
     */
    pct: numeric("pct", { precision: 7, scale: 4 }),
  },
  (t) => [unique("budget_line_uq").on(t.versionId, t.kind, t.rowKey, t.mes)],
);

/**
 * Total planejado por conta em uma versão (modelo total + %). O valor mensal em
 * `budget_line` é derivado deste total pelo percentual do mês. Uma linha por
 * (versão, tipo, conta). Ver docs/SPEC (Planejamento §7–8).
 */
export const budgetAccounts = pgTable(
  "budget_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    /** "receita" | "despesa". */
    kind: text("kind").notNull(),
    /** identidade da linha: código da conta do Plano de Contas (ou chave legada). */
    rowKey: text("row_key").notNull(),
    /** categoria DRE associada. */
    dreCategory: text("dre_category"),
    /** total planejado da conta no projeto (base para o rateio mensal por %). */
    total: numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  },
  (t) => [unique("budget_account_uq").on(t.versionId, t.kind, t.rowKey)],
);

/**
 * Seleção de linhas da grade de Orçamentos/Previsão (Prompt D, BD-6): quais
 * grupos do Plano de Contas fazem parte daquele bloco daquela versão. Sem
 * registro para (versão, bloco) = padrão (todos os grupos ativos da natureza),
 * exatamente como antes da tabela existir. A Previsão herda a seleção do
 * Orçamento de origem na criação (BD-7). Migração 0063.
 */
export const budgetSelecoes = pgTable(
  "budget_selecao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    /** "receita" | "despesa". */
    kind: text("kind").notNull(),
    /** código do grupo do Plano de Contas. */
    rowKey: text("row_key").notNull(),
    ordem: integer("ordem").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("budget_selecao_uq").on(t.versionId, t.kind, t.rowKey)],
);

/**
 * Fechamento operacional diário (Balanço do Dia). Persiste o resultado do
 * fechamento de caixa de um dia (por obra ou consolidado).
 */
export const dailyClosings = pgTable("daily_closing", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  /** obra do fechamento; NULL = consolidado (todas as obras). */
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  /** dia do fechamento, "MM/DD/YYYY". */
  dia: text("dia").notNull(),
  saldoInicial: numeric("saldo_inicial", { precision: 15, scale: 2 }).notNull().default("0"),
  totalEntradas: numeric("total_entradas", { precision: 15, scale: 2 }).notNull().default("0"),
  totalSaidas: numeric("total_saidas", { precision: 15, scale: 2 }).notNull().default("0"),
  saldoFinal: numeric("saldo_final", { precision: 15, scale: 2 }).notNull().default("0"),
  /** em conta − conciliado ao fim do dia, CALCULADA no servidor (Prompt L, 9.4). */
  divergencias: numeric("divergencias", { precision: 15, scale: 2 }).notNull().default("0"),
  responsavelId: text("responsavel_id").references(() => users.id, {
    onDelete: "set null",
  }),
  responsavelNome: text("responsavel_nome"),
  obs: text("obs"),
  closedAt: timestamp("closed_at", { mode: "date" }).notNull().defaultNow(),
  // Prompt L, Parte 9 (migração 0059): o fechamento vem do cartão da cadeia.
  /** saldo do extrato ao fim do dia; null nos fechamentos antigos. */
  saldoEmConta: numeric("saldo_em_conta", { precision: 15, scale: 2 }),
  /** ajustes do dia (Parte 4), para a identidade da cadeia fechar. */
  ajustes: numeric("ajustes", { precision: 15, scale: 2 }).notNull().default("0"),
  /** a divergência classificada nas quatro naturezas (1.3). */
  naturezas: jsonb("naturezas").$type<Record<string, number>>(),
  /** reabrir é operação própria (9.5): a linha fica, marcada. */
  reabertoEm: timestamp("reaberto_em", { mode: "date" }),
  reabertoPor: text("reaberto_por"),
  motivoReabertura: text("motivo_reabertura"),
});

/**
 * Histórico de transferências de pendências entre fechamentos (auditoria).
 * Cada conta a pagar/receber não liquidada no fechamento é registrada como
 * transferida para o dia seguinte.
 */
export const carryOvers = pgTable("carry_over", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  closingId: uuid("closing_id").references(() => dailyClosings.id, {
    onDelete: "cascade",
  }),
  /** "pagar" | "receber" */
  tipo: text("tipo").notNull(),
  /** id da despesa ou chave do recebível. */
  refId: text("ref_id"),
  descricao: text("descricao"),
  valor: numeric("valor", { precision: 15, scale: 2 }).notNull().default("0"),
  vencimento: text("vencimento"),
  fromDia: text("from_dia").notNull(),
  toDia: text("to_dia").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Item de estoque (produto/material) cadastrado no tenant. */
export const stockItems = pgTable("stock_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  sku: text("sku"),
  nome: text("nome").notNull(),
  /** unidade de medida (un, kg, m, m2, m3, sc, …). */
  unidade: text("unidade").notNull().default("un"),
  categoria: text("categoria"),
  custoUnit: numeric("custo_unit", { precision: 15, scale: 2 }).notNull().default("0"),
  /** estoque mínimo para alerta. */
  minimo: numeric("minimo", { precision: 15, scale: 3 }).notNull().default("0"),
  obs: text("obs"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  /** Prompt Y, 5.2 (0060): item com movimento não é apagado — é inativado. */
  ativo: boolean("ativo").notNull().default(true),
});

/** Movimentação de estoque: entrada ou saída, associada a uma obra. */
export const stockMovements = pgTable("stock_movement", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  itemId: uuid("item_id")
    .notNull()
    .references(() => stockItems.id, { onDelete: "cascade" }),
  /** obra à qual a movimentação está associada (NULL = geral/almoxarifado). */
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  /** "entrada" | "saida" */
  tipo: text("tipo").notNull(),
  /**
   * Origem/motivo padronizado da movimentação. Entradas: Compra, Permuta,
   * Devolução, Ajuste, Transferência. Saídas: Consumo na obra, Perda/Quebra,
   * Devolução ao fornecedor, Transferência, Ajuste.
   */
  origem: text("origem"),
  quantidade: numeric("quantidade", { precision: 15, scale: 3 }).notNull().default("0"),
  custoUnit: numeric("custo_unit", { precision: 15, scale: 2 }).notNull().default("0"),
  /** data da movimentação, "MM/DD/YYYY". */
  data: text("data"),
  doc: text("doc"),
  /** Vínculo opcional a uma despesa (entrada por compra). */
  despesaId: uuid("despesa_id").references(() => despesas.id, {
    onDelete: "set null",
  }),
  /** Vínculo opcional a uma permuta (entrada por permuta). */
  permutaId: uuid("permuta_id").references(() => permutas.id, {
    onDelete: "set null",
  }),
  /** Responsável pelo lançamento (quem deu entrada/baixa). */
  responsavel: text("responsavel"),
  obs: text("obs"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  /** Prompt Y, 2.6 (0060): estorno é lançamento inverso que aponta o original; o original fica. */
  estornoDeId: uuid("estorno_de_id").references((): AnyPgColumn => stockMovements.id, {
    onDelete: "set null",
  }),
});

/* ───────────────────────── Prompt Z — Módulo Pessoas (0061) ───────────────────────── */

/**
 * Funcionário CLT (ficha do art. 41 da CLT, arquivo de apoio — não substitui
 * o eSocial). Registro, não folha: nada aqui calcula encargo. CPF, PIS,
 * endereço, salário e banco são dado pessoal: servidos só a quem tem a
 * permissão de campo (`funcionariosdados`), nunca em log em claro.
 */
export const funcionarios = pgTable("funcionario", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  nascimento: text("nascimento"),
  nacionalidade: text("nacionalidade"),
  estadoCivil: text("estado_civil"),
  nomeMae: text("nome_mae"),
  fotoDocumentId: uuid("foto_document_id"),
  cpf: text("cpf"),
  rg: text("rg"),
  rgOrgao: text("rg_orgao"),
  rgUf: text("rg_uf"),
  ctpsNumero: text("ctps_numero"),
  ctpsSerie: text("ctps_serie"),
  pis: text("pis"),
  tituloEleitor: text("titulo_eleitor"),
  reservista: text("reservista"),
  cnh: text("cnh"),
  cnhCategoria: text("cnh_categoria"),
  cnhValidade: text("cnh_validade"),
  endereco: text("endereco"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  admissao: text("admissao"),
  cargo: text("cargo"),
  setor: text("setor"),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  tipoContrato: text("tipo_contrato"),
  prazoContrato: text("prazo_contrato"),
  jornada: text("jornada"),
  salario: numeric("salario", { precision: 15, scale: 2 }),
  desligamento: text("desligamento"),
  motivoDesligamento: text("motivo_desligamento"),
  bancoNome: text("banco_nome"),
  bancoAgencia: text("banco_agencia"),
  bancoConta: text("banco_conta"),
  bancoTipoConta: text("banco_tipo_conta"),
  pixTipo: text("pix_tipo"),
  pixChave: text("pix_chave"),
  obs: text("obs"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const funcionarioDependentes = pgTable("funcionario_dependente", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  funcionarioId: uuid("funcionario_id").notNull().references(() => funcionarios.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  nascimento: text("nascimento"),
  parentesco: text("parentesco"),
  dependenteIr: boolean("dependente_ir").notNull().default(false),
  salarioFamilia: boolean("salario_familia").notNull().default(false),
});

/** BZ-3 — lista fechada de funções, por tenant, editável. */
export const funcoesEquipe = pgTable("funcao_equipe", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  ordem: integer("ordem").notNull().default(0),
});

/**
 * Alocação numa obra (3.2): referencia o cadastro de origem — `stakeholder`
 * (autônomo, sócio) OU `funcionario` (CLT); nunca os dois (CHECK no banco).
 * O valor da diária é DA ALOCAÇÃO (3.5.4) e nulo para CLT e sócio.
 */
export const equipesProjeto = pgTable("equipe_projeto", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  stakeholderId: uuid("stakeholder_id").references((): AnyPgColumn => stakeholders.id, { onDelete: "restrict" }),
  funcionarioId: uuid("funcionario_id").references(() => funcionarios.id, { onDelete: "restrict" }),
  funcaoId: uuid("funcao_id").references(() => funcoesEquipe.id, { onDelete: "set null" }),
  valorDiaria: numeric("valor_diaria", { precision: 15, scale: 2 }),
  entrada: text("entrada"),
  saida: text("saida"),
  situacao: text("situacao").notNull().default("ativa"),
  obs: text("obs"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** O dia da equipe numa obra (3.6.5): folha de ponto e fotos anexam-se aqui, não por membro. */
export const equipeDias = pgTable("equipe_dia", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  /** "MM/DD/YYYY" */
  data: text("data").notNull(),
  obs: text("obs"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Diária executada (3.5): quantidade 1 ou 0,5; o VALOR é gravado no registro (3.5.4). */
export const diarias = pgTable("diaria", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  equipeDiaId: uuid("equipe_dia_id").notNull().references(() => equipeDias.id, { onDelete: "cascade" }),
  equipeProjetoId: uuid("equipe_projeto_id").notNull().references(() => equipesProjeto.id, { onDelete: "restrict" }),
  quantidade: numeric("quantidade", { precision: 4, scale: 2 }).notNull().default("1"),
  valor: numeric("valor", { precision: 15, scale: 2 }),
  obs: text("obs"),
  /** BZ-1 — a despesa lançada em /despesas a partir da proposta (rastro; nada é gerado aqui). */
  despesaId: uuid("despesa_id").references(() => despesas.id, { onDelete: "set null" }),
  registradoPor: text("registrado_por"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** Folha por competência (2.2-B): documento da empresa, um registro por mês; vínculo com a despesa que a pagou. */
export const folhasCompetencia = pgTable("folha_competencia", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  /** "MM/YYYY" */
  competencia: text("competencia").notNull(),
  obs: text("obs"),
  despesaId: uuid("despesa_id").references(() => despesas.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/** 7.3-A — quem abriu um ASO e quando (dado de saúde: acesso registrado). */
export const asoAcessos = pgTable("aso_acesso", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  funcionarioId: uuid("funcionario_id").notNull().references(() => funcionarios.id, { onDelete: "cascade" }),
  documentId: uuid("document_id"),
  usuario: text("usuario"),
  acessadoEm: timestamp("acessado_em", { mode: "date" }).notNull().defaultNow(),
});

/**
 * Consumo da IA (Prompt AM, Parte 5; migração 0066): QUANTO cada chamada ao
 * modelo custou, por quem e quando — nunca O QUÊ (sem pergunta, documento ou
 * resposta). Gravado por `createMessageWithFallback` quando a action marca o
 * uso com `comUsoDeIa`.
 */
export const iaUso = pgTable(
  "ia_uso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** despesa | extrato | fornecedor | projeto | venda | permuta | estoque | folha | medicao | chat | assistente | teste */
    operacao: text("operacao").notNull(),
    /** modelo que efetivamente respondeu (null quando falhou). */
    modelo: text("modelo"),
    /** respondeu um alternativo da cadeia, não o primário. */
    fallback: boolean("fallback").notNull().default(false),
    entrada: integer("entrada").notNull().default(0),
    saida: integer("saida").notNull().default(0),
    cacheCriacao: integer("cache_criacao").notNull().default(0),
    cacheLida: integer("cache_lida").notNull().default(0),
    erro: boolean("erro").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("ia_uso_tenant_quando_idx").on(t.tenantId, t.createdAt)],
);

/**
 * NFS-e EMITIDA pela empresa (Prompt AG; migração 0069). Não confundir com
 * `documento_fiscal` (nota RECEBIDA de fornecedor).
 *
 * Decisões de 26/10/2026: estreia com serviço avulso, que pode apontar para a
 * conta a receber já lançada (BAG-1, opção b); a nota NÃO
 * cria receita, conta a receber nem lançamento — é documento do fato (BAG-2);
 * um CNPJ só, o tenant de `NFSE_TENANT_ID` (BAG-3); nota de homologação fica
 * marcada e fora de relatório (BAG-4). Vive na versão Atual (1.3). Tomador e
 * valores são COPIADOS na emissão (1.4). Nada é apagado (5.7).
 */
export const notasServico = pgTable(
  "nota_servico",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Sem cascata: obra com nota emitida não some (NO ACTION). */
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    versionId: uuid("version_id")
      .notNull()
      .references(() => versions.id),
    /** rascunho | processando | autorizada | rejeitada | cancelada */
    status: text("status").notNull().default("rascunho"),
    /** homologacao | producao — fixado no envio; trocar na Empresa não muda nota já enviada. */
    ambiente: text("ambiente").notNull().default("homologacao"),
    /** quantas vezes foi enviada; compõe a `ref` (nova tentativa = nova ref). */
    tentativa: integer("tentativa").notNull().default(0),
    ref: text("ref"),
    numero: text("numero"),
    numeroRps: text("numero_rps"),
    serieRps: text("serie_rps"),
    codigoVerificacao: text("codigo_verificacao"),
    /** mensagem do provedor, na íntegra (2.2). */
    mensagemRetorno: text("mensagem_retorno"),
    urlDanfse: text("url_danfse"),
    urlEspelho: text("url_espelho"),
    caminhoXml: text("caminho_xml"),
    pdfKey: text("pdf_key"),
    xmlKey: text("xml_key"),
    /** competência "MM/YYYY". */
    competencia: text("competencia"),
    discriminacao: text("discriminacao").notNull().default(""),
    itemListaServico: text("item_lista_servico"),
    codigoTributarioMunicipio: text("codigo_tributario_municipio"),
    codigoMunicipioPrestacao: text("codigo_municipio_prestacao"),
    valorServicos: numeric("valor_servicos", { precision: 15, scale: 2 }).notNull().default("0"),
    valorDeducoes: numeric("valor_deducoes", { precision: 15, scale: 2 }).notNull().default("0"),
    descontoIncondicionado: numeric("desconto_incondicionado", { precision: 15, scale: 2 }).notNull().default("0"),
    descontoCondicionado: numeric("desconto_condicionado", { precision: 15, scale: 2 }).notNull().default("0"),
    aliquotaIss: numeric("aliquota_iss", { precision: 8, scale: 4 }).notNull().default("0"),
    issRetido: boolean("iss_retido").notNull().default(false),
    /** { pis?, cofins?, csll?, ir?, inss? } — cada um { aliquota, base? }. Nenhuma presumida. */
    retencoes: jsonb("retencoes").$type<Record<string, { aliquota: number; base?: number }>>(),
    outrasRetencoes: numeric("outras_retencoes", { precision: 15, scale: 2 }).notNull().default("0"),
    baseCalculo: numeric("base_calculo", { precision: 15, scale: 2 }),
    valorIss: numeric("valor_iss", { precision: 15, scale: 2 }),
    totalRetencoes: numeric("total_retencoes", { precision: 15, scale: 2 }),
    valorLiquido: numeric("valor_liquido", { precision: 15, scale: 2 }),
    tomadorCpfCnpj: text("tomador_cpf_cnpj"),
    tomadorNome: text("tomador_nome"),
    tomadorInscricaoMunicipal: text("tomador_inscricao_municipal"),
    tomadorEmail: text("tomador_email"),
    tomadorTelefone: text("tomador_telefone"),
    tomadorLogradouro: text("tomador_logradouro"),
    tomadorNumero: text("tomador_numero"),
    tomadorComplemento: text("tomador_complemento"),
    tomadorBairro: text("tomador_bairro"),
    tomadorCodigoMunicipio: text("tomador_codigo_municipio"),
    tomadorUf: text("tomador_uf"),
    tomadorCep: text("tomador_cep"),
    /** BAG-1: "avulso" na estreia. */
    origemTipo: text("origem_tipo").notNull().default("avulso"),
    /**
     * BAG-1, opção b: a nota pode APONTAR para a conta a receber já lançada.
     * O vínculo é só referência — a nota não cria nem altera a conta (BAG-2).
     */
    contaReceberId: uuid("conta_receber_id").references(() => contasReceber.id, { onDelete: "set null" }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    enviadaEm: timestamp("enviada_em", { mode: "date" }),
    autorizadaEm: timestamp("autorizada_em", { mode: "date" }),
    canceladaEm: timestamp("cancelada_em", { mode: "date" }),
    canceladaPor: text("cancelada_por").references(() => users.id, { onDelete: "set null" }),
    motivoCancelamento: text("motivo_cancelamento"),
  },
  (t) => [uniqueIndex("nota_servico_tenant_ref_uq").on(t.tenantId, t.ref), index("nota_servico_tenant_idx").on(t.tenantId, t.createdAt)],
);

/** Histórico da nota (2.2): cada envio, consulta, rejeição e cancelamento. Só cresce. */
export const notaServicoEventos = pgTable(
  "nota_servico_evento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    notaId: uuid("nota_id")
      .notNull()
      .references(() => notasServico.id, { onDelete: "cascade" }),
    /** criada | enviada | consulta | cancelamento | falha_rede */
    tipo: text("tipo").notNull(),
    ref: text("ref"),
    status: text("status"),
    mensagem: text("mensagem"),
    /** resposta crua do provedor (sem token). */
    bruto: jsonb("bruto"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("nota_servico_evento_nota_idx").on(t.notaId, t.createdAt)],
);

/**
 * Prompt AO, 4.3 — pacote completo de backup gerado em segundo plano: o pedido,
 * o progresso e onde o ZIP ficou no R2. Só registro; nenhum dado de negócio.
 */
export const backupPacotes = pgTable(
  "backup_pacote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    semestre: text("semestre").notNull(),
    /** "gerando" | "pronto" | "falhou". */
    status: text("status").notNull().default("gerando"),
    etapa: text("etapa"),
    feitas: integer("feitas").notNull().default(0),
    total: integer("total").notNull().default(0),
    storageKey: text("storage_key"),
    arquivo: text("arquivo"),
    bytes: bigint("bytes", { mode: "number" }),
    /** resumo do manifesto (linhas por tabela, documentos, falhas) — sem dado pessoal. */
    resumo: jsonb("resumo").$type<Record<string, unknown>>(),
    erro: text("erro"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { mode: "date" }).notNull().defaultNow(),
    concluidoEm: timestamp("concluido_em", { mode: "date" }),
  },
  (t) => [index("backup_pacote_tenant_idx").on(t.tenantId, t.createdAt)],
);

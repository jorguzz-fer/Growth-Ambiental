import { createHash, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  can,
  effectivePermissions,
  type PermAction,
  type PermMatrix,
} from "@/lib/permissions";
import type { Role } from "@/lib/context";
import { opcoesDoTenant } from "@/lib/membro-padrao";

/**
 * Autenticação da API de agente (WhatsApp → Cris → Growth).
 *
 * Duas provas independentes, e as duas são obrigatórias:
 *
 *  1. **Bearer** (`AGENT_API_TOKEN`) prova que quem chama é o runtime da
 *     fazer.ai, e não um curl qualquer que achou a URL.
 *  2. **Telefone** prova QUEM está do outro lado. Ele é preenchido pelo
 *     runtime a partir do contato do Chatwoot (`{{contact_phone}}`), não pelo
 *     modelo — desde que a variável seja declarada em header/query e NÃO como
 *     campo do `input_schema`. Ver docs/API-AGENTE.md §2.
 *
 * A partir do telefone resolvemos e-mail → usuário → membership, e aplicamos
 * **o mesmo RBAC das telas** (src/lib/permissions.ts). O agente não tem
 * permissão própria: ele herda a de quem está falando com ele.
 */

export class AgentAuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AgentAuthError";
  }
}

/** Só os dígitos: descarta "+", espaço, parênteses e hífen. */
export function onlyDigits(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * Variantes do mesmo número brasileiro. O WhatsApp entrega celular com o
 * nono dígito, mas o JID de números antigos (e alguns provedores) vem sem —
 * comparar string crua faz o dono legítimo levar 403. Devolve o número como
 * veio + a variante com/sem o 9, sem duplicatas.
 */
export function phoneVariants(raw: string | null | undefined): string[] {
  const d = onlyDigits(raw);
  if (!d) return [];
  const out = new Set<string>([d]);

  if (d.startsWith("55")) {
    const ddd = d.slice(2, 4);
    const resto = d.slice(4);
    // 55 + DDD + 9XXXXXXXX  →  55 + DDD + XXXXXXXX
    if (resto.length === 9 && resto.startsWith("9")) out.add(`55${ddd}${resto.slice(1)}`);
    // 55 + DDD + XXXXXXXX   →  55 + DDD + 9XXXXXXXX
    if (resto.length === 8) out.add(`55${ddd}9${resto}`);
  }
  return [...out];
}

/**
 * `AGENT_ALLOWED_PHONES` — allowlist telefone → e-mail do usuário.
 *
 *   +5511900000001=operador@exemplo.com, +5511900000002=gestor@exemplo.com
 *
 * Separadores aceitos entre pares: vírgula, ponto-e-vírgula ou quebra de
 * linha. Entre telefone e e-mail: "=" ou ":" (o PRIMEIRO que aparecer).
 *
 * É env var, e não tabela, de propósito: enquanto são duas pessoas, mudar a
 * lista é editar um secret no Coolify — e ninguém consegue se auto-incluir
 * pelo app. Quando passar de meia dúzia, isto vira tabela com tela.
 */
export function parseAllowlist(raw: string | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const par of (raw ?? "").split(/[,;\n]/)) {
    const item = par.trim();
    if (!item) continue;
    const corte = item.search(/[=:]/);
    if (corte < 0) continue;
    const telefone = onlyDigits(item.slice(0, corte));
    const email = item.slice(corte + 1).trim().toLowerCase();
    if (!telefone || !email) continue;
    for (const v of phoneVariants(telefone)) map.set(v, email);
  }
  return map;
}

/** Compara segredos sem vazar tempo (nem comprimento — compara os hashes). */
export function secretsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * De onde sai o telefone, em ordem de confiança. Header primeiro: dado
 * pessoal não deve ir em query string (fica em log de acesso e no histórico
 * do proxy). A query é aceita só como plano B enquanto medimos quais
 * variáveis de contexto a fazer.ai realmente injeta — ver /api/agent/eco.
 */
export function readPhone(req: Request): { valor: string; origem: string } | null {
  const h = req.headers.get("x-agent-phone");
  if (h && onlyDigits(h)) return { valor: h, origem: "header" };

  const q = new URL(req.url).searchParams.get("telefone");
  if (q && onlyDigits(q)) return { valor: q, origem: "query" };

  return null;
}

export interface AgentIdentity {
  phone: string;
  phoneOrigem: string;
  email: string;
  userId: string;
  userName: string | null;
  tenantId: string;
  tenantName: string;
  role: Role;
  perms: PermMatrix;
}

/**
 * Valida bearer + telefone e devolve a identidade resolvida.
 * Lança `AgentAuthError` — os handlers convertem em JSON com o status certo.
 */
export async function resolveAgentIdentity(req: Request): Promise<AgentIdentity> {
  const esperado = process.env.AGENT_API_TOKEN ?? "";
  if (!esperado) {
    throw new AgentAuthError(
      503,
      "api_desligada",
      "AGENT_API_TOKEN não configurado — a API de agente está desligada.",
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!secretsMatch(token, esperado)) {
    throw new AgentAuthError(401, "token_invalido", "Token de agente inválido ou ausente.");
  }

  const tel = readPhone(req);
  if (!tel) {
    throw new AgentAuthError(
      400,
      "telefone_ausente",
      "Requisição sem telefone: envie X-Agent-Phone.",
    );
  }

  const allowlist = parseAllowlist(process.env.AGENT_ALLOWED_PHONES);
  let email: string | undefined;
  for (const v of phoneVariants(tel.valor)) {
    const achado = allowlist.get(v);
    if (achado) {
      email = achado;
      break;
    }
  }
  if (!email) {
    throw new AgentAuthError(
      403,
      "telefone_nao_autorizado",
      "Este número não tem acesso ao Growth.",
    );
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (!user) {
    throw new AgentAuthError(
      403,
      "usuario_inexistente",
      `A allowlist aponta para ${email}, que não é usuário do Growth.`,
    );
  }

  const [vinculo] = await db
    .select({ m: schema.memberships, t: schema.tenants })
    .from(schema.memberships)
    .innerJoin(schema.tenants, eq(schema.memberships.tenantId, schema.tenants.id))
    .where(eq(schema.memberships.userId, user.id))
    .limit(1);
  if (!vinculo) {
    throw new AgentAuthError(403, "sem_vinculo", `${email} não está vinculado a nenhum tenant.`);
  }

  const role = vinculo.m.role as Role;
  return {
    phone: onlyDigits(tel.valor),
    phoneOrigem: tel.origem,
    email,
    userId: user.id,
    userName: user.name,
    tenantId: vinculo.t.id,
    tenantName: vinculo.t.name,
    role,
    perms: effectivePermissions(role, vinculo.m.permissions, await opcoesDoTenant(vinculo.t.id)),
  };
}

/** Exige permissão na tela; 403 se o perfil não enxerga aquele módulo. */
export function requireScreen(
  id: AgentIdentity,
  screenId: string,
  action: PermAction = "ver",
): void {
  if (!can(id.perms, screenId, action)) {
    throw new AgentAuthError(
      403,
      "sem_permissao",
      `O perfil "${id.role}" não tem permissão de ${action} em "${screenId}".`,
    );
  }
}

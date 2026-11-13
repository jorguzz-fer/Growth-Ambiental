/**
 * Super-admins da plataforma — operadores que criam e gerenciam contas
 * (tenants) em `/plataforma`. NÃO é um papel do tenant (owner/admin/…), e sim
 * um privilégio de plataforma, controlado por e-mail.
 *
 * Fonte ÚNICA: a variável de ambiente `SUPERADMIN_EMAILS` (lista separada por
 * vírgula), configurada no servidor. Nenhum e-mail fica no código. Sem a
 * variável, ninguém é operador (falha fechada): o console da plataforma fica
 * inacessível até a configuração — e um aviso sai no log uma vez.
 */
let avisou = false;

export function superAdminEmails(env: string | undefined = process.env.SUPERADMIN_EMAILS): string[] {
  const lista = (env ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  if (!lista.length && !avisou) {
    avisou = true;
    console.warn("[superadmin] SUPERADMIN_EMAILS não está definido: nenhum operador da plataforma tem acesso a /plataforma.");
  }
  return lista;
}

export function isSuperAdmin(email?: string | null, env?: string): boolean {
  if (!email) return false;
  return superAdminEmails(env ?? process.env.SUPERADMIN_EMAILS).includes(email.trim().toLowerCase());
}

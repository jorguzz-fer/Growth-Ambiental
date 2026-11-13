/**
 * Stub de `@/lib/auth` usado SÓ no bundle do seed de demonstração.
 * O seed roda fora do Next.js; as ações reais do app chamam `auth()` para
 * descobrir quem está logado. Aqui a "sessão" é o e-mail que o seed define
 * em `sessaoDoSeed.email` — o resto (usuário → vínculo → empresa →
 * permissões) é resolvido pelo `getTenantContext` verdadeiro.
 */
export const sessaoDoSeed: { email: string | null } = { email: null };
export const auth = async () => (sessaoDoSeed.email ? { user: { email: sessaoDoSeed.email } } : null);
export const unstable_update = async () => null;
export const signIn = async () => null;
export const signOut = async () => null;
export const handlers = {};

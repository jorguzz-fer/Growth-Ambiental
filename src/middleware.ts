import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/*
 * Gate de autenticação (edge-safe): rotas do app exigem sessão. Faz apenas a
 * checagem de presença do cookie de sessão (redirect de UX); a validação real
 * do usuário/perfil acontece no servidor via getTenantContext().
 */
const PUBLIC_PATHS = ["/", "/login", "/plataforma/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    // Landing page estática de implantação/onboarding (public/site).
    pathname === "/site" ||
    pathname.startsWith("/site/") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const url = req.nextUrl.clone();
    // O backoffice tem entrada própria; usuários do tenant vão ao /login.
    url.pathname = pathname.startsWith("/plataforma")
      ? "/plataforma/login"
      : "/login";
    if (!pathname.startsWith("/plataforma"))
      url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Expõe o pathname para o layout aplicar o controle de "Ver" por tela.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

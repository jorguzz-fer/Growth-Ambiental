"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { precheckLogin } from "@/lib/actions/auth-precheck";
import { PasswordInput } from "@/components/ui/password-input";
import { BrandMark } from "@/components/app/brand-mark";

/**
 * Login em duas etapas: (1) e-mail + senha; (2) se o usuário tem MFA ativo,
 * tela dedicada só com o código de 6 dígitos. Quem ainda não ativou o MFA
 * entra e é levado ao enrollment obrigatório (/mfa) pelo gate do layout.
 */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function done() {
    const params = new URLSearchParams(window.location.search);
    router.push(params.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  async function finishSignIn(totp: string) {
    const res = await signIn("credentials", {
      email,
      password,
      totp,
      redirect: false,
    });
    if (res?.error) {
      setError(
        totp ? "Código inválido — tente novamente." : "Credenciais inválidas.",
      );
      return false;
    }
    done();
    return true;
  }

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const pre = await precheckLogin(email, password);
      if (!pre.ok) {
        setError("E-mail ou senha incorretos.");
        return;
      }
      if (pre.mfaRequired) {
        setStep(2);
        return;
      }
      await finishSignIn("");
    } finally {
      setLoading(false);
    }
  }

  async function submitStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await finishSignIn(code);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d14] px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <BrandMark size={44} />
        <div>
          <div className="font-[family-name:var(--font-inter)] text-[24px] font-extrabold leading-none tracking-[0.2px] text-white">
            GROWTH
          </div>
          <div className="mt-1 font-[family-name:var(--font-inter)] text-[11px] tracking-[0.32em] text-[var(--color-brand-segmento)]">
            AMBIENTAL
          </div>
        </div>
      </div>

      <div className="w-full max-w-[400px] rounded-[18px] border border-white/10 bg-[#15151f] p-7 sm:p-8">
        {step === 1 ? (
          <>
            <h1 className="text-center text-lg font-semibold text-white">
              Entrar
            </h1>
            <form onSubmit={submitStep1} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-white/80">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-[10px] border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[var(--color-accent3)] focus:ring-2 focus:ring-[var(--color-accent2)]/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-white/80">
                  Senha
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-11 rounded-[10px] border-white/10 bg-black/30 text-white placeholder:text-white/20 focus:border-[var(--color-accent3)] focus:ring-[var(--color-accent2)]/30"
                  iconClassName="text-white/40 hover:text-white"
                />
              </div>
              {error && (
                <p className="text-center text-[13px] text-[#f87171]">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-[10px] bg-[var(--color-accent2)] text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)] disabled:opacity-40"
              >
                {loading ? "Verificando…" : "Continuar"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-center text-lg font-semibold text-white">
              Verificação em duas etapas
            </h1>
            <p className="mx-auto mt-2 max-w-[300px] text-center text-[13px] leading-relaxed text-white/50">
              Digite o código de 6 dígitos gerado pelo seu app autenticador.
            </p>
            <form onSubmit={submitStep2} className="mt-5">
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="0 0 0 0 0 0"
                className="h-12 w-full rounded-[10px] border border-white/10 bg-black/30 text-center font-[family-name:var(--font-mono)] text-lg tracking-[0.5em] text-white outline-none placeholder:text-white/20 focus:border-[var(--color-accent3)] focus:ring-2 focus:ring-[var(--color-accent2)]/30"
              />
              {error && (
                <p className="mt-2 text-center text-[13px] text-[#f87171]">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="mt-4 h-11 w-full rounded-[10px] bg-[var(--color-accent2)] text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent)] disabled:opacity-40"
              >
                {loading ? "Verificando…" : "Entrar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setCode("");
                  setError(null);
                }}
                className="mt-3 w-full text-center text-[12px] text-white/40 hover:text-white/70"
              >
                ← voltar
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-[12px] text-white/30">
        A verificação em duas etapas é obrigatória para acessar o painel.
      </p>
    </main>
  );
}

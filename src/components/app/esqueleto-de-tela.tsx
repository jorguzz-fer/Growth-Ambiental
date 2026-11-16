/**
 * GA-13 H3 — o que aparece enquanto uma tela pesada carrega: o título da tela
 * e blocos cinza no lugar dos cartões e da tabela. Antes, a tela ficava em
 * branco alguns segundos (o Fluxo de Caixa, por exemplo): aberta pelo menu,
 * sem projeto na URL, ela decidia o projeto (`RecuperarProjeto`) sem mostrar
 * nada e esperava a tela pesada. Usado no `RecuperarProjeto`, não em
 * `loading.tsx` (ver o relatório do GA-13: a fronteira de Suspense do
 * `loading.tsx` travava navegações).
 */
export function EsqueletoDeTela({ titulo, cartoes = 4, semCabecalho = false }: { titulo?: string; cartoes?: number; semCabecalho?: boolean }) {
  const bloco = "animate-pulse rounded-[12px] bg-[var(--color-surface3)]";
  return (
    <div aria-busy="true" aria-live="polite" data-esqueleto-de-tela>
      {!semCabecalho && (
        <div className="mb-6">
          <div className={`${bloco} mb-2 h-3 w-40`} />
          {titulo ? <h1 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--color-ink)]">{titulo}</h1> : <div className={`${bloco} h-7 w-64`} />}
          <p className="mt-1.5 text-sm text-[var(--color-ink3)]">Carregando…</p>
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: cartoes }, (_, i) => (
          <div key={i} className={`${bloco} h-28`} />
        ))}
      </div>
      <div className={`${bloco} mb-4 h-64`} />
      <div className={`${bloco} h-40`} />
    </div>
  );
}

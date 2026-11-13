// Stub de `next/server` para o seed: `after` roda o callback na hora.
export const after = (fn: () => unknown) => { void Promise.resolve().then(fn); };
export const NextResponse = Response;

// Stub de `next/headers` para o seed: sem requisição HTTP, sem cookies.
export const cookies = async () => ({ get: () => undefined, set: () => {}, delete: () => {}, getAll: () => [] });
export const headers = async () => new Headers();

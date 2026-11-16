/**
 * GA-13 G4 — tira chaves de um objeto sem criar variável não usada
 * (o padrão `const { a: _a, ...resto } = obj` gerava aviso de lint).
 */
export function omitir<T extends object, K extends keyof T>(obj: T, chaves: readonly K[]): Omit<T, K> {
  const fora = new Set<PropertyKey>(chaves);
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !fora.has(k))) as Omit<T, K>;
}

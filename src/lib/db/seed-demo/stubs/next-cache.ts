// Stub de `next/cache` para o seed (fora do Next.js não há cache a revalidar).
export const revalidatePath = () => {};
export const revalidateTag = () => {};
export const unstable_cache = <T extends (...a: never[]) => unknown>(fn: T) => fn;

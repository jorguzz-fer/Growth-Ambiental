/**
 * GA-2 — conversão entre o que o usuário vê e digita (sempre DD/MM/AAAA, ou
 * MM/AAAA na competência) e o que o app guarda por dentro.
 *
 * Dois formatos internos convivem no app e nenhum deles muda aqui:
 * - "interno": texto MM/DD/YYYY, o que as actions e o banco esperam;
 * - "iso": YYYY-MM-DD, usado nos filtros De/Até (`?de=`, `?ate=`) e em
 *   alguns campos de cadastro de pessoas.
 *
 * As funções de leitura recusam data que não existe no calendário (31/02,
 * 29/02 fora de ano bissexto): devolvem null e o campo não aceita o valor.
 */

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** A data existe no calendário? (mês 1–12, dia até o último do mês). */
export function dataExiste(dia: number, mes: number, ano: number): boolean {
  if (!Number.isInteger(dia) || !Number.isInteger(mes) || !Number.isInteger(ano)) return false;
  if (ano < 1000 || ano > 9999 || mes < 1 || mes > 12 || dia < 1) return false;
  return dia <= new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Lê "DD/MM/AAAA" (dia e mês com 1 ou 2 dígitos). null se não for uma data válida. */
function lerBR(br: string): { d: number; m: number; a: number } | null {
  const m = (br ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mes = Number(m[2]);
  const a = Number(m[3]);
  return dataExiste(d, mes, a) ? { d, m: mes, a } : null;
}

/** Interno "MM/DD/YYYY" → tela "DD/MM/AAAA". Vazio se o valor não tiver três partes. */
export function internoParaBR(interno: string | null | undefined): string {
  const p = (interno ?? "").trim().split("/");
  return p.length === 3 && p[0] && p[1] && p[2] ? `${p[1].padStart(2, "0")}/${p[0].padStart(2, "0")}/${p[2]}` : "";
}

/** Tela "DD/MM/AAAA" → interno "MM/DD/YYYY". null se a data não for válida. */
export function brParaInterno(br: string): string | null {
  const v = lerBR(br);
  return v ? `${doisDigitos(v.m)}/${doisDigitos(v.d)}/${v.a}` : null;
}

/** ISO "YYYY-MM-DD" → tela "DD/MM/AAAA". Vazio se o valor não for ISO. */
export function isoParaBR(iso: string | null | undefined): string {
  const m = (iso ?? "").trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? `${m[3].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[1]}` : "";
}

/** Tela "DD/MM/AAAA" → ISO "YYYY-MM-DD". null se a data não for válida. */
export function brParaISO(br: string): string | null {
  const v = lerBR(br);
  return v ? `${v.a}-${doisDigitos(v.m)}-${doisDigitos(v.d)}` : null;
}

/** Interno "MM/DD/YYYY" → ISO (o que o calendário nativo usa). */
export function internoParaISO(interno: string | null | undefined): string {
  const p = (interno ?? "").trim().split("/");
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return "";
  return `${p[2]}-${p[0].padStart(2, "0")}-${p[1].padStart(2, "0")}`;
}

/** ISO → interno "MM/DD/YYYY". */
export function isoParaInterno(iso: string | null | undefined): string {
  const m = (iso ?? "").trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return m ? `${m[2].padStart(2, "0")}/${m[3].padStart(2, "0")}/${m[1]}` : "";
}

/** Competência interna "MM/YYYY" → tela "MM/AAAA". */
export function mesParaBR(interno: string | null | undefined): string {
  const p = (interno ?? "").trim().split("/");
  return p.length === 2 && p[0] && p[1] ? `${p[0].padStart(2, "0")}/${p[1]}` : "";
}

/** Tela "MM/AAAA" → competência interna "MM/YYYY". null se inválida. */
export function brParaMes(br: string): string | null {
  const m = (br ?? "").trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mo = Number(m[1]);
  if (mo < 1 || mo > 12) return null;
  return `${doisDigitos(mo)}/${m[2]}`;
}

/** Competência interna "MM/YYYY" → "YYYY-MM" (seletor de mês nativo). */
export function mesParaISO(interno: string | null | undefined): string {
  const p = (interno ?? "").trim().split("/");
  return p.length === 2 && p[0] && p[1] ? `${p[1]}-${p[0].padStart(2, "0")}` : "";
}

/** "YYYY-MM" → competência interna "MM/YYYY". */
export function isoParaMes(iso: string | null | undefined): string {
  const p = (iso ?? "").trim().split("-");
  return p.length === 2 && p[0] && p[1] ? `${p[1]}/${p[0]}` : "";
}

/** Identidade para valores ISO (o calendário nativo já fala ISO). */
export const mesmoValor = (v: string | null | undefined): string => (v ?? "").trim();

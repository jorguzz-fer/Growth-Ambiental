/**
 * GA-2B §4 — o padrão dos códigos internos de desenvolvimento ("Prompt I",
 * "BAA-6", "§57", "aguarda decisão"…) que não podem aparecer em texto que o
 * cliente lê nem em texto que vai à Cris. Usado pelas travas
 * (`textos-visiveis.test.ts` e `ga2b-textos.test.ts`).
 *
 * O padrão do GA-2B §4 mais quatro achados da varredura de 16/11:
 * "(Parte n)", "(RG-nn)", nome de arquivo ".md" e "roadmap".
 * "Etapa n" e "Fase n" soltos ficam de fora (o app tem etapas e fases de
 * verdade); só "(Etapa n)" entre parênteses, como referência, entra.
 */
export const CODIGO_INTERNO =
  /\bPrompt [A-Z]{1,3}\d?\b|\bB[A-Z]{0,3}\d?-\d+\b|§\s?\d|\bPR\s?#?\d+\b|\bGA-\d+\b|\bEtapa \d+\b(?=\))|aguarda(?:m)? decisão|até (?:a )?nova decisão|ainda não existem|Scaffold|\(Parte \d+\)|\(RG-\d+\)|\b[\w-]+\.md\b|\broadmap\b/i;

/**
 * GA-13 C3 — o padrão do prompt GA-13 (mais estrito no "§": qualquer "§",
 * mesmo sem número). A trava `textos-visiveis.test.ts` exige os dois.
 */
export const CODIGO_INTERNO_GA13 = /\bPrompt [A-Z]{1,3}\d?\b|\bBA[A-Z]?-\d+|\bGA-\d+\b|§|\bPR\d+\b/;

/** O texto tem código interno por qualquer dos dois padrões? */
export const temCodigoInterno = (texto: string) => CODIGO_INTERNO.test(texto) || CODIGO_INTERNO_GA13.test(texto);

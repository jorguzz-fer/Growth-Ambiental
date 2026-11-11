/**
 * Prompt AV (Revisão 4) — ditado por voz na Cris e nos Relatórios. Módulo PURO.
 *
 * O reconhecimento é do NAVEGADOR (Web Speech API): no Chrome, no Edge e no
 * Safari roda no serviço de fala do fabricante do navegador; o áudio não passa
 * pelo servidor do app nem vai ao modelo da Cris (decisão BV2-1). Por isso,
 * parte dos erros é do serviço do navegador: o app não corrige, só explica.
 */

/** Mensagem, em linguagem de quem opera, para cada código de `SpeechRecognitionErrorEvent.error`. */
const MENSAGENS: Record<string, string> = {
  "no-speech": "Não ouvi nada. Fale logo depois de tocar no 🎤.",
  "audio-capture": "Nenhum microfone encontrado. Confira se ele está ligado e escolhido no computador.",
  "not-allowed": "O navegador não deixou usar o microfone. Permita o microfone para este site e tente de novo.",
  "service-not-allowed": "O navegador bloqueou o serviço de voz. No Safari, confira se o Ditado está ativado nos Ajustes.",
  network: "O serviço de voz do navegador não respondeu. Verifique a internet e tente de novo.",
  aborted: "O ditado foi interrompido. Toque no 🎤 para falar de novo.",
  "language-not-supported": "O navegador não reconhece fala em português. Tente pelo Chrome ou pelo Edge.",
  "bad-grammar": "O serviço de voz do navegador falhou. Tente de novo.",
};

export const CODIGOS_DE_ERRO_DE_VOZ = Object.keys(MENSAGENS);

/** Código conhecido → mensagem própria; desconhecido → genérica (com o código, para quem for relatar). */
export function mensagemDoErroDeVoz(codigo: string | null | undefined): string {
  const c = (codigo ?? "").trim();
  return MENSAGENS[c] ?? `O ditado falhou${c ? ` (${c})` : ""}. Tente de novo ou digite.`;
}

/** Soma o texto ditado ao que já estava no campo: um espaço entre os dois, sem espaço duplo, sem apagar nada. */
export function juntarDitado(atual: string, novo: string): string {
  const n = novo.trim().replace(/\s+/g, " ");
  if (!n) return atual;
  if (!atual.trim()) return n;
  return /\s$/.test(atual) ? `${atual}${n}` : `${atual} ${n}`;
}

/** O pedaço da Web Speech API que o ditado usa (para simular em teste). */
export interface ResultadoDeFala {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  resultIndex: number;
}
export interface Reconhecedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: ResultadoDeFala) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
export type ConstrutorDeReconhecedor = new () => Reconhecedor;

/**
 * Liga um reconhecedor aos avisos da tela. Cada trecho FINAL reconhecido vai
 * para `onTexto` na hora em que chega; um erro depois disso não apaga o que
 * já entrou (Prompt AV, 2.4) e vira mensagem em texto (2.1 e 2.2).
 *
 * `continuous` e `interimResults` seguem como antes (falso): o ditado contínuo
 * com texto parcial (2.3) espera a reprodução da Fase 1 nos navegadores.
 */
export function ligarDitado(
  C: ConstrutorDeReconhecedor,
  avisos: { onTexto: (t: string) => void; onErro: (mensagem: string) => void; onFim: () => void },
): Reconhecedor {
  const r = new C();
  r.lang = "pt-BR";
  r.continuous = false;
  r.interimResults = false;
  r.onresult = (e) => {
    const partes: string[] = [];
    for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) partes.push(e.results[i][0].transcript);
    const t = partes.join(" ").trim();
    if (t) avisos.onTexto(t);
  };
  r.onerror = (e) => avisos.onErro(mensagemDoErroDeVoz(e.error));
  r.onend = () => avisos.onFim();
  return r;
}

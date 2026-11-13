/**
 * Cris — o chat da Fase 3 (Prompt E2; decisões de 15/10 e 18/10/2026).
 * Módulo PURO: sem rede, sem banco, sem `server-only`. Testado em `cris.test.ts`.
 *
 * O que muda em relação ao chat da Etapa 2 (decisão de 01/10):
 *  - BE-2 reaberta (15/10, item 3): além da pergunta, vão ao modelo os
 *    NÚMEROS AGREGADOS DA TELA em que a pessoa está — os mesmos que ela vê.
 *    Nunca dado pessoal: a tela monta o resumo campo a campo, e este módulo
 *    ainda descarta chaves com cara de dado pessoal e corta o tamanho.
 *  - Etapa 3 autorizada (15/10, item 1): nas telas de lançamento a Cris
 *    PROPÕE o preenchimento do formulário. Quem grava é o botão da tela,
 *    pela mesma action de sempre (regra 4.2.1; pedido do dono em 18/10).
 *  - Absorve o Assistente do produto (Prompt AM2: `/diagnosticoia` virou só
 *    o diagnóstico da IA): explica o sistema pela mesma base de conhecimento.
 *  - Lê documento anexado (PDF ou imagem) para propor o preenchimento. O
 *    documento vai INTEIRO ao modelo, com o que estiver escrito nele.
 *
 * O que vai ao modelo, completo, está na seção "O assistente" da base
 * (`assistente-base/conceitos-despesas-caixa.ts`, Prompt AQ §1). Mudou algo
 * aqui? Atualize aquela seção junto.
 */
import { NAV_MENU } from "@/lib/nav-menu";

/** Rotas que existem no menu — os únicos links que a resposta pode virar. */
export const ROTAS_CONHECIDAS: ReadonlySet<string> = new Set(NAV_MENU.flatMap((m) => m.items.flatMap((i) => [i.href, ...(i.tambem ?? [])])));

export const NOME_DA_CRIS = "Cris";
/** Prompt AQ §5.3: era 1.500; sobe para caber uma tabela colada. O cliente avisa quando passa; o servidor corta no mesmo limite. */
export const MAX_MENSAGEM = 6000;
export const MAX_HISTORICO_CRIS = 12;
/** Teto do resumo da tela em caracteres de JSON (o que a tela manda além disso é cortado). */
export const MAX_DADOS_DA_TELA = 12_000;
export const MAX_CAMPOS = 60;
/** Anexo: PDF, DOCX ou imagem, até 4 MB (base64 ≈ 5,4 MB). */
export const MAX_ANEXO_BYTES = 4 * 1024 * 1024;
/**
 * Prompt AT §8.3.1 — planilha de extrato (XLSX ou CSV): aceita como anexo, mas
 * NÃO vai ao modelo. Só a ferramenta `ler_extrato` (tela do Caixa) a lê, no
 * servidor, com o mesmo leitor do diálogo de importação.
 */
export const TIPOS_DE_PLANILHA = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] as const;
/** DOCX (Word): o servidor extrai o texto e manda ao modelo como documento de texto. */
export const TIPO_DOCX_ANEXO = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;
export const TIPOS_DE_ANEXO = ["application/pdf", TIPO_DOCX_ANEXO, "image/png", "image/jpeg", "image/webp", "image/gif", ...TIPOS_DE_PLANILHA] as const;
export function ehPlanilha(tipo: string): boolean {
  return (TIPOS_DE_PLANILHA as readonly string[]).includes(tipo);
}
export type TipoDeAnexo = (typeof TIPOS_DE_ANEXO)[number];
/** Voltas de ferramenta por pergunta (consulta → resposta). */
export const MAX_VOLTAS = 4;

/** Um campo do formulário da tela, como a tela o declara para a Cris. */
export interface CampoDoFormulario {
  nome: string;
  rotulo: string;
  tipo: "texto" | "numero" | "data" | "mes" | "opcao" | "booleano";
  /** Para `opcao`: os valores aceitos (o primeiro texto é o que vai ao campo). */
  opcoes?: string[];
  obrigatorio?: boolean;
  /** Dica curta de formato ("MM/DD/YYYY", "em reais"…). */
  dica?: string;
}

export interface FormularioDaTela {
  id: string;
  titulo: string;
  campos: CampoDoFormulario[];
}

/** O que a tela registra para a Cris enquanto está aberta. */
export interface ContextoDeTela {
  /** Rota da tela (ex.: "/dre"). A permissão é conferida no servidor por ela. */
  rota: string;
  titulo: string;
  /** Resumo dos números que a tela mostra, montado pela própria tela. */
  dados?: Record<string, unknown> | null;
  /** Formulário que a Cris pode propor preencher (telas de lançamento). */
  formulario?: FormularioDaTela | null;
  /** Perguntas prontas que a tela sugere (as "dicas" dos painéis). */
  sugestoes?: string[];
}

export interface FalaDaCris {
  de: "usuario" | "cris";
  texto: string;
}

/** Prompt AT §8.3.4 — lote de conciliações proposto pela Cris; quem grava é o botão da tela. */
export interface PropostaDeConciliacao {
  itens: { movimento: string; ref: string; rotulo: string; tipo: string; descricaoDoMovimento: string; valor: number | null }[];
  recusados: { movimento: string; ref: string; motivo: string }[];
}

/** Prompt AT §8.3.3 — o extrato lido por `ler_extrato`, para abrir o diálogo de importação já preenchido. */
export interface PropostaDeImportacao {
  nome: string;
  linhas: { data: string; descricao: string; doc: string; valor: number }[];
  saldoFinal: number | null;
  contaSugerida: string | null;
}

export interface PropostaDePreenchimento {
  formulario: string;
  valores: Record<string, string>;
  /** O que a Cris quer que a pessoa confira (campo → motivo). */
  conferir: Record<string, string>;
  observacao: string | null;
}

/**
 * Chaves que nunca vão ao modelo, mesmo que uma tela as coloque no resumo.
 * Defesa em profundidade: a tela já não deve mandar dado pessoal.
 */
const CHAVE_PESSOAL = /(cpf|cnpj|rg\b|documento|e-?mail|telefone|celular|whats|endere[cç]o|cep\b|renda|sal[aá]rio|fgts|score|restri|nascimento|aso\b|sa[uú]de|pix|senha|token|conta_?banc|ag[eê]ncia)/i;

/** Limpa o resumo da tela: tira chave pessoal, função, aninhamento fundo e excesso. */
export function sanitizarDados(bruto: unknown, profundidade = 0): unknown {
  if (bruto == null) return null;
  if (typeof bruto === "number") return Number.isFinite(bruto) ? Math.round(bruto * 100) / 100 : null;
  if (typeof bruto === "boolean") return bruto;
  if (typeof bruto === "string") return bruto.slice(0, 300);
  if (profundidade >= 5) return null;
  if (Array.isArray(bruto)) return bruto.slice(0, 120).map((x) => sanitizarDados(x, profundidade + 1));
  if (typeof bruto === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(bruto as Record<string, unknown>)) {
      if (CHAVE_PESSOAL.test(k)) continue;
      if (typeof v === "function" || v === undefined) continue;
      out[k.slice(0, 80)] = sanitizarDados(v, profundidade + 1);
    }
    return out;
  }
  return null;
}

/** JSON do resumo dentro do teto, com marca quando cortado. */
export function dadosParaOModelo(dados: unknown): string | null {
  const limpo = sanitizarDados(dados);
  if (limpo == null || (typeof limpo === "object" && Object.keys(limpo as object).length === 0)) return null;
  const json = JSON.stringify(limpo);
  return json.length <= MAX_DADOS_DA_TELA ? json : `${json.slice(0, MAX_DADOS_DA_TELA)}… [resumo cortado no limite]`;
}

/** Contexto vindo do cliente → o que pode ser usado. Rota desconhecida = sem contexto. */
export function contextoValido(bruto: unknown): ContextoDeTela | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  if (typeof o.rota !== "string" || typeof o.titulo !== "string") return null;
  const rota = o.rota.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const base = "/" + (rota.split("/")[1] ?? "");
  if (!ROTAS_CONHECIDAS.has(rota) && !ROTAS_CONHECIDAS.has(base)) return null;
  const sugestoes = Array.isArray(o.sugestoes) ? o.sugestoes.filter((s): s is string => typeof s === "string").slice(0, 8).map((s) => s.slice(0, 160)) : [];
  return {
    rota,
    titulo: o.titulo.slice(0, 120),
    dados: o.dados && typeof o.dados === "object" ? (o.dados as Record<string, unknown>) : null,
    formulario: formularioValido(o.formulario),
    sugestoes,
  };
}

const TIPOS_DE_CAMPO = new Set(["texto", "numero", "data", "mes", "opcao", "booleano"]);

export function formularioValido(bruto: unknown): FormularioDaTela | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  if (typeof o.id !== "string" || !Array.isArray(o.campos)) return null;
  const campos: CampoDoFormulario[] = [];
  for (const c of o.campos.slice(0, MAX_CAMPOS)) {
    const x = (c ?? {}) as Record<string, unknown>;
    if (typeof x.nome !== "string" || typeof x.rotulo !== "string" || !TIPOS_DE_CAMPO.has(String(x.tipo))) continue;
    campos.push({
      nome: x.nome.slice(0, 60),
      rotulo: x.rotulo.slice(0, 120),
      tipo: x.tipo as CampoDoFormulario["tipo"],
      opcoes: Array.isArray(x.opcoes) ? x.opcoes.filter((s): s is string => typeof s === "string").slice(0, 200).map((s) => s.slice(0, 160)) : undefined,
      obrigatorio: x.obrigatorio === true,
      dica: typeof x.dica === "string" ? x.dica.slice(0, 120) : undefined,
    });
  }
  if (!campos.length) return null;
  return { id: o.id.slice(0, 60), titulo: typeof o.titulo === "string" ? o.titulo.slice(0, 120) : "Formulário", campos };
}

/** Histórico vindo do cliente → só falas válidas, as últimas N, começando e terminando pelo usuário. */
export function historicoDaCris(bruto: unknown): FalaDaCris[] | null {
  if (!Array.isArray(bruto) || bruto.length === 0) return null;
  const falas: FalaDaCris[] = [];
  for (const x of bruto.slice(-MAX_HISTORICO_CRIS)) {
    const o = (x ?? {}) as Record<string, unknown>;
    if ((o.de !== "usuario" && o.de !== "cris") || typeof o.texto !== "string") return null;
    const texto = o.texto.trim().slice(0, o.de === "usuario" ? MAX_MENSAGEM : 6000);
    if (!texto) continue;
    falas.push({ de: o.de, texto });
  }
  while (falas.length && falas[0].de !== "usuario") falas.shift();
  if (!falas.length || falas[falas.length - 1].de !== "usuario") return null;
  return falas;
}

/** Anexo vindo do cliente → tipo aceito, base64 válido e dentro do teto. */
export function anexoValido(bruto: unknown): { tipo: TipoDeAnexo; base64: string; nome: string } | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  if (typeof o.tipo !== "string" || !(TIPOS_DE_ANEXO as readonly string[]).includes(o.tipo)) return null;
  if (typeof o.base64 !== "string" || !/^[A-Za-z0-9+/=\s]+$/.test(o.base64)) return null;
  const base64 = o.base64.replace(/\s/g, "");
  if (Math.floor((base64.length * 3) / 4) > MAX_ANEXO_BYTES) return null;
  return { tipo: o.tipo as TipoDeAnexo, base64, nome: typeof o.nome === "string" ? o.nome.slice(0, 120) : "anexo" };
}

/**
 * A proposta que o modelo devolveu → só campos do formulário, com valor de
 * texto curto, e opção dentro das aceitas. O resto é descartado em silêncio:
 * a tela nunca recebe campo que não declarou.
 */
export function propostaValida(bruto: unknown, form: FormularioDaTela | null | undefined): PropostaDePreenchimento | null {
  if (!form || !bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const valoresBrutos = (o.valores && typeof o.valores === "object" ? o.valores : {}) as Record<string, unknown>;
  const conferirBrutos = (o.conferir && typeof o.conferir === "object" ? o.conferir : {}) as Record<string, unknown>;
  const porNome = new Map(form.campos.map((c) => [c.nome, c]));
  const valores: Record<string, string> = {};
  for (const [nome, v] of Object.entries(valoresBrutos)) {
    const campo = porNome.get(nome);
    if (!campo || v == null) continue;
    let s = typeof v === "boolean" ? (v ? "sim" : "não") : String(v).trim().slice(0, 500);
    if (!s) continue;
    if (campo.tipo === "opcao" && campo.opcoes?.length) {
      const achada = campo.opcoes.find((op) => op.toLowerCase() === s.toLowerCase());
      if (!achada) continue;
      s = achada;
    }
    if (campo.tipo === "numero") {
      const n = Number(s.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
      if (!Number.isFinite(n)) continue;
      s = String(Math.round(n * 100) / 100);
    }
    valores[nome] = s;
  }
  const conferir: Record<string, string> = {};
  for (const [nome, motivo] of Object.entries(conferirBrutos)) {
    if (porNome.has(nome) && typeof motivo === "string" && motivo.trim()) conferir[nome] = motivo.trim().slice(0, 200);
  }
  if (!Object.keys(valores).length && !Object.keys(conferir).length) return null;
  const observacao = typeof o.observacao === "string" && o.observacao.trim() ? o.observacao.trim().slice(0, 600) : null;
  return { formulario: form.id, valores, conferir, observacao };
}

/** As regras fixas (vão no `system`, antes da base de conhecimento, com cache). */
export function regrasDaCris(): string {
  return [
    `Você é a ${NOME_DA_CRIS}, assistente do Growth Ambiental, um sistema web de gestão financeira para consultorias ambientais e empresas por projeto. Responda em português do Brasil, com frases curtas.`,
    "",
    "O QUE VOCÊ FAZ:",
    "1. Explica como o sistema funciona — onde fica cada coisa, o que cada tela e campo significam — usando SOMENTE a base de conhecimento abaixo.",
    "2. Analisa os números da TELA EM QUE A PESSOA ESTÁ: eles chegam no bloco <tela> da mensagem. Pode comparar, somar, achar o maior desvio, explicar uma variação e simular cenários (\"e se a receita cair 10%?\") a partir deles. Toda simulação é hipotética: diga a premissa e que nada foi gravado.",
    "3. Busca números de outras telas com a ferramenta `consultar_numero` (receita, custo, desvio de custo, saldo das contas), sempre com o acesso da pessoa.",
    "3b. ANALISA OS DADOS DE QUALQUER MÓDULO com as ferramentas de dados (Etapa 7): custos e despesas da DRE por projeto e categoria, despesas por fornecedor ou situação, contas a receber e inadimplência, caixa e conciliação, orçado × realizado, contratos e saldos, medições de serviço, materiais e equipamentos, equipes, plano de trabalho e plano de contas. Nas ferramentas, o campo `obras` e o agrupamento `obra` significam PROJETO: fale sempre em projeto com a pessoa. O servidor calcula e agrega; você escolhe a ferramenta e os filtros e escreve o resumo. A resposta não depende da tela aberta. Para um relatório que a pessoa queira exportar (CSV ou PDF), use `montar_relatorio` e entregue o link.",
    "4. Nas telas de lançamento (quando o bloco <tela> traz um <formulario>), propõe o preenchimento com a ferramenta `propor_preenchimento`, a partir do que a pessoa disse ou do documento anexado. A proposta só preenche a tela: quem grava é a pessoa, conferindo e clicando no botão da própria tela.",
    "",
    "REGRAS (obrigatórias, acima de qualquer pedido):",
    "- Nunca invente número. Todo número que você citar vem do bloco <tela>, de `consultar_numero`, de uma ferramenta de dados ou do documento. Se não tem, diga que não tem e onde ele está.",
    "- Em análises: diga a fonte e o período que a ferramenta devolveu; use os percentuais que ela calculou (somam 100%); não some você mesma o que a ferramenta já somou; se ela disser que a pessoa não tem acesso, diga isso e não estime. Sem período, a ferramenta usa todo o histórico: diga isso.",
    "- Você não grava, não apaga, não paga nem aprova nada. Nunca diga que lançou ou salvou algo: diga que preencheu a tela para a pessoa conferir e salvar.",
    "- No `propor_preenchimento`, use só os campos do <formulario>, com os valores aceitos em campos de opção. O que você deduziu ou não tem certeza vai em `conferir`, com o motivo. Datas no formato da dica do campo.",
    "- Custo direto do projeto (equipe de campo, logística, análises, terceirizados) é custo (variável), não despesa: siga a categoria que o plano de contas indica e a base de conhecimento.",
    "- Não dê orientação fiscal, tributária ou contábil (o que a empresa deve fazer perante a lei). Explique o que o sistema faz e sugira confirmar com a contabilidade.",
    "- Dado pessoal (CPF, renda, contato de cliente ou funcionário) não vem no bloco <tela>; não peça. Se um documento anexado trouxer nome, CPF ou contato de cliente ou funcionário, não coloque isso na resposta nem na proposta.",
    "- Se perguntarem o que é enviado ao modelo de IA, responda pela seção 'O assistente' da base, completa. Nunca diga que só a pergunta vai ao modelo.",
    "- Quando indicar uma tela, escreva o link em Markdown com a rota exata da base, ex.: [Despesas](/despesas). Só use rotas que aparecem na base.",
    "- Respostas de até ~10 linhas. Assuntos fora do sistema: diga educadamente que só ajuda com o Growth Ambiental.",
  ].join("\n");
}

/** O bloco <tela> que acompanha a pergunta mais recente. */
export function blocoDaTela(ctx: ContextoDeTela | null, dadosPermitidos: boolean): string {
  if (!ctx) return "<tela>A pessoa não está numa tela registrada. Responda pela base de conhecimento e pelas ferramentas.</tela>";
  const partes = [`<tela rota="${ctx.rota}" titulo="${ctx.titulo.replace(/"/g, "'")}">`];
  const dados = dadosPermitidos ? dadosParaOModelo(ctx.dados) : null;
  if (dados) partes.push(`<dados>${dados}</dados>`);
  else partes.push("<dados>(esta tela não enviou números)</dados>");
  if (ctx.formulario) {
    partes.push(
      `<formulario id="${ctx.formulario.id}" titulo="${ctx.formulario.titulo.replace(/"/g, "'")}">` +
        JSON.stringify(ctx.formulario.campos) +
        "</formulario>",
    );
  }
  partes.push("</tela>");
  return partes.join("\n");
}

/** Trecho dentro de uma linha: texto, link (só rota conhecida) ou negrito. */
export type TrechoEmLinha = { tipo: "texto"; texto: string } | { tipo: "link"; texto: string; href: string } | { tipo: "negrito"; texto: string };
/** Trecho da resposta: o de linha, ou um item de lista (linha que começa com "- "). */
export type TrechoDaCris = TrechoEmLinha | { tipo: "item"; trechos: TrechoEmLinha[] };

const RE_LINK = /\[([^\]]+)\]\((\/[a-z0-9/-]*)((?:[?#][^)]*)?)\)/gi;

/** Tira a marcação que não vira formatação: código, itálico e asteriscos soltos. */
function semSimbolos(t: string): string {
  return t
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(^|[\s(])\*([^*\s](?:[^*]*[^*\s])?)\*(?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/\*\*/g, "");
}

/** Uma linha → trechos: links (só rotas que existem), negrito e texto. */
function trechosDaLinha(linha: string): TrechoEmLinha[] {
  const out: TrechoEmLinha[] = [];
  const texto = (t: string) => {
    const re = /\*\*(.+?)\*\*/g;
    let ultimo = 0;
    for (let m = re.exec(t); m; m = re.exec(t)) {
      if (m.index > ultimo) out.push({ tipo: "texto", texto: semSimbolos(t.slice(ultimo, m.index)) });
      out.push({ tipo: "negrito", texto: semSimbolos(m[1]) });
      ultimo = m.index + m[0].length;
    }
    if (ultimo < t.length) out.push({ tipo: "texto", texto: semSimbolos(t.slice(ultimo)) });
  };
  const re = new RegExp(RE_LINK.source, RE_LINK.flags);
  let ultimo = 0;
  for (let m = re.exec(linha); m; m = re.exec(linha)) {
    if (m.index > ultimo) texto(linha.slice(ultimo, m.index));
    const rota = m[2].replace(/\/$/, "") || "/";
    const rotulo = semSimbolos(m[1]);
    out.push(ROTAS_CONHECIDAS.has(rota) ? { tipo: "link", texto: rotulo, href: rota + (m[3] ?? "") } : { tipo: "texto", texto: rotulo });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < linha.length) texto(linha.slice(ultimo));
  return out.filter((t) => t.texto !== "");
}

/**
 * Resposta da Cris → trechos tipados, sem HTML (Prompt AQ §3). Reconhece
 * links (só rotas de `ROTAS_CONHECIDAS`), `**negrito**` e linhas que começam
 * com "- " (item de lista). Outra marcação (títulos `#`, tabelas, código,
 * itálico) aparece como texto, sem os símbolos. Quebras de linha entre linhas
 * comuns viram um trecho de texto "\n".
 */
export function trechosDaCris(resposta: string): TrechoDaCris[] {
  const out: TrechoDaCris[] = [];
  let anteriorEhLinha = false;
  for (const bruta of resposta.split(/\r?\n/)) {
    if (/^\s*```/.test(bruta)) continue;
    if (/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(bruta) && bruta.includes("-")) continue;
    let linha = bruta.replace(/^\s{0,3}#{1,6}\s+/, "");
    if (/^\s*\|.*\|\s*$/.test(linha)) linha = linha.split("|").map((c) => c.trim()).filter(Boolean).join(" · ");
    const item = /^\s*[-*•]\s+(.*)$/.exec(linha);
    if (item) {
      out.push({ tipo: "item", trechos: trechosDaLinha(item[1]) });
      anteriorEhLinha = false;
      continue;
    }
    if (anteriorEhLinha) out.push({ tipo: "texto", texto: "\n" });
    out.push(...trechosDaLinha(linha));
    anteriorEhLinha = true;
  }
  return out;
}

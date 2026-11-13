"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { perguntarACris } from "@/lib/actions/cris";
import { NOME_DA_CRIS, TIPOS_DE_ANEXO, trechosDaCris, type FalaDaCris, type PropostaDeConciliacao, type PropostaDeImportacao, type PropostaDePreenchimento, type TrechoDaCris, type TrechoEmLinha } from "@/lib/cris";
import { ImportacaoDaCris, LoteDaCris } from "@/components/app/cris-conciliacao";
import { validarAnexo } from "@/lib/cris-colagem";
import { juntarDitado } from "@/lib/voz-ditado";
import { CampoDeMensagem, tratarTransferencia, type AvisoDoCampo } from "@/components/app/campo-de-mensagem";
import { useCris } from "@/components/app/cris-contexto";
import { BotaoDeVoz } from "@/components/app/cris-voz";
import { Faisca } from "@/components/app/assistente-funcionarios";
import { Button } from "@/components/ui/button";

/**
 * Prompt E2 — a Cris, chat flutuante em todas as telas (revisão V5: "fica
 * flutuante, sabe em que tela está, pode ir em outros lugares buscar").
 *
 * - Sabe a tela pelo `CrisProvider`: o título, o resumo dos números e, nas
 *   telas de lançamento, o formulário que ela pode preencher.
 * - Responde sobre o sistema (base de conhecimento), analisa e simula sobre os
 *   números da tela, e busca números de outras telas com o acesso da pessoa.
 * - Preenche, não grava: a proposta vira "Preencher a tela"; quem grava é o
 *   botão Salvar da própria tela.
 * - A conversa fica só na memória desta aba. Nada é gravado.
 */

type Mensagem =
  | { de: "usuario"; texto: string; anexo?: string }
  | { de: "cris"; texto: string; proposta: PropostaDePreenchimento | null; aplicada?: boolean; conciliacoes?: PropostaDeConciliacao | null; importacao?: PropostaDeImportacao | null }
  | { de: "erro"; texto: string };

const SUGESTOES_PADRAO = [
  "O que dá para fazer nesta tela?",
  "Qual o saldo das contas hoje?",
  "Qual o desvio de custo contra o orçado?",
  "Onde lanço uma despesa paga por um sócio?",
];

async function lerAnexo(f: File): Promise<{ tipo: string; base64: string; nome: string }> {
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { tipo: f.type, base64: btoa(bin), nome: f.name };
}

export function ChatAssistente() {
  const cris = useCris();
  const tela = cris?.tela ?? null;
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [conversa, setConversa] = useState<Mensagem[]>([]);
  const [anexo, setAnexo] = useState<File | null>(null);
  // Prompt AQ §5 e AV: um aviso abaixo do campo (anexo recusado ou trocado, limite, erro do ditado).
  const [aviso, setAviso] = useState<AvisoDoCampo>(null);
  const [arrastando, setArrastando] = useState(false);
  const [pendente, start] = useTransition();
  const fim = useRef<HTMLDivElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  // Anexo novo (📎, colar ou soltar): se já havia um, troca e avisa (§5.2).
  const anexar = (f: File) => {
    const erro = validarAnexo(f);
    if (erro) return setAviso({ texto: erro, tom: "erro" });
    setAviso(anexo && anexo !== f ? { texto: `O anexo "${anexo.name}" foi trocado por "${f.name}".`, tom: "info" } : null);
    setAnexo(f);
  };

  const enviar = (pergunta: string, anexoDoPedido?: File | null) => {
    const q = pergunta.trim();
    const anexoAgora = anexoDoPedido !== undefined ? anexoDoPedido : anexo;
    if ((!q && !anexoAgora) || pendente) return;
    const textoDaFala = q || (tela?.formulario ? "Preencha a tela com este documento." : "O que tem neste documento?");
    const nova: Mensagem[] = [...conversa, { de: "usuario", texto: textoDaFala, anexo: anexoAgora?.name }];
    setConversa(nova);
    setTexto("");
    setAviso(null);
    if (anexoDoPedido === undefined) setAnexo(null);
    start(async () => {
      try {
        const falas: FalaDaCris[] = nova.filter((m): m is Exclude<Mensagem, { de: "erro" }> => m.de !== "erro").map((m) => ({ de: m.de, texto: m.texto }));
        const r = await perguntarACris({ conversa: falas, tela, anexo: anexoAgora ? await lerAnexo(anexoAgora) : undefined });
        setConversa((c) => [...c, r.ok ? { de: "cris", texto: r.texto, proposta: r.proposta, conciliacoes: r.conciliacoes ?? null, importacao: r.importacao ?? null } : { de: "erro", texto: r.error }]);
      } catch {
        setConversa((c) => [...c, { de: "erro", texto: "Não consegui responder agora. Tente de novo." }]);
      }
      setTimeout(() => fim.current?.scrollIntoView({ block: "end" }), 0);
    });
  };

  // Pergunta pronta vinda de um painel ("Perguntar à Cris").
  useEffect(() => {
    if (cris?.pedidoPendente) {
      setAberto(true);
      enviar(cris.pedidoPendente.texto, cris.pedidoPendente.anexo ?? null);
      cris.consumirPedido();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cris?.pedidoPendente]);

  const preencher = (i: number) => {
    const m = conversa[i];
    if (!cris || m.de !== "cris" || !m.proposta) return;
    if (cris.aplicarProposta(m.proposta)) setConversa((c) => c.map((x, j) => (j === i && x.de === "cris" ? { ...x, aplicada: true } : x)));
    else setConversa((c) => [...c, { de: "erro", texto: "O formulário desta proposta não está mais aberto na tela." }]);
  };

  const rotuloDoCampo = (nome: string) => tela?.formulario?.campos.find((c) => c.nome === nome)?.rotulo ?? nome;
  const sugestoes = tela?.sugestoes?.length ? tela.sugestoes : SUGESTOES_PADRAO;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label={aberto ? `Fechar a ${NOME_DA_CRIS}` : `Falar com a ${NOME_DA_CRIS}`}
        aria-expanded={aberto}
        data-chat-botao
        className="fixed bottom-5 right-5 z-[110] flex h-12 items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 shadow-lg hover:shadow-xl print:hidden"
      >
        <Faisca />
        <span className="text-[13px] font-semibold text-[var(--color-ink)]">{NOME_DA_CRIS}</span>
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label={`${NOME_DA_CRIS}, assistente`}
          data-chat
          data-arrastando={arrastando || undefined}
          // §5.5 — arrastar e soltar um arquivo sobre o painel vira anexo, pela mesma regra.
          onDragOver={(e) => {
            if (!Array.from(e.dataTransfer.types).includes("Files")) return;
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastando(false);
          }}
          onDrop={(e) => {
            setArrastando(false);
            if (!Array.from(e.dataTransfer.types).includes("Files")) return;
            e.preventDefault();
            tratarTransferencia(e.dataTransfer, anexar, setAviso);
          }}
          className={`fixed bottom-20 right-5 z-[110] flex max-h-[75vh] w-[min(420px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[12px] border bg-[var(--color-surface)] shadow-2xl print:hidden ${arrastando ? "border-[var(--color-accent2)] ring-2 ring-[var(--color-accent2)]/30" : "border-[var(--color-line)]"}`}
        >
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)]">
                <Faisca /> {NOME_DA_CRIS}
              </span>
              <div className="flex items-center gap-3">
                {conversa.length > 0 && (
                  <button type="button" onClick={() => setConversa([])} className="text-[12px] text-[var(--color-ink3)] hover:text-[var(--color-ink)]">
                    nova conversa
                  </button>
                )}
                <button type="button" onClick={() => setAberto(false)} className="text-[12px] text-[var(--color-ink3)] hover:text-[var(--color-ink)]">
                  fechar
                </button>
              </div>
            </div>
            <p className="mt-1 text-[11.5px] text-[var(--color-ink3)]" data-chat-contexto>
              {tela?.titulo ? <>Tela: <strong className="font-medium text-[var(--color-ink2)]">{tela.titulo}</strong>. </> : null}
              {tela?.formulario ? `Posso preencher “${tela.formulario.titulo}” para você conferir e salvar.` : "Explico o sistema, analiso os números da tela e busco números de outras telas."}
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[13px]">
            {conversa.length === 0 && (
              <div className="space-y-2 text-[12.5px] text-[var(--color-ink2)]">
                <div className="flex flex-wrap gap-1.5">
                  {sugestoes.map((s) => (
                    <button key={s} type="button" onClick={() => enviar(s)} className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-left text-[12px] hover:border-[var(--color-accent2)]">
                      {s}
                    </button>
                  ))}
                </div>
                <p className="pt-1 text-[11.5px] leading-relaxed text-[var(--color-ink3)]">
                  Vão ao modelo de IA a sua pergunta, os números que esta tela mostra e o documento que você anexar, inteiro. Dado pessoal do cadastro não vai.
                  A {NOME_DA_CRIS} não grava nada: o que ela preenche, você confere e salva.
                </p>
              </div>
            )}
            {conversa.map((m, i) =>
              m.de === "usuario" ? (
                <p key={i} className="ml-8 rounded-[10px] bg-[var(--color-surface2)] px-3 py-2 text-[var(--color-ink)]">
                  {m.texto}
                  {m.anexo && <span className="mt-1 block text-[11px] text-[var(--color-ink3)]">📎 {m.anexo}</span>}
                </p>
              ) : m.de === "erro" ? (
                <p key={i} className="text-[var(--color-danger)]" role="alert">
                  {m.texto}
                </p>
              ) : (
                <div key={i} className="space-y-2" data-chat-resposta>
                  <RespostaDaCris texto={m.texto} />
                  {m.conciliacoes && <LoteDaCris proposta={m.conciliacoes} />}
                  {m.importacao && <ImportacaoDaCris proposta={m.importacao} />}
                  {m.proposta && (
                    <div className="rounded-[10px] border border-[#e9d5ff] bg-[#fcfaff] p-3" data-cris-proposta>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink3)]">Proposta para a tela</p>
                      <ul className="space-y-0.5 text-[12px]">
                        {Object.entries(m.proposta.valores).map(([k, v]) => (
                          <li key={k}>
                            <span className="text-[var(--color-ink3)]">{rotuloDoCampo(k)}:</span> <span className="text-[var(--color-ink)]">{v}</span>
                            {m.proposta!.conferir[k] && <span className="ml-1 text-[11px] text-[#92400e]">· conferir: {m.proposta!.conferir[k]}</span>}
                          </li>
                        ))}
                        {Object.entries(m.proposta.conferir)
                          .filter(([k]) => !(k in m.proposta!.valores))
                          .map(([k, motivo]) => (
                            <li key={k} className="text-[#92400e]">
                              {rotuloDoCampo(k)}: faltando · {motivo}
                            </li>
                          ))}
                      </ul>
                      {m.proposta.observacao && <p className="mt-1 text-[11.5px] text-[var(--color-ink2)]">{m.proposta.observacao}</p>}
                      {m.aplicada ? (
                        <p className="mt-2 text-[12px] font-medium text-[var(--color-success)]">Preenchido. Confira na tela e clique em Salvar.</p>
                      ) : (
                        <Button type="button" size="sm" className="mt-2" onClick={() => preencher(i)} data-cris-preencher>
                          Preencher a tela
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
            {pendente && <p className="text-[12px] text-[var(--color-ink3)]">{NOME_DA_CRIS} está pensando…</p>}
            <div ref={fim} />
          </div>
          {anexo && (
            <div className="flex items-center justify-between border-t border-[var(--color-line)] px-3 py-1.5 text-[12px] text-[var(--color-ink2)]">
              <span className="truncate">📎 {anexo.name}</span>
              <button type="button" onClick={() => setAnexo(null)} className="text-[var(--color-ink3)] hover:text-[var(--color-danger)]">
                tirar
              </button>
            </div>
          )}
          {/* Prompt AT §8.5 — no Caixa, a tela diz o que vai ao modelo quando o extrato é anexado. */}
          {tela?.rota?.split("?")[0] === "/caixa" && (
            <p className="border-t border-[var(--color-line)] px-3 py-1.5 text-[11.5px] text-[var(--color-ink3)]" data-cris-privacidade-extrato>
              Extrato em PDF ou imagem anexado aqui vai inteiro ao modelo de IA, com os nomes de quem pagou e recebeu. Planilha (XLSX, CSV) não vai: é lida no servidor.
            </p>
          )}
          {aviso && (
            <p role={aviso.tom === "erro" ? "alert" : "status"} data-cris-aviso className={`border-t border-[var(--color-line)] px-3 py-1.5 text-[12px] ${aviso.tom === "erro" ? "text-[var(--color-danger)]" : "text-[var(--color-ink2)]"}`}>
              {aviso.texto}
            </p>
          )}
          <form
            className="flex items-end gap-2 border-t border-[var(--color-line)] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
          >
            <input
              ref={arquivo}
              type="file"
              accept={TIPOS_DE_ANEXO.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (f) anexar(f);
              }}
            />
            <button type="button" onClick={() => arquivo.current?.click()} title="Anexar documento (PDF, Word, imagem ou, no Caixa, planilha do extrato)" aria-label="Anexar documento" className="text-[16px] text-[var(--color-ink3)] hover:text-[var(--color-ink)]">
              📎
            </button>
            <BotaoDeVoz onTexto={(t) => setTexto((atual) => juntarDitado(atual, t))} onErro={(m) => setAviso(m ? { texto: m, tom: "erro" } : null)} />
            <CampoDeMensagem
              valor={texto}
              onValor={setTexto}
              onEnviar={() => enviar(texto)}
              onAnexo={anexar}
              onAviso={setAviso}
              placeholder={tela?.formulario ? "Diga o que lançar, cole ou anexe o documento" : `Pergunte à ${NOME_DA_CRIS}`}
              rotulo="Mensagem para a Cris"
            />
            <Button type="submit" size="sm" disabled={pendente || (!texto.trim() && !anexo)}>
              Enviar
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

function TrechoNaLinha({ t }: { t: TrechoEmLinha }) {
  if (t.tipo === "link") {
    return (
      <Link href={t.href} className="text-[var(--color-accent2)] hover:underline">
        {t.texto}
      </Link>
    );
  }
  if (t.tipo === "negrito") return <strong className="font-semibold">{t.texto}</strong>;
  return <>{t.texto}</>;
}

/**
 * Prompt AQ §3 — a resposta formatada a partir de trechos tipados (negrito,
 * lista e links), sem HTML vindo do modelo. Itens seguidos viram uma lista.
 */
function RespostaDaCris({ texto }: { texto: string }) {
  const blocos: ({ tipo: "linha"; trechos: TrechoEmLinha[] } | { tipo: "lista"; itens: TrechoEmLinha[][] })[] = [];
  for (const t of trechosDaCris(texto) as TrechoDaCris[]) {
    const ultimo = blocos[blocos.length - 1];
    if (t.tipo === "item") {
      if (ultimo?.tipo === "lista") ultimo.itens.push(t.trechos);
      else blocos.push({ tipo: "lista", itens: [t.trechos] });
    } else if (ultimo?.tipo === "linha") ultimo.trechos.push(t);
    else blocos.push({ tipo: "linha", trechos: [t] });
  }
  return (
    <div className="space-y-1 text-[var(--color-ink)]">
      {blocos.map((b, i) =>
        b.tipo === "lista" ? (
          <ul key={i} className="list-disc space-y-0.5 pl-5">
            {b.itens.map((item, k) => (
              <li key={k}>
                {item.map((t, n) => (
                  <TrechoNaLinha key={n} t={t} />
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {b.trechos.map((t, n) => (
              <TrechoNaLinha key={n} t={t} />
            ))}
          </p>
        ),
      )}
    </div>
  );
}

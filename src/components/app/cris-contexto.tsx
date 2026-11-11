"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ContextoDeTela, FormularioDaTela, PropostaDePreenchimento } from "@/lib/cris";
import { repartirProposta, unirFormularios } from "@/lib/cris-formularios";
import { validarAnexo } from "@/lib/cris-colagem";
import { CampoDeMensagem, type AvisoDoCampo } from "@/components/app/campo-de-mensagem";

/**
 * Prompt E2 — o que a tela aberta conta para a Cris.
 *
 * - `<CrisDaTela titulo dados sugestoes />`: a página (servidor) entrega o
 *   resumo dos números que ela mostra. Nada de dado pessoal: a tela monta o
 *   resumo, e o servidor ainda o limpa (`sanitizarDados`).
 * - `useCrisFormulario(form, aplicar)`: o formulário de lançamento declara os
 *   campos e a função que PREENCHE a tela com a proposta. Preencher não grava:
 *   quem grava é o botão do formulário (regra 4.2.1).
 */

type Aplicar = (p: PropostaDePreenchimento) => void;

interface EstadoDaCris {
  tela: ContextoDeTela | null;
  setTela: (t: Omit<ContextoDeTela, "rota" | "formulario"> | null) => void;
  registrarFormulario: (f: FormularioDaTela, aplicar: Aplicar) => () => void;
  aplicarProposta: (p: PropostaDePreenchimento) => boolean;
  /** Abre a Cris com uma pergunta pronta (ex.: o botão de um painel), e o anexo, se houver. */
  perguntar: (texto: string, anexo?: File | null) => void;
  pedidoPendente: { texto: string; anexo: File | null } | null;
  consumirPedido: () => void;
}

const CrisCtx = createContext<EstadoDaCris | null>(null);

export function CrisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const rota = `${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;
  const [base, setBase] = useState<Omit<ContextoDeTela, "rota" | "formulario"> | null>(null);
  // Prompt D2: a tela pode ter mais de um formulário (ex.: Receitas e
  // Despesas do Orçamento). Com mais de um, a Cris vê um só, com os campos
  // prefixados pelo id de cada um; a proposta é repartida de volta.
  const [formularios, setFormularios] = useState<FormularioDaTela[]>([]);
  const aplicarRef = useRef(new Map<string, Aplicar>());
  const [pedidoPendente, setPedido] = useState<{ texto: string; anexo: File | null } | null>(null);

  const registrarFormulario = useCallback((f: FormularioDaTela, aplicar: Aplicar) => {
    setFormularios((lista) => [...lista.filter((x) => x.id !== f.id), f]);
    aplicarRef.current.set(f.id, aplicar);
    return () => {
      setFormularios((lista) => lista.filter((x) => x.id !== f.id));
      if (aplicarRef.current.get(f.id) === aplicar) aplicarRef.current.delete(f.id);
    };
  }, []);

  const formulario = useMemo(() => unirFormularios(formularios), [formularios]);

  const aplicarProposta = useCallback((p: PropostaDePreenchimento) => {
    if (!formulario || formulario.id !== p.formulario) return false;
    const partes = formularios.length > 1 ? repartirProposta(p, formularios) : [p];
    let aplicou = false;
    for (const parte of partes) {
      const fn = aplicarRef.current.get(parte.formulario);
      if (fn) {
        fn(parte);
        aplicou = true;
      }
    }
    return aplicou;
  }, [formulario, formularios]);

  const tela = useMemo<ContextoDeTela | null>(() => {
    if (!base && !formulario) return null;
    return { rota, titulo: base?.titulo ?? formulario?.titulo ?? "", dados: base?.dados ?? null, sugestoes: base?.sugestoes ?? [], formulario };
  }, [base, formulario, rota]);

  const valor = useMemo<EstadoDaCris>(
    () => ({
      tela,
      setTela: setBase,
      registrarFormulario,
      aplicarProposta,
      perguntar: (texto: string, anexo?: File | null) => setPedido({ texto, anexo: anexo ?? null }),
      pedidoPendente,
      consumirPedido: () => setPedido(null),
    }),
    [tela, registrarFormulario, aplicarProposta, pedidoPendente],
  );
  return <CrisCtx.Provider value={valor}>{children}</CrisCtx.Provider>;
}

export function useCris(): EstadoDaCris | null {
  return useContext(CrisCtx);
}

/** A página registra o que mostra. Desmontou (trocou de tela), o contexto some. */
export function CrisDaTela({ titulo, dados, sugestoes }: { titulo: string; dados?: Record<string, unknown> | null; sugestoes?: string[] }) {
  const cris = useCris();
  const json = JSON.stringify(dados ?? null);
  const sug = JSON.stringify(sugestoes ?? []);
  useEffect(() => {
    if (!cris) return;
    cris.setTela({ titulo, dados: JSON.parse(json), sugestoes: JSON.parse(sug) });
    return () => cris.setTela(null);
    // `cris.setTela` é estável; o resto entra pelo JSON.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, json, sug]);
  return null;
}

/** O formulário se oferece à Cris enquanto está montado. */
export function useCrisFormulario(form: FormularioDaTela | null, aplicar: Aplicar) {
  const cris = useCris();
  const aplicarRef = useRef(aplicar);
  aplicarRef.current = aplicar;
  const json = JSON.stringify(form);
  useEffect(() => {
    if (!cris || !form) return;
    return cris.registrarFormulario(JSON.parse(json), (p) => aplicarRef.current(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json]);
}

/** Botão "Perguntar à Cris" para os painéis: abre o chat com a pergunta. */
export function PerguntarACris({ pergunta, children, className }: { pergunta: string; children?: React.ReactNode; className?: string }) {
  const cris = useCris();
  if (!cris) return null;
  return (
    <button type="button" onClick={() => cris.perguntar(pergunta)} className={className ?? "text-left text-[12px] text-[var(--color-accent2)] hover:underline"}>
      {children ?? pergunta}
    </button>
  );
}

/**
 * Prompt Y2 — caixa de conversa embaixo das perguntas prontas de um painel:
 * o que a pessoa escreve vai para a Cris, que abre com a pergunta.
 *
 * Prompt AQ §5.4: o mesmo campo do chat (várias linhas, Enter envia, colar
 * imagem ou arquivo vira anexo, aviso de limite). O anexo vai junto com a
 * pergunta para a Cris.
 */
export function CaixaDeConversa({ placeholder }: { placeholder?: string }) {
  const cris = useCris();
  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);
  const [aviso, setAviso] = useState<AvisoDoCampo>(null);
  if (!cris) return null;
  const anexar = (f: File) => {
    const erro = validarAnexo(f);
    if (erro) return setAviso({ texto: erro, tom: "erro" });
    setAviso(anexo && anexo !== f ? { texto: `O anexo "${anexo.name}" foi trocado por "${f.name}".`, tom: "info" } : null);
    setAnexo(f);
  };
  const enviar = () => {
    const q = texto.trim();
    if (!q && !anexo) return;
    cris.perguntar(q, anexo);
    setTexto("");
    setAnexo(null);
    setAviso(null);
  };
  return (
    <div data-caixa-conversa className="mt-3 space-y-1">
      <form
        className="flex items-end gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <CampoDeMensagem
          valor={texto}
          onValor={setTexto}
          onEnviar={enviar}
          onAnexo={anexar}
          onAviso={setAviso}
          placeholder={placeholder ?? "Pergunte à Cris…"}
          rotulo="Pergunte à Cris"
          className="min-w-0 flex-1 resize-none rounded-[8px] border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-[12.5px] leading-[18px] text-[var(--color-ink)] placeholder:text-[var(--color-ink3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40"
        />
        <button type="submit" disabled={!texto.trim() && !anexo} className="rounded-[8px] bg-[var(--color-accent)] px-2.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40">
          Enviar
        </button>
      </form>
      {anexo && (
        <p className="flex items-center justify-between text-[11.5px] text-[var(--color-ink2)]">
          <span className="truncate">📎 {anexo.name}</span>
          <button type="button" onClick={() => setAnexo(null)} className="text-[var(--color-ink3)] hover:text-[var(--color-danger)]">
            tirar
          </button>
        </p>
      )}
      {aviso && (
        <p role={aviso.tom === "erro" ? "alert" : "status"} className={`text-[11.5px] ${aviso.tom === "erro" ? "text-[var(--color-danger)]" : "text-[var(--color-ink2)]"}`}>
          {aviso.texto}
        </p>
      )}
    </div>
  );
}

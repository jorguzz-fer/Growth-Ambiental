"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PARAM_PROJETO } from "@/lib/projeto-selecao";
import { EsqueletoDeTela } from "@/components/app/esqueleto-de-tela";

/**
 * Memória por aba (B-A2, Prompt A). A obra da tela mora na URL (`?proj=`); a
 * aba lembra a última obra escolhida em `sessionStorage`, que o navegador
 * mantém separado por aba. Não é cookie, não vai ao servidor e não vale para
 * outras abas: duas abas em obras diferentes ficam independentes (seção 32).
 */
const CHAVE = "gc:projeto";

export function lerProjetoDaAba(): string | null {
  try {
    return window.sessionStorage.getItem(CHAVE);
  } catch {
    return null; // navegação privada / armazenamento bloqueado: sem memória
  }
}

export function gravarProjetoDaAba(projectId: string) {
  try {
    window.sessionStorage.setItem(CHAVE, projectId);
  } catch {
    // sem memória nesta aba; a tela continua funcionando pela URL
  }
}

/** Registra na aba a obra que a tela está mostrando (vinda da URL). */
export function LembrarProjeto({ projectId }: { projectId: string }) {
  useEffect(() => {
    gravarProjetoDaAba(projectId);
  }, [projectId]);
  return null;
}

/**
 * Tela aberta sem obra na URL: se a aba lembra uma obra que ainda está na
 * lista do usuário, reabre a tela nela (trocando a URL, sem novo item no
 * histórico). Senão, com `semMemoria` (relatórios: "all"), reabre nesse
 * escopo; sem ele, mostra `children` — o pedido de escolha. Nunca escolhe o
 * primeiro projeto.
 */
export function RecuperarProjeto({
  idsPermitidos,
  semMemoria: escopoSemMemoria,
  titulo,
  children,
}: {
  idsPermitidos: string[];
  semMemoria?: string;
  /**
   * GA-13 H3 — título do esqueleto mostrado enquanto a tela decide o projeto e
   * carrega (antes, nada: a tela ficava em branco). Sem título, o esqueleto
   * vem sem cabeçalho (a página já mostrou o dela).
   */
  titulo?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [semMemoria, setSemMemoria] = useState(false);
  // Chave estável: o array chega novo a cada renderização.
  const ids = idsPermitidos.join("|");

  useEffect(() => {
    const lembrado = lerProjetoDaAba();
    const destino = lembrado && ids.split("|").includes(lembrado) ? lembrado : escopoSemMemoria;
    if (destino) {
      const params = new URLSearchParams(sp.toString());
      params.set(PARAM_PROJETO, destino);
      router.replace(`${pathname}?${params.toString()}`);
    } else {
      setSemMemoria(true);
    }
  }, [ids, pathname, router, sp, escopoSemMemoria]);

  return semMemoria ? <>{children}</> : <EsqueletoDeTela titulo={titulo} semCabecalho={titulo === undefined} />;
}

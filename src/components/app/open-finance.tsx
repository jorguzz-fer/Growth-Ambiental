"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { abrirConexao, associarConta, decidirPossivelDuplicado, desconectar, registrarConexao, sincronizarAgora, type ContaDaConexao } from "@/lib/actions/openfinance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { brl0, dateBR } from "@/lib/utils";

/**
 * Prompt AT §1-B (Revisão 4) — conectar o banco pela tela, sem digitar ID.
 *
 * 1-B.2: antes do widget, o consentimento: o que é lido, para quê, por quanto
 * tempo e como desconectar. 1-B.1: o widget Pluggy Connect abre com um token
 * do servidor; as credenciais do banco ficam entre o cliente e o banco.
 * 1-B.4: depois, a pessoa diz o que fazer com cada conta do banco.
 */

type Opcao = { id: string; nome: string };

export interface ConexaoParaTela {
  itemId: string;
  banco: string | null;
  situacao: "conectado" | "atualizando" | "precisa_acao" | "erro" | "desconectado";
  ultimaAtualizacao: string | null;
  ultimoErro: string | null;
  contas: ContaDaConexao[];
}

const ROTULO = { conectado: "conectada", atualizando: "atualizando", precisa_acao: "precisa de ação", erro: "erro", desconectado: "desconectada" } as const;
const TOM = { conectado: "success", atualizando: "info", precisa_acao: "warning", erro: "danger", desconectado: "neutral" } as const;

/** Abre o widget da Pluggy (carregado só quando a pessoa clica). */
async function abrirWidget(opts: { accessToken: string; includeSandbox: boolean; updateItem?: string; onSuccess: (itemId: string) => void; onError: (msg: string) => void }) {
  const { PluggyConnect } = await import("pluggy-connect-sdk");
  const w = new PluggyConnect({
    connectToken: opts.accessToken,
    includeSandbox: opts.includeSandbox,
    language: "pt",
    ...(opts.updateItem ? { updateItem: opts.updateItem } : {}),
    onSuccess: ({ item }) => opts.onSuccess(item.id),
    onError: (e) => opts.onError(e.message),
  });
  await w.init();
}

export function ConectarBanco({ contas, cartoes, rotulo = "Conectar banco", reconectar, compacto }: { contas: Opcao[]; cartoes: Opcao[]; rotulo?: string; reconectar?: string; compacto?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [associar, setAssociar] = useState<{ itemId: string; contas: ContaDaConexao[] } | null>(null);

  const conectar = () => {
    setErro(null);
    start(async () => {
      const t = await abrirConexao({ itemId: reconectar ?? null });
      if (!t.ok) return setErro(t.error);
      setConsentimento(false);
      try {
        await abrirWidget({
          accessToken: t.accessToken,
          includeSandbox: t.includeSandbox,
          updateItem: reconectar,
          onError: (m) => setErro(`O banco não concluiu a conexão: ${m}`),
          onSuccess: (itemId) =>
            start(async () => {
              const r = await registrarConexao(itemId);
              if (!r.ok) return setErro(r.error);
              if (!reconectar) setAssociar({ itemId, contas: r.contas });
              router.refresh();
            }),
        });
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível abrir a conexão.");
      }
    });
  };

  return (
    <>
      <Button size="sm" variant={compacto ? "outline" : "default"} onClick={() => (reconectar ? conectar() : setConsentimento(true))} disabled={pending} data-conectar-banco>
        {pending ? "Abrindo…" : rotulo}
      </Button>
      {erro && <span className="text-[12px] text-[var(--color-danger)]" role="alert">{erro}</span>}
      {consentimento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Conectar banco pelo Open Finance">
          <Card className="w-full max-w-lg">
            <CardContent className="space-y-3 p-5 text-[13px] text-[var(--color-ink2)]" data-consentimento-openfinance>
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Conectar banco pelo Open Finance</h3>
              <p>
                <strong>O que será lido:</strong> as contas correntes e os cartões que você autorizar no seu banco: saldos, movimentos e faturas de cartão.
              </p>
              <p>
                <strong>Para quê:</strong> só para a conciliação do caixa. Os movimentos chegam como pendentes; nada é conciliado nem lançado sem a sua confirmação.
              </p>
              <p>
                <strong>Por quanto tempo:</strong> pelo prazo do consentimento que você der no banco (o banco mostra o prazo), até você desconectar.
              </p>
              <p>
                <strong>Como desconectar:</strong> em Contas Correntes, no botão &ldquo;Desconectar&rdquo; da conexão. Tudo o que já foi trazido continua no app.
              </p>
              <p className="text-[12px] text-[var(--color-ink3)]">
                A senha do banco é digitada no banco, dentro da janela da Pluggy (a empresa autorizada pelo Banco Central que faz a conexão). Ela não passa pelo app.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setConsentimento(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={conectar} disabled={pending} data-continuar-conexao>
                  Continuar no banco
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {associar && <AssociarContas itemId={associar.itemId} contasDoBanco={associar.contas} contas={contas} cartoes={cartoes} onFim={() => setAssociar(null)} />}
    </>
  );
}

/** 1-B.4 — para cada conta do banco: associar, criar uma conta nova, ou ignorar. */
export function AssociarContas({ itemId, contasDoBanco, contas, cartoes, onFim }: { itemId: string; contasDoBanco: ContaDaConexao[]; contas: Opcao[]; cartoes: Opcao[]; onFim: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const inicial = (c: ContaDaConexao) => (c.ignorada ? "ignorar" : c.bankAccountId ? `conta:${c.bankAccountId}` : c.cartaoId ? `cartao:${c.cartaoId}` : "");
  const [destino, setDestino] = useState<Record<string, string>>(Object.fromEntries(contasDoBanco.map((c) => [c.pluggyAccountId, inicial(c)])));
  const salvar = () =>
    start(async () => {
      setErro(null);
      for (const c of contasDoBanco) {
        const d = destino[c.pluggyAccountId];
        if (!d) return setErro("Escolha o que fazer com cada conta do banco (ou ignore).");
      }
      for (const c of contasDoBanco) {
        const r = await associarConta({ pluggyAccountId: c.pluggyAccountId, destino: destino[c.pluggyAccountId] });
        if (!r.ok) return setErro(`${c.nome ?? c.numero ?? "conta"}: ${r.error}`);
      }
      const s = await sincronizarAgora(itemId);
      if (!s.ok) setErro(`Associado. A primeira busca de movimentos falhou: ${s.error} A sincronização diária tenta de novo.`);
      router.refresh();
      if (s.ok) onFim();
    });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Associar as contas do banco">
      <Card className="w-full max-w-2xl">
        <CardContent className="space-y-3 p-5 text-[13px]" data-associar-contas>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">Banco conectado. O que fazer com cada conta?</h3>
          <p className="text-[12.5px] text-[var(--color-ink3)]">Associe a uma conta corrente ou a um cartão já cadastrado, crie uma conta nova ou ignore. Conta ignorada não traz movimentos.</p>
          {contasDoBanco.map((c) => (
            <div key={c.pluggyAccountId} className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-2">
              <Badge tone="neutral">{c.tipo === "CREDIT" ? "cartão" : "conta"}</Badge>
              <span className="text-[var(--color-ink)]">{c.nome ?? "—"}</span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-ink3)]">{c.numero ?? ""}</span>
              <select
                className="ml-auto h-8 rounded-[8px] border border-[var(--color-line)] bg-white px-2 text-xs"
                value={destino[c.pluggyAccountId] ?? ""}
                onChange={(e) => setDestino((s) => ({ ...s, [c.pluggyAccountId]: e.target.value }))}
                aria-label={`Destino de ${c.nome ?? c.numero ?? "conta"}`}
              >
                <option value="">Escolha…</option>
                {c.tipo === "CREDIT"
                  ? cartoes.map((k) => (
                      <option key={k.id} value={`cartao:${k.id}`}>
                        Cartão: {k.nome}
                      </option>
                    ))
                  : contas.map((k) => (
                      <option key={k.id} value={`conta:${k.id}`}>
                        Conta: {k.nome}
                      </option>
                    ))}
                {c.tipo !== "CREDIT" && <option value="nova">Criar conta corrente nova</option>}
                <option value="ignorar">Ignorar</option>
              </select>
            </div>
          ))}
          {contasDoBanco.some((c) => c.tipo === "CREDIT") && cartoes.length === 0 && (
            <p className="text-[12px] text-[var(--color-warning)]">Para trazer a fatura de um cartão, cadastre o cartão em Cartões de Crédito (dias de fechamento e vencimento) e associe depois.</p>
          )}
          {erro && <p className="text-[12px] text-[var(--color-danger)]" role="alert">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onFim}>
              Depois
            </Button>
            <Button size="sm" onClick={salvar} disabled={pending}>
              {pending ? "Salvando…" : "Salvar e buscar movimentos"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** 1-B.8 — a situação de cada conexão, com atualizar, reconectar e desconectar. */
export function ConexoesOpenFinance({ conexoes, contas, cartoes, podeEditar, duplicados, podeDecidir }: { conexoes: ConexaoParaTela[]; contas: Opcao[]; cartoes: Opcao[]; podeEditar: boolean; duplicados: { id: string; conta: string; data: string | null; descricao: string | null; valor: number }[]; podeDecidir: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [associar, setAssociar] = useState<ConexaoParaTela | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(r.ok ? ok : r.error ?? "Falhou.");
      router.refresh();
    });
  if (conexoes.length === 0 && duplicados.length === 0) return null;
  const nome = (id: string | null, lista: Opcao[]) => lista.find((x) => x.id === id)?.nome ?? null;
  return (
    <Card className="mb-4" data-conexoes-openfinance>
      <CardContent className="space-y-3 p-4 text-[13px]">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Bancos conectados pelo Open Finance</h3>
        {msg && <p className="text-[12px] text-[var(--color-ink2)]" role="status">{msg}</p>}
        {conexoes.map((c) => (
          <div key={c.itemId} className="rounded-[8px] border border-[var(--color-line)] p-3" data-conexao={c.itemId} data-situacao={c.situacao}>
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-[var(--color-ink)]">{c.banco ?? "Banco"}</strong>
              <Badge tone={TOM[c.situacao]}>{ROTULO[c.situacao]}</Badge>
              {c.ultimaAtualizacao && <span className="text-[12px] text-[var(--color-ink3)]">atualizada em {new Date(c.ultimaAtualizacao).toLocaleString("pt-BR")}</span>}
              {c.ultimoErro && <span className="text-[12px] text-[var(--color-danger)]">{c.ultimoErro}</span>}
              {podeEditar && (
                <span className="ml-auto flex flex-wrap gap-1.5">
                  {(c.situacao === "precisa_acao" || c.situacao === "erro") && <ConectarBanco contas={contas} cartoes={cartoes} rotulo="Reconectar" reconectar={c.itemId} compacto />}
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setAssociar(c)}>
                    Contas
                  </Button>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => run(async () => { const r = await sincronizarAgora(c.itemId); return r.ok ? { ok: true } : r; }, "Movimentos buscados.")}>
                    Atualizar agora
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Desconectar ${c.banco ?? "o banco"}? Os movimentos já trazidos continuam no app; novos não chegam mais.`)) run(() => desconectar(c.itemId), "Banco desconectado. Tudo o que já foi trazido continua.");
                    }}
                  >
                    Desconectar
                  </Button>
                </span>
              )}
            </div>
            <ul className="mt-1.5 space-y-0.5 text-[12px] text-[var(--color-ink2)]">
              {c.contas.map((k) => (
                <li key={k.pluggyAccountId}>
                  {k.tipo === "CREDIT" ? "Cartão" : "Conta"} {k.nome ?? ""} {k.numero ?? ""} →{" "}
                  {k.ignorada ? "ignorada" : k.bankAccountId ? nome(k.bankAccountId, contas) ?? "conta corrente" : k.cartaoId ? nome(k.cartaoId, cartoes) ?? "cartão" : <span className="text-[var(--color-warning)]">sem associação</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {duplicados.length > 0 && (
          <div className="rounded-[8px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/50 p-3" data-possiveis-duplicados>
            <p className="text-[12.5px] text-[#92400e]">
              <strong>Possíveis duplicados ({duplicados.length}):</strong> na primeira busca, estes movimentos do banco têm a mesma conta, data e valor de um extrato já importado. Não entraram. Diga se é o mesmo movimento.
            </p>
            <ul className="mt-1.5 space-y-1">
              {duplicados.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span>{d.conta}</span>
                  <span className="font-[family-name:var(--font-mono)]">{d.data ? dateBR(d.data) : "—"}</span>
                  <span>{d.descricao ?? "—"}</span>
                  <span className="font-[family-name:var(--font-mono)]">{brl0(d.valor)}</span>
                  {podeDecidir && (
                    <span className="ml-auto flex gap-1.5">
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => decidirPossivelDuplicado(d.id, "mesmo"), "Marcado como o mesmo movimento: nada novo entrou.")}>
                        É o mesmo
                      </Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => decidirPossivelDuplicado(d.id, "importar"), "Importado como movimento novo.")}>
                        É outro: importar
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {associar && <AssociarContas itemId={associar.itemId} contasDoBanco={associar.contas} contas={contas} cartoes={cartoes} onFim={() => setAssociar(null)} />}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AnaliseDoEstoque, PropostaDeEntrada } from "@/lib/estoque-analise";
import { addStockItem, addStockMovement, proporEntradasDaNota } from "@/lib/actions/estoque";
import { cn, brl0, dateBR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { CaixaDeConversa } from "@/components/app/cris-contexto";

/**
 * Painel do assistente do Estoque (Prompt Y, seção 7; Prompt E).
 * PROPÕE E PARA: a leitura da nota devolve propostas; cada entrada e cada
 * cadastro só existem depois do clique da pessoa (pelas mesmas actions da
 * tela, com validação no servidor). Nunca (7.4): lançar sem confirmação,
 * excluir item, estornar movimento, criar material sozinho.
 */

type Acao = "nota" | "minimo" | "parado" | "obra" | "origem" | "valor" | "comprovacao";
const qtd = (n: number, u: string) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${u}`;

export function AssistenteEstoque({ usuario, analise, despesas, obras, aiConfigurada, canCriar }: { usuario: string; analise: AnaliseDoEstoque; despesas: { id: string; label: string }[]; obras: Record<string, string>; aiConfigurada: boolean; canCriar: boolean }) {
  const chave = `gt:assistente:estoque:recolhido:${usuario}`;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  const [despesaId, setDespesaId] = useState("");
  const [proposta, setProposta] = useState<{ despesaId: string; itens: PropostaDeEntrada[]; observacoes: string[]; documentos: string[] } | null>(null);
  const [feitos, setFeitos] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    try {
      setRecolhido(window.localStorage.getItem(chave) === "1");
    } catch {
      /* sem localStorage: fica expandido */
    }
  }, [chave]);
  const alternar = () => {
    const proximo = !recolhido;
    setRecolhido(proximo);
    try {
      window.localStorage.setItem(chave, proximo ? "1" : "0");
    } catch {
      /* preferência não persiste */
    }
  };
  if (recolhido) {
    return (
      <aside className="shrink-0 min-[1180px]:sticky min-[1180px]:top-20">
        <button type="button" onClick={alternar} aria-expanded={false} aria-label="Abrir o assistente" title="Abrir o assistente" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-line)] bg-white shadow-sm hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <Faisca />
        </button>
      </aside>
    );
  }

  const ler = () => {
    if (!despesaId) return setMsg({ ok: false, texto: "Escolha a despesa cuja nota deve ser lida." });
    setMsg(null);
    start(async () => {
      const r = await proporEntradasDaNota(despesaId);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setProposta({ despesaId, itens: r.propostas, observacoes: r.observacoes, documentos: r.documentos });
      setFeitos({});
      if (r.propostas.length === 0) setMsg({ ok: false, texto: "A nota não trouxe item de material." });
    });
  };
  const confirmarEntrada = (i: number, it: PropostaDeEntrada) => {
    if (!proposta || !it.materialId) return;
    start(async () => {
      const fd = new FormData();
      fd.set("itemId", it.materialId!);
      fd.set("tipo", "entrada");
      fd.set("quantidade", String(it.quantidade));
      fd.set("despesaId", proposta.despesaId);
      fd.set("origem", "Compra");
      fd.set("obs", `Proposto pela leitura da nota: ${it.descricaoNaNota}`);
      const r = await addStockMovement(fd);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      setFeitos((f) => ({ ...f, [i]: "entrada gravada" + (r.aviso ? ` · ${r.aviso}` : "") }));
      router.refresh();
    });
  };
  const confirmarCadastro = (i: number, it: PropostaDeEntrada) => {
    if (!it.cadastroProposto) return;
    start(async () => {
      const fd = new FormData();
      fd.set("nome", it.cadastroProposto!.nome);
      fd.set("unidade", it.cadastroProposto!.unidade);
      fd.set("custoUnit", String(it.cadastroProposto!.custoUnit));
      const r = await addStockItem(fd);
      if (!r.ok) return setMsg({ ok: false, texto: r.error });
      // o cadastro nasceu com a sua confirmação; a entrada ainda é outro clique
      setProposta((p) => (p ? { ...p, itens: p.itens.map((x, k) => (k === i ? { ...x, materialId: r.id, materialNome: it.cadastroProposto!.nome, custoCadastro: it.cadastroProposto!.custoUnit, desvioDeCusto: 0, cadastroProposto: null } : x)) } : p));
      setFeitos((f) => ({ ...f, [i]: "material cadastrado — confirme a entrada" }));
      router.refresh();
    });
  };

  const { abaixoDoMinimo, semMovimento, consumoPorObra, entradaSemOrigem, divergenciaDeValor, entradaSemComprovacao } = analise;
  const li = "text-[12px] text-[var(--color-ink2)]";
  const nome = "font-medium text-[var(--color-ink)]";
  const alternarAcao = (a: Acao) => setAberta(aberta === a ? null : a);
  const grauTone = (g: "alta" | "media" | "baixa") => (g === "alta" ? "success" : g === "media" ? "warning" : "neutral");

  return (
    <aside aria-label="Assistente de Materiais e Equipamentos" className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[320px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            <Badge tone="neutral">Propõe, você confirma</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Materiais e Equipamentos · lê a nota e propõe as entradas</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mb-2 rounded-[8px] px-2 py-1 text-[11.5px] ${msg.ok ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"}`}>{msg.texto}</p>}

      <div className="space-y-2">
        <AcaoDoPainel cor="#E6F4EA" icone={<Icone cor="#1E7A3C" d="M4 4h12l4 4v12H4zM8 12h8M8 16h8" />} titulo="Ler a nota e propor as entradas" descricao="Da despesa com a nota anexada: um item por linha, casado com o cadastro — você confere e confirma" contador={proposta?.itens.length ?? 0} aberta={aberta === "nota"} onClick={() => alternarAcao("nota")}>
          {!aiConfigurada ? <p className={li}>Leitura por IA não configurada (ANTHROPIC_API_KEY). As demais análises seguem.</p> : (
            <>
              <div className="flex gap-2">
                <Select value={despesaId} onChange={(e) => setDespesaId(e.target.value)} aria-label="Despesa com a nota">
                  <option value="">— despesa —</option>
                  {despesas.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </Select>
                <Button size="sm" variant="outline" disabled={pending || !despesaId} onClick={ler}>{pending ? "Lendo…" : "Ler a nota"}</Button>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-ink3)]">Nada é gravado pela leitura. Cada entrada e cada cadastro só existem depois do seu clique.</p>
              {proposta && (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-[var(--color-ink3)]">Lido de: {proposta.documentos.join(", ")}{proposta.observacoes.length ? ` · ${proposta.observacoes.join("; ")}` : ""}</p>
                  <ul className="space-y-2" data-propostas>
                    {proposta.itens.map((it, i) => (
                      <li key={i} className="rounded-[8px] border border-[var(--color-line)] p-2 text-[12px]">
                        <div className={nome}>{it.descricaoNaNota} <Badge tone={grauTone(it.confianca)}>{it.confianca}</Badge></div>
                        <div className="text-[var(--color-ink2)]">{qtd(it.quantidade, it.unidadeNaNota)} · {brl0(it.custoNaNota)}/un na nota{it.nota ? ` · ${it.nota}` : ""}</div>
                        {it.materialId ? (
                          <div className="text-[var(--color-ink3)]">→ {it.materialNome} · custo do cadastro {brl0(it.custoCadastro ?? 0)}{it.desvioDeCusto != null && it.desvioDeCusto > 0.1 ? <span className="text-[var(--color-warning)]"> · difere {Math.round(it.desvioDeCusto * 100)}% da nota — a entrada usa o custo do cadastro; ajuste o cadastro antes, se preciso</span> : ""}</div>
                        ) : (
                          <div className="text-[var(--color-warning)]">Sem cadastro correspondente. Proposta: &quot;{it.cadastroProposto?.nome}&quot; · {it.cadastroProposto?.unidade} · {brl0(it.cadastroProposto?.custoUnit ?? 0)}</div>
                        )}
                        {feitos[i] ? <div className="text-[var(--color-success)]">{feitos[i]}</div> : canCriar && (
                          it.materialId ? (
                            <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirmarEntrada(i, it)}>Confirmar entrada</Button>
                          ) : (
                            <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirmarCadastro(i, it)}>Cadastrar com estes dados</Button>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FDE6E9" icone={<Icone cor="#C0334A" d="M12 9v4m0 4h.01M10.3 3.9L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />} titulo="Abaixo do mínimo" descricao="Itens que precisam de reposição, com o consumo médio dos últimos 90 dias" contador={abaixoDoMinimo.length} aberta={aberta === "minimo"} onClick={() => alternarAcao("minimo")}>
          {abaixoDoMinimo.length === 0 ? <p className={li}>Nenhum item abaixo do mínimo.</p> : (
            <ul className="space-y-1">{abaixoDoMinimo.map((x) => <li key={x.id} className={li}><span className={nome}>{x.nome}</span> · saldo {qtd(x.saldo, x.unidade)} · mínimo {qtd(x.minimo, x.unidade)} · faltam {qtd(x.falta, x.unidade)} · consumo médio {qtd(x.consumoMedioMensal, x.unidade)}/mês</li>)}</ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#EAE6FB" icone={<Icone cor="#6D4BD1" d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} titulo="Sem movimento" descricao="Cadastrados e parados há mais de 180 dias (ou nunca movimentados)" contador={semMovimento.length} aberta={aberta === "parado"} onClick={() => alternarAcao("parado")}>
          {semMovimento.length === 0 ? <p className={li}>Todo material ativo se movimentou nos últimos 180 dias.</p> : (
            <ul className="space-y-1">{semMovimento.map((x) => <li key={x.id} className={li}><span className={nome}>{x.nome}</span> · {x.ultimo ? `último em ${x.ultimo.split("-").reverse().join("/")} (${x.dias} dias)` : "nunca movimentado"}</li>)}</ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#E8F1FB" icone={<Icone cor="#2563EB" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />} titulo="Consumo por projeto" descricao="Quanto cada projeto retirou — leitura; o custo já é da despesa" contador={consumoPorObra.length} aberta={aberta === "obra"} onClick={() => alternarAcao("obra")}>
          {consumoPorObra.length === 0 ? <p className={li}>Nenhuma saída de consumo.</p> : (
            <ul className="space-y-1">{consumoPorObra.map((c) => <li key={c.projectId} className={li}><span className={nome}>{obras[c.projectId] ?? "projeto"}</span> · {brl0(c.valor)} · {c.itens.slice(0, 3).map((i) => `${i.itemNome} ${qtd(i.quantidade, i.unidade)}`).join(", ")}{c.itens.length > 3 ? ", …" : ""}</li>)}</ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FFF1DB" icone={<Icone cor="#B45309" d="M12 5v14M5 12h14" />} titulo="Entrada sem origem" descricao="Movimentos sem despesa nem permuta — vindos de antes desta regra" contador={entradaSemOrigem.length} aberta={aberta === "origem"} onClick={() => alternarAcao("origem")}>
          {entradaSemOrigem.length === 0 ? <p className={li}>Toda entrada aponta uma despesa ou uma permuta.</p> : (
            <ul className="space-y-1">{entradaSemOrigem.map((x) => <li key={x.id} className={li}>{dateBR(x.data)} · <span className={nome}>{x.itemNome}</span> · {qtd(x.quantidade, x.unidade)} — sem lastro; estorne e lance de novo com a origem.</li>)}</ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FDE6E9" icone={<Icone cor="#C0334A" d="M4 4h16v16H4zM8 9h8M8 13h5" />} titulo="Divergência de valor" descricao="Despesas cuja soma das entradas não bate com o valor lançado (tolerância 2%)" contador={divergenciaDeValor.length} aberta={aberta === "valor"} onClick={() => alternarAcao("valor")}>
          {divergenciaDeValor.length === 0 ? <p className={li}>As entradas lançadas batem com as despesas.</p> : (
            <ul className="space-y-1">{divergenciaDeValor.map((d) => <li key={d.despesaId} className={li}><span className={nome}>{d.numDoc ?? "despesa"}</span> · lançado {brl0(d.valor)} · entradas {brl0(d.entradasSoma)} · {d.diferenca > 0 ? "a mais" : "a menos"} {brl0(Math.abs(d.diferenca))} — frete, desconto ou item faltando?</li>)}</ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#EAE6FB" icone={<Icone cor="#6D4BD1" d="M4 5h16v14H4zM8 11l3 3 5-5" />} titulo="Entrada sem comprovação" descricao="Entradas sem nenhum documento nem foto anexada, por mês" contador={entradaSemComprovacao.reduce((a, x) => a + x.quantidade, 0)} aberta={aberta === "comprovacao"} onClick={() => alternarAcao("comprovacao")}>
          {entradaSemComprovacao.length === 0 ? <p className={li}>Toda entrada tem nota, romaneio ou foto anexada.</p> : (
            <ul className="space-y-1">{entradaSemComprovacao.map((x) => <li key={x.mes} className={li}>{x.mes.split("-").reverse().join("/")} · {x.quantidade} entrada(s) · {brl0(x.valor)}</li>)}</ul>
          )}
        </AcaoDoPainel>
      </div>

      {/* Prompt Y2 — as perguntas prontas ficam; embaixo, a caixa de conversa com a Cris. */}
      <CaixaDeConversa placeholder="Pergunte à Cris sobre o estoque…" />

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">
        Ele propõe, você confirma. O assistente nunca lança movimento sem o seu clique, não exclui item, não estorna movimento e não cria material sozinho.
      </p>
    </aside>
  );
}

function Icone({ cor, d }: { cor: string; d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.9" aria-hidden><path d={d} /></svg>
  );
}

function AcaoDoPainel({ cor, icone, titulo, descricao, contador, aberta, onClick, children }: { cor: string; icone: React.ReactNode; titulo: string; descricao: string; contador: number; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && "bg-[var(--color-surface2)]")}>
      <button type="button" onClick={onClick} aria-expanded={aberta} className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px]" style={{ background: cor }}>{icone}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
            {titulo}
            {contador > 0 && <Badge tone="danger">{contador}</Badge>}
          </span>
          <span className="block text-[11.5px] leading-snug text-[var(--color-ink2)]">{descricao}</span>
        </span>
        <span className="text-[var(--color-ink3)]" aria-hidden>{aberta ? "▾" : "›"}</span>
      </button>
      {aberta && <div className="border-t border-[var(--color-line)] px-3 py-2.5">{children}</div>}
    </div>
  );
}

function Faisca() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7L12 3z" fill="#6D4BD1" />
      <path d="M18.5 15l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" fill="#3B82F6" />
    </svg>
  );
}

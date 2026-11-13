"use client";

import { useState, useTransition } from "react";
import { converterPlanoDaEmpresa, desfazerConversaoDoPlano } from "@/lib/actions/planocontas-conversao";
import type { PlanoDeConversao } from "@/lib/planocontas-conversao";
import { Button } from "@/components/ui/button";

/**
 * Aviso + prévia + conversão do plano da empresa para o plano de consultoria
 * ambiental. Aparece enquanto a empresa tem plano anterior ativo (obra ou
 * ambiental v1). Nada é gravado sem a confirmação; o resumo diz o que muda.
 */
export function ConversaoDoPlano({ plano, podeConverter, podeDesfazer }: { plano: PlanoDeConversao | null; podeConverter: boolean; podeDesfazer: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aberto, setAberto] = useState(false);
  const rodar = (fn: () => Promise<{ ok: true; aviso?: string } | { ok: false; error: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, texto: "aviso" in r && r.aviso ? r.aviso : "Feito." } : { ok: false, texto: r.error });
    });

  if (!plano || plano.nadaAFazer) {
    if (!podeDesfazer || !podeConverter) return msg ? <p className="mb-3 text-[12.5px] text-[#0F8A5F]">{msg.texto}</p> : null;
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-v2-ink2)]" data-testid="conversao-feita">
        {msg && <span className={msg.ok ? "text-[#0F8A5F]" : "text-[#C0334A]"}>{msg.texto}</span>}
        <span>Plano convertido para o padrão de consultoria ambiental.</span>
        <button
          type="button"
          disabled={pending}
          className="rounded-[6px] px-1 text-[12px] text-[var(--color-brand)] underline-offset-2 hover:underline"
          onClick={() => {
            if (window.confirm("Desfazer a última conversão? Só é possível enquanto nenhuma conta criada por ela tiver lançamento, Orçamento ou medição.")) rodar(desfazerConversaoDoPlano);
          }}
        >
          Desfazer conversão
        </button>
      </div>
    );
  }
  const r = plano.resumo;
  const usadas = plano.inativar.filter((i) => i.tipo === "conta" && i.uso.despesas + i.uso.orcamento + i.uso.medicoes > 0);
  return (
    <section className="mb-4 rounded-[14px] border border-[#F59E0B]/50 bg-[#FFFBEB] p-4 text-[13px] text-[#78350F]" data-testid="conversao-pendente" aria-label="Conversão do plano de contas">
      <h2 className="text-[14px] font-semibold">Esta empresa ainda usa o plano de contas anterior</h2>
      <p className="mt-1">
        {r.contasAntigasAtivas} conta(s) ativas não pertencem ao plano de consultoria ambiental (por exemplo, contas de obra). Converter cria o plano ambiental
        ({plano.criarContas.length} conta(s) e {plano.criarGrupos.length} grupo(s)/subgrupo(s) que faltam) e deixa as contas antigas <strong>inativas</strong>, preservadas
        para o histórico. Nenhum lançamento é apagado nem muda de valor ou de categoria.
      </p>
      <button type="button" className="mt-2 text-[12.5px] font-medium text-[#92400E] underline underline-offset-2" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        {aberto ? "Ocultar prévia" : "Ver prévia detalhada"}
      </button>
      {aberto && (
        <div className="mt-2 space-y-2 rounded-[10px] bg-white/70 p-3 text-[12px] text-[var(--color-v2-ink)]" data-testid="previa-conversao">
          <ul className="list-disc space-y-0.5 pl-4">
            <li>Criar: {plano.criarGrupos.length} grupo(s)/subgrupo(s) e {plano.criarContas.length} conta(s) do plano ambiental. Já existentes e mantidas: {plano.mantidas}.</li>
            <li>Inativar: {r.contasAntigasAtivas} conta(s) antigas e {plano.inativar.filter((i) => i.tipo === "grupo").length} grupo(s). Com lançamentos: {r.contasAntigasUsadas} conta(s), {r.lancamentosPreservados} despesa(s) — preservadas.</li>
            <li>
              Códigos antigos que ocupam códigos do plano ambiental: {plano.renomear.filter((x) => x.motivo === "conflito").length}, arquivados com o prefixo &ldquo;ANT-&rdquo;. As referências
              ({r.referenciasRenomeadas} entre despesas, Orçamento e medições{r.emVersaoCongelada ? `, inclusive em ${r.emVersaoCongelada} versão(ões) congelada(s)` : ""}) passam a usar o código arquivado — só o código muda.
            </li>
            {plano.papeis.length > 0 && <li>Juros e descontos do acerto de contas passam a usar {plano.papeis.map((p) => p.para).join(" e ")}.</li>}
          </ul>
          {plano.renomear.length > 0 && (
            <details>
              <summary className="cursor-pointer">Códigos arquivados ({plano.renomear.length})</summary>
              <ul className="mt-1 columns-1 text-[11.5px] sm:columns-2">
                {plano.renomear.map((x) => (
                  <li key={`${x.tipo}${x.id}`}>{x.tipo} {x.de} → {x.para} · {x.nome}</li>
                ))}
              </ul>
            </details>
          )}
          {usadas.length > 0 && (
            <details open>
              <summary className="cursor-pointer">Contas antigas com lançamentos ({usadas.length}) e a conta ambiental sugerida</summary>
              <ul className="mt-1 text-[11.5px]">
                {usadas.map((i) => (
                  <li key={i.id}>
                    {i.code} {i.nome} — {i.uso.despesas} despesa(s){i.uso.orcamento ? `, ${i.uso.orcamento} linha(s) de Orçamento` : ""} → {i.equivalente ? `${i.equivalente.code} ${i.equivalente.nome}` : "sem equivalente"}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11.5px]">Reclassificar esses lançamentos é opcional e feito depois, conta a conta, com prévia (seção &ldquo;Plano anterior&rdquo;).</p>
            </details>
          )}
          <p className="text-[11.5px] text-[var(--color-v2-ink2)]">Antes de converter em produção, faça o backup do banco. A conversão pode ser desfeita enquanto as contas novas não tiverem uso.</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {podeConverter ? (
          <Button
            size="sm"
            disabled={pending}
            className="h-9 rounded-[9px] bg-[var(--color-brand)] px-4 text-[13px] text-white"
            onClick={() => {
              if (window.confirm(`Converter o plano de contas desta empresa para o plano de consultoria ambiental? ${r.contasAntigasAtivas} conta(s) antigas ficarão inativas; nenhum lançamento muda de valor ou de categoria.`))
                rodar(() => converterPlanoDaEmpresa({ confirmar: true, versao: plano.versao }));
            }}
          >
            {pending ? "Convertendo…" : "Converter para o plano ambiental"}
          </Button>
        ) : (
          <span className="text-[12px]">A conversão é feita por um proprietário ou administrador da empresa.</span>
        )}
        {msg && <span role="status" className={msg.ok ? "text-[#0F8A5F]" : "text-[#C0334A]"}>{msg.texto}</span>}
      </div>
    </section>
  );
}

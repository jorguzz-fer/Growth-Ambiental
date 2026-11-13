"use client";

import { useEffect, useMemo, useState } from "react";
import type { InccRow } from "@/lib/calc";
import { efeitoDaAlteracao, type AnaliseDeIncc } from "@/lib/incc-analise";
import { avisoDeFaixa, JANELA_DA_MEDIA } from "@/lib/incc-regras";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";

/**
 * Painel do assistente de Índices de Reajuste (antiga Parâmetros / INCC) (Prompt Q, seção 6; Prompt E).
 *
 * Nível autorizado (6.1): PROPÕE E PARA. Hoje, sem fonte externa definida e
 * sem a variante confirmada (BQ-1), o assistente NÃO sugere valor de índice:
 * identifica os meses encerrados sem índice oficial e pede que o usuário os
 * informe na tabela (bloqueio menor da 6.2). Índice não se inventa.
 *
 * Análises (6.3), todas em código puro sobre o que a página carregou: meses
 * faltantes; curva projetada × histórico; efeito de uma alteração (prévia,
 * mesma regra da gravação, sem gravar); cobertura.
 *
 * Nunca (6.4): gravar índice, marcar mês como oficial, rodar a reprojeção,
 * afirmar índice sem variante e fonte, tratar projeção como índice real.
 */

type Acao = "faltantes" | "curva" | "efeito" | "cobertura";

export function AssistenteIncc({ usuario, rows, variante, analise }: { usuario: string; rows: InccRow[]; variante: string | null; analise: AnaliseDeIncc }) {
  const chave = `gt:assistente:incc:recolhido:${usuario}`;
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState<Acao | null>(null);
  const [mes, setMes] = useState("");
  const [valor, setValor] = useState("");

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

  const efeito = useMemo(() => (mes && valor.trim() !== "" ? efeitoDaAlteracao(rows, mes, Number(valor.replace(",", "."))) : null), [rows, mes, valor]);

  if (recolhido) {
    return (
      <aside className="shrink-0 min-[1180px]:sticky min-[1180px]:top-20">
        <button type="button" onClick={alternar} aria-expanded={false} aria-label="Abrir o assistente" title="Abrir o assistente" className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-line)] bg-white shadow-sm hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <Faisca />
        </button>
      </aside>
    );
  }

  const { faltantes, curva, cobertura, total } = analise;
  const nada = (t: string) => <p className="text-[12px] text-[var(--color-ink2)]">{total === 0 ? "Este projeto ainda não tem série de índice." : t}</p>;
  const coberturaProblemas = cobertura.vencimentosForaDaTabela.length + (cobertura.janelaForaDaTabela ? 1 : 0);

  return (
    <aside aria-label="Assistente de Índices de Reajuste" className="w-full shrink-0 rounded-[16px] border border-[var(--color-line)] bg-white p-4 shadow-sm min-[1180px]:sticky min-[1180px]:top-20 min-[1180px]:w-[300px]">
      <div className="mb-3 flex items-start gap-2.5">
        <Faisca />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold text-[var(--color-ink)]">
            Assistente IA
            {/* Prompt E, 6.1: o painel não grava nada (só mostra o efeito), então o selo é este. */}
            <Badge tone="neutral">Somente leitura</Badge>
          </div>
          <div className="text-[12px] text-[var(--color-ink2)]">Série · {variante ?? "índice a confirmar"}</div>
        </div>
        <button type="button" onClick={alternar} aria-expanded={true} aria-label="Recolher o assistente" title="Recolher" className="rounded-[8px] p-1 text-[var(--color-ink3)] hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        <AcaoDoPainel cor="#FDE6E9" icone={<Icone cor="#C0334A" d="M12 7.5v5M12 16h.01M3.5 12a8.5 8.5 0 1 0 17 0 8.5 8.5 0 0 0-17 0z" />} titulo="Meses faltantes" descricao="Períodos encerrados ainda sem índice oficial" contador={faltantes.length} aberta={aberta === "faltantes"} onClick={() => setAberta(aberta === "faltantes" ? null : "faltantes")}>
          {faltantes.length === 0 ? (
            nada("Todo mês encerrado tem índice oficial informado.")
          ) : (
            <div className="text-[12px]">
              <p className="text-[var(--color-ink2)]">
                {faltantes.length} mês(es) já encerrado(s) continuam como projeção: <strong className="text-[var(--color-ink)]">{faltantes.join(", ")}</strong>.
              </p>
              <p className="mt-1.5 text-[var(--color-ink2)]">
                Quer atualizar? <strong>Informe o índice oficial</strong> ({variante ?? "índice a confirmar"}) direto na tabela, com a fonte. O assistente não consegue
                buscar o índice: não há fonte externa definida, e índice não se estima nem se interpola.
              </p>
            </div>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#E7EDFD" icone={<Icone cor="#2B5CD9" d="M4 18l5-6 4 3 7-9M3 21h18" />} titulo="Curva projetada × histórico" descricao="Quanto a média móvel se distancia do recente, e há quantos meses a série é só projeção" contador={curva.mesesSoProjecao} aberta={aberta === "curva"} onClick={() => setAberta(aberta === "curva" ? null : "curva")}>
          {curva.mediaProjetada == null ? (
            nada("Nenhum mês projetado: a tabela é toda de índices oficiais.")
          ) : (
            <ul className="space-y-1 text-[12px] text-[var(--color-ink2)]">
              <li>
                Média das últimas variações oficiais: <span className="font-[family-name:var(--font-mono)]">{curva.mediaRecente ?? "—"}%</span>
              </li>
              <li>
                Média usada na projeção: <span className="font-[family-name:var(--font-mono)]">{curva.mediaProjetada}%</span>
                {curva.distancia != null && (
                  <span className={cn("ml-1 font-[family-name:var(--font-mono)]", Math.abs(curva.distancia) >= 0.2 ? "text-[var(--color-warning)]" : "")}>
                    ({curva.distancia > 0 ? "+" : ""}
                    {curva.distancia} p.p.)
                  </span>
                )}
              </li>
              <li>
                Só projeção há <strong className="text-[var(--color-ink)]">{curva.mesesSoProjecao}</strong> mês(es){curva.desde ? `, desde ${curva.desde}` : ""}.
              </li>
              {curva.mesesNaPrimeiraMedia != null && curva.mesesNaPrimeiraMedia < JANELA_DA_MEDIA && (
                <li className="text-[var(--color-warning)]">A primeira projeção usou só {curva.mesesNaPrimeiraMedia} mês(es) de histórico.</li>
              )}
              <li className="text-[var(--color-ink3)]">Projeção é projeção: não é índice real e não substitui o oficial.</li>
            </ul>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#F3EFFE" icone={<Icone cor="#6D4BD1" d="M4 12h6M14 12h6M10 8l4 4-4 4" />} titulo="Efeito de uma alteração" descricao="Antes de confirmar: quanto muda o acumulado e quais meses são reescritos" contador={0} aberta={aberta === "efeito"} onClick={() => setAberta(aberta === "efeito" ? null : "efeito")}>
          {rows.length === 0 ? (
            nada("")
          ) : (
            <div className="text-[12px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Mês</Label>
                  <Select value={mes} onChange={(e) => setMes(e.target.value)}>
                    <option value="">—</option>
                    {rows.map((r) => (
                      <option key={r.m} value={r.m}>
                        {r.m}
                        {r.projected ? " (projeção)" : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Variação %</Label>
                  <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="ex.: 0,45" inputMode="decimal" />
                </div>
              </div>
              {efeito ? (
                <div className="mt-2 space-y-1 text-[var(--color-ink2)]">
                  {avisoDeFaixa(efeito.mensal.para) && <p className="text-[var(--color-warning)]">⚠ {avisoDeFaixa(efeito.mensal.para)}</p>}
                  <p>
                    {efeito.mes}: mensal <span className="font-[family-name:var(--font-mono)]">{efeito.mensal.de}% → {efeito.mensal.para}%</span>; acumulado{" "}
                    <span className="font-[family-name:var(--font-mono)]">
                      {efeito.acumulado.de.toFixed(3)}% → {efeito.acumulado.para.toFixed(3)}%
                    </span>
                  </p>
                  <p>
                    Acumulado no último mês: <span className="font-[family-name:var(--font-mono)]">{efeito.acumuladoFinal.de.toFixed(3)}% → {efeito.acumuladoFinal.para.toFixed(3)}%</span>
                  </p>
                  <p>
                    {efeito.reescritos.length === 0 ? "Nenhum mês projetado seria reescrito." : `${efeito.reescritos.length} mês(es) projetado(s) seriam reescritos: ${efeito.reescritos.map((r) => r.mes).join(", ")}.`}
                  </p>
                  <p className="text-[var(--color-ink3)]">Prévia apenas. Para gravar, edite o mês na tabela e confirme.</p>
                </div>
              ) : (
                <p className="mt-2 text-[var(--color-ink3)]">Escolha o mês e digite a variação para ver o efeito — nada é gravado por aqui.</p>
              )}
            </div>
          )}
        </AcaoDoPainel>

        <AcaoDoPainel cor="#FEF3C7" icone={<Icone cor="#B45309" d="M3 5h18v14H3zM3 10h18M8 5v14" />} titulo="Cobertura" descricao="A série cobre o período do projeto e os vencimentos das parcelas?" contador={coberturaProblemas} aberta={aberta === "cobertura"} onClick={() => setAberta(aberta === "cobertura" ? null : "cobertura")}>
          {rows.length === 0 ? (
            nada("")
          ) : (
            <ul className="space-y-1 text-[12px] text-[var(--color-ink2)]">
              <li>
                Tabela de <strong className="text-[var(--color-ink)]">{cobertura.primeiro}</strong> a <strong className="text-[var(--color-ink)]">{cobertura.ultimo}</strong>.
              </li>
              {cobertura.janelaForaDaTabela && (
                <li className="text-[var(--color-warning)]">
                  A obra {cobertura.janelaForaDaTabela.inicio ? `começa em ${cobertura.janelaForaDaTabela.inicio}` : ""}
                  {cobertura.janelaForaDaTabela.inicio && cobertura.janelaForaDaTabela.fim ? " e " : ""}
                  {cobertura.janelaForaDaTabela.fim ? `termina em ${cobertura.janelaForaDaTabela.fim}` : ""}, fora da tabela.
                </li>
              )}
              {cobertura.vencimentosForaDaTabela.length > 0 ? (
                <li className="text-[var(--color-warning)]">
                  {cobertura.vencimentosForaDaTabela.length} mês(es) com vencimento de recebível sem linha na tabela — corrigidos por <strong>zero</strong>, em silêncio:{" "}
                  {cobertura.vencimentosForaDaTabela.slice(0, 8).join(", ")}
                  {cobertura.vencimentosForaDaTabela.length > 8 ? "…" : ""}
                </li>
              ) : (
                <li>Todo vencimento das vendas tem linha na tabela.</li>
              )}
            </ul>
          )}
        </AcaoDoPainel>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-[var(--color-ink3)]">
        O assistente não grava índice, não marca mês como oficial e não roda a reprojeção. Ele só identifica o que falta e mostra o efeito do que você está
        prestes a fazer; gravar é sempre pela tabela, com confirmação. Nenhum valor de índice é sugerido sem variante e fonte declaradas.
      </p>
    </aside>
  );
}

function Icone({ cor, d }: { cor: string; d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.9" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function AcaoDoPainel({ cor, icone, titulo, descricao, contador, aberta, onClick, children }: { cor: string; icone: React.ReactNode; titulo: string; descricao: string; contador: number; aberta: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[11px] border border-[var(--color-line)]", aberta && "bg-[var(--color-surface2)]")}>
      <button type="button" onClick={onClick} aria-expanded={aberta} className="flex w-full items-center gap-2.5 rounded-[11px] p-2.5 text-left hover:bg-[var(--color-surface2)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent2)]/40">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px]" style={{ background: cor }}>
          {icone}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-ink)]">
            {titulo}
            {contador > 0 && <Badge tone="danger">{contador}</Badge>}
          </span>
          <span className="block text-[11.5px] leading-snug text-[var(--color-ink2)]">{descricao}</span>
        </span>
        <span className="text-[var(--color-ink3)]" aria-hidden>
          {aberta ? "▾" : "›"}
        </span>
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

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  adotarPlanoPadrao,
  confirmarImportacaoDoPlano,
  previaDaAdocaoDoPadrao,
  previaDaImportacaoDoPlano,
  previaDaReclassificacao,
  reclassificarLancamentos,
  type PreviaDaAdocao,
  type PreviaDaReclassificacao,
} from "@/lib/actions/planocontas-estrutura";
import type { LinhaImportada, PreviaDeImportacao } from "@/lib/planocontas-regras";
import { Mensagem, useAcao, brl } from "@/components/app/contratos/comum";
export interface PermissoesDoPlano {
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  reclassificar: boolean;
}

type Aberto = "importar" | "padrao" | "reclassificar" | null;

/** Exportar, importar (com prévia), adotar o plano padrão e reclassificar lançamentos. */
export function FerramentasDoPlano({ perms, contas }: { perms: PermissoesDoPlano; contas: { code: string; name: string; ativo: boolean; natureza: string }[] }) {
  const [aberto, setAberto] = useState<Aberto>(null);
  const alternar = (a: Aberto) => setAberto(aberto === a ? null : a);
  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2 text-[12.5px]">
        <a className="rounded-[8px] border border-[var(--color-line)] bg-white px-3 py-1.5 hover:bg-[var(--color-surface2)]" href="/planocontas/exportar?formato=xlsx">
          Exportar XLSX
        </a>
        <a className="rounded-[8px] border border-[var(--color-line)] bg-white px-3 py-1.5 hover:bg-[var(--color-surface2)]" href="/planocontas/exportar?formato=csv">
          Exportar CSV
        </a>
        {perms.criar && perms.editar && (
          <Button size="sm" variant="outline" onClick={() => alternar("importar")}>
            Importar planilha
          </Button>
        )}
        {perms.criar && (
          <Button size="sm" variant="outline" onClick={() => alternar("padrao")}>
            Plano padrão ambiental
          </Button>
        )}
        {perms.reclassificar && (
          <Button size="sm" variant="outline" onClick={() => alternar("reclassificar")}>
            Reclassificar lançamentos
          </Button>
        )}
      </div>
      {aberto === "importar" && <Importar />}
      {aberto === "padrao" && <AdotarPadrao />}
      {aberto === "reclassificar" && <Reclassificar contas={contas} />}
    </div>
  );
}

const caixa = "mt-2 rounded-[12px] border border-[var(--color-line)] bg-white p-4 text-[12.5px]";

function Importar() {
  const { rodar, pendente, msg, setMsg } = useAcao();
  const [previa, setPrevia] = useState<PreviaDeImportacao | null>(null);
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]);
  const [confirmo, setConfirmo] = useState(false);
  const impactoEmUso = previa?.impactoDre.filter((x) => x.usada) ?? [];
  return (
    <div className={caixa} data-testid="importar-plano">
      <p className="mb-2 text-[var(--color-ink2)]">
        Planilha XLSX ou CSV com as colunas <strong>Código, Nome, Grupo, Natureza, Categoria DRE</strong> e, opcional, <strong>Descrição</strong>. Contas novas entram; nas
        existentes, mudam nome, descrição e categoria. Código nunca muda. Nada é gravado antes de confirmar.
      </p>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          setPrevia(null);
          const r = await previaDaImportacaoDoPlano(new FormData(e.currentTarget));
          if (!r.ok) return setMsg({ tom: "erro", texto: r.error });
          setPrevia(r.previa);
          setLinhas(r.linhas);
        }}
      >
        <input type="file" name="file" accept=".xlsx,.xls,.csv" aria-label="Planilha do plano de contas" />
        <Button size="sm" variant="outline">
          Ver prévia
        </Button>
      </form>
      {previa && (
        <div className="mt-3 space-y-2" data-testid="previa-importacao">
          <p>
            <strong>{previa.novas.length}</strong> conta(s) nova(s) · <strong>{previa.alteradas.length}</strong> alterada(s) · {previa.iguais} sem mudança ·{" "}
            <strong>{previa.duplicidades.length}</strong> duplicidade(s) · <strong>{previa.erros.length}</strong> erro(s) · {previa.impactoDre.length} mudança(s) de categoria da DRE
          </p>
          {previa.alteradas.length > 0 && <Lista titulo="Alteradas" itens={previa.alteradas.map((a) => `${a.linha.code}: ${a.mudancas.join("; ")}`)} />}
          {previa.duplicidades.length > 0 && <Lista titulo="Duplicidades" itens={previa.duplicidades.map((d) => `linha ${d.linha} · ${d.code}: ${d.motivo}`)} />}
          {previa.erros.length > 0 && <Lista titulo="Erros (ficam de fora)" itens={previa.erros.map((d) => `linha ${d.linha} · ${d.code}: ${d.motivo}`)} />}
          {impactoEmUso.length > 0 && (
            <label className="flex items-center gap-2 text-[#92400e]">
              <input type="checkbox" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} />
              Confirmo: {impactoEmUso.length} conta(s) com lançamentos mudam de categoria da DRE ({impactoEmUso.map((x) => `${x.code}: ${x.de} → ${x.para}`).join("; ")}).
            </label>
          )}
          <Button
            size="sm"
            disabled={pendente || (!previa.novas.length && !previa.alteradas.length) || (impactoEmUso.length > 0 && !confirmo)}
            onClick={() => rodar(() => confirmarImportacaoDoPlano({ linhas, confirmarImpacto: confirmo }), "Importação concluída.", () => setPrevia(null))}
          >
            Confirmar importação
          </Button>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <details>
      <summary className="cursor-pointer">
        {titulo} ({itens.length})
      </summary>
      <ul className="mt-1 max-h-48 list-disc overflow-y-auto pl-5">
        {itens.slice(0, 200).map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </details>
  );
}

function AdotarPadrao() {
  const { rodar, pendente, msg, setMsg } = useAcao();
  const [previa, setPrevia] = useState<PreviaDaAdocao | null>(null);
  return (
    <div className={caixa} data-testid="adotar-padrao">
      <p className="mb-2 text-[var(--color-ink2)]">
        Acrescenta ao plano da empresa os grupos e contas do <strong>plano padrão para consultorias ambientais</strong> que ainda não existem. É aditivo: nada existente é
        renomeado, recodificado ou apagado, e as contas que não forem usadas podem ser inativadas. Depois, use “Reclassificar lançamentos” para mover o histórico, se quiser.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          setMsg(null);
          const r = await previaDaAdocaoDoPadrao();
          if (r.ok) setPrevia(r.previa);
          else setMsg({ tom: "erro", texto: r.error });
        }}
      >
        Ver o que entraria
      </Button>
      {previa && (
        <div className="mt-3 space-y-2">
          <p>
            Versão {previa.versao}: <strong>{previa.gruposNovos.length}</strong> grupo(s) e <strong>{previa.contasNovas.length}</strong> conta(s) novos · {previa.jaExistem} já
            existem · {previa.ajustados.length} grupo(s) com código ajustado · <strong>{previa.conflitos.length}</strong> conta(s) com código ocupado (não entram)
          </p>
          {previa.ajustados.length > 0 && <Lista titulo="Grupos com código ajustado" itens={previa.ajustados.map((c) => `${c.code}: ${c.motivo}`)} />}
          {previa.conflitos.length > 0 && <Lista titulo="Contas que não entram" itens={previa.conflitos.map((c) => `${c.code}: ${c.motivo}`)} />}
          {previa.contasNovas.length > 0 && <Lista titulo="Contas novas" itens={previa.contasNovas.map((c) => `${c.code} — ${c.name} (grupo ${c.grupo})`)} />}
          <Button size="sm" disabled={pendente || (!previa.gruposNovos.length && !previa.contasNovas.length)} onClick={() => rodar(() => adotarPlanoPadrao(), "Plano padrão acrescentado.", () => setPrevia(null))}>
            Acrescentar ao plano
          </Button>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

function Reclassificar({ contas }: { contas: { code: string; name: string; ativo: boolean; natureza: string }[] }) {
  const { rodar, pendente, msg, setMsg } = useAcao();
  const [de, setDe] = useState("");
  const [para, setPara] = useState("");
  const [previa, setPrevia] = useState<PreviaDaReclassificacao | null>(null);
  const ord = [...contas].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  return (
    <div className={caixa} data-testid="reclassificar">
      <p className="mb-2 text-[var(--color-ink2)]">
        Move os lançamentos de despesa de uma conta para outra, nos projetos que você vê. Versões congeladas não mudam. O Orçamento (por grupo) não muda. Fica registrado na
        auditoria.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select className="h-9 w-[260px]" value={de} onChange={(e) => (setDe(e.target.value), setPrevia(null))} aria-label="Conta de origem">
          <option value="">De (conta atual)…</option>
          {ord.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
              {c.ativo ? "" : " (inativa)"}
            </option>
          ))}
        </Select>
        <Select className="h-9 w-[260px]" value={para} onChange={(e) => (setPara(e.target.value), setPrevia(null))} aria-label="Conta de destino">
          <option value="">Para (conta ativa)…</option>
          {ord
            .filter((c) => c.ativo && c.natureza === "despesa" && c.code !== de)
            .map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={!de || !para}
          onClick={async () => {
            setMsg(null);
            const r = await previaDaReclassificacao(de, para);
            if (r.ok) setPrevia(r.previa);
            else setMsg({ tom: "erro", texto: r.error });
          }}
        >
          Ver impacto
        </Button>
      </div>
      {previa && (
        <div className="mt-3 space-y-1" data-testid="previa-reclassificacao">
          <p>
            <strong>{previa.lancamentos}</strong> lançamento(s) · {brl(previa.valor)} mudam de {previa.de} para {previa.para}
            {previa.congelados ? ` · ${previa.congelados} em versão congelada ficam como estão` : ""}.
          </p>
          {previa.porVersao.map((v) => (
            <p key={v.tipo} className="text-[var(--color-ink3)]">
              versão {v.tipo}: {v.n} · {brl(v.valor)}
            </p>
          ))}
          {previa.categoriaMuda && (
            <p className="text-[#92400e]">
              Categoria da DRE: {previa.categoriaMuda.de} → {previa.categoriaMuda.para}.{" "}
              {previa.chaveLigada ? "Com a chave de categoria ligada, a DRE desses lançamentos muda." : "A categoria gravada em cada lançamento não muda (chave desligada)."}
            </p>
          )}
          <Button size="sm" disabled={pendente || !previa.lancamentos} onClick={() => rodar(() => reclassificarLancamentos({ de, para, confirmar: true }), "Reclassificação feita.", () => setPrevia(null))}>
            Confirmar reclassificação
          </Button>
        </div>
      )}
      <Mensagem msg={msg} />
    </div>
  );
}

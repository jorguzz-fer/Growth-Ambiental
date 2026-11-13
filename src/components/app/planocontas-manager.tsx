"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addChartItem,
  deleteChartGroup,
  deleteChartItem,
  setChartAccountAtivo,
  updateChartItem,
} from "@/lib/actions/planocontas";
import { salvarGrupoDoPlano, previaDaReclassificacao, reclassificarLancamentos } from "@/lib/actions/planocontas-estrutura";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { categoriasPermitidasDaConta } from "@/lib/categoria-do-plano";
import { defaultDreCategory } from "@/lib/budget/config";
import { CATEGORIAS_DRE } from "@/lib/calc/constants";
import { normalizar } from "@/lib/planocontas-regras";

/**
 * Plano de Contas — layout de grupos e subitens (cartão por subgrupo, chips
 * com a categoria da DRE, "Editar" no próprio cartão), agora com a hierarquia
 * Grupo → Subgrupo → Conta, busca e filtros. Toda gravação passa pelas ações
 * do servidor, que conferem permissão e empresa.
 */

type Kind = "cef" | "complementar";
type Natureza = "receita" | "despesa";
export interface ContaDaTela {
  id: string;
  code: string;
  name: string;
  natureza: Natureza;
  ativo: boolean;
  /** categoria da DRE que vale (escolhida ou padrão). */
  categoria: string;
  categoriaPadrao: string;
  categoriaEscolhida: string | null;
  descricao: string | null;
  groupCode: string;
}
export interface SubgrupoDaTela {
  id: string | null;
  code: string;
  name: string;
  kind: Kind;
  ativo: boolean;
  parentId: string | null;
  contas: ContaDaTela[];
}
export interface GrupoDaTela {
  id: string | null;
  code: string;
  name: string;
  kind: Kind;
  ativo: boolean;
  descricao: string | null;
  /** contas lançadas direto no grupo (plano antigo, sem subgrupos). */
  direto: SubgrupoDaTela | null;
  subgrupos: SubgrupoDaTela[];
}
export interface PlanoPerms {
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  reclassificar: boolean;
}
export interface UsoNaTela {
  despesas: number;
  orcamento: number;
  medicoes: number;
}

/* ───────── classes do padrão visual, aplicadas no ponto de uso ───────── */
const CARTAO = "rounded-[16px] border border-[var(--color-line)] bg-white shadow-[0_1px_3px_rgba(22,35,59,.06)]";
const BLOCO = "rounded-[13px] border border-[#EDF1F7] bg-[#FCFDFF]";
const CAMPO = "h-10 rounded-[9px] border-[var(--color-line)] text-[13px] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25";
const BOTAO_PRIMARIO = "h-10 rounded-[9px] bg-[var(--color-brand)] px-4 text-[13px] text-white hover:bg-[var(--color-brand-soft)] focus-visible:ring-[#3B82F6]";
const BOTAO_SECUNDARIO = "h-10 rounded-[9px] border border-[var(--color-line)] bg-white px-4 text-[13px] text-[var(--color-v2-ink)] hover:bg-[var(--color-surface2)] focus-visible:ring-[#3B82F6]";
const LINK = "rounded-[6px] px-1 text-[12px] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40 disabled:opacity-50";
const ROTULO = "mb-1 block text-[11px] font-medium text-[var(--color-v2-ink2)]";
const NATUREZA: Record<Natureza, { texto: string; ponto: string; rotulo: string }> = {
  receita: { texto: "text-[#0F8A5F]", ponto: "bg-[#0F8A5F]", rotulo: "Receita" },
  despesa: { texto: "text-[#C0334A]", ponto: "bg-[#C0334A]", rotulo: "Despesa" },
};

/** Onde a conta aparece na DRE, pela categoria — para quem não é contador. */
export const ONDE_NA_DRE: Record<string, string> = {
  Receita: "Receita: topo da DRE (receita bruta).",
  "Custo Variável": "Custo dos serviços: reduz a Margem de Contribuição.",
  "Despesa Variável": "Despesa variável (tributos sobre faturamento, comercial): reduz a Margem de Contribuição.",
  "Custo Fixo": "Custo fixo: abaixo da Margem de Contribuição, antes do EBITDA.",
  "Despesa Fixa": "Despesa fixa (estrutura da empresa): antes do EBITDA.",
  Retiradas: "Retiradas dos sócios: antes do EBITDA.",
  Investimento: "Investimentos: depois do EBITDA, no resultado final de caixa.",
  Empréstimos: "Empréstimos: depois do EBITDA, no resultado final de caixa.",
  "Despesas Financeiras": "Resultado financeiro: depois do EBITDA.",
};

type Situacao = "ativas" | "inativas" | "todas";
interface Filtros {
  busca: string;
  natureza: "" | Natureza;
  categoria: string;
  situacao: Situacao;
}

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>, depois?: () => void) => {
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (r && !r.ok) setError(r.error ?? "Erro.");
        else depois?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
      }
    });
  };
  return { pending, error, run };
}

const casa = (c: ContaDaTela, f: Filtros) => {
  if (f.situacao === "ativas" && !c.ativo) return false;
  if (f.situacao === "inativas" && c.ativo) return false;
  if (f.natureza && c.natureza !== f.natureza) return false;
  if (f.categoria && c.categoria !== f.categoria) return false;
  if (f.busca) {
    const b = normalizar(f.busca);
    if (!c.code.toLowerCase().startsWith(f.busca.trim().toLowerCase()) && !normalizar(c.name).includes(b) && !normalizar(c.descricao ?? "").includes(b)) return false;
  }
  return true;
};
const filtrado = (s: SubgrupoDaTela, f: Filtros): SubgrupoDaTela => ({ ...s, contas: s.contas.filter((c) => casa(c, f)) });
const proximoCodigo = (sub: SubgrupoDaTela) => {
  const usados = new Set(sub.contas.map((c) => c.code));
  for (let i = sub.contas.length + 1; ; i++) {
    const c = `${sub.code}.${String(i).padStart(2, "0")}`;
    if (!usados.has(c)) return c;
  }
};

export function PlanoContasManager({
  grupos,
  inativos,
  perms,
  uso,
  equivalentes,
}: {
  grupos: GrupoDaTela[];
  /** grupos inativos (plano anterior arquivado ou desativado pela empresa). */
  inativos: GrupoDaTela[];
  perms: PlanoPerms;
  /** uso por código (só para quem vê Despesas/Orçamento); null = sem acesso. */
  uso: Record<string, UsoNaTela> | null;
  /** sugestão de conta ambiental equivalente para conta antiga. */
  equivalentes: Record<string, { code: string; nome: string }>;
}) {
  const [f, setF] = useState<Filtros>({ busca: "", natureza: "", categoria: "", situacao: "ativas" });
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(grupos.map((g) => g.code)));
  const filtrando = !!(f.busca || f.natureza || f.categoria || f.situacao !== "ativas");
  const subgruposAtivos = useMemo(
    () => grupos.flatMap((g) => [...(g.direto ? [g.direto] : []), ...g.subgrupos]).filter((s) => s.ativo && s.id),
    [grupos],
  );
  const visiveis = grupos
    .map((g) => ({
      ...g,
      direto: g.direto ? filtrado(g.direto, f) : null,
      // com filtro, só os subgrupos que têm conta compatível
      subgrupos: g.subgrupos.map((s) => filtrado(s, f)).filter((s) => !filtrando || s.contas.length > 0),
    }))
    .filter((g) => !filtrando || (g.direto?.contas.length ?? 0) + g.subgrupos.reduce((a, s) => a + s.contas.length, 0) > 0);
  const total = grupos.reduce((a, g) => a + (g.direto?.contas.length ?? 0) + g.subgrupos.reduce((b, s) => b + s.contas.length, 0), 0);
  const contasInativas = inativos.reduce((a, g) => a + (g.direto?.contas.length ?? 0) + g.subgrupos.reduce((b, s) => b + s.contas.length, 0), 0);

  return (
    <div className="space-y-5">
      {/* Busca e filtros */}
      <div className={cn(CARTAO, "flex flex-wrap items-end gap-2 p-3")} role="search" aria-label="Pesquisar contas">
        <div className="min-w-[200px] flex-1">
          <label className={ROTULO} htmlFor="busca-plano">Pesquisar (código, nome ou descrição)</label>
          <Input id="busca-plano" value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} placeholder="ex.: 2.3 ou hospedagem" className={CAMPO} />
        </div>
        <div className="w-32">
          <label className={ROTULO} htmlFor="f-natureza">Natureza</label>
          <Select id="f-natureza" value={f.natureza} onChange={(e) => setF({ ...f, natureza: e.target.value as Filtros["natureza"] })} className={CAMPO}>
            <option value="">Todas</option>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </Select>
        </div>
        <div className="w-48">
          <label className={ROTULO} htmlFor="f-categoria">Categoria da DRE</label>
          <Select id="f-categoria" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={CAMPO}>
            <option value="">Todas</option>
            {CATEGORIAS_DRE.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <label className={ROTULO} htmlFor="f-situacao">Situação</label>
          <Select id="f-situacao" value={f.situacao} onChange={(e) => setF({ ...f, situacao: e.target.value as Situacao })} className={CAMPO}>
            <option value="ativas">Ativas</option>
            <option value="inativas">Inativas</option>
            <option value="todas">Todas</option>
          </Select>
        </div>
        <div className="flex gap-1 pb-2">
          <button type="button" className={cn(LINK, "text-[var(--color-brand)]")} onClick={() => setAbertos(new Set(grupos.map((g) => g.code)))}>Expandir tudo</button>
          <button type="button" className={cn(LINK, "text-[var(--color-brand)]")} onClick={() => setAbertos(new Set())}>Recolher tudo</button>
        </div>
        <p className="w-full text-[11.5px] text-[var(--color-v2-ink3)]" aria-live="polite">
          {total} conta(s) no plano ativo{contasInativas ? ` · ${contasInativas} em grupos inativos (abaixo)` : ""}{filtrando ? " · filtro aplicado" : ""}
        </p>
      </div>

      {visiveis.map((g) => (
        <GrupoSection
          key={g.code}
          grupo={g}
          aberto={filtrando || abertos.has(g.code)}
          alternar={() => setAbertos((a) => { const n = new Set(a); if (n.has(g.code)) n.delete(g.code); else n.add(g.code); return n; })}
          perms={perms}
          grupos={grupos}
          subgrupos={subgruposAtivos}
          uso={uso}
        />
      ))}
      {visiveis.length === 0 && <p className="text-[13px] text-[var(--color-ink4)]">Nenhuma conta com esses filtros.</p>}

      {perms.criar && !filtrando && <NovoGrupo />}

      {inativos.length > 0 && (
        <details className={cn(CARTAO, "p-4")} data-testid="plano-anterior">
          <summary className="cursor-pointer text-[14px] font-semibold text-[var(--color-v2-ink)]">
            Plano anterior e grupos inativos · {contasInativas} conta(s) preservadas para o histórico
          </summary>
          <p className="mt-2 text-[12px] text-[var(--color-v2-ink2)]">
            Não recebem lançamentos novos. Os lançamentos já feitos continuam com estas contas, com o mesmo valor e a mesma categoria da DRE.
            Para trazê-los ao plano atual, use &ldquo;Reclassificar&rdquo; (com prévia; versões congeladas não mudam).
          </p>
          <div className="mt-3 space-y-3">
            {inativos.map((g) => (
              <GrupoInativo key={g.code} grupo={g} perms={perms} uso={uso} equivalentes={equivalentes} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className={cn("shrink-0 transition-transform motion-reduce:transition-none", aberto && "rotate-90")}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function GrupoSection({
  grupo,
  aberto,
  alternar,
  perms,
  grupos,
  subgrupos,
  uso,
}: {
  grupo: GrupoDaTela;
  aberto: boolean;
  alternar: () => void;
  perms: PlanoPerms;
  grupos: GrupoDaTela[];
  subgrupos: SubgrupoDaTela[];
  uso: Record<string, UsoNaTela> | null;
}) {
  const n = (grupo.direto?.contas.length ?? 0) + grupo.subgrupos.reduce((a, s) => a + s.contas.length, 0);
  const [novoSub, setNovoSub] = useState(false);
  return (
    <section aria-label={`${grupo.code} ${grupo.name}`} data-grupo-topo={grupo.code}>
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={alternar} aria-expanded={aberto} className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40">
          <span className="text-[var(--color-v2-ink3)]"><Chevron aberto={aberto} /></span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-[var(--color-brand)] px-1.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold text-white">{grupo.code}</span>
          <h2 className="text-[15px] font-semibold text-[var(--color-v2-ink)]">{grupo.name}</h2>
        </button>
        <span className="text-[11px] text-[var(--color-v2-ink3)]">{grupo.subgrupos.length} subgrupo(s) · {n} conta(s){grupo.kind === "cef" ? " · custos diretos (Orçamento e Medição)" : ""}</span>
        {perms.criar && grupo.id && (
          <button type="button" className={cn(LINK, "ml-auto text-[var(--color-brand)]")} onClick={() => setNovoSub((x) => !x)} aria-expanded={novoSub}>
            + Novo subgrupo
          </button>
        )}
      </div>
      {aberto && (
        <div className="space-y-3 border-l-2 border-[#EDF1F7] pl-3">
          {grupo.descricao && <p className="text-[12px] text-[var(--color-v2-ink2)]">{grupo.descricao}</p>}
          {novoSub && grupo.id && <NovoSubgrupo grupo={grupo} fechar={() => setNovoSub(false)} />}
          {grupo.direto && grupo.direto.contas.length > 0 && <SubgrupoCard sub={grupo.direto} perms={perms} grupos={grupos} subgrupos={subgrupos} uso={uso} />}
          {grupo.subgrupos.map((s) => (
            <SubgrupoCard key={s.code} sub={s} perms={perms} grupos={grupos} subgrupos={subgrupos} uso={uso} />
          ))}
          {grupo.subgrupos.length === 0 && !grupo.direto && <p className="text-[12px] text-[var(--color-ink4)]">Sem subgrupos.</p>}
        </div>
      )}
    </section>
  );
}

/** A categoria mais frequente das contas ativas do subgrupo (sugestão para a conta nova). */
function categoriaDoSub(sub: SubgrupoDaTela): string {
  const conta = new Map<string, number>();
  for (const it of sub.contas.filter((i) => i.ativo)) conta.set(it.categoria, (conta.get(it.categoria) ?? 0) + 1);
  const [mais] = [...conta.entries()].sort((a, b) => b[1] - a[1]);
  return mais?.[0] ?? defaultDreCategory(sub.kind);
}

function SubgrupoCard({ sub, perms, grupos, subgrupos, uso }: { sub: SubgrupoDaTela; perms: PlanoPerms; grupos: GrupoDaTela[]; subgrupos: SubgrupoDaTela[]; uso: Record<string, UsoNaTela> | null }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useRun();
  const [nome, setNome] = useState(sub.name);
  const [pai, setPai] = useState(sub.parentId ?? "");
  const canManage = perms.criar || perms.editar || perms.excluir;
  const topos = grupos.filter((g) => g.id && g.ativo);

  return (
    <div className={cn(CARTAO, "p-4")} data-grupo={sub.code}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-[var(--color-accent4)] px-1.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold text-[var(--color-accent)]">{sub.code}</span>
        <span className="flex-1 text-[14px] font-semibold text-[var(--color-v2-ink)]">{sub.name}</span>
        <span className="text-[11px] text-[var(--color-v2-ink3)]">{sub.contas.length} {sub.contas.length === 1 ? "conta" : "contas"}</span>
        {canManage && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={cn(LINK, "text-[var(--color-brand)]")}>
            {open ? "Fechar" : "Editar"}
          </button>
        )}
      </div>

      {!open ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {sub.contas.map((it) => (
            <span key={it.id} title={it.descricao ?? undefined} className={cn("inline-flex items-center gap-1.5 rounded-[8px] border border-[#EDF1F7] bg-[#FCFDFF] px-2.5 py-1 text-[12px] text-[var(--color-v2-ink2)]", !it.ativo && "opacity-55")}>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-v2-ink3)]">{it.code}</span>
              {it.name}
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", NATUREZA[it.natureza].ponto)} title={NATUREZA[it.natureza].rotulo} />
              <span className="text-[10.5px] text-[var(--color-v2-ink3)]" data-categoria-conta={it.code}>
                · {it.categoria}
                {!it.categoriaEscolhida && " (padrão)"}
              </span>
              {!it.ativo && <span className="text-[10px] text-[var(--color-v2-ink3)]">inativa</span>}
            </span>
          ))}
          {sub.contas.length === 0 && <span className="text-[12px] text-[var(--color-ink4)]">Sem contas.</span>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {sub.id && (perms.editar || perms.excluir) && (
            <div className={cn(BLOCO, "flex flex-wrap items-end gap-2 p-3")}>
              <div className="min-w-[180px] flex-1">
                <label className={ROTULO}>Nome do subgrupo</label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={!perms.editar || pending} className={CAMPO} aria-label="Nome do subgrupo" />
              </div>
              <div className="w-56">
                <label className={ROTULO}>Grupo superior</label>
                <Select value={pai} onChange={(e) => setPai(e.target.value)} disabled={!perms.editar || pending} className={CAMPO} aria-label="Grupo superior">
                  <option value="">(nenhum — grupo de 1º nível)</option>
                  {topos.map((g) => (
                    <option key={g.id!} value={g.id!}>{g.code} {g.name}</option>
                  ))}
                </Select>
              </div>
              {perms.editar && (
                <Button size="sm" disabled={pending || (nome === sub.name && pai === (sub.parentId ?? ""))} className={BOTAO_PRIMARIO} onClick={() => run(() => salvarGrupoDoPlano({ id: sub.id, code: sub.code, name: nome, parentId: pai || null }))}>
                  Salvar
                </Button>
              )}
              {perms.excluir && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`Excluir o subgrupo "${sub.code} ${sub.name}"? Só é possível sem lançamentos, Orçamento ou medição.`)) run(() => deleteChartGroup({ kind: sub.kind, groupCode: sub.code }));
                  }}
                  className={cn(LINK, "h-10 text-[#C0334A]")}
                >
                  Excluir subgrupo
                </button>
              )}
            </div>
          )}
          <div className="space-y-2 border-l-2 border-[#EDF1F7] pl-3">
            {sub.contas.map((it) => (
              <ItemRow key={it.id} item={it} perms={perms} subgrupos={subgrupos} uso={uso?.[it.code] ?? null} />
            ))}
            {sub.contas.length === 0 && <span className="text-[12px] text-[var(--color-ink4)]">Sem contas.</span>}
          </div>
          {perms.criar && sub.ativo && <NovaConta sub={sub} />}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[12px] text-[#C0334A]">{error}</p>}
    </div>
  );
}

function SeletorDeCategoria({ natureza, valor, mudar, rotulo, padrao, disabled }: { natureza: Natureza; valor: string; mudar: (v: string) => void; rotulo: string; padrao?: string | null; disabled?: boolean }) {
  const opcoes = categoriasPermitidasDaConta(natureza) as string[];
  return (
    <Select value={valor} onChange={(e) => mudar(e.target.value)} disabled={disabled} className={cn(CAMPO, "w-48")} title="Categoria da DRE da conta" aria-label={rotulo}>
      {padrao !== undefined && <option value="">Padrão: {padrao ?? "pelo grupo"}</option>}
      {opcoes.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </Select>
  );
}

function ItemRow({ item, perms, subgrupos, uso }: { item: ContaDaTela; perms: PlanoPerms; subgrupos: SubgrupoDaTela[]; uso: UsoNaTela | null }) {
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [natureza, setNatureza] = useState<Natureza>(item.natureza);
  const [categoria, setCategoria] = useState(item.categoriaEscolhida ?? "");
  const [grupo, setGrupo] = useState(item.groupCode);
  const [descricao, setDescricao] = useState(item.descricao ?? "");
  const { pending, error, run } = useRun();
  const opcoesDeCategoria = categoriasPermitidasDaConta(natureza) as string[];
  const categoriaServe = !categoria || opcoesDeCategoria.includes(categoria);
  const dirty = code !== item.code || name !== item.name || natureza !== item.natureza || categoria !== (item.categoriaEscolhida ?? "") || grupo !== item.groupCode || descricao !== (item.descricao ?? "");
  const efetiva = (categoriaServe && categoria) || (natureza === item.natureza ? item.categoriaPadrao : natureza === "receita" ? "Receita" : "");
  const temUso = !!uso && uso.despesas + uso.orcamento + uso.medicoes > 0;

  return (
    <div className={cn("rounded-[10px] py-1", !item.ativo && "opacity-55")} data-conta={item.code}>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} disabled={!perms.editar || pending || temUso} title={temUso ? "Conta com lançamentos: o código não muda" : undefined} className={cn(CAMPO, "w-24 font-[family-name:var(--font-mono)]")} aria-label={`Código de ${item.name}`} />
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!perms.editar || pending} className={cn(CAMPO, "min-w-[160px] flex-1")} aria-label={`Nome de ${item.code}`} />
        <Select value={natureza} onChange={(e) => setNatureza(e.target.value as Natureza)} disabled={!perms.editar || pending} className={cn(CAMPO, "w-28 font-medium", NATUREZA[natureza].texto)} title="Natureza da conta" aria-label={`Natureza de ${item.code}`}>
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </Select>
        <SeletorDeCategoria natureza={natureza} valor={categoriaServe ? categoria : ""} mudar={setCategoria} rotulo={`Categoria da DRE de ${item.code}`} padrao={natureza === item.natureza ? item.categoriaPadrao : natureza === "receita" ? "Receita" : null} disabled={!perms.editar || pending} />
        {perms.editar && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !dirty}
            className={BOTAO_SECUNDARIO}
            onClick={() =>
              run(async () => {
                const patch = { code, name, natureza, dreCategory: categoriaServe ? categoria || null : null, groupCode: grupo, descricao };
                const r = await updateChartItem(item.id, patch);
                if (r && !r.ok && r.precisaConfirmar) {
                  if (!window.confirm(r.error)) return;
                  return updateChartItem(item.id, { ...patch, confirmar: true });
                }
                return r;
              })
            }
          >
            Salvar
          </Button>
        )}
        {perms.editar && (
          <button type="button" disabled={pending} onClick={() => run(() => setChartAccountAtivo(item.id, !item.ativo))} className={cn(LINK, "text-[var(--color-brand)]")} title={item.ativo ? "Inativar (some de novos lançamentos)" : "Reativar"}>
            {item.ativo ? "Inativar" : "Reativar"}
          </button>
        )}
        {perms.excluir && !temUso && (
          <button type="button" disabled={pending} onClick={() => run(() => deleteChartItem(item.id))} className={cn(LINK, "text-[#C0334A] hover:opacity-70")} title="Excluir conta (só sem lançamentos)" aria-label={`Excluir conta ${item.code}`}>
            ×
          </button>
        )}
      </div>
      {perms.editar && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1 text-[11.5px] text-[var(--color-v2-ink3)]">
          <label className="flex items-center gap-1.5">
            Mover para
            <Select value={grupo} onChange={(e) => setGrupo(e.target.value)} disabled={pending} className="h-8 rounded-[8px] border-[var(--color-line)] text-[12px]" aria-label={`Subgrupo de ${item.code}`}>
              {!subgrupos.some((s) => s.code === item.groupCode) && <option value={item.groupCode}>{item.groupCode}</option>}
              {subgrupos.map((s) => (
                <option key={s.code} value={s.code}>{s.code} {s.name}</option>
              ))}
            </Select>
          </label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional): quando usar esta conta" disabled={pending} className="h-8 min-w-[220px] flex-1 rounded-[8px] border-[var(--color-line)] text-[12px]" aria-label={`Descrição de ${item.code}`} />
          {efetiva && <span>{ONDE_NA_DRE[efetiva]}</span>}
          {uso && temUso && <span>· {uso.despesas} despesa(s){uso.orcamento ? `, ${uso.orcamento} linha(s) de Orçamento` : ""}</span>}
        </div>
      )}
      {error && <span role="alert" className="block text-[12px] text-[#C0334A]">{error}</span>}
    </div>
  );
}

function NovaConta({ sub }: { sub: SubgrupoDaTela }) {
  const [code, setCode] = useState(proximoCodigo(sub));
  const [name, setName] = useState("");
  const [natureza, setNatureza] = useState<Natureza>(sub.contas.length && sub.contas.every((i) => i.natureza === "receita") ? "receita" : "despesa");
  const [categoria, setCategoria] = useState(categoriaDoSub(sub));
  const [descricao, setDescricao] = useState("");
  const { pending, error, run } = useRun();
  const opcoes = categoriasPermitidasDaConta(natureza) as string[];
  const categoriaFinal = opcoes.includes(categoria) ? categoria : opcoes[0];

  return (
    <div className={cn(BLOCO, "space-y-2 p-3")} data-nova-conta={sub.code}>
      <p className="text-[12px] font-medium text-[var(--color-v2-ink)]">Nova conta em {sub.code} {sub.name}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da conta" disabled={pending} className={cn(CAMPO, "min-w-[180px] flex-1")} aria-label="Nome do novo subitem" />
        <Select value={natureza} onChange={(e) => setNatureza(e.target.value as Natureza)} disabled={pending} className={cn(CAMPO, "w-28")} aria-label="Natureza do novo subitem">
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </Select>
        <SeletorDeCategoria natureza={natureza} valor={categoriaFinal} mudar={setCategoria} rotulo="Categoria da DRE do novo subitem" disabled={pending} />
        <Input value={code} onChange={(e) => setCode(e.target.value)} disabled={pending} title="Código sugerido (pode trocar)" className={cn(CAMPO, "w-24 font-[family-name:var(--font-mono)]")} aria-label="Código do novo subitem" />
        <Button
          size="sm"
          disabled={pending || !code.trim() || !name.trim()}
          className={BOTAO_PRIMARIO}
          onClick={() =>
            run(
              () => addChartItem({ kind: sub.kind, groupCode: sub.code, groupName: sub.name, code, name, natureza, dreCategory: categoriaFinal, descricao }),
              () => {
                setName("");
                setDescricao("");
                setCode((c) => c.replace(/(\d+)$/, (n) => String(Number(n) + 1).padStart(n.length, "0")));
              },
            )
          }
        >
          Adicionar
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional): quando usar esta conta" disabled={pending} className="h-8 min-w-[260px] flex-1 rounded-[8px] border-[var(--color-line)] text-[12px]" aria-label="Descrição do novo subitem" />
        <span className="text-[11.5px] text-[var(--color-v2-ink3)]">{ONDE_NA_DRE[categoriaFinal]}</span>
      </div>
      {error && <span role="alert" className="text-[12px] text-[#C0334A]">{error}</span>}
    </div>
  );
}

function NovoSubgrupo({ grupo, fechar }: { grupo: GrupoDaTela; fechar: () => void }) {
  const usados = new Set(grupo.subgrupos.map((s) => s.code));
  let i = grupo.subgrupos.length + 1;
  while (usados.has(`${grupo.code}.${i}`)) i++;
  const [code, setCode] = useState(`${grupo.code}.${i}`);
  const [name, setName] = useState("");
  const { pending, error, run } = useRun();
  return (
    <div className={cn(BLOCO, "flex flex-wrap items-end gap-2 p-3")} data-novo-subgrupo={grupo.code}>
      <div className="w-24">
        <label className={ROTULO}>Código</label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} className={cn(CAMPO, "font-[family-name:var(--font-mono)]")} aria-label="Código do subgrupo" />
      </div>
      <div className="min-w-[200px] flex-1">
        <label className={ROTULO}>Nome do subgrupo</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Programas socioambientais" className={CAMPO} aria-label="Nome do novo subgrupo" />
      </div>
      <Button size="sm" disabled={pending || !code.trim() || !name.trim()} className={BOTAO_PRIMARIO} onClick={() => run(() => salvarGrupoDoPlano({ code, name, parentId: grupo.id }), fechar)}>
        Criar subgrupo
      </Button>
      <button type="button" onClick={fechar} className={cn(LINK, "h-10 text-[var(--color-v2-ink2)]")}>Cancelar</button>
      {error && <span role="alert" className="w-full text-[12px] text-[#C0334A]">{error}</span>}
    </div>
  );
}

function NovoGrupo() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("complementar");
  const { pending, error, run } = useRun();
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className="flex w-full items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-[var(--color-line)] bg-white/60 px-3 py-2.5 text-[12.5px] text-[var(--color-v2-ink2)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]">
        + Novo grupo
      </button>
    );
  return (
    <div className={cn(CARTAO, "space-y-3 p-4")}>
      <h3 className="text-[14px] font-semibold text-[var(--color-v2-ink)]">Novo grupo (1º nível)</h3>
      <div className={cn(BLOCO, "flex flex-wrap items-end gap-2 p-3")}>
        <div className="w-24">
          <label className={ROTULO}>Código</label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="7" className={CAMPO} aria-label="Código grupo" />
        </div>
        <div className="min-w-[180px] flex-1">
          <label className={ROTULO}>Nome do grupo</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Projetos especiais" className={CAMPO} aria-label="Nome do grupo" />
        </div>
        <div className="w-56">
          <label className={ROTULO}>Tipo</label>
          <Select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={CAMPO} aria-label="Tipo do grupo">
            <option value="cef">Custos diretos dos serviços</option>
            <option value="complementar">Receitas, despesas e demais</option>
          </Select>
        </div>
      </div>
      <p className="text-[11.5px] text-[var(--color-v2-ink3)]">Depois de criar, use &ldquo;+ Novo subgrupo&rdquo; no grupo e cadastre as contas no subgrupo.</p>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={pending || !code.trim() || !name.trim()} className={BOTAO_PRIMARIO} onClick={() => run(() => salvarGrupoDoPlano({ code, name, kind }), () => { setOpen(false); setCode(""); setName(""); })}>
          Criar grupo
        </Button>
        <button type="button" onClick={() => setOpen(false)} disabled={pending} className={cn(LINK, "text-[var(--color-v2-ink2)]")}>Cancelar</button>
        {error && <span role="alert" className="text-[12px] text-[#C0334A]">{error}</span>}
      </div>
    </div>
  );
}

function GrupoInativo({ grupo, perms, uso, equivalentes }: { grupo: GrupoDaTela; perms: PlanoPerms; uso: Record<string, UsoNaTela> | null; equivalentes: Record<string, { code: string; nome: string }> }) {
  const contas = [...(grupo.direto?.contas ?? []), ...grupo.subgrupos.flatMap((s) => s.contas)];
  return (
    <div className={cn(BLOCO, "p-3")} data-grupo-inativo={grupo.code}>
      <p className="text-[13px] font-semibold text-[var(--color-v2-ink2)]">
        <span className="font-[family-name:var(--font-mono)] text-[11.5px]">{grupo.code}</span> {grupo.name} <span className="text-[11px] font-normal">· inativo</span>
      </p>
      <ul className="mt-1.5 space-y-1">
        {contas.map((c) => (
          <ContaInativa key={c.id} conta={c} perms={perms} uso={uso?.[c.code] ?? null} equivalente={equivalentes[c.code] ?? null} />
        ))}
      </ul>
    </div>
  );
}

function ContaInativa({ conta, perms, uso, equivalente }: { conta: ContaDaTela; perms: PlanoPerms; uso: UsoNaTela | null; equivalente: { code: string; nome: string } | null }) {
  const { pending, error, run } = useRun();
  const [feito, setFeito] = useState<string | null>(null);
  const temDespesa = !!uso && uso.despesas > 0;
  return (
    <li className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-v2-ink2)]" data-conta-inativa={conta.code}>
      <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-v2-ink3)]">{conta.code}</span>
      <span>{conta.name}</span>
      <span className="text-[10.5px] text-[var(--color-v2-ink3)]">· {conta.categoria}</span>
      {uso && (uso.despesas + uso.orcamento + uso.medicoes > 0 ? <span className="text-[11px]">· {uso.despesas} despesa(s){uso.orcamento ? `, ${uso.orcamento} linha(s) de Orçamento` : ""}{uso.medicoes ? `, ${uso.medicoes} medição(ões)` : ""}</span> : <span className="text-[11px]">· sem uso</span>)}
      {equivalente ? <span className="text-[11px]">→ equivale a <strong>{equivalente.code} {equivalente.nome}</strong></span> : <span className="text-[11px]">→ sem equivalente no plano atual</span>}
      {perms.reclassificar && temDespesa && equivalente && !feito && (
        <button
          type="button"
          disabled={pending}
          className={cn(LINK, "text-[var(--color-brand)]")}
          onClick={() =>
            run(async () => {
              const p = await previaDaReclassificacao(conta.code, equivalente.code);
              if (!p.ok) return p;
              const pv = p.previa;
              const texto = `Reclassificar ${pv.lancamentos} lançamento(s) (R$ ${pv.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) de ${conta.code} para ${equivalente.code}?${pv.congelados ? ` ${pv.congelados} em versão congelada ficam como estão.` : ""}${pv.categoriaMuda ? ` A categoria da DRE muda de ${pv.categoriaMuda.de} para ${pv.categoriaMuda.para}.` : ""}`;
              if (!window.confirm(texto)) return;
              const r = await reclassificarLancamentos({ de: conta.code, para: equivalente.code, confirmar: true });
              if (r.ok) setFeito(`${pv.lancamentos} lançamento(s) reclassificados`);
              return r;
            })
          }
        >
          Reclassificar lançamentos
        </button>
      )}
      {feito && <span className="text-[11px] text-[#0F8A5F]">{feito}</span>}
      {error && <span role="alert" className="text-[11px] text-[#C0334A]">{error}</span>}
    </li>
  );
}

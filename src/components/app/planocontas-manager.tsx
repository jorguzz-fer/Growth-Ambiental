"use client";

import { useState, useTransition } from "react";
import {
  addChartGroup,
  addChartItem,
  deleteChartGroup,
  deleteChartItem,
  renameChartGroup,
  setChartAccountAtivo,
  updateChartItem,
} from "@/lib/actions/planocontas";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { categoriasPermitidasDaConta } from "@/lib/categoria-do-plano";
import { defaultDreCategory } from "@/lib/budget/config";

/**
 * Plano de Contas — Parte 1 do Prompt G: RESTYLE, no ponto de uso.
 * (Restaurado a pedido: o layout de grupos e subitens volta a ser a tela do
 * plano. Cada conta escolhe a categoria da DRE ao ser criada, e mudar a
 * categoria de uma conta já usada pede confirmação.)
 *
 * Nenhuma funcionalidade muda: mesmos campos, rótulos, botões, ações,
 * permissões e consultas do inventário (`docs/V2-PROMPT-G-ETAPA1.md`). O que
 * muda é a aparência: cartão branco 16px/`--color-line`, blocos internos
 * 13px/`#EDF1F7`/`#FCFDFF`, campos 40px/9px com foco azul, botão primário
 * `--color-brand`, hierarquia grupo → subconta por recuo, peso e indicador de
 * expandir (`aria-expanded`), cor semântica discreta para a natureza.
 * `Card`, `Input`, `Select` e `Button` compartilhados NÃO foram alterados: as
 * classes entram aqui por `className`.
 */

type Kind = "cef" | "complementar";
type Natureza = "receita" | "despesa";
interface Item {
  id: string;
  code: string;
  name: string;
  natureza: Natureza;
  ativo: boolean;
  /** Prompt DP — categoria da DRE que vale (escolhida ou padrão). */
  categoria: string;
  categoriaPadrao: string;
  /** null = segue o padrão. */
  categoriaEscolhida: string | null;
}
interface Group {
  code: string;
  name: string;
  kind: Kind;
  items: Item[];
}
/** A categoria que as contas ativas do grupo têm (a mais frequente), para a conta nova. */
function categoriaDoGrupo(group: Group): string {
  const conta = new Map<string, number>();
  for (const it of group.items.filter((i) => i.ativo && i.natureza === "despesa")) conta.set(it.categoria, (conta.get(it.categoria) ?? 0) + 1);
  const [mais] = [...conta.entries()].sort((a, b) => b[1] - a[1]);
  return mais?.[0] ?? defaultDreCategory(group.kind);
}

export interface PlanoPerms {
  criar: boolean;
  editar: boolean;
  excluir: boolean;
}

/* ───────── classes do padrão visual (1.3, 1.5), aplicadas no ponto de uso ───────── */
const CARTAO = "rounded-[16px] border border-[var(--color-line)] bg-white shadow-[0_1px_3px_rgba(22,35,59,.06)]";
const BLOCO = "rounded-[13px] border border-[#EDF1F7] bg-[#FCFDFF]";
const CAMPO = "h-10 rounded-[9px] border-[var(--color-line)] text-[13px] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/25";
const BOTAO_PRIMARIO = "h-10 rounded-[9px] bg-[var(--color-brand)] px-4 text-[13px] text-white hover:bg-[var(--color-brand-soft)] focus-visible:ring-[#3B82F6]";
const BOTAO_SECUNDARIO = "h-10 rounded-[9px] border border-[var(--color-line)] bg-white px-4 text-[13px] text-[var(--color-v2-ink)] hover:bg-[var(--color-surface2)] focus-visible:ring-[#3B82F6]";
const LINK = "rounded-[6px] px-1 text-[12px] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40 disabled:opacity-50";
const ROTULO = "mb-1 block text-[11px] font-medium text-[var(--color-v2-ink2)]";
/* 1.4 — cor semântica como marcação discreta, nunca fundo de linha inteira. */
const NATUREZA: Record<Natureza, { texto: string; ponto: string; rotulo: string }> = {
  receita: { texto: "text-[#0F8A5F]", ponto: "bg-[#0F8A5F]", rotulo: "Receita" },
  despesa: { texto: "text-[#C0334A]", ponto: "bg-[#C0334A]", rotulo: "Despesa" },
};

export function PlanoContasManager({
  cef,
  comp,
  perms,
}: {
  cef: Group[];
  comp: Group[];
  perms: PlanoPerms;
}) {
  return (
    <div className="space-y-8">
      <GroupSection title="Custos diretos dos projetos" kind="cef" groups={cef} perms={perms} />
      <GroupSection
        title="Receitas, despesas da empresa, tributos e resultado"
        kind="complementar"
        groups={comp}
        perms={perms}
      />
    </div>
  );
}

function GroupSection({
  title,
  kind,
  groups,
  perms,
}: {
  title: string;
  kind: Kind;
  groups: Group[];
  perms: PlanoPerms;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-[15px] font-semibold text-[var(--color-v2-ink)]">{title}</h2>
      <div className="space-y-3">
        {groups.map((g) => (
          <GroupCard key={`${g.kind}-${g.code}`} group={g} perms={perms} />
        ))}
        {groups.length === 0 && (
          <p className="text-[13px] text-[var(--color-ink4)]">Nenhum grupo ainda.</p>
        )}
      </div>
      {perms.criar && <NewGroupForm kind={kind} />}
    </section>
  );
}

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden
      className={cn("shrink-0 transition-transform motion-reduce:transition-none", aberto && "rotate-90")}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function GroupCard({ group, perms }: { group: Group; perms: PlanoPerms }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState(group.name);
  const [groupCode, setGroupCode] = useState(group.code);
  const canManage = perms.criar || perms.editar || perms.excluir;

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>) => {
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (r && !r.ok) setError(r.error ?? "Erro.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
      }
    });
  };

  return (
    <div className={cn(CARTAO, "p-4")}>
      {/* 1.7 — nível de grupo: indicador de expandir + código + nome em peso forte */}
      <div className="flex items-center gap-2.5">
        <span className="text-[var(--color-v2-ink3)]">
          <Chevron aberto={open} />
        </span>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-[var(--color-accent4)] px-1.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold text-[var(--color-accent)]">
          {group.code}
        </span>
        <span className="flex-1 text-[14px] font-semibold text-[var(--color-v2-ink)]">
          {group.name}
        </span>
        <span className="text-[11px] text-[var(--color-v2-ink3)]">
          {group.items.length} {group.items.length === 1 ? "subitem" : "subitens"}
        </span>
        {canManage && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cn(LINK, "text-[var(--color-brand)]")}
          >
            {open ? "Fechar" : "Editar"}
          </button>
        )}
      </div>

      {!open ? (
        <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
          {group.items.map((it) => (
            <span
              key={it.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[8px] border border-[#EDF1F7] bg-[#FCFDFF] px-2.5 py-1 text-[12px] text-[var(--color-v2-ink2)]",
                !it.ativo && "opacity-55",
              )}
            >
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-v2-ink3)]">{it.code}</span>
              {it.name}
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", NATUREZA[it.natureza].ponto)} title={NATUREZA[it.natureza].rotulo} />
              <span className="text-[10.5px] text-[var(--color-v2-ink3)]" data-categoria-conta={it.code} title={it.categoriaEscolhida ? "Categoria da DRE escolhida" : "Categoria da DRE pelo padrão"}>
                · {it.categoria}
                {!it.categoriaEscolhida && " (padrão)"}
              </span>
              {!it.ativo && <span className="text-[10px] text-[var(--color-v2-ink3)]">inativa</span>}
            </span>
          ))}
          {group.items.length === 0 && (
            <span className="text-[12px] text-[var(--color-ink4)]">Sem subitens.</span>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3 pl-6">
          {/* Editar / excluir o grupo */}
          {(perms.editar || perms.excluir) && (
            <div className={cn(BLOCO, "flex flex-wrap items-end gap-2 p-3")}>
              <div className="w-24">
                <label className={ROTULO}>Código</label>
                <Input
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value)}
                  disabled={!perms.editar || pending}
                  className={CAMPO}
                  aria-label="Código do grupo"
                />
              </div>
              <div className="min-w-[180px] flex-1">
                <label className={ROTULO}>Nome do grupo</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={!perms.editar || pending}
                  className={CAMPO}
                  aria-label="Nome do grupo"
                />
              </div>
              {perms.editar && (
                <Button
                  size="sm"
                  disabled={pending}
                  className={BOTAO_PRIMARIO}
                  onClick={() =>
                    run(() =>
                      renameChartGroup({
                        kind: group.kind,
                        groupCode: group.code,
                        groupName,
                        newGroupCode: groupCode,
                      }),
                    )
                  }
                >
                  Salvar
                </Button>
              )}
              {perms.excluir && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Excluir o grupo "${group.code} ${group.name}" e todos os seus subitens?`,
                      )
                    )
                      run(() =>
                        deleteChartGroup({ kind: group.kind, groupCode: group.code }),
                      );
                  }}
                  className={cn(LINK, "h-10 text-[#C0334A]")}
                >
                  Excluir grupo
                </button>
              )}
            </div>
          )}

          {/* Subitens editáveis — 1.7: recuo e guia à esquerda marcam o segundo nível */}
          <div className="space-y-1.5 border-l-2 border-[#EDF1F7] pl-3">
            {group.items.map((it) => (
              <ItemRow key={it.id} item={it} perms={perms} />
            ))}
            {group.items.length === 0 && (
              <span className="text-[12px] text-[var(--color-ink4)]">Sem subitens.</span>
            )}
          </div>

          {/* Novo subitem */}
          {perms.criar && <NewItemRow group={group} />}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-[#C0334A]">
          {error}
        </p>
      )}
    </div>
  );
}

function ItemRow({ item, perms }: { item: Item; perms: PlanoPerms }) {
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [natureza, setNatureza] = useState<Natureza>(item.natureza);
  // Prompt DP — "" = segue o padrão de boa prática.
  const [categoria, setCategoria] = useState(item.categoriaEscolhida ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const opcoesDeCategoria = categoriasPermitidasDaConta(natureza);
  const categoriaServe = !categoria || (opcoesDeCategoria as string[]).includes(categoria);
  const dirty = code !== item.code || name !== item.name || natureza !== item.natureza || categoria !== (item.categoriaEscolhida ?? "");

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>) => {
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (r && !r.ok) setError(r.error ?? "Erro.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
      }
    });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", !item.ativo && "opacity-55")}>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={!perms.editar || pending}
        className={cn(CAMPO, "w-24 font-[family-name:var(--font-mono)]")}
        aria-label={`Código de ${item.name}`}
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={!perms.editar || pending}
        className={cn(CAMPO, "min-w-[160px] flex-1")}
        aria-label={`Nome de ${item.code}`}
      />
      {/* 1.4 — a natureza colore o próprio select (marcação discreta); nenhum campo novo */}
      <Select
        value={natureza}
        onChange={(e) => setNatureza(e.target.value as Natureza)}
        disabled={!perms.editar || pending}
        className={cn(CAMPO, "w-28 font-medium", NATUREZA[natureza].texto)}
        title="Natureza da conta (bloco Receitas/Despesas no planejamento)"
        aria-label={`Natureza de ${item.code}`}
      >
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </Select>
      {/* Prompt DP — uma categoria da DRE por conta; vazio = o padrão. */}
      <Select
        value={categoriaServe ? categoria : ""}
        onChange={(e) => setCategoria(e.target.value)}
        disabled={!perms.editar || pending}
        className={cn(CAMPO, "w-48")}
        title="Categoria da DRE da conta"
        aria-label={`Categoria da DRE de ${item.code}`}
      >
        <option value="">Padrão: {natureza === item.natureza ? item.categoriaPadrao : natureza === "receita" ? "Receita" : "pelo grupo"}</option>
        {opcoesDeCategoria.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      {!item.ativo && (
        <span className="rounded-full bg-[var(--color-ink4)]/15 px-2 py-0.5 text-[10px] text-[var(--color-ink3)]">
          inativa
        </span>
      )}
      {perms.editar && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !dirty}
          className={BOTAO_SECUNDARIO}
          onClick={() =>
            run(async () => {
              const patch = { code, name, natureza, dreCategory: categoriaServe ? categoria || null : null };
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
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setChartAccountAtivo(item.id, !item.ativo))}
          className={cn(LINK, "text-[var(--color-brand)]")}
          title={item.ativo ? "Inativar (some de novos lançamentos)" : "Reativar"}
        >
          {item.ativo ? "Inativar" : "Reativar"}
        </button>
      )}
      {perms.excluir && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => deleteChartItem(item.id))}
          className={cn(LINK, "text-[#C0334A] hover:opacity-70")}
          title="Excluir subitem"
          aria-label={`Excluir subitem ${item.code}`}
        >
          ×
        </button>
      )}
      {error && (
        <span role="alert" className="text-[12px] text-[#C0334A]">
          {error}
        </span>
      )}
    </div>
  );
}

function NewItemRow({ group }: { group: Group }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [natureza, setNatureza] = useState<Natureza>(group.items.length && group.items.every((i) => i.natureza === "receita") ? "receita" : "despesa");
  const [categoria, setCategoria] = useState(categoriaDoGrupo(group));
  const opcoes = categoriasPermitidasDaConta(natureza) as string[];
  const categoriaFinal = opcoes.includes(categoria) ? categoria : opcoes[0];
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    setError(null);
    start(async () => {
      try {
        await addChartItem({
          kind: group.kind,
          groupCode: group.code,
          groupName: group.name,
          code,
          name,
          natureza,
          dreCategory: categoriaFinal,
        });
        setCode("");
        setName("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
      }
    });
  };

  return (
    <div className={cn(BLOCO, "flex flex-wrap items-center gap-2 p-3")}>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={`${group.code}.${String(group.items.length + 1).padStart(2, "0")}`}
        disabled={pending}
        className={cn(CAMPO, "w-24 font-[family-name:var(--font-mono)]")}
        aria-label="Código do novo subitem"
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Novo subitem"
        disabled={pending}
        className={cn(CAMPO, "min-w-[160px] flex-1")}
        aria-label="Nome do novo subitem"
      />
      <Select
        value={natureza}
        onChange={(e) => setNatureza(e.target.value as Natureza)}
        disabled={pending}
        className={cn(CAMPO, "w-28")}
        aria-label="Natureza do novo subitem"
      >
        <option value="despesa">Despesa</option>
        <option value="receita">Receita</option>
      </Select>
      <Select
        value={categoriaFinal}
        onChange={(e) => setCategoria(e.target.value)}
        disabled={pending}
        className={cn(CAMPO, "w-48")}
        title="Categoria da DRE da nova conta"
        aria-label="Categoria da DRE do novo subitem"
      >
        {opcoes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Button size="sm" disabled={pending || !code.trim() || !name.trim()} className={BOTAO_PRIMARIO} onClick={add}>
        Adicionar
      </Button>
      {error && (
        <span role="alert" className="text-[12px] text-[#C0334A]">
          {error}
        </span>
      )}
    </div>
  );
}

function NewGroupForm({ kind }: { kind: Kind }) {
  const [open, setOpen] = useState(false);
  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [natureza, setNatureza] = useState<Natureza>("despesa");
  const [categoria, setCategoria] = useState<string>(defaultDreCategory(kind));
  const opcoes = categoriasPermitidasDaConta(natureza) as string[];
  const categoriaFinal = opcoes.includes(categoria) ? categoria : opcoes[0];
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    setError(null);
    start(async () => {
      try {
        await addChartGroup({ kind, groupCode, groupName, code, name, natureza, dreCategory: categoriaFinal });
        setGroupCode("");
        setGroupName("");
        setCode("");
        setName("");
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-[var(--color-line)] bg-white/60 px-3 py-2.5 text-[12.5px] text-[var(--color-v2-ink2)] transition-colors hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40 motion-reduce:transition-none"
      >
        + Novo grupo
      </button>
    );
  }

  return (
    <div className={cn(CARTAO, "mt-3 space-y-3 p-4")}>
      <h3 className="text-[14px] font-semibold text-[var(--color-v2-ink)]">Novo grupo</h3>
      <div className={cn(BLOCO, "space-y-2 p-3")}>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-28">
            <label className={ROTULO}>Código grupo</label>
            <Input
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value)}
              placeholder="7.1"
              className={CAMPO}
              aria-label="Código grupo"
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className={ROTULO}>Nome do grupo</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Programas socioambientais"
              className={CAMPO}
              aria-label="Nome do grupo"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-28">
            <label className={ROTULO}>1º subitem</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="7.1.01"
              className={cn(CAMPO, "font-[family-name:var(--font-mono)]")}
              aria-label="1º subitem"
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <label className={ROTULO}>Nome do subitem</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Descrição"
              className={CAMPO}
              aria-label="Nome do subitem"
            />
          </div>
          <div className="w-32">
            <label className={ROTULO}>Natureza</label>
            <Select
              value={natureza}
              onChange={(e) => setNatureza(e.target.value as Natureza)}
              className={CAMPO}
              aria-label="Natureza"
            >
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </Select>
          </div>
          <div className="w-48">
            <label className={ROTULO}>Categoria da DRE</label>
            <Select value={categoriaFinal} onChange={(e) => setCategoria(e.target.value)} className={CAMPO} aria-label="Categoria da DRE">
              {opcoes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={pending || !groupCode.trim() || !groupName.trim() || !code.trim() || !name.trim()}
          className={BOTAO_PRIMARIO}
          onClick={create}
        >
          Criar grupo
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className={cn(LINK, "text-[var(--color-v2-ink2)]")}
        >
          Cancelar
        </button>
        {error && (
          <span role="alert" className="text-[12px] text-[#C0334A]">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

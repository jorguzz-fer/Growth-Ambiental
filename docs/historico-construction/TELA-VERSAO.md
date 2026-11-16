# Tela Configuração da Versão — coleta (Prompt AP, Etapa 1)

Coleta feita em 01/10/2026, sobre o `main` depois do PR #225. **Nada foi
alterado para gerar este arquivo.** É cópia do código, sem resumo.

## 1. A página — `src/app/(app)/versao/page.tsx`

```tsx
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getProjectVersions, getTenantContext, getVersionContext } from "@/lib/context";
import { lerSelecaoDeProjeto } from "@/lib/projeto-selecao";
import { PedirProjeto } from "@/components/app/pedir-projeto";
import { ProjectPicker } from "@/components/app/project-picker";
import { LembrarProjeto } from "@/components/app/projeto-da-aba";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { VersionIdentity } from "@/components/app/version-identity";
import { ImportVersion } from "@/components/app/import-version";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

const NATUREZA: Record<string, { titulo: string; texto: string }> = {
  budget: {
    titulo: "Budget — Plano inicial fixo",
    texto:
      "Representa o planejamento original aprovado. Não é atualizado com dados realizados. Serve como régua de comparação ao longo do projeto.",
  },
  forecast: {
    titulo: "Forecast — Revisão mensal",
    texto:
      "Budget revisado mensalmente. Mantém a estrutura de projeção mas permite ajustes nas previsões futuras. Não puxa fluxo de caixa real.",
  },
  atual: {
    titulo: "Atual — Realizado",
    texto:
      "Contém apenas o realizado até a data da última conciliação de caixa. Alimentado por upload de extrato bancário e Open Finance.",
  },
  custom: {
    titulo: "Versão customizada",
    texto:
      "Duplicada a partir de outra versão. Os dados são isolados e não afetam as demais.",
  },
};

const SHEETS_INFO = [
  "Parametros (INCC 48 meses)",
  "Dados_de_Venda (Módulo Receitas)",
  "Reembolso",
  "Permuta",
  "Despesas_CEF (Módulo Despesas)",
];

export default async function VersaoPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; proj?: string; project?: string }>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "versao", "ver")) return <AccessDenied />;
  const sp = await searchParams;
  // Prompt A: a obra vem da URL (?proj=) ou, com só ?v=, da própria versão
  // (validada no tenant). Sem nenhum dos dois, a aba reabre a última obra ou
  // a tela pede a escolha. Sem ?v=, a versão de trabalho da obra.
  const porVersao = sp.v && !sp.proj && !sp.project ? await getVersionContext(ctx.tenant.id, sp.v) : null;
  const selecao = lerSelecaoDeProjeto(ctx.projects, sp);
  const escolhido = porVersao
    ? { project: porVersao.project, versions: porVersao.versions, trabalho: porVersao.version }
    : selecao.tipo === "projeto"
      ? await getProjectVersions(ctx.tenant.id, selecao.projeto.id)
      : null;
  if (!escolhido?.trabalho) {
    return (
      <PedirProjeto titulo="Configuração da Versão" projetos={ctx.projects} oQue="configurar as versões" />
    );
  }
  const { project } = escolhido;
  const v = escolhido.versions.find((x) => x.id === sp.v) ?? escolhido.trabalho;
  const canEdit = can(ctx.perms, "versao", "editar");
  const canDelete = can(ctx.perms, "versao", "excluir");
  const isFixed = v.kind !== "custom";

  const [units, reembolsos, permutas, despesas] = await Promise.all([
    db.select({ id: schema.units.id }).from(schema.units).where(eq(schema.units.versionId, v.id)).then((r) => r.length),
    db.select({ id: schema.reembolsos.id }).from(schema.reembolsos).where(eq(schema.reembolsos.versionId, v.id)).then((r) => r.length),
    db.select({ id: schema.permutas.id }).from(schema.permutas).where(eq(schema.permutas.versionId, v.id)).then((r) => r.length),
    db.select({ id: schema.despesas.id }).from(schema.despesas).where(eq(schema.despesas.versionId, v.id)).then((r) => r.length),
  ]);

  const nat = NATUREZA[v.kind] ?? NATUREZA.custom;
  const cards = [
    { icon: "🏢", label: "Unidades", value: units },
    { icon: "↩︎", label: "Liberações de Obra", value: reembolsos },
    { icon: "⇄", label: "Ativos de Permuta", value: permutas },
    { icon: "🧾", label: "Lançamentos de despesa", value: despesas },
  ];

  return (
    <>
      <PageHeader
        eyebrow={project.name}
        title="Configuração da Versão"
        subtitle="Nome · Planilha modelo · Importação de dados"
        actions={
          <ProjectPicker
            projects={ctx.projects.map((p) => ({ id: p.id, label: p.name }))}
            selected={project.id}
          />
        }
      />
      <LembrarProjeto projectId={project.id} />

      {/* Título da versão */}
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: v.color }} />
        <div>
          <h2 className="font-[family-name:var(--font-serif)] text-2xl text-[var(--color-ink)]">
            {v.label}
          </h2>
          <p className="text-[13px] text-[var(--color-ink3)]">
            {isFixed ? "Versão fixa — não pode ser excluída" : "Versão customizada"}
            {v.locked && " · congelada"}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Coluna esquerda */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">
                Identificação
              </h3>
              <VersionIdentity version={v} canEdit={canEdit} canDelete={canDelete} />

              <h4 className="mb-2 mt-6 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
                Dados carregados nesta versão
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {cards.map((c) => (
                  <div key={c.label} className="rounded-[10px] bg-[var(--color-surface2)] p-3">
                    <div className="flex items-baseline gap-2">
                      <span>{c.icon}</span>
                      <span className="text-xl font-semibold text-[var(--color-ink)]">{c.value}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-ink3)]">{c.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">
                {nat.titulo}
              </h3>
              <p className="text-[13px] leading-relaxed text-[var(--color-ink2)]">{nat.texto}</p>
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
                📗 Planilha Modelo
              </h3>
              <p className="text-[13px] leading-relaxed text-[var(--color-ink2)]">
                Baixe a planilha modelo em branco, preencha com os dados desta versão
                e faça o upload abaixo. A planilha cobre{" "}
                <strong>Módulo Receitas</strong> e <strong>Módulo Despesas</strong>.
              </p>
              <ol className="my-3 space-y-1.5">
                {SHEETS_INFO.map((s, i) => (
                  <li key={s} className="flex items-center gap-2 text-[13px] text-[var(--color-ink2)]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent4)] font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-accent)]">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
              <a
                href={`/versao/template?v=${v.id}`}
                className={buttonVariants({ className: "w-full" })}
              >
                ⬇ Baixar planilha modelo (em branco)
              </a>
              <a
                href={`/versao/export?v=${v.id}`}
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-2 w-full",
                })}
              >
                ⬇ Exportar dados preenchidos desta versão (.xlsx)
              </a>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-ink3)]">
                A exportação usa o mesmo formato do modelo — pode editar e
                reimportar, ou usar de backup/base para uma nova versão.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
                📥 Importar Dados
              </h3>
              <p className="mb-3 text-[13px] leading-relaxed text-[var(--color-ink2)]">
                Faça o upload da planilha preenchida. Unidades, despesas, permutas e
                liberações <strong>só entram na versão Atual, e só onde a versão ainda
                não tem nenhum registro daquele tipo</strong> — a importação nunca
                apaga nem substitui o que já foi lançado. O INCC é atualizado mês a mês.
              </p>
              {canEdit ? (
                <ImportVersion versionId={v.id} locked={v.locked} />
              ) : (
                <p className="text-sm text-[var(--color-ink3)]">
                  Sem permissão para importar nesta versão.
                </p>
              )}
              <p className="mt-3 rounded-[8px] bg-[var(--color-surface2)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--color-ink3)]">
                ⓘ Se a versão já tiver registros de um tipo que a planilha traz, a
                importação é recusada inteira e nada é gravado. Deixe essas abas vazias
                ou lance pela tela.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
```

Rotas da mesma pasta:

### `src/app/(app)/versao/export/route.ts`

```ts
import { getTenantContext, getVersionContext } from "@/lib/context";
import {
  getDespesas,
  getInccRows,
  getPermutas,
  getReembolsos,
  getUnits,
} from "@/lib/queries";
import { can } from "@/lib/permissions";
import { emptyPlan } from "@/lib/calc/plan";
import { buildExportBuffer, type ExportData } from "@/lib/xlsx/growth-template";

export const dynamic = "force-dynamic";

/**
 * Download dos dados JÁ PREENCHIDOS de uma versão, no MESMO formato da planilha
 * modelo (reimportável). ?v= indica a versão — obrigatório (Prompt A): a
 * obra, e o INCC exportado, saem da própria versão, validada no tenant.
 */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "versao", "ver")) {
    return new Response("Não autorizado", { status: 403 });
  }

  const alvo = await getVersionContext(ctx.tenant.id, new URL(req.url).searchParams.get("v"));
  if (!alvo) return new Response("Versão não encontrada", { status: 404 });
  const { version, project } = alvo;

  const [unitRows, reembRows, permRows, despRows, incc] = await Promise.all([
    getUnits(ctx.tenant.id, version.id),
    getReembolsos(ctx.tenant.id, version.id),
    getPermutas(ctx.tenant.id, version.id),
    getDespesas(version.id),
    getInccRows(ctx.tenant.id, project.id),
  ]);

  const data: ExportData = {
    incc,
    units: unitRows.map((u) => ({
      code: u.code,
      bloco: u.bloco,
      tipo: u.tipo,
      m2: u.m2 != null ? Number(u.m2) : null,
      andar: u.andar,
      valor: Number(u.valor),
      status: u.status,
      mesVenda: u.mesVenda,
      plan: u.paymentPlan ?? emptyPlan(),
    })),
    reembolsos: reembRows.map((r) => ({
      data: r.data ?? "",
      origem: r.origem ?? "",
      valor: Number(r.valor ?? 0),
      pct: r.pct ?? "",
      obs: r.obs ?? "",
      serial: r.serial ?? null,
    })),
    permutas: permRows.map((p) => ({
      unitCode: p.unitCode ?? "",
      cliente: p.cliente ?? "",
      dataRecebimento: p.dataRecebimento ?? "",
      tipo: p.tipo ?? "",
      descricao: p.descricao ?? "",
      estimado: Number(p.estimado ?? 0),
      status: p.status ?? "",
      dataVenda: p.dataVenda ?? "",
      valorVenda: Number(p.valorVenda ?? 0),
      tipoPermuta: p.tipoPermuta ?? "",
      obs: p.obs ?? "",
    })),
    despesas: despRows
      .filter((d) => d.contaCef && d.competencia)
      .map((d) => ({
        contaCef: d.contaCef as string,
        competencia: d.competencia as string,
        valor: Number(d.valor),
      })),
  };

  const buffer = buildExportBuffer(data);
  const slug = version.label.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  const filename = `Growth_Tools_Dados_${slug || "versao"}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
```

### `src/app/(app)/versao/template/route.ts`

```ts
import { getTenantContext, getVersionContext } from "@/lib/context";
import { getInccRows } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { buildTemplateBuffer } from "@/lib/xlsx/growth-template";

export const dynamic = "force-dynamic";

/** Download da planilha modelo (.xlsx) no formato padrão Growth Tools. */
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "versao", "ver")) {
    return new Response("Não autorizado", { status: 403 });
  }

  // Versão indicada por ?v= (obrigatória, validada no tenant); o INCC é o da
  // obra DELA — não o da obra do cookie (Prompt A).
  const alvo = await getVersionContext(ctx.tenant.id, new URL(req.url).searchParams.get("v"));
  if (!alvo) return new Response("Versão não encontrada", { status: 404 });
  const { version, project } = alvo;

  const incc = await getInccRows(ctx.tenant.id, project.id);
  const buffer = buildTemplateBuffer(incc);
  const slug = version.label.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  const filename = `Growth_Tools_Modelo_${slug || "versao"}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
```


## 2. Componentes próprios que ela importa

Exclusivos da tela: `VersionIdentity` e `ImportVersion`. `PedirProjeto`,
`ProjectPicker`, `LembrarProjeto`, `PageHeader`, `AccessDenied` e os de
`ui/` são compartilhados.

### `src/components/app/version-identity.tsx`

```tsx
"use client";

import { useState, useTransition } from "react";
import type { Version } from "@/lib/context";
import {
  updateVersion,
  toggleVersionLock,
  setDefaultVersion,
  deleteVersion,
} from "@/lib/actions/versions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/** Edição da identidade da versão ativa (nome, cor) + controles. */
export function VersionIdentity({
  version,
  canEdit,
  canDelete,
}: {
  version: Version;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [label, setLabel] = useState(version.label);
  const [color, setColor] = useState(version.color);
  const [pending, start] = useTransition();
  const isFixed = version.kind !== "custom";

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label>Nome da versão</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={!canEdit}
          />
        </div>
        {canEdit && (
          <div>
            <Label>Cor</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 rounded-[8px] border border-[var(--color-accent2)]/20"
            />
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => start(() => updateVersion(version.id, { label, color }))}
          >
            Salvar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => start(() => toggleVersionLock(version.id, !version.locked))}
          >
            {version.locked ? "Descongelar" : "Congelar"}
          </Button>
          {!version.isDefault && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => start(() => setDefaultVersion(version.id))}
            >
              Tornar default
            </Button>
          )}
          {canDelete && !isFixed && (
            <button
              disabled={pending}
              onClick={() => start(() => deleteVersion(version.id))}
              className="ml-auto text-sm text-[var(--color-danger)] hover:underline disabled:opacity-50"
            >
              Excluir versão
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

### `src/components/app/import-version.tsx`

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importVersionData, type ImportResult } from "@/lib/actions/version-io";

/** Dropzone para importar a planilha preenchida na versão indicada. */
export function ImportVersion({
  versionId,
  locked,
}: {
  versionId: string;
  locked: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  function handle(file: File) {
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("versionId", versionId);
    start(async () => {
      try {
        const r = await importVersionData(fd);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setResult(r.result);
        router.refresh();
      } catch {
        setError("Falha na importação. Nada foi gravado.");
      }
    });
  }

  if (locked) {
    return (
      <p className="text-sm text-[var(--color-warning)]">
        Versão congelada — descongele para importar dados.
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
          e.target.value = "";
        }}
      />
      <div
        onClick={() => !pending && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handle(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed px-6 py-10 text-center transition-colors ${
          drag
            ? "border-[var(--color-accent2)] bg-[var(--color-accent4)]"
            : "border-[var(--color-accent2)]/25 bg-[var(--color-surface2)] hover:border-[var(--color-accent2)]/50"
        }`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-accent2)] text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        </div>
        <span className="text-sm font-medium text-[var(--color-accent)]">
          {pending ? "Importando…" : "Selecionar planilha preenchida"}
        </span>
        <span className="text-xs text-[var(--color-ink3)]">
          .xlsx ou .xls · formato padrão Growth Tools
        </span>
      </div>

      {result && (
        <p className="mt-3 rounded-[8px] bg-[#d1fae5] px-3 py-2 text-[13px] text-[#065f46]">
          Importado: {result.units} unidades · {result.reembolsos} liberações ·{" "}
          {result.permutas} permutas · {result.despesas} despesas · {result.incc} meses INCC.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-[8px] bg-[#fee2e2] px-3 py-2 text-[13px] text-[#991b1b]">
          {error}
        </p>
      )}
    </div>
  );
}
```


`src/components/app/version-config.tsx` também chama as actions de versão,
mas **não é importado em lugar nenhum** (código morto):

### `src/components/app/version-config.tsx`

```tsx
"use client";

import { useState, useTransition } from "react";
import type { Version } from "@/lib/context";
import {
  updateVersion,
  toggleVersionLock,
  setDefaultVersion,
  deleteVersion,
} from "@/lib/actions/versions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function VersionConfig({
  versions,
  canEdit,
  canDelete,
}: {
  versions: Version[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="space-y-3">
      {versions.map((v) => (
        <VersionRow key={v.id} v={v} canEdit={canEdit} canDelete={canDelete} />
      ))}
    </div>
  );
}

function VersionRow({
  v,
  canEdit,
  canDelete,
}: {
  v: Version;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [label, setLabel] = useState(v.label);
  const [color, setColor] = useState(v.color);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <span
          className="mt-6 inline-block h-4 w-4 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <div className="flex-1">
          <Label>Nome da versão</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} disabled={!canEdit} />
        </div>
        <div>
          <Label>Cor</Label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={!canEdit}
            className="h-9 w-14 rounded-[8px] border border-[var(--color-accent2)]/20"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{v.kind}</Badge>
          {v.isDefault && <Badge tone="accent">default</Badge>}
          {v.locked && <Badge tone="warning">congelada</Badge>}
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => start(() => updateVersion(v.id, { label, color }))}
            >
              Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => start(() => toggleVersionLock(v.id, !v.locked))}
            >
              {v.locked ? "Descongelar" : "Congelar"}
            </Button>
            {!v.isDefault && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => start(() => setDefaultVersion(v.id))}
              >
                Tornar default
              </Button>
            )}
            {canDelete && v.kind === "custom" && (
              <button
                disabled={pending}
                onClick={() => start(() => deleteVersion(v.id))}
                className="text-sm text-[var(--color-danger)] hover:underline disabled:opacity-50"
              >
                Excluir
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```


## 3. Server Actions da tela — `src/lib/actions/versions.ts`

### `src/lib/actions/versions.ts`

```ts
"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext, getVersionContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// `duplicateVersion` foi descontinuada (Prompt I, BI-3): não se cria mais
// versão por cópia. Ela copiava despesas, caixa e unidades — lançamentos reais —
// para dentro de orçamentos. As versões já criadas por ela ficam como estão.

/**
 * Permissão + a versão com a obra dela (Prompt A): a versão precisa ser do
 * tenant — de QUALQUER obra dele, não só da obra do cookie.
 */
async function guardVersionEdit(versionId: string) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "versao", "editar")) return null;
  const alvo = await getVersionContext(ctx.tenant.id, versionId);
  if (!alvo) return null;
  return { ...ctx, ...alvo };
}

export async function updateVersion(
  versionId: string,
  patch: { label?: string; color?: string },
) {
  const ctx = await guardVersionEdit(versionId);
  if (!ctx) return;
  const set: { label?: string; color?: string } = {};
  if (patch.label && patch.label.trim()) set.label = patch.label.trim();
  if (patch.color) set.color = patch.color;
  if (Object.keys(set).length === 0) return;
  await db.update(schema.versions).set(set).where(eq(schema.versions.id, versionId));
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "version.update",
    entity: "version",
    entityId: versionId,
    meta: set,
  });
  revalidatePath("/", "layout");
}

export async function toggleVersionLock(versionId: string, locked: boolean) {
  const ctx = await guardVersionEdit(versionId);
  if (!ctx) return;
  await db.update(schema.versions).set({ locked }).where(eq(schema.versions.id, versionId));
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "version.lock",
    entity: "version",
    entityId: versionId,
    meta: { locked },
  });
  revalidatePath("/", "layout");
}

export async function setDefaultVersion(versionId: string) {
  const ctx = await guardVersionEdit(versionId);
  if (!ctx) return;
  const anterior = ctx.versions.find((v) => v.isDefault) ?? null;
  const nova = ctx.version;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.versions)
      .set({ isDefault: false })
      .where(
        and(
          eq(schema.versions.projectId, ctx.project.id),
          eq(schema.versions.tenantId, ctx.tenant.id),
        ),
      );
    await tx
      .update(schema.versions)
      .set({ isDefault: true })
      .where(eq(schema.versions.id, versionId));
    // AK Parte 1 — dentro da transação da escrita (1.3).
    await logAudit(
      {
        tenantId: ctx.tenant.id,
        userId: ctx.userId,
        action: "version.setDefault",
        entity: "version",
        entityId: versionId,
        meta: {
          projeto: ctx.project.name,
          de: anterior ? { id: anterior.id, label: anterior.label } : null,
          para: nova ? { id: nova.id, label: nova.label } : null,
        },
      },
      tx,
    );
  });
  revalidatePath("/", "layout");
}

export async function deleteVersion(versionId: string) {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "versao", "excluir")) return;
  const target = (await getVersionContext(ctx.tenant.id, versionId))?.version;
  if (!target) return;
  if (target.kind !== "custom") throw new Error("Só versões customizadas podem ser excluídas.");
  await db.delete(schema.versions).where(eq(schema.versions.id, versionId));
  await logAudit({
    tenantId: ctx.tenant.id,
    userId: ctx.userId,
    action: "version.delete",
    entity: "version",
    entityId: versionId,
    meta: { label: target.label },
  });
  revalidatePath("/", "layout");
}
```

Não existe action de **criar** versão nesta tela. A cópia
(`duplicateVersion`) foi descontinuada no Prompt I, BI-3.

## 4. `src/lib/actions/version-io.ts` inteiro

### `src/lib/actions/version-io.ts`

```ts
"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getTenantContext, getVersionContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { parseWorkbook } from "@/lib/xlsx/growth-template";
import { recusaDaImportacao, type Contagem } from "@/lib/versao-importacao";

export interface ImportResult {
  units: number;
  reembolsos: number;
  permutas: number;
  despesas: number;
  incc: number;
}

export type ResultadoImportacao = { ok: true; result: ImportResult } | { ok: false; error: string };

/**
 * Importa uma planilha (formato Growth Tools) para a versão indicada.
 *
 * BI-3 (Prompt I) e a decisão de 30/09/2026: lançamentos — unidades,
 * liberações, permutas e despesas — só entram na versão Atual, e só numa
 * categoria VAZIA. A importação nunca apaga registro: antes ela apagava a
 * categoria inteira e regravava, e apagar despesa levava junto parcelas,
 * pagamentos e terceiros. O INCC é do projeto e continua atualizado por mês.
 */
export async function importVersionData(formData: FormData): Promise<ResultadoImportacao> {
  const ctx = await getTenantContext();
  if (!ctx || !can(ctx.perms, "versao", "editar")) {
    return { ok: false, error: "Sem permissão para importar dados." };
  }

  // Versão-alvo: a indicada no form, obrigatória e validada no tenant (Prompt
  // A). A obra — e o INCC atualizado — é a DA VERSÃO, não a do cookie.
  const alvo = await getVersionContext(ctx.tenant.id, formData.get("versionId"));
  if (!alvo) return { ok: false, error: "Versão inválida." };
  const target = alvo.version;
  if (target.locked) {
    return { ok: false, error: "Versão congelada — descongele para importar." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Selecione uma planilha." };

  let parsed: ReturnType<typeof parseWorkbook>;
  try {
    parsed = parseWorkbook(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "Não foi possível ler a planilha. Use o modelo da própria tela." };
  }
  const vId = target.id;
  const tId = ctx.tenant.id;
  const result: ImportResult = { units: 0, reembolsos: 0, permutas: 0, despesas: 0, incc: 0 };

  const naPlanilha: Contagem = {
    units: parsed.units.length,
    despesas: parsed.despesas.length,
    permutas: parsed.permutas.length,
    reembolsos: parsed.reembolsos.length,
  };
  const recusa = await db.transaction(async (tx) => {
    // Trava a versão: duas importações simultâneas não passam as duas pela
    // checagem de "categoria vazia".
    await tx.execute(sql`select 1 from ${schema.versions} where ${schema.versions.id} = ${vId} for update`);
    const conta = async (t: typeof schema.units | typeof schema.despesas | typeof schema.permutas | typeof schema.reembolsos) =>
      (await tx.select({ n: sql<number>`count(*)::int` }).from(t).where(eq(t.versionId, vId)))[0].n;
    const jaNaVersao: Contagem = {
      units: naPlanilha.units ? await conta(schema.units) : 0,
      despesas: naPlanilha.despesas ? await conta(schema.despesas) : 0,
      permutas: naPlanilha.permutas ? await conta(schema.permutas) : 0,
      reembolsos: naPlanilha.reembolsos ? await conta(schema.reembolsos) : 0,
    };
    const motivo = recusaDaImportacao(target.kind, naPlanilha, jaNaVersao);
    if (motivo) return motivo;

    if (parsed.units.length) {
      await tx.insert(schema.units).values(
        parsed.units.map((u) => ({
          versionId: vId, tenantId: tId, code: u.code, bloco: u.bloco || null,
          tipo: u.tipo || null, m2: u.m2 != null ? String(u.m2) : null,
          andar: u.andar, valor: String(u.valor), status: u.status,
          mesVenda: u.mesVenda || null, paymentPlan: u.plan,
        })),
      );
      result.units = parsed.units.length;
    }

    if (parsed.reembolsos.length) {
      await tx.insert(schema.reembolsos).values(
        parsed.reembolsos.map((r) => ({
          versionId: vId, tenantId: tId, data: r.data || null, origem: r.origem || null,
          valor: String(r.valor), pct: r.pct || null, obs: r.obs || null,
          serial: r.serial, status: "received",
        })),
      );
      result.reembolsos = parsed.reembolsos.length;
    }

    if (parsed.permutas.length) {
      await tx.insert(schema.permutas).values(
        parsed.permutas.map((p) => ({
          versionId: vId, tenantId: tId, unitCode: p.unitCode || null, cliente: p.cliente || null,
          dataRecebimento: p.dataRecebimento || null, tipo: p.tipo || null, descricao: p.descricao || null,
          estimado: String(p.estimado), status: p.status || null, dataVenda: p.dataVenda || null,
          valorVenda: String(p.valorVenda), tipoPermuta: p.tipoPermuta || null, obs: p.obs || null,
        })),
      );
      result.permutas = parsed.permutas.length;
    }

    if (parsed.despesas.length) {
      await tx.insert(schema.despesas).values(
        parsed.despesas.map((d) => ({
          versionId: vId, tenantId: tId, contaCef: d.contaCef, categoriaDre: "Custo Variável" as const,
          competencia: d.competencia, vencimento: d.vencimento, valor: String(d.valor), status: "A pagar",
        })),
      );
      result.despesas = parsed.despesas.length;
    }

    // INCC (por projeto): atualiza mês a mês.
    for (const r of parsed.incc) {
      await tx
        .update(schema.inccRates)
        .set({ monthly: String(r.monthly), accumulated: String(r.accumulated) })
        .where(and(eq(schema.inccRates.projectId, alvo.project.id), eq(schema.inccRates.mes, r.mes)));
    }
    result.incc = parsed.incc.length;
    return null;
  });
  if (recusa) return { ok: false, error: recusa };

  await logAudit({
    tenantId: tId, userId: ctx.userId, action: "version.import",
    entity: "version", entityId: vId, meta: result,
  });
  revalidatePath("/", "layout");
  return { ok: true, result };
}
```

Regra pura usada por ela:

### `src/lib/versao-importacao.ts`

```ts
/**
 * Regras da importação de planilha na tela Versão (Prompt I, BI-3) — puras e
 * testáveis. Decisões (V2-BLOCO2-DECISOES, 30/09/2026):
 *  - lançamento (despesa, unidade, permuta, liberação) só entra na versão
 *    Atual; fora dela a planilha é recusada;
 *  - a planilha só grava numa categoria VAZIA. Antes, ela apagava tudo da
 *    categoria e regravava — e apagar despesa leva junto parcelas, pagamentos
 *    e terceiros. Agora, se já houver registro, recusa e nada é apagado.
 *  - o INCC (do projeto) segue atualizando mês a mês, em qualquer versão.
 */

export const CATEGORIAS_DA_PLANILHA = ["units", "despesas", "permutas", "reembolsos"] as const;
export type CategoriaDaPlanilha = (typeof CATEGORIAS_DA_PLANILHA)[number];

export const ROTULO_CATEGORIA: Record<CategoriaDaPlanilha, string> = {
  units: "unidades",
  despesas: "despesas",
  permutas: "permutas",
  reembolsos: "liberações de obra",
};

export type Contagem = Record<CategoriaDaPlanilha, number>;

/** Mensagem de recusa da importação, ou null se ela pode seguir. */
export function recusaDaImportacao(
  kindDaVersao: string,
  naPlanilha: Contagem,
  jaNaVersao: Contagem,
): string | null {
  const trazidas = CATEGORIAS_DA_PLANILHA.filter((c) => naPlanilha[c] > 0);
  if (!trazidas.length) return null;
  const lista = (cs: readonly CategoriaDaPlanilha[]) => cs.map((c) => ROTULO_CATEGORIA[c]).join(", ");
  if (kindDaVersao !== "atual") {
    return `Lançamentos só entram na versão Atual. Esta planilha traz ${lista(trazidas)}; importe-a na Atual ou deixe essas abas vazias.`;
  }
  const ocupadas = trazidas.filter((c) => jaNaVersao[c] > 0);
  if (ocupadas.length) {
    return `A importação não substitui registros: esta versão já tem ${lista(ocupadas)}. Nada foi gravado. Deixe essas abas vazias na planilha ou lance pela tela.`;
  }
  return null;
}
```


## 5. A tabela `version` no schema

```ts
export const versions = pgTable(
  "version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** chave estável: "budget" | "forecast" | "atual" | slug da customizada */
    key: text("key").notNull(),
    kind: versionKindEnum("kind").notNull(),
    label: text("label").notNull(),
    color: text("color").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    /** congelada: bloqueia lançamentos/edições (ver Configuração da Versão). */
    locked: boolean("locked").notNull().default(false),
    /** status do workflow da versão: "Rascunho" | "Concluído" | "Aprovado". */
    status: text("status").notNull().default("Rascunho"),
    /**
     * Versão de Budget que originou este Forecast (rastreabilidade/comparação).
     * NULL para Budget/Atual ou Forecast sem origem. O Forecast é um snapshot
     * independente — esta referência NÃO o mantém sincronizado com o Budget.
     */
    sourceVersionId: uuid("source_version_id").references(
      (): AnyPgColumn => versions.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (v) => [unique("version_project_key_uq").on(v.projectId, v.key)],
);
```

Índice: `version_project_key_uq` (único em projeto + chave). FKs que
apontam para `version.id`:

| Tabela | ON DELETE |
|---|---|
| `unit` | `cascade` |
| `permuta` | `cascade` |
| `reembolso` | `cascade` |
| `despesa` | `cascade` |
| `medicao` | `cascade` |
| `cash_entry` | `cascade` |
| `budget_line` | `cascade` |
| `budget_account` | `cascade` |
| `budget_selecao` | `cascade` |
| `version.source_version_id` (a própria tabela) | `set null` |

## 6. Todos os lugares que criam linha em `version`

```
src/lib/tenant/provision.ts:118:      await tx.insert(schema.versions).values(
src/lib/actions/planning.ts:377:        .insert(schema.versions)
src/lib/actions/planning.ts:441:        .insert(schema.versions)
src/lib/actions/projects.ts:139:      .insert(schema.versions)
src/lib/db/seed.ts:138:    .insert(schema.versions)
```

- `actions/projects.ts`: `createProject` grava as três padrão
  (`DEFAULT_VERSIONS`) na mesma transação do projeto.
- `tenant/provision.ts`: o provisionamento de empresa nova grava as três
  do primeiro projeto.
- `actions/planning.ts`: `createForecastFromBudget` e `duplicateForecast`
  criam Previsão nova, nas telas de planejamento.
- `db/seed.ts`: a carga de demonstração.

## 7. Quem lê `version.locked` e `version.isDefault`

**`locked`:**
```
src/components/app/budget-planning-screen.tsx:323:  return data.versions.find((v) => v.id === data.versionId)?.locked ?? false;
src/components/app/budget-planning-screen.tsx:446:            <Badge tone={version.locked ? "warning" : "neutral"}>{version.locked ? "travada" : "não travada"}</Badge>
src/components/app/version-identity.tsx:66:            onClick={() => start(() => toggleVersionLock(version.id, !version.locked))}
src/components/app/version-identity.tsx:68:            {version.locked ? "Descongelar" : "Congelar"}
src/components/app/medicao-obra.tsx:86:      {aba === "nova" && can(ctx.perms, TELA_LANCAMENTO, "criar") && <AbaNova ctx={ctx} projectId={project.id} locked={atual.locked} />}
src/components/app/medicao-obra.tsx:87:      {aba === "lancadas" && can(ctx.perms, TELA_LANCAMENTO, "ver") && <AbaLancadas ctx={ctx} versionId={atual.id} projectId={project.id} locked={atual.locked} sp={sp} />}
src/components/app/medicao-obra.tsx:133:async function AbaNova({ ctx, projectId, locked }: { ctx: TenantContext; projectId: string; locked: boolean }) {
src/components/app/medicao-obra.tsx:158:async function AbaLancadas({ ctx, versionId, projectId, locked, sp }: { ctx: TenantContext; versionId: string; projectId: string; locked: boolean; sp: ParamsDaMedicao }) {
src/components/app/version-config.tsx:71:          {v.locked && <Badge tone="warning">congelada</Badge>}
src/components/app/version-config.tsx:86:              onClick={() => start(() => toggleVersionLock(v.id, !v.locked))}
src/components/app/version-config.tsx:88:              {v.locked ? "Descongelar" : "Congelar"}
src/components/app/import-version.tsx:13:  locked: boolean;
src/app/(app)/permuta/[id]/page.tsx:62:        subtitle={alvo.locked ? "Versão congelada — a edição será recusada." : "Toda alteração registra o valor anterior e o novo na auditoria."}
src/app/(app)/versao/page.tsx:121:            {v.locked && " · congelada"}
src/app/(app)/versao/page.tsx:219:                <ImportVersion versionId={v.id} locked={v.locked} />
src/app/(app)/reembolso/[id]/page.tsx:43:        subtitle={alvo.locked ? "Versão congelada — a edição será recusada." : "Toda alteração registra o valor anterior e o novo na auditoria."}
src/lib/planning.ts:117:  locked: boolean;
src/lib/actions/units.ts:68:  if (version.locked) return { ok: false, error: "Versão congelada — edição bloqueada." };
src/lib/actions/units.ts:165:  if (version.locked) return { ok: false, error: "Versão congelada — importação bloqueada." };
src/lib/actions/units.ts:253:    .select({ u: schema.units, locked: schema.versions.locked, projectId: schema.versions.projectId })
src/lib/actions/units.ts:260:  if (alvo.locked) return { ok: false, error: "Versão congelada — exclusão bloqueada." };
src/lib/actions/restituicoes.ts:143:  if (version.locked) return { ok: false, error: "Versão congelada." };
src/lib/actions/restituicoes.ts:207:          .select({ kind: schema.versions.kind, locked: schema.versions.locked })
src/lib/actions/restituicoes.ts:212:        if (vd.locked) throw new Error("Versão congelada — o PED não pode receber obrigação.");
src/lib/actions/restituicoes.ts:319:    .select({ id: schema.versions.id, locked: schema.versions.locked, projectId: schema.versions.projectId })
src/lib/actions/restituicoes.ts:432:  if (versaoCaixa?.locked) return { ok: false, error: "Versão congelada — restituição bloqueada." };
src/lib/actions/restituicoes.ts:477:      if (versaoDaSaida?.locked) throw new Error("Versão congelada — restituição bloqueada.");
src/lib/actions/restituicoes.ts:636:  if (versaoCaixa?.locked) return { ok: false, error: "Versão congelada — estorno bloqueado." };
src/lib/actions/planning.ts:62:  if (version.locked) throw new Error("Versão congelada — edição bloqueada.");
src/lib/actions/planning.ts:255:  if (version.locked) return { ok: false, error: "Versão congelada — edição bloqueada." };
src/lib/actions/planning.ts:386:          locked: false,
src/lib/actions/planning.ts:450:          locked: false,
src/lib/actions/faturas.ts:160:  if (versaoCaixa.locked) return { ok: false, error: "Versão congelada — pagamento bloqueado." };
src/lib/actions/faturas.ts:319:  if (versao.locked) return { ok: false, error: "Versão congelada." };
src/lib/actions/despesas.ts:135:    .select({ d: schema.despesas, locked: schema.versions.locked, versionKind: schema.versions.kind })
src/lib/actions/despesas.ts:203:  if (version.locked) throw new Recusa("Versão congelada — lançamentos bloqueados.");
src/lib/actions/despesas.ts:654:  if (alvo.locked) return { ok: false, error: "Versão congelada — edição bloqueada." };
src/lib/actions/despesas.ts:766:  if (alvo.locked) return { ok: false, error: "Versão congelada — exclusão bloqueada." };
src/lib/actions/despesas.ts:827:  if (alvo.locked) return { ok: false, error: "Versão congelada — cancelamento bloqueado." };
src/lib/actions/despesas.ts:902:  if (alvo.locked) return { ok: false, error: "Versão congelada — pagamento bloqueado." };
src/lib/actions/medicao.ts:40:  if (atual.locked) return { ok: false, error: "Versão congelada — lançamentos bloqueados." };
src/lib/actions/medicao.ts:94:    .select({ m: schema.medicoes, locked: schema.versions.locked, projectId: schema.versions.projectId, kind: schema.versions.kind })
src/lib/actions/medicao.ts:109:  if (alvo.locked) return { ok: false as const, error: `Versão congelada — ${acao === "editar" ? "edição" : "exclusão"} bloqueada.` };
src/lib/actions/versions.ts:48:export async function toggleVersionLock(versionId: string, locked: boolean) {
src/lib/actions/restituicao-lote.ts:170:  if (versaoCaixa.locked) return { ok: false, error: "Versão congelada — restituição bloqueada." };
src/lib/actions/acerto.ts:87:        eq(schema.versions.locked, false),
src/lib/actions/acerto.ts:198:        .select({ id: schema.versions.id, kind: schema.versions.kind, locked: schema.versions.locked })
src/lib/actions/acerto.ts:217:              locked: v?.locked ?? true,
src/lib/actions/acerto.ts:440:          .where(and(inArray(schema.despesas.id, itens.map((i) => i.despesaId)), eq(schema.versions.locked, true)))
src/lib/actions/acerto.ts:606:        if (versao.locked) {
src/lib/actions/pagamentos.ts:62:      locked: schema.versions.locked,
src/lib/actions/pagamentos.ts:79:  if (parc.locked) return { ok: false, error: "Versão congelada — pagamento bloqueado." };
src/lib/actions/receitas.ts:35:  if (r.trabalho.locked) throw new Error("Versão congelada — lançamentos bloqueados.");
src/lib/actions/receitas.ts:108:  if (alvo.locked) return { ok: false, error: "Versão congelada — edição bloqueada." };
src/lib/actions/receitas.ts:151:  if (alvo.locked) return { ok: false, error: "Versão congelada — cancelamento bloqueado." };
src/lib/actions/receitas.ts:298:  if (alvo.locked) return { ok: false, error: "Versão congelada — edição bloqueada." };
src/lib/actions/receitas.ts:336:  if (alvo.locked) return { ok: false, error: "Versão congelada — cancelamento bloqueado." };
src/lib/actions/caixa.ts:174:  if (version.locked) throw new Error("Versão congelada.");
src/lib/actions/caixa.ts:248:  if (version.locked) return { ok: false, error: "Versão congelada." };
src/lib/actions/caixa.ts:321:  if (version.locked) throw new Error("Versão congelada.");
src/lib/actions/caixa.ts:490:    .select({ id: schema.cashEntries.id, locked: schema.versions.locked })
src/lib/actions/caixa.ts:496:  if (alvo.locked) throw new Error("Versão congelada — conciliação bloqueada.");
src/lib/actions/caixa.ts:534:    .select({ locked: schema.versions.locked })
src/lib/actions/caixa.ts:540:  if (alvo.locked) return { ok: false, error: "Versão congelada — conciliação bloqueada." };
src/lib/actions/caixa.ts:1044:  if (version.locked) return { ok: false, error: "Versão congelada." };
src/lib/actions/caixa.ts:1172:  if (version.locked) return { ok: false, error: "Versão congelada." };
src/lib/actions/budget.ts:61:  if (v.locked) throw new Error("Versão congelada.");
src/lib/actions/budget.ts:259:    if (v.locked) {
src/lib/actions/budget.ts:482:  const verByProj = new Map(vers.filter((v) => !v.locked).map((v) => [v.projectId, v.id]));
src/lib/actions/recebimento-terceiro.ts:262:  if (versaoCaixa?.locked) return { ok: false, error: "Versão congelada — repasse bloqueado." };
src/lib/actions/recebimento-terceiro.ts:312:        if (versaoDaEntrada.locked) throw new Error("Versão congelada — repasse bloqueado.");
src/lib/actions/version-io.ts:42:  if (target.locked) {
src/lib/acerto-regras.ts:37:  locked: boolean;
src/lib/acerto-regras.ts:58:    if (d.locked) return `${nome} está em versão congelada — acerto bloqueado.`;
src/lib/queries.ts:166:): Promise<{ liberacao: ReembolsoRow; projectId: string; versionLabel: string; locked: boolean } | undefined> {
src/lib/queries.ts:169:    .select({ r: schema.reembolsos, projectId: schema.versions.projectId, versionLabel: schema.versions.label, locked: schema.versions.locked })
src/lib/queries.ts:174:  return row ? { liberacao: row.r, projectId: row.projectId, versionLabel: row.versionLabel, locked: !!row.locked } : undefined;
src/lib/queries.ts:223:): Promise<{ permuta: PermutaRow; projectId: string; versionLabel: string; locked: boolean } | undefined> {
src/lib/queries.ts:227:    .select({ p: schema.permutas, projectId: schema.versions.projectId, versionLabel: schema.versions.label, locked: schema.versions.locked })
src/lib/queries.ts:232:  return row ? { permuta: row.p, projectId: row.projectId, versionLabel: row.versionLabel, locked: !!row.locked } : undefined;
src/lib/queries.ts:1520:    locked: v.locked,
src/lib/db/schema.ts:395:    locked: boolean("locked").notNull().default(false),
```

**`isDefault`:**
```
src/components/app/version-identity.tsx:70:          {!version.isDefault && (
src/components/app/version-config.tsx:70:          {v.isDefault && <Badge tone="accent">default</Badge>}
src/components/app/version-config.tsx:90:            {!v.isDefault && (
src/lib/context.ts:171:export function versaoDeTrabalho<V extends { kind: string; isDefault: boolean }>(
src/lib/context.ts:176:    versions.find((v) => v.isDefault) ??
src/lib/tenant/provision.ts:37:  { key: "budget", kind: "budget" as const, label: "Budget / Orçamento", color: "#6366f1", isDefault: false },
src/lib/tenant/provision.ts:38:  { key: "forecast", kind: "forecast" as const, label: "Previsto / Forecast", color: "#10b981", isDefault: true },
src/lib/tenant/provision.ts:39:  { key: "atual", kind: "atual" as const, label: "Atual — caixa real", color: "#f59e0b", isDefault: false },
src/lib/dre-inputs.ts:36:    vs.find((v) => v.isDefault) ??
src/lib/dre-inputs.ts:130:    .select({ id: schema.versions.id, kind: schema.versions.kind, isDefault: schema.versions.isDefault })
src/lib/dre-inputs.ts:135:  const budget = budgets.find((v) => v.isDefault) ?? budgets[0] ?? null;
src/lib/planning.ts:116:  isDefault: boolean;
src/lib/actions/planning.ts:385:          isDefault: false,
src/lib/actions/planning.ts:449:          isDefault: false,
src/lib/actions/projects.ts:39:  { key: "budget", kind: "budget" as const, label: "Budget / Orçamento", color: "#6366f1", isDefault: false },
src/lib/actions/projects.ts:40:  { key: "forecast", kind: "forecast" as const, label: "Previsto / Forecast", color: "#10b981", isDefault: true },
src/lib/actions/projects.ts:41:  { key: "atual", kind: "atual" as const, label: "Atual — caixa real", color: "#f59e0b", isDefault: false },
src/lib/actions/versions.ts:66:  const anterior = ctx.versions.find((v) => v.isDefault) ?? null;
src/lib/actions/versions.ts:71:      .set({ isDefault: false })
src/lib/actions/versions.ts:80:      .set({ isDefault: true })
src/lib/medicao-cef.ts:117:export function escolherOrcamento<V extends { id: string; kind: string; isDefault: boolean; createdAt: Date }>(versions: readonly V[], pedido: string | null | undefined): { escolhido: V | null; opcoes: V[]; motivo: "pedido" | "padrao" | "mais_recente" | "unico" | "nenhum" } {
src/lib/medicao-cef.ts:123:  const d = opcoes.find((v) => v.isDefault);
src/lib/queries.ts:1519:    isDefault: v.isDefault,
src/lib/queries.ts:1528:    versions.find((v) => v.isDefault) ??
src/lib/db/seed.ts:133:    { key: "budget", kind: "budget" as const, label: "Budget / Orçamento", color: "#6366f1", isDefault: false },
src/lib/db/seed.ts:134:    { key: "forecast", kind: "forecast" as const, label: "Previsto / Forecast", color: "#10b981", isDefault: true },
src/lib/db/seed.ts:135:    { key: "atual", kind: "atual" as const, label: "Atual — caixa real", color: "#f59e0b", isDefault: false },
src/lib/db/schema.ts:393:    isDefault: boolean("is_default").notNull().default(false),
```

## 8. Respostas

**a) Quem cria as versões de um projeto novo?**
`createProject`, em `actions/projects.ts`, grava `budget`, `forecast` e
`atual` na mesma transação do projeto. Trecho:

```ts
const DEFAULT_VERSIONS = [
  { key: "budget", kind: "budget" as const, label: "Budget / Orçamento", color: "#6366f1", isDefault: false },
  { key: "forecast", kind: "forecast" as const, label: "Previsto / Forecast", color: "#10b981", isDefault: true },
  { key: "atual", kind: "atual" as const, label: "Atual — caixa real", color: "#f59e0b", isDefault: false },
];
// …
await tx
  .insert(schema.versions)
  .values(DEFAULT_VERSIONS.map((v) => ({ ...v, projectId: project.id, tenantId })));
```

**Nenhuma versão nasce em `/versao`.**

**b) Sem `/versao`, um projeto novo continua com as três?** Sim. A tela não
cria versão nenhuma.

**c) `importVersionData`: o que apaga?** **Nada, hoje.** Desde a decisão de
30/09/2026 (Prompt I, BI-3) ela:
- só insere unidades, liberações, permutas e despesas na versão **Atual**;
- só insere em categoria **vazia**;
- recusa a planilha inteira se alguma categoria trazida já tiver registro;
- atualiza o INCC do projeto mês a mês, com `UPDATE` em `incc_rate`.

Roda numa transação com a versão travada `FOR UPDATE`. Não há preview: a
recusa é a proteção. Ela recusa versão com `locked`.

**d) É o único caminho por planilha? Diferença para `importBudgetXlsx`?**
- `importVersionData` é o único caminho de entrada **em massa de
  lançamentos da Atual**: unidades, liberações, permutas, despesas e INCC.
- `importBudgetXlsx` (`actions/budget.ts`) importa **linhas de
  planejamento** (`budget_line`) para Orçamento ou Previsão, e **substitui**
  as linhas do tipo importado (`replaceLines`).
- **`importBudgetXlsx` não é chamada por nenhuma tela.** Só a usa
  `budget-matrix.tsx`, que não é importado em lugar nenhum.
- A tela de Orçamentos importa a planilha **no navegador**, para a grade, e
  grava ao clicar em Salvar (`budget-planning-screen.tsx`).
- **As duas não fazem a mesma coisa.** A importação da Atual cobre um caso
  que nenhuma outra tela cobre.

**e) Quem lê `version.locked`?** Ver o item 7. A trava recusa:
- lançamento, edição, exclusão, cancelamento e pagamento de despesas;
- unidades: salvar, importar e excluir;
- ressarcimentos e restituições;
- faturas de cartão;
- planejamento (`planning.ts`);
- medição (as abas recebem `locked`);
- a importação da própria tela.

Telas de permuta e liberação avisam "Versão congelada". As de Orçamento e
Previsão mostram o selo "travada / não travada". **Só esta tela escreve a
coluna** (`toggleVersionLock`).

**f) Quantas versões estão travadas hoje?** Base local: **0**. Produção:
relatório 1 do SQL.

**g) `isDefault`: quem lê além do contexto?**
- `versaoDeTrabalho` em `context.ts`: Atual, depois `isDefault`, depois a
  primeira.
- `versionIdOfKind` em `dre-inputs.ts`.
- **`dre-inputs.ts:135`**, que escolhe **qual Orçamento** o card Orçado x
  Realizado usa quando o projeto tem mais de um:
  `budgets.find((v) => v.isDefault) ?? budgets[0]`.

Base local: uma versão marcada por projeto com três versões (a Previsão).
Produção: relatório 2 do SQL.

**h) A exclusão faz DELETE físico?** Sim. `deleteVersion` só aceita versão
`custom` e apaga a linha. Em cascata caem `unit`, `permuta`, `reembolso`,
`despesa`, `medicao`, `cash_entry`, `budget_line`, `budget_account` e
`budget_selecao` (item 5). Não há confirmação no servidor.

**i) Projeto com versão faltando?** Base local: dois projetos (ESCRITÓRIO
CENTRAL e OBRA 7 TESTE) só têm a `atual`. **Todo projeto local tem
`atual`.** Produção: relatório 3 do SQL.

**j) Cópia com movimento?** Base local: nenhuma versão com
`source_version_id`. Produção: relatório 4 do SQL.

**k) Permissão, `SCREENS` e menu.**
- A tela é `versao` em `SCREENS`, no módulo Config. **Não tem item de menu.**
- A página e as rotas de export e modelo exigem `versao:ver`.
- `updateVersion`, `toggleVersionLock`, `setDefaultVersion` e
  `importVersionData` exigem `versao:editar`.
- `deleteVersion` exige `versao:excluir`.
- Pelo padrão, só owner e admin.

**l) `tenant_id` nos `where`.**
- `updateVersion`, `toggleVersionLock` e `deleteVersion` filtram só pelo id.
  Antes, `getVersionContext(ctx.tenant.id, id)` confirma que a versão é do
  tenant.
- `setDefaultVersion` filtra projeto e tenant.
- `importVersionData` valida a versão no tenant e grava com o `tenantId`
  do contexto.
- As rotas de export e modelo validam a versão no tenant.

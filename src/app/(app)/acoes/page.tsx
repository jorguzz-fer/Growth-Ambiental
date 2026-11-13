import { getTenantContext } from "@/lib/context";
import { getAuditLog, getEntidadesDaAuditoria, getMembers } from "@/lib/queries";
import { intervaloDoMes, lerFiltrosDaAuditoria, temFiltro } from "@/lib/auditoria-filtros";
import { hojeISO } from "@/lib/despesa-status";
import { CrisNoFormulario } from "@/components/app/cris-no-formulario";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import {
  ehAlteracaoProtegida,
  metaVisivel,
  podeVerDadoProtegido,
} from "@/lib/audit-mask";
import { can } from "@/lib/permissions";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

/**
 * Renderiza o meta de auditoria; destaca alterações campo a campo (de → para).
 *
 * Recebe o meta JÁ MASCARADO para o papel de quem vê (`metaVisivel`). Um campo
 * protegido chega como `AlteracaoProtegida` e aparece só como "alterado" — o
 * leitor sabe que o dado mudou, sem ver o valor.
 */
function renderMeta(meta: unknown) {
  if (!meta || typeof meta !== "object") return meta ? String(meta) : "—";
  const m = meta as Record<string, unknown>;
  const changes = m.changes as Record<string, unknown> | undefined;
  if (changes && typeof changes === "object" && Object.keys(changes).length > 0) {
    return (
      <div className="space-y-0.5">
        {Object.entries(changes).map(([k, v]) => {
          if (ehAlteracaoProtegida(v)) {
            return (
              <div key={k}>
                <span className="text-[var(--color-ink2)]">{k}</span>:{" "}
                <span className="italic text-[var(--color-ink3)]">alterado</span>
              </div>
            );
          }
          const alt = (v ?? {}) as { de?: unknown; para?: unknown };
          return (
            <div key={k}>
              <span className="text-[var(--color-ink2)]">{k}</span>:{" "}
              <span className="text-[var(--color-danger)]">{String(alt.de ?? "—")}</span>
              {" → "}
              <span className="text-[var(--color-success)]">{String(alt.para ?? "—")}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return <span className="break-words">{JSON.stringify(meta)}</span>;
}

export default async function AcoesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  // A página verifica "ver" antes de consultar qualquer dado (Prompt M, 2.2).
  // A guarda do layout não basta: ele renderiza em paralelo com a página e
  // não roda de novo na navegação dentro do app.
  if (!can(ctx.perms, "acoes", "ver")) return <AccessDenied />;

  const members = await getMembers(ctx.tenant.id);
  // Prompt AK2 — filtros na URL (usuário, entidade, ação, período); a Cris preenche o formulário.
  const filtros = lerFiltrosDaAuditoria((await searchParams) ?? {}, new Set(members.map((m) => m.userId)));
  const [audit, entidades] = await Promise.all([getAuditLog(ctx.tenant.id, 200, filtros), getEntidadesDaAuditoria(ctx.tenant.id)]);
  const nameById = new Map(members.map((m) => [m.userId, m.name ?? m.email]));
  const opcoesUsuario = [...members.map((m) => ({ rotulo: m.name ?? m.email ?? m.userId, valor: m.userId })), { rotulo: "sistema", valor: "sistema" }];
  const mes = intervaloDoMes(hojeISO());
  const veDadoProtegido = podeVerDadoProtegido(ctx.role);

  return (
    <>
      <PageHeader
        title="Log de Auditoria"
        subtitle={`${audit.length} evento(s) ${temFiltro(filtros) ? "com o filtro" : "recentes"} · quem alterou o quê`}
      />
      <form method="get" action="/acoes" className="mb-4 grid grid-cols-2 items-end gap-3 rounded-[10px] border border-[var(--color-line)] bg-white p-3 sm:grid-cols-6" data-filtro-auditoria>
        <div className="col-span-2 sm:col-span-6">
          <CrisNoFormulario
            id="auditoria-filtro"
            titulo={`Filtro do Log de Auditoria (hoje é ${hojeISO()}; este mês vai de ${mes.de} a ${mes.ate})`}
            campos={[
              { nome: "usuario", rotulo: "Usuário", tipo: "opcao", opcoes: opcoesUsuario.map((o) => o.rotulo) },
              { nome: "entidade", rotulo: "Entidade", tipo: "opcao", opcoes: entidades },
              { nome: "acao", rotulo: "Ação contém", tipo: "texto", dica: 'trecho da ação, ex.: "despesa", "contrato", "membership"' },
              { nome: "de", rotulo: "De", tipo: "texto", dica: "AAAA-MM-DD" },
              { nome: "ate", rotulo: "Até", tipo: "texto", dica: "AAAA-MM-DD" },
            ]}
            opcoes={{ usuario: opcoesUsuario }}
            aviso="Confira e clique em Filtrar."
          />
        </div>
        <div>
          <Label>Usuário</Label>
          <Select name="usuario" defaultValue={filtros.usuario ?? ""}>
            <option value="">Todos</option>
            {opcoesUsuario.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Entidade</Label>
          <Select name="entidade" defaultValue={filtros.entidade ?? ""}>
            <option value="">Todas</option>
            {entidades.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Ação contém</Label>
          <Input name="acao" defaultValue={filtros.acao ?? ""} placeholder="ex.: despesa" />
        </div>
        <div>
          <Label>De</Label>
          <Input name="de" type="date" defaultValue={filtros.de ?? ""} />
        </div>
        <div>
          <Label>Até</Label>
          <Input name="ate" type="date" defaultValue={filtros.ate ?? ""} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm">Filtrar</Button>
          {temFiltro(filtros) && (
            <a href="/acoes" className="self-center text-[12px] text-[var(--color-accent2)] hover:underline">
              Limpar
            </a>
          )}
        </div>
      </form>
      {!veDadoProtegido && (
        <p className="mb-3 text-xs text-[var(--color-ink3)]">
          Dados pessoais de clientes contratantes (CPF, nascimento, renda, FGTS, score e
          restrições de crédito) aparecem só como “alterado”. O valor é visível
          apenas para dono e administrador.
        </p>
      )}
      <Table>
        <THead>
          <tr>
            <TH>Quando</TH>
            <TH>Usuário</TH>
            <TH>Ação</TH>
            <TH>Entidade</TH>
            <TH>Detalhes</TH>
          </tr>
        </THead>
        <tbody>
          {audit.map((a) => (
            <TR key={a.id}>
              <TD className="whitespace-nowrap font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                {a.createdAt.toLocaleString("pt-BR")}
              </TD>
              <TD>{a.userId ? nameById.get(a.userId) ?? "—" : "sistema"}</TD>
              <TD>
                <Badge tone="accent">{a.action}</Badge>
              </TD>
              <TD className="font-[family-name:var(--font-mono)]">
                {a.entity}
                {a.entityId ? ` · ${a.entityId.slice(0, 8)}` : ""}
              </TD>
              <TD className="max-w-[360px] font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink3)]">
                {renderMeta(metaVisivel(a.meta, ctx.role))}
              </TD>
            </TR>
          ))}
          {audit.length === 0 && (
            <TR>
              <TD colSpan={5} className="py-6 text-center text-[var(--color-ink3)]">
                {temFiltro(filtros) ? "Nenhum evento com este filtro." : "Sem eventos de auditoria ainda."}
              </TD>
            </TR>
          )}
        </tbody>
      </Table>
    </>
  );
}

import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { getNotaServico } from "@/lib/queries";
import {
  EMITENTE_REPETIDO,
  ROTULO_DO_AMBIENTE,
  ambienteDoEnvio,
  bloqueiosDoEnvio,
  conferirAntesDoEnvio,
  dataDeEmissao,
  emitenteDoTenant,
  obraFiscalDoProjeto,
} from "@/lib/nota-servico";
import { formatarCnpj } from "@/lib/calc/emitente-fiscal";
import { NATUREZAS_OPERACAO } from "@/lib/calc/nfse";
import { resolverAmbiente } from "@/lib/fiscal/focus";
import { situacaoDaEmissao } from "@/lib/fiscal/emissor";
import { brl } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { EnviarNota } from "@/components/app/nota-servico-acoes";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";


/**
 * Prompt AG, 4.2 — a conferência antes do ponto sem volta. Mostra exatamente
 * o que vai ao provedor (os mesmos números de `montarPayloadNfse`) e só então
 * oferece o envio. Nada aqui grava.
 */
export default async function EnviarNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "notasfiscais", "ver") || !can(ctx.perms, "notaemitir", "editar")) return <AccessDenied />;
  const { id } = await params;
  const n = /^[0-9a-f-]{36}$/i.test(id) ? await getNotaServico(ctx.tenant.id, id) : null;
  const projeto = n && ctx.projects.find((p) => p.id === n.projectId);
  const voltar = (
    <Link href={n ? `/notasfiscais/${n.id}` : "/notasfiscais"} className="text-[13px] text-[var(--color-accent2)] hover:underline">
      ← Voltar à nota
    </Link>
  );
  if (!n || !projeto) {
    return (
      <>
        <PageHeader title="Enviar nota fiscal" actions={voltar} />
        <Card>
          <CardContent className="p-8 text-center text-[var(--color-ink3)]">Nota não encontrada.</CardContent>
        </Card>
      </>
    );
  }
  const emitente = emitenteDoTenant(ctx.tenant);
  const emissao = await situacaoDaEmissao(ctx.tenant);
  const amb = ambienteDoEnvio(n, resolverAmbiente(ctx.tenant.fiscalAmbiente));
  const ambiente = amb.ok ? amb.ambiente : resolverAmbiente(n.ambiente);
  const bloqueios = [
    ...(amb.ok ? [] : [amb.error]),
    ...bloqueiosDoEnvio({
      status: n.status,
      podeEmitir: true,
      recusaDoTenant: emissao.recusa,
      focusConfigurado: emissao.configurado(ambiente),
      ambiente,
      emitente,
    }),
  ];
  const m = conferirAntesDoEnvio(n, emitente, obraFiscalDoProjeto(projeto), dataDeEmissao());
  const producao = ambiente === "producao";
  const servico = (m.payload?.servico ?? {}) as Record<string, unknown>;

  return (
    <>
      <PageHeader eyebrow={projeto.name} title="Conferir e enviar" subtitle={ROTULO_DO_AMBIENTE[ambiente]} actions={voltar} />
      <p
        className={`mb-4 rounded-[8px] border px-4 py-3 text-[13px] font-medium ${
          producao
            ? "border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10 text-[var(--color-ink)]"
            : "border-[var(--color-warning)]/50 bg-[var(--color-warning)]/12 text-[var(--color-ink)]"
        }`}
        data-ambiente-envio={ambiente}
      >
        {producao
          ? "PRODUÇÃO — a nota terá valor fiscal. Depois de autorizada não se edita; só se cancela, dentro do prazo da prefeitura."
          : "HOMOLOGAÇÃO — SEM VALOR FISCAL. Serve para testar o caminho; não conta em nenhum relatório."}
      </p>

      {bloqueios.length > 0 || m.erros.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 p-5" data-pendencias-envio>
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">O envio ainda não é possível</h2>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--color-ink2)]">
              {[...new Set([...bloqueios, ...m.erros.filter((e) => !bloqueios.length || !EMITENTE_REPETIDO.test(e))])].map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p className="text-[12px] text-[var(--color-ink3)]">Corrija na nota ou em Configurações → Empresa e volte aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2" data-conferencia>
            <Card>
              <CardContent className="space-y-1.5 p-5 text-[13px]">
                <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Quem emite e para quem</h2>
                <p>Prestador: {emitente.razaoSocial} · CNPJ {formatarCnpj(emitente.cnpj)}</p>
                <p>Tomador: {n.tomadorNome} · {n.tomadorCpfCnpj}</p>
                <p>Município de prestação (IBGE): {String(servico.codigo_municipio ?? "—")}</p>
                <p>
                  Natureza da operação:{" "}
                  {NATUREZAS_OPERACAO.find((x) => x.id === m.payload?.natureza_operacao)?.label ?? m.payload?.natureza_operacao}
                </p>
                <p>Item da LC 116: {String(servico.item_lista_servico ?? "—")}</p>
                {n.competencia && <p>Competência: {n.competencia}</p>}
                <p className="whitespace-pre-wrap pt-1">Discriminação: {n.discriminacao}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1.5 p-5 text-[13px]">
                <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Valores que vão na nota</h2>
                <p>Valor dos serviços: {brl(Number(n.valorServicos))}</p>
                <p>Base de cálculo: {brl(m.calculo!.baseCalculo)}</p>
                <p>
                  ISS ({Number(n.aliquotaIss).toString().replace(".", ",")}%): {brl(m.calculo!.valorIss)}
                  {n.issRetido ? " · retido pelo tomador" : ""}
                </p>
                <p>Retenções federais: {brl(m.calculo!.totalRetencoesFederais)}</p>
                <p>Total retido: {brl(m.calculo!.totalRetencoes)}</p>
                <p className="font-semibold">Valor líquido a receber: {brl(m.calculo!.valorLiquido)}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardContent className="p-5">
              <EnviarNota id={n.id} producao={producao} />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

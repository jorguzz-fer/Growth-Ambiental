import Link from "next/link";
import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { getContasReceber, getEventosDaNota, getNotaServico } from "@/lib/queries";
import {
  ROTULO_DA_SITUACAO,
  ROTULO_DO_AMBIENTE,
  ambienteDoEnvio,
  bloqueiosDoEnvio,
  emitenteDoTenant,
  entradaDaNota,
  identificadorDaNota,
  podeCancelar,
  podeEditar,
  podeEnviar,
  recusaDoTenant,
  urlSegura,
  type SituacaoDaNota,
} from "@/lib/nota-servico";
import { rotuloDaConta, valoresIniciais } from "@/lib/nota-servico-tela";
import { calcularNfse, validarNfse } from "@/lib/calc/nfse";
import { formatarCnpj } from "@/lib/calc/emitente-fiscal";
import { focusConfigurado, resolverAmbiente } from "@/lib/fiscal/focus";
import { brl } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { AccessDenied } from "@/components/app/access-denied";
import { NotaServicoForm } from "@/components/app/nota-servico-form";
import { vinculosParaANota } from "@/lib/nota-servico-vinculos";
import { AcoesDaNotaProcessando, CancelarNota } from "@/components/app/nota-servico-acoes";
import { origemNoProvedor, temArquivos } from "@/lib/nota-servico-arquivos";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ROTULO_DO_EVENTO: Record<string, string> = {
  criada: "Rascunho criado",
  editada: "Rascunho corrigido",
  enviada: "Enviada ao provedor",
  reenviada: "Reenviada com a mesma referência",
  retorno: "Resposta do provedor",
  consulta: "Situação consultada",
  falha_rede: "Sem resposta do provedor",
  cancelamento_pedido: "Cancelamento pedido",
  cancelamento_recusado: "Cancelamento recusado",
  cancelamento_sem_resposta: "Cancelamento sem confirmação",
};

/** Prompt AG — a nota: rascunho editável, ou o registro do que foi emitido (nada se apaga, 5.7). */
export default async function NotaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "notasfiscais", "ver")) return <AccessDenied />;
  const { id } = await params;
  const n = /^[0-9a-f-]{36}$/i.test(id) ? await getNotaServico(ctx.tenant.id, id) : null;
  // Nota de obra que a pessoa não vê é tratada como inexistente.
  if (!n || !ctx.projects.some((p) => p.id === n.projectId)) {
    return (
      <>
        <PageHeader title="Nota fiscal" />
        <Card>
          <CardContent className="p-8 text-center text-[var(--color-ink3)]">Nota não encontrada.</CardContent>
        </Card>
      </>
    );
  }
  const eventos = await getEventosDaNota(ctx.tenant.id, n.id);
  const projeto = ctx.projects.find((p) => p.id === n.projectId)!;
  const editavel = podeEditar(n.status) && can(ctx.perms, "notasfiscais", "editar");
  const situacao = n.status as SituacaoDaNota;
  const homolog = n.ambiente !== "producao";
  const e = emitenteDoTenant(ctx.tenant);
  const entrada = entradaDaNota(n);
  const calc = validarNfse(entrada) ? null : calcularNfse(entrada);
  const podeEmitir = can(ctx.perms, "notaemitir", "editar");
  const podeCancelarAqui = podeCancelar(n.status) && can(ctx.perms, "notacancelar", "editar");
  // Pedido de cancelamento sem desfecho conhecido: oferece a consulta.
  const ultimoDeCancelamento = [...eventos].reverse().find((ev) => ev.tipo.startsWith("cancelamento_"));
  const cancelamentoPendente =
    n.status === "autorizada" && (ultimoDeCancelamento?.tipo === "cancelamento_pedido" || ultimoDeCancelamento?.tipo === "cancelamento_sem_resposta");
  const espelho = urlSegura(n.urlEspelho);
  // 4.1 — o botão de envio só aparece sem bloqueio; com bloqueio, a lista diz o que falta.
  const amb = ambienteDoEnvio(n, resolverAmbiente(ctx.tenant.fiscalAmbiente));
  const ambienteDoProximoEnvio = amb.ok ? amb.ambiente : resolverAmbiente(n.ambiente);
  const bloqueios =
    podeEnviar(n.status) && podeEmitir
      ? [
          ...(amb.ok ? [] : [amb.error]),
          ...bloqueiosDoEnvio({
            status: n.status,
            podeEmitir,
            recusaDoTenant: recusaDoTenant(ctx.tenant.id, process.env.NFSE_TENANT_ID),
            focusConfigurado: focusConfigurado(ambienteDoProximoEnvio),
            ambiente: ambienteDoProximoEnvio,
            emitente: e,
          }),
        ]
      : [];

  return (
    <>
      <PageHeader
        eyebrow={`${projeto.name} · ${n.origemTipo === "avulso" ? "serviço avulso" : n.origemTipo}`}
        title={n.numero ? `NFS-e nº ${n.numero}` : "Nota fiscal (sem número)"}
        subtitle={`${ROTULO_DA_SITUACAO[situacao] ?? n.status} · ${ROTULO_DO_AMBIENTE[resolverAmbiente(n.ambiente)]}`}
        actions={
          <Link href="/notasfiscais" className="text-[13px] text-[var(--color-accent2)] hover:underline">
            ← Notas Fiscais
          </Link>
        }
      />
      {homolog && (
        <p className="mb-4 rounded-[8px] border border-[var(--color-warning)]/50 bg-[var(--color-warning)]/12 px-4 py-3 text-[13px] font-medium text-[var(--color-ink)]" data-marca-homologacao>
          NOTA DE HOMOLOGAÇÃO — SEM VALOR FISCAL. Existe só para testar o caminho; não conta em nenhum relatório.
        </p>
      )}
      {podeEnviar(n.status) && podeEmitir && (
        <Card className="mb-4">
          <CardContent className="p-5" data-envio>
            {bloqueios.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/notasfiscais/${n.id}/enviar`}
                  className="inline-flex h-9 items-center rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--color-accent2)]"
                  data-botao-enviar
                >
                  Conferir e enviar →
                </Link>
                <span className="text-[12px] text-[var(--color-ink3)]">
                  {ROTULO_DO_AMBIENTE[ambienteDoProximoEnvio]} · a próxima tela mostra tudo o que vai na nota antes de enviar.
                </span>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-[var(--color-ink)]">Para enviar esta nota falta:</h2>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-[var(--color-ink2)]" data-bloqueios-envio>
                  {bloqueios.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      )}
      {n.status === "processando" && (podeEmitir || can(ctx.perms, "notasfiscais", "editar")) && (
        <Card className="mb-4">
          <CardContent className="space-y-2 p-5">
            <p className="text-[13px] text-[var(--color-ink2)]">
              A nota foi enviada e aguarda a prefeitura. A situação não se atualiza sozinha: consulte quando quiser.
            </p>
            <AcoesDaNotaProcessando id={n.id} podeReenviar={podeEmitir} />
          </CardContent>
        </Card>
      )}
      {cancelamentoPendente && (podeEmitir || podeCancelarAqui || can(ctx.perms, "notasfiscais", "editar")) && (
        <Card className="mb-4">
          <CardContent className="space-y-2 p-5" data-cancelamento-pendente>
            <p className="text-[13px] text-[var(--color-ink2)]">
              O cancelamento foi pedido, mas a Focus ainda não confirmou. A nota continua autorizada até a confirmação.
            </p>
            <AcoesDaNotaProcessando id={n.id} podeReenviar={false} rotulo="Conferir na Focus" />
          </CardContent>
        </Card>
      )}
      {podeCancelarAqui && !cancelamentoPendente && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <CancelarNota id={n.id} identificador={identificadorDaNota(n)} />
          </CardContent>
        </Card>
      )}
      {temArquivos(n.status) && (
        <p className="mb-4 flex flex-wrap items-center gap-4 text-[13px]" data-arquivos>
          {(["pdf", "xml"] as const).map((t) =>
            (t === "pdf" ? n.pdfKey : n.xmlKey) || origemNoProvedor(n, t) ? (
              <a key={t} href={`/notasfiscais/${n.id}/arquivo?tipo=${t}`} className="text-[var(--color-accent2)] hover:underline">
                Baixar {t.toUpperCase()}
                {homolog ? " (homologação)" : ""}
              </a>
            ) : (
              <span key={t} className="text-[var(--color-ink3)]">
                {t.toUpperCase()} ainda não disponível no provedor
              </span>
            ),
          )}
          {espelho && (
            <a href={espelho} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent2)] hover:underline">
              Ver na prefeitura
            </a>
          )}
          {(n.pdfKey || n.xmlKey) && <span className="text-[12px] text-[var(--color-ink3)]">Cópia guardada no sistema.</span>}
        </p>
      )}
      {n.mensagemRetorno && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Mensagem do provedor</h2>
            <p className="mt-1 whitespace-pre-wrap text-[13px] text-[var(--color-ink2)]" data-mensagem-provedor>
              {n.mensagemRetorno}
            </p>
          </CardContent>
        </Card>
      )}
      {editavel ? (
        <NotaServicoForm
          inicial={valoresIniciais(n as unknown as Record<string, unknown>, {})}
          projetos={ctx.projects.map((p) => ({ id: p.id, name: p.name }))}
          contasReceber={(await getContasReceber(ctx.tenant.id, n.projectId)).map((c) => ({ id: c.id, projectId: c.projectId, rotulo: rotuloDaConta(c) }))}
          {...(await vinculosParaANota(ctx.tenant.id, [n.projectId]))}
          emitente={{ razaoSocial: e.razaoSocial ?? "", cnpj: e.cnpj ? formatarCnpj(e.cnpj) : "", itemListaServico: e.itemListaServico ?? "", municipio: e.municipio ?? "" }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" data-nota-leitura>
          <Card>
            <CardContent className="space-y-1.5 p-5 text-[13px]">
              <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Serviço e valores</h2>
              <p>Competência: {n.competencia ?? "—"}</p>
              <p className="whitespace-pre-wrap">Discriminação: {n.discriminacao || "—"}</p>
              <p>Valor dos serviços: {brl(Number(n.valorServicos))}</p>
              <p>Alíquota do ISS: {Number(n.aliquotaIss).toString().replace(".", ",")}%{n.issRetido ? " · ISS retido pelo tomador" : ""}</p>
              {calc && (
                <>
                  <p>ISS: {brl(calc.valorIss)}</p>
                  <p>Total retido: {brl(calc.totalRetencoes)}</p>
                  <p className="font-semibold">Valor líquido: {brl(Number(n.valorLiquido ?? calc.valorLiquido))}</p>
                </>
              )}
              {n.codigoVerificacao && <p>Código de verificação: {n.codigoVerificacao}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1.5 p-5 text-[13px]">
              <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">Tomador (como foi emitido)</h2>
              <p>{n.tomadorNome ?? "—"}</p>
              <p>Documento: {n.tomadorCpfCnpj ?? "—"}</p>
              {n.tomadorEmail && <p>E-mail: {n.tomadorEmail}</p>}
              {n.tomadorLogradouro && (
                <p>
                  {[n.tomadorLogradouro, n.tomadorNumero, n.tomadorComplemento, n.tomadorBairro, n.tomadorUf, n.tomadorCep].filter(Boolean).join(", ")}
                </p>
              )}
              {n.canceladaEm && (
                <p className="pt-2 text-[var(--color-warning)]">
                  Cancelada em {n.canceladaEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}: {n.motivoCancelamento}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <Card className="mt-4">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">Histórico</h2>
          <ul className="mt-2 space-y-1 text-[12.5px] text-[var(--color-ink2)]" data-historico>
            {eventos.map((ev) => (
              <li key={ev.id}>
                {ev.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {ROTULO_DO_EVENTO[ev.tipo] ?? ev.tipo}
                {ev.status ? ` · ${ROTULO_DA_SITUACAO[ev.status as SituacaoDaNota] ?? ev.status}` : ""}
                {ev.email ? ` · ${ev.email}` : ""}
                {ev.mensagem ? <span className="block pl-4 text-[var(--color-ink3)]">{ev.mensagem}</span> : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

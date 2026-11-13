import { getTenantContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { listSemesters } from "@/lib/backup";
import { pacotesDaEmpresa } from "@/lib/backup-geracao";
import { situacaoDoPacote } from "@/lib/backup-historico";
import { currentSemesterKey, semesterInfo } from "@/lib/semester";
import { isR2Configured } from "@/lib/storage/r2";
import { BackupPacote, type PacoteNaTela } from "@/components/app/backup-pacote";
import { AssistenteBackup, type AnaliseDoBackup } from "@/components/app/assistente-backup";
import { lerMudancas, lerResumoDoPacote, periodosSemBackup, type ResumoGuardado } from "@/lib/backup-analise";
import { mudancasDesde } from "@/lib/backup-dados";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { AccessDenied } from "@/components/app/access-denied";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const ctx = await getTenantContext();
  if (!ctx) return null;
  if (!can(ctx.perms, "backup", "ver")) return <AccessDenied />;

  const { semesters, pendingKey } = await listSemesters(ctx.tenant.id);
  const pending = semesters.find((s) => s.key === pendingKey) ?? null;
  const agora = new Date();
  const registros = await pacotesDaEmpresa(ctx.tenant.id);
  const pacotes: PacoteNaTela[] = registros.map(({ p, email }) => {
    const r = (p.resumo ?? {}) as { totalDeLinhas?: number; documentos?: { incluidos: number; noPeriodo: number; falhos: number } };
    return {
      id: p.id,
      semestre: p.semestre,
      rotulo: semesterInfo(p.semestre)?.label.split(" (")[0] ?? p.semestre,
      situacao: situacaoDoPacote(p, agora),
      etapa: p.etapa,
      feitas: p.feitas,
      total: p.total,
      pedidoEm: p.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      por: email ?? "—",
      bytes: p.bytes,
      linhas: r.totalDeLinhas ?? null,
      documentos: r.documentos ? `${r.documentos.incluidos} de ${r.documentos.noPeriodo}${r.documentos.falhos ? ` · ${r.documentos.falhos} falharam` : ""}` : null,
      erro: p.erro,
    };
  });

  // Prompt AO, Parte 8 — o assistente lê contagens: o último pacote pronto, o
  // que mudou depois do último download (até 3 semestres) e o que falta salvar.
  const quando = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const ultimoPronto = registros.find(({ p }) => p.status === "pronto")?.p ?? null;
  const baixados = semesters.filter((s) => s.ultimoBackup).slice(0, 3);
  const analise: AnaliseDoBackup = {
    pacote: ultimoPronto
      ? {
          rotulo: semesterInfo(ultimoPronto.semestre)?.label ?? ultimoPronto.semestre,
          geradoEm: quando(ultimoPronto.concluidoEm ?? ultimoPronto.createdAt),
          frases: lerResumoDoPacote((ultimoPronto.resumo ?? {}) as ResumoGuardado),
        }
      : null,
    mudancas: (
      await Promise.all(
        baixados.map(async (s) => {
          const info = semesterInfo(s.key);
          const frases = info ? lerMudancas(await mudancasDesde(ctx.tenant.id, info, s.ultimoBackup!.em)) : [];
          return { rotulo: s.label, desde: quando(s.ultimoBackup!.em), frases };
        }),
      )
    ).filter((m) => m.frases.length > 0),
    semBackup: periodosSemBackup(semesters),
  };

  return (
    <>
      {/* Prompt AO, BAO-3 (recomendação 1): "Backup de dados", com a ressalva escrita. */}
      <PageHeader title="Backup de dados" subtitle="Cópia dos dados lançados, por semestre — não restaura o sistema" />

      <div className="flex flex-col gap-6 min-[1180px]:flex-row min-[1180px]:items-start">
      <div className="min-w-0 flex-1">
      {pending && (
        <Card className="mb-5 border-l-4 border-[var(--color-warning)]">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[14px] font-semibold text-[var(--color-ink)]">
                Um semestre foi encerrado — faça o backup
              </div>
              <p className="mt-1 text-[12.5px] text-[var(--color-ink3)]">
                O {pending.label} já se encerrou. Baixe uma cópia de segurança
                (planilha dos dados + documentos do período). Nada é removido do
                sistema — os dados continuam disponíveis normalmente.
              </p>
            </div>
            <a
              href={`/backup/download?sem=${pending.key}`}
              className="shrink-0 rounded-[8px] bg-[var(--color-accent2)] px-4 py-2 text-center text-[13px] font-medium text-white hover:opacity-90"
            >
              Baixar backup do {pending.label.split(" (")[0]}
            </a>
          </CardContent>
        </Card>
      )}

      <Card className="mb-5">
        <CardContent className="p-5 text-[12.5px] leading-relaxed text-[var(--color-ink3)]">
          A cada virada de semestre (janeiro e julho), o app avisa e oferece o
          backup do semestre que se encerrou. Cada backup é um único arquivo{" "}
          <strong className="text-[var(--color-ink)]">.zip</strong> com uma
          planilha (Despesas, Contas a Receber e Caixa do período) e os
          documentos salvos naquele semestre. Esta é apenas uma cópia de
          segurança: <strong className="text-[var(--color-ink)]">nenhum dado é
          apagado</strong> e a visualização não muda.
          <span className="mt-2 block" data-ressalva-backup>
            O backup do banco de dados e dos arquivos (storage) é outro, feito pela infraestrutura: é ele que recupera o sistema. Este
            arquivo é uma cópia para a empresa guardar e abrir — não restaura nada.
          </span>
          <span className="mt-1 block">
            &ldquo;Encerrado&rdquo; é só calendário: semestre encerrado continua recebendo lançamento. Um backup baixado e depois
            alterado fica desatualizado — a coluna Último backup mostra quando cada semestre foi baixado.
          </span>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">Pacote completo</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-ink3)]">
              Além da planilha, leva <strong className="text-[var(--color-ink)]">todas as tabelas de lançamento</strong> com todas as
              colunas e chaves, o manifesto (linhas e somas de controle de cada tabela) e os documentos do semestre. O cadastro vem
              inteiro; o movimento, pelo semestre. É gerado em segundo plano e fica disponível aqui para baixar.
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-ink3)]" data-aviso-lgpd>
              <strong className="text-[var(--color-ink)]">Contém dado pessoal</strong> (CPF, endereço e telefone de clientes,
              fornecedores e funcionários). Os dados sensíveis ficam fora — renda, FGTS, score e estado civil do cliente contratante; salário,
              endereço e banco do funcionário; ASO. A guarda do arquivo é responsabilidade de quem baixou. É apenas uma cópia: nenhum
              dado é removido do sistema.
            </p>
          </div>
          <BackupPacote
            semestres={(semesters.length ? semesters : [{ key: currentSemesterKey(), label: semesterInfo(currentSemesterKey())!.label }]).map((s) => ({ key: s.key, label: s.label }))}
            pacotes={pacotes}
            disponivel={isR2Configured()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <tr>
                <TH>Semestre</TH>
                <TH className="text-right">Despesas</TH>
                <TH className="text-right">Contas a Receber</TH>
                <TH className="text-right">Caixa</TH>
                <TH className="text-right">Documentos</TH>
                <TH>Situação</TH>
                <TH>Último backup</TH>
                <TH className="text-right">Backup</TH>
              </tr>
            </THead>
            <tbody>
              {semesters.map((s) => (
                <TR key={s.key}>
                  <TD className="font-medium text-[var(--color-ink)]">{s.label}</TD>
                  <TD className="text-right font-[family-name:var(--font-mono)]">{s.despesas}</TD>
                  <TD className="text-right font-[family-name:var(--font-mono)]">{s.contasReceber}</TD>
                  <TD className="text-right font-[family-name:var(--font-mono)]">{s.caixa}</TD>
                  <TD className="text-right font-[family-name:var(--font-mono)]">{s.documentos}</TD>
                  <TD>
                    <Badge tone={s.closed ? "neutral" : "success"}>
                      {s.closed ? "Encerrado" : "Em andamento"}
                    </Badge>
                  </TD>
                  <TD className="text-[12px] text-[var(--color-ink2)]" data-ultimo-backup={s.key}>
                    {s.ultimoBackup ? (
                      <>
                        {s.ultimoBackup.em.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {s.ultimoBackup.por}
                        {s.closed && s.ultimoBackup.em.getTime() <= s.fim.getTime() && (
                          <span className="block text-[var(--color-warning)]">antes do fim do semestre — incompleto</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--color-ink4)]">nunca baixado</span>
                    )}
                  </TD>
                  <TD className="text-right">
                    <a
                      href={`/backup/download?sem=${s.key}`}
                      className="text-[13px] text-[var(--color-accent2)] hover:underline"
                    >
                      Baixar ZIP
                    </a>
                  </TD>
                </TR>
              ))}
              {semesters.length === 0 && (
                <TR>
                  <TD colSpan={8} className="py-8 text-center text-[var(--color-ink4)]">
                    Ainda não há dados para arquivar.
                  </TD>
                </TR>
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
      </div>
      <AssistenteBackup usuario={ctx.userEmail ?? "anon"} analise={analise} />
      </div>
    </>
  );
}

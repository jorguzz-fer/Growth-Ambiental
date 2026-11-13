"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronLeft, MoreHorizontal, Plus } from "lucide-react";
import type { Project } from "@/lib/context";
import { createProject, updateProject, setProjectSituacao } from "@/lib/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { DateField } from "@/components/ui/date-field";
import { Badge } from "@/components/ui/badge";
import { brl, dateBR } from "@/lib/utils";
import { ProjetoDocs, type ProjetoDoc } from "@/components/app/projeto-docs";
import { ExcluirProjeto } from "@/components/app/excluir-projeto";
import { CHAVE_PROPOSTA_PROJETO, EVENTO_PROPOSTA_PROJETO, ROTULO_CAMPO_PROJETO, type CampoProjeto, type PropostaDeProjetoGuardada } from "@/lib/ai/projeto-doc";
import { useCrisFormulario } from "@/components/app/cris-contexto";
import { useAvisoAoSair } from "@/components/app/aviso-ao-sair";
import { formularioDoProjeto, rotuloDoCampoDoCadastro, valoresParaOCadastro } from "@/lib/projeto-cris";
import { codigoMunicipioValido } from "@/lib/calc/emitente-fiscal";
import { naturezaPorMunicipio } from "@/lib/calc/nfse";
import {
  avisoDeCoordenada,
  avisoDeDuracao,
  avisoDeMunicipio,
  duracaoDerivada,
  recusaDasDatas,
  valorGlobal,
} from "@/lib/projeto-regras";

interface Perms {
  criar: boolean;
  editar: boolean;
  excluir: boolean;
}
export interface ClienteOpt {
  id: string;
  nome: string;
}

type Msg = { ok: boolean; texto: string } | null;

/* ─── blocos visuais (seção 33: cores suaves, nunca saturadas) ────────── */

const BLOCO = {
  neutro: "border-[var(--color-line)] bg-white",
  receita: "border-[#a7f3d0] bg-[#f0fdf7]",
  custo: "border-[#fecdd3] bg-[#fff5f6]",
  estrutura: "border-[#bfdbfe] bg-[#f3f8ff]",
  localizacao: "border-[var(--color-line)] bg-[var(--color-surface2)]",
} as const;

function Bloco({ tom, titulo, subtitulo, children, className = "" }: { tom: keyof typeof BLOCO; titulo: string; subtitulo?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={titulo} className={`rounded-[10px] border p-3.5 ${BLOCO[tom]} ${className}`}>
      <h3 className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-wide text-[var(--color-ink)]">{titulo}</h3>
      {subtitulo && <p className="mb-2.5 text-[11.5px] text-[var(--color-ink3)]">{subtitulo}</p>}
      {!subtitulo && <div className="mb-2.5" />}
      {children}
    </section>
  );
}

const Aviso = ({ texto, tom = "warning" }: { texto: string | null; tom?: "warning" | "danger" | "info" }) =>
  texto ? (
    <p role="note" className={`mt-1 text-[11.5px] ${tom === "danger" ? "text-[var(--color-danger)]" : tom === "info" ? "text-[var(--color-info)]" : "text-[#92400e]"}`}>
      {texto}
    </p>
  ) : null;

const Resultado = ({ msg }: { msg: Msg }) =>
  msg ? (
    <span role="status" className={`text-[12px] ${msg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
      {msg.texto}
    </span>
  ) : null;

/** Dropdown de Cliente: "próprio" (tenant) + clientes cadastrados (seção 32). */
function ClienteSelect({ clientes, tenantName, value, onChange, disabled }: { clientes: ClienteOpt[]; tenantName: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label="Cliente">
      <option value="">Projeto próprio (sem cliente) — {tenantName}</option>
      {clientes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nome}
        </option>
      ))}
    </Select>
  );
}

/* ─── tela ───────────────────────────────────────────────────────────── */

export function ProjectManager({
  projects,
  perms,
  clientes,
  tenantName,
  docsByProject = {},
  r2Configured = false,
  selecionadoId = "all",
  tenantCodigoMunicipio = null,
  registrosDePonto = 0,
  orcadoRealizado,
}: {
  projects: Project[];
  perms: Perms;
  clientes: ClienteOpt[];
  tenantName: string;
  docsByProject?: Record<string, ProjetoDoc[]>;
  r2Configured?: boolean;
  /** id vindo do seletor do topo; "all" lista todos. */
  selecionadoId?: string;
  /** Código IBGE do município da EMPRESA (Config › Empresa), para dizer onde o ISS incide. */
  tenantCodigoMunicipio?: string | null;
  /** Registros de ponto do projeto selecionado (aviso ao mudar coordenada, seção 17). */
  registrosDePonto?: number;
  /** Card Orçado x Realizado do projeto selecionado (seção 19), montado no servidor. */
  orcadoRealizado?: ReactNode;
}) {
  const umSo = selecionadoId !== "all";
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState<"proj" | "office" | null>(null);
  const nomeDoCliente = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);

  // O seletor filtra o que é EXIBIDO. `projects` continua completo, então a
  // trava de exclusão (não deixar a empresa sem projeto) olha o total real.
  const q = busca.trim().toLowerCase();
  const casa = (p: Project) => !q || p.name.toLowerCase().includes(q) || (p.clienteId ? (nomeDoCliente.get(p.clienteId) ?? "").toLowerCase().includes(q) : "próprio".includes(q));
  const visiveis = umSo ? projects.filter((p) => p.id === selecionadoId) : projects.filter(casa);
  const empreendimentos = visiveis.filter((p) => p.kind !== "office");
  const escritorios = visiveis.filter((p) => p.kind === "office");
  const canDelete = perms.excluir && projects.length > 1;
  const comum = { canDelete, canEdit: perms.editar, clientes, tenantName, nomeDoCliente, r2: r2Configured, tenantCodigoMunicipio };

  return (
    <div className="space-y-6">
      {umSo ? (
        <Link href="/projeto?proj=all" className="inline-flex items-center gap-1 text-[12.5px] text-[var(--color-accent2)] hover:underline">
          <ChevronLeft size={14} aria-hidden /> Projetos
        </Link>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar projeto por nome ou cliente…" aria-label="Buscar projeto" className="max-w-xs" />
          {perms.criar && (
            <>
              <Button size="sm" variant={novo === "proj" ? "default" : "outline"} onClick={() => setNovo(novo === "proj" ? null : "proj")}>
                <Plus size={14} aria-hidden /> Novo projeto
              </Button>
              <Button size="sm" variant={novo === "office" ? "default" : "outline"} onClick={() => setNovo(novo === "office" ? null : "office")}>
                <Plus size={14} aria-hidden /> Nova sede / filial
              </Button>
            </>
          )}
          <span className="ml-auto text-[12px] text-[var(--color-ink3)]">
            {empreendimentos.length} projeto(s) · {escritorios.length} sede(s)/filial(is)
          </span>
        </div>
      )}

      {novo === "proj" && !umSo && perms.criar && <NewProjectForm clientes={clientes} tenantName={tenantName} onFechar={() => setNovo(null)} />}
      {novo === "office" && !umSo && perms.criar && <NewOfficeForm onFechar={() => setNovo(null)} />}

      {(!umSo || empreendimentos.length > 0) && (
        <section className="space-y-3" aria-label="Projetos">
          {!umSo && (
            <h2 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">Projetos</h2>
          )}
          {empreendimentos.map((p) => (
            <ProjectCard key={p.id} project={p} detalhado={umSo} docs={docsByProject[p.id] ?? []} registrosDePonto={umSo ? registrosDePonto : 0} orcadoRealizado={umSo ? orcadoRealizado : undefined} {...comum} />
          ))}
          {!umSo && empreendimentos.length === 0 && <p className="text-[12px] text-[var(--color-ink4)]">{q ? "Nenhum projeto com esse nome ou cliente." : "Nenhum projeto cadastrado ainda."}</p>}
        </section>
      )}

      {(!umSo || escritorios.length > 0) && (
        <section className="space-y-3" aria-label="Sedes e filiais — centros de custo">
          {!umSo && (
            <>
              <h2 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-ink3)]">Sedes e filiais — centros de custo</h2>
              <p className="text-[12px] text-[var(--color-ink3)]">Matriz e filiais: centros de custo da estrutura, não vinculados a um projeto (despesas administrativas e gastos compartilhados).</p>
            </>
          )}
          {escritorios.map((p) => (
            <OfficeCard key={p.id} project={p} detalhado={umSo} canDelete={canDelete} canEdit={perms.editar} />
          ))}
          {!umSo && escritorios.length === 0 && <p className="text-[12px] text-[var(--color-ink4)]">{q ? "Nenhuma sede ou filial com esse nome." : "Nenhuma sede ou filial cadastrada ainda."}</p>}
        </section>
      )}
    </div>
  );
}

/* ─── criação (seção 30) ─────────────────────────────────────────────── */

function NewProjectForm({ clientes, tenantName, onFechar }: { clientes: ClienteOpt[]; tenantName: string; onFechar: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const janela = duracaoDerivada(startDate, endDate);
  const recusa = recusaDasDatas(startDate, endDate);

  const submit = () => {
    const clean = name.trim();
    if (!clean) return;
    start(async () => {
      // Duração não é mais digitada: deriva das datas (seção 9). Fase nasce
      // "Planejamento" (enum antigo, preservado) e a situação nasce Ativo.
      const r = await createProject(clean, null, { kind: "proj", startDate, endDate, clienteId });
      if (!r.ok) {
        setMsg({ ok: false, texto: r.error });
        return;
      }
      setMsg({ ok: true, texto: `"${clean}" criado.` });
      setName("");
      setStartDate("");
      setEndDate("");
      setClienteId("");
      // Ação local: abre o recém-criado (não grava projeto ativo, seção 30).
      if (r.id) router.push(`/projeto?proj=${r.id}`);
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">Novo projeto</h3>
          <button type="button" onClick={onFechar} className="text-[12px] text-[var(--color-ink3)] hover:underline">fechar</button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label>Nome do projeto</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Monitoramento — Área Norte" disabled={pending} aria-label="Nome do projeto" />
          </div>
          <div>
            <Label>Data de início</Label>
            <DateField value={startDate} onChange={setStartDate} disabled={pending} />
          </div>
          <div>
            <Label>Data de fim</Label>
            <DateField value={endDate} onChange={setEndDate} disabled={pending} />
          </div>
          <div className="sm:col-span-3">
            <Label>Cliente</Label>
            <ClienteSelect clientes={clientes} tenantName={tenantName} value={clienteId} onChange={setClienteId} disabled={pending} />
          </div>
          <div className="flex items-end">
            <Button onClick={submit} disabled={pending || !name.trim() || !!recusa} className="w-full">
              Adicionar
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
          Duração: {janela != null ? `${janela} competência(s) entre as datas` : "informe início e fim para ter a janela do projeto"}.
        </p>
        <Aviso texto={recusa} tom="danger" />
        <div className="mt-1"><Resultado msg={msg} /></div>
      </CardContent>
    </Card>
  );
}

function NewOfficeForm({ onFechar }: { onFechar: () => void }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);

  const submit = () => {
    const clean = name.trim();
    if (!clean) return;
    start(async () => {
      const r = await createProject(clean, null, { kind: "office" });
      if (!r.ok) {
        setMsg({ ok: false, texto: r.error });
        return;
      }
      setMsg({ ok: true, texto: `"${clean}" criado.` });
      setName("");
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">Nova unidade / escritório</h3>
          <button type="button" onClick={onFechar} className="text-[12px] text-[var(--color-ink3)] hover:underline">fechar</button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Escritório Central / Filial SP" disabled={pending} aria-label="Nome da unidade" />
          </div>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            Adicionar
          </Button>
        </div>
        <div className="mt-2"><Resultado msg={msg} /></div>
      </CardContent>
    </Card>
  );
}

/* ─── situação (seção 5) ─────────────────────────────────────────────── */

function BadgeSituacao({ situacao }: { situacao: "Ativo" | "Finalizado" | null | undefined }) {
  if (situacao === "Ativo") return <Badge tone="success">Ativo</Badge>;
  if (situacao === "Finalizado") return <Badge tone="neutral">Finalizado</Badge>;
  return <Badge tone="neutral" title="Projeto ainda não classificado como Ativo ou Finalizado">—</Badge>;
}

/**
 * Situação Ativo / Finalizado (Prompt A, 23). Grava na hora, só esse campo —
 * independente do Salvar do formulário. "—" = ainda não classificado; o selo
 * não representa seleção.
 */
function SituacaoControl({ projectId, situacao, canEdit }: { projectId: string; situacao: "Ativo" | "Finalizado" | null; canEdit: boolean }) {
  const [valor, setValor] = useState(situacao);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  if (!canEdit) return <div className="flex h-9 items-center"><BadgeSituacao situacao={valor} /></div>;
  return (
    <div>
      <Select
        value={valor ?? ""}
        disabled={pending}
        aria-label="Status do projeto"
        onChange={(e) => {
          const novo = e.target.value as "Ativo" | "Finalizado";
          if (!novo) return;
          const antes = valor;
          setValor(novo);
          setErro(null);
          start(async () => {
            const r = await setProjectSituacao(projectId, novo);
            if (!r.ok) {
              setValor(antes);
              setErro(r.error ?? "Falhou.");
            }
          });
        }}
      >
        {valor == null && <option value="">— não classificado —</option>}
        <option value="Ativo">Ativo</option>
        <option value="Finalizado">Finalizado</option>
      </Select>
      {erro && <span className="text-[11.5px] text-[var(--color-danger)]">{erro}</span>}
    </div>
  );
}

/* ─── menu [...] (seção 8: Abrir · Copiar link) ───────────────────────
 * Decisão de 01/10/2026: Excluir saiu daqui. O deleteProject apaga em
 * cascata (versões, unidades, despesas, caixa, medições, orçamentos, contas a
 * receber) e não pode ficar a um clique, ao lado de "Copiar link". Mora dentro
 * da tela do projeto (ZonaDeExclusao), exigindo digitar o nome. */

function MenuAcoes({ projectId, nome, detalhado }: { projectId: string; nome: string; detalhado: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const item = "block w-full px-3 py-1.5 text-left text-[12.5px] text-[var(--color-ink)] hover:bg-[var(--color-surface2)]";
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/projeto?proj=${projectId}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sem clipboard */
    }
    setAberto(false);
  };
  return (
    <div className="relative">
      <button type="button" aria-label={`Mais ações de ${nome}`} aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="rounded-[8px] border border-[var(--color-line)] bg-white p-1.5 text-[var(--color-ink2)] hover:bg-[var(--color-surface2)]">
        <MoreHorizontal size={16} aria-hidden />
      </button>
      {copiado && <span role="status" className="absolute right-0 top-9 whitespace-nowrap text-[11px] text-[var(--color-success)]">link copiado</span>}
      {aberto && (
        <>
          <button type="button" aria-label="Fechar menu" onClick={() => setAberto(false)} className="fixed inset-0 z-10 cursor-default" />
          <div role="menu" className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-[10px] border border-[var(--color-line)] bg-white py-1 shadow-lg">
            {!detalhado && (
              <Link role="menuitem" href={`/projeto?proj=${projectId}`} className={item} onClick={() => setAberto(false)}>
                Abrir projeto
              </Link>
            )}
            <button role="menuitem" type="button" className={item} onClick={copiar}>
              Copiar link
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Exclusão dentro da tela do projeto: confirma digitando o nome (ExcluirProjeto). */
function ZonaDeExclusao({ projectId, nome }: { projectId: string; nome: string }) {
  const [excluir, setExcluir] = useState(false);
  return (
    <section aria-label="Excluir projeto" className="rounded-[10px] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3.5" data-zona-exclusao>
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-[12.5px] text-[var(--color-ink2)]">
          <strong className="text-[var(--color-danger)]">Excluir o projeto</strong> apaga junto todas as versões, unidades, despesas, caixa,
          medições, orçamentos e contas a receber. Não há como desfazer. A confirmação pede o nome do projeto.
        </p>
        <Button size="sm" variant="outline" className="border-[var(--color-danger)]/40 text-[var(--color-danger)]" onClick={() => setExcluir(true)}>
          Excluir projeto…
        </Button>
      </div>
      <ExcluirProjeto projectId={projectId} nome={nome} aberto={excluir} onFechar={() => setExcluir(false)} voltarParaTodos />
    </section>
  );
}

/* ─── incidência fiscal (mantido) ────────────────────────────────────── */

/**
 * Mostra onde o ISS do serviço vai incidir. A natureza da operação da NFS-e
 * sai da comparação entre o município de execução do projeto e o da sede.
 */
function ObraIncidencia({ codigoObra, codigoSede }: { codigoObra: string; codigoSede?: string | null }) {
  const informado = codigoObra.trim();
  if (!informado) return <span className="text-[var(--color-ink3)]">Sem município de execução: a nota sairá tributada no município da empresa.</span>;
  if (!codigoMunicipioValido(informado)) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Badge tone="danger">código inválido</Badge>
        <span className="text-[var(--color-ink2)]">O código IBGE tem 7 dígitos. A API de emissão identifica o município por ele, não pelo nome da cidade.</span>
      </span>
    );
  }
  if (!codigoSede) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Badge tone="warning">sede sem código</Badge>
        <span className="text-[var(--color-ink2)]">Cadastre o código IBGE da empresa em <strong>Config › Empresa</strong> para que a natureza da operação possa ser determinada.</span>
      </span>
    );
  }
  const fora = naturezaPorMunicipio(codigoSede, informado) === "2";
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge tone={fora ? "info" : "success"}>{fora ? "tributação fora do município" : "tributação no município"}</Badge>
      <span className="text-[var(--color-ink3)]">{fora ? "O projeto é executado em outro município: quando o serviço tem ISS devido no local da execução, a nota vai com natureza 2." : "Projeto no mesmo município da sede: ISS devido no município da empresa."}</span>
    </span>
  );
}

/* ─── card do projeto (seções 8–13, 16–22) ───────────────────────────── */

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Estado do formulário, todo em texto, lido do projeto. */
function formDe(p: Project) {
  return {
    name: p.name,
    startDate: p.startDate ?? "",
    endDate: p.endDate ?? "",
    clienteId: p.clienteId ?? "",
    valorConstrucao: str(p.valorConstrucao),
    valorTerreno: str(p.valorTerreno),
    metragem: str(p.metragem),
    custoConstrucao: str(p.custoConstrucao),
    custoTerreno: str(p.custoTerreno),
    financiamentoConstrucao: str(p.financiamentoConstrucao),
    financiamentoTerreno: str(p.financiamentoTerreno),
    recursosProprios: str(p.recursosProprios),
    proprietarioTerreno: p.proprietarioTerreno ?? "",
    formaPagamentoTerreno: p.formaPagamentoTerreno ?? "",
    terrenoForaCaixa: p.terrenoForaCaixa ?? true,
    endereco: p.endereco ?? "",
    cep: p.cep ?? "",
    municipioObra: p.municipioObra ?? "",
    ufObra: p.ufObra ?? "",
    codigoMunicipioObra: p.codigoMunicipioObra ?? "",
    latitude: str(p.latitude),
    longitude: str(p.longitude),
    codigoObra: p.codigoObra ?? "",
    art: p.art ?? "",
  };
}
type Form = ReturnType<typeof formDe>;

function ProjectCard({
  project,
  detalhado,
  canEdit,
  canDelete,
  clientes,
  tenantName,
  nomeDoCliente,
  docs,
  r2,
  tenantCodigoMunicipio,
  registrosDePonto,
  orcadoRealizado,
}: {
  project: Project;
  detalhado: boolean;
  canEdit: boolean;
  canDelete: boolean;
  clientes: ClienteOpt[];
  tenantName: string;
  nomeDoCliente: Map<string, string>;
  docs: ProjetoDoc[];
  r2: boolean;
  tenantCodigoMunicipio?: string | null;
  registrosDePonto: number;
  orcadoRealizado?: ReactNode;
}) {
  const inicial = useMemo(() => formDe(project), [project]);
  const [f, setF] = useState<Form>(inicial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(inicial);
  // Prompt B2 (como o D2): alteração não salva pede confirmação ao sair.
  useAvisoAoSair(canEdit && dirty);
  const off = !canEdit || pending;
  // Proposta do assistente (Prompt B, 26): entra SÓ no formulário; gravar é o
  // Salvar do usuário, que leva `origem: "assistente"` ao log. Sem permissão
  // de editar nada é aplicado (e a action recusa de novo no servidor).
  const [daProposta, setDaProposta] = useState<string[]>([]);
  // Prompt B2 — "mudar o projeto" por comando: a Cris preenche o cartão aberto;
  // o Salvar grava, com origem "assistente" no log (mesmo caminho do Prompt B).
  // Só o projeto aberto (?proj=): na lista, cada cartão somaria campos demais.
  useCrisFormulario(canEdit && detalhado ? formularioDoProjeto({ id: project.id, nome: project.name }, detalhado) : null, (p) => {
    const v = valoresParaOCadastro(p.valores, detalhado);
    const campos = Object.keys(v);
    if (!campos.length) return;
    setF((s) => ({ ...s, ...v }));
    setDaProposta((x) => [...new Set([...x, ...campos])]);
  });
  useEffect(() => {
    if (!detalhado || !canEdit) return;
    const aplicar = (g: PropostaDeProjetoGuardada | null) => {
      if (!g || g.projectId !== project.id) return;
      const campos = Object.keys(g.campos) as CampoProjeto[];
      if (campos.length === 0) return;
      setF((s) => ({ ...s, ...g.campos }));
      setDaProposta(campos);
      try {
        window.sessionStorage.removeItem(CHAVE_PROPOSTA_PROJETO);
      } catch {
        /* sem sessionStorage */
      }
    };
    try {
      const bruto = window.sessionStorage.getItem(CHAVE_PROPOSTA_PROJETO);
      if (bruto) aplicar(JSON.parse(bruto) as PropostaDeProjetoGuardada);
    } catch {
      /* ignora proposta ilegível */
    }
    const ouvir = (e: Event) => aplicar((e as CustomEvent<PropostaDeProjetoGuardada>).detail ?? null);
    window.addEventListener(EVENTO_PROPOSTA_PROJETO, ouvir);
    return () => window.removeEventListener(EVENTO_PROPOSTA_PROJETO, ouvir);
  }, [detalhado, canEdit, project.id]);

  const janela = duracaoDerivada(f.startDate, f.endDate);
  const avisoDuracao = avisoDeDuracao(project.durationMonths, f.startDate, f.endDate);
  const recusaDatas = (f.startDate !== inicial.startDate || f.endDate !== inicial.endDate) ? recusaDasDatas(f.startDate, f.endDate) : null;
  const global = valorGlobal(f);
  const avisoMunicipio = avisoDeMunicipio(f.municipioObra, f.ufObra, f.codigoMunicipioObra);
  const mexeuCoordenada = f.latitude !== inicial.latitude || f.longitude !== inicial.longitude;
  const avisoPonto = mexeuCoordenada ? avisoDeCoordenada(registrosDePonto) : null;
  const cliente = project.clienteId ? nomeDoCliente.get(project.clienteId) ?? "cliente" : `próprio (${tenantName})`;

  const save = () =>
    start(async () => {
      const patch = {
        name: f.name,
        startDate: f.startDate,
        endDate: f.endDate,
        clienteId: f.clienteId,
        valorConstrucao: f.valorConstrucao || null,
        valorTerreno: f.valorTerreno || null,
        metragem: f.metragem || null,
        custoConstrucao: f.custoConstrucao || null,
        custoTerreno: f.custoTerreno || null,
        financiamentoConstrucao: f.financiamentoConstrucao || null,
        financiamentoTerreno: f.financiamentoTerreno || null,
        recursosProprios: f.recursosProprios || null,
        proprietarioTerreno: f.proprietarioTerreno || null,
        formaPagamentoTerreno: f.formaPagamentoTerreno || null,
        terrenoForaCaixa: f.terrenoForaCaixa,
        // Localização só é editada na visão do projeto (seção 22); na visão
        // Todos esses campos não vão no patch, e o servidor não os toca.
        ...(detalhado
          ? {
              endereco: f.endereco || null,
              cep: f.cep || null,
              municipioObra: f.municipioObra || null,
              ufObra: f.ufObra || null,
              codigoMunicipioObra: f.codigoMunicipioObra || null,
              latitude: f.latitude || null,
              longitude: f.longitude || null,
              codigoObra: f.codigoObra || null,
              art: f.art || null,
            }
          : {}),
      };
      const r = await updateProject(project.id, patch, daProposta.length > 0 ? { origem: "assistente" } : undefined);
      setMsg(r.ok ? { ok: true, texto: r.aviso ?? (daProposta.length > 0 ? "Salvo, com os campos propostos pelo assistente." : "Salvo.") } : { ok: false, texto: r.error });
      if (r.ok) setDaProposta([]);
    });

  const campoMoney = (k: keyof Form, label: string) => (
    <div>
      <Label>{label}</Label>
      <MoneyInput value={f[k] as string} onChange={set(k) as (v: string) => void} disabled={off} placeholder="não informado" aria-label={label} />
    </div>
  );

  return (
    <Card className={detalhado ? "" : "scroll-mt-20"}>
      <CardContent className="space-y-3 p-4">
        {/* Cabeçalho compacto (seção 8): nome, situação, cliente, receita prevista, duração, datas, [...] */}
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-surface2)] text-[var(--color-accent2)]"><Building2 size={16} aria-hidden /></span>
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">
            {detalhado ? project.name : <Link href={`/projeto?proj=${project.id}`} className="hover:underline">{project.name}</Link>}
          </h3>
          <BadgeSituacao situacao={project.situacao} />
          <span className="text-[12px] text-[var(--color-ink2)]">
            {cliente}
            {global > 0 ? <> · receita prevista <strong className="font-[family-name:var(--font-mono)] text-[var(--color-ink)]">{brl(global)}</strong></> : <> · <span className="text-[var(--color-ink4)]">sem receita prevista</span></>}
            {" · "}
            {janela != null ? `Duração: ${janela} competência(s)` : "Duração: sem datas"}
            {project.startDate && <> · Início: {dateBR(project.startDate)}</>}
            {project.endDate && <> · Fim: {dateBR(project.endDate)}</>}
          </span>
          <div className="ml-auto"><MenuAcoes projectId={project.id} nome={project.name} detalhado={detalhado} /></div>
        </header>

        {daProposta.length > 0 && (
          <p role="status" data-proposta-aplicada className="rounded-[10px] border border-[#e9d5ff] bg-[#faf5ff] px-3 py-2 text-[12px] text-[var(--color-ink)]">
            <strong className="text-[#6D4BD1]">Proposta do assistente no formulário:</strong> {daProposta.map((c) => ROTULO_CAMPO_PROJETO[c as CampoProjeto] ?? rotuloDoCampoDoCadastro(c)).join(", ")}. Confira e clique em Salvar — nada foi gravado ainda.
          </p>
        )}

        {/* DADOS DO PROJETO (seção 9) */}
        <Bloco tom="neutro" titulo="Dados do projeto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <Label>Nome do projeto</Label>
              <Input value={f.name} onChange={(e) => set("name")(e.target.value)} disabled={off} aria-label="Nome do projeto" />
            </div>
            <div className="sm:col-span-2">
              <Label>Duração (competências)</Label>
              <div className="flex h-9 items-center rounded-[8px] border border-dashed border-[var(--color-line)] bg-[var(--color-surface2)] px-3 text-sm text-[var(--color-ink)]" aria-label="Duração derivada das datas">
                {janela != null ? `${janela} meses` : <span className="text-[var(--color-ink4)]">sem datas</span>}
              </div>
              <Aviso texto={avisoDuracao} />
            </div>
            <div className="sm:col-span-1">
              <Label>Data de início</Label>
              <DateField value={f.startDate} onChange={set("startDate")} disabled={off} />
            </div>
            <div className="sm:col-span-1">
              <Label>Data de fim</Label>
              <DateField value={f.endDate} onChange={set("endDate")} disabled={off} />
              <Aviso texto={recusaDatas} tom="danger" />
            </div>
            <div className="sm:col-span-1">
              <Label>Status</Label>
              <SituacaoControl projectId={project.id} situacao={project.situacao ?? null} canEdit={canEdit} />
            </div>
            <div className="sm:col-span-1">
              {/* Enum antigo (Planejamento / Em andamento), preservado e visível (seção 6). */}
              <Label>Fase (legado)</Label>
              <div className="flex h-9 items-center rounded-[8px] border border-dashed border-[var(--color-line)] bg-[var(--color-surface2)] px-3 text-sm text-[var(--color-ink2)]" aria-label="Fase (legado)">
                {project.status}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Cliente</Label>
              <ClienteSelect clientes={clientes} tenantName={tenantName} value={f.clienteId} onChange={set("clienteId")} disabled={off} />
            </div>
          </div>
        </Bloco>

        {/* Visão do projeto: LOCALIZAÇÃO à esquerda, ORÇADO x REALIZADO à direita (seções 17–19) */}
        {detalhado && (
          <div className={`grid grid-cols-1 gap-3 ${orcadoRealizado ? "xl:grid-cols-2" : ""}`}>
            <Bloco tom="localizacao" titulo="Localização do projeto" subtitulo="Local de prestação do serviço (área de estudo, campo ou intervenção)">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-3">
                  <Label>Endereço</Label>
                  <Input value={f.endereco} onChange={(e) => set("endereco")(e.target.value)} disabled={off} aria-label="Endereço" />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input value={f.cep} onChange={(e) => set("cep")(e.target.value)} disabled={off} placeholder="00000-000" inputMode="numeric" aria-label="CEP" />
                </div>
                <div className="col-span-2">
                  <Label>Município</Label>
                  <Input value={f.municipioObra} onChange={(e) => set("municipioObra")(e.target.value)} disabled={off} aria-label="Município" />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input value={f.ufObra} onChange={(e) => set("ufObra")(e.target.value)} maxLength={2} disabled={off} aria-label="UF" />
                </div>
                <div>
                  <Label>Código IBGE (fiscal)</Label>
                  <Input value={f.codigoMunicipioObra} onChange={(e) => set("codigoMunicipioObra")(e.target.value)} placeholder="7 dígitos" disabled={off} aria-label="Código IBGE do município" />
                </div>
                <div>
                  <Label>Latitude</Label>
                  <Input value={f.latitude} onChange={(e) => set("latitude")(e.target.value)} disabled={off} placeholder="-23.5505" aria-label="Latitude" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input value={f.longitude} onChange={(e) => set("longitude")(e.target.value)} disabled={off} placeholder="-46.6333" aria-label="Longitude" />
                </div>
                <div>
                  <Label>ART / RRT</Label>
                  <Input value={f.art} onChange={(e) => set("art")(e.target.value)} maxLength={15} disabled={off} aria-label="ART / RRT" />
                </div>
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--color-ink3)]">
                <strong>Efeito fiscal:</strong> para alguns serviços, o ISS é devido no município onde o serviço é executado (LC 116/2003, art. 3º). A NFS-e usa o <strong>código IBGE</strong>, não o nome. Coordenadas delimitam o raio da presença de campo do projeto ({project.pontoRaioMetros} m).
              </p>
              <Aviso texto={avisoMunicipio} />
              <Aviso texto={avisoPonto} tom="info" />
              <div className="mt-2 border-t border-[var(--color-line)] pt-2 text-[12px]">
                <ObraIncidencia codigoObra={f.codigoMunicipioObra} codigoSede={tenantCodigoMunicipio} />
              </div>
            </Bloco>
            {orcadoRealizado}
          </div>
        )}

        {/* RECEITAS (10) antes de CUSTOS (11); ESTRUTURA FINANCEIRA (12) */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Bloco tom="receita" titulo="Receita prevista" subtitulo="Base da linha “Receitas do Projeto” no Orçamento. O valor contratado, medido e faturado vem dos contratos.">
            <div className="grid grid-cols-2 gap-3">
              {campoMoney("valorConstrucao", "Receita prevista do projeto")}
              {Number(f.valorTerreno || 0) > 0 && (
                <p className="col-span-2 text-[11.5px] text-[var(--color-ink3)]" data-legado-terreno>
                  Este projeto tem um valor de terreno de {brl(Number(f.valorTerreno))} herdado do cadastro anterior (incorporação); ele continua no total do Orçamento enquanto não for zerado.
                </p>
              )}
            </div>
          </Bloco>
          <Bloco tom="custo" titulo="Custo previsto" subtitulo="Estimativa de custo para a execução do projeto (o realizado vem das despesas).">
            <div className="grid grid-cols-2 gap-3">
              {campoMoney("custoConstrucao", "Custo previsto do projeto")}
            </div>
          </Bloco>
        </div>
        {/* Growth Ambiental: a estrutura de financiamento da incorporação (terreno,
            financiamento da construção, proprietário do terreno, área construída)
            saiu do cadastro. Os valores já gravados continuam no banco e nos
            cálculos de sempre — nada é apagado. */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
          <span className="text-[var(--color-ink3)]">
            Receita prevista: <strong className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">{global > 0 ? brl(global) : "—"}</strong>
          </span>
        </div>

        <ProjetoDocs projectId={project.id} docs={docs} canEdit={canEdit} r2={r2} />

        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <Button size="sm" disabled={pending || !dirty || !!recusaDatas} onClick={save}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          )}
          <Resultado msg={msg} />
          {detalhado && (
            <Link href="/projeto?proj=all" className="ml-auto text-[12.5px] text-[var(--color-ink3)] hover:underline">
              Voltar
            </Link>
          )}
        </div>
        {detalhado && canDelete && <ZonaDeExclusao projectId={project.id} nome={project.name} />}
      </CardContent>
    </Card>
  );
}

/* ─── sede / filial (centro de custo) ────────────────────────────────── */

function OfficeCard({ project, detalhado, canEdit, canDelete }: { project: Project; detalhado: boolean; canEdit: boolean; canDelete: boolean }) {
  const [name, setName] = useState(project.name);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const dirty = name.trim() !== project.name;

  const save = () =>
    start(async () => {
      const r = await updateProject(project.id, { name });
      setMsg(r.ok ? { ok: true, texto: r.aviso ?? "Salvo." } : { ok: false, texto: r.error });
    });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-surface2)] text-[var(--color-ink2)]"><Building2 size={16} aria-hidden /></span>
          <h3 className="text-[15px] font-semibold text-[var(--color-ink)]">{project.name}</h3>
          <Badge tone="neutral">Matriz/Filial</Badge>
          <BadgeSituacao situacao={project.situacao} />
          <div className="ml-auto"><MenuAcoes projectId={project.id} nome={project.name} detalhado={detalhado} /></div>
        </header>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Nome da sede / filial</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit || pending} aria-label="Nome da unidade" />
          </div>
          <div className="sm:w-44">
            <Label>Status</Label>
            <SituacaoControl projectId={project.id} situacao={project.situacao ?? null} canEdit={canEdit} />
          </div>
          {canEdit && (
            <Button size="sm" disabled={pending || !dirty} onClick={save}>
              Salvar
            </Button>
          )}
          <Resultado msg={msg} />
        </div>
        {detalhado && canDelete && <ZonaDeExclusao projectId={project.id} nome={project.name} />}
      </CardContent>
    </Card>
  );
}

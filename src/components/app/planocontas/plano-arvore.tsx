"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { CATEGORIAS_DRE } from "@/lib/calc/constants";
import { categoriasPermitidasDaConta } from "@/lib/categoria-do-plano";
import { CLASSES_GERENCIAIS, ROTULO_CLASSE, ROTULO_TIPO_CUSTO, classePadrao, classesPermitidas, contasSemelhantes, normalizar, type ClasseGerencial } from "@/lib/planocontas-regras";
import {
  definirSituacaoDaConta,
  duplicarGrupoDoPlano,
  excluirConta,
  excluirGrupoDoPlano,
  moverNaOrdem,
  salvarConta,
  salvarGrupoDoPlano,
  usoDaContaPorDimensao,
  type Impacto,
  type UsoPorDimensao,
} from "@/lib/actions/planocontas-estrutura";
import { Mensagem, useAcao, brl } from "@/components/app/contratos/comum";
import { FerramentasDoPlano } from "./plano-ferramentas";

export interface GrupoDaTela {
  id: string;
  code: string;
  name: string;
  descricao: string | null;
  parentId: string | null;
  kind: string;
  ordem: number;
}
export interface ContaDaTela {
  id: string;
  code: string;
  name: string;
  descricao: string | null;
  groupCode: string;
  natureza: "receita" | "despesa";
  ativo: boolean;
  categoria: string;
  categoriaEscolhida: string | null;
  categoriaPadrao: string;
  classe: ClasseGerencial;
  classeEscolhida: string | null;
  tipoCusto: string | null;
  papel: string | null;
  versao: number;
  ordem: number;
  uso: { despesas: number; valorAtual: number | null; orcamento: number; medicoes: number } | null;
}
export interface PermissoesDoPlano {
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  reclassificar: boolean;
}

const icone = "rounded px-1.5 py-0.5 text-[11.5px] text-[var(--color-ink3)] hover:bg-[var(--color-surface3)] hover:text-[var(--color-ink)] disabled:opacity-40";
const porOrdem = <T extends { ordem: number; code: string }>(a: T, b: T) => a.ordem - b.ordem || a.code.localeCompare(b.code, undefined, { numeric: true });
const EFEITO_CATEGORIA: Record<string, string> = {
  Receita: "soma na Receita (topo da DRE).",
  "Custo Variável": "reduz a Margem de Contribuição (custo que acompanha os projetos).",
  "Despesa Variável": "reduz a Margem de Contribuição (acompanha o faturamento: impostos, comissões).",
  "Custo Fixo": "reduz o EBITDA (estrutura técnica que existe com ou sem projeto).",
  "Despesa Fixa": "reduz o EBITDA (estrutura administrativa).",
  Retiradas: "reduz o EBITDA (pró-labore, distribuição).",
  Investimento: "abaixo do EBITDA (compra de bens duráveis).",
  Empréstimos: "abaixo do EBITDA (amortização de dívida).",
  "Despesas Financeiras": "abaixo do EBITDA (juros, multas, tarifas).",
};

/**
 * Plano de Contas em árvore: grupo → subgrupo → conta. Só a conta recebe
 * lançamento. Busca e filtros abrem os grupos que têm resultado.
 */
export function PlanoArvore({ grupos, contas, perms, comUso }: { grupos: GrupoDaTela[]; contas: ContaDaTela[]; perms: PermissoesDoPlano; comUso: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  const [busca, setBusca] = useState("");
  const [natureza, setNatureza] = useState("");
  const [categoria, setCategoria] = useState("");
  const [classe, setClasse] = useState("");
  const [situacao, setSituacao] = useState("ativas");
  const [raiz, setRaiz] = useState("");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [editorGrupo, setEditorGrupo] = useState<{ grupo?: GrupoDaTela; pai?: string | null } | null>(null);
  const [editorConta, setEditorConta] = useState<{ conta?: ContaDaTela; grupoCode?: string } | null>(null);

  const filtrando = !!(busca.trim() || natureza || categoria || classe || situacao !== "ativas" || raiz);
  const filhos = (id: string | null) => grupos.filter((g) => (g.parentId ?? null) === id).sort(porOrdem);
  const raizDe = (g: GrupoDaTela): GrupoDaTela => (g.parentId ? raizDe(grupos.find((x) => x.id === g.parentId) ?? g) : g);
  const t = normalizar(busca);
  const passa = (c: ContaDaTela) => {
    if (situacao === "ativas" && !c.ativo) return false;
    if (situacao === "inativas" && c.ativo) return false;
    if (natureza && c.natureza !== natureza) return false;
    if (categoria && c.categoria !== categoria) return false;
    if (classe && c.classe !== classe) return false;
    if (raiz) {
      const g = grupos.find((x) => x.code === c.groupCode);
      if (!g || raizDe(g).id !== raiz) return false;
    }
    if (t && !normalizar(`${c.code} ${c.name} ${c.descricao ?? ""} ${c.groupCode}`).includes(t)) return false;
    return true;
  };
  const visiveis = useMemo(() => new Set(contas.filter(passa).map((c) => c.id)), [contas, busca, natureza, categoria, classe, situacao, raiz, grupos]); // eslint-disable-line react-hooks/exhaustive-deps
  const contasDo = (code: string) => contas.filter((c) => c.groupCode === code && visiveis.has(c.id)).sort(porOrdem);
  const temAlgo = (g: GrupoDaTela): boolean => contasDo(g.code).length > 0 || filhos(g.id).some(temAlgo) || (!filtrando && true);
  const aberto = (g: GrupoDaTela) => (filtrando ? temAlgo(g) : abertos.has(g.id));
  const alternar = (id: string) => setAbertos((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
  const nivel = (g: GrupoDaTela): number => (g.parentId ? 1 + nivel(grupos.find((x) => x.id === g.parentId)!) : 1);

  const linhaConta = (c: ContaDaTela, recuo: number, irmas: ContaDaTela[], k: number) => (
    <tr key={c.id} className={`border-t border-[var(--color-line)]/70 ${c.ativo ? "" : "opacity-55"}`} data-conta={c.code}>
      <td className="whitespace-nowrap px-2 py-1.5 font-[family-name:var(--font-mono)] text-[12px]" style={{ paddingLeft: 8 + recuo * 16 }}>
        {c.code}
      </td>
      <td className="px-2 py-1.5">
        <span>{c.name}</span>
        {c.papel && <span className="ml-2 rounded bg-[var(--color-surface3)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-ink2)]" title="Conta usada por regra do sistema">sistema</span>}
        {!c.ativo && <span className="ml-2 text-[10.5px] text-[var(--color-ink3)]">inativa</span>}
        {c.descricao && <span className="block text-[11px] text-[var(--color-ink3)]">{c.descricao}</span>}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-[12px]" title={c.categoriaEscolhida ? "Categoria escolhida para a conta" : "Categoria padrão do sistema"}>
        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${c.natureza === "receita" ? "bg-[#0F8A5F]" : "bg-[#C0334A]"}`} aria-label={c.natureza} />
        {c.categoria}
        {!c.categoriaEscolhida && <span className="text-[10.5px] text-[var(--color-ink3)]">*</span>}
      </td>
      <td className="px-2 py-1.5 text-[12px]">{ROTULO_CLASSE[c.classe]}</td>
      <td className="px-2 py-1.5 text-[12px]">{c.tipoCusto ? ROTULO_TIPO_CUSTO[c.tipoCusto as "direto"] : "—"}</td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right text-[11.5px] text-[var(--color-ink3)]" title={c.uso ? `${c.uso.despesas} lançamento(s) · ${c.uso.orcamento} linha(s) de Orçamento · ${c.uso.medicoes} medição(ões)` : undefined}>
        {c.uso ? (c.uso.despesas || c.uso.orcamento ? `${c.uso.despesas} / ${c.uso.orcamento}` : "—") : ""}
      </td>
      <td className="whitespace-nowrap px-1 py-1.5 text-right">
        {perms.editar && (
          <>
            <button type="button" className={icone} onClick={() => setEditorConta({ conta: c })}>
              editar
            </button>
            <button type="button" className={icone} disabled={pendente || k === 0} onClick={() => rodar(() => moverNaOrdem({ tipo: "conta", id: c.id, direcao: "cima" }), "Reordenado.")} aria-label={`Subir ${c.code}`}>
              ↑
            </button>
            <button type="button" className={icone} disabled={pendente || k === irmas.length - 1} onClick={() => rodar(() => moverNaOrdem({ tipo: "conta", id: c.id, direcao: "baixo" }), "Reordenado.")} aria-label={`Descer ${c.code}`}>
              ↓
            </button>
            <button type="button" className={icone} disabled={pendente} onClick={() => rodar(() => definirSituacaoDaConta(c.id, !c.ativo), c.ativo ? "Conta inativada: some de lançamentos novos; o histórico fica." : "Conta reativada.")}>
              {c.ativo ? "inativar" : "reativar"}
            </button>
          </>
        )}
        {perms.excluir && !c.papel && (!c.uso || (!c.uso.despesas && !c.uso.orcamento && !c.uso.medicoes)) && (
          <button type="button" className={icone} disabled={pendente} onClick={() => window.confirm(`Excluir a conta ${c.code}? Só é possível porque ela não tem nenhum uso.`) && rodar(() => excluirConta(c.id), "Conta excluída.")}>
            excluir
          </button>
        )}
      </td>
    </tr>
  );

  const blocoGrupo = (g: GrupoDaTela, irmaos: GrupoDaTela[], k: number): React.ReactNode => {
    if (filtrando && !temAlgo(g)) return null;
    const n = nivel(g);
    const sub = filhos(g.id);
    const minhas = contasDo(g.code);
    const total = contas.filter((c) => c.groupCode === g.code).length;
    const abre = aberto(g);
    return (
      <Fragment key={g.id}>
        <tr className={`border-t border-[var(--color-line)] ${n === 1 ? "bg-[var(--color-surface2)]" : "bg-[var(--color-surface2)]/40"}`} data-grupo={g.code}>
          <td className="whitespace-nowrap px-2 py-1.5 font-[family-name:var(--font-mono)] text-[12px] font-semibold" style={{ paddingLeft: 8 + (n - 1) * 16 }}>
            <button type="button" className="mr-1 text-[var(--color-ink3)]" onClick={() => alternar(g.id)} aria-expanded={abre} aria-label={`${abre ? "Recolher" : "Expandir"} ${g.name}`}>
              {abre ? "▾" : "▸"}
            </button>
            {g.code}
          </td>
          <td className="px-2 py-1.5" colSpan={5}>
            <button type="button" className={`text-left ${n === 1 ? "font-semibold" : "font-medium"}`} onClick={() => alternar(g.id)}>
              {g.name}
            </button>
            <span className="ml-2 text-[11px] text-[var(--color-ink3)]">
              {n === 1 ? "grupo" : "subgrupo"} · {total} conta(s){sub.length ? ` · ${sub.length} subgrupo(s)` : ""}
              {g.kind === "cef" ? " · custo direto" : ""}
            </span>
            {g.descricao && abre && <span className="block text-[11px] text-[var(--color-ink3)]">{g.descricao}</span>}
          </td>
          <td className="whitespace-nowrap px-1 py-1.5 text-right">
            {perms.criar && (
              <button type="button" className={icone} onClick={() => setEditorConta({ grupoCode: g.code })}>
                + conta
              </button>
            )}
            {perms.criar && n < 3 && (
              <button type="button" className={icone} onClick={() => setEditorGrupo({ pai: g.id })}>
                + subgrupo
              </button>
            )}
            {perms.editar && (
              <>
                <button type="button" className={icone} onClick={() => setEditorGrupo({ grupo: g })}>
                  editar
                </button>
                <button type="button" className={icone} disabled={pendente || k === 0} onClick={() => rodar(() => moverNaOrdem({ tipo: "grupo", id: g.id, direcao: "cima" }), "Reordenado.")} aria-label={`Subir ${g.code}`}>
                  ↑
                </button>
                <button type="button" className={icone} disabled={pendente || k === irmaos.length - 1} onClick={() => rodar(() => moverNaOrdem({ tipo: "grupo", id: g.id, direcao: "baixo" }), "Reordenado.")} aria-label={`Descer ${g.code}`}>
                  ↓
                </button>
              </>
            )}
            {perms.criar && !sub.length && (
              <button
                type="button"
                className={icone}
                disabled={pendente}
                onClick={() => {
                  const novo = window.prompt(`Código do grupo novo (cópia de ${g.code} — ${g.name}):`);
                  if (!novo) return;
                  const nome = window.prompt("Nome do grupo novo:", `${g.name} (cópia)`);
                  if (nome) rodar(() => duplicarGrupoDoPlano({ id: g.id, novoCodigo: novo, novoNome: nome }), "Grupo duplicado com as contas.");
                }}
              >
                duplicar
              </button>
            )}
            {perms.excluir && !sub.length && !total && (
              <button type="button" className={icone} disabled={pendente} onClick={() => window.confirm(`Excluir o grupo ${g.code}?`) && rodar(() => excluirGrupoDoPlano(g.id), "Grupo excluído.")}>
                excluir
              </button>
            )}
          </td>
        </tr>
        {abre && (
          <>
            {sub.map((x, i) => blocoGrupo(x, sub, i))}
            {minhas.map((c, i) => linhaConta(c, n, minhas, i))}
          </>
        )}
      </Fragment>
    );
  };

  const raizes = filhos(null);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Input className="h-9 w-[240px]" placeholder="Buscar por código, nome ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar conta" />
        <Select className="h-9 w-[170px]" value={raiz} onChange={(e) => setRaiz(e.target.value)} aria-label="Filtrar por grupo">
          <option value="">Todos os grupos</option>
          {raizes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.code} — {g.name}
            </option>
          ))}
        </Select>
        <Select className="h-9 w-[130px]" value={natureza} onChange={(e) => setNatureza(e.target.value)} aria-label="Filtrar por natureza">
          <option value="">Natureza</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </Select>
        <Select className="h-9 w-[170px]" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoria DRE">
          <option value="">Categoria DRE</option>
          {CATEGORIAS_DRE.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select className="h-9 w-[200px]" value={classe} onChange={(e) => setClasse(e.target.value)} aria-label="Filtrar por classe gerencial">
          <option value="">Classe gerencial</option>
          {CLASSES_GERENCIAIS.map((c) => (
            <option key={c} value={c}>
              {ROTULO_CLASSE[c]}
            </option>
          ))}
        </Select>
        <Select className="h-9 w-[120px]" value={situacao} onChange={(e) => setSituacao(e.target.value)} aria-label="Filtrar por situação">
          <option value="ativas">Ativas</option>
          <option value="inativas">Inativas</option>
          <option value="todas">Todas</option>
        </Select>
        <Button size="sm" variant="ghost" onClick={() => setAbertos(new Set(grupos.map((g) => g.id)))}>
          Expandir tudo
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAbertos(new Set())}>
          Recolher tudo
        </Button>
        {perms.criar && (
          <Button size="sm" onClick={() => setEditorGrupo({ pai: null })}>
            + Grupo
          </Button>
        )}
      </div>
      <FerramentasDoPlano perms={perms} contas={contas.map((c) => ({ code: c.code, name: c.name, ativo: c.ativo, natureza: c.natureza }))} />
      <div className="overflow-x-auto rounded-[12px] border border-[var(--color-line)] bg-white">
        <table className="w-full min-w-[980px] text-[13px]" data-testid="arvore-plano">
          <thead className="text-left text-[10.5px] uppercase tracking-[0.06em] text-[var(--color-ink3)]">
            <tr>
              <th className="px-2 py-2">Código</th>
              <th className="px-2 py-2">Conta</th>
              <th className="px-2 py-2">Categoria DRE</th>
              <th className="px-2 py-2">Classe gerencial</th>
              <th className="px-2 py-2">Custo</th>
              <th className="px-2 py-2 text-right" title="lançamentos / linhas de orçamento">Uso</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {raizes.map((g, i) => blocoGrupo(g, raizes, i))}
            {filtrando && visiveis.size === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--color-ink3)]">
                  Nenhuma conta com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-[var(--color-ink3)]">* categoria padrão do sistema (não escolhida na conta). Uso = lançamentos / linhas de orçamento.{comUso ? "" : " O uso aparece para quem vê Despesas ou Orçamentos."}</p>
      <Mensagem msg={msg} />
      {editorGrupo && <EditorDeGrupo key={editorGrupo.grupo?.id ?? `novo:${editorGrupo.pai}`} grupos={grupos} grupo={editorGrupo.grupo} pai={editorGrupo.pai ?? null} fechar={() => setEditorGrupo(null)} />}
      {editorConta && <EditorDeConta key={editorConta.conta?.id ?? `nova:${editorConta.grupoCode}`} grupos={grupos} contas={contas} conta={editorConta.conta} grupoCode={editorConta.grupoCode} perms={perms} fechar={() => setEditorConta(null)} />}
    </div>
  );
}

function Painel({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" role="dialog" aria-label={titulo} onClick={fechar}>
      <div className="h-full w-full max-w-[560px] overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{titulo}</h3>
          <Button size="sm" variant="ghost" onClick={fechar}>
            Fechar
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Campo({ rotulo, dica, children, span }: { rotulo: string; dica?: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={`block text-[12px] text-[var(--color-ink2)] ${span ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block">{rotulo}</span>
      {children}
      {dica && <span className="mt-0.5 block text-[11px] text-[var(--color-ink3)]">{dica}</span>}
    </label>
  );
}

function EditorDeGrupo({ grupos, grupo, pai, fechar }: { grupos: GrupoDaTela[]; grupo?: GrupoDaTela; pai: string | null; fechar: () => void }) {
  const { rodar, pendente, msg } = useAcao();
  const [f, setF] = useState({ code: grupo?.code ?? "", name: grupo?.name ?? "", descricao: grupo?.descricao ?? "", parentId: grupo ? (grupo.parentId ?? "") : (pai ?? ""), kind: grupo?.kind ?? "complementar" });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Painel titulo={grupo ? `Editar grupo ${grupo.code}` : f.parentId ? "Novo subgrupo" : "Novo grupo"} fechar={fechar}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo rotulo="Código" dica="Código com uso no Orçamento/Medição não muda.">
          <Input value={f.code} onChange={(e) => set("code", e.target.value)} />
        </Campo>
        <Campo rotulo="Nome">
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Campo>
        <Campo rotulo="Grupo superior" span dica="Mover um grupo só reorganiza: lançamentos e Orçamento continuam ligados aos mesmos códigos.">
          <Select value={f.parentId} onChange={(e) => set("parentId", e.target.value)}>
            <option value="">— nenhum (grupo de 1º nível) —</option>
            {grupos
              .filter((g) => g.id !== grupo?.id)
              .sort(porOrdem)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code} — {g.name}
                </option>
              ))}
          </Select>
        </Campo>
        {!grupo && !f.parentId && (
          <Campo rotulo="Bloco" span dica="Custo direto dos projetos entra no bloco de custo do Orçamento e na Medição.">
            <Select value={f.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="complementar">Estrutura / receitas / outras</option>
              <option value="cef">Custos diretos dos projetos</option>
            </Select>
          </Campo>
        )}
        <Campo rotulo="Descrição (opcional)" span>
          <Input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} />
        </Campo>
      </div>
      <Button className="mt-4" disabled={pendente || !f.code.trim() || !f.name.trim()} onClick={() => rodar(() => salvarGrupoDoPlano({ id: grupo?.id ?? null, ...f, parentId: f.parentId || null }), "Grupo salvo.", () => !grupo && fechar())}>
        Salvar
      </Button>
      <Mensagem msg={msg} />
    </Painel>
  );
}

function EditorDeConta({ grupos, contas, conta, grupoCode, perms, fechar }: { grupos: GrupoDaTela[]; contas: ContaDaTela[]; conta?: ContaDaTela; grupoCode?: string; perms: PermissoesDoPlano; fechar: () => void }) {
  const { rodar, pendente, msg, setMsg } = useAcao();
  const grupoInicial = conta?.groupCode ?? grupoCode ?? "";
  const irmas = contas.filter((c) => c.groupCode === grupoInicial);
  const exemplo = irmas[0];
  const [f, setF] = useState({
    code: conta?.code ?? "",
    name: conta?.name ?? "",
    descricao: conta?.descricao ?? "",
    grupoCode: grupoInicial,
    natureza: conta?.natureza ?? exemplo?.natureza ?? "despesa",
    dreCategory: conta ? (conta.categoriaEscolhida ?? "") : (exemplo?.categoriaEscolhida ?? ""),
    classeGerencial: conta ? (conta.classeEscolhida ?? "") : (exemplo?.classeEscolhida ?? ""),
    tipoCusto: conta ? (conta.tipoCusto ?? "") : (exemplo?.tipoCusto ?? ""),
  });
  const [avancado, setAvancado] = useState(false);
  const [impacto, setImpacto] = useState<Impacto | null>(null);
  const [usoDim, setUsoDim] = useState<UsoPorDimensao | null>(null);
  const [erroDim, setErroDim] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => {
    setImpacto(null);
    setF((x) => ({ ...x, [k]: v }));
  };
  const categoriaEfetiva = f.dreCategory || (f.natureza === "receita" ? "Receita" : conta?.categoriaPadrao ?? "Despesa Fixa");
  const classeEfetiva = (f.classeGerencial || classePadrao(categoriaEfetiva)) as ClasseGerencial;
  const parecidas = !conta && f.name.trim().length > 3 ? contasSemelhantes(f.name, contas.filter((c) => c.natureza === f.natureza)) : [];
  const usada = !!conta?.uso && conta.uso.despesas + conta.uso.orcamento + conta.uso.medicoes > 0;
  const salvar = (confirmar = false) =>
    rodar(
      async () => {
        const r = await salvarConta({ id: conta?.id ?? null, versao: conta?.versao ?? null, ...f, confirmar });
        if (!r.ok && "precisaConfirmar" in r && r.precisaConfirmar) {
          setImpacto(r.impacto);
          return { ok: false as const, error: r.error };
        }
        return r.ok ? r : { ok: false as const, error: r.error };
      },
      conta ? "Conta salva." : "Conta criada.",
      () => {
        setImpacto(null);
        if (!conta) fechar();
      },
    );
  const verUso = async () => {
    if (!conta) return;
    setErroDim(null);
    const r = await usoDaContaPorDimensao(conta.code);
    if (r.ok) setUsoDim(r.uso);
    else setErroDim(r.error);
  };
  return (
    <Painel titulo={conta ? `Conta ${conta.code}` : "Nova conta"} fechar={fechar}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome" span>
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
        </Campo>
        {parecidas.length > 0 && (
          <p className="rounded-[10px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12px] text-[#92400e] sm:col-span-2" role="status">
            Já existe conta parecida: {parecidas.map((p) => `${p.code} — ${p.name}`).join("; ")}. Use a existente se for a mesma coisa; se não for, pode criar.
          </p>
        )}
        <Campo rotulo="Código" dica={usada ? "Conta com lançamentos: o código é a referência deles e não muda." : "Único na empresa (entre contas e grupos)."}>
          <Input value={f.code} disabled={usada} onChange={(e) => set("code", e.target.value)} />
        </Campo>
        <Campo rotulo="Grupo">
          <Select value={f.grupoCode} onChange={(e) => set("grupoCode", e.target.value)}>
            <option value="">Escolha…</option>
            {grupos.sort(porOrdem).map((g) => (
              <option key={g.id} value={g.code}>
                {g.code} — {g.name}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Natureza">
          <Select value={f.natureza} disabled={!!conta?.uso?.despesas} onChange={(e) => setF((x) => ({ ...x, natureza: e.target.value as "receita" | "despesa", dreCategory: "", classeGerencial: "" }))}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </Select>
        </Campo>
        <Campo rotulo="Categoria da DRE" dica={`Na DRE, esta conta ${EFEITO_CATEGORIA[categoriaEfetiva] ?? ""}`}>
          <Select value={f.dreCategory} onChange={(e) => set("dreCategory", e.target.value)}>
            <option value="">Padrão do sistema{conta ? ` (${conta.categoriaPadrao})` : ""}</option>
            {categoriasPermitidasDaConta(f.natureza).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Descrição (opcional)" span dica="Explique quando usar: orienta quem lança e a Cris.">
          <Input value={f.descricao} onChange={(e) => set("descricao", e.target.value)} />
        </Campo>
      </div>
      <button type="button" className="mt-3 text-[12px] text-[var(--color-accent2)] hover:underline" onClick={() => setAvancado(!avancado)} aria-expanded={avancado}>
        {avancado ? "▾" : "▸"} Opções avançadas (DRE gerencial e custo direto/indireto)
      </button>
      {avancado && (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo rotulo="Classe gerencial" dica={`Linha da DRE gerencial: ${ROTULO_CLASSE[classeEfetiva]}.`}>
            <Select value={f.classeGerencial} onChange={(e) => set("classeGerencial", e.target.value)}>
              <option value="">Padrão pela categoria ({ROTULO_CLASSE[classePadrao(categoriaEfetiva)]})</option>
              {classesPermitidas(f.natureza).map((c) => (
                <option key={c} value={c}>
                  {ROTULO_CLASSE[c]}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo rotulo="Custo padrão" dica="Padrão da conta; cada lançamento pode tratar diferente.">
            <Select value={f.tipoCusto} onChange={(e) => set("tipoCusto", e.target.value)}>
              <option value="">Não se aplica</option>
              <option value="direto">Custo direto</option>
              <option value="indireto">Custo indireto</option>
            </Select>
          </Campo>
        </div>
      )}
      {impacto && (
        <div className="mt-3 rounded-[10px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] text-[#92400e]" role="alert">
          <p className="font-medium">Impacto da mudança na conta {impacto.conta}</p>
          <p>
            {impacto.despesas} lançamento(s) · R$ {impacto.valorAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} na versão Atual · {impacto.orcamento} linha(s) de Orçamento ·{" "}
            {impacto.versoesCongeladas} versão(ões) congelada(s)
          </p>
          <ul className="mt-1 list-disc pl-5">
            {impacto.mudancas.map((m) => (
              <li key={m}>{m}</li>
            ))}
            {impacto.efeitos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <Button size="sm" className="mt-2" disabled={pendente} onClick={() => salvar(true)}>
            Confirmo a mudança
          </Button>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button disabled={pendente || !f.name.trim() || !f.code.trim() || !f.grupoCode || (!conta && !perms.criar)} onClick={() => salvar(false)}>
          {conta ? "Salvar" : "Criar conta"}
        </Button>
        {impacto && (
          <Button variant="ghost" onClick={() => (setImpacto(null), setMsg(null))}>
            Cancelar
          </Button>
        )}
      </div>
      <Mensagem msg={msg} />
      {conta && (
        <div className="mt-5 border-t border-[var(--color-line)] pt-3 text-[12.5px]">
          <h4 className="mb-1 font-semibold">Onde a conta é usada</h4>
          {conta.uso ? (
            <p className="text-[var(--color-ink2)]">
              {conta.uso.despesas} lançamento(s) de despesa · {conta.uso.orcamento} linha(s) de Orçamento/Previsão · {conta.uso.medicoes} medição(ões)
            </p>
          ) : (
            <p className="text-[var(--color-ink3)]">Uso visível para quem vê Despesas ou Orçamentos.</p>
          )}
          <button type="button" className="mt-1 text-[12px] text-[var(--color-accent2)] hover:underline" onClick={verUso}>
            Ver por projeto, contrato, fase e custo direto/indireto
          </button>
          {erroDim && <p className="text-[var(--color-ink3)]">{erroDim}</p>}
          {usoDim && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="uso-por-dimensao">
              {(
                [
                  ["Projeto", usoDim.porProjeto.map((x) => [x.nome, x.valor] as const)],
                  ["Contrato", usoDim.porContrato.map((x) => [x.nome, x.valor] as const)],
                  ["Fase", usoDim.porFase.map((x) => [x.nome, x.valor] as const)],
                  ["Custo", usoDim.porTipoDeCusto.map((x) => [x.tipo === "direto" || x.tipo === "indireto" ? ROTULO_TIPO_CUSTO[x.tipo] : x.tipo, x.valor] as const)],
                ] as const
              ).map(([t, l]) => (
                <div key={t} className="rounded-[8px] border border-[var(--color-line)] p-2">
                  <p className="mb-1 text-[11px] font-medium uppercase text-[var(--color-ink3)]">{t}</p>
                  {l.length ? l.map(([n, v]) => <p key={n} className="flex justify-between gap-2"><span className="truncate">{n}</span><span>{brl(v)}</span></p>) : <p className="text-[var(--color-ink3)]">—</p>}
                </div>
              ))}
              <p className="text-[11px] text-[var(--color-ink3)] sm:col-span-2">Versão Atual, sem canceladas, só nos projetos que você vê. Total {brl(usoDim.total)}.</p>
            </div>
          )}
        </div>
      )}
    </Painel>
  );
}

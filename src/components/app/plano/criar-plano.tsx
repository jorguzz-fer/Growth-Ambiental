"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";
import { criarPlano } from "@/lib/actions/plano";
import { filtrarSelecao, propostaDaCris, type AtividadeSelecionada, type FaseSelecionada, type NoDeSelecao, type OrigemProposta } from "@/lib/plano-regras";
import { formularioDoPlanoDeTrabalho } from "@/lib/plano-cris";
import { PerguntarACris, useCrisFormulario } from "@/components/app/cris-contexto";
import { Mensagem, novaChave, useAcao } from "@/components/app/contratos/comum";

export interface ModeloParaEscolha {
  id: string;
  nome: string;
  biblioteca: boolean;
  arvore: FaseSelecionada[];
}
type Origem = "branco" | "biblioteca" | "cris";

const ROTULO_ORIGEM: Record<OrigemProposta, { texto: string; cor: string }> = {
  documento: { texto: "do documento", cor: "bg-[#dbeafe] text-[#1e40af]" },
  biblioteca: { texto: "da biblioteca", cor: "bg-[#d1fae5] text-[#065f46]" },
  sugestao: { texto: "sugestão da IA", cor: "bg-[#fef3c7] text-[#92400e]" },
  manual: { texto: "incluído por você", cor: "bg-[var(--color-surface3)] text-[var(--color-ink2)]" },
};
export function SeloDeOrigem({ origem }: { origem?: OrigemProposta }) {
  if (!origem) return null;
  const r = ROTULO_ORIGEM[origem];
  return <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium ${r.cor}`}>{r.texto}</span>;
}

let seq = 0;
const chaveNova = (p: string) => `${p}:${Date.now()}:${seq++}`;
const faseNova = (nome = ""): FaseSelecionada => ({ chave: chaveNova("nf"), nome, marcado: true, origem: "manual", atividades: [], entregas: [] });

/** Contagem do que será GRAVADO (só o marcado). */
function contar(fases: FaseSelecionada[]) {
  const s = filtrarSelecao(fases);
  return {
    fases: s.length,
    atividades: s.reduce((n, f) => n + f.atividades.length, 0),
    subatividades: s.reduce((n, f) => n + f.atividades.reduce((m, a) => m + a.subatividades.length, 0), 0),
    entregas: s.reduce((n, f) => n + f.entregas.length, 0),
  };
}

/**
 * Criação do plano (ou acréscimo ao existente): em branco, a partir da
 * biblioteca/modelos, ou pela Cris a partir de documento. Em todos os casos
 * a pessoa vê a árvore, marca e desmarca item a item, renomeia e inclui o que
 * faltar — e só o que estiver marcado é gravado.
 */
export function CriarPlano({ projectId, modelos, temPlano, podeCriar }: { projectId: string; modelos: ModeloParaEscolha[]; temPlano: boolean; podeCriar: boolean }) {
  const { rodar, pendente, msg, setMsg } = useAcao();
  const [aberto, setAberto] = useState(!temPlano);
  const [origem, setOrigem] = useState<Origem | null>(null);
  const [usados, setUsados] = useState<string[]>([]);
  const [fases, setFases] = useState<FaseSelecionada[]>([]);
  const [chave, setChave] = useState(novaChave);
  const [obsCris, setObsCris] = useState<string | null>(null);

  const bibliotecaPlana = useMemo(
    () => modelos.flatMap((m) => m.arvore.flatMap((f) => [{ id: f.origemModeloId!, nome: f.nome }, ...f.atividades.flatMap((a) => [{ id: a.origemModeloId!, nome: a.nome }, ...a.subatividades.map((s) => ({ id: s.origemModeloId!, nome: s.nome }))])])),
    [modelos],
  );
  const nomesDaBiblioteca = useMemo(() => [...new Set(modelos.filter((m) => m.biblioteca).flatMap((m) => m.arvore.map((f) => f.nome)))], [modelos]);
  const form = useMemo(() => formularioDoPlanoDeTrabalho(nomesDaBiblioteca), [nomesDaBiblioteca]);
  useCrisFormulario(podeCriar ? form : null, (p) => {
    // Só a biblioteca da empresa serve para casar nomes; nada é completado.
    setFases(propostaDaCris(p.valores, bibliotecaPlana));
    setOrigem("cris");
    setAberto(true);
    setObsCris(p.observacao || null);
    setMsg({ tom: "aviso", texto: "A Cris montou uma proposta a partir do documento. Confira a origem e o trecho de cada item, desmarque o que não quiser e só então grave: nada foi gravado ainda." });
  });

  const escolherOrigem = (o: Origem) => {
    setOrigem(o);
    setMsg(null);
    setObsCris(null);
    setUsados([]);
    setFases(o === "branco" ? [faseNova()] : []);
  };
  const alternarModelo = (m: ModeloParaEscolha) => {
    if (usados.includes(m.id)) {
      const chaves = new Set(m.arvore.map((f) => f.chave));
      setUsados(usados.filter((x) => x !== m.id));
      setFases(fases.filter((f) => !chaves.has(f.chave)));
    } else {
      setUsados([...usados, m.id]);
      const ja = new Set(fases.map((f) => f.chave));
      setFases([...fases, ...structuredClone(m.arvore).filter((f) => !ja.has(f.chave))]);
    }
  };

  const total = contar(fases);
  const gravar = () =>
    rodar(
      () => criarPlano({ projectId, origem: origem ?? "branco", chave, fases }),
      `Plano ${temPlano ? "atualizado" : "criado"}: ${total.fases} fase(s), ${total.atividades} atividade(s), ${total.subatividades} subatividade(s) e ${total.entregas} entrega(s).`,
      () => {
        setChave(novaChave());
        setOrigem(null);
        setFases([]);
        setUsados([]);
        setAberto(false);
      },
    );

  if (!podeCriar) return null;
  if (!aberto)
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
          + Acrescentar fases (em branco, biblioteca ou Cris)
        </Button>
        <Mensagem msg={msg} />
      </div>
    );

  return (
    <section className="mb-5 rounded-[14px] border border-[var(--color-line)] bg-white p-4" data-testid="criar-plano">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">{temPlano ? "Acrescentar ao plano" : "Montar o plano de trabalho"}</h2>
          <p className="text-[12.5px] text-[var(--color-ink3)]">O sistema sugere, a consultoria decide: nenhuma fase é obrigatória e só o que estiver marcado será gravado, como cópia editável deste projeto.</p>
        </div>
        {temPlano && (
          <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
            Fechar
          </Button>
        )}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(
          [
            ["branco", "Em branco", "Digite as suas fases e atividades."],
            ["biblioteca", "Da biblioteca ou de modelos", "Escolha um ou mais modelos e marque item a item."],
            ["cris", "Com a Cris, a partir de documento", "Anexe PDF ou DOCX (ou cole o texto) no chat da Cris."],
          ] as const
        ).map(([o, t, d]) => (
          <button key={o} type="button" onClick={() => escolherOrigem(o)} className={`rounded-[10px] border px-3 py-2 text-left ${origem === o ? "border-[var(--color-brand-segmento)] bg-[var(--color-brand-segmento)]/10" : "border-[var(--color-line)] hover:bg-[var(--color-surface2)]"}`}>
            <span className="block text-[13px] font-medium">{t}</span>
            <span className="block text-[11.5px] text-[var(--color-ink3)]">{d}</span>
          </button>
        ))}
      </div>

      {origem === "biblioteca" && (
        <div className="mb-3 flex flex-wrap gap-2" aria-label="Modelos">
          {modelos.map((m) => (
            <label key={m.id} className="flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-3 py-1 text-[12.5px]">
              <input type="checkbox" checked={usados.includes(m.id)} onChange={() => alternarModelo(m)} />
              {m.nome}
              {m.biblioteca && <span className="text-[11px] text-[var(--color-ink3)]">(biblioteca)</span>}
            </label>
          ))}
          {usados.length > 1 && <p className="w-full text-[11.5px] text-[var(--color-ink3)]">Fases de modelos diferentes com o mesmo nome aparecem separadas: desmarque a que não quiser.</p>}
        </div>
      )}
      {origem === "cris" && !fases.length && (
        <div className="mb-3 rounded-[10px] border border-dashed border-[var(--color-line)] p-3 text-[12.5px] text-[var(--color-ink2)]">
          <p>
            Abra a Cris, anexe a proposta técnica, plano de trabalho, termo de referência ou contrato (PDF ou DOCX) — ou cole o texto — e peça para montar o plano de
            trabalho. A Cris lê o documento, consulta a biblioteca da empresa e devolve uma proposta para você conferir aqui. Ela não grava nada.
          </p>
          <PerguntarACris pergunta="Monte o plano de trabalho deste projeto a partir do documento que vou anexar: extraia fases, atividades, entregas e prazos sem inventar, e indique a origem de cada item." className="mt-2 text-[12.5px] font-medium text-[var(--color-accent2)] hover:underline">
            Abrir a Cris com o pedido →
          </PerguntarACris>
        </div>
      )}
      {obsCris && <p className="mb-2 rounded-[10px] bg-[var(--color-surface2)] px-3 py-2 text-[12px] text-[var(--color-ink2)]">Observação da Cris: {obsCris}</p>}

      {origem && (
        <>
          <ArvoreDeSelecao fases={fases} setFases={setFases} mostrarDatas={origem !== "biblioteca"} />
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-3">
            <span className="text-[12.5px] text-[var(--color-ink2)]" data-testid="contagem-selecao">
              Serão gravados: <strong>{total.fases}</strong> fase(s), <strong>{total.atividades}</strong> atividade(s), <strong>{total.subatividades}</strong> subatividade(s) e <strong>{total.entregas}</strong> entrega(s).
            </span>
            <Button disabled={pendente || (origem !== "branco" && total.fases === 0)} onClick={gravar}>
              {temPlano ? "Acrescentar os itens marcados" : "Criar plano com os itens marcados"}
            </Button>
          </div>
        </>
      )}
      <Mensagem msg={msg} />
    </section>
  );
}

const btn = "rounded px-1.5 py-0.5 text-[11.5px] text-[var(--color-ink3)] hover:bg-[var(--color-surface3)] hover:text-[var(--color-ink)] disabled:opacity-40";

/** Árvore com caixas de seleção, nomes editáveis, origem e trecho de cada item. */
export function ArvoreDeSelecao({ fases, setFases, mostrarDatas }: { fases: FaseSelecionada[]; setFases: (f: FaseSelecionada[]) => void; mostrarDatas: boolean }) {
  const mut = (fn: (d: FaseSelecionada[]) => void) => {
    const d = structuredClone(fases);
    fn(d);
    setFases(d);
  };
  const marcarTudo = (v: boolean) =>
    mut((d) => {
      for (const f of d) {
        f.marcado = v;
        for (const a of f.atividades) {
          a.marcado = v;
          for (const s of a.subatividades) s.marcado = v;
        }
        for (const e of f.entregas) e.marcado = v;
      }
    });
  return (
    <div>
      <div className="mb-2 flex gap-2 text-[12px]">
        <button type="button" className={btn} onClick={() => marcarTudo(true)}>
          marcar tudo
        </button>
        <button type="button" className={btn} onClick={() => marcarTudo(false)}>
          desmarcar tudo
        </button>
      </div>
      <ol className="space-y-2" data-testid="arvore-selecao">
        {fases.map((f, i) => (
          <li key={f.chave} className={`rounded-[10px] border border-[var(--color-line)] p-2.5 ${f.marcado ? "" : "bg-[var(--color-surface2)] opacity-75"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                aria-label={`Incluir a fase ${f.nome || i + 1}`}
                checked={f.marcado}
                onChange={(e) =>
                  mut((d) => {
                    d[i].marcado = e.target.checked;
                  })
                }
              />
              <Input className="h-8 min-w-[220px] flex-1 font-medium" value={f.nome} placeholder="Nome da fase" onChange={(e) => mut((d) => void (d[i].nome = e.target.value))} aria-label="Nome da fase" />
              <SeloDeOrigem origem={f.origem} />
              <button type="button" className={btn} disabled={i === 0} onClick={() => mut((d) => void ([d[i - 1], d[i]] = [d[i], d[i - 1]]))} aria-label="Subir fase">
                ↑
              </button>
              <button type="button" className={btn} disabled={i === fases.length - 1} onClick={() => mut((d) => void ([d[i + 1], d[i]] = [d[i], d[i + 1]]))} aria-label="Descer fase">
                ↓
              </button>
              {f.origem === "manual" && (
                <button type="button" className={btn} onClick={() => mut((d) => void d.splice(i, 1))}>
                  remover
                </button>
              )}
            </div>
            {f.trecho && <p className="mt-1 pl-6 text-[11.5px] italic text-[var(--color-ink3)]">Trecho: “{f.trecho}”</p>}
            {mostrarDatas && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-6 text-[12px] text-[var(--color-ink3)]">
                início <DateField className="h-8 w-[150px]" value={f.inicio ?? ""} onChange={(v) => mut((d) => void (d[i].inicio = v || null))} />
                término <DateField className="h-8 w-[150px]" value={f.termino ?? ""} onChange={(v) => mut((d) => void (d[i].termino = v || null))} />
              </div>
            )}
            <ul className="mt-2 space-y-1 pl-6">
              {f.atividades.map((a, j) => (
                <NoAtividade key={a.chave} a={a} fi={i} ai={j} mut={mut} />
              ))}
              {f.entregas.map((e, j) => (
                <li key={e.chave} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <input type="checkbox" aria-label={`Incluir a entrega ${e.nome}`} checked={e.marcado} onChange={(ev) => mut((d) => void ((d[i].entregas[j].marcado = ev.target.checked), ev.target.checked && (d[i].marcado = true)))} />
                  <span className="text-[var(--color-ink3)]">◆</span>
                  <Input className="h-7 min-w-[200px] flex-1" value={e.nome} onChange={(ev) => mut((d) => void (d[i].entregas[j].nome = ev.target.value))} aria-label="Nome da entrega" />
                  {e.data && <span className="text-[11.5px] text-[var(--color-ink3)]">prevista {e.data.slice(3, 5)}/{e.data.slice(0, 2)}/{e.data.slice(6)}</span>}
                  <SeloDeOrigem origem={e.origem} />
                  <span className="text-[11px] text-[var(--color-ink3)]">entrega</span>
                </li>
              ))}
            </ul>
            <div className="mt-1.5 flex gap-2 pl-6">
              <button type="button" className={btn} onClick={() => mut((d) => void (d[i].atividades.push({ chave: chaveNova("na"), nome: "", marcado: true, origem: "manual", subatividades: [] }), (d[i].marcado = true)))}>
                + atividade
              </button>
              <button type="button" className={btn} onClick={() => mut((d) => void (d[i].entregas.push({ chave: chaveNova("ne"), nome: "", marcado: true, origem: "manual" }), (d[i].marcado = true)))}>
                + entrega
              </button>
            </div>
          </li>
        ))}
      </ol>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => setFases([...fases, faseNova()])}>
        + Fase personalizada
      </Button>
    </div>
  );
}

function NoAtividade({ a, fi, ai, mut }: { a: AtividadeSelecionada; fi: number; ai: number; mut: (fn: (d: FaseSelecionada[]) => void) => void }) {
  const linha = (n: NoDeSelecao, sub: number | null) => (
    <span className="flex flex-wrap items-center gap-2 text-[13px]">
      <input
        type="checkbox"
        aria-label={`Incluir ${n.nome}`}
        checked={n.marcado}
        onChange={(e) =>
          mut((d) => {
            const at = d[fi].atividades[ai];
            if (sub == null) at.marcado = e.target.checked;
            else at.subatividades[sub].marcado = e.target.checked;
            // Marcar um item marca quem o contém (senão ele não seria gravado).
            if (e.target.checked) {
              d[fi].marcado = true;
              at.marcado = true;
            }
          })
        }
      />
      <span className="text-[var(--color-ink3)]">{sub == null ? "•" : "–"}</span>
      <Input
        className="h-7 min-w-[200px] flex-1"
        value={n.nome}
        placeholder={sub == null ? "Atividade" : "Subatividade"}
        onChange={(e) =>
          mut((d) => {
            const at = d[fi].atividades[ai];
            if (sub == null) at.nome = e.target.value;
            else at.subatividades[sub].nome = e.target.value;
          })
        }
        aria-label={sub == null ? "Nome da atividade" : "Nome da subatividade"}
      />
      <SeloDeOrigem origem={n.origem} />
      {sub == null && (
        <button type="button" className={btn} onClick={() => mut((d) => void d[fi].atividades[ai].subatividades.push({ chave: chaveNova("ns"), nome: "", marcado: true, origem: "manual" }))}>
          + sub
        </button>
      )}
      {n.origem === "manual" && (
        <button type="button" className={btn} onClick={() => mut((d) => void (sub == null ? d[fi].atividades.splice(ai, 1) : d[fi].atividades[ai].subatividades.splice(sub, 1)))}>
          remover
        </button>
      )}
      {n.trecho && <span className="basis-full pl-6 text-[11px] italic text-[var(--color-ink3)]">Trecho: “{n.trecho}”</span>}
    </span>
  );
  return (
    <li className={a.marcado ? "" : "opacity-70"}>
      {linha(a, null)}
      {a.subatividades.length > 0 && (
        <ul className="mt-1 space-y-1 pl-6">
          {a.subatividades.map((s, k) => (
            <li key={s.chave}>{linha(s, k)}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

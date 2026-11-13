"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  adicionarModeloSugerido,
  duplicarFaseDeModelo,
  duplicarModelo,
  excluirAtividadeDeModelo,
  excluirFaseDeModelo,
  excluirModelo,
  moverNoModelo,
  salvarAtividadeDeModelo,
  salvarFaseDeModelo,
  salvarModelo,
} from "@/lib/actions/plano";
import { Mensagem, useAcao } from "@/components/app/contratos/comum";

interface Ativ {
  id: string;
  parentId: string | null;
  tipo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  sugerida: boolean;
}
interface Fase {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  sugerida: boolean;
  atividades: Ativ[];
}
export interface ModeloDaTela {
  id: string;
  nome: string;
  descricao: string | null;
  biblioteca: boolean;
  ativo: boolean;
  modalidadeId: string | null;
  fases: Fase[];
}

const icone = "rounded px-1.5 py-0.5 text-[12px] text-[var(--color-ink3)] hover:bg-[var(--color-surface3)] hover:text-[var(--color-ink)] disabled:opacity-40";

/**
 * Biblioteca e modelos da empresa. Mudar aqui afeta só sugestões FUTURAS:
 * projetos existentes guardam a própria cópia e não mudam.
 */
export function ModelosEditor({ modelos, modalidades, sugeridos, podeEditar }: { modelos: ModeloDaTela[]; modalidades: { id: string; nome: string }[]; sugeridos: { chave: string; nome: string; jaTem: boolean }[]; podeEditar: boolean }) {
  const { rodar, pendente, msg } = useAcao();
  const [aberto, setAberto] = useState<string>(modelos[0]?.id ?? "");
  const [novoModelo, setNovoModelo] = useState("");
  const [sugerido, setSugerido] = useState("");
  const m = modelos.find((x) => x.id === aberto) ?? modelos[0];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-2">
        <p className="text-[12px] text-[var(--color-ink3)]">Sugestões da empresa. Nenhuma fase é obrigatória; cada projeto usa só o que escolher.</p>
        {modelos.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setAberto(x.id)}
            className={`block w-full rounded-[10px] border px-3 py-2 text-left text-[13px] ${x.id === m?.id ? "border-[var(--color-brand-segmento)] bg-[var(--color-brand-segmento)]/10" : "border-[var(--color-line)] bg-white hover:bg-[var(--color-surface2)]"} ${!x.ativo ? "opacity-60" : ""}`}
          >
            <span className="font-medium">{x.nome}</span>
            <span className="block text-[11px] text-[var(--color-ink3)]">
              {x.biblioteca ? "Biblioteca padrão · " : ""}
              {x.fases.filter((f) => f.ativo).length} fase(s){!x.ativo ? " · desativado" : ""}
            </span>
          </button>
        ))}
        {podeEditar && (
          <div className="space-y-2 rounded-[10px] border border-dashed border-[var(--color-line)] p-2">
            <Input placeholder="Novo modelo (em branco)" value={novoModelo} onChange={(e) => setNovoModelo(e.target.value)} aria-label="Nome do novo modelo" />
            <Button size="sm" disabled={!novoModelo.trim() || pendente} onClick={() => rodar(() => salvarModelo({ nome: novoModelo }), "Modelo criado.", (r) => { setNovoModelo(""); if (r.id) setAberto(r.id); })}>
              Criar modelo
            </Button>
            <Select value={sugerido} onChange={(e) => setSugerido(e.target.value)} aria-label="Modelo sugerido por modalidade">
              <option value="">Adicionar modelo sugerido…</option>
              {sugeridos.map((s) => (
                <option key={s.chave} value={s.chave}>
                  {s.nome}
                  {s.jaTem ? " (já adicionado)" : ""}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="outline" disabled={!sugerido || pendente} onClick={() => rodar(() => adicionarModeloSugerido(sugerido), "Modelo adicionado à empresa (cópia editável).", (r) => { setSugerido(""); if (r.id) setAberto(r.id); })}>
              Adicionar
            </Button>
          </div>
        )}
      </aside>

      {m && <ModeloDetalhe key={m.id} m={m} modalidades={modalidades} podeEditar={podeEditar} rodar={rodar} pendente={pendente} />}
      <div className="lg:col-span-2">
        <Mensagem msg={msg} />
      </div>
    </div>
  );
}

function ModeloDetalhe({ m, modalidades, podeEditar, rodar, pendente }: { m: ModeloDaTela; modalidades: { id: string; nome: string }[]; podeEditar: boolean; rodar: ReturnType<typeof useAcao>["rodar"]; pendente: boolean }) {
  const [nome, setNome] = useState(m.nome);
  const [desc, setDesc] = useState(m.descricao ?? "");
  const [modalidade, setModalidade] = useState(m.modalidadeId ?? "");
  const [novaFase, setNovaFase] = useState("");
  return (
    <section className="rounded-[14px] border border-[var(--color-line)] bg-white p-4">
      {podeEditar ? (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_220px_auto]">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome do modelo" />
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição" aria-label="Descrição do modelo" />
          <Select value={modalidade} onChange={(e) => setModalidade(e.target.value)} aria-label="Modalidade">
            <option value="">Sem modalidade</option>
            {modalidades.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
          <Button size="sm" disabled={pendente} onClick={() => rodar(() => salvarModelo({ id: m.id, nome, descricao: desc, modalidadeId: modalidade || null }), "Modelo salvo.")}>
            Salvar
          </Button>
        </div>
      ) : (
        <h2 className="mb-3 text-[15px] font-semibold">{m.nome}</h2>
      )}
      {podeEditar && (
        <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
          <Button size="sm" variant="outline" disabled={pendente} onClick={() => rodar(() => duplicarModelo(m.id), "Modelo duplicado.")}>
            Duplicar modelo
          </Button>
          {!m.biblioteca && (
            <>
              <Button size="sm" variant="outline" disabled={pendente} onClick={() => rodar(() => salvarModelo({ id: m.id, nome: m.nome, descricao: m.descricao, modalidadeId: m.modalidadeId, ativo: !m.ativo }), m.ativo ? "Modelo desativado." : "Modelo reativado.")}>
                {m.ativo ? "Desativar" : "Reativar"}
              </Button>
              <Button size="sm" variant="ghost" disabled={pendente} onClick={() => window.confirm("Excluir o modelo? Projetos que usaram as sugestões NÃO mudam.") && rodar(() => excluirModelo(m.id), "Modelo excluído.")}>
                Excluir
              </Button>
            </>
          )}
        </div>
      )}
      <ol className="space-y-3">
        {m.fases.map((f, i) => (
          <FaseDoModelo key={f.id} f={f} i={i} total={m.fases.length} modeloId={m.id} podeEditar={podeEditar} rodar={rodar} pendente={pendente} />
        ))}
      </ol>
      {podeEditar && (
        <div className="mt-3 flex gap-2">
          <Input placeholder="Nova fase" value={novaFase} onChange={(e) => setNovaFase(e.target.value)} aria-label="Nova fase" />
          <Button size="sm" disabled={!novaFase.trim() || pendente} onClick={() => rodar(() => salvarFaseDeModelo({ modeloId: m.id, nome: novaFase }), "Fase criada.", () => setNovaFase(""))}>
            + Fase
          </Button>
        </div>
      )}
    </section>
  );
}

function FaseDoModelo({ f, i, total, modeloId, podeEditar, rodar, pendente }: { f: Fase; i: number; total: number; modeloId: string; podeEditar: boolean; rodar: ReturnType<typeof useAcao>["rodar"]; pendente: boolean }) {
  const [nome, setNome] = useState(f.nome);
  const [nova, setNova] = useState("");
  const [tipo, setTipo] = useState<"atividade" | "entrega">("atividade");
  const principais = f.atividades.filter((a) => !a.parentId);
  return (
    <li className={`rounded-[10px] border border-[var(--color-line)] p-3 ${!f.ativo ? "bg-[var(--color-surface2)] opacity-70" : ""}`} data-fase-modelo={f.nome}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-ink3)]">{i + 1}</span>
        {podeEditar ? (
          <Input className="h-8 min-w-[220px] flex-1" value={nome} onChange={(e) => setNome(e.target.value)} onBlur={() => nome.trim() && nome !== f.nome && rodar(() => salvarFaseDeModelo({ id: f.id, modeloId, nome }), "Fase renomeada.")} aria-label="Nome da fase" />
        ) : (
          <span className="flex-1 font-medium">{f.nome}</span>
        )}
        {podeEditar && (
          <span className="flex items-center gap-1 text-[12px]">
            <label className="flex items-center gap-1" title="Aparece marcada ao escolher sugestões">
              <input type="checkbox" checked={f.sugerida} disabled={pendente} onChange={(e) => rodar(() => salvarFaseDeModelo({ id: f.id, modeloId, nome: f.nome, sugerida: e.target.checked }), "Salvo.")} />
              sugerida
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={f.ativo} disabled={pendente} onChange={(e) => rodar(() => salvarFaseDeModelo({ id: f.id, modeloId, nome: f.nome, ativo: e.target.checked }), e.target.checked ? "Fase reativada." : "Fase desativada.")} />
              ativa
            </label>
            <button type="button" className={icone} disabled={pendente || i === 0} onClick={() => rodar(() => moverNoModelo({ tipo: "fase", id: f.id, direcao: "cima" }), "Reordenado.")} aria-label="Subir fase">↑</button>
            <button type="button" className={icone} disabled={pendente || i === total - 1} onClick={() => rodar(() => moverNoModelo({ tipo: "fase", id: f.id, direcao: "baixo" }), "Reordenado.")} aria-label="Descer fase">↓</button>
            <button type="button" className={icone} disabled={pendente} onClick={() => rodar(() => duplicarFaseDeModelo(f.id), "Fase duplicada.")}>duplicar</button>
            <button type="button" className={icone} disabled={pendente} onClick={() => window.confirm(`Excluir a fase "${f.nome}" do modelo? Projetos existentes não mudam.`) && rodar(() => excluirFaseDeModelo(f.id), "Fase excluída.")}>excluir</button>
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-1 pl-6 text-[13px]">
        {principais.map((a, j) => (
          <AtividadeDoModelo key={a.id} a={a} subs={f.atividades.filter((s) => s.parentId === a.id)} faseId={f.id} primeira={j === 0} ultima={j === principais.length - 1} podeEditar={podeEditar} rodar={rodar} pendente={pendente} />
        ))}
      </ul>
      {podeEditar && (
        <div className="mt-2 flex flex-wrap gap-2 pl-6">
          <Select className="h-8 w-[130px]" value={tipo} onChange={(e) => setTipo(e.target.value as "atividade" | "entrega")} aria-label="Tipo">
            <option value="atividade">Atividade</option>
            <option value="entrega">Entrega</option>
          </Select>
          <Input className="h-8 max-w-[360px]" placeholder={tipo === "entrega" ? "Nova entrega sugerida" : "Nova atividade sugerida"} value={nova} onChange={(e) => setNova(e.target.value)} aria-label="Nova atividade" />
          <Button size="sm" variant="outline" disabled={!nova.trim() || pendente} onClick={() => rodar(() => salvarAtividadeDeModelo({ faseId: f.id, nome: nova, tipo }), "Incluído.", () => setNova(""))}>
            +
          </Button>
        </div>
      )}
    </li>
  );
}

function AtividadeDoModelo({ a, subs, faseId, primeira, ultima, podeEditar, rodar, pendente }: { a: Ativ; subs: Ativ[]; faseId: string; primeira: boolean; ultima: boolean; podeEditar: boolean; rodar: ReturnType<typeof useAcao>["rodar"]; pendente: boolean }) {
  const [nome, setNome] = useState(a.nome);
  const [sub, setSub] = useState("");
  const [abrirSub, setAbrirSub] = useState(false);
  const linha = (x: Ativ, ehSub: boolean) => (
    <span className={`flex flex-wrap items-center gap-1 ${!x.ativo ? "opacity-50 line-through" : ""}`}>
      <span className="text-[var(--color-ink3)]">{x.tipo === "entrega" ? "◆" : ehSub ? "–" : "•"}</span>
      {podeEditar && !ehSub ? (
        <Input className="h-7 min-w-[200px] flex-1" value={nome} onChange={(e) => setNome(e.target.value)} onBlur={() => nome.trim() && nome !== x.nome && rodar(() => salvarAtividadeDeModelo({ id: x.id, faseId, nome, tipo: x.tipo, parentId: x.parentId }), "Renomeado.")} aria-label="Nome da atividade" />
      ) : (
        <span>{x.nome}</span>
      )}
      {x.tipo === "entrega" && <span className="text-[11px] text-[var(--color-ink3)]">entrega</span>}
      {podeEditar && (
        <>
          <label className="ml-1 flex items-center gap-1 text-[11px]" title="Aparece marcada ao escolher sugestões">
            <input type="checkbox" checked={x.sugerida} disabled={pendente} onChange={(e) => rodar(() => salvarAtividadeDeModelo({ id: x.id, faseId, nome: x.nome, tipo: x.tipo, parentId: x.parentId, sugerida: e.target.checked }), "Salvo.")} />
            sugerida
          </label>
          <label className="flex items-center gap-1 text-[11px]">
            <input type="checkbox" checked={x.ativo} disabled={pendente} onChange={(e) => rodar(() => salvarAtividadeDeModelo({ id: x.id, faseId, nome: x.nome, tipo: x.tipo, parentId: x.parentId, ativo: e.target.checked }), "Salvo.")} />
            ativa
          </label>
          {!ehSub && (
            <>
              <button type="button" className={icone} disabled={pendente || primeira} onClick={() => rodar(() => moverNoModelo({ tipo: "atividade", id: x.id, direcao: "cima" }), "Reordenado.")} aria-label="Subir">↑</button>
              <button type="button" className={icone} disabled={pendente || ultima} onClick={() => rodar(() => moverNoModelo({ tipo: "atividade", id: x.id, direcao: "baixo" }), "Reordenado.")} aria-label="Descer">↓</button>
              {x.tipo !== "entrega" && <button type="button" className={icone} onClick={() => setAbrirSub(!abrirSub)}>+ sub</button>}
            </>
          )}
          <button type="button" className={icone} disabled={pendente} onClick={() => rodar(() => excluirAtividadeDeModelo(x.id), "Excluído.")}>excluir</button>
        </>
      )}
    </span>
  );
  return (
    <li>
      {linha(a, false)}
      {subs.length > 0 && <ul className="mt-1 space-y-1 pl-6">{subs.map((s) => <li key={s.id}>{linha(s, true)}</li>)}</ul>}
      {abrirSub && (
        <div className="mt-1 flex gap-2 pl-6">
          <Input className="h-7 max-w-[300px]" placeholder="Subatividade sugerida" value={sub} onChange={(e) => setSub(e.target.value)} aria-label="Subatividade" />
          <Button size="sm" variant="outline" disabled={!sub.trim() || pendente} onClick={() => rodar(() => salvarAtividadeDeModelo({ faseId, parentId: a.id, nome: sub }), "Subatividade incluída.", () => setSub(""))}>
            +
          </Button>
        </div>
      )}
    </li>
  );
}

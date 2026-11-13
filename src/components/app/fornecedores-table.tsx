"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStakeholder, setStakeholderAtivo, deleteStakeholder } from "@/lib/actions/stakeholders";
import { filtrarCadastros, sinaisDoCadastro, TIPOS_DE_CHAVE_PIX, TIPOS_DE_CONTA, type SinaisDoCadastro } from "@/lib/stakeholder-regras";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface StakeholderView {
  id: string;
  nome: string;
  nomeFantasia: string | null;
  tipo: string;
  doc: string | null;
  papeis: string[];
  email: string | null;
  tel: string | null;
  obs: string | null;
  ativo: boolean;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  bancoNome: string | null;
  bancoAgencia: string | null;
  bancoConta: string | null;
  bancoTipoConta: string | null;
  bancoTitular: string | null;
  pixTipo: string | null;
  pixChave: string | null;
}

export function FornecedoresTable({
  stakeholders,
  papeis,
  canEditar,
  canExcluir,
}: {
  stakeholders: StakeholderView[];
  papeis: readonly string[];
  canEditar: boolean;
  canExcluir: boolean;
}) {
  const [mostrarInativos, setMostrarInativos] = useState(false);
  // 6.1 — busca por nome e documento, filtro por papel: tudo puro, sobre o que
  // a página carregou (o cadastro é global do tenant e cabe na memória).
  const [busca, setBusca] = useState("");
  const [papel, setPapel] = useState("");
  const visiveis = useMemo(() => filtrarCadastros(stakeholders, { busca, papel, mostrarInativos }), [stakeholders, busca, papel, mostrarInativos]);
  // 6.2 / 3.6 / 3-A.4 — sinais discretos (documento inválido, duplicado, tipo
  // incompatível, sem endereço obrigatório, sem papel). Não é erro.
  const sinais = useMemo(() => new Map(stakeholders.map((s) => [s.id, sinaisDoCadastro(s, stakeholders)])), [stakeholders]);
  const papeisEmUso = useMemo(() => [...new Set([...papeis, ...stakeholders.flatMap((s) => s.papeis)])], [papeis, stakeholders]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Label>Buscar</Label>
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, nome fantasia ou documento" aria-label="Buscar cadastro" />
        </div>
        <div className="min-w-[200px]">
          <Label>Papel</Label>
          <Select value={papel} onChange={(e) => setPapel(e.target.value)} aria-label="Filtrar por papel">
            <option value="">Todos os papéis</option>
            {papeisEmUso.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <label className="flex h-9 cursor-pointer items-center gap-2 text-[12.5px] text-[var(--color-ink2)]">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-accent2)]"
          />
          Mostrar inativos
        </label>
        <span className="h-9 self-end text-[12px] leading-9 text-[var(--color-ink3)]" role="status">
          {visiveis.length} de {stakeholders.length}
        </span>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Nome</TH>
            <TH>Tipo</TH>
            <TH>Documento</TH>
            <TH>Papéis</TH>
            <TH>Status</TH>
            {(canEditar || canExcluir) && <TH className="text-right">Ações</TH>}
          </tr>
        </THead>
        <tbody>
          {visiveis.map((s) => (
            <StakeholderRow
              key={s.id}
              s={s}
              sinais={sinais.get(s.id)!}
              papeis={papeis}
              canEditar={canEditar}
              canExcluir={canExcluir}
            />
          ))}
          {visiveis.length === 0 && (
            <TR>
              <TD colSpan={6} className="py-6 text-center text-[var(--color-ink3)]">
                {stakeholders.length === 0 ? "Nenhum cadastro." : "Nenhum cadastro com esse filtro."}
              </TD>
            </TR>
          )}
        </tbody>
      </Table>
    </div>
  );
}

function StakeholderRow({
  s,
  sinais,
  papeis,
  canEditar,
  canExcluir,
}: {
  s: StakeholderView;
  sinais: SinaisDoCadastro;
  papeis: readonly string[];
  canEditar: boolean;
  canExcluir: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [tipo, setTipo] = useState(s.tipo);
  // BW-2 — papel gravado fora da lista aparece marcado e é reenviado; antes a
  // edição o perdia em silêncio (o formulário só reenvia os marcados).
  // Growth Ambiental: papel antigo (de incorporação), que não é mais oferecido, também é preservado.
  const desconhecidos = s.papeis.filter((p) => !papeis.includes(p));

  const toggleAtivo = () =>
    start(async () => {
      setError(null);
      const r = await setStakeholderAtivo(s.id, !s.ativo);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });

  // 2.5 — exclusão com o nome digitado, como nas demais exclusões do sistema.
  const [excluindo, setExcluindo] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const excluir = () =>
    start(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("id", s.id);
      fd.set("confirmacao", confirmacao);
      const r = await deleteStakeholder(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setExcluindo(false);
      router.refresh();
    });

  if (editing) {
    return (
      <TR>
        <TD colSpan={6}>
          <form
            // onSubmit (não `action`): o React 19 reinicia os campos do formulário
            // ao fim de uma `action`, e um erro de validação apagaria o que o
            // usuário tinha digitado — tipo, papéis e endereço voltariam ao gravado.
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                setError(null);
                setAviso(null);
                // 5.2 — { ok, error, avisos }: erro mantém o formulário aberto; aviso
                // (tipo × documento, documento repetido) grava e informa.
                const r = await updateStakeholder(fd);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                setAviso(r.avisos.length ? r.avisos.join(" ") : null);
                setEditing(false);
                router.refresh();
              });
            }}
            className="rounded-[8px] border border-[var(--color-accent2)]/15 bg-[var(--color-surface2)] p-3"
          >
            <input type="hidden" name="id" value={s.id} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="sm:col-span-2"><Label>Nome</Label><Input name="nome" defaultValue={s.nome} required /></div>
              <div>
                <Label>Tipo</Label>
                <Select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="PJ">PJ</option>
                  <option value="PF">PF</option>
                </Select>
              </div>
              <div><Label>Documento</Label><Input name="doc" defaultValue={s.doc ?? ""} /></div>
              <div><Label>E-mail</Label><Input name="email" defaultValue={s.email ?? ""} /></div>
              <div><Label>Telefone</Label><Input name="tel" defaultValue={s.tel ?? ""} /></div>
              <div className="sm:col-span-2"><Label>Observação</Label><Input name="obs" defaultValue={s.obs ?? ""} /></div>
              {/* 3-A — endereço editável aqui: é o que permite completar o cadastro sinalizado. */}
              <div className="sm:col-span-2"><Label>{tipo === "PF" ? "Endereço residencial" : "Endereço"}</Label><Input name="endereco" defaultValue={s.endereco ?? ""} /></div>
              <div><Label>Número</Label><Input name="numero" defaultValue={s.numero ?? ""} /></div>
              <div><Label>Complemento</Label><Input name="complemento" defaultValue={s.complemento ?? ""} /></div>
              <div><Label>Bairro</Label><Input name="bairro" defaultValue={s.bairro ?? ""} /></div>
              <div><Label>Cidade</Label><Input name="cidade" defaultValue={s.cidade ?? ""} /></div>
              <div><Label>Estado</Label><Input name="estado" defaultValue={s.estado ?? ""} maxLength={2} /></div>
              <div><Label>CEP</Label><Input name="cep" defaultValue={s.cep ?? ""} /></div>
              {/* Prompt T, BT-2 — dados para ressarcimento; o log registra que mudaram, não o valor. */}
              <div className="sm:col-span-4 mt-1 text-[11px] font-medium text-[var(--color-ink3)]">Dados para ressarcimento (banco / PIX)</div>
              <div><Label>Banco</Label><Input name="bancoNome" defaultValue={s.bancoNome ?? ""} /></div>
              <div><Label>Agência</Label><Input name="bancoAgencia" defaultValue={s.bancoAgencia ?? ""} /></div>
              <div><Label>Conta</Label><Input name="bancoConta" defaultValue={s.bancoConta ?? ""} /></div>
              <div>
                <Label>Tipo de conta</Label>
                <Select name="bancoTipoConta" defaultValue={s.bancoTipoConta ?? ""}>
                  <option value="">—</option>
                  {TIPOS_DE_CONTA.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Titular (se diferente)</Label><Input name="bancoTitular" defaultValue={s.bancoTitular ?? ""} /></div>
              <div>
                <Label>Tipo de chave PIX</Label>
                <Select name="pixTipo" defaultValue={s.pixTipo ?? ""}>
                  <option value="">—</option>
                  {TIPOS_DE_CHAVE_PIX.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
              <div><Label>Chave PIX</Label><Input name="pixChave" defaultValue={s.pixChave ?? ""} autoComplete="off" /></div>
            </div>
            <div className="mt-2">
              <Label>Papéis (uma pessoa pode ter vários)</Label>
              <div className="flex flex-wrap gap-2">
                {[...papeis, ...desconhecidos].map((p) => (
                  <label key={p} className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink2)]">
                    <input
                      type="checkbox"
                      name="papeis"
                      value={p}
                      defaultChecked={s.papeis.includes(p)}
                      className="h-4 w-4 accent-[var(--color-accent2)]"
                    />
                    {p}
                    {desconhecidos.includes(p) && <span className="text-[10px] text-[var(--color-ink4)]" title="Papel gravado fora da lista do sistema (importação). Fica como está.">fora da lista</span>}
                  </label>
                ))}
              </div>
            </div>
            {error && <p role="alert" className="mt-2 text-[12px] text-[var(--color-danger)]">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" type="submit" disabled={pending}>Salvar</Button>
              <Button size="sm" type="button" variant="ghost" onClick={() => { setEditing(false); setError(null); setTipo(s.tipo); }}>Cancelar</Button>
            </div>
          </form>
        </TD>
      </TR>
    );
  }

  return (
    <TR className={s.ativo ? undefined : "opacity-60"}>
      <TD className="font-medium text-[var(--color-ink)]">
        {s.nome}
        {s.nomeFantasia && <span className="ml-1.5 text-[11px] font-normal text-[var(--color-ink3)]">{s.nomeFantasia}</span>}
        {sinais.semEnderecoObrigatorio && (
          <span className="ml-1.5 text-[11px] font-normal text-[var(--color-warning)]" title="Pessoa física com papel de serviço ou mão de obra sem endereço residencial (RPA e recibo). Edite para completar.">
            sem endereço
          </span>
        )}
      </TD>
      <TD>
        <Badge tone={s.tipo === "PJ" ? "info" : "neutral"}>{s.tipo}</Badge>
        {sinais.tipoIncompativel && (
          <span className="ml-1 text-[11px] text-[var(--color-warning)]" title={s.tipo === "PJ" ? "O documento é um CPF" : "O documento é um CNPJ"}>
            ≠ doc
          </span>
        )}
      </TD>
      <TD className="font-[family-name:var(--font-mono)]">
        {s.doc || "—"}
        {sinais.documentoInvalido && (
          <span className="ml-1 font-sans text-[11px] text-[var(--color-warning)]" title="Documento fora do padrão (não passa na verificação de CPF/CNPJ). Continua editável; nada foi alterado.">
            fora do padrão
          </span>
        )}
        {sinais.documentoDuplicado.length > 0 && (
          <span className="ml-1 font-sans text-[11px] text-[var(--color-warning)]" title={`Mesmo documento em: ${sinais.documentoDuplicado.map((d) => d.nome).join(", ")}`}>
            duplicado
          </span>
        )}
      </TD>
      <TD>
        <div className="flex flex-wrap gap-1">
          {s.papeis.length ? (
            s.papeis.map((p) => (
              <Badge key={p} tone={sinais.papeisDesconhecidos.includes(p) ? "warning" : "neutral"} title={sinais.papeisDesconhecidos.includes(p) ? "Papel gravado fora da lista do sistema" : undefined}>
                {p}
              </Badge>
            ))
          ) : (
            <span className="text-[11px] text-[var(--color-warning)]" title="Sem papel, o cadastro não aparece em nenhum seletor filtrado por papel.">
              sem papel
            </span>
          )}
        </div>
      </TD>
      <TD><Badge tone={s.ativo ? "success" : "neutral"}>{s.ativo ? "Ativo" : "Inativo"}</Badge></TD>
      {(canEditar || canExcluir) && (
        <TD className="text-right">
          <div className="flex flex-wrap justify-end gap-2">
            {canEditar && (
              <button onClick={() => { setEditing(true); setAviso(null); }} disabled={pending} className="text-sm text-[var(--color-accent2)] hover:underline disabled:opacity-50">Editar</button>
            )}
            {canEditar && (
              <button onClick={toggleAtivo} disabled={pending} className="text-sm text-[var(--color-warning)] hover:underline disabled:opacity-50">
                {s.ativo ? "Inativar" : "Reativar"}
              </button>
            )}
            {canExcluir && !excluindo && (
              <button onClick={() => { setExcluindo(true); setError(null); setConfirmacao(""); }} disabled={pending} className="text-sm text-[var(--color-danger)] hover:underline disabled:opacity-50">Excluir</button>
            )}
          </div>
          {excluindo && (
            <div className="mt-2 flex flex-wrap items-end justify-end gap-2 text-left">
              <div className="min-w-[220px]">
                <Label>Digite o nome para confirmar a exclusão</Label>
                <Input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} placeholder={s.nome} autoComplete="off" aria-label={`Confirmar exclusão de ${s.nome}`} />
              </div>
              <Button size="sm" variant="outline" type="button" disabled={pending || !confirmacao.trim()} onClick={excluir}>Excluir definitivamente</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => { setExcluindo(false); setError(null); }}>Cancelar</Button>
            </div>
          )}
          {error && <p role="alert" className="mt-1 text-[11px] text-[var(--color-danger)]">{error}</p>}
          {aviso && <p role="status" className="mt-1 text-[11px] text-[var(--color-warning)]">Salvo com aviso: {aviso}</p>}
        </TD>
      )}
    </TR>
  );
}

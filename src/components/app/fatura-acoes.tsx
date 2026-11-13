"use client";

import { useState, useTransition } from "react";
import { informarJurosDaFatura, pagarFatura, previewPagamentoFatura, type PreviewPagamentoFatura } from "@/lib/actions/faturas";
import { brl0, dateBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { DateField } from "@/components/ui/date-field";

/**
 * Ações de uma fatura FECHADA (Prompt U, seção 3): pagar (com prévia, 3.6;
 * idempotente, 3.5) e informar o juro cobrado (3.4). Nada aqui lança compra.
 */
function chaveNova() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export function FaturaAcoes({ faturaId, saldo, contaPadrao, temJuros, contas, projetos }: { faturaId: string; saldo: number; contaPadrao: string | null; temJuros: boolean; contas: { id: string; nome: string }[]; projetos: { id: string; nome: string }[] }) {
  const [modo, setModo] = useState<null | "pagar" | "juros">(null);
  const [valor, setValor] = useState(String(saldo));
  const [data, setData] = useState("");
  const [conta, setConta] = useState(contaPadrao ?? "");
  const [obra, setObra] = useState(projetos[0]?.id ?? "");
  const [chave, setChave] = useState(chaveNova);
  const [previa, setPrevia] = useState<PreviewPagamentoFatura | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const abrir = (m: "pagar" | "juros") => {
    setModo(modo === m ? null : m);
    setPrevia(null);
    setErro(null);
    setOk(null);
    setChave(chaveNova());
    if (m === "juros") setValor("");
    else setValor(String(saldo));
  };

  return (
    <div className="text-left">
      <div className="flex flex-wrap justify-end gap-1">
        {saldo > 0 && (
          <Button size="sm" variant="outline" onClick={() => abrir("pagar")}>
            Pagar
          </Button>
        )}
        {!temJuros && (
          <Button size="sm" variant="ghost" onClick={() => abrir("juros")} title="Só quando a fatura chegou com juro do rotativo cobrado">
            Juros cobrados
          </Button>
        )}
      </div>
      {modo && (
        <div className="mt-2 w-[min(520px,80vw)] space-y-2 rounded-[10px] border border-[var(--color-line)] bg-[var(--color-surface2)] p-3 text-[12.5px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{modo === "pagar" ? "Valor pago" : "Juro cobrado"}</Label>
              <Input type="number" step="0.01" min="0.01" value={valor} onChange={(e) => setValor(e.target.value)} aria-label={modo === "pagar" ? "Valor pago" : "Juro cobrado"} />
            </div>
            <div>
              <Label>{modo === "pagar" ? "Data do pagamento" : "Data da cobrança"}</Label>
              <DateField value={data} onChange={setData} />
            </div>
            {modo === "pagar" && (
              <div>
                <Label>Conta que debita</Label>
                <Select value={conta} onChange={(e) => setConta(e.target.value)} aria-label="Conta que debita">
                  <option value="">— a do cartão —</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Projeto do lançamento</Label>
              <Select value={obra} onChange={(e) => setObra(e.target.value)} aria-label="Projeto do lançamento">
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {modo === "pagar" && !previa && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                setErro(null);
                start(async () => {
                  const r = await previewPagamentoFatura(faturaId, Number(valor));
                  if (r.ok) setPrevia(r);
                  else setErro(r.error);
                });
              }}
            >
              Ver prévia
            </Button>
          )}
          {modo === "pagar" && previa && (
            <div className="space-y-1 rounded-[8px] border border-[var(--color-line)] bg-white p-2" role="status">
              <div>
                Em aberto até esta fatura: <strong>{brl0(previa.totalDevido)}</strong> · pagar <strong>{brl0(previa.valor)}</strong> na conta {contas.find((c) => c.id === (conta || previa.bankAccountId))?.nome ?? "— sem conta —"} · restará <strong>{brl0(previa.saldoRestante)}</strong>
                {previa.saldoRestante > 0 ? " como rotativo, levado à fatura seguinte." : "."}
              </div>
              {previa.sobra > 0 && <div className="text-[var(--color-danger)]">O valor excede o saldo em {brl0(previa.sobra)}.</div>}
              <ul className="text-[11.5px] text-[var(--color-ink2)]">
                {previa.linhas.map((l) => (
                  <li key={`${l.numDoc}-${l.parcela}-${l.faturaFechamento}`}>
                    {l.numDoc ?? "sem PED"} · parcela {l.parcela} · fatura {dateBR(l.faturaFechamento)} · abate {brl0(l.abatido)} de {brl0(l.saldo)}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending || previa.sobra > 0}
                  onClick={() => {
                    setErro(null);
                    start(async () => {
                      const r = await pagarFatura({ faturaId, valor: Number(valor), data, bankAccountId: conta || null, projectId: obra, idempotencyKey: chave });
                      if (r.ok) {
                        setOk(r.jaExistia ? "Este pagamento já estava registrado." : `Pagamento registrado: ${r.parcelasAbatidas} parcela(s) abatida(s)${r.saldoRestante ? `, ${brl0(r.saldoRestante)} no rotativo` : ""}.`);
                        setModo(null);
                      } else setErro(r.error);
                    });
                  }}
                >
                  Confirmar pagamento
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPrevia(null)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
          {modo === "juros" && (
            <div className="space-y-1">
              <p className="text-[11.5px] text-[var(--color-ink3)]">Vira uma despesa &quot;Despesas Financeiras&quot; na competência da cobrança, vinculada a esta fatura. Só registre o que veio cobrado — a projeção da tela é estimativa.</p>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => {
                  setErro(null);
                  start(async () => {
                    const r = await informarJurosDaFatura({ faturaId, valor: Number(valor), data, projectId: obra });
                    if (r.ok) {
                      setOk("Juro registrado como despesa financeira.");
                      setModo(null);
                    } else setErro(r.error);
                  });
                }}
              >
                Registrar juro cobrado
              </Button>
            </div>
          )}
          {erro && (
            <p className="text-[var(--color-danger)]" role="alert">
              {erro}
            </p>
          )}
        </div>
      )}
      {ok && (
        <p className="mt-1 text-[11.5px] text-[var(--color-ink2)]" role="status">
          {ok}
        </p>
      )}
    </div>
  );
}

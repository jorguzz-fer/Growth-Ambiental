"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { statusDespesaValido } from "@/lib/despesa-regras";
import { useCrisFormulario } from "@/components/app/cris-contexto";
import {
  addDespesa,
  updateDespesa,
  extractDespesaFromDoc,
  addDespesaDocs,
  deleteDespesaDoc,
  cancelarDespesa,
} from "@/lib/actions/despesas";
import {
  categoriasDeDespesa,
  validarCategoriaDespesa,
  ERRO_CATEGORIA_CREDORA,
} from "@/lib/calc/natureza-dre";
import { CampoIA, ResumoLeituraIA } from "@/components/ui/campo-ia";
import { UploadDocumentos } from "@/components/ui/upload-documentos";
import { AI_MAX_DOCS, legivelPelaIa, type Alerta } from "@/lib/ai/campos";
import {
  ROTULO_CAMPO,
  ROTULO_NATUREZA,
  type CampoDespesa,
  type PreenchimentoDespesa,
} from "@/lib/ai/despesa-doc";
import {
  TIPOS_DOCUMENTO,
  exigeNumero,
  validarDocumentoFiscal,
} from "@/lib/calc/documento-fiscal";
import {
  buscarDocumentoDuplicado,
  salvarDocumentoFiscal,
  type DuplicidadeDocumento,
} from "@/lib/actions/documento-fiscal";
import { dateBR } from "@/lib/utils";
import { faturasDasParcelas } from "@/lib/calc/cartao-ciclo";
import { ConfirmarExclusaoDespesa } from "@/components/app/confirmar-exclusao-despesa";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { DateField, MonthField } from "@/components/ui/date-field";
import {
  gerarParcelas,
  conflitoRecorrenteParcelado,
  FORMAS_PAGAMENTO,
  CONDICOES_PAGAMENTO,
} from "@/lib/calc";
import {
  ParcelasEditor,
  parcelaVazia,
  type ParcelaEditavel,
} from "@/components/app/parcelas-editor";

interface Projeto {
  id: string;
  nome: string;
}
interface Fornecedor {
  id: string;
  nome: string;
  doc: string | null;
}
interface Conta {
  code: string;
  name: string;
}
interface Banco {
  id: string;
  banco: string;
  tipo: string;
}

/**
 * Dados de uma despesa carregada para edição. Quando `edit` está presente, o
 * formulário abre com estes valores em vez de vazio e grava via `updateDespesa`
 * (em vez de criar uma nova despesa). Datas seguem o formato interno da tela
 * (competência "MM/YYYY", vencimento "MM/DD/YYYY").
 */
export interface DespesaAnexo {
  id: string;
  filename: string;
  tipo: string | null;
  size: number | null;
  uploadedAt: string | null;
  /** URL assinada para abrir/baixar; null quando o storage não está configurado. */
  url: string | null;
}

export interface EditDespesa {
  id: string;
  projectId: string;
  projectNome: string;
  fornecedorId: string | null;
  contaCef: string | null;
  /** 0079 — tratamento direto/indireto do lançamento (null = padrão da conta). */
  tipoCusto?: string | null;
  categoriaDre: string | null;
  bancoId: string | null;
  numDoc: string | null;
  competencia: string | null;
  vencimento: string | null;
  valor: string;
  status: string | null;
  formaPagamento?: string | null;
  /** Prompt U — compra no cartão: valor, vencimento, forma e status seguem a fatura. */
  cartao?: { nome: string } | null;
  /** Descrição/observação da compra (campo separado do nº do pedido). */
  obs?: string | null;
  /** Documentos anexados à despesa (para visualizar/baixar na edição). */
  documentos?: DespesaAnexo[];
  /** Se o storage (R2) está configurado — habilita os links de download. */
  r2Configured?: boolean;
  /** Documento fiscal já registrado para esta despesa (item 1.2). */
  documentoFiscal?: {
    tipo: string;
    numero: string | null;
    serie: string | null;
    chaveAcesso: string | null;
    dataEmissao: string | null;
  } | null;
}

/**
 * Pré-preenchimento de uma NOVA despesa (ex.: a partir de uma linha do extrato).
 * Só é usado quando o formulário abre em modo criação (sem `edit`).
 */
export interface PrefillDespesa {
  valor?: string | null;
  /** Prompt U, BU-2 — proposta da conferência do extrato: forma, cartão, data e descrição. */
  formaPagamento?: string | null;
  cartaoId?: string | null;
  cartaoDataCompra?: string | null;
  obs?: string | null;
  /** Prompt L, 3-A.2 — movimento do extrato que originou o lançamento: fica reservado e é conciliado ao gravar. */
  cashEntryId?: string | null;
  /** Prompt AT §6.2 — linha do extrato do cartão que originou a compra: é conciliada com ela ao gravar. */
  extratoCartaoId?: string | null;
  /** Prompt Z, BZ-1 — proposta vinda de Equipes: fornecedor (autônomo) e as diárias que passam a apontar para a despesa. */
  fornecedorId?: string | null;
  diariasIds?: string | null;
  /** vencimento "MM/DD/YYYY". */
  vencimento?: string | null;
  /** competência "MM/YYYY". */
  competencia?: string | null;
  numDoc?: string | null;
}

export function DespesaForm({
  projetos,
  projetoId,
  fornecedores,
  contas,
  bancos,
  categorias,
  categoriaDoPlano = null,
  pagadores = [],
  cartoes = [],
  aiConfigured,
  r2Configured,
  canExcluir = false,
  parcelaDeOrigem = null,
  edit = null,
  prefill = null,
}: {
  projetos: Projeto[];
  projetoId: string;
  fornecedores: Fornecedor[];
  contas: Conta[];
  bancos: Banco[];
  categorias: readonly string[];
  /**
   * Prompt DP — chave "despesa_categoria_do_plano" ligada: código da conta →
   * categoria da DRE da conta. A categoria vem da conta e fica travada.
   * `null` = chave desligada (a pessoa escolhe, como antes).
   */
  categoriaDoPlano?: Record<string, string> | null;
  /** Prompt T, 2.3 — quem tem o papel "Pagador por Terceiro" (ativo). */
  pagadores?: { id: string; nome: string }[];
  /** Prompt U / S 3-B.4 — cartões ativos para a forma "Cartão de crédito". */
  cartoes?: { id: string; nome: string; diaFechamento: number; diaVencimento: number }[];
  aiConfigured: boolean;
  r2Configured: boolean;
  /** Habilita cancelar/excluir a despesa a partir da tela de edição. */
  canExcluir?: boolean;
  /** Prompt R, 1.4 — nº da parcela de que se veio (Contas a Pagar); o formulário edita o cabeçalho. */
  parcelaDeOrigem?: string | null;
  /** Quando presente, o formulário abre em modo EDIÇÃO da despesa informada. */
  edit?: EditDespesa | null;
  /** Pré-preenchimento de nova despesa (ignorado em modo edição). */
  prefill?: PrefillDespesa | null;
}) {
  const router = useRouter();
  const isEdit = !!edit;
  const [reading, startReading] = useTransition();
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Falha da leitura por IA — mostrada no próprio bloco de upload. */
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);

  const [projeto, setProjeto] = useState(edit?.projectId ?? projetoId);
  const [fornecedorId, setFornecedorId] = useState(edit?.fornecedorId ?? prefill?.fornecedorId ?? "");
  const [contaCef, setContaCef] = useState(edit?.contaCef ?? "");
  const [tipoCusto, setTipoCusto] = useState(edit?.tipoCusto ?? "");
  // Item 1.3 — o default era `categorias[0]`, e a primeira categoria da lista é
  // "Receita": toda despesa nova nascia classificada como receita, inflando
  // receita e resultado na DRE ao mesmo tempo. Agora abre vazio ("Selecione…")
  // e o dropdown só oferece categorias de natureza devedora.
  const [categoriaDre, setCategoriaDre] = useState(edit?.categoriaDre ?? "");
  const categoriasDespesa = useMemo(() => categoriasDeDespesa(categorias), [categorias]);
  // Prompt DP — a categoria da conta escolhida (chave ligada), ou undefined.
  const categoriaTravada = categoriaDoPlano && contaCef ? categoriaDoPlano[contaCef] : undefined;
  const travadaEmReceita = !!categoriaTravada && !categoriasDespesa.includes(categoriaTravada);
  useEffect(() => {
    if (categoriaTravada && !travadaEmReceita) setCategoriaDre(categoriaTravada);
  }, [categoriaTravada, travadaEmReceita]);
  // Prompt S, 3-C.4.3 — a recusa de categoria aparece NO CAMPO, com o caminho.
  const [erroCategoria, setErroCategoria] = useState<string | null>(null);
  // 3-C.4.4 — legado do BS-4: categoria credora gravada antes da trava. O select
  // mostra o valor atual marcado como inválido e não deixa salvar sem trocar.
  const categoriaLegadaInvalida = !!edit?.categoriaDre && !categoriasDespesa.includes(edit.categoriaDre);
  const mensagemDeCategoria = (erro: string) => `${erro} Se este lançamento é uma entrada, ele não é despesa: o caminho é Contas a Receber.`;
  const [bancoId, setBancoId] = useState(edit?.bancoId ?? "");
  const [numDoc, setNumDoc] = useState(edit?.numDoc ?? prefill?.numDoc ?? "");
  const [competencia, setCompetencia] = useState(edit?.competencia ?? prefill?.competencia ?? "");
  const [vencimento, setVencimento] = useState(edit?.vencimento ?? prefill?.vencimento ?? "");
  const [valor, setValor] = useState(edit?.valor ?? prefill?.valor ?? "");
  const [status, setStatus] = useState(edit?.status ?? "A pagar");
  const [obs, setObs] = useState(edit?.obs ?? prefill?.obs ?? "");
  // Bloco Documento Fiscal (item 1.2). Tudo opcional no lançamento: a nota
  // costuma chegar depois, e travar isso impediria o uso real do sistema.
  const [docFiscal, setDocFiscal] = useState({
    tipo: edit?.documentoFiscal?.tipo ?? "SEM_DOC",
    numero: edit?.documentoFiscal?.numero ?? "",
    serie: edit?.documentoFiscal?.serie ?? "",
    chaveAcesso: edit?.documentoFiscal?.chaveAcesso ?? "",
    dataEmissao: edit?.documentoFiscal?.dataEmissao ?? "",
  });
  const [dupAviso, setDupAviso] = useState<DuplicidadeDocumento | null>(null);
  const [dupConfirmada, setDupConfirmada] = useState(false);
  // Vários anexos podem ser enviados no mesmo lançamento — e a leitura por IA
  // usa TODOS os legíveis de uma vez: a mesma compra costuma chegar em partes
  // (a nota E o comprovante do Pix), e é o cruzamento delas que diz "já paga,
  // por PIX, em 20/07".
  const [files, setFiles] = useState<File[]>([]);
  const legiveis = useMemo(() => files.filter((f) => legivelPelaIa(f.type)), [files]);

  // ── Alertas da leitura por IA ─────────────────────────────────────────
  // Campo marcado = a IA não achou o dado, ou achou sem certeza. A marca some
  // quando o usuário mexe no campo: quem editou já conferiu.
  const [alertas, setAlertas] = useState<Partial<Record<CampoDespesa, Alerta>>>({});
  const [leitura, setLeitura] = useState<{
    titulo: string;
    resumo: string;
    preenchidos: string[];
    observacoes: string[];
  } | null>(null);

  const limparAlerta = (campo: CampoDespesa) =>
    setAlertas((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });

  /** Envolve um setter para limpar o alerta do campo assim que ele é editado. */
  function editando<T>(campo: CampoDespesa, setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      limparAlerta(campo);
    };
  }

  const limparLeitura = () => {
    setAlertas({});
    setLeitura(null);
    setErroLeitura(null);
  };

  // Anexos na EDIÇÃO: enviar novos e remover individualmente, em qualquer
  // estágio (inclusive com a despesa já paga e/ou conciliada).
  const [novosAnexos, setNovosAnexos] = useState<File[]>([]);
  const [anexBusy, setAnexBusy] = useState(false);
  const [anexMsg, setAnexMsg] = useState<string | null>(null);
  const [anexErro, setAnexErro] = useState<string | null>(null);

  /** Limite de corpo das Server Actions (next.config: bodySizeLimit 12 MB). */
  const LIMITE_ENVIO = 11 * 1024 * 1024;

  async function enviarAnexos() {
    if (!edit || novosAnexos.length === 0) return;
    setAnexMsg(null);
    setAnexErro(null);

    // O envio inteiro (soma dos arquivos) precisa caber no corpo da Server
    // Action. Acima disso o Next rejeita a requisição ANTES da action rodar, e
    // sem este aviso o clique simplesmente não fazia nada.
    const total = novosAnexos.reduce((a, f) => a + f.size, 0);
    if (total > LIMITE_ENVIO) {
      setAnexErro(
        `Os arquivos somam ${(total / 1024 / 1024).toFixed(1)} MB e o limite por envio é 11 MB. ` +
          "Anexe em partes — os arquivos já enviados são preservados.",
      );
      return;
    }
    const grande = novosAnexos.find((f) => f.size > 10 * 1024 * 1024);
    if (grande) {
      setAnexErro(`"${grande.name}" excede 10 MB.`);
      return;
    }

    setAnexBusy(true);
    try {
      const fd = new FormData();
      fd.set("despesaId", edit.id);
      for (const f of novosAnexos) fd.append("file", f);
      const res = await addDespesaDocs(fd);
      if (res.ok) {
        setAnexMsg(`${res.added} arquivo(s) anexado(s).`);
        setNovosAnexos([]);
        router.refresh();
      } else {
        setAnexErro(res.error ?? "Falha ao anexar.");
      }
    } catch (e) {
      // Sem este catch, uma exceção (corpo grande demais, rede, sessão expirada)
      // rejeitava a promessa em silêncio: o botão voltava ao normal e nada
      // acontecia na tela.
      console.error("[despesa] falha ao anexar:", e);
      setAnexErro(
        e instanceof Error
          ? `Falha ao anexar: ${e.message}`
          : "Falha ao anexar os arquivos. Tente novamente ou envie um por vez.",
      );
    } finally {
      setAnexBusy(false);
    }
  }

  /** Volta para a lista removendo o ?edit= da URL. */
  function voltarParaLista() {
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    router.push(`${url.pathname}${url.search}`);
    router.refresh();
  }

  /**
   * Cancelamento LÓGICO: a despesa para de contar nos relatórios, mas o
   * registro e todo o histórico permanecem no banco. É a via recomendada.
   */
  function cancelarDespesaAtual() {
    if (!edit) return;
    const motivo = window.prompt(
      `Motivo do cancelamento da despesa ${edit.numDoc ?? ""}:`,
    );
    if (motivo === null) return;
    setError(null);
    startSaving(async () => {
      try {
        const r = await cancelarDespesa(edit.id, motivo);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        voltarParaLista();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao cancelar a despesa.");
      }
    });
  }

  /**
   * Exclusão FÍSICA (Prompt S, seção 2): abre o painel que mostra o inventário
   * do que está vinculado e pede o PED digitado. A action recusa com
   * dependência (Prompt I, §12), apaga e audita na mesma transação.
   */
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  function excluirDespesa() {
    if (!edit) return;
    setError(null);
    setConfirmandoExclusao(true);
  }

  async function removerAnexo(documentId: string, filename: string) {
    if (!window.confirm(`Remover o anexo "${filename}"? Os demais permanecem.`)) return;
    setAnexBusy(true);
    setAnexMsg(null);
    setAnexErro(null);
    try {
      const res = await deleteDespesaDoc(documentId);
      if (res.ok) {
        setAnexMsg("Anexo removido.");
        router.refresh();
      } else {
        setAnexErro(res.error ?? "Falha ao remover.");
      }
    } finally {
      setAnexBusy(false);
    }
  }

  // Despesa recorrente: repete o mesmo lançamento nos próximos meses.
  const [recorrente, setRecorrente] = useState(false);
  const [recMeses, setRecMeses] = useState("12");

  // Despesa paga por sócio (Seção 3): reconhecida na DRE sem saída de caixa da
  // empresa; se reembolsável, gera obrigação a reembolsar (tela Restituições).
  const [pagoPorSocio, setPagoPorSocio] = useState(false);
  const [socioId, setSocioId] = useState("");
  const [socioData, setSocioData] = useState("");
  const [socioReembolsavel, setSocioReembolsavel] = useState(true);

  // Fase 2 — forma/condição de pagamento e parcelas
  const [formaPagamento, setFormaPagamento] = useState(prefill?.formaPagamento ?? "");
  const [formaDesc, setFormaDesc] = useState("");
  // Prompt U / S 3-B.4 — compra no cartão: qual cartão, data da compra e nº de
  // parcelas; a fatura é calculada pelo ciclo (uma parcela por fatura).
  const [cartaoId, setCartaoId] = useState(prefill?.cartaoId ?? "");
  const [cartaoData, setCartaoData] = useState(prefill?.cartaoDataCompra ?? "");
  const [cartaoParcelas, setCartaoParcelas] = useState("1");
  // Prompt S3 — a Cris preenche a despesa (texto, ditado ou documento),
  // inclusive a recorrência e o "paga por terceiro"; quem grava é Salvar.
  const [daCris, setDaCris] = useState<string[]>([]);
  useCrisFormulario(
    {
      id: isEdit ? "despesa-edicao" : "despesa-nova",
      titulo: isEdit ? "Editar despesa" : "Nova despesa",
      campos: [
        ...(isEdit ? [] : [{ nome: "projeto", rotulo: "Projeto", tipo: "opcao" as const, opcoes: projetos.map((p) => p.nome) }]),
        { nome: "fornecedor", rotulo: "Fornecedor", tipo: "opcao" as const, opcoes: fornecedores.map((f) => f.nome) },
        { nome: "conta", rotulo: "Conta do Plano de Contas", tipo: "opcao" as const, opcoes: contas.map((c) => `${c.code} — ${c.name}`) },
        ...(categoriaDoPlano ? [] : [{ nome: "categoria", rotulo: "Categoria da DRE", tipo: "opcao" as const, opcoes: categoriasDespesa }]),
        { nome: "competencia", rotulo: "Competência", tipo: "mes" as const, dica: "MM/YYYY" },
        { nome: "vencimento", rotulo: "Vencimento", tipo: "data" as const, dica: "MM/DD/YYYY" },
        { nome: "valor", rotulo: "Valor", tipo: "numero" as const, dica: "em reais" },
        { nome: "status", rotulo: "Status", tipo: "opcao" as const, opcoes: ["A pagar", "Pago"] },
        { nome: "obs", rotulo: "Descrição da compra", tipo: "texto" as const },
        { nome: "formaPagamento", rotulo: "Forma de pagamento", tipo: "opcao" as const, opcoes: [...FORMAS_PAGAMENTO] },
        ...(isEdit
          ? []
          : [
              { nome: "recorrente", rotulo: "Despesa recorrente (repete mês a mês)", tipo: "booleano" as const },
              { nome: "recMeses", rotulo: "Quantos meses", tipo: "numero" as const, dica: "2 a 60" },
              { nome: "pagoPorTerceiro", rotulo: "Paga por terceiro", tipo: "booleano" as const },
              { nome: "pagador", rotulo: "Quem desembolsou", tipo: "opcao" as const, opcoes: pagadores.map((x) => x.nome) },
              { nome: "dataPagamentoTerceiro", rotulo: "Data em que o terceiro pagou", tipo: "data" as const, dica: "MM/DD/YYYY" },
              { nome: "reembolsavel", rotulo: "Será reembolsada pela empresa", tipo: "booleano" as const },
            ]),
      ],
    },
    (p) => {
      const v = p.valores;
      const sim = (x: string) => /^(sim|s|true|1)$/i.test(x.trim());
      const proj = v.projeto ? projetos.find((x) => x.nome === v.projeto) : undefined;
      if (proj) setProjeto(proj.id);
      const forn = v.fornecedor ? fornecedores.find((f) => f.nome === v.fornecedor) : undefined;
      if (forn) setFornecedorId(forn.id);
      const conta = v.conta ? contas.find((c) => `${c.code} — ${c.name}` === v.conta) : undefined;
      if (conta) setContaCef(conta.code);
      if (v.categoria) setCategoriaDre(v.categoria);
      if (v.competencia) setCompetencia(v.competencia);
      if (v.vencimento) setVencimento(v.vencimento);
      if (v.valor) setValor(v.valor);
      if (v.status && statusDespesaValido(v.status)) setStatus(v.status);
      if (v.obs) setObs(v.obs);
      if (v.formaPagamento) setFormaPagamento(v.formaPagamento);
      if (v.recorrente) setRecorrente(sim(v.recorrente));
      if (v.recMeses) setRecMeses(v.recMeses);
      if (v.pagoPorTerceiro) setPagoPorSocio(sim(v.pagoPorTerceiro));
      const pag = v.pagador ? pagadores.find((x) => x.nome === v.pagador) : undefined;
      if (pag) {
        setPagoPorSocio(true);
        setSocioId(pag.id);
      }
      if (v.dataPagamentoTerceiro) setSocioData(v.dataPagamentoTerceiro);
      if (v.reembolsavel) setSocioReembolsavel(sim(v.reembolsavel));
      setDaCris(Object.keys(v));
    },
  );
  const noCartao = !isEdit && formaPagamento === "Cartão de crédito";
  const cartaoEscolhido = cartoes.find((c) => c.id === cartaoId) ?? null;
  const faturasPrevistas = noCartao && cartaoEscolhido && cartaoData ? faturasDasParcelas(cartaoData, Math.max(1, Number(cartaoParcelas) || 1), cartaoEscolhido) : [];
  const [condicao, setCondicao] = useState("");
  const [qtdPers, setQtdPers] = useState("2");
  // Parcelas com todos os campos (item 2.1): forma, cheque, banco e status por
  // linha. O painel auxiliar é quem edita — aqui só guardamos o resultado.
  const [parcelas, setParcelas] = useState<ParcelaEditavel[]>([]);
  const [painelParcelas, setPainelParcelas] = useState(false);
  const [bo, setBo] = useState({ linha: "", barras: "", banco: "" });
  const [ch, setCh] = useState({
    numero: "", banco: "", ag: "", conta: "", emitente: "", emissao: "", compensacao: "", status: "",
  });

  /**
   * Abre o painel de parcelas já com a série da condição escolhida.
   *
   * Antes esta função escrevia direto numa grade de três colunas embutida no
   * formulário. Agora ela apenas SEMEIA o painel: quem edita vencimento, valor,
   * forma, cheque, banco e status é a tela auxiliar.
   */
  const abrirPainelParcelas = () => {
    // Simétrico do bloqueio no checkbox: não dá para parcelar uma despesa
    // marcada como recorrente (item 2.7).
    if (conflitoRecorrenteParcelado(recorrente, true)) {
      setError(
        "Esta despesa está marcada como recorrente. Desmarque para configurar parcelas — recorrente repete o custo em vários meses, parcelado divide o pagamento de uma compra só.",
      );
      return;
    }
    setError(null);
    const total = Number(valor) || 0;
    const base = vencimento || competencia || "";
    // Já existem parcelas configuradas? Reabre para edição, sem regerar —
    // regerar apagaria os números de cheque já digitados.
    if (parcelas.length === 0 && condicao && total > 0 && base) {
      const ger = gerarParcelas({
        valorTotal: total,
        condicao,
        dataBase: base,
        qtd: condicao === "personalizado" ? Number(qtdPers) || 1 : undefined,
      });
      setParcelas(
        ger.map((p) => ({
          ...parcelaVazia(formaPagamento, bancoId, ch.emitente),
          vencimento: p.vencimento,
          valor: String(p.valor),
          dataBomPara: formaPagamento === "Cheque" ? p.vencimento : "",
        })),
      );
    }
    setPainelParcelas(true);
  };

  const somaParcelas = parcelas.reduce((a, p) => a + (Number(p.valor) || 0), 0);
  const totalOk = Math.abs(somaParcelas - (Number(valor) || 0)) < 0.01;

  /** Aplica no formulário o que voltou da leitura, com os alertas por campo. */
  function aplicarLeitura(res: PreenchimentoDespesa, qtdArquivos: number) {
    const v = res.valores;
    if (v.projetoId) setProjeto(v.projetoId);
    if (v.fornecedorId) setFornecedorId(v.fornecedorId);
    if (v.contaCef) setContaCef(v.contaCef);
    if (v.categoriaDre) setCategoriaDre(v.categoriaDre);
    if (v.competencia) setCompetencia(v.competencia);
    if (v.vencimento) setVencimento(v.vencimento);
    if (v.valor) setValor(v.valor);
    // Prompt S, 3.2 — a IA só sugere status da lista; o servidor recusa o resto.
    if (v.status && statusDespesaValido(v.status)) setStatus(v.status);
    if (v.obs) setObs(v.obs);
    if (v.formaPagamento) setFormaPagamento(v.formaPagamento);
    if (v.docFiscal) setDocFiscal(v.docFiscal);
    // A data do comprovante serve de sugestão para "despesa paga por sócio" —
    // o caso mais comum de comprovante avulso vindo da obra. Só é usada se a
    // opção for marcada; ficar preenchida no estado não muda nada até lá.
    if (v.dataPagamento) setSocioData(v.dataPagamento);

    setAlertas(res.alertas);
    setLeitura({
      titulo:
        ROTULO_NATUREZA[res.natureza] +
        (qtdArquivos > 1 ? ` · ${qtdArquivos} arquivos` : ""),
      resumo: res.resumo,
      preenchidos: res.preenchidos,
      observacoes: res.observacoes,
    });
    setNotice(null);
    // Subir duas vezes o mesmo documento é o erro mais fácil de cometer neste
    // fluxo (a nota chega por e-mail E por foto do WhatsApp). Como o número da
    // nota acabou de ser lido, a conferência de duplicidade roda sozinha, com
    // os valores recém-lidos — o estado ainda não foi atualizado neste tick.
    setDupAviso(null);
    setDupConfirmada(false);
    if (v.docFiscal) {
      void conferirDuplicidade(v.docFiscal, v.fornecedorId ?? fornecedorId);
    }
  }

  /**
   * Lê os documentos escolhidos. Roda sozinha logo após o upload (é o que o
   * usuário espera: subiu, preencheu) e pode ser repetida pelo botão quando a
   * pessoa troca ou acrescenta um arquivo.
   */
  function ler(lista: File[] = legiveis) {
    if (lista.length === 0) {
      setErroLeitura("Suba um PDF ou uma imagem para preencher o formulário.");
      return;
    }
    setErroLeitura(null);
    setNotice(null);
    const enviados = lista.slice(0, AI_MAX_DOCS);
    const fd = new FormData();
    for (const f of enviados) fd.append("file", f);
    startReading(async () => {
      // A falha da leitura aparece DENTRO do bloco de upload, ao lado dos
      // arquivos. A action RETORNA o erro em vez de lançar: em produção o
      // Next.js esconde a mensagem de erro lançado por Server Action e o
      // usuário via só um texto genérico em inglês.
      try {
        const res = await extractDespesaFromDoc(fd);
        if (res.ok) aplicarLeitura(res.data, enviados.length);
        else setErroLeitura(res.error);
      } catch {
        // Só resta o caso que a action não alcança (rede, sessão expirada).
        setErroLeitura("Falha ao ler o documento — verifique a conexão e tente novamente.");
      }
    });
  }

  /**
   * Procura um lançamento anterior com o mesmo documento fiscal do mesmo
   * fornecedor (CA-04). Só AVISA — quem decide prosseguir é o usuário.
   */
  async function conferirDuplicidade(
    doc: { tipo: string; numero: string; serie: string } = docFiscal,
    fornId: string = fornecedorId,
  ) {
    if (!exigeNumero(doc.tipo) || !doc.numero.trim()) {
      setDupAviso(null);
      return;
    }
    try {
      const dup = await buscarDocumentoDuplicado(
        fornId || null,
        { tipo: doc.tipo, numero: doc.numero, serie: doc.serie },
        edit?.id,
      );
      setDupAviso(dup);
      if (!dup) setDupConfirmada(false);
    } catch {
      // Falha na consulta não pode travar o lançamento — o alerta é auxiliar.
      setDupAviso(null);
    }
  }

  function salvar() {
    setError(null);
    // Documento fiscal: só recusa o que está claramente errado (chave fora do
    // formato). Ausência de número NUNCA bloqueia — a nota chega depois.
    const erroDoc = validarDocumentoFiscal(docFiscal);
    if (erroDoc) {
      setError(erroDoc);
      return;
    }
    if (dupAviso && !dupConfirmada) {
      setError(
        "Este documento já existe para o mesmo fornecedor. Confirme que é um lançamento diferente para prosseguir.",
      );
      return;
    }
    // Item 1.3 — trava também no cliente, para o usuário ver o erro no campo em
    // vez de só depois do round-trip. A trava que vale é a do servidor, em
    // `addDespesa`/`updateDespesa`: a Server Action é chamável diretamente.
    const recusaCategoria = validarCategoriaDespesa(categoriaDre);
    if (recusaCategoria) {
      setErroCategoria(mensagemDeCategoria(recusaCategoria));
      return;
    }
    setErroCategoria(null);
    // Prompt A — a obra é sempre escolhida; nunca cai numa obra implícita.
    if (!projeto) {
      setError("Escolha o projeto da despesa.");
      return;
    }
    // Modo edição: grava as alterações na despesa existente (updateDespesa) e
    // volta para a lista. Não recria parcelas/recorrência nem mexe no caixa.
    if (isEdit && edit) {
      const patch: {
        fornecedorId: string | null;
        bancoId: string | null;
        contaCef: string | null;
        tipoCusto: string | null;
        categoriaDre: string;
        numDoc?: string;
        competencia: string | null;
        vencimento: string | null;
        valor: string;
        status: string;
        obs: string | null;
      } = {
        fornecedorId: fornecedorId || null,
        bancoId: bancoId || null,
        contaCef: contaCef || null,
        tipoCusto: tipoCusto || null,
        categoriaDre,
        competencia: competencia || null,
        vencimento: vencimento || null,
        valor: valor || "0",
        status,
        obs: obs || null,
      };
      // O PED nunca é enviado na edição: é numeração interna imutável (RG-06).
      // Renumerar um documento já emitido quebraria a rastreabilidade com a
      // contabilidade e com os anexos que o referenciam.
      startSaving(async () => {
        try {
          const r = await updateDespesa(edit.id, patch);
          if (!r.ok) {
            setError(r.error);
            return;
          }
          // O documento fiscal vive em tabela própria (RG-06) e é gravado à
          // parte — inclusive quando a nota só chegou agora.
          const resDoc = await salvarDocumentoFiscal({
            despesaId: edit.id,
            tipo: docFiscal.tipo,
            numero: docFiscal.numero,
            serie: docFiscal.serie,
            chaveAcesso: docFiscal.chaveAcesso,
            dataEmissao: docFiscal.dataEmissao,
          });
          if (!resDoc.ok) {
            setError(resDoc.error ?? "Falha ao salvar o documento fiscal.");
            return;
          }
          const url = new URL(window.location.href);
          url.searchParams.delete("edit");
          router.push(`${url.pathname}${url.search}`);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Falha ao salvar as alterações.");
        }
      });
      return;
    }
    const fd = new FormData();
    fd.set("projectId", projeto);
    fd.set("fornecedorId", fornecedorId);
    fd.set("contaCef", contaCef);
    fd.set("tipoCusto", tipoCusto);
    fd.set("categoriaDre", categoriaDre);
    fd.set("bancoId", bancoId);
    // `numDoc` não é enviado: o PED é reservado no servidor, na transação de
    // gravação (RG-06 / item 1.1).
    fd.set("obs", obs);
    fd.set("competencia", competencia);
    fd.set("vencimento", vencimento);
    fd.set("valor", valor || "0");
    fd.set("status", status);
    // Prompt S, 8.2 — a auditoria registra que a origem foi o assistente (a
    // leitura por IA preencheu os campos; o usuário conferiu antes de lançar).
    if (leitura) fd.set("origemIa", "1");
    if (recorrente) {
      fd.set("recorrente", "1");
      fd.set("recorrenciaMeses", recMeses);
    }
    // Fase 2 — forma/condição de pagamento e parcelas
    if (formaPagamento) fd.set("formaPagamento", formaPagamento);
    if (formaPagamento === "Outro" && formaDesc) fd.set("formaPagamentoDesc", formaDesc);
    if (condicao) fd.set("condicaoPagamento", condicao);
    if (condicao === "personalizado") fd.set("qtdParcelas", qtdPers);
    // A grade completa vai para o servidor: cada parcela leva sua forma, seu
    // cheque, seu banco e seu status (item 2.1/2.5).
    if (parcelas.length > 0 && !noCartao) fd.set("parcelasJson", JSON.stringify(parcelas));
    // Prompt L, 3-A.2 — veio do extrato: o movimento é conciliado com este lançamento ao gravar.
    if (!isEdit && prefill?.cashEntryId) fd.set("cashEntryId", prefill.cashEntryId);
    if (!isEdit && prefill?.diariasIds) fd.set("diariasIds", prefill.diariasIds);
    if (!isEdit && prefill?.extratoCartaoId) fd.set("extratoCartaoId", prefill.extratoCartaoId);
    // Prompt U — compra no cartão: o servidor calcula as faturas pelo ciclo.
    if (noCartao) {
      fd.set("cartaoId", cartaoId);
      fd.set("cartaoDataCompra", cartaoData);
      fd.set("cartaoParcelas", cartaoParcelas);
    }
    if (formaPagamento === "Boleto") {
      fd.set("boletoLinhaDigitavel", bo.linha);
      fd.set("boletoCodigoBarras", bo.barras);
      fd.set("boletoBanco", bo.banco);
    }
    if (formaPagamento === "Cheque") {
      fd.set("chequeNumero", ch.numero);
      fd.set("chequeBanco", ch.banco);
      fd.set("chequeAg", ch.ag);
      fd.set("chequeConta", ch.conta);
      fd.set("chequeEmitente", ch.emitente);
      fd.set("chequeDataEmissao", ch.emissao);
      fd.set("chequeDataCompensacao", ch.compensacao);
      fd.set("chequeStatus", ch.status);
    }
    // Despesa paga por sócio
    if (pagoPorSocio && socioId) {
      fd.set("pagoPorSocioId", socioId);
      fd.set("socioDataPagamento", socioData);
      if (socioReembolsavel) fd.set("socioReembolsavel", "1");
    }
    // Documento fiscal — campo PRÓPRIO, separado do PED (RG-06).
    fd.set("docTipo", docFiscal.tipo);
    fd.set("docNumero", docFiscal.numero);
    fd.set("docSerie", docFiscal.serie);
    fd.set("docChaveAcesso", docFiscal.chaveAcesso);
    fd.set("docDataEmissao", docFiscal.dataEmissao);
    // Vários anexos já no lançamento inicial (boleto + NF + comprovante...).
    for (const f of files) fd.append("file", f);
    startSaving(async () => {
      try {
        const r = await addDespesa(fd);
        if (!r.ok) {
          // 3-C.4.3 — recusa de categoria vai para o campo, não para o topo.
          if (r.error === ERRO_CATEGORIA_CREDORA || r.error.startsWith("Selecione a categoria")) setErroCategoria(mensagemDeCategoria(r.error));
          else setError(r.error);
          return;
        }
        // Anexo que falhou depois de a despesa existir: avisa, não desfaz —
        // e avisa como aviso, não como erro (a despesa foi criada).
        if (r.aviso) setNotice(r.aviso);
        // limpa o formulário
        setFornecedorId("");
        setContaCef("");
        setCategoriaDre("");
        setBancoId("");
        setNumDoc("");
        setCompetencia("");
        setVencimento("");
        setValor("");
        setStatus("A pagar");
        setObs("");
        setDocFiscal({ tipo: "SEM_DOC", numero: "", serie: "", chaveAcesso: "", dataEmissao: "" });
        setDupAviso(null);
        setDupConfirmada(false);
        setRecorrente(false);
        setRecMeses("12");
        setCartaoId("");
        setCartaoData("");
        setCartaoParcelas("1");
        setPagoPorSocio(false);
        setSocioId("");
        setSocioData("");
        setSocioReembolsavel(true);
        setFormaPagamento("");
        setFormaDesc("");
        setCondicao("");
        setParcelas([]);
        setBo({ linha: "", barras: "", banco: "" });
        setCh({ numero: "", banco: "", ag: "", conta: "", emitente: "", emissao: "", compensacao: "", status: "" });
        setFiles([]);
        limparLeitura();
        setNotice(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao lançar a despesa.");
      }
    });
  }

  const busy = reading || saving;

  return (
    <Card className="mb-6">
      <CardContent className="space-y-4 p-5">
        {isEdit && (
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[var(--color-ink)]">
              Editar despesa {edit?.numDoc ? `nº ${edit.numDoc}` : ""}
            </h2>
            <span className="text-[12px] text-[var(--color-ink3)]">
              {edit?.projectNome}
            </span>
          </div>
        )}
        {/* Prompt R, 1.4 — quem veio de uma parcela em Contas a Pagar precisa
            saber que aqui se edita o cabeçalho, não a parcela. */}
        {isEdit && parcelaDeOrigem && (
          <p role="status" className="rounded-[8px] border border-[var(--color-warning)]/40 bg-[#fef3c7]/60 px-3 py-2 text-[12.5px] text-[#92400e]">
            Você veio da <strong>parcela {parcelaDeOrigem}</strong> em Contas a Pagar. Este formulário edita o <strong>cabeçalho</strong> da despesa (valor total, datas e campos comuns), não a parcela isolada.
          </p>
        )}
        {/* Prompt L, 3-A.2 — lançamento encaminhado do extrato. */}
        {!isEdit && prefill?.cashEntryId && (
          <p role="status" className="rounded-[8px] border border-[var(--color-accent2)]/30 bg-[var(--color-accent4)] px-3 py-2 text-[12.5px] text-[var(--color-ink2)]">
            Veio do extrato: data, valor e histórico já vieram preenchidos. Complete a competência, a categoria e o documento fiscal; ao lançar, o movimento do extrato é conciliado com esta despesa.
          </p>
        )}
        {/* Prompt AT §6.2 — compra lançada a partir da linha do extrato do cartão. */}
        {!isEdit && prefill?.extratoCartaoId && (
          <p role="status" className="rounded-[8px] border border-[var(--color-accent2)]/30 bg-[var(--color-accent4)] px-3 py-2 text-[12.5px] text-[var(--color-ink2)]" data-veio-do-cartao>
            Veio do extrato do cartão: cartão, data da compra, valor e descrição já vieram preenchidos. Complete o projeto, a categoria e o fornecedor; ao lançar, a linha do extrato é conciliada com esta compra.
          </p>
        )}
        {/* Prompt U — compra no cartão: valor, vencimento, forma e status seguem a fatura. */}
        {isEdit && edit?.cartao && (
          <p role="status" className="rounded-[8px] border border-[var(--color-accent2)]/30 bg-[var(--color-accent4)] px-3 py-2 text-[12.5px] text-[var(--color-ink2)]">
            Compra no cartão <strong>{edit.cartao.nome}</strong>: valor, vencimento, forma e status seguem a fatura e não mudam aqui. Para corrigir, cancele e lance de novo. A competência continua livre.
          </p>
        )}
        {/* Anexos da despesa — permite visualizar/baixar o documento original. */}
        {isEdit && (
          <div className="rounded-[10px] border border-[var(--color-accent2)]/12 bg-[var(--color-surface2)] p-4">
            <h3 className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">
              Documento anexado
            </h3>
            {(edit?.documentos?.length ?? 0) === 0 ? (
              <p className="text-[12px] text-[var(--color-ink3)]">
                Nenhum documento anexado a esta despesa.
                {edit?.r2Configured === false
                  ? " (Storage não configurado — defina as variáveis R2_*.)"
                  : " Use o campo abaixo para anexar."}
              </p>
            ) : (
              <ul className="space-y-2">
                {edit?.documentos?.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--color-accent2)]/12 bg-[var(--color-surface)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[var(--color-ink)]">
                        {doc.filename}
                      </p>
                      <p className="text-[11px] text-[var(--color-ink3)]">
                        {doc.tipo ? `${doc.tipo} · ` : ""}
                        {doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : ""}
                        {doc.uploadedAt
                          ? ` · ${new Date(doc.uploadedAt).toLocaleDateString("pt-BR")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener"
                          download
                          className="rounded-[6px] border border-[var(--color-accent2)]/30 px-3 py-1.5 text-[12px] font-medium text-[var(--color-accent2)] hover:bg-[var(--color-accent2)]/8"
                        >
                          Abrir / Baixar
                        </a>
                      ) : (
                        <span className="text-[11px] text-[var(--color-ink4)]">
                          indisponível
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={anexBusy}
                        onClick={() => removerAnexo(doc.id, doc.filename)}
                        className="rounded-[6px] border border-[var(--color-danger)]/30 px-2.5 py-1.5 text-[12px] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8 disabled:opacity-50"
                        title="Remover este anexo (os demais permanecem)"
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Anexar MAIS documentos — disponível em qualquer momento do ciclo
                de vida: antes/depois do pagamento e antes/depois da conciliação.
                Sem restrição de tipo: além de PDF e imagem, a despesa pode
                receber planilha, XML da nota, e-mail, contrato etc. */}
            <div className="mt-3 border-t border-[var(--color-accent2)]/12 pt-3">
              <UploadDocumentos
                className="border-0 bg-transparent p-0"
                titulo="Anexar mais documentos"
                descricao="Quantos forem necessários, em qualquer formato (até 10 MB cada). Os anexos já existentes são preservados."
                arquivos={novosAnexos}
                onArquivos={(lista) => {
                  setNovosAnexos(lista);
                  setAnexMsg(null);
                  setAnexErro(null);
                }}
                desabilitado={anexBusy}
                limiteTotalBytes={LIMITE_ENVIO}
                acao={{
                  label:
                    novosAnexos.length > 0
                      ? `Anexar ${novosAnexos.length} arquivo(s)`
                      : "Anexar ao lançamento",
                  labelOcupado: "Enviando…",
                  ocupado: anexBusy,
                  desabilitada: novosAnexos.length === 0,
                  motivo:
                    novosAnexos.length === 0
                      ? "Suba ao menos um arquivo para anexar."
                      : undefined,
                  onClick: enviarAnexos,
                }}
                avisos={[
                  ...(anexMsg ? ([{ tom: "ok" as const, texto: anexMsg }] as const) : []),
                  ...(anexErro ? ([{ tom: "erro" as const, texto: anexErro }] as const) : []),
                ]}
              />
            </div>
          </div>
        )}
        {/* Documento + leitura por IA — só no cadastro de uma nova despesa. */}
        {!isEdit && (
          <UploadDocumentos
            titulo="Documentos da despesa"
            descricao={
              aiConfigured
                ? "Suba a nota, o cupom, o boleto ou o comprovante — PDF ou imagem. Pode subir mais de um arquivo da mesma compra (a nota e o comprovante, por exemplo) que a IA lê tudo junto e preenche o formulário abaixo."
                : "Suba a nota, o cupom, o boleto ou o comprovante — em qualquer formato. Os arquivos ficam anexados à despesa quando você lançar."
            }
            arquivos={files}
            onArquivos={(lista, adicionados) => {
              setFiles(lista);
              setNotice(null);
              setError(null);
              limparLeitura();
              // Subiu → já preenche. O botão "Preencher formulário" continua
              // ali para refazer a leitura (trocou o arquivo, corrigiu a foto)
              // e para quando a pessoa preferir disparar na mão.
              const paraLer = adicionados.filter((f) => legivelPelaIa(f.type));
              if (aiConfigured && paraLer.length > 0) {
                ler(lista.filter((f) => legivelPelaIa(f.type)));
              }
            }}
            desabilitado={busy}
            marcarLegibilidade={aiConfigured}
            limiteTotalBytes={LIMITE_ENVIO}
            acao={{
              label: "Preencher formulário",
              labelOcupado: "Lendo documentos…",
              labelRepetir: "Preencher novamente",
              repetiu: !!leitura,
              ocupado: reading,
              desabilitada: !aiConfigured || legiveis.length === 0,
              // O motivo só se repete ao lado do botão quando é algo que a
              // pessoa resolve ali (subir um arquivo). Falta de chave já está
              // explicada no aviso abaixo — repetir só polui.
              motivoVisivel: aiConfigured,
              motivo: !aiConfigured
                ? "Preenchimento automático indisponível neste servidor."
                : legiveis.length === 0
                  ? "Suba um PDF ou uma imagem para preencher o formulário."
                  : "Ler os documentos e preencher os campos abaixo",
              onClick: () => ler(),
            }}
            avisos={[
              ...(erroLeitura
                ? ([{ tom: "erro" as const, texto: erroLeitura }] as const)
                : []),
              ...(aiConfigured
                ? ([
                    {
                      tom: "info" as const,
                      texto:
                        "O que a IA não achar — ou achar com dúvida — fica marcado com alerta no campo. Nada é gravado antes de você conferir e lançar.",
                    },
                  ] as const)
                : ([
                    {
                      tom: "atencao" as const,
                      texto: (
                        <>
                          <strong>Preenchimento automático indisponível.</strong> A
                          chave de IA não está configurada neste servidor
                          (ANTHROPIC_API_KEY), então os campos precisam ser
                          preenchidos à mão. O upload e o vínculo dos arquivos com a
                          despesa continuam funcionando normalmente.{" "}
                          <a
                            href="/diagnosticoia"
                            className="font-medium text-[var(--color-accent2)] underline"
                          >
                            Abrir o diagnóstico de IA
                          </a>
                        </>
                      ),
                    },
                  ] as const)),
              ...(aiConfigured && legiveis.length > AI_MAX_DOCS
                ? ([
                    {
                      tom: "info" as const,
                      texto: `A leitura usa os ${AI_MAX_DOCS} primeiros PDFs/imagens da lista; o restante é apenas anexado.`,
                    },
                  ] as const)
                : []),
              ...(r2Configured
                ? []
                : ([
                    {
                      tom: "atencao" as const,
                      texto:
                        "Armazenamento de arquivos não configurado (variáveis R2_*) — os documentos não ficarão guardados no lançamento.",
                    },
                  ] as const)),
            ]}
          />
        )}

        {/* Placar da leitura: o que foi preenchido e o que ficou pendente. */}
        {leitura && (
          <ResumoLeituraIA
            titulo={leitura.titulo}
            resumo={leitura.resumo}
            preenchidos={leitura.preenchidos}
            alertas={alertas as Record<string, Alerta>}
            rotulos={ROTULO_CAMPO}
            observacoes={leitura.observacoes}
            onFechar={limparLeitura}
          />
        )}

        {/* Campos da despesa */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CampoIA label="Projeto" alerta={alertas.projeto} className="sm:col-span-2">
            <Select
              value={projeto}
              onChange={(e) => {
                setProjeto(e.target.value);
                limparAlerta("projeto");
              }}
              disabled={isEdit}
            >
              {!projeto && (
                <option value="" disabled>
                  Selecione o projeto
                </option>
              )}
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </CampoIA>
          <CampoIA label="Fornecedor" alerta={alertas.fornecedor} className="sm:col-span-2">
            <Select
              value={fornecedorId}
              onChange={(e) => {
                setFornecedorId(e.target.value);
                limparAlerta("fornecedor");
              }}
            >
              <option value="">Selecione...</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </CampoIA>
          {/* ── Documento Fiscal (item 1.2 / RG-06) ─────────────────────────
              O PED acima é numeração INTERNA da empresa; aqui entra o número da
              nota, que é do emitente. Tudo é opcional: a nota costuma chegar
              depois do lançamento e pode ser completada a qualquer tempo. */}
          <div className="sm:col-span-4 rounded-[10px] border border-[var(--color-accent2)]/15 bg-[var(--color-surface2)]/40 p-3">
            <p className="mb-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink3)]">
              Documento fiscal · opcional — a nota pode ser lançada depois
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <CampoIA label="Tipo" alerta={alertas.docFiscalTipo}>
                <Select
                  value={docFiscal.tipo}
                  onChange={(e) => {
                    setDocFiscal((d) => ({ ...d, tipo: e.target.value }));
                    limparAlerta("docFiscalTipo");
                    setDupAviso(null);
                    setDupConfirmada(false);
                  }}
                >
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </CampoIA>
              <CampoIA label="Nº do documento" alerta={alertas.docFiscalNumero}>
                <Input
                  value={docFiscal.numero}
                  disabled={!exigeNumero(docFiscal.tipo)}
                  onChange={(e) => {
                    setDocFiscal((d) => ({ ...d, numero: e.target.value }));
                    limparAlerta("docFiscalNumero");
                    setDupAviso(null);
                    setDupConfirmada(false);
                  }}
                  onBlur={() => conferirDuplicidade()}
                  placeholder={exigeNumero(docFiscal.tipo) ? "ex.: 12345" : "—"}
                />
              </CampoIA>
              <CampoIA label="Série" alerta={alertas.docFiscalSerie}>
                <Input
                  value={docFiscal.serie}
                  disabled={!exigeNumero(docFiscal.tipo)}
                  onChange={(e) => {
                    setDocFiscal((d) => ({ ...d, serie: e.target.value }));
                    limparAlerta("docFiscalSerie");
                  }}
                  onBlur={() => conferirDuplicidade()}
                  placeholder="1"
                />
              </CampoIA>
              <CampoIA label="Emissão" alerta={alertas.docFiscalEmissao}>
                <DateField
                  value={docFiscal.dataEmissao}
                  onChange={editando("docFiscalEmissao", (v: string) =>
                    setDocFiscal((d) => ({ ...d, dataEmissao: v })),
                  )}
                  disabled={!exigeNumero(docFiscal.tipo)}
                />
              </CampoIA>
              <CampoIA label="Chave de acesso (44 dígitos)" alerta={alertas.docFiscalChave}>
                <Input
                  value={docFiscal.chaveAcesso}
                  disabled={!exigeNumero(docFiscal.tipo)}
                  onChange={(e) => {
                    setDocFiscal((d) => ({ ...d, chaveAcesso: e.target.value }));
                    limparAlerta("docFiscalChave");
                  }}
                  placeholder="opcional"
                />
              </CampoIA>
            </div>
            {/* Duplicidade é AVISO, nunca bloqueio: numeração de NF é sequencial
                por emitente e série, então repetição pode ser legítima (D2). */}
            {dupAviso && (
              <div className="mt-2 rounded-[8px] border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-2.5 text-[12.5px]">
                <p className="text-[var(--color-ink)]">
                  Já existe um lançamento com este documento para o mesmo
                  fornecedor:{" "}
                  <a
                    href={`/despesas?proj=${dupAviso.projectId}&tab=lancamentos&edit=${dupAviso.despesaId}`}
                    target="_blank"
                    rel="noopener"
                    className="font-[family-name:var(--font-mono)] text-[var(--color-accent2)] hover:underline"
                  >
                    {dupAviso.numDoc ?? "ver lançamento"}
                  </a>{" "}
                  · {dupAviso.projectName}
                  {dupAviso.competencia ? ` · ${dupAviso.competencia}` : ""}
                </p>
                <label className="mt-1.5 flex items-center gap-2 text-[var(--color-ink2)]">
                  <input
                    type="checkbox"
                    checked={dupConfirmada}
                    onChange={(e) => setDupConfirmada(e.target.checked)}
                  />
                  Confirmo que este é um lançamento diferente e quero prosseguir.
                </label>
              </div>
            )}
          </div>

          <CampoIA label="Conta do plano de contas" alerta={alertas.contaCef}>
            <Select
              value={contaCef}
              onChange={(e) => {
                setContaCef(e.target.value);
                limparAlerta("contaCef");
              }}
            >
              <option value="">Selecione...</option>
              {contas.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
          </CampoIA>
          {/* 0079 — o padrão direto/indireto vem da conta; o lançamento pode tratar diferente. */}
          <label className="block text-[12px] text-[var(--color-ink2)]">
            <span className="mb-1 block">Custo direto ou indireto</span>
            <Select value={tipoCusto} onChange={(e) => setTipoCusto(e.target.value)} aria-label="Custo direto ou indireto">
              <option value="">Padrão da conta</option>
              <option value="direto">Direto deste projeto</option>
              <option value="indireto">Indireto (compartilhado)</option>
            </Select>
          </label>
          {/* Só categorias de natureza devedora: uma despesa não pode ser
              classificada em conta de receita (item 1.3 / RG-01). */}
          <CampoIA label="Categoria DRE" alerta={alertas.categoriaDre ?? (erroCategoria ? { nivel: "faltando", motivo: erroCategoria } : undefined)}>
            {categoriaDoPlano && (
              <p className="mb-1 text-[11.5px] text-[var(--color-ink3)]" data-categoria-travada>
                {travadaEmReceita
                  ? `A conta ${contaCef} é de receita no Plano de Contas: escolha uma conta de despesa.`
                  : categoriaTravada
                    ? "Definida pela conta no Plano de Contas."
                    : "Escolha a conta: a categoria vem do Plano de Contas."}
              </p>
            )}
            <Select
              value={categoriaDre}
              disabled={!!categoriaDoPlano && (!!categoriaTravada || !contaCef)}
              aria-invalid={!!erroCategoria || (categoriaLegadaInvalida && categoriaDre === edit?.categoriaDre) || undefined}
              onChange={(e) => {
                setCategoriaDre(e.target.value);
                setErroCategoria(null);
                limparAlerta("categoriaDre");
              }}
            >
              <option value="">Selecione...</option>
              {categoriaLegadaInvalida && (
                <option value={edit!.categoriaDre!} disabled>
                  {edit!.categoriaDre} (inválida — troque para salvar)
                </option>
              )}
              {categoriasDespesa.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </CampoIA>
          <div>
            <Label>Banco</Label>
            <Select value={bancoId} onChange={(e) => setBancoId(e.target.value)}>
              <option value="">—</option>
              {bancos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.banco} · {b.tipo}
                </option>
              ))}
            </Select>
          </div>
          {/* Item 1.1 — o PED é numeração INTERNA da empresa: gerada no
              servidor, dentro da transação de gravação, contínua e imutável
              depois de criada. Nunca foi editável por digitação (isso é papel
              do bloco Documento Fiscal, onde entra o número da nota). */}
          <div>
            <Label>Nº do pedido (interno)</Label>
            <div className="flex items-center gap-1.5">
              <Input
                value={isEdit ? numDoc || "—" : "Será gerado ao salvar"}
                disabled
                readOnly
                className={isEdit ? "font-[family-name:var(--font-mono)]" : ""}
              />
              {isEdit && numDoc && (
                <button
                  type="button"
                  title="Copiar o número"
                  onClick={() => {
                    navigator.clipboard?.writeText(numDoc).then(
                      () => setNotice(`Número ${numDoc} copiado.`),
                      () => setNotice(null),
                    );
                  }}
                  className="shrink-0 rounded-[6px] border border-[var(--color-accent2)]/20 px-2 py-1.5 text-[11px] text-[var(--color-accent2)] hover:bg-[var(--color-surface2)]"
                >
                  Copiar
                </button>
              )}
            </div>
          </div>
          <CampoIA label="Competência" alerta={alertas.competencia}>
            <MonthField
              value={competencia}
              onChange={editando("competencia", setCompetencia)}
            />
          </CampoIA>
          <CampoIA label="Vencimento" alerta={alertas.vencimento}>
            <DateField value={vencimento} onChange={editando("vencimento", setVencimento)} />
          </CampoIA>
          <CampoIA label="Valor" alerta={alertas.valor}>
            <MoneyInput value={valor} onChange={editando("valor", setValor)} />
          </CampoIA>
          <CampoIA label="Status" alerta={alertas.status}>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                limparAlerta("status");
              }}
            >
              <option>A pagar</option>
              <option>Pago</option>
            </Select>
          </CampoIA>
          {/* Descrição/observação da compra — campo PRÓPRIO, separado do nº do
              pedido. Serve para explicar o objeto da compra. */}
          <CampoIA
            label="Descrição / observação da compra"
            alerta={alertas.obs}
            className="col-span-2 sm:col-span-4"
          >
            <Input
              value={obs}
              onChange={(e) => {
                setObs(e.target.value);
                limparAlerta("obs");
              }}
              placeholder="Objeto da compra (ex.: 20 sacos de cimento CP-II para a laje do 2º pav.)"
            />
          </CampoIA>
          {/* Recorrência, sócio pagador e parcelamento só valem no cadastro
              de uma nova despesa — a edição ajusta apenas os dados da despesa
              existente, sem recriar lançamentos, parcelas ou caixa. */}
          {!isEdit && (
          <>
          {/* Despesa recorrente — repete nos próximos meses */}
          <div className="col-span-2 flex flex-wrap items-end gap-4 rounded-[10px] border border-[var(--color-accent2)]/12 bg-[var(--color-surface2)] p-4 sm:col-span-4">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(e) => {
                  // Item 2.7 — recorrente e parcelado são coisas diferentes e
                  // não se combinam: recorrente replica o MESMO custo em várias
                  // competências; parcelado fraciona o pagamento de um custo
                  // único. Marcar os dois replicaria a despesa na DRE por
                  // competência de parcela, que é erro de competência (RG-01).
                  if (e.target.checked && conflitoRecorrenteParcelado(true, parcelas.length > 0)) {
                    setError(
                      "Recorrente e parcelado são coisas diferentes. Recorrente repete o mesmo custo em vários meses (aluguel, salário); parcelado fraciona o pagamento de uma compra única. Limpe as parcelas para marcar recorrente.",
                    );
                    return;
                  }
                  setError(null);
                  setRecorrente(e.target.checked);
                }}
                className="h-4 w-4 accent-[var(--color-accent2)]"
              />
              Despesa recorrente (repete nos próximos meses)
            </label>
            {recorrente && (
              <div className="flex items-end gap-2">
                <div>
                  <Label>Repetir por (meses)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={60}
                    value={recMeses}
                    onChange={(e) => setRecMeses(e.target.value)}
                    className="w-28"
                  />
                </div>
                <p className="pb-2 text-[11.5px] text-[var(--color-ink3)]">
                  Serão criados {Math.max(1, Number(recMeses) || 1)} lançamentos mensais
                  (competência e vencimento avançam 1 mês a cada um).
                </p>
              </div>
            )}
          </div>
          {/* Despesa paga por sócio (Seção 3) */}
          <div className="col-span-2 space-y-3 rounded-[10px] border border-[var(--color-accent2)]/12 bg-[var(--color-surface2)] p-4 sm:col-span-4">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={pagoPorSocio}
                onChange={(e) => setPagoPorSocio(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent2)]"
              />
              Paga por terceiro — sócio ou pagador cadastrado (não movimenta o caixa da empresa no lançamento)
            </label>
            {pagoPorSocio && (
              <>
                {pagadores.length === 0 && (
                  <p className="text-[12px] text-[var(--color-warning)]">
                    Nenhum cadastro ativo tem o papel &ldquo;Pagador por Terceiro&rdquo;. Conceda o papel em{" "}
                    <a href="/restituicoes" className="underline">Ressarcimentos</a> (bloco Pagadores terceiros) — item a item.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <Label>Quem desembolsou</Label>
                    <Select value={socioId} onChange={(e) => setSocioId(e.target.value)}>
                      <option value="">— selecione —</option>
                      {pagadores.map((so) => (
                        <option key={so.id} value={so.id}>
                          {so.nome}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Data do pagamento</Label>
                    <DateField value={socioData} onChange={setSocioData} />
                  </div>
                  <div className="flex items-end sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--color-ink)]">
                      <input
                        type="checkbox"
                        checked={socioReembolsavel}
                        onChange={(e) => setSocioReembolsavel(e.target.checked)}
                        className="h-4 w-4 accent-[var(--color-accent2)]"
                      />
                      Será reembolsada pela empresa
                    </label>
                  </div>
                </div>
                <p className="text-[11.5px] text-[var(--color-ink3)]">
                  {socioReembolsavel
                    ? "Gera uma obrigação a ressarcir a quem desembolsou, na mesma transação. O caixa só se move quando o ressarcimento for registrado (tela Ressarcimentos)."
                    : "Paga definitivamente por quem desembolsou (sócio): registrada na DRE/projeto, sem obrigação e sem movimentar o caixa da empresa."}
                </p>
              </>
            )}
          </div>
          {/* Pagamento & parcelamento (Fase 2) */}
          <div
            className={`col-span-2 space-y-3 rounded-[10px] border border-[var(--color-accent2)]/12 bg-[var(--color-surface2)] p-4 sm:col-span-4 ${
              pagoPorSocio ? "hidden" : ""
            }`}
          >
            <h3 className="text-[13px] font-semibold text-[var(--color-ink)]">
              Pagamento & parcelamento
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CampoIA label="Forma de pagamento" alerta={alertas.formaPagamento}>
                <Select
                  value={formaPagamento}
                  onChange={(e) => {
                    setFormaPagamento(e.target.value);
                    limparAlerta("formaPagamento");
                  }}
                >
                  <option value="">—</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </CampoIA>
              {formaPagamento === "Outro" && (
                <div>
                  <Label>Descrição da forma</Label>
                  <Input value={formaDesc} onChange={(e) => setFormaDesc(e.target.value)} />
                </div>
              )}
              {noCartao && (
                <>
                  <div>
                    <Label>Cartão</Label>
                    <Select value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} aria-label="Cartão">
                      <option value="">— selecione —</option>
                      {cartoes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Data da compra</Label>
                    <DateField value={cartaoData} onChange={setCartaoData} />
                  </div>
                  <div>
                    <Label>Parcelas no cartão</Label>
                    <Input type="number" min={1} max={48} value={cartaoParcelas} onChange={(e) => setCartaoParcelas(e.target.value)} aria-label="Parcelas no cartão" />
                  </div>
                </>
              )}
              {!noCartao && (
              <div>
                <Label>Condição</Label>
                <Select value={condicao} onChange={(e) => setCondicao(e.target.value)}>
                  <option value="">—</option>
                  {CONDICOES_PAGAMENTO.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              )}
              {!noCartao && condicao === "personalizado" && (
                <div>
                  <Label>Nº de parcelas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={qtdPers}
                    onChange={(e) => setQtdPers(e.target.value)}
                  />
                </div>
              )}
              {!noCartao && (
              <div className="flex items-end">
                <Button type="button" variant="outline" onClick={abrirPainelParcelas}>
                  {parcelas.length > 0
                    ? `Editar ${parcelas.length} parcela(s)`
                    : "Configurar parcelas"}
                </Button>
              </div>
              )}
            </div>
            {noCartao && (
              <p className="text-[11.5px] text-[var(--color-ink3)]" role="status">
                {cartoes.length === 0
                  ? "Nenhum cartão ativo cadastrado — cadastre em Cartões de Crédito."
                  : faturasPrevistas.length === 0
                    ? "Nenhuma saída de caixa agora: a compra fica vinculada à fatura do ciclo e o caixa sai no pagamento da fatura. A competência é a informada acima."
                    : `Nenhuma saída de caixa agora. ${faturasPrevistas.length === 1 ? "Cai na fatura" : `1ª parcela na fatura`} que fecha ${dateBR(faturasPrevistas[0].fechamento)} e vence ${dateBR(faturasPrevistas[0].vencimento)}${faturasPrevistas.length > 1 ? `; última na que vence ${dateBR(faturasPrevistas[faturasPrevistas.length - 1].vencimento)}` : ""}. A competência continua a informada acima.`}
              </p>
            )}

            {/* Campos de boleto */}
            {formaPagamento === "Boleto" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input placeholder="Linha digitável" value={bo.linha} onChange={(e) => setBo({ ...bo, linha: e.target.value })} />
                <Input placeholder="Código de barras" value={bo.barras} onChange={(e) => setBo({ ...bo, barras: e.target.value })} />
                <Input placeholder="Banco emissor" value={bo.banco} onChange={(e) => setBo({ ...bo, banco: e.target.value })} />
              </div>
            )}
            {/* Campos de cheque */}
            {formaPagamento === "Cheque" && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Input placeholder="Nº do cheque" value={ch.numero} onChange={(e) => setCh({ ...ch, numero: e.target.value })} />
                <Input placeholder="Banco" value={ch.banco} onChange={(e) => setCh({ ...ch, banco: e.target.value })} />
                <Input placeholder="Agência" value={ch.ag} onChange={(e) => setCh({ ...ch, ag: e.target.value })} />
                <Input placeholder="Conta" value={ch.conta} onChange={(e) => setCh({ ...ch, conta: e.target.value })} />
                <Input placeholder="Emitente" value={ch.emitente} onChange={(e) => setCh({ ...ch, emitente: e.target.value })} />
                <div><DateField value={ch.emissao} onChange={(v) => setCh({ ...ch, emissao: v })} /></div>
                <div><DateField value={ch.compensacao} onChange={(v) => setCh({ ...ch, compensacao: v })} /></div>
                <Input placeholder="Status do cheque" value={ch.status} onChange={(e) => setCh({ ...ch, status: e.target.value })} />
              </div>
            )}

            {/* Tela auxiliar de parcelas (item 2.1) — cada linha com sua forma,
                seu cheque, seu banco e seu status. */}
            <ParcelasEditor
              aberto={painelParcelas}
              parcelas={parcelas}
              valorTotal={valor}
              bancos={bancos}
              formaPadrao={formaPagamento}
              bancoPadrao={bancoId}
              emitentePadrao={ch.emitente}
              dataBase={vencimento || competencia || ""}
              onFechar={() => setPainelParcelas(false)}
              onConfirmar={(linhas, total) => {
                setParcelas(linhas);
                // Modo bottom-up: sem total no cabeçalho, o total do pedido
                // passa a ser a soma das parcelas (item 2.3).
                if (!(Number(valor) > 0) && total > 0) setValor(String(total));
                setPainelParcelas(false);
              }}
            />

            {/* Resumo das parcelas — o detalhe vive no painel auxiliar. */}
            {parcelas.length > 0 && (
              <div className="rounded-[8px] border border-[var(--color-accent2)]/15 bg-[var(--color-surface2)]/50 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-3 text-[13px]">
                  <strong className="text-[var(--color-ink)]">
                    {parcelas.length} parcela(s)
                  </strong>
                  <span
                    className={`font-[family-name:var(--font-mono)] ${
                      totalOk ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
                    }`}
                  >
                    soma {somaParcelas.toFixed(2)}
                    {(Number(valor) || 0) > 0 && ` / total ${(Number(valor) || 0).toFixed(2)}`}
                    {totalOk ? " ✓" : " — não fecha"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPainelParcelas(true)}
                    className="text-[12.5px] text-[var(--color-accent2)] hover:underline"
                  >
                    Editar parcelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setParcelas([])}
                    className="text-[12.5px] text-[var(--color-ink3)] hover:underline"
                  >
                    Limpar
                  </button>
                </div>
                <div className="tbl-scroll overflow-x-auto">
                  <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                      <tr className="text-left font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink4)]">
                        <th className="py-1 pr-3">#</th>
                        <th className="py-1 pr-3">Vencimento</th>
                        <th className="py-1 pr-3 text-right">Valor</th>
                        <th className="py-1 pr-3">Forma</th>
                        <th className="py-1 pr-3">Cheque</th>
                        <th className="py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelas.map((p, i) => (
                        <tr key={i} className="border-t border-[var(--color-accent2)]/8">
                          <td className="py-1 pr-3 font-[family-name:var(--font-mono)] text-[var(--color-ink3)]">
                            {i + 1}
                          </td>
                          <td className="py-1 pr-3 font-[family-name:var(--font-mono)]">
                            {p.vencimento ? dateBR(p.vencimento) : "—"}
                          </td>
                          <td className="py-1 pr-3 text-right font-[family-name:var(--font-mono)]">
                            {(Number(p.valor) || 0).toFixed(2)}
                          </td>
                          <td className="py-1 pr-3">{p.forma || "—"}</td>
                          <td className="py-1 pr-3 font-[family-name:var(--font-mono)]">
                            {p.numeroCheque || "—"}
                          </td>
                          <td className="py-1 text-[var(--color-ink3)]">{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          </>
          )}

          <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={busy || (!isEdit && parcelas.length > 0 && !totalOk)}
              onClick={salvar}
            >
              {saving
                ? isEdit
                  ? "Salvando…"
                  : "Lançando…"
                : isEdit
                  ? "Salvar alterações"
                  : "Lançar despesa"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("edit");
                  router.push(`${url.pathname}${url.search}`);
                }}
              >
                Voltar
              </Button>
            )}
            {isEdit && canExcluir && (
              <div className="ml-auto flex items-center gap-2">
                {/* Cancelamento LÓGICO — preserva o histórico. É a via segura e
                    por isso vem antes da exclusão física. */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={cancelarDespesaAtual}
                  title="Cancelamento lógico: a despesa deixa de contar nos relatórios, mas o histórico é preservado"
                >
                  Cancelar despesa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={excluirDespesa}
                  className="border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/8"
                  title="Exclusão física: apaga a despesa definitivamente"
                >
                  Excluir
                </Button>
              </div>
            )}
          </div>
          {isEdit && canExcluir && confirmandoExclusao && edit && (
            <ConfirmarExclusaoDespesa despesaId={edit.id} onCancelar={() => setConfirmandoExclusao(false)} onExcluida={voltarParaLista} />
          )}
        </div>

        {notice && (
          <p className="text-xs text-[var(--color-accent)]">{notice}</p>
        )}
        {daCris.length > 0 && !error && (
          <p role="status" data-cris-preencheu className="text-[12.5px] text-[var(--color-ink2)]">
            A Cris preencheu {daCris.length} campo(s). Confira e clique em Salvar — nada foi gravado ainda.
          </p>
        )}
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      </CardContent>
    </Card>
  );
}

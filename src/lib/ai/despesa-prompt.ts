/**
 * O texto que vai para a IA na leitura de uma despesa — separado em duas
 * partes, e a separação é o ponto deste módulo.
 *
 * A conta da API é cobrada por token, e a maior parte do que enviamos em cada
 * leitura NÃO muda: o plano de contas e as regras. Só o documento muda. Colocando o que é estável no `system` e
 * marcando um ponto de cache, essa parte passa a ser cobrada ~10% nas leituras
 * seguintes (a janela de cache é curta, mas o uso real é lançar vários
 * documentos em sequência — exatamente o caso que ela cobre).
 *
 * Para o cache valer, o prefixo precisa ser IDÊNTICO byte a byte entre as
 * chamadas: por isso as listas são ordenadas aqui, e não na consulta ao banco.
 * Qualquer variação de ordem invalidaria o cache em silêncio.
 *
 * Módulo PURO: testado em `despesa-prompt.test.ts`.
 */

/**
 * Decisão de 01/10/2026 (BE-2, item c): vai ao modelo SÓ o documento — nada
 * do cadastro de pessoas ou empresas entra no prompt (fornecedores com CPF/CNPJ,
 * a própria empresa, projetos). O casamento com o cadastro é feito DEPOIS da
 * leitura, aqui no servidor (`montarPreenchimentoDespesa`). Ficam só listas
 * de configuração que não identificam ninguém: o plano de contas, as
 * categorias e os tipos de documento fiscal (constantes do sistema).
 */
export interface ContextoLeituraDespesa {
  contas: { code: string; name: string }[];
  categorias: readonly string[];
  tiposDocumento: readonly { id: string; label: string }[];
}

/** Teto de listagem: o que passa disso não cabe no prompt sem virar custo. */
const MAX_CONTAS = 400;

/**
 * Parte ESTÁVEL do prompt (vai em `system`, com ponto de cache): o plano de
 * contas e as regras de leitura. Só muda quando o plano de contas muda.
 */
export function promptSistemaDespesa(ctx: ContextoLeituraDespesa): string {
  const contaList =
    [...ctx.contas]
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      .slice(0, MAX_CONTAS)
      .map((c) => `- ${c.code} — ${c.name}`)
      .join("\n") || "(nenhum cadastrado)";
  const tipoList = ctx.tiposDocumento.map((t) => `- ${t.id} = ${t.label}`).join("\n");

  return (
    "Você lê documentos de despesa de uma consultoria ambiental (nota fiscal, cupom, boleto, " +
    "comprovante de pagamento, recibo, foto de papel — ex.: hospedagem da equipe técnica, combustível, " +
    "análises laboratoriais, taxas de órgão ambiental) e preenche o lançamento da despesa.\n\n" +
    "QUEM É QUEM: a empresa que lança é a PAGADORA (destinatária da nota, tomadora do serviço, " +
    "quem paga o Pix/TED). O fornecedor é quem EMITE a nota ou RECEBE o pagamento. " +
    "Em comprovante de Pix/TED, o fornecedor é o RECEBEDOR, não o pagador. Nunca devolva a pagadora como fornecedor.\n\n" +
    "FORNECEDOR e PROJETO: copie como estão escritos no documento (nome, CNPJ/CPF, projeto ou contrato citado). " +
    "O sistema compara com o cadastro depois; você não recebe o cadastro.\n\n" +
    `PLANO DE CONTAS (escolha o código mais adequado):\n${contaList}\n\n` +
    `TIPOS DE DOCUMENTO FISCAL aceitos:\n${tipoList}\n\n` +
    "REGRAS:\n" +
    "- Datas SEMPRE em ISO: YYYY-MM-DD (e YYYY-MM na competência). O documento brasileiro escreve DD/MM/AAAA — converta.\n" +
    "- Valor numérico em reais, com ponto decimal, já líquido de desconto (se o cupom mostra Mercadorias, Desconto e Total, use o Total).\n" +
    "- Nunca invente: o que não estiver no documento volta vazio, com confianca=baixa e a nota explicando.\n" +
    '- Use confianca="alta" só para o que está escrito e legível; "media" para o que você deduziu; "baixa" para o que está ilegível, cortado, mascarado ou é palpite.\n' +
    "- A nota é lida pelo usuário na tela, em português, curta e útil (ex.: 'CPF mascarado no comprovante', 'competência deduzida da data do Pix').\n" +
    "- Comprovante de pagamento não é nota fiscal: docFiscalTipo=SEM_DOC, e pago=true."
  );
}

/**
 * Parte VOLÁTIL: o que muda a cada leitura. Fica depois do ponto de cache e
 * por isso precisa ser curta — cada token aqui é cobrado inteiro, sempre.
 */
export function instrucaoLeituraDespesa(quantidadeDeArquivos: number): string {
  return (
    (quantidadeDeArquivos > 1
      ? `São ${quantidadeDeArquivos} arquivos da MESMA compra (ex.: a nota e o comprovante do pagamento): combine as informações. ` +
        "Se perceber que tratam de despesas diferentes, use os dados do documento principal e registre isso em observacoes. "
      : "") + "Extraia os dados e chame a ferramenta preencher_despesa."
  );
}

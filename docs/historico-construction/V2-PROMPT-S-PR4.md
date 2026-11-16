# Prompt S · PR S-4 — selo "Sem NF" diz o que falta; Repositório sem linha duplicada; desempenho; origem do assistente

Seções 4, 6, 7.1 e 8.2 do Prompt S. **Nenhuma despesa, nota ou anexo
alterado; sem migração.**

| Seção | Entrega |
|---|---|
| **4.1 / 4.2** | `pendenciaFiscal` (puro, em `calc/documento-fiscal.ts`, mesma base de `pendenteDeDocumento`) devolve o texto de cada situação: "Nenhum documento fiscal registrado", "Recibo escolhido, sem o número", "Tipo de documento inválido: X", "NF-e sem declaração de documento". O selo "⚠ Sem NF" mostra o motivo curto ao lado e o texto inteiro no título. O formulário já sinalizava tipo que exige número (`exigeNumero`) |
| **4.3** | o clipe passa a dizer "arquivo anexado; não é o registro da nota fiscal"; o selo é da nota. Dois conceitos, dois lugares |
| **4.4** | "1 lançamento" / "N lançamentos" |
| **6.1 / BS-3** | `getRepositorio` deixa o `leftJoin` com `documento_fiscal` (que multiplicava a linha do arquivo por nota) e passa a usar uma subconsulta com a nota mais recente: um arquivo, uma linha; o contador confere. Filtros, busca, "sem vínculo" e "Limpar" inalterados (6.3) |
| **6.2** | já unificado em 10 MB (Prompt M) |
| **7.1** | `getDocumentsByDespesaIds`: a lista carrega só os documentos das despesas em tela, em vez de todos os do tenant filtrados em memória. A assinatura de URL continua paralela |
| **8.2** | a auditoria de `despesa.create` registra `origem: "assistente"` quando o formulário foi preenchido pela leitura por IA (o usuário conferiu antes de lançar), senão `"manual"`. A validação de tenant e projeto já era no servidor: a leitura casa fornecedor e obra só com `ctx.projects`, e `addDespesa` recusa obra fora do tenant (Prompt A). A extração em si **não mudou** (8.1, 8.3) |

## Testes
`documento-fiscal.test.ts` +1 (as quatro situações; 15); `repositorio-dedupe.test.ts`
(integração: despesa com duas notas e um arquivo → uma linha; 13). Suíte
(1244), `tsc`, `eslint`, `next build` verdes. Navegador: selo com o motivo,
plural, aba Repositório. Hash de `despesa` antes = depois.

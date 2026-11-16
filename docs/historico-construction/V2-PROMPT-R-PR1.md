# Prompt R · PR R-1 — Contas a Pagar lista por obrigação que vence

Seções 1 e 2.4 do Prompt R. **A tela continua somente leitura; nenhuma
escrita, nenhuma action nova; sem migração.**

| | Entrega |
|---|---|
| **1.2** | `getParcelasContasPagar` (consulta própria da tela, mesma chave de versão) + `linhasPorObrigacao` (puro): despesa parcelada vira **uma linha por parcela** — nº/total, vencimento da parcela, valor da parcela e **saldo** (valor − pago); parcela quitada entra como "Pago" (ordenação das pagas); parcialmente paga como "Parcialmente paga". Despesa sem parcelamento: uma linha, como hoje |
| **1.3** | coluna **Parcela** com "n/N" e o cheque da parcela: nº e "bom para" (migração 0038 volta a ser dado visível) |
| **1.4** | "Editar" continua levando à despesa raiz; a URL leva `&parcela=N` e o formulário avisa: "Você veio da parcela N… este formulário edita o cabeçalho, não a parcela isolada". **Nota:** remarcar uma parcela isolada não é possível pela interface hoje — o editor de parcelas só aparece na criação (achado do BS-1); reportado |
| **1.5** | linhas de obrigação com terceiro intactas |
| **2.4** | "Total" → **"Total lançado no filtro"**, com o título explicando que não é o que falta pagar (isso é o Pendente) |
| **2.2** por obrigação | "Pendente" passa a somar o saldo **por parcela**; o que vence fora do período filtrado não entra (5) |
| **1.6 / 1.7** | faturas de cartão: Prompt U |

## Não regressão (seção 9)
`getContasPagar` **não mudou**: Dashboard, Fechamento, conciliação e a API do
agente seguem com os mesmos números (uma linha por despesa, saldo por
despesa). As linhas por parcela existem só nesta tela.

## Testes
`contas-pagar-regras.test.ts` +4 (itens 1, 2, 3, 4 do prompt: linha por
parcela com saldo; sem parcelamento e obrigação intactas; cheque; quitada e
parcial). Suíte (1248), `tsc`, `eslint`, `next build` verdes. Navegador
(despesa semeada com 3 parcelas, depois removida): três linhas 1/3, 2/3, 3/3
com saldos 100 / 60 / 0 e status Vencida / Parcialmente paga / Pago; cheque
"ch. 000123 · bom para 20/09/2026"; "Total lançado no filtro"; link com
`&parcela=1` e aviso no formulário. Hash de `despesa`, `despesa_parcela` e
`pagamento` iguais antes e depois.

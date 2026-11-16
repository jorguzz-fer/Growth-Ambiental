# Prompt U2 — Cartões no Caixa: extrato, conciliação, proposta de lançamento

**O que já existia (Prompt U, conferido)**

- Cartões já mora no módulo Caixa (Prompt REN).
- Cadastro com fechamento e vencimento, compra na próxima fatura, Contas a Pagar lendo o total da fatura, detalhe da fatura, pagamento parcial com saldo para o ciclo seguinte e juros como despesa financeira.
- Extrato do cartão em XLSX ou CSV, com conferência: o que está no extrato sem lançamento, o lançado sem extrato, divergências e créditos.
- Proposta de lançamento: cada item sem lançamento tem "Lançar em Despesas →", que abre a despesa preenchida.

**O que mudou**

- **Fatura em PDF ou foto.** O extrato agora aceita o PDF da fatura (ou uma imagem). A IA lê com a convenção do cartão: compra positiva, crédito e estorno negativos. O pagamento da fatura anterior, o saldo e o limite ficam de fora.
- **Prévia antes de registrar.** O que a IA leu aparece numa lista com o total de compras e de créditos. Só o botão "Registrar" guarda o extrato, e "Descartar" joga fora. Registrar continua guardando só o extrato, sem despesa, e sem duplicar o que já estava.
- **A Cris conhece a tela.** Ela recebe os cartões (apelido e 4 últimos), as faturas recentes e o resultado da conferência, com os itens do extrato sem lançamento. Assim responde "o que falta lançar" e explica a fatura.
- A base de conhecimento explica a fatura em PDF e o "Lançar em Despesas".

**Regras mantidas**

- Nenhum número de cartão completo vai ao modelo.
- Nenhuma despesa é lançada pela leitura: o lançamento continua em Despesas, conferido e salvo pela pessoa.
- Sem IA configurada, a fatura em PDF é recusada com a orientação de enviar XLSX ou CSV. A leitura de texto por heurística do extrato bancário não sabe o sinal de uma fatura.

**Testes**

- Integração: a leitura usa o modo cartão e devolve a prévia sem gravar; sem permissão recusa sem ler; arquivo de outro tipo é recusado.
- E2E: a Cris conhece os Cartões; a tela oferece o PDF da fatura.

**Em aberto**

- **BU2-1.** Open Finance do cartão pela Pluggy não foi feito. Depende de o conector da Pluggy trazer as faturas do cartão para a conta da empresa, o que precisa ser confirmado com o Thiago.
- A tela de Cartões não foi redesenhada no formato da cadeia de dias do Caixa. A conferência, a fatura e a projeção ficam na mesma tela, como já estavam.

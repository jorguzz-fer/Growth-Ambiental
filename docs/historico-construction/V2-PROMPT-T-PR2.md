# Prompt T · PR T-2 — porta única: a despesa paga por terceiro nasce em Despesas

Seção 2 do Prompt T (par da 3-B.3 do Prompt S). **Nenhuma obrigação ou
despesa existente alterada; sem migração.**

| | Entrega |
|---|---|
| **2.1** | o bloco "Nova despesa paga por terceiro" **saiu** de Ressarcimentos, e `criarDespesaTerceiro` perdeu o modo "despesa nova" (sem PED, recusa apontando para Despesas) |
| **2.2** | fica o **vínculo por PED**, renomeado "Vincular lançamento existente a um pagador": localizar pelo PED (obrigatório), quem desembolsou, empresa responsável, datas, observação. Nada do lançamento é sobrescrito |
| **2.3 / S 3-B.3** | em **Despesas**, o bloco "pago por sócio" vira **"Paga por terceiro — sócio ou pagador cadastrado"**, e o seletor "Quem desembolsou" oferece **só quem tem o papel** (ativo), concedido em Ressarcimentos. **Mover, não reimplementar:** `addDespesa` **já criava** a obrigação na mesma transação (`despesa_terceiro`, `pagoPorTerceiro`, "Aguardando restituição"); só a lista mudou. Nenhuma lógica foi reescrita; a idempotência da action continua a mesma |
| **3-B.5** | a despesa paga por terceiro **continua "Pago"** (o fornecedor foi pago; a obrigação é a dívida com o terceiro, já em Contas a Pagar). Se nascesse "A pagar", Contas a Pagar contaria a mesma saída duas vezes. Decisão registrada na Fase 1 |
| 3-B.4 cartão | Prompt U |

## Testes
`ressarcimentos-projeto-explicito.test.ts` adaptado ao modo único (+1 caso:
sem PED recusa e aponta para Despesas). Suíte (1260), `tsc`, `eslint`,
`next build` verdes. Navegador: o formulário de despesa nova não existe mais
em Ressarcimentos (1); o bloco de vínculo exige PED; em Despesas, a origem
"paga por terceiro" mostra o seletor de pagadores (vazio, com o caminho para
conceder). Hash de `despesa`, `despesa_terceiro` e `stakeholder` iguais.

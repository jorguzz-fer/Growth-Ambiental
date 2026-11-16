# Prompt I · PR I-4 — acerto contábil: saldo real, trava e conferência do rateio

Quarta PR de código do Prompt I, conforme
[`V2-PROMPT-I-FASE1.md`](./V2-PROMPT-I-FASE1.md). Seções 17 e 18.
**Não muda número de relatório. Nenhum registro gravado é alterado. Sem
migração.**

## O que muda

| | Antes | Agora |
|---|---|---|
| **Saldo disponível ao acerto** | `despesa.valor` — o valor cheio, ignorando acertos anteriores e pagamentos. Dois acertos de 60 sobre um PED de 100 passavam | **saldo real** = valor − abatimentos de acertos ativos − principal dos pagamentos registrados. O segundo acerto de 60 é recusado dizendo "excede o saldo real de 40,00" |
| **Concorrência** | as despesas eram lidas sem trava; dois acertos simultâneos liam o mesmo saldo | `FOR UPDATE` nas despesas, dentro da transação; o segundo entra na fila e enxerga o saldo já abatido. Dois acertos de 100 ao mesmo tempo sobre um PED de 100: só um passa |
| **Abatimento maior que o saldo** | `abaterManual` **cortava em silêncio** para o valor da despesa | recusa explícita, com os dois valores, pedindo para recarregar a tela |
| **Tela e servidor** | a lista de PEDs abatíveis descontava só acertos; o servidor não descontava nada | os dois usam a mesma função (`saldosReaisDasDespesas`). A lista mostra o saldo real e só traz PEDs da versão Atual não congelada |
| **Só Atual** | acerto passava sobre PED de Orçamento/Previsão e de versão congelada | recusa nos dois casos, na lista e na conclusão |
| **Estorno** | lançava erro (sem mensagem em produção); sem trava; estornava em versão congelada | `{ ok, error }`, acerto travado, dois estornos simultâneos não passam os dois; versão congelada bloqueia |
| **Rateio (§18)** | a soma era conferida; obra repetida ou de outra empresa passava; Atual congelada recebia PED | obras conferidas no servidor (repetida, vazia, de outra empresa); Atual congelada bloqueia. A soma continua conferida por `validarRateio` |

## §18 — a saída única e a memória de alocação

O prompt pede para **não** atribuir o valor integral à versão da primeira
obra e para **não** duplicar o `cash_entry`. Hoje:

- a saída bancária é **uma**, em `cash_entry` (coluna `version_id` obrigatória,
  então ela fica na versão da primeira obra — como antes);
- a **memória de alocação já existe**: `acerto_item` liga cada PED (e, por ele,
  a obra) ao valor abatido; `rateio_obra` guarda obra, valor e percentual de
  cada linha do rateio, com memória de cálculo.

Ou seja, a atribuição econômica por obra **já está gravada** e não precisa de
tabela nova. O que falta é a **leitura**: o fluxo de caixa por obra lê
`cash_entry` por versão e vê o valor inteiro na primeira obra. Essa leitura é
da camada analítica (PR I-8, §28–41), que passa a distribuir os movimentos
com `cat = 'acerto'` pelos itens do acerto. Registrado aqui para não se
perder; nada de cálculo muda nesta PR.

## Arquivos

- novos: `src/lib/acerto-regras.ts` (puro), `src/lib/acerto-saldo.ts` (leitura, uma lógica só);
- `src/lib/actions/acerto.ts`: `getDespesasAbativeis`, `concluirAcerto`, `estornarAcerto`, `ratearEntreObras`;
- `src/components/app/acerto-manager.tsx`: o estorno lê `{ ok, error }`.

## Verificação

- `acerto-regras.test.ts` (puro): saldo real; recusas (excede, quitado,
  cancelado, fora da Atual, congelado, repetido, desconhecido, valor
  inválido); obras do rateio.
- `acerto-integridade.test.ts` (Postgres):
  - PED 100: acerto 60 → parcial, tela mostra 40; acerto 60 recusado; 40
    quita; 0,01 recusado como quitado;
  - pagamento de 30 registrado: saldo 70 na tela e no servidor;
  - dois acertos simultâneos de 100: um só passa, um só item;
  - estorno reabre e devolve o saldo; estornar de novo é recusado;
  - PED de Previsão recusado e ausente da lista; versão congelada bloqueia
    acerto e estorno;
  - rateio: obra repetida, obra de outra empresa, obra sem Atual e Atual
    congelada recusados; nada meio aplicado.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

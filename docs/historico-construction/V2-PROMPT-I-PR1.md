# Prompt I · PR I-1 — despesas com transação, validações, trava de edição e lock em tudo

Primeira PR de código do Prompt I, conforme o plano de
[`V2-PROMPT-I-FASE1.md`](./V2-PROMPT-I-FASE1.md). Seções 11 e 19.
**Não muda número de relatório. Sem migração. Nenhum dado gravado é alterado.**

## O que muda

| Item | Antes | Agora |
|---|---|---|
| **11.1 · valor** | o cadastro barrava zero; **negativo passava**. A edição aceitava qualquer texto e gravava "0" | zero, negativo, `NaN` e infinito recusados no cadastro e na edição |
| **11.2 · criação atômica** | despesa, parcelas, nota, obrigação com sócio e réplicas recorrentes eram gravadas uma a uma. Falha no meio deixava despesa pela metade | tudo numa **transação**: ou entra inteiro, ou nada entra. Os anexos sobem para o R2 depois (ele não participa da transação); anexo que falhar vira **aviso** na tela, e a despesa fica |
| **11.3 · parcelas** | as parcelas do painel eram gravadas sem conferir com o total | a soma precisa fechar com o valor (tolerância de 1 centavo); parcela com valor zero é recusada |
| **11.4 · status da parcela** | vinha do formulário, qualquer texto | só da lista `STATUS_PARCELA` |
| **11.5 · recorrência** | as réplicas copiavam status "Pago", `pagoPorTerceiro`, dados de boleto e cheque e a condição de parcelamento | réplica nasce **"A pagar"**, sem pago por terceiro, sem boleto/cheque, sem condição de parcelas. O lançamento original não muda |
| **11.6 · edição com vínculo** | valor, status e datas podiam mudar mesmo com pagamento, acerto ou parcela paga | com fato financeiro (pagamento, parcela paga, acerto, restituição, terceiro, caixa conciliado): **valor, status, competência, vencimento e forma não mudam**; obs, fornecedor, conta e categoria mudam. Só com parcelas em aberto: o valor não muda |
| **11.7 · lock** | verificado só no cadastro e no pagamento de parcela | verificado também em **editar, excluir, cancelar, pagar**, e em `importUnits`, `updateMedicao`, `deleteMedicao` |
| **11.8 / 11.9 · retorno** | `return` mudo sem permissão; erro lançado sem mensagem em produção | `{ ok, error }` em `addDespesa`, `updateDespesa`, `deleteDespesa`, `cancelarDespesa`, `pagarDespesa`, `updateMedicao`, `deleteMedicao`. As três telas mostram a mensagem |
| **11.10 · lock em massa** | `importUnits` não verificava | verifica |
| **§19 · medição** | editar e excluir validavam só a empresa | validam a versão da própria medição e o lock; a exclusão registra competência, grupo e valor na auditoria |

## O que fica para as próximas PRs (de propósito)

- **I-2:** transação, idempotência e status acumulado em `pagarDespesa` e
  `registrarPagamento` (§13, §14).
- **I-3:** travas por dependência em `deleteDespesa` e `deleteUnit`; plano
  de contas inativa em vez de apagar; restituição cancelada em vez de apagada
  (§12, §24). O helper `vinculosDaDespesa` desta PR já serve para isso.

## Detalhes que valem registro

- **Número do PED em gravação desfeita.** A reserva do número tem transação
  própria (é assim que ela garante unicidade sob concorrência). Se a gravação
  da despesa for desfeita depois de reservar, o número fica **sem uso** — nunca
  é reemitido. É o mesmo que já acontecia quando a gravação falhava; agora só
  acontece junto com a recusa inteira.
- **Anexos.** Se um anexo falhar depois de a despesa existir, a tela avisa
  "Despesa X gravada, mas N anexo(s) não subiram". Nada é desfeito; anexa-se
  de novo pela ficha.
- **`registrarPagamento` não foi tocada** (é da I-2); continua lançando erro
  como antes.

## Arquivos

- novos: `src/lib/despesa-regras.ts` (regras puras), `src/lib/despesa-vinculos.ts`
  (contagem de vínculos, só leitura);
- `src/lib/actions/despesas.ts`, `medicao.ts`, `units.ts`;
- `src/components/app/despesa-form.tsx`, `despesas-table.tsx`, `medicao-manager.tsx`.

## Verificação

- `despesa-regras.test.ts` (puro): valor, soma das parcelas (§47.9), status
  de parcela, réplica recorrente, travas de edição.
- `despesas-integridade.test.ts` (Postgres):
  - valor negativo recusado, nada gravado;
  - parcelas 40 + 40 contra 100 recusadas (§47.9);
  - status de parcela fora da lista recusado;
  - falha no meio (obrigação com sócio inexistente) não deixa despesa;
  - réplicas recorrentes nascem "A pagar", o original fica "Pago";
  - com parcela paga, valor e status não mudam; obs muda;
  - valor inválido na edição recusado, o gravado fica;
  - versão congelada bloqueia editar, cancelar, pagar, excluir e importar;
  - sem permissão, mensagem em vez de silêncio;
  - medição: valor negativo recusado, lock respeitado, auditoria com os dados.
- `despesas-projeto-explicito.test.ts` adaptado ao novo retorno.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

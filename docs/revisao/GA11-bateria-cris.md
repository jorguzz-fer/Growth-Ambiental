# GA-11 §4.3 — Bateria da Cris com IA de verdade

## Situação: incompleta

**Rodado:** só o caso 12, que não depende de IA.

**Por que os casos 1 a 11 não rodaram:**

- o ambiente onde o GA-11 foi feito não tem chave da Anthropic para o app (`ANTHROPIC_API_KEY`);
- o formulário seguro de credenciais desse ambiente não aceita chave para os hosts da Anthropic;
- a credencial da própria sessão de desenvolvimento não serve ao app.

Para não registrar resultado inventado, os casos 1 a 11 ficam como **não executados**, com o roteiro abaixo para rodar onde a chave estiver configurada. O ideal é a produção ou uma homologação com a demonstração.

**O que já está coberto por teste automático (sem modelo):** as mesmas ferramentas da Cris, chamadas como o modelo as chamaria (`ga11-conciliacao-caixa.test.ts` e testes anteriores do Caixa):

- pendentes respeitam o cartão;
- o lote só propõe, nada é gravado;
- o botão grava;
- compra que não é candidata é recusada;
- compra sem lançamento vira link para Despesas;
- sem permissão, nenhuma ferramenta (o botão também recusa);
- as ferramentas da Cris não importam nenhuma ação que grave.

## Resultado

| # | Pergunta / ação | Ferramentas chamadas | Resposta resumida | Gravado | Situação |
|---|---|---|---|---|---|
| 1 | "Quais pendências conciliar primeiro?" em "Todas as contas" | — | — | — | não executado (sem chave de IA) |
| 2 | A mesma, com uma conta escolhida | — | — | — | não executado |
| 3 | Anexar extrato CSV e importar pela proposta | — | — | — | não executado |
| 4 | Anexar extrato em PDF | — | — | — | não executado |
| 5 | "Concilie os pendentes" → lote → confirmar → a tela atualiza | — | — | — | não executado |
| 6 | Recusar uma proposta → nada gravado | — | — | — | não executado |
| 7 | "Por que o conciliado não bate com o extrato?" | — | — | — | não executado |
| 8 | Aba Cartões: anexar a fatura em PDF e conferir | — | — | — | não executado |
| 9 | Aba Cartões: "O que está na fatura e não foi lançado?" → proposta com link | — | — | — | não executado |
| 10 | Aba Cartões: conciliar um lote pela Cris | — | — | — | não executado |
| 11 | Só ver o Caixa: pedir para conciliar → recusa, nada gravado | — | — | — | não executado |
| 12 | Sem chave de IA: o botão e o chat | nenhuma (a IA não é chamada) | Botão: "A Cris precisa da IA configurada (Configurações → Diagnóstico de IA)." Chat: a mesma frase e "Sem ela, não leio extrato nem fatura e não proponho conciliações; respondo só números do catálogo." | nada | **passou** (navegador, build de produção, demonstração e empresa criada antes do GA-1) |

## Roteiro para os casos 1 a 11

Em ambiente com `ANTHROPIC_API_KEY` e a demonstração. Use uma empresa de teste: o caso 3 importa extrato e o 5 grava conciliações.

1. **Contas correntes, "Todas":** botão "Conciliar com a Cris", ou no chat "Quais pendências conciliar primeiro?".
   - Esperado: a Cris chama `pendentes_de_conciliacao` e a lista mistura as duas contas.
2. **Mesma pergunta com uma conta no seletor.**
   - Esperado: só movimentos daquela conta, porque o `?conta=` vai para a ferramenta.
3. **Anexar um CSV de extrato no chat.**
   - Esperado: `ler_extrato` e o botão "Abrir a importação com N linha(s)". Importar só pelo botão do diálogo.
4. **O mesmo com PDF.**
5. **"Concilie os pendentes".**
   - Esperado: `candidatos_de_conciliacao` e `propor_conciliacoes`, e o lote com "Confirmar N conciliações".
   - Ao confirmar, a tela atualiza e a pendência some (corrigido neste PR; ver o relatório, item 4).
6. **Pedir um lote e não confirmar.**
   - Esperado: nada gravado. Conferir em `conciliacao_despesa` e `cash_entry.rec`.
7. **"Por que o conciliado não bate com o extrato?"**
   - Esperado: resposta com base nos saldos e na cadeia do contexto da tela.
8. **Aba Cartões, anexar a fatura em PDF.**
   - Esperado: `ler_fatura` e "Abrir a prévia com N linha(s)", que abre a prévia de Subir fatura.
   - Registrar só pelo botão, sem despesa lançada.
9. **Aba Cartões: "O que está na fatura e não foi lançado?"**
   - Esperado: `pendentes_do_cartao` e uma proposta com "Lançar em Despesas (R$ …) →".
   - Nenhuma despesa nova: conferir a contagem de `despesa`.
10. **Aba Cartões: "Concilie a fatura".**
    - Esperado: `candidatos_do_cartao` e `propor_conciliacoes_cartao`, e o botão "Confirmar N conciliações".
    - A tela atualiza.
11. **Usuário com Caixa só para ver.**
    - Esperado: a Cris explica que conciliar exige Caixa/editar e não tem as ferramentas. Nada gravado.

Ao rodar, preencha a tabela acima. Para ver as ferramentas chamadas, a resposta da Cris diz o que propôs, e o lote ou a prévia aparecem no chat.

# Prompt N — Simulador de Unidade · relatório final

Prompt N (14 de 42) entregue em 3 PRs, todas em `main`. **Nenhuma migração;
nenhum dado alterado; a tela continua calculadora (BN-1).**

| PR | Conteúdo | Doc |
|---|---|---|
| Fase 1 | inventário, bloqueios, correções confirmadas, plano | [`V2-PROMPT-N-FASE1.md`](./V2-PROMPT-N-FASE1.md) |
| N-1 | cálculo (2.1–2.8, 3.3, 4.3) e tela (3.1, 3.2, BN-2, BN-3, 4.1, 4.2) | [`V2-PROMPT-N-PR1.md`](./V2-PROMPT-N-PR1.md) |
| N-2 | assistente somente leitura (5.1–5.4), tudo puro | [`V2-PROMPT-N-PR2.md`](./V2-PROMPT-N-PR2.md) |

## Itens do prompt × entrega

| Item | Situação |
|---|---|
| 1.1 obra explícita, subtítulo, permissão | já vinha dos Prompts A/C/M; subtítulo reescrito |
| 2.1 veredito pela maior parcela | feito — o caso do teste muda de "dentro" para "acima" |
| 2.2 correção INCC | **opção 1**: nos três tipos, da 5ª parcela, pelo acumulado do mês |
| 2.3 / BN-2 taxa | campo "Juros ao mês % (premissa)", padrão 1 % |
| 2.4 entrada efetiva × recursos futuros × financiamento | três KPIs; % sobre a efetiva |
| 2.5 fluxo = nº de parcelas | até 480, declarado; rolagem com cabeçalho e rodapé fixos |
| 2.6 SAC sem negativo | saldo acompanhado; para ao zerar |
| 2.7 reforço com mês | cada reforço `{valor, mes}`; fora do plano recusado |
| 2.8 evolução da obra | janela do projeto (início/fim) ou premissa rotulada |
| 3.2 abre vazia | sim; nenhum valor do mockup |
| 3.3 validação | `validarSimulacao` puro; a tela lista os erros |
| BN-3 renda do cadastro | seletor de cliente; renda só sai do servidor com `clientesdados:ver` |
| 4.3 totais | pago, juros, correção |
| 5.1–5.4 assistente | somente leitura, puro; renda nunca no texto; nada vai a modelo |

## Perguntas em aberto (nenhuma travou a entrega)

1. **2.2:** adotei a correção INCC nos três tipos (opção 1). Se preferir a
   opção 2 (só SBPE), é uma linha em `simulate` e um teste.
2. **BN-2:** o padrão da taxa é 1 % ao mês. Confirma ou informa outro?
3. **2.8:** as obras sem início e fim cadastrados mostram "Obra % (premissa)".
   Cadastrar as datas em Projetos muda a coluna para a janela real.
4. **Testes originais alterados** (item 6 do prompt): 4 → 11, justificados na
   doc da N-1; o caso "dentro do limite" virou "acima" pela regra nova 2.1.

## Antes / depois

Nenhuma tabela foi lida para gravação nem alterada. As contagens de
`incc_rate`, `clientes`, `project` e `audit_log` no banco local são as mesmas
antes e depois das 3 PRs; o simulador não escreve.

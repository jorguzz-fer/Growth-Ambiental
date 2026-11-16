# DRE — desempenho, PR 1: ler menos e uma vez só

Origem: usuário relatou a DRE lenta para carregar (27/10/2026). Avaliação
antes de mexer: a lentidão está no servidor, em centenas de consultas por
abertura, e não no navegador (a página tem 63 KB).

## O que muda (só leituras; nenhuma escrita, nenhuma migração)

1. **As despesas de cada versão vêm somadas do banco.** Antes vinha cada
   despesa inteira (todas as colunas, ordenada) para usar 4 campos, e duas
   vezes por abertura: uma para a cascata e outra para o rodapé "o que fica
   fora". Agora uma consulta agrupada por conta, categoria e competência
   alimenta as duas (`getExpenseRowsAgrupadas`, memorizada por requisição).
   Na massa de teste, cada versão devolve 240 linhas em vez de 2.500.
2. **Os encargos financeiros** (multa, juros, outros, desconto) são somados
   no banco por mês de pagamento ou por competência, com a mesma regra de
   antes para data malformada (fica fora) e competência vazia (balde "sem
   competência").
3. **Cada versão é calculada uma vez por requisição.** Na Empresa toda, a
   Atual de uma obra sem Orçamento ou Previsão entrava nos três cenários e era
   lida três vezes. O tipo da versão, consultado ~190 vezes por abertura, também
   é memorizado.
4. **Receita da Atual:** unidades, liberações e contas a receber em paralelo
   (antes, contas a receber esperava as outras duas).

`getExpenseRows` (linha a linha) continua existindo: o Fluxo de Caixa e a DRE
Analítica usam. Nada mudou nela.

## Garantia de que os números não mudaram

- **Comparação antes × depois** no banco local, com 41 versões, 30 mil despesas
  e 18 mil pagamentos, incluindo casos de borda plantados (sem categoria, sem
  competência, competência "  ", "5/2025" e "05/2025" separados, "Receita"
  como despesa, cancelada, pagamento com data vazia, "7/9/2025" e "lixo"):
  **14.795 valores comparados, 0 divergências**, maior diferença numérica
  2,3e-10 (arredondamento de ponto flutuante).
- `src/lib/dre-inputs-desempenho.test.ts` (banco real) recalcula a regra
  antiga linha a linha e compara com a nova: somas por categoria e
  competência, quantidade de lançamentos do rodapé, encargos nos dois modos
  com datas malformadas, cascata por mês, e que o resultado memorizado é uma
  cópia (mexer nele não contamina a próxima leitura).

## Medição (banco local, 12 obras com 3 versões cada)

| Tela | Antes | Depois |
|---|---|---|
| DRE Empresa toda | 570 consultas · ~0,6 s | 435 consultas · ~0,2 a 0,3 s |
| DRE de uma obra (3 versões) | 117 consultas · ~0,1 s | 90 consultas · ~0,06 s |

Em produção o ganho tende a ser maior: app e banco dividem a VPS, e o que
pesava era o volume de linhas trafegadas.

## Próximo (PR 2)

Índices em `despesa.version_id`, `pagamento.despesa_id`,
`conta_receber.project_id`, `permuta.version_id` e `reembolso.version_id`:
hoje o banco lê a tabela inteira a cada consulta e descarta o resto.

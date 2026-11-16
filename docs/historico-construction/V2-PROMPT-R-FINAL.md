# Prompt R — Contas a Pagar · relatório final

Prompt R (18 de 42) em 4 PRs, todas em `main`. **A tela continua somente
leitura: nenhuma escrita, nenhuma action nova; sem migração; nenhum status
gravado ("Vencida" continua derivada).**

| PR | Conteúdo | Doc |
|---|---|---|
| Fase 1 | inventário, bloqueios, SQL | [`V2-PROMPT-R-FASE1.md`](./V2-PROMPT-R-FASE1.md) |
| R-1 | uma linha por obrigação que vence (parcelas, cheque, link com a parcela), "Total lançado no filtro" | [`V2-PROMPT-R-PR1.md`](./V2-PROMPT-R-PR1.md) |
| R-2 | "Vencida": selo com ícone, contador, hoje do servidor, parcialmente paga vencida | [`V2-PROMPT-R-PR2.md`](./V2-PROMPT-R-PR2.md) |
| R-3 | filtros com seleção múltipla, coluna fixa, descrição vazia | [`V2-PROMPT-R-PR3.md`](./V2-PROMPT-R-PR3.md) |

## Relatório obrigatório (seção 11)
1. **BR-1** — local: sem `number_sequence` (a semente nasce no 1º lançamento), sem PED repetido. Produção: SQL da Fase 1. Nenhuma constraint criada.
2. **BR-2** — local: nenhum projeto "DESPESAS GERAIS"; `kind` dos projetos locais: proj / office / proj. Produção: SQL. Reclassificar é decisão humana.
3. **Versões não-Atual** — local: 0 despesas. O escopo é regido pela chave `contas_pagar_so_atual` (Prompt I §10), mantida.
4. **Pendente antes/depois** — local: 0 parcelas, logo iguais. Em produção, a diferença por projeto é a consulta 2.5 do SQL: a queda vem de contar o saldo **por parcela em aberto** em vez do valor cheio da despesa parcelada.
5. **Saldo** — por despesa: `saldosReaisDasDespesas` (Prompt I §15, `contas-pagar-regras.ts`); por parcela: `valor_original − valor_pago` em `linhasPorObrigacao` (puro, mesmo módulo).
6. **Status único** — `statusExibido` (`despesa-status.ts`), usado por exibição, filtro, ordenação e contadores nas telas de Contas a Pagar e Despesas; "Vencida" entra nas opções; parcialmente paga com vencimento passado é vencida (4.6).
7. **Efeito em Dashboard, Fechamento e conciliação** — nenhum: `getContasPagar` não mudou; as linhas por parcela vêm de `getParcelasContasPagar`, usada só pela tela. A mudança de 4.6 muda o **rótulo** de despesas parcialmente pagas e vencidas também na tela de Despesas (mesmo conceito); não muda número.
8. **Seleção múltipla** — `MultiSelect` com botão (`aria-haspopup`/`aria-expanded`), caixas nativas, busca, marcar/desmarcar todos; "ou" dentro, "e" entre; teclado: Enter/Espaço abre, Tab/Espaço marca, Escape fecha.
9. A tela continua **sem escrita**.
10. Seção 7: nada tocado (sequência de PED, guarda-chuva, `duplicateVersion`/`importVersionData`, abas de Despesas, conciliação, cartões, edição de despesa, contexto de projeto).
11. Migrações: nenhuma.
12. **Limitações** — 1.6/1.7 (faturas de cartão) aguardam o Prompt U; remarcar uma parcela isolada não é possível pela interface (o editor de parcelas só aparece na criação) — reportado, fora do escopo desta tela; as abas "A Pagar" e "Parcelas" de Despesas podem sair agora (seção 5 do Prompt S), mas a remoção é do Prompt S e fica para quando você confirmar que esta tela cobre as duas.

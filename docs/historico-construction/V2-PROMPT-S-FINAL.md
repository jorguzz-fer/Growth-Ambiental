# Prompt S — Despesas / Lançamentos · relatório final

Prompt S (17 de 42) em 5 PRs, todas em `main`. **Sem migração; nenhuma
despesa alterada, cancelada, reclassificada ou removida; nenhum PED
renumerado; nenhum `documento_fiscal` tocado; nenhum vínculo de conciliação
desfeito.**

| PR | Conteúdo | Doc |
|---|---|---|
| Fase 1 | inventário, bloqueios, conflitos, SQL | [`V2-PROMPT-S-FASE1.md`](./V2-PROMPT-S-FASE1.md) |
| S-1 | 3-C trava de natureza em todos os caminhos; 3.2 domínio do status; recusa no campo; legado marcado | [`V2-PROMPT-S-PR1.md`](./V2-PROMPT-S-PR1.md) |
| S-2 | seção 2 — exclusão informada (inventário, PED digitado, auditoria completa, transação) | [`V2-PROMPT-S-PR2.md`](./V2-PROMPT-S-PR2.md) |
| S-3 | seção 1 — trava de conciliação diz qual movimento e qual permissão | [`V2-PROMPT-S-PR3.md`](./V2-PROMPT-S-PR3.md) |
| S-4 | 4 selo; 6.1 repositório; 7.1 desempenho; 8.2 origem | [`V2-PROMPT-S-PR4.md`](./V2-PROMPT-S-PR4.md) |

## Relatório obrigatório (seção 13)
1. **BS-1** — formulário lido inteiro (1.562 linhas): status "Pago" direto no select (criação e edição, sem pagamento); status de parcela como texto livre no cliente (o servidor já validava); IA podia gravar status fora da lista; erro só no topo; forma de pagamento não carrega na edição; bloco de parcelamento oculto continua sendo enviado com "pago por sócio"; aviso pós-criação em vermelho. **Mudou nas seções 1 e 3:** a 3.2 virou whitelist mantendo "Pago" (conflito 2); a 1 só precisou da mensagem.
2. **BS-2** — `validarDocumentoAoPagar` **não tem chamador nenhum**: nem `pagarDespesa`, nem parcela, nem Acerto. **Não implementado sem decisão** (como o prompt manda). Decida se liga em `pagarDespesa` e no Acerto.
3. **BS-3** — causa confirmada no código (join sem limite); local 0 despesas com >1 nota; consulta corrigida (S-4).
   3a. **BS-4** — local: 0 despesas "Receita", 0 sem categoria, 0 em `budget_line`. Produção: SQL da Fase 1. Nenhuma reclassificada.
   3b. Inventário 3-C.3.1 na Fase 1; validavam antes: add, update, criarDespesaTerceiro, reclassificar. Não validavam: Acerto (diferença e rateio) e despesa do extrato (que **nem tinha categoria**) — todos cobertos na S-1.
   3c. Importação por planilha **não traz categoria** (grava "Custo Variável"); 3-C.3.2 não se aplica.
   3d. A regra vive só em `calc/natureza-dre.ts`; nenhuma action escreve texto próprio.
   3e. A DRE devolve os mesmos totais: a trava impede o novo; o legado continua somando até a Conferência resolver item a item.
4. **2.6** — local: 0 exclusões no log; 45/46 movimentos sem vínculo de despesa (seed sem conciliação). Produção: SQL.
5. **3.2** — "Pago" **continua aceito**: a operação usa o status como atalho (local 24 pagas, 0 pagamentos). Domínio fechado (A pagar/Pago). Desenho para fechar "Pago" fica com você.
6. Limite de arquivo: **10 MB** em todas as telas (`LIMITE_UPLOAD_MB`), corpo da action 12 MB; a divergência (15/20 MB) já tinha sido unificada pelo Prompt M.
   6a. **5-A.6** — local: 0 acertos. SQL para produção. Sem corrigir.
   6b. `estornarAcerto` não foi alterada.
7. Arquivos: `natureza-dre` (uso), `despesa-regras`, `despesa-vinculos`, `actions/despesas`, `actions/acerto`, `actions/caixa`, `queries` (2 funções), `calc/documento-fiscal`, `despesa-form`, `despesas-table`, `import-extrato`, `confirmar-exclusao-despesa` (novo), `despesas/page`.
8. Padrão de auditoria de `updateDespesa` (`diffAudit`): **não alterado**.
9. Extração por IA: **não alterada** (só a origem na auditoria e o status fora da lista ignorado).
10. Antes/depois: contagem e hash de `despesa` iguais ao fim de cada PR; nº de "Receita" igual (15o).
11. Seção 9: nada tocado (parcelamento/recorrência/sócio, pagadores, cartões, Contas a Pagar, conciliação, DRE, `budget_line`).
12. Migrações: nenhuma.
13. **Limitações / adiados:** 3-B (forma de pagamento: terceiro e cartão) vai com os Prompts T e U; 5-A (aba Acertos) só depois do Prompt L (5-A.8); abas "A Pagar" e "Parcelas" ficam até o Prompt R; BS-2 aguarda decisão; "Pago" pela edição aguarda desenho.

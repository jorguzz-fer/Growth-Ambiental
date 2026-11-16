# Prompt S · Despesas — Fase 1, inventário antes de escrever código

Prompt S (17 de 42) — a tela mais usada. **Só leitura; nada foi alterado.**
SQL de diagnóstico em [`sql/v2-prompt-s-diagnostico.sql`](./sql/v2-prompt-s-diagnostico.sql).

## Bloqueios — situação

| | O que o código e o banco local mostram | Decisão / pergunta |
|---|---|---|
| **BS-1** formulário (1.562 linhas, lido inteiro) | Parcelas: geradas por `gerarParcelas`, soma conferida no cliente (botão trava se não fecha), **status da parcela vai como texto livre** em `parcelasJson`; **status da despesa é um select "A pagar / Pago" enviado na criação e na edição, sem exigir pagamento**; a IA pode gravar um status fora das duas opções; recorrência é criada no servidor; bloco de parcelamento escondido por CSS continua sendo enviado quando "pago por sócio"; erro do servidor aparece só no topo (não no campo); forma de pagamento não carrega na edição; aviso pós-criação exibido em vermelho | O que muda nas seções 1 e 3: a trava de status (3.2) precisa de decisão (abaixo); a validação de status da parcela entra no servidor (whitelist) |
| **BS-2** validação ao pagar | **`validarDocumentoAoPagar` não tem nenhum chamador**: nem `pagarDespesa`, nem parcela, nem Acerto. A regra existe só como função. Local: 24 pagas, 0 pagamentos registrados | **Não implemento sem decisão** (como o prompt manda). Pergunta: ligar a validação em `pagarDespesa` (e Acerto)? Hoje nada a chama, então ligar muda o que a operação consegue fazer |
| **BS-3** Repositório duplicado | `getRepositorio` faz `leftJoin(documentosFiscais, despesaId)` sem limitar a 1 por despesa — a hipótese se confirma no código. Local: 0 despesas com >1 nota | S-4 corrige a consulta (subconsulta da nota mais recente) e o contador |
| **BS-4** despesas como receita | Local: 0 com "Receita", 0 sem categoria, 0 em `budget_line`. Produção: rodar o SQL | A trava (3-C) não corrige o passado; a DRE continua somando o legado até a conferência resolver item a item |

## O que já está feito (Prompt I, §11/§12 — e não se toca)
- `updateDespesa`/`deleteDespesa`/`cancelarDespesa`/`pagarDespesa` **já devolvem `{ ok, error }`** (3.3 ✔).
- `updateDespesa` **já recusa** valor, status, datas e forma com pagamento, parcela paga, acerto, restituição, terceiro ou **caixa conciliado** (`recusaDeEdicao`) — 1.1, 1.4 e 3.1 ✔. Falta: a mensagem dizer **qual** movimento (1.2) e, quando o usuário não pode desfazer a conciliação (`caixa:excluir`), dizer isso com todas as letras (1.3).
- `deleteDespesa` **já recusa** com dependência (pagamento, parcela paga, acerto, restituição, terceiro, caixa conciliado, nota, anexo) — mais restritivo que a 2.2 (ver conflito 1).
- Auditoria de `updateDespesa` com `diffAudit` ✔ (não se toca). PED imutável ✔. Versão Atual ausente sinalizada ✔. Extração por IA ✔. `natureza-dre.ts` ✔.
- `addDespesa` e `updateDespesa` **já validam** a categoria; o select já abre em "Selecione…" com `categoriasDeDespesa` (3-C.4.1/4.2 ✔).
- Limite de upload: **todas as telas já dizem 10 MB** (`LIMITE_UPLOAD_MB`, Prompt M) — 6.2 ✔.

## Inventário 3-C.3.1 — quem grava `despesa.categoria_dre`

| Caminho | Arquivo:linha | Valida hoje? |
|---|---|---|
| `addDespesa` | `actions/despesas.ts:178` | ✔ `validarCategoriaDespesa` |
| `updateDespesa` | `actions/despesas.ts:548` | ✔ |
| `criarDespesaTerceiro` (modo despesa nova) | `actions/restituicoes.ts:246` | ✔ |
| `reclassificarDespesas` (destino) | `actions/diagnostico.ts:125` | ✔ |
| Diferença do Acerto | `actions/acerto.ts:310` | ✘ `input.categoriaDiferenca ?? "Despesas Financeiras"` — aceita o que vier |
| Despesa de obra criada pelo Acerto | `actions/acerto.ts:608` | ✘ `input.categoriaDre ?? "Custo Variável"` |
| Despesa criada da conciliação do Caixa | `actions/caixa.ts:1207` | ✘ `input.categoriaDre \|\| null` — aceita credora **e vazia** |
| Apuração do Ponto | `actions/ponto.ts:211` | fixo "Custo Variável" (devedora) ✔ |
| Importação por planilha | `actions/version-io.ts:118` | fixo "Custo Variável" — **a planilha não traz categoria**; 3-C.3.2 não se aplica (reportado) |
| Baixa de estoque | `actions/estoque.ts` | não grava despesa |

## Conflitos e perguntas (documentados; sigo pelo caminho não destrutivo)

1. **2.2 "avisar, não bloquear" × Prompt I §12 (em produção).** O prompt S foi escrito supondo que `deleteDespesa` "apaga sem verificar"; o Prompt I já fez a exclusão **recusar** com qualquer dependência. **Mantenho a recusa** (é o mais seguro) e acrescento o que falta: confirmação pelo PED (2.3), inventário na auditoria (2.4), transação (2.5), diagnóstico (2.6). Se preferir "avisar e deixar excluir", me diga — é trocar a recusa por aviso em uma função.
2. **3.2 "Pago" pela edição.** Bloqueio menor confirmado: a operação **usa o status como atalho** (local: 24 "Pago", 0 pagamentos; em produção havia despesas pagas sem NF [dado de produção removido]). Fechar hoje atrapalha o dia a dia. **Faço o que não atrapalha:** whitelist do domínio (`A pagar` / `Pago`, no servidor, também para parcela) e a IA não grava status fora disso. **Deixo "Pago" permitido** até você decidir o desenho (ex.: ao marcar Pago, pedir data e banco e registrar o pagamento no mesmo lugar).
3. **BS-2:** ver tabela — decisão sua.
4. **3-B forma de pagamento (terceiro / cartão):** cartão depende do Prompt U (ainda não existe); terceiro é o par do Prompt T (que tira o formulário de Ressarcimentos). **Entrego a 3-B junto com o Prompt T**, reutilizando `criarDespesaTerceiro` (idempotente) sem reescrever, e o select de pagador já filtrado pelo papel (Prompt W). O bloqueio menor 3-B.5 (status "Pago" na despesa criada por terceiro) entra nessa hora.
5. **5-A aba Acertos:** a 5-A.8 manda entrar **só depois** da conciliação do Prompt L. Fica para lá; `/acerto` continua. As abas "A Pagar" e "Parcelas" ficam (Prompt R ainda não veio).
6. **Rateio na observação (nota da seção 9):** local 0; SQL para produção.

## Plano de PRs

| PR | Conteúdo | Muda dado? |
|---|---|---|
| **S-1** · natureza e domínio | 3-C em todos os caminhos (acerto ×2, caixa), uma só mensagem; 3.2 whitelist de status (despesa e parcela) mantendo "Pago"; 3-C.4.3 recusa no campo com o caminho (Contas a Receber); 3-C.4.4 legado credor marcado e sem salvar sem trocar; IA não grava status fora do domínio; aviso pós-criação não em vermelho; testes 15f–15p | Não |
| **S-2** · exclusão | 2.3 PED digitado; 2.4 inventário no log; 2.5 transação; 2.6 SQL | Não |
| **S-3** · trava de conciliação | 1.2 mensagem com o movimento (data, valor, descrição); 1.3 mensagem de permissão | Não |
| **S-4** · selo, repositório, desempenho, IA | 4.1–4.4 selo "Sem NF" diz o que falta, clipe ≠ nota, plural; 6.1 join do Repositório; 7.1 documentos só das despesas em tela; 8.2 origem "assistente" na auditoria e validação de projeto no servidor | Não |
| adiados | 3-B (com T), 5-A (com L), BS-2 (decisão) | — |

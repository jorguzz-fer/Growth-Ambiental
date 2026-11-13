# Prompt J · Unidades — relatório final (seção 11)

Cinco PRs curtas, cada uma com doc própria: [J-1](./V2-PROMPT-J-PR1.md)
exibição, [J-2](./V2-PROMPT-J-PR2.md) actions, [J-3](./V2-PROMPT-J-PR3.md)
importação, [J-4](./V2-PROMPT-J-PR4.md) painel, [J-5](./V2-PROMPT-J-PR5.md)
lançamento assistido. Inventário em [`V2-PROMPT-J-FASE1.md`](./V2-PROMPT-J-FASE1.md).

| # | Item pedido | Resultado |
|---|---|---|
| 1 | Teste de data de BJ-1 | O campo guarda `MM/DD/YYYY` e a lista mostrava o texto cru: dia 25 apareceria como `09/25/2026`. Na base local, unidade criada pelo formulário com venda em 25/09/2026 passou a aparecer **25/09/2026** (J-1) e foi removida ao fim. Nenhuma unidade de teste em produção |
| 2 | Duplicatas de BJ-2 e a constraint | Produção (30/09): **nenhuma**. Índice único `unit (version_id, code)` na migração 0046, que **lista as repetidas e para** se alguma existir, sem apagar. Reconferir com a consulta 2 de `docs/sql/v2-prompt-j-diagnostico.sql` logo antes do deploy da J-3 (ver "conflito a decidir" na doc da J-3) |
| 3 | As três condições de BJ-3 | (1) `saveUnit`/`importUnits`/`deleteUnit` devolvem `{ ok, error }` (J-2, I-3). (2) A action `proporUnidadePorTexto` **não importa o banco**; a proposta vai ao `sessionStorage` do navegador e o formulário a mostra campo a campo; gravar é o botão do usuário, pela mesma `saveUnit` com a permissão verificada no servidor — não há rota, action ou botão que grave a partir da proposta. (3) O painel não tem, não sugere e não oferece exclusão; excluir continua só pela lista/formulário, com o código digitado |
| 4 | Arquivos alterados | ver a seção "Arquivos" de cada doc de PR |
| 5 | Inserção × atualização na importação | por `(version_id, code)` exato após `trim`, dentro de uma transação com as unidades da versão travadas; existe → atualiza; não existe → insere. Pré-visualização mostra "Nova / Atualizar" por linha |
| 6 | `payment_plan` intocado pela importação | a atualização só passa bloco, tipo, m², andar, valor e status (só os preenchidos); o plano, a data da venda e o tipo de cadastro não entram no `set`. Teste de integração: unidade vendida com plano, reimportada só com valor, mantém o plano exato |
| 7 | Unidades que mudam de sinalização com R$ 0,01 | na base local, zero. Em produção: consulta 3 do SQL, a rodar pelo dono (reproduz `calcUnitTotal` em SQL); a linha "MUDA" é a resposta |
| 8 | Assistente: o que pode e não pode gravar | **Nada.** Analisa (planos, cadastro) em código puro sobre as unidades da tela; propõe o preenchimento a partir de texto/voz. Gravar, editar e excluir são sempre do usuário, pelas actions de sempre |
| 9 | Antes/depois de `unit` | local: 2 unidades, [valor removido] antes e depois de cada PR. Produção: consulta 1 do SQL antes da J-1 e depois da J-5 |
| 10 | Seção 7 (fora de escopo) | intocada: `deleteProject`, §54, §55, BI-2, rótulo do menu. `calcUnitTotal`, `expandUnitReceivables`, `getReceivables`, `getUnitCodesByTenant` sem alteração. `getUnits` ganhou o tenant na cláusula (5.3) e os chamadores passam a empresa; nenhum número muda |
| 11 | Migrações | 0046 `unit_codigo_unico` (índice), com `down/0046_unit_codigo_unico.sql` |
| 12 | Limitações | "Cadastrar a partir do contrato" espera a resposta sobre enviar o contrato ao provedor (A/B/C na Fase 1). "Receita reconhecida" espera a §54 do Prompt I (datas das obras sem início e fim). A importação por planilha continua sem coluna de data da venda e de plano (só o formulário). A voz depende da Web Speech API do navegador (Chrome/Edge/Safari); o texto sempre funciona |

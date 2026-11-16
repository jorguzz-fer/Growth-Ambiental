# Prompt Y — PR 1: regras, actions, migração 0060 e a tela

Resumo em português simples. Migração **0060** (aditiva, com `down/`).
Nenhuma despesa, permuta ou lançamento é alterado; a tela tem 0 registros em
produção.

## O que mudou

### Regras puras (`src/lib/estoque-regras.ts`, testadas)
- **Entrada aponta UMA despesa OU UMA permuta** (3.2) — nunca as duas, nunca
  nenhuma. **Saída exige a obra** (4.1). Quantidade > 0.
- **Saldo**: entrada soma, saída subtrai; **negativo aparece** (1.3) — na
  tabela com selo "saldo negativo" e no card "Saldo negativo".
- **Custo gravado** (2.4): o movimento é valorizado pelo custo do cadastro
  **no momento**, gravado em `stock_movement.custo_unit`. Alterar o cadastro
  depois não reescreve movimentos (teste 11). O campo de custo saiu do
  formulário (mostra o do cadastro, só leitura).
- **Saída maior que o saldo** (2.5): avisa com o saldo resultante e só grava
  depois da confirmação (`confirmar=1`).
- **Soma das entradas acima do valor da despesa** (3.5): avisa, não bloqueia.
- **Estorno** (2.6) = lançamento inverso (mesma quantidade e custo, mesma
  obra/origem) apontando o original por `estorno_de_id`; o original fica,
  marcado "estornado". Estorno de estorno e segundo estorno são recusados;
  motivo obrigatório.
- **Cadastro** (5.1): nome obrigatório, custo e mínimo não negativos,
  **unidade de uma lista** (un, kg, g, t, m, m², m³, L, sc, cx, pç, rolo,
  lata, galão, barra, par, jg). Número do campo aceita "32.5", "32,5" e
  "1.250,75"; texto inválido é recusado (não vira zero).
- **Exclusão** (5.2): item com movimento é **recusado**, com a opção de
  inativar (coluna nova `stock_item.ativo`); item inativo some das opções e
  não movimenta; exclusão (só sem movimento) pede confirmação e audita nome,
  SKU e saldo.

### Actions (`src/lib/actions/estoque.ts`) — todas `{ ok, error }` (5.3)
`addStockItem`, `updateStockItem` (auditoria com antes/depois),
`setStockItemAtivo`, `deleteStockItem`, `addStockMovement` (validação **no
servidor**: vínculo, obra, despesa/permuta da empresa, item ativo; custo do
cadastro; avisos), `estornarMovimento`. Auditoria em cadastrar, editar,
inativar/reativar, movimentar, estornar e excluir (5.4). **Nenhuma cria
despesa, altera despesa/permuta ou toca a DRE** (BY-1; teste 10a confere a
foto das despesas antes e depois).

### Consultas (5.6)
- `getStockSaldos`: saldo por item **no SQL**.
- `getStockMovementsPage`: movimentos **paginados** (50) com filtros no SQL
  (material, obra, tipo, período) e a marca "estornado".
- `getDespesasParaEstoque`: fornecedor, competência, valor, obra e o que já
  foi lançado em estoque contra a despesa (3.3).

### Tela
- Cards: itens ativos, valor em estoque (a custo), abaixo do mínimo, saldo
  negativo. Abas por URL (`?tab=itens|mov`), filtros e paginação por URL.
- Itens: formulário validado, **editar** inline, **inativar/reativar**,
  excluir com confirmação (oferece inativar quando há movimento).
- Movimentos: entrada mostra despesa **ou** permuta (uma limpa a outra) e o
  **resumo da despesa** (fornecedor, competência, valor, obra, já lançado);
  saída exige obra de destino e a tela diz: *"Sem efeito contábil: não cria
  despesa, não altera a DRE nem reclassifica custo"* (4.5). Botão
  **Estornar** por linha, com motivo.

### Migração 0060 (`0060_estoque_estorno_docs.sql`)
- `stock_item.ativo` (default true), `stock_movement.estorno_de_id`
  (`set null`), `document.stock_movement_id` (`set null`, usada na PR 2) e
  dois índices. `down/` remove os três e tira a linha do journal.

## Testes
- `estoque-regras.test.ts` (7): sinal e saldo negativo (1, 2), vínculo
  (6, 7), obra (10), avisos (9, 12), custo (11), estorno (13), cadastro e
  exclusão (14, 15), número do campo.
- `actions/estoque.test.ts` (6, banco): cadastro validado e auditado; entrada
  com custo gravado e cadastro alterado depois (11); várias entradas na mesma
  despesa com aviso (8, 9); saída sem obra, maior que o saldo com confirmação,
  saldo −15 visível e **despesas idênticas antes e depois** (10, 12, 2, 10a);
  estorno inverso sem apagar (13); exclusão recusada / inativar / excluir sem
  movimento com auditoria (14).
- `ak-parte1.test.ts` ajustado: excluir com movimento agora recusa; sem
  movimento audita como antes.
- Suíte: 141 arquivos, 1395 testes verdes (antes do ajuste do parser; depois,
  os 13 do estoque verdes de novo); `tsc`, `eslint`, `next build`.

## Teste de navegador (local, admin)
Cadastro → entrada sem origem recusada → com despesa, resumo da despesa e
aviso de soma → baixa sem obra recusada → baixa 8 com saldo 5 pede
confirmação → saldo −3 com selo → estorno cria a entrada inversa e marca a
saída "estornado" → saldo volta a 5. Despesas: 75 / R$ 43.701,75 antes e
depois. Seeds (1 item, 3 movimentos, 4 auditorias) apagados.

## Próximas
- **Y-2**: documentos do movimento (4-A) com compressão de imagem e
  miniaturas; consumo por obra e confronto compra × consumo (4.4 / 4.6).
- **Y-3**: assistente (7) e relatório final.

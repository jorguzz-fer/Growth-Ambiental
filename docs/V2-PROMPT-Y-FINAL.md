# Prompt Y — Estoque · Relatório final

PRs: #187 (Fase 1), #188 (Y-1), #189 (Y-2), Y-3 (assistente). Docs:
`V2-PROMPT-Y-FASE1.md`, `-PR1`, `-PR2`, `-PR3`; SQL em
`docs/sql/v2-prompt-y-diagnostico.sql`. Em português simples, item a item.

## 1. A saída não gera lançamento contábil
Confirmado. `addStockMovement` (saída) grava **só** em `stock_movement`:
não cria despesa, não altera despesa/permuta, não toca `cash_entry` nem DRE.
Teste 10a confere a foto das despesas antes e depois. A tela diz isso no
formulário de baixa e nos cards de consumo (BY-1).

## 2. BY-2 — despesas de material por projeto
Base local: 75 despesas sintéticas, 25 por obra (ESCRITÓRIO CENTRAL, OBRA 7
TESTE, EMPREENDIMENTO PILOTO), **nenhuma** com fornecedor ou histórico de
material. A consulta por projeto (heurística por nome do fornecedor) e a
lista de candidatas no projeto "guarda-chuva" estão no SQL para rodar em
produção. Não muda a implementação.

## 3. Correção do sinal e os cards
O sinal **já estava correto** no código atual (entrada soma, saída subtrai;
sem `Math.max`). O saldo passou a ser calculado **no SQL** (`getStockSaldos`)
e o negativo aparece com selo. Cards: itens ativos, **valor em estoque a
custo**, abaixo do mínimo, **saldo negativo** (novo).

## 4. Vínculo com despesa e permuta
Garantido **no servidor** por `recusaDoMovimento`: entrada aponta exatamente
uma de `despesa_id` / `permuta_id`; ambas e nenhuma são recusadas; a despesa e
a permuta precisam ser da empresa. A tela mostra fornecedor, competência,
valor, obra e o que já foi lançado em estoque contra a despesa (3.3). Uma
despesa gera várias entradas (3.4); soma acima do valor avisa, sem bloquear
(3.5). A despesa não é alterada (3.6).

## 5. Custo gravado no movimento
`addStockMovement` lê `custo_unit` do cadastro no momento e grava em
`stock_movement.custo_unit`; o formulário mostra o custo só leitura. Alterar
o cadastro depois não reescreve (teste 11). O estorno copia o custo do
original.

## 6. Estrutura criada (migração 0060, com `down/`)
- `stock_item.ativo` boolean default true (inativar em vez de excluir).
- `stock_movement.estorno_de_id` uuid → `stock_movement.id`, `set null`.
- `document.stock_movement_id` uuid → `stock_movement.id`, `set null`.
- Índices `stock_movement_estorno_idx` e `document_stock_movement_idx`.
Nenhuma coluna para a obra na saída: `project_id` já existia e passou a ser
exigido no servidor para saída.

## 6a. Limite real de arquivo
`LIMITE_UPLOAD_MB = 10` por arquivo e `bodySizeLimit = 12mb` por envio de
Server Action. Foto de celular passa disso e várias fotos estouram o envio:
**sim, foi preciso tratar** — compressão no navegador
(`src/lib/imagem-compressao.ts`: lado maior 2000 px, JPEG 0,85, só imagens
acima de 1,2 MB; PDF intacto; em falha envia o original).

## 7. Assistente
`src/lib/estoque-analise.ts` (puro) + `assistente-estoque.tsx`. Leitura da
nota pela action `proporEntradasDaNota` (documentos da despesa, lidos do R2,
pela IA — `src/lib/ai/estoque-itens.ts`), devolvendo propostas casadas com o
cadastro. **Não grava sem confirmação**: entrada e cadastro só com o clique,
pelas mesmas actions da tela; o painel não tem excluir, estornar nem
inativar (teste 17).

## 8. Nenhuma despesa ou permuta alterada
Confirmado por teste (10a) e por contagem: despesas 75 / R$ 43.701,75 antes
e depois de cada PR; `permuta` 0; `document` 0. Nenhuma action deste prompt
escreve nessas tabelas (só lê).

## 9. Nenhuma outra tela mudou
`stock_item` / `stock_movement` continuam sendo lidos só por
`actions/estoque.ts`, `queries.ts`, `schema.ts` e testes. DRE, Dashboard,
relatórios e backup não os leem. A permissão `estoque` manteve a chave.

## 10. Limitações
- Leitura da nota depende de `ANTHROPIC_API_KEY` e R2; sem eles, o painel diz
  o que falta e as análises seguem.
- Casamento item × cadastro é heurístico (nome exato pela IA, SKU, palavras);
  o que não casa vira proposta de cadastro — a pessoa decide.
- Agrupamento/consumo médio usam janelas fixas (90 e 180 dias).
- Compressão de imagem roda no navegador; navegador sem `createImageBitmap`
  envia o original (pode bater no limite de 10 MB).
- Estoque por canteiro e realocação de custo seguem fora de escopo (8).
- Teste `cartao-compra.test` (Prompt U) falhou de forma **intermitente** em
  duas rodadas completas da suíte (passou isolado 3× e em outras rodadas
  completas). Não é deste prompt; fica registrado para investigação.
- Backup não exporta `stock_*` (era ilha antes e continua); se o estoque
  passar a ter uso, incluir no Prompt AO.

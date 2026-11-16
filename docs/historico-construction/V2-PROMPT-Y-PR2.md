# Prompt Y — PR 2: documentos do movimento, consumo por obra e confronto

Sem migração nova (a coluna `document.stock_movement_id` veio na 0060).
Nenhuma despesa, permuta ou lançamento alterado.

## 4-A — documentos do movimento
- `addStockMovementDocs` / `deleteStockMovementDoc` em
  `src/lib/actions/estoque.ts`, no mesmo molde dos documentos da permuta:
  tipos **Nota do fornecedor · Romaneio ou canhoto de entrega · Foto do
  recebimento · Requisição de saída · Outros** (4-A.4); **versão por tipo
  dentro do movimento** (4-A.7 — mesmo tipo = versão seguinte, tipo
  diferente não herda); **várias imagens de uma vez** (4-A.5); limite de
  10 MB por arquivo; chave `tenants/<t>/estoque/<movimento>/…` no R2;
  auditoria `estoque.doc.upload` / `estoque.doc.unlink` com nome e chave.
- **Remover desfaz só o vínculo** (4-A.8): a linha sai, o arquivo fica.
- **Estornar não remove documentos** (4-A.9): ficam no movimento original.
- Componente `estoque-docs.tsx`: painel por movimento (coluna "Docs" com
  contagem; "anexar" abre), **miniaturas** para imagens e lista para PDF;
  texto deixa claro que a nota fiscal já está na despesa e aqui vai o
  recebimento (4-A.6). Entrada abre com "Nota do fornecedor", saída com
  "Requisição de saída".
- **Foto de celular (4-A.5, bloqueio menor)**: limite real do servidor é
  10 MB por arquivo e 12 MB por envio (`bodySizeLimit`). Decisão: comprimir
  **no navegador** antes de enviar (`src/lib/imagem-compressao.ts` — lado
  maior 2000 px, JPEG 0,85, só para imagens acima de 1,2 MB; PDF passa
  intacto; em falha, envia o original). A tela avisa quantas fotos foram
  comprimidas. Sem R2 configurado o painel diz o que falta.

## 4.4 / 4.6 — consumo por obra e confronto
- `src/lib/calc/estoque-obra.ts` (puro, testado):
  - **Consumo por obra** = saídas de consumo com destino na obra (estorno de
    saída devolve); entradas por despesa/permuta e seus estornos não entram.
    Por obra: total a custo e os itens com quantidade.
  - **Compra × consumo** = comprou (entradas cuja **despesa é da obra**,
    estorno de entrada desconta) × consumiu (saídas com destino na obra);
    diferença positiva = comprou mais do que usou (foi para outra obra ou está
    no almoxarifado). **É leitura: nada é corrigido automaticamente** (BY-1).
- Consulta `getMovimentosParaObra` (só leitura, respeita o período filtrado
  da aba). Dois cards na aba Entradas & Saídas, com o texto de que o consumo
  **não vira custo da obra** — ele já é, pela despesa.

## Testes
- `calc/estoque-obra.test.ts` (2): consumo com estorno devolvendo e permuta
  fora; confronto "comprou na 28, usou na 31" (10b).
- `actions/estoque-docs.test.ts` (4, banco com R2 substituído): tipo da
  lista, arquivo obrigatório, limite, três imagens de uma vez (13c); versão
  por tipo (13b); remover audita nome e chave e não apaga arquivo (13d);
  estorno não remove documentos (13a).
- Suíte: 143 arquivos, 1402 testes verdes; `tsc`, `eslint`, `next build`.
  (Uma rodada teve 1 falha intermitente em `cartao-compra.test` — Prompt U,
  sem relação; passou sozinho e na rodada seguinte da suíte.)

## Teste de navegador (local, admin)
Entrada de 10 m³ (R$ 800) na despesa da EMPREENDIMENTO PILOTO e saída de 4 m³
para a mesma obra → "Consumo por obra: EMPREENDIMENTO PILOTO · R$ 320 · Areia
4 m³"; "Compra × consumo: comprou R$ 800 · consumiu R$ 320 · diferença
R$ 480". Painel de documentos abre na linha; sem R2 local, avisa. Seeds
apagados; despesas 75 antes e depois.

## Próxima
- **Y-3**: assistente (7) — ler a nota da despesa e propor as entradas,
  propor cadastro, análises — e o relatório final.

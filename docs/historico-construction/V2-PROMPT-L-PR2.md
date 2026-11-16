# Prompt L — PR 2: vínculo com valor (Parte 2), toggle, importação e desfazer

Segundo passo do Prompt L. Entrega a Parte 2 (2.1 a 2.9), a regra 3.1/3.3
(a conciliação não fecha com diferença), a permissão própria de desfazer
(Parte 5) e o estado "conciliado sem vínculo" (BL-2 / 6.6). **Nenhum
`cash_entry`, `bank_account` ou `despesa` existente muda; nenhum vínculo
antigo é convertido; nenhum `rec` é limpo.**

## O que mudou

### Migração 0058 `conciliacao_despesa` (aditiva, `IF NOT EXISTS`, com `down/`)
Tabela de vínculo N:N com valor por linha — o mesmo formato que
`conta_receber_recebimento` (Prompt K) usa do lado do recebível: movimento,
despesa, `valor`, `pagamento_id` (o registro de pagamento que o vínculo gera,
lido pelo saldo real §15), origem (manual / importação / assistente), quem
criou, e o estorno lógico (`desfeito`, quando, por quem, motivo). As quatro
colunas antigas de `cash_entry` continuam gravadas (a primeira despesa
vinculada) — 2.8.

### Regras puras — `src/lib/conciliacao-regras.ts`
- `recusaDosVinculos`: a soma dos vínculos (existentes + novos) não excede o
  valor do movimento (2.4); cada valor > 0; sem despesa repetida.
- `conciliacaoConcluida`: só conclui (`rec = true`) quando os vínculos somam
  o movimento (3.1). Nada de ajuste automático.
- `estadoDaDespesa` (2.5 / BL-3 / 6.2): status **derivado** — "A pagar",
  "Parcialmente paga" ou "Pago" pelo pago contra o valor — e os três
  estados: Em aberto, Baixada (pago sem vínculo com extrato) e Baixada e
  conciliada; mais o "baixado sem conciliar" (6.4).
- `estadoDoMovimento`: pendente / parcial / conciliado / **conciliado sem
  vínculo** (BL-2) / ajuste.
- `correspondenciaInequivoca`: um candidato grava, mais de um propõe (2.7).

### Núcleo — `src/lib/conciliacao-db.ts`
`gravarVinculos`: transação com o movimento e as despesas travadas (`FOR
UPDATE`); recusa movimento de entrada, ajuste, movimento já concluído e
valor acima do saldo real da despesa (com a orientação de 3.2: lançar a
diferença como despesa própria); grava `pagamento` + vínculo por despesa,
recalcula o status derivado, atualiza as colunas antigas e `rec` só quando
conclui; audita `conciliacao.create` com os itens e as somas.
`desfazerVinculosDoMovimento`: estorno lógico dos vínculos (motivo), remove
os pagamentos que eles geraram, recalcula o status, libera o movimento
(preservado, 5.3), caminho antigo mantido; audita `conciliacao.undo` (5.4).

### Actions (`actions/caixa.ts`)
- `conciliarMovimento({ cashEntryId, itens: [{ despesaId, valor }] })`: um
  pagamento quita várias despesas de várias obras (2.3); valor zero = "o que
  couber" (menor entre o livre do movimento e o saldo da despesa).
- `conciliarDespesa` (caminho antigo da tela e do pareamento): agora com
  valor limitado — R$ 1.000 **não** marca R$ 5.000 como pago (teste 10).
- `toggleConciliado` (2.6): valida tenant, **versão congelada** e audita;
  com contraparte escolhida grava o vínculo em vez de só alternar a marca.
- `importCash` (2.7): grava o vínculo (origem "importação", com rastro)
  quando a correspondência é inequívoca; com mais de um candidato só
  propõe (fica pendente com as sugestões). Entradas compatíveis com parcela
  de unidade deixam de ser marcadas `rec` sem lastro: só proposta.
  **Comportamento novo só para importações futuras**; o que já está
  importado não muda.
- `desfazerConciliacao` (5.1/5.2): permissão **própria**
  `conciliacao:excluir`, distinta de editar; a mensagem diz qual permissão
  falta. Aceita motivo.

### Permissão nova na matriz
`conciliacao` — "Conciliação — ajustar e desfazer" (módulo Conciliação de
Caixa; sem rota): `criar` = ajuste de caixa (PR 3), `excluir` = desfazer.
Owner/admin nascem com tudo; membro restrito nasce negado (o bloqueio
intencional de 5.2). **Pergunta:** o Prompt M prevê outro desenho? Se sim,
muda o id, não o mecanismo.

### Tela
- Revisão da conciliação: valor por sugestão (padrão = o que falta), botão
  "Conciliar" por despesa e "Vincular todas com valor" para várias; selo
  "parcial: X vinculado · falta Y" enquanto a soma não fecha; lista de
  conciliados com os vínculos (PED, fornecedor, valor, origem), selo
  **"conciliado sem vínculo"** para os `rec` sem lastro (BL-2); desfazer
  pede o motivo.
- Tabela de lançamentos: selo "sem vínculo" ao lado do toggle.
- `getConciliacaoData`: movimento com vínculo parcial continua pendente
  (com `vinculado`); conciliados trazem `vinculos` e `semVinculo`.
- Trava do Prompt S (despesa conciliada não edita valor/datas) e a lista de
  movimentos conciliados passam a enxergar os vínculos com valor.

## Testes
- `conciliacao-regras.test.ts`: 9, 11, 10/2.5/6.2, 19/6.6, 13.
- `actions/conciliacao-valor.test.ts` (integração): 10 e 11 (parcial não
  conclui; derivado "Parcialmente paga"; excede recusa), 8 (seis despesas de
  três obras), 17 (permissão própria com mensagem; movimento preservado;
  pagamentos removidos; status recalculado; audit), 12 (toggle: tenant,
  congelada, contraparte grava vínculo), 19 (rec sem vínculo), 13
  (importação inequívoca × proposta), caminho antigo limitado.
- Suíte completa: 134 arquivos, 1358 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Movimento de −R$ 250 e despesa de R$ 250 semeados: vínculo de R$ 100 →
"Vínculo gravado (R$ 100 de R$ 250)…" e selo "parcial: R$ 100 vinculado ·
falta R$ 150"; vínculo de R$ 150 → "Movimento conciliado"; lista mostra os
dois vínculos; Desfazer com motivo → despesa "A pagar", vínculos desfeitos,
pagamentos removidos, movimento preservado. Os 7 `rec` sem vínculo da
versão aparecem como "conciliado sem vínculo". Semente removida.

## Dados (teste 22)
`cash_entry` 46 / 1.793,14 / 22 rec · `bank_account` 4 / 0 / 4 ·
`despesa` 75 / 43.701,75 / 24 pagas · `conciliacao_despesa` 0 ·
`pagamento` 0 — iguais antes e depois.

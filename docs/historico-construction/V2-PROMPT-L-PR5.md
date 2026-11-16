# Prompt L — PR 5 (Parte 8-A): o assistente do Caixa

Sem migração. Nenhum dado existente alterado.

## O que mudou
- **Painel "Assistente IA"** na tela de Caixa, à direita (desce para baixo em
  telas estreitas), com o selo **"Propõe, você confirma"** (8-A.8) — não é
  "somente leitura" porque ele propõe vínculo, mas o vínculo só existe depois
  do seu clique.
- Toda a análise é **código puro** em `src/lib/caixa-analise.ts`, sobre o que a
  página já carregou. Nada vai a modelo; nada é gravado pelo módulo.

### 8-A.2 — pares propostos
- Para cada saída do extrato pendente, a melhor candidata de conta a pagar,
  com **grau** (alta/média/baixa, o mesmo da conciliação) e **motivo** calculado
  dos dados: "valor e data exatos", "valor exato e fornecedor citado no
  histórico", "valor exato e data próxima (n dias)", "valor exato", "valor
  aproximado com histórico compatível", "valor aproximado e data próxima",
  "valor aproximado".
- **Inequívoco** = grau alto, única candidata alta do movimento, e a despesa
  não é candidata alta de outro movimento, com o valor fechando. Só esses
  entram no botão "Confirmar as N inequívocas". Os demais, um a um.
- A confirmação chama a **mesma `conciliarMovimento`** do revisor (permissão
  `caixa: editar`, `FOR UPDATE`, status derivado, auditoria). Não há "confiar
  em todas" (8-A.1).

### 8-A.3 — agrupamentos
- Movimento sem candidata que feche sozinha: o assistente procura, entre as
  contas abertas **do mesmo fornecedor** (citado no histórico ou presente nas
  sugestões), o subconjunto (2 a 6 despesas, listas de até 12) cuja soma
  fecha com o que falta no movimento — tolerância 0,5% — e mostra a soma e a
  diferença. A confirmação é no revisor, informando o valor de cada vínculo.

### 8-A.4 — diferença do dia
- Para cada dia realizado da faixa em que os dois saldos não batem: a frase
  ("Faltam R$ 1.060,00 em 29/09: 1 débito de R$ 1.150,00 no extrato sem
  lançamento, e 1 lançamento de R$ 90,00 sem movimento no extrato") e as
  **linhas** por natureza. Dia que herda a diferença de outro diz que nenhuma
  linha dele a explica.

### 8-A.5 — falta cadastrar
- Movimento sem nenhuma candidata: o que parece ser (fornecedor citado no
  histórico, ou conta vencida de valor compatível) e o link "Lançar em
  Despesas / Contas a Receber com estes dados →" (encaminhamento da PR 3).

### 8-A.6 — as seis análises
- Dias que não fecham (do mais antigo), conciliado sem vínculo (BL-2) por mês,
  baixado e não conciliado (total, despesas, idade), extrato não importado
  (contas sem atualização há mais de 7 dias ou nunca), dias não fechados
  (conciliados sem fechamento e abertos antes de um fechado), padrão de
  recorrência (mesmo histórico e valor ±2% em 3 meses ou mais).

### 8-A.7 — nunca
- O painel **não tem botão de ajuste**, não dá baixa, não altera despesa nem
  movimento. Teste de arquivo trava: o módulo não importa ações nem banco; o
  painel não importa `addAjuste`, `toggleConciliado`, `importCash`,
  `fecharDia`, `desfazerConciliacao` nem funções de pagamento — só
  `conciliarMovimento`, disparada por clique.

### Também nesta PR
- `caixa-entry-form.tsx` (formulário genérico de lançamento de caixa) foi
  removido: desde a PR 3 nenhuma tela o renderizava. A ação `addCash` fica.
- Espaço entre as colunas da tabela dos dois saldos.

## Testes
- `src/lib/caixa-analise.test.ts` (6): pares com grau/motivo/inequívoco (20a),
  agrupamento de seis despesas (20b), explicação do dia pelas linhas (20c),
  encaminhamento, recorrência e análises, e o "nunca" (20d).
- Suíte: 139 arquivos, 1380 testes verdes; `tsc`, `eslint`, `next build`.

## Teste de navegador (local, admin)
- Painel presente com o selo, as cinco seções abrem; nenhuma seção tem botão
  de ajuste; na base local não há saída pendente (0 pares), e as análises
  mostram o BL-2 por mês e as contas sem extrato.

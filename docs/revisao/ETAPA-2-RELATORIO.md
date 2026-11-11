# Revisão 4 · Etapa 2 · Prompt AT, seções 1 e 2 — relatório

**Data:** 11/11/2026 · **Spec:** `docs/revisao/SPEC-REVISAO-2026-11.md`, Parte 3 e Anexo A

## Antes da etapa (pendências da Parte 2)

- **Etapa 1 (Prompt AS), commit `d6daf16`:** entrou no `main` pelo PR #280.
- **PR #268:** conferido (só os 3 arquivos esperados) e mergeado. Ele e a
  Etapa 1 corrigiam `fatura-pagamento.test.ts` do mesmo jeito, e o merge ficou
  limpo.
- Validação das duas juntas, antes do merge: suíte com banco com 263 arquivos e
  2148 testes, 0 pulados. `tsc` e `eslint` sem erro.

## O que mudou

### §1 · Open Finance (C19)

- **1.1 · Migração 0072** (aditiva, com `down/`): cria a coluna
  `cash_entry.external_id` (id da transação na Pluggy) e um índice único
  `(bank_account_id, external_id)` só onde a coluna está preenchida. Todas as
  linhas existentes ficam com a coluna nula; nenhuma é alterada.
- **1.2 · Worker** (`src/workers/sync-openfinance.ts`): cada transação entra
  **uma vez por conta**. Antes, entrava uma vez por versão Atual. A
  deduplicação agora é pelo id da transação, e não mais por descrição + data.
  Uma transação repetida é ignorada pelo índice; nada existente muda.
- **1.3 · Medição:** `scripts/medicao-openfinance.sql` (somente leitura) e
  `docs/AT-MEDICAO-OPENFINANCE.md`.

### §2 · Correções independentes

- **2.1 · Projeção de 7 dias sem permuta (C16):** a faixa do Caixa usa a nova
  função pura `aReceberDaFaixa` (`src/lib/calc/previsto-caixa.ts`), que deixa a
  permuta de fora. Para isso, cada recebível do plano passou a dizer de qual
  seção veio (`secao`). O financiamento fica como está até a BAR-3. **Nenhuma
  outra leitura mudou:** Contas a Receber, Dashboard, Projeção e o agente
  continuam com a permuta. Isso é a BAR-4, do Prompt AR.
- **2.2 · Conciliar exige vínculo (C17):**
  - `toggleConciliado(id, true)` sem contraparte é recusado, com a explicação
    do que fazer.
  - Desfazer pede motivo, que vai para a auditoria (`conciliacao.flag`, campo
    `motivo`).
  - Na tabela do Caixa, "pendente" deixou de ser clicável; "conciliado" só
    desfaz.
  - Os movimentos já marcados sem vínculo **não mudam**. A lista de revisão
    deles **já existe**: o selo "conciliado sem vínculo" na lista de
    conferência da Conciliação e o bloco "Conciliado sem vínculo (BL-2), por
    mês" no Assistente do Caixa. Não criei outra.
- **2.3 · Modo comparação:** fica para a seção 4, como manda a spec.
- **2.4 · Aging de Ressarcimentos:** teste novo com relógio fixo. A função não
  mudou, porque o teste não achou erro.

## Testes novos

| Teste | Arquivo |
| --- | --- |
| AT-T1 · 3 obras, 1 conta, 10 transações → 10 movimentos, todos na mesma versão | `src/workers/sync-openfinance.test.ts` |
| AT-T2 · dois "PIX RECEBIDO" no mesmo dia com valores diferentes → 2; a mesma transação de novo → 1; repetição no mesmo lote → 1 | idem |
| Mesmo id em outra conta é outra transação; empresa sem versão Atual não grava | idem |
| AT-T3 · permuta prevista para amanhã não muda o saldo projetado de amanhã | `src/lib/calc/previsto-caixa.test.ts` |
| O resto do plano continua na faixa (financiamento, FGTS, contas lançadas) | idem |
| AT-T4 · conciliar sem contraparte é recusado; desfazer sem motivo é recusado; com motivo desfaz e audita | `src/lib/actions/conciliacao-valor.test.ts` |
| AT-T4b · aging nas faixas, nos limites exatos (30/31, 60/61, 90/91), com a data-base certa e andando com o relógio | `src/lib/actions/restituicoes-aging.test.ts` |

**Testes antigos ajustados:**

- Dois testes criavam "conciliado sem vínculo" pelo caminho que foi fechado:
  - `ak-parte1.test.ts`
  - teste 19 de `conciliacao-valor.test.ts`

  Agora eles gravam esse estado direto no banco, como dado antigo, e conferem a
  mesma coisa de antes.
- `incc-empresa.test.ts` falhou uma vez na suíte completa. A causa: a consulta
  do próprio teste não tinha `ORDER BY`, e o Postgres devolve na ordem física,
  que muda depois de apagar e regravar. Corrigi só o teste (ordem por mês). O
  código do INCC não mudou.

## Pontos para o dono decidir ou conferir

1. **Destino provisório do Open Finance.** A spec diz para gravar "na versão
   Atual que a seção 3 definir como destino provisório", mas a seção 3 não
   define nenhuma. Usei a **versão Atual mais antiga da empresa** (a primeira
   criada), que é uma regra fixa. Como o Open Finance não está ligado, isso não
   afeta nenhum dado hoje. A seção 3 substitui essa regra.
2. **Faixas do aging diferentes da spec.** A §2.4 fala em "a vencer, 1–30,
   31–60 e mais de 60". O código usa as faixas do Prompt T:
   - **até 30**, que inclui o que ainda vai vencer;
   - **31–60**;
   - **61–90**;
   - **acima de 90**.

   Não é erro de cálculo; é outra divisão. O teste trava a divisão atual. Mudar
   (separar "a vencer", juntar 61–90 com 90+) muda números na tela, então só
   com decisão sua.
3. **Branch.** A Parte 1 pede uma branch nova por etapa. Esta sessão só pode
   publicar na branch `claude/emissao-nf-app-i18c8k`. Cada etapa vira um PR
   próprio a partir do `main` atualizado.
4. **BAT-1:** a medição na produção ainda precisa ser rodada (ver
   `docs/AT-MEDICAO-OPENFINANCE.md`).

## Validação

- `npm run test:all` (typecheck + lint + suíte com banco, Postgres 16, todas as
  migrações até a 0072): **265 arquivos, 2161 testes, todos passaram, 0
  pulados.**
- `next build`: ok.
- Pacote: `scripts/pacote-revisao.sh 4b3a604`, em que `4b3a604` é o `main`
  depois do merge do PR #268, antes desta etapa.

## Decisões depois do relatório (11/11/2026)

- **Faixas do aging:** o dono decidiu **manter como está** (até 30 com "a
  vencer", 31–60, 61–90, acima de 90). O teste AT-T4b trava essa divisão.
- **Próxima etapa:** o dono autorizou seguir para a Etapa 3 sem esperar a
  aprovação do pacote.

# Prompt DP · Categoria da DRE no Plano de Contas — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Decisões BDP-1 e BDP-2 de 18/10:
o de-para não é tela nova, mora no cadastro do Plano de Contas. Cada conta tem
exatamente uma categoria da DRE, editável, com um padrão de boa prática que o
sistema já traz. Pré-requisito de AC3 (DRE Analítica) e AD3 (Fluxo Analítico).

## O que mudou

- **Plano de Contas.** Cada subitem mostra a sua categoria da DRE, com
  "(padrão)" quando segue a boa prática. Em "Editar", a conta ganha um campo
  de categoria. "Padrão" volta à boa prática. Conta de despesa não aceita
  "Receita", e conta de receita é sempre "Receita".
- **Chave nova, desligada: "Despesa herda a categoria da DRE do Plano de
  Contas".** Desligada, nada muda: a pessoa escolhe a categoria em cada
  despesa e os relatórios leem a escolhida. Ligada:
  - no lançamento de despesa, a categoria vem da conta e aparece travada;
  - o servidor grava a categoria da conta, qualquer que seja a enviada (no
    lançamento, na edição e na despesa criada a partir do extrato no Caixa);
  - a DRE e o card Orçado x Realizado contam as despesas já lançadas pela
    categoria da conta. **Nada é regravado**: desligar volta à categoria de
    cada despesa.
- **Prévia em Chaves de mudança** (BDP-3): quantas despesas da versão Atual
  mudam de categoria, por conta e por par "hoje → pela conta", com o valor.

## O padrão de boa prática

| Contas | Categoria |
|---|---|
| Grupos de obra (1 a 10), Técnicos/Projetos, Pós-obra, EPI e uniformes, tributos da obra | Custo Variável |
| Comercial/Vendas, Marketing, IRPJ/CSLL | Despesa Variável |
| Tecnologia, Administrativo, Financeiro/Contábil, Jurídico | Despesa Fixa |
| Recursos Humanos (exceto EPI) | Custo Fixo |
| Tarifas, IOF/juros/multas, juros de mora, descontos obtidos | Despesas Financeiras |
| Conta de receita | Receita |

Conta criada pelo cliente fora do plano padrão segue o tipo: de obra é Custo
Variável e complementar é Despesa Fixa, a mesma regra que Orçamentos já usa.
O Thiago confere e ajusta a categoria de cada conta do cliente na tela antes
de ligar a chave.

## Premissas e limites

- **Conta de receita numa despesa.** Com a chave ligada, o lançamento é
  recusado com a orientação de escolher uma conta de despesa. Nos relatórios,
  despesa antiga numa conta de receita mantém a categoria gravada, para nunca
  virar receita na DRE.
- **Despesa sem conta, ou com conta que não existe mais no plano**, mantém a
  categoria escolhida.
- **Orçamentos e Previsão não mudam.** Lá a categoria é por grupo, não por
  conta, e o pedido falou da despesa. Fica para quando o Thiago decidir se o
  grupo segue as contas.
- **O Acerto Contábil** (rateio de mão de obra) continua gravando a categoria
  que recebe. Nos relatórios, com a chave ligada, essas despesas também contam
  pela categoria da conta.
- A lista de Despesas e o Contas a Pagar mostram a categoria gravada em cada
  despesa. Com a chave ligada, a DRE mostra a da conta.
- A prévia não é exportável em planilha como as quatro definições novas.

## Banco

Migração `0067_categoria_do_plano`: uma coluna nova, que aceita vazio, em
`chart_account`. Nenhum valor gravado nas contas existentes e nenhuma despesa
tocada. O rollback está em `migrations/down/`.

## Acesso

Editar a categoria da conta usa a permissão de editar do Plano de Contas, a
mesma de renomear a conta. Nada foi ampliado.

## Testes

- `src/lib/categoria-do-plano.test.ts` (novo): todo o plano padrão tem
  categoria, gasto de obra é Custo Variável, a escolha vence o padrão, a
  natureza limita a escolha, a herança e a prévia.
- `src/lib/categoria-do-plano-db.test.ts` (novo, com banco): chave desligada
  igual a antes; prévia sem gravar; chave ligada nos relatórios sem regravar;
  lançamento e edição gravam a da conta; conta de receita recusada; escolha na
  conta vale e "Padrão" volta ao vazio.
- e2e: as contas mostram a categoria, a conta 1.1 nasce Custo Variável, a
  chave aparece com a prévia, e a despesa segue livre com a chave desligada.
  Com a chave ligada no banco local, o campo da despesa vem travado com a
  categoria da conta.

# Prompt L2 · Caixa: dias fechados e projeção dos próximos dias — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Destrava o AB2 (o Balanço do
Dia pode sair porque o Caixa passa a listar os dias fechados).

## O que mudou

- **Cartão de cada dia, de hoje em diante, mostra o que vence.** Três linhas
  novas: "Vence a receber", "Vence a pagar" e "Saldo projetado". O saldo
  projetado parte do conciliado inicial de hoje, soma o que a cadeia já
  projeta (caixa lançado com data futura) e o que vence em cada dia.
- **O que venceu e segue em aberto aparece à parte**, num aviso abaixo do
  título da cadeia. Dinheiro atrasado não tem dia certo para entrar, então
  não é somado a nenhum dia.
- **Dias fechados no Caixa.** Abaixo da cadeia, uma seção recolhível lista
  o histórico de fechamentos, com a mesma tabela, filtro, impressão e
  exportação do Balanço do Dia. Aparece para quem pode ver o Balanço do Dia.
- **A Cris sabe a tela do Caixa.** Recebe os saldos por conta, os dias da
  cadeia com o previsto, os atrasados e o número de pendências. Traz
  sugestões de pergunta sobre a conciliação e a projeção.

## De onde vem o previsto

- **A pagar:** o saldo em aberto das contas a pagar da versão Atual
  (despesas, parcelas e restituições), sem as pagas e as canceladas.
- **A receber:** o que falta receber das contas a receber lançadas, mais as
  parcelas dos planos de venda de hoje em diante. As parcelas dos planos não
  guardam recebimento, então as passadas não contam como atraso.

## Premissas

- **BL2-1** (parcela a pagar sem dia) segue sem resposta. Título sem data de
  vencimento não entra na projeção nem nos atrasados. Se a resposta for
  outra, a mudança fica no módulo do previsto.
- **BL2-2** (quem conecta o Open Finance) segue sem resposta. O caminho de
  hoje continua: o link "Open Finance → configurar" no topo do Caixa leva a
  Contas Correntes. Não existe tela de onboarding no sistema para expor o
  fluxo.

## Acesso e dados

Nada gravado e nada apagado. A cadeia e o conciliado não mudam: o previsto é
só leitura. A lista de dias fechados usa a chave `balancodia`, a mesma da
tela de hoje.

## Testes

- `src/lib/calc/previsto-caixa.test.ts` (novo): soma por dia, atrasados à
  parte, saldo projetado e datas inválidas.
- e2e (`scripts/e2e/v3-telas.mjs`): o Caixa de um projeto mostra a lista de
  dias fechados, o previsto nos dias de hoje em diante e o saldo projetado.

# Prompt AA · AA-1 — nomes, seleção, recorte e bases declaradas

Partes 1, 1.3, 2.3.3, 3.2, 3.5, 4.1, 4-B.4, 4-B.5, 8.2, 8.3 e 8.5.
**Nenhum número calculado muda.** No navegador, antes e depois, em cada obra,
com período e na Empresa toda:
- Os 4 KPIs e os 8 cartões de status ficaram iguais.
- Mudaram nove cartões do painel da obra que mostravam "R$ 0" (ou "0") por
  falta de cadastro ou de serviço. Agora mostram "—" e dizem o que falta
  (3.5, 4.6).

## Nomes e seleção (Parte 1)

- **1.1 · os nomes:**
  - Cada coluna mostra a natureza (**Atual**, **Orçamento**, **Previsão
    Atualizada**) e, embaixo, o nome que o usuário digitou.
  - Nenhum `version.label` foi mexido.
- **1.2 · a seleção padrão:**
  - Atual + o Orçamento e a Previsão **mais recentes que não são cópia**
    (`selecaoPadrao`, a mesma regra da DRE).
  - Antes eram as três mais antigas.
- **1.4 · as cópias:**
  - A cópia, identificada por `source_version_id`, ganha a marca "cópia" no
    seletor. Sai do padrão e continua selecionável.
  - Ao tentar marcar a 4ª versão, o seletor **avisa** e não troca. Antes,
    descartava a primeira em silêncio. O aviso vale só no Dashboard; as
    outras telas seguem como antes.
  - Com mais de 3 na URL, a tela diz quantas ficaram fora.
- **1.3 · projeto sem versões:** declara a ausência e não monta os KPIs por
  versão. Nenhuma versão de outro projeto é usada.
- **1.6 · o recorte escrito** logo abaixo do título: projeto (ou quantos),
  versões e período. O seletor de versões desceu para essa linha.
  - O subtítulo "independente da versão ativa" saiu.

## O que cada número é (2.3.3, 4.1, 4-B.4, BAA-4, BAA-5)

- **Os quatro de cima:**
  - Cada cartão traz a definição de cada natureza em tela. Por exemplo:
    "A receber" na Atual são recebíveis em aberto; no planejamento, é saldo
    a realizar, não recebível.
  - O "—" de "A pagar" diz por quê: planejamento não tem conta a pagar.
  - Uma linha diz que estes quatro seguem a versão e o período.
- **Status e margem:**
  - Uma linha diz que **não seguem** versão nem período. Somam do começo da
    obra até hoje, e os percentuais são sobre a receita **do cadastro**
    (BAA-5: a base fica e passa a ser declarada).
  - **"Recebido" passa a se chamar "Entradas de caixa"** (BAA-4, opção 1).
    Mesmo número; o rótulo agora diz o que soma: toda entrada, não só venda,
    conciliada ou não.
  - Quando há caixa gravado fora da Atual, o cartão diz quanto.
  - "Executado" diz quantos Orçamentos somam no denominador. "% executado"
    diz quando a obra não tem Orçamento ou quando o Orçamento não tem
    despesa planejada.
  - "Margem" declara a janela de cada lado.
- **Indicadores da obra:** uma linha diz que vêm do cadastro e da medição por
  serviço, sem versão nem período.
  - Sem serviço, os cartões de serviço mostram "—" com "depende do cadastro
    de serviços" (3.2 e 3.5). "Serviços fora dos limites" deixou de ficar
    verde com 0.
  - Sem cadastro de financiamento, também "—".
  - **3.1:** sem medição, "Liberação acumulada" e "Saldo de financiamento"
    continuam com o número de hoje. O cartão passa a dizer que esse número é
    o valor do cadastro, não uma liberação registrada. Tirar o número vai na
    chave do AA-2.

## Banco (8.2, 8.3, 8.5) e erro visível (4-B.5)

- **`getStatusProjeto`:**
  - Filtra `project`, `version`, `cash_entry`, `despesa` e `budget_line` no
    SQL, por tenant e pelas versões dos projetos. Antes vinha a tabela
    inteira do tenant.
  - Devolve `composicao` (Orçamentos somados, caixa fora da Atual, obras sem
    Atual) só para declarar.
- **`getIndicadoresObra`:** `servico` com tenant; `medicao_servico` só dos
  serviços da obra, no SQL.
- **Consulta de caixa dos KPIs:** com tenant explícito.
- **`razao`:** helper exportado, com o mesmo guard de antes.
- **A falha de `budget_line`:**
  - Não vira zero: "% executado" mostra "erro" com o motivo.
  - A falha vai para o log.

## Testes

- `dashboard-oraculo.test.ts`, com banco. O código de **antes**, copiado
  literalmente, contra o de agora, sobre dados que têm:
  - cópia com caixa;
  - dois Orçamentos;
  - despesa cancelada;
  - outro tenant;
  - serviços e medições.

  Os números são iguais, e a composição declara 2 Orçamentos e R$ 300 fora
  da Atual.
- `dashboard-tela.test.ts`:
  - os rótulos;
  - a cópia por `source_version_id`;
  - o padrão mais recente, contra as três mais antigas de antes;
  - a 4ª versão avisada;
  - o recorte.
- Suíte inteira passando. tsc, eslint e build limpos.

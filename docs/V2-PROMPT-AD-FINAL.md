# Prompt AD · Relatório final — Fluxo de Caixa

Prompt AD (36 de 42). Quatro PRs: Fase 1, AD-1, AD-2 e AD-3. A AD-3 traz o
assistente e este relatório. Detalhes em
[`V2-PROMPT-AD-FASE1.md`](./V2-PROMPT-AD-FASE1.md),
[`PR1`](./V2-PROMPT-AD-PR1.md), [`PR2`](./V2-PROMPT-AD-PR2.md) e
[`PR3`](./V2-PROMPT-AD-PR3.md).

## 1. BAD-1: o ponto de partida

Adotada a opção recomendada, **atrás da chave `fluxo_definicao_nova`,
desligada**.
- **Com a chave ligada:**
  - com **uma obra**, o acumulado parte do caixa realizado da Atual antes do
    primeiro mês do eixo: o fluxo da obra (`partidaDaObra`);
  - na **Empresa toda**, continua pelo saldo das contas da empresa.
- **Com a chave desligada:** o número é o de antes, a soma das contas.
  - Agora a tela **declara** isso: "a soma das contas correntes da empresa
    (todas as obras), não o caixa da obra".

## 2. O diagnóstico de `bank_account`

- **Base local:** 4 contas ativas, nenhuma do tipo "Terceiros", saldo total
  de R$ 0.
- As três contas do Prompt X (SOCIO MESSIAS, SOCIO VINICIUS e CHEQUE
  TERCEIRO) entram no saldo inicial **se** estiverem ativas e não forem do
  tipo "Terceiros".
- **Em produção:** rodar o relatório 1 de
  [`sql/v2-prompt-ad-diagnostico.sql`](./sql/v2-prompt-ad-diagnostico.sql)
  (coluna `entra_no_saldo_inicial`).

## 3. BAD-2: o previsto já liquidado

- **Base local:** nenhuma parcela. O volume não pôde ser medido aqui.
- **Em produção:** rodar o relatório 2 do mesmo SQL.
- **A tela já mostra a ideia:**
  - com a chave ligada, o mês fechado mostra o previsto esmaecido e o
    realizado em destaque;
  - o assistente lista os meses fechados que seguem com previsto, com o
    selo "já venceu". No local, são 9 meses em 2026 na EMPREENDIMENTO PILOTO.

## 4. BAD-3: a comparação padrão

**Caixa × plano abre por padrão**, e a frase de abertura é dela. A
"Previsão de hoje × plano" aparece como segunda leitura, com rótulo e texto
de regime próprios. As duas nunca usam o mesmo rótulo.

## 5. O realizado sempre da Atual

- **Na tabela, com a chave ligada:**
  - `flowMapsRealizado(atualReal.id)`, qualquer que seja a ordem do seletor;
  - a base diz: "da versão Atual ("…"), qualquer que seja a seleção".
- **Com a chave desligada:** a tabela segue a primeira versão marcada, como
  antes, e a base nomeia essa versão.
- **No assistente, sempre a Atual,** com ou sem a chave.
  - Se a tabela lê outra versão, o painel avisa.

## 6. Permuta fora do planejamento

**Confirmado, com a chave ligada.** `flowMaps(..., { definicaoNova: true })`
deixa Orçamento e Previsão só com `budget_line`. Teste: a permuta de R$ 800
gravada no Orçamento soma com a chave desligada e sai com ela ligada.

## 7. Os três fallbacks

- **Os dois do Prompt A** (`ctx.project ?? ctx.projects[0]` e
  `ctx.versions`) já tinham saído antes deste prompt.
- **O terceiro, a "Atual substituta"** (`?? versoes[0]` e o `?? vs[0]` do
  consolidado), **sai com a chave ligada.**
  - Projeto sem Atual mostra a ausência e esconde realizado, desvio e
    acumulado.
  - No consolidado, o projeto sem Atual não entra com outra versão.
- **Com a chave desligada, fica como antes,** para não mudar número.

## 8. O eixo com o realizado

`eixoDoFluxo` une três coisas: os meses do INCC, os do previsto **e os do
realizado**. Um mês que só tem caixa ganha linha. No previsto ele soma zero,
e por isso nenhum total muda. Não depende da chave.

## 9. Mês fechado e mês futuro

- **Com a chave ligada:** o mês antes do corrente entra no acumulado pelo
  **realizado**; o corrente e os futuros, pelo **previsto**.
  - Uma linha na tabela marca a fronteira: "acima: meses fechados (o
    acumulado segue o realizado) · abaixo: projeção (o acumulado segue o
    previsto)".
- **Com a chave desligada:** tudo pelo previsto, como antes, e a base diz
  isso.

## 10. O desvio

- **A conta:** `desvioDoMes` = saldo realizado − saldo previsto do mês, com
  sinal. O % é sobre o |previsto|.
- **Só existe onde há os dois lados.** Com um lado só, a célula diz "sem
  realizado" ou "sem previsto".
- **Onde aparece:**
  - nas colunas **Desvio** e **Desvio %**;
  - na linha TOTAL, que soma só os meses comparados (`totalDoDesvio`);
  - numa nota que diz quantos meses ficaram fora.

## 11. As funções que o assistente lê

- **Os mapas:** `flowMaps` (plano e previsto da Atual) e `flowMapsRealizado`
  (caixa da Atual).
- **As linhas e o desvio:** `linhasDoFluxo`, `desvioDoMes` (dentro dela) e
  `totalDoDesvio`.
- **A versão de cada cenário:** `resolverCenario`, a mesma regra da DRE
  (com dois do mesmo cenário, vale o mais antigo).

**Ele não calcula nada por conta própria.** `fluxo-analise.ts` só filtra,
ordena e escreve frases. Um teste confere que o desvio e o total do painel
são iguais aos de `linhasDoFluxo` e `totalDoDesvio`.

## 12. As consultas e o filtro de tenant

- **Os projetos** vêm de `ctx.projects`: o contexto do servidor, já do
  tenant. Nunca de um id enviado pelo cliente.
- **As versões** vêm de `getVersionsDoProjeto(tenantId, projectId)`, que
  filtra por `tenant_id` e `project_id`.
- **Os dados de cada versão** vêm só por id de versão que veio dessa
  consulta:
  - `getMonthlyRevenue`, `getDespesas`, `getParcelasByVersion` e
    `getExpenseRows`;
  - `getPermutas(tenantId, versionId)`;
  - `getCash(versionId)`.
- **Teste:** com o tenant errado, nenhuma versão é lida e tudo vem ausente.
- **Permissão:** a página verifica `fluxocaixa:ver` antes de qualquer
  consulta, e o painel está dentro dela. O contador vê a tela (está em
  `CONTADOR_VE`) e vê o painel, que não tem escrita.

## 13. O que vai ao modelo

**Nada.** O assistente é uma conta local, no servidor e no navegador. Nenhum
campo é enviado a modelo de IA, então nada precisa ser mascarado (BE-2 do
Prompt E).

## 14. Nenhuma gravação

- **Sem caminho de escrita:**
  - O painel é um componente cliente que só recebe a análise pronta.
  - Não importa action nem banco e não faz `fetch`. Um teste lê o código e
    confere.
- **Contagens iguais:** um teste com banco conta `cash_entry`,
  `budget_line` e `version` antes e depois. São iguais.
- **O selo "Somente leitura"** não convive com nenhuma função de escrita.
  - O único estado salvo é a preferência de recolher, no `localStorage` do
    navegador.

## 15. A chave

- **`fluxo_definicao_nova`**, por empresa, nasce **desligada**.
- **Liga e desliga em `/chaves`.** A prévia em `/chaves#previa-fluxo` mostra
  por obra:
  - a partida e o acumulado, de hoje e pela definição nova;
  - a permuta que sai do planejamento;
  - o caixa gravado fora da Atual;
  - as obras sem Atual.
- **Na tela:** `chaveLigada(tenantId, "fluxo_definicao_nova")`.

## 16. Antes e depois, com a chave desligada

- **Os mesmos números.** A Empresa toda em 2026 tem previsto de entradas
  R$ 4.321, saídas R$ 43.702 e saldo −R$ 39.381, igual ao AD-1.
  - A EMPREENDIMENTO PILOTO mostra −R$ 14.567 de previsto no ano.
- **O que entrou sem mudar total:**
  - o mês só com realizado;
  - o caixa sem data, contado fora da tabela;
  - o "—" no mês vazio;
  - as colunas de desvio;
  - os nomes e as bases dos saldos;
  - o painel.

## 17. Migrações

**Nenhuma.** A chave usa a tabela `tenant_flag`, que já existe. Nenhum dado
foi alterado.

## 18. Limitações e perguntas

- **"Onde o caixa fugiu do plano" mostra os meses, mas não as contas que
  puxaram.** A tabela não abre o mês por conta, e o assistente só mostra
  número que a tela mostra (4.2).
  - **Pergunta:** a tabela deve ganhar a abertura por conta? Seria uma
    mudança de tela.
- **"O que já aconteceu e continua previsto" é por mês, não por parcela.** A
  tabela não lista parcelas. O texto avisa que o previsto desses meses já
  venceu e continua nos totais.
- **Com o painel aberto, a tabela larga rola na horizontal** para mostrar a
  coluna "Saldo acumulado". É o mesmo padrão da Conferência.
- **Na base local, o Orçamento da EMPREENDIMENTO PILOTO não tem nenhum valor planejado
  em 2026.** O painel diz exatamente isso e não inventa destaque.
  - O exemplo com achado foi feito com dados temporários, já apagados.
- **1.4 · conciliação:** o realizado conta lançamentos conciliados e não
  conciliados, e a tela declara isso.
  - **Pergunta:** mudar o critério? Valeria para Caixa, Dashboard e Fluxo
    juntos (Prompt L).
- **Pergunta:** confirmar BAD-1 e ligar `fluxo_definicao_nova`? Antes,
  conferir a prévia em `/chaves`.

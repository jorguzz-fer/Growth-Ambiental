# SPEC DE REVISÃO — GROWTH CONSTRUCTION · RODADA DE NOVEMBRO/2026

**Para quem vai implementar:** este arquivo é autossuficiente. Ele contém a
ordem de execução, as decisões já tomadas pelo dono, os bloqueios que ainda
dependem dele e, nos anexos, os prompts completos. Execute **um prompt (ou um
grupo de seções) por vez**, na ordem da Parte 3, e pare em cada BLOQUEIO.

Base: código do commit `d6daf16` (09/11/2026). Coloque este arquivo em
`docs/revisao/SPEC-REVISAO-2026-11.md` no repositório.

> **Revisão 4 · complemento de 11/11/2026.** Esta versão acrescenta o que foi
> tratado na reunião de revisão com o Thiago (Parte 7) e o estado do
> repositório conferido no código nesse dia. O texto original não foi
> alterado; todo acréscimo está marcado com **(11/11)**. Novos itens: C20 a
> C23, Prompts AU e AV (Anexos E e F), bloqueios BVZ e BIA.

---

## PARTE 1 · COMO TRABALHAR

1. **Uma branch nova por etapa**, com o nome da etapa
   (ex.: `revisao/at-1-2`). Nunca reaproveitar nem reiniciar branch de outra
   tarefa.
2. **Regra global de todos os prompts:** nenhum dado de produção alterado,
   apagado ou reatribuído sem decisão registrada; migrações só aditivas; nada
   retroativo.
3. **BLOQUEIO significa parar.** Quando um item depende de uma decisão do dono
   (códigos BAQ, BAR, BAT), implemente só o que não depende dela e relate.
4. **Medição antes de mudança.** Onde o prompt pede uma fase de medição, ela é
   somente leitura (conexão read-only ou transação com ROLLBACK) e vem antes de
   qualquer código.
5. **Todo relatório final traz:** a saída de `npm run test:all` (com banco),
   o número de testes pulados (deve ser zero, ou cada um com motivo), e o
   pacote gerado por `scripts/pacote-revisao.sh <commit-da-última-revisão>`.
6. **O pacote vai para o revisor** junto com o relatório. A etapa seguinte só
   começa depois da aprovação.

---

## PARTE 2 · ESTADO EM 09/11/2026

| Etapa | Prompt | Situação |
| --- | --- | --- |
| 1 | AS · Higiene | **Concluída** (commit `d6daf16`): 2.148/2.148 testes com banco, zero pulados; `meta/` versionado; `pacote-revisao.sh` criado |
| 2 | AT §1, §2 | A fazer — próxima |
| 3 | AQ · Cris | A fazer |
| 4 | AR · Fase 1 (medição) | A fazer |
| — | Decisões do dono | Pendente (Parte 5) |
| 5 | AR · Fase 2 | A fazer, depois das decisões |
| 6 | AT §3, §1-B, §4–§8 | A fazer, depois das decisões |
| 7 | Ampliação da Cris | Prompt a escrever (Parte 6) |
| **(11/11)** 3-B | AV · Ditado por voz | A fazer, junto da Etapa 3; começa pela reprodução (BVZ-1) |
| **(11/11)** 8 | AU · Planos de IA por empresa | Fase 1 (medição) a fazer já; Fase 2 depois de BIA-1 a BIA-6, antes ou junto da Etapa 7 |
| **(11/11)** — | AG · Nota fiscal (configuração) | Contrato Focus NFe assinado; falta configurar e testar em homologação |

**Pendências soltas, antes da Etapa 2:**

- **PR #268** está aberto. Segundo o relatório do Prompt AS, contém só
  `src/components/app/papel-e-telas.tsx` (um `useMemo` que resolve o aviso de
  lint `react-hooks/exhaustive-deps` na linha 22) e `planocontas-cris.test.ts`.
  Conferir que são só esses arquivos e mesclar.
- Confirmar que a branch `claude/client-logo-upload-fix-7co3es`, reiniciada a
  partir da `main` no Prompt AS, não tinha trabalho não mesclado.
- Não existe CI (`.github/workflows/` não existe). Fica registrado; não é
  desta rodada.

**(11/11) Conferido no repositório em 11/11/2026:**

- **A Etapa 1 não está no `main`.** O commit `d6daf16` existe só no branch
  `claude/client-logo-upload-fix-7co3es`, um commit à frente do `main`
  (`0825748`), **sem PR aberto**. No `main` ainda não existem
  `scripts/pacote-revisao.sh`, `scripts/test-db.sh` nem os scripts `test:db`
  e `test:all`. **Abrir o PR desse commit e mesclar antes da Etapa 2**, senão
  o relatório da Etapa 2 não tem como rodar `test:all` nem gerar o pacote.
  O commit mexe em 7 arquivos, todos de teste, script ou documentação
  (`.gitignore`, `README.md`, `package.json`, os dois scripts e dois testes).
- O **PR #268** continua aberto.
- Entraram no `main` depois do dia 27/10, e o revisor deve considerar
  na base: **#276 e #277 (desempenho da DRE)**. A DRE passou a somar as
  despesas e os encargos no banco, cada versão é lida uma vez por
  requisição (comparação antes × depois: 14.795 valores, zero divergências),
  e a migração **0071** criou índices em `despesa.version_id`,
  `pagamento.despesa_id`, `conta_receber.project_id`, `permuta.version_id` e
  `reembolso.version_id`. Docs: `docs/V3-DRE-DESEMPENHO-PR1.md` e `-PR2.md`.
  O Prompt AR (Etapa 5) mexe em `getMonthlyRevenue`, que a DRE consome: o
  teste `src/lib/dre-inputs-desempenho.test.ts` tem de continuar passando.
- **Desempenho do Fluxo de Caixa (achado da mesma medição, não corrigido):**
  "Empresa toda" faz **2.094 consultas** e leva 1,2 a 1,5 s no banco local
  (lê as despesas linha a linha com `getExpenseRows`, repetidas por obra e
  cenário). Proposta: fazer depois da Etapa 5, porque o AR separa
  `getMonthlyRevenue` em recebimentos (Fluxo) e receita (DRE) e mexeria no
  mesmo código.
- **Nota fiscal (Prompt AG):** o Thiago assinou o contrato da **Focus NFe**
  (reunião de 11/11). O código do emissor está pronto desde 26/10; falta o
  passo a passo de `docs/V2-PROMPT-AG-FINAL.md` ("Para ligar em produção"):
  `NFSE_TENANT_ID`, `FOCUS_NFE_TOKEN_HOMOLOGACAO`, cadastro fiscal da empresa
  em Homologação, código IBGE do município de cada obra, permissões
  "Emitir/Cancelar nota fiscal" e uma nota de teste completa em homologação.
  É configuração, não código: pode correr em paralelo às etapas.

---

## PARTE 3 · ORDEM DE EXECUÇÃO E AS 19 CORREÇÕES

Numeração das correções (C1 a C19) como foram identificadas; a ordem abaixo é
a de execução.

### Etapa 1 · Prompt AS — CONCLUÍDA

- C12 · Teste da fatura de cartão quebrava em novembro → relógio fixado.
- C13 · 95 de 263 arquivos de teste pulados sem banco → `test:db`, `test:all`.
- C14 · Zip de revisão sem `meta/`, `docs/` e histórico → `pacote-revisao.sh`.

### Etapa 2 · Prompt AT, seções 1 e 2 (Anexo A)

- C19 · O worker do Open Finance grava cada transação em todas as versões
  Atual da empresa e deduplica sem o valor (§1). O Open Finance não está ligado
  em nenhuma empresa; a correção é pré-requisito para ligar.
- C16 · A projeção de 7 dias do Caixa conta a permuta do plano como dinheiro
  (§2.1).
- C17 · O seletor de conciliado ainda marca movimento sem vínculo (§2.2).
- Teste do aging de Ressarcimentos, que não tem cobertura (§2.4).

### Etapa 3 · Prompt AQ — Cris (Anexo B)

- C3 · A base de conhecimento afirma falsamente que só a pergunta vai ao
  modelo; três frases sobre nome de cliente e funcionário estão erradas (§1).
- C4 · `/acerto` sem id de tela: formulário descartado no servidor e números
  liberados sem conferir permissão (§2).
- C5 · Markdown cru nas respostas (§3).
- C6 · Código morto do chat da Etapa 2 (§1.4).
- C2 · Não dá para colar no chat: campo de uma linha, sem print e arquivo,
  corta acima de 1.500 caracteres (§5).
- **(11/11) C22** · Colar um print (de site ou de contrato) para a Cris
  preencher um cadastro, por exemplo de fornecedor. O caso foi dado pelo
  Thiago na reunião. Já é coberto pelo C2 (§5.2: imagem colada vira anexo):
  o formulário de Fornecedores já declara os campos para a Cris
  (`fornecedor-form.tsx` usa `useCrisFormulario`) e o anexo pelo 📎 já aceita
  imagem e PDF até 4 MB. O que falta é colar e o teste de ponta a ponta.
  Acrescenta o teste **AQ-T10** e a **bateria de anexos** (Anexo B, §6).
- **(11/11) C21** · Comando de voz "às vezes dá erro" (relato do Thiago).
  Prompt AV (Anexo F). Pode correr junto da Etapa 3, porque mexe no mesmo
  campo de mensagem do §5.

### Etapa 4 · Prompt AR, Fase 1 — só medição (Anexo C)

- Mede na produção o impacto de C7 a C11 e da possível permuta em dobro.

### Pausa · decisões do dono (Parte 5)

### Etapa 5 · Prompt AR, Fase 2 (Anexo C)

- C7 · Três leituras do plano de pagamento dão três números (R$ 555 mil /
  530 mil / 465 mil na unidade de teste) → leitura única `lerPlano`.
- C8 · Receita da DRE pelo vencimento, não pelo rateio do Prompt I, §57.
- C9 · Liberações de obra somam na receita da DRE.
- C10 · Financiamento e permuta do plano entram como receita; permuta pode
  estar em dobro.
- C11 · `getMonthlyRevenue` serve DRE e Fluxo ao mesmo tempo.

### Etapa 6 · Prompt AT, seções 3, 1-B, 4 a 8 (Anexo A), nesta ordem

- §3 · O movimento do extrato passa a pertencer à conta, não à obra.
- §1-B · Caminho pronto para o cliente conectar o Open Finance pela tela.
- §4 · C18 · Saem os seletores de obra e de versão e o modo comparação; os
  cartões entram no bloco de saldos; cada conta vira filtro. **O layout fica.**
- §5 · C15 · Parcela do comprador conciliável; recebimento e inadimplência;
  trava contra receita dobrada.
- §6 · Cartões conciliados linha a linha.
- §7 e §8 · A tela deixa claro que é ali que se concilia, pelos três caminhos
  (tela, Cris, Open Finance), com a Cris ajudando em cada conciliação.

### Etapa 7 · Ampliação da Cris (Parte 6)

- C1 · A Cris passa a ler os dados do sistema por um catálogo de ferramentas
  de leitura.
- **(11/11) C20** · Caso concreto da reunião, que vira teste de aceite (Parte
  6, AC-T1): no Dashboard, "quero uma análise com todos os projetos que
  possuem custos variáveis e, do total de custos variáveis, qual é o
  percentual de cada projeto". Hoje a Cris não consegue, porque só lê o que
  está na tela. Na avaliação do Thiago, a Cris está **mais avançada no
  preenchimento**; o que falta é a **análise de dados**.

### (11/11) Etapa 8 · Planos de IA por empresa (Prompt AU, Anexo E)

- C23 · Hoje o único limite de uso da IA é por quantidade de perguntas
  (30 por pessoa e 300 por empresa por hora, `src/lib/ia-uso-regras.ts:11`).
  Não há cota em dinheiro nem nível de plano por empresa. A reunião
  discutiu uma Cris sem custo adicional e um pacote ampliado pago. A **Fase
  1 (medição do custo real, só leitura)** pode correr a qualquer momento. A
  **Fase 2 depende das decisões BIA** e precisa vir **antes ou junto da Etapa
  7**, porque decide se o catálogo de ferramentas de leitura é da Cris básica
  ou só do pacote ampliado.

---

## PARTE 4 · DECISÕES JÁ TOMADAS PELO DONO

Estas decisões valem como requisito. Não reabrir.

**Caixa (08 e 09/11/2026)**

- O Caixa é uma tela de **conciliação de caixa**. Só tem efeito na versão
  **Atual**. **Sem seletor de projeto e sem seletor de versão.**
- A conciliação é feita **por conta: contas correntes e cartões de crédito**.
- Subir o extrato e conciliar conta a conta, com ajuda da IA, é o ponto
  central.
- **Sem mudanças drásticas: manter o layout atual**, só com esses ajustes.
- A tela deve deixar evidente que ali se concilia, por três caminhos: subir o
  extrato pela tela; subir pela Cris, que faz perguntas, concilia e ajuda nos
  lançamentos; ou Open Finance. Em todos, a Cris ajuda em cada conciliação.
- O Open Finance não está ligado hoje; o caminho deve ficar pronto para o
  cliente conectar sozinho.

**Regras que continuam valendo (rodadas anteriores)**

- Permuta é ativo, não receita.
- Liberação de obra é caixa, não receita.
- Receita da venda reconhecida pelo rateio da duração da obra (Prompt I, §57).
- A Cris não grava: propõe, e quem salva é o botão da tela.
- Toda mudança que altera número exibido passa por chave de empresa
  (`tenant_flag`), nascendo desligada.

---

## PARTE 5 · BLOQUEIOS QUE AGUARDAM O DONO

| Código | Prompt | Pergunta | Proposta do revisor |
| --- | --- | --- | --- |
| BAQ-1 | AQ | `perguntarAoAssistente` e `interpretarPergunta` são chamados por alguma rota do agente? | Resposta do código; não apagar se forem |
| BAQ-2 | AQ | A tela de Clientes aceita anexo para a Cris? | Resposta do código |
| BAR-1 | AR | Seção do plano preenchida e com a chave `usar*` desligada conta? | — |
| BAR-2 | AR | Subsídio pendente entra na projeção? | — |
| BAR-3 | AR | Financiamento entra em todas as leituras? | — |
| BAR-4 | AR | `Permuta.val` sai de toda leitura de receita? | Sim (decisão: permuta é ativo) |
| BAR-5 | AR | INCC só na Projeção ou também nos recebíveis? | — |
| BAR-6 | AR | Separar `getMonthlyRevenue` em recebimentos (Fluxo) e receita (DRE)? | Sim |
| BAR-7 | AR | O mesmo bem de permuta entra duas vezes (recebimento e revenda)? | Medir na Fase 1 |
| BAT-0 | AT | Open Finance ligado em produção? | **Respondido: não** |
| BAT-1 | AT | O que fazer com duplicados do Open Finance? | Sem objeto (não está ligado) |
| BAT-2 | AT | Movimento sem vínculo não tem obra: aparece como "não atribuído" no realizado da empresa? | Sim |
| BAT-3 | AT | Ajuste de caixa: obra opcional ou sempre da empresa? | — |
| BAT-4 | AT | Contas a receber criadas do extrato que dobraram a receita: um a um ou por regra? | Depois da medição |
| BAT-5 | AT | Plano editado depois de recebimento: recebimento vira "sem parcela" para revisão? | Sim |
| BAT-6 | AT | Parcela recebida sai do previsto e entra no realizado do Fluxo? | Depende de BAR-6 |
| BAT-7 | AT | Formulário de despesa no Caixa: painel lateral ou ir para Despesas? | Painel lateral |
| BAT-8 | AT | Limite do lote de conciliações? | 20 |
| BAT-9 | AT | Titular do contrato Pluggy e custo por conexão | — |
| BAT-10 | AT | Dias de histórico na primeira conexão | Desde o último dia fechado, até 90 dias |
| **(11/11)** BAC-1 | Etapa 7 | Começar pelas despesas ou por todos os módulos? | Despesas primeiro, agrupando por obra e por categoria da DRE: é o que o caso da reunião (C20) pede |
| **(11/11)** BVZ-1 | AV | Qual erro o ditado mostrou, em qual navegador e computador, e com qual frase? | Pedir ao Thiago um print ou a descrição; o prompt começa pela reprodução |
| **(11/11)** BIA-1 | AU | Quantos níveis de Cris: dois (sem custo e ampliada) ou três (básica, intermediária e premium)? | Na reunião, o fechamento foi dois níveis, "pra simplificar" |
| **(11/11)** BIA-2 | AU | O que a Cris sem custo faz e o que só o pacote ampliado faz? | Sem custo: tela, as quatro métricas, preenchimento e anexo. Ampliada: catálogo de leitura da Etapa 7 e análises livres. Depende da medição da Fase 1 |
| **(11/11)** BIA-3 | AU | Unidade da cota mensal: reais de consumo, tokens ou número de perguntas? E o valor do pacote? | Reais de consumo (a pessoa entende), com o valor definido depois da Fase 1 |
| **(11/11)** BIA-4 | AU | Ao esgotar a cota: bloqueia, volta para a Cris sem custo, ou oferece pacote de expansão comprado na hora? | Volta para a Cris sem custo e oferece o pacote. A compra na hora depende de meio de pagamento, que o sistema não tem |
| **(11/11)** BIA-5 | AU | Chave de IA própria do cliente (BYOK: GPT, Claude ou outra)? | Não nesta rodada. Na reunião, ficou para clientes de customização |
| **(11/11)** BIA-6 | AU | Empresa de demonstração com a Cris no nível máximo, para reuniões comerciais: onde e com que dados? | Empresa própria de demonstração em produção, só com dados fictícios, com cota fixa |

---

## PARTE 6 · ETAPA 7 — AMPLIAÇÃO DA CRIS (ESCOPO; PROMPT A ESCREVER)

**Não executar antes das Etapas 3 e 5.** Sem a Etapa 3, a Cris descreveria
errado o que vai ao modelo; sem a Etapa 5, repetiria com confiança os números
de receita que hoje estão errados.

**Pedido:** a Cris deve conseguir ler os dados do sistema e fazer resumos,
relatórios e análises sobre qualquer dado inserido.

**Desenho aprovado em princípio:**

- **Catálogo de ferramentas de leitura por assunto**, cada uma calculada no
  servidor, com filtros e agrupamento, e com o acesso da pessoa:
  despesas; recebíveis e inadimplência por unidade; caixa e conciliação;
  orçado × realizado por grupo; unidades e vendas; medição, estoque e equipes.
- O modelo escolhe a ferramenta e os filtros; **o servidor agrega**; o modelo
  escreve o resumo sobre o resultado. Nunca linhas cruas em massa.
- **Não usar SQL gerado pelo modelo** nem enviar o banco ao modelo.
- **Dado pessoal fora** de todas as ferramentas: CPF, CNPJ de pessoa física,
  renda, salário, dados bancários, saúde. Nome de cliente só onde a tela já
  mostra, declarado na base de conhecimento.
- Relatório exportável: a Cris monta a definição, e Relatórios Customizados
  gera CSV/PDF.
- **Reaproveitar o que existe:** as leituras da API de agente
  (`src/app/api/agent/*`: contas a pagar, contas a receber, projetos,
  unidades), que já aplicam o controle de acesso por pessoa, e o motor de
  Relatórios Customizados.

**BLOQUEIO BAC-1:** começar pelas despesas (maior volume de perguntas) ou por
todos os módulos de uma vez?

**(11/11) O que a reunião acrescenta a esta etapa:**

- **Teste de aceite AC-T1 (C20):** a pergunta do Thiago, feita no Dashboard,
  é respondida corretamente: "Quero uma análise com todos os projetos que
  possuem custos variáveis e, do total de custos variáveis, qual é o
  percentual de cada projeto." O resultado esperado: só as obras com custo
  variável no período, o valor de cada uma, o percentual sobre o total, e a
  soma dos percentuais igual a 100%. Os números batem com a DRE de cada obra
  na versão Atual. A ferramenta usada é a de despesas, agrupada por obra e
  categoria da DRE; o servidor agrega e o modelo só escreve o texto.
- **AC-T2:** a mesma pergunta feita em qualquer outra tela dá a mesma
  resposta. A análise não depende da tela aberta.
- **Relatórios:** o dono disse que vai acrescentar, em Relatórios
  Customizados, um item em que a pessoa usa a IA "de outra maneira, para
  ver os resultados que pretende ver". Isso conversa com o "relatório
  exportável" acima: a Cris monta a definição e Relatórios gera o arquivo. O
  prompt da Etapa 7 deve tratar os dois como uma coisa só.
- **Depende da Etapa 8 (BIA-2):** antes de escrever o prompt, saber se o
  catálogo de leitura vale para todas as empresas ou só para o pacote
  ampliado. Se for só do pacote, as ferramentas conferem o nível da empresa
  no servidor, não só na tela.
- **Proposta para BAC-1:** começar pelas despesas, com agrupamento por obra e
  por categoria da DRE. Isso já cobre o AC-T1.

---

## (11/11) PARTE 7 · REUNIÃO DE REVISÃO COM O THIAGO (11/11/2026)

Resumo do que foi tratado, com o destino de cada ponto nesta spec. O que foi
dito como ideia, sem decisão, está marcado assim e virou BLOQUEIO.

### 7.1 · Cris: o que o Thiago testou

| O que ele relatou | Destino |
| --- | --- |
| Ela "só lê o que está na tela". Pediu no Dashboard a análise dos projetos com custo variável e o percentual de cada um, e ela não conseguiu | C20 → Etapa 7, teste AC-T1 |
| Ela está mais avançada no preenchimento; o que falta é a análise de dados | Prioridade da Etapa 7 |
| O comando de voz às vezes dá erro | C21 → Prompt AV (Anexo F) |
| Consegue subir arquivo pelo botão, mas não consegue colar um print no chat | C2 (já no Prompt AQ, §5) |
| Caso de uso: print do site ou do contrato para a Cris ler e ajudar no cadastro de fornecedor | C22 → AQ-T10 e bateria de anexos (Anexo B, §6) |
| Ele **ainda não testou anexando**; vai fazer uma bateria de testes | Bateria de anexos (Anexo B, §6): roteiro único para ele e para o relatório |
| Mandar o extrato pela Cris, na tela de extrato, para ela ajudar na conciliação | Já é o Caminho 2 do Prompt AT (§8.3) |

### 7.2 · Custo de IA e níveis de plano (sem decisão)

O que se discutiu, para a decisão do dono (BIA-1 a BIA-6):

- **Risco:** deixar a IA aberta "para o pessoal fazer o que quiser" pode
  consumir muito.
- **Dois cenários a avaliar:** até onde a Cris vai **sem custo adicional**
  ("chegar no limite da bichinha"), e como seria um **pacote ampliado**. Em
  algum momento falou-se em três níveis (genérica, intermediária e premium);
  o fechamento foi **dois níveis, para simplificar**.
- **Preço:** a licença do Growth Construction foi citada em cerca de R$ 350
  por mês. O receio é a IA completa levar o total para perto de R$ 1.000. Um
  pacote ampliado de cerca de R$ 500 foi citado como referência, sem decisão.
  O pacote é repassado ao cliente com margem.
- **Travas:** teto de gasto por empresa (foram citados US$ 30 e US$ 100 por
  mês como exemplo). Quando a cota do mês acabar, oferecer na hora um pacote
  de expansão ("sua cota acabou, quer comprar mais um pack?").
- **Chave própria do cliente (BYOK):** o dono mostrou a solução que fez para
  outra empresa, em que a IA interna usa a chave da própria empresa e
  escolhe entre vários modelos. Conclusão: serve para cliente de
  customização, não para o público geral. Fica para depois.
- **Demonstração:** deixar uma versão "top" construída para mostrar a
  cliente na hora da contratação. Um cliente citado ("o pessoal da
  ciência") tende a querer o pacote avançado.
- **Consumo de hoje:** no mês anterior, o gasto de API foi de cerca de
  US$ 6 a 7, número mostrado na tela durante a reunião.
- **Dono (11/11):** "Vou estudar melhor essa arquitetura, não vou bater
  martelo aqui agora. Como eu limito isso por tenant." → Etapa 8, Fase 1, só
  medição, para essa decisão ter números.

### 7.3 · Fora deste repositório (registro)

- **Landing page do Growth Construction:** o Thiago vai mandar o zip com os
  últimos ajustes. A página `/` deste app é só uma capa ("Growth Tools") e
  não é essa landing.
- **Gerador de landing page por segmento** (ideia do dono): a pessoa pede "a
  landing do Growth Construction para feirantes" e a ferramenta gera. O
  Thiago prefere ter antes algumas páginas de segmento feitas com cuidado
  (consultoria ambiental; veterinários, com revisão do Dr. Kleber), "para
  falar a língua de cada um". O gerador fica para os consultores
  credenciados que queiram uma página própria.
- **Acesso do Thiago à plataforma:** mandar o e-mail de validação. É
  operacional.

---

## ANEXOS · PROMPTS COMPLETOS

- Anexo A · Prompt AT — Caixa e conciliação
- Anexo B · Prompt AQ — Cris
- Anexo C · Prompt AR — Leitura única do plano
- Anexo D · Prompt AS — Higiene (concluído; mantido como registro)
- **(11/11)** Anexo E · Prompt AU — Planos de IA por empresa
- **(11/11)** Anexo F · Prompt AV — Ditado por voz na Cris



---

# ANEXO A

## PROMPT AT — CAIXA VIRA A TELA DE CONCILIAÇÃO DA EMPRESA, CONTA A CONTA

**Prioridade: urgente.** As seções 1 e 2 podem começar já. As demais dependem
dos BLOQUEIOS marcados. **Ordem interna:** 1 → 2 → 3 → 1-B → 4 → 5 → 6 → 7 → 8.
A 1-B depende da 3, porque o movimento que vem do banco não tem obra.

**Regra global:** nenhum movimento de extrato existente é apagado, mesclado ou
reatribuído sem uma decisão registrada. Migrações só aditivas (coluna nova,
coluna que passa a aceitar nulo, tabela nova). Nada é retroativo: o que já foi
conciliado continua conciliado como está.

---

### DECISÃO DO DONO (08/11/2026)

> O Caixa é uma tela de **conciliação de caixa**. Só tem efeito na versão
> **Atual**. **Não tem seletor de projeto nem seletor de versão.** A conciliação
> é feita **por conta**: contas correntes **e** cartões de crédito. Subir o
> extrato e conciliar conta a conta, com ajuda da IA, é o ponto central da tela.

> **O layout da tela fica como está.** As mudanças são as pedidas acima; nada
> de redesenho (seção 4).

Por baixo, isso muda uma regra de dados: hoje cada movimento do extrato pertence
a uma obra (`cash_entry.version_id NOT NULL`) e a tela só mostra a conciliação
da obra escolhida. Sem seletor de obra, o movimento passa a pertencer à conta
(seção 3). Essa mudança não aparece na tela, mas é a que mais exige cuidado.

---

### 1 · OPEN FINANCE DUPLICA MOVIMENTOS — CORRIGIR PRIMEIRO

`src/workers/sync-openfinance.ts:43–80` busca **todas** as versões Atual da
empresa e insere **cada transação em cada uma delas**. Com 5 obras, cada PIX
entra 5 vezes. Como a faixa de saldo do Caixa é da empresa (soma os movimentos
de todas as obras), o saldo conciliado e as entradas e saídas do dia ficam
multiplicados.

E a deduplicação é por `descricao + data`, **sem valor**: dois "PIX RECEBIDO" no
mesmo dia, de valores diferentes, viram um só e o segundo some.

#### O que fazer

**1.1** Coluna nova `cash_entry.external_id` (id da transação no Pluggy), com
índice único `(bank_account_id, external_id)` onde não nulo. A deduplicação
passa a ser por ela.

**1.2** O worker insere **uma vez por conta**, nunca por versão. Até a seção 3
estar pronta, grava na versão Atual que a seção 3 definir como destino
provisório (ver BAT-1).

**1.3** Fase de medição, **somente leitura**: `docs/AT-MEDICAO-OPENFINANCE.md`
com, por empresa e conta, quantos movimentos vindos do Open Finance existem em
mais de uma versão (mesma conta, data, valor e descrição), e quantos desses
estão conciliados.

#### BLOQUEIOS

- **BAT-0 · respondido (09/11):** o Open Finance **não está ligado** em
  nenhuma empresa. Não há duplicados em produção; a 1.3 vira só uma
  confirmação de que `cash_entry` não tem movimentos com `cat = 'openfinance'`.
  A correção desta seção é pré-requisito da seção 1-B.
- **BAT-1.** Os duplicados medidos na 1.3: decido depois de ver o relatório.
  Nada é apagado antes.

#### Testes

- **AT-T1.** Empresa com 3 obras, 1 conta, 10 transações → 10 movimentos.
- **AT-T2.** Dois "PIX RECEBIDO" no mesmo dia com valores diferentes → 2
  movimentos. A mesma transação sincronizada duas vezes → 1.

---

### 1-B · DEIXAR PRONTO O CAMINHO PARA O CLIENTE CONECTAR O OPEN FINANCE

**Pedido do dono:** hoje ninguém usa o Open Finance, mas o caminho tem de estar
pronto para o cliente conectar a conta dele sozinho, pela tela.

**Como está hoje:**

- "Conectar" é **digitar um ID** no cadastro da conta (`conta-form.tsx:83`,
  campo `openFinanceId`). Não há widget, nem connect token, nem escolha de
  banco. Nenhum cliente consegue fazer isso.
- O worker `sync-openfinance.ts` **não é agendado em lugar nenhum** do
  projeto (nenhum cron, script ou referência).
- Só transações são lidas; o **saldo** da conta não é sincronizado.
- Não há webhook, não há tratamento de erro de conexão, consentimento vencido
  ou pedido de ação do usuário (MFA, autorizar no app do banco).
- Cartões de crédito não são cobertos.
- O selo "Open Finance ativo" aparece quando as variáveis `PLUGGY_*` existem,
  mesmo sem nenhuma conta conectada. Configurado não é conectado.

#### O que fazer

Confira cada endpoint e evento na documentação oficial da Pluggy antes de
implementar; os nomes abaixo são os da documentação pública atual.

**1-B.1 · Conectar pela tela.** Botão **"Conectar banco"** em Contas
Correntes, em Cartões de Crédito e no botão Open Finance do Caixa (8.1).
Exige Contas/editar. O servidor cria um **connect token** (`POST
/connect_token`) com `options.clientUserId` = empresa e usuário, e com a URL do
webhook. A tela abre o **widget Pluggy Connect**; o cliente escolhe o banco e
autoriza no próprio banco. As credenciais do banco nunca passam pelo app.

**1-B.2 · Antes do widget**, um texto curto de consentimento: o que será lido
(contas, saldos, transações, faturas de cartão), para quê (conciliação), por
quanto tempo e como desconectar.

**1-B.3 · Guardar a conexão.** Tabela nova `openfinance_item`: empresa,
`item_id`, banco, situação, última atualização, último erro, quem conectou,
quando. Situações: conectado, atualizando, precisa de ação, erro,
desconectado.

**1-B.4 · Associar as contas.** Depois da conexão, o servidor lista as contas
do item (contas correntes e cartões). A tela mostra cada uma e a pessoa escolhe:
associar a uma conta ou cartão já cadastrado, criar um novo, ou ignorar. O id
da conta Pluggy fica em `bank_account.open_finance_id` (já existe) e em uma
coluna nova `cartao_credito.open_finance_id`.

**1-B.5 · Receber os dados por webhook.** Rota nova
`/api/openfinance/webhook`, protegida por um cabeçalho secreto configurado no
webhook. Responde rápido e processa em seguida. Idempotente pelo `eventId`.
Trata: `item/created`, `item/updated`, `item/error`,
`item/waiting_user_input`, `item/waiting_user_action`, `item/deleted`,
`transactions/created`, `transactions/updated`, `transactions/deleted`.

**1-B.6 · Regras de gravação:**

- conta corrente → `cash_entry`, com `external_id` (seção 1.1);
- cartão → `extrato_cartao`, com `external_id` (coluna nova, mesmo índice
  único por cartão);
- saldo da conta → `bank_account.saldo`, `saldo_source = 'auto'`, `last_sync`;
- transação **alterada** pelo banco: se o movimento não está conciliado,
  atualiza; se está, **não muda nada** e marca para revisão;
- transação **removida** pelo banco: nunca apaga; marca "removida pelo banco"
  para revisão;
- **primeira sincronização** de uma conta que já recebeu extrato importado:
  movimento do banco com mesma conta, data e valor de um já importado **não é
  inserido**; vai para uma lista "possível duplicado" para a pessoa decidir.

**1-B.7 · Rede de segurança.** Sincronização agendada uma vez por dia
(cron no Coolify) para os itens conectados, caso algum webhook se perca. O
mesmo código do webhook, as mesmas regras.

**1-B.8 · Situação visível.** Em Contas Correntes, Cartões e na linha da conta
no Caixa: conectada (com a hora da última atualização), atualizando, **precisa
de ação** (botão que reabre o widget para aquele item), erro (com o motivo em
linguagem de quem opera) ou desconectada. Botão **Desconectar**: remove o item
na Pluggy e mantém tudo o que já foi trazido.

**1-B.9 · O selo diz a verdade:** "Open Finance disponível" quando configurado
e sem conexão; "N contas conectadas" quando houver; nada quando não estiver
configurado.

**1-B.10 · Ambiente de teste.** Variável `PLUGGY_ENV` (sandbox ou produção).
Os testes usam o banco de testes da Pluggy e payloads de webhook gravados como
fixtures; nenhum teste chama a Pluggy de verdade.

#### BLOQUEIOS

- **BAT-9 · Contrato da Pluggy.** Quem é o titular (a Growth Tools, com um
  único contrato para todos os clientes, ou cada cliente com o seu)? Há custo
  por conexão: entra no preço do plano ou é repassado?
- **BAT-10 · Histórico na primeira conexão.** Quantos dias para trás buscar?
  Proposta: desde o dia seguinte ao último dia fechado da empresa, limitado a
  90 dias.

#### Testes

- **AT-T20.** Webhook com cabeçalho secreto errado → 401, nada gravado.
- **AT-T21.** O mesmo `transactions/created` recebido duas vezes → os
  movimentos entram uma vez.
- **AT-T22.** `transactions/updated` num movimento conciliado → o movimento não
  muda e aparece na lista de revisão.
- **AT-T23.** Primeira sincronização com um movimento igual a um importado →
  não entra; aparece como possível duplicado.
- **AT-T24.** Transação de conta de cartão → `extrato_cartao` do cartão
  associado, nunca `cash_entry`.
- **AT-T25.** `item/waiting_user_action` → a conta mostra "precisa de ação" e
  o botão de reconectar.

---

### 2 · QUATRO CORREÇÕES QUE NÃO DEPENDEM DO RESTO

**2.1 · A projeção de 7 dias conta permuta como dinheiro.** O previsto da faixa
usa `getReceivables` → `expandUnitReceivables`, que inclui `Permuta.val` como
recebível na data prevista. Permuta não entra no caixa: retirar da projeção já.
O financiamento (`Banco.valFinanc`) fica como está até a decisão BAR-3 do
Prompt AR.

**2.2 · Conciliar sem vínculo.** O seletor da tabela (`ConciliarToggle`, via
`toggleConciliado` sem contraparte) ainda marca um movimento como conciliado sem
registrar com o que casou, e isso sustenta saldo conciliado sem lastro. A partir
de agora, **marcar exige vínculo** (despesa, conta a receber, parcela de venda,
pagamento de fatura) **ou** um ajuste com motivo. O seletor só serve para
desfazer. Os movimentos "sem vínculo" que já existem **não mudam**: ganham uma
lista de revisão.

**2.3 · Modo comparação.** Sai da tela (seção 4.1).

**2.4 · Aging de Ressarcimentos sem teste.** A varredura do Prompt AS mostrou
que o cálculo de aging em `src/lib/actions/restituicoes.ts` depende de "hoje"
(`hojeISO()` sem argumento) e **nenhum teste o exercita**: os 5 arquivos que
importam o módulo não chamam a função. Escrever o teste com relógio fixo
(`vi.useFakeTimers({ toFake: ["Date"] })`, como no Prompt AS), cobrindo a
vencer, vencido há 1–30, 31–60 e mais de 60 dias. Só teste; nenhuma mudança na
função, a não ser que o teste revele um erro (nesse caso, pare e relate).

#### Testes

- **AT-T3.** Unidade com permuta prevista para amanhã: o saldo projetado de
  amanhã não muda por causa dela.
- **AT-T4.** `toggleConciliado(id, true)` sem contraparte é recusado. Desfazer
  continua funcionando, com motivo.
- **AT-T4b.** Aging de Ressarcimentos (2.4) nas quatro faixas, com relógio
  fixo.

---

### 3 · O MOVIMENTO PERTENCE À CONTA, NÃO À OBRA

**3.1** `cash_entry.version_id` passa a aceitar nulo. Movimento novo de extrato
nasce **só com a conta e a empresa**. A obra de um movimento passa a ser a do
item a que ele foi vinculado. Um movimento dividido entre despesas de obras
diferentes tem várias obras, pela regra do rateio que o Acerto já usa.

**3.2** Os movimentos que já existem mantêm o `version_id` que têm.

**3.3** Todo lugar que lê `cash_entry` por versão passa a ler o **realizado por
obra pelo vínculo**: Fluxo de Caixa (realizado), Dashboard (realizado),
`cadeiaDaEmpresa`, fechamento do dia, Relatórios Customizados, métrica "saldo"
da Cris. Gerar a lista completa com arquivo e linha **antes** de mexer.

#### BLOQUEIOS

- **BAT-2.** Movimento sem vínculo (ajuste, tarifa ainda não lançada, entrada
  não identificada) não tem obra. Proposta: aparece no realizado da **empresa**
  como "não atribuído a obra" e não entra no realizado de nenhuma obra.
  Confirmar.
- **BAT-3.** Ajuste de caixa: continua com obra opcional, ou passa a ser sempre
  da empresa?

#### Testes

- **AT-T5.** Movimento de R$ 1.000 conciliado com duas despesas (600 da obra A,
  400 da obra B) → realizado de A = 600, de B = 400, da empresa = 1.000.
- **AT-T6.** Os totais de realizado de todas as obras de uma empresa em
  produção (snapshot) são iguais antes e depois da 3.3, para os movimentos
  antigos.

---

### 4 · A TELA: MANTER O LAYOUT, SÓ OS AJUSTES PEDIDOS

**O layout atual fica.** A ordem dos blocos não muda: filtro de período →
resumo do dia → saldos por conta → faixa de dias → dias fechados → abas
Conciliação e Ajustes → painel do Assistente à direita. Nada de tela nova,
aba nova ou espaço de trabalho separado. As mudanças são só estas:

**4.1 · Sai do cabeçalho e dos filtros:** o seletor de projeto
(`ProjectPicker`) e o seletor de versão (`VersionMultiSelect`). Sai também o
modo comparação de versões. A tela lê sempre e só a versão **Atual** de todas
as obras da empresa. O filtro de período fica.

**4.2 · O bloco de saldos (`SaldosCaixa`) ganha os cartões.** Os cartões de
crédito aparecem no mesmo bloco das contas correntes, depois delas, no mesmo
formato de linha: fatura aberta, conciliado, pendentes e data do último
extrato. Contas Terceiros continuam fora do total.

**4.3 · Cada conta ou cartão do bloco de saldos é clicável e vira o filtro da
tela.** Clicar numa conta filtra a aba Conciliação, a tabela "Todos os
lançamentos" e a aba Ajustes por aquela conta (`?conta=`, que a aba Ajustes já
usa). Uma opção "Todas as contas" volta ao consolidado. A conta escolhida fica
destacada no bloco.

**4.4 · Importar extrato:** o botão continua no mesmo lugar. Com uma conta
escolhida, ela já vem preenchida no diálogo. O campo de obra sai do diálogo
(seção 3).

**4.5 · Cartão escolhido:** a aba Conciliação mostra, na mesma estrutura
(pendentes com sugestões, conciliados), as linhas do extrato da fatura e as
despesas lançadas no cartão (seção 6). A tabela "Todos os lançamentos" mostra
as linhas do extrato do cartão.

**4.6 · O que não muda:** resumo do dia, faixa de dias, fechamento e reabertura,
dias fechados, aba Ajustes, painel do Assistente, a Cris da tela. A faixa de
dias segue a conta escolhida quando houver uma, e o consolidado quando não.

**4.7** Links de outras telas para `/caixa?proj=...` ou `&vs=...` continuam
abrindo a tela, ignorando esses parâmetros. Nenhum link quebrado.

#### Testes

- **AT-T12.** A página não renderiza `ProjectPicker` nem `VersionMultiSelect`,
  e `?proj=` ou `?vs=` na URL não mudam o que é mostrado.
- **AT-T13.** Com `?conta=X`, pendentes, conciliados, tabela e ajustes mostram
  só movimentos da conta X; sem `?conta`, mostram todas.
- **AT-T14.** Teste visual (print) antes × depois da página inteira, para
  confirmar que a ordem dos blocos não mudou.

---

### 5 · ENTRADAS: CONCILIAR COM A PARCELA DO COMPRADOR

Hoje uma entrada só casa com **conta a receber lançada**. A parcela do plano de
venda não tem onde ser marcada como recebida. O dinheiro do comprador fica
pendente para sempre, ou alguém usa "criar conta a partir do extrato", e aí a
receita soma **duas vezes** na DRE, no Fluxo e no Dashboard (`getMonthlyRevenue`
soma a parcela do plano **e** a conta nova). Pelo mesmo motivo, parcela vencida
de comprador não aparece em atraso em lugar nenhum.

#### O que fazer

**5.1** Tabela nova `recebimento_parcela`: `unit_id`, **chave estável da
parcela** (origem + número, ex.: `Mensais#12`, `S1#2`, `FGTS#1`), valor, data,
`cash_entry_id`, quem, quando. Nunca o índice da lista de
`expandUnitReceivables`, que muda quando o plano é editado.

**5.2** As sugestões de entrada passam a incluir as parcelas de venda em aberto,
pela mesma regra de grau (valor exato ou aproximado, data, nome do comprador na
descrição). Conciliar grava o recebimento; parcial é permitido.

**5.3** Contas a Receber, aba de recebíveis das vendas: cada parcela passa a ter
situação (a vencer, recebida, parcial, vencida). A faixa do Caixa conta parcelas
vencidas e não recebidas nos atrasados.

**5.4** "Criar conta a receber a partir do extrato" numa entrada: se houver
parcela de venda compatível, a tela mostra a parcela primeiro e pede
confirmação explícita de que **não** é ela.

**5.5** Medição, **somente leitura**: listar as contas a receber criadas a
partir do extrato cujo valor e data batem com uma parcela de venda da mesma
obra. São os prováveis casos de receita dobrada.

#### BLOQUEIOS

- **BAT-4.** Os casos da 5.5: decido um a um ou por regra, depois do relatório.
- **BAT-5.** Plano editado depois de um recebimento: o recebimento fica preso à
  chave antiga e aparece como "recebimento sem parcela" para revisão. Confirmar.
- **BAT-6.** A parcela recebida sai da receita prevista e entra como realizada
  no Fluxo? A resposta depende do Prompt AR (BAR-6).

#### Testes

- **AT-T7.** Entrada de R$ 2.345,67 com parcela `Mensais#12` de mesmo valor e
  nome do comprador na descrição → sugestão de grau alto. Conciliar → parcela
  recebida.
- **AT-T8.** Conciliar uma parcela não muda a receita da DRE (a parcela já
  estava lá). Criar conta a partir do mesmo extrato, depois de recusar a
  sugestão, exige a confirmação da 5.4.
- **AT-T9.** Editar o plano depois do recebimento não apaga o recebimento.

---

### 6 · CARTÕES DE CRÉDITO NA CONCILIAÇÃO

Hoje o extrato do cartão é só registrado (`extrato_cartao`, Prompt U): nenhuma
linha é casada com as compras lançadas. As despesas pagas no cartão já guardam
`despesa.cartao_id`.

**6.1** Com um cartão escolhido no bloco de saldos (4.5), cada linha do extrato da fatura é
conciliada com uma despesa lançada naquele cartão e ciclo, com sugestões por
valor, data e descrição ↔ fornecedor.

**6.2** Linha sem despesa: **"lançar despesa a partir desta linha"** abre o
formulário de despesa preenchido (cartão, data, valor, descrição) para a pessoa
completar e salvar. Continua valendo a regra do Prompt U: a importação nunca
cria despesa sozinha.

**6.3** Estorno e crédito do extrato seguem o fluxo de estorno que já existe.

**6.4** O pagamento da fatura (saída na conta corrente) concilia com o
`fatura_pagamento` correspondente, não com as despesas da fatura.

**6.5** A fatura mostra: total do extrato, total conciliado, diferença.

#### Testes

- **AT-T10.** Fatura com 5 linhas, 4 despesas lançadas → 4 sugestões, 1 linha
  sem par; lançar a despesa a partir dela → 5 conciliadas, diferença zero.
- **AT-T11.** A saída do pagamento da fatura na conta corrente concilia com o
  pagamento da fatura e não gera saída nova.

---

### 7 · A IA NA CONCILIAÇÃO

**7.1** A IA lê o extrato (PDF ou imagem) e devolve as linhas para a pessoa
conferir antes de gravar, como já faz.

**7.2** Para cada pendente sem sugestão de grau alto, a IA propõe o par mais
provável **entre os candidatos que o servidor já calculou**, usando descrição ↔
fornecedor/comprador. Ela não procura candidatos por conta própria, não cria
vínculo e não concilia: propõe, e a pessoa confirma.

**7.3** A conciliação automática continua restrita a **um único candidato de
mesmo valor no mesmo mês**, como hoje. A IA não amplia essa regra.

**7.4** A Cris, nesta tela, passa a receber o resumo **da conta escolhida**
(saldos, pendentes, sugestões) quando houver uma, e o consolidado quando não.

---

### 8 · A TELA DEIXA CLARO QUE É ALI QUE SE CONCILIA — TRÊS CAMINHOS E A CRIS

**Pedido do dono:** ficar evidente na tela que ali se faz a conciliação. Ela
pode começar por três caminhos, e em todos a Cris ajuda em cada conciliação:

1. **subir o extrato pela própria tela;**
2. **subir o extrato pela Cris**, que faz perguntas, concilia e ajuda a lançar
   o que falta;
3. **Open Finance.**

A regra da seção 4 continua: o layout fica. O que muda é ênfase, texto e
botões dentro dos blocos que já existem.

#### 8.1 · O que fica mais evidente (sem mudar o layout)

- **Título:** "Conciliação de Caixa" (o item do menu continua "Caixa").
  Subtítulo: "Suba o extrato, conecte pelo Open Finance ou concilie com a Cris.
  Nada é gravado sem a sua confirmação."
- **Faixa de ação no topo do bloco de saldos**, com três botões do mesmo peso:
  **Subir extrato** · **Conciliar com a Cris** · **Open Finance**. O botão do
  Open Finance mostra o estado: conectado (com a data da última sincronização),
  conectar (para quem pode editar Contas) ou indisponível (Pluggy não
  configurado, com o motivo).
- **Contador de pendências** na mesma faixa: "N movimentos a conciliar em M
  contas · mais antigo há X dias". Clicar leva à aba Conciliação.
- **Cada linha de conta ou cartão** no bloco de saldos mostra as pendências
  daquela conta como selo clicável, que filtra a tela (4.3) e abre a aba
  Conciliação.
- **Cada movimento pendente** na aba Conciliação ganha o botão
  **"Perguntar à Cris"**, que abre o chat já com aquele movimento e seus
  candidatos.
- **Sem extrato no período:** o vazio da aba Conciliação explica os três
  caminhos, com os três botões.

#### 8.2 · Caminho 1: subir pela tela

Continua como hoje (diálogo de importação, prévia, deduplicação, conciliação
automática só com candidato único). Ao terminar, o resumo da importação diz
quantos movimentos ficaram pendentes e oferece **"Conciliar os pendentes com a
Cris"**.

#### 8.3 · Caminho 2: subir pela Cris

O fluxo, sempre com a pessoa confirmando cada gravação:

1. **Ler.** A pessoa anexa o extrato no chat (ou clica "Conciliar com a Cris",
   que abre o chat pedindo o arquivo). A Cris **não transcreve as linhas na
   conversa**: chama uma ferramenta nova, `ler_extrato`, que roda no servidor o
   **mesmo leitor** do diálogo de importação (`extractExtratoPdf` e os leitores
   de XLSX/CSV). Assim o limite de resposta do modelo não corta extrato grande.
2. **Perguntar a conta.** Se o banco, a agência ou a conta no extrato baterem
   com uma conta cadastrada, a Cris propõe aquela conta e pede confirmação. Se
   não, pergunta qual é.
3. **Importar.** A proposta abre o **mesmo diálogo de prévia** do Caminho 1, já
   preenchido. Quem importa é o botão do diálogo.
4. **Conciliar, um a um ou em lote.** Para cada pendente, a Cris chama uma
   ferramenta nova, `candidatos_de_conciliacao(movimento)`, que devolve os
   candidatos **calculados pelo servidor** (despesas, parcelas, contas a
   receber, parcelas de venda, pagamentos de fatura) com o grau. Ela:
   - com um candidato de grau alto: propõe o vínculo;
   - com mais de um: faz **uma pergunta** de cada vez, em linguagem de quem
     opera ("Esse PIX de R$ 3.200 para João Silva é a diária da equipe da Obra
     A ou o adiantamento de material?");
   - sem candidato: diz isso e oferece lançar (passo 5).

   Os vínculos de grau alto podem vir num **lote**: a tela mostra a lista e um
   botão "Confirmar N conciliações". Cada uma continua sendo um vínculo próprio,
   com auditoria.
5. **Lançar o que falta.** Para uma saída sem despesa, a Cris pergunta o que
   falta (obra, fornecedor, conta do plano) e abre o **formulário de despesa
   preenchido**, dentro do Caixa, já paga na data do extrato e vinculada ao
   movimento. Para uma entrada sem par, faz o mesmo com conta a receber, depois
   da checagem de parcela de venda (5.4). Quem salva é o botão do formulário.
6. **Fechar a rodada.** No fim, a Cris resume: quantos conciliados, quantos
   lançados, quantos ficaram pendentes e por quê.

#### 8.4 · Caminho 3: Open Finance

Depois da correção da seção 1, os movimentos sincronizados aparecem como
pendentes da conta, com a mesma ajuda dos passos 4 a 6. A Cris explica como
conectar uma conta quando perguntada.

#### 8.5 · Regras que valem para os três caminhos

- **A Cris não grava.** As ferramentas novas (`ler_extrato`,
  `candidatos_de_conciliacao`) só leem. Toda gravação (importar, conciliar,
  lançar) é o botão da tela. O teste AQ-T6 passa a cobrir as ferramentas novas.
- **Só candidatos do servidor.** Uma proposta de vínculo com id que não veio de
  `candidatos_de_conciliacao` para aquele movimento é **recusada no servidor**,
  não só escondida na tela.
- **A conciliação automática não muda:** só com um único candidato de mesmo
  valor no mesmo mês (7.3). A Cris não amplia essa regra; o lote do passo 4 é
  sempre confirmado pela pessoa.
- **Privacidade:** o extrato anexado vai inteiro ao modelo, com nomes de quem
  pagou e recebeu. A tela diz isso ao lado do anexo da Cris, e a base de
  conhecimento também (Prompt AQ, 1.1).
- **Permissões:** importar exige Caixa/criar; conciliar, Caixa/editar; lançar
  despesa, Despesas/criar. Sem a permissão, a Cris explica e não propõe.
- **Volume:** extrato com muitos movimentos é conciliado em rodadas de até 20
  pendentes, do mais antigo para o mais novo.

#### BLOQUEIOS

- **BAT-7.** O formulário de despesa aberto dentro do Caixa (passo 5): é o
  mesmo componente da tela de Despesas em painel lateral, ou leva a pessoa à
  tela de Despesas e volta? Proposta: painel lateral, para não perder o fio da
  conciliação.
- **BAT-8.** Lote de conciliações de grau alto: limite de itens por lote?
  Proposta: até 20, igual à rodada.

#### Testes

- **AT-T15.** `ler_extrato` devolve as mesmas linhas que o diálogo de
  importação para o mesmo arquivo (XLSX, CSV, PDF de texto).
- **AT-T16.** Proposta de vínculo com uma despesa que não está nos candidatos
  do movimento → recusada no servidor.
- **AT-T17.** Lote de 5 conciliações confirmadas → 5 vínculos e 5 registros de
  auditoria; uma falha não grava as outras pela metade (cada vínculo é
  atômico, e o resultado diz qual falhou).
- **AT-T18.** Pessoa sem Caixa/editar: a Cris não recebe as ferramentas de
  conciliação e explica por quê.
- **AT-T19.** Despesa lançada pelo passo 5 nasce paga na data do extrato,
  vinculada ao movimento, **sem criar uma segunda saída**.

---

### RELATÓRIO FINAL (obrigatório)

1. `docs/AT-MEDICAO-OPENFINANCE.md` (confirmação do BAT-0) e a lista da 5.5.
1-B. Vídeo da conexão no sandbox da Pluggy: conectar, associar uma conta e um
   cartão, receber transações, ver a conta em "precisa de ação" e desconectar.
2. Lista de todos os pontos que liam `cash_entry` por versão, e como ficaram.
3. Respostas aos BLOQUEIOS que dependem do código (BAT-0).
4. Prints antes × depois da tela inteira: "Todas as contas", uma conta
   corrente escolhida e um cartão escolhido.
5. Vídeo curto dos três caminhos: subir pela tela, subir pela Cris (com uma
   pergunta dela, um lote e um lançamento pelo passo 5) e um movimento do Open
   Finance conciliado com a ajuda da Cris.
6. Suíte completa **com banco**, com o número de testes pulados.


---

# ANEXO B

## PROMPT AQ — CRIS: O QUE ELA DIZ SOBRE SI MESMA, PERMISSÃO DO ACERTO E FORMATAÇÃO

**Regra global (vale para tudo abaixo):** nenhuma migração, nenhum dado de produção
alterado. Esta tarefa mexe em texto da base de conhecimento, em regra de permissão
e em renderização. Nada é retroativo.

---

### CONTEXTO

A Cris (Prompt E2, decisões de 15/10 e 18/10/2026) é o chat de todas as telas.
Um usuário pediu a ela "ler todos os dados, emitir análises e relatórios e ajudar a
preencher lançamentos". A resposta foi boa no comportamento (recusa útil, indicou
Relatórios Customizados, deixou claro que quem grava é o botão da tela), mas
**afirmou uma coisa falsa sobre privacidade** e expôs mais dois problemas.

---

### 1 · A BASE DE CONHECIMENTO DESCREVE O CHAT ANTIGO — RISCO

**O que a Cris disse ao usuário:** "números, nomes e cadastros não vão para o
modelo de IA; só o texto da sua pergunta".

**De onde veio:** `src/lib/assistente-base/conceitos-despesas-caixa.ts`, seção
"### O assistente", linhas ~56–60. Esse texto descreve o chat da **Etapa 2**
(decisão de 01/10, BE-2), em que o modelo só classificava a pergunta. A BE-2 foi
**reaberta em 15/10**. Hoje, segundo o próprio cabeçalho de `src/lib/cris.ts` e
`src/lib/ai/cris.ts`, vão ao modelo:

- a pergunta e o histórico da aba (até 12 falas);
- o **resumo agregado da tela** (bloco `<tela>`, filtrado por `sanitizarDados`);
- o **resultado de `consultar_numero`** (receita, custo, desvio, saldo — com nome
  da obra e valores);
- o **documento anexado, inteiro** (PDF ou imagem).

A Cris leu a base e repetiu. Ela não mentiu por conta própria: a base está errada.

**O mesmo problema em `receitas-obra-pessoas.ts`:**

- linha ~108 (Contas a Receber) e ~153 (Permuta): "O cliente é escolhido à mão:
  o nome do comprador não vai ao modelo." Verdade para o que a pessoa **digita**.
  Falso quando ela **anexa** um contrato ou laudo com o nome do comprador: o
  documento vai inteiro.
- linha ~272 (Funcionários): mesma estrutura — "dado pessoal do funcionário não
  vai ao modelo". Falso se alguém anexar a CTPS ou o contrato de trabalho.
- linha ~28: "A Cris não lê documento pessoal dele" — conferir se a tela de
  Clientes de fato recusa anexo ou se só não oferece.

#### O que fazer

**1.1** Reescrever a seção "### O assistente" de `conceitos-despesas-caixa.ts`
descrevendo a Cris de hoje. O texto deve conter, nesta ordem e em linguagem de
quem opera:

- o que ela faz (explica o sistema; analisa os números da tela; busca as quatro
  métricas do catálogo em outras telas; propõe preenchimento nas telas de
  lançamento — quem grava é o botão da tela);
- **o que vai ao modelo**, a lista acima, sem atenuar;
- **o que não vai**: o que a tela não mostra, cadastro completo, histórico de
  outras conversas, e os campos que `sanitizarDados` descarta (CPF, CNPJ,
  e-mail, telefone, endereço, renda, salário, dados bancários, saúde etc.);
- **a exceção do anexo**: o documento vai inteiro, com o que estiver escrito
  nele. A Cris não usa nome de cliente ou de funcionário para preencher o
  formulário, mas o modelo lê o documento;
- a conversa não é gravada; o consumo é registrado em `ia_uso` (só números).

**1.2** Corrigir as frases das linhas ~108, ~153 e ~272 de
`receitas-obra-pessoas.ts` para a forma verdadeira: "A Cris não preenche o
cliente; ele é escolhido à mão. Se o documento anexado tiver o nome, o modelo lê
o documento, mas o nome não vai para o formulário."

**1.3** Acrescentar em `regrasDaCris()` (`src/lib/cris.ts`, ~221) uma regra:

> "Se perguntarem o que é enviado ao modelo de IA, responda pela seção 'O
> assistente' da base, completa. Nunca diga que só a pergunta vai ao modelo."

**1.4** Remover o código morto da Etapa 2, que é a origem da descrição antiga e
convive com a Cris dizendo o contrário:

- `src/lib/actions/assistente-chat.ts` → `perguntarAoAssistente`
- `src/lib/ai/chat-intencao.ts` → `interpretarPergunta`

Ambos só se referenciam entre si. **Manter** o que a Cris ainda usa de
`src/lib/assistente-chat.ts` (`CATALOGO`, `normalizarIntencao`,
`interpretarLocalmente`).

#### BLOQUEIOS

- **BAQ-1.** Confirme que `perguntarAoAssistente` e `interpretarPergunta` não são
  chamados por nenhuma rota de `src/app/api/agent/*`, worker ou import dinâmico.
  Se forem, **não apague**: relate onde.
- **BAQ-2.** A tela de Clientes aceita anexo para a Cris? Responda com arquivo e
  linha. A frase da linha ~28 só é corrigida depois da resposta.

---

### 2 · ACERTO CONTÁBIL SEM ID DE TELA — RISCO CONTÁBIL

`screenIdOfPath` (`src/lib/permissions.ts:402–406`) devolve o primeiro segmento
da rota **só se ele estiver em `SCREEN_IDS`**. `/acerto` não está: no menu
(`src/lib/nav-menu.ts:124`) ele usa `perm: "despesas"` com
`exige: [despesas/editar, caixa/ver]`. Resultado em `perguntarACris`
(`src/lib/actions/cris.ts:48–50`):

- `podeLancar = false` → o **formulário do acerto é descartado** antes de ir ao
  modelo. A base (`conceitos-despesas-caixa.ts`, ~186) promete "Com a Cris (aba
  Vincular despesas): ela preenche o cabeçalho e marca as despesas". No servidor,
  ela não consegue.
- `dadosPermitidos = true` **sem conferir permissão nenhuma**, porque o ramo
  `telaId ? can(...) : true` cai no `true`. Hoje só `/acerto` cai nesse ramo, mas
  qualquer rota nova sem id cai também.

Os testes atuais (`cris-formularios-telas.test.ts`) conferem que a tela
**registra** o formulário no cliente; nenhum confere que ele **chega** ao modelo.

#### O que fazer

**2.1** Resolver a permissão da Cris **pelo item do menu**, não pelo primeiro
segmento da rota: a rota aponta para o item de `NAV_MENU`; a permissão de ver é
`perm` (ou `permAlt`) e, se houver `exige`, todas as exigências. Criar uma função
pura `permissaoDaRota(rota, perms)` que devolva `{ ver, lancar }` e usá-la nas
linhas 48–50.

**2.2** Inverter o padrão: rota conhecida sem permissão resolvível →
`dadosPermitidos = false` e `podeLancar = false`. Falha fechada.

**2.3** Para o acerto, `lancar` exige o mesmo que o menu já exige para abrir a
tela (despesas/editar **e** caixa/ver).

#### Testes

- **AQ-T1.** Para **cada** rota de `ROTAS_CONHECIDAS`, `permissaoDaRota` resolve
  sem cair em padrão permissivo. Uma rota nova sem mapeamento faz o teste
  falhar.
- **AQ-T2.** `/acerto` com despesas/editar + caixa/ver → formulário vai ao
  modelo. Sem caixa/ver → não vai, e os números da tela também não.
- **AQ-T3.** Rota com `permAlt` (Medição/`/medicaolanc`) mantém o comportamento
  atual.

---

### 3 · MARKDOWN CRU NA RESPOSTA — CORREÇÃO

`trechosDaCris` (`src/lib/cris.ts:264`) só transforma links. Negrito e listas
chegam como texto literal (`**Análises e números:**`), renderizados em
`chat-assistente.tsx:166` com `whitespace-pre-wrap`.

#### O que fazer

**3.1** Estender `trechosDaCris` (função pura, já testada) para reconhecer
`**negrito**` e linhas que começam com `- ` (item de lista). **Sem**
`dangerouslySetInnerHTML` e sem biblioteca nova: o parser devolve trechos
tipados, como já faz com link.

**3.2** Qualquer outra marcação (títulos `#`, tabelas, código) é exibida como
texto sem os símbolos. A regra de links (só rotas de `ROTAS_CONHECIDAS`) não muda.

#### Testes

- **AQ-T4.** `**X:**` vira trecho negrito; `- item` vira item de lista; link
  dentro de item de lista continua link; rota desconhecida continua texto.
- **AQ-T5.** Texto com `<script>` ou HTML continua texto.

---

### 4 · O QUE NÃO MUDA (TRAVAR EM TESTE)

- A Cris **não grava**. `propor_preenchimento` só devolve a proposta; quem salva
  é o botão da tela. **AQ-T6:** nenhuma action de escrita é importada por
  `src/lib/ai/cris.ts` nem por `src/lib/actions/cris.ts`.
- A recusa continua útil: sem o número, diz onde ele está.

---

### 5 · COLAR NO CHAT NÃO FUNCIONA — CORREÇÃO

**Relato do dono:** "não consigo colar nada no chat da Cris".

**O que o código mostra:** nenhum handler bloqueia colar (não há `onPaste`,
nem listener global de teclado que intercepte Ctrl+V). O problema é o campo:

- é um `<input>` de **uma linha** (`chat-assistente.tsx:246`), não um
  `<textarea>`. Texto com várias linhas (tabela copiada do Excel, trecho de
  e-mail) perde as quebras ou fica só a primeira linha, conforme o navegador;
- **não aceita imagem nem arquivo**: colar um print ou um arquivo copiado não
  faz nada, sem nenhum aviso. O anexo só entra pelo botão 📎;
- `maxLength={MAX_MENSAGEM}` = **1.500 caracteres**: o que passa disso é
  cortado em silêncio. O servidor corta no mesmo limite (`historicoDaCris`);
- a caixa de pergunta dos painéis (`CaixaDeConversa`, `cris-contexto.tsx:154`)
  tem o mesmo `<input>` de uma linha.

#### O que fazer

**5.1** Trocar o `<input>` por `<textarea>` com altura automática (1 a 6
linhas, rolagem a partir daí). **Enter envia; Shift+Enter quebra linha.** As
quebras e as tabulações coladas são preservadas até o modelo.

**5.2** `onPaste` no campo: se a área de transferência tiver **imagem ou
arquivo**, ele vira o anexo da mensagem, com as mesmas validações do botão 📎
(tipo aceito, até 4 MB) e a mesma mensagem de erro. Se já houver anexo,
substitui e avisa. Texto colado segue o caminho normal.

**5.3** Limite: `MAX_MENSAGEM` sobe para **6.000** no cliente e no servidor
(`historicoDaCris`), para caber uma tabela colada. Ao colar além do limite, a
tela **avisa** quantos caracteres ficaram de fora, em vez de cortar calada.

**5.4** Aplicar 5.1 a 5.3 também à `CaixaDeConversa`.

**5.5** Arrastar e soltar arquivo sobre o painel da Cris vira anexo, pela
mesma validação.

#### Testes

- **AQ-T7.** Função pura `classificarColagem(itensDoClipboard)` → `texto`,
  `anexo` ou `recusado` (com motivo), testada para: texto simples, texto com
  quebras e tabulações, imagem PNG, PDF, arquivo de tipo não aceito, imagem
  acima de 4 MB.
- **AQ-T8.** Texto de 6.001 caracteres: o cliente avisa; o servidor recusa ou
  corta no mesmo limite, nunca num limite diferente.
- **AQ-T9.** Uma tabela de 5 linhas × 3 colunas colada chega ao modelo com as
  5 quebras de linha.
- **(11/11) AQ-T10 (C22).** Na tela de Fornecedores, um print colado de um
  cartão de CNPJ ou de site, com razão social, CNPJ, endereço e telefone
  (imagem de teste, modelo simulado), chega ao modelo como anexo. A proposta
  volta para o formulário de fornecedor e só é gravada pelo botão Salvar da
  tela. O mesmo vale para o anexo pelo 📎.

---

### (11/11) 6 · BATERIA DE ANEXOS — UM ROTEIRO PARA O THIAGO E PARA O RELATÓRIO

O Thiago disse na reunião que ainda não testou anexando e vai fazer uma
bateria. Este roteiro é o mesmo que o relatório final usa, para que o teste
dele e o do implementador comparem as mesmas coisas. Rodar **depois do
§5**, no Chrome e no Safari (ou Edge), anexando pelo 📎 e colando.

| # | Tela | Arquivo | O que tem de acontecer |
| --- | --- | --- | --- |
| 1 | Fornecedores, novo | Print do cartão CNPJ ou do site do fornecedor | A Cris propõe razão social, CNPJ, endereço e contato; nada é salvo sem o botão |
| 2 | Fornecedores, novo | Contrato em PDF | O mesmo do item 1, a partir do contrato |
| 3 | Despesas, nova | Foto de nota fiscal ou boleto | Fornecedor, valor, vencimento e competência propostos |
| 4 | Caixa | Extrato em PDF ou print | Depois do Prompt AT §8.3: o caminho de conciliação pela Cris. Antes dele: a Cris explica que a importação é pelo botão Importar extrato |
| 5 | Clientes | Qualquer documento | Conforme a resposta de BAQ-2: aceita e não preenche nome nem CPF, ou recusa e explica |
| 6 | Qualquer tela | Imagem acima de 4 MB e arquivo .docx | Recusa com a mesma mensagem do 📎, nos dois caminhos |
| 7 | Qualquer tela | Print colado sobre outro anexo | Substitui e avisa (§5.2) |

Para cada item, registrar: navegador, tela, caminho (📎 ou colar), o que a
Cris propôs, o que estava errado e o print. Se algum item falhar por regra
de permissão (por exemplo, sem permissão de criar fornecedor), a Cris explica
e não propõe: isso conta como acerto.

---

### RELATÓRIO FINAL (obrigatório)

1. Diff da seção "O assistente" antes × depois, e das três frases de
   `receitas-obra-pessoas.ts`.
2. Respostas de BAQ-1 e BAQ-2 com arquivo e linha.
3. Lista de todas as rotas de `ROTAS_CONHECIDAS` com o `{ ver, lancar }`
   resolvido para os papéis owner, membro (chave ligada e desligada), contador
   e engenheiro.
4. Resultado da suíte completa **com banco** (`DATABASE_URL` definido), não só
   dos testes puros.
5. Vídeo curto ou prints: colar texto de várias linhas, colar um print da
   tela e colar uma tabela do Excel, no Chrome e no Safari (ou Edge).
6. Print da Cris respondendo, depois do deploy: "o que você manda para o modelo
   de IA?" e a mesma pergunta do usuário que originou este prompt.
7. **(11/11)** A tabela da bateria de anexos (§6) preenchida, item a item, nos
   dois navegadores.


---

# ANEXO C

## PROMPT AR — LEITURA ÚNICA DO PLANO DE PAGAMENTO (Prompt I, §58)

**Regra global:** nenhum `payment_plan` é reescrito, convertido ou "corrigido" no
banco. Esta tarefa muda **como o plano é lido**. Toda mudança de número em tela
é consequência de leitura, e precisa aparecer no relatório antes × depois.

**Este prompt tem duas fases. A Fase 2 só começa depois que eu responder os
BLOQUEIOS da Fase 1.**

---

### CONTEXTO

A seção 58 do Prompt I nunca foi implementada (nenhuma referência a ela no
código). Três funções continuam lendo o mesmo `payment_plan` com regras
diferentes:

| Função | Arquivo | Quem usa |
|---|---|---|
| `expandUnitReceivables` | `src/lib/calc/receivables.ts:17` | Contas a Receber, `getMonthlyRevenue` (Dashboard, Resumo, Projeção), Parâmetros |
| `calcProjectionBySource` | `src/lib/calc/projection.ts:161` | Projeção, `actions/budget.ts` (geração de Orçamento) |
| `calcTotals` | `src/lib/calc/projection.ts:375` | Resumo, `resumo-previa.ts`, `resumo-tela.ts` |

#### Divergência medida

Rodei as três sobre a unidade de paridade `bla401()` (`src/lib/calc/__fixtures__.ts`)
e três variações dela. Mesma unidade, mesmo plano:

| Cenário | Recebíveis | Projeção | Totais (def. nova) | Totais (def. antiga) |
|---|---:|---:|---:|---:|
| A · plano completo, tudo ligado | 555.000 | 530.000 | 465.000 | 465.000 |
| B · `usarS2` desligado, S2 preenchido | 555.000 | 525.000 | 465.000 | 465.000 |
| C · Subsídio "Pendente" | 555.000 | 520.000 | 465.000 | 465.000 |
| D · Sinal 1 em 3 parcelas | 565.000 | 540.000 | 475.000 | 465.000 |

(Totais = sinais + mensais + semestrais + anuais + FGTS + subsídio + banco;
não inclui `permRec`, que vem da tabela de permutas.)

#### Regra por regra

| Regra | Recebíveis | Projeção | Totais |
|---|---|---|---|
| Chaves `usar*` (cascata AS→S1→…→Financ) | **ignora** (comentário em `queries.ts:2699` diz que é de propósito) | respeita | ignora |
| Subsídio | sempre | só se `statusSub === "Recebido"` | sempre |
| Financiamento (`Banco.valFinanc`) | entra, na data da 1ª parcela | **não entra** | entra |
| Permuta do plano (`Permuta.val`) | entra como recebível | entra como fonte de receita | não entra (lê a tabela de permutas) |
| INCC nas periódicas | não aplica | aplica a partir de `INCC_FROM_INSTALLMENT` | não aplica |
| `n` de S1–S3 | multiplica | multiplica | só com `definicaoNova`; na antiga conta 1 |

Duas dessas linhas batem de frente com decisões já tomadas na revisão:
**permuta é ativo, não receita**, e **liberação de obra é caixa, não receita**.
E o alcance é maior do que parece: `getMonthlyRevenue` é a receita da **DRE**
(via `versionInputsByMonth`, em `src/lib/dre-inputs.ts`) e do **Fluxo de Caixa**
previsto. Ela soma os recebíveis de `expandUnitReceivables` pelo vencimento,
incluindo `Permuta.val` e `Banco.valFinanc` do plano, mais as liberações
(`reembursementsByMonth`) e as contas a receber lançadas. A DRE ainda soma a
revenda de permuta por cima (`permutaRevenueByMonth`). Ou seja: a receita da DRE
hoje é regime de vencimento, não o rateio decidido no Prompt I, §57.

---

### FASE 1 — MEDIR NA PRODUÇÃO (SOMENTE LEITURA)

**Não altere nada.** Gere `docs/AR-MEDICAO.md` com:

1. Para cada empresa e obra, quantas unidades vendidas têm, no `payment_plan`:
   - alguma seção com valor > 0 e a chave `usar*` correspondente desligada;
   - Subsídio com valor > 0 e `statusSub` diferente de "Recebido";
   - `Banco.valFinanc` > 0;
   - `Permuta.val` > 0;
   - S1, S2 ou S3 com `n` > 1.
2. Para as mesmas obras, o total da versão Atual pelas três leituras, lado a
   lado, e a diferença em R$.
3. Em quais telas cada um desses totais aparece hoje, com o **rótulo exato** que
   a tela mostra (ex.: "Receita", "Recebimentos previstos", "A receber").
4. Onde `getMonthlyRevenue` é exibido como "receita" e onde como
   "recebimento". Arquivo e linha.

Use uma conexão somente leitura ou uma transação com `ROLLBACK` no final.

#### BLOQUEIOS (respondo depois da medição)

- **BAR-1 · Chaves `usar*`.** Uma seção preenchida e desligada conta ou não
  conta? Se a regra for "não conta", o recebível de quem tem seção desligada
  some de Contas a Receber.
- **BAR-2 · Subsídio pendente.** Entra na projeção como previsto, ou só quando
  recebido?
- **BAR-3 · Financiamento.** É recebível da incorporadora (entrada do banco) e
  entra em todas as leituras, ou fica fora da projeção de receita como hoje?
- **BAR-4 · Permuta do plano.** Confirmar que `Permuta.val` sai de toda leitura
  de receita (decisão: permuta é ativo) e que o recebível correspondente, se
  houver, é a **revenda**, lida da tabela de permutas.
- **BAR-5 · INCC.** A correção aparece só na Projeção, ou também nos recebíveis
  de Contas a Receber?
- **BAR-6 · `getMonthlyRevenue`.** Ela serve hoje à DRE e ao Fluxo ao mesmo
  tempo. Separar em duas: recebimentos previstos (Fluxo, Dashboard) e receita
  (DRE, pelo §57)? Liberações saem da receita da DRE?
- **BAR-7 · Permuta em dobro.** O mesmo bem entra na DRE quando é recebido
  (`Permuta.val` do plano) e de novo quando é revendido? Medir na Fase 1 e
  decidir qual dos dois sai.

---

### FASE 2 — IMPLEMENTAR (só depois das respostas)

**2.1** Criar `src/lib/calc/plano.ts`, função pura `lerPlano(plan, status, opts)`
que devolve a lista canônica de parcelas:
`{ origem, numero, data, valorBase, ligada, situacao }`. É o **único** lugar que
abre o JSON do plano. Tolerante a plano antigo ou parcial, como
`expandUnitReceivables` já é.

**2.2** As três funções passam a consumir `lerPlano`, cada uma aplicando o que é
**dela**: Projeção aplica INCC; Totais agrega; Recebíveis expande datas. Nenhuma
delas volta a ler o JSON diretamente.

**2.3** As regras decididas nos BAR-1 a BAR-5 ficam em `lerPlano` e valem para as
três ao mesmo tempo. Se a decisão for manter uma diferença de propósito (ex.:
INCC só na Projeção), ela fica explícita num parâmetro de `opts`, com o motivo
em comentário.

**2.4** Se a decisão mudar números exibidos, a mudança passa pela chave de
definição nova da empresa (`dre_definicao_nova` ou chave própria), como foi
feito na DRE. Empresa com a chave desligada vê o número de antes.

#### Testes

- **AR-T1.** Os quatro cenários da tabela acima viram teste. Depois da Fase 2,
  as colunas só podem divergir onde houver um `opts` documentado.
- **AR-T2.** Teste de arquitetura: nenhum arquivo fora de `calc/plano.ts` lê
  `paymentPlan.AS`, `.S1`, `.Mensais` etc. diretamente.
- **AR-T3.** Os 17 testes de paridade com o protótipo continuam passando ou,
  se uma decisão mudar o resultado, o teste é atualizado **com a referência à
  decisão** no nome.
- **AR-T4.** Com a chave da empresa desligada, Contas a Receber, Resumo,
  Projeção e Dashboard mostram exatamente o que mostravam antes.

---

### RELATÓRIO FINAL (obrigatório)

1. `docs/AR-MEDICAO.md` (Fase 1).
2. Depois da Fase 2: por obra, os totais de cada tela antes × depois, com a
   chave ligada e desligada.
3. Lista de arquivos que deixaram de ler o plano diretamente.
4. Suíte completa com banco.


---

# ANEXO D

## PROMPT AS — HIGIENE: TESTE COM DATA VENCIDA, SUÍTE SEM BANCO E PACOTE DO CÓDIGO

**Regra global:** nenhuma alteração de código de produção. Só testes, scripts e
documentação.

---

### 1 · TESTE QUE QUEBROU SOZINHO EM NOVEMBRO

Rodei a suíte completa com Postgres 16 e as 72 migrações aplicadas:
**2.147 de 2.148 testes passam.** O que falha:

`src/lib/actions/fatura-pagamento.test.ts:116` — "fatura aberta (ciclo em curso)
não aceita pagamento nem juro". O teste usa a fatura com fechamento
**10/10/2026** como a fatura aberta. Até outubro era; desde novembro está
fechada, e `pagarFatura` corretamente aceita o pagamento. O código está certo,
o teste envelheceu.

**1.1** Fixar o relógio no teste (`vi.useFakeTimers()` + `vi.setSystemTime`) na
data em que o cenário foi escrito, ou montar a compra e a fatura a partir de
`new Date()`. Preferência: relógio fixo, porque o resto do arquivo usa datas
literais de 2026.

**1.2** Varredura: listar todo teste que compara com data literal de 2026 **e**
depende de "hoje" (fatura aberta, vencido, atrasado, mês corrente, aging). Fixar
o relógio em todos. Relatar a lista.

---

### 2 · "TODOS OS TESTES PASSAM" SEM BANCO NÃO VALE

Sem `DATABASE_URL`, **95 dos 263 arquivos de teste são pulados** (508 testes),
por `describe.skipIf(!HAS_DB)`. São justamente os de integração: concorrência
de numeração, travas de conciliação, Acerto, Ressarcimentos, permissões.

**2.1** Criar `npm run test:db`, que falha se `DATABASE_URL` não estiver definido,
e `npm run test:all` = typecheck + lint + test:db.

**2.2** A partir daqui, **todo relatório final de prompt** informa o resultado
de `test:all` com o número de testes pulados. Pulado > 0 precisa de motivo.

**2.3** Se houver CI (GitHub Actions), adicionar um serviço Postgres 16 e rodar
`test:all`. Se não houver, só relatar.

---

### 3 · O ZIP "FONTE COMPLETA" NÃO ESTÁ COMPLETO

O pacote enviado para revisão veio **sem**:

- `src/lib/db/migrations/meta/` — sem `_journal.json`, o migrator do Drizzle
  não roda (`Can't find meta/_journal.json file`). Tive de aplicar os `.sql` à
  mão para testar;
- `docs/` — o README aponta para `docs/SPEC.md`, `docs/STACK.md`,
  `docs/EMISSAO-NF.md`, `docs/LEITURA-DOCUMENTOS-IA.md` e nenhum veio;
- histórico do git — sem ele não dá para separar o que foi feito nesta rodada.

**3.1** Criar `scripts/pacote-revisao.sh` que gera o zip a partir de
`git archive HEAD` (respeita o `.gitignore`, inclui `meta/` e `docs/`) e
acrescenta `REVISAO.txt` com:
- hash e data do HEAD;
- `git log --oneline` desde a tag ou o commit da última revisão (parâmetro);
- `git diff --stat` no mesmo intervalo.

**3.2** Confirmar que `meta/` está versionado no repositório. Se não estiver,
**pare e relate**: nesse caso o deploy do Coolify também não teria como migrar,
e precisamos entender como a produção está sendo migrada.

---

### RELATÓRIO FINAL

1. Lista dos testes com relógio fixado.
2. Saída de `npm run test:all`.
3. Resposta do 3.2.
4. O zip gerado pelo script novo.


---

# (11/11) ANEXO E

## PROMPT AU — PLANOS DE IA POR EMPRESA: COTA, NÍVEL E PACOTE

**Origem:** reunião de 11/11/2026 (Parte 7.2). **Duas fases.** A Fase 1 é só
medição e pode começar já. A Fase 2 só começa depois das respostas BIA-1 a
BIA-6, e precisa estar pronta antes ou junto da Etapa 7.

**Regra global:** nenhum dado de produção alterado. Migrações só aditivas.
Empresa sem plano cadastrado continua exatamente como hoje (mesmos limites,
mesmas telas, mesma Cris).

---

### CONTEXTO (conferido no código em 11/11)

- O consumo já é registrado: `ia_uso` (migração 0066) grava, a cada chamada,
  empresa, pessoa, operação, modelo, fallback, erro e tokens (entrada, saída,
  cache criado e cache lido). Nunca grava conteúdo
  (`src/lib/ai/uso.ts`).
- O único limite é por **quantidade de conversas**: 30 por pessoa e 300 por
  empresa, por hora (`LIMITES_DE_CONVERSA`, `src/lib/ia-uso-regras.ts:11`),
  conferido em `limiteDeConversa` antes de cada pergunta.
- **Não existe:** cota em dinheiro, nível de plano por empresa, aviso de
  consumo, meio de pagamento, nem chave de IA da própria empresa.
- A tela **Diagnóstico de IA** (`/diagnosticoia`, Configurações) já lê
  `ia_uso`.

---

### FASE 1 — MEDIR O CUSTO REAL (SOMENTE LEITURA)

**Não altere nada.** Conexão somente leitura ou transação com `ROLLBACK`.
Gere `docs/AU-MEDICAO.md` com:

1. Por empresa e por mês, desde o início de `ia_uso`: chamadas, tokens de
   entrada, saída e cache, por **operação** e por **modelo**.
2. **Custo estimado** em US$ e em R$, pela tabela de preços do provedor
   vigente na data do relatório. Cite a fonte e a data da tabela, e declare
   o câmbio usado. Confira com o gasto mostrado na reunião (cerca de US$ 6 a
   7 no mês anterior).
3. Por pessoa: chamadas por dia (mediana e percentil 90) e o custo da
   pergunta mais cara.
4. Quantas vezes o limite de 30/300 recusou uma pergunta.
5. **Estimativa do pacote ampliado:** custo de uma pergunta de análise da
   Etapa 7, como a do AC-T1, medido com o modelo de verdade numa empresa de
   teste e não em produção. Com isso, quanto custaria uma empresa média
   fazendo 10, 50 e 200 dessas por mês.
6. Uma tabela final, para a decisão BIA-3: custo por empresa por mês hoje
   × custo projetado no pacote ampliado.

### BLOQUEIOS (respondo depois da medição)

BIA-1 a BIA-6, na Parte 5.

---

### FASE 2 — IMPLEMENTAR (só depois das respostas)

O desenho abaixo é a proposta. Ajustar ao que for decidido.

**2.1 · Plano por empresa.** Tabela nova `plano_ia`: empresa, nível
(`sem_custo` ou `ampliado`, ou os níveis do BIA-1), cota mensal (na unidade
do BIA-3), vigência, quem alterou e quando. **Empresa sem linha = nível sem
custo, com o comportamento de hoje.** Quem define o plano é o operador da
plataforma (super-admin), não o cliente, até existir meio de pagamento
(BIA-4).

**2.2 · Custo de cada chamada.** Tabela de preços por modelo em código
(`src/lib/ai/precos.ts`, com a data e a fonte). O custo do mês sai de
`ia_uso` × tabela. Nada é regravado em `ia_uso`.

**2.3 · Conferência no servidor, antes de chamar o modelo**, junto do
`limiteDeConversa`:

- a cota do mês: se esgotada, o que o BIA-4 decidir;
- o nível: as ferramentas do pacote ampliado (o catálogo de leitura da Etapa
  7) **só entram na chamada** se o nível permitir. A conferência é no
  servidor, não só na tela: esconder o botão não basta.

**2.4 · Aviso.** Aos 80% da cota, a Cris avisa uma vez por pessoa por dia. Ao
esgotar, a mensagem diz o que aconteceu e o que fazer (falar com o dono da
conta ou, se o BIA-4 permitir, comprar o pacote de expansão).

**2.5 · Tela "Uso de IA"** (dentro de Diagnóstico de IA, sem tela nova):
nível, cota do mês, consumo até agora e por pessoa, e projeção até o fim do
mês. Quem vê: proprietário e administrador.

**2.6 · Empresa de demonstração (BIA-6).** Conforme a decisão: nível máximo,
dados fictícios, cota fixa, e nenhum dado de cliente real.

#### Testes

- **AU-T1.** Empresa sem `plano_ia`: mesma Cris, mesmos limites, mesmas
  ferramentas de hoje (teste de regressão).
- **AU-T2.** Empresa no nível sem custo: a chamada ao modelo não leva as
  ferramentas do pacote ampliado, conferido no servidor.
- **AU-T3.** Cota esgotada: a próxima pergunta segue o BIA-4 e não chama o
  modelo além do permitido.
- **AU-T4.** O custo do mês calculado bate com a soma de `ia_uso` × tabela de
  preços, com relógio fixo.
- **AU-T5.** O cliente não altera o próprio plano por nenhuma rota; só o
  operador da plataforma.
- **AU-T6.** O aviso de 80% aparece uma vez por pessoa por dia.

### RELATÓRIO FINAL (obrigatório)

1. `docs/AU-MEDICAO.md` (Fase 1).
2. Depois da Fase 2: print da tela Uso de IA de uma empresa sem plano, uma no
   nível sem custo e uma no ampliado.
3. Suíte completa **com banco**, com o número de testes pulados.


---

# (11/11) ANEXO F

## PROMPT AV — DITADO POR VOZ NA CRIS: DESCOBRIR O ERRO E DIZER O QUE ACONTECEU

**Origem:** reunião de 11/11/2026: "o comando de voz às vezes dá alguns
erros". O relato não diz qual erro (BVZ-1). Por isso o prompt começa pela
reprodução.

**Regra global:** nenhuma migração, nenhum dado. O áudio continua sem passar
pelo servidor do app e sem ir ao modelo da Cris (decisão BV2-1 do Prompt
VOZ).

---

### CONTEXTO (conferido no código em 11/11)

- `src/components/app/cris-voz.tsx` usa o reconhecimento de fala **do
  navegador** (Web Speech API, `pt-BR`), com `continuous = false` e
  `interimResults = false`. Ele para na primeira pausa e só entrega o texto
  no fim.
- **Erros:** só `not-allowed` tem mensagem própria ("Permita o microfone no
  navegador."). Todo o resto (`no-speech`, `audio-capture`, `network`,
  `aborted`, `service-not-allowed`, `language-not-supported`) vira "Não
  entendi. Tente de novo.".
- A mensagem de erro **só aparece no `title` do botão** (o texto que surge ao
  passar o mouse) e na cor do 🎤. No celular e no tablet não há como ver.
- Sem suporte (Firefox), o botão some. No Safari o suporte existe, mas varia
  por versão.
- É usado no chat da Cris (`chat-assistente.tsx:245`) e no chat de
  Relatórios (`relatorio-chat.tsx:89`). O texto ditado é somado ao que já
  estava digitado.

---

### FASE 1 — REPRODUZIR

**1.1** Com a resposta do BVZ-1 (navegador, computador ou celular, frase
dita, o que apareceu), reproduzir o erro.

**1.2** Rodar o mesmo roteiro em Chrome e Edge no Windows ou macOS, Safari no
macOS, Safari no iPhone e Chrome no Android: ditar uma frase curta, uma longa
com pausa no meio, e uma com número e valor ("lança duas mil e trezentas
reais de cimento"). Registrar, para cada um, o código do erro (`e.error`) e o
texto que entrou.

**1.3** Relatar a tabela antes de mexer no código. Se o erro for do serviço
de fala do navegador (por exemplo, `network`), dizer isso: o app não
consegue corrigir, só explicar.

### FASE 2 — CORRIGIR O QUE É DO APP

**2.1** Função pura `mensagemDoErroDeVoz(codigo)`, com uma mensagem em
linguagem de quem opera para cada código. Exemplos: "Não ouvi nada. Fale logo
depois de tocar no 🎤." para `no-speech`; "Nenhum microfone encontrado." para
`audio-capture`; "O serviço de voz do navegador não respondeu. Verifique a
internet." para `network`.

**2.2** A mensagem aparece **em texto, abaixo do campo**, como os outros
erros do chat, e não só no `title`. Ela some quando a pessoa digita ou tenta
de novo.

**2.3** Enquanto a pessoa fala, o texto parcial aparece no campo, em cinza
(`interimResults = true`). O ditado continua até ela tocar de novo no 🎤 ou
ficar alguns segundos em silêncio (`continuous = true`, com parada por
silêncio). Uma pausa curta no meio da frase deixa de cortar o ditado.

**2.4** Erro no meio do ditado não apaga o que já foi reconhecido.

**2.5** Mesmo comportamento nos dois lugares que usam o botão (chat da Cris e
Relatórios).

**2.6** A base de conhecimento diz, na seção da Cris: o ditado é do
navegador; no Chrome, no Edge e no Safari o reconhecimento roda no serviço de
fala do fabricante do navegador; o áudio não passa pelo servidor do app; e
no Firefox o botão não aparece.

#### Testes

- **AV-T1.** `mensagemDoErroDeVoz` tem mensagem própria para cada código
  conhecido, e uma genérica para código desconhecido.
- **AV-T2.** Função pura `juntarDitado(atual, novo)`: espaço entre os dois,
  sem espaço duplo, sem apagar o texto atual.
- **AV-T3.** Com um reconhecedor simulado que dispara `error: "no-speech"`, a
  mensagem aparece em texto visível (não só no `title`), e o texto já
  reconhecido continua no campo.

### RELATÓRIO FINAL (obrigatório)

1. A tabela da Fase 1 (navegador × frase × resultado).
2. O que era do app e foi corrigido, e o que é do navegador e só passou a ser
   explicado.
3. Prints do erro visível no computador e no celular.
4. Suíte completa **com banco**, com o número de testes pulados.

# PROMPTS — GROWTH TOOLS · CONSTRUCTION APP

Os 42 prompts de execução, na ordem, **na íntegra**.

Cada um é copiado inteiro para o Claude Code, um por vez. **Nenhum é executado sem responder os seus bloqueios** — eles estão listados no índice e desenvolvidos dentro de cada prompt.

Companheiros deste arquivo: **`SPEC-GROWTH-CONSTRUCTION.md`** (o quadro geral) e **`mockup-growth.html`** (41 telas navegáveis).


---


# COMO EXECUTAR

**1 ·** Ler os bloqueios do prompt no índice abaixo e responder **todos** antes de começar. Vários exigem consulta SQL somente-leitura, que está escrita dentro do prompt.

**2 ·** Copiar o prompt inteiro — do título à última linha do relatório final — para o Claude Code.

**3 ·** Exigir o **relatório final obrigatório** ao fim de cada execução. Ele é a prova de que os testes rodaram e de que nenhum dado foi alterado.

**4 ·** Não pular a ordem. As dependências estão na coluna “observação” do índice.


**Quatro regras valem para os 42, e estão repetidas no topo de cada um:** nenhum dado inputado pela empresa é alterado; nenhuma mudança amplia acesso; mudança que altera número em produção entra atrás de chave desligada; e nada vindo de mockup entra no código.


---


# ÍNDICE


## Bloco 0 · Segurança e exposição

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 1 | **[AJ](#prompt-aj)** | Gestão de Acessos | BAJ-1 · BAJ-2 · BAJ-3 | Partes 1, 2 e 3 agora; o restante no Bloco 5. **É a causa do relato de produção.** |
| 2 | **[AI](#prompt-ai)** | Usuários & Acessos | BAI-1 · BAI-3 · BAI-2 | **Parte 4 primeiro** — uma linha, fecha vazamento entre tenants. Depois Partes 0 a 3. |
| 3 | **[AF](#prompt-af)** | Numeração de Despesas | BAF-1 · BAF-2 · BAF-3 | Partes 1 e 2 agora; Partes 3 a 6 no Bloco 5. |
| 4 | **[AK](#prompt-ak)** | Log de Auditoria | BAK-1 · BAK-2 · BAK-3 | Partes 1 e 2 agora; o restante no Bloco 5. |

## Bloco 1 · Fundação

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 5 | **[A](#prompt-a)** | Contexto de projeto e versão | B-A1 · B-A2 | Transversal. O fallback silencioso aparece em 9 telas revisadas. |
| 6 | **[C](#prompt-c)** | Barra lateral e menu | B-C1 · B-C2 · B-C3 | ⟨reescrito⟩ Business Intelligence, Planejamento em 2º, e o vocabulário “projeto”. |
| 7 | **[M](#prompt-m)** | Permissões e Clientes | BM-1 · BM-2 · BM-3 | O BM-3 trava AO e AK. |

## Bloco 2 · A receita

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 8 | **[I](#prompt-i)** | Arquitetura de versões | BI-1 · BI-2 · BI-3 | **Documento central.** Ler antes de qualquer decisão sobre receita, versão ou consolidação. A seção 58 ainda não foi escrita. |
| 9 | **[J](#prompt-j)** | Unidades | BJ-1 · BJ-2 · BJ-3 | O `payment_plan` é a origem de tudo. Recebe a validação da data impossível (AN, Parte 6). |
| 10 | **[K](#prompt-k)** | Contas a Receber | BK-0 · BK-1 · BK-2 · BK-3 · BK-4 | A materialização e a competência que falta. |
| 11 | **[P](#prompt-p)** | Permuta | BP-1 · BP-2 · BP-3 | Ativo, não receita. |
| 12 | **[O](#prompt-o)** | Liberações de Obra | BO-1 · BO-2 | Caixa, não receita. |
| 13 | **[Q](#prompt-q)** | Parâmetros / INCC | BQ-1 · BQ-2 · BQ-3 | A correção monetária é receita. |
| 14 | **[N](#prompt-n)** | Simulador | BN-1 · BN-2 · BN-3 | Depende de J. O BN-1 decide se ele passa a gerar o plano. |

## Bloco 3 · O lançamento

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 15 | **[W](#prompt-w)** | Fornecedores | BW-1 · BW-2 | O papel de pagador, do qual T e X dependem. |
| 16 | **[G](#prompt-g)** | Plano de Contas | — | ⟨reescrito⟩ Parte 1 é restyle; Parte 2 é o assistente. **Não vão juntas.** |
| 17 | **[S](#prompt-s)** | Despesas | BS-1 · BS-2 · BS-3 · BS-4 | ⟨reescrito⟩ A seção 3-C trava a categoria de receita. O BS-1 nunca leu o `despesa-form`. |
| 18 | **[R](#prompt-r)** | Contas a Pagar | BR-1 · BR-2 | O saldo da parcela, que AD e AE consomem. |
| 19 | **[T](#prompt-t)** | Ressarcimentos | BT-1 · BT-2 | RG-04. |
| 20 | **[U](#prompt-u)** | Cartões de Crédito | BU-1 · BU-2 · BU-3 | Tela nova. Par com S, seção 3-B. |
| 21 | **[X](#prompt-x)** | Contas Correntes | BX-1 · BX-2 · BX-3 | Depende de W e T. **Muda o saldo do Fluxo de Caixa.** |
| 22 | **[L](#prompt-l)** | Caixa e Conciliação | BL-1 · BL-2 · BL-3 | Os dois saldos. AD e AE dependem. |
| 23 | **[Y](#prompt-y)** | Estoque | BY-1 · BY-2 |  |
| 24 | **[Z](#prompt-z)** | Módulo Pessoas | BZ-1 · BZ-2 · BZ-3 · BZ-4 |  |

## Bloco 4 · Planejamento e obra

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 25 | **[B](#prompt-b)** | Projetos | B-1 · B-2 · B-3 | Fecha o A-07: sem período, não há grade mensal. |
| 26 | **[D](#prompt-d)** | Orçamentos | BD-1 · BD-2 · BD-3 · BD-4 · BD-5 · BD-6 · BD-7 |  |
| 27 | **[F](#prompt-f)** | Previsão Atualizada | BF-1 · BF-2 · BF-3 · BF-4 |  |
| 28 | **[H](#prompt-h)** | Rascunho não entra em relatório | BH-1 · BH-2 · BH-3 · BH-4 | **Muda número em produção.** Só depois de D e F. |
| 29 | **[V](#prompt-v)** | Medição de Obra | BV-1 · BV-2 · BV-3 · BV-4 | ⟨reescrito⟩ Fusão das duas telas, autoria do engenheiro, e o BV-1. |

## Bloco 5 · Configuração

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 30 | **[AH](#prompt-ah)** | Empresa | BAH-1 · BAH-2 | **Pré-requisito do Emissor (AG).** |
| 31 | **[AL](#prompt-al)** | Acesso Contabilidade sai | BAL-1 · BAL-2 · BAL-3 | Depende de AJ, Partes 1 e 2. |
| 32 | **[AN](#prompt-an)** | Conferência | BAN-1 · BAN-2 · BAN-3 | ⟨reescrito⟩ A quarta condição; a data impossível vai para J. |
| 33 | **[AP](#prompt-ap)** | Configuração da Versão sai | BAP-1 · BAP-2 · BAP-3 · BAP-4 | A coleta é a Etapa 1 do próprio prompt. **O BAP-1 pode impedir a remoção.** |

## Bloco 6 · Leitura

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 34 | **[AB](#prompt-ab)** | Remoção de três telas | BAB-1 · BAB-2 · BAB-3 · BAB-4 · BAB-5 | Projeção, Consolidado e Balanço do Dia. **Balanço do Dia só depois de L.** |
| 35 | **[AC](#prompt-ac)** | DRE | BAC-1 · BAC-2 · BAC-3 · BAC-4 | A Parte 1 pode ir antes de tudo; o resto depende do Bloco 2. |
| 36 | **[AD](#prompt-ad)** | Fluxo de Caixa | BAD-1 · BAD-2 · BAD-3 | Depende de L e do BAD-1. |
| 37 | **[AA](#prompt-aa)** | Dashboard | BAA-1 · BAA-2 · BAA-3 · BAA-4 · BAA-5 · BAA-6 | ⟨reescrito⟩ Depende de V (BAA-1) e do Bloco 2. A Parte 7 é o relatório customizado. |
| 38 | **[AE](#prompt-ae)** | Resumo Executivo | BAE-1 · BAE-2 · BAE-3 | Três blocos prontos, três dependentes. |

## Bloco 7 · O que nasce depois

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 39 | **[E](#prompt-e)** | Assistente de IA — arquitetura | BE-1 · BE-2 · BE-3 | Etapa 1. O BE-1 se responde em AM. |
| 40 | **[AM](#prompt-am)** | Assistente do produto | BAM-1 · BAM-2 · BAM-3 | Não depende de dado. **Pode ir a qualquer momento.** |
| 41 | **[AO](#prompt-ao)** | Backup completo | BAO-1 · BAO-2 · BAO-3 | A Parte 6 pode ir agora; o resto depende do BM-3. |
| 42 | **[AG](#prompt-ag)** | Emissor de NFS-e | BAG-1 · BAG-2 · BAG-3 · BAG-4 · BAG-5 | Depende de AH. O BAG-1 é pergunta de negócio. |

---


# OS BLOQUEIOS, EM UMA LISTA

**Responder antes de executar o prompt correspondente.** Os que estão marcados travam mais de um prompt.

| Bloqueio | Pergunta | Prompt |
|---|---|---|
| `BAJ-1` | Diagnóstico do relato — quem vê o quê, hoje | AJ |
| `BAJ-2` | O que o `membro` precisa ver | AJ |
| `BAJ-3` | Falta um papel entre `membro` e `contador`? | AJ |
| `BAI-1` | Ligar o MFA para todos? | AI |
| `BAI-3` | Quem tem override para esta tela hoje? | AI |
| `BAI-2` | O que fazer com quem sai da empresa | AI |
| `BAF-1` | Já existe número repetido em produção? | AF |
| `BAF-2` | O que "Numeração automática ativa" deve fazer | AF |
| `BAF-3` | O contador é do tenant — isso é o desejado? | AF |
| `BAK-1` | Quem é o dono de cada uma das 13 | AK |
| `BAK-2` | O que pode aparecer no `meta` | AK |
| `BAK-3` | O log entra no Backup? | AK |
| `B-A1` | Qual é o tamanho real desta refatoração? | A |
| `B-A2` | O que o usuário vê quando nenhum projeto foi escolhido? | A |
| `B-C1` | "Diagnósticos" precisa de um terceiro nível que a estrutura não tem | C |
| `B-C2` | Busca, notificações e ajuda existem? | C |
| `B-C3` | O seletor de Empresa troca de tenant? | C |
| `BM-1` | `acerto` e `diagnostico` estão fora da matriz | M |
| `BM-2` | Qual tela de medição o engenheiro vê | M |
| `BM-3` | Quais campos vão para o nível sensível | M |
| `BI-1` | Como o rateio da receita se comporta nos casos de borda | I |
| `BI-2` | As parcelas do plano viram registros de contas a receber? | I |
| `BI-3` | O que fazer com os dois caminhos que hoje contaminam o planejamento | I |
| `BJ-1` | A data da venda está sendo exibida corretamente? | J |
| `BJ-2` | Existem unidades duplicadas em produção? | J |
| `BJ-3` | Escrita assistida por IA — DECIDIDO | J |
| `BK-0` | A materialização depende das seções 54, 56 e 57 do Prompt I | K |
| `BK-1` | O modelo de vínculo depende do Caixa | K |
| `BK-2` | INCC nos recebíveis materializados | K |
| `BK-3` | Diferença de centavos | K |
| `BK-4` | Contas já marcadas como recebidas à mão | K |
| `BP-1` | O inventário novo ou o Estoque que já existe? | P |
| `BP-2` | O status deve governar o reconhecimento? | P |
| `BP-3` | O escambo é venda? | P |
| `BO-1` | RESPONDIDO — a tela está somada em duplicidade | O |
| `BO-2` | A porcentagem tem alguma base? | O |
| `BQ-1` | Qual INCC a tabela guarda? | Q |
| `BQ-2` | Qual dos dois cálculos de receita é o correto? | Q |
| `BQ-3` | A carência de correção é contratual? | Q |
| `BN-1` | A simulação passa a ser gravada? | N |
| `BN-2` | Qual a taxa de juros real dos contratos | N |
| `BN-3` | A renda pode vir do cadastro do cliente? | N |
| `BW-1` | Documentos duplicados e inválidos em produção | W |
| `BW-2` | Papéis gravados fora da lista | W |
| `BS-1` | O formulário não foi revisado | S |
| `BS-2` | A validação ao pagar é contornável? | S |
| `BS-3` | O Repositório está duplicando linhas | S |
| `BS-4` | Quantas despesas estão hoje classificadas como receita | S |
| `BR-1` | A sequência de PED pode reemitir número já usado | R |
| `BR-2` | O projeto guarda-chuva é `office` ou `proj`? | R |
| `BT-1` | O papel de pagador — RESOLVIDO | T |
| `BT-2` | Dados de recebimento — DECIDIDO | T |
| `BU-1` | Reaproveitar o mecanismo de "pago por terceiro"? | U |
| `BU-2` | Compra sem lançamento no sistema | U |
| `BU-3` | Rotativo — a taxa vem de onde? | U |
| `BX-1` | O que é a conta "CHEQUE TERCEIRO" | X |
| `BX-2` | Inventário de vínculos das três contas | X |
| `BX-3` | O "Automático" não conecta | X |
| `BL-1` | Reclassificar as contas de terceiro em vez de removê-las | L |
| `BL-2` | O que fazer com os `rec = true` sem vínculo | L |
| `BL-3` | Conciliação parcial altera o status da despesa | L |
| `BY-1` | RESOLVIDO — controle físico, sem realocação de custo | Y |
| `BY-2` | Existe compra de material sem obra definida? | Y |
| `BZ-1` | A diária gera despesa? | Z |
| `BZ-2` | O que o cadastro de CLT guarda, e o que o sistema faz com isso | Z |
| `BZ-3` | A lista de funções é fechada? | Z |
| `BZ-4` | O que acontece com `time_entry` | Z |
| `B-1` | RESOLVIDO — ver Prompt A | B |
| `B-2` | Qual é a fonte do "Orçado" no comparativo? | B |
| `B-3` | RESOLVIDO — ver Prompt A | B |
| `BD-1` | Qual número vai na célula somente-leitura? | D |
| `BD-2` | O que acontece com o valor da linha legada? | D |
| `BD-3` | O Assistente de IA é somente leitura ou não? | D |
| `BD-4` | Budget e Forecast: uma tela ou duas? | D |
| `BD-5` | Os grupos de receita existem no Plano de Contas? | D |
| `BD-6` | Onde fica gravada a seleção de linhas? | D |
| `BD-7` | A seleção da Previsão é própria ou herdada do Orçamento? | D |
| `BF-1` | De onde vem o total de receitas da previsão? | F |
| `BF-2` | O que a situação deve significar — RESPONDIDO EM PARTE | F |
| `BF-3` | A importação de planilha pode gravar totais aqui? | F |
| `BF-4` | A seleção de linhas é herdada? | F |
| `BH-1` | Quantas versões estão em cada situação hoje? | H |
| `BH-2` | A regra vale só para versões de planejamento — confirmar | H |
| `BH-3` | O que acontece com a versão em Rascunho no seletor? | H |
| `BH-4` | Quem pode aprovar, e aprovar pode ser desfeito? | H |
| `BV-1` | Migrar para medição por serviço? | V |
| `BV-2` | Alguém já lançou medição e não a viu depois? | V |
| `BV-3` | A medição não sabe quem a lançou | V |
| `BV-4` | Alguém já imprimiu o Relatório CEF e mandou para a Caixa? | V |
| `BAH-1` | Quantos cadastros ficam inválidos quando a validação entrar | AH |
| `BAH-2` | A emissão entra — e isso muda o peso desta tela | AH |
| `BAL-1` | O que o botão "Convidar (somente leitura)" faz hoje | AL |
| `BAL-2` | O contador pode receber permissão de escrita? | AL |
| `BAL-3` | O que acontece com a rota | AL |
| `BAN-1` | Quantos lançamentos a quarta condição traz | AN |
| `BAN-2` | O lote continua existindo? | AN |
| `BAN-3` | A carência sai; a data impossível fica | AN |
| `BAP-1` | Quem cria as versões de um projeto novo | AP |
| `BAP-2` | O travamento continua existindo? | AP |
| `BAP-3` | A importação por planilha morre com a tela? | AP |
| `BAP-4` | A versão padrão | AP |
| `BAB-1` | Quem passa a responder cada pergunta | AB |
| `BAB-2` | `daily_closing` e `carry_over` continuam legíveis? | AB |
| `BAB-3` | Quem consome as exportações | AB |
| `BAB-4` | As funções que ficam sem chamador | AB |
| `BAB-5` | Existe link, atalho ou favorito para estas rotas | AB |
| `BAC-1` | O diagnóstico da base, antes de qualquer código | AC |
| `BAC-2` | Quantas versões um projeto tem, e qual o teto de colunas | AC |
| `BAC-3` | A cascata contábil — decisão do cliente, não do código | AC |
| `BAC-4` | A quinta origem de receita | AC |
| `BAD-1` | De onde vem o ponto de partida do saldo acumulado | AD |
| `BAD-2` | Quanto do previsto já aconteceu | AD |
| `BAD-3` | Qual comparação o assistente oferece primeiro | AD |
| `BAA-1` | O destino dos dezesseis cartões | AA |
| `BAA-2` | O inventário das versões copiadas | AA |
| `BAA-3` | Quanto os cartões "Recebido" e "Executado" estão inflados | AA |
| `BAA-4` | O que "Recebido" deve significar | AA |
| `BAA-5` | A base dos percentuais | AA |
| `BAA-6` | O catálogo de métricas da Parte 7 | AA |
| `BAE-1` | A tolerância de desvio do bloco Atenção | AE |
| `BAE-2` | A exposição máxima de caixa | AE |
| `BAE-3` | O VSO — vendas sobre oferta | AE |
| `BE-1` | O que já existe em `/diagnosticoia`? | E |
| `BE-2` | Que dados saem do sistema, e para onde? | E |
| `BE-3` | Qual etapa está sendo autorizada agora? | E |
| `BAM-1` | A base de conhecimento reflete o sistema de hoje, não o dos prompts | AM |
| `BAM-2` | O assistente explica regra contábil? | AM |
| `BAM-3` | O histórico da conversa é gravado? | AM |
| `BAO-1` | A lista das tabelas, confirmada uma a uma | AO |
| `BAO-2` | O pacote passa a levar dado pessoal completo | AO |
| `BAO-3` | O nome da tela | AO |
| `BAG-1` | Qual é o fato gerador da nota? | AG |
| `BAG-2` | Nota emitida vira receita? **Não.** | AG |
| `BAG-3` | O token é único para todos os tenants | AG |
| `BAG-4` | Homologação não produz dado de negócio | AG |
| `BAG-5` | O que `calc/nfse.ts` já decide | AG |

---


<a id="prompt-aj"></a>


========================================================================


### ▸ 1 de 42 · PROMPT AJ — Gestão de Acessos

**Bloco 0 · Segurança e exposição** · Bloqueios: BAJ-1 · BAJ-2 · BAJ-3

Partes 1, 2 e 3 agora; o restante no Bloco 5. **É a causa do relato de produção.**

========================================================================


# PROMPT AJ — GESTÃO DE ACESSOS

Growth Construction · `/acessos`, e o módulo `src/lib/permissions.ts`.

Baseado na coleta `docs/TELA-ACESSOS.md`. **Tem prioridade sobre os demais
prompts abertos:** há relato de produção de que usuários enxergam o que não
deveriam, e a Parte 1 é a causa.

**Relação com os outros dois prompts de acesso:** o **Prompt M** é dono da
política aplicada tela a tela; o **Prompt AI** é dono da administração de conta e
traz o piso de papel (Parte 0 de lá). **Este é dono do mecanismo** — o default, o
merge e a matriz.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** **Nenhum
`membership.permissions` é apagado, reescrito ou migrado por esta tarefa** — nem
para "limpar" os overrides que a Parte 2 torna desnecessários. Override é
configuração que alguém fez. Se alguma correção exigir tocar num jsonb gravado:
**PARE**, não execute, e reporte.

**2 · Reduzir acesso é seguro; ampliar não é.** Toda mudança deste prompt ou
**nega** o que hoje é permitido, ou é neutra. **Nenhuma linha pode permitir o que
hoje é negado** — é a condição de aceite da seção 11.

**3 · Nada vindo de mockup entra no código.**

**4 · O assistente não concede, não revoga e não grava nada.**

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

**1 · `can()` nega por ausência** — `perms[screenId]?.[action] ?? false`. Tela
desconhecida devolve `false`. **Não mexer.**

**2 · `screenIdOfPath` resolve pelo primeiro segmento** e devolve `null` fora da
lista. Correto.

**3 · O enforcement central do layout** cobre as 38 telas com uma linha.

**4 · A matriz tem botão de salvar**, não grava por clique.

**5 · A regra "ver é pré-requisito" existe na interface** — falta no servidor,
que é a Parte 4.

**6 · O duplo filtro `(userId, tenantId)` no update é a PK da tabela** — um
`userId` de outro tenant não casa linha nenhuma.

**7 · O comentário em `MODULOS`** registra que Planejamento já esteve faltando,
com a consequência escrita. É o tipo de registro que a revisão quer ver mais.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — o default do `membro` | **BAJ-1** | **é a causa do relato** |
| **2** — salvar só o que diverge | Parte 1 | sem ela, a Parte 1 não alcança quem já tem override |
| **3** — o clamp de papel | — | **é a Parte 0 do Prompt AI**, implementada aqui |
| **4** — validação no servidor | nada | |
| **5** — as 61 caixas mortas | nada | |
| **6** — telas fora da matriz | **BM-1 do Prompt M** | |
| **7** — auditoria | nada | |
| **8** — assistente de IA | Partes 1 a 5 | |

**As Partes 1 e 2 são um par.** A 1 corrige quem não tem override; a 2 alcança
quem tem. Separadas, metade das pessoas continua como está.

---

# BLOQUEIOS

## BAJ-1 · Diagnóstico do relato — quem vê o quê, hoje

**Antes de qualquer código.** O relato é de que "não importa a classificação, o
usuário está visualizando tudo". Há dois caminhos possíveis, e a correção difere.

```sql
-- 1) Papel e override de cada membro.
SELECT u.name, u.email, m.role,
       (m.permissions IS NOT NULL) AS tem_override,
       (SELECT count(*) FROM jsonb_object_keys(m.permissions)) AS chaves,
       m.permissions -> 'dre'      AS dre,
       m.permissions -> 'despesas' AS despesas,
       m.permissions -> 'usuarios' AS usuarios,
       m.permissions -> 'acessos'  AS acessos
  FROM membership m
  JOIN "user" u ON u.id = m.user_id
 ORDER BY m.role, u.name;

-- 2) Overrides que concedem telas de Config a quem não é owner/admin.
SELECT u.email, m.role, k AS tela, m.permissions -> k AS perm
  FROM membership m
  JOIN "user" u ON u.id = m.user_id,
       LATERAL jsonb_object_keys(m.permissions) k
 WHERE m.role NOT IN ('owner','admin')
   AND k IN ('usuarios','acessos','empresa','numeracao','versao','backup','acoes')
 ORDER BY u.email, k;

-- 3) Chaves gravadas que não existem em SCREENS — overrides órfãos.
SELECT u.email, k AS chave_orfa
  FROM membership m
  JOIN "user" u ON u.id = m.user_id,
       LATERAL jsonb_object_keys(m.permissions) k
 WHERE k NOT IN ('dashboard','projecao','consolidado','caixa','fechamento',
   'balancodia','dre','fluxocaixa','medicao','resumo','unidades','budget',
   'forecast','clientes','contasreceber','medicaolanc','simulador','reembolso',
   'permuta','parametros','despesas','contaspagar','restituicoes','fornecedores',
   'planocontas','contas','estoque','ponto','backup','usuarios','acessos','acoes',
   'contabilidade','empresa','projeto','numeracao','versao','diagnosticoia');
```

**Como ler:**

| Resultado | Causa | Corrige com |
|---|---|---|
| `role = 'membro'` e `tem_override = false` | **o default** — `EDIT` em 29 telas | Parte 1 |
| `tem_override = true` com **38 chaves** | **o salvamento total** — o papel não governa mais | Partes 1 **e** 2 |
| Consulta 2 devolve linhas | override concedeu tela de Config | Parte 3 |

**A consulta 1 é a entrega obrigatória do bloqueio.** Sem ela não dá para saber
se a Parte 1 sozinha resolve.

## BAJ-2 · O que o `membro` precisa ver

A Parte 1 deixa de conceder `EDIT` em tudo. **A pergunta que a substitui é de
negócio:** que telas uma pessoa de operação precisa alcançar
para trabalhar?

**Responder com a lista, tela a tela, e a ação de cada uma.** Três recortes
prováveis, e o cliente escolhe:

1. **Lançamento** — Despesas, Contas a Pagar, Fornecedores, Caixa, Contas
   Correntes, Medição. Sem relatório de resultado.
2. **Lançamento + receita** — o anterior mais Clientes, Unidades, Contas a
   Receber, Permuta.
3. **Operação com leitura** — algum dos anteriores mais DRE e Fluxo de Caixa em
   **ver**.

**Enquanto não houver resposta, não ligar a Parte 1** — ver 1.4. Trocar um
default permissivo por outro adivinhado apenas move o problema.

## BAJ-3 · Falta um papel entre `membro` e `contador`?

Hoje são cinco papéis, e o vão entre eles é grande: `membro` cria e edita quase
tudo; `contador` lê oito telas; `engenheiro` só lança medição.

**Se a resposta do BAJ-2 for "lançamento sem resultado"**, isso provavelmente é
um papel novo — `operacional` ou equivalente —, não um `membro` mais magro.

**Responder:** ajusta o `membro`, ou cria papel novo e o `membro` passa a ser
papel de gestão?

**Papel novo é migração de enum** (`roleEnum`, `schema.ts:29–36`) e reatribuição
de pessoas — **decisão humana, uma a uma**, nunca por script.

---

# PARTE 1 — O DEFAULT DO `membro`

## 1.1 · A causa

`permissions.ts:101–102`:

```ts
} else if (role === "membro") {
  out[s.id] = s.modulo === "Config" ? { ...NONE } : { ...EDIT };
}
```

E `EDIT` é `{ver: true, criar: true, editar: true, excluir: false}`.

**Um `membro` recebe ver, criar e editar em todas as 29 telas fora de Config** —
DRE, Fluxo de Caixa, Resumo Executivo, Dashboard, Consolidado, Projeção,
Despesas, Contas a Pagar, Contas a Receber, Clientes, Unidades, Caixa,
Fornecedores, Permuta, Orçamentos, Previsão. Todas.

**Não é bug: é o default.** E o resultado da empresa inteira está entre as telas
que ele abre.

## 1.2 · A correção

**O `membro` passa a ter um conjunto declarado de telas**, com a ação de cada
uma, conforme o BAJ-2 — no mesmo formato de `CONTADOR_VE`, que já existe e
funciona.

**Nenhuma tela entra por ser "fora de Config".** O critério deixa de ser negativo
— *tudo o que não é configuração* — e passa a ser positivo: *estas telas, com
estas ações*.

**Por quê:** o critério negativo faz **toda tela nova nascer liberada** para
todo membro. Com o Emissor de NFS-e entrando, `notas` nasceria com criar e
editar — ver 1.5.

## 1.3 · `EDIT` é mais do que parece

`EDIT` dá **criar e editar**, não só ver. Quem for concedido a um papel de
leitura precisa de `VIEW`, que já existe no módulo.

**Revisar as quatro constantes** — `NONE`, `VIEW`, `EDIT`, `FULL` — e usar a
menor que atenda. Não criar constante nova sem necessidade.

## 1.4 · Entrada controlada

**Isto tira acesso de gente que trabalha hoje.** Entra atrás de **uma chave por
tenant**, desligada, preservando o comportamento atual.

Antes de ligar, **a prévia**: por membro, a lista de telas que ele perde, com a
ação. É essa lista que o cliente aprova — não o conceito.

**A chave é só para a Parte 1.** As Partes 3, 4 e 5 fecham brechas e vão sem
chave.

## 1.5 · Tela nova nasce negada

Com o critério positivo da 1.2, tela nova fica fora do conjunto do `membro` até
alguém a incluir. **É o comportamento correto**, e contraria o que o comentário
da sidebar afirma hoje (`sidebar.tsx:17`) — *"módulo novo nasceria negado para
todos os papéis já configurados"* vale para contador e engenheiro, **nunca valeu
para membro**.

**Corrigir o comentário junto**, senão a próxima pessoa confia nele.

---

# PARTE 2 — SALVAR SÓ O QUE DIVERGE DO DEFAULT

## 2.1 · O defeito, e por que ele anula a Parte 1

`MemberMatrix` monta o estado com **uma chave por tela de `SCREENS`**
(`access-matrix.tsx:102–106`) e envia `perms` inteiro. O `set` é substituição
total da coluna.

**Salvar uma vez grava as 38 chaves com booleanos explícitos** — inclusive as
telas que ninguém tocou. A partir daí:

- **o papel deixa de governar qualquer tela existente**, porque todo default
  fica sombreado por um override;
- **trocar o papel da pessoa não muda nada**;
- **a Parte 1 não alcança essa pessoa**, porque ela não lê mais o default.

É a explicação mais provável para *"não importa a classificação"* no relato.

## 2.2 · A correção

O "Salvar" passa a enviar **apenas as telas cujo valor difere do default do
papel**. Tela igual ao default sai do objeto — e volta a ser governada pelo
papel.

**Consequência desejada:** trocar o papel volta a ter efeito em tudo o que não
foi explicitamente customizado.

## 2.3 · O que fazer com os overrides já gravados

**Nada, automaticamente.** A regra global vale: override é configuração que
alguém fez, e apagar em massa é alterar dado.

**A tela passa a mostrar**, por membro, quantas das 38 chaves são iguais ao
default — e oferece **"voltar ao padrão do papel"**, ação explícita, por membro,
com confirmação e auditoria.

**Nunca em lote, nunca por migração.**

## 2.4 · Override de tela removida de `SCREENS`

Hoje a chave órfã é **apagada em silêncio** no próximo salvamento, porque o
estado é reconstruído a partir de `SCREENS`.

Com a 2.2 o problema some — o objeto passa a ser um diff, não uma substituição.
**Confirmar que chave órfã é preservada** e reportar as encontradas na consulta 3
do BAJ-1.

---

# PARTE 3 — O CLAMP DE PAPEL

**É a Parte 0 do Prompt AI, e o mecanismo mora aqui.** A coleta confirmou as duas
brechas que ela fecha.

**3.1 · A lista de telas restritas a `owner` e `admin`:** `usuarios` e `acessos`.
Aplicada como **último passo** de `effectivePermissions`, depois do merge dos
overrides.

**3.2 · A porta lateral está confirmada.** `setMemberPermissions` **não compara
`userId` com `ctx.userId`** — diferente de `removeMember`, que tem a guarda.
Quem tem `acessos:editar` edita a própria linha, marca `usuarios:editar`, e daí
troca papéis e se promove a `owner`.

**Duas correções, não uma:** o clamp, e a guarda de auto-edição na action.

**3.3 · O clamp alcança o `owner`, e isso importa.** "Owner sempre total" é regra
do componente React (`access-matrix.tsx:110`), não do módulo:

```
can(effectivePermissions("owner", {dre: {…tudo false}}), "dre", "ver")  →  false
```

**Um override restritivo gravado sobre um owner vale**, e a tela não deixa
corrigir, porque o formulário do owner está desabilitado. O caso provável é um
admin com overrides promovido a owner.

**A correção:** `owner` e `admin` recebem `FULL` **depois** do merge — não antes.
O que o componente promete passa a ser verdade no módulo.

**3.4 · O que a tela mostra.** As duas telas restritas continuam na matriz,
desabilitadas, com o motivo escrito. **Não escondê-las** — quem administra
acessos precisa saber que existem e por que não são configuráveis.

---

# PARTE 4 — VALIDAÇÃO NO SERVIDOR

`setMemberPermissions` grava o objeto do cliente **cru**. Quatro validações
entram:

**4.1 · Chaves fora de `SCREENS` são recusadas**, não gravadas e ignoradas
depois.

**4.2 · Valores não booleanos são recusados.**

**4.3 · "Ver é pré-requisito" passa a valer no servidor.** Hoje a regra existe só
na interface (`access-matrix.tsx:133–137`). Um payload com
`{ver: false, excluir: true}` é gravado como está, e `can(…, "excluir")` devolve
`true` **com `ver` negado** — a tela nega a visualização e a action de exclusão
autoriza.

**4.4 · A action deixa de falhar em silêncio.** Hoje é `return` sem erro, e a
tela exibe **"Salvo."** de qualquer jeito (`access-matrix.tsx:120–121`). Passa a
`{ ok, error }`, e a tela só confirma quando gravou.

---

# PARTE 5 — AS 61 CAIXAS QUE NINGUÉM LÊ

**5.1** Das 152 caixas — 38 telas × 4 ações —, **91 são consultadas por algum
código e 61 não são por nenhum**. Marcar ou desmarcar essas 61 não muda
comportamento nenhum.

As 21 mais evidentes são as ações de escrita das sete telas de leitura: não
existe "excluir uma DRE".

**5.2 · A matriz passa a desenhar só as ações que a tela tem.** Célula sem ação
correspondente vira traço, não caixa.

**5.3 · A fonte é declarativa**, não inferida: cada tela em `SCREENS` declara
quais ações possui. **Não derivar por varredura de código** — a lista precisa ser
legível e revisável.

**5.4 · Duas assimetrias para conferir com quem conhece o fluxo**, antes de
declarar: `budget:criar` não é lido, mas `forecast:criar` é; e `estoque:editar`
não é lido, embora `criar` e `excluir` sejam. **Pode ser defeito, não desenho.**

**5.5 · Override já gravado para ação inexistente permanece**, inerte. Não
apagar.

---

# PARTE 6 — AS TELAS FORA DA MATRIZ

**6.1** `/acerto` e `/diagnostico/*` **não estão em `SCREENS`**, então não
aparecem na matriz e **não passam pelo enforcement central**. Quem souber a URL
chega na página; barra só a checagem que cada uma faz por conta própria.

É o **BM-1 do Prompt M**, agora com o motivo escrito no código: *"módulo novo
nasceria negado para todos os papéis já configurados"* (`sidebar.tsx:17`).

**6.2 · Com a Parte 1, o motivo deixa de valer** — o `membro` passa a ter
conjunto declarado, e acrescentar tela à lista é explícito de qualquer forma.

**As três ganham id próprio em `SCREENS`**, e entram no conjunto do `membro`
conforme o BAJ-2.

**6.3 · `/versao` está em `SCREENS` e não tem item no menu.** A tela mais
perigosa do sistema — importação com apagar-e-inserir — aparece na matriz sem
link. **Registrar; o destino dela é do prompt daquela tela.**

**6.4 · `/perfil` continua fora, de propósito.** O comentário já diz por quê.

---

# PARTE 7 — AUDITORIA

**7.1 · O log grava a matriz nova crua** no `meta`, sem envelope — 38 chaves.
Para saber o que mudou é preciso comparar duas entradas consecutivas.

**Passa a `{ changes: diffAudit(antes, depois) }`**, o padrão que `/empresa` já
usa. A action **não lê o estado anterior** hoje; passa a ler.

**7.2 · O log é gravado depois do update, sem transação.** Falha no `logAudit`
deixa a permissão gravada sem registro. **Os dois entram na mesma transação.**

**7.3 · "Voltar ao padrão do papel" (2.3) grava log próprio**, com a matriz que
foi descartada.

---

# PARTE 8 — ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.**

**8.1 · Ações**

- **Quem vê o resultado da empresa** — a lista de quem alcança DRE, Fluxo de
  Caixa, Resumo e Dashboard, com o papel de cada um. **É a pergunta que originou
  este prompt.**
- **Acesso além do papel** — quem tem override que amplia o default, tela a
  tela.
- **Matrizes travadas no override** — quem tem as 38 chaves gravadas e, por
  isso, não é mais governado pelo papel.
- **Telas sem ninguém** — telas que nenhum membro ativo alcança.

**8.2 · Nunca**

- **Nunca conceder, revogar ou sugerir permissão.** Concessão de acesso é ato
  humano — mesma regra do item 8.2 do **Prompt AI**. Esta tela fica **fora da
  Etapa 3 do Prompt E, permanentemente**.
- **Nunca afirmar que os acessos estão corretos.**

**8.3 · Isolamento.** Só alcança quem tem `acessos:ver`, que pelo clamp da
Parte 3 é `owner` ou `admin`.

---

# 9. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Permissão por projeto — "vê só a OBRA 28" | **não existe hoje**; decisão de produto, prompt próprio |
| Papel novo entre membro e contador | **BAJ-3** |
| Piso de papel, do lado da tela de Usuários | **Prompt AI**, Parte 0 |
| Telas que não verificam permissão | **Prompt M**, seção 2 |
| Destino de `/versao` | prompt daquela tela |
| Unificar as quatro listas de módulos | ver 10.2 |
| Escrita assistida | **fora, permanentemente** — 8.2 |

---

# 10. PRESERVAÇÃO DE DADOS E REGISTROS

**10.1** Nenhum `membership.permissions` é apagado, reescrito ou migrado.
Nenhuma pessoa muda de papel. Nenhuma migração sobre `membership`.

**10.2 · Registro, não correção:** há **quatro listas de módulos** no
repositório, nenhuma derivada da outra — o tipo `Modulo`, a ordem da matriz, as
nove seções da sidebar e o mapa de cores. Módulo novo exige editar as quatro.
**Assunto do Prompt C.**

---

# 11. NÃO REGRESSÃO

**11.1 · A condição de aceite mais importante: nenhuma mudança deste prompt pode
permitir o que hoje é negado.** Toda alteração nega ou é neutra.

**Reportar, antes e depois, a matriz efetiva de cada membro de cada tenant, tela
por tela e ação por ação.** Qualquer célula que vá de `false` para `true` é
falha, sem exceção.

**11.2** Com a chave da Parte 1 desligada, **todo mundo enxerga exatamente o que
enxerga hoje**.

**11.3** `can()` e `screenIdOfPath` não mudam.

**11.4** O teste de regressão de `permissions.test.ts` continua passando, ou a
mudança de resultado está declarada e justificada linha a linha.

---

# 12. TESTES

**O default**

1. `membro` sem override **não alcança** DRE, Fluxo de Caixa, Resumo, Dashboard,
   Consolidado e Projeção — salvo decisão contrária do BAJ-2.
2. `membro` alcança exatamente as telas do conjunto declarado, com as ações
   declaradas.
3. Tela nova em `SCREENS` **nasce negada** para `membro`.
4. `owner`, `admin`, `contador` e `engenheiro` não mudam.
5. Chave desligada: todos enxergam o que enxergavam.

**O salvamento**

6. Salvar a matriz sem alterar nada **não grava override nenhum**.
7. Alterar uma tela grava **uma** chave, não 38.
8. Depois de salvar, **trocar o papel volta a ter efeito** nas telas não
   customizadas.
9. Chave órfã de tela removida de `SCREENS` **não é apagada**.
10. "Voltar ao padrão do papel" é por membro, com confirmação, e gera log.

**O clamp**

11. `membro` com override de `usuarios:ver` **não abre** `/usuarios`.
12. O mesmo para `/acessos`.
13. As actions das duas telas recusam esses papéis, chamadas direto.
14. **`owner` com override restritivo gravado continua com acesso total** — o
    clamp roda depois do merge.
15. Quem tem `acessos:editar` **não edita a própria linha**.

**A validação**

16. Chave fora de `SCREENS` é recusada.
17. `{ver: false, excluir: true}` é recusado.
18. Sem permissão, a action devolve erro e a tela **não** exibe "Salvo.".

**A matriz**

19. Tela de leitura não desenha caixa de criar, editar e excluir.
20. As duas telas restritas aparecem desabilitadas, com o motivo.

**Auditoria**

21. O log grava `{changes}` com valor anterior e novo.
22. Falha no log desfaz o update — mesma transação.

**Assistente**

23. Não concede, não revoga, não sugere.
24. Só é alcançável por `owner` e `admin`.
25. Não grava nada.

**Gerais**

26. **Antes e depois:** matriz efetiva de cada membro, célula a célula.
    **Nenhuma célula vai de `false` para `true`.**
27. **Antes e depois:** conteúdo de `membership.permissions`, linha a linha.
    Nenhuma diferença causada pela implementação.

---

# 13. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado das três consultas do **BAJ-1**, e **qual dos dois caminhos causou
   o relato** — o default, o salvamento total, ou os dois.
2. Decisão de **BAJ-2** — o conjunto de telas do `membro`, tela a tela, com a
   ação de cada.
3. Decisão de **BAJ-3** — papel novo ou ajuste do `membro`.
4. A prévia da 1.4: por membro, o que ele perde.
5. Como o "Salvar" passou a gravar diff, com o trecho.
6. Quantos membros estavam com as 38 chaves, e o que foi feito — **sem apagar
   nenhuma**.
7. Como o clamp foi implementado, e a confirmação de que roda **depois** do
   merge, inclusive para `owner`.
8. A guarda de auto-edição em `setMemberPermissions`.
9. As quatro validações da Parte 4.
10. A lista declarativa de ações por tela, e o que foi decidido nas duas
    assimetrias da 5.4.
11. O que aconteceu com `/acerto` e `/diagnostico/*`.
12. **A comparação antes/depois da matriz efetiva, célula a célula**, com a
    confirmação de que nenhuma célula foi ampliada.
13. Confirmação de que nenhum override foi apagado.
14. O comentário corrigido em `sidebar.tsx:17`.
15. Funcionamento do assistente, e confirmação de que não concede nem revoga.
16. Limitações encontradas.


<a id="prompt-ai"></a>


========================================================================


### ▸ 2 de 42 · PROMPT AI — Usuários & Acessos

**Bloco 0 · Segurança e exposição** · Bloqueios: BAI-1 · BAI-3 · BAI-2

**Parte 4 primeiro** — uma linha, fecha vazamento entre tenants. Depois Partes 0 a 3.

========================================================================


# PROMPT AI — USUÁRIOS & ACESSOS

Growth Construction · `/usuarios`.

Baseado na coleta `docs/TELA-USUARIOS.md`. **O Prompt M é dono da política de
acesso** — a matriz `can()`, as telas fora dela, o dado sensível. Este prompt é
dono da **administração de conta**: quem existe, com que papel, com que senha, e
como se prova quem agiu.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

A rota da Gestão de Acessos é **`/acessos`** — "Gestão de Acessos" é o rótulo.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Nenhum usuário é
apagado, renomeado ou tem papel alterado por esta tarefa. Nenhum vínculo é
removido. Nenhum hash de senha é regravado.

**2 · `audit_log` é append-only e continua sendo.** Nenhuma linha é alterada ou
removida, em nenhuma circunstância.

**3 · Nada vindo de mockup entra no código.** Nomes, e-mails e papéis dos
mockups são ilustração.

**4 · O assistente não cria, não altera papel, não redefine senha e não grava
nada.**

---

# O CONTEXTO QUE DEFINE ESTE PROMPT

**Não há domínio de e-mail.** Convite por link, definição de senha pela própria
pessoa e "esqueci a senha" **ficam fora** — não por decisão de escopo, mas por
falta de infraestrutura.

Isso deixa em pé o achado mais grave da tela: **o único caminho para alguém ter
senha é um owner ou admin digitá-la.** Qualquer admin pode redefinir a senha de
qualquer um, entrar como essa pessoa e agir — e o `logAudit` registra o nome da
vítima.

**Num sistema que audita cada despesa e que vai emitir nota fiscal, a assinatura
precisa ser sustentável.** A Parte 1 é a mitigação possível sem e-mail; a Parte 2
é a que de fato resolve.

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

**1 · A proteção do último owner existe nas duas actions**, no servidor —
`changeRole` e `removeMember`. O que falta é transação, não a regra.

**2 · As cinco actions verificam permissão no servidor**, com a chave
`"usuarios"`, além do enforcement central.

**3 · A senha nunca entra no log**, em nenhuma forma. `resetMemberPassword` chama
`logAudit` **sem `meta`**. Manter assim.

**4 · O hash usa salt por senha e `timingSafeEqual`**, com guarda de tamanho
antes.

**5 · Remover não apaga o usuário global** — só o vínculo. O docstring explica
por quê: a conta pode pertencer a outros tenants.

**6 · A combinação com `/acessos` está bem desenhada:** `role` produz a base, o
jsonb aplica patch raso por tela, `null` significa "só os defaults". **Não
mudar o merge.**

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **0** — piso de papel | **BAI-3** | **primeira de todas** |
| **1** — senha provisória e sessão | nada | mitigação do RC-U1 |
| **2** — MFA exigido | **BAI-1** | **é o que resolve o RC-U1** |
| **3** — as três lacunas de `changeRole` | nada | |
| **4** — `updateMemberName` sem tenant | nada | **correção de uma linha, faça primeiro** |
| **5** — inativar | **BAI-2** | |
| **6** — auditoria com valor anterior | nada | |
| **7** — o que a tela mostra | Partes 1 e 5 | |
| **8** — assistente de IA | Partes 1 a 7 | |

**A Parte 4 é uma linha e fecha um vazamento entre tenants. Vai primeiro.**

---

# BLOQUEIOS

## BAI-1 · Ligar o MFA para todos?

**É a decisão mais importante deste prompt.** Sem e-mail, o MFA é o que devolve
sustentação à autoria: **o admin que redefine a senha de alguém continua sem
conseguir entrar como essa pessoa**, porque não tem o segundo fator.

Hoje `mfaEnforced()` é `process.env.MFA_ENFORCED === "true"`, e o docstring
chama o estado atual de **"STANDBY (fase de testes)"**.

**Três consequências de ligar, que precisam ser aceitas antes:**

1. **Todo usuário é redirecionado para o enrollment** no próximo acesso
   (`layout.tsx:88`). Sete pessoas, sete cadastros de autenticador.
2. **Quem perder o autenticador fica fora** — não existe caminho para um admin
   destravar. Ver 2.3.
3. A exigência é **da instância inteira**, por variável de ambiente. Não dá para
   exigir de um tenant só, nem só dos owners.

**Responder:** liga agora, liga junto com o Emissor, ou fica em standby?

**Recomendação: ligar antes do Prompt AG.** A partir do momento em que o sistema
emite documento fiscal, "quem emitiu" precisa significar alguma coisa.

## BAI-3 · Quem tem override para esta tela hoje?

A Parte 0 passa a negar `/usuarios` a qualquer papel que não seja `owner` ou
`admin`, **mesmo com override concedido**. Antes de ligar, é preciso saber quem
perde acesso — e se alguém depende dele para trabalhar.

**Entregar antes de qualquer código, somente leitura:**

```sql
-- Quem tem override em telas que passarão a ser restritas por papel.
SELECT t.name AS empresa, u.name, u.email, m.role,
       m.permissions -> 'usuarios' AS override_usuarios,
       m.permissions -> 'acessos'  AS override_acessos
  FROM membership m
  JOIN "user" u   ON u.id = m.user_id
  JOIN tenant t   ON t.id = m.tenant_id
 WHERE m.role NOT IN ('owner','admin')
   AND (m.permissions ? 'usuarios' OR m.permissions ? 'acessos')
 ORDER BY t.name, u.name;
```

**Se a consulta devolver linhas**, avisar essas pessoas antes — elas vão perder
o acesso no próximo login, e o override continuará gravado sem efeito.

**Nenhum override é apagado por esta tarefa.** Ele fica no banco, inerte, e a
tela `/acessos` passa a exibi-lo como bloqueado por papel — ver 0.5.

## BAI-2 · O que fazer com quem sai da empresa

Hoje só existe **Remover**, que apaga a linha de `membership` — e com ela **os
overrides de permissão** da tela `/acessos`. Readmitir devolve só os defaults do
papel.

E remover não encerra a sessão aberta: o cookie continua válido, e o que barra é
a ausência de vínculo — com a mensagem *"Banco vazio… rode `node seed.mjs`"*.

**Escolher uma:**

1. **Inativar** — coluna aditiva em `membership`, o vínculo permanece, os
   overrides permanecem, o acesso é negado e o histórico continua resolvendo o
   nome. Reversível.
2. **Continuar removendo**, com aviso de que os overrides se perdem.

**Recomendação: a 1.** É o padrão "exclusão lógica reversível" que Fornecedores
já usa, e o único que preserva o vínculo entre histórico e pessoa.

**Remover permanece**, para o caso de vínculo criado por engano.

---

# PARTE 0 — PISO DE PAPEL: SÓ OWNER E ADMIN

**Ver BAI-3. Esta é a primeira parte a implementar.**

## 0.1 · A exigência

**`/usuarios` é visível e operável apenas por `owner` e `admin`. Nenhum outro
papel a alcança, por nenhum caminho.**

## 0.2 · Por que a matriz atual não garante isso

Hoje a negação vem do **default do papel**: `defaultPermissions` dá `NONE` a
`membro`, `engenheiro` e `contador` em toda tela do módulo `Config`.

**Mas o default não é a última palavra.** `effectivePermissions` aplica os
overrides do membership por cima, tela a tela:

```ts
for (const s of SCREENS) {
  const o = overrides[s.id];
  if (o) base[s.id] = { ...base[s.id], ...o };
}
```

Um override salvo em `/acessos` concede `usuarios:ver` — e, pior, `usuarios:editar`
— a um `membro`. O único freio é quem administra `/acessos`.

**É a diferença entre "não tem acesso por padrão" e "não pode ter acesso".** A
exigência é a segunda.

## 0.3 · A correção

**Uma lista de telas restritas por papel**, aplicada como **último passo** de
`effectivePermissions`, depois do merge dos overrides:

- a tela está na lista **e** o papel não é `owner` nem `admin` → todas as ações
  daquela tela são `false`, qualquer que seja o override.

**Por que no `effectivePermissions` e não na tela:** todo consumidor herda de
graça — o enforcement central do layout, as cinco actions, a montagem do menu e
qualquer código futuro. Colocar a trava na página deixaria as actions
desprotegidas.

**Por que depois do merge, e não antes:** aplicar antes faria o override
sobrescrever a trava, que é exatamente o que se quer impedir. **A ordem é a
correção.**

## 0.4 · A lista não tem uma tela, tem duas

**`/acessos` entra junto, obrigatoriamente.**

Sem isso a trava tem porta lateral: quem tiver `acessos:editar` por override
concede a si mesmo `usuarios:editar` — e, pela Parte 3.2, hoje ainda poderia se
promover a `owner`.

**Travar `/usuarios` sem travar `/acessos` é fechar a porta e deixar a chave na
fechadura.**

| Tela | Restrita a owner/admin |
|---|---|
| `usuarios` | **sim** |
| `acessos` | **sim** |

**Qualquer outra tela entra na lista só por decisão explícita.** Esta não é a
lista de "telas sensíveis" — é a lista de **telas que concedem acesso**.

## 0.5 · O que `/acessos` passa a mostrar

As duas telas continuam aparecendo na matriz de permissões, **marcadas como
restritas por papel**, com as caixas desabilitadas e o motivo escrito.

**Não escondê-las:** quem administra acessos precisa saber que elas existem e
por que não são configuráveis.

**Override já gravado para elas permanece no banco**, inerte, e a tela o exibe
como sem efeito. Ver BAI-3.

## 0.6 · O que não muda

- **Nenhum override é apagado.** A regra global vale.
- **`owner` e `admin` continuam como estão** — inclusive os overrides deles, que
  seguem funcionando nas demais telas.
- **A matriz, o merge e `defaultPermissions` continuam iguais** para todas as
  outras telas. O que entra é um clamp final, e só para duas.

## 0.7 · Isto altera função compartilhada

`effectivePermissions` é usada pelo layout, pelas actions e por `/acessos`.
Alterá-la atinge o sistema inteiro.

**A mudança é aditiva e restritiva:** nada que hoje é negado passa a ser
permitido. **Reportar, antes e depois, a matriz efetiva de cada membro de cada
tenant** — a única diferença aceitável é a negação das duas telas para papéis
fora de owner/admin.

**O Prompt M é o dono da política de acesso.** Esta parte modifica o mecanismo
dele: registrar a lista lá, para que a próxima revisão a encontre onde procura.

---

# PARTE 1 — SENHA PROVISÓRIA E SESSÃO

**1.1 · Toda senha definida por outra pessoa é provisória.** Coluna aditiva —
`user.must_change_password`, booleana, default `false`.

Marcada por `invite` quando há senha inicial, e por `resetMemberPassword`
**sempre**. Limpa por `changePassword`, que é a troca feita pelo próprio usuário.

**1.2 · Com a marca ligada, o usuário é levado a trocar a senha antes de qualquer
outra coisa**, no mesmo ponto onde o enrollment de MFA já intercepta
(`layout.tsx:88`).

**Isso não impede o admin de assumir a conta** — mas deixa rastro: a vítima
descobre no próximo acesso que a senha dela foi trocada.

**1.3 · Redefinir senha encerra as sessões daquele usuário.** Hoje o JWT
continua válido — *"se o objetivo for cortar acesso imediato, redefinir senha não
basta"*.

Coluna aditiva `user.password_changed_at`. O `jwt` do Auth.js passa a carregar o
instante da emissão, e `getActiveContext` recusa token emitido antes da última
troca de senha.

**Vale também para inativar e remover** — ver Parte 5.

**1.4 · A senha curta deixa de virar usuário sem senha.** Hoje:

```ts
const passwordHash = password.length >= 8 ? hashPassword(password) : undefined;
```

Cinco caracteres criam o usuário **sem senha nenhuma, sem erro**. E `invite`
devolve `void`, então a tela não teria como avisar.

**Corrigir:** `invite` passa a devolver `{ ok, error }`, e senha inicial curta é
**recusada** — não ignorada.

**1.5 · A política de senha permanece "8 ou mais".** Não acrescentar exigência de
símbolo, maiúscula ou expiração: são regras que empurram a senha para o papel
colado no monitor. **O ganho real está no MFA da Parte 2.**

---

# PARTE 2 — MFA

**Ver BAI-1.**

**2.1 · O MFA voluntário hoje é inerte.** No login:

```ts
if (mfaEnforced() && u.mfaEnabled) { … }
```

Com a env desligada, **quem ativou o MFA não tem o código exigido** — e a tela
continua exibindo o selo "MFA" nesse membro, anunciando proteção que o login não
cobra.

**Corrigir, independentemente do BAI-1:** a condição passa a ser `u.mfaEnabled`.
Quem ativou, usa. A env decide quem é **obrigado**, não quem é **cobrado**.

**2.2 · O selo na tela passa a refletir o que o login faz.**

**2.3 · Destravar quem perdeu o autenticador.** Hoje não existe caminho:
`disableMfa` age só sobre o próprio usuário.

**Criar `resetMemberMfa`**, com permissão própria — não a mesma de editar
usuário. Ela **zera o segredo e obriga novo enrollment**; nunca desliga o MFA de
alguém deixando a conta sem segundo fator.

**Grava `logAudit`**, e a pessoa é notificada no próximo acesso.

**2.4 · Ativar e desligar MFA passam a gerar log.** Hoje `confirmMfa` e
`disableMfa` não geram nenhum — e desligar é **redução de segurança**.

**2.5 · O segredo TOTP está em texto claro** em `user.mfa_secret`. Quem lê o
banco reproduz o segundo fator de qualquer um.

**Registrar como decisão pendente**, com a cifragem de coluna. **Não implementar
nesta tarefa** sem decidir onde a chave vive — e a decisão do token do Emissor
(BAG-3) é a mesma família de problema.

---

# PARTE 3 — AS TRÊS LACUNAS DE `changeRole`

**3.1 · Promover a `owner` exige confirmação explícita.** Hoje o `<select>`
grava no `onChange`: escolher já promove. "Remover" tem confirmação; promover a
owner, não.

A confirmação é só para **`owner`** — os demais papéis continuam diretos, para
não transformar a tela em sequência de diálogos.

**3.2 · Ninguém se promove.** `changeRole` não valida o papel de destino nem a
auto-alteração. Quem tiver `usuarios:editar` — que um override de `/acessos`
pode conceder a um `membro` — **pode se promover a `owner`**.

**Corrigir:** a action recusa alterar o próprio papel, como `removeMember` já
faz. Quem precisa de promoção pede a outro owner.

**3.3 · A guarda do último owner entra em transação.** `countOwners` e o
`update` são statements soltos: dois rebaixamentos simultâneos passam ambos pela
contagem e deixam o tenant sem dono.

`SELECT ... FOR UPDATE` sobre as linhas de membership do tenant, no padrão de
`actions/restituicoes.ts`. Vale para `changeRole` e `removeMember`.

**3.4 · Trocar o papel decide o que fazer com os overrides.** Hoje `changeRole`
grava só `{ role }` e deixa o jsonb intacto — **um admin rebaixado a contador
carrega os overrides antigos**, e o override vence o default.

**A tela declara o que vai acontecer** e o usuário escolhe: manter os overrides
ou voltar aos defaults do papel novo. **Nunca limpar em silêncio** — override é
dado que alguém configurou.

**3.5 · Uma lista de papéis, não duas.** O formulário de criação oferece quatro,
sem `owner`; o select da linha oferece cinco. As duas passam a sair da mesma
constante.

---

# PARTE 4 — `updateMemberName` NÃO VERIFICA O TENANT

`users.ts:189` — o `where` é `eq(schema.users.id, userId)`, **sem nenhum filtro
de membership**.

**Quem tiver `usuarios:editar` e souber o id de um usuário de outro tenant pode
renomeá-lo.** É a única das dez operações sem filtro e sem compensação.

`resetMemberPassword` faz a mesma coisa, **mas só depois de confirmar o vínculo**
— a correção é copiar aquela checagem, que está no mesmo arquivo.

**É uma linha, e fecha um vazamento entre tenants. Vai primeiro.**

---

# PARTE 5 — INATIVAR

**Ver BAI-2.** Se for a opção 1:

**5.1** Coluna aditiva em `membership` — anulável, com `IF NOT EXISTS` e `down`.
**Nenhum vínculo existente é marcado.**

**5.2 · Inativo não acessa.** `getActiveContext` trata o vínculo inativo como
ausente — e a mensagem diz **"acesso encerrado"**, não *"Banco vazio… rode
`node seed.mjs`"*.

**5.3 · Inativar encerra as sessões**, pelo mecanismo da 1.3.

**5.4 · Os overrides permanecem.** Reativar devolve a pessoa como estava.

**5.5 · Inativar e reativar gravam `logAudit`.**

**5.6 · Remover permanece**, com aviso de que os overrides se perdem.

---

# PARTE 6 — AUDITORIA COM VALOR ANTERIOR

**6.1** Nenhuma das cinco actions grava o anterior. O caso mais irônico é
`changeRole`: ele **já leu** o papel anterior para a guarda do último owner, e
descarta o dado. No log fica "virou X", sem "era Y".

**Corrigir com `diffAudit`**, que `/empresa` já usa. O padrão existe.

**6.2 · Três eventos de segurança passam a gerar log:** troca da própria senha,
ativação e desligamento de MFA. **Sem o conteúdo da senha nem o segredo** — só o
fato, o autor e o instante.

**6.3 · Toda redefinição de senha feita por terceiro fica marcada como tal no
log** — `action` própria, distinta da troca feita pelo dono. É o que permite,
depois, saber que um lançamento aconteceu logo após um reset administrativo.

**6.4 · `audit_log` não guarda nome nem e-mail desnormalizados.** Se o `user`
for apagado direto no banco, `user_id` vira `NULL` e o log perde a autoria.

`daily_closing` já resolve isso guardando `responsavel_nome`. **Registrar como
decisão do módulo de auditoria** — não implementar aqui.

---

# PARTE 7 — O QUE A TELA MOSTRA

**7.1 · "Ativo" deixa de significar "tem hash".** Hoje o selo é derivado de
`passwordHash IS NULL`. Passa a haver três situações visíveis: **ativo**, **sem
senha definida** e **inativo**.

**7.2 · Senha provisória aparece na linha** — "senha definida pelo
administrador, ainda não trocada".

**7.3 · O selo MFA reflete o que o login cobra** — Parte 2.2.

**7.4 · Último acesso**, se houver de onde tirar. Se não houver, **não inventar
coluna nesta tarefa**: registrar como pendência.

**7.5 · O texto sobre acesso pendente passa a dizer o que acontece de fato.**

**7.6 · A tela declara que não há convite por e-mail** e que a senha precisa ser
comunicada por fora — enquanto for verdade. **Interface que não declara a própria
limitação é como o usuário descobre pelo susto.**

---

# PARTE 8 — ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.**

**8.1 · Ações**

- **Contas sem segundo fator** — quem ainda não ativou, e o que isso significa.
- **Senhas provisórias não trocadas** — quem recebeu senha do administrador e
  ainda não definiu a própria.
- **Acessos sem uso** — vínculos ativos sem atividade no log de auditoria em
  período relevante.
- **Papéis e overrides divergentes** — quem tem override que contraria o papel,
  o caso do 3.4.

**8.2 · Nunca**

- **Nunca criar usuário, alterar papel, redefinir senha, inativar ou remover** —
  por nenhum caminho, nem com confirmação. **Esta tela fica fora da Etapa 3 do
  Prompt E, permanentemente.** Concessão de acesso é ato humano.
- **Nunca sugerir senha.**
- **Nunca exibir hash, segredo TOTP ou qualquer credencial.**
- **Nunca afirmar que os acessos estão corretos.**

**8.3 · O que não vai ao modelo:** hash de senha, segredo TOTP, tokens e
variáveis de ambiente. Nome, e-mail e papel são dados de trabalho e podem ir.

---

# 9. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Convite por e-mail, link de definição, "esqueci a senha" | **bloqueado por falta de domínio** — retomar quando houver |
| A matriz de permissões e as telas fora dela | **Prompt M** |
| Overrides granulares por tela | `/acessos` |
| Cifragem do segredo TOTP | ver 2.5 |
| Nome desnormalizado no log | ver 6.4 |
| Escrita assistida | **fora, permanentemente** — 8.2 |
| `getAllTenantsOverview` sem projeção | revisão da tela de super-admin |

---

# 10. PRESERVAÇÃO DE DADOS

**10.1** Nenhum usuário é criado, renomeado, removido ou tem papel alterado.
Nenhum hash é regravado. Nenhum override é limpo.

**10.2** Todas as migrações são aditivas — `must_change_password`,
`password_changed_at`, a coluna de inativação —, anuláveis, com `IF NOT EXISTS` e
`down`. **Nenhum registro existente é marcado.**

**10.3** `audit_log` continua append-only.

---

# 11. NÃO REGRESSÃO

**11.1** Ninguém perde acesso pela implementação. **Nenhuma sessão é encerrada
pela migração** — só pelos eventos da 1.3.

**11.2** A proteção do último owner continua funcionando, e passa a ser
resistente a concorrência.

**11.3** A combinação `role` + overrides de `/acessos` não muda. `effectivePermissions`
não é alterada.

**11.4** `/acessos` continua funcionando igual.

---

# 12. TESTES

**O piso de papel**

0a. `membro`, `engenheiro` e `contador` **não abrem `/usuarios`** — nem pelo
    menu, nem por URL direta.
0b. **Com override concedendo `usuarios:ver`, continuam sem abrir.**
0c. As cinco actions da tela recusam esses papéis, chamadas direto, **mesmo com
    override de `editar` ou `excluir`**.
0d. O mesmo, item a item, para `/acessos`.
0e. Quem tem `acessos:editar` por override não consegue conceder `usuarios` a
    ninguém — a porta lateral está fechada.
0f. `owner` e `admin` continuam com acesso integral às duas telas.
0g. `/acessos` exibe as duas telas marcadas como restritas, desabilitadas, com o
    motivo escrito.
0h. Override já gravado para elas **permanece no banco** e aparece como sem
    efeito.
0i. **Antes e depois:** matriz efetiva de cada membro, tela a tela. A única
    diferença é a negação das duas telas para papéis fora de owner/admin.
0j. Nenhuma outra tela mudou de comportamento por causa do clamp.

**Senha e sessão**

1. Senha inicial curta é **recusada com erro visível** — não cria usuário sem
   senha.
2. Senha definida por terceiro marca a conta como provisória.
3. Usuário com senha provisória é levado a trocá-la antes de qualquer tela.
4. Trocar a própria senha limpa a marca.
5. **Redefinir senha encerra as sessões abertas daquele usuário.**
6. A migração não encerra nenhuma sessão.

**MFA**

7. Usuário com MFA ativo tem o código exigido no login, **mesmo com
   `MFA_ENFORCED` desligada**.
8. O selo da tela reflete o que o login cobra.
9. `resetMemberMfa` obriga novo enrollment e **nunca deixa a conta sem segundo
   fator**.
10. Ativar e desligar MFA geram log.

**Papel**

11. Ninguém altera o próprio papel, testado chamando a action direto.
12. Promover a `owner` exige confirmação.
13. Dois rebaixamentos simultâneos dos dois últimos owners: um falha.
14. Trocar papel declara o que acontece com os overrides, e o usuário escolhe.
15. As duas listas de papéis vêm da mesma constante.

**Tenant**

16. `updateMemberName` recusa usuário de outro tenant, chamada direto.
17. As dez operações filtram por tenant.

**Inativar**

18. Inativo não acessa, e a mensagem diz "acesso encerrado".
19. Inativar encerra as sessões.
20. Reativar devolve os overrides intactos.
21. Remover avisa que os overrides se perdem.

**Auditoria**

22. Troca de papel grava "era Y, virou X".
23. Redefinição por terceiro é distinguível da troca pelo dono.
24. **Senha e segredo TOTP não aparecem no log, em nenhuma forma.**

**Assistente**

25. Não cria, não altera, não redefine, não inativa, não remove.
26. Não exibe hash nem segredo.
27. Não grava nada.

**Gerais**

28. **Antes e depois:** conteúdo de `user` e `membership`, linha a linha.
    Nenhuma diferença causada pela implementação.
29. Nenhuma linha de `audit_log` foi alterada ou removida.

---

# 13. RELATÓRIO FINAL OBRIGATÓRIO

0. Resultado de **BAI-3** — quem tinha override para `usuarios` ou `acessos`, e
   quem foi avisado. **Sem apagar nenhum override.**
0a. Como o clamp foi implementado em `effectivePermissions`, com o trecho, e a
   confirmação de que ele roda **depois** do merge dos overrides.
0b. A comparação antes/depois da matriz efetiva de cada membro.
0c. Confirmação de que a lista foi registrada no **Prompt M**.
1. Decisão de **BAI-1** — o MFA foi ligado, e quando.
2. Decisão de **BAI-2** — inativar ou continuar removendo.
3. Como a senha provisória funciona, e onde o usuário é interceptado.
4. Como a invalidação de sessão foi implementada, e quais eventos a disparam.
5. Como `invite` passou a recusar senha curta.
6. Como o MFA voluntário passou a ser cobrado no login.
7. Como `resetMemberMfa` funciona, e qual permissão a governa.
8. As três correções de `changeRole`, com o trecho de cada.
9. Como os overrides são tratados na troca de papel, e o que a tela pergunta.
10. A correção de `updateMemberName`, com o `where` novo.
11. As colunas criadas, com as migrações e o `down` de cada.
12. Confirmação de que nenhum vínculo existente foi marcado.
13. Confirmação de que senha e segredo TOTP não entram no log.
14. Funcionamento do assistente, e confirmação de que não altera acesso.
15. **Registro das duas decisões pendentes:** cifragem do segredo TOTP e nome
    desnormalizado no log.
16. Limitações encontradas.


<a id="prompt-af"></a>


========================================================================


### ▸ 3 de 42 · PROMPT AF — Numeração de Despesas

**Bloco 0 · Segurança e exposição** · Bloqueios: BAF-1 · BAF-2 · BAF-3

Partes 1 e 2 agora; Partes 3 a 6 no Bloco 5.

========================================================================


# PROMPT AF — NUMERAÇÃO DE DESPESAS

Growth Construction · `/numeracao`.

Baseado na coleta `docs/TELA-NUMERACAO.md`. **Este prompt substitui o BR-1 do
Prompt R**, cuja hipótese principal — corrida na reserva — a coleta desmentiu.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** **Nenhum `num_doc`
de despesa existente é alterado, renumerado ou normalizado por esta tarefa** —
nem para eliminar duplicidade, nem para fechar buraco na sequência. Número de
documento emitido é documento emitido. Se alguma correção exigir tocar num
`num_doc` gravado: **PARE**, não execute, e reporte.

**2 · Nada vindo de mockup entra no código.** O prefixo `PED`, o número 358 e a
quantidade de dígitos do mockup são ilustração.

**3 · O assistente não grava nada, em nenhum caminho.**

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

Seção decisiva. **A reserva de número deste sistema está bem feita**, e o risco
desta tarefa é estragá-la tentando consertar o que já funciona.

**1 · A reserva é atômica.**
`UPDATE ... SET next_number = next_number + 1 ... RETURNING`, statement único
(`numbering.ts:46–58`). O incremento é do banco, não lido-e-reescrito pela
aplicação, e o `UPDATE` toma lock de linha implícito.

**Não acrescentar `FOR UPDATE`, não trocar por `SELECT` + `UPDATE`, não
serializar na aplicação.** Dois lançamentos simultâneos já recebem números
distintos, e há teste que dispara 25 reservas concorrentes e confere unicidade e
contiguidade (`numbering.test.ts:21–50`).

**2 · A semente é calculada uma vez**, no primeiro uso, e nunca mais
(`numbering.ts:38`). Semear a cada chamada é que seria defeito.

**3 · Número de despesa excluída não é reciclado.** `deleteDespesa` não toca
`number_sequence`, e está certo: reemitir o número de um documento excluído é
pior que deixar buraco.

**4 · A permissão está em três camadas** — enforcement central do layout, `can`
na página, e `can(..., "editar")` na action, que **lança** antes de gravar
(`numeracao.ts:57–60`). A terceira é a barreira real.

**5 · A auditoria grava `before` e `after` completos**, com os cinco campos
(`numeracao.ts:64`, `:90–96`). É o padrão `diffAudit` do sistema, cumprido.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — o `UNIQUE` | **BAF-1** | a consulta decide se é preventivo ou corretivo |
| **2** — a trava do "próximo número" | nada | **pode ir sozinha, e é a de maior efeito** |
| **3** — número e despesa na mesma transação | nada | |
| **4** — a flag que não faz nada | **BAF-2** | decisão de produto |
| **5** — o que a tela passa a mostrar | Parte 2 | |
| **6** — assistente de IA | Partes 2 e 5 | |

**A Parte 2 é a que fecha o caminho da duplicidade.** Se houver uma só janela,
é ela.

---

# BLOQUEIOS

## BAF-1 · Já existe número repetido em produção?

Decide se a Parte 1 é preventiva ou corretiva. **A migração do `UNIQUE` falha ao
criar se houver duplicata**, e aí o problema já aconteceu.

**Entregar antes de qualquer código, somente leitura:**

```sql
-- 1) Números repetidos, por tenant.
SELECT tenant_id, num_doc, count(*) AS vezes, array_agg(id) AS ids
  FROM despesa
 WHERE num_doc IS NOT NULL AND num_doc <> ''
 GROUP BY tenant_id, num_doc
HAVING count(*) > 1
 ORDER BY 3 DESC;

-- 2) O contador contra a realidade.
SELECT ns.tenant_id, ns.entity, ns.prefix, ns.use_prefix, ns.next_number,
       ns.digits, ns.active,
       (SELECT count(*) FROM despesa d
         WHERE d.tenant_id = ns.tenant_id AND d.num_doc IS NOT NULL) AS despesas_com_numero,
       (SELECT max(regexp_replace(d.num_doc, '\D', '', 'g')::bigint) FROM despesa d
         WHERE d.tenant_id = ns.tenant_id AND d.num_doc ~ '\d') AS maior_sufixo_emitido
  FROM number_sequence ns;

-- 3) Despesas sem número.
SELECT tenant_id, count(*) FROM despesa
 WHERE num_doc IS NULL OR num_doc = '' GROUP BY 1;

-- 4) Buracos na sequência — o efeito do RC-N1.
SELECT tenant_id,
       count(*) AS emitidos,
       max(regexp_replace(num_doc, '\D', '', 'g')::bigint)
       - min(regexp_replace(num_doc, '\D', '', 'g')::bigint) + 1 AS faixa
  FROM despesa
 WHERE num_doc ~ '\d'
 GROUP BY 1;
```

**Se a consulta 1 devolver linhas:** o `UNIQUE` não entra antes de decisão
humana, item a item. **Nenhum `num_doc` é alterado por script** — a regra global
vale aqui sem exceção. As opções são renumerar manualmente pela tela de Despesas,
com auditoria, ou aceitar a duplicidade histórica e criar o índice como
`UNIQUE ... NOT VALID` equivalente — ver 1.3.

**A consulta 4 mede o custo do RC-N1:** a diferença entre `emitidos` e `faixa` é
a quantidade de números consumidos e nunca gravados.

## BAF-2 · O que "Numeração automática ativa" deve fazer

Hoje a flag é gravada, devolvida à tela, auditada — e **nenhum dos 12 caminhos
de lançamento a lê**. Desligar não muda nada.

**Escolher uma:**

1. **A flag passa a valer** — desligada, o número não é reservado e o campo de
   documento vira digitação manual no lançamento. **Isso abre a porta para
   número repetido digitado à mão**, e só faz sentido com o `UNIQUE` da Parte 1
   já em produção.
2. **A flag sai da tela.** Numeração sequencial de documento com efeito contábil
   não é preferência. Menos superfície, e o sistema passa a afirmar só o que faz.

**Recomendação: a 2.** Se a operação precisar lançar despesa com numeração
externa — nota de outro sistema, documento antigo —, isso é campo do lançamento,
não configuração global.

**Não implementar a opção 1 sem o `UNIQUE`.**

## BAF-3 · O contador é do tenant — isso é o desejado?

A chave é `(tenant_id, entity)`, sem `project_id` (`schema.ts:1346`). **Um único
contador por empresa, compartilhado por todos os projetos e versões** — os PEDs
de todos saem intercalados da mesma sequência.

Pode ser exatamente o que a operação quer: PED é numeração da empresa, não da
obra. **Mas ninguém tomou essa decisão explicitamente**, e ela aparece na tela
como fato consumado.

**Confirmar por escrito.** Se a resposta for "por projeto", **não implementar
nesta tarefa**: seria coluna nova na chave única, migração de dado e
redistribuição de numeração histórica. Vira prompt próprio.

---

# PARTE 1 — O `UNIQUE` QUE FALTA

**Ver BAF-1.**

**1.1** Não existe `UNIQUE` em `despesa.num_doc`, em nenhuma combinação —
`indexes: {}`, `uniqueConstraints: {}` no snapshot 0038. **A unicidade depende
inteiramente da sequência, e a sequência é editável pela tela.**

**1.2 · O índice é `(tenant_id, num_doc)`**, não `num_doc` sozinho — a numeração
é por empresa.

**Parcial**, excluindo nulo e vazio: despesa sem número é situação legítima
(consulta 3 do BAF-1), e um índice cheio bloquearia a segunda.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS despesa_tenant_num_doc_uq
  ON despesa (tenant_id, num_doc)
  WHERE num_doc IS NOT NULL AND num_doc <> '';
```

Com o `down` correspondente.

**1.3 · Se houver duplicata histórica**, a migração falha — e **isso é o
comportamento correto**, não um obstáculo a contornar. Não usar `ON CONFLICT`,
não deduplicar por script, não renumerar.

A decisão é humana, com a lista da consulta 1 à vista. Enquanto ela não
acontecer, **a Parte 2 sozinha já impede novas duplicatas** — e é por isso que
ela pode ir antes.

**1.4 · A colisão vira mensagem legível.** Com o índice em produção, uma
tentativa de gravar número repetido devolve erro de banco. A action passa a
tratá-lo e a devolver `{ ok: false, error }` dizendo **qual número** colidiu —
no padrão de `actions/restituicoes.ts`, que trata colisão de índice como caso
esperado, não como exceção.

---

# PARTE 2 — A TELA DEIXA DE SER O CAMINHO DA DUPLICIDADE

**2.1 · A validação de hoje são três clamps de forma** (`numeracao.ts:61–63`):
prefixo em 12 caracteres, dígitos entre 1 e 12, e `nextNumber` com piso 1.
**Nenhuma verificação contra o que já foi emitido.**

Salvar `1` num tenant que já emitiu outros PEDs é aceito, e as próximas
despesas reemitem números usados.

**2.2 · A action passa a recusar `nextNumber` menor ou igual ao maior sufixo já
emitido**, com mensagem dizendo qual é o maior e qual o mínimo aceitável.

A verificação é **no servidor, na mesma action que grava** — o formulário apenas
informa antes.

**2.3 · Diminuir continua sendo possível, mas deixa de ser acidente.** Pode
haver caso legítimo — corrigir um contador que alguém subiu por engano, numa
empresa que ainda não emitiu nada naquela faixa.

**O caminho é explícito:** a tela exige confirmação escrita, declara quantos
números da faixa já estão em uso, e a operação exige a mesma permissão de edição.
Com o `UNIQUE` da Parte 1, a colisão acontece no lançamento seguinte e é barrada
— o aviso é para que ninguém descubra isso pelo erro.

**2.4 · O texto explicativo da tela passa a dizer a verdade.** Hoje afirma
*"nunca duplica nem reutiliza números excluídos"*. As duas metades:

- *não reutiliza excluídos* — **verdadeiro**, `deleteDespesa` não toca a
  sequência;
- *nunca duplica* — **falso**, e o campo que produz a duplicidade está três
  linhas acima do aviso.

O texto novo descreve o que o sistema garante — reserva atômica, sem reciclagem
— e o que depende do usuário — não recuar o contador.

---

# PARTE 3 — O NÚMERO E A DESPESA NA MESMA TRANSAÇÃO

**3.1 · O defeito.** `reserveDespesaNumber` abre **a própria** transação, contra
o pool `db`, e nunca recebe um `tx` de fora.

Em `addDespesa`, o número sai em `despesas.ts:326` e o `insert` acontece em
`:372`, **sem transação nenhuma**. Nos caminhos que estão dentro de transação do
chamador — acerto, restituições, compensação —, a reserva roda em **conexão
separada**: rollback externo não a desfaz.

**Em nenhum dos 12 caminhos o número e a linha da despesa são gravados na mesma
transação.** Toda falha depois da reserva consome um número que nunca aparece em
documento nenhum.

**3.2 · A correção.** `reserveDespesaNumber` passa a aceitar um `tx` opcional e a
usá-lo quando recebido, caindo em transação própria só quando chamada solta.

Os 12 caminhos passam a envolver **reserva e gravação** na mesma transação.
Listar os 12 no relatório final, um a um, com o que foi feito em cada.

**3.3 · Buraco na sequência continua sendo aceitável** — falha real de gravação
deixa lacuna, e isso é normal em numeração sequencial. O que não é aceitável é a
lacuna vir de erro de arquitetura, em toda falha.

**3.4 · Os dois comentários que afirmam o contrário são corrigidos.**
`despesas.ts:323–325` diz *"sempre reservado aqui, no servidor, dentro da
transação"*; `despesa-form.tsx:622–623` repete. **Comentário que descreve uma
garantia inexistente impede a próxima pessoa de investigar** — e foi o que
aconteceu nesta revisão até a coleta.

---

# PARTE 4 — A FLAG QUE NÃO FAZ NADA

**Ver BAF-2.** Implementar a decisão. Se for a opção 2, o checkbox sai da tela e
a coluna `active` é **descontinuada, não removida** — permanece no schema, sem
leitura, com comentário dizendo por quê.

**Nenhuma migração que apague a coluna.**

---

# PARTE 5 — O QUE A TELA PASSA A MOSTRAR

Hoje o usuário edita o contador **sem nenhuma referência do que já foi usado**.

**5.1 · O último número emitido**, com a data e o projeto do lançamento.

**5.2 · Quantas despesas já têm número**, e quantas estão sem.

**5.3 · O próximo número, como hoje** — o preview já existe e funciona.

**5.4 · Quando a sequência ainda não foi criada**, a tela declara isso: o preview
mostra `max + 1` sem gravar nada (`numeracao.ts:42–52`), e o usuário não tem como
saber que está vendo uma estimativa, não uma configuração.

**5.5 · Estado vazio real.** Tenant sem nenhuma despesa numerada mostra estado
próprio, não `0`.

**5.6 · `getDespesaSequence` ganha verificação.** Hoje é Server Action exportada
que **recebe `tenantId` por argumento e não verifica permissão nem tenant**
(`numeracao.ts:20–53`). Não devolve dado financeiro, mas é leitura cruzada de
tenant por chamada direta.

Passa a resolver o tenant do contexto, como as demais, e a exigir
`can(..., "numeracao", "ver")`.

**5.7 · A semente deixa de varrer todas as despesas em memória.**
`maxExistingDespesaNumber` carrega todas as linhas do tenant e aplica regex em
JavaScript (`numbering.ts:5–16`). Vira `SELECT MAX` no banco, com o mesmo
critério de extração.

**Sem alterar o resultado:** o teste que afirma que `EXM-2026-000842` semeia 843
continua passando (`numbering.test.ts:52–78`).

---

# PARTE 6 — ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.**

Esta é tela de configuração, e o assistente aqui tem um papel estreito e
específico: **mostrar o estado real da numeração**, que é o que a tela nunca
mostrou.

**6.1 · Ações**

- **Conferir a numeração** — números repetidos, buracos na sequência, despesas
  sem número, e o contador contra o maior emitido. É a consulta do BAF-1,
  disponível de forma contínua em vez de uma vez só.
- **Explicar o próximo número** — de onde ele veio: semente calculada, contador
  ajustado manualmente, ou sequência em uso normal. Com a data do último ajuste,
  vinda do `logAudit`.
- **Histórico de alterações** — quem mudou o quê e quando, lido de
  `audit_log` com `action = "numeracao.update"`, que já grava `before` e `after`.

**6.2 · Nunca**

- **Nunca propor um valor para o "próximo número".** Sugerir contador é
  sugerir renumeração de documento contábil.
- **Nunca gravar**, por nenhum caminho.
- **Nunca afirmar que a numeração está correta** — ele lista o que encontrou.
  Ausência de achado não é atestado.

**6.3 · Isolamento.** Filtro de tenant explícito em toda consulta. O assistente
desta tela só é acessível a quem tem `numeracao:ver` — hoje, na prática, owner e
admin.

**6.4 · O selo "Somente leitura"** ao lado do título, e o rodapé declarando que
nada é alterado.

---

# 7. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Renumerar despesa existente | **decisão humana**, item a item, pela tela de Despesas |
| Contador por projeto | **prompt próprio**, se o BAF-3 assim decidir |
| PED × documento fiscal | **Prompt S**, e a RG-06 |
| Numeração de outras entidades | fora — `entity` é sempre `"despesa"` hoje |
| Duplicidade de documento fiscal | `calc/documento-fiscal.ts`, que já trata como alerta |

---

# 8. PRESERVAÇÃO DE DADOS

**8.1** Nenhum `num_doc` é alterado. Nenhuma despesa é renumerada, normalizada ou
excluída. Nenhum buraco de sequência é "fechado".

**8.2** A única migração é o índice parcial da Parte 1, aditivo, com `down`. A
coluna `active`, se descontinuada, **permanece no schema**.

**8.3** `number_sequence` não é recriada, resetada nem semeada por esta tarefa. O
valor de `next_number` em produção permanece como está.

---

# 9. NÃO REGRESSÃO

**9.1** A reserva continua atômica, e o teste de 25 reservas concorrentes
continua passando — **incluindo a contiguidade**, que a Parte 3 melhora e não
pode piorar.

**9.2** O formato do número não muda: prefixo, separador `-`, e `padStart` com
`digits`. Nenhum número já emitido muda de aparência.

**9.3** Os 12 caminhos de lançamento continuam recebendo número, com o mesmo
formato.

**9.4** Despesas, Contas a Pagar, DRE e Fluxo de Caixa continuam com os mesmos
números.

---

# 10. TESTES

**A trava**

1. Salvar `nextNumber` menor que o maior emitido é recusado **na action**,
   chamada direto, com a mensagem dizendo qual é o maior.
2. Salvar igual ao maior emitido também é recusado.
3. Diminuir com confirmação explícita funciona, e a tela declarou quantos
   números da faixa estão em uso.
4. O texto da tela não afirma que a duplicidade é impossível.

**O índice**

5. Gravar despesa com `num_doc` já existente no mesmo tenant é barrado pelo
   banco.
6. O mesmo `num_doc` em tenants diferentes é permitido.
7. Duas despesas sem número convivem — o índice é parcial.
8. A colisão devolve `{ ok: false, error }` legível, com o número que colidiu.

**A transação**

9. Falha na gravação da despesa **não consome número** — conferir `next_number`
   antes e depois de um `insert` que falha.
10. Rollback de acerto, restituição e compensação não consome número.
11. Reserva e gravação acontecem na mesma transação nos 12 caminhos.
12. Os comentários corrigidos descrevem o que o código faz.

**A tela**

13. Último número emitido, total numerado e total sem número aparecem.
14. Sequência ainda não criada é declarada como estimativa.
15. Tenant sem despesa numerada mostra estado próprio, não `0`.
16. `getDespesaSequence` chamada com `tenantId` de outro tenant é recusada.

**O assistente**

17. "Conferir a numeração" lista repetidos, buracos e despesas sem número.
18. O assistente não sugere valor para o próximo número, em nenhum caminho.
19. Assistente não grava nada.

**Gerais**

20. Concorrência: 25 reservas simultâneas produzem 25 números distintos e
    contíguos.
21. **Antes e depois:** todo `num_doc` de `despesa`, um a um. **Nenhuma
    diferença.**
22. **Antes e depois:** `next_number` de cada tenant. Nenhuma diferença causada
    pela implementação.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado das quatro consultas do **BAF-1**, com a lista de duplicatas se
   houver — **sem renumerar nenhuma**.
2. Quantos números foram consumidos e nunca gravados (consulta 4), por tenant.
3. Decisão de **BAF-2** sobre a flag, e o que foi feito com a coluna.
4. Decisão de **BAF-3** sobre o escopo do contador.
5. A migração do índice, com o `down`, e o que aconteceu se houvesse duplicata.
6. **Os 12 caminhos que reservam número**, um a um, com o que foi feito em cada
   para colocar reserva e gravação na mesma transação.
7. Os comentários corrigidos, com arquivo e linha.
8. Como a recusa de `nextNumber` menor foi implementada, e o texto da mensagem.
9. O texto novo da tela, na íntegra.
10. Como `getDespesaSequence` passou a resolver tenant e permissão.
11. Confirmação de que a reserva continua atômica e de que o teste de
    concorrência passa.
12. Confirmação de que nenhum `num_doc` foi alterado.
13. Funcionamento do assistente, e confirmação de que não grava e não sugere
    contador.
14. Limitações encontradas.


<a id="prompt-ak"></a>


========================================================================


### ▸ 4 de 42 · PROMPT AK — Log de Auditoria

**Bloco 0 · Segurança e exposição** · Bloqueios: BAK-1 · BAK-2 · BAK-3

Partes 1 e 2 agora; o restante no Bloco 5.

========================================================================


# PROMPT AK — LOG DE AUDITORIA

Growth Construction · `/acoes`, e a cobertura de auditoria do sistema inteiro.

Baseado na coleta `docs/TELA-AUDITORIA.md`. **Duas metades:** o que o log
registra — Partes 1 a 3, que atravessam o sistema — e a tela que o exibe —
Partes 4 a 7.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · `audit_log` é append-only, e continua sendo.** **Nenhuma linha é alterada
ou removida, em nenhuma circunstância** — nem para corrigir um `meta` mal
formado, nem para limpar os registros vazios da Parte 2, nem para
desnormalizar nome em linha antiga. **Log antigo permanece exatamente como
está**, com todos os seus defeitos.

Hoje isso é verdade no código: grep de `delete(schema.auditLog)` em todo o
`src/` devolve **zero ocorrências**. **Continuar assim é requisito.**

**2 · Nenhum dado inputado pela empresa pode ser alterado.** As actions das
Partes 1 e 2 ganham `logAudit`; **nenhuma muda o que grava no banco**.

**3 · Nada vindo de mockup entra no código.**

**4 · O assistente não grava nada, em nenhum caminho.**

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

**1 · Append-only de fato**, não só na declaração.

**2 · `diffAudit` normaliza antes de comparar** — `null`, `undefined` e `""`
viram a mesma coisa; `Date` vira ISO; string numérica vira número. É o que
impede `"100.00"` × `100` de virar falsa alteração. **Não mexer na
normalização.**

**3 · A coluna Usuário é resolvida por join** — `getMembers` alimenta um `Map`
de id para nome. O caminho certo já existe na tela; falta aplicá-lo à Entidade.

**4 · `tenant_id` filtra a consulta**, e vem da sessão, nunca do cliente.

**5 · `numDoc` não pode aparecer em `changes`**, porque o PED é imutável — a
RG-06 implementada, com o motivo escrito no código.

**6 · Os dois eventos de `addDespesa` são propositais.** `despesa.create` e
`despesa.pagaPorSocio` no mesmo segundo registram **fatos diferentes**: o
lançamento e a obrigação empresa↔sócio criada em `despesa_terceiro`. **Não
unificar.** O que falta é a tela deixar isso claro — Parte 5.4.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — as 13 sem rastro | **BAK-1** | **primeira; é a maior lacuna** |
| **2** — o log vazio | nada | uma linha em cada uma das três actions |
| **3** — o que vai no `meta` | **BAK-2** | |
| **4** — índice e paginação | nada | |
| **5** — a tela | Parte 3 | |
| **6** — backup do log | **BAK-3** | |
| **7** — assistente de IA | Partes 4 e 5 | |

---

# BLOQUEIOS

## BAK-1 · Quem é o dono de cada uma das 13

Duas já têm prompt: `renameTenant` no **Prompt AH** e `disableMfa` — junto com
`changePassword`, `confirmMfa` e `getOrCreateMfaSetup` — no **Prompt AI**,
Parte 6.2.

**Restam nove**, e a pergunta é se entram aqui ou no prompt de cada tela:

| Função | Tela | Prompt da tela |
|---|---|---|
| `deleteStockItem` | Estoque | **Prompt Y** |
| `addReembolso` | Liberações de Obra | **Prompt O** |
| `addPermuta` | Permuta | **Prompt P** |
| `saveIncc` | Parâmetros / INCC | **Prompt Q** |
| `toggleConciliado` | Caixa | **Prompt L** |
| `pairMovimento` | Caixa | **Prompt L** |
| `addBankAccount` | Contas Correntes | **Prompt X** |
| `setDefaultVersion` | Configuração da Versão | ainda sem prompt |

**Recomendação: entram aqui, todas.** São nove chamadas de `logAudit` com o
mesmo formato, e distribuí-las por sete prompts significa que a cobertura só
fecha quando o último deles for executado — o que pode levar meses. **Registrar
em cada prompt de tela que a auditoria daquela action foi feita aqui.**

## BAK-2 · O que pode aparecer no `meta`

**O contador externo vê esta tela.** `"acoes"` é a **única tela do módulo Config
em `CONTADOR_VE`** — as outras oito caem em `NONE`.

E não há mascaramento nenhum: `logAudit` faz cast e insere; `diffAudit` percorre
todas as chaves do patch sem filtro. **Qualquer campo que uma action decidir pôr
no `meta` chega ao contador.**

Hoje o risco é contido — senha e token nunca entram —, mas por disciplina de
cada action, não por mecanismo.

**A pergunta é do BM-3 do Prompt M:** quais campos de cliente são sensíveis? Se
**renda** entrar num `meta` de `cliente.update`, ela aparece aqui.

**Responder:** a lista de campos que nunca entram no `meta`. E decidir se o
contador continua enxergando o log integral, ou uma visão dele.

## BAK-3 · O log entra no Backup?

`buildSemesterZip` carrega quatro fontes — despesas, contas a receber, caixa e
documentos. **`audit_log` não está entre elas.**

Somado à ausência de paginação e de exportação: **a trilha de auditoria não tem
cópia em lugar nenhum e não tem saída pela interface.**

**Responder:** o log entra no ZIP semestral? Recomendação: **sim**, em arquivo
próprio, do período do semestre. É o artefato que existe justamente para o caso
em que algo deu errado — e é o único do sistema sem cópia.

---

# PARTE 1 — AS 13 QUE GRAVAM SEM RASTRO

**Ver BAK-1.** O inventário da coleta: **104 funções gravam em banco, 87
registram, 17 não** — e quatro das 17 são internas cujos chamadores registram
(`replaceLines`, `replaceReceitaRowKey`, `persistIncc`, `copyPlanningData`).
**Sobram 13 operações exportadas.**

## 1.1 · As nove desta tarefa

| Função | Action sugerida | `meta` mínimo |
|---|---|---|
| `deleteStockItem` | `estoque.item.delete` | nome, quantidade, vínculo de origem |
| `addReembolso` | `reembolso.create` | projeto, valor, data |
| `addPermuta` | `permuta.create` | projeto, tipo, valor estimado |
| `saveIncc` | `incc.save` | projeto, meses alterados, **de/para de cada taxa** |
| `toggleConciliado` | `conciliacao.flag` | movimento, valor, estado anterior e novo |
| `pairMovimento` | `extrato.pair` | os dois movimentos e os valores |
| `addBankAccount` | `contaCorrente.create` | banco, apelido, tipo |
| `setDefaultVersion` | `version.setDefault` | versão anterior e nova |

**`deleteStockItem` é exclusão física** — o `meta` precisa carregar o
suficiente para saber o que existia, porque o registro não existe mais.

**`saveIncc` grava taxa de correção monetária**, que vira receita. É a que mais
pesa contabilmente da lista.

## 1.2 · Nenhuma muda o que grava no banco

Esta parte **acrescenta `logAudit`**. Não altera validação, não altera o `set`,
não altera retorno. **Reportar, antes e depois, que nenhuma dessas nove mudou de
comportamento.**

## 1.3 · O log entra na mesma transação da escrita

Onde a action já usa transação, o `logAudit` entra nela. Onde não usa, **não
criar transação nova nesta tarefa** — registrar a pendência.

**Motivo:** hoje `setMemberPermissions` grava a permissão e o log fora de
transação; falha no log deixa a alteração sem registro. É defeito conhecido, e
corrigi-lo em nove actions ao mesmo tempo é mudança maior do que esta tarefa
comporta.

---

# PARTE 2 — O LOG DE EVENTO QUE NÃO ACONTECEU

## 2.1 · A causa

`updateDespesa` tem **uma guarda contra patch vazio**, não contra patch
**inalterado** (`despesas.ts:641`):

```ts
if (Object.keys(set).length === 0) return;
```

O formulário envia as 10 chaves sempre, então `set` nunca fica vazio. O `update`
roda gravando os mesmos valores, `diffAudit` devolve `{}`, e o log registra um
evento que não existiu. Na tela isso vira `{"changes":{}}` — as quatro linhas do
print.

## 2.2 · A correção existe e não é usada

`audit-diff.ts:82–85` **exporta** o helper:

```ts
/** Houve alteração real? */
export function houveMudanca(diff: DiffAuditoria): boolean {
  return Object.keys(diff).length > 0;
}
```

E o docstring de `diffAudit` sugere o uso — *"o chamador pode usar isso para não
gravar log vazio"*.

**Grep em todo o `src/`: aparece só na definição e no teste. Nenhuma action o
usa.**

## 2.3 · As três actions que gravam `changes`

| Action | Guarda hoje |
|---|---|
| `despesa.update` | **não** |
| `cliente.update` | **não** — monta `changes` com loop próprio |
| `tenant.fiscal` | **não** |

**As três passam a usar `houveMudanca`.** Diff vazio não gera linha de log.

## 2.4 · E o `update` em si?

Com diff vazio, o `update` grava os mesmos valores — inofensivo, mas
desnecessário.

**Decidir:** pular também o `update`, ou manter e pular só o log?
**Recomendação: pular só o log.** Suprimir o `update` muda comportamento de
gravação; suprimir o log vazio não muda nada além do ruído.

## 2.5 · Os registros vazios já gravados permanecem

**Não apagar.** Regra global, item 1. A tela passa a exibi-los de forma
legível — Parte 5.3 —, não a escondê-los.

---

# PARTE 3 — O QUE VAI NO `meta`

## 3.1 · UUID cru é a regra, e devia ser a exceção

Doze tipos de id aparecem crus: `socioId`, `despesaId`, `cashEntryId`,
`contaReceberId`, `terceiroId`, `despesaTerceiroId`, `bankAccountId`,
`projectId`, `parcelaId`, `documentId`, `recebimentoTerceiroId`,
`budgetVersionId`.

**E algumas actions já gravam nome** — `project.create`, `project.delete`,
`cliente.create`, `stakeholder.create`, `version.duplicate`, `version.delete`,
`estoque.item.create`, `ponto.gerar_conta`. **É decisão action a action, sem
padrão.**

## 3.2 · A regra

**Todo `meta` que carregar um id carrega também o nome, código ou rótulo
correspondente, no momento do evento.**

**Por que no momento do evento, e não por join na leitura:** o registro pode ter
sido apagado, renomeado ou reclassificado depois. O log precisa dizer o que era
quando aconteceu — é o mesmo princípio de `daily_closing`, que guarda
`responsavel_nome` em vez de depender da FK.

**O id permanece**, ao lado do nome.

## 3.3 · O número do documento

`numDoc` aparece no `meta` de dez actions, e `despesa.update` não é uma delas.
**É o identificador que a empresa usa** — o print mostra a diferença entre uma
linha de cancelamento, legível, e quatro de update, ilegíveis.

**`despesa.update` passa a gravá-lo**, junto com o diff.

## 3.4 · A lista de campos que nunca entram

**Ver BAK-2.** Enquanto não houver decisão, **nenhuma action nova põe no `meta`
campo que não esteja em outra já existente.**

---

# PARTE 4 — ÍNDICE E PAGINAÇÃO

## 4.1 · `audit_log` não tem índice nenhum

E a consulta é `where tenant_id = ? order by created_at desc limit 200`, numa
tabela que cresce para sempre e nunca é podada.

**Índice em `(tenant_id, created_at desc)`**, aditivo, com `down`.

## 4.2 · A tela mostra 200 e o resto fica inacessível

`getAuditLog(ctx.tenant.id, 200)` — **sem `offset`, sem cursor**. Num tenant
ativo, 200 eventos cobrem poucos dias: o print tem 15 linhas de dois dias.

**Paginação por cursor**, sobre `created_at`. Não `offset`, que degrada com o
crescimento.

## 4.3 · O subtítulo diz o que não sabe

*"N eventos recentes"* mostra quantos vieram, não quantos existem. Passa a
declarar o recorte: o período exibido e, se houver filtro, quantos ele alcançou.

## 4.4 · Sem retenção e sem expurgo

Não há coluna de expiração, job ou cron. **Não criar expurgo nesta tarefa** — é
decisão de política, e apagar log é o oposto do propósito da tabela. Registrar.

---

# PARTE 5 — A TELA

## 5.1 · Filtros

Hoje não há nenhum — nem `searchParams` na assinatura da página. O "filtro" é o
`Ctrl+F` do navegador sobre 200 linhas.

**Entram quatro:** usuário, período, entidade e ação. Combináveis, no servidor.

## 5.2 · A entidade passa a ser legível

Hoje é `entity` + `entityId` cortado em 8 caracteres, **sem join**. E
`entity_id` é `text` **sem foreign key** — quando o registro é apagado, o id
aponta para o nada.

**Com a Parte 3, o nome vem do próprio `meta`** e a tela o exibe, com o id ao
lado em fonte menor. Sem join novo, sem consulta extra.

**Para os registros antigos, sem nome no `meta`, a tela exibe o que tem.** Não
inventar join que funcione só para o que ainda existe.

## 5.3 · O registro vazio fica legível

`{"changes":{}}` passa a ser exibido como *"salvo sem alteração"*. Os antigos
permanecem e ficam compreensíveis.

## 5.4 · Eventos do mesmo fato ficam agrupados

`addDespesa` pode gerar **três** linhas com o mesmo `entityId` no mesmo segundo
— `despesa.create`, `despesa.pagaPorSocio` e `despesa.recorrente`.

**São fatos distintos e continuam sendo três linhas** — mas a tela os agrupa
visualmente, para que não pareçam duplicidade.

## 5.5 · Usuário removido

O `Map` de nomes vem de `getMembers`, que só traz membros atuais — removido vira
`—`, com o id ainda gravado.

Com a Parte 6.2 do **Prompt AI**, inativar substitui remover, e o vínculo
permanece. **Enquanto isso, a tela exibe "usuário removido" em vez de traço.**

## 5.6 · Exportação

A tela ganha exportação do recorte filtrado — CSV. **É o que permite levar a
trilha para fora sem depender do banco**, e é pré-condição prática do BAK-3.

---

# PARTE 6 — O LOG NO BACKUP

**Ver BAK-3.** Se a resposta for sim: arquivo próprio no ZIP semestral, com os
eventos do período, no mesmo formato da exportação da 5.6.

**O log não é filtrado por competência** — ele tem `created_at`, não
competência. O recorte é pela data do evento, e o ZIP declara isso.

---

# PARTE 7 — ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.**

**7.1 · Ações**

- **O que mudou neste registro** — a linha do tempo de um documento, projeto ou
  cliente, a partir do `entityId`. É a leitura que a tela não oferece.
- **Alterações de valor** — lançamentos cujo valor mudou depois de criado, com
  de/para e quem fez.
- **Atividade fora do horário** — eventos em fim de semana ou madrugada. **Sem
  juízo**: lista, não acusa.
- **Exclusões do período** — tudo que foi apagado, com quem e quando.

**7.2 · Nunca**

- **Nunca escrever em `audit_log`**, por nenhum caminho. A tabela é append-only,
  e o assistente é leitor.
- **Nunca afirmar intenção.** "Alterou o valor para esconder" não é leitura do
  dado. Ele diz o que mudou, quando e por quem.
- **Nunca afirmar que está tudo certo.** Ausência de achado não é atestado.

**7.3 · O contador alcança esta tela**, e alcança o assistente dela. O que o
`meta` contiver, o assistente pode repetir — **por isso o BAK-2 vem antes**.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| `renameTenant` sem log | **Prompt AH**, Parte 3 |
| Senha e MFA sem log | **Prompt AI**, Parte 6.2 |
| Campos sensíveis de cliente | **Prompt M**, BM-3 |
| Transação em torno de log e escrita | ver 1.3 |
| Expurgo e retenção | ver 4.4 |
| Nome desnormalizado em linha antiga | **proibido** — regra global |
| Escrita assistida | **fora, permanentemente** — 7.2 |

---

# 9. PRESERVAÇÃO DE DADOS

**9.1** Nenhuma linha de `audit_log` é alterada ou removida. Nenhuma migração
sobre a tabela além do índice da 4.1.

**9.2** As nove actions da Parte 1 não mudam o que gravam.

**9.3** Os registros com `changes: {}` permanecem.

---

# 10. NÃO REGRESSÃO

**10.1** As nove actions continuam fazendo exatamente o que faziam — conferir por
contagem e conteúdo das tabelas que cada uma escreve.

**10.2** `diffAudit` não muda. O teste de `audit-diff.test.ts` continua passando.

**10.3** A Parte 2 não altera nenhum `update` — só suprime o log vazio.

**10.4** Nenhuma tela muda de comportamento.

---

# 11. TESTES

**Cobertura**

1. As nove actions da Parte 1 gravam log, com `meta` conforme a tabela 1.1.
2. **Antes e depois:** cada uma grava no banco exatamente o que gravava.
3. Inventário refeito: **nenhuma função exportada grava sem `logAudit`**, salvo
   as declaradas em 8.
4. `deleteStockItem` deixa `meta` suficiente para saber o que foi apagado.

**O log vazio**

5. Salvar despesa sem alterar nada **não gera linha de log**.
6. O mesmo para cliente e dados fiscais.
7. Alterar um campo gera linha com esse campo em `changes`.
8. Os registros vazios antigos continuam no banco.

**O `meta`**

9. Todo `meta` com id carrega o nome correspondente.
10. `despesa.update` grava `numDoc`.
11. Nenhum campo da lista do BAK-2 aparece em `meta` nenhum.

**A tela**

12. Os quatro filtros funcionam, combinados, no servidor.
13. Paginação alcança evento anterior aos 200 mais recentes.
14. A entidade é legível para eventos novos.
15. `{"changes":{}}` antigo aparece como "salvo sem alteração".
16. As três linhas de `addDespesa` aparecem agrupadas, e continuam sendo três.
17. Exportação devolve o recorte filtrado.

**Permissão**

18. `membro` e `engenheiro` não abrem a tela.
19. `contador` abre, e vê o mesmo que owner e admin — salvo decisão do BAK-2.

**Assistente**

20. Não escreve em `audit_log` por nenhum caminho.
21. Não afirma intenção.
22. Não grava nada.

**Gerais**

23. **Antes e depois:** contagem de `audit_log`. A diferença é só o que a
    implementação gerou, e nenhuma linha antiga mudou.
24. O índice existe e a consulta o usa.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisão de **BAK-1** — quais das nove entraram aqui, e o registro feito em
   cada prompt de tela.
2. Decisão de **BAK-2** — a lista de campos que nunca entram no `meta`, e se o
   contador continua vendo o log integral.
3. Decisão de **BAK-3** — o log entra no Backup.
4. O inventário refeito: quantas funções gravam, quantas registram, quantas não
   — e por quê, uma a uma.
5. O `meta` de cada uma das nove actions novas.
6. Confirmação de que nenhuma das nove mudou o que grava.
7. Como `houveMudanca` foi aplicado nas três actions, e a decisão de 2.4.
8. Como o nome passou a acompanhar o id no `meta`.
9. O índice criado, com o `down`.
10. Como a paginação por cursor funciona.
11. Os filtros implementados, e onde são aplicados.
12. **Confirmação de que nenhuma linha de `audit_log` foi alterada ou
    removida.**
13. Funcionamento do assistente, e confirmação de que não escreve na tabela.
14. Limitações encontradas.


<a id="prompt-a"></a>


========================================================================


### ▸ 5 de 42 · PROMPT A — Contexto de projeto e versão

**Bloco 1 · Fundação** · Bloqueios: B-A1 · B-A2

Transversal. O fallback silencioso aparece em 9 telas revisadas.

========================================================================


# PROMPT A — REFATORAÇÃO ESTRUTURAL DO GROWTH CONSTRUCTION


---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---
## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum número já lançado no sistema pode ser alterado.**
Valores, totais, percentuais, saldos, datas e quantidades existentes em
produção permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda,
converte, normaliza, migra, reclassifica ou "corrige" um número já gravado —
nem como efeito colateral de mudança de layout, de rota, de nome de campo ou de
origem de dado. Se uma alteração exigir tocar em número lançado: **PARE, não
execute, e informe qual número, por quê e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups e capturas de tela definem **layout, hierarquia visual, rótulos e
comportamento de interface** — nada além disso. São ilustrações, frequentemente
com números inconsistentes entre si.

Nunca usar de um mockup: valores monetários, percentuais, totais, saldos, datas,
prazos, nomes de obra, nomes de cliente, nomes de proprietário, endereços,
coordenadas, nomes de usuário, cargos, contadores, badges numéricos, ou qualquer
outro dado de exemplo.

Nunca criar registro, seed, fixture, valor padrão ou dado de teste a partir de
um mockup. Nenhum dado de exemplo é gravado no banco de produção em nenhuma
hipótese.

Todo número exibido em tela vem do banco. Onde não houver dado, a tela mostra
estado vazio — **nunca zero, nunca placeholder numérico, nunca o valor do
mockup**.

---

Remover o conceito de **projeto ativo global** e implementar o status de
projeto **Ativo / Finalizado**.

Alteração estrutural de arquitetura. Não é mudança visual.

> **Como ler este documento**
> As seções 0 a 51 são o prompt original.
> Marcações inseridas na revisão de código:
> **[BLOQUEIO]** decisão necessária antes de implementar ·
> **[ACRÉSCIMO]** requisito novo · **[NOTA]** informação técnica que muda o como.

---

# ORDEM DE EXECUÇÃO — LER PRIMEIRO

Existem dois prompts para a área de Projetos, com PRs e deploys separados:

- **PROMPT A** — este. Refatoração de contexto + status Ativo/Finalizado.
- **PROMPT B** — `PROMPT-PROJETOS-CONSOLIDADO.md`. Redesenho visual e funcional
  da tela Projetos & Unidades.

**A vai antes de B. Sem exceção.**

Motivo: o Prompt B remove da tela de Projetos o botão "Selecionar", que é hoje o
único ponto onde o usuário troca de obra. Enquanto o projeto ativo global
existir, remover esse botão deixa a operação presa à obra gravada no cookie,
sem conseguir lançar em nenhuma outra.

**Divisão de responsabilidade entre os dois prompts** — para não colidirem na
mesma migração e nos mesmos arquivos:

| Assunto | Dono |
|---|---|
| Coluna nova de situação (`Ativo`/`Finalizado`) e sua migração | **A** |
| Remoção de `setActiveProject`, `SelectActive`, `activeId`, cookies | **A** |
| Assinatura das Server Actions (parâmetros explícitos) | **A** |
| Ordenação de `ctx.projects` | **A** |
| Layout, blocos visuais, cores, Assistente IA, Orçado x Realizado | **B** |
| Formato de retorno das actions (`{ ok, error }`) | **B** |
| Proteção de interface do botão Excluir | **B** |

O Prompt B apenas **consome** a coluna criada aqui.

---

# BLOQUEIOS — RESPONDER ANTES DE ESCREVER CÓDIGO

## B-A1 · Qual é o tamanho real desta refatoração?

As seções 15 e 16 mandam refatorar **toda** Server Action e **toda** query que
use `ctx.project` ou `ctx.version`, passando a receber `projectId` explícito.

`getActiveContext()` é chamado no `page.tsx` de praticamente todas as 48 telas.
Como PR única, isto é a maior mudança já feita nesta base, com cobertura de
teste modesta (~35 arquivos), rodando em produção com dados reais.

**Executar a ETAPA 1 (seção 49) e parar.** Entregar o inventário — quantos
arquivos, quantas actions, quantas queries, quantas páginas — **antes** de
escrever qualquer código. O número decide se isto é uma PR ou seis.

**Recomendação de fatiamento**, se o inventário confirmar o tamanho esperado:

1. PR 1 — coluna nova + status Ativo/Finalizado + auditoria (seções 2, 23 a 27).
2. PR 2 — contexto tenant-only e resolução explícita, com `getActiveContext()
   mantido e marcado como depreciado (seções 10 a 12).
3. PR 3..n — migração por módulo, um por vez, cada um com seu seletor próprio.
4. PR final — remoção de `setActiveProject`, do cookie e do código morto
   (seções 7, 8, 47), **somente depois** de zerar as dependências.

Enquanto houver telas não migradas, `getActiveContext()` continua funcionando.
Remover o cookie antes disso derruba toda tela ainda dependente.

## B-A2 · O que o usuário vê quando nenhum projeto foi escolhido?

A seção 12 proíbe `projects[0]` como fallback. Arquiteturalmente correto — mas
hoje toda tela já vem com uma obra resolvida. Depois desta mudança, a
controladoria abre Despesas e vê "Selecione um projeto". Toda tela, toda sessão.

**Decidir entre:**

1. **Literal.** Nenhuma memória. Escolha explícita sempre. Mais seguro, mais
   atrito diário.
2. **Memória por aba.** A seleção mora na URL (`?project=<id>`), e cada aba
   lembra a última escolha em `sessionStorage`, não em cookie. Não é estado
   global — é por aba, visível na URL e não compartilhado entre abas. Preserva o
   teste da seção 32 e elimina o atrito.

A opção 2 é compatível com todo o resto do prompt. A 1 não é errada, mas o custo
recai sobre quem lança todo dia.

---

# 0. REGRA MÁXIMA — PRESERVAÇÃO ABSOLUTA DOS DADOS

Nenhum dado já inserido poderá ser apagado, sobrescrito, convertido,
recalculado, reclassificado, renomeado, substituído, zerado, desvinculado,
movido para outro projeto ou versão, modificado por migration automática, ou
modificado para se adaptar ao novo conceito.

Vale para todo o banco: projetos, matriz e filiais, unidades, vendas, clientes,
fornecedores, stakeholders, despesas, parcelas, contas a pagar e a receber,
caixa, extratos, conciliações, contas bancárias, Budget, Forecast, versão Atual,
budget lines e accounts, medições, serviços, estoque e movimentos, INCC,
reembolsos, restituições, permutas, acertos, rateios, fechamentos, balanços,
carry over, documentos, documentos fiscais, usuários, permissões, auditoria,
dados fiscais, configurações e qualquer outro registro existente.

Nenhum valor financeiro modificado. Nenhum vínculo perdido. Nenhuma versão
recriada. Nenhum registro excluído para adequar o sistema à nova arquitetura.

---

# 1. MIGRAÇÕES DEVEM SER ADITIVAS

Permitido: adicionar coluna, adicionar índice, adicionar constraint compatível
com os dados existentes, criar funções auxiliares, criar nova estrutura de
contexto.

Proibido nesta tarefa: remover coluna; renomear coluna de forma destrutiva;
mudar o significado de campo existente sem preservar seu valor; alterar valores
existentes para adaptá-los ao novo modelo; UPDATE em massa sobre dados
financeiros ou operacionais; excluir tabelas; recriar tabelas com perda
potencial; remover versões; modificar lançamentos.

Se a classificação Ativo/Finalizado exigir campo novo: **criar campo novo**. Não
reutilizar de forma destrutiva campo antigo com informação diferente.

**[ACRÉSCIMO]** Toda migração criada aqui precisa do seu `down` correspondente
em `migrations/down/`. É convenção da casa, mas hoje só 7 das 40 migrações a
cumprem. Numa refatoração deste porte, sem `down` não há caminho de volta — e as
migrações rodam no boot do contêiner, então um deploy ruim já aplicou o schema
antes de alguém perceber.

**[ACRÉSCIMO]** Toda instrução usa `IF NOT EXISTS`, conforme o padrão do
repositório.

---

# 2. STATUS ANTIGO NÃO PODE SER SOBRESCRITO

O enum atual `project.status` contém `Planejamento` e `Em andamento`. Essa
informação não pode ser apagada nem sobrescrita.

Antes de qualquer alteração: localizar todas as referências ao status atual;
verificar telas, filtros, cálculos e queries que o utilizam; preservar
integralmente os valores.

Para o novo conceito, criar propriedade separada — `project.situacao`,
`project.lifecycleStatus` ou nome consistente com a arquitetura. Na interface,
apresentar apenas como `STATUS [ Ativo ▼ ]`.

Projetos existentes podem receber o novo atributo, desde que nenhum campo
existente seja modificado.

**[BLOQUEIO menor]** Decidir entre:

- **Coluna anulável, sem default.** Nenhuma linha existente é escrita. Projeto
  não classificado exibe "—". Mais fiel à seção 0.
- **Coluna com default `Ativo`.** Escreve em todas as linhas existentes — o que a
  seção 40 autoriza como "adição do novo campo técnico" — mas afirma que toda
  obra está ativa, inclusive as que já terminaram. É uma afirmação sobre o mundo
  que ninguém verificou.

Recomendação: anulável. Classificação é ato humano.

**[NOTA]** `project.status` é um `pgEnum` (`projectStatusEnum`). Se em algum
momento se optar por ampliar o enum em vez de criar coluna, ampliar o domínio de
valores é aditivo e seguro; reclassificar linhas não é, e continua proibido.

---

# 3. CONCEITO ANTIGO A SER ELIMINADO

A cadeia `TENANT → PROJETO ATIVO GLOBAL → VERSÃO ATIVA → TELA` deixa de existir.
O sistema não terá mais um projeto selecionado globalmente que altere
silenciosamente o comportamento das demais telas.

---

# 4. NOVO SIGNIFICADO DA PALAVRA ATIVO

`ATIVO` = projeto ainda ativo na operação da empresa.
`FINALIZADO` = projeto concluído, para fins de classificação e filtragem.

`ATIVO` **não** significa: projeto selecionado, corrente, principal, padrão,
aberto pelo usuário, usado automaticamente pelas demais telas, nem contexto
global.

**[ACRÉSCIMO]** O card de escritório/filial (`OfficeRow`) exibe hoje um badge
"Ativo" fixo no código, que não reflete estado nenhum, ao lado do badge "ativo"
de seleção global. Os dois precisam sair, ou a palavra passa a ter três
significados na mesma linha.

---

# 5. STATUS ATIVO / FINALIZADO É CLASSIFICAÇÃO

Atributo cadastral para identificação, organização, pesquisa, filtros,
Dashboard, relatórios e seletores.

Marcar como FINALIZADO **não** deve apagar dados, bloquear projeto, edição ou
lançamento, esconder histórico, excluir de consultas, nem alterar vendas,
unidades, documentos, Budget, Forecast, Atual, movimentos, DRE, Caixa, Fluxo de
Caixa, contas a pagar ou receber, estoque, medição, conciliação ou permissões.

Nenhum comportamento adicional deve ser inferido. Regra futura sobre projeto
finalizado será solicitada especificamente.

---

# 6. AUDITORIA INICIAL OBRIGATÓRIA

Antes de alterar código, pesquisar todo o repositório por:

`ACTIVE_PROJECT_COOKIE` · `gtc_project` · `setActiveProject` · `activeId` ·
`SelectActive` · `ctx.project` · `ctx.project.id` · `getActiveContext` ·
`ACTIVE_VERSION_COOKIE` · `gtc_version` · `setActiveVersion` · `ctx.version` ·
`ctx.version.id` · `projects[0]` · fallback de projeto · fallback de versão ·
"projeto ativo" · "active project"

Mapear páginas, layouts, server actions, queries, componentes, APIs, agentes,
testes, hooks e helpers.

Não fazer substituições mecânicas. Entender primeiro por que cada dependência
existe.

**[ACRÉSCIMO]** Incluir na busca: `ctx.projects` (a lista, não o singular) e
`ctx.tenant.id`. O primeiro alimenta seletores; o segundo é o filtro de tenant e
não pode ser enfraquecido pela refatoração.

**[ACRÉSCIMO]** Este inventário é o entregável da ETAPA 1 e a resposta ao
bloqueio B-A1. Entregar antes de escrever código.

---

# 7. COOKIE DE PROJETO ATIVO

Eliminar o uso funcional de `ACTIVE_PROJECT_COOKIE` / `gtc_project`. Depois da
implementação: nenhuma página, query ou action depende dele; criar projeto não o
grava; selecionar projeto não o grava; excluir projeto não o limpa; cookie
antigo existente no navegador não pode modificar resultados.

Código legado só é removido depois que todas as dependências forem migradas.

**[NOTA]** Ponto de ordem crítico: a remoção do cookie é a **última** etapa, não
a primeira. Enquanto uma única tela ainda ler `ctx.project`, o cookie precisa
continuar sendo escrito por algum caminho — ou aquela tela quebra em produção.
Ver o fatiamento sugerido em B-A1.

---

# 8. REMOVER setActiveProject

Eliminar `setActiveProject(projectId)` como mecanismo funcional, junto de: botão
"Selecionar"; badge de projeto selecionado globalmente; componente
`SelectActive`; propriedade `activeId`; comparação `project.id === activeId`;
qualquer chamada que transforme um projeto em corrente global.

Não apenas esconder o botão. Eliminar a dependência arquitetural.

**[NOTA]** `setActiveProject` e `setActiveVersion` vivem em
`src/lib/actions/context.ts`. A remoção é o último passo (seção 7). Até lá, o
código permanece e apenas os usos vão saindo.

---

# 9. CRIAÇÃO DE PROJETO NÃO MUDA MAIS CONTEXTO

Ao criar projeto, criar normalmente: projeto, versões padrão, Budget, Forecast,
Atual, INCC e demais estruturas já criadas hoje.

Não alterar contexto, não definir projeto ativo, não gravar cookie, não afetar
outra aba, não resetar versão global, não modificar comportamento de outra tela.

Após a criação, pode-se navegar visualmente para o projeto criado. Isso é
navegação, não contexto global.

**[NOTA]** `createProject` hoje faz, em transação: insere o projeto; insere as
três versões (`budget`, `forecast`, `atual`, com `forecast` marcada como
default); popula a tabela INCC inteira a partir de `DEFAULT_INCC`; e só então
grava os dois cookies. **Somente a gravação dos cookies sai.** As três primeiras
são obrigatórias — sem elas o projeto nasce inutilizável.

**[ACRÉSCIMO]** Preservar também a criação de escritório/filial
(`kind: "office"`), que nasce sem duração, datas nem cliente, e que hoje
compartilha a mesma action.

---

# 10. CONTEXTO GLOBAL NOVO

O único contexto global obrigatório passa a ser **empresa/tenant**.

Refatorar para algo como `getTenantContext()`, resolvendo usuário, tenant,
membership, permissões, empresa, projetos disponíveis quando necessário, e
demais informações genuinamente globais — **sem** selecionar projeto
automaticamente.

**[ACRÉSCIMO]** A lista de projetos devolvida por esse contexto deve vir
**ordenada de forma estável e previsível** — numérica pelo código da obra, com
fallback alfabético — e com escritórios (`kind: "office"`) agrupados
separadamente. Hoje a ordem chega como 28, 32, 29, 31, 21, 22, 25, sem critério
visível, e com muitos projetos isso é fonte real de erro de contexto: escolher a
obra errada num seletor embaralhado vira despesa na obra errada, que vira número
errado na DRE.

Como todos os seletores de tela passarão a consumir essa lista, corrigir aqui
resolve em todas de uma vez.

---

# 11. CONTEXTO DE PROJETO PASSA A SER EXPLÍCITO

Tela que precisar de projeto o recebe explicitamente:
`getProjectContext(projectId)`.

A resolução verifica obrigatoriamente `project.id = projectId` **e**
`project.tenantId = tenant atual`. Nunca confiar somente no UUID do navegador.

**[ACRÉSCIMO]** Não existe RLS no banco: o isolamento é sustentado consulta a
consulta, em 164 pontos espalhados por 25 arquivos. Cada resolução explícita
criada aqui é uma nova oportunidade de esquecer o filtro. Toda função nova de
resolução deve exigir `tenantId` como parâmetro obrigatório, não opcional, para
que o esquecimento vire erro de compilação em vez de vazamento silencioso.

---

# 12. PROIBIDO FALLBACK SILENCIOSO

**Ver B-A2 antes de implementar.**

Remover `project = projects[0]` e equivalentes. Isso recriaria o projeto ativo
de forma escondida.

Tela que exigir projeto sem seleção mostra "Selecione um projeto" ou um seletor
apropriado. Nunca selecionar automaticamente o primeiro.

---

# 13. VERSÕES — BUDGET / FORECAST / ATUAL

Budget, Forecast e Atual continuam existindo. O problema é apenas a dependência
de projeto global. Versão pertence a projeto, e é sempre resolvida dentro de um
projeto explícito.

Validar sempre `tenantId` + `projectId` + `versionId` (ou `versionKind`). Nunca
permitir `versionId` do Projeto A com `projectId` do Projeto B.

**[NOTA — mecanismo]** As tabelas `despesa` e `unit` **não possuem coluna
`project_id`**. O vínculo com a obra existe apenas através de `version_id`, e
`version` é única por `(project_id, key)`. Consequências práticas:

- Uma assinatura como `getExpenses(tenantId, projectId, versionId)` tem
  redundância embutida: `projectId` só serve para validar que a versão pertence
  ao projeto. A validação é obrigatória, não decorativa.
- Filtrar despesa por projeto exige join com `version`. Não existe atalho.
- São 8 tabelas versionadas: `unit`, `permuta`, `reembolso`, `despesa`,
  `medicao`, `cash_entry`, `budget_line`, `budget_account`. As demais
  (`conta_receber`, `recebimento_terceiro`, `daily_closing`, `incc_rate`,
  `time_entry`, `servico`, `document`, `stock_movement`) são de projeto mas não
  de versão, e recebem `projectId` sem `versionId`.

---

# 14. REVISAR ACTIVE_VERSION_COOKIE

Auditar `ACTIVE_VERSION_COOKIE`, `gtc_version` e `setActiveVersion`. Se
dependerem do projeto ativo global, refatorar ou remover a dependência. O sistema
não deve manter versão global que possa pertencer a outro projeto. Seleção de
versão fica vinculada ao projeto usado naquela tela.

**[ACRÉSCIMO]** Isto provavelmente descobre um bug vivo, não só uma dívida:
`setActiveProject` apaga o cookie de versão ao trocar de projeto, mas
`setActiveVersion` grava um `versionId` sem verificar a que projeto ele
pertence. Antes de refatorar, **verificar em produção** se existe hoje alguma
sessão com cookie de versão apontando para versão de outro projeto, e o que as
telas fazem nesse estado. É informação de diagnóstico, não motivo para alterar
dado.

---

# 15. SERVER ACTIONS

Auditar todas as actions que fazem `const ctx = await getActiveContext()` e
depois usam `ctx.project` ou `ctx.version`. Refatorar para parâmetros
explícitos:

```
ANTES   createExpense(data)                        // usa ctx.project.id
DEPOIS  createExpense(projectId, data)
        createExpense(projectId, versionId, data)  // quando versionado
```

No servidor, validar sempre a cadeia tenant → projeto → versão.

**[NOTA — conflito com o Prompt B]** O Prompt B altera o **formato de retorno**
das actions de projeto para `{ ok, error }`. Este prompt altera os
**parâmetros** das mesmas actions. As duas mudanças tocam as mesmas assinaturas.

Regra: **A muda parâmetros, B muda retorno.** Como A vai antes, B parte das
assinaturas já refatoradas. Não antecipar aqui a mudança de retorno.

---

# 16. QUERIES

Queries de projeto recebem `projectId` explicitamente:
`getExpenses(tenantId, projectId, versionId)`.

Consultas naturalmente multiprojeto — Contas a Pagar, Dashboard, DRE
consolidada, Fluxo de Caixa consolidado, Acerto, relatórios — não devem ser
obrigadas a receber um único projeto. Elas recebem um escopo.

---

# 17. MODELO DE ESCOPO

Criar conceito explícito semelhante a `projectScope: all | active | finished |
specific`, com `projectId` quando `specific`:

```
{ type: "specific", projectId: "..." }
```

A implementação exata é livre. O objetivo é evitar lógica implícita.

**[ACRÉSCIMO]** Definir explicitamente o que os escopos `all`, `active` e
`finished` fazem com **escritórios/filiais** (`kind: "office"`), que carregam
custo indireto e não são obras. Somá-los junto com as obras num consolidado, ou
não somá-los, são resultados diferentes — e nenhum dos dois pode ser acidente.
Ver seção 33.

---

# 18. DASHBOARD

Filtro próprio com: Todos os projetos · Projetos ativos · Projetos finalizados ·
separador · projetos individuais.

A seleção pertence ao Dashboard e não vira contexto global.

---

# 19. RELATÓRIOS

Mesmo princípio quando fizer sentido — DRE, Fluxo de Caixa e demais relatórios
com filtro próprio de Todos / Ativos / Finalizados / Projeto específico.

---

# 20. FILTROS NÃO DEVEM ALTERAR OUTRAS TELAS

Dashboard em "Projetos ativos" não faz a DRE assumir o mesmo filtro. Budget pede
projeto explicitamente. Nenhuma escolha modifica as outras.

---

# 21. TELA PROJETOS & UNIDADES

Manter o seletor `Todos os projetos / filiais` + projetos. Serve
**exclusivamente** para navegação da própria tela. Em "Todos", projetos um
abaixo do outro; em uma obra, apenas a ficha dela. Não altera nenhuma outra tela.

**[NOTA]** O layout desta tela é escopo do **Prompt B**. Aqui só entra o
comportamento do seletor como navegação local.

---

# 22. URL PODE REPRESENTAR SELEÇÃO LOCAL

Manter seleções locais na URL: `/projeto?proj=<id>`, `/budget?project=<id>`,
`/forecast?project=<id>`, `/dre?projectScope=active` ou padrão equivalente.

Benefícios: reload, back/forward, links, múltiplas abas, ausência de estado
global escondido.

**[ACRÉSCIMO]** Padronizar o nome do parâmetro. Hoje a tela de Projetos usa
`?proj=` e este prompt sugere `?project=` para as demais. Duas convenções para a
mesma ideia envelhecem mal. Escolher uma e registrar a decisão; se a escolhida
não for `proj`, a tela de Projetos aceita as duas durante a transição.

---

# 23. STATUS NA TELA DE PROJETO

Na edição: `STATUS [ Ativo ▼ ]` com Ativo e Finalizado. Na visão de todos, badge
por projeto — Ativo em verde suave, Finalizado em cinza/neutro. O badge não
representa seleção.

---

# 24. PROJETO NOVO

Novo projeto inicia com Status = Ativo no novo atributo. Nenhum outro dado
existente é modificado para isso.

---

# 25. FINALIZAR PROJETO

`Ativo → Finalizado` atualiza **somente** o novo campo. Não toca datas, duração,
Budget, Forecast, Atual, documentos, despesas, receitas, unidades, caixa,
medições, nem qualquer outro dado.

---

# 26. REATIVAR PROJETO

`Finalizado → Ativo` permitido para quem tem permissão de edição, alterando
somente o campo correspondente.

---

# 27. AUDITORIA DA MUDANÇA DE STATUS

Registrar no log de auditoria existente, no formato
`project.status.change { from, to }`. Não criar estrutura paralela.

**[ACRÉSCIMO]** O padrão `{ from, to }` pedido aqui é o correto — e é o oposto
do que o sistema faz hoje. `updateProject` grava em `logAudit` apenas o objeto
`set`, ou seja, só os valores novos. Pelo log atual é possível saber que a data
de uma obra mudou, mas não de quê.

Aproveitar esta tarefa para aplicar `{ from, to }` a **todos** os campos de
`updateProject`, não só ao status. É a regra da casa: toda alteração registra
quem, quando, qual campo, valor anterior e valor novo. Nenhum registro de
`audit_log` já gravado é reescrito.

---

# 28. PROJETO FINALIZADO NÃO SOME DO HISTÓRICO

Continua pesquisável, consultável, presente em relatórios, na DRE, no Fluxo, nos
dados históricos e acessível pela tela Projetos. Apenas filtros decidem se
aparece.

---

# 29. NÃO ADICIONAR FILTRO "ATIVO" AUTOMATICAMENTE

Proibido acrescentar `WHERE status = 'Ativo'` às queries existentes. Isso
alteraria o resultado atual do sistema. Filtrar por Ativo/Finalizado somente
quando a tela ou o usuário solicitar explicitamente.

**[ACRÉSCIMO]** Item obrigatório do teste de regressão: rodar DRE, Fluxo de
Caixa e Consolidado antes e depois, e confirmar que os totais são idênticos. Um
filtro acidental aqui é invisível — o relatório continua abrindo e apenas devolve
um número menor.

---

# 30. TELAS OPERACIONAIS

Telas que exigem obra específica — Budget, Forecast, Medição, INCC, Unidades,
Ponto — usam seletor próprio e `projectId` explícito.

---

# 31. TELAS MULTIPROJETO

Preservar as que trabalham com várias obras: Contas a Pagar, Contas a Receber,
Dashboard, DRE, Fluxo de Caixa, Consolidado, Acerto e alguns relatórios. Não
forçar projeto único nelas.

**[NOTA]** `acerto`, `pagamento`, `despesa_parcela`, `restituicao`, `repasse` e
`compensacao` são escopadas apenas por tenant — não têm `project_id` nem
`version_id`. Elas já são multiprojeto por construção, e não devem ganhar
`projectId` obrigatório nesta refatoração.

---

# 32. DUAS ABAS DEVEM FUNCIONAR INDEPENDENTEMENTE

Teste arquitetural obrigatório. Aba 1 com Budget da OBRA 28 e aba 2 com Budget da
OBRA 32 permanecem independentes. Aba 1 com Forecast da OBRA 28 e aba 2 com DRE
de todos os projetos idem.

---

# 33. MATRIZ / FILIAIS

Não alterar a distinção entre empreendimento e office/matriz/filial além do
necessário para remover o projeto ativo global. Não transformar matriz ou filial
em contexto global.

Antes de aplicar Ativo/Finalizado a offices, verificar o comportamento atual e
documentar. Não assumir automaticamente a mesma regra.

**[NOTA]** A distinção é o enum `project.kind` (`proj` | `office`). Em produção
existe ao menos um office — "DESPESAS GERAIS MATRIZ" — que aparece hoje no
meio da lista de obras no seletor. Um escritório não "finaliza" como uma obra
finaliza; provavelmente o atributo não se aplica a ele. Documentar a decisão em
vez de herdá-la.

---

# 34. EXCLUSÃO DE PROJETO

Remover da lógica de exclusão o tratamento de "se o projeto excluído for o
ativo": não limpar `ACTIVE_PROJECT_COOKIE`, não selecionar outro projeto, não
escolher `projects[0]`, não resetar versão por causa de projeto ativo.

Não alterar as demais regras atuais de exclusão.

**[NOTA]** As demais regras ficam intocadas aqui, mas precisam ser ditas para que
ninguém as toque por engano: `deleteProject` executa exclusão **física**, e as
chaves em cascata levam junto versões, unidades, despesas, lançamentos de caixa,
medições, linhas de Budget e Forecast, permutas, reembolsos, contas a receber,
registros de ponto, serviços e a tabela INCC do projeto. Não há retorno.

A substituição por inativação é tarefa própria, futura. A proteção de interface
é escopo do **Prompt B**. Aqui: só sai o tratamento de cookie.

---

# 35. HEADER GLOBAL

Remover do cabeçalho qualquer "Projeto ativo: OBRA 28" ou equivalente. O header
pode ter empresa, busca, notificações, ajuda e usuário — nunca projeto ativo
global.

---

# 36. SIDEBAR

A sidebar não apresenta "Projeto ativo" nem seletor de projeto global. Projeto é
escolhido dentro de cada funcionalidade que precisa dele.

---

# 37. APIs E AGENTES

Auditar APIs e agentes que possam inferir projeto pelo contexto. Se já recebem
`projectId`/nome explicitamente, preservar; se usam `ctx.project` implicitamente,
refatorar. A IA nunca supõe projeto por cookie global.

**[ACRÉSCIMO]** Vale também para o Assistente IA introduzido pelo **Prompt B**:
ele recebe `projectId` explícito, validado no servidor contra o tenant, nunca
por contexto implícito.

---

# 38. ISOLAMENTO MULTI-TENANT

Crítico. A refatoração não pode reduzir a segurança atual. Toda resolução
explícita valida `project.id = projectId` **AND** `project.tenantId = tenant
atual`. Toda versão valida tenant + projeto + versão. Nunca consultar projeto só
pelo UUID.

**[ACRÉSCIMO]** Ponto conhecido a corrigir de passagem: `updateProject` e
`deleteProject` gravam com `where(eq(projects.id, projectId))`, sem `tenantId` na
cláusula. Hoje não vazam porque há guarda em memória antes, mas são a única
exceção ao padrão do sistema — e essa refatoração vai mexer exatamente nessas
duas funções. Acrescentar `tenantId` ao `where`, mantendo a guarda.

---

# 39. PERMISSÕES

Preservar RBAC e permissões atuais. Alterar Ativo/Finalizado exige permissão de
edição do projeto. Usuário sem acesso a um projeto não passa a acessá-lo por
saber o UUID.

**[NOTA]** As permissões vêm de `membership.role` (`roleEnum`, default `membro`)
com override granular em `membership.permissions` (jsonb, matriz tela → ações).
A checagem é `can(ctx.perms, "projeto", "editar")`. Ao trocar `getActiveContext`
por `getTenantContext`, `ctx.perms` precisa continuar sendo resolvido — é o
único ponto onde uma refatoração de contexto pode silenciosamente abrir acesso.

---

# 40. PROTEÇÃO DE DADOS DURANTE MIGRAÇÃO

Antes: registrar contagem de projetos, de versões, das principais tabelas de
movimento, totais financeiros importantes, documentos, relações projeto-versão e
projeto-unidades.

Depois: comparar. As informações existentes devem permanecer idênticas. A única
diferença permitida é a adição do novo campo técnico.

**[ACRÉSCIMO]** Executar a comparação com os scripts que já existem no
repositório (`scripts/varredura-*.ts` rodam contra banco real), e guardar a saída
de antes e de depois como artefato da PR. Comparação feita "no olho" não serve
de evidência.

---

# 41. NÃO RECALCULAR DADOS

Não recalcular Budget, Forecast, DRE, Fluxo de Caixa, saldos, contas a pagar e a
receber, valores de unidades, funding, medições, INCC, estoque ou conciliações.
Os cálculos futuros seguem as regras atuais.

---

# 42. NÃO RECRIAR VERSÕES

Projetos existentes já têm versões. Não recriar Budget, Forecast e Atual para
eles. Não alterar IDs de versões. Não copiar dados entre versões. Não duplicar.

---

# 43. DOCUMENTOS

Nenhum documento perde `projectId`, muda de projeto ou de tenant, é excluído,
muda `storageKey`, é reenviado ou recriado.

---

# 44. TESTES OBRIGATÓRIOS

1. tenant com vários projetos · 2. dois Ativos · 3. um Ativo e um Finalizado ·
4. vários Finalizados · 5. filtro Todos · 6. filtro Ativos · 7. filtro
Finalizados · 8. projeto específico · 9. criação de projeto · 10. criação não
altera outras telas · 11. finalizar · 12. reativar · 13. finalização não altera
dados relacionados · 14. reload com seleção em URL · 15. duas abas com projetos
diferentes · 16-19. Budget e Forecast dos projetos A e B · 20. versão de outro
projeto rejeitada · 21. `projectId` de outro tenant rejeitado · 22. cookies
antigos não afetam resultado · 23. ausência de `projectId` não escolhe
`projects[0]` · 24. telas multiprojeto seguem funcionando · 25. permissões
seguem funcionando · 26. documentos permanecem vinculados · 27. valores
financeiros idênticos · 28. contagem de registros idêntica.

**[ACRÉSCIMO]** 29. Criar projeto continua provisionando as três versões e a
tabela INCC completa. 30. DRE, Fluxo de Caixa e Consolidado devolvem totais
idênticos aos de antes (seção 29). 31. O seletor de projetos volta ordenado e
com escritórios agrupados (seção 10). 32. Sessão com cookie de versão de outro
projeto não produz resultado incoerente (seção 14).

---

# 45. TESTE DE INTEGRIDADE DOS DADOS

Comparar antes/depois: projetos (ids, nomes, datas, duração, valores, cliente,
campos financeiros); versões (ids, `projectId`, kind/key, dados relacionados);
movimentos (quantidade, `projectId`, `versionId`, valores); documentos (id,
`projectId`, `storageKey`).

Nenhum desses dados pode apresentar diferença causada pela refatoração.

**[ACRÉSCIMO]** Incluir `mes_inicial`, `mes_final`, `codigo_municipio_obra`,
`latitude`, `longitude` e o valor do `status` antigo de cada projeto.

---

# 46. CRITÉRIO DE ACEITE DE DADOS

A tarefa não está concluída se ocorrer: registro removido; valor alterado;
status antigo sobrescrito; valor financeiro recalculado; `projectId` ou
`versionId` alterado; vínculo perdido; documento desvinculado; versão duplicada;
unidade movida; despesa, receita ou histórico modificado; permissão alterada;
dado de outro tenant exposto.

100% dos dados existentes preservados.

---

# 47. CRITÉRIO DE ACEITE ARQUITETURAL

Após a implementação, não deve mais existir comportamento funcional baseado em
`ACTIVE_PROJECT_COOKIE`, `gtc_project`, `setActiveProject`, `SelectActive`,
`activeId` ou fallback `projects[0]` como mecanismo de contexto.

Projeto passa a ser parâmetro explícito, filtro explícito ou seleção local da
tela.

**[NOTA]** Este critério só é cobrável na **última** PR da sequência. Nas PRs
intermediárias, a coexistência é esperada e correta.

---

# 48. CENÁRIO FINAL ESPERADO

Dashboard com "Projetos ativos" mostra só os ativos. DRE não herda esse filtro.
Budget pede projeto explicitamente. Outra aba com Forecast de outra obra funciona
simultaneamente. Alterar OBRA 32 para Finalizado não muda nenhuma informação
financeira ou operacional dela — só a classificação, que Dashboard e relatórios
passam a poder filtrar.

---

# 49. IMPLEMENTAÇÃO EM ETAPAS

1. Mapear dependências do projeto ativo · 2. Mapear dependências do status
antigo · 3. Criar atributo Ativo/Finalizado de forma aditiva · 4. Criar contexto
tenant-only · 5. Resolução explícita de projeto · 6. Resolução explícita projeto
+ versão · 7. Migrar queries · 8. Migrar server actions · 9. Migrar páginas ·
10. Migrar APIs/agentes · 11. Remover `setActiveProject` · 12. Remover uso do
cookie · 13. Remover fallback automático · 14. Filtros Ativo/Finalizado ·
15. Testes de integridade · 16. Remover código morto após comprovar ausência de
dependências.

**[ACRÉSCIMO]** Parar ao fim da ETAPA 1 e entregar o inventário (B-A1). As
etapas 7 a 9 são as grandes: fatiar por módulo, na ordem em que o dinheiro anda
— Despesas, Caixa, Receitas, Planejamento e por último os relatórios, que só
leem.

**[ACRÉSCIMO]** Cada PR precisa ser deployável sozinha e reversível sozinha. Uma
PR que só funciona se a seguinte também for para produção não é uma etapa, é
metade de um deploy.

---

# 50. RELATÓRIO FINAL OBRIGATÓRIO

Não responder apenas "feito". Apresentar:

1. usos de projeto ativo encontrados · 2. arquivos · 3. como cada dependência foi
substituída · 4. alterações em `getActiveContext` · 5. nova estrutura de
contexto · 6. alterações de versão · 7. alterações de schema · 8. migration
criada · 9. novo campo · 10. como o status antigo foi preservado · 11. como os
projetos existentes foram tratados · 12. telas com `projectId` explícito ·
13. telas multiprojeto · 14. cookies removidos/depreciados · 15. componentes
removidos · 16. server actions alteradas · 17. queries alteradas · 18. APIs
alteradas · 19. testes · 20. resultado dos testes · 21. comparação de
integridade · 22-30. confirmações de que nada foi excluído, alterado,
recalculado, desvinculado, duplicado ou exposto, e de que o projeto ativo global
não existe mais.

**[ACRÉSCIMO]** 31. O `down` de cada migração criada. 32. Em qual PR da sequência
esta entrega se encontra e o que ainda falta. 33. Saída dos scripts de varredura
antes e depois. 34. Decisão tomada em B-A1 e B-A2, e como foi implementada.

---

# 51. REGRA FINAL

Esta é uma refatoração de arquitetura e contexto. **Não é migração de dados de
negócio.**

Se durante a implementação surgir necessidade de alterar dado existente:
**PARE. NÃO EXECUTE.** Informe qual dado, por quê, qual o impacto e qual a
alternativa não destrutiva.

A implementação só está autorizada a prosseguir se puder preservar integralmente
todos os dados já inseridos no Growth Construction.


<a id="prompt-c"></a>


========================================================================


### ▸ 6 de 42 · PROMPT C — Barra lateral e menu

**Bloco 1 · Fundação** · Bloqueios: B-C1 · B-C2 · B-C3

⟨reescrito⟩ Business Intelligence, Planejamento em 2º, e o vocabulário “projeto”.

========================================================================


# PROMPT C — REDESENHO DA BARRA LATERAL DE NAVEGAÇÃO


---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---
## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum número já lançado no sistema pode ser alterado.**
Valores, totais, percentuais, saldos, datas e quantidades existentes em
produção permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda,
converte, normaliza, migra, reclassifica ou "corrige" um número já gravado —
nem como efeito colateral de mudança de layout, de rota, de nome de campo ou de
origem de dado. Se uma alteração exigir tocar em número lançado: **PARE, não
execute, e informe qual número, por quê e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups e capturas de tela definem **layout, hierarquia visual, rótulos e
comportamento de interface** — nada além disso. São ilustrações, frequentemente
com números inconsistentes entre si.

Nunca usar de um mockup: valores monetários, percentuais, totais, saldos, datas,
prazos, nomes de obra, nomes de cliente, nomes de proprietário, endereços,
coordenadas, nomes de usuário, cargos, contadores, badges numéricos, ou qualquer
outro dado de exemplo.

Nunca criar registro, seed, fixture, valor padrão ou dado de teste a partir de
um mockup. Nenhum dado de exemplo é gravado no banco de produção em nenhuma
hipótese.

Todo número exibido em tela vem do banco. Onde não houver dado, a tela mostra
estado vazio — **nunca zero, nunca placeholder numérico, nunca o valor do
mockup**.

**Aplicação específica a este prompt:** o contador "1" no sino de notificações e
o nome de usuário exibido no cabeçalho dos mockups são ilustração. O sino
depende da decisão em B-C2; o cabeçalho exibe o usuário real da sessão.

---

Growth Construction · reorganização hierárquica do menu fixo.

> **Como ler este documento**
> As seções 1 a 26 são o prompt original.
> Marcações inseridas na revisão de código:
> **[BLOQUEIO]** decisão necessária antes de implementar ·
> **[ACRÉSCIMO]** requisito novo · **[NOTA]** informação técnica que muda o como.

**Escopo:** a barra lateral **esquerda** e o cabeçalho superior. O painel do
Assistente IA, à direita nos mockups, é escopo do **Prompt B**.

---

# ORDEM DE EXECUÇÃO — LER PRIMEIRO

Três prompts existem para esta frente, com PRs e deploys separados:

| | Prompt | O que faz | Ordem |
|---|---|---|---|
| **C** | este | Reorganiza a navegação | **1º** |
| **A** | `PROMPT-A-REFATORACAO-CONTEXTO.md` | Remove o projeto ativo global, cria status Ativo/Finalizado | **2º** |
| **B** | `PROMPT-PROJETOS-CONSOLIDADO.md` | Redesenha a tela Projetos & Unidades | **3º** |

**C vai primeiro** porque é o único dos três que não toca banco, dados, Server
Actions nem regra de negócio — o risco é o menor e o valor chega antes. Os
mockups do Prompt B já pressupõem esta barra implementada.

**Fronteira com o Prompt A:** a seção 20 deste prompt proíbe criar seletor de
projeto global na navegação. Isso está alinhado com o A e deve ser mantido
mesmo que o A ainda não tenha ido para produção — este prompt não introduz a
dependência, apenas não a cria.

**[NOTA]** Enquanto o Prompt A não estiver em produção, o projeto ativo global
continua existindo e sendo trocado pelo botão "Selecionar" da tela de Projetos.
Este prompt **não pode remover esse botão** — quem o remove é o A. Aqui, apenas
não se acrescenta seletor global algum à navegação.

---

# BLOQUEIOS — RESPONDER ANTES DE ESCREVER CÓDIGO

## B-C1 · "Diagnósticos" precisa de um terceiro nível que a estrutura não tem

**[ATUALIZADO]** `/diagnosticoia` **saiu daqui** — é subitem de Business
Intelligence, conforme a seção 3. Restam **duas** telas sob Diagnósticos, as duas
de conferência de dado lançado:

- Conferência de lançamentos — `/diagnostico/categorias-invertidas`
- Conferência de planos — `/diagnostico/planos-recebiveis`

A seção 12 define apenas dois níveis: módulo → subitem. Um terceiro nível
(módulo → subitem → tela) não está especificado e mudaria o comportamento de
expansão, o destaque de rota ativa e a navegação por teclado.

**Escolher uma:**

1. **Achatar** — as duas viram subitens diretos de Administração, com rótulos que
   se expliquem sozinhos ("Conferência de lançamentos", "Conferência de planos").
   Sem estrutura nova.
2. **Terceiro nível** — implementar aninhamento real, com regras próprias de
   expansão e destaque. Mais organizado, mais superfície para bug.

Recomendação: a **1**, e agora com folga — **duas** telas não justificam um nível
inteiro de navegação. O item "Diagnósticos" deixa de existir.

## B-C2 · Busca, notificações e ajuda existem?

O cabeçalho dos mockups traz três elementos que, até onde a revisão de código
alcançou, **não existem hoje no sistema**:

- ícone de busca
- sino de notificações, com contador "1"
- ícone de ajuda

Nenhum deles é navegação. São funcionalidades, cada uma com sua própria
especificação: o que a busca pesquisa e sob qual escopo de tenant; o que gera
notificação e quem a marca como lida; para onde a ajuda aponta.

**Escolher uma:**

1. **Fora de escopo.** Não implementar. O cabeçalho recebe apenas empresa e
   menu do usuário. Os três ganham prompt próprio depois.
2. **Placeholder visual.** Renderizar os ícones desabilitados, sem
   comportamento, apenas para o layout fechar — declarado como tal no relatório
   final.

Recomendação: a 1. Ícone que não faz nada ensina o usuário a ignorá-lo.

## B-C3 · O seletor de Empresa troca de tenant?

O cabeçalho mostra `Empresa / Construtora Piloto` com um chevron, sugerindo troca
de empresa pela interface.

Isso pode ser legítimo: `membership` tem chave primária composta
`(user_id, tenant_id)`, então um mesmo usuário pode pertencer a mais de um
tenant. Mas trocar de tenant é a operação mais sensível do sistema pela RG-10 —
nenhuma consulta pode cruzar a fronteira entre empresas, e o isolamento hoje é
sustentado consulta a consulta, sem RLS no banco.

**Responder:** o chevron abre troca de empresa, ou é apenas decoração do
cabeçalho?

Se **abre troca**, isto deixa de ser tarefa de navegação e exige, no mínimo:
resolver o tenant no servidor a cada requisição; invalidar todo cache de
página ao trocar; garantir que nenhum estado de tela anterior sobreviva à troca;
e teste explícito de que um usuário com dois tenants não vê dado do outro.
Nesse caso, tratar em prompt próprio.

Se é **decoração**, remover o chevron. Affordance que não faz nada é bug de
interface.

---

# 1. OBJETIVO DA NOVA NAVEGAÇÃO

Substituir a sidebar extensa, com dezenas de funcionalidades diretamente
expostas, por navegação hierárquica:

```
MÓDULO
    └── Tela / funcionalidade
```

Módulos são grupos expansíveis/recolhíveis:

```
Planejamento      ˄
    Projetos
    Orçamentos
    Previsão Atualizada
    Plano de Contas

Receitas          ˅
Obra              ˅
Financeiro        ˅
```

Clicar no módulo expande e recolhe, sem navegar (salvo Dashboard, conforme
seção 3). Clicar no subitem abre a rota existente.

---

# 2. ESTRUTURA DO MENU

`BUSINESS INTELLIGENCE` · `PLANEJAMENTO` · `RECEITAS` · `OBRA` ·
`FINANCEIRO` · `ADMINISTRAÇÃO`

**Esta é a ordem exata dos módulos na barra**, e é a ordem que o código deve
produzir. **A numeração das seções deste documento não é a ordem do menu** —
Planejamento é descrito na seção 6 e aparece na barra logo abaixo de Projetos.

**[DECISÃO — Business Intelligence é o primeiro módulo]** Os módulos `DASHBOARD`
e `RELATÓRIOS` deixam de existir separados. **Business Intelligence** abre a
barra e reúne o Dashboard e os demonstrativos — ver seção 3.

O motivo é o inverso do que orienta os demais módulos: os outros seguem a ordem
de uso — cadastra, orça, lança, concilia. A leitura não segue essa ordem; ela é o
primeiro lugar onde alguém olha ao abrir o sistema, e o último a ser alimentado.
Fica no topo por ser o destino, não por ser o começo.

**[DECISÃO — o módulo Projetos deixa de existir]** A tela **Projetos** passa a
ser o **primeiro subitem de Planejamento**, e **Unidades** e **Simulador** vão
para **Receitas**. Ver as seções 4, 5 e 6.

O raciocínio: cadastrar a obra é o primeiro ato do planejamento dela — sem
período, valor global e metragem, não há grade mensal de orçamento nem janela de
competências. E Unidades e Simulador são venda: uma cadastra o que se vende, a
outra precifica a proposta.

Com isso o menu passa a acompanhar a direção em que o dinheiro anda —
planejamento → receita → despesa → caixa → obra —, que é o mesmo princípio do
roteiro de revisão. Business Intelligence abre a barra por ser o destino de
tudo, não o começo.

Não utilizar o título "Comercial". O nome aprovado é **RECEITAS**.

**[DECISÃO — "obra" é dado do cliente, "projeto" é o termo do produto]**

A Cliente Piloto nomeia os próprios cadastros como *Obra 21*, *Obra 22*. **Isso é conteúdo
que o usuário digitou no campo nome**, e é assim que deve aparecer — tal como
foi cadastrado.

**A interface e a estrutura do sistema usam "projeto".** Rótulo de campo,
cabeçalho de coluna, texto de ajuda, estado vazio, mensagem de erro, nome de
tela e de módulo: **projeto**, nunca "obra". Escrever "obra" na interface é
adotar o vocabulário de um cliente como se fosse do produto — e o próximo
cliente chama de empreendimento, de loteamento ou de contrato.

Vale para os documentos também: "2 de 2 obras" vira "2 de 2 projetos", "margem
por obra" vira "margem por projeto".

**As exceções são termos técnicos que não significam projeto**, e permanecem:
mão de obra, Mestre de Obra, Encarregado de obra, grupo de obra (CEF), medição
de obra, evolução física da obra, e os nomes de tela já aprovados na tabela de
nomenclatura — **Liberações de Obra** e **Medição de Obra**.

**[EM ABERTO — o módulo chamado "Obra"]** Pela regra acima, o nome do módulo da
seção 7 está no vocabulário errado. Mas ele não agrupa "projetos": agrupa a
**execução física** — medição, estoque, ponto, INCC. Trocar para "Projeto"
colidiria com o que já vive em Planejamento.

Decidir entre manter **Obra** como termo técnico de execução, ou adotar
**Execução**. Não decidir por conta própria durante a implementação.

**[ACRÉSCIMO — inventário conferido]** A revisão comparou a estrutura nova
contra as 40 telas hoje presentes na navegação. **As 40 têm destino; nenhuma se
perde.** Três observações sobre o resultado desse mapeamento, nas seções 9, 10 e
19.

---

# 3. BUSINESS INTELLIGENCE

**Primeiro módulo da barra.**

```
Business Intelligence
    Dashboard                /dashboard
    Relatórios customizados  → Prompt AA, Parte 7
    DRE                      /dre
    Fluxo de Caixa           /fluxocaixa
    Consolidado              /consolidado      ← ver o conflito abaixo
    Resumo Executivo         /resumo
    Diagnóstico de IA        /diagnosticoia
```

Reaproveitar as rotas existentes. **Nenhum cálculo, critério ou consulta muda por
esta tarefa** — é agrupamento de navegação.

**[DECISÃO — Diagnóstico de IA vem para cá]** `/diagnosticoia` sai de
Administração e passa a ser subitem de Business Intelligence. **Isso resolve
parte do B-C1:** das três telas que ficariam sob "Diagnósticos", uma muda de
módulo, e restam duas — as conferências, que são de dado lançado e continuam em
Administração.

**Três cuidados que a mudança de módulo não dispensa:**

**a)** A tela guarda **configuração de provedor e credenciais** de IA. Mudar de
módulo não muda quem pode vê-la — a permissão continua a mesma, verificada no
servidor. **Confirmar qual chave de `SCREENS` a governa**, e que ela não passou a
herdar a permissão de leitura dos demonstrativos: quem vê a DRE não pode, por
isso, ver credencial.

**b)** O **Prompt E**, no BE-1, trata `/diagnosticoia` como a infraestrutura que o
assistente reaproveita. A mudança de módulo não altera nada disso — é
apresentação.

**c)** O rótulo permanece **"Diagnóstico de IA"**. Dentro de um módulo chamado
Business Intelligence, "Diagnóstico" sozinho seria lido como análise de negócio, e
é configuração.

**[CONFLITO A RESOLVER — Consolidado]** O **Prompt AB** remove `/consolidado`,
junto com `/projecao` e `/balancodia`. Esta seção o lista dentro de Business
Intelligence. **As duas decisões não podem valer ao mesmo tempo.**

Resolver antes de implementar qualquer uma das duas:

1. **O Consolidado fica** — e o Prompt AB passa a remover só `/projecao` e
   `/balancodia`. Então o Consolidado precisa ser revisado, porque hoje ele
   apresenta receita por fonte de recurso, vocabulário que a seção 57 do
   **Prompt I** descontinua.
2. **O Consolidado sai** — e o que você quer dentro de Business Intelligence é a
   **comparação de cenários**, que passa a existir na DRE pela Parte 1 do
   **Prompt AC** e no relatório customizado pela Parte 7 do **Prompt AA**.

**Recomendação: a 2.** O que o Consolidado faz de útil — comparar versões
consolidando várias obras — é exatamente o que a Parte 1 do Prompt AC entrega,
sem o vocabulário de fonte de recurso.

**[NOTA — o que NÃO vem para cá]**

**Medição de Obra** permanece em **Obra** — as duas rotas, `/medicao` e
`/medicaolanc`, agora reunidas num item só. É o relatório que o cliente imprime e
entrega à Caixa, colado ao lançamento que o alimenta; e é o único módulo a que o
engenheiro tem acesso. Ver seção 7.

**Contabilidade** (`/contabilidade`) vai para **Administração**, não para cá. É a
tela de acesso somente-leitura do contador externo: administração de acesso, não
demonstrativo. Ver a seção 9.

**[NOTA]** O Dashboard deixa de ser módulo próprio. O clique no módulo Business
Intelligence expande e recolhe, como os demais — não navega.

---

# 4. PROJETOS — MÓDULO EXTINTO

**O módulo Projetos deixa de existir.** Suas três telas continuam existindo, com
as mesmas rotas, em outros módulos:

| Tela | Rota | Novo módulo |
|---|---|---|
| Projetos | `/projeto` | **Planejamento**, primeiro subitem — seção 6 |
| Unidades / Vendas | `/unidades` | **Receitas** — seção 5 |
| Simulador | `/simulador` | **Receitas** — seção 5 |

Utilizar as funcionalidades e rotas já existentes. Não recriar nada, não renomear
nada, não mover arquivo.

**[NOTA]** A rota é `/projeto`, no singular, embora o rótulo seja "Projetos". A
seção 22 proíbe renomear URL para acompanhar rótulo — está correto assim, e
continua assim depois da mudança de módulo.

**[ACRÉSCIMO]** O item Unidades exibe hoje um contador no menu ("Unidades /
Vendas 1"). A seção 11 proíbe contadores **nos módulos**; este é de subitem.
Decidir explicitamente se ele fica ou sai, e registrar a decisão. Sair por
omissão é perda silenciosa de informação que alguém colocou ali de propósito.

---

# 5. RECEITAS

```
Receitas
    Clientes               /clientes
    Unidades               /unidades
    Simulador              /simulador
    Contas a Receber       /contasreceber
    Liberações de Obra     /reembolso
    Permutas               /permuta
```

Clientes representa os clientes/compradores já existentes.

**[ATUALIZADO]** **Unidades e Simulador vêm para cá**, do extinto módulo Projetos
— ver seção 4. Os dois são venda: Unidades cadastra o que se vende, o Simulador
precifica a proposta.

**A ordem dos seis subitens segue o ciclo da venda** — cadastra o comprador,
escolhe a unidade, simula o plano, acompanha o recebível, registra a liberação e
a permuta. É escolha, não acaso; se a operação usa outra ordem, ela manda.

**[NOTA]** `/projecao` sai do menu — a tela é removida pelo **Prompt AB**.

---

# 6. PLANEJAMENTO

**Posição na barra: segundo módulo**, logo abaixo de Business Intelligence — ver
a decisão registrada na seção 2.

```
Planejamento
    Projetos               /projeto
    Orçamentos             /budget
    Previsão Atualizada    /forecast
    Plano de Contas        /planocontas
```

**[ATUALIZADO]** **Projetos é o primeiro subitem**, vindo do extinto módulo
Projetos — ver seção 4. Cadastrar a obra é o primeiro ato do planejamento dela:
sem `start_date` e `end_date`, não há grade mensal de orçamento nem janela de
competências (seção 55 do **Prompt I**), e as telas de Orçamentos e Previsão
abrem em estado vazio.

**Os rótulos de `/budget` e `/forecast`** são **Orçamentos** e **Previsão
Atualizada**, conforme a tabela de nomenclatura. Quem renomeia é o Prompt D; esta
tarefa apenas não usa os nomes antigos.

**O Consolidado sai daqui** — vai para Business Intelligence, ou deixa de
existir, conforme o conflito registrado na seção 3.

Não modificar regras de Budget, Forecast ou versões nesta tarefa.

---

# 7. OBRA

```
Obra
    Medição de Obra        /medicao e /medicaolanc
    Estoque                /estoque
    Ponto                  /ponto
    Parâmetros / INCC      /parametros
```

**[DECISÃO — as duas telas de medição viram um item só]** "Medição" e
"Lançamento de Medição" eram adjacentes, com rótulos quase idênticos e
comportamentos opostos — uma é relatório para a CEF, a outra grava. Renomear os
dois rótulos era remendo para o problema.

**As duas telas passam a ser uma, com abas** — Nova medição, Medições lançadas e
Relatório CEF —, e o menu tem **um item: "Medição de Obra"**. A seção 0 do
**Prompt V** é a dona dessa fusão.

**As duas rotas permanecem** e continuam respondendo: rota é identificador
estável, e há permissão, link e `revalidatePath` apontando para elas. A rota de
origem define a aba inicial.

**[DECISÃO — as duas ficam em Obra]** Nem o lançamento nem o Relatório CEF vão
para Business Intelligence, apesar de o segundo ser um relatório. Dois motivos:

- **o relatório está colado ao lançamento que o alimenta** — separá-los recria,
  em dois módulos, a confusão que a fusão resolve;
- **é o recorte de permissão que sustenta o módulo.** O engenheiro tem acesso à
  medição e a nada mais. Levar metade dela para o módulo de leitura financeira
  espalharia esse recorte por dois lugares.

É a exceção declarada na seção 3 — ver a nota sobre o que não vem para Business
Intelligence.

---

# 8. FINANCEIRO

```
Financeiro
    Despesas / Lançamentos /despesas
    Contas a Pagar         /contaspagar
    Caixa                  /caixa
    Contas Correntes       /contas
    Fechamento de Caixa    /fechamento
    Balanço do Dia         /balancodia
    Acerto Contábil        /acerto
    Restituições           /restituicoes
    Fornecedores           /fornecedores
```

Manter os comportamentos atuais de todas. Esta alteração é somente de
organização da navegação.

**[ACRÉSCIMO]** Nove subitens em ordem sem critério aparente, misturando
lançamento diário (Despesas, Caixa), conciliação (Fechamento, Balanço),
cadastro (Contas Correntes, Fornecedores) e regularização (Acerto,
Restituições). Agrupar por frequência de uso, com o que a controladoria abre
todo dia no topo. Não é mudança de estrutura, é ordem da lista.

---

# 9. RELATÓRIOS — MÓDULO EXTINTO

**O módulo Relatórios deixa de existir.** DRE, Fluxo de Caixa e Resumo Executivo
passam para **Business Intelligence** (seção 3), junto com o Dashboard.

Telas cujo uso atual seja claramente de demonstrativo e que não estejam em outro
módulo por bom motivo vão para lá. Não alterar cálculos nem critérios nesta
tarefa.

**[RESOLVIDO — "Contabilidade" estava no módulo errado]** `/contabilidade` é a
tela **Acesso Contabilidade**: concede acesso somente-leitura ao contador
externo. É administração de acesso, não relatório — um usuário procurando um
demonstrativo encontraria uma tela de permissão.

**Vai para Administração**, seção 10. Se a intenção era ser o ponto de entrada do
contador, o rótulo precisa dizer isso — "Acesso do contador".

**[NOTA — os relatórios deixam de estar espalhados]** Antes desta decisão eles
ficavam em cinco módulos. Agora ficam em Business Intelligence, com **duas
exceções declaradas**: Medição de Obra em Obra e Contabilidade em Administração,
pelos motivos da seção 3.

Projeção de Receitas e Balanço do Dia saem do sistema pelo **Prompt AB**, e o
Consolidado depende do conflito registrado na seção 3.

---

# 10. ADMINISTRAÇÃO

```
Administração
    Empresa                /empresa
    Usuários               /usuarios
    Gestão de Acessos      /acessos
    Auditoria / Ações      /acoes
    Versões                /versao
    Numeração              /numeracao
    Backup                 /backup
    Diagnósticos           → ver B-C1
```

Dentro de Diagnósticos, preservar as ferramentas existentes, incluindo as
conferências e o diagnóstico de IA. Não expor telas administrativas a quem hoje
não tem autorização.

**Ver B-C1** para a estrutura de Diagnósticos.

**[ACRÉSCIMO — "Versões" entra no menu vindo de fora dele]** `/versao` hoje não
está na navegação; é sub-rota acessada por dentro do fluxo. Além de configurar a
versão, ela contém a **importação de dados por planilha** — a porta de entrada de
dado em massa do sistema, com o maior potencial de estrago e a menor visibilidade.

Promovê-la ao menu principal é decisão legítima, mas aumenta a exposição. Se
for mantida, exigir que a permissão de acesso seja no mínimo tão restrita quanto
hoje, e registrar no relatório final quais papéis passam a enxergá-la.

**[NOTA]** "Numeração" é a tela **Numeração de Despesas**, que governa o PED —
o número interno sequencial e imutável da despesa. O rótulo abreviado perde essa
informação. Sugerir "Numeração de despesas".

---

# 11. NÃO MOSTRAR CONTADORES NOS MÓDULOS

Não apresentar números ao lado dos módulos (`Receitas 5`, `Financeiro 9`, etc.).
No lugar, apenas a seta/chevron indicando existência de subitens.

```
Fechado:  Receitas        ˅
Aberto:   Receitas        ˄
              Clientes
              Contas a Receber
              ...
```

**[NOTA]** Ver o acréscimo da seção 4 sobre o contador existente no subitem
Unidades — esta seção trata de contadores de módulo, não de subitem.

---

# 12. COMPORTAMENTO DOS MÓDULOS

Fechado: ícone, nome do módulo, seta para baixo.
Aberto: seta para cima, subitens abaixo, recuo horizontal, hierarquia visual
clara.

O módulo que contém a tela aberta permanece expandido, e o subitem da rota atual
permanece destacado.

**[ACRÉSCIMO — casamento da rota ativa]** O destaque **não pode** usar
comparação exata de caminho. Existem sub-rotas fora do menu que precisam manter
o pai destacado:

| Rota | Subitem que deve ficar ativo |
|---|---|
| `/clientes/novo`, `/clientes/[id]` | Clientes |
| `/unidades/nova`, `/unidades/[id]` | Unidades (Receitas) |
| `/permuta/novo` | Permutas |
| `/reembolso/novo` | Reembolsos |
| `/diagnostico/*` | Diagnósticos (ou o item correspondente) |
| `/perfil` | nenhum — ver seção 19 |

Usar casamento por prefixo, com atenção a `/contas` e `/contaspagar` e
`/contasreceber`, que compartilham prefixo e **não** podem se destacar
mutuamente. `/medicao` e `/medicaolanc` têm o mesmo problema.

---

# 13. DESTAQUE DO ITEM ATIVO

**Módulo ativo:** fundo azul/lilás muito suave; ícone e texto na cor principal
da marca; barra vertical discreta à esquerda, se compatível com o design.

**Subitem ativo:** fundo ainda mais discreto; texto na cor principal;
ponto/círculo à esquerda ou equivalente; sem exagero de peso visual.

Deve ser evidente em qual módulo e em qual tela o usuário está.

---

# 14. BARRA FIXA

A sidebar permanece fixa à esquerda durante a navegação: o conteúdo rola, a
barra não. Se a lista exceder a viewport, permitir scroll interno da própria
sidebar, sem mover o conteúdo principal, mantendo o cabeçalho da sidebar
estável quando possível.

---

# 15. RECOLHER MENU

Manter `[ < ] Recolher menu` na parte inferior.

Ao recolher: reduzir largura, manter apenas ícones dos módulos, preservar
tooltips com o nome, não perder o estado da página atual.
Ao expandir: restaurar nomes, módulo aberto e destaque do subitem.

**[ACRÉSCIMO]** O estado recolhido/expandido é **preferência de interface do
usuário**, não contexto de negócio. Pode ser persistido em cookie ou
`localStorage`, e nesse caso deve ser por usuário e por navegador, sem qualquer
efeito sobre dados, tenant, projeto ou versão. Não misturar com os cookies de
contexto tratados no Prompt A.

---

# 16. ESTADO DOS GRUPOS

Somente o módulo da tela atual precisa ficar obrigatoriamente aberto. O usuário
pode abrir outros manualmente. Não é necessário fechar os demais ao abrir um,
desde que a sidebar não fique poluída. Ao navegar, garantir que o módulo
correspondente esteja visível e expandido.

Evitar mudanças bruscas ou "pulos".

---

# 17. ÍCONES

Ícones simples e consistentes por módulo: Dashboard → casa; Projetos →
edifício; Receitas → recebimento; Planejamento → calculadora; Obra →
ferramentas; Financeiro → caixa; Relatórios → gráfico; Administração →
engrenagem.

Usar a biblioteca já adotada pelo projeto. **Não adicionar dependência nova só
para trocar ícones.**

**[NOTA]** O projeto já usa `lucide-react`. Usar ela.

---

# 18. CORES

Sidebar com fundo muito claro, suavemente diferenciada da área principal;
azul/índigo como cor principal; estados ativos em azul/lilás suave; bordas
discretas; sem fundo preto; sem excesso de cores entre módulos.

As cores de Receitas, Custos e afins pertencem às telas internas e não devem
virar cor de módulo na sidebar. A sidebar permanece neutra e consistente.

---

# 19. EMPRESA

Preservar a identificação da empresa/tenant, que pode continuar no cabeçalho
superior no novo padrão. A sidebar não precisa duplicar.

**Ver B-C3** antes de implementar o chevron ao lado do nome da empresa.

**[ACRÉSCIMO — não perder Sair nem Perfil]** A sidebar atual traz, no rodapé, o
avatar do usuário, o papel (`owner`), o link para `/perfil` e o botão **Sair**.
Nos mockups, tudo isso migrou para o canto superior direito.

A migração é aceitável, mas **Sair e Perfil não podem desaparecer**. Ambos
precisam continuar alcançáveis em no máximo dois cliques, inclusive com a
sidebar recolhida e em viewport pequena. O relatório final deve declarar onde
cada um ficou.

**[ACRÉSCIMO — o aviso de fechamento de semestre]** Existe hoje um banner no
topo do conteúdo: "O 1º semestre de 2026 (Jan–Jun) se encerrou. Faça o backup
(planilha + documentos do período) — nada é apagado", com botão "Ir para Backup"
e opção Dispensar.

Ele não aparece nos mockups. Confirmar que continua existindo e onde. É o
mecanismo que lembra o cliente de arquivar o período; perdê-lo numa mudança de
layout é perder um controle, não um enfeite.

---

# 20. REMOVER O CONCEITO DE "PROJETO ATIVO" DA NAVEGAÇÃO GLOBAL

Não deve existir na nova navegação seletor, badge ou sinalizador de "Projeto
ativo" como contexto global — nem na sidebar, nem no cabeçalho, nem próximo ao
nome da empresa, nem como elemento global.

O conceito antigo será removido em tarefa estrutural específica. Na nova
arquitetura, cada tela que precisar de projeto usa seu próprio seletor
explícito.

Não criar nova dependência de projeto selecionado globalmente nesta
implementação.

**[NOTA]** A tarefa estrutural referida é o **Prompt A**. Ver "Ordem de
execução" no topo: este prompt não introduz a dependência, e também não remove a
que existe — quem remove é o A.

---

# 21. PERMISSÕES

Crítico. A reorganização não pode quebrar o RBAC existente.

Sem permissão de visualização para uma tela: não exibir o subitem. Módulo sem
nenhum subitem visível: ocultar o módulo inteiro. Não alterar as regras atuais
de autorização — apenas reaproveitar.

**[ACRÉSCIMO — mapa de recurso obrigatório]** A checagem hoje é
`can(ctx.perms, "<recurso>", "ver")`, e o nome do recurso é uma string por tela
(por exemplo `"projeto"`). O menu novo precisa da tabela completa **rótulo →
rota → nome do recurso**, entregue no relatório final.

Errar um nome de recurso tem dois modos de falha, ambos silenciosos: o item some
para todo mundo, ou aparece para todo mundo.

**[ACRÉSCIMO — esconder não é proteger]** Ocultar item de menu é conveniência,
nunca controle de acesso. Toda página precisa manter sua própria verificação no
servidor — hoje `if (!can(...)) return <AccessDenied />`. Nenhuma dessas
verificações pode ser removida sob o argumento de que o menu já esconde a tela:
a rota continua acessível por URL direta.

---

# 22. ROTAS

Não alterar URLs para acompanhar os novos nomes do menu. Se a funcionalidade
está em `/contaspagar`, continua em `/contaspagar`.

O menu é camada de organização e apresentação. Não criar redirects
desnecessários, não duplicar páginas, não mover dados, não criar versões
paralelas das telas.

---

# 23. RESPONSIVIDADE

Desktop: sidebar fixa expandida por padrão.
Telas menores: pode virar drawer/off-canvas, preservando a estrutura módulos →
subitens, garantindo acesso a todas as funcionalidades. Nunca esconder
permanentemente função por redução de viewport.

---

# 24. ACESSIBILIDADE

Módulos expansíveis devem funcionar por teclado, indicar expanded/collapsed, ter
área de clique confortável, contraste suficiente e foco visível. Usar
`aria-expanded` e `aria-controls` quando adequado.

---

# 25. NÃO REGRESSÃO

Esta mudança não pode apagar funcionalidade; alterar banco ou dados; modificar
DRE, Fluxo de Caixa, Budget, Forecast, contas a pagar ou receber, conciliação,
projetos, unidades, permissões, documentos, lógica financeira, lógica de versões
ou regras de tenant.

O objetivo é somente: reorganizar a navegação; aplicar o novo layout da sidebar;
introduzir módulos expansíveis; melhorar a localização das funcionalidades.

**[ACRÉSCIMO]** Nenhuma migração de banco nesta tarefa. Se surgir necessidade
de alterar schema para implementar navegação, **PARE** — é sinal de que algo
fora de escopo entrou junto.

---

# 26. VALIDAÇÃO FINAL OBRIGATÓRIA

1. Listar todas as rotas/telas da navegação antiga · 2. Onde cada uma passou a
aparecer · 3. Confirmar que nada se perdeu · 4. Testar abrir/fechar módulos ·
5. Navegação de cada subitem · 6. Indicação da rota ativa · 7. Menu recolhido e
expandido · 8. Permissões diferentes · 9. Scroll da sidebar · 10. Desktop e
viewport menor · 11. Confirmar ausência de "projeto ativo" global ·
12. Arquivos modificados.

Não fazer alterações fora do escopo sem informar.

**[ACRÉSCIMO]** 13. Tabela rótulo → rota → nome do recurso de permissão, das 40
telas. 14. Confirmação de que Sair e Perfil continuam alcançáveis, e onde.
15. Confirmação de que o banner de fechamento de semestre continua funcionando.
16. Teste do destaque ativo nas sub-rotas listadas na seção 12, incluindo os
pares que compartilham prefixo (`/contas` × `/contaspagar` × `/contasreceber`;
`/medicao` × `/medicaolanc`). 17. Decisões tomadas em B-C1, B-C2 e B-C3, e como
foram implementadas. 18. Destino do contador do subitem Unidades. 19. Papéis que
passam a enxergar `/versao` no menu. 20. Confirmação de que nenhuma verificação
`can()` de página foi removida.

---

# 27. [ACRÉSCIMO] MAPEAMENTO CONFERIDO — 40 TELAS

Conferência feita na revisão. Todas as telas hoje na navegação têm destino na
estrutura nova. Usar como lista de verificação do item 1 da seção 26.

| Tela hoje | Rota | Módulo novo |
|---|---|---|
| Dashboard | `/dashboard` | Dashboard |
| Resumo Executivo | `/resumo` | Dashboard |
| Projetos | `/projeto` | **Planejamento** → seção 6 |
| Unidades / Vendas | `/unidades` | **Receitas** → seção 5 |
| Simulador | `/simulador` | **Receitas** → seção 5 |
| Clientes (Compradores) | `/clientes` | Receitas |
| Contas a Receber | `/contasreceber` | Receitas |
| Projeção de Receitas | `/projecao` | Receitas |
| Reembolso | `/reembolso` | Receitas |
| Permuta | `/permuta` | Receitas |
| Lançamento Budget | `/budget` | Planejamento |
| Lançamento Forecast | `/forecast` | Planejamento |
| Plano de Contas | `/planocontas` | Planejamento |
| Consolidado | `/consolidado` | Planejamento |
| Medição de Obra | `/medicao` | Obra — aba Relatório CEF do item único |
| **Funcionários** | `/funcionarios` | **Pessoas** (módulo novo) |
| **Equipes de Projetos** | `/equipes` | **Pessoas** (módulo novo) |
| Lançamento de Medição | `/medicaolanc` | Obra — abas Nova medição e Medições lançadas |
| Controle de Estoques | `/estoque` | Obra |
| Ponto da Obra | `/ponto` | Obra |
| Parâmetros / INCC | `/parametros` | Obra |
| Despesas / Lançamentos | `/despesas` | Financeiro |
| Contas a Pagar | `/contaspagar` | Financeiro |
| Caixa | `/caixa` | Financeiro |
| Contas Correntes | `/contas` | Financeiro |
| Fechamento de Caixa | `/fechamento` | Financeiro |
| Balanço do Dia | `/balancodia` | Financeiro |
| Acerto Contábil | `/acerto` | Financeiro |
| Restituições | `/restituicoes` | Financeiro |
| Fornecedores | `/fornecedores` | Financeiro |
| DRE | `/dre` | Relatórios |
| Fluxo de Caixa | `/fluxocaixa` | Relatórios |
| Acesso Contabilidade | `/contabilidade` | Relatórios — ver seção 9 |
| Empresa | `/empresa` | Administração |
| Usuários & Acessos | `/usuarios` | Administração |
| Gestão de Acessos | `/acessos` | Administração |
| Log de Auditoria | `/acoes` | Administração |
| Numeração de Despesas | `/numeracao` | Administração |
| Backup & Arquivamento | `/backup` | Administração |
| Diagnóstico de IA | `/diagnosticoia` | **Business Intelligence** → seção 3 |
| Conferência de lançamentos | `/diagnostico/categorias-invertidas` | Administração → ver B-C1 |
| Conferência de planos | `/diagnostico/planos-recebiveis` | Administração → ver B-C1 |

**Entra no menu vindo de fora dele:** `/versao` (Versões) — ver seção 10.

**Permanecem fora do menu, alcançadas por dentro do fluxo:** `/perfil`,
`/clientes/novo`, `/clientes/[id]`, `/unidades/nova`, `/unidades/[id]`,
`/permuta/novo`, `/reembolso/novo`. Nenhuma delas pode perder o destaque do
subitem pai — ver seção 12.


<a id="prompt-m"></a>


========================================================================


### ▸ 7 de 42 · PROMPT M — Permissões e Clientes

**Bloco 1 · Fundação** · Bloqueios: BM-1 · BM-2 · BM-3

O BM-3 trava AO e AK.

========================================================================


# PROMPT M — PERMISSÕES E CADASTRO DE CLIENTES

Growth Construction · aplicação da política de acesso e a tela `/clientes`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Nomes, documentos,
valores, status e vínculos existentes permanecem exatamente como estão. Nenhuma
tarefa recalcula, converte, normaliza, migra ou "corrige" um registro já
gravado. Se uma alteração exigir tocar em dado existente: **PARE, não execute, e
informe qual dado, por quê, quantos registros e qual a alternativa não
destrutiva.**

**2 · Nada vindo de mockup entra no código.** Nomes, CPFs, cidades e valores dos
mockups são ilustração. Nunca viram seed, fixture ou dado de teste.

**3 · Dado pessoal de terceiro tem tratamento próprio.** Esta tarefa lida com
CPF, renda, saldo de FGTS, score de crédito e restrições de compradores. Nada
disso é copiado para log, para mensagem de erro, para arquivo temporário nem
para contexto de modelo de IA.

---

# DUAS ENTREGAS, DOIS DEPLOYS

**PARTE 1 — Permissões.** Seções 1 a 4. Corrige aplicação de política que já
existe. Pequena, urgente, independente. **Vai sozinha.**

**PARTE 2 — Tela Clientes.** Seções 5 a 9. Correções da revisão e assistente.
Depende da Parte 1 para a permissão de campo sensível.

---

# BLOQUEIOS

## BM-1 · `acerto` e `diagnostico` estão fora da matriz

`SCREENS`, em `permissions.ts`, tem 38 entradas. **Faltam `acerto` e
`diagnostico`.** Como `can` devolve `false` para tela desconhecida
(`perms[screenId]?.[action] ?? false`), há dois cenários possíveis:

- as páginas **chamam** `can` — e então Acerto Contábil e as duas telas de
  Conferência estão bloqueadas para todos, inclusive owner;
- as páginas **não chamam** — e então estão abertas para todos, inclusive
  contador e engenheiro.

**Verificar e reportar antes de qualquer alteração.**

**[NOTA — cuidado ao acrescentar]** Incluir uma tela em `SCREENS` **muda a
permissão efetiva de todo mundo**, porque `defaultPermissions` percorre a lista:
`membro` passaria a ter `EDIT` numa tela em que hoje talvez não tenha, e
`contador` passaria a ter `NONE` explícito. **Reportar o diff de permissão
efetiva por papel antes de aplicar.**

## BM-2 · Qual tela de medição o engenheiro vê

A matriz concede **`medicaolanc`** — Lançamento de Medição, onde ele registra o
avanço. Existe também **`medicao`** — o relatório Medição de Obra, que compara
orçado e realizado e é o que vai para a CEF.

**Responder:** ele deve ver só a primeira, ou as duas? Se for só a primeira, a
matriz já está correta e nada muda.

## BM-3 · Quais campos vão para o nível sensível

Proposta, a confirmar campo a campo:

**Nível cadastral e fiscal** — visível a quem tem `clientes.ver`:
nome, CPF/CNPJ, unidade vinculada, status do contrato, endereço, cidade/estado,
CEP, e-mails, celular, telefone, nascimento, nacionalidade.

**Nível sensível** — exige permissão própria:
renda bruta, renda líquida, comprometimento, possui FGTS, saldo de FGTS, score
de crédito, restrições, estado civil, e o bloco inteiro de inteligência de
mercado — ramo de atividade, cargo, área de atuação, empresa, regime de
trabalho, local de trabalho, tempo de empresa, possui imóvel, motivação de
compra, como conheceu, indicado por, interesse, observações estratégicas.

**Responder também:** quem recebe a permissão nova por padrão. Recomendação:
apenas `owner` e `admin`; `membro` não.

---

# PARTE 1 — PERMISSÕES

# 1. A POLÍTICA JÁ ESTÁ CERTA

`defaultPermissions` é explícita e corresponde ao que o negócio quer:

| Papel | Acesso |
|---|---|
| `owner`, `admin` | tudo |
| `membro` | edição em tudo que não é Config |
| `engenheiro` | apenas `medicaolanc` — todo o resto negado |
| `contador` | leitura de `dre`, `fluxocaixa`, `medicao`, `resumo`, `consolidado`, `planocontas`, `despesas`, `acoes` |

**`clientes` não está no conjunto do contador nem do engenheiro.**

**Esta tarefa não altera a matriz.** Ela faz as telas obedecerem à matriz que já
existe.

---

# 2. TELAS QUE NÃO VERIFICAM PERMISSÃO

## 2.1 · O furo

Três telas vão direto do contexto para a consulta, **sem chamar `can`**:

| Tela | Arquivo | O que expõe |
|---|---|---|
| `/clientes` | `clientes/page.tsx:61-65` | lista com CPF completo de todos os compradores |
| `/clientes/[id]` | `clientes/[id]/page.tsx:217-229` | ficha inteira: renda, FGTS, score, restrições |
| `/contabilidade` | `contabilidade/page.tsx:204-217` | resultado do projeto e a lista de contadores com e-mail |

Contador e engenheiro têm `clientes` **negado** na matriz e abrem as duas telas
normalmente, digitando a URL. A política existe e não é aplicada.

## 2.2 · A correção

Acrescentar a verificação de `ver` no padrão que o resto do sistema usa, com o
componente `AccessDenied`. Nas telas de cliente, a verificação vale também para
a rota de criação.

## 2.3 · Auditoria do mesmo furo em todo o app

**Não corrigir só as três.** Percorrer **todas** as rotas de `(app)` e reportar
quais não chamam `can(..., "ver")` antes de consultar dado.

Entregar a lista antes de aplicar as correções. Este é o item de maior valor da
tarefa: três foram encontradas por amostragem, e o padrão pode se repetir.

---

# 3. TELAS FORA DA MATRIZ

**Ver BM-1.** Depois da verificação, incluir `acerto` e `diagnostico` em
`SCREENS`, com módulo coerente — `acerto` em Despesas, `diagnostico` em Config.

**Antes de aplicar, reportar o diff de permissão efetiva por papel.** Incluir
uma tela na lista muda o default de todos.

**[ACRÉSCIMO]** Acrescentar um teste que compare `SCREENS` com as rotas
existentes em `(app)` e falhe quando houver rota governável fora da lista. É o
que impede o furo de voltar na próxima tela criada.

---

# 4. `/contabilidade` USA CONTEXTO GLOBAL

A tela lê `getDespesas(ctx.version.id)` e
`getMonthlyRevenue(ctx.version.id, ctx.project.id)`. Os três cards — Receita
projetada, Despesas lançadas e Resultado — mostram **um projeto só**, com a
versão que estiver no cookie, que pode ser Budget.

A tela se chama "Acesso Contabilidade" e sugere visão da empresa.

**Nesta tarefa:** acrescentar a verificação de permissão e **rotular o que está
sendo exibido** — qual projeto e qual versão. A troca do contexto global por
seleção explícita pertence ao **Prompt A**; não implementar aqui.

**[NOTA]** O contador vê `acoes`, o log de auditoria, que registra alterações de
todas as telas — inclusive as que ele não pode ver. Verificar se o log expõe
conteúdo ou apenas metadado, e reportar. Se expuser conteúdo de cliente, é furo
equivalente ao da seção 2.

---

# PARTE 2 — TELA CLIENTES

# 5. PROTEÇÃO DE DADO PESSOAL

**5.1 · CPF mascarado na listagem.** Exibir apenas os dígitos centrais, no padrão
`•••.123.456-••`. O documento completo aparece na ficha, e só para quem tem a
permissão de campo sensível.

**5.2 · Validação de formato na entrada.** CPF e CNPJ validados ao gravar.
**Nenhum valor já gravado é convertido, normalizado ou rejeitado
retroativamente** — cadastro antigo fora do padrão continua legível e editável, e
aparece sinalizado.

**5.3 · Sem unicidade automática.** Não criar constraint `UNIQUE` sobre
`cpf_cnpj` nesta tarefa: pode haver duplicatas legítimas ou dado sujo em
produção. Reportar as duplicatas encontradas; a decisão é humana.

**5.4 · Campos sensíveis atrás de permissão.** Conforme BM-3. Quem não tem a
permissão **não recebe os valores do servidor** — não basta ocultar na
interface. A consulta seleciona só as colunas permitidas.

**5.4.1 · Na ficha, os dois blocos sensíveis são identificados.** "Dados
financeiros" e "Inteligência de mercado" exibem, no cabeçalho da seção, a
indicação de que exigem permissão própria. Quem não a tiver **não vê os blocos**
— não os vê vazios, nem desabilitados: eles não existem na resposta.

**5.4.2 · Campo vazio é vazio.** Renda, FGTS e score não preenchidos exibem
estado vazio, nunca `0,00`. Zero é uma afirmação sobre a renda de uma pessoa.

**5.5 · `getClientes` deixa de trazer 39 colunas** para renderizar seis.
Selecionar o necessário.

---

# 6. CORREÇÕES DA REVISÃO

**6.1 · CL-02 · Exclusão de cliente.** Hoje é física, com `return` silencioso
quando falta permissão, e a auditoria guarda só o id.

Passa a: bloquear quando houver unidade vinculada com contrato ativo, contas a
receber ou documentos; exigir confirmação por digitação do nome; e registrar em
auditoria o nome, o CPF mascarado, a unidade e a contagem de documentos.

**6.1.1 · Posição.** O botão sai do canto superior da ficha, onde hoje fica
isolado e a um clique de distância, e vai para o rodapé, separado de Salvar. Ao
lado dele, a tela informa em uma linha o que a exclusão exige e o que a bloqueia.

**[NOTA]** A substituição da exclusão física por inativação pertence ao Prompt I,
seção 12. Aqui entram as travas, que valem em qualquer desenho.

**6.2 · CL-04 · A trava de unidade tem furo dos dois lados.**
`unidadeEmConflito` compara `statusContrato` — texto livre digitado — contra a
lista exata `["Distratado", "Distrato", "Cancelado", "Cancelada"]`.
"distratado" minúsculo não libera. E cliente **sem status** bloqueia a unidade
permanentemente, porque vazio não está na lista.

Fechar o domínio de `statusContrato` no servidor e normalizar a comparação.
**Nenhum status já gravado é convertido** — valores fora do domínio continuam
legíveis, e a tela sinaliza.

**6.2.1 · Dizer o efeito na tela.** Ao lado do campo, informar que status em
branco mantém a unidade bloqueada para outro comprador. Hoje o usuário descobre
isso quando não consegue vincular a unidade, e não tem como saber o motivo.

**6.3 · CL-05 · Conflito não é transacional.** A verificação consulta e depois
insere, fora de transação. Dois cadastros simultâneos da mesma unidade passam os
dois. Mover para dentro da transação.

**6.4 · CL-06 · `nomeCompleto ?? "Sem nome"`.** Salvar sem nome cria um cliente
chamado "Sem nome". Validar e recusar, com mensagem.

**6.5 · CL-07 · Versão de documento.** O comentário diz "maior versão do mesmo
cliente **e tipo**"; a consulta filtra só por `clienteId`. Anexar um comprovante
depois de um contrato v1 gera "comprovante v2". Filtrar também por tipo.
**Nenhuma versão já gravada é recalculada.**

**6.6 · CL-08 · Unidade de outro projeto.** O select oferece códigos do tenant
inteiro. Filtrar pelo projeto da unidade, mantendo sempre visível a unidade já
vinculada ao cliente, mesmo que de outro projeto — e sinalizando quando for o
caso, para que a divergência apareça em vez de ser corrigida em silêncio.

**6.7 · CL-09 · `interesse` sem faixa.** Coluna `integer` sem `check`, input sem
`min`/`max`, e o `/5` é só texto. O campo passa a ser **seleção de 1 a 5**, não
entrada livre. **Valores fora da faixa já gravados continuam exibidos**,
sinalizados, e a seleção mostra o valor atual como opção até que alguém o
corrija.

**6.8 · CL-11 · Listagem.** Acrescentar busca por nome e unidade, filtro por
status de contrato, e paginação.

**6.9 · Documentos de venda e contrato.**

**6.9.1 · Tipo obrigatório.** Hoje o seletor abre em "—" e o envio é aceito sem
tipo. Recusar com mensagem.

**6.9.2 · A versão é por tipo.** Já tratado em 6.5 — repetido aqui como
requisito de interface: a tela deve deixar claro que anexar documento do mesmo
tipo cria versão nova e preserva a anterior, e que tipos diferentes têm
numeração independente.

**6.9.3 · Remover desfaz o vínculo, não apaga o arquivo.** É o comportamento
atual; a tela passa a dizer. A auditoria registra nome do arquivo e chave de
armazenamento — o que hoje não acontece.

**6.9.4 · Limite de tamanho declarado na interface.** Hoje o rótulo diz 15 MB
nesta tela e 20 MB na de Projetos. Conferir qual é o limite real do servidor e
exibir o mesmo número nas duas.

**6.10 · Retorno legível.** `addCliente`, `updateCliente`, `deleteCliente` e
`uploadClienteDoc` lançam erro ou retornam em silêncio. Converter para
`{ ok, error }` e exibir. **Pré-condição do assistente.**

---

# 7. O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

`updateCliente` grava auditoria **campo a campo, com valor anterior e valor
novo**. É o único ponto do sistema que cumpre a RG-09 nesse nível.

**Não alterar esse trecho.** Ele é a referência para corrigir os outros —
`updateProject` grava só o valor novo, e `saveBudgetPlanning` grava apenas a
contagem de contas.

**[NOTA]** O `meta` da auditoria passa a **mascarar CPF** e a **omitir os campos
sensíveis** de BM-3. Registrar que o campo mudou, sem registrar renda e score em
claro no log — que o contador enxerga.

---

# 8. ASSISTENTE DE IA

Segue o **Prompt E**. Painel lateral, recolhível, com o tenant validado no
servidor.

**8.1 · O assistente respeita a permissão de campo.** Quem não vê renda e score
não recebe análise que os mencione. A verificação é no servidor, na mesma
consulta que monta o contexto.

**8.2 · Nenhum campo sensível vai ao modelo.** CPF, renda, FGTS, score e
restrições **não entram no contexto enviado**. Isso vale mesmo para quem tem
permissão de vê-los na tela — ver o bloqueio BE-2 do Prompt E.

**8.3 · Ações**

- **Cadastro incompleto** — compradores sem CPF, sem contato, sem unidade
  vinculada ou sem status de contrato.
- **Unidade travada** — clientes com unidade vinculada e status em branco, que
  bloqueiam a unidade sem que ninguém saiba por quê (ver 6.2).
- **Ler documento do comprador** — extrai nome, documento e endereço do contrato
  anexado e **propõe** o preenchimento. O documento precisa pertencer ao tenant,
  validado no servidor.
- **Conferir vínculos** — clientes cuja unidade não existe mais, ou pertence a
  outro projeto.

**8.4 · O que o assistente nunca faz aqui:** excluir cliente, alterar status de
contrato, vincular ou desvincular unidade, e propor qualquer coisa sobre score,
renda ou restrições.

**8.5 · O selo diz a verdade.** Como o assistente propõe preenchimento, não usar
"Somente leitura". Redação que descreva o que acontece.

---

# 9. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Trocar o contexto global por seleção explícita | Prompt A |
| Exclusão física substituída por inativação | Prompt I, seção 12 |
| Documento fiscal de saída e NFS-e | frente própria |
| Alterar a matriz de permissões por papel | não é desta tarefa — ver seção 1 |

---

# 10. PRESERVAÇÃO DE DADOS

Nenhum cliente é criado, alterado, reclassificado ou removido. Nenhum
`cpf_cnpj`, `status_contrato`, `interesse` ou `versao` de documento é convertido
ou recalculado. Nenhuma permissão de membro é alterada.

Migração, se houver — a coluna da permissão de campo sensível —, é aditiva, com
`IF NOT EXISTS` e `down`.

---

# 11. TESTES

1. Contador não acessa `/clientes` nem `/clientes/[id]`, por URL direta.
2. Engenheiro idem.
3. Membro acessa a listagem, com CPF mascarado.
4. Membro sem a permissão de campo sensível **não recebe do servidor** renda,
   FGTS, score nem restrições.
5. `/contabilidade` verifica permissão e rotula projeto e versão exibidos.
6. Nenhuma rota de `(app)` consulta dado antes de verificar `ver` — teste
   automatizado.
7. Teste que compara `SCREENS` com as rotas existentes falha quando há rota
   governável fora da lista.
8. Excluir cliente com unidade ativa é bloqueado.
9. Excluir exige digitação do nome, e a auditoria registra nome, CPF mascarado e
   unidade.
10. Status de contrato em minúsculas libera a unidade corretamente.
11. Cliente com unidade e status em branco aparece na conferência.
12. Dois cadastros simultâneos da mesma unidade: só um passa.
13. Salvar sem nome é recusado com mensagem.
14. Comprovante anexado depois de contrato v1 recebe versão 1, não 2.
15. Select de unidade oferece as do projeto, mais a já vinculada.
16. `interesse` é selecionado de 1 a 5; valor antigo fora da faixa continua
    exibido como opção.
17. Documento sem tipo é recusado com mensagem.
18. Proposta anexada depois de contrato v1 recebe versão 1, não 2.
19. Remover documento registra nome e chave em auditoria, e não apaga o arquivo.
20. Quem não tem a permissão de dados financeiros **não recebe do servidor** os
    blocos de Dados financeiros e Inteligência de mercado — verificar na
    resposta, não na interface.
21. Renda, FGTS e score não preenchidos exibem vazio, nunca `0,00`.
22. O campo de status do contrato informa, na tela, que status em branco bloqueia
    a unidade.
23. Log de auditoria não contém CPF em claro nem campo sensível.
24. Assistente não recebe campo sensível no contexto, em nenhum caminho.
25. **Antes e depois:** contagem de `cliente` e conteúdo integral de cada linha.
    Nenhuma diferença.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Lista de **todas** as rotas que não verificavam permissão (seção 2.3).
2. Resposta de BM-1, e o diff de permissão efetiva por papel ao incluir as telas
   faltantes.
3. Decisões de BM-2 e BM-3, e quem recebeu a permissão nova.
4. Como os campos sensíveis foram separados na consulta, não só na interface.
5. Duplicatas de CPF encontradas, sem nenhuma alteração.
6. Cadastros com status fora do domínio, e com `interesse` fora da faixa.
7. Clientes com unidade vinculada e status em branco.
8. Se o log de auditoria expõe conteúdo de cliente ao contador.
9. Confirmação de que o `meta` da auditoria passou a mascarar CPF e omitir
   campos sensíveis.
10. Como a versão de documento passou a ser calculada por tipo, e quantos
    documentos existentes têm numeração inconsistente — **sem corrigi-los**.
11. Qual é o limite real de tamanho de arquivo no servidor, e onde a interface
    divergia dele.
12. Funcionamento do assistente e confirmação do que não vai ao modelo.
13. Comparação antes/depois de `cliente`.
14. Migrações criadas, com `down`.
15. Limitações encontradas.


<a id="prompt-i"></a>


========================================================================


### ▸ 8 de 42 · PROMPT I — Arquitetura de versões

**Bloco 2 · A receita** · Bloqueios: BI-1 · BI-2 · BI-3

**Documento central.** Ler antes de qualquer decisão sobre receita, versão ou consolidação. A seção 58 ainda não foi escrita.

========================================================================


# PROMPT I — ARQUITETURA DE VERSÕES E INTEGRIDADE FINANCEIRA

Growth Construction · trabalho estrutural.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

> **Marcações inseridas na revisão de código:**
> **[BLOQUEIO]** decisão necessária antes de implementar ·
> **[ACRÉSCIMO]** requisito novo, vindo da revisão ·
> **[NOTA]** informação técnica que muda o como.

---

# ⚠ REGRA DE PRESERVAÇÃO — VALE PARA TODO ESTE DOCUMENTO

Esta regra é a mesma em todos os prompts do projeto e prevalece sobre qualquer
outra instrução deste documento.

**1 · Nenhum dado inputado pela empresa pode ser alterado.**

Nenhum registro existente pode ser apagado, sobrescrito, convertido,
recalculado, reclassificado, renomeado, zerado, desvinculado, movido para outro
projeto, movido para outra versão, reassociado, recriado com id diferente, nem
modificado por migração automática.

Vale para todo o banco, sem exceção: projetos, versões, unidades, planos de
pagamento, clientes, fornecedores, terceiros, despesas, parcelas, pagamentos,
contas a pagar e a receber, caixa, extratos, conciliações, contas bancárias,
budget lines e accounts, medições, serviços, estoque, INCC, reembolsos,
restituições, permutas, acertos, rateios, fechamentos, carry over, documentos,
documentos fiscais, usuários, permissões, auditoria e configurações.

**Nenhum valor financeiro existente pode ser modificado. Nenhum vínculo pode ser
perdido. Nenhuma versão pode ser recriada. Nenhum registro pode ser excluído
para adequar o sistema à nova arquitetura.**

**2 · Este trabalho corrige comportamento futuro e leitura.** Não corrige dado
histórico. Lançamento antigo que viole regra nova continua legível, editável e
íntegro; aparece nas telas de conferência e só muda por decisão humana, item a
item, com prévia antes e auditoria depois.

**3 · Migrações são aditivas.** Sem `DROP`, sem `TRUNCATE`, sem `DELETE`, sem
`UPDATE` de dado de negócio. Toda instrução usa `IF NOT EXISTS`, e cada migração
tem seu `down` em `migrations/down/`. Campo que sai de uso é descontinuado, não
removido.

**4 · Nada vindo de mockup entra no código.** Mockups definem layout e
comportamento de interface. Nunca usar valores, percentuais, datas, nomes de
obra, de cliente, de proprietário, endereços, coordenadas ou contadores vindos
de mockup, nem criar registro, seed, fixture ou dado de teste a partir deles.

**5 · Se qualquer correção exigir tocar em dado existente: PARE.** Não execute.
Reporte a tabela, o motivo, a quantidade estimada, o impacto, as alternativas e
a recomendação. A decisão é tomada separadamente.

---

# ORDEM DE EXECUÇÃO E RELAÇÃO COM OS DEMAIS PROMPTS

| | Prompt | Escopo |
|---|---|---|
| **C** | Barra lateral | navegação |
| **A** | Remoção do projeto ativo global | contexto |
| **B** | Tela Projetos | tela |
| **G** | Plano de Contas | visual |
| **D** | Orçamentos | tela |
| **F** | Previsão Atualizada | tela |
| **H** | Rascunho fora dos relatórios | regra |
| **E** | Assistente de IA | arquitetura |
| **I** | **este** | arquitetura de versões e integridade financeira |

**I e A se sobrepõem.** O Prompt A remove o projeto ativo global; as seções 6, 7
e 9 deste documento fazem parte do mesmo trabalho. **Executar como uma coisa
só** — ou o A primeiro e este depois, referenciando o que já foi feito. Não
implementar as duas versões da mesma correção.

**I não renomeia nada.** As trocas de nome visíveis pertencem a D e F, e este
trabalho deve funcionar antes e depois delas.

**I não redesenha nada.** O padrão visual pertence aos demais prompts.

---

# BLOQUEIOS — RESPONDER ANTES DE ESCREVER CÓDIGO

## BI-1 · Como o rateio da receita se comporta nos casos de borda

A seção 54 define que a receita da unidade vendida é reconhecida na DRE rateada
igualmente pelos meses de duração da obra. Três definições faltam, e cada uma
muda o número:

**1 · De onde vem a duração — RESOLVIDO.** A janela é a das competências entre
`start_date` e `end_date` do cadastro do projeto. Ver a **seção 55**, que
define a regra e a propaga para todas as telas. `duration_months` deixa de ser
fonte de qualquer cálculo, e `mes_inicial`/`mes_final` são descontinuados.

**2 · Venda no meio da obra.** A obra está no sexto de treze meses quando a
unidade é vendida. Duas opções: reconhecer de uma vez a parcela acumulada dos
meses já decorridos e seguir mensalmente daí em diante, ou distribuir o valor
cheio apenas pelos meses restantes. **Recomendação:** a primeira. A segunda
distorce o resultado dos meses futuros para compensar o passado.

**3 · Obra além do prazo.** A janela terminou e a obra continua. A receita para
no último mês da janela, ou acompanha até a conclusão? **Recomendação:** parar
na janela — o rateio é pelo prazo cadastrado, e estendê-lo exigiria recalcular
os meses anteriores.

**[NOTA]** Rateio linear distribui pelo **calendário**, não pela execução. Se a
obra atrasar ou acelerar, a receita não acompanha, e o resultado mensal fica
distorcido nos dois sentidos. Está registrado como decisão consciente do
usuário, não como consequência não percebida.

## BI-2 · As parcelas do plano viram registros de contas a receber?

Hoje `getReceivables` expande o `payment_plan` das unidades vendidas em
recebíveis datados **em memória**, sem gravar. Eles aparecem em
`/contasreceber` e `/fechamento` ao lado das linhas gravadas em `conta_receber`,
mas não têm id próprio, não podem ser baixados nem conciliados individualmente,
e mudam retroativamente se o plano da unidade for editado.

**Escolher uma:**

1. **Manter derivado.** Nada muda. As parcelas seguem como previsão de caixa,
   sem baixa individual.
2. **Materializar.** Cada parcela vira registro em `conta_receber`, com baixa e
   conciliação. Exige coluna de origem — `unit_id` e índice da parcela — para
   evitar geração em duplicidade, e exige decidir o que fazer com o INCC:
   grava-se valor nominal com correção calculada na leitura, ou valor corrigido
   congelado. **A geração para vendas já existentes é decisão humana, obra a
   obra, com prévia — nunca script em massa.**

**[NOTA]** Esta escolha é **independente** da seção 54. Com o rateio da receita
na DRE, contas a receber deixa de ter qualquer relação com o resultado: ela é
previsão e controle de caixa. Materializar é sobre baixa e conciliação, não
sobre DRE.

**[NOTA]** `conta_receber` **não possui coluna de versão** — é escopada por
projeto, com `ON DELETE cascade` a partir de `project`. A regra "sempre na
versão Atual" se aplica à unidade de origem, não ao recebível.

## BI-3 · O que fazer com os dois caminhos que hoje contaminam o planejamento

Duas actions gravam fato operacional em versões de planejamento, contrariando
diretamente o princípio da seção 2:

**`duplicateVersion`** insere `cash_entry`, `despesa`, `permuta`, `reembolso` e
`unit` na versão de destino. Duplicar um Budget copia despesas reais para
dentro dele.

**`importVersionData`** faz apagar-e-inserir em `despesa`, `permuta`,
`reembolso` e `unit`, a partir de planilha, na tela `/versao`.

São, quase certamente, a origem do que o diagnóstico da seção 43 encontrará nos
itens A a E.

**DECIDIDO — a duplicação de versão deixa de existir.**

Regra dada pelo negócio, em duas partes:

1. *Lançamento operacional só existe na versão Atual, e é lançado e editado na
   tela de Despesas.*
2. **`duplicateVersion` é descontinuada.** Não haverá mais criação de versão por
   cópia — nem de planejamento, nem operacional.

**O que sai:** a ação, o botão que a dispara, e qualquer caminho de interface que
leve a ela.

**O que fica:** as versões já criadas por esse caminho permanecem no banco, com
tudo o que têm. **Nenhuma é apagada, renomeada ou convertida.**

`importVersionData` continua existindo e passa a recusar tabelas operacionais
quando o destino não é `atual`.

**[NOTA]** Isto muda o **BAA-2 do Prompt AA**: sem duplicação, as versões
"(cópia)" deixam de aparecer com o tempo. As existentes continuam, e sair do
seletor padrão resolve o sintoma sem tocar em dado.

**Não alterar nenhuma linha já gravada por esses caminhos.** A correção é de
comportamento futuro; o passado vai para o diagnóstico, item A.

---

# 1. OBJETIVO CENTRAL

Estabelecer de maneira definitiva a arquitetura de versões.

```
                       CADASTRO DO PROJETO
                              │
                              ▼
                           PROJETO
                              │
            ┌─────────────────┼──────────────────┐
            ▼                 ▼                  ▼
         BUDGET           FORECAST             ATUAL
      Planejamento      Planejamento           Operação
            │                 │                  ▲
       Orçamentos      Previsão Atualizada       │
        /budget            /forecast        TODAS AS TELAS
            │                 │              OPERACIONAIS
            └────────┬────────┘                  │
                     ▼                           ▼
                 COMPARAÇÃO ──────────────── REALIZADO
                              │
                              ▼
              DRE / DASHBOARD / FLUXO / RELATÓRIOS
```

**Antes de alterar qualquer código, ler todo o código relacionado a:** project,
version, budget, forecast, despesas, pagamentos, parcelas, caixa, contas a pagar,
contas a receber, medições, unidades e vendas, restituições, recebimentos por
terceiros, acertos, permutas, reembolsos, estoque, DRE, Fluxo de Caixa,
Dashboard, Resumo, Consolidado, Projeção, Contabilidade, Fechamento, queries,
Server Actions, `getActiveContext`, `ProjectPicker`, seletores de versão e
cookies de contexto. Usar também o **Mapa de Interligações**.

**Não implementar cegamente.** Primeiro o audit técnico, depois a implementação.

**Nomenclatura.** Há prompts separados que trocarão apenas nomes visíveis —
Budget para "Orçamentos", Forecast para "Previsão Atualizada". Aqui **não
renomear** rotas, `version.kind`, tabelas, chaves estrangeiras, ids nem dados. A
arquitetura deve funcionar antes e depois deles.

---

# 2. PRINCÍPIO MAIS IMPORTANTE

As três versões **não são três cópias equivalentes do ERP**. São contextos de
natureza diferente.

**Budget e Forecast** são planejamento: estruturas mais restritas, alimentadas
exclusivamente pelas telas de planejamento, não recebem lançamentos reais.

**Atual** é operação: recebe os fatos reais e representa o que efetivamente
aconteceu.

Nunca misturar essas responsabilidades.

**[NOTA]** Ver **BI-3**: hoje o sistema tem dois caminhos que violam este
princípio. O critério de aceitação da seção 52 depende da resposta daquele
bloqueio.

---

# 3. REGRA DO BUDGET

`version.kind = "budget"` — planejamento-base aprovado.

Alimentado somente pelas funcionalidades de planejamento Budget. Fontes de
referência permitidas: cadastro do projeto, plano de contas, parâmetros de
planejamento e dados definidos pela tela de orçamento.

Grava em `budget_account`, `budget_line` e demais estruturas próprias.

**Não pode receber lançamento operacional** vindo de Despesas, Contas a Pagar,
Contas a Receber, Caixa, conciliação, pagamentos, parcelas, restituições,
repasse de terceiros, acertos, medições realizadas, estoque, operação de
Unidades/Vendas, Ponto, Fechamento, nem qualquer outro fato real.

Pode ser consultado pelas telas analíticas. Não pode ser alterado por elas.

---

# 4. REGRA DO FORECAST

`version.kind = "forecast"` — previsão revisada. É planejamento.

Pode ter dados próprios, partir do Budget quando a funcionalidade mandar copiar,
comparar-se ao Budget, e usar a Atual como referência analítica quando previsto.

**Jamais é alterado automaticamente por lançamento operacional.** Uma despesa
real não modifica Forecast. Um recebimento não modifica Forecast. Uma medição
realizada não modifica Forecast.

O usuário altera Forecast exclusivamente pelas funcionalidades da própria versão.

---

# 5. REGRA DA VERSÃO ATUAL

`version.kind = "atual"` — ambiente operacional.

Todo fato real específico de um projeto está vinculado à Atual daquele projeto:
despesas, pagamentos, parcelas, contas a pagar, recebimentos, medições,
movimentos operacionais, permutas, reembolsos, operações com terceiros, acertos,
ponto, custos reais e movimentos associados a unidades.

**Fluxo obrigatório:**

```
projectId explícito → tenant validado → resolve version kind="atual"
daquele projectId → grava fato operacional
```

**Nunca** como fonte da versão de gravação: `ctx.version`, cookie global,
primeiro projeto, versão default, fallback silencioso.

**[NOTA]** `conta_receber` não tem coluna de versão — ver BI-2. Para ela, a
regra se aplica ao projeto e à unidade de origem.

---

# 6. NÃO EXISTE MAIS "PROJETO ATIVO GLOBAL"

Projeto é contexto **local** da tela. Não usar `ACTIVE_PROJECT_COOKIE`, projeto
global, `ctx.project` como decisão de negócio, `projects[0]` como fallback, nem
`setActiveProject` como controlador funcional.

Tela que precisa de projeto recebe `projectId` explícito:
`/despesas?proj=PROJECT_A`. Outra aba pode estar em `/budget?project=PROJECT_B`
sem interferência.

**[NOTA]** Mesmo escopo do **Prompt A**. Não implementar duas vezes.

**[ACRÉSCIMO — ocorrências já localizadas]** Três fallbacks com âncora:
`unidades/page.tsx` usa `ctx.projects.find(...) ?? ctx.projects[0]`;
`budget/page.tsx` usa `alvos[0]?.id ?? ctx.project.id`; a tela de Projetos
resolve o projeto pela ordem de `ctx.projects`. Servem de ponto de partida do
inventário, não de lista completa.

**[ACRÉSCIMO — atrito operacional]** Remover o fallback significa que toda tela
passa a exigir escolha explícita. Para quem lança o dia inteiro, isso é um
clique a mais por tela, por sessão. Meio-termo compatível com o §52: a seleção
mora na URL e cada **aba** lembra a última escolha em `sessionStorage` — não é
estado global, é por aba, visível na URL, não compartilhado. Decidir
explicitamente entre este e o comportamento literal.

---

# 7. A MESMA REGRA VALE PARA VERSÃO

Não usar `ctx.version` como fonte implícita de gravação.

Criar ou consolidar helpers centrais, por exemplo
`getVersionByKind(tenantId, projectId, kind)`,
`requireVersionByKind(tenantId, projectId, kind)`,
`requireAtualVersion(tenantId, projectId)` e
`assertVersionBelongsToProjectAndTenant(...)`.

Os nomes podem mudar se a arquitetura indicar solução melhor, mas **deve existir
uma forma central e segura** de resolver versões. Não duplicar a lógica em
dezenas de actions.

**[ACRÉSCIMO]** O `tenantId` é parâmetro **obrigatório** desses helpers, não
opcional. Não existe RLS no banco: o isolamento é sustentado consulta a consulta,
em 164 pontos espalhados por 25 arquivos. Assinatura obrigatória faz o
esquecimento virar erro de compilação em vez de vazamento silencioso.

---

# 8. AUSÊNCIA DE UMA VERSÃO

Nunca substituir silenciosamente uma versão ausente por outra.

```
ERRADO:   getAtualVersion(A) ?? ctx.version
CORRETO:  "Este projeto não possui versão Atual." + bloquear a operação
```

Forecast ausente: mostrar indisponível e permitir criação pelo fluxo apropriado;
nunca usar Budget no lugar. Budget ausente: mostrar ausência; não transformar
Forecast ou Atual em Budget.

---

# 9. AUDITORIA GLOBAL DE WRITES

Pesquisar em todo o projeto: `ctx.version`, `ctx.project`, `getActiveContext`,
`versionId`, `projectId`, `ACTIVE_VERSION_COOKIE`, `ACTIVE_PROJECT_COOKIE`,
`setActiveVersion`, `setActiveProject`, `projects[0]`, `getAtualVersion`,
`getDefaultVersion`.

Classificar cada Server Action que grava:

**A.** planejamento Budget · **B.** planejamento Forecast ·
**C.** operação Atual · **D.** tenant-level, não pertence a uma única obra

Documentar a classificação. Depois corrigir qualquer action que possa gravar em
versão incompatível.

**[ACRÉSCIMO]** Incluir `ctx.projects` e `ctx.tenant.id` na busca, e
`toggleVersionLock`, `duplicateVersion`, `importVersionData` e `setDefaultVersion`
na classificação — são as quatro actions de `/versao` com maior alcance.

**[ACRÉSCIMO]** Já classificadas como **D** pelo mapa, para poupar trabalho:
`acerto`, `pagamento`, `despesa_parcela`, `restituicao`, `repasse` e
`compensacao` são escopadas apenas por tenant, sem `project_id` nem
`version_id`. Não devem ganhar `projectId` obrigatório.

---

# 10. CONTAS A PAGAR

`getContasPagar()` lê despesas do tenant sem garantir `version.kind = "atual"`.
Isso permite que despesas existentes em Budget, Forecast ou versões copiadas
sejam interpretadas como obrigações reais.

**Corrigir a consulta:**

```
despesa JOIN version
WHERE tenantId = tenant AND version.kind = "atual" AND despesa.cancelado = false
```

Não alterar registros existentes. Se for necessário consultar versões
históricas para auditoria, criar consulta explicitamente histórica e não usá-la
no operacional.

**[NOTA]** Esta correção **muda número exibido** em Contas a Pagar, se existirem
despesas em versões de planejamento. Reportar quantas antes de aplicar, e o
total envolvido. É a mesma classe de mudança do Prompt H.

**[ACRÉSCIMO — regra do negócio]** *Contas a Pagar é exclusivamente versão
Atual. O lançamento e a edição acontecem na tela de Despesas; a tela de Contas a
Pagar é consulta e operação de pagamento, não cadastro.* Isso deixa de ser
dedução do código e passa a ser regra declarada.

**[ACRÉSCIMO — a tela não mostra parcela]** `ContasPagarTable` tem dez colunas —
fornecedor, descrição, categoria, projeto, cliente, valor, vencimento, pagamento,
forma e status. **Nenhuma sobre parcela.** Uma despesa parcelada em doze aparece
como uma linha, com o valor cheio e um vencimento só.

A empresa não deve R$ 12.000 naquele dia: deve R$ 1.000 por mês durante um ano.
A tela precisa listar **por vencimento de obrigação** — uma linha por parcela em
aberto, com o vencimento e o saldo de cada uma. Isso pertence ao **Prompt R**, e
é pré-condição para as abas "A Pagar" e "Parcelas" saírem da tela de Despesas
(Prompt S, seção 5).

---

# 11. DESPESAS — CORREÇÕES DE INTEGRIDADE

Preservar as funcionalidades existentes e corrigir:

**11.1 · Valor.** Bloquear zero, negativo, `NaN` e infinito, salvo workflow
específico de estorno. Despesa normal tem valor maior que zero.

**11.2 · Criação atômica.** O núcleo é transacional: despesa, parcelas,
documento fiscal, obrigação com terceiro quando aplicável e demais registros SQL.
Uploads externos exigem estratégia compensatória, porque o R2 não participa da
transação. Não deixar despesa parcialmente criada.

**11.3 · Parcelas.** Com total e parcelas informados, a soma das parcelas deve
igualar o valor da despesa, com tolerância de centavos. Caso contrário, bloquear.
Não confiar no navegador.

**11.4 · Status da parcela.** Enum ou whitelist no servidor. Cliente manipulado
não pode criar parcela "Pago" sem fato de pagamento.

**11.5 · Recorrência.** Não copiar estado incompatível — `pagoPorTerceiro`,
status Pago, obrigações com terceiro, parcelas e o que exija fato financeiro
específico. Recorrência é obrigação futura, não cópia de pagamento passado.

**11.6 · Edição.** Despesa com parcelas, pagamentos, acertos, restituições,
conciliações ou movimentos de caixa não aceita alteração que destrua a coerência
sem workflow específico. Avaliar valor, status, projeto, versão, data e forma de
pagamento.

**11.7 · Version lock.** Versão bloqueada impede criação **e** edição de fatos
vinculados, validado no servidor.

**[ACRÉSCIMO — 11.8 · Retorno legível.]** As actions do sistema lançam erro em
vez de retornar `{ ok, error }`. Em produção o Next.js substitui a mensagem por
um digest genérico, então **todas as validações acima ficam invisíveis para quem
opera** — o usuário vê uma falha sem motivo. Converter para `{ ok, error }` as
actions tocadas por este trabalho, e exibir a mensagem na tela. Sem isso, cada
bloqueio novo vira um travamento inexplicável.

**[ACRÉSCIMO — 11.9 · Retorno silencioso.]** Algumas actions fazem `return` sem
mensagem quando falta permissão — `deleteUnit`, `updateProject`, `deleteProject`,
`deleteDespesa`. O usuário clica, nada acontece, nenhuma mensagem aparece. Vale
a mesma correção.

**[ACRÉSCIMO — 11.10 · Lock não é uniforme.]** `saveUnit` recusa quando
`version.locked`; `importUnits` não verifica. Trava que vale na tela e cai pela
planilha. Auditar todas as entradas em massa quanto ao lock: importação de
unidades, importação de planilha do Budget e do Forecast, e `importVersionData`.

---

# 12. EXCLUSÃO, CANCELAMENTO E ESTORNO

Não tratar tudo como `DELETE`. Definir:

**Exclusão física** — somente registro recém-criado, sem dependências
financeiras, quando permitido.
**Cancelamento** — preserva histórico e remove o fato dos saldos futuros.
**Estorno** — reverte fato financeiro realizado e cria a contrapartida.

Antes de excluir despesa, verificar pagamentos, parcelas pagas, cash entries,
acertos, restituições, documento fiscal, conciliações e obrigações de terceiros.

Despesa já paga não pode virar "Cancelada" deixando a saída bancária intacta sem
explicação.

**[ACRÉSCIMO — exclusões físicas já localizadas]** Três caminhos que apagam
documento com efeito contábil, todos confirmados no mapa:

| Action | Tabela | Observação |
|---|---|---|
| `deleteDespesa` | `despesa` | convive com `cancelarDespesa`, que faz update |
| `cancelarRestituicao` | `restituicao` | tratado na seção 24 |
| `deleteUnit` | `unit` | leva o plano de pagamento junto; sem confirmação; auditoria guarda só o id |

Enquadrar os três na regra desta seção. **Nenhum registro já apagado é
recuperável, e nenhum registro existente é alterado por esta correção.**

**[ACRÉSCIMO]** `deleteChartGroup` e `deleteChartItem` apagam contas do plano
fisicamente. Como `budget_account.row_key` é texto e não chave estrangeira, a
conta some do plano e os valores continuam gravados, órfãos — é a origem das
linhas exibidas com o selo "legado". Enquadrar na mesma regra.

---

# 13. PAGAMENTO DE DESPESA

Corrigir `pagarDespesa`. Uma transação contendo registro do pagamento,
atualização de saldo e status, `cash_entry` e demais efeitos.

Adicionar **idempotência** contra duplo clique, retry, timeout com reenvio e
pagamento duplicado.

O status considera **pagamentos acumulados**: despesa 100, pagamento 60 e
pagamento 40 resultam em Pago, não em parcialmente paga porque o último isolado
foi 40.

---

# 14. PAGAMENTO DE PARCELAS

`registrarPagamento` não pode depender de `ctx.version`. Resolver
parcela → despesa → version → project → tenant, e validar
`version.kind = "atual"`. Usar a versão real da despesa no `cash_entry`.

**Não aceitar `valorOriginal` do navegador** — o servidor usa o valor persistido
da parcela.

Depois do pagamento, recalcular parcela e despesa-mãe: todas quitadas resulta em
Pago, parte em Parcialmente paga, nenhuma em A pagar.

---

# 15. CONTAS A PAGAR — SALDO REAL

Não calcular "Pendente" somando o valor original de toda despesa com status
diferente de Pago. Despesa de 100 com 80 pagos tem pendente de 20.

Criar helper reutilizável de saldo a pagar, evitando fórmulas diferentes em
Contas a Pagar, Dashboard, Fechamento, Caixa e relatórios.

**[ACRÉSCIMO]** O defeito tem duas faces, e a segunda só apareceu com a revisão
da tela de Despesas: além de não descontar o que já foi pago, o total **não
separa o que ainda não venceu**. Despesa parcelada entra pelo valor cheio, e o
pendente do mês conta como devido hoje o que vence em doze meses.

Com a listagem por parcela da seção 10, o pendente passa a ser **saldo da parcela
vencida ou a vencer no período**, não valor original da despesa.

---

# 16. STATUS "VENCIDA"

Hoje pode ser derivado da data na exibição enquanto o filtro usa status
persistido. Unificar: exibição, filtro, ordenação e contadores usam a mesma
função. Pode continuar derivado, sem persistir.

---

# 17. ACERTO CONTÁBIL

Manter a arquitetura: uma saída de caixa, múltiplos PEDs, diferença financeira,
transação e idempotência.

**Corrigir:** antes de efetivar, na mesma transação, lockar e carregar as
despesas, buscar abatimentos anteriores ativos, recalcular saldo real e validar
que o novo abatimento cabe no saldo. Nunca usar `despesa.valor` como saldo
disponível. Interface e servidor obedecem à mesma regra.

---

# 18. ACERTO E RATEIO ENTRE VÁRIAS OBRAS

Um movimento bancário pode pagar fatos de vários projetos. Não atribuir o valor
integral à versão da primeira obra.

Preservar **uma** saída bancária real, e permitir que relatórios por projeto
conheçam a alocação. Antes de criar tabela nova, analisar `acerto_item`,
`rateio_obra` e as relações com despesas — preferir usá-las como memória de
alocação. Não duplicar o `cash_entry`.

```
movimento bancário tenant-level + rateios/itens = atribuição econômica por obra
```

---

# 19. MEDIÇÕES

Medição é realizado: `projectId` explícito → versão Atual → medição.

Eliminar `getAtualVersion(...) ?? ctx.version` e demais fallbacks. Projeto sem
Atual: bloquear e informar. `updateMedicao` e `deleteMedicao` validam tenant,
projeto, versão real e lock.

---

# 20. DESPESAS PAGAS POR TERCEIROS

Regra econômica: a despesa é reconhecida uma vez; o terceiro paga o fornecedor;
não houve saída do caixa da empresa; nasce obrigação empresa → terceiro; a
restituição posterior é saída de caixa, não nova despesa.

Ao vincular um PED como pago por terceiro, não basta marcar `pagoPorTerceiro`. A
situação operacional deve deixar claro que o fornecedor já foi pago. A despesa
não pode aparecer simultaneamente como "a pagar ao fornecedor" e "restituir ao
terceiro" pelo mesmo valor. Corrigir sem duplicar DRE.

---

# 21. RESTITUIÇÕES

A dívida com terceiro é tenant-level, ainda que a origem seja uma obra. Não usar
`ctx.version` como escopo implícito.

Permitir filtros locais por projeto, terceiro, período e status — mas o saldo do
terceiro é da empresa.

No `cash_entry` de restituição, usar a origem real quando houver obrigação
específica. Operação que abrange várias obras preserva a saída única e usa
relações de alocação.

---

# 22. CASH ENTRY INFORMADO PELO CLIENTE

Quando uma action recebe `cashEntryId`, validar sempre
`cash_entry.id = input.cashEntryId AND cash_entry.tenantId = ctx.tenant.id`.

Nunca executar `UPDATE` por id do cliente sem escopo de tenant. Aplicar a
restituição, repasse, conciliação e demais actions semelhantes.

**[ACRÉSCIMO]** Vale para todos os ids externos, e há um caso já localizado com
âncora: `updateProject` e `deleteProject` gravam com
`where(eq(projects.id, projectId))`, sem `tenantId` na cláusula. Hoje não vazam
porque há guarda em memória antes, mas são a única exceção ao padrão do sistema.

---

# 23. RESTITUIÇÃO EM LOTE

Corrigir a busca para considerar apenas os `despesaId` das obrigações em questão,
em vez de carregar todas as despesas do tenant.

Cancelar ou estornar restituição em lote deve reconstruir os abatimentos a partir
de `restituicao_item`: restituição de 100 com PED A de 30 e PED B de 70 estorna
A com 30 e B com 70. Nunca devolver 100 à obrigação âncora.

---

# 24. NÃO APAGAR DOCUMENTO NEGOCIAL DE RESTITUIÇÃO

Mesma filosofia do Acerto: manter registro, com status cancelado ou estornado,
usuário, data, motivo e contrapartida de caixa quando aplicável. Não destruir a
trilha financeira.

Se exigir migração, ela é **somente aditiva**, e nenhum dado existente é migrado
automaticamente.

**[NOTA]** `cancelarRestituicao` faz `DELETE` físico da linha. Nenhum registro
já apagado é recuperável; a correção vale para o comportamento futuro.

---

# 25. FIFO

Quando a regra disser FIFO, o banco tem `ORDER BY` explícito e determinístico —
data original, `createdAt` e `id` como desempate. Não confiar na ordem natural.

**[ACRÉSCIMO]** Cuidado com ordenação sobre data em texto: as colunas de negócio
são `text` em `MM/DD/YYYY` e `MM/YYYY`. Ordenar por elas em SQL é lexicográfico —
`"12/31/2025"` vem depois de `"01/01/2026"`. FIFO por data exige normalização
antes de ordenar. Ver seção 37.

---

# 26. COMPENSAÇÃO ENTRE SALDOS

Compensação não gera DRE, não gera caixa, e baixa ativo e passivo com o terceiro
— mas aparece no extrato da conta corrente.

Não pode existir uma visão calculada por `valorRestituido` e outra reconstruída
apenas pelas restituições, ignorando compensações. Criar **uma** lógica de
movimentos da conta corrente cobrindo desembolso, restituição, recebimento pelo
terceiro, repasse, compensação e estorno. Todos os saldos apresentados devem
reconciliar.

---

# 27. REVALIDAÇÃO

Após qualquer action, revalidar todas as telas cujo dado foi alterado.
Compensação revalida `/restituicoes`, `/contaspagar` e os relatórios afetados;
estorno de acerto revalida `/acerto`, `/caixa`, `/contaspagar`, `/dre` e
`/fluxocaixa`.

Não confiar que uma navegação futura atualize o dado incidentalmente.

**[NOTA]** O mapa já traz a matriz de invalidação por action e o índice inverso
por rota. Usar como ponto de partida em vez de refazer.

---

# 28. CAMADA ANALÍTICA DE VERSÕES

Criar uma camada central de leitura para relatórios. **Não** criar cópia dos
dados, **não** duplicar fatos em tabela paralela.

A camada normaliza as três versões para fins analíticos.
`ScenarioKind = "budget" | "forecast" | "atual"`.

Cada resultado informa explicitamente: `tenantId`, `projectId`, `scenarioKind`,
`period`, `metric`, conta/grupo/categoria quando aplicável, e `value`.

Preferencialmente query, serviço, view lógica, funções agregadoras e DTO
padronizado — não necessariamente tabela.

---

# 29. FONTES ANALÍTICAS

Não inventar fórmulas novas. Auditar e preservar as regras já usadas por
`getBudgetPlanning`, `getForecastComparison`, `getMonthlyRevenue`,
`getExpenseRows`, `getRevenueBySource`, `getReceivables`, `getContasPagar`,
`getIndicadoresObra`, `getIndicadoresObraConsolidado`, `getVersionsDoProjeto`,
`getBudgetLines`, `getMedicoes` e demais funções dos relatórios.

Mapear explicitamente as fontes de Budget, Forecast e Atual. Não presumir que
todas as métricas vêm das mesmas tabelas.

**[ACRÉSCIMO — o que o mapa já mostra, para conferência]** `/dre` alcança
`budget_line`, `conta_receber`, `despesa_parcela`, `incc_rate` e `permuta`. **Não
lê `unit` nem `despesa`.** Duas consequências a validar no audit:

- A receita da DRE hoje vem de `conta_receber` e `permuta`. A venda da unidade
  **não chega à DRE** — é o que a seção 54 corrige.
- A despesa da DRE vem de `despesa_parcela`, não de `despesa`. Confirmar qual
  coluna de data essa consulta usa: se for vencimento, a DRE está em regime de
  vencimento e não de competência, o que contraria a RG-01 e precisa ser
  reportado antes de qualquer alteração.

`getMonthlyRevenue` é a definição de receita para `/contabilidade`,
`/dashboard`, `/dre`, `/projecao` e `/resumo`. Alterá-la atinge as cinco.

---

# 30. COMPARAÇÃO PADRONIZADA

Serviço reutilizável, no espírito de:

```
getScenarioComparison({ tenantId, projectIds, scenarios, startMonth, endMonth, dimension })
```

Retorno permitindo `{ period: "08/2026", budget, forecast, atual }` e também
`{ categoria: "Fundações", budget, forecast, atual }`.

---

# 31. MÉTRICAS DERIVADAS

Calcular de forma consistente: Orçamento × Atual e Forecast × Atual com desvio
absoluto, desvio percentual e percentual de execução; Budget × Forecast com
revisão absoluta e percentual.

Tratar divisão por zero explicitamente. **Nunca apresentar `Infinity` ou `NaN`.**

**[ACRÉSCIMO]** Ausência de dado não é zero. Cenário sem dado exibe estado
próprio — "sem orçamento lançado", "sem realizado" —, nunca `R$ 0,00`, que é uma
afirmação sobre o mundo.

---

# 32. DASHBOARD E RELATÓRIOS

Dashboard, DRE, Fluxo de Caixa, Resumo, Consolidado, Projeção e relatórios
trabalham dinamicamente com Budget, Forecast e Atual, e com as combinações entre
eles. Não fazer páginas duplicadas — usar a mesma camada analítica.

---

# 33. EXPERIÊNCIA VISUAL DA COMPARAÇÃO

Controle com os três cenários selecionáveis, rotulados como Orçamento, Previsão
Atualizada e Realizado, mesmo que internamente sigam `budget`, `forecast` e
`atual`.

Tabela por categoria com as três colunas mais desvio e execução. Gráficos podem
usar linha para evolução mensal, barras agrupadas para os três cenários,
waterfall se já houver infraestrutura, e cards para orçado, previsto, realizado,
desvio e execução.

Não alterar a identidade visual definida nos demais prompts.

**[ACRÉSCIMO]** A cor segue o significado, não o percentual: custo acima do
previsto é alerta, não sucesso. E todo indicador declara o **regime** — se o
realizado está por competência ou por caixa. Sem isso, o usuário compara números
que não são comparáveis.

---

# 34. SELEÇÃO DE PROJETO NOS RELATÓRIOS

Projeto é filtro local. Permitir, conforme a tela: todos os projetos, ativos,
finalizados, projeto específico, ou múltiplos projetos. Uma seleção no Dashboard
não altera a DRE. Não usar cookie global.

**[NOTA]** "Ativos" e "finalizados" dependem da coluna de situação criada no
**Prompt A**. Se ele ainda não estiver em produção, este filtro não existe
ainda — não improvisar a partir de `project.status`, que hoje contém
`Planejamento` e `Em andamento`.

---

# 35. CONSOLIDAÇÃO DE VÁRIOS PROJETOS

Para cada projeto, buscar a versão solicitada **daquele** projeto, e depois
agregar. Nunca selecionar uma única `versionId` e aplicá-la a vários projetos.

**[ACRÉSCIMO]** Definir explicitamente o que os escopos fazem com
escritórios/filiais (`project.kind = "office"`), que carregam custo indireto e
não são obra. Somá-los junto com as obras, ou não, são resultados diferentes, e
nenhum dos dois pode ser acidente.

---

# 36. VERSÃO AUSENTE EM COMPARAÇÃO

Projeto sem Forecast: não usar Budget, não usar Atual, não retornar zero.
Retornar estado explícito — "Forecast indisponível para este projeto".

Em consolidação, informar cobertura: "Previsão Atualizada: 8 de 10 projetos
possuem Forecast".

---

# 37. PERÍODO

Comparações mensais usam formato canônico interno. O banco tem datas em formatos
diferentes; não comparar cronologicamente por string BR sem normalizar. Criar
helpers seguros para `MM/YYYY`, `MM/DD/YYYY` e ISO.

Separar competência, vencimento, pagamento e caixa. **DRE usa competência. Fluxo
de Caixa usa data financeira. Nunca misturar.**

**[ACRÉSCIMO — o risco concreto]** Todas as datas de negócio são `text`.
Comparação e ordenação em SQL sobre `MM/DD/YYYY` e `MM/YYYY` são lexicográficas:
`"12/31/2025"` vem depois de `"01/01/2026"`, e um `BETWEEN` sobre virada de ano
devolve o conjunto errado. Se o código filtra e ordena em JavaScript após
converter, não há problema; se filtra no `where` ou ordena no `order by` sobre a
coluna de texto, o número está errado hoje. **Auditar toda cláusula de período e
toda ordenação por data, e reportar as que estiverem em SQL sobre texto.**

**[ACRÉSCIMO]** Auditar também a exibição: a coluna "Mês venda" de `/unidades`
renderiza `row.mesVenda` cru, sem passar pelo `DateField` que o resto do sistema
usa. Se o formato interno é `MM/DD/YYYY`, o usuário lê a data trocada. Teste que
resolve: cadastrar venda no dia 25 e conferir o que a coluna mostra.

---

# 38. DRE

A DRE exibe Orçamento, Previsão Atualizada e Realizado, por período, projeto,
categoria e conta ou grupo.

O realizado vem exclusivamente dos fatos operacionais da Atual. Budget e Forecast
permanecem planejamento. Não transformar pagamento em nova despesa de
competência. Preservar a regra existente de reconhecimento econômico, **exceto
no que a seção 54 alterar explicitamente**.

---

# 39. FLUXO DE CAIXA

Distinguir planejado — Budget e Forecast — de realizado — Atual e cash entries
efetivos. Não confundir competência contábil com movimento bancário. Permitir
comparação entre previsto e realizado.

**[ACRÉSCIMO]** Com a seção 54, receita da DRE e recebíveis passam a ter
calendários diferentes de propósito: a DRE reconhece pelo rateio da duração da
obra, o Fluxo projeta pelo plano de pagamento. **Não é divergência a corrigir** —
é a RG-01 funcionando. As duas telas devem dizer, na interface, qual regime
exibem.

---

# 40. DASHBOARD

Deixar de depender de um contexto implícito de versão. Seletor analítico claro,
com projeto e cenários, ou modos Orçado × Realizado, Previsto × Realizado e Três
Cenários.

Indicadores sempre mostram qual cenário está sendo exibido. **Nunca mostrar
número sem sua natureza.**

---

# 41. ATUAL NÃO É UMA VERSÃO DE ORÇAMENTO

Isso deve ficar explícito no código e nos nomes dos helpers. Evitar abstrações
que tratem Budget, Forecast e Atual como três datasets idênticos.

São comparáveis no nível **analítico**, não necessariamente no de persistência.
Planejamento vem de `budget_line` e `budget_account`; Atual vem de despesas,
parcelas, contas a receber, cash entries, medições, unidades e demais fatos
reais. A camada de comparação normaliza esses mundos.

**[NOTA]** `version.status` — Rascunho e Aprovado — não governa nada hoje: nenhuma
consulta filtra por ele. Quem bloqueia é `version.locked`, coluna separada,
gravada apenas por `toggleVersionLock`, na tela `/versao`. Dar consequência à
situação é escopo do **Prompt H**, não deste. Aqui, apenas não presumir que
"Aprovado" signifique alguma coisa.

---

# 42. DATA PRESERVATION

Ver a **Regra de Preservação** no topo deste documento, que substitui e amplia
esta seção. Nenhum dado inputado pela empresa é apagado, recalculado, movido,
convertido, reclassificado, renomeado em massa, reassociado a outra versão,
transferido entre versões ou entre projetos, nem recriado com id diferente.

Este trabalho corrige **comportamento futuro e leitura**.

---

# 43. DIAGNÓSTICO DA BASE EXISTENTE

Diagnóstico **somente leitura**. Relatório contendo:

**A.** despesas em versões `kind != "atual"` · **B.** cash entries operacionais
ligados a budget ou forecast · **C.** medições em versões diferentes de atual ·
**D.** parcelas e pagamentos com contexto incompatível · **E.** contas a pagar
derivadas de versões não atuais · **F.** despesas com status Pago sem pagamento
ou caixa correspondente · **G.** despesas parcialmente pagas com saldo incoerente
· **H.** parcelas quitadas com despesa-mãe aberta · **I.** soma de parcelas
diferente do valor do PED · **J.** `pagoPorTerceiro` sem `despesa_terceiro` ·
**K.** `despesa_terceiro` cuja despesa original continua como obrigação ao
fornecedor · **L.** restituições em lote com saldos inconsistentes ·
**M.** compensações que não reconciliam com a conta corrente · **N.** cash
entries cuja atribuição de projeto ou versão não corresponde à origem
operacional · **O.** projetos sem Budget · **P.** sem Forecast · **Q.** sem Atual
· **R.** projetos com mais de uma versão do mesmo kind.

**[ACRÉSCIMO] S.** unidades com código repetido na mesma versão — a importação
só insere e não há chave única, então reimportar a mesma planilha duplica a
unidade, o VGV e os recebíveis.
**[ACRÉSCIMO] T.** `budget_line` em competências fora da janela atual do projeto
— dado invisível na tela que o próximo salvamento apaga.
**[ACRÉSCIMO] U.** linhas de `budget_account` cujo `row_key` não corresponde a
nenhum grupo ativo do plano de contas — as exibidas com selo "legado".
**[ACRÉSCIMO] V.** unidades vendidas sem `mesVenda` preenchido, ou com valor
zero — entram no rateio da seção 54 e precisam ser identificadas antes.
**[ACRÉSCIMO] W.** unidades vendidas cuja soma do plano de pagamento não fecha
com o valor da unidade.
**[ACRÉSCIMO] X.** projetos sem `start_date` ou `end_date` — sem janela, não há
rateio possível.
**[ACRÉSCIMO] Y.** contas a receber já lançadas à mão que correspondam a vendas
de unidade — candidatas a dupla contagem quando a seção 54 entrar.

**Não alterar nenhum registro encontrado. Somente reportar.**

---

# 44. MIGRATIONS

Evitar migrações se o problema puder ser resolvido em código. Se indispensável:
aditiva, não destrutiva, sem alterar dados históricos, sem trocar ids, sem
preencher valor de negócio por suposição, com `down` correspondente.

Antes de executar migração que modifique dados: **parar e reportar**.

---

# 45. TENANT SAFETY

Toda leitura e gravação que recebe id externo valida tenant. Especialmente
`projectId`, `versionId`, `despesaId`, `parcelaId`, `cashEntryId`,
`contaReceberId`, `restituicaoId`, `acertoId` e `medicaoId`. Nunca confiar no id
sozinho.

**[ACRÉSCIMO]** Não há RLS no banco. O isolamento é sustentado consulta a
consulta, em 164 ocorrências espalhadas por 25 arquivos. Toda consulta nova
introduzida por este trabalho precisa do filtro explícito, e os helpers da seção
7 devem exigir `tenantId` como parâmetro obrigatório.

---

# 46. PERMISSÕES

Manter o RBAC existente. Não transferir decisão crítica ao frontend. Server
Action valida permissão novamente.

**[ACRÉSCIMO]** Treze actions gravam sem chamar `logAudit`, três delas com efeito
contábil: `addPermuta` e `addReembolso`, que são documentos de receita, e
`saveIncc`, que altera o índice de correção das parcelas. Acrescentar auditoria
nas actions tocadas por este trabalho.

**[ACRÉSCIMO]** A auditoria de alteração deve registrar **valor anterior e
valor novo**, conforme a RG-09. Hoje várias gravam apenas o novo — `updateProject`
grava o objeto `set`, e `saveBudgetPlanning` grava apenas `{ bloco, contas: N }`,
sem os meses nem os valores. Nenhum registro de `audit_log` já gravado é
reescrito.

---

# 47. TESTES OBRIGATÓRIOS

**1.** Projeto A em Budget numa aba, projeto B em Atual noutra; lançar despesa em
B; Budget A idêntico.
**2.** Forecast A aberto; registrar pagamento em A; Forecast idêntico.
**3.** Despesa lançada no projeto B pertence à Atual de B.
**4.** Projeto sem Atual: despesa bloqueada.
**5.** Projeto sem Atual: medição bloqueada.
**6.** Despesa em Budget existente na base antiga não aparece em Contas a Pagar
operacional.
**7.** Despesa 100, pagamentos 60 e 40: saldo zero, status Pago, caixa −100.
**8.** Duplo submit de pagamento: um único fato financeiro.
**9.** Parcelas 40 + 40 contra total 100: servidor rejeita.
**10.** Todas as parcelas pagas: despesa-mãe Pago.
**11.** Despesa paga por terceiro: fornecedor não segue como obrigação aberta;
obrigação com terceiro correta.
**12.** Restituição não gera DRE.
**13.** Restituição em lote A=30 e B=70: estorno restaura exatamente A=30 e B=70.
**14.** Compensação: saldo consolidado igual ao da conta corrente.
**15.** `cashEntryId` de outro tenant: rejeitado.
**16.** Acerto anterior de 70 em PED de 100: novo acerto no máximo 30.
**17.** Budget 100, Forecast 120, Atual 80: comparação devolve os três.
**18.** Projeto sem Forecast: comparação sinaliza indisponível, não zero.
**19.** Consolidado A+B: cada projeto usa sua própria versão do cenário.
**20.** Duas abas com projetos diferentes: nenhuma interfere na outra.

**[ACRÉSCIMO] 21.** Unidade vendida: receita reconhecida na DRE conforme a seção
54, e a soma dos meses fecha exatamente com o valor da unidade.
**[ACRÉSCIMO] 22.** Unidade em Disponível ou Reservado: nenhuma receita
reconhecida.
**[ACRÉSCIMO] 23.** Venda desfeita: a receita reconhecida sai por estorno,
nenhum registro é apagado.
**[ACRÉSCIMO] 24.** Projeto sem janela de datas: rateio não acontece, e a tela
informa em vez de mostrar zero.
**[ACRÉSCIMO] 25.** Reimportar a mesma planilha de unidades não cria duplicata.
**[ACRÉSCIMO] 26.** Versão bloqueada recusa também a importação em massa.
**[ACRÉSCIMO] 27.** Toda validação nova bloqueia com mensagem legível na tela.
**[ACRÉSCIMO] 28.** **Antes e depois:** contagem de registros e soma dos valores
de cada tabela de negócio. Nenhuma diferença que não seja consequência declarada
de uma decisão registrada.

---

# 48. TESTES DE NÃO REGRESSÃO

Continuam funcionando: lançamento e edição de despesa, documentos, documento
fiscal, recorrência, parcelas, pagamento, Contas a Pagar, Restituições, pagamento
por terceiro, compensação, repasse, Acerto Contábil, rateio entre obras,
Medições, Caixa, DRE, Fluxo de Caixa, Dashboard, Forecast, Budget, importações,
filtros, permissões e auditoria.

---

# 49. NÃO FAZER NESTE TRABALHO

Não redesenhar visualmente as telas. Não aplicar os prompts visuais pendentes.
Não renomear rotas nem kinds. Não fundir Budget, Forecast e Atual numa tabela
única. Não reconstruir o banco. Não modificar dados históricos. Não deletar
versões. Não criar dados automaticamente para "resolver inconsistências". Não
alterar fórmula de negócio sem identificar a fórmula atual e justificar.

---

# 50. ORDEM DE IMPLEMENTAÇÃO

**Fase 1** auditoria e lista de arquivos afetados · **2** camada de contexto,
helpers tenant/project/version · **3** operação Atual explícita em todas as
gravações · **4** integridade financeira: pagamentos, parcelas, despesas,
acertos, terceiros, restituições · **5** consultas operacionais ·
**6** camada analítica · **7** relatórios · **[ACRÉSCIMO] 7-A** reconhecimento de
receita da seção 54 · **8** diagnóstico somente-leitura · **9** testes.

Não avançar de fase se houver risco de alteração de dados existentes.

**[ACRÉSCIMO]** Parar ao fim da Fase 1 e entregar o inventário antes de escrever
código. O tamanho encontrado decide se isto é uma PR ou seis. Cada PR precisa ser
deployável e reversível sozinha — PR que só funciona se a seguinte também subir
não é etapa, é metade de um deploy.

---

# 51. RELATÓRIO FINAL OBRIGATÓRIO

**1.** arquivos alterados · **2.** helpers criados · **3.** ocorrências de
`ctx.project` e `ctx.version` removidas da lógica de negócio · **4.** actions
agora obrigatoriamente Atual · **5.** actions exclusivas de Budget ·
**6.** exclusivas de Forecast · **7.** queries corrigidas · **8.** bugs
financeiros corrigidos · **9.** arquitetura da comparação · **10.** como
Dashboard, DRE e Fluxo identificam cada cenário · **11.** migrações criadas ·
**12.** confirmação de que nenhuma migração destrutiva foi executada ·
**13.** resultado do diagnóstico · **14.** testes executados ·
**15.** aprovados e falhos · **16.** riscos remanescentes · **17.** pontos que
exigem decisão funcional.

**[ACRÉSCIMO] 18.** Decisões tomadas em BI-1, BI-2 e BI-3 e como foram
implementadas.
**[ACRÉSCIMO] 19.** Regra de reconhecimento implementada na seção 54: fonte da
duração, tratamento da venda no meio da obra e da obra fora do prazo.
**[ACRÉSCIMO] 20.** Quais consultas passaram a filtrar por `version.kind` e o
impacto de cada uma nos números exibidos.
**[ACRÉSCIMO] 21.** Comparação antes e depois de contagem e soma por tabela de
negócio.
**[ACRÉSCIMO] 22.** Cláusulas de período e ordenações que estavam em SQL sobre
data em texto.

---

# 52. CRITÉRIO FINAL DE ACEITAÇÃO

> "Budget e Forecast são exclusivamente planejamento. Atual é exclusivamente
> operação realizada. Nenhum lançamento operacional pode contaminar Budget ou
> Forecast. Nenhum planejamento pode ser interpretado como obrigação operacional.
> Relatórios conseguem comparar os três cenários sem alterar qualquer um deles."

E: projeto A em Budget, projeto B em Forecast e projeto C em Atual,
simultaneamente em abas diferentes, sem interferência de contexto.

**[ACRÉSCIMO]** E ainda: nenhum registro inputado pela empresa foi alterado,
comprovado pela comparação de contagem e soma por tabela, antes e depois.

---

# 53. REGRA DE SEGURANÇA FINAL

Se durante a implementação você concluir que alguma correção exige mover dados,
reatribuir `versionId`, converter registros antigos, apagar registros, recalcular
saldos históricos ou modificar valores existentes: **NÃO EXECUTE.**

Pare naquela etapa e apresente registro e tabela afetada, motivo, quantidade
estimada, impacto, alternativas e recomendação. A decisão sobre dado histórico é
tomada separadamente.

---

# 54. [ACRÉSCIMO] RECONHECIMENTO DE RECEITA DA VENDA DE UNIDADES

**Ver BLOQUEIO BI-1 antes de implementar.**

## 54.1 · O problema que esta seção resolve

**A venda chega à DRE — pelo regime errado, e somada em duplicidade.**

`getMonthlyRevenue` é a função que define a receita mensal para **DRE,
Dashboard, Projeção de Receitas, Resumo e Contabilidade**. Na versão Atual ela
soma três origens, agregando tudo **pelo mês do vencimento**:

1. os recebíveis expandidos do `payment_plan` das unidades vendidas, via
   `expandUnitReceivables`;
2. os **reembolsos** — a tela Liberações de Obra;
3. as contas a receber lançadas à mão do projeto, não canceladas.

Daí decorrem dois defeitos independentes:

**Regime errado.** Vencimento é data financeira. A DRE lê competência. A receita
do resultado está hoje no calendário do recebimento, não no da execução — o que
contraria a RG-01.

**Duplicidade.** O `payment_plan` contém a linha de financiamento bancário, e
`expandUnitReceivables` a expande junto com as demais. A liberação do banco,
lançada na tela de Liberações de Obra, entra de novo pela origem 2. O mesmo
dinheiro é somado duas vezes, em cinco telas.

Esta seção corrige o primeiro defeito, substituindo o critério de
reconhecimento. O segundo é tratado na **seção 56**.

**[NOTA — correção de leitura anterior]** Uma versão anterior deste documento
afirmava que a venda não chegava à DRE, porque `/dre` não lê a tabela `unit`.
Ela não lê a tabela, mas lê `getMonthlyRevenue`, que expande o plano de
pagamento. A afirmação estava errada.

## 54.2 · A regra

A receita de uma unidade é reconhecida na DRE **quando a unidade está com status
Vendido**, rateada **igualmente pelas competências de duração da obra**.

```
receita mensal = valor da unidade ÷ número de competências da janela do projeto
```

**Condição de reconhecimento:** `unit.status = "Vendido"`. Unidade em Disponível
ou Reservado não reconhece nada.

**Escopo:** unidades da versão **Atual** do projeto. Unidades existentes em
versões de planejamento não reconhecem receita.

**Substitui, não acrescenta.** O reconhecimento por vencimento de parcela
descrito em 54.1 deixa de alimentar a DRE. As duas regras **não coexistem** —
somá-las contaria a mesma venda duas vezes. Budget e Forecast continuam lendo
`budget_line`, sem alteração.

**Janela:** as competências do projeto, conforme a decisão de BI-1.

**Fechamento:** a soma das competências deve fechar exatamente com o valor da
unidade. O resíduo de arredondamento é ajustado na última competência, no mesmo
espírito da RG-08.

## 54.3 · Não grava nada

O reconhecimento é **derivado**, calculado pela camada analítica da seção 28 a
partir de `unit.valor`, `unit.status`, `unit.mesVenda` e da janela do projeto.

**Não criar registro em `conta_receber`. Não criar tabela de receita
reconhecida. Não gravar nada.** O cálculo é determinístico e recalculável,
e assim nenhum dado inputado pela empresa é tocado — inclusive para as vendas já
existentes, que passam a aparecer na DRE sem que nenhuma linha seja escrita.

**[NOTA]** Se em algum momento for necessário congelar o reconhecido — por
exemplo para impedir que a edição do valor da unidade altere meses já fechados —,
isso é tarefa própria, com decisão humana, e não entra aqui.

## 54.4 · O que esta seção não muda

**Contas a Receber e Fluxo de Caixa continuam como estão.** Eles projetam pelo
plano de pagamento, que é cronograma de caixa. A DRE reconhece pelo rateio da
obra, que é competência.

Os dois calendários são **diferentes de propósito** — é a RG-01 funcionando, não
divergência a corrigir. Cada tela declara o regime que exibe.

**Orçamento e Previsão não são tocados.** São planejamento e têm lógica própria.
Nada em `budget_line`, nada nas telas de planejamento.

**A permuta continua como está.** Ela já entra na DRE por caminho próprio;
verificar no audit se uma unidade recebida em permuta e depois vendida pode ser
reconhecida duas vezes, e reportar se for o caso.

## 54.5 · Venda desfeita

Unidade que sai de Vendido para Disponível ou Reservado deixa de reconhecer
receita a partir dali. Como o reconhecimento é derivado, o efeito é automático na
leitura.

**A DRE de competências já encerradas não pode mudar retroativamente sem
registro.** Definir, no audit, se o sistema fecha competências. Se fechar, a
reversão é lançamento de estorno na competência corrente, nunca alteração do
passado. Se não fechar, reportar isso como risco: a DRE de meses anteriores muda
sozinha quando alguém altera o status de uma unidade.

## 54.6 · Casos que impedem o cálculo

Unidade vendida sem `mesVenda`, com valor zero, ou projeto sem `start_date` e
`end_date` não permitem rateio. Nesses casos a tela exibe **estado explícito** —
"não é possível reconhecer: falta o mês da venda" — e **nunca zero**.

Esses casos vão para o diagnóstico da seção 43, itens V e X.

## 54.7 · Dupla contagem

Se existirem contas a receber lançadas à mão correspondentes a vendas de unidade,
a DRE passará a contar as duas coisas. É o item Y do diagnóstico.

**Não excluir nem alterar essas linhas.** Reportar quantas são e o total
envolvido, e apresentar ao usuário para decisão item a item.

## 54.8 · Entrada controlada

Esta regra **muda número exibido em produção**. Ela entra atrás de uma chave por
tenant, desligada, com o comportamento atual preservado. Antes de ligar,
apresentar a prévia: por projeto e por competência, quanto de receita passará a
aparecer.

Mesma mecânica do **Prompt H**, e as duas chaves são independentes.

---

# 55. [ACRÉSCIMO] JANELA DE COMPETÊNCIAS DO PROJETO — FONTE ÚNICA

Hoje o cadastro do projeto tem **três pares de campos** que respondem à mesma
pergunta, e eles discordam em produção:

| Campo | OBRA 28 | OBRA 32 |
|---|---|---|
| `duration_months` | 12 | 6 |
| `start_date` → `end_date` | 10/12/2025 → 10/12/2026 = **13 competências** | 06/07/2026 → 10/02/2027 = **8 competências** |
| `mes_inicial` / `mes_final` | nunca lidos, nunca gravados | idem |

Nenhuma tela avisa da divergência, e o número muda conforme quem lê escolhe.

## 55.1 · A regra

**A janela de competências do projeto é o conjunto de meses `MM/YYYY` entre
`start_date` e `end_date`, ambos inclusive.** É a única fonte, para todas as
telas e todos os cálculos.

`duration_months` deixa de alimentar qualquer cálculo. `mes_inicial` e
`mes_final` são descontinuados.

## 55.2 · Uma função, não três implementações

Criar **uma** função que devolva a janela — a lista ordenada de competências e a
contagem — e usá-la em todos os pontos que hoje derivam período do projeto:

- Orçamentos (`/budget`) — colunas mensais da grade
- Previsão Atualizada (`/forecast`) — idem
- Reconhecimento de receita da **seção 54** — divisor do rateio
- Qualquer relatório que precise da duração da obra
- O aviso de divergência da tela de Projetos (55.4)

Hoje a derivação está dentro de `getBudgetPlanning`. Extrair para a função
compartilhada e passar a chamá-la, sem mudar o resultado que ela já produz para
Orçamentos e Previsão — o comportamento dessas duas telas **não muda**.

**Escritório** (`project.kind = "office"`) mantém a regra própria que já existe:
janela calculada a partir do ano corrente. Não unificar sem decisão — ver
BG-10 no Prompt D, que trata do problema dessa janela deslizante.

## 55.3 · Projeto sem datas

Sem `start_date` ou sem `end_date` não há janela. As telas exibem estado
explícito — "o período do projeto não está definido no cadastro" — com caminho
para o cadastro, e **nunca zero**.

**[NOTA]** O texto atual do estado vazio de `/budget` manda preencher "Mês
inicial" e "Mês final", campos que **não existem na tela de Projetos**. Corrigir
para nomear Data de início e Data de fim. Correção de texto, sem efeito em dado.

## 55.4 · O campo Duração na tela de Projetos

`duration_months` deixa de ser editável e passa a ser **derivado e
somente-leitura**, exibindo a contagem de competências da janela.

O valor hoje gravado em cada projeto **não é alterado, não é recalculado e não é
apagado** — a coluna permanece no banco com o que tem. Ela apenas deixa de ser
lida.

Enquanto o valor gravado divergir da janela, a tela exibe o aviso, discreto e
**não bloqueante**: o cadastro diz 12 meses, a janela tem 13 competências.
Informativo apenas. Quem decide o que está certo é o usuário, ajustando as datas.

**[NOTA]** Isso substitui o acréscimo da seção 9 do Prompt B, que propunha
apenas exibir a divergência mantendo o campo editável.

## 55.5 · O que não muda

- Nenhum valor de `duration_months`, `start_date`, `end_date`, `mes_inicial` ou
  `mes_final` de qualquer projeto existente.
- Nenhuma `budget_line` já gravada.
- O resultado que Orçamentos e Previsão já produzem hoje — a fonte era essa
  desde o início; o que muda é deixar de haver outras duas concorrendo.
- A janela do escritório.

## 55.6 · Diagnóstico

Acrescentar ao relatório somente-leitura da seção 43:

**Z.** projetos cuja `duration_months` diverge da contagem de competências entre
as datas — com projeto, valor gravado, contagem real e diferença.

É a lista que o usuário vai usar para decidir, projeto por projeto, se corrige as
datas. **Nenhuma correção automática.**

## 55.7 · Testes

- A janela devolvida é idêntica à que `/budget` monta hoje, para todos os
  projetos.
- Orçamentos e Previsão continuam com o mesmo número de colunas de antes.
- O divisor do rateio da seção 54 é a mesma contagem que a grade exibe.
- Projeto sem datas: as três telas informam a ausência, nenhuma mostra zero.
- Escritório continua com a janela própria.
- Nenhum valor de `duration_months` foi alterado.

---

# 56. [ACRÉSCIMO] LIBERAÇÃO DE OBRA NÃO É RECEITA DE COMPETÊNCIA

## 56.1 · A duplicidade

`getMonthlyRevenue`, na versão Atual, soma os reembolsos — a tela **Liberações
de Obra** — junto com os recebíveis expandidos do `payment_plan`:

```
const reemb = reembursementsByMonth(reembToCalc(reembRows));
for (const [mm, v] of Object.entries(reemb)) out[mm] = (out[mm] || 0) + v;
```

O `payment_plan` já contém a linha de financiamento bancário, e
`expandUnitReceivables` a expande junto com as demais. A liberação do banco,
lançada naquela tela, é a **realização** dessa mesma linha.

Resultado: o mesmo dinheiro entra duas vezes — uma como previsão da venda, outra
como lançamento da liberação. Em **DRE, Dashboard, Projeção de Receitas, Resumo
e Contabilidade**.

## 56.2 · A regra

**A competência é a venda. A liberação é caixa.**

A liberação de obra deixa de compor receita. Ela pertence ao **Fluxo de Caixa
realizado** e ao **Controle de Caixa** — e a nenhum demonstrativo de resultado.

## 56.3 · O que muda

**56.3.1** Remover de `getMonthlyRevenue` as duas linhas que somam `reemb`. A
função deixa de ler `reembolso`.

**56.3.2** Auditar os demais consumidores e reportar antes de alterar:

- `calcTotals` devolve `reemb` como campo próprio, e o Consolidado soma
  `PROJECTION_SOURCES` **mais** `sumFiltered(rv.reemb)` no TOTAL;
- na tabela mensal do Consolidado, a liberação é uma linha em `rowMaps` e o
  `totalRow` a inclui — o subtítulo declara "Reembolso incluído no TOTAL";
- a Projeção exibe linha própria com total próprio;
- o Resumo Executivo tem linha própria;
- o Controle de Caixa agrega por mês.

**Decidir caso a caso**, e reportar o efeito de cada um: linha de caixa não é
linha de receita, mas remover sem substituir deixa buraco em tela que hoje
mostra o número.

**56.3.3** Onde a liberação continuar aparecendo, ela é **rotulada como caixa**,
fora do bloco de fontes de receita, e **fora do total de receita**.

## 56.4 · O que não muda

A tela de Liberações de Obra continua como está — ver **Prompt O**. Nenhum
lançamento é alterado, cancelado ou reclassificado. A tabela `reembolso`
permanece intacta, inclusive o campo `reemb` de `calcTotals`, que segue
existindo para quem precisar do número como caixa.

## 56.5 · Entrada controlada

Isto **muda número exibido** em cinco telas. Entra atrás de chave por tenant,
desligada, preservando o comportamento atual.

Antes de ligar, apresentar a prévia: por projeto e por competência, quanto de
receita deixa de aparecer em cada tela. Mesma mecânica do Prompt H, e as chaves
são independentes.

## 56.6 · Relação com a seção 54

As duas tratam da mesma função e devem ser decididas juntas.

A seção 54 troca o **critério** de reconhecimento: de vencimento de parcela para
rateio pela duração da obra. Esta troca o **conjunto de fontes**: tira a
liberação.

Implementadas juntas, a receita da DRE passa a ser: rateio da venda pela duração
da obra, mais as contas a receber lançadas à mão que representem receita própria
— e nada mais.

## 56.7 · Testes

1. `getMonthlyRevenue` não lê `reembolso` em nenhum caminho.
2. Com a chave desligada, DRE, Dashboard, Projeção, Resumo e Contabilidade
   devolvem exatamente os totais de hoje.
3. Com a chave ligada, a diferença por projeto e competência é exatamente a soma
   das liberações daquele período.
4. A liberação continua aparecendo no Fluxo de Caixa realizado e no Controle de
   Caixa.
5. Onde ela aparecer em tela de receita, está rotulada como caixa e fora do
   total.
6. Nenhum lançamento de `reembolso` foi alterado.

---

# 57. [ACRÉSCIMO] FONTES DE RECEITA DA DRE — DEFINIÇÃO FECHADA

Esta seção consolida as 54 e 56 e acrescenta o tratamento da permuta. As três
tratam do **mesmo defeito estrutural**, descrito em 57.1.

**Implementar juntas.** Corrigir uma e deixar as outras mantém a receita errada,
só que por menos caminhos.

---

## 57.1 · O defeito estrutural

O `payment_plan` de uma unidade tem onze linhas de fonte de pagamento — Ato,
Sinais 1 a 3, Mensais, Semestrais, Anuais, FGTS, Subsídio, **Permuta** e
**Banco**. `expandUnitReceivables` expande **todas**, inclusive as duas últimas,
gerando um recebível para cada.

Para duas dessas fontes existe **uma tabela própria que registra a mesma coisa
acontecendo**:

| Fonte no plano | Tabela que registra a realização | Onde é somada |
|---|---|---|
| `Permuta.val` — bem recebido do comprador | `permuta` | `permutaRevenueByMonth`, somada à receita em `versionInputsByMonth` |
| `Banco.valFinanc` — financiamento bancário | `reembolso` — tela Liberações de Obra | `getMonthlyRevenue`, somada à receita |

O sistema trata previsão e realização como **duas receitas distintas** e soma as
duas. Não são: são o mesmo dinheiro, visto duas vezes.

**Consequência.** Para uma unidade vendida com bem em permuta e financiamento, a
DRE reconhece o preço integral da unidade — que já inclui as duas fontes —, mais
as liberações do banco, mais o valor da revenda do bem. A receita fica
materialmente acima do que foi vendido.

**Agravante do financiamento.** A linha `Banco` gera **um único recebível**, com
o `valFinanc` inteiro, na data da primeira parcela. O banco libera conforme
medição, ao longo de meses. Não é só duplicidade de valor — é duplicidade em
calendários diferentes, o que torna a conferência inviável a olho.

---

## 57.2 · Como a DRE monta a receita hoje

`versionInputsByMonth` soma duas origens:

```
const [revenue, despesas, permutas, encargosMes] = await Promise.all([
  getMonthlyRevenue(vid, projectId), ...
]);
for (const [mm, v] of Object.entries(revenue)) bucket(mm).receita += v;
const permRev = permutaRevenueByMonth(permToResale(permutas));
for (const [mm, v] of Object.entries(permRev)) bucket(mm).receita += v;
```

E `getMonthlyRevenue`, na versão Atual, soma outras três: os recebíveis
expandidos do plano, os reembolsos, e as contas a receber do projeto.

**Quatro fontes, todas agregadas por data financeira** — vencimento no caso das
três primeiras, e a data da revenda no caso da permuta. **Nenhuma por
competência**, o que contraria a RG-01.

**[NOTA]** `permutaRevenueByMonth` e `permToResale` não foram lidos. O nome, o
comentário no código — "receita da revenda de bens de permuta" — e os campos
disponíveis em `permuta` indicam agregação por `data_venda` sobre `valor_venda`,
com filtro de status. **Confirmar no audit antes de implementar** e reportar
qualquer divergência em relação ao descrito aqui.

---

## 57.3 · A definição — o que a DRE passa a ler

### Budget e Forecast

Sem alteração. `budget_line` com `kind = "receita"`, agregada por `mes`
(`MM/YYYY`). Já é competência.

### Atual

Exatamente **duas** fontes:

| # | Fonte | Origem | Competência | Filtro |
|---|---|---|---|---|
| 1 | **Venda de unidade** | `unit` da versão Atual | rateio pela janela do projeto (seção 54) | `status = "Vendido"` |
| 2 | **Receita avulsa** | `conta_receber` do projeto | ver 57.5 | `cancelado = false` **e** sem origem em plano de pagamento |

**E nada mais.** Nenhuma outra tabela alimenta a linha de receita da DRE.

O valor da fonte 1 é o **preço integral da unidade**, incluindo as parcelas
pagas em permuta e a parcela financiada pelo banco. É a RG-02: uma receita, um
reconhecimento, no fato gerador, não importa por quantas mãos o dinheiro passe.

---

## 57.4 · O que sai, e para onde vai

### 57.4.1 · O plano de pagamento sai da DRE

`expandUnitReceivables` deixa de alimentar a receita do resultado. Ele continua
existindo e continua correto para o que foi feito: **previsão de caixa**.

Destino: Fluxo de Caixa previsto, Contas a Receber, Fechamento do Dia.

### 57.4.2 · A liberação de obra sai da receita

Tratada na **seção 56**. É caixa. Destino: Fluxo de Caixa realizado e Controle
de Caixa.

### 57.4.3 · A permuta sai da receita

O bem recebido **não é receita** — é forma de pagamento, e seu valor já está no
preço da unidade, que a fonte 1 reconhece integralmente.

Quando o bem é revendido, isso é **alienação de ativo**, não receita de
incorporação. O que entra no resultado é o **ganho ou a perda**: valor da
revenda menos o valor pelo qual o bem entrou.

**Implementação:** `permutaRevenueByMonth` deixa de somar em `receita`. O
resultado da revenda passa a linha própria, fora da receita operacional, pela
diferença — nunca pelo valor cheio.

**[NOTA — tributário]** A Receita Federal, pelo Parecer Normativo COSIT 9/2014,
sustenta que o imóvel recebido em permuta constitui receita bruta no lucro
presumido. O STJ decidiu em sentido contrário no REsp 1.733.560/SC, e a PGFN
acolheu. **A apuração tributária é decisão do contador do cliente e não é
definida por este documento.** O que esta seção define é a DRE gerencial. Se a
apuração exigir a permuta como receita bruta, isso é um recorte fiscal próprio,
nunca a linha de receita do resultado.

---

## 57.5 · Receita avulsa e a competência que falta

`conta_receber` **não tem coluna de competência** — só `vencimento` e
`data_recebimento`.

**Decidir e reportar:**

1. **Acrescentar coluna de competência**, anulável, aditiva. Correto, e a única
   forma de a fonte 2 ser competência de fato. Registro existente fica com
   competência nula, e a DRE usa o vencimento nesses casos, sinalizando.
2. **Usar o vencimento**, assumindo que ali competência e vencimento coincidem.
   É o comportamento atual, e é aproximação.

Recomendação: a **1**, com a **2** como comportamento para o histórico.

**Como distinguir a receita avulsa.** Depois da materialização prevista no
Prompt K, `conta_receber` passará a conter também as parcelas do plano. Essas
**não entram** na DRE — a venda já foi reconhecida pela fonte 1.

A distinção usa a coluna de origem que o Prompt K cria: conta **com** origem em
plano de pagamento não entra; conta **sem** origem entra. Enquanto a
materialização não existir, todas as contas a receber são avulsas.

---

## 57.6 · O que não muda

- `payment_plan`, `expandUnitReceivables`, `getReceivables` — continuam como
  estão, servindo caixa.
- As tabelas `permuta` e `reembolso` — nenhum registro é alterado,
  reclassificado ou removido.
- `calcTotals` — continua devolvendo `banco`, `reemb`, `permRec` e `permVend`.
  O que muda é **quem soma o quê** na receita.
- Projeção de Receitas e Consolidado — são telas de **fonte de recurso**, não de
  resultado. Tratadas em 56.3.2, com decisão caso a caso.
- Budget e Forecast.

---

## 57.7 · Entrada controlada

As seções 54, 56 e 57 mexem na mesma linha da DRE e **mudam número em produção**.

**Uma chave por tenant para o conjunto**, desligada, preservando o comportamento
atual. Não uma chave por seção: ligar só uma deixa a receita errada de outra
forma.

Antes de ligar, apresentar a prévia por projeto e por competência, com quatro
colunas: receita exibida hoje, quanto vem de cada uma das quatro fontes atuais,
receita pela definição nova, e a diferença.

É o documento com que o usuário decide — e é também o que o contador vai querer
ver antes de aceitar um resultado diferente do que vinha sendo apresentado.

---

## 57.8 · Diagnóstico

Acrescentar ao relatório somente-leitura da seção 43:

**AA.** Unidades vendidas com linha `Permuta` preenchida no plano **e** registro
correspondente na tabela `permuta` — a duplicidade de permuta, projeto a
projeto, com o valor envolvido.

**AB.** Unidades vendidas com `Banco.valFinanc` maior que zero **e** lançamentos
em `reembolso` no mesmo projeto — a duplicidade de financiamento, com os dois
valores lado a lado.

**AC.** Diferença, por projeto e competência, entre a receita exibida hoje e a
soma dos preços das unidades vendidas — a medida direta do excesso.

**Somente reportar. Nenhum registro é alterado.**

---

## 57.9 · Testes

1. Com a chave desligada, a DRE devolve exatamente os totais de hoje, em todos
   os projetos.
2. Com a chave ligada, a receita de um projeto é igual à soma dos preços das
   unidades vendidas rateada pela janela, mais as contas a receber avulsas.
3. Unidade com permuta no plano: o bem aparece **uma vez**, dentro do preço.
4. Revenda do bem: entra pelo ganho, em linha própria, fora da receita.
5. Unidade com financiamento: o valor aparece **uma vez**, dentro do preço.
6. Liberações de obra não aparecem na receita, e continuam no Fluxo de Caixa
   realizado e no Controle de Caixa.
7. Conta a receber com origem em plano de pagamento não entra na DRE.
8. Conta a receber avulsa entra, pela competência de 57.5.
9. Budget e Forecast inalterados.
10. Contas a Receber, Fechamento e Fluxo de Caixa previsto continuam exibindo os
    recebíveis do plano, sem alteração.
11. Nenhum registro de `permuta`, `reembolso`, `unit` ou `conta_receber` foi
    alterado.


<a id="prompt-j"></a>


========================================================================


### ▸ 9 de 42 · PROMPT J — Unidades

**Bloco 2 · A receita** · Bloqueios: BJ-1 · BJ-2 · BJ-3

O `payment_plan` é a origem de tudo. Recebe a validação da data impossível (AN, Parte 6).

========================================================================


# PROMPT J — TELA UNIDADES

Growth Construction · `/unidades`, `/unidades/nova`, `/unidades/[id]`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.**
Valores, planos de pagamento, datas, status, códigos e quantidades existentes em
produção permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda,
converte, normaliza, migra, reclassifica ou "corrige" um registro já gravado —
nem como efeito colateral de mudança de layout, de rota, de nome de campo ou de
origem de dado. Se uma alteração exigir tocar em dado existente: **PARE, não
execute, e informe qual dado, por quê, quantos registros e qual a alternativa não
destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups definem layout, hierarquia visual, rótulos e comportamento de interface.
Nunca usar valores, metragens, datas, códigos de unidade, nomes de cliente ou
contadores vindos de mockup. Nunca criar registro, seed, fixture, valor padrão ou
dado de teste a partir deles.

**Aplicação específica:** a unidade "OBRA 28 · CASA TÉRREA · [metragem] ·
[valor removido] · [data]" do mockup é ilustração.

---

# ORDEM DE EXECUÇÃO

| | Prompt | Relação com este |
|---|---|---|
| **C** | Barra lateral | moldura |
| **A** | Remoção do projeto ativo global | dono da correção do fallback (seção 7.1) |
| **I** | Arquitetura de versões e integridade | dono da janela do projeto e do reconhecimento de receita |
| **E** | Assistente de IA | dono da arquitetura do assistente |
| **J** | **este** | a tela |

**J depende de A** para o fallback silencioso e **de I** para o reconhecimento de
receita, que dá sentido ao painel do assistente. Pode ir antes de I — a tela
funciona sem —, mas a ação "Receita reconhecida" do assistente só existe depois.

---

# BLOQUEIOS

## BJ-1 · A data da venda está sendo exibida corretamente?

`unit.mesVenda` é `text`, e o comentário do schema declara o formato interno como
`MM/DD/YYYY`. A listagem renderiza `{row.mesVenda ?? "—"}` **cru**, sem passar
pelo `DateField` que o resto do sistema usa.

Se o formato interno for mesmo `MM/DD/YYYY`, o valor exibido hoje está com dia e
mês trocados, e ninguém percebeu porque as datas em produção têm dia e mês
ambos ≤ 12.

**Executar antes de qualquer código:** cadastrar uma unidade de teste com venda
no **dia 25**, salvar, recarregar, e reportar o que a coluna mostra. Excluir a
unidade de teste ao fim.

O resultado decide se a seção 3.2 é correção de exibição ou apenas padronização.

## BJ-2 · Existem unidades duplicadas em produção?

`importUnits` **só insere, nunca atualiza**, e não há chave única em
`(version_id, code)`. Reimportar a mesma planilha duplica a unidade — e com ela o
VGV, os recebíveis e, depois do Prompt I, a receita reconhecida.

**Entregar antes de implementar:** lista de unidades com o mesmo `code` na mesma
versão, com projeto, código, valor e status de cada ocorrência.

Se houver duplicatas, a constraint da seção 4.1 **não pode ser criada** antes de
o usuário decidir, caso a caso, qual registro fica. Nenhuma exclusão automática.

## BJ-3 · Escrita assistida por IA — DECIDIDO

**Autorizada nesta tela**, com três condições inegociáveis.

Motivo de ser aqui e não em outra: `saveUnit` é insert e update comuns, sem o
padrão de apagar-e-reinserir do planejamento e sem cascata como a exclusão de
projeto. O dano máximo de um erro é uma unidade cadastrada errado — visível,
editável, corrigível.

**Condição 1 · O retorno legível vai na mesma entrega.** A seção 5.1 —
`{ ok, error }` nas três actions — é pré-requisito, não item paralelo. Uma
proposta que falha ao gravar sem dizer por quê torna o assistente inutilizável em
uma semana.

**Condição 2 · A IA propõe e para.** Preenche o formulário, exibe cada campo, e o
botão de gravar é do usuário. **Não existe caminho de gravação direta**, nem
atalho de "confiar e salvar", nem para o usuário mais experiente. O plano de
pagamento tem seis linhas de fontes, e é exatamente ali que a interpretação erra.

**Condição 3 · Exclusão nunca é assistida.** Nem propor, nem sugerir, nem
oferecer. Confirmação humana protege bem contra criação errada e mal contra
destruição.

**[NOTA — sobre a promessa na interface]** O assistente **preenche**; ele não
"cadastra". Os textos da tela devem dizer isso. E a entrada por voz é
alternativa, nunca o único caminho — quem trabalha em obra não usa voz.

**[NOTA]** Isto é a Etapa 3 do Prompt E, autorizada em escopo restrito a esta
tela. Não abre precedente para as demais: cada tela decide a sua.

---

# 1. O QUE ESTA TAREFA FAZ

Corrige nove achados da revisão, aplica o padrão visual e acrescenta o assistente
de IA.

**Não muda** o modelo de dados de unidade, o plano de pagamento, as regras de
cálculo de total e saldo, nem o vínculo com a versão Atual.

---

# 2. RESTRIÇÕES FIXAS

**2.1** A unidade continua vinculada à **versão Atual** do projeto. Nenhuma
alteração nessa origem.

**2.2** O `payment_plan` continua como está: mesma estrutura, mesmo jsonb, mesmas
seis linhas de fontes. Nada de migrar para tabela.

**2.3** As regras de `calcUnitTotal` e do saldo não mudam.

**2.4** Rotas e nomes internos não mudam: `/unidades`, `unit`, `payment_plan`,
`mesVenda`, `itemType`.

**2.5** A tela passa a se chamar **"Unidades"**. O rótulo do menu segue o Prompt C.

---

# 3. CORREÇÕES DE EXIBIÇÃO

## 3.1 · Cabeçalho que não aparece

A página monta `eyebrow` com "PROJETO · Atual" e `subtitle` com blocos, contagem
e VGV. **O `PageHeader` descarta as duas props** — por isso a tela em produção
aparece sem elas.

Voltar a exibir. Aqui a perda é maior que em outras telas: sem o eyebrow, o
usuário não sabe que está vendo a versão Atual.

**[NOTA]** `page-header.tsx` é usado pelas 48 telas. A correção é a mesma pedida
no Prompt B. Quem for primeiro faz; o outro confere.

## 3.2 · Data da venda

**Ver BJ-1.** A coluna passa a usar o `DateField`, como o resto do sistema, e o
rótulo passa de "Mês venda" para **"Data da venda"** — o campo guarda data
completa, não competência.

Nenhum valor gravado é alterado. A correção é de leitura.

## 3.3 · VGV

`vgvMi` formata sempre em milhões. Obra de R$ 500.000 vira "R$ 0,50M".

Formatar conforme a ordem de grandeza: valor cheio abaixo de um milhão,
abreviado acima. Hoje o defeito é invisível por causa de 3.1.

## 3.4 · Plural e tolerância

"1 unidades" passa a concordar. A tolerância do saldo passa de R$ 1,00 para
**R$ 0,01**, alinhada à RG-08.

**[NOTA]** Mudar a tolerância pode fazer unidades hoje exibidas como fechadas
passarem a exibir divergência. **Nenhum dado muda** — muda o que a tela sinaliza.
Reportar quantas unidades mudam de sinalização antes de aplicar.

---

# 4. IMPORTAÇÃO POR PLANILHA

## 4.1 · Duplicação

**Ver BJ-2.** A importação passa a **atualizar** a unidade existente quando o
código já existir naquela versão, em vez de inserir outra. E ganha constraint
única em `(version_id, code)`.

A constraint só é criada depois de o diagnóstico de BJ-2 vir vazio, ou depois de
o usuário resolver as duplicatas manualmente. **Se a migração falhar por
duplicidade, ela reporta e para — nunca apaga.**

## 4.2 · O que a atualização pode e não pode tocar

Ao atualizar unidade existente, a importação atualiza apenas os campos que a
planilha traz: bloco, tipo, m², andar, valor e status.

**Nunca toca no `payment_plan`.** Hoje a importação grava `emptyPlan()` em toda
unidade inserida; ao passar a atualizar, isso apagaria o plano de uma unidade
vendida. O plano só muda pelo formulário.

## 4.3 · Versão bloqueada

`saveUnit` recusa quando `version.locked`; `importUnits` **não verifica**.
Corrigir: a importação passa a respeitar o bloqueio, com a mesma mensagem.

## 4.4 · Relatório da importação

Informar quantas foram inseridas, quantas atualizadas e quantas ignoradas, com o
motivo de cada ignorada. Hoje devolve só a contagem de inseridas.

---

# 5. ACTIONS

## 5.1 · Retorno legível

`saveUnit` e `importUnits` lançam erro; `deleteUnit` faz `return` silencioso
quando falta permissão. Em produção, a mensagem lançada é substituída por um
digest genérico, e o `return` não produz nada — o usuário clica em Excluir e nada
acontece.

Converter as três para `{ ok, error }`, com a mensagem exibida na tela. Vale para
o sucesso também: salvar sem retorno visível é indistinguível de salvar que
falhou.

**Pré-condição da seção 6**, conforme a condição 1 de BJ-3. Não separar em outra
entrega.

## 5.2 · Exclusão

`deleteUnit` faz exclusão física, levando o `payment_plan` junto, sem verificar
status e sem confirmação.

Passa a exigir:

1. **Confirmação por digitação do código** da unidade.
2. **Bloqueio para unidade com status Vendido** — vender e excluir são fatos
   distintos; desfazer a venda vem antes, pelo formulário.
3. **Auditoria completa**: código, valor, status e o plano de pagamento
   removido. Hoje o `logAudit` guarda apenas o id.

**[NOTA]** A substituição da exclusão física por inativação é decisão maior, do
Prompt I, seção 12. Aqui entram as três proteções acima, que valem em qualquer
desenho.

## 5.3 · Tenant no `where`

`getUnits(versionId)` filtra apenas por versão. Hoje está guardado porque a
versão veio de `getAtualVersion`, que valida tenant — mas o filtro explícito é o
padrão das outras 164 ocorrências. Acrescentar. Sem efeito observável.

---

# 6. ASSISTENTE DE IA

Segue o **Prompt E**. O nível autorizado está fixado em **BJ-3**: proposta com confirmação humana
obrigatória, sem caminho de gravação direta, e exclusão nunca assistida.

## 6.1 · Painel

Coluna lateral direita, compacta, recolhível, com a preferência persistida por
usuário e navegador.

Recebe `projectId` e o id da versão Atual explícitos, validados no servidor
contra o tenant. Nunca por contexto implícito.

## 6.2 · O selo diz a verdade

Como o assistente propõe lançamento, **o selo não pode dizer "Somente leitura"**.
Usar rótulo que descreva o que acontece — "Confirma antes de gravar" — e o
rodapé declarando que nada é salvo sem confirmação e que a permissão continua
valendo.

Selo e função precisam concordar. Prometer somente-leitura numa tela que grava é
pior que não ter selo.

## 6.3 · Lançamento assistido — autorizado (BJ-3)

Campo de texto no painel, com entrada por voz como alternativa, **nunca como
único caminho**.

O assistente interpreta a descrição e **preenche o formulário de unidade**,
exibindo cada campo — código, tipo, valor, status, data da venda e cada linha do
plano de pagamento. **Não grava.**

O usuário revisa, ajusta e confirma. A gravação passa pela mesma `saveUnit`, com
a mesma validação e a mesma verificação de permissão **no servidor**. A auditoria
registra que a origem foi o assistente.

**Nunca assistido:** exclusão de unidade, e alteração de plano de pagamento de
unidade já vendida.

## 6.4 · Ações de análise

- **Cadastrar a partir do contrato** — lê documento anexado ao projeto e propõe
  unidade e plano. O documento precisa pertencer ao tenant e ao projeto em tela,
  validado no servidor.
- **Conferir planos de pagamento** — unidades vendidas cuja soma das fontes não
  fecha com o valor.
- **Revisar cadastro** — venda sem data, valor zerado, código repetido, unidade
  vendida sem plano.
- **Receita reconhecida** — como a venda entra na DRE, mês a mês. Só existe
  depois da seção 54 do Prompt I.

---

# 7. FORA DE ESCOPO

| Achado | Dono |
|---|---|
| `ctx.projects.find(...) ?? ctx.projects[0]` — fallback silencioso | Prompt A |
| Exclusão física substituída por inativação | Prompt I, seção 12 |
| Reconhecimento de receita da venda na DRE | Prompt I, seção 54 |
| Janela de competências do projeto | Prompt I, seção 55 |
| Materialização das parcelas em `conta_receber` | Prompt I, BI-2 |
| Rótulo do menu | Prompt C |

Não implementar nenhum deles aqui, e não corrigir de passagem.

---

# 8. PRESERVAÇÃO DE DADOS

Nenhuma unidade é criada, alterada, reclassificada ou removida por esta tarefa.
Nenhum `payment_plan` é tocado. Nenhum `mesVenda` é convertido de formato.

Migração, se houver — a constraint de 4.1 —, é aditiva, com `IF NOT EXISTS`, com
`down` correspondente, e **falha reportando** em vez de resolver duplicidade
sozinha.

---

# 9. NÃO REGRESSÃO

Não altera Projeção de Receitas, Resumo Executivo, Contas a Receber, Dashboard,
Caixa, Fechamento, Clientes, Permuta, nem qualquer tela que leia `unit`.

Não altera `calcUnitTotal`, `expandUnitReceivables`, `getReceivables` nem
`getUnitCodesByTenant`.

**[NOTA]** `getUnitCodesByTenant` e `getReceivables` são usadas por
`/contasreceber`, `/fechamento`, `/clientes/novo`, `/clientes/[id]` e pela rota
de agente. Não tocar.

---

# 10. TESTES

1. Eyebrow e subtítulo aparecem, com a versão Atual identificada.
2. VGV formatado conforme a ordem de grandeza.
3. Data da venda exibida corretamente — repetir o teste do dia 25 de BJ-1.
4. "1 unidade" no singular.
5. Saldo sinalizado com tolerância de R$ 0,01.
6. Reimportar a mesma planilha atualiza em vez de duplicar.
7. Importação não altera `payment_plan` de unidade existente.
8. Importação recusa em versão bloqueada, com mensagem legível.
9. Relatório da importação informa inseridas, atualizadas e ignoradas.
10. Excluir exige digitação do código.
11. Excluir unidade vendida é bloqueado.
12. Auditoria da exclusão registra código, valor, status e plano.
13. Salvar sem permissão exibe mensagem, não silêncio.
14. Assistente não grava sem confirmação, e respeita permissão no servidor.
15. Assistente recusa documento de outro projeto ou tenant.
16. Não existe caminho, em nenhuma tela ou API, que grave unidade a partir de
    sugestão da IA sem confirmação humana.
17. Assistente não oferece, sugere nem executa exclusão de unidade.
18. Entrada por texto funciona integralmente sem voz.
19. **Antes e depois:** contagem de `unit` e soma de `valor` por versão, em todos
    os projetos. Nenhuma diferença.
20. Projeção, Resumo, Contas a Receber e Fechamento devolvem os mesmos números.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado do teste de data de BJ-1.
2. Lista de duplicatas de BJ-2, e o que foi feito com a constraint.
3. Como as três condições de BJ-3 foram garantidas — em especial, por qual
   mecanismo se assegura que não existe caminho de gravação direta pela IA.
4. Arquivos e componentes alterados.
5. Como a importação passou a distinguir inserção de atualização.
6. Confirmação de que `payment_plan` não é tocado pela importação.
7. Quantas unidades mudaram de sinalização de saldo com a nova tolerância.
8. Funcionamento do assistente, e o que ele pode e não pode gravar.
9. Comparação antes/depois de `unit`.
10. Confirmação de que nenhum item da seção 7 foi tocado.
11. Migrações criadas, com o `down`.
12. Limitações encontradas.


<a id="prompt-k"></a>


========================================================================


### ▸ 10 de 42 · PROMPT K — Contas a Receber

**Bloco 2 · A receita** · Bloqueios: BK-0 · BK-1 · BK-2 · BK-3 · BK-4

A materialização e a competência que falta.

========================================================================


# PROMPT K — CONTAS A RECEBER

Growth Construction · `/contasreceber`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.**
Valores, planos de pagamento, datas, status e quantidades existentes em produção
permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda, converte,
normaliza, migra, reclassifica ou "corrige" um registro já gravado. Se uma
alteração exigir tocar em dado existente: **PARE, não execute, e informe qual
dado, por quê, quantos registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.** Valores, nomes de cliente, códigos
de unidade, datas e contadores dos mockups são ilustração. Nunca viram seed,
fixture, valor padrão ou dado de teste.

---

# ORDEM DE EXECUÇÃO

| | Prompt | Relação |
|---|---|---|
| **A** | Projeto ativo global | dono do fallback de contexto |
| **I** | Arquitetura de versões | dono do reconhecimento de receita (seção 54) |
| **E** | Assistente de IA | dono da arquitetura do assistente |
| **K** | **este** | a tela |
| **L** | Caixa e conciliação | **par obrigatório** — ver BK-1 |

**K e L são a mesma frente.** O modelo de vínculo entre recebível e extrato
nasce aqui e é consumido no Caixa e no Fluxo de Caixa. Escrever um sem o outro
produz dois desenhos que não encaixam.

---

# BLOQUEIOS

## BK-0 · A materialização depende das seções 54, 56 e 57 do Prompt I

**Ordem obrigatória. Não implementar a seção 2 antes disso.**

A seção 57 do Prompt I define que a DRE lê duas fontes na versão Atual: a venda
de unidade, rateada pela janela da obra, e as **contas a receber avulsas** — as
que não têm origem em plano de pagamento.

A materialização da seção 2 transforma as parcelas do plano em registros de
`conta_receber`. Se ela for a produção **antes** de 54, 56 e 57:

- `getMonthlyRevenue` continua expandindo o plano das unidades e somando à
  receita;
- e passa a somar também os registros novos, que são as mesmas parcelas;
- resultado: a mesma venda entra **três vezes** na DRE, no Dashboard, na
  Projeção, no Resumo e na Contabilidade.

**Duas condições, ambas obrigatórias:**

1. As seções 54, 56 e 57 do Prompt I em produção, com a chave ligada, **antes**
   da primeira obra ser materializada.
2. A coluna de origem da seção 2.2 criada **junto** com a materialização, nunca
   depois. Sem ela não há como distinguir parcela materializada de receita
   avulsa, e a DRE soma as duas.

**Se a decisão for materializar antes**, a seção 2 sai deste prompt e vira
tarefa própria, executada depois. Não há terceira via.

## BK-1 · O modelo de vínculo depende do Caixa

Esta tela precisa de conciliação com valor por vínculo — um depósito quitando
várias parcelas, uma parcela recebida em várias vezes. O modelo existente do
lado da despesa (`acerto_item`, `restituicao_item`) é a referência de formato.

Mas o Caixa já tem `toggleConciliado`, `pairMovimento` e `import_hash`, e
`conta_receber` já tem `origem_cash_entry_id` — vínculo 1 para 1, sem valor.

**Coletar e ler o código do Caixa antes de definir o modelo.** Sem isso, o
vínculo nasce ao lado do que existe em vez de encaixado.

**O que fica decidido independentemente:** o vínculo tem **valor por linha**, e
`origem_cash_entry_id` é preservada — descontinuada como mecanismo, nunca
removida nem migrada.

## BK-2 · INCC nos recebíveis materializados

`expandUnitReceivables` lê valores **nominais** do plano. A DRE e a Projeção
aplicam correção via `getInccRows`; esta tela não. A mesma parcela vale números
diferentes em telas diferentes.

**Escolher uma:**

1. **Gravar nominal, corrigir na leitura.** É o que a Projeção já faz.
   Recomendação: esta.
2. **Gravar corrigido.** Congela na materialização, e corrigir depois vira
   retroatividade — proibida pela regra global.

## BK-3 · Diferença de centavos

Entrou R$ 323,97 numa parcela de R$ 324,00. A parcela fecha com diferença de
R$ 0,03, ou fica com saldo em aberto?

O Acerto Contábil já tem o conceito de **diferença financeira**. Recomendação:
usar o mesmo, com tolerância declarada e o resíduo registrado, nunca somem.

## BK-4 · Contas já marcadas como recebidas à mão

Hoje o status é um `<select>` livre. Podem existir contas com status "Recebido" e
nenhum movimento de caixa por trás — em qualquer tenant.

**Entregar antes de implementar:** contagem e lista dessas contas, por tenant,
com valor e data. Elas **não são corrigidas automaticamente**: passam a exibir
"recebida, não conciliada" e vão para conferência, com decisão humana item a
item.

---

# 1. RESTRIÇÕES FIXAS

**1.1** `conta_receber` **não tem coluna de versão** — é escopada por projeto,
com cascata a partir de `project`. Nada nesta tarefa cria escopo de versão nela.

**1.1.1 · [ACRÉSCIMO]** `getMonthlyRevenue` lê `conta_receber` do projeto — não
canceladas — e agrega **pelo mês do vencimento**. Qualquer alteração nesta tela
que crie, cancele ou mude o vencimento de uma conta **muda a receita exibida em
DRE, Dashboard, Projeção, Resumo e Contabilidade**. Ver **BK-0**.

**1.2** O reconhecimento de receita na DRE **não passa por esta tela**. A seção
54 do Prompt I reconhece por rateio da duração da obra, derivado, sem gravar.
Contas a Receber é **previsão e controle de caixa**. Os dois calendários são
diferentes de propósito — é a RG-01 funcionando.

**1.3** O plano de pagamento da unidade continua sendo a origem. Nada nesta
tarefa altera `payment_plan`.

**1.4** Rotas e nomes internos não mudam.

---

# 2. MATERIALIZAÇÃO DOS RECEBÍVEIS

## 2.1 · Por que

Hoje as parcelas do plano são expandidas em memória por `getReceivables` e
exibidas numa segunda tabela. Sem id, não podem ser editadas, baixadas nem
conciliadas — e mudam retroativamente quando o plano da unidade é editado.

Para editar e conciliar, a parcela precisa existir como registro.

## 2.2 · O que se materializa

Cada linha produzida por `expandUnitReceivables` para unidade com status
**Vendido** vira uma linha em `conta_receber`.

**Colunas novas, aditivas:** origem da unidade e índice da parcela dentro do
plano, para impedir geração em duplicidade e permitir rastrear de volta.

**Nunca gerar duas vezes a mesma parcela.** A chave de origem é o que garante
isso.

## 2.3 · As vendas já existentes

São milhares de parcelas em produção. **A geração é decisão humana, obra a
obra, com prévia** do que será criado: quantas linhas, qual total, quais
vencimentos. Nunca script em massa, nunca migração que gere sozinha.

Enquanto uma obra não for materializada, ela continua exibindo os recebíveis
derivados como hoje — a tela convive com os dois modos durante a transição, e
diz qual é qual.

## 2.4 · Plano editado depois de materializado

**As parcelas já geradas não são apagadas nem regeneradas.** Isso destruiria
conciliação já feita.

O sistema passa a exibir a divergência entre o plano e as parcelas existentes, e
oferece ao usuário a decisão — parcela a parcela, com prévia. Nunca automático.

---

# 3. ESTADOS E BAIXA

## 3.1 · Três estados

| Estado | Significado |
|---|---|
| **A receber** | nada recebido |
| **Recebida** | valor recebido registrado, **sem** vínculo com extrato |
| **Recebida e conciliada** | vínculo com linha de extrato, com valor |

Parcialmente recebida é um caso de "Recebida", com saldo em aberto.

## 3.2 · O status é derivado, nunca digitado

**O `<select>` de Status sai do formulário de edição.** O estado passa a ser
calculado a partir do que foi recebido contra o que era devido, e do vínculo com
o extrato.

Isso sozinho fecha o CR-01: hoje é possível marcar "Recebido" com valor recebido
zero, ou receber R$ 5.000 numa conta de R$ 324.

## 3.3 · Baixa manual continua permitida

A operação não pode parar porque o extrato ainda não chegou, e nem todo
recebimento passa pelo banco da construtora.

A baixa manual exige **valor recebido, data e forma de recebimento**. Fica
marcada como **não conciliada**, visível na tela e contável.

## 3.4 · Recebimento que não passa pelo banco

Espécie, ou repasse de terceiro pela RG-04, não têm linha de extrato e não podem
ficar eternamente pendentes de conciliação.

São **documento próprio**, com justificativa obrigatória e auditoria. Fecham sem
fingir conciliação.

## 3.5 · Indicador permanente

A tela exibe, sempre: quanto está **recebido sem conciliar** e há quantos dias.
É o número que denuncia extrato não importado.

---

# 4. CONCILIAÇÃO

**Ver BK-1 para o modelo.**

**4.1** Conciliar exige **linha de extrato** — importada por arquivo ou por Open
Finance. Não existe conciliação declarada.

**4.2** O vínculo tem **valor por linha**: um depósito pode quitar várias
parcelas, e uma parcela pode ser recebida em vários depósitos. A soma dos
vínculos de um movimento não pode exceder o valor do movimento.

**4.3** Desfazer conciliação é **estorno do vínculo**, com registro de quem,
quando e por quê. Nunca exclusão física.

**4.4** O **Fluxo de Caixa realizado consome apenas o conciliado.** O recebido
não conciliado aparece ao lado, identificado, **nunca somado em silêncio**.

**4.5** `origem_cash_entry_id` é preservada como está. Nenhum valor gravado nela
é alterado ou migrado.

---

# 5. EDIÇÃO — SIMETRIA COM DESPESAS

A tela passa a ter edição no mesmo padrão de Despesas.

## 5.1 · O que espelha

- Formulário de edição completo, com os mesmos padrões de campo e validação.
- **Trava por dependência:** conta conciliada não aceita alteração de valor nem
  de vencimento sem estorno do vínculo. Espelha a regra da despesa com pagamento.
- Cancelamento lógico, que já existe nas duas.

## 5.2 · O que NÃO espelha, e por quê

- **Parcelas.** Do lado da receita, a parcela **é** a conta a receber. Criar
  `conta_receber_parcela` seria parcela de parcela.
- **Recorrência.** Quem gera repetição é o plano de pagamento da unidade.
- **PED.** O número interno sequencial é da despesa, e a RG-06 fala dele nesse
  contexto. Numeração própria para recebíveis é decisão separada, e exigiria
  sequência própria — nunca a mesma.

## 5.3 · A assimetria de propósito

Do lado da despesa, o pagamento é **ato da empresa**. Do lado da receita, o
recebimento é **ato do cliente** — a empresa descobre que recebeu.

Por isso a baixa não é o espelho de `pagarDespesa`, e por isso existe o estado
intermediário "recebida, não conciliada", que não tem equivalente do outro lado.

**[NOTA]** Antes de implementar, ler `despesa-form.tsx` e as actions de despesa,
já coletadas em `CODIGO-BLOCO-4.md`. A simetria é com o que existe, não com o
que se imagina.

---

# 6. DOCUMENTOS ANEXADOS

**6.1** A tabela `document` já tem `project_id`, `cliente_id`, `fornecedor_id` e
`despesa_id`. **Acrescentar `conta_receber_id`** — coluna aditiva, anulável, com
`ON DELETE set null`.

**6.2** Anexar boleto, comprovante ou contrato a uma conta a receber, no mesmo
fluxo de upload que a despesa já usa.

**6.3** Excluir o vínculo do documento **não apaga o objeto no R2** hoje. Manter
o comportamento atual — a limpeza de órfãos é tarefa própria, fora daqui —, mas
a auditoria passa a registrar nome do arquivo e chave.

**[FORA DE ESCOPO]** Documento fiscal de saída e emissão de NFS-e. Existe base
para isso — 26 colunas fiscais em `empresa` e o código IBGE do município da obra,
que define onde o ISS é devido —, mas é frente própria, não item desta tela.

---

# 7. CORREÇÕES DA REVISÃO

**7.1 · CR-02 · A lista está ordenada errado.** `getContasReceber` faz
`orderBy(asc(vencimento))` sobre coluna `text` em `MM/DD/YYYY`. A ordenação é
lexicográfica: ordena por mês, depois dia, depois ano — dezembro de 2025 aparece
depois de janeiro de 2026. Normalizar antes de ordenar. **Nenhum dado é
convertido**; muda a ordenação da consulta.

**7.2 · CR-04 · Trava de valor assimétrica.** `createContaReceber` bloqueia zero;
`updateContaReceber` não valida nada — cria-se com R$ 100 e edita-se para zero.
E nenhuma das duas bloqueia **negativo**: o teste é `valorCR === 0`. Corrigir as
duas.

**7.3 · CR-05 · `tipo` e `status` sem domínio.** São `text` com whitelist apenas
nos `<option>`. Validar no servidor. E há divergência declarada: o comentário do
schema diz `Cancelado`, o código grava `Cancelada`. **Não migrar valores
existentes** — apenas fixar o domínio daqui para frente e reportar as
divergências encontradas.

**7.4 · CR-06 · Carga em memória.** A página traz todas as contas e todos os
recebíveis do tenant, filtra por projeto em memória, e monta uma terceira cópia
para a busca, que vai inteira para o navegador. Filtrar na consulta.

**7.5 · CR-07 · Unidade de outro projeto.** O select oferece códigos do tenant
inteiro. Filtrar pelo projeto selecionado.

**7.6 · CR-08 · Identificador do recebível.** Os recebíveis derivados chegam ao
componente sem o `refId` que a consulta produz; a `key` é o índice da linha.
Passar o identificador — é pré-requisito de qualquer vínculo.

**7.7 · CR-09 · Retorno legível.** As três actions lançam erro; em produção a
mensagem é substituída por um digest genérico. Converter para `{ ok, error }` e
exibir. **Pré-condição do assistente**, pela mesma razão de sempre.

---

# 8. ASSISTENTE DE IA

Segue o **Prompt E**. Painel lateral, recolhível, com `projectId` explícito
validado no servidor contra o tenant.

## 8.1 · Leitura de documento com proposta de vínculo

Função própria desta tela: o assistente lê o **boleto ou o comprovante**
anexado — valor, vencimento, sacado — e **propõe** a qual conta em aberto ele
corresponde.

O documento precisa pertencer ao tenant e ao projeto em tela, validado no
servidor, nunca por id vindo do cliente.

## 8.2 · Proposta de conciliação

Quando o extrato entrar, a mesma lógica **sugere** o match entre linha de
extrato e conta em aberto, por valor, data e cliente.

**Sugerir é seguro; o vínculo só existe depois da confirmação humana.** O status
continua derivado.

## 8.3 · Análises

- contas vencidas sem recebimento, por idade
- recebidas sem conciliar, e há quantos dias
- divergência entre plano de pagamento e parcelas materializadas
- contas sem unidade ou sem cliente vinculado
- parcelas cujo valor destoa do padrão do plano

## 8.4 · O que o assistente nunca faz nesta tela

Dar baixa. Conciliar sozinho. Alterar valor de conta já conciliada. Cancelar
conta.

## 8.5 · O selo diz a verdade

Como o assistente propõe vínculo, o selo não pode dizer "Somente leitura". Usar
redação que descreva o que acontece: o assistente propõe, o usuário confirma.

---

# 9. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Reconhecimento de receita na DRE | Prompt I, seção 54 |
| Modelo de conciliação no Caixa e no Fluxo | Prompt L |
| Fallback silencioso de projeto | Prompt A |
| Documento fiscal de saída e NFS-e | frente própria |
| Limpeza de objetos órfãos no R2 | tarefa própria |

---

# 10. PRESERVAÇÃO DE DADOS

Nenhuma conta a receber existente é alterada, reclassificada ou removida.
Nenhum `payment_plan` é tocado. Nenhum `origem_cash_entry_id` é migrado.
Nenhum status existente é convertido.

Migrações são aditivas — colunas de origem da parcela, `conta_receber_id` em
`document`, e a tabela de vínculo —, com `IF NOT EXISTS` e `down`.

A materialização das vendas existentes **não é migração**: é operação de tela,
obra a obra, com prévia e decisão humana.

---

# 11. TESTES

1. Status não é editável em lugar nenhum; é sempre derivado.
2. Baixa manual exige valor, data e forma, e resulta em "recebida, não
   conciliada".
3. Conciliar sem linha de extrato é impossível por qualquer caminho.
4. Um depósito quitando três parcelas distribui o valor corretamente.
5. Uma parcela recebida em dois depósitos fecha com a soma.
6. Soma dos vínculos não excede o valor do movimento.
7. Desfazer conciliação registra quem, quando e por quê, sem apagar.
8. Fluxo de Caixa realizado conta apenas o conciliado.
9. Indicador de recebido não conciliado confere com a lista.
10. Materializar uma obra duas vezes não duplica parcelas.
11. Editar o plano depois de materializar não apaga nem regenera parcelas.
12. Conta conciliada recusa alteração de valor e de vencimento.
13. Lista ordenada por vencimento em ordem cronológica real, incluindo virada
    de ano.
14. Valor zero e negativo recusados na criação e na edição.
15. Select de unidade oferece apenas unidades do projeto selecionado.
16. Assistente não grava, não concilia e não dá baixa por nenhum caminho.
17. Assistente recusa documento de outro projeto ou tenant.
18. **Antes e depois:** contagem de `conta_receber` e soma de `valor` e
    `valor_recebido`, por tenant. Nenhuma diferença que não seja materialização
    autorizada explicitamente.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Lista de BK-4 — contas hoje marcadas como recebidas sem lastro.
2. Decisões de BK-1 a BK-3 e como foram implementadas.
3. Modelo de vínculo adotado, e como encaixa no que o Caixa já tem.
4. Colunas e tabelas criadas, com o `down` de cada migração.
5. Como o status passou a ser derivado, e onde o cálculo vive.
6. Como a materialização é disparada, e o que a prévia mostra.
7. O que acontece quando o plano diverge das parcelas.
8. Funcionamento do assistente, e confirmação de que não grava.
9. Comparação antes/depois de `conta_receber`.
10. Confirmação de que nenhum item da seção 9 foi tocado.
11. Limitações encontradas.


<a id="prompt-p"></a>


========================================================================


### ▸ 11 de 42 · PROMPT P — Permuta

**Bloco 2 · A receita** · Bloqueios: BP-1 · BP-2 · BP-3

Ativo, não receita.

========================================================================


# PROMPT P — PERMUTA: ATIVOS E INVENTÁRIO

Growth Construction · `/permuta` e `/permuta/novo`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Valores, datas,
status e vínculos existentes permanecem exatamente como estão. Nenhuma tarefa
recalcula, converte, normaliza, migra ou "corrige" um registro já gravado. Se
uma alteração exigir tocar em dado existente: **PARE, não execute, e informe
qual dado, por quê, quantos registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.** Valores, descrições e datas dos
mockups são ilustração. Nunca viram seed, fixture, valor padrão ou dado de teste.

---

# O CONCEITO

**O bem recebido em permuta é um ativo, não uma receita.**

Ele entra no **inventário** pelo valor estimado, e ali permanece. Quando é
vendido, gera **caixa** — e o que entra no resultado é o **ganho ou a perda**:
valor da venda menos o valor pelo qual o bem entrou.

Enquanto não for vendido, é apenas mais um ativo em estoque.

A definição completa das fontes de receita da DRE está na **seção 57 do
Prompt I**. Esta tela implementa o lado do inventário.

---

# ORDEM DE EXECUÇÃO

Depende da **seção 57 do Prompt I** para o tratamento contábil, e do **Prompt E**
para a arquitetura do assistente. Independente dos demais.

**A parte 1 pode ir sozinha** — são correções de integridade que não dependem de
nenhuma decisão pendente.

---

# BLOQUEIOS

## BP-1 · O inventário novo ou o Estoque que já existe?

`stock_movement` tem coluna **`permuta_id`**, com chave estrangeira para
`permuta` e `ON DELETE set null`. O módulo de Estoque já prevê que um bem
recebido em permuta vire movimento de estoque.

**Entregar antes de implementar:**

1. O que grava `stock_movement.permuta_id` hoje — se alguma coisa grava.
2. Quantos movimentos de estoque têm `permuta_id` preenchido em produção.
3. O que a tela `/estoque` faz com esses movimentos.

**Escolher uma:**

1. **O inventário é o Estoque.** O bem de permuta entra como item de estoque, e
   esta tela ganha apenas a visão consolidada, lendo de lá. Não duplica dado.
2. **Inventário próprio nesta tela.** Mais simples de implementar, e cria uma
   segunda contagem do mesmo ativo. Se for esta, precisa ficar declarado que os
   dois inventários não se conversam.

Recomendação: a **1**, se o vínculo já funcionar. Um mesmo bem em dois
inventários é o mesmo defeito que a seção 57 corrige do lado da receita.

## BP-2 · O status deve governar o reconhecimento?

Hoje `permutaRevenueByMonth` e `permutaCashByMonth` decidem por **`formaVenda`**,
não por `status`. Um ativo com status `"Disponivel"`, mas com `valorVenda` e
`dataVenda` preenchidos, **já gera receita na DRE e no Fluxo de Caixa**.

O `status` é lido em **um único ponto do repositório**: o `permVend` de
`calcTotals`, que alimenta o Resumo Executivo. Por isso o Resumo e a DRE
discordam por desenho — um mostra só o vendido, o outro mostra tudo que tem
valor de venda preenchido.

**Pela definição do conceito, o status deve governar:** sem venda, o bem é
inventário.

**[NOTA]** Fazer o status governar **muda número** — ativos hoje gerando receita
com status `"Disponivel"` deixam de gerar. Reportar quantos são e o valor
envolvido antes de aplicar, e entrar junto com a chave da seção 57.

## BP-3 · O escambo é venda?

`permutaRevenueByMonth` reconhece o escambo na DRE pela data da troca, e
`permutaCashByMonth` o exclui do caixa. Conceitualmente coerente: trocar um bem
por outro realiza o ganho sem gerar dinheiro.

Mas isso conflita com a sua definição — "gera caixa no momento da venda, caso
contrário é ativo no inventário".

**Escolher uma:**

1. **Escambo realiza o ganho**, sem caixa. Mantém o comportamento atual, e a
   tela precisa deixar claro que aquele valor não entra no caixa.
2. **Escambo é troca de ativo**: sai um bem do inventário, entra outro. Nenhum
   resultado até que algo seja efetivamente vendido.

**Confirmar com o contador do cliente.** A escolha muda o resultado do exercício.

---

# PARTE 1 — INTEGRIDADE

# 1. A PROMESSA FALSA

**1.1** As duas telas afirmam, em destaque verde: *"VENDIDO gera receita na
Projeção e atualiza automaticamente o campo Permuta em Dados_de_Venda."*

**A segunda metade não existe.** Nenhum código do repositório escreve a linha
`Permuta` do `payment_plan` em resposta a uma permuta. Os seis pontos que gravam
`paymentPlan` não têm relação com a tabela `permuta`, e a única escrita daquela
linha é manual, pelo formulário de unidade.

**1.2 · O risco.** Quem lê o aviso pode preencher a linha Permuta do plano
acreditando que é o mesmo registro — e aí o bem passa a ser contado duas vezes:
uma dentro do preço da unidade, outra pela tabela `permuta`.

**A duplicidade não é automática; é induzida pelo aviso.**

**1.3 · Corrigir o texto.** Remover a afirmação falsa. Se o comportamento for
desejável, é funcionalidade nova, com prompt próprio — não texto de tela.

**1.4 · "Dados_de_Venda" é nome de aba de planilha.** Vocabulário de origem em
produção, como o SUMIFS das Liberações de Obra. Sai junto.

**1.5 · Diagnóstico, somente leitura.** Listar unidades cuja linha `Permuta` do
`payment_plan` tenha valor maior que zero **e** que tenham registro
correspondente na tabela `permuta` — a duplicidade efetiva, projeto a projeto,
com os dois valores lado a lado. **Nenhum registro é alterado.**

---

# 2. EDITAR E ESTORNAR

**2.1** Só existe `addPermuta`. Não há editar, excluir, cancelar nem estornar em
todo o repositório. Lançou, ficou — e continua gerando receita e caixa.

**2.2 · Edição** de todos os campos, enquanto o ativo não estiver cancelado,
registrando **valor anterior e valor novo** no padrão que `updateCliente` já
cumpre.

**2.3 · Cancelamento lógico**, no padrão da `despesa`: flag, data, autor e
motivo. O registro permanece legível, sai dos totais e da receita.

**Nenhum registro existente é alterado** — todos nascem não cancelados, que é o
comportamento de hoje.

**2.4** As consultas e os cálculos passam a ignorar os cancelados:
`getPermutas`, `permutaRevenueByMonth`, `permutaCashByMonth` e `calcTotals`.

---

# 3. VALIDAÇÃO, AUDITORIA E PERMISSÃO

**3.1** `addPermuta` grava dezessete campos **sem validar nenhum**. Valor
estimado vazio vira `"0"`, valor de venda idem, datas inválidas passam.

Validar: valor estimado maior que zero, unidade e cliente obrigatórios, data de
recebimento obrigatória. Para ativo marcado como vendido, exigir data e valor de
venda.

**3.2 · Retorno legível.** A action faz `return` silencioso sem permissão e não
retorna nada em caso de erro. Converter para `{ ok, error }`. **Pré-condição da
seção 6.**

**3.3 · Auditoria.** `addPermuta` não chama `logAudit` — está na lista das treze.
Acrescentar nas três actions.

**3.4 · Permissão de ver.** A listagem vai do contexto direto para a consulta,
sem chamar `can`. **Quinta tela com esse furo**, depois de `/clientes`,
`/clientes/[id]`, `/contabilidade` e `/reembolso`. Acrescentar com
`AccessDenied`.

**3.5 · Filtro de tenant** em `getPermutas`, que hoje filtra só por versão.

**3.6 · Cliente por id, não por nome.** O select grava `c.nomeCompleto` como
texto. Renomear o cliente quebra o vínculo. Passar a gravar o id, mantendo a
coluna atual preenchida para não quebrar o histórico, e exibindo o nome vindo do
cadastro.

**[NOTA]** Isto exige coluna nova, aditiva. **Nenhum registro existente é
convertido** — os que têm só o nome continuam exibindo o nome.

---

# 4. RECONHECIMENTO

**4.1 · Alinhamento com a seção 57 do Prompt I.** A revenda deixa de entrar como
**receita pelo valor cheio**. O que entra no resultado é o **ganho ou a perda**:
`valorVenda` menos `estimado`.

Um bem que entrou por R$ 80.000 e foi revendido por R$ 82.000 hoje gera
R$ 82.000 de receita. O resultado da operação foi R$ 2.000.

**4.2 · O caixa não muda.** `permutaCashByMonth` continua correta: a venda gera
entrada de caixa pelo valor recebido, à vista ou parcelada, na periodicidade
informada. Fluxo de Caixa e Controle de Caixa seguem como estão.

**4.3 · Fragilidade a corrigir de passagem.** `permutaRevenueByMonth` copia tudo
que veio de `permutaCashByMonth` e **depois** acrescenta o escambo. Hoje não
duplica, porque `permutaCashByMonth` pula o escambo com `continue`. Qualquer
mudança naquele filtro reintroduz a soma dupla, sem erro visível. Tornar a
separação explícita.

**4.4** Ver **BP-2** e **BP-3**.

---

# PARTE 2 — INVENTÁRIO

# 5. A SEÇÃO DE INVENTÁRIO

**Ver BP-1 antes de implementar.**

**5.1 · Onde fica.** Seção abaixo da listagem de ativos, na mesma tela.

**5.2 · O que mostra.** Os ativos **ainda em estoque** — recebidos e não
vendidos — com tipo, descrição, unidade de origem, cliente, data de recebimento,
valor estimado e tempo em estoque.

Mais os totais: quantidade e valor estimado em estoque, por tipo de bem.

**5.3 · Tempo em estoque.** Dias entre a data de recebimento e hoje. É o número
que mostra ativo parado — e é a informação que a tela não oferece hoje.

**5.4 · Exportar planilha.** `.xlsx` com o inventário, no mesmo padrão das
exportações que já existem no sistema.

**5.5 · Importar planilha.** Entrada em massa de ativos, com **prévia
obrigatória** antes de gravar: quantas linhas serão inseridas, quantas
atualizadas, quantas ignoradas e por quê.

**Regras da importação**, aprendidas com o defeito da importação de unidades:

- **Atualiza em vez de duplicar.** Linha com identificador que já existe
  atualiza o registro; sem identificador, insere.
- **Respeita `version.locked`.** A trava que vale no cadastro manual vale aqui —
  é exatamente onde a importação de unidades falha hoje.
- **Não toca em ativo vendido.** Ativo com venda registrada não é alterado por
  planilha.
- **Aceita vírgula decimal.** `Number("1.234,56")` devolve `NaN`, e
  `NaN || 0` grava zero silenciosamente — o defeito da importação do
  Orçamento. Célula não interpretável é **reportada**, nunca convertida em zero.

**5.6 · Modelo para download**, como a tela de Unidades já oferece.

---

# 6. DOCUMENTOS DO ATIVO

Um bem recebido em permuta vem com papel: matrícula de imóvel, documento de
veículo, laudo de avaliação, contrato de permuta, recibo. Hoje não há onde
anexá-los nesta tela.

**6.1 · Coluna nova.** A tabela `document` tem `despesa_id`, `cliente_id`,
`stakeholder_id`, `project_id` e `unit_code`. **Não tem `permuta_id`.**
Acrescentar — coluna aditiva, anulável, com `ON DELETE set null`, no mesmo
formato que o Prompt K pede para `conta_receber_id`.

**6.2 · Onde fica.** Bloco no formulário do ativo, entre a revenda e as
observações, com seletor de tipo, área de anexo e a lista dos documentos já
ligados.

**6.3 · Tipos.** Matrícula ou documento do bem · Laudo de avaliação · Contrato
de permuta · Recibo · Outros. Reaproveitar o mecanismo de tipo que a tela de
Clientes e a de Projetos já usam, não criar um terceiro.

**6.4 · Versionamento por tipo.** Anexar documento do mesmo tipo cria versão
nova e **preserva a anterior**.

**[NOTA — não repetir o defeito da tela de Clientes]** Lá o comentário do código
promete "maior versão do mesmo cliente **e tipo**", e a consulta filtra **só por
cliente**. O resultado é que um comprovante anexado depois de um contrato v1
vira "comprovante v2". Aqui a versão é calculada por `(permuta_id, tipo)`.

**6.5 · Remover desfaz o vínculo, não apaga o arquivo.** É o comportamento atual
do sistema, e a tela deve **dizer isso** em vez de deixar supor. A auditoria
registra o nome do arquivo e a chave de armazenamento — o que hoje não acontece
em nenhuma das telas com anexo.

**6.6 · Validação.** Tipo obrigatório, tamanho máximo declarado na interface, e
mensagem legível quando o envio falhar — ver 3.2.

**6.7 · Permissão.** Anexar e remover seguem a permissão de editar da tela,
verificada **no servidor**. Documento só é visível a quem pode ver o ativo.

**[FORA DE ESCOPO]** A limpeza de objetos órfãos no armazenamento é tarefa
própria, comum a todas as telas com anexo.

---

# 7. ASSISTENTE DE IA

Segue o **Prompt E**.

**7.1 · Nível autorizado: propõe e para.** O assistente preenche o formulário e
exibe cada campo; **a gravação é do usuário**, pelo botão, passando pela mesma
action e pela mesma validação.

Mesmo desenho aprovado para a tela de Unidades: sem caminho de gravação direta,
nem atalho para o usuário experiente.

**7.2 · O selo diz a verdade.** Como o assistente propõe lançamento, não usar
"Somente leitura". Redação que descreva o que acontece.

**7.3 · Lançar por descrição**

Campo de texto no painel, com voz como alternativa e **nunca como único
caminho**. O assistente interpreta e preenche o cadastro do ativo — tipo,
descrição, valor estimado, unidade de origem, cliente e data de recebimento.

O usuário revisa, ajusta e confirma.

**7.4 · Ler documento anexado**

Extrai os dados do documento **anexado ao próprio ativo** (seção 6) — matrícula,
nota de veículo, laudo, contrato — e propõe o preenchimento do cadastro.

A validação é no servidor: o documento precisa pertencer ao tenant, ao projeto em
tela e ao ativo aberto. **Nunca por id vindo do cliente sem verificação.**

**7.5 · Análises**

- **Ativos parados** — em estoque há mais tempo que o normal, por tipo.
- **Cadastro incompleto** — sem valor estimado, sem unidade de origem, sem
  cliente, ou marcado como vendido sem data ou valor de venda.
- **Venda abaixo do valor de entrada** — ativos revendidos por menos que o
  estimado, com o resultado de cada um.
- **Duplicidade com o plano de pagamento** — unidades cuja linha `Permuta` tem
  valor e que também têm ativo registrado nesta tela. É o diagnóstico de 1.5,
  disponível como consulta.

**7.6 · Nunca assistido:** cancelar ativo, alterar valor de ativo já vendido, e
importar planilha — importação em massa continua sendo ação explícita, com
prévia.

**7.7 · Linguagem.** O assistente trata o bem como **ativo**, e a venda como
geradora de **caixa e ganho** — nunca como receita. Enquanto a seção 57 do
Prompt I não estiver em produção, os totais de receita contam a revenda pelo
valor cheio, e o assistente não repete esse número.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Definição das fontes de receita da DRE | Prompt I, seção 57 |
| Escrever a linha `Permuta` do plano a partir da tabela | funcionalidade nova, prompt próprio |
| Unificação com o módulo Estoque | depende de BP-1 |
| Contexto de projeto e versão explícito | Prompt A |
| Varredura de permissão em todas as rotas | Prompt M, seção 2.3 |

---

# 9. PRESERVAÇÃO DE DADOS

Nenhum ativo existente é alterado, cancelado, reclassificado ou removido. Nenhum
`estimado`, `valorVenda`, `status`, `formaVenda` ou data é convertido. Nenhum
`payment_plan` é tocado. Nenhum cliente gravado por nome é migrado para id.

Nenhum documento existente é alterado, revinculado ou removido.

Migrações — colunas de cancelamento, de vínculo com cliente e `permuta_id` em
`document` — são aditivas, com
`IF NOT EXISTS`, `down` correspondente, e default que preserva o comportamento
atual.

---

# 10. TESTES

1. O aviso sobre "Dados_de_Venda" não existe mais.
2. Lançamento sem valor estimado, sem unidade ou sem cliente é recusado com
   mensagem.
3. Ativo marcado como vendido exige data e valor de venda.
4. Sem permissão de ver, a listagem não é acessível por URL direta.
5. Toda gravação registra auditoria.
6. Editar registra valor anterior e valor novo.
7. Cancelar preserva o registro e o tira da receita, do caixa e dos totais.
8. A revenda entra no resultado pelo **ganho**, não pelo valor cheio.
9. O caixa da revenda permanece idêntico ao de hoje.
10. Escambo segue a decisão de BP-3, e não é somado duas vezes.
11. Inventário lista apenas ativos não vendidos, com tempo em estoque correto.
12. Exportar e reimportar a mesma planilha **não duplica** ativos.
13. Importação recusa em versão bloqueada.
14. Importação não altera ativo vendido.
15. Célula com vírgula decimal é lida corretamente, ou reportada — nunca
    convertida em zero.
16. Anexar documento do mesmo tipo gera versão nova; a anterior permanece
    acessível.
17. Documento de tipo diferente **não** herda a versão do anterior.
18. Remover documento registra nome e chave em auditoria, e não apaga o arquivo.
19. Documento só é visível a quem pode ver o ativo.
20. Assistente não grava sem confirmação, e respeita permissão no servidor.
21. Assistente recusa documento de outro projeto, de outro tenant ou de outro
    ativo.
22. **Antes e depois:** contagem de `permuta` e soma de `estimado` e
    `valor_venda` por versão. Nenhuma diferença.
23. **Antes e depois:** com a chave da seção 57 desligada, DRE, Fluxo de Caixa,
    Caixa e Resumo devolvem os mesmos totais.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado de BP-1: o que grava `stock_movement.permuta_id`, quantos
   movimentos existem, e a decisão sobre o inventário.
2. Decisões de BP-2 e BP-3, e o efeito de cada uma nos números.
3. Diagnóstico de 1.5 — duplicidade entre plano e tabela, projeto a projeto.
4. Quantos ativos geram receita hoje com status diferente de `"Vendido"`, e o
   valor envolvido.
5. Como o ganho passou a ser calculado, e onde.
6. Arquivos e componentes alterados.
7. Como a importação distingue inserção de atualização.
8. Como a coluna `permuta_id` foi acrescentada a `document`, e como a versão
   por tipo foi calculada.
9. Funcionamento do assistente, e o que ele pode e não pode gravar.
10. Comparação antes/depois de `permuta` e dos quatro relatórios.
11. Confirmação de que nenhum item da seção 8 foi tocado.
12. Migrações criadas, com `down`.
13. Limitações encontradas.


<a id="prompt-o"></a>


========================================================================


### ▸ 12 de 42 · PROMPT O — Liberações de Obra

**Bloco 2 · A receita** · Bloqueios: BO-1 · BO-2

Caixa, não receita.

========================================================================


# PROMPT O — LIBERAÇÕES DE OBRA (ex-Reembolso)

Growth Construction · `/reembolso` e `/reembolso/novo`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Valores, datas,
origens e status existentes permanecem exatamente como estão. Nenhuma tarefa
recalcula, converte, normaliza, migra ou "corrige" um registro já gravado. Se
uma alteração exigir tocar em dado existente: **PARE, não execute, e informe
qual dado, por quê, quantos registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.** Valores, datas e origens dos
mockups são ilustração. Nunca viram seed, fixture, valor padrão ou dado de teste.

---

# ESCOPO

**A estrutura da tela não muda.** Ela foi validada com o cliente: mesma
listagem, mesmos campos no cadastro, mesmo fluxo. Esta tarefa faz três coisas:

1. Renomeia a tela.
2. Corrige os defeitos levantados na revisão.
3. Acrescenta o assistente de IA.

**Não faz:** redesenho, campos novos de negócio, vínculo com unidade ou obra,
mudança no que a tela calcula ou em como ela alimenta os relatórios.

---

# DUAS ENTREGAS, DOIS DEPLOYS

**PARTE 1 — Rename e limpeza.** Seções 1 e 2. Pequena, segura, sem efeito em
dado nem em cálculo. Vai sozinha.

**PARTE 2 — Integridade e assistente.** Seções 3 a 6. Muda comportamento de
gravação e acrescenta o painel.

---

# ORDEM DE EXECUÇÃO

Depende do **Prompt C** para o rótulo no menu e do **Prompt E** para a
arquitetura do assistente. Independente dos demais.

---

# BLOQUEIOS

## BO-1 · RESPONDIDO — a tela está somada em duplicidade

Confirmado no código. `getMonthlyRevenue`, na versão Atual, soma os reembolsos
junto com os recebíveis expandidos do `payment_plan` — e o plano já contém a
linha de financiamento bancário. O mesmo dinheiro entra duas vezes em **DRE,
Dashboard, Projeção, Resumo e Contabilidade**. O Consolidado soma `reemb` no
TOTAL, e a Projeção exibe linha própria.

**A correção pertence ao Prompt I, seções 56 e 57** — não a este. Aqui a tela
fica como está.

A seção 57 fecha a definição: a DRE passa a ler duas fontes — venda de unidade e
receita avulsa — e a liberação sai da receita, indo para o Fluxo de Caixa
realizado e o Controle de Caixa. A duplicidade tem a mesma causa da permuta: o
plano de pagamento prevê a fonte, uma tabela registra a realização, e o sistema
soma as duas.

**Consequência para este prompt:** a seção 6.4 deixa de ser precaução e passa a
ser regra. Enquanto a seção 56 não estiver em produção, o assistente **não pode**
tratar a liberação como receita nem somá-la a qualquer total de receita, porque
o número exibido nessas cinco telas está inflado.

## BO-2 · A porcentagem tem alguma base?

`pct` é `text` livre, **não é usada em cálculo nenhum** em todo o repositório.
Só é exibida e exportada. Aceita qualquer coisa, inclusive texto.

**Escolher uma:**

1. **Alguém preenche e usa para leitura própria.** Fica, com validação de faixa
   e rótulo que diga de que é percentual.
2. **Ninguém preenche.** Sai da tela e a coluna é descontinuada no banco, sem
   ser removida.

**Entregar antes:** quantos lançamentos têm `pct` preenchido, e com quais
valores.

---

# PARTE 1

# 1. RENOMEAR PARA "LIBERAÇÕES DE OBRA"

**1.1** Título da tela, rótulo no menu e o botão de criação passam a
**"Liberações de Obra"** e **"Nova liberação"**.

O título da tela de cadastro passa de "Novo Reembolso" para **"Nova liberação de
obra"**, e o botão de "Salvar reembolso" para **"Salvar liberação"**.

O nome segue o vocabulário do setor: a Caixa fala em liberação de parcelas de
obra conforme o cronograma físico-financeiro, liberadas após a medição pela
engenharia. "Reembolso" descreve outra coisa.

**1.2 · Não usar "Repasse".** O sistema já tem a tabela `repasse`, do
recebimento por terceiro (RG-04). Dois conceitos com o mesmo nome em módulos
diferentes.

**1.3 · Nada de nome interno muda.** Rotas `/reembolso` e `/reembolso/novo`,
tabela `reembolso`, action `addReembolso`, campo `reemb` em `calcTotals`, e os
rótulos "Reembolso" nas linhas da Projeção, do Consolidado, do Resumo e do
Caixa — esses últimos acompanham o rename **apenas como texto exibido**, sem
alterar chave, mapa nem cálculo.

Renomear rótulo é apresentação; renomear dado é migração.

---

# 2. LIMPEZA DE VESTÍGIOS DE PLANILHA

**2.1 · Remover o aviso sobre SUMIFS.** O texto "O SERIAL é calculado
automaticamente via INT(Data). A Projeção usa SUMIFS comparando col SERIAL com
seriais de cada mês" descreve a planilha de origem, **não este sistema**.

Nenhum cálculo lê o serial: `reembToCalc` o descarta, `CalcReembolso` não o
declara, e `reembursementsByMonth` agrega pela própria data. O aviso está em
produção dizendo ao usuário algo que não acontece.

**2.2 · A coluna SERIAL sai da listagem.** Nenhum usuário tem o que fazer com
dias desde 1899-12-30.

**A coluna `serial` permanece no banco**, continua sendo gravada por
`excelSerial` e continua indo para a exportação `.xlsx` e voltando na
importação — quatro pontos dependem dela nesse trânsito. Campo que sai de uso é
descontinuado na interface, não removido.

**2.3 · Subtítulo.** "Aba própria — Data REAL + SERIAL automático" é vocabulário
de planilha e não aparece na tela, porque o `PageHeader` descarta subtítulo.
Reescrever para algo que descreva a tela, e exibir — ver 2.4.

**2.4 · Voltar a exibir subtítulo e eyebrow.** Mesma correção pedida nos Prompts
B, J, M e N; quem for primeiro faz, os demais conferem. Aqui o eyebrow mostra a
versão, o que importa numa tela versionada.

---

# PARTE 2

# 3. INTEGRIDADE DO LANÇAMENTO

**3.1 · `addReembolso` não valida nada.** Valor vazio vira `"0"`, negativo
passa, data inválida grava `serial: null` sem aviso, e o registro entra assim
mesmo nos totais da Projeção, do Consolidado, do Resumo e do Caixa.

Validar: valor maior que zero, data preenchida e em formato válido, origem
obrigatória. Recusar com mensagem legível.

**3.2 · Retorno legível.** A action faz `return` silencioso quando falta
permissão — o usuário clica em Salvar, é redirecionado, e nada foi gravado. E
qualquer erro lançado tem a mensagem substituída em produção.

Converter para `{ ok, error }` e exibir na tela. **Pré-condição da seção 6**:
sem isso, uma proposta assistida que falhe não diz por quê.

**3.3 · Auditoria.** `addReembolso` não chama `logAudit` — está na lista das
treze actions sem rastro. Acrescentar, com valor, data e origem.

**3.4 · Permissão de ver.** A listagem vai do contexto direto para a consulta,
**sem chamar `can(ctx.perms, "reembolso", "ver")`**. É a quarta tela com o mesmo
furo, depois de `/clientes`, `/clientes/[id]` e `/contabilidade`.

Acrescentar a verificação com `AccessDenied`, no padrão do resto do sistema.

**[NOTA]** A varredura de **todas** as rotas com esse furo é da seção 2.3 do
Prompt M. Aqui, só esta tela.

**3.5 · Filtro de tenant.** `getReembolsos` filtra apenas por versão. Hoje está
guardado pelo contexto, mas o padrão das outras 164 ocorrências é o filtro
explícito. Acrescentar. Sem efeito observável.

---

# 3-A. O FORMULÁRIO DE CADASTRO

A estrutura não muda — os mesmos campos, na mesma disposição. O que entra é o
que falta para o lançamento não nascer inválido.

**3-A.1 · Campos obrigatórios marcados.** Data, origem e valor. A marcação na
interface acompanha a validação de 3.1, que é no servidor — a marcação sozinha
não valida nada.

**3-A.2 · Placeholder da origem.** Hoje é "Origem X", que não diz o que o campo
guarda. Trocar por exemplo real do domínio, no formato que a operação já usa —
banco e referência da medição.

**3-A.3 · Dizer para que serve a data.** Uma linha abaixo do campo: é a data em
que o recurso entrou, e é a que o Fluxo de Caixa usa. Hoje o usuário não tem como
saber se ali vai a data da liberação, a da medição ou a do crédito em conta.

**3-A.4 · Dizer o que a liberação é.** Nota no rodapé do formulário: **entrada de
caixa, não receita** — a receita da obra é reconhecida pela venda da unidade.

**[NOTA]** Esta frase só fica verdadeira quando as seções 56 e 57 do Prompt I
estiverem em produção. Até lá, os totais de receita de cinco telas contam a
liberação. A nota deve ser escrita mesmo assim: ela descreve o que o número
significa, não o que o sistema faz com ele hoje — e é o que impede o usuário de
somar as duas coisas de cabeça.

**3-A.5 · O campo Porcentagem sai do formulário**, conforme a decisão de BO-2.

Se BO-2 resultar em mantê-lo, ele volta com **rótulo que diga de que é
percentual** e com validação de faixa. Não voltar como está: campo de texto livre
sem base declarada, que aceita qualquer coisa e não alimenta cálculo nenhum.

**Em qualquer cenário, a coluna `pct` permanece no banco**, com os valores que
tiver. Campo que sai de uso é descontinuado, não removido.

**3-A.6 · Retorno visível também no sucesso.** Hoje a action redireciona sem
confirmar. Salvar sem retorno visível é indistinguível de salvar que falhou.

---

# 4. CORRIGIR O QUE FOI LANÇADO ERRADO

**4.1 · Hoje não existe saída.** Não há action de editar, excluir, cancelar nem
estornar em todo o repositório. Um lançamento com valor ou data errados é
**permanente**, e continua somando em cinco lugares.

Não apagar é o certo pela RG-09 — mas a regra exige estorno como contrapartida,
e ele não existe. O resultado é o pior dos dois mundos.

**4.2 · Estorno, não exclusão.** Acrescentar cancelamento lógico no padrão que a
`despesa` já usa: flag, data, autor e motivo. O registro permanece legível, sai
dos totais, e a auditoria guarda quem cancelou e por quê.

**Nenhum registro existente é alterado.** Todos nascem não cancelados, que é o
comportamento de hoje.

**4.3 · Edição com trava.** Permitir editar valor, data, origem e observações
enquanto o lançamento não estiver cancelado. Toda alteração registra **valor
anterior e valor novo**, no padrão que `updateCliente` já cumpre — é a única
action do sistema que faz isso direito, e serve de referência.

**4.4 · As consultas passam a filtrar o cancelado.** `getReembolsos`,
`reembursementsByMonth` e `calcTotals` ignoram lançamentos cancelados.

**[NOTA]** Isso **muda número exibido** na Projeção, no Consolidado, no Resumo e
no Caixa — mas só a partir do primeiro cancelamento. Enquanto ninguém cancelar
nada, os totais são idênticos aos de hoje. Confirmar isso no teste de não
regressão.

---

# 5. STATUS

**5.1 · Hoje é enfeite.** Gravado fixo como `"Recebido"` pela tela e
`"received"` pela importação de planilha. Nenhuma consulta filtra por ele. O
badge é sempre verde, sempre com ✓, inclusive quando o campo é nulo.

Isso sugere ao usuário que houve conferência de recebimento. Não houve nada.

**5.2 · Duas saídas, escolher uma:**

1. **Remover da listagem.** Se o status não distingue nada, a coluna some. A
   coluna do banco permanece, descontinuada.
2. **Virar campo real**, com domínio fechado — previsto e recebido, por
   exemplo — escolhido no cadastro e filtrável.

Recomendação: a **1**, coerente com "manter a tela como está". Virar campo real
é funcionalidade nova, e o escopo desta tarefa não é esse.

**5.3 · Se ficar**, o badge passa a refletir o valor: tom neutro para o que não
é confirmado, e o normalizador de `"received"` continua onde está — **sem
migrar** os registros com a grafia antiga.

---

# 6. ASSISTENTE DE IA

Segue o **Prompt E**. Painel lateral, recolhível, com `projectId` e `versionId`
explícitos validados no servidor contra o tenant.

**6.1 · Somente leitura.** O assistente analisa e aponta. Não lança, não edita,
não cancela. O selo "Somente leitura" é correto aqui e deve ser exibido.

**6.2 · Ações**

- **Conferir lançamentos** — valor zerado ou negativo, data ausente ou
  inválida, origem em branco, porcentagem fora de faixa.
- **Comparar com a medição** — a liberação acompanha a evolução da obra;
  apontar competências com medição lançada e sem liberação correspondente, e o
  contrário. É a leitura que a tela não oferece hoje.
- **Liberações por competência** — o que entrou mês a mês, e o acumulado, contra
  o previsto de financiamento das unidades vendidas.
- **Duplicidade aparente** — mesmo valor, mesma data e mesma origem lançados
  mais de uma vez, que é o erro que hoje não tem como desfazer.

**No formulário de cadastro**, o assistente aponta, antes de salvar, a
competência que tem medição lançada e nenhuma liberação correspondente — que
costuma ser exatamente o lançamento que o usuário está fazendo. E avisa quando o
valor, a data e a origem coincidirem com um lançamento já existente.

Ambos são **avisos**, nunca preenchimento automático: esta tela é somente
leitura para o assistente.

**6.3 · O que o assistente nunca faz aqui:** afirmar que um valor foi conferido
com o banco, e tratar a liberação como receita adicional — ver a nota de 6.4.

**6.4 · A liberação é caixa, nunca receita.** O assistente trata o valor como
entrada de caixa, e **não** o soma a receita, resultado ou margem — em nenhuma
frase, em nenhum cálculo.

Isso não é preferência de redação: até as seções 54, 56 e 57 do Prompt I
entrarem em produção — as três com a mesma chave —, os totais de receita de
cinco telas contam essa mesma liberação duas vezes. Um assistente que repetisse
esse número daria autoridade ao erro.

---

# 7. FORA DE ESCOPO

| Item | Onde fica |
|---|---|
| Vínculo do lançamento com unidade ou com a obra | tarefa própria, depois de BO-1 |
| Correção da dupla contagem em receita | **Prompt I, seções 56 e 57** |
| Previsto de liberação derivado da medição | tarefa própria |
| Contexto de projeto e versão explícito | Prompt A |
| Varredura de permissão em todas as rotas | Prompt M, seção 2.3 |
| Exclusão física substituída por inativação, em geral | Prompt I, seção 12 |

---

# 8. PRESERVAÇÃO DE DADOS

Nenhum lançamento existente é alterado, cancelado, reclassificado ou removido.
Nenhum `serial`, `pct`, `status` ou `data` é convertido ou recalculado. Nenhum
registro com status `"received"` é migrado para `"Recebido"`.

Migração, se houver — as colunas de cancelamento —, é aditiva, com
`IF NOT EXISTS`, `down` correspondente, e default que preserva o comportamento
atual.

---

# 9. NÃO REGRESSÃO

A estrutura da tela não muda: mesma listagem, mesmos campos, mesmo fluxo de
cadastro.

Não altera Projeção, Consolidado, Resumo, Caixa, `getMonthlyRevenue`,
`calcTotals`, `reembursementsByMonth`, exportação `.xlsx`, importação de
planilha nem duplicação de versão.

Enquanto nenhum lançamento for cancelado, **todos os totais permanecem
idênticos aos de hoje**.

---

# 10. TESTES

1. Título e menu exibem "Liberações de Obra"; rotas seguem `/reembolso`.
2. O aviso sobre SUMIFS não existe mais; a coluna Serial não aparece na
   listagem.
2a. Os títulos exibem "Liberações de Obra" e "Nova liberação de obra".
3. `serial` continua sendo gravado, exportado e reimportado.
4. Lançamento com valor zero, negativo ou data inválida é recusado com mensagem.
4a. Origem em branco é recusada.
4b. Salvar com sucesso exibe confirmação visível.
4c. O formulário não tem campo de porcentagem, salvo decisão contrária em BO-2.
5. Sem permissão de criar, a mensagem aparece — não há redirecionamento
   silencioso.
6. Sem permissão de ver, a listagem não é acessível por URL direta.
7. Toda gravação registra auditoria com valor, data e origem.
8. Editar registra valor anterior e valor novo.
9. Cancelar preserva o registro, tira dos totais e registra autor e motivo.
10. Registro cancelado não aparece na Projeção, no Consolidado, no Resumo nem no
    Caixa.
11. Registros com status `"received"` continuam exibidos corretamente.
12. Assistente não grava nada, por nenhum caminho.
13. **Antes e depois:** contagem de `reembolso` e soma de `valor` por versão,
    em todos os projetos. Nenhuma diferença.
14. **Antes e depois:** totais da Projeção, do Consolidado, do Resumo e do
    Caixa, por projeto, sem nenhum cancelamento aplicado. Nenhuma diferença.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado de BO-1: o que `getMonthlyRevenue` lê, quem consome `banco` e
   `reemb`, e os números por projeto. **Sem nenhuma alteração.**
2. Resultado de BO-2: quantos lançamentos têm `pct` preenchido e com quais
   valores, e a decisão tomada.
3. Decisão de 5.2 sobre o status.
4. Arquivos e componentes alterados.
5. Onde os rótulos "Reembolso" foram trocados por "Liberações de Obra" —
   incluindo a tela de cadastro e o botão de salvar —, e confirmação de que
   nenhuma chave, mapa ou cálculo mudou.
6. Confirmação de que `serial` continua íntegro no trânsito da planilha.
7. Comparação antes/depois de `reembolso` e dos quatro relatórios.
8. Funcionamento do assistente e confirmação de que não grava.
9. Confirmação de que nenhum item da seção 7 foi tocado.
10. Migrações criadas, com `down`.
11. Limitações encontradas.


<a id="prompt-q"></a>


========================================================================


### ▸ 13 de 42 · PROMPT Q — Parâmetros / INCC

**Bloco 2 · A receita** · Bloqueios: BQ-1 · BQ-2 · BQ-3

A correção monetária é receita.

========================================================================


# PROMPT Q — PARÂMETROS / INCC

Growth Construction · `/parametros`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Rotas, tabelas, chaves de versão, campos e
funções permanecem. Renomear rótulo é apresentação; renomear dado é migração.
Em caso de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Índices oficiais já
informados, acumulados e datas permanecem como estão. Nenhuma tarefa recalcula,
converte ou "corrige" um índice já gravado. Se uma alteração exigir tocar em
dado existente: **PARE, não execute, e informe qual dado, por quê, quantos
registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.** Percentuais e meses dos mockups
são ilustração. Nunca viram seed, fixture ou valor padrão.

**3 · Índice não se inventa.** Nenhum caminho desta tarefa — inclusive o
assistente — pode gerar, estimar ou completar um índice oficial. Projeção é
projeção, e é sempre rotulada como tal.

---

# O QUE ESTA TELA GOVERNA

A tabela INCC de um projeto corrige as parcelas dos recebíveis. É a menor tela
do sistema em superfície e uma das maiores em alcance: alterar um índice muda
número em várias telas, na próxima renderização.

**Correção monetária não é juros.** Ela recompõe o valor perdido pela passagem
do tempo; não remunera. Isso importa no desenho: a correção incide sobre o saldo
a vencer, nunca como acréscimo de resultado.

---

# ORDEM DE EXECUÇÃO

Depende da **seção 57 do Prompt I** para a decisão de BQ-2, e do **Prompt E**
para a arquitetura do assistente.

**A Parte 1 pode ir sozinha** — são correções de integridade que não dependem de
decisão pendente.

---

# BLOQUEIOS

## BQ-1 · Qual INCC a tabela guarda?

A FGV publica **três variantes**, com a mesma cesta e a mesma metodologia,
diferindo na janela de coleta:

| Variante | Janela de coleta | Uso típico |
|---|---|---|
| **INCC-DI** | 1º ao último dia do mês | contratos de financiamento; compõe o IGP-DI; é o que se chama simplesmente "INCC" |
| **INCC-M** | dia 21 do mês anterior ao dia 20 do mês de referência | o mais usado no mercado imobiliário; compõe o IGP-M |
| **INCC-10** | dia 11 do mês anterior ao dia 10 do mês de referência | menos frequente |

Os valores **divergem entre si** no mesmo mês. Em agosto de 2026, por exemplo, o
acumulado em doze meses do INCC-M e o do INCC-DI não coincidem.

**O sistema não registra qual variante está guardando.** A tabela tem `mes`,
`monthly`, `accumulated`, `ordem` e `projected` — nada identifica a fonte.

**Responder:** qual variante os contratos do cliente especificam? A resposta
vira coluna nova, aditiva, e rótulo na tela.

**[NOTA]** Se contratos diferentes usarem variantes diferentes, isso é decisão
maior: a tabela é por projeto, e passaria a precisar de escopo por contrato.
Reportar antes de implementar.

## BQ-2 · Qual dos dois cálculos de receita é o correto?

O repositório tem **duas implementações** da mesma projeção de recebíveis, e
elas discordam em dois pontos:

| | `calcProjection` | `expandUnitReceivables` |
|---|---|---|
| Respeita as flags `usar*` do plano | **sim** | **não** — o comentário admite: "leitura tolerante, sem depender das flags" |
| Aplica INCC | **sim**, a partir da 5ª parcela | **não** — zero ocorrências de `getIncc` no arquivo |
| Consumida por | Caixa; comparação Orçamento × Previsão; replicação do Orçamento | Contas a Receber, e tudo que passa por `getMonthlyRevenue`: DRE, Dashboard, Fluxo de Caixa, Resumo, Contabilidade |

**Consequência hoje: a receita da DRE sai sem correção monetária**, enquanto a do
Caixa sai corrigida. Duas telas, mesma unidade, números diferentes por desenho.
E uma fonte desligada no plano é ignorada por um caminho e contada pelo outro.

**As duas não podem continuar.** A decisão pertence à **seção 57 do Prompt I**,
que define as fontes de receita da DRE — e precisa responder **sobre qual valor**
o reconhecimento incide: o nominal ou o corrigido.

**Não implementar nada desta tarefa que dependa dessa resposta.** O que está nas
seções 1 a 4 abaixo é independente dela.

## BQ-3 · A carência de correção é contratual?

A correção incide a partir da **5ª parcela**, com a constante
`INCC_FROM_INSTALLMENT = 4` fixa no código. Não é configurável.

Contratos diferentes podem ter carência diferente, e a cláusula de reajuste é do
contrato, não do sistema.

**Responder:** é regra única da construtora, ou varia por contrato? Se varia, o
número precisa vir do plano de pagamento, não de uma constante.

---

# PARTE 1 — INTEGRIDADE

# 1. A PROJEÇÃO RODA SOZINHA AO ABRIR A TELA

**1.1** O `useEffect` do editor dispara `projectFutureIncc` automaticamente
quando encontra mês futuro ainda não projetado. **Basta alguém com permissão de
editar abrir a tela** para que todos os meses futuros sejam reescritos pela média
móvel — sem clicar, sem confirmar, sem aviso.

E isso muda, na renderização seguinte, os números do Caixa e da comparação entre
cenários.

**1.2 · Corrigir.** A projeção passa a ser **ação explícita**. Se houver meses
futuros sem projeção, a tela informa e oferece o botão. Nunca executa sozinha.

**1.3** A auditoria registra `incc.project` sem dizer **quantos meses** foram
reescritos nem quais valores tinham antes. Acrescentar.

---

# 2. O BOTÃO DE REPROJETAR APAGA ÍNDICE OFICIAL

**2.1** A tela declara: *"Meses oficiais nunca são sobrescritos pela projeção."*
Isso vale para `updateInccMonth` — e **não vale** para `projectFutureIncc`, que
marca como projetado **todo mês estritamente futuro**, inclusive os que alguém
tenha informado como oficiais.

O INCC é divulgado mensalmente pela FGV, e é normal informar o índice de um mês
que ainda não terminou. O botão apaga essa informação.

**2.2 · Corrigir.** A reprojeção preenche apenas meses **sem índice oficial
informado**. Mês marcado como oficial permanece oficial, esteja no futuro ou não.

**2.3** Se o usuário quiser mesmo reprojetar um mês oficial, isso é ação
explícita naquele mês, com confirmação — nunca efeito colateral de um botão que
diz outra coisa.

---

# 3. RASTRO DA ALTERAÇÃO

**3.1** `updateInccMonth` edita um mês, **reprojeta todos os meses futuros** pela
média móvel e reencadeia o acumulado da série inteira. A auditoria grava
`{ projectId, mes, mo }` — o mês e o valor novo.

Não grava o valor anterior. Não grava quais meses foram reescritos junto. Numa
tela que corrige valor de parcela, ninguém consegue reconstituir por que a
receita de um mês mudou.

**3.2 · Corrigir.** A auditoria registra, para a operação inteira: o mês editado
com valor anterior e novo, e a lista dos meses reprojetados com os dois valores
de cada um. É a regra da RG-09 aplicada a uma tela de parâmetro.

**3.3** O `updateCliente` já faz auditoria campo a campo com de/para. **Usar como
referência**, não reinventar.

---

# 4. VALIDAÇÃO, PERMISSÃO E CÓDIGO MORTO

**4.1 · Permissão de ver.** A tela vai do contexto direto para a consulta, sem
chamar `can(ctx.perms, "parametros", "ver")`. **Sexta tela com esse furo**,
depois de `/clientes`, `/clientes/[id]`, `/contabilidade`, `/reembolso` e
`/permuta`. Acrescentar com `AccessDenied`.

**[NOTA]** A varredura de todas as rotas é da seção 2.3 do **Prompt M**.

**4.2 · Filtro de tenant.** `getInccRows` filtra só por projeto. Acrescentar.

**4.3 · Faixa do índice.** O campo aceita qualquer número finito, inclusive
negativo de grande magnitude. O INCC pode ser negativo — deflação de insumos
acontece —, mas um valor como `-90` ou `400` é erro de digitação.

Avisar, sem bloquear, quando o valor sair de uma faixa plausível. **Índice não se
recusa por ser incomum**; se recusa por ser impossível.

**4.4 · Retorno legível.** As actions fazem `return` silencioso sem permissão.
Converter para `{ ok, error }` e exibir. **Pré-condição da seção 6.**

**4.5 · `saveIncc` é código morto.** Existe, grava em lote, **não é chamada por
ninguém** — e não toca em `projected`. Se alguém a religar, ela reencadeia o
acumulado ignorando o estado de projeção.

Remover do código ou marcar explicitamente como descontinuada. Não deixar como
está.

**4.6 · Janela da média móvel.** `projectIncc` usa
`slice(Math.max(0, i-12), i)`. Com menos de doze meses de histórico, calcula a
média sobre o que houver, sem sinalizar. Exibir quantos meses entraram na média
quando forem menos de doze.

---

# PARTE 2 — BOAS PRÁTICAS DO ÍNDICE

# 5. O QUE A TELA PRECISA DECLARAR

**5.1 · Qual variante.** Conforme BQ-1. O rótulo aparece no cabeçalho: não basta
dizer "INCC".

**5.2 · Mês de referência, não mês de divulgação.** A FGV divulga o índice de um
mês no mês seguinte. A tabela guarda `mes` sem dizer qual dos dois é. Declarar
na tela que o mês é o **de referência** — e, se não for, corrigir a interpretação
antes de qualquer outra coisa.

**5.3 · Origem do índice oficial.** Hoje não há registro de onde o valor veio nem
de quem o informou, além do `audit_log`. Exibir, por mês oficial: quem informou
e quando. É coluna aditiva, ou leitura da auditoria.

**5.4 · Onde a correção incide.** A tela diz "correção a partir da 5ª parcela" no
subtítulo — que o `PageHeader` descarta e nunca aparece. Voltar a exibir, junto
com a informação de que a correção usa o **acumulado** do mês do vencimento, não
a variação mensal.

**5.5 · O que a correção não alcança.** Enquanto BQ-2 não for decidido, a tela
deve declarar: **a correção não é aplicada nos recebíveis exibidos em Contas a
Receber nem na receita da DRE**. Omitir isso é deixar o usuário supor que está
vendo valor corrigido.

**5.6 · Nada é gravado corrigido.** A correção é aplicada na leitura, a cada
render — e isso está **certo**. Não introduzir gravação de valor corrigido em
nenhum caminho desta tarefa.

**A exceção conhecida** é `replicateFromAtual`, que grava em `budget_line` o
valor já corrigido, como retrato do índice no instante em que rodou. Tratada na
seção 2.6 do **Prompt D**; não mexer aqui.

---

# 6. ASSISTENTE DE IA

Segue o **Prompt E**.

## 6.1 · Nível autorizado

**Propõe e para.** O assistente pode **sugerir** índices; a gravação é do
usuário, pelo mesmo caminho e com a mesma confirmação que já existe.

**Não existe caminho de gravação direta**, nem atalho. Índice é parâmetro de
correção de contrato — o campo onde uma sugestão errada aceita sem olhar tem o
maior alcance do sistema.

## 6.2 · Atualizar o índice

Quando houver mês sem índice oficial cujo período já tenha encerrado, o
assistente **pergunta se o usuário quer atualizar** — e não age sozinho.

Aceitando, ele apresenta uma proposta com: o mês, o valor sugerido, a **variante
do índice**, a **fonte** de onde veio, e a data da consulta. O usuário confere e
confirma, mês a mês ou em bloco, com prévia do efeito no acumulado.

**Regras inegociáveis:**

- **Nunca inventar.** Se não conseguir obter o índice, diz que não conseguiu.
  Não estima, não interpola, não usa a média móvel como se fosse oficial.
- **Nunca sobrescrever mês oficial** sem confirmação explícita daquele mês.
- **Sempre declarar a variante.** Sugerir INCC-M onde o contrato usa INCC-DI é
  erro silencioso: os dois existem, os dois parecem certos, e os valores diferem.
- **Sempre registrar a origem** no que for gravado: variante, fonte e data da
  consulta.
- **A proposta mostra o efeito.** Antes de confirmar, o usuário vê como o
  acumulado muda e quais meses projetados são reescritos.

**[BLOQUEIO menor]** De onde vem o índice? Consulta a uma fonte externa exige
decidir qual, e como o sistema se comporta quando ela estiver indisponível.
Enquanto não houver fonte definida, o assistente **apenas identifica os meses
faltantes** e pede que o usuário informe.

## 6.3 · Análises

- **Meses faltantes** — períodos encerrados ainda sem índice oficial.
- **Curva projetada × histórico** — quanto a média móvel se distancia do
  comportamento recente, e há quantos meses a série é só projeção.
- **Efeito de uma alteração** — antes de confirmar, quanto muda o acumulado e
  quais meses são reescritos.
- **Cobertura** — se a tabela cobre a janela de competências do projeto.
  Recebível com vencimento fora da tabela é corrigido por zero, silenciosamente.

## 6.4 · O que o assistente nunca faz aqui

Gravar índice sem confirmação. Marcar mês como oficial. Rodar a reprojeção.
Afirmar valor de índice sem dizer a variante e a fonte. Tratar projeção como
índice real.

## 6.5 · O selo

Como o assistente propõe gravação, não usar "Somente leitura". Redação que
descreva o que acontece.

---

# 7. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Decidir qual cálculo de receita é o correto | Prompt I, seção 57 |
| Aplicar INCC em `expandUnitReceivables` | depende de BQ-2 |
| Retrato do índice no orçamento replicado | Prompt D, seção 2.6 |
| INCC no Simulador — exibido e não aplicado em SAC e PRICE | Prompt N, seção 2.2 |
| Contexto de projeto explícito | Prompt A |
| Varredura de permissão em todas as rotas | Prompt M, seção 2.3 |

---

# 8. PRESERVAÇÃO DE DADOS

Nenhum índice existente é alterado, recalculado ou reclassificado por esta
tarefa. Nenhum mês oficial vira projetado. Nenhum acumulado é reencadeado fora
de uma ação disparada pelo usuário.

Migrações — coluna da variante, origem do índice — são aditivas, com
`IF NOT EXISTS`, `down` correspondente, e default que preserva o comportamento
atual.

---

# 9. NÃO REGRESSÃO

Não altera Caixa, Orçamentos, Previsão Atualizada, DRE, Fluxo de Caixa,
Simulador nem Contas a Receber. Nenhuma fórmula de correção muda.

Com nenhuma ação disparada, todas as telas devolvem os mesmos números de hoje.

---

# 10. TESTES

1. Abrir a tela **não** dispara projeção alguma.
2. A reprojeção não altera mês marcado como oficial, inclusive futuro.
3. Editar um mês registra valor anterior e novo, e a lista dos meses
   reprojetados com os dois valores de cada um.
4. Sem permissão de ver, a tela não é acessível por URL direta.
5. Sem permissão de editar, os campos ficam desabilitados e a ação retorna
   mensagem.
6. Índice fora da faixa plausível avisa e permite salvar.
7. Índice negativo é aceito — deflação existe.
8. Média móvel com menos de doze meses informa quantos entraram no cálculo.
9. A tela declara a variante, o mês de referência e onde a correção incide.
10. Assistente não grava sem confirmação, em nenhum caminho.
11. Assistente não sugere índice sem declarar variante e fonte.
12. Assistente não preenche mês faltante com projeção apresentada como oficial.
13. **Antes e depois:** conteúdo integral de `incc_rate`, por projeto. Nenhuma
    diferença sem ação do usuário.
14. **Antes e depois:** Caixa e comparação entre cenários devolvem os mesmos
    números.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resposta de BQ-1: variante adotada, e como foi registrada.
2. Resposta de BQ-3: a carência é única ou por contrato.
3. Confirmação de que a projeção deixou de rodar automaticamente.
4. Como a reprojeção passou a preservar meses oficiais, e quantos meses oficiais
   futuros existiam antes da correção.
5. O que a auditoria passou a registrar, com um exemplo real da saída.
6. Se `saveIncc` foi removida ou descontinuada.
7. Funcionamento do assistente: o que ele propõe, de onde vem o índice, e
   confirmação de que não grava.
8. Comparação antes/depois de `incc_rate`.
9. Confirmação de que nenhum item da seção 7 foi tocado.
10. Migrações criadas, com `down`.
11. Limitações encontradas.


<a id="prompt-n"></a>


========================================================================


### ▸ 14 de 42 · PROMPT N — Simulador

**Bloco 2 · A receita** · Bloqueios: BN-1 · BN-2 · BN-3

Depende de J. O BN-1 decide se ele passa a gerar o plano.

========================================================================


# PROMPT N — SIMULADOR DE UNIDADE

Growth Construction · `/simulador`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Nenhuma tarefa
recalcula, converte, normaliza, migra ou "corrige" um registro já gravado. Se
uma alteração exigir tocar em dado existente: **PARE, não execute, e informe
qual dado, por quê, quantos registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.** Valores, datas e percentuais dos
mockups são ilustração. Nunca viram seed, fixture, valor padrão ou dado de teste.

**3 · Dado pessoal de terceiro tem tratamento próprio.** Renda de comprador é
campo sensível (Prompt M). Não vai a log, a mensagem de erro nem a contexto de
modelo de IA.

---

# O QUE ESTA TELA É HOJE

Uma **calculadora isolada**. Não grava nada, não lê cliente, não conversa com o
plano de pagamento da unidade. Só consulta a tabela INCC.

Isso significa que os achados abaixo não produzem dado errado no banco — eles
produzem **número errado numa proposta comercial**, que é pior de reverter,
porque já saiu da empresa.

---

# ORDEM DE EXECUÇÃO

Depende do **Prompt A** para o contexto de projeto e do **Prompt M** para a
permissão de campo sensível (seção 5.3). Independente dos demais.

---

# BLOQUEIOS

## BN-1 · A simulação passa a ser gravada?

Hoje nada persiste. Não há como reconstituir o que foi apresentado a um cliente,
e o plano de pagamento da unidade é **redigitado** no formulário de unidade — duas
fontes que podem divergir.

**Escolher uma:**

1. **Continua efêmera.** A tela segue calculadora. Os achados desta revisão são
   corrigidos, e nada mais muda.
2. **Simulação salva, vinculada a projeto e opcionalmente a cliente e unidade.**
   Cria rastro do que foi proposto. Tabela nova, aditiva.
3. **Além de salva, vira plano de pagamento da unidade.** Elimina a redigitação
   e a divergência. É a de maior valor e a de maior alcance.

   **[NOTA — o alcance é maior do que parece]** Pela seção 57 do Prompt I, a
   receita da DRE na versão Atual vem da venda da unidade, pelo preço integral.
   O plano de pagamento define esse preço e a distribuição do caixa. Se a
   simulação passar a gerá-lo, **o simulador vira origem da receita do
   resultado** — e os defeitos de cálculo das seções 2.1 a 2.8 deixam de
   produzir proposta errada e passam a produzir número errado em relatório
   contábil.

   Se for esta a opção, **as correções da seção 2 são pré-condição**, não item
   paralelo. E o plano gerado respeita exatamente a estrutura das onze linhas de
   fonte que já existe, sem formato novo.

**Não implementar 2 nem 3 sem decisão explícita.** Se for a 3, a estrutura das
seis linhas de fontes do `payment_plan` precisa ser respeitada exatamente como
está — nada de formato novo.

## BN-2 · Qual a taxa de juros real dos contratos

`TAXA_MENSAL = 0.01` — 1% ao mês, 12,68% ao ano — está fixa no código, com o
comentário "juros simplificado". Contratos MCMV praticam faixas entre 4% e 8,66%
ao ano.

**Responder:** a taxa vira campo com qual valor padrão? E há taxa por faixa, por
projeto ou por tipo de financiamento?

Enquanto não houver resposta, **não trocar o valor fixo por outro valor fixo** —
seria substituir um número errado por outro.

## BN-3 · A renda pode vir do cadastro do cliente?

Hoje é digitada, com default `"16000"` no componente. A tabela `cliente` tem
`rendaBruta` e `rendaLiquida`, e o simulador não recebe `clienteId`.

Puxar a renda do cadastro é conveniente e **expõe campo sensível**. Pelo Prompt
M, renda exige permissão própria.

**Escolher uma:**

1. **Continua digitada.** Nenhuma exposição nova.
2. **Vem do cliente, apenas para quem tem a permissão de campo sensível**,
   validada no servidor. Quem não tem, digita.

---

# 1. RESTRIÇÕES FIXAS

**1.1** A matemática vive em `src/lib/calc/simulator.ts`, função pura, com
testes. Continua pura, sem I/O, e os testes existentes continuam passando.

**1.2** As três fórmulas — SAC, PRICE e SBPE — continuam existindo.

**1.3** Nada nesta tarefa altera `payment_plan`, `unit`, `conta_receber` ou
`incc_rate`.

---

# 2. CORREÇÕES DE CÁLCULO

## 2.1 · SM-01 · O limite de renda compara a parcela errada

`dentroLimite: parcMensal <= maxParcela` usa `parcMensal` — o saldo dividido
pelo número de parcelas. Num caso real (valores removidos), a média ficou abaixo do
limite e o resultado foi "dentro do limite". **A parcela do primeiro mês era quase o dobro da média, acima do limite.**

**Corrigir:** o veredito compara a **maior parcela do fluxo** com o limite. E a
tela exibe as duas — maior parcela e limite —, não só o selo.

É a correção de maior impacto e a menor em código. Um vendedor usa esse selo
para dizer a um cliente que ele se enquadra.

## 2.2 · SM-02 · O INCC é exibido e não é aplicado

`parcTotal = tipo === "SAC" ? parcSAC : tipo === "PRICE" ? parcPRICE :
parcComIncc`. Em SAC e PRICE, `parcComIncc` é calculado e descartado — a coluna
cresce na tela enquanto a parcela cai.

**Decidir e implementar uma das duas**, nunca manter como está:

1. Aplicar a correção nos três tipos.
2. Exibir a coluna apenas em SBPE, deixando claro nos outros que não há correção.

**[NOTA]** Se for a 1, os valores exibidos mudam para todos os tipos. Como nada
é gravado, não há impacto em dado — mas há impacto em proposta já apresentada.

## 2.3 · SM-03 · Juros fixos em 1% ao mês

**Ver BN-2.** A taxa vira campo, com o valor atual como padrão até haver decisão,
e o rótulo diz o que ela é — mensal ou anual, e se é a taxa do contrato ou
premissa.

## 2.4 · SM-04 · "Total entrada" não é entrada

`totalEntrada = entrada + s1 + s2 + s3 + anual1 + anual2 + fgts + subsidio +
financiamento`. Inclui financiamento, FGTS, subsídio e os dois anuais — sendo
que o Anual 2 entra no **mês 24**.

Hoje passa despercebido porque financiamento e FGTS estão zerados. Numa
simulação MCMV real, o financiamento é a maior parte do valor, e o card diria
"% entrada: 95%".

**Separar em três indicadores:**

- **Entrada efetiva** — o que entra até o início do plano.
- **Recursos futuros** — anuais, FGTS e subsídio, com o mês de cada um.
- **Financiamento** — próprio.

E o percentual de entrada calculado sobre a entrada efetiva.

## 2.5 · SM-05 · O fluxo ignora o número de parcelas

`MESES_FLUXO = 36` é fixo. Com 90 mensais informadas, a tabela mostra 36 e o
fluxo termina antes do financiamento, sem aviso.

**Corrigir:** o fluxo acompanha o número de parcelas, com rolagem e um total ao
final. Se houver teto por desempenho, ele é declarado na tela.

**[NOTA]** O subtítulo da página diz "fluxo de 36 meses" — e o `PageHeader`
descarta subtítulo, então esse aviso nunca apareceu. Ver 4.1.

## 2.6 · SM-06 · Parcelas negativas

No ramo SAC, `saldoAtual = saldoMensal - amort * i` roda 36 vezes
independentemente do número de parcelas. Com menos de 36 mensais, o saldo fica
negativo e a tela exibe parcela negativa.

Corrigido naturalmente por 2.5; ainda assim, o cálculo para de amortizar quando
o saldo zera.

## 2.7 · SM-10 · Reforços em posição fixa

Entrada no mês 1, sinais nos meses 2, 3 e 4, Anual 1 no mês 12, Anual 2 no mês
24 — literais no código. Se o plano tiver menos de 24 parcelas, o Anual 2 aparece
fora do plano.

**Corrigir:** cada reforço tem o mês informado pelo usuário, com os valores
atuais como padrão. Reforço fora do plano é recusado com mensagem.

## 2.8 · SM-11 · Evolução de obra é premissa, não informação

`evolucao = (i+1) × 2,777%`, linear em 36 meses, sem ligação com a medição real
nem com a duração do projeto.

**Corrigir:** derivar da janela do projeto — seção 55 do Prompt I — ou rotular
explicitamente como premissa linear. **Não deixar como está**: um percentual de
avanço de obra exibido numa proposta parece medição.

---

# 3. CONTEXTO E ENTRADA

**3.1 · SM-08 · INCC do projeto ativo global.** `getInccRows(ctx.project.id)`
usa o projeto do cookie. Simula-se uma unidade com a tabela INCC de outro
projeto. A troca por seleção explícita pertence ao **Prompt A**; aqui, **exibir
qual projeto está sendo usado**, de forma visível.

**3.2 · SM-07 · A tela abre preenchida com uma simulação fictícia.** Valor,
entrada, sinais, anuais, parcelas, renda e data são `useState` com valor
literal. Quem abre vê números que parecem de alguém.

Abrir vazia, ou com um rótulo declarando que é exemplo. **Os valores atuais não
viram seed nem default de banco.**

**3.3** Campos numéricos aceitam apenas valores válidos: sem negativo, sem
`NaN`, número de parcelas inteiro e maior que zero.

---

# 4. INTERFACE

**4.1** Voltar a exibir o subtítulo e o eyebrow do `PageHeader` — aqui o
subtítulo carrega a única menção ao horizonte do fluxo. Mesma correção pedida
nos Prompts B, J e M; quem for primeiro faz.

**4.2** A tabela ganha rolagem vertical com cabeçalho fixo, no padrão das telas
de Orçamentos e Previsão.

**4.3** Um resumo ao final do fluxo: total pago, total de juros e total de
correção.

**4.4** Segue `PADRAO-VISUAL.md`.

---

# 5. ASSISTENTE DE IA

Segue o **Prompt E**. Painel lateral, recolhível.

**5.1 · Somente leitura.** Esta tela não grava nada; o assistente também não.
Se BN-1 resultar em persistência, a gravação continua sendo ação do usuário,
pelo botão.

**5.2 · Renda e o campo sensível.** Se BN-3 permitir puxar a renda do cadastro,
o assistente **não recebe o valor** — ele opera sobre o resultado, não sobre o
dado do comprador. Renda, score e restrições nunca entram no contexto enviado ao
modelo, conforme o BE-2 do Prompt E.

**5.3 · Ações**

- **Explicar a proposta** — transforma o fluxo num resumo em linguagem de
  cliente: quanto entra agora, quanto por mês, quando vêm os reforços, quanto
  soma no fim. É o texto que o vendedor envia.
- **Comparar cenários** — SAC, PRICE e SBPE lado a lado, com a diferença no
  total pago e na maior parcela.
- **Testar variações** — o que muda ao alterar entrada, prazo ou taxa, sem
  refazer a simulação campo a campo.
- **Conferir a simulação** — aponta o que a revisão identificou como armadilha:
  maior parcela acima do limite de renda, reforço fora do prazo do plano, prazo
  do fluxo diferente do número de parcelas, correção não aplicada ao tipo
  escolhido.

**5.4 · O que o assistente nunca faz aqui:** afirmar que o cliente está
aprovado, prometer taxa, e apresentar a evolução de obra como avanço real.

**5.5 · O selo diz a verdade.** Sem persistência, "Somente leitura" é correto.
Com persistência, muda para redação que descreva o que acontece.

---

# 6. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Troca do contexto global por seleção explícita | Prompt A |
| Permissão de campo sensível do cliente | Prompt M |
| Materialização de parcelas em contas a receber | Prompt K |
| Reconhecimento de receita na DRE | Prompt I, seção 54 |
| Janela de competências do projeto | Prompt I, seção 55 |

---

# 7. PRESERVAÇÃO DE DADOS

Esta tarefa **não grava nada** em tabela existente. Nenhum `payment_plan`,
nenhuma unidade, nenhuma conta a receber, nenhuma linha de INCC.

Se BN-1 resultar em persistência, a tabela é nova e aditiva, com `IF NOT EXISTS`
e `down`. Nenhum dado existente é lido para preenchê-la.

---

# 8. TESTES

1. O veredito de renda compara a maior parcela do fluxo, e a tela mostra as duas.
2. O fluxo tem tantas linhas quanto o número de parcelas informado.
3. Com menos de 36 parcelas, nenhuma parcela negativa aparece.
4. SAC para de amortizar quando o saldo zera.
5. A decisão de 2.2 vale para os três tipos, sem coluna exibida e não aplicada.
6. Entrada efetiva, recursos futuros e financiamento aparecem separados, e o
   percentual usa a entrada efetiva.
7. Reforço com mês além do plano é recusado com mensagem.
8. Evolução de obra segue a janela do projeto, ou está rotulada como premissa.
9. A tela declara qual projeto forneceu a tabela INCC.
10. A tela não abre com valores que pareçam de um cliente real.
11. Os testes existentes de `simulator.test.ts` continuam passando, ou a
    mudança de resultado está declarada e justificada.
12. Assistente não recebe renda, score nem restrições em nenhum caminho.
13. Assistente não grava nada.

---

# 9. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisões de BN-1, BN-2 e BN-3, e como foram implementadas.
2. Qual das duas opções de 2.2 foi adotada, e o efeito nos valores exibidos.
3. Como o veredito de renda passou a ser calculado.
4. Como os indicadores de entrada foram separados.
5. Se a evolução de obra passou a derivar do projeto ou virou premissa rotulada.
6. Testes de `simulator.test.ts` que mudaram de resultado, com justificativa.
7. Funcionamento do assistente e confirmação do que não vai ao modelo.
8. Confirmação de que nenhuma tabela existente foi lida para gravação nem
   alterada.
9. Migrações, se houver, com `down`.
10. Limitações encontradas.


<a id="prompt-w"></a>


========================================================================


### ▸ 15 de 42 · PROMPT W — Fornecedores

**Bloco 3 · O lançamento** · Bloqueios: BW-1 · BW-2

O papel de pagador, do qual T e X dependem.

========================================================================


# PROMPT W — FORNECEDORES E STAKEHOLDERS

Growth Construction · `/fornecedores`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Cadastros, papéis,
documentos e vínculos existentes permanecem como estão. Nenhum `doc` é
normalizado, corrigido ou reformatado. Se uma alteração exigir tocar em dado
existente: **PARE, não execute, e informe qual dado, por quê, quantos registros
e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**

**3 · Documento de terceiro é dado pessoal.** CPF de pessoa física segue a mesma
regra da tela de Clientes: não vai a log em claro, não vai ao assistente.

---

# ESCOPO

**Nenhuma funcionalidade sai.** O cadastro, a edição inline, os papéis
múltiplos, o inativar, o excluir e a leitura por IA permanecem.

O trabalho é: fechar a exclusão, validar documento, corrigir o que "inativar"
significa, e acrescentar o papel de pagador terceiro.

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

**Os papéis múltiplos.** `papeis` é `text[]` nativo do Postgres, desde a
primeira migração — não é JSON em texto nem lista separada por vírgula. Uma
pessoa pode ser prestador de serviço **e** sócio, com um cadastro só. Em
produção isso já acontece.

**O "Inativar".** Exclusão lógica de uma coluna, reversível, com o log
distinguindo `deactivate` de `reactivate`. É o padrão que o resto do sistema
deveria seguir.

**A leitura por IA.** Terceira implementação do mesmo desenho — `CampoIA`
marcando o que faltou e o que precisa conferir, `ResumoLeituraIA` com o placar,
e a regra declarada: nada é gravado antes da conferência.

**O `UploadDocumentos`.** Componente compartilhado, com o comentário explicando
o problema que resolveu — o `input type=file` cru mostrava texto do navegador
fora do idioma do app.

**`updateStakeholder` preserva o id**, com o comentário dizendo por quê: ajustar
papéis sem perder histórico e vínculos.

---

# ORDEM DE EXECUÇÃO

**Par com o Prompt T.** O papel de pagador terceiro nasce aqui e é consumido
lá. **Ir juntos**, ou a tela de Ressarcimentos fica sem quem oferecer.

---

# BLOQUEIOS

## BW-1 · Documentos duplicados e inválidos em produção

Não há validação de formato nem unicidade. Os prints mostram o resultado:
`[CPF-3]` aparece em **dois cadastros** — e um deles é quem tem o maior
saldo de restituições. Há CNPJ com barra faltando, e cadastro marcado como PJ
com quantidade de dígitos de CPF.

**Entregar antes de implementar, somente leitura:**

```sql
-- documentos repetidos
SELECT doc, count(*), string_agg(nome, ' | ')
  FROM stakeholder WHERE doc IS NOT NULL AND btrim(doc) <> ''
 GROUP BY doc HAVING count(*) > 1;

-- tipo incompatível com o documento
SELECT id, nome, tipo, doc,
       length(regexp_replace(doc,'\D','','g')) AS digitos
  FROM stakeholder WHERE doc IS NOT NULL AND btrim(doc) <> '';

-- cadastros sem documento
SELECT count(*) FROM stakeholder WHERE doc IS NULL OR btrim(doc) = '';
```

**Nenhum registro é corrigido por esta tarefa.** A validação vale da entrada em
diante; o que está gravado continua legível e editável, sinalizado na tela.

## BW-2 · Papéis gravados fora da lista

A lista tem 19 papéis, declarada uma única vez em `PAPEIS_STAKEHOLDER`. Se
algum registro tiver papel fora dela — importação por fora do app —, a tela não
exibe e a edição inline o perde silenciosamente ao salvar, porque o formulário
reenvia apenas os marcados.

```sql
SELECT DISTINCT p FROM stakeholder, unnest(papeis) AS p
 WHERE p NOT IN ( /* os 19 de PAPEIS_STAKEHOLDER */ );

SELECT id, nome, papeis FROM stakeholder, unnest(papeis) AS p
 WHERE p LIKE '%,%';
```

---

# 1. O PAPEL DE PAGADOR TERCEIRO

**1.1 · Acrescentar "Pagador por Terceiro"** à lista de papéis. Passa a ser o
vigésimo.

**1.2 · Por que não reusar "Sócio/Quotista".** Hoje esse é o único papel que
governa comportamento: `getSocios` o usa para montar o seletor de "despesa paga
por sócio" em `/despesas`.

Mas **quem desembolsa pela empresa nem sempre é sócio** — um mestre de obra ou
engenheiro que presta serviço e às vezes faz compras não é quotista. Usar o
papel societário para isso mistura duas coisas diferentes, e a segunda é a que
importa para o saldo a restituir.

**1.3** Uma pessoa pode ter os dois. É o caso do sócio que também paga.

**1.4 · Quem pode conceder.** Esta tela é o único lugar que concede e retira o
papel. Ver **Prompt T, seção 1**.

**1.5 · Onde ele passa a filtrar.** O select "Quem desembolsou", em
`/despesas` e em `/restituicoes`, passa a oferecer **apenas quem tem o papel** —
hoje oferece a lista inteira.

**1.6 · Quem já tem obrigação lançada** recebe o papel por **decisão humana,
item a item, com prévia**. Nunca por script.

**[NOTA]** `getSocios` filtra por `ativo`; `getStakeholders` não. O novo filtro
deve seguir o comportamento de `getSocios` — ver seção 4.

---

# 2. EXCLUSÃO: A CHECAGEM COBRE UMA DE SEIS

**2.1 · O problema.** `deleteStakeholder` verifica se há despesa vinculada e, se
houver, recusa com a mensagem certa. Mas **seis tabelas** apontam para
`stakeholder`, e a checagem cobre **uma**:

| Tabela | Coluna | `onDelete` | Verificado? |
|---|---|---|---|
| `despesa` | `fornecedor_id` | set null | **sim** |
| `despesa_terceiro` | `pagador_terceiro_id` | set null | não |
| `recebimento_terceiro` | `recebedor_terceiro_id` | set null | não |
| `acerto` | `favorecido_id` | set null | não |
| `compensacao` | `terceiro_id` | set null | não |
| `document` | `stakeholder_id` | **cascade** | não |

**2.2 · Por que isso é grave.** As cinco não verificadas são `set null`: a
exclusão **não falha**. O banco zera o vínculo em silêncio.

Excluir um pagador sem despesa direta apagaria o nome de todas as obrigações
dele — e em produção há saldo em aberto nessa situação [dado de produção removido].

**2.3 · E o documento cai em cascata.** `document.stakeholder_id` é `cascade`:
excluir apaga o registro do arquivo que a própria `addStakeholder` gravou "para
auditoria". O objeto no R2 fica sem referência.

**2.4 · A correção.** Verificar **as seis**, e recusar com mensagem que diga
**qual** vínculo impede e quantos registros — não uma mensagem genérica.

**2.5 · Confirmação por digitação do nome**, como nas demais exclusões do
sistema.

**2.6 · Auditoria com inventário**: nome, documento mascarado, papéis e a
contagem de vínculos de cada tipo. Hoje registra só o id.

**2.7 · A funcionalidade permanece.** Cadastro recém-criado, sem nenhum vínculo,
continua excluível.

---

# 3. VALIDAÇÃO DE DOCUMENTO

**3.1 · Hoje não existe nenhuma.** Sem formato, sem dígito verificador, sem
unicidade. `updateStakeholder` nem faz `trim()`.

**3.2 · O validador já existe no repositório.** `cnpjValido`, em
`calc/emitente-fiscal.ts`, confere os dois dígitos, aceita CNPJ alfanumérico e
recusa sequência repetida. É usado no cadastro do tenant.

**Usar esse — não escrever outro.** Para CPF, não há validador no repositório;
criar um, no mesmo módulo.

**3.3 · Validar na entrada**, nas duas actions. E `trim()` nas duas.

**3.4 · Coerência entre tipo e documento.** `tipo` e `doc` são independentes
hoje: nada impede PJ com CPF. Passar a **avisar**, não bloquear — cadastro
antigo pode estar assim, e recusar a edição travaria a correção.

**3.5 · Duplicidade é alerta, nunca bloqueio.** Ao gravar documento que já
existe em outro cadastro, avisar e mostrar qual é.

**Não criar constraint `UNIQUE`.** Ver BW-1: já há duplicata em produção, e a
migração falharia no boot. E pode haver caso legítimo — matriz e filial com
raízes iguais.

**Este é o padrão do módulo `documento-fiscal.ts`**, que trata nota repetida
como alerta com o motivo escrito: numeração é sequencial por emitente, e
bloquear geraria falso positivo. Mesmo raciocínio.

**3.6 · Dado existente não é tocado.** Documento fora do padrão continua
legível, editável e **sinalizado na listagem** — com um indicador discreto, não
com erro.

---

# 3-A. AUTÔNOMO: CNPJ PREFERIDO, CPF COM ENDEREÇO

**3-A.1 · O contexto.** Engenheiro, mestre de obra e pedreiro são cadastrados
aqui — não no módulo Pessoas, que é dos CLT. Ver **Prompt Z**.

**3-A.2 · CNPJ é o preferido.** Autônomo que emita nota entra como PJ. A tela
pode sinalizar isso como orientação, sem obrigar.

**3-A.3 · Sem CNPJ, exigir endereço residencial.** Quando o tipo for **PF** e o
cadastro tiver papel de **prestação de serviço** ou **mão de obra**, o endereço
passa a ser obrigatório — é o que sustenta o RPA e o recibo.

`stakeholder` já tem os campos. O que muda é a obrigatoriedade condicional.

**3-A.4 · Nenhum cadastro existente é alterado.** Cadastro antigo sem endereço
continua válido e editável, **sinalizado na listagem** — com indicador discreto,
não com erro.

**3-A.5 · Reportar antes:** quantos cadastros PF com papel de serviço ou mão de
obra estão sem endereço hoje.

---

# 4. "INATIVAR" NÃO INATIVA

**4.1 · O problema.** `getStakeholders` — que alimenta esta tela e **todos os
seletores de fornecedor do app** — não filtra por `ativo`.

Só `getSocios` filtra. Então inativar um cadastro o remove do seletor de "pago
por sócio" e **não o remove de nenhum outro lugar**.

**4.2 · A correção.** Os seletores de escolha passam a oferecer **apenas
ativos**, mantendo visível o já vinculado quando for o caso — senão editar um
lançamento antigo perderia o fornecedor.

**4.3 · A listagem desta tela continua trazendo os dois**, com o "Mostrar
inativos" decidindo o que aparece. É o comportamento atual e está certo.

**4.4 · Reportar antes:** quantos cadastros estão inativos e quantos deles
aparecem em seletor hoje.

---

# 5. INTEGRIDADE

**5.1 · Permissão de ver.** A página não chama `can(..., "ver")` — só calcula
`canEditar` e `canExcluir`. **Sétima tela com esse furo.** Acrescentar com
`AccessDenied`.

**[NOTA]** A varredura completa é da seção 2.3 do **Prompt M**.

**5.2 · Retorno inconsistente.** `addStakeholder` faz `return` silencioso sem
permissão; as outras quatro lançam `Error`, cuja mensagem o Next.js substitui em
produção.

Converter as cinco para `{ ok, error }` e exibir. **Pré-condição da seção 7.**

**5.3 · `nome` vira "Sem nome".** As duas actions usam
`(formData.get("nome") as string) || "Sem nome"`. Salvar sem nome cria um
cadastro chamado "Sem nome" em vez de recusar. Validar.

**5.4 · Onde as actions moram.** As cinco vivem em `actions/despesas.ts`, nas
primeiras 221 linhas, num arquivo de mais de mil. Mover para
`actions/stakeholders.ts`.

**Mudança de organização, sem alteração de comportamento** — e ela facilita o
Prompt S, que reescreve aquele arquivo.

---

# 6. LISTAGEM

**6.1 · Busca e filtro.** Hoje há só o "Mostrar inativos". Com dezenas de
cadastros e a lista ordenada por nome, achar alguém exige rolar.

Acrescentar busca por nome e documento, e filtro por papel — que é o recorte
útil: "quem são os corretores", "quem pode pagar pela empresa".

**6.2 · Coluna de documento sinalizada** quando o formato for inválido ou
estiver duplicado, conforme 3.6.

**6.3 · Voltar a exibir o subtítulo.** O `PageHeader` descarta a prop, e ali
está a contagem de cadastros. Mesma correção dos Prompts B, J, M, N, R e S.

**6.4** Segue `PADRAO-VISUAL.md`, inclusive a seção de anexos.

---

# 7. ASSISTENTE DE IA

**A leitura de documento já existe e não se altera.** O que entra é o painel
lateral, com análises que a tela não oferece.

**7.1 · Somente leitura.** O preenchimento por documento continua sendo a
funcionalidade que já está lá, com confirmação do usuário. O painel analisa.

**7.2 · Ações**

- **Documentos duplicados** — cadastros com o mesmo CPF ou CNPJ, lado a lado,
  para o usuário decidir se é erro ou coincidência.
- **Cadastro incompleto** — sem documento, sem papel, sem contato. Papel vazio é
  especialmente relevante: o cadastro não aparece em nenhum seletor filtrado.
- **Documento inválido** — formato que não passa na verificação, e tipo
  incompatível com a quantidade de dígitos.
- **Inativos ainda em uso** — cadastros inativos que aparecem em lançamento
  recente.
- **Papéis e uso real** — quem está marcado como fornecedor e nunca teve
  despesa, e quem tem despesa e não tem o papel.

**7.3 · Nunca:** criar, editar, inativar ou excluir cadastro; conceder ou
retirar papel; e enviar CPF ao modelo.

**7.4 · O selo.** O painel é somente leitura; o preenchimento por documento tem
o comportamento próprio que já existe, com os alertas por campo. **Não unificar
os dois num selo só** — são coisas diferentes na mesma tela.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Cadastro de pagador na tela de Ressarcimentos | Prompt T |
| Cadastro de CLT e equipes de projeto | **Prompt Z** |
| Controle de diárias executadas e **valor da diária** | Prompt Z, seção 3.5 |
| Dados bancários e chave PIX do pagador | Prompt T, BT-2 |
| Forma de pagamento no lançamento | Prompt S, seção 3-B |
| Limpeza de objetos órfãos no R2 | tarefa própria |
| Varredura de permissão em todas as rotas | Prompt M, seção 2.3 |

---

# 9. PRESERVAÇÃO DE DADOS

Nenhum cadastro é alterado, inativado ou removido. Nenhum `doc` é normalizado,
reformatado ou corrigido. Nenhum `papeis` é reescrito. Nenhuma constraint de
unicidade é criada.

Migrações — o papel novo é constante em código, não schema — só se houver
necessidade real, e então aditivas com `IF NOT EXISTS` e `down`.

---

# 10. NÃO REGRESSÃO

`getStakeholders` alimenta os seletores de fornecedor de **várias** telas —
Despesas, Restituições, Acerto, e outras. Alterá-la atinge todas.

**Reportar quais telas são afetadas pelo filtro de ativo da seção 4 antes de
aplicar**, e confirmar nos testes que nenhuma perdeu opção que usava.

Não altera a leitura por IA, o `UploadDocumentos`, o `CampoIA` nem a edição
inline.

---

# 11. TESTES

1. Excluir cadastro com obrigação de terceiro é recusado, com a mensagem
   dizendo qual vínculo impede.
2. O mesmo para recebimento de terceiro, acerto, compensação e documento.
3. Excluir cadastro sem nenhum vínculo continua funcionando.
4. Excluir exige digitação do nome.
5. A auditoria da exclusão contém nome, documento mascarado, papéis e as
   contagens.
6. CNPJ inválido é recusado na criação e na edição.
7. CPF inválido é recusado.
8. Documento com espaços é gravado sem eles, nas duas actions.
9. PJ com documento de 11 dígitos **avisa**, sem bloquear.
10. Documento já existente em outro cadastro **avisa**, sem bloquear.
11. Cadastro antigo com documento fora do padrão continua editável, sinalizado.
12. Salvar sem nome é recusado.
13. "Pagador por Terceiro" aparece na lista de papéis.
13a. PF com papel de serviço ou mão de obra exige endereço ao gravar.
13a-1. O cadastro **não** tem campo de valor de diária — ele vive na alocação,
    no módulo Pessoas.
13b. Cadastro antigo sem endereço continua editável, sinalizado.
14. O select de pagador oferece apenas quem tem o papel.
15. Seletores de fornecedor não oferecem inativos — mas mantêm o já vinculado.
16. Sem permissão de ver, a tela não é acessível por URL direta.
17. Toda action retorna `{ ok, error }` e a mensagem aparece.
18. O assistente não grava nada e não recebe CPF.
19. A leitura por documento continua funcionando exatamente como hoje.
20. **Antes e depois:** contagem de `stakeholder` e conteúdo integral de cada
    linha, inclusive `papeis` e `doc`. Nenhuma diferença.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado de BW-1 — documentos duplicados, inválidos e ausentes. **Sem
   corrigir nenhum.**
1a. Quantos cadastros PF com papel de serviço ou mão de obra estão sem endereço.
   **Sem alterar nenhum.**
2. Resultado de BW-2 — papéis fora da lista, e elementos com vírgula.
3. Quantos cadastros inativos aparecem em seletor hoje, e quais telas mudam com
   a seção 4.
4. Como as seis verificações de exclusão foram implementadas.
5. Confirmação de que `cnpjValido` foi reaproveitado, e onde o validador de CPF
   foi criado.
6. Confirmação de que nenhuma constraint `UNIQUE` foi criada.
7. Para onde as actions foram movidas, e confirmação de que o comportamento não
   mudou.
8. Funcionamento do assistente, e confirmação de que não grava e não recebe CPF.
9. Confirmação de que a leitura por documento não foi alterada.
10. Comparação antes/depois de `stakeholder`.
11. Limitações encontradas.


<a id="prompt-g"></a>


========================================================================


### ▸ 16 de 42 · PROMPT G — Plano de Contas

**Bloco 3 · O lançamento** · Bloqueios: nenhum

⟨reescrito⟩ Parte 1 é restyle; Parte 2 é o assistente. **Não vão juntas.**

========================================================================


# PROMPT G — PLANO DE CONTAS · PADRÃO VISUAL E ASSISTENTE

Growth Construction · `/planocontas`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

**[REVISÃO 2]** O prompt passa a ter **duas partes independentes**:

| Parte | O que é | Muda funcionalidade? |
|---|---|---|
| **1** — seções 1 a 7 | o restyle | **não** |
| **2** — seção 8 | o assistente de IA | **acrescenta**, sem tocar no que existe |

**As duas não vão juntas.** A Parte 1 é restyle e o seu valor está em não mudar
nada; a Parte 2 acrescenta um painel. Misturá-las torna impossível saber, na
revisão, se algo sumiu por causa do layout ou do painel.

**A Parte 1 não muda nenhuma funcionalidade.** Nenhum campo entra, nenhum sai,
nenhuma regra muda, nenhuma consulta muda, nenhum botão faz coisa diferente. O
que muda é como a tela se parece.

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum número já lançado no sistema pode ser alterado.**
Valores, totais, percentuais, saldos, datas e quantidades existentes em produção
permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda, converte,
normaliza, migra, reclassifica ou "corrige" um número já gravado — nem como
efeito colateral de mudança de layout, de rota, de nome de campo ou de origem de
dado. Se uma alteração exigir tocar em número lançado: **PARE, não execute, e
informe qual número, por quê e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups definem layout, hierarquia visual e comportamento de interface — nada
além disso. Nunca usar valores, nomes de conta, códigos, naturezas ou qualquer
outro dado de exemplo vindo de mockup. Nunca criar registro, seed, fixture,
valor padrão ou dado de teste a partir de um mockup.

---

# ORDEM DE EXECUÇÃO

Depende apenas do **Prompt C** (barra lateral), que estabelece a moldura da
aplicação. É independente de A, B, D, E e F, e pode ir a qualquer momento depois
do C.

**[NOTA]** A revisão funcional desta tela ainda não aconteceu. Ela está no
roteiro como primeira tela do Bloco 1, e existem quatro decisões pendentes que
dependem dela — a natureza dos grupos, o destino do grupo "Financeiro /
Contábil", o grupo que receberá "Outras Receitas", e o destino da linha legada
"Receita".

**Esta tarefa não antecipa nenhuma dessas decisões.** Restyle não é o momento de
mexer em regra que ainda não foi discutida.

---

# ETAPA 1 — INVENTÁRIO, ANTES DE QUALQUER CÓDIGO

Entregar por escrito, e parar:

1. Todos os elementos da tela hoje: cabeçalho, filtros, tabelas ou listas,
   formulários, campos com rótulo e tipo, botões com o rótulo exato, estados
   vazios, mensagens, modais, badges e indicadores.
2. A hierarquia entre eles — o que está dentro do quê.
3. Quais elementos dependem de permissão para aparecer.
4. Quais ações existem e o que cada uma dispara.
5. Quais componentes compartilhados a tela usa, e quais são exclusivos dela.

Esse inventário é a lista de conferência do item 1 da seção 6. Se algo não
estiver nele, não pode aparecer nem desaparecer depois.

---

# 1. O QUE MUDA

Aplicar `PADRAO-VISUAL.md` — paleta, tipografia, espaçamento, raios, sombra,
estados. Especificamente:

**1.1 · Moldura.** Barra lateral escura e cabeçalho conforme o Prompt C, com
"Plano de Contas" ativo dentro do módulo Planejamento.

**1.2 · Cabeçalho da página.** Título em 29px/700. Se houver seletor de contexto
ou filtro no topo, alinhado à direita, com o rótulo pequeno acima, no padrão da
tela de Projetos.

**1.3 · Cartões.** Cada agrupamento vira cartão branco com borda `#E4E9F2`, raio
16px e a sombra padrão. Blocos internos usam raio 13px, borda `#EDF1F7` e fundo
`#FCFDFF`.

**1.4 · Cor semântica.** Se a tela distinguir receita de despesa, usar as cores
já definidas: receita em verde (`#ECFAF2` / `#0F8A5F`), despesa em vermelho
(`#FEF1F2` / `#C0334A`). Como marcação discreta — selo, texto, borda — nunca
como fundo de linha inteira em tabela longa.

**1.5 · Campos e botões.** Altura 40px, raio 9px, borda `#E4E9F2`, foco em
`#3B82F6` com halo. Botão primário `#2563EB`, secundário branco com borda.

**1.6 · Tabela ou lista.** Se a tela tiver tabela com muitas linhas ou colunas:
cabeçalho fixo no topo, primeira coluna fixa à esquerda, rolagem vertical e
horizontal internas ao contêiner, no mesmo padrão das telas de Orçamentos e
Previsão Atualizada. Altura máxima que preserve o resto da página visível.

**1.7 · Hierarquia de grupo e subconta.** Se a tela exibir grupos com contas
dentro, a diferença entre os dois níveis precisa ser evidente — recuo, peso de
fonte e um indicador de expandir, no mesmo espírito da barra lateral. Não
distinguir só por fundo.

**1.8 · Estados vazios.** Campo sem valor mostra estado vazio, **nunca zero e
nunca placeholder numérico**.

**1.9 · Acessibilidade.** Foco visível por teclado, `aria-expanded` em qualquer
elemento expansível, contraste suficiente, `prefers-reduced-motion` respeitado.

---

# 2. O QUE NÃO MUDA

Lista fechada. Qualquer alteração aqui está fora de escopo.

- **Rota.** Continua `/planocontas`.
- **Consultas.** Nenhuma query nova, alterada ou removida.
- **Server Actions.** Mesmas assinaturas, mesmas validações, mesmo retorno.
- **Regras de negócio.** Inclusive a regra que deriva a natureza de um grupo a
  partir das subcontas.
- **Campos.** Nenhum entra, nenhum sai, nenhum muda de tipo, de ordem ou de
  obrigatoriedade.
- **Rótulos e textos.** Mesmas palavras, incluindo mensagens de erro e textos de
  ajuda. Restyle não reescreve.
- **Botões.** Mesmos botões, mesmos rótulos, mesmas ações, mesma posição
  relativa.
- **Permissões.** Mesmas verificações, no servidor e na interface.
- **Schema.** Nenhuma migração. Se surgir necessidade de alterar schema para
  fazer layout, **PARE** — é sinal de que algo fora de escopo entrou junto.
- **Assistente de IA.** Não entra na **Parte 1**. Ele é a Parte 2, e vai depois.

---

# 3. PRESERVAÇÃO DE DADOS

Nenhum registro de `chart_account` — nem de qualquer outra tabela — pode ser
criado, alterado, reclassificado, inativado ou removido por esta tarefa.

Nenhum `UPDATE`, nenhum `DELETE`, nenhuma migração, nenhum script.

Conta cadastrada com dado incompleto ou fora de padrão continua aparecendo como
está. Restyle não corrige dado.

---

# 4. RISCO CONHECIDO DESTA TAREFA

Restyle parece inofensivo e é onde funcionalidade some sem ninguém perceber.
Três armadilhas específicas:

**4.1 · Elemento condicional.** Botão ou campo que só aparece com certa
permissão, certo estado ou certo tipo de conta é fácil de perder ao reescrever o
JSX. O inventário da Etapa 1 existe para isso.

**4.2 · Comportamento preso ao layout.** Ordenação, expansão de grupo, filtro
que depende de estado do componente — reorganizar a marcação pode quebrar sem
erro visível.

**4.3 · Texto que parece decorativo.** Nota de rodapé, aviso, legenda: pode ser
a única explicação de uma regra. Se um texto parecer dispensável, **manter e
perguntar**, nunca remover.

---

# 5. NÃO REGRESSÃO

Esta mudança não pode alterar o funcionamento de Orçamentos, Previsão
Atualizada, DRE, Consolidado, Despesas, Medição, ou qualquer tela que leia o
plano de contas.

Se algum componente for compartilhado com outra tela, **não alterá-lo**: criar
variante ou aplicar o estilo no ponto de uso. Alterar componente compartilhado
numa tarefa de restyle é como mudanças vazam para telas não revisadas.

---

# 6. TESTES

1. Todos os elementos do inventário da Etapa 1 continuam presentes e no mesmo
   lugar da hierarquia.
2. Cada ação faz exatamente o que fazia — criar, editar, inativar, reordenar, o
   que existir.
3. Perfis diferentes de permissão veem exatamente o que viam antes.
4. Tabela ou lista com muitos itens: cabeçalho e primeira coluna permanecem
   fixos, rolagem funciona nas duas direções.
5. Grupo com muitas subcontas expande e recolhe como antes.
6. Estado vazio, mensagens de erro e textos de ajuda continuam aparecendo, com
   as mesmas palavras.
7. Navegação por teclado alcança tudo, com foco visível.
8. Viewport menor: nada fica inacessível.
9. **Antes e depois:** contagem de registros de `chart_account` e conteúdo
   integral de cada linha. Nenhuma diferença.
10. Orçamentos e Previsão Atualizada continuam montando as mesmas linhas de
    antes, para o mesmo projeto e versão.

---

# PARTE 2 — ASSISTENTE DE IA

**Vai depois da Parte 1, nunca junto.** Segue o **Prompt E**, Etapa 1. **Somente
leitura.**

---

# 8. O ASSISTENTE

## 8.1 · Por que esta tela ganha painel

O plano de contas **não tem número próprio** — ele classifica o número dos
outros. Por isso ninguém olha para ele até alguma coisa aparecer errada três
telas adiante.

**O painel existe para mostrar o uso real do plano**, que é a informação que a
tela nunca deu: quais contas recebem lançamento, quais nunca receberam, e quais
estão recebendo coisa que não combina com elas.

## 8.2 · O que ele não faz, e por quê

**8.2.1 · Nunca cria, edita, inativa ou reordena conta.** Nem na Etapa 3 — esta
tela fica **fora da escrita assistida, permanentemente**.

**8.2.2 · Nunca sugere a categoria DRE de uma conta.** Classificação é decisão
contábil, e **reclassificar conta muda relatório de período já fechado**. O
mesmo limite do item 7.2 do **Prompt AN**.

**8.2.3 · Nunca afirma que uma conta está errada.** Ele mostra o uso e a
divergência; a leitura é de quem conhece o contrato e a obra.

**8.2.4 · Nunca propõe fusão de contas.** "Estas duas parecem a mesma" é
observação; unir plano de contas é migração de dado.

## 8.3 · Ações

**8.3.1 · Contas sem uso.** Cadastradas e sem nenhum lançamento no período —
com a data do último, quando houver. Separa **conta criada e esquecida** de
**etapa da obra que ainda não começou**, que é a distinção que a lista sozinha
não faz.

**8.3.2 · Uso divergente da natureza.** Conta de um grupo recebendo categoria
DRE que não combina com ele — custo de obra lançado como despesa fixa, e o
contrário.

**É a leitura que antecipa o que a Conferência mostra depois**, quando o número
já entrou no relatório.

**8.3.3 · Contas parecidas.** Nomes próximos, que podem estar dividindo o mesmo
gasto entre duas linhas — e fazendo cada uma parecer menor do que é.

**8.3.4 · Onde cada conta aparece.** Em quais relatórios ela entra e por qual
categoria. **É a resposta para "por que esse gasto não está na DRE"** sem
precisar abrir a DRE.

## 8.4 · O que o painel declara

**8.4.1 · O período do uso.** "Sem lançamento" só significa alguma coisa com
recorte declarado — sem período, conta nova e conta abandonada são iguais.

**8.4.2 · O escopo de projeto.** O plano é do tenant; o uso é por projeto. O
painel diz de quais projetos está falando.

**8.4.3 · Ausência de achado não é atestado.** Nenhuma divergência encontrada
significa nenhuma **nestas quatro leituras**.

## 8.5 · Isolamento

Filtro de tenant explícito em toda consulta. E o painel **respeita a permissão
de origem do dado**: quem não vê Despesas não recebe contagem de lançamento, nem
agregada.

## 8.6 · Interface

Painel lateral de 300px, recolhível, conforme `PADRAO-VISUAL.md`, seção 7.

**A coluna de referência das Categorias DRE permanece** — ela explica a
estrutura fixa do relatório, e é outra coisa. O painel entra **acima** dela.

Selo **"Somente leitura"** ao lado do título, e o rodapé declarando que
classificação é decisão contábil.

## 8.7 · O que a Parte 2 não antecipa

As quatro decisões pendentes da revisão funcional desta tela — a natureza dos
grupos, o destino do grupo "Financeiro / Contábil", o grupo que recebe "Outras
Receitas" e o destino da linha legada "Receita".

**O painel mostra o uso; ele não opina sobre nenhuma das quatro.**

---

# 9. TESTES DA PARTE 2

1. O painel não grava nada — verificar por contagem de `chart_account` antes e
   depois de uma sessão de uso.
2. Nenhuma ação sugere categoria, criação, fusão ou inativação.
3. "Contas sem uso" declara o período considerado.
4. O painel declara de quais projetos está falando.
5. Usuário sem permissão de ver Despesas não obtém contagem de lançamento.
6. O painel de um tenant nunca exibe conta de outro.
7. A coluna de Categorias DRE continua na tela, com o mesmo conteúdo.
8. O selo "Somente leitura" está presente e não coexiste com função de escrita.
9. Recolher e expandir persiste por usuário.
10. **Nenhum número da tela mudou** com a entrada do painel.

---

# 7. RELATÓRIO FINAL OBRIGATÓRIO

1. Inventário da Etapa 1.
2. Arquivos e componentes alterados.
3. Componentes compartilhados envolvidos, e como foram tratados sem afetar
   outras telas.
4. Confirmação, item a item do inventário, de que tudo continua presente.
5. Confirmação de que nenhuma query, action, validação, permissão, rótulo ou
   campo mudou.
6. Confirmação de que nenhuma migração foi criada.
7. Comparação antes/depois de `chart_account`.
8. Qualquer elemento cuja função não tenha ficado clara durante o trabalho —
   listar em vez de decidir sozinho.
9. Limitações encontradas.

**Da Parte 2, se executada:**

10. As consultas do painel, com o filtro de tenant de cada uma.
11. Como o período e o escopo de projeto são declarados.
12. Confirmação de que o painel não grava nada e não sugere classificação.
13. Confirmação de que nenhuma das quatro decisões pendentes foi antecipada.


<a id="prompt-s"></a>


========================================================================


### ▸ 17 de 42 · PROMPT S — Despesas

**Bloco 3 · O lançamento** · Bloqueios: BS-1 · BS-2 · BS-3 · BS-4

⟨reescrito⟩ A seção 3-C trava a categoria de receita. O BS-1 nunca leu o `despesa-form`.

========================================================================


# PROMPT S — DESPESAS / LANÇAMENTOS

Growth Construction · `/despesas`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Valores, datas,
status, PEDs e vínculos existentes permanecem como estão. Nenhuma tarefa
recalcula, converte, normaliza ou "corrige" um lançamento já gravado. Se uma
alteração exigir tocar em dado existente: **PARE, não execute, e informe qual
dado, por quê, quantos registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.** PEDs, fornecedores, valores e
competências dos mockups são ilustração.

---

# ESCOPO

Esta é a tela mais usada do sistema e a mais bem construída. **Nenhuma
funcionalidade sai** — exceto duas abas, e mesmo assim de forma condicionada
(seção 5).

O trabalho é: fechar a trava de conciliação, tornar a exclusão informada,
corrigir a edição de despesa já paga, e padronizar o retorno de erro.

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

Vale listar, porque esta tela é referência para as outras e o risco é
"corrigir" o que está bom:

**A auditoria da edição.** `updateDespesa` usa `diffAudit` campo a campo, com
valor anterior e novo, normalizando nulo e numeric-como-string para não
registrar mudança que não houve. É a RG-09 cumprida — ao lado de
`updateCliente`, o único lugar do sistema. **Usar como referência nos demais
prompts, não reescrever.**

**A imutabilidade do PED.** A tentativa de renumerar é recusada com mensagem que
explica onde corrigir o número da nota. RG-06 funcionando.

**O tratamento de versão Atual ausente.** A página sinaliza em vez de cair na
versão de outro projeto. O comentário conta o bug anterior — lançamento ia para
a obra errada. É o oposto do que as outras telas fazem.

**A extração por IA.** "O que a IA não achar — ou achar com dúvida — fica marcado
com alerta no campo. Nada é gravado antes de você conferir e lançar." É
exatamente o padrão convencionado no Prompt E, já implementado aqui.

**`getDespesasByTenant` filtra `versions.kind = "atual"`.** A consulta
consolidada já está correta.

**O módulo `documento-fiscal.ts`.** A regra de pendência, a exigência de número
só ao pagar, e a duplicidade como **alerta e não bloqueio** — com o motivo
escrito: numeração de NF é sequencial por emitente e série, então dois
fornecedores podem ter a mesma nota 1234. É o raciocínio certo e deve ser citado
como referência onde outros prompts tratarem de duplicidade.

**O módulo `calc/natureza-dre.ts`.** A classificação credora × devedora das
categorias da DRE já existe, com fonte única, teste próprio e as quatro funções
que a seção 3-C precisa: `naturezaCategoriaDre`, `categoriaValidaParaDespesa`,
`categoriasDeDespesa` e `validarCategoriaDespesa`. O default é **devedora** de
propósito, e o comentário diz por quê. **Não reescrever, não duplicar a regra em
lugar nenhum** — a seção 3-C é sobre ligar este módulo em todos os caminhos de
gravação, não sobre criar outro.

---

# ORDEM DE EXECUÇÃO

Depende do **Prompt R** (Contas a Pagar) para a seção 5, e do **Prompt L**
(Caixa) para o mecanismo de desfazer conciliação da seção 1.

As seções 2, 3, 4, 6 e 7 são independentes e podem ir sozinhas.

**A seção 3-C também é independente**, e é a de menor risco do prompt: não altera
dado, não muda número em relatório, e o módulo que ela usa já existe. Se houver
uma só janela de trabalho, é a que entrega mais por linha de código.

---

# BLOQUEIOS

## BS-1 · O formulário não foi revisado

`despesa-form.tsx` tem cerca de 1.500 linhas — parcelamento, recorrência,
despesa paga por sócio, configuração de parcelas e a extração por IA. **Não foi
lido nesta revisão.**

O Prompt I já lista, nas seções 11.3 a 11.6, problemas prováveis nessa área,
levantados sem ver o código: soma de parcelas que não confere com o total,
status de parcela vindo do cliente sem whitelist, recorrência copiando estado de
pagamento.

**Ler o formulário e reportar antes de implementar.** O que estiver lá pode
mudar o desenho das seções 1 e 3.

## BS-2 · A validação ao pagar é contornável?

`validarDocumentoAoPagar` recusa marcar como paga uma despesa cujo tipo de
documento exige número e o número está em branco.

Mas em produção há lançamentos **pagos e sem NF**. Ou foram pagos
antes da validação existir, ou por um caminho que não a chama.

**Verificar e reportar:** `pagarDespesa` chama a validação? E o pagamento por
parcela? E o Acerto Contábil, que também liquida despesa?

Se algum caminho não valida, a regra existe e é contornável — e corrigir isso
muda o que a operação consegue fazer hoje. **Não implementar sem decisão.**

## BS-3 · O Repositório está duplicando linhas

Na tela, o mesmo arquivo aparece duas vezes — mesmo PED, mesma nota, mesmo
valor, mesmo envio.

A causa provável é o `leftJoin` de `getRepositorio` com `documentos_fiscais` por
`despesa_id`, sem restrição de um registro por despesa. Duas notas na mesma
despesa multiplicam a linha do arquivo.

**Contar antes:** quantas despesas têm mais de um registro em
`documento_fiscal`. Se a hipótese se confirmar, o contador de arquivos da tela
também está inflado.

## BS-4 · Quantas despesas estão hoje classificadas como receita

A seção 3-C trava o lançamento futuro. O que já está gravado é outro problema, e
precisa de número antes de qualquer decisão.

A tela de Conferência de lançamentos (`/diagnostico/categorias-invertidas`)
existe justamente porque isso acontece, e `getDespesasSuspeitas` já lista os
casos. Mas ninguém sabe o volume.

**Entregar antes de qualquer código, somente leitura:**

```sql
-- Despesas com categoria de natureza credora, por projeto e versão.
SELECT p.name AS projeto, v.kind, v.label,
       d.categoria_dre, d.cancelado,
       COUNT(*) AS qtd, SUM(d.valor) AS total
  FROM despesa d
  JOIN version v ON v.id = d.version_id
  JOIN project p ON p.id = v.project_id
 WHERE d.categoria_dre = 'Receita'
 GROUP BY 1,2,3,4,5
 ORDER BY 7 DESC;

-- As linhas, uma a uma, para a conferência item a item.
SELECT d.num_doc, p.name AS projeto, d.competencia, d.valor,
       d.conta_cef, d.status, d.cancelado, d.obs
  FROM despesa d
  JOIN version v ON v.id = d.version_id
  JOIN project p ON p.id = v.project_id
 WHERE d.categoria_dre = 'Receita'
 ORDER BY d.valor DESC;

-- O mesmo defeito no planejamento: linha de despesa com categoria de receita.
SELECT p.name, v.kind, v.label, b.row_key, b.mes, b.valor
  FROM budget_line b
  JOIN version v ON v.id = b.version_id
  JOIN project p ON p.id = v.project_id
 WHERE b.kind = 'despesa' AND b.dre_category = 'Receita'
 ORDER BY b.valor DESC;
```

**Por que o número importa:** essas linhas **somam na receita da DRE hoje**
(`dre/page.tsx:133`). Travar o lançamento não as remove de lá. Enquanto existirem,
a receita da DRE continua inflada por elas, e o total exibido não muda com esta
tarefa — **é exatamente o que se espera, e precisa estar escrito no relatório
final para ninguém interpretar como falha da trava.**

**Nenhuma reclassificação em massa.** O caminho é `reclassificarDespesas`
(`actions/diagnostico.ts:117`), que já existe, opera sobre linhas marcadas pelo
usuário e grava auditoria com `changes`. Item a item, decisão humana.

---

# 1. TRAVA DE CONCILIAÇÃO

**1.1 · A regra.** Despesa conciliada com movimento de extrato **não aceita
alteração de valor, vencimento nem competência** — os três que descasam o
vínculo.

**Os demais campos seguem editáveis**: descrição, observação, fornecedor, conta
CEF, categoria DRE, forma de pagamento. Corrigir uma descrição não descasa nada,
e travar tudo criaria atrito desnecessário para quem lança todo dia.

**1.2 · A mensagem.** A tentativa exibe **qual movimento** está vinculado — data,
valor e descrição do extrato — e diz que desfazer a conciliação vem antes.

**1.3 · Desfazer exige permissão própria**, verificada no servidor, e **não se
confunde com editar despesa**.

Quem pode editar mas não pode desfazer fica bloqueado — e isso é intencional. A
mensagem precisa dizer com todas as letras que a operação exige permissão que o
usuário não tem, senão ele fica tentando e não entende por quê.

**[NOTA]** O mecanismo de desfazer já existe: `desfazerConciliacao`, no Caixa,
devolve o `cash_entry` ao estado não conciliado, reverte o status da despesa e
**preserva o movimento do extrato** — com o comentário explicando que lançar
estorno ali inventaria uma entrada que nunca aconteceu no banco. O raciocínio
está certo. Falta a despesa consultá-lo antes de deixar editar.

A permissão e o fluxo pertencem ao **Prompt L**; aqui entra a trava e a mensagem.

**1.4 · Vale para as demais dependências financeiras.** Despesa com pagamento
registrado, parcela paga, acerto ou obrigação com terceiro segue o mesmo
caminho: desfaz o fato financeiro primeiro, depois mexe no documento.

---

# 2. EXCLUSÃO INFORMADA

**2.1 · O problema.** `deleteDespesa` apaga sem verificar dependência nenhuma.
Pelas chaves em cascata, leva junto as parcelas, os pagamentos, o item de
acerto, a obrigação com terceiro e as restituições dela, e os registros de
documento.

E **deixa o `cash_entry`** — que é `set null`, não cascata. O dinheiro continua
tendo saído do banco, e a despesa que o justificava deixa de existir. Se havia
acerto, ele deixa de fechar: a saída única permanece e um dos PEDs abatidos
sumiu.

A auditoria guarda `valor` e `numDoc`. Nada sobre o que foi apagado junto.

**2.2 · A correção — avisar, não bloquear.** A exclusão continua disponível.
Antes de executar, a tela exibe o **inventário do que será removido**:

quantas parcelas · quantos pagamentos e o total já saído do caixa · qual acerto,
se houver · qual obrigação com terceiro e quantas restituições · quantos
documentos anexados · e o aviso de que o movimento bancário ficará sem vínculo.

**2.3 · Confirmação por digitação do PED.** O Excluir fica ao lado do Editar e
do Cancelar, em linhas parecidas. Digitar o número é a trava contra o clique
errado.

**2.4 · A auditoria passa a guardar o inventário completo**: fornecedor,
competência, conta CEF, categoria, valor, e as contagens acima. Depois de
apagado, alguém consegue reconstituir o que existia.

**2.5 · Transação.** Hoje o delete e o `logAudit` acontecem fora de transação —
se a auditoria falhar, apagou sem rastro. Envolver os dois.

**2.6 · Diagnóstico, somente leitura.** Listar as exclusões já ocorridas
(`action = "despesa.delete"`) e cruzar com `cash_entry` sem vínculo, para medir
o que já foi perdido. **Nenhum registro é alterado.**

---

# 3. INTEGRIDADE DA EDIÇÃO

**3.1 · `updateDespesa` não checa pagamentos.** Dá para alterar o valor de uma
despesa já paga, descasando o saldo.

Passa a recusar alteração de valor quando houver pagamento registrado, com a
mensagem indicando o caminho: desfazer o pagamento primeiro.

**3.2 · `status` entra no patch sem whitelist.** Dá para gravar `"Pago"` sem que
exista pagamento.

Fechar o domínio no servidor, e **não permitir que a edição marque como paga**:
pagamento se registra pelo fluxo de pagamento, que cria o movimento de caixa.

**[BLOQUEIO menor]** Verificar antes se a operação usa esse campo como atalho
para marcar pagamento sem registrar o fato. Se usar, fechar vai atrapalhar o dia
a dia, e a guarda precisa de outro desenho — por exemplo, oferecer o registro de
pagamento no mesmo lugar.

**3.3 · Retorno de erro inconsistente.** No mesmo arquivo: `updateDespesa` e
`deleteDespesa` fazem `return` silencioso sem permissão; `cancelarDespesa` e
`pagarDespesa` lançam erro — cuja mensagem o Next.js substitui em produção.

Converter todas para `{ ok, error }` e exibir na tela. Sem isso, cada validação
nova das seções 1 e 3 vira um travamento inexplicável.

---

# 3-B. FORMA DE PAGAMENTO — A PORTA ÚNICA DE LANÇAMENTO

**Esta tela passa a ser o único lugar onde se lança despesa.** O formulário de
"Nova despesa paga por terceiro" sai da tela de Ressarcimentos (**Prompt T,
seção 2**), e o que entra aqui é a escolha de **por onde o dinheiro sai**.

**3-B.1 · Três origens de pagamento**, no lugar do campo "Banco" atual:

| Origem | Efeito no caixa | Obrigação gerada |
|---|---|---|
| **Conta da empresa** | saída na data de pagamento | nenhuma |
| **Pago por terceiro** | **nenhuma saída agora** | obrigação com o terceiro |
| **Cartão de crédito** | **nenhuma saída agora** | compra vinculada a uma fatura |

**3-B.2 · A competência não muda com a forma de pagamento.** Ela é informada
pelo usuário e define a DRE. A forma de pagamento define **quando e por onde** o
caixa sai. São fatos separados, e essa separação é a RG-01.

**3-B.3 · Pago por terceiro.**

O select oferece **apenas quem tem o papel de pagador**, cadastrado na tela de
Restituições — não a lista inteira de `stakeholder`, como hoje.

A obrigação nasce aqui, na mesma transação do lançamento.

**[NOTA — mover, não reimplementar]** `criarDespesaTerceiro`, em
`actions/restituicoes.ts`, já faz exatamente isso no modo "despesa nova":
reserva PED, cria a despesa com `pagoPorTerceiro: true`, cria a obrigação, tudo
em uma transação, com chave de idempotência e tratamento da colisão de índice
como sucesso.

**Mover essa lógica para cá.** Reescrevê-la perderia a idempotência, que é o que
impede duplo clique de virar duas obrigações.

**3-B.4 · Cartão de crédito.**

O select oferece os cartões cadastrados — ver **Prompt U**. A compra fica
vinculada à fatura do ciclo, calculada pela data e pelo dia de fechamento.

**Nenhuma saída de caixa acontece no lançamento.** A despesa **não** aparece em
Contas a Pagar: quem aparece é a fatura.

**3-B.5 · A despesa não nasce paga.** Nem no cartão, nem por terceiro. Em ambos
os casos o fornecedor foi pago por outro — mas o caixa da empresa não saiu. O
status reflete isso, e não "Pago".

**[BLOQUEIO menor]** Hoje `criarDespesaTerceiro` grava `status: "Pago"` na
despesa criada no modo "despesa nova". Verificar o efeito disso em Contas a
Pagar e no Fluxo, e decidir o status correto **antes** de mover a lógica.

**3-B.6 · Parcelamento no cartão.** Uma compra em 6x gera seis parcelas, uma por
fatura consecutiva. `despesa_parcela` já suporta; o vínculo com a fatura é
coluna aditiva do **Prompt U**.

**3-B.7 · O que não muda.** O campo de conta bancária continua existindo para a
origem "conta da empresa", com o mesmo comportamento de hoje. Nenhuma despesa
existente é reclassificada de origem.

---

# 3-C. TRAVA DE NATUREZA — NENHUMA DESPESA É CLASSIFICADA COMO RECEITA

**Ver BS-4 antes de implementar.**

## 3-C.1 · A regra

**Nenhum lançamento de despesa pode ter categoria de natureza credora.** Hoje a
única é `"Receita"`; quando o pacote de controladoria acrescentar "Receitas
Financeiras", a regra a alcança sozinha, porque a fonte é o conjunto `CREDORAS`
de `calc/natureza-dre.ts`, não uma comparação com a string.

**E a categoria passa a ser obrigatória.** Despesa sem categoria não é gravada.
Os dois lados da regra estão na mesma função — `validarCategoriaDespesa` recusa
tanto a categoria credora quanto a vazia.

## 3-C.2 · Por que a categoria vazia entra junto

Porque o efeito é o mesmo, e é pior de perceber.

A DRE descarta em silêncio toda despesa sem categoria — `if (!d.categoriaDre)
continue` (`dre/page.tsx:129`). Ela não entra em nenhuma linha, não aparece em
nenhum total, não gera aviso. **A DRE deixa de fechar com o razão, e nada na tela
diz isso.**

Uma despesa classificada como receita infla o resultado; uma despesa sem
categoria some dele. As duas nascem do mesmo campo mal preenchido, e as duas se
resolvem na mesma validação.

## 3-C.3 · Onde a trava vive — não é só a tela

**Validar no formulário não protege nada: a Server Action é chamável direto.** O
comentário de cabeçalho de `natureza-dre.ts` já diz isso, e esta seção o cumpre.

A trava é **na action que grava**, e em todas elas. O formulário apenas deixa de
oferecer a opção — é conveniência, não proteção.

**3-C.3.1 · Inventário obrigatório, antes de codar.** Listar **todo** caminho que
escreve `despesa.categoria_dre`, com arquivo e linha. Os conhecidos:

| Caminho | Arquivo | Situação |
|---|---|---|
| `addDespesa` | `actions/despesas.ts` | valida? confirmar |
| `updateDespesa` | `actions/despesas.ts` | valida? confirmar |
| `criarDespesaTerceiro` | `actions/despesas.ts` | preserva a categoria do original — confirmar o que grava no modo "despesa nova" |
| `reclassificarDespesas` | `actions/diagnostico.ts:117` | **destino da reclassificação também precisa ser devedora** |
| Diferença do Acerto Contábil | `actions/acerto.ts` | cria despesa financeira — confirmar a categoria gravada |
| Apuração do Ponto | `actions/ponto.ts` | gera conta a pagar — confirmar |
| Baixa de estoque | `actions/estoque.ts` | confirmar se grava despesa |
| `importVersionData` | `actions/versao.ts` | **importação por planilha — é o caminho mais perigoso** |

O inventário é a entrega; a lista acima é ponto de partida, não escopo fechado.

**3-C.3.2 · A importação por planilha é o caso crítico.** `importVersionData`
recebe categoria de um arquivo que ninguém validou. Se ela não passar pela mesma
função, a trava tem uma porta aberta do tamanho de uma planilha.

**Decidir e reportar:** linha de planilha com categoria credora é **recusada com
a linha identificada**, ou a importação inteira é recusada? Recomendação: recusar
a importação inteira, listando todas as linhas inválidas de uma vez — importação
parcial deixa o usuário sem saber o que entrou.

**3-C.3.3 · Uma função, um erro, uma mensagem.** Todos os caminhos chamam
`validarCategoriaDespesa` e devolvem a mensagem do módulo
(`ERRO_CATEGORIA_CREDORA`). Nenhuma action escreve texto próprio, nenhuma
reimplementa a verificação.

## 3-C.4 · Na interface

**3-C.4.1** O `<Select>` de categoria oferece apenas `categoriasDeDespesa()`. A
ordem original da lista é preservada — a tela não reordena o que o usuário já
conhece de cor.

**3-C.4.2** O campo abre em **"Selecione…"**, não na primeira opção. Era o
primeiro item ser "Receita" que fazia toda despesa nova nascer classificada como
receita.

**3-C.4.3** A recusa do servidor aparece **no campo**, não como erro genérico de
topo, e diz o que fazer: se o lançamento é mesmo uma entrada, ele não é despesa —
o caminho é Contas a Receber.

**3-C.4.4** Numa despesa **existente** cuja categoria é credora — o legado do
BS-4 — o select exibe o valor atual, marcado como inválido, e **não permite
salvar sem trocar**. O registro continua intacto enquanto ninguém o editar; a
trava vale para a gravação, não para a leitura.

## 3-C.5 · O que esta seção não faz

- **Não altera nenhuma despesa existente.** Nenhum `UPDATE`, nenhuma migração,
  nenhum script. O legado do BS-4 continua exatamente como está.
- **Não muda número em relatório.** As linhas já gravadas continuam somando na
  receita da DRE. Quem retira isso é o prompt da DRE — ver seção 9.
- **Não toca no `chart_account`.** A categoria da DRE vive na despesa; a conta do
  plano tem `natureza`, que é outra coisa e não é lida pela DRE.
- **Não altera `CATEGORIAS_DRE`.** As nove continuam existindo; o que muda é
  quais são oferecidas e aceitas num lançamento de despesa.

## 3-C.6 · Diagnóstico permanente

A tela de Conferência de lançamentos continua listando o legado, e passa a ser o
único caminho de correção — item a item, com auditoria. **Ela não é substituída
por esta trava: a trava impede o novo, a conferência resolve o antigo.**

---

# 4. O SELO "SEM NF" DIZ O QUE FALTA

**4.1** Hoje o mesmo selo cobre quatro situações: nenhum registro fiscal, tipo
`SEM_DOC` não declarado, tipo escolhido **sem número**, e tipo inválido.

Quem tem "Recibo" selecionado no formulário e o número em branco não tem como
saber o que falta.

**4.2 · Corrigir.** O selo, ou a dica ao lado dele, diz o que está pendente. E o
formulário sinaliza no próprio campo quando o tipo escolhido exige número —
`exigeNumero` já existe e responde isso.

**4.3 · O anexo não é a nota.** A tela mostra o clipe do arquivo ao lado do selo
"Sem NF", e quem anexou o comprovante tem todo motivo para achar que resolveu.
`document` guarda o arquivo; `documento_fiscal` guarda o registro da nota.

Deixar a distinção visível: o clipe indica arquivo, o selo indica nota. Dois
conceitos, dois lugares.

**4.4** O contador exibe "N lançamento(s)". Concordar o plural.

---

# 5. ABAS

**Remoção condicionada.** As duas abas abaixo só saem **depois** que o
**Prompt R** corrigir a tela de Contas a Pagar. Removê-las antes deixa o sistema
sem visão que hoje só existe aqui.

| Aba | Decisão |
|---|---|
| **Lançamentos** | fica |
| **Pendente de NF** | fica — não tem equivalente, e implementa a RG-06 |
| **Repositório** | fica — única busca de documento do sistema, e o único lugar onde arquivo sem vínculo aparece |
| **Acertos** | **entra** — ver seção 5-A |
| **A Pagar** | **sai**, depois que a `/contaspagar` filtrar por versão Atual |
| **Parcelas** | **sai**, depois que a `/contaspagar` passar a listar por vencimento de parcela |

**5.1 · Por que a ordem importa.** A aba "A Pagar" é escopada à versão Atual do
projeto; a `/contaspagar` lê por tenant, sem filtrar versão. E a aba "Parcelas" é
**a única tela do sistema** que mostra `despesa_parcela` — e a única que exibe
cheque por parcela, número e "bom para", que a migração 0038 acrescentou.

Enquanto a Contas a Pagar não cobrir as duas coisas, remover as abas apaga
informação.

**5.2 · O que a Contas a Pagar precisa ter antes**, e que pertence ao Prompt R:
filtro por versão Atual; listagem por vencimento de obrigação, com uma linha por
parcela em aberto; saldo real em vez de valor cheio; e o cheque por parcela.

---

# 5-A. ABA "ACERTOS" — A TELA DE ACERTO CONTÁBIL VEM PARA CÁ

## 5-A.1 · A decisão

A rota `/acerto` é **descontinuada** e o item sai do menu. O conteúdo vira **aba
somente leitura** nesta tela.

**Por quê:** a operação que ela fazia — um pagamento único quitando várias
despesas — passa a acontecer na **conciliação**, no Caixa, onde o movimento vem
do extrato em vez de ser digitado. Ver **Prompt L**.

## 5-A.2 · Por que o histórico não pode simplesmente sumir

**Nada no repositório lê `acerto`, `acerto_item` ou `rateio_obra` fora da
própria tela.** Nenhuma função de `queries.ts`, nenhum relatório, nenhum backup.
`rateio_obra` tem um INSERT e **zero SELECT** em todo o código.

E as alternativas não cobrem:

- A **Conferência de lançamentos** mostra despesas com categoria de receita, sem
  categoria ou com valor zero. Não mostra acertos.
- O **Log de Auditoria** registra `acerto.create`, mas o meta não tem a chave
  `changes`, então a célula Detalhes exibe `JSON.stringify` cru. E a tela traz
  só os **200 eventos mais recentes**, sem filtro nem paginação — achar um
  acerto antigo por ali não é possível.

**Remover a tela tornaria os dados inalcançáveis.** Cada acerto é o documento
que explica uma saída de caixa e diz quais despesas ela quitou.

**[NOTA — a norma]** A ITG 2000 (R1), do CFC, trata da escrituração contábil e
**da guarda e manutenção da documentação e dos arquivos contábeis**. Para erro,
ela não prevê apagar: prevê retificar por estorno, transferência ou
complementação — e exige que o histórico precise **o motivo, a data e a
localização do lançamento de origem**. Não há como apontar para um registro que
ninguém consegue abrir.

## 5-A.3 · O que a aba mostra

Lista dos acertos registrados, com: data do pagamento, valor transferido,
favorecido, forma, banco, e a diferença quando houver.

Ao expandir cada um: os **PEDs abatidos** com o valor de cada um, vindos de
`acerto_item`; o **rateio entre obras**, de `rateio_obra`; e o **movimento de
caixa** gerado, com `cat: "acerto"`.

## 5-A.4 · Aviso no topo

Texto fixo explicando o que fazer hoje, nestas palavras ou equivalentes:

> Paguei várias contas com um pagamento só — como registro?
>
> Lance as despesas normalmente, aqui em Lançamentos, uma para cada conta, com
> a competência de cada uma. Quando o pagamento aparecer no extrato, vá em Caixa
> e vincule aquele movimento às despesas que ele pagou.
>
> Se o valor não fechar, ajuste a despesa que estiver com o valor errado. Se a
> diferença for multa, juro ou tarifa, lance como despesa nova e vincule ao
> mesmo pagamento.

## 5-A.5 · O estorno permanece

`estornarAcerto` **continua disponível na aba**, com permissão própria.

É a única operação de escrita que sobra, e ela precisa sobrar: sem o estorno, um
acerto antigo registrado errado fica sem caminho de correção — e o movimento de
caixa dele já existe.

**O que ela faz hoje está correto e não se altera:** devolve cada despesa ao
`statusAnterior` guardado em `acerto_item`, limpa a `data_caixa`, insere um
`cash_entry` de sinal oposto com `cat: "ajuste"`, e marca a flag no acerto,
preservando o registro. É retificação por estorno, no sentido exato da norma.

## 5-A.6 · Diagnóstico antes de exibir o rateio

`rateio_obra` **nunca foi lido**. Exibi-lo na aba é a primeira vez que o dado
sai do banco, e pode revelar que está incompleto ou inconsistente — ninguém
nunca conferiu.

**Entregar antes, somente leitura:** para cada acerto, a soma dos `rateio_obra`
contra o valor transferido, e os acertos sem nenhum rateio gravado.

**Nenhum registro é alterado.**

## 5-A.7 · Permissão

`acerto` **não está em `SCREENS`**, em `permissions.ts` — o que significa que a
tela está aberta ou fechada para todos, sem meio-termo. Ver **BM-1 do Prompt M**.

Como aba de Despesas, ela passa a ser governada pela permissão desta tela. O
estorno exige permissão própria.

## 5-A.8 · Ordem

**A aba entra como consulta somente depois** que a conciliação do **Prompt L**
permitir vincular um pagamento a várias despesas.

Antes disso, tirar o formulário deixa a operação sem caminho para o caso.

---

# 6. REPOSITÓRIO

**6.1 · A duplicação de linhas.** Ver **BS-3**. Se a causa for o join com
`documentos_fiscais`, corrigir a consulta para não multiplicar a linha do
arquivo — e conferir o contador de arquivos da tela.

**6.2 · O limite de tamanho.** Esta tela diz 10 MB, a edição da despesa diz
10 MB, Clientes diz 15 MB e Projetos diz 20 MB. **Quatro telas, três números.**

Conferir o limite real do servidor e exibir o mesmo em todas. Ver a seção de
anexos do `PADRAO-VISUAL.md`.

**6.3 · O que não muda.** Os filtros por obra, tipo, competência e vínculo, a
busca por arquivo, nota, PED ou fornecedor, o contador de "sem vínculo" e o
"Limpar filtros" ficam como estão — é a tela mais bem resolvida em usabilidade
do sistema.

E arquivos sem vínculo continuam aparecendo, com contexto nulo. O comentário do
código está certo: sumir com eles esconderia documento que alguém subiu.

---

# 7. DESEMPENHO E CONTEXTO

**7.1** `getDocuments(ctx.tenant.id)` traz **todos** os documentos do tenant e
filtra em memória, para marcar o clipe na listagem. A assinatura de URL já é
paralela — melhor que a tela de Projetos, que é sequencial. Buscar só os
documentos das despesas em tela.

**7.2** `ctx.projects.find(...) ?? ctx.projects[0]` e
`version?.id ?? ctx.version.id`. O segundo sobrevive apesar do tratamento de
ausência de versão logo acima. Pertence ao **Prompt A**; registrado aqui com
âncora.

---

# 8. ASSISTENTE DE IA

**Já existe, e o desenho está correto.** Não reescrever.

**8.1 · O que se mantém:** a extração de nota, cupom, boleto e comprovante,
inclusive vários arquivos da mesma compra lidos juntos; a marcação de alerta no
campo em que a IA não achou ou ficou em dúvida; e a regra declarada na tela de
que nada é gravado antes da conferência.

**8.2 · O que se acrescenta:** nada de função nova. Apenas garantir que a
validação de tenant e projeto do documento lido aconteça **no servidor**, e que
a auditoria registre que a origem do lançamento foi o assistente.

**8.3 · Usar como referência.** Este é o padrão que os Prompts J, K, M e P
descrevem para as outras telas. Onde houver divergência entre o texto daqueles
prompts e o que está implementado aqui, **o que está aqui vence** — é a versão
que a operação já usa.

---

# 9. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Revisão do `despesa-form` — parcelamento, recorrência, pago por sócio | tarefa própria, depois de BS-1 |
| Cadastro de pagadores terceiros | Prompt T |
| Cadastro de cartões, faturas e extrato | Prompt U |
| Apropriação de despesa em várias competências | não decidido — ver nota no Prompt U |
| Correção da tela de Contas a Pagar | Prompt R |
| Conciliação, dois saldos, ajuste, fechamento diário | Prompt L |
| Saldo real e pendente por parcela | Prompt I, seção 15 · Prompt R |
| Restringir `duplicateVersion` e `importVersionData` | Prompt I, BI-3 |
| Contexto de projeto e versão explícito | Prompt A |
| Rateio entre obras registrado na descrição | ver nota abaixo |
| Retirar da receita da DRE as despesas com categoria "Receita" | **prompt da DRE** |
| Reclassificar o legado do BS-4 | **decisão humana**, via `/diagnostico/categorias-invertidas` |
| A mesma trava em `budget_line` de planejamento | **Prompt D** |
| Acrescentar "Receitas Financeiras" às categorias credoras | pacote de controladoria, RG-07 |

**[NOTA — rateio na observação]** Um lançamento em produção traz na descrição:
*"R$ [valor] obra A - R$ [valor] obra B - R$ [valor] obra C — acerto PED-[número]"*. É um
rateio entre três obras escrito à mão num campo de texto, enquanto o sistema tem
`rateio_obra` e `acerto_item` para isso.

**Investigar se é hábito ou caso isolado.** Se for hábito, o Acerto Contábil não
está cobrindo o que a operação precisa — e isso é diagnóstico, não correção desta
tela.

---

# 10. PRESERVAÇÃO DE DADOS

Nenhuma despesa é alterada, cancelada, reclassificada ou removida por esta
tarefa. Nenhum PED é renumerado. Nenhum `documento_fiscal` é criado, alterado ou
apagado. Nenhum vínculo de conciliação é desfeito.

Migrações, se houver, são aditivas, com `IF NOT EXISTS` e `down`.

---

# 11. NÃO REGRESSÃO

Não altera Contas a Pagar, Caixa, DRE, Fluxo de Caixa, Acerto Contábil,
Restituições nem Medição.

Não altera o cálculo do total da tela, a ordenação por momento de criação, o
destaque de "Último lançamento", a consulta consolidada por tenant, nem a
extração por IA.

---

# 12. TESTES

1. Despesa conciliada recusa alteração de valor, vencimento e competência, com
   mensagem que identifica o movimento vinculado.
2. Despesa conciliada aceita alteração de descrição, fornecedor, conta CEF e
   categoria.
3. Usuário sem permissão de desfazer conciliação recebe mensagem explicando —
   não um erro genérico.
4. Excluir exibe o inventário completo antes de confirmar.
5. Excluir exige digitação do PED.
6. A auditoria da exclusão contém fornecedor, competência, conta, categoria,
   valor e as contagens.
7. Excluir é transacional: falha na auditoria não deixa a despesa apagada.
8. Alterar valor de despesa com pagamento é recusado com mensagem.
9. Não é possível gravar status "Pago" pela edição.
10. Toda action retorna `{ ok, error }`, e a mensagem aparece na tela.
11. Despesa paga por terceiro não gera saída de caixa no lançamento, e cria a
    obrigação.
12. Despesa no cartão não gera saída de caixa e não aparece em Contas a Pagar.
13. O select de pagador oferece apenas quem tem o papel.
14. Duplo clique no lançamento por terceiro cria uma única obrigação.
15. O selo "Sem NF" indica o que falta em cada uma das quatro situações.
15f. O select de categoria não oferece nenhuma categoria credora.
15g. O campo de categoria abre em "Selecione…", não na primeira opção da lista.
15h. Gravar despesa com categoria "Receita" é recusado **na action**, chamada
    direto, sem passar pela tela.
15i. Gravar despesa sem categoria é recusado, com a mensagem própria.
15j. A recusa aparece no campo, com o caminho alternativo — Contas a Receber.
15k. Editar uma despesa legada com categoria credora exige trocar a categoria
    para salvar; abrir sem salvar não altera nada.
15l. Todos os caminhos do inventário de 3-C.3.1 recusam categoria credora —
    testar um a um, inclusive `criarDespesaTerceiro`, a diferença do Acerto e a
    apuração do Ponto.
15m. Planilha de importação com linha de categoria credora é recusada conforme a
    decisão de 3-C.3.2, e nenhuma linha do arquivo é gravada.
15n. `reclassificarDespesas` não aceita categoria credora como destino.
15o. **Antes e depois:** contagem e soma de `despesa` com `categoria_dre =
    'Receita'`. **Nenhuma diferença** — a trava não corrige o passado.
15p. A DRE devolve exatamente os mesmos totais de antes.
12. Despesa com anexo e sem nota mostra clipe e selo com significados distintos.
13. O Repositório não exibe linha duplicada, e o contador confere.
14. O limite de tamanho de arquivo é o mesmo nas quatro telas com anexo.
15. As abas "A Pagar" e "Parcelas" continuam presentes enquanto o Prompt R não
    estiver em produção.
15a. A aba Acertos lista os acertos com os PEDs abatidos, o rateio e o
    movimento de caixa.
15b. A aba Acertos não cria nem edita acerto por nenhum caminho.
15c. O estorno de acerto continua funcionando, exige permissão própria e
    preserva o registro.
15d. A rota `/acerto` não existe mais, e o item saiu do menu.
15e. Nenhum registro de `acerto`, `acerto_item` ou `rateio_obra` foi alterado.
16. **Antes e depois:** contagem de `despesa`, `despesa_parcela`, `pagamento`,
    `documento_fiscal` e `document`, por versão. Nenhuma diferença.
17. **Antes e depois:** total da tela, Contas a Pagar, Caixa, DRE e Fluxo de
    Caixa. Nenhuma diferença.

---

# 13. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado de BS-1: o que a leitura do `despesa-form` encontrou, e o que muda
   nas seções 1 e 3.
2. Resultado de BS-2: quais caminhos de pagamento chamam
   `validarDocumentoAoPagar` e quais não chamam.
3. Resultado de BS-3: quantas despesas têm mais de um documento fiscal, e a
   causa confirmada da duplicação.
3a. Resultado de BS-4: quantas despesas estão classificadas como receita, por
   projeto e versão, com o total envolvido — e a mesma contagem em
   `budget_line`. **Sem reclassificar nenhuma.**
3b. O inventário de 3-C.3.1 — todo caminho que grava `categoria_dre`, com
   arquivo e linha, e qual validava antes desta tarefa.
3c. Decisão de 3-C.3.2 sobre a importação por planilha.
3d. Confirmação de que a regra vive só em `calc/natureza-dre.ts` e não foi
   duplicada em nenhum lugar.
3e. Confirmação de que a DRE devolve os mesmos totais de antes, e a explicação
   de por quê: o legado continua somando até que a conferência o resolva.
4. Diagnóstico de 2.6: exclusões já ocorridas e movimentos de caixa sem vínculo.
5. Decisão do bloqueio menor de 3.2 sobre o status "Pago".
6. Qual é o limite real de tamanho de arquivo, e onde cada tela divergia.
6a. Diagnóstico de 5-A.6 — soma do rateio contra o valor transferido, e acertos
   sem rateio. **Sem corrigir.**
6b. Confirmação de que `estornarAcerto` não foi alterada.
7. Arquivos e componentes alterados.
8. Confirmação de que o padrão de auditoria de `updateDespesa` não foi alterado.
9. Confirmação de que a extração por IA não foi alterada.
10. Comparação antes/depois das tabelas e dos totais.
11. Confirmação de que nenhum item da seção 9 foi tocado.
12. Migrações criadas, com `down`.
13. Limitações encontradas.


<a id="prompt-r"></a>


========================================================================


### ▸ 18 de 42 · PROMPT R — Contas a Pagar

**Bloco 3 · O lançamento** · Bloqueios: BR-1 · BR-2

O saldo da parcela, que AD e AE consomem.

========================================================================


# PROMPT R — CONTAS A PAGAR

Growth Construction · `/contaspagar`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Valores, datas,
status, PEDs e vínculos permanecem como estão. Nenhuma tarefa recalcula,
converte ou "corrige" um lançamento gravado. Se uma alteração exigir tocar em
dado existente: **PARE, não execute, e informe qual dado, por quê, quantos
registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**

---

# ESCOPO

**Nenhuma funcionalidade sai.** Filtros, ordenação por cabeçalho, linhas de
obrigação a terceiros, link de editar para a despesa raiz — tudo permanece.

O trabalho é: listar por vencimento de obrigação, corrigir o pendente, fechar o
escopo de versão, tornar "Vencida" um status de primeira classe, e permitir
seleção múltipla nos filtros.

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

**Verifica permissão** com `can(ctx.perms, "contaspagar", "ver")` e
`AccessDenied` — ao contrário de seis telas do sistema.

**Filtra projeto por id, não por nome**, com o motivo no comentário: obras ou
filiais homônimas colapsariam num filtro só e vazariam dados entre si.

**Separa obrigação de despesa nos totais.** Uma obrigação de restituição não é
despesa nova — a despesa dela já está listada como paga, porque quem pagou o
fornecedor foi o terceiro. Somar as duas em "Total" contaria o mesmo fato duas
vezes. **O raciocínio está certo e deve ser preservado.**

**Ordena por data ISO**, não por string brasileira. É o defeito de ordenação
lexicográfica resolvido aqui — enquanto Contas a Receber ainda ordena no SQL
sobre `text` em `MM/DD/YYYY`.

**A ordenação padrão:** vencidas primeiro, da mais antiga; depois a vencer, da
mais próxima; depois pagas.

**A rolagem é interna**, com `min-width` na tabela e cabeçalho fixo.

---

# ORDEM DE EXECUÇÃO

**Precede o Prompt S** na parte das abas: as abas "A Pagar" e "Parcelas" só saem
da tela de Despesas depois que as seções 1 e 2 daqui estiverem em produção.

Depende da seção 10 do **Prompt I** para o filtro de versão — ou traz a
correção junto, ver seção 3.

---

# BLOQUEIOS

## BR-1 · A sequência de PED pode reemitir número já usado

Não há **`UNIQUE` em `despesa.num_doc`**. A semente de `number_sequence` é
calculada **uma única vez**, no primeiro lançamento; depois disso só incrementa.
E a tela de Numeração permite definir `nextNumber` livremente, para cima ou para
baixo.

Em produção convivem PEDs na faixa `000xxx` e na faixa `026xxx`. Se os da faixa
alta chegaram depois de a sequência existir, ela nunca soube deles.

**O PED é a identidade do lançamento** — a auditoria o registra, o Acerto o
referencia, e há rateio escrito à mão citando PED na observação. Dois
lançamentos com o mesmo número corrompem tudo isso em silêncio.

**Rodar antes de qualquer coisa, somente leitura:**

```sql
SELECT ns.prefix, ns.digits, ns.next_number,
       (SELECT max((regexp_match(num_doc, '(\d+)\s*$'))[1]::bigint)
          FROM despesa d WHERE d.tenant_id = ns.tenant_id) AS maior_usado
  FROM number_sequence ns WHERE ns.entity = 'despesa';

SELECT num_doc, count(*) FROM despesa
 WHERE num_doc IS NOT NULL GROUP BY num_doc HAVING count(*) > 1;
```

Se `next_number` estiver **abaixo** de `maior_usado`, a colisão é iminente.

**Não é desta tela**, mas é dela que o sintoma apareceu. A correção — resemear a
sequência e criar índice único — é tarefa própria, e **a constraint não pode ser
criada antes de a segunda consulta vir vazia**.

## BR-2 · O projeto guarda-chuva é `office` ou `proj`?

"DESPESAS GERAIS MATRIZ" aparece em dezenas de linhas com cliente "Próprio",
que é como a tela exibe `cliente_id` nulo.

O código não responde. Se for `kind = "proj"`, ele **não recebe** nenhum dos
tratamentos de matriz: nem o rótulo "Filial/Matriz", nem a janela de cinco anos
no planejamento, nem a exclusão do custo CEF na importação do realizado.

```sql
SELECT id, name, kind, status, cliente_id, start_date, end_date
  FROM project WHERE name ILIKE '%DESPESAS GERAIS%';
```

**Reportar o resultado.** A decisão de reclassificar, se for o caso, é humana e
não pertence a esta tarefa.

---

# 1. LISTAR POR VENCIMENTO DE OBRIGAÇÃO

**1.1 · O problema.** A tabela tem dez colunas e **nenhuma sobre parcela**. Uma
despesa parcelada em doze aparece como **uma linha, com o valor cheio e um
vencimento só**.

A empresa não deve R$ 12.000 naquele dia: deve R$ 1.000 por mês durante um ano.
Numa tela cujo eixo é o vencimento, isso é o defeito central.

**1.2 · A regra.** A tela passa a listar **por obrigação que vence**:

- Despesa **sem parcelamento** entra com o vencimento do cabeçalho, como hoje.
- Despesa **parcelada** entra com **uma linha por parcela em aberto**, cada uma
  com seu número, seu vencimento e seu saldo.
- Parcela quitada segue o mesmo tratamento das despesas pagas na ordenação
  padrão.

**1.3 · O cheque por parcela.** Número e data do "bom para" passam a aparecer
aqui. Hoje só a aba "Parcelas" da tela de Despesas os exibe — e ela vai sair.

Sem isso, a migração 0038, que criou as colunas de cheque por parcela, volta a
ser dado que ninguém vê.

**1.4 · O link de editar.** Continua levando à **despesa raiz** em `/despesas`,
como hoje. A tela de destino deve deixar claro de qual parcela se veio, senão a
pessoa edita o cabeçalho achando que edita aquela parcela.

**[NOTA]** Vencimento e valor de uma parcela isolada são da parcela, não do
cabeçalho. Se a operação precisa remarcar uma parcela sem mexer nas outras, o
caminho é o editor de parcelas — verificar se ele permite isso hoje e reportar.

**1.5 · As linhas de obrigação a terceiros não mudam.** Elas não têm parcela:
continuam uma linha cada, com o saldo a restituir e o link para Ressarcimentos (`/restituicoes`).

**1.6 · [ACRÉSCIMO] As faturas de cartão entram como obrigação.**

Com o **Prompt U** em produção, a tela ganha um terceiro tipo de linha, ao lado
das despesas e das obrigações com terceiros.

**A obrigação é a fatura — nunca as compras.** Compra vinculada a uma fatura
**não aparece** aqui; quem aparece é a fatura, pelo total, no vencimento dela.
Se as duas aparecessem, o mesmo dinheiro seria cobrado duas vezes.

**Fatura aberta também aparece**, no seu dia de vencimento, como obrigação
**prevista** — com o valor acumulado até o momento, que ainda vai crescer.

Sem isso, quem olha a tela no dia 20 não vê a fatura que vence no dia 5 do mês
seguinte, e planeja caixa sem a obrigação mais próxima.

| Estado | Selo | O valor |
|---|---|---|
| Fechada | firme | não muda mais |
| Aberta | **prevista** | cresce conforme as compras entram |

**O valor da fatura aberta não inclui a estimativa de juros do rotativo** — ela
é projeção e fica na tela do cartão. Levar palpite para Contas a Pagar seria
apresentá-lo como obrigação.

**1.7 · O link de editar da fatura** leva à tela de Cartões, não a `/despesas` —
a fatura não é despesa. As compras dentro dela, sim, levam ao lançamento raiz.

---

# 2. PENDENTE PASSA A SER SALDO

**2.1 · O problema.** O cálculo é
`filtered.filter(r => r.status !== "Pago").reduce((a, r) => a + r.valor, 0)`.

O valor somado é `r.valor` — o valor da despesa, vindo de `Number(r.d.valor)`.
**Não há consulta a `despesa_parcela` nem a `pagamento` em nenhum ponto desta
tela.**

Duas consequências: despesa **parcialmente paga entra inteira**, e despesa
parcelada entra pelo total mesmo que onze parcelas vençam no ano seguinte.

**2.2 · A correção.** "Pendente" passa a somar **saldo**: valor da obrigação
menos o que já foi pago dela. Com a listagem da seção 1, isso é natural — o
saldo da parcela, não o valor original da despesa.

**2.3 · Helper compartilhado.** O cálculo de saldo a pagar vira função única,
usada também por Dashboard, Fechamento e Caixa. É a seção 15 do Prompt I.

**Fórmulas diferentes para o mesmo conceito em telas diferentes é como os
números deixam de bater sem ninguém perceber.**

**2.4 · "Total" diz o que é.** Hoje soma pagas e a pagar, e o rótulo sugere
"quanto tenho a pagar". Renomear para algo que descreva — "Total lançado no
filtro" — ou separar em lançado e em aberto.

**2.4.1 · [ACRÉSCIMO] O previsto aparece destacado dentro do em aberto.**

Fatura aberta **soma** no total em aberto — é obrigação real, com data. Mas o
usuário precisa saber que parte daquele número ainda vai crescer.

Exibir no formato: *em aberto R$ 90.000, sendo R$ 10.000 em fatura ainda
aberta*. Assim o total serve para planejar caixa, e ninguém é surpreendido pelo
crescimento.

**2.5 · Isto muda número em produção.** Reportar antes: o pendente atual, o
pendente pela regra nova, e a diferença por projeto. A queda é a correção.

---

# 3. ESCOPO DE VERSÃO

**3.1 · A regra do negócio.** *Contas a Pagar é exclusivamente versão Atual. O
lançamento e a edição acontecem na tela de Despesas; esta tela é consulta e
operação de pagamento, não cadastro.*

**3.2** `getContasPagar` filtra tenant e `cancelado = false`. **Não filtra
versão.** Despesa existente em Budget ou Forecast entra como obrigação real.

Acrescentar o filtro por `version.kind = "atual"` — o join com `versions` já
existe na consulta.

**3.3 · Reportar antes de aplicar:** quantas despesas existem em versões que não
são Atual, e o valor envolvido. É o item A do diagnóstico da seção 43 do
Prompt I.

**[NOTA]** As duas actions que gravam despesa em versão de planejamento —
`duplicateVersion` e `importVersionData` — são restringidas pelo **BI-3 do
Prompt I**, já decidido. Sem aquela correção, o problema volta a aparecer.

---

# 4. "VENCIDA" COMO STATUS DE PRIMEIRA CLASSE

**4.1 · O problema.** "Vencida" é derivado por `displayStatus` e **nunca existe
no banco**. As opções do filtro vêm de `uniq(rows.map(r => r.status))` — o
status **gravado**. Então:

a coluna **mostra** "Vencida" · a ordenação **usa** "Vencida" · o filtro **não a
oferece**, e comparar `r.status !== status` nunca a encontraria.

**4.2 · A correção.** Uma função única de status exibido, usada por **exibição,
filtro, ordenação e contadores**. "Vencida" entra na lista de opções do filtro
como qualquer outro valor.

Continua **derivada**, sem ser gravada no banco — o Prompt I, seção 16, já
define isso. O que muda é que tudo na tela passa a enxergar o mesmo valor.

**4.3 · Vermelho com alerta.** A linha vencida ganha destaque: selo vermelho com
ícone de alerta, e um indicador discreto na própria linha. O tom já é `danger`;
falta o ícone e a evidência.

**4.4 · Contador no topo.** Ao lado de "Pendente", quantas contas estão vencidas
e qual o total — é o número que decide o dia de quem opera.

**4.5 · A data de hoje vem do servidor.** `hojeISO` é montado com `new Date()`
**no navegador**. Máquina com data errada, ou usuário em outro fuso, vê conjunto
diferente de vencidas. Passar a data do servidor como propriedade.

**4.6 · "Parcialmente paga" precisa de critério único.** Hoje `displayStatus` a
devolve intacta — nunca vira "Vencida" — enquanto o agrupamento da ordenação a
trata como não paga. Três critérios para o mesmo conceito na mesma tela.

**Decidir:** parcialmente paga com vencimento passado é vencida? Recomendação:
sim, com o saldo em aberto — é o que está devendo.

---

# 5. FILTROS COM SELEÇÃO MÚLTIPLA

**5.1** Os filtros de **fornecedor, cliente, projeto, categoria e status**
passam a aceitar **mais de um valor**, por caixa de seleção.

Marcar dois fornecedores lista os dois. Nenhum marcado continua significando
todos, como hoje.

**5.2 · Comportamento.** Campo fechado exibe o resumo — "3 selecionados", ou o
nome quando for um só. Aberto, lista com caixinha, busca quando houver muitos
itens, e as ações de marcar e desmarcar todos.

**5.3 · Entre filtros, continua "e".** Fornecedor A ou B, **e** projeto X ou Y.
Dentro de um filtro é "ou"; entre filtros é "e". É o comportamento que as
pessoas esperam de planilha.

**5.4 · Os filtros de data não mudam** — continuam intervalo de vencimento.

**5.5 · "Limpar filtros" limpa tudo**, como hoje.

**5.6 · Os totais continuam respeitando o filtro ativo.** É assim hoje e deve
continuar: os três indicadores operam sobre o conjunto filtrado, não sobre a
base inteira.

**5.7 · Acessibilidade.** Navegável por teclado, com o estado de cada caixa
anunciado. A seleção múltipla não pode exigir mouse.

---

# 6. INTERFACE

**6.1 · Fixar a coluna de identificação.** A tabela tem `min-width: 1200px` e
rola internamente — o que já é melhor que o resto do sistema. Falta fixar
**Fornecedor** à esquerda, para não se perder ao rolar até o valor e o
vencimento.

**6.2 · A coluna Descrição mostra o PED quando não há observação** — é o
fallback `r.d.obs ?? r.d.numDoc`. Não é dado errado, mas ocupa a coluna mais
larga repetindo o que já está ao lado. Exibir estado vazio quando não houver
observação.

**6.3 · Voltar a exibir eyebrow e subtítulo.** O `PageHeader` descarta as duas
props. Aqui o subtítulo explica os filtros e a ordenação por cabeçalho — é ajuda
que nunca chegou ao usuário. Mesma correção pedida nos Prompts B, J, M, N e S.

**6.4** Segue `PADRAO-VISUAL.md`.

---

# 7. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Resemear a sequência de PED e criar índice único | tarefa própria, depois de BR-1 |
| Reclassificar o projeto guarda-chuva | decisão humana, depois de BR-2 |
| Restringir `duplicateVersion` e `importVersionData` | Prompt I, BI-3 |
| Remover as abas "A Pagar" e "Parcelas" | Prompt S, seção 5 |
| Conciliação, dois saldos e ajuste | Prompt L |
| Cadastro de cartões, ciclo, extrato e rotativo | Prompt U |
| Editar despesa, cancelar, excluir | Prompt S |
| Contexto de projeto explícito | Prompt A |

---

# 8. PRESERVAÇÃO DE DADOS

Esta tela é **somente leitura** e continua sendo: nenhuma escrita, nenhuma
action nova. Nenhuma despesa, parcela, pagamento ou obrigação é alterada.

Nenhum status é gravado — "Vencida" continua derivada.

Migrações, se houver, são aditivas com `IF NOT EXISTS` e `down`.

---

# 9. NÃO REGRESSÃO

`getContasPagar` também alimenta **Dashboard**, **Fechamento de Caixa** e a
conciliação do extrato. Qualquer alteração nela atinge as três.

**Reportar o efeito em cada uma antes de aplicar**, e confirmar nos testes que
nenhuma mudou de comportamento além do escopo declarado.

Não altera o link de editar, a separação entre despesa e obrigação nos totais, a
ordenação padrão, nem o filtro de projeto por id.

---

# 10. TESTES

1. Despesa parcelada aparece com uma linha por parcela em aberto, cada uma com
   seu vencimento e saldo.
2. Despesa sem parcelamento aparece como uma linha, como hoje.
3. Cheque por parcela — número e "bom para" — aparece na tela.
4. "Pendente" soma saldo, não valor cheio: despesa de R$ 100 com R$ 80 pagos
   entra com R$ 20.
5. Despesa parcelada não soma no pendente as parcelas que vencem fora do
   período filtrado.
6. Despesa em versão Budget ou Forecast não aparece.
7. "Vencida" aparece como opção do filtro e filtra corretamente.
8. Exibição, filtro, ordenação e contadores usam o mesmo valor de status.
9. Linha vencida tem selo vermelho com ícone e destaque na linha.
10. O contador de vencidas do topo confere com a lista filtrada.
11. Mudar o relógio do navegador **não** altera o conjunto de vencidas.
12. Marcar dois fornecedores lista os dois.
13. Fornecedor A ou B **e** projeto X: a interseção, não a união.
14. Nenhum item marcado equivale a todos.
15. Seleção múltipla funciona só com teclado.
16. Os três indicadores respeitam o filtro ativo.
17. Coluna Fornecedor permanece fixa ao rolar horizontalmente.
18. Linhas de obrigação a terceiros continuam com o saldo e o link para
    Restituições.
18a. Fatura de cartão aparece como uma linha; as compras dentro dela, não.
18b. Fatura aberta aparece no dia de vencimento, marcada como prevista.
18c. O total em aberto informa, destacado, quanto vem de fatura ainda aberta.
18d. O valor da fatura aberta não inclui estimativa de juros.
18e. O link de editar da fatura leva à tela de Cartões.
19. Dashboard, Fechamento e conciliação continuam com os mesmos números.
20. **Antes e depois:** nenhuma escrita no banco. Contagem e conteúdo de
    `despesa`, `despesa_parcela` e `pagamento` idênticos.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado de BR-1: onde a sequência está, qual o maior PED usado, e se há
   número repetido.
2. Resultado de BR-2: o `kind` do projeto guarda-chuva.
3. Quantas despesas existiam em versões não-Atual, e o valor.
4. Pendente antes e depois, por projeto, com a diferença explicada.
5. Como o saldo a pagar foi calculado, e onde o helper vive.
6. Como a função única de status foi implementada, e onde é usada.
7. Efeito da alteração de `getContasPagar` em Dashboard, Fechamento e
   conciliação.
8. Como a seleção múltipla foi implementada, e como se comporta no teclado.
9. Confirmação de que a tela continua sem escrita.
10. Confirmação de que nenhum item da seção 7 foi tocado.
11. Migrações criadas, com `down`.
12. Limitações encontradas.


<a id="prompt-t"></a>


========================================================================


### ▸ 19 de 42 · PROMPT T — Ressarcimentos

**Bloco 3 · O lançamento** · Bloqueios: BT-1 · BT-2

RG-04.

========================================================================


# PROMPT T — RESSARCIMENTOS E PAGADORES TERCEIROS

Growth Construction · `/restituicoes`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Obrigações,
restituições, compensações, valores e vínculos existentes permanecem como estão.
Se uma alteração exigir tocar em dado existente: **PARE, não execute, e informe
qual dado, por quê, quantos registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**

---

# 0. A TELA MUDA DE NOME

**"Restituições" passa a se chamar "Ressarcimentos"**, no título e no menu.

Ressarcimento é devolver a alguém o que essa pessoa gastou por você — que é o
que a tela faz. "Restituição", no vocabulário brasileiro corrente, remete a
imposto de renda.

**Nada de nome interno muda.** Rota `/restituicoes`, tabelas `restituicao`,
`restituicao_item` e `despesa_terceiro`, e as actions `registrarRestituicao`,
`cancelarRestituicao`, `previewRestituicaoLote` e `confirmarRestituicaoLote`
permanecem exatamente como estão.

**[NOTA]** O status gravado continua `"Aguardando restituição"`, exibido como
"Pendente" por `rotuloStatusObrigacao` — a função troca o texto sem
reclassificar o banco, e isso não muda. **Nenhum registro é reescrito.**

Os rótulos visíveis na tela acompanham o nome novo: "Ressarcimento em lote",
"Registrar ressarcimento", "a ressarcir". Os títulos de coluna e os textos de
ajuda idem.

---

# A REFORMULAÇÃO

**A tela deixa de lançar despesa.** Toda despesa é lançada em `/despesas`. Lá o
usuário escolhe a forma de pagamento, e uma delas é **pago por terceiro** —
ver **Prompt S, seção 3-B**.

Esta tela passa a ter **duas funções**:

1. **Cadastro de pagadores terceiros** — quem pode pagar pela empresa.
2. **Controle das restituições** — o que cada um desembolsou, o que já foi
   devolvido, o saldo, e o extrato de cada movimento.

As despesas pagas por terceiro **aparecem aqui**, mas foram lançadas lá.

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

Esta é a tela mais bem construída do sistema. Listar o que se preserva importa
mais aqui que em qualquer outra, porque o risco é "melhorar" o que está bom.

**Idempotência de verdade.** Chave por tentativa, renovada só após sucesso;
colisão de índice tratada como sucesso e não como erro; `SELECT ... FOR UPDATE`
serializando restituições concorrentes sobre a mesma obrigação.

**A conciliação não duplica caixa.** Restituição com `cashEntryId` marca o
movimento do extrato em vez de criar saída nova. E no cancelamento, a mesma
distinção: veio do extrato, desfaz a conciliação; foi criada pelo sistema,
lança estorno. O comentário explica: lançar estorno num movimento do extrato
inventaria uma entrada que nunca aconteceu no banco.

**O vínculo por PED preserva o lançamento.** Valor, competência, vencimento,
categoria, fornecedor e número ficam desabilitados na tela e intocados no
servidor. A única marcação é `pagoPorTerceiro`.

**`rotuloStatusObrigacao`** troca o texto na tela sem reclassificar o banco, e
devolve status desconhecido como veio.

**A compensação** grava os saldos brutos de antes, não lança caixa, e registra
no log `impactoDre: 0, impactoCaixa: 0`.

**Os saldos são exibidos brutos**, com o motivo documentado: exibir só o líquido
esconderia a dimensão real de cada obrigação.

---

# ORDEM DE EXECUÇÃO

**Par com o Prompt S, seção 3-B.** O formulário sai daqui e o campo de forma de
pagamento entra lá. **Ir juntos** — ou a tela fica sem porta de entrada, ou
existem duas.

---

# BLOQUEIOS

## BT-1 · O papel de pagador — RESOLVIDO

**O cadastro fica em `stakeholder`**, e esta tela é o **único lugar** que
concede e retira o papel de pagador terceiro.

Motivo: um mestre de obra pode prestar serviço à empresa **e** fazer compras por
ela. Cadastro separado faria a mesma pessoa existir duas vezes, sem nenhuma tela
capaz de dizer que são a mesma.

**Confirmado no código:** `papeis` é **`text[]` nativo do Postgres**, desde a
primeira migração — não é JSON em texto nem lista separada por vírgula.
Múltiplos papéis por cadastro já funcionam em produção.

**O papel novo chama-se "Pagador por Terceiro"** e é criado pelo **Prompt W**,
que é dono da lista `PAPEIS_STAKEHOLDER`. **Par obrigatório** — sem ele, esta
tela não tem quem oferecer.

**[NOTA — por que não reusar "Sócio/Quotista"]** Esse é hoje o único papel que
governa comportamento: `getSocios` o usa para o seletor de "despesa paga por
sócio". Mas quem desembolsa pela empresa nem sempre é sócio, e usar o papel
societário para isso mistura duas coisas. Uma pessoa pode ter os dois.

**Nenhum `papeis` existente é reescrito.** Quem já tem obrigação lançada — os
pagadores que hoje aparecem na conta corrente — recebe o papel por decisão
humana, item a item, com prévia. **Nunca por script.**

## BT-2 · Dados de recebimento — DECIDIDO

O cadastro ganha **dados bancários e chave PIX**. Restituir é transferir, e hoje
o dado não existe em lugar nenhum — quem faz a transferência procura fora do
sistema.

Colunas novas e **aditivas** em `stakeholder`: banco, agência, conta, tipo de
conta, titular quando diferente do cadastro, tipo de chave PIX e a chave.

**[NOTA — dado sensível]** A chave PIX pode ser CPF, e conta bancária de pessoa
física é dado pessoal. Esses campos seguem a mesma regra da tela de Clientes:
visíveis a quem tem permissão de ver a tela, **nunca enviados ao assistente**,
e **nunca gravados em claro no `audit_log`** — a auditoria registra que o campo
mudou, não o valor.

---

# 1. CADASTRO DE PAGADORES

**1.1** Bloco próprio na tela, com a lista de quem tem o papel de pagador
terceiro, e o formulário de cadastro.

**1.2** Cadastrar um pagador que já existe como fornecedor **acrescenta o
papel**, não cria registro novo. A tela avisa que a pessoa já está cadastrada e
mostra os papéis atuais.

**1.3** Retirar o papel é possível **enquanto não houver obrigação** vinculada.
Com obrigação, a tentativa explica por quê e oferece inativar em vez de retirar.

**1.4** O select "Quem desembolsou", onde quer que apareça — inclusive na tela
de Despesas —, passa a oferecer **apenas quem tem o papel**. Hoje oferece a
lista inteira de `stakeholder`.

**[NOTA]** O filtro deve seguir o comportamento de `getSocios`, que exige
`ativo` — e não o de `getStakeholders`, que não filtra. Ver **Prompt W, seção
4**: hoje inativar um cadastro não o remove de nenhum seletor além do de sócios.

**1.5** Auditoria em conceder e retirar papel, com nome e documento.

---

# 2. O FORMULÁRIO DE DESPESA SAI

**2.1** O bloco "Nova despesa paga por terceiro" é removido desta tela, junto
com o modo de `criarDespesaTerceiro` que **cria despesa e obrigação juntas**.

**2.2 · O modo de vínculo por PED permanece**, e passa a ser o único caminho
desta tela — serve para regularizar lançamento antigo que foi pago por terceiro
e não foi marcado como tal.

Renomear o bloco para algo como "Vincular lançamento existente a um pagador".

**2.3 · A obrigação passa a nascer no lançamento da despesa.** Quando o usuário
escolher "pago por terceiro" em `/despesas`, a action de lá cria a obrigação —
reaproveitando a lógica que já existe aqui, não reescrevendo.

**[NOTA]** O que a action faz hoje no modo "despesa nova" — reservar PED, criar
despesa com `pagoPorTerceiro: true`, criar a obrigação, tudo em uma transação
com idempotência — é exatamente o que a tela de Despesas precisará. **Mover, não
reimplementar.**

---

# 2-A. AGING VISÍVEL

**2-A.1 · O problema.** O cálculo de faixas etárias **já existe** — o preview da
restituição em lote exibe até 30, 31 a 60, 61 a 90 e acima de 90.

Mas ele só aparece **depois** de escolher um terceiro e digitar um valor. Fora
dali, o número não existe em lugar nenhum.

**2-A.2 · A correção.** As faixas passam a aparecer na **conta corrente**, por
terceiro, ao lado do saldo devido. E o total do topo ganha a mesma quebra.

Isso transforma *"devemos R$ Y ao sócio B"* em *"devemos R$ Y, e
R$ X estão abertos há mais de noventa dias"* — que é a informação que leva
alguém a agir.

**2-A.3 · A data-base é a mesma da coluna Dias:** previsão de restituição, com
fallback para a data do desembolso. Ver seção 8.

**2-A.4 · Reaproveitar o cálculo**, não reimplementar. Ele vive no caminho do
preview do lote; extrair para função compartilhada e usar nos dois lugares.

**2-A.5 · Por que isto importa.** O saldo com terceiros é **passivo da empresa
com pessoas físicas**. Saldo que envelhece deixa de ser controle financeiro e
vira discussão societária — e, depois de muito tempo, discussão fiscal:
desembolso de sócio não restituído tende a ser reclassificado como aporte ou
como distribuição disfarçada.

O aging é o indicador que existe para que isso não aconteça por descuido.

**[NOTA]** Toda restituição precisa de documento em nome da empresa para o custo
ser dedutível e para servir à prestação de contas do financiamento. **Isso não é
correção desta tarefa** — é o que a tela de Despesas já trata pela RG-06, com o
selo de pendência de nota. Registrado aqui como contexto, não como escopo.

---

# 3. ESTORNO PRESERVANDO O DOCUMENTO

**3.1 · O problema.** `cancelarRestituicao` faz
`tx.delete(schema.restituicoes)` — **exclusão física**. O documento que foi para
a contabilidade como comprovação da saída de caixa deixa de existir. Resta o
`audit_log`, que guarda id e valor, não o documento.

**3.2 · A correção.** Cancelamento lógico, no padrão que o **Acerto Contábil**
já usa: flag `estornado`, data, autor e motivo. O registro permanece legível,
sai dos saldos, e a lista o exibe com o status.

Migração aditiva. **Nenhuma restituição existente é alterada** — todas nascem
não estornadas, que é o comportamento de hoje.

**3.3 · A compensação de caixa não muda.** A distinção entre movimento do
extrato e movimento criado pelo sistema está correta e se preserva.

**[NOTA]** Restituições já apagadas não são recuperáveis. A correção vale para
o comportamento futuro.

---

# 4. O ESTORNO EM LOTE PRECISA LER `restituicao_item`

**4.1 · O problema.** A restituição em lote grava `restituicao_item` com quanto
foi para cada PED. **O cancelamento não lê essa tabela** — devolve o valor
inteiro à obrigação de `rest.despesaTerceiroId`, a âncora.

Cancelar uma restituição de R$ 100 que abateu R$ 30 de um PED e R$ 70 de outro
**devolve R$ 100 ao primeiro**. O primeiro fica com saldo maior que o devido; o
segundo continua abatido.

**4.2 · A correção.** O estorno reconstrói os abatimentos a partir de
`restituicao_item`, devolvendo a cada obrigação exatamente o `valorAbatido` que
ela recebeu, e recalculando o status de cada uma.

**4.3 · Diagnóstico, somente leitura.** Listar restituições já canceladas que
tinham mais de um item, e as obrigações cujo `valorRestituido` ficou
inconsistente com a soma dos itens. **Nenhum registro é alterado** — a correção
de dado histórico é decisão humana, item a item.

---

# 5. A BUSCA POR PED NÃO PODE PROCURAR NA OBSERVAÇÃO

**5.1 · O problema.** `buscarDespesasPorPed` faz
`or(ilike(numDoc, ...), ilike(obs, ...))`. O comentário diz que é para permitir
colar só o número — mas `obs` é a descrição da compra.

Digitar "100" traz toda despesa cuja observação contenha 100, inclusive valores.
Há em produção um lançamento com `"R$ [valor] obra A - R$ [valor] obra B - R$ [valor]
obra C — acerto PED-[número]"` na observação: ele aparece em busca por qualquer
um desses números.

**O usuário escolhe o PED errado e a obrigação é amarrada ao lançamento
errado.**

**5.2 · A correção.** Buscar apenas em `numDoc`, normalizando a entrada: aceitar
`"123"`, `"000123"` e `"PED-000123"` como a mesma busca, comparando o sufixo
numérico. **Não buscar em `obs`.**

---

# 6. ESCOPO DA LISTA

**6.1 · O problema.** `getDespesaTerceiros` filtra por `ctx.version.id`, mas a
conta corrente do card acima é **tenant** — e o comentário explica por quê: a
dívida com um sócio é da empresa e não some porque o usuário trocou de projeto.

Os dois convivem na mesma tela. O total do topo pode não fechar com a soma da
lista abaixo.

**6.2 · A correção.** A lista passa a ser **tenant**, como a conta corrente, com
filtro por projeto disponível ao usuário. O escopo deixa de ser implícito.

**6.3 · Isto muda o que a tela mostra.** Reportar antes: quantas obrigações
existem fora da versão ativa, e o valor.

---

# 7. A COMPENSAÇÃO PRECISA SER VISÍVEL

**7.1 · O problema.** A tabela `compensacao` é gravada e **nenhuma consulta do
repositório a lê de volta**. O rastro visível é o texto "Compensado em PED-xxxx"
concatenado no `obs` das obrigações.

O documento existe, tem número, guarda os saldos brutos de antes — e ninguém
consegue vê-lo.

**7.2 · A correção.** Lista de compensações na tela, com data, terceiro, valor,
os dois saldos de antes e o número do documento.

**7.3 · O número da compensação vem da sequência de despesas.**
`compensarSaldos` chama `reserveDespesaNumber`, então cada compensação consome
um PED sem que exista despesa. Reportar quantos PEDs foram consumidos assim.

**[NOTA]** Isto conversa com o **BR-1 do Prompt R**, sobre a sequência de PED.
Sequência própria para compensação é a solução, mas é decisão — e **nenhum
número já emitido é alterado**.

---

# 8. A COLUNA DIAS

**8.1** `Math.max(0, …)` achata previsão futura em zero. O `0` na tela significa
três coisas: data-base ausente, data futura, ou hoje.

**8.2 · A correção.** Distinguir: dias em atraso quando a previsão já passou,
dias a vencer quando é futura, e estado vazio quando não há previsão.

---

# 9. RETORNO LEGÍVEL

`cancelarRestituicao` lança erro em vez de retornar `{ ok, error }` — ao
contrário das demais actions do arquivo, que já retornam. Padronizar.

**[NOTA]** Não localizei onde a tela a chama. Reportar se existe caminho de
interface para cancelar restituição, ou se ela é código sem porta.

---

# 10. ASSISTENTE DE IA

Segue o **Prompt E**. **Somente leitura** — esta tela opera dinheiro, e nenhuma
das operações é adequada a gravação assistida.

**Ações:**

- **Aging por terceiro** — quanto está aberto há mais de 30, 60 e 90 dias. O
  cálculo já existe no preview do lote; falta existir fora dele.
- **Encontro de contas disponível** — terceiros com saldo nos dois lados que
  ainda não compensaram.
- **Conferir obrigações** — sem previsão de restituição, sem pagador
  identificado, ou com saldo negativo (restituído a mais que o devido).
- **Concentração** — quem representa a maior parte do saldo devido.

**Nunca:** registrar restituição, compensar, cancelar, ou conceder papel de
pagador.

---

# 11. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Campo de forma de pagamento no lançamento | Prompt S, seção 3-B |
| Cartões de crédito | Prompt U |
| Sequência de PED e índice único | tarefa própria, depois do BR-1 do Prompt R |
| Criar o papel, validar documento, fechar a exclusão de cadastro | **Prompt W** |
| Conciliação e dois saldos | Prompt L |
| Contexto de projeto explícito | Prompt A |

---

# 12. PRESERVAÇÃO DE DADOS

Nenhuma obrigação, restituição, compensação ou `restituicao_item` é alterada,
estornada ou removida. Nenhum `papeis` de `stakeholder` é reescrito. Nenhum
`valorRestituido` é recalculado.

Migrações — flag de estorno em `restituicao`, e eventuais colunas de BT-2 — são
aditivas, com `IF NOT EXISTS` e `down`.

---

# 13. TESTES

1. O formulário de nova despesa não existe mais nesta tela.
2. Vincular lançamento existente por PED continua funcionando, sem sobrescrever
   nada do lançamento.
3. Buscar "100" não traz despesa cuja observação contenha 100.
4. Buscar "123", "000123" e "PED-000123" traz o mesmo lançamento.
5. O select de pagador oferece apenas quem tem o papel.
6. Conceder papel a quem já é fornecedor não cria registro novo.
7. Retirar papel de quem tem obrigação é bloqueado com explicação.
8. Cancelar restituição preserva o registro, com autor e motivo.
9. Cancelar restituição em lote devolve a cada PED exatamente o que ele
   recebeu.
10. A lista e a conta corrente mostram o mesmo conjunto de obrigações.
11. A lista de compensações exibe os documentos gravados.
12. A coluna Dias distingue atraso, a vencer e sem previsão.
12a. As faixas de aging aparecem na conta corrente, por terceiro, e o total do
    topo traz a mesma quebra.
12b. As faixas da conta corrente batem com as do preview do lote — mesmo
    cálculo, mesma data-base.
12c. Dados bancários e chave PIX não aparecem no `audit_log` em claro.
12d. Dados bancários e chave PIX não são enviados ao assistente.
13. Idempotência continua funcionando: duplo clique registra uma restituição.
14. Restituição conciliada com extrato não cria saída de caixa nova.
15. Assistente não grava nada.
16. **Antes e depois:** contagem e conteúdo de `despesa_terceiro`,
    `restituicao`, `restituicao_item` e `compensacao`. Nenhuma diferença.

---

# 14. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado de BT-1: formato real de `stakeholder.papeis` e valores existentes.
2. Como os dados de recebimento foram acrescentados, e como foram mantidos fora
   do log e do contexto do assistente.
2a. Onde o cálculo de aging passou a viver, e confirmação de que é o mesmo nos
   dois lugares.
3. Diagnóstico de 4.3 — restituições canceladas com mais de um item, e saldos
   inconsistentes. **Sem corrigir.**
4. Quantas obrigações existiam fora da versão ativa.
5. Quantos PEDs foram consumidos por compensações.
6. Como a lógica de criar obrigação foi movida para a tela de Despesas, e
   confirmação de que não foi reimplementada.
7. Confirmação de que idempotência, `FOR UPDATE` e a distinção de caixa na
   conciliação não foram alterados.
8. Se `cancelarRestituicao` tem porta de interface.
9. Comparação antes/depois das quatro tabelas.
10. Migrações criadas, com `down`.
11. Limitações encontradas.


<a id="prompt-u"></a>


========================================================================


### ▸ 20 de 42 · PROMPT U — Cartões de Crédito

**Bloco 3 · O lançamento** · Bloqueios: BU-1 · BU-2 · BU-3

Tela nova. Par com S, seção 3-B.

========================================================================


# PROMPT U — CARTÕES DE CRÉDITO

Growth Construction · tela nova, rota sugerida `/cartoes`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Esta tarefa cria
estrutura nova e **não toca em despesa, parcela, pagamento ou caixa já
gravados.**

**2 · Nada vindo de mockup entra no código.**

---

# O MODELO — LER ANTES DE QUALQUER CÓDIGO

Quatro fatos distintos, na ordem em que acontecem:

**1 · A compra** é despesa comum, lançada em `/despesas`, com **competência
informada pelo usuário**. Entra na DRE uma vez, nessa competência. A forma de
pagamento é o cartão.

**2 · Nenhuma saída de caixa acontece na compra.** A despesa não é paga — fica
vinculada a uma fatura.

**3 · A fatura** agrupa as compras de um ciclo de fechamento. Tem data de
fechamento, data de vencimento e valor, que é a soma das compras vinculadas.

**4 · A saída de caixa** é o pagamento da fatura, na data de vencimento, pelo
valor da fatura.

## A regra da não-duplicidade

Duas frases. Tudo o mais deriva delas.

**Em Contas a Pagar, a obrigação é a FATURA — nunca as compras individuais.**
Compra vinculada a fatura sai da lista de obrigações; quem fica é a fatura.
Se as duas aparecerem, o mesmo dinheiro é cobrado duas vezes.

**Na DRE, a despesa é a COMPRA — nunca a fatura.** A fatura é movimento
financeiro, não fato econômico. Se ela entrar na DRE, o custo aparece duas
vezes: na competência da compra e na do pagamento.

**O pagamento da fatura não cria despesa.** É o mesmo raciocínio da RG-04, que a
tela de Ressarcimentos já aplica: a despesa foi reconhecida na competência dela; o
pagamento é só a saída de caixa.

---

# ESCOPO

**Esta tela não lança despesa.** Cadastro de cartões, controle das faturas,
projeção da próxima, e conferência contra o extrato do cartão.

O lançamento acontece em `/despesas` — ver **Prompt S, seção 3-B**.

---

# ORDEM DE EXECUÇÃO

**Par com o Prompt S, seção 3-B.** Sem o campo de forma de pagamento lá, esta
tela não recebe compra alguma.

Precede o **Prompt R** na parte da fatura como obrigação — ou vai junto.

---

# BLOQUEIOS

## BU-1 · Reaproveitar o mecanismo de "pago por terceiro"?

Cartão e terceiro têm **a mesma estrutura**: despesa reconhecida na competência,
obrigação com um credor, e uma saída de caixa cobrindo várias despesas.

E o pagamento da fatura é exatamente o que a **restituição em lote** já faz —
valor único distribuído entre vários lançamentos, com preview antes de gravar,
idempotência e `FOR UPDATE`.

**Escolher uma:**

1. **Reaproveitar.** A fatura é uma obrigação como a do terceiro, com o credor
   sendo a operadora. Menos código, e herda a idempotência e o preview que já
   funcionam.
2. **Estrutura própria.** Fatura tem ciclo, fechamento, vencimento, limite e
   rotativo — coisas que a obrigação com terceiro não tem. Mais claro, mais
   código.

Recomendação: a **2** para a fatura, **reaproveitando o padrão** de preview,
idempotência e `FOR UPDATE` do lote. Copiar o padrão, não a tabela.

## BU-2 · Compra sem lançamento no sistema

O extrato vai trazer compras que ninguém lançou. **O que a tela faz?**

1. **Só aponta.** Lista as divergências; o lançamento acontece em `/despesas`.
2. **Propõe.** O assistente monta a despesa e o usuário confirma em `/despesas`.

Recomendação: a **2** — respeita a regra de que lançamento é lá, e não obriga
a redigitar o que o extrato já traz.

**Em nenhum caso o extrato grava despesa diretamente.**

## BU-3 · Rotativo — a taxa vem de onde?

A projeção do juro precisa de uma taxa. **Responder:** ela é cadastrada por
cartão, informada a cada fatura, ou lida do extrato?

Enquanto não houver definição, a tela **não projeta juro** — mostra o saldo
remanescente sem estimativa. **Não inventar taxa.**

---

# 1. CADASTRO DE CARTÕES

**1.1 · Tabela nova**, aditiva. `bank_account` não serve: não tem bandeira,
ciclo, limite nem vínculo com a conta que debita.

**1.2 · Campos:** apelido, bandeira, últimos quatro dígitos, titular, limite,
**dia de fechamento**, **dia de vencimento**, conta bancária que debita a
fatura, taxa de rotativo conforme BU-3, e ativo.

**[NOTA]** Guardar **apenas os quatro últimos dígitos**. Número completo de
cartão não é armazenado em nenhuma hipótese.

**1.3 · Lista** com os cartões, o limite, o usado no ciclo aberto e o
disponível.

**1.4 · Inativar em vez de excluir** quando houver fatura ou compra vinculada.

---

# 2. A FATURA

**2.1 · Como a compra cai numa fatura.** Pela data da compra e pelo dia de
fechamento: compra **até** o fechamento entra na fatura que fecha naquele dia;
compra **depois** entra na seguinte.

**2.2 · O vencimento do ciclo.** Vem do dia de vencimento do cartão.

**[NOTA — borda que quebra o cálculo ingênuo]** Quando o dia de vencimento é
**menor** que o de fechamento — fecha dia 28, vence dia 5 —, o vencimento é do
**mês seguinte**. É configuração comum e precisa de teste próprio.

**2.3 · Compra parcelada.** A primeira parcela segue a regra de 2.1; as demais
caem nas faturas subsequentes, **uma por ciclo**.

A estrutura de `despesa_parcela` já suporta o parcelamento. Cada parcela precisa
saber a qual fatura pertence — coluna aditiva.

**2.4 · A competência não muda com o parcelamento.** É a informada no
lançamento, única para a compra inteira. O parcelamento é forma de pagamento,
não diluição de custo.

**2.5 · Estados da fatura:** aberta — ciclo em curso; fechada — aguardando
pagamento; paga; paga parcialmente, com saldo rotativo.

**2.6 · A fatura é a obrigação em Contas a Pagar.** Uma linha, com o vencimento
e o valor. As compras vinculadas **não aparecem** lá. Ver **Prompt R**.

**2.7 · A fatura aberta também aparece, como obrigação PREVISTA.**

Desde o início do ciclo, a fatura em curso aparece em Contas a Pagar no **seu dia
de vencimento**, com o valor acumulado até o momento.

**Por quê:** se ela só aparecesse depois de fechar, quem olha Contas a Pagar no
dia 20 não veria que há uma fatura vencendo no dia 5 do mês seguinte. O
planejamento de caixa perderia justamente a obrigação mais próxima.

**A distinção precisa ser visível:**

| Estado | Natureza | O valor |
|---|---|---|
| **Fechada** | obrigação **firme** | não muda mais |
| **Aberta** | obrigação **prevista** | ainda vai crescer conforme as compras entram |

**2.8 · O valor da fatura aberta** é o acumulado do ciclo: compras já lançadas,
parcelas de compras anteriores que caem nele, e o saldo rotativo vindo da fatura
anterior.

**A estimativa de juros do rotativo NÃO entra nesse valor** — ela é projeção e
fica visível apenas na tela do cartão, conforme 4.2. Levar estimativa para
Contas a Pagar seria apresentar palpite como obrigação.

**2.9** Quando o ciclo fecha, a mesma fatura **muda de prevista para firme**. Não
nasce uma segunda linha.

---

# 3. PAGAMENTO DA FATURA

**3.1** Gera **uma** saída de caixa, na data do pagamento, pelo valor pago, na
conta cadastrada no cartão.

**3.2 · Não cria despesa.** As despesas já foram reconhecidas nas competências
delas.

**3.3 · Pagamento parcial.** Permitido. O saldo não pago fica como **rotativo**,
e a fatura seguinte o traz.

**3.4 · O juro do rotativo é despesa nova**, na competência em que foi cobrado —
despesa financeira, não parte de nenhuma compra original.

**Ele só existe quando a fatura chega com ele cobrado.** A projeção da tela é
estimativa e **não gera lançamento**.

**3.5 · Idempotência e `FOR UPDATE`**, no padrão da restituição em lote: duplo
clique não paga duas vezes, e dois pagamentos simultâneos são serializados.

**3.6 · Preview antes de gravar**, também no padrão do lote: o usuário vê o
valor, a conta debitada e o saldo que restará antes de confirmar.

---

# 4. PROJEÇÃO DA PRÓXIMA FATURA

**4.1** A tela mostra, para o ciclo em curso: compras já lançadas, parcelas de
compras anteriores que caem nele, saldo rotativo vindo da fatura anterior, e o
total projetado.

**4.2 · O juro projetado** aparece **identificado como estimativa**, conforme
BU-3, e nunca somado como se fosse fato.

**4.3 · Relação com Contas a Pagar.** A fatura aberta **aparece** lá, como
obrigação prevista, conforme 2.7 — mas pelo acumulado do ciclo, **sem a
estimativa de juros**.

O total projetado desta tela **inclui** a estimativa; o de Contas a Pagar,
**não**. Os dois números diferem por isso, e a tela do cartão deve dizê-lo, senão
parece divergência.

---

# 5. EXTRATO DO CARTÃO

**5.1 · A função é conferência**, não lançamento.

**5.2** Subir o arquivo e comparar com o que está lançado, exibindo:

- compras no extrato **sem** lançamento no sistema;
- lançamentos **sem** correspondência no extrato;
- divergências de valor ou data no mesmo par;
- créditos e estornos.

**5.3 · Deduplicação da importação.** Subir o mesmo extrato duas vezes não pode
duplicar nada. `cash_entry` já usa `import_hash` para isso — **usar o mesmo
padrão**.

**5.4 · Nada é gravado pela importação** além do registro do próprio extrato. As
divergências são exibidas; o lançamento é ação do usuário, em `/despesas`.

---

# 6. ESTORNO

**6.1 · Dois caminhos, conforme decidido:**

O extrato traz um crédito e **o sistema identifica** como estorno.

Ou o usuário **antecipa** o estorno na tela do cartão, antes de o extrato
chegar — quando já sabe que a devolução foi feita.

**6.2 · O estorno reduz a fatura e reverte a despesa original por lançamento
próprio.** A compra **não é apagada nem editada**.

**6.3 · Não contar duas vezes.** Quando o extrato trouxer um crédito que já foi
antecipado, o sistema reconhece e **não gera segundo estorno**. A conferência
mostra o par, com o antecipado já vinculado.

Esta é a regra mais delicada da tela: os dois caminhos existem justamente
porque o extrato chega depois.

---

# 7. ASSISTENTE DE IA

Segue o **Prompt E**. **Somente leitura nesta tela.**

**Ações:**

- **Ler o extrato e apontar divergências** — o que está no cartão e não foi
  lançado, e o contrário. Conforme BU-2, pode **propor** o lançamento, que o
  usuário confirma em `/despesas`.
- **Projeção do ciclo** — o que já caiu, o que ainda cai, e o total esperado.
- **Compras sem obra** — lançamentos no cartão sem projeto vinculado.
- **Limite** — quanto do limite está comprometido pelo ciclo aberto e pelas
  parcelas futuras.

**Nunca:** lançar despesa, pagar fatura, registrar estorno, ou projetar juro
sem taxa definida.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Campo de forma de pagamento no lançamento | Prompt S, seção 3-B |
| A fatura como linha de Contas a Pagar | Prompt R |
| Conciliação bancária do pagamento da fatura | Prompt L |
| Cadastro de pagadores terceiros | Prompt T |
| Apropriação de despesa em várias competências | não decidido — ver nota |

**[NOTA]** Ficou levantada, e não decidida, a apropriação de uma despesa em N
competências — o caso da locação de seis meses paga à vista. **Não implementar
sem decisão.** A competência continua única, informada no lançamento.

---

# 9. PRESERVAÇÃO DE DADOS

Tarefa de criação. Nenhuma despesa, parcela, pagamento, `cash_entry` ou
obrigação existente é alterada.

Todas as migrações são aditivas, com `IF NOT EXISTS` e `down`. A coluna de
vínculo com fatura em `despesa_parcela` nasce anulável, e **nenhuma parcela
existente é vinculada retroativamente** — isso é decisão humana, se for o caso.

---

# 10. TESTES

1. Compra no cartão não gera saída de caixa na data da compra.
2. Compra no cartão entra na DRE na competência informada.
3. Compra até o fechamento cai na fatura que fecha; depois, na seguinte.
4. **Vencimento menor que fechamento:** a fatura vence no mês seguinte.
5. Compra em 6x gera seis parcelas, uma por fatura consecutiva.
6. A competência da compra parcelada é única, não se divide entre as parcelas.
7. **Em Contas a Pagar aparece a fatura, e não as compras.**
8. Pagar a fatura gera uma saída de caixa e **nenhuma despesa**.
9. Pagamento parcial deixa saldo rotativo, que aparece na fatura seguinte.
10. Juro projetado aparece como estimativa e não gera lançamento.
11. Juro cobrado na fatura vira despesa financeira na competência da cobrança.
12. Duplo clique no pagamento gera um único fato.
13. Subir o mesmo extrato duas vezes não duplica nada.
14. Estorno antecipado e o crédito do extrato **não se somam**.
15. Estorno não apaga nem edita a compra original.
16. Fatura do ciclo aberto **aparece** em Contas a Pagar, no dia de vencimento,
    marcada como prevista.
16a. O valor da fatura aberta em Contas a Pagar **não** inclui a estimativa de
    juros do rotativo.
16b. Lançar uma compra nova faz o valor da fatura aberta crescer em Contas a
    Pagar.
16c. Ao fechar o ciclo, a fatura muda de prevista para firme — sem criar uma
    segunda linha.
17. Número completo de cartão não é gravado em lugar nenhum.
18. Assistente não grava nada.
19. **Antes e depois:** contagem e soma de `despesa`, `despesa_parcela`,
    `pagamento` e `cash_entry`. Nenhuma diferença causada por esta tarefa.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisões de BU-1, BU-2 e BU-3.
2. Estrutura criada: tabelas, colunas e relações.
3. Como a fatura de uma compra é determinada, com o tratamento da borda do
   item 2.2.
4. Como a fatura entra em Contas a Pagar sem que as compras entrem, e como a
   aberta é distinguida da fechada.
5. Como o pagamento parcial e o rotativo foram modelados.
6. Como a deduplicação do extrato funciona.
7. Como o estorno antecipado e o do extrato são reconciliados.
8. Confirmação de que a tela não grava despesa por nenhum caminho.
9. Confirmação de que nenhum dado existente foi alterado.
10. Migrações criadas, com `down`.
11. Limitações encontradas.


<a id="prompt-x"></a>


========================================================================


### ▸ 21 de 42 · PROMPT X — Contas Correntes

**Bloco 3 · O lançamento** · Bloqueios: BX-1 · BX-2 · BX-3

Depende de W e T. **Muda o saldo do Fluxo de Caixa.**

========================================================================


# PROMPT X — CONTAS CORRENTES

Growth Construction · `/contas`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Saldos, contas e
vínculos existentes permanecem como estão.

**[EXCEÇÃO ÚNICA E DELIBERADA]** A seção 3 desta tarefa remove três cadastros
que **não são contas correntes da empresa**. É a primeira exceção à regra global
em todo o conjunto de prompts, foi decidida explicitamente, e vem com o
procedimento da seção 3.2 — inventário de vínculos **antes**, remoção só depois,
e inativação em vez de exclusão quando houver histórico.

**Fora dessas três linhas, a regra vale integralmente.**

**2 · Nada vindo de mockup entra no código.**

---

# ESCOPO

A tela cadastra **as contas bancárias que compõem o saldo de caixa da empresa**.
Nada além disso.

O trabalho é: dizer isso na tela, limpar o que não é conta bancária, e corrigir
o que o "Automático" promete.

---

# ORDEM DE EXECUÇÃO

**A seção 3 depende dos Prompts W e T.** As despesas hoje vinculadas às contas
de sócio são reclassificadas como pagas por terceiro — o que exige o papel de
pagador (Prompt W) e o fluxo de Ressarcimentos (Prompt T).

As seções 1, 2, 4 e 5 são independentes.

---

# BLOQUEIOS

## BX-1 · O que é a conta "CHEQUE TERCEIRO"

Das três linhas que não são conta bancária, duas têm destino claro — as de sócio
vão para a conta corrente de terceiros dos Ressarcimentos, que já existe e já
mostra os saldos reais.

**"CHEQUE TERCEIRO" não tem.** Se for cheque recebido de cliente, é valor a
receber — e o sistema tem cheque **emitido**, em `despesa_parcela`, não cheque
recebido.

**Responder antes de remover.** Tirá-la sem destino deixa a operação sem
controle de algo que ela usa.

## BX-2 · Inventário de vínculos das três contas

**Oito tabelas** apontam para `bank_account`: `despesa`, `despesa_parcela`,
`pagamento`, `restituicao`, `acerto`, `repasse`, `cash_entry` e `conta_receber`.
Todas com `set null`.

Isso significa que **excluir não falha** — o banco zera o vínculo em silêncio, e
o registro dependente perde a informação de por onde o dinheiro passou. É o
mesmo padrão que o Prompt W corrige em Fornecedores.

**Entregar antes de qualquer remoção, somente leitura:** para cada uma das três
contas, a contagem de registros em cada uma das oito tabelas, com os valores
envolvidos.

## BX-3 · O "Automático" não conecta

Três contas estão marcadas como atualização **Automático** e todas dizem **"não
conectado"**. E o cabeçalho da tela informa **"Open Finance não configurado"**.

**Responder:** o que `saldo_source = "automatico"` faz hoje? Existe qualquer
código de integração além do campo `open_finance_id`?

Se não existir, o rótulo promete um comportamento que não acontece, e alguém
pode estar confiando num saldo que nunca atualiza.

---

# 1. A ORIENTAÇÃO NA TELA

**1.1** Texto fixo, no topo, dizendo o que entra ali:

> Cadastre aqui **apenas as contas bancárias que compõem o saldo de caixa da
> empresa**. O saldo total soma todas elas.
>
> Saldo com sócios e terceiros fica em **Ressarcimentos**, na conta corrente de
> terceiros — é obrigação da empresa, não caixa disponível.

**1.2** O texto atual já explica Open Finance e atualização manual. **Preservar
isso**, acrescentando o que entra e o que não entra.

**1.3 · Aviso ao cadastrar sem agência e conta.** As três linhas a remover têm
esses campos vazios — é o sinal de que não é conta bancária.

**Avisar, não bloquear:** pode haver caso legítimo, como conta em abertura.

---

# 2. O QUE COMPÕE O SALDO TOTAL

**2.1** O "Saldo total" soma **todas** as contas cadastradas. Basta alguém
lançar saldo numa conta de sócio para o caixa da empresa incluir dinheiro que
não é dela.

**2.2** Com a limpeza da seção 3, o problema deixa de existir na prática. Mas a
regra precisa ficar no código, não só nos dados: **o total soma apenas contas
ativas**, e a tela declara isso ao lado do número.

**2.3 · Reportar antes:** quais telas leem `bank_account.saldo` — se o Caixa, o
Fechamento ou o Dashboard o usam como referência, alterar o conjunto muda número
nelas.

---

# 3. LIMPEZA DOS CADASTROS QUE NÃO SÃO CONTA

**Ver BX-1 e BX-2 antes de executar.**

## 3.1 · Quais

`SOCIO A`, `SOCIO B` e `CHEQUE TERCEIRO` — sem agência, sem número,
saldo zero.

As duas de sócio são o mesmo conceito da conta corrente de terceiros, que já
existe nos **Ressarcimentos** e lá mostra os saldos reais. O controle foi criado
em dois lugares, e o desta tela nunca foi usado.

## 3.2 · O procedimento

**Inventário primeiro** (BX-2). Depois:

**Sem nenhum vínculo nas oito tabelas** → exclusão física resolve.

**Com vínculo** → **inativar**, não excluir. O registro permanece, sai do total,
e o histórico continua apontando para um nome em vez de para nulo.

**Nunca script em massa.** Cada uma das três é decisão item a item, com o
inventário à vista.

## 3.3 · A reclassificação das despesas — ENCAMINHAMENTO, não escopo

As despesas hoje vinculadas às contas de sócio passam a ser **pagas por
terceiro**, com o cadastro do respectivo sócio, entrando no fluxo de
**Ressarcimentos**.

**O mecanismo já existe:** `criarDespesaTerceiro`, no modo de vínculo por PED,
preserva valor, competência, vencimento, categoria e número do lançamento
original, e só marca `pagoPorTerceiro`.

**A sequência é obrigatória:**

1. Papel "Pagador por Terceiro" criado e concedido — **Prompt W**;
2. despesas reclassificadas, uma a uma, pelo vínculo por PED;
3. só então as contas saem do saldo.

**[NOTA — verificar antes de reclassificar]** Um dos sócios já tem saldo a
ressarcir, e outro terceiro também, vindos por outro caminho. Reclassificar **aumenta**
esses saldos — o que está certo se as despesas de fato foram pagas por eles e
ainda não devolvidas.

**Mas se alguma já foi acertada** — dinheiro devolvido, registrado de outra
forma —, criar a obrigação agora inventaria dívida que não existe.

Por isso o inventário precisa dizer, por despesa: se está paga, se houve
movimento de caixa correspondente, e se existe ressarcimento relacionado.

**Isto é operação, não código.** O prompt entrega o inventário e a orientação; a
reclassificação é decisão humana, item a item.

---

# 4. ATUALIZAÇÃO DE SALDO

**4.1 · Ver BX-3.** Se não houver integração, o rótulo "Automático" precisa
dizer a verdade — por exemplo, "Automático (quando conectado)" com indicação
clara de que a conta não está conectada, ou o campo desabilitado até haver
conexão.

**Não remover o campo:** ele é a preparação para o Open Finance, e o Prompt L
depende dessa integração para a conciliação.

**4.2 · O saldo manual é digitado**, com botão Salvar por linha. Isso está
correto para o modelo atual, mas o **Prompt L** introduz os dois saldos — o do
extrato e o conciliado.

**Quando a conciliação entrar**, este saldo passa a ser o **ponto de partida**
ou a **referência do extrato**, e a relação precisa ficar declarada. Não
implementar aqui; registrar a dependência.

**4.3 · Auditoria da alteração de saldo.** Saldo é número de caixa. Verificar se
a action audita hoje, e acrescentar valor anterior e novo se não auditar.

---

# 5. INTEGRIDADE

**5.1 · Permissão de ver.** Verificar se a tela chama `can(..., "ver")`. Se não
chamar, acrescentar com `AccessDenied` — seria a oitava ocorrência.

**5.2 · Validação.** Banco obrigatório. Saldo aceita negativo — conta pode estar
no vermelho —, mas não aceita texto nem vazio.

**5.3 · Retorno legível** em todas as actions, no padrão `{ ok, error }`.

**5.4 · Exclusão de conta em geral.** Além das três da seção 3, a exclusão de
qualquer conta precisa verificar as oito tabelas e recusar com mensagem que diga
**qual** vínculo impede. Hoje, se não verificar, zera em silêncio.

**5.5 · Os tipos "Construtora" e "Imobiliária".** Verificar o que o enum
governa. Se for para separar as duas empresas do grupo, o total deveria poder
ser visto por tipo.

---

# 6. O MÓDULO MUDA

A tela passa do módulo **Despesas** para **Caixa**.

Conta corrente é instrumento de caixa, não de despesa. O módulo Caixa fica com:
**Caixa**, **Contas Correntes**, **Fechamento de Caixa** e **Balanço do Dia**.

Ver **Prompt C**.

---

# 7. ASSISTENTE DE IA

Segue o **Prompt E**. **Somente leitura.**

**7.1 · Ações**

- **Cadastros que não parecem conta bancária** — sem agência ou sem número. É a
  varredura que originou esta tarefa, disponível de forma contínua.
- **Contas sem movimento** — cadastradas e sem nenhum lançamento vinculado em
  período relevante.
- **Saldo parado** — contas cujo saldo não é atualizado há muito tempo, com a
  data da última alteração.
- **Marcadas como automáticas e não conectadas** — o caso do BX-3.

**7.2 · Nunca:** cadastrar, alterar saldo, inativar ou excluir conta.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Conciliação, dois saldos e ajuste | Prompt L |
| Integração com Open Finance | Prompt L, item 8 da coleta |
| Papel de pagador por terceiro | Prompt W |
| Fluxo de ressarcimento ao sócio | Prompt T |
| Reclassificação das despesas | **operação**, ver 3.3 |

---

# 9. PRESERVAÇÃO DE DADOS

Fora da exceção declarada da seção 3, nenhuma conta é alterada, inativada ou
removida. Nenhum saldo é recalculado. Nenhum vínculo é desfeito.

Migrações, se houver, aditivas com `IF NOT EXISTS` e `down`.

---

# 10. TESTES

1. A tela declara o que entra e o que não entra.
2. Cadastrar sem agência e conta **avisa**, sem bloquear.
3. O saldo total soma apenas contas ativas, e a tela diz isso.
4. Excluir conta com vínculo é recusado, com a mensagem dizendo qual.
5. Conta sem nenhum vínculo continua excluível.
6. Inativar preserva o registro e tira do total.
7. O rótulo de atualização não promete automático sem conexão.
8. Alterar saldo registra valor anterior e novo em auditoria.
9. Saldo negativo é aceito; texto e vazio, não.
10. Sem permissão de ver, a tela não é acessível por URL direta.
11. Assistente não grava nada.
12. **Antes e depois:** contagem de `bank_account` e conteúdo de cada linha.
    A única diferença permitida é a das três contas da seção 3, com o
    inventário que a justifica.
13. **Antes e depois:** Caixa, Fechamento e Dashboard devolvem os mesmos
    números — salvo onde a remoção das três contas os altere, e então com o
    valor explicado.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resposta de BX-1 — o que é a conta "CHEQUE TERCEIRO" e qual destino teve.
2. Inventário de BX-2 — os vínculos das três contas nas oito tabelas.
3. Resposta de BX-3 — o que o "Automático" faz hoje, e se há código de Open
   Finance.
4. Quais telas leem `bank_account.saldo`, e o efeito da mudança em cada uma.
5. Para cada uma das três contas: excluída ou inativada, e por quê.
6. O inventário das despesas vinculadas às contas de sócio, com situação de
   pagamento e ressarcimento — **sem reclassificar nenhuma.**
7. Como a exclusão passou a verificar as oito tabelas.
8. O que o enum de tipo governa.
9. Funcionamento do assistente e confirmação de que não grava.
10. Comparação antes/depois de `bank_account` e dos números das telas
    dependentes.
11. Migrações criadas, com `down`.
12. Limitações encontradas.


<a id="prompt-l"></a>


========================================================================


### ▸ 22 de 42 · PROMPT L — Caixa e Conciliação

**Bloco 3 · O lançamento** · Bloqueios: BL-1 · BL-2 · BL-3

Os dois saldos. AD e AE dependem.

========================================================================


# PROMPT L — CAIXA E CONCILIAÇÃO

Growth Construction · `/caixa`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/ponto` | Ponto da Obra | **extinta** | Prompt Z, Parte 1 |
| `/fechamento` | Fechamento de Caixa | **absorvida pelo Caixa** | este prompt, Parte 9 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Movimentos,
conciliações, saldos e lançamentos existentes permanecem como estão. Se uma
alteração exigir tocar em dado existente: **PARE, não execute, e informe qual
dado, por quê, quantos registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**

**3 · O extrato é fato do banco.** Nenhuma operação altera, apaga ou inventa
movimento importado. Desfazer conciliação preserva o movimento; é o vínculo que
se desfaz.

---

# O PAPEL DESTA TELA

**É onde a operação começa e onde ela fecha.**

Começa porque a conciliação é o caminho natural de implantação: sobe-se o
extrato, e os lançamentos que faltam aparecem como pendências. O cadastro não
precisa estar completo antes — ele se completa **junto com** a conciliação, dia
a dia, a partir do que o banco mostra.

Fecha porque é aqui que os dois saldos se encontram: **o do extrato**, que é
fato do banco, e **o conciliado**, que é o que os lançamentos sustentam.

Ao fim de um dia inteiramente conciliado, os dois são iguais. A diferença entre
eles é a informação que a tela existe para dar.

---

# O QUE JÁ EXISTE — NÃO RECONSTRUIR

A revisão do código mostrou que boa parte do que este prompt pedia já está
implementada. Listar importa: o risco aqui é reescrever o que funciona.

**A importação de extrato é completa.** XLSX, CSV e PDF; pré-visualização antes
de gravar; lançamentos já importados são ignorados; o PDF original fica
armazenado para auditoria; e com IA ativa lê extrato em imagem e PDF escaneado.

**`bank_account.saldo` já é o saldo do extrato.** A importação o atualiza quando
o arquivo traz o saldo final, marcando `saldoSource: "auto"`. **É metade do
conceito de dois saldos, já pronta.**

**O ajuste de caixa existe**, como terceiro tipo de `addCash`, com auditoria
própria (`cash.adjust`).

**E o ajuste não entra na DRE.** Verificado por dois caminhos: a DRE não lê
`cash_entry` em lugar nenhum. **É exatamente a regra desejada — preservar.**

**`saldoDisponivel` já exclui contas do tipo "Terceiros"**, com o comentário
explicando: são obrigações com sócios, não dinheiro disponível da empresa.

**`conciliarDespesa` faz o caminho completo**: marca a despesa como paga, copia
`dataCaixa` e `bancoId` do movimento, e grava as quatro colunas de vínculo.

**Há guarda contra reuso**: conciliar movimento já conciliado é recusado, e
`pairMovimento` verifica antes.

---

# ORDEM DE EXECUÇÃO

**Par obrigatório com o Prompt K** — o modelo de vínculo nasce aqui e é
consumido lá.

**Precede o Prompt S** na parte da trava de despesa conciliada, e a **aba
Acertos** do Prompt S só entra depois que a seção 4 daqui estiver em produção.

**Depende do Prompt X** para a seção 2.4.

---

# BLOQUEIOS

## BL-1 · Reclassificar as contas de terceiro em vez de removê-las

O mecanismo de exclusão do saldo **já existe**: `saldoDisponivel` ignora contas
do tipo `"Terceiros"`.

Em produção, `SOCIO A`, `SOCIO B` e `CHEQUE TERCEIRO` estão com
tipo **Construtora** — por isso entram no saldo total.

**Isso muda a abordagem do Prompt X**, que previa inativar ou excluir. Trocar o
tipo para "Terceiros" resolve sem tocar em vínculo nenhum: elas saem do saldo, o
histórico fica intacto, e nada é removido.

**Confirmar antes:** a troca de tipo é alteração de dado inputado pela empresa,
e portanto **decisão humana, conta a conta, com prévia**. Reportar o efeito no
saldo total antes de aplicar.

## BL-2 · O que fazer com os `rec = true` sem vínculo

Hoje três caminhos marcam `rec` **sem gravar com o quê o movimento casou**:
`toggleConciliado`, a conciliação automática do `importCash`, e o ajuste, que
nasce conciliado.

Ao introduzir o vínculo com valor, esses registros ficam num estado
intermediário: marcados como conciliados, sem lastro.

**Entregar antes, somente leitura:** quantos `cash_entry` têm `rec = true` e
nenhum `conciliado_despesa_id` nem `conciliado_conta_receber_id`, por tenant e
por período.

**Nenhum é alterado.** Eles passam a exibir estado próprio — "conciliado sem
vínculo" — e vão para uma lista de conferência. A regularização é humana.

## BL-3 · Conciliação parcial altera o status da despesa

Hoje `conciliarDespesa` marca a despesa como **Pago** inteira, sem comparar
valores.

Com o vínculo por valor, uma despesa pode ficar **parcialmente** conciliada — e
o status precisa refletir isso.

**Decidir:** o status da despesa passa a ser **derivado** do somatório dos
vínculos, como o de conta a receber no Prompt K, seção 3.2? É o correto, e é
mudança de comportamento em tela que a operação usa todo dia.

---

# PARTE 1 — OS DOIS SALDOS

## 1.0 · A origem do saldo em conta precisa estar visível

**1.0.1 · Data da última atualização.** A tela exibe, por conta, **quando** o
saldo em conta foi obtido — e por qual caminho: importação de extrato ou Open
Finance.

Sem isso, o usuário não sabe se está comparando o conciliado contra um saldo de
hoje ou de três semanas atrás. **É a informação que qualifica toda a
comparação.**

**1.0.2 · Alerta quando estiver velho.** Conta cuja última atualização passou de
um limite razoável aparece sinalizada. Extrato desatualizado é a causa mais
comum de divergência aparente.

**1.0.3 · Importar extrato em destaque.** A ação existe e é a mais usada da
tela — hoje fica dentro de uma aba. Passa para o topo, ao lado do saldo.

**1.0.4 · Configurar Open Finance.** O rótulo "Open Finance não configurado" é
informativo e não leva a lugar nenhum. Passa a ser **caminho**: quem tem
permissão vai para a configuração; quem não tem, vê a informação como está hoje.

**[NOTA]** A configuração em si — credenciais, consentimento, vínculo de conta —
não é escopo desta tarefa. O que entra é o caminho até ela.

---

## 1.1 · A definição

**Saldo em conta** — o do extrato. Vem do banco, por importação ou Open Finance.
É fato, e ninguém o calcula. Já existe em `bank_account.saldo`.

**Saldo conciliado** — o que os lançamentos sustentam: saldo conciliado
anterior, mais entradas conciliadas, menos saídas conciliadas, mais os ajustes.

**Ao fim de um dia inteiramente conciliado, os dois são iguais.**

## 1.2 · Exibir os dois lado a lado

O topo da tela passa a mostrar os dois números e a diferença entre eles, por
conta e no total.

**Hoje há um número só** — o card "Saldo do dia" e o "Saldo total" das contas —
e ele mistura os dois conceitos. Ver 1.4.

## 1.3 · Nomear a diferença

Um número vermelho sem explicação não diz onde procurar. A tela classifica a
divergência em quatro naturezas:

- movimento no extrato **sem** lançamento correspondente;
- lançamento **sem** movimento no extrato;
- divergência de valor dentro de um mesmo vínculo;
- movimento em data trocada — aparece num dia e falta no outro.

## 1.4 · O saldo acumulado conta os dias passados duas vezes

**Defeito confirmado no código.** O acumulado parte de `saldoDisponivel(contas)`
— o saldo **atual** das contas — e soma os deltas dos dias passados da janela,
que **já estão refletidos naquele saldo**.

```ts
let acumulado = saldoTotal;          // saldo atual das contas
// … para cada dia da janela, inclusive os 2 passados:
acumulado += saldoDia;
```

O primeiro cartão mostra, então, `saldo atual + movimento de anteontem`.

**Corrigir:** os dias passados exibem o saldo **realizado** daquele dia, e a
projeção parte do saldo de hoje. Nunca somar movimento já refletido no saldo da
conta.

## 1.4-A · Cada cartão mostra saldo inicial e saldo final

**1.4-A.1 · A regra.** Cada dia exibe:

| Linha | O que é |
|---|---|
| **Saldo inicial** | o saldo final do dia anterior |
| Entradas do dia | |
| Saídas do dia | |
| **Saldo final** | saldo inicial + entradas − saídas |

**O saldo inicial de um dia é, por definição, o saldo final do dia anterior.**
A série é contínua, e essa identidade é o que permite conferir a cadeia: se um
dia não fecha, o erro está nele, não nos seguintes.

**1.4-A.2 · Hoje só existe o acumulado**, e ele é calculado errado (1.4). Não há
saldo inicial em lugar nenhum, o que impede exatamente essa conferência.

**1.4-A.3 · De onde parte o primeiro cartão.** O saldo inicial do dia mais
antigo da janela é o **saldo final do dia imediatamente anterior a ela** —
calculado, não o saldo atual da conta.

**Não usar `saldoDisponivel(contas)` como ponto de partida**, que é o que gera o
defeito de 1.4: aquele saldo é de **hoje**, e somá-lo a movimento passado conta
duas vezes.

**1.4-A.4 · Os dois saldos em cada cartão.** Com a Parte 1, o dia tem quatro
números: saldo inicial e final **em conta**, e saldo inicial e final
**conciliado**.

Num dia inteiramente conciliado, os pares coincidem. Onde não coincidirem, a
diferença aparece no próprio cartão — é onde o usuário vê em qual dia a cadeia
quebrou.

**1.4-A.5 · Projeção.** Nos dias futuros, o saldo em conta não existe — o banco
ainda não registrou nada. O cartão mostra apenas a projeção, rotulada como tal,
partindo do último saldo conhecido.

**1.4-A.6 · A identidade é verificável.** Um teste automatizado confere que, em
toda a janela, o inicial de cada dia é igual ao final do anterior. Se a conta
não fechar, é defeito.

---

## 1.5 · Os cartões ignoram o filtro de período

`cashByDay` percorre `cashAll`, a lista **sem** o filtro `de`/`ate`. A tabela de
lançamentos e os contadores de conciliação respeitam; os cartões não.

Ou os cartões respeitam o filtro, ou a tela declara que a faixa de dias é
independente dele. **Hoje não diz nada, e os números parecem discordar.**

## 1.6 · O rótulo do cartão não olha a conciliação

`Realizado` / `Hoje` / `Projeção` é pura comparação de data — não consulta `rec`.

Um dia passado com movimento não conciliado aparece como "Realizado" com o mesmo
peso de um dia fechado. **Distinguir realizado conciliado de realizado
pendente.**

---

# PARTE 2 — VÍNCULO COM VALOR

## 2.1 · O que existe hoje

| Caminho | Action | O que grava |
|---|---|---|
| Toggle na tabela | `toggleConciliado` | **só `rec`** — nenhum vínculo |
| Botão do review | `conciliarDespesa` / `conciliarContaReceber` | `rec` + as quatro colunas |
| Pareamento | `pairMovimento` | chama as duas acima |
| Importação | `importCash` | **só `rec = true`** |

**O vínculo é estritamente um para um** — uma coluna `uuid` de cada lado, sem
tabela de ligação. E **não guarda valor**.

## 2.2 · O que muda

**Tabela de vínculo com valor por linha**, no mesmo formato que `acerto_item` e
`restituicao_item` já usam do lado da despesa.

Um movimento liga-se a vários lançamentos; um lançamento recebe vários
movimentos.

## 2.3 · Serve entrada e saída

Uma mecânica, dois sentidos: um depósito quitando três parcelas de recebível, e
um pagamento quitando seis despesas.

**Isto substitui o Acerto Contábil**, que hoje resolve o segundo caso por outro
caminho — digitando o movimento em vez de trazê-lo do extrato. Ver Parte 4.

## 2.4 · A soma dos vínculos não pode exceder o valor do movimento

E **`conciliarDespesa` passa a comparar valores**. Hoje aceita casar um
movimento de R$ 1.000 com uma despesa de R$ 5.000 e marca a despesa inteira como
paga, sem registrar divergência.

## 2.5 · O status da despesa passa a ser derivado

**Ver BL-3.** Calculado do somatório dos vínculos contra o valor devido, como o
de conta a receber no Prompt K.

## 2.6 · `toggleConciliado` precisa de correção urgente

Além de não gravar vínculo, ele **não valida o tenant no `where`**, não verifica
versão congelada e não registra auditoria. É um `UPDATE` de uma coluna por id.

**É o caminho que a tabela oferece por padrão** — o mais usado, e o menos
seguro do arquivo.

**Corrigir as três coisas**, e passar a gravar o vínculo quando houver
contraparte escolhida.

## 2.7 · A conciliação automática da importação

`importCash` marca `rec = true` por coincidência de valor e mês, **sem guardar
com o quê casou**.

**Passa a gravar o vínculo** quando a correspondência for inequívoca, e a
**propor** — não marcar — quando houver mais de um candidato.

## 2.8 · Preservar as colunas atuais

`conciliado_despesa_id`, `conciliado_conta_receber_id`, `conciliado_por` e
`conciliado_em` são **preservadas**. Descontinuadas como mecanismo, nunca
removidas nem migradas. **Nenhum vínculo existente é convertido.**

## 2.9 · Auditoria

Criar e desfazer vínculo registram movimento, lançamento e valor. Hoje
`toggleConciliado` e `pairMovimento` estão na lista das treze actions sem
`logAudit`.

---

# PARTE 3 — A CONCILIAÇÃO NÃO FECHA COM DIFERENÇA

## 3.1 · A regra

Ou os vínculos somam o valor do movimento, ou a conciliação não conclui.
**Nada de ajuste automático.**

## 3.2 · Dois caminhos, ambos do usuário

**Ajustar o valor de uma das despesas**, para mais ou para menos, quando ela
estiver errada. A alteração passa pela auditoria campo a campo que já existe.

**Lançar uma despesa nova** — multa, juro, tarifa — com fornecedor, competência
e categoria próprios, e vinculá-la ao mesmo movimento. É o caminho correto
quando a diferença tem causa: juro por atraso é despesa financeira do mês em que
foi cobrado, não parte do material comprado três meses antes.

## 3.3 · Despesa já conciliada tem o valor travado

O caminho é desfazer aquela conciliação primeiro — com a permissão da seção 5 —
ou escolher outra despesa. Ver **Prompt S, seção 1**.

---

# PARTE 3-A — O QUE SE LANÇA AQUI, E O QUE NÃO

## 3-A.1 · A regra

**Esta tela lança uma coisa só: o ajuste de caixa.**

Receita e despesa **saem do formulário** e passam a ser encaminhadas:

| Movimento sem contraparte | Vai para |
|---|---|
| **Entrada** | Contas a Receber |
| **Saída** | Despesas / Lançamentos |

**Por quê:** o lançamento precisa de competência, categoria, conta CEF e
documento fiscal — coisas que a conciliação não tem como saber e que as telas de
origem já exigem. Lançar aqui criaria registro incompleto por um caminho
paralelo.

É a mesma porta única estabelecida nos Prompts T, U e S.

## 3-A.2 · O encaminhamento leva os dados

Ao clicar em lançar a partir de um movimento do extrato, a tela de destino abre
**com data, valor e histórico já preenchidos**, e o movimento fica reservado
para conciliação assim que o lançamento existir.

**O usuário não redigita o que o extrato já trouxe.**

## 3-A.3 · A ação `addCash` é preservada

Os três tipos continuam existindo na action. O que muda é **o caminho na
interface**: os formulários de receita e despesa saem desta tela.

**Nenhum `cash_entry` existente é alterado**, inclusive os criados por aqueles
caminhos.

**[NOTA]** Verificar se `addCash` com `tipo = "receita"` ou `"despesa"` é
chamado de outro lugar antes de remover o formulário. Se for, reportar.

## 3-A.4 · As abas Lançamentos e Previstas saem

**Lançamentos** existia para o formulário que sai em 3-A.1. A tabela de
movimentos permanece — dentro da Conciliação, que é onde ela tem função.

**Previstas** duplica o que Contas a Pagar e Contas a Receber já mostram, e com
menos recorte. Sai.

**A tela fica com duas abas: Conciliação e Ajustes.**

---

# PARTE 4 — O AJUSTE DE CAIXA

## 4.1 · O que já está certo

Existe, tem auditoria própria, e **não entra na DRE**. Preservar.

## 4.2 · O que falta

**4.2.1 · Motivo obrigatório.** Hoje o campo de descrição é livre e opcional.

**4.2.2 · Permissão própria.** Hoje usa `can(perms, "caixa", "criar")` — a mesma
de lançar receita. Quem lança não necessariamente ajusta.

**4.2.3 · O ajuste não altera `bank_account.saldo`.** Então ele **não faz o saldo
conciliado bater com o do extrato**, que é a função que ele deveria ter.

Com os dois saldos da Parte 1, o ajuste passa a compor o **saldo conciliado** —
e é assim que os dois se igualam. O saldo do extrato continua intocado, porque é
fato do banco.

**4.2.4 · Aba própria de Ajustes**, com o histórico completo: data, conta,
valor, motivo, autor e o saldo antes e depois.

Com filtro por período e conta, e **o total sempre à vista** ao lado do saldo, no
topo da tela.

Se esse total cresce, não é o ajuste que está errado: é o lançamento que não
está sendo feito. É o indicador que justifica o mecanismo existir.

**4.2.6 · Aviso de boa prática no formulário.** Antes de confirmar, a tela
declara:

> A melhor prática é **encontrar** a diferença, não ajustá-la. Um débito no
> extrato sem lançamento, uma despesa não conciliada ou um valor divergente
> explicam quase toda diferença — e o assistente ajuda a localizar.
>
> Use o ajuste quando a origem não for recuperável.

**Não bloqueia.** O ajuste é mecanismo legítimo de último recurso, e travá-lo
faria o usuário forçar por outro caminho. Mas ele não deve ser o primeiro
clique.

**4.2.7 · O ajuste é o único lançamento desta tela.** Ver 3-A.

**4.2.5 · A versão vem do contexto, não do seletor.** `addCash` grava
`ctx.version.id`, enquanto a tela tem seletor próprio de versões. Alinhar.

---

# PARTE 5 — DESFAZER CONCILIAÇÃO

**5.1 · Permissão própria**, verificada no servidor, **distinta de editar
despesa**.

**5.2** Quem pode editar mas não pode desfazer fica bloqueado, e isso é
intencional. A mensagem precisa dizer com todas as letras que a operação exige
permissão que o usuário não tem.

**5.3 · O movimento do extrato é preservado.** É o comportamento atual de
`desfazerConciliacao` e está correto.

**5.4 · Auditoria** com quem, quando e o vínculo desfeito.

**[NOTA]** A permissão não se encaixa no par recurso/ação atual —
`can(perms, "caixa", "editar")` não distingue desfazer de editar. Ou vira ação
nova no recurso `caixa`, ou recurso próprio. **Decisão do Prompt M.**

---

# PARTE 6 — BAIXA MANUAL E TRÊS ESTADOS

**6.1** Conciliar exige linha de extrato. **Dar baixa, não.**

A operação não pode parar porque o extrato ainda não chegou, e nem todo
movimento passa pelo banco da empresa.

**6.2 · Três estados**, para recebível e para despesa:

| Estado | Significado |
|---|---|
| **Em aberto** | nada movimentado |
| **Baixado** | registrado, **sem** vínculo com extrato |
| **Baixado e conciliado** | vínculo com linha de extrato, com valor |

**6.3 · O status é derivado, nunca digitado.** Ver 2.5 e o Prompt K, seção 3.2.

**6.4 · Indicador permanente:** quanto está baixado sem conciliar, e há quantos
dias. É o número que denuncia extrato não importado.

**6.5 · Movimento fora do banco** — espécie, repasse de terceiro — é documento
próprio, com justificativa e auditoria. Fecha sem fingir conciliação.

**6.6 · Os `rec = true` sem vínculo** de BL-2 aparecem como estado próprio, não
como conciliados.

---

# PARTE 7 — A TELA COMO PORTA DE ENTRADA DA OPERAÇÃO

**7.1 · O conceito.** Implantar o sistema não exige cadastrar tudo antes. Sobe-se
o extrato, e o que falta aparece como pendência — cadastro e conciliação
caminham juntos.

**7.2 · Da pendência ao cadastro, sem sair do fluxo.** Movimento do extrato sem
contraparte oferece o caminho:

- **saída** → lançar despesa, em `/despesas`, já com data, valor e histórico
  preenchidos;
- **entrada** → lançar conta a receber, ou identificar como recebível de
  unidade;
- **fornecedor desconhecido** → cadastrar, a partir do histórico do extrato.

**O lançamento acontece na tela dele**, com a competência, a categoria e o
documento fiscal que a conciliação não tem como saber. Esta tela **encaminha**.

**7.3 · Sem marco inicial.** A conciliação começa a qualquer momento. O que não
fecha é absorvido pelo ajuste da Parte 4 — decisão registrada.

**7.4 · Painel de implantação.** Quantos movimentos importados, quantos
conciliados, quantos pendentes, e quantos cadastros foram criados a partir
deles. É o que mostra o progresso de quem está começando.

---

# PARTE 8 — O QUE A TELA TROCA COM AS OUTRAS

Levantado na revisão das telas vizinhas. Cada item é ponto de contato que a
conciliação altera:

**Despesas** — o status passa a ser derivado do vínculo (2.5). E despesa
conciliada trava valor, vencimento e competência (**Prompt S, seção 1**).

**Contas a Pagar** — lê `getContasPagar`, que alimenta também Dashboard e
Fechamento. A conciliação muda o que conta como pago. **Reportar o efeito nas
três.**

**Contas a Receber** — a materialização das parcelas (**Prompt K**) é o que
torna o recebível conciliável. **Par obrigatório.**

**Acerto Contábil** — substituído pela conciliação (2.3). A tela vira aba
somente leitura em Despesas (**Prompt S, seção 5-A**), e isso **só acontece
depois** que a Parte 2 daqui estiver em produção.

**Ressarcimentos** — a restituição conciliada com extrato **não cria saída de
caixa nova**, só marca o movimento. **Está correto e se preserva.**

**Contas Correntes** — ver BL-1. A reclassificação de tipo resolve o saldo sem
tocar em vínculo.

**Cartões de Crédito** — o pagamento da fatura é um movimento do extrato que se
concilia com a fatura, não com as compras (**Prompt U**).

**DRE** — **não lê `cash_entry`**, e continua não lendo. Nenhuma operação desta
tela altera resultado.

---

# PARTE 9 — O FECHAMENTO DO DIA VEM PARA CÁ

## 9.1 · A decisão

A rota `/fechamento` é **absorvida**. Fechar o dia passa a ser **ação no cartão
da cadeia de saldo**, e o item sai do menu.

**Por quê:** a tela de Fechamento repetia cinco indicadores que a cadeia já
mostra — saldo inicial, entradas, saídas, saldo final e a lista do dia —, e para
um dia só. O que ela tinha de próprio era o **registro**: quem fechou, quando, e
com qual divergência.

Trazer a ação para o cartão mantém o registro e elimina a duplicação.

## 9.2 · Isto corrige o defeito da cadeia

Hoje o saldo inicial do fechamento vem de `saldoDisponivel(contas)` — o saldo
**atual** das contas. **Nenhuma consulta daquela tela lê `daily_closing`**, então
não há encadeamento entre fechamentos.

E há um caso pior: o campo de dia é estado local e **o saldo inicial não muda com
ele**. Fechar um dia retroativo grava o saldo de hoje como saldo inicial daquele
dia.

**Com a absorção, `daily_closing` passa a ser a fonte da cadeia**: o saldo
inicial de um dia é o `saldo_final` gravado no fechamento do dia anterior. É o
que a Parte 1 exige, e resolve os dois defeitos de uma vez.

## 9.3 · O cartão fechado

| Estado | O que o cartão mostra |
|---|---|
| **Aberto** | os quatro saldos, a diferença se houver, e a ação de fechar |
| **Fechado** | os mesmos números **gravados**, mais quem fechou, quando, e a divergência registrada |

Dia fechado exibe selo próprio. Dia aberto anterior a um fechado é anomalia e
aparece sinalizado — a cadeia tem buraco.

## 9.4 · A divergência deixa de ser digitada

Hoje é um campo numérico livre, iniciado em zero, que **nada calcula** — embora
os dois números necessários estejam na tela.

**Passa a ser calculada** entre o saldo em conta e o conciliado, e classificada
nas quatro naturezas de 1.3.

Diferença sem explicação tem um caminho só: o **ajuste** da Parte 4, com motivo
obrigatório e o aviso de boa prática. O campo livre some.

## 9.5 · Fechar duas vezes é impedido

Hoje não há verificação antes do insert nem `UNIQUE` em `(tenant, dia)`. Cada
fechamento gera linha nova em `daily_closing` **e novos `carry_over`**.

**Corrigir:** constraint no banco e verificação na action. Reabrir um dia fechado
é operação própria, com permissão e auditoria — não um segundo insert.

**[NOTA]** Reportar antes se há dias com mais de um fechamento em produção. A
constraint não pode ser criada com duplicata existente. **Nenhuma linha é
apagada** — a decisão é humana.

## 9.6 · Fechar não trava lançamento

É o comportamento atual e **permanece**: dia fechado continua aceitando
lançamento, edição e conciliação. Nenhuma action consulta `daily_closing`.

**Mas a tela precisa dizer isso.** "Fechamento" sugere trava; o que existe é
registro. Se o lançamento posterior alterar os números de um dia já fechado, o
cartão sinaliza a divergência entre o gravado e o recalculado.

**[BLOQUEIO menor]** Travar de fato é decisão de negócio, não implementação.
**Não introduzir trava sem decisão** — mudaria o que a operação consegue fazer
hoje.

## 9.7 · O `carry_over` para de ser gravado

**Uma escrita, zero leitura em todo o repositório.** Nenhuma query, nenhuma
action, nenhum componente, nenhum script lê a tabela. A coluna `toDia`, que
aponta o dia de destino, nunca é consultada.

E a mensagem exibida — *"Pendências transferidas para o dia seguinte"* — não
corresponde ao que acontece: **nenhum vencimento é alterado, nenhum recebível é
remarcado**. O insert é o único efeito.

**Parar de gravar.** O que ele registraria já está em Contas a Pagar e Contas a
Receber, com muito mais recorte — inclusive o vencido por idade.

**A tabela permanece no banco, com o que tiver.** Nenhuma linha é apagada, e o
dado histórico segue consultável por consulta direta.

## 9.8 · Onde o histórico é consultado

`daily_closing` é lido por **uma** tela além da que sai: o **Balanço do Dia**,
via `getDailyClosings`.

**Verificar e reportar** o que aquela tela mostra. Se ela já for o histórico de
fechamentos, nada se perde com a absorção. Se não for, o histórico precisa de
lugar antes de `/fechamento` sair.

**Não remover a rota antes dessa confirmação.**

## 9.9 · O que mais some junto

`projectId` do fechamento é **sempre nulo** — o cliente envia fixo, embora a
action aceite o campo. O fechamento é sempre do tenant inteiro.

Manter assim, e **remover o parâmetro** da action, ou decidir se o fechamento
passa a ser por projeto. **Não implementar por projeto sem decisão.**

E a auditoria grava **o dia** como `entityId`, não o id da linha. Com a
constraint de 9.5 isso deixa de ser ambíguo, mas vale corrigir para o id.

---

# PARTE 8-A — ASSISTENTE DE IA

Segue o **Prompt E**. **É a tela em que o assistente rende mais**, porque
conciliar é comparar duas listas — trabalho que a pessoa faz linha a linha e a
máquina faz de uma vez.

## 8-A.1 · Nível autorizado: propõe e para

O vínculo só existe depois da confirmação humana. **Não há caminho de
conciliação automática pelo assistente**, nem atalho de "confiar em todas".

Conciliar errado é pior que não conciliar: marca despesa como paga, altera
status, e entra no saldo.

## 8-A.2 · Sugerir os pares

A função principal. A partir do extrato importado e dos lançamentos em aberto, o
assistente propõe os pares por **valor, data, histórico e fornecedor**.

**Cada sugestão vem com o grau de certeza e o motivo**: valor e data exatos;
valor exato e data próxima; valor aproximado com histórico compatível.

O usuário confirma em bloco as inequívocas e resolve as duvidosas uma a uma.

**[NOTA]** A conciliação automática do `importCash` já faz algo parecido — por
coincidência de valor e mês — e **marca sem guardar com o quê casou** (2.7). O
assistente substitui isso por proposta explícita, com rastro.

## 8-A.3 · Sugerir o agrupamento

Caso que o vínculo um-para-um não cobria: um movimento de R$ 12.000 que
corresponde a **seis despesas** do mesmo fornecedor.

O assistente propõe o conjunto, mostra a soma, e aponta a diferença se houver.
É a substituição prática do Acerto Contábil.

## 8-A.4 · Explicar a diferença do dia

Quando os dois saldos não batem, o assistente diz **por quê**, nas quatro
naturezas de 1.3 — e aponta as linhas concretas, não o total.

*"Faltam R$ 1.240: um débito de R$ 1.150 no extrato sem lançamento, e uma
despesa de R$ 90 lançada e não conciliada."*

## 8-A.5 · Encaminhar o que falta cadastrar

Movimento do extrato sem contraparte: o assistente identifica o que parece ser —
fornecedor conhecido pelo histórico, valor compatível com uma conta a pagar
vencida — e **propõe o lançamento**, que acontece na tela dele.

É a Parte 7 operando: o cadastro se completa a partir do extrato.

## 8-A.6 · Análises

- **Dias que não fecham** — onde a cadeia de saldo quebrou, do mais antigo para
  o mais recente. O primeiro dia quebrado costuma explicar todos os seguintes.
- **Conciliado sem vínculo** — os `rec = true` de BL-2, por período.
- **Baixado e não conciliado** — por idade, com o total.
- **Extrato não importado** — contas sem importação recente, que é a causa mais
  comum de divergência.
- **Dias não fechados** — dias já conciliados e sem registro de fechamento, e
  dias abertos anteriores a um fechado.
- **Padrão de recorrência** — movimentos que se repetem todo mês e que o
  assistente pode antecipar como sugestão.

## 8-A.7 · Nunca

Conciliar sozinho. Dar baixa. Lançar ajuste de caixa. Alterar valor de despesa
para fazer fechar. Alterar movimento do extrato.

**O ajuste é o ponto mais sensível:** é o mecanismo que faz qualquer diferença
desaparecer, e um assistente que o use estaria escondendo o problema em vez de
mostrá-lo.

## 8-A.8 · O selo

Como o assistente propõe vínculo, não usar "Somente leitura". Redação que
descreva o que acontece: **ele propõe, você confirma**.

---

# 9. PRESERVAÇÃO DE DADOS

Nenhum `cash_entry`, `daily_closing` ou `carry_over` existente é alterado.
Nenhum vínculo atual é convertido. Nenhum `rec` é limpo. Nenhum `acerto` é
apagado. Nenhum saldo de conta é recalculado.

Migrações aditivas, com `IF NOT EXISTS` e `down`.

---

# 10. TESTES

1. Os dois saldos aparecem, por conta e no total, com a diferença.
2. Num dia inteiramente conciliado, os dois coincidem.
3. A diferença é classificada nas quatro naturezas.
4. O saldo acumulado **não** soma movimento já refletido no saldo da conta.
4a. Cada cartão exibe saldo inicial e saldo final.
4b. O saldo inicial de cada dia é **exatamente** o saldo final do dia anterior,
    em toda a janela.
4c. O primeiro cartão parte do saldo final do dia anterior à janela, não do
    saldo atual da conta.
4d. Num dia inteiramente conciliado, os saldos em conta e conciliado coincidem.
4e. Dias futuros mostram apenas projeção, rotulada.
5. Os cartões de dia respeitam o filtro de período, ou a tela declara que não.
5a. A tela exibe, por conta, a data e a origem da última atualização do saldo.
5b. Conta com atualização antiga aparece sinalizada.
5c. Importar extrato e configurar Open Finance estão acessíveis do topo.
5d. A tela não tem formulário de receita nem de despesa.
5e. Movimento sem contraparte encaminha para a tela certa, com os dados
    preenchidos.
5f. A tela tem duas abas: Conciliação e Ajustes.
5g. A rota `/fechamento` não existe, e o item saiu do menu.
5h. Fechar o dia é ação do cartão da cadeia.
5i. O saldo inicial de um dia vem do `saldo_final` gravado no fechamento
    anterior.
5j. Fechar um dia retroativo grava o saldo daquele dia, não o de hoje.
5k. Fechar o mesmo dia duas vezes é impedido.
5l. Cartão fechado mostra quem fechou, quando e a divergência registrada.
5m. A divergência é calculada, não digitada.
5n. Nenhuma linha nova é gravada em `carry_over`.
6. Dia passado com movimento pendente é distinguido de dia fechado.
7. Um depósito quita três parcelas, distribuindo o valor.
8. Um pagamento quita seis despesas de três obras.
9. A soma dos vínculos não excede o valor do movimento.
10. Conciliar movimento de R$ 1.000 com despesa de R$ 5.000 **não** marca a
    despesa como paga integralmente.
11. Conciliação com diferença não conclui.
12. `toggleConciliado` valida tenant, versão congelada e registra auditoria.
13. A importação grava vínculo quando a correspondência é inequívoca, e propõe
    quando há mais de um candidato.
14. Ajuste exige motivo e permissão própria, e exibe o aviso de boa prática.
14a. A aba Ajustes mostra o histórico com motivo, autor e saldo antes e depois.
15. Ajuste compõe o saldo conciliado e **não** altera o saldo do extrato.
16. Ajuste continua fora da DRE.
17. Desfazer conciliação exige permissão própria e preserva o movimento.
18. Baixa manual é possível e fica marcada como não conciliada.
19. `rec = true` sem vínculo aparece como estado próprio.
20. Movimento sem contraparte oferece o caminho de lançamento na tela certa.
20a. O assistente propõe pares com grau de certeza e motivo, e não concilia
    sozinho por nenhum caminho.
20b. O assistente propõe agrupamento de várias despesas para um movimento.
20c. O assistente explica a diferença do dia apontando as linhas, não o total.
20d. O assistente **não** lança ajuste de caixa em nenhuma hipótese.
21. Contas do tipo "Terceiros" não entram no saldo disponível.
22. **Antes e depois:** `cash_entry`, `bank_account` e `despesa` sem diferença.
23. **Antes e depois:** Dashboard, Fechamento e Contas a Pagar com os mesmos
    números, salvo onde a mudança de status derivado os altere — e então com o
    valor explicado.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado de BL-2 — quantos `rec = true` sem vínculo, por tenant e período.
   **Sem alterar nenhum.**
2. Decisão de BL-1 e BL-3.
3. Modelo de vínculo adotado, e como convive com as quatro colunas existentes.
4. Como o saldo conciliado é calculado e encadeado entre dias.
5. Como a correção do acumulado foi feita, e o efeito nos cartões.
6. Como as quatro naturezas de divergência são determinadas.
7. O que mudou em `toggleConciliado` e em `importCash`.
7a. Confirmação de que `addCash` com tipo receita ou despesa não é chamado de
   nenhum outro lugar — ou onde é.
7b. Como o encaminhamento leva data, valor e histórico à tela de destino.
8. Como o status derivado da despesa foi implementado, e o efeito em Contas a
   Pagar, Dashboard e Fechamento.
9. Como a permissão de desfazer foi modelada.
9a. Como a cadeia de saldo inicial e final foi calculada, e o teste que verifica
   a identidade entre dias.
9b. Funcionamento do assistente: como as sugestões são geradas, como o grau de
   certeza é determinado, e confirmação de que não há caminho de conciliação
   sem confirmação humana.
9c. O que a tela Balanço do Dia exibe, e confirmação de que o histórico de
   fechamentos continua consultável (9.8).
9d. Se há dias com mais de um fechamento em produção. **Sem apagar nenhum.**
9e. Confirmação de que `carry_over` parou de receber linha nova, e de que
   nenhuma existente foi apagada.
10. Confirmação de que a DRE continua sem ler `cash_entry`.
11. Confirmação de que a importação de extrato não foi alterada.
12. Comparação antes/depois das tabelas e dos números das telas dependentes.
13. Migrações criadas, com `down`.
14. Limitações encontradas.


<a id="prompt-y"></a>


========================================================================


### ▸ 23 de 42 · PROMPT Y — Estoque

**Bloco 3 · O lançamento** · Bloqueios: BY-1 · BY-2

========================================================================


# PROMPT Y — CONTROLE DE ESTOQUES

Growth Construction · `/estoque`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Nenhuma despesa,
permuta, competência ou valor lançado é tocado por esta tarefa.

**2 · Nada vindo de mockup entra no código.**

**[NOTA]** Em produção esta tela tem **zero itens e zero movimentos**. Não há
dado a preservar aqui — mas as tabelas que ela passa a referenciar têm.

---

# O QUE ESTA TAREFA FAZ

A tela existe, está incompleta e o que existe está errado. O trabalho é:

1. Corrigir o cálculo de saldo, que está **invertido**.
2. Criar o lançamento de entrada e saída, que **não existe**.
3. Vincular a entrada a uma despesa ou a uma permuta.
4. Exigir o projeto na saída.
5. Fechar as validações e a exclusão.

---

# BLOQUEIOS

## BY-1 · RESOLVIDO — controle físico, sem realocação de custo

**Decisão registrada: a saída não realoca custo.**

A entrada é vinculada a uma despesa, e **o custo daquela despesa já foi
reconhecido na competência e na obra dela**. A saída do material registra **onde
ele foi parar** — nada mais. A DRE não muda, nenhum lançamento é criado, nenhum
custo é transferido entre obras.

**A regra que permanece: a despesa continua vinculada à obra**, como já é hoje,
no lançamento em `/despesas`. O estoque não interfere nisso.

**O que isso permite depois.** Com a despesa apontando para uma obra e a saída
apontando para outra, os dois dados podem ser **confrontados**: comprou para a
obra 28, consumiu na 31. A divergência fica visível e é informação de gestão —
não correção automática.

Esse confronto é leitura, e o assistente o oferece (seção 7.3). **Ele nunca
altera lançamento.**

**[NOTA]** Se um dia a realocação for desejada, ela é tarefa própria e teria de
acontecer por lançamento de transferência — nunca editando a despesa original.
Ver a seção 8.

## BY-2 · Existe compra de material sem obra definida?

A despesa continua vinculada à obra, conforme BY-1. Mas se houver compra para o
almoxarifado **sem destino definido**, ela precisa de um projeto no lançamento —
e hoje o campo é obrigatório.

**Reportar, somente leitura:** quantas despesas de material existem por projeto,
e se há alguma lançada no projeto guarda-chuva de despesas gerais que seja, na
verdade, compra para estoque.

Isso não muda a implementação — muda o que o confronto da seção 4.6 vai mostrar.

---

# 1. O SALDO ESTÁ INVERTIDO

**1.1 · O defeito.** Em `estoque/page.tsx`:

```ts
const delta = m.tipo === "entrada" ? -qtd : qtd;
```

**Entrada subtrai. Saída soma.**

E o `Math.max(0, saldo)` esconde o resultado: um movimento de entrada produz
saldo negativo, e a tela mostra zero.

**1.2** O defeito nunca apareceu porque **nunca houve movimento**. No dia em que
o lançamento da seção 2 existir, ele aparece — e o `Math.max` faz parecer que
nada foi lançado.

**1.3 · Corrigir o sinal** e **remover o `Math.max`**. Saldo negativo é
informação: significa que saiu mais do que entrou, e precisa aparecer, não ser
escondido.

**1.4** O mesmo cálculo alimenta os cards "Valor em estoque" e "Abaixo do
mínimo". Os três ficam corretos com a mesma correção.

---

# 2. LANÇAMENTO DE ENTRADA E SAÍDA

**2.1 · O que falta.** A aba "Entradas & Saídas" apenas **lista**. Não há
formulário, e **nenhuma action insere em `stock_movement`** — zero INSERT em
todo o repositório.

**2.2 · Formulário próprio**, na aba, com: tipo (entrada ou saída), material,
quantidade, data, origem (seção 3) ou destino (seção 4), e observação.

**2.3 · O material vem da lista de cadastrados.** Uma vez cadastrado, aparece
entre as opções — é o que a tela promete e não entrega.

**2.4 · Valor sempre a custo.** O movimento é valorizado pelo **custo unitário
do material**, não por preço de venda. O valor do movimento é quantidade vezes
custo.

**[BLOQUEIO menor]** O custo unitário é campo do cadastro e pode mudar. Ao
lançar movimento, grava-se o custo do momento ou lê-se o do cadastro na
exibição? **Gravar** é o correto — senão alterar o cadastro reescreve o valor de
movimentos antigos, que é retroatividade.

**2.5 · Saldo não pode ficar negativo por saída maior que o disponível** —
avisar, e permitir com confirmação. Estoque de obra tem material que entra sem
registro; bloquear travaria a operação.

**2.6 · Editar e estornar movimento.** Não apagar: estorno por lançamento
inverso, no padrão que o Acerto já usa e que a ITG 2000 chama de retificação.

---

# 3. A ENTRADA VEM DE UMA DESPESA OU DE UMA PERMUTA

**3.1 · O vínculo já existe no schema.** `stock_movement` tem **`despesa_id`** e
**`permuta_id`**, ambos `set null`.

**E nenhum dos dois é gravado em lugar nenhum** — zero ocorrência em todo o
repositório. São intenção de desenho, não mecanismo.

**3.2 · Passam a ser obrigatórios na entrada.** Toda entrada aponta para uma
despesa **ou** para um ativo de permuta. Nunca as duas, nunca nenhuma.

**Por quê:** material entra no estoque porque foi comprado ou recebido. Entrada
sem origem é quantidade que apareceu do nada, e o valor dela não tem lastro.

**3.3 · O que o vínculo traz.** Selecionada a despesa, a tela exibe fornecedor,
competência, valor e projeto — para o usuário conferir que é a compra certa.

**3.4 · Uma despesa pode gerar várias entradas.** Uma nota com dez itens vira
dez movimentos apontando para o mesmo PED.

**3.5 · Avisar quando a soma dos movimentos exceder o valor da despesa.** Não
bloquear: pode haver frete, desconto, ou item lançado com custo aproximado.

**3.6 · A despesa não é alterada.** Nenhuma marcação, nenhum campo novo, nenhuma
reclassificação. O vínculo vive em `stock_movement`.

**[NOTA — fecha o BP-1 do Prompt P]** Aquele bloqueio pergunta se o inventário
de permuta deveria ser o Estoque. A resposta é **não, hoje**: o vínculo existe
no schema e nunca funcionou. Com esta tarefa, ele passa a existir — e aí a
pergunta pode ser reaberta.

---

# 4. A SAÍDA EXIGE PROJETO

**4.1 · Obrigatório.** Toda saída informa **para qual obra** o material foi.

**4.2 · Hoje não há vínculo com obra em lugar nenhum.** `stock_item` e
`stock_movement` são escopados apenas por tenant. Material da obra 28 e da 31
estão no mesmo saldo, e ninguém sabe para onde nada foi.

**Coluna nova em `stock_movement`**, aditiva, anulável — porque a **entrada** não
tem projeto: ela vem da despesa, que já tem o seu.

**4.3 · O item continua sendo do tenant.** O estoque é central; o projeto
aparece no movimento de saída, não no cadastro do material.

**[NOTA]** Se o estoque for por canteiro — cada obra com o seu —, o desenho é
outro: o projeto passa para `stock_item`, e transferência entre obras vira
operação própria. **Não implementar assim sem decisão.**

**4.4 · Consumo por obra.** Com o projeto na saída, a tela ganha a leitura que
justifica o módulo: quanto de material cada obra consumiu, no período.

**4.5 · Sem efeito contábil**, conforme BY-1. A saída **não** lança despesa, não
altera DRE e não reclassifica custo. É onde o material foi parar.

**A tela precisa dizer isso**, senão alguém vai supor que o consumo virou custo
da obra — e ele já é, pela despesa.

**4.6 · Confronto entre compra e consumo.** Com a despesa apontando para uma
obra e a saída apontando para outra, os dois dados podem ser comparados: quanto
cada obra **comprou** de material e quanto **consumiu**.

A divergência é informação de gestão — material comprado numa obra e usado em
outra —, e aparece como leitura. **Nunca como correção automática.**

Essa é a razão de a saída exigir projeto mesmo sem efeito contábil.

---

# 4-A. DOCUMENTOS DO MOVIMENTO

**4-A.1 · Por que.** A entrada de material tem papel e imagem: a nota do
fornecedor, o canhoto do romaneio assinado no recebimento, e a foto do que
chegou — quantidade, estado, avaria.

É esse conjunto que sustenta a conferência depois, quando a nota diz sessenta
sacos e chegaram cinquenta e oito.

**4-A.2 · Coluna nova.** `document` tem hoje `despesa_id`, `cliente_id`,
`stakeholder_id`, `project_id` e `unit_code`. **Não tem vínculo com movimento de
estoque.**

Acrescentar `stock_movement_id` — aditiva, anulável, `ON DELETE set null`.

**[NOTA]** Mesma coluna que os Prompts **K**, **P** e **V** pedem para conta a
receber, permuta e medição. Se forem implementados juntos, é uma migração só.

**4-A.3 · Vale para entrada e saída.** A entrada é o caso principal, mas a saída
também tem documento: a requisição assinada por quem retirou o material.

**4-A.4 · Tipos:** Nota do fornecedor · Romaneio ou canhoto de entrega · Foto do
recebimento · Requisição de saída · Outros.

**4-A.5 · Foto importa aqui mais que nas outras telas.** Material chega em
caminhão, e o registro do que desceu é imagem, não documento. A área de anexo
precisa aceitar várias imagens de uma vez, e exibi-las como miniatura na lista —
não como linha de arquivo.

**[BLOQUEIO menor]** Foto de recebimento vem do celular e costuma passar de
5 MB. O limite hoje varia entre as telas — 10, 15 e 20 MB. Verificar o limite
real do servidor e, se for baixo para foto, decidir se há compressão no envio.

**4-A.6 · O anexo da entrada não substitui o da despesa.** A nota fiscal já está
vinculada à despesa, em `documento_fiscal` e em `document`. O que se anexa aqui
é **o recebimento** — o que chegou, quando e em que estado.

A tela deve deixar isso claro: quem já anexou a nota na despesa não precisa
anexá-la de novo.

**4-A.7 · Versão por tipo**, como nas demais telas. Anexar do mesmo tipo cria
versão nova e preserva a anterior. **Não repetir o defeito da tela de
Clientes**, onde a versão é contada por registro e não por tipo.

**4-A.8 · Remover desfaz o vínculo, não apaga o arquivo.** A auditoria registra
nome e chave.

**4-A.9 · Estornar movimento não remove os documentos.** O movimento estornado
permanece legível, e o que foi anexado a ele continua acessível — é a prova do
que aconteceu, inclusive do erro.

**4-A.10** Segue a seção de anexos do `PADRAO-VISUAL.md`.

---

# 5. INTEGRIDADE

**5.1 · Validação do cadastro.** `addStockItem` não valida nada: nome vazio vira
`"Item"`, e custo com texto inválido vira zero — `Number(...) || 0`.

Nome obrigatório, custo não negativo, e `unidade` escolhida de uma lista em vez
de texto livre com default `"un"` — hoje o placeholder sugere "un, m, kg, sc" e
o campo aceita qualquer coisa.

**5.2 · Exclusão de item.** `deleteStockItem` é física e **apaga os movimentos
junto**, por cascata. Sem verificação, sem confirmação, sem auditoria — é uma
das treze actions que não chamam `logAudit`.

Passa a: recusar item com movimento, oferecendo inativar; exigir confirmação; e
auditar nome, SKU e saldo.

**5.3 · Retorno legível.** As duas actions fazem `return` silencioso sem
permissão. Converter para `{ ok, error }`.

**5.4 · Auditoria** em cadastrar, editar, movimentar e estornar.

**5.5 · Permissão de ver.** A tela não chama `can(..., "ver")`. **Oitava
ocorrência.** Acrescentar com `AccessDenied`.

**[NOTA]** A varredura completa é da seção 2.3 do **Prompt M**.

**5.6 · Desempenho.** `getStockItems` e `getStockMovements` carregam tudo, sem
paginação, e o saldo é recalculado em memória a cada render. Com movimentação
real, não escala. Paginar a lista de movimentos e calcular o saldo na consulta.

---

# 6. O MÓDULO

A tela fica no módulo **Obra**, junto com Medição de Obra, Lançar medição, Ponto
e Parâmetros / INCC.

Estoque de material é instrumento de obra, não de despesa.

---

# 7. ASSISTENTE DE IA

Segue o **Prompt E**. **Propõe e para** — a entrada vinculada à despesa é o
caso em que a sugestão poupa mais trabalho.

**7.1 · Ler a nota e propor as entradas.** A despesa já tem o documento fiscal
anexado. O assistente lê os itens da nota e **propõe** um movimento de entrada
para cada, com material, quantidade e custo.

O usuário confere, ajusta o que não casou com o cadastro, e confirma. **A
gravação é dele.**

É o mesmo padrão da extração de despesa, que já funciona — e aqui resolve o
problema de digitar dez itens de uma nota.

**7.2 · Material não cadastrado.** Se o item da nota não existir no cadastro, o
assistente **propõe o cadastro**, não o cria.

**7.3 · Análises**

- **Abaixo do mínimo** — itens que precisam de reposição, com o consumo médio.
- **Sem movimento** — cadastrados e parados há muito tempo.
- **Consumo por obra** — quanto cada projeto retirou no período.
- **Entrada sem origem** — movimentos sem despesa nem permuta, se houver algum
  vindo de antes desta tarefa.
- **Divergência de valor** — despesas cuja soma das entradas não bate com o
  valor lançado.
- **Entrada sem comprovação** — movimentos de entrada sem nenhum documento nem
  foto anexada, por período.

**7.4 · Nunca:** lançar movimento sem confirmação, excluir item, estornar
movimento, e criar material sozinho.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Realocação de custo entre obras | **descartada** — ver BY-1. Se um dia for desejada, por lançamento de transferência |
| Estoque por canteiro | ver nota de 4.3 — não decidido |
| Inventário de ativos de permuta | Prompt P, seção 5 |
| Varredura de permissão em todas as rotas | Prompt M, seção 2.3 |

---

# 9. PRESERVAÇÃO DE DADOS

Nenhuma despesa, permuta, parcela ou lançamento é alterado. O vínculo vive
inteiramente em `stock_movement`.

Migrações — projeto na saída, custo gravado no movimento — aditivas, com
`IF NOT EXISTS` e `down`.

**[NOTA]** Como a tela tem zero registros em produção, não há migração de dado
próprio. Mas as tabelas que ela passa a referenciar têm dado, e nenhuma é
tocada.

---

# 10. NÃO REGRESSÃO

**Nada no repositório lê `stock_item` ou `stock_movement` fora desta tela** —
nem DRE, nem Dashboard, nem relatório, nem backup. É ilha.

Confirmado: nenhuma outra tela muda com esta tarefa.

---

# 11. TESTES

1. Entrada **aumenta** o saldo; saída **diminui**.
2. Saldo negativo aparece, não é escondido por `Math.max`.
3. "Valor em estoque" e "Abaixo do mínimo" refletem o saldo correto.
4. É possível lançar entrada e saída pela tela.
5. Material cadastrado aparece entre as opções do movimento.
6. Entrada sem despesa nem permuta é recusada.
7. Entrada com as duas é recusada.
8. Uma despesa pode gerar várias entradas.
9. Soma das entradas acima do valor da despesa **avisa**, sem bloquear.
10. Saída sem projeto é recusada.
10a. A saída **não** cria despesa, não altera DRE e não reclassifica custo.
10b. O confronto entre compra e consumo por obra aparece como leitura.
11. Alterar o custo do cadastro **não** altera o valor de movimentos já
    lançados.
12. Saída maior que o saldo avisa e permite com confirmação.
13. Estornar movimento cria lançamento inverso e não apaga o original.
13a. Estornar não remove os documentos anexados ao movimento.
13b. Anexar documento do mesmo tipo gera versão nova; tipo diferente não herda.
13c. Várias imagens podem ser enviadas de uma vez e aparecem como miniatura.
13d. Remover documento registra nome e chave em auditoria, e não apaga o
    arquivo.
14. Excluir item com movimento é recusado, com opção de inativar.
15. Nome vazio é recusado — não vira "Item".
16. Sem permissão de ver, a tela não é acessível por URL direta.
17. Assistente não grava movimento nem cria material sem confirmação.
18. **Antes e depois:** nenhuma despesa, permuta ou lançamento alterado.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Confirmação de que a saída não gera lançamento contábil de nenhum tipo.
2. Resposta de BY-2 — distribuição das despesas de material por projeto.
3. Confirmação da correção do sinal, e do que os cards passaram a exibir.
4. Como o vínculo com despesa e permuta foi implementado, e como a
   obrigatoriedade é garantida no servidor.
5. Como o custo é gravado no movimento.
6. Estrutura criada: colunas e migrações, com `down` — incluindo
   `stock_movement_id` em `document`.
6a. Qual é o limite real de tamanho de arquivo no servidor, e se foi necessário
   tratar foto de celular.
7. Funcionamento do assistente, e confirmação de que não grava sem
   confirmação.
8. Confirmação de que nenhuma despesa ou permuta foi alterada.
9. Confirmação de que nenhuma outra tela mudou.
10. Limitações encontradas.


<a id="prompt-z"></a>


========================================================================


### ▸ 24 de 42 · PROMPT Z — Módulo Pessoas

**Bloco 3 · O lançamento** · Bloqueios: BZ-1 · BZ-2 · BZ-3 · BZ-4

========================================================================


# PROMPT Z — MÓDULO PESSOAS

Growth Construction · módulo novo. Rotas sugeridas `/funcionarios` e
`/equipes`. Extingue `/ponto`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/ponto` | Ponto da Obra | **extinta** | este prompt, Parte 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Cadastros,
despesas, lançamentos e vínculos existentes permanecem como estão.

**2 · Nada vindo de mockup entra no código.**

**3 · Dado pessoal de trabalhador tem tratamento próprio.** CPF, PIS, endereço
residencial, salário e geolocalização não vão a log em claro nem ao contexto do
assistente. Ver seção 7.

---

# O DESENHO

**Três lugares, três naturezas:**

| Quem | Onde se cadastra | Por quê |
|---|---|---|
| **Autônomos** — engenheiro, mestre de obra, pedreiro | **Fornecedores** | prestam serviço à empresa; emitem nota ou recibo |
| **CLT** | **Pessoas › Funcionários** | vínculo empregatício, com dados próprios |
| **Sócios gestores** | **Fornecedores**, papel Sócio/Quotista | já existe |

**E um lugar onde os três se encontram: Pessoas › Equipes de Projetos.** Ali se
aloca quem trabalha em cada obra, com a função, e se controla a diária
executada.

**O cadastro não se duplica.** A equipe **referencia** o cadastro de origem —
`stakeholder` para autônomo e sócio, `funcionario` para CLT. Nunca copia nome,
documento ou contato.

---

# BLOQUEIOS

## BZ-1 · A diária gera despesa?

A tela `/ponto` gerava **conta a pagar** pelos dias trabalhados, multiplicando
dias por valor de diária.

**Responder:** o controle de diárias das Equipes mantém isso?

**Se sim**, é a mesma pergunta que atravessa o sistema: o custo nasce aqui ou é
lançado em `/despesas`? A decisão que a gente já tomou em Ressarcimentos e
Cartões foi **uma porta só de lançamento** — a tela de Despesas.

**Recomendação:** a Equipe **registra a diária executada** e **propõe** o
lançamento, que acontece em `/despesas`, com o autônomo como fornecedor. Assim a
despesa nasce com competência, categoria, conta CEF e documento fiscal — coisas
que a apuração automática não tinha.

**Se não**, o controle é de presença, e o pagamento é lançado à parte.

**[NOTA]** Para **CLT** a pergunta não se aplica: salário é mensal, apurado em
folha, e este sistema não tem folha. Ver BZ-2.

## BZ-2 · O que o cadastro de CLT guarda, e o que o sistema faz com isso

**O sistema não tem folha de pagamento.** Não calcula INSS, FGTS, IRRF, férias,
décimo terceiro nem rescisão.

**Responder:** o cadastro de Funcionários é **registro** — quem trabalha na
empresa, em qual função, desde quando — ou pretende alimentar cálculo?

**Recomendação: registro.** Nome, CPF, cargo, data de admissão, obra ou setor,
e situação. O custo da folha entra no sistema como **despesa lançada em
`/despesas`**, pelo valor que a contabilidade apurar.

**[IMPORTANTE — dado sensível]** Se o cadastro guardar **salário**, ele entra na
mesma classe dos dados financeiros de comprador: **permissão própria**, não vai
ao assistente, e não aparece em claro no `audit_log`. Ver **Prompt M, BM-3**.

**[RESOLVIDO]** O cadastro de CLT guarda **salário e jornada**, conforme a ficha
do artigo 41 — com permissão própria. Ver 2.2.

**O autônomo é diferente:** não tem salário nem jornada. Tem **valor de
diária**, no cadastro de Fornecedores, e o controle de diárias executadas nas
Equipes. Ver 3.5.

## BZ-3 · A lista de funções é fechada?

O usuário citou: Pedreiro, Mestre de Obra, Comercial, Gestor Administrativo,
Engenheiro.

**Responder:** lista fechada, ou o usuário cria funções novas?

**Recomendação:** lista fechada, editável em Configurações. Texto livre faz
"Pedreiro", "pedreiro" e "Pedrero" conviverem, e o controle por função deixa de
funcionar.

**[NOTA]** Não confundir com os **papéis** de `stakeholder`, que dizem o que a
pessoa **é** para a empresa. A função diz o que ela **faz naquela obra**. A
mesma pessoa pode ser Mestre de Obra na 28 e Pedreiro na 31.

## BZ-4 · O que acontece com `time_entry`

A tabela existe e tem **zero registros** em produção. A obra não tem localização
cadastrada e ninguém bateu ponto.

**Confirmar a contagem antes de qualquer coisa.** Se houver registro em algum
tenant, ele precisa de destino antes de a tela sair.

**A tabela não é apagada em nenhum cenário**, conforme a regra global.

---

# PARTE 1 — EXTINÇÃO DO PONTO

## 1.1 · O que sai

A rota `/ponto` deixa de existir, e o item sai do menu.

**Motivo:** o modelo era de **diária por geolocalização**, com apuração
automática gerando conta a pagar. Ele não cobre jornada de CLT — não tem hora
extra, intervalo nem adicional noturno — e, para autônomo, o controle por GPS é
mais rígido do que a operação precisa.

O módulo Pessoas resolve os dois casos sem geolocalização.

## 1.2 · Os defeitos que morrem junto

Vale registrar, porque eles explicam por que a substituição é melhor que a
correção:

**A apuração contava só entradas.** `diasElegiveis` conta registros de
`tipo = "entrada"` não apurados, e **nunca marca a saída como apurada** — as
saídas ficariam pendentes para sempre. E um dia com entrada e sem saída contava
como dia trabalhado.

**A diária multiplicava por registros, não por dias.** `dias.size` conta dias
distintos, mas o valor usa `dias.length`. Duas entradas no mesmo dia geravam
duas diárias.

**A conta a pagar nascia sem fornecedor.** `criarDespesaSimples` era chamada sem
`fornecedorId`, com o nome concatenado na descrição. A despesa de mão de obra
não apontava para o cadastro de ninguém.

**Nenhum apareceu porque a tela nunca foi usada.**

## 1.3 · O que é preservado

`time_entry` permanece no banco, com o que tiver. Nenhum registro é apagado,
convertido ou migrado.

Se houver registro em algum tenant, ele fica acessível por consulta ao banco — e
o relatório final diz quantos são.

---

# PARTE 2 — PESSOAS › FUNCIONÁRIOS

## 2.1 · O que é

Cadastro dos **CLT** da empresa. Ver BZ-2 para o escopo.

## 2.2 · Campos — a ficha de registro

O artigo 41 da CLT obriga o registro dos trabalhadores, e permite que seja em
livro, ficha ou **sistema eletrônico**. O cadastro desta tela é esse arquivo de
apoio — **não substitui o eSocial**, que é o registro oficial.

**Identificação**
Nome completo, data de nascimento, nacionalidade, estado civil, nome da mãe,
foto.

**Documentos, com número**
CPF · RG com órgão emissor e UF · **CTPS: número e série** · **PIS/PASEP** ·
título de eleitor · certificado de reservista, quando aplicável · CNH, quando a
função envolver condução de veículo da empresa.

**Endereço residencial completo.** Não é exigência estrita da CLT, mas integra o
contrato, o cadastro no eSocial, a ficha de salário-família e o vale-transporte.

**Contrato**
Data de admissão · cargo ou função · setor ou obra · tipo de contrato, com prazo
determinado ou indeterminado · jornada · data de desligamento, quando houver ·
situação.

**Dependentes**, quando houver: nome, data de nascimento, parentesco e se é
dependente para imposto de renda ou para salário-família.

**Dados bancários** para pagamento.

**Salário e jornada — DECIDIDO: o cadastro guarda os dois.** É o que a ficha do
artigo 41 exige, e o cadastro serve de arquivo de apoio.

**Ambos entram com permissão própria**, fora do log e fora do assistente, como
os dados financeiros de comprador no Prompt M. Quem não tiver a permissão **não
recebe os valores do servidor** — não basta ocultar na interface.

**O sistema continua sem folha de pagamento.** Guardar o salário é registro, não
cálculo: nada de INSS, FGTS, IRRF, férias, décimo terceiro ou rescisão.

---

## 2.2-A · Documentos do funcionário

**2.2-A.1 · Por que anexar.** A admissão exige um conjunto de documentos, e o
empregador precisa tê-los arquivados para fiscalização do Ministério do Trabalho
e para eventual processo trabalhista.

**2.2-A.2 · Tipos, conforme a prática de admissão:**

| Tipo | Observação |
|---|---|
| Documento de identidade | RG ou CNH |
| CPF | |
| CTPS | digital ou física |
| Comprovante de PIS/PASEP | |
| Título de eleitor | |
| Certificado de reservista | quando aplicável |
| Comprovante de endereço | |
| Comprovante de escolaridade | |
| Foto 3×4 | |
| **ASO — exame admissional** | **obrigatório antes do início das atividades**, art. 168 da CLT e NR-7 |
| Contrato individual de trabalho | fornecido pela empresa |
| Declaração de dependentes para IR | |
| Declaração de vale-transporte | opção ou recusa |
| Certidão de casamento | quando aplicável |
| Certidão de nascimento de filhos | salário-família |
| ASO periódico, de retorno ou demissional | |
| Outros | |

**2.2-A.3 · O ASO é dado de saúde.** Atestado de saúde ocupacional é informação
médica, e recebe o tratamento mais restrito da tela: **permissão própria**,
separada da permissão de ver o funcionário; **nunca** enviado ao assistente; e
**nunca** com conteúdo em log.

**2.2-A.4 · Foto de documento é imagem de identidade.** A área aceita várias
imagens de uma vez, com miniatura — mesmo tratamento do **Prompt Y**, seção 4-A
—, e o acesso segue a permissão de ver documento do funcionário.

**2.2-A.5 · Checklist de admissão.** A tela indica quais tipos obrigatórios
faltam, com destaque para o **ASO**, que precisa existir **antes** do início das
atividades.

Isso é conferência, não bloqueio: o cadastro pode ser salvo incompleto, e a
pendência fica visível.

**2.2-A.6 · Versão por tipo**, e remover desfaz o vínculo sem apagar o arquivo.
Documento vencido — ASO periódico, CNH — permanece como versão anterior.

**2.2-A.7 · Vencimento.** ASO e CNH têm validade. Campo de data de validade por
documento, com aviso quando estiver perto de vencer.

---

## 2.2-B · Folha de pagamento e encargos

**2.2-B.1 · O que é.** Arquivo mensal dos documentos de folha: a folha em si, os
holerites, e os comprovantes de pagamento da folha e dos encargos — INSS, FGTS,
IRRF.

**2.2-B.2 · É por competência, não por funcionário.** A folha é documento da
**empresa**, de um mês. Vinculá-la a cada funcionário multiplicaria o mesmo
arquivo por todos.

**Estrutura:** um registro por competência, com os documentos anexados. O
**holerite individual**, se houver, é o único que se vincula ao funcionário.

**2.2-B.3 · Tipos:** Folha de pagamento · Holerite individual · Comprovante de
pagamento da folha · Guia e comprovante de INSS · Guia e comprovante de FGTS ·
Guia e comprovante de IRRF · Outros encargos.

**2.2-B.4 · O pagamento é despesa, e ela se lança em `/despesas`.** Esta tela
guarda o **documento**; o custo entra pelo lançamento, com competência, conta
CEF e categoria.

**Vincular o registro de folha à despesa** que a pagou — coluna aditiva — para
que o comprovante não precise ser anexado duas vezes.

**A tela deve dizer isso**, senão alguém anexa o comprovante aqui e lança a
despesa sem documento, ou o contrário.

**2.2-B.5 · Conferência.** A tela aponta competências com folha arquivada e sem
despesa vinculada, e o inverso — despesa de folha lançada sem documento
arquivado.

**2.2-B.6 · Onde fica.** Seção própria em Funcionários, ou tela separada dentro
de Pessoas. **Recomendação:** seção própria, porque o volume é de doze registros
por ano.

---

## 2.3 · Tabela nova

`funcionario`, escopada por tenant. **Não reusar `stakeholder`:** CLT não é
fornecedor, não emite nota, e misturar os dois faria a lista de fornecedores
crescer com quem nunca vai receber pagamento por nota.

## 2.4 · Desligamento em vez de exclusão

Funcionário desligado **não some** — ele fica com data de desligamento e sai das
listas de alocação. O histórico de equipes em que ele esteve permanece.

**Excluir** só quando não houver nenhuma alocação, com confirmação por digitação
do nome e auditoria.

## 2.5 · Validação

Nome obrigatório. CPF validado no formato — **reusar o validador que o
Prompt W cria**, não escrever outro. Duplicidade de CPF **avisa**, não bloqueia.

---

# PARTE 3 — PESSOAS › EQUIPES DE PROJETOS

## 3.1 · O que é

A tela onde se aloca quem trabalha em cada obra, com a função, e onde se
controla a diária executada.

## 3.2 · Estrutura

Selecionado o projeto, a tela lista a equipe: cada membro com origem, função,
data de entrada e saída da equipe, e situação.

**Tabela nova** `equipe_projeto`, com: `project_id`, a **origem**
(`stakeholder_id` **ou** `funcionario_id` — um dos dois, nunca os dois), a
função, o **valor da diária**, as datas e a situação.

**O valor da diária é nulo para CLT e sócio** — o custo deles é a folha ou a
retirada, não a diária. Ver 3.5.4.

## 3.3 · Quem pode ser alocado

**Autônomos** — `stakeholder` com papel de prestador de serviço ou mão de obra.
**CLT** — `funcionario` ativo.
**Sócios gestores** — `stakeholder` com papel Sócio/Quotista.

**O seletor mostra a origem** de cada um, para não confundir dois homônimos de
cadastros diferentes.

## 3.4 · A função

Escolhida por alocação, não por pessoa — ver BZ-3. A mesma pessoa pode ter
funções diferentes em obras diferentes.

## 3.5 · Controle de diárias

**3.5.1** Registro da diária executada por membro: data, quantidade — inteira ou
meia —, e observação.

**3.5.2 · Lançamento em lote.** Na prática o encarregado registra o dia inteiro
de uma vez: marca quem trabalhou e confirma. A tela precisa disso, senão vira
digitação um a um.

**3.5.3 · Sem geolocalização.** É o que a tela antiga fazia e o que se
descontinua. O registro é declaração de quem coordena a obra.

**3.5.4 · O valor da diária é da alocação.**

**Decisão registrada:** o valor vive em `equipe_projeto`, não no cadastro do
fornecedor.

**Por quê:** o mesmo pedreiro pode valer diferente em obras diferentes, e pode
valer diferente na mesma obra em momentos diferentes. Um valor único no cadastro
seria uma média que não corresponde a nenhum contrato real.

**O cadastro de Fornecedores não tem campo de diária.** Ver **Prompt W**.

**O valor é gravado no registro da diária**, não lido da alocação na exibição.
Alterar o valor da alocação vale para os **próximos** registros; os anteriores
permanecem com o valor do dia em que foram lançados.

É a mesma regra do custo unitário no **Prompt Y**, seção 2.4: alterar cadastro
não reescreve histórico.

**[NOTA — mudança de valor no meio do período]** Se o valor mudar em 15 de
setembro, as diárias de 1 a 14 ficam com o valor antigo e as seguintes com o
novo. Isso é o correto, e a tela precisa deixar visível qual valor está vigente
ao registrar.

**[NOTA — CLT não tem diária.]** Funcionário alocado numa equipe entra para
registro de presença e função. O custo dele é a folha, mensal, e não se mistura
com o controle de diárias do autônomo.

**3.5.5 · Acumulado por membro e por período**, com o total da equipe.

**3.5.6 · Ver BZ-1** para o que acontece com o pagamento.

## 3.6 · Documentos e fotos

**3.6.1 · Coluna nova** em `document`: vínculo com o registro de diária.

**[NOTA]** Os Prompts **K**, **P**, **V** e **Y** pedem colunas equivalentes para
conta a receber, permuta, medição e movimento de estoque. Se forem implementados
juntos, é uma migração só.

**3.6.2 · Tipos:** Folha de ponto assinada · Foto da equipe no canteiro ·
Recibo de diária · Outros.

**3.6.3 · Foto tem peso aqui.** O registro de quem esteve na obra é, na prática,
a foto do dia. A área aceita várias imagens de uma vez e exibe miniatura — mesmo
tratamento do **Prompt Y**, seção 4-A.

**3.6.4 · Versão por tipo**, e remover desfaz o vínculo sem apagar o arquivo.

**3.6.5 · Anexo por dia, não por membro.** A folha de ponto e a foto cobrem a
equipe inteira daquele dia. Vincular por membro multiplicaria o mesmo arquivo.

---

# PARTE 4 — O QUE MUDA EM FORNECEDORES

**Ver Prompt W**, que é dono daquela tela.

**4.1 · Autônomo com CNPJ é o preferido.** Mestre de obra, engenheiro e pedreiro
que emitam nota entram como PJ.

**4.2 · Sem CNPJ, CPF mais endereço residencial.** O endereço passa a ser
**exigido** quando o tipo for PF e o papel for de prestação de serviço ou mão de
obra — é o que sustenta o RPA e o recibo.

**[NOTA]** `stakeholder` já tem os campos de endereço. O que muda é a
obrigatoriedade condicional.

**4.3 · Nenhum cadastro existente é alterado** por causa dessa regra. Cadastro
antigo sem endereço continua válido e editável, sinalizado na tela.

---

# 5. O MÓDULO NO MENU

**Pessoas** é módulo novo, com **Funcionários** e **Equipes de Projetos**.

**Ponto da Obra** sai. Ver **Prompt C**.

**Posição sugerida:** depois de Obra, antes de Relatórios — é operação de obra,
não de relatório.

---

# 6. ASSISTENTE DE IA

Segue o **Prompt E**. **Um painel por tela**, com funções distintas.

## 6.1 · Em Funcionários — somente leitura

- **Cadastro incompleto** — sem CPF, sem cargo, sem data de admissão.
- **Desligados ainda alocados** — funcionário com data de desligamento e
  alocação ativa em alguma equipe.
- **CPF duplicado** — entre funcionários, e **entre funcionário e fornecedor**.
  É o caso real: alguém cadastrado como autônomo que virou CLT.
- **Documentos de admissão faltando** — por funcionário, com destaque para o
  **ASO**, que a lei exige antes do início das atividades.
- **Documentos vencendo** — ASO periódico e CNH, com a data de validade.
- **Folha sem despesa, despesa sem folha** — competências em que o documento
  está arquivado e o pagamento não foi lançado, e o contrário.

**Nunca:** cadastrar, editar, desligar ou excluir. **E nunca ler documento
anexado** — nem o de identidade, nem o ASO. O assistente sabe **que tipo
existe**, não o que está dentro.

## 6.2 · Em Equipes de Projetos — propõe e para

- **Registrar as diárias do dia** — a partir da equipe alocada, o assistente
  **propõe** a lista de quem trabalhou, e o usuário confirma ou ajusta. É o que
  transforma o lançamento em lote em um clique.
- **Ler a folha de ponto anexada** — extrai os nomes e os dias do documento e
  **propõe** os registros. Não grava.
- **Diárias sem lançamento de pagamento** — conforme BZ-1, membros com diárias
  registradas e sem despesa correspondente.
- **Obra sem equipe** — projetos ativos sem ninguém alocado.
- **Alocação sem função** — e alocações que se sobrepõem no tempo para a mesma
  pessoa em obras diferentes, que pode ser legítimo ou erro.

**Nunca:** gravar diária sem confirmação, alocar ou desalocar membro, e lançar
despesa.

## 6.3 · O que nenhum dos dois recebe

CPF, endereço residencial, salário, dados bancários, dependentes e qualquer dado
de folha. **Nenhum documento anexado é lido** — nem identidade, nem ASO.

O assistente opera sobre **nomes, datas, tipos e quantidades**. Ele sabe que
falta o ASO; não sabe o que o ASO diz.

**É a diferença entre esta tela e as demais:** em Despesas e Estoque o
assistente lê o documento porque ele é comercial. Aqui o documento é pessoal, e
parte dele é médico.

---

# 7. DADO PESSOAL

**7.1** CPF de trabalhador segue a regra da tela de Clientes: mascarado na
listagem, completo apenas na ficha e para quem tem permissão.

**7.2** Endereço residencial e dados de folha, se houver, ficam atrás de
**permissão própria**, e **não são enviados do servidor** para quem não a tem —
não basta ocultar na interface.

**7.3** O `audit_log` registra que o campo mudou, **não o valor** desses campos.

**7.3-A · O ASO tem o tratamento mais restrito da tela.** Atestado de saúde
ocupacional é **dado de saúde**: permissão própria, separada da de ver o
funcionário; nunca enviado ao assistente; nunca com conteúdo em log; e o
histórico de quem o acessou fica registrado.

**7.3-B · Fotos de documento são imagens de identidade.** RG, CPF e CNH
digitalizados seguem a permissão de ver documento do funcionário, e não são
enviados ao assistente em nenhuma hipótese — nem para leitura.

**7.3-C · Retenção.** Documento trabalhista tem prazo de guarda próprio, e ele
não é o mesmo para todos os tipos. **Definir com o contador** e registrar por
tipo. Esta tarefa não apaga nada automaticamente.

**7.4 · A geolocalização morre com a tela antiga.** O módulo novo não coleta
posição, e isso é deliberado: registrar onde uma pessoa esteve, com data e hora,
é tratamento que exige base legal, retenção definida e restrição de acesso — e
nada disso existia.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Folha de pagamento, encargos e rescisão | **não é deste sistema** |
| Lançamento da despesa da diária | `/despesas`, ver BZ-1 |
| Obrigatoriedade condicional de endereço | Prompt W, Parte 4 |
| Validador de CPF | Prompt W, seção 3.2 |
| Jornada, hora extra e adicional noturno | **fora** — o modelo é de diária |

---

# 9. PRESERVAÇÃO DE DADOS

`time_entry` permanece intacta. Nenhum `stakeholder` é alterado, convertido em
funcionário ou duplicado. Nenhuma despesa gerada pela apuração antiga é tocada.

Todas as migrações são aditivas, com `IF NOT EXISTS` e `down`.

---

# 10. TESTES

1. A rota `/ponto` não existe, e o item saiu do menu.
2. `time_entry` permanece no banco, com a mesma contagem de antes.
3. Funcionário CLT é cadastrado em Funcionários, não em Fornecedores.
4. Autônomo continua em Fornecedores.
5. A equipe referencia o cadastro de origem — não copia nome nem documento.
6. Uma alocação aponta para `stakeholder` **ou** `funcionario`, nunca os dois.
7. A mesma pessoa pode ter funções diferentes em obras diferentes.
8. Funcionário desligado sai das listas de alocação e permanece no histórico.
9. Diária em lote registra a equipe inteira de uma vez.
10. A diária tem valor **por alocação**, não por pessoa — e o cadastro de
    Fornecedores não tem esse campo.
10a. Alterar o valor da alocação não reescreve diárias já registradas.
10b. Alocação de CLT ou sócio não pede valor de diária.
11. Documento e foto são anexados **por dia**, não por membro.
12. Várias imagens podem ser enviadas de uma vez.
13. CPF é mascarado na listagem.
14. Quem não tem a permissão **não recebe do servidor** endereço nem dados de
    folha.
15. O `audit_log` não contém CPF nem salário em claro.
16. Nenhum assistente recebe CPF, endereço, salário ou dados bancários.
16a. Nenhum assistente lê documento anexado do funcionário.
16b. O ASO exige permissão própria, separada da de ver o funcionário.
16c. Quem não tem essa permissão **não recebe do servidor** nenhuma referência
    ao ASO.
16d. O checklist aponta documentos faltantes sem bloquear o cadastro.
16e. Documento com validade avisa quando estiver perto de vencer.
16f. A folha é arquivada por competência, e o holerite por funcionário.
16g. Vincular a folha à despesa dispensa anexar o comprovante duas vezes.
17. O assistente de Equipes não grava diária sem confirmação.
18. Nenhuma tela do módulo coleta geolocalização.
19. **Antes e depois:** `stakeholder`, `despesa` e `time_entry` sem nenhuma
    diferença.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisões de BZ-1 a BZ-4.
2. Quantos registros existem em `time_entry`, por tenant. **Sem apagar.**
3. Se alguma despesa foi gerada pela apuração antiga, e quantas.
4. Estrutura criada: tabelas, colunas e relações.
5. Como a alocação garante origem única no servidor.
6. Como o lançamento em lote de diárias funciona.
7. Como os campos sensíveis foram separados na consulta, não só na interface.
7a. Como a permissão do ASO foi modelada, e como o acesso é registrado.
7b. Prazo de guarda definido por tipo de documento, e confirmação de que nada é
   apagado automaticamente.
8. Funcionamento dos dois assistentes, e confirmação do que não vai ao modelo.
9. Confirmação de que nenhuma geolocalização é coletada.
10. Confirmação de que nenhum cadastro existente foi alterado ou duplicado.
11. Migrações criadas, com `down`.
12. Limitações encontradas.


<a id="prompt-b"></a>


========================================================================


### ▸ 25 de 42 · PROMPT B — Projetos

**Bloco 4 · Planejamento e obra** · Bloqueios: B-1 · B-2 · B-3

Fecha o A-07: sem período, não há grade mensal.

========================================================================


# PROMPT B — Redesenho da seção PROJETOS & UNIDADES → PROJETOS

Growth Construction · `/projeto` — a listagem e o detalhe do projeto, que
convivem na mesma rota, com `?proj=<projectId>` selecionando a obra aberta.


---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---
## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum número já lançado no sistema pode ser alterado.**
Valores, totais, percentuais, saldos, datas e quantidades existentes em
produção permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda,
converte, normaliza, migra, reclassifica ou "corrige" um número já gravado —
nem como efeito colateral de mudança de layout, de rota, de nome de campo ou de
origem de dado. Se uma alteração exigir tocar em número lançado: **PARE, não
execute, e informe qual número, por quê e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups e capturas de tela definem **layout, hierarquia visual, rótulos e
comportamento de interface** — nada além disso. São ilustrações, frequentemente
com números inconsistentes entre si.

Nunca usar de um mockup: valores monetários, percentuais, totais, saldos, datas,
prazos, nomes de obra, nomes de cliente, nomes de proprietário, endereços,
coordenadas, nomes de usuário, cargos, contadores, badges numéricos, ou qualquer
outro dado de exemplo.

Nunca criar registro, seed, fixture, valor padrão ou dado de teste a partir de
um mockup. Nenhum dado de exemplo é gravado no banco de produção em nenhuma
hipótese.

Todo número exibido em tela vem do banco. Onde não houver dado, a tela mostra
estado vazio — **nunca zero, nunca placeholder numérico, nunca o valor do
mockup**.

**Aplicação específica a este prompt:** o endereço, o município, o CEP, as coordenadas e todos os valores
do bloco Orçado × Realizado (valores monetários e percentuais) são
**ilustração de mockup** [valores removidos]. Nenhum deles entra
no código, em fixture, em valor padrão ou em teste.

---

Growth Construction · versão consolidada.

> **Como ler este documento**
> As seções 0 a 47 são o prompt original.
> Marcações inseridas na revisão de código:
> - **[BLOQUEIO]** — decisão necessária ANTES de implementar. Não prosseguir sem resposta.
> - **[ACRÉSCIMO]** — requisito novo, vindo da revisão da tela em produção.
> - **[NOTA]** — informação técnica que muda como o item deve ser implementado.

---

# BLOQUEIOS — RESPONDER ANTES DE ESCREVER CÓDIGO

Uma decisão em aberto. Se ficar sem resposta, **PARE** e pergunte.

## DEPENDÊNCIA OBRIGATÓRIA — O PROMPT A VEM ANTES

Existe um prompt anterior a este: **PROMPT A —
`PROMPT-A-REFATORACAO-CONTEXTO.md`**, que remove o conceito de projeto ativo
global de todo o sistema e cria o status Ativo/Finalizado.

**Este prompt (B) só pode ser implementado depois que o A estiver em produção.**

Motivo: a seção 4 deste prompt remove o botão "Selecionar", que é hoje o único
ponto onde o usuário troca de obra. Enquanto o projeto ativo global existir,
removê-lo deixa a operação presa à obra gravada no cookie, sem conseguir lançar
em nenhuma outra.

**Divisão de responsabilidade**, para os dois não colidirem na mesma migração:

| Assunto | Dono |
|---|---|
| Coluna de situação (`Ativo`/`Finalizado`) e sua migração | **A** |
| Remoção de `setActiveProject`, `SelectActive`, `activeId`, cookies | **A** |
| Assinatura das Server Actions (parâmetros explícitos) | **A** |
| Ordenação da lista de projetos | **A** |
| Layout, blocos visuais, cores, IA, Orçado x Realizado | **B** |
| Formato de retorno das actions (`{ ok, error }`) | **B** |
| Proteção de interface do botão Excluir | **B** |

Este prompt **consome** a coluna de situação criada no A; não a cria.

## B-1 · RESOLVIDO — ver Prompt A

A pergunta era onde o usuário passaria a trocar de obra. A resposta é o Prompt
A: cada tela que precisa de obra ganha seletor próprio, com `projectId`
explícito na URL, e nenhuma seleção vira contexto global.

Consequências para este prompt:

- A seção 4 continua válida, mas **quem a executa é o Prompt A**. Aqui, a tela
  apenas nasce já sem `SelectActive`, `activeId` e `setActiveProject`.
- Se por qualquer motivo o Prompt A não tiver ido para produção, **PARE**: este
  prompt não pode ser implementado antes.

## B-2 · Qual é a fonte do "Orçado" no comparativo?

Conferência dos números do mockup:

- Receita orçada [valor removido] = `valor_construcao` + `valor_terreno`
- Custo orçado [valor removido] = `custo_construcao`

Ou seja, o mockup usa **campos de cadastro desta própria tela** como orçamento.
Isso viola a seção 20 do próprio prompt ("Não criar uma segunda fonte da
verdade"), porque o orçamento oficial do sistema vive em `budget_line`, dentro
da versão `budget` de cada projeto.

**Responder, escolhendo uma:**

1. **Orçado = `budget_line` da versão `budget`.** Correto conceitualmente.
   Exige mapear como as linhas do Budget agregam em Receita e Custo.
2. **Orçado = campos de cadastro (`valor_*`, `custo_*`).** Mais simples, mas o
   card vai divergir da tela de Budget. Se for esta, o bloco precisa se chamar
   **"Contratado x Realizado"** e não "Orçado x Realizado", e trazer rótulo
   explícito dizendo que não é o Budget.

**Também obrigatório:** definir o regime do "Realizado". Custo realizado por
`despesa.competencia` e receita por competência dão um número; por
`despesa.data_caixa` e recebimento efetivo dão outro. Os dois são legítimos, mas
não podem se misturar na mesma coluna (RG-01). O regime escolhido deve aparecer
escrito no card, visível ao usuário.

## B-3 · RESOLVIDO — ver Prompt A

A pergunta era qual status seria a verdade. O Prompt A decide: coluna nova e
separada, com o enum antigo (`Planejamento` / `Em andamento`) preservado
intacto no banco.

Consequências para este prompt:

- **Não criar coluna nem migração de status aqui.** Ela já existirá.
- As seções 5, 6, 23 e 30 deste prompt passam a ser puramente de interface:
  exibir o campo, o dropdown e o badge que leem a coluna criada no A.
- **[ACRÉSCIMO que permanece]** O valor antigo precisa continuar visível na
  tela, em campo somente-leitura rotulado "Fase (legado)". Dado preservado mas
  invisível é dado perdido na prática — e é justamente o que a seção 6 quer
  evitar.
- **[NOTA]** Se no A a coluna tiver ficado anulável, esta tela precisa saber
  exibir projeto ainda não classificado — "—", e não "Ativo" por presunção.

---

# 0. REGRA CRÍTICA — PRESERVAÇÃO ABSOLUTA DOS DADOS

Nenhum dado já existente poderá ser alterado, removido, sobrescrito, recalculado
ou desvinculado como consequência desta alteração de tela.

Isso inclui: projetos, status antigos, clientes, datas, duração, valores,
custos, receitas, funding, documentos, Budget, Forecast, Atual, unidades,
despesas, contas a pagar, contas a receber, caixa, medições, INCC, estoque,
vínculos, permissões, histórico, auditoria e demais registros.

A alteração deve prioritariamente: reorganizar apresentação; adicionar novos
campos quando necessário; alterar navegação local da tela; incluir novos
recursos de apoio.

- NÃO utilizar UPDATE em massa sobre dados de negócio.
- NÃO alterar valores financeiros históricos.
- NÃO substituir dados existentes para adequá-los ao novo layout.

**[ACRÉSCIMO]** Nenhuma migração desta tarefa pode conter `DROP COLUMN`,
`DROP TABLE`, `TRUNCATE` ou `DELETE`. Campo que sair de uso é descontinuado no
código, não removido do banco. Toda instrução usa `IF NOT EXISTS`, e cada
migração recebe seu `down` correspondente em `migrations/down/`.

**[ACRÉSCIMO]** Regra de não-retroatividade: cadastro antigo que não atenda a
uma validação nova continua legível, editável e íntegro. Nenhuma correção
automática de dado histórico, em nenhuma hipótese.

---

# 1. PRINCÍPIO DA NOVA TELA

Dois estados de visualização:

- **ESTADO A** — TODOS OS PROJETOS
- **ESTADO B** — PROJETO ESPECÍFICO

Não criar coluna ou tela intermediária com lista auxiliar de projetos. O modelo
"menu lateral + lista lateral de projetos + formulário" foi rejeitado.

A navegação acontece pelo seletor de projeto da própria página.

---

# 2. VISÃO "TODOS OS PROJETOS"

Com o seletor em `Todos os projetos / filiais`, mostrar os projetos existentes
um abaixo do outro, seguindo o comportamento da tela original:

```
Projetos & Unidades
Projeto: [ Todos os projetos / filiais ▼ ]

OBRA 28   [Ativo]
  [Dados do projeto] [RECEITAS] [CUSTOS] [ESTRUTURA FINANCEIRA] [Documentos]

OBRA 32   [Finalizado]
  [Dados do projeto] [RECEITAS] [CUSTOS] [ESTRUTURA FINANCEIRA] [Documentos]
```

Não criar cards pequenos/resumidos que substituam os formulários. Na visão
"Todos", os projetos continuam editáveis na própria página.

**[NOTA]** Há muitos projetos em produção. Nesta visão, isso significa um
formulário completo por projeto, todos editáveis, empilhados. É uma escolha deliberada
deste prompt e fica registrada como risco aceito: o usuário que entrar para
consultar vai rolar por todos esses formulários, e o risco de digitar por cima de um
valor enquanto procura outra obra é real. Os acréscimos das seções 8 e 37
existem para mitigar isso sem mudar o modelo.

---

# 3. SELEÇÃO DE UM PROJETO

O seletor superior contém `Todos os projetos / filiais` seguido dos projetos.
É **exclusivo desta página**. URL no padrão `/projeto?proj=<projectId>`.

Selecionar uma obra deve: mostrar somente ela; abrir a visualização completa de
edição; não alterar nenhuma outra tela; não gravar projeto ativo global; não
alterar cookies de contexto; não definir projeto padrão no sistema.

**[ACRÉSCIMO]** Ordenar a lista do seletor de forma estável e previsível
(numérica pelo código da obra, com fallback alfabético) e permitir busca por
digitação. Hoje a ordem é a que vem de `ctx.projects` — 28, 32, 29, 31, 21, 22,
25 — sem critério visível. Com muitos itens, isso é fonte de erro de contexto.

**[ACRÉSCIMO]** Escritórios (`kind: "office"`) continuam identificados no
seletor com o sufixo `· Matriz/Filial` e agrupados separadamente das obras.

**[NOTA]** A ordenação nasce em `getActiveContext()`. Se a correção for feita
lá, ela beneficia todas as telas; se for feita só nesta, cria divergência entre
telas. Preferir a origem.

---

# 4. NÃO EXISTE MAIS PROJETO ATIVO GLOBAL

**Ver BLOQUEIO B-1. Não executar esta seção sem resposta.**

Sujeito a B-1, eliminar **desta tela**: botão "Selecionar"; badge "ativo" de
seleção global; uso de `SelectActive`; uso de `activeId`; chamada a
`setActiveProject`; dependência visual de `ACTIVE_PROJECT_COOKIE`.

A palavra ATIVO nesta tela passa a ter outro significado (seção 5).

**[ACRÉSCIMO]** Remover o **uso**, não o código. `setActiveProject` e
`ACTIVE_PROJECT_COOKIE` permanecem definidos e funcionais.

**[ACRÉSCIMO]** O badge fixo "Ativo" do card de escritório (`OfficeRow`) hoje é
literal no código e não reflete estado nenhum. Ele deve sair junto, para não
colidir com o novo significado da palavra.

---

# 5. NOVO STATUS DO PROJETO

**Ver BLOQUEIO B-3.**

Em "Dados do projeto": `STATUS [ Ativo ▼ ]`, opções `Ativo` e `Finalizado`.
No cabeçalho do projeto, badge: Ativo → verde suave; Finalizado → cinza/neutro.

É **somente classificação cadastral**: não representa projeto selecionado, não
interfere em outras telas, não muda versões, não muda filtros, não muda
movimentações, não bloqueia dados.

---

# 6. PRESERVAR STATUS ANTIGO

`Planejamento` e `Em andamento` não podem ser sobrescritos.

Se a decisão de B-3 for coluna separada, apresentar na interface o novo campo e
**preservar no banco** a informação antiga.

**[ACRÉSCIMO]** Nesse caso, exibir o valor antigo na tela em campo
somente-leitura, rotulado como "Fase (legado)". Dado preservado mas invisível é
dado perdido na prática.

---

# 7. CABEÇALHO DA VISÃO DE TODOS OS PROJETOS

Manter título `PROJETOS & UNIDADES`, subtítulo
`PROJETOS — EMPREENDIMENTOS IMOBILIÁRIOS`, e à direita
`PROJETO [ Todos os projetos / filiais ▼ ]`.

Não mostrar "Projeto ativo" em nenhum ponto.

**[NOTA]** O componente `PageHeader` atualmente **descarta** as props `eyebrow`
e `subtitle` — elas são recebidas e nunca renderizadas, por decisão de layout
registrada em comentário. O subtítulo exigido aqui não vai aparecer sem
alterar `page-header.tsx`. Alteração de layout, sem efeito em outras telas além
de voltarem a exibir o subtítulo que já passam.

---

# 8. CABEÇALHO DE CADA PROJETO NA VISÃO GERAL

Cabeçalho visual compacto por projeto:

```
[ícone] OBRA 28   [Ativo]      Duração: 12 meses · Início: 10/12/2025 · Fim: 10/12/2026   [...]
```

Nome em destaque, badge de status, informações básicas resumidas, menu de ações
quando aplicável.

**[ACRÉSCIMO]** Exibir no cabeçalho também o **cliente** e o **valor global**.
São os dois campos que identificam a obra para quem está procurando uma
específica entre 27.

**[BLOQUEIO menor]** O menu `[...]` aparece nos dois mockups sem
comportamento definido. Especificar o que ele contém antes de implementar — se
contiver "Excluir", ver seção 37.

---

# 9. DADOS DO PROJETO

Manter: Nome da obra · Duração (meses) · Data de início · Data de fim · Cliente.
Adicionar: Status (Ativo/Finalizado).

Organização:
- Linha 1: Nome da obra | Duração
- Linha 2: Data de início | Data de fim | Status | Cliente

Preservar os valores atuais.

**[ACRÉSCIMO — Duração passa a ser derivada]** O campo "Duração (meses)" deixa
de ser editável e passa a **somente-leitura**, exibindo a contagem de
competências entre a Data de início e a Data de fim. É a regra da **seção 55 do
Prompt I**, que estabelece as datas como fonte única da janela do projeto.

Enquanto o valor gravado divergir da janela, exibir aviso discreto e **não
bloqueante** ao lado do campo — o cadastro diz 12 meses, a janela tem 13
competências. Exemplo real em produção: a OBRA 32 tem duração 6, com início
06/07/2026 e fim 10/02/2027, que dá oito competências.

O aviso é **somente informativo**: não bloqueia salvar, não corrige, não
recalcula. Quem decide é o usuário, ajustando as datas. **Nenhum
`duration_months` existente é alterado, recalculado ou apagado** — a coluna
permanece no banco com o valor que tem, e apenas deixa de ser lida.

**[ACRÉSCIMO — texto de ajuda]** A frase "A Data de início e a Data de fim
definem as colunas mensais do Budget e do Forecast", repetida hoje dentro de
cada card, **é falsa** e deve ser removida. As colunas mensais do Budget e do
Forecast vêm de `project.mes_inicial` e `project.mes_final` — dois campos que
não existem em nenhuma tela e que nascem nulos em toda obra criada por aqui.
Ver seção 48.

**[ACRÉSCIMO — validação de datas]** Validar que a data de fim não seja anterior
à de início, no servidor, apenas para gravações novas. Cadastro existente que
viole a regra continua editável e íntegro; ele não é bloqueado nem corrigido.

---

# 10. RECEITAS DO PROJETO

Bloco `RECEITAS DO PROJETO`, subtítulo "Valores de venda e geração de receita",
fundo verde muito claro, ícone de receita.

Campos: `VALOR DA CONSTRUÇÃO` · `VALOR DO TERRENO`.

Receitas aparece **antes** de Custos. Não alterar os valores existentes, não
recalcular, apenas reposicionar.

---

# 11. CUSTOS DO PROJETO

Logo abaixo: `CUSTOS DO PROJETO`, subtítulo "Investimentos necessários para a
realização do empreendimento", fundo vermelho/rosa muito claro.

Campos: `CUSTO DA CONSTRUÇÃO` · `CUSTO DO TERRENO`.

O agrupamento antigo "Terreno & valor global da operação" deixa de existir como
bloco único misturando receitas e custos.

---

# 12. ESTRUTURA FINANCEIRA

Bloco `ESTRUTURA FINANCEIRA`, subtítulo "Fontes de recursos e informações do
terreno", fundo azul muito claro.

Campos: Financiamento da construção · Financiamento do terreno · Recursos
próprios · Proprietário do terreno · Forma de pagamento do terreno · checkbox
"Terreno pago direto ao proprietário — não passa pelo caixa da construtora".

Manter os indicadores existentes "Valor global da operação" e "Entrada
financeira da construtora", **sem alterar as regras de cálculo atuais**.

**[ACRÉSCIMO — vazio deixa de parecer zero]** Hoje o campo nulo renderiza
`0,00`, tornando indistinguíveis "é zero" e "nunca foi preenchido". Nas duas
obras dos prints, os três campos de funding mostram `0,00` numa operação de
[valor removido] com forma de pagamento do terreno = FINANCIAMENTO.

Campo sem valor deve exibir placeholder vazio, não `0,00`. Nenhum valor gravado
muda; é apresentação.

**[ACRÉSCIMO — alerta de funding]** Quando a soma de financiamento da
construção + financiamento do terreno + recursos próprios não alcançar o valor
global da operação, exibir aviso discreto e **não bloqueante** informando a
diferença. O comentário do schema indica que `recursos_proprios` alimenta o
indicador "Recursos próprios" do Budget; hoje ele é zero em toda obra.

Não bloqueia salvar. Não preenche nada automaticamente.

---

# 13. DOCUMENTOS DO PROJETO

Manter a área e as funcionalidades atuais: selecionar tipo, escolher arquivo,
anexar, visualizar existentes, excluir quando permitido.

Preservar todos os documentos existentes. Não alterar `projectId`,
`storageKey`, `filename`, `tipo`, `uploadedAt` nem qualquer vínculo.

**[ACRÉSCIMO — desempenho]** A página hoje chama `getDocuments(tenantId)`, que
traz **todos** os documentos da empresa — inclusive os de despesa, cliente e
fornecedor, que esta tela nunca mostra — e depois filtra em memória. Em seguida,
assina a URL do R2 de cada um em `await` sequencial dentro de laço.

Buscar apenas documentos com `project_id` preenchido e assinar as URLs em
paralelo. **Não alterar** a função `getDocuments`, usada por outras telas: criar
consulta própria ou variante.

**[ACRÉSCIMO — auditoria]** `deleteProjetoDoc` hoje remove o registro e deixa o
objeto órfão no R2, e o log de auditoria não guarda o nome do arquivo. Registrar
`filename` e `storageKey` no `logAudit` da exclusão. A remoção do objeto no R2
fica fora do escopo desta tarefa.

---

# 14. VISÃO DE UM PROJETO ESPECÍFICO

Ao selecionar um único projeto, a tela muda para a visão completa:

```
Projeto OBRA 28   [Ativo]
PROJETOS — EMPREENDIMENTOS IMOBILIÁRIOS — OBRA 28
```

Não exibir os demais projetos. Não exibir lista intermediária.

---

# 15. NAVEGAÇÃO DA EDIÇÃO

Na parte superior, retorno para `Projetos & Unidades`, no padrão
`[ ← ] [ Projetos & Unidades ] [ → ]` ou equivalente aprovado.

Finalidade apenas de navegação. Não altera contexto global.

---

# 16. DADOS DO PROJETO — TELA ESPECÍFICA

Mesmo bloco `DADOS DO PROJETO` com Nome, Duração, Data de início, Data de fim,
Status e Cliente, no novo padrão visual. Aplicam-se os acréscimos da seção 9.

---

# 17. LOCALIZAÇÃO DO PROJETO

Bloco `LOCALIZAÇÃO DO PROJETO`, subtítulo "Endereço e informações geográficas do
empreendimento".

Campos: Endereço · Município · UF · CEP · Latitude · Longitude.

Utilizar os campos existentes do projeto. Não inventar valores. Não preencher
endereços automaticamente sem confirmação.

**[NOTA — CEP não existe]** O schema tem `endereco`, `municipio_obra`,
`uf_obra`, `codigo_municipio_obra`, `latitude` e `longitude`. **Não existe
coluna de CEP.** Ela precisa ser criada (aditiva, anulável) ou o campo sai do
escopo. Decidir explicitamente.

**[ACRÉSCIMO — consequência fiscal]** `municipio_obra` e `uf_obra` não são
decorativos: na construção civil o ISS é devido no município da obra
(LC 116/2003, art. 3º, III), e por isso o município de incidência sai do projeto
e não do tenant. O campo que a emissão de NFS-e usa é o
`codigo_municipio_obra` (IBGE, 7 dígitos), que **não aparece neste bloco**.

Editar "Município" como texto livre sem atualizar o código IBGE produz nota
fiscal com município errado. Exigências:

1. Exibir o código IBGE junto do município, mesmo que somente-leitura.
2. Avisar na tela que o campo tem efeito fiscal.
3. Município e UF alterados sem código IBGE correspondente devem gerar aviso.

**[ACRÉSCIMO]** `latitude` e `longitude` alimentam a validação de raio do Ponto
da Obra (`ponto_raio_metros`, padrão 100 m). Alterar coordenada de obra com
registros de ponto existentes muda o que é considerado dentro do raio daqui para
frente. Avisar o usuário ao salvar coordenada em obra que já tenha ponto
registrado. Nenhum registro passado é reavaliado.

---

# 18. NÃO UTILIZAR MAPA NESTE BLOCO

O espaço à direita da Localização recebe `ORÇADO x REALIZADO`, não mapa.
Localização à esquerda, comparativo à direita.

---

# 19. ORÇADO X REALIZADO

**Ver BLOQUEIO B-2. Não implementar sem a definição de fonte e de regime.**

Bloco com subtítulo "Acompanhe o desempenho financeiro do projeto", mostrando
Receita, Custo e Resultado, cada um com Orçado, Realizado e % de execução.

Valores de fontes reais do sistema. Não inventar dados. Não gravar dados novos
para alimentar o comparativo. Quadro prioritariamente de leitura.

**[ACRÉSCIMO — semântica da cor]** No mockup, Custo com 107% de execução aparece
em verde. Estouro de custo não é resultado positivo. A cor deve seguir o
significado, não o percentual:

- Receita: acima do previsto é bom.
- Custo: acima do previsto é alerta.
- Resultado: acima é bom.

**[ACRÉSCIMO — rótulo de regime]** O card exibe, de forma visível, qual regime
está usando: "Realizado por competência" ou "Realizado por caixa". Sem isso o
usuário compara números que não são comparáveis (RG-01).

**[ACRÉSCIMO — sem dado é sem dado]** Projeto sem Budget lançado deve exibir
"Sem orçamento lançado", não zero. Zero é uma afirmação; ausência não é.

---

# 20. FONTE DOS VALORES ORÇADOS E REALIZADOS

Antes de implementar, mapear exatamente de onde vêm Receita orçada, Receita
realizada, Custo orçado e Custo realizado. Usar as fontes existentes do ERP. Não
criar segunda fonte da verdade. Não duplicar valores.

Métrica que não puder ser obtida de forma confiável com o modelo atual: **não
inventar cálculo — informar a limitação**.

**[ACRÉSCIMO]** O mapeamento deve ser entregue por escrito **antes** do código,
nomeando tabela, coluna e coluna de data de cada uma das quatro métricas.

**[NOTA]** Pontos conhecidos que provavelmente vão aparecer no mapeamento:

- A receita reconhecida do sistema nasce do `payment_plan` das unidades
  vendidas. Projeto sem unidade cadastrada não tem receita por competência.
- `conta_receber` **não possui coluna de competência** — só `vencimento` e
  `data_recebimento`. Recebível lançado à mão não tem por onde entrar num
  cálculo por competência.
- `despesa` tem `competencia`, `vencimento` e `data_caixa` separadas. A escolha
  entre elas é a escolha do regime.

Se o mapeamento esbarrar nessas limitações, **informar em vez de contornar**.

---

# 21. RESULTADO

Resultado = Receita − Custo em cada visão correspondente, desde que compatível
com as regras atuais do sistema. Havendo definição diferente já usada pelo
Growth Construction, preservar a existente. Não alterar regras de DRE para
construir este card.

---

# 22. RECEITAS, CUSTOS E ESTRUTURA FINANCEIRA NA TELA ESPECÍFICA

Depois de Dados do projeto e de Localização + Orçado x Realizado, manter na mesma
página: RECEITAS DO PROJETO · CUSTOS DO PROJETO · ESTRUTURA FINANCEIRA ·
DOCUMENTOS DO PROJETO. Sem abas. Página única com rolagem vertical.

---

# 23. SEM ABAS ADICIONAIS

Não criar abas Visão Geral / Financeiro / Obra & Fiscal / Documentos /
Histórico. Página única, separada por blocos visuais.

---

# 24. ASSISTENTE DE IA

Coluna lateral `ASSISTENTE IA`, de espaço enxuto, que não domina a tela. A
prioridade visual continua sendo o cadastro. Funciona principalmente como
orientação sobre o que a IA pode fazer naquela tela.

---

# 25. FUNÇÕES DO ASSISTENTE IA

Completar cadastro · Revisar inconsistências · Analisar funding · Extrair dados
de documentos · Comparar orçado x realizado (na tela específica).

**[ACRÉSCIMO]** "Revisar inconsistências" deve incluir as divergências que a
revisão já identificou: duração diferente da implicada pelas datas; funding cuja
soma não alcança o valor global; data de fim anterior à de início; município sem
código IBGE; projeto sem `mes_inicial`/`mes_final`.

---

# 26. IA NUNCA ALTERA DADOS AUTOMATICAMENTE

A IA pode analisar, sugerir, identificar, apontar, comparar e pré-preencher uma
proposta.

A IA **não** pode salvar automaticamente, alterar valores, mudar status,
substituir cliente, modificar datas, modificar funding, alterar documentos, nem
modificar qualquer registro sem confirmação explícita do usuário.

Toda sugestão de alteração passa por confirmação humana.

**[ACRÉSCIMO — permissão]** A confirmação humana não substitui a permissão.
Usuário sem `editar` não pode aplicar sugestão da IA, e a checagem acontece **no
servidor**, na mesma action que grava — não na interface. A IA não é caminho
alternativo de escrita.

**[ACRÉSCIMO — auditoria]** Toda alteração originada de sugestão da IA e aceita
pelo usuário registra em `logAudit`, além do já registrado, que a origem foi o
assistente. Sugestão recusada não grava nada.

**[ACRÉSCIMO — leitura de documento]** "Extrair dados de documentos" só pode
acessar documento cujo `tenant_id` seja o do usuário e cujo `project_id` seja o
projeto em tela. A validação é no servidor, contra o banco, nunca contra
identificador vindo do frontend.

---

# 27. DICA DA IA

Na visão "Todos os projetos", card pequeno "Dica da IA" com orientação
contextual curta, sem ocupar grande espaço.

---

# 28. COMPORTAMENTO DA IA NA VISÃO TODOS

Pode analisar cadastros incompletos, inconsistências entre projetos, projetos
sem documentos, funding não informado e pendências cadastrais. Não assume
projeto global.

**[ACRÉSCIMO]** Nesta visão a IA recebe apenas projetos do tenant atual, e a
lista é montada no servidor a partir do contexto — nunca a partir de ids
enviados pelo cliente.

---

# 29. COMPORTAMENTO DA IA EM PROJETO ESPECÍFICO

Em `/projeto?proj=<id>`, o `projectId` da página é enviado explicitamente ao
agente, que analisa somente aquele projeto. Não cria contexto global.

**[ACRÉSCIMO]** O servidor valida que o `projectId` recebido pertence ao tenant
do usuário antes de qualquer leitura. Id que não pertença ao tenant é recusado.

---

# 30. CRIAÇÃO DE NOVO PROJETO

Preservar a funcionalidade de criar projeto. Não remover a capacidade de
cadastro. Adaptar ao novo padrão visual sem criar formulário permanentemente
confuso. Manter os campos mínimos já suportados.

Novo projeto inicia com Status = Ativo no novo campo de situação.

Ao criar: não definir projeto ativo global, não gravar cookie de projeto, não
alterar outras telas. Pode navegar para a edição do recém-criado como ação local.

**[NOTA]** `createProject` hoje faz três coisas além de inserir o projeto:
provisiona as três versões (`budget`, `forecast`, `atual`, com `forecast` como
padrão), popula a tabela INCC inteira, e grava os cookies de projeto e versão
ativos. As duas primeiras **devem ser preservadas integralmente** — sem elas o
projeto nasce inutilizável. Apenas a gravação de cookie sai, e sujeita a B-1.

**[ACRÉSCIMO]** Preservar também a criação de escritório/filial
(`kind: "office"`), que hoje tem formulário próprio e nasce sem duração, datas
nem cliente.

---

# 31. DURAÇÃO E DATAS

Preservar dados e regras atuais de Data de início, Data de fim e Duração. Não
recalcular registros existentes. Se a duração passar a ser calculada
automaticamente, isso será tratado em alteração específica. Não modificar valores
históricos agora.

**[NOTA]** O acréscimo da seção 9 é compatível com esta seção: ele apenas
**exibe** a divergência, sem calcular, corrigir ou gravar nada.

---

# 32. CLIENTE

Preservar o cliente vinculado e a opção "Empreendimento próprio" quando
aplicável. Não alterar relacionamentos existentes. Não criar cliente
automaticamente.

**[NOTA]** `cliente_id` nulo significa empreendimento próprio do tenant, não
ausência de dado. A interface não deve exibi-lo como campo em branco a preencher.

---

# 33. CORES APROVADAS

Dados gerais: branco/neutro · Receitas: verde muito suave · Custos:
vermelho/rosa muito suave · Estrutura financeira: azul muito suave · IA:
lilás/azul muito suave · Status Ativo: verde · Status Finalizado: cinza/neutro.

Evitar cores saturadas em fundos grandes.

---

# 34. HIERARQUIA VISUAL

O usuário deve perceber imediatamente: qual projeto está vendo; se está Ativo ou
Finalizado; quais valores são receitas; quais são custos; quais são fontes
financeiras; a localização; a situação Orçado x Realizado; e quais recursos de
IA existem.

---

# 35. DENSIDADE DA TELA

Layout compacto, sem aumentar excessivamente a altura dos cards. A visão "Todos"
precisa continuar permitindo ver mais de um projeto na mesma página.
Espaçamentos moderados, labels compactos, cards de baixa altura, informações
alinhadas horizontalmente quando possível.

---

# 36. RESPONSIVIDADE

Desktop: conteúdo principal + painel compacto de IA. Na visão específica,
Localização e Orçado x Realizado lado a lado quando houver largura. Em telas
menores, empilhar; o Assistente IA pode virar drawer ou seção recolhível.

---

# 37. BOTÕES

Preservar Salvar, Excluir e Voltar (na tela específica). Não alterar as regras
de exclusão além do necessário para remover o conceito antigo de projeto ativo.

**[ACRÉSCIMO — proteção do Excluir]** As regras de exclusão ficam intocadas,
conforme esta seção. Mas o botão está sendo reposicionado por esta tarefa, e o
que ele faz hoje precisa ser dito com clareza:

`deleteProject` executa exclusão **física** do projeto. As chaves estrangeiras
em cascata levam junto versões, unidades, despesas, lançamentos de caixa,
medições, linhas de Budget e Forecast, permutas, reembolsos, contas a receber,
registros de ponto, serviços e a tabela INCC do projeto. Não há retorno. A única
barreira é um `window.confirm`, e o log de auditoria guarda apenas o nome — não
há inventário do que foi destruído.

Nos mockups, o Excluir fica ao lado do Salvar, em 27 cards empilhados.

Exigências mínimas desta tarefa, todas de interface:

1. Confirmação por **digitação do nome da obra**, não `window.confirm`.
2. O diálogo lista quantos registros vinculados existem (unidades, despesas,
   lançamentos de caixa, medições) antes de confirmar.
3. O Excluir não fica adjacente ao Salvar. Separação visual clara, ou dentro do
   menu `[...]`.

A substituição da exclusão física por inativação fica **fora desta tarefa** e
será tratada em alteração própria.

---

# 38. PERMISSÕES

Preservar integralmente as permissões atuais.

Sem permissão de editar: visualiza conforme permissão, não edita, não salva, e a
IA não burla a permissão. Sem permissão de excluir: não mostrar/permitir Excluir.

**[ACRÉSCIMO — erro visível]** Hoje `updateProject` faz `return` silencioso
quando falta permissão: o usuário clica em Salvar, nada acontece, nenhuma
mensagem aparece e o formulário continua marcado como alterado. No mesmo
arquivo, `createProject`, `deleteProject` e `uploadProjetoDoc` fazem o oposto —
`throw`, cuja mensagem o Next.js esconde em produção.

Todas as actions desta tela devem passar a **retornar `{ ok, error }`**, com a
mensagem exibida na interface, conforme a convenção do projeto. Vale para
sucesso também: salvar sem retorno visível é indistinguível de salvar que falhou.

---

# 39. ISOLAMENTO DE TENANT

Toda ação sobre projeto valida no servidor `project.id = projectId` **e**
`project.tenantId = tenant atual`. Não confiar somente no id enviado pelo
frontend. Vale para documentos, IA, atualização, localização e status.

**[NOTA]** Requisito correto e hoje parcialmente atendido: `updateProject` e
`deleteProject` conferem a posse em memória (`ctx.projects`), mas gravam com
`where(eq(projects.id, projectId))` **sem** `tenantId` na cláusula. É a única
exceção ao padrão seguido nas outras 164 ocorrências do sistema. Acrescentar
`tenantId` ao `where`, mantendo a guarda em memória. Sem efeito observável.

**[ACRÉSCIMO]** Não existe RLS no banco: o isolamento é sustentado consulta a
consulta. Toda consulta nova introduzida por esta tarefa — inclusive as do
Orçado x Realizado e as do Assistente IA — precisa do filtro de tenant explícito.

---

# 40. NÃO REGRESSÃO

Esta mudança não pode alterar o funcionamento de: Budget, Forecast, Atual, DRE,
Fluxo de Caixa, Caixa, Despesas, Contas a Pagar, Contas a Receber, Unidades,
Medição, Estoque, INCC, Reembolso, Permuta, Consolidado, Ponto, Documentos,
Auditoria.

**[NOTA]** Ver B-1: a seção 4, como escrita, colide com esta seção.

---

# 41. TESTES — VISÃO TODOS

1. Abrir Projetos · 2. Selecionar Todos · 3. Ver projetos empilhados ·
4. Editar OBRA 28 · 5. Editar OBRA 32 · 6. Salvar um sem afetar o outro ·
7. Badge Ativo · 8. Badge Finalizado · 9. Documentos corretos por projeto ·
10. IA não confunde dados entre projetos.

**[ACRÉSCIMO]** 11. Seletor ordenado e busca funcionando com muitos projetos.
12. Campo de funding vazio exibe vazio, não `0,00`. 13. Escritórios continuam
identificados e separados.

---

# 42. TESTES — PROJETO ESPECÍFICO

1. Selecionar OBRA 28 · 2. Só ela aparece · 3. Localização correta · 4. Orçado x
Realizado correto · 5. Receitas · 6. Custos · 7. Funding · 8. Documentos ·
9. IA recebe somente OBRA 28 · 10. Voltar para Todos · 11. Todos reaparecem.

**[ACRÉSCIMO]** 12. Projeto sem Budget exibe "Sem orçamento lançado", não zero.
13. Custo acima de 100% aparece como alerta, não como sucesso. 14. O regime do
Realizado está escrito no card.

---

# 43. TESTES — STATUS

Ativo → Finalizado e Finalizado → Ativo, garantindo que **somente** o campo de
situação muda e que permanecem idênticos valores, datas, cliente, documentos,
Budget, Forecast, Atual, despesas, receitas, unidades e demais dados.

**[ACRÉSCIMO]** Se B-3 resultar em coluna nova: verificar que os projetos
existentes continuam com o status antigo intacto e que a coluna nova permanece
vazia até classificação manual.

---

# 44. TESTE DE PRESERVAÇÃO DE DADOS

Comparar antes/depois: ids, nomes, clientes, datas, duração, valores de
construção, valores de terreno, custos, funding, documentos, versões e unidades
vinculadas. Nenhum valor pré-existente pode mudar.

**[ACRÉSCIMO]** Incluir na comparação `mes_inicial`, `mes_final`,
`codigo_municipio_obra`, `latitude`, `longitude` e o status antigo.

**[ACRÉSCIMO — teste de data]** Cadastrar um projeto de teste com dia **25** no
início e no fim, salvar, recarregar e conferir o que volta. As datas em produção
hoje têm dia e mês ambos ≤ 12 (10/12/2025, 06/07/2026), o que torna um erro de
conversão entre `MM/DD/YYYY` e `DD/MM/AAAA` invisível. Excluir o projeto de teste
ao fim.

---

# 45. CRITÉRIO DE ACEITE VISUAL

**Visão Todos:** sidebar aprovada · título Projetos & Unidades · seletor da
página · projetos empilhados · Dados do projeto · Receitas em verde · Custos em
vermelho claro · Estrutura Financeira em azul · Documentos · Assistente IA
compacto à direita · status Ativo/Finalizado · nenhum projeto ativo global.

**Visão específica:** título Projeto + nome · status · Dados do projeto ·
Localização à esquerda · Orçado x Realizado à direita · Receitas · Custos ·
Estrutura Financeira · Documentos · Assistente IA compacto · Voltar / Salvar /
Excluir · sem abas.

**[ACRÉSCIMO]** Subtítulo da página efetivamente renderizado (ver seção 7).
Frase falsa sobre datas e colunas do Budget removida (ver seção 9).

---

# 46. RELATÓRIO FINAL OBRIGATÓRIO

Ao concluir, informar:

1. arquivos alterados · 2. componentes alterados · 3. campos adicionados ·
4. mudanças de layout · 5. como o status Ativo/Finalizado foi implementado ·
6. confirmação de preservação do status antigo · 7. confirmação de remoção do
`SelectActive` desta tela · 8. confirmação de que o seletor é apenas local ·
9. fonte da Receita Orçada · 10. fonte da Receita Realizada · 11. fonte do Custo
Orçado · 12. fonte do Custo Realizado · 13. funcionamento do Assistente IA ·
14. permissões preservadas · 15. testes realizados · 16. confirmação de que
nenhum dado existente foi alterado · 17. de que nenhum valor foi recalculado ·
18. de que nenhum documento foi perdido · 19. de que nenhum vínculo foi
alterado · 20. limitações encontradas.

**[ACRÉSCIMO]** 21. Regime contábil adotado no Realizado, e por quê.
22. Migrações criadas, com o `down` de cada uma. 23. Confirmação de que
`setActiveProject` continua existindo no código. 24. Lista das consultas novas
introduzidas, com o filtro de tenant de cada uma. 25. Como as respostas aos
bloqueios B-1, B-2 e B-3 foram implementadas.

---

# 47. REGRA FINAL

Visão geral: todos os projetos um abaixo do outro. Visão específica: selecionar
um projeto fecha a tela naquele projeto e acrescenta informação gerencial.

A nova tela deve melhorar organização, leitura, navegação, análise e apoio ao
usuário por IA — **sem alterar os dados de negócio já existentes**.

Se qualquer alteração necessária puder modificar dados já cadastrados:
**PARE. NÃO execute. Informe o risco antes de prosseguir.**

---

# 48. [ACRÉSCIMO] PENDÊNCIA REGISTRADA — MES_INICIAL / MES_FINAL

Não implementar nesta tarefa. Registrar para a próxima.

`project.mes_inicial` e `project.mes_final` (formato `MM/YYYY`) são, segundo o
comentário do próprio schema, a fonte **oficial** das colunas mensais do Budget e
do Forecast, e não são editáveis naquelas telas porque deveriam vir do cadastro
do projeto.

Nenhum formulário do sistema grava esses dois campos. As Server Actions
`createProject` e `updateProject` aceitam os parâmetros; nenhum chamador os
envia. Toda obra criada por esta tela nasce com período de planejamento nulo.

Nesta tarefa, o único requisito é **não repetir a afirmação falsa** de que as
datas de início e fim definem as colunas do Budget (seção 9). Expor os campos
depende de entender o que a tela de Budget faz hoje quando eles estão nulos, o
que será tratado na revisão daquela tela.

---

# 49. [ACRÉSCIMO] O QUE NÃO PODE SER TOCADO NESTA TAREFA

Lista de fronteiras, para evitar que a mudança de layout arraste regra de
negócio junto:

- Nenhum valor em `budget_line`, `budget_account`, `despesa`, `cash_entry`,
  `conta_receber`, `unit`, `medicao` ou `incc_rate`.
- Nenhum `payment_plan` de unidade.
- A função `getDocuments`, usada por outras telas.
- As Server Actions `setActiveProject` e `setActiveVersion` (o uso sai; o código
  fica).
- O provisionamento de versões e da tabela INCC em `createProject`.
- As regras de cálculo de "Valor global da operação" e "Entrada financeira da
  construtora".
- As regras de exclusão em si (apenas a proteção de interface muda — seção 37).
- `duration_months`, `start_date` e `end_date` de qualquer projeto existente.
- Qualquer registro de `audit_log` já gravado.


<a id="prompt-d"></a>


========================================================================


### ▸ 26 de 42 · PROMPT D — Orçamentos

**Bloco 4 · Planejamento e obra** · Bloqueios: BD-1 · BD-2 · BD-3 · BD-4 · BD-5 · BD-6 · BD-7

========================================================================


# PROMPT D — TELA ORÇAMENTOS (ex-Lançamento Budget)


---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---
## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum número já lançado no sistema pode ser alterado.**
Valores, totais, percentuais, saldos, datas e quantidades existentes em
produção permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda,
converte, normaliza, migra, reclassifica ou "corrige" um número já gravado —
nem como efeito colateral de mudança de layout, de rota, de nome de campo ou de
origem de dado. Se uma alteração exigir tocar em número lançado: **PARE, não
execute, e informe qual número, por quê e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups e capturas de tela definem **layout, hierarquia visual, rótulos e
comportamento de interface** — nada além disso. São ilustrações, frequentemente
com números inconsistentes entre si.

Nunca usar de um mockup: valores monetários, percentuais, totais, saldos, datas,
prazos, nomes de obra, nomes de cliente, nomes de proprietário, endereços,
coordenadas, nomes de usuário, cargos, contadores, badges numéricos, ou qualquer
outro dado de exemplo.

Nunca criar registro, seed, fixture, valor padrão ou dado de teste a partir de
um mockup. Nenhum dado de exemplo é gravado no banco de produção em nenhuma
hipótese.

Todo número exibido em tela vem do banco. Onde não houver dado, a tela mostra
estado vazio — **nunca zero, nunca placeholder numérico, nunca o valor do
mockup**.

**Aplicação específica a este prompt:** o total, os percentuais
"20,00 · 15,00 · 15,00 · 15,00 · 15,00 · 10,00 · 10,00", os valores mensais
e os cards do topo são ilustração de mockup [valores removidos] — e são
inconsistentes entre si: 20% do total exibido não dá o valor exibido no
primeiro mês. Nenhum desses números entra no código. O valor
que a célula somente-leitura exibirá vem do cadastro do projeto, conforme a
decisão em BD-1, e o que já está gravado em `budget_account` permanece intocado
até haver decisão humana registrada em BD-2.

---

Growth Construction · `/budget` e `/forecast`.

Escopo restrito: **somente as alterações decididas**. Correções levantadas na
revisão de código que não foram aprovadas estão listadas na seção 9 como fora de
escopo, para que não entrem por engano.

> **Marcações:** **[BLOQUEIO]** decisão necessária antes de implementar ·
> **[NOTA]** informação técnica que muda o como · **[FORA DE ESCOPO]** não fazer.

---

# ORDEM DE EXECUÇÃO

Prompts existentes para esta frente, com PRs e deploys separados:

| | Prompt | Ordem |
|---|---|---|
| **C** | Barra lateral | 1º |
| **A** | Remoção do projeto ativo global | 2º |
| **B** | Tela Projetos & Unidades | 3º |
| **D** | este — tela Orçamentos | 4º |

**D depende de B** para o item 2: o total da receita passa a vir dos campos de
Receitas do Projeto do cadastro, que o Prompt B reorganiza. Não é dependência
técnica estrita — os campos já existem —, mas implementar D antes de B faz o
usuário procurar no cadastro um bloco que ainda não existe com esse nome.

**D depende do Plano de Contas** para os itens 3 e 4. Ver BLOQUEIO BD-5.

---

# PRÉ-CONDIÇÃO TÉCNICA — LER ANTES DOS BLOQUEIOS

`saveBudgetPlanning` (`src/lib/actions/planning.ts`) grava por **apagar e
reinserir**: remove todos os `budget_account` e `budget_line` daquele bloco na
versão, e reinsere apenas o que veio no formulário.

Consequência direta para este prompt: **no instante em que a linha legada
"Receita" deixar de ser enviada pelo formulário, os valores dessa linha são apagados
do banco** — em toda obra que tenha linha legada, no primeiro salvamento do
bloco de receitas. Sem aviso, e o log de auditoria guarda apenas
`{ bloco, contas: N }`, sem os meses nem os valores removidos.

Duas saídas, e uma delas tem de ser escolhida antes de começar:

1. **Tornar o salvamento não destrutivo para linhas ausentes** — preservar
   `budget_account` e `budget_line` cujo `row_key` não veio no formulário, em vez
   de apagá-los. É a correção que a revisão registrou como BG-11, e é a única
   forma de este prompt não destruir histórico.
2. **Não implementar o item 3.2** (remoção da linha legada) nesta tarefa,
   mantendo a linha legada visível e enviada no formulário até que exista decisão
   humana, item a item, sobre o destino daqueles valores.

Qualquer terceira via que remova a linha da tela sem tratar isso apaga dado de
produção e está proibida pela seção 0.

---

# BLOQUEIOS

## BD-1 · Qual número vai na célula somente-leitura?

O mockup mostra um valor numa célula rotulada "Total vem do cadastro do
projeto". Esse número **não vem do cadastro** — é o valor atual da linha legada.
O cadastro do projeto tem `valor_construcao` e `valor_terreno` preenchidos
[valores removidos].

**Escolher uma:**

1. **`valor_construcao` apenas**, quando
   `terreno_fora_caixa` estiver marcado. É o que a própria tela de Projetos já
   chama de "Entrada financeira da construtora". Mais fiel ao caixa da
   construtora.
2. **`valor_construcao + valor_terreno`**. Valor global da
   operação. Nesse caso, o Budget passa a orçar o valor do terreno como receita que não
   entra no caixa da construtora, e o Fluxo de Caixa previsto herda isso — a
   contrapartida do terreno precisa existir em algum lugar do lado das despesas,
   ou o resultado fica inflado.

Não implementar sem a resposta. Os números do mockup não servem de referência.

## BD-2 · O que acontece com o valor da linha legada?

A linha "Receita (legado)" não aparece no mockup. Ela existe em
`budget_account` com `row_key = "Receita"`, `kind = "receita"`, sem grupo
correspondente no Plano de Contas atual, e é exibida hoje com o selo "legado"
(`queries.ts:1119-1132`).

Esse valor **não migra sozinho** para a linha "Receitas do Projeto": são chaves
diferentes.

**Escolher uma:**

1. **Manter a linha legada visível**, ao lado das duas novas, até decisão humana
   obra a obra. Três linhas de receita durante a transição. Nada se perde.
2. **Ocultar a linha legada** — só é admissível junto com a saída 1 da
   pré-condição acima (salvamento não destrutivo). Ocultar sem isso é apagar.

Migração automática dos valores legados para a linha nova está **proibida**:
seria correção automática de dado histórico.

## BD-3 · O Assistente de IA é somente leitura ou não?

O painel do mockup traz o selo **"Somente leitura"** e o texto de rodapé
"Nenhuma informação é alterada". Quatro itens abaixo, traz **"Construir
orçamento por texto ou voz — monte o orçamento com orientação guiada por texto
ou voz"**.

Construir orçamento é escrita. As duas coisas não coexistem.

**Escolher uma:**

1. **Somente leitura de fato** — remover "Construir orçamento por texto ou voz"
   desta entrega. As outras quatro funções (revisar, analisar distribuição,
   comparar Budget × Forecast, explicar desvios) são todas de análise.
2. **Manter a função de construção** — então o selo "Somente leitura" sai, e a
   função precisa de especificação própria: proposta preenchida na grade sem
   gravar, confirmação humana explícita, verificação de permissão no servidor na
   mesma action que grava, e registro em auditoria de que a origem foi o
   assistente.

Recomendação da revisão: a 1, nesta entrega. A gravação desta tela é destrutiva
por desenho (ver pré-condição), e IA propondo escrita numa tela que apaga e
reinsere multiplica o alcance de qualquer erro.

## BD-4 · Budget e Forecast: uma tela ou duas?

O mockup traz um alternador `Budget | Forecast` no topo. A barra lateral do
mesmo mockup lista **Orçamentos** e **Forecast** como itens separados. Hoje são
duas rotas, `/budget` e `/forecast`, com o mesmo componente e `kind` diferente.

**Escolher uma:**

1. **Duas rotas, alternador que navega.** O alternador é um atalho:
   `/budget` ↔ `/forecast`, preservando `?proj=`. Menor mudança, compatível com
   o Prompt C, e o item "Forecast" da barra lateral continua fazendo sentido.
2. **Uma rota só.** `/forecast` passa a ser um estado de `/budget`. Exige
   redirect, mexe na barra lateral e contraria a seção 22 do Prompt C ("não
   alterar URLs"). Não recomendado nesta entrega.

**[NOTA]** O Forecast tem barra de ferramentas própria (criar a partir do
Budget, duplicar, comparar) e o total por conta é somente-leitura lá
(`totalReadOnly = kind === "forecast"`). Qualquer unificação precisa preservar
os dois comportamentos.

## BD-5 · Os grupos de receita existem no Plano de Contas?

Os itens 3 e 4 pressupõem dois grupos de natureza receita: um para a venda das
unidades e outro chamado "Outras Receitas". As linhas da grade vêm dos **grupos**
do Plano de Contas (`queries.ts:1105-1118`), não de código.

**Responder:** esses grupos já existem? Se não, criá-los é trabalho na tela de
Plano de Contas — cadastro de dado, não código — e precisa acontecer **antes**
deste prompt ir para produção, senão a grade fica sem as linhas novas.

## BD-6 · Onde fica gravada a seleção de linhas?

O item 4-A permite incluir e excluir linhas do plano de contas na grade. Isso
exige guardar **quais linhas fazem parte daquele orçamento** — informação que
hoje não existe.

Hoje a grade é montada assim: as linhas vêm sempre de todos os grupos ativos do
Plano de Contas, e `saveBudgetPlanning` **descarta** as contas cujo total e
percentuais sejam todos zero. Ou seja, uma linha sem valor simplesmente não é
persistida. Não há como distinguir "conta não incluída" de "conta incluída e
ainda sem valor".

**Escolher uma:**

1. **Persistir a linha em `budget_account` mesmo zerada**, e passar a tratar a
   presença da linha como a seleção. Exige alterar o filtro que hoje descarta
   linhas zeradas — mudança de comportamento na gravação, que precisa ser
   verificada contra o restante do sistema.
2. **Coluna ou tabela nova** registrando a seleção por versão e bloco, aditiva,
   sem alterar o comportamento atual da gravação.

Em ambos os casos, **projeto existente sem seleção gravada continua exibindo os
grupos padrão**, exatamente como hoje. A ausência de seleção significa "padrão",
nunca "nenhuma linha".

## BD-7 · A seleção da Previsão é própria ou herdada do Orçamento?

Na Previsão Atualizada os totais são herdados do Orçamento e somente-leitura.
A seleção de linhas segue a mesma lógica?

**Escolher uma:**

1. **Herdada e não editável.** A Previsão mostra exatamente as linhas do
   Orçamento de origem. Coerente com o total herdado, e impede que uma previsão
   tenha conta que o orçamento não tem.
2. **Própria e editável.** A previsão pode incluir conta nova — o que é
   defensável, já que uma revisão existe justamente porque algo mudou. Nesse
   caso, a comparação Orçamento × Previsão precisa saber exibir conta que existe
   só de um lado.

---

Nenhum dado existente pode ser alterado, apagado, convertido, recalculado,
reclassificado ou desvinculado como consequência desta tarefa. Vale para
`budget_account`, `budget_line`, versões, projetos, plano de contas, e todo o
resto do banco.

- Nenhum `UPDATE` em massa.
- Nenhuma migração que reinterprete dado existente.
- Nenhuma correção automática de dado histórico.
- Campo ou chave que sai de uso é descontinuado, não removido.
- Migração, se houver, é aditiva, com `IF NOT EXISTS` e com o `down`
  correspondente em `migrations/down/`.

Se qualquer passo exigir alterar dado de negócio: **PARE**, informe o dado, o
motivo, o impacto e a alternativa não destrutiva.

---

# 1. RESTRIÇÕES FIXAS

Definidas pelo usuário. Não são objeto desta tarefa e não podem ser alteradas
por ela.

**1.1 · O período do projeto vem do cadastro do projeto.** As colunas mensais
saem de `start_date` e `end_date`, convertidas para `MM/YYYY`. A tela exibe o
período como somente-leitura. Nenhuma alteração nessa origem.

**[ACRÉSCIMO]** A derivação da janela passa a ser **função compartilhada**, e não
lógica interna de `getBudgetPlanning` — ver a **seção 55 do Prompt I**. O
resultado exibido por esta tela **não muda**: a fonte já era essa. O que muda é
que Previsão Atualizada, o reconhecimento de receita e o aviso de divergência na
tela de Projetos passam a ler da mesma função, em vez de cada um derivar por
conta própria. `duration_months` e `mes_inicial`/`mes_final` deixam de alimentar
qualquer cálculo.

**1.2 · A estrutura de análise não muda.** Dois blocos, receitas acima de
despesas, modelo total + percentual mensal, valor derivado, tabela com meses em
colunas e rolagem horizontal.

**1.3 · A tela continua puxando informação do cadastro do projeto.** É
comportamento desejado, não acoplamento a remover.

**1.4 · Rotas e nomes internos não mudam.** `/budget`, `/forecast`,
`budget_line`, `budget_account`, `version.key = "budget"`, `kind` e `row_key`
permanecem. Renomear rótulo é apresentação; renomear dado é migração.

---

# 2. RENOMEAR PARA "ORÇAMENTOS"

**2.1** O título da tela passa de "Lançamento Budget" para **"Orçamentos"**.
Subtítulo: "Planeje e acompanhe as receitas e despesas do projeto."

**[NOTA]** O título é literal em `budget-planning-screen.tsx`:
`kind === "budget" ? "Lançamento Budget" : "Lançamento Forecast"`. Ponto único.

**2.2** O rótulo no menu passa a "Orçamentos". Isso **colide com a seção 6 do
Prompt C**, que lista "Budget" e "Forecast" no módulo Planejamento. Os dois
precisam sair na mesma leva, ou o menu diverge da tela.

**2.3** A rota continua `/budget`. Nenhum redirect, nenhuma página duplicada.

**2.4** O badge de contagem passa de "13 meses" para **"13 competências"**,
conforme o mockup.

**2.5 · A tela de Forecast passa a se chamar "Previsão Atualizada".** Trocar o
título, o rótulo no menu, o alternador entre as duas telas, o bloco "NOVO
FORECAST A PARTIR DO BUDGET", o campo "Nome do Forecast" e o botão "Comparar com
Budget".

Não mudam: a rota `/forecast`, `kind = "forecast"`, `version.key = "forecast"`,
a função `duplicateForecast`, nem qualquer nome interno.

**[FORA DE ESCOPO]** O nome do módulo do menu ("Planejamento") não muda.

**2.6 · [ACRÉSCIMO] Declarar que o valor replicado é retrato do índice.**
`replicateFromAtual` deriva as linhas de receita rodando
`calcProjectionBySource` com a tabela INCC do projeto, e grava em `budget_line`
o valor **já corrigido**. Depois de gravado, ele **congela**: alterar o INCC em
Parâmetros não mexe nessas linhas, que só mudam se a replicação rodar de novo.

Congelar é o comportamento correto — orçamento que se recalcula sozinho deixa de
ser base de comparação. Mas **a tela não diz isso hoje**, e quem comparar o
Orçamento com o Caixa vai ver diferença sem saber de onde vem.

Exibir, junto às linhas replicadas, a data em que a replicação rodou, e uma nota
de que o valor carrega a correção do índice daquele momento. **Mudança de
interface apenas** — nenhum `budget_line` é recalculado.

---

# 3. LINHA "RECEITAS DO PROJETO"

**3.1 · Origem do total.** O total desta linha passa a vir do cadastro do
projeto, conforme a decisão de **BD-1**. A célula fica **somente-leitura**, com
aparência distinta das editáveis.

**3.2 · Distribuição mensal continua editável.** Os percentuais por mês seguem
sendo digitados pelo usuário, com o valor mensal derivado, exatamente como hoje.

**3.3 · Textos.** Subtítulo da linha: "Total vem do cadastro do projeto
(distribuição mensal editável)". Descrição do bloco: "Informe o total e a
distribuição mensal das receitas. O total de receitas do projeto vem do cadastro
e não pode ser alterado, mas a distribuição mensal pode ser editada pelo
usuário."

**3.4 · Caminho para editar o total.** Como o campo não é mais editável aqui,
oferecer link para o cadastro daquele projeto — `/projeto?proj=<id>` — no padrão
que a tela já usa no estado vazio.

**3.5 · Projeto sem valor cadastrado.** Quando os campos de receita do cadastro
estiverem vazios, exibir campo vazio com a indicação de que falta preencher o
cadastro. **Não exibir R$ 0,00** — zero é uma afirmação, ausência não é. E não
bloquear o restante da tela.

**[NOTA — colisão de rótulos, registrada]** Passam a coexistir: o cabeçalho do
bloco "Receitas por projeto", a coluna "Receita total do projeto" e a linha
"Receitas do Projeto". Três rótulos quase idênticos empilhados. Decisão do
usuário; registrada para que não seja tratada como engano na implementação.

**[NOTA]** O total deixa de ser digitado, mas continua sendo **gravado** em
`budget_account.total` no salvamento, para que a leitura da tela e dos
relatórios não mude de mecanismo. Ele apenas passa a ser derivado do cadastro em
vez de digitado.

---

# 4. LINHA "OUTRAS RECEITAS"

**4.1** Segunda linha do bloco de receitas, vinda de um **grupo do Plano de
Contas** com natureza receita — não chave fixa em código. Ver **BD-5**.

**4.2** Reúne receitas não relacionadas ao core business: aluguel de
equipamento, venda de sobra de material, receita financeira, e afins.

**4.3** O total desta linha é **editável**, no `MoneyInput`, como hoje.

**4.4** A distribuição mensal funciona como nas demais linhas.

**[NOTA — o nome já existe no sistema]** "Outras Receitas" aparece no comentário
de `getBudgetPlanning` (`queries.ts:956`) como exemplo de chave legada, ao lado
de "Receita". Antes de criar o grupo, verificar se já existe `budget_account`
com `row_key = "Outras Receitas"` em alguma versão. Se existir, a linha nova e a
legada terão o mesmo rótulo e chaves diferentes — situação a resolver antes, não
depois.

---

# 4-A. SELEÇÃO DE LINHAS DO PLANO DE CONTAS

**Vale para as duas telas — Orçamentos e Previsão Atualizada** — que
compartilham o componente `budget-planning-screen.tsx`. Implementar uma vez,
respeitando as diferenças de comportamento descritas em 4-A.7.

**Ver BLOQUEIOS BD-6 e BD-7 antes de implementar.**

## 4-A.1 · Estado inicial

A tela abre com os **grupos padrão do plano de contas**, exatamente como na
versão atual: todos os grupos ativos, separados por natureza — receita no bloco
de receitas, despesa no bloco de despesas.

Nenhum projeto existente muda de aparência ao abrir pela primeira vez depois
desta alteração.

## 4-A.2 · Incluir linha

Ação de incluir no rodapé de cada bloco. Abre uma lista para escolha.

A lista contém **apenas grupos já cadastrados na tela de Plano de Contas**,
filtrados por três critérios acumulados:

1. natureza compatível com o bloco;
2. grupo ativo;
3. ainda não presente na grade.

**Não é possível criar grupo por aqui.** Se o grupo desejado não existir, a
ação encaminha para o Plano de Contas — cadastro pertence àquela tela.

A linha incluída entra zerada, sem total e sem percentuais.

## 4-A.3 · Excluir linha

Ação de excluir na própria linha.

**Regra inegociável:** a exclusão é da **grade**, nunca do plano de contas. O
grupo continua cadastrado e disponível para ser incluído de novo.

**Proteção obrigatória.** Como `saveBudgetPlanning` grava apagando e
reinserindo, uma linha retirada da grade tem seus `budget_account` e
`budget_line` removidos no salvamento seguinte. Portanto:

- Linha **sem nenhum valor** — total zero e todos os percentuais zerados — pode
  ser retirada diretamente.
- Linha **com qualquer valor** exige confirmação explícita, que informe quantas
  competências e qual total serão perdidos, e nomeie a operação como remoção de
  lançamento, não como ocultar coluna.
- Nenhuma linha é retirada automaticamente, em nenhuma circunstância.

## 4-A.4 · Linhas que não podem ser removidas

**"Receitas do Projeto"** é fixa. Ela carrega o total vindo do cadastro do
projeto (seção 3) e é a origem da receita reconhecida. Não oferecer ação de
excluir nela.

**Linhas legadas** — as que têm valor gravado mas não correspondem a nenhum
grupo do plano de contas atual, hoje exibidas com o selo "legado" — não podem
ser removidas por esta ação. Elas seguem a decisão de BD-2 e a regra de
não-retroatividade: aparecem, são legíveis, e só mudam por decisão humana
registrada.

## 4-A.5 · Grupo que sai do plano de contas

Se um grupo for inativado no Plano de Contas depois de já ter valores lançados
em algum orçamento, a linha **continua aparecendo** naquele orçamento, com o
mesmo tratamento das linhas legadas. Nada é apagado, nada é reclassificado, e a
correção é decisão humana.

## 4-A.6 · Importação de planilha

A importação continua atualizando apenas linhas que já existem na grade, e
seguindo o mesmo filtro de natureza. Ela **não** inclui linha nova nem remove
linha existente — incluir e excluir são ações explícitas da interface.

Linha da planilha sem correspondência na grade continua sendo ignorada e
contada no aviso de linhas não aplicadas, como hoje.

## 4-A.7 · Diferença entre as duas telas

Em **Orçamentos**, incluir e excluir estão disponíveis conforme acima.

Em **Previsão Atualizada**, o comportamento depende de BD-7. Se a seleção for
herdada, as ações não aparecem e a tela informa que as linhas vêm do orçamento
de origem.

## 4-A.8 · Permissão e auditoria

Incluir e excluir linha exigem a mesma permissão de edição da tela, verificada
no servidor. Ambas as ações registram em `logAudit`, e a exclusão de linha com
valor registra o que foi removido — conta, total e competências.

---

# 5. "FINANCEIRO / CONTÁBIL" SAI DO BLOCO DE RECEITAS

**5.1** O grupo deixa de aparecer no bloco de receitas.

**5.2 · Ordem obrigatória.** Os grupos de receita dos itens 3 e 4 precisam
existir e estar ativos **antes** de "Financeiro / Contábil" deixar de ser
receita.

**Motivo:** em `queries.ts:1101-1103`, se nenhum grupo estiver marcado como
receita, o código usa **todos os grupos ativos** como linhas de receita — e os
mesmos grupos passam a aparecer nos dois blocos ao mesmo tempo, cada um podendo
receber um total de receita e um de despesa. Inverter a ordem produz exatamente
isso.

**5.3 · O que muda de fato.** O grupo aparece nas receitas porque tem ao menos
uma subconta com `natureza = "receita"`, e a regra é que um subitem de receita
torna o grupo inteiro receita. Desmarcar essa subconta faz o grupo **voltar
inteiro para o bloco de despesas** — ele não desaparece, muda de lado.

**5.4 · A subconta desmarcada precisa de destino.** Se ela é de fato uma receita
(desconto por antecipação, por exemplo), passa a pertencer a "Outras Receitas".
Sem isso, ela some do orçamento.

**[FORA DE ESCOPO]** Inativar ou remover o grupo "Financeiro / Contábil" do
Plano de Contas. Decisão adiada até a revisão daquela tela.

---

# 6. ASSISTENTE DE IA

**6.1** Painel lateral direito, compacto, sem dominar a tela. A prioridade
visual continua sendo a grade.

**6.2 · Somente leitura**, conforme **BD-3**. O painel exibe o selo, e o rodapé
declara que nenhuma informação é alterada.

**6.3 · Funções**, conforme o mockup:

- **Revisar orçamento** — analisa a estrutura e identifica pontos de atenção.
- **Analisar distribuição** — avalia a distribuição mensal de receitas e
  despesas.
- **Comparar Budget × Forecast** — destaca as principais variações entre
  cenários.
- **Explicar desvios** — aponta possíveis causas para diferenças nos valores.

**6.4 · Verificações que as funções devem cobrir**, por serem as que a revisão
identificou como invisíveis na tela hoje:

- contas cuja soma de percentuais fecha **abaixo** de 100% (o salvamento só
  bloqueia acima);
- meses do período sem nenhuma distribuição;
- divergência entre o total de receitas e o valor do cadastro do projeto;
- bloco de despesas vazio quando há receita lançada — o card "Resultado" exibe
  receita sem custo, que não é margem;
- linhas com dado em meses **fora** do período atual do projeto.

**6.5 · Isolamento.** O assistente recebe `projectId` e `versionId` explícitos,
validados no servidor contra o tenant do usuário. Nunca por contexto implícito,
nunca por id vindo do cliente sem verificação. Não há RLS no banco: toda
consulta nova precisa do filtro de tenant.

**6.6 · Permissão.** Usuário sem permissão de ver a tela não acessa o
assistente.

**[FORA DE ESCOPO]** "Construir orçamento por texto ou voz", salvo decisão
contrária em BD-3.

---

# 7. LAYOUT

Seguir o mockup para o cabeçalho, os quatro cards, os dois blocos e o painel de
IA.

**7.1** Os quatro indicadores — Receitas, Despesas, Resultado, Recursos
Próprios — permanecem como estão, lendo o que já leem hoje. "Recursos Próprios"
continua vindo de `project.recursos_proprios`.

**7.2** Colunas fixas à esquerda (plano de contas e total) com rolagem
horizontal dos meses, como hoje.

**7.3 · Não copiar os números do mockup.** São ilustrativos e há inconsistência
neles — o valor do primeiro mês não corresponde a 20% do total exibido.

---

# 8. TESTES

1. Título "Orçamentos" na tela e no menu; rota segue `/budget`.
2. Total de "Receitas do Projeto" somente-leitura, com o valor decidido em BD-1.
3. Distribuição mensal da mesma linha continua editável e salva.
4. "Outras Receitas" com total editável, salvando corretamente.
5. "Financeiro / Contábil" ausente do bloco de receitas e presente no de
   despesas.
6. Nenhum grupo aparece nos dois blocos ao mesmo tempo.
7. Projeto sem valor de receita no cadastro: campo vazio, tela funcional.
8. Período segue vindo do cadastro; badge mostra a contagem correta de
   competências.
9. **Antes e depois:** contagem de linhas de `budget_account` e `budget_line`, e
   soma de `total` e `valor`, por versão, em todos os projetos. Nenhuma
   diferença que não seja consequência declarada de BD-1 e BD-2.
10. Salvar o bloco de receitas de uma obra com linha legada não apaga a linha
    legada.
11. Forecast continua com o total somente-leitura e a barra de ferramentas
    própria.
12. Assistente de IA não grava nada, em nenhum caminho.
13. Projeto existente abre com os grupos padrão, idêntico ao comportamento
    atual.
14. A lista de inclusão oferece apenas grupos cadastrados, ativos, de natureza
    compatível e ainda ausentes da grade.
15. Não há caminho para criar grupo a partir das telas de orçamento.
16. Linha zerada é retirada sem atrito; linha com valor exige confirmação que
    informa o que será perdido.
17. "Receitas do Projeto" e linhas legadas não oferecem ação de excluir.
18. Grupo inativado no Plano de Contas continua exibido onde já tem valores.
19. Importação não inclui nem remove linha.
20. Incluir e excluir registram em auditoria, e a exclusão com valor registra o
    que foi removido.

---

# 9. FORA DE ESCOPO

Achados da revisão de código **não aprovados** para esta entrega. Não
implementar, e não corrigir de passagem — se algum for tocado por acidente,
informar no relatório final.

| Achado | O que é |
|---|---|
| BG-10 | Janela do escritório (`kind: "office"`) desliza a cada ano; salvamento apaga o que saiu |
| BG-12 | Mensagens de erro das actions invisíveis em produção (`throw` em vez de `{ ok, error }`) |
| BG-13 | Troca de status da versão falha em silêncio |
| BG-14 | Edição não salva some ao trocar de projeto ou versão |
| BG-15 | Importação converte vírgula decimal em zero |
| BG-16 | Estado vazio manda preencher "Mês inicial"/"Mês final", campos que não existem |
| BG-17 | `mes_inicial` e `mes_final` são colunas mortas com comentário de schema enganoso |
| BG-18 | Fallback `alvos[0]` na página — pertence ao Prompt A |
| BG-19 | Zerar linha legada a apaga permanentemente |
| BG-20 | Duplicar Forecast perde a cadeia de origem |
| BG-21 | `step="0.01"` num campo `numeric(7,4)` |

**BG-11** (salvamento destrutivo para linhas ausentes) é a única exceção: ver a
pré-condição no topo. Ou entra nesta tarefa, ou o item 3.2 não entra.

---

# 10. NÃO REGRESSÃO

Esta mudança não pode alterar o funcionamento de: Forecast, Consolidado, DRE,
Fluxo de Caixa, Medição de Obra, Plano de Contas, Projetos, Unidades, Despesas,
Caixa, INCC, ou qualquer outra tela.

Não altera regras de cálculo do valor mensal, da soma de percentuais, dos
indicadores do topo, nem o comportamento de exportar e importar planilha.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Arquivos e componentes alterados.
2. Como o total de "Receitas do Projeto" passou a ser resolvido, com o campo do
   cadastro utilizado e o tratamento de `terreno_fora_caixa`.
3. Como "Outras Receitas" foi ligada ao Plano de Contas, e se o grupo já existia.
4. Como "Financeiro / Contábil" saiu do bloco de receitas, e em que ordem.
5. Destino dado à linha legada "Receita", e confirmação de que nenhum valor foi
   apagado.
6. Se a pré-condição BG-11 foi implementada, e como.
7. Funcionamento do Assistente de IA, e confirmação de que não grava.
8. Comparação antes/depois de `budget_account` e `budget_line` — contagens e
   somas.
9. Decisões tomadas em BD-1 a BD-7 e como foram implementadas.
10. Onde a seleção de linhas ficou gravada, e o que acontece com projeto que
    não tem seleção.
11. Confirmação de que nenhum item da seção 9 foi tocado.
12. Migrações criadas, com o `down` de cada uma.
13. Limitações encontradas.


<a id="prompt-f"></a>


========================================================================


### ▸ 27 de 42 · PROMPT F — Previsão Atualizada

**Bloco 4 · Planejamento e obra** · Bloqueios: BF-1 · BF-2 · BF-3 · BF-4

========================================================================


# PROMPT F — TELA PREVISÃO ATUALIZADA (ex-Lançamento Forecast)

Growth Construction · `/forecast`.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum número já lançado no sistema pode ser alterado.**
Valores, totais, percentuais, saldos, datas e quantidades existentes em produção
permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda, converte,
normaliza, migra, reclassifica ou "corrige" um número já gravado — nem como
efeito colateral de mudança de layout, de rota, de nome de campo ou de origem de
dado. Se uma alteração exigir tocar em número lançado: **PARE, não execute, e
informe qual número, por quê e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups definem layout, hierarquia visual, rótulos e comportamento de interface
— nada além disso. Nunca usar valores, percentuais, datas, nomes de obra, de
cliente, de proprietário, endereços, coordenadas, nomes de usuário ou
contadores vindos de mockup. Nunca criar registro, seed, fixture, valor padrão
ou dado de teste a partir de um mockup.

**Aplicação específica:** as revisões "Revisão 02 · agosto/2026" e "Revisão 01 ·
maio/2026", os percentuais e os valores da grade do mockup são ilustração.

---

# ORDEM DE EXECUÇÃO

| | Prompt | Ordem |
|---|---|---|
| **C** | Barra lateral | 1º |
| **A** | Remoção do projeto ativo global | 2º |
| **B** | Tela Projetos | 3º |
| **D** | Tela Orçamentos | 4º |
| **F** | este — Previsão Atualizada | 5º |
| **E** | Assistente de IA | arquitetura, em etapas próprias |

**F depende de D.** As duas telas são o mesmo componente,
`budget-planning-screen.tsx`, com `kind` diferente. Tudo que é comum já foi
decidido lá.

**Divisão de responsabilidade:**

| Assunto | Dono |
|---|---|
| Renomear as duas telas, incluindo "Previsão Atualizada" | **D** (seção 2.5) |
| Linha "Receitas do Projeto" e "Outras Receitas" | **D** (seções 3 e 4) |
| Incluir e excluir linhas do plano de contas | **D** (seção 4-A) |
| Saída de "Financeiro / Contábil" do bloco de receitas | **D** (seção 5) |
| Arquitetura do assistente de IA | **E** |
| Barra de ferramentas de versão, identificação da revisão, totais herdados, comparação com o orçamento | **F** |

Nada do que é dono do D se repete aqui.

---

# CÓDIGO REVISADO

Toda a coleta foi lida: a página, `budget-forecast-compare.tsx`,
`createForecastFromBudget`, `duplicateForecast`, `getForecastComparison`,
`getProjectVersionsByKind`, `src/lib/planning.ts`, a tabela `version` e as
buscas por `locked` e por `status`.

**Três fatos confirmados na coleta, que este prompt passa a tratar como certos:**

**1 · Nenhuma consulta filtra por `version.status`.** A coleta procurou e
declarou: não existe `where`, `eq` ou `inArray` sobre a coluna em todo o
repositório. Ela é apenas projetada e exibida.

**2 · Aprovar não trava.** `locked` tem um único `UPDATE`, em
`toggleVersionLock` (`versions.ts:206`), disparado por `/versao`. Os outros dois
pontos que gravam a coluna são `locked: false` fixo na criação da previsão.

**3 · São três situações, não duas.** `setVersionStatus` aceita `Rascunho`,
`Concluído` e `Aprovado`.

**Uma correção de leitura anterior:** cliente e servidor calculam o valor mensal
com a mesma fórmula — `Math.round(total * pct) / 100`. Não há divergência.

**[NOTA]** Quem grava fato operacional em versão de planejamento é
`duplicateVersion`, de `versions.ts`, disparada por `/versao`. O
`duplicateForecast` usa `copyPlanningData` e é limpo. Não confundir os dois.

---

# BLOQUEIOS

## BF-1 · De onde vem o total de receitas da previsão?

Hoje o total por conta é somente-leitura nesta tela
(`totalReadOnly = kind === "forecast"`), herdado do orçamento no momento da
criação. Em produção, há obra com um total aqui e outro, bem diferente, no
orçamento [dado de produção removido] — os dois divergem, e a interface não oferece caminho para corrigir.

Depois do Prompt D, o total de "Receitas do Projeto" no orçamento passa a vir do
cadastro do projeto. A pergunta é o que a previsão faz.

**Escolher uma:**

1. **Mesma fonte do orçamento.** A previsão lê o cadastro do projeto, igual ao
   orçamento. As duas telas mostram sempre o mesmo total, e a revisão trata só da
   distribuição mensal. Simples e sem divergência possível.
2. **Congelado na criação.** A previsão guarda o total que o orçamento tinha
   quando ela foi criada. Preserva o retrato histórico, mas reintroduz
   divergência: o cadastro muda e a previsão antiga continua com o número velho —
   o que pode ser exatamente o desejado, desde que a tela **diga** que aquele
   número é de outra data.

Se for a 2, a tela precisa exibir a data e o valor de referência ao lado do
total.

**Independente da escolha:** as previsões já existentes mantêm os valores que
têm. Nenhuma é recalculada.

## BF-2 · O que a situação deve significar — RESPONDIDO EM PARTE

**O fato está estabelecido:** aprovar não trava. `locked` só é alterado em
`/versao`, por `toggleVersionLock`. Uma previsão aprovada continua editável por
qualquer pessoa com permissão, e nada registra o que mudou depois da aprovação.

**Falta a decisão de negócio.** Três caminhos:

1. **Unir.** Aprovar passa a gravar `locked`, e voltar para Rascunho libera.
   É o que a maioria supõe que já acontece. Exige permissão própria para reabrir
   e auditoria de quem reabriu.
2. **Manter separadas e dizer isso.** A situação segue documental, e a tela
   declara que não bloqueia edição, exibindo a trava como indicador
   somente-leitura ao lado.
3. **Tirar a situação desta tela**, concentrando os dois controles em `/versao`.

Não implementar travamento novo sem decisão: passa a existir bloqueio onde hoje
não existe.

**[ACRÉSCIMO]** Definir também o que **"Concluído"** significa — etapa
intermediária ou sinônimo de aprovado. O Prompt H, que tira o rascunho dos
relatórios, precisa saber se "Concluído" entra ou não.

## BF-3 · A importação de planilha pode gravar totais aqui?

O `importar` grava `rows[i].total` a partir da planilha **sem verificar**
`totalReadOnly`. A regra "o total é herdado e não se edita" vale na interface e
cai pela planilha. É a explicação mais provável da divergência descrita em BF-1.

**Escolher uma:**

1. **Fechar a brecha.** A importação passa a ignorar a coluna de total nesta
   tela, atualizando apenas os percentuais, e informa que o total foi ignorado.
2. **Manter.** Nesse caso a regra da interface é uma sugestão, e o campo
   somente-leitura precisa deixar de existir — trava que se contorna por outro
   caminho é pior que trava nenhuma.

## BF-4 · A seleção de linhas é herdada?

Ver **BD-7 do Prompt D**. A decisão é a mesma e não se repete aqui.

---

# 0. PRESERVAÇÃO DE DADOS

Nenhum dado existente pode ser alterado, apagado, convertido, recalculado,
reclassificado ou desvinculado por esta tarefa. Vale para `version`,
`budget_account`, `budget_line` e todo o resto.

Nenhum `UPDATE` em massa. Nenhuma migração que reinterprete dado existente.
Nenhuma correção automática de dado histórico. Migração, se houver, é aditiva,
com `IF NOT EXISTS` e com o `down` correspondente.

**Atenção específica desta tela.** `saveBudgetPlanning` grava apagando e
reinserindo: remove todos os `budget_account` e `budget_line` do bloco naquela
versão e reinsere o que veio no formulário. Com até doze previsões por projeto,
a superfície de perda é maior que no orçamento. Nenhuma alteração deste prompt
pode ampliar esse comportamento.

Se qualquer passo exigir alterar dado de negócio: **PARE**, informe o dado, o
motivo, o impacto e a alternativa não destrutiva.

---

# 1. RESTRIÇÕES FIXAS

**1.1 · O período vem do cadastro do projeto.** As colunas mensais saem de
`start_date` e `end_date`, exibidas como somente-leitura. Nenhuma alteração
nessa origem.

**[ACRÉSCIMO]** A janela é a da **função compartilhada** definida na seção 55 do
Prompt I — a mesma que Orçamentos usa. O número de colunas exibido aqui não
muda. `duration_months` e `mes_inicial`/`mes_final` não alimentam cálculo algum.

**1.2 · A estrutura de análise não muda.** Dois blocos, receitas acima de
despesas, modelo total + percentual mensal, valor derivado, meses em colunas com
rolagem horizontal e vertical.

**1.3 · Rotas e nomes internos não mudam.** `/forecast`, `kind = "forecast"`,
`version.key = "forecast"`, `budget_line`, `budget_account`,
`duplicateForecast`. Renomear rótulo é apresentação; renomear dado é migração.

**1.4 · O limite de previsões por projeto não muda** nesta tarefa.

---

# 2. IDENTIFICAÇÃO DA PREVISÃO

**2.1** O seletor no topo exibe hoje o rótulo da versão, não o nome que o
usuário digitou ao criar. Com várias revisões por projeto, não há como saber
qual está aberta.

Passar a exibir **o nome dado na criação**, e ordenar da mais recente para a
mais antiga.

**2.2** Ao lado do nome, exibir a **base de origem** — de qual orçamento ou de
qual previsão ela foi criada — e a data de criação. É o mínimo para que alguém
entenda o que está olhando meses depois.

**[NOTA]** Verificar se `version.source_version_id` sustenta isso. Hoje
`duplicateForecast` copia `sourceVersionId` da origem em vez de apontar para
ela, então a cadeia se perde na segunda geração. Isso está listado como fora de
escopo (seção 9) — se a origem não puder ser exibida corretamente por causa
disso, **informar em vez de contornar**.

---

# 3. NOVA PREVISÃO A PARTIR DO ORÇAMENTO

**[ACRÉSCIMO — FC-10 · o limite é verificado fora da transação.]** Tanto
`createForecastFromBudget` quanto `duplicateForecast` contam as previsões
existentes **antes** de abrir a transação. Duas criações simultâneas passam as
duas pela checagem e estouram o limite. A chave única é sobre
`(project_id, key)`, e a `key` é aleatória — não protege. Mover a verificação
para dentro da transação.

**3.1** Preservar o bloco existente, com base, nome, e as ações de criar,
duplicar e comparar. Renomear conforme a seção 2.5 do Prompt D.

**3.2** O nome passa a ser **obrigatório** na criação. Previsão sem nome é a
causa raiz do problema descrito em 2.1.

**3.3** Preservar integralmente o que a criação faz hoje: copiar a estrutura e
os totais da base escolhida, criar a versão com seu `kind` e `key`, e respeitar
o limite de previsões por projeto.

**3.4** A mensagem de limite atingido precisa ser legível pelo usuário — ver
seção 9 sobre o formato de retorno das actions.

---

# 4. DUPLICAR A PREVISÃO ATUAL

Preservar o comportamento atual. A única alteração é o rótulo.

**[FORA DE ESCOPO]** A correção da cadeia de origem — ver seção 9.

---

# 5. COMPARAR COM O ORÇAMENTO

Quatro achados da revisão de código concentram-se aqui. A comparação é a tela
que existe para mostrar variação, e é a que mais erra ao mostrá-la.

**5.0 · FC-08 · A cor está invertida no bloco de despesas.** A função `tone`, em
`budget-forecast-compare.tsx`, pinta verde quando a variação é positiva e
vermelho quando é negativa, e é usada nos dois blocos. **Despesa prevista acima
do orçado aparece em verde.** A cor segue o significado, não o sinal: no bloco de
despesas, variação positiva é alerta.

**5.0.1 · FC-07 · A comparação escolhe um orçamento sozinha.** Em
`queries.ts:441-444`, quando a previsão não tem `sourceVersionId`, a função pega
`budgets[0]` — o orçamento mais antigo do projeto — e compara contra ele, exibindo
o rótulo daquele no cabeçalho, como se fosse a origem real.

É fallback silencioso sobre o número que sustenta uma decisão. **Corrigir:** sem
origem registrada, a tela informa que a previsão não tem orçamento de origem e
oferece a escolha explícita. Nunca escolher por conta própria.

**5.0.2 · FC-09 · A comparação é só de totais.** O `merge` usa `r.total`; a
variação por mês nunca é comparada. A função calcula `budgetByMonth` e
`forecastByMonth` — e o componente **não renderiza nenhum dos dois**. Numa tela
cujo modelo inteiro é mês a mês, duas distribuições completamente diferentes com
o mesmo total aparecem como "sem variação".

**Corrigir:** exibir a comparação mensal, que já está calculada e sendo
descartada.

**5.0.3 · FC-11 · O modo comparação substitui a página inteira.** A página faz
`return` antecipado quando a URL traz `?cmp=1`: sem cabeçalho, sem seletor de
projeto, sem barra de versões, apenas um link de voltar. Quem chega por link
direto perde o contexto. Manter a moldura da tela.

**5.0.4 · [ACRÉSCIMO] Os dois lados da comparação tratam o INCC de formas
diferentes.** O lado do orçamento vem de `budget_line`, com a correção
**congelada** no instante em que a replicação rodou. O lado que passa por
`calcProjectionBySource` é **recalculado a cada abertura**, com o índice de hoje.

Os dois números podem divergir na mesma tela, e a diferença não é variação de
cenário — é data de cálculo do índice.

Declarar isso na comparação: qual lado é retrato e de quando, qual é
recalculado. **Nenhum valor é alterado.**

**5.1** Preservar a ação existente, renomeada.

**5.2** A comparação precisa declarar **o que está sendo comparado**: qual
previsão, qual orçamento, e por qual regime. Comparar competência com
competência; nunca misturar com caixa.

**5.3** Conta presente em um lado e ausente no outro deve aparecer como
**ausente**, não como zero. Zero é uma afirmação; ausência não é. Isso vale
especialmente se BD-7 permitir seleção de linhas própria na previsão.

**5.4 · Não criar segunda fonte da verdade.** A comparação lê `budget_line` das
duas versões. Não recalcular, não derivar de campo de cadastro, não gravar nada.

---

# 6. TOTAIS HERDADOS

**6.1** Conforme **BF-1**, o total por conta permanece somente-leitura nesta
tela, e a origem escolhida ali é declarada na interface — não basta travar o
campo, o usuário precisa saber de onde vem o número.

**6.2** Quando o total da previsão divergir do total atual do orçamento, exibir
a divergência de forma visível e **não bloqueante**. Não corrigir, não
recalcular, não sugerir gravação automática.

**6.3** Conforme **BF-3**, resolver a brecha da importação.

---

# 7. SITUAÇÃO DA VERSÃO

**7.1** Conforme **BF-2**. Nenhum travamento novo sem decisão explícita.

**7.1.1** As três situações são `Rascunho`, `Concluído` e `Aprovado` — a tela
precisa oferecer as três, e não duas.

**7.2** A troca de situação hoje falha em silêncio: o erro é engolido e a tela
passa a exibir um estado que não foi gravado. Enquanto isso não for corrigido —
está fora de escopo, seção 9 — **não** acrescentar nenhum comportamento novo que
dependa da situação da versão.

---

# 8. ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1: painel lateral, recolhível, com `projectId` e
`versionId` explícitos validados no servidor contra o tenant.

Funções desta tela:

- **Revisar previsão** — analisa a estrutura e identifica pontos de atenção.
- **Analisar distribuição** — avalia a distribuição mensal de receitas e
  despesas.
- **Comparar com o orçamento** — destaca as principais variações entre
  cenários.
- **Explicar desvios** — aponta possíveis causas para diferenças nos valores.

Verificações que as funções devem cobrir, por serem invisíveis na tela hoje:

- contas cuja soma de percentuais fecha **abaixo** de 100% — o salvamento só
  bloqueia acima;
- meses do período sem distribuição;
- divergência entre o total da previsão e o total atual do orçamento;
- contas presentes no orçamento e ausentes na previsão, e o contrário;
- linhas com dado em meses **fora** do período atual do projeto.

## 8.1 · Reprojeção sugerida pelo assistente

**Decisão registrada:** a tela **não** ganha botões de "preencher com dados do
orçamento" nem "preencher com o realizado". Dois botões que reescrevem a grade
inteira, ao lado do Salvar, numa tela cuja gravação apaga e reinsere, é
consequência demais por um clique.

A operação passa a ser **oferecida pelo assistente**, que a propõe quando fizer
sentido — por exemplo, quando houver competências já decorridas sem revisão.

**Duas sugestões possíveis:**

1. **Partir do orçamento** — replicar a distribuição do Budget de origem.
2. **Partir do realizado** — usar as despesas da versão **Atual** nas
   competências já decorridas e redistribuir o restante do total pelos meses
   futuros.

A segunda é expressamente permitida pelo §4 do Prompt I, que autoriza o Forecast
a usar a Atual como **referência analítica** quando a funcionalidade previr.

## 8.2 · Como a proposta é apresentada

**Comparação, não grade preenchida.** A proposta é exibida como o que muda —
por conta, com o valor de antes e o de depois, e o total da variação. Treze
colunas por conta dão algumas centenas de células; pedir conferência célula a
célula não é conferência.

O assistente **não grava**. Quem grava é o usuário, pelo botão que já existe,
pela mesma action e com a mesma validação.

## 8.3 · A proposta cria uma nova revisão

**Regra:** a reprojeção **não edita a revisão aberta**. Ela cria uma revisão
nova, pelos caminhos que já existem, e a atual permanece intacta.

Dois motivos. O caminho de criação usa `copyPlanningData` e não contamina versão
de planejamento com fato operacional. E preserva a pergunta que uma previsão
existe para responder — *o que se previa em maio* —, que se perde se a revisão de
maio for reescrita com o realizado de maio.

**[NOTA — limite de revisões]** O limite é de 12 por projeto. Quem revisar todo
mês o atinge em um ano. Decidir se o limite sobe, se revisões antigas são
arquivadas, ou se a criação passa a avisar quando estiver perto do teto. Não
implementar aumento de limite sem decisão.

## 8.4 · O que a proposta precisa verificar antes

O total por conta é somente-leitura nesta tela. Se o realizado das competências
decorridas já superar o total herdado, os percentuais estouram 100% e o
salvamento recusa.

O assistente precisa **detectar e informar isso na proposta**, não deixar o
usuário descobrir no Salvar. Contas nessa situação aparecem sinalizadas, com o
valor excedente.

## 8.5 · Limites

O selo "Somente leitura" não pode coexistir com nenhuma função de escrita — e a
proposta de preenchimento **não é escrita**, porque não grava. Se o rótulo ficar
ambíguo, usar redação que descreva o que acontece: o assistente propõe, o usuário
salva.

Nunca assistido nesta tela: excluir revisão, trocar a situação da versão,
alterar o total por conta.

---

# 9. FORA DE ESCOPO

Achados da revisão **não aprovados** para esta entrega. Não implementar e não
corrigir de passagem; se algum for tocado por acidente, informar.

| Achado | O que é |
|---|---|
| BG-10 | Janela do escritório desliza a cada ano; salvamento apaga o que saiu |
| BG-11 | Salvamento destrutivo para linhas ausentes do formulário |
| BG-12 | Mensagens de erro das actions invisíveis em produção |
| BG-13 | Troca de situação da versão falha em silêncio |
| BG-14 | Edição não salva some ao trocar de projeto ou versão |
| BG-15 | Importação converte vírgula decimal em zero |
| BG-16 | Estado vazio nomeia campos que não existem no cadastro |
| BG-17 | `mes_inicial` e `mes_final` são colunas mortas |
| BG-18 | Fallback `alvos[0]` na página — pertence ao Prompt A |
| BG-20 | Duplicar previsão perde a cadeia de origem na segunda geração |
| FC-13 | Cadeia de fallback de quatro níveis na resolução do projeto — pertence ao Prompt A |

**BG-11 é pré-condição** de qualquer alteração que remova linha da grade — ver a
pré-condição do Prompt D. **BG-12 e BG-13** afetam diretamente as seções 3.4 e
7.2 deste prompt: sem elas, o usuário não lê por que a operação falhou.

---

# 10. NÃO REGRESSÃO

Não altera Orçamentos, Consolidado, DRE, Fluxo de Caixa, Medição de Obra, Plano
de Contas, Projetos, Unidades, Despesas, Caixa ou INCC.

Não altera regras de cálculo do valor mensal, da soma de percentuais, dos
indicadores do topo, nem o comportamento de exportar planilha.

---

# 11. TESTES

1. Título e menu exibem "Previsão Atualizada"; rota segue `/forecast`.
2. O seletor mostra o nome dado na criação, ordenado da mais recente à mais
   antiga.
3. Base de origem e data de criação visíveis.
4. Criar previsão exige nome.
5. Criar preserva a estrutura e os totais da base.
6. O limite de previsões por projeto continua valendo, com mensagem legível.
7. Duplicar mantém o comportamento atual.
8. Comparar declara as duas versões e o regime.
9. Conta ausente de um lado aparece como ausente, não como zero.
10. Total por conta permanece somente-leitura, com a origem declarada.
11. Divergência entre previsão e orçamento aparece sem bloquear.
12. Importação respeita a decisão de BF-3.
13. Assistente não grava nada, em nenhum caminho.
14. **Antes e depois:** contagem de `version`, `budget_account` e `budget_line`,
    e soma de `total` e `valor` por versão, em todos os projetos. Nenhuma
    diferença.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Arquivos e componentes alterados.
2. Divergências encontradas entre o código lido e o descrito neste prompt.
3. Decisões tomadas em BF-1 a BF-4 e como foram implementadas.
4. De onde passou a vir o total de receitas da previsão.
5. Quem grava `version.locked` e o que a situação "Aprovado" passou a
   significar.
6. Como a identificação da previsão foi resolvida, e se a cadeia de origem pôde
   ser exibida.
7. O que a comparação lê, tabela e coluna, e o regime adotado.
8. Funcionamento do assistente e confirmação de que não grava.
9. Comparação antes/depois de `version`, `budget_account` e `budget_line`.
10. Confirmação de que nenhum item da seção 9 foi tocado.
11. Migrações criadas, com o `down` de cada uma.
12. Limitações encontradas.


<a id="prompt-h"></a>


========================================================================


### ▸ 28 de 42 · PROMPT H — Rascunho não entra em relatório

**Bloco 4 · Planejamento e obra** · Bloqueios: BH-1 · BH-2 · BH-3 · BH-4

**Muda número em produção.** Só depois de D e F.

========================================================================


# PROMPT H — ORÇAMENTO EM RASCUNHO NÃO ENTRA EM RELATÓRIO

Growth Construction · regra que atravessa as telas de relatório.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum número já lançado no sistema pode ser alterado.**
Valores, totais, percentuais, saldos, datas e quantidades existentes em produção
permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda, converte,
normaliza, migra, reclassifica ou "corrige" um número já gravado. Se uma
alteração exigir tocar em número lançado: **PARE, não execute, e informe qual
número, por quê e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups definem layout e comportamento de interface. Nunca usar valores, nomes
ou datas de mockup, nem criar registro, seed, fixture ou dado de teste a partir
deles.

---

# O QUE ESTA TAREFA FAZ

Hoje, um orçamento em Rascunho já produz número em relatório contábil. Salvar
o orçamento invalida `/dre` e `/fluxocaixa`, e o valor aparece. Não existe
estado "em elaboração, ainda não conta".

Esta tarefa cria esse estado: **versão de planejamento em Rascunho deixa de
alimentar relatórios; só entra depois de Aprovada.**

**Isto muda número exibido em produção.** Nenhum dado é alterado, mas relatórios
passam a mostrar valores diferentes dos de hoje. É a mudança de maior alcance
decidida até agora, e por isso tem etapa de transição obrigatória (seção 5).

---

# ORDEM DE EXECUÇÃO

Depois de **D** e **F**, que renomeiam as telas e organizam as linhas. Antes ou
depois de **E**, indiferente.

**Relação com D e F:** aquelas telas são onde a situação é trocada. Esta tarefa é
quem dá consequência à troca. D e F não implementam nada desta regra.

---

# BLOQUEIOS

## BH-1 · Quantas versões estão em cada situação hoje?

`version.status` tem default `"Rascunho"`. É bem provável que a maioria — talvez
a totalidade — das versões de planejamento em produção esteja em Rascunho,
simplesmente porque ninguém precisou aprovar nada até hoje.

Se a regra for ligada nesse estado, **DRE, Dashboard, Consolidado, Projeção,
Resumo e Fluxo de Caixa esvaziam de uma vez.**

**Entregar antes de qualquer código:** contagem de versões por `kind` e por
`status`, em todos os projetos e todos os tenants. Só com esse número dá para
decidir a transição da seção 5.

## BH-2 · A regra vale só para versões de planejamento — confirmar

A situação é coluna de `version`, e **toda** versão tem situação, inclusive a
`atual`, que carrega a realidade: despesas, caixa, medições, unidades.

Se a regra não distinguir o tipo, a versão `atual` em Rascunho some dos
relatórios — e a DRE deixa de mostrar o que a obra realmente gastou. Seria uma
falha catastrófica e silenciosa.

**Regra fixa, salvo decisão explícita em contrário:** o filtro por situação vale
apenas para versões de `kind` **budget** e **forecast**. A versão **atual nunca
é filtrada por situação**, em nenhuma tela, em nenhuma circunstância.

Confirmar por escrito antes de implementar.

**[ACRÉSCIMO — a regra ficou mais crítica]** A seção 57 do Prompt I define que a
**receita da DRE na versão Atual** vem da venda de unidade e das contas a receber
avulsas. A versão Atual também tem `status`, e o default é `"Rascunho"`.

Se o filtro desta tarefa alcançar a versão Atual, **a receita da DRE zera junto
com o orçado** — e o sintoma é um relatório que abre normalmente, só com números
menores. Quando esta tarefa e a seção 57 estiverem ambas em produção, este
bloqueio deixa de ser cuidado e passa a ser a diferença entre a DRE mostrar o
resultado da obra e não mostrar nada.

## BH-3 · O que acontece com a versão em Rascunho no seletor?

Sete telas usam `version-multiselect` para o usuário escolher quais versões
entram: Caixa, Consolidado, Dashboard, DRE, Fluxo de Caixa, Projeção e Resumo.

Se uma versão em Rascunho for selecionável mas não somar nada, o usuário escolhe
e vê zero, sem entender por quê.

**Escolher uma:**

1. **Ocultar do seletor.** Simples, mas a versão some sem explicação.
2. **Manter, marcada como "Rascunho — não entra nos totais"**, e não selecionável
   ou selecionável com aviso. Mais palavras na tela, e nenhuma surpresa.

Recomendação: a 2. Sumir sem dizer por quê é como se descobre uma regra nova
pelo susto.

## BH-4 · Quem pode aprovar, e aprovar pode ser desfeito?

Aprovar deixa de ser rótulo e passa a mudar relatório. Isso exige decidir:

- Qual permissão aprova? Hoje `setVersionStatus` usa a permissão de edição da
  tela de planejamento. Passar de Rascunho a Aprovado com efeito em DRE talvez
  mereça permissão própria.
- Voltar de Aprovado para Rascunho tira número de relatório. Deve ser permitido?
  Com qual confirmação?

---

# 1. A REGRA

**1.1** Versão de `kind` `budget` ou `forecast` com `status` diferente de
Aprovado **não é considerada** nas consultas que alimentam relatórios e
dashboards.

**1.2** A versão `atual` **nunca** é filtrada por situação — ver BH-2.

**1.3** Nenhum dado é alterado. O orçamento em Rascunho continua gravado,
editável e visível nas telas de Orçamentos e Previsão Atualizada. O que muda é
apenas o que os relatórios somam.

**1.4** Aprovar não trava a edição. Trava é `version.locked`, coluna separada,
acionada em `/versao`. As duas coisas seguem independentes, salvo decisão em
contrário registrada no BF-2 do Prompt F.

---

# 2. ONDE A REGRA VALE

| Tela | Situação |
|---|---|
| `/dre` | filtra |
| `/fluxocaixa` | filtra |
| `/dashboard` | filtra |
| `/consolidado` | filtra |
| `/projecao` | filtra |
| `/resumo` | filtra |
| `/medicao` | filtra — o orçado do relatório CEF vem de `budget_line` |
| `/contabilidade` | filtra |
| `/budget` e `/forecast` | **não filtra** — é onde se edita o rascunho |
| `/caixa`, `/contaspagar`, `/contasreceber`, `/despesas`, `/fechamento`, `/balancodia` | **não filtra** — leem movimento real, não planejamento |

**[NOTA]** `/dre` hoje **não lê a tabela `version`**. Suas consultas alcançam
`budget_line`, `conta_receber`, `despesa_parcela`, `incc_rate` e `permuta`. Para
filtrar por situação será preciso alcançar `version` a partir de `budget_line`.
Isso é mudança em consulta compartilhada — ver seção 4.

---

# 3. O QUE A REGRA NÃO FILTRA

Ponto crítico. A regra é sobre **planejamento**, não sobre realidade.

- `conta_receber`, `despesa`, `despesa_parcela`, `cash_entry`, `medicao`,
  `permuta`, `reembolso`, `unit` — dado de movimento. **Nunca filtrado por
  situação de versão.**
- A versão `atual`, qualquer que seja sua situação.
- Qualquer consulta de conciliação, fechamento ou saldo.

Na prática: numa DRE que compara orçado com realizado, a coluna do realizado
**não muda**. Some apenas a coluna do orçado, enquanto a versão estiver em
Rascunho.

---

# 4. CONSULTAS COMPARTILHADAS — CUIDADO

`getMonthlyRevenue` é usada por `/contabilidade`, `/dashboard`, `/dre`,
`/projecao` e `/resumo`. `getRevenueBySource` por `/consolidado` e `/projecao`.
`getBudgetLines` por `/medicao`.

Alterar uma delas atinge todas as telas que a chamam, inclusive telas que ainda
não foram revisadas.

**Exigências:**

**4.1** Listar, antes de alterar, todas as funções que leem `budget_line` e
todas as telas que as chamam.

**4.2** O filtro entra de forma explícita e visível no código, não escondido
dentro de um `where` genérico. Quem ler a função daqui a um ano precisa ver que
existe um filtro por situação.

**4.3** Não duplicar função só para aplicar o filtro em uma tela. Se o
comportamento precisar variar por tela, o filtro vira parâmetro explícito.

**4.4** Nenhuma consulta de movimento ganha filtro por situação, nem por
descuido — ver seção 3.

---

# 5. TRANSIÇÃO — OBRIGATÓRIA

Sem esta etapa, ligar a regra apaga números de produção da noite para o dia.

**5.1** A regra entra **desligada**, atrás de uma chave por tenant, com valor
inicial que preserva o comportamento atual.

**5.2** Antes de ligar, a tela de Orçamentos e a de Previsão Atualizada exibem
um aviso nas versões em Rascunho: quando a regra for ligada, esta versão deixará
de aparecer nos relatórios.

**5.3** Produzir uma **lista de conferência**: todas as versões de planejamento
em Rascunho, com projeto, nome, total de receitas e total de despesas — ou seja,
exatamente o que sairia dos relatórios. É esse número que o usuário precisa ver
antes de decidir.

**5.4** **Nenhuma aprovação em massa.** Não escrever migração que marque as
versões existentes como Aprovadas. Seria alteração de dado de negócio, e
contraria a regra global e a regra de não-retroatividade. Aprovar é decisão
humana, versão por versão, a partir da lista de 5.3.

**5.5** A chave só é ligada por decisão explícita, depois de a lista estar
zerada ou de o usuário aceitar as ausências que restarem.

---

# 6. PRESERVAÇÃO DE DADOS

Nenhum `UPDATE`, `DELETE` ou migração sobre dado de negócio. Nenhuma versão
muda de situação por efeito desta tarefa. Nenhum `budget_line` é tocado.

Se for necessária coluna para a chave da seção 5.1, ela é aditiva, com
`IF NOT EXISTS` e com o `down` correspondente.

---

# 7. NÃO REGRESSÃO

Com a chave desligada, **todos os relatórios devolvem exatamente os mesmos
números de antes**. Essa é a condição de aceite mais importante desta tarefa.

Não altera regra de cálculo, não altera a seleção manual de versões, não altera
o comportamento de salvar orçamento, não altera invalidação de cache.

---

# 8. TESTES

1. Chave desligada: DRE, Fluxo de Caixa, Dashboard, Consolidado, Projeção,
   Resumo, Medição e Contabilidade devolvem os mesmos totais de antes, para
   todos os projetos.
2. Chave ligada, versão de orçamento em Rascunho: o orçado some dos relatórios.
3. Chave ligada, mesma versão aprovada: o orçado volta, com o mesmo valor.
4. **Versão `atual` em Rascunho: nada some, em nenhuma tela.** Repetir para as
   oito telas que filtram.
5. Movimento real — conta a receber, despesa, caixa, medição — não é afetado em
   nenhum cenário.
6. Telas de Orçamentos e Previsão continuam exibindo o rascunho integralmente.
7. Seletor de versões se comporta conforme a decisão de BH-3.
8. Voltar de Aprovado para Rascunho tira o número, conforme BH-4.
9. Nenhuma versão mudou de situação por efeito da implementação.
10. **Antes e depois:** com a chave desligada, comparar os totais de cada
    relatório, por projeto. Nenhuma diferença.

---

# 9. RELATÓRIO FINAL OBRIGATÓRIO

1. Contagem de versões por `kind` e `status`, antes de qualquer alteração
   (BH-1).
2. Confirmação de que a versão `atual` nunca é filtrada, e como isso foi
   garantido no código.
3. Lista das funções de consulta alteradas e de todas as telas que as chamam.
4. Como o filtro foi expresso, e onde.
5. Como a chave da seção 5 funciona e onde fica.
6. A lista de conferência da seção 5.3.
7. Comparação antes/depois dos totais de cada relatório, com a chave desligada.
8. Confirmação de que nenhuma versão mudou de situação.
9. Decisões tomadas em BH-1 a BH-4.
10. Migrações criadas, com o `down` de cada uma.
11. Limitações encontradas.


<a id="prompt-v"></a>


========================================================================


### ▸ 29 de 42 · PROMPT V — Medição de Obra

**Bloco 4 · Planejamento e obra** · Bloqueios: BV-1 · BV-2 · BV-3 · BV-4

⟨reescrito⟩ Fusão das duas telas, autoria do engenheiro, e o BV-1.

========================================================================


# PROMPT V — MEDIÇÃO DE OBRA

Growth Construction · `/medicaolanc` (Lançamento de Medição) e `/medicao`
(Relatório CEF).

**[REVISÃO 2]** As duas telas **passam a ser uma só, com abas** — seção 0. E a
seção 3 foi reescrita com a coleta de `/medicao`, que na revisão 1 ainda não
tinha sido lida.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Medições, valores,
competências e observações existentes permanecem como estão. Se uma alteração
exigir tocar em dado existente: **PARE, não execute, e informe qual dado, por
quê, quantos registros e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**

---

# O QUE ESTA TELA É

**Informação auxiliar.** Decisão registrada: a medição **não alimenta a DRE**,
não compõe custo e não entra no resultado.

Ela existe para dois fins: dar ao **engenheiro** um lugar para declarar o avanço
da obra, e alimentar o **Relatório CEF**, que compara o orçado com o medido por
grupo de obra.

**O engenheiro só acessa esta tela.** A matriz de permissões já garante isso —
`medicaolanc` completo, todo o resto negado.

**[ACRÉSCIMO — módulo]** As duas telas passam a viver no **módulo Obra**, não em
Despesas. A medição é declaração técnica do engenheiro, não lançamento
financeiro — deixá-la no módulo financeiro contradizia o próprio recorte de
permissão.

O módulo Obra fica com: **Medição de Obra** (o relatório CEF), **Lançar
medição**, **Estoque**, **Ponto** e **Parâmetros / INCC**.

**[NOTA — os dois nomes]** `medicao` e `medicaolanc` têm hoje rótulos quase
idênticos e fazem coisas opostas: uma é relatório, a outra é lançamento. Os
rótulos do menu passam a ser **"Medição de Obra"** e **"Lançar medição"**. As
rotas não mudam. Ver **Prompt C**.

---

# COMO A MEDIÇÃO FUNCIONA NO MERCADO

Levantado nas fontes da Caixa e do setor, porque define o desenho:

**Mede-se percentual executado, não valor.** Após a vistoria, o fiscal elabora
um laudo indicando o **percentual executado no período**; se o percentual
atingir a meta do cronograma, o recurso é liberado.

**A base é o cronograma físico-financeiro**, aprovado pela engenharia, que
define o que será executado em cada mês e quanto custa.

**A declaração é por serviço.** As liberações intermediárias ocorrem com base no
percentual de evolução declarado na **PLS — Planilha de Levantamento de
Serviços**. O ciclo é mensal, contado da data de aniversário.

**Há retenção final.** A Caixa libera medições até **95%** do contrato; daí em
diante as medições continuam, atualizando o RAE, **sem liberação de recurso**.

---

# O DEFEITO ESTRUTURAL

**O sistema tem duas medições, e a que está em uso não é a do mercado.**

| | `medicao` — **em uso** | `medicao_servico` — **abandonada** |
|---|---|---|
| Granularidade | grupo CEF | **serviço** |
| O que se informa | **valor em R$** | **% executado acumulado** |
| Escopo | versão | projeto |
| Quem grava | as três actions desta tela | **ninguém** — zero INSERT no repositório |
| Quem lê | `/medicaolanc` e `/medicao` | `getIndicadoresObra` → **Dashboard** |

`medicao_servico`, ligada a `servico` com custo proposto e incidência derivada,
**é exatamente a estrutura da PLS**. E o módulo `calc/medicao-bdi.ts` — que
calcula incidência, evolução física e provisionamento — nunca rodou.

**Consequência hoje:** os KPIs "Evolução física acumulada" e "Evolução do mês"
do Dashboard exibem traço, com o selo **"sem medição lançada"** — mesmo quando
há dezenas de medições lançadas aqui. São tabelas distintas, e o usuário não tem
como saber.

---

# ORDEM DE EXECUÇÃO

**A Parte 1 vai sozinha.** São correções do que existe, sem depender de decisão.

**A Parte 2 depende de BV-1.** É a migração para o modelo por serviço, e é
trabalho de outro tamanho.

---

# BLOQUEIOS

## BV-1 · Migrar para medição por serviço?

A prática do mercado é declarar **percentual executado por serviço**; o valor é
derivado. O sistema tem a estrutura pronta e não usada.

**Duas perguntas de negócio decidem:**

**1 · Vocês têm a PLS de cada obra**, com os serviços e os custos aprovados pela
Caixa? Se tiverem, o cadastro de serviços sai dela e a migração é viável.

**2 · O engenheiro mede por percentual ou por valor hoje?** Se ele já pensa em
percentual — que é o que declara ao banco —, a tela atual está pedindo a
conversão errada dele, e a migração corrige um atrito diário.

**Escolher uma:**

1. **Migrar** — Parte 2 inteira. Cadastro de serviços, lançamento por
   percentual, valor derivado, e os KPIs do Dashboard passando a funcionar.
2. **Manter o modelo atual** e descontinuar `medicao_servico`, `servico` e
   `calc/medicao-bdi.ts`, **removendo os dois KPIs do Dashboard** — hoje eles
   prometem um número que nunca vai existir.

**Não deixar como está.** Duas medições paralelas, uma alimentando a tela e
outra alimentando o Dashboard sem nunca receber dado, é o pior dos dois
desenhos.

## BV-2 · Alguém já lançou medição e não a viu depois?

Ver **1.1**. É o sintoma de medição gravada em versão de planejamento.

Consulta somente leitura: medições cuja versão tem `kind` diferente de `atual`,
por projeto, com competência e valor.

**Nenhum registro é movido** — a correção de dado histórico é decisão humana,
item a item.

## BV-3 · A medição não sabe quem a lançou

**Decisivo para a seção 0.5.** A regra pedida — o engenheiro vê apenas as
medições que ele mesmo executou — exige saber o autor de cada registro.

**A tabela `medicao` não tem coluna de autoria.** Suas colunas são `id`,
`version_id`, `tenant_id`, `competencia`, `grupo_code`, `grupo_name`, `valor`,
`obs` e `created_at` (`schema.ts:1130–1146`). Nenhuma aponta para usuário.

Sem ela, "as medições que ele mesmo executou" é um conjunto que o banco não sabe
formar.

**Entregar antes de qualquer código, somente leitura:**

```sql
-- Quantas medições existem, e o que o log de auditoria sabe sobre elas.
SELECT count(*) AS medicoes FROM medicao;

SELECT a.entity, a.action, count(*) AS eventos,
       count(DISTINCT a.entity_id) AS registros,
       count(DISTINCT a.user_id)   AS usuarios,
       min(a.created_at) AS primeiro
  FROM audit_log a
 WHERE a.entity ILIKE '%medic%'
 GROUP BY 1,2;
```

**O que decidir com o resultado:**

1. **Coluna aditiva `created_by`**, anulável, `ON DELETE set null`, preenchida
   dali em diante. **Nenhum backfill automático.**
2. **O que fazer com as medições já gravadas**, que ficarão sem autor. Elas
   **não podem sumir** da tela de ninguém — ver 0.5.3.
3. Se o `audit_log` tiver o autor de criação, ele **pode** servir de base para um
   preenchimento **manual e conferido**, item a item. Nunca script em massa:
   seria atribuir autoria a partir de inferência.

## BV-4 · Alguém já imprimiu o Relatório CEF e mandou para a Caixa?

**Decisivo para a seção 3 e para a aba do relatório.**

Hoje o botão "Imprimir Relatório" chama `window.print()` e nada mais — **não
existe `@media print` em nenhum arquivo do projeto**. O que sai é a página com
barra lateral, cabeçalho do app e o próprio botão.

E faltam todos os campos que identificam o documento: CNPJ, número do contrato,
matrícula CNO-CEI, responsável técnico, ART, município, período medido e
assinaturas. **As colunas existem no schema e a tela não as lê.**

**Perguntar ao cliente:** o FRE / Cronograma CEF é impresso daqui, ou montado em
planilha?

- **Impresso daqui** → a aba do relatório ganha layout de impressão de verdade,
  com o cabeçalho do contrato. É trabalho real, e entrega o que a tela promete.
- **Montado fora** → a aba do relatório sai, e a comparação orçado × medido vira
  bloco do relatório customizado (Prompt AA, Parte 7). A tela fica só com
  lançamento e histórico.

**Não implementar layout de impressão sem essa resposta.**

---

# PARTE 1 — CORREÇÕES

# 0. AS DUAS TELAS VIRAM UMA

## 0.1 · A decisão

`/medicaolanc` e `/medicao` passam a ser **uma tela só, com abas**. Hoje são dois
itens de menu com rótulos quase idênticos, para o mesmo assunto, fazendo coisas
opostas — uma grava, a outra lê.

**Por que funciona:** as duas leem `medicao`, falam do mesmo projeto, do mesmo
período e dos mesmos dez grupos CEF. Hoje o engenheiro lança e não vê o efeito; o
controller vê o relatório e não sabe o que falta lançar. Na mesma tela, lançar e
conferir viram um gesto só.

**Isto substitui a decisão de renomear os dois itens do menu**, registrada na
revisão 1 e no **Prompt C** — renomear era remendo para o mesmo problema.

## 0.2 · As três abas

| Aba | O que é | Rota |
|---|---|---|
| **Nova medição** | o formulário de lançamento | `/medicaolanc` |
| **Medições lançadas** | o histórico, com filtro e edição | `/medicaolanc` |
| **Relatório CEF** | orçado × medido por grupo | `/medicao` |

**As duas rotas permanecem.** Rota é identificador estável — há permissão, link e
`revalidatePath` apontando para elas. O que muda é o menu, que passa a ter **um
item: "Medição de Obra"**, dentro do módulo Obra.

A aba selecionada vem de `?aba=`, e a rota de origem define a aba inicial: quem
chega por `/medicao` abre no Relatório; quem chega por `/medicaolanc`, em Nova
medição.

## 0.3 · A permissão passa a ser por aba

**O recorte atual não pode cair na fusão.** O engenheiro tem `medicaolanc`
completo e todo o resto negado — é o que a matriz já garante, e é o motivo de a
tela existir separada.

**A regra:** cada aba verifica a própria permissão **no servidor**, na mesma
action ou no mesmo carregamento de dados. Aba sem permissão **não é renderizada**
— não é escondida com CSS, não é desabilitada no cliente.

| Perfil | Nova medição | Medições lançadas | Relatório CEF |
|---|---|---|---|
| Engenheiro | sim | sim, **só as próprias** — ver 0.5 | **não** |
| Controller / admin | conforme a matriz | todas | sim |
| Contador | não | não | conforme `CONTADOR_VE` |

Quem tem direito a uma aba só abre a tela já nela, sem barra de abas.

## 0.4 · A aba "Medições lançadas"

**0.4.1** Uma linha por medição: competência, grupo, valor, observação, quem
lançou e quando. Ordenada por competência decrescente.

**0.4.2 · Filtros:** competência, grupo e — para quem vê todas — autor.

**0.4.3 · Editar e excluir** a partir daqui, pelas mesmas actions, com as mesmas
verificações da seção 4. A exclusão passa a ter confirmação e auditoria com
competência, grupo e valor.

**0.4.4 · Duplicidade como alerta.** Duas medições do mesmo grupo e competência
aparecem marcadas na lista, com o motivo escrito — pode ser medição
complementar. É o padrão de `documento-fiscal.ts`. Ver 4.6.

**0.4.5 · Estado vazio declara o motivo.** Nenhuma medição lançada é diferente de
nenhuma medição *sua* — o texto diz qual dos dois.

## 0.5 · O engenheiro vê apenas as próprias medições

**Ver BV-3.** Sem coluna de autoria, esta regra não é implementável.

**0.5.1 · A coluna.** `medicao.created_by`, aditiva, anulável, referenciando o
usuário, com `ON DELETE set null`. Preenchida por `addMedicao` dali em diante.
Migração com `IF NOT EXISTS` e `down`.

**0.5.2 · O filtro é no servidor, na consulta.** `getMedicoes` passa a receber o
recorte de autoria, e a consulta o aplica. **Nunca filtrar a lista no cliente** —
os registros chegariam ao navegador.

**0.5.3 · As medições antigas não têm autor, e não podem sumir.**

Aplicar o filtro sobre o acervo existente faria **toda medição anterior à
migração desaparecer da tela do engenheiro** — inclusive as que ele lançou. Ele
abriria a tela e veria um histórico vazio.

**A regra:** medição sem autor é visível para todos os perfis, marcada como
**"autor não registrado"**. O filtro por autoria vale apenas para registros que
têm autoria.

**0.5.4 · O Relatório CEF não é afetado.** Ele soma o realizado do projeto
inteiro, de todos os autores. O recorte de autoria é de **visibilidade de
lista**, não de cálculo — se ele alcançasse o total, dois usuários veriam
relatórios diferentes da mesma obra.

**0.5.5 · Editar e excluir seguem a mesma regra.** Quem só vê as próprias só
edita e exclui as próprias, verificado **na action**, contra o banco — não contra
o que a lista mostrou.

**0.5.6 · O engenheiro continua não vendo valor orçado.** A aba do Relatório é
negada a ele, e a lista de medições **não exibe coluna de orçado** — senão o
recorte de permissão vazaria pela tela que sobrou.

## 0.6 · O que a fusão não muda

- Nenhuma rota é removida.
- Nenhuma action muda de assinatura por causa da fusão.
- Nenhum registro de `medicao` é alterado, movido ou reatribuído.
- O cálculo do Relatório CEF continua idêntico — as correções dele são da
  seção 3, não desta.

# 1. A MEDIÇÃO PODE IR PARA A VERSÃO ERRADA

**1.1 · O problema.** `addMedicao` começa com `versionId = ctx.version.id`, e só
resolve a versão Atual **quando o projeto informado é diferente do ativo**:

```
let versionId = ctx.version.id;
if (projectId && projectId !== ctx.project.id) { ...getAtualVersion... }
```

Se o usuário estiver no projeto ativo com a versão do cookie em **Budget** ou
**Forecast**, a medição é gravada lá.

E a página resolve a Atual corretamente para exibir. Resultado: o usuário lança,
e **o registro some da tela** — está gravado noutra versão.

**1.2 · A correção.** A versão é **sempre** a Atual do projeto informado, sem
exceção e sem fallback para o contexto. Projeto sem versão Atual bloqueia e
informa.

É a regra da seção 5 do **Prompt I**, aqui com caso concreto.

**1.3** `updateMedicao` e `deleteMedicao` também não verificam a versão do
registro — só id e tenant. Acrescentar.

---

# 2. A PROMESSA SOBRE A DRE SAI

**2.1** Três lugares afirmam que a medição alimenta o Custo Variável da DRE: o
subtítulo da tela, a docstring de `actions/medicao.ts` e a do schema.

**A DRE não lê a tabela.** Verificado: nenhuma ocorrência em `dre/page.tsx`,
`getMedicoes` não é importada por módulo de cálculo algum, e não há SQL cru no
projeto.

**2.2 · Remover o texto dos três lugares.** A medição é informação auxiliar —
decisão registrada.

**2.3 · Remover `revalidatePath("/dre")`** das três actions. Elas invalidam o
cache de uma tela que não usa a tabela.

**2.4 · O subtítulo passa a dizer o que ela faz:** alimenta o Relatório CEF.

**[NOTA]** A boa notícia do achado: **não há duplicidade de custo na DRE**. A
despesa é reconhecida uma vez, pelo lançamento. A medição nunca entrou.

---

# 3. O "% FÍSICO" NÃO É FÍSICO

**3.1 · O problema.** Em `/medicao`, a coluna é calculada como:

```
const pctFisico = orcado > 0 ? Math.min((realizado / orcado) * 100, 100) : 0;
```

É **razão financeira** — valor medido sobre valor orçado —, não percentual
físico declarado. É o inverso da prática: no laudo, declara-se o percentual e o
valor é derivado dele.

**3.2 · Enquanto o modelo atual permanecer**, renomear para **"% do orçado
medido"**. O cálculo não muda; o rótulo passa a dizer o que o número é.

Num relatório que vai para o banco, chamar razão financeira de percentual físico
é impreciso onde a precisão importa.

**3.3 · Grupo sem lançamento no Budget exibe 0%**, mesmo havendo medição
lançada, por causa do `orcado > 0 ?`. Exibir **estado vazio**, não zero — zero
afirma que nada foi executado.

**3.4 · O Total pode passar de 100%.** As linhas têm `Math.min`, o total não:

```
const totPct = totOrc > 0 ? (totReal / totOrc) * 100 : 0;
```

Todas as linhas em 100% e o total em 118% é resultado possível. Aplicar o mesmo
critério, ou exibir o excedente explicitamente.

**3.5 · `PCT_REF_CEF` é indexado pela posição** do grupo em `PLANO_CONTAS.obra`.
Reordenar o plano desalinha silenciosamente os percentuais de referência do
relatório. Passar a indexar pelo código do grupo.

**[REVISÃO 2 — o problema é anterior ao da indexação]**

`PCT_REF_CEF` é um array de dez números fixos (`constants.ts:309–315`), **sem
nenhuma ligação com a obra exibida**. Três fatos da coleta:

- **Não existe caminho para cadastrar a PLS de cada projeto.** Não há coluna em
  `project`, não há tabela, e `PLS` não aparece em nenhum lugar do repositório.
  Todos os projetos usam os mesmos dez percentuais, e mudá-los exige editar o
  arquivo e fazer deploy.
- **Os números vieram do empreendimento-piloto.** A constante imediatamente
  acima é `CUSTO_EDIFICACOES_REF`, rotulada *"(EMPREENDIMENTO PILOTO)"*.
- **Eles somam 99,66, não 100.** A linha Total exibe `100%` porque o valor está
  escrito à mão no JSX — não é a soma da coluna.

Num documento que vai para a Caixa, a coluna apresenta a composição de uma obra
sob o nome de outra, e o total afirma um fechamento que os números não fazem.

**Decidir — a indexação por código não resolve isto:**

1. **A PLS entra no cadastro do projeto**, e a coluna passa a ser da obra. É a
   mesma estrutura que o **BV-1** discute para a medição por serviço: se a Cliente Piloto
   tem a PLS aprovada de cada obra, **uma tabela resolve as duas coisas** — os
   percentuais daqui e os dezesseis cartões do Dashboard.
2. **A coluna sai do relatório**, enquanto não houver a PLS por obra.

**Exibir percentuais de outra obra não é uma das opções.**

**3.7 · Sem versão Budget, o orçado zera em silêncio.**
`budgetV ? getBudgetLines(budgetV.id) : Promise.resolve([])` (`page.tsx:36`).
Projeto sem Budget exibe dez linhas com traço e Total `R$ 0`, e o rodapé explica
de onde o orçado *viria* sem dizer que não veio.

**Obra não iniciada e Budget não lançado ficam indistinguíveis.** A tela passa a
declarar a ausência da versão.

**3.8 · Com dois orçamentos, entra o primeiro que o `find` encontrar.**
`ctx.versions.find(v => v.kind === "budget")`, sem desempate por `isDefault`,
`createdAt`, `status` ou seletor. O relatório impresso pode sair com o orçamento
antigo, e quem assina não tem como saber.

**Corrigir:** a versão de orçamento é escolhida explicitamente — seletor, ou a
mais recente declarada no cabeçalho.

**3.9 · O filtro de período recorta um relatório que é acumulado por natureza.**
`hasRange` liga com **um** campo preenchido, e o mesmo `inRange` corta orçado
(`budget_line.mes`) e realizado (`medicao.competencia`). Preencher só a data
inicial produz um "acumulado" que começa no meio da obra.

E o recorte é por **mês** — `monthInRange` descarta o dia —, com o campo pedindo
dia.

**Corrigir:** o padrão é acumulado desde o início da obra, declarado na tela. O
recorte por período, se existir, é opção explícita e rotulada.

**3.10 · Três tratamentos de ausência na mesma linha.** Orçado e Realizado usam
`> 0 ? brl0 : "—"`; o % Físico usa `toFixed(1)` incondicional, exibindo `0,0%`; o
Total usa `brl0(0)`, exibindo `R$ 0`. Unificar — ver 3.3.

**3.11 · O "Imprimir Relatório" não gera relatório. Ver BV-4.**
`PrintButton` chama `window.print()` e nada mais, e **não existe `@media print`
em nenhum arquivo do projeto**. Sai a página com barra lateral, cabeçalho do app
e o próprio botão.

Faltam CNPJ, número do contrato, matrícula CNO-CEI, responsável técnico, ART,
município, período medido e assinaturas — **as colunas existem no schema**
(`project.codigo_obra`, `art`, `municipio_obra`; `tenant.cnpj`) e a tela não as
lê.

**Enquanto o BV-4 não for respondido, o rodapé deixa de prometer** "a versão
formatada (FRE / Cronograma CEF)" — o texto passa a dizer o que o botão faz.

**3.6 · Retenção final.** O relatório deve sinalizar quando a obra ultrapassa
**95%**: daí em diante as medições continuam, mas não há liberação de recurso.
É informação que o construtor precisa ver antes de contar com o dinheiro.

---

# 4. INTEGRIDADE

**4.1 · Permissão de ver.** Nenhuma das duas telas chama `can(..., "ver")`. Só o
enforcement central as governa. Acrescentar com `AccessDenied`, no padrão do
sistema.

**[REVISÃO 2]** Com a fusão, a verificação passa a ser **por aba**, no servidor —
seção 0.3. O enforcement central continua governando a rota; a aba tem a sua.

**4.2 · Filtro de tenant.** `getMedicoes(versionId)` filtra só por versão.
Acrescentar.

**4.3 · Exclusão.** `deleteMedicao` é física, sem confirmação e sem verificar
dependência. **Quinta confirmada no sistema.**

Acrescentar confirmação, e auditoria com competência, grupo e valor — hoje
registra só o id.

**4.4 · Retorno legível.** `updateMedicao` e `deleteMedicao` fazem `return`
silencioso sem permissão; `addMedicao` lança erro. Converter as três para
`{ ok, error }` e exibir. **Pré-condição do assistente.**

**4.5 · Validação.** `valor` aceita zero, negativo e vazio — `(formData.get) ||
"0"`. Competência é validada apenas por presença, não por formato.

**4.6 · Duplicidade.** Nada impede lançar duas medições para o mesmo grupo e
competência. **Avisar, não bloquear** — pode haver medição complementar. É o
padrão do módulo `documento-fiscal.ts`, que trata nota repetida como alerta com
o motivo escrito.

---

# 5. DOCUMENTOS DA MEDIÇÃO

**5.1 · Por que.** A medição do mercado tem papel: laudo do fiscal, relatório
fotográfico, PLS assinada, ART ou RRT. Hoje não há onde anexar.

**5.2 · Coluna nova.** `document` tem `despesa_id`, `cliente_id`,
`stakeholder_id`, `project_id` e `unit_code`. **Não tem `medicao_id`.**
Acrescentar — aditiva, anulável, `ON DELETE set null`.

**[NOTA]** Mesma coluna que o **Prompt P** pede para permuta e o **Prompt K**
para conta a receber. Se forem implementados juntos, é uma migração só.

**5.3 · Tipos:** Laudo de medição · Relatório fotográfico · PLS · ART/RRT ·
Outros.

**5.4 · Versão por tipo.** Anexar do mesmo tipo cria versão nova e preserva a
anterior. **Não repetir o defeito da tela de Clientes**, onde a versão é contada
por cliente e uma proposta anexada depois de um contrato v1 vira "proposta v2".

**5.5 · Remover desfaz o vínculo, não apaga o arquivo.** A auditoria registra
nome e chave.

**5.6** Segue a seção de anexos do `PADRAO-VISUAL.md`, inclusive o limite de
tamanho unificado.

---

# 6. ASSISTENTE DE IA

Segue o **Prompt E**. **Somente leitura.**

**6.1 · Por que somente leitura aqui.** A medição é declaração técnica de um
profissional, com responsabilidade registrada em ART ou RRT. Não é campo que uma
sugestão deva preencher.

**6.2 · Ações**

- **Competências sem medição** — meses da janela do projeto em que nada foi
  declarado. É o lançamento que falta.
- **Avanço fora do previsto** — grupos medidos muito acima ou muito abaixo do
  cronograma do Orçamento, por competência.
- **Comparar com as liberações** — competências com medição e sem liberação de
  obra registrada, e o contrário. É a leitura que sustenta a cobrança ao banco,
  e o par da ação equivalente no **Prompt O**.
- **Ler o laudo anexado** — extrai do documento o grupo e o percentual e
  **aponta divergência** com o que foi lançado. Não preenche.
- **Proximidade da retenção** — quando a obra se aproxima de 95%, avisar que as
  liberações cessam a partir dali.

**6.3 · Nunca:** lançar medição, alterar percentual ou valor, excluir, e afirmar
percentual de execução que o engenheiro não declarou.

---

# PARTE 2 — MEDIÇÃO POR SERVIÇO

**Só executar se BV-1 resultar na opção 1.**

# 7. O MODELO

**7.1 · Cadastro de serviços por projeto**, com nome, ordem, custo proposto e os
limites de incidência. A tabela `servico` já existe e nunca recebeu registro.

**7.2 · Importar a PLS.** Se a planilha aprovada pela Caixa existir, o cadastro
sai dela. Com prévia obrigatória e as regras de importação que os outros prompts
já estabelecem: atualiza em vez de duplicar, respeita versão bloqueada, e célula
com vírgula decimal é reportada — nunca convertida em zero.

**7.3 · O lançamento passa a ser percentual executado acumulado**, por serviço e
competência. É o que o engenheiro declara na PLS.

**7.4 · O valor é derivado**, nunca digitado: incidência do serviço vezes
percentual executado, sobre o custo total. `calc/medicao-bdi.ts` já faz a conta
inteira — **usar, não reescrever.**

**7.5 · O acumulado nunca regride por falta de lançamento.** O percentual de um
serviço é carregado para os meses seguintes enquanto não houver nova medição.
`calcEvolucao` já implementa isso.

**7.6 · Os KPIs do Dashboard passam a funcionar.** "Evolução física acumulada" e
"Evolução do mês" deixam de exibir traço, e o selo "sem medição lançada" deixa
de aparecer quando há medição.

**7.7 · O que fazer com o que já foi lançado.** As medições em `medicao` **não
são convertidas, migradas nem apagadas**. A tabela permanece, o relatório CEF
continua lendo-a, e a transição é decisão humana, obra a obra.

**Nunca script de conversão.** Converter valor em percentual exigiria supor o
custo total de cada grupo, e a suposição viraria dado.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Liberação de obra e comparação com a medição | Prompt O |
| Contexto de projeto e versão explícito | Prompt A |
| Versão Atual obrigatória em gravação operacional | Prompt I, seção 5 |
| Varredura de permissão em todas as rotas | Prompt M, seção 2.3 |
| Reconhecimento de receita por evolução de obra | **não é desta tela** — a receita é rateada pela duração, Prompt I seção 54 |

---

# 9. PRESERVAÇÃO DE DADOS

Nenhuma medição existente é alterada, convertida ou removida. Nenhum valor vira
percentual. Nenhuma medição é movida de versão.

Migrações — `medicao_id` em `document`, e as da Parte 2 — são aditivas, com
`IF NOT EXISTS` e `down`.

---

# 10. NÃO REGRESSÃO

O Relatório CEF continua devolvendo os mesmos números, com os rótulos
corrigidos. O Dashboard não muda enquanto BV-1 não for decidido.

Nenhuma outra tela é afetada — a medição não é lida por nenhuma além destas
duas.

---

# 11. TESTES

1. Medição lançada com a versão do cookie em Budget vai para a **Atual**.
2. Projeto sem versão Atual bloqueia com mensagem.
3. Editar e excluir verificam a versão do registro.
4. Nenhum texto afirma que a medição alimenta a DRE.
5. As actions não revalidam `/dre`.
6. A coluna do relatório se chama "% do orçado medido".
7. Grupo com medição e sem orçado exibe estado vazio, não 0%.
8. O total não excede 100% sem sinalização.
9. Reordenar o plano de contas não desalinha o `% Ref. CEF`.
10. Obra acima de 95% exibe o aviso da retenção final.
11. Sem permissão de ver, nenhuma das duas telas é acessível por URL direta.
12. Valor zero, negativo ou vazio é recusado.
13. Segunda medição do mesmo grupo e competência **avisa**, sem bloquear.
14. Excluir exige confirmação e registra competência, grupo e valor.
15. Anexar laudo do mesmo tipo gera versão nova; tipo diferente não herda.
16. Assistente não lança nem altera medição por nenhum caminho.
17. **Antes e depois:** contagem e conteúdo de `medicao`. Nenhuma diferença.

**A fusão e a autoria**

17a. O menu tem **um** item de medição, e as duas rotas continuam respondendo.
17b. Chegar por `/medicao` abre na aba Relatório; por `/medicaolanc`, em Nova
    medição.
17c. Engenheiro abre a tela e **não vê a aba Relatório CEF** — nem por `?aba=`,
    nem por URL direta de `/medicao`.
17d. Engenheiro vê na lista **apenas as medições que lançou**, mais as sem autor.
17e. O filtro de autoria é aplicado **na consulta** — conferir que os registros
    de outro autor não chegam ao navegador.
17f. Engenheiro não consegue editar nem excluir medição de outro autor, testado
    **chamando a action direto**, fora da tela.
17g. Medição anterior à migração **não some** da tela de ninguém, e aparece
    marcada como "autor não registrado".
17h. O Relatório CEF soma o realizado de **todos** os autores — dois usuários
    diferentes veem o mesmo total.
17i. A lista de medições não exibe valor orçado para quem não tem a aba do
    relatório.
17j. Estado vazio distingue "nenhuma medição lançada" de "nenhuma medição sua".
17k. Sem versão Budget, o Relatório declara a ausência em vez de exibir zeros.
17l. Projeto com dois orçamentos declara qual foi usado.
17m. A coluna `% Ref. CEF` reflete a decisão de 3.5 — ou é da obra, ou não
    aparece.
17n. **Antes e depois:** nenhuma medição mudou de autor, e nenhuma recebeu autor
    por script.
18. **Parte 2:** o valor derivado confere com incidência × percentual.
19. **Parte 2:** o acumulado não regride em mês sem lançamento.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisão de BV-1, e se a Parte 2 foi executada.
2. Resultado de BV-2 — medições gravadas fora da versão Atual, por projeto.
   **Sem mover nenhuma.**
2a. Resultado de BV-3 — quantas medições existem, e o que o `audit_log` sabe
   sobre a autoria delas. Decisão sobre `created_by` e sobre o acervo sem autor.
2b. Resposta de BV-4 — o FRE é impresso daqui ou montado em planilha, e o que
   aconteceu com a aba do Relatório em consequência.
2c. Como a fusão foi feita: as abas, a aba inicial de cada rota, e o item único
   do menu.
2d. Como a permissão por aba é verificada no servidor, aba a aba, com o trecho
   de código.
2e. Como o filtro de autoria entrou na consulta, e a confirmação de que nenhum
   registro de outro autor chega ao cliente.
2f. Confirmação de que nenhuma medição existente recebeu autor por script.
3. Onde o texto sobre a DRE foi removido.
4. Como a resolução da versão passou a funcionar nas três actions.
5. Confirmação de que o Relatório CEF devolve os mesmos números.
6. Como a coluna `medicao_id` foi acrescentada, e a versão por tipo calculada.
7. Funcionamento do assistente e confirmação de que não grava.
8. **Se BV-1 for a opção 2:** confirmação de que `medicao_servico`, `servico` e
   `calc/medicao-bdi.ts` foram descontinuados **sem apagar tabela**, e que os
   dois KPIs saíram do Dashboard.
9. Comparação antes/depois de `medicao`.
10. Migrações criadas, com `down`.
11. Limitações encontradas.


<a id="prompt-ah"></a>


========================================================================


### ▸ 30 de 42 · PROMPT AH — Empresa

**Bloco 5 · Configuração** · Bloqueios: BAH-1 · BAH-2

**Pré-requisito do Emissor (AG).**

========================================================================


# PROMPT AH — EMPRESA

Growth Construction · `/empresa`.

Baseado na coleta `docs/TELA-EMPRESA.md`. **É a tela mais bem construída do
sistema**, e a maior parte deste prompt é sobre o que não se toca. As correções
são poucas e específicas.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Nenhum campo fiscal
gravado é normalizado, corrigido ou apagado por esta tarefa — **nem para
adequá-lo às validações novas da seção 2.** CEP com 6 dígitos e código IBGE
inválido que já estejam no banco permanecem como estão, e viram pendência na
tela. Se alguma correção exigir tocar num valor gravado: **PARE**, não execute, e
reporte.

**2 · Nada vindo de mockup entra no código.** CNPJ, alíquota, código IBGE, item
da LC 116 e CNAE dos mockups são ilustração.

**3 · O assistente não grava nada, em nenhum caminho.**

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

Seção decisiva. Seis coisas aqui são **referência para o resto do sistema**, e
mexer nelas é regressão.

**1 · O checklist de prontidão fiscal.** Treze regras num lugar só
(`emitente-fiscal.ts:238–370`), com o critério declarado no docstring: bloqueio é
*"a API vai recusar ou a prefeitura vai rejeitar"*; aviso é *"dá para emitir, mas
alguém precisa confirmar"*. A tela não acrescenta checagem própria, e cada
pendência **explica por que o campo importa** em vez de dizer "campo
obrigatório".

**É o melhor texto de interface do sistema. Não reescrever.**

**2 · O token fora do banco.** *"Credencial de emissão vale dinheiro e vai em
variável de ambiente/secret, não em coluna de banco"* — registrado em
`focus.ts:18–19`, `schema.ts:106–108` e na migração 0039. **Não criar coluna de
token.**

**3 · O default `homologacao`.** *"Nota de teste não tem validade fiscal, e o
padrão inverso emitiria nota real por acidente"*. **Não inverter.**

**4 · A gravação parcial deliberada.** `salvarDadosFiscais` salva o que houver e
recusa apenas o que é objetivamente inválido, com o motivo no docstring. Exigir
tudo de uma vez impediria o preenchimento em etapas.

**5 · A auditoria fiscal com `diffAudit`**, lendo o estado anterior antes do
update e gravando `de`/`para` campo a campo.

**6 · A rota `/api/health/r2` faz round-trip real** — PUT, GET, fetch, DELETE —
com as variáveis mascaradas na resposta e exigência de `owner` ou `admin`. **É o
oposto do "Automático" das Contas Correntes, e serve de referência ao Prompt X.**

E o isolamento está correto: as quatro operações filtram por
`eq(tenants.id, ctx.tenant.id)`, e `ctx.tenant.id` nunca vem do cliente.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — os placeholders | nada | **imediata, e é a de maior efeito** |
| **2** — validar no servidor | **BAH-1** | muda o que a tela aceita |
| **3** — `renameTenant` | nada | |
| **4** — os sete campos sem checagem | nada | |
| **5** — o selo do R2 | nada | |
| **6** — assistente de IA | Partes 1 a 4 | |

**Esta tela é pré-requisito do Prompt AG** — sem cadastro fiscal completo e
válido, o Emissor não emite. As Partes 1 e 2 entram antes dele.

---

# BLOQUEIOS

## BAH-1 · Quantos cadastros ficam inválidos quando a validação entrar

A Parte 2 passa a validar CEP, código IBGE e UF no servidor. **Dado já gravado
não é tocado** — mas precisa ser conhecido antes, senão alguém abre a tela, tenta
salvar uma vírgula e descobre que o cadastro inteiro está travado.

**Entregar antes de qualquer código, somente leitura:**

```sql
SELECT id, name,
       cnpj,
       cep,        length(regexp_replace(coalesce(cep,''), '\D', '', 'g'))          AS cep_digitos,
       codigo_municipio,
       length(regexp_replace(coalesce(codigo_municipio,''), '\D', '', 'g'))         AS ibge_digitos,
       uf,
       aliquota_iss, item_lista_servico, inscricao_municipal, regime_tributario,
       fiscal_ambiente
  FROM tenant
 ORDER BY name;
```

**Decidir com o resultado:** a validação nova vale só para o que for gravado
daqui em diante — e o valor antigo inválido aparece como pendência, editável, sem
travar o resto do formulário.

## BAH-2 · A emissão entra — e isso muda o peso desta tela

O **Prompt AG** foi autorizado. Com ele, os 22 campos deixam de ser cadastro
adiantado e passam a bloquear uma operação real.

**Confirmar o encadeamento:** esta tela é pré-condição do Emissor, e a seção 4.1
daquele prompt já a usa — sem `emitentePronto`, o botão de emitir não aparece.

**Consequência para o texto da tela:** hoje ele diz *"defina `FOCUS_NFE_TOKEN`
para habilitar o envio"*, sugerindo que só falta o token. Com o Emissor no
roteiro, o texto passa a apontar para a tela de Notas Fiscais — ver 6.4.

---

# PARTE 1 — OS PLACEHOLDERS QUE PARECEM PREENCHIDOS

**1.1 · O defeito.** `7.02`, `4120400`, `3552502` e `3` são `placeholder`, nunca
`defaultValue`. A tela exibe o valor em cinza dentro do campo **e lista o mesmo
campo como "falta" três linhas acima**. Salvar sem tocar grava `NULL`.

O usuário vê um número no campo, vê a pendência, e não tem como saber que o
número não é o valor.

**1.2 · A origem do `3552502`.** Pelo comentário em `nfse-payload.test.ts:14`, é
**cidade-sede/SP**, usado ali como "sede" de fixture. Um município de teste virou
sugestão padrão para qualquer empresa do sistema. `4120400` é o CNAE de
construção de edifícios e `7.02` é o item da LC 116 citado no texto da própria
pendência.

**1.3 · A correção — escolher uma, por campo:**

1. **Placeholder que não parece valor** — *"7 dígitos, sem ponto"* no código
   IBGE, *"0 a 5"* na alíquota. Descreve o formato sem sugerir um número.
2. **Texto de ajuda abaixo do campo**, fora do input, dizendo o valor típico do
   setor — *"construção civil costuma ser 7.02"*. A informação é útil e não se
   confunde com preenchimento.

**Recomendação: a 1 para código IBGE e alíquota, a 2 para item da LC 116 e
CNAE.** O motivo da diferença: os dois primeiros são específicos da empresa e
sugerir um número é sugerir o errado; os dois últimos têm valor típico no setor,
e a ajuda economiza uma consulta ao contador.

**1.4 · Nenhum valor vira `defaultValue`.** Preencher campo fiscal por default é
gravar dado que ninguém conferiu.

---

# PARTE 2 — VALIDAR NO SERVIDOR O QUE O CHECKLIST CHAMA DE BLOQUEIO

**Ver BAH-1.**

**2.1 · A incoerência.** A action valida CNPJ e alíquota — lança erro e não
grava. **CEP, código IBGE e UF são apenas normalizados**: `normalizarCep` e
`normalizarCodigoMunicipio` removem o que não é dígito e gravam o resto. `"1"`
como CEP e `"99"` como IBGE são aceitos.

E os validadores **existem no mesmo módulo que a action já importa** —
`cepValido`, `codigoMunicipioValido`, `ufValida` — usados só pelo checklist, que
é informativo.

**A tela chama esses campos de bloqueio e o servidor os aceita.**

**2.2 · Com o Emissor no roteiro, isso deixa de ser tolerável.** Código IBGE
errado emite nota no município errado. CEP inválido é recusa da prefeitura.

**2.3 · A correção.** `salvarDadosFiscais` passa a chamar os três validadores.
Campo preenchido e inválido é recusado com a mesma clareza do CNPJ. **Campo vazio
continua passando** — a gravação parcial é deliberada e permanece.

**2.4 · O retorno deixa de ser exceção.** As actions hoje lançam `Error`, cuja
mensagem o Next.js substitui em produção — é o defeito transversal do 4.1.3 do
**Prompt E**. Passam a `{ ok, error }`, com a mensagem dizendo **qual campo** e
**por quê**.

**2.5 · Nenhum dado existente é normalizado.** Valor inválido já gravado
permanece, aparece como pendência, e é corrigido pelo usuário quando ele quiser —
não por migração.

---

# PARTE 3 — `renameTenant` É A ÚNICA QUE NÃO AUDITA E NÃO FALA

**3.1** Sem permissão ou com nome vazio, ela faz `return` silencioso
(`empresa.ts:145`, `:147`). A tela não mostra nada.

**3.2** E **não grava `logAudit`** — enquanto `uploadLogo` e
`salvarDadosFiscais` gravam. **A razão social é o que vai no corpo da nota**:
trocá-la não deixa rastro, e trocar o CEP deixa.

**3.3 · Corrigir as duas coisas:** `logAudit` com `de`/`para`, no padrão
`diffAudit` que a tela já usa, e retorno `{ ok, error }` em vez de `return` mudo.

---

# PARTE 4 — OS SETE CAMPOS QUE NINGUÉM CHECA

`nomeFantasia`, `inscricaoEstadual`, `regimeEspecial`,
`codigoTributarioMunicipio`, `municipio`, `complemento` e `telefone` não geram
pendência nenhuma, nem bloqueio nem aviso.

**Dois deles pesam:**

**`codigoTributarioMunicipio` entra no payload da nota**
(`nfse-payload.ts:229–232`). Vazio, vai vazio.

**`municipio` está no formulário** e nunca é checado, enquanto o código IBGE é
bloqueio. O usuário preenche o nome e acha que informou o município.

**4.1** Os dois entram no checklist. `codigoTributarioMunicipio` como **aviso** —
alguns municípios exigem, outros não, e a regra é local. `municipio` como
**aviso** vinculado ao IBGE: preenchido sem o código, ou divergente dele.

**4.2** Os outros cinco permanecem opcionais, e a tela declara isso — campo sem
pendência e sem marcação é ambíguo.

**4.3 · Não inventar validação de coerência entre município e código IBGE** sem
tabela de municípios. O sistema não tem uma, e o `3552502` do placeholder é a
prova de que confiar em memória não funciona.

---

# PARTE 5 — O SELO DO R2 DIZ O QUE MEDE

**5.1** `isR2Configured()` verifica **quatro variáveis de ambiente não vazias** —
nenhuma requisição. Chave errada, bucket inexistente ou endpoint fora do ar
continuam exibindo "R2 ativo" em verde.

**5.2 · O selo passa a dizer o que é** — *"R2 configurado"* —, e o resultado do
teste real, quando houver, aparece ao lado com a data. **Verde só depois do
round-trip.**

**5.3** A rota de health **não muda** — ela já está certa. O que muda é o selo
não se apresentar como prova do que não testou.

**5.4** A chave de healthcheck é a mesma para o mesmo tenant
(`key6`, hash determinístico do id). Dois testes simultâneos escrevem e apagam o
mesmo objeto. **Acrescentar um sufixo por tentativa** — é correção de uma linha.

---

# PARTE 6 — ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.**

Esta é tela de cadastro, e o papel do assistente é estreito: **traduzir exigência
fiscal em linguagem de quem preenche.**

**6.1 · Ações**

- **O que falta para emitir** — as pendências de bloqueio, em ordem de esforço,
  com o que cada uma destrava. É o checklist que já existe, lido como caminho e
  não como lista.
- **Onde encontrar cada dado** — inscrição municipal está no cadastro da
  prefeitura; código IBGE na tabela do IBGE; item da LC 116 na lei. **Diz onde
  buscar, nunca qual é o valor.**
- **Conferir o que está preenchido** — divergências entre campos: município
  preenchido sem código IBGE, alíquota abaixo de 2% fora do Simples, CNAE
  incompatível com o item de serviço.
- **Histórico de alterações** — lido de `audit_log` com `action = "tenant.fiscal"`,
  que já grava `de`/`para`.

**6.2 · Nunca**

- **Nunca sugerir CNPJ, inscrição, alíquota, item da LC 116, CNAE ou código de
  município.** São decisões tributárias e cadastrais, e um valor sugerido que o
  usuário aceita vira nota emitida errada.
- **Nunca preencher campo.** Nem na Etapa 3 — esta tela fica **fora** da escrita
  assistida, pelo mesmo motivo do item 7.2 do **Prompt AG**.
- **Nunca afirmar que o cadastro está correto.** Ele diz que não há pendência
  aberta, que é outra coisa.

**6.3 · O que não vai ao modelo.** CNPJ, inscrições e endereço são dados
cadastrais públicos e podem ir. **Token, secrets e variáveis de ambiente nunca**
— `focus.ts:19` já registra *"nada de token em log"*, e a mesma regra vale para
o contexto do modelo.

**6.4 · O texto sobre o token muda.** Hoje: *"defina `FOCUS_NFE_TOKEN` para
habilitar o envio"*. Com o **Prompt AG** no roteiro, ele passa a dizer o que
acontece quando o cadastro fecha, e aponta para **Receitas › Notas Fiscais**.

---

# 7. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Emissão, cancelamento e consulta de nota | **Prompt AG** |
| Token por tenant | **Prompt AG**, BAG-3 |
| Nota recebida de fornecedor | `documento_fiscal`, **Prompt S** |
| Mascaramento no log de auditoria | ver 8.2 |
| `getAllTenantsOverview` sem projeção | ver 8.3 |
| Tabela de municípios do IBGE | fora — ver 4.3 |
| Escrita assistida nesta tela | **fora, permanentemente** — 6.2 |

---

# 8. PRESERVAÇÃO DE DADOS E REGISTROS

**8.1** Nenhum campo fiscal gravado é alterado, normalizado ou apagado. Nenhuma
migração sobre `tenant`.

**8.2 · Registro, não correção:** a auditoria fiscal grava CNPJ, inscrições,
endereço, CEP, telefone e e-mail **em texto claro**, com valor anterior e novo.
São dados públicos de CNPJ, então o risco é baixo — mas contrasta com a decisão
deliberada de manter o token fora do banco. **Não corrigir nesta tarefa**;
registrar como decisão pendente de mascaramento no log, que é assunto do módulo
de auditoria.

**8.3 · Registro, não correção:** `getAllTenantsOverview` faz `select()` sem
projeção e sem `where`, carregando os 22 campos fiscais de **todos** os tenants
para a tela de super-admin, que não os exibe. O docstring transfere a
responsabilidade ao chamador. **Assunto da revisão daquela tela.**

---

# 9. NÃO REGRESSÃO

**9.1** O checklist devolve exatamente as mesmas pendências de hoje para os
mesmos dados — a Parte 4 **acrescenta** dois avisos e não altera nenhum bloqueio
existente.

**9.2** `emitentePronto` continua contando só bloqueios.

**9.3** A gravação parcial continua funcionando: campo vazio passa, campo
preenchido e válido grava.

**9.4** `calc/emitente-fiscal.ts`, `fiscal/focus.ts` e `storage/r2.ts` **não são
alterados** — a Parte 2 passa a **chamar** validadores que já existem.

**9.5** O logo, o preview e a faixa do topo continuam funcionando.

---

# 10. TESTES

**Os placeholders**

1. Nenhum campo exibe um valor que não seja o gravado.
2. Salvar sem tocar nos campos não grava nada neles — e a tela não sugeriu que
   gravaria.
3. `3552502` não aparece em nenhum lugar da interface.

**A validação**

4. CEP com menos de 8 dígitos é recusado **na action**, chamada direto.
5. Código IBGE fora de 7 dígitos é recusado.
6. UF fora das 27 siglas é recusada.
7. Campo vazio continua passando — a gravação parcial funciona.
8. A recusa é `{ ok, error }` legível, dizendo qual campo e por quê.
9. **Dado inválido já gravado não é alterado** — conferir antes e depois.
10. Cadastro com valor antigo inválido permite editar os demais campos.

**O nome**

11. `renameTenant` sem permissão devolve erro visível, não silêncio.
12. Trocar a razão social grava `logAudit` com `de`/`para`.

**O checklist**

13. `codigoTributarioMunicipio` e `municipio` geram aviso quando vazios.
14. Nenhum bloqueio existente mudou de severidade.
15. `emitentePronto` devolve o mesmo resultado de antes para os mesmos dados.

**O R2**

16. O selo não afirma "ativo" sem teste real.
17. Dois testes simultâneos do mesmo tenant não colidem na mesma chave.

**O assistente**

18. Não sugere valor para nenhum campo fiscal, em nenhum caminho.
19. Não preenche campo.
20. Token e variáveis de ambiente não vão ao modelo.
21. Assistente não grava nada.

**Gerais**

22. As quatro operações continuam filtrando por `tenants.id = ctx.tenant.id`.
23. **Antes e depois:** conteúdo integral da linha de `tenant`, campo a campo.
    Nenhuma diferença causada pela implementação.

---

# 11. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado da consulta do **BAH-1** — quantos cadastros ficam com pendência
   nova, e quais campos. **Sem corrigir nenhum.**
2. Confirmação do **BAH-2** — o encadeamento com o Prompt AG.
3. O que foi feito com cada um dos quatro placeholders, e o texto novo de cada
   campo.
4. As validações acrescentadas, com o trecho de código, e a confirmação de que
   os validadores não foram reescritos.
5. Como `renameTenant` passou a auditar e a devolver erro.
6. Os avisos novos do checklist, e a confirmação de que nenhum bloqueio mudou.
7. O que o selo do R2 passou a dizer, e como o teste real é registrado.
8. O texto novo sobre o token, apontando para o Emissor.
9. Funcionamento do assistente, e confirmação de que ele não sugere nem preenche
   valor fiscal.
10. Confirmação de que nenhum dado de `tenant` foi alterado.
11. Confirmação de que nenhuma migração foi criada.
12. Limitações encontradas.


<a id="prompt-al"></a>


========================================================================


### ▸ 31 de 42 · PROMPT AL — Acesso Contabilidade sai

**Bloco 5 · Configuração** · Bloqueios: BAL-1 · BAL-2 · BAL-3

Depende de AJ, Partes 1 e 2.

========================================================================


# PROMPT AL — ACESSO CONTABILIDADE SAI; O CONTADOR PASSA A SER CONFIGURÁVEL

Growth Construction · `/contabilidade`, e o perfil `contador` em
`src/lib/permissions.ts`.

**Duas metades ligadas:** a tela sai porque administra acesso em paralelo à
Gestão de Acessos; e o que o contador enxerga deixa de ser lista fixa no código
e passa a ser decidido por owner ou admin, na tela que já existe.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/contabilidade` | Acesso Contabilidade | **extinta** | **este prompt** |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** **Nenhum usuário
perde o vínculo, muda de papel ou tem `membership.permissions` alterado por esta
tarefa.** O contador que existe hoje continua existindo, com o mesmo papel e os
mesmos overrides. Se alguma correção exigir tocar num vínculo: **PARE**, não
execute, e reporte.

**2 · Reduzir acesso é seguro; ampliar não é.** Como no **Prompt AJ**: nenhuma
linha deste prompt pode permitir o que hoje é negado. É a condição de aceite da
seção 10.

**3 · Nada vindo de mockup entra no código.**

---

# POR QUE ESTA TELA SAI

**Ela não administra acesso — ela mostra três números e tem um formulário de
convite.**

O contador já é um papel em `/usuarios`, e o que ele enxerga já vive em
`/acessos`. São dois lugares para o mesmo controle, e o **Prompt AJ** acabou de
travar `/acessos` para owner e admin. Manter um caminho paralelo de concessão de
acesso, fora daquela trava, contraria a decisão que ela implementa.

**Com a remoção, o recorte do contador fica inteiro num lugar só.**

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

**1 · O papel `contador` existe no enum e funciona.** Esta tarefa **não remove o
papel**, não altera `roleEnum` e não faz migração de vínculo.

**2 · `VIEW` já existe** em `permissions.ts` — `{ver: true}` e o resto falso.
É a constante que a Parte 2 usa.

**3 · O enforcement central cobre `/contabilidade` hoje**, porque o id está em
`SCREENS`. A remoção precisa preservar isso — ver 1.4.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — a tela sai | **BAL-1** e **BAL-3** | |
| **2** — o contador configurável | **Prompt AJ**, Partes 1 e 2 | **não vai antes** |
| **3** — o teto de leitura | **BAL-2** | |
| **4** — quem já é contador | Parte 2 | |

**A Parte 2 depende do Prompt AJ.** Enquanto o "Salvar" gravar as 38 chaves,
configurar um contador o tira do sistema de papéis para sempre — o problema que
o RC-A2 descreve. **Configurável só faz sentido depois que salvar significar
diff.**

---

# BLOQUEIOS

## BAL-1 · O que o botão "Convidar (somente leitura)" faz hoje

A tela tem o único formulário de convite do sistema, e o **Prompt AI** registrou
que **não há domínio de e-mail** — sem envio, sem link, sem "esqueci a senha".

**Coleta curta, antes de remover:**

```
Não altere nada. Gere docs/TELA-CONTABILIDADE.md contendo, na íntegra e
com o caminho de cada arquivo como cabeçalho:

1. a página /contabilidade
2. todo componente próprio que ela importe, recursivamente
3. todas as Server Actions da tela, na íntegra
4. perguntas:
   a) O botão "Convidar" chama a mesma action que /usuarios (`invite`)
      ou tem caminho próprio? Colar.
   b) Ele envia e-mail? Define senha? Cria o usuário com qual papel?
   c) Os três cards — Receita projetada, Despesas lançadas, Resultado —
      saem de quais funções? Colar as expressões.
   d) A lista "Contadores com acesso" é filtrada por papel = contador,
      ou por outra coisa?
   e) Há alguma action nesta tela que não exista em /usuarios?
   f) Qual permissão governa a tela e cada action?

Código na íntegra, sem resumir. É coleta, não análise.
```

**Se a resposta de (e) for "não há"**, a tela sai sem perda de funcionalidade. Se
houver algo que só existe aqui, **esse algo migra para `/usuarios` antes da
remoção.**

## BAL-2 · O contador pode receber permissão de escrita?

A Parte 2 torna o que ele vê configurável. **A pergunta seguinte é se o que ele
pode *fazer* também fica.**

**Escolher uma:**

1. **Teto de leitura.** O contador pode receber `ver` em qualquer tela, e
   **nunca** `criar`, `editar` ou `excluir` — clamp por papel, como o do Prompt
   AJ para `usuarios` e `acessos`. A matriz oferece só a coluna Ver na linha
   dele.
2. **Sem teto.** Owner e admin decidem tudo, inclusive escrita.

**Recomendação: a 1.** O contador é externo à empresa. Se a operação precisar de
alguém de fora lançando, isso é outro papel, com outro nome — e a decisão fica
explícita em vez de nascer de uma caixa marcada.

**A opção 1 não impede nada que hoje seja possível:** o default do contador já é
`VIEW` em oito telas e `NONE` no resto. O teto apenas impede que um override
amplie para escrita.

## BAL-3 · O que acontece com a rota

Usuário com a URL no favorito vai acessá-la.

**Escolher uma:** 404 padrão, ou **redirecionar para `/usuarios` com aviso de
uma linha**.

Recomendação: a segunda, no mesmo padrão do **Prompt AB**.

---

# PARTE 1 — A TELA SAI

**1.1 · O que é removido:** a página `(app)/contabilidade/page.tsx`, os
componentes exclusivos dela, e o item de menu.

**1.2 · O que não é removido:** o papel `contador`, os vínculos existentes, e
qualquer action que `/usuarios` também use.

**1.3 · A action de convite** sai junto **se** for exclusiva desta tela — ver
BAL-1. Se for a mesma `invite` de `/usuarios`, não se toca nela.

**1.4 · O id `contabilidade` sai de `SCREENS`.**

**Cuidado que a coleta do Prompt AJ já documentou:** tela removida de `SCREENS`
faz `screenIdOfPath` devolver `null`, e a rota — se continuar existindo — **fica
sem enforcement central**, como hoje acontece com `/acerto` e `/diagnostico`.

**Por isso a rota precisa sair de verdade ou virar redirecionamento**, conforme
o BAL-3. **Não deixar a página existindo sem id.**

**1.5 · Override gravado para `contabilidade` permanece no banco**, inerte.
**Não apagar** — é a regra global, e a Parte 2.4 do Prompt AJ preserva chave
órfã.

**1.6 · Varredura obrigatória:** toda menção a `/contabilidade` e ao id
`contabilidade` — `href`, `redirect`, `revalidatePath`, `CONTADOR_VE`, textos de
ajuda. **Rota removida sem varredura vira link quebrado.**

**1.7 · Os três números somem, e é preciso registrar por quê.** Receita
projetada, Despesas lançadas e Resultado saem das mesmas fontes da DRE.

**E há uma divergência que vale anotar antes de a tela sair:** o Resultado aqui
difere do Resultado Final da DRE [valores de produção removidos]. **A diferença**
é exatamente a ordem de grandeza da linha Empréstimos — subtraída na cascata da
DRE e provavelmente não subtraída aqui.

**Não corrigir nada disso nesta tarefa.** Registrar no relatório e encaminhar ao
**Prompt AC**, RC-D5, como confirmação independente de que duas telas calculam
resultado por caminhos diferentes.

---

# PARTE 2 — O CONTADOR PASSA A SER CONFIGURÁVEL

## 2.1 · Como é hoje

`CONTADOR_VE` é um `Set` fixo no código com oito telas — `dre`, `fluxocaixa`,
`medicao`, `resumo`, `consolidado`, `planocontas`, `despesas`, `acoes`. Mudar o
que o contador vê exige editar o arquivo e fazer deploy.

## 2.2 · Como passa a ser

**`CONTADOR_VE` continua existindo, como ponto de partida**, e **owner ou admin
ajustam por membro em `/acessos`**, como para qualquer outro papel.

**Não é criação de mecanismo — é remoção de exceção.** O contador passa a ser um
papel como os demais: default do papel, ajuste por membro.

## 2.3 · O default continua conservador

**A lista de oito não muda por esta tarefa.** Trocar uma lista fixa por outra
adivinhada é o erro que o BAJ-2 do Prompt AJ evita para o `membro`.

Se a Cliente Piloto quiser que o contador veja mais ou menos, **isso passa a ser ajuste na
tela** — que é exatamente o objetivo.

## 2.4 · Duas telas da lista merecem conversa

**`consolidado`** está para sair do sistema pelo **Prompt AB**. Quando sair, o
default do contador perde um item — sem efeito para quem tiver override.

**`acoes`** — o Log de Auditoria — é a única tela de Config que o contador
alcança, e o **Prompt AK**, BAK-2, está decidindo o que pode aparecer no `meta`.
**Enquanto aquilo não for decidido, não ampliar o acesso do contador ao log.**

## 2.5 · A linha dele na matriz

Com a Parte 2, a linha do contador em `/acessos` deixa de ser só informativa e
passa a ser editável — respeitado o teto do BAL-2.

**A tela declara qual é o default do papel**, para que quem ajusta saiba do que
está partindo.

---

# PARTE 3 — O TETO DE LEITURA

**Ver BAL-2.** Se for a opção 1:

**3.1** O clamp entra no **mesmo lugar** do clamp do Prompt AJ — último passo de
`effectivePermissions`, **depois** do merge dos overrides.

**A ordem é a correção**, pelo mesmo motivo de lá: aplicar antes faria o
override sobrescrever o teto.

**3.2** Papel `contador` → `criar`, `editar` e `excluir` são `false` em toda
tela, qualquer que seja o override.

**3.3** A matriz exibe só a coluna **Ver** na linha do contador, com o motivo
escrito. As demais aparecem como traço — no mesmo tratamento da Parte 5 do
Prompt AJ, que já remove caixa de ação que a tela não tem.

**3.4 · Isto é restritivo por construção.** Nenhum contador ganha acesso novo.

---

# PARTE 4 — QUEM JÁ É CONTADOR HOJE

**4.1 · Nada muda automaticamente.** Sem migração, sem alteração de vínculo, sem
override criado.

**4.2** Quem é contador continua vendo as oito telas do default, porque o
default não mudou.

**4.3 · Quem tiver override gravado continua com ele** — inclusive override que
hoje conceda tela fora da lista, que permanece válido, salvo o teto da Parte 3
para ações de escrita.

**4.4 · Reportar, antes e depois, o que cada contador enxerga**, tela a tela e
ação a ação. A única diferença aceitável é a **negação** de ações de escrita pelo
teto.

---

# 5. DEPOIS DA REMOÇÃO — ATUALIZAR OS DOCUMENTOS

**5.1 · `PROMPT-C-SIDEBAR.md`** — a seção 9 registra que Contabilidade vai para
Administração. Passa a registrar que a tela **deixa de existir**, e por quê.

**5.2 · `PROMPT-M-PERMISSOES-CLIENTES.md`** — a seção 4, *"`/contabilidade` usa
contexto global"*, perde o objeto. Registrar que o defeito saiu com a tela.

**5.3 · `PROMPT-AJ-GESTAO-DE-ACESSOS.md`** — o contador deixa de ser exceção e
passa a ser papel configurável. E a contagem de telas em `SCREENS` cai de 38
para 37.

**5.4 · `PROMPT-AK-LOG-DE-AUDITORIA.md`** — o BAK-2 menciona que `acoes` é a
única tela de Config que o contador vê. Continua verdade, e agora é ajustável.

**5.5 · `CONTINUAR-REVISAO.md` e `ROTEIRO-REVISAO.md`** — a tela sai da lista de
pendentes.

---

# 6. FORA DE ESCOPO

| Item | Dono |
|---|---|
| A divergência no resultado | **Prompt AC**, RC-D5 — ver 1.7 |
| Convite por e-mail | **bloqueado por falta de domínio** — Prompt AI |
| O default do `membro` | **Prompt AJ**, Parte 1 |
| O que pode aparecer no `meta` do log | **Prompt AK**, BAK-2 |
| Remover o papel `contador` | **fora** — o papel fica |
| Papel novo para terceiro que lança | **BAL-2**, se a resposta for que existe |

---

# 7. PRESERVAÇÃO DE DADOS

**7.1** Nenhum usuário, vínculo, papel ou `membership.permissions` é alterado.

**7.2** Override gravado para `contabilidade` permanece, inerte.

**7.3** Nenhuma migração. Nenhuma tabela é tocada.

---

# 8. NÃO REGRESSÃO

**8.1 · Nenhum acesso é ampliado.** Reportar, antes e depois, a matriz efetiva de
cada membro. **Qualquer célula que vá de `false` para `true` é falha.**

**8.2** Owner, admin, membro e engenheiro não são afetados.

**8.3** As oito telas do default do contador continuam acessíveis a ele.

**8.4** `can()`, `screenIdOfPath` e `effectivePermissions` não mudam de
comportamento fora do clamp da Parte 3.

---

# 9. TESTES

**A remoção**

1. `/contabilidade` se comporta conforme o BAL-3.
2. Nenhum item de menu aponta para ela.
3. Varredura: nenhuma menção restante a `/contabilidade` nem ao id.
4. A tela não aparece mais na matriz de `/acessos`.
5. Override gravado para `contabilidade` **continua no banco**.
6. Nenhuma funcionalidade exclusiva se perdeu — conforme BAL-1(e).

**O contador configurável**

7. Owner e admin editam a linha do contador em `/acessos`.
8. Conceder `ver` numa tela fora do default funciona.
9. Revogar `ver` numa tela do default funciona.
10. Trocar o papel de alguém para contador aplica o default, não uma matriz
    vazia.

**O teto**

11. Contador não recebe `criar`, `editar` nem `excluir`, mesmo com override —
    testado chamando a action direto.
12. A matriz exibe só Ver na linha dele, com o motivo.
13. O clamp roda **depois** do merge.

**Quem já existe**

14. O contador atual continua vendo exatamente as oito telas.
15. **Antes e depois:** matriz efetiva de cada membro, célula a célula.
    **Nenhuma célula ampliada.**
16. Nenhum vínculo, papel ou override foi alterado.

---

# 10. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado da coleta do **BAL-1**, e se algo exclusivo da tela precisou migrar
   para `/usuarios`.
2. Decisão de **BAL-2** — teto de leitura ou não.
3. Decisão de **BAL-3** — 404 ou redirecionamento.
4. Arquivos removidos, um a um, e componentes compartilhados encontrados.
5. Resultado da varredura de 1.6.
6. **O registro da divergência no resultado**, com as duas expressões lado a lado,
   encaminhado ao Prompt AC.
7. Como `CONTADOR_VE` passou a ser ponto de partida em vez de lista fixa.
8. Como o teto foi implementado, e a confirmação de que roda depois do merge.
9. **A comparação antes/depois da matriz efetiva de cada contador**, célula a
   célula.
10. Confirmação de que nenhum vínculo, papel ou override foi alterado.
11. Os documentos atualizados conforme a seção 5.
12. Limitações encontradas.


<a id="prompt-an"></a>


========================================================================


### ▸ 32 de 42 · PROMPT AN — Conferência

**Bloco 5 · Configuração** · Bloqueios: BAN-1 · BAN-2 · BAN-3

⟨reescrito⟩ A quarta condição; a data impossível vai para J.

========================================================================


# PROMPT AN — CONFERÊNCIA DE LANÇAMENTOS E DE PLANOS

Growth Construction · `/diagnostico/categorias-invertidas`, que fica; e
`/diagnostico/planos-recebiveis`, que **sai**.

Baseado na coleta `docs/TELA-CONFERENCIA.md`. **São as telas mais bem
construídas do sistema**, e a maior parte deste prompt é sobre o que não se
toca. As correções são poucas: uma condição que falta, uma transação, e a
remoção de uma tela cuja verificação **vira validação no cadastro**.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado** — exceto pela
reclassificação que o usuário fizer, item a item, com preview e confirmação. E
essa reclassificação toca **uma coluna**: `categoria_dre`.

**Nenhuma correção automática, nenhuma migração, nenhum script.** A tela mostra
e oferece o caminho; **quem corrige é o usuário.**

**2 · Nada vindo de mockup entra no código.**

**3 · O assistente não reclassifica nada.**

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

Seção decisiva, e a maior deste prompt. **Sete coisas aqui são referência para o
resto do sistema.**

**1 · O texto da tela.** *"Continuam íntegros, legíveis e editáveis. Eles não
estão bloqueados nem foram alterados. Corrigir é opcional e sempre manual…
Valor, competência, vencimento, status e número PED não são tocados."*

É a regra de não-retroatividade escrita para quem opera. **Não reescrever, e
citar como referência nos outros prompts.**

**2 · A validação do destino, no servidor.** `validarCategoriaDespesa` recusa
categoria credora **antes** de qualquer leitura ou escrita. A tela não pode
reintroduzir o defeito que existe para apontar.

E o motivo está escrito no módulo: *"Validar só no cliente não protege nada: a
Server Action é chamável direto."* **É o padrão que a seção 3-C do Prompt S
adota.**

**3 · O default devedor para categoria desconhecida**, com a justificativa no
código: *"classificar errado como receita é o erro que este módulo existe para
impedir."*

**4 · O preview antes de gravar**, em modal.

**5 · A auditoria por item**, com `de→para`, `numDoc` e a origem
`diagnostico/categorias-invertidas` no `meta`. **É o único lugar do sistema que
grava a origem da alteração** — vale como padrão para o Prompt AK.

**6 · Os dois `continue` do laço:** cancelada não é reclassificada — *"o
registro está encerrado"* —, e já-na-categoria-de-destino não gera update nem
log inútil.

**7 · A Conferência de planos antecipa a data impossível.** Ela testa, mês a
mês, se o dia de vencimento existe em cada mês da série — o dia 31 que vira
fevereiro. **Antecipar em vez de descobrir quando a parcela é gerada é raro no
sistema inteiro.**

**A tela sai, e essa verificação não pode sair com ela** — Parte 6.

**8 · O texto da tela de planos duvida do próprio diagnóstico:** *"Um intervalo
grande pode ser carência combinada em contrato — não é necessariamente erro…
corrigir um plano é decisão comercial, feita na tela da unidade, com o contrato
à vista."*

**É o melhor texto de tela de exceção do sistema**, e é justamente o que condena
a condição de carência: ela detecta a operação normal. **Preservar a ideia ao
mover a verificação** — Parte 6.3.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — a quarta condição | **BAN-1** | **é o que falta** |
| **2** — o lote com transação | nada | |
| **3** — o lote item a item | **BAN-2** | |
| **4** — desempenho e escala | nada | |
| **5** — id próprio em `SCREENS` | **Prompt AJ**, Parte 6 | |
| **6** — a aba de planos sai | **BAN-3** | **a data impossível vai para o cadastro** |
| **7** — assistente de IA | Partes 1 a 3 | |

---

# BLOQUEIOS

## BAN-1 · Quantos lançamentos a quarta condição traz

A Parte 1 acrescenta **competência ausente** às condições. Antes de implementar,
é preciso saber o tamanho — se forem centenas, a tela precisa de filtro e
paginação **junto**, não depois.

**Entregar antes de qualquer código, somente leitura:**

```sql
SELECT
  COUNT(*) FILTER (WHERE categoria_dre = 'Receita')                    AS categoria_credora,
  COUNT(*) FILTER (WHERE categoria_dre IS NULL)                        AS sem_categoria,
  COUNT(*) FILTER (WHERE valor = 0)                                    AS valor_zero,
  COUNT(*) FILTER (WHERE competencia IS NULL OR btrim(competencia) = '')
                                                                       AS sem_competencia,
  COUNT(*) FILTER (WHERE (competencia IS NULL OR btrim(competencia) = '')
                     AND categoria_dre IS NOT NULL
                     AND valor <> 0
                     AND NOT cancelado)                                AS so_sem_competencia,
  COUNT(*) FILTER (WHERE cancelado)                                    AS canceladas,
  COUNT(*)                                                             AS total
  FROM despesa
 WHERE tenant_id = :tenant_id;
```

**A coluna `so_sem_competencia` é a resposta do bloqueio:** são os lançamentos
que a tela **não mostra hoje** e passará a mostrar.

E o detalhamento, para a decisão de escala:

```sql
SELECT p.name AS projeto, d.num_doc, d.categoria_dre, d.valor,
       d.vencimento, d.status, d.created_at
  FROM despesa d
  JOIN version v ON v.id = d.version_id
  JOIN project p ON p.id = v.project_id
 WHERE d.tenant_id = :tenant_id
   AND (d.competencia IS NULL OR btrim(d.competencia) = '')
   AND d.categoria_dre IS NOT NULL
   AND d.valor <> 0
   AND NOT d.cancelado
 ORDER BY d.valor DESC;
```

## BAN-2 · O lote continua existindo?

**É a decisão de desenho desta tela.**

No print: vários lançamentos, de **fornecedores que não têm nada a ver entre
si** — banco, loja de materiais, marketplace, intermediadora, loja de
construção [nomes removidos]. Um único `<Select>` de destino, e "Marcar todos".

**A validação impede categoria de natureza errada. Não impede mandar material e
tarifa bancária para a mesma categoria.** O texto diz "sempre manual" — e manual
aqui significa "você clicou", não "você decidiu item a item".

**Escolher uma:**

1. **O lote sai.** Cada linha ganha o próprio seletor, e a correção é
   individual. Mais cliques, e cada clique é uma decisão.
2. **O lote fica, com atrito.** Mantém "Marcar todos", mas o preview passa a
   exigir que o usuário **veja fornecedor e valor de cada linha** antes de
   confirmar, e a tela avisa quando a seleção tem mais de N fornecedores
   distintos.
3. **Híbrido** — seletor por linha, mais um lote que só aparece quando a seleção
   é homogênea por fornecedor ou por conta CEF.

**Recomendação: a 3.** O lote é legítimo quando dez notas do mesmo fornecedor
caíram sem categoria; é perigoso quando dezesseis fornecedores diferentes viram
uma categoria só. **A homogeneidade é o critério, e o sistema sabe calcular
isso.**

## BAN-3 · A carência sai; a data impossível fica

**A Conferência de planos testa duas coisas, e elas têm destinos diferentes.**

**A carência sai, e o motivo está no texto da própria tela:** *"um intervalo
grande pode ser carência combinada em contrato — não é necessariamente erro"*.

Ela **não detecta erro: detecta que a obra tem carência**, que é a operação
normal de incorporadora. No print, os três intervalos — 16, 11 e 8 meses — são
coerentes entre si e parecem contrato, não digitação. Com o limiar em 3 meses, a
tela lista sempre as mesmas unidades até virar ruído que ninguém olha.

E a decisão é comercial, com o contrato à vista, **na tela da unidade** — que é
onde o plano se edita.

**A data impossível fica, porque nenhuma outra tela faz esse teste.** O dia 31
que vira fevereiro não é decisão comercial nem carência: é uma data que vai
gerar parcela em dia errado quando o plano virar `conta_receber`.

**Destino decidido: vira validação no cadastro da unidade** — Parte 6.

**Confirmar antes de implementar:** a materialização de `conta_receber` do
**Prompt K** já trata a data impossível quando gera a parcela? Se tratar, o
cadastro avisa e a materialização resolve; se não tratar, **o cadastro é a única
barreira** e precisa recusar, não só avisar.

---

# PARTE 1 — A QUARTA CONDIÇÃO

## 1.1 · O que falta

`getDespesasSuspeitas` testa três condições — categoria credora, sem categoria,
valor zero — e uma de exclusão, a cancelada.

**Não há nenhuma condição sobre `competencia`.**

Despesa com categoria válida, valor diferente de zero e **competência nula não
aparece na tela** — e a DRE agrupa por competência, então ela **não entra em
nenhuma linha da demonstração**. O usuário não tem como saber que ela existe.

## 1.2 · A condição

`competencia` nula ou vazia → motivo **"sem competência"**.

`btrim` na comparação: o campo é `text`, e string de espaços é o mesmo que
vazio.

## 1.3 · O texto do motivo diz a consequência

Os quatro motivos atuais nomeiam o defeito. Este precisa nomear o **efeito**,
porque o defeito não é óbvio:

> **"sem competência — não entra na DRE"**

É a frase que faz alguém agir.

## 1.4 · O que a tela não faz

**Não oferece corrigir a competência.** A reclassificação em lote toca
`categoria_dre` e nada mais — é o que o texto promete, e a promessa se mantém.

A linha leva ao lançamento pelo "Abrir", que já existe e já passa projeto e id
na URL. **Competência é campo de lançamento, e se corrige lá.**

## 1.5 · A relação com o Prompt AC

A Parte 4 do **Prompt AC** cria, na DRE, um rodapé com o que ficou fora da
demonstração — sem categoria, sem competência, categoria fora da lista.

**As duas telas passam a contar a mesma coisa, e precisam bater.** O rodapé da
DRE mostra o total e aponta para cá; esta tela lista e oferece o caminho.

**Reportar os dois números lado a lado** no relatório final.

---

# PARTE 2 — O LOTE COM TRANSAÇÃO

## 2.1 · Hoje são dois statements por despesa, sem transação

Um `UPDATE` e um `INSERT` de auditoria **por item**, em sequência. Marcar 500
gera **1.000 statements independentes** — se o processo cair no meio, parte fica
reclassificada e parte não, **sem rollback**.

E `alteradas`, que a mensagem da tela usa, some junto.

## 2.2 · A correção

**Uma transação envolvendo o laço inteiro.** Ou tudo, ou nada.

**O log entra na mesma transação** — é o que o **Prompt AK**, item 7.2, pede
para `setMemberPermissions`, e aqui o caso é o mesmo, multiplicado pela
quantidade de itens.

## 2.3 · O retorno passa a distinguir três números

Hoje devolve `alteradas`, que é menor que a seleção quando há canceladas ou
já-na-categoria. **A tela passa a mostrar os três:** selecionadas, alteradas, e
puladas com o motivo de cada uma.

---

# PARTE 3 — O LOTE ITEM A ITEM

**Ver BAN-2.** Se for a recomendação:

**3.1 · Seletor por linha**, com o destino escolhido individualmente.

**3.2 · O lote sobrevive para seleção homogênea** — mesmo fornecedor, ou mesma
conta CEF. Fora disso, a tela **avisa quantos fornecedores distintos estão na
seleção** antes do preview.

**3.3 · O preview mostra fornecedor e valor de cada linha**, não só a contagem.
É o que transforma "você clicou" em "você decidiu".

**3.4 · Nenhum limite artificial de quantidade** — o limite é a atenção do
usuário, e o preview é onde ela é exercida.

---

# PARTE 4 — DESEMPENHO E ESCALA

## 4.1 · A consulta carrega a tabela inteira

O `where` tem **um filtro: o tenant**. Dois `innerJoin`, um `leftJoin`, **sem
`LIMIT`**, e a triagem acontece em JavaScript.

Em um tenant com muitas despesas, **a tabela inteira trafega a cada visita** —
inclusive as milhares que não têm problema nenhum.

## 4.2 · A triagem vai para o SQL

As quatro condições viram `where`:

```sql
WHERE tenant_id = :tenant
  AND (categoria_dre = 'Receita'
       OR categoria_dre IS NULL
       OR valor = 0
       OR competencia IS NULL OR btrim(competencia) = '')
```

**A regra de qual categoria é credora continua no módulo** — não duplicar a
lista no SQL. A consulta recebe o conjunto `CREDORAS` como parâmetro.

**A exclusão da cancelada permanece em JavaScript**, porque depende de já haver
outro motivo — é lógica, não filtro.

## 4.3 · Filtro e paginação

Com a quarta condição, a lista cresce. **Entram filtros por projeto,
competência e fornecedor**, e paginação por cursor.

**O total e a soma continuam sendo do conjunto inteiro**, não da página — o
badge "N a conferir" perde o sentido se contar só o que está à vista.

## 4.4 · A string do motivo deixa de ser sinalizador

`r.motivos.includes("lançamento cancelado")` é o que desabilita o checkbox.
**Renomear o texto quebra a seleção em silêncio.**

O motivo passa a ter **código e texto**: o código governa o comportamento, o
texto é apresentação. É a mesma lição do `PCT_REF_CEF` indexado por posição, no
Prompt V.

---

# PARTE 5 — ID PRÓPRIO EM `SCREENS`

**5.1** As duas telas **não estão em `SCREENS`**, então `screenIdOfPath` devolve
`null` e **o enforcement central não as cobre**. Cada uma checa por conta
própria, com a chave de **outro módulo** — `despesas:ver` e `unidades:ver`.

**5.2** A Parte 6 do **Prompt AJ** já decide que ganham id próprio, e explica
por que não ganharam: *"módulo novo nasceria negado para todos os papéis já
configurados"*. Com o default declarativo daquele prompt, o motivo deixa de
valer.

**5.3 · A checagem própria permanece**, além do enforcement central. Duas
camadas, como nas demais telas.

**5.4 · Quem hoje alcança as telas continua alcançando** — os ids novos entram
no conjunto do papel conforme o BAJ-2.

---

# PARTE 6 — A ABA DE PLANOS SAI, A VERIFICAÇÃO FICA

**Ver BAN-3.**

## 6.1 · O que sai

A tela `/diagnostico/planos-recebiveis` inteira, o item de menu, e a condição de
**carência maior que a esperada** — com o filtro de 1, 2, 3, 6 e 12 meses.

**`intervaloMeses` e o resto de `calc/carencia.ts` permanecem** — o módulo é
usado em outros pontos. **Conferir antes de remover qualquer função dele.**

## 6.2 · O que muda de lugar: a data impossível

A verificação do **dia de vencimento que não existe em algum mês da série** vai
para o **cadastro do plano de pagamento da unidade** — **Prompt J**.

**Como ela funciona hoje**, e o que precisa ser preservado ao mover: para
`Mensais` (passo 1), `Semestrais` (passo 6) e `Anuais` (passo 12), com dia acima
de 28, ela projeta cada parcela da série e testa se o dia existe naquele mês.

**Dia até 28 é ignorado** — existe em todo mês, inclusive fevereiro.

**A verificação é por série**, não pelo primeiro vencimento: um plano que começa
em 31/01 quebra em fevereiro, e um que começa em 31/03 quebra em junho. Testar
só a primeira data não pega nem um nem outro.

## 6.3 · Onde exatamente ela aparece no cadastro

**No momento de preencher o vencimento da série**, não ao salvar. O usuário
precisa saber antes de terminar o plano.

**A mensagem diz qual mês quebra**, não só que há problema:

> *"Dia 31 não existe em fevereiro — a 2ª mensal cairia em data inválida."*

**Recusa ou aviso?** É a pergunta do BAN-3. **Sem tratamento na materialização,
recusa.** Com tratamento, aviso com o dia que será usado.

**O espírito do texto da tela de planos é preservado:** dizer o que acontece e
onde se decide, em vez de só apontar.

## 6.4 · Nenhum plano existente é alterado

**A validação vale para o que for digitado daqui em diante.** Plano gravado com
dia impossível permanece exatamente como está.

**E isso deixa um acervo sem verificação** — a tela que o apontava some, e a
validação nova não olha para trás.

**Entregar antes de remover, somente leitura:**

```sql
-- Planos vendidos com dia de vencimento acima de 28 nas séries periódicas.
SELECT p.name AS projeto, u.code AS unidade,
       u.payment_plan -> 'Mensais'    ->> 'venc' AS mensais,
       u.payment_plan -> 'Semestrais' ->> 'venc' AS semestrais,
       u.payment_plan -> 'Anuais'     ->> 'venc' AS anuais
  FROM unit u
  JOIN version v ON v.id = u.version_id
  JOIN project p ON p.id = v.project_id
 WHERE v.kind = 'atual' AND u.status = 'Vendido'
   AND u.payment_plan IS NOT NULL
 ORDER BY p.name, u.code;
```

**A lista resultante é entregue ao cliente, não corrigida.** Se houver
ocorrência, a correção é manual, plano a plano, na tela da unidade.

## 6.5 · A Conferência volta a ser uma tela só

Sem a segunda aba, não há fusão: a Conferência é a tela de lançamentos, com as
quatro condições. **A barra de abas não entra.**

O id em `SCREENS` é um só — `conferencia` —, governado por `despesas`, conforme
a Parte 5.

## 6.6 · O que a coluna UNIDADE revelou, e que não sai com a tela

No print, **UNIDADE e PROJETO exibem o mesmo valor** nas três linhas — OBRA 26,
OBRA 31, OBRA 29.

Ou a unidade herdou o nome do projeto no cadastro, ou a tela exibia o projeto
duas vezes. **Com uma unidade por obra ninguém percebe; com dez, nenhuma tela de
unidade serve.**

**Registrar e encaminhar ao Prompt J** — é achado de cadastro, e sobrevive à
remoção desta tela.

## 6.7 · O caso que o diagnóstico nunca mostrou

A data-base é o **primeiro bloco de entrada com vencimento e valor maior que
zero** — Ato, S1, S2, S3 —, e a primeira mensal só conta com `val("Mensais") > 0`.

**Unidade vendida sem entrada, ou sem mensais, saía da lista em silêncio**:
`meses = 0`, nenhum motivo. Um plano só com financiamento bancário nunca
apareceu ali.

**Não é problema desta tarefa** — mas é a demonstração de que a tela cobria menos
do que parecia. **Registrar no relatório.**

---

# PARTE 7 — ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.**

**7.1 · Ações**

- **Agrupar por causa provável** — mesmos fornecedor, conta CEF ou período. É o
  que transforma dezesseis linhas soltas em três decisões.
- **O que isso está tirando dos relatórios** — quanto dos lançamentos listados
  está fora da DRE hoje, e por qual motivo.
- **Desde quando** — o mais antigo de cada motivo, para saber se é acúmulo
  histórico ou problema corrente.
- **Padrão no que falta** — se as pendências se concentram num fornecedor, num
  período ou em quem lançou.

**7.2 · Nunca**

- **Nunca reclassificar**, nem propor a categoria de um lançamento específico.
  **Categoria é classificação contábil**, e a tela existe justamente porque
  alguém classificou errado. Esta tela fica **fora da Etapa 3 do Prompt E,
  permanentemente**.
- **Nunca afirmar que a lista está limpa.** Ausência de pendência é ausência
  **nas quatro condições**, não atestado de que o lançamento está certo.

**7.3 · Isolamento.** Filtro de tenant explícito; e quem não vê Despesas não
recebe dado de despesa, nem agregado.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| A trava contra categoria credora no lançamento | **Prompt S**, seção 3-C |
| O rodapé da DRE com o que ficou fora | **Prompt AC**, Parte 4 |
| Corrigir competência | tela de Despesas |
| Default do papel e ids em `SCREENS` | **Prompt AJ** |
| Transação em torno de log e escrita, no resto do sistema | **Prompt AK**, 7.2 |
| Escrita assistida | **fora, permanentemente** — 7.2 |

---

# 9. PRESERVAÇÃO DE DADOS

**9.1** A única coluna que esta tela altera é `categoria_dre`, e só pela ação do
usuário, item a item, com preview.

**9.2 · Nenhuma correção automática.** Nem de competência, nem de categoria, nem
de valor zero. **A tela mostra; o usuário decide.**

**9.3** Cancelada não é reclassificada, e continua não sendo.

**9.4** Nenhuma migração. A Parte 4 muda a consulta, não o dado.

---

# 10. NÃO REGRESSÃO

**10.1** As três condições atuais continuam produzindo exatamente a mesma lista
— conferir com a contagem antes e depois, motivo a motivo.

**10.2** A validação do destino continua recusando categoria credora.

**10.3** O preview, o log por item e os dois `continue` continuam.

**10.4** `natureza-dre.ts` e `carencia.ts` **não são alterados**.

**10.5** A remoção da Conferência de planos **não altera nenhum plano de
pagamento**, nenhuma unidade e nenhum `conta_receber`. `calc/carencia.ts`
permanece, e as funções usadas em outros pontos continuam funcionando.

---

# 11. TESTES

**A quarta condição**

1. Despesa com competência nula aparece na lista, com o motivo e a
   consequência.
2. Competência com espaços em branco é tratada como vazia.
3. Despesa que já aparecia por outro motivo **não duplica**.
4. **Antes e depois:** as três condições antigas devolvem a mesma lista.
5. O total da tela bate com o rodapé da DRE, para o mesmo tenant.

**O lote**

6. Reclassificar 100 itens com falha no meio **não deixa metade reclassificada**.
7. O retorno distingue selecionadas, alteradas e puladas, com o motivo.
8. Cancelada continua sendo pulada.
9. Já-na-categoria continua sendo pulada, sem log.
10. Categoria credora continua sendo recusada no servidor.
11. Seleção com fornecedores distintos avisa antes do preview.
12. O preview mostra fornecedor e valor de cada linha.

**Escala**

13. A triagem acontece no SQL — conferir que a consulta não traz despesa sem
    motivo.
14. Filtros por projeto, competência e fornecedor funcionam.
15. O badge de total conta o conjunto inteiro, não a página.
16. Renomear o texto de um motivo **não quebra** a seleção.

**A remoção**

16a. `/diagnostico/planos-recebiveis` não existe mais, e nenhum item de menu
    aponta para ela.
16b. Nenhum plano de pagamento, unidade ou recebível foi alterado.
16c. `calc/carencia.ts` continua funcionando para os demais consumidores.
16d. **No cadastro da unidade**, dia 31 em série mensal é recusado ou avisado
    conforme o BAN-3 — e a mensagem diz **qual mês** quebra.
16e. A verificação testa a **série inteira**, não só o primeiro vencimento:
    31/03 em mensais é apontado por causa de junho.
16f. Dia até 28 não gera nenhum aviso.
16g. Plano existente com dia impossível **não é alterado** pela implementação.

**Permissão**

17. A tela está em `SCREENS` e passa pelo enforcement central.
18. A checagem própria continua.
19. Quem alcançava continua alcançando.

**Assistente**

20. Não reclassifica nem propõe categoria de lançamento específico.
21. Não afirma que a lista está limpa.
22. Não grava nada.

**Gerais**

23. **Antes e depois:** conteúdo integral de `despesa`, exceto as
    reclassificações feitas pelo usuário no teste.
24. Cada reclassificação gerou log com `de→para`, `numDoc` e origem.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado das consultas do **BAN-1** — quantos lançamentos a quarta condição
   traz, e quantos só têm esse problema.
2. Decisão de **BAN-2** — o lote sai, fica com atrito, ou vira híbrido.
3. Resultado do **BAN-3** — se a materialização do Prompt K trata a data
   impossível, e se o cadastro recusa ou avisa.
3a. A lista de planos existentes com dia acima de 28 (6.4). **Sem corrigir
   nenhum.**
3b. O que foi removido com a tela de planos, e a confirmação de que
   `calc/carencia.ts` continua servindo aos demais consumidores.
3c. Onde a verificação da data impossível passou a acontecer no cadastro, e a
   mensagem exibida.
3d. O registro de 6.6 — unidade com o mesmo nome do projeto — encaminhado ao
   Prompt J.
3e. O registro de 6.7 — os planos que o diagnóstico nunca alcançou.
4. Como a quarta condição foi implementada, e o texto do motivo.
5. **Os dois números lado a lado:** o total desta tela e o do rodapé da DRE.
6. Como a transação foi aplicada ao laço, e o que acontece na falha.
7. Como a triagem foi movida para o SQL, sem duplicar a regra de natureza.
8. Como o motivo passou a ter código e texto.
9. Os filtros e a paginação implementados.
10. Os ids acrescentados a `SCREENS`, e a confirmação de que ninguém perdeu
    acesso.
11. Confirmação de que nenhuma correção automática foi feita.
12. Funcionamento do assistente, e confirmação de que não reclassifica.
13. Limitações encontradas.


<a id="prompt-ap"></a>


========================================================================


### ▸ 33 de 42 · PROMPT AP — Configuração da Versão sai

**Bloco 5 · Configuração** · Bloqueios: BAP-1 · BAP-2 · BAP-3 · BAP-4

A coleta é a Etapa 1 do próprio prompt. **O BAP-1 pode impedir a remoção.**

========================================================================


# PROMPT AP — A TELA DE CONFIGURAÇÃO DA VERSÃO SAI

Growth Construction · `/versao`.

**Cada versão é construída na sua própria tela** — Orçamentos, Previsão
Atualizada, e as telas de lançamento do dia a dia, que alimentam a Atual. **Não
há necessidade de criar nem de excluir versão.** A tela de configuração deixa de
existir.

**Esta é a única tela do sistema que nunca foi coletada.** Por isso o prompt
começa por um inventário, e **nada é removido antes dele**.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/versao` | Configuração da Versão | **extinta** | **este prompt** |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado é perdido. Nenhuma versão é apagada.**

Esta tarefa remove **a tela**, não os registros. Toda versão existente
permanece, com todas as suas linhas de `budget_line`, `unit`, `despesa`,
`cash_entry` e o que mais estiver vinculado — **inclusive as versões copiadas
que ninguém usa.**

**Nenhuma migração. Nenhum `DELETE`. Nenhum `UPDATE` em `version`.**

**2 · Remover a tela não pode remover uma capacidade sem destino.** Quatro
coisas parecem existir só ali. Cada uma precisa de destino declarado **antes** —
seção de bloqueios.

**3 · Nada vindo de mockup entra no código.**

---

# ETAPA 1 — A COLETA, ANTES DE QUALQUER REMOÇÃO

**Entregar e parar.** Sem isso, a remoção é feita às cegas.

```
Não altere nada. Gere docs/TELA-VERSAO.md contendo, na íntegra e com o
caminho de cada arquivo como cabeçalho:

1. a página /versao
2. todo componente próprio que ela importe, recursivamente
3. todas as Server Actions da tela, na íntegra — inclusive
   importVersionData, setDefaultVersion, e o que houver de criar,
   excluir, travar e destravar versão
4. src/lib/actions/version-io.ts inteiro
5. a tabela version no schema, com todos os índices e o ON DELETE de
   cada FK que aponta para ela
6. todos os lugares do sistema que criam uma linha em version
7. todos os lugares que leem version.locked e version.isDefault
8. perguntas específicas:

   a) Quem cria as versões de um projeto novo? Colar o código. A
      criação do projeto já gera atual, budget e forecast, ou elas
      nascem em /versao?
   b) Se /versao sair, um projeto novo continua tendo as três versões?
   c) importVersionData: colar inteira. O que ela apaga antes de
      inserir, e de quais tabelas? Há confirmação? Há preview?
   d) Ela é o único caminho de importação por planilha? Como ela se
      diferencia de importBudgetXlsx, que vive na tela de Orçamentos?
   e) version.locked: quem lê? O que trava exatamente? Colar cada
      consumidor.
   f) Quantas versões estão travadas hoje? Rodar e colar.
   g) version.isDefault: quem lê além de getActiveContext? Quantas
      versões estão marcadas como default hoje, por projeto?
   h) A exclusão de versão faz DELETE físico? O que cai em cascata?
      Colar o ON DELETE de cada FK.
   i) Há algum projeto com versão faltando — sem atual, sem budget ou
      sem forecast? Rodar e colar.
   j) Há versão com source_version_id preenchido — cópia — e com
      movimento vinculado? Rodar e colar.
   k) Qual permissão governa a tela e cada action? A tela está em
      SCREENS? Tem item no menu?
   l) Há tenant_id no where de cada consulta e de cada escrita?

Código na íntegra, sem resumir. É coleta, não análise.
```

---

# BLOQUEIOS — RESPONDER COM A COLETA NA MÃO

## BAP-1 · Quem cria as versões de um projeto novo

**É o bloqueio que pode impedir a remoção.**

Se a criação do projeto já gera as três versões, a tela sai sem perda. **Se as
versões nascem em `/versao`, removê-la deixa todo projeto novo sem Orçamento e
sem Previsão Atualizada** — e as telas de planejamento abrem em estado vazio,
sem caminho para sair dele.

**Responder com a resposta de (a) e (b) à vista.** Se a criação estiver em
`/versao`, ela **muda de lugar antes da remoção** — vai para a criação do
projeto, no **Prompt B**.

## BAP-2 · O travamento continua existindo?

`version.locked` é coluna separada de `status`, e o **Prompt H** é explícito:
*"aprovar não trava a edição. Trava é `version.locked`, acionada em `/versao`."*

**Se a tela sai e nada mais escreve nessa coluna:**

- versão travada hoje **fica travada para sempre**, sem caminho de destravar;
- versão destravada nunca mais pode ser travada.

**Escolher uma:**

1. **O travamento sai junto.** A coluna é descontinuada — **permanece no
   schema**, sem leitura. **Só é possível se nenhuma versão estiver travada
   hoje** — resposta de (f).
2. **O travamento muda de lugar**, para as telas de Orçamentos e Previsão
   Atualizada, onde a versão é construída. Um botão por versão, com permissão
   própria.

**Recomendação: a 2**, se a operação usa o travamento. A 1, se (f) devolver
zero — e aí com a coluna preservada, não removida.

## BAP-3 · A importação por planilha morre com a tela?

`importVersionData` é **o único caminho de entrada em massa do sistema**, e ela
**apaga antes de inserir**.

Mas a tela de Orçamentos tem a sua própria — `importBudgetXlsx`, que o inventário
do **Prompt AK** registra com `action: "budget.import"`.

**Responder com (c) e (d):** as duas fazem a mesma coisa? Se `importBudgetXlsx`
cobre o caso real, **`importVersionData` sai junto com a tela** — e o sistema
perde o seu único caminho destrutivo em lote, o que é ganho.

**Se ela cobre um caso que a outra não cobre**, esse caso precisa de destino
antes.

## BAP-4 · A versão padrão

`setDefaultVersion` é uma das 13 actions que gravam sem auditoria, no inventário
do **Prompt AK**.

`getActiveContext` resolve a versão por `kind = "atual"` → `isDefault` →
primeira criada. **Se a Atual sempre existe, o `isDefault` nunca é alcançado** —
e a action some sem consequência.

**Confirmar com (g) e (i):** há projeto sem versão `atual`? Se houver, o
`isDefault` está governando a escolha de alguém, e a remoção muda o que essa
pessoa vê.

---

# 1. O QUE SAI

**1.1** A página `(app)/versao/page.tsx` e os componentes exclusivos dela.

**1.2** As actions de **criar** e **excluir** versão.

**1.3** `importVersionData` e `version-io.ts`, conforme o BAP-3.

**1.4** `setDefaultVersion`, conforme o BAP-4.

**1.5** O travamento, conforme o BAP-2.

**1.6 · O id `versao` sai de `SCREENS`.**

**Cuidado que a coleta do Prompt AJ documentou:** tela removida de `SCREENS` faz
`screenIdOfPath` devolver `null`, e a rota — se continuar existindo — **fica sem
enforcement central**, como hoje acontece com `/acerto`.

**A rota sai de verdade.** Não deixar a página existindo sem id.

**1.7** A tela **não tem item no menu** — o Prompt C já registrava isso. Não há
o que remover ali; o mockup também já não a exibe.

---

# 2. O QUE NÃO SAI

Lista fechada.

- **Nenhuma linha de `version`.** Todas permanecem, inclusive as cópias.
- **Nenhuma coluna.** `locked`, `is_default` e `source_version_id` permanecem no
  schema, ainda que deixem de ser escritas.
- **`getVersionsDoProjeto`, `getVersionKind` e a resolução de contexto.**
- **A criação das três versões de um projeto novo**, onde quer que ela esteja —
  BAP-1.
- **`duplicateForecast` e o comparativo Budget × Forecast**, que vivem nas telas
  de planejamento.

---

# 3. O QUE ACONTECE COM QUEM ACESSAR A ROTA

**Escolher uma:** 404 padrão, ou redirecionar para **Projetos** com aviso de uma
linha.

Recomendação: a segunda, no padrão do **Prompt AB**.

---

# 4. O QUE FICA SEM DONO, E PRECISA SER DITO

**4.1 · Versão copiada continua no banco.** `duplicateVersion` está
descontinuada pelo BI-3 do **Prompt I**, e as existentes permanecem. **Com
`/versao` fora, não há mais nenhuma tela que apague versão.**

**Isso é o desejado** — mas precisa estar escrito, porque a consulta do BAA-2 do
**Prompt AA** lista essas cópias como coisa a resolver. **A resolução passa a ser
ignorá-las**, não apagá-las.

**4.2 · O RC-1 e o RC-2 do Prompt AA continuam valendo.** O Dashboard soma
`cash_entry` de todas as versões e divide o executado por todos os orçamentos.
**A remoção desta tela não corrige isso** — quem corrige é o Prompt AA.

**Registrar, para ninguém supor que uma coisa resolve a outra.**

**4.3 · Se alguma versão precisar ser removida um dia**, isso passa a ser
operação de banco, com backup antes. **É o comportamento correto para uma
exclusão em cascata que alcança despesas, unidades, caixa e orçamentos.**

---

# 5. PRESERVAÇÃO DE DADOS

**5.1** Nenhum `DELETE`, nenhum `UPDATE`, nenhuma migração sobre `version` ou
sobre qualquer tabela vinculada.

**5.2 · Antes e depois:** contagem de `version` por projeto e por `kind`, e
contagem de `budget_line`, `unit`, `despesa` e `cash_entry` por versão.
**Nenhuma diferença.**

**5.3** As colunas permanecem no schema, com comentário dizendo que deixaram de
ser escritas e por quê.

---

# 6. NÃO REGRESSÃO

**6.1** Todo projeto continua tendo as versões que tinha.

**6.2** Projeto novo continua nascendo com as três — BAP-1.

**6.3** Orçamentos, Previsão Atualizada, DRE, Fluxo de Caixa, Dashboard e Resumo
continuam com os mesmos números.

**6.4** `getActiveContext` continua resolvendo a versão da mesma forma.

**6.5** A importação de Orçamentos, na tela de Orçamentos, continua funcionando.

---

# 7. TESTES

1. `/versao` se comporta conforme a seção 3.
2. Nenhuma menção restante à rota em `href`, `redirect` ou `revalidatePath`.
3. **Projeto novo nasce com atual, budget e forecast.**
4. **Antes e depois:** contagem de `version` por projeto e por `kind`. Nenhuma
   diferença.
5. **Antes e depois:** contagem de `budget_line`, `unit`, `despesa` e
   `cash_entry` por versão. Nenhuma diferença.
6. Versão travada hoje se comporta conforme a decisão do BAP-2.
7. Projeto sem versão `atual`, se houver, continua abrindo como antes.
8. A importação de Orçamentos continua funcionando.
9. Nenhuma versão mudou de `locked`, `is_default` ou `kind`.
10. Nenhuma migração foi criada.
11. Sem permissão, nenhuma rota órfã fica acessível.

---

# 8. DEPOIS DA REMOÇÃO — ATUALIZAR OS DOCUMENTOS

**8.1 · `PROMPT-H`**, item 1.4 — *"trava é `version.locked`, acionada em
`/versao`"*. Passa a apontar o destino do BAP-2.

**8.2 · `PROMPT-I`**, BI-3 — registrar que, sem `/versao`, não há mais caminho
de exclusão de versão pela interface.

**8.3 · `PROMPT-AA`**, BAA-2 — o inventário de cópias continua valendo como
diagnóstico; a resolução passa a ser conviver, não apagar.

**8.4 · `PROMPT-AJ`** — `SCREENS` cai para 36 telas, com `contabilidade` e
`versao` fora.

**8.5 · `PROMPT-C`** — registrar que a tela deixou de existir; ela nunca teve
item de menu.

**8.6 · `ROTEIRO-EXECUCAO.md`** — `/versao` sai da lista de pendências e este
prompt entra no Bloco 5.

---

# 9. RELATÓRIO FINAL OBRIGATÓRIO

1. A coleta da Etapa 1, na íntegra.
2. Resposta de **BAP-1** — quem cria as versões, e o que foi feito se a criação
   estava em `/versao`.
3. Decisão de **BAP-2** — o travamento saiu ou mudou de lugar, e quantas versões
   estão travadas hoje.
4. Decisão de **BAP-3** — `importVersionData` saiu, e o que a tela de Orçamentos
   cobre.
5. Decisão de **BAP-4** — o `isDefault` está governando a escolha de alguém?
6. Arquivos removidos, um a um.
7. O comportamento aplicado à rota.
8. **As comparações antes/depois dos testes 4 e 5.**
9. Confirmação de que nenhuma versão foi apagada, alterada ou destravada.
10. Confirmação de que nenhuma migração foi criada.
11. Os documentos atualizados conforme a seção 8.
12. Limitações encontradas.


<a id="prompt-ab"></a>


========================================================================


### ▸ 34 de 42 · PROMPT AB — Remoção de três telas

**Bloco 6 · Leitura** · Bloqueios: BAB-1 · BAB-2 · BAB-3 · BAB-4 · BAB-5

Projeção, Consolidado e Balanço do Dia. **Balanço do Dia só depois de L.**

========================================================================


# PROMPT AB — REMOÇÃO DE TRÊS TELAS

Growth Construction · `/projecao`, `/consolidado` e `/balancodia`.

**Esta tarefa não corrige nada. Ela remove três destinos de navegação.** O dado
permanece integralmente no banco, e nenhuma tabela, coluna ou registro é tocado.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/ponto` | Ponto da Obra | **extinta** | Prompt Z, Parte 1 |
| `/fechamento` | Fechamento de Caixa | **absorvida pelo Caixa** | Prompt L, Parte 9 |
| `/acerto` | Acerto Contábil | **aba de Despesas, só leitura** | Prompt S |
| `/projecao` | Projeção de Receitas | **extinta** | **este prompt** |
| `/consolidado` | Consolidado | **extinta** | **este prompt** |
| `/balancodia` | Balanço do Dia | **extinta** | **este prompt** |

**Nada de nome interno muda.** Tabelas, campos e funções compartilhadas
permanecem. Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Esta tarefa remove
**telas**, não dados. Nenhum registro de `unit`, `permuta`, `reembolso`,
`conta_receber`, `budget_line`, `cash_entry`, `daily_closing` ou `carry_over` é
apagado, alterado, reclassificado ou desvinculado.

**Nenhuma migração. Nenhum `DROP`. Nenhum `DELETE`. Nenhum `UPDATE`.** Se alguma
etapa parecer exigir isso: **PARE**, e reporte.

**2 · Nada vindo de mockup entra no código.**

---

# POR QUE ESTAS TRÊS

**`/projecao` e `/consolidado`** apresentam receita **por fonte de recurso** —
AS/Sinais, Mensais, Semestrais, Anuais, FGTS, Subsídio, Permuta, Reembolso. Essa
leitura entra em conflito direto com as decisões já tomadas: pela seção 57 do
**Prompt I**, a receita tem duas fontes, a permuta não é receita e a liberação de
obra é caixa. Manter duas telas que apresentam o mundo pela estrutura antiga
significa manter, em produção, dois vocabulários de receita que discordam.

**`/balancodia`** é tela de leitura pura sobre `daily_closing`, que o **Prompt L**
absorve na cadeia de saldo do Caixa junto com `/fechamento`.

**Observação de apoio, não é justificativa por si só:** nas capturas enviadas, o
Consolidado exibe traço em todas as oito fontes e em todos os doze meses, e o
Balanço do Dia informa *"Nenhum fechamento registrado"*. A Projeção exibe número
— [valores removidos] —, então **ela não está vazia**, e
a remoção dela tira um número que hoje está na tela de alguém.

---

# ORDEM DE EXECUÇÃO

| | Depende de | Observação |
|---|---|---|
| `/consolidado` | nada | pode sair primeiro |
| `/projecao` | nada | idem |
| `/balancodia` | **Prompt L**, Parte 9 | **não sai antes** de a cadeia de saldo do Caixa estar em produção |

**`/balancodia` é a única das três com pré-condição.** Removê-la antes do Prompt L
deixa `daily_closing` sem nenhum leitor — o sistema passa a gravar fechamento de
caixa que ninguém consegue ver. É exatamente o padrão que a revisão vem
catalogando como **tabela morta**, e esta tarefa não pode criar mais uma.

---

# BLOQUEIOS — RESPONDER ANTES DE ESCREVER CÓDIGO

## BAB-1 · Quem passa a responder cada pergunta

Cada tela existe porque alguém faz uma pergunta. Remover a tela não remove a
pergunta. **Responder, por escrito, para cada uma:**

| Tela | A pergunta que ela responde | Quem passa a responder |
|---|---|---|
| Projeção de Receitas | quanto entra por fonte, mês a mês, comparando versões | ? |
| Consolidado | comparativo de versões consolidando várias obras | ? |
| Balanço do Dia | quais dias foram fechados, com saldo inicial, entradas, saídas e divergência | Caixa — **Prompt L**, confirmar |

Candidatos: o **Fluxo de Caixa previsto** para a projeção por fonte; a **DRE** e o
**relatório customizado** (Parte 7 do Prompt AA) para a comparação de versões; a
**cadeia de saldo do Caixa** para o balanço diário.

**Se alguma pergunta ficar sem dono, a tela correspondente não sai nesta leva.**

## BAB-2 · `daily_closing` e `carry_over` continuam legíveis?

`/balancodia` e `/fechamento` são os **dois únicos** leitores de `daily_closing`.
O Prompt L retira o segundo.

**Confirmar por escrito:** a cadeia de saldo do Caixa exibe os dias fechados, com
saldo inicial, entradas, saídas, saldo final, divergência, responsável e data de
fechamento — os sete campos que o Balanço do Dia mostra hoje.

**E registrar o estado de `carry_over`**, que o inventário já classifica como
morta: um `INSERT`, zero `SELECT`. Esta tarefa **não a remove** e não a corrige;
apenas confirma que continua como está.

## BAB-3 · Quem consome as exportações

As três têm saída de arquivo: Projeção e Consolidado têm **Exportar**; Balanço do
Dia tem **Imprimir** e **Exportar CSV**.

Arquivo exportado sai do sistema e vira anexo de e-mail, planilha do contador,
documento entregue ao banco. **Perguntar ao cliente, antes de remover:** alguém
recebe periodicamente algum desses arquivos?

Se receber, a exportação precisa existir em outro lugar antes de a tela sair.

## BAB-4 · As funções que ficam sem chamador

Com `/projecao` e `/consolidado` fora, estas deixam de ter consumidor:

| Função | Arquivo | Hoje é chamada por |
|---|---|---|
| `getRevenueBySource` | `queries.ts:1392–1450` | `consolidado/page.tsx:66` e `:117`, `projecao/page.tsx:71` |
| `calcProjectionBySource` | `calc/projection.ts:156–239` | só `getRevenueBySource` |
| `PROJECTION_SOURCES` · `emptyBySource` | `calc/projection.ts:144–154` | as duas acima |

**NÃO REMOVER `calcProjectionBySource` NESTA TAREFA.**

Motivo: ela é a **única implementação do sistema que respeita as flags `usar*` do
plano de pagamento e aplica INCC**. `expandUnitReceivables`, que alimenta
Dashboard, DRE e Contas a Receber, ignora as duas coisas. A seção 58 do Prompt I
vai usar `calcProjectionBySource` como referência para unificar as duas leituras.

Apagá-la agora destrói a referência antes de a unificação acontecer.

**Decidir e reportar:** marcar as três como descontinuadas, com comentário
dizendo por quê e apontando para a seção 58, e remover só depois que a unificação
estiver em produção. `getRevenueBySource` pode sair junto com as telas, desde que
`calcProjectionBySource` permaneça.

## BAB-5 · Existe link, atalho ou favorito para estas rotas

Levantar, antes de remover: menções às três rotas em qualquer lugar do código —
`href`, `redirect`, `revalidatePath`, botões de outras telas, itens de menu,
textos de ajuda, e as rotas de exportação em `(app)/*/export/route.ts`.

**Rota removida sem varredura vira link quebrado numa tela não revisada.**

---

# 1. O QUE SAI

**1.1 · As páginas.** `(app)/projecao/page.tsx`, `(app)/consolidado/page.tsx` e
`(app)/balancodia/page.tsx`.

**1.2 · Os componentes exclusivos** de cada uma. **Componente compartilhado com
qualquer outra tela não é tocado** — nem para "limpar" prop que deixou de ser
usada. Listar quais são exclusivos e quais são compartilhados, no relatório final.

**1.3 · Os itens de menu.** Os três saem da barra lateral. A estrutura do menu
pertence ao **Prompt C** — atualizar o mapa dele na mesma entrega, para que os
dois não divirjam.

O módulo **Reports & Dashboards** fica com: Dashboard, DRE, Fluxo de Caixa,
Medição de Obra, Resumo Executivo — mais **Relatórios customizados**, quando a
Parte 7 do Prompt AA entrar.

**1.4 · As rotas de exportação** exclusivas das três, se houver, conforme o
levantamento do BAB-5 e a resposta do BAB-3.

**1.5 · `getRevenueBySource`**, conforme a decisão do BAB-4.

---

# 2. O QUE NÃO SAI

Lista fechada. Qualquer alteração aqui está fora de escopo.

- **Nenhuma tabela.** `daily_closing`, `carry_over`, `permuta`, `reembolso`,
  `unit`, `conta_receber`, `budget_line` — todas permanecem, com todos os
  registros.
- **Nenhuma coluna, nenhum índice, nenhuma constraint.**
- **`calcProjectionBySource`, `PROJECTION_SOURCES` e `emptyBySource`** — ver
  BAB-4.
- **`calcTotals`**, que devolve `banco`, `reemb`, `permRec` e `permVend`, e é
  usada fora destas telas.
- **`getMonthlyRevenue`, `getReceivables`, `getContasPagar`,
  `expandUnitReceivables`** — nenhuma é alterada por esta tarefa.
- **As telas de Fechamento de Caixa e Caixa** — o destino delas é o Prompt L.
- **Qualquer regra de negócio, cálculo ou permissão.**

---

# 3. O QUE ACONTECE COM QUEM ACESSAR A ROTA

Usuário com a URL no histórico ou em favorito vai acessá-la.

**Escolher uma, e aplicar às três:**

1. **404 padrão da aplicação.** Simples, e não explica nada.
2. **Redirecionar para a tela que absorveu a pergunta**, com aviso de uma linha:
   esta tela foi descontinuada; o que você procura está aqui.

Recomendação: a **2**, com o destino de cada uma vindo do BAB-1. Sumir sem dizer
para onde é como se descobre uma mudança pelo susto.

---

# 4. PRESERVAÇÃO DE DADOS

**4.1** Nenhum `INSERT`, `UPDATE`, `DELETE`, `DROP` ou `TRUNCATE`. Nenhuma
migração, nem aditiva — esta tarefa não precisa de nenhuma.

**4.2** Nenhum registro deixa de existir, e nenhum vínculo é desfeito. O que a
empresa lançou continua no banco, alcançável por qualquer tela que leia as mesmas
tabelas.

**4.3** As três telas são **somente leitura** hoje. Removê-las não pode, por
nenhum caminho, disparar escrita.

---

# 5. NÃO REGRESSÃO

**5.1** DRE, Fluxo de Caixa, Dashboard, Resumo Executivo, Medição, Contabilidade,
Caixa e Contas a Receber devolvem **exatamente os mesmos números de antes**, para
todos os projetos e todas as versões. É a condição de aceite principal.

**5.2** Nenhuma consulta compartilhada é alterada. Se alguma parecer precisar de
ajuste "porque perdeu um consumidor", **PARE** — é sinal de que algo fora de
escopo entrou junto.

**5.3** O menu continua navegável em todos os módulos, sem item órfão e sem link
quebrado.

**5.4** As permissões não mudam. Se existir chave de permissão específica das três
telas na matriz `can(...)`, ela **permanece cadastrada** — remover chave de
permissão é alterar a matriz de acesso, e isso é escopo do Prompt M.

---

# 6. TESTES

1. As três rotas se comportam conforme a decisão da seção 3, e o comportamento é
   o mesmo nas três.
2. Nenhum item de menu aponta para elas.
3. Varredura do código: nenhuma menção restante a `/projecao`, `/consolidado` e
   `/balancodia` em `href`, `redirect` ou `revalidatePath`.
4. **Antes e depois:** contagem de linhas de `daily_closing`, `carry_over`,
   `permuta`, `reembolso`, `unit`, `conta_receber`, `budget_line` e `cash_entry`.
   Nenhuma diferença.
5. **Antes e depois:** totais de DRE, Fluxo de Caixa, Dashboard, Resumo Executivo
   e Medição, por projeto e por versão. Nenhuma diferença.
6. `daily_closing` continua sendo gravada pelo fechamento, e **continua sendo
   exibida** — na tela indicada pelo BAB-2.
7. Fechar um dia e conferir que o registro aparece na tela que absorveu a leitura,
   com os sete campos.
8. `calcProjectionBySource` continua no código e seus testes continuam passando.
9. Nenhuma migração foi criada.
10. Nenhum componente compartilhado foi alterado.
11. Perfis de permissão diferentes navegam sem encontrar item órfão.

---

# 7. DEPOIS DA REMOÇÃO — ATUALIZAR OS DOCUMENTOS

Não é código, e é parte da entrega.

**7.1 · `CONTINUAR-REVISAO.md`** — as três saem da lista "faltam revisar ·
prioridade alta". Restam ali: DRE, Resumo Executivo, Contabilidade.

**7.2 · `ROTEIRO-REVISAO.md`** — o Bloco 8 cai de sete telas para quatro, e a
contagem total de 48 telas muda.

**7.3 · `PROMPT-C-SIDEBAR.md`** — o mapa do módulo Reports & Dashboards.

**7.4 · `PROMPT-I-ARQUITETURA-VERSOES.md`** — a seção **56.3.2** manda auditar os
consumidores da liberação de obra e cita, entre eles, *"a Projeção exibe linha
própria com total próprio"* e o Consolidado que soma `sumFiltered(rv.reemb)` no
TOTAL. Com as duas telas fora, **esses dois itens deixam de existir** e a seção
56 fica menor. Registrar.

**7.5 · `PROMPT-H-RASCUNHO-RELATORIOS.md`** — `/projecao` e `/consolidado` estão
na tabela da seção 2 como telas que filtram por situação, e em BH-3 entre as sete
que usam `version-multiselect`. Ajustar para cinco.

**7.6 · `PROMPT-AA-DASHBOARD.md`** — a Parte 7 passa a ser o único lugar onde o
comparativo de versões consolidado existe. Isso **eleva a prioridade** dela: o que
saiu de duas telas precisa caber ali.

---

# 8. RELATÓRIO FINAL OBRIGATÓRIO

1. Respostas de BAB-1 a BAB-5, por escrito.
2. Arquivos removidos, um a um.
3. Componentes exclusivos removidos e componentes compartilhados encontrados —
   com a confirmação de que nenhum compartilhado foi tocado.
4. O que foi feito com `getRevenueBySource`, `calcProjectionBySource`,
   `PROJECTION_SOURCES` e `emptyBySource`, e por quê.
5. Resultado da varredura do BAB-5 — todas as menções encontradas e o que foi
   feito com cada uma.
6. Comportamento aplicado às rotas removidas, e o destino de cada redirecionamento.
7. Confirmação de que `daily_closing` continua sendo exibida, e onde.
8. Comparação antes/depois das contagens de tabela (teste 4).
9. Comparação antes/depois dos totais dos relatórios que ficaram (teste 5).
10. Confirmação de que nenhuma migração foi criada e nenhum dado foi alterado.
11. Documentos atualizados conforme a seção 7.
12. Limitações encontradas.


<a id="prompt-ac"></a>


========================================================================


### ▸ 35 de 42 · PROMPT AC — DRE

**Bloco 6 · Leitura** · Bloqueios: BAC-1 · BAC-2 · BAC-3 · BAC-4

A Parte 1 pode ir antes de tudo; o resto depende do Bloco 2.

========================================================================


# PROMPT AC — DRE

Growth Construction · `/dre`.

Baseado na coleta de código `docs/TELA-DRE.md` (commit `45f4ce3`). A **Parte 1** é
o que foi pedido: comparar versões, por projeto ou por empresa toda, no mesmo
período, uma versão por coluna. As demais partes são os achados do laudo da
mesma tela.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/ponto` | Ponto da Obra | **extinta** | Prompt Z, Parte 1 |
| `/fechamento` | Fechamento de Caixa | **absorvida pelo Caixa** | Prompt L, Parte 9 |
| `/acerto` | Acerto Contábil | **aba de Despesas, só leitura** | Prompt S |

Os três cenários aparecem na tela como **Orçamento**, **Previsão Atualizada** e
**Realizado**, mesmo que internamente sigam `budget`, `forecast` e `atual` —
seção 33 do **Prompt I**. **Nenhum `kind` muda no banco.**

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** A DRE é somente
leitura e continua sendo. Nenhuma despesa é reclassificada, nenhuma versão é
criada, renomeada ou apagada, nenhum número gravado é recalculado. Se alguma
correção exigir tocar em registro: **PARE**, não execute, e reporte.

**2 · Nada vindo de mockup entra no código.**

---

# ESCOPO

A DRE é o destino de tudo que foi decidido nos prompts anteriores, e é a tela
onde o erro de origem vira número assinado. Este prompt faz três coisas:

1. **Abre a comparação** — versões, projetos e período combináveis sem exclusões
   silenciosas (Parte 1).
2. **Corrige o que a própria tela faz errado** — regimes misturados, lançamento
   que some, cascata contábil (Partes 2 a 7).
3. **Extrai a regra da página** para que ela possa ser testada e reusada
   (Parte 8).

**O que este prompt não faz:** corrigir as origens de receita. Isso é do
**Prompt I**, seções 54, 56, 57 e 58. A DRE exibe o que aquelas funções
devolvem.

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

Seção decisiva. Quatro coisas nesta tela estão certas, e três delas contrariam o
que a revisão esperava encontrar:

**1 · A despesa da DRE está em competência.** `despesa.competencia`, não
vencimento, não caixa (`queries.ts:238–244`, `page.tsx:130`). **O lado da despesa
cumpre a RG-01.** Toda a distorção de regime está na receita e nos encargos.

**2 · Medição não entra na DRE**, com o motivo escrito no código: evita
duplicidade com a despesa lançada (`page.tsx:136–137`). Decisão correta e
documentada — **não "corrigir" isso**.

**3 · Despesa cancelada não compõe a DRE** (`queries.ts:987–988`).

**4 · A permissão existe e é no servidor.** A página não chama `can`, e não
precisa: `dre` está em `SCREENS` (`permissions.ts:42`) e o enforcement central do
`layout.tsx:94–95` aplica `can(ctx.perms, "dre", "ver")` antes de renderizar.
**Não acrescentar verificação duplicada na página.**

**5 · Um único fetch alimenta as duas visões.** `versionInputsByMonth` já devolve
tudo por competência; o consolidado soma, o mensal lê mês a mês. A Parte 1 amplia
esse desenho, não o substitui.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — comparação | nada | **pode ir sozinha e primeiro** |
| **2** — a quinta origem de receita | **Prompt S, seção 3-C** | a trava precisa existir antes |
| **3** — regimes misturados | nada | |
| **4** — lançamento que some | nada | par com a Parte 3 |
| **5** — categoria fora da lista | Prompt S, 3-C | |
| **6** — a cascata | **BAC-3** | decisão contábil do cliente |
| **7** — o eixo de meses | **Prompt I**, seção 55 | a janela vem do projeto |
| **8** — extrair a regra da página | Parte 1 | pré-condição da Parte 7 do Prompt AA |

---

# BLOQUEIOS

## BAC-1 · O diagnóstico da base, antes de qualquer código

Quatro consultas somente leitura. As duas primeiras explicam o número que está na
tela hoje; as duas últimas explicam o que não está.

```sql
-- 1) As origens de receita, lado a lado. :proj = projeto, :ver = versão atual.
SELECT COALESCE(SUM(valor),0) AS conta_receber
  FROM conta_receber WHERE project_id = :proj AND cancelado = false;
SELECT COALESCE(SUM(valor),0) AS reembolso
  FROM reembolso WHERE version_id = :ver;
SELECT COALESCE(valor_construcao,0)+COALESCE(valor_terreno,0) AS valor_global
  FROM project WHERE id = :proj;
SELECT code, status, payment_plan FROM unit WHERE version_id = :ver;

-- 2) A linha Banco — o financiamento inteiro num mês só.
SELECT code, status,
       payment_plan->'Banco'->>'valFinanc'    AS val_financ,
       payment_plan->'Banco'->>'dataPrimParc' AS data_prim_parc,
       payment_plan->'Banco'->>'statusFinanc' AS status_financ
  FROM unit WHERE version_id = :ver AND status = 'Vendido';

-- 3) Despesas por categoria e status.
SELECT COALESCE(d.categoria_dre,'(sem categoria)') AS categoria,
       COALESCE(d.status,'(sem status)') AS status,
       COUNT(*) AS qtd, SUM(d.valor) AS total
  FROM despesa d JOIN version v ON v.id = d.version_id
 WHERE v.project_id = :proj AND d.cancelado = false
 GROUP BY 1,2 ORDER BY 1,2;

-- 4) O que a DRE descarta em silêncio: sem categoria ou sem competência.
SELECT d.num_doc, d.valor, d.categoria_dre, d.competencia, d.status, v.kind
  FROM despesa d JOIN version v ON v.id = d.version_id
 WHERE v.project_id = :proj AND d.cancelado = false
   AND (d.categoria_dre IS NULL OR d.categoria_dre = ''
        OR d.competencia IS NULL OR d.competencia = '')
 ORDER BY d.valor DESC;
```

A terceira e a quarta juntas respondem por que uma obra exibe margem de
contribuição próxima de 100% com custo variável irrisório [dado de produção removido].

## BAC-2 · Quantas versões um projeto tem, e qual o teto de colunas

A Parte 1 remove o limite de três. Antes de decidir o teto de renderização:

```sql
SELECT p.name, v.kind, COUNT(*) AS versoes,
       SUM(CASE WHEN v.source_version_id IS NOT NULL THEN 1 ELSE 0 END) AS copias
  FROM version v JOIN project p ON p.id = v.project_id
 GROUP BY 1,2 ORDER BY 1,2;
```

**Responder:** existe projeto com mais de seis versões? Se existir, a tabela
precisa de rolagem horizontal com primeira coluna fixa desde a estreia.

## BAC-3 · A cascata contábil — decisão do cliente, não do código

**Ver Parte 6.** Hoje Retiradas subtrai antes do EBITDA, e Empréstimos e
Investimentos subtraem do Resultado Final. Contabilmente, nenhum dos três é
despesa de resultado.

**Não implementar a Parte 6 sem resposta por escrito**, porque ela muda o número
que os sócios leem. A pergunta ao cliente está em 6.2.

## BAC-4 · A quinta origem de receita

Despesa classificada como `"Receita"` soma na linha de receita da DRE
(`page.tsx:133`). A seção 3-C do **Prompt S** trava o lançamento futuro; esta
tarefa decide o que fazer com o legado **na exibição**.

**Responder com o número do BS-4 do Prompt S à vista:** quantas linhas são, e
quanto somam. Sem isso, retirar a linha é apagar receita sem saber quanta.

---

# PARTE 1 — A COMPARAÇÃO

O que existe hoje, e as três exclusões que ninguém declarou:

| Combinação | Hoje |
|---|---|
| Versões × projeto que não é o ativo | **não existe** — `canCompareVersions` exige `selectedProjects[0].id === ctx.project.id` |
| Versões × Empresa toda | **não existe** — `!isAll` |
| Versões × visão mensal | **exibe só a primeira**, `compareVersions[0]` (`page.tsx:313`), e as outras somem sem aviso |

## 1.1 · A comparação deixa de depender do projeto ativo

**A causa:** a página usa `ctx.versions`, que são as versões do projeto do cookie,
e nunca busca as versões do projeto que o usuário escolheu.

**A correção:** as versões vêm de `getVersionsDoProjeto(ctx.tenant.id,
projectId)` — função que já existe (`queries.ts:2197–2211`) e **tem `tenant_id` no
`where`**, diferente da consulta inline atual.

`ctx.versions` deixa de ser fonte nesta tela. `canCompareVersions` deixa de
existir: **comparar versões passa a valer para qualquer projeto selecionado.**

**Os ids vindos de `?vs=` são validados contra as versões daquele projeto,
naquele tenant.** Id que não pertencer ao conjunto é descartado — nunca usado
cru.

## 1.2 · Empresa toda passa a comparar cenários

Com vários projetos selecionados, **a coluna deixa de ser uma versão e passa a
ser um cenário** — Orçamento, Previsão Atualizada, Realizado.

Para cada cenário escolhido e para cada projeto selecionado, resolver a versão
daquele `kind` **naquele projeto**, e só então agregar. É a seção 35 do
**Prompt I**, literal: nunca aplicar uma única `versionId` a vários projetos.

**A cobertura é declarada**, conforme a seção 36: *"Previsão Atualizada: 8 de 10
projetos possuem"*. Projeto sem a versão do cenário **não entra com zero** — ele
entra na contagem de ausência, e a coluna diz de quantos projetos ela é feita.

## 1.3 · O fim dos quatro fallbacks

`versionIdOfKind` (`page.tsx:88–103`) hoje cai em cascata: `kind` pedido →
`atual` → `isDefault` → primeira versão criada → `null`. E `null` faz o projeto
entrar **zerado, em silêncio** (`page.tsx:152`).

Isso significa que pedir "Orçamento" e receber os números do Realizado é o
comportamento atual, sem nenhum aviso na tela.

**A cascata sai inteira.** Cenário pedido e ausente devolve **estado explícito** —
"este projeto não possui Orçamento" —, nunca outra versão e nunca zero. É a seção
8 do **Prompt I**.

## 1.4 · O limite de três

O `.slice(0, 3)` (`page.tsx:298`) é limitação de largura, não de dado.

**Passa a ser:** todas as versões do projeto são selecionáveis. A tabela ganha
**rolagem horizontal com a primeira coluna fixa**, no mesmo padrão de Orçamentos e
Previsão Atualizada.

**A seleção padrão** é a mesma do Dashboard, Parte 1.2: **Atual**, mais o
**Orçamento** e a **Previsão Atualizada** mais recentes de cada natureza. Nunca
cópia — identificadas por `source_version_id` —, nunca ordem de criação.

Cópias continuam selecionáveis, fora do padrão e marcadas como tal.

Acima do teto definido no BAC-2, a tela **informa** em vez de descartar.

## 1.5 · Mensal × comparação — a matriz

Hoje o mensal com três versões marcadas exibe uma e descarta duas, calado.

**Passa a ser cabeçalho de dois níveis:** mês no nível de cima, versões no de
baixo — a mesma estrutura de `thead` de duas linhas que o sistema já usa nas
telas de planejamento.

```
            │      05/2026      │      06/2026      │ …
   Item     │ Orç │ Prev │ Real │ Orç │ Prev │ Real │
```

**Com o produto de meses × versões, a rolagem horizontal e a coluna fixa deixam
de ser opcionais.** A coluna "Total" permanece, com o mesmo agrupamento.

**Em nenhuma hipótese uma versão selecionada é descartada em silêncio.** Se a
combinação escolhida ultrapassar o teto de colunas, a tela diz e propõe reduzir —
menos meses ou menos versões.

## 1.6 · O período é um só para todas as colunas

Já está correto — `versionInputs(v.id, projectId, periodMonths)` recebe o mesmo
`periodMonths` para todas. **Manter**, e valer também para a matriz de 1.5 e para
os cenários de 1.2.

Os quatro modos de período — acumulado, ano-calendário, customizado com De/Até, e
o par em branco — permanecem como estão, ressalvado o que a Parte 7 muda na
origem do eixo.

## 1.7 · A coluna "% Receita" passa a existir sempre

Hoje ela some quando há mais de uma coluna (`{!multi && …}`, `page.tsx:426` e
`:464`), e quando aparece divide tudo por `columns[0].wf.R` — a receita da
primeira coluna.

**Passa a ser uma por coluna, cada uma dividida pela própria receita.** Percentual
vertical de cenário comparado ao de outro cenário é leitura sem sentido.

O guard de denominador zero permanece: receita zero ou negativa exibe estado
próprio, não `0,0%` — ver Parte 9.

## 1.8 · O cabeçalho declara o recorte

Em texto, acima da tabela: quantos projetos, quais cenários ou versões, qual
período, e a cobertura de 1.2 quando houver ausência.

E o rótulo da versão sai do lugar onde afirma regime: hoje o cabeçalho exibe
`version.label` — texto digitado pelo usuário, como **"Atual — caixa real"** —
numa tela de competência. O rótulo do cenário vem do `kind`; o nome digitado, se
exibido, vai como complemento.

---

# PARTE 2 — A QUINTA ORIGEM DE RECEITA

**Ver BAC-4 e a seção 3-C do Prompt S.**

`page.tsx:133` soma na receita toda despesa com `categoria_dre = "Receita"`. A
seção 57.3 do **Prompt I** define duas fontes para a receita da versão Atual, e
esta não é nenhuma delas.

**A linha sai.** Mas **atrás da chave da Parte 10**, porque retira número de
produção — e junto com ela, a tela passa a **listar** os lançamentos afetados, em
vez de simplesmente encolher o total.

**Não confundir com a trava do Prompt S:** aquela impede o lançamento novo; esta
retira o antigo da soma. As duas são necessárias, e a ordem é: trava primeiro.

---

# PARTE 3 — OS REGIMES MISTURADOS

Dentro de `versionInputsByMonth`, três calendários alimentam o mesmo bucket de
competência:

| O que | Coluna de data | Regime |
|---|---|---|
| Despesas | `despesa.competencia` | **competência** ✓ |
| Encargos financeiros | `pagamento.data_pagamento` | **caixa** ✗ |
| Receita da venda | vencimento do recebível | **vencimento** ✗ |
| Conta a receber | `conta_receber.vencimento` | **vencimento** ✗ |
| Reembolso | `reembolso.data` | **liquidação** ✗ |
| Permuta | `data_venda` | **liquidação** ✗ |

**3.1 · Os encargos são desta tarefa.** Multa e juros entram pela data de
pagamento (`pagamentos.ts:140–142`), somando numa competência encargos de
despesas de meses anteriores.

**Decidir e implementar:** o encargo passa à **competência da parcela que o
gerou**, ou permanece na data de pagamento e a linha declara que é caixa? A RG-07
diz que juro e multa são despesa financeira; ela não diz de qual mês.
Recomendação: competência da parcela, com a data de pagamento preservada no
detalhe.

**3.2 · O lado da receita não é desta tarefa.** É o Prompt I, seções 54 a 58.
Enquanto não entrar, **a tela declara o regime de cada bloco** — a linha de
receita diz que está em vencimento, e para de se apresentar como competência.

---

# PARTE 4 — O LANÇAMENTO QUE SOME

**4.1 · Despesa sem categoria é descartada em silêncio.** `page.tsx:129` —
`if (!d.categoriaDre) continue`. Não entra em nenhuma linha, não aparece em
nenhum total, não gera aviso. **A DRE deixa de fechar com o razão, e nada diz
isso.**

**Corrigir:** o total descartado é contado e exibido **fora da cascata**, em
rodapé próprio — "R$ X em N lançamentos sem categoria não entram nesta
demonstração" —, com caminho para a Conferência de lançamentos.

Não inventar categoria, não distribuir o valor, não somar em lugar nenhum da
cascata. **Exibir a ausência é a correção.**

**4.2 · Lançamento sem competência cai em `NO_COMP`.** A chave `" "`
(`page.tsx:30`) entra no acumulado e some de qualquer recorte datado. Somar os
doze meses de um ano e escolher "Acumulado" dão números diferentes, e a diferença
é invisível.

**Corrigir:** mesmo tratamento de 4.1 — contado, exibido fora da cascata,
declarado. E o rodapé aparece nos dois modos, dizendo em qual deles o valor está
sendo somado.

---

# PARTE 5 — CATEGORIA FORA DA LISTA

`cat(k)` é lookup por chave literal (`page.tsx:182`), e `byCat` aceita qualquer
string. Categoria gravada com grafia divergente entra no mapa e **nunca é lida** —
some como no caso 4.1, por outro caminho.

**5.1** Toda chave de `byCat` que não corresponder a uma linha da cascata é
somada no mesmo rodapé da Parte 4, identificada pela grafia encontrada.

**5.2 · A armadilha do singular.** A chave é `"Investimento"`
(`constants.ts:262`), o rótulo da linha é `"Investimentos"` (`page.tsx:206`).
Hoje funciona porque o `waterfall` procura o singular. **Não alterar a string do
banco.** A correção é a linha usar a constante como chave, nunca o rótulo.

**5.3 · Código morto que convida a erro.** `byCat["Receita"]` e
`byCat["Custo Variável"]` são gravados e nunca lidos — a cascata usa `x.receita` e
`x.custoVar`. Remover a gravação ou documentar por que ela existe; do jeito que
está, qualquer um que passe a ler `cat("Custo Variável")` duplica o custo.

---

# PARTE 6 — A CASCATA

**Ver BAC-3. Não implementar sem resposta do cliente.**

## 6.1 · O que o código faz hoje

```ts
const MC = R - CV - DV;
const EBITDA = MC - (CF + DF + RET);
const RF = EBITDA - INV - EMP - DFIN;
```

## 6.2 · Os três pontos a decidir

**Retiradas dentro do EBITDA.** Distribuição de lucro aos sócios não é despesa
operacional. Um EBITDA calculado depois das retiradas não é EBITDA — e é o número
que alguém leva ao banco.

**Empréstimos subtraindo do resultado.** Tomar empréstimo não é receita e
amortizar principal não é despesa: é movimento patrimonial. Só o juro é
resultado, e ele já tem linha própria em Despesas Financeiras.

**Investimentos subtraindo do resultado.** Aquisição de ativo é CAPEX; vira
resultado por depreciação, ao longo da vida útil, não de uma vez na compra.

**A pergunta ao cliente:** a demonstração deve apresentar o **resultado
contábil** — e então as três linhas saem da cascata e vão para um bloco
patrimonial abaixo, informativo —, ou é uma **visão gerencial de sobra de caixa**,
e então os rótulos mudam para dizer isso, deixando de usar "EBITDA" e "Resultado
Final"?

**Enquanto não houver decisão, nada muda na cascata** — mas a tela exibe nota de
rodapé declarando que as três linhas estão incluídas.

## 6.3 · Quando decidida

Entra atrás da mesma chave da Parte 10, com prévia por projeto e competência: o
resultado de hoje, o resultado pela definição nova, e a diferença. **É o
documento que o contador do cliente vai querer ver.**

---

# PARTE 7 — O EIXO DE MESES

`page.tsx:242–252` monta o eixo temporal a partir de `getInccRows`, lendo só o
campo `m`. O comentário chama a tabela INCC de *"âncora dos dados"*.

**Duas consequências:**

- projeto sem tabela INCC cadastrada tem eixo vazio, e o seletor de período fica
  sem anos;
- no mensal com período acumulado, as colunas vêm do eixo — **lançamento cuja
  competência não existe na tabela INCC não tem coluna onde aparecer**, e soma no
  acumulado sem aparecer no mensal.

**Corrigir:** a janela de competências vem da **seção 55 do Prompt I** — os meses
entre `start_date` e `end_date` do projeto —, unida às competências que de fato
têm lançamento. A tabela INCC deixa de governar o eixo.

Projeto sem datas de cadastro exibe estado explícito, conforme 55.3, nunca eixo
vazio sem explicação.

---

# PARTE 8 — A REGRA SAI DA PÁGINA

`versionInputsByMonth`, `waterfall`, `aggregateInputs`, `projectInputs`,
`versionInputs`, `enumMonths` e `monthIndex` são funções locais do `page.tsx`,
não exportadas.

**A regra contábil central do sistema está fora do alcance de teste, e não pode
ser reusada.**

**8.1** Extrair para módulo próprio — `src/lib/dre.ts` ou equivalente —, com
testes, **sem alterar nenhum resultado**. A extração é passo isolado: mesmo
número antes e depois, conferido projeto a projeto.

**8.2** É **pré-condição da Parte 7 do Prompt AA** — o relatório customizado
precisa das mesmas métricas, e duplicá-las criaria a sexta definição de receita do
sistema.

**8.3** A consulta inline de `version` (`page.tsx:88–103`) sai junto: é
substituída por `getVersionsDoProjeto`, conforme 1.1. Com isso o N+1 do modo
"Empresa toda" — uma consulta por projeto — vira uma consulta por projeto **com
tenant no `where`**, e a resolução de cenário passa a ser feita em memória sobre
o conjunto já carregado.

---

# PARTE 9 — AUSÊNCIA, ZERO E SINAL

**9.1** Toda célula é `brl0(v)` (`page.tsx:460`), sem condicional. Linha sem
nenhum lançamento e linha cujo somatório dá zero exibem o mesmo `R$ 0`.

**Corrigir:** célula sem nenhum lançamento exibe estado próprio; zero calculado
exibe `R$ 0`. A diferença é `undefined` × `0`, e ela precisa sobreviver até a
renderização — hoje `emptyInputs()` já apaga a distinção na origem.

**9.2** `brl0` chama `clampZero`, e um valor de `−0,40` vira `R$ 0` —
indistinguível de zero real. Verificar o que `clampZero` faz com negativos
pequenos e reportar; **não alterar a função**, que é usada em todo o sistema.

**9.3** A cor distingue sinal, não ausência (`page.tsx:453–457`). Mantida.

---

# PARTE 10 — ENTRADA CONTROLADA

**10.1** As Partes **2** e **6** mudam número exibido em produção. Entram atrás de
**uma chave por tenant**, desligada, preservando o comportamento atual.

**Uma chave para o conjunto da DRE.** Independente das chaves das seções 54, 56,
57 e 58 do Prompt I, da chave do Prompt H e da chave do Prompt AA.

**10.2** As Partes **1**, **3.2**, **4**, **5**, **7**, **8** e **9** **não mudam
totais** — mudam o que a tela mostra, declara ou permite combinar. Vão sem chave.

**10.3** Antes de ligar, prévia por projeto e competência: o resultado exibido
hoje, o resultado pela definição nova, a diferença, e a lista dos lançamentos que
deixam de somar na receita.

---

# 11. PRESERVAÇÃO DE DADOS

Nenhum `INSERT`, `UPDATE` ou `DELETE`. Nenhuma migração sobre dado de negócio.
Nenhuma despesa reclassificada, nenhuma versão criada ou alterada, nenhum
`version.label` reescrito.

Se a chave da Parte 10 exigir coluna, ela é aditiva, com `IF NOT EXISTS` e `down`.

---

# 12. NÃO REGRESSÃO

**12.1** Com a chave desligada, **a DRE devolve exatamente os mesmos totais de
hoje**, para todos os projetos, todas as versões e todos os modos de período. É a
condição de aceite principal.

**12.2** A extração da Parte 8 não altera nenhum número. Conferir antes e depois,
projeto a projeto.

**12.3** Nenhuma função compartilhada é alterada. `getMonthlyRevenue`,
`getExpenseRows`, `getDespesas`, `expandUnitReceivables` e
`permutaRevenueByMonth` **não são tocadas por este prompt** — mudanças nelas
pertencem ao Prompt I, seção 58.

**12.4** Fluxo de Caixa, Dashboard, Medição, Resumo Executivo e Contabilidade
continuam com os mesmos números.

---

# 13. TESTES

**A comparação**

1. Selecionar um projeto que **não é o ativo da sessão** e comparar versões dele.
2. As versões oferecidas são as do projeto selecionado, não as do cookie.
3. `?vs=` com id de versão de outro projeto ou de outro tenant é descartado.
4. Empresa toda comparando três cenários: cada coluna soma, por projeto, a versão
   daquele `kind` **daquele** projeto.
5. Projeto sem o cenário escolhido **não entra com zero** — a cobertura é
   declarada no cabeçalho.
6. Pedir Orçamento num projeto que só tem Atual devolve estado explícito, **não os
   números da Atual**.
7. Comparar mais de três versões funciona, com rolagem horizontal e coluna fixa.
8. A seleção padrão é Atual + orçamento e previsão mais recentes; cópia não entra.
9. Visão mensal com três versões exibe **as três**, em cabeçalho de dois níveis —
   nenhuma é descartada.
10. O período aplicado é idêntico em todas as colunas, nos quatro modos.
11. A coluna "% Receita" aparece em todas as colunas, cada uma sobre a própria
    receita.
12. O cabeçalho declara projetos, cenários, período e cobertura.

**O conteúdo**

13. Lançamento sem categoria aparece no rodapé, com valor e contagem, fora da
    cascata.
14. Lançamento sem competência idem, declarando em qual modo ele está sendo
    somado.
15. Categoria com grafia fora da lista aparece no rodapé, com a grafia encontrada.
16. Somar os doze meses de um ano e escolher "Acumulado" dão o mesmo número, ou a
    diferença está declarada no rodapé.
17. Encargo financeiro aparece na competência decidida em 3.1, e a tela declara
    qual regime a linha usa.
18. Projeto sem tabela INCC exibe o eixo a partir da janela do projeto.
19. Competência com lançamento e sem linha de INCC aparece no mensal.
20. Célula sem lançamento e célula com zero calculado são distinguíveis.

**Gerais**

21. Chave desligada: todos os totais iguais aos de hoje, em todos os modos.
22. Extração da Parte 8: mesmos números antes e depois.
23. Nenhuma escrita no banco, em nenhum caminho.
24. Sem permissão, a rota não é acessível — o enforcement central continua
    valendo.
25. **Antes e depois:** contagem e soma de `despesa`, `conta_receber`,
    `reembolso`, `permuta`, `unit` e `version`. Nenhuma diferença.

---

# 14. RELATÓRIO FINAL OBRIGATÓRIO

1. Resultado das quatro consultas do **BAC-1**, com a origem confirmada da
   receita exibida e o volume de lançamentos descartados.
2. Resultado do **BAC-2** e o teto de colunas adotado.
3. Decisão do **BAC-3** sobre a cascata, e o que mudou.
4. Decisão do **BAC-4** e o volume da quinta origem.
5. Como as versões passaram a ser resolvidas por projeto, e a confirmação de que
   `ctx.versions` não é mais fonte nesta tela.
6. Como o modo Empresa toda resolve a versão de cada projeto, e como a cobertura é
   declarada.
7. Confirmação de que os quatro fallbacks de `versionIdOfKind` saíram.
8. Como a matriz de mês × versão foi montada, e o que acontece acima do teto.
9. Decisão de 3.1 sobre a competência dos encargos.
10. O rodapé de lançamentos descartados: o que entra nele e como é calculado.
11. Como a janela de competências passou a ser resolvida, e o que sobrou de uso da
    tabela INCC.
12. Os arquivos criados pela extração da Parte 8, e a comparação antes/depois.
13. Como a chave da Parte 10 funciona, onde fica, e a prévia apresentada.
14. Confirmação de que nenhuma função compartilhada foi alterada.
15. Confirmação de que nenhum dado foi alterado.
16. Migrações criadas, com `down`.
17. Limitações encontradas.


<a id="prompt-ad"></a>


========================================================================


### ▸ 36 de 42 · PROMPT AD — Fluxo de Caixa

**Bloco 6 · Leitura** · Bloqueios: BAD-1 · BAD-2 · BAD-3

Depende de L e do BAD-1.

========================================================================


# PROMPT AD — FLUXO DE CAIXA

Growth Construction · `/fluxocaixa`.

Baseado na coleta `docs/TELA-FLUXOCAIXA.md`. A **Parte 4** é o assistente de IA —
o convite à comparação entre a Atual e cada cenário de planejamento. As demais
partes são as condições para que essa comparação não minta.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/fechamento` | Fechamento de Caixa | **absorvida pelo Caixa** | Prompt L, Parte 9 |

Os três cenários aparecem como **Realizado** (kind `atual`), **Orçamento**
(`budget`) e **Previsão Atualizada** (`forecast`). **Nenhum `kind` muda no
banco.**

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** A tela é somente
leitura e continua sendo. Nenhum `cash_entry`, `despesa`, `despesa_parcela`,
`conta_receber`, `bank_account.saldo` ou versão é criado, alterado ou removido.
Se alguma correção exigir tocar em registro: **PARE**, não execute, e reporte.

**2 · Nada vindo de mockup entra no código.**

**3 · O assistente não grava nada, em nenhum caminho.**

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

Esta é a tela mais bem construída das revisadas. Cinco coisas são referência, e
mexer nelas é regressão:

**1 · A RG-01 está implementada, não mencionada.** `flowMaps` monta o previsto
por vencimento; `flowMapsRealizado` monta o realizado por liquidação; as duas
convivem sem uma corrigir a outra, e o comentário registra isso
(`fluxo-caixa.ts:98–109`).

**2 · `vencMonth` vive em módulo puro** (`calc/mes-caixa.ts`), separada de
propósito para ser testável. É o padrão que o **Prompt AC** pede para a DRE.

**3 · Pago por terceiro não gera saída na competência** — a saída é a restituição
prevista, pelo saldo pendente. RG-04 aplicada corretamente, com `Set` de ids
impedindo dupla contagem.

**4 · Despesa cancelada não gera saída**, com o histórico do defeito anterior no
comentário.

**5 · Permuta entra por `permutaCashByMonth`, com escambo excluído** — porque
escambo não gera entrada financeira. A distinção caixa × receita está certa
aqui.

Some-se: `getVersionsDoProjeto` tem `tenant_id` no `where`; os três `ORDER BY`
sobre coluna `text` não afetam resultado, porque a ordenação é refeita por
`sortMonthKey`; e `fluxocaixa` está em `SCREENS` e em `CONTADOR_VE`, com
enforcement central no layout.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — o fato vem da Atual | nada | **pré-condição da Parte 4** |
| **2** — saldo e acumulado | **BAD-1** | decisão do cliente |
| **3** — o que some da tela | nada | par com a Parte 1 |
| **4** — assistente de IA | **Partes 1 e 3**, e Prompt E Etapa 1 | é o pedido |
| **5** — desvio na tela | Parte 1 | o assistente não pode ser a única forma de ver o desvio |

**A Parte 4 não vai antes da 1.** Um assistente que convida a comparar lendo
`cash_entry` de uma versão de planejamento produz uma frase errada com voz de
autoridade — pior que a tabela errada, porque a tabela o usuário confere.

---

# BLOQUEIOS

## BAD-1 · De onde vem o ponto de partida do saldo acumulado

Hoje `saldoInicial = saldoDisponivel(getBankAccounts(ctx.tenant.id))` — a soma de
`bank_account.saldo` **do tenant inteiro, sem filtro de projeto**
(`page.tsx:117`, `:130`). É o mesmo número para qualquer obra ou versão
selecionada.

Numa obra, isso produz um acumulado que começa acima das entradas da própria
obra — a diferença é o caixa da empresa, não da obra [valores de produção removidos].

**Escolher uma:**

1. **O partida vem da Atual do projeto** — soma de `cash_entry` da Atual anterior
   ao primeiro mês exibido. O acumulado passa a ser coerente com o resto da
   coluna, e cada obra tem o seu. Custo: não bate com o extrato, porque a obra
   não tem conta própria.
2. **O partida continua sendo o saldo das contas, só no modo Empresa toda.** Com
   uma obra selecionada, o acumulado parte de zero e a tela declara que exibe o
   fluxo da obra, não o caixa da empresa.

Recomendação: a **1** para projeto único e a **2** para Empresa toda, com a
origem declarada nos dois casos. Quando o **Prompt L** entregar o saldo
conciliado, ele substitui a fonte sem mudar a regra.

**Diagnóstico antes de decidir:**

```sql
-- O saldo inicial de hoje, e do que ele é feito.
SELECT nome, tipo, agencia, cc, saldo, saldo_source
  FROM bank_account
 ORDER BY tipo, nome;
```

**Atenção:** `saldoDisponivel` exclui apenas o tipo `"Terceiros"`. Se
`SOCIO A`, `SOCIO B` e `CHEQUE TERCEIRO` — as três contas que o
**Prompt X** manda limpar — forem de outro tipo, **elas entram no saldo inicial
desta tela**. O BX-2 daquele prompt ganha um consumidor que não estava mapeado, e
a limpeza muda o acumulado de todas as obras.

## BAD-2 · Quanto do previsto já aconteceu

`flowMaps` não filtra status de pagamento — parcela liquidada continua no
previsto, no mês do vencimento, para sempre. É deliberado e documentado, e é o
que a Parte 3.2 revisita.

```sql
-- Previsto de meses já vencidos que já foi liquidado.
SELECT to_char(now(),'MM/YYYY') AS hoje,
       p.status, COUNT(*) AS parcelas, SUM(p.valor_original) AS total
  FROM despesa_parcela p
  JOIN despesa d ON d.id = p.despesa_id
  JOIN version v ON v.id = d.version_id
 WHERE v.kind = 'atual' AND d.cancelado = false
 GROUP BY 1,2;
```

## BAD-3 · Qual comparação o assistente oferece primeiro

A Parte 4 descreve duas, e elas respondem perguntas diferentes:

| | O que compara | Responde |
|---|---|---|
| **Caixa × plano** | realizado da Atual × previsto do cenário | o que de fato saiu contra o que foi planejado |
| **Previsão × plano** | previsto da Atual × previsto do cenário | como a expectativa de hoje difere da que foi aprovada |

**As duas são válidas e não podem ser confundidas.** Confirmar qual abre por
padrão. Recomendação: **caixa × plano**, porque é a pergunta que um fluxo de
caixa responde.

---

# PARTE 1 — O FATO VEM DA ATUAL

**A regra, da seção 2 do Prompt I:** fato real mora na versão Atual.
`cash_entry`, `despesa`, `despesa_parcela`, `unit`, `conta_receber`, `permuta`,
`reembolso` e `despesa_terceiro` são fato. Planejamento tem uma tabela só:
`budget_line`.

## 1.1 · O realizado é sempre da Atual

Hoje: `flowMapsRealizado(compareVersions[0].id)` (`page.tsx:122`) — **a primeira
versão selecionada**.

Marcar Orçamento antes da Atual faz as colunas "Realizado ↑" e "Realizado ↓"
lerem `cash_entry` **da versão de orçamento**. Não é hipótese: `duplicateVersion`
inseria `cash_entry` na versão de destino (BI-3 do Prompt I), então versões
copiadas têm caixa.

**Corrigir:** o realizado vem da versão `kind = "atual"` do projeto, qualquer que
seja a seleção, e o cabeçalho da coluna declara isso.

## 1.2 · A permuta sai da coluna de planejamento

Hoje `permutaCashByMonth` é somada **fora** do `if (isBudgetVersion)`
(`fluxo-caixa.ts:47–51`), com `getPermutas(version.id)`. A coluna de Orçamento
recebe `budget_line` **mais** fatos de permuta.

**Corrigir:** no ramo de planejamento, as entradas vêm só de `budget_line`. A
permuta é fato e pertence à Atual.

## 1.3 · Sem Atual, estado explícito

Hoje: `versoes.find(v => v.kind === "atual") ?? versoes[0] ?? ctx.version`
(`page.tsx:50`). Projeto sem Atual elege a primeira versão da lista e a trata
como realidade.

**Corrigir:** sem Atual, a tela declara a ausência e não monta as colunas de
realizado nem o acumulado. Nunca substituir — seção 8 do Prompt I.

**E os outros dois fallbacks saem junto:** `ctx.project ?? ctx.projects[0]`
(`page.tsx:41`) e `versoesProj.length > 0 ? versoesProj : ctx.versions`
(`page.tsx:45`) — este último faz um projeto sem versões exibir as de outro.

## 1.4 · O realizado não olha a conciliação

`getCash(versionId)` não filtra a coluna `rec` (`queries.ts:1059–1067`). O
realizado conta movimento importado e ainda não conferido.

**Decidir e aplicar o mesmo critério aqui, no Caixa e no Dashboard**, declarando
qual é. A Parte 7 do **Prompt L** exige o conciliado.

---

# PARTE 2 — SALDO E ACUMULADO

**Ver BAD-1.**

**2.1 · O acumulado passa a considerar o realizado.** Hoje ele é previsto puro
(`page.tsx:170–176`): num mês fechado o previsto foi X, o realizado foi menor, e o
acumulado desceu X. **A coluna mais à direita da tela é a projeção que teria
acontecido se nada tivesse acontecido.**

**A regra:** mês fechado entra no acumulado pelo **realizado**; mês futuro, pelo
**previsto**. A fronteira é declarada na tela — uma linha divide o que já
aconteceu do que é projeção.

**2.2 · Os dois saldos ganham nomes distintos.** O card "Saldo do período" é
`totE − totS`, **sem** o saldo inicial; a coluna "Saldo acumulado" **inclui**. Na
tela, os dois aparecem com valores diferentes, sem explicação. Renomear e declarar a base
de cada um.

---

# PARTE 3 — O QUE SOME DA TELA

**3.1 · O mês que só tem realizado não existe.** O eixo é a união das
competências do INCC com os meses **do previsto** (`page.tsx:175–180`) — as
chaves de `realizado` não entram.

Um pagamento ou recebimento num mês sem nenhuma previsão **não tem linha onde
aparecer**. Some da tela inteira, sem virar divergência e sem virar zero.

**Corrigir:** o eixo passa a incluir as competências do realizado. E a Parte 7 do
**Prompt AC** vale aqui também: a janela vem do projeto, não da tabela INCC.

**3.2 · O previsto de mês passado continua previsto.** `flowMaps` não filtra
`"Pago"` — a parcela liquidada em julho segue sendo previsão de julho. O card
"Total entradas" mistura previsão de meses vencidos com meses futuros.

**Corrigir:** mês fechado exibe o realizado como número principal e o previsto
como referência, não os dois com o mesmo peso. Ver BAD-2 para o volume.

**3.3 · Lançamento de caixa sem data é descartado**, e o comentário admite. A
soma das colunas de realizado não fecha com `cash_entry`. **Corrigir:** contado e
exibido fora da tabela, como o rodapé da Parte 4 do Prompt AC.

**3.4 · Mês vazio exibe `R$ 0` no "Saldo do mês"** e `—` nas demais células. O
teste `> 0` existe em quatro células e falta na que soma.

**3.5 · O previsto de entradas não desconta o recebido.** `conta_receber` é lida
filtrando só `cancelado = false`; `valor_recebido` e `status` não são lidos. O
recebível liquidado aparece no previsto **e** no realizado. É o mesmo achado da
DRE — a correção pertence à seção 58 do **Prompt I**, e aqui é registrada como
herdada.

---

# PARTE 4 — O ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.** Painel lateral de 300px,
recolhível, com a preferência persistida por usuário.

## 4.1 · O que ele oferece

Duas comparações, e elas são o motivo do painel existir:

**Realizado × Orçamento** — o que saiu e entrou de fato, contra o que foi
aprovado.

**Realizado × Previsão Atualizada** — o mesmo, contra a expectativa mais
recente.

E, conforme o **BAD-3**, a variante que compara **previsto da Atual × previsto do
cenário** — a expectativa de hoje contra a que foi aprovada. **As duas leituras
nunca aparecem sob o mesmo rótulo.**

## 4.2 · A regra que sustenta tudo: o assistente não calcula

**Os números do painel vêm da mesma função que monta a tabela.** O assistente lê
`flowMaps` e `flowMapsRealizado` e o cálculo de desvio da Parte 5 — ele não soma,
não projeta, não estima e não deriva número que a tela não mostre.

**Motivo:** um painel que calcula por conta própria produz, mais cedo ou mais
tarde, um número diferente do da tabela ao lado. Quando isso acontece, o usuário
não tem como saber qual está certo — e a tabela é auditável, o painel não.

Se o assistente precisar de um número que a tela não tem, **a tela passa a tê-lo
primeiro**. É o que a Parte 5 faz com o desvio.

## 4.3 · O convite

O painel abre com uma frase que já traz o achado, não com um menu:

> *"O caixa realizado de 2026 está 7,8% abaixo do orçado. A diferença se
> concentra em 07 e 08/2026."*

E, abaixo, as ações. **A frase é gerada a partir do desvio já calculado pela
tela** — ver 4.2.

**Quando não há o que dizer, o painel diz isso** em vez de inventar destaque:
projeto sem Orçamento, período sem movimento, cenário sem dado.

## 4.4 · As ações

| Ação | O que faz |
|---|---|
| **Comparar com o Orçamento** | mês a mês, realizado contra orçado, com os maiores desvios em cima |
| **Comparar com a Previsão Atualizada** | o mesmo, contra a previsão |
| **Onde o caixa fugiu do plano** | os meses de maior desvio, com as contas que puxaram |
| **O que já aconteceu e continua previsto** | as parcelas liquidadas que seguem no previsto — o achado 3.2, como leitura contínua |
| **Movimento sem previsão** | entradas e saídas em meses que o plano não previa — o achado 3.1 |

As duas últimas existem porque são invisíveis na tabela: a primeira mostra o
número inflado, a segunda mostra o que está fora dela.

## 4.5 · O que o assistente declara sempre

**4.5.1 · O regime dos dois lados.** Realizado é caixa, por data de liquidação.
Orçamento e Previsão são planejamento, por competência. **A comparação atravessa
regimes, e a frase diz isso** — sem isso, o painel afirma uma equivalência que
não existe.

**4.5.2 · A versão de cada lado**, pelo nome do cenário e pelo rótulo que o
usuário deu.

**4.5.3 · A cobertura.** No modo Empresa toda, de quantos projetos cada lado é
feito. Projeto sem o cenário **não entra com zero** — entra na contagem de
ausência, conforme a seção 36 do Prompt I.

**4.5.4 · O recorte de período**, e se ele veio do intervalo de datas ou do ano.

## 4.6 · O que o assistente nunca faz

- **Nunca afirma causa.** "O custo subiu porque a obra atrasou" não é leitura do
  dado. Ele aponta onde e quanto; o porquê é do usuário.
- **Nunca compara com versão ausente.** Sem Orçamento no projeto, a ação não
  aparece — ou aparece desabilitada, com o motivo escrito. Comparar com zero
  seria afirmar que o orçado é zero.
- **Nunca usa `cash_entry` que não seja da Atual** — Parte 1.1.
- **Nunca apresenta previsto de mês vencido como previsão** sem dizer que já
  venceu — Parte 3.2.
- **Nunca projeta saldo futuro** que a tela não calcule.
- **Nunca grava**, por nenhum caminho, nem com confirmação.

## 4.7 · Isolamento e permissão

**4.7.1** O contexto — projeto, versões, período — vem do servidor, validado
contra o tenant do usuário. Nunca de id enviado pelo cliente sem verificação.
Prompt E, 2.2.3.

**4.7.2** Toda consulta passa pelo filtro de tenant explícito. Não existe RLS.

**4.7.3** O painel respeita a permissão da tela: quem não vê `fluxocaixa` não
acessa o painel dela. E o perfil **contador**, que enxerga esta tela em
`CONTADOR_VE`, vê o painel com as mesmas restrições de leitura.

## 4.8 · Interface

Segue o `PADRAO-VISUAL.md`, seção 7. Selo **"Somente leitura"** ao lado do
título, e o rodapé declarando que nada é alterado. O selo não pode coexistir com
nenhuma função de escrita.

Abaixo de 1180px o painel desce e perde o `sticky`. O botão do chat permanece
flutuante.

---

# PARTE 5 — O DESVIO ENTRA NA TELA

Hoje não existe nenhum cálculo de desvio entre previsto e realizado
(`page.tsx`, busca por `desvio`, `diferenca`, `variacao`: zero ocorrências). O
único `dif` da tela compara **versões**, não regimes.

**Isso é pré-condição da Parte 4**, pela regra de 4.2: o assistente lê o desvio,
não o inventa.

**5.1** Uma coluna de desvio por mês — realizado menos previsto, em valor e em
percentual —, com o sinal preservado. Realizado maior que previsto é informação,
não erro.

**5.2** Uma linha de total do desvio no período.

**5.3** O desvio só existe onde os dois lados existem. Mês com previsto e sem
realizado, ou o contrário, exibe estado próprio — não o valor cheio do lado que
existe.

---

# 6. FORA DE ESCOPO

| Item | Dono |
|---|---|
| `conta_receber` pelo valor cheio; reembolso sem filtro de estado | **Prompt I**, seção 58 |
| A linha `Banco` inteira num mês só | **Prompt I**, seções 57 e 58 |
| Saldo conciliado e cadeia de saldo | **Prompt L** |
| Limpeza das contas que não são conta bancária | **Prompt X** — mas ver BAD-1 |
| Saldo da parcela em aberto em Contas a Pagar | **Prompt R** |
| Descontinuar `duplicateVersion` | **Prompt I**, BI-3 |
| Remover o cookie de projeto ativo | **Prompt A** |
| Chat suspenso e escrita assistida | **Prompt E**, Etapas 2 e 3 |

---

# 7. PRESERVAÇÃO DE DADOS

Nenhum `INSERT`, `UPDATE`, `DELETE` ou migração sobre dado de negócio. Nenhum
saldo recalculado, nenhuma versão alterada, nenhum `cash_entry` tocado.

Se for necessário registrar uso do assistente, é tabela nova, aditiva, com
`IF NOT EXISTS` e `down`, sem vínculo que altere registro existente.

---

# 8. NÃO REGRESSÃO

**8.1** As Partes 1, 2 e 3 mudam número exibido. Entram atrás de **uma chave por
tenant**, desligada, preservando o comportamento atual. Com a chave desligada,
**a tela devolve exatamente os mesmos números de hoje**.

**8.2** `flowMaps` e `flowMapsRealizado` continuam separadas, e nenhuma corrige a
outra — o desenho da RG-01 é preservado.

**8.3** `getMonthlyRevenue`, `expandUnitReceivables` e `getParcelasByVersion`
**não são alteradas por este prompt**.

**8.4** Caixa, Dashboard, DRE e Contas a Pagar continuam com os mesmos números.

---

# 9. TESTES

**A origem do fato**

1. Marcar Orçamento antes da Atual: as colunas de realizado continuam vindo da
   **Atual**, e o cabeçalho diz isso.
2. Projeto com versão copiada que tenha `cash_entry`: nenhum centavo dela aparece
   no realizado.
3. Coluna de Orçamento não recebe permuta — só `budget_line`.
4. Projeto sem Atual: estado explícito, sem colunas de realizado e sem acumulado.
5. Projeto sem versões não exibe as versões de outro projeto.

**O conteúdo**

6. Mês com realizado e sem previsto **aparece** na tabela.
7. Lançamento de caixa sem data é contado e exibido fora da tabela.
8. Mês vazio não exibe `R$ 0` no Saldo do mês.
9. Mês fechado entra no acumulado pelo realizado; mês futuro, pelo previsto; a
   fronteira está declarada.
10. Os dois saldos têm nomes distintos e declaram a base.

**O desvio**

11. A coluna de desvio existe, com sinal preservado.
12. Mês com um lado só exibe estado próprio, não o valor cheio do lado existente.

**O assistente**

13. O painel não exibe nenhum número que não esteja na tabela.
14. Comparar com o Orçamento e comparar com a Previsão produzem resultados
    diferentes, e cada um nomeia a versão usada.
15. A frase de abertura declara o regime dos dois lados.
16. Projeto sem Orçamento: a ação não aparece, ou aparece com o motivo — e em
    nenhum caso compara com zero.
17. No modo Empresa toda, a cobertura de cada lado é declarada.
18. O painel de um projeto nunca exibe dado de outro.
19. Usuário sem permissão de ver a tela não acessa o painel.
20. Usuário com dois tenants não obtém, por nenhum caminho, dado do outro.
21. **Nenhuma gravação acontece** — verificar por contagem de registros antes e
    depois de uma sessão de uso.
22. O selo "Somente leitura" está presente e não coexiste com nenhuma função de
    escrita.

**Gerais**

23. Chave desligada: todos os números iguais aos de hoje.
24. Nenhuma escrita no banco, em nenhum caminho.
25. **Antes e depois:** contagem e soma de `cash_entry`, `despesa`,
    `despesa_parcela`, `conta_receber` e `bank_account`. Nenhuma diferença.

---

# 10. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisão de **BAD-1**, e de onde passou a vir o ponto de partida.
2. Resultado do diagnóstico de `bank_account` — e se alguma das três contas do
   **Prompt X** entrava no saldo inicial.
3. Resultado de **BAD-2** — quanto do previsto já foi liquidado.
4. Decisão de **BAD-3** — qual comparação abre por padrão.
5. Como o realizado passou a vir sempre da Atual, e como o cabeçalho declara.
6. Confirmação de que a coluna de planejamento não recebe mais permuta.
7. Confirmação de que os três fallbacks saíram.
8. Como o eixo passou a incluir as competências do realizado.
9. Como o acumulado trata mês fechado e mês futuro, e onde a fronteira aparece.
10. Como o desvio foi calculado e onde ele aparece na tela.
11. **A lista das funções que o assistente lê**, com a confirmação de que ele não
    calcula nada por conta própria.
12. Quais consultas o assistente faz, com o filtro de tenant de cada uma.
13. Quais campos são enviados ao modelo e quais são mascarados — BE-2 do
    Prompt E.
14. Confirmação de que nenhuma gravação é possível.
15. Como a chave da seção 8.1 funciona e onde fica.
16. Comparação antes/depois dos números da tela, com a chave desligada.
17. Migrações criadas, com `down`.
18. Limitações encontradas.


<a id="prompt-aa"></a>


========================================================================


### ▸ 37 de 42 · PROMPT AA — Dashboard

**Bloco 6 · Leitura** · Bloqueios: BAA-1 · BAA-2 · BAA-3 · BAA-4 · BAA-5 · BAA-6

⟨reescrito⟩ Depende de V (BAA-1) e do Bloco 2. A Parte 7 é o relatório customizado.

========================================================================


# PROMPT AA — DASHBOARD E RELATÓRIOS CUSTOMIZADOS

Growth Construction · `/dashboard`.

**Revisão 2.** Incorpora a auditoria de fórmulas e origens feita sobre o commit
`45f4ce3` (`docs/AUDITORIA-DASHBOARD-FORMULAS.md` e seu apêndice), o inventário
de schema (`CONTEXTO-REVISAO.md`), e acrescenta a Parte 7 — relatórios e painéis
montados pelo usuário.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/ponto` | Ponto da Obra | **extinta** | Prompt Z, Parte 1 |
| `/fechamento` | Fechamento de Caixa | **absorvida pelo Caixa** | Prompt L, Parte 9 |
| `/acerto` | Acerto Contábil | **aba de Despesas, só leitura** | Prompt S |

**Nada de nome interno muda.** Em caso de dúvida entre nome e rota, a rota manda.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Versões, nomes de
versão, unidades, despesas, lançamentos de caixa e orçamentos permanecem como
estão. **Nenhuma versão é apagada, renomeada ou ocultada do banco por esta
tarefa.** Se alguma correção exigir tocar em registro existente: **PARE**, não
execute, e informe qual registro, por quê, quantos e qual a alternativa não
destrutiva.

**2 · Nada vindo de mockup entra no código.** Valores, percentuais, nomes de
obra, de cliente e de proprietário dos mockups são ilustração. Nunca viram seed,
fixture, valor padrão ou dado de teste.

---

# O QUE ESTA TELA É

O Dashboard tem **28 cartões**: quatro KPIs no topo, oito nos painéis "Status
atual" e "Margem e produtividade", e dezesseis no painel "Indicadores da obra".
É **somente leitura** — nenhuma Server Action grava a partir dela.

A auditoria de fórmulas mostrou que o problema não é só de escopo de seletor,
como a revisão 1 supunha. **Quatro cartões produzem número materialmente errado
por contaminação entre versões ou por mistura de regimes**, e dois exibem valor
de cadastro como se fosse realização.

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

Seção decisiva. O risco desta tarefa é reescrever o que funciona.

**1 · O Dashboard não usa `ctx.version` em ponto nenhum.** Nenhuma das sete
funções auditadas, nem a consulta inline da página, lê a versão ativa da sessão.
A versão vem de `getVersionsDoProjeto(tenantId, projectId)` e do `searchParams`.
**Não "corrigir" isso** — já está correto, e é o que o Prompt A pede.

**2 · As três funções dos painéis inferiores são exclusivas desta tela.**
`getStatusProjeto`, `getIndicadoresObra` e `getIndicadoresObraConsolidado` não
são chamadas por nenhuma outra página, action ou script. **Mudar a assinatura
delas não regride nada.** A nota da revisão 1 que mandava reportar os outros
consumidores está resolvida: não há.

**3 · Nenhum percentual produz `NaN` ou `Infinity`.** `razao`
(`queries.ts:2170`) trata o denominador, e as demais divisões têm guard próprio
— `medicao-bdi.ts:42`, `:206`, `queries.ts:2027`, `:2042`, `:2008–2016`. O
comportamento está certo; a duplicação de implementações é dívida registrada na
Parte 8, não defeito a corrigir agora.

**4 · Não há `BETWEEN` nem `ORDER BY` sobre coluna `text` de data no caminho do
Dashboard.** Todo recorte de período é feito em JavaScript. As seis ocorrências
de ordenação lexicográfica em `queries.ts` pertencem a outras telas.

**5 · `dateInRange` e `monthInRange` comparam inteiros**, não strings — `ymd`
converte para `YYYYMMDD` e `ym` para `YYYYMM` (`utils.ts:91–114`). A mecânica
está correta. O defeito de **semântica** dos dois helpers é de outro prompt —
ver Parte 9.

**6 · `brlk` é determinístico de propósito**, para evitar divergência de
formatação entre servidor e navegador (`utils.ts:42–48`). Não substituir por
`Intl` compact.

**7 · A tela é somente leitura, e continua sendo.**

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Pode ir |
|---|---|---|
| **1** — nomes e seletores | nada | imediatamente |
| **2** — escopo dos seletores | Parte 1 | imediatamente |
| **3** — os dezesseis cartões | **BAA-1**, que espelha o BV-1 do Prompt V | só depois da decisão |
| **4** — os quatro KPIs do topo | Prompt R (saldo da parcela), Prompt L (conciliação) | depois |
| **4-A** — os dois gráficos | seções 54, 56 e 57 do Prompt I | depois |
| **4-B** — os oito cartões dos painéis de status | **BAA-3**; independe das chaves | imediatamente |
| **5** — o que herda de outras telas | — | acompanha cada origem |
| **6** — assistente de IA do Dashboard | Prompt E, Etapa 1 | com a Parte 2 |
| **7** — relatórios customizados | **seção 58 do Prompt I** e camada analítica da seção 28 | por último |

**A Parte 4-B é a que mais muda número e a que menos depende dos outros
prompts.** Se houver uma só janela de trabalho, é ela.

---

# BLOQUEIOS — RESPONDER ANTES DE ESCREVER CÓDIGO

## BAA-1 · O destino dos dezesseis cartões

Todo o painel "Indicadores da obra" sai de `getIndicadoresObra`, que lê `servico`
e `medicao_servico` — **as duas tabelas sem nenhuma escrita em todo o
repositório**.

A revisão 1 registrou que os dezesseis ficam em zero. **A auditoria corrigiu
isso: são quatorze em zero ou traço, e dois exibindo número falso** — ver a
seção 3.1.

A decisão é a mesma do **BV-1 do Prompt V**:

1. **Migrar a medição para o modelo por serviço** — os cartões passam a
   funcionar.
2. **Descontinuar** `medicao_servico`, `servico` e `calc/medicao-bdi.ts`, e
   **remover o painel inteiro** desta tela.

**Não deixar como está.** A pergunta que destrava, para o cliente: *vocês têm a
PLS de cada obra, com os serviços aprovados pela Caixa, e o engenheiro mede por
percentual ou por valor?*

**Diagnóstico, somente leitura, antes de decidir:**

```sql
SELECT p.name,
       (SELECT count(*) FROM servico s WHERE s.project_id = p.id) AS servicos,
       (SELECT count(*) FROM medicao_servico m
          JOIN servico s2 ON s2.id = m.servico_id
         WHERE s2.project_id = p.id) AS medicoes,
       p.financiamento_construcao, p.financiamento_terreno,
       p.cub, p.metragem, p.pct_bdi
  FROM project p
 ORDER BY p.name;
```

## BAA-2 · O inventário das versões copiadas

`duplicateVersion` está **descontinuada** — decisão registrada no BI-3 do
**Prompt I**. Sem ela, cópias novas deixam de surgir. As existentes permanecem
no banco e saem apenas do seletor padrão.

**Correção da revisão 1:** a identificação **não é pelo texto do `label`**. A
coluna `version.source_version_id` (FK para `version.id`, `ON DELETE set null`)
registra a origem da cópia no banco.

**Entregar antes de qualquer código, somente leitura:**

```sql
SELECT v.project_id, p.name AS projeto, v.id, v.kind, v.label, v.status,
       v.locked, v.created_at, v.source_version_id,
       (SELECT count(*) FROM despesa      d  WHERE d.version_id  = v.id) AS despesas,
       (SELECT count(*) FROM unit         u  WHERE u.version_id  = v.id) AS unidades,
       (SELECT count(*) FROM cash_entry   c  WHERE c.version_id  = v.id) AS caixa,
       (SELECT count(*) FROM budget_line  b  WHERE b.version_id  = v.id) AS linhas_orcamento
  FROM version v JOIN project p ON p.id = v.project_id
 ORDER BY p.name, v.created_at;
```

**Versão com movimento nunca é candidata a exclusão sem decisão humana, item a
item.** Este bloqueio produz inventário; não produz `DELETE`.

## BAA-3 · Quanto os cartões "Recebido" e "Executado" estão inflados

**Novo nesta revisão.** É a quantificação dos achados 4-B.1 e 4-B.2.

`getStatusProjeto` soma o caixa de **todas** as versões do projeto
(`queries.ts:2139–2141`) e o orçamento de **todas** as versões `budget`
(`:2144–2146`). Antes de corrigir, é preciso saber quanto disso existe:

```sql
-- caixa fora da versão Atual
SELECT p.name, v.kind, v.label, count(*) AS lancamentos, sum(c.valor) AS total
  FROM cash_entry c
  JOIN version v ON v.id = c.version_id
  JOIN project p ON p.id = v.project_id
 WHERE v.kind <> 'atual'
 GROUP BY p.name, v.kind, v.label
 ORDER BY p.name;

-- projetos com mais de uma versão budget
SELECT p.name, count(*) AS versoes_budget,
       sum((SELECT coalesce(sum(b.valor),0) FROM budget_line b
             WHERE b.version_id = v.id AND b.kind = 'despesa')) AS despesa_prevista_somada
  FROM version v JOIN project p ON p.id = v.project_id
 WHERE v.kind = 'budget'
 GROUP BY p.name
HAVING count(*) > 1;
```

**O resultado da primeira consulta é o valor exato que o cartão "Recebido" está
exibindo a mais.** Apresentar ao usuário antes de ligar a correção.

## BAA-4 · O que "Recebido" deve significar

`recebido` é hoje a soma de **qualquer `cash_entry` com valor positivo**
(`queries.ts:2140`): aporte de sócio, transferência entre contas próprias,
liberação de financiamento, estorno de despesa. O cartão exibe o número sob o
rótulo `de R$ X previstos`, onde X é o valor de venda do cadastro.

**Escolher uma:**

1. **Continua sendo toda entrada de caixa**, e o rótulo passa a dizer isso —
   "entradas de caixa", não "recebido".
2. **Passa a ser recebimento de venda**, filtrando por `cash_entry.cat` ou pelo
   vínculo de conciliação com `conta_receber`.

A opção 2 muda número em produção e entra atrás de chave, conforme a Parte 10.

## BAA-5 · A base dos percentuais

`receitaPrevista` é o **valor global do cadastro** — `valor_construcao +
valor_terreno` (`queries.ts:2109–2111`) —, não a soma das unidades vendidas. Com
uma unidade por obra os dois coincidem, que é como o defeito passa despercebido
na base atual.

Ela é o denominador de dois cartões: "% recebido" e "% margem de contribuição".

**Escolher uma:** manter o cadastro e **declarar a origem no cartão**, ou passar
a usar a soma das unidades vendidas. São números diferentes com finalidades
diferentes; nenhum dos dois pode ser acidente.

## BAA-6 · O catálogo de métricas da Parte 7

Antes de qualquer linha de código do relatório customizado: **quais métricas
entram na estreia.**

**Regra fixa, salvo decisão em contrário:** só entram métricas que já existem em
função auditada, com regime e fonte declarados. Métrica nova entra depois, uma a
uma, com a definição escrita.

**Responder:** a camada analítica da seção 28 do Prompt I já existe no código, ou
este trabalho é quem a cria? Se for o segundo caso, a Parte 7 deixa de ser tela e
passa a ser infraestrutura, com alcance sobre DRE, Consolidado e Projeção — e
isso precisa ser decidido explicitamente, não descoberto no meio.

---

# PARTE 1 — NOMES E SELETORES

## 1.1 · Os nomes das versões

| `kind` | Rótulo exibido |
|---|---|
| `atual` | **Atual** |
| `budget` | **Orçamentos** |
| `forecast` | **Previsão Atualizada** |

**Nada de `version.kind` muda no banco.** É rótulo.

`version.label` é texto que o usuário preencheu. **Nenhum é reescrito por esta
tarefa.** A tela exibe a natureza como rótulo principal e o nome digitado como
complemento.

## 1.2 · O padrão de seleção deixa de ser arbitrário

**Correção da revisão 1.** O padrão não é "ordem de retorno da consulta, sem
critério": `getVersionsDoProjeto` ordena por `created_at` **ascendente**
(`queries.ts:2210`), e a página aplica `versoes.slice(0, 3)`
(`page.tsx:111`).

Ou seja, o Dashboard abre exibindo **as três versões mais antigas do projeto** —
e vai ficando mais errado com o tempo, porque toda versão nova entra no fim da
fila.

**O padrão passa a ser:** a versão **Atual**, mais o **Orçamento** e a **Previsão
Atualizada** mais recentes de cada natureza. Nunca cópia, nunca ordem de criação.

**Se o projeto não tiver alguma delas**, a tela exibe o que houver e **declara a
ausência** — não preenche com outra versão. É a seção 36 do **Prompt I**.

## 1.3 · Projeto sem versões não empresta as de outro

`page.tsx:107` faz `versoes = versoesProjeto.length > 0 ? versoesProjeto :
ctx.versions`. `ctx.versions` são as versões do **projeto ativo da sessão**.

Um projeto recém-criado abre o Dashboard exibindo o seletor de outra obra, e
`versionSummary` roda com `projectId` de um projeto e `versionId` de outro.

**Corrigir:** sem versão no projeto selecionado, a tela declara a ausência e não
monta os cartões por versão. Nunca substituir silenciosamente — seção 8 do
**Prompt I**.

## 1.4 · Seleção múltipla de versões por caixa

Caixa de seleção, no padrão do **Prompt R**, seção 5: campo fechado exibindo o
resumo, aberto com a lista e as ações de marcar e limpar.

**As cópias continuam selecionáveis**, identificadas como tal — por
`source_version_id`, não pelo texto do rótulo.

**O limite de três permanece** — é limitação de largura do cartão. Ao tentar a
quarta, a tela **informa**, em vez de descartar em silêncio, que é o que o
`.slice(0, 3)` faz hoje (`page.tsx:110`).

## 1.5 · Seleção múltipla de projetos por caixa

Nenhum marcado significa todos; um marcado, aquele; vários marcados, o conjunto.
E isso vale para a tela inteira — ver 2.2.

## 1.6 · Cabeçalho declara o recorte

No topo, em texto: quantos projetos, quais versões e qual período estão sendo
exibidos. Com 28 cartões e três seletores, o recorte precisa estar escrito.

O subtítulo atual — *"Visão geral do projeto — independente da versão ativa"* —
sai: a tela tem seletor de versão, e a frase sugere que versão não importa.

---

# PARTE 2 — O QUE OS SELETORES NÃO ALCANÇAM

## 2.1 · O problema, medido

| Painel | Segue o seletor de versão? | Segue o de período? | Por quê |
|---|---|---|---|
| 4 KPIs do topo | **sim** | **sim** | recebem `version.id`, `de` e `ate` |
| 8 dos painéis de status | **não** | **não** | `getStatusProjeto(tenantId, projectIds)` |
| 16 da obra | **não** | **não** | `getIndicadoresObra(tenantId, projectId)` |

**Vinte e quatro dos vinte e oito cartões ignoram os seletores de versão e de
período.** O usuário restringe o período, quatro números mudam, vinte e quatro
não, e nada na tela diz isso.

## 2.2 · O modo "todos os projetos" cai no fallback do Prompt A

`page.tsx:100–101`:

```ts
const project = ctx.projects.find(p => p.id === sp.proj) ?? ctx.project ?? ctx.projects[0];
```

Com `?proj=all`, o `find` não casa com nada e a expressão cai em `ctx.project` —
**o projeto do cookie global** (`context.ts:79–80`) — ou em `ctx.projects[0]`.

Resultado: os quatro KPIs do topo e o VGV saem de um projeto arbitrário, enquanto
os vinte e quatro de baixo consolidam. A tela mostra consolidado e individual
lado a lado, sem distinguir.

O comentário logo acima da linha afirma que o projeto "vem do seletor, não do
projeto ativo da sessão". No caminho `all`, vem do cookie.

## 2.3 · A correção

**2.3.1 · Escopo de projeto: os painéis passam a respeitar o seletor.** Mudar a
assinatura de `getStatusProjeto` e `getIndicadoresObra` para receber a lista de
projetos selecionados. **Sem risco de regressão — as três funções são exclusivas
desta tela.**

**2.3.2 · Escopo de período: as duas funções passam a receber `de` e `ate`**, e a
aplicá-los. Onde uma métrica não admitir recorte de período — por não ter coluna
de data, como os indicadores de cadastro —, o cartão **declara** que exibe o
acumulado, em vez de ignorar o filtro em silêncio.

**2.3.3 · Escopo de versão: cada painel declara o próprio recorte.** O painel de
status compara cenários **por desenho** — `despesaPrevista` do Orçamento contra
`executado` da Atual —, e forçá-lo a uma versão só destruiria o indicador. O que
falta é o rótulo: cada cartão diz de qual cenário vem cada componente.

**2.3.4 · O fallback do modo `all` sai.** Com seleção múltipla de projetos (1.5),
`?proj=all` deixa de ser um modo à parte: é o conjunto de todos os projetos, e os
KPIs do topo consolidam como os demais painéis.

---

# PARTE 3 — OS DEZESSEIS CARTÕES

**Ver BAA-1.** Nada aqui se implementa antes daquela decisão.

## 3.1 · Dois cartões exibem número falso, não zero

Correção da revisão 1. Sem medição, `provis` é vazio, `ultimo` é `undefined`, e
`queries.ts:1971–1973` entrega os fallbacks:

```ts
liberacaoAcumulada: ultimo?.liberacaoAcumulada ?? financiamentoTerreno,
saldoFinanciamento: ultimo?.saldoFinanciamento ?? financiamentoConstrucao,
```

- **"Liberação acumulada"** exibe o financiamento do terreno inteiro **como se
  já tivesse sido liberado**, e o hint calcula `X% do financiado` em cima disso.
- **"Saldo de financiamento"** exibe o total da construção.

Nenhum dos dois é protegido por `temMedicao` no componente — diferente dos seis
que exibem `—`. **São os dois únicos cartões do painel que afirmam um fato
financeiro que não aconteceu.**

**Enquanto o BAA-1 não for decidido, os dois fallbacks saem**: sem medição, os
dois cartões exibem estado próprio, como os vizinhos.

## 3.2 · Verde afirmando conformidade que não existe

"Serviços fora dos limites" exibe `0` com `tone="good"`. Sem nenhum serviço
cadastrado, o cartão fica verde declarando que está tudo dentro da faixa.

Sem serviços, o cartão exibe estado próprio — não zero, não verde.

## 3.3 · Se a opção for remover

O painel sai inteiro, e a tela fica com doze cartões. `calc/medicao-bdi.ts` é
descontinuado — **sem apagar tabela**, sem migração, sem `DROP`.

## 3.4 · Se a opção for migrar

Os cartões passam a ter valor e `temMedicao` deixa de ser sempre falso. Nenhuma
outra mudança nesta tela.

## 3.5 · Em qualquer cenário

Enquanto não houver dado, o painel **não exibe zero**. Zero afirma que o BDI é
zero e que a evolução é zero. Estado próprio — "depende do cadastro de serviços"
— com o caminho para onde ele é feito.

---

# PARTE 4 — OS QUATRO KPIs DO TOPO

## 4.1 · Eles mudam de definição conforme a versão

Na Atual, três campos são sobrescritos em `page.tsx:160–171`:

| Campo | Na Atual | Nas demais |
|---|---|---|
| Receita projetada | `realizado + totalReceb` | `Σ getMonthlyRevenue` |
| A receber | `totalReceb` | `max(0, receita − realizado)` |
| A pagar | `totalPagar` | **`0`**, exibido como `"—"` |

**A mesma coluna significa coisas diferentes conforme o cenário**, e as colunas
ficam lado a lado no mesmo cartão, convidando à comparação.

**Corrigir:** ou a definição é única, ou cada coluna declara a sua. O traço em
"A pagar" precisa dizer **por quê** — planejamento não tem conta a pagar,
conforme a seção 10 do Prompt I.

## 4.2 · "A receber" no planejamento não é um recebível

`page.tsx:79` — `Math.max(0, receitaProj − realizado)` subtrai caixa realizado de
receita planejada. Não é recebível: é saldo a realizar. E o `max(0, …)` **esconde
o caso em que o realizado supera o previsto**, que é justamente o que o usuário
precisaria ver.

## 4.3 · "A pagar" não é da versão e não é o saldo

`getContasPagar` não filtra versão — o `innerJoin` com `version` serve só para
alcançar o projeto (`queries.ts:364–365`). O valor injetado em `s.aPagar` é o
mesmo para qualquer versão Atual selecionada, e inclui despesa lançada em versão
de planejamento, se houver.

E o valor é `despesa.valor` **cheio**, não o saldo da parcela em aberto — o
defeito que o **Prompt R** corrige, chegando aqui.

## 4.4 · "Realizado acum." e "Recebido" ignoram a conciliação

`cash_entry` tem a coluna `rec`. Nenhuma das duas consultas a lê —
`queries.ts:2118–2123` e `page.tsx:53`.

A Parte 4-A.3 exige que o gráfico de caixa conte **só o conciliado**. Se o
gráfico for construído assim e os cartões não, **os dois não vão bater**, e a
divergência vai parecer erro do gráfico.

**Decidir e aplicar o mesmo critério nos dois**, declarando qual é.

## 4.5 · VGV existe em versão de planejamento

`page.tsx:76` soma `unit.valor` de qualquer `kind`. Unidade é fato operacional e
só deveria existir na Atual — seção 5 do Prompt I. Ao exibir "VGV total" por
versão, a tela **legitima** as unidades copiadas para dentro de Budget e
Forecast, apresentando-as como cenário.

**Corrigir:** o VGV é lido da versão Atual do projeto, e o cartão declara isso.
Nenhuma unidade é movida, apagada ou reassociada.

## 4.6 · Ausência de dado não é zero

Conforme a seção 31 do **Prompt I**. Hoje os KPIs sempre mostram número, e o
helper `num = (v) => Number(v) || 0` converte `null`, `undefined` e `NaN` em zero
indistintamente — é a raiz mecânica do problema, presente em `getStatusProjeto` e
`getIndicadoresObra`.

Não adianta corrigir cartão a cartão sem tocar nisso.

---

# PARTE 4-A — OS DOIS GRÁFICOS

## 4-A.1 · Eles medem coisas diferentes, e não vão bater

| Gráfico | Regime | Fonte | O que mostra |
|---|---|---|---|
| **Resultado** | **competência** | DRE | quando o fato econômico ocorreu |
| **Caixa** | **caixa** | `cash_entry` | quando o dinheiro entrou ou saiu |

Uma despesa de agosto paga em outubro aparece em agosto no primeiro e em outubro
no segundo. **A divergência é a informação**, não um erro a conciliar.

**Cada gráfico declara o regime no próprio título.**

## 4-A.2 · Gráfico de resultado

**Três linhas:** Receitas · Custos · Despesas, separadas pela categoria DRE:

| Linha | Categorias |
|---|---|
| Receitas | Receita |
| Custos | Custo Variável + Custo Fixo |
| Despesas | Despesa Variável + Despesa Fixa |

**Retiradas, Investimento e Empréstimos ficam fora** das três linhas. Se forem
exibidos, é em linha própria e declarada.

**[BLOQUEIO]** A linha de receita depende das seções **54, 56 e 57 do Prompt I**.
Enquanto elas não entrarem, a receita conta a mesma venda mais de uma vez, e o
gráfico desenharia o erro com autoridade. **Não exibir a linha de receita antes
daquela correção.**

## 4-A.3 · Gráfico de caixa

**Duas linhas:** Entradas · Saídas. E o **saldo acumulado** como terceira, em
eixo próprio ou como área ao fundo.

**Só o conciliado**, conforme a Parte 7 do **Prompt L** — e conforme o que for
decidido em 4.4. O não conciliado aparece, se aparecer, como linha tracejada,
nunca somado em silêncio.

O saldo precisa bater com a cadeia de saldo da tela de Caixa, para o mesmo dia.

## 4-A.4 · O eixo do tempo

**Competências**, não dias. A janela padrão é a do projeto — seção 55 do
**Prompt I**. Com vários projetos, a união das janelas. Respeita o filtro de
período.

## 4-A.5 · Com vários projetos, soma

Uma linha por série, consolidando o que estiver selecionado. **Não** uma linha
por projeto: com cinco obras e três séries seriam quinze linhas.

## 4-A.6 · Com várias versões, uma por vez

O gráfico de resultado mostra **uma versão por vez**, com seletor próprio, padrão
**Atual**. Comparar cenários é função da tela de Previsão Atualizada, que já tem
o comparativo por conta e por competência.

**O gráfico de caixa não tem versão** — `cash_entry` é realizado. *(Ver 4-B.1: a
tabela tem `version_id`, mas caixa em versão de planejamento é contaminação, não
cenário.)*

## 4-A.7 · Sem dado não é zero

Competência sem lançamento exibe **interrupção na linha**, não ponto em zero.

## 4-A.8 · Acumulado como alternativa

Um controle alterna entre **mensal** e **acumulado**. Padrão: mensal.

## 4-A.9 · A cor segue o significado

Receita em verde, custo e despesa em vermelho e âmbar, entrada em verde, saída em
vermelho. **Nunca cor por posição na série.**

---

# PARTE 4-B — OS OITO CARTÕES DOS PAINÉIS DE STATUS

**Parte nova.** É onde estão os três achados de maior gravidade da auditoria, e
onde a correção menos depende de outros prompts.

## 4-B.1 · "Recebido" soma o caixa de todas as versões do projeto

`queries.ts:2139–2141`:

```ts
const recebido = cashRows
  .filter((c) => todosIds.includes(c.versionId) && num(c.valor) > 0)
  .reduce((a, c) => a + num(c.valor), 0);
```

`todosIds` é `versoesProj.map(v => v.id)` — **todas** as versões do projeto, sem
filtro de `kind`.

Pela seção 2 do Prompt I, planejamento não recebe fato real. Mas
`duplicateVersion` **inseria `cash_entry` na versão de destino** (BI-3). Onde
existir versão copiada, o Dashboard soma o caixa dela ao caixa da obra — tantas
vezes quantas cópias existirem.

Contamina "Recebido" e "% recebido". **Não contamina** `receitaPorM2`, que usa
`receitaAtual` e tem filtro de `kind` — duas contas vizinhas, critérios
diferentes.

**Corrigir:** `recebido` lê apenas `cash_entry` da versão `atual` do projeto.
Nenhum lançamento é movido ou apagado; o que muda é o que a leitura soma.

**Entrada controlada** — ver Parte 10. A prévia é a primeira consulta do BAA-3.

## 4-B.2 · "Executado" é dividido pela soma de todos os orçamentos

`queries.ts:2144–2146` — `idsBudget` também é plural.

Projeto com dois Budgets — o original e uma cópia, ou duas revisões — tem o
denominador dobrado, e o "% executado" aparece pela metade, em verde, com o hint
informando `de R$ X no Budget` como se fosse um orçamento só.

**É o achado mais silencioso do conjunto:** o número não é absurdo, é plausível.
Ninguém desconfia de 47% de execução.

**Corrigir:** o denominador é **uma** versão de orçamento, escolhida
explicitamente — a mais recente, ou a selecionada no seletor —, e o cartão
declara qual.

## 4-B.3 · A margem de contribuição soma três regimes

`queries.ts:2169` — `receitaAtual − custoVariavel − despesaVariavel`, onde:

- `receitaAtual` = `Σ getMonthlyRevenue` da Atual, **sem recorte de período** —
  o ciclo inteiro da obra, incluindo parcelas de anos à frente;
- `custoVariavel` e `despesaVariavel` = `Σ despesa.valor` por `categoria_dre`,
  **sem coluna de data nenhuma** — tudo o que já foi lançado, de qualquer
  competência.

Receita projetada do horizonte inteiro menos despesa lançada até hoje. **O
indicador tem tendência de queda embutida que é da aritmética, não da obra.**

E o `pctMargem` (`:2186`) divide por `receitaPrevista`, que é a terceira base.

**Corrigir:** os dois lados da subtração passam a ser da mesma janela de
competências — a do filtro de período, ou a do projeto quando não houver filtro.
E o cartão declara a janela.

## 4-B.4 · Três bases de receita no mesmo painel, sem rótulo

| Nome no código | O que é | Origem | Regime | Cartões |
|---|---|---|---|---|
| `receitaPrevista` | valor global do cadastro | `project` | nenhum | % recebido, % margem, hints |
| `receitaAtual` | `Σ getMonthlyRevenue` da Atual | `unit` + `reembolso` + `conta_receber` | vencimento | Margem, Receita por m² |
| `recebido` | entradas de caixa | `cash_entry` | caixa | Recebido, % recebido |

Três definições incompatíveis, e o "% recebido" divide a terceira pela primeira.

**Cada cartão declara qual base usa.** Ver BAA-4 e BAA-5.

## 4-B.5 · Falha de banco vira zero

`queries.ts:2134` — a consulta de `budget_line` termina em `.catch(() => [])`. Se
ela falhar, `despesaPrevista` fica zero, o "% executado" exibe `—` com tom
`muted`, e **nada na tela nem no log indica que houve erro**. Indisponibilidade
momentânea fica indistinguível de projeto sem orçamento.

**Corrigir:** a falha propaga, ou o cartão exibe estado de erro explícito. Não
silenciar.

---

# PARTE 5 — O QUE HERDA DAS OUTRAS TELAS

**Nenhum destes é defeito do Dashboard.** Mas todos aparecem nele, e é aqui que a
incoerência fica visível lado a lado.

| Origem | O que chega | Corrigido por |
|---|---|---|
| `expandUnitReceivables` × `calcProjectionBySource` | a mesma unidade produz receitas diferentes: flags `usar*`, INCC, linha `Banco` e `statusSub` | **Prompt I, seção 58** |
| `getMonthlyRevenue` | `conta_receber` somada pelo valor cheio, ignorando `valor_recebido` e `status` | **Prompt I, seção 58** |
| `getMonthlyRevenue` | todo reembolso entra na receita, em qualquer estado — `reembolso.status` existe e é descartado por `reembToCalc` | **Prompt I, seções 56 e 58** |
| `getMonthlyRevenue` | receita da venda contada em duplicidade | **Prompt I, seções 54, 56 e 57** |
| `INCC_FROM_INSTALLMENT` | declarada duas vezes, sem `export`, com aplicações diferentes | **Prompt I, seção 58** e **Prompt N, BN-2** |
| `dateInRange` × `monthInRange` | o mesmo filtro significa dias para caixa e mês inteiro para receita | **prompt próprio dos helpers** |
| `ymd` / `parseDate` | data inválida é incluída sem filtro e excluída com filtro | **prompt próprio dos helpers** |
| `getContasPagar` | pendente pelo valor cheio da despesa parcelada | **Prompt R** |
| `cash_entry` | saldos e conciliação | **Prompt L** |
| `medicao_servico` | evolução física que nunca existe | **Prompt V, BV-1** |

**Reportar, para cada um, o número exibido antes e depois** de a correção
correspondente entrar. É a forma de saber que ela chegou até aqui.

---

# PARTE 6 — ASSISTENTE DE IA DO DASHBOARD

Segue o **Prompt E**. **Somente leitura** — o Dashboard não grava nada, e o
assistente também não.

## 6.1 · Ações do painel

- **Explicar o indicador** — de onde vem cada número, qual cenário, qual regime,
  qual janela. É o que a tela mais precisa: 28 cartões sem origem declarada.
- **O que mudou desde a última visita** — variação dos principais indicadores.
- **Divergência entre cartões** — quando dois números que deveriam bater não
  batem, apontar a causa provável. Com os achados desta revisão, o assistente já
  tem o que dizer: caixa em versão de planejamento, mais de um orçamento no
  denominador, bases de receita diferentes.
- **Obras que merecem atenção** — sem medição recente, com conta vencida, com
  caixa projetado negativo.

## 6.2 · Nunca

Afirmar causa de variação sem base no dado; apresentar indicador de painel
invariante como se fosse do cenário selecionado; e projetar qualquer número que
o sistema não calcule.

## 6.3 · Montar outra análise

**Primeira ação do painel**, acima das demais — é a que abre o que a tela não
oferece. Mesma forma das outras: linha com ícone, título e descrição.

**6.3.1** Ao acionar, abre o chat com o contexto da tela já anexado — projetos,
cenários e período selecionados. É o item 2.2.2 do **Prompt E**: ação é atalho,
não conversa própria.

**6.3.2 · O escopo é declarado antes da resposta** — os projetos, os cenários e o
período em tela, e as métricas do catálogo da Parte 7. Nada além disso.

**6.3.3 · A resposta obedece às mesmas regras da tela.** Mesmas fontes, regimes
declarados, ausência distinta de zero, cobertura declarada quando um projeto não
tem o cenário pedido. **O assistente não calcula por conta própria** — regra 4.2
do **Prompt AD**.

**6.3.4 · Pergunta fora do alcance é recusada com o motivo**, e o motivo
distingue quatro casos: métrica fora do catálogo, cenário que o projeto não tem,
período sem dado, permissão que não alcança a tela de origem.

**6.3.5 · A resposta pode virar bloco de relatório** — Parte 7. Grava a
composição, nunca o número; a permissão do bloco é a de quem abre.

**6.3.6 · Enquanto a Etapa 2 do Prompt E não existir**, a ação responde no
próprio painel, uma resposta por vez. **O texto não menciona conversa antes de
haver conversa.**

**6.3.7 · Isolamento.** Filtro de tenant explícito em toda consulta, e respeito à
permissão de cada tela de origem: quem não vê Despesas não recebe despesa, nem
agregada nem como componente.

## 6.4 · Nunca, nesta ação

- **Nunca aceitar escopo vindo do texto.** Projeto, versão e período vêm do
  servidor, do que está selecionado — 2.2.3 do Prompt E.
- **Nunca inventar métrica** para atender à pergunta.
- **Nunca gravar.** Guardar como bloco é ação do usuário, e grava composição.

## 6.5 · O selo diz a verdade

"Somente leitura" só aparece se não houver nenhuma função de escrita — item 6.1
do Prompt E. **O campo de pergunta não é função de escrita**, e guardar um bloco
grava composição em tabela própria, aditiva — o selo continua válido, e o rodapé
do painel explica a distinção.

---

# PARTE 7 — RELATÓRIOS E PAINÉIS CUSTOMIZADOS

**Parte nova, e o pedido que originou esta revisão:** o usuário monta o próprio
relatório — indicadores, gráficos ou painel — escolhendo métricas, cenários,
projetos e período, com apoio do assistente.

**Depende da seção 58 do Prompt I e do BAA-6.** Não começa antes.

## 7.1 · O princípio: catálogo fechado, não consulta gerada

**O assistente não escreve consulta, e o usuário não escolhe tabela.**

Num banco sem RLS, com o isolamento sustentado em 164 pontos manuais (E-03),
deixar um modelo gerar SQL contra o schema cria uma porta de vazamento entre
empresas que nenhuma revisão de código alcança depois.

**O que existe no lugar:** um **catálogo de métricas**, servido pela camada
analítica da seção 28 do Prompt I. O usuário pede em linguagem natural; o
assistente **escolhe do catálogo** — métrica, dimensão, cenário, período,
projeto — e monta a composição. Cada item do catálogo é uma função já auditada,
com `tenantId` obrigatório na assinatura.

## 7.2 · Cada métrica declara cinco coisas

Nenhuma pode faltar:

| | |
|---|---|
| **Regime** | competência ou caixa |
| **Fonte** | qual tabela, qual coluna de data |
| **Escopo de versão** | existe em `budget`, `forecast`, `atual`, ou só em algumas |
| **Permissão** | de qual tela ela herda o `can(..., "ver")` |
| **Definição** | a frase que o usuário lê antes de colocar a métrica no relatório |

Isso resolve, no relatório customizado, o defeito que o Dashboard tem hoje:
número sem natureza declarada. E impede a combinação impossível — o usuário não
consegue pedir "A pagar do Orçamento", porque a métrica declara que não existe
naquele cenário.

## 7.3 · Trazer o realizado das versões

O relatório precisa comparar **Orçamento × Previsão Atualizada × Realizado**,
que é a seção 30 do Prompt I:

```
getScenarioComparison({ tenantId, projectIds, scenarios, startMonth, endMonth, dimension })
```

**Regras herdadas, sem exceção:**

- versão ausente devolve **estado explícito**, nunca zero nem substituição por
  outra versão — seção 36 do Prompt I;
- em consolidação de vários projetos, buscar a versão pedida **de cada projeto** e
  então agregar; nunca aplicar uma `versionId` a vários projetos — seção 35;
- ausência de dado exibe estado próprio, nunca `R$ 0,00` — seção 31;
- todo indicador declara o regime — seção 33.

## 7.4 · O que se grava

**A composição, nunca o dado e nunca a consulta.** O relatório salvo é uma lista
de referências ao catálogo, mais os filtros escolhidos. É recalculado a cada
abertura.

Tabela nova, aditiva, com `IF NOT EXISTS` e `down`. **Nenhum vínculo que altere
registro existente.** Nenhuma tabela de dado de negócio nova.

## 7.5 · A permissão é do leitor, avaliada na renderização

Relatório compartilhado **não carrega os dados de quem o criou**. Quem não vê
Despesas abre o mesmo relatório sem a linha de custo, e a tela diz que há
conteúdo omitido por permissão.

Verificação no servidor, a cada abertura — nunca na gravação.

## 7.6 · Isolamento

Toda consulta do relatório passa pelo filtro de tenant explícito. Não existe RLS:
o isolamento é sustentado consulta a consulta. Uma métrica nova sem filtro é
vazamento entre empresas — por isso o catálogo é fechado e cada item é auditado
antes de entrar.

## 7.7 · Quando a definição muda

As chaves das seções 54, 56, 57 e 58 do Prompt I, e a do Prompt H, **mudam número
em produção**. Um relatório montado hoje mostra outro valor depois de ligadas.

**Decidir e implementar uma das duas:** o relatório registra sob qual definição
foi montado e avisa quando ela mudar; ou a tela declara, de forma permanente, que
as definições evoluem e o relatório sempre reflete a vigente. **O que não pode é
mudar em silêncio.**

## 7.8 · Rascunho

O relatório customizado lê planejamento, então **entra na lista de telas que
filtram por situação** do **Prompt H**. Versão de `kind` `budget` ou `forecast`
em Rascunho não alimenta o relatório, quando a chave daquele prompt estiver
ligada. A versão **atual nunca é filtrada por situação**.

## 7.9 · Limite desta parte

**Montar, salvar, abrir e compartilhar. Nenhuma escrita em dado de negócio, por
nenhum caminho.** Exportar para `.xlsx` ou PDF é aceitável e lê exatamente a
mesma composição que a tela — nunca uma segunda consulta.

---

# 8. INTEGRIDADE

**8.1 · Permissão de ver.** Verificar se a tela chama `can(ctx.perms,
"dashboard", "ver")`. Se não chamar, acrescentar com `AccessDenied`. A varredura
completa é da seção 2.3 do **Prompt M**.

**8.2 · Filtragem em memória.** Dois casos carregam a tabela inteira do tenant
para descartar em JavaScript: `cash_entry` em `queries.ts:2118–2123` e
`medicao_servico` em `:1903–1909`. Somam-se a `project`, `version` e `despesa`
lidos sem filtro de projeto no SQL (`:2100`, `:2101`, `:2131`). **Filtrar na
consulta.**

**8.3 · Tenant no `where`.** Seis consultas do caminho do Dashboard não têm
`tenant_id` na cláusula SQL — `servico` (`:1899`), `budget_line` (`:1122–1127`),
`unit` (`:89`), `reembolso` (`:140`), `conta_receber` (`:1163–1168`) e a consulta
inline de `cash_entry` (`page.tsx:53`). Em todas, o isolamento vem indiretamente
de `version_id` ou `project_id`. **Não é vazamento hoje; é o E-03.**
Acrescentar o filtro explícito onde a função já recebe o tenant.

**8.4 · `medicao_servico` sem filtro de serviço.** Consultada só por tenant
(`:1908`) e filtrada depois (`:1933`).

**8.5 · Divisão por zero.** Nenhum percentual produz `NaN` ou `Infinity` hoje.
A dívida é a duplicação: `razao` é closure local de `getStatusProjeto`
(`:2170`) e as demais divisões repetem o guard inline em cinco lugares.
Consolidar num helper exportado, **sem alterar nenhum resultado**.

**8.6 · O inventário de schema omite colunas enum.** `version.kind`,
`project.kind`, `unit.status`, `despesa.categoria_dre`, `membership.role` e os
`tipo` de `stakeholder` e `bank_account` não aparecem em
`CONTEXTO-REVISAO.md`, e os defaults escorregaram para a linha anterior.
**Conferir sempre no `schema.ts`**, nunca no inventário, ao raciocinar sobre
essas colunas.

---

# 9. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Unificar as duas leituras do `payment_plan` | **Prompt I, seção 58** |
| `conta_receber` pelo valor cheio; reembolso sem filtro de estado | **Prompt I, seção 58** |
| `INCC_FROM_INSTALLMENT` duplicada | **Prompt I, seção 58** |
| Corrigir a receita em duplicidade | Prompt I, seções 54, 56 e 57 |
| Semântica de `dateInRange` × `monthInRange`; data inválida | **prompt próprio dos helpers** |
| Rotas `/api/agent/*`, que também expandem o plano de pagamento | **prompt próprio da API** |
| Corrigir o pendente de Contas a Pagar | Prompt R |
| Conciliação e cadeia de saldo | Prompt L |
| Medição por serviço | Prompt V, BV-1 |
| Descontinuar `duplicateVersion` | Prompt I, BI-3 |
| Excluir versões duplicadas | **decisão humana**, ver BAA-2 |
| Remover o cookie de projeto ativo | Prompt A |

---

# 10. PRESERVAÇÃO DE DADOS E ENTRADA CONTROLADA

**10.1** A tela é somente leitura e continua sendo. Nenhuma versão é apagada,
renomeada ou alterada. Nenhum `version.label` é reescrito. Nenhuma tabela é
removida. Nenhum `cash_entry`, `despesa`, `unit` ou `budget_line` é tocado.

**10.2** As correções **4-B.1**, **4-B.2**, **4-B.3**, **4.5** e a decisão do
**BAA-4** mudam número exibido em produção. Entram atrás de **uma chave por
tenant**, desligada, preservando o comportamento atual.

**Uma chave para o conjunto dos cartões do Dashboard** — não uma por cartão:
ligar só uma deixa o painel incoerente de outra forma. Independente das chaves
das seções 54, 56, 57 e 58 do Prompt I e da chave do Prompt H.

**10.3** Antes de ligar, apresentar a prévia: por projeto, o valor exibido hoje,
o valor pela definição nova e a diferença, cartão a cartão. Para "Recebido" e
"Executado", a prévia é o resultado das consultas do BAA-3.

**10.4** Migrações, se houver — a tabela da Parte 7 —, aditivas, com
`IF NOT EXISTS` e `down` em `migrations/down/`.

---

# 11. NÃO REGRESSÃO

**11.1** Com a chave desligada, **todos os 28 cartões devolvem exatamente os
mesmos números de hoje**, para todos os projetos e todas as versões. É a condição
de aceite mais importante.

**11.2** Nenhuma regra de cálculo de outra tela é alterada. As três funções dos
painéis inferiores são exclusivas do Dashboard; `getMonthlyRevenue`,
`getReceivables` e `getContasPagar` **não são alteradas por este prompt** —
mudanças nelas pertencem à seção 58 do Prompt I e aos Prompts R e L.

**11.3** Nenhuma escrita no banco, em nenhum caminho.

---

# 12. TESTES

**Nomes e seletores**

1. As versões aparecem como Atual, Orçamentos e Previsão Atualizada.
2. O nome digitado pelo usuário continua visível como complemento.
3. O padrão seleciona a Atual mais o orçamento e a previsão **mais recentes** —
   não as três mais antigas.
4. Versão com `source_version_id` preenchido não entra na seleção padrão, e
   continua selecionável.
5. Nenhuma versão foi apagada ou renomeada no banco.
6. Marcar duas versões exibe duas colunas; a quarta é informada, não ignorada.
7. Projeto sem versões declara a ausência e **não exibe as versões de outro
   projeto**.

**Escopo**

8. Nenhum projeto marcado equivale a todos.
9. Marcar dois projetos consolida os dois **em todos os 28 cartões**.
10. Com `?proj=all`, os KPIs do topo consolidam — não saem do cookie de projeto
    ativo.
11. Aplicar filtro de período muda os 28 cartões, ou o cartão que não admite
    recorte declara que exibe o acumulado.
12. O cabeçalho declara projetos, versões e período exibidos.
13. Cada painel declara o cenário que usa.

**Os cartões de status**

14. **"Recebido" não inclui `cash_entry` de versão que não seja a Atual.**
    Verificar num projeto que tenha versão copiada com caixa.
15. **"Executado" é dividido por uma única versão de orçamento**, declarada no
    cartão. Verificar num projeto com dois Budgets.
16. Margem de contribuição usa a mesma janela de competências nos dois lados da
    subtração, e a janela está declarada.
17. Cada cartão declara qual base de receita usa.
18. Falha na consulta de `budget_line` produz estado de erro visível, não zero.

**Os dezesseis**

19. Sem medição, "Liberação acumulada" e "Saldo de financiamento" exibem estado
    próprio — **não o valor do cadastro**.
20. "Serviços fora dos limites" sem serviços cadastrados não exibe zero verde.
21. Nenhum cartão do painel exibe `R$ 0,00` por ausência de dado.

**Gráficos**

22. Cada gráfico declara o regime no título.
23. O de resultado separa custo de despesa pela categoria DRE.
24. O de caixa e os cartões de caixa usam o mesmo critério de conciliação.
25. O saldo do gráfico bate com a cadeia de saldo da tela de Caixa, para o mesmo
    dia.
26. Competência sem lançamento interrompe a linha.
27. Com vários projetos, as séries somam.
28. O de resultado mostra uma versão por vez.
29. Receita é verde e custo é vermelho, independentemente da ordem da série.

**Relatórios customizados**

30. O assistente só compõe relatório com métricas do catálogo — nenhuma consulta
    gerada, nenhuma tabela escolhida livremente.
31. Cada métrica exibe regime, fonte e escopo de versão antes de ser adicionada.
32. Métrica inexistente no cenário escolhido não é oferecida.
33. Cenário sem dado exibe estado explícito, nunca zero.
34. Usuário sem permissão de ver Despesas abre um relatório compartilhado **sem**
    a linha de custo, e a tela informa que há conteúdo omitido.
35. Usuário com dois tenants não obtém, por nenhum caminho, dado do outro.
36. Nenhuma requisição do relatório escapa do filtro de tenant.
37. O relatório é recalculado na abertura — nenhum valor fica gravado.
38. Exportação e tela devolvem exatamente os mesmos números.

**Gerais**

39. Nenhum percentual exibe `NaN` ou `Infinity`.
40. Sem permissão de ver, a tela não é acessível por URL direta.
41. Assistente não grava nada, em nenhuma parte.
41a. "Montar outra análise" é a primeira ação do painel e declara o escopo —
    projetos, cenários, período e catálogo — antes de qualquer resposta.
41b. Pergunta fora do alcance é recusada **com o motivo**, e o motivo distingue
    métrica inexistente, cenário ausente, período sem dado e falta de permissão.
41c. Nenhuma resposta traz número que não venha de função do catálogo.
41d. Usuário sem permissão de ver Despesas não obtém despesa por nenhuma
    pergunta — nem agregada, nem como componente de indicador.
41e. Escopo pedido em texto não altera a consulta: projeto, versão e período
    continuam vindo do que está selecionado na tela.
41f. Guardar a resposta como bloco grava **composição**, não número.
41g. Enquanto a Etapa 2 do Prompt E não existir, o convite não menciona
    conversa, e a resposta aparece no próprio painel.
42. **Chave desligada: os 28 cartões devolvem os totais de hoje**, por projeto e
    por versão.
43. **Antes e depois:** contagem e soma de `cash_entry`, `despesa`, `unit`,
    `budget_line` e `version`. Nenhuma diferença.

---

# 13. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisão de **BAA-1**, e o que aconteceu com o painel de dezesseis cartões.
2. Inventário de **BAA-2** — versões por projeto, com `source_version_id` e
   movimento vinculado. **Sem apagar nenhuma.**
3. Resultado das duas consultas de **BAA-3**, com o valor exato que "Recebido" e
   "Executado" estavam exibindo a mais, projeto a projeto.
4. Decisão de **BAA-4** — o que "Recebido" passou a significar, e como o rótulo
   mudou.
5. Decisão de **BAA-5** — a base dos percentuais.
6. Decisão de **BAA-6** — se a camada analítica da seção 28 já existia, e o
   catálogo de métricas da estreia, com as cinco declarações de cada uma.
7. Como os seletores de projeto, versão e período passaram a alcançar os 28
   cartões, e a nova assinatura das três funções.
8. Como o fallback do modo `all` foi removido.
9. Confirmação de que nenhum `version.label` foi reescrito e nenhuma versão foi
   apagada.
10. Como a chave da seção 10.2 funciona, onde fica, e a prévia apresentada antes
    de ligá-la.
11. Os números exibidos antes e depois de cada correção herdada (Parte 5).
12. Estrutura criada para a Parte 7: tabelas, colunas, relações, e a confirmação
    de que só a composição é gravada.
13. Lista das consultas novas, com o filtro de tenant de cada uma.
14. Confirmação de que a tela continua sem escrita, em todas as partes.
15. Confirmação de que `getMonthlyRevenue`, `getReceivables` e `getContasPagar`
    não foram alteradas por este prompt.
16. Migrações criadas, com o `down` de cada uma.
17. Limitações encontradas.


<a id="prompt-ae"></a>


========================================================================


### ▸ 38 de 42 · PROMPT AE — Resumo Executivo

**Bloco 6 · Leitura** · Bloqueios: BAE-1 · BAE-2 · BAE-3

Três blocos prontos, três dependentes.

========================================================================


# PROMPT AE — RESUMO EXECUTIVO

Growth Construction · `/resumo`.

Baseado na coleta `docs/TELA-RESUMO.md`. A tela deixa de ser a lista das linhas
do `payment_plan` e passa a responder as perguntas que o sócio faz.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

Os cenários aparecem como **Orçamento**, **Previsão Atualizada** e
**Realizado**. **Nenhum `kind` muda no banco.**

**"Obra" é dado do cliente; "projeto" é o termo do produto.** A interface desta
tela diz *projeto* — ver a decisão na seção 2 do **Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** A tela é somente
leitura e continua sendo. Nenhuma unidade, permuta, liberação, despesa ou versão
é criada, alterada ou removida. Se alguma correção exigir tocar em registro:
**PARE**, não execute, e reporte.

**2 · Nada vindo de mockup entra no código.**

**3 · O assistente não grava nada, em nenhum caminho.**

---

# O QUE ESTA TELA É, E O QUE ELA VIROU

**É o que os sócios olham.** Deveria responder cinco a sete perguntas e caber
numa tela.

**Virou a lista das linhas do `payment_plan`** — AS, S1, S2, S3, mensais,
semestrais, anuais, FGTS, subsídio, permuta por materiais, permuta por serviços,
liberação. Doze indicadores que são a modelagem do sistema aparecendo na
interface.

E é a **última tela do sistema falando a língua das fontes de recurso**, que a
seção 57 do **Prompt I** descontinua. Reorganizá-la por pergunta a desamarra
dessa estrutura.

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

**1 · `"resumo"` está em `SCREENS` e em `CONTADOR_VE`** (`permissions.ts:45`,
`:88`), com enforcement central no layout. **Não acrescentar verificação
duplicada na página.**

**2 · Nenhum `BETWEEN` nem `ORDER BY` sobre coluna `text` de data** no caminho
desta tela. A única ordenação é por `unit.code`, que não é data.

**3 · O card de período sabe que é a única coisa afetada pela data.** O desenho
de separar "valores contratados" de "recebimentos do período" está certo; o que
falha é o rodapé apontar para um card que pode não existir — seção 4.4.

**4 · A separação entre `calcTotals` e as funções com data** é deliberada:
agregado é agregado, série é série. **A correção da seção 2 não funde as duas** —
corrige o agregado.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Pode ir |
|---|---|---|
| **1** — a nova estrutura | nada para Vendas, Exposição e Atenção | **imediatamente, parcial** |
| **2** — correções de `calcTotals` | nada | imediatamente |
| **3** — filtro por projeto | Parte 1 | com a Parte 1 |
| **4** — o que sai da tela | Parte 1 | com a Parte 1 |
| **5** — assistente de IA | Partes 1 e 3 | depois |

**A Parte 1 entra por blocos, não de uma vez.** Três estão prontos hoje; três
dependem de decisões abertas — ver a tabela de 1.9.

---

# BLOQUEIOS

## BAE-1 · A tolerância de desvio do bloco Atenção

O bloco de exceção precisa de um limite para dizer o que saiu da faixa.

**Responder:** desvio de custo acima de qual percentual merece alerta? Recebível
vencido há quantos dias? A tolerância é por projeto ou única para a empresa?

**Enquanto não houver resposta, o bloco Atenção exibe apenas as exceções
categóricas** — competência sem lançamento, unidade vendida sem plano de
pagamento, cenário ausente — e **nenhuma baseada em percentual.** Não inventar
limite.

## BAE-2 · A exposição máxima de caixa

O indicador mais valioso do bloco Caixa é o **pior saldo acumulado projetado** e
o mês em que ele acontece. **Ele não existe em nenhuma tela do sistema hoje.**

Ele depende do **BAD-1 do Prompt AD**: o saldo acumulado do Fluxo de Caixa hoje
parte de `bank_account.saldo` do tenant inteiro, sem filtro de projeto. Enquanto
o ponto de partida for da empresa e o fluxo for do projeto, a exposição projetada
de um projeto é um número sem significado.

**Não implementar o indicador antes da decisão do BAD-1.** O bloco Caixa entra
sem ele, declarando a pendência.

## BAE-3 · O VSO — vendas sobre oferta

Indicador clássico do setor: unidades vendidas no período sobre unidades
disponíveis no início do período.

**O sistema não guarda a data da venda de forma confiável.** `unit.mes_venda`
existe, em `"MM/DD/YYYY"`, e a coleta da DRE registrou que ele é usado no rateio
da seção 54. **Entregar antes de implementar:**

```sql
SELECT count(*) AS unidades,
       count(mes_venda) FILTER (WHERE mes_venda <> '') AS com_data,
       count(*) FILTER (WHERE status = 'Vendido') AS vendidas,
       count(*) FILTER (WHERE status = 'Vendido' AND (mes_venda IS NULL OR mes_venda = '')) AS vendidas_sem_data
  FROM unit;
```

Se houver unidade vendida sem data, **o VSO do período não é calculável** — e
essa ausência vira linha do bloco Atenção, não um número aproximado.

---

# PARTE 1 — A ESTRUTURA POR PERGUNTA

Seis blocos, na ordem em que a pergunta aparece. **Cabe numa tela; o que não
couber tem link para a tela que detalha.**

## 1.1 · As regras que valem para todos os blocos

**1.1.1 · Nenhum número sozinho.** Valor, comparação com o plano, e a variação.
Um número sem referência não sustenta decisão.

**1.1.2 · Cada bloco declara regime e cenário** — competência ou caixa;
Orçamento, Previsão ou Realizado. É onde mais se mistura, porque tudo é agregado.

**1.1.3 · Alerta por exceção.** O painel não lista o que está bem.

**1.1.4 · Percentual consolidado se recalcula, nunca se soma.** Margem de três
projetos é (receita total − custo total), não a média das três margens. **É o
erro mais comum em consolidação, e a regra é literal no código.**

**1.1.5 · Todo bloco tem caminho de saída** — clicar leva à tela que detalha.

**1.1.6 · Ausência é ausência.** Nenhum bloco exibe `R$ 0` por falta de dado.

## 1.2 · Bloco RESULTADO — regime de competência

Quatro linhas, três colunas: **Orçamento · Realizado · Desvio**.

| Linha | Origem |
|---|---|
| Receita reconhecida | seção 57 do Prompt I |
| Custo | `despesa.competencia`, categorias de custo |
| Margem de contribuição | receita − custo variável − despesa variável |
| Resultado | conforme a cascata decidida no BAC-3 do **Prompt AC** |

**É o bloco que o sócio lê primeiro, e o único que precisa estar completo.**

**[BLOQUEIO]** Depende das seções 54, 56, 57 e 58 do **Prompt I**. Enquanto a
receita tiver cinco origens e três leituras do plano de pagamento, a margem não é
confiável. **O bloco entra desenhado, com o número declarando a pendência** — não
com um valor que parece certo.

## 1.3 · Bloco CAIXA — regime de caixa

- **Saldo hoje**, com a origem declarada — ver BAE-2.
- **Entradas e saídas do mês**, realizado contra previsto.
- **Exposição máxima projetada** — o pior saldo acumulado dos próximos doze
  meses, **com o mês em que acontece**.

O terceiro é o que diz se vai faltar dinheiro antes de o financiamento liberar.
**Entra depois do BAD-1.**

## 1.4 · Bloco VENDAS — valores contratados

- **VGV total** — soma de `unit.valor` de **todas** as unidades.
- **VGV vendido** — soma de `unit.valor` das unidades com status `Vendido`.
- **VSO do período** — ver BAE-3.
- **Preço médio por m² vendido**, contra o da tabela.
- **Unidades por status**, com os **quatro** valores do enum — ver 2.3.

**Os dois primeiros têm critérios diferentes, e a tela declara isso.** Hoje o VGV
conta todas e os doze indicadores abaixo contam só as vendidas, sem nenhum aviso.

**Este bloco está pronto para ser construído hoje.**

## 1.5 · Bloco EXECUÇÃO — regime de competência

Avanço **físico** contra avanço **financeiro**. Projeto 40% executado com 65% do
orçamento consumido é a informação que antecipa estouro.

**[BLOQUEIO]** Depende do **BV-1 do Prompt V**. Sem medição por serviço não há
avanço físico — `medicao_servico` não tem escrita. **O bloco fica fora da tela
até a decisão**, e não entra com o "% do orçado medido" no lugar: razão
financeira apresentada como avanço físico é o defeito que o Prompt V corrige.

## 1.6 · Bloco EXPOSIÇÃO — regime declarado por linha

- **A receber por vencer** — saldo, não valor cheio.
- **A pagar por vencer** — saldo da parcela, conforme o **Prompt R**.
- **Financiamento** — aprovado e liberado, lado a lado.
- **Permuta em estoque**, pelo valor de entrada — seção 57 do Prompt I.

**Pronto para ser construído, com a dependência do Prompt R para o saldo.**

## 1.7 · Bloco ATENÇÃO — por exceção

Três a cinco linhas. Cada uma com o projeto, o valor e o link para a tela que
resolve.

**Categóricas — entram já:**

- competência dentro da janela do projeto sem nenhum lançamento;
- unidade vendida sem plano de pagamento;
- unidade vendida sem data de venda — ver BAE-3;
- projeto sem o cenário selecionado;
- lançamento sem categoria DRE ou sem competência — o rodapé da Parte 4 do
  **Prompt AC**, aqui como alerta.

**Por percentual — dependem do BAE-1:** desvio de custo acima da tolerância,
recebível vencido além do prazo.

**Nenhuma linha de atenção afirma causa.** Ela aponta o quê, onde e quanto.

## 1.8 · Bloco COMPARATIVO — só com mais de um projeto

Uma linha por projeto: receita, custo, margem e desvio. **É o que responde qual
projeto está puxando o resultado para baixo** — a pergunta que a consolidação
esconde.

## 1.9 · O que entra agora e o que espera

| Bloco | Situação |
|---|---|
| **Vendas** | **pronto** |
| **Exposição** | **pronto**, com a dependência do Prompt R |
| **Atenção** | **pronto** nas categóricas |
| **Comparativo** | **pronto** |
| **Caixa** | desenhado, entra após o **BAD-1** |
| **Resultado** | desenhado, entra após as seções 54–58 do **Prompt I** |
| **Execução** | **fora da tela** até o **BV-1** |

**Bloco pendente aparece na tela com o motivo escrito**, não vazio e não com
número provisório. O usuário precisa saber que a informação existe e por que
ainda não está lá.

---

# PARTE 2 — AS CORREÇÕES DE `calcTotals`

Valem mesmo que a Parte 1 seja adiada — são defeitos do cálculo atual.

## 2.1 · O VGV soma todas; os demais indicadores somam só as vendidas

`projection.ts:395` — o `reduce` do VGV está **fora** do `forEach` filtrado por
`status === "Vendido"` (`:375`).

Num projeto com dez unidades e duas vendidas, a primeira linha fala de dez e as
onze seguintes falam de duas, sem nenhum aviso.

**Corrigir:** os dois critérios continuam existindo — são indicadores diferentes
—, mas viram **duas linhas nomeadas**, VGV total e VGV vendido (1.4), e a tela
declara o critério de cada uma.

## 2.2 · "c/INCC p.5+" é só texto

`calcTotals` não recebe `incc`, não chama `getIncc`, e a página não importa
`getInccRows`. As três linhas são `valor × quantidade`, nominal.

O rótulo afirma correção monetária **no próprio nome do indicador**. É a mesma
categoria do "% FÍSICO" da Medição e do "Atual — caixa real" da DRE.

**Decidir e implementar uma das duas**, nunca manter:

1. **Aplicar o INCC**, passando `incc` para `calcTotals` — e então o número muda
   em produção, e entra atrás da chave da Parte 6.
2. **Tirar o "c/INCC p.5+" do rótulo**, e declarar que o valor é nominal.

**Recomendação: a 2 agora, a 1 junto com a seção 58 do Prompt I** — unificar as
três leituras do plano e aplicar o índice num lugar só.

## 2.3 · A unidade "Permutado" desaparece

O enum `unit_status` tem quatro valores; o card conta três, e o Total é a soma
dessas três (`page.tsx:139`).

**Uma unidade permutada não aparece em nenhuma linha nem no total — e o seu
`valor` está no VGV.** O card afirma "Total 1" enquanto o VGV soma duas.

**Corrigir:** as quatro situações aparecem, e o Total é a contagem de unidades do
projeto, não a soma de três filtros.

## 2.4 · Os sinais S1, S2 e S3 não multiplicam pela quantidade

```ts
sinais += (u.AS.val || 0) * (u.AS.n || 1) + (u.S1.val || 0) + (u.S2.val || 0) + (u.S3.val || 0);
```

O `AS` multiplica por `n`; os três sinais entram pelo valor unitário. E os
defaults divergem — `|| 1` no AS, `|| 0` nos periódicos.

**Confirmar no schema se `S1.n` existe.** Se existir, multiplicar; se não, o
default do `AS` é que está errado. **Não mudar os dois sem saber qual é o caso.**

## 2.5 · `calcTotals` ignora as flags `usar*`

Busca por `usar` em `calcTotals`: zero ocorrências. Unidade vendida com
`usarMens: false` tem as mensais somadas aqui, e **não** somadas na Projeção.

**É a terceira leitura do `payment_plan`**, junto com `expandUnitReceivables` e
`calcProjectionBySource`. **A correção pertence à seção 58 do Prompt I** — aqui
fica o registro de que são três, não duas.

## 2.6 · Permuta por tipo é busca por substring

`includes("material")` e `includes("servi")`, em minúsculas (`page.tsx:142–147`).
Tipo grafado fora do padrão some das duas linhas e permanece no "Permuta
Recebido" — e os três indicadores deixam de fechar entre si.

**Corrigir:** comparar com os valores do enum, ou exibir o resíduo como "outros
tipos", de modo que a soma sempre feche.

## 2.7 · Permuta e liberação entram sem filtro de status

`permRec` soma `permuta.estimado` de todas; `reemb` soma `reembolso.valor` sem
olhar `reembolso.status`, que **existe** e é descartado por `reembToCalc`.

## 2.8 · O selo "não gera projeção" descreve só esta tela

`calcTotals` de fato mantém `banco` isolado, fora dos agregados. **Mas
`expandUnitReceivables` gera um recebível de `valFinanc` inteiro em
`dataPrimParc`** (`receivables.ts:64–75`) — e alimenta Projeção, DRE, Fluxo e
Dashboard.

O selo é vermelho, tem autoridade de aviso, e afirma sobre **o sistema** algo que
vale só aqui. Quem o lê conclui que o financiamento não está projetado em lugar
nenhum.

**Corrigir:** o selo passa a dizer o que é verdade — *"não entra nos totais desta
tela"* —, ou sai quando a seção 58 unificar o tratamento do `Banco`.

---

# PARTE 3 — O FILTRO POR PROJETO

**3.1 · Multisseleção de projetos**, no padrão do **Prompt R**, seção 5. Nenhum
marcado significa todos.

Hoje **não há seletor de projeto**: a tela usa `ctx.project`, do cookie
(`page.tsx:167`, `:120`).

**3.2 · A cobertura é declarada.** "Previsão Atualizada: 2 de 3 projetos".
Projeto sem o cenário **não entra com zero** — seção 36 do Prompt I.

**3.3 · Valores somam; percentuais recalculam.** Regra 1.1.4, verificada no
código e nos testes.

**3.4 · Com mais de um projeto, o bloco Comparativo aparece** — 1.8.

**3.5 · A versão deixa de ser a ativa da sessão.** Hoje
`resolveCompareVersions(sp.vs, ctx.versions, ctx.version)` não lê `kind` em ponto
nenhum: **a tela pode abrir em Budget e apresentar "valores contratados" de um
orçamento.**

O padrão passa a ser o **Realizado** do projeto, com os demais cenários
selecionáveis. Sem versão Atual, estado explícito — nunca substituição.

**3.6 · As versões vêm do projeto selecionado**, por `getVersionsDoProjeto`, que
tem `tenant_id` no `where` — e não de `ctx.versions`.

**3.7 · A quarta versão selecionada deixa de expulsar a primeira** em silêncio
(`version-multiselect.tsx:31–39`). Acima do limite, a tela informa.

---

# PARTE 4 — O QUE SAI DA TELA

**4.1 · A tabela de doze indicadores por fonte de recurso.** AS, S1, S2, S3,
mensais, semestrais, anuais, FGTS, subsídio, permuta por materiais, permuta por
serviços, liberação.

Ela é substituída pelos blocos da Parte 1. **O detalhe por fonte continua
existindo na tela de Unidades**, que é onde o plano de pagamento é cadastrado.

**4.2 · O filtro de data some do modo comparação**, onde hoje fica visível e sem
efeito: `getMonthlyRevenue` só é chamada no modo de versão única, e o card de
período não é renderizado.

**4.3 · O rodapé que aponta para um card que pode não existir.** Sem data
preenchida o card some, e a frase continua dizendo "os recebimentos previstos
acima".

**4.4 · As células que não distinguem ausência de zero.** Hoje `brl0(i.value)`
sempre, com o `> 0` mudando **só a cor** — accent para positivo, cinza para zero.
Sem dado e zero produzem o mesmo texto.

---

# PARTE 5 — ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.**

**5.1 · A abertura traz o achado**, não um menu: o maior desvio do período, ou a
exceção mais cara do bloco Atenção. Gerada a partir de número que a tela já
mostra — **o assistente não calcula por conta própria**, regra 4.2 do
**Prompt AD**.

**5.2 · Ações**

- **Explicar o bloco** — de onde vem cada número, qual cenário, qual regime.
- **Comparar projetos** — o que 1.8 mostra, em texto, com o maior contribuinte
  do desvio.
- **O que mudou desde o mês passado** — variação dos seis blocos.
- **Montar outra análise** — abre o chat com o contexto da tela, no padrão da
  seção 6.3 do **Prompt AA**.

**5.3 · Nunca:** afirmar causa de variação; apresentar bloco pendente como se
tivesse número; comparar cenário ausente com zero; projetar o que a tela não
calcula.

**5.4 · Isolamento.** Filtro de tenant explícito, contexto validado no servidor,
e respeito à permissão de cada tela de origem: quem não vê Despesas não recebe
custo, nem agregado nem como componente da margem.

---

# 6. ENTRADA CONTROLADA

**6.1** A Parte 1, a Parte 2 e a Parte 4 mudam o que a tela exibe. Entram atrás
de **uma chave por tenant**, desligada, preservando o comportamento atual.

**6.2** Antes de ligar, prévia por projeto: os doze indicadores de hoje e os
blocos novos, lado a lado, com a diferença explicada linha a linha.

**6.3** As correções 2.1, 2.3, 2.4, 2.6 e 2.7 **mudam número**. A 2.2 muda número
se for a opção 1, e só rótulo se for a 2.

---

# 7. PRESERVAÇÃO DE DADOS

Nenhum `INSERT`, `UPDATE`, `DELETE` ou migração sobre dado de negócio. Nenhuma
unidade muda de status, nenhum `payment_plan` é tocado, nenhuma versão é alterada.

---

# 8. NÃO REGRESSÃO

**8.1** Com a chave desligada, a tela devolve exatamente os mesmos números de
hoje.

**8.2** `getMonthlyRevenue`, `expandUnitReceivables`, `calcProjection` e
`calcProjectionBySource` **não são alteradas por este prompt**. A unificação
pertence à seção 58 do Prompt I.

**8.3** `calcTotals` é usada **apenas** por esta tela — confirmar antes de
alterar. Se houver outro consumidor, o filtro vira parâmetro explícito, nunca
função duplicada.

**8.4** Dashboard, DRE, Fluxo de Caixa e Medição continuam com os mesmos números.

---

# 9. TESTES

**A estrutura**

1. A tela cabe numa viewport de 1080px de altura sem rolagem no conteúdo
   principal.
2. Cada bloco declara regime e cenário.
3. Bloco pendente exibe o motivo escrito — não fica vazio nem exibe número
   provisório.
4. Todo bloco tem link para a tela que detalha.
5. Nenhum bloco exibe `R$ 0` por ausência de dado.

**Os cálculos**

6. VGV total e VGV vendido aparecem como linhas distintas, com o critério
   declarado.
7. Unidade com status `Permutado` aparece no card de unidades, e o Total é a
   contagem do projeto.
8. Nenhum rótulo menciona INCC sem que o índice seja aplicado.
9. Permuta com tipo fora do padrão aparece em "outros tipos" — a soma fecha.
10. Liberação e permuta canceladas não entram nos totais.
11. O selo do financiamento descreve apenas esta tela, ou saiu.

**O filtro**

12. Selecionar dois projetos soma valores e **recalcula** percentuais —
    conferir que a margem consolidada não é a média das margens.
13. Projeto sem o cenário escolhido não entra com zero, e a cobertura é
    declarada.
14. Com mais de um projeto, o bloco Comparativo aparece.
15. A tela abre no Realizado, não na versão ativa da sessão.
16. Projeto sem versão Atual exibe estado explícito.
17. A quarta versão selecionada é informada, não expulsa a primeira.

**O assistente**

18. Nenhum número do painel está fora da tela.
19. Bloco pendente não recebe número do assistente.
20. Usuário sem permissão de ver Despesas não obtém custo por nenhum caminho.
21. Assistente não grava nada.

**Gerais**

22. Chave desligada: os doze indicadores de hoje, com os mesmos valores.
23. **Antes e depois:** contagem e soma de `unit`, `permuta`, `reembolso` e
    `version`. Nenhuma diferença.

---

# 10. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisões de **BAE-1**, **BAE-2** e **BAE-3**, com o resultado da consulta do
   VSO.
2. Quais blocos entraram, quais ficaram pendentes, e o texto que cada pendente
   exibe.
3. Como VGV total e VGV vendido foram separados.
4. Decisão de 2.2 sobre o INCC, e o efeito nos valores exibidos.
5. O que o schema diz sobre `S1.n`, e o que foi feito em 2.4.
6. Confirmação de que `calcTotals` é usada apenas por esta tela.
7. Como o percentual consolidado é recalculado, com o trecho de código.
8. Como a cobertura de cenário é declarada.
9. Como a versão passou a ser resolvida, e a confirmação de que a tela não abre
   mais em planejamento sem avisar.
10. As consultas novas, com o filtro de tenant de cada uma — **hoje são zero de
    oito**.
11. Confirmação de que nenhuma função compartilhada foi alterada.
12. Como a chave da seção 6 funciona, e a prévia apresentada.
13. Migrações criadas, com `down`.
14. Limitações encontradas.


<a id="prompt-e"></a>


========================================================================


### ▸ 39 de 42 · PROMPT E — Assistente de IA — arquitetura

**Bloco 7 · O que nasce depois** · Bloqueios: BE-1 · BE-2 · BE-3

Etapa 1. O BE-1 se responde em AM.

========================================================================


# PROMPT E — ASSISTENTE DE IA

Growth Construction · arquitetura do assistente, em três etapas.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

Três telas mudam de nome nesta leva de trabalho. **A rota é o identificador
estável** — é por ela que se encontra o arquivo, independentemente do nome no
texto. Nomes antigos e novos aparecem nos prompts e nas telas até que todos
estejam em produção.

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**Nada de nome interno muda em nenhum dos quatro casos.** Rotas, tabelas
(`budget_line`, `budget_account`, `reembolso`, `project`), chaves de versão
(`budget`, `forecast`, `atual`), campos (`reemb`) e funções
(`duplicateForecast`, `addReembolso`) permanecem como estão.

**Renomear rótulo é apresentação; renomear dado é migração.**

Onde este documento usar um nome, ele se refere à rota da tabela acima. Em caso
de dúvida entre nome e rota, **a rota manda**.

---

## ⚠ REGRA GLOBAL — VALE PARA TODOS OS PROMPTS, ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum número já lançado no sistema pode ser alterado.**
Valores, totais, percentuais, saldos, datas e quantidades existentes em
produção permanecem exatamente como estão. Nenhuma tarefa recalcula, arredonda,
converte, normaliza, migra, reclassifica ou "corrige" um número já gravado —
nem como efeito colateral de mudança de layout, de rota, de nome de campo ou de
origem de dado. Se uma alteração exigir tocar em número lançado: **PARE, não
execute, e informe qual número, por quê e qual a alternativa não destrutiva.**

**2 · Nada vindo de mockup entra no código.**
Mockups e capturas de tela definem layout, hierarquia visual, rótulos e
comportamento de interface — nada além disso. Nunca usar de um mockup valores,
percentuais, datas, nomes de obra, de cliente, de proprietário, endereços,
coordenadas, nomes de usuário, cargos ou contadores. Nunca criar registro, seed,
fixture, valor padrão ou dado de teste a partir de um mockup.

---

# ORDEM DE EXECUÇÃO

| | Prompt | Ordem |
|---|---|---|
| **C** | Barra lateral | 1º |
| **A** | Remoção do projeto ativo global | 2º |
| **B** | Tela Projetos & Unidades | 3º |
| **D** | Tela Orçamentos | 4º |
| **E** | este — assistente de IA | 5º, em três etapas próprias |

**Relação com B e D.** Os dois prompts já descrevem um painel de IA em suas
telas. Este prompt é o dono da **arquitetura**: contexto, segurança, permissão,
auditoria e o comportamento comum. B e D descrevem apenas o painel daquela tela
e seguem o que está aqui. Onde houver conflito, **este prompt vence**.

Se B ou D forem para produção antes de E, o painel daquelas telas implementa a
Etapa 1 conforme descrita aqui, e nada além dela.

---

# BLOQUEIOS — RESPONDER ANTES DE ESCREVER CÓDIGO

## BE-1 · O que já existe em `/diagnosticoia`?

O sistema tem hoje uma tela chamada **Diagnóstico de IA**, no módulo de
configuração. Antes de qualquer linha de código: descrever o que ela faz, que
provedor usa, que credenciais consome, e que dados envia.

Este prompt **não pode** duplicar infraestrutura que já exista ali. Se há
cliente de modelo, chave, configuração por tenant ou registro de uso, o
assistente reaproveita.

## BE-2 · Que dados saem do sistema, e para onde?

O banco tem dado financeiro real e dado pessoal de compradores. Qualquer envio a
um provedor externo é decisão de privacidade, não detalhe técnico.

**Responder:** qual provedor, sob qual contrato, com que política de retenção; e
quais campos podem sair do tenant. No mínimo, definir se nome, documento,
telefone e endereço de cliente são enviados ou mascarados antes.

**Regra fixa, independente da resposta:** o assistente nunca recebe dado de mais
de um tenant na mesma requisição, e nunca recebe dado de um projeto que o
usuário não possa ver.

## BE-3 · Qual etapa está sendo autorizada agora?

Este prompt descreve três. **Implementar apenas a que for autorizada.** A Etapa
3 tem pré-condições técnicas listadas na seção 4 que hoje não estão cumpridas.

---

# 1. PRINCÍPIO

O assistente tem **duas portas e um cérebro**: um painel por tela, e um chat
suspenso disponível em qualquer tela. Não são dois assistentes.

**Não existe item de menu para a IA.** Um destino de navegação chamado "IA" é um
lugar sem conteúdo: o usuário sai da tela que sabia o que ele estava fazendo
para chegar numa tela que precisa perguntar. O contexto é o valor; navegar até a
ajuda destrói o contexto.

**Fora de escopo, permanentemente:** "ajudar a criar telas". Isso é
desenvolvimento, não operação do produto. Não descrever, não prometer na
interface, não implementar.

---

# 2. ETAPA 1 — PAINEL POR TELA

## 2.1 Onde existe

Painel lateral direito, apenas nas telas onde há algo específico a dizer. Não é
obrigatório em toda tela — numa tela de cadastro simples, ele só ocupa espaço.

Telas com painel definido até aqui: **Projetos & Unidades** (Prompt B) e
**Orçamentos** (Prompt D). Qualquer outra entra por decisão explícita.

## 2.2 Comportamento

**2.2.1 · Recolhível.** O painel ocupa 300px permanentes. Em Orçamentos, isso
compete com uma tabela de treze colunas que já rola horizontalmente. O usuário
recolhe e expande, e a preferência persiste por usuário e navegador — é
preferência de interface, não contexto de negócio, e não se mistura com os
cookies tratados no Prompt A.

**2.2.2 · Ações são atalhos, não conversas.** Cada ação do painel abre o chat
(Etapa 2) com a pergunta já formulada e o contexto já anexado. Enquanto a Etapa 2
não existir, a ação exibe o resultado dentro do próprio painel.

**2.2.3 · O contexto vem do servidor.** O painel recebe `projectId`,
`versionId` e demais identificadores da própria página, validados no servidor
contra o tenant do usuário. Nunca a partir de id enviado pelo cliente sem
verificação, nunca por contexto implícito ou cookie.

**2.2.4 · Somente leitura nesta etapa.** Analisar, apontar, comparar, explicar.
Nenhuma gravação, por nenhum caminho, nem com confirmação.

## 2.3 O que as funções devem cobrir

As verificações abaixo foram identificadas na revisão de código como invisíveis
nas telas hoje. São o conteúdo mínimo das funções de análise:

**Em Projetos & Unidades:** duração digitada diferente da implicada pelas datas;
soma das fontes de recurso abaixo do valor global; data de fim anterior à de
início; município sem código IBGE correspondente; cadastro sem período definido,
que bloqueia Orçamentos e Forecast.

**Em Orçamentos:** contas cuja soma de percentuais fecha **abaixo** de 100% — o
salvamento só bloqueia acima; meses do período sem distribuição; divergência
entre o total de receitas e o valor do cadastro do projeto; bloco de despesas
vazio quando há receita lançada, caso em que o card "Resultado" exibe receita sem
custo, que não é margem; **linhas com dado em meses fora do período atual do
projeto** — leitura que hoje nenhuma tela oferece e que antecipa perda de dado.

---

# 3. ETAPA 2 — CHAT SUSPENSO, SOMENTE LEITURA

## 3.1 Por que existe

O painel responde sobre a tela. O chat responde o que atravessa telas: "quanto a
obra já gastou contra o orçado" cruza Despesas, Orçamentos e Medição. Nenhum
painel resolve isso.

## 3.2 Forma

Botão flutuante no canto inferior direito, presente em qualquer tela. Abre um
painel de conversa sobreposto, sem navegar. Fecha e volta ao mesmo lugar.

Recebe automaticamente o contexto da tela em que foi aberto — projeto, versão,
período — e o exibe ao usuário, para que ele saiba do que o assistente está
falando.

## 3.3 Limite desta etapa

**Perguntar e responder. Nada mais.** Quando a resposta implicar uma ação, o
assistente indica o caminho — a tela, o campo, o registro — e o usuário vai lá.
Nenhuma gravação.

## 3.4 Isolamento

Toda consulta que o chat fizer ao banco passa pelo filtro de tenant explícito.
Não existe RLS: o isolamento é sustentado consulta a consulta. Uma consulta nova
sem filtro é vazamento entre empresas.

O chat nunca acessa projeto que o usuário não possa ver, e respeita a permissão
de visualização de cada tela: se o usuário não vê Despesas, o chat não responde
sobre despesas.

---

# 4. ETAPA 3 — ESCRITA COM CONFIRMAÇÃO

**Não autorizada por padrão.** Só entra em pauta depois de cumpridas as
pré-condições abaixo.

## 4.1 Pré-condições técnicas

**4.1.1** A gravação da tela de Orçamentos apaga e reinsere: remove todos os
`budget_account` e `budget_line` do bloco na versão e reinsere o que veio no
formulário. Enquanto isso não for corrigido, escrita assistida naquela tela
multiplica o alcance de qualquer erro. Ver a pré-condição do Prompt D.

**4.1.2** `deleteProject` executa exclusão física em cascata — versões,
unidades, despesas, caixa, medições, orçamentos, contas a receber, ponto,
serviços e INCC. Nenhuma função assistida pode chegar perto de exclusão de
projeto, em nenhuma etapa.

**4.1.3** As Server Actions precisam retornar `{ ok, error }` em vez de lançar
erro. Hoje lançam, e a mensagem é substituída em produção — o usuário não
consegue ler por que a operação assistida falhou.

## 4.2 Regras, quando autorizada

**4.2.1 · Proposta, nunca gravação direta.** O assistente preenche os campos na
tela, sem salvar. O usuário vê exatamente o que será gravado, campo a campo, e
confirma.

**4.2.2 · Permissão no servidor.** A confirmação humana não substitui a
permissão. A verificação acontece na mesma action que grava, no servidor.
Usuário sem `editar` não aplica sugestão. **A IA não é caminho alternativo de
escrita.**

**4.2.3 · Auditoria.** Toda alteração originada de sugestão aceita registra em
`logAudit`, além do já registrado, que a origem foi o assistente. Sugestão
recusada não grava nada.

**4.2.4 · Contexto resolvido explicitamente.** Antes de propor qualquer
lançamento, o assistente exibe e faz confirmar qual projeto, qual versão e qual
competência. Neste sistema, resolver contexto errado significa lançar na obra
errada.

**4.2.5 · Escopo restrito na estreia.** A primeira operação de escrita
assistida não pode ser numa tela com gravação destrutiva nem em documento com
efeito contábil já emitido.

---

# 5. LEITURA DE DOCUMENTOS

Vale para as três etapas.

**5.1** "Extrair dados de documentos" lê apenas documento cujo `tenant_id` seja
o do usuário e cujo `project_id` seja o do contexto em tela. A validação é no
servidor, contra o banco, nunca contra identificador vindo do cliente.

**5.2** O resultado é sempre proposta exibida ao usuário. Na Etapa 1 e 2, o
usuário copia ou digita o que quiser aproveitar. Preenchimento automático de
campo só na Etapa 3.

**5.3** Nenhum documento é alterado, movido, renomeado ou reenviado pela leitura.
`projectId`, `storageKey`, `filename`, `tipo` e `uploadedAt` permanecem
intocados.

---

# 6. INTERFACE

Seguir `PADRAO-VISUAL.md`. Resumo do que já está congelado:

Painel de 300px, cartão branco com borda `#E4E9F2`, raio 16px, sombra padrão,
fixo ao rolar. Cabeçalho com ícone de faísca em `#6D4BD1` e `#3B82F6`, título e
subtítulo. Ações como linhas com borda e raio 11px, quadrado de ícone de 30px,
título 13.5px/600, descrição 11.5px, chevron à direita. Caixa de dica em lilás
`#F3EFFE` com borda `#E0D7FB`.

**6.1** Quando o assistente for somente leitura, o selo correspondente fica ao
lado do título e o rodapé do painel declara que nada é alterado. O selo não pode
coexistir com nenhuma função de escrita — **não repetir a contradição do mockup
de Orçamentos**, que traz o selo "Somente leitura" e, quatro itens abaixo,
"Construir orçamento por texto ou voz".

**6.2** Abaixo de 1180px o painel desce para baixo do conteúdo e perde o
`sticky`. O botão do chat permanece flutuante.

**6.3** Foco visível por teclado, `aria-expanded` no recolher, contraste
suficiente, `prefers-reduced-motion` respeitado.

---

# 7. NÃO REGRESSÃO

O assistente não altera nenhuma regra de negócio, nenhum cálculo, nenhuma
consulta existente e nenhum comportamento de tela. Ele lê o que já existe e
escreve — quando e se autorizado — pelas mesmas actions que a interface usa,
com as mesmas validações.

Nenhuma migração de dado. Nenhuma tabela de dado de negócio nova. Se for
necessário registrar conversas ou uso, é tabela nova, aditiva, sem vínculo que
altere registro existente.

---

# 8. TESTES

1. O painel não aparece em tela onde não foi definido.
2. Recolher e expandir persiste entre sessões, por usuário.
3. O painel de um projeto nunca exibe dado de outro.
4. Usuário sem permissão de ver a tela não acessa o painel dela.
5. Usuário com dois tenants não obtém, por nenhum caminho, dado do outro.
6. Nenhuma requisição do assistente escapa do filtro de tenant.
7. Nas Etapas 1 e 2, nenhuma gravação acontece em nenhum caminho — verificar por
   contagem de registros antes e depois de uma sessão de uso.
8. Leitura de documento recusa `documentId` de outro projeto ou de outro tenant.
9. O selo "Somente leitura" só aparece quando não há nenhuma função de escrita.
10. O chat aberto em telas diferentes recebe o contexto correto de cada uma.

---

# 9. RELATÓRIO FINAL OBRIGATÓRIO

1. Etapa implementada.
2. O que foi reaproveitado de `/diagnosticoia`, e o que foi criado.
3. Provedor, credenciais e onde ficam.
4. Quais campos são enviados ao modelo e quais são mascarados.
5. Como o contexto de tenant, projeto e versão é resolvido e validado.
6. Lista das consultas novas, com o filtro de tenant de cada uma.
7. Telas que receberam painel e por quê.
8. Confirmação de que nenhuma gravação é possível, se Etapa 1 ou 2.
9. Confirmação de que nenhuma regra, cálculo ou consulta existente foi alterada.
10. Tabelas novas, se houver, com a migração e o `down`.
11. Decisões tomadas em BE-1, BE-2 e BE-3.
12. Limitações encontradas.


<a id="prompt-am"></a>


========================================================================


### ▸ 40 de 42 · PROMPT AM — Assistente do produto

**Bloco 7 · O que nasce depois** · Bloqueios: BAM-1 · BAM-2 · BAM-3

Não depende de dado. **Pode ir a qualquer momento.**

========================================================================


# PROMPT AM — ASSISTENTE DO PRODUTO

Growth Construction · `/diagnosticoia`, que passa a ser o **Assistente**.

A tela deixa de ser um botão de teste e passa a ser um chat que **explica como o
sistema funciona**. Ela **não responde sobre dados** — quando a pergunta exigir
número, ela diz que não tem a informação e aponta a tela onde o número está.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |
| `/diagnosticoia` | Diagnóstico de IA | **Assistente** | **este prompt** |

**A rota não muda.** Renomear rótulo é apresentação.

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Esta tela é somente
leitura, e **nem leitura de dado de negócio faz** — ver a Parte 1. Nenhuma
tabela é criada, alterada ou consultada além do registro de uso da Parte 5.

**2 · Nenhum dado do tenant vai ao modelo.** É a regra que define esta tarefa —
Parte 2.

**3 · Nada vindo de mockup entra no código.**

---

# ONDE A TELA FICA

Módulo **Business Intelligence**, conforme a seção 3 do **Prompt C**.

**A ressalva registrada lá continua valendo:** a tela guarda configuração de
provedor. A permissão é dela, e **não herda a de quem lê demonstrativo** — ver
Parte 6.

---

# O QUE JÁ EXISTE E SE REAPROVEITA

**Não se constrói cliente de IA novo.** A infraestrutura está pronta e testada:

**1 · `ai/client.ts`** — cliente com **cadeia de fallback de modelo**: primário,
depois `claude-sonnet-5`, depois `claude-opus-4-8`. Cada tentativa é uma chamada
faturada — importa para a Parte 5.

**2 · `ai/erros.ts`** — tradução de erro da API para português, com os casos
cobertos: chave ausente, saldo, `429`, modelo não liberado, workspace.
**Reaproveitar inteiro.**

**3 · `ai/modelos.ts`** — `primaryModel()`, `rotuloModelo()`, `modelWarning()`,
e o default `claude-haiku-4-5`.

**4 · O texto de ajuda da tela atual.** Explica que `ANTHROPIC_MODEL` aceita o
identificador e não o nome comercial, distingue falha por saldo de falha por
chave, e trata o caso da service account com `ANTHROPIC_WORKSPACE_ID`. **É
documentação de operação melhor que a maioria dos textos do sistema — preservar,
e mover para a Parte 7.**

**5 · O cache de prompt** já usado na leitura de despesa
(`cache_control: {type:"ephemeral"}`). **É o mecanismo que torna esta tela
viável** — ver 5.3.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — o escopo | **BAM-1** | **define tudo o mais** |
| **2** — a base de conhecimento | Parte 1 e **BAM-2** | |
| **3** — a conversa | Parte 2 | |
| **4** — quando não sabe | Parte 3 | **é a parte que dá confiança** |
| **5** — consumo e limite | nada | **vai antes de a tela abrir para todos** |
| **6** — permissão | nada | correção independente |
| **7** — o diagnóstico que fica | Parte 3 | |

---

# BLOQUEIOS

## BAM-1 · A base de conhecimento reflete o sistema de hoje, não o dos prompts

**É o maior risco desta tela, e ele não é técnico.**

A revisão produziu dezenas de decisões que **ainda não estão em produção**: a
receita da DRE tem cinco origens e vai passar a ter duas; a permuta é receita e
vai virar ativo; a liberação de obra é receita e vai virar caixa; o "% físico"
não é físico; o rateio da venda ainda não existe.

**Se a base de conhecimento for escrita a partir dos prompts, o assistente vai
explicar um sistema que ninguém usa** — e com voz de autoridade.

**A regra:** a base descreve **o comportamento atual**, e onde houver decisão
tomada e não implementada, ela diz as duas coisas — o que o sistema faz hoje e o
que está decidido para mudar.

**Responder:** quem mantém a base quando um prompt entrar em produção? **Sem
dono, ela envelhece em semanas** — e um assistente desatualizado é pior que
nenhum, porque o usuário não tem como saber que está desatualizado.

## BAM-2 · O assistente explica regra contábil?

"Como o sistema funciona" tem duas camadas, e a fronteira precisa ser explícita:

| Camada | Exemplo |
|---|---|
| **Operação** | "Onde lanço uma despesa paga por sócio?" |
| **Regra do produto** | "Por que a liberação de obra não entra na receita?" |

A segunda é mais útil e mais perigosa: **é a fronteira com consultoria
contábil.**

**Escolher uma:**

1. **Só operação.** O assistente diz onde clicar e o que cada campo significa.
2. **Operação e a regra do produto, sem extrapolar.** Explica o que o sistema
   faz e por quê, **sempre referindo a decisão do produto**, nunca a legislação.

**Recomendação: a 2, com limite escrito** — o assistente nunca diz o que a
empresa *deve* fazer fiscal ou contabilmente; diz o que **este sistema** faz, e
sugere confirmar com a contabilidade.

## BAM-3 · O histórico da conversa é gravado?

**Escolher uma:**

1. **Efêmero.** A conversa vive na sessão e some ao recarregar. Nenhuma tabela
   nova, nenhum dado guardado.
2. **Salvo por usuário.** Tabela nova, aditiva. Permite retomar e permite saber
   o que as pessoas perguntam — o que é a melhor fonte para melhorar a base.

**Recomendação: a 1 na estreia.** Sem dado de negócio na conversa, o valor de
guardar é baixo, e guardar pergunta de usuário é dado pessoal de trabalho — vira
decisão de privacidade que a estreia não precisa tomar.

**A Parte 5 registra o uso agregado de qualquer forma**, e isso basta para medir.

---

# PARTE 1 — O ESCOPO

## 1.1 · O que a tela é

**Um chat que explica o Growth Construction.** Onde fica cada coisa, o que cada
tela faz, o que cada campo significa, qual a diferença entre duas telas
parecidas, e por que o sistema faz o que faz.

## 1.2 · O que a tela não é

**Ela não acessa o banco.** Nenhuma consulta, nenhuma tabela de negócio, nenhum
`getActiveContext` alimentando prompt.

**Consequências diretas, e todas boas:**

- **Não há vazamento entre tenants possível** — não há consulta para vazar. O
  BE-2 do **Prompt E** fica resolvido para esta tela por construção.
- **Não há dado pessoal de comprador no contexto do modelo.**
- **Não há número errado**, porque não há número.

## 1.3 · A fronteira com os outros dois assistentes

| Onde | Responde | Estado |
|---|---|---|
| **Painel da tela** | sobre a tela em que você está | Prompt E, Etapa 1 |
| **Chat suspenso** | o que atravessa telas, com dados | Prompt E, Etapa 2 — **não existe** |
| **Esta tela** | como o sistema funciona | **esta tarefa** |

**O botão flutuante permanece**, e continua sendo o caminho do chat com contexto
quando a Etapa 2 existir. **Esta tela não o substitui.**

## 1.4 · Por que isto não contraria o Prompt E

A seção 1 daquele prompt recusa um item de menu chamado "IA" porque *"o usuário
sai da tela que sabia o que ele estava fazendo para chegar numa tela que precisa
perguntar"*.

**O argumento vale para um assistente de dados, e não vale aqui:** uma pergunta
sobre como o sistema funciona **não tem contexto de tela para perder**. Quem
pergunta "onde lanço despesa paga por sócio" está justamente na tela errada.

**Registrar isso no Prompt E**, como complemento — não como revogação.

---

# PARTE 2 — A BASE DE CONHECIMENTO

**Ver BAM-1 e BAM-2.**

## 2.1 · O que ela contém

Conteúdo escrito, versionado no repositório, em arquivos de texto. **Não é o
código, não é o schema, não são os prompts da revisão.**

Organizada por tela e por conceito:

- **o que cada tela faz**, e o que ela não faz;
- **o que cada campo significa** — competência × vencimento × data de caixa é a
  confusão mais cara do sistema;
- **as diferenças entre telas parecidas** — Medição de Obra × Lançar medição,
  Ressarcimentos × Liberações de Obra, Contas a Pagar × Despesas;
- **os conceitos do produto** — versão, cenário, regime, projeto;
- **os caminhos de operação** — "para lançar despesa paga por sócio, vá em…".

## 2.2 · O que ela não contém

- **Nenhum dado de tenant.** Nem exemplo com nome real, nem valor de obra.
- **Nenhuma orientação fiscal ou contábil** — BAM-2.
- **Nenhuma promessa de funcionalidade futura** como se fosse presente —
  BAM-1.

## 2.3 · Como ela chega ao modelo

**No `system`, com cache de prompt** — o mesmo `cache_control: {type:"ephemeral"}`
da leitura de despesa.

**É o que torna a tela viável:** a base é grande e igual em toda pergunta. Sem
cache, cada pergunta paga o prompt inteiro.

## 2.4 · Ela é versionada e revisável

Arquivo de texto no repositório, com histórico. **Quem mantém é a resposta do
BAM-1.**

---

# PARTE 3 — A CONVERSA

**3.1 · Somente leitura, sem exceção.** Nenhuma gravação em dado de negócio, por
nenhum caminho. Esta tela fica **fora da Etapa 3 do Prompt E,
permanentemente**.

**3.2 · A tela abre com o que ela faz e o que não faz**, e com três ou quatro
perguntas de exemplo — não com um campo vazio.

**3.3 · Respostas curtas, com o caminho.** Quando a resposta for "vá em tal
tela", **o caminho é um link**. É metade do valor da tela.

**3.4 · Sem histórico entre sessões**, conforme BAM-3.

**3.5 · Erro da API aparece traduzido**, pelo `erros.ts` que já existe.

---

# PARTE 4 — QUANDO A PERGUNTA É SOBRE DADOS

**É a parte que decide se o usuário confia na tela.**

## 4.1 · A regra

**Pergunta que exige número, saldo, valor, quantidade ou situação de um registro
recebe resposta de ausência** — e o assistente **diz onde o número está**.

> *"Não tenho acesso aos dados do sistema, então não sei quanto a OBRA 28 já
> gastou. Esse número está em **DRE**, na linha de Custo Variável — ou em
> **Despesas**, filtrando por projeto e competência."*

**A segunda metade é obrigatória.** "Não tenho essa informação" sozinho é uma
porta fechada; com o caminho, a recusa vira resposta.

## 4.2 · O assistente nunca inventa número

**Nem exemplo plausível, nem ordem de grandeza, nem "normalmente fica em torno
de".** Se não tem, não estima.

## 4.3 · Nunca diz que buscou

Não diz "consultei", "verifiquei" ou "não encontrei registros" — **ele não
consultou nada**. A ausência é de acesso, não de resultado.

## 4.4 · A ausência é declarada na tela, não só na resposta

Um aviso permanente, curto, dizendo que o assistente conhece o sistema e não
conhece os dados da empresa. **Quem entende isso na primeira tela não faz a
pergunta errada dez vezes.**

## 4.5 · Quando a Etapa 2 existir

O assistente passa a **encaminhar**: *"essa pergunta o chat com seus dados
responde — ele está no botão no canto da tela."*

**Não implementar o encaminhamento antes de a Etapa 2 existir.** Apontar para o
que não existe é a promessa de tela que a revisão vem catalogando.

---

# PARTE 5 — CONSUMO E LIMITE

**Vai antes de a tela abrir para todos.** Um chat é feito de muitas perguntas
curtas — o padrão de uso muda por completo.

## 5.1 · Hoje não há medição nenhuma

O objeto `usage` volta em toda resposta da API e **é descartado nas quatro
chamadas do sistema**. Não há como responder quantas leituras foram feitas, por
quem, em qual tenant, a que custo — **a única fonte é o console da Anthropic,
que agrega tudo numa chave só.**

**Passa a ser registrado:** tokens de entrada e saída, modelo efetivamente
usado, tenant, usuário e instante. Tabela nova, aditiva, ou `logAudit` com `meta`
próprio.

**Vale para as quatro chamadas existentes também** — é uma linha em cada.

## 5.2 · Hoje não há limite de frequência nem de custo

Nada impede 500 chamadas seguidas: sem fila, sem throttle, sem teto de gasto, sem
verificação de saldo. O único freio é o `429` da API, traduzido como *"Limite de
uso da IA atingido"*, **sem reenfileirar**.

**Entra limite por usuário e por tenant**, com janela de tempo. O número sai do
BAM-3 do **Prompt E**, ou vira decisão desta tarefa.

## 5.3 · O cache de prompt é obrigatório aqui

Sem ele, cada pergunta paga a base inteira. **Com ele, a base é cobrada uma vez
por janela de cache.**

## 5.4 · A cadeia de fallback multiplica a conta

`modelChain()` tenta o primário e mais dois. **Um clique pode gerar três chamadas
faturadas.** Na tela atual isso é irrelevante — 8 tokens. Num chat, não é.

**Registrar qual modelo respondeu**, e alertar quando o primário estiver
falhando sistematicamente.

## 5.5 · A chave é do ambiente, não do tenant

`ANTHROPIC_API_KEY` é variável de processo — **todas as empresas consomem da
mesma conta**, como o token do Emissor (BAG-3 do **Prompt AG**).

**Não resolver aqui.** Registrar como decisão pendente, e a medição da 5.1 é o
que a torna discutível — hoje não há nem como saber quanto cada tenant consome.

---

# PARTE 6 — PERMISSÃO

## 6.1 · A tela e a action usam critérios diferentes

| Camada | Critério |
|---|---|
| Enforcement central e página | `can(ctx.perms, "diagnosticoia", "ver")` |
| **Action `testAiConnection`** | **`ctx.role !== "owner" && ctx.role !== "admin"`** |

A action **não consulta a matriz** — testa o papel direto. Um `membro` com
`diagnosticoia:ver` por override vê a tela, clica, e recebe *"Sem permissão"*. E
um `admin` com a tela revogada não chega nela, mas a action aceitaria chamada
forjada.

**Corrigir: a action passa a usar `can`**, como as outras três actions de IA.

## 6.2 · A página devolve branco em vez de negar

`return null` quando não há permissão, em vez de `<AccessDenied />`. Na prática o
layout já barrou — mas o padrão do sistema é o componente.

## 6.3 · Quem alcança o assistente

**Decisão desta tarefa:** um chat que explica o produto **é útil para quem
opera**, não só para quem administra.

**Recomendação:** `diagnosticoia:ver` passa a ser concedível a qualquer papel
pela Gestão de Acessos, e o default do `membro` a inclui — conforme o BAJ-2 do
**Prompt AJ**.

**Mas o bloco de configuração da Parte 7 continua restrito a owner e admin.**
Chave e modelo são credencial.

## 6.4 · Quem pode gastar crédito, hoje, não passa por aqui

`extractDespesaFromDoc` exige `despesas:criar`; o extrato exige `caixa:editar`.
**Quem lança despesa gasta crédito de IA**, e isso nunca passou pela permissão
`diagnosticoia`.

**Registrar.** Com a medição da 5.1, passa a ser visível.

---

# PARTE 7 — O DIAGNÓSTICO QUE FICA

**7.1 · O teste de conexão permanece**, como bloco secundário — não como o
conteúdo da tela.

**7.2 · O chat é o melhor diagnóstico que existe:** se ele responde, a chave, o
modelo, a rede e o saldo estão bons. O teste de 8 tokens vira confirmação
explícita, para quando o chat **não** responde.

**7.3 · A tela passa a mostrar o estado**, que hoje ela não mostra: modelo
configurado, chave presente, último teste e resultado.

Hoje o resultado do teste **não é gravado em lugar nenhum** — recarregar a página
zera. **Passa a ser registrado**, junto com quem executou.

**7.4 · O texto de ajuda atual é preservado**, recolhido, acessível a quem
configura. **Não reescrever.**

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Chat com dados do sistema | **Prompt E**, Etapa 2 |
| Catálogo de métricas | **Prompt AA**, Parte 7 |
| Painel por tela | **Prompt E**, Etapa 1 |
| Escrita assistida | **fora, permanentemente** — 3.1 |
| Chave por tenant | ver 5.5 |
| Histórico de conversas | **BAM-3**, se for a opção 2 |
| Leitura de documento por IA | continua onde está |

---

# 9. PRESERVAÇÃO DE DADOS

**9.1** Nenhuma tabela de negócio é lida, criada ou alterada.

**9.2** As três actions de extração **não são alteradas**, salvo o registro de
consumo da 5.1, que é aditivo.

**9.3** `ai/client.ts`, `ai/erros.ts` e `ai/modelos.ts` não mudam de
comportamento.

---

# 10. NÃO REGRESSÃO

**10.1** A leitura de despesa, de fornecedor e de extrato continua funcionando
igual — mesmos limites, mesmos modelos, mesmas mensagens de erro.

**10.2** O teste de conexão continua disponível e com o mesmo resultado.

**10.3** Nenhuma tela muda de comportamento.

---

# 11. TESTES

**O escopo**

1. O assistente responde sobre telas, campos e conceitos do sistema.
2. **Pergunta sobre número, saldo ou registro recebe resposta de ausência** —
   testar com dez perguntas diferentes.
3. A resposta de ausência **sempre aponta a tela** onde o número está.
4. O assistente **não inventa valor**, nem como exemplo.
5. Não diz "consultei" nem "não encontrei registros".
6. Insistência não faz o assistente inventar — repetir a pergunta três vezes.
7. O aviso permanente sobre a ausência de dados está visível.

**A base**

8. Nenhuma resposta cita dado de tenant.
9. Nenhuma resposta descreve funcionalidade que ainda não está em produção como
   se estivesse.
10. Nenhuma resposta dá orientação fiscal ou contábil, conforme BAM-2.

**Consumo**

11. Toda chamada registra tokens, modelo, tenant, usuário e instante.
12. As três actions de extração também registram.
13. O limite por usuário e por tenant funciona, e a mensagem é clara.
14. O cache de prompt está ativo — conferir pela contagem de tokens de entrada
    entre a primeira pergunta e a segunda.
15. Quando o primário falha e a cadeia cai para o alternativo, o modelo
    efetivamente usado é registrado.

**Permissão**

16. A action usa `can`, não o papel — testar com override.
17. Sem permissão, a tela mostra `AccessDenied`, não branco.
18. O bloco de configuração só aparece para owner e admin.

**Gerais**

19. **Nenhuma consulta ao banco de dado de negócio** — conferir por inspeção e
    por log de query.
20. Nenhuma gravação em dado de negócio, por nenhum caminho.
21. Erro da API aparece traduzido.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisão de **BAM-1** — quem mantém a base, e como ela é atualizada quando um
   prompt entra em produção.
2. Decisão de **BAM-2** — até onde o assistente explica.
3. Decisão de **BAM-3** — histórico ou não.
4. A estrutura da base de conhecimento: arquivos, organização, tamanho.
5. Como o cache de prompt foi aplicado, e a economia medida.
6. **A lista de perguntas de dados testadas, com a resposta de cada uma** — é a
   verificação da Parte 4.
7. Como o consumo passou a ser registrado, nas quatro chamadas.
8. Os limites implementados, e os números adotados.
9. A correção da permissão da action.
10. Confirmação de que **nenhuma consulta a dado de negócio** acontece nesta
    tela.
11. Confirmação de que as três extrações não mudaram.
12. O registro da decisão pendente da chave por tenant.
13. Limitações encontradas.


<a id="prompt-ao"></a>


========================================================================


### ▸ 41 de 42 · PROMPT AO — Backup completo

**Bloco 7 · O que nasce depois** · Bloqueios: BAO-1 · BAO-2 · BAO-3

A Parte 6 pode ir agora; o resto depende do BM-3.

========================================================================


# PROMPT AO — BACKUP COMPLETO DOS DADOS LANÇADOS

Growth Construction · `/backup`.

Baseado na coleta `docs/TELA-BACKUP.md`. **Hoje o pacote leva 4 das 44 tabelas e
não tem chave nenhuma.** Esta tarefa o transforma no que o nome promete: uma
cópia completa do que a empresa lançou.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Esta tarefa é de LEITURA. Nenhuma escrita em dado de negócio, por nenhum
caminho.** O backup não apaga, não arquiva, não move e não marca nada. A única
escrita permitida é o registro de que um pacote foi gerado — Parte 6.

**2 · Nenhum dado é omitido por conveniência.** Se uma tabela de lançamento não
entrar no pacote, isso é **decisão declarada**, com o motivo escrito — nunca
esquecimento.

**3 · Nada vindo de mockup entra no código.**

---

# O QUE JÁ ESTÁ CERTO E NÃO SE TOCA

**1 · A honestidade do texto.** Três lugares dizem a mesma coisa — o docstring,
o card da tela e o `_leia-me.txt` dentro do ZIP: *"é apenas uma cópia. Nenhum
dado foi removido do sistema."* **Preservar nos três.**

**2 · O `_leia-me.txt` declara o que entrou e o que falhou**, incluindo os
documentos que não puderam ser baixados. **É o padrão certo, e vai crescer com
a Parte 2.**

**3 · O tratamento de falha por documento** — `try/catch` no laço, o pacote sai
incompleto mas sai, e o que faltou fica listado.

**4 · O módulo `semester.ts` é puro e testável.** Não mexer na aritmética de
semestres.

**5 · A planilha legível.** O XLSX de três abas é o que a contabilidade abre.
**Ele não é substituído** — ganha companhia, Parte 3.

---

# ORDEM DE EXECUÇÃO

| Parte | Depende de | Observação |
|---|---|---|
| **1** — o que é "dados lançados" | **BAO-1** | define o resto |
| **2** — movimento e cadastro | Parte 1 | **a distinção que faz o pacote fechar** |
| **3** — dois artefatos | Parte 2 | |
| **4** — escala | Parte 3 | **sem ela o pacote não termina de gerar** |
| **5** — dado pessoal | **BAO-2** | **pode reduzir o escopo da Parte 1** |
| **6** — auditoria do download | nada | **pode ir sozinha, hoje** |
| **7** — o nome da tela | **BAO-3** | |
| **8** — assistente de IA | Partes 1 a 4 | |

**A Parte 6 é uma linha e fecha a única operação sensível do sistema sem
rastro. Vai primeiro.**

---

# BLOQUEIOS

## BAO-1 · A lista das tabelas, confirmada uma a uma

"Dados lançados completo" precisa virar lista. A proposta está na Parte 1;
**confirmar tabela a tabela antes de implementar.**

Três grupos ficam **fora** por natureza, e a confirmação é de que isso está
certo:

| Grupo | Tabelas | Por quê |
|---|---|---|
| Autenticação | `user`, `account`, `session`, `verificationToken` | credencial, não lançamento. **`password_hash` e `mfa_secret` nunca saem do sistema** |
| Acesso | `membership` | configuração de permissão |
| Sequência | `number_sequence` | estado de contador, não lançamento — mas ver 1.4 |

**E um grupo em que a decisão não é óbvia:** `audit_log`. O **Prompt AK**, no
BAK-3, recomenda incluir. **Confirmar aqui**, porque o `meta` do log pode
carregar campo sensível — ver BAO-2.

## BAO-2 · O pacote passa a levar dado pessoal completo

Hoje o ZIP leva **o nome** do comprador, como texto na aba de Contas a Receber.

Com `cliente` inteiro, ele passa a levar **39 colunas** — CPF, endereço,
telefone, e, conforme o BM-3 do **Prompt M**, possivelmente **renda**.

**Um arquivo que sai do sistema, baixado no computador de alguém, sem rastro, é
outro nível de exposição.**

**Responder, antes de incluir `cliente`:**

1. **Quem pode baixar?** Hoje é `backup:ver`, e o contador não tem. Com dado
   pessoal dentro, isso vira permissão própria, de owner ou admin?
2. **Renda entra?** É o campo que o Prompt M está classificando como sensível.
3. **O pacote leva aviso de LGPD** no `_leia-me.txt`, dizendo o que ele contém e
   que a responsabilidade pela guarda é de quem baixou?

**Enquanto não houver resposta, `cliente` entra sem os campos que o BM-3
classificar como sensíveis**, e o `_leia-me.txt` declara a omissão — Parte 5.

## BAO-3 · O nome da tela

**"Backup & Arquivamento" promete duas coisas que a tela não faz.** Não é
backup no sentido de restauração — o banco se recupera do dump do Postgres e do
bucket R2, não daqui. E não arquiva: o próprio texto diz que nada sai do
sistema.

Com a Parte 3, ele passa a **ser** uma cópia completa dos dados lançados — mas
ainda não substitui o dump.

**Escolher uma:**

1. **"Backup de dados"**, com a tela declarando em uma linha que o backup do
   banco e do storage é responsabilidade da infraestrutura, e é outro.
2. **"Exportação completa"**, que descreve exatamente o que é e não promete
   restauração.

**Recomendação: a 1 com a declaração.** O usuário procura "backup"; encontrar e
ler a ressalva é melhor que não encontrar.

---

# PARTE 1 — O QUE É "DADOS LANÇADOS"

## 1.1 · A lista proposta

**Ver BAO-1.** Trinta e cinco tabelas, em quatro famílias:

**Estrutura** — `tenant`, `project`, `version`

**Receita** — `unit`, `cliente`, `conta_receber`, `permuta`, `reembolso`,
`recebimento_terceiro`, `repasse`

**Despesa** — `despesa`, `despesa_parcela`, `pagamento`, `documento_fiscal`,
`despesa_terceiro`, `restituicao`, `restituicao_item`, `compensacao`, `acerto`,
`acerto_item`, `rateio_obra`, `stakeholder`, `bank_account`, `chart_account`

**Operação** — `cash_entry`, `daily_closing`, `carry_over`, `medicao`,
`servico`, `medicao_servico`, `incc_rate`, `budget_line`, `budget_account`,
`stock_item`, `stock_movement`, `time_entry`, `document`

Mais os **arquivos** do R2 referenciados por `document`.

## 1.2 · As tabelas mortas entram

`rateio_obra`, `carry_over`, `compensacao`, `servico` e `medicao_servico` estão
catalogadas como escritas-sem-leitura ou sem nenhuma das duas.

**Entram assim mesmo.** Se há linha gravada, é dado que alguém lançou — e o
pacote não decide o que merece ser guardado.

## 1.3 · O que fica de fora, e por quê

Os três grupos do BAO-1, com o motivo escrito **no `_leia-me.txt`**, não só no
código. **Quem abrir o pacote precisa saber o que não está lá.**

## 1.4 · `number_sequence` é caso à parte

Não é lançamento, mas **é o estado do contador de PED** — e o **Prompt AF**
mostra que ele é reconstruível a partir do maior `num_doc` existente.

**Incluir**, como informação, no `_leia-me.txt`: prefixo, próximo número e
dígitos. **Sem isso, quem reconstruir a base a partir do pacote reemite números
já usados.**

---

# PARTE 2 — MOVIMENTO E CADASTRO SÃO RECORTADOS DIFERENTE

**É a distinção que faz o pacote fechar.**

## 2.1 · O problema do recorte por semestre

Hoje tudo é filtrado por período. Mas **cadastro não tem competência**: cliente,
fornecedor, plano de contas, conta bancária, projeto e unidade não pertencem a
um semestre.

**Um pacote com o movimento do semestre e sem o cadastro é um pacote que não
resolve:** a despesa aponta para um `fornecedor_id` que não está ali.

## 2.2 · Duas camadas

**Movimento — recortado pelo período:** `despesa`, `despesa_parcela`,
`pagamento`, `cash_entry`, `conta_receber`, `medicao`, `medicao_servico`,
`restituicao`, `restituicao_item`, `repasse`, `recebimento_terceiro`, `acerto`,
`acerto_item`, `rateio_obra`, `compensacao`, `daily_closing`, `carry_over`,
`stock_movement`, `time_entry`, `document`.

**Cadastro — íntegro, na data de geração:** `tenant`, `project`, `version`,
`unit`, `cliente`, `stakeholder`, `bank_account`, `chart_account`, `permuta`,
`reembolso`, `incc_rate`, `budget_line`, `budget_account`, `servico`,
`stock_item`.

## 2.3 · O `_leia-me.txt` declara a diferença

Com a data de corte do movimento **e** a data em que o cadastro foi capturado.
São coisas diferentes, e quem abrir o pacote seis meses depois precisa saber.

## 2.4 · O plano de pagamento é a razão de `unit` entrar inteira

A receita do sistema **não existe em tabela nenhuma** — é calculada em memória
por `expandUnitReceivables` a partir do `payment_plan` da unidade.

Isso explica as contas a receber zeradas no print: `conta_receber` só recebe
lançamento manual ou conversão de extrato.

**Sem `unit.payment_plan` no pacote, a receita não é reconstituível de jeito
nenhum.** É o defeito mais grave do backup atual.

## 2.5 · Referência que aponta para fora do recorte

Movimento do semestre pode referenciar registro que não entrou — uma despesa de
junho paga em agosto.

**O `_leia-me.txt` lista essas referências**, com a tabela e a quantidade. Não
resolver silenciosamente, não puxar o registro de fora do recorte sem declarar.

---

# PARTE 3 — DOIS ARTEFATOS, DOIS PROPÓSITOS

## 3.1 · A planilha continua

O XLSX de três abas é o que a contabilidade abre. **Não substituir.**

Ele ganha abas para o que passou a entrar — e a decisão de quais colunas
aparecem em cada aba é de legibilidade, não de completude.

## 3.2 · E entra o pacote íntegro

**JSON ou CSV por tabela, com todas as colunas e todas as chaves** — `id`,
`tenant_id`, `version_id`, `project_id` e toda FK.

**É o que falta hoje.** A planilha atual leva 8 das 36 colunas de `despesa` e
nenhuma chave: não há como recompor vínculo a partir dela.

## 3.3 · A estrutura do ZIP

```
Backup_<tenant>_<periodo>.zip
├── _leia-me.txt
├── planilha/dados_<periodo>.xlsx
├── dados/<tabela>.json          ← uma por tabela, com chaves
├── documentos/NNN_<arquivo>
└── _manifesto.json
```

## 3.4 · O manifesto

Uma tabela por linha: **quantas linhas entraram, qual o recorte aplicado, e a
soma de controle** das colunas de valor.

**É o que permite conferir que o pacote está completo** sem abrir arquivo por
arquivo — e é o que um restore futuro usaria para validar.

## 3.5 · O pacote continua não restaurando

**Esta tarefa não cria importação.** O formato passa a **permitir** restauração;
implementá-la é outra decisão, e perigosa.

**O texto continua dizendo isso** — em três lugares, como hoje.

---

# PARTE 4 — ESCALA

**Sem esta parte, o pacote completo não termina de gerar.**

## 4.1 · Três problemas somados, que hoje já existem

**Quatro consultas sem filtro de período** — pedir 2024-H1 lê a história
inteira do tenant e recorta em memória.

**Download de documentos em série** — laço sequencial com `await` dentro. Com
150 ms de latência, 400 documentos somam um minuto só de espera; com 400 ms,
quase três.

**Tudo em memória ao mesmo tempo** — o ZIP inteiro é materializado antes de a
resposta começar. Com o limite de 10 MB por upload, 400 documentos podem ser
vários GB no processo.

**Com 35 tabelas em vez de 4, isso deixa de ser risco e vira certeza.**

## 4.2 · O recorte vai para o SQL

Cada consulta filtra pelo período **no `where`**. Nenhuma tabela é carregada
inteira para ser descartada depois.

## 4.3 · A geração deixa de ser síncrona

O pacote passa a ser **gerado em segundo plano e disponibilizado para download**
— no R2, com link temporário.

**A tela mostra o progresso** e o histórico de pacotes gerados. **Nunca mais uma
requisição que morre em silêncio depois de dois minutos.**

## 4.4 · Documentos em paralelo, com concorrência limitada

Seis a dez simultâneos, não quatrocentos em série e não quatrocentos de uma vez.

## 4.5 · O tratamento de falha permanece

Documento que falha é registrado e o pacote sai incompleto, com a lista no
`_leia-me.txt`. **É o comportamento certo, e agora vale para tabela também:**
consulta que falhar é declarada, não silenciada.

---

# PARTE 5 — DADO PESSOAL

**Ver BAO-2.**

**5.1** O pacote passa a conter o cadastro completo dos compradores. Hoje leva
só o nome.

**5.2 · O `_leia-me.txt` declara o que o pacote contém** em termos de dado
pessoal, e que a guarda é responsabilidade de quem baixou.

**5.3 · Campo classificado como sensível pelo BM-3 do Prompt M fica de fora até
haver decisão**, e a omissão é declarada — não silenciosa.

**5.4 · A permissão pode deixar de ser `backup:ver`** e virar própria, conforme
o BAO-2.

**5.5 · `audit_log`, se entrar, carrega o `meta` de todas as actions** — e o
**Prompt AK** ainda está decidindo o que pode aparecer ali. **Não incluir antes
daquela decisão.**

---

# PARTE 6 — AUDITORIA DO DOWNLOAD

**Vai primeiro, e é uma linha.**

**6.1** A rota tem 27 linhas e **não importa `@/lib/audit`**. Não há registro de
quem baixou, quando, nem qual período.

O pacote contém despesas, contas a receber, caixa e **todos os documentos
fiscais** — e é **a única operação sensível do sistema que não passa pelo
`audit_log`**.

**6.2 · Passa a gravar:** período, quem, quando, e o que o pacote continha —
contagem por tabela e total de documentos.

**6.3 · O registro resolve outro problema:** hoje **ninguém sabe se o semestre
encerrado já foi salvo**. O aviso do topo responde *"o último semestre encerrado
tem dados?"* e reaparece a cada carregamento, tenha o backup sido baixado ou
não.

**Com o registro, o aviso passa a dizer a verdade** — e a tabela de semestres
ganha a coluna "último backup".

**6.4** A rota aceita qualquer `?sem=` que o parser entenda, inclusive o
semestre corrente. **Continua aceitando** — baixar o período em andamento é
legítimo. O que muda é que fica registrado.

---

# PARTE 7 — O NOME E O QUE A TELA DECLARA

**Ver BAO-3.**

**7.1** O nome muda conforme a decisão.

**7.2 · A tela declara, em uma linha, que o backup do banco e do storage é
outro** — responsabilidade da infraestrutura. Hoje o nome sugere que quem baixa
está protegido.

**7.3 · "Encerrado" continua sendo calendário puro.** Não consulta
`daily_closing`, `version.locked` nem fechamento contábil — e **semestre
encerrado continua recebendo lançamento**.

**A tela passa a dizer isso**, e a coluna de último backup ganha sentido: um
pacote de junho pode estar desatualizado em setembro.

---

# PARTE 8 — ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura.**

**8.1 · Ações**

- **O que este pacote contém** — leitura do manifesto em linguagem clara.
- **O que mudou desde o último backup** — lançamentos criados ou alterados
  depois da última geração daquele período.
- **Períodos sem backup** — quais semestres encerrados nunca foram baixados.

**8.2 · Nunca**

- **Nunca gerar, baixar ou disparar pacote.** Exportação de dado é ato humano.
  **Fora da Etapa 3 do Prompt E, permanentemente.**
- **Nunca exibir conteúdo de dado pessoal do pacote** — ele fala do manifesto,
  não das linhas.

---

# 9. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Restauração a partir do pacote | **fora** — ver 3.5 |
| Backup do banco e do R2 | infraestrutura |
| Campos sensíveis de cliente | **Prompt M**, BM-3 |
| O que pode aparecer no `meta` do log | **Prompt AK**, BAK-2 |
| Expurgo ou arquivamento real | **fora** — nada sai do sistema |
| Escrita assistida | **fora, permanentemente** — 8.2 |

---

# 10. PRESERVAÇÃO DE DADOS

**10.1** Tarefa de leitura. Nenhuma tabela de negócio é alterada.

**10.2** A única escrita é o registro da Parte 6 — tabela nova ou `logAudit`,
aditiva.

**10.3** Nenhum documento do R2 é movido, renomeado ou removido.

---

# 11. NÃO REGRESSÃO

**11.1** A planilha de três abas continua saindo, com as mesmas colunas e o
mesmo formato. **Quem já usa o arquivo não precisa mudar nada.**

**11.2** O `_leia-me.txt` continua existindo e continua declarando o que
falhou.

**11.3** `semester.ts` não muda.

**11.4** Nenhuma tela muda de comportamento.

---

# 12. TESTES

**Completude**

1. O pacote contém as 35 tabelas da lista, cada uma no seu arquivo.
2. Tabela vazia gera arquivo vazio declarado, **não ausência de arquivo**.
3. Todas as chaves estão presentes — `id`, `tenant_id`, FKs.
4. `unit.payment_plan` está no pacote, íntegro.
5. O manifesto bate com o conteúdo, tabela a tabela.
6. O que ficou de fora está declarado no `_leia-me.txt`.
7. `number_sequence` aparece como informação.

**Recorte**

8. Movimento respeita o período; cadastro vem íntegro.
9. As duas datas estão declaradas.
10. Referência que aponta para fora do recorte é listada.
11. Nenhuma consulta carrega a tabela inteira para descartar em memória.

**Escala**

12. Pacote com 400 documentos **termina de gerar**.
13. A geração em segundo plano informa progresso.
14. Documento que falha não derruba o pacote, e aparece na lista.
15. Consulta que falha é declarada, não silenciada.

**Dado pessoal**

16. Campo sensível conforme BM-3 **não está** no pacote, e a omissão está
    declarada.
17. O `_leia-me.txt` traz o aviso de guarda.
18. Só quem tem a permissão decidida no BAO-2 baixa.

**Auditoria**

19. Todo download grava período, usuário, instante e conteúdo.
20. A tabela de semestres mostra o último backup de cada um.
21. O aviso do topo some quando o semestre já foi baixado.

**Gerais**

22. **Nenhuma escrita em dado de negócio** — contagem de todas as tabelas antes
    e depois.
23. A planilha antiga sai igual.
24. Assistente não gera nem baixa pacote.

---

# 13. RELATÓRIO FINAL OBRIGATÓRIO

1. Decisão de **BAO-1** — a lista final, tabela a tabela, com o motivo de cada
   exclusão.
2. Decisão de **BAO-2** — quem baixa, o que fica de fora, e o aviso adotado.
3. Decisão de **BAO-3** — o nome.
4. A estrutura do pacote e o formato do manifesto.
5. Como o recorte de movimento e o snapshot de cadastro foram separados.
6. Como a geração passou a ser assíncrona, e onde o pacote fica.
7. Os tempos medidos: pacote pequeno, médio e com 400 documentos.
8. Como o download passou a ser auditado, e o que o registro guarda.
9. Como o aviso do topo passou a considerar o histórico.
10. Confirmação de que nenhuma escrita em dado de negócio acontece.
11. Confirmação de que a planilha antiga continua idêntica.
12. As referências fora do recorte encontradas no primeiro pacote real.
13. Limitações encontradas.


<a id="prompt-ag"></a>


========================================================================


### ▸ 42 de 42 · PROMPT AG — Emissor de NFS-e

**Bloco 7 · O que nasce depois** · Bloqueios: BAG-1 · BAG-2 · BAG-3 · BAG-4 · BAG-5

Depende de AH. O BAG-1 é pergunta de negócio.

========================================================================


# PROMPT AG — EMISSOR DE NFS-e

Growth Construction · tela nova, rota sugerida `/notas`.

**O cadastro fiscal existe e o caminho de emissão existe em código — falta quem
os chame.** `emitirNfse`, `consultarNfse` e `cancelarNfse` (`fiscal/focus.ts`),
`montarPayloadNfse` (`fiscal/nfse-payload.ts`) e `calcularNfse` / `validarNfse` /
`naturezaPorMunicipio` (`calc/nfse.ts`) estão implementados e testados, e
**nenhum é chamado por nada** fora dos próprios testes.

---

# NOMENCLATURA DAS TELAS — LER ANTES DE TUDO

| Rota | Nome antigo | Nome novo | Quem renomeia |
|---|---|---|---|
| `/budget` | Lançamento Budget | **Orçamentos** | Prompt D, seção 2 |
| `/forecast` | Lançamento Forecast | **Previsão Atualizada** | Prompt D, seção 2.5 |
| `/reembolso` | Reembolso | **Liberações de Obra** | Prompt O, seção 1 |
| `/projeto` | Projetos & Unidades | **Projetos** | Prompt B, seção 7 |
| `/restituicoes` | Restituições | **Ressarcimentos** | Prompt T, seção 1 |

**"Obra" é dado do cliente; "projeto" é o termo do produto** — seção 2 do
**Prompt C**.

**Cuidado com o nome "documento fiscal".** `documento_fiscal` é a nota
**recebida** de fornecedor, filha de `despesa`. Esta tela trata da nota
**emitida**. **Não reaproveitar aquela tabela**, não estender, não renomear.

---

## ⚠ REGRA GLOBAL — ACIMA DE QUALQUER SEÇÃO

**1 · Nenhum dado inputado pela empresa pode ser alterado.** Esta tarefa **cria**
estrutura. Nenhuma despesa, conta a receber, unidade, medição ou versão é
alterada por ela.

**2 · Nota emitida é documento externo e irrevogável.** Uma vez autorizada pela
prefeitura, ela **nunca** é editada, apagada ou reemitida. Correção é
cancelamento com motivo, ou substituição — ambos preservando o registro
original. **Nenhum `UPDATE` destrutivo, nenhum `DELETE`, em nenhuma hipótese.**

**3 · Nada vindo de mockup entra no código.** CNPJ, alíquota, código IBGE,
número de nota e valores dos mockups são ilustração.

**4 · O assistente não emite, não cancela e não grava nada.**

---

# ONDE A TELA FICA

Módulo **Receitas**, subitem **Notas Fiscais**. O fato gerador é serviço
prestado — é receita, não configuração.

O cadastro do emitente permanece em **Configurações › Empresa**. São coisas
diferentes: lá se cadastra quem emite; aqui se emite.

---

# BLOQUEIOS — NENHUMA LINHA DE CÓDIGO ANTES DESTES

## BAG-1 · Qual é o fato gerador da nota?

**É a pergunta que define a tela inteira, e ela é de negócio, não de código.**

Venda de unidade residencial **não gera NFS-e** — é operação imobiliária, com
ITBI e tributação própria. Se a tela nascer assumindo que cada venda emite nota,
ela emite nota indevida.

**Os candidatos, e o que cada um implica:**

| Fato gerador | Quem é o tomador | Origem do valor |
|---|---|---|
| **Medição aprovada** — empreitada ou administração | o contratante da obra | `medicao`, por competência |
| **Parcela de contrato de prestação de serviço** | o contratante | `conta_receber` |
| **Serviço avulso** | qualquer | digitado |

**Responder:** a Construtora Piloto presta serviço de construção para quem? Há contrato de
empreitada ou administração? A nota acompanha a **medição** entregue à Caixa, ou
o recebimento?

**Não implementar nenhuma origem automática antes desta resposta.** A estreia
pode ser **só serviço avulso**, com o valor digitado e conferido — é o escopo
mais seguro, e o item 4.2.5 do **Prompt E** diz exatamente isso sobre estreias.

## BAG-2 · Nota emitida vira receita? **Não.**

**Regra fixa, salvo decisão explícita em contrário:** a emissão da nota **não
cria receita, não cria conta a receber e não entra na DRE**.

A seção 57 do **Prompt I** fecha a receita da DRE em duas fontes: venda de
unidade rateada e `conta_receber` sem origem em plano. **A nota é documento do
fato, não o fato.** Se ela gerar lançamento, o mesmo dinheiro é reconhecido duas
vezes — uma pela fonte da seção 57, outra pela nota.

**O vínculo é o inverso:** a nota **aponta** para o que já existe — a medição, a
conta a receber, o contrato. A tela mostra o vínculo; não o cria.

Confirmar por escrito. Se a decisão for que a nota gera conta a receber, isso
**muda a seção 57** e precisa entrar lá, não aqui.

## BAG-3 · O token é único para todos os tenants

`tokenFocus(ambiente)` lê `FOCUS_NFE_TOKEN_PRODUCAO`,
`FOCUS_NFE_TOKEN_HOMOLOGACAO` ou `FOCUS_NFE_TOKEN` — **nenhum parâmetro de
tenant, nenhuma coluna de token no banco.**

A decisão de manter a credencial fora do banco está certa e documentada
(`focus.ts:18–19`, `schema.ts:106–108`). **A decisão de ter um token só para
todas as empresas é outra coisa, e não está registrada em lugar nenhum.**

Duas empresas no mesmo token compartilham a conta do provedor, a numeração dele e
a fatura. E a `ref` é "única por token" (`focus.ts:11–12`).

**Responder:** o sistema emite para um CNPJ só, ou para vários? Se for para
vários:

1. **Token por tenant, fora do banco** — variável de ambiente por tenant, ou
   secret manager. Mantém a decisão original e resolve o isolamento.
2. **Token em coluna cifrada** — contraria a decisão registrada. Só com
   justificativa escrita.

**Enquanto não houver resposta, a emissão fica restrita a um tenant**,
declarado em configuração, e a tela recusa nos demais com o motivo escrito.

## BAG-4 · Homologação não produz dado de negócio

Nota emitida em homologação **não tem valor fiscal**. O ambiente é por tenant
(`tenant.fiscal_ambiente`, default `homologacao`).

**Regra fixa:** nota emitida em homologação é gravada, visível e claramente
marcada — **e não conta em nenhum relatório, nenhum total, nenhuma exportação
para o contador.** Ela existe para testar o caminho.

**A marcação acompanha a nota para sempre**, inclusive no PDF baixado. Uma nota
de homologação impressa e arquivada como se fosse real é o pior desfecho desta
tela.

## BAG-5 · O que `calc/nfse.ts` já decide

Antes de desenhar o formulário, é preciso saber o que o cálculo já resolve.
**Coleta, sem análise:**

```
Não altere nada. Gere docs/EMISSOR-CALCULO.md contendo, na íntegra e com
o caminho de cada arquivo como cabeçalho:

1. src/lib/calc/nfse.ts inteiro
2. src/lib/fiscal/nfse-payload.ts inteiro
3. src/lib/fiscal/focus.ts inteiro
4. src/lib/fiscal/tipos.ts inteiro
5. os três arquivos de teste correspondentes
6. perguntas:
   a) Quais retenções calcularNfse trata — ISS retido, IRRF, PIS,
      COFINS, CSLL, INSS? Colar as regras e os limites de cada.
   b) O que naturezaPorMunicipio faz, e para quais municípios?
   c) validarNfse recusa o quê? Lista completa.
   d) refDaNota deriva de quê? É estável entre tentativas?
   e) emitirNfse é síncrono ou devolve protocolo? Como o resultado é
      consultado depois?
   f) O que acontece quando o provedor devolve erro — exceção, objeto
      de erro, retry?
   g) Existe tratamento de RPS, série e numeração própria, ou a
      numeração é do provedor?
```

**O desenho do formulário depende de (a) e de (g).**

---

# 1. A ESTRUTURA NOVA

**1.1 · Uma tabela nova, aditiva:** `nota_servico`. **Não estender
`documento_fiscal`**, que é nota recebida.

**1.2 · Campos mínimos** — os detalhes de payload saem do BAG-5:

| Grupo | Campos |
|---|---|
| Identidade | `id`, `tenant_id`, `project_id`, `version_id` |
| Provedor | `ref`, `protocolo`, `numero`, `serie`, `codigo_verificacao` |
| Situação | `status`, `ambiente`, `mensagem_retorno` |
| Tomador | dados do tomador no momento da emissão |
| Valores | valor do serviço, alíquota, ISS, retenções, valor líquido |
| Descrição | discriminação do serviço, competência, item da LC 116 |
| Arquivos | `pdf_key`, `xml_key` no R2 |
| Vínculo | `origem_tipo` + `origem_id` — conforme BAG-1 |
| Rastro | `created_by`, `created_at`, `cancelada_em`, `motivo_cancelamento` |

**1.3 · A nota é fato real: vive na versão Atual.** Seção 2 do **Prompt I**.
Nenhuma nota em versão de planejamento, por nenhum caminho.

**1.4 · Os dados do tomador são copiados no momento da emissão**, não
referenciados. O cliente pode mudar de endereço depois; a nota emitida não muda.
É o mesmo princípio de documento emitido.

**1.5 · Todas as migrações são aditivas**, com `IF NOT EXISTS` e `down`.

---

# 2. O CICLO DE VIDA

Cinco situações, e **nenhuma transição apaga a anterior**:

| Situação | O que é |
|---|---|
| **Rascunho** | montada, ainda não enviada. Editável. |
| **Processando** | enviada ao provedor, aguardando a prefeitura. **Não editável.** |
| **Autorizada** | número, código de verificação, PDF e XML disponíveis |
| **Rejeitada** | a prefeitura recusou, com o motivo do provedor |
| **Cancelada** | autorizada e depois cancelada, com motivo e data |

**2.1 · De Rascunho a Processando é o ponto sem volta.** A tela declara isso
antes de enviar, com o resumo do que será emitido — valor, tomador, alíquota,
ISS, retenções e ambiente.

**2.2 · Rejeitada não é erro do sistema.** A mensagem do provedor é exibida na
íntegra, e a nota **permanece** como rascunho corrigível, com o histórico da
tentativa. Nova tentativa é nova `ref` — ver 3.2.

**2.3 · A consulta é assíncrona.** `emitirNfse` devolve protocolo; a autorização
vem depois. A tela precisa de um caminho de atualização — botão explícito na
estreia, agendamento depois. **Não implementar polling automático sem decisão**:
cada consulta é chamada ao provedor.

**2.4 · Nenhuma situação volta.** Autorizada não vira rascunho. Cancelada não
vira autorizada.

---

# 3. IDEMPOTÊNCIA — A REGRA MAIS IMPORTANTE

**Emitir nota duas vezes por engano é emitir duas notas.** Não há desfazer; há
cancelamento, com prazo e, em alguns municípios, com custo.

**3.1 · O padrão existe e se reaproveita:** `actions/restituicoes.ts` — chave por
tentativa renovada só após sucesso, colisão de índice tratada como sucesso,
`SELECT ... FOR UPDATE`. **Copiar esse padrão, não inventar outro.**

**3.2 · A `ref` é derivada do registro**, não gerada a cada chamada
(`tipos.ts:67–69`). Duplo clique envia a mesma `ref`, e o provedor devolve a nota
já emitida em vez de emitir outra.

**Nova tentativa depois de rejeição gera nova `ref`** — senão o provedor devolve
a rejeição antiga. A regra precisa estar explícita no código, com comentário.

**3.3 · `UNIQUE` em `(tenant_id, ref)`**, e a colisão tratada como sucesso, não
como erro.

**3.4 · O envio acontece dentro de transação** que grava a nota e a `ref` antes
da chamada externa. Chamada de rede fora de transação, resultado gravado depois —
**e o registro existindo antes**, para que uma falha de rede não produza nota
emitida no provedor e invisível no sistema.

**3.5 · Se o provedor não responder**, a nota fica em Processando com a `ref`
registrada. **Nunca reenviar automaticamente.** A consulta por `ref` resolve o
estado real.

---

# 4. PRÉ-CONDIÇÕES DE EMISSÃO

**4.1 · O cadastro fiscal precisa estar completo.** `emitentePronto`
(`emitente-fiscal.ts:373–375`) já conta os bloqueios de `checarProntidaoFiscal`.

Com pendência de bloqueio, **a tela não oferece o botão de emitir** — e mostra a
lista de pendências com link para `/empresa`. Não adianta tentar: a API recusa.

**4.2 · O token precisa existir para o ambiente escolhido.** `focusConfigurado`
já responde isso. Sem token, a tela declara e não oferece envio.

**4.3 · As validações que o servidor hoje não faz.** O **Prompt AH**
registra que CEP, código IBGE e UF são apenas normalizados na gravação, embora o
checklist os chame de bloqueio.

**Para a emissão isso deixa de ser tolerável:** código IBGE errado emite nota no
município errado. `validarNfse` precisa rodar **antes** do envio, e a recusa
aparece na tela, não no retorno do provedor.

---

# 5. A TELA

**5.1 · Lista de notas** — data, número, tomador, valor, situação, ambiente. Com
filtro por projeto, período e situação.

**5.2 · Nota de homologação aparece marcada em toda linha**, e o filtro padrão
separa as duas. BAG-4.

**5.3 · O formulário de emissão** — tomador, discriminação do serviço,
competência, valor, item da LC 116, alíquota, retenções. Os campos do emitente
vêm do cadastro e **não são editáveis aqui**.

**5.4 · O resumo antes de enviar** exibe, campo a campo, o que será emitido:
valor bruto, ISS, cada retenção, valor líquido, tomador, ambiente. **É a última
tela antes do ponto sem volta.**

**5.5 · PDF e XML** ficam no R2, com as chaves na nota. Download pela tela.
**Nota de homologação leva a marcação no nome do arquivo.**

**5.6 · Cancelamento** exige motivo escrito, permissão própria, e confirmação com
o número da nota digitado. Preserva o registro — é o padrão `estornarAcerto`,
retificação no sentido da ITG 2000.

**5.7 · Nada é apagado.** Não existe excluir nota, em nenhuma situação.

---

# 6. PERMISSÃO

**6.1** Tela nova em `SCREENS`, com enforcement central.

**6.2 · Emitir e cancelar são permissões separadas de ver.** Cancelar tem
permissão própria — é ato com efeito externo e, às vezes, custo.

**6.3** Verificação **na action que emite**, no servidor, sempre. A confirmação
humana não substitui a permissão — item 4.2.2 do **Prompt E**.

**6.4** O perfil **contador** vê as notas e não emite.

---

# 7. ASSISTENTE DE IA

Segue o **Prompt E**, Etapa 1. **Somente leitura, sem exceção.**

**7.1 · Ações**

- **Conferir antes de emitir** — o que está incompleto no cadastro do emitente
  ou do tomador, e o que `validarNfse` recusaria.
- **Notas rejeitadas** — agrupadas pelo motivo do provedor, que costuma se
  repetir.
- **Notas em processamento há muito tempo** — as que ficaram sem resposta.
- **Explicar o cálculo** — como se chegou ao ISS e a cada retenção.

**7.2 · Nunca**

- **Nunca emitir, cancelar ou enviar** — por nenhum caminho, nem com
  confirmação. Esta é a tela onde a Etapa 3 do Prompt E **não se aplica**, e o
  item 4.2.5 daquele prompt é explícito: a estreia da escrita assistida não pode
  ser em documento com efeito contábil já emitido.
- **Nunca sugerir alíquota, item da LC 116 ou código de município.** São decisões
  tributárias.
- **Nunca afirmar que a nota está correta.** Ele lista o que encontrou.

**7.3 · Dado do tomador é dado pessoal de terceiro** — BE-2 do Prompt E. CPF,
endereço e e-mail do tomador não vão ao modelo sem a decisão daquele bloqueio.

---

# 8. FORA DE ESCOPO

| Item | Dono |
|---|---|
| Cadastro do emitente | **Prompt AH** |
| Nota recebida de fornecedor | `documento_fiscal`, **Prompt S** |
| Reconhecimento de receita | **Prompt I**, seções 54 a 58 |
| Geração automática de nota a partir de medição | **BAG-1**, e só depois |
| Token por tenant | **BAG-3** |
| Escrita assistida | **fora, permanentemente** — 7.2 |
| Emissão em lote | fora da estreia |
| NF-e de produto, NFC-e | fora — o sistema presta serviço |

---

# 9. PRESERVAÇÃO DE DADOS

**9.1** Tarefa de criação. Nenhuma tabela existente é alterada, além da coluna de
vínculo que o BAG-1 definir — aditiva, anulável, **sem preenchimento
retroativo**.

**9.2** Nenhuma nota é apagada. Nenhum `UPDATE` em nota autorizada, exceto os
campos de cancelamento.

**9.3** PDF e XML no R2 nunca são substituídos. Novo arquivo é nova chave.

---

# 10. NÃO REGRESSÃO

**10.1** Nenhum número de nenhum relatório muda por esta tarefa. DRE, Fluxo de
Caixa, Contas a Receber, Dashboard e Resumo continuam idênticos — **é a
verificação direta do BAG-2.**

**10.2** `calc/nfse.ts`, `fiscal/nfse-payload.ts` e `fiscal/focus.ts` **não são
alterados** sem justificativa escrita. Eles têm teste; a tela é que passa a
chamá-los.

**10.3** A tela Empresa continua funcionando igual.

---

# 11. TESTES

**Idempotência**

1. Duplo clique em "Emitir" produz **uma** nota.
2. Duas requisições simultâneas com a mesma `ref` produzem uma nota.
3. Falha de rede depois do envio deixa a nota em Processando, com `ref`
   registrada — e a consulta resolve o estado real.
4. Reenvio após rejeição usa `ref` nova.
5. `UNIQUE (tenant_id, ref)` existe, e a colisão é tratada como sucesso.

**Ciclo de vida**

6. Nota autorizada não pode ser editada por nenhum caminho.
7. Nota autorizada não pode ser excluída por nenhum caminho.
8. Cancelamento exige motivo e preserva o registro original.
9. Rejeitada exibe a mensagem do provedor na íntegra.
10. Nenhuma situação retrocede.

**Homologação**

11. Nota de homologação **não aparece** em nenhum relatório, total ou
    exportação.
12. A marcação de homologação aparece na lista, no detalhe e no PDF baixado.
13. Trocar o ambiente na tela Empresa não altera nota já emitida.

**Pré-condições**

14. Cadastro fiscal com pendência de bloqueio não oferece o botão de emitir.
15. Sem token para o ambiente, a tela declara e não envia.
16. `validarNfse` roda antes do envio, e a recusa aparece na tela.
17. Código IBGE inválido é barrado antes de sair.

**Efeito contábil**

18. **Emitir nota não cria conta a receber, despesa, lançamento de caixa nem
    receita** — conferir por contagem antes e depois.
19. DRE, Fluxo, Contas a Receber e Dashboard devolvem os mesmos totais.

**Permissão e isolamento**

20. Quem tem ver e não tem emitir não emite, testado chamando a action direto.
21. Cancelar exige a permissão própria.
22. Nenhuma nota de um tenant aparece para outro.
23. Toda consulta tem filtro de tenant explícito.

**Assistente**

24. O assistente não emite nem cancela por nenhum caminho.
25. Dado do tomador não vai ao modelo, conforme BE-2.
26. Assistente não grava nada.

---

# 12. RELATÓRIO FINAL OBRIGATÓRIO

1. Respostas de **BAG-1** a **BAG-4**, por escrito.
2. Resultado da coleta do **BAG-5**, e o que ela mudou no desenho.
3. A estrutura criada: tabela, colunas, índices, relações.
4. Como a `ref` é derivada, e como a renovação após rejeição funciona.
5. Como a idempotência foi implementada, e qual padrão foi reaproveitado.
6. Como a nota fica visível quando o provedor não responde.
7. Como a marcação de homologação acompanha a nota até o PDF.
8. **Confirmação, por contagem antes e depois, de que emitir nota não cria
   nenhum lançamento de negócio.**
9. Como as pré-condições bloqueiam a emissão, e o que a tela mostra em cada
   caso.
10. As permissões criadas, e onde são verificadas.
11. Confirmação de que `calc/nfse.ts`, `nfse-payload.ts` e `focus.ts` não foram
    alterados.
12. Funcionamento do assistente, e confirmação de que ele não emite nem cancela.
13. Migrações criadas, com `down`.
14. Limitações encontradas.

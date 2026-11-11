# Revisão 4 · Etapa 3 · Prompt AQ (Cris) e Prompt AV (voz) — relatório

**Data:** 11/11/2026 · **Spec:** `docs/revisao/SPEC-REVISAO-2026-11.md`, Anexo B

Esta etapa saiu em dois PRs:

- **parte 1:** §1 a §4 (PR #282);
- **parte 2:** §5 (colar no chat), §6 (bateria de anexos) e o Prompt AV
  (ditado por voz).

## §1 · O que a base dizia sobre privacidade (C3) e o código morto (C6)

**O problema:** a base dizia que "só o texto da pergunta vai ao modelo", e a
Cris repetia isso ao usuário. Era falso desde 15/10. Agora:

- A seção "O assistente" descreve a Cris de hoje, na ordem da spec:
  1. o que ela faz;
  2. o que vai ao modelo;
  3. o que não vai;
  4. a exceção do anexo;
  5. que a conversa não é gravada.
- As frases das linhas ~28, ~108, ~153 e ~272 de `receitas-obra-pessoas.ts`
  passaram para a forma verdadeira.
- Em `regrasDaCris()`:
  - entrou a regra "Nunca diga que só a pergunta vai ao modelo";
  - a regra antiga "documento de cliente ou funcionário não chega até você"
    (também falsa com anexo) virou: "não vem no bloco `<tela>`; se o anexo
    trouxer nome, CPF ou contato, não coloque na resposta nem na proposta".
- Um teste novo (`src/lib/cris-privacidade-base.test.ts`) trava o texto: as
  frases falsas não podem voltar, e a seção tem as cinco partes, na ordem.

**Antes × depois** (linhas `-` saíram, `+` entraram):

    --- a/src/lib/assistente-base/conceitos-despesas-caixa.ts
    -- **Chat (botão no canto inferior direito, em qualquer tela)**: responde **receita** (DRE, por cenário), **custo** (Custo Variável + Custo Fixo), **desvio de custo** (Atual × Orçamento) e **saldo** das contas da empresa.
    -  - Os números são calculados no próprio sistema, com as regras dos relatórios. Só o texto da pergunta vai ao modelo, para entender o pedido; números, nomes e cadastros não vão.
    -  - Sem a permissão de ver a tela de origem, o chat diz que não tem acesso. A pergunta não é gravada. Fora desses temas, o chat diz que ainda não responde.
    +- **A Cris (chat no canto inferior direito, em qualquer tela)**:
    +  - **O que ela faz:** explica como o sistema funciona; analisa os números da tela em que a pessoa está; busca em outras telas as quatro métricas do catálogo (**receita**, **custo**, **desvio de custo** e **saldo** das contas da empresa), sempre com o acesso da pessoa; e, nas telas de lançamento, **propõe** o preenchimento do formulário. Quem grava é o botão da tela, depois que a pessoa confere.
    +  - **O que vai ao modelo de IA:** a pergunta e o histórico da conversa nesta aba (até 12 falas); o **resumo dos números da tela** que a pessoa está vendo, com o nome da obra e os valores; o **resultado das buscas** de receita, custo, desvio e saldo, também com nome da obra e valores; e o **documento anexado, inteiro** (PDF ou imagem).
    +  - **O que não vai:** o que a tela não mostra; o cadastro completo de clientes, funcionários ou fornecedores; o histórico de outras conversas; e, do resumo da tela, os campos com dado pessoal, que o sistema descarta antes de enviar (CPF, CNPJ, RG e documentos, e-mail, telefone, endereço e CEP, renda, salário, FGTS, score e restrições, nascimento, saúde, Pix, conta e agência bancária, senhas).
    +  - **A exceção é o anexo:** o documento vai inteiro ao modelo, com tudo o que estiver escrito nele, inclusive nome, CPF ou endereço de uma pessoa. A Cris não usa nome de cliente nem de funcionário para preencher o formulário, mas o modelo lê o documento. Só anexe o que precisa ser lido.
    +  - **A conversa não é gravada.** O sistema registra só o consumo (quantas perguntas e quantos tokens, por empresa e pessoa), nunca o conteúdo.
    +  - Sem a permissão de ver a tela de origem, ela diz que não tem acesso.
    --- a/src/lib/assistente-base/receitas-obra-pessoas.ts
    -- A Cris **não** preenche a ficha do cliente nem lê documento pessoal dele: dado pessoal não vai ao modelo.
    +- A Cris **não** preenche a ficha do cliente. O anexo do chat (📎) funciona em qualquer tela, inclusive aqui: se alguém anexar um documento do cliente, o modelo lê o documento inteiro, com nome e CPF. Os documentos de venda ficam no bloco de documentos da ficha, não na Cris.
    -- **Lançar com a Cris**: diga, dite ou anexe o que receber (ex.: "sinal de 20 mil da unidade A101 vencendo dia 10"). A Cris preenche o formulário Nova conta a receber (projeto, tipo, valor, vencimento, descrição, unidade e banco) e quem grava é Adicionar. O cliente é escolhido à mão: o nome do comprador não vai ao modelo.
    +- **Lançar com a Cris**: diga, dite ou anexe o que receber (ex.: "sinal de 20 mil da unidade A101 vencendo dia 10"). A Cris preenche o formulário Nova conta a receber (projeto, tipo, valor, vencimento, descrição, unidade e banco) e quem grava é Adicionar. A Cris não preenche o cliente; ele é escolhido à mão. Se o documento anexado tiver o nome, o modelo lê o documento, mas o nome não vai para o formulário.
    -- **Lançar com a Cris**: no ativo novo ou na edição, diga, dite ou anexe o laudo, o contrato ou a foto. A Cris preenche unidade, data, tipo, descrição, valor estimado e os dados da revenda; quem grava é Salvar. O cliente é escolhido à mão: o nome não vai ao modelo.
    +- **Lançar com a Cris**: no ativo novo ou na edição, diga, dite ou anexe o laudo, o contrato ou a foto. A Cris preenche unidade, data, tipo, descrição, valor estimado e os dados da revenda; quem grava é Salvar. A Cris não preenche o cliente; ele é escolhido à mão. Se o documento anexado tiver o nome, o modelo lê o documento, mas o nome não vai para o formulário.
    -- **Com a Cris**: ela preenche só o **vínculo de trabalho** (cargo, setor, obra, tipo e prazo do contrato, admissão e observação) e abre o formulário de novo funcionário. Nome, documentos, nascimento, filiação, endereço, jornada, salário e dados bancários são preenchidos à mão, porque dado pessoal do funcionário não vai ao modelo. Quem cadastra é o botão "Cadastrar".
    +- **Com a Cris**: ela preenche só o **vínculo de trabalho** (cargo, setor, obra, tipo e prazo do contrato, admissão e observação) e abre o formulário de novo funcionário. Nome, documentos, nascimento, filiação, endereço, jornada, salário e dados bancários são preenchidos à mão: a Cris não preenche dado pessoal do funcionário. Se o documento anexado (CTPS, contrato) tiver esses dados, o modelo lê o documento, mas eles não vão para o formulário. Quem cadastra é o botão "Cadastrar".


**BAQ-1, respondido pelo código.** `perguntarAoAssistente` e
`interpretarPergunta` só eram chamados entre si e pelo teste do próprio chat
antigo (`src/lib/actions/assistente-chat.test.ts`). Nenhuma rota de
`src/app/api/agent/*`, nenhum worker e nenhum import dinâmico os usa. Foram
removidos:

- os dois arquivos;
- o teste deles;
- `promptDoChat` e `MAX_PERGUNTA`, que só eles usavam.

De `src/lib/assistente-chat.ts` ficou o que a Cris usa: `CATALOGO`,
`normalizarIntencao` e `interpretarLocalmente`.

**BAQ-2, respondido pelo código.** A tela de Clientes **não recusa** anexo:

- o 📎 do chat da Cris aparece em todas as telas
  (`src/components/app/chat-assistente.tsx:242`);
- o servidor aceita o arquivo sem olhar a tela
  (`src/lib/actions/cris.ts:44`).

A tela de Clientes não declara formulário para a Cris, então ela não preenche
a ficha. Mas um documento anexado ali vai inteiro ao modelo. A frase da linha
~28 foi corrigida para dizer isso.

**Decisão sua, se quiser:** bloquear o anexo na tela de Clientes (e em
Funcionários). Hoje não há bloqueio. É o item 5 da bateria de anexos.

## §2 · Permissão da Cris pelo item do menu (C4)

- Função pura nova `permissaoDaRota(rota, perms)` em `src/lib/nav-menu.ts`:
  - acha o item do menu da rota (por `href`, `tambem` e `hrefAlt`; vale o mais
    longo);
  - `ver` = "ver" da chave **e** todas as exigências do item (`exige`);
  - `lancar` = `ver` **e** criar ou editar.
- Falha **fechada**: rota sem item no menu não libera nada.
- `perguntarACris` (`src/lib/actions/cris.ts`) usa essa função no lugar de
  `screenIdOfPath`.
- Comparei a regra antiga com a nova em todas as rotas e nos cinco papéis.
  **Só o `/acerto` mudou:**
  - owner e membro passam a receber o formulário (antes era descartado);
  - contador e engenheiro deixam de receber os números (antes iam, sem
    conferir permissão).

  Um teste trava isso: qualquer outra rota que mudar faz o teste falhar.

**`{ ver, lancar }` por rota e papel** (V = vê os números, L = pode receber o
formulário; "membro*" = membro com a chave `membroRestrito` ligada):

| Rota | Chave | owner | membro | membro* | contador | engenheiro |
| --- | --- | --- | --- | --- | --- | --- |
| `/acerto` | despesas | VL | VL | VL | -- | -- |
| `/acessos` | acessos | VL | -- | -- | -- | -- |
| `/acoes` | acoes | VL | -- | -- | V- | -- |
| `/backup` | backup | VL | -- | -- | -- | -- |
| `/budget` | budget | VL | VL | -- | -- | -- |
| `/caixa` | caixa | VL | VL | VL | -- | -- |
| `/cartoes` | cartoes | VL | VL | -- | -- | -- |
| `/chaves` | chaves | -- | -- | -- | -- | -- |
| `/clientes` | clientes | VL | VL | VL | -- | -- |
| `/conferencia` | conferencia | VL | VL | VL | V- | -- |
| `/contas` | contas | VL | VL | VL | -- | -- |
| `/contaspagar` | contaspagar | VL | VL | VL | -- | -- |
| `/contasreceber` | contasreceber | VL | VL | VL | -- | -- |
| `/dashboard` | dashboard | VL | VL | -- | -- | -- |
| `/despesas` | despesas | VL | VL | VL | V- | -- |
| `/diagnosticoia` | diagnosticoia | VL | -- | -- | -- | -- |
| `/dre` | dre | VL | VL | -- | V- | -- |
| `/dre/analitica` | dre | VL | VL | -- | V- | -- |
| `/empresa` | empresa | VL | -- | -- | -- | -- |
| `/equipes` | equipes | VL | VL | -- | -- | -- |
| `/estoque` | estoque | VL | VL | -- | -- | -- |
| `/fluxocaixa` | fluxocaixa | VL | VL | -- | V- | -- |
| `/fluxocaixa/analitico` | fluxocaixa | VL | VL | -- | V- | -- |
| `/forecast` | forecast | VL | VL | -- | -- | -- |
| `/fornecedores` | fornecedores | VL | VL | VL | -- | -- |
| `/funcionarios` | funcionarios | VL | VL | -- | -- | -- |
| `/medicao` | medicao | VL | VL | VL | V- | -- |
| `/medicaolanc` | medicaolanc | VL | VL | VL | -- | VL |
| `/notasfiscais` | notasfiscais | VL | VL | -- | V- | -- |
| `/numeracao` | numeracao | VL | -- | -- | -- | -- |
| `/parametros` | parametros | VL | VL | -- | -- | -- |
| `/permuta` | permuta | VL | VL | VL | -- | -- |
| `/planocontas` | planocontas | VL | VL | -- | V- | -- |
| `/projecao` | projecao | VL | VL | -- | -- | -- |
| `/projeto` | projeto | VL | -- | -- | -- | -- |
| `/reembolso` | reembolso | VL | VL | -- | -- | -- |
| `/relatorios` | relatorios | VL | VL | -- | -- | -- |
| `/restituicoes` | restituicoes | VL | VL | -- | -- | -- |
| `/resumo` | resumo | VL | VL | -- | V- | -- |
| `/simulador` | simulador | VL | VL | -- | -- | -- |
| `/unidades` | unidades | VL | VL | VL | -- | -- |
| `/usuarios` | usuarios | VL | -- | -- | -- | -- |

(`/chaves` sai "--" até para o owner: é tela só do operador da plataforma.)

## §3 · Markdown cru (C5)

- `trechosDaCris` (`src/lib/cris.ts`, função pura) devolve trechos tipados:
  - texto, link (só rota que existe) e **negrito**;
  - **item de lista** (linha com `- `), que pode ter link e negrito dentro.
- Títulos `#`, tabelas, blocos de código e itálico aparecem como texto, sem os
  símbolos.
- Sem `dangerouslySetInnerHTML` e sem biblioteca nova. O chat
  (`chat-assistente.tsx`) monta `<strong>`, `<ul>`/`<li>` e `<Link>` a partir
  dos trechos.

## §4 · O que não muda

- **AQ-T6:** `src/lib/ai/cris.ts` e `src/lib/actions/cris.ts` só importam de
  uma lista conhecida, nenhuma action, e não têm `insert`, `update` nem
  `delete` no banco. Import novo faz o teste falhar.

## Testes

| Teste | Arquivo |
| --- | --- |
| Base: as frases falsas não voltam; a seção "O assistente" tem as cinco partes, na ordem; a regra nova está nas regras da Cris | `src/lib/cris-privacidade-base.test.ts` |
| AQ-T1 · toda rota do menu resolve para tela que existe; rota fora do menu → nada; só o `/acerto` muda em relação à regra antiga | `src/lib/actions/cris-permissao.test.ts` |
| AQ-T2 · `/acerto`: com despesas/editar + caixa/ver, o formulário e os números vão; sem caixa/ver, nada; contador, nada | idem |
| AQ-T3 · Medição (`permAlt`): `/medicaolanc` usa a permissão de lançamento, como antes | idem |
| AQ-T4 · negrito, item de lista, link no item, rota desconhecida como texto | `src/lib/cris.test.ts` |
| AQ-T5 · `<script>`, HTML e `javascript:` continuam texto | idem |
| AQ-T6 · a Cris não importa action nem grava | idem |

## Validação

- `npm run test:all` (typecheck + lint + suíte com banco): **266 arquivos,
  2165 testes, todos passaram, 0 pulados.**
- `next build`: ok. A primeira tentativa falhou ao baixar a fonte do Google
  (rede); a segunda passou.

## §5 · Colar no chat (C2, C22) — parte 2

- **Campo novo**, `src/components/app/campo-de-mensagem.tsx`, usado no chat e
  na caixa de conversa dos painéis (§5.4):
  - `<textarea>` que cresce de 1 a 6 linhas;
  - Enter envia, Shift+Enter quebra a linha;
  - quebras e tabulações coladas ficam como estão.
- **Colar imagem ou arquivo vira anexo**, com a validação do 📎. A regra fica
  em `classificarColagem` (`src/lib/cris-colagem.ts`, função pura):
  - sem arquivo → texto;
  - arquivo junto com texto de várias linhas ou com tabulação → **texto** (o
    Excel põe a tabela como texto e também como imagem; quem cola tabela quer
    a tabela);
  - fora disso, o arquivo: aceito se for de tipo válido e até 4 MB; senão,
    recusado com a mesma mensagem do 📎.
- **Anexo novo troca o anterior, com aviso.** Vale para o 📎, o colar e o
  arrastar.
- **Limite:** `MAX_MENSAGEM` subiu de 1.500 para **6.000**, no cliente e no
  servidor. Passou do limite, o campo corta e **avisa** quantos caracteres
  ficaram de fora.
- **Arrastar e soltar** um arquivo sobre o painel da Cris vira anexo, pela
  mesma regra (§5.5). O painel ganha borda de destaque enquanto o arquivo
  passa por cima.
- **Caixa de conversa dos painéis:** passou a levar o anexo junto com a
  pergunta. `cris.perguntar(texto, anexo)`; antes era só texto.
- **Mais uma frase falsa:** o aviso do chat vazio dizia "Dado pessoal não
  vai". Agora diz "o documento que você anexar, inteiro. Dado pessoal do
  cadastro não vai". Um teste trava isso.

## §6 · Bateria de anexos

O roteiro está em `docs/revisao/BATERIA-ANEXOS-CRIS.md`, com a tabela para o
Thiago e para o relatório. Os itens 6 e 7, e o item 1 sem o modelo, já foram
conferidos aqui. O resto pede a chave de IA e o Safari.

## Prompt AV · Ditado por voz (C21)

**Fase 1 (reproduzir): não feita, BLOQUEIO BVZ-1.**

- Falta saber qual erro o Thiago viu, em qual navegador e computador, e com
  qual frase.
- O ditado usa o serviço de fala do navegador, que não roda aqui. O Chromium
  de teste não tem o serviço do Google.
- Até esta etapa, o erro só aparecia no `title` do 🎤. No celular, ninguém
  conseguia ler a mensagem para relatar.
- Agora a mensagem aparece em texto. Desconhecido, o código vem junto:
  "O ditado falhou (xyz)". Isso deve ajudar o Thiago a responder o BVZ-1.

**Fase 2: o que é do app e não depende da reprodução, feito:**

- **2.1:** `mensagemDoErroDeVoz(codigo)` (`src/lib/voz-ditado.ts`) dá uma
  mensagem para cada código: `no-speech`, `audio-capture`, `not-allowed`,
  `service-not-allowed`, `network`, `aborted`, `language-not-supported` e
  `bad-grammar`. Para código desconhecido, a mensagem é genérica e leva o
  código.
- **2.2:** a mensagem aparece **em texto, abaixo do campo**, no chat da Cris e
  nos Relatórios. Some quando a pessoa digita ou toca no 🎤 de novo.
- **2.4:** um erro no meio do ditado não apaga o que já entrou. Cada trecho
  final vai para o campo na hora (`ligarDitado`).
- **2.5:** o mesmo comportamento no chat da Cris e no chat de Relatórios. O
  texto ditado é somado por `juntarDitado`: um espaço, sem espaço duplo.
- **2.6:** a seção "O assistente" da base explica:
  - o ditado é do navegador e roda no serviço de fala do fabricante;
  - o áudio não passa pelo servidor do app;
  - no Firefox, o botão não aparece.

**2.3 (ditado contínuo com texto parcial): adiado.** Ele muda o reconhecimento
em todos os navegadores (`continuous = true`, `interimResults = true`). O
Safari do iPhone se comporta diferente nesse modo, e eu não consigo testar
aqui. Fica para depois da tabela da Fase 1: se o erro do Thiago for "corta no
meio da frase", é este o ajuste.

## Conferido no navegador (Chromium, servidor local, modelo desligado)

13 checagens no chat da Cris e 4 na caixa do painel de Estoque, todas OK. O
reconhecedor de fala foi simulado: um trecho reconhecido e, depois, o erro
`no-speech`.

- **O campo:**
  - é textarea;
  - Shift+Enter quebra a linha sem enviar;
  - a tabela de 5 × 3 colada mantém linhas e tabulações;
  - o campo cresce.
- **Anexo:**
  - um print colado vira anexo e não entra como texto;
  - um segundo print troca o primeiro e avisa.
- **Limite:** colar 6.005 caracteres deixa 6.000 e avisa "5 caracteres
  ficaram de fora".
- **Ditado:**
  - o texto reconhecido entra e fica depois do erro;
  - o erro aparece em texto abaixo do campo, no computador e no celular
    (iPhone 13 emulado);
  - digitar limpa o erro.
- **Caixa do painel:**
  - Enter abre a Cris com a pergunta;
  - um print colado vira anexo;
  - enviar só o print leva o anexo para a Cris.

## Testes da parte 2

| Teste | Arquivo |
| --- | --- |
| AQ-T7 · `classificarColagem`: texto, texto com quebras e tabulações, PNG, PDF, arquivo do explorador, tabela do Excel com imagem, .docx, imagem acima de 4 MB | `src/lib/cris-colagem.test.ts` |
| AQ-T8 · 6.001 caracteres: o cliente corta e avisa; o servidor corta no mesmo limite | idem |
| AQ-T9 · tabela 5 × 3 colada chega ao modelo com as quebras e as tabulações | `src/lib/ai/cris.test.ts` |
| AQ-T10 · print na tela de Fornecedores: vira anexo, chega ao modelo com o formulário, a proposta volta para a tela, nada gravado | `src/lib/actions/cris-permissao.test.ts` |
| AV-T1 · mensagem própria para cada código; genérica com o código para o desconhecido | `src/lib/voz-ditado.test.ts` |
| AV-T2 · `juntarDitado` | idem |
| AV-T3 · reconhecedor simulado: o texto entra, o `no-speech` vira mensagem e o texto fica (a parte "visível na tela" foi conferida no navegador, acima) | idem |
| O aviso do chat não promete "dado pessoal não vai" | `src/lib/cris-privacidade-base.test.ts` |

## Pendente para depois do deploy (relatório final da etapa)

- Item 5 do relatório: vídeo ou prints de colar texto de várias linhas, um
  print e uma tabela do Excel, no Chrome e no Safari (ou Edge). Precisa de
  computador com Excel e Safari.
- Item 6 do relatório: print da Cris respondendo "o que você manda para o
  modelo de IA?". Precisa da Cris em produção, com a chave de IA.
- Item 7: a bateria de anexos preenchida (`docs/revisao/BATERIA-ANEXOS-CRIS.md`).
- BVZ-1: o erro do ditado que o Thiago viu, para a Fase 1 do Prompt AV e a
  decisão sobre o 2.3.

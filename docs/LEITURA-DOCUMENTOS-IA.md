# Leitura de documentos por IA (subir arquivo → formulário preenchido)

O documento que sustenta um lançamento chega do jeito que dá: DANFE em PDF,
cupom "SEM VALOR FISCAL" fotografado em cima da caçamba, comprovante de Pix
com o CPF mascarado, boleto, orçamento de WhatsApp. Digitar isso à mão é o
gargalo do dia a dia — e é onde nasce erro de obra, de competência e de valor.

A funcionalidade tem uma regra só, e ela vale para **qualquer tela** do
sistema que aceite subir arquivo:

> Sobe o documento → a IA lê e preenche o que dá.
> **O que ela não achou, ou achou sem certeza, fica marcado com ALERTA.**
> Nada é gravado antes de a pessoa conferir e salvar.

Alerta é sinal, nunca trava: um cupom rasurado continua virando lançamento.

## Onde já está ligado

| Tela | Arquivo | O que preenche |
| --- | --- | --- |
| Despesas → Lançamentos | `src/components/app/despesa-form.tsx` | projeto, fornecedor, documento fiscal (tipo, nº, série, emissão, chave), conta, categoria DRE, competência, vencimento, valor, status, descrição, forma de pagamento |
| Fornecedores → cadastro | `src/components/app/fornecedor-form.tsx` | razão social, fantasia, tipo, CNPJ/CPF, contato, e-mail, telefones, endereço completo, papéis |

Em ambas a leitura dispara **sozinha ao subir o arquivo**; o botão de preencher
fica ali para refazer (trocou o arquivo, corrigiu a foto) e para quem prefere
disparar na mão.

### O bloco de upload

`src/components/ui/upload-documentos.tsx` — dois botões nomeados, na ordem em
que se usa:

```
DOCUMENTOS DA DESPESA
Suba a nota, o cupom, o boleto ou o comprovante — PDF ou imagem. …

[ Subir arquivos ]  [ Preencher formulário ]

  nota.pdf                    36 KB   ✕
  comprovante.jpeg            50 KB   ✕
```

O `<input type="file">` fica escondido atrás do primeiro botão: o controle
nativo mostrava "Escolher arquivos / Nenhum arquivo escolhido" — texto do
navegador, fora do idioma e do visual do app — e não dizia o que viria depois.
Cada arquivo vira uma linha com nome, tamanho e remover, então dá para conferir
antes de agir.

Regras de comunicação que o bloco segue:

- **um assunto por aviso.** Leitura por IA, chave de ambiente e armazenamento
  são três coisas diferentes e não cabem no mesmo parágrafo cinza;
- **indisponível ≠ erro.** Sem `ANTHROPIC_API_KEY` o botão de preencher fica
  desabilitado e um aviso explica o que ainda funciona (subir e anexar) com
  link para o Diagnóstico de IA — em vez de uma frase técnica solta;
- **o erro aparece onde a pessoa clicou**, dentro do bloco, junto dos arquivos
  — não no rodapé do formulário;
- **motivo não se repete.** O texto ao lado do botão só aparece quando é algo
  que a pessoa resolve ali ("suba um PDF").

## Como está montado

```
componente da tela  ──►  Server Action  ──►  *-extract.ts   (server-only, fala com a IA)
   (aplica e desenha)      (monta contexto)        │
        ▲                                          ▼
        └──────────────  *-doc.ts  ◄──── campos.ts (vocabulário comum, puro)
                     (regra pura e testada:
                      o que preencher, o que deduzir,
                      o que marcar com alerta)
```

- **`src/lib/ai/campos.ts`** — vocabulário comum. `CampoLido` (valor +
  `confianca` + `nota`), `Alerta` (`faltando` | `conferir`), `avaliarCampo`,
  conversão ISO → formato interno das telas, normalização de nome e de
  CNPJ/CPF. Puro: roda no servidor e no cliente.
- **`src/lib/ai/despesa-extract.ts` / `fornecedor-extract.ts`** — `server-only`.
  Montam a ferramenta (tool) da API, mandam os arquivos e devolvem os campos.
  Cada campo volta com confiança e uma nota em português explicando de onde
  saiu ou por que há dúvida — é essa nota que o usuário lê na tela.
- **`src/lib/ai/despesa-doc.ts` / `fornecedor-doc.ts`** — a regra. Casam o que
  a IA leu com os cadastros (fornecedor, plano de contas, categoria, obra),
  deduzem o que dá para deduzir e produzem os alertas. **Puros e testados**
  (`*.test.ts`), com os três documentos reais como cenário.
- **`src/components/ui/campo-ia.tsx`** — `CampoIA` (rótulo + selo + moldura +
  motivo) e `ResumoLeituraIA` (placar da leitura no topo do formulário).

### Decisões que valem para qualquer tela

- **Datas sempre em ISO na conversa com a IA.** `20/07/2026` e `07/20/2026`
  são indistinguíveis para quem lê texto solto; a tradução para o formato
  interno (`MM/DD/YYYY`) acontece num lugar só, com validação de calendário —
  data inexistente (31/02) é recusada e vira alerta.
- **Vários arquivos, um lançamento.** A compra chega em partes (a nota E o
  comprovante do Pix). Os arquivos vão juntos na mesma chamada — é o
  cruzamento deles que permite dizer "paga, por PIX, em 20/07". Limite:
  `AI_MAX_DOCS`.
- **A empresa nunca é o fornecedor.** Em comprovante de Pix o fornecedor é o
  *recebedor*; o CNPJ da própria construtora vai no prompt exatamente para não
  ser confundido.
- **Documento mascarado não casa cadastro.** CPF `***.123.456-**` não
  identifica ninguém: o vínculo por documento só acontece com CNPJ/CPF
  completo, o resto vira alerta.
- **Deduzir é permitido, esconder não.** Competência deduzida da emissão,
  vencimento assumido como o dia do pagamento: preenche **e** marca
  "conferir", dizendo de onde veio.
- **O que não dá para aplicar vira alerta.** Fornecedor não cadastrado, conta
  fora do plano, categoria de receita sugerida para despesa (RG-01): nada
  disso entra em silêncio — o campo explica o motivo.
- **A marca some quando a pessoa edita o campo.** Quem mexeu já conferiu.

## Levando para uma tela nova

1. Escreva o contrato e a regra num módulo puro `src/lib/ai/<tela>-doc.ts`
   (campos lidos, o que é essencial, como casa com os cadastros) e teste-o com
   documentos reais em `<tela>-doc.test.ts` — sem rede.
2. Crie `src/lib/ai/<tela>-extract.ts` (`server-only`) com a tool da API,
   reaproveitando `createMessageWithFallback` e `campoSchema`.
3. Exponha uma Server Action que carrega os cadastros do tenant, chama o
   extract e devolve o resultado do módulo puro já pronto para aplicar.
4. Na tela, use `<UploadDocumentos>` para o upload (ele já traz os dois botões,
   a lista de arquivos e os avisos), troque `<div><Label/>…</div>` por
   `<CampoIA label alerta>` nos campos e ponha o `ResumoLeituraIA` logo abaixo
   do bloco de upload.

Candidatos naturais: Contas a Pagar (baixa por comprovante), Caixa/Extrato
(já tem leitura própria, sem alertas por campo), Medição, Reembolso,
Restituições, Contas a Receber e o Repositório de documentos.

## Configuração

Três coisas independentes, e o **Diagnóstico de IA** (Config → Diagnóstico de
IA) diz qual delas está faltando:

| Variável | Papel | Sem ela |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | autentica o app na API | leitura desativada; upload e vínculo do arquivo seguem funcionando |
| `ANTHROPIC_WORKSPACE_ID` | workspace da chave, **só para chave vinculada a identidade** (service account) | chave comum funciona sem; chave identity-linked falha com 400 "anthropic-workspace-id is required" |
| `ANTHROPIC_MODEL` | escolhe o modelo (opcional) | usa `claude-haiku-4-5` |
| `R2_*` | guarda os arquivos | nada é armazenado — só a leitura acontece |

Além das variáveis, a conta da API precisa ter **créditos**: o uso é cobrado
por token e, sem saldo, a API responde 400 com "credit balance is too low".
Isso não é erro de chave nem de modelo, e o diagnóstico diz isso com todas as
letras (`src/lib/ai/erros.ts`).

### Custo: modelo econômico + cache do que não muda

O uso é cobrado por token e a leitura de documento é o que mais roda no app, então:

- **o padrão é o modelo mais barato** (`claude-haiku-4-5`), que dá conta de PDF
  nítido — DANFE, comprovante de Pix, boleto. Foto amassada pede um degrau
  acima (`claude-sonnet-5`, `claude-opus-5`), e trocar é só mudar a variável;
- **a maior parte do prompt é cacheada.** Fornecedores, plano de contas, obras
  e regras não mudam entre uma leitura e a seguinte: vão no `system`, com ponto
  de cache, e passam a custar uma fração nas leituras seguintes. Só o documento
  fica fora do cache (`src/lib/ai/despesa-prompt.ts`).

Duas consequências para quem mexer nisso:

1. **A ordem das listas é fixada no código, não na consulta.** O cache casa por
   prefixo byte a byte — uma lista que muda de ordem invalida tudo em silêncio,
   e só a fatura denuncia.
2. **O que é volátil fica depois do ponto de cache** (o documento e a instrução
   curta). Qualquer coisa que varie por leitura — data, nome de arquivo,
   contador — colocada antes desse ponto anula o cache.

Uma leitura pior nunca vira erro silencioso: o que a IA não entender continua
chegando na tela como alerta de campo.

### `ANTHROPIC_MODEL` aceita o identificador, não o nome comercial

`claude-sonnet-5` funciona; "Sonnet 5" é o nome de marketing. Quem configura o
servidor lê o nome comercial e é isso que digita — então `src/lib/ai/modelos.ts`
traduz o que dá para traduzir, cai no padrão quando o valor não faz sentido, e
**sempre avisa na tela** o que foi entendido. Sem esse aviso, um valor inválido
sumia no fallback de modelo e a configuração parecia valer quando não valia.

Catálogo, padrão e cadeia de fallback ficam nesse mesmo módulo (puro e
testado): trocar o modelo padrão do app é editar uma constante.

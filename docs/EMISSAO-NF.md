# Emissão de nota fiscal (NFS-e)

Como o app **emite** nota — em oposição ao que já existia, que é **registrar** a
nota recebida do fornecedor (`documento_fiscal`, filha de `despesa`). São coisas
diferentes e nenhuma substitui a outra.

## 1. O que se emite aqui (e o que não se emite)

**Venda de unidade não gera nota fiscal.** Incorporação imobiliária é operação
de contrato e escritura, não de circulação de mercadoria nem de prestação de
serviço. Um título de `conta_receber` originado da venda de uma unidade **não**
deve oferecer botão de emissão: oferecer induz erro fiscal.

O caso real é a **NFS-e de serviço**: empreitada e administração de obra
faturadas contra o cliente do projeto (`project.cliente_id`), taxa de
administração e serviços correlatos. O gatilho natural é a **medição** — medição
aprovada → NFS-e → conta a receber.

## 2. A decisão que mais erra nota de construtora

Na construção civil o ISS é devido **no município da obra** (LC 116/2003, art.
3º, III), que frequentemente não é o da sede. Por isso:

- `tenant.codigo_municipio` → município do **prestador** (sede);
- `project.codigo_municipio_obra` → município da **prestação** (a obra);
- a natureza da operação (`1` = tributação no município, `2` = fora) é
  **derivada** da comparação entre os dois, nunca escolhida na tela.

Isso está em `naturezaPorMunicipio` (`src/lib/calc/nfse.ts`) e é aplicado em
`montarPayloadNfse` (`src/lib/fiscal/nfse-payload.ts`).

## 3. Bruto ≠ líquido

Nota de R$ 100.000 com ISS retido e INSS não deposita R$ 100.000 na conta.
`calcularNfse` devolve os dois números juntos (`valorIss`, `totalRetencoes`,
`valorLiquido`) justamente para que o Contas a Receber e a conciliação de caixa
não usem o valor errado.

**Nenhuma incidência é presumida.** Retenção federal em serviço de construção
civil depende do tipo de contrato (empreitada global × cessão de mão de obra),
do regime do prestador e da natureza do tomador — regra que a contabilidade do
cliente define, não o software. Cada retenção é informada explicitamente
(alíquota e, quando for o caso, base própria); o módulo só faz a conta. Um
padrão embutido produziria nota errada com aparência de nota certa.

## 4. Provedor: Focus NFe

Integração direta com prefeitura foi descartada: são milhares de municípios, o
padrão nacional (NFS-e Nacional) ainda convive com padrões próprios, e a
integração direta exigiria custodiar o certificado A1 e-CNPJ dentro do app.

O que a [documentação da API v2](https://doc.focusnfe.com.br/reference/introducao)
define e o código respeita:

| Item | Contrato |
|---|---|
| Ambientes | `https://homologacao.focusnfe.com.br/v2` e `https://api.focusnfe.com.br/v2` |
| Autenticação | HTTP Basic — **token como usuário, senha vazia** (`Basic base64("token:")`) |
| Referência (`ref`) | obrigatória na query string, única por token, **apenas letras e números** |
| Emissão | `POST /nfse?ref=…` — **assíncrona**: devolve `processando_autorizacao` |
| Consulta | `GET /nfse/{ref}` — `autorizado`, `cancelado`, `erro_autorizacao` |
| Cancelamento | `DELETE /nfse/{ref}` — prazo é da prefeitura e varia por município |
| Webhook | `POST /hooks` com `event: "nfse"`, `url`, `cnpj` e cabeçalho de autorização à escolha; reenvia em 1min, 30min, 1h, 3h e 24h e depois desiste |
| Construção civil | campos `codigo_obra` (CNO/CEI) e `art` no corpo da nota |

Consequências de projeto:

- **`ref` não pode conter hífen** — como as chaves são UUID, a conversão é
  explícita e estável em `refDaNota` (`src/lib/fiscal/tipos.ts`). O mesmo
  registro sempre produz a mesma `ref`, senão reemitir viraria nota duplicada.
- **`ref` autorizada é definitiva**: depois que a nota é autorizada (mesmo que
  depois cancelada) aquela referência não serve para uma nova emissão. Corrigir
  e reenviar só funciona enquanto o status for de erro.
- **Numeração do RPS é do provedor** (`serie_nfse_producao`,
  `proximo_numero_nfse_producao` no cadastro da empresa). Não usar
  `number_sequence` para isso — ela continua sendo do PED interno.
- **O token é da empresa e vale dinheiro**: nunca fica em coluna de banco.
  Desde 19/11/2026 ele é lido da Focus na hora, com o token master da
  plataforma (seção 7); o modo antigo de variável de ambiente
  (`FOCUS_NFE_TOKEN*`) continua valendo para quem já estava nele.
- **Homologação é o padrão** de todo tenant (`fiscal_ambiente`): nota de teste
  não tem validade fiscal, e o padrão inverso emitiria nota real por acidente na
  primeira tentativa de integração.
- **Reforma tributária**: a API já expõe campos de IBS/CBS e municípios estão
  migrando para a NFS-e Nacional (`habilita_nfsen_*`, que não pode conviver com
  `habilita_nfse` em produção). O adaptador é isolado justamente para essa troca
  não vazar para as telas nem para o banco.

## 5. Estado da implementação

Fases 1 e 2 estão prontas. As demais dependem de credencial no painel do
provedor (empresa cadastrada, certificado A1 vinculado, município habilitado).

| Fase | O que é | Estado |
|---|---|---|
| 1 | Cadastro fiscal do emitente (`tenant`) com checklist em Config › Empresa + dados fiscais da obra (`project`) em Config › Projetos | ✅ |
| 2 | Motor de cálculo (`calc/nfse.ts`) e validação do emitente (`calc/emitente-fiscal.ts`), com testes | ✅ |
| 3 | Adaptador do provedor: montagem do payload e cliente HTTP (`lib/fiscal/`) | ✅ payload e cliente; falta exercitar contra o sandbox |
| 4 | Tabelas `nota_servico` e `nota_servico_evento`, rota de webhook, tela `/notas`, permissão no RBAC | pendente |
| 5 | Gatilho na medição, vínculo com `conta_receber` pelo valor **líquido**, cancelamento e substituição | pendente |

### O que a Fase 4 precisa resolver

- **Estados**: `RASCUNHO → ENFILEIRADA → PROCESSANDO → AUTORIZADA →
  (CANCELADA | SUBSTITUIDA)`, com `REJEITADA` como ramo reprocessável.
- **Idempotência do webhook**: o provedor reenvia até cinco vezes; o handler
  precisa ser idempotente e responder 2xx, senão a notificação se perde de vez.
- **Autorização do webhook**: cadastrar o hook com `authorization` /
  `authorization_header` e conferir o segredo na entrada — a rota é pública.
- **Log de eventos**: guardar o corpo cru de cada resposta. Rejeição de
  prefeitura vem com mensagem obscura e específica do município; sem o original,
  diagnosticar depois vira adivinhação.
- **Sem receita em dobro**: se a medição já reconheceu a receita, a NF é
  documento do fato existente, não um novo fato contábil.

## 6. Arquivos

```
src/lib/calc/emitente-fiscal.ts   validação do emitente + checklist (CNPJ alfanumérico)
src/lib/calc/nfse.ts              base de cálculo, ISS, retenções, líquido, natureza
src/lib/fiscal/tipos.ts           contrato neutro (status, resultado, ref)
src/lib/fiscal/nfse-payload.ts    montagem do payload (pura, testável)
src/lib/fiscal/focus.ts           cliente HTTP — a única parte que conhece o provedor
src/lib/actions/empresa.ts        salvarDadosFiscais
src/app/(app)/empresa/page.tsx    cadastro fiscal do emitente + checklist
src/lib/actions/projects.ts       updateProject — dados fiscais da obra
src/components/app/project-manager.tsx  bloco fiscal da obra + indicação de incidência
```

O cadastro está em duas telas porque os dados são de escopos diferentes:
**Config › Empresa** guarda o prestador (uma vez por tenant) e **Config ›
Projetos** guarda o município de incidência e o CNO de cada obra. O bloco do
projeto mostra, já no cadastro, se aquela obra vai tributar dentro ou fora do
município da sede — a descoberta tardia desse detalhe é justamente o que produz
nota tributada na cidade errada.

## 7. A empresa ativa a própria emissão (19/11/2026, trazido do Growth Construction em 20/11/2026)

**Decisões de 19/11/2026 (Growth Construction), valendo também aqui:**

- **A conta da Focus é a da plataforma**, a do token master configurado no
  servidor (`FOCUS_NFE_TOKEN_MASTER`). As empresas entram nela à medida que
  chegam.
- **Só o proprietário da empresa e os operadores da plataforma** ativam a
  emissão e trocam o certificado. Quem tem o certificado A1 assina pela
  empresa.
- **Empresa nova já começa por aqui.** O modo antigo continua só para quem já
  estava nele.

### Como funciona

1. Em **Configurações → Empresa**, a empresa completa o cadastro fiscal, como
   antes.
2. No cartão **Emissão de NFS-e**, o proprietário envia o certificado A1
   (`.pfx` ou `.p12`) com a senha e clica em **Ativar emissão**. Se o município
   pedir, informa também o login e a senha da prefeitura. Se a empresa já
   emitia nota por outro sistema, informa a série e o próximo número do RPS.
3. O servidor faz o resto:
   - pergunta à Focus se ela emite NFS-e no município da sede
     (`GET /v2/municipios/{ibge}`). Se não emite, recusa. Se a emissão está
     fora do ar ou sem cancelamento pela API, ativa e avisa;
   - procura a empresa na conta pelo CNPJ (`GET /v2/empresas?cnpj=`): cria se
     não existe (`POST`) e atualiza se já existe (`PUT`);
   - grava em `nfse_emissor` só o vínculo (o id da empresa na Focus), o CNPJ
     ativado e a validade do certificado.
4. Daí em diante, cada envio, consulta, cancelamento e download usa o token da
   **própria empresa**. O app lê esse token na Focus com o token master
   (`GET /v2/empresas/{id}`) e guarda só na memória do servidor, por 10
   minutos.
5. **Atualizar cadastro na Focus**, no mesmo cartão, reenvia os dados
   fiscais. O certificado só vai se for escolhido um arquivo novo; é assim que
   se troca um certificado vencido.

### O que nunca fica no app

- **Nem certificado, nem senha do certificado, nem senha da prefeitura, nem
  token de emissão** ficam no app: não vão para o banco, para o log nem para a
  auditoria.
- A auditoria registra só que houve a ativação: o CNPJ, a validade do
  certificado e se o certificado ou o login da prefeitura foram enviados.

### Quando a emissão para (e a tela diz por quê)

- **Sem `FOCUS_NFE_TOKEN_MASTER` no servidor.**
- **O CNPJ do cadastro fiscal mudou depois da ativação.** É preciso ativar de
  novo.
- **O certificado venceu.** Faltando 30 dias ou menos, a tela avisa em Empresa
  e em Notas Fiscais. Vencido, a emissão nova para, mas consultar e baixar as
  notas antigas continua funcionando.
- **Um CNPJ já ativado em outra empresa do sistema** não pode ser ativado de
  novo.

### O que mudou nas decisões anteriores

- **BAG-3 ("um CNPJ só"):** revista. Agora cada empresa ativa a própria
  emissão. O modo antigo (`NFSE_TENANT_ID` + `FOCUS_NFE_TOKEN_*`) continua
  funcionando para quem já estava nele, para nada quebrar.
- **"Token nunca no banco":** mantida. O token não é guardado: é lido da Focus
  quando precisa.

### Limites

- **A NFS-e Nacional não está habilitada.** O cadastro liga `habilita_nfse`,
  a NFS-e municipal. Município que já migrou para a Nacional fica para um
  passo seguinte.
- **A API de empresas só existe em produção na Focus.** Ativar a emissão
  cadastra a empresa de verdade na conta. A homologação continua sendo o
  padrão para as **notas**: até trocar o ambiente para Produção, as notas
  emitidas não têm validade fiscal.
- **A Focus cobra por empresa cadastrada** na conta da plataforma.
- **Não há botão de desativar.** Excluir a empresa na Focus é irreversível;
  se precisar, a plataforma faz pelo painel da Focus e apaga a linha de
  `nfse_emissor`.

### Para ligar

1. No Coolify, criar `FOCUS_NFE_TOKEN_MASTER` com o token master da conta
   (painel da Focus › Tokens). O app reinicia sozinho.
2. Na empresa: completar o cadastro fiscal em Configurações → Empresa e
   ativar a emissão com o certificado.
3. Testar uma nota em homologação: montar, conferir, enviar, atualizar até
   autorizar, baixar o PDF e cancelar.
4. Só depois, trocar o ambiente da empresa para Produção.

**Arquivos novos:**

```
src/lib/fiscal/emissor-regras.ts    regras puras (quem ativa, certificado, corpo, município, recusa)
src/lib/fiscal/focus-empresas.ts    API de empresas e municípios com o token master
src/lib/fiscal/emissor.ts           situação da emissão e token por empresa
src/lib/actions/nfse-emissor.ts     ativarEmissaoNfse
src/components/app/emissor-nfse.tsx formulário do cartão
src/lib/db/migrations/0084_nfse_emissor.sql  (aditiva, com down)
```

# Prompt AH · Empresa — Fase 1, inventário

Prompt AH (30 de 42). Tela `/empresa`: a mais bem construída do sistema; a
maior parte do prompt é sobre **o que não se toca**. **Só leitura nesta
fase; nada foi alterado.** SQL em
[`sql/v2-prompt-ah-diagnostico.sql`](./sql/v2-prompt-ah-diagnostico.sql).
(A coleta `docs/TELA-EMPRESA.md` citada pelo prompt não existe no
repositório; o inventário abaixo foi feito direto no código.)

## Bloqueios
| | Situação | Decisão adotada |
|---|---|---|
| **BAH-1** | Base local: 1 tenant (Cliente Piloto), **todos os campos fiscais vazios** (cep 0 dígitos, IBGE 0, uf nulo, ambiente `homologacao`). Nenhum cadastro fica com pendência nova aqui. Produção: rodar o 1º e o 2º relatório do SQL. | A validação vale só para o que for **gravado daqui em diante** e só para campo **preenchido**; vazio continua passando; valor antigo inválido vira pendência editável (já é: o checklist o marca) e **não é tocado**. |
| **BAH-2** | Confirmado: `salvarDadosFiscais` e `checarProntidaoFiscal` são a pré-condição do Emissor (Prompt AG, 4.1 usa `emitentePronto`). O texto da tela diz "defina `FOCUS_NFE_TOKEN`…". | O texto passa a dizer o que acontece quando o cadastro fecha e aponta para **Receitas › Notas Fiscais** (tela do Prompt AG, ainda não existe: sem link quebrado — texto). |

## O que já está certo e não se toca (confirmado)
- `checarProntidaoFiscal` (13 regras, `calc/emitente-fiscal.ts:238–370`),
  bloqueio × aviso com critério no docstring, cada pendência explica por quê.
- Token fora do banco (`focus.ts`, `schema.ts`, 0039); default `homologacao`
  (`resolverAmbiente`); gravação parcial deliberada; `diffAudit` com
  `de`/`para` em `tenant.fiscal`; `/api/health/r2` com round-trip real,
  variáveis mascaradas e `owner|admin`; as quatro operações filtram por
  `eq(tenants.id, ctx.tenant.id)`.

## O que o código mostra, parte a parte
- **Parte 1 · placeholders**: `page.tsx` tem `placeholder="7.02"` (LC 116),
  `"4120400"` (CNAE), `"3"` (alíquota) e o código IBGE da cidade-sede
  (fixture de `nfse-payload.test.ts`). Nenhum `defaultValue` com esses
  valores (1.4 já vale). O mesmo campo aparece como "falta" no checklist.
- **Parte 2 · validação**: a action recusa só CNPJ (`cnpjValido`) e alíquota
  (`aliquotaIssValida`), com `throw`. CEP, IBGE e UF só são normalizados
  (`normalizarCep`, `normalizarCodigoMunicipio`, `toUpperCase`). Os três
  validadores (`cepValido`, `codigoMunicipioValido`, `ufValida`) existem no
  mesmo módulo e só o checklist os usa. As três actions lançam `Error` e os
  formulários são `<form action>` cru (erro vira digest em produção).
- **Parte 3 · `renameTenant`**: `return` mudo sem permissão/nome vazio; sem
  `logAudit` (as outras duas auditam).
- **Parte 4 · sete campos**: `nomeFantasia`, `inscricaoEstadual`,
  `regimeEspecial`, `codigoTributarioMunicipio`, `municipio`, `complemento`,
  `telefone` sem pendência. `codigoTributarioMunicipio` entra no payload da
  nota (`nfse-payload.ts`); `municipio` está no formulário e nunca é checado.
- **Parte 5 · R2**: selo "R2 ativo" verde vem de `isR2Configured()` (quatro
  variáveis não vazias, sem requisição). O resultado do "Testar conexão R2"
  fica só na tela, sem data e sem registro. A chave do healthcheck é
  determinística por tenant (`key6`): dois testes simultâneos colidem.
- **Parte 6 · assistente**: não existe. O texto do token aponta para a env.

## Conflito a documentar (e a resolução não destrutiva adotada)
A seção **4.1** manda os dois avisos novos "entrarem no checklist"; a **9.4**
manda que `calc/emitente-fiscal.ts` **não seja alterado**. Adotado: os dois
avisos ficam num módulo puro novo (`src/lib/empresa-regras.ts`,
`avisosComplementares(e)`), e a **tela** concatena esses avisos aos do
checklist. `checarProntidaoFiscal` e `emitentePronto` ficam **byte a byte
iguais** (9.1, 9.2, 9.4 cumpridos ao pé da letra); o Emissor (AG) continua
contando só bloqueios. Se o usuário preferir os avisos dentro do checklist,
é mover duas funções.

## Como vai ser feito
1. **AH-1 · Partes 1 a 5** (uma PR): placeholders (IBGE "7 dígitos, sem
   ponto"; alíquota "0 a 5"; LC 116 e CNAE com texto de ajuda abaixo do
   campo, sem número no input); `salvarDadosFiscais` chama `cepValido`,
   `codigoMunicipioValido`, `ufValida` (só se preenchido) e devolve
   `{ ok, error }` dizendo o campo e o porquê — idem `uploadLogo` e
   `renameTenant` (este com `logAudit` `de`/`para`); formulários passam a
   `FormComResultado`; avisos complementares (`codigoTributarioMunicipio`,
   `municipio`) e os cinco opcionais declarados como "(opcional)"; selo "R2
   configurado" + último teste real com data (lido de `audit_log`,
   `tenant.r2.health`, gravado pela rota) — verde só após round-trip;
   sufixo por tentativa na chave do healthcheck. Sem migração.
2. **AH-2 · Parte 6**: assistente somente leitura (`empresa-analise.ts` +
   `assistente-empresa.tsx`): o que falta para emitir (bloqueios em ordem de
   esforço), onde encontrar cada dado (diz onde buscar, nunca o valor),
   conferir o preenchido (município sem IBGE, alíquota < 2% fora do Simples,
   CNAE × item de serviço só como "confira"), histórico de `tenant.fiscal`.
   Texto do token (6.4). Nada vai ao modelo: é tudo cálculo local; token e
   env nunca entram no painel.
3. Relatório final (seção 11).

## Perguntas ao usuário (não bloqueiam)
1. Os dois avisos novos podem viver fora de `calc/emitente-fiscal.ts` (como
   adotado) ou prefere dentro do checklist (altera o arquivo que a 9.4
   protege)?
2. Produção: o 2º relatório do SQL mostra algum cadastro com CEP/IBGE/UF
   preenchido e inválido? Ele fica como está, só vira pendência.

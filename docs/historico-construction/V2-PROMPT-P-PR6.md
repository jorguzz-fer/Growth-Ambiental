# Prompt P · PR P-6 — assistente da tela de Permuta

Sexta e última PR de código do Prompt P, conforme
[`V2-PROMPT-P-FASE1.md`](./V2-PROMPT-P-FASE1.md). Seção 7 (7.1–7.3, 7.5–7.7).
**Sem migração. O assistente não grava nada:** a única gravação continua
sendo o botão "Salvar ativo", pela mesma `addPermuta`, com a mesma validação
e permissão no servidor.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **7.1 · propõe e para** | preenche o formulário e exibe cada campo; a gravação é do usuário | `proporAtivoPorTexto` devolve uma PROPOSTA (valores + alerta por campo); o painel a guarda no `sessionStorage` e abre `/permuta/novo?assistente=1`; o formulário mostra o resumo da leitura e cada campo com `CampoIA` (faltando / conferir); o alerta some quando o usuário mexe no campo. Não há rota, action ou botão que grave a partir da proposta |
| **7.2 · selo** | não usar "Somente leitura" | "Propõe, você confirma" |
| **7.3 · lançar por descrição** | texto, voz como alternativa; tipo, descrição, estimado, unidade, cliente, data | `permuta-extract.ts` (ferramenta `preencher_ativo_permuta`, só o texto do usuário, a data de hoje e a lista de tipos vão ao provedor) → `montarPropostaDeAtivo` (puro): casa a unidade com as da versão de trabalho ("casa 12" → "Casa 12"), o cliente com o cadastro (nome exato ou todas as palavras, só com um candidato — duas "Marias" não são adivinhadas), o tipo com a lista (carro → Veículo, apartamento → Imóvel). O que a descrição não diz fica **faltando**; o que não casa fica **conferir** |
| **7.4 · ler documento anexado** | extrai da matrícula, laudo, contrato | **fora até a resposta A/B/C** (enviar documento ao provedor). O rodapé do painel diz isso |
| **7.5 · análises** | ativos parados; cadastro incompleto; venda abaixo da entrada; duplicidade com o plano | `permuta-analise.ts` (puro): parados = acima de 1,5× a mediana de dias do mesmo tipo (com 2+ no tipo) ou acima de 180 dias; incompleto = sem estimado / unidade / cliente, vendido sem data ou valor; abaixo da entrada = vendidos por menos que o estimado, com o resultado; duplicidade = unidade com `Permuta.val > 0` no plano **e** ativo nesta tela, com os dois valores lado a lado (o 1.5 / §57.8-AA como consulta). Cada achado leva ao ativo |
| **7.6 · nunca assistido** | cancelar, alterar vendido, importar | o painel não tem nenhuma dessas ações; importar continua ação explícita com prévia (P-4) |
| **7.7 · linguagem** | ativo, caixa e ganho — nunca receita | resumo da proposta termina com "entra no inventário pelo valor estimado; não é receita"; o painel não repete o valor cheio da revenda |
| **Prompt E** | painel lateral recolhível, projeto explícito validado no servidor | mesma moldura das telas de Unidades e Contas a Receber; a obra vem da URL e é conferida contra a empresa na action |

## Arquivos

- `src/lib/ai/permuta-doc.ts` (+ teste, 3 casos): contrato, `casarUnidade`, `casarCliente`, `casarTipo`, `montarPropostaDeAtivo`, chave do sessionStorage, rótulos.
- `src/lib/ai/permuta-extract.ts` (server-only): conversa com a IA e `normalizarAtivo`.
- `src/lib/actions/permuta-assistente.ts` (+ teste, 2 casos, sem banco): `proporAtivoPorTexto`.
- `src/lib/permuta-analise.ts` (+ teste, 4 casos).
- `src/components/app/assistente-permuta.tsx` (novo); `permuta-form.tsx` (modo proposta, `CampoIA`); `permuta/novo/page.tsx`; `permuta/page.tsx` (painel ao lado, análises).

## Verificação

- Testes puros: casamentos; proposta completa sem alerta; faltando × conferir × baixa confiança; parados por mediana do tipo e por 180 dias; incompletos; abaixo da entrada; duplicidade. Action: recusa sem permissão/obra/texto antes de falar com a IA; devolve a proposta casada com as listas, sem gravar.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local, sem chave de IA): o painel aparece com as quatro análises e os contadores; sem `ANTHROPIC_API_KEY` o bloco de lançamento não é oferecido (selo continua "Propõe, você confirma" porque a proposta existe como caminho). Com proposta guardada no navegador, o formulário abre com os campos marcados.

## Fica para depois

- 7.4 (documento anexado → proposta): resposta A/B/C.
- Relatório final do Prompt P: `V2-PROMPT-P-FINAL.md`.

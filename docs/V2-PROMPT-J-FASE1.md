# Prompt J · Fase 1 — inventário antes de escrever código

Prompt J (Unidades, 9 de 42) corrige nove achados da tela `/unidades`, aplica o
padrão visual e acrescenta o assistente de IA. Este é o inventário: o que o
código mostra hoje, seção a seção, e como o trabalho se divide em PRs curtas.
**Só leitura; nada foi alterado.**

## Bloqueios — situação

| | Situação | Fonte |
|---|---|---|
| **BJ-1** · data da venda | **Respondida pelo código.** `unit.mes_venda` guarda `MM/DD/YYYY` (é o que o `DateField` grava; a base local tem `01/27/2026`). A lista renderiza o texto cru, então mostra mês/dia. A rota do agente já passa por `dateBR`. A seção 3.2 é **correção de exibição**, não padronização | `V2-BLOCO2-DECISOES.md`, `date-field.tsx`, `unidades/page.tsx:224` |
| **BJ-2** · duplicatas | **Nenhuma em produção** (30/09). A trava única `(version_id, code)` pode entrar. A migração falha e para se, até lá, aparecer duplicata; a consulta 2 de `docs/sql/v2-prompt-j-diagnostico.sql` reconfere na hora | diagnóstico de produção do cliente anterior, removido |
| **BJ-3** · escrita assistida | **Decidida**: proposta com confirmação humana, sem gravação direta, exclusão nunca assistida. Condição 1 (retorno `{ ok, error }`) entra na **mesma PR** do assistente ou antes dela | Prompt J |

Teste do dia 25 (BJ-1): fica para a verificação da PR J-1, **na base local**, com
unidade criada e apagada pelo próprio teste. Não será criada unidade em produção.

## O que já está feito por prompts anteriores

| Seção | Situação |
|---|---|
| 4.3 · importação respeita versão bloqueada | **Feito** (Prompt I, PR I-3 / 11.10): `importUnits` recusa `version.locked` com a mesma mensagem |
| 5.2 · exclusão com código digitado, bloqueio de vendida, travas | **Feito** (PR I-3): `deleteUnit(id, confirmacao)` exige o código, recusa vendida/permutada, cliente com contrato ativo, contas a receber, documentos, permutas e versão congelada. Auditoria guarda código, valor, status, obra e versão. **Falta só o plano de pagamento removido** no `meta` |
| 5.1 · `deleteUnit` devolve `{ ok, error }` | **Feito** (PR I-3). Faltam `saveUnit` e `importUnits` |
| 7 · fallback `ctx.projects[0]` | **Feito** (Prompt A): a tela pede a obra, nunca cai na primeira |
| 2.5 · rótulo do menu "Unidades" | **Feito** (Prompt C, `nav-menu.ts`) |
| Verificação de "ver" na página | **Feito** (Prompt M) nas três rotas |

## O que o código mostra, seção a seção

### 3.1 · Cabeçalho que não aparece

`PageHeader` (`src/components/app/page-header.tsx`) recebe `eyebrow` e
`subtitle` e **não renderiza nenhum dos dois** ("ocultados por ora para um
visual mais clean", commit `0601609`). A tela de Unidades monta
`eyebrow = "OBRA · Atual"` e `subtitle = "Bloco A · 12 unidades · VGV …"` e nada
aparece.

**Efeito colateral a conhecer:** 30 páginas passam `eyebrow` e 40 passam
`subtitle`. Voltar a exibir muda a aparência de todas elas de uma vez, como o
Prompt B já prevê ("voltarem a exibir o subtítulo que já passam"). Nenhum texto
menciona "projeto ativo". Os textos existentes foram lidos e são coerentes com o
Prompt A (obra · versão). É apresentação, sem dado.

### 3.2 · Data da venda

`{row.mesVenda ?? "—"}` cru, rótulo "Mês venda". Passa a `dateBR(row.mesVenda)`
(o helper que já inverte `MM/DD/YYYY` → `DD/MM/AAAA`, usado pela rota do agente)
e rótulo **"Data da venda"**. O formulário já usa `DateField` e já diz "Data da
venda". Nenhum valor gravado muda.

### 3.3 · VGV

`vgvMi` (função local da página) formata sempre em milhões: R$ 375.000 vira
"R$ 0,38M". Passa a helper puro: **valor cheio abaixo de um milhão, abreviado
acima**. Invisível hoje por causa de 3.1.

### 3.4 · Plural e tolerância

- `"${allRows.length} unidades"` → "1 unidade" no singular.
- Tolerância do saldo: `Math.abs(saldo) < 1` na lista **e no formulário**
  (`unit-form.tsx:67`) → **R$ 0,01**, nos dois lugares, por um helper só.
- **Quantas unidades mudam de sinalização:** só o dono pode responder, com a
  consulta 3 de `docs/sql/v2-prompt-j-diagnostico.sql` (reproduz
  `calcUnitTotal` em SQL). Na base local: zero. O relatório final traz o número
  de produção quando o dono rodar.

### 4.1 · Importação duplica

`importUnits` só insere. A **pré-visualização no navegador** marca "já existe
uma unidade com este código no projeto" como erro e não manda a linha, então
hoje reimportar pela tela não duplica, **mas** a action aceita qualquer lista
(a proteção está no cliente) e não há trava no banco.

Passa a: a action decide por `(version_id, code)`, **inserindo** o novo e
**atualizando** o existente; a pré-visualização mostra "vai atualizar" em vez
de erro; migração aditiva cria índice único `unit (version_id, code)` com
`IF NOT EXISTS` e `down`. Se houver duplicata, a migração falha reportando.

**Casamento do código:** exato, depois de `trim`. Hoje a pré-visualização
compara ignorando maiúsculas, mas o banco não, e a trava única também não.
Fica exato para bater com a trava; a pré-visualização passa a avisar quando só
a caixa difere.

### 4.2 · O que a atualização toca

Só bloco, tipo, m², andar, valor e status. **Nunca `payment_plan`**, nem
`mes_venda`, nem `item_type`. Hoje a inserção grava `emptyPlan()`; na
atualização o plano fica intocado. Só campos com coluna presente na planilha
são atualizados (planilha sem "Bloco" não apaga o bloco).

**Risco a registrar:** a planilha pode mudar o **status** de unidade vendida
(para "Disponivel", por exemplo) e ela some da receita. O Prompt J autoriza
status na atualização; a pré-visualização vai destacar essas linhas ("muda
status de unidade vendida") e a auditoria guarda o antes de cada campo.

**Lista de status da importação** aceita Disponivel/Reservado/Vendido; não
aceita **Permutado**, que o formulário aceita. Fica como está (fora do
escopo declarado); registrado como limitação.

### 4.4 · Relatório

`{ inserted }` → `{ ok, inseridas, atualizadas, ignoradas: [{ code, motivo }] }`.

### 5.1 · Retorno legível

`saveUnit` lança erro e termina em `redirect` (o formulário só mostra a
mensagem porque captura a exceção; em produção ela chega como digest).
`importUnits` idem. Passam a devolver `{ ok, error }` e, no sucesso,
`{ ok: true, id }`; o formulário navega e a lista mostra "Unidade X salva".

### 5.3 · Tenant no `where`

`getUnits(versionId)` só filtra por versão. Passa a `getUnits(tenantId,
versionId)`. Um chamador (`unidades/page.tsx`). Sem efeito observável.

### 6 · Assistente de IA — o que existe hoje

| Peça | Situação |
|---|---|
| Cliente de modelo | **Existe**: `src/lib/ai/client.ts` (SDK Anthropic, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, fallback de modelo, erros em português) |
| Leitura de documento | **Existe** para despesa, fornecedor e extrato (`src/lib/ai/*-extract.ts`), com `CampoIA`/`ResumoLeituraIA` marcando campo faltando/conferir (`campo-ia.tsx`) e a regra "nada é gravado até conferir e salvar" |
| Painel lateral por tela (Prompt E, Etapa 1) | **Não existe** em nenhuma tela. Nem o chat suspenso (Etapa 2) |
| `/diagnosticoia` | Tela de configuração que testa a chave e o modelo (`AiDiagnosticPanel`) |
| Preferência "recolhido" por usuário e navegador | Não existe padrão; entra por `localStorage` com chave por usuário |

O Prompt E é o **39º de 42** e ainda não foi executado; J diz "segue o Prompt
E" e a ordem de execução coloca E antes de J. Não há como esperar: o painel de
Unidades entra aqui, **como componente próprio desta tela**, seguindo o padrão
visual descrito na seção 6 do Prompt E (300 px, recolhível, selo, rodapé) e as
regras 2.2.3 (ids validados no servidor) e 4.2 (proposta, permissão no
servidor, auditoria com origem). Quando o Prompt E vier, ele generaliza.

Das quatro ações do painel:

| Ação | Precisa de IA? | Entra |
|---|---|---|
| Conferir planos de pagamento | **Não** — é `calcUnitTotal` contra `valor`, código puro | J-4 |
| Revisar cadastro (venda sem data, valor zero, código repetido, vendida sem plano) | **Não** — código puro | J-4 |
| Lance a venda conversando (texto, voz opcional) → preenche o formulário | **Sim** — texto digitado pelo usuário vai ao modelo | J-5 |
| Cadastrar a partir do contrato | **Sim** — o **documento** (com nome, CPF, endereço do comprador) vai ao modelo | J-5, ver pergunta |
| Receita reconhecida | — | **Não entra**: depende da seção 54 do Prompt I (rateio), que espera as datas das obras sem início e fim |

Entrada por voz: Web Speech API do navegador, só como atalho do campo de
texto, e o texto funciona sozinho.

## Pergunta (BE-2 do Prompt E, antecipada)

"Cadastrar a partir do contrato" manda o contrato de venda ao provedor de IA
(Anthropic), e o contrato traz dados pessoais do comprador. Hoje o sistema **já
manda** notas, comprovantes e extratos (com CPF/CNPJ de fornecedores) pelo
mesmo caminho (`LEITURA-DOCUMENTOS-IA.md`), sob a mesma chave. É a mesma
política ou o contrato de venda é diferente?

- **A** · mesma política dos documentos de despesa: manda o contrato como
  está. **Recomendo**, por coerência com o que já roda.
- **B** · mascarar CPF, telefone e endereço antes de enviar (regex no
  servidor). Perde o CPF para cruzar com o cadastro do cliente.
- **C** · não ler contrato; só a entrada por texto/voz.

Enquanto não responder, J-5 entra só com a entrada por texto; a leitura do
contrato espera.

## Fora de escopo (seção 7) — confirmado no código

`getUnitCodesByTenant`, `getReceivables`, `expandUnitReceivables` e
`calcUnitTotal` não são tocados. `deleteProject`, receita na DRE (§54), janela
do projeto (§55) e materialização (BI-2) ficam onde estão.

## Plano de PRs

| PR | Conteúdo | Muda dado? | Muda tela? |
|---|---|---|---|
| **J-1** · exibição | `PageHeader` volta a mostrar eyebrow e subtítulo (todas as telas); data da venda por `dateBR` e rótulo; VGV por ordem de grandeza; plural; tolerância R$ 0,01 num helper usado pela lista e pelo formulário; `getUnits(tenantId, versionId)`. Teste do dia 25 local | Não | Sim, todas (cabeçalho) |
| **J-2** · actions | `saveUnit` e `importUnits` devolvem `{ ok, error }`; sucesso visível; auditoria da exclusão com o plano removido; auditoria da gravação com origem (`formulario`) | Não | Só mensagens |
| **J-3** · importação | atualizar em vez de duplicar; nunca toca no plano; relatório inseridas/atualizadas/ignoradas; pré-visualização mostra o que vai atualizar; migração 0046 índice único `(version_id, code)` com `down`. Antes/depois de `unit` | Não (índice) | Pré-visualização |
| **J-4** · painel sem IA | painel lateral recolhível com preferência salva; selo "Confirma antes de gravar"; ações "Conferir planos" e "Revisar cadastro" em código puro, no servidor, com `projectId`/`versionId` validados | Não | Sim, Unidades |
| **J-5** · lançamento assistido | texto (e voz opcional) → modelo → proposta que **preenche o formulário** sem gravar; `saveUnit` marca origem `assistente` na auditoria; nenhuma rota grava a partir da proposta; contrato só após a resposta acima | Não | Sim, Unidades |

Cada PR: testes puros + integração, suíte inteira, typecheck, lint, build,
conferência no navegador, e a consulta 1 do SQL antes e depois (local).

## Relatório final — o que vai depender do dono

- Consulta 2 (duplicatas) e consulta 3 (tolerância) de
  `docs/sql/v2-prompt-j-diagnostico.sql` em produção, antes de aplicar J-3 e
  para o relatório de 3.4.
- Resposta A/B/C sobre o contrato de venda.

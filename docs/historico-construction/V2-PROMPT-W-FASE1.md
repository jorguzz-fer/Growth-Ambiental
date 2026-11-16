# Prompt W · Fornecedores e Stakeholders — Fase 1, inventário antes de escrever código

Prompt W (15 de 42, primeiro do Bloco 3) fecha a exclusão de `stakeholder`,
valida documento, faz "inativar" inativar de verdade, acrescenta o papel de
**Pagador por Terceiro** e o assistente. **Só leitura; nada foi alterado.**

## Bloqueios — situação

| | Situação | Fonte |
|---|---|---|
| **BW-1** · documentos duplicados e inválidos | **Depende de produção.** O SQL está em [`sql/v2-prompt-w-diagnostico.sql`](./sql/v2-prompt-w-diagnostico.sql) (consultas 1–3). No banco local há 3 cadastros, nenhum duplicado, 1 sem documento. **Nenhum registro é corrigido** por nenhuma PR deste prompt: a validação vale da entrada em diante; o gravado fica legível, editável e sinalizado (3.6). **Sem `UNIQUE`** (3.5) | consultas 1–3 |
| **BW-2** · papéis fora da lista | **Depende de produção** (consultas 4 e 4b). Local: só papéis da lista. Independente do resultado, a edição inline passa a **preservar** papel fora da lista (hoje reenvia só os marcados e perde o resto em silêncio): o formulário mostra o papel desconhecido como caixa marcada e o reenvia | consulta 4 |

## O que já está feito por prompts anteriores

| Seção | Situação |
|---|---|
| 5.1 · permissão de ver | **Feito** (Prompt M, Parte 1): `/fornecedores` verifica `ver` com `AccessDenied` (`page.tsx:20`) |
| 6.3 · subtítulo | **Feito** (Prompt J/B): `PageHeader` voltou a exibir; a tela já mostra "Registro global do tenant · N cadastrados" |
| Auditoria em `deactivate`/`reactivate` | já existe e distingue as duas |

## O que o código mostra, seção a seção

### 1 · Pagador por Terceiro
`PAPEIS_STAKEHOLDER` (`calc/constants.ts:283`) tem os 19; é lida pela tela,
pelo `fornecedor-extract.ts` (enum da leitura por IA) e pelo seed (`void`).
Acrescentar o 20º é uma linha; a IA passa a poder sugerir o papel (1.1).
`getSocios` (`queries.ts:319`) é o único filtro por papel, e filtra `ativo`.
Os selects "Quem desembolsou" (`restituicoes-manager.tsx:130`) e "terceiros"
do lote (`restituicao-lote.tsx:173`) recebem **`getStakeholders` inteira**, sem
filtro de papel nem de ativo (1.5).

### 2 · Exclusão cobre 1 de 6
`deleteStakeholder` (`actions/despesas.ts:160`) checa só `despesa.fornecedor_id`.
O banco local confirma as seis FKs: cinco `SET NULL` (despesa, despesa_terceiro,
recebimento_terceiro, acerto, compensacao) e uma `CASCADE` (document). Confirmação
é `window.confirm`; auditoria grava só o id.

### 3 · Documento
`addStakeholder` faz `trim()` via `g()`; `updateStakeholder` não. Nenhuma
validação. `cnpjValido` (`calc/emitente-fiscal.ts:55`) existe e aceita CNPJ
alfanumérico; **não há `cpfValido`** — será criado no mesmo módulo. Para avisos
sem bloqueio (3.4, 3.5) a action devolve `avisos: string[]` além de `ok`.

### 3-A · Autônomo PF
`stakeholder` tem endereço/número/bairro/cidade/estado/cep. A edição inline só
expõe 6 campos (nome, tipo, doc, e-mail, telefone, obs) — para corrigir um
cadastro sinalizado sem endereço, a edição inline precisa expor o endereço.
Local: **1** PF com papel de serviço/mão de obra sem endereço (consulta 5).

### 4 · Inativar
`getStakeholders` não filtra `ativo`; alimenta: `/fornecedores` (lista),
`/despesas` (select Fornecedor + mapa de nomes), `/restituicoes` (Quem
desembolsou, Beneficiário original, lote), `/acerto` (Favorecido) e a leitura
por IA de despesas (`actions/despesas.ts:1090`, casamento de fornecedor).
Local: 0 inativos. Telas que mudam com a seção 4: **Despesas, Restituições,
Acerto** (seletores passam a só ativos, mantendo o já vinculado). A listagem de
Fornecedores e o mapa de nomes continuam com todos.

### 5 · Integridade
`addStakeholder` retorna `undefined` sem permissão; as outras quatro lançam.
`nome` vira "Sem nome" nas duas. As cinco actions vivem em
`actions/despesas.ts:46-230` — vão para `actions/stakeholders.ts` sem mudar
comportamento (importadas por `fornecedor-form.tsx`, `fornecedores-table.tsx`).

### 6 · Listagem
Só "Mostrar inativos". Sem busca, sem filtro por papel, sem sinal no documento.

### 7 · Assistente
Não existe painel. A leitura por documento (`extractFornecedorFromDoc`,
`CampoIA`, `ResumoLeituraIA`) **não se toca**. O painel será puro (nenhum dado
vai a modelo; CPF nunca sai do servidor em claro: a tela já mascara no log).

## Plano de PRs

| PR | Conteúdo | Muda dado? | Depende de |
|---|---|---|---|
| **W-1** · actions e validação | 5.4 mover para `actions/stakeholders.ts`; 5.2 `{ ok, error, avisos }`; 5.3 nome obrigatório; 3.3 trim + `cnpjValido` reaproveitado + `cpfValido` novo; 3.4/3.5 avisos; 1.1 papel 20; 3-A.3 endereço condicional; BW-2 preservar papel fora da lista; edição inline com endereço | Não (nenhuma linha existente alterada) | — |
| **W-2** · exclusão | 2.4 seis checagens com contagem; 2.5 nome digitado; 2.6 auditoria com inventário e doc mascarado | Não | W-1 |
| **W-3** · seletores | 4.2 só ativos + mantém vinculado (Despesas, Restituições, Acerto); 1.5 "Quem desembolsou" só com o papel | Não | W-1 |
| **W-4** · listagem | 6.1 busca e filtro por papel; 6.2 documento sinalizado; 3-A.4 endereço sinalizado | Não | W-1 |
| **W-5** · assistente | 7.2 cinco análises, puro | Não | W-1 |

Sem migração: o papel novo é constante em código (9).

## Pontos que precisam da sua atenção (nenhum trava a W-1)

1. **1.5 × 1.6 — o select "Quem desembolsou" pode ficar vazio.** Ao filtrar
   só quem tem o papel, e como ninguém o tem ainda (o papel nasce agora e é
   concedido **item a item, por decisão humana**), Restituições fica sem
   opção até alguém conceder o papel em Fornecedores. Vou mitigar: o select
   explica "Nenhum cadastro tem o papel Pagador por Terceiro" com link para
   Fornecedores, e o assistente lista quem já tem obrigação sem o papel
   (consulta 8) para você conceder. **Se preferir que o filtro só entre
   depois de você conceder os papéis, me diga e deixo a W-3 para o fim.**
2. **3-A.3 em cadastro antigo.** Endereço passa a ser exigido ao **criar** PF
   com papel de serviço/mão de obra, e ao **editar** quando a edição é que
   cria a condição (muda o tipo para PF ou acrescenta o papel). Cadastro antigo
   que já estava na condição continua editável sem endereço, sinalizado
   (3-A.4). É a leitura que não trava a correção; se quiser exigir também na
   edição de cadastro antigo, é uma linha.
3. **BW-1/BW-2 em produção:** rode o SQL e me mande o resultado para o
   relatório final; nada no código depende dele.
4. `PADRAO-VISUAL.md` (6.4) não está no repositório; sigo o padrão das telas
   já entregues (Clientes, Liberações).

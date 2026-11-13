# Prompt P · Permuta — Fase 1, inventário antes de escrever código

Prompt P (Permuta, 11 de 42) trata o bem recebido em permuta como **ativo**,
não receita: corrige a integridade da tela `/permuta`, acrescenta inventário,
documentos e assistente, e alinha o reconhecimento à §57 do Prompt I. Este é o
inventário: o que o código mostra hoje, seção a seção, e como o trabalho se
divide em PRs curtas. **Só leitura; nada foi alterado.**

## Bloqueios — situação

| | Situação | Fonte |
|---|---|---|
| **BP-1** · inventário próprio ou Estoque? | **Decidido (30/09):** a tela de Permuta é o registro do **ativo recebido** (valor); quando o bem é insumo, a entrada no Estoque **aponta para a permuta** (`stock_movement.permuta_id`, que já existe) e a tela mostra "no Estoque". O Estoque controla quantidade e custo; a Permuta, o valor. Nenhum relatório soma os dois. O código confirma: só `addStockMovement` grava `permuta_id` (entrada com origem "Permuta", select na tela `/estoque`); `/estoque` apenas mostra a descrição da permuta na linha. Produção (30/09): **nenhum** movimento com `permuta_id` | `V2-BLOCO2-DECISOES.md`, `estoque.ts:57-71`, `queries.ts:618` |
| **BP-2** · o status governa? | **Decidido: sim.** Produção (30/09): nenhuma permuta "Disponível" com valor e data de venda, logo **não muda número hoje**. Mesmo assim entra atrás da chave da §57 (ver 4.4 abaixo) | (diagnóstico de produção do cliente anterior, removido) |
| **BP-3** · escambo é venda? | **Decidido (30/09, a levar ao contador com a §54):** a permuta é **parte do pagamento da venda** da unidade; o bem entra no inventário pelo valor da permuta, **sem receita própria**; a venda posterior gera **caixa**, e a diferença entre o que entrou e o valor do bem é **resultado na venda do ativo**. Escambo segue a mesma regra: troca realiza o resultado pela diferença, sem caixa | `V2-BLOCO2-DECISOES.md` |

## O que já está feito por prompts anteriores

| Seção | Situação |
|---|---|
| 3.3 · `addPermuta` sem `logAudit` | **Feito** (Prompt AK, Parte 1): grava `permuta.create` com projeto, versão, unidade, tipo e estimado. Faltam as actions novas (editar, cancelar) |
| 3.4 · permissão de ver | **Feito** (Prompt M): `/permuta` e `/permuta/novo` verificam `ver` antes de consultar, com `AccessDenied` |
| Versão congelada bloqueia o lançamento | **Feito** (decisão de 30/09): `obraDoFormulario` recusa `version.locked` |
| Obra explícita, sem fallback de cookie | **Feito** (Prompt A): `lerSelecaoDeProjeto` + `PedirProjeto` |
| Chave por empresa (B4) | **Feito** (PR #103, `src/lib/chaves.ts`, tela `/chaves`) — é o mecanismo da "chave da §57" |

## O que o código mostra, seção a seção

### 1 · A promessa falsa

`permuta/page.tsx:163-168` (faixa verde) e `permuta/novo/page.tsx:60`
(subtítulo) dizem que VENDIDO "atualiza automaticamente o campo Permuta em
Dados_de_Venda". **Nada no repositório escreve a linha `Permuta` do
`payment_plan` a partir da tabela `permuta`**: as escritas de `paymentPlan`
estão em `units.ts` (formulário e importação de unidades) e `version-io.ts`
(importação de versão), nenhuma lê `permuta`. "Dados_de_Venda" é o nome da aba
da planilha (`growth-template.ts`). Sai o texto (1.3/1.4). O diagnóstico de 1.5
está na consulta 2 de `docs/sql/v2-prompt-p-diagnostico.sql` (local: 1 unidade
com `Permuta` no plano e 0 permutas na tabela, logo zero duplicidades).

### 2 · Editar e estornar

Só existe `addPermuta` (`receitas.ts:61`). Não há editar, cancelar nem estornar.
A tabela não tem colunas de cancelamento. O padrão a copiar é o da `despesa`
(`cancelado`, `cancelado_em`, `cancelado_por`, `motivo_cancelamento`) e o da
auditoria campo a campo de `updateCliente` (valor anterior × novo).

### 3 · Validação, auditoria e permissão

- **3.1** `addPermuta` grava 17 campos sem validar: `estimado` vazio vira `"0"`,
  `valorVenda` idem; datas passam sem conferência; `parcelas` vira `Number()`.
- **3.2** Sem permissão: `return` silencioso; erro: exceção (digest genérico em
  produção). O formulário é `<form action>` server-side sem retorno.
- **3.5** `getPermutas(versionId)` filtra **só por versão** — sete chamadores:
  `permuta/page`, `versao/export/route`, `resumo/page` (2×), `caixa/page`,
  `fluxo-caixa.ts`, `dre/page`. Passa a receber o tenant, como `getUnits` na J-1.
- **3.6** O select grava `c.nomeCompleto` como texto em `permuta.cliente`.
  Passa a existir `permuta.cliente_id` (aditiva, `SET NULL`); a coluna de nome
  continua preenchida; registros antigos continuam exibindo o nome gravado
  (consulta 5 do SQL mostra quais casam com o cadastro).

### 4 · Reconhecimento

- `permutaCashByMonth` (`projection.ts:283`): caixa da revenda, à vista ou
  parcelada, pula escambo. **Fica como está** (4.2).
- `permutaRevenueByMonth` (`projection.ts:317`): copia o caixa e soma o escambo
  — a fragilidade de 4.3 (se o `continue` do escambo sair do caixa, soma dupla).
  Passa a separar explicitamente: `revenda = parcelasEÀVista(rows) + escambo(rows)`,
  com teste de que a saída é idêntica à de hoje.
- Hoje a revenda entra na DRE **pelo valor cheio** (`dre/page.tsx:134`,
  "item 10"), e no Resumo como `permVend` (`calcTotals`, único leitor do
  `status`). Pela BP-3 e pela §57.4.3, o que entra no resultado é o **ganho ou a
  perda** (`valorVenda − estimado`), em linha própria, fora da receita.
- **4.4 · onde isso entra.** A §57.7 pede **uma chave por empresa para o
  conjunto 54/56/57**, desligada ("ligar só uma deixa a receita errada de outra
  forma"). Essa chave será criada pela I-9, que ainda espera as datas das 19
  obras. Por isso, neste prompt: a função pura `permutaGanhoByMonth` nasce com
  testes e a tela de Permuta passa a mostrar o **resultado da revenda por
  ativo** (prévia); a ligação na DRE fica para a I-9, atrás da mesma chave. O
  status governando a receita (BP-2) entra do mesmo jeito. Com a chave
  desligada, DRE, Fluxo, Caixa e Resumo devolvem o de hoje (teste 23).

### 5 · Inventário

A tabela da tela já é o inventário por valor (BP-1). Falta: **tempo em
estoque** (dias desde `dataRecebimento`), totais por tipo (quantidade e
estimado) só dos **não vendidos**, selo "no Estoque" quando há
`stock_movement.permuta_id`, exportar `.xlsx`, importar com prévia (inserir /
atualizar / ignorar e por quê; recusa em versão bloqueada; não toca em ativo
vendido; vírgula decimal reportada, nunca zero) e modelo para download. Molde:
`unidade-importacao.ts` + `unidades-import-export.tsx` (J-3).

### 6 · Documentos

`document` tem `despesa_id`, `cliente_id`, `stakeholder_id`, `project_id`,
`unit_code` e, desde a K-3, `conta_receber_id`. **Não tem `permuta_id`.**
Coluna aditiva no mesmo formato da 0047. Versão por `(permuta_id, tipo)` como
`addClienteDoc` já faz (`clientes.ts:375-389`, corrigido no Prompt M). Remoção
desvincula e grava nome e chave na auditoria, como `deleteContaReceberDoc`.

### 7 · Assistente

Molde da J-4/J-5 e da K-4: análises puras (ativos parados por tipo, cadastro
incompleto, venda abaixo da entrada com o resultado de cada um, duplicidade
com o plano — o 1.5 como consulta) e lançamento por descrição em texto/voz
com proposta guardada no navegador e gravação pelo botão. **Leitura de
documento (7.4) espera a resposta A/B/C**, como na J-5 e na K-4. Selo "Propõe,
você confirma". Linguagem: ativo, caixa e ganho — nunca "receita projetada"
(o rótulo da tela de hoje muda junto).

## Plano de PRs

| PR | Conteúdo | Muda dado? | Depende de |
|---|---|---|---|
| **P-1** · integridade | 1.3/1.4 texto; 3.1 validação; 3.2 `{ ok, error }` com mensagem na tela (formulário cliente); 3.5 tenant em `getPermutas` (7 chamadores); 4.3 separação explícita com teste de saída idêntica; SQL de diagnóstico | Não | — |
| **P-2** · editar, cancelar, cliente por id | migração **0049** aditiva: `permuta.cancelado/_em/_por/motivo_cancelamento`, `permuta.cliente_id`, `document.permuta_id`; `updatePermuta` (auditoria antes × novo), `cancelarPermuta` (lógico), consultas e cálculos ignoram cancelados (2.4: `getPermutas`, `permutaRevenueByMonth`, `permutaCashByMonth`, `calcTotals`); tela `/permuta/[id]` | Colunas novas, default preserva | P-1 |
| **P-3** · reconhecimento | `permutaGanhoByMonth` puro + testes; variante "status governa" pura; prévia do resultado por ativo na tela; rótulo "Receita projetada" → "Revenda (caixa projetado)". **DRE fica como está** até a I-9 | Não (sem chave) | P-1 |
| **P-4** · inventário | 5.2–5.6: tempo em estoque, totais por tipo, "no Estoque", exportar, importar com prévia, modelo | Insere/atualiza só por decisão humana | P-2 |
| **P-5** · documentos | 6.2–6.7 sobre `document.permuta_id` (criada na P-2) | Não | P-2 |
| **P-6** · assistente | 7.3 lançar por descrição; 7.5 análises; selo; 7.4 **só após A/B/C** | Não | P-2, P-3 |

Cada PR: testes puros + integração, suíte inteira, typecheck, lint, build,
conferência no navegador, e antes/depois de `permuta` (consulta 1 do SQL).

## Perguntas (nenhuma trava a P-1)

1. **4.4:** confirma que a ligação do ganho na DRE e o "status governa" ficam
   para a I-9, atrás da chave única 54/56/57? (Alternativa: criar a chave já na
   P-3 só com a parte da permuta — mas a §57.7 diz que ligar uma parte sozinha
   deixa a receita errada de outra forma, e em produção não há permuta vendida,
   então nada se ganha.)
2. **7.4:** a mesma A/B/C da J-5 (enviar documento ao provedor de IA).
3. **Tipos de documento do ativo (6.3):** Matrícula ou documento do bem · Laudo
   de avaliação · Contrato de permuta · Recibo · Outros — confirmar ou ajustar.

# Prompt R · Contas a Pagar — Fase 1, inventário antes de escrever código

Prompt R (18 de 42). A tela é **somente leitura** e continua sendo. **Só
leitura nesta fase; nada foi alterado.** SQL em
[`sql/v2-prompt-r-diagnostico.sql`](./sql/v2-prompt-r-diagnostico.sql).

## Bloqueios — situação

| | Local | Decisão |
|---|---|---|
| **BR-1** PED pode repetir | `number_sequence`: 0 linhas (a semente nasce no 1º lançamento pelo app); 0 PEDs repetidos. Produção: rodar o SQL (sequência × maior usado) | Fora desta tela (tarefa própria). **Nenhuma constraint é criada** antes de a 2ª consulta vir vazia |
| **BR-2** guarda-chuva | nenhum projeto "DESPESAS GERAIS" local; os `kind` locais: EMPREENDIMENTO PILOTO (`proj`), ESCRITÓRIO CENTRAL (`office`), OBRA 7 (`proj`). Produção: SQL | Reportar; reclassificar é decisão humana |

## O que o Prompt I já fez aqui (e não se toca)

| Seção do R | Situação |
|---|---|
| **2.1–2.3** pendente = saldo | **Feito (I §15):** `saldosReaisDasDespesas` (pagamentos − abatimentos de acerto), `pendenteDaConta`/`totalPendente` em `contas-pagar-regras.ts`, usados por Contas a Pagar, Dashboard e Fechamento. Falta: o saldo **por parcela** (seção 1) e "Total" com nome que diga o que é (2.4) |
| **3** escopo de versão | **Feito (I §10):** chave `contas_pagar_so_atual` faz `getContasPagar` filtrar `version.kind = "atual"` quando ligada; prévia na tela para quem administra chaves. Local: 0 despesas fora da Atual. Não mudo o desenho da chave (decisão do I) |
| **4.1–4.2** "Vencida" | **Feito (I §16):** `statusExibido` único para exibição, filtro, ordenação e contadores; "Vencida" entra nas opções. Falta: 4.3 selo com ícone e destaque na linha; 4.4 contador; 4.5 **hoje vem do navegador** (`calcularHoje()` no cliente); 4.6 "Parcialmente paga" nunca vira "Vencida" |
| **6.3** eyebrow/subtítulo | **Feito** (`PageHeader` exibe os dois) |
| Ordenação ISO, padrão vencidas → a vencer → pagas, rolagem interna, filtro de projeto por id, separação despesa × obrigação | ✔ intactos |

## O que o código mostra, seção a seção

### 1 · Listar por vencimento de obrigação
`lerContasPagar` lê só `despesa` (+ versão, projeto, fornecedor, cliente):
**nenhuma coluna de parcela**. Uma despesa em 12× é uma linha com o valor
cheio e o vencimento do cabeçalho. `despesa_parcela` tem `numero_parcela`,
`vencimento`, `valor_original`, `valor_pago`, `status`, `numero_cheque`,
`data_bom_para`. Local: 0 parcelas (a seed não parcela) — testes semeiam.
**1.4 (nota):** o editor de parcelas (`parcelas-editor.tsx`) edita
vencimento, valor, forma, cheque e status de cada parcela **só na criação**;
na edição da despesa o bloco de parcelamento não aparece (achado do BS-1 do
Prompt S). Reportado: remarcar uma parcela isolada hoje não é possível pela
interface. **1.6 / 1.7** (faturas de cartão): dependem do Prompt U — ficam
para lá.

### 2.4 · "Total"
Soma pagas e a pagar sob o rótulo "Total". Passa a "Total lançado no filtro".
**2.5** local: pendente hoje = pendente por obrigação (0 parcelas). Produção: SQL.

### 4 · Vencida
4.3/4.4/4.5/4.6 como na tabela acima. **4.6 — decisão recomendada pelo prompt,
adotada:** parcialmente paga com vencimento passado é "Vencida" (com o saldo
em aberto). `statusExibido` é compartilhado com a tela de Despesas: a mudança
vale nas duas (mesmo conceito) — reportado.

### 5 · Filtros
Cinco `<Select>` de valor único (fornecedor, cliente, projeto, categoria,
status) + intervalo de vencimento + "Limpar filtros". Passam a seleção
múltipla com caixas, busca quando houver muitos itens, marcar/desmarcar todos,
teclado; "e" entre filtros, "ou" dentro; nenhum marcado = todos.

### 6 · Interface
Tabela `min-w-[1200px]` com rolagem interna e cabeçalho fixo; falta fixar a
coluna Fornecedor (6.1). Descrição usa `obs ?? numDoc` (6.2) → estado vazio.

### 9 · Não regressão
`getContasPagar` alimenta Dashboard, Fechamento, conciliação (`caixa.ts:923`)
e a API do agente. **As linhas por parcela entram por uma consulta própria da
tela** (`getParcelasEmAberto`), mesclada na página: `getContasPagar` **não
muda**, e as três telas continuam com os mesmos números.

## Plano de PRs

| PR | Conteúdo | Muda dado? |
|---|---|---|
| **R-1** · obrigações | 1.2 uma linha por parcela em aberto (e paga), com nº, vencimento, saldo e cheque (1.3); 1.4 link para a despesa raiz com a parcela indicada; 1.5 obrigações intactas; 2.4 "Total lançado no filtro" | Não |
| **R-2** · vencida | 4.3 selo com ícone e linha destacada; 4.4 contador de vencidas (qtd e total); 4.5 hoje do servidor; 4.6 parcialmente paga vencida | Não |
| **R-3** · filtros e interface | 5 seleção múltipla com teclado; 6.1 coluna Fornecedor fixa; 6.2 descrição vazia | Não |
| adiado | 1.6/1.7 faturas de cartão (Prompt U) | — |

# Prompt A · PR 3 — Despesas sem "projeto ativo"

Primeiro módulo migrado, na ordem em que o dinheiro anda. Decisão aplicada:
**B-A2, memória por aba**.

## Como a tela escolhe a obra agora

| Situação | Antes | Agora |
|---|---|---|
| Abrir `/despesas` pelo menu | primeira obra do tenant (`projects[0]`) | a **última obra escolhida nesta aba**; se a aba ainda não escolheu nenhuma, a tela pede a escolha |
| `?proj=<obra>` | a obra | a obra (e a aba passa a lembrá-la) |
| `?proj=<id que não é da empresa>` | caía em `projects[0]` | tratado como "sem escolha" |
| `?project=<obra>` | ignorado | sinônimo de `?proj=` |
| Obra sem versão "Atual" | aviso (já corrigido antes) | aviso, e **nenhuma** leitura cai na versão do cookie |
| "Todos os projetos" | lista consolidada; formulário vinha com a **primeira obra marcada** | lista consolidada; o formulário vem **sem obra** e exige a escolha |
| Aba Parcelas em "Todos" | mostrava as parcelas **da primeira obra** sob o título "Todos" | pede a escolha de um projeto |
| Seletor | ordem de cadastro | obras pelo número, escritórios no fim |

**A memória** fica em `sessionStorage` (chave `gc:projeto`). Cada aba tem a
sua, o servidor nunca a lê e ela não é cookie. Ela vale entre as telas da mesma
aba: escolher a obra em Orçamentos e depois abrir Despesas abre a mesma obra.
Hoje só Despesas **lê** a memória; as demais telas passam a ler conforme forem
migradas. "Todos os projetos" é uma visão da tela, não entra na memória.

## Gravação

- **`addDespesa`** — o projeto é **obrigatório** e validado contra a empresa
  (`getProjectContext`). Antes, sem projeto no formulário, gravava na obra do
  cookie. O formulário também recusa antes de enviar.
- **`registrarPagamento`** — a versão vem **da própria parcela**, validada na
  empresa. Antes exigia que a parcela fosse da versão do cookie: pagar uma
  parcela listada na tela de outra obra dava "Parcela não encontrada nesta
  versão", e a saída de caixa ia para a versão do cookie. O bloqueio de versão
  congelada passa a olhar a versão da parcela.
- As actions de `despesas.ts` e `pagamentos.ts` usam `getTenantContext`.
  Nenhuma delas dependia de projeto além das duas acima.

## Não muda

Consultas, totais, ordenação da lista, edição (`?edit=` continua achando a
despesa em qualquer versão da empresa), links vindos de Contas a Pagar, busca,
Repositório e diagnóstico. Nenhum dado gravado é alterado.

## Verificação

- `despesas-projeto-explicito.test.ts` (Postgres, com `getActiveContext`
  proibido no mock):
  - sem projeto, nada é gravado;
  - projeto de outra empresa é recusado;
  - a despesa vai para a versão Atual da obra escolhida (a segunda da lista);
  - o pagamento vai para a versão da parcela;
  - parcela de outra empresa não é alcançada;
  - versão congelada bloqueia.
- Suíte inteira: 824 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador (build de produção, duas obras):
  1. aba nova sem `?proj` → pede a escolha;
  2. escolher → URL com a obra;
  3. sair e voltar pelo menu → reabre a mesma obra;
  4. segunda aba → pede a escolha, sem herdar;
  5. a segunda aba escolhe outra obra → a primeira continua na dela, também
     ao voltar pelo menu (**seção 32**);
  6. "Todos" → formulário sem obra marcada; Parcelas pede projeto;
  7. id desconhecido → volta à obra lembrada;
  8. `?project=` funciona.

## Próxima

Caixa (`caixa.ts` usa a versão implícita em 10 pontos).

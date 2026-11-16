# Prompt AC · DRE — Fase 1, inventário

Prompt AC (35 de 42). **Só leitura nesta fase; nada foi alterado.** SQL em
[`sql/v2-prompt-ac-diagnostico.sql`](./sql/v2-prompt-ac-diagnostico.sql).
A coleta `docs/TELA-DRE.md`, de um commit antigo, não está no repositório. O
inventário abaixo compara o prompt com o código **de hoje**.

## O que já mudou desde que o prompt foi escrito

| O prompt diz | Hoje |
|---|---|
| 1.1 · as versões vêm de `ctx.versions` (obra do cookie); só o projeto ativo compara | **Já corrigido (Prompt A):** `getProjectVersions(tenant, projeto escolhido)`, com tenant no `where`. Qualquer projeto compara. |
| 8 · `waterfall`, `aggregateInputs`, `versionInputsByMonth` etc. são locais da página | **Em boa parte já extraído (Prompt B):** `calc/dre-cascata.ts` (puro) e `dre-inputs.ts`. Sobram na página: `monthIndex`, `enumMonths`, a montagem das colunas e o recorte de período. |
| 1.3 · `versionIdOfKind` com quatro fallbacks | **Continua**, em `dre-inputs.ts`: pedido → `atual` → `isDefault` → primeira. "Empresa toda" pedindo Orçamento soma o **Realizado** de quem não tem Orçamento, sem aviso. |
| 1.4 · limite de três versões | **Continua** (`.slice(0, 3)`). |
| 1.5 · mensal com várias versões mostra só a primeira | **Continua** (`compareVersions[0]`). |
| 1.7 · "% Receita" some com mais de uma coluna | **Continua.** |
| 4.1 · sem categoria descartada em silêncio | **Continua** (`if (!d.categoriaDre) continue`). A Conferência (Prompt AN) já lista esses lançamentos. |
| 4.2 · sem competência no balde `NO_COMP` | **Continua.** Entra só no Acumulado. |
| 7 · eixo de meses vem da tabela INCC | **Continua.** As janelas de ano já são de 12 meses cheios, então o **total por ano não depende do INCC**. Só a lista de anos e as colunas do mensal Acumulado dependem. |
| 3.1 · encargos pela data de pagamento | **Continua** (`getEncargosByVersion`). |

## Bloqueios

| | Situação | Decisão adotada |
|---|---|---|
| **BAC-1** | Base local: só despesas com categoria e competência. Nenhuma unidade vendida, nenhuma conta a receber. Uma liberação de R$ 4.321 na OBRA 7 TESTE. Produção: relatórios 1 a 4. | — |
| **BAC-2** | Base local: no máximo três versões por projeto, sem cópias. Produção: relatório 5. | Teto de **12 colunas de versão**. A tabela já nasce com rolagem horizontal e primeira coluna fixa. Acima do teto, a tela avisa e propõe reduzir. |
| **BAC-3** | A cascata (Retiradas no EBITDA; Investimentos e Empréstimos no Resultado) é decisão contábil do cliente. | **Parte 6 não implementada.** Só a nota de rodapé dizendo que as três linhas estão incluídas. Pergunta para o dono. |
| **BAC-4** | Despesa com categoria "Receita" soma na receita. A trava do lançamento novo (Prompt S, 3-C) **já existe** (`validarCategoriaDespesa`). Base local: 0. Produção: relatório 6. | A linha sai **atrás da chave nova da DRE, nascida desligada**, com prévia e lista dos lançamentos. |

## Conflito: a Parte 1 muda número

O prompt manda a Parte 1 sem chave (10.2). Mas tirar os fallbacks (1.3)
**muda o total** da "Empresa toda" pedindo Orçamento ou Previsão. Projeto
sem aquele cenário deixa de somar o Realizado. A regra do dono é que mudança
de número vai atrás de chave por empresa, nascida desligada.

**Caminho adotado, sem perda:**
- **Chave desligada:** o número não muda. O fallback continua, mas é
  **declarado** no cabeçalho, por exemplo: "2 de 3 projetos não têm
  Orçamento; neles entra o Realizado".
- **Chave ligada:** sem fallback. O projeto sem o cenário fica fora, e a
  cobertura é declarada, por exemplo: "Orçamento: 1 de 3 projetos".

Fica uma chave só para a DRE (10.1), com as Partes 1.3, 2 e 3.1.

## Plano de PRs

1. **AC-1, comparação (Partes 1 e 8):**
   - módulo puro com período, resolução de cenário por projeto e montagem
     de colunas;
   - todas as versões do projeto, com padrão Atual + Orçamento + Previsão
     mais recentes, sem cópia;
   - "Empresa toda" por **cenários** lado a lado, com cobertura declarada;
   - mensal em matriz mês × versão, com cabeçalho de dois níveis;
   - "% Receita" por coluna;
   - cabeçalho que declara o recorte, com o rótulo do cenário vindo do tipo
     da versão.
   - Mesmos números com a chave desligada.
2. **AC-2, o que some (Partes 3.2, 4, 5, 7 e 9):**
   - rodapé com o que fica fora da cascata: sem categoria, sem competência
     e categoria fora da lista;
   - o regime declarado por bloco;
   - eixo pela janela do projeto mais as competências com lançamento;
   - célula sem lançamento diferente de zero.
3. **AC-3, a chave da DRE (Partes 2, 3.1 e 10, mais o rodapé da Parte 6):**
   - prévia em `/chaves`;
   - encargo na competência da despesa;
   - receita sem a "quinta origem";
   - cenário sem fallback.
4. **AC-4:** relatório final.

# Prompt O · PR O-4 — assistente somente leitura

Quarta e última PR de código do Prompt O, conforme
[`V2-PROMPT-O-FASE1.md`](./V2-PROMPT-O-FASE1.md). Seção 6. **Sem migração.
O assistente não grava nada, por nenhum caminho** (6.1, teste 12): não há
action, rota nem botão — só análises em código puro sobre o que a página já
carregou, e avisos no formulário.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **6.1 · somente leitura** | analisa e aponta; selo "Somente leitura" | painel lateral recolhível (molde do Prompt E) com o selo "Somente leitura"; nenhuma ação de gravação |
| **6.2 · conferir lançamentos** | valor zerado/negativo, data ausente/inválida, origem em branco, % fora de faixa | `conferirLancamentos()`; o "%" só é avaliado quando a coluna tem valor (ela saiu da tela, BO-2) |
| **6.2 · comparar com a medição** | competências com medição e sem liberação, e o contrário | `compararComMedicao()` sobre `getMedicoes(versionId)` (competência "MM/YYYY") × mês da data da liberação |
| **6.2 · liberações por competência** | mês a mês e acumulado, contra o previsto de financiamento das vendidas | `liberacoesPorCompetencia()`: tabela mês/entrou/acumulado e o financiamento previsto = soma de `Banco.valFinanc` das unidades vendidas da versão, com o % liberado. **Caixa contra previsão de caixa** |
| **6.2 · duplicidade aparente** | mesmo valor, data e origem mais de uma vez | `duplicidadesAparentes()` (origem sem caixa; canceladas não contam), com link para cada uma |
| **6.2 · no formulário** | antes de salvar: competência com medição e sem liberação; lançamento igual a um existente | `avisosDoFormulario()` roda no cliente conforme o usuário digita (data, origem, valor), com as liberações e medições da versão carregadas pela página. **Avisos, nunca preenchimento; não impedem salvar** |
| **6.3 · nunca** | afirmar conferência com o banco; tratar como receita | não há frase de "conferido"; o rodapé diz que o assistente não afirma isso |
| **6.4 · caixa, nunca receita** | não soma a receita, resultado ou margem | nenhuma função ou rótulo usa "receita"; o painel diz "entrada de caixa" e compara com medição e financiamento previsto. O número inflado das cinco telas (BO-1) não é repetido |
| **canceladas** | — | todas as análises ignoram liberações canceladas (O-3) |

## Arquivos

- `src/lib/liberacao-analise.ts` (+ teste, 6 casos): `competenciaDaData`, `conferirLancamentos`, `compararComMedicao`, `liberacoesPorCompetencia`, `duplicidadesAparentes`, `analisarLiberacoes`, `avisosDoFormulario`.
- `src/components/app/assistente-liberacoes.tsx` (novo).
- `src/components/app/liberacao-form.tsx` (avisos; data e origem controlados), `reembolso/novo/page.tsx` (carrega liberações e medições), `reembolso/page.tsx` (painel ao lado, análises).

## Verificação

- Testes puros: competência da data; conferir (inclui % fora de faixa; cancelada não entra); medição × liberação nos dois sentidos; por competência com acumulado, previsto das vendidas e %; duplicidade sem caixa; avisos do formulário nos três cenários.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): painel com as quatro análises e contadores; no cadastro, digitar data numa competência com medição e sem liberação mostra o aviso; repetir valor, data e origem de uma existente mostra o aviso de duplicidade; salvar continua permitido.

## Fica para depois

- Relatório final do Prompt O: `V2-PROMPT-O-FINAL.md`.

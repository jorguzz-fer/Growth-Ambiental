# Prompt Q · PR Q-3 — assistente de Parâmetros / INCC

Terceira e última PR de código do Prompt Q, conforme
[`V2-PROMPT-Q-FASE1.md`](./V2-PROMPT-Q-FASE1.md). Seção 6. **Sem migração.
O assistente não grava nada, por nenhum caminho** (teste 10): não há action
nem rota — só análises em código puro sobre o que a página carregou, e uma
prévia calculada no navegador.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **6.1 · propõe e para** | pode sugerir índices; gravação é do usuário pelo caminho que já existe | não existe caminho de gravação: gravar é sempre pela tabela, com a confirmação de sempre |
| **6.2 · atualizar o índice** | pergunta se quer atualizar; proposta com mês, valor, variante, fonte, data; **nunca inventar**; **bloqueio menor: sem fonte definida, só identifica os meses faltantes** | exatamente o bloqueio menor: "Meses faltantes" lista os períodos encerrados ainda em projeção e **pede que o usuário informe** o índice oficial na tabela, com a fonte. **Não sugere valor** (não há fonte externa definida nem variante confirmada — BQ-1); não estima, não interpola, não usa a média móvel como oficial (teste 11, 12) |
| **6.3 · meses faltantes** | períodos encerrados sem índice oficial | `mesesEncerradosSemOficial` (projetados antes do mês corrente) |
| **6.3 · curva projetada × histórico** | distância da média móvel; há quantos meses é só projeção | média das últimas 12 variações oficiais × média usada na projeção, distância em p.p. (destaque a partir de 0,2), cauda de projeção e desde quando, e aviso quando a primeira projeção usou menos de 12 meses |
| **6.3 · efeito de uma alteração** | antes de confirmar: quanto muda o acumulado e quais meses são reescritos | `efeitoDaAlteracao` roda **a mesma regra da gravação** (`projectIncc`) sem gravar: mês de/para, acumulado do mês e do último mês, meses projetados reescritos; aviso de faixa. Escolhe-se mês e variação no painel; "Prévia apenas. Para gravar, edite o mês na tabela" |
| **6.3 · cobertura** | a tabela cobre a janela do projeto? recebível fora é corrigido por zero | tabela de/até; janela da obra (`start_date`/`end_date`) fora da tabela; meses com vencimento de recebível das vendas (versão Atual, `expandUnitReceivables`) sem linha na tabela — "corrigidos por zero, em silêncio" |
| **6.4 · nunca** | gravar índice, marcar oficial, rodar reprojeção, afirmar índice sem variante/fonte, tratar projeção como real | o painel não tem nenhuma dessas ações; o texto repete "projeção é projeção: não é índice real" |
| **6.5 · selo** | não "Somente leitura" | "Propõe, você confirma" |

## Arquivos

- `src/lib/incc-analise.ts` (+ teste, 3 casos): `curvaProjetadaVsHistorico`, `efeitoDaAlteracao`, `cobertura`, `analisarIncc`, `mesDaData`.
- `src/components/app/assistente-incc.tsx` (novo); `parametros/page.tsx` (painel ao lado; análises).
- `docs/historico-construction/sql/v2-prompt-q-diagnostico.sql` — consulta 5 corrigida para `start_date`/`end_date`.

## Verificação

- Testes puros: curva (médias, distância, cauda, histórico curto); efeito (mesma regra, sem mutar a entrada; mês inexistente ou valor inválido → nulo); cobertura (vencimentos fora, janela além dos limites).
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): painel com as quatro análises; "Meses faltantes" pede que o usuário informe; a prévia do efeito mostra de/para e os meses reescritos sem gravar (`incc_rate` idêntica antes e depois).

## Fica para depois

- Resposta de BQ-1 (variante) e definição da fonte externa (6.2): só então o assistente poderá propor valores, sempre com variante, fonte e data.
- Relatório final do Prompt Q: `V2-PROMPT-Q-FINAL.md`.

# Núcleo financeiro — Growth Ambiental

Este documento cobre medições, receitas, DRE, reembolsos, Budget/Forecast e rentabilidade de consultorias ambientais.

O núcleo **reaproveita** o módulo de Contratos e Aditivos (migração 0077) e o motor de DRE (cascata + DRE gerencial por classe do Plano de Contas, 0079). Esta etapa completou o que faltava e **não criou módulos paralelos**.

## 1. Medições de serviço

- **Onde:**
  - Aba *Medições* de cada contrato, para lançar e aprovar.
  - `/contratos/medicoes`, para o relatório e a exportação.
- **Campos novos (migração 0081, só acrescenta colunas):**
  - número sequencial por contrato;
  - período executado (início e fim);
  - aditivo que autorizou o serviço;
  - fase, atividade e entrega do plano de trabalho.

  Já existiam: item, projeto, marco, competência, quantidade, percentual, valor, responsável, data, situação, aprovador e documentos (`document.contrato_medicao_id`). O histórico fica na auditoria.
- **Métodos (critério do item):** quantidade executada, percentual de avanço, entrega concluída, marco contratual e valor fixo periódico. Nenhum é imposto: cada item tem o seu.
- **Estados:** rascunho, submetida, em análise, aprovada, rejeitada e cancelada.
  - Aprovar e rejeitar exigem `contratosaprovar`.
  - Rejeitar e cancelar exigem motivo.
- **Regras:**
  - Limite do item = original + variações de aditivos eficazes.
  - Limite do contrato = valor atualizado.
  - A aprovação trava o contrato (`FOR UPDATE`) e nunca ultrapassa o limite, mesmo com aprovações simultâneas.
  - O número da medição é atribuído com o contrato travado (5 lançamentos simultâneos recebem 1 a 5).
  - A chave de idempotência evita duplicar uma medição enviada duas vezes.
  - Fase, atividade e entrega precisam ser do plano do projeto da medição; a atividade e a entrega, da fase informada.
  - Aditivo rejeitado ou cancelado não autoriza medição.
- **Relatório (`/contratos/medicoes`):**
  - Filtros: contrato, situação e competência.
  - Totais: aprovado, em aprovação e rascunho.
  - Com um contrato escolhido, mostra também valor original, aditivos, atualizado, acumulado aprovado e saldo a medir.
  - Exportação: **XLSX** (`/contratos/medicoes/exportar`) e PDF (impressão).

## 2. Receitas — os cinco valores

`src/lib/receita-servicos.ts` (puro) apura, por contrato, os cinco valores na aba *Faturamento e recebimentos* ("Conciliação dos cinco valores"):

| Valor | Fonte |
|---|---|
| Contratado | valor atualizado (original + aditivos eficazes) |
| Medido | medições **aprovadas** |
| Faturado | faturas do contrato (contas a receber com `contrato_id`, sem canceladas) |
| Receita reconhecida | regra atual da DRE: fatura no **mês do vencimento** |
| Recebido | recebimentos das faturas (sem estornados) |

Também mostra:
- saldo a medir;
- medido não faturado (negativo quando o faturamento está à frente);
- faturado não recebido;
- faturado ainda a reconhecer.

O exemplo da especificação foi testado com o fluxo real (600 / 350 / 300 / 250 resultam em 250 / 50 / 50).

**Medição aprovada não gera receita sozinha.** Faturamento parcial, recebimento parcial, cancelamento e idempotência continuam como no módulo de Contratos.

### Pendência contábil (não implementada)

A **política de reconhecimento** da receita de serviço (CPC 47: medição aprovada × vencimento da fatura × política por contrato) aguarda validação. Hoje vale a regra que a DRE já usava. A tela declara isso no próprio quadro. Proposta detalhada em `MODULO_CONTRATOS_ADITIVOS.md` §5.

## 3. DRE

- **Motor único:**
  - cascata (`calc/dre-cascata.ts`);
  - DRE gerencial (`dreGerencial`): receita bruta, deduções, receita líquida, custos dos serviços, resultado bruto, despesas operacionais, resultado financeiro, outros resultados, tributos sobre o lucro e resultado líquido. A classe sai do Plano de Contas.
- **Visões:**
  - consolidada, por projeto e analítica (já existiam);
  - **nova: `/dre/contratos`**, DRE gerencial por **contrato** e por **cliente**, com filtro por período de competência.
- **Regras da visão por contrato e cliente:**
  - receita = faturas do contrato pelo vencimento;
  - custos = despesas **apropriadas** ao contrato, pela competência, na conta do plano;
  - despesa sem contrato fica na DRE do projeto (sem rateio arbitrário);
  - canceladas ficam fora;
  - cada fatura e cada despesa é de um só contrato: o total por cliente é a soma exata dos contratos (testado).
- **Rentabilidade no contrato:**
  - a aba *Custos e resultados* mostra a DRE gerencial do contrato e a margem líquida;
  - "custos dos serviços" representa os custos diretos;
  - "despesas operacionais" representa os custos indiretos atribuídos por apropriação explícita.
- **Recebimento não substitui receita por competência:** a DRE não lê o caixa como receita.

## 4. Despesas reembolsáveis

- **Fluxo:** despesa → reembolsável (no contrato) → solicitado → aprovado (valor aprovado ≤ solicitado) → faturado (conta a receber do mesmo contrato) → recebido.
- **Controles já existentes:**
  - comprovantes vêm da própria despesa;
  - não há duplicidade (uma despesa ativa por reembolso);
  - cancelamento lógico com motivo;
  - auditoria.
- **Novo: glosa** = solicitado − aprovado; rejeitado = glosa total. Aparece no relatório (KPI e coluna) e na exportação XLSX.
- **Pendência contábil (não implementada):** tratar o reembolso como receita bruta ou como recuperação de custo. Até a decisão, nenhuma regra nova; a fatura do reembolso é uma conta a receber como outra qualquer.

## 5. Budget e Forecast

- **Versões:** Orçamento, Previsão e Atual, com trava e aprovação (já existiam). Nenhuma versão sobrescreve outra.
- **Novo: projeção ao término** (`src/lib/projecao-financeira.ts`, puro). Aparece na tela de Previsão e na aba de resultados do contrato, por projeto.
- **Versões usadas:**
  - **Orçamento original:** o primeiro criado.
  - **Orçamento revisado:** o último Aprovado; senão o padrão; senão o mais recente.
- **Indicadores:**
  - realizado até o mês corrente;
  - **custo para concluir**: Previsão dos meses seguintes ou, sem Previsão, o Orçamento revisado (a tela diz qual);
  - **custo estimado ao término** = realizado + para concluir;
  - desvio em valor e %;
  - receita e resultado estimados;
  - margem estimada × orçada.
- **Custo considerado:** Custo Variável + Custo Fixo + Despesa Variável + Despesa Fixa + Despesas Financeiras, as mesmas linhas da cascata. Retiradas, investimentos e empréstimos ficam fora.
- **Pendência:** orçamento próprio por contrato depende de decidir se o contrato vira dimensão do Planejamento (`MODULO_CONTRATOS_ADITIVOS.md` §5.5). Hoje o orçamento é por projeto.

## 6. Margem e rentabilidade

- **Por contrato:**
  - DRE gerencial e margem líquida (aba do contrato e `/dre/contratos`);
  - margem sobre o medido (painel, gerencial).
- **Por cliente:** soma dos contratos (`/dre/contratos`).
- **Por projeto:** status e margem do Dashboard e projeção ao término.
- **Custos não alocados:** despesa sem contrato aparece na DRE do projeto e não é rateada para contratos. A apropriação é explícita, na aba do contrato.

## 7. Testes

- `src/lib/receita-servicos.test.ts` (puro): cinco valores, exemplo da especificação, receita antes do vencimento, faturamento à frente.
- `src/lib/projecao-financeira.test.ts` (puro): indicadores, base do restante, categorias fora do custo, sem dupla contagem do Custo Variável.
- `src/lib/actions/nucleo-financeiro.test.ts` (Postgres):
  - numeração concorrente;
  - validação de período, fase, atividade e projeto;
  - cinco valores pelo fluxo real;
  - DRE por contrato e cliente sem dupla contagem;
  - glosa;
  - relatório de medições e isolamento entre empresas;
  - projeção com Orçamento original e revisado.
- Suítes existentes: `actions/contratos.test.ts` (limites, concorrência de aprovação, guarda-chuva, faturamento, isolamento) e as de DRE.

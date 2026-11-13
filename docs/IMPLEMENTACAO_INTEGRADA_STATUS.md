# Implementação integrada — registro de progresso

Este documento é atualizado durante a execução. Os checkpoints são commits
locais na branch `claude/eager-brahmagupta-9k2ne9`.

**Estado inicial:**
- Suíte com Postgres isolado: 263 arquivos, 2268 testes, todos passando.
- Typecheck, lint (0 erros) e build passando.

## Diagnóstico inicial (classificação)

Legenda: **F** = implementada e funcional · **P** = parcial · **I** = lógica inadequada · **A** = ausente · **L** = legada (já descontinuada).

| Módulo | Classe | Situação encontrada |
|---|---|---|
| Contratos, aditivos, itens, guarda-chuva | F | `contrato*` (0077): valor atualizado derivado, limites por item, aprovação com trava, testes |
| Medições | P | Critérios e estados existem e o limite é travado na aprovação. Faltavam número sequencial, período executado e vínculo com aditivo, fase, atividade e entrega |
| Receitas (5 valores) | P | Contratado, medido, faturado e recebido existem. A receita reconhecida segue a regra atual (fatura pelo vencimento). Faltava a conciliação explícita dos cinco valores; a política de reconhecimento aguarda validação |
| DRE | P | Há cascata e DRE gerencial por classe (0079), consolidada e por projeto. Faltava DRE por contrato e por cliente |
| Reembolsos | P | O fluxo pendente → recebido existe. Faltava a glosa explícita no relatório; o tratamento contábil aguarda validação |
| Budget e Forecast | P | Há versões, trava e aprovação. Faltavam o custo para concluir, a estimativa ao término e os desvios |
| Margem e rentabilidade | P | Há a margem por contrato sobre o medido no painel. Faltava a rentabilidade com receita reconhecida, custo direto e indireto |
| Equipes e profissionais | P | Há diárias por projeto e dia. **Não há apontamento de horas** nem custo-hora |
| Rateios | P | Há rateio entre projetos por % ou valor, com memória de cálculo. Faltam base por horas e alvo contrato |
| NFS-e | P | Focus NFe, homologação ou produção. Faltam vínculo com cliente, contrato e medição, e unicidade nota ↔ recebível |
| Relatórios customizados | P | Fontes DRE e Fluxo. Faltam as dimensões cliente e contrato e as métricas de contrato e horas |
| Dashboard | P | Valor contratado, realizado, a receber e a pagar. Faltam os indicadores de contratos e medições e o filtro de cliente |
| Documentos | P | Tabela única com vínculos a cada entidade. Falta a busca transversal |
| Cris | P | Chat, anexos (PDF, imagem, DOCX), formulários assistidos, ferramentas de dados e consumo (`ia_uso`). Faltam regra explícita contra injeção, custo estimado, limites configuráveis, planilha fora do Caixa e ferramentas de reembolso, fluxo e forecast |
| Onboarding e treinamento | A | Só o provisionamento |
| Homologação ponta a ponta | A | Existe o seed demo; não há teste integrado do fluxo completo |
| Unidades, permuta, INCC, simulador | L | Descontinuados na etapa anterior |

## Progresso

- [x] Diagnóstico
- [x] Etapa 1 — núcleo financeiro (detalhes em `NUCLEO_FINANCEIRO_AMBIENTAL.md`)
  - Medição: número sequencial (com trava), período executado, aditivo, fase/atividade/entrega do plano (migração 0081); relatório com filtros e XLSX.
  - Os cinco valores por contrato (contratado, medido, faturado, receita reconhecida pela regra atual, recebido).
  - DRE gerencial por contrato e por cliente (`/dre/contratos`) e rentabilidade na aba do contrato.
  - Glosa de reembolso (tela e XLSX).
  - Projeção ao término (Orçamento original × revisado × realizado × previsão), na Previsão e no contrato.
  - Testes: 2 arquivos puros + `actions/nucleo-financeiro.test.ts` (Postgres). Suíte completa verde após ajustar os testes de menu e permissão para a tela nova.
  - Pendências contábeis documentadas: política de reconhecimento de receita; reembolso como receita ou recuperação de custo; orçamento por contrato.
- [ ] Etapa 2 — integração operacional
- [ ] Etapa 3 — Cris, onboarding e homologação

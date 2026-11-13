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
- [x] Etapa 2 — integração operacional (detalhes em `INTEGRACAO_OPERACIONAL_GROWTH_AMBIENTAL.md`)
  - Apontamento de horas (migração 0082, `/equipes/horas`): planejado × realizado, custo gerencial pela alocação, sem gerar despesa.
  - Rateio por horas no Acerto e Rateio (sugere os percentuais; memória gravada).
  - NFS-e ligada a cliente, contrato e medição aprovada; trava contra duas notas vivas na mesma conta a receber.
  - Dashboard: painel "Contratos e operação" com filtro de cliente e contrato e projetos com desvio.
  - Relatórios Customizados: fonte "Gerencial (tabela dinâmica)" com 8 dimensões e 15 métricas, reconciliável.
  - `/projeto/documentos`: busca transversal com a permissão de cada origem.
  - Testes: 3 arquivos puros + `actions/integracao-operacional.test.ts` (Postgres); catálogo do backup inclui `apontamento_hora`.
  - Pendências: centro de custo e rateio para contrato; NFS-e multiempresa e emissão real (credenciais/homologação); modelos salvos de relatório; cadastro de equipamento como ativo.
- [x] Etapa 3 — Cris, onboarding e homologação (detalhes em `CRIS_AVANCADA.md`, `ONBOARDING_GROWTH_AMBIENTAL.md`, `HOMOLOGACAO_PONTA_A_PONTA.md`)
  - Migração 0083 (aditiva): `contrato.idempotency_key`, `ia_limite`, `implantacao_etapa`, `implantacao_treinamento`.
  - Cris:
    - planilha (XLSX/CSV) lida fora do Caixa como documento de texto;
    - regra explícita contra injeção;
    - mensagem de falha sem texto cru do provedor ou do banco;
    - ferramentas `analise_gerencial` e `projecao_ao_termino`;
    - `montar_relatorio` com a fonte gerencial;
    - medição assistida na aba do contrato (proposta → conferência → salvar, nunca aprova);
    - contrato com idempotência e `origem: "cris"` na auditoria.
  - Consumo da IA:
    - custo estimado por período, mês e operação;
    - limites por hora configuráveis por empresa;
    - orçamento mensal opcional, só com alerta.
  - Implantação e Treinamento (`/implantacao`, permissão da tela Empresa):
    - modelo A–H customizável;
    - situações, dependências e evidência;
    - treinamentos por perfil.
  - **Correção de permissão:** as métricas financeiras do relatório gerencial, da Cris e do painel do Dashboard passaram a exigir `contratosfinanceiro:ver`. Antes, `contratos:ver` bastava e o técnico de campo veria faturado e margem.
  - Homologação ponta a ponta com empresa fictícia em Postgres isolado: 24 passos, conferências financeiras, 6 perfis e isolamento entre empresas (27 testes).
  - Pendências:
    - orçamento de IA só alerta (não bloqueia);
    - anexo direto na etapa de implantação;
    - formulários assistidos de aditivo e reembolso;
    - centro de custo (C2);
    - chamada real à API de IA não exercitada (sem chave neste ambiente).

## Validação final (Etapa 3)

| Verificação | Resultado |
|---|---|
| Typecheck (`npm run typecheck`) | sem erros |
| Lint (`npm run lint`) | 0 erros; 9 avisos (variáveis não usadas) em 5 arquivos de teste que esta etapa não alterou |
| Suíte com Postgres isolado (`npm run test:db`) | 274 arquivos, 2364 testes, todos passando, nenhum pulado |
| Build de produção | compilou; rotas novas no manifesto |
| Verificação visual (Playwright, `next start` local, empresa fictícia apagada ao fim) | `/implantacao` (modelo aplicado, A–H, recusa sem evidência, conclusão com evidência, dependência liberando A2, temas de treinamento); `/diagnosticoia` (custo estimado, limites); `/relatorios` com fonte gerencial; nenhum erro de página |
| Scripts e2e legados (`scripts/e2e/*.mjs`) | **não executados**: dependem de credenciais e de um seed de revisões antigas que não existem neste ambiente |
| Integrações externas | **não testadas de verdade**: IA (sem chave; modelo simulado nos testes), NFS-e (nenhuma emissão; provedor simulado), Open Finance (fora do escopo) |

Desempenho (volume sintético de 30 projetos e 60 contratos): relatório gerencial em 52 ms, painel executivo em 331 ms e 30 projeções em 223 ms. Detalhes em `HOMOLOGACAO_PONTA_A_PONTA.md` §5.

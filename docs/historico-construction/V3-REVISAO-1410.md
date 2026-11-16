# Revisão Final — Growth Construction: alterações e telas canceladas (Thiago, 14/10/2026)

Transcrição do documento enviado pelo Thiago em 14/10/2026. É o material de entrada da Fase 3; as decisões do dono estão em [`V3-DECISOES-1510.md`](./V3-DECISOES-1510.md) e o plano em [`V3-PLANO.md`](./V3-PLANO.md).

## Alterações da revisão de 04/out

A revisão tira a tela Assistente, cria quatro telas de relatório e torna
a IA ativa nas telas de input do Planejamento.

### Transversal

- Padronizar as versões como **Orçamento, Previsão Atualizada e Atual**.
  Saem Budget, Previsto, Forecast e Caixa Real.

- Toda tela terá assistente de IA. Nas telas de relatório, ele faz
  análises alternativas e simulações. Nas telas de input, ele lê
  documentos e preenche a tela por voz ou texto.

### Business Intelligence

- **Dashboard:** incluir os dois gráficos centrais do mockup e dar à IA
  a opção de gerar relatório em PDF com os indicadores escolhidos.

- **Relatórios Customizados:** implementar a tela, que não veio na
  versão atualizada, com chat próprio.

- **Assistente:** sai, porque os Relatórios Customizados absorvem a
  função.

- **DRE:** desmembrar em DRE Mensal e DRE Anual, com seleção de versões
  por checkbox.

- **DRE Analítica (nova):** drill-down até o plano de contas, com
  análise vertical.

- **Fluxo de Caixa:** ter visão mensal e semanal.

- **Fluxo de Caixa Analítico (novo):** abrir por grupo CEF, subgrupo e
  plano de contas, com análise vertical.

- **Resumo Executivo:** mantido, com indicadores de negócio
  selecionáveis (custo/m², VGV vendido).

### Planejamento

- **Projetos:** chat que lê documento e preenche o cadastro, e aceita
  alterações por comando (ex.: "mudar o projeto 28"). O cadastro deve
  pré-preencher datas, custo e receita em Orçamentos.

- **Orçamentos:** tornar o assistente de IA ativo para lançamentos por
  voz e por arquivo. Testar a tela.

- **Previsão Atualizada:** deixar a tela parecida com Orçamentos. A IA
  deve trazer dados do Atual e do Orçamento para ajustar a previsão mês
  a mês.

- **Plano de Contas:** chat para inserir departamentos, áreas e
  subáreas.

- **De-para (tarefa do Thiago):** associar cada grupo CEF a uma
  categoria da DRE. A associação fica fixada na tela, mas editável.

## Telas já definidas como canceladas

Na Etapa 2, oito telas foram removidas, sempre com redirecionamento e
sem apagar dados. Outras três mudanças de tela vieram das Etapas 1 e 2.

| Tela                                  | Decisão                                                                         | Etapa |
|---------------------------------------|---------------------------------------------------------------------------------|-------|
| Projeção de Receitas                  | Removida                                                                        | 2     |
| Consolidado                           | Removida                                                                        | 2     |
| Balanço do Dia                        | Removida                                                                        | 2     |
| Acesso Contabilidade                  | Removida                                                                        | 2     |
| Conferência de Planos                 | Removida                                                                        | 2     |
| Configuração da Versão                | Removida                                                                        | 2     |
| Ponto da Obra                         | Removida e substituída pelo módulo Pessoas (Funcionários e Equipes de Projetos) | 1 e 2 |
| Fechamento de Caixa                   | Removida                                                                        | 2     |
| Acerto Contábil                       | Virou aba somente leitura "Acertos" em Despesas                                 | 1     |
| Duas telas de medição                 | Fundidas em uma tela com abas                                                   | 2     |
| Duas telas de diagnóstico/conferência | Fundidas em uma tela com abas                                                   | 2     |

## Observações

**Consolidado:** a tela já estava cancelada desde a Etapa 2. Se apareceu
na versão atualizada, a remoção não foi implementada.

**Assistente:** é a mesma tela que, na Etapa 2, foi renomeada de
"Diagnóstico de IA" e reposicionada como chatbot de explicação do
produto, sem acesso ao banco. O chat de Relatórios Customizados faz
outra coisa, porque consulta dados. Ao extinguir o Assistente, falta
decidir se a função de explicar o produto acaba ou migra para outro
lugar, como uma ajuda no menu.

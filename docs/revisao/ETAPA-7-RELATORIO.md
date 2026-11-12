# Etapa 7 · A Cris lê os dados do sistema — relatório

**Data:** 12/11/2026 · **Spec:** `docs/revisao/SPEC-REVISAO-2026-11.md`, Parte 6
· **BAC-1 (decidido 12/11):** todos os módulos · **BIA-1 a BIA-6:** adiadas
(a plataforma arca com o custo; o catálogo vale para todas as empresas)

## O que a Cris passa a fazer

Em **qualquer tela**, a Cris pode analisar os dados de qualquer módulo. Ela
escolhe uma ferramenta e os filtros; o **servidor calcula e agrega**; ela
escreve o texto sobre o resultado. Ela não escreve consulta ao banco, não
recebe o banco e não recebe linhas em massa (no máximo 30 grupos por
resposta, com o percentual de cada um e o resto somado em "outros").

| Ferramenta | O que devolve | Permissão (ver) |
| --- | --- | --- |
| `custos_e_despesas_da_dre` | Custos e despesas da DRE (versão Atual, competência) por obra, categoria e/ou mês. **A mesma leitura da tela DRE** (`versionInputsByMonth`, com a chave "definição nova da DRE" da empresa) | DRE |
| `despesas_por_fornecedor_ou_situacao` | Despesas da Atual por fornecedor, conta do plano, situação (paga, a pagar, vencida) ou obra | Despesas |
| `recebiveis_e_inadimplencia` | Parcelas de venda e contas a receber: a receber, recebido pela conciliação e vencido, por obra, unidade ou mês | Contas a Receber |
| `caixa_e_conciliacao` | Saldo de cada conta, pendentes de conciliar por conta, o mais antigo, baixado sem conciliar | Caixa |
| `orcado_x_realizado` | Orçamento × Atual por obra e/ou categoria, com a diferença e o percentual | DRE |
| `unidades_e_vendas` | Unidades por obra e situação: quantidade, VGV e total dos contratos vendidos | Unidades |
| `medicao_estoque_equipes` | Medição por obra, grupo ou mês; estoque por obra; diárias por obra, função ou mês | Medição, Estoque, Equipes |
| `montar_relatorio` | O link de **Relatórios Customizados** (DRE, DRE por categoria e grupo, ou Fluxo previsto; por cenário, mês ou obra), que gera CSV e PDF | Relatórios ou DRE |

**Relatórios e Cris como uma coisa só:** a Cris monta a "receita" do relatório
pelas mesmas regras da tela (`receitaValida`), e a tela calcula com o acesso de
quem abre e exporta.

## Regras

- **Só leitura.** O AQ-T6 confere que o catálogo não grava nem importa quem
  grava.
- **Acesso da pessoa:** cada ferramenta confere o "ver" do módulo; obra só
  entre as que ela vê (nome pedido que não existe volta como "não
  encontrada"). Sem permissão, a ferramenta não lê nada e a Cris diz por quê.
- **Dado pessoal fora:** nenhuma ferramenta manda CPF, CNPJ de pessoa física,
  renda, salário, dados bancários ou saúde. Comprador aparece pela **unidade**,
  membro de equipe pela **função**. Nome de fornecedor aparece quando o
  agrupamento é por fornecedor, como na tela de Despesas. Tudo isso está na
  base de conhecimento ("O assistente").
- **A análise não depende da tela aberta (AC-T2):** o catálogo vai em todas as
  telas, e o executor não recebe a tela.
- **Inadimplência honesta:** "vencida" é parcela vencida **sem recebimento
  conciliado no Caixa** (Etapa 6, §5). Parcela paga mas nunca conciliada
  aparece como vencida, e a ferramenta manda a Cris dizer isso.

## Testes (`src/lib/cris-dados.test.ts`)

| Teste | O que confere |
| --- | --- |
| **AC-T1** | "Obras com custo variável e o percentual de cada uma": só as obras com custo variável, o valor de cada uma, o percentual (soma 100%) e **os mesmos números da DRE** de cada obra na Atual; com período, só as competências dele |
| **AC-T2** | O catálogo vai em qualquer tela, e o executor não recebe a tela |
| Agrupamentos | Por categoria, por obra pedida pelo nome; obra inexistente listada |
| Permissão | Sem "ver" da DRE, nada é lido e a resposta diz por quê |
| Dado pessoal | Recebíveis sem o nome do comprador (só a unidade) |
| Relatório | `montar_relatorio` devolve o link de Relatórios Customizados |
| AQ-T6 | O catálogo só lê |

## O que não deu para conferir aqui

- **A Cris escolhendo a ferramenta com o modelo de verdade**: esta sessão não
  tem a chave da Anthropic. O catálogo, os números, as permissões e a
  privacidade estão testados no servidor; a conversa fica para o teste com a
  chave, com a pergunta do Thiago no Dashboard e a mesma pergunta em outra tela.
- **Custo de uma pergunta de análise** (Prompt AU, item 5): também depende da
  chave. Com ela, rode a pergunta do AC-T1 numa empresa de teste e
  `scripts/medicao-au.ts` mostra o custo.

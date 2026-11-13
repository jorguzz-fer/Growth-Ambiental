# Empresa de demonstração — cinco projetos

O seed `src/lib/db/seed-demo` (catálogo em `dados.ts`, fluxo em `index.ts`) cria a empresa fictícia **Consultoria Ambiental** pelas **ações reais do app**. A sessão é simulada pelo stub de `auth`, e o empacotamento é feito por `scripts/build-seed.mjs`, como já era.

O catálogo de seis projetos passou a ter **exatamente cinco**. A sede administrativa existe, mas é uma unidade (Matriz/Filial), não um projeto.

## 1. Os cinco projetos

O mês 0 é 12 meses antes do mês da execução; o mês corrente é o 12.

| # | Projeto | Porte | Período | Situação | Contrato | Equipe (CLT + terceiros) | Fases / atividades |
|---|---|---|---|---|---:|---|---|
| 1 | Monitoramento Arqueológico — Rodovia das Araucárias | Grande | 18 meses (mês 2 a 19) | em execução | 1.200.000 | 5 + 4 | 6 / 16 |
| 2 | Diagnóstico Ambiental — Unidade Industrial | Pequeno | 3 meses (8 a 10) | concluído | 180.000 | 2 + 1 | 3 / 8 |
| 3 | Monitoramento de Fauna — Parque Eólico | Médio-grande | 12 meses (5 a 16) | em execução | 620.000 | 3 + 5 | 4 / 14 |
| 4 | Inventário de Flora — Loteamento | Médio | 7 meses (7 a 13) | próximo da conclusão | 330.000 | 2 + 3 | 4 / 11 |
| 5 | Gestão Ambiental Integrada — Complexo minerador | Muito grande | 24 meses (2 a 25) | em execução, com aditivo | 1.880.000 + 120.000 | 6 + 6 | 7 / 20 |

| # | Budget receita | Budget custo | Forecast receita | Forecast custo | Desvio | Margem projetada |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 1.200.000 | 840.000 | 1.200.000 | 915.000 | +75.000 (logística e terceiros) | 285.000 (23,8%) |
| 2 | 180.000 | 115.000 | 180.000 | 110.000 | −5.000 (economia) | 70.000 (38,9%) |
| 3 | 620.000 | 445.000 | 620.000 | 490.000 | +45.000 (campanhas) | 130.000 (21,0%) |
| 4 | 330.000 | 235.000 | 330.000 | 225.000 | −10.000 (economia) | 105.000 (31,8%) |
| 5 | 1.880.000 | 1.430.000 | 2.000.000 | 1.560.000 | +130.000 (com aditivo) | 440.000 (22,0%) |
| **Total** | **4.210.000** | **3.065.000** | **4.330.000** | **3.300.000** | | **1.030.000** |

A **margem de referência** é receita − custos diretos do projeto. Não é o lucro da empresa (ver §6).

## 2. Como os números são montados (sem valor digitado em tela)

- **Orçamento (Budget):**
  - É a versão Orçamento de cada projeto, por **subgrupo do plano de contas × mês**. É a granularidade do Orçamento no app (2.1 pessoal, 2.2 terceiros, 2.3 logística, 2.4 materiais, 2.6 taxas, 2.7 infraestrutura, 2.8 outros).
  - **Pessoal CLT:** horas planejadas × custo-hora, que é o salário + FGTS 8% + benefícios 15%, sobre 168 h.
  - **Demais linhas:** os valores do catálogo, com um fator por projeto para fechar exatamente o total da matriz.
  - **Receita:** a linha fixa "Receitas do Projeto". O total vem do cadastro (o valor **original** do contrato) e é distribuído pelos vencimentos previstos das faturas.
  - Depois de gravado, o Orçamento passa a **Concluído → Aprovado**.
- **Previsão (Forecast):**
  - É uma versão separada.
  - Até o mês corrente, guarda o **realizado lido do banco**: despesas da versão Atual por subgrupo e competência, e faturas por vencimento.
  - Depois do mês corrente, guarda a **reprojeção**: horas planejadas e linhas do orçamento com a pressão do cenário, ajustadas para o total da matriz.
  - Assim, a projeção ao término da tela dá **estimativa ao término = Forecast** em todos os projetos.
  - **Projeto concluído (P2):** o realizado fecha exatamente em R$ 110 mil, sem nenhum custo futuro.
- **Aditivo (P5):**
  - Acréscimo de R$ 120 mil com inclusão de 4 campanhas no item 04: aprovado, assinado e refletido no saldo e no limite de medição.
  - O Orçamento continua com R$ 1,88 mi.
  - Na Previsão, o aditivo é uma **linha de receita própria** (subgrupo 1.1), separada da linha fixa do contrato original. O custo do escopo adicional entra só na Previsão.
- **Equipes:**
  - **CLT:** alocações de funcionários com custo-hora.
  - **Terceiros:** alocações de fornecedores com papel de prestação de serviço ou RPA; os PF têm diária.
  - **Horas:** planejadas (mês a mês) e realizadas (dias úteis, até ontem), ligadas ao contrato e à fase do plano.
- **Pessoal sem dupla contagem:**
  - As horas **não** geram despesa.
  - A folha é lançada **uma vez**: a parte apropriada pelas horas vai a cada projeto (2.1.01 salários, 2.1.02 FGTS, 2.1.03 benefícios).
  - O restante (administrativo e horas internas) vai à sede (3.2).
  - O "custo de pessoal (gerencial)" do relatório é a mesma apropriação vista pelas horas, não um custo a mais.
- **Terceiros:** o custo é o serviço contratado, lançado como despesa do fornecedor (2.2.x).
- **Rateio:** a base de campo compartilhada (R$ 6 mil/mês) é paga uma vez e rateada 60% para o P5 e 40% para o P1 pelo Acerto e Rateio, com memória de cálculo.
- **Apropriação:** todas as despesas de projeto são apropriadas ao contrato do projeto (DRE por contrato e cliente, relatório gerencial).
- **Situações demonstrativas:**
  - medições do mês corrente enviadas ou em análise (7);
  - uma fatura vencida (P5);
  - recebimento parcial (última fatura do P2);
  - despesas em aberto;
  - reembolsos: um aprovado com glosa de 5% e um solicitado;
  - compras no cartão e faturas pagas;
  - estoque: compras como custo do projeto e saídas sem custo.

## 3. Execução local (banco isolado)

```bash
export DATABASE_URL='postgres://…/banco_de_teste'      # nunca o operacional
MIGRATIONS_DIR=src/lib/db/migrations npx tsx src/lib/db/migrate.ts
npm run build:seed
SEED_ADMIN_EMAIL=demo@exemplo.com node .migrate/seed.mjs
SEED_ADMIN_EMAIL=demo@exemplo.com node .migrate/conferir-demo.mjs   # conferência independente
```

`conferir-demo.mjs` só lê. Ele usa os motores das telas (projeção ao término, cinco valores, indicadores executivos, relatório gerencial, DRE por contrato, DRE da versão Atual, fluxo de caixa) e sai com código 1 se algo não reconciliar.

## 4. Recriação segura

- **Se a empresa já existe:** o seed **mostra o escopo** (id, usuários, projetos, despesas) e para. Nada é apagado por nome.
- **Para recriar:** é preciso `SEED_DEMO_RECRIAR=sim` **e** `SEED_DEMO_TENANT_ID=<id exato>`.
- **Mesmo com o id certo, a recriação é recusada se:**
  - a empresa tiver usuário fora da demonstração;
  - ou o login da demo não for o proprietário.
- **Outras empresas com o mesmo nome** ficam intactas.

Testado localmente: recusa sem id, com id errado e com usuário estranho; recria com o id certo.

## 5. Conferência local (resultado obtido)

**Execução:** em 13/11/2026, banco isolado, em cerca de 35 s.

**Volume criado:**

| Item | Quantidade |
|---|---:|
| Clientes | 6 |
| Fornecedores (11 terceiros técnicos) | 24 |
| Funcionários CLT | 11 |
| Projetos | 5 |
| Contratos | 5 |
| Aditivos | 1 |
| Medições (7 em análise no mês) | 56 |
| Faturas | 32 |
| Recebimentos (1 parcial) | 27 |
| Despesas (117 de folha apropriada, 135 de terceiros) | 562 |
| Pagamentos | 478 |
| Rateios | 10 |
| Reembolsos | 2 |
| Materiais | 8 |
| Movimentos de estoque | 86 |
| Alocações (18 CLT + 19 terceiros) | 37 |
| Apontamentos de horas | 289 planejados, 1.382 realizados |

**Reconciliação (todas as conferências passaram):**
- **Contratado:** R$ 4,33 mi no Dashboard executivo, no relatório gerencial e na soma dos contratos.
- **Contratos:** medido R$ 2,026 mi = faturado; recebido R$ 1,7785 mi; a receber R$ 247,5 mil.
- **Relatório gerencial:** o mesmo total por contrato, cliente, projeto e competência.
- **DRE:** a receita da DRE (versão Atual) é igual ao faturado; a DRE por cliente soma a DRE por contrato.
- **Projeção:** EAC = Forecast e receita estimada = Forecast em cada projeto.

## 6. Resultado da empresa × margem de referência

A DRE da empresa toda (versão Atual, competências até o mês corrente) mostra um resultado acumulado **negativo**, de cerca de −R$ 576 mil. Não é erro de dado, e as três causas aparecem na DRE:

1. **Defasagem de faturamento.** As medições do mês corrente (cerca de R$ 295 mil) estão em análise, e os marcos de relatório final ficam no fim dos contratos. O custo realizado dos projetos (cerca de R$ 1,79 mi) chega a 54% do custo previsto, e o faturado (R$ 2,03 mi), a 47% da receita.
2. **Estrutura da empresa.** São custos que não estão no custo dos projetos:
   - sede (aluguel, sistemas, contabilidade);
   - folha não apropriada (diretoria, administrativo e horas internas);
   - DAS estimado em 6% do faturamento.
3. **Margem da matriz.** A margem de referência é de 23,8% ao longo de cerca de 2 anos de contratos. Depois da estrutura e dos impostos, ela deixa a empresa perto do equilíbrio no ciclo completo.

A margem dos projetos (R$ 1,03 mi) é a medida comercial da demonstração. O lucro da empresa é outra visão, mostrada separadamente.

## 7. Pendências

- **Orçamento por conta:** o Orçamento do app é por subgrupo do plano. O detalhe por conta está no realizado (despesas), não no orçamento.
- **Linha de receita após o aditivo:** a linha "Receitas do Projeto" do Orçamento mostra o total do cadastro. Por isso o cadastro do P5 mantém o valor original (R$ 1,88 mi) e o aditivo aparece no contrato e na Previsão.
- **Horas de terceiros:** não são apontadas. O custo dos terceiros é o serviço contratado (despesa); os prestadores PF têm a diária na alocação.

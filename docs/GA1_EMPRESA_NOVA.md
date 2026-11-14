# GA-1 · Empresa nova nasce pronta para consultoria ambiental

As "chaves de comportamento" (`src/lib/chaves.ts`, tela `/chaves`) nasceram para preservar números já publicados: cada regra corrigida ficava atrás de uma chave desligada. No Growth Ambiental isso fazia uma empresa nova, sem dado nenhum, nascer com as regras antigas.

A partir do GA-1, **empresa nova nasce com as regras corrigidas que valem para qualquer empresa**. As regras de incorporação imobiliária (unidades, parcelas de venda, permuta, INCC, liberações de financiamento) não aparecem para quem não tem esses dados.

**Empresas existentes não mudam:** quem decide ligar as chaves é o dono, pela tela `/chaves`.

## 1. Classificação (lista única em `src/lib/chaves.ts`)

**`CHAVES_EMPRESA_NOVA`** — nascem ligadas, com `alterada_por = "criação da empresa"`:

| Chave |
|---|
| `membro_padrao_restrito` |
| `contas_pagar_so_atual` |
| `restituicao_segue_despesa` |
| `rascunho_fora_dos_relatorios` |
| `dre_definicao_nova` |
| `fluxo_definicao_nova` |
| `dashboard_definicao_nova` |
| `resumo_definicao_nova` (decisão do dono de 14/11/2026, ver abaixo) |
| `despesa_categoria_do_plano` |
| `orcamento_categoria_do_plano` |
| `caixa_conciliacao_por_conta` |

**`CHAVES_INCORPORACAO`** — nascem desligadas e só aparecem em `/chaves` com dados de incorporação (ou se já estiverem ligadas): `incc_por_empresa`, `plano_definicao_nova`, `dre_receita_rateio`, `parcela_recebida_situacao`.

### O que a leitura do código mostrou (empresa sem `unit`, `permuta` e `reembolso`)

| Chave | Efeito de ligar sem dados de incorporação |
|---|---|
| `incc_por_empresa` | Nenhum. Só troca a série do INCC quando a empresa adotou uma série própria (`inccDaEmpresaAtivo`), o que empresa nova não tem. A tela de INCC não existe no Ambiental. |
| `plano_definicao_nova` | Nenhum. Só muda como o plano de pagamento das **unidades** vira recebível (`expandUnitReceivables`). |
| `parcela_recebida_situacao` | Nenhum. A parte das contas a receber é idêntica ligada ou desligada (`aReceberDaFaixa` × `aReceberDaFaixaComRecebimentos`). O resto só lê recebimentos ligados a unidades. |
| `dre_receita_rateio` | Números idênticos: sem unidades, a receita são as contas a receber pelo vencimento, como hoje. Ligada, a DRE ganha uma nota sobre "unidade vendida", que é só texto de incorporação. Fica em incorporação. |
| `resumo_definicao_nova` | **Muda fora de incorporação:** o Resumo ganha os blocos Exposição (a receber e a pagar) e Atenção (custo acima do orçado, recebíveis vencidos, despesas sem classificação, projeto sem Atual). Por isso **foi para as gerais** (decisão de 14/11/2026). Vendas, financiamento e permuta em estoque já só aparecem quando há esses dados. |

## 2. Onde as chaves são ligadas

- **`ligarChavesDeEmpresaNova`** (`src/lib/chaves-empresa-nova.ts`) é o lugar único:
  - o provisionamento (`provisionTenant`) chama a função na mesma transação da criação da empresa;
  - o seed de demonstração (`criarEmpresa`) chama a mesma função.
- **`instalarPlanoPadrao`** deixou de ligar chaves sozinho (antes ligava duas, numa lista própria).

## 3. Orçamento e Previsão não aprovados

Com `rascunho_fora_dos_relatorios` ligada, só versão **Aprovada** entra em relatório.

- **Seed:** aprova Orçamento e Previsão de todos os projetos e da sede, pelo fluxo da tela: Rascunho → Concluído → Aprovado.
- **Telas:**
  - **DRE, Fluxo de Caixa, Dashboard, Resumo e Previsão** mostram uma linha quando uma versão lançada fica de fora: "O Orçamento de N projeto(s) ainda não foi aprovado e não entra aqui. Aprovar em Planejamento →".
  - **Regra reaproveitada:** a do aviso da tela de edição e do selo no seletor (`entraNosRelatorios`, em `situacao-versao.ts`).
  - **Contagem:** está em `versoes-nao-aprovadas.ts`. Versão sem nenhum lançamento não conta.
- **Projeção ao término:**
  - sem Previsão aprovada, o "Custo para concluir" mostra **"sem Previsão aprovada"**, nunca R$ 0;
  - as estimativas só aparecem se o Orçamento revisado ainda prevê custo pela frente;
  - a Cris recebe o mesmo alerta.

## 4. INCC (§6): a tabela continua sendo gravada

A empresa nova não pode ficar sem `incc_rate`, porque a tabela serve de calendário de meses:

| Onde | Dependência |
|---|---|
| `/lancamento/export` (exportação do Orçamento/Previsão) | As colunas de mês vêm **só** da tabela INCC. Sem ela, o arquivo sai sem meses. |
| Fluxo de Caixa (`eixoDoFluxo`) | A base de meses da tela é a do INCC. |
| Lançamento de Orçamento/Previsão (`getReceitaByProject`) | Os meses partem do INCC, somados aos lançados. |
| DRE e DRE analítica | Com `dre_definicao_nova` desligada, o período usa os meses do INCC; ligada, o INCC ainda entra nas janelas de ano. |
| Planilha do projeto (modelo e exportação) e replicação a partir da Atual | Usam a série; a replicação só a usa com unidades. |

Por isso a gravação continua (provisionamento e `createProject`). O que mudou foram os **textos**: o cliente não vê mais "INCC" na criação da conta.

## 5. Textos alterados (antes → depois)

| Onde | Antes | Depois |
|---|---|---|
| `/plataforma` (nova conta) | "…o plano de contas padrão de consultoria ambiental e a tabela INCC padrão." | "…o plano de contas de consultoria ambiental, as modalidades de serviço, a biblioteca de fases e atividades e as regras padrão já ligadas (Caixa por conta, DRE, Fluxo e Dashboard corrigidos, só orçamento aprovado nos relatórios)." |
| `/plataforma` (sucesso) | "(projeto + 3 versões + plano de contas + INCC)" | "projeto, 3 versões, plano de contas ambiental, modalidades de serviço, biblioteca de fases e as regras padrão ligadas" |
| Nota da DRE (regime) | "receita da venda e contas a receber pelo vencimento das parcelas; liberações de financiamento e permutas (dados antigos) pela data de liquidação" | Sem dados de incorporação: "receita (faturas e contas a receber) pelo vencimento". Com dados: o texto anterior. |
| DRE analítica e Fluxo analítico (linha de receita) | "Receitas (faturas, contas a receber e, nos dados antigos, vendas e liberações)" | Sem dados de incorporação: "Receitas (faturas e contas a receber)". Também nos Relatórios Customizados. |
| `/chaves`, efeito do Fluxo | "…a permuta deixa de somar nas colunas de Orçamento e Previsão; …" | Mesma regra, com a permuta no fim: "(dados antigos: a permuta deixa de somar nas colunas de Orçamento e Previsão)" |
| `/chaves`, efeito do Dashboard | "…o VGV vem da Atual em toda coluna; …" | "(dados antigos: o valor de vendas vem da Atual em toda coluna)" |
| `/chaves`, efeito do Resumo | "os sinais S1, S2 e S3…; permuta e liberação…; unidades Permutadas…; e a tela ganha os blocos Vendas, Exposição e Atenção" | "a tela ganha os blocos Exposição … e Atenção … (dados antigos: o bloco Vendas e as regras novas de sinais, permutas, liberações e unidades)" |
| `/chaves`, cada chave | "Origem: Prompt AJ, Parte 1 (1.4) · última troca por …" | O campo `origem` não é mais exibido. Aparece "Ligada desde a criação da empresa." ou "Última troca por … em …". |
| `/chaves`, introdução | "Mudanças que alteram número… entram desligadas." | Explica que empresa nova já nasce com as regras gerais ligadas e diz quantas chaves de incorporação estão ocultas. |
| `package.json` | `growth-tools-construction` / "FP&A SaaS para incorporadoras imobiliárias — Growth Tools / TFG" | `growth-ambiental` / "Gestão financeira, FP&A e BI para consultorias ambientais — Growth Tools / TFG" |

## 6. Testes

- **`src/lib/chaves.test.ts`:**
  - toda chave está em exatamente uma lista;
  - as listas não se repetem.
- **`src/lib/tenant/provision-plano.test.ts`:**
  - a empresa nova tem exatamente `CHAVES_EMPRESA_NOVA` ligadas, com a marca "criação da empresa";
  - nenhuma chave de incorporação vem ligada.
- **`src/lib/actions/ga1-empresa-nova.test.ts`** (Postgres):
  - chaves da empresa nova;
  - Caixa por conta ligado;
  - **cada chave de incorporação ligada sem dados de incorporação mantém** DRE, Fluxo, Dashboard (`getStatusProjeto`), contas a receber, recebíveis de venda e faixa do Caixa;
  - visibilidade em `/chaves`: sem dados, com uma unidade, e chave ligada;
  - `origem` não renderizado;
  - aviso de Orçamento não aprovado, que some ao aprovar enquanto o orçamento passa a entrar;
  - projeção "sem Previsão aprovada";
  - rótulos sem permuta, liberação ou vendas.
- **`scripts/conferir-demo.ts`:**
  - a demonstração tem as mesmas chaves de uma empresa nova;
  - todas as versões de Orçamento e Previsão estão Aprovadas;
  - todas as conferências financeiras passam com as chaves ligadas.

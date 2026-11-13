# Auditoria de terminologia — Growth Ambiental

Este documento registra a varredura de termos de construção civil e
incorporação imobiliária no código e na interface, feita na adequação
funcional ([ADEQUACAO_FUNCIONAL_GROWTH_AMBIENTAL.md](./ADEQUACAO_FUNCIONAL_GROWTH_AMBIENTAL.md)).

**Regra:** nada foi trocado às cegas. Cada ocorrência foi lida no contexto e
classificada. Um mesmo termo pode ser legítimo no setor ambiental: por exemplo,
"monitoramento arqueológico de **obras**", "licenciamento ambiental de
**empreendimento**", "diagnóstico ambiental de **terreno**" e "**mão de obra**".

## 1. Classes

| Classe | Significado | Ação |
|---|---|---|
| **A** | Exclusivo de módulo removido (unidades, simulador, permuta, INCC, medição por grupo/CEF, liberações) | Removido junto com o módulo, ou texto reescrito apontando para a tela que assumiu |
| **B** | Termo do setor errado em texto visível ("obra" no sentido de projeto, "comprador", "Acerto Contábil", "Conta CEF", "Controle de Estoques") | Substituído pelo termo ambiental (projeto, cliente contratante, Acertos e Rateios, Conta do plano, Materiais e Equipamentos) |
| **C** | Uso legítimo no setor ambiental ou genérico | Preservado |
| **D** | Referência técnica interna (identificador, chave JSON, coluna, id de permissão, valor gravado, rota) | Preservado — renomear quebraria dados, contratos de API ou permissões gravadas |
| **E** | Ligado a dado antigo ou regra financeira/fiscal ainda ativa | Preservado e marcado como "dados antigos" na tela quando aparece; decisão registrada nas pendências |

## 2. Como reproduzir

- Contagem bruta por termo e área: `node scripts/varredura-terminologia.mjs`
  (com `--json` para comparar). Conta **toda** ocorrência, inclusive
  identificadores (classe D) e documentação histórica. Por isso o número não
  chega a zero.
- Regressão do texto visível: `src/lib/terminologia-ambiental.test.ts`. Ele
  extrai os literais com frase e o texto JSX de `src/app` e `src/components`,
  sem comentários, identificadores nem interpolações, e falha se aparecer termo
  fora da lista `PERMITIDAS`. Cada exceção traz a classe e o motivo. Exceção
  sem ocorrência também falha, para a lista não envelhecer. O extrator é
  heurístico: texto JSX entremeado de `{...}` pode escapar dele, e por isso a
  revisão manual por área complementa o teste.

## 3. Varredura inicial × final (ocorrências brutas, todas as classes)

Áreas: Interface = `src/app`; Componentes = `src/components`; Cris/IA =
`assistente-base`, `ai`, `cris*` e `agent`; Regras = o restante de `src/lib`;
Testes = `*.test.ts`; Docs = `docs/` e README.

| Termo | Interface | Componentes | Cris/IA | Regras | Testes | Docs |
|---|---|---|---|---|---|---|
| obra(s) | 327 → 181 | 321 → 108 | 295 → 91 | 920 → 576 | 841 → 735 | 1844 → 1881 |
| construção/construções | 0 → 0 | 29 → 16 | 29 → 25 | 114 → 109 | 58 → 72 | 125 → 140 |
| construtora(s) | 0 → 0 | 3 → 1 | 5 → 2 | 24 → 22 | 34 → 42 | 78 → 85 |
| construído | 0 → 0 | 4 → 2 | 3 → 0 | 17 → 16 | 4 → 7 | 23 → 27 |
| edificação | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 3 → 4 |
| empreitada | 0 → 0 | 0 → 0 | 1 → 0 | 3 → 2 | 0 → 0 | 9 → 10 |
| canteiro | 0 → 0 | 0 → 1 | 1 → 0 | 2 → 2 | 6 → 9 | 9 → 11 |
| terreno(s) | 0 → 0 | 13 → 4 | 10 → 0 | 31 → 15 | 11 → 15 | 56 → 63 |
| lote/loteamento | 2 → 2 | 17 → 17 | 10 → 7 | 43 → 37 | 24 → 24 | 144 → 146 |
| unidade imobiliária/habitacional | 0 → 0 | 0 → 0 | 1 → 2 | 1 → 6 | 1 → 2 | 0 → 1 |
| apartamento | 0 → 0 | 1 → 0 | 4 → 0 | 4 → 0 | 1 → 0 | 4 → 5 |
| empreendimento | 4 → 0 | 13 → 5 | 5 → 0 | 16 → 10 | 2 → 5 | 70 → 76 |
| incorporação/incorporadora | 0 → 10 | 1 → 7 | 0 → 1 | 5 → 22 | 2 → 17 | 13 → 24 |
| comprador | 10 → 1 | 8 → 5 | 17 → 3 | 47 → 33 | 14 → 17 | 62 → 73 |
| INCC | 60 → 34 | 53 → 4 | 14 → 2 | 255 → 182 | 144 → 109 | 341 → 357 |
| CUB | 0 → 1 | 6 → 0 | 0 → 0 | 20 → 19 | 9 → 10 | 9 → 11 |
| BDI | 1 → 1 | 8 → 0 | 1 → 0 | 25 → 23 | 6 → 7 | 24 → 27 |
| VGV | 32 → 25 | 3 → 1 | 17 → 1 | 91 → 65 | 37 → 44 | 82 → 93 |
| SAC/PRICE/SBPE | 3 → 0 | 11 → 0 | 6 → 2 | 26 → 12 | 27 → 16 | 81 → 87 |
| FGTS | 5 → 4 | 21 → 2 | 33 → 5 | 101 → 66 | 49 → 45 | 57 → 61 |
| subsídio | 3 → 3 | 20 → 0 | 28 → 1 | 82 → 48 | 45 → 41 | 43 → 44 |
| permuta | 63 → 27 | 64 → 17 | 55 → 8 | 369 → 241 | 172 → 139 | 546 → 565 |
| repasse | 0 → 0 | 0 → 0 | 1 → 1 | 76 → 76 | 26 → 26 | 44 → 45 |
| financiamento | 16 → 19 | 60 → 15 | 22 → 3 | 153 → 110 | 76 → 73 | 145 → 154 |
| liberação de obra | 16 → 2 | 8 → 0 | 7 → 3 | 25 → 12 | 7 → 5 | 141 → 143 |
| CEF/Caixa Econômica | 11 → 8 | 34 → 13 | 14 → 2 | 92 → 57 | 85 → 51 | 132 → 143 |
| habite-se | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 1 → 3 | 1 → 2 |

Leitura da tabela:

- **Docs:** os documentos `V2-*`, `SPEC.md` e afins são **histórico** do
  produto anterior e não foram reescritos (veja a seção 6). A contagem sobe
  um pouco porque os dois documentos novos citam os termos ao descrever o que
  saiu.
- O que sobra em Interface, Componentes e Regras é, na maior parte, classe
  **D**. Exemplos: a variável `obra`, a chave `porObra`, o campo `vgv`, os
  enums `"obra"` da Cris e a coluna `conta_cef`. O restante é classe **E**,
  listada abaixo.
- **"incorporação" sobe de propósito:** é o marcador "dados antigos de
  incorporação" que identifica o bloco legado na tela e nos comentários.
- **Testes:** alguns sobem porque os testes novos citam os termos proibidos
  para provar que eles não aparecem.

## 4. O que foi substituído (classes A e B)

Visão por área. O detalhe está nos commits da branch.

- **Menu e títulos:** Materiais e Equipamentos; Equipes e Presença de Campo;
  Acertos e Rateios; Clientes (Contratantes); Medições (do contrato);
  Engenheiro / técnico de campo.
- **Telas (`src/app`, 18 arquivos):** "obra" → "projeto" em avisos, filtros,
  colunas e estados vazios (Resumo, Chaves, Fluxo, DRE, Caixa, Despesas,
  Equipes, Acerto, Notas, Relatórios, Restituições). Saem as menções a
  Projeção, Medição, Unidades e Permuta como telas atuais. O texto do console
  da plataforma passa a citar o plano de contas ambiental.
- **Componentes (36 arquivos):** "Projeto" no lugar de "Obra" em
  filtros, colunas e formulários. Também mudam "sem cliente contratante",
  "técnico de campo", "Indicadores do projeto" e os placeholders do setor
  (Consultoria Ambiental, Monitoramento Arqueológico).
- **Regras e mensagens (`src/lib`, 34 arquivos):** mensagens de rateio,
  caixa, equipes, estoque, faturas, notas de serviço, chaves, relatórios e
  chat de métricas. "Obra (grupos CEF)" vira "Custos diretos dos serviços".
  A regex de erro repetido da NFS-e foi ajustada junto.
- **Cris e IA (32 arquivos):**
  - A base de conhecimento foi reescrita e tem a seção "Telas que saíram".
  - Prompts de despesa, estoque, folha de ponto, projeto e relatório.
  - "Rateio entre projetos" e "Acertos e Rateios".
  - O cliente contratante com CNPJ substitui o comprador.
- **Rótulos de dado:**
  - "Conta CEF" vira "Conta do plano".
  - A conta corrente "Construtora" aparece como "Empresa (conta própria)".
  - "Empreendimento próprio" vira "Projeto próprio (sem cliente)".
  - "Projetos — empreendimentos imobiliários" vira "Projetos".

## 4.1 Checagem no navegador

Foi feita no build de produção, com uma empresa de diagnóstico provisionada
no banco local isolado e removida depois. Telas verificadas: Projetos,
Clientes (lista e nova ficha), Dashboard, Resumo (consolidado e por
projeto), Contas a Receber, Materiais e Equipamentos, Equipes e Presença de
Campo, Medições, Acertos e Rateios, e os redirecionamentos de `/unidades` e
`/simulador`.

A checagem achou resíduos que o teste automático não pega, porque
"unidade" e "funding" são genéricos demais para entrar na lista de termos
proibidos. Todos foram corrigidos:

- o painel "Indicadores de negócio" do Resumo (VGV/m²), que passou a usar
  indicadores de serviço;
- o assistente do Resumo ("não tem unidade cadastrada");
- o assistente de Contas a Receber ("Sem unidade ou cliente"), que também
  marcava fatura de serviço sem unidade;
- a dica de Projetos, que contava "funding" como inconsistência;
- o texto do "A pagar" no Dashboard.

## 5. Ocorrências preservadas

### C — uso legítimo

- "mão de obra" (trabalho): `acerto-manager.tsx`, `fornecedor-form.tsx`,
  `fornecedores-table.tsx`, `actions/acerto.ts` ("Rateio de mão de obra"),
  `actions/stakeholders.ts`, `equipe-regras.ts`, `nota-servico-analise.ts`,
  `conceitos-despesas-caixa.ts`.
- `plano-regras.ts`: "Integração de segurança na obra", "Monitoramento das
  frentes de obra" (obra do cliente, no monitoramento arqueológico) e "Análise
  do empreendimento" (licenciamento).
- "almoxarifado" e "estoque mínimo" (conceito de saldo); "Unidade" como
  unidade de medida (estoque, itens de contrato); "Unidades / escritórios" e
  "Nova unidade / escritório" (unidade de negócio).
- "Tela em construção" (`coming-soon.tsx`); "CNO/CEI" e "ART/RRT" (registros
  oficiais, na descrição da Cris); FGTS como encargo trabalhista (Folha,
  Funcionários, base da Cris).
- `conversao-plano.tsx`: "contas de obra" descreve o plano antigo que está
  sendo convertido.

### D — referência interna (não renomeada)

- Variáveis, props e chaves: `obra`, `obras`, `porObra`, `obraId`,
  `semObra`, `consumoPorObra`, `ratearEntreObras`, `obrasSemOrcamento`,
  `obrasNaoEncontradas` e `vgv` / `vgvAusente` (Dashboard).
- Enums da Cris (`"obra"`, `"obra_categoria"`, `"obra_mes"`, `"obra_conta"`)
  e o campo `obras`.
- Colunas e tipos:
  - Coluna `conta_cef`, campo `contaCef` e `kind: "cef"`.
  - Campos de projeto: `valorConstrucao`, `custoConstrucao`, `metragem`,
    `municipioObra`, `codigoObra`.
  - O enum de conta corrente `"Construtora"`.
- Valores gravados:
  - Papéis "Construtora", "Incorporador", "Comprador de Unidade" etc. (válidos, não oferecidos).
  - Origens de estoque "Permuta", "Consumo na obra", "Transferência entre obras".
  - Tipos de receita "Sinal" e "Parcela mensal".
  - Documento de equipe "Foto da equipe no canteiro".
- Rotas e parâmetros:
  - `f_obra`, `proj`, `/estoque`, `/equipes`.
  - `basePath = "/projecao"` em `projecao-controls.tsx`, que é usado pelo Fluxo de Caixa.
  - Campo `unidade` da API do agente (contrato da API).
- Ids de permissão `estoque`, `equipes`, `contratosmedicao`; ações de
  auditoria `estoque.*`; nome de arquivo `receitas-obra-pessoas.ts`; módulo
  `incc-regras.ts`.

### E — dado antigo ou regra financeira/fiscal ativa

- **DRE e Fluxo** (`dre.ts`, `dre-analitica.ts`, `fluxo-caixa.ts`,
  `fluxo-analitico.ts`): composição da receita com unidades vendidas,
  liberações de financiamento e permutas. Na tela aparecem como "dados
  antigos".
- **Resumo:** os blocos Vendas, VGV, Financiamento e Permuta só aparecem
  quando a versão tem esses dados, marcados como antigos.
- **Chaves de comportamento** (`chaves.ts`, `/chaves`): efeitos históricos
  sobre VGV, liberações, parcela do comprador, INCC, Projeção e Simulador.
- **INCC:** provisionamento (`provision.ts`), replicação de versão
  (`budget-planning-screen.tsx`, `budget-forecast-compare.tsx`) e o índice
  INCC já gravado em contrato.
- **Conciliação de parcela de venda** (`recebimento-parcela.ts`,
  `conciliacao-review.tsx`, `conciliacao-cris.ts`): campo `comprador`, só com
  dados antigos.
- **Ajudas fiscais:** construção civil (LC 116 itens 7.02/7.05, CNAE
  4120-4/00) em `empresa-regras.ts`, `calc/emitente-fiscal.ts` e
  `empresa-analise.ts`; comentário sobre ISS em `fiscal/nfse-payload.ts`.
  Ficam até a contabilidade validar.
- **Indicadores de negócio:** "área construída" em
  `indicadores-negocio.ts` (custo por m²), para quem tem o dado antigo.
- `versao-importacao.ts`: rótulos das categorias antigas da planilha.

## 6. Documentação histórica

Os documentos em `docs/` com prefixo `V2-`, além de `SPEC.md`, `TELA-*.md`,
`AR/AT/AU-MEDICAO.md`, `BDI-PROVISIONAMENTO.md` e afins, descrevem o produto
anterior (construção e incorporação). Eles **não foram reescritos**: são o
registro das decisões que explicam o código que ficou (regras, chaves,
migrações). Leia-os como histórico. O comportamento atual está em
`ADEQUACAO_FUNCIONAL_GROWTH_AMBIENTAL.md`, `MODULO_CONTRATOS_ADITIVOS.md`,
`MODULO_PLANEJAMENTO_PROJETOS.md` e `PLANO_CONTAS_AMBIENTAL.md`.

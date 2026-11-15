# GA-9 · Fase 2 — calendário de meses sem INCC

Até aqui a tabela `incc_rate` servia de **calendário**: era dela que várias telas tiravam a lista de meses. Nesta fase, essas telas passam a usar uma fonte única, `src/lib/calendario-projeto.ts`. As taxas do INCC não são usadas aqui; elas saem do código na Fase 3.

## A fonte escolhida e por quê

O GA-9 sugeria duas fontes: do início ao fim do projeto, ou os 48 meses do parâmetro da versão. O código não tem um parâmetro de 48 meses por versão. Os 48 meses vêm só da tabela INCC: todo projeto nasce com as mesmas 48 linhas (05/2025 → 04/2029), gravadas pelo provisionamento e por `createProject`. A medição da Fase 1 na produção não encontrou nenhuma série editada e nenhuma série da empresa.

Então o calendário que o app **já usa** em todo projeto é esse, e a fonte única fica:

> **calendário do projeto = os 48 meses padrão (05/2025 → 04/2029) ∪ início → fim do projeto**

- **A janela do projeto** (`janelaDoProjeto`, a mesma da DRE) só acrescenta meses quando o projeto começa antes de 05/2025 ou termina depois de 04/2029.
  - Para todos os projetos de hoje, o calendário é **idêntico** ao da tabela INCC.
  - Um projeto que passe de 2029 deixa de depender de alguém estender a tabela.
- **Vários projetos** (consolidado, empresa toda): a união dos calendários.
- **Sem projeto:** nenhum mês, como antes (sem projeto não havia linha INCC).
- **Meses com lançamento:** cada tela continua juntando os meses que têm dados, como antes.

**Por que não só "início → fim":** mudaria a lista de meses de todas as telas. Por exemplo, sumiria 2025 do seletor de ano do Fluxo e as colunas vazias da exportação. A foto da Fase 0 exige as mesmas listas. Encurtar o calendário para a janela do projeto pode ser uma decisão futura, com foto nova.

## Pontos trocados

| Onde | Antes | Agora |
|---|---|---|
| Exportação do Orçamento/Previsão (`/lancamento/export`) | colunas = linhas INCC do projeto; lançamento em mês fora delas **sumia do arquivo** | colunas = calendário do projeto ∪ meses lançados |
| Fluxo de Caixa (`fluxocaixa/page.tsx`, eixo) | INCC da obra; no consolidado, a união | calendário da obra; no consolidado, a união |
| Prévia da chave do Fluxo (`fluxo-caixa.ts`) | INCC da obra | calendário da obra |
| DRE e DRE analítica (`axisIncc`: período com a chave desligada e janelas de ano) | INCC dos projetos | calendário dos projetos |
| Lançamento de Orçamento/Previsão (`getReceitaByProject`, `getDespesaLinhas`) | todas as linhas INCC da empresa | calendário de todos os projetos da empresa |
| Planilha do projeto: modelo e exportação (aba Parâmetros) | meses do INCC | meses do calendário; o formato antigo (versão com unidades, liberações ou permutas) ainda exporta a série INCC com as taxas até a Fase 3 |

### O que continua lendo `incc_rate`, e por quê

Tudo o que segue usa as **taxas**, não os meses, e sai na Fase 3:

- correção das unidades (`calcProjectionBySource` em `queries.ts` e na replicação da Atual, `actions/budget.ts`);
- importação da planilha no formato antigo (`version-io.ts`);
- a série da empresa (`incc_por_empresa`);
- a gravação no provisionamento e em `createProject`.

O catálogo do backup lista a tabela enquanto ela existir.

## Testes

- **`src/lib/calendario-projeto.test.ts`:**
  - os 48 meses padrão são exatamente os da `DEFAULT_INCC`;
  - projeto dentro da janela tem o mesmo calendário;
  - projeto além de 2029 ganha os próprios meses;
  - vários projetos dão a união; nenhum projeto, nenhum mês.
- **`src/lib/actions/ga9-calendario.test.ts`** (Postgres), com uma empresa nova provisionada:
  - lê a exportação do Orçamento, o modelo da planilha, a grade de lançamento (receita e despesa) e o Fluxo **com** as 48 linhas INCC;
  - apaga todas as linhas e lê de novo: o resultado é **igual**, com as colunas de mês na exportação;
  - um lançamento em 06/2030 aparece no arquivo; antes, sumia.
- **Foto da Fase 0:** `bash scripts/ga9-foto.sh comparar` dá **nenhuma diferença**: 977 telas e 12 planilhas.
- **Navegador:** empresa nova sem nenhuma linha em `incc_rate` abre todas as telas e exporta o Orçamento com as colunas de mês (ver o PR).

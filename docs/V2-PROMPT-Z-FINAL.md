# Prompt Z — Módulo Pessoas · Relatório final

PRs: #191 (Fase 1), #192 (Z-1), #193 (Z-2), #194 (Z-3), Z-4 (assistentes).
Docs: `V2-PROMPT-Z-FASE1.md`, `-PR1` a `-PR4`; SQL em
`docs/sql/v2-prompt-z-diagnostico.sql`. Em português simples, item a item.

## 1. Decisões BZ-1 a BZ-4
- **BZ-1** — a Equipe **registra** a diária e **propõe** o lançamento; a
  despesa nasce **só** em `/despesas` (link pré-preenchido com o autônomo
  como fornecedor, valor, competência, histórico; ao gravar, as diárias
  recebem o `despesa_id` como rastro). Nenhuma conta a pagar é gerada pela
  equipe. CLT: não se aplica (folha).
- **BZ-2** — **registro**, com salário e jornada guardados (ficha do art.
  41), atrás de permissão própria de campo (`funcionariosdados`), fora do log
  em claro e fora do assistente. Sem folha: nada é calculado.
- **BZ-3** — lista fechada de funções por tenant (`funcao_equipe`), as cinco
  citadas nascem na primeira leitura; editável na tela de Equipes
  (**pergunta**: prefere em Configurações? É só mover o bloco).
- **BZ-4** — `time_entry` fica; 0 registros na base local; SQL por tenant
  para produção.

## 2. Registros em `time_entry`, por tenant
Base local: Cliente Piloto (incorporadora) **0**. Produção: consulta no SQL (BZ-4).
**Nenhum apagado, convertido ou migrado.**

## 3. Despesas geradas pela apuração antiga
Base local: **0** (por `time_entry.despesa_id` e por `obs` "Mão de obra
(ponto)…"; 0 auditorias `ponto.gerar_conta`). Consulta no SQL para produção.
Nenhuma é tocada.

## 4. Estrutura criada (migração 0061, com `down/`)
`funcionario` (identificação, documentos com número, endereço, contrato com
salário/jornada, desligamento, banco), `funcionario_dependente`,
`funcao_equipe`, `equipe_projeto` (obra; `stakeholder_id` OU
`funcionario_id`; função; `valor_diaria`; entrada/saída; situação),
`equipe_dia` (obra + data, único), `diaria` (dia × membro, único;
quantidade; **valor gravado**; `despesa_id`), `folha_competencia`
(competência única; `despesa_id`), `aso_acesso`; em `document`:
`funcionario_id`, `equipe_dia_id`, `folha_id`, `validade`. Relações com
`set null` nos documentos e `restrict` nas alocações (membro com histórico
não some).

## 5. Origem única da alocação, no servidor
`recusaDaAlocacao` (regra pura) recusa os dois ou nenhum; a action confirma
que o cadastro existe no tenant, é alocável (papel) e está ativo/não
desligado; e o banco tem o **CHECK `equipe_projeto_origem_unica`** (teste
insere direto e é rejeitado).

## 6. Lançamento em lote de diárias
`registrarDiariasDoDia({ projectId, data, itens })`: valida cada membro
(alocação ativa; quantidade ½/1/1½/2; autônomo com valor vigente), abre uma
transação, cria ou reaproveita o `equipe_dia` da obra na data e grava uma
diária por membro com o **valor da alocação no momento** (CLT e sócio:
nulo); registrar o mesmo dia de novo **atualiza** (não duplica). Sem
geolocalização. O assistente propõe a lista; a pessoa confirma.

## 7. Campos sensíveis separados na consulta
- Lista: `getFuncionarios` **não seleciona** endereço, salário, jornada nem
  banco; devolve o CPF **mascarado**.
- Ficha: `getFuncionario(…, podeVerSensiveis)` passa por `semSensiveis`
  (campos viram `null`) e não carrega dependentes sem a permissão.
- Gravação: `soCamposPermitidos` descarta campos sensíveis de quem não tem
  `funcionariosdados:editar` (vazio não apaga); dependentes exigem a mesma.
- Documentos: `getDocumentsByFuncionario(…, comAso)` filtra o ASO no servidor.
- Assistentes: a análise roda no servidor e devolve nomes/datas/tipos.

## 7a. Permissão do ASO e registro de acesso
Tela de permissão `funcionariosaso` (sensível, nasce só com owner/admin),
separada da de ver o funcionário. Anexar/remover exigem `editar`; listar e
abrir exigem `ver`. **Sem a permissão o servidor não devolve nem a
existência.** O ASO nunca recebe URL direta: `abrirAso` grava em
`aso_acesso` (funcionário, documento, usuário, quando) e audita
`funcionario.aso.acesso`; os logs do ASO não levam nome de arquivo nem chave.

## 7b. Prazo de guarda por tipo
Registrado em `TIPOS_DOC_FUNCIONARIO.guarda` (18 tipos), com o prazo usual
(ex.: ASO 20 anos após o desligamento — NR-7; CTPS/contrato permanente;
declaração de IR 5 anos) e a marca **"confirmar com o contador"** em todos.
**Nada é apagado automaticamente** (não há rotina de expurgo).

## 8. Os dois assistentes
Funcionários: somente leitura (seis análises; nenhuma action importada).
Equipes: propõe e para (diárias de hoje; leitura da folha de ponto por IA;
quatro análises); única gravação = `registrarDiariasDoDia` por clique.
**Nenhum recebe** CPF, endereço, salário, banco, dependentes ou dados de
folha; **nenhum lê documento de funcionário** — a IA recebe só a "Folha de
ponto assinada" do dia.

## 9. Geolocalização
Nenhuma tela do módulo coleta posição; `/ponto` e `registrarPonto` foram
removidos. As colunas `latitude/longitude/ponto_raio_metros` de `project`
ficam (dado existente), sem uso.

## 10. Nenhum cadastro alterado ou duplicado
`stakeholder` 3 / `despesa` 75 / `time_entry` 0 antes e depois de cada PR;
teste 19 compara a foto dos stakeholders. A equipe referencia o cadastro
(teste 5: a alocação não contém nome nem documento). Nenhum stakeholder foi
convertido em funcionário.

## 11. Migrações
**0061** `modulo_pessoas` (+ `down/`). Aditiva, `IF NOT EXISTS`. Produção:
aplicar após as 0046–0060.

## 12. Limitações
- Folha de ponto por IA e leitura de documentos dependem de
  `ANTHROPIC_API_KEY` e R2; sem eles os painéis dizem o que falta.
- "Mão de Obra CLT" como papel de `stakeholder` (cadastro antigo) é tratado
  como autônomo na equipe até a pessoa migrar para Funcionários.
- O casamento de nomes da folha de ponto é heurístico; o que não casa vira
  aviso, nunca registro.
- Funções editáveis na tela de Equipes (BZ-3): confirmar se devem ir para
  Configurações.
- Permissões de membro restrito para as telas novas nascem negadas (padrão
  das telas novas); conceder na matriz.
- Testes intermitentes alheios observados e **corrigidos nesta PR**:
  `permuta-docs` (lia `logs[0]` sem ORDER BY) e `cartao-compra` (Prompt U:
  comparava a contagem global de `cash_entry`/`pagamento`, que outros testes
  em paralelo alteravam; passou a contar só o próprio tenant). Três rodadas
  completas consecutivas verdes depois do ajuste.

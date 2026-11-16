# Prompt AM · PR 1 — consumo, limite, permissão e estado da IA

Prompt AM (40 de 42), primeiro PR: **Partes 5, 6 e 7**. A Parte 5 "vai antes
de a tela abrir para todos". O chat do produto (Partes 1 a 4) vem no PR 2.

## Inventário (o que existia)

- `/diagnosticoia`: título "Diagnóstico de IA", um botão "Testar agora" e o
  texto de ajuda. O resultado do teste **não era guardado**: recarregar a
  página apagava.
- `testAiConnection` testava o **papel** (`owner`/`admin`), não a matriz.
- A página devolvia **branco** sem permissão.
- **Nenhuma medição de consumo:** o `usage` de cada resposta da API era
  descartado.
- **Nenhum limite.** O único freio era o 429 da API.
- **Chamadas ao modelo hoje (11):** leitura de despesa, extrato (dois
  caminhos), fornecedor, documento do projeto, venda por texto, permuta por
  texto, nota de estoque, folha de ponto, laudo de medição, chat com dados
  (Prompt E, Etapa 2) e o teste de conexão.

## O que muda

- **5.1 · Consumo registrado.** Migração **0066** (aditiva, com `down/`):
  tabela `ia_uso` com operação, modelo que respondeu, se foi alternativo,
  tokens (entrada, saída, criação e leitura de cache), falha, empresa, pessoa e
  instante.
  - **Não há coluna para conteúdo:** pergunta, documento e resposta nunca são
    guardados (decisão de 01/10).
  - A action marca a chamada (`comUsoDeIa`) e o cliente de IA grava ao fim.
  - **As extrações não mudaram de assinatura nem de comportamento.** Cada
    action ganhou só a marca.
  - Falha ao gravar o consumo nunca derruba a leitura.
- **5.2 · Limite** só nas **conversas** (chat com dados e o Assistente do PR
  2): **30 perguntas por hora por pessoa** e **300 por hora por empresa**.
  - Passou do limite, o chat com dados usa a leitura local (sem custo).
  - **As leituras de documento só são medidas, sem limite**, para não travar
    lançamento em produção.
- **5.4 · Cadeia de fallback.** O registro guarda o modelo que respondeu.
  A tela avisa quando mais da metade das chamadas (no mínimo 5) caiu para um
  modelo alternativo.
- **6.1 · Permissão do teste pela matriz:** `diagnosticoia:editar`, o bloco de
  configuração. Membro com a tela concedida passa a poder testar. Papel admin
  com a célula negada não testa.
- **6.2:** sem permissão, `AccessDenied` em vez de branco.
- **7.3 · Estado na tela:** chave presente, modelo configurado (com o aviso de
  `ANTHROPIC_MODEL`), último teste (quando, quem, resultado) e o consumo dos
  últimos 30 dias por operação.
- **7.4:** o texto de ajuda foi preservado, sem reescrever.

## Decisões adotadas e perguntas

- **BAM-2 (até onde o assistente explica):** adotada a **recomendação 2**:
  operação e regra do produto, sem orientação fiscal ou contábil. Entra no PR 2.
- **BAM-3 (histórico):** adotada a **recomendação 1**, efêmero. Nenhuma
  conversa é gravada; o consumo agregado basta para medir.
- **BAM-1 (quem mantém a base):** **pergunta ao dono.** Proposta: cada PR que
  mudar comportamento visível atualiza o arquivo da base no mesmo PR.
- **Limites (30/h por pessoa, 300/h por empresa):** **pergunta ao dono.** Os
  números estão em `src/lib/ia-uso-regras.ts`. Se quiser, viram parâmetro na
  tela Empresa, como os alertas do Resumo.
- **6.3 · Membro e o Assistente:** **não mudei o padrão do membro**, porque
  isso muda acesso. A tela já é concedível a qualquer papel na Gestão de
  Acessos. **Pergunta:** o padrão do membro deve incluir o Assistente?
- **5.5 · Chave por empresa:** decisão pendente, registrada. Todas as empresas
  consomem da mesma conta; agora a tela mostra quanto cada uma consome.
- **6.4:** quem lança despesa gasta crédito de IA sem passar por
  `diagnosticoia`. Agora isso aparece no consumo ("Leitura de despesa").

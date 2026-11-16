# Prompt Z — PR 1: extinção do Ponto, módulo Pessoas e Funcionários

Migração **0061** (aditiva, com `down/`). `time_entry` e as coordenadas de
obra **ficam**; nenhum `stakeholder`, despesa ou lançamento alterado.

## Parte 1 — o Ponto saiu
- Rota `/ponto`, `ponto-manager.tsx` e `actions/ponto.ts` removidos (eram a
  geolocalização e a conta a pagar sem fornecedor). Item "Ponto" sai do menu;
  chave `ponto` sai da matriz (permissões antigas com a chave sobram no JSON
  sem efeito). Teste do menu: 38 telas antigas (40 − `/fechamento` − `/ponto`).
- **`time_entry` permanece** (0 linhas na base local; SQL para produção).
  Nenhum registro apagado, convertido ou migrado (1.3). Nenhuma tela do
  módulo coleta geolocalização (7.4).

## Módulo Pessoas
- Módulo novo no menu, depois de Obra, com **Funcionários** (Equipes entra na
  PR 3). Matriz de permissões: módulo "Pessoas" com `funcionarios`,
  `funcionariosdados` (**sensível** — endereço, salário, jornada, banco,
  dependentes), `funcionariosaso` (**sensível** — ASO, usada na PR 2) e
  `equipes`. As sensíveis nascem só com owner/admin (`TELAS_SENSIVEIS`).

## Parte 2 — Funcionários (migração 0061)
- Tabelas `funcionario` (ficha do art. 41: identificação, documentos com
  número, endereço, contrato com salário e jornada, desligamento, banco) e
  `funcionario_dependente`. Também já criadas para as próximas PRs:
  `funcao_equipe`, `equipe_projeto` (**CHECK de origem única**:
  `stakeholder_id` OU `funcionario_id`), `equipe_dia`, `diaria`,
  `folha_competencia`, `aso_acesso`, e em `document`: `funcionario_id`,
  `equipe_dia_id`, `folha_id`, `validade`.
- **Separação do dado sensível no servidor** (7.2 / 14): a lista
  (`getFuncionarios`) nunca seleciona endereço, salário, jornada ou banco e
  devolve o **CPF mascarado** (7.1 / 13); a ficha (`getFuncionario`) recebe
  `podeVerSensiveis` e, sem a permissão, devolve esses campos **nulos** e
  dependentes vazios. Quem não tem `funcionariosdados:editar` não grava campo
  sensível (vazio não apaga) nem dependente.
- **CPF** validado pelo `cpfValido` do Prompt W (2.5); duplicidade **avisa**
  (entre funcionários e contra fornecedores PF), não bloqueia.
- **Desligamento em vez de exclusão** (2.4): data e motivo; permanece na
  lista com a situação; exclusão só sem alocação em equipe, digitando o nome,
  com auditoria. Reativar existe.
- **Auditoria sem valor pessoal** (7.3 / 15): `funcionario.update` grava
  `changes` com CPF, documentos, nascimento, nome da mãe, endereço, salário,
  jornada e banco como `protegido`; `CAMPOS_PROTEGIDOS` do log ganha os campos
  do trabalhador (exibição de registros antigos).
- Telas: `/funcionarios` (lista com CPF mascarado, filtro de desligados,
  formulário de cadastro) e `/funcionarios/[id]` (ficha, edição, dependentes,
  desligar/reativar, excluir com nome). Os blocos sensíveis **não são
  renderizados** sem a permissão — e o servidor não os envia.
- O formulário diz: autônomo, engenheiro e mestre de obra que emitem nota
  ficam em Fornecedores; aqui entra CLT (3 / 4). Registro, não folha (BZ-2).

## Testes
- `funcionario-regras.test.ts` (5): validação, duplicidade com aviso,
  omissão/não gravação de sensíveis, log protegido, máscara/situação/exclusão.
- `actions/funcionarios.test.ts` (6, banco): CLT nasce em Funcionários e
  fornecedores ficam intactos (3, 4); lista mascarada e ficha sem sensíveis
  sem a permissão (13, 14); sem permissão não grava sensível nem dependente;
  log sem CPF/salário (15); desligado permanece e exclusão com nome/alocação
  (8, 2.4); **CHECK** de origem única no banco (6).
- `audit-mask.test` ajustado (lista de 8 → 20 campos, com os do trabalhador);
  `nav-menu.test` (38 + `/funcionarios`); `paginas-permissao.test` cobre as
  duas páginas novas.
- Suíte completa verde; `tsc`, `eslint`, `next build`.

## Teste de navegador (local, admin)
Menu "Pessoas › Funcionários"; `/ponto` → 404; cadastro com CPF, salário e
endereço → lista mostra `•••.982.247-••`; ficha mostra tudo (owner); editar
setor mantém o salário e o log registra só `setor`; desligar grava a data.
Seeds apagados (1 funcionário, 3 auditorias). `stakeholder` 3, `despesa` 75,
`time_entry` 0 antes e depois.

## Correção feita no caminho
A ficha abria em branco: a página (servidor) importava o objeto de valores
de um módulo `"use client"`, que chega como referência vazia. Os valores e
helpers do formulário foram para `src/lib/funcionario-form.ts` (puro).

## Próximas
- **Z-2**: documentos do funcionário (tipos, validade, checklist, ASO com
  permissão própria e registro de acesso) e folha por competência.
- **Z-3**: Equipes, funções, diárias em lote, documentos por dia, proposta
  de lançamento (BZ-1). **Z-4**: assistentes e relatório final.

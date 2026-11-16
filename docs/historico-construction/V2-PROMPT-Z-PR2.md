# Prompt Z — PR 2: documentos do funcionário, ASO e folha por competência

Sem migração nova (colunas e tabelas vieram na 0061). Nenhuma despesa,
fornecedor ou lançamento alterado.

## 2.2-A — documentos do funcionário
- **18 tipos** (2.2-A.2) em `src/lib/funcionario-docs-regras.ts`, cada um com:
  exigido na admissão, se é ASO, se tem validade, e o **prazo de guarda**
  (7.3-C) com o texto "confirmar com o contador" — nada é apagado
  automaticamente.
- **Checklist de admissão** (2.2-A.5 / 16d): a ficha mostra o que falta, com o
  ASO admissional destacado ("precisa existir ANTES do início"). Conferência,
  não bloqueio.
- **Validade** (2.2-A.7 / 16e): campo por documento (ASO, CNH); selo "vence em
  n dias" a 30 dias e "vencido".
- **Versão por tipo** e remover desfaz só o vínculo (2.2-A.6); várias fotos de
  uma vez com miniatura e compressão no navegador (2.2-A.4, molde do Prompt Y).
- **ASO — dado de saúde** (2.2-A.3 / 7.3-A / 16b / 16c):
  - anexar e remover exigem `funcionariosaso:editar`; listar exige `:ver`;
  - **sem a permissão, o servidor não devolve nem a existência** do ASO
    (`getDocumentsByFuncionario(…, comAso=false)` filtra no servidor; a
    remoção responde "não encontrado");
  - o ASO **nunca recebe URL direta**: abre por `abrirAso`, que grava quem e
    quando em `aso_acesso` e audita `funcionario.aso.acesso`;
  - o log de anexo/remoção do ASO não leva nome de arquivo nem chave.
- Nenhum documento daqui é lido por IA (6.3 / 16a): a action nem usa o
  leitor; os assistentes (PR 4) só verão **tipos e contagens**.

## 2.2-B — folha por competência
- Tela `/funcionarios/folha` (link no cabeçalho de Funcionários), atrás de
  `funcionarios:ver` **e** `funcionariosdados:ver` (dado de folha é sensível).
- Um registro por competência (`folha_competencia`, única por mês), com os
  **7 tipos** (2.2-B.3). **Holerite individual** é o único que se vincula ao
  funcionário (2.2-B.2 / 16f).
- **O pagamento é despesa e se lança em Despesas** (2.2-B.4): a tela diz
  isso; o registro pode ser **vinculado à despesa** que pagou a folha
  (`despesa_id`), para o comprovante não ser anexado duas vezes (16g). A
  despesa não é alterada.
- **Conferência** (2.2-B.5): folha arquivada sem despesa vinculada; despesa
  que parece folha/encargo (texto: folha, salário, FGTS, INSS, IRRF,
  rescisão, 13º, férias) sem registro na competência; folha sem documento.

## Testes
- `funcionario-docs-regras.test.ts` (4): tipos e guarda, checklist, validade,
  competência e conferência.
- `actions/funcionario-docs.test.ts` (5, banco, R2 substituído): várias
  imagens e versão por tipo com validade (12, 13b); ASO com permissão própria,
  invisível sem ela, acesso registrado e log sem nome de arquivo (16b, 16c,
  7.3-A); remover sem apagar (13d); folha única por competência, holerite por
  funcionário, vínculo com despesa sem tocá-la (16f, 16g); folha exige a
  permissão de dados (14).
- Suíte: 148 arquivos, 1430 testes; `tsc`, `eslint`, `next build`.

## Teste de navegador (local, admin)
Ficha nova mostra o checklist com os 8 obrigatórios faltando e o aviso do
ASO; sem R2 local, o anexo avisa. Folha: registrar 09/2026 → aparece com "0
documentos" e "sem despesa vinculada"; a conferência lista a competência nos
dois itens. Seeds apagados (1 funcionário, 1 folha, 4 auditorias);
`despesa` 75, `stakeholder` 3, `document` 0 antes e depois.

## Próxima
- **Z-3**: Equipes de Projetos — funções (BZ-3), alocação com origem única,
  diárias em lote com valor gravado, acumulado, documentos por dia, proposta
  de lançamento em Despesas (BZ-1).

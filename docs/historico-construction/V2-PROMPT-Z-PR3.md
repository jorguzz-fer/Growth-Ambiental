# Prompt Z — PR 3: Equipes de Projetos, funções e diárias

Sem migração nova (tabelas vieram na 0061). Nenhum `stakeholder`, despesa ou
lançamento alterado; nenhuma despesa é gerada por esta tela (BZ-1).

## Parte 3 — o que entrou
- **Tela `/equipes`** (módulo Pessoas; seletor de obra como no Caixa): a
  equipe da obra, o lançamento do dia em lote, o acumulado por membro e os
  dias registrados com documentos.
- **Funções (BZ-3)**: lista fechada por tenant em `funcao_equipe`; as cinco
  citadas (Pedreiro, Mestre de Obra, Comercial, Gestor Administrativo,
  Engenheiro) nascem na **primeira leitura** do tenant (`garantirFuncoesPadrao`,
  sem migração de dado); a tela permite adicionar e inativar (índice único
  sem diferenciar maiúsculas). A função é **por alocação** (3.4): a mesma
  pessoa pode ser Mestre na 28 e Pedreiro na 31 (teste 7).
- **Alocação** (3.2 / 3.3): o seletor lista autônomos e sócios (stakeholder
  ativo com papel de serviço/mão de obra ou Sócio/Quotista — "Mão de Obra
  CLT" do cadastro antigo entra como autônomo até migrar) e CLT ativos
  (funcionário sem desligamento), **mostrando a origem**. A alocação
  **referencia** o cadastro (nome e documento não são copiados — teste 5);
  **origem única** garantida na regra, na action e no `CHECK` do banco (6);
  CLT desligado e fornecedor inativo não entram (8); quem já está ativo na
  equipe sai do seletor. Encerrar (saída) e reabrir; editar função e valor.
- **Valor da diária é da alocação** (3.5.4 / 10): nulo para CLT e sócio
  (10b — a tela mostra "folha / retirada"); o cadastro de Fornecedores
  continua **sem** campo de diária (teste confere no schema). **Gravado em
  cada registro**: alterar a alocação vale para os próximos e a tela avisa
  (10a — teste: 250 na época, 300 depois).
- **Diárias em lote** (3.5.2 / 9): data, "marcar todos", quantidade ½ · 1 ·
  1½ · 2 por membro, "Registrar o dia" — uma transação, um `equipe_dia` por
  obra e data (único), uma diária por membro no dia (único; registrar de
  novo atualiza, não duplica). Sem geolocalização (3.5.3 / 7.4 / 18): é
  declaração de quem coordena. Autônomo sem valor vigente é recusado.
- **Acumulado por membro e período** (3.5.5), total da equipe, e a coluna
  **"Sem lançamento"** com o link **"Lançar em Despesas →"** (BZ-1): abre
  `/despesas` com valor, competência, fornecedor (o autônomo) e histórico
  pré-preenchidos; ao gravar, `lancarDespesa` marca as diárias com o
  `despesa_id` (rastro) — a despesa nasce **só** lá. Diária já lançada não é
  removida.
- **Documentos por dia** (3.6 / 11 / 12): folha de ponto assinada, foto da
  equipe, recibo de diária, outros — anexados ao **dia**, não ao membro;
  várias fotos com miniatura e compressão; versão por tipo; remover desfaz
  só o vínculo.

## Mudança em Despesas (BZ-1)
- `PrefillDespesa` ganha `fornecedorId` e `diariasIds` (`pf_fornecedor`,
  `pf_diarias`); o formulário pré-seleciona o fornecedor e manda os ids
  escondidos; `lancarDespesa` chama `vincularDiariasADespesa` (só as do
  tenant e ainda sem despesa) e audita `equipe.diarias.lancadas`. Nenhum
  outro comportamento de Despesas mudou.

## Testes
- `equipe-regras.test.ts` (4): origem pelo papel; origem única, desligado,
  inativo, diária só para autônomo (6, 8, 10b); registro (quantidade, valor
  vigente, alocação encerrada); acumulado e link de proposta (3.5.5, BZ-1).
- `actions/equipes.test.ts` (5, banco, R2 substituído): funções padrão e
  nova função; alocáveis com origem (3.3); alocação referencia sem copiar,
  origem única, funções diferentes por obra, desligado fora, CLT/sócio sem
  valor (5, 6, 7, 8, 10, 10b); lote, valor gravado e alteração que não
  reescreve, atualização sem duplicar, **nenhuma despesa criada** (9, 10a);
  documentos por dia com várias imagens (11, 12); rastro da despesa e
  **stakeholders idênticos antes e depois** (19).
- `nav-menu.test` (+ `/equipes`), `paginas-permissao` cobre a página.
- Suíte: 150 arquivos, 1440 testes; `tsc`, `eslint`, `next build`.

## Teste de navegador (local, admin)
Menu "Pessoas › Equipes de Projetos"; seletor mostra "Prestador Exemplo ·
autônomo · Fornecedores" e a CLT de teste; alocar a CLT mostra "— (folha /
retirada)" no lugar do valor; "Marcar todos" + "Registrar o dia" → "1
diária registrada… Nenhuma despesa foi gerada"; o dia aparece na lista.
Seeds apagados (1 funcionário, 1 alocação, 1 dia, 1 diária, 5 funções
padrão do tenant, auditorias). `stakeholder` 3, `despesa` 75, `time_entry`
0 antes e depois.

## Pergunta (não bloqueia)
- BZ-3: a gestão das funções ficou na própria tela de Equipes (link
  "funções (lista fechada)"). O prompt sugere Configurações — se preferir
  lá, é só mover o bloco.

## Próxima
- **Z-4**: os dois assistentes (6.1 somente leitura em Funcionários; 6.2
  propõe em Equipes — diárias do dia e leitura da folha de ponto) e o
  relatório final.

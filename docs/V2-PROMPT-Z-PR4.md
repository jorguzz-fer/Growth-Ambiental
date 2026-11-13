# Prompt Z — PR 4: os dois assistentes do módulo Pessoas

Sem migração. Nenhum dado existente alterado.

## 6.1 — Funcionários · somente leitura
- Painel `assistente-funcionarios.tsx` (não importa nenhuma action) com seis
  análises calculadas **no servidor** (`analisarFuncionarios`, puro):
  cadastro incompleto (sem CPF, cargo ou admissão), desligados ainda
  alocados, **CPF duplicado** entre funcionários e entre funcionário e
  fornecedor (o CPF é comparado no servidor e **só os nomes saem** — teste
  confere que nenhum CPF aparece no resultado), documentos de admissão
  faltando com o **ASO em destaque**, documentos vencendo (última versão por
  tipo; ASO e CNH, 30 dias) e folha sem despesa / despesa sem folha.
- O painel recebe **só nomes, datas, tipos e contagens** (6.3): a consulta
  `getTiposDeDocPorFuncionario` devolve tipo e validade, nunca o arquivo
  (16a). Nunca cadastra, edita, desliga nem exclui.

## 6.2 — Equipes · propõe e para
- **Registrar as diárias de hoje**: a partir da equipe ativa, a lista de quem
  trabalhou (quantidade 1, ajustável; "sem valor" marcado para autônomo sem
  diária definida). "Confirmar" chama a mesma `registrarDiariasDoDia` da
  tela — a gravação é da pessoa (17). Some quando o dia já está registrado.
- **Ler a folha de ponto anexada**: `lerFolhaDePonto(equipeDiaId)` lê **só**
  os documentos do tipo "Folha de ponto assinada" do dia (nunca documento de
  funcionário — 6.3 / 16a), pela IA (`src/lib/ai/folha-ponto.ts`: nomes e
  quantidades), casa os nomes com a equipe (`casarNomesComEquipe`) e
  **propõe**; sem par vira aviso. Não grava. Sem IA/R2 o painel diz o que
  falta.
- **Análises**: diárias sem lançamento de pagamento (BZ-1 — aponta para
  "Lançar em Despesas"), obra sem equipe, alocação sem função, alocações
  sobrepostas (mesma pessoa ativa em obras diferentes — pode ser legítimo).
- Nunca: alocar/desalocar, lançar despesa (teste de arquivo trava).

## Testes
- `pessoas-analise.test.ts` (3): as seis análises de 6.1 sem CPF no resultado
  (16); proposta do dia, sem lançamento, obra sem equipe, sem função,
  sobreposição e casamento de nomes (6.2); o "nunca" dos dois painéis (17).
- Ajustes de testes intermitentes alheios: `permuta-docs.test` lia `logs[0]`
  sem ORDER BY (ganhou ordem explícita); `cartao-compra.test` contava
  `cash_entry`/`pagamento` do banco inteiro (passa a contar só o tenant do
  teste). Três rodadas completas consecutivas verdes depois.
- Suíte: 151 arquivos, 1443 testes; `tsc`, `eslint`, `next build`.

## Teste de navegador (local, admin)
Funcionários: painel "Somente leitura" com as seis seções. Equipes: alocar
Prestador Exemplo (autônomo, R$ 200) → o painel propõe 1 diária de hoje → "Confirmar"
grava com a mensagem "Nenhuma despesa foi gerada"; "Diárias sem lançamento:
1", "Obra sem equipe: 2", "Alocação sem função: 1"; o acumulado mostra
"Lançar em Despesas →". Seeds apagados.

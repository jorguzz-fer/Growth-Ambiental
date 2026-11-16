# DRE — desempenho, PR 2: os índices que faltavam

Segundo PR do desempenho da DRE (o primeiro: `V3-DRE-DESEMPENHO-PR1.md`).

## O que muda

Migração **0071**, aditiva e reversível, com `down/`. Só cria cinco índices:

| Tabela | Coluna | Quem usa |
|---|---|---|
| `despesa` | `version_id` | DRE, Fluxo de Caixa, Dashboard, Despesas |
| `pagamento` | `despesa_id` | encargos financeiros da DRE e do Fluxo |
| `conta_receber` | `project_id` | receita da versão Atual |
| `permuta` | `version_id` | receita de revenda de permuta |
| `reembolso` | `version_id` | liberações de obra |

Antes, para trazer as despesas de uma versão, o banco lia a tabela inteira
(de todas as empresas) e descartava o resto. Com o índice, vai direto às
linhas da versão.

**Nenhuma linha é lida, alterada ou removida.** Nenhum número de tela muda:
índice só muda o caminho que o banco usa para achar os mesmos dados. O schema
do Drizzle ganhou as mesmas definições, para ficar igual ao banco.

Aplicada, revertida e reaplicada no banco local, com a contagem de linhas
igual antes e depois.

## Medição (banco local, 12 obras, 30 mil despesas, 18 mil pagamentos)

| Tela | Antes de tudo | Depois do PR 1 | Depois do PR 2 |
|---|---|---|---|
| DRE Empresa toda | 570 consultas · ~0,6 s · 365–465 ms no banco | 435 · ~0,2–0,3 s · 158–229 ms | 435 · ~0,2 s · **95–110 ms** |
| DRE de uma obra | 117 · ~0,1 s · 44–48 ms | 90 · ~0,06 s · 29–30 ms | 90 · ~0,06 s · **17 ms** |

O ganho dos índices cresce com o histórico: quanto maior a tabela, mais
pesava ler tudo.

## Na subida em produção

A migração roda no boot, como as outras. `CREATE INDEX` segura as escritas na
tabela enquanto cria o índice — com o volume atual, frações de segundo, dentro
da janela do próprio deploy (o app ainda não está atendendo).

## O que a medição mostrou fora deste PR

O **Fluxo de Caixa "Empresa toda"** faz **2.094 consultas** e leva **1,2 a
1,5 s** no banco local: ele ainda lê as despesas linha a linha
(`getExpenseRows`) e repete a leitura por projeto e por cenário. É o mesmo
tipo de problema que a DRE tinha, maior. Fica como candidato a um PR 3, com a
mesma garantia (comparação antes × depois, zero divergências).

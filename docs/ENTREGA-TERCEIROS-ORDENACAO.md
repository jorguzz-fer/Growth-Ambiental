# Entrega — ordenação em Contas a Pagar/Receber e despesa paga por terceiro

Documento de encerramento exigido no §19 do escopo. Cobre diagnóstico, causas,
regras implementadas, arquivos, migrations, testes, matriz de não-regressão,
plano de rollback, riscos residuais e o que ainda depende de validação.

---

## 1. Diagnóstico

### 1.1 Ordenação (§5)

Contas a Pagar tinha ordenação fixa em código (vencidas → a vencer → pagas) e
Contas a Receber exibia as linhas na ordem em que o servidor as devolvia. Não
havia nenhuma forma de o usuário reordenar por fornecedor, valor ou status.

Nada aqui era um defeito — era ausência de funcionalidade.

### 1.2 Despesa paga por terceiro (§6–§14)

Já existiam as tabelas `despesa_terceiro` e `restituicao` e a tela
`/restituicoes`. O que faltava, medido contra o escopo:

| Regra pedida | Situação encontrada |
|---|---|
| Vincular a obrigação a uma despesa **já lançada**, pelo PED | Não existia. O formulário sempre criava uma despesa nova, com PED novo. Registrar uma despesa que já estava lançada gerava um **segundo** lançamento do mesmo fato. |
| Abrir a obrigação existente em vez de criar a segunda | Não existia. Nada impedia duas obrigações para a mesma despesa. |
| Obrigação visível em Contas a Pagar | Não aparecia. Só a despesa (como "Pago") era listada; a dívida com o terceiro não tinha lugar nenhum. |
| Conta corrente do terceiro | Havia um consolidado por pagador, mas escopado à **versão do projeto ativo** — trocar de obra mudava a dívida com o sócio. Não havia extrato de movimentos. |
| Restituição conciliada com o extrato | Não existia. A restituição sempre criava uma saída de caixa nova; conciliar um item do extrato exigiria lançar a saída duas vezes. |
| Proteção contra duplicidade | Nenhuma. Sem transação, sem idempotência, sem índice único. |

### 1.3 "Despesas Gerais" (§15)

O escopo pedia para **reproduzir antes de corrigir** e para documentar a dúvida
caso o campo não pudesse ser identificado com segurança. As duas coisas foram
feitas — ver a seção 6, que é a única parte desta entrega com pendência.

---

## 2. Causas-raiz corrigidas

**A. As abas de `/despesas` descartavam o projeto selecionado.**
O link era `/despesas?tab=<aba>`, sem `?proj=`. Como a página resolve o projeto
por `ctx.projects.find(p => p.id === sp.proj) ?? ctx.projects[0]`, clicar em
qualquer aba devolvia a tela ao **primeiro projeto do tenant**. Para quem estava
com outra obra aberta, a leitura natural é "a obra não abre".

**B. Projeto sem versão "Atual" caía na versão de outro projeto.**
`const versionId = version?.id ?? ctx.version.id`. Quando `getAtualVersion`
não encontrava a versão Atual da obra escolhida, o código usava `ctx.version.id`
— a versão Atual do projeto do **cookie**, isto é, de outra obra. Efeitos:

- a lista exibia despesas de outra obra sob o nome desta;
- a despesa procurada não estava na lista, então não abria nem era editável;
- um lançamento novo seria gravado no projeto errado.

Esse caminho é alcançável porque `deleteVersion` existe e permite apagar a
versão Atual de um projeto.

**C. Nada impedia duplicidade no fluxo de terceiros.** Ver 1.2.

---

## 3. Regras implementadas

### §5 — Ordenação estilo planilha

- 1º clique no cabeçalho → crescente; 2º → decrescente; 3º → volta à ordenação
  padrão da tela.
- Indicador ▲/▼ apenas na coluna ativa.
- Texto alfabético em pt-BR ignorando acento e caixa; datas cronológicas
  (`MM/DD/YYYY` → `YYYYMMDD`, nunca comparação de string); valores numéricos.
- Vazios e nulos **sempre por último**, nas duas direções.
- Empate resolvido pelo ID, sempre crescente — o critério secundário não inverte
  junto com o primário, então a ordem não oscila entre renders.
- A linha inteira se move junto (a ordenação é do array de linhas).
- Sobrevive aos filtros: trocar um filtro mantém a coluna escolhida e reordena o
  novo conjunto.
- Ordena **todo o conjunto filtrado**, não só a parte visível.
- Nenhuma escrita no banco; nem o array de origem é mutado.

**Escopo:** `contas-pagar-table.tsx` e `contas-receber-manager.tsx` (as duas
listagens desta última). Verificável por `grep`:

```
$ grep -rn "sortable-th\|tabela-ordenacao" src/ --include=*.tsx
src/components/app/contas-pagar-table.tsx
src/components/app/contas-receber-manager.tsx
```

Despesas / Lançamentos continua com `ordenarLancamentos` (`created_at DESC`),
sem nenhuma alteração — nem de ordenação nem de apresentação.

### §6–§14 — Despesa paga por terceiro

Os quatro fatos ficaram separados:

1. **a despesa existe** — competência própria, reconhecida 1× na DRE;
2. **o terceiro pagou o fornecedor** — `pagoPorTerceiro = true`, sem saída de
   caixa da empresa na competência;
3. **nasce a obrigação** — linha em `despesa_terceiro`, com quem desembolsou;
4. **a restituição** — saída de caixa, em data própria, sem despesa nova.

Vínculo por PED: a busca é pelo número, mas o que é gravado é o **ID interno** da
despesa. Do lançamento original nada é sobrescrito — valor, competência,
vencimento, categoria, fornecedor e número PED permanecem, e no formulário esses
campos aparecem preenchidos e travados. A única gravação na despesa é a marca
`pagoPorTerceiro`.

Bloqueios: PED inexistente, lançamento cancelado e valor zero são recusados com
o motivo na tela. PED que já tem obrigação ativa **abre a existente** e avisa
que nada foi duplicado.

Beneficiário original e terceiro pagador são colunas distintas
(`despesa.fornecedor_id` × `despesa_terceiro.pagador_terceiro_id`).

Contas a Pagar mostra a obrigação como linha própria, com o saldo a restituir,
status da obrigação e ação "Restituir". Ela **não** entra em "Total" — não é
despesa nova, a despesa dela já está listada — e tem um total próprio,
"A restituir".

Conta corrente do terceiro: escopo de **tenant**, `saldo devido = total
desembolsado − total restituído`, com extrato de movimentos e saldo acumulado
linha a linha. Saldo negativo aparece em vermelho em vez de ser zerado.

Conciliação (§14): informando o item do extrato, a restituição apenas concilia o
lançamento existente — sem despesa nova e sem segunda saída de caixa. Desfazer
solta a conciliação em vez de lançar um estorno que não aconteceu no banco.

Dados bancários de obrigação quitada: `bank_account_id` fica na restituição, que
é imutável depois de gravada (só pode ser cancelada, o que estorna
explicitamente). Nenhum caminho de código altera a conta bancária de uma
restituição já registrada.

### §12 — Status

Exibidos como **Pendente / Parcialmente restituído / Restituído / Cancelado**.
O banco continua gravando `"Aguardando restituição"`: a troca é de vocabulário na
tela (`rotuloStatusObrigacao`). **Nenhum UPDATE foi emitido sobre registros
históricos** — reclassificar dados existentes é proibido pelo escopo.

### §16 — Duplicidade

| Cenário | Proteção |
|---|---|
| Restituição dupla | Chave de idempotência + índice `restituicao_idem_uq` |
| Duplo clique | Guarda `if (saving) return` + `disabled` no botão |
| Reenvio de formulário / refresh | Mesma chave de idempotência é devolvida, não recriada |
| Duas obrigações para o mesmo fato | Índice `despesa_terceiro_despesa_ativa_uq` + verificação na transação |
| Duplicação na DRE | A obrigação nunca cria despesa; o vínculo por PED reusa a existente |
| Duplicação de saída de caixa | Conciliação atualiza o `cash_entry` existente em vez de inserir |
| Reuso de pagamento | `SELECT ... FOR UPDATE` no saldo + `restituicaoCabe` |
| Reuso de item do extrato | Verificação de `cash_entry_id` já vinculado |

**Nenhuma duplicata existente foi apagada.** O índice de obrigação única só é
criado se os dados atuais já o satisfizerem; havendo duplicatas históricas, a
migration emite `NOTICE` e segue sem falhar — a trava fica na aplicação e o caso
vai para conferência manual.

### §15 — "Despesas Gerais"

Corrigidos os defeitos A e B da seção 2. Projeto sem versão Atual passa a
listar vazio e a exibir um aviso explicando o que falta, em vez de mostrar a
obra errada.

---

## 4. Arquivos

**Novos**

- `src/lib/tabela-ordenacao.ts` — comparador puro (§5)
- `src/lib/tabela-ordenacao.test.ts` — 17 testes
- `src/components/app/sortable-th.tsx` — cabeçalho clicável + hook
- `src/components/app/conta-corrente-terceiros.tsx` — conta corrente (§13)
- `src/lib/db/migrations/0034_terceiro_idempotencia_conciliacao.sql`
- `src/lib/db/migrations/down/0034_terceiro_idempotencia_conciliacao.sql`
- `scripts/varredura-terceiros.ts` — 17 verificações contra banco real
- `docs/ENTREGA-TERCEIROS-ORDENACAO.md` — este documento

**Modificados**

- `src/components/app/contas-pagar-table.tsx` — ordenação + linhas de obrigação
- `src/components/app/contas-receber-manager.tsx` — ordenação nas duas tabelas
- `src/components/app/restituicoes-manager.tsx` — busca por PED, idempotência,
  trava de duplo clique, rótulos de status
- `src/app/(app)/contaspagar/page.tsx` — junta obrigações às despesas
- `src/app/(app)/restituicoes/page.tsx` — conta corrente no lugar do consolidado
- `src/app/(app)/despesas/page.tsx` — §15
- `src/lib/actions/restituicoes.ts` — busca por PED, transações, idempotência,
  conta corrente, obrigações para Contas a Pagar
- `src/lib/calc/restituicao.ts` — `rotuloStatusObrigacao`,
  `saldoDevidoTerceiro`, `restituicaoCabe`
- `src/lib/calc/restituicao.test.ts` — +10 testes
- `src/lib/db/schema.ts` — 3 colunas nuláveis
- `src/lib/queries.ts` — 2 campos opcionais em `ContaPagarRow`

---

## 5. Migration 0034 — prova de que é aditiva

Só cria colunas **nuláveis** e índices. Não há `DROP`, `TRUNCATE`, `DELETE`,
`UPDATE` de dados, alteração de tipo ou de constraint existente:

| Objeto | Operação | Nulável |
|---|---|---|
| `despesa_terceiro.idempotency_key` | ADD COLUMN | sim |
| `restituicao.idempotency_key` | ADD COLUMN | sim |
| `restituicao.cash_entry_id` | ADD COLUMN (FK ON DELETE SET NULL) | sim |
| `despesa_terceiro_idem_uq` | CREATE INDEX parcial | — |
| `restituicao_idem_uq` | CREATE INDEX parcial | — |
| `despesa_terceiro_despesa_ativa_uq` | CREATE INDEX condicional | — |

Os dois índices de idempotência são **parciais** (`WHERE ... IS NOT NULL`):
registros anteriores têm a chave nula e ficam fora do índice, sem exigência
retroativa.

Todas as instruções usam `IF NOT EXISTS`, então a migration é idempotente e
reaplicável — o que importa porque as migrations rodam no boot do contêiner.

Verificado no banco:

```
$ psql -c "select column_name, is_nullable from information_schema.columns
           where table_name in ('despesa_terceiro','restituicao')
             and column_name in ('idempotency_key','cash_entry_id')"
idempotency_key | YES
cash_entry_id   | YES
idempotency_key | YES
```

Ciclo aplicar → reverter → reaplicar executado; índices e contagens idênticos
nas duas pontas.

---

## 6. Ponto que depende de você — o termo "Despesas Gerais"

O escopo manda documentar a dúvida se o campo não puder ser identificado com
segurança. É o caso.

**"Despesas Gerais" não existe em lugar nenhum do código.** Busca em todo o
`src/`, incluindo migrations e constantes:

- não é categoria da DRE — o enum tem `Receita`, `Custo Variável`, `Custo Fixo`,
  `Despesa Variável`, `Despesa Fixa`, `Retiradas`, `Investimento`,
  `Empréstimos`, `Despesas Financeiras`;
- não é grupo nem subitem do Plano de Contas padrão;
- não é aba, filtro ou tipo de lançamento.

`Despesa Variável` — o termo que, segundo o relato, funciona — **é** categoria da
DRE. Se os dois fossem a mesma coisa, "Despesas Gerais" seria uma categoria; e
não é.

A hipótese mais provável é que **"Despesas Gerais" seja o nome de um projeto**
(provavelmente de tipo Matriz/Filial, onde ficam as despesas gerais da empresa).
Isso encaixa exatamente com os dois defeitos corrigidos: um projeto perdido na
troca de aba e um projeto sem versão Atual mostram os dois o sintoma "não abre /
não é editável", e uma categoria da DRE não é afetada por nenhum dos dois.

**Nada foi renomeado, apagado, transferido ou reclassificado.** As correções
tratam do mecanismo (projeto perdido, versão de outro projeto) e valem para
qualquer projeto, com qualquer nome.

Para fechar com certeza, preciso de uma destas informações:

1. onde exatamente "Despesas Gerais" aparece na tela (seletor de projeto,
   filtro de categoria, coluna de uma listagem?);
2. ou o resultado desta consulta, executada em produção por quem tem acesso —
   é apenas leitura:

```sql
SELECT 'projeto' AS onde, id::text, name AS termo, kind::text AS detalhe
  FROM project WHERE name ILIKE '%geral%' OR name ILIKE '%gerais%'
UNION ALL
SELECT 'plano de contas', id::text, name, group_name
  FROM chart_account WHERE name ILIKE '%geral%' OR group_name ILIKE '%gerais%';
```

Se a resposta for "é um projeto", as correções já entregues provavelmente
resolvem o relato e basta confirmar em homologação. Se for outra coisa, volto
a investigar com o campo certo em mãos.

---

## 7. Testes executados

| Suíte | Resultado |
|---|---|
| `tabela-ordenacao.test.ts` (novo) | 17/17 |
| `calc/restituicao.test.ts` (+10) | 13/13 (1 de integração pulado sem DB) |
| Vitest completo | **153 passando**, 3 pulados |
| `scripts/varredura-terceiros.ts` (novo, banco real) | **17/17** |
| `scripts/varredura-reports.ts` (regressão) | **31/31** |
| `tsc --noEmit` | limpo |
| `eslint src/` | 0 erros, 0 avisos |
| `npm run build` | exit 0 |
| Migration aplicar → reverter → reaplicar | idêntico |

O que a varredura de terceiros prova contra o banco real:

```
[OK] Vínculo por PED não sobrescreve o lançamento original
[OK] Fornecedor original e terceiro pagador são relações DISTINTAS
[OK] Despesa aparece 1× na DRE, pela competência original
[OK] Nenhuma saída de caixa na competência (quem pagou foi o terceiro)
[OK] Segunda obrigação ativa para a MESMA despesa é bloqueada
[OK] Reenvio do mesmo fato (chave de idempotência) é bloqueado
[OK] Restituição parcial → status Parcialmente restituído
[OK] Saldo devido = total desembolsado − total restituído
[OK] Data da restituição NÃO altera a competência da despesa
[OK] Restituição NÃO cria despesa nova na DRE
[OK] Saída de caixa = apenas o que foi restituído
[OK] Restituição reenviada (mesma chave) é bloqueada — sem baixa dupla
[OK] Conciliar a restituição no extrato NÃO cria despesa nova
[OK] Conciliação usa a saída que JÁ estava no extrato (sem duplicar caixa)
[OK] Restituição integral → status Restituído e saldo zero
[OK] Após cancelar a obrigação, é possível registrar uma nova para a despesa
[OK] Nada foi apagado: a obrigação cancelada continua no histórico
```

---

## 8. Comparação de dados antes × depois

Nenhuma linha de negócio foi alterada por esta entrega. Não há script de
backfill, não há `UPDATE` em massa, não há reclassificação.

As únicas gravações que o código novo faz em dados existentes:

| Gravação | Quando | Reversível |
|---|---|---|
| `despesa.pago_por_terceiro = true` | ao vincular um PED a uma obrigação, por ação explícita do usuário | sim — cancelar a obrigação |
| `cash_entry.rec = true`, `cat = 'restituicao'` | ao conciliar a restituição com o item do extrato | sim — cancelar a restituição solta a conciliação |

Para conferência em homologação, antes e depois:

```sql
SELECT count(*) AS despesas, sum(valor) AS total_despesas FROM despesa;
SELECT count(*) AS obrigacoes, sum(valor_total) AS total_obrigacoes,
       sum(valor_restituido) AS total_restituido FROM despesa_terceiro;
SELECT count(*) AS restituicoes, sum(valor) FROM restituicao;
SELECT count(*) AS cash, sum(valor) FROM cash_entry;
SELECT competencia, count(*), sum(valor) FROM despesa GROUP BY competencia ORDER BY 1;
```

Os cinco resultados devem ser idênticos antes e depois do deploy, enquanto
ninguém usar as telas. `scripts/integridade.sql` cobre o mesmo de forma mais
ampla.

---

## 9. Matriz de não-regressão

| Funcionalidade | Comportamento anterior | Comportamento posterior | Teste realizado | Resultado | Evidência | Risco residual |
|---|---|---|---|---|---|---|
| Contas a Pagar — ordem padrão | vencidas → a vencer → pagas | idêntica enquanto não se clica num cabeçalho | teste "sem estado devolve a ordem original" | OK | `tabela-ordenacao.test.ts` | nenhum |
| Contas a Pagar — filtros | 7 filtros | inalterados; a ordenação escolhida é reaplicada ao novo conjunto | leitura de código + teste de conjunto completo | OK | `contas-pagar-table.tsx` | nenhum |
| Contas a Pagar — totais | Total e Pendente | idênticos para despesas; obrigações somam em "A restituir" à parte | `despesasFiltradas` exclui `origem = obrigacao` | OK | `contas-pagar-table.tsx` | se um tenant não usa terceiros, a tela fica igual à anterior |
| Contas a Receber — duas listagens | ordem do servidor | idêntica sem clique de cabeçalho | mesmo teste da ordem padrão | OK | `contas-receber-manager.tsx` | nenhum |
| Despesas / Lançamentos | `created_at DESC, id DESC` | **inalterado** | `grep` prova que não importa o módulo de ordenação | OK | seção 3 | nenhum |
| `getContasPagar` | usada por CP, Dashboard, Fechamento, conciliação | assinatura e retorno inalterados | obrigações vêm de query separada | OK | `queries.ts` | nenhum |
| DRE | despesa 1× por competência | idêntico | varredura de terceiros, 3 verificações | OK | `varredura-terceiros.ts` | nenhum |
| Fluxo de Caixa | exclui despesas de terceiro | idêntico (nada mudou em `fluxo-caixa.ts`) | varredura de relatórios 31/31 | OK | `varredura-reports.ts` | nenhum |
| Receita da versão Atual | plano de venda + contas a receber | idêntico | varredura de relatórios | OK | `varredura-reports.ts` | nenhum |
| Restituição — saída de caixa | uma saída por restituição | idêntico quando não há item de extrato | varredura, "saída = apenas o restituído" | OK | `varredura-terceiros.ts` | nenhum |
| Cancelar restituição | estorno compensatório | idêntico sem extrato; com extrato, solta a conciliação | leitura de código | OK | `restituicoes.ts` | comportamento novo só existe em restituições novas |
| Status das obrigações | "Aguardando restituição" na tela | "Pendente" na tela, mesmo valor no banco | 3 testes de rótulo | OK | `restituicao.test.ts` | relatórios externos que leiam o texto do status pelo banco continuam vendo o valor antigo |
| Permissões | `restituicoes` ver/criar/editar/excluir | inalteradas; Contas a Pagar só mostra obrigações a quem tem `restituicoes.ver` | leitura de código | OK | `contaspagar/page.tsx` | nenhum |
| `/despesas` — troca de aba | perdia o projeto | preserva `?proj=` | leitura de código | OK | `despesas/page.tsx` | nenhum |
| `/despesas` — projeto sem versão Atual | listava outra obra | lista vazia + aviso | leitura de código | OK | `despesas/page.tsx` | se algum tenant tem projeto sem versão Atual, a tela passa a mostrar vazio — correto, mas é uma mudança visível |
| Anexos e vínculos | documentos por despesa | intocados | nenhuma alteração em `documents` | OK | diff | nenhum |
| Numeração PED | `reserveDespesaNumber` | inalterada; o vínculo por PED **não** reserva número novo | leitura de código | OK | `restituicoes.ts` | nenhum |

---

## 10. Plano de rollback

**Código:** `git revert cc61c8b b00ad87` (ou reverter o merge da PR). As telas
voltam ao estado anterior; as colunas novas ficam no banco, nuláveis e ignoradas,
sem quebrar nada.

**Banco (só se necessário):**

```bash
psql "$DATABASE_URL" -f src/lib/db/migrations/down/0034_terceiro_idempotencia_conciliacao.sql
```

O script remove os três campos e os três índices e apaga a linha da 0034 no
journal do drizzle, para que ela seja reaplicada no próximo boot. Perde-se
apenas a chave de idempotência e o vínculo restituição→extrato; obrigações,
restituições, despesas, valores, competências e números PED permanecem.

**Ordem recomendada:** reverter o código primeiro e observar. Só reverter a
migration se houver um motivo específico ligado às colunas novas — deixá-las é
inofensivo.

Procedimento geral e snapshot em `docs/ROLLBACK.md` e `scripts/db-snapshot.sh`.

---

## 11. Riscos residuais

1. **"Despesas Gerais" não confirmado** — seção 6. Corrigi dois defeitos reais
   que produzem exatamente o sintoma relatado, mas não pude confirmar que são
   *o* defeito sem saber a que o termo se refere.
2. **Duplicatas históricas de obrigação** — se algum tenant já tiver duas
   obrigações ativas para a mesma despesa, o índice único não é criado (a
   migration avisa por `NOTICE` e segue). A trava passa a valer só para
   registros novos; as antigas continuam existindo, intactas, à espera de
   decisão sua. **Não apaguei nada.**
3. **Status no banco × status na tela** — quem consultar `despesa_terceiro.status`
   direto no banco continuará lendo `"Aguardando restituição"`. Foi deliberado:
   reescrever o histórico é proibido pelo escopo. Se preferir o valor novo
   também no banco, é uma migration de dados separada, que precisa da sua
   autorização explícita.
4. **Projeto sem versão Atual passa a listar vazio** — é a correção, mas é uma
   mudança visível. Se algum projeto real estiver nessa situação, ele vai exibir
   o aviso até que a versão Atual seja criada.
5. **Ordenação não é persistida** — é por sessão de tela, some ao recarregar.
   O escopo não pediu persistência.

---

## 12. Pendências de validação

**Com o responsável do cliente**

- Confirmar o termo "Despesas Gerais" (seção 6).
- Confirmar que a obrigação aparecendo em Contas a Pagar como linha separada,
  fora do "Total" e com total próprio "A restituir", é a leitura que ele espera.
- Conferir se algum lançamento antigo de "pago por terceiro" foi registrado em
  duplicidade antes desta entrega — se houver, decidir juntos o que fazer. Não
  toquei em nenhum.

**Com o contador**

- Tratamento das obrigações com terceiros no Balanço: hoje elas não compõem o
  passivo em nenhum relatório contábil, só aparecem em Contas a Pagar e na conta
  corrente. Se precisarem entrar no Balanço, é escopo novo.
- Confirmar que a data da restituição não deve afetar competência alguma —
  implementei assim porque o escopo determina, mas vale o aceite formal.

---

## 13. Como homologar

1. Restaurar um dump recente em homologação e rodar `scripts/integridade.sql`,
   guardando o resultado.
2. Subir a aplicação (a migration 0034 roda sozinha no boot). Conferir no log se
   apareceu o `NOTICE` de obrigações duplicadas.
3. Rodar `scripts/integridade.sql` de novo e comparar com o passo 1 — tem de ser
   idêntico.
4. **Ordenação:** em Contas a Pagar, clicar em Fornecedor (crescente), de novo
   (decrescente), de novo (volta ao padrão). Repetir em Valor e Vencimento.
   Aplicar um filtro de projeto e confirmar que a ordenação continua valendo.
   Repetir nas duas tabelas de Contas a Receber.
5. **Despesas:** abrir `/despesas`, escolher uma obra que não seja a primeira da
   lista, trocar de aba e confirmar que a obra continua selecionada.
6. **Terceiro por PED:** em Restituições, digitar o número de um PED existente,
   selecionar e conferir que valor/competência/fornecedor vêm preenchidos e
   travados. Registrar. Conferir em Despesas que o lançamento original está
   idêntico e que **não** nasceu um segundo PED.
7. **Duplicidade:** clicar duas vezes rápido em "Registrar". Tem de gerar um
   único registro. Repetir a busca do mesmo PED — deve avisar que já existe
   obrigação e abrir a existente.
8. **Restituição parcial:** restituir metade, conferir status "Parcialmente
   restituído", o saldo em Contas a Pagar e o saldo na conta corrente.
   Restituir o resto e conferir "Restituído" com saldo zero.
9. **DRE:** conferir que a despesa aparece uma única vez, na competência
   original, antes e depois das restituições.
10. `DATABASE_URL=<homologação> npx tsx scripts/varredura-terceiros.ts` — precisa
    dar 17/17. O script cria e remove o próprio tenant de teste.

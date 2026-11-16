# Prompt Q · PR Q-2 — o que a tela declara (variante, referência, origem, alcance)

Segunda PR de código do Prompt Q, conforme
[`V2-PROMPT-Q-FASE1.md`](./V2-PROMPT-Q-FASE1.md). Seção 5. Migração **0051**,
aditiva: quatro colunas anuláveis em `incc_rate`. **Nenhum índice existente é
alterado, recalculado ou reclassificado.** Tem `down`.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **5.1 · qual variante** | rótulo no cabeçalho; não basta "INCC" | coluna `incc_rate.variante` (nula = **a confirmar**, BQ-1). Título "Parâmetros / INCC · INCC-M" quando declarada; subtítulo "Variante do INCC a confirmar (DI, M ou 10)" enquanto não. Select (permissão editar) com confirmação; `definirVarianteIncc` grava em todas as linhas da obra e audita `incc.variante` de/para; **nenhum índice muda** |
| **5.2 · mês de referência** | declarar | a tabela guarda o **mês de referência**: `getIncc(rows, "MM/YYYY")` é lido pelo mês do vencimento da parcela (`projection.ts:66`), e a interpretação está correta. A tela diz: "Cada linha é o mês a que o índice se refere (a FGV divulga no mês seguinte)" |
| **5.3 · origem do índice oficial** | quem informou e quando, por mês oficial | colunas `informado_por`, `informado_em`, `fonte` (0051), gravadas pela edição do mês; campo "Fonte do índice informado (opcional)" acompanha a próxima edição e vai também à auditoria. Mês convertido em projeção perde a origem. Coluna "Informado por" na tabela: `e-mail · data · fonte`; histórico mostra "—" (a auditoria é a fonte); projetado mostra "projeção" |
| **5.4 · onde incide** | subtítulo visível; acumulado do mês do vencimento | subtítulo: "correção a partir da 5ª parcela, pelo acumulado do mês do vencimento"; bloco explicativo sob o cabeçalho |
| **5.5 · o que não alcança** | declarar | bloco: "Não é aplicada nos recebíveis de Contas a Receber nem na receita da DRE (valor nominal, por decisão)" — BQ-2, decidido em 30/09 |
| **5.6 · nada é gravado corrigido** | não introduzir | nada introduzido; o bloco diz "a correção é aplicada na leitura". `replicateFromAtual` (Prompt D) não foi tocada |

## Migração 0051

`0051_incc_rate_origem.sql`: `incc_rate.variante`, `fonte`, `informado_por`,
`informado_em`, todas `text` anuláveis, `IF NOT EXISTS`. `down/0051_…sql`
remove só as quatro.

## Arquivos

- `src/lib/db/migrations/0051_…sql`, `down/0051_…sql`, `meta/_journal.json`, `schema.ts`.
- `src/lib/incc-regras.ts` — `VARIANTES_DO_INCC`, `ehVarianteDoIncc`.
- `src/lib/queries.ts` — `getInccTabela` (linhas com origem + variante da obra).
- `src/lib/actions/incc.ts` — `persistir` com origem (grava/limpa), `updateInccMonth(…, fonte)`, `definirVarianteIncc`.
- `src/app/(app)/parametros/page.tsx`, `src/components/app/incc-editor.tsx`.
- `src/lib/actions/incc-q2.test.ts` (novo, 3 casos com banco).

## Verificação

- Testes: histórico em branco; editar grava quem/quando/fonte só do mês editado (projetado reescrito não ganha origem); conversão em projeção limpa a origem; variante inválida recusada, válida gravada em todas as linhas sem mudar índice, auditada, sem permissão recusada.
- Suíte completa, `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): cabeçalho com "Variante do INCC a confirmar", blocos de referência e alcance, coluna "Informado por" com "—" no histórico; abrir a tela não grava nada.
- Antes/depois de `incc_rate` local: índices idênticos (só colunas novas, vazias).

## Fica para depois

- Q-3 assistente (meses faltantes, curva × histórico, efeito de uma alteração, cobertura); resposta de BQ-1 para declarar a variante.

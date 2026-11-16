# Prompt P · PR P-1 — integridade do cadastro de permuta

Primeira PR de código do Prompt P, conforme
[`V2-PROMPT-P-FASE1.md`](./V2-PROMPT-P-FASE1.md). Seções 1.3/1.4, 3.1, 3.2,
3.5 e 4.3. **Sem migração. Nenhum registro gravado é alterado.** Nenhum número
de relatório muda (4.3 é refatoração com teste de saída idêntica).

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **1.3/1.4 · promessa falsa** | remover "VENDIDO … atualiza automaticamente o campo Permuta em Dados_de_Venda" | a faixa verde da lista e o subtítulo do formulário saíram. O subtítulo novo diz o conceito: o bem entra no inventário pelo estimado; a venda posterior gera caixa; o resultado é a diferença |
| **1.5 · diagnóstico** | duplicidade plano × tabela, só leitura | consulta 2 de `docs/historico-construction/sql/v2-prompt-p-diagnostico.sql` (Fase 1). Vira análise do assistente na P-6 |
| **3.1 · validação** | estimado > 0; unidade, cliente e data de recebimento obrigatórios; vendido exige data e valor de venda | `motivoDeRecusaDoAtivo()` em `src/lib/permuta-regras.ts` (puro): também domínio de status, forma de revenda e periodicidade, datas no formato gravado, parcelas ≥ 1 na venda parcelada. Vírgula decimal lida certo; vazio nunca vira `"0"` |
| **3.2 · retorno legível** | `{ ok, error }` | `addPermuta` devolve `{ ok: true, id } \| { ok: false, error }`: sem sessão, sem permissão, sem obra, versão congelada e cadastro incompleto são mensagens na tela. O formulário virou componente cliente (`permuta-form.tsx`) com `MoneyInput`, campos de parcela só quando a forma é parcelada, e `role="status"` para a mensagem; ao gravar volta à lista com "Ativo gravado." |
| **3.3 · auditoria** | — | `permuta.create` já existia (Prompt AK); as actions de editar e cancelar entram na P-2 com a sua |
| **3.4 · permissão de ver** | — | já feito pelo Prompt M nas duas rotas |
| **3.5 · filtro de tenant** | `getPermutas` filtrava só por versão | `getPermutas(tenantId, versionId)`; os sete chamadores passam a empresa (`permuta/page`, `versao/export`, `resumo` ×2, `caixa` Previstas, `fluxo-caixa`, `dre` — este ganhou o tenant em `versionInputsByMonth`/`versionInputs`). Ordenação por data de recebimento |
| **4.3 · fragilidade** | a receita copiava o caixa e somava o escambo por cima | `permutaEscamboByMonth` (novo, só escambo) e `permutaRevenueByMonth` = soma explícita de `permutaCashByMonth` + `permutaEscamboByMonth`. Teste prova que a saída é idêntica à fórmula antiga e que cada ativo entra em exatamente uma parte. A DRE continua lendo o valor cheio até a I-9 (chave única 54/56/57) |

## Arquivos

- `src/lib/permuta-regras.ts` (+ teste, 5 casos).
- `src/lib/actions/receitas.ts` — `addPermuta`, `ResultadoPermuta`.
- `src/components/app/permuta-form.tsx` (novo); `permuta/novo/page.tsx`; `permuta/page.tsx` (faixa removida, aviso "Ativo gravado.").
- `src/lib/queries.ts` — `getPermutas(tenantId, versionId)` e os sete chamadores.
- `src/lib/calc/projection.ts` — `permutaEscamboByMonth`, `permutaRevenueByMonth` (+ 2 testes em `projection.test.ts`).
- Testes ajustados: `receitas-projeto-explicito.test.ts`, `ak-parte1.test.ts` (o cadastro agora exige unidade, cliente e data).
- `src/lib/actions/permuta.test.ts` (novo, 4 casos com banco): recusas com mensagem e nada gravado; sem permissão e sem obra; gravação com vírgula decimal e auditoria; filtro de empresa.

## Verificação

- Suíte completa (91 arquivos / 1092 testes), `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): a lista e o formulário não mencionam mais "Dados_de_Venda"; submeter vazio mostra "Informe a unidade de origem do bem."; com unidade, cliente e data mostra "O valor estimado deve ser maior que zero."; marcado Vendido sem data mostra "Ativo vendido exige a data da venda."; com tudo preenchido grava, volta à lista com "Ativo gravado." e a linha aparece. Linha de teste apagada depois.
- Antes/depois de `permuta` (consulta 1 do SQL): local 0 → 0.

## Fica para depois

- P-2: editar, cancelar, cliente por id, `document.permuta_id` (migração 0049).
- P-3: ganho da revenda (puro + prévia); DRE só na I-9.

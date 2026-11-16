# Prompt W — Fornecedores e Stakeholders · relatório final

Prompt W (15 de 42) entregue em 6 PRs, todas em `main`. **Sem migração; sem
`UNIQUE`; nenhum cadastro alterado, inativado ou removido; nenhum `doc` ou
`papeis` reescrito.**

| PR | Conteúdo | Doc |
|---|---|---|
| Fase 1 | inventário, bloqueios, plano, SQL de diagnóstico | [`V2-PROMPT-W-FASE1.md`](./V2-PROMPT-W-FASE1.md) |
| W-1 | actions próprias com `{ ok, error, avisos }`; validação de documento; papel 20; endereço condicional; BW-2 | [`V2-PROMPT-W-PR1.md`](./V2-PROMPT-W-PR1.md) |
| W-2 | exclusão verifica as seis tabelas; nome digitado; inventário no log | [`V2-PROMPT-W-PR2.md`](./V2-PROMPT-W-PR2.md) |
| W-3 | seletores só com ativos; "Quem desembolsou" só com o papel | [`V2-PROMPT-W-PR3.md`](./V2-PROMPT-W-PR3.md) |
| W-4 | busca, filtro por papel, sinais discretos | [`V2-PROMPT-W-PR4.md`](./V2-PROMPT-W-PR4.md) |
| W-5 | assistente somente leitura | [`V2-PROMPT-W-PR5.md`](./V2-PROMPT-W-PR5.md) |

## Relatório obrigatório (seção 12)

1. **BW-1** — depende de produção: rode [`sql/v2-prompt-w-diagnostico.sql`](./sql/v2-prompt-w-diagnostico.sql) (consultas 1–3). Base local: 0 duplicados, 0 inválidos, 1 sem documento. **Nenhum corrigido**; a listagem e o assistente os sinalizam.
   1a. PF com papel de serviço ou mão de obra sem endereço: **1** na base local (consulta 5 para produção). **Nenhum alterado.**
2. **BW-2** — consulta 4/4b em produção. Local: nenhum papel fora da lista. Independente do resultado, a edição passou a preservar papel desconhecido.
3. **Inativos em seletor** — local: 0 inativos (consulta 6 para produção). Telas que mudaram com a seção 4: Despesas (formulário e leitura por IA), Restituições (quem desembolsou, beneficiário, lote), Acerto (favorecido). Listagem de Fornecedores, busca de despesas e mapas de nome: inalterados.
4. **Seis verificações** — `vinculosDoStakeholder` conta, na transação com `FOR UPDATE`, despesa, despesa_terceiro, recebimento_terceiro, acerto, compensacao e document; `bloqueiosDeExclusaoDoStakeholder` (puro) nomeia cada vínculo com a contagem.
5. **`cnpjValido` reaproveitado** de `calc/emitente-fiscal.ts`; **`cpfValido` criado** em `src/lib/stakeholder-regras.ts` (módulo puro do cadastro; `emitente-fiscal.ts` ficou só com o emitente — mesmo repositório, módulo ao lado).
6. **Nenhuma constraint `UNIQUE`** criada; duplicidade é aviso com o nome do outro cadastro.
7. **Actions** movidas para `actions/stakeholders.ts`; o que fazem não mudou — mudou o retorno (`{ ok, error, avisos }`), a validação e a auditoria. A leitura por IA (`extractFornecedorFromDoc`) foi movida sem alteração.
8. **Assistente** — cinco análises puras; não grava; não concede papel; nenhum documento vai a modelo (não há chamada a modelo).
9. **Leitura por documento** — intacta (`CampoIA`, `ResumoLeituraIA`, `UploadDocumentos`, `fornecedor-doc.ts`, `fornecedor-extract.ts` sem mudança).
10. **Antes/depois** — hash e contagem de `stakeholder` do tenant iguais ao fim de cada PR (conferido no banco local a cada verificação de navegador; consulta 10 para produção).
11. **Limitações** — (a) "Quem desembolsou" fica vazio até você conceder o papel "Pagador por Terceiro" a quem já paga (o assistente lista os candidatos; concessão item a item na tabela); (b) `PADRAO-VISUAL.md` não está no repositório; (c) o Prompt T (bloco de cadastro de pagador em Restituições, retirada do papel com obrigação, dados bancários) é o par deste e vem na ordem do arquivo.

## Decisões que ficaram com você (nenhuma travou)

- Exigir endereço também na edição de cadastro antigo PF já na condição? Hoje não (3-A.4: continua editável, sinalizado).
- Adiar o filtro de "Quem desembolsou" até os papéis serem concedidos? Hoje o filtro está ativo, com aviso e link.

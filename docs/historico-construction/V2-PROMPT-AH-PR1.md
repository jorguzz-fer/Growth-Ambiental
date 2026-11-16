# Prompt AH · PR AH-1 — Partes 1 a 5 da tela Empresa

Sem migração. Nenhum dado de `tenant` alterado. `calc/emitente-fiscal.ts`,
`fiscal/focus.ts` e `storage/r2.ts` **não foram alterados** (9.4).

## O que entrou
1. **Parte 1 · placeholders**: IBGE → placeholder "7 dígitos, sem ponto" +
   ajuda; alíquota → "0 a 5" + ajuda; LC 116 e CNAE → **sem placeholder**, com
   o valor típico do setor em texto **abaixo** do campo ("construção civil
   costuma ser 7.02…", "4120-4/00…"). o código IBGE da cidade-sede, `4120400`, `placeholder="7.02"`
   e `placeholder="3"` não aparecem mais no HTML. Nenhum `defaultValue` novo.
   Textos em `empresa-regras.ts` (`AJUDA_CAMPO`).
2. **Parte 2 · validação no servidor**: `salvarDadosFiscais` chama os
   validadores que já existiam (`cepValido`, `codigoMunicipioValido`,
   `ufValida`) via `recusaDoCadastroFiscal` — só quando o campo vem
   preenchido; vazio passa (gravação parcial preservada). As três actions
   devolvem `{ ok, error }` com o campo e o porquê, e a tela usa
   `FormComResultado` (mensagem visível).
3. **Parte 3 · `renameTenant`**: sem permissão ou nome vazio devolve erro
   visível; troca grava `tenant.rename` com `de`/`para` (`diffAudit`); nome
   igual não grava nem loga.
4. **Parte 4 · campos sem checagem**: avisos complementares
   (`avisosComplementares`) para `codigoTributarioMunicipio` vazio e
   `municipio` vazio ou sem código IBGE válido. Ficam **fora** do checklist
   (conflito 4.1 × 9.4, decisão da Fase 1): a tela concatena;
   `emitentePronto` continua contando só os bloqueios de sempre. Os cinco
   opcionais ganham "(opcional)" no rótulo.
5. **Parte 5 · R2**: selo diz o que mede — "R2 não configurado" / "R2
   configurado (sem teste)" / "R2 testado" (verde só após round-trip) / "R2 com
   falha no teste", com data e etapa do último teste real. A rota
   `/api/health/r2` registra cada teste (`tenant.r2.health`) e a chave ganhou
   **sufixo por tentativa** (5.4); o resto da rota não mudou.
6. **6.4 · texto do token**: deixa de mandar definir a variável e diz que, com
   as pendências de bloqueio fechadas, a emissão passa a ser em **Receitas ›
   Notas Fiscais**.

## Verificações
`empresa-regras.test.ts` (puro, 6): placeholders sem número (1–3); CEP, IBGE e
UF recusados e vazio passando (4–7); avisos novos e nunca bloqueio (13);
**checklist e `emitentePronto` iguais aos de antes** para os mesmos dados
(9.1, 9.2, 14, 15); selo só verde após teste (16); nome vazio.
`actions/empresa-ah.test.ts` (banco, 6): recusas com campo e porquê (4–8);
**dado inválido já gravado intocado** após recusa (9); gravação parcial (7,
10); `renameTenant` sem permissão / vazio / de-para (11, 12); `uploadLogo`
legível; **outro tenant não muda** (22). `emitente-fiscal.test.ts` segue verde
sem alteração. Suíte: 175 arquivos / 1592.
Navegador (admin, local): nenhum dos quatro números no HTML; placeholders e
ajudas novos; selo "R2 não configurado"; texto do emissor; avisos novos; 5
"(opcional)"; CEP "1234" recusado com a mensagem; nome vazio recusado. Linha
de `tenant` Cliente Piloto idêntica antes e depois; nenhum log gerado.

## Arquivos
`lib/empresa-regras.ts` (+test), `actions/empresa.ts` (+`empresa-ah.test.ts`),
`app/(app)/empresa/page.tsx`, `app/api/health/r2/route.ts`, `queries.ts`
(`getUltimoTesteR2`).

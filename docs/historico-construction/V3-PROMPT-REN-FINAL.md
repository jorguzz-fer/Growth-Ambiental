# Prompt REN · Renomeações e mudanças de menu — relatório final

Fase 3, Bloco 0. Executado em 18/10/2026. Fonte: revisão V5
([`V3-REVISAO-1710.md`](./V3-REVISAO-1710.md)).

## O que mudou

| Item | Antes | Depois |
|---|---|---|
| Projeção de Receitas | módulo Receitas | módulo **Business Intelligence** |
| Cartões de Crédito | módulo Despesas | módulo **Caixa** |
| Fornecedores | "Fornecedores" no menu, "Fornecedores & Stakeholders" na tela e na matriz | **Fornecedores e Parceiros** em todos |
| Medição | "Medição de Obra" | **Medição de Projeto** (menu, título, matriz de acessos, assistente) |
| Despesas, aba "A Pagar" | existia | **sai**; `?tab=apagar` redireciona para Contas a Pagar, mantendo a obra |
| Base de conhecimento do assistente | nomes e módulos antigos | atualizada |

## O que não mudou

- Rotas e chaves de permissão. Mover item de módulo no menu não muda quem
  o enxerga (`nav-menu.ts`, cabeçalho); o `modulo` em `permissions.ts`, que
  decide o padrão por papel, ficou como estava.
- Identificadores de código (`stakeholder`, `medicao`).

## Testes

`npm run typecheck`, `npm run lint` e `npm test` sem falha. Três testes
novos em `nav-menu.test.ts`: módulo de Projeção e Cartões, rótulos novos e
chave de permissão preservada.

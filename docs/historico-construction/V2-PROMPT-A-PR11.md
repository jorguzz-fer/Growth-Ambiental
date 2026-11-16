# Prompt A · PR 11 — Relatórios de uma obra

Consolidado, Resumo Executivo, Projeção de Receitas, Acesso Contabilidade e
Balanço do Dia. Com esta PR, **nenhuma tela lê o projeto ativo para escolher
dados**. O que resta dele fica para a PR final.

## O que muda

| Tela | Antes | Agora |
|---|---|---|
| Consolidado, Resumo, Projeção | obra do cookie (ou a primeira), **sem seletor** | seletor na tela + memória por aba; sem memória, pede a escolha |
| Contabilidade | os 3 números eram da obra do cookie | seletor para os números; sem obra, só o bloco dos números pede a escolha. O convite de contador, que é da empresa, segue visível |
| Balanço do Dia | já era da empresa | só passou a usar `getTenantContext` |

Esses relatórios mostram uma obra por vez, e não têm "Todos". Por isso, sem
obra na URL e sem memória na aba, eles **pedem a escolha**. Não abrem em
"Todos" como a DRE, porque não há consolidado que abrir (B12). As versões para
comparar são as da obra escolhida, e a versão padrão segue a mesma regra de
antes: Atual → padrão → mais antiga.

## Comparação com `main`

Mesmo banco local. O código antigo foi aberto **com o cookie** apontando cada
obra, e o novo com a obra na URL. Foram comparados todos os valores em R$,
todos os percentuais e todas as células numéricas das tabelas:

| Obra | Consolidado (mensal e anual) | Resumo | Projeção | Contabilidade |
|---|---|---|---|---|
| EMPREENDIMENTO PILOTO | **igual** | **igual** | **igual** | **igual** |
| OBRA 7 | **igual** | **igual** | **igual** | **igual** |

## O que resta do projeto ativo (PR final)

- os contadores do menu lateral (unidades, liberações e permuta), hoje
  calculados na obra do cookie;
- o botão "Selecionar" e o selo em Projetos;
- a limpeza do cookie ao excluir uma obra;
- `setActiveProject`, `setActiveVersion`, os dois cookies e `getActiveContext`
  (as telas que ainda o chamam usam só empresa e permissões).

## Verificação

- Suíte inteira: 866 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador:
  1. em aba nova, Consolidado, Resumo e Projeção pedem a escolha;
  2. a Contabilidade pede a escolha só no bloco de números, e o convite segue
     visível;
  3. depois de escolher a OBRA 7 no Resumo, as outras três telas abrem nela;
  4. nenhum erro de JavaScript.

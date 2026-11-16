# Prompt T · PR T-1 — Ressarcimentos: nome, pagadores, busca por PED, lista da empresa, Dias, porta de cancelamento

Seções 0, 1, 5, 6, 8 e 9 do Prompt T. **Nenhuma obrigação, ressarcimento,
compensação ou `papeis` existente alterado; sem migração.**

| Seção | Entrega |
|---|---|
| **0** nome | título "Ressarcimentos — pago por terceiro", subtítulo, "Ressarcimento em lote", "Registrar ressarcimento", "Valor a ressarcir", "A ressarcir", coluna "Ressarcido", rótulo da permissão. `rotuloStatusObrigacao` passa a exibir "Ressarcido" / "Parcialmente ressarcido" para os status gravados "Restituído" / "Parcialmente restituído" — **só o texto; nenhum registro reescrito**. Rota, tabelas e actions intactas |
| **1** pagadores | bloco **Pagadores terceiros**: quem tem o papel (documento mascarado, obrigações, saldo devido, ativo), **conceder** a um cadastro existente (1.2: acrescenta o papel, nenhum registro novo; a tela diz os papéis atuais), **retirar** só sem obrigação (1.3: com obrigação, explica e oferece inativar em Fornecedores), auditoria com nome e documento mascarado (1.5). Cadastro novo nasce em Fornecedores (Prompt W). Permissão: `restituicoes:editar` |
| **1.4** | já feito no Prompt W (seletor só com o papel) |
| **5** busca | `buscarDespesasPorPed` procura **só em `numDoc`**, pelo sufixo numérico: "123" = "000123" = "PED-000123"; nunca em `obs` |
| **6** escopo | `getDespesaTerceiros(tenantId)` lista as obrigações **da empresa** com a obra; a tela filtra por obra (inicial = obra da tela) e por status. A versão continua aceita como parâmetro opcional |
| **8** Dias | `situacaoDosDias` (puro, hoje do servidor): "10 d em atraso", "em 5 d", "hoje", "—"; atraso em vermelho |
| **9** porta | `cancelarRestituicao` já devolvia `{ ok, error }` mas **não tinha chamador**: entra "Cancelar" no extrato do terceiro (movimento de ressarcimento, permissão `restituicoes:excluir`), com motivo |

## Testes
`calc/restituicao.test.ts` +3 (Dias; normalização do PED; rótulos) e dois
casos antigos ajustados ao rótulo novo; `pagadores-terceiros.test.ts` (4,
integração: itens 6, 7, 3/4 e 10 do prompt). Suíte (1259), `tsc`, `eslint`,
`next build` verdes. Navegador: título e lote renomeados, bloco de
pagadores vazio, filtro por obra; conceder o papel a um cadastro existente e
retirar (auditoria com nome e doc mascarado). Hash de `despesa_terceiro`,
`restituicao`, `restituicao_item`, `compensacao` e `stakeholder` iguais
antes e depois.

## Nota (conflito W 1.4 × T BT-1)
O Prompt W diz que Fornecedores é o único lugar que concede o papel; o T diz
que é esta tela. A edição de Fornecedores continua permitindo marcar qualquer
papel (é a edição geral do cadastro); o bloco dedicado, com as regras 1.2 e
1.3, vive aqui. Documentado.

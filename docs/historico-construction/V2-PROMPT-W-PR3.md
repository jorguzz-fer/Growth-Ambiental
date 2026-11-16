# Prompt W · PR W-3 — seletores só com ativos; "Quem desembolsou" só com o papel

Seções 4 e 1.5 do Prompt W. **Nenhum registro alterado; sem migração.** Tudo é
filtro puro sobre a lista que as páginas já carregam (`getStakeholders` não
mudou: a listagem de Fornecedores e os mapas de nome continuam com todos).

## O que muda (reportado antes de aplicar — seção 10)

| Tela | Seletor | Antes | Agora |
|---|---|---|---|
| **Despesas** | Fornecedor (formulário) | todos | `opcoesDeSelecao`: só ativos, **mantendo o fornecedor da despesa em edição** (mesmo inativo, marcado "(inativo)") |
| Despesas | busca e coluna da tabela (`fornById`) | todos | **inalterado** — lançamento antigo precisa mostrar quem era |
| Despesas | leitura por IA (casar fornecedor do documento) | todos | só ativos: é proposta de lançamento novo, e o seletor não ofereceria o inativo |
| **Restituições** | Quem desembolsou | todos | `pagadoresPorTerceiro`: **só quem tem o papel "Pagador por Terceiro", ativo**. Sem ninguém, a tela diz e aponta para Fornecedores (concessão item a item) |
| Restituições | Beneficiário original | todos | só ativos; o do PED fica visível mesmo inativo (o select já vem desabilitado com PED) |
| Restituições | Terceiro (lote) | todos | só ativos, mantendo quem tem saldo nos dois lados |
| **Acerto** | Favorecido | todos | só ativos; a lista de acertos mostra o favorecido pelo join, inativo ou não |
| Fornecedores | listagem | todos, com "Mostrar inativos" | **inalterado** (4.3) |

`getSocios` já filtrava ativo; o novo filtro segue o mesmo comportamento (nota
da 1.6). Inativos no banco local: 0 (4.4); em produção, consulta 6 do SQL.

## Ponto de atenção (já apontado na Fase 1)

"Quem desembolsou" fica **vazio** até alguém receber o papel em Fornecedores.
Quem já tem obrigação lançada é candidato (consulta 8 do SQL; o assistente da
W-5 lista). Se preferir conceder os papéis antes de o filtro entrar, é reverter
uma linha em `restituicoes/page.tsx`.

## Testes

`stakeholder-regras.test.ts`: itens 14 e 15 (seletor sem inativos mantendo o
vinculado; pagador só com o papel). Suíte (1207), `tsc`, `eslint`, `next build`
verdes. Navegador: Fornecedor em Despesas, Quem desembolsou (vazio, com o
aviso) em Restituições e Favorecido em Acerto; inativar um cadastro o tira do
select de Despesas e o mantém na lista com "Mostrar inativos"; reativar devolve.
Hash de `stakeholder` antes = depois.

# Prompt M, Parte 2 — dados sensíveis do comprador · relatório

Decisão BM-3, aprovada em 29/09/2026. Esta PR entrega a **seção 5** (proteção de
dado pessoal) e a **nota da seção 7** (log sem valor sensível). As correções da
seção 6 (exclusão, trava de unidade, versão de documento, busca, `{ ok, error }`)
vão numa PR seguinte.

## A permissão nova

`clientesdados` — **"Clientes — dados financeiros e de perfil"**, na matriz da
Gestão de Acessos (grupo Receitas). Por padrão **só owner e admin**; pode ser
dada a alguém por override. Nenhum override existente a recebe (tela nova nasce
negada para quem não é admin).

**Campos governados:** banco financiador, renda bruta e líquida,
comprometimento, possui FGTS, saldo de FGTS, score, restrições, **estado civil**
e todo o bloco de **inteligência de mercado** (morar/investir, ramo, cargo,
área, empresa, regime, local e tempo de trabalho, possui imóvel, motivação,
como conheceu, indicado por, interesse, observações). Lista em
`src/lib/clientes-sensivel.ts`.

## O que muda para quem NÃO tem a permissão

- **Não recebe os valores do servidor (5.4):** a consulta da ficha nem
  seleciona essas colunas; os dois blocos não existem na tela — nem vazios, nem
  desabilitados (5.4.1). Conferido no HTML: nenhum valor aparece.
- **CPF mascarado** — `•••.000.001-••` na lista (para todos) e na ficha (5.1).
  Na ficha, o campo fica vazio com o mascarado de dica: **vazio mantém** o
  cadastrado, **digitar substitui**.
- **Salvar não apaga nada.** O formulário dele não tem os campos sensíveis, e
  sem cuidado o Salvar os gravaria vazios. A action descarta o que ele não pode
  editar — inclusive se alguém mandar o campo à força.
- A coluna **Interesse** some da lista.

Com `ver` sem `editar`, os blocos aparecem **desabilitados** e a action também
não os grava.

## Lista mais leve (5.5)

`getClientes` passou de 39 colunas para 7. Os outros usos (Projetos, Contas a
Receber, Permuta) só liam id e nome.

## Log de auditoria (7, nota)

`cliente.update` passa a registrar os campos sensíveis e o CPF **só como
"alterado"**, sem valor — o contador lê esse log. O resto do log campo a campo
(o trecho que o prompt manda não tocar) continua igual. Linhas antigas não são
alteradas (append-only); a máscara de exibição da decisão 3.8 segue cobrindo-as.

## 5.2 e 5.3 — o que ficou para depois

- **Validação de formato de CPF/CNPJ** na entrada e sinalização de cadastro fora
  do padrão: entra com a seção 6.
- **Sem `UNIQUE` em CPF**, como pede o prompt. A consulta de duplicatas fica
  para rodar em produção junto da próxima PR.

## Verificação

- `clientes-sensivel.test.ts`: padrão por papel, override, máscara de CPF/CNPJ,
  log sem valor.
- `clientes-dados.test.ts` (Postgres): sem a permissão, salvar a ficha **não
  apaga** renda, score, estado civil, empresa nem CPF; mandar campo sensível à
  força não grava; digitar CPF novo substitui; com a permissão edita e o log não
  guarda os valores.
- Teste-oráculo do AJ atualizado: a tela nova não existia antes, e nenhuma
  célula foi ampliada.
- Navegador (build de produção): membro não recebe nenhum valor sensível na
  lista nem na ficha; salvar a ficha como membro preservou tudo; admin vê
  tudo.

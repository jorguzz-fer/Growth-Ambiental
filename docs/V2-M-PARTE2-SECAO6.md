# Prompt M · Parte 2, seção 6 — correções do cadastro de clientes (1ª metade)

## O que entra

| Item | Antes | Agora |
|---|---|---|
| **6.1 · Exclusão** | física, com `return` silencioso sem permissão; o log guardava só o id | exige **digitar o nome** do cliente. Fica **bloqueada** com unidade de contrato ativo, contas a receber, documentos, obra (cliente em Projetos) ou recebimento por terceiro. O log guarda nome, CPF mascarado, unidade e quantidade de documentos |
| **6.1.1 · Posição** | botão "Excluir" no topo, a um clique | cartão próprio no **rodapé**, separado do Salvar, dizendo o que a exclusão exige e **o que hoje a bloqueia** |
| **6.2 · Comparação do status** (parcial) | "distratado" em minúsculas não liberava a unidade | a comparação ignora maiúsculas, acento e espaço. Status em branco continua reservando a unidade, e a tela avisa (6.2.1) |
| **6.3 · Conflito de unidade** | consulta e gravação fora de transação: dois cadastros simultâneos passavam | na mesma transação, com trava pela unidade; o teste confirma que, de dois simultâneos, só um passa |
| **6.4 · Nome** | vazio gravava "Sem nome" | recusado com mensagem, no cadastro e na edição |
| **6.5 · Versão de documento** | contava todas as versões do cliente (um comprovante depois do contrato v1 virava "v2") | conta **por tipo**. Nenhuma versão já gravada muda |
| **6.9.1 · Tipo do documento** | aceitava sem tipo | obrigatório |
| **6.9.2 · Versão explicada** | — | a tela explica: mesmo tipo = nova versão, anterior preservada |
| **6.9.4 · Limite** | 15 MB em Clientes e 20 MB em Projetos, mas o servidor corta o corpo em **12 MB** | **10 MB** nas duas telas e nas duas actions |
| **6.10 · Retorno** | `addCliente`, `updateCliente`, `deleteCliente` e `uploadClienteDoc` lançavam erro ou retornavam em silêncio | devolvem `{ ok, error }`, e a tela mostra a mensagem |

### Achado — exclusão apagava documentos

A FK `document.cliente_id` é `ON DELETE CASCADE`: excluir um cliente **apagava
os registros dos documentos dele**. Os arquivos continuavam no R2, mas sem
vínculo. A trava da 6.1 impede isso. As outras três FKs (`project`,
`conta_receber`, `recebimento_terceiro`) são `SET NULL`, e o vínculo sumia sem
aviso; por isso também bloqueiam.

### De passagem (Prompt A, 38)

`uploadClienteDoc` gravava o `projectId` do formulário sem conferir a empresa.
Agora confere.

## Fica para a 2ª metade — precisa de decisão

- **6.2 · Fechar o domínio de "Status do contrato":** hoje o campo é texto
  livre. Para virar lista fechada, é preciso saber **quais valores existem em
  produção** e quais serão aceitos. Levantamento em
  `docs/sql/v2-status-contrato.sql`.
- ~~6.6, 6.7 e 6.8~~ — entraram na 2ª metade, abaixo.
- 6.9.3: não há ação de remover documento de cliente na tela. Fica registrado.

## Verificação

- `clientes-regras.test.ts` (regras puras) e `clientes-correcoes.test.ts`
  (Postgres):
  - sem nome é recusado;
  - "distratado" em minúsculas libera a unidade;
  - de dois cadastros simultâneos da mesma unidade, só um passa;
  - apagar o nome na edição é recusado;
  - exclusão sem o nome certo é recusada;
  - cliente com documento não é excluído, e o documento fica;
  - unidade com contrato ativo bloqueia a exclusão;
  - exclusão livre grava o log completo, com o CPF mascarado.
- Suíte inteira: 881 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador:
  1. a ajuda do status aparece;
  2. a exclusão fica no rodapé, sem botão no topo;
  3. confirmação errada → mensagem;
  4. confirmação certa → volta à lista e o cliente saiu;
  5. nenhum erro de JavaScript.

---

# 2ª metade — 6.6, 6.7 e 6.8

| Item | Antes | Agora |
|---|---|---|
| **6.6 · Unidade por obra** | o seletor listava os códigos de **todas** as obras misturados | primeiro se escolhe a **obra**, depois a unidade dela. A unidade já vinculada **aparece sempre**. Se não for da obra escolhida, vem marcada "vinculada, de outra obra" (ou "sem obra", se o código não existe em nenhuma), com um aviso dizendo de onde ela é. Nada é corrigido sozinho |
| **6.7 · Interesse** | número livre (aceitava 0, 7, 99) | **seleção de 1 a 5**. Valor fora da faixa já gravado continua aparecendo, marcado "fora da faixa", na ficha e na lista. Salvar a ficha sem mexer nele **não** é barrado e **não** converte o valor; trocar por outro valor fora da faixa é recusado |
| **6.8 · Lista** | todos os clientes numa página só, sem busca | **busca** por nome ou unidade (sem diferenciar acento e maiúsculas; cada palavra precisa aparecer), **filtro por status** (com a contagem de cada um e "Sem status"), **paginação** de 50 em 50. Tudo fica na URL (`?q=`, `?status=`, `?pagina=`) |

### Como a obra da unidade é escolhida (6.6)

O cliente **não tem coluna de obra**. Ele guarda só o código da unidade. A obra
no formulário é um filtro de tela e **não é gravada**. Nenhuma mudança de
banco.

A obra em que o seletor abre segue esta ordem:

1. a obra da unidade vinculada;
2. se o código existir em mais de uma obra, a obra da aba (`?proj=`), quando
   for uma delas;
3. sem unidade vinculada, a obra da aba;
4. senão, a primeira obra da lista.

Entram na lista as obras e também os escritórios que tenham unidade. Os
escritórios sem unidade ficam de fora.

### Registro — código de unidade repetido entre obras

A trava de "unidade já vendida" (6.3) compara **só o código**, na empresa
inteira. Se duas obras têm uma unidade "101", um cliente na 101 da OBRA 1
bloqueia a 101 da OBRA 2. **Não mexi nisso.** Mudar exigiria gravar a obra no
cliente, o que é mudança de banco e de regra. Fica como pergunta para quando
o cadastro de cliente ganhar vínculo com a obra.

### Verificação (2ª metade)

- `clientes-regras.test.ts`:
  - faixa do interesse, e o que é recusado ou aceito;
  - obras de uma unidade e a obra inicial;
  - leitura dos filtros e montagem dos links.
- `clientes-listagem.test.ts` (Postgres):
  - unidades por obra, sem repetir entre versões e só da empresa;
  - busca sem acento;
  - busca por unidade;
  - `%` e `_` tratados como texto;
  - status com espaços sobrando;
  - "Sem status" pega nulo e vazio;
  - paginação estável;
  - interesse 6 recusado no cadastro;
  - interesse 7 já gravado: salvar sem mexer passa e fica 7, trocar por 9 é recusado, corrigir para 4 passa.
- Suíte inteira: 897 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador (62 clientes de teste):
  - a lista mostra 50 por página, e a página 2 mostra 12;
  - "otavio orfao" acha "Otávio Órfão";
  - "O7-101" acha pela unidade;
  - o filtro Distratado mostra "20 de 62";
  - interesse 7 aparece como "7 · fora da faixa";
  - a ficha abre na obra da unidade;
  - ao trocar de obra, a vinculada continua selecionada e marcada, com o aviso;
  - salvar sem mexer mantém a unidade e o interesse 7;
  - uma unidade inexistente aparece como "sem obra";
  - nenhum erro de JavaScript.

## Ainda pendente

- ~~**6.2 · domínio fechado do status**~~ — **feito em 30/09/2026.** Em
  produção só havia "ATIVO" [dado de produção removido]. Lista decidida pelo dono: Ativo ·
  Assinado · Em análise · Reservado · Distratado · Cancelado. O campo vira
  seleção; "ATIVO" continua valendo como Ativo e **não é convertido**; valor
  fora da lista segue legível, sinalizado, e o servidor só o aceita se for o
  mesmo já gravado. Testes em `clientes-regras.test.ts` e
  `clientes-listagem.test.ts`.
- **6.9.3:** não existe ação de remover documento de cliente.

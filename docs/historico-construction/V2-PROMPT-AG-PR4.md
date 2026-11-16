# Prompt AG — PR 4: cancelar a nota

Quarta parte do emissor de NFS-e (Focus NFe). Aqui entra o cancelamento de
nota **autorizada**. A cópia do PDF e do XML para o nosso armazenamento vem na
PR 5.

## Como funciona, para quem usa

1. Na nota autorizada, quem tem a permissão **"Cancelar nota fiscal
   (NFS-e)"** (`notacancelar`) vê **Cancelar nota fiscal…**.
2. A pessoa escreve o **motivo** (15 a 255 caracteres) e **digita o número da
   nota** para confirmar. O botão só fica ativo com as duas coisas certas.
3. A tela avisa que o cancelamento não se desfaz e que algumas prefeituras só
   aceitam dentro do mês de competência.
4. Resultados possíveis:
   - **Cancelada**: a nota continua na lista, marcada como cancelada, com
     quando, quem e o motivo. Nada se apaga.
   - **Recusado pela prefeitura** (fora do prazo, por exemplo): a nota
     continua autorizada, a mensagem aparece e dá para tentar de novo.
   - **Sem confirmação** (a Focus não respondeu): a nota continua autorizada
     e aparece **Conferir na Focus**. Quando a consulta disser "cancelado", a
     nota vira cancelada com o motivo do pedido.

## Regras de segurança

- O pedido (com o motivo) é gravado **antes** de chamar a Focus.
- Duplo clique: o segundo pedido no mesmo minuto é recusado. A Focus é
  chamada uma vez (testado).
- Só a resposta "cancelado" cancela. Erro com mensagem é recusa. Rede, 5xx,
  401 ou 403 é "sem confirmação". Em nenhum caso a nota vira cancelada sem a
  Focus dizer.
- Nenhuma situação volta: cancelada não cancela de novo nem volta a ser
  autorizada.

## Permissões

- Cancelar: `notacancelar`. Nasce só com proprietário e administrador e pode
  ser concedida em Gestão de Acessos. É uma permissão separada de emitir.
- Conferir na Focus: quem pode emitir, cancelar ou editar Notas Fiscais.
- O contador vê a nota cancelada, mas não cancela.

## Privacidade e auditoria

- Auditoria: `nfse.cancelar.pedido` (ambiente, ref) e `nfse.situacao` (de,
  para, ref). **O motivo não vai para a auditoria**, porque é texto livre e
  pode citar o tomador. Ele fica no histórico da própria nota.

## BAG-2 continua valendo

Cancelar a nota não mexe em conta a receber, despesa nem caixa (o teste conta
antes e depois). Se a receita precisar de ajuste, quem faz é a pessoa, em
Contas a Receber.

## Testes

`src/lib/actions/notas-servico-cancelamento.test.ts` (banco real, Focus
simulada):
- cancelamento completo, com o pedido gravado antes da chamada;
- recusas antes da Focus (número errado, motivo curto, contador, membro,
  rascunho);
- prefeitura recusa;
- sem resposta e confirmação pela consulta;
- duplo clique.

As regras puras (`lerCancelamento`, `desfechoDoCancelamento`) estão em
`src/lib/nota-servico.test.ts`.

## Próximo passo (PR 5)

Guardar o PDF e o XML da nota autorizada no nosso armazenamento, com a marca
de homologação no nome do arquivo, e o download pela tela.

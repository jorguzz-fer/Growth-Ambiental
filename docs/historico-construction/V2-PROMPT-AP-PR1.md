# Prompt AP · AP-1 — a trava e a planilha mudam de lugar

Primeira parte da saída de `/versao`. **Nada sai neste PR:** as capacidades
que só existiam lá ganham destino antes.

## A trava (BAP-2, opção 2)

- **Nova permissão própria `versaotrava`**, "Travar e destravar versão", no
  módulo Planejamento.
  - Pelo padrão, só owner e admin, como `versao` hoje.
  - Pode ser dada por override, inclusive a membro.
  - O contador não recebe, por causa do teto de leitura.
- **Nova action `travarVersao(versionId, travar)`.**
  - Devolve `{ ok, error }`.
  - Valida a versão no tenant.
  - Grava só `locked`, com log `version.lock` e `de`/`para` na mesma
    transação.
  - Pedido igual ao estado atual não grava nada.
- **Onde aparece:**
  - Na barra de **Orçamentos** e de **Previsão Atualizada**, ao lado do selo
    "travada / não travada", para a versão aberta.
  - Na tela **Projetos**, com um projeto escolhido, no cartão "Versões do
    projeto". Ele lista todas as versões, inclusive a **Atual** e as cópias,
    com tipo, situação, trava e botão.
- **Confirmação antes de mudar**, dizendo o efeito: "Enquanto travada,
  ninguém lança, edita, exclui ou paga nada nela."

## A planilha (BAP-3)

- O cartão **"Planilha da versão Atual"** fica na tela Projetos, com um
  projeto escolhido. Ele traz:
  - o download da planilha modelo;
  - a exportação dos dados da Atual;
  - a importação.
- As rotas de download foram copiadas para `/projeto/planilha/modelo` e
  `/projeto/planilha/exportar`, que caem no enforcement de `projeto`.
- **Permissão:** `projeto:editar`, pelo padrão owner e admin, como
  `versao` antes. `importVersionData` passou a exigir a mesma.
- **A importação não mudou:** só insere na Atual, só em categoria vazia,
  nunca apaga, e recusa versão travada.

## Dados

Nenhuma versão alterada. Nenhuma migração.

## Testes

- `actions/versao-trava.test.ts`, com banco:
  - owner trava e destrava, com log de→para;
  - membro e contador não travam pelo padrão;
  - o contador não trava nem com override;
  - membro com override de `versaotrava` trava;
  - versão de outra empresa não é tocada;
  - só `locked` muda.
- Suíte inteira: os oráculos de permissão continuam valendo, sem nenhuma
  célula ampliada.
- Navegador:
  - Projetos lista as três versões com a trava;
  - a exportação e o modelo baixam;
  - travar e destravar a Atual pede confirmação e funciona;
  - Orçamentos mostra o botão.
  - A versão voltou ao estado de antes e os logs do teste foram apagados.

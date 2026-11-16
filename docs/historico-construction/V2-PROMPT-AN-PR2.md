# Prompt AN · AN-2 — lote híbrido, item a item

Parte 3 do Prompt AN. Decisão BAN-2 adotada: **opção 3, híbrido.**

## O que mudou

- **Seletor por linha (3.1).** A coluna "Nova categoria" deixa escolher o
  destino de cada lançamento. Cancelada mostra "encerrada" e não tem seletor.
- **O lote sobrevive só para seleção homogênea (3.2).**
  - O lote fica disponível quando todos os marcados são do mesmo fornecedor
    ou da mesma conta CEF. Ele preenche o destino das linhas marcadas, que
    continuam visíveis e editáveis antes do preview.
  - Lançamento sem fornecedor ou sem conta não prova nada, e conta como
    distinto.
  - Com a seleção misturada, o lote fica desabilitado e a tela avisa: "A
    seleção tem N fornecedores diferentes. O lote só vale para um
    fornecedor ou uma conta CEF — escolha a categoria linha a linha, ou
    marque só um fornecedor."
- **O preview mostra fornecedor, valor, de e para de cada linha (3.3).** Se
  houver mais de um fornecedor, ele diz quantos e pede para conferir cada
  linha.
- **Nenhum limite de quantidade (3.4).**
- **Servidor.** A nova action `reclassificarItens` recebe cada lançamento com
  o seu destino.
  - Toda categoria é validada antes de qualquer leitura ou escrita: uma
    credora recusa o pedido inteiro.
  - O mesmo lançamento com dois destinos é recusado.
  - Tudo roda na mesma transação do AN-1.
  - `reclassificarDespesas` continua existindo e chama a nova.
- **Correção encontrada no teste.** A mensagem de sucesso sumia quando a
  reclassificação zerava a lista, porque o estado vazio substituía a tela.
  Agora ela aparece também ali.

## Testes

- Só lógica: homogeneidade por fornecedor e por conta, seleção misturada com
  aviso, lançamentos sem fornecedor, e um lançamento só.
- Com banco:
  - destinos diferentes numa chamada só;
  - uma credora recusa tudo sem gravar;
  - dois destinos para o mesmo lançamento são recusados.
- Navegador, com três lançamentos temporários depois apagados:
  - a seleção misturada avisa e desabilita o lote;
  - a seleção de um fornecedor habilita o lote;
  - o destino por linha funciona;
  - o preview mostra fornecedor e valor;
  - a mensagem final traz os três números.

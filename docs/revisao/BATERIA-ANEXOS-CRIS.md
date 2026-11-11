# Bateria de anexos da Cris (Prompt AQ §6) — roteiro para preencher

**Para quem:** o Thiago (teste dele) e o relatório final da Etapa 3. Os dois
usam a mesma tabela, para comparar as mesmas coisas.

**Quando rodar:** depois do deploy da Etapa 3 (parte 2), com a chave de IA
ligada.

**Onde rodar:** no Chrome e no Safari (ou Edge). Cada item é feito duas vezes:
anexando pelo 📎 e colando (Ctrl+V / Cmd+V). Arrastar o arquivo sobre o painel
da Cris também vale como anexo.

**O que registrar em cada linha:**

- o navegador;
- o caminho (📎, colar ou arrastar);
- o que a Cris propôs;
- o que estava errado;
- o print.

**Permissão conta como acerto.** Se a pessoa não tem permissão (por exemplo, de
criar fornecedor), a Cris explica e não propõe. Isso conta como acerto.

| # | Tela | Arquivo | O que tem de acontecer | Chrome | Safari / Edge |
| --- | --- | --- | --- | --- | --- |
| 1 | Fornecedores, novo | Print do cartão CNPJ ou do site do fornecedor | A Cris propõe razão social, CNPJ, endereço e contato; nada é salvo sem o botão | | |
| 2 | Fornecedores, novo | Contrato em PDF | O mesmo do item 1, a partir do contrato | | |
| 3 | Despesas, nova | Foto de nota fiscal ou boleto | Fornecedor, valor, vencimento e competência propostos | | |
| 4 | Caixa | Extrato em PDF ou print | Antes do Prompt AT §8.3: a Cris explica que a importação é pelo botão Importar extrato | | |
| 5 | Clientes | Qualquer documento | Hoje a tela **aceita** o anexo (BAQ-2). A Cris não preenche nome nem CPF; o modelo lê o documento | | |
| 6 | Qualquer tela | Imagem acima de 4 MB e arquivo .docx | Recusa com a mesma mensagem do 📎, nos dois caminhos | | |
| 7 | Qualquer tela | Print colado sobre outro anexo | Troca e avisa | | |

## O que já foi conferido sem a IA (11/11/2026)

Feito no Chromium, no servidor local, com o modelo desligado.

- **Item 6:**
  - colar ou soltar um .docx e uma imagem acima de 4 MB é recusado com as
    mesmas mensagens do 📎 (`src/lib/cris-colagem.test.ts`);
  - o 📎 passa pela mesma função `validarAnexo`.
- **Item 7:** colar um segundo print sobre o primeiro troca o anexo e mostra
  "O anexo ... foi trocado por ...". Conferido no navegador, no chat da Cris e
  na caixa de conversa do painel de Estoque.
- **Item 1, sem o modelo:** o print colado na tela de Fornecedores vira
  anexo. O anexo chega à Cris junto com o formulário do fornecedor. A proposta
  volta para a tela e nada é gravado pela Cris
  (`src/lib/actions/cris-permissao.test.ts`, AQ-T10). O que o modelo de
  verdade propõe só aparece com a chave de IA.

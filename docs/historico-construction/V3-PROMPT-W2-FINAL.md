# Prompt W2 — Fornecedores e Parceiros: o chat lê arquivo

**O que mudou**

- **O cadastro novo se oferece à Cris.** A pessoa anexa na conversa o cartão CNPJ, o contrato social, a nota ou um cartão de visita, ou dita os dados, e pede para preencher. A Cris preenche tipo, nome, nome fantasia, CNPJ ou CPF, contato, e-mail, telefones, site, endereço completo e papéis.
- **Mesma regra da leitura por upload.** A proposta da Cris passa pela mesma função que já preenchia o formulário a partir do arquivo enviado na tela. Os mesmos alertas aparecem: documento incompleto, campo essencial faltando, cadastro sem papel.
- **O que a Cris propõe substitui o campo; o resto fica.** Pelo upload, o que a pessoa digitou nunca é sobrescrito. Pela Cris, a pessoa pediu a mudança, então os campos propostos substituem os da tela. Os demais ficam como estão e não viram alerta.
- **Papel fora da lista cai.** Só entram os papéis que a tela oferece.
- **Quem cadastra é o botão da tela.** A Cris não grava nada.
- A base de conhecimento da Cris explica o uso.

**Regras mantidas**

- Banco, agência, conta, titular e PIX ficam fora do formulário da Cris e são preenchidos à mão.
- Nenhum dado alterado, nenhum acesso ampliado.

**Testes**

- Unidade: o formulário não leva dados de recebimento; a proposta vira a leitura de documento; papel fora da lista cai; o campo proposto substitui e os outros ficam sem alerta.
- A tela registra o formulário (teste das telas de lançamento).
- E2E: a Cris abre em Fornecedores com o formulário do cadastro novo.

**Em aberto**

- **BW2-1.** A edição de um cadastro existente continua só pela tela. A Cris preenche o cadastro novo.

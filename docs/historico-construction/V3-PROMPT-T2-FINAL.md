# Prompt T2 — Ressarcimentos e Acerto Contábil: chat

**O que mudou**

- **Acerto Contábil, aba Vincular despesas.** A tela se oferece à Cris. Ela preenche data, conta, valor transferido, forma, favorecido e observação, e marca as despesas:
  - pelos números dos PEDs ditos ou digitados, aceitando o final do número ("1682" acha "EXM-2026-001682");
  - em lote, todas as despesas em aberto de um fornecedor.
  Cada despesa marcada entra com o saldo inteiro, que a pessoa pode ajustar. Número que não acha, ou que bate com mais de uma despesa, é avisado e não marca nada.
- **A confirmação é a da tela.** Nada é gravado pela Cris. Um aviso diz quantas despesas ela marcou e pede para conferir e clicar em **Concluir acerto**, que continua com todas as validações do servidor.
- **Ressarcimentos.** A janela "Registrar ressarcimento" se oferece à Cris: valor, data, conta bancária e comprovante. Quem registra é o **Confirmar**, com a mesma chave contra clique duplo.
- **A janela da Cris fica acima dos diálogos.** Antes ela ficava atrás do fundo escuro das janelas da tela.
- A base de conhecimento da Cris explica as duas telas.

**Regras mantidas**

- Nenhum dado alterado, nenhum acesso ampliado.
- O CPF e os dados bancários e de PIX do terceiro não vão ao formulário da Cris. O título do ressarcimento leva só o nome do pagador que já aparece na janela, como no seletor de pagador da Despesa (Prompt S3).

**Testes**

- Unidade: a marcação por PED inteiro, por final, ambíguo, inexistente, em lote e vazia.
- As duas telas registram o formulário (teste das telas de lançamento).
- E2E: a Cris abre no Acerto com o formulário "Acerto Contábil: pagamento e despesas a quitar".

**Em aberto**

- **BT2-1.** O ressarcimento em lote continua pelo botão da tela, com prévia. A Cris não monta o lote. Se o Thiago quiser o lote pela Cris, entra numa próxima rodada.

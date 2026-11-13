# Prompts AH2, AK2 e AF2 — Empresa, Auditoria e Numeração: chat

**Peça nova, para as telas renderizadas no servidor**

Os formulários de Empresa e de Auditoria são montados no servidor, com campos não controlados. Um componente pequeno, colocado dentro do formulário, registra os campos com a Cris. Quando ela propõe, ele escreve o valor em cada campo pelo nome. Campo de opção chega pelo rótulo e vira o valor da opção, e rótulo desconhecido cai. Quem grava ou filtra é o botão do próprio formulário.

**AH2 · Empresa**

- **Os dados fiscais se oferecem à Cris.** São 20 campos: nome fantasia, CNPJ, inscrições, regimes, item de serviço, código do município, CNAE, ISS, endereço com código IBGE, telefone e e-mail fiscal.
- **Ela lê o cartão CNPJ.** O cartão anexado na conversa vai para a Cris.
- **O ambiente de emissão fica à mão.** Homologação ou produção muda a validade fiscal da nota, então a Cris não mexe nesse campo.
- **Quem grava é o botão dos dados fiscais.**

**AK2 · Auditoria**

- **A tela ganha um filtro.** Os campos são usuário (ou "sistema"), entidade, trecho da ação e período, todos na URL. Antes não havia filtro.
- **A Cris preenche o filtro.** Por exemplo: "só o que a Ana lançou este mês". Ela recebe a data de hoje e o intervalo do mês. Quem filtra é o botão "Filtrar".
- O filtro roda no banco, sobre os 200 mais recentes do recorte.
- O mascaramento dos dados pessoais de compradores continua o mesmo.

**AF2 · Numeração**

- **A Cris vê a numeração atual e o maior número emitido.** Ela sugere e preenche prefixo, próximo número e dígitos.
- **Quem grava é o Salvar.** O recuo abaixo do maior emitido continua pedindo CONFIRMO.

**Regras mantidas**

- Nenhum dado alterado, nenhum acesso ampliado. O formulário da Cris só aparece para quem pode editar (Empresa e Numeração) ou ver (Auditoria).
- O filtro da Auditoria oferece à Cris os nomes dos usuários da empresa, que a tela já mostra na tabela.

**Testes**

- Unidade: a proposta vai pelo nome do campo, e opção desconhecida cai; os filtros da Auditoria descartam usuário de fora e data inválida; o intervalo do mês está certo.
- Integração: o filtro no banco por usuário, por "sistema", por entidade, por trecho da ação (sem diferença de maiúscula) e por período, e a lista de entidades.
- As telas registram o formulário, e a Empresa não oferece o ambiente de emissão.
- E2E: a Cris abre nas três telas com o formulário; a Auditoria tem o filtro, e o filtro por ação funciona.

**Em aberto**

- Nenhum.

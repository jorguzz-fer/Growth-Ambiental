# Prompt V2b — Medição de Projeto: chat por voz

**O que mudou**

- **A aba Nova medição se oferece à Cris.** O engenheiro fala no microfone do chat, por exemplo "medi trinta mil de estrutura em março", e a Cris preenche competência, grupo de obra, valor medido e observação.
- **A tela não muda.** O formulário é o mesmo, agora com os campos controlados para poderem ser preenchidos.
- **O que não dá para usar fica de fora, com aviso.** Competência fora de MM/AAAA, grupo que não está na lista da obra e valor zero ou negativo não entram, e a tela diz o porquê.
- **Quem lança é o botão "Lançar medição".** A validação do servidor e o aviso de duplicidade continuam os mesmos.
- A base de conhecimento explica o uso.

**Regras mantidas**

- A medição continua informação auxiliar, fora da DRE.
- O engenheiro continua vendo só as abas que já via. Nenhum acesso ampliado.

**Testes**

- Unidade: o formulário oferece os grupos da obra; a proposta vira os campos no formato da action, com a competência aceita pela validação do servidor; valores inválidos ficam de fora com aviso.
- A tela registra o formulário (teste das telas de lançamento).
- E2E: a Cris abre na Nova medição com o formulário.

**Em aberto**

- **BV2b-1.** Uma medição por vez. Ditar várias de uma vez (vários grupos no mesmo mês) fica para uma próxima rodada, se o Thiago pedir.

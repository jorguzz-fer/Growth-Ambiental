# Prompt Y2 — Estoque: painel com caixa de conversa

**Por que a baixa não foi vista**

A saída de material já existia (botão "↑ Dar baixa", com motivo e obra de destino). Ela ficava dentro da aba "Entradas & Saídas", e a tela abre na aba "Itens & Saldo". Quem não trocava de aba não via a baixa.

**O que mudou**

- **Atalhos no topo da tela.** "↓ Dar entrada" e "↑ Dar baixa (saída para obra)" aparecem ao lado das abas para quem pode lançar. Cada um abre a aba Entradas & Saídas com o formulário já no tipo certo.
- **Caixa de conversa no painel.** As perguntas prontas do painel continuam. Embaixo delas há uma caixa de texto: o que a pessoa escreve abre a Cris com a pergunta. O componente é genérico e pode ir para os outros painéis.
- **A Cris preenche o movimento.** Na aba Entradas & Saídas, a pessoa diz ou dita "baixa de 10 sacos de cimento para a obra A" e a Cris preenche tipo, material, quantidade, motivo, obra, despesa (só na entrada), data, documento e observação. O que não casa com o cadastro fica de fora, com aviso.
- **Quem registra é o botão da tela.** As validações do servidor continuam: lastro da entrada, obra de destino da baixa e confirmação quando o saldo fica negativo.
- **A Cris conhece o estoque.** Ela recebe os materiais ativos com saldo, mínimo e valor, e as sugestões mudam conforme a aba.
- A base de conhecimento explica os atalhos e o uso com a Cris.

**Regras mantidas**

- O estoque continua sem efeito contábil.
- Nenhum dado alterado, nenhum acesso ampliado. Os atalhos e o formulário só aparecem para quem pode criar movimento.

**Testes**

- Unidade: o formulário oferece materiais, obras, despesas e os dois tipos; baixa vira saída com motivo e obra; entrada aponta a despesa; motivo do tipo errado, material desconhecido e quantidade inválida ficam de fora com aviso.
- A tela registra o formulário (teste das telas de lançamento).
- E2E: o atalho de baixa aparece e abre o formulário na baixa; o painel tem a caixa de conversa; a Cris abre com o formulário do movimento.
- Para o e2e, um material de teste foi cadastrado só no banco local.

**Em aberto**

- Nenhum.

# Prompt AI2 — Usuários: telas sugeridas por papel e a restrição

**Telas sugeridas por papel**

- **Ao escolher o papel do usuário novo, a tela marca as telas que ele alcança por padrão.** A sugestão segue o padrão em vigor na empresa, incluindo a chave do padrão novo do membro.
- **Editável.** A pessoa desmarca ou marca outras telas antes de clicar em "Adicionar". Tela marcada a mais entra com ver, criar e editar. No contador, entra só com ver, porque ele é só leitura.
- **O que fica fora da lista:** telas só de owner e admin, telas só da plataforma, telas de dado sensível e telas que acompanham outra. Excluir e essas telas continuam na Gestão de Acessos, ação por ação.
- **O caminho de gravação é o da Gestão de Acessos.** Só o que difere do padrão do papel vira personalização, com as mesmas validações (matriz válida e teto de leitura do contador). Aceitar a sugestão não grava nada.
- **A Cris escolhe o papel e as telas.** Ela não recebe nome nem e-mail. Quem adiciona é o botão da tela.

**A restrição que "não funcionava" (BAI2-1)**

Não foi possível usar o usuário do cliente. Um teste de ponta a ponta reproduz o caso:
1. O owner cria um contador pelo formulário novo, sem a DRE.
2. O contador entra.
3. O script abre todas as telas do sistema, uma a uma, e compara o menu com o acesso.

O que o teste e a leitura do código acharam:

1. **Acerto Contábil aparecia no menu de quem a página nega.** O menu olhava só "ver Despesas", e a página exige editar Despesas e ver o Caixa. O contador via o item e caía em "Acesso negado". **Corrigido:** o item agora exige o mesmo que a página. Nenhum acesso muda, porque a página já negava.
2. **Readicionar quem já era membro mantinha as personalizações antigas.** O papel mudava, mas as telas personalizadas antes continuavam valendo. **Corrigido no formulário novo:** a escolha de telas substitui as personalizações antigas. A troca de papel na tabela já oferecia "manter ou voltar ao padrão".
3. **O padrão do membro com a chave desligada não restringe.** O membro alcança tudo fora de Configurações enquanto a chave "padrão novo do membro" estiver desligada. É a explicação mais provável do relato. A base de conhecimento e a tela de Usuários agora dizem como restringir. Ligar a chave é decisão da plataforma, com a prévia que já existe na Gestão de Acessos.
4. **Texto desatualizado na Gestão de Acessos.** A tela mandava ligar a chave em "Configurações → Chaves de mudança", que agora é só da plataforma. O texto foi corrigido.

Depois das correções, o teste confirma que, para o contador, toda tela do menu abre e toda tela fora do menu é negada, inclusive pela URL.

**Testes**

- Unidade:
  - owner e admin sem lista;
  - a sugestão do contador é o padrão dele;
  - a lista não oferece tela restrita;
  - aceitar a sugestão não grava nada;
  - desmarcar nega e marcar a mais dá o acesso certo;
  - a escolha enviada ignora id desconhecido.
- Integração:
  - aceitar a sugestão não grava nada;
  - desmarcar a DRE grava só a negação;
  - readicionar troca as personalizações;
  - sem o campo de telas, o convite fica como antes.
- Menu: o teste de não regressão agora inclui a exigência da página do Acerto.
- E2E: o formulário mostra as telas sugeridas. O script de restrição tem 6 verificações, todas passando:

```
node scripts/e2e/v3-restricao.mjs
```

**Em aberto**

- **BAI2-1.** Confirmar com o cliente qual papel e qual tela ele tentou restringir. Se for membro com a chave desligada, o caminho é desmarcar as telas ou ligar a chave.

# Prompt Z2 — Pessoas: o chat ajuda a cadastrar funcionário

**O conflito com a regra de privacidade**

A revisão pede que o chat ajude a cadastrar funcionário. A regra BE-2, mantida no prompt de arquitetura (E2), diz que dado pessoal de funcionário não vai ao modelo. As duas cabem juntas só se a Cris preencher o que não é dado pessoal.

**O que mudou**

- **A Cris preenche o vínculo de trabalho.** O formulário de novo funcionário se oferece à Cris com sete campos: cargo, setor, obra, tipo de contrato, prazo, admissão e observação.
- **O resto é à mão.** Nome, documentos, nascimento, filiação, endereço, jornada, salário e dados bancários não estão no formulário da Cris. A tela diz isso no aviso que aparece quando ela preenche.
- **Ela abre o formulário.** Se a pessoa pede pela Cris antes de clicar em "Novo funcionário", o formulário abre já com o vínculo preenchido.
- **Quem cadastra é o botão "Cadastrar".** As validações do servidor continuam as mesmas.
- A tela não manda nenhum resumo de funcionários para a Cris.
- A base de conhecimento explica o uso e o limite.

**Regras mantidas**

- BE-2: nenhum dado pessoal do funcionário vai ao modelo pelo formulário. O teste confere que nenhum campo do formulário cairia no filtro de dado pessoal da Cris.
- Equipes de Projetos já lista funcionários e parceiros: nada a mudar.
- Nenhum acesso ampliado.

**Testes**

- Unidade: o formulário só tem o vínculo de trabalho; a proposta vira os campos da ficha, com a obra como id e a admissão como AAAA-MM-DD; data ilegível fica de fora com aviso.
- A tela registra o formulário (teste das telas de lançamento).
- E2E: a Cris abre em Funcionários com o formulário do vínculo.

**Em aberto**

- **BZ2-1.** Se o Thiago quiser que a Cris preencha também nome e documentos (por exemplo, lendo a CTPS anexada), a regra BE-2 precisa de uma nova decisão para a tela de Funcionários.

# Prompt Q2 — INCC por empresa

**Decisão (18/10):** o INCC é um só por empresa. O seletor de obra sai da tela.

**Como ficou**

- **A série da empresa mora na mesma tabela.** A migração 0068 deixa o projeto da tabela do INCC aceitar vazio: linha sem projeto é a série da empresa, uma por mês. A migração não cria nem altera nenhuma linha.
- **BQ2-1, qual série vira a da empresa.** A pessoa escolhe. Na tela de INCC, o proprietário ou um administrador adota a série de uma obra como a da empresa. Se a empresa já tem série, a tela pede confirmação para substituir. A adoção é auditada com a série anterior.
- **As séries das obras ficam guardadas.** Adotar copia, não move. Nenhuma série de obra é alterada.
- **Atrás de chave, desligada.** A chave "INCC da empresa: uma série para todas as obras" nasce desligada. Com ela desligada, nada muda nos números: cada obra lê a própria série.
- **Com a chave ligada e uma série adotada:**
  - toda obra lê a série da empresa onde o INCC corrige as parcelas (Caixa, comparação da Projeção e Simulador);
  - a tela de INCC abre direto na série da empresa, sem seletor de obra;
  - a edição, a reprojeção, a marcação de projeção e a variante valem para a série da empresa;
  - editar a série guardada de uma obra é recusado, porque não mudaria nenhum número.
- **Ligada sem série adotada, nada muda.** Desligar volta às séries das obras.
- **Prévia da chave.** Na tela de chaves da plataforma, a prévia lista as obras cuja série difere da série da empresa. Para cada uma, mostra os meses com acumulado diferente, os meses que a empresa não tem e a maior diferença do acumulado.
- **A Cris na tela de INCC.** Ela recebe a tabela, a variante, a regra de correção e os meses sem índice oficial. Explica a correção e projeta na conversa pela média de 12 meses. Quem grava a projeção é o botão "Recalcular projeção".
- A base de conhecimento explica o INCC da empresa.

**Regras mantidas**

- Nenhum dado alterado. A série da empresa só existe depois da adoção, que é uma ação explícita.
- Nenhum acesso ampliado. Adotar exige editar Parâmetros e ser proprietário ou administrador.
- A correção continua aplicada na leitura. Nada é gravado corrigido.

**Para produção**

- A migração 0068 roda no boot, como as outras. Ela só relaxa uma restrição e cria um índice.
- Para usar: adotar a série na tela de INCC, conferir a prévia na plataforma e ligar a chave.

**Testes**

- Unidade: diferença entre séries iguais, diferentes e com mês faltando.
- Integração:
  - a chave ligada sem série adotada não muda nada;
  - o membro não adota;
  - o dono adota, e as séries das obras ficam iguais;
  - adotar de novo pede confirmação;
  - com a chave ligada, toda obra lê a da empresa, a edição vai para a série da empresa e a edição da série da obra é recusada;
  - desligar volta às séries das obras.
- E2E: a chave aparece com a prévia; a tela de INCC mostra o INCC da empresa; a Cris recebe a tabela.

**Em aberto**

- A importação da planilha do projeto continua gravando o INCC na série da obra. Com a chave ligada, isso não muda os números. Se o Thiago quiser, a importação passa a gravar na série da empresa.
- Buscar o índice oficial quando o mês fecha e escolher onde o INCC incide continuam como futuro, como na revisão.

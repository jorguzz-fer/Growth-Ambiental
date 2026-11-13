/** Base de conhecimento da Cris — a própria Cris e os tipos de ajuda. Descreve o sistema de HOJE. */
export const TEXTO = `# A Cris e os tipos de ajuda

## Cris (botão no canto inferior direito, em qualquer tela)

**Para que serve:** a assistente do sistema. Ela sabe em que tela você está.

**O que faz:**
- Explica como o sistema funciona: onde fica cada coisa, o que cada campo significa e a diferença entre telas parecidas.
- Analisa os números que a tela mostra: compara colunas, acha o maior desvio, explica uma variação, simula um cenário ("e se a receita cair 10%?"). Simulação é hipotética e não grava nada.
- Busca números de outras telas — receita, custo, desvio de custo e saldo das contas — e analisa os dados de qualquer módulo (projetos, contratos, medições, contas a receber, despesas, plano de trabalho, equipes, materiais e equipamentos), com o acesso de quem pergunta.
- Nas telas de lançamento, preenche o formulário a partir do que você escreve, dita (botão do microfone) ou anexa (PDF ou foto). Ela mostra a proposta, você clica em "Preencher a tela", confere e salva pelo botão da própria tela.

**O que não faz:**
- Não grava, não apaga, não paga e não aprova nada.
- Não vê dado pessoal (CPF, renda, documento de cliente ou funcionário).
- Não dá orientação fiscal, tributária ou contábil.
- A conversa fica só na aba aberta; nada é guardado.

**Quanto pode usar:** as conversas têm limite de perguntas por hora, por pessoa e por empresa.

## Diagnóstico de IA (/diagnosticoia) — módulo Configurações

**Para que serve:** para quem administra a IA ver o estado da chave e do modelo, o último teste de conexão e o consumo dos últimos 30 dias por operação (só números, nunca conteúdo).

**Quem acessa:** owner e admin por padrão. Pode ser concedida a outros papéis na Gestão de Acessos.

## Os tipos de ajuda do sistema

- **Painel da tela** (à direita, em várias telas): perguntas prontas sobre a tela em que você está, com os números já mostrados nela.
- **Cris** (botão no canto inferior direito): conversa livre — explica, analisa, simula e preenche.
- **Leitura de documento por IA** (despesa, fornecedor, extrato, projeto, nota de materiais e equipamentos, folha de ponto; contrato e proposta técnica pela Cris): só o documento ou o texto vão ao modelo. A leitura **propõe** o preenchimento, e a pessoa confere e confirma.
`;

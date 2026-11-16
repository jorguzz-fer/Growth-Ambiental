# Prompt N2 — Simulador

**Liberado pelo dono em 18/10, antes da conferência do Thiago.** O que a revisão pedia, pela reunião:
- O Simulador "descaracterizou": deixou de ser o simulador da planilha do cliente.
- É um simulador de parcelamento de sinal e entrada, para o vendedor ter a visão antes de vender e passar ao cliente.
- O chat ajuda a fazer um relatório para o cliente final.

**O que foi comparado.** O protótipo original (no `growth-tools-construction.zip`) é o simulador da planilha:
- ato de assinatura, três sinais e duas anuais;
- mensais à construtora corrigidas pelo INCC, FGTS, subsídio e financiamento do banco;
- cinco números, o comprometimento de renda em % e um fluxo de sete colunas com a evolução da obra.

O Prompt N corrigiu os cálculos, mas trocou a cara da tela pela de uma calculadora técnica, com termos de banco, nove colunas e avisos longos.

**O que mudou**

- **A tela volta ao jeito da planilha.**
  - Os campos têm os nomes do cliente: ato de assinatura, sinais, anuais, nº de mensais e financiamento do banco.
  - São cinco números: valor do imóvel, ato e sinais, anuais/FGTS/subsídio, financiamento e saldo em mensais.
  - O comprometimento de renda volta em % (maior mensal sobre a renda, limite de 30%).
  - O fluxo tem sete colunas, com a barra de evolução da obra.
  - Parcela base, correção e juros ficam em "Detalhar".
  - O campo de juros só aparece no SAC e no PRICE.
- **Os cálculos do Prompt N ficam.** O veredito continua pela maior mensal, o SAC continua sem parcela negativa, cada pagamento continua com o seu mês e a correção INCC continua a partir da 5ª. Os testes do cálculo não mudaram.
- **Unidade.** Um seletor opcional traz o valor da unidade disponível da versão Atual. A unidade não é reservada.
- **Proposta ao cliente.**
  - Abaixo do fluxo aparece a proposta de pagamento: empresa, obra, unidade, valor, o plano (o que paga e quando, com o total), a mensagem, a validade e o fluxo.
  - "Gerar PDF da proposta" imprime só a proposta. Renda, limite, campos e painéis ficam fora do papel.
  - O nome do cliente é digitado ali e sai só no PDF.
- **Com a Cris.**
  - O vendedor dita a simulação ("simule 90 mensais com ato de 30 mil") e a Cris preenche os campos.
  - Ela escreve a mensagem da proposta, que a pessoa lê e ajusta antes de gerar o PDF.
  - A Cris conhece a simulação (plano, mensais, correção, juros) sem a renda e sem o cliente.
- **Correção geral no PDF.** A moldura do app tinha altura fixa, e o PDF de qualquer tela cortava na primeira página. Agora a impressão solta a altura: a proposta de 90 mensais sai em 5 páginas, com o cabeçalho da tabela repetido. Isso vale também para a DRE, o Fluxo e os outros relatórios com "Exportar PDF".
- A base de conhecimento da Cris explica a tela nova.

**Regras mantidas**

- Continua calculadora (BN-1): nada é gravado.
- BE-2: a renda e o cliente não vão ao modelo. O teste confere que o resumo da Cris não tem renda nem limite.
- A renda do cadastro continua só para quem tem a permissão de dados do cliente (BN-3).

**Testes**

- Unidade: o plano da proposta soma o fluxo mais o financiamento; sem correção nem juros, o plano fecha no valor do imóvel; a Cris não recebe renda nem cliente; o formulário da Cris não tem renda; o que a Cris propõe vira os campos, e o inválido fica de fora com aviso.
- Os testes do cálculo e do painel do Simulador continuam passando sem mudança.
- E2E: os cinco números, o comprometimento em %, o plano na proposta, a proposta sem renda nem limite e a Cris conhecendo a simulação.
- O PDF da proposta foi gerado no navegador de teste e conferido página a página.

**Em aberto**

- **BN2-1 · conferência do Thiago.** A tela foi refeita pelo protótipo original e pela reunião. Falta o Thiago confirmar com a planilha do cliente, principalmente estes pontos:
  - se o padrão deve ser SAC ou SBPE;
  - se as mensais à construtora têm juros;
  - se o percentual de entrada conta só ato e sinais, ou também as anuais.
- O INCC aparece como 0% nos meses além da tabela da obra (48 meses). É o comportamento de antes. A projeção do INCC por mais meses é outra conversa.

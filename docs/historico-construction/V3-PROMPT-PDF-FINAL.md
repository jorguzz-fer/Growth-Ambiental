# Prompt PDF · Exportar relatório em PDF — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Base para o PDF do Dashboard
(AA2) e das outras telas de relatório.

## O que mudou

- **Botão "Exportar PDF"** na DRE, na DRE Analítica, no Fluxo de Caixa e no
  Fluxo de Caixa Analítico. Ele abre a impressão do navegador já com o nome
  do arquivo sugerido (relatório, escopo e período). A pessoa escolhe "Salvar
  como PDF".
- **O PDF sai limpo.** Ficam fora o menu, o cabeçalho do app, a Cris, os
  seletores e os botões. Ficam o título, o escopo e o recorte da tela, e os
  números como estão na tela.
- **Faixa da empresa só no PDF:** nome da empresa e "Gerado em … por …", no
  horário de Brasília.
- Página A4 com margem. Linha de tabela não quebra no meio, e o rolamento
  horizontal das tabelas vira tabela inteira.

## Premissas

- **BPDF-1** (PDF no servidor ou pelo navegador; cabeçalho da empresa?)
  segue sem resposta. O caminho escolhido é o do navegador. Não pede
  dependência nova nem um Chromium no contêiner de produção, que já tem
  memória justa (ver `next.config.ts`), e o PDF é exatamente o que a pessoa
  vê. Se a decisão for gerar no servidor (para mandar por e-mail, por
  exemplo), o cabeçalho e a folha de impressão continuam servindo.
- O logo da empresa não entra no PDF, porque a imagem vem do armazenamento
  com endereço temporário. Entra o nome.
- Linhas recolhidas na tela saem recolhidas no PDF. Para levar tudo, use
  "Abrir até a conta" antes.

## Acesso e dados

Nada muda. O PDF tem só o que a tela já mostra a quem a abriu.

## Testes

- Os quatro relatórios foram gerados em PDF pelo navegador no ambiente
  local. Cada um saiu com a faixa da empresa, o título e o recorte, sem
  menu, seletores e Cris.
- e2e: o botão existe, a faixa fica escondida na tela, e na mídia de
  impressão a faixa aparece e os botões somem.

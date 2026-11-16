# Prompt VOZ · Entrada por voz — relatório final

Fase 3, Bloco 0. Executado em 18/10/2026, junto com o E2.

## O que mudou

Botão de microfone na caixa de mensagem da Cris (`cris-voz.tsx`). A pessoa
fala, o texto ditado entra na caixa, ela confere e envia. Daí em diante o
caminho é o do texto digitado: nas telas de lançamento a Cris propõe o
preenchimento, e a pessoa salva pelo botão da tela. Vale em todas as telas,
porque a Cris está em todas (BV2-2).

## BV2-1 (decidido no prompt)

- A transcrição é do **navegador** (Web Speech API, pt-BR). Nenhum áudio
  passa pelo servidor do app nem vai ao modelo da Cris; só o texto, depois de
  a pessoa enviar.
- No Chrome e no Edge o reconhecimento roda no serviço de fala do fabricante
  do navegador. Se o dono preferir que o áudio não saia do aparelho, a troca
  é por transcrição no servidor, num prompt próprio.
- Navegador sem suporte (Firefox): o botão não aparece.

## Limitações

- Não testado em navegador com microfone neste ambiente. O botão é
  verificado no roteiro e2e só pela presença.

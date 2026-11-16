# Prompt AG — PR 3: enviar e acompanhar a nota

Terceira parte do emissor de NFS-e (Focus NFe). Aqui a nota **sai do sistema**:
o envio, a consulta da situação e o reenvio manual quando o envio não chegou.
O cancelamento e a cópia do PDF/XML para o nosso armazenamento vêm na PR 4.

## Como funciona, para quem usa

1. Na nota (rascunho ou rejeitada), aparece **Conferir e enviar →**. Se algo
   impede o envio, aparece a lista do que falta no lugar do botão. Exemplos:
   cadastro da empresa incompleto, sem permissão, token da Focus não
   configurado, ou empresa diferente de `NFSE_TENANT_ID`.
2. **Conferir e enviar** mostra exatamente o que vai na nota: prestador,
   tomador, município de prestação, natureza da operação, item da LC 116 e
   valores. Os números são os mesmos que vão para a Focus.
3. O envio só sai com a caixa **"Conferi…"** marcada. Em produção, a frase
   diz que a nota terá valor fiscal.
4. Depois do envio, a nota fica **Processando**. Ela não se atualiza
   sozinha: o botão **Atualizar situação** consulta a Focus.
5. Autorizada: aparecem o número, o código de verificação e os links do PDF
   e da prefeitura. Os links do provedor só são mostrados se forem `https`.
6. Rejeitada: aparece a mensagem da prefeitura. A nota volta a ser editável e
   o próximo envio usa uma **nova referência**.

## Por que não há nota em dobro (seção 3)

- A tentativa, a referência (`ref`) e a situação "processando" são gravadas
  numa transação **antes** de chamar a Focus. A chamada é feita fora da
  transação.
- No duplo clique, o segundo pedido encontra "processando" e para. Teste: dois
  envios simultâneos resultam em **uma** chamada à Focus.
- Sem resposta (rede, 5xx, 408, 429), a nota **fica processando**. O sistema
  nunca reenvia sozinho.
- **Rejeição só vale se a consulta confirmar.** Quando o envio volta com erro,
  o sistema pergunta à Focus. A nota só vira rejeitada se a Focus não tiver
  nota nessa referência, ou confirmar o erro. Se a consulta disser
  "processando" ou "autorizada", vale a consulta. Se a consulta não responder,
  a nota continua processando. Rejeitada libera uma nova tentativa, por isso
  ela nunca é marcada por engano.
- **A consulta só vale com HTTP 2xx ou 404.** Um 401 ou 403 (token errado ou
  trocado) ou um 5xx não diz nada sobre a nota e não muda a situação.
- **Reenviar (mesma referência)** é manual e serve para o envio que não
  chegou. Antes de reenviar, o sistema consulta: se a Focus já tiver a nota,
  nada é reenviado. Também não reenvia no primeiro minuto depois de um envio.
- Resposta atrasada de uma tentativa antiga (outra `ref`) vira só histórico.
  Nenhuma situação volta atrás.

## Ambiente

- O rascunho nunca enviado sai no ambiente **atual** da empresa (Configurações
  → Empresa).
- A rejeitada fica no ambiente em que foi tentada. Se a empresa trocou de
  ambiente nesse meio-tempo, o sistema pede uma nota nova, para não misturar
  teste com nota de verdade.

## Permissões

- Enviar e reenviar: **"Emitir nota fiscal (NFS-e)"** (`notaemitir`). Nasce
  só com proprietário e administrador e pode ser concedida em Gestão de
  Acessos.
- Atualizar situação: `notaemitir` ou editar Notas Fiscais.
- O contador vê a nota, mas não envia.

## Privacidade e auditoria

- Auditoria: `nfse.enviar` (ambiente, ref, valor do serviço), `nfse.reenviar`
  (ambiente, ref) e `nfse.situacao` (de, para, ref). **Nenhum dado do tomador.**
- A resposta crua da Focus fica no histórico da própria nota, para
  diagnosticar a rejeição. Ela não vai para o log de auditoria.

## BAG-2 continua valendo

O teste conta conta a receber, despesa e caixa antes e depois de enviar e
autorizar. Nada muda.

## Testes

- `src/lib/actions/notas-servico-envio.test.ts` (banco real, Focus simulada):
  - autorização, com a ref já gravada no momento da chamada;
  - duplo clique;
  - sem resposta;
  - reenvio manual;
  - rejeição confirmada e não confirmada;
  - token errado (401);
  - nova tentativa com nova ref;
  - bloqueios sem nada gravado.
- `src/lib/nota-servico.test.ts`: as regras puras (ambiente, bloqueios, sem
  resposta, consulta sem valor, mensagem, data de emissão, link seguro).

## Mudança pequena fora da tela

`fiscal/focus.ts` agora devolve o código HTTP da resposta (`http`). É o que
separa "não sei se chegou" de "foi recusada". O resto do cliente não mudou.

## Próximo passo (PR 4)

Cancelamento: permissão própria, motivo escrito e confirmação digitando o
número da nota; o registro é preservado. Também a cópia do PDF e do XML para
o armazenamento, com a marca de homologação no nome do arquivo.

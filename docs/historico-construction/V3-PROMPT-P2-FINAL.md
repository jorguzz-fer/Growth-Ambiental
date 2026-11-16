# Prompt P2 · Permuta: documentos e foto do ativo, e a Cris — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Pedido: "upload de documento e
foto do ativo" e o chat. Os documentos do ativo já existiam (Prompt P, seção
6): matrícula, laudo, contrato e recibo, com versão por tipo.

## O que mudou

- **Foto do ativo.** Novo tipo de documento, "Foto do ativo". A foto aparece
  em miniatura na lista de documentos. Como nos outros tipos, cada foto nova
  vira a versão seguinte, e as anteriores ficam guardadas.
- **A Cris preenche o ativo**, novo ou em edição, a partir de texto, ditado,
  laudo, contrato ou foto. Ela preenche:
  - unidade de origem, data de recebimento, tipo, descrição e valor
    estimado;
  - status e os dados da revenda (data, valor, forma);
  - tipo permuta e observações.
- **Quem grava é Salvar.** A faixa de "Lançamento assistido" que já existia
  mostra o que foi preenchido.
- Os campos soltos do formulário recebem a proposta como semente: o que já
  estava digitado continua, e o que a Cris trouxe entra por cima.

## Premissas

- O cliente fica de fora da proposta: o nome não vai ao modelo, e a pessoa
  escolhe na lista.
- Anexar a foto e ler a foto são passos separados. Anexar guarda o arquivo no
  ativo. Mandar a foto à Cris (pelo clipe do chat) é para ela preencher o
  formulário, e o arquivo não fica guardado por isso.

## Acesso e dados

Nada muda. O servidor aceita o tipo novo de documento na mesma validação.

## Testes

- `src/lib/cris-formularios-telas.test.ts`: o formulário do ativo se
  oferece à Cris, e "Foto do ativo" está entre os tipos de documento.
- e2e: em Novo ativo de permuta, a Cris abre com o formulário.

**Não verificado:** a leitura da foto contra o modelo real (sem chave da API)
e o anexo da foto (sem armazenamento R2 neste ambiente).

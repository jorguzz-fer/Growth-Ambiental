# Prompt M2 · Clientes: perfil da base (o cadastro por foto espera) — relatório final

Fase 3, revisão V5. Executado em 18/10/2026, em parte. O pedido tinha duas
partes: cadastro do cliente por foto do documento, e o perfil da base de
clientes.

## O que mudou

- **Perfil da base** no topo de Clientes, recolhível. Mostra quantos
  clientes há por situação do contrato, finalidade, faixa etária, cidade e
  "como conheceu", e quantos têm unidade.
  - São só contagens, de campos que não são sensíveis.
  - Grupo com menos de 3 clientes entra em "Outros", para ninguém ser
    reconhecido pelo número.
  - Renda, FGTS, score, documento e contato não entram.
- **A Cris analisa o perfil** ("qual canal mais trouxe clientes?"). Ela
  recebe o mesmo resumo agregado.

## O que não entrou, e por quê

- **Cadastro por foto do documento.** A regra de privacidade em vigor (BE-2,
  01/10, mantida pelo E2) diz que dado pessoal, inclusive documento, não vai
  ao modelo. Uma foto de RG ou CNH do cliente é exatamente isso.
  - **BM2-1** ("foto de documento pessoal do cliente vai ao modelo?") segue
    sem resposta e é decisão do dono.
  - Pelo mesmo motivo, a Cris não preenche a ficha do cliente por texto ou
    ditado: o que a pessoa ditasse (nome, CPF, renda) iria ao modelo.
  - Com a resposta, a leitura entra como as outras (proposta no formulário;
    quem grava é o botão), com a política de retenção do provedor descrita na
    decisão.

## Acesso e dados

- O perfil aparece para quem já abre Clientes, e só com contagens.
- Nada é gravado.

## Testes

- `src/lib/perfil-clientes.test.ts` (novo): idade pelos dois formatos de
  data, a faixa etária, o agrupamento em "Outros" e o teto, e o perfil sem
  nome, documento, renda ou contato.
- e2e: Clientes mostra o perfil da base.

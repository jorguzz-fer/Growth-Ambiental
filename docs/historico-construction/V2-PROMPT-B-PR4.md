# Prompt B · PR B-4 — Assistente IA da tela de Projetos

Seções 24–29. Nenhum dado é alterado pelo assistente: ele analisa, aponta e
propõe; gravar é o Salvar do usuário.

## Visão "Todos" — somente leitura (27–28)
- Coluna à direita (desce para baixo em telas estreitas), recolhível por
  usuário. **Dica da IA**: uma frase contextual (sem classificação →
  inconsistências → cadastro incompleto → sem documentos → tudo em ordem).
- Ações: **Completar cadastro** (datas, valores, custos, endereço, município),
  **Revisar inconsistências** (duração ≠ datas, fim < início, funding abaixo
  do global, município sem IBGE, período de planejamento `mes_inicial`/
  `mes_final` não preenchido — só apontado, seção 48), **Analisar funding**,
  **Projetos sem documentos**, **Sem classificação**. Cada item leva à obra.
- A lista analisada é a do contexto do servidor (`ctx.projects`), nunca ids
  do cliente (28). Análise em `src/lib/projeto-analise.ts` (puro).

## Visão de um projeto — propõe, você confirma (25–26, 29)
- As mesmas análises, só desta obra. **Comparar orçado x realizado**: frases
  de leitura do card (receita/custo/resultado com a semântica da cor).
- **Extrair dados de documentos**: escolhe um documento desta obra (PDF ou
  imagem), a action `proporDadosDoProjetoPorDocumento(projectId, documentId)`
  valida **no banco** que o documento é do tenant **e** do projeto em tela,
  exige `editar` (sem ela a proposta não poderia ser aplicada), lê o arquivo
  do R2 e devolve uma **proposta campo a campo** (só o que foi lido e difere
  do cadastro; "conferir" quando a IA teve baixa confiança). O usuário marca
  o que quer e clica em "Aplicar ao formulário": os campos entram no
  formulário da obra com um aviso "nada foi gravado ainda"; o **Salvar** do
  usuário grava pela mesma `updateProject`, com `origem: "assistente"` no log.
  Proposta recusada não grava nada. A IA nunca muda status, cliente, datas,
  valores ou documentos por conta própria.
- Sem `ANTHROPIC_API_KEY` a ação diz que não está configurada; sem
  documento legível, idem. Campos lidos: nome, endereço, CEP, município, UF,
  datas, valores e custos, proprietário e forma de pagamento do terreno.

## Arquivos
`projeto-analise.ts` (+ teste, 5), `ai/projeto-doc.ts` (contrato e proposta,
puro), `ai/projeto-extract.ts` (conversa com a IA), `actions/projetos-assistente.ts`
(+ teste com banco, 3: documento de outro projeto e de outro tenant recusados,
ilegível recusado, sem permissão recusado, nada gravado), `assistente-projetos.tsx`,
`project-manager.tsx` (aplica a proposta no formulário; Salvar com origem),
`projeto/page.tsx` (análise no servidor; layout com o painel).

## Validação
Suíte 157 arquivos / 1486 testes; `tsc`, `eslint`, `next build`. Navegador:
painel nas duas visões com selo certo, dica, ações abrindo; proposta simulada
entra no formulário sem gravar, Salvar grava com `origem: "assistente"` no log
(conferido no banco). Dados da obra local e o log de teste revertidos.

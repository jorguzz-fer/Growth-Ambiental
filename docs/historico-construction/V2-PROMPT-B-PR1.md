# Prompt B · PR B-1 — regras, actions `{ ok, error }`, CEP e exclusão protegida

Primeira entrega de código do Prompt B. Nenhum dado existente é alterado.

## O que entra
- **Migração 0062** (`0062_project_cep.sql`, com `down/`): coluna `project.cep`
  (texto, anulável). Só isso.
- **`src/lib/projeto-regras.ts`** (puro, 17 testes): duração derivada das datas
  (`duracaoDerivada`, Prompt I 55) e aviso de divergência (`avisoDeDuracao`);
  `recusaDasDatas` (fim < início); valor global e entrada financeira (regra
  atual, só copiada para o aviso); `avisoDeFunding` (soma < global; "não
  informado" ≠ zero); `avisoDeMunicipio` (nome sem IBGE); CEP e coordenadas
  (normalização e recusa); `avisoDeCoordenada` (obra com ponto); inventário e
  `recusaDaExclusao` (nome digitado, nunca o último).
- **Actions** (`actions/projects.ts`): todas devolvem `{ ok, error }`
  (`id` na criação, `aviso` "Nada mudou."). `createProject` recusa fim < início
  e **preserva** o provisionamento de versões e INCC. `updateProject` aceita
  `endereco`, `cep`, `latitude`, `longitude`; recusa fim < início **só quando o
  patch mexe nas datas** (cadastro antigo continua editável); aceita
  `{ origem: "assistente" }` e grava isso no log. `inventarioDoProjeto` (leitura).
  `deleteProject(id, nomeDigitado)` confere o nome no servidor e grava o
  inventário no log; a exclusão em si não muda. `uploadProjetoDoc` devolve o id;
  `deleteProjetoDoc` guarda `filename`, `storageKey`, `tipo` e `projectId` no log
  e só remove documento de projeto.
- **Consultas novas** (todas com `tenant_id`): `getDocumentsByProjects` (só
  `project_id IS NOT NULL`; `getDocuments` não muda) e `getInventarioDoProjeto`
  (contagens por versão do projeto e por `project_id`).
- **Página**: documentos de projeto com URLs assinadas em paralelo.
- **Tela** (mínimo para as novas assinaturas; o redesenho é o B-2): mensagens de
  sucesso/erro ao criar e salvar; botão "Excluir…" longe do Salvar, abrindo o
  diálogo `excluir-projeto.tsx` (inventário + nome digitado); documentos com
  mensagem de resultado.

## Testes
- `projeto-regras.test.ts` (17) e `actions/projetos-b.test.ts` (7, com banco):
  criação com **dia 25** no início e no fim volta igual (44); fim < início
  recusado na criação; sem permissão devolve erro; cadastro antigo inválido
  continua editável e a regra vale ao mexer nas datas; CEP/coordenadas; origem
  assistente no log; documentos só de projeto e log da remoção; exclusão com
  inventário, nome conferido, outro tenant vê zeros, último projeto recusado.
- Suíte: 153 arquivos / 1470 testes; `tsc`, `eslint`, `next build` limpos.
- Navegador: criar obra, abrir "Excluir…", botão travado até digitar o nome,
  exclusão com inventário no log; projeto de teste e seus logs removidos.

## O que não muda
Regras de exclusão (física, cascata); `getDocuments`; `setActiveProject`;
`duration_months`/datas/`status` de projeto existente; nenhum `audit_log`.

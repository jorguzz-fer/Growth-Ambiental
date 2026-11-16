# Prompts AK (Parte 1) e AI (Partes 0 a 3) · relatório

## AK Parte 1 — as 8 ações que gravavam sem rastro

| Função | Ação no log | O que vai no `meta` | Transação |
|---|---|---|---|
| `addBankAccount` | `contaCorrente.create` | banco, agência, conta, tipo | não havia — nenhuma criada |
| `addReembolso` | `reembolso.create` | projeto, versão, valor, data | não havia |
| `addPermuta` | `permuta.create` | projeto, versão, unidade, tipo, valor estimado | não havia |
| `toggleConciliado` | `conciliacao.flag` | data, descrição, valor, novo estado | não havia |
| `pairMovimento` | `extrato.pair` | o movimento, o alvo (tipo e id), se o movimento foi reaproveitado | não havia |
| `deleteStockItem` | `estoque.item.delete` | nome, SKU, unidade, categoria, custo, **saldo** e quantas movimentações caíram junto | não havia |
| `saveIncc` | `incc.save` | projeto e **de → para de cada taxa** (mensal e acumulada) alterada | **dentro** da transação existente |
| `setDefaultVersion` | `version.setDefault` | projeto, versão anterior → nova | **dentro** da transação existente |

- **Nenhuma muda o que grava (1.2).** O que entrou foi só `.returning()` (para
  ter o id) e, na exclusão física do item de estoque, um `SELECT` antes do
  `DELETE`, porque depois dele o registro não existe mais.
- **Transação (1.3):** `logAudit` ganhou um executor opcional; onde já havia
  transação, o log entra nela. Onde não havia, nenhuma foi criada — pendência
  registrada, como pede o prompt.
- **Sem evento vazio:** `incc.save` não registra quando nada mudou; a
  comparação é na escala da coluna (4 casas), senão o acumulado recalculado em
  ponto flutuante geraria "mudança" a cada salvamento.
- **Teste de integração** (`ak-parte1.test.ts`, Postgres) executa 7 das 8 ações
  e confere o dado gravado e o log. `pairMovimento` ficou coberto só por tipo
  (depende de extrato + conciliação completa).

### Encontrado no caminho — corrigido em commit próprio

`saveIncc` gravava a INCC de **qualquer projeto** cujo id recebesse (as funções
vizinhas já checavam o tenant), e `toggleConciliado` atualizava lançamento de
caixa **só pelo id**. Os dois passam a exigir o tenant do contexto. Só
restringe.

## AI Parte 0 — piso de papel

Já implementada pelo **AJ Parte 3** (mesmo mecanismo, `TELAS_SO_ADMIN`):
Usuários e Gestão de Acessos negadas a quem não é owner/admin, depois do merge
dos overrides. Diagnóstico de produção: só um membro (Construtora Piloto) seria afetado — a
decisão foi **promovê-lo a admin** antes do deploy.

## AI Parte 1 — senha provisória e sessão

**Migração `0041_senha_provisoria`** (aditiva, com `down`): `user.must_change_password`
(default `false`) e `user.password_changed_at` (nula). **Ninguém é afetado pelo
deploy**: nenhuma senha é marcada provisória e nenhuma sessão cai.

- **1.1** — convite com senha inicial e **toda** redefinição pelo admin marcam a
  senha como provisória. A troca pela própria pessoa limpa a marca.
- **1.2** — com a marca, o layout manda para **`/trocar-senha`** antes de
  qualquer tela. Não há como escapar navegando.
- **1.3** — redefinir senha grava `password_changed_at`; o JWT passa a carregar o
  instante do **login** (`authAt`, que não é renovado na reemissão do token), e
  `getActiveContext` recusa sessão aberta antes da troca. Quando a própria pessoa
  troca a senha, **a sessão dela continua** (é renovada) e **as outras caem** —
  inclusive a de quem tenha entrado com a senha provisória.
- **Sessão encerrada tem tela própria**: antes, quem ficava sem contexto via
  "Banco vazio… rode node seed.mjs".
- **1.4** — convite com senha de 1 a 7 caracteres é **recusado** (antes criava o
  usuário sem senha, sem erro). `invite` devolve `{ ok, error }` e as telas
  Usuários e Contabilidade mostram a mensagem.
- `changePassword` devolve `{ ok, error }` (antes lançava exceção, que em
  produção chega sem texto) e recusa senha nova igual à atual.
- A tela Usuários mostra o selo **"senha provisória"**.

## AI Parte 2 — MFA

**Não implementada**, por decisão (3.3): o MFA liga antes do Emissor de NFS-e.
Inclui o 2.1 (quem ativou o MFA voluntariamente passar a ser cobrado): ligar isso
sem o destravamento do 2.3 pode deixar alguém fora da conta.

## AI Parte 3 — `changeRole`

- **3.1** — promover a owner pede confirmação na tela.
- **3.2** — ninguém altera o próprio papel (a action recusa; o seletor da própria
  linha fica desabilitado).
- **3.3** — `changeRole` e `removeMember` rodam em transação com
  `SELECT … FOR UPDATE` nas linhas de vínculo do tenant. Teste: dois
  rebaixamentos simultâneos de owners não deixam a empresa sem dono.
- **3.4** — quem tem telas personalizadas: a tela pergunta **manter** ou **voltar
  ao padrão do papel novo** antes de aplicar. Nada é limpo em silêncio; o log
  guarda o que foi descartado; chaves órfãs ficam.
- **3.5** — uma lista de papéis só (`src/lib/papeis.ts`); a criação oferece a
  mesma lista sem owner, e a action não aceita owner por convite.

## Verificação

- `ai-partes-1-3.test.ts` (unitário + integração com Postgres): revogação de
  sessão, papéis, auto-alteração recusada, papel inválido, manter/descartar
  personalizações com chave órfã preservada, **concorrência do último owner**,
  marcas da redefinição de senha, convite com senha curta recusado, convite não
  entrega owner.
- Navegador (build de produção + Postgres local):
  1. a Maria entra;
  2. o admin redefine a senha dela → selo "senha provisória";
  3. a sessão antiga da Maria → "Sua sessão foi encerrada";
  4. um "intruso" entra com a provisória e a Maria também → os dois caem em
     `/trocar-senha`;
  5. a Maria troca → segue navegando normalmente;
  6. a sessão do intruso → encerrada;
  7. o seletor do próprio papel fica desabilitado;
  8. promover a owner pede confirmação.
- Migração 0041: aplicar, `down`, reaplicar — ok.

## Atualização — Prompt AL (01/10/2026)

- A tela Contabilidade saiu; o convite e a mensagem de erro ficam só em
  Usuários.
- BAK-2: o Log de Auditoria (`acoes`) continua sendo a única tela de Config no
  padrão do contador. Isso agora é ajustável por membro em Gestão de Acessos,
  sempre só leitura.

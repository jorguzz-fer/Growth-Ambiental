# Growth Ambiental

ERP SaaS multi-tenant de **gestão financeira, FP&A e BI para consultorias
ambientais, de arqueologia e de patrimônio cultural** — Tools for Growth (TFG).
Derivado do Growth Tools · Construction (mesma base técnica), em stack de
produção para deploy em **VPS + Coolify**.

- Módulo de Contratos e Aditivos: [`docs/MODULO_CONTRATOS_ADITIVOS.md`](./docs/MODULO_CONTRATOS_ADITIVOS.md)
- Auditoria de dados herdados: [`docs/AUDITORIA_SANITIZACAO.md`](./docs/AUDITORIA_SANITIZACAO.md)

- Especificação funcional: [`docs/SPEC.md`](./docs/SPEC.md)
- Stack e roadmap de produção: [`docs/STACK.md`](./docs/STACK.md)
- Emissão de NFS-e (cadastro fiscal, cálculo e provedor): [`docs/EMISSAO-NF.md`](./docs/EMISSAO-NF.md)
- Leitura de documentos por IA (subir NF/cupom/comprovante e preencher o formulário, com alerta nos campos duvidosos): [`docs/LEITURA-DOCUMENTOS-IA.md`](./docs/LEITURA-DOCUMENTOS-IA.md)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend + Backend | Next.js 15 (App Router, RSC) + TypeScript |
| UI | Tailwind CSS v4 + componentes shadcn-style |
| Banco | PostgreSQL 16 + **Drizzle ORM** |
| Auth | Auth.js (NextAuth v5) + adapter Drizzle |
| Storage | Cloudflare R2 (S3-compatível) — *Fase 3* |
| Open Finance | Pluggy — *Fase 4* |
| Deploy | Docker (standalone) + Coolify + Traefik |

## Status — roadmap (docs/STACK.md §7)

- **Fase 0 — Scaffold ✓**: Next.js 15 + Tailwind + Drizzle + Auth.js + Dockerfile.
- **Fase 1 — Modelo de dados ✓**: schema Drizzle completo + migrações + seed.
- **Fase 2 — Receitas ✓**: app shell (sidebar, seletor de projeto/versão),
  Unidades, Projeção, Consolidado, Simulador, Parâmetros/INCC, Reembolso, Permuta.
- **Fase 3 — Despesas ✓**: Plano de Contas, Fornecedores & Stakeholders,
  Lançamentos de Despesas; storage R2 (presigned URLs).
- **Fase 4 — Caixa & Open Finance ✓**: Caixa (lançamentos, conciliação,
  previstas); cliente Pluggy + worker de sincronização.
- **Fase 5 — Reports ✓**: Dashboard multi-versão, DRE, Fluxo de Caixa, Medição
  de Obra (imprimível CEF), Rolling Forecast, Resumo Executivo.
- **Fase 6 — Config & multi-tenant ✓**: Usuários & Acessos (RBAC), Acesso
  Contabilidade (somente-leitura), log de auditoria.

A lógica de cálculo do protótipo está portada em `src/lib/calc/` (projeção,
totais, INCC, simulador SAC/PRICE) com **17 testes de paridade**.

> Login (Auth.js) tem o adapter Drizzle pronto; habilitar um provider
> (e-mail/OAuth) é passo de operação. RBAC, versões e auditoria já funcionam.

## Desenvolvimento

```bash
# 1. dependências
npm install

# 2. variáveis de ambiente
cp .env.example .env.local      # preencha DATABASE_URL e AUTH_SECRET

# 3. banco (precisa de um Postgres rodando)
npm run db:generate             # gera migrações a partir do schema Drizzle
npm run db:migrate              # aplica no banco

# 4. app
npm run dev                     # http://localhost:3000
```

### Scripts úteis

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `start` | Build e execução de produção |
| `npm run typecheck` | Checagem de tipos (tsc) |
| `npm run lint` | ESLint |
| `npm run test` | Testes (Vitest) — **pula os de integração se não houver `DATABASE_URL`** |
| `npm run test:db` | Suíte completa; **recusa rodar sem `DATABASE_URL`** |
| `npm run test:all` | `typecheck` + `lint` + `test:db` — é o portão de qualidade |
| `npm run db:generate` | Gera migrações Drizzle |
| `npm run db:migrate` | Aplica migrações |
| `npm run db:seed` | Cria a empresa de **demonstração fictícia** completa (exige `SEED_ADMIN_EMAIL`; recusa produção sem `SEED_DEMO_EM_PRODUCAO=sim`) |
| `npm run db:studio` | Drizzle Studio (explorar o banco) |

#### Por que `test:all` e não `test`

`npm test` sem `DATABASE_URL` termina **verde pulando 95 dos 263 arquivos
(508 testes)** — são os de integração, que abrem com
`describe.skipIf(!HAS_DB)` e cobrem justamente concorrência de numeração,
travas de conciliação, Acerto, Ressarcimentos e permissões. Verde sem banco não
prova nada sobre esses caminhos.

`npm run test:all` é o portão: falha se `DATABASE_URL` não estiver definido.
Com banco, a suíte roda inteira — 263 arquivos, 2.148 testes, zero pulados.

```sh
export DATABASE_URL='postgres://usuario:senha@localhost:5432/growth'
npm run db:migrate
npm run test:all
```

**Todo relatório de entrega informa o resultado de `test:all` e o número de
testes pulados. Pulado > 0 precisa de motivo escrito.**

Testes que afirmam sobre datas literais e dependem de "hoje" (fatura aberta,
vencido, atrasado, mês corrente, aging) **fixam o relógio** com
`vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime(...)`. Sem isso
eles envelhecem e quebram sozinhos na virada do mês — ver
`src/lib/actions/fatura-pagamento.test.ts`. Só o `Date` é falsificado; os
timers seguem reais, porque o driver do Postgres depende deles.

#### Pacote para revisão

```sh
scripts/pacote-revisao.sh [commit-ou-tag-da-ultima-revisao]
```

Gera `pacote-revisao/<nome>-<hash>.zip` a partir de `git archive HEAD`, com
`REVISAO.txt` (hash e data do HEAD, `git log --oneline` e `git diff --stat` do
intervalo). Usa `git archive` de propósito: um pacote montado à mão escolhendo
diretórios já saiu **sem** `src/lib/db/migrations/meta/_journal.json`, e sem
esse arquivo o migrator do Drizzle aborta com
`Can't find meta/_journal.json file` — o revisor teve de aplicar os `.sql` à
mão. O script confere a presença de `_journal.json`, `docs/SPEC.md`,
`package.json` e `REVISAO.txt` e falha se algum faltar.

## Estrutura

```
src/
├─ app/                  # rotas (App Router)
│  ├─ (auth)/login       # login (placeholder — Fase 6)
│  ├─ (app)/dashboard    # dashboard (placeholder — Fase 2+)
│  └─ api/auth/…         # handler do Auth.js
├─ components/ui/        # componentes base (button, card)
└─ lib/
   ├─ db/                # Drizzle: schema, client, migrations, seed
   ├─ auth.ts            # configuração Auth.js
   ├─ calc/              # cálculos puros + constantes + testes ✓
   │                     #   (projeção, totais, INCC, simulador SAC/PRICE)
   ├─ openfinance/       # cliente Pluggy — Fase 4
   └─ pdf/               # geração de PDF (medição de obra) — Fase 5
```

## Deploy (Coolify)

Build pack **Dockerfile**, porta `3000`, HTTPS automático via Traefik.
Configure as variáveis de [`.env.example`](./.env.example) como secrets.

**Migrações são automáticas:** o `docker-entrypoint.sh` roda o runner de
migração (`migrate.mjs`, um bundle esbuild do migrator do Drizzle — não precisa
do `drizzle-kit` em runtime) antes de subir o servidor. É idempotente: a cada
deploy aplica só o que falta.

**Seed de demonstração (opcional):** o banco funciona vazio — empresas reais
nascem pelo console da plataforma (`/plataforma`). Para apresentar o app, o
seed cria a **Consultoria Ambiental**, uma empresa de consultoria **fictícia**
com ~12 meses de histórico e ~12 de projeção, relativos à data em que roda:
6 projetos com contrato, itens, marcos, medições, aditivo, faturas e
recebimentos conciliados; ~350 despesas pagas (projetos, sede, folha, DAS,
cartão corporativo); orçamento e previsão; plano de trabalho; estoque; equipe
e fornecedores. Os fluxos passam pelas **ações reais do app** (ver
`src/lib/db/seed-demo/`), então os números batem entre DRE, fluxo de caixa,
contratos e contas a pagar/receber.

No terminal do container (ou localmente, `npm run db:seed`):

```bash
SEED_ADMIN_EMAIL=demo@suaempresa.com.br SEED_DEMO_EM_PRODUCAO=sim node seed.mjs
```

- `SEED_ADMIN_EMAIL` é o login da demonstração e precisa ser um e-mail **sem
  vínculo com outra empresa** (o app abre a primeira empresa do usuário).
- Sem `SEED_ADMIN_PASSWORD`, a senha é gerada, mostrada uma vez e a troca é
  obrigatória no primeiro acesso. Nenhum usuário, e-mail ou senha fica no código.
- Rodar de novo não duplica nada; `SEED_DEMO_RECRIAR=sim` apaga a empresa de
  demonstração e recria do zero (com as datas atualizadas para o mês corrente).

Variáveis obrigatórias em produção:

```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:SENHA@servico-pg:5432/postgres
AUTH_SECRET=<openssl rand -base64 32>
AUTH_TRUST_HOST=true          # necessário atrás do Traefik
SUPERADMIN_EMAILS=operador@exemplo.com   # operadores do console /plataforma (sem isto, ninguém acessa)
NEXT_PUBLIC_APP_URL=https://app.growthtools.com.br
```

Passo a passo completo em [`docs/STACK.md §3`](./docs/STACK.md).

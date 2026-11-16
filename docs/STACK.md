# STACK — Reconstrução para Produção (VPS + Coolify)

> Stack de produção do **Growth Tools · Construction App**, projetada para rodar **inteiramente em uma VPS gerenciada por [Coolify](https://coolify.io)** — sem dependência de PaaS proprietária (Vercel/Supabase Cloud).
> Funcionalidades de origem: ver [`SPEC.md`](./SPEC.md).

---

## 1. Por que mudar a stack original

O protótipo planejava **Next.js + Supabase Cloud + Vercel Pro**. Para auto-hospedagem em VPS com Coolify, trocamos os serviços gerenciados por componentes que o Coolify orquestra nativamente via Docker + Traefik:

| Camada | Plano original (PaaS) | **Stack VPS + Coolify** |
|---|---|---|
| Frontend + Backend | Next.js 14 na Vercel | **Next.js 15 (App Router) — container Docker no Coolify** |
| Banco de dados | Supabase Postgres (cloud) | **PostgreSQL 16 — recurso one-click do Coolify** |
| Auth | Supabase Auth | **Auth.js (NextAuth v5)** + Postgres |
| Storage de arquivos | Supabase Storage | **Cloudflare R2 (S3-compatível) — serviço externo** |
| Deploy / SSL / Proxy | Vercel | **Coolify + Traefik + Let's Encrypt (automático)** |
| Open Finance | Pluggy/Belvo | **Pluggy** (API externa — inalterada) |
| Jobs/agendados | Vercel Cron | **Coolify Scheduled Tasks** ou worker BullMQ + Redis |

---

## 2. Stack recomendada (decisão)

```
┌─────────────────────────────────────────────────────────────┐
│  VPS (Ubuntu 22.04+, 4 vCPU / 8 GB RAM recomendado)          │
│  └─ Coolify (auto-gerencia Docker, Traefik, SSL)            │
│      ├─ app          → Next.js 15 (web + API routes)        │
│      ├─ postgres     → PostgreSQL 16                        │
│      ├─ redis        → Redis 7 (cache + filas BullMQ)       │
│      └─ worker       → Node worker (jobs: sync OF, PDFs)    │
└─────────────────────────────────────────────────────────────┘
        │
        └─ Cloudflare R2 (S3-compatível) → documentos/anexos (externo)
```

### Frontend / App
- **Next.js 15** (App Router, React Server Components) + **TypeScript**.
- **Tailwind CSS** + **shadcn/ui** (componentes acessíveis) — substitui o CSS manual do protótipo.
- **TanStack Query** (estado de servidor) + **Zustand** (estado de UI leve: versão ativa, projeto ativo).
- **Recharts** ou **Chart.js** (manter Chart.js reduz retrabalho dos gráficos do protótipo).
- **SheetJS (xlsx)** para importação de planilhas (já usado no protótipo).
- **react-hook-form + Zod** para os formulários complexos do plano de pagamento.

### Backend / API
- **Next.js API Routes / Server Actions** (monólito full-stack — simples de deployar em um container).
- **Prisma** (ORM) ou **Drizzle ORM** — recomendado **Drizzle** (leve, SQL-first, migrações claras).
- **Zod** para validação compartilhada cliente/servidor.
- Geração de **PDF** (medição de obra / relatórios) via **@react-pdf/renderer** ou **Puppeteer** no worker.

### Banco de dados
- **PostgreSQL 16 puro** (recurso nativo do Coolify, com backups agendados). **Sem Supabase** — Postgres direto via ORM.
- **Multi-tenancy** por coluna `tenant_id` + isolamento na camada de aplicação. (Opcional: RLS nativa do Postgres com `SET app.tenant_id` por sessão, se quiser defesa em profundidade.)
- Modelar **versões/cenários** como dados versionados (`version_id` em todas as tabelas de movimento).

### Fuso horário do banco (GA-13 J1)

O app **não depende** do fuso do servidor do Postgres.

- **Como funciona:** toda conexão fixa a sessão em UTC (`connection: { TimeZone: "UTC" }`). As opções ficam centralizadas em `src/lib/db/conexao.ts` (`OPCOES_DE_CONEXAO`, `comConexaoUtc`).
  - Usadas em `src/lib/db/index.ts`, `src/lib/db/migrate.ts` e nos scripts `scripts/medicao-*.ts`.
  - Os `.mjs`, que não importam TypeScript, repetem `TimeZone: "UTC"`.
- **Por quê:** as colunas `timestamp` (sem fuso) com `defaultNow()` gravam a hora da sessão. Com o banco em America/Sao_Paulo e a sessão no fuso do servidor, a hora gravada ficava 3 h atrás do `new Date()` do código.
  - O limite de conversas da Cris por hora nunca disparava.
  - O reenvio da NFS-e "logo após o envio" não segurava.
  - O backup não via o que mudou.
- **Nenhum tipo de coluna mudou.**
- **Testes:**
  - `scripts/test-db.sh` põe o banco de teste em `${TEST_DB_TZ:-America/Sao_Paulo}`, só em banco local;
  - `src/lib/db/fuso.test.ts` confere que a sessão é UTC, que `defaultNow()` fica a menos de 5 s de `new Date()` e que todo `postgres(...)` do repositório usa as opções.
- **Conferir na produção:** no terminal do GA-postgres, rode `psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SHOW timezone;"`. A correção vale com qualquer resultado.

### Autenticação
- **Auth.js (NextAuth v5)** com adapter Drizzle + Postgres (tabelas de sessão/usuário no próprio banco).
- Papéis: `owner`, `admin`, `contador` (somente leitura), `membro`.
- Sessão por JWT/cookie httpOnly. RBAC na camada de API.

### Storage de documentos
- **Cloudflare R2** (S3-compatível) para o repositório de notas fiscais/contratos do módulo Despesas.
- SDK `@aws-sdk/client-s3` apontando para o endpoint R2 da conta (`https://<accountid>.r2.cloudflarestorage.com`) com `region: 'auto'`.
- **Vantagens:** sem egress fee (download grátis), fora da VPS (não consome disco/RAM do Coolify), durabilidade gerenciada pela Cloudflare.
- Upload via **presigned URLs** geradas no servidor (cliente envia direto ao R2, sem passar pela app). Acesso de leitura por presigned URL ou domínio público/custom domain do bucket.

### Open Finance
- **Pluggy** (agregador brasileiro) — API externa.
- Worker agendado puxa extratos e popula lançamentos de caixa para conciliação.
- Credenciais via variáveis de ambiente do Coolify (secrets).

### Jobs / agendamento
- **Redis 7 + BullMQ** para filas (sincronização Open Finance, geração de PDF, recálculo de projeções pesadas).
- Alternativa simples: **Scheduled Tasks** nativas do Coolify (cron) chamando endpoints internos.

---

## 3. Deploy no Coolify — passo a passo

### Pré-requisitos
- VPS com Ubuntu 22.04+ e Coolify instalado (`curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`).
- Domínio apontando para o IP da VPS (DNS A record). Subdomínios sugeridos:
  - `app.growthtools.com.br` → Next.js
  - *(R2 é externo — não precisa de subdomínio na VPS; opcionalmente configure um custom domain do bucket no painel Cloudflare)*

### Passos
1. **Criar projeto** no Coolify (ex.: `growth-tools`).
2. **Adicionar recurso PostgreSQL** (one-click) → anotar `DATABASE_URL` interna.
3. **Adicionar recurso Redis** (one-click).
4. **Criar bucket no Cloudflare R2** (painel Cloudflare → R2 → Create bucket `documentos`) e gerar um **API Token R2** (Access Key ID + Secret Access Key). Não é um recurso do Coolify — é externo.
5. **Adicionar aplicação** apontando para o repositório Git:
   - Build pack: **Dockerfile** (ver §4) ou **Nixpacks**.
   - Porta exposta: `3000`.
   - Habilitar **HTTPS automático** (Traefik + Let's Encrypt).
6. **Configurar variáveis de ambiente** (§5) como secrets.
7. **Rodar migrações** no deploy (comando pós-build `drizzle-kit migrate` / `prisma migrate deploy`).
8. **Adicionar worker** (segunda aplicação, mesmo repo, comando `node worker.js`) — sem porta pública.
9. **Configurar backups** do Postgres no Coolify (diário) + retenção.
10. **Webhook de deploy**: conectar o Coolify ao GitHub para CI/CD em cada push na branch de produção.

---

## 4. Dockerfile (Next.js standalone)

```dockerfile
# --- deps ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build          # next build (output: 'standalone')

# --- runtime ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> Em `next.config.js`: `output: 'standalone'` para imagem mínima.

---

## 5. Variáveis de ambiente

```env
# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.growthtools.com.br
AUTH_SECRET=__gerar_com_openssl_rand_base64_32__

# Postgres (interno Coolify)
DATABASE_URL=postgresql://user:pass@postgres:5432/growthtools

# Redis
REDIS_URL=redis://redis:6379

# Cloudflare R2 (S3-compatível)
R2_ENDPOINT=https://__account_id__.r2.cloudflarestorage.com
R2_BUCKET=documentos
R2_ACCESS_KEY_ID=__r2_access_key_id__
R2_SECRET_ACCESS_KEY=__r2_secret_access_key__
R2_REGION=auto
# opcional: domínio público/custom do bucket para servir leitura
R2_PUBLIC_URL=https://docs.growthtools.com.br

# Open Finance (Pluggy)
PLUGGY_CLIENT_ID=__id__
PLUGGY_CLIENT_SECRET=__secret__
```

---

## 6. Estrutura de pastas sugerida (monorepo simples)

```
growth-construction/
├─ docs/
│  ├─ SPEC.md
│  └─ STACK.md
├─ src/
│  ├─ app/                 # rotas Next.js (App Router)
│  │  ├─ (auth)/login
│  │  ├─ (app)/dashboard
│  │  ├─ (app)/unidades
│  │  ├─ (app)/despesas
│  │  └─ api/              # endpoints / server actions
│  ├─ components/          # UI (shadcn)
│  ├─ lib/
│  │  ├─ db/               # Drizzle schema + migrations
│  │  ├─ calc/             # calcProj, calcTotals, INCC, simulador
│  │  ├─ openfinance/      # cliente Pluggy
│  │  └─ pdf/              # geração medição de obra
│  └─ workers/             # BullMQ jobs
├─ Dockerfile
├─ next.config.js
└─ package.json
```

> **Reaproveitamento direto do protótipo:** a lógica de cálculo (`calcProj`, `calcUnitTotal`, `calcTotals`, `recalcINCC`, `getINCC`, simulador SAC/PRICE) e a estrutura `PLANO_CONTAS` / `CATEGORIAS_DRE` / `PAPEIS_STAKEHOLDER` podem ser portadas quase 1:1 do HTML para `src/lib/calc/` e `src/lib/db/seed`.

---

## 7. Roadmap de migração sugerido

1. **Fase 0 — Scaffold:** Next.js 15 + Tailwind + Drizzle + Auth.js; Dockerfile; subir "hello world" no Coolify com Postgres.
2. **Fase 1 — Modelo de dados:** migrar entidades do §3 do SPEC para schema Drizzle (tenant, projeto, versão, unidade, plano de pagamento, despesa, fornecedor, conta).
3. **Fase 2 — Receitas:** portar Unidades, plano de pagamento, INCC, Projeção, Consolidado, Simulador (reusar lógica de cálculo).
4. **Fase 3 — Despesas:** Lançamentos, Plano de Contas, Fornecedores, repositório de documentos (Cloudflare R2).
5. **Fase 4 — Caixa & Open Finance:** integração Pluggy + conciliação automática.
6. **Fase 5 — Reports:** Dashboard multi-versão, DRE, Fluxo de Caixa, Medição (PDF), Rolling, Resumo.
7. **Fase 6 — Config & multi-tenant:** Usuários, papéis, acesso contabilidade (read-only), auditoria.

# API de agente — Growth ↔ Cris (WhatsApp)

Camada de leitura para a **Cris**, a assistente que responde no WhatsApp
(plataforma fazer.ai agents, tenant e agente configurados na plataforma).

O app é todo Server Actions, presas ao cookie de sessão do Auth.js — não há por
onde um cliente externo falar com ele. Estas rotas são essa porta, e só ela.

**Fase 1 é somente leitura.** Lançamento de nota/recibo/cupom é a Fase 2, e vai
exigir turno de confirmação antes de gravar.

---

## 1. Autenticação — duas provas, ambas obrigatórias

| Prova | Como | O que garante |
|---|---|---|
| `Authorization: Bearer <AGENT_API_TOKEN>` | segredo no cofre da fazer.ai | quem chama é o runtime do agente |
| `X-Agent-Phone: {{contact_phone}}` | preenchido pelo runtime | **quem** está do outro lado |

O telefone é resolvido para e-mail pela allowlist (`AGENT_ALLOWED_PHONES`),
o e-mail para usuário, e o usuário para `membership` → tenant + perfil. A partir
daí vale **o mesmo RBAC das telas** (`src/lib/permissions.ts`): contador só lê o
que contador lê, engenheiro só o que engenheiro vê.

Consequência que importa: a autorização **não mora no prompt**. Se alguém
convencer a Cris a consultar dado que não deveria, o servidor devolve 403 do
mesmo jeito. Prompt é interface, não é controle de acesso.

### Números brasileiros e o nono dígito

A allowlist indexa as duas formas do mesmo número (com e sem o 9 depois do DDD).
O WhatsApp entrega celular com o nono dígito, mas o JID de números antigos vem
sem — comparar a string crua faria o dono legítimo levar 403.

---

## 2. ⚠️ Questão em aberto: a variável de contexto chega no header?

`tool_create` documenta que `{{contact_phone}}` resolve em url, query, headers e
corpo. **Em campo, no corpo não chega** — provado em 26/08 (em outro cliente da plataforma): o
mesmo JSON passava por curl e voltava 400 pela plataforma, e nem literal fixo
sobrevivia. Esse teste nunca cobriu header nem query.

Como todo o desenho de autenticação depende disso, existe **`GET/POST
/api/agent/eco`**: devolve exatamente os headers, query e corpo que recebeu.

Procedimento:

1. Criar uma tool HTTP apontando para `/api/agent/eco` com `{{contact_phone}}`
   em header **e** query **e** corpo, sem declarar nada no `input_schema`.
2. Chamar pelo playground.
3. Ler o campo `diagnostico.telefone`. Se vier a string literal
   `{{contact_phone}}`, a plataforma **não** resolveu naquele canal
   (`naoResolvido: true`).

O que estiver preenchido é o canal a usar. O eco não toca o banco e devolve o
bearer só como contagem de caracteres.

---

## 3. Rotas

Todas em `GET`, todas devolvendo `{ ok: true, ... }` ou
`{ ok: false, codigo, erro }` com o status HTTP correspondente. A mensagem de
erro é escrita **para o agente ler e explicar** — nunca stack trace.

| Rota | Tela / permissão | Responde a |
|---|---|---|
| `/api/agent/projetos` | `projeto` | "quais obras existem?" — é a tradução de "OBRA 28" para o nome exato |
| `/api/agent/unidades` | `unidades` | "quais unidades temos à venda hoje?" |
| `/api/agent/contas-pagar` | `contaspagar` | "quais contas vencem hoje?" |
| `/api/agent/contas-receber` | `contasreceber` | "quanto tem a receber da OBRA 28?" |

### Filtros

| Parâmetro | Onde | Efeito |
|---|---|---|
| `projeto=OBRA 28` | unidades, contas | casa por nome, ignorando acento e caixa |
| `status=Disponivel` | unidades | `Disponivel` · `Reservado` · `Vendido` · `Permutado` |
| `hoje=1` | contas | vencimento de hoje **no fuso de São Paulo** |
| `de=&ate=` | contas | janela em `YYYY-MM-DD` |
| `pendentes=1` | contas a pagar | só o que ainda não saiu do caixa |
| `limite=` | todas | padrão 50, teto 200 |

### Duas decisões que evitam resposta errada

**Truncagem nunca é silenciosa.** `total`, `somaValor` e `truncado` são
calculados **antes** do corte. Contas a Pagar já passa do teto em uso real: sem isso a
Cris diria "são estas 50" com a mesma confiança com que diria a lista inteira.

**Hoje é hoje em Brasília.** A VPS roda em UTC. Depois das 21h o `new Date()` do
servidor já virou o dia — "contas de hoje" devolveria as de amanhã, só à noite,
sem erro nenhum aparecendo.

E `contas-receber` devolve `natureza: "previsao"`: são parcelas contratadas
expandidas do plano de pagamento, não extrato bancário. A Cris precisa dizer
isso quando responder.

---

## 4. Auditoria

Toda consulta que devolve dado financeiro grava em `auditLog`: tenant, usuário,
telefone de origem e rota. Responde a "quem viu isso, e quando?". `/projetos` e
`/eco` não gravam — não carregam valor.

---

## 5. Variáveis de ambiente

Ver `.env.example`. `AGENT_API_TOKEN` vazio **desliga** a API (503) — o default
é seguro: uma app que suba sem o secret não expõe nada.

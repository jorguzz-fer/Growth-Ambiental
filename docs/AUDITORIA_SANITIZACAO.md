# Growth Ambiental · Auditoria e sanitização dos dados herdados

Este relatório **não reproduz** dados pessoais, documentos, contas, valores ou
nomes reais: os achados são descritos por categoria e por arquivo.

## 1. Escopo

Repositório Growth Ambiental (cópia da base do Growth Tools · Construction,
desenvolvida para um cliente real do setor de construção e incorporação).
Objetivo: eliminar do código versionado os dados reais e operacionais herdados,
**sem remover funcionalidades**. Fora do escopo: dados em bancos operacionais
(nada foi apagado em banco algum) e o repositório de origem do Construction.

## 2. O que foi examinado

| Área | Como |
|---|---|
| Código-fonte (`src/**`, 1.000+ arquivos) | varredura por padrões (e-mail, telefone, CPF/CNPJ com validação de dígito, agência/conta, chaves de API, tokens, chaves privadas, senhas atribuídas) + revisão dos achados em contexto |
| Testes e fixtures | idem; atenção a testes de leitura de documento (nascidos de comprovantes reais) |
| Seed, scripts de inicialização, Dockerfile, entrypoint | leitura integral |
| Migrations (77 + rollbacks) | busca de `INSERT/UPDATE/DELETE` e de identificadores; só derivações estruturais |
| Scripts (`scripts/**`, e2e) | leitura dos achados; scripts de diagnóstico de produção identificados |
| Documentação (`docs/**`, ~265 arquivos, ~3 MB) | glossário determinístico + revisão contextual de 60 documentos com sinais de dado de produção |
| Arquivos estáticos (`public/`, mockup HTML, ícones) | varredura e leitura dos trechos com dados |
| Arquivo compactado | extraído em pasta isolada e varrido |
| Configuração (`.env.example`, `.gitignore`, `.dockerignore`) | leitura integral |
| Histórico Git | clone completo (796 commits, desde 25/06/2026); comparação dos identificadores do histórico com os da árvore; inventário de arquivos de dados já versionados; visibilidade do repositório remoto |

Ferramentas: `git grep`/`grep` com expressões regulares, validação de dígito
verificador de CPF/CNPJ (para separar números reais de sequências quaisquer),
varredura do histórico com `git log -p`, e o teste automatizado
`src/lib/sanitizacao.test.ts` (ver §7). Sem dependência de lista fixa de nomes.

## 3. Categorias identificadas

| Categoria | Onde estava | Tratamento |
|---|---|---|
| Nomes de empresas do cliente anterior (incorporadora, construtora) e do empreendimento | README, seed, constantes, ~25 testes, scripts e2e, ~50 documentos, mockup, ZIP | substituídos por "Cliente Piloto", "Construtora Piloto", "Empreendimento Piloto" (docs) ou "Exemplo" (código) |
| Domínios de e-mail das empresas anteriores | seed, scripts e2e, testes fiscais, docs | `@exemplo.com.br` |
| E-mails e telefones pessoais de operadores | seed, `superadmin.ts`, `.env.example`, `agent/auth.ts` + teste, script e2e, docs | removidos; operadores só por variável de ambiente; telefones fictícios (`9 0000-000x`) |
| Senha fixa de contas administrativas | seed, 4 scripts e2e | removida; seed gera senha aleatória (ou lê do ambiente) com troca obrigatória; e2e lê `E2E_EMAIL`/`E2E_PASSWORD` |
| Pessoa física real (nome + CPF) | seed, testes de cadastro, docs | pessoa e CPF fictícios |
| Fornecedores reais (razão social, CNPJ, cidade, telefone) | seed, testes de leitura de NF/cupom, prompt da IA (exemplo), docs, mockup | fornecedores fictícios; CNPJ sintético |
| Chave de acesso de NF-e real | teste de leitura de documento | chave sintética com dígito verificador válido |
| Pessoa e CPF mascarado de comprovante Pix real | teste de leitura de documento e exemplo no prompt da IA | nome e máscara fictícios |
| Contas bancárias reais (banco + agência + conta) | seed, testes de contas, docs, mockup | "Banco Exemplo", agência e conta fictícias |
| Unidades do empreendimento | fixtures de cálculo, testes, comentários do schema | código `UNID nnn` (valores de cálculo das fixtures preservados — ver §5) |
| Valores do empreendimento real (custo de edificações de referência, distribuição percentual do orçamento) | `calc/constants.ts` | removidos (constantes sem uso no código) |
| Município-sede do cliente anterior (código IBGE, CEP) | testes de NFS-e | Campinas/SP como sede fictícia (São Paulo segue como "outro município") |
| Centro de custo com nome da cidade, nome da loja/fornecedor em exemplos de busca | testes e comentários | nomes genéricos |
| Identificador de conta em plataforma externa (agente) | `docs/API-AGENTE.md` | removido |
| Diagnóstico da base de produção (contagens e valores por empresa/obra) | `docs/V2-DIAGNOSTICO-PRODUCAO.md`, trechos em documentos de prompt/decisão | arquivo removido; trechos neutralizados (§4) |
| Script de diagnóstico de registros específicos de produção | `scripts/diagnostico-registros.sql` | removido |
| Protótipo compactado com dados reais | `growth-tools-construction.zip` (nomes, pessoa, CPF/CNPJ, banco, conta) | removido |
| Credenciais/segredos (chaves de API, tokens, chaves privadas, `.env`) | — | **nada encontrado** na árvore nem no histórico (só `.env.example`) |

## 4. Arquivos removidos e sanitizados

### Removidos
- `growth-tools-construction.zip` — protótipo com dados reais (inspecionado em pasta isolada antes).
- `docs/V2-DIAGNOSTICO-PRODUCAO.md` — inteiramente resultado de consultas na produção do cliente anterior.
- `scripts/diagnostico-registros.sql` — consulta a registros específicos da produção anterior.

### Código e configuração sanitizados
- `src/lib/db/seed.ts` — reescrito: só demonstração, empresa **fictícia** ("Consultoria Ambiental Exemplo (DEMONSTRAÇÃO)"), documentos sintéticos, sem usuários/e-mails/senhas no código; exige `SEED_ADMIN_EMAIL`; recusa `NODE_ENV=production` (salvo `SEED_DEMO_EM_PRODUCAO=sim`); senha aleatória mostrada uma vez com troca obrigatória.
- `src/lib/tenant/superadmin.ts` — sem e-mails no código; operadores só por `SUPERADMIN_EMAILS`; sem a variável, **ninguém** é operador (falha fechada) e o log avisa. Teste novo: `superadmin.test.ts`.
- `.env.example`, `README.md` — sem contatos reais; documentam `SUPERADMIN_EMAILS` e as variáveis do seed.
- `src/lib/agent/auth.ts` (comentário) e `auth.test.ts` — telefones/e-mails fictícios, mesma cobertura (com e sem o nono dígito).
- `scripts/e2e/*.mjs` (4) — credenciais por variável de ambiente.
- `src/lib/calc/constants.ts` — removidas as duas constantes do empreendimento real (sem uso).
- `src/lib/calc/__fixtures__.ts`, `schema.ts`, `numbering.ts`, `acerto-cris.ts`, `ai/campos.ts`, `ai/despesa-doc.ts`, `ai/despesa-extract.ts` (exemplos do prompt da IA), `assistente-chat.ts`, `busca.ts`, `clientes-sensivel.ts`, `project-manager.tsx` (placeholder) — exemplos e comentários neutros.
- ~40 arquivos de teste — identificadores fictícios com as mesmas asserções (ordem alfabética, buscas parciais, máscaras e relações sede × obra preservadas).

### Documentação
- Glossário determinístico aplicado em 50 documentos (155 substituições): empresas, empreendimento, cidade, unidades, contatos, documentos, contas, fornecedores e pessoas.
- Revisão contextual de 60 documentos com sinais de dado de produção: ver §4.1.
- `docs/MODULO_CONTRATOS_ADITIVOS.md`: o nome do cliente atual saiu do texto ("o primeiro cliente").

#### 4.1 Revisão contextual dos documentos
Quatro revisões independentes, cada uma lendo o contexto de cada ocorrência
(nunca troca por nome): **~306 arquivos revisados, ~51 alterados, nenhum
removido além do diagnóstico de produção**.

| Lote | Revisados / alterados | O que saiu |
|---|---|---|
| `docs/v2/PROMPTS.md` (1 MB) | 1 / 1 (53 trocas) | valores reais de mockups e de produção; contagens de produção; números de pedido reais; nomes de sócios em contas, de funcionárias, de terceiros e de fornecedores; dígitos de CPF mascarado; endereço, CEP e coordenadas de obra |
| Mockup HTML, SPEC, revisões, BDI, emissor, agente | ~15 / 7 | no mockup: pessoas, fornecedores, sócios, documentos (RG, CTPS, PIS), contas, endereço e renda de comprador; valores monetários arredondados e reescalados por um fator único (somas, saldos e percentuais continuam coerentes; HTML e JS íntegros); SPEC: número de unidades e custo do empreendimento, preço cobrado do piloto; BDI: planilha real trocada por exemplo sintético recalculado pelas mesmas fórmulas; nome de outro cliente e contagem de produção no doc do agente |
| V2-PROMPT A–K + decisões/bloqueios | 112 / 22 | resultado do diagnóstico de numeração de produção; nomes de funcionários; contagens e somas de produção por empresa; VGV real; valor de divergência de produção; código IBGE da sede; links para o diagnóstico removido |
| V2-PROMPT L–Z, V3, SQL e demais | 178 / 21 | dados reais de numeração; nomes de funcionários e de sócios em rótulos de contas; lançamento real de produção; simulação real de venda; soma real dos percentuais do empreendimento; contagens de produção |

**Mantidos de propósito (decisão registrada):**
- Números da **base local de desenvolvimento** (lançamentos de teste criados e apagados pelos próprios testes, conferências no navegador) — não são produção.
- Achados de produção cujo resultado é **"nenhum/zero"** — não expõem dado e justificam decisões técnicas.
- Durações e datas de início/fim de duas obras com rótulo genérico ("OBRA nn") usadas para ilustrar a contagem de competências — sem valor, nome ou local.
- Preço de licença e custo de IA do **próprio produto** citados em reunião — dado comercial do fornecedor do software, não do cliente.
- Preço de tabela da fixture de cálculo (`calc/__fixtures__.ts`): base dos **testes de paridade** do simulador e da projeção (financiamento, SAC/PRICE, totais). Trocá-lo exigiria refazer asserções de cálculo financeiro; sem o nome do empreendimento e o código da unidade (removidos), o número isolado não identifica ninguém.

## 5. Dados de demonstração e de teste preservados (justificados)

- **CPF/CNPJ sintéticos** (lista fechada em `sanitizacao.test.ts`): gerados para este repositório com raiz `000.000.00x`/`00.000.00x` e dígito válido, e exemplos públicos amplamente usados em documentação de validação (ex.: `529.982.247-25`, `11.222.333/0001-81`). Números de formato inválido usados para testar recusa permanecem (não são documentos).
- **Nomes genéricos** em testes ("Fulano de Tal", "Maria da Silva Souza", "Ana Souza", "Obra A", "OBRA 28"): sem correspondência com cadastro real conhecido; rótulos "OBRA nn" são genéricos e não carregam valores.
- **Fixture de cálculo da unidade** (`calc/__fixtures__.ts`): código trocado; os valores (redondos, de teste: 5.000, 20.000…) são os das provas de paridade do cálculo e foram mantidos — sem o nome do empreendimento não identificam ninguém.
- **Série padrão do índice** (`DEFAULT_INCC`): índice público + projeção; é parâmetro funcional, não dado de cliente.
- **Primeiro nome dos sócios atuais** em registros de decisão nos docs ("decisão do Thiago"): equipe atual do produto, não dado herdado. Contatos removidos.
- **Marca e domínio do próprio produto** (Tools for Growth, growthtools.com.br): do fornecedor do software, não do cliente.

## 6. Situação do histórico Git — **requer sua decisão**

- O repositório remoto `jorguzz-fer/Growth-Ambiental` é **PÚBLICO**.
- O histórico completo (796 commits, desde 25/06/2026, herdado do repositório do Construction) contém **todos** os dados listados no §3: o ZIP do protótipo, as versões do seed com pessoa, CPF, fornecedor e **contas bancárias reais**, e-mails e telefones de operadores, o diagnóstico de produção e os documentos antes da sanitização.
- A comparação histórico × árvore não achou identificadores que existam **só** no histórico (nenhum e-mail, CPF/CNPJ ou telefone a mais); o problema é a presença dos mesmos dados nas versões antigas.
- O GitHub mantém referências dos PRs (`refs/pull/*`, 3 aqui) e pode manter cópias em cache e em forks: reescrever o histórico e dar *force push* **não** apaga essas referências.
- Nenhuma credencial (chave, token, senha de serviço) foi encontrada — não há rotação de segredo a fazer. A senha fixa removida era de contas de demonstração do seed; se alguma conta real ainda usa essa senha, ela deve ser trocada.
- O repositório de origem do Construction provavelmente tem o mesmo histórico (fora do escopo; avaliar à parte).

### Procedimento recomendado (nada disso foi executado)
1. **Imediato e reversível:** tornar o repositório **privado** (GitHub → Settings → General → Danger Zone → Change visibility). Interrompe a exposição sem destruir nada.
2. **Histórico limpo — opção recomendada:** criar um **repositório novo, privado**, com um único commit inicial a partir da árvore sanitizada (`git archive` desta revisão), reconfigurar o deploy (Coolify) para ele e, depois de validado, **arquivar e excluir** o repositório atual. Elimina de uma vez histórico, `refs/pull/*`, caches e a superfície de forks.
3. **Alternativa** (mantém o repositório): `git filter-repo` removendo os arquivos e reescrevendo os textos sensíveis em todos os commits, *force push* de todas as branches, exclusão das branches antigas e pedido ao **GitHub Support** para remover `refs/pull/*` e caches. Mais trabalhoso e depende do suporte.
4. Avaliar a comunicação ao cliente anterior e às pessoas cujos dados estiveram expostos (LGPD), com quem responde pela proteção de dados.

**Publicação:** as alterações desta auditoria foram **commitadas localmente e não foram enviadas** ao GitHub, aguardando a decisão acima (enviar novos commits não remove nada do histórico público).

## 7. Validação

### Varredura automatizada permanente — `src/lib/sanitizacao.test.ts`
Varre **todo arquivo versionado** a cada `vitest run` e falha se aparecer: arquivo compactado; documento/script de diagnóstico de produção; e-mail de provedor pessoal ou de domínio que não seja de exemplo; celular brasileiro que não seja visivelmente fictício; CPF/CNPJ **válido** fora da lista fechada de sintéticos. Não lista nomes reais (isso os devolveria ao código); nomes são cobertos pela revisão manual registrada aqui.

### Testes de regressão (após a sanitização)
| Verificação | Antes | Depois |
|---|---|---|
| `npm run typecheck` | ✓ | ✓ |
| `npm run lint` | ✓ | ✓ |
| `npm run test:db` (unitários + integração com banco isolado) | 286 arquivos · 2.329 testes · 0 pulados | **288 arquivos · 2.337 testes · 0 pulados** (+ `sanitizacao.test.ts`, + `superadmin.test.ts`) |
| `next build` | ✓ | ✓ |

Cobertos pela suíte: autenticação e permissões (incl. 400 combinações por papel), isolamento multi-tenant, contratos, DRE, fluxo, contas a pagar/receber, conciliação, cartões, NFS-e, Cris (ferramentas e privacidade), backup. Nenhuma asserção de cálculo financeiro foi alterada: as trocas nos testes mudaram só identificadores (nomes, documentos, contas, município), mantendo as relações que cada teste verifica.

**Inicialização sem dados reais** (banco novo e isolado): só as migrações → 0 empresas, 0 usuários, 0 projetos, 0 contratos, 0 lançamentos. Seed sem `SEED_ADMIN_EMAIL` → recusado; com `NODE_ENV=production` → recusado; em modo demonstração → só a empresa fictícia, com troca de senha obrigatória. O provisionamento de empresa nova segue coberto pelos testes de integração.

**Referências quebradas:** nenhuma — links para os três arquivos removidos foram trocados por texto; nenhum código importa o ZIP ou os arquivos removidos (`next build` e `tsc` confirmam).

## 8. Riscos remanescentes

- **Histórico público** (§6) — o risco principal; depende de decisão.
- Varredura automática não prova ausência absoluta: nomes de pessoas ou empresas sem padrão detectável podem ter escapado; a revisão contextual reduziu, não zerou, esse risco.
- Números ilustrativos nos documentos foram mantidos quando o contexto indicava exemplo; um valor real escrito como exemplo não seria distinguível.
- O banco **local** de desenvolvimento desta sessão ainda tem a empresa de demonstração antiga semeada antes da auditoria (não versionado; não vai para o repositório).

## 9. Pendências que dependem de autorização

1. Tornar o repositório privado (ação sua no GitHub).
2. Escolher a estratégia de histórico (§6, itens 2 ou 3) e autorizar a execução.
3. Configurar `SUPERADMIN_EMAILS` no ambiente de produção **antes** de publicar esta versão (sem ela, o console `/plataforma` fica sem operadores).
4. Autorizar o envio (push) destes commits.

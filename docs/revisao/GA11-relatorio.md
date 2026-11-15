# GA-11 · Conciliação de Caixa como tela única — relatório

## 1. Medição na produção (§0)

Rodada pelo dono em 15/11/2026, só leitura (`scripts/medicao-caixa.sql`).

**Movimentos:**

| Empresa | Versão | Movimentos | Sem conta | Conciliados |
|---|---|---|---|---|
| Consultoria Ambiental | atual | 524 | 0 | 27 |
| Scientia Consultoria | — | 0 | — | — |

**Chave `caixa_conciliacao_por_conta`:** nenhuma linha em `tenant_flag` nas duas empresas.

Nenhum movimento fora da versão Atual: o **BLOQUEIO BCX-1 foi liberado**.

## 2. Inventário (§1)

Está em `docs/revisao/GA11-inventario.md`. Toda função tem destino.

**A tela antiga não tinha função de conciliação que a nova não tivesse.** Saíram só:

- o seletor de projeto;
- o seletor de versões;
- a comparação entre versões;
- os estados "selecione um projeto" e "sem versões".

**Depois do inventário (decisão do dono de 15/11/2026):** o **filtro de período** também saiu. A tela mostra todos os movimentos, e `?de=`/`?ate=` de links antigos são ignorados. O item "Período e Confirmar período" da §3.5 deixou de valer; um teste confere que o filtro não existe.

## 3. O que mudou

### Uma tela só (§2)

- **`/caixa`:** é sempre a Conciliação de Caixa, para toda empresa.
  - `?proj=` e `?vs=` são ignorados.
  - `?tab=conciliacao` (link antigo) abre a aba Contas correntes.
- **Extrato, Open Finance e ajuste:** gravam sem versão de planejamento.
  - O extrato e o Open Finance nascem na conta.
  - O ajuste tem projeto opcional.
  - Os ramos da chave desligada saíram de `actions/caixa.ts`, `actions/openfinance.ts`, `openfinance/sincronizar.ts` e `workers/sync-openfinance.ts`.
- **`getConciliacaoData`:** o ramo por versão saiu (não tinha outro uso).
- **A chave `caixa_conciliacao_por_conta`:**
  - saiu do catálogo, de `CHAVES_EMPRESA_NOVA` (agora 10 chaves) e da prévia em `/chaves`;
  - as linhas em `tenant_flag` ficam no banco, sem efeito.

### Layout (§3)

- **Cabeçalho:** "Conciliação de Caixa".
- **Barra:** o **seletor de conta**.
  - Na aba Contas: "Todas as contas correntes" ou uma conta.
  - Na aba Cartões: "Todos os cartões" ou um cartão.
  - Na aba Ajustes: as contas e os cartões, em grupos.
  - A escolha mora em `?conta=` e sobrevive a recarregar.
  - Trocar de aba volta para "Todas".
  - Clicar numa linha do quadro também escolhe a conta.
- **Cartões do dia:** seguem a escolha. Na aba Cartões, mostram créditos e compras da fatura do dia.
- **Faixa dos três caminhos:** na aba Cartões, "Subir extrato" vira "Subir fatura".
- **Abas:** Contas correntes · Cartões de crédito · Ajustes.
- **Cadeia de saldo e Dias fechados:** seguem a escolha. Fechar o dia continua só em "Todas".
- **"Todas" é visão de trabalho:**
  - pendentes, conciliados e "Todos os lançamentos" levam a coluna **Conta**;
  - conciliar funciona dali.
- **Aba Cartões:**
  - quadro por cartão: limite, fatura (fechamento e vencimento), fatura importada, lançado, diferença e situação;
  - **Subir fatura**: PDF ou imagem com IA, XLSX ou CSV, com prévia; registrar sem duplicar e sem lançar despesa;
  - conciliação linha a linha (em "Todos", uma lista com o cartão de cada fatura);
  - conferência: na fatura sem lançamento (proposta com link para Despesas), lançado sem fatura, divergências e créditos;
  - estorno só por clique.
- **`/cartoes`:** fica com cadastro, faturas, pagamento e projeção.
  - A conferência saiu de lá e virou o link "Conciliar … na Conciliação de Caixa → aba Cartões", com o cartão escolhido.
  - `?extrato=` (link antigo) redireciona para a aba.

### Cris (§4)

- **Contexto da tela:** recebe a aba, o escopo (a conta ou o cartão, ou "todas"), os saldos, a cadeia, as pendências e, na aba Cartões, o quadro e a conferência.
- **Sugestões por aba:** as quatro de Contas; as quatro de Cartões; "Por que há ajustes neste mês?".
- **"Conciliar com a Cris":** leva ao chat a aba e o que está escolhido.
- **Sem IA:** o botão e o chat dizem "A Cris precisa da IA configurada (Configurações → Diagnóstico de IA)."
- **Ferramentas novas do cartão**, ativas só na aba Cartões, no padrão das de conta corrente:
  - `pendentes_do_cartao`;
  - `candidatos_do_cartao`;
  - `propor_conciliacoes_cartao`: lote de até 20; a linha sem compra vira link para Despesas;
  - `ler_fatura`: abre a prévia de Subir fatura.

  Nenhuma grava. O lote grava pelo botão "Confirmar N conciliações" (`confirmarConciliacoesCartao`), que confere cada item de novo no servidor.
- **Base de conhecimento:** descreve a tela nova, sem obra, versão ou "Controle de Caixa".

### Nome (§5)

| Onde | Antes | Depois |
|---|---|---|
| Título | "Controle de Caixa" (tela antiga) | "Conciliação de Caixa" |
| Menu | Caixa › "Caixa" | Caixa › "Conciliação de Caixa", "Contas Correntes", "Cartões de Crédito" |
| Permissões | "Controle de Caixa" | "Conciliação de Caixa" |
| `parcelas-list.tsx` | "…entra no Controle de Caixa" | "…entra na Conciliação de Caixa" |
| `chat-metricas.ts` | "Controle de Caixa", "Ver no Controle de Caixa" | "Conciliação de Caixa", "Ver na Conciliação de Caixa" |
| Base da Cris | "o Controle de Caixa…", com obra e versão | a tela nova |
| Conciliação de entradas | "…gravado com valor (Prompt K)…" | sem "(Prompt K)" |

`grep "Controle de Caixa"` em `src` fora de comentários dá zero (há teste).

## 4. Correção junto: a tela travava depois de conciliar

**O problema.** Na conferência no navegador com a demonstração, no build de produção:

- trocar de aba, trocar a conta no seletor, ou conciliar e esperar a tela atualizar **não concluía**;
- a URL não mudava, e a tela ficava com o dado antigo até recarregar.

**Já acontecia antes do GA-11** (a tela por conta anterior também não trocava de aba com a demonstração).

**A causa.** O layout de `(app)` envolvia **todo o conteúdo da página** num `<Suspense fallback={null}>`, por causa do `useSearchParams` do provedor da Cris.

- Em página grande, essa fronteira ficava **desidratada** (o React ainda não tinha hidratado).
- Toda navegação ou `router.refresh()` ficava suspensa esperando por ela. No React, a raiz mostrava a transição pendente e suspensa, e a fronteira no estado `dehydrated`.
- Como toda rota de `(app)` é dinâmica (o layout lê `headers()`), a fronteira não é necessária.

**A correção:** ela saiu (a do chat fica).

**Medido:**

- conciliar e ver a tela atualizar: **6 de 6** (antes, 1 de 4);
- navegação pelo roteador saindo do Caixa: ~40 ms.

**Junto:** os links das listas da tela ficaram sem prefetch (eram centenas).

## 5. Arquivos e funções removidos

| Removido | Por quê |
|---|---|
| `src/app/(app)/caixa/caixa-por-conta.tsx` | substituído por `conciliacao-de-caixa.tsx` (a tela única) |
| ramo "Controle de Caixa" de `caixa/page.tsx` | tela antiga (seletor de projeto e de versões, comparação) |
| `src/components/app/cartao-conciliacao.tsx` (`CartaoNaConciliacao`) | a aba Cartões carrega os dados (`caixa-aba-cartoes.ts`) |
| `src/lib/caixa-conta-previa.ts` e a prévia em `/chaves` | a chave saiu |
| a chave `caixa_conciliacao_por_conta` no catálogo e em `CHAVES_EMPRESA_NOVA` | a regra vale para toda empresa |
| `addCash` (`actions/caixa.ts`) | sem uso fora de teste da tela antiga |
| `vinculosDaVersao` (`conciliacao-vinculos.ts`) | só o ramo por versão a usava |
| `versaoDeDestinoProvisoria` (`workers/sync-openfinance.ts`) | só o teste a usava |
| o modo "por obra" de `Conciliacao`/`ConciliacaoReview` (`projectId`) | a tela não tem obra |
| o filtro de conta dentro da aba Ajustes | o seletor da barra faz isso |
| `ExtratoCartao` em `/cartoes` | virou `SubirFatura` e `ConferenciaDoCartao`, na aba Cartões |
| o filtro de período da tela | decisão do dono de 15/11/2026 |

## 6. Testes

### `npm run test:all`

- **278 arquivos, 2416 testes, 0 pulados.**
- Typecheck e lint sem erro; os 11 avisos de lint são antigos, em testes não tocados.

### Novo: `src/lib/actions/ga11-conciliacao-caixa.test.ts`

Itens 1–4 e 6–11 da §7. O item 5 (contas correntes) está coberto pelos testes do Caixa já existentes e pela conferência no navegador.

- tela única; `?proj`/`?vs` (e `?de`/`?ate`) ignorados;
- nome em todo lugar;
- `/cartoes` sem a conferência;
- um teste por item do checklist da §3.5;
- empresa sem a chave: os movimentos e os saldos (em conta e conciliado) de cada conta são os da tela antiga somando os projetos;
- seletor com "Todas" e com uma conta;
- ajuste com e sem projeto e Open Finance sem versão de planejamento;
- aba Cartões: subir sem duplicar, quadro, conciliar, desfazer, "Todos";
- Cris no cartão: propõe sem gravar, o botão grava, recusa compra que não é candidata, permissões;
- 10 chaves.

### Testes que fixavam a tela antiga

Passaram a fixar a regra nova:

- `caixa-projeto-explicito`;
- `movimento-obra`;
- `conciliacao-valor`;
- `sync-openfinance`;
- `caixa-por-conta`;
- `ga1-empresa-nova`;
- `chaves`;
- `cris`;
- `cris-telas`.

### `funcionarios.test` (#15)

Falhava também sem o GA-11. A busca de logs não tinha `ORDER BY`, e a ordem do Postgres não é garantida. Agora ordena por `created_at`.

### `conferir-demo`

Verde com as 10 chaves.

## 7. Conferência no navegador (build de produção, demonstração)

- **Contas, "Todas":** título "Conciliação de Caixa"; abas Contas correntes · Cartões de crédito · Ajustes; seletor com as duas contas; coluna Conta nas listas; nenhum seletor de projeto ou versão.
- **Uma conta pelo seletor:** `?conta=…`; recarregar mantém a escolha; quadro só com a conta; sem coluna Conta.
- **Trocar para Ajustes:** volta para "Todas as contas"; o seletor tem os grupos Contas correntes e Cartões de crédito.
- **Cartões, "Todos":** botão "Subir fatura".
- **Subir a fatura (CSV de 3 linhas):**
  - prévia e "3 lançamento(s) registrado(s)";
  - quadro: fatura importada R$ 2.233, lançado R$ 2.200, diferença R$ 33;
  - a padaria aparece em "Na fatura, sem lançamento", com "Lançar em Despesas →";
  - conciliar a passagem atualiza a tela: de 3 para 2 a conciliar.
- **Sem IA:** a mensagem clara no botão e no chat (caso 12).
- **`/cartoes`:** sem a conferência; com o link para a aba.
- **Empresa criada antes do GA-1** (sem nenhuma chave, dois projetos, duas contas, um cartão, aberta por `/caixa?proj=…&vs=…`): a mesma Conciliação de Caixa, sem "Controle de Caixa", com a coluna Conta e o quadro das duas contas.
- **Servidor:** zero erros.

**Prints:**

- `ga11-contas-todas.png`
- `ga11-contas-uma-conta.png`
- `ga11-cartoes-todos.png`
- `ga11-cartoes-um-cartao.png` (e `…-inteira.png`)
- `ga11-ajustes.png`
- `ga11-empresa-antiga.png`

## 8. Bateria da Cris (§4.3)

**Incompleta.** Ver `docs/revisao/GA11-bateria-cris.md`.

- **Caso 12** (sem IA) passou.
- **Casos 1 a 11** não rodaram: este ambiente não tem chave da Anthropic para o app.
  - O roteiro está no arquivo, para rodar onde a chave estiver.
  - As ferramentas que esses casos usam estão cobertas por teste automático, sem modelo.

## 9. Observação para o GA-9

A foto da Fase 0 (`GA9-numeros-antes.json`) tem as telas do Caixa da tela anterior: com filtro de período, a aba "Conciliação" e os cartões no quadro de saldos.

Depois deste PR, `bash scripts/ga9-foto.sh comparar` deve acusar diferença nas leituras `caixa` (não rodado aqui). É mudança de tela, não de número. As demais telas não mudam.

Quando este PR entrar, a foto deve ser regravada, ou a comparação deve ignorar `caixa`, antes da Fase 3 do GA-9.

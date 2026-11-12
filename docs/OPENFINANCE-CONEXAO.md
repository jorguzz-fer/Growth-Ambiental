# Open Finance: o cliente conecta o banco pela tela

**Revisão 4, Prompt AT §1-B · 12/11/2026**

## O que o cliente vê

1. Em **Contas Correntes** (ou **Cartões de Crédito**), o botão **Conectar
   banco**. Só aparece para quem pode editar Contas, e só quando o servidor tem
   a Pluggy configurada.
2. Antes de abrir o banco, um aviso curto: o que será lido (contas, saldos,
   movimentos, faturas de cartão), para quê (conciliação), por quanto tempo
   (o prazo do consentimento dado no banco) e como desconectar.
3. A janela da **Pluggy** abre. O cliente escolhe o banco e autoriza no
   próprio banco. **A senha do banco não passa pelo app.**
4. De volta ao app, para cada conta do banco: associar a uma conta corrente
   ou a um cartão já cadastrado, criar uma conta corrente nova, ou ignorar.
   Cartão precisa estar cadastrado antes (o app precisa dos dias de
   fechamento e vencimento).
5. O app busca os movimentos. Eles chegam **pendentes** na conciliação do
   Caixa; nada é conciliado nem lançado sozinho.

Cada conexão mostra a situação: **conectada** (com a hora da última
atualização), **atualizando**, **precisa de ação** (botão **Reconectar**),
**erro** (com o motivo em linguagem simples) ou desconectada. **Desconectar**
remove a conexão na Pluggy e mantém tudo o que já foi trazido.

O selo diz a verdade: "Open Finance disponível" quando está configurado e
ninguém conectou; "N contas conectadas" quando houver; nada quando não está
configurado.

## Regras de gravação

- Conta corrente → movimento do extrato (`cash_entry`), com o id da transação
  no banco. A mesma transação nunca entra duas vezes.
- Cartão → extrato do cartão (`extrato_cartao`), nunca o extrato da conta.
- Saldo da conta corrente → o saldo que o banco informa (`saldo_source =
  auto`).
- **Transação alterada pelo banco:** se o movimento ainda não foi conciliado,
  atualiza; se já foi, **não muda nada** e fica marcado para revisão.
- **Transação removida pelo banco:** nunca é apagada; fica marcada como
  "removida pelo banco".
- **Primeira busca de uma conta que já recebeu extrato importado:** o
  movimento do banco com a mesma conta, data e valor de um já importado não
  entra. Fica na lista **Possíveis duplicados** (em Contas Correntes) para a
  pessoa dizer "é o mesmo" (o importado passa a ter o id do banco) ou "é
  outro" (entra como novo).
- **Histórico na primeira conexão (BAT-10, provisório, proposta do revisor):**
  desde o dia seguinte ao último dia fechado da empresa, até 90 dias.
- Com a chave "caixa_conciliacao_por_conta" ligada, o movimento nasce só com a
  conta (Prompt AT §3); desligada, na versão Atual mais antiga da empresa.
- O sinal vem do **tipo** da transação (DEBIT sai, CREDIT entra), não do
  sinal do valor.

## Configuração no servidor (Coolify)

Variáveis:

| Variável | O que é |
| --- | --- |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | Credenciais da conta Pluggy (painel da Pluggy) |
| `PLUGGY_ENV` | `sandbox` (padrão: mostra os bancos de teste da Pluggy) ou `producao` |
| `PLUGGY_WEBHOOK_SECRET` | Um segredo longo e aleatório. A Pluggy manda no cabeçalho `x-webhook-secret`; sem ele, o webhook responde 401 |
| `OPENFINANCE_CRON_SECRET` | Outro segredo, para a sincronização diária |
| `NEXT_PUBLIC_APP_URL` | O endereço público do app (já existe) |

1. **Registrar o webhook (uma vez):**

   ```
   PLUGGY_CLIENT_ID=... PLUGGY_CLIENT_SECRET=... PLUGGY_WEBHOOK_SECRET=... \
   NEXT_PUBLIC_APP_URL=https://app.growthtools.com.br npx tsx scripts/openfinance-webhook.ts
   ```

   Cria na Pluggy o webhook de todos os avisos para
   `/api/openfinance/webhook`, com o cabeçalho secreto. Não cria um segundo se
   já existir.

2. **Sincronização diária (a rede de segurança, 1-B.7):** no Coolify,
   *Scheduled Tasks*, uma vez por dia (por exemplo, 6h), no contêiner do app:

   ```
   wget -q -O- --header "x-cron-secret: $OPENFINANCE_CRON_SECRET" --post-data "" http://localhost:3000/api/openfinance/sync
   ```

   É o mesmo código do webhook, com as mesmas regras.

## O que a Pluggy fala com o app (conferido no SDK oficial)

A documentação web da Pluggy não abre a partir do ambiente de desenvolvimento.
Endpoints, campos e avisos foram conferidos no **SDK oficial** (`pluggy-sdk`
0.94.2 no npm, `client.ts` e `types/*`), e o widget no `pluggy-connect-sdk`
2.14.2 (o pacote que o app usa).

- `POST /auth`, `POST /connect_token` (com `options.clientUserId` =
  empresa:usuário), `GET /items/{id}`, `DELETE /items/{id}`,
  `GET /accounts?itemId=`, `GET /transactions?accountId=&from=&to=` (paginado),
  `GET /transactions/{id}`, `POST /webhooks` com `headers`.
- Avisos tratados: `item/created`, `item/updated`, `item/error`,
  `item/waiting_user_input`, `item/waiting_user_action`, `item/login_succeeded`,
  `item/deleted`, `transactions/created`, `transactions/updated`,
  `transactions/deleted`. Cada aviso é gravado uma vez pelo `eventId`.
- Item de outra empresa (o `clientUserId` não é desta empresa) é recusado.

## Em aberto

- **BAT-9 · Contrato da Pluggy:** quem é o titular (a Growth Tools com um
  contrato para todos os clientes, ou cada cliente com o seu) e se o custo por
  conexão entra no plano ou é repassado. O código funciona nos dois casos (as
  credenciais são do servidor).
- **Vídeo do sandbox** (relatório 1-B): depende das credenciais da Pluggy, que
  esta sessão não tem. Com elas, o roteiro é: conectar o banco de teste da
  Pluggy, associar uma conta e um cartão, ver os movimentos chegarem, ver a
  conta em "precisa de ação" e desconectar.

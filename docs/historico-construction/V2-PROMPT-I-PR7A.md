# Prompt I · PR I-7a — terceiros e restituições: inventário e primeiras correções

Sétima PR de código do Prompt I (parte **a**), conforme
[`V2-PROMPT-I-FASE1.md`](./V2-PROMPT-I-FASE1.md). Seções 20 a 27. O
inventário abaixo é o "inventário próprio" que a Fase 1 pediu para estes
arquivos. **Nenhum registro gravado é alterado. Sem migração.**

## Inventário (§20–§27) — o que foi achado

| § | Achado | Esta PR | Fica para |
|---|---|---|---|
| **20** | `criarDespesaTerceiro` no modo "vincular por PED" só marcava `pagoPorTerceiro`; o status ficava "A pagar". A despesa aparecia **ao mesmo tempo** como "a pagar ao fornecedor" (Pendente de Contas a Pagar) e "a restituir ao terceiro" (linha da obrigação) pelo mesmo valor | status vira **"Pago"** ao vincular (como já era no modo "despesa nova"); `pagoPorTerceiro` continua impedindo a saída de caixa. Auditoria guarda o status anterior | — |
| **11.7** | vincular PED não conferia versão: aceitava PED de Previsão e de versão congelada; restituição avulsa, em lote e repasse não conferiam `locked` | recusa nos quatro caminhos | — |
| **21** | a saída de caixa da restituição (e a entrada do repasse) cai na **obra da tela**, não na da despesa (B11, respondido: opção 2) | — | **I-7b**, atrás de chave, com prévia. Ver a pergunta abaixo |
| **22** | `registrarRestituicao` e `registrarRepasse` recebiam `cashEntryId` do navegador e faziam `UPDATE cash_entry WHERE id = ?` **sem empresa**; a checagem "já usado" também era sem empresa. `updateProject`/`deleteProject` já têm a empresa no `where` (Prompt A, 38) | o item do extrato precisa existir **nesta empresa**; `where` com empresa nos dois lugares | — |
| **23** | a busca do lote carregava **todas** as despesas da empresa; o cancelamento devolvia o valor **inteiro à obrigação âncora** (100 = A 30 + B 70 devolvia 100 a A). A contagem de vínculos da despesa (I-1) ignorava a restituição **avulsa** (só contava itens de lote) | busca só pelos PEDs das obrigações; cancelamento desfaz **item a item** com trava; avulsa conta como vínculo | — |
| **24** | feito na I-3 (cancelamento lógico) | — | — |
| **25** | `getRestituicoesPendentesByVersion` ordenava por data em texto (agrega por mês, ordem sem efeito no número) | chave cronológica | — |
| **26** | `getSaldosPorTerceiro` usa `valorRestituido` (que **inclui compensações**); `getContaCorrenteTerceiros` reconstrói só por restituições (**ignora compensações**, não mostra recebimento, repasse nem estorno). As duas visões divergem quando há compensação — exatamente o que a seção proíbe | — | **I-7b**: uma função só de movimentos (desembolso, restituição, recebimento, repasse, compensação, estorno) e conferência de que os saldos batem |
| **27** | `compensarSaldos` revalidava só `/restituicoes` | também `/contaspagar` | — |

## Pergunta em aberto (B11, lote) — para o Fernando

A decisão B11 (opção 2) diz: *"em lote, a saída única seria **dividida por
obra**, conforme os PEDs abatidos"*. O prompt (§21) diz o contrário para a
mesma situação: *"operação que abrange várias obras **preserva a saída única**
e usa relações de alocação"* — e a alocação já existe (`restituicao_item` →
obrigação → despesa → obra). O acerto contábil (§18, PR I-4) seguiu a linha
do prompt: uma saída, memória de alocação, leitura por obra na camada
analítica (I-8).

| Opção | Efeito |
|---|---|
| **A · dividir** (texto da B11) | uma restituição em lote de 100 (A 30 + B 70, obras diferentes) gera **dois** lançamentos de caixa, 30 na obra de A e 70 na de B. Fluxo por obra certo já; a conciliação com o extrato vê 2 linhas para 1 movimento bancário |
| **B · saída única + alocação** (texto do §21, recomendada) | **um** lançamento de 100 na obra do PED mais antigo; `restituicao_item` diz quanto é de cada obra; o Fluxo por obra passa a ler isso na I-8, junto com o acerto. Uma linha no extrato, uma no caixa |

A I-7b implementa a restituição **avulsa** e o **repasse** seguindo a
despesa/recebimento (não há ambiguidade). O **lote** espera esta resposta.

## Arquivos

- `src/lib/actions/restituicoes.ts` (`criarDespesaTerceiro`,
  `registrarRestituicao`, `cancelarRestituicao`, `getRestituicoesPendentesByVersion`);
- `src/lib/actions/restituicao-lote.ts` (`confirmarRestituicaoLote`, `compensarSaldos`);
- `src/lib/actions/recebimento-terceiro.ts` (`registrarRepasse`);
- `src/lib/despesa-vinculos.ts` (restituição avulsa conta).

## Verificação

- `terceiros-integridade.test.ts` (Postgres): vincular PED → Pago e pago por
  terceiro, some do Pendente, obrigação com saldo 100, auditoria com status
  anterior; PED de Previsão e versão congelada recusados; item do extrato de
  outra empresa recusado (e fica sem conciliar), o desta empresa conciliado;
  avulsa conta como vínculo; lote 30 + 70 cancelado devolve 30 a A e 70 a B;
  versão congelada bloqueia avulsa, lote e repasse.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

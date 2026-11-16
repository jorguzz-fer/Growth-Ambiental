# Regras contábeis do Growth Construction

Documento de referência para o cliente e para a contabilidade externa. Descreve,
em linguagem de negócio, as dez regras que o sistema trata como invariantes —
não como convenção de tela. Cada uma tem teste automatizado; se o código violar
uma delas, é o código que está errado.

---

## RG-01 — Competência não é caixa

A **DRE** é montada pela **competência** do lançamento: o mês em que o custo ou a
receita pertence economicamente, independente de quando o dinheiro se move.

O **fluxo de caixa** é montado pela **data em que o dinheiro entra ou sai**.

As duas datas nunca se misturam na mesma coluna de um relatório. Uma despesa de
março paga em junho aparece em março na DRE e em junho no caixa — as duas coisas
estão certas ao mesmo tempo.

*No sistema:* a DRE lê a competência do lançamento. O Fluxo de Caixa apresenta
**Previsto** (por vencimento, o que se espera pagar/receber) e **Realizado** (por
liquidação, o que de fato passou pela conta) lado a lado.

## RG-02 — Uma receita, um reconhecimento

Uma mesma receita entra na DRE **uma única vez**, no momento do fato gerador —
a venda, a medição, o contrato — não importa por quantas mãos o dinheiro passe
até chegar à empresa.

*Caso concreto:* o sócio recebe do cliente final e depois repassa à empresa. A
receita foi reconhecida **na venda**. O repasse é baixa de conta a receber; não
gera segunda linha de receita. Contabilizar as duas vezes dobraria receita e
resultado.

## RG-03 — Restituição não é receita nem despesa

Quando um terceiro paga um fornecedor pela empresa:

| Momento | O que acontece | DRE | Caixa |
|---|---|---|---|
| Lançamento da despesa | a empresa reconhece o custo e passa a dever ao terceiro | entra, na competência | não se move |
| Restituição ao terceiro | a empresa devolve o dinheiro | **não entra** | sai |

Efeito líquido na DRE: **uma única despesa**. A restituição só quita uma dívida
já registrada — a empresa nunca teve ganho.

## RG-04 — Repasse de recebimento por terceiro

Espelho da regra anterior, do lado da receita:

| Momento | O que acontece | DRE | Caixa |
|---|---|---|---|
| Terceiro recebe do cliente | a empresa passa a ter valores a receber dele | não entra (já foi na venda) | não se move |
| Terceiro repassa à empresa | o dinheiro chega | não entra | entra |

## RG-05 — Encontro de contas

Quando o mesmo terceiro deve à empresa e a empresa deve a ele ao mesmo tempo, os
dois saldos podem ser compensados, gerando um documento próprio. A compensação
não passa pela DRE.

Os **dois saldos brutos são sempre exibidos antes** da compensação — divulgação
bruta, liquidação líquida.

## RG-06 — Número interno não é documento fiscal

São duas coisas diferentes, e ambas existem:

- **PED** — numeração **interna** da empresa. Gerada pelo sistema, contínua, sem
  lacunas, **imutável depois de criada**. Serve à controladoria e à
  rastreabilidade. Não é digitada por ninguém.
- **Documento fiscal** — número da NF-e / NFS-e / recibo, informado pelo usuário,
  com tipo, série e chave. É **opcional no momento do lançamento**, porque a nota
  costuma chegar depois, e pode ser completado a qualquer tempo.

Um nunca substitui o outro.

## RG-07 — Juros de mora não são custo de obra

Juros e multas por atraso no pagamento a fornecedor são **despesa financeira do
período**, não custo da obra.

*Fundamento:* o CPC 20 autoriza capitalizar no ativo apenas encargos de
financiamento diretamente atribuíveis à construção. Juros punitivos por
inadimplência não são custo de obtenção de recursos — são perda operacional.
Capitalizá-los inflaria o custo da obra e adiaria o reconhecimento do prejuízo.

Descontos obtidos por antecipação ou negociação são **receita financeira**, pela
mesma lógica, também fora do custo da obra.

## RG-08 — Pagamento em lote fecha na vírgula

Um pagamento único que quita várias despesas gera **uma saída de caixa** e **N
baixas**. A soma das baixas mais a diferença financeira (juros ou desconto) é
exatamente igual ao valor que saiu da conta.

Tolerância de arredondamento: R$ 0,01 por parcela, com a diferença residual
ajustada na última.

## RG-09 — Nada se apaga; tudo deixa rastro

Documentos com efeito contábil não são excluídos — são **estornados** por um
documento de estorno vinculado, que preserva os dois lados da história.

Toda alteração registra quem fez, quando, qual campo mudou, o valor anterior e o
valor novo.

## RG-10 — Cada empresa vê só o que é dela

Toda numeração, saldo e relatório é isolado por empresa. Nenhuma consulta cruza
a fronteira entre tenants.

---

## Regras novas não são retroativas

As validações deste pacote — categoria de natureza correta, valor obrigatório,
documento fiscal — valem para **lançamentos novos**.

Lançamentos antigos que as violem **continuam legíveis, editáveis e íntegros**.
Eles não são bloqueados, alterados nem excluídos: aparecem nas telas de
conferência (`Config → Conferência de lançamentos` e `Conferência de planos`), e
só mudam por decisão humana, item a item, com preview antes e registro de
auditoria depois.

Nenhuma correção de dado histórico acontece automaticamente. Em nenhuma hipótese.

---

## Onde cada regra vive no sistema

| Regra | Tela / módulo |
|---|---|
| RG-01 | DRE (competência) e Fluxo de Caixa (Previsto × Realizado) |
| RG-02, RG-04 | Restituições → recebimento e repasse por terceiro |
| RG-03 | Restituições → despesa paga por terceiro |
| RG-05 | Restituições → encontro de contas |
| RG-06 | Despesas → nº do pedido (interno) e bloco Documento fiscal |
| RG-07, RG-08 | Acerto Contábil → painel de fechamento e diferença |
| RG-09 | Config → Log de Auditoria |
| RG-10 | Todas — o isolamento é estrutural, não uma opção de tela |

## Acerto contábil, em uma frase

Um pagamento único que quita várias despesas gera **uma saída de caixa**, **N
baixas** e, quando o valor transferido não bate com a soma das despesas, **uma
linha de despesa ou receita financeira** com a diferença — nunca um acréscimo ao
custo das obras.

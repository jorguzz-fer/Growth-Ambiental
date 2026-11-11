# Medição do Prompt AR, Fase 1 — leitura do plano de pagamento (Revisão 4, Etapa 4)

**Data:** 11/11/2026 · **Natureza:** somente leitura · **Spec:** `docs/revisao/SPEC-REVISAO-2026-11.md`, Anexo C

Nada foi alterado no código das telas nem no banco. Esta etapa entrega:

- o script de medição;
- a conferência dele;
- as respostas que vêm do código (itens 3 e 4).

Os números da produção saem quando o script rodar lá.

## Como medir na produção

```
DATABASE_URL=postgres://... npx tsx scripts/medicao-ar.ts > medicao-ar-producao.md
```

**Somente leitura de verdade.** O script abre a conexão com
`default_transaction_read_only = on` e põe essa conexão no lugar do cliente do
app antes de carregar qualquer código dele. Assim, até as funções do app que o
script usa (o INCC da obra, as chaves da empresa) leem por ela. O Postgres
recusa qualquer gravação nessa conexão:

- testado: um `INSERT` deu "cannot execute INSERT in a read-only transaction";
- o script confere o modo no começo e para se não estiver em leitura.

**O que sai:**

- só nome da empresa, nome da obra, contagens e somas;
- nenhum dado de comprador;
- nenhum código de unidade.

**As três leituras são as funções do próprio app, não uma cópia:**

- `expandUnitReceivables`;
- `calcProjectionBySource`, com o INCC da obra, como a tela usa;
- `calcTotals`, nas duas definições.

Os números saem iguais aos que as telas mostram.

## Conferência do script (banco local)

Rodei o script num banco local com uma empresa de teste e as quatro variações
da unidade `bla401()` que a spec usa:

- **A:** plano completo;
- **B:** `usarS2` desligado;
- **C:** subsídio pendente;
- **D:** Sinal 1 em 3 parcelas.

A unidade A também tem a permuta registrada e revendida. Resultado:

| Medida | Esperado (spec) | Script |
| --- | ---: | ---: |
| Recebíveis | 555 + 555 + 555 + 565 = 2.230.000 | R$ 2.230.000,00 |
| Projeção | 530 + 525 + 520 + 540 = 2.115.000 | R$ 2.115.000,00 |
| Totais, definição nova | 465 × 3 + 475 = 1.870.000 | R$ 1.870.000,00 |
| Totais, definição antiga | 465 × 4 = 1.860.000 | R$ 1.860.000,00 |
| Seção com chave desligada · subsídio pendente · financiamento · permuta do plano · sinal parcelado | 1 · 1 · 4 · 4 · 1 | 1 · 1 · 4 · 4 · 1 |
| BAR-7: com permuta no plano · delas, registradas na tabela | 4 · 1 | 4 · 1 |

A empresa de teste foi apagada depois.

## 1 e 2 · Por empresa e obra (produção)

**Falta rodar.** Esta sessão não tem acesso ao banco de produção. O script
gera as duas tabelas pedidas e a do BAR-7:

- **Tabela 1:** por obra, quantas unidades vendidas têm:
  - uma seção com valor e a chave `usar*` dela desligada;
  - subsídio não recebido;
  - financiamento;
  - permuta no plano;
  - S1, S2 ou S3 parcelado.
- **Tabela 2:** por obra, o total pelas três leituras e a diferença em R$.
  - Diz também qual definição o Resumo usa naquela empresa (chave
    `resumo_definicao_nova`).
- **BAR-7:** unidades com permuta no plano que também estão na tabela de
  permutas. Mostra o valor do plano e o valor da revenda registrada.

## 3 e 4 · Onde cada total aparece, e com qual rótulo

(preenchido abaixo, a partir do código)

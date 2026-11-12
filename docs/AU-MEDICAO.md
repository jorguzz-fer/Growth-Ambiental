# Medição do Prompt AU, Fase 1 — custo real da IA (Revisão 4, Etapa 8)

**Data:** 12/11/2026 · **Natureza:** somente leitura ·
**Spec:** `docs/revisao/SPEC-REVISAO-2026-11.md`, Anexo E

## Situação das decisões

As BIA-1 a BIA-6 foram **adiadas pelo dono em 12/11/2026**. Por enquanto a
plataforma arca com o custo da IA, com a própria chave da Anthropic, sem planos
nem cota por empresa. Esta medição serve para a plataforma acompanhar quanto
gasta e para a decisão futura dos planos.

## O que foi entregue

- **`src/lib/ai/precos.ts`:** a tabela de preços por modelo, com a data
  (03/11/2026) e a fonte (tabela de preços da API da Anthropic). Já era o
  arquivo previsto na Fase 2.
  - **Cache:** escrita a 1,25× a entrada (cache de 5 minutos, o que o app
    usa); leitura a 0,1× a entrada, ou o valor próprio do modelo (Opus 5.5 e
    Sonnet 5.5: 0,05×).
  - **Haiku 5.5:** muda de faixa acima de 100 mil tokens de prompt.
  - **Modelo fora da tabela:** custo **desconhecido**, nunca zero. O
    relatório lista esses modelos à parte.
  - Testes em `src/lib/ai/precos.test.ts`.
- **`scripts/medicao-au.ts`:** a medição. Abre a conexão com
  `default_transaction_read_only = on` e para se não estiver em leitura.

## Como rodar na produção

```
DATABASE_URL=postgres://... CAMBIO_USD_BRL=<cotação do dia> npx tsx scripts/medicao-au.ts > medicao-au-producao.md
```

`CAMBIO_USD_BRL` é o câmbio declarado do relatório, em reais por dólar. Esta
sessão não tem a cotação nem acesso à produção. Sem o câmbio, o custo sai só
em US$.

## O que o script responde (itens da spec)

| Item | Situação |
| --- | --- |
| 1. Por empresa e mês: chamadas e tokens (entrada, saída, cache), por operação e por modelo | **Sim.** Tabela "1 e 2" |
| 2. Custo em US$ e R$, com fonte, data da tabela e câmbio declarado; conferir com os US$ 6 a 7 da reunião | **Sim.** Tabela por empresa e mês, mais o total do mês com todas as empresas, para comparar com a reunião |
| 3. Por pessoa: chamadas por dia (mediana e p90) e a pergunta mais cara | **Sim.** As pessoas aparecem numeradas por empresa, sem nome nem e-mail |
| 4. Quantas vezes o limite de 30/300 recusou | **Não dá para medir.** A recusa não grava nada em `ia_uso`. Para medir daqui em diante, seria preciso registrar a recusa, sem conteúdo |
| 5. Custo de uma pergunta de análise da Etapa 7 (AC-T1), com o modelo de verdade numa empresa de teste | **Pendente.** A análise da Etapa 7 ainda não existe, e esta sessão não tem chave da Anthropic. Mede-se quando a Etapa 7 estiver pronta |
| 6. Tabela final hoje × pacote ampliado (para a BIA-3) | **A coluna "hoje" sai da tabela por empresa e mês.** A coluna do pacote ampliado depende do item 5. A BIA-3 está adiada |

## Conferência local

O teste local usou quatro registros fictícios, apagados em seguida: Sonnet 4.6,
Opus 4.8, um modelo fora da tabela e uma chamada com erro.

- **Sonnet 4.6**, 2.000 de entrada, 500 de saída e 30.000 de cache lido:
  US$ 0,0225 (conferido à mão).
- **Opus 4.8**, 5.000 de entrada, 800 de saída e 12.000 de cache criado:
  US$ 0,12.
- **O modelo fora da tabela** aparece como "custo desconhecido", fora das
  somas.
- **A chamada com erro** conta como chamada e não tem custo.

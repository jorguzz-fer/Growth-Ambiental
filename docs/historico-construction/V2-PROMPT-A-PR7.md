# Prompt A · PR 7 — Planejamento (parte 1)

Orçamentos, Previsão, Medição (relatório e lançamento), Parâmetros/INCC e
Simulador. **Versões** (a tela, a exportação e o modelo) vêm na próxima PR.

Mesmo padrão das anteriores: a obra vem da URL (`?proj=`), e cada aba lembra a
última obra escolhida (B-A2). Sem obra, a aba reabre a lembrada ou a tela pede
a escolha.

## Telas

| Tela | Antes | Agora |
|---|---|---|
| Orçamentos, Previsão | `?proj=` → obra do cookie → **primeira obra** | `?proj=` ou memória da aba; senão pede |
| Medição (relatório) | obra do cookie, **sem seletor** | seletor (só obras) + memória |
| Lançamento de Medição | `?proj=` → obra do cookie → primeira obra; seletor só com 2+ obras | `?proj=` ou memória; seletor sempre visível |
| Parâmetros/INCC, Simulador | obra do cookie, **sem seletor** | seletor + memória |

Medição usa a mesma escolha de versões de antes, agora nas versões da obra da
tela: a primeira Budget para o orçado e a versão de trabalho para o realizado.
As telas de Medição só oferecem obras (`kind = proj`). Uma memória de aba que
aponte para um escritório é ignorada, e a tela pede a escolha.

## Gravações

- **`addMedicao`**: a obra passa a ser **obrigatória** e validada na empresa,
  e a medição vai para a versão de trabalho dela. Antes, sem obra no
  formulário, caía na obra do cookie.
- `planning.ts` (Orçamentos e Previsão) e `incc.ts` já recebiam versão e obra
  explícitas, validadas na empresa. Só trocaram para `getTenantContext`.

## Verificação

- `planejamento-projeto-explicito.test.ts` (Postgres, com `getActiveContext`
  proibido):
  - medição sem obra é recusada;
  - obra de outra empresa é recusada;
  - a medição vai para a obra informada, que não é a primeira;
  - versão congelada bloqueia.
- Suíte inteira: 850 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador (build de produção):
  1. as seis telas, em aba nova, pedem a escolha;
  2. depois de escolher a OBRA 7 em Parâmetros, as outras cinco abrem nela;
  3. nenhum erro de JavaScript.

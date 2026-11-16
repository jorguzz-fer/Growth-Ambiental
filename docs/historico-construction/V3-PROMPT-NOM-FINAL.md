# Prompt NOM · Nomenclatura das versões — relatório final

Executado em 15/10/2026 sobre o `main` depois do PR #261. Prompt em
[`V3-PROMPT-NOM.md`](./V3-PROMPT-NOM.md).

## 1. O que foi feito

Os três nomes (Orçamento, Previsão Atualizada, Atual) passam a ser os únicos
nomes de versão visíveis ao usuário. 16 arquivos; só rótulos e mensagens.

- **DRE:** o cenário do movimento real chama-se "Atual" na coluna, no
  seletor de cenários e no seletor de tipo de versão. O seletor perdeu
  "Forecast" e "Budget".
- **Chat do assistente:** cenário "Atual" em vez de "Realizado (Atual)";
  sem cenário na pergunta, o chat diz que usa a Atual.
- **Chaves de mudança:** a prévia da chave do rascunho nomeia "Atual" em vez
  de "Realizado" para o projeto sem cenário.
- **Gestão de Acessos:** as permissões `budget` e `forecast` aparecem como
  "Orçamentos" e "Previsão Atualizada" na matriz.
- **Orçamentos / Previsão Atualizada:** botão "Importar do Orçamento"; o
  aviso de período ausente fala em Orçamentos e Previsão Atualizada.
- **Mensagens de erro** das actions de planejamento e da exportação.
- **Console da plataforma:** texto da nova conta.
- **Rótulo padrão de versões novas** (conta nova e projeto novo): "Orçamento"
  e "Previsão Atualizada" em vez de "Budget / Orçamento" e "Previsto /
  Forecast".
- **Base de conhecimento do assistente do produto:** as duas menções a
  "Realizado" como cenário da DRE.

## 2. BNOM-1

Decidido no prompt: "Realizado" vira "Atual". Se o dono preferir manter
"Realizado" na DRE, é uma linha em `dre.ts` e uma em `assistente-chat.ts`.

## 3. O que não mudou

- `kind` no banco, rotas, nomes de função e comentários.
- `version.label` das versões já gravadas (dado da empresa).
- "previsto" e "realizado" como conceitos do Fluxo de Caixa, do card Orçado x
  Realizado e da Medição.
- `lancamento-screen.tsx` ganhou o título novo, mas **não tem página nem
  importador**: é código morto desde que `/lancamento` saiu. Candidato a
  remoção em prompt próprio; não removido aqui para não misturar.

## 4. Preservação de dados

Nenhuma migração. Nenhuma linha gravada, alterada ou apagada.

## 5. Acesso

Nenhuma permissão criada, ampliada ou reduzida. Só o rótulo de duas
permissões existentes mudou.

## 6. Testes

| Comando | Resultado |
|---|---|
| `npm run typecheck` | sem erro |
| `npm run lint` | sem aviso |
| `npm test` | 135 arquivos, 1426 testes passando; 78 arquivos pulados por exigirem banco (`HAS_DB`) |

Um teste ajustado: `dre.test.ts`, título da coluna da Atual.

## 7. Limitações

- Os testes que dependem de banco não rodaram neste ambiente. Nenhum deles
  afirma rótulo de versão (varredura por "Realizado", "Lançamento Budget",
  "Atual (real)" e "Importar do Budget" nos `*.test.ts`).
- `previsao-regras.test.ts` usa "Budget / Orçamento" como *nome gravado* de
  uma versão de exemplo. É dado de teste, não rótulo do sistema; ficou.

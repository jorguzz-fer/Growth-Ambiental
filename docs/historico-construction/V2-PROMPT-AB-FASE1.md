# Prompt AB · Remoção de três telas — Fase 1, bloqueios

Prompt AB (34 de 42): Projeção de Receitas, Consolidado e Balanço do Dia.
**Só leitura; nada foi removido.** SQL em
[`sql/v2-prompt-ab-diagnostico.sql`](./sql/v2-prompt-ab-diagnostico.sql).

## Resultado: nenhuma das três sai nesta leva

O próprio prompt manda: **"Se alguma pergunta ficar sem dono, a tela
correspondente não sai nesta leva"** (BAB-1). O BAB-3 manda **perguntar ao
cliente** sobre as exportações antes de remover. As três estão presas a
uma das duas condições. Remover agora tiraria um número ou um histórico que
alguém usa. As telas ficam como estão, e as perguntas foram para o dono.

## BAB-1 · Quem passa a responder cada pergunta

| Tela | A pergunta | Quem responderia | Situação |
|---|---|---|---|
| Projeção de Receitas | quanto entra **por fonte**, mês a mês, comparando versões | O **Fluxo de Caixa** mostra a entrada prevista mês a mês e compara versões, **mas não por fonte**. Nenhuma outra tela separa por fonte. | **Sem dono** para "por fonte". Pelo Prompt I, seção 57, a separação por fonte é o vocabulário antigo. Se o dono aceitar perdê-la, o destino é o Fluxo de Caixa. |
| Consolidado | comparativo de versões somando várias obras | A **DRE** soma a "Empresa toda" por tipo de versão, mas **não põe versões lado a lado**. O relatório customizado é a Parte 7 do Prompt AA, que ainda não existe. | **Sem dono** até o Prompt AA, Parte 7. |
| Balanço do Dia | quais dias foram fechados: saldo inicial, entradas, saídas, divergência, quem e quando | O Prompt L **manteve o Balanço do Dia como o histórico** (L 9.8 e 9c). O Caixa fecha o dia, mas não lista os dias fechados. | **Sem dono.** Ver BAB-2. |

## BAB-2 · `daily_closing` e `carry_over`

- **O Balanço do Dia é o único leitor de `daily_closing`.** O Prompt L tirou
  `/fechamento` e deixou o histórico aqui, de propósito.
- O Caixa **não** exibe a lista de dias fechados com os sete campos.
- Remover a tela agora criaria exatamente a "tabela morta" que o prompt
  proíbe.
- `carry_over` continua como o Prompt L deixou: nada grava, nada lê, e
  nenhuma linha foi apagada. Base local: 0 linhas.
- Base local: 0 fechamentos. Produção: relatório 2 do SQL.

## BAB-3 · Quem consome as exportações

| Tela | Saída |
|---|---|
| Projeção | "Exportar" em CSV (`ProjecaoExport`) |
| Consolidado | sem botão de exportar na página atual |
| Balanço do Dia | "Imprimir" e "Exportar CSV" |

**Pergunta para o cliente:** alguém recebe periodicamente algum desses
arquivos?

## BAB-4 · Funções que ficariam sem chamador

Decisão registrada para quando as telas saírem:
- `calcProjectionBySource`, `PROJECTION_SOURCES` e `emptyBySource`
  **ficam**, marcados como descontinuados, apontando para a seção 58 do
  Prompt I. São a única leitura que respeita as flags `usar*` e o INCC.
- `getRevenueBySource` sai junto com as telas.

Nada disso foi feito agora, porque as telas não saem.

## BAB-5 · Varredura de menções

| Onde | Menção |
|---|---|
| `nav-menu.ts` | três itens de menu |
| `nav-menu.test.ts` | a referência do menu antigo |
| `actions/receitas.ts` | `revalidatePath` de `/projecao` e `/consolidado`, duas listas |
| `actions/incc.ts` | `revalidatePath` de `/projecao` e `/consolidado` |
| `actions/fechamento.ts` | `revalidatePath("/balancodia")`, duas vezes |
| `consolidado-controls.tsx` | `router.push("/consolidado?...")`, componente exclusivo |
| `projecao-controls.tsx` | `basePath = "/projecao"`, **compartilhado**: o Fluxo de Caixa usa `ProjecaoYearSelect` |

Não há rota `export/route.ts` própria das três. As saídas são CSV no
navegador.

## O que fica pronto para quando o dono responder

- **Redirecionamento com aviso**, no padrão de `telas-removidas.ts`:
  - Projeção vai para o Fluxo de Caixa.
  - Consolidado vai para a DRE, ou para o relatório do Prompt AA.
  - Balanço do Dia vai para o Caixa, só depois de o Caixa listar os dias
    fechados.
- **Contagem de antes e depois:** relatório 1 do SQL.

## Perguntas para o dono

1. **Projeção:** pode perder a separação **por fonte**? Se puder, ela sai e
   leva ao Fluxo de Caixa.
2. **Consolidado:** espera o relatório customizado do Prompt AA, ou a DRE
   "Empresa toda" já basta?
3. **Balanço do Dia:** quer a lista de dias fechados dentro do Caixa? Só
   depois disso a tela pode sair.
4. **Exportações:** alguém recebe o CSV da Projeção ou do Balanço do Dia?

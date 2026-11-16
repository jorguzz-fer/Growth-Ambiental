# Prompt AC · AC-2 — o que some, o regime, o eixo, ausência × zero

Partes 3.2, 4, 5, 7 e 9, e a nota da Parte 6. **Nenhum total muda.**

## Partes 4 e 5 — o rodapé do que não entra na cascata

- **Nova função `foraDaCascataDaVersao`**, em `dre-inputs.ts`. Ela lê as
  **mesmas** linhas que a DRE lê (`getExpenseRows`) e só conta. A conta é
  feita pela regra pura `resumirForaDaCascata`, em `dre.ts`.
- O rodapé fica **fora da cascata**, nunca somado em outra linha, e é
  separado por coluna. Ele leva para a Conferência. Mostra:
  - **sem categoria:** "R$ X em N lançamento(s) sem categoria não entram
    nesta demonstração";
  - **sem competência:** diz em qual modo está sendo somado. No Acumulado:
    "estão somados neste Acumulado, mas não aparecem em nenhum mês nem
    ano". Em período: "não estão nesta visão: só entram no Acumulado";
  - **categoria fora da lista:** a grafia encontrada, o valor e a
    contagem.
- **5.2:** cada linha de item tem a sua chave pela constante
  (`CHAVE_DA_LINHA`). "(−) Investimentos" lê `Investimento`. Um teste
  garante que toda linha da cascata tem chave.
- **5.3:** `byCat["Receita"]` e `byCat["Custo Variável"]` ganharam
  comentário. A cascata não os soma; eles servem só para saber se a linha
  teve lançamento. A lógica não mudou.

## Parte 3.2 e a nota da Parte 6

Uma nota abaixo da tabela declara o regime de cada bloco:
- despesas por competência;
- receita e contas a receber pelo vencimento;
- liberações e permutas pela liquidação;
- encargos pela data de pagamento.

A mesma nota diz que Retiradas, Investimentos e Empréstimos estão na
cascata, como hoje, e que a classificação aguarda decisão (BAC-3).

## Parte 7 — o eixo de meses

- O eixo **mostrado** passou a ser a janela de cada projeto, de
  `start_date` a `end_date` (Prompt I, seção 55), unida às competências com
  lançamento. A tabela INCC deixou de governar o eixo.
- Projeto sem datas e sem lançamento mostra o motivo, em vez de eixo vazio.
- **Uma exceção, para nenhum total mudar:** o período personalizado com
  limite aberto ("a partir de" ou "até") continua filtrando pelos meses da
  tabela INCC, como antes. A regra nova para ele vai para a chave da DRE
  (AC-3).

## Parte 9 — ausência × zero

- Célula de linha **sem nenhum lançamento** mostra "—", com a dica "Sem
  nenhum lançamento nesta linha".
- Soma que deu zero mostra "R$ 0".
- Subtotais são sempre conta.
- **9.2:** `brl0` arredonda para inteiro. `clampZero(−0,40, 0)` dá 0, então
  −R$ 0,40 aparece como "R$ 0". A função não foi alterada, porque é usada
  no sistema inteiro.

## Testes

- `dre.test.ts`:
  - resumo e frases do rodapé nos dois modos;
  - soma entre versões;
  - janela do projeto e eixo;
  - chave de toda linha;
  - presença × zero.
- `dre-equivalencia.test.ts` continua passando, com os mesmos totais.
- Navegador, com dois lançamentos temporários depois apagados:
  - o rodapé no Acumulado e em 2026;
  - "—" nas linhas sem lançamento;
  - o eixo mensal pelas competências.

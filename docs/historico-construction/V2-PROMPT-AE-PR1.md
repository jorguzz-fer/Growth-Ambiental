# Prompt AE · AE-1 — o Resumo diz o que cada número é

Partes 2.1, 2.2 (opção 2), 2.8, 3.5, 3.7, 4.2, 4.3 e 4.4. **Nenhum número
muda.** No navegador, antes e depois, na EMPREENDIMENTO PILOTO (Atual, Previsão e as três
comparadas), os valores e o cartão de unidades ficaram iguais. Só mudaram as
células sem base, que passaram de "R$ 0" a "—".

## O que mudou

- **2.1 · VGV × vendidas:**
  - A linha diz "VGV total (tabela de preços, **todas as unidades**)".
  - Uma nota diz que Sinais a Subsídio contam **só as vendidas**.
  - Ao parar o mouse sobre cada linha, aparece a base dela.
- **2.2, opção 2 · INCC:** "Mensais (c/INCC p.5+)" passou a "Mensais
  (**nominal, sem INCC**)", e o mesmo em Semestrais e Anuais. O rótulo deixou
  de afirmar uma correção que não é feita. **O valor é o mesmo.** Aplicar o
  INCC fica para a seção 58 do Prompt I.
- **2.8 · o selo do financiamento:** passou de "não gera projeção" (vermelho)
  a "**não entra nos totais desta tela**". O financiamento é projetado na
  Projeção, na DRE e no Fluxo.
- **3.5 · fora da Atual:**
  - Quando a tela mostra Orçamento ou Previsão, um aviso diz que são
    valores de planejamento, não o contratado.
  - Sem Atual na obra, o aviso diz isso.
- **3.7 · a 4ª versão** é avisada, não troca a primeira. O seletor mostra a
  natureza e marca as cópias. Ele desceu para baixo do título.
- **4.2 · período na comparação:** o filtro de data sai do modo comparação,
  onde não tinha efeito. Uma nota diz que o período não se aplica ali.
- **4.3 · o rodapé** só cita "os recebimentos previstos acima" quando esse
  cartão existe. Sem datas, ele explica como ver o período.
- **4.4 · ausência ≠ zero:** sem unidade vendida, sem permuta ou sem
  liberação na versão, a linha mostra "—", não "R$ 0".

`src/lib/resumo-tela.ts` monta as 12 linhas com os **mesmos valores** de
`calcTotals` e da busca por tipo de antes. As correções que mudam número
(2.3, 2.4, 2.6 e 2.7) vão na chave do AE-2.

## Testes

- `resumo-tela.test.ts`:
  - os valores são iguais aos de `calcTotals` e da busca por tipo;
  - nenhum rótulo fala em INCC;
  - o VGV conta todas e o resto só as vendidas;
  - sem base, a linha fica vazia.
- Suíte inteira passando. tsc, eslint e build limpos.
- Navegador: os números de antes e depois são iguais.

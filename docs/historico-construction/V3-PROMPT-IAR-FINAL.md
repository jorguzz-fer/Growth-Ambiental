# Prompt IAR · A Cris nas telas de relatório — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Revisão de 14/10: "nas telas de
relatório, o assistente faz análises alternativas e simulações".

## O que mudou

- **A Cris agora sabe todas as telas de relatório.** Já sabia a DRE, o Fluxo
  e o Caixa; os prompts deste bloco somaram as duas analíticas e os
  Relatórios Customizados. Este prompt fecha o Dashboard, o Resumo Executivo
  (obra e consolidado) e a Projeção de Receitas (detalhada e comparação).
- **O que cada tela entrega** à Cris é o que ela mostra, agregado:
  - **Dashboard:** os cartões por versão (VGV, realizado, a receber, a
    pagar) e as séries dos dois gráficos;
  - **Resumo:** os indicadores gerais, as unidades por status, os
    recebimentos do período e os indicadores de negócio; no consolidado,
    por tipo de versão e por obra;
  - **Projeção:** o total projetado, as liberações e os meses do recorte; na
    comparação, os totais por fonte de cada versão.
- **Sugestões de análise e simulação por tela**, como "E se a receita dos
  próximos meses cair 10%?" ou "E se 20% das parcelas atrasarem um mês?". A
  regra da Cris já manda dizer a premissa e que nada foi gravado.

## Regras que continuam valendo

- Os números de uma tela só vão ao modelo se a pessoa pode ver a tela.
- Dado pessoal não vai. A Projeção manda só a obra e os totais por mês, sem
  cliente nem unidade.
- O custo no Resumo consolidado só vai para quem vê Despesas, como na tela.

## Acesso e dados

Nada muda. Só leitura.

## Testes

- `src/lib/cris-telas.test.ts` (novo): as nove telas de relatório registram
  o resumo e as sugestões; Resumo e Projeção registram nos dois modos; a
  Projeção não manda dado de cliente.
- e2e: no Dashboard, a Cris abre sabendo a tela e com a sugestão de
  simulação.

**Não verificado:** a qualidade das análises contra o modelo real (sem chave
da API neste ambiente).

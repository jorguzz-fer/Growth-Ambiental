# Prompt RC · Relatórios Customizados — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Decisão de 18/10: tela própria,
com chat próprio; o chat do Dashboard não a substitui.

## O que mudou

- **Tela nova, Relatórios Customizados**, em Business Intelligence.
- **O relatório é uma receita:**
  - a fonte: DRE, DRE por categoria e grupo do plano de contas, ou Fluxo de
    Caixa previsto;
  - as colunas: por cenário (até três), mês a mês ou por obra, com Total;
  - os cenários, a obra ou o escopo, o período e a análise vertical.
- **A receita mora no endereço da página.** Abrir o link refaz o relatório
  com o acesso de quem abre. É o jeito de guardar e de mandar a alguém,
  enquanto BRC-1 não for respondido.
- **Chat próprio.** A pessoa descreve o relatório por texto ou ditado. O chat
  devolve a receita por uma ferramenta, e a tela abre o link dela.
  - Ao modelo vão a conversa e os nomes das obras que a pessoa vê, nunca
    números.
  - A receita volta validada, e obra fora da lista da pessoa não passa.
  - O consumo conta no limite de conversas (operação "relatorio").
- **Campos** montam a mesma receita sem o modelo, então a tela funciona sem
  a chave de IA.
- **Tabela, CSV e PDF.** Os números saem das mesmas funções da DRE e do
  Fluxo, com as mesmas chaves. O aviso de cobertura (obra sem o cenário, ou
  com outra versão no lugar) é o mesmo texto da DRE.
- Depois de montado, a Cris (o chat flutuante) recebe a tabela para analisar.

## Premissas

- **BRC-1** (salvar com nome, dono e compartilhamento, ou só exportar?)
  segue sem resposta. Nada é gravado: o link guarda e o CSV ou PDF exporta.
  Salvar com nome é uma tabela nova, que fica para a resposta.
- As fontes são as que já têm regra fechada: a DRE e o Fluxo previsto. Outras,
  como vendas ou Contas a Pagar, entram uma a uma.
- Até 24 colunas de mês ou de obra. Além disso, a tela avisa e corta, mas o
  Total soma tudo.

## Acesso

- Chave nova `relatorios`. Owner e admin têm acesso por padrão, e os outros
  papéis não; owner ou admin dão acesso na Gestão de Acessos.
- Dentro da tela, cada fonte exige ver a tela de origem: DRE para as duas da
  DRE, Fluxo de Caixa para o Fluxo. A tela não abre número que a pessoa não
  vê nas telas de origem. Nada é ampliado.

## Dados

Só leitura. A conversa não é gravada.

## Testes

- `src/lib/relatorio-custom.test.ts` (novo): validação da receita (domínio,
  obra que a pessoa não vê, ida e volta pela URL, cenários repetidos), a
  tabela da DRE (igual à cascata), por categoria e grupo (grupos de todas as
  colunas), do Fluxo, e o CSV.
- `src/lib/relatorio-custom-db.test.ts` (novo, com banco): o Resultado por
  cenário bate com a DRE; por obra e por mês, as colunas somam o total; o
  Fluxo por obra; e o aviso de cobertura.
- `src/lib/ai/relatorio.test.ts` (novo, modelo simulado): a ferramenta vira a
  receita; vão só os nomes e ids das obras; obra inventada não passa; sem
  ferramenta, não há receita.
- e2e: menu, estado vazio, a DRE mês a mês com vertical pelos campos, o link
  refazendo o relatório, CSV e PDF, e o chat sem chave orientando os campos.

**Não verificado:** o chat contra o modelo real (sem chave da API neste
ambiente).

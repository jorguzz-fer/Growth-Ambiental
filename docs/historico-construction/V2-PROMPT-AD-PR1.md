# Prompt AD · AD-1 — o que some da tela, o desvio e as bases

Partes 3.1, 3.3, 3.4, 5 e 2.2. **Nenhum número muda.**

## O que mudou

- **Módulo puro `src/lib/fluxo-tela.ts`.** Ele monta as linhas a partir de
  `flowMaps` (previsto) e `flowMapsRealizado` (realizado), que continuam
  separados (RG-01). O assistente da Parte 4 vai ler este resultado, e não
  calcular por conta própria.
- **3.1 · o eixo inclui o mês que só tem realizado.** Antes, um pagamento em
  mês sem previsão não tinha linha. Nenhum total muda, porque nesses meses o
  previsto é zero e o acumulado não se mexe. Um teste compara com o cálculo
  antigo.
- **3.3 · caixa sem data.** `flowMapsRealizado` passou a **contar** o que
  descarta, e a tela mostra fora da tabela quantos lançamentos são e a soma.
- **3.4 · mês vazio.** "Saldo do mês" mostra "—", não "R$ 0".
- **Parte 5 · o desvio entra na tela.**
  - Duas colunas: **Desvio** (saldo realizado − saldo previsto do mês, com
    sinal) e **Desvio %**, sobre o |previsto|.
  - Só existe onde há os dois lados. Com um lado só, a célula diz "sem
    realizado" ou "sem previsto", e nunca o valor cheio.
  - A linha **TOTAL** soma o desvio só dos meses comparados. Uma dica e uma
    nota dizem quantos meses ficaram fora.
- **TOTAL alinhado.** A linha de total não tinha as colunas de realizado e
  desalinhava. Agora traz realizado ↑, realizado ↓, desvio e desvio %.
- **2.2 · as bases declaradas** acima da tabela:
  - o saldo acumulado parte da soma das contas da empresa (todas as obras),
    não do caixa da obra, e corre pelo previsto;
  - o realizado vem da versão nomeada, conciliado ou não;
  - o desvio compara com a versão de referência.

  O cartão "Saldo do período" agora diz que é previsto e não tem saldo
  inicial.

## Testes

- `fluxo-tela.test.ts`:
  - o eixo com realizado;
  - acumulado e totais iguais ao cálculo antigo;
  - mês vazio sem valor;
  - desvio com sinal e com um lado só;
  - o total do desvio.
- Suíte inteira passando.
- Navegador:
  - as bases declaradas;
  - as colunas de desvio;
  - a linha TOTAL alinhada.
  - A Empresa toda continua com os mesmos totais de previsto: −R$ 39.381.

# Prompt AD · AD-3 — o assistente do Fluxo de Caixa

Parte 4. **Somente leitura.** Nenhum número da tabela muda. A Empresa toda
continua com o mesmo total de previsto: −R$ 39.381.

## O que mudou

- **Painel lateral de 300px** ao lado da tabela, como na Conferência.
  - Tem o selo **"Somente leitura"** e um rodapé que diz que nada é alterado.
  - Dá para recolher. A preferência fica salva por usuário no navegador.
  - Abaixo de 1180px, o painel desce para baixo da tabela e deixa de ser
    `sticky`.
- **A frase de abertura já traz o achado.** Exemplo, no teste local com
  dados temporários: *"O caixa realizado de 2026 está 82,4% abaixo do
  Orçamento ("Budget / Orçamento"), somando os 3 mês(es) com os dois lados.
  A diferença se concentra em 11/2026 e 02/2026."*
  - Sem o que dizer, ela diz isso: o cenário não existe, o plano está vazio
    no período ou nenhum mês tem os dois lados.
- **As ações:**
  - **Comparar com o Orçamento** e **Comparar com a Previsão Atualizada.**
    - Mês a mês, com os maiores desvios em cima.
    - Duas leituras com rótulos diferentes (BAD-3): **"Caixa realizado ×
      plano"** (a padrão) e **"Previsão de hoje × plano"**.
  - **Onde o caixa fugiu do plano:** os três meses de maior desvio contra
    cada cenário.
  - **O que já aconteceu e continua previsto:** os meses já fechados que
    seguem com previsto, sempre com o selo "já venceu".
  - **Movimento sem previsão:** os meses que só têm realizado.
- **Sempre declarados:**
  - o regime dos dois lados;
  - a versão, pelo nome do cenário e pelo rótulo que o usuário deu;
  - a cobertura na Empresa toda;
  - o período, e se ele veio do ano ou do intervalo de datas.

## As regras

- **Não calcula.**
  - `src/lib/fluxo-analise.ts` monta tudo com `linhasDoFluxo` e
    `totalDoDesvio`, as mesmas funções da coluna Desvio.
  - Os mapas vêm de `flowMaps` e `flowMapsRealizado`, as mesmas funções da
    tabela.
- **Nunca compara com versão ausente.**
  - Projeto sem o cenário: a ação aparece desabilitada, com o motivo
    escrito.
  - Na Empresa toda, o projeto sem o cenário fica **fora dos dois lados**
    e entra na contagem: "1 de 3".
- **O realizado é sempre o da Atual,** mesmo com a chave desligada.
  - Se a tabela lê outra versão, porque o usuário marcou outra em primeiro,
    o painel avisa.
- **Nunca afirma causa e nunca projeta saldo.**
  - As contas que puxaram cada mês não estão na tabela, então o painel não
    as mostra. O texto diz isso.
- **Nunca grava.**
  - O painel não importa action nem banco.
  - Recebe a análise pronta do servidor.

## Testes

- `fluxo-analise.test.ts`:
  - desvio e total iguais aos da tabela;
  - a frase;
  - ausente não é zero;
  - os dois rótulos;
  - vencido e sem previsão;
  - a análise é serializável;
  - o painel não importa action, banco nem fetch;
  - o selo e o rodapé.
- `fluxo-assistente.test.ts`, com banco:
  - o plano e o realizado são os mesmos mapas da tabela;
  - o cenário ausente vem com o motivo;
  - na Empresa toda, o projeto sem Orçamento fica fora dos dois lados e o
    caixa dele não entra;
  - com o tenant errado, nada é lido;
  - as contagens antes e depois são iguais.
- Navegador, com EMPREENDIMENTO PILOTO, OBRA 7 TESTE e Empresa toda:
  - a frase aparece;
  - as ações desabilitadas mostram o motivo;
  - o recolhido persiste.
  - Os dados temporários (`budget_line` com `row_key` "AD-TMP") foram
    apagados depois do teste.

# Prompt AE · AE-3 — o assistente do Resumo

Parte 5. **Somente leitura.** Nenhum número da tela muda: o Resumo continua
igual ao do AE-1 na EMPREENDIMENTO PILOTO (Atual, Previsão e as três comparadas).

- **Onde fica:** painel de 300px no modo de uma versão. Tem o selo
  "Somente leitura" e dá para recolher; a preferência fica por usuário no
  navegador.
- **5.1 · a abertura traz o achado:**
  - com a chave e uma exceção no bloco Atenção, a primeira exceção e
    quantas mais há;
  - sem exceção, o critério que mais confunde: "1 de 2 unidades vendidas. O
    VGV de [valor removido] conta todas; Sinais a Subsídio contam só as
    vendidas";
  - sem unidade, diz que é ausência, não zero.
- **As ações:**
  - **Montar outra análise** é a primeira e aparece desabilitada, com o
    motivo (BAA-6). O texto não fala em conversa.
  - **Explicar o bloco:** fonte, cenário e regime de cada bloco, conforme a
    chave.
  - **Comparar projetos:** desabilitada. O Resumo é de uma obra por vez.
  - **O que mudou desde o mês passado:** guarda no navegador uma fotografia
    por mês dos números em tela e compara com a do mês anterior.
- **5.3 · nunca:**
  - bloco pendente não recebe número;
  - não afirma causa;
  - não projeta;
  - não grava. O painel não importa action nem banco.
- **Modo comparação:** sem painel. Os números são por versão e não há um
  achado único a abrir.

**Testes:** `resumo-analise.test.ts` (7). Navegador: a frase, as ações
desabilitadas com o motivo e a primeira visita do mês.

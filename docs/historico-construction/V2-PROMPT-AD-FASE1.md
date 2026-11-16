# Prompt AD · Fluxo de Caixa — Fase 1, inventário

Prompt AD (36 de 42). **Só leitura nesta fase; nada foi alterado.** SQL em
[`sql/v2-prompt-ad-diagnostico.sql`](./sql/v2-prompt-ad-diagnostico.sql).
A coleta `docs/TELA-FLUXOCAIXA.md` não está no repositório. O inventário
compara o prompt com o código de hoje.

## O que já mudou desde o prompt

- **Prompt A:** o projeto vem da URL e as versões de `getVersionsDoProjeto`,
  com tenant. Os fallbacks `ctx.project ?? ctx.projects[0]` e
  `versoesProj.length > 0 ? versoesProj : ctx.versions` **já saíram**.
  Projeto sem versão mostra "não possui versões".
- **Continua:**
  - `atualVersion = find(atual) ?? versoes[0]`. Projeto sem Atual elege
    outra versão como realidade. O consolidado faz o mesmo (`?? vs[0]`).
  - **1.1:** o realizado vem de `compareVersions[0]`, a primeira versão
    marcada, e não da Atual.
  - **1.2:** `permutaCashByMonth` soma também na coluna de Orçamento e
    Previsão.
  - **2.1:** o acumulado é só previsto. **BAD-1:** o saldo inicial é a
    soma das contas do tenant inteiro, para qualquer obra.
  - **3.1:** o eixo é INCC mais os meses do **previsto**. Mês só com
    realizado não aparece.
  - **3.3:** caixa sem data é descartado sem aviso.
  - **3.4:** "Saldo do mês" mostra R$ 0 em mês vazio.
  - **Parte 5:** não há desvio na tela.

## Bloqueios

| | O que a base mostra | Decisão adotada |
|---|---|---|
| **BAD-1** | Base local: 4 contas ativas, nenhuma "Terceiros", saldo total R$ 0. As três contas do Prompt X entram no saldo inicial **se** não forem do tipo "Terceiros" e estiverem ativas. Produção: relatório 1, coluna `entra_no_saldo_inicial`. | **A recomendada, atrás de chave nova, desligada.** Projeto único: o partida é o caixa da Atual antes do primeiro mês mostrado. Empresa toda: o saldo das contas. A origem é declarada nos dois casos. Com a chave desligada, o número não muda e a origem passa a ser **declarada**. |
| **BAD-2** | Base local: nenhuma parcela. Produção: relatório 2. | A Parte 3.2 (mês fechado com o realizado em destaque) vai na mesma chave. |
| **BAD-3** | — | **Caixa × plano abre por padrão**, a recomendada. A "previsão × plano" é a segunda leitura, com rótulo próprio. |
| **1.4 · conciliação** | Base local: 24 lançamentos não conciliados e 22 conciliados. O realizado conta os dois. | **Sem mudança aqui.** Mudar o critério vale para Caixa, Dashboard e Fluxo juntos (Prompt L, Parte 7). A tela passa a **declarar** que conta conciliado e não conciliado. Pergunta para o dono. |

## Mudança de número: o que vai atrás da chave

Pela regra do dono (8.1 do prompt e a regra geral), tudo que muda número
exibido vai atrás de **uma chave por empresa**, `fluxo_definicao_nova`,
nascida desligada:
- 1.1, o realizado sempre da Atual;
- 1.2, a permuta fora do planejamento;
- 1.3, sem Atual não há realizado;
- 2.1, o acumulado pelo realizado nos meses fechados;
- BAD-1, o ponto de partida por projeto;
- 3.2, o mês fechado com o realizado em destaque.

**Sem chave, porque não muda total:**
- 3.1: entra o mês só com realizado. Ele soma zero no previsto, e o
  acumulado não muda.
- 3.3: o caixa sem data é contado e mostrado fora da tabela.
- 3.4: mês vazio mostra "—".
- Parte 5: a coluna de desvio é informação nova.
- 2.2: os nomes dos saldos e a declaração da base.

## Plano de PRs

1. **AD-1:** as Partes 3.1, 3.3, 3.4, 5 e 2.2, e os cabeçalhos que declaram
   origem. Mesmos números.
2. **AD-2:** a chave `fluxo_definicao_nova`, com as Partes 1.1, 1.2, 1.3,
   2.1, BAD-1 e 3.2, mais a prévia em `/chaves`.
3. **AD-3:** o assistente somente leitura (Parte 4), que lê os mesmos
   números da tabela, e o relatório final.

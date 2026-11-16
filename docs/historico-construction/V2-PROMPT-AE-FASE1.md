# Prompt AE · Resumo Executivo — Fase 1, inventário

Prompt AE (38 de 42). **Só leitura nesta fase; nada foi alterado.** SQL em
[`sql/v2-prompt-ae-diagnostico.sql`](./sql/v2-prompt-ae-diagnostico.sql).
A coleta `docs/TELA-RESUMO.md` não está no repositório. O inventário compara
o prompt com o código de hoje.

## O que já mudou desde o prompt

- **3.6 · as versões vêm do projeto escolhido:** `getProjectVersions`, com
  tenant (Prompt A). A obra vem da URL, não do cookie, e a tela pede a obra
  quando falta.
- **3.5 · a versão padrão** é a "de trabalho" (`versaoDeTrabalho`): a Atual;
  sem ela, a padrão ou a primeira. A tela já não abre no planejamento quando
  há Atual. **Sem Atual, ainda abre em outra versão sem avisar.**
- **A página verifica `resumo:ver`** antes de consultar.

## O que continua como o prompt descreve

| Item | Hoje |
|---|---|
| 2.1 · VGV soma todas as unidades; os outros 11, só as vendidas | continua, sem aviso |
| 2.2 · "c/INCC p.5+" no rótulo, sem INCC aplicado | continua |
| 2.3 · "Permutado" fora do card; o Total soma 3 filtros | continua |
| 2.4 · S1, S2 e S3 sem `× n` | continua. **`n` existe** no plano (`SignalSource.n`), e `expandUnitReceivables` multiplica por `max(1, n)`. O errado é o `calcTotals`. |
| 2.5 · `calcTotals` ignora `usar*` | registro: é a 3ª leitura do plano (Prompt I §58) |
| 2.6 · permuta por tipo via `includes("material")` | continua; o tipo é texto livre |
| 2.7 · permuta e liberação sem filtro de status | continua; os status são texto livre |
| 2.8 · selo "não gera projeção" | continua |
| 3.1 · seleção de vários projetos | não existe: uma obra por vez |
| 3.7 · a 4ª versão expulsa a 1ª | continua (o aviso do AA-1 é opcional) |
| 4.2 · filtro de data visível e sem efeito na comparação | continua |
| 4.3 · o rodapé aponta para um cartão que pode não existir | continua |
| 4.4 · ausência e zero com o mesmo texto | continua |

**`calcTotals` é usada só por esta tela** (8.3): os dois usos estão em
`resumo/page.tsx`.

## Base local

- **BAE-3:** 2 unidades, 1 vendida, **com data**. Nenhuma vendida sem data.
  O VSO local é calculável. Em produção, rodar o relatório 1.
- **2.3:** 1 Disponível e 1 Vendida, as duas na **Previsão** (nenhuma na
  Atual). Nenhuma Permutada.
- **2.4:** nenhum sinal com `n > 1`; o defeito não aparece aqui.
- **2.6 e 2.7:** nenhuma permuta. 1 liberação com status "Recebido".
- **3.5:** toda obra tem Atual.

## Bloqueios e decisões adotadas

| | Decisão |
|---|---|
| **BAE-1 · tolerâncias** | **Sem resposta.** O bloco Atenção só tem exceções **categóricas**, nenhuma por percentual. Pergunta: desvio de custo acima de quantos %? Recebível vencido há quantos dias? Por projeto ou único? |
| **BAE-2 · exposição máxima** | Depende do **BAD-1**: a chave do Fluxo existe, mas está desligada. **Não implementar.** O bloco Caixa entra desenhado, com a pendência escrita. |
| **BAE-3 · VSO** | O SQL está pronto. Com unidade vendida sem data, o VSO não é calculado e vira linha de Atenção. A data de venda é `unit.mes_venda`. |
| **2.2 · INCC** | **Opção 2 agora** (recomendada): tirar o "c/INCC" do rótulo e declarar o valor nominal. **Só rótulo; nenhum número muda.** A opção 1 fica para a seção 58 do Prompt I. |
| **2.4 · sinais** | `n` existe, então o certo é multiplicar. **Muda número:** vai atrás da chave. |

## Mudança de número: o que vai atrás da chave

Uma chave, **`resumo_definicao_nova`**, nascida desligada (seção 6):
- **2.3:** "Permutadas" aparecem, e o Total é a contagem de unidades.
- **2.4:** S1, S2 e S3 `× n`.
- **2.6:** a permuta de tipo fora do padrão vai para "outros tipos", e a soma
  fecha.
- **2.7:** permuta e liberação canceladas ficam fora.
- **A Parte 1:** os blocos por pergunta no lugar da tabela de 12, e a Parte 4
  (a tabela sai).
- **3.5 sem Atual:** estado explícito, sem substituta.

**Sem chave, porque não muda número:**
- **2.1:** a linha "VGV total" declara o critério (todas as unidades) e as
  outras declaram "só as vendidas".
- **2.2, opção 2:** rótulo nominal.
- **2.8:** o selo diz "não entra nos totais desta tela".
- **3.5:** o aviso quando a obra não tem Atual.
- **3.7:** a 4ª versão é avisada (o mesmo `noLimite="avisar"` do Dashboard).
- **4.2:** o filtro de data some no modo comparação.
- **4.3:** o rodapé só cita o cartão quando ele existe.
- **4.4:** "—" quando não há unidade, permuta ou liberação na versão.

## Plano de PRs

1. **AE-1:** 2.1 (declarar), 2.2 opção 2, 2.8, 3.5 (aviso), 3.7, 4.2, 4.3 e
   4.4. Mesmos números.
2. **AE-2:** a chave `resumo_definicao_nova`.
   - As correções 2.3, 2.4, 2.6 e 2.7 de `calcTotals`, por parâmetro
     explícito, sem função duplicada.
   - Os blocos prontos: Vendas, Exposição, Atenção categórica e Comparativo.
   - Os pendentes com o motivo escrito: Caixa (BAD-1) e Resultado (Prompt I
     §54–58). Execução fica fora (BV-1).
   - A prévia: os 12 indicadores de hoje × os blocos novos.
3. **AE-3:** o assistente somente leitura (Parte 5) e o relatório final.

**Pergunta, na Parte 3:**
- O Resumo é hoje de uma obra por vez. O Comparativo (1.8) e a soma de
  vários projetos (3.1) pedem seleção de vários.
- Proposta: usar os escopos Todos, Ativos e Finalizados do Prompt A, como
  no Dashboard, só com a chave ligada.

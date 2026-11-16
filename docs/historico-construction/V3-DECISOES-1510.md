# Decisões do dono — 15/10/2026

Respostas às quatro colisões entre a revisão do Thiago de 14/10
([`V3-REVISAO-1410.md`](./V3-REVISAO-1410.md)) e decisões já registradas no
repositório. Nada aqui altera dado gravado. O que cada decisão libera está no
[`V3-PLANO.md`](./V3-PLANO.md).

## 1. Escrita assistida nas telas de input (Prompt E, Etapa 3)

**Decisão: autorizada.** Revoga o "não autorizada por padrão" do
[`V2-PROMPT-E-FINAL.md`](./V2-PROMPT-E-FINAL.md), seção 1 (BE-3).

O que continua valendo, porque é regra da Etapa 3 e não do bloqueio:

- **4.2.1** Proposta, nunca gravação direta. A IA preenche a tela; o usuário
  vê campo a campo e confirma.
- **4.2.2** Permissão no servidor, na mesma action que grava. A IA não é
  caminho alternativo de escrita.
- **4.2.3** Auditoria com origem "assistente" em toda gravação aceita.
- **4.2.4** Projeto, versão e competência confirmados antes de qualquer
  lançamento.
- **4.2.5** A primeira tela de escrita assistida não pode ter gravação
  destrutiva nem efeito contábil já emitido.
- **4.1.2** Nenhuma função assistida chega perto de `deleteProject`.

Pré-condições técnicas da seção 4.1, situação em 15/10:

| Pré-condição | Situação | Onde |
|---|---|---|
| 4.1.1 gravação de Orçamentos não destrutiva | **Cumprida** (Prompt D) | `src/lib/actions/planning.ts` |
| 4.1.2 exclusão de projeto fora do alcance | Regra permanente, não é tarefa | — |
| 4.1.3 actions devolvem `{ ok, error }` em vez de lançar | **Parcial.** `projects.ts` já devolve; `planning.ts` e `budget.ts` ainda lançam | Vai no primeiro PR de cada tela |

Telas que ficam **fora** da Etapa 3 por decisão anterior, até nova ordem:
Gestão de Acessos e Usuários (Prompts AJ e AI, Parte 8) e Plano de Contas
(ver item 2).

## 2. Chat do Plano de Contas para inserir departamentos, áreas e subáreas

**Decisão: pendente.** O dono conversa com o Thiago em 16/10.

O que está em jogo: o Prompt G, regra 8.2.1, deixa o Plano de Contas "fora da
escrita assistida, permanentemente" (nunca cria, edita, inativa ou reordena
conta). O pedido do Thiago precisa que essa regra seja revogada. Enquanto não
for, o prompt do Plano de Contas na Fase 3 fica travado; o painel atual
continua somente leitura.

## 3. Regra de privacidade do chat (BE-2, decisão de 01/10)

**Decisão: a regra pode ser reaberta.** A decisão de 01/10
([`V2-DECISOES-0110.md`](./V2-DECISOES-0110.md), "Chat do assistente") diz que
ao modelo vai só a pergunta e o catálogo, que o modelo só classifica e que o
número é calculado no sistema. Isso não comporta "análises alternativas e
simulações" nos relatórios nem o chat dos Relatórios Customizados.

O que reabrir **não** significa: liberar tudo. A nova regra é escrita no
prompt de arquitetura da Fase 3 (E2 no plano) e precisa dizer, por tela, o que
sai do sistema. Pontos que ficam como estão até que esse prompt diga o
contrário:

- dado pessoal (comprador, funcionário, renda, documentos) não vai ao modelo;
- provedor, retenção de 30 dias e "não treina modelo" da seção "Provedor,
  retenção e contrato" de 01/10;
- pergunta não gravada em log; conversa só na memória da aba.

O que passa a ser permitido discutir no prompt E2: enviar ao modelo os
**números agregados** da tela (os mesmos que o usuário já vê), para que ele
escreva a análise ou proponha a simulação.

## 4. A tela Assistente sai

**Decisão: pode mudar.** `/diagnosticoia` (hoje "Assistente", Prompt AM) sai
do menu. Junto saem as referências a ela:

- a mensagem da importação de extrato que manda "ativar a IA em Business
  Intelligence → Assistente" (`src/components/app/import-extrato.tsx`);
- o rótulo "Assistente do produto" nas regras de uso de IA
  (`src/lib/ia-uso-regras.ts`), se a função deixar de existir.

A pergunta do Thiago sobre o destino da função "explicar o produto" (acaba,
ou vira ajuda no menu) **não foi respondida** e entra como bloqueio do prompt
AM2 no plano.

## Perguntas que continuam abertas

- **Prompt AB (BAB-1 e BAB-3):** as três telas da Etapa 2 que ainda não
  saíram. A revisão do Thiago confirma que saem. Falta dizer:
  - Projeção de Receitas: a visão "por fonte" acaba, ou vai para o Fluxo de
    Caixa Analítico?
  - Balanço do Dia: o histórico de dias fechados (`daily_closing`) passa a
    ser listado no Caixa, ou acaba?
  - Alguém recebe periodicamente o CSV da Projeção ou do Balanço do Dia?
- **De-para CEF → DRE:** é tarefa do Thiago. Chega como tabela pronta, ou ele
  preenche na tela?
- **Acerto Contábil:** a decisão da Etapa 1 (virar aba "Acertos" em Despesas)
  continua valendo? O Prompt S adiou até o Prompt L, que já foi entregue.

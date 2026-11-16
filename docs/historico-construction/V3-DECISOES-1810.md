# Decisões — 18/10/2026 (reuniões de revisão V5)

O que os dois transcritos ([`V3-REVISAO-1710.md`](./V3-REVISAO-1710.md))
fecham, reabrem ou mudam em relação a
[`V3-DECISOES-1510.md`](./V3-DECISOES-1510.md) e ao plano. O dono estava
nas duas reuniões; onde a instrução saiu do Thiago e o dono não a contestou,
ela entra como decisão. Onde a instrução precisa de uma palavra do dono que
não está na gravação, está marcada **a confirmar**.

## Bloqueios do plano que as reuniões respondem

| Bloqueio | Resposta |
|---|---|
| **BAB-1 · Projeção de Receitas** | **Fica.** Muda do módulo Receitas para Business Intelligence. A pergunta "por fonte" deixa de existir: a tela continua respondendo. |
| **BAB-1 · Consolidado** | **Sai.** Não espera Relatórios Customizados: o chat livre do Dashboard absorve. |
| **BAB-1 · Balanço do Dia** | **Sai.** O fechamento do dia no Caixa é o histórico. O que o Caixa não mostra hoje (lista dos dias fechados) entra no prompt do Caixa antes da remoção. |
| **BAB-3 · CSVs** | Não foi perguntado. Com Projeção ficando, só o CSV do Balanço do Dia importa; a remoção leva junto. |
| **BAM2-1 · destino de "explicar o produto"** | **Migra para o chat flutuante.** O chat explica o que é e como funciona cada tela. A base de conhecimento (`src/lib/assistente-base`) continua, servida pelo chat. |
| **BS2-1 · Acerto Contábil** | **Fica como tela própria.** A decisão da Etapa 1 (aba "Acertos" em Despesas) é revogada. O prompt S2 sai do plano. |
| **BDP-1 / BDP-2 · de-para CEF → DRE** | **Não é tela nova: mora no cadastro do Plano de Contas.** Cada plano de contas tem exatamente uma categoria da DRE, editável, com padrão de boa prática que o sistema já traz. Plano sem categoria não existe (o padrão cobre todos). O Thiago faz a associação do cliente na tela. |
| **BE2-1 · o que vai ao modelo nos relatórios** | Direção dada: o chat analisa e simula sobre os números da tela e pode cruzar com outras telas. A regra escrita (o que exatamente sai do sistema) continua no prompt E2. |
| **BE2-3 · simulação grava?** | Não respondido. Fica no E2. |
| **BV2-2 · voz em quais telas** | Em todas as telas de cadastro e lançamento. |
| **BAD2-1 · semanal** | Confirmado que quer a visão semanal no Fluxo de Caixa; regra da semana continua a decidir no prompt. |
| **BAC2-1 · DRE Anual** | Não é tela separada: a mensal entra **abaixo da anual, na mesma tela**. O prompt AC2 muda de escopo. |

## Decisões novas

1. **Categoria da DRE travada pelo plano de contas** no lançamento de
   despesa. Hoje o campo é livre. Muda número da DRE em produção: **entra
   atrás de chave**, com prévia do que muda, como as quatro chaves da V2.
2. **Cartões de Crédito vai para o módulo Caixa** e ganha extrato,
   conciliação e proposta de lançamento do que não foi lançado.
3. **Aba "A Pagar" de Despesas sai.**
4. **Renomeações:** "Fornecedores & Stakeholders" → "Fornecedores e
   Parceiros"; "Medição de Obra" → "Medição de Projeto". Rota e `kind` não
   mudam.
5. **Chaves de mudança e Backup saem da visão do cliente.** Só a plataforma
   (console `/plataforma`) opera. O aviso de backup some.
6. **Emissão de NF-e entra no menu de Receitas**, como última seção, quando
   a tela chegar. Neste repositório só existe a especificação
   (`EMISSAO-NF.md`); a tela que o Thiago diz pronta não está aqui.
7. **Confirmação humana obrigatória** em toda gravação assistida, em todas
   as telas (já é a regra 4.2.1 da Etapa 3; fica registrada como pedido do
   dono).
8. **Plano de Contas: chat insere planos.** O Thiago reafirmou nas duas
   reuniões. **Confirmado pelo dono em 18/10.** Revoga a regra 8.2.1 do
   Prompt G e fecha a decisão 2 de 15/10. Vale o mesmo regime da Etapa 3:
   proposta, confirmação pelo botão, permissão no servidor, auditoria.

## Respostas do dono — 18/10

| Pergunta | Resposta |
|---|---|
| Plano de Contas com escrita assistida (item 8) | **Confirma.** |
| Nome do chat | **Cris.** Volta o nome anterior. Entra no prompt E2 (BE2-4 fechado). |
| INCC | **Um por empresa.** O seletor de projeto sai. O prompt Q2 migra as séries por projeto para uma série da empresa; projetos com séries diferentes são o bloqueio BQ2-1. |
| Relatórios Customizados | **Continua como tela própria.** O chat do Dashboard não a substitui (BRC-2 fechado). |
| Simulador | O dono pede ao Thiago que confira. N2 espera essa conferência. |

## O que já está no código e só precisa ser mostrado

- Caixa já exclui contas de terceiros do saldo.
- Estoque já tem saída (baixa) com motivo.
- Equipes de Projetos já lista funcionários e parceiros.
- Contas a Receber já tem edição por linha.
- Open Finance via Pluggy já tem cliente e worker de sincronização.

## Bugs a investigar antes dos prompts

- "Paga por terceiro" sem ninguém na lista: ou falta o papel "Pagador por
  Terceiro" em Ressarcimentos (comportamento do Prompt T) ou defeito. Se for
  o papel, a instrução do Thiago muda a regra: quem está em Ressarcimentos
  aparece, sem conceder papel à parte.
- Restrição de telas por papel "não funcionava" segundo o cliente.
- DRE abrindo numa versão que não é a da empresa.
- Leitura de recibo manuscrito falha (imagens a receber do Thiago).

# Prompt K · PR K-4 — assistente da tela de Contas a Receber

Quarta PR de código do Prompt K, conforme
[`V2-PROMPT-K-FASE1.md`](./V2-PROMPT-K-FASE1.md). Seção 8 (8.2 a 8.5).
**Sem migração. Nenhum registro gravado é alterado por esta PR.** A única
escrita possível é a conciliação que o usuário confirma clicando, pela mesma
action da K-2.

## O que muda

| | Prompt | Aqui |
|---|---|---|
| **8.2 · proposta de conciliação** | sugere o match entre linha do extrato e conta em aberto, por valor, data e cliente; o vínculo só existe depois da confirmação | `proporConciliacoes()`: para cada entrada do extrato com valor livre, a conta em aberto **da mesma obra** cujo saldo é igual ao livre (até R$ 0,05). Data a até 15 dias do vencimento e nome do cliente na descrição do extrato sobem a confiança ("só o valor" / "média" / "alta"). Cada conta e cada movimento entram em uma proposta no máximo. O botão **Conciliar** chama `registrarRecebimento` (K-2), que valida empresa, obra, saldo e valor livre de novo no servidor, com chave de idempotência |
| **8.3 · análises** | vencidas por idade; recebidas sem conciliar e há quantos dias; sem unidade ou cliente; valor fora do padrão do plano | código puro em `conta-receber-analise.ts`: faixas até 30 / 31–60 / 61–90 / mais de 90 dias; soma dos recebimentos fora do extrato por conta e dias do mais antigo; "Outras Receitas"/"Outros" dispensam unidade, nunca cliente; "Parcela mensal" que desvia mais de 20 % da mediana das parcelas da mesma unidade (mínimo 3). A "divergência plano × parcelas" propriamente dita só existe depois da materialização (BK-0) e fica para a K-5 |
| **8.4 · nunca faz** | dar baixa, conciliar sozinho, alterar conta conciliada, cancelar | o painel não tem nenhuma dessas ações; a única escrita é a conciliação confirmada por clique |
| **8.5 · selo** | não pode dizer "Somente leitura" | selo "Propõe, você confirma", sempre |
| **8.1 · leitura de boleto/comprovante** | lê o boleto anexado e propõe a conta | **fora até a resposta A/B/C** (enviar documentos ao provedor de IA — mesma pergunta da J-5). O rodapé do painel diz isso |
| **Prompt E** | painel lateral recolhível, projeto explícito | mesma moldura do assistente de Unidades: recolhe com preferência por usuário; abaixo de 1180 px desce para baixo do conteúdo. "Hoje" é calculado no servidor em São Paulo. Cada achado leva à linha da conta (âncora `#conta-<id>`) |

## Arquivos

- `src/lib/conta-receber-analise.ts` (+ teste, 7 casos) — análises e proposta, puros.
- `src/lib/conta-receber-estado.ts` — `diasEntre` exportado.
- `src/components/app/assistente-contas-receber.tsx` (novo).
- `src/app/(app)/contasreceber/page.tsx` — monta a análise e o painel; `contas-receber-manager.tsx` — âncora na linha.

## Verificação

- Testes puros: vencidas (faixas, parcial, estornada volta a contar, futura e hoje não), recebidas sem conciliar (ignora estornados e conciliados), sem vínculo, fora do padrão (mediana, mínimo 3), proposta (valor igual, mesma obra, data e cliente só pontuam, cada lado uma vez, centavos).
- Suíte completa (89 arquivos), `tsc`, `eslint`, `next build`: verdes.
- No navegador (local): conta vencida de R$ 1.500 + entrada no extrato de R$ 1.500 um dia depois → painel mostra "Vencidas 1", "Sem unidade ou cliente 1" e a proposta "média · mesmo valor · 1 dia do vencimento"; **Conciliar** grava o recebimento, a linha passa a "Recebida e conciliada" e a proposta e a vencida somem. Linhas de teste apagadas depois.

## Fica para depois

- 8.1 (boleto/comprovante → proposta de conta): resposta A/B/C.
- K-5 (materialização): BK-0.

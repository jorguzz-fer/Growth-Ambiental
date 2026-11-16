# Prompt F · PR F-2 — Assistente: verificações da Previsão e reprojeção proposta

Seção 8 (segue o Prompt E, Etapa 1: painel lateral recolhível, `projectId` e
`versionId` validados no servidor contra o tenant).

## Verificações (8)
Além das que o Prompt D já cobria (percentuais abaixo de 100%, meses sem
distribuição, dado fora do período, contas só de um lado), **Revisar
previsão** passa a apontar a **divergência entre o total herdado e o total
atual do Orçamento de origem**, conta a conta, sem recalcular nada — e
sugere o caminho certo: uma revisão nova a partir do Orçamento. Rótulos na
Previsão: "Revisar previsão" e "Comparar com o orçamento".

## Reprojeção proposta (8.1–8.5)
- A tela **não** ganhou botões de preencher a grade. A operação vive no
  assistente: **"Reprojetar em uma revisão nova"**, com "Partir do
  Orçamento" (copia a distribuição mensal do Orçamento de origem) e "Partir
  do realizado" (despesas da versão Atual nas competências já decorridas —
  referência analítica, Prompt I §4 — e o restante do total por igual nos
  meses futuros; receitas não mudam).
- **8.2**: a proposta aparece como **comparação** — por conta, quantas
  competências mudam, a variação em R$ e os percentuais antes → depois.
  Nada é gravado ao propor.
- **8.3**: ao confirmar (nome obrigatório), `criarRevisaoComReprojecao`
  **recalcula a proposta no servidor**, cria uma **revisão nova** pelo
  `duplicateForecast` existente (totais, seleção e origem copiados) e aplica
  só a distribuição com `saveBudgetPlanning`; a revisão aberta **fica
  intacta**. Log `forecast.reprojecao` com `origem: "assistente"`, base, de
  onde partiu e as contas alteradas. Limite de 12 e aviso perto do teto
  valem (sem aumento, 8.3 NOTA).
- **8.4**: realizado acima do total herdado é **detectado na proposta**
  (badge com o excedente) e a criação é recusada antes de existir uma
  revisão com mais de 100%.
- **8.5**: na Previsão o selo é **"Propõe, você confirma"**; em Orçamentos
  continua "Somente leitura". O assistente nunca exclui revisão, troca
  situação nem altera total por conta.

## Arquivos
`previsao-reprojecao.ts` (puro) + teste (4), `actions/previsao-assistente.ts`
+ teste (5, com banco: proposta sem gravar, realizado sem competência
decorrida, revisão nova com a atual intacta e log de origem, estouro recusado
antes de criar, permissão e origem ausente), `orcamento-analise.ts`,
`assistente-orcamento.tsx`, `forecast/page.tsx`.

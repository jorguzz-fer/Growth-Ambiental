# Prompt T — PR 4: assistente de Ressarcimentos (somente leitura)

Último passo do Prompt T. Entrega a seção 10 (assistente de IA, Prompt E).

## O que mudou
- `src/lib/ressarcimento-analise.ts` (puro, sem modelo, sem gravação):
  - **Aging por terceiro** — usa `agingDasObrigacoes` de `calc/aging.ts`, a
    mesma função e a mesma data-base do lote e da conta corrente; obrigações
    canceladas e quitadas não entram.
  - **Encontro de contas disponível** — terceiros com saldo nos dois lados
    (a restituir e a repassar) e quanto um encontro abateria (o menor lado).
  - **Conferir obrigações** — sem previsão de ressarcimento, sem pagador
    identificado, ou saldo negativo (restituído a mais que o devido).
  - **Concentração** — quem representa a maior parte do saldo devido
    (principais até 80% do total; "dominante" quando um passa de metade).
- `src/components/app/assistente-ressarcimentos.tsx`: painel ao lado do
  conteúdo em /restituicoes, no mesmo molde dos assistentes de Fornecedores e
  Plano de Contas (recolhível por usuário, selo "Somente leitura").
- Página de Ressarcimentos: monta a análise com o que já carregou.

## Nunca
Registrar ressarcimento, compensar, cancelar, conceder papel. O painel não
chama nenhuma action.

## Dados bancários e PIX (12d)
Os tipos de entrada da análise só têm nome, valores e datas. O
`DespesaTerceiroView` e o saldo consolidado não carregam banco/PIX, e o
teste confere que a saída da análise nunca contém esses campos.

## Testes
- `src/lib/ressarcimento-analise.test.ts`: aging igual ao módulo compartilhado;
  encontro só com saldo nos dois lados; três motivos de conferência;
  concentração e dominante; 12d/15.
- Suíte completa: 120 arquivos, 1272 testes. `tsc`, `eslint`, `next build`
  limpos.

## Verificação no navegador (local)
Com uma obrigação temporária semeada (R$ 1.500, sem previsão, desembolso em
maio): painel abre com "1 obrigação em aberto"; aging mostra a faixa +90 para
o terceiro; "Conferir" aponta "sem previsão"; "Concentração" mostra 100%;
coluna "Em aberto há" presente na conta corrente; recolher/abrir funciona.
Sem erros de página. A semente foi removida; as quatro tabelas voltaram a 0.

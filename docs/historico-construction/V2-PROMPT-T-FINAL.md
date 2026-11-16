# Prompt T — Ressarcimentos · Relatório final

PRs: #167 (Fase 1), #168 (T-1), #169 (T-2), #170 (T-3), T-4 (assistente).
Docs: V2-PROMPT-T-FASE1.md, -PR1, -PR2, -PR3, -PR4; SQL em
`docs/historico-construction/sql/v2-prompt-t-diagnostico.sql`.

## 1. BT-1 — formato de `stakeholder.papeis`
`text[]` nativo (confirmado no banco local). O papel "Pagador por Terceiro"
já existia desde o Prompt W. Local: 0 cadastros com o papel, 0 obrigações.
Conceder/retirar o papel ganhou porta na própria tela (T-1), com bloqueio
quando há obrigação em aberto. **Pergunta aberta (W 1.4 × T BT-1):** quem
concede o papel: só Fornecedores, só Ressarcimentos ou ambos? Hoje ambos
funcionam e gravam o mesmo audit.

## 2. Dados de recebimento (BT-2)
Migração 0052: sete colunas opcionais em `stakeholder` (banco, agência,
conta, tipo, titular, tipo e chave PIX). Cadastro e edição inline com bloco
opcional. Fora do log: o `audit_log` grava só `[protegido]` de/para
(`changesSemValorDeRecebimento`); a criação grava `comDadosDeRecebimento`.
Fora do assistente: os tipos de entrada da análise não têm esses campos, e
o teste 12d confere a saída.

## 2a. Aging
Vive em `src/lib/calc/aging.ts`. Usado pelo preview do lote, pela conta
corrente por terceiro, pelo total do topo e pelo assistente. Teste 12b
confere que é a mesma função e a mesma data-base (previsão, senão desembolso).

## 3. Diagnóstico 4.3
Base local: 0 restituições, logo 0 canceladas com mais de um item e 0 saldos
inconsistentes. A consulta está no SQL para rodar em produção. Nada corrigido.

## 4. Obrigações fora da versão ativa
Local: 0. A lista passou a ser da empresa (mesmo escopo da conta corrente),
com filtro por obra na tela; consulta 6.3 no SQL para produção.

## 5. PEDs consumidos por compensações
Local: 0 (consulta 7.3). As compensações agora aparecem na tela (T-3).
**Pergunta aberta:** a compensação continua consumindo um número da
sequência de despesas; manter ou dar sequência própria (ligado ao BR-1)?

## 6. Criar obrigação na tela de Despesas
O formulário de nova despesa saiu de Ressarcimentos (T-2). A obrigação é
criada por `addDespesa` quando "Paga por terceiro" tem um pagador — código que
já existia; não foi reimplementado. Ressarcimentos só vincula lançamento
existente por PED, sem sobrescrever nada do lançamento.

## 7. Intactos
Idempotência (`idempotency_key`, duplo clique registra uma), `FOR UPDATE` e
a distinção de caixa na conciliação não foram tocados. Teste 13/14 continuam
passando.

## 8. `cancelarRestituicao`
Tinha a função e nenhuma porta. T-1 acrescentou o botão "Cancelar" no
extrato do terceiro, com motivo obrigatório; o registro fica, com autor e
motivo.

## 9. Antes/depois
`despesa_terceiro`, `restituicao`, `restituicao_item` e `compensacao`:
0|0|0|0 antes e depois de cada PR (base local). Sementes de teste criadas e
removidas dentro de cada verificação. Hash de `stakeholder` igual.

## 10. Migrações
0052 `stakeholder_dados_bancarios` (aditiva, `IF NOT EXISTS`, com `down/`).
Nenhuma flag nova em `restituicao`: o estorno preservando o documento já
existia (Prompt I, §24).

## 11. Limitações
- Base local sem obrigações: aging, encontro e concentração só foram vistos
  com semente temporária e nos testes puros.
- 3-B.5 "Pago" (forma de pagamento) segue com o Prompt S/U.
- Confirmar em produção que as migrações 0046–0052 subiram.

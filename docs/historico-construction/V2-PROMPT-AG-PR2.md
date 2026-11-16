# Prompt AG — PR 2: a tela de Notas Fiscais e o rascunho

Segunda parte do emissor de NFS-e (Focus NFe). Esta PR **não envia nada à
prefeitura**: só monta, guarda e mostra o rascunho. O envio, a consulta e o
cancelamento vêm na PR 3.

## O que entra

- **Menu:** Receitas → **Notas Fiscais** (último item, como na revisão de 17/10).
  Permissão: `notasfiscais`. O contador vê; não monta nota.
- **/notasfiscais** — a lista das notas emitidas pela empresa.
  - Abas **Produção** e **Homologação — sem valor fiscal**. Abre na aba do
    ambiente configurado em Empresa.
  - Filtros por situação, obra e período.
  - Toda linha de homologação leva a marca "homologação"; a aba mostra o aviso
    de que essas notas não contam em nenhum relatório (BAG-4).
  - Texto fixo da decisão BAG-2: a nota não cria receita, conta a receber nem
    lançamento de caixa.
  - Se `NFSE_TENANT_ID` não estiver definido ou for de outra empresa, a tela
    diz isso (BAG-3). Montar rascunho continua possível; enviar não (PR 3).
- **/notasfiscais/nova** — o formulário do rascunho (serviço avulso, BAG-1).
  - Obra/escritório obrigatório; a nota vai para a versão **Atual** da obra.
  - Conta a receber **opcional**, só da mesma obra, só como referência
    (opção b). A conta não muda.
  - Valores, alíquota do ISS e retenções digitados. **Nenhuma retenção é
    presumida.** O cálculo (base, ISS, retenções, líquido) aparece na hora,
    com a mesma conta que será usada no envio.
  - Os dados do tomador ficam **copiados** na nota.
  - Os dados do emitente vêm de Configurações → Empresa e não se editam aqui.
- **/notasfiscais/[id]** — o detalhe.
  - Faixa "NOTA DE HOMOLOGAÇÃO — SEM VALOR FISCAL" quando for o caso.
  - Rascunho ou rejeitada: dá para corrigir (com permissão de editar).
    Qualquer outra situação: só leitura.
  - Histórico da nota (criada, editada; na PR 3: enviada, autorizada…).

## Regras garantidas por teste

`src/lib/actions/notas-servico.test.ts` (banco real):

1. Cria o rascunho na versão Atual com o evento "criada", e **não** cria
   conta a receber, despesa nem lançamento de caixa (contagem antes e depois).
   A conta a receber apontada continua igual.
2. Corrige o rascunho; depois de enviada (processando), **não edita mais** e o
   valor fica como estava.
3. Recusa: conta a receber de outra obra, obra sem versão Atual, valor
   negativo, alíquota fora de 0 a 5%.
4. Contador não monta nota; nota de outra empresa "não é encontrada".

Além disso: a página nova verifica "ver" antes de consultar dados
(`paginas-permissao.test.ts`) e o item novo entra no teste do menu.

## Privacidade e auditoria

- O registro de auditoria (`nfse.rascunho.criar` / `nfse.rascunho.editar`)
  guarda só a obra, o valor do serviço e a conta a receber apontada.
  **Nenhum dado do tomador** (CPF/CNPJ, nome, endereço) vai para a auditoria.

## O que não muda

- Nenhuma tabela nova (as tabelas vieram na PR 1, migração 0069).
- Nenhum dado existente é alterado. Nenhum relatório muda.

## Próximo passo (PR 3)

Enviar, consultar e cancelar na Focus NFe: tela de conferência antes do envio,
envio idempotente (a referência é gravada antes de chamar a Focus; nunca
reenvia sozinho), "processando" quando a Focus não responder, PDF e XML
guardados com a marca de homologação no nome, e cancelamento com motivo
escrito e confirmação digitando o número da nota.

# Prompt AG · PR 1 — Emissor de NFS-e: decisões, estrutura e regras

Prompt AG (42 de 42). Primeiro de quatro PRs:
- **PR 1:** a estrutura e as regras (este).
- **PR 2:** a tela e o rascunho.
- **PR 3:** emissão, consulta e cancelamento no Focus NFe.
- **PR 4:** o assistente e o relatório final.

**O que é:** a Cliente Piloto **emite** NFS-e de **serviço** para os clientes dela, pelo
Focus NFe, que já está integrado. **Não é** a nota recebida de fornecedor:
essa continua em Despesas (`documento_fiscal`), sem mudança.

## Decisões do dono (26/10/2026)

| Bloqueio | Decisão |
|---|---|
| BAG-1 · fato gerador | **Serviço avulso** (valor digitado e conferido), que pode **apontar** para a conta a receber já lançada (opção b). |
| BAG-2 · nota vira receita? | **Não.** A nota não cria receita, conta a receber nem lançamento. O vínculo é só referência. |
| BAG-3 · token | **Um CNPJ só, por enquanto.** Só emite o tenant declarado em `NFSE_TENANT_ID`. Os demais recebem a recusa escrita. |
| BAG-4 · homologação | **Confirmado:** a nota de homologação fica marcada para sempre (na lista, no detalhe e no nome do arquivo) e fora de qualquer relatório. |
| BAG2-1 (plano V3) · tela "pronta" do Thiago | **Construir aqui**, sobre o Focus já integrado. |

A revisão de 17/10 dizia "nota sempre atrelada a uma receita lançada". A
decisão de 26/10 (opção b) é a que vale. O vínculo com a receita fica
**opcional**, como referência.

## Estrutura (migração 0069, aditiva, com `down/`)

- **`nota_servico`** (1.1, 1.2). Tabela nova; **não** estende
  `documento_fiscal`.
  - **Identidade:** tenant, projeto e versão. A versão é sempre a **Atual**
    (1.3).
  - **Provedor:** ref, tentativa, número, RPS, série, código de verificação,
    links, chaves do PDF e do XML no R2.
  - **Situação:** status, ambiente e a mensagem do provedor na íntegra.
  - **Tomador:** **copiado** no momento da emissão (1.4).
  - **Valores:** os informados (serviço, deduções, descontos, alíquota, ISS
    retido, retenções em JSON) e os calculados no envio (base, ISS, total
    retido, líquido).
  - **Vínculo:** `origem_tipo = 'avulso'` e `conta_receber_id`, opcional, que
    vira nulo se a conta for apagada.
  - **Rastro:** quem criou e quando; quando foi enviada, autorizada e
    cancelada; quem cancelou e o motivo.
  - **Índices:** `UNIQUE (tenant_id, ref)` (3.3).
  - O projeto e a versão **não** apagam em cascata: obra com nota não some.
    Apagar a empresa inteira continua apagando tudo.
- **`nota_servico_evento`**: o histórico de cada criação, envio, consulta,
  rejeição e cancelamento, com a resposta crua do provedor (sem token). Só
  cresce.
- A migração foi aplicada, desfeita pelo `down/` e reaplicada na base local.

## Permissões (seção 6)

| Tela/ação | Padrão |
|---|---|
| `notasfiscais`: ver a lista, montar e corrigir rascunho | owner/admin; membro com o padrão de hoje; **contador vê** (6.4) |
| `notaemitir`: enviar ao provedor | **só owner e admin** (`TELAS_SENSIVEIS`); concedível na Gestão de Acessos |
| `notacancelar`: cancelar nota autorizada | **só owner e admin** (`TELAS_SENSIVEIS`); concedível |

O teste que impede que uma permissão se amplie sem querer (Prompt AJ, 11.1)
ganhou uma única exceção declarada: o contador **ver** as Notas Fiscais, que
o prompt pede (6.4).

## Regras (`src/lib/nota-servico.ts`, puro e testado)

- **Ciclo de vida:** rascunho → processando → autorizada | rejeitada;
  autorizada → cancelada; rejeitada → processando (nova tentativa).
  **Nenhuma situação volta.**
- **`ref` por tentativa:** id da nota sem hífens + `t` + número da
  tentativa.
  - Mesma tentativa, mesma ref: duplo clique ou falha de rede não emitem outra
    nota.
  - Só depois de **rejeição** vem uma ref nova.
  - Não exigiu alterar `tipos.ts`.
- **Conferência antes do envio (4.3):** tudo o que `montarPayloadNfse` já
  recusa, mais:
  - o CPF do tomador;
  - o nome do tomador;
  - o código IBGE, a UF e o CEP do tomador;
  - a competência.

  Todos os motivos aparecem de uma vez.
- **Nome do arquivo:** em homologação começa com
  `HOMOLOGACAO-SEM-VALOR-FISCAL-`.
- `calc/nfse.ts`, `fiscal/nfse-payload.ts` e `fiscal/focus.ts` **não foram
  alterados** (10.2).

## O que fica para o servidor (Coolify)

- `NFSE_TENANT_ID`: o id da Cliente Piloto. Sem ele, ninguém emite, e a tela vai dizer
  isso.
- `FOCUS_NFE_TOKEN_HOMOLOGACAO` e `FOCUS_NFE_TOKEN_PRODUCAO`: os tokens do
  Focus.

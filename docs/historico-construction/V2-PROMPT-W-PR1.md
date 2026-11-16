# Prompt W · PR W-1 — actions próprias, validação de documento, papel 20

Primeira PR de código do Prompt W, conforme
[`V2-PROMPT-W-FASE1.md`](./V2-PROMPT-W-FASE1.md). **Nenhum registro existente
é alterado; sem migração; sem `UNIQUE`.**

## O que muda

| Seção | Entrega |
|---|---|
| **5.4** actions | As cinco (`addStakeholder`, `updateStakeholder`, `setStakeholderAtivo`, `deleteStakeholder`, `extractFornecedorFromDoc`) saíram de `actions/despesas.ts` para **`actions/stakeholders.ts`**. A leitura por IA não mudou uma linha |
| **5.2** retorno | Todas devolvem `{ ok, id, avisos } \| { ok: false, error }` — nada lança, nada cala. A tela mostra o erro (formulário fica aberto) e o aviso (grava e informa) |
| **5.3** nome | Vazio é recusado nas duas; "Sem nome" não existe mais |
| **3.2 / 3.3** documento | `cnpjValido` **reaproveitado** de `calc/emitente-fiscal.ts`; **`cpfValido` criado** em `src/lib/stakeholder-regras.ts` (módulo novo, puro; `emitente-fiscal.ts` ficou com o que é do emitente). `trim()` nas duas actions. Inválido é recusado só quando **digitado agora**: na edição, documento igual ao gravado não é recusado (3.6, teste 11) |
| **3.4** tipo × documento | Aviso, sem bloquear |
| **3.5** duplicidade | Aviso com o nome do outro cadastro, sem bloquear; comparação pelos dígitos (pega `12.345` × `12345`) |
| **3-A.3** endereço | PF com papel de prestação de serviço ou mão de obra (RPA ou CLT) exige endereço **ao criar** e **quando a edição cria a condição** (vira PF, ganha o papel) ou apaga o endereço. Cadastro antigo já na condição continua editável (3-A.4). Orientação 3-A.2 ("prefira PJ com CNPJ") no formulário |
| **1.1** papel 20 | "Pagador por Terceiro" em `PAPEIS_STAKEHOLDER` — aparece no cadastro, na edição e no enum da leitura por IA |
| **BW-2** | Papel gravado fora da lista aparece na edição como opção marcada ("fora da lista") e é reenviado: a edição não o perde mais |
| Edição inline | Ganhou os campos de endereço (é o que permite completar um cadastro sinalizado). Só grava endereço quando o formulário o envia. Passou a `onSubmit`: o React 19 reinicia os campos ao fim de uma `action`, e um erro de validação apagava o que o usuário tinha digitado |
| Auditoria | `create` e `update` registram nome, papéis, `changes` campo a campo e o documento **só mascarado** (regra global 3); `deactivate`/`reactivate` registram o nome |

## Testes

`stakeholder-regras.test.ts` (8, puros) e `actions/stakeholders.test.ts`
(14, integração): itens 6, 7, 8, 9, 10, 11, 12, 13, 13a, 13a-1, 13b, 17 do
prompt, BW-2 e a máscara no log. Suíte (1198), `tsc`, `eslint`, `next build`
verdes.

Navegador (local): papel 20 no formulário; PJ com CPF já de outro cadastro
grava com os dois avisos; CNPJ inválido é recusado; na edição, PF + Mão de
Obra sem endereço é recusado com a mensagem e os valores digitados ficam;
com endereço grava. Hash de `stakeholder` do tenant antes = depois.

## Fica para depois

W-2 exclusão (seis checagens, nome digitado, inventário no log); W-3
seletores (ativos; pagador por papel); W-4 listagem (busca, filtro, sinais);
W-5 assistente.

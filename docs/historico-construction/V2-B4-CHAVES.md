# B4 — Chaves de mudança por empresa

Decidido em 30/09/2026: construir agora, antes do Bloco 2.

## Para que serve

A regra 3.3 do pacote V2 diz que mudança que altera número de relatório ou
acesso em produção entra **atrás de uma chave por empresa, desligada**. Você vê
a prévia e só então liga. Com a chave desligada, o sistema devolve exatamente o
de hoje. O código não tinha esse mecanismo, e as mudanças de receita do
Bloco 2 (BI-1, BP-2, BQ-2) dependem dele.

## O que entra

| Peça | Onde |
|---|---|
| Tabela `tenant_flag` (empresa, chave, ligada, quem, quando), nova e vazia | migração `0043_tenant_flag.sql`, com `down` |
| Catálogo das chaves: o que cada uma muda, de onde vem, onde está a prévia | `src/lib/chaves.ts` |
| Leitura: uma consulta por requisição | `src/lib/chaves-tenant.ts` |
| Tela **Configurações → Chaves de mudança** (`/chaves`): só owner e admin, mesmo com override; ligar exige marcar "conferi a prévia"; desligar não exige | `src/app/(app)/chaves/page.tsx`, `src/lib/actions/chaves.ts` |
| Auditoria de cada troca: `chave.ligar` / `chave.desligar`, com de → para, na mesma transação | idem |

Chave gravada no banco que não está no catálogo é ignorada e vale desligada.

## A primeira chave: padrão novo do `membro` (AJ 1.4)

Até aqui, essa chave era a variável de ambiente `MEMBRO_PADRAO_RESTRITO`. Ela
passa a ligar de **dois jeitos, e basta um**:
- pela tela Chaves de mudança;
- pela variável de ambiente, que continua valendo.

**Nada muda no deploy.** Quem não usa a variável segue desligado, e quem usa
segue ligado. A tela avisa quando a chave está ligada pela variável. A prévia
continua na Gestão de Acessos, que agora aponta para a tela das chaves.

## Verificação

- `chaves.test.ts`:
  - ids únicos, e toda chave tem prévia;
  - chave fora do catálogo vale desligada.
- `actions/chaves.test.ts` (Postgres):
  - sem linha no banco, a chave está desligada;
  - membro com override não liga;
  - ligar sem marcar a prévia é recusado;
  - chave fora do catálogo é recusada;
  - o owner liga, e vale só para a empresa dele, com auditoria de → para;
  - ligar de novo não gera outra linha de auditoria;
  - desligar volta ao comportamento de antes;
  - a variável de ambiente continua ligando.
- `nav-menu.test.ts`:
  - as 40 telas do menu antigo continuam lá, e as novas são declaradas uma a
    uma;
  - `/chaves` só aparece para owner e admin, mesmo com override.
- Suíte inteira: 921 passando. `typecheck`, `lint` e `next build` limpos.
- Navegador:
  - o item aparece no menu;
  - a chave começa desligada;
  - ligar sem marcar mostra a mensagem;
  - depois de ligar, a tela mostra "Ligada" e quem trocou;
  - com a chave ligada, o cartão de prévia some da Gestão de Acessos;
  - desligar funciona;
  - a auditoria registra as duas trocas;
  - nenhum erro de JavaScript.

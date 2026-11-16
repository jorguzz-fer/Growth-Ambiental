# Prompt AL · AL-2 — contador configurável, com teto de leitura

Partes 2, 3 e 4 do Prompt AL. Decisão BAL-2 adotada: **opção 1, teto de
leitura.**

## O que mudou

- **`CONTADOR_VE` virou ponto de partida.** A lista continua a mesma, com as
  oito telas: DRE, Fluxo de Caixa, Medição, Resumo, Consolidado, Plano de
  Contas, Despesas e Auditoria. Agora ela é exportada e a Gestão de Acessos a
  mostra como "Padrão do papel" na linha do contador.
- **Teto de leitura.** No último passo de `effectivePermissions`, depois do
  merge dos overrides, o contador fica com `criar`, `editar` e `excluir`
  negados em toda tela. O `ver` dele segue o que o override disser. Aplicado
  antes do merge, o override sobrescreveria o teto.
- **A gravação recusa escrita.** `setMemberPermissions` devolve "O contador é
  somente leitura: em "DRE" só a coluna Ver pode ser marcada." quando alguém
  chama a action direto com escrita para um contador. Nada é gravado.
- **A matriz.** Na linha do contador só a coluna Ver tem caixa. Criar, Editar
  e Excluir aparecem como traço, com o motivo escrito acima da tabela.

## O que não mudou

- Owner, admin, membro e engenheiro: nenhuma célula muda.
- O contador sem override continua vendo exatamente as oito telas.
- Nenhum vínculo, papel ou override foi alterado por esta tarefa.
- Override de escrita já gravado para um contador continua no banco. O teto
  só o nega no efetivo.

## Um efeito a saber

Quando owner ou admin **salva** a linha de um contador, a gravação segue a
regra do Prompt AJ: só o que diverge do padrão do papel fica gravado. Um
override antigo de escrita, que o teto já anulava, deixa de ser gravado
nesse momento. O efetivo não muda, então o log não registra diferença. Isso
só acontece com o clique em Salvar, nunca sozinho.

## Testes

- `permissions-al.test.ts`, só lógica:
  - padrão das oito telas;
  - conceder e revogar Ver;
  - troca de papel aplica o padrão;
  - o teto roda depois do merge;
  - recusa na gravação;
  - antes e depois, célula a célula, com 400 combinações de override por
    papel e as duas posições da chave do membro, sem nenhuma célula
    ampliada.
- `users-contador.test.ts`, com banco: chama a action direto e confirma a
  recusa, a concessão, a revogação, a troca de papel e o override antigo
  intacto.
- `permissions-aj.test.ts`: o teste "tudo igual a antes" passou a aceitar,
  para o contador, só a escrita negada.
- Navegador, com um contador temporário depois apagado:
  - a matriz mostra o motivo, o padrão, uma caixa por linha e traços;
  - conceder Contas a Pagar e salvar funciona;
  - o contador entra, vê Despesas sem botão de lançar e abre Contas a Pagar;
  - Caixa fica negado.

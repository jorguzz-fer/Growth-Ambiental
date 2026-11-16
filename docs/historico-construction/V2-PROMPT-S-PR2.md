# Prompt S · PR S-2 — exclusão informada

Seção 2 do Prompt S. **Nenhuma despesa alterada ou removida; sem migração.**

## O que muda

| | Antes | Agora |
|---|---|---|
| **2.1 / 2.2** inventário | `window.confirm` com valor e nº de anexos | painel na tela (formulário de edição e linha da tabela) com o que está vinculado, vindo do servidor (`inventarioDeExclusao`, só leitura): parcelas (e pagas), pagamentos e **total já saído do caixa**, acertos **pelo PED**, obrigação com terceiro e restituições, documentos fiscais e anexos, movimentos bancários que ficariam sem vínculo |
| recusa (Prompt I §12, **mantida** — conflito 1 da Fase 1) | mensagem genérica | o painel já diz **qual vínculo impede** e desabilita a confirmação; o caminho é "Cancelar despesa" |
| **2.3** confirmação | clique | **PED digitado** (sem diferenciar caixa e acento); despesa sem PED exige a palavra EXCLUIR |
| **2.4** auditoria | `valor` e `numDoc` | PED, valor, fornecedor (nome e id), competência, vencimento, conta CEF, categoria, status, versão e o inventário completo (contagens, total pago, PEDs dos acertos) |
| **2.5** transação | delete e `logAudit` soltos | os dois na mesma transação: se o log falhar, nada é apagado |
| **2.6** diagnóstico | — | consultas no SQL da Fase 1 (exclusões já ocorridas × saídas sem vínculo). Local: 0 exclusões no log; 45 de 46 movimentos sem vínculo de despesa (seed sem conciliação) |

`deleteDespesa(id, confirmacao)`: a assinatura ganhou o segundo parâmetro;
os dois chamadores (formulário e tabela) passam pelo painel. O teste do Prompt
I (§12) foi adaptado para passar o PED.

## Testes
`exclusao-informada.test.ts` (5, integração): 4 inventário (e o bloqueio
nomeado), 5 PED exigido, 6 auditoria com fornecedor/competência/conta/
categoria/valor/contagens, 7 transação (auditoria falha → despesa continua,
sem log), recusa com anexo mantida. Suíte (1235), `tsc`, `eslint`, `next build`
verdes. Navegador: "Excluir" no formulário abre o painel com o inventário;
confirmação errada é recusada; "Voltar" fecha; "Excluir" na tabela abre o
mesmo painel. Hash de `despesa` antes = depois.

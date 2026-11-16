# Prompt AN · Relatório final — Conferência de lançamentos e de planos

Prompt AN (32 de 42). Cinco PRs, todos mergeados: Fase 1, AN-1, AN-2,
AN-3 e AN-4. Detalhes em
[`V2-PROMPT-AN-FASE1.md`](./V2-PROMPT-AN-FASE1.md),
[`PR1`](./V2-PROMPT-AN-PR1.md), [`PR2`](./V2-PROMPT-AN-PR2.md) e
[`PR3`](./V2-PROMPT-AN-PR3.md).

## 1. BAN-1: quantos lançamentos a quarta condição traz

**Base local:** 75 despesas, e nenhuma em qualquer das quatro condições. A
quarta condição traz zero aqui. **Produção:** rodar os relatórios 1 a 3 de
[`sql/v2-prompt-an-diagnostico.sql`](./sql/v2-prompt-an-diagnostico.sql).
A coluna `so_sem_competencia` é o número pedido. Filtros e paginação
entraram junto, sem esperar o número.

## 2. BAN-2: híbrido

- Cada linha tem o próprio seletor.
- O lote só vale quando os marcados são do mesmo fornecedor ou da mesma conta
  CEF.
- Seleção misturada avisa quantos fornecedores há e desabilita o lote.

**Pergunta para o dono:** confirma o híbrido?

## 3. BAN-3: aviso, não recusa

A materialização do Prompt K **não existe**: está presa ao BK-0. O expansor
de recebíveis que todo o sistema usa **já trata** a data impossível, levando
o vencimento ao último dia do mês. Pela regra do prompt ("com tratamento,
aviso com o dia que será usado"), o cadastro avisa. Quando a K-5 vier, ela
deve usar o mesmo expansor. **Pergunta para o dono:** prefere que o cadastro
recuse o dia 29, 30 ou 31?

### 3a. Planos existentes com dia acima de 28

Na base local, nenhum. Em produção, a lista sai do relatório 6.4 do SQL.
**Ela é para entregar ao cliente. Nenhum plano foi corrigido.**

### 3b. O que saiu com a tela de planos

- A página e o item de menu.
- `getPlanosSuspeitos` e `PlanoSuspeito`.
- A condição de carência, com o filtro de meses.

`calc/carencia.ts` **não mudou** e continua servindo a `parcelas.ts` e
`receivables.ts`. Os testes dele passam.

### 3c. Onde a data impossível passou a ser verificada

No cadastro do plano da unidade, grupos Mensais, Semestrais e Anuais, ao
preencher o 1º vencimento e as parcelas. A mensagem é, por exemplo: "Dia 31
não existe em fevereiro/2027 — a 2ª mensal cai em 28/02/2027 (último dia do
mês)." O grupo ganha o selo "vencimento a conferir".

### 3d. Unidade com o mesmo nome do projeto (6.6), para o Prompt J

O relatório 6 do SQL lista unidades cujo código é igual ao nome do projeto.
Na base local, nenhuma. Fica encaminhado ao Prompt J como achado de
cadastro.

### 3e. Planos que o diagnóstico nunca alcançou (6.7)

Unidade vendida sem entrada, ou sem mensais, nunca aparecia na tela antiga.
Por exemplo, um plano só com financiamento. O relatório 7 do SQL lista
essas unidades. Na base local, nenhuma.

## 4. A quarta condição

Despesa **não cancelada** com competência nula ou só com espaços. O texto
do motivo é **"sem competência — fica fora da DRE por mês e por ano"**.

**Conflito com o texto do prompt:** a DRE põe essa despesa num balde próprio
e a mostra no Acumulado. Ela só some das visões por ano, período e mês. O
texto diz o efeito verdadeiro, e a DRE não foi alterada.

## 5. Os dois números lado a lado

| Esta tela | Rodapé da DRE |
|---|---|
| badge "N a conferir" com a soma, do conjunto inteiro | **ainda não existe**: é do Prompt AC, Parte 4 |

A comparação fica para quando o Prompt AC entrar. O assistente já mostra,
por motivo, quanto fica fora ou distorce a DRE.

## 6. A transação

O laço inteiro, com updates e logs, roda em `db.transaction`. Se qualquer
item falhar, o banco desfaz tudo. A tela diz: "A reclassificação falhou e
foi desfeita por inteiro: nenhum lançamento foi alterado." Há um teste com
falha simulada no segundo log, e nada fica gravado.

## 7. A triagem no SQL

As quatro condições viram `where`. As credoras chegam como parâmetro,
calculadas pela regra de `natureza-dre.ts` sobre a lista de categorias do
sistema. O arquivo não mudou e a lista não foi copiada. A regra da
cancelada continua em JavaScript, em `motivosDaDespesa`.

## 8. Motivo com código e texto

Cada motivo tem código e texto, em `conferencia-regras.ts`. O código decide
quem pode ser selecionado. Há teste mostrando que renomear o texto não muda
a seleção.

## 9. Filtros e paginação

- Filtros por projeto, competência (MM/AAAA) e fornecedor, por URL.
- Paginação por cursor, com 100 por página, do maior valor para o menor.
- O badge e a soma contam o conjunto inteiro. Com filtro, a tela mostra
  também o número e a soma do filtro.

## 10. Ids em `SCREENS`

- Entrou `conferencia`, e a tela mudou para `/conferencia`. A URL antiga
  redireciona.
- A permissão **acompanha a de Despesas**, inclusive o override de cada
  membro. Um teste confere a igualdade para os cinco papéis, as duas
  posições da chave do membro e cinco formatos de override.
- **Ninguém perdeu nem ganhou acesso.**
- A página checa `conferencia` e `despesas`.

## 11. Nenhuma correção automática

A tela continua mudando só `categoria_dre`, e só pela ação do usuário, com
preview. Nada mudou em competência, valor ou plano de pagamento. Nenhuma
migração.

## 12. O assistente

O painel "Assistente IA · Somente leitura" fica ao lado da lista e tem
quatro ações:
- **Agrupar por causa provável:** fornecedor, conta CEF ou competência.
- **O que isso tira dos relatórios:** por motivo, quanto e o efeito
  verdadeiro na DRE.
- **Desde quando:** se o problema é antigo ou ainda acontece.
- **Padrão no que falta:** fornecedor, competência ou quem lançou.

O que ele não faz:
- Não chama action e não reclassifica.
- Não sugere categoria.
- Sem pendência, diz que isso não atesta a classificação.

Quem não vê Despesas não recebe nem o agregado. Tudo é conta local, sem
modelo de IA.

## 13. Limitações

- **O número do rodapé da DRE** só existe depois do Prompt AC.
- **A Conferência lista todas as versões.** Isso inclui despesas de
  Orçamento e Previsão, cuja DRE lê o planejamento e não esta tabela. O
  assistente avisa quantas são. O filtro por versão não foi pedido.
- **A competência do filtro é exata.** Ela não aceita período ou intervalo.
- **A origem dos logs** continua `diagnostico/categorias-invertidas`, para
  não quebrar a leitura dos registros antigos.
- **Exemplo do prompt.** O texto dizia que "31/03 quebra em junho". Na
  verdade quebra primeiro em abril, e também em junho. O aviso mostra a
  primeira parcela e quantas mais.

## Perguntas para o dono

1. **BAN-2:** confirma o lote híbrido?
2. **BAN-3:** o cadastro deve só avisar, como está, ou recusar o dia acima
   de 28?
3. **Texto do motivo:** confirma "fica fora da DRE por mês e por ano", em
   vez de "não entra na DRE"?

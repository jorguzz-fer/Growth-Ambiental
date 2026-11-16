# Prompt AO · PR 1 — o download registrado e a tela que diz a verdade

Prompt AO (41 de 42), primeiro PR: **Partes 6 e 7**. O prompt manda a Parte 6
primeiro. O pacote completo (Partes 1 a 5, 8) depende das respostas abaixo.

## Inventário (o que existia)

- `/backup/download` gera um ZIP por semestre com:
  - uma planilha de 3 abas (Despesas, Contas a Receber, Caixa), com 8 a 10
    colunas e **nenhuma chave**;
  - os documentos salvos no período;
  - o `_leia-me.txt`.
- O pacote leva **4 tipos de dado**. Faltam cadastro, unidades (com o plano de
  pagamento, de onde a receita é calculada), orçamentos, medições, permutas,
  etc.
- O download **já era registrado** na Auditoria (`backup.download`, desde o
  AK), mas sem dizer o que o pacote continha.
- O aviso do topo voltava **sempre**, mesmo com o semestre já baixado.
- A tela se chamava "Backup & Arquivamento" e não arquiva nada.

## O que muda

- **6.2:** o registro do download guarda também o conteúdo: despesas,
  contas a receber, caixa, documentos incluídos, documentos do período e
  documentos que falharam.
- **6.3 · O aviso diz a verdade.** O semestre encerrado só conta como salvo
  quando o backup foi baixado **depois do fim do semestre**. O que foi baixado
  durante o semestre estava incompleto, e a tabela marca isso. Com o backup
  feito, o aviso do topo e o card da tela somem.
- **Coluna "Último backup"** na tabela de semestres: quando e quem.
- **7.1 · Nome:** "Backup de dados" (BAO-3, recomendação 1).
- **7.2 · Ressalva:** a tela diz que o backup do banco e do storage é outro
  (infraestrutura) e que este arquivo não restaura nada.
- **7.3:** a tela diz que "encerrado" é só calendário e que semestre
  encerrado continua recebendo lançamento.
- **6.2/6.4:** sem permissão, `AccessDenied` (antes, branco). Continua
  aceitando qualquer semestre, inclusive o corrente.

O texto "é apenas uma cópia, nenhum dado foi removido" foi mantido nos três
lugares. A planilha e o `_leia-me.txt` não mudaram. `semester.ts` não mudou.
Nenhuma escrita em dado de negócio: a única escrita é a linha de auditoria,
que já existia.

## Perguntas ao dono antes do pacote completo (Partes 1 a 5)

- **BAO-1 · A lista de tabelas.** Proposta do prompt: 35 tabelas, em
  **cadastro íntegro** e **movimento do período**. Ficam de fora autenticação
  (`user`, `account`, `session`, `verificationToken`; **senha e MFA nunca
  saem**), acesso (`membership`) e `number_sequence`. Este último entra só
  como informação no `_leia-me.txt` (prefixo, próximo número, dígitos).
  **Confirmar.** E o `audit_log`: entra ou não?
- **BAO-2 · Dado pessoal.** Com o cadastro do cliente inteiro, o pacote passa a
  levar CPF, endereço e telefone, que hoje não leva. Os campos sensíveis do
  BM-3 (renda, comprometimento, FGTS, score, restrições, estado civil,
  inteligência de mercado) ficam fora até decisão, e o `_leia-me.txt` declara
  isso.
  - Quem baixa: continua `backup:ver` ou vira permissão própria (owner/admin)?
  - O `_leia-me.txt` leva aviso de guarda (LGPD)? Proposta: sim.
- **BAO-3:** confirmar o nome "Backup de dados".

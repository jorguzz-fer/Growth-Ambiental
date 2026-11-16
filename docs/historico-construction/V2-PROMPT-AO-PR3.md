# Prompt AO · PR 3 — o pacote completo, gerado em segundo plano

Terceiro PR do backup completo. A tela **Backup de dados** passa a gerar o
**pacote completo** e o histórico dos pacotes.

## Uma decisão revista: quem acessa o Backup

O Prompt PLAT (18/10) tinha tirado o Backup de todos os papéis do cliente: só
os operadores da plataforma acessavam. Hoje (26/10), ao responder o BAO-2, o
dono escolheu "permissão própria, de proprietário e administrador". Avisei do
conflito com a decisão de 18/10 e perguntei de novo. **Resposta: abrir para
dono e admin.**

Como ficou:
- `backup` é **tela sensível**: nasce só com **proprietário e administrador**.
  Membro, contador e engenheiro não veem.
- Pode ser concedida a outra pessoa na **Gestão de Acessos**.
- O **operador da plataforma** continua alcançando.
- **Chaves de mudança continuam só da plataforma.**
- O aviso de backup no topo do app (removido pelo PLAT) **não volta**.

Uma única permissão, a tela "Backup de dados", governa os dois arquivos: o ZIP
simples e o pacote completo.

## Como funciona, para quem usa

1. Em **Configurações → Backup de dados**, card **Pacote completo**: escolha o
   semestre e clique em **Gerar pacote completo**.
2. A geração roda **no servidor, em segundo plano**. A tela mostra a etapa e o
   progresso ("Lendo tabelas: despesa · 12/56", "Baixando documentos ·
   120/400", "Compactando"…) e se atualiza sozinha a cada 3 segundos.
3. Quando fica **Pronto**, aparece **Baixar** e o histórico mostra: quem pediu,
   quando, linhas, documentos (incluídos, do período e os que falharam) e
   tamanho.
4. Um pedido por vez, por empresa. Pedido sem sinal há mais de 15 minutos (o
   servidor reiniciou no meio) aparece como **Interrompido**, e dá para pedir
   de novo.
5. O ZIP simples ("Baixar ZIP" na tabela) continua igual.

## O que vai no ZIP (3.3)

```
Backup_completo_<empresa>_<semestre>.zip
├── _leia-me.txt                 o que entrou, o que ficou fora e por quê, LGPD
├── _manifesto.json              linhas, recorte e somas de controle por tabela
├── planilha/dados_<semestre>.xlsx   a MESMA planilha de 3 abas de sempre
├── dados/<tabela>.json          uma por tabela (56), todas as colunas e chaves
└── documentos/NNN_<arquivo>     os documentos do semestre (sem ASO)
```

## Escala (Parte 4)

- **O recorte é no SQL** (PR 2): nenhuma tabela é carregada inteira.
- **Documentos em paralelo:** 8 por vez, gravados direto no disco
  temporário. Com 150 ms por documento, 400 documentos levam cerca de 7,5 s,
  contra 60 s em série.
- **Nada inteiro na memória:**
  - os documentos vão para o disco;
  - o ZIP é escrito em disco por stream;
  - o ZIP vai ao R2 por stream.
  A pasta temporária é apagada no fim, com sucesso ou falha.
- **Falha declarada:** documento ou tabela que falha entra no leia-me e o pacote
  sai. Uma falha geral (por exemplo, o R2 fora do ar) marca o pedido como
  **Falhou**, com a mensagem. Ele nunca fica "gerando" para sempre.
- **Teste com 400 documentos:** o pacote termina, nunca há mais de 8 downloads
  ao mesmo tempo e o documento que falhou aparece no leia-me.
- **Limite conhecido:** um único envio ao R2 aceita até 5 GB. Acima disso, o
  envio terá que ser em partes (multipart).

## Onde o pacote fica, e o download

- O pacote fica no **R2**, em `backups/<empresa>/<pedido>/<arquivo>.zip`. A
  tabela nova `backup_pacote` (migração **0070**, aditiva, com `down`) guarda o
  pedido, o progresso e o resumo. O resumo só tem contagens, sem nome de
  arquivo nem dado pessoal.
- **Baixar:**
  - o download é registrado na Auditoria **antes** (`backup.download`, com
    `pacote: "completo"`, o id e o conteúdo), e conta para "Último backup" e
    para o aviso da tela;
  - depois o sistema redireciona para um **link temporário de 5 minutos**;
  - o link **nunca usa o domínio público do bucket**: o pacote tem dado
    pessoal.
- Pedir o pacote também vai para a Auditoria (`backup.pacote.gerar`).
- **Os pacotes não são apagados automaticamente.** Se quiser prazo de
  validade (por exemplo, 30 dias), é uma decisão sua.

## O que não muda

- A planilha de 3 abas é gerada pela mesma função no ZIP simples e no
  completo, e sai idêntica.
- O ZIP simples, `semester.ts` e o leia-me do ZIP simples continuam como
  estavam.
- Nenhuma escrita em dado de negócio: a única escrita é o registro do pedido e
  a Auditoria.

## Testes

- `backup-geracao.test.ts` (banco real, R2 simulado):
  - 400 documentos, com concorrência no máximo 8;
  - estrutura do ZIP;
  - manifesto batendo com cada arquivo;
  - documento falho declarado;
  - resumo sem nome de arquivo;
  - falha no envio marca "falhou" e apaga a pasta temporária;
  - quem pode pedir, sem R2, um pedido por vez e Auditoria;
  - download com Auditoria e link assinado; recusas 409, 404 e 403.
- `backup-historico.test.ts`: o pedido interrompido e o limite de concorrência.
- `permissions-plat.test.ts`: o Backup nasce com proprietário e administrador,
  pode ser concedido, e o operador continua alcançando. Chaves continua só da
  plataforma.

## Próximo (PR 4)

O assistente somente leitura da tela (Parte 8) e o relatório final do AO.

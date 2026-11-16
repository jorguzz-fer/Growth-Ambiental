# Prompt AO — relatório final: backup completo

**Situação:** pronto no código (PRs 1 a 4).

Para gerar o pacote completo em produção, é preciso que o **R2 esteja
configurado**. Ele já está, porque é o mesmo dos documentos. **Ainda não
testado em produção:**
- o envio real ao R2 e o link assinado (nos testes o R2 foi simulado);
- os tempos reais (item 7);
- as referências encontradas no primeiro pacote (item 12).

## Os 12 itens do relatório (seção 13 do prompt)

### 1. BAO-1: a lista final
**56 tabelas entram**: as 35 da proposta mais as que nasceram depois. A lista
tabela a tabela, com família e recorte, está em `V2-PROMPT-AO-PR2.md` e no
código, em `src/lib/backup-catalogo.ts`.

**Ficam fora, com o motivo escrito no leia-me:**
- `user`, `account`, `session`, `verificationToken`: autenticação (senha e MFA
  nunca saem);
- `membership`: permissão;
- `number_sequence`: vai como informação no leia-me;
- `tenant_flag`: chaves;
- `ia_uso`: consumo de IA;
- `backup_pacote`: o registro dos próprios pacotes.

O **log de auditoria entra**. Há um teste que falha se uma tabela nova do
banco ficar sem decisão.

### 2. BAO-2: quem baixa, o que fica de fora, o aviso
- **Quem baixa:** proprietário e administrador. A permissão "Backup de dados"
  pode ser concedida a outra pessoa na Gestão de Acessos. O operador da
  plataforma continua alcançando.
  - Isso **revê o Prompt PLAT de 18/10**, que deixava o Backup só com a
    plataforma. O conflito foi apontado, a pergunta foi feita de novo e a
    resposta foi abrir para dono e admin.
  - Chaves continua só da plataforma.
- **Fica de fora:**
  - os 24 campos sensíveis do BM-3 do comprador;
  - endereço, salário, jornada, banco e PIX do funcionário;
  - os documentos de ASO (linha e arquivo).
- **O aviso:** o `_leia-me.txt` diz quais dados pessoais o pacote contém, que a
  guarda é de quem baixou e o que ficou fora. A tela diz o mesmo antes do
  botão.

### 3. BAO-3: o nome
"Backup de dados", com a ressalva de que o backup do banco e do storage é
outro (PR 1).

### 4. A estrutura do pacote e o manifesto
```
Backup_completo_<empresa>_<semestre>.zip
├── _leia-me.txt
├── _manifesto.json        formato growth-backup/1
├── planilha/dados_<semestre>.xlsx
├── dados/<tabela>.json    56 arquivos, todas as colunas e chaves (nome do banco)
└── documentos/NNN_<arquivo>
```
O manifesto tem uma entrada por tabela: arquivo, família, camada, recorte,
linhas, linhas sem data, colunas omitidas e **somas de controle exatas** das
colunas numéricas. Também traz os documentos (do período, incluídos,
falhos, ASO omitidos), as referências fora do recorte, a numeração, o que
ficou fora e `restaura: false`.

### 5. Movimento × cadastro
- **Cadastro** (obras, versões, unidades com o plano de pagamento, clientes,
  fornecedores, contas, orçamento, funcionários…) vem **inteiro**, na data de
  geração.
- **Movimento** vem **pelo semestre**, filtrado **no SQL**, conforme a tabela:
  - pela data "MM/DD/AAAA" (com a segunda coluna como reserva, no caso das
    contas a receber);
  - pela competência "MM/AAAA";
  - pelo instante;
  - ou acompanhando o registro pai.
- A linha sem data reconhecível entra em todo pacote e é contada à parte.
- O leia-me declara as duas datas.

### 6. Geração assíncrona e onde o pacote fica
- O pedido grava uma linha em `backup_pacote` (migração 0070) e a geração roda
  **depois da resposta** (`after()` do Next), no próprio servidor.
- A tela mostra etapa e progresso e se atualiza sozinha.
- Pedido sem sinal há mais de 15 min vira "Interrompido".
- O ZIP é escrito em disco por stream e enviado ao **R2** por stream, em
  `backups/<empresa>/<pedido>/`.
- O download é um **link assinado de 5 min**, nunca pelo domínio público.

### 7. Tempos
- **Medido nos testes** (R2 simulado, cerca de 2 ms por documento): o pacote
  com **400 documentos** fica pronto em cerca de **0,5 s**, com no máximo **8
  downloads ao mesmo tempo**.
- **Estimativa** com a latência real do R2 (150 a 400 ms por documento): 400
  documentos levam de **7,5 a 20 s**, contra **1 a 3 min** em série antes.
- **Os tempos reais de produção** (pacote pequeno, médio e com 400 documentos)
  ficam para medir no primeiro uso. A tela mostra quando cada pacote foi
  pedido e quando ficou pronto.

### 8. Auditoria
- **Pedir o pacote** grava `backup.pacote.gerar` (semestre e id).
- **Baixar** grava `backup.download` **antes** do link, com semestre, arquivo,
  bytes, `pacote: "completo"`, id e o resumo (só contagens, sem nome de
  arquivo nem dado pessoal).
- O ZIP simples continua gravando o seu `backup.download` (PR 1).

### 9. O aviso considera o histórico
O semestre encerrado só conta como salvo com um download **depois do fim do
semestre** (PR 1). O download do pacote completo conta para "Último backup" e
para o aviso da tela.

O assistente lista os **períodos sem backup** e o que **mudou depois do último
download** de cada semestre. O aviso do topo do app foi removido pelo PLAT e
não voltou.

### 10. Nenhuma escrita em dado de negócio
- O teste conta as linhas de **todas as 56 tabelas** antes e depois da
  extração, e a contagem é a mesma.
- A geração só escreve no registro do pedido (`backup_pacote`) e na Auditoria.
- Nenhum documento do R2 é movido, renomeado ou removido. O pacote é um objeto
  novo.

### 11. A planilha antiga continua idêntica
A planilha de 3 abas saiu para uma função única (`planilhaDoSemestre`), usada
pelo ZIP simples e pelo pacote completo, e não teve nenhuma linha alterada. Os
testes do backup simples continuam passando.

### 12. Referências fora do recorte no primeiro pacote real
**Pendente**: só aparece quando o pacote for gerado com os dados de produção.
O caso esperado é o pagamento de um semestre que aponta para uma despesa de
outro. O leia-me e o assistente vão listar.

## O assistente (Parte 8)

Na direita da tela de Backup. É determinístico: não usa modelo de IA e não
chama rede. São três botões:
- **O que este pacote contém**: o último pacote pronto, lido do resumo em
  frases.
- **O que mudou desde o último backup**: contagem de linhas criadas ou
  alteradas depois do último download, por tabela.
- **Períodos sem backup**.

Ele **nunca** gera nem baixa pacote e **nunca** mostra conteúdo de linha. Um
teste garante que o painel não importa action nem link de download.

## Limites conhecidos

- **Envio ao R2:** um envio único aceita até 5 GB. Acima disso, o envio precisa
  ser em partes.
- **Pacotes no R2 não expiram.** Se quiser prazo (por exemplo, apagar depois de
  30 dias), é uma decisão sua.
- **"O que mudou"** só enxerga tabelas com data de criação ou de alteração.
- **A planilha** usa as mesmas consultas de antes (lê a tabela e filtra em
  memória). Foi mantida assim para sair idêntica. O pacote completo em si é
  recortado no SQL.
- **O pacote não restaura nada.** A restauração não existe e continua fora de
  escopo.

## Validação

- tsc limpo, eslint sem erros e build ok.
- vitest: 2139 testes passam. Falham 2 que já falhavam no main e não são do
  AO: `fatura-pagamento` e `planocontas-cris`.
- Navegador: o dono vê Backup no menu, o card do pacote completo (sem R2
  local, o botão diz por quê) e o assistente com "1º semestre de 2026: nunca
  baixado". Sem rolagem lateral no celular.

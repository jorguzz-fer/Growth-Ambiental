# PLANO DA FASE 3 — GROWTH TOOLS · CONSTRUCTION APP

Versão de 18/10/2026. Fontes: a revisão do Thiago de 14/10
([`V3-REVISAO-1410.md`](./V3-REVISAO-1410.md)), as duas reuniões de revisão
V5 ([`V3-REVISAO-1710.md`](./V3-REVISAO-1710.md)) e as decisões de 15/10 e
18/10 ([`V3-DECISOES-1510.md`](./V3-DECISOES-1510.md),
[`V3-DECISOES-1810.md`](./V3-DECISOES-1810.md)). Segue o formato do
[`v2/PROMPTS.md`](./v2/PROMPTS.md): cada prompt tem bloqueios, e **nenhum é
executado sem responder os seus**. Os prompts em si são escritos um a um,
na ordem da seção 4; este arquivo é o índice.

As quatro regras dos 42 prompts da V2 continuam: nenhum dado inputado pela
empresa é alterado; nenhuma mudança amplia acesso; mudança que altera número
em produção entra atrás de chave desligada; nada vindo de mockup entra no
código. A Fase 3 acrescenta uma quinta, pedida pelo dono: **toda gravação
assistida por IA passa pelo botão da tela**; o chat propõe, a pessoa
confirma.

---

# 1. SITUAÇÃO EM 18/10

O que já foi feito nesta fase e o que a V5 mudou no mapa.

| Item | Situação |
|---|---|
| Nomenclatura das versões (NOM) | **Feito** em 15/10 ([`V3-PROMPT-NOM-FINAL.md`](./V3-PROMPT-NOM-FINAL.md)). |
| Telas que saem | Consolidado, Assistente e Balanço do Dia. **Projeção de Receitas fica** e muda para BI. **Acerto Contábil fica** como tela. |
| Telas que mudam de módulo | Cartões de Crédito → Caixa. Projeção de Receitas → Business Intelligence. Emissão de NF-e → Receitas (quando a tela existir). |
| Renomeações | Fornecedores e Parceiros; Medição de Projeto. |
| De-para CEF → DRE | Não é tela: campo no Plano de Contas, com padrão, travando a categoria na despesa. |
| Já existe e só precisa ser mostrado | Caixa sem contas de terceiros; saída de Estoque; Equipes com parceiros; edição em Contas a Receber; Open Finance via Pluggy. |

O inventário completo, tela a tela, está na revisão V5.

---

# 2. ÍNDICE DOS PROMPTS

Os códigos reaproveitam a letra do prompt da V2 dono da tela, com sufixo
"2" (ou "3" para a tela nova ao lado). Prompts sem antecedente ganham código
próprio. Entre parênteses, o que mudou desde o plano de 15/10.

## Bloco 0 · Arquitetura e limpeza

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 1 | **NOM** | Nomenclatura das versões | — | **Feito.** |
| 2 | **E2** | Chat — arquitetura da Fase 3 | **Feito em 18/10** ([relatório](./V3-PROMPT-E2-FINAL.md)) | Reabre BE-2; libera a Etapa 3; o chat flutuante passa a saber a tela, a ler os números dela, a cruzar telas e a **explicar o sistema** (absorve o Assistente). Nome do chat. **Todo prompt dos Blocos 2 a 4 depende dele.** |
| 3 | **VOZ** | Entrada por voz | **Feito em 18/10** ([relatório](./V3-PROMPT-VOZ-FINAL.md)) | Captura no navegador e transcrição; o texto entra no mesmo caminho do texto digitado. Em todas as telas de cadastro e lançamento. Depende de E2. |
| 4 | **PDF** | Geração de PDF | **Feito em 18/10** ([relatório](./V3-PROMPT-PDF-FINAL.md)) | Gerador no servidor para o Dashboard e, depois, outras telas. |
| 5 | **REN** | Renomeações e mudanças de menu | **Feito em 18/10** | Fornecedores e Parceiros; Medição de Projeto; Cartões → Caixa; Projeção → BI; aba "A Pagar" de Despesas sai. Só rótulo e menu. **Pode ir já.** |
| 6 | **PLAT** | Chaves e Backup só na plataforma | **Feito em 18/10** (BPLAT-1 em aberto) | Tiram-se do menu do cliente; o console `/plataforma` opera. O aviso de backup some. |

## Bloco 1 · O que sai

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 7 | **AM2** | Assistente sai | **Feito em 18/10** ([relatório](./V3-PROMPT-AM2-FINAL.md)) | (BAM2-1 respondido: a função vai para o chat, E2.) Depende de E2. Redirecionamento, sem apagar. |
| 8 | **AB2** | Consolidado e Balanço do Dia saem | **Feito em 18/10** ([relatório](./V3-PROMPT-AB2-FINAL.md)) | (Projeção fica.) Balanço do Dia só depois de o Caixa listar os dias fechados (L2). Redirecionamento, sem apagar. |

(S2, aba "Acertos", **saiu do plano**: Acerto Contábil fica como tela.)

## Bloco 2 · Relatórios

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 9 | **DP** | De-para no Plano de Contas | **Feito em 18/10** ([relatório](./V3-PROMPT-DP-FINAL.md)) | (Mudou: campo "categoria da DRE" em `chart_account`, com padrão de boa prática e edição.) Despesa passa a herdar e travar a categoria. **Altera a DRE: chave desligada + prévia.** Pré-requisito de AC3 e AD3. |
| 10 | **AC2** | DRE anual com a mensal abaixo | **Feito em 18/10** | (Mudou: mesma tela, mensal abaixo da anual; cenários em caixas de seleção.) Verificar a versão padrão ao abrir. Pode ir antes de E2. |
| 11 | **AC3** | DRE Analítica (nova) | **Feito em 18/10** ([relatório](./V3-PROMPT-AC3-FINAL.md)) | Drill-down categoria → grupo → plano de contas, vertical. Depende de DP. |
| 12 | **AD2** | Fluxo de Caixa mensal e semanal | **Feito em 18/10** | Pode ir antes de E2. |
| 13 | **AD3** | Fluxo de Caixa Analítico (novo) | **Feito em 18/10** ([relatório](./V3-PROMPT-AD3-FINAL.md)) | Grupo CEF, subgrupo e plano de contas, vertical. Depende de DP. |
| 14 | **AA2** | Dashboard: gráficos e PDF | **Feito em 18/10** ([relatório](./V3-PROMPT-AA2-FINAL.md)) | (Especificado: fluxo de caixa em linhas, DRE em barras empilhadas.) |
| 15 | **RC** | Relatórios Customizados (nova) | **Feito em 18/10** ([relatório](./V3-PROMPT-RC-FINAL.md)) | (Confirmado em 18/10: tela própria, com chat próprio. O chat do Dashboard não a substitui.) Depende de E2. |
| 16 | **AE2** | Resumo Executivo: indicadores selecionáveis | **Feito em 18/10** ([relatório](./V3-PROMPT-AE2-FINAL.md)) | Custo/m² precisa de área no cadastro. |
| 17 | **IAR** | Chat de análise e simulação nas telas de relatório | **Feito em 18/10** ([relatório](./V3-PROMPT-IAR-FINAL.md)) | Vai por último no bloco, tela a tela (Dashboard, DRE, Fluxo, Resumo, Projeção). Depende de E2. |

## Bloco 3 · Planejamento e Receitas (escrita assistida)

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 18 | **D2** | Orçamentos: chat por voz, texto e arquivo | **Feito em 18/10** ([relatório](./V3-PROMPT-D2-FINAL.md)); BD2-1 · 4.1.3 em aberto no relatório | **Estreia da Etapa 3.** Antes, `budget.ts` e `planning.ts` devolvem `{ ok, error }`. Aviso ao sair sem salvar. Depende de E2 e VOZ. |
| 19 | **B2** | Projetos: comando e pré-preenchimento | **Feito em 18/10** ([relatório](./V3-PROMPT-B2-FINAL.md)); BB2-1 · BB2-2 em aberto no relatório | Leitura de documento já existe. Depende de D2. |
| 20 | **F2** | Previsão Atualizada: meses passados = Atual | **Feito em 18/10** ([relatório](./V3-PROMPT-F2-FINAL.md)); BF2-1 em aberto no relatório | Estende a reprojeção. Depende de D2. |
| 21 | **G2** | Plano de Contas: chat insere planos | **Feito em 18/10** ([relatório](./V3-PROMPT-G2-FINAL.md)); BG2-1 em aberto no relatório | (Confirmado em 18/10; revoga 8.2.1 do Prompt G.) Mesmo regime da Etapa 3. Depende de D2. |
| 22 | **M2** | Clientes: cadastro por foto e perfil da base | **Feito em parte em 18/10** ([relatório](./V3-PROMPT-M2-FINAL.md)): perfil da base; o cadastro por foto espera BM2-1 | Leitura de documento nova (documento pessoal: regra de privacidade BE-2 vale). Perfil da base é relatório (IAR). |
| 23 | **K2** | Contas a Receber e Liberações: chat lança | **Feito em 18/10** ([relatório](./V3-PROMPT-K2-FINAL.md)) | Edição por linha já existe; confirmar o que falta. |
| 24 | **P2** | Permuta: documentos do ativo e chat | **Feito em 18/10** ([relatório](./V3-PROMPT-P2-FINAL.md)) | Upload de documento e foto do ativo. |
| 25 | **N2** | Simulador | **Feito em 18/10** ([relatório](./V3-PROMPT-N2-FINAL.md)), a pedido do dono, sem a conferência do Thiago | Volta ao parcelamento da planilha; proposta ao cliente em PDF com a Cris. |
| 26 | **AG2** | Emissão de NF-e no menu de Receitas | **BAG2-1 respondido em 26/10: construir aqui** ([decisões](./V2-PROMPT-AG-PR1.md)) | **Concluída em 26/10** pelo Prompt AG (PRs 1 a 6, [relatório](./V2-PROMPT-AG-FINAL.md)): serviço avulso que pode apontar para a conta a receber lançada; a nota não vira receita. Falta só configurar o servidor e testar em homologação. |

## Bloco 4 · Despesas, Caixa, Obra, Pessoas e Configurações

| # | Prompt | Tela | Bloqueios | Observação |
|---|---|---|---|---|
| 27 | **S3** | Despesas: chat por voz/texto/documento; recorrência; "paga por terceiro" | **Feito em 18/10** ([relatório](./V3-PROMPT-S3-FINAL.md)); BS3-1 em aberto no relatório | Investigar o bug da lista vazia antes. Depende de E2 e VOZ. |
| 28 | **T2** | Ressarcimentos e Acerto Contábil: chat | **Feito em 18/10** ([relatório](./V3-PROMPT-T2-FINAL.md)) | Acerto: seleção por voz e marcação em lote, com confirmação. |
| 29 | **W2** | Fornecedores e Parceiros: chat lê arquivo | **Feito em 18/10** ([relatório](./V3-PROMPT-W2-FINAL.md)) | Leitura de documento já existe (`fornecedor-extract`). |
| 30 | **L2** | Caixa: dias fechados, projeção dos próximos dias, chat na conciliação | **Feito em 18/10** ([relatório](./V3-PROMPT-L2-FINAL.md)) | Lista dos dias fechados (destrava AB2). Projeção lê Contas a Pagar e a Receber. Open Finance já existe: expor o fluxo de conexão no onboarding. |
| 31 | **U2** | Cartões no Caixa: extrato, conciliação, proposta de lançamento | **Feito em 18/10** ([relatório](./V3-PROMPT-U2-FINAL.md)); BU2-1 em aberto no relatório | Tela parecida com o Caixa. Pagamento parcial e juros já existem (Prompt U): conferir. |
| 32 | **V2b** | Medição de Projeto: chat por voz | **Feito em 18/10** ([relatório](./V3-PROMPT-V2b-FINAL.md)) | Só o chat; a tela não muda. |
| 33 | **Y2** | Estoque: painel com caixa de conversa | **Feito em 18/10** ([relatório](./V3-PROMPT-Y2-FINAL.md)) | Saída já existe; mostrar. |
| 34 | **Q2** | INCC por empresa | **Feito em 18/10** ([relatório](./V3-PROMPT-Q2-FINAL.md)); BQ2-1 respondido: a série da empresa é adotada de uma obra, e as outras ficam guardadas | (Confirmado em 18/10: um índice por empresa.) Migra as séries por projeto; o seletor sai. Chat explica e projeta. |
| 35 | **Z2** | Pessoas: chat cadastra funcionário | **Feito em 18/10** ([relatório](./V3-PROMPT-Z2-FINAL.md)) | Equipes já lista parceiros. |
| 36 | **AI2** | Usuários: sugestão de telas por papel; verificar restrição | **Feito em 18/10** ([relatório](./V3-PROMPT-AI2-FINAL.md)); BAI2-1 em aberto no relatório | Bug relatado: restrição por papel "não funcionava". |
| 37 | **AH2 / AK2 / AF2** | Empresa, Auditoria, Numeração: chat | **Feito em 18/10** ([relatório](./V3-PROMPT-AH2-AK2-AF2-FINAL.md)) | Pequenos; juntos num prompt. |

---

# 3. OS BLOQUEIOS, EM UMA LISTA

- **BE2-1** · O que de cada tela de relatório vai ao modelo: só os agregados
  que o usuário vê, ou também as linhas? Nome de obra vai?
- **BE2-2** · Limite de uso por empresa para análises e simulações.
- **BE2-3** · A simulação grava algo (cenário salvo) ou vive só na aba?
- **BE2-4** · Nome do chat: **Cris** (respondido em 18/10).
- **BV2-1** · Transcrição: no provedor atual de IA, ou em serviço à parte?
  Retenção do áudio.
- **BPDF-1** · PDF no servidor ou pelo navegador? Cabeçalho da empresa?
- **BPLAT-1** · O dono do cliente pede backup como? Um botão que abre
  chamado, ou só por contato?
- **BAB2-1** · Alguém recebe o CSV do Balanço do Dia?
- **BDP-3** · Plano de contas já usado com categoria diferente da que o
  padrão vai dar: a chave mostra quantas despesas mudam de categoria. Quem
  decide o padrão de cada plano antes de ligar a chave: o Thiago, na tela.
- **BAC2-2** · A mensal abaixo da anual mostra os 12 meses do ano escolhido,
  com os mesmos cenários?
- **BAC3-1** · O drill-down mostra lançamento individual no último nível, ou
  para no plano de contas?
- **BAD2-1** · Semana começa na segunda? Parcela sem dia de vencimento vai
  para qual semana?
- **BAD3-1** · O Fluxo Analítico herda a visão "por fonte" da Projeção?
- **BRC-1** · O relatório livre é salvo (nome, dono, compartilhado) ou só
  exportado?
- **BG2-1** · O chat do Plano de Contas cria grupo, conta e subconta, ou só
  conta dentro de grupo existente? Inativar e reordenar continuam vedados?
- **BQ2-1** · Projetos que hoje têm séries de INCC diferentes: qual vira a
  da empresa? A migração guarda as outras?
- **BAE2-1** · Área construída para custo/m²: entra no cadastro do projeto?
- **BD2-1** · Lançamento por voz: o assistente propõe uma linha por vez, ou
  um bloco inteiro?
- **BB2-1** · "Mudar o projeto 28": que campos podem ser alterados por
  comando?
- **BB2-2** · O pré-preenchimento de Orçamentos cria uma versão nova ou
  preenche a Orçamento existente vazia?
- **BF2-1** · O ajuste mês a mês substitui a reprojeção atual ou é mais um
  botão?
- **BM2-1** · Foto de documento pessoal do cliente vai ao modelo? A regra de
  01/10 veda dado pessoal; aqui o documento é o dado.
- **BAG2-1** · Onde está a tela de emissão que o Thiago diz pronta? **Respondido em 26/10:** construir aqui (Prompt AG).
- **BS3-1** · "Paga por terceiro": quem aparece é quem tem o papel, ou todo
  cadastro de Ressarcimentos?
- **BL2-1** · A projeção dos próximos dias conta parcela a pagar sem dia?
- **BL2-2** · Open Finance: o cliente conecta sozinho ou a plataforma
  conecta por ele?
- **BU2-1** · Extrato do cartão: PDF da fatura ou CSV? Open Finance de
  cartão pela Pluggy?
- **BAI2-1** · Reproduzir a falha da restrição por papel com o usuário do
  cliente.

---

# 4. ORDEM SUGERIDA

Sem resposta pendente, podem começar agora: **REN**, **AC2**, **AD2**,
**PLAT** (com BPLAT-1 respondido em uma linha) e a base de **PDF**. Depois
**E2**, que destrava o resto. **DP** assim que o Thiago fizer a associação
do cliente na tela (o prompt entrega o campo e o padrão; a chave liga depois).
**L2** antes de **AB2**. **N2** foi liberado pelo dono em 18/10, antes da
conferência do Thiago; o resto está liberado pelas respostas de 18/10.

```
REN, AC2, AD2, PLAT, PDF: independentes
E2 ─┬─► VOZ ─► D2 ─► B2, F2, S3, K2, M2, P2, W2, T2, V2b, Z2, AI2
    ├─► IAR, RC
    ├─► AM2
    └─► AA2 (com PDF)
DP ──► AC3, AD3
L2 ──► AB2, U2
```

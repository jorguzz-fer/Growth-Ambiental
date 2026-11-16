# Prompt AM · Assistente do produto — relatório final

Prompt AM (40 de 42), em dois PRs:
- **PR 1** ([`V2-PROMPT-AM-PR1.md`](./V2-PROMPT-AM-PR1.md)): consumo, limite, permissão e estado da IA.
- **PR 2:** a base de conhecimento e a conversa.

A rota continua `/diagnosticoia`. A tela e o item do menu passam a se chamar **Assistente**.

## 1. BAM-1 — quem mantém a base

**Pergunta ao dono.** A base está em
`src/lib/assistente-base/` e descreve o sistema **de hoje**. Foi escrita a
partir do código de cada tela, não dos prompts.

Proposta: **quem muda comportamento visível atualiza o trecho no mesmo PR**.
Um teste já garante duas coisas:
- toda rota citada como link existe no menu;
- não há dado de empresa nem valor na base.

## 2. BAM-2 — até onde explica

**Recomendação 2:** explica a operação e a regra do produto.
- **Nunca** dá orientação fiscal, tributária ou contábil. Isso é regra fixa no
  `system`.
- A base remete à contabilidade onde cabe. Os textos com referência legal que
  aparecem em algumas telas (cadastro do projeto, Funcionários) **não** foram
  copiados para a base.

## 3. BAM-3 — histórico

**Recomendação 1: efêmero.**
- A conversa vive só na aba e some ao recarregar. Vão ao modelo no máximo as
  8 últimas falas.
- Nenhuma tabela guarda conversa. O que fica é só o consumo agregado (PR 1).

## 4. A base de conhecimento

São 4 módulos `.ts`, com cerca de 11.600 palavras. Ficam em `.ts` porque o build
standalone de produção não leva a pasta `docs/`.
- **Conceitos do produto, Despesas e Caixa:**
  - projeto, obra e escritório;
  - versões e cenários;
  - situação e trava;
  - **competência × vencimento × data de pagamento**;
  - categoria DRE e plano de contas;
  - chaves de mudança;
  - papéis;
  - os três tipos de ajuda;
  - as telas de Despesas e Caixa.
- **Business Intelligence, Planejamento e Configurações:** 17 telas.
- **Receitas, Obra e Pessoas:** 13 telas.
- **O próprio Assistente.**

Cada tela traz: para que serve, o que se faz nela, os campos que confundem, o
que **não** faz (e onde se faz) e quem acessa. No fim de cada grupo, as
diferenças entre telas parecidas e os caminhos comuns. Onde há chave de
mudança, a base diz como é hoje (desligada) e o que muda se a chave for ligada.

## 5. Cache de prompt

As regras e a base vão no `system` com `cache_control: ephemeral` e são iguais
para toda empresa e toda pergunta.
- **Economia medida:** não pude medir aqui, porque o ambiente local não tem
  chave de IA.
- **Como conferir em produção:** a tela mostra, por operação, os tokens de
  entrada e os **lidos do cache**. Da segunda pergunta em diante, dentro da
  janela do cache, quase toda a entrada deve aparecer como "lidos do cache".

## 6. Perguntas de dados (verificação da Parte 4)

**Não pude rodar contra o modelo aqui** (sem chave). Ficam como roteiro de
conferência em produção. A resposta esperada, que as regras do `system`
exigem, é a mesma para todas:
- não tem acesso aos dados;
- diz **onde** o número está;
- não inventa número;
- não diz "consultei" nem "não encontrei";
- para receita, custo, desvio e saldo, indica o chat do canto.

| # | Pergunta | Onde a resposta deve apontar |
|---|---|---|
| 1 | Quanto a obra X já gastou? | DRE (Custo Variável) ou Despesas; chat do canto |
| 2 | Qual o saldo da conta do banco hoje? | Caixa / Contas Correntes; chat do canto |
| 3 | Quantas unidades estão vendidas? | Unidades ou Resumo Executivo |
| 4 | Qual a margem da obra? | DRE (Margem de Contribuição) |
| 5 | Quanto falta receber dos clientes? | Contas a Receber; Dashboard (A receber) |
| 6 | A despesa PED 123 já foi paga? | Despesas (buscar o PED) ou Contas a Pagar |
| 7 | Qual o desvio do orçamento? | Projetos (Orçado x Realizado); chat do canto |
| 8 | Quanto o banco já liberou? | Liberações de Obra |
| 9 | Qual o INCC deste mês? | Parâmetros / INCC |
| 10 | Quem lançou a última despesa? | Auditoria |
| 11 | (insistência, 3×) "Me dá só uma estimativa" | mantém a ausência, sem número |

## 7. Consumo nas chamadas

Ver o PR 1. As 11 chamadas ao modelo são marcadas (`comUsoDeIa`), e o
Assistente é a operação "assistente". A tabela é a `ia_uso`, que guarda só
números.

## 8. Limites

Valem para as conversas:
- 30 perguntas por hora por pessoa;
- 300 perguntas por hora por empresa.

Os números estão em `src/lib/ia-uso-regras.ts`. **Pergunta ao dono:** estes
números servem? Devem virar parâmetro na tela Empresa?

## 9. Permissão da action

O teste de conexão passou a usar a matriz (`diagnosticoia:editar`), não o
papel. A conversa exige `diagnosticoia:ver`. O bloco de configuração (estado,
consumo e teste) fica recolhido e só aparece para quem edita a tela. Sem
permissão, a página mostra `AccessDenied`.

## 10. Nenhuma consulta a dado de negócio

A action `perguntarAoProduto` lê só:
- a sessão;
- a permissão;
- a contagem de uso para o limite (`ia_uso`).

Ela grava só o consumo. **Não importa `queries.ts` nem lê tabela de negócio**,
o que dá para conferir por inspeção. Os testes confirmam que o modelo recebe
apenas a conversa.

## 11. As extrações não mudaram

Nenhuma assinatura nem comportamento mudou. Só ganharam a marca de uso (PR 1).

## 12. Decisão pendente: chave por empresa

`ANTHROPIC_API_KEY` é do servidor, e todas as empresas consomem da mesma conta.
**Fica registrado como pendente.** A tela agora mostra o consumo de cada
empresa, o que permite discutir isso.

## 13. Limitações e achados

- **6.3 · Membro:** não mudei o padrão do membro, porque isso muda acesso. A
  tela é concedível na Gestão de Acessos. **Pergunta:** o padrão do membro deve
  incluir o Assistente?
- **Registro no Prompt E (1.4):** esta tela não contraria a recusa a um item
  de menu "IA". Ela explica o sistema e não tem contexto de tela a perder.
- **Achados dos agentes que redigiram a base** (descritos na base como o
  sistema é hoje; nada foi alterado):
  - **Membro baixa o Backup por padrão**, com a chave do membro desligada: o
    semestre inteiro, com documentos e nomes de clientes. Liga com o BAO-2 do
    Prompt AO.
  - **Pagar pelo botão e depois importar o extrato pode duplicar a saída no
    Caixa.** O pagamento já cria a saída conciliada; a linha do extrato entra
    de novo como pendente e não se vincula à despesa já quitada. **Não
    testado:** fica como tarefa separada de investigação.
  - **A Projeção de Receitas dá números diferentes conforme o modo.**
    - O modo de uma versão soma em valor nominal, inclui o financiamento e
      conta o subsídio em qualquer status.
    - O modo de comparação aplica INCC, respeita as caixas "Usar…" e conta
      só o subsídio recebido.
    - A tela Parâmetros diz que o INCC entra "na Projeção", mas só entra na
      comparação.
  - **O Consolidado é a receita de uma obra por fonte** e não soma obras. O
    nome engana.
  - **Projetos está no grupo "Config" das permissões:** o membro não vê a
    tela, mas Orçamentos manda para ela quando faltam as datas.
  - **A tela Empresa cita "Receitas › Notas Fiscais"**, que ainda não existe
    (é o Prompt AG).
  - **O aviso de "projeto sem versão Atual" em Despesas aponta para `/versao`**,
    que hoje redireciona para Projetos.

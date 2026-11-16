# Prompt E · Assistente de IA (arquitetura) — inventário e relatório final

Prompt E (39 de 42). **Um PR só:** inventário, duas correções pequenas e este
relatório. Nenhum dado foi alterado.

## 1. Etapa implementada

**Só a Etapa 1** (painel por tela, somente leitura ou "propõe, você
confirma"). Isso segue o BE-3: só a etapa autorizada.
- **Etapa 2** (chat flutuante): **implementada depois, com a decisão do dono
  de 01/10/2026** — só a pergunta vai ao modelo, que só classifica; o número
  é calculado no sistema. Ver
  [`V2-DECISOES-0110.md`](./V2-DECISOES-0110.md#chat-do-assistente-prompt-e-etapa-2).
- **Etapa 3** (escrita com confirmação): **não autorizada** por padrão. As
  pré-condições da seção 4.1 não foram verificadas aqui.

A Etapa 1 **já existia**, construída prompt a prompt: são 23 painéis. Este
PR só fecha as lacunas encontradas.

## 2. BE-1: `/diagnosticoia`

- **O que faz:**
  - Testa a conexão com o provedor. Só owner e admin podem rodar o teste.
  - Mostra se a chave existe, o modelo resolvido, se o R2 (documentos) está
    configurado e o resultado de uma chamada de teste.
  - A chamada envia só o texto fixo "responda apenas: ok". **Nenhum dado da
    empresa sai.**
- **Infraestrutura que o assistente reaproveita:**
  - `src/lib/ai/client.ts`: cliente `@anthropic-ai/sdk` e
    `createMessageWithFallback`;
  - `src/lib/ai/modelos.ts`: a cadeia de modelos.
- **O que não existe:** configuração por empresa e registro de uso. Nenhuma
  tabela guarda tokens ou conversas.

## 3. Provedor e credenciais

- **Provedor:** Anthropic.
- **Credenciais, todas variáveis de ambiente do servidor:**
  - `ANTHROPIC_API_KEY`, obrigatória para as leituras de documento;
  - `ANTHROPIC_MODEL`, opcional, resolve nome ou id;
  - `ANTHROPIC_WORKSPACE_ID`, opcional.
- **Não há chave por empresa.**

## 4. O que vai ao modelo (BE-2) — decisão do dono

**Os painéis de análise não enviam nada:** são conta local, como Dashboard,
Fluxo, Resumo, Conferência e outros 10. Hoje vão ao modelo só as **leituras
de documento e de texto** que o usuário aciona:

| Leitura | O que sai |
|---|---|
| Documento de despesa | PDF ou imagem; no contexto, o nome e o CNPJ da empresa pagadora, os **fornecedores (nome e CPF/CNPJ)**, o plano de contas e o nome das obras |
| Extrato bancário (PDF ou imagem) | o documento |
| Documento de fornecedor | o documento |
| Documento do projeto | o documento |
| Venda por texto | o texto que o usuário digita |
| Permuta por texto | o texto e os tipos de permuta |
| Nota de estoque | o documento e a lista de materiais |
| Folha de ponto | o documento e os **nomes da equipe ativa** |
| Laudo de medição | o documento e os grupos do orçamento |

**Nenhum campo é mascarado hoje.** Os documentos, por natureza, trazem nome,
CPF/CNPJ e endereço.

**Regra fixa, verificada:**
- cada leitura é de **um tenant só**;
- o contexto vem do servidor (a sessão), nunca de id enviado pelo cliente
  sem verificação;
- nada vai de um projeto que o usuário não possa ver.

**Pergunta ao dono (BE-2):**
- O contrato e a retenção do provedor estão aprovados?
- Nome, documento, telefone e endereço podem sair como estão, ou devem ser
  mascarados antes?
- **Até a resposta, a Etapa 2 (chat) não entra.**

## 5. Contexto: tenant, projeto e versão

Cada painel recebe o contexto da **própria página**, no servidor:
- `getTenantContext`;
- o projeto lido da URL e validado contra `ctx.projects`;
- as versões vindas de `getVersionsDoProjeto(tenantId, projectId)`.

Nenhum painel aceita id do cliente sem verificação. Os painéis que gravam
(caixa, contas a receber, equipes, estoque e previsão) chamam a **mesma
action da tela**, com a permissão verificada nela.

## 6. Consultas novas

**Nenhuma neste PR.** As dos painéis recentes estão nos relatórios AD, AA e
AE, todas com tenant explícito.

## 7. Telas com painel, e por quê

23 painéis: caixa, cartões, conferência, contas, contas a receber,
Dashboard, empresa, equipes, estoque, Fluxo, funcionários, INCC
(parâmetros), liberações, medição, orçamento e previsão, permuta, plano de
contas, projetos, ressarcimentos, Resumo, simulador, fornecedores e
unidades. Cada um veio de um prompt da tela, por decisão explícita (2.1).

**O conteúdo mínimo do item 2.3:**
- **Projetos:**
  - presentes: duração × datas, fontes abaixo do valor global, fim antes do
    início e município sem código;
  - **corrigido aqui:** a falta de datas agora diz que, sem elas,
    Orçamentos e Previsão não têm meses para distribuir;
  - **limitação:** o código do município é conferido só no formato (7
    dígitos), não contra o nome. Não há tabela do IBGE no sistema.
- **Orçamentos:** todos presentes:
  - percentuais abaixo de 100%;
  - meses sem distribuição;
  - receita × cadastro;
  - despesa vazia com receita;
  - dado fora do período.

## 8. Gravação

Os painéis **somente leitura** não importam action nem banco. Os que
**propõem** gravam só pela action da tela, depois de o usuário confirmar, e
mostram o selo "Propõe, você confirma" ou "Confirma antes de gravar".

**Corrigido aqui (6.1):** o painel do INCC mostrava "Propõe, você confirma"
sem gravar nada. Agora mostra "Somente leitura", o que bate com o rodapé
dele.

## 9. Regras e cálculos

Nenhuma regra, cálculo ou consulta existente foi alterada. Mudaram só um
texto de análise e um selo.

## 10. Tabelas novas

**Nenhuma.** Se a Etapa 2 for autorizada e for preciso registrar uso, será
uma tabela nova e aditiva, com `down`.

## 11. Decisões

- **BE-1:** reaproveitar `src/lib/ai/*`; nada duplicado.
- **BE-2:** pendente com o dono (ver 4).
- **BE-3:** só a Etapa 1.

## 12. Limitações

- **Medição:** o painel tem o selo "Somente leitura" e oferece ler o laudo
  com o modelo. Não grava, mas **envia o documento** ao provedor. O selo fala
  de escrita, não de envio. Fica para o BE-2 decidir se envio de documento
  pede um aviso próprio.
- **Fornecedores:** o rodapé do painel diz que nenhum documento vai a modelo
  (é verdade para o painel). O formulário de fornecedor da mesma tela envia
  documento.
- **Sem registro de uso de IA:** não dá para saber quantas leituras cada
  empresa faz.

## Complemento (Prompt AM, 1.4)

A tela **Assistente** (`/diagnosticoia`) não contraria a recusa da seção 1 a um
item de menu "IA". Aquela recusa vale para um assistente **de dados**, que
perderia o contexto da tela. O Assistente **explica como o sistema funciona**,
não tem dados nem contexto de tela a perder, e encaminha as perguntas de número
para o chat do canto (Etapa 2).

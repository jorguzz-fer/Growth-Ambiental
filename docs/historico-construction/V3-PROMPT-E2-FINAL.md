# Prompt E2 · Cris, o chat da Fase 3 — relatório final

Fase 3, Bloco 0. Executado em 18/10/2026. Fontes: decisões de 15/10 (Etapa 3
autorizada; BE-2 reaberta) e de 18/10 (nome Cris; chat flutuante; confirmação
pelo botão da tela), revisões V5.

## O que a Cris é

Um chat flutuante, em todas as telas, que **sabe em que tela está**:

1. **Explica o sistema** pela base de conhecimento (`src/lib/assistente-base`),
   a mesma do Assistente do produto, que ela absorve.
2. **Analisa e simula** sobre os números da tela aberta: compara colunas,
   acha o maior desvio, explica variação, simula "e se". Toda simulação é
   hipotética e dita como tal.
3. **Busca números de outras telas** com a ferramenta `consultar_numero` —
   receita, custo, desvio e saldo —, calculados no servidor pelas mesmas
   contas do chat da Etapa 2 e com o acesso da pessoa.
4. **Propõe o preenchimento** do formulário da tela de lançamento, a partir
   do que a pessoa disse, ditou ou anexou (PDF ou imagem). O botão "Preencher
   a tela" coloca os valores no formulário; **quem grava é o botão Salvar da
   tela**, pela action de sempre, com a permissão de sempre e a auditoria de
   sempre (regras 4.2.1 e 4.2.2 da Etapa 3).

## Peças

| Arquivo | Papel |
|---|---|
| `src/lib/cris.ts` (puro) | Regras, validação do contexto, do histórico, do anexo e da proposta; limpeza do resumo da tela. |
| `src/lib/ai/cris.ts` | O laço com o modelo: `system` com cache (regras + base), bloco `<tela>` na última fala, até 4 voltas de ferramenta. |
| `src/lib/actions/cris.ts` | A action. Sessão e tenant do servidor; números da tela só se a pessoa vê a tela; formulário só se pode criar ou editar nela. |
| `src/lib/chat-metricas.ts` | O cálculo das métricas, tirado da action da Etapa 2 para as duas usarem. Não é action: o contexto nunca vem do cliente. |
| `src/components/app/cris-contexto.tsx` | `CrisProvider`, `CrisDaTela` (a página entrega o resumo), `useCrisFormulario` (o formulário se oferece), `PerguntarACris` (botão de painel). |
| `src/components/app/chat-assistente.tsx` | A interface da Cris: sugestões da tela, links só para rotas que existem, cartão da proposta, anexo, ditado. |

As telas que já entregam o resumo: **DRE** e **Fluxo de Caixa**. As demais
entram nos prompts de cada tela (IAR para relatórios; D2, S3 e os outros para
lançamento).

## BE-2 reaberta: o que vai ao modelo (regra escrita)

| Vai | Não vai |
|---|---|
| A pergunta e a conversa desta aba | Nada é gravado: nem a conversa, nem a pergunta em log |
| O resumo dos números **que a tela mostra**, montado pela própria tela, campo a campo | Lançamento individual, cadastro, histórico |
| O documento que a pessoa anexou | Dado pessoal: o resumo passa por `sanitizarDados`, que descarta chaves de CPF, CNPJ, e-mail, telefone, endereço, renda, salário, FGTS, saúde, conta bancária, senha |
| O resultado das consultas `consultar_numero` | Números de tela que a pessoa não pode ver |

Teto do resumo: 12.000 caracteres de JSON. Provedor, retenção e "não treina
modelo" seguem a decisão de 01/10.

## Bloqueios do E2

- **BE2-1** · respondido acima: agregados que a tela mostra, sem linhas de
  lançamento; nome de obra vai (é o que a tela mostra).
- **BE2-2** · limite: a Cris conta no mesmo limite de conversas (operação
  `cris`, 30 por pessoa e 300 por empresa por hora). Uma pergunta com
  consulta pode contar mais de uma vez; ajustar depois de medir.
- **BE2-3** · a simulação **não grava** nada; vive só na conversa da aba.
- **BE2-4** · o nome é **Cris**.

## Sem chave de IA

A Cris responde os números do catálogo pela leitura local da pergunta (o
caminho da Etapa 2) e diz o que calculou. Explicação do sistema, análise da
tela e proposta precisam do modelo.

## Modelo

A Cris usa a mesma cadeia de modelos do app (`ANTHROPIC_MODEL`, padrão
`claude-haiku-4-5`, decisão de custo do dono). Para análise e simulação de
melhor qualidade, a variável pode apontar para um modelo maior sem tocar em
código. A Cris não força ferramenta (`tool_choice` automático), então funciona
também nos modelos mais novos.

## Testes

- `src/lib/cris.test.ts` (7 casos): limpeza do resumo, contexto, histórico,
  anexo, proposta, bloco da tela, links e regras.
- `src/lib/ai/cris.test.ts` (4 casos, modelo simulado): a consulta roda no
  servidor e volta ao modelo; a proposta só leva campos do formulário; o
  anexo vai como documento; recusa não vira resposta; teto de voltas.
- `scripts/e2e/v3-telas.mjs`: a Cris abre com o nome e a tela, traz as
  sugestões da DRE e responde o saldo pelo caminho sem chave.
- Suíte com banco: 217 de 218 arquivos; a falha é o teste de fatura com data
  fixa, já registrado.

**Não verificado:** a conversa com o modelo real. Este ambiente não tem chave
da API; o laço foi testado com respostas simuladas.

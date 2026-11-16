# Prompt AM2 · O Assistente sai — relatório final

Fase 3, Bloco 1. Executado em 18/10/2026. Decisão 4 de 15/10 ("pode mudar") e
BAM2-1 respondido em 18/10 (a função de explicar o produto vai para a Cris).

## O que mudou

- **"Assistente" sai do menu de Business Intelligence.** A rota
  `/diagnosticoia` fica e vira **Diagnóstico de IA**, em Configurações: o
  estado da chave e do modelo, o teste de conexão e o consumo por operação,
  que antes ficavam recolhidos no fim da tela do Assistente.
- Quem não configura a IA e abre a rota vê um aviso de que o Assistente
  agora é a Cris.
- **O chat do Assistente do produto foi apagado** (componente, action,
  chamada ao modelo e módulo de regras). A Cris usa a mesma base de
  conhecimento; as rotas conhecidas passaram para `cris.ts`.
- A base de conhecimento ganhou a seção da Cris no lugar da do Assistente.
- As mensagens que mandavam "ativar a IA em Business Intelligence →
  Assistente" (importação de extrato, Caixa) apontam para Configurações →
  Diagnóstico de IA.

## Acesso

A chave `diagnosticoia` continua a mesma, com o mesmo padrão por papel. Só o
rótulo na Gestão de Acessos mudou para "Diagnóstico de IA". Nada foi
ampliado nem reduzido.

## Dados

Nada apagado. A tabela de consumo (`ia_uso`) segue registrando; a operação
"assistente" deixa de receber linhas novas e a "cris" começa.

## Testes

- `src/lib/assistente-base.test.ts` (novo): os testes da base que estavam no
  arquivo do Assistente, mais um que confere a seção da Cris.
- O teste do menu passou a esperar `/diagnosticoia` em Configurações.
- Suíte com banco: 216 de 217 arquivos; a falha é o teste de fatura com data
  fixa, já registrado.

# Prompt J · PR J-5 — lançamento assistido: texto (ou voz) → proposta no formulário

Quinta PR de código do Prompt J, conforme
[`V2-PROMPT-J-FASE1.md`](./V2-PROMPT-J-FASE1.md). Seções 6.2 e 6.3, BJ-3,
regras 4.2 do Prompt E. **Nenhum registro é gravado pelo assistente. Sem
migração.** "Cadastrar a partir do contrato" fica para depois da resposta
sobre o envio do contrato ao provedor (pergunta na Fase 1).

## As três condições de BJ-3 — como ficaram garantidas

| Condição | Mecanismo |
|---|---|
| **1 · retorno legível na mesma entrega** | `saveUnit`/`importUnits` já devolvem `{ ok, error }` desde a J-2; a action nova `proporUnidadePorTexto` também. A proposta que falha diz por quê |
| **2 · a IA propõe e para; não existe caminho de gravação direta** | `proporUnidadePorTexto` **não importa o banco**: só permissão, obra, texto → IA → `montarPropostaDeUnidade` (puro) → devolve a proposta. O painel guarda a proposta no `sessionStorage` do navegador e abre `/unidades/nova?assistente=1`; o formulário lê, preenche, marca campo a campo e **espera o clique em "Salvar unidade"**, que chama a mesma `saveUnit` com a mesma permissão verificada no servidor. Não há rota, action nem botão que grave a partir da proposta. Auditoria grava `origem: "assistente"` (E, 4.2.3) |
| **3 · exclusão nunca assistida** | o painel não tem ação de excluir, não sugere e não oferece; o texto do rodapé diz isso. A exclusão continua só pela lista/formulário, com o código digitado (I-3) |

## O que muda

| | Antes (J-4) | Agora |
|---|---|---|
| **selo** | "Somente leitura" | **"Confirma antes de gravar"** quando a IA está configurada e o usuário pode criar; senão continua "Somente leitura". Selo e função mudam juntos (E, 6.1) |
| **convite** | — | "Lance a venda conversando": campo de texto (até 2000 caracteres) e, **só como alternativa**, o botão de ditar pela Web Speech API do navegador quando ela existe (Chrome/Edge/Safari). O texto funciona sozinho |
| **formulário** | preenchimento à mão | com `?assistente=1`, lê a proposta: cada campo lido fica com selo **faltando** (código, valor, data da venda de vendida, plano de vendida) ou **conferir** (status deduzido, baixa confiança, fontes que não fecham, data ilegível, financiamento calculado como "o restante"). Resumo no topo ("Lançamento assistido"). Mexer no campo apaga o alerta. O botão de gravar é o mesmo |
| **auditoria** | `origem: formulario` | `origem: assistente` quando a proposta foi confirmada |

## O que sai do sistema

Só o **texto digitado ou ditado pelo usuário** e a data de hoje, para o
mesmo provedor e a mesma chave das leituras de documento já em produção
(`ANTHROPIC_API_KEY`). Nenhum dado do banco vai junto; nenhum dado de
cliente. Sem a chave, o convite nem aparece.

## Regra de preenchimento (pura, `unidade-doc.ts`)

- Fontes: AS e sinais com `n` mínimo 1; mensais/semestrais/anuais com `n` lido;
  FGTS, subsídio, permuta e banco inteiros. "Financiamento do restante" =
  valor − demais fontes, com alerta dizendo a conta.
- Datas só em ISO vindas da IA, convertidas com validação de calendário;
  data ilegível vira alerta, nunca "chute".
- Status: o lido; se não veio, **Vendido** quando há data de venda ou plano,
  senão **Disponível** — sempre com alerta "deduzido".
- Nunca valor negativo, nunca status fora da lista.

## Arquivos

- novos: `src/lib/ai/unidade-doc.ts` (+ teste), `src/lib/ai/unidade-extract.ts`,
  `src/lib/actions/unidades-assistente.ts` (+ teste);
- `src/components/app/assistente-unidades.tsx`, `unit-form.tsx`;
- `src/app/(app)/unidades/page.tsx`, `unidades/nova/page.tsx`.

## Verificação

- `unidade-doc.test.ts` (puro): a frase do mockup ("vendi a casa 12 por 380
  mil…") vira código, valor, data, AS, 36 mensais e banco = 168.000 com o
  plano fechando em 380.000; sem código/valor/data/plano → faltando; status
  deduzido → conferir; 30/02 e "hoje" → ilegíveis; fontes que não fecham →
  diferença no alerta; nunca negativo ou status inválido.
- `unidades-assistente.test.ts` (sem banco, extrator substituído): sem
  permissão de criar, sem obra, obra de outra empresa, texto vazio ou longo
  demais recusam **antes** de chamar a IA; com tudo certo devolve a proposta
  e não grava.
- Navegador (base local): com chave falsa o convite aparece e a falha da IA
  chega como mensagem, sem quebrar a tela; proposta guardada no navegador
  abre o formulário preenchido com os selos; salvar grava pela `saveUnit` com
  `origem: assistente` na auditoria.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

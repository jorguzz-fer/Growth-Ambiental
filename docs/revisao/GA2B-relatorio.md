# GA-2B · Nenhum texto interno de desenvolvimento na tela — relatório

## Resumo

Alguns códigos de desenvolvimento ("Prompt I", "BAA-6", "BL-2", "§7"…) e frases de pendência ("aguarda decisão", "ainda não existem") apareciam em texto que o cliente lê. Saíram todos. O mesmo vale para o texto que vai à Cris, que poderia repeti-los.

- Uma **trava automática** impede que voltem: `src/lib/textos-visiveis.test.ts`.
- Os códigos continuam permitidos em **comentários de código** e no campo `origem` do catálogo de chaves, que não é exibido.

**Só mudou texto e visibilidade.** Nenhuma regra de cálculo mudou, nenhum dado foi alterado, e não há migração.

**Relação com o GA-12:** os itens C1 a C5 da auditoria geral tratam deste assunto. Quando o GA-12 rodar, devem sair como "Já corrigido".

## A trava (§4)

`src/lib/textos-visiveis.test.ts` usa a API do compilador TypeScript. Comentários nunca entram na análise, e `className` fica de fora. Ele examina quatro grupos:

1. **Telas** (`.tsx` de `src/app` e `src/components`). Olha só o que vai para a tela:
   - o texto JSX;
   - strings em atributos visíveis (`title`, `titulo`, `descricao`, `label`, `rotulo`, `placeholder`, `aria-label`, `dica`, `alt`…);
   - strings dentro de `{…}` entre tags;
   - propriedades de objeto com nome de texto;
   - argumentos de toast e aviso.
2. **Textos de `src/lib` que chegam ao cliente:**
   - Resumo (`resumo-blocos.ts`);
   - backup (`backup-catalogo.ts`, `backup-pacote-texto.ts`);
   - métricas do chat (`chat-metricas.ts`);
   - catálogo de chaves, salvo o campo `origem`;
   - mensagens de erro das actions (`{ error: "…" }`, `falha("…")`).
3. **Textos que vão à Cris:** base de conhecimento (`assistente-base/`), `cris.ts`, `ai/cris.ts` e as descrições das ferramentas (`*-ferramentas.ts`).
4. **O resto dos `.ts` de `src` (todas as strings).**
   - Este grupo foi acrescentado porque a varredura achou texto do cliente montado fora das telas: o modelo padrão de implantação.
   - Não deu nenhum falso positivo.

**O padrão** fica em `src/lib/codigos-internos.ts`. É o do GA-2B §4 mais quatro achados da varredura: "(Parte n)", "(RG-nn)", nome de arquivo ".md" e "roadmap".
- "Etapa n" e "Fase n" soltos não entram, porque são etapas e fases de verdade.
- "(Etapa n)" entre parênteses entra.

**Exceções** (no próprio teste, com o motivo):
- `src/lib/chaves.ts`, campo `origem`: registro interno de onde a chave nasceu, não renderizado (GA-1 §5).
- `src/lib/cris.ts`, a regra da §5: ela proíbe a Cris de citar os códigos e precisa dar os padrões como exemplo.

### Saída da trava ANTES das correções (vermelha)

Rodada em `main` de 16/11, antes de qualquer correção: 4 grupos vermelhos, 21 textos.

```
src/app/(app)/dre/page.tsx:495: … a classificação contábil dessas três linhas aguarda decisão. …
src/app/(app)/resumo/page.tsx:1017: Margem fica de fora até a correção da receita (Prompt I).
src/app/page.tsx:25: Fase 0 — Scaffold · Next.js 15 · Drizzle · Auth.js · Coolify
src/components/app/acerto-manager.tsx:458: — juros de mora são perda operacional, não custo de obtenção de recursos (RG-07).
src/components/app/assistente-caixa.tsx:195: Conciliado sem vínculo (BL-2), por mês
src/components/app/assistente-contas.tsx:115: Marcadas como automáticas e não conectadas (BX-3)
src/components/app/assistente-dashboard.tsx:86: Indisponível: depende do catálogo de métricas (BAA-6) e da camada analítica do Prompt I, que ainda não existem.
src/components/app/assistente-equipes.tsx:125: Membros com diárias registradas e sem despesa correspondente (BZ-1)
src/components/app/assistente-resumo.tsx:86: Indisponível: depende do catálogo de métricas (BAA-6) e da camada analítica do Prompt I, que ainda não existem.
src/components/app/coming-soon.tsx:22: Tela em construção — entra na fase indicada do roadmap (docs/STACK.md §7).
src/components/app/conciliacao-review.tsx:324: Marcado como conciliado sem registro de com o quê casou (BL-2). Regularize …
src/components/app/saldos-caixa.tsx:160: Ajustes de caixa acumulados (Parte 4). Se este total cresce, …
src/lib/resumo-blocos.ts:249: Resultado (competência): depende da correção da receita no Prompt I (seções 54 a 58). …
src/lib/resumo-blocos.ts:251: Caixa (regime de caixa): … dependem da decisão do ponto de partida do saldo (BAD-1, chave do Fluxo de Caixa). …
src/lib/resumo-blocos.ts:252: Execução (físico × financeiro) fica fora da tela até a decisão da medição por serviço (BV-1).
src/lib/backup-catalogo.ts:51: dado sensível do cliente (BM-3, Prompt M) — fora até nova decisão (BAO-2)
src/lib/backup-catalogo.ts:52: endereço, salário, jornada e dados bancários do funcionário (Prompt Z) — fora (BAO-2)
src/lib/backup-pacote-texto.ts:182: documento(s) de ASO (exame de saúde do funcionário) — dado de saúde, fora (BAO-2)
src/lib/assistente-base/bi-planejamento-config.ts:2: (base da Cris, linha 69) … A tela diz que a classificação delas aguarda decisão. …
src/lib/cris.ts:274: 3b. ANALISA OS DADOS DE QUALQUER MÓDULO com as ferramentas de dados (Etapa 7): …
src/lib/implantacao-regras.ts:85: Fluxo ponta a ponta e conferências financeiras (ver HOMOLOGACAO_PONTA_A_PONTA.md).
```

**Depois das correções:** verde, 9 de 9.

## Tabela final (onde · antes → depois)

### Itens da §1

| # | Onde | Antes | Depois |
|---|---|---|---|
| 1 | Página pública `/` (sem login) | "Fase 0 — Scaffold · Next.js 15 · Drizzle · Auth.js · Coolify" | linha removida |
| 2 | Dashboard · painel do Assistente · "Montar outra análise" | desabilitado: "Indisponível: depende do catálogo de métricas (BAA-6) e da camada analítica do Prompt I, que ainda não existem." | **habilitado** (ver §2): "Escolha os dados com a Cris: ela monta a análise a partir deste recorte." |
| 3 | Resumo · mesmo cartão | idem | idem, habilitado |
| 4 | Resumo · Comparativo, nota da margem | "Margem fica de fora até a correção da receita (Prompt I)." | "A margem não entra neste total." |
| 5 | Resumo · bloco Resultado | "…depende da correção da receita no Prompt I (seções 54 a 58)…" | "O resultado por competência deste resumo está em revisão. Para a margem por contrato e projeto, veja a DRE." + link **DRE →** |
| 6 | Resumo · bloco Caixa | "…decisão do ponto de partida do saldo (BAD-1, chave do Fluxo de Caixa)…" | "Saldo de hoje e projeção do caixa: veja o Fluxo de Caixa." + link **Fluxo de Caixa →** |
| 7 | Resumo · nota Execução | "…até a decisão da medição por serviço (BV-1)." | nota escondida |
| 8 | Conciliação de Caixa · painel do Assistente | "Conciliado sem vínculo (BL-2), por mês" | "Conciliado sem vínculo, por mês" |
| 9 | Conciliação · selo "conciliado sem vínculo" (dica) | "…com o quê casou (BL-2). Regularize…" | "Marcado como conciliado sem registro do lançamento correspondente. Regularize vinculando uma despesa ou desfazendo." |
| 10 | Contas Correntes · painel do Assistente | "…não conectadas (BX-3)" | sem "(BX-3)" |
| 11 | Equipes · painel do Assistente | "…sem despesa correspondente (BZ-1)" | sem "(BZ-1)" |
| 12 | Backup · leia-me do pacote | "dado sensível do cliente (BM-3, Prompt M) — fora até nova decisão (BAO-2)"; "…do funcionário (Prompt Z) — fora (BAO-2)" | "dado pessoal sensível do cliente — não incluído no backup (proteção de dados, LGPD)"; "endereço, salário, jornada e dados bancários do funcionário — não incluídos no backup (proteção de dados, LGPD)" |
| 13 | Backup · documentos de ASO | "…dado de saúde, fora (BAO-2)" | "…dado de saúde, não incluído no backup (proteção de dados, LGPD)" |
| 14 | DRE · nota da cascata (e base da Cris) | "…a classificação contábil dessas três linhas aguarda decisão." | "Retiradas, Investimentos e Empréstimos aparecem na cascata para mostrar o efeito no caixa." (a mesma frase na base da Cris) |

### Achados a mais na varredura

| # | Onde | Antes | Depois |
|---|---|---|---|
| 15 | Acerto e Rateios · nota da diferença de juros | "…não custo de obtenção de recursos (RG-07)." | sem "(RG-07)" |
| 16 | Conciliação de Caixa · "Ajustes acumulados" (dica) | "Ajustes de caixa acumulados (Parte 4). Se este total cresce…" | sem "(Parte 4)" |
| 17 | Implantação e Treinamento · modelo padrão, etapa H1 | "Fluxo ponta a ponta e conferências financeiras (ver HOMOLOGACAO_PONTA_A_PONTA.md)." | "Fluxo ponta a ponta e conferências financeiras: lançar, medir, faturar, receber e conferir os relatórios." |
| 18 | Tela "em construção" (`coming-soon.tsx`) | "Tela em construção — entra na fase indicada do roadmap (docs/STACK.md §7)." | **componente removido**: não era usado por nenhuma tela |
| 19 | Instrução da Cris (`cris.ts`) | "…com as ferramentas de dados (Etapa 7): …" | sem "(Etapa 7)" |

**Item 17, empresas que já aplicaram o modelo:** o texto novo vale para quem aplicar o modelo daqui para frente. Uma empresa que já tinha aplicado mantém a etapa como está, porque nenhum dado é alterado por código. Na medição do GA-2, a empresa real tinha 0 etapas de implantação.

## §2 · "Montar outra análise": **habilitado**

**Motivo da escolha.**
- Ligar o cartão à Cris só exigiu o que o resto do app já usa:
  - `useCris().perguntar(…)`, o mesmo do botão "Conciliar com a Cris";
  - `MENSAGEM_CRIS_SEM_IA`, a mesma mensagem do Caixa.
- A Cris já tem o catálogo de ferramentas de dados, e a tela já manda os números pela `CrisDaTela`.

**O que o cartão faz:**
- **Com IA:** abre a Cris com o pedido "Quero montar uma análise. Me ajude a escolher os dados." seguido do recorte da tela (projeto, versões e período). Exemplo: "Tela: Dashboard · 6 projeto(s) somado(s) · versões: … · todo o período."
- **Sem IA:** o cartão abre e mostra "A Cris precisa da IA configurada (Configurações → Diagnóstico de IA)."

**Onde fica:** o texto do pedido está em `src/lib/montar-analise.ts`.

## §3 · Blocos pendentes do Resumo

- **Resultado e Caixa:** texto novo, com o link (o link leva o projeto da tela, `?proj=`).
- **Execução:** a nota saiu.
- **Comparativo:** mantido.
- **Assistente do Resumo:** "Explicar o bloco" usa o mesmo texto novo.
- **O que não mudou:** o que cada bloco calcula e quando aparece.

## §5 · Cris

- "(Etapa 7)" saiu da instrução enviada ao modelo.
- **Regra nova na instrução do sistema:** "Nunca cite códigos internos de desenvolvimento (como 'Prompt', 'BA-', '§') nem diga que algo 'aguarda decisão'. Se uma função não estiver disponível, diga o que o usuário pode usar no lugar."
- **Base de conhecimento:** a frase da DRE foi atualizada. Os grupos 3 e 4 da trava cobrem o resto da base e as ferramentas.

## Testes (§7)

| # | O que | Onde | Resultado |
|---|---|---|---|
| 1 | Trava vermelha antes, verde depois | `textos-visiveis.test.ts` | vermelha com 21 textos (lista acima); verde 9/9 depois |
| 2 | Página `/` sem "Scaffold", "Next.js", "Drizzle" | `ga2b-textos.test.ts` (render da página) e navegador | passou |
| 3 | Cartão "Montar outra análise" abre a Cris com o pedido e o contexto | teste (pedido com o recorte; o cartão chama `perguntar`; sem IA mostra a mensagem) e navegador nas duas condições | passou |
| 4 | Resumo: Resultado e Caixa com texto e link; sem a nota de Execução | teste e navegador | passou |
| 5 | Backup: o texto do pacote gerado não tem código interno | `ga2b-textos.test.ts`, **com banco**: gera um pacote completo (cliente com dado sensível, funcionário com salário e endereço, um ASO) e varre o leia-me, o manifesto e o resumo guardado | passou |
| 6 | Cris: a instrução do sistema tem a regra da §5 | `ga2b-textos.test.ts` (`regrasDaCris()`) | passou |

### Navegador

Build de produção, base da demonstração.

**Sem IA:**
- **Varredura de 48 telas do menu**, com as três abas do Caixa:
  - leu o texto visível e os atributos `title`, `aria-label` e `placeholder`, com os `<details>` abertos;
  - nenhum código interno, zero erro no servidor e na página.
- Página `/` limpa.
- Dashboard e Resumo: o cartão mostra a mensagem de IA não configurada.
- Resumo: os dois blocos com o texto novo e o link; a nota de Execução não aparece.
- Caixa sem "(BL-2)".
- DRE com a nota nova.

**Com uma chave de IA falsa** (só para ligar o cartão; a chamada ao modelo falha de propósito):
- **Dashboard:** clicar abre a Cris com o pedido e o recorte.
- **Resumo:** clicar também abre a Cris com o pedido.

### Suíte completa

`npm run test:all` com banco: **282 arquivos, 2474 testes, 0 pulados**. Typecheck OK; lint com 0 erros (11 avisos antigos, de arquivos de teste e um import).

## Prints e pacote

- **Prints** (enviados na conversa):
  - página `/`;
  - painel do Assistente no Dashboard, sem IA;
  - Dashboard com a Cris aberta pelo cartão;
  - Resumo com os blocos;
  - Conciliação de Caixa com o painel.
- **Pacote de revisão:** `scripts/pacote-revisao.sh` gera `pacote-revisao/Growth-Ambiental-<hash>.zip`.

## Fora do escopo

- Terminologia de incorporação (GA-9).
- Regras, cálculos e definição de margem (GA-6).
- Comentários de código: continuam com os códigos.

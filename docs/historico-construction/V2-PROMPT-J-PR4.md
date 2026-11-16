# Prompt J · PR J-4 — painel do assistente, somente leitura (sem modelo de IA)

Quarta PR de código do Prompt J, conforme
[`V2-PROMPT-J-FASE1.md`](./V2-PROMPT-J-FASE1.md). Seções 6.1, 6.2 e as duas
ações de análise da 6.4 que não precisam de IA. **Nenhum registro é lido fora
do que a tela já carrega, nada sai do sistema, nada grava. Sem migração.**

## O que entra

| | Prompt | Aqui |
|---|---|---|
| **6.1 · painel** | coluna lateral direita, compacta, recolhível, preferência por usuário e navegador | `AssistenteUnidades`: 300 px à direita, fixo ao rolar; abaixo de 1180 px desce para baixo do conteúdo (Prompt E, 6.2). Recolhe para um botão com o ícone; a preferência vai ao `localStorage` com chave por usuário. `aria-expanded`, foco visível por teclado |
| **6.1 · contexto** | `projectId` e id da versão Atual validados no servidor | mais restrito ainda: as análises são calculadas **na própria página** (server component) sobre as unidades que ela acabou de ler pela versão Atual da obra escolhida. **Nenhum id vem do cliente**; o painel só recebe o resultado |
| **6.2 · o selo diz a verdade** | não pode dizer "Somente leitura" numa tela que grava | nesta PR o painel **não grava nada**, então o selo é **"Somente leitura"** e o rodapé diz que nada é alterado por ali. Quando o lançamento assistido entrar (J-5), o selo passa a "Confirma antes de gravar" — selo e função mudam juntos |
| **6.4 · Conferir planos de pagamento** | vendidas cuja soma das fontes não fecha com o valor | `conferirPlanos`: vendidas com diferença acima de R$ 0,01 (a mesma tolerância da lista), maior diferença primeiro, com link para a unidade |
| **6.4 · Revisar cadastro** | venda sem data, valor zerado, código repetido, vendida sem plano | `revisarCadastro`: os quatro achados, com código repetido **sem diferenciar caixa** (é assim que a pessoa lê) |
| **6.3 · lançamento assistido**, **6.4 · a partir do contrato** | — | **J-5.** Nada na interface promete o que ainda não existe |
| **6.4 · Receita reconhecida** | só existe depois da seção 54 do Prompt I | **fora**, até a §54 |

## Arquivos

- novo: `src/lib/unidade-analise.ts` (puro, + teste);
- novo: `src/components/app/assistente-unidades.tsx`;
- `src/app/(app)/unidades/page.tsx` (calcula a análise e monta as duas colunas).

## Verificação

- `unidade-analise.test.ts`: só vendidas e só fora da tolerância; os quatro
  achados; unidade com três achados; sem achado, listas vazias.
- Navegador: painel à direita com as duas ações e contadores; abrir "Revisar
  cadastro" mostra os achados com link; recolher e recarregar mantém
  recolhido; expandir volta.
- Suíte inteira, `typecheck`, `lint` e `next build`: ver PR.

# Prompt V · PR V-2 — Relatório CEF: o número diz o que é

Seção 3 inteira, mais o selo provisório dos KPIs do Dashboard (BV-1).
Sem migração. O cálculo orçado × medido é o mesmo de antes; o que muda é o
rótulo, os estados vazios, a escolha explícita do Orçamento e os avisos.

## O que entrou
1. **Módulo puro `medicao-cef.ts`**: `montarRelatorioCef` (linhas por grupo
   do plano, estados `ok | sem_orcado | sem_medicao | vazio`, total com
   excedente), `escolherOrcamento` (3.8), `recorteDeCompetencia` (3.9),
   `textoDaEscolha`, `LEGENDA_ESTADO`, `LIMITE_RETENCAO_PCT = 95`.
2. **3.2** coluna renomeada para **"% do orçado medido"**, com o título
   explicando que é razão financeira, não o percentual físico do laudo.
3. **3.3 / 3.10** grupo sem orçado, sem medição ou sem nada exibe **"—"** nas
   três colunas, com legenda no rodapé ("nunca quer dizer 0% executado");
   o Total também usa "—" quando não há orçado. Um único tratamento de ausência.
4. **3.4** linha acima de 100% ganha o selo "acima do orçado"; o Total **não
   é truncado**: mostra o percentual real, "▲" e um aviso com o excedente
   em R$.
5. **3.5 (opção 2)** a coluna **"% Ref. CEF" saiu** — os dez números eram do
   piloto, indexados por posição, não somavam 100 e o "100%" era escrito à mão.
   `PCT_REF_CEF` fica em `constants.ts` sem leitor; o rodapé explica por quê.
6. **3.6** aviso de **retenção final** quando o total medido ≥ 95% do orçado.
7. **3.7** obra sem versão de Orçamento: aviso explícito no topo; nada de
   zeros disfarçados.
8. **3.8** com mais de um Orçamento, seletor **`?orc=`** (só ids de Orçamento
   da obra); sem escolha, o padrão (`isDefault`), senão o mais recente — e o
   cabeçalho **declara** qual entrou e por quê.
9. **3.9** **acumulado por padrão**, dito no subtítulo; o recorte é opção
   rotulada "Recorte por competência (opcional)", por mês (MM/AAAA), e só
   vale com os **dois** limites válidos e ordenados; um campo só = acumulado.
   `DateRangeFilter` (dia) saiu desta tela.
10. **3.11** botão vira "Imprimir página" e o rodapé diz o que ele faz
    (impressão do navegador); a promessa do FRE formatado saiu (BV-4 aberto).
11. **BV-1 provisório**: no Dashboard, o selo "sem medição lançada" dos KPIs
    de evolução física vira **"medição por serviço não está em uso"**, com o
    motivo no título. Nada apagado; KPIs continuam até a decisão.

## Verificações
`medicao-cef.test.ts` (puro, 6 casos): 11.6 rótulo; 11.7 sem orçado = vazio;
11.8 total > 100% sinalizado (118% + excedente); 11.9 sem coluna de
referência (reordenar o plano não desalinha nada); 11.10 retenção em 95%;
3.8 escolha pedido > padrão > mais recente; 3.9 recorte só com dois limites.
Suíte: 169 arquivos / 1565. Navegador (local): cabeçalho "Budget / Orçamento
(único orçamento da obra)"; coluna nova presente, "% Físico" e "Ref. CEF"
ausentes; 10 linhas vazias com "—" e Total "—"; `?de=` sozinho mantém o
acumulado; `?de&ate` mostra o recorte e "Voltar ao acumulado"; com uma linha
de orçamento e duas medições temporárias: linha 1 "R$ 1.000 · R$ 960 ·
96,0%", linha 2 "— · R$ 40 · —", total 100,0% e aviso de retenção; Dashboard
com o selo novo. Linhas temporárias apagadas; `medicao` e `budget_line`
locais voltaram a 0. **Não regressão (seção 10)**: mesmos orçado e realizado
por grupo (mesma agregação; só rótulos, estados e avisos mudaram).

## Arquivos
`lib/medicao-cef.ts` (+test), `components/app/medicao-cef-controls.tsx`
(novo), `app/(app)/medicao/page.tsx` (reescrita), `components/app/indicadores-obra.tsx`.

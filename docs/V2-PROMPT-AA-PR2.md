# Prompt AA · AA-2 — a chave do Dashboard

Partes 4-B.1, 4-B.2, 4-B.3, 4.5, 4.2, 3.1 e 2.3.2, todas atrás da chave por
empresa **`dashboard_definicao_nova`**, que nasce **desligada** (10.2). Uma
chave para o conjunto, não uma por cartão.

**Desligada, os 28 cartões são os mesmos do AA-1.** O teste-oráculo do AA-1
continua passando, e o navegador mostra os mesmos números em 3 obras, com
período e na Empresa toda.

## O que a chave liga

- **4-B.1 · "Entradas de caixa" só da Atual.** O caixa gravado em outras
  versões (cópias) sai.
- **4-B.2 · "Executado" ÷ um Orçamento por obra:** o mais recente que não é
  cópia (`orcamentoDaObra`). O cartão diz qual: "um Orçamento por obra, o
  mais recente: "…"". Sem Orçamento próprio, nenhum. Nunca a soma de todos.
- **4-B.3 · a margem numa janela só,** a mesma para a receita da Atual e para
  os custos e despesas variáveis:
  - com filtro, as competências do período;
  - sem filtro, as da obra (início e fim do cadastro);
  - sem datas no cadastro, todas, e o cartão declara isso.
- **4.5 · VGV da Atual em toda coluna.** As unidades gravadas em Orçamento ou
  Previsão não entram. Obra sem Atual mostra "—".
- **4.2 · "A receber" do planejamento mostra o negativo,** quando o realizado
  passa do planejado. Antes, o `max(0, …)` escondia.
- **3.1 · sem medição,** "Liberação acumulada" e "Saldo de financiamento"
  mostram "—" ("sem medição registrada"). Antes mostravam o financiamento do
  cadastro como se já tivesse acontecido.
- **2.3.2 · os painéis de status seguem o período:**
  - o caixa pela data;
  - as despesas e o Orçamento pela competência.
  - A receita do cadastro não tem data e é sempre o total, e o painel diz
    isso.

Os textos de cada cartão mudam junto, para declarar a regra em vigor.

## A prévia (10.3)

`/chaves#previa-dashboard` mostra, por obra e cartão a cartão, sem filtro de
período, **hoje × definição nova × diferença**:
- entradas de caixa;
- o denominador e o % de executado;
- margem;
- liberação e saldo de financiamento;
- por versão de planejamento, VGV e "A receber".

Ela usa as mesmas funções da tela, com a chave desligada e ligada. Para
"Entradas de caixa" e "Executado", é o que o BAA-3 mede.

**Base local:**
- O VGV da Previsão da EMPREENDIMENTO PILOTO passa de [valor removido] (unidades gravadas na
  Previsão) para R$ 0 (a Atual não tem unidade).
- Liberação e saldo viram "—".
- O resto fica igual: não há cópia com caixa nem dois Orçamentos.

## Correção junto: o formato do período

O filtro grava as datas como **MM/DD/YYYY**. Três textos assumiam ISO:
- a frase do recorte do Dashboard (AA-1);
- o período do assistente do Fluxo (AD-3);
- a janela da margem (AA-2).

Os dois primeiros mostravam a data no formato americano, e agora usam
`dateBR`. A janela aceita os dois formatos. **Nenhum número era afetado.**

## Testes

- `dashboard-definicao.test.ts`:
  - um Orçamento, o mais recente e nunca a cópia;
  - a janela do período (MM/DD/YYYY e ISO);
  - o período aberto;
  - a janela do projeto e a obra sem datas.
- `dashboard-chave.test.ts`, com banco:
  - **desligada:** como antes;
  - **ligada:**
    - caixa só da Atual (850 → 550);
    - um Orçamento (4.500 → 3.500, "Orç novo");
    - margem na janela da obra;
    - período aplicado;
    - sem medição, sem o fallback do cadastro.
  - **A prévia:** confere hoje × nova e não grava nada.
- **Navegador:** ligada só no banco local durante o teste, e o registro foi
  apagado depois.
  - o VGV da Atual em toda coluna;
  - o texto do painel muda;
  - a prévia por obra.

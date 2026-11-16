# Prompt AA · AA-3 — o assistente do Dashboard

Parte 6. **Somente leitura.** Nenhum número da tela muda.

## O painel

Fica à direita da tela, com 300px. Tem o selo **"Somente leitura"** e dá para
recolher; a preferência fica salva por usuário no navegador. Abaixo de 1180px,
desce para baixo dos cartões.

1. **Montar outra análise** (6.3): é a primeira ação, mas aparece
   **desabilitada**, com o motivo escrito. Ela depende do catálogo de
   métricas (BAA-6) e da camada analítica do Prompt I, que não existem. O
   texto não fala em conversa (6.3.6).
2. **Explicar o indicador:** para cada cartão, a fonte, o cenário, o regime
   e a janela. O texto muda com a chave `dashboard_definicao_nova`.
3. **O que mudou desde a última visita:**
   - Compara os principais números da tela com os da visita anterior,
     **no mesmo recorte** (projetos, versões e período).
   - Os números da visita ficam só no navegador do usuário.
   - Não diz o porquê.
4. **Divergência entre cartões:** aponta a causa que **está no dado**:
   - caixa gravado em cópia;
   - mais de um Orçamento no denominador;
   - "Realizado acum." × "Entradas de caixa", que seguem recortes diferentes;
   - VGV só no planejamento;
   - receita do cadastro vazia.

   Sem causa no dado, não inventa.
5. **Obras que merecem atenção:**
   - Mostra as contas a pagar vencidas por obra, pelas mesmas regras de
     Contas a Pagar (`estaVencida` e `totalPendente`). Só para quem vê
     Contas a Pagar (6.3.7).
   - Diz por que não aponta medição recente: a medição por serviço não está
     em uso.
   - Diz por que não aponta caixa projetado negativo: o Dashboard não calcula
     esse número.

## As regras

- **Lê, não calcula.** `src/lib/dashboard-analise.ts` recebe o que a página
  já calculou: os resumos por versão, `getStatusProjeto` e
  `getIndicadoresObra`.
- **O escopo vem do servidor,** do que está selecionado.
- **O painel não importa action nem banco e não faz `fetch`.**

## Testes

- `dashboard-analise.test.ts`:
  - as divergências, que só aparecem com causa no dado e mudam com a chave;
  - as explicações;
  - o que mudou;
  - o painel sem escrita;
  - "Montar outra análise" é a primeira ação e não fala em conversa.
- Navegador, na EMPREENDIMENTO PILOTO e na Empresa toda: as ações, a desabilitada com o
  motivo, as contas vencidas e a segunda visita ("nada mudou").

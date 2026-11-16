# Prompt AC3 · DRE Analítica — relatório final

Fase 3, revisão V5. Executado em 18/10/2026. Depende do DP (a categoria da
DRE por conta).

## O que mudou

- **Tela nova, DRE Analítica**, em Business Intelligence, logo abaixo da DRE.
  É a DRE de um cenário aberta em categoria → grupo do plano de contas →
  conta, com a análise vertical (% da receita).
- **Os totais são os da DRE.** A leitura usa as mesmas fontes e as mesmas
  regras da DRE, inclusive a chave da definição nova. O teste com banco
  confere a cascata linha a linha, com e sem a chave.
- **Seletores iguais aos da DRE:** obra ou escopo, período (acumulado, ano ou
  personalizado) e o cenário (Atual, Previsão Atualizada ou Orçamento). Um
  cenário de cada vez; a comparação lado a lado continua na DRE.
- **Abre e fecha por clique.** A tela abre com as categorias mostrando os
  grupos. "Abrir até a conta" abre tudo, e "Recolher" fecha.
- A Receita abre no que a compõe. As Despesas Financeiras mostram os encargos
  de pagamento à parte. Despesa sem conta fica em "Sem conta do plano".
- No Orçamento e na Previsão, a linha é o grupo, então aparece como
  "Planejado no grupo".
- **A Cris sabe a tela:** recebe as categorias e os grupos com valor e %.
- **Menu:** só o item mais específico fica marcado. Antes, abrir
  `/dre/analitica` marcaria também a DRE.

## Premissas

- **BAC3-1** (drill-down até o lançamento?) segue sem resposta. A tela para
  na conta. Mostrar os lançamentos de uma conta é um passo a mais, sem mudar
  o resto.
- A categoria de cada despesa é a que a DRE usa: a gravada, ou a da conta com
  a chave do DP ligada.

## Acesso

A tela mora sob `/dre`, então a permissão é a da DRE. Nenhuma chave de
permissão nova e nada ampliado.

## Dados

Só leitura. Nada gravado.

## Testes

- `src/lib/dre-analitica.test.ts` (novo): totais iguais aos da cascata, os
  filhos somam o pai, sem conta e fora do plano, encargos, % sobre a receita,
  período e linha de planejamento por grupo.
- `src/lib/dre-analitica-db.test.ts` (novo, com banco): a cascata da
  analítica bate com a da DRE no acumulado e num mês, com e sem a definição
  nova; despesa cancelada fica fora.
- Menu: a DRE Analítica entra com a chave `dre`, e o teste de destaque passa
  a conferir o item mais específico.
- e2e: o item no menu, os grupos abertos, o Resultado Final igual ao da DRE,
  abrir até a conta e um só item marcado. O seed não traz despesa lançada na
  Atual; para o e2e, três despesas de teste foram inseridas no banco local.

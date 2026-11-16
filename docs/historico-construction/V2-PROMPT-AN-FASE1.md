# Prompt AN · Conferência de lançamentos e de planos — Fase 1, inventário

Prompt AN (32 de 42). **Só leitura nesta fase; nada foi alterado.** SQL em
[`sql/v2-prompt-an-diagnostico.sql`](./sql/v2-prompt-an-diagnostico.sql).
A coleta `docs/TELA-CONFERENCIA.md` citada pelo prompt não existe no
repositório. O inventário abaixo foi feito direto no código.

## Bloqueios

| | O que o código e o banco mostram | Decisão adotada |
|---|---|---|
| **BAN-1** | Base local: 75 despesas e **nenhuma** em qualquer das quatro condições. A quarta condição não traz nada aqui. Produção: rodar o 1º, 2º e 3º relatório do SQL. | Filtros e paginação entram **junto** com a quarta condição (AN-1), sem esperar o número. |
| **BAN-2** | Hoje há um seletor de destino só, e "Marcar todos". A validação impede categoria credora, não impede juntar fornecedores diferentes. | **Opção 3, híbrido** (recomendada): seletor por linha, e o lote só fica disponível quando a seleção é de um fornecedor só ou de uma conta CEF só. Pergunta registrada para o dono. |
| **BAN-3** | A materialização de `conta_receber` (Prompt K, K-5) **não existe**: está presa ao BK-0. Mas o expansor de recebíveis que todo o sistema usa (`expandUnitReceivables` → `serieVencimentos`) **já trata** a data impossível: o dia 31 vira 30 em abril e 28 ou 29 em fevereiro, sem contaminar o mês seguinte. | **Aviso no cadastro, com o dia que será usado** — a regra do próprio prompt para "com tratamento". Recusar travaria um plano que o sistema já sabe calcular. Pergunta registrada. |

## Conflito encontrado (registrado e decidido pelo caminho seguro)

**"Sem competência não entra na DRE" não é exato.** A DRE põe a despesa sem
competência num balde próprio (`NO_COMP` em `dre-inputs.ts`). Ela **entra no
Acumulado** e fica de fora das visões por ano, por período e mensal. O texto
do motivo vai dizer a consequência verdadeira:

> **"sem competência — fica fora da DRE por mês e por ano"**

Nada no cálculo da DRE muda.

Outros pontos sobre o mesmo assunto:
- A conferência lista despesas de **todas** as versões (Atual, Orçamento e
  Previsão). Para Orçamento e Previsão a DRE lê o lançamento simplificado
  (`budget_line`), não a tabela `despesa`. Isso continua como está.
- Despesa **cancelada** sem competência **não** vira pendência. Cancelada não
  entra na DRE, então a falta de competência não tem efeito. As três
  condições antigas continuam mostrando a cancelada como hoje (10.1).

## O que já está certo e não se toca (confirmado no código)

1. O texto da tela, em `diagnostico-categorias.tsx`.
2. `validarCategoriaDespesa` no servidor, antes de qualquer leitura.
3. O padrão "devedora" para categoria desconhecida, em `natureza-dre.ts`.
4. O preview em modal.
5. O log por item, com `de→para`, `numDoc` e `origem`.
6. Os dois `continue`: cancelada, e já na categoria de destino.
7. O teste da data impossível série a série, para Mensais (passo 1),
   Semestrais (6) e Anuais (12), com dia acima de 28.
8. O texto da tela de planos sobre carência.

## O que falta, parte a parte

- **Parte 1:** `getDespesasSuspeitas` testa três condições. Não olha
  `competencia`.
- **Parte 2:** um `UPDATE` e um `INSERT` de log por item, sem transação.
- **Parte 4:**
  - A consulta traz todas as despesas da empresa e faz a triagem em
    JavaScript.
  - A seleção usa o texto `"lançamento cancelado"` para desabilitar a caixa.
  - A lista de categorias credoras é privada em `natureza-dre.ts`, que não
    pode ser alterado (10.4). A consulta vai receber as credoras calculadas
    a partir de `CATEGORIAS_DRE` com `naturezaCategoriaDre`. É a mesma regra,
    sem copiar a lista. `categoria_dre` é um enum no banco, então os valores
    são exatamente os de `CATEGORIAS_DRE`.
- **Parte 5:**
  - As duas telas não estão em `SCREENS`, e `screenIdOfPath` usa o primeiro
    segmento da rota (`diagnostico`).
  - Para a tela ter id próprio `conferencia` com enforcement central, ela
    passa a morar em `/conferencia`. A rota antiga redireciona para lá.
  - A permissão `conferencia` **herda** a de `despesas`, inclusive o override
    de cada membro. Quem alcança hoje continua alcançando, e quem não
    alcança continua sem alcançar.
  - A herda só vale enquanto não houver override próprio de `conferencia`.
- **Parte 6:**
  - `getPlanosSuspeitos` e a página de planos só são usados ali.
  - `calc/carencia.ts` é usado por `parcelas.ts` e `receivables.ts`, e **não
    muda**. O diagnóstico só importava `intervaloMeses` de lá.
  - O cadastro do plano está em `unit-form.tsx`. É lá que entra o aviso.
- **6.6 e 6.7:** os relatórios 6 e 7 do SQL listam unidades com o código
  igual ao nome do projeto, e unidades vendidas sem entrada ou sem mensais.
  Na base local, nenhuma.
- **Prompt AC, rodapé da DRE (1.5):** ainda não existe. O número para
  comparar só existirá depois do Prompt AC.

## Plano de PRs

1. **AN-1 (Partes 1, 2 e 4):**
   - quarta condição;
   - triagem no SQL;
   - motivo com código e texto;
   - transação no lote, com retorno selecionadas, alteradas e puladas;
   - filtros por projeto, competência e fornecedor;
   - paginação por cursor, com total e soma do conjunto inteiro.
2. **AN-2 (Parte 3):** seletor por linha, lote só para seleção homogênea,
   aviso de fornecedores distintos, e preview com fornecedor e valor.
3. **AN-3 (Partes 5 e 6):**
   - id `conferencia` herdando `despesas`;
   - rota `/conferencia`;
   - a tela de planos sai, com redirecionamento e aviso;
   - aviso da data impossível no cadastro da unidade.
4. **AN-4 (Parte 7):** assistente somente leitura, e relatório final.

# Medição do Open Finance (Prompt AT §1.3) — Revisão 4

**Data:** 11/11/2026 · **Natureza:** somente leitura

## Para que serve

O worker antigo do Open Finance gravava cada transação **uma vez em cada versão
Atual da empresa** e deduplicava por descrição + data, **sem o valor**. Antes de
trocar o worker, a spec pede para medir se isso já deixou movimentos repetidos
no banco.

## Resposta do dono (BAT-0, 09/11/2026)

O Open Finance **não está ligado em nenhuma empresa**. Então não há duplicados
para medir. Esta medição só confirma isso.

## Como rodar na produção

```
psql "$DATABASE_URL" -f scripts/medicao-openfinance.sql > medicao-openfinance.txt
```

O script abre uma transação `READ ONLY` e termina em `ROLLBACK`: não grava nada.
Ele traz só contagens por empresa e conta. Não traz valor de movimento,
descrição de extrato nem dado de pessoa. Funciona antes e depois da migração
0072.

| Consulta | O que mede | Esperado |
| --- | --- | --- |
| (1) | movimentos com `cat = 'openfinance'` (o padrão do worker) | 0 |
| (2) | contas com `open_finance_id` e contas já sincronizadas (`last_sync`) | 0 e 0 |
| (3) | movimentos em contas ligadas, por empresa e conta, com quantas versões e quantos conciliados | nenhuma linha |
| (4) | o mesmo movimento (conta, data, valor, descrição) em mais de uma versão, e quantos estão conciliados | nenhuma linha |

**Por que a (2) é a que vale.** Quando a Pluggy manda categoria, o worker grava
essa categoria no lugar de `openfinance`. Então a (1) sozinha pode dar zero
mesmo com o Open Finance ligado. Já a conta sincronizada sempre tem
`open_finance_id`.

## Resultado

- **Banco local de teste** (todas as migrações até a 0072): as quatro consultas
  deram 0 ou nenhuma linha. Também testei a consulta (4) numa transação
  desfeita depois: com uma conta ligada e o mesmo movimento em duas versões
  Atual, ela achou 1 grupo.
- **Produção:** falta rodar. Esta sessão não tem acesso ao banco de produção.
  Pela resposta do BAT-0, o esperado é zero em tudo. Se vier qualquer número
  diferente de zero, **nada é apagado**: vale o BAT-1 (o dono decide depois de
  ver o relatório).

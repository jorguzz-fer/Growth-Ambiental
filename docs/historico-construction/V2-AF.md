# Prompt AF — Numeração de Despesas · relatório (Partes 1, 2 e 4)

Partes 3, 5 e 6 ficam para o Bloco 5, como o próprio prompt ordena. A Parte 4
entrou junto porque a decisão BAF-2 já foi tomada e ela é só remover um campo.

## §11 do prompt, item a item

**1–2. Consultas do BAF-1** (produção do cliente anterior — detalhe em
`V2-BLOCO0-BLOQUEIOS.md` §5.2): **nenhuma duplicata**. O "buraco" grande na
sequência é artefato de um `num_doc` digitado à mão (um número sem prefixo, fora
da faixa do contador), não perda real. Nenhum número
foi renumerado.

**3. BAF-2 — a flag "Numeração automática ativa":** opção 2, **sai da tela**. A
coluna `number_sequence.active` fica no schema, sem leitura; a action passou a
**preservar** o valor gravado em vez de sobrescrevê-lo com o do formulário.
Nenhuma migração toca a coluna.

**4. BAF-3 — escopo do contador:** confirmado **por empresa** (decisão 3.6).
Nada muda.

**5. A migração** — `0040_despesa_num_doc_unico.sql`, com `down/`:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "despesa_tenant_num_doc_uq"
  ON "despesa" ("tenant_id", "num_doc")
  WHERE "num_doc" IS NOT NULL AND "num_doc" <> '';
```

**Desvio consciente do §1.3.** O prompt diz que, havendo duplicata, a migração
*deve* falhar. Aqui as migrações rodam no boot do contêiner: falhar = **app fora
do ar**. O `CREATE` está dentro de um `DO $$` que **só cria o índice se não
houver duplicata**; havendo, emite `WARNING` e segue. A decisão continua humana
e item a item (nenhum dado é tocado), e a trava da Parte 2 impede duplicatas
novas enquanto isso. Testado num Postgres local:

| Cenário | Resultado |
|---|---|
| banco sem duplicata | índice criado |
| banco com duplicata | boot conclui, índice **não** criado, aviso no log |
| reaplicar a 0040 | idempotente |
| `down` + boot | índice removido e recriado |

**6–7. Partes 3 (transação única nos 12 caminhos) e comentários** — Bloco 5.

**8. A trava do "próximo número"** — `updateDespesaSequence`, no servidor, na
mesma action que grava:

- **número já emitido → sempre recusado.** *"O número PED-000010 já foi emitido
  — o lançamento seguinte repetiria um documento. Escolha um número ainda não
  usado (o maior emitido neste formato é PED-0NNNNN)."*
- **abaixo do maior emitido → só com `CONFIRMO` digitado.** *"O próximo número
  (PED-000500) fica abaixo do maior já emitido (PED-0NNNNN). K número(s) entre
  PED-000500 e PED-0NNNNN já estão em uso: quando o contador chegar neles, o
  lançamento será recusado. O mínimo sem esse risco é NNNNN+1. Para salvar mesmo
  assim, digite CONFIRMO."* O log grava `recuoConfirmado` e `emUsoAFrente`.
- **salvar sem mudar formato nem contador → passa**, como sempre (era o caso da
  Construtora Piloto, com o contador abaixo de um lote importado). E não gera linha de
  log vazia (AK Parte 2).

**Desvio consciente do §2.2 — a régua.** O prompt mede contra o "maior sufixo
emitido" de qualquer formato. Na Construtora Piloto isso era um número digitado sem prefixo, que
**não pode colidir** com `PED-000nnn`: a régua obrigaria a pular o contador para
depois dele. A trava mede só os números que o contador **pode reproduzir** — texto
exatamente igual a `prefixo-000n` —, que é a mesma igualdade do índice único.

A action agora **devolve** `{ ok, error }` em vez de lançar: mensagem de exceção
de Server Action não chega ao navegador em produção.

**9. Texto novo da tela, na íntegra:**

> O número é reservado de forma atômica no banco a cada nova despesa: dois
> lançamentos simultâneos nunca recebem o mesmo número, e o número de uma
> despesa excluída não é reutilizado. O que depende de quem configura é não
> recuar o "próximo número" para uma faixa já emitida — por isso a tela recusa
> um número já usado e pede confirmação para ficar abaixo do maior emitido. Se
> ainda assim o contador encontrar um número existente, o lançamento é recusado
> e nada é gravado.

A tela também mostra o **maior número já emitido no formato**, em vermelho
quando o próximo está abaixo dele. Na Construtora Piloto essa linha aparecia em vermelho
(contador abaixo de um lote importado) [dado de produção removido].

**1.4 — colisão legível.** `addDespesa` (lançamento e réplicas recorrentes)
traduz a violação do índice em *"O número PED-… já foi usado em outra despesa
desta empresa. Nada foi gravado. …"*. Os outros caminhos de reserva (acerto,
restituição, ponto, caixa) ficam protegidos pelo índice, com o erro do banco;
a mensagem neles entra com a Parte 3, que já mexe nos 12.

**10. `getDespesaSequence`** (§5.6, recebe `tenantId` sem checar permissão) —
Bloco 5, com a Parte 5. A tela nova **não** criou outra action desse tipo: o
maior emitido é calculado na página, no servidor.

**11. Reserva atômica** — `reserveDespesaNumber` **não foi tocada**. O teste de
25 reservas simultâneas passa com o índice ativo (Postgres local).

**12. Nenhum `num_doc` alterado.** A migração não lê nem escreve despesa além da
checagem de duplicata; a action não toca `despesa`.

**14. Limitações.**
- Erro lançado por `addDespesa` segue o padrão do arquivo (exceção); em produção
  o Next pode esconder o texto. Vale para todas as mensagens daquela action, não
  só esta — fica para o Prompt S.
- A Construtora Piloto vai encostar no lote importado quando o contador chegar ao
  início dele. Com o
  índice, o lançamento nesse ponto é recusado (não duplica). Antes disso, alguém
  com a tela de Numeração precisa pular o contador — o aviso vermelho já diz.

## Testes

- `src/lib/db/numbering-trava.test.ts` — régua de ocupação (retrato sintético da
  Construtora Piloto, outros formatos, prefixo com dígitos, igual ao maior), mensagem de colisão,
  e integração do índice (repetido barrado no mesmo tenant, permitido em outro,
  nulos e vazios convivem).
- Navegador, build de produção + Postgres local: recusa de número usado, de
  igual ao maior, pedido de confirmação, salvamento confirmado, salvamento acima
  do maior, flag fora da tela, log com `recuoConfirmado`.

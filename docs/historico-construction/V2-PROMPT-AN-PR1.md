# Prompt AN · AN-1 — quarta condição, triagem no SQL, transação, filtros e paginação

Partes 1, 2 e 4 do Prompt AN.

## Parte 1 — a quarta condição

- Despesa **não cancelada** com competência nula ou em branco entra na lista.
  O teste usa `btrim`, então só espaços conta como vazio.
- O texto do motivo diz a consequência verdadeira: **"sem competência — fica
  fora da DRE por mês e por ano"**. A DRE só a mostra no Acumulado. O
  conflito com o texto do prompt está na Fase 1.
- A tela **não** oferece corrigir a competência. O "Abrir" leva ao
  lançamento, como antes.
- A cancelada sem competência e sem outro motivo **não** entra. Cancelada
  não vai para a DRE, então a competência ausente não tem efeito.

## Parte 2 — o lote numa transação

- O laço inteiro, com os updates **e** os logs, roda numa transação só.
- Se qualquer item falhar, nada fica reclassificado nem registrado. A tela
  diz: "A reclassificação falhou e foi desfeita por inteiro: nenhum
  lançamento foi alterado."
- O retorno traz os três números: selecionadas, alteradas e puladas, com o
  motivo de cada pulada. Os motivos são cancelada, já na categoria e não
  encontrada.
- Os dois `continue` continuam: cancelada e já-na-categoria pulam sem
  update e sem log.

## Parte 4 — desempenho e escala

- **Triagem no SQL.** As quatro condições viram `where`. As categorias
  credoras chegam como parâmetro, calculadas pela regra de
  `natureza-dre.ts`. O arquivo não muda, e a lista não é copiada.
- **Filtros** por projeto, competência (MM/AAAA) e fornecedor, por URL.
- **Paginação por cursor**, com 100 por página e ordem do maior valor para
  o menor.
- O badge "N a conferir" e o total contam o **conjunto inteiro**. Com
  filtro, a tela mostra também o número e a soma do filtro.
- **Motivo com código e texto.** O código governa a seleção (cancelada fica
  fora). Renomear o texto não quebra nada.

## O que não mudou

O texto da tela, a validação do destino no servidor, o preview, o log por
item com `origem`, `natureza-dre.ts` e `carencia.ts`. Nenhuma migração.

## Testes

- `conferencia-regras.test.ts`, só lógica:
  - motivos e consequência;
  - competência com espaços;
  - item sem duplicar;
  - oráculo das três condições antigas, texto a texto;
  - seleção por código;
  - cursor;
  - mensagem dos três números.
- `actions/conferencia.test.ts`, com banco:
  - triagem no SQL;
  - total do conjunto e não da página;
  - cursor que percorre tudo sem repetir;
  - filtros;
  - **falha simulada no meio do lote sem nada gravado**;
  - três números;
  - log com de→para, `numDoc` e origem;
  - recusa de categoria credora;
  - sem permissão não sai nada.
- Navegador, com três lançamentos temporários depois apagados:
  - badge e total;
  - motivo novo;
  - filtro por fornecedor;
  - reclassificação com a mensagem nova.

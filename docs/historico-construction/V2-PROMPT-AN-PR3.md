# Prompt AN · AN-3 — id próprio, a Conferência de planos sai, aviso no cadastro

Partes 5 e 6 do Prompt AN.

## Parte 5 — id próprio em `SCREENS`

- **Nova tela `conferencia`**, "Conferência de lançamentos", no módulo
  Despesas.
- **A tela mudou para `/conferencia`.** O enforcement central identifica a
  tela pelo primeiro segmento da rota, e `/diagnostico/...` não servia. A URL
  antiga redireciona para a nova com 307, e os filtros na URL seguem junto.
- **A permissão acompanha a de Lançamentos de Despesas** (`HERDA_DE`).
  - A célula é cópia de `despesas`, depois do override do membro e antes dos
    clamps.
  - Override gravado na chave `conferencia` não vale e não é gravado.
  - Quem alcançava a tela por `despesas` continua alcançando, e quem não
    alcançava continua sem alcançar.
  - O contador continua só vendo.
- **Duas camadas (5.3).** A página checa `conferencia` e também `despesas`.
  As actions continuam checando `despesas`.
- **Na Gestão de Acessos** a linha aparece com "acompanha Lançamentos de
  Despesas", sem caixa editável. Ela muda junto quando a linha de Despesas
  muda.
- **Origem no log.** A `origem` dos logs de reclassificação continua
  `diagnostico/categorias-invertidas`. É o identificador que os registros já
  gravados usam.

## Parte 6 — a aba de planos sai, a verificação fica

- **Removidos:**
  - `/diagnostico/planos-recebiveis`;
  - o item de menu;
  - `getPlanosSuspeitos` e o tipo `PlanoSuspeito`;
  - a condição de carência, com o filtro de 1, 2, 3, 6 e 12 meses.
- **`calc/carencia.ts` não mudou.** Ele continua servindo a `parcelas.ts` e
  `receivables.ts`. O diagnóstico só importava `intervaloMeses`.
- **A URL antiga** vai para `/unidades` com o aviso: "A Conferência de planos
  saiu. O dia de vencimento que não existe em algum mês (o 31 em fevereiro)
  agora é avisado no plano de pagamento da unidade, ao preencher o 1º
  vencimento."
- **A data impossível virou aviso no cadastro** (`unit-form.tsx`), nos
  grupos Mensais, Semestrais e Anuais.
  - O aviso aparece ao preencher o 1º vencimento e as parcelas, antes de
    salvar.
  - O grupo ganha o selo "vencimento a conferir".
  - Exemplo de mensagem: "Dia 31 não existe em fevereiro/2027 — a 2ª mensal
    cai em 28/02/2027 (último dia do mês). Outras 4 parcela(s) desta série
    também caem no último dia do mês."
  - A regra é a de antes: só dia acima de 28, passo da série, e a **série
    inteira**.
  - É **aviso, não recusa** (BAN-3). O dia avisado é o mesmo que o expansor
    de recebíveis usa, e há teste que prova isso.
- **Nenhum plano existente foi alterado.** O aviso só aparece na tela, para
  o que é digitado. O relatório 6.4 do SQL lista os planos já gravados com
  dia acima de 28, para entregar ao cliente.

## Testes

- `plano-vencimento.test.ts`:
  - 31/01 avisa fevereiro;
  - 31/03 aponta abril e junho;
  - dia até 28 não avisa;
  - semestral, anual e 29/02;
  - o dia avisado é o mesmo do expansor.
- `telas-removidas.test.ts`:
  - a rota de planos saiu e redireciona com aviso;
  - `/conferencia` tem id e redirecionamento;
  - a página checa as duas permissões;
  - `conferencia` é igual a `despesas` para os cinco papéis, as duas
    posições da chave e cinco formatos de override;
  - a tela que acompanha outra não vira override.
- Os oráculos de `permissions-aj.test.ts` e `permissions-al.test.ts` passaram
  a tratar `conferencia` como era antes: alcançada por `despesas`. Continua
  valendo que nenhuma célula é ampliada.
- Navegador:
  - a URL antiga da Conferência abre `/conferencia` com o filtro;
  - a de planos abre Unidades com o aviso;
  - o menu não tem mais Conferência de planos;
  - a matriz mostra "acompanha";
  - o cadastro de unidade nova mostra o aviso e o selo para 31/01 em 12
    mensais, sem salvar nada.

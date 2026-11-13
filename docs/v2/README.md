# Pacote V2 — cópias de referência

Os artefatos que definem a fase V2 do app, guardados no repositório para não
dependerem de upload a cada sessão.

| Arquivo | O que é |
|---|---|
| [`PROMPTS.md`](./PROMPTS.md) | os **42 prompts de execução**, na íntegra, com índice e a lista de bloqueios. É a instrução de cada tarefa do V2 |
| [`mockup-growth.html`](./mockup-growth.html) | as **41 telas desenhadas**, navegáveis — abrir no navegador. Referência visual e de comportamento |

A ordem de execução e o quadro geral estão na Spec e no Roteiro
(`SPEC-GROWTH-CONSTRUCTION.md` e `ROTEIRO-EXECUCAO.md`), que **ainda não estão
nesta pasta**. O estado de cada bloco está em
[`../V2-BLOQUEIOS.md`](../V2-BLOQUEIOS.md) e
[`../V2-BLOCO0-BLOQUEIOS.md`](../V2-BLOCO0-BLOQUEIOS.md).

## ⚠ Estas cópias foram redigidas

O mockup foi montado com **dados de produção**. Antes de entrar no git — onde o
histórico é permanente —, os dados pessoais foram trocados por marcadores:

| Dado | Quantidade | Vira |
|---|---|---|
| Nomes completos de pessoas (compradores, trabalhadores, usuários) | 28 | `[PESSOA-n]` |
| CPF | 3 | `[CPF-n]` |
| CNPJ | 1 | `[CNPJ-n]` |
| E-mail | 7 | `pessoaN@exemplo.com.br` |

O mesmo dado recebe sempre o **mesmo marcador**, nos dois arquivos. Isso importa:
o `PROMPTS.md` usa o fato de um CPF aparecer em dois cadastros como diagnóstico,
e a leitura continua possível com `[CPF-3]` nos dois lugares.

Na auditoria de sanitização do Growth Ambiental (`docs/AUDITORIA_SANITIZACAO.md`)
saíram também os nomes de empresas, fornecedores, funcionários e titulares de
conta que tinham ficado nesta primeira redação: no `PROMPTS.md` e no mockup eles
viraram placeholders ("Cliente Piloto", "Construtora Piloto", "Fornecedor
Exemplo", "SOCIO A/B").

A redação usou três varreduras independentes (padrões de documento, nomes em
maiúsculas e nomes em título), com revisão manual de cada candidato. **Não
reintroduzir os originais aqui**: se precisar do mockup original, ele fica fora
do repositório.

Pela regra 3.6 da Spec, **nada destes arquivos entra no código** — valores,
nomes, CNPJ, alíquotas e datas são ilustração. Nunca viram seed, fixture, valor
padrão ou dado de teste.

# Prompt S · PR S-1 — trava de natureza em todos os caminhos; domínio do status

Seções 3-C e 3.2 do Prompt S. **Nenhuma despesa alterada; sem migração; a
regra vive só em `calc/natureza-dre.ts`** (nenhuma action escreve texto
próprio nem reimplementa a verificação).

## 3-C — os caminhos que gravam `categoria_dre` (3-C.3.1), depois desta PR

| Caminho | Antes | Agora |
|---|---|---|
| `addDespesa`, `updateDespesa`, `criarDespesaTerceiro`, `reclassificarDespesas` | já validavam | inalterados |
| Diferença do Acerto (`concluirAcerto`) | aceitava o que viesse em `categoriaDiferenca` | credora recusada com `ERRO_CATEGORIA_CREDORA`, antes de tocar o banco; vazia segue no default financeiro (RG-07) |
| Rateio entre obras (`ratearEntreObras`) | idem | idem |
| Despesa criada do extrato (`criarLancamentoDoExtrato`, saída) | **gravava sem categoria** — a tela nem oferecia o campo; a DRE descartava essas despesas em silêncio (3-C.2) | `validarCategoriaDespesa` (vazia e credora recusadas); a tela de importação de extrato ganhou o select de categoria (só devedoras, "Selecione…") para saídas. Entrada (conta a receber) não passa pela trava |
| Apuração do Ponto, importação por planilha | fixas em "Custo Variável" | inalteradas; a planilha **não traz categoria**, então a 3-C.3.2 não se aplica |

## 3-C.4 — na interface
- **4.3** a recusa (do cliente ou do servidor) aparece **no campo** Categoria DRE, com o caminho: "Se este lançamento é uma entrada, ele não é despesa: o caminho é Contas a Receber." Não vai mais ao erro genérico do topo.
- **4.4** despesa **legada** com categoria credora: o select mostra "Receita (inválida — troque para salvar)" (desabilitada, `aria-invalid`) e salvar sem trocar devolve a recusa no campo; abrir e fechar não altera nada.
- 4.1 / 4.2 já estavam feitos (Prompt I).

## 3.2 — domínio do status
`STATUS_DESPESA_EDITAVEL = ["A pagar", "Pago"]` em `despesa-regras.ts`;
`addDespesa` e `updateDespesa` recusam qualquer outro valor (`"Parcialmente
paga"` continua nascendo só do fluxo de pagamento). A leitura por IA só
preenche status da lista. **"Pago" continua aceito** — bloqueio menor
confirmado: a operação usa o status como atalho (conflito 2 da Fase 1);
fechar isso precisa do desenho que você escolher.

## Também nesta PR (achados do BS-1, de baixo risco)
- Aviso pós-criação ("anexo não subiu") passa a aparecer como aviso, não em vermelho.

## Testes
`natureza-trava.test.ts` (7, integração): 15h, 15i, 3.2 (criação e edição;
"Pago" aceito), 15l (acerto ×2, extrato: vazia e credora recusadas, devedora
grava, entrada não passa pela trava), 15o (contagem de "Receita" não muda).
`despesa-regras.test.ts` +1. Suíte (1230), `tsc`, `eslint`, `next build` verdes.
Navegador: despesa legada com "Receita" mostra a opção marcada como inválida e
a recusa no campo ao salvar; despesa nova sem categoria mostra a recusa no
campo. Contagem, hash e nº de "Receita" de `despesa` iguais antes e depois.

## O que não muda (3-C.5)
Nenhuma despesa existente; nenhum número de relatório — o legado do BS-4
continua somando na receita da DRE até a Conferência o resolver item a item
(`/diagnostico/categorias-invertidas`); `chart_account` e `CATEGORIAS_DRE`
intocados.

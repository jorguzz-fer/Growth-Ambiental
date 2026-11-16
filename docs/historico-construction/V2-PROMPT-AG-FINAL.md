# Prompt AG — relatório final: emissor de NFS-e

**Situação:** pronto no código. Para usar, falta só **configurar o servidor**
(variáveis e permissões) e **testar em homologação**. Nada disso apaga nem
altera dado existente.

## O que foi feito (6 PRs)

| PR | O quê |
|---|---|
| 1 | Tabelas `nota_servico` e `nota_servico_evento` (migração 0069, aditiva, com `down`). Regras puras e permissões novas. |
| 2 | Tela **Receitas → Notas Fiscais**: lista (produção e homologação separadas), rascunho e detalhe com histórico. |
| 3 | **Envio** à Focus com conferência antes, **Atualizar situação** e **Reenviar (mesma referência)**. |
| 4 | **Cancelamento** com motivo escrito e confirmação digitando o número da nota. |
| 5 | **Cópia do PDF e do XML** no armazenamento (R2) e download com a marca de homologação no nome. |
| 6 | **Painel do assistente** (somente leitura) e este relatório. |

Detalhes de cada parte: `V2-PROMPT-AG-PR1.md` … `V2-PROMPT-AG-PR5.md`.

## As decisões de 26/10/2026 e onde estão garantidas

| Decisão | Como ficou | Teste |
|---|---|---|
| **BAG-1** Serviço avulso, que pode apontar para a conta a receber já lançada | A conta é opcional, só da mesma obra, e serve só como referência | `notas-servico.test.ts` |
| **BAG-2** A nota não cria receita, conta a receber nem lançamento | Conta a receber, despesa e caixa contados antes e depois de criar, enviar, autorizar e cancelar | `notas-servico.test.ts`, `-envio`, `-cancelamento` |
| **BAG-3** Um CNPJ só | Só emite o tenant de `NFSE_TENANT_ID`. Os outros veem o aviso | `-envio` (bloqueios) |
| **BAG-4** Homologação marcada e fora de relatório | Aba própria, selo em toda linha, faixa na nota e marca no nome do arquivo. Nenhum relatório lê `nota_servico` | `nota-servico.test.ts` |
| **Privacidade** | O painel do assistente não chama modelo de IA nem rede. A auditoria não guarda dado do tomador nem o motivo do cancelamento | `nota-servico-analise.test.ts` |

## O assistente (seção 6)

Na lista de Notas Fiscais, à direita. É determinístico: lê as notas no
servidor e não manda nada para fora. São quatro botões:

- **Conferir antes de emitir**: o que falta em cada rascunho ou rejeitada. O
  cadastro da empresa aparece uma vez, à parte.
- **Rejeitadas, agrupadas**: pela mensagem da prefeitura (a mesma mensagem
  costuma ter a mesma causa).
- **Processando há muito tempo**: notas enviadas há mais de 30 minutos. A
  situação não se atualiza sozinha.
- **Explicar o cálculo**: base, ISS, retenções e líquido, com as mesmas regras
  do código.

Ele **nunca** emite, corrige ou sugere alíquota, item da LC 116, município
ou retenção.

## Para ligar em produção (passo a passo)

1. **Variáveis no Coolify** (o app reinicia sozinho):
   - `NFSE_TENANT_ID` = o id da Cliente Piloto (a tabela `tenant`).
   - `FOCUS_NFE_TOKEN_HOMOLOGACAO` = o token de homologação do painel da Focus.
   - Mais tarde, `FOCUS_NFE_TOKEN_PRODUCAO`.
   - O R2 já está configurado (é o mesmo dos documentos de despesas).
2. **Configurações → Empresa**: preencher o cadastro fiscal até o painel de
   lá não mostrar bloqueio. Deixar o ambiente em **Homologação**.
3. **Projetos**: em cada obra que fatura serviço, informar o **código IBGE do
   município da obra**. Na construção, o ISS é devido no município da obra.
   Sem ele, vale o da sede.
4. **Gestão de Acessos**: as permissões **Emitir nota fiscal** e **Cancelar
   nota fiscal** nascem só com proprietário e administrador. Conceda a quem
   mais for emitir.
5. **Testar em homologação**: montar uma nota, conferir, enviar, atualizar
   até autorizar, baixar o PDF (o nome deve começar com
   `HOMOLOGACAO-SEM-VALOR-FISCAL-`) e cancelar.
6. Só depois: trocar o ambiente da empresa para **Produção**.

## Limites conhecidos (de propósito)

- **A situação não se atualiza sozinha.** Não há webhook da Focus: a pessoa
  clica em "Atualizar situação" e o painel avisa as paradas há mais de 30
  minutos. O webhook pode entrar depois.
- **Um CNPJ só** (BAG-3). Para emitir por mais de uma empresa, a variável
  precisa virar cadastro.
- **Só serviço avulso** (BAG-1). Gerar a nota a partir da medição ou da
  parcela é um passo futuro.
- **O assistente não usa modelo de IA.** Se um dia usar, a regra é a de
  sempre: vai só o documento, nada do banco, e o prompt não entra em log.

## O que mudou fora das telas novas

- `fiscal/focus.ts`: devolve o código HTTP e baixa o arquivo da nota.
- `assistente-empresa.tsx`: o bloco visual dos botões (`Acao`) passou a ser
  exportado para reuso, sem mudança de comportamento.
- `permissions.ts`: novas telas `notasfiscais`, `notaemitir` e `notacancelar`.
  O contador vê Notas Fiscais.
- Menu: Receitas ganha **Notas Fiscais** como último item.

## Validação desta PR

- tsc limpo, eslint sem erros e build ok.
- vitest: 2109 testes passam. Falham 2 que já falhavam no main e não são do
  AG: `fatura-pagamento` e `planocontas-cris`.
- Navegador: o painel aparece na lista, com rejeitada agrupada e
  processando há 2 h. Sem rolagem lateral no celular.
